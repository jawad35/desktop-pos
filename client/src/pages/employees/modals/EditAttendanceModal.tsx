import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";

interface Attendance {
    id: string;
    employeeId: string;
    date: string;
    status: 'present' | 'absent' | 'leave';
    checkIn?: string;
    checkOut?: string;
    notes?: string;
}

interface EditAttendanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    editingAttendance: Attendance | null;
    setEditingAttendance: (attendance: Attendance | null) => void;
    tempAttendanceStatus: 'present' | 'absent' | 'leave';
    setTempAttendanceStatus: (status: 'present' | 'absent' | 'leave') => void;
    onSave: () => void;
}

export function EditAttendanceModal({ 
    isOpen, 
    onClose, 
    editingAttendance, 
    setEditingAttendance, 
    tempAttendanceStatus, 
    setTempAttendanceStatus, 
    onSave 
}: EditAttendanceModalProps) {
    if (!editingAttendance) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Edit Attendance Record</DialogTitle>
                    <DialogDescription>
                        Update attendance for {format(new Date(editingAttendance.date), "dd/MM/yyyy")}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div>
                        <Label>Status</Label>
                        <div className="flex gap-4 mt-2">
                            <Button
                                type="button"
                                variant={tempAttendanceStatus === 'present' ? 'default' : 'outline'}
                                onClick={() => setTempAttendanceStatus('present')}
                                className="flex-1"
                            >
                                Present
                            </Button>
                            <Button
                                type="button"
                                variant={tempAttendanceStatus === 'absent' ? 'default' : 'outline'}
                                onClick={() => setTempAttendanceStatus('absent')}
                                className="flex-1"
                            >
                                Absent
                            </Button>
                            <Button
                                type="button"
                                variant={tempAttendanceStatus === 'leave' ? 'default' : 'outline'}
                                onClick={() => setTempAttendanceStatus('leave')}
                                className="flex-1"
                            >
                                Leave
                            </Button>
                        </div>
                    </div>
                    {/* <div>
                        <Label>Check In</Label>
                        <Input
                            type="time"
                            value={editingAttendance.checkIn?.slice(0, 5) || ''}
                            onChange={(e) => setEditingAttendance({ ...editingAttendance, checkIn: e.target.value })}
                        />
                    </div> */}
                    {/* <div>
                        <Label>Check Out</Label>
                        <Input
                            type="time"
                            value={editingAttendance.checkOut?.slice(0, 5) || ''}
                            onChange={(e) => setEditingAttendance({ ...editingAttendance, checkOut: e.target.value })}
                        />
                    </div>
                    <div>
                        <Label>Notes</Label>
                        <Textarea
                            value={editingAttendance.notes || ''}
                            onChange={(e) => setEditingAttendance({ ...editingAttendance, notes: e.target.value })}
                            placeholder="Additional notes..."
                        />
                    </div> */}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={onSave}>Save Changes</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}