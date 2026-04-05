import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { initDatabase, getDb } from './database.js';
import { setupIpcHandlers } from './ipcHandlers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
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

// Create window
function createWindow() {
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

// App lifecycle
app.whenReady().then(() => {
    initializeDatabase();
    setupIpcHandlers(); // Now using the separate ipcHandlers.js file
    createWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        if (db) db.close();
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});