import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { useEffect } from "react";

interface Salary {
    id: string;
    employeeId: string;
    month: string;
    year: number;
    basicSalary: number;
    deductions: number;
    bonuses: number;
    netSalary: number;
    status: 'pending' | 'paid' | 'cancelled';
    paymentDate?: string;
    payment_method?: string;
    notes?: string;
}

interface EditSalaryModalProps {
    isOpen: boolean;
    onClose: () => void;
    editingSalary: Salary | null;
    setEditingSalary: (salary: Salary | null) => void;
    onSave: () => void;
}

export function EditSalaryModal({ isOpen, onClose, editingSalary, setEditingSalary, onSave }: EditSalaryModalProps) {
    // Auto-calculate net salary when basicSalary, bonuses, or deductions change
    useEffect(() => {
        if (editingSalary) {
            const netSalary = (editingSalary.basicSalary || 0) + (editingSalary.bonuses || 0) - (editingSalary.deductions || 0);
            if (netSalary !== editingSalary.netSalary) {
                setEditingSalary({ ...editingSalary, netSalary });
            }
        }
    }, [editingSalary?.basicSalary, editingSalary?.bonuses, editingSalary?.deductions]);

    if (!editingSalary) return null;

    const handleFieldChange = (field: keyof Salary, value: any) => {
        const updated = { ...editingSalary, [field]: value };
        // Recalculate net salary
        if (field === 'basicSalary' || field === 'bonuses' || field === 'deductions') {
            updated.netSalary = (updated.basicSalary || 0) + (updated.bonuses || 0) - (updated.deductions || 0);
        }
        setEditingSalary(updated);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Edit Salary Record</DialogTitle>
                    <DialogDescription>
                        Update salary details for {format(new Date(editingSalary.year, parseInt(editingSalary.month) - 1, 1), "MMMM yyyy")}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Basic Salary</Label>
                            <Input
                                type="number"
                                value={editingSalary.basicSalary || 0}
                                onChange={(e) => handleFieldChange('basicSalary', parseFloat(e.target.value) || 0)}
                            />
                        </div>
                        <div>
                            <Label>Bonuses</Label>
                            <Input
                                type="number"
                                value={editingSalary.bonuses || 0}
                                onChange={(e) => handleFieldChange('bonuses', parseFloat(e.target.value) || 0)}
                            />
                        </div>
                        <div>
                            <Label>Deductions</Label>
                            <Input
                                type="number"
                                value={editingSalary.deductions || 0}
                                onChange={(e) => handleFieldChange('deductions', parseFloat(e.target.value) || 0)}
                            />
                        </div>
                        <div>
                            <Label>Net Salary</Label>
                            <Input
                                type="number"
                                value={editingSalary.netSalary || 0}
                                disabled
                                className="bg-muted"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Calculated automatically: Basic + Bonuses - Deductions
                            </p>
                        </div>
                        <div>
                            <Label>Status</Label>
                            <Select
                                value={editingSalary.status || 'pending'}
                                onValueChange={(value: any) => handleFieldChange('status', value)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="paid">Paid</SelectItem>
                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Payment Method</Label>
                            <Select
                                value={editingSalary.payment_method || 'cash'}
                                onValueChange={(value) => handleFieldChange('payment_method', value)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="cash">Cash</SelectItem>
                                    <SelectItem value="easypaisa">EasyPaisa</SelectItem>
                                    <SelectItem value="bank">Bank</SelectItem>
                                    <SelectItem value="jazzcash">JazzCash</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div>
                        <Label>Notes</Label>
                        <Textarea
                            value={editingSalary.notes || ''}
                            onChange={(e) => handleFieldChange('notes', e.target.value)}
                            placeholder="Additional notes..."
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={onSave}>Save Changes</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}