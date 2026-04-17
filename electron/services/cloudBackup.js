// electron/cloudBackup.js
import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import axios from 'axios';

const BACKUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

class CloudBackup {
    constructor() {
        this.isEnabled = false;
        this.backupUrl = null;
        this.apiKey = null;
    }

    async initialize() {
        try {
            // Load backup settings from config
            const configPath = path.join(app.getPath('userData'), 'backup_config.json');
            
            if (fs.existsSync(configPath)) {
                const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                this.isEnabled = config.enabled || false;
                this.backupUrl = config.backupUrl;
                this.apiKey = config.apiKey;
                
                console.log('Cloud backup initialized:', this.isEnabled);
                return true;
            }
            
            console.log('No backup config found');
            return false;
        } catch (error) {
            console.error('Failed to initialize cloud backup:', error);
            return false;
        }
    }

    async uploadDatabase() {
        if (!this.isEnabled || !this.backupUrl) {
            console.log('Cloud backup not enabled');
            return { success: false, error: 'Backup not enabled' };
        }

        try {
            const dbPath = path.join(app.getPath('userData'), 'pos.db');
            
            if (!fs.existsSync(dbPath)) {
                throw new Error('Database file not found');
            }

            const fileData = fs.readFileSync(dbPath);
            const fileName = `pos_backup_${new Date().toISOString().split('T')[0]}.db`;
            
            // Create form data
            const formData = new FormData();
            formData.append('file', new Blob([fileData]), fileName);
            formData.append('timestamp', new Date().toISOString());
            
            // Upload to your cloud storage API
            const response = await axios.post(this.backupUrl, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'X-API-Key': this.apiKey
                },
                timeout: 30000
            });
            
            console.log('Database uploaded successfully:', fileName);
            return { success: true, fileName, response: response.data };
            
        } catch (error) {
            console.error('Upload failed:', error.message);
            return { success: false, error: error.message };
        }
    }

    async saveConfig(config) {
        try {
            const configPath = path.join(app.getPath('userData'), 'backup_config.json');
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
            this.isEnabled = config.enabled;
            this.backupUrl = config.backupUrl;
            this.apiKey = config.apiKey;
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    getConfig() {
        return {
            enabled: this.isEnabled,
            backupUrl: this.backupUrl,
            hasApiKey: !!this.apiKey
        };
    }

    startAutoBackup() {
        if (!this.isEnabled) {
            console.log('Auto backup not started - feature disabled');
            return;
        }
        
        // Run initial backup
        setTimeout(() => this.uploadDatabase(), 5000); // Wait 5 seconds after app starts
        
        // Schedule periodic backups
        setInterval(() => {
            this.uploadDatabase();
        }, BACKUP_INTERVAL);
        
        console.log(`Auto backup scheduled every ${BACKUP_INTERVAL / (1000 * 60 * 60)} hours`);
    }
}

export const cloudBackup = new CloudBackup();