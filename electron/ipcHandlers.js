import { ipcMain, shell, app } from 'electron';
import fs from 'fs';
import path from 'path';
import { getDb } from './database.js';
import crypto from 'crypto';

export function setupIpcHandlers() {

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

    ipcMain.handle('db:getSaleByReceiptNumber', async (event, receiptNumber) => {
        try {
            const db = getDb();
            const sale = db.prepare('SELECT * FROM sales WHERE receipt_number = ?').get(receiptNumber);
            return { success: true, data: sale };
        } catch (error) {
            return { success: false, error: error.message };
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
            const saleStmt = db.prepare(`INSERT INTO sales (id, receipt_number, customer_name, customer_phone, subtotal, tax, discount, total, payment_method, account_number, payment_status, employee_id, user_id, shop_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
            saleStmt.run(id, receiptNumber, saleData.customerName, saleData.customerPhone, saleData.subtotal, saleData.tax || 0, saleData.discount || 0, saleData.total, saleData.paymentMethod || 'cash', saleData.accountNumber, saleData.paymentStatus || 'completed', saleData.employeeId, saleData.userId, saleData.shopId);
            const itemStmt = db.prepare(`INSERT INTO sale_items (id, sale_id, product_id, quantity, unit_price, total) VALUES (?, ?, ?, ?, ?, ?)`);
            const updateStock = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?');
            for (const item of items) {
                const itemId = crypto.randomUUID();
                itemStmt.run(itemId, id, item.productId, item.quantity, item.unitPrice, item.total);
                updateStock.run(item.quantity, item.productId);
            }
            db.exec('COMMIT');
            const newSale = db.prepare('SELECT * FROM sales WHERE id = ?').get(id);
            return { success: true, data: newSale };
        } catch (error) {
            db.exec('ROLLBACK');
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('db:updateSale', async (event, id, saleData) => {
        try {
            const db = getDb();
            const updates = [];
            const params = [];
            if (saleData.paymentStatus !== undefined) { updates.push('payment_status = ?'); params.push(saleData.paymentStatus); }
            if (saleData.employeeId !== undefined) { updates.push('employee_id = ?'); params.push(saleData.employeeId); }
            if (updates.length === 0) return { success: false, error: 'No fields to update' };
            params.push(id);
            const result = db.prepare(`UPDATE sales SET ${updates.join(', ')} WHERE id = ?`).run(...params);
            return { success: result.changes > 0 };
        } catch (error) {
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
            const returnStmt = db.prepare(`INSERT INTO returns (id, receipt_number, original_sale_id, customer_name, customer_phone, subtotal, tax, discount, return_fee, total, return_reason, payment_method, payment_status, account_number, user_id, shop_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
            returnStmt.run(id, receiptNumber, returnData.originalSaleId, returnData.customerName, returnData.customerPhone, returnData.subtotal, returnData.tax || 0, returnData.discount || 0, returnData.returnFee || 0, returnData.total, returnData.returnReason, returnData.paymentMethod || 'cash', returnData.paymentStatus || 'completed', returnData.accountNumber, returnData.userId, returnData.shopId);
            const itemStmt = db.prepare(`INSERT INTO return_items (id, return_id, product_id, quantity, unit_price, total) VALUES (?, ?, ?, ?, ?, ?)`);
            const updateStock = db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?');
            for (const item of items) {
                const itemId = crypto.randomUUID();
                itemStmt.run(itemId, id, item.productId, item.quantity, item.unitPrice, item.total);
                updateStock.run(item.quantity, item.productId);
            }
            db.exec('COMMIT');
            const newReturn = db.prepare('SELECT * FROM returns WHERE id = ?').get(id);
            return { success: true, data: newReturn };
        } catch (error) {
            db.exec('ROLLBACK');
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
            const stmt = db.prepare(`
            INSERT INTO expenses (
                id, title, description, amount, category, account_number, 
                payment_method, receipt_number, user_id, shop_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                expenseData.user_id,    // Changed from userId to user_id
                expenseData.shop_id     // Changed from shopId to shop_id
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
            if (updates.length === 0) return { success: false, error: 'No fields to update' };
            params.push(id);
            const result = db.prepare(`UPDATE expenses SET ${updates.join(', ')} WHERE id = ?`).run(...params);
            return { success: result.changes > 0 };
        } catch (error) {
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
            const settings = db.prepare('SELECT * FROM settings WHERE id = "default"').get();
            return { success: true, data: settings };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('db:updateSettings', async (event, settingsData) => {
        try {
            const db = getDb();
            const stmt = db.prepare(`UPDATE settings SET tax = ?, discount = ?, updated_at = CURRENT_TIMESTAMP WHERE id = "default"`);
            const result = stmt.run(settingsData.tax || 0, settingsData.discount || 0);
            return { success: result.changes > 0 };
        } catch (error) {
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

    ipcMain.handle('app:restart', () => {
        app.relaunch();
        app.exit();
    });

    console.log('✅ All IPC handlers registered successfully');
}