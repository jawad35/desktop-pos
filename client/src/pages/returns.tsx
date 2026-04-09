import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DataTable } from "@/components/ui/data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { formatPKR } from "@/lib/currency";
import { format } from "date-fns";
import { Eye, Download, ChevronRight, ChevronLeft } from "lucide-react";
import { useHeader } from "@/contexts/HeaderContext";
import { useLocation } from "wouter";
import { getPaymentMethodColor } from "@/utils/GetPaymentMethodColor";
import { api } from "../services/electron-api";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle } from "lucide-react";
export default function Returns() {
    const [filters, setFilters] = useState({
        startDate: "",
        endDate: "",
        paymentMethod: "",
        search: "",
    });
    const pageSize = 50;
    const [page, setPage] = useState(1);
    const [, navigate] = useLocation();
    const { toast } = useToast();

    const { data: returns = [], isLoading, refetch } = useQuery<any[]>({
        queryKey: ["returns", filters, page],
        queryFn: async () => {
            const result = await api.getReturns();
            let allReturns = [];

            if (Array.isArray(result)) {
                allReturns = result;
            } else if (result?.success && Array.isArray(result.data)) {
                allReturns = result.data;
            } else {
                return [];
            }

            // Apply filters locally
            let filtered = allReturns;

            if (filters.search) {
                const search = filters.search.toLowerCase();
                filtered = filtered.filter(returnItem =>
                    returnItem.receipt_number?.toLowerCase().includes(search) ||
                    returnItem.customer_name?.toLowerCase().includes(search) ||
                    returnItem.customer_phone?.toLowerCase().includes(search)
                );
            }

            if (filters.startDate) {
                filtered = filtered.filter(returnItem =>
                    new Date(returnItem.created_at) >= new Date(filters.startDate)
                );
            }

            if (filters.endDate) {
                filtered = filtered.filter(returnItem =>
                    new Date(returnItem.created_at) <= new Date(filters.endDate)
                );
            }

            if (filters.paymentMethod && filters.paymentMethod !== 'all') {
                filtered = filtered.filter(returnItem =>
                    returnItem.payment_method === filters.paymentMethod
                );
            }

            // Sort by created_at descending
            filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

            // Paginate
            const start = (page - 1) * pageSize;
            const paginated = filtered.slice(start, start + pageSize);

            return paginated;
        },
        keepPreviousData: true,
    });

    const handleExport = async () => {
        try {
            const result = await api.getReturns();
            let allReturns = [];

            if (Array.isArray(result)) {
                allReturns = result;
            } else if (result?.success && Array.isArray(result.data)) {
                allReturns = result.data;
            }

            // Apply filters
            let filtered = allReturns;

            if (filters.search) {
                const search = filters.search.toLowerCase();
                filtered = filtered.filter(returnItem =>
                    returnItem.receipt_number?.toLowerCase().includes(search) ||
                    returnItem.customer_name?.toLowerCase().includes(search)
                );
            }
            if (filters.startDate) {
                filtered = filtered.filter(returnItem =>
                    new Date(returnItem.created_at) >= new Date(filters.startDate)
                );
            }
            if (filters.endDate) {
                filtered = filtered.filter(returnItem =>
                    new Date(returnItem.created_at) <= new Date(filters.endDate)
                );
            }
            if (filters.paymentMethod && filters.paymentMethod !== 'all') {
                filtered = filtered.filter(returnItem =>
                    returnItem.payment_method === filters.paymentMethod
                );
            }

            const headers = ['Receipt No', 'Date', 'Customer Name', 'Customer Phone', 'Subtotal', 'Tax', 'Total', 'Payment Method', 'Status'];
            const csvRows = [headers];

            for (const returnItem of filtered) {
                csvRows.push([
                    returnItem.receipt_number || '',
                    format(new Date(returnItem.created_at), 'dd/MM/yyyy HH:mm'),
                    returnItem.customer_name || 'Walk-in Customer',
                    returnItem.customer_phone || '',
                    returnItem.subtotal?.toString() || '0',
                    returnItem.tax?.toString() || '0',
                    returnItem.total?.toString() || '0',
                    returnItem.payment_method || '',
                    returnItem.payment_status || ''
                ]);
            }

            const csvContent = csvRows.map(row => row.join(',')).join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'returns.csv';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toast({ title: "Export Successful", description: "Returns data has been exported to CSV" });
        } catch (error) {
            console.error('Export failed:', error);
            toast({ title: "Export Failed", description: "Failed to export returns data", variant: "destructive" });
        }
    };

    const handleViewDetails = (saleId: string) => {
        const state = "returns"
        navigate(`/item-details/${saleId}/${state}`);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed':
                return 'bg-secondary/10 text-secondary';
            case 'pending':
                return 'bg-accent/10 text-accent';
            case 'cancelled':
                return 'bg-destructive/10 text-destructive';
            default:
                return 'bg-muted/10 text-muted-foreground';
        }
    };

    const columns = [
        {
            key: 'receipt_number' as const,
            label: 'Receipt No.',
            render: (value: string) => (
                <span
                    className="font-medium text-primary font-mono cursor-pointer hover:underline"
                    onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(value);
                        toast({
                            title: "Copied!",
                            description: `Receipt ${value} copied to clipboard`,
                            duration: 1500
                        });
                    }}
                    title="Click to copy receipt number"
                >
                    {value}
                </span>
            ),
        },
        {
            key: 'created_at' as const,
            label: 'Date/Time',
            render: (value: string) => (
                <div>
                    <p className="text-sm">{format(new Date(value), 'dd/MM/yyyy')}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(value), 'HH:mm:ss')}</p>
                </div>
            ),
        },
        // {
        //     key: 'customer_name' as const,
        //     label: 'Customer',
        //     render: (value: string, row: any) => (
        //         <div>
        //             <p className="text-sm">{value || 'Walk-in Customer'}</p>
        //             {row.customer_phone && (
        //                 <p className="text-xs text-muted-foreground">{row.customer_phone}</p>
        //             )}
        //         </div>
        //     ),
        // },
        {
            key: 'subtotal' as const,
            label: 'Subtotal',
            render: (value: string) => (
                <span className="font-semibold">{formatPKR(parseFloat(value) || 0)}</span>
            ),
        },
        {
            key: 'return_fee' as const,
            label: 'Fine Amount',
            render: (value: string, row: any) => (
                <div className="relative group">
                    {parseFloat(value || '0') > 0 ? (
                        <>
                            <span className="font-semibold text-destructive">{formatPKR(parseFloat(value))}</span>
                            {row.fine_reason && (
                                <p className="text-xs text-muted-foreground">{row.fine_reason}</p>
                            )}
                            {/* Tooltip on hover for return_reason */}
                            {row.return_reason && (
                                <div className="absolute bottom-full left-0 mb-1 hidden group-hover:block z-10">
                                    <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                                        Return Reason: {row.return_reason}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <span className="text-muted-foreground">-</span>
                    )}
                </div>
            ),
        },
        // {
        //     key: 'total' as const,
        //     label: 'Total',
        //     render: (value: string) => (
        //         <span className="font-semibold text-foreground data-table">{formatPKR(value)}</span>
        //     ),
        // },
        {
            key: 'payment_method' as const,
            label: 'Payment Method',
            render: (value: string) => (
                <Badge className={getPaymentMethodColor(value)} variant="secondary">
                    {value?.toUpperCase()}
                </Badge>
            ),
        },
        {
            key: 'payment_status' as const,
            label: 'Status',
            render: (value: string) => (
                <Badge className={getStatusColor(value)} variant="secondary">
                    {value?.toUpperCase()}
                </Badge>
            ),
        },
        {
            key: 'id' as const,
            label: 'Actions',
            render: (value: string, row: any) => (
                <div className="flex space-x-2">
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleViewDetails(value)}
                        data-testid={`button-view-${value}`}
                    >
                        <Eye className="h-4 w-4" />
                    </Button>
                </div>
            ),
        },
    ];

    // Calculate summary stats
    // Calculate summary stats
    const totalReturns = returns.reduce((sum: number, returnItem: any) => sum + parseFloat(returnItem.total || 0), 0);
    const totalFines = returns.reduce((sum: number, returnItem: any) => sum + parseFloat(returnItem.return_fee || 0), 0);
    const completedReturns = returns.filter((returnItem: any) => returnItem.payment_status === 'completed');
    const pendingReturns = returns.filter((returnItem: any) => returnItem.payment_status === 'pending');
    const totalCount = returns.length;
    const totalPages = Math.ceil(totalCount / pageSize);

    const PaginationControls = () => (
        <div className="flex items-center justify-between space-x-2 py-4">
            {/* <div className="flex-1 text-sm text-muted-foreground">
                Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, totalCount)} of {totalCount} returns
            </div>
            <div className="flex items-center space-x-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                    disabled={page === 1}
                >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                </Button>
                <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                            pageNum = i + 1;
                        } else if (page <= 3) {
                            pageNum = i + 1;
                        } else if (page >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                        } else {
                            pageNum = page - 2 + i;
                        }
                        return (
                            <Button
                                key={pageNum}
                                variant={page === pageNum ? "default" : "outline"}
                                size="sm"
                                onClick={() => setPage(pageNum)}
                                className="w-8 h-8 p-0"
                            >
                                {pageNum}
                            </Button>
                        );
                    })}
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={page === totalPages}
                >
                    Next
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div> */}
        </div>
    );

    const { setTitle, setSubtitle } = useHeader();

    useEffect(() => {
        setTitle("Returns");
        setSubtitle("View and manage all return transactions");
    }, []);

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            <main className="flex-1 overflow-auto p-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-6">
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Total Returns</p>
                                    <p className="text-2xl font-bold text-foreground">{returns.length}</p>
                                </div>
                                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                                    <Eye className="h-6 w-6 text-primary" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Total Return Amount</p>
                                    <p className="text-2xl font-bold text-secondary">{formatPKR(totalReturns)}</p>
                                </div>
                                <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center">
                                    <Download className="h-6 w-6 text-secondary" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Total Fines</p>
                                    <p className="text-2xl font-bold text-destructive">{formatPKR(totalFines)}</p>
                                </div>
                                <div className="w-12 h-12 bg-destructive/10 rounded-lg flex items-center justify-center">
                                    <AlertTriangle className="h-6 w-6 text-destructive" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Completed</p>
                                    <p className="text-2xl font-bold text-secondary">{completedReturns.length}</p>
                                </div>
                                <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center">
                                    <Badge className="bg-secondary/10 text-secondary">✓</Badge>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Pending</p>
                                    <p className="text-2xl font-bold text-accent">{pendingReturns.length}</p>
                                </div>
                                <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                                    <Badge className="bg-accent/10 text-accent">⏳</Badge>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>Returns History</CardTitle>
                            <Button onClick={handleExport} variant="outline" data-testid="button-export-returns">
                                <Download className="h-4 w-4 mr-2" />
                                Export CSV
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {/* Filters */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                            <Input
                                placeholder="Search returns..."
                                value={filters.search}
                                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                data-testid="input-search-returns"
                            />
                            <div>
                                <Input
                                    type="date"
                                    placeholder="Start Date"
                                    value={filters.startDate}
                                    onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                                    data-testid="input-start-date"
                                />
                            </div>
                            <div>
                                <Input
                                    type="date"
                                    placeholder="End Date"
                                    value={filters.endDate}
                                    onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                                    data-testid="input-end-date"
                                />
                            </div>
                            <Select
                                value={filters.paymentMethod || "all"}
                                onValueChange={(value) =>
                                    setFilters({ ...filters, paymentMethod: value === "all" ? "" : value })
                                }
                            >
                                <SelectTrigger data-testid="select-payment-method">
                                    <SelectValue placeholder="Payment Method" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Methods</SelectItem>
                                    <SelectItem value="cash">Cash</SelectItem>
                                    <SelectItem value="card">Card</SelectItem>
                                    <SelectItem value="easypaisa">EasyPaisa</SelectItem>
                                    <SelectItem value="jazzcash">JazzCash</SelectItem>
                                    <SelectItem value="bank">Bank</SelectItem>
                                    <SelectItem value="check">Check</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Data Table */}
                        {isLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                <span className="ml-2 text-muted-foreground">Loading returns...</span>
                            </div>
                        ) : (
                            <DataTable
                                data={returns}
                                columns={columns}
                                searchPlaceholder="Search returns..."
                                onExport={handleExport}
                            />
                        )}
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}