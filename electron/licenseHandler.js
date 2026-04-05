import { ipcMain } from 'electron';
import axios from 'axios';
import { generateHardwareId } from './hardwareId.js';
import licenseManager from './licenseManager.js';

const API_URL = 'https://your-api-domain.com/api'; // Your server URL

export function setupLicenseHandlers() {
    
    // Handle license activation
    ipcMain.handle('license:activate', async (event, licenseKey) => {
        try {
            // Generate hardware ID
            const hardwareId = await generateHardwareId();
            
            // Send activation request to your server
            const response = await axios.post(`${API_URL}/license/activate`, {
                license_key: licenseKey,
                hardware_id: hardwareId,
                app_version: process.env.npm_package_version || '1.0.0'
            }, {
                timeout: 30000 // 30 second timeout
            });
            
            if (response.data.success) {
                // Save license locally
                const licenseData = {
                    license_key: licenseKey,
                    hardware_id: hardwareId,
                    expiry_date: response.data.expiry_date,
                    activated_at: new Date().toISOString(),
                    plan_type: response.data.plan_type
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
            console.error('Activation error:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Network error. Please check your internet connection.'
            };
        }
    });
    
    // Check license status
    ipcMain.handle('license:check', async () => {
        const licenseData = licenseManager.loadLicense();
        
        if (!licenseData) {
            return { success: false, message: 'No license found' };
        }
        
        const isValid = licenseManager.isLicenseValid(licenseData);
        
        if (!isValid) {
            return { success: false, message: 'License has expired' };
        }
        
        return {
            success: true,
            expiry_date: licenseData.expiry_date,
            plan_type: licenseData.plan_type
        };
    });
}