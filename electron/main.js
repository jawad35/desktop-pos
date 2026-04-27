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


// Add this function after your imports, before app.whenReady()
import axios from 'axios';

const API_URL = 'https://admin-pod.onrender.com/api'; // Your server URL

async function verifyShopSubscription() {
    try {
        writeLog('🔍 Verifying shop subscription status with server...');

        const licenseData = licenseManager.loadLicense();

        if (!licenseData) {
            writeLog('⚠️ No license found, skipping verification');
            return { isValid: false, reason: 'no_license' };
        }

        const shopId = licenseData.shop?.shopId || licenseData.shop?.id;

        if (!shopId) {
            writeLog('⚠️ No shop ID found in license');
            return { isValid: false, reason: 'no_shop_id' };
        }

        writeLog(`📡 Calling server API to check subscription for shop: ${shopId}`);

        let serverAvailable = true;
        let latestShopData = null;

        try {
            // Use the existing subscription-status endpoint
            const response = await axios.get(`${API_URL}/shops/${shopId}/subscription-status`, {
                timeout: 10000,
                headers: { 'Content-Type': 'application/json' }
            });

            writeLog(`Server response received`);

            // Check if response is successful
            if (response.data && response.data.success === true) {
                latestShopData = response.data.data;
                
                writeLog(`📊 Shop data from server:`);
                writeLog(`   - Name: ${latestShopData.name}`);
                writeLog(`   - Status: ${latestShopData.subscriptionStatus}`);
                writeLog(`   - Shop ID: ${latestShopData.shopId}`);
                writeLog(`   - Permanent License: ${latestShopData.permanentLicense}`);
                writeLog(`   - Expiry Date: ${latestShopData.expiryDate || 'N/A'}`);
                writeLog(`   - Phone No: ${latestShopData.phoneNo || 'N/A'}`);
                writeLog(`   - Terms Accepted: ${latestShopData.termsPoliciesAccepted || false}`);
                writeLog(`   - Is Active: ${latestShopData.isActive}`);
                writeLog(`   - Is Expired: ${latestShopData.isExpired}`);
                writeLog(`   - Is Suspended: ${latestShopData.isSuspended}`);

                // Update local license data with latest shop information
                const updatedLicenseData = {
                    ...licenseData,
                    shop: {
                        ...licenseData.shop,
                        // Update with all fields from server
                        id: latestShopData.id,
                        shopId: latestShopData.shopId,
                        name: latestShopData.name,
                        subscriptionStatus: latestShopData.subscriptionStatus,
                        expiryDate: latestShopData.expiryDate,
                        permanentLicense: latestShopData.permanentLicense,
                        phoneNo: latestShopData.phoneNo || licenseData.shop?.phoneNo,
                        termsPoliciesAccepted: latestShopData.termsPoliciesAccepted !== undefined 
                            ? latestShopData.termsPoliciesAccepted 
                            : licenseData.shop?.termsPoliciesAccepted || false,
                        // Preserve other local fields if not returned by server
                        owner: latestShopData.owner || licenseData.shop?.owner,
                        type: latestShopData.type || licenseData.shop?.type,
                        city: latestShopData.city || licenseData.shop?.city,
                        location: latestShopData.location || licenseData.shop?.location,
                        imageUrl: latestShopData.imageUrl || licenseData.shop?.imageUrl,
                        discount: latestShopData.discount || licenseData.shop?.discount,
                        storageUsed: latestShopData.storageUsed || licenseData.shop?.storageUsed,
                        storageLimit: latestShopData.storageLimit || licenseData.shop?.storageLimit,
                        totalRevenue: latestShopData.totalRevenue || licenseData.shop?.totalRevenue,
                        updatedAt: new Date().toISOString()
                    },
                    lastSyncedAt: new Date().toISOString()
                };

                // Save updated license data locally
                const saveResult = licenseManager.saveLicense(updatedLicenseData);
                
                if (saveResult) {
                    writeLog('✅ Local license data updated with latest server information');
                    writeLog(`   - Phone No: ${updatedLicenseData.shop.phoneNo || 'Not set'}`);
                    writeLog(`   - Terms Accepted: ${updatedLicenseData.shop.termsPoliciesAccepted}`);
                    
                    // Also update the licenseData variable for current use
                    Object.assign(licenseData, updatedLicenseData);
                } else {
                    writeLog('⚠️ Failed to save updated license data locally', 'WARN');
                }

                // Check subscription status
                const subscriptionStatus = latestShopData.subscriptionStatus;
                
                if (subscriptionStatus !== 'active') {
                    writeLog(`❌ Shop subscription is ${subscriptionStatus}.`);
                    
                    return {
                        isValid: false,
                        reason: subscriptionStatus,
                        message: `Your subscription has been ${subscriptionStatus}. Please contact support to reactivate.`,
                        shopData: latestShopData
                    };
                }

                writeLog('✅ Shop subscription is valid and local data is synced');
                return { 
                    isValid: true, 
                    status: subscriptionStatus,
                    shopData: latestShopData,
                    synced: true
                };
            } else {
                writeLog(`⚠️ Server returned unsuccessful response: ${JSON.stringify(response.data)}`, 'WARN');
                serverAvailable = false;
            }

        } catch (apiError) {
            serverAvailable = false;
            writeLog(`⚠️ Server API call failed: ${apiError.message}`, 'WARN');
            if (apiError.response) {
                writeLog(`   - Status: ${apiError.response.status}`, 'WARN');
                writeLog(`   - Data: ${JSON.stringify(apiError.response.data)}`, 'WARN');
            } else if (apiError.request) {
                writeLog(`   - No response received from server`, 'WARN');
            } else {
                writeLog(`   - Error: ${apiError.message}`, 'WARN');
            }
        }

        // If server is unavailable, fall back to local data
        if (!serverAvailable) {
            writeLog('🔄 Server unreachable or returned error, falling back to local license data...');
            
            if (licenseData && licenseManager.isLicenseValid(licenseData)) {
                // Check if local data has expiry date
                const currentLocalShop = licenseData.shop;
                const isExpired = currentLocalShop?.expiryDate && 
                                 new Date(currentLocalShop.expiryDate) < new Date() &&
                                 !currentLocalShop.permanentLicense;
                
                if (isExpired) {
                    writeLog(`⚠️ Local license shows expired on ${new Date(currentLocalShop.expiryDate).toLocaleDateString()}`);
                    return { 
                        isValid: false, 
                        reason: 'expired_local',
                        message: 'Your subscription has expired. Please connect to internet to verify renewal.',
                        shopData: currentLocalShop
                    };
                }
                
                writeLog('✅ Using local license data (server unreachable)');
                writeLog(`   - Local shop name: ${currentLocalShop?.name}`);
                writeLog(`   - Local status: ${currentLocalShop?.subscriptionStatus}`);
                writeLog(`   - Phone No: ${currentLocalShop?.phoneNo || 'Not set'}`);
                writeLog(`   - Terms Accepted: ${currentLocalShop?.termsPoliciesAccepted || false}`);
                writeLog(`   - Last synced: ${licenseData.lastSyncedAt || 'Never'}`);
                
                return { 
                    isValid: true, 
                    status: 'local_fallback',
                    shopData: currentLocalShop,
                    synced: false,
                    serverOffline: true
                };
            } else {
                writeLog('❌ No valid local license found');
                return { 
                    isValid: false, 
                    reason: 'no_valid_local_license',
                    message: 'No valid subscription found locally and server is unreachable.'
                };
            }
        }

        return { isValid: false, reason: 'verification_failed', message: 'Failed to verify subscription' };

    } catch (error) {
        writeLog(`Error verifying subscription: ${error.message}`, 'ERROR');
        writeLog(`Stack trace: ${error.stack}`, 'DEBUG');
        
        // Last resort fallback - check local license
        try {
            const licenseData = licenseManager.loadLicense();
            if (licenseData && licenseManager.isLicenseValid(licenseData)) {
                writeLog('⚠️ Using local license as fallback due to error');
                return { 
                    isValid: true, 
                    status: 'error_fallback',
                    shopData: licenseData.shop,
                    error: error.message
                };
            }
        } catch (fallbackError) {
            writeLog(`Fallback also failed: ${fallbackError.message}`, 'ERROR');
        }
        
        return { isValid: false, reason: 'error', message: error.message };
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
            width: 1400,
            height: 900,
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
app.whenReady().then(async () => {
    try {
        writeLog('App ready event fired');

        writeLog('Initializing database...');
        initializeDatabase();

        writeLog('Setting up IPC handlers...');
        setupIpcHandlers();

        writeLog('Setting up license handlers...');
        setupLicenseHandlers();

        // Check license on startup with server verification
        writeLog('Checking license with server verification...');
        const licenseData = licenseManager.loadLicense();
        writeLog(`License data loaded: ${licenseData ? 'Yes' : 'No'}`);

        let isValidLicense = false;
        let errorMessage = null;

        if (licenseData) {
            // First check local validity
            const localValid = licenseManager.isLicenseValid(licenseData);
            writeLog(`Local license valid: ${localValid}`);

            if (localValid) {
                // Verify with server
                const serverVerification = await verifyShopSubscription();
                isValidLicense = serverVerification.isValid;

                if (!isValidLicense) {
                    errorMessage = serverVerification.message;
                    writeLog(`Server verification failed: ${serverVerification.reason} - ${errorMessage}`);
                }
            } else {
                writeLog('Local license invalid or expired');
                errorMessage = 'Your local license has expired or is invalid. Please activate again.';
                isValidLicense = false;
            }
        }

        // Update the app.whenReady() section
        // Update the app.whenReady() section
        if (!isValidLicense) {
            writeLog('No valid license found, showing activation window');

            // Create activation window first
            createActivationWindow();

            // Only show error dialog if there's a specific message and license exists
            if (errorMessage && licenseData) {
                // Small delay to ensure window is ready
                setTimeout(() => {
                    dialog.showMessageBox(activationWindow, {
                        type: 'error',
                        title: 'Subscription Issue',
                        message: errorMessage,
                        buttons: ['OK', 'Exit']
                    }).then((result) => {
                        if (result.response === 0) { // OK button
                            writeLog('User clicked OK, clearing license and reloading...');
                            licenseManager.clearLicense();
                            // Reload the app
                            app.relaunch();
                            app.exit(0);
                        } else {
                            writeLog('User clicked Exit, closing app...');
                            app.quit();
                        }
                    });
                }, 500);
            }
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
            // Also verify with server when reactivating
            verifyShopSubscription().then(verification => {
                if (verification.isValid) {
                    createWindow();
                } else {
                    createActivationWindow();
                    if (verification.message) {
                        setTimeout(() => {
                            dialog.showErrorBox('Subscription Issue', verification.message);
                            licenseManager.clearLicense();
                        }, 500);
                    }
                }
            }).catch(() => {
                createWindow(); // Fallback to main window if verification fails
            });
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