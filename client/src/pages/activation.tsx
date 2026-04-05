import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Key, CheckCircle, AlertCircle } from 'lucide-react';

interface ActivationProps {
    onActivated: () => void;
}

export default function ActivationScreen({ onActivated }: ActivationProps) {
    const [licenseKey, setLicenseKey] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const { toast } = useToast();

    const handleActivate = async () => {
        if (!licenseKey.trim()) {
            setError('Please enter your license key');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            // Send activation request to main process
            const result = await window.electronAPI.activateLicense(licenseKey);
            
            if (result.success) {
                toast({
                    title: "Activation Successful!",
                    description: `Your license is valid until ${new Date(result.expiry_date).toLocaleDateString()}`,
                });
                onActivated();
            } else {
                setError(result.message || 'Activation failed');
                toast({
                    title: "Activation Failed",
                    description: result.message,
                    variant: "destructive",
                });
            }
        } catch (err: any) {
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
            <Card className="w-full max-w-md mx-4">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                        <Key className="h-8 w-8 text-primary" />
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
                            placeholder="Enter license key (e.g., POS9-7H3K-M2L8-4N6P)"
                            value={licenseKey}
                            onChange={(e) => {
                                setLicenseKey(e.target.value.toUpperCase());
                                setError('');
                            }}
                            className="text-center font-mono text-lg"
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

                    <div className="text-center text-xs text-muted-foreground">
                        <p>Internet connection required for activation</p>
                        <p className="mt-1">After activation, the software works offline</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}