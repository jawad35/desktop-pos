import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { initDatabase, getDb } from './database.js';
import { setupIpcHandlers } from './ipcHandlers.js';
import { setupLicenseHandlers } from './licenseHandler.js';
import licenseManager from './licenseManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let activationWindow;
let db;

// Initialize database
function initializeDatabase() {
    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, 'pos.db');

    console.log('📁 Database path:', dbPath);

    // Create directory if it doesn't exist
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }

    // Initialize with full schema
    db = initDatabase(dbPath);
    return db;
}

// Create main application window
function createWindow() {
    if (activationWindow && !activationWindow.isDestroyed()) {
        activationWindow.close();
    }
    
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    // Load your React app
    const indexPath = path.join(__dirname, '../client/dist/index.html');
    if (fs.existsSync(indexPath)) {
        mainWindow.loadFile(indexPath);
    } else {
        console.error('Index.html not found at:', indexPath);
        mainWindow.loadURL('http://localhost:5173'); // For development
    }

    if (!app.isPackaged) {
        mainWindow.webContents.openDevTools();
    }
}

// Create activation window
export function createActivationWindow() {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.close();
        mainWindow = null;
    }
    
    activationWindow = new BrowserWindow({
        width: 550,
        height: 650,
        resizable: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });
    
    const indexPath = path.join(__dirname, '../client/dist/index.html');
    if (fs.existsSync(indexPath)) {
        activationWindow.loadFile(indexPath);
    } else {
        activationWindow.loadURL('http://localhost:5173/activation');
    }
}

// App lifecycle
app.whenReady().then(() => {
    initializeDatabase();
    setupIpcHandlers();
    setupLicenseHandlers(); // Add this line
    
    // Check license on startup
    const licenseData = licenseManager.loadLicense();
    
    if (!licenseData || !licenseManager.isLicenseValid(licenseData)) {
        createActivationWindow();
    } else {
        createWindow();
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        if (db) db.close();
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        const licenseData = licenseManager.loadLicense();
        if (!licenseData || !licenseManager.isLicenseValid(licenseData)) {
            createActivationWindow();
        } else {
            createWindow();
        }
    }
});