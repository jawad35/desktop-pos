"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { api } from "../services/electron-api";
import { Download, Upload, Database, AlertCircle, CheckCircle, Loader2, Shield, KeyRound, Eye, EyeOff, Save, RefreshCw, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { queryClient } from "../lib/queryClient";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Trash2 } from "lucide-react";

// Define all available tabs for operator access
const OPERATOR_TABS = [
    { name: "Dashboard", href: "/", adminOnly: false },
    { name: "POS Terminal", href: "/pos", adminOnly: false },
    { name: "Sales", href: "/sales", adminOnly: false },
    { name: "Returns", href: "/returns", adminOnly: false },
    { name: "Profile", href: "/profile", adminOnly: false },
    { name: "Products", href: "/products", adminOnly: true },
    { name: "Purchases", href: "/purchases", adminOnly: true },
    { name: "Suppliers", href: "/suppliers", adminOnly: true },
    { name: "Categories", href: "/categories", adminOnly: true },
    { name: "Expenses", href: "/expenses", adminOnly: true },
    { name: "Employees", href: "/employees", adminOnly: true },
    { name: "Net Profit", href: "/net-profit", adminOnly: true },
    // { name: "Damaged Stock", href: "/damaged", adminOnly: true },
    { name: "Settings", href: "/settings", adminOnly: true },
    { name: "User Guide", href: "/user-guide", adminOnly: true },
    { name: "Terms Polices", href: "/terms-policies", adminOnly: true },
];

const ADMIN_ONLY_TABS = [
    // { name: "Products", href: "/products" },
    // { name: "Purchases", href: "/purchases" },
    // { name: "Suppliers", href: "/suppliers" },
    // { name: "Categories", href: "/categories" },
    // { name: "Expenses", href: "/expenses" },
    // { name: "Employees", href: "/employees" },
    // { name: "Damaged Stock", href: "/damaged" },
    // { name: "License Management", href: "/license" },
    // { name: "Database", href: "/database" },
    // { name: "Settings", href: "/settings" },
];

export default function SettingsPage() {
    const [tax, setTax] = useState("0");
    const [discount, setDiscount] = useState("0");
    const [loading, setLoading] = useState(false);
    const [importing, setImporting] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [dbInfo, setDbInfo] = useState<{ size: string; path: string; lastBackup: string | null } | null>(null);
    // Add this to your SettingsPage component
    const [googleDriveToken, setGoogleDriveToken] = useState('');
    const [isBackupEnabled, setIsBackupEnabled] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    // Add this state to your SettingsPage component
    const [driveStorage, setDriveStorage] = useState(null);
    const [isLoadingStorage, setIsLoadingStorage] = useState(false);
    console.log(driveStorage, 'jj9')
    const [isWipeModalOpen, setIsWipeModalOpen] = useState(false);
    const [wipeConfirmText, setWipeConfirmText] = useState("");
    const [isWiping, setIsWiping] = useState(false);
    // Add this function

    const handleWipeDatabase = async () => {
        if (wipeConfirmText !== "WIPE ALL DATA") {
            toast({
                title: "Confirmation Required",
                description: "Please type 'WIPE ALL DATA' to confirm",
                variant: "destructive"
            });
            return;
        }

        setIsWiping(true);
        try {
            const result = await window.electronAPI.wipeDatabase?.();
            if (result?.success) {
                toast({
                    title: "Database Wiped",
                    description: "All data has been cleared. App will restart...",
                    variant: "destructive"
                });
                setTimeout(async () => {
                    await window.electronAPI.restartApp();
                }, 1500);
            } else {
                throw new Error(result?.error || "Failed to wipe database");
            }
        } catch (error: any) {
            toast({
                title: "Wipe Failed",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setIsWiping(false);
            setIsWipeModalOpen(false);
            setWipeConfirmText("");
        }
    };
    const fetchDriveStorage = async () => {
        setIsLoadingStorage(true);
        try {
            const result = await window.electronAPI.getGoogleDriveStorage?.();
            if (result?.success) {
                setDriveStorage(result.data);
            } else if (result?.needsReauth) {
                toast({
                    title: "Connection Expired",
                    description: "Please reconnect Google Drive",
                    variant: "destructive"
                });
            }
        } catch (error) {
            console.error('Failed to fetch storage:', error);
        } finally {
            setIsLoadingStorage(false);
        }
    };

    // Call this when Google Drive is connected
    useEffect(() => {
        if (googleDriveToken) {
            fetchDriveStorage();
            // Refresh storage info every 5 minutes
            const interval = setInterval(fetchDriveStorage, 5 * 60 * 1000);
            return () => clearInterval(interval);
        }
    }, [googleDriveToken]);

    // Add this function to handle Google Drive connection
    // Add this useEffect to set up the token listener once when component mounts
    // Update your token listener to save connection state
    useEffect(() => {
        // Listen for Google token from main process
        if (window.electronAPI && window.electronAPI.onGoogleToken) {
            window.electronAPI.onGoogleToken((token) => {
                console.log('Received token in React:', token);
                setGoogleDriveToken(token);
                localStorage.setItem('google_drive_token', token);
                localStorage.setItem('google_drive_connected', 'true');
                setIsConnecting(false);
                toast({ title: "Success", description: "Google Drive connected!" });
            });
        }

        // Load saved token from localStorage
        const savedToken = localStorage.getItem('google_drive_token');
        const wasConnected = localStorage.getItem('google_drive_connected');

        if (savedToken && wasConnected === 'true') {
            setGoogleDriveToken(savedToken);
            // Optionally re-enable auto backup if it was on
            const savedAutoBackup = localStorage.getItem('auto_backup_enabled');
            if (savedAutoBackup === 'true') {
                setAutoBackupEnabled(true);
            }
        }
    }, []);

    // Add this state near your other state declarations
    const [lastLocalBackup, setLastLocalBackup] = useState<string | null>(null);

    // Add this useEffect for local auto backup (every 12 hours)
    useEffect(() => {
        if (!dbInfo?.path) return;

        console.log('Starting local auto backup every 12 hours');

        // Function to perform local backup
        const performLocalBackup = async () => {
            try {
                console.log('🔄 Running local auto backup at:', new Date().toLocaleTimeString());
                const result = await window.electronAPI.backupData(); // Use existing backup function
                if (result?.success) {
                    console.log('✅ Local auto backup successful');
                    setLastLocalBackup(new Date().toISOString());
                    localStorage.setItem('last_local_backup', new Date().toISOString());
                    toast({
                        title: "Local Auto Backup",
                        description: `Database backed up at ${new Date().toLocaleTimeString()}`,
                        duration: 2000
                    });
                } else {
                    console.error('❌ Local auto backup failed:', result?.error);
                }
            } catch (error) {
                console.error('Local backup error:', error);
            }
        };

        // Run immediately once when component mounts
        performLocalBackup();

        // Set interval for 12 hours (43,200,000 ms)
        const intervalId = setInterval(performLocalBackup, 12 * 60 * 60 * 1000);

        // Load last backup time from localStorage
        const savedLastBackup = localStorage.getItem('last_local_backup');
        if (savedLastBackup) {
            setLastLocalBackup(savedLastBackup);
        }

        return () => {
            console.log('Stopping local auto backup');
            clearInterval(intervalId);
        };
    }, [dbInfo?.path]);

    // Update connectGoogleDrive function - remove the listener from here
    const connectGoogleDrive = async () => {
        setIsConnecting(true);
        try {
            // Start the OAuth server in the main process
            await window.electronAPI.connectGoogleDrive();

            // Set timeout for connection (5 minutes)
            setTimeout(() => {
                setIsConnecting(prev => {
                    if (prev) {
                        toast({ title: "Timeout", description: "Connection timed out", variant: "destructive" });
                        return false;
                    }
                    return prev;
                });
            }, 300000);
        } catch (error) {
            console.error('Connection error:', error);
            toast({ title: "Error", description: error.message, variant: "destructive" });
            setIsConnecting(false);
        }
    };
    // Sidebar Settings States
    // Initialize with default values
    const [visibleTabs, setVisibleTabs] = useState<string[]>([
        "Dashboard", "POS Terminal", "Sales", "Returns", "Profile"
    ]);
    const [isSavingSidebar, setIsSavingSidebar] = useState(false);

    // PIN Reset States
    const [isPinResetModalOpen, setIsPinResetModalOpen] = useState(false);
    const [currentPin, setCurrentPin] = useState("");
    const [newPin, setNewPin] = useState("");
    const [confirmPin, setConfirmPin] = useState("");
    const [isResettingPin, setIsResettingPin] = useState(false);

    const { toast } = useToast();
    const [, setLocation] = useLocation();

    // Fetch current settings using Electron API
    useEffect(() => {
        fetchSettings();
        fetchDbInfo();
        fetchSidebarSettings();
    }, []);


    // Add this state
    const [autoBackupEnabled, setAutoBackupEnabled] = useState(false);

    // Add this useEffect to load saved setting on component mount
    useEffect(() => {
        // Load auto backup setting from localStorage
        const savedAutoBackup = localStorage.getItem('auto_backup_enabled');
        if (savedAutoBackup === 'true') {
            setAutoBackupEnabled(true);
        }
    }, []);
    // Add this function
    const performAutoBackup = async () => {
        if (!dbInfo?.path) {
            console.log('Auto backup skipped: No database path');
            return;
        }

        try {
            console.log('🔄 Running auto backup at:', new Date().toLocaleTimeString());
            const result = await window.electronAPI.uploadToGoogleDrive?.({
                accessToken: googleDriveToken,
                dbPath: dbInfo?.path
            });

            if (result?.success) {
                console.log('✅ Auto backup successful:', result.name);
                localStorage.setItem('last_auto_backup', new Date().toISOString());
                toast({
                    title: "Auto Backup",
                    description: `Backed up at ${new Date().toLocaleTimeString()}`,
                    duration: 2000
                });
            } else if (result?.needsReauth) {
                console.log('Token expired, need to reconnect');
                // Clear stored tokens
                localStorage.removeItem('google_drive_token');
                localStorage.removeItem('google_drive_connected');
                setGoogleDriveToken('');
                setAutoBackupEnabled(false);
                toast({
                    title: "Connection Expired",
                    description: "Please reconnect to Google Drive",
                    variant: "destructive"
                });
            } else {
                console.error('❌ Auto backup failed:', result?.error);
            }
        } catch (error) {
            console.error('Auto backup error:', error);
        }
    };

    // REPLACE your existing auto backup useEffect with this:

    // Auto backup every 12 hours when Google Drive is connected
    useEffect(() => {
        if (!googleDriveToken || !dbInfo?.path) return;

        console.log('Starting auto backup every 12 hours');

        // Run immediately once when connected
        performAutoBackup();

        // Set interval for 12 hours (43,200,000 ms)
        const intervalId = setInterval(performAutoBackup, 12 * 60 * 60 * 1000); // 12 hours

        return () => {
            console.log('Stopping auto backup');
            clearInterval(intervalId);
        };
    }, [googleDriveToken, dbInfo?.path]);

    const fetchSettings = async () => {
        try {
            const result = await api.getSettings();
            console.log('Settings API result:', result);

            let settingsData = { tax: 0, discount: 0 };

            if (result && result.success && result.data) {
                settingsData = result.data;
            } else if (result && result.data) {
                settingsData = result.data;
            } else if (result && result.tax !== undefined) {
                settingsData = result;
            }

            console.log('Parsed settings:', settingsData);

            setTax(settingsData.tax?.toString() || "0");
            setDiscount(settingsData.discount?.toString() || "0");
        } catch (error) {
            console.error("Failed to fetch settings:", error);
            toast({ title: "Error", description: "Failed to load settings", variant: "destructive" });
        }
    };

    const fetchSidebarSettings = async () => {
        try {
            const result = await api.getSettings();
            // The visible_tabs is inside result.data, not directly on result
            if (result.success && result.data) {
                // result.data contains tax, discount, visible_tabs
                const visibleTabsFromSettings = result.data.visible_tabs || [];
                setVisibleTabs(visibleTabsFromSettings);
            }
        } catch (error) {
            console.error("Failed to fetch sidebar settings:", error);
            // Set default tabs on error
            setVisibleTabs(["Dashboard", "POS Terminal", "Sales", "Returns", "Profile"]);
        }
    };

    const fetchDbInfo = async () => {
        try {
            const result = await api.getDataLocation();
            if (result.success) {
                // Get the database file path (not the directory)
                const dbFilePath = result.dbFile || path.join(result.location, 'pos.db');
                const sizeResult = await window.electronAPI.getDatabaseInfo();
                setDbInfo({
                    size: sizeResult?.size || "Unknown",
                    path: dbFilePath,  // This should be the full file path, not directory
                    lastBackup: sizeResult?.lastBackup || null
                });
            }
        } catch (error) {
            console.error("Failed to fetch DB info:", error);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const result = await api.updateSettings({
                tax: parseFloat(tax),
                discount: parseFloat(discount)
            });

            if (result.success) {
                toast({ title: "Success", description: "Settings updated successfully!" });
            } else {
                throw new Error(result.error || "Failed to update settings");
            }
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };
    const handleSaveSidebarSettings = async () => {
        setIsSavingSidebar(true);
        try {
            // Update only the visible_tabs field
            const result = await api.updateSettings({
                visible_tabs: visibleTabs
            });
            if (result.success) {
                toast({ title: "Success", description: "Sidebar access settings updated successfully!" });
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setIsSavingSidebar(false);
        }
    };

    const handleToggleTab = (tabName: string) => {
        setVisibleTabs(prev =>
            prev?.includes(tabName)
                ? prev.filter(t => t !== tabName)
                : [...prev, tabName]
        );
    };

    const handleSelectAll = () => {
        setVisibleTabs(OPERATOR_TABS.map(tab => tab.name));
    };

    const handleDeselectAll = () => {
        setVisibleTabs([]);
    };

    // Handle PIN Reset
    const handleResetPin = async () => {
        if (!currentPin || !newPin || !confirmPin) {
            toast({ title: "Error", description: "Please fill all fields", variant: "destructive" });
            return;
        }

        if (newPin !== confirmPin) {
            toast({ title: "Error", description: "New PINs do not match", variant: "destructive" });
            return;
        }

        if (newPin.length < 4) {
            toast({ title: "Error", description: "PIN must be at least 4 digits", variant: "destructive" });
            return;
        }

        setIsResettingPin(true);

        try {
            const verifyResult = await window.electronAPI.verifyAdminPin(currentPin);

            if (!verifyResult.success) {
                toast({ title: "Error", description: "Current PIN is incorrect", variant: "destructive" });
                setIsResettingPin(false);
                return;
            }

            const updateResult = await window.electronAPI.updateAdminPin(currentPin, newPin);

            if (updateResult.success) {
                toast({
                    title: "PIN Reset Successful",
                    description: "Your admin PIN has been updated. Please use the new PIN next time you switch to admin mode."
                });

                setCurrentPin("");
                setNewPin("");
                setConfirmPin("");
                setIsPinResetModalOpen(false);
            } else {
                throw new Error(updateResult.error || "Failed to update PIN");
            }
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setIsResettingPin(false);
        }
    };

    const handleExportDatabase = async () => {
        setExporting(true);
        try {
            const result = await window.electronAPI.exportDatabase();
            if (result.success) {
                toast({
                    title: "Export Successful",
                    description: `Database exported to: ${result.path}`
                });
                fetchDbInfo();
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({ title: "Export Failed", description: error.message, variant: "destructive" });
        } finally {
            setExporting(false);
        }
    };

    const handleImportDatabase = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];

        if (!file) return;

        if (!confirm("WARNING: Importing a database will REPLACE all current data. This cannot be undone. Continue?")) {
            event.target.value = "";
            return;
        }

        setImporting(true);

        try {
            const arrayBuffer = await file.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);
            const result = await window.electronAPI.importDatabase(uint8Array);

            if (result.success) {
                toast({ title: "Import Successful", description: "App will restart..." });
                setTimeout(async () => {
                    await window.electronAPI.restartApp();
                }, 1500);
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({
                title: "Import Failed",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setImporting(false);
            event.target.value = "";
        }
    };

    const handleBackupNow = async () => {
        try {
            const result = await window.electronAPI.backupData();
            if (result.success) {
                toast({ title: "Backup Created", description: result.message });
                fetchDbInfo();
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({ title: "Backup Failed", description: error.message, variant: "destructive" });
        }
    };

    const handleOpenDataFolder = () => {
        window.electronAPI.openDataFolder();
    };

    return (
        <div className="container mx-auto p-4 md:p-6 max-w-4xl">
            <h1 className="text-2xl md:text-3xl font-bold mb-6">Settings</h1>

            <Tabs defaultValue="general" className="w-full">
                <TabsList className="grid w-full grid-cols-5 mb-6">
                    <TabsTrigger value="general">General</TabsTrigger>
                    <TabsTrigger value="sidebar">Sidebar Access</TabsTrigger>
                    <TabsTrigger value="security">Security</TabsTrigger>
                    <TabsTrigger value="database">Database</TabsTrigger>
                    <TabsTrigger value="backup">Backup & Restore</TabsTrigger>
                </TabsList>

                {/* General Settings Tab */}
                <TabsContent value="general">
                    <Card>
                        <CardHeader>
                            <CardTitle>POS Settings</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Tax (%)</label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={tax}
                                    onChange={(e) => setTax(e.target.value)}
                                    className="max-w-xs"
                                />
                                <p className="text-xs text-muted-foreground mt-1">Default tax rate applied to all sales</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Discount (%)</label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={discount}
                                    onChange={(e) => setDiscount(e.target.value)}
                                    className="max-w-xs"
                                />
                                <p className="text-xs text-muted-foreground mt-1">Default discount rate applied to all sales</p>
                            </div>
                            <Button onClick={handleSave} disabled={loading}>
                                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                                {loading ? "Saving..." : "Save Settings"}
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Sidebar Access Tab - NEW */}
                <TabsContent value="sidebar">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                <span>Operator Sidebar Access</span>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={handleSelectAll}>
                                        Select All
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={handleDeselectAll}>
                                        Deselect All
                                    </Button>
                                </div>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-200">
                                <p className="text-sm text-blue-800 dark:text-blue-400">
                                    Select which tabs operators can see in the sidebar.
                                </p>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold">Operator Accessible Tabs</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {OPERATOR_TABS?.map((tab) => (
                                        <div
                                            key={tab.name}
                                            className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${visibleTabs?.includes(tab.name)
                                                ? 'border-primary bg-primary/5'
                                                : 'border-border hover:bg-muted/50'
                                                }`}
                                            onClick={() => handleToggleTab(tab.name)}
                                        >
                                            <div className="flex items-center gap-2">
                                                {visibleTabs?.includes(tab.name) ? (
                                                    <Eye className="h-4 w-4 text-primary" />
                                                ) : (
                                                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                                                )}
                                                <span className="text-sm font-medium">{tab.name}</span>
                                            </div>
                                            <div className={`w-4 h-4 rounded border ${visibleTabs?.includes(tab.name)
                                                ? 'bg-primary border-primary'
                                                : 'border-muted-foreground'
                                                }`}>
                                                {visibleTabs?.includes(tab.name) && (
                                                    <svg className="w-3 h-3 text-white m-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-muted/30 rounded-lg p-4">
                                {/* <h3 className="text-sm font-semibold mb-2">Admin-Only Tabs (Always Visible)</h3> */}
                                <div className="flex flex-wrap gap-2">
                                    {ADMIN_ONLY_TABS.map((tab) => (
                                        <span key={tab.name} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                                            {tab.name}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <Button onClick={handleSaveSidebarSettings} disabled={isSavingSidebar} className="w-full">
                                {isSavingSidebar ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save className="h-4 w-4 mr-2" />
                                        Save Sidebar Settings
                                    </>
                                )}
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Security Tab - Reset PIN */}
                <TabsContent value="security">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Shield className="h-5 w-5" />
                                Admin PIN Security
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-200">
                                <div className="flex items-start gap-3">
                                    <KeyRound className="h-5 w-5 text-blue-600 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-medium text-blue-800 dark:text-blue-400">
                                            Reset Admin PIN
                                        </p>
                                        <p className="text-sm text-blue-700 dark:text-blue-500 mt-1">
                                            You can reset your admin PIN here. You'll need your current PIN to set a new one.
                                            This PIN is used to switch from Operator to Admin mode.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <Button
                                onClick={() => setIsPinResetModalOpen(true)}
                                variant="outline"
                                className="w-full sm:w-auto"
                            >
                                <KeyRound className="h-4 w-4 mr-2" />
                                Reset Admin PIN
                            </Button>

                            <Alert>
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                    Keep your admin PIN secure. If you forget your PIN, you will need to contact your system administrator to reset it.
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Database Info Tab */}
                {/* Database Info Tab */}
                <TabsContent value="database">
                    <Card>
                        <CardHeader>
                            <CardTitle>Database Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                                <div className="flex items-center gap-2">
                                    <Database className="h-5 w-5 text-primary" />
                                    <span className="font-medium">Database Location:</span>
                                </div>
                                <code className="text-sm bg-background p-2 rounded block break-all">
                                    {dbInfo?.path || "Loading..."}
                                </code>

                                {dbInfo?.size && (
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="font-medium">Size:</span>
                                        <span>{dbInfo.size}</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3">
                                <Button onClick={handleOpenDataFolder} variant="outline">
                                    Open Data Folder
                                </Button>
                                <Button onClick={fetchDbInfo} variant="ghost">
                                    Refresh Info
                                </Button>
                                <Button
                                    onClick={() => setIsWipeModalOpen(true)}
                                    variant="destructive"
                                    className="ml-auto"
                                >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Wipe Database
                                </Button>
                            </div>

                            <Alert>
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                    Your database is stored locally on this computer. Regular backups are recommended.
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>
                </TabsContent>
                {/* Wipe Database Confirmation Modal */}
                <Dialog open={isWipeModalOpen} onOpenChange={setIsWipeModalOpen}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-red-600">
                                <AlertTriangle className="h-5 w-5" />
                                Wipe Entire Database
                            </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 rounded-lg p-4">
                                <p className="text-sm text-red-800 dark:text-red-400 font-medium">
                                    ⚠️ DANGER: This action is irreversible!
                                </p>
                                <p className="text-sm text-red-700 dark:text-red-500 mt-2">
                                    This will delete ALL data including:
                                </p>
                                <ul className="text-xs text-red-600 dark:text-red-400 mt-2 space-y-1 list-disc list-inside">
                                    <li>All products and categories</li>
                                    <li>All sales and purchase records</li>
                                    <li>All customers and suppliers</li>
                                    <li>All employees and settings</li>
                                    <li>All expenses and profit records</li>
                                </ul>
                            </div>

                            <div>
                                <Label htmlFor="confirmWipe" className="text-sm font-medium">
                                    Type <span className="font-bold text-red-600">"WIPE ALL DATA"</span> to confirm
                                </Label>
                                <Input
                                    id="confirmWipe"
                                    type="text"
                                    placeholder="WIPE ALL DATA"
                                    value={wipeConfirmText}
                                    onChange={(e) => setWipeConfirmText(e.target.value)}
                                    className="mt-2"
                                />
                            </div>
                        </div>
                        <DialogFooter className="flex gap-2">
                            <Button variant="outline" onClick={() => {
                                setIsWipeModalOpen(false);
                                setWipeConfirmText("");
                            }}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleWipeDatabase}
                                disabled={isWiping || wipeConfirmText !== "WIPE ALL DATA"}
                                variant="destructive"
                            >
                                {isWiping ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Wiping...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Wipe All Data
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Backup & Restore Tab */}
                <TabsContent value="backup">
                    <div className="space-y-6">
                        {/* Export Card */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Download className="h-5 w-5" />
                                    Export Database
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <p className="text-sm text-muted-foreground">
                                    Export your entire database to a file. You can use this file to backup your data or transfer to another computer.
                                </p>
                                <Button
                                    onClick={handleExportDatabase}
                                    disabled={exporting}
                                    variant="secondary"
                                >
                                    {exporting ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Exporting...
                                        </>
                                    ) : (
                                        <>
                                            <Download className="h-4 w-4 mr-2" />
                                            Export Database
                                        </>
                                    )}
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Import Card */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Upload className="h-5 w-5" />
                                    Import Database
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                                    <div className="flex items-start gap-2">
                                        <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
                                        <div className="text-sm">
                                            <p className="font-medium text-yellow-800 dark:text-yellow-400">Warning!</p>
                                            <p className="text-yellow-700 dark:text-yellow-500 mt-1">
                                                Importing a database will REPLACE all your current data. This action cannot be undone.
                                                Only import a database file that was exported from this application.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <Input
                                        type="file"
                                        accept=".db,.sqlite,.sqlite3"
                                        onChange={handleImportDatabase}
                                        disabled={importing}
                                        className="cursor-pointer"
                                    />
                                    <p className="text-xs text-muted-foreground mt-2">
                                        Select a previously exported database file (.db)
                                    </p>
                                </div>

                                {importing && (
                                    <div className="flex items-center gap-2 text-primary">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span>Importing database, please wait...</span>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Quick Backup Card */}
                       {/* Quick Backup Card - Updated */}
<Card>
    <CardHeader>
        <CardTitle>Quick Backup</CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
            Create an immediate backup of your database to your documents folder.
            Auto backup runs every 12 hours automatically.
        </p>
        <Button onClick={handleBackupNow} variant="outline">
            <Database className="h-4 w-4 mr-2" />
            Backup Now
        </Button>

        {lastLocalBackup && (
            <p className="text-xs text-muted-foreground mt-2">
                Last auto backup: {new Date(lastLocalBackup).toLocaleString()}
            </p>
        )}
        
        {dbInfo?.lastBackup && (
            <p className="text-xs text-muted-foreground">
                Last manual backup: {new Date(dbInfo.lastBackup).toLocaleString()}
            </p>
        )}
        
        <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-lg mt-2">
            <p className="text-xs text-green-700 dark:text-green-400 flex items-center gap-2">
                <CheckCircle className="h-3 w-3" />
                Auto backup runs every 12 hours automatically. No action needed.
            </p>
        </div>
    </CardContent>
</Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Google Drive Backup</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {!googleDriveToken ? (
                                    <div className="space-y-4">
                                        <p className="text-sm text-muted-foreground">
                                            Connect your Google Drive to automatically backup your database every 12 hours.
                                        </p>
                                        <Button onClick={connectGoogleDrive} disabled={isConnecting}>
                                            {isConnecting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                                            Connect Google Drive
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg">
                                            <p className="text-green-600 dark:text-green-400">✅ Connected to Google Drive</p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Your database will be backed up automatically every 12 hours
                                            </p>
                                        </div>

                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                onClick={async () => {
                                                    const result = await window.electronAPI.uploadToGoogleDrive?.({
                                                        accessToken: googleDriveToken,
                                                        dbPath: dbInfo?.path
                                                    });
                                                    if (result?.success) {
                                                        toast({ title: "Success", description: "Backup uploaded to Google Drive!" });
                                                    } else {
                                                        toast({ title: "Error", description: "Upload failed", variant: "destructive" });
                                                    }
                                                }}
                                            >
                                                Backup Now
                                            </Button>
                                            <Button variant="outline" onClick={() => {
                                                setGoogleDriveToken('');
                                                localStorage.removeItem('google_drive_token');
                                                localStorage.removeItem('google_drive_connected');
                                                toast({ title: "Disconnected", description: "Google Drive disconnected" });
                                            }}>
                                                Disconnect
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {googleDriveToken && driveStorage && (
                            <div className="mt-4 p-4 bg-muted/30 rounded-lg">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-sm font-semibold">Google Drive Storage</h4>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={fetchDriveStorage}
                                        disabled={isLoadingStorage}
                                    >
                                        <RefreshCw className={`h-3 w-3 ${isLoadingStorage ? 'animate-spin' : ''}`} />
                                    </Button>
                                </div>

                                {/* Storage Bar */}
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs">
                                        <span>Used: {driveStorage.usedGB} GB</span>
                                        <span>Free: {driveStorage.remainingGB} GB</span>
                                        <span>Total: {driveStorage.totalGB} GB</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                                        <div
                                            className={`h-2.5 rounded-full transition-all ${driveStorage.usagePercent > 90 ? 'bg-red-600' :
                                                driveStorage.usagePercent > 70 ? 'bg-yellow-500' : 'bg-green-600'
                                                }`}
                                            style={{ width: `${driveStorage.usagePercent}%` }}
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground text-center">
                                        {driveStorage.usagePercent}% used ({driveStorage.usedGB} GB of {driveStorage.totalGB} GB)
                                    </p>

                                    {/* Warning for low space */}
                                    {driveStorage.remainingGB < 5 && (
                                        <div className="bg-red-50 border border-red-200 rounded p-2 mt-2">
                                            <p className="text-xs text-red-600 flex items-center gap-1">
                                                <AlertTriangle className="h-3 w-3" />
                                                Low storage space! Only {driveStorage.remainingGB} GB remaining.
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Backup file list - optional */}
                                {/* <div className="mt-3">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full text-xs"
                                        onClick={async () => {
                                            const result = await window.electronAPI.listGoogleDriveBackups?.();
                                            if (result?.success) {
                                                // Show backup files list
                                                console.log('Backup files:', result.files);
                                            }
                                        }}
                                    >
                                        View Backup Files
                                    </Button>
                                </div> */}
                            </div>
                        )}
                    </div>
                </TabsContent>
            </Tabs>

            {/* Reset PIN Modal */}
            <Dialog open={isPinResetModalOpen} onOpenChange={setIsPinResetModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Shield className="h-5 w-5 text-primary" />
                            Reset Admin PIN
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <Label htmlFor="currentPin">Current PIN</Label>
                            <Input
                                id="currentPin"
                                type="password"
                                placeholder="Enter current admin PIN"
                                value={currentPin}
                                onChange={(e) => setCurrentPin(e.target.value)}
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <Label htmlFor="newPin">New PIN (4-6 digits)</Label>
                            <Input
                                id="newPin"
                                type="password"
                                placeholder="Enter new PIN"
                                value={newPin}
                                onChange={(e) => setNewPin(e.target.value)}
                                maxLength={6}
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <Label htmlFor="confirmPin">Confirm New PIN</Label>
                            <Input
                                id="confirmPin"
                                type="password"
                                placeholder="Confirm new PIN"
                                value={confirmPin}
                                onChange={(e) => setConfirmPin(e.target.value)}
                                maxLength={6}
                                className="mt-1"
                            />
                        </div>
                    </div>
                    <DialogFooter className="flex gap-2">
                        <Button variant="outline" onClick={() => setIsPinResetModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleResetPin} disabled={isResettingPin}>
                            {isResettingPin ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Resetting...
                                </>
                            ) : (
                                "Reset PIN"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}