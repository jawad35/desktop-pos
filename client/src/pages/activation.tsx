import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, AlertCircle, Shield, Key, Lock, AlertTriangle } from 'lucide-react';

interface ActivationProps {
    onActivated: () => void;
}

export default function ActivationScreen({ onActivated }: ActivationProps) {
    const [licenseKey, setLicenseKey] = useState('');
    const [adminPin, setAdminPin] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [subscriptionStatus, setSubscriptionStatus] = useState<{
        status: string;
        message: string;
        shopName?: string;
        expiryDate?: string;
    } | null>(null);
    const [isChecking, setIsChecking] = useState(false);
    const { toast } = useToast();

    // Check subscription status on component mount
    useEffect(() => {
        checkSubscriptionStatus();
    }, []);

    const checkSubscriptionStatus = async () => {
        setIsChecking(true);
        try {
            const result = await window.electronAPI.checkSubscriptionStatus();
            console.log('Subscription status:', result);
            
            if (result && result.status) {
                setSubscriptionStatus({
                    status: result.status,
                    message: result.message || getStatusMessage(result.status),
                    shopName: result.shopName,
                    expiryDate: result.expiryDate
                });
                
                // If subscription is active and we have a license, proceed
                if (result.status === 'active' && result.hasLicense) {
                    toast({
                        title: "Subscription Active",
                        description: "Your subscription is active. You can proceed.",
                    });
                    // Auto-proceed after 2 seconds
                    setTimeout(() => {
                        onActivated();
                    }, 2000);
                }
            }
        } catch (error) {
            console.error('Failed to check subscription:', error);
            setSubscriptionStatus({
                status: 'error',
                message: 'Unable to verify subscription status. Please check your internet connection.'
            });
        } finally {
            setIsChecking(false);
        }
    };

    const getStatusMessage = (status: string): string => {
        switch (status) {
            case 'active':
                return 'Your subscription is active and valid.';
            case 'expired':
                return 'Your subscription has expired. Please renew to continue using the software.';
            case 'suspended':
                return 'Your subscription has been suspended. Please contact support.';
            case 'pending':
                return 'Your subscription is pending activation. Please wait or contact support.';
            default:
                return 'Unable to verify subscription status.';
        }
    };

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
                // After activation, check subscription status again
                const subStatus = await window.electronAPI.checkSubscriptionStatus();
                
                if (subStatus.status === 'active') {
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

                    onActivated();
                } else {
                    setError(`License activated but subscription is ${subStatus.status}. ${subStatus.message}`);
                    setSubscriptionStatus(subStatus);
                }
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
                    {/* Subscription Status Display */}
                    {isChecking && (
                        <div className="flex items-center justify-center gap-2 p-3 bg-blue-50 rounded-lg">
                            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                            <span className="text-sm text-blue-600">Checking subscription status...</span>
                        </div>
                    )}

                    {subscriptionStatus && !isChecking && subscriptionStatus.status !== 'active' && (
                        <div className={`p-4 rounded-lg ${
                            subscriptionStatus.status === 'expired' ? 'bg-red-50 border border-red-200' :
                            subscriptionStatus.status === 'suspended' ? 'bg-orange-50 border border-orange-200' :
                            'bg-yellow-50 border border-yellow-200'
                        }`}>
                            <div className="flex items-start gap-3">
                                <AlertTriangle className={`h-5 w-5 flex-shrink-0 ${
                                    subscriptionStatus.status === 'expired' ? 'text-red-600' :
                                    subscriptionStatus.status === 'suspended' ? 'text-orange-600' :
                                    'text-yellow-600'
                                }`} />
                                <div>
                                    <p className={`font-semibold ${
                                        subscriptionStatus.status === 'expired' ? 'text-red-800' :
                                        subscriptionStatus.status === 'suspended' ? 'text-orange-800' :
                                        'text-yellow-800'
                                    }`}>
                                        Subscription {subscriptionStatus.status.toUpperCase()}
                                    </p>
                                    <p className={`text-sm mt-1 ${
                                        subscriptionStatus.status === 'expired' ? 'text-red-700' :
                                        subscriptionStatus.status === 'suspended' ? 'text-orange-700' :
                                        'text-yellow-700'
                                    }`}>
                                        {subscriptionStatus.message}
                                    </p>
                                    {subscriptionStatus.expiryDate && (
                                        <p className="text-xs text-muted-foreground mt-2">
                                            Expired on: {new Date(subscriptionStatus.expiryDate).toLocaleDateString()}
                                        </p>
                                    )}
                                    <Button 
                                        variant="link" 
                                        className="p-0 h-auto mt-2 text-sm"
                                        onClick={() => window.open('mailto:support@yourdomain.com')}
                                    >
                                        Contact Support →
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {subscriptionStatus?.status === 'active' && subscriptionStatus.hasLicense && (
                        <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                            <div className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <span className="text-sm text-green-700">
                                    Subscription active{subscriptionStatus.shopName ? ` for ${subscriptionStatus.shopName}` : ''}
                                </span>
                            </div>
                        </div>
                    )}

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
                                disabled={isLoading || subscriptionStatus?.status === 'active'}
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
                                disabled={isLoading || subscriptionStatus?.status === 'active'}
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
                        disabled={isLoading || !licenseKey.trim() || !adminPin.trim() || subscriptionStatus?.status === 'active'}
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