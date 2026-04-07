"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { api } from "../services/electron-api";
import { Download, Upload, Database, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function SettingsPage() {
    const [tax, setTax] = useState("0");
    const [discount, setDiscount] = useState("0");
    const [loading, setLoading] = useState(false);
    const [importing, setImporting] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [dbInfo, setDbInfo] = useState<{ size: string; path: string; lastBackup: string | null } | null>(null);
    const { toast } = useToast();

    // Fetch current settings using Electron API
    useEffect(() => {
        fetchSettings();
        fetchDbInfo();
    }, []);

    const fetchSettings = async () => {
        try {
            const result = await api.getSettings();
            if (result) {
                setTax(result.tax?.toString() || "0");
                setDiscount(result.discount?.toString() || "0");
            }
        } catch (error) {
            console.error("Failed to fetch settings:", error);
            toast({ title: "Error", description: "Failed to load settings", variant: "destructive" });
        }
    };

    const fetchDbInfo = async () => {
        try {
            const result = await api.getDataLocation();
            if (result.success) {
                // Get file size
                const sizeResult = await window.electronAPI.getDatabaseInfo();
                setDbInfo({
                    size: sizeResult?.size || "Unknown",
                    path: result.location,
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
            const result = await window.electronAPI.importDatabase(file.path);
            if (result.success) {
                toast({ 
                    title: "Import Successful", 
                    description: "Database imported successfully. The app will now restart.",
                    variant: "default"
                });
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({ title: "Import Failed", description: error.message, variant: "destructive" });
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

    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
        return (bytes / (1024 * 1024)).toFixed(2) + " MB";
    };

    return (
        <div className="container mx-auto p-4 md:p-6 max-w-4xl">
            <h1 className="text-2xl md:text-3xl font-bold mb-6">Settings</h1>
            
            <Tabs defaultValue="general" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-6">
                    <TabsTrigger value="general">General</TabsTrigger>
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
                        <Card>
                            <CardHeader>
                                <CardTitle>Quick Backup</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <p className="text-sm text-muted-foreground">
                                    Create an immediate backup of your database to your documents folder.
                                </p>
                                <Button onClick={handleBackupNow} variant="outline">
                                    <Database className="h-4 w-4 mr-2" />
                                    Backup Now
                                </Button>
                                
                                {dbInfo?.lastBackup && (
                                    <p className="text-xs text-muted-foreground mt-2">
                                        Last backup: {new Date(dbInfo.lastBackup).toLocaleString()}
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}