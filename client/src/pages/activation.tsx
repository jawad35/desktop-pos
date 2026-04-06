import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, AlertCircle, Shield } from 'lucide-react';

interface ActivationProps {
    onActivated: () => void;
}

export default function ActivationScreen({ onActivated }: ActivationProps) {
    const [licenseKey, setLicenseKey] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const { toast } = useToast();

  const handleActivate = async () => {
    console.log("🔍 [DEBUG] Activate button clicked");
    console.log("🔍 [DEBUG] License key entered:", licenseKey);
    
    if (!licenseKey.trim()) {
        setError('Please enter your license key');
        return;
    }

    setIsLoading(true);
    setError('');

    try {
        console.log("🔍 [DEBUG] Calling electronAPI.activateLicense...");
        const result = await window.electronAPI.activateLicense(licenseKey);
        console.log("🔍 [DEBUG] Activation result:", result);

        if (result.success) {
            console.log("🔍 [DEBUG] Activation SUCCESS!");
            toast({
                title: "Activation Successful! 🎉",
                description: `Your license is valid until ${new Date(result.expiry_date).toLocaleDateString()}`,
            });
            
            console.log("🔍 [DEBUG] Calling window.location.reload()");
            window.location.reload();
            
        } else {
            console.log("🔍 [DEBUG] Activation FAILED:", result.message);
            setError(result.message || 'Activation failed');
            toast({
                title: "Activation Failed",
                description: result.message,
                variant: "destructive",
            });
        }
    } catch (err: any) {
        console.error("🔍 [DEBUG] Activation error:", err);
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
                        Enter your license key to activate the software
                    </p>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <Input
                            type="text"
                            placeholder="Enter license key"
                            value={licenseKey}
                            onChange={(e) => {
                                setLicenseKey(e.target.value.toUpperCase());
                                setError('');
                            }}
                            className="text-center font-mono text-lg tracking-wider"
                            disabled={isLoading}
                        />
                        {error && (
                            <div className="flex items-center gap-2 mt-2 text-destructive text-sm">
                                <AlertCircle className="h-4 w-4" />
                                <span>{error}</span>
                            </div>
                        )}
                    </div>

                    <Button
                        onClick={handleActivate}
                        disabled={isLoading || !licenseKey.trim()}
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
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}