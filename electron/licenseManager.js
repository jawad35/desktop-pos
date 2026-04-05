import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { app } from 'electron';

const ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex'); // Store this securely
const IV_LENGTH = 16;

class LicenseManager {
    constructor() {
        const userDataPath = app.getPath('userData');
        this.licensePath = path.join(userDataPath, 'license.enc');
    }

    encrypt(text) {
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
        let encrypted = cipher.update(text);
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        return iv.toString('hex') + ':' + encrypted.toString('hex');
    }

    decrypt(text) {
        const textParts = text.split(':');
        const iv = Buffer.from(textParts.shift(), 'hex');
        const encryptedText = Buffer.from(textParts.join(':'), 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    }

    saveLicense(licenseData) {
        try {
            const encrypted = this.encrypt(JSON.stringify(licenseData));
            fs.writeFileSync(this.licensePath, encrypted);
            return true;
        } catch (error) {
            console.error('Error saving license:', error);
            return false;
        }
    }

    loadLicense() {
        try {
            if (fs.existsSync(this.licensePath)) {
                const encrypted = fs.readFileSync(this.licensePath, 'utf8');
                const decrypted = this.decrypt(encrypted);
                return JSON.parse(decrypted);
            }
            return null;
        } catch (error) {
            console.error('Error loading license:', error);
            return null;
        }
    }

    isLicenseValid(licenseData) {
        if (!licenseData) return false;
        
        const now = new Date();
        const expiryDate = new Date(licenseData.expiry_date);
        
        // Check if license is expired
        if (expiryDate < now) {
            return false;
        }
        
        return true;
    }

    clearLicense() {
        try {
            if (fs.existsSync(this.licensePath)) {
                fs.unlinkSync(this.licensePath);
            }
            return true;
        } catch (error) {
            console.error('Error clearing license:', error);
            return false;
        }
    }
}

export default new LicenseManager();