// components/AdminPinSettings.tsx
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/services/electron-api';
import { Shield, Save } from 'lucide-react';

export function AdminPinSettings() {
    const [oldPin, setOldPin] = useState('');
    const [newPin, setNewPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const handleUpdatePin = async () => {
        if (!oldPin || !newPin) {
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

        setIsLoading(true);
        try {
            const result = await api.updateAdminPin(oldPin, newPin);
            if (result.success) {
                toast({ title: "Success", description: "Admin PIN updated successfully" });
                setOldPin('');
                setNewPin('');
                setConfirmPin('');
            } else {
                toast({ title: "Error", description: result.error || "Failed to update PIN", variant: "destructive" });
            }
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Admin PIN Settings
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <Label>Current PIN</Label>
                    <Input
                        type="password"
                        placeholder="Enter current PIN"
                        value={oldPin}
                        onChange={(e) => setOldPin(e.target.value)}
                        className="mt-1"
                    />
                </div>
                <div>
                    <Label>New PIN</Label>
                    <Input
                        type="password"
                        placeholder="Enter new PIN"
                        value={newPin}
                        onChange={(e) => setNewPin(e.target.value)}
                        className="mt-1"
                    />
                </div>
                <div>
                    <Label>Confirm New PIN</Label>
                    <Input
                        type="password"
                        placeholder="Confirm new PIN"
                        value={confirmPin}
                        onChange={(e) => setConfirmPin(e.target.value)}
                        className="mt-1"
                    />
                </div>
                <Button onClick={handleUpdatePin} disabled={isLoading}>
                    <Save className="h-4 w-4 mr-2" />
                    {isLoading ? "Updating..." : "Update Admin PIN"}
                </Button>
            </CardContent>
        </Card>
    );
}