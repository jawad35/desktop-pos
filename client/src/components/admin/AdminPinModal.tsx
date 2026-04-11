// components/admin/AdminPinModal.tsx
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Shield } from 'lucide-react';
import { api } from '@/services/electron-api';

interface AdminPinModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function AdminPinModal({ isOpen, onClose, onSuccess }: AdminPinModalProps) {
    const [pin, setPin] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const { toast } = useToast();

    const handleVerify = async () => {
        if (!pin.trim()) {
            setError('Please enter PIN');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const result = await api.verifyAdminPin(pin);
            
            if (result.success) {
                await api.setLoginType('admin');
                toast({
                    title: "Admin Mode Activated",
                    description: "You now have access to admin features",
                });
                onSuccess();
                onClose();
            } else {
                setError('Invalid PIN');
                toast({
                    title: "Access Denied",
                    description: "Invalid admin PIN",
                    variant: "destructive",
                });
            }
        } catch (error: any) {
            setError(error.message);
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
            setPin('');
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-primary" />
                        Admin Access Required
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <div>
                        <Label htmlFor="pin">Enter Admin PIN</Label>
                        <Input
                            id="pin"
                            type="password"
                            placeholder="Enter admin PIN"
                            value={pin}
                            onChange={(e) => {
                                setPin(e.target.value);
                                setError('');
                            }}
                            onKeyPress={(e) => {
                                if (e.key === 'Enter') handleVerify();
                            }}
                            className="mt-1"
                            autoFocus
                        />
                        {error && (
                            <p className="text-sm text-destructive mt-1">{error}</p>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={onClose} className="flex-1">
                            Cancel
                        </Button>
                        <Button onClick={handleVerify} disabled={isLoading} className="flex-1">
                            {isLoading ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Verifying...
                                </>
                            ) : (
                                'Verify & Switch to Admin'
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}