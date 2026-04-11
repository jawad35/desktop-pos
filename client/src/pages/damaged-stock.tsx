// pages/damaged-stock.tsx
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { api } from "../services/electron-api";
import { Search, Filter, RefreshCw, Recycle, CheckCircle, AlertTriangle, Banknote } from "lucide-react";

export default function DamagedStockPage() {
    const [filters, setFilters] = useState({
        search: "",
        status: "all",
        dateFrom: "",
        dateTo: ""
    });
    const [selectedItem, setSelectedItem] = useState(null);
    const [isRecoveryModalOpen, setIsRecoveryModalOpen] = useState(false);
    const [recoveryNotes, setRecoveryNotes] = useState("");
    const { toast } = useToast();

    // Fetch damaged stock
    const { data: damagedItems = [], isLoading, refetch } = useQuery({
        queryKey: ["damaged-stock", filters],
        queryFn: async () => {
            const result = await api.getDamagedStock(filters);
            return result.success ? result.data : [];
        }
    });

    // Update damaged item status
    const updateStatusMutation = useMutation({
        mutationFn: async ({ id, status, notes }: { id: string; status: string; notes: string }) => {
            const result = await api.updateDamagedStock(id, { status, recovery_notes: notes, recovery_date: new Date().toISOString() });
            return result;
        },
        onSuccess: () => {
            toast({ title: "Updated", description: "Damage record updated successfully" });
            refetch();
            setIsRecoveryModalOpen(false);
            setRecoveryNotes("");
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    });

    const handleFulfill = (item: any) => {
        setSelectedItem(item);
        setIsRecoveryModalOpen(true);
    };

    const handleRecycle = (item: any) => {
        if (confirm("Mark as recycled? This will record the loss permanently.")) {
            updateStatusMutation.mutate({ id: item.id, status: "recycled", notes: "Item recycled" });
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "pending":
                return <Badge className="bg-yellow-500">Pending Recovery</Badge>;
            case "fulfilled":
                return <Badge className="bg-green-500">Fulfilled</Badge>;
            case "recycled":
                return <Badge className="bg-gray-500">Recycled</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    // Calculate summary stats
    const totalLoss = damagedItems.reduce((sum, item) => sum + item.total_loss, 0);
    const pendingLoss = damagedItems.filter(i => i.status === "pending").reduce((sum, item) => sum + item.total_loss, 0);
    const fulfilledCount = damagedItems.filter(i => i.status === "fulfilled").length;
    const recycledCount = damagedItems.filter(i => i.status === "recycled").length;

    return (
        <div className="p-6 space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Loss</p>
                                <p className="text-2xl font-bold text-destructive">Rs. {totalLoss.toLocaleString()}</p>
                            </div>
                            <Banknote className="h-8 w-8 text-destructive" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Pending Recovery</p>
                                <p className="text-2xl font-bold text-yellow-600">Rs. {pendingLoss.toLocaleString()}</p>
                            </div>
                            <AlertTriangle className="h-8 w-8 text-yellow-600" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Fulfilled</p>
                                <p className="text-2xl font-bold text-green-600">{fulfilledCount}</p>
                            </div>
                            <CheckCircle className="h-8 w-8 text-green-600" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Recycled</p>
                                <p className="text-2xl font-bold text-gray-600">{recycledCount}</p>
                            </div>
                            <Recycle className="h-8 w-8 text-gray-600" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle>Damaged Stock Management</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <Input
                            placeholder="Search by product name or SKU..."
                            value={filters.search}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                        />
                        <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
                            <SelectTrigger>
                                <SelectValue placeholder="All Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="pending">Pending Recovery</SelectItem>
                                <SelectItem value="fulfilled">Fulfilled</SelectItem>
                                <SelectItem value="recycled">Recycled</SelectItem>
                            </SelectContent>
                        </Select>
                        <Input type="date" placeholder="From Date" value={filters.dateFrom} onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })} />
                        <Input type="date" placeholder="To Date" value={filters.dateTo} onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })} />
                    </div>

                    {/* Data Table */}
                    <div className="border rounded-lg overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Product</TableHead>
                                    <TableHead>SKU</TableHead>
                                    <TableHead>Quantity</TableHead>
                                    <TableHead>Loss Amount</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Damage Reason</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow><TableCell colSpan={8} className="text-center py-8">Loading...</TableCell></TableRow>
                                ) : damagedItems.length === 0 ? (
                                    <TableRow><TableCell colSpan={8} className="text-center py-8">No damaged items found</TableCell></TableRow>
                                ) : (
                                    damagedItems.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell>{new Date(item.created_at).toLocaleDateString()}</TableCell>
                                            <TableCell className="font-medium">{item.product_name}</TableCell>
                                            <TableCell><code className="text-xs">{item.sku}</code></TableCell>
                                            <TableCell>{item.quantity}</TableCell>
                                            <TableCell className="text-destructive font-semibold">Rs. {item.total_loss.toLocaleString()}</TableCell>
                                            <TableCell>{getStatusBadge(item.status)}</TableCell>
                                            <TableCell>{item.damage_reason || "-"}</TableCell>
                                            <TableCell>
                                                <div className="flex space-x-2">
                                                    {item.status === "pending" && (
                                                        <>
                                                            <Button size="sm" variant="outline" onClick={() => handleFulfill(item)}>
                                                                <CheckCircle className="h-4 w-4 mr-1" />
                                                                Fulfill
                                                            </Button>
                                                            <Button size="sm" variant="outline" onClick={() => handleRecycle(item)}>
                                                                <Recycle className="h-4 w-4 mr-1" />
                                                                Recycle
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Recovery Modal */}
            <Dialog open={isRecoveryModalOpen} onOpenChange={setIsRecoveryModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Record Recovery</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">Recovery Notes</label>
                            <Textarea
                                value={recoveryNotes}
                                onChange={(e) => setRecoveryNotes(e.target.value)}
                                placeholder="Enter details about how the issue was resolved (e.g., replacement received, refund from supplier, etc.)"
                                rows={4}
                            />
                        </div>
                        <div className="flex justify-end space-x-2">
                            <Button variant="outline" onClick={() => setIsRecoveryModalOpen(false)}>Cancel</Button>
                            <Button onClick={() => updateStatusMutation.mutate({ id: selectedItem?.id, status: "fulfilled", notes: recoveryNotes })}>
                                Confirm Recovery
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}