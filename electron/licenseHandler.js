import { ipcMain,app } from 'electron';
import axios from 'axios';
import { generateHardwareId } from './hardwareId.js';
import licenseManager from './licenseManager.js';
import path from 'path';
import fs from 'fs';
import { getDb } from './database.js';
// Use your local server URL for development
const API_URL = 'http://localhost:5002/api';  // Changed from 3000 to 5002

export function setupLicenseHandlers() {

    // Activate license
    // In electron/licenseHandler.js - update activation handler
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

            // In licenseHandler.js, after successful activation
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
    // In licenseHandler.js, add debug to checkLicense handler
    ipcMain.handle('license:check', async () => {
        // console.log("🔍 [DEBUG] license:check called");
        const licenseData = licenseManager.loadLicense();
        // console.log("🔍 [DEBUG] Loaded license data:", licenseData);

        if (!licenseData) {
            console.log("🔍 [DEBUG] No license data found");
            return { success: false, message: 'No license found' };
        }

        const isValid = licenseManager.isLicenseValid(licenseData);
        // console.log("🔍 [DEBUG] License valid:", isValid);

        if (!isValid) {
            // console.log("🔍 [DEBUG] License invalid or expired");
            return { success: false, message: 'License has expired or system clock tampered' };
        }

        // console.log("🔍 [DEBUG] License is valid, returning success");
        return {
            success: true,
            expiry_date: licenseData.expiry_date,
            plan_type: licenseData.plan_type,
            offline_mode: true
        };
    });

    // Add this handler
    ipcMain.handle('license:clear', async () => {
        licenseManager.clearLicense();
        return { success: true };
    });

    // In licenseHandler.js
    ipcMain.handle('license:forceRedirect', async (event) => {
        const windows = BrowserWindow.getAllWindows();
        windows.forEach(window => {
            if (!window.isDestroyed()) {
                window.close();
            }
        });

        // Create activation window
        const { createActivationWindow } = await import('./main.js');
        createActivationWindow();

        return { success: true };
    });

    // Database management handlers
    ipcMain.handle('db:getInfo', async () => {
        try {
            const db = getDb();
            const dbPath = db.name; // Get database file path
            const stats = fs.statSync(dbPath);

            // Check for last backup (you can store this in a separate file or settings)
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
        
        console.log("🔍 [IPC] Exporting database from:", sourcePath);
        
        if (!fs.existsSync(sourcePath)) {
            return { success: false, error: 'Database file not found' };
        }
        
        const fileData = fs.readFileSync(sourcePath);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `pos_backup_${timestamp}.db`;
        
        console.log("🔍 [IPC] Export successful, size:", fileData.length);
        
        return { 
            success: true, 
            data: Array.from(fileData), // Convert to array for IPC transfer
            fileName: fileName 
        };
    } catch (error) {
        console.error("🔍 [IPC] Export error:", error);
        return { success: false, error: error.message };
    }
});

   ipcMain.handle('db:import', async (event, fileData) => {
    console.log("🔍 [IPC] db:import called with data length:", fileData?.length);
    
    try {
        const userDataPath = app.getPath('userData');
        const targetPath = path.join(userDataPath, 'pos.db');
        const backupPath = targetPath + '.backup';
        
        console.log("🔍 [IPC] Target path:", targetPath);
        console.log("🔍 [IPC] Backup path:", backupPath);
        
        // Create backup of current database
        if (fs.existsSync(targetPath)) {
            console.log("🔍 [IPC] Creating backup...");
            fs.copyFileSync(targetPath, backupPath);
            console.log("🔍 [IPC] Backup created");
        }
        
        // Close current database connection
        try {
            const db = getDb();
            db.close();
            console.log("🔍 [IPC] Database connection closed");
        } catch (err) {
            console.log("🔍 [IPC] No open database connection to close:", err.message);
        }
        
        // Write the new database file
        console.log("🔍 [IPC] Writing new database file...");
        const buffer = Buffer.from(fileData);
        fs.writeFileSync(targetPath, buffer);
        console.log("🔍 [IPC] Database file written, size:", buffer.length);
        
        // Reinitialize database connection
        console.log("🔍 [IPC] Reinitializing database...");
        const { initDatabase } = await import('./database.js');
        initDatabase(targetPath);
        console.log("🔍 [IPC] Database reinitialized");
        
        return { success: true, message: 'Database imported successfully' };
    } catch (error) {
        console.error("🔍 [IPC] Import error:", error);
        return { success: false, error: error.message };
    }
});
}