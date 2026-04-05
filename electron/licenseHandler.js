import { ipcMain } from 'electron';
import axios from 'axios';
import { generateHardwareId } from './hardwareId.js';
import licenseManager from './licenseManager.js';

// Use your local server URL for development
const API_URL = 'http://localhost:5002/api';  // Changed from 3000 to 5002

export function setupLicenseHandlers() {

    // Activate license
    ipcMain.handle('license:activate', async (event, licenseKey, ) => {
        try {
            console.log('Activating license:', licenseKey );

            // Generate hardware ID
            const hardwareId = await generateHardwareId();
            console.log('Hardware ID generated:', hardwareId);

            // Send to server for validation
            const response = await axios.post(`${API_URL}/license/activate`, {
                license_key: licenseKey,
                hardware_id: hardwareId,
                app_version: process.env.npm_package_version || '1.0.0',
                timestamp: Date.now()
            }, {
                timeout: 30000,
                headers: { 'Content-Type': 'application/json' }
            });

            console.log('Server response:', response.data);

            if (response.data.success) {
                // Save license locally
                const licenseData = {
                    license_key: licenseKey,
                    hardware_id: hardwareId,
                    expiry_date: response.data.expiry_date,
                    activated_at: new Date().toISOString(),
                    plan_type: response.data.plan_type,
                    last_verified: Date.now()
                };

                licenseManager.saveLicense(licenseData);

                return {
                    success: true,
                    expiry_date: response.data.expiry_date,
                    plan_type: response.data.plan_type,
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
            if (error.response) {
                console.error('Server response:', error.response.data);
                return {
                    success: false,
                    message: error.response.data?.message || 'Activation failed'
                };
            }
            return {
                success: false,
                message: 'Network error. Please check your internet connection.'
            };
        }
    });

    // Check license status
    ipcMain.handle('license:check', async () => {
        const licenseData = licenseManager.loadLicense();

        if (!licenseData) {
            return { success: false, message: 'No license found' };
        }

        // First check offline
        const isValid = licenseManager.isLicenseValid(licenseData);

        if (!isValid) {
            return { success: false, message: 'License has expired or system clock tampered' };
        }

        // Try online verification if internet available
        try {
            const response = await axios.post(`${API_URL}/license/verify`, {
                license_key: licenseData.license_key,
                hardware_id: licenseData.hardware_id
            }, { timeout: 5000 });

            if (response.data.success) {
                if (response.data.expiry_date !== licenseData.expiry_date) {
                    licenseData.expiry_date = response.data.expiry_date;
                    licenseManager.saveLicense(licenseData);
                }
                return {
                    success: true,
                    expiry_date: licenseData.expiry_date,
                    plan_type: licenseData.plan_type
                };
            } else {
                licenseManager.clearLicense();
                return { success: false, message: response.data.message };
            }
        } catch (error) {
            console.log('Online verification failed, using offline mode');
            return {
                success: true,
                expiry_date: licenseData.expiry_date,
                plan_type: licenseData.plan_type,
                offline_mode: true
            };
        }
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
}