import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { app } from 'electron';

// Use a fixed encryption key - store it securely
// Generate once and keep it constant
const ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'; // 64 chars = 32 bytes
const IV_LENGTH = 16;

class LicenseManager {
    constructor() {
        const userDataPath = app.getPath('userData');
        this.licensePath = path.join(userDataPath, 'license.enc');
        this.lastCheckPath = path.join(userDataPath, 'last_check.enc');
    }

    // Encrypt data
    encrypt(text) {
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
        let encrypted = cipher.update(text);
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        return iv.toString('hex') + ':' + encrypted.toString('hex');
    }

    // Decrypt data
    decrypt(text) {
        try {
            const textParts = text.split(':');
            const iv = Buffer.from(textParts.shift(), 'hex');
            const encryptedText = Buffer.from(textParts.join(':'), 'hex');
            const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
            let decrypted = decipher.update(encryptedText);
            decrypted = Buffer.concat([decrypted, decipher.final()]);
            return decrypted.toString();
        } catch (error) {
            console.error('Decryption error, file may be corrupted');
            throw error;
        }
    }

    // Save license
    saveLicense(licenseData) {
        try {
            const encrypted = this.encrypt(JSON.stringify(licenseData));
            fs.writeFileSync(this.licensePath, encrypted);

            // Also save last check timestamp
            const checkData = {
                last_check: Date.now(),
                total_uptime: 0
            };
            const encryptedCheck = this.encrypt(JSON.stringify(checkData));
            fs.writeFileSync(this.lastCheckPath, encryptedCheck);

            return true;
        } catch (error) {
            console.error('Error saving license:', error);
            return false;
        }
    }

    // Load license
    loadLicense() {
        try {
            if (fs.existsSync(this.licensePath)) {
                const encrypted = fs.readFileSync(this.licensePath, 'utf8');
                try {
                    const decrypted = this.decrypt(encrypted);
                    return JSON.parse(decrypted);
                } catch (decryptError) {
                    console.error('Corrupted license file detected, deleting...');
                    this.clearLicense();
                    return null;
                }
            }
            return null;
        } catch (error) {
            console.error('Error loading license:', error);
            return null;
        }
    }

    // Check for clock tampering
    detectClockTampering() {
        try {
            if (fs.existsSync(this.lastCheckPath)) {
                const encrypted = fs.readFileSync(this.lastCheckPath, 'utf8');
                try {
                    const decrypted = this.decrypt(encrypted);
                    const lastCheck = JSON.parse(decrypted);

                    const now = Date.now();
                    const timeDiff = now - lastCheck.last_check;

                    // If time went backwards (user changed system date)
                    if (timeDiff < 0) {
                        console.warn('Clock tampering detected! Time went backwards.');
                        return { tampered: true, message: 'System clock tampering detected' };
                    }

                    // Update last check time
                    lastCheck.last_check = now;
                    const encryptedCheck = this.encrypt(JSON.stringify(lastCheck));
                    fs.writeFileSync(this.lastCheckPath, encryptedCheck);

                    return { tampered: false };
                } catch (error) {
                    console.error('Error reading last check file, recreating...');
                    const checkData = {
                        last_check: Date.now(),
                        total_uptime: 0
                    };
                    const encryptedCheck = this.encrypt(JSON.stringify(checkData));
                    fs.writeFileSync(this.lastCheckPath, encryptedCheck);
                    return { tampered: false };
                }
            }
            return { tampered: false };
        } catch (error) {
            console.error('Error checking clock tampering:', error);
            return { tampered: false };
        }
    }

    // Check if license is valid (offline)
    // In licenseManager.js - update isLicenseValid method
    // In licenseManager.js - update isLicenseValid method
isLicenseValid(licenseData) {
    if (!licenseData) return false;
    
    // Check for clock tampering
    const tamperCheck = this.detectClockTampering();
    if (tamperCheck.tampered) {
        return false;
    }
    
    const now = new Date();
    const expiryDate = new Date(licenseData.expiry_date);
    
    // Calculate time difference in seconds
    const timeLeftMs = expiryDate.getTime() - now.getTime();
    const timeLeftSeconds = Math.floor(timeLeftMs / 1000);
    const isExpired = timeLeftMs < 0;
    
    // Grace period: 30 seconds for testing
    const gracePeriodSeconds = 30;
    const expiredForSeconds = Math.abs(timeLeftSeconds);
    const isGracePeriod = isExpired && expiredForSeconds <= gracePeriodSeconds;
    
    console.log(`License check - Expired: ${isExpired}, Time left: ${timeLeftSeconds}s, Grace period: ${isGracePeriod}`);
    
    if (isExpired && !isGracePeriod) {
        return false; // Definitely expired (beyond grace period)
    }
    
    // Allow access during grace period or before expiry
    return true;
}

    // Clear license
    clearLicense() {
        try {
            if (fs.existsSync(this.licensePath)) {
                fs.unlinkSync(this.licensePath);
            }
            if (fs.existsSync(this.lastCheckPath)) {
                fs.unlinkSync(this.lastCheckPath);
            }
            return true;
        } catch (error) {
            console.error('Error clearing license:', error);
            return false;
        }
    }
}

export default new LicenseManager();