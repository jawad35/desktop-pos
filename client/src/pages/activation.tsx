import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, AlertCircle, Shield, Key, Lock } from 'lucide-react';

interface ActivationProps {
    onActivated: () => void;
}

export default function ActivationScreen({ onActivated }: ActivationProps) {
    const [licenseKey, setLicenseKey] = useState('');
    const [adminPin, setAdminPin] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const { toast } = useToast();

    const handleActivate = async () => {
        if (!licenseKey.trim()) {
            setError('Please enter your license key');
            return;
        }

        if (!adminPin.trim()) {
            setError('Please enter your admin PIN');
            return;
        }

        if (adminPin.length < 4) {
            setError('Admin PIN must be at least 4 digits');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const result = await window.electronAPI.activateLicenseWithPin(licenseKey, adminPin);

            if (result.success) {
                // Save the admin PIN locally
                const defaultPinExists = await window.electronAPI.verifyAdminPin('1234');
                if (defaultPinExists.success) {
                    await window.electronAPI.updateAdminPin('1234', adminPin);
                } else {
                    await window.electronAPI.updateAdminPin(adminPin, adminPin);
                }
                
                console.log('Admin PIN saved successfully');

                toast({
                    title: "Activation Successful! 🎉",
                    description: `Your license is valid until ${new Date(result.expiry_date).toLocaleDateString()}`,
                });

                window.location.reload();
            } else {
                setError(result.message || 'Activation failed');
                toast({
                    title: "Activation Failed",
                    description: result.message,
                    variant: "destructive",
                });
            }
        } catch (err: any) {
            console.error("Activation error:", err);
            setError(err.message || 'Network error. Please check your internet connection.');
            toast({
                title: "Error",
                description: err.message,
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5">
            <Card className="w-full max-w-md mx-4 shadow-xl">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
                        <Shield className="h-10 w-10 text-primary" />
                    </div>
                    <CardTitle className="text-2xl">Activate Your License</CardTitle>
                    <p className="text-sm text-muted-foreground mt-2">
                        Enter your license key and admin PIN to activate the software
                    </p>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* License Key Input */}
                    <div>
                        <label className="block text-sm font-medium mb-2">
                            License Key
                        </label>
                        <div className="relative">
                            <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder="Enter license key"
                                value={licenseKey}
                                onChange={(e) => {
                                    setLicenseKey(e.target.value.toUpperCase());
                                    setError('');
                                }}
                                className="pl-10 text-center font-mono text-lg tracking-wider"
                                disabled={isLoading}
                            />
                        </div>
                    </div>

                    {/* Admin PIN Input */}
                    <div>
                        <label className="block text-sm font-medium mb-2">
                            Admin PIN
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="password"
                                placeholder="Enter admin PIN"
                                value={adminPin}
                                onChange={(e) => {
                                    setAdminPin(e.target.value);
                                    setError('');
                                }}
                                className="pl-10 text-center font-mono text-lg tracking-wider"
                                maxLength={6}
                                disabled={isLoading}
                            />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            PIN provided by your POS administrator (4-6 digits)
                        </p>
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 mt-2 text-destructive text-sm">
                            <AlertCircle className="h-4 w-4" />
                            <span>{error}</span>
                        </div>
                    )}

                    <Button
                        onClick={handleActivate}
                        disabled={isLoading || !licenseKey.trim() || !adminPin.trim()}
                        className="w-full"
                        size="lg"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Activating...
                            </>
                        ) : (
                            <>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Activate License
                            </>
                        )}
                    </Button>

                    <div className="text-center text-xs text-muted-foreground border-t pt-4 mt-4">
                        <p>Internet connection required for activation</p>
                        <p className="mt-1">After activation, the software works completely offline</p>
                        <p className="mt-2 text-primary">Contact your POS administrator if you don't have a license key or PIN</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}