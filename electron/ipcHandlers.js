import { ipcMain, shell, app, BrowserWindow } from 'electron';
import fs from 'fs';
import path from 'path';
import { getDb } from './database.js';
import crypto from 'crypto';
import licenseManager from './licenseManager.js';
import axios from 'axios';
import { google } from 'googleapis';
import http from 'http';
import url from 'url';
import FormData from 'form-data';
const API_URL = 'https://admin-pod.onrender.com/api';

let oauthServer = null;

export function setupIpcHandlers() {
    async function getValidAccessToken() {
        const userDataPath = app.getPath('userData');
        const tokenPath = path.join(userDataPath, 'google-token.json');

        if (!fs.existsSync(tokenPath)) {
            throw new Error('No saved tokens found. Please connect to Google Drive first.');
        }

        const tokenData = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));

        // Check if token is expired or about to expire (within 5 minutes)
        const isExpired = Date.now() >= tokenData.expiry_date - 5 * 60 * 1000;

        if (isExpired && tokenData.refresh_token) {
            console.log('Access token expired, refreshing...');

            const CLIENT_ID = '1029274681556-ps3n13bvbjhogipcj7rsblfqu27041jq.apps.googleusercontent.com';
            const CLIENT_SECRET = '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';
            const REDIRECT_URI = 'https://admin-pod.onrender.com/';

            const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
            oauth2Client.setCredentials({
                refresh_token: tokenData.refresh_token
            });

            try {
                const { credentials } = await oauth2Client.refreshAccessToken();

                // Update stored tokens
                const newTokenData = {
                    ...tokenData,
                    access_token: credentials.access_token,
                    expiry_date: credentials.expiry_date,
                    refresh_token: credentials.refresh_token || tokenData.refresh_token
                };

                fs.writeFileSync(tokenPath, JSON.stringify(newTokenData));

                // Send new token to renderer
                const windows = BrowserWindow.getAllWindows();
                windows.forEach(win => {
                    if (!win.isDestroyed()) {
                        win.webContents.send('google-token', credentials.access_token);
                    }
                });

                console.log('Token refreshed successfully');
                return credentials.access_token;

            } catch (error) {
                console.error('Failed to refresh token:', error);
                throw new Error('Please reconnect to Google Drive');
            }
        }

        return tokenData.access_token;
    }

    // ========== DATA MANAGEMENT ==========
    ipcMain.handle('data:getLocation', () => {
        const userDataPath = app.getPath('userData');
        return {
            success: true,
            location: userDataPath,
            dbFile: path.join(userDataPath, 'pos.db')
        };
    });

    ipcMain.handle('data:backup', () => {
        try {
            const userDataPath = app.getPath('userData');
            const backupDir = path.join(app.getPath('documents'), 'POS Backups');

            if (!fs.existsSync(backupDir)) {
                fs.mkdirSync(backupDir, { recursive: true });
            }

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupFile = path.join(backupDir, `pos-backup-${timestamp}.db`);
            const dbFile = path.join(userDataPath, 'pos.db');

            if (fs.existsSync(dbFile)) {
                fs.copyFileSync(dbFile, backupFile);
                return { success: true, message: `Backup saved to: ${backupFile}` };
            }
            return { success: false, error: 'Database file not found' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('data:openFolder', () => {
        const userDataPath = app.getPath('userData');
        shell.openPath(userDataPath);
    });

    // ========== CATEGORIES ==========
    ipcMain.handle('db:getCategories', async () => {
        try {
            const db = getDb();
            const categories = db.prepare('SELECT * FROM categories WHERE is_active = 1 ORDER BY name').all();
            console.log('Categories fetched:', categories.length);
            return { success: true, data: categories };
        } catch (error) {
            console.error('Error in getCategories:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('db:createCategory', async (event, categoryData) => {
        try {
            const db = getDb();
            const id = crypto.randomUUID();

            const stmt = db.prepare(`
                INSERT INTO categories (id, name, description, parent_id, user_id, shop_id, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);

            stmt.run(
                id,
                categoryData.name,
                categoryData.description || null,
                categoryData.parentId || null,
                categoryData.user_id || 'system',
                categoryData.shop_id || 'default',
                categoryData.isActive !== false ? 1 : 0
            );

            const newCategory = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
            return { success: true, data: newCategory };
        } catch (error) {
            console.error('Error in createCategory:', error);
            return { success: false, error: error.message };
        }
    });
    ipcMain.handle('db:updateCategory', async (event, id, categoryData) => {
        try {
            const db = getDb();
            const updates = [];
            const params = [];

            if (categoryData.name !== undefined) {
                updates.push('name = ?');
                params.push(categoryData.name);
            }
            if (categoryData.description !== undefined) {
                updates.push('description = ?');
                params.push(categoryData.description);
            }
            if (categoryData.parentId !== undefined) {
                updates.push('parent_id = ?');
                params.push(categoryData.parentId === "none" ? null : categoryData.parentId);
            }
            if (categoryData.isActive !== undefined) {
                updates.push('is_active = ?');
                params.push(categoryData.isActive ? 1 : 0);
            }

            if (updates.length === 0) {
                return { success: false, error: 'No fields to update' };
            }

            updates.push('updated_at = CURRENT_TIMESTAMP');
            params.push(id);

            const query = `UPDATE categories SET ${updates.join(', ')} WHERE id = ?`;
            const result = db.prepare(query).run(...params);

            if (result.changes === 0) {
                return { success: false, error: 'Category not found' };
            }

            const updatedCategory = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
            console.log('Updated category:', updatedCategory);
            return { success: true, data: updatedCategory };
        } catch (error) {
            console.error('Error in updateCategory:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('db:deleteCategory', async (event, id) => {
        try {
            const db = getDb();

            // Recursive function to delete category and all descendants
            const deleteCategoryAndDescendants = (categoryId) => {
                // Get all child categories
                const children = db.prepare('SELECT id FROM categories WHERE parent_id = ?').all(categoryId);

                // Recursively delete all children first
                for (const child of children) {
                    deleteCategoryAndDescendants(child.id);
                }

                // Remove category reference from products
                db.prepare('UPDATE products SET category_id = NULL WHERE category_id = ?').run(categoryId);

                // Delete the category
                db.prepare('DELETE FROM categories WHERE id = ?').run(categoryId);
            };

            deleteCategoryAndDescendants(id);

            return { success: true };
        } catch (error) {
            console.error('Error in deleteCategory:', error);
            return { success: false, error: error.message };
        }
    });

    // ========== BRANDS ==========
    ipcMain.handle('db:getBrands', async () => {
        try {
            const db = getDb();
            const brands = db.prepare('SELECT * FROM brands WHERE is_active = 1 ORDER BY name').all();
            return { success: true, data: brands };
        } catch (error) {
            console.error('Error in getBrands:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('db:createBrand', async (event, brandData) => {
        try {
            const db = getDb();
            const id = crypto.randomUUID();

            const stmt = db.prepare(`
                INSERT INTO brands (id, name, description, user_id, shop_id, is_active)
                VALUES (?, ?, ?, ?, ?, ?)
            `);

            stmt.run(
                id,
                brandData.name,
                brandData.description || null,
                brandData.user_id || 'system',
                brandData.shop_id || 'default',
                brandData.isActive !== false ? 1 : 0
            );

            const newBrand = db.prepare('SELECT * FROM brands WHERE id = ?').get(id);
            return { success: true, data: newBrand };
        } catch (error) {
            console.error('Error in createBrand:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('db:updateBrand', async (event, id, brandData) => {
        try {
            const db = getDb();
            const updates = [];
            const params = [];

            if (brandData.name !== undefined) {
                updates.push('name = ?');
                params.push(brandData.name);
            }
            if (brandData.description !== undefined) {
                updates.push('description = ?');
                params.push(brandData.description);
            }
            if (brandData.isActive !== undefined) {
                updates.push('is_active = ?');
                params.push(brandData.isActive ? 1 : 0);
            }

            if (updates.length === 0) {
                return { success: false, error: 'No fields to update' };
            }

            updates.push('updated_at = CURRENT_TIMESTAMP');
            params.push(id);

            const query = `UPDATE brands SET ${updates.join(', ')} WHERE id = ?`;
            const result = db.prepare(query).run(...params);

            if (result.changes === 0) {
                return { success: false, error: 'Brand not found' };
            }

            const updatedBrand = db.prepare('SELECT * FROM brands WHERE id = ?').get(id);
            return { success: true, data: updatedBrand };
        } catch (error) {
            console.error('Error in updateBrand:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('db:deleteBrand', async (event, id) => {
        try {
            const db = getDb();
            const productCount = db.prepare('SELECT COUNT(*) as count FROM products WHERE brand_id = ?').get(id);
            if (productCount.count > 0) {
                return { success: false, error: `Cannot delete brand with ${productCount.count} products. Move or delete products first.` };
            }
            const result = db.prepare('UPDATE brands SET is_active = 0 WHERE id = ?').run(id);
            return { success: result.changes > 0 };
        } catch (error) {
            console.error('Error in deleteBrand:', error);
            return { success: false, error: error.message };
        }
    });

    // ========== SUPPLIERS ==========
    ipcMain.handle('db:getSuppliers', async () => {
        try {
            const db = getDb();
            const suppliers = db.prepare('SELECT * FROM suppliers WHERE is_active = 1 ORDER BY name').all();
            return { success: true, data: suppliers };
        } catch (error) {
            console.error('Error in getSuppliers:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('db:createSupplier', async (event, supplierData) => {
        try {
            const db = getDb();
            const id = crypto.randomUUID();

            const stmt = db.prepare(`
                INSERT INTO suppliers (id, name, selling, phone, email, address, city, vehicle_info, user_id, shop_id, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            stmt.run(
                id,
                supplierData.name,
                supplierData.selling || null,
                supplierData.phone || null,
                supplierData.email || null,
                supplierData.address || null,
                supplierData.city || null,
                supplierData.vehicleInfo || null,
                supplierData.user_id || 'system',
                supplierData.shop_id || 'default',
                supplierData.isActive !== false ? 1 : 0
            );

            const newSupplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id);
            return { success: true, data: newSupplier };
        } catch (error) {
            console.error('Error in createSupplier:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('db:updateSupplier', async (event, id, supplierData) => {
        try {
            const db = getDb();
            const updates = [];
            const params = [];

            if (supplierData.name !== undefined) {
                updates.push('name = ?');
                params.push(supplierData.name);
            }
            if (supplierData.selling !== undefined) {
                updates.push('selling = ?');
                params.push(supplierData.selling);
            }
            if (supplierData.phone !== undefined) {
                updates.push('phone = ?');
                params.push(supplierData.phone);
            }
            if (supplierData.email !== undefined) {
                updates.push('email = ?');
                params.push(supplierData.email);
            }
            if (supplierData.address !== undefined) {
                updates.push('address = ?');
                params.push(supplierData.address);
            }
            if (supplierData.city !== undefined) {
                updates.push('city = ?');
                params.push(supplierData.city);
            }
            if (supplierData.vehicleInfo !== undefined) {
                updates.push('vehicle_info = ?');
                params.push(supplierData.vehicleInfo);
            }
            if (supplierData.isActive !== undefined) {
                updates.push('is_active = ?');
                params.push(supplierData.isActive ? 1 : 0);
            }

            if (updates.length === 0) {
                return { success: false, error: 'No fields to update' };
            }

            updates.push('updated_at = CURRENT_TIMESTAMP');
            params.push(id);

            const query = `UPDATE suppliers SET ${updates.join(', ')} WHERE id = ?`;
            const result = db.prepare(query).run(...params);
            return { success: result.changes > 0 };
        } catch (error) {
            console.error('Error in updateSupplier:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('db:deleteSupplier', async (event, id) => {
        try {
            const db = getDb();
            const result = db.prepare('UPDATE suppliers SET is_active = 0 WHERE id = ?').run(id);
            return { success: result.changes > 0 };
        } catch (error) {
            console.error('Error in deleteSupplier:', error);
            return { success: false, error: error.message };
        }
    });

    // ========== PRODUCTS ==========
    ipcMain.handle('db:getProducts', async (event, filters = {}) => {
        try {
            const db = getDb();
            let query = 'SELECT * FROM products WHERE 1=1';
            const params = [];

            console.log('=== GET PRODUCTS DEBUG ===');
            console.log('Received filters:', JSON.stringify(filters, null, 2));

            // Search filter
            if (filters.search && filters.search.trim() !== '') {
                query += ' AND (name LIKE ? OR sku LIKE ? OR barcode LIKE ?)';
                const searchTerm = `%${filters.search}%`;
                params.push(searchTerm, searchTerm, searchTerm);
            }

            // Category filter
            if (filters.categoryId && filters.categoryId !== '') {
                query += ' AND category_id = ?';
                params.push(filters.categoryId);
            }

            // Brand filter
            if (filters.brandId && filters.brandId !== '') {
                query += ' AND brand_id = ?';
                params.push(filters.brandId);
            }

            // Supplier filter
            if (filters.supplierId && filters.supplierId !== '') {
                query += ' AND supplier_id = ?';
                params.push(filters.supplierId);
            }

            // Product type filter
            if (filters.productType && filters.productType !== '') {
                query += ' AND product_type = ?';
                params.push(filters.productType);
            }

            // Stock status filters
            if (filters.inStock) {
                query += ' AND stock > 0';
            }
            if (filters.outOfStock) {
                query += ' AND stock = 0';
            }
            if (filters.lowStock) {
                query += ' AND stock > 0 AND stock <= min_stock';
            }

            // Price range filters
            if (filters.minPrice && filters.minPrice !== '') {
                query += ' AND selling_price >= ?';
                params.push(parseFloat(filters.minPrice));
            }
            if (filters.maxPrice && filters.maxPrice !== '') {
                query += ' AND selling_price <= ?';
                params.push(parseFloat(filters.maxPrice));
            }

            // Stock range filters
            if (filters.minStock && filters.minStock !== '') {
                query += ' AND stock >= ?';
                params.push(parseInt(filters.minStock));
            }
            if (filters.maxStock && filters.maxStock !== '') {
                query += ' AND stock <= ?';
                params.push(parseInt(filters.maxStock));
            }

            // Active status filter
            if (filters.isActive !== undefined) {
                query += ' AND is_active = ?';
                params.push(filters.isActive ? 1 : 0);
            }

            // Sorting - use snake_case column names
            let sortField = 'created_at';  // Default to created_at
            switch (filters.sortBy) {
                case 'name':
                    sortField = 'name';
                    break;
                case 'selling_price':
                    sortField = 'selling_price';
                    break;
                case 'stock':
                    sortField = 'stock';
                    break;
                case 'created_at':
                    sortField = 'created_at';
                    break;
                case 'updated_at':
                    sortField = 'updated_at';
                    break;
                default:
                    sortField = 'created_at';
            }

            const sortOrder = filters.sortOrder === 'asc' ? 'ASC' : 'DESC';
            query += ` ORDER BY ${sortField} ${sortOrder}`;

            console.log('Final SQL:', query);
            console.log('Query Params:', params);

            const products = db.prepare(query).all(...params);
            console.log(`Found ${products.length} products`);

            return { success: true, data: products };
        } catch (error) {
            console.error('Error in getProducts:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('db:getProductById', async (event, id) => {
        try {
            const db = getDb();
            const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
            return { success: true, data: product };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('db:getProductBySku', async (event, sku) => {
        try {
            const db = getDb();
            const product = db.prepare('SELECT * FROM products WHERE sku = ?').get(sku);
            return { success: true, data: product };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('db:getProductByBarcode', async (event, barcode) => {
        try {
            const db = getDb();
            const product = db.prepare('SELECT * FROM products WHERE barcode = ?').get(barcode);
            return { success: true, data: product };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('db:createProduct', async (event, productData) => {
        try {
            const db = getDb();
            const id = crypto.randomUUID();

            const stmt = db.prepare(`
            INSERT INTO products (
                id, name, sku, barcode, description, category_id, brand_id, supplier_id,
                user_id, shop_id, cost_price, selling_price, tax_rate, discount,
                stock, min_stock, unit_of_measure, weight, colors, sizes, material,
                tags, product_type, warranty, expiry_date, manufacturer, country_of_origin,
                is_active, image_url, image_public_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

            stmt.run(
                id,
                productData.name,
                productData.sku,
                productData.barcode || null,
                productData.description || null,
                productData.categoryId || null,
                productData.brandId || null,
                productData.supplierId || null,
                productData.userId || 'system',  // ✅ Default if not provided
                productData.shopId || 'default',  // ✅ Default if not provided
                productData.costPrice,
                productData.sellingPrice,
                productData.taxRate || 0,
                productData.discount || 0,
                productData.stock || 0,
                productData.minStock || 0,
                productData.unitOfMeasure || 'piece',
                productData.weight || 0,
                productData.colors || '',
                productData.sizes || '',
                productData.material || '',
                productData.tags || '',
                productData.productType || 'physical',
                productData.warranty || 0,
                productData.expiryDate || null,
                productData.manufacturer || '',
                productData.countryOfOrigin || '',
                productData.isActive !== false ? 1 : 0,
                productData.imageUrl || null,
                productData.imagePublicId || null
            );

            const newProduct = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
            return { success: true, data: newProduct };
        } catch (error) {
            console.error('Error in createProduct:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('db:updateProduct', async (event, id, productData) => {
        try {
            console.log('=== UPDATE PRODUCT DEBUG ===');
            console.log('Product ID:', id);
            console.log('Received productData:', JSON.stringify(productData, null, 2));

            const db = getDb();
            const updates = [];
            const params = [];

            // Map frontend field names to database column names
            const fieldMap = {
                name: 'name',
                sku: 'sku',
                barcode: 'barcode',
                description: 'description',
                categoryId: 'category_id',
                brandId: 'brand_id',
                supplierId: 'supplier_id',
                costPrice: 'cost_price',
                sellingPrice: 'selling_price',
                taxRate: 'tax_rate',
                discount: 'discount',
                stock: 'stock',
                minStock: 'min_stock',
                unitOfMeasure: 'unit_of_measure',
                weight: 'weight',
                colors: 'colors',
                sizes: 'sizes',
                material: 'material',
                tags: 'tags',
                productType: 'product_type',
                warranty: 'warranty',
                expiryDate: 'expiry_date',
                manufacturer: 'manufacturer',
                countryOfOrigin: 'country_of_origin',
                isActive: 'is_active',
                imageUrl: 'image_url',
                imagePublicId: 'image_public_id'
            };

            for (const [key, dbField] of Object.entries(fieldMap)) {
                if (productData[key] !== undefined) {
                    updates.push(`${dbField} = ?`);
                    let value = productData[key];

                    console.log(`Processing field: ${key} -> ${dbField}, original value:`, value);

                    // Handle special cases
                    if (key === 'expiryDate' && value === '') value = null;
                    if (key === 'isActive') value = value ? 1 : 0;

                    // Convert empty strings to NULL for foreign key fields
                    if (['categoryId', 'brandId', 'supplierId'].includes(key)) {
                        value = (value === '' || value === null || value === undefined) ? null : value;
                    }

                    if (['costPrice', 'sellingPrice', 'taxRate', 'discount', 'weight'].includes(key)) {
                        value = parseFloat(value) || 0;
                    }
                    if (['stock', 'minStock', 'warranty'].includes(key)) {
                        value = parseInt(value) || 0;
                    }

                    console.log(`Processed value for ${key}:`, value);
                    params.push(value);
                }
            }

            if (updates.length === 0) {
                console.log('No fields to update');
                return { success: false, error: 'No fields to update' };
            }

            updates.push('updated_at = CURRENT_TIMESTAMP');
            params.push(id);

            const query = `UPDATE products SET ${updates.join(', ')} WHERE id = ?`;
            console.log('Update Query:', query);
            console.log('Query Params:', params);

            const result = db.prepare(query).run(...params);
            console.log('SQLite Run Result:', result);

            if (result.changes === 0) {
                console.log('Product not found with id:', id);
                return { success: false, error: 'Product not found' };
            }

            const updatedProduct = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
            console.log('Updated product:', updatedProduct);
            console.log('=== UPDATE PRODUCT SUCCESS ===');

            return { success: true, data: updatedProduct };
        } catch (error) {
            console.error('Error in updateProduct:', error);
            return { success: false, error: error.message };
        }
    });

    // Disable product (soft delete)
    ipcMain.handle('db:deleteProduct', async (event, id) => {
        try {
            const db = getDb();
            const result = db.prepare(`
            UPDATE products 
            SET is_active = 0, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        `).run(id);
            return { success: result.changes > 0 };
        } catch (error) {
            console.error('Error in disableProduct:', error);
            return { success: false, error: error.message };
        }
    });

    // Restore product (enable)
    ipcMain.handle('db:restoreProduct', async (event, id) => {
        try {
            const db = getDb();
            const result = db.prepare(`
            UPDATE products 
            SET is_active = 1, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        `).run(id);
            return { success: result.changes > 0 };
        } catch (error) {
            console.error('Error in restoreProduct:', error);
            return { success: false, error: error.message };
        }
    });

    // Create damaged stock record
    ipcMain.handle('db:createDamagedStock', async (event, damageData) => {
        try {
            const db = getDb();
            const id = crypto.randomUUID();

            const stmt = db.prepare(`
            INSERT INTO damaged_stock (
                id, product_id, product_name, sku, original_sale_id, return_id,
                quantity, original_cost_price, selling_price, total_loss,
                damage_reason, notes, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

            stmt.run(
                id,
                damageData.product_id,
                damageData.product_name,
                damageData.sku,
                damageData.original_sale_id || null,
                damageData.return_id || null,
                damageData.quantity,
                damageData.original_cost_price,
                damageData.selling_price,
                damageData.quantity * damageData.original_cost_price, // total_loss
                damageData.damage_reason || null,
                damageData.notes || null,
                'pending'
            );

            const newDamage = db.prepare('SELECT * FROM damaged_stock WHERE id = ?').get(id);
            return { success: true, data: newDamage };
        } catch (error) {
            console.error('Error in createDamagedStock:', error);
            return { success: false, error: error.message };
        }
    });

    // Get damaged stock with filters
    ipcMain.handle('db:getDamagedStock', async (event, filters = {}) => {
        try {
            const db = getDb();
            let query = 'SELECT * FROM damaged_stock WHERE 1=1';
            const params = [];

            if (filters.search) {
                query += ' AND (product_name LIKE ? OR sku LIKE ?)';
                params.push(`%${filters.search}%`, `%${filters.search}%`);
            }

            if (filters.status && filters.status !== 'all') {
                query += ' AND status = ?';
                params.push(filters.status);
            }

            if (filters.dateFrom) {
                query += ' AND created_at >= ?';
                params.push(filters.dateFrom);
            }

            if (filters.dateTo) {
                query += ' AND created_at <= ?';
                params.push(filters.dateTo);
            }

            query += ' ORDER BY created_at DESC';

            const damages = db.prepare(query).all(...params);
            return { success: true, data: damages };
        } catch (error) {
            console.error('Error in getDamagedStock:', error);
            return { success: false, error: error.message };
        }
    });


    // Update damaged stock status (fulfill or recycle)
    ipcMain.handle('db:updateDamagedStock', async (event, id, updateData) => {
        try {
            const db = getDb();
            const updates = [];
            const params = [];

            if (updateData.status !== undefined) {
                updates.push('status = ?');
                params.push(updateData.status);
            }

            if (updateData.recovery_notes !== undefined) {
                updates.push('recovery_notes = ?');
                params.push(updateData.recovery_notes);
            }

            if (updateData.status === 'fulfilled') {
                updates.push('recovery_date = CURRENT_TIMESTAMP');
            }

            if (updates.length === 0) {
                return { success: false, error: 'No fields to update' };
            }

            updates.push('updated_at = CURRENT_TIMESTAMP');
            params.push(id);

            const query = `UPDATE damaged_stock SET ${updates.join(', ')} WHERE id = ?`;
            const result = db.prepare(query).run(...params);

            // If status is 'fulfilled', also add stock back to products
            if (updateData.status === 'fulfilled' && result.changes > 0) {
                const damage = db.prepare('SELECT * FROM damaged_stock WHERE id = ?').get(id);
                if (damage) {
                    db.prepare(`
                    UPDATE products 
                    SET stock = stock + ?, updated_at = CURRENT_TIMESTAMP 
                    WHERE id = ?
                `).run(damage.quantity, damage.product_id);
                }
            }

            return { success: result.changes > 0 };
        } catch (error) {
            console.error('Error in updateDamagedStock:', error);
            return { success: false, error: error.message };
        }
    });

    // Get damage statistics
    ipcMain.handle('db:getDamageStats', async () => {
        try {
            const db = getDb();

            const totalLoss = db.prepare(`
            SELECT COALESCE(SUM(total_loss), 0) as total FROM damaged_stock
        `).get();

            const pendingLoss = db.prepare(`
            SELECT COALESCE(SUM(total_loss), 0) as total FROM damaged_stock WHERE status = 'pending'
        `).get();

            const pendingCount = db.prepare(`
            SELECT COUNT(*) as count FROM damaged_stock WHERE status = 'pending'
        `).get();

            const fulfilledCount = db.prepare(`
            SELECT COUNT(*) as count FROM damaged_stock WHERE status = 'fulfilled'
        `).get();

            const recycledCount = db.prepare(`
            SELECT COUNT(*) as count FROM damaged_stock WHERE status = 'recycled'
        `).get();

            return {
                success: true,
                data: {
                    totalLoss: totalLoss.total,
                    pendingLoss: pendingLoss.total,
                    pendingCount: pendingCount.count,
                    fulfilledCount: fulfilledCount.count,
                    recycledCount: recycledCount.count
                }
            };
        } catch (error) {
            console.error('Error in getDamageStats:', error);
            return { success: false, error: error.message };
        }
    });
    // ========== PRODUCT IMAGES ==========
    ipcMain.handle('db:getProductImages', async (event, productId) => {
        try {
            const db = getDb();
            const images = db.prepare('SELECT * FROM product_images WHERE product_id = ? ORDER BY sort_order').all(productId);
            return { success: true, data: images };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('db:createProductImage', async (event, imageData) => {
        try {
            const db = getDb();
            const id = crypto.randomUUID();
            const stmt = db.prepare(`
                INSERT INTO product_images (id, product_id, image_url, image_public_id, is_primary, sort_order)
                VALUES (?, ?, ?, ?, ?, ?)
            `);
            stmt.run(id, imageData.productId, imageData.imageUrl, imageData.imagePublicId, imageData.isPrimary ? 1 : 0, imageData.sortOrder || 0);
            const newImage = db.prepare('SELECT * FROM product_images WHERE id = ?').get(id);
            return { success: true, data: newImage };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('db:deleteProductImage', async (event, id) => {
        try {
            const db = getDb();
            const result = db.prepare('DELETE FROM product_images WHERE id = ?').run(id);
            return { success: result.changes > 0 };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    // ========== PRODUCT VARIANTS ==========
    ipcMain.handle('db:getProductVariants', async (event, productId) => {
        try {
            const db = getDb();
            const variants = db.prepare('SELECT * FROM product_variants WHERE product_id = ? AND is_active = 1').all(productId);
            return { success: true, data: variants };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('db:createProductVariant', async (event, variantData) => {
        try {
            const db = getDb();
            const id = crypto.randomUUID();
            const stmt = db.prepare(`
                INSERT INTO product_variants (id, product_id, sku, barcode, attributes, cost_price, selling_price, stock, image_url, image_public_id, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            stmt.run(id, variantData.productId, variantData.sku, variantData.barcode, JSON.stringify(variantData.attributes || {}), variantData.costPrice, variantData.sellingPrice, variantData.stock || 0, variantData.imageUrl, variantData.imagePublicId, variantData.isActive !== false ? 1 : 0);
            const newVariant = db.prepare('SELECT * FROM product_variants WHERE id = ?').get(id);
            return { success: true, data: newVariant };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('db:updateProductVariant', async (event, id, variantData) => {
        try {
            const db = getDb();
            const updates = [];
            const params = [];
            if (variantData.sku !== undefined) { updates.push('sku = ?'); params.push(variantData.sku); }
            if (variantData.barcode !== undefined) { updates.push('barcode = ?'); params.push(variantData.barcode); }
            if (variantData.attributes !== undefined) { updates.push('attributes = ?'); params.push(JSON.stringify(variantData.attributes)); }
            if (variantData.costPrice !== undefined) { updates.push('cost_price = ?'); params.push(variantData.costPrice); }
            if (variantData.sellingPrice !== undefined) { updates.push('selling_price = ?'); params.push(variantData.sellingPrice); }
            if (variantData.stock !== undefined) { updates.push('stock = ?'); params.push(variantData.stock); }
            if (variantData.imageUrl !== undefined) { updates.push('image_url = ?'); params.push(variantData.imageUrl); }
            if (variantData.imagePublicId !== undefined) { updates.push('image_public_id = ?'); params.push(variantData.imagePublicId); }
            if (variantData.isActive !== undefined) { updates.push('is_active = ?'); params.push(variantData.isActive ? 1 : 0); }
            if (updates.length === 0) return { success: false, error: 'No fields to update' };
            updates.push('updated_at = CURRENT_TIMESTAMP');
            params.push(id);
            const result = db.prepare(`UPDATE product_variants SET ${updates.join(', ')} WHERE id = ?`).run(...params);
            return { success: result.changes > 0 };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    // ========== SALES ==========
    ipcMain.handle('db:getSales', async (event, filters = {}) => {
        try {
            const db = getDb();
            let query = 'SELECT * FROM sales WHERE 1=1';
            const params = [];
            if (filters.startDate) { query += ' AND created_at >= ?'; params.push(filters.startDate); }
            if (filters.endDate) { query += ' AND created_at <= ?'; params.push(filters.endDate); }
            if (filters.paymentMethod) { query += ' AND payment_method = ?'; params.push(filters.paymentMethod); }
            query += ' ORDER BY created_at DESC';
            const sales = db.prepare(query).all(...params);
            return { success: true, data: sales };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('db:getSaleById', async (event, id) => {
        try {
            const db = getDb();

            // First try to get from sales table
            let record = db.prepare('SELECT * FROM sales WHERE id = ?').get(id);
            let type = 'sale';

            // If not found, try returns table
            if (!record) {
                record = db.prepare('SELECT * FROM returns WHERE id = ?').get(id);
                type = 'return';
            }

            if (!record) {
                return { success: false, error: 'Record not found' };
            }

            console.log(`${type} found:`, record);

            // Get items based on type
            let items = [];
            if (type === 'sale') {
                items = db.prepare(`
                SELECT 
                    si.id,
                    si.product_id,
                    si.quantity,
                    si.unit_price,
                    si.total,
                    p.name as product_name,
                    p.image_url,
                    p.barcode,
                    c.name as category_name
                FROM sale_items si
                LEFT JOIN products p ON si.product_id = p.id
                LEFT JOIN categories c ON p.category_id = c.id
                WHERE si.sale_id = ?
            `).all(id);
            } else {
                items = db.prepare(`
                SELECT 
                    ri.id,
                    ri.product_id,
                    ri.quantity,
                    ri.unit_price,
                    ri.total,
                    p.name as product_name,
                    p.image_url,
                    p.barcode,
                    c.name as category_name
                FROM return_items ri
                LEFT JOIN products p ON ri.product_id = p.id
                LEFT JOIN categories c ON p.category_id = c.id
                WHERE ri.return_id = ?
            `).all(id);
            }

            console.log('Items count:', items.length);

            // Format items
            const formattedItems = items.map(item => ({
                id: item.id,
                productId: item.product_id,
                quantity: item.quantity,
                unitPrice: item.unit_price,
                total: item.total,
                product: item.product_id ? {
                    id: item.product_id,
                    name: item.product_name || 'Unknown Product',
                    imageUrl: item.image_url,
                    barcode: item.barcode,
                    categoryName: item.category_name
                } : null
            }));

            const result = {
                success: true,
                data: {
                    ...record,
                    items: formattedItems
                }
            };

            return result;
        } catch (error) {
            console.error('Error in getSaleById:', error);
            return { success: false, error: error.message };
        }
    });

    // In ipcHandlers.js, add this handler if missing:
    ipcMain.handle('db:getSaleByReceiptNumber', async (event, receiptNumber) => {
        try {
            const db = getDb();
            const sale = db.prepare('SELECT * FROM sales WHERE receipt_number = ?').get(receiptNumber);

            if (!sale) {
                return null;
            }

            // Parse returned_items if it exists
            if (sale.returned_items && typeof sale.returned_items === 'string') {
                sale.returned_items = JSON.parse(sale.returned_items);
            } else if (!sale.returned_items) {
                sale.returned_items = [];
            }

            // Get sale items with profit included
            const items = db.prepare(`
            SELECT si.*, 
                   p.name as product_name, 
                   p.image_url, 
                   p.barcode,
                   p.stock,
                   p.cost_price
            FROM sale_items si
            LEFT JOIN products p ON si.product_id = p.id
            WHERE si.sale_id = ?
        `).all(sale.id);

            sale.items = items;

            return sale;
        } catch (error) {
            console.error('Error in getSaleByReceiptNumber:', error);
            throw error;
        }
    });

    ipcMain.handle('db:getSaleItems', async (event, saleId) => {
        try {
            const db = getDb();
            const items = db.prepare('SELECT si.*, p.name, p.sku FROM sale_items si JOIN products p ON si.product_id = p.id WHERE si.sale_id = ?').all(saleId);
            return { success: true, data: items };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('db:createSale', async (event, saleData, items) => {
        const db = getDb();
        const id = crypto.randomUUID();
        const receiptNumber = saleData.receiptNumber || `INV-${Date.now()}`;

        try {
            db.exec('BEGIN TRANSACTION');

            // Ensure total_profit column exists
            try {
                db.exec(`ALTER TABLE sales ADD COLUMN total_profit DECIMAL(10,2) DEFAULT 0`);
            } catch (error) { }

            // Insert sale with profit
            const saleStmt = db.prepare(`
            INSERT INTO sales (
                id, receipt_number, customer_name, customer_phone, subtotal, tax, discount, 
                total, total_profit, payment_method, account_number, payment_status, 
                employee_id, user_id, shop_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

            saleStmt.run(
                id, receiptNumber, saleData.customerName, saleData.customerPhone,
                saleData.subtotal, saleData.tax || 0, saleData.discount || 0,
                saleData.total, saleData.total_profit || 0, saleData.paymentMethod || 'cash',
                saleData.accountNumber, saleData.paymentStatus || 'completed',
                saleData.employeeId, saleData.userId, saleData.shopId
            );

            // Insert sale items with profit
            const itemStmt = db.prepare(`
            INSERT INTO sale_items (id, sale_id, product_id, quantity, unit_price, total, profit) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

            const updateStock = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?');

            for (const item of items) {
                const itemId = crypto.randomUUID();
                const profitPerItem = parseFloat(item.profit) / item.quantity;

                // Store each item's profit (total profit for this line item)
                itemStmt.run(
                    itemId, id, item.productId, item.quantity,
                    item.unitPrice, item.total, item.profit || 0
                );
                updateStock.run(item.quantity, item.productId);
            }

            db.exec('COMMIT');
            const newSale = db.prepare('SELECT * FROM sales WHERE id = ?').get(id);
            return { success: true, data: newSale };
        } catch (error) {
            db.exec('ROLLBACK');
            console.error('Error creating sale:', error);
            return { success: false, error: error.message };
        }
    });

    // In your electron API (main process)
    ipcMain.handle('db:updateSale', async (event, id, saleData) => {
        console.log("🔍 [IPC] updateSale called with id:", id);
        console.log("🔍 [IPC] updateSale data:", JSON.stringify(saleData, null, 2));

        try {
            const db = getDb();

            // Ensure total_profit column exists (migration)
            try {
                db.exec(`ALTER TABLE sales ADD COLUMN total_profit DECIMAL(10,2) DEFAULT 0`);
                console.log('✅ Added total_profit column to sales table');
            } catch (error) {
                if (!error.message.includes('duplicate column name')) {
                    console.error('Error adding total_profit column:', error);
                }
            }

            // Start transaction
            const transaction = db.transaction(() => {
                // Update sales table
                const updates = [];
                const params = [];

                if (saleData.paymentStatus !== undefined) {
                    updates.push('payment_status = ?');
                    params.push(saleData.paymentStatus);
                }
                if (saleData.employeeId !== undefined) {
                    updates.push('employee_id = ?');
                    params.push(saleData.employeeId);
                }
                if (saleData.subtotal !== undefined) {
                    updates.push('subtotal = ?');
                    params.push(saleData.subtotal);
                }
                if (saleData.total !== undefined) {
                    updates.push('total = ?');
                    params.push(saleData.total);
                }
                if (saleData.total_profit !== undefined) {  // Add this
                    updates.push('total_profit = ?');
                    params.push(saleData.total_profit);
                }
                if (saleData.return_status !== undefined) {
                    updates.push('return_status = ?');
                    params.push(saleData.return_status);
                }
                if (saleData.total_returned_amount !== undefined) {
                    updates.push('total_returned_amount = ?');
                    params.push(saleData.total_returned_amount);
                }
                if (saleData.returned_items !== undefined) {
                    updates.push('returned_items = ?');
                    params.push(saleData.returned_items);
                }

                if (updates.length > 0) {
                    updates.push('updated_at = CURRENT_TIMESTAMP');
                    params.push(id);
                    const query = `UPDATE sales SET ${updates.join(', ')} WHERE id = ?`;
                    db.prepare(query).run(...params);
                }

                // Update sale_items if provided
                if (saleData.items !== undefined && Array.isArray(saleData.items)) {
                    // First, delete all existing items for this sale
                    db.prepare('DELETE FROM sale_items WHERE sale_id = ?').run(id);

                    // Then insert the updated items
                    const insertStmt = db.prepare(`
                    INSERT INTO sale_items (id, sale_id, product_id, quantity, unit_price, total)
                    VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?)
                `);

                    for (const item of saleData.items) {
                        insertStmt.run(
                            id,
                            item.product_id,
                            item.quantity,
                            item.unit_price,
                            item.total
                        );
                    }
                }
            });

            transaction();

            // Fetch and return updated sale with items
            const updatedSale = db.prepare('SELECT * FROM sales WHERE id = ?').get(id);
            const updatedItems = db.prepare(`
            SELECT si.*, p.name as product_name, p.barcode 
            FROM sale_items si
            JOIN products p ON si.product_id = p.id
            WHERE si.sale_id = ?
        `).all(id);

            updatedSale.items = updatedItems;

            console.log("🔍 [IPC] Updated sale with items:", updatedSale);
            return { success: true, data: updatedSale };

        } catch (error) {
            console.error("🔍 [IPC] Error in updateSale:", error);
            return { success: false, error: error.message };
        }
    });

    // ========== RETURNS ==========
    ipcMain.handle('db:getReturns', async (event, filters = {}) => {
        try {
            const db = getDb();
            let query = 'SELECT * FROM returns WHERE 1=1';
            const params = [];
            if (filters.startDate) { query += ' AND created_at >= ?'; params.push(filters.startDate); }
            if (filters.endDate) { query += ' AND created_at <= ?'; params.push(filters.endDate); }
            query += ' ORDER BY created_at DESC';
            const returns = db.prepare(query).all(...params);
            return { success: true, data: returns };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('db:createReturn', async (event, returnData, items) => {
        const db = getDb();
        const id = crypto.randomUUID();
        const receiptNumber = returnData.receiptNumber || `RET-${Date.now()}`;

        try {
            db.exec('BEGIN TRANSACTION');

            // Ensure total_loss column exists in returns table (migration)
            // try {
            //     db.exec(`ALTER TABLE returns ADD COLUMN total_loss DECIMAL(10,2) DEFAULT 0`);
            //     console.log('✅ Added total_loss column to returns table');
            // } catch (error) {
            //     if (!error.message.includes('duplicate column name')) {
            //         console.error('Error adding total_loss column:', error);
            //     }
            // }

            // Ensure profit_loss column exists in return_items
            // try {
            //     db.exec(`ALTER TABLE return_items ADD COLUMN profit_loss DECIMAL(10,2) DEFAULT 0`);
            //     console.log('✅ Added profit_loss column to return_items table');
            // } catch (error) {
            //     if (!error.message.includes('duplicate column name')) {
            //         console.error('Error adding profit_loss column:', error);
            //     }
            // }

            // Insert return record with total_loss
            const returnStmt = db.prepare(`
            INSERT INTO returns (
                id, receipt_number, original_sale_id, customer_name, customer_phone,
                subtotal, tax, discount, return_fee, total, total_loss, return_reason,
                payment_method, payment_status, account_number, user_id, shop_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

            returnStmt.run(
                id, receiptNumber, returnData.originalSaleId, returnData.customerName,
                returnData.customerPhone, returnData.subtotal, returnData.tax || 0,
                returnData.discount || 0, returnData.returnFee || 0, returnData.total,
                returnData.total_loss || 0, // Add total loss (profit lost from return)
                returnData.returnReason, returnData.paymentMethod || 'cash',
                returnData.paymentStatus || 'completed', returnData.accountNumber,
                returnData.userId, returnData.shopId
            );

            // Insert return items with profit_loss and RESTORE stock
            const itemStmt = db.prepare(`
            INSERT INTO return_items (id, return_id, product_id, quantity, unit_price, total, profit_loss)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

            const updateStock = db.prepare(`
            UPDATE products SET stock = stock + ? WHERE id = ?
        `);

            for (const item of items) {
                const itemId = crypto.randomUUID();
                itemStmt.run(
                    itemId,
                    id,
                    item.productId,
                    item.quantity,
                    item.unitPrice,
                    item.total,
                    item.profit_loss || 0 // Add profit/loss for this returned item
                );
                updateStock.run(item.quantity, item.productId); // Add stock back
            }

            db.exec('COMMIT');

            const newReturn = db.prepare('SELECT * FROM returns WHERE id = ?').get(id);
            return { success: true, data: newReturn };
        } catch (error) {
            db.exec('ROLLBACK');
            console.error('Error in createReturn:', error);
            return { success: false, error: error.message };
        }
    });

    // ========== PURCHASES ==========
    ipcMain.handle('db:getPurchases', async (event, filters = {}) => {
        try {
            const db = getDb();
            let query = 'SELECT * FROM purchases WHERE 1=1';
            const params = [];
            if (filters.startDate) { query += ' AND created_at >= ?'; params.push(filters.startDate); }
            if (filters.endDate) { query += ' AND created_at <= ?'; params.push(filters.endDate); }
            if (filters.supplierId) { query += ' AND supplier_id = ?'; params.push(filters.supplierId); }
            query += ' ORDER BY created_at DESC';
            const purchases = db.prepare(query).all(...params);
            return { success: true, data: purchases };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('db:getPurchaseById', async (event, id) => {
        try {
            const db = getDb();
            const purchase = db.prepare('SELECT * FROM purchases WHERE id = ?').get(id);
            return { success: true, data: purchase };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });
    ipcMain.handle('db:createPurchase', async (event, purchaseData) => {
        try {
            const db = getDb();
            const id = crypto.randomUUID();
            const poNumber = purchaseData.poNumber || `PO-${Date.now()}`;
            const stmt = db.prepare(`INSERT INTO purchases (id, po_number, supplier_id, subtotal, tax, total, status, account_number, payment_status, payment_method, items_description, user_id, shop_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
            stmt.run(
                id,
                poNumber,
                purchaseData.supplierId,
                purchaseData.subtotal,
                purchaseData.tax || 0,
                purchaseData.total,
                purchaseData.status || 'pending',
                purchaseData.accountNumber || null,
                purchaseData.paymentStatus || 'pending',
                purchaseData.paymentMethod || 'cash',
                purchaseData.itemsDescription || null,
                purchaseData.user_id,  // Changed from userId to user_id
                purchaseData.shop_id   // Changed from shopId to shop_id
            );
            const newPurchase = db.prepare('SELECT * FROM purchases WHERE id = ?').get(id);
            return { success: true, data: newPurchase };
        } catch (error) {
            console.error('Create purchase error:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('db:updatePurchase', async (event, id, purchaseData) => {
        try {
            const db = getDb();
            const updates = [];
            const params = [];

            if (purchaseData.status !== undefined) { updates.push('status = ?'); params.push(purchaseData.status); }
            if (purchaseData.payment_status !== undefined) { updates.push('payment_status = ?'); params.push(purchaseData.payment_status); }
            if (purchaseData.payment_method !== undefined) { updates.push('payment_method = ?'); params.push(purchaseData.payment_method); }
            if (purchaseData.items_description !== undefined) { updates.push('items_description = ?'); params.push(purchaseData.items_description); }
            if (purchaseData.subtotal !== undefined) { updates.push('subtotal = ?'); params.push(purchaseData.subtotal); }
            if (purchaseData.tax !== undefined) { updates.push('tax = ?'); params.push(purchaseData.tax); }
            if (purchaseData.total !== undefined) { updates.push('total = ?'); params.push(purchaseData.total); }
            if (purchaseData.supplier_id !== undefined) { updates.push('supplier_id = ?'); params.push(purchaseData.supplier_id); } // Add this

            if (updates.length === 0) return { success: false, error: 'No fields to update' };

            updates.push('updated_at = CURRENT_TIMESTAMP');
            params.push(id);

            const query = `UPDATE purchases SET ${updates.join(', ')} WHERE id = ?`;
            const result = db.prepare(query).run(...params);
            return { success: result.changes > 0 };
        } catch (error) {
            console.error('Update purchase error:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('db:deletePurchase', async (event, id) => {
        try {
            const db = getDb();
            const result = db.prepare('DELETE FROM purchases WHERE id = ?').run(id);
            return { success: result.changes > 0 };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    // ========== EXPENSES ==========
    ipcMain.handle('db:getExpenses', async (event, filters = {}) => {
        try {
            const db = getDb();
            let query = 'SELECT * FROM expenses WHERE 1=1';
            const params = [];
            if (filters.startDate) { query += ' AND created_at >= ?'; params.push(filters.startDate); }
            if (filters.endDate) { query += ' AND created_at <= ?'; params.push(filters.endDate); }
            if (filters.category) { query += ' AND category = ?'; params.push(filters.category); }
            query += ' ORDER BY created_at DESC';
            const expenses = db.prepare(query).all(...params);
            return { success: true, data: expenses };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('db:createExpense', async (event, expenseData) => {
        try {
            const db = getDb();
            const id = crypto.randomUUID();
            // Run this migration once
            try {
                db.exec(`ALTER TABLE expenses ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP`);
                console.log('✅ Added updated_at column to expenses table');
            } catch (error) {
                if (!error.message.includes('duplicate column name')) {
                    console.error('Error adding updated_at:', error);
                }
            }
            const stmt = db.prepare(`
            INSERT INTO expenses (
                id, title, description, amount, category, account_number, 
                payment_method, receipt_number, frequency, is_recurring, user_id, shop_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

            stmt.run(
                id,
                expenseData.title,
                expenseData.description || null,
                expenseData.amount,
                expenseData.category,
                expenseData.accountNumber || null,
                expenseData.paymentMethod || 'cash',
                expenseData.receiptNumber || null,
                expenseData.frequency || 'one-time',      // Add frequency
                expenseData.is_recurring ? 1 : 0,         // Add is_recurring
                expenseData.user_id || 'system',
                expenseData.shop_id || 'default'
            );

            const newExpense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(id);
            console.log('Expense created:', newExpense);
            return { success: true, data: newExpense };
        } catch (error) {
            console.error('Error in createExpense:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('db:updateExpense', async (event, id, expenseData) => {
        try {
            const db = getDb();
            const updates = [];
            const params = [];

            if (expenseData.title !== undefined) { updates.push('title = ?'); params.push(expenseData.title); }
            if (expenseData.description !== undefined) { updates.push('description = ?'); params.push(expenseData.description); }
            if (expenseData.amount !== undefined) { updates.push('amount = ?'); params.push(expenseData.amount); }
            if (expenseData.category !== undefined) { updates.push('category = ?'); params.push(expenseData.category); }
            if (expenseData.payment_method !== undefined) { updates.push('payment_method = ?'); params.push(expenseData.payment_method); }
            if (expenseData.receipt_number !== undefined) { updates.push('receipt_number = ?'); params.push(expenseData.receipt_number); }
            if (expenseData.frequency !== undefined) { updates.push('frequency = ?'); params.push(expenseData.frequency); }
            if (expenseData.is_recurring !== undefined) { updates.push('is_recurring = ?'); params.push(expenseData.is_recurring ? 1 : 0); }

            if (updates.length === 0) return { success: false, error: 'No fields to update' };

            // REMOVE this line if column doesn't exist:
            // updates.push('updated_at = CURRENT_TIMESTAMP');

            params.push(id);

            const query = `UPDATE expenses SET ${updates.join(', ')} WHERE id = ?`;
            const result = db.prepare(query).run(...params);

            return { success: result.changes > 0 };
        } catch (error) {
            console.error('Error updating expense:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('db:deleteExpense', async (event, id) => {
        try {
            const db = getDb();
            const result = db.prepare('DELETE FROM expenses WHERE id = ?').run(id);
            return { success: result.changes > 0 };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    // ========== EMPLOYEES ==========
    ipcMain.handle('db:getEmployees', async (event, filters = {}) => {
        try {
            const db = getDb();
            let query = 'SELECT * FROM employees WHERE 1=1';
            const params = [];

            console.log('=== GET EMPLOYEES DEBUG ===');
            console.log('Raw filters received:', JSON.stringify(filters, null, 2));

            // Search filter
            if (filters.search && filters.search.trim() !== '') {
                query += ' AND (name LIKE ? OR phone LIKE ?)';
                params.push(`%${filters.search}%`, `%${filters.search}%`);
                console.log('Applied search filter:', filters.search);
            }

            // Employee type filter - check both possible parameter names
            const typeFilter = filters.employeeType || filters.employee_type;
            if (typeFilter && typeFilter !== 'all' && typeFilter !== '') {
                query += ' AND employee_type = ?';
                params.push(typeFilter);
                console.log('Applied type filter:', typeFilter);
            }

            // Shift filter
            if (filters.shift && filters.shift !== 'all' && filters.shift !== '') {
                query += ' AND shift = ?';
                params.push(filters.shift);
                console.log('Applied shift filter:', filters.shift);
            }

            // Status filter
            if (filters.status === 'active') {
                query += ' AND is_active = 1';
                console.log('Applied status filter: active');
            } else if (filters.status === 'inactive') {
                query += ' AND is_active = 0';
                console.log('Applied status filter: inactive');
            }

            query += ' ORDER BY name';

            console.log('Final SQL:', query);
            console.log('SQL Params:', params);

            const employees = db.prepare(query).all(...params);
            console.log(`Found ${employees.length} employees`);
            console.log('Employee data sample:', employees.length > 0 ? employees[0] : 'none');

            return { success: true, data: employees };
        } catch (error) {
            console.error('Error in getEmployees:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('db:getEmployeeById', async (event, id) => {
        try {
            const db = getDb();
            const employee = db.prepare('SELECT * FROM employees WHERE id = ?').get(id);
            return { success: true, data: employee };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('db:createEmployee', async (event, employeeData) => {
        try {
            const db = getDb();
            const id = crypto.randomUUID();
            const stmt = db.prepare(`
            INSERT INTO employees (
                id, name, phone, salary, salary_type, payment_method, shift, 
                employee_type, join_date, leave_date, is_active, user_id, shop_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

            stmt.run(
                id,
                employeeData.name,
                employeeData.phone,
                employeeData.salary,
                employeeData.salary_type || 'monthly',
                employeeData.payment_method || 'cash',
                employeeData.shift || 'day',
                employeeData.employee_type || 'labor',
                employeeData.join_date || new Date().toISOString(),
                employeeData.leave_date || null,
                employeeData.is_active !== false ? 1 : 0,
                employeeData.user_id || 'system',
                employeeData.shop_id || 'default'
            );

            const newEmployee = db.prepare('SELECT * FROM employees WHERE id = ?').get(id);
            return { success: true, data: newEmployee };
        } catch (error) {
            console.error('Error in createEmployee:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('db:updateEmployee', async (event, id, employeeData) => {
        try {
            const db = getDb();
            const updates = [];
            const params = [];

            // Map frontend field names to database column names
            if (employeeData.name !== undefined) { updates.push('name = ?'); params.push(employeeData.name); }
            if (employeeData.phone !== undefined) { updates.push('phone = ?'); params.push(employeeData.phone); }
            if (employeeData.salary !== undefined) { updates.push('salary = ?'); params.push(employeeData.salary); }
            if (employeeData.salary_type !== undefined) { updates.push('salary_type = ?'); params.push(employeeData.salary_type); }
            if (employeeData.payment_method !== undefined) { updates.push('payment_method = ?'); params.push(employeeData.payment_method); }
            if (employeeData.shift !== undefined) { updates.push('shift = ?'); params.push(employeeData.shift); }
            if (employeeData.employee_type !== undefined) { updates.push('employee_type = ?'); params.push(employeeData.employee_type); }
            if (employeeData.is_active !== undefined) { updates.push('is_active = ?'); params.push(employeeData.is_active ? 1 : 0); }
            if (employeeData.join_date !== undefined) { updates.push('join_date = ?'); params.push(employeeData.join_date); }
            if (employeeData.leave_date !== undefined) { updates.push('leave_date = ?'); params.push(employeeData.leave_date); }

            if (updates.length === 0) {
                return { success: false, error: 'No fields to update' };
            }

            updates.push('updated_at = CURRENT_TIMESTAMP');
            params.push(id);

            const query = `UPDATE employees SET ${updates.join(', ')} WHERE id = ?`;
            const result = db.prepare(query).run(...params);

            // Get updated employee to return
            const updatedEmployee = db.prepare('SELECT * FROM employees WHERE id = ?').get(id);
            return { success: result.changes > 0, data: updatedEmployee };
        } catch (error) {
            console.error('Error in updateEmployee:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('db:deleteEmployee', async (event, id) => {
        try {
            const db = getDb();
            // First check if employee exists
            const employee = db.prepare('SELECT * FROM employees WHERE id = ?').get(id);
            if (!employee) {
                return { success: false, error: 'Employee not found' };
            }

            // Hard delete (remove completely) - change from UPDATE to DELETE
            const result = db.prepare('DELETE FROM employees WHERE id = ?').run(id);

            return { success: result.changes > 0 };
        } catch (error) {
            console.error('Error in deleteEmployee:', error);
            return { success: false, error: error.message };
        }
    });

    // ========== ATTENDANCE ==========
    ipcMain.handle('db:getAttendance', async (event, employeeId, month, year) => {
        try {
            const db = getDb();
            const attendance = db.prepare(`SELECT * FROM attendance WHERE employee_id = ? AND strftime('%Y-%m', date) = ? ORDER BY date DESC`).all(employeeId, `${year}-${month}`);
            return { success: true, data: attendance };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('db:markAttendance', async (event, attendanceData) => {
        try {
            const db = getDb();
            const id = crypto.randomUUID();
            const existing = db.prepare(`SELECT id FROM attendance WHERE employee_id = ? AND date = ?`).get(attendanceData.employeeId, attendanceData.date);

            if (existing) {
                const stmt = db.prepare(`UPDATE attendance SET status = ?, check_in = ?, check_out = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`);
                stmt.run(attendanceData.status, attendanceData.checkIn, attendanceData.checkOut, attendanceData.notes, existing.id);
                return { success: true, data: { id: existing.id, ...attendanceData } };
            } else {
                const stmt = db.prepare(`INSERT INTO attendance (id, employee_id, date, status, check_in, check_out, notes, user_id, shop_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
                stmt.run(id, attendanceData.employeeId, attendanceData.date, attendanceData.status, attendanceData.checkIn, attendanceData.checkOut, attendanceData.notes, attendanceData.userId, attendanceData.shopId);
                return { success: true, data: { id, ...attendanceData } };
            }
        } catch (error) {
            console.error('Error in markAttendance:', error);
            return { success: false, error: error.message };
        }
    });

    // ========== SALARIES ==========
    ipcMain.handle('db:getSalaries', async (event, employeeId, month, year) => {
        try {
            const db = getDb();
            let query = 'SELECT * FROM salaries WHERE 1=1';
            const params = [];
            if (employeeId) { query += ' AND employee_id = ?'; params.push(employeeId); }
            if (month) { query += ' AND month = ?'; params.push(month); }
            if (year) { query += ' AND year = ?'; params.push(year); }
            query += ' ORDER BY year DESC, month DESC';
            const salaries = db.prepare(query).all(...params);
            return { success: true, data: salaries };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('db:createSalary', async (event, salaryData) => {
        try {
            const db = getDb();
            const id = crypto.randomUUID();
            const stmt = db.prepare(`INSERT INTO salaries (id, employee_id, month, year, basic_salary, deductions, bonuses, net_salary, status, payment_date, payment_method, notes, user_id, shop_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
            stmt.run(id, salaryData.employeeId, salaryData.month, salaryData.year, salaryData.basicSalary, salaryData.deductions || 0, salaryData.bonuses || 0, salaryData.netSalary, salaryData.status || 'pending', salaryData.paymentDate || null, salaryData.paymentMethod || 'cash', salaryData.notes, salaryData.userId, salaryData.shopId);
            const newSalary = db.prepare('SELECT * FROM salaries WHERE id = ?').get(id);
            return { success: true, data: newSalary };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('db:updateSalaryStatus', async (event, id, status) => {
        try {
            const db = getDb();
            const stmt = db.prepare(`UPDATE salaries SET status = ?, payment_date = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`);
            const result = stmt.run(status, id);
            return { success: result.changes > 0 };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });
    ipcMain.handle('db:updateSalary', async (event, id, salaryData) => {
        try {
            const db = getDb();
            const updates = [];
            const params = [];

            if (salaryData.basicSalary !== undefined) { updates.push('basic_salary = ?'); params.push(salaryData.basicSalary); }
            if (salaryData.bonuses !== undefined) { updates.push('bonuses = ?'); params.push(salaryData.bonuses); }
            if (salaryData.deductions !== undefined) { updates.push('deductions = ?'); params.push(salaryData.deductions); }
            if (salaryData.netSalary !== undefined) { updates.push('net_salary = ?'); params.push(salaryData.netSalary); }
            if (salaryData.status !== undefined) { updates.push('status = ?'); params.push(salaryData.status); }
            if (salaryData.payment_method !== undefined) { updates.push('payment_method = ?'); params.push(salaryData.payment_method); }
            if (salaryData.notes !== undefined) { updates.push('notes = ?'); params.push(salaryData.notes); }

            if (updates.length === 0) return { success: false, error: 'No fields to update' };

            updates.push('updated_at = CURRENT_TIMESTAMP');
            params.push(id);

            const query = `UPDATE salaries SET ${updates.join(', ')} WHERE id = ?`;
            const result = db.prepare(query).run(...params);

            const updatedSalary = db.prepare('SELECT * FROM salaries WHERE id = ?').get(id);
            return { success: result.changes > 0, data: updatedSalary };
        } catch (error) {
            console.error('Error updating salary:', error);
            return { success: false, error: error.message };
        }
    });
    // ========== DASHBOARD STATS ==========
    ipcMain.handle('db:getDashboardStats', async (event, userId, shopId) => {
        try {
            const db = getDb();
            const today = new Date().toISOString().split('T')[0];

            const todaySales = db.prepare(`
            SELECT COALESCE(SUM(total), 0) as total 
            FROM sales 
            WHERE date(created_at) = ?
        `).get(today);

            const totalSales = db.prepare('SELECT COALESCE(SUM(total), 0) as total FROM sales').get();

            const totalProducts = db.prepare('SELECT COUNT(*) as count FROM products').get();

            const lowStockCount = db.prepare(`
            SELECT COUNT(*) as count 
            FROM products 
            WHERE stock <= min_stock AND min_stock > 0
        `).get();

            return {
                success: true,
                data: {
                    todaySales: todaySales.total,
                    totalSales: totalSales.total,
                    totalProducts: totalProducts.count,
                    lowStockCount: lowStockCount.count
                }
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    // ========== SETTINGS ==========
    ipcMain.handle('db:getSettings', async () => {
        try {
            const db = getDb();

            // Ensure visible_tabs column exists
            try {
                db.exec(`ALTER TABLE settings ADD COLUMN visible_tabs TEXT DEFAULT '[]'`);
                console.log('✅ Added visible_tabs column to settings table');
            } catch (error) {
                if (!error.message.includes('duplicate column name')) {
                    console.error('Error adding visible_tabs column:', error);
                }
            }

            const settings = db.prepare("SELECT * FROM settings WHERE id = 'default'").get();

            if (!settings) {
                const insertStmt = db.prepare(`
                INSERT INTO settings (id, tax, discount, visible_tabs) 
                VALUES ('default', 0, 0, '[]')
            `);
                insertStmt.run();

                const newSettings = db.prepare("SELECT * FROM settings WHERE id = 'default'").get();
                newSettings.visible_tabs = [];
                return { success: true, data: newSettings };
            }

            // Parse visible_tabs from string to array
            if (settings.visible_tabs && typeof settings.visible_tabs === 'string') {
                try {
                    settings.visible_tabs = JSON.parse(settings.visible_tabs);
                } catch (e) {
                    settings.visible_tabs = [];
                }
            } else if (!settings.visible_tabs) {
                settings.visible_tabs = [];
            }

            return { success: true, data: settings };
        } catch (error) {
            console.error('Error getting settings:', error);
            return { success: false, error: error.message, data: { tax: 0, discount: 0, visible_tabs: [] } };
        }
    });

    ipcMain.handle('db:updateSettings', async (event, settingsData) => {
        try {
            console.log('🔍 [UPDATE SETTINGS] Received data:', settingsData);

            const db = getDb();

            // Build update query dynamically based on what fields are provided
            const updates = [];
            const params = [];

            if (settingsData.tax !== undefined) {
                updates.push('tax = ?');
                params.push(settingsData.tax);
            }
            if (settingsData.discount !== undefined) {
                updates.push('discount = ?');
                params.push(settingsData.discount);
            }
            if (settingsData.visible_tabs !== undefined) {
                updates.push('visible_tabs = ?');
                // Ensure visible_tabs is stringified
                const tabsValue = Array.isArray(settingsData.visible_tabs)
                    ? JSON.stringify(settingsData.visible_tabs)
                    : settingsData.visible_tabs;
                params.push(tabsValue);
            }

            if (updates.length === 0) {
                return { success: false, error: 'No fields to update' };
            }

            updates.push('updated_at = CURRENT_TIMESTAMP');
            params.push('default');

            const query = `UPDATE settings SET ${updates.join(', ')} WHERE id = ?`;
            console.log('🔍 [UPDATE SETTINGS] Query:', query);
            console.log('🔍 [UPDATE SETTINGS] Params:', params);

            const updateStmt = db.prepare(query);
            const result = updateStmt.run(...params);

            // Fetch and return updated settings
            const updatedSettings = db.prepare(`SELECT * FROM settings WHERE id = 'default'`).get();

            // Parse visible_tabs for response
            if (updatedSettings.visible_tabs && typeof updatedSettings.visible_tabs === 'string') {
                try {
                    updatedSettings.visible_tabs = JSON.parse(updatedSettings.visible_tabs);
                } catch (e) {
                    updatedSettings.visible_tabs = [];
                }
            }

            return { success: result.changes > 0, data: updatedSettings };

        } catch (error) {
            console.error('🔍 [UPDATE SETTINGS] Error:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('db:getTransactionLogs', async (event, filters = {}) => {
        try {
            const db = getDb();
            let query = 'SELECT * FROM transaction_logs WHERE 1=1';
            const params = [];
            if (filters.startDate) { query += ' AND created_at >= ?'; params.push(filters.startDate); }
            if (filters.endDate) { query += ' AND created_at <= ?'; params.push(filters.endDate); }
            if (filters.type) { query += ' AND type = ?'; params.push(filters.type); }
            query += ' ORDER BY created_at DESC';
            const logs = db.prepare(query).all(...params);
            return { success: true, data: logs };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });


    // In ipcHandlers.js, add these handlers:

    ipcMain.handle('app:verifyAdminPin', async (event, pin) => {
        try {
            // Load the locally stored license
            const licenseData = licenseManager.loadLicense();
            if (!licenseData) {
                return { success: false, error: 'No license found. Please activate first.' };
            }

            // Compare the entered PIN with the stored admin_pin
            // Note: You need to store admin_pin in the license data during activation
            const isValid = licenseData.admin_pin === pin;

            return { success: isValid };
        } catch (error) {
            console.error('Error verifying admin PIN:', error);
            return { success: false, error: error.message };
        }
    });

    // Add this handler in ipcHandlers.js
    ipcMain.handle('db:getProfitData', async (event, startDate, endDate) => {
        try {
            const db = getDb();

            // Calculate number of days in the period
            const start = new Date(startDate);
            const end = new Date(endDate);
            const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

            // Helper function to get days in a specific month
            const getDaysInMonth = (year, month) => {
                return new Date(year, month + 1, 0).getDate();
            };

            // Get sales with profit (these are already correct - count full amount when sold)
            const sales = db.prepare(`
            SELECT 
                si.id,
                p.name as product_name,
                si.quantity,
                si.unit_price,
                si.total,
                si.profit,
                s.created_at as sale_date
            FROM sale_items si
            JOIN products p ON si.product_id = p.id
            JOIN sales s ON si.sale_id = s.id
            WHERE date(s.created_at) BETWEEN date(?) AND date(?)
            ORDER BY s.created_at DESC
        `).all(startDate, endDate);

            // Calculate sales totals
            let totalSales = 0;
            let totalCOGS = 0;
            let grossProfit = 0;

            for (const sale of sales) {
                totalSales += sale.total;
                const profit = sale.profit || 0;
                grossProfit += profit;
                totalCOGS += sale.total - profit;
            }

            // Get SALARIES - SPREAD ACROSS DAYS (don't count full amount on payment day)
            // First get all paid salaries that fall within the period or before
            const salaries = db.prepare(`
            SELECT 
                sa.id,
                e.name as employee_name,
                sa.basic_salary,
                sa.bonuses,
                sa.deductions,
                sa.net_salary,
                sa.created_at,
                sa.payment_date,
                sa.status,
                sa.month,
                sa.year
            FROM salaries sa
            JOIN employees e ON sa.employee_id = e.id
            WHERE sa.status = 'paid'
        `).all();

            let totalSalaries = 0;

            // For each salary, calculate daily rate and add only the days within the period
            for (const salary of salaries) {
                const salaryDate = salary.payment_date || salary.created_at;
                if (!salaryDate) continue;

                const salaryYear = new Date(salaryDate).getFullYear();
                const salaryMonth = new Date(salaryDate).getMonth();
                const daysInMonth = getDaysInMonth(salaryYear, salaryMonth);
                const dailyRate = salary.net_salary / daysInMonth;

                // Calculate how many days of this salary fall within the selected period
                const salaryStart = new Date(salaryYear, salaryMonth, 1);
                const salaryEnd = new Date(salaryYear, salaryMonth, daysInMonth);

                const periodStart = new Date(startDate);
                const periodEnd = new Date(endDate);

                const overlapStart = new Date(Math.max(salaryStart.getTime(), periodStart.getTime()));
                const overlapEnd = new Date(Math.min(salaryEnd.getTime(), periodEnd.getTime()));

                if (overlapStart <= overlapEnd) {
                    const daysInPeriod = Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                    totalSalaries += dailyRate * daysInPeriod;
                }
            }

            // Get EXPENSES - handle recurring expenses properly
            const expenses = db.prepare(`
            SELECT * FROM expenses 
            WHERE date(created_at) BETWEEN date(?) AND date(?)
            OR is_recurring = 1
            ORDER BY created_at DESC
        `).all(startDate, endDate);

            let totalExpenses = 0;

            // Get all recurring expenses (including those not in the date range)
            const allRecurringExpenses = db.prepare(`
            SELECT * FROM expenses 
            WHERE is_recurring = 1
        `).all();

            // Add recurring expenses that apply to this period
            for (const expense of allRecurringExpenses) {
                let dailyAmount = 0;
                const expenseAmount = expense.amount || 0;

                switch (expense.frequency) {
                    case 'daily':
                        dailyAmount = expenseAmount;
                        break;
                    case 'weekly':
                        dailyAmount = expenseAmount / 7;
                        break;
                    case 'monthly':
                        dailyAmount = expenseAmount / 30;
                        break;
                    case 'yearly':
                        dailyAmount = expenseAmount / 365;
                        break;
                    default:
                        dailyAmount = 0;
                }

                totalExpenses += dailyAmount * daysDiff;
            }

            // Add one-time expenses that fall within the date range
            for (const expense of expenses) {
                if (!expense.is_recurring || expense.frequency === 'one-time') {
                    totalExpenses += expense.amount || 0;
                }
            }

            const netProfit = grossProfit - totalSalaries - totalExpenses;

            // Format salaries for display (show full amount but note it's spread)
            const formattedSalaries = salaries.map(s => ({
                id: s.id,
                employee_name: s.employee_name,
                net_salary: s.net_salary,
                payment_date: s.payment_date || s.created_at,
                status: s.status,
                note: `Daily rate: ${(s.net_salary / getDaysInMonth(new Date(s.payment_date || s.created_at).getFullYear(), new Date(s.payment_date || s.created_at).getMonth())).toFixed(2)}/day`
            }));

            // Format expenses for display
            const formattedExpenses = expenses.map(e => ({
                id: e.id,
                title: e.title,
                category: e.category,
                amount: e.amount,
                frequency: e.frequency,
                is_recurring: e.is_recurring,
                created_at: e.created_at,
                daily_cost: e.is_recurring ? (
                    e.frequency === 'daily' ? e.amount :
                        e.frequency === 'weekly' ? e.amount / 7 :
                            e.frequency === 'monthly' ? e.amount / 30 :
                                e.frequency === 'yearly' ? e.amount / 365 : 0
                ) : 0
            }));

            return {
                period: { startDate, endDate, days: daysDiff },
                summary: {
                    totalSales,
                    totalCOGS,
                    grossProfit,
                    totalSalaries,
                    totalExpenses,
                    netProfit
                },
                sales,
                salaries: formattedSalaries,
                expenses: formattedExpenses
            };
        } catch (error) {
            console.error('Error in getProfitData:', error);
            throw error;
        }
    });

    // Update admin PIN - sync with server and local
    ipcMain.handle('app:updateAdminPin', async (event, oldPin, newPin) => {
        try {
            // Load current license
            const licenseData = licenseManager.loadLicense();

            if (!licenseData) {
                return { success: false, error: 'No license found' };
            }

            // Verify old PIN locally first
            if (licenseData.admin_pin !== oldPin) {
                return { success: false, error: 'Invalid current PIN' };
            }

            // Get the license key from stored data
            const licenseKey = licenseData.license_key;

            // Call server API to update PIN in database
            let serverUpdateSuccess = false;

            try {
                const response = await axios.post(`${API_URL}/admin-pin/change`, {
                    licenseKey: licenseKey,
                    oldPin: oldPin,
                    newPin: newPin
                }, {
                    timeout: 30000,
                    headers: { 'Content-Type': 'application/json' }
                });

                if (response.data.success) {
                    serverUpdateSuccess = true;
                    console.log('PIN updated on server successfully');
                } else {
                    console.error('Server PIN update failed:', response.data.message);
                    return {
                        success: false,
                        error: response.data.message || 'Failed to update PIN on server'
                    };
                }
            } catch (serverError) {
                console.error('Server error during PIN update:', serverError.message);
                return {
                    success: false,
                    error: 'Network error. Could not update PIN on server.'
                };
            }

            // If server update successful, update local license
            if (serverUpdateSuccess) {
                licenseData.admin_pin = newPin;
                const saved = licenseManager.saveLicense(licenseData);

                if (saved) {
                    return { success: true, message: 'PIN updated successfully' };
                } else {
                    return { success: false, error: 'PIN updated on server but failed to save locally' };
                }
            }

            return { success: false, error: 'Unknown error occurred' };
        } catch (error) {
            console.error('Error updating admin PIN:', error);
            return { success: false, error: error.message };
        }
    });

    function getLoginTypeFile() {
        const userDataPath = app.getPath('userData');
        return path.join(userDataPath, 'login_type.json');
    }

    ipcMain.handle('app:getLoginType', async () => {
        try {
            const filePath = getLoginTypeFile();
            if (fs.existsSync(filePath)) {
                const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                return { success: true, login_type: data.login_type || 'operator' };
            }
            return { success: true, login_type: 'operator' };
        } catch (error) {
            console.error('Error getting login type:', error);
            return { success: true, login_type: 'operator' };
        }
    });

    // Set login type (used after PIN verification)
    ipcMain.handle('app:setLoginType', async (event, loginType) => {
        try {
            const filePath = getLoginTypeFile();
            fs.writeFileSync(filePath, JSON.stringify({
                login_type: loginType,
                updated_at: new Date().toISOString()
            }));
            return { success: true };
        } catch (error) {
            console.error('Error setting login type:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('google:connect', async () => {
        return new Promise((resolve, reject) => {
            const CLIENT_ID = '1029274681556-ps3n13bvbjhogipcj7rsblfqu27041jq.apps.googleusercontent.com';
            const CLIENT_SECRET = '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';
            const REDIRECT_URI = 'http://localhost:3000';

            const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

            const authUrl = oauth2Client.generateAuthUrl({
                access_type: 'offline', // Important: gets refresh token
                scope: ['https://www.googleapis.com/auth/drive.file'],
                prompt: 'consent'
            });

            if (oauthServer) oauthServer.close();

            oauthServer = http.createServer(async (req, res) => {
                const query = url.parse(req.url, true).query;

                if (query.code) {
                    try {
                        const { tokens } = await oauth2Client.getToken(query.code);
                        console.log('Got tokens:', {
                            hasAccessToken: !!tokens.access_token,
                            hasRefreshToken: !!tokens.refresh_token,
                            expiryDate: tokens.expiry_date
                        });

                        // Store both access token and refresh token
                        const userDataPath = app.getPath('userData');
                        const tokenPath = path.join(userDataPath, 'google-token.json');

                        const tokenData = {
                            access_token: tokens.access_token,
                            refresh_token: tokens.refresh_token,
                            expiry_date: tokens.expiry_date,
                            scope: tokens.scope
                        };

                        fs.writeFileSync(tokenPath, JSON.stringify(tokenData));

                        const windows = BrowserWindow.getAllWindows();
                        windows.forEach(win => {
                            if (!win.isDestroyed()) {
                                win.webContents.send('google-token', tokens.access_token);
                                win.webContents.send('google-refresh-token', tokens.refresh_token);
                            }
                        });

                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        res.end('<h1>✅ Connected Successfully!</h1><p>You can close this window.</p><script>window.close()</script>');
                        oauthServer.close();
                        resolve(tokens);
                    } catch (error) {
                        reject(error);
                    }
                }
            });

            oauthServer.listen(3000, () => {
                console.log('OAuth server running on http://localhost:3000');
                shell.openExternal(authUrl);
            });
        });
    });

    ipcMain.handle('backup:uploadToGoogleDrive', async (event, { accessToken, dbPath }) => {
        try {
            // Get valid token (auto-refresh if needed)
            let validToken = accessToken;
            if (!validToken) {
                validToken = await getValidAccessToken();
            }

            const oauth2Client = new google.auth.OAuth2();
            oauth2Client.setCredentials({
                access_token: validToken
            });

            const drive = google.drive({ version: 'v3', auth: oauth2Client });

            // Check if file exists
            if (!fs.existsSync(dbPath)) {
                throw new Error(`Database file not found: ${dbPath}`);
            }

            const fileName = `pos_backup_${Date.now()}.db`;
            const fileSize = fs.statSync(dbPath).size;
            console.log(`Uploading ${fileName} (${fileSize} bytes) from ${dbPath}`);

            const fileStream = fs.createReadStream(dbPath);

            const response = await drive.files.create({
                requestBody: {
                    name: fileName,
                    mimeType: 'application/x-sqlite3'
                },
                media: {
                    mimeType: 'application/x-sqlite3',
                    body: fileStream
                },
                fields: 'id, name, size'
            });

            console.log('Database upload successful:', response.data);
            return { success: true, fileId: response.data.id, name: response.data.name };

        } catch (error) {
            console.error('Upload error:', error.message);

            // If token is invalid, request re-authentication
            if (error.message.includes('invalid_grant') || error.message.includes('expired') || error.message.includes('Please reconnect')) {
                return { success: false, error: 'TOKEN_EXPIRED', needsReauth: true };
            }

            return { success: false, error: error.message };
        }
    });
    ipcMain.handle('google:checkConnection', async () => {
        try {
            const userDataPath = app.getPath('userData');
            const tokenPath = path.join(userDataPath, 'google-token.json');

            if (fs.existsSync(tokenPath)) {
                const tokenData = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
                const isValid = Date.now() < tokenData.expiry_date;
                return {
                    connected: true,
                    hasValidToken: isValid,
                    needsRefresh: !isValid && !!tokenData.refresh_token
                };
            }
            return { connected: false };
        } catch (error) {
            return { connected: false, error: error.message };
        }
    });

    // Add handler to disconnect/remove tokens
    ipcMain.handle('google:disconnect', async () => {
        const { app } = require('electron');
        const userDataPath = app.getPath('userData');
        const tokenPath = path.join(userDataPath, 'google-token.json');

        if (fs.existsSync(tokenPath)) {
            fs.unlinkSync(tokenPath);
        }
        return { success: true };
    });
    ipcMain.handle('google:getStorageInfo', async (event) => {
        try {
            const validToken = await getValidAccessToken();

            const oauth2Client = new google.auth.OAuth2();
            oauth2Client.setCredentials({
                access_token: validToken
            });

            const drive = google.drive({ version: 'v3', auth: oauth2Client });

            // Get about information (storage quota)
            const response = await drive.about.get({
                fields: 'storageQuota'
            });

            const quota = response.data.storageQuota;

            // Convert bytes to GB for easier reading
            const totalGB = quota.limit / (1024 * 1024 * 1024);
            const usedGB = quota.usage / (1024 * 1024 * 1024);
            const remainingGB = (quota.limit - quota.usage) / (1024 * 1024 * 1024);
            const usagePercent = (quota.usage / quota.limit) * 100;

            return {
                success: true,
                data: {
                    total: quota.limit, // bytes
                    used: quota.usage, // bytes
                    remaining: quota.limit - quota.usage, // bytes
                    totalGB: totalGB.toFixed(2),
                    usedGB: usedGB.toFixed(2),
                    remainingGB: remainingGB.toFixed(2),
                    usagePercent: usagePercent.toFixed(1),
                    usageInDrive: quota.usageInDrive || 0,
                    usageInTrash: quota.usageInTrash || 0
                }
            };

        } catch (error) {
            console.error('Error getting storage info:', error);
            return {
                success: false,
                error: error.message,
                needsReauth: error.message.includes('invalid_grant') || error.message.includes('expired')
            };
        }
    });
    ipcMain.handle('db:getPath', () => {
        const userDataPath = app.getPath('userData');
        const dbPath = path.join(userDataPath, 'pos.db');
        return { success: true, path: dbPath };
    });

    // Add this IPC handler in main.js (after other handlers)
    ipcMain.handle('app:checkSubscriptionStatus', async () => {
        try {
            const licenseData = licenseManager.loadLicense();

            if (!licenseData) {
                return {
                    status: 'no_license',
                    message: 'No license found. Please activate your license.',
                    hasLicense: false
                };
            }

            const shopId = licenseData.shop?.shopId || licenseData.shop?.id;

            if (!shopId) {
                return {
                    status: 'no_shop',
                    message: 'No shop information found in license.',
                    hasLicense: true
                };
            }

            // Call server API to check subscription
            const response = await axios.get(`${API_URL}/shops/${shopId}/subscription-status`, {
                timeout: 10000,
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.data && response.data.success) {
                const subscriptionStatus = response.data.data.subscriptionStatus;
                const expiryDate = response.data.data.expiryDate;
                const shopName = response.data.data.shopName;

                let message = '';
                switch (subscriptionStatus) {
                    case 'active':
                        message = expiryDate ? `Active until ${new Date(expiryDate).toLocaleDateString()}` : 'Active';
                        break;
                    case 'expired':
                        message = expiryDate ? `Expired on ${new Date(expiryDate).toLocaleDateString()}` : 'Subscription expired';
                        break;
                    case 'suspended':
                        message = 'Subscription suspended. Please contact support.';
                        break;
                    default:
                        message = 'Unknown subscription status';
                }

                return {
                    status: subscriptionStatus,
                    message: message,
                    shopName: shopName,
                    expiryDate: expiryDate,
                    hasLicense: true,
                    isValid: subscriptionStatus === 'active'
                };
            }

            return {
                status: 'error',
                message: 'Failed to verify subscription status',
                hasLicense: true
            };

        } catch (error) {
            console.error('Error checking subscription:', error);

            // If server is unreachable but license is locally valid, allow access
            const licenseData = licenseManager.loadLicense();
            if (licenseData && licenseManager.isLicenseValid(licenseData)) {
                return {
                    status: 'offline_mode',
                    message: 'Server unreachable. Using cached license.',
                    hasLicense: true,
                    isValid: true
                };
            }

            return {
                status: 'error',
                message: 'Unable to verify subscription. Please check your internet connection.',
                hasLicense: !!licenseData
            };
        }
    });

    ipcMain.handle('app:restart', () => {
        app.relaunch();
        app.exit();
    });

    console.log('✅ All IPC handlers registered successfully');
}