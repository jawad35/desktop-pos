// electron/google-drive-service.js
import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class GoogleDriveService {
  constructor() {
    this.drive = null;
    this.tokens = null;
    this.oauth2Client = null;
  }

  // Load saved tokens
  loadTokens() {
    try {
      const tokensPath = path.join(__dirname, 'google-drive-tokens.json');
      if (fs.existsSync(tokensPath)) {
        this.tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf8'));
        console.log('✅ Tokens loaded from file');
        return true;
      }
    } catch (error) {
      console.error('Error loading tokens:', error);
    }
    return false;
  }

  // Initialize OAuth2 client
  initOAuth2Client() {
    const credentials = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'credentials.json'), 'utf8')
    );
    
    const { client_secret, client_id, redirect_uris } = credentials.installed;
    
    this.oauth2Client = new google.auth.OAuth2(
      client_id,
      client_secret,
      redirect_uris[0]
    );
    
    if (this.tokens) {
      this.oauth2Client.setCredentials(this.tokens);
    }
    
    this.drive = google.drive({ version: 'v3', auth: this.oauth2Client });
  }

  // Refresh access token if expired
  async refreshTokenIfNeeded() {
    if (!this.oauth2Client) return;
    
    const now = Date.now();
    if (this.tokens && this.tokens.expiry_date && now >= this.tokens.expiry_date - 5 * 60 * 1000) {
      console.log('Token expired, refreshing...');
      try {
        const { credentials } = await this.oauth2Client.refreshAccessToken();
        this.oauth2Client.setCredentials(credentials);
        this.tokens = credentials;
        // Save updated tokens
        fs.writeFileSync(
          path.join(__dirname, 'google-drive-tokens.json'),
          JSON.stringify(credentials, null, 2)
        );
        console.log('✅ Token refreshed');
      } catch (error) {
        console.error('Error refreshing token:', error);
      }
    }
  }

  // List files in Google Drive
  async listFiles(pageSize = 10) {
    await this.refreshTokenIfNeeded();
    
    try {
      const response = await this.drive.files.list({
        pageSize: pageSize,
        fields: 'nextPageToken, files(id, name, mimeType, size, createdTime, modifiedTime)',
        orderBy: 'modifiedTime desc'
      });
      
      return response.data.files;
    } catch (error) {
      console.error('Error listing files:', error);
      throw error;
    }
  }

  // Upload a file to Google Drive
  async uploadFile(filePath, fileName, mimeType) {
    await this.refreshTokenIfNeeded();
    
    const fileMetadata = {
      name: fileName || path.basename(filePath),
      parents: ['root'] // Upload to root folder
    };
    
    const media = {
      mimeType: mimeType || 'application/octet-stream',
      body: fs.createReadStream(filePath)
    };
    
    try {
      const response = await this.drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id, name, size, webViewLink'
      });
      
      console.log(`✅ File uploaded: ${response.data.name} (ID: ${response.data.id})`);
      return response.data;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  // Download a file from Google Drive
  async downloadFile(fileId, destinationPath) {
    await this.refreshTokenIfNeeded();
    
    try {
      const response = await this.drive.files.get(
        { fileId, alt: 'media' },
        { responseType: 'stream' }
      );
      
      const dest = fs.createWriteStream(destinationPath);
      
      return new Promise((resolve, reject) => {
        response.data
          .on('end', () => {
            console.log(`✅ File downloaded to ${destinationPath}`);
            resolve(destinationPath);
          })
          .on('error', reject)
          .pipe(dest);
      });
    } catch (error) {
      console.error('Error downloading file:', error);
      throw error;
    }
  }

  // Create a folder
  async createFolder(folderName, parentFolderId = 'root') {
    await this.refreshTokenIfNeeded();
    
    const fileMetadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId]
    };
    
    try {
      const response = await this.drive.files.create({
        resource: fileMetadata,
        fields: 'id, name, webViewLink'
      });
      
      console.log(`✅ Folder created: ${response.data.name} (ID: ${response.data.id})`);
      return response.data;
    } catch (error) {
      console.error('Error creating folder:', error);
      throw error;
    }
  }

  // Delete a file or folder
  async deleteFile(fileId) {
    await this.refreshTokenIfNeeded();
    
    try {
      await this.drive.files.delete({ fileId });
      console.log(`✅ File/Folder deleted (ID: ${fileId})`);
      return true;
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }

  // Search files by name
  async searchFiles(query, pageSize = 20) {
    await this.refreshTokenIfNeeded();
    
    try {
      const response = await this.drive.files.list({
        q: `name contains '${query}'`,
        pageSize: pageSize,
        fields: 'files(id, name, mimeType, size, modifiedTime)'
      });
      
      return response.data.files;
    } catch (error) {
      console.error('Error searching files:', error);
      throw error;
    }
  }

  // Get file metadata
  async getFileMetadata(fileId) {
    await this.refreshTokenIfNeeded();
    
    try {
      const response = await this.drive.files.get({
        fileId: fileId,
        fields: 'id, name, mimeType, size, createdTime, modifiedTime, webViewLink, webContentLink'
      });
      
      return response.data;
    } catch (error) {
      console.error('Error getting file metadata:', error);
      throw error;
    }
  }
}

export default GoogleDriveService;