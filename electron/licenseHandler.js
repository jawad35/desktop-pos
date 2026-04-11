import { ipcMain, app, BrowserWindow } from 'electron';
import axios from 'axios';
import { generateHardwareId } from './hardwareId.js';
import licenseManager from './licenseManager.js';
import path from 'path';
import fs from 'fs';
import { getDb } from './database.js';

// Use your local server URL for development
const API_URL = 'http://localhost:5002/api';

export function setupLicenseHandlers() {

    // Activate license with PIN
    ipcMain.handle('license:activateWithPin', async (event, licenseKey, adminPin) => {
        try {
            const hardwareId = await generateHardwareId();

            const response = await axios.post(`${API_URL}/license/activate-with-pin`, {
                license_key: licenseKey,
                admin_pin: adminPin,
                hardware_id: hardwareId,
                shop_name: 'POS System',
                app_version: process.env.npm_package_version || '1.0.0',
                timestamp: Date.now()
            }, {
                timeout: 30000,
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.data.success) {
                const licenseData = {
                    license_key: licenseKey,
                    admin_pin: adminPin,
                    hardware_id: hardwareId,
                    expiry_date: response.data.expiry_date,
                    plan_type: response.data.plan_type,
                    activated_at: new Date().toISOString(),
                    shop: response.data.shop
                };

                const saved = licenseManager.saveLicense(licenseData);
                console.log("License saved locally:", saved);

                return {
                    success: true,
                    expiry_date: response.data.expiry_date,
                    plan_type: response.data.plan_type,
                    shop: response.data.shop,
                    message: 'License activated successfully'
                };
            } else {
                return {
                    success: false,
                    message: response.data.message || 'Activation failed'
                };
            }
        } catch (error) {
            console.error('Activation error:', error.message);
            return {
                success: false,
                message: 'Network error. Please check your internet connection.'
            };
        }
    });

    // Activate license (legacy - without PIN)
    ipcMain.handle('license:activate', async (event, licenseKey, shopName) => {
        try {
            const hardwareId = await generateHardwareId();

            const response = await axios.post(`${API_URL}/license/activate`, {
                license_key: licenseKey,
                hardware_id: hardwareId,
                shop_name: shopName,
                app_version: process.env.npm_package_version || '1.0.0',
                timestamp: Date.now()
            }, {
                timeout: 30000,
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.data.success) {
                const licenseData = {
                    license_key: licenseKey,
                    hardware_id: hardwareId,
                    expiry_date: response.data.expiry_date,
                    plan_type: response.data.plan_type,
                    activated_at: new Date().toISOString(),
                    shop: response.data.shop
                };

                const saved = licenseManager.saveLicense(licenseData);
                console.log("License saved locally:", saved);

                return {
                    success: true,
                    expiry_date: response.data.expiry_date,
                    plan_type: response.data.plan_type,
                    shop: response.data.shop,
                    message: 'License activated successfully'
                };
            } else {
                return {
                    success: false,
                    message: response.data.message || 'Activation failed'
                };
            }
        } catch (error) {
            console.error('Activation error:', error.message);
            return {
                success: false,
                message: 'Network error. Please check your internet connection.'
            };
        }
    });

    // Add handler to get shop data from license
    ipcMain.handle('license:getShop', async () => {
        const licenseData = licenseManager.loadLicense();
        if (licenseData && licenseData.shop) {
            return { success: true, shop: licenseData.shop };
        }
        return { success: false, message: 'No shop data found' };
    });

    // Check license status
    ipcMain.handle('license:check', async () => {
        const licenseData = licenseManager.loadLicense();

        if (!licenseData) {
            console.log("No license data found");
            return { success: false, message: 'No license found' };
        }

        const isValid = licenseManager.isLicenseValid(licenseData);

        if (!isValid) {
            return { success: false, message: 'License has expired or system clock tampered' };
        }

        return {
            success: true,
            expiry_date: licenseData.expiry_date,
            plan_type: licenseData.plan_type,
            offline_mode: true
        };
    });

    // Clear license
    ipcMain.handle('license:clear', async () => {
        licenseManager.clearLicense();
        return { success: true };
    });

    // Force redirect to activation
    ipcMain.handle('license:forceRedirect', async (event) => {
        const windows = BrowserWindow.getAllWindows();
        windows.forEach(window => {
            if (!window.isDestroyed()) {
                window.close();
            }
        });

        const { createActivationWindow } = await import('./main.js');
        createActivationWindow();

        return { success: true };
    });

    // Database management handlers
    ipcMain.handle('db:getInfo', async () => {
        try {
            const db = getDb();
            const dbPath = db.name;
            const stats = fs.statSync(dbPath);

            let lastBackup = null;
            const backupInfoPath = path.join(path.dirname(dbPath), 'backup_info.json');
            if (fs.existsSync(backupInfoPath)) {
                const info = JSON.parse(fs.readFileSync(backupInfoPath, 'utf8'));
                lastBackup = info.lastBackup;
            }

            return {
                success: true,
                size: (stats.size / (1024 * 1024)).toFixed(2) + ' MB',
                lastBackup: lastBackup
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('db:export', async () => {
        try {
            const userDataPath = app.getPath('userData');
            const sourcePath = path.join(userDataPath, 'pos.db');
            
            if (!fs.existsSync(sourcePath)) {
                return { success: false, error: 'Database file not found' };
            }
            
            const fileData = fs.readFileSync(sourcePath);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const fileName = `pos_backup_${timestamp}.db`;
            
            return { 
                success: true, 
                data: Array.from(fileData),
                fileName: fileName 
            };
        } catch (error) {
            console.error("Export error:", error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('db:import', async (event, fileData) => {
        try {
            const userDataPath = app.getPath('userData');
            const targetPath = path.join(userDataPath, 'pos.db');
            const backupPath = targetPath + '.backup';
            
            if (fs.existsSync(targetPath)) {
                fs.copyFileSync(targetPath, backupPath);
            }
            
            try {
                const db = getDb();
                db.close();
            } catch (err) {
                console.log("No open database connection to close:", err.message);
            }
            
            const buffer = Buffer.from(fileData);
            fs.writeFileSync(targetPath, buffer);
            
            const { initDatabase } = await import('./database.js');
            initDatabase(targetPath);
            
            return { success: true, message: 'Database imported successfully' };
        } catch (error) {
            console.error("Import error:", error);
            return { success: false, error: error.message };
        }
    });
}