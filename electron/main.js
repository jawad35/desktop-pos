import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron';
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

// Setup logging
const logFile = path.join(app.getPath('userData'), 'app.log');

function writeLog(message, type = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `${timestamp} [${type}] ${message}\n`;
    
    // Console output
    console.log(logMessage);
    
    // File output
    try {
        fs.appendFileSync(logFile, logMessage);
    } catch (err) {
        console.error('Failed to write to log file:', err);
    }
}

function showErrorDialog(title, message) {
    dialog.showErrorBox(title, message);
    writeLog(`${title}: ${message}`, 'ERROR');
}

// Global error handlers
process.on('uncaughtException', (error) => {
    writeLog(`UNCAUGHT EXCEPTION: ${error.stack || error.message}`, 'ERROR');
    showErrorDialog('Application Error', error.message);
});

process.on('unhandledRejection', (reason) => {
    writeLog(`UNHANDLED REJECTION: ${reason}`, 'ERROR');
});

// Log system info
writeLog('=== APPLICATION START ===');
writeLog(`Node version: ${process.version}`);
writeLog(`Electron version: ${process.versions.electron}`);
writeLog(`Platform: ${process.platform}`);
writeLog(`Arch: ${process.arch}`);
writeLog(`App path: ${app.getAppPath()}`);
writeLog(`User data path: ${app.getPath('userData')}`);

// Initialize database
function initializeDatabase() {
    try {
        const userDataPath = app.getPath('userData');
        const dbPath = path.join(userDataPath, 'pos.db');

        writeLog(`Database path: ${dbPath}`);

        // Create directory if it doesn't exist
        const dbDir = path.dirname(dbPath);
        if (!fs.existsSync(dbDir)) {
            writeLog(`Creating database directory: ${dbDir}`);
            fs.mkdirSync(dbDir, { recursive: true });
        }

        // Initialize with full schema
        db = initDatabase(dbPath);
        writeLog('Database initialized successfully');
        return db;
    } catch (error) {
        writeLog(`Database initialization failed: ${error.stack || error.message}`, 'ERROR');
        showErrorDialog('Database Error', error.message);
        throw error;
    }
}

// Create main application window
function createWindow() {
    try {
        writeLog('Creating main window...');
        
        if (activationWindow && !activationWindow.isDestroyed()) {
            writeLog('Closing activation window');
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
        writeLog(`Looking for index.html at: ${indexPath}`);
        
        if (fs.existsSync(indexPath)) {
            writeLog('Loading index.html from file system');
            mainWindow.loadFile(indexPath);
        } else {
            writeLog('Index.html not found, falling back to dev server', 'WARN');
            mainWindow.loadURL('http://localhost:5173');
        }

        if (!app.isPackaged) {
            writeLog('Opening DevTools (development mode)');
            mainWindow.webContents.openDevTools();
        }
        
        mainWindow.on('closed', () => {
            writeLog('Main window closed');
            mainWindow = null;
        });
        
        mainWindow.on('ready-to-show', () => {
            writeLog('Main window ready to show');
        });
        
        writeLog('Main window created successfully');
    } catch (error) {
        writeLog(`Failed to create main window: ${error.stack || error.message}`, 'ERROR');
        showErrorDialog('Window Error', error.message);
    }
}

// Create activation window
export function createActivationWindow() {
    try {
        writeLog('Creating activation window...');
        
        if (mainWindow && !mainWindow.isDestroyed()) {
            writeLog('Closing main window');
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
        writeLog(`Loading activation window from: ${indexPath}`);
        
        if (fs.existsSync(indexPath)) {
            activationWindow.loadFile(indexPath);
            // Navigate to activation route after load
            activationWindow.webContents.on('did-finish-load', () => {
                writeLog('Activation window loaded, sending navigate event');
                activationWindow.webContents.send('navigate-to', '/activation');
            });
        } else {
            writeLog('Index.html not found, using dev server', 'WARN');
            activationWindow.loadURL('http://localhost:5173/activation');
        }
        
        activationWindow.on('closed', () => {
            writeLog('Activation window closed');
            activationWindow = null;
        });
        
        activationWindow.on('ready-to-show', () => {
            writeLog('Activation window ready to show');
        });
        
        writeLog('Activation window created successfully');
    } catch (error) {
        writeLog(`Failed to create activation window: ${error.stack || error.message}`, 'ERROR');
        showErrorDialog('Window Error', error.message);
    }
}

// App lifecycle
app.whenReady().then(() => {
    try {
        writeLog('App ready event fired');
        
        writeLog('Initializing database...');
        initializeDatabase();
        
        writeLog('Setting up IPC handlers...');
        setupIpcHandlers();
        
        writeLog('Setting up license handlers...');
        setupLicenseHandlers();
        
        // Check license on startup
        writeLog('Checking license...');
        const licenseData = licenseManager.loadLicense();
        writeLog(`License data loaded: ${licenseData ? 'Yes' : 'No'}`);
        
        if (licenseData) {
            const isValid = licenseManager.isLicenseValid(licenseData);
            writeLog(`License valid: ${isValid}`);
            if (!isValid) {
                writeLog('License invalid or expired');
            }
        }
        
        if (!licenseData || !licenseManager.isLicenseValid(licenseData)) {
            writeLog('No valid license found, showing activation window');
            createActivationWindow();
        } else {
            writeLog('Valid license found, showing main window');
            createWindow();
        }
        
        writeLog('App initialization complete');
    } catch (error) {
        writeLog(`App initialization failed: ${error.stack || error.message}`, 'ERROR');
        showErrorDialog('Initialization Error', error.message);
    }
}).catch((error) => {
    writeLog(`App ready promise rejected: ${error.stack || error.message}`, 'ERROR');
    showErrorDialog('Startup Error', error.message);
});

app.on('window-all-closed', () => {
    writeLog('All windows closed');
    if (process.platform !== 'darwin') {
        writeLog('Quitting app');
        if (db) db.close();
        app.quit();
    }
});

app.on('activate', () => {
    writeLog('App activated');
    if (BrowserWindow.getAllWindows().length === 0) {
        const licenseData = licenseManager.loadLicense();
        if (!licenseData || !licenseManager.isLicenseValid(licenseData)) {
            writeLog('No valid license, showing activation window');
            createActivationWindow();
        } else {
            writeLog('Valid license found, showing main window');
            createWindow();
        }
    }
});

// Log when app is about to quit
app.on('will-quit', () => {
    writeLog('App will quit');
});

app.on('quit', () => {
    writeLog('App quit');
});

writeLog('Main process loaded');