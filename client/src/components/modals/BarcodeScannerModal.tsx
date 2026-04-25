import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QrCode, Keyboard, Loader2 } from "lucide-react";
import BarcodeScanner from "react-qr-barcode-scanner";
import { useToast } from "@/hooks/use-toast";
import { api } from "../../services/electron-api";

interface BarcodeScannerModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onProductFound: (product: any) => void;
}

export function BarcodeScannerModal({ open, onOpenChange, onProductFound }: BarcodeScannerModalProps) {
    const [scannedCode, setScannedCode] = useState<string | null>(null);
    const [manualBarcode, setManualBarcode] = useState('');
    const [isScanning, setIsScanning] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const { toast } = useToast();

    // Auto-add product when barcode is scanned
    useEffect(() => {
        if (scannedCode && !isProcessing) {
            handleAddProduct(scannedCode);
        }
    }, [scannedCode]);

    const handleAddProduct = async (barcode: string) => {
        setIsProcessing(true);
        try {
            const result = await api.getProducts();
            let products = [];
            if (Array.isArray(result)) products = result;
            else if (result?.success && Array.isArray(result.data)) products = result.data;

            const product = products.find(p => p.barcode === barcode);

            if (product) {
                onProductFound(product);
                toast({ 
                    title: "Product Added", 
                    description: product.name,
                    duration: 1500
                });
                // Clear for next scan
                setScannedCode(null);
                setManualBarcode('');
                // Keep modal open for multiple scans
                // onOpenChange(false); // Uncomment if you want to close after each scan
            } else {
                toast({
                    title: "Not Found",
                    description: `No product found with barcode ${barcode}`,
                    variant: "destructive",
                });
                setScannedCode(null);
            }
        } catch (err: any) {
            toast({
                title: "Error",
                description: err.message,
                variant: "destructive",
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!manualBarcode.trim()) {
            toast({ title: "Error", description: "Please enter a barcode", variant: "destructive" });
            return;
        }
        await handleAddProduct(manualBarcode);
        setManualBarcode('');
    };

    const handleScan = (result: any) => {
        if (result?.text && !isProcessing) {
            setScannedCode(result.text);
            setManualBarcode(result.text);
        }
    };

    const handleError = (err: any) => {
        console.error("Scanner Error:", err);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Scan or Enter Barcode</DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4">
                    {/* Toggle between Camera and Manual */}
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant={isScanning ? "default" : "outline"}
                            onClick={() => setIsScanning(true)}
                            className="flex-1"
                        >
                            <QrCode className="h-4 w-4 mr-2" />
                            Scan Camera
                        </Button>
                        <Button
                            type="button"
                            variant={!isScanning ? "default" : "outline"}
                            onClick={() => setIsScanning(false)}
                            className="flex-1"
                        >
                            <Keyboard className="h-4 w-4 mr-2" />
                            Enter Manually
                        </Button>
                    </div>

                    {/* Camera Scanner */}
                    {isScanning && (
                        <div className="w-full h-64 bg-black rounded-md overflow-hidden">
                            <BarcodeScanner
                                onUpdate={(err, result) => {
                                    if (result) handleScan(result);
                                    if (err) handleError(err);
                                }}
                                onError={handleError}
                            />
                        </div>
                    )}

                    {/* Manual Input */}
                    {!isScanning && (
                        <form onSubmit={handleManualSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Barcode Number</label>
                                <Input
                                    type="text"
                                    placeholder="Enter barcode number..."
                                    value={manualBarcode}
                                    onChange={(e) => setManualBarcode(e.target.value)}
                                    autoFocus
                                    className="font-mono text-lg"
                                />
                                <p className="text-xs text-muted-foreground mt-2">
                                    Enter the barcode number and press Enter or click Add
                                </p>
                            </div>
                            <Button type="submit" className="w-full" disabled={isProcessing}>
                                {isProcessing ? "Adding..." : "Add to Cart"}
                            </Button>
                        </form>
                    )}

                    {/* Status indicator */}
                    {isProcessing && (
                        <div className="flex items-center justify-center gap-2 text-primary">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-sm">Adding product to cart...</span>
                        </div>
                    )}

                    {/* Instructions */}
                    <div className="text-xs text-muted-foreground text-center border-t pt-3">
                        {isScanning ? (
                            <p>📷 Position barcode in front of camera. Product will be added automatically.</p>
                        ) : (
                            <p>⌨️ Enter barcode and press Enter. Product will be added to cart.</p>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}