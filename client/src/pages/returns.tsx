import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { formatPKR } from "@/lib/currency";
import { format } from "date-fns";
import { Eye, Download, ChevronRight, ChevronLeft, AlertTriangle } from "lucide-react";
import { useHeader } from "@/contexts/HeaderContext";
import { useLocation } from "wouter";
import { getPaymentMethodColor } from "@/utils/GetPaymentMethodColor";
import { api } from "../services/electron-api";
import { useToast } from "@/hooks/use-toast";

// Storage keys
const STORAGE_KEYS = {
  RETURNS_PAGE: 'returns_current_page',
  RETURNS_FILTERS: 'returns_filters',
  RETURNS_SCROLL_POSITION: 'returns_scroll_position'
};

export default function Returns() {
    const pageSize = 50; // Changed to 20 for testing
    const [location] = useLocation();
    
    // Load saved state
    const loadSavedPage = () => {
        try {
            const savedPage = localStorage.getItem(STORAGE_KEYS.RETURNS_PAGE);
            const page = savedPage ? parseInt(savedPage, 10) : 1;
            console.log(`Loading saved page: ${page}`);
            return isNaN(page) ? 1 : Math.max(1, page);
        } catch (error) {
            return 1;
        }
    };

    const loadSavedFilters = () => {
        try {
            const savedFilters = localStorage.getItem(STORAGE_KEYS.RETURNS_FILTERS);
            if (savedFilters) {
                const parsed = JSON.parse(savedFilters);
                console.log(`Loading saved filters:`, parsed);
                return {
                    startDate: parsed.startDate || "",
                    endDate: parsed.endDate || "",
                    paymentMethod: parsed.paymentMethod || "",
                    search: parsed.search || "",
                };
            }
        } catch (error) {}
        return {
            startDate: "",
            endDate: "",
            paymentMethod: "",
            search: "",
        };
    };

    const [filters, setFilters] = useState(loadSavedFilters);
    const [currentPage, setCurrentPage] = useState(loadSavedPage);
    const [allReturnsData, setAllReturnsData] = useState<any[]>([]);
    const [renderKey, setRenderKey] = useState(0); // Force re-render
    const [, navigate] = useLocation();
    const { toast } = useToast();
    const mainContentRef = useRef<HTMLDivElement>(null);
    const isFirstLoadRef = useRef(true);
    const isMountedRef = useRef(true);

    // Fetch data
    const { isLoading, refetch, data } = useQuery<any[]>({
        queryKey: ["returns", location], // Add location to trigger refetch on navigation
        queryFn: async () => {
            console.log("=== FETCHING RETURNS DATA ===");
            const result = await api.getReturns();
            let allReturns = [];

            if (Array.isArray(result)) {
                allReturns = result;
            } else if (result?.success && Array.isArray(result.data)) {
                allReturns = result.data;
            } else {
                console.log("No returns data found");
                return [];
            }

            // Sort by created_at descending
            allReturns.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            
            console.log(`Loaded ${allReturns.length} returns`);
            setAllReturnsData(allReturns);
            
            // Force re-render after data is set
            setRenderKey(prev => prev + 1);
            
            return allReturns;
        },
        refetchOnMount: true,
        refetchOnWindowFocus: true, // Enable refetch on window focus
        refetchOnReconnect: true,
        staleTime: 0, // Don't cache data
        cacheTime: 0, // Don't cache data
    });

    // Apply filters using useMemo for performance
    const filteredData = useMemo(() => {
        console.log("=== COMPUTING FILTERED DATA ===");
        console.log(`All returns data length: ${allReturnsData.length}`);
        
        if (allReturnsData.length === 0) {
            console.log("No data to filter");
            return [];
        }
        
        let filtered = [...allReturnsData];

        if (filters.search) {
            const search = filters.search.toLowerCase();
            filtered = filtered.filter(returnItem =>
                returnItem.receipt_number?.toLowerCase().includes(search) ||
                returnItem.customer_name?.toLowerCase().includes(search) ||
                returnItem.customer_phone?.toLowerCase().includes(search)
            );
            console.log(`After search filter: ${filtered.length} records`);
        }

        if (filters.startDate) {
            filtered = filtered.filter(returnItem =>
                new Date(returnItem.created_at) >= new Date(filters.startDate)
            );
            console.log(`After start date filter: ${filtered.length} records`);
        }

        if (filters.endDate) {
            filtered = filtered.filter(returnItem =>
                new Date(returnItem.created_at) <= new Date(filters.endDate)
            );
            console.log(`After end date filter: ${filtered.length} records`);
        }

        if (filters.paymentMethod && filters.paymentMethod !== 'all') {
            filtered = filtered.filter(returnItem =>
                returnItem.payment_method === filters.paymentMethod
            );
            console.log(`After payment method filter: ${filtered.length} records`);
        }

        console.log(`Final filtered count: ${filtered.length}`);
        return filtered;
    }, [allReturnsData, filters]);

    // Apply pagination using useMemo
    const paginatedData = useMemo(() => {
        console.log("=== COMPUTING PAGINATED DATA ===");
        console.log(`Filtered data length: ${filteredData.length}`);
        console.log(`Current page: ${currentPage}`);
        
        if (filteredData.length === 0) {
            console.log("No filtered data to paginate");
            return [];
        }
        
        const start = (currentPage - 1) * pageSize;
        const end = start + pageSize;
        const paginated = filteredData.slice(start, end);
        console.log(`Pagination: Page ${currentPage}, showing records ${start + 1} to ${Math.min(end, filteredData.length)}`);
        console.log(`Paginated data count: ${paginated.length}`);
        
        return paginated;
    }, [filteredData, currentPage]);

    // Validate and adjust current page when filtered data changes
    useEffect(() => {
        console.log("=== PAGE VALIDATION EFFECT ===");
        console.log(`Filtered data length: ${filteredData.length}`);
        console.log(`Current page: ${currentPage}`);
        
        if (filteredData.length > 0) {
            const totalPages = Math.ceil(filteredData.length / pageSize);
            console.log(`Total pages: ${totalPages}`);
            
            // On first load, use saved page
            if (isFirstLoadRef.current) {
                const savedPage = loadSavedPage();
                let validPage = savedPage;
                if (validPage > totalPages) validPage = totalPages;
                if (validPage < 1) validPage = 1;
                
                console.log(`First load: saved page = ${savedPage}, valid page = ${validPage}`);
                
                if (validPage !== currentPage) {
                    console.log(`Adjusting page from ${currentPage} to ${validPage}`);
                    setCurrentPage(validPage);
                }
                isFirstLoadRef.current = false;
            } 
            // If current page is out of bounds, adjust it
            else if (currentPage > totalPages) {
                console.log(`Page ${currentPage} out of bounds, adjusting to ${totalPages}`);
                setCurrentPage(totalPages);
            } else if (currentPage < 1) {
                console.log(`Page ${currentPage} invalid, adjusting to 1`);
                setCurrentPage(1);
            }
        } else {
            console.log("No filtered data, resetting to page 1");
            if (currentPage !== 1) {
                setCurrentPage(1);
            }
        }
    }, [filteredData, currentPage]);

    // Save to localStorage whenever state changes (after first load)
    useEffect(() => {
        if (!isFirstLoadRef.current) {
            console.log(`Saving to localStorage - Page: ${currentPage}, Filters:`, filters);
            localStorage.setItem(STORAGE_KEYS.RETURNS_PAGE, currentPage.toString());
            localStorage.setItem(STORAGE_KEYS.RETURNS_FILTERS, JSON.stringify(filters));
        }
    }, [currentPage, filters]);

    // Force re-render when component mounts/updates
    useEffect(() => {
        console.log("=== COMPONENT MOUNTED/UPDATED ===");
        console.log(`Location: ${location}`);
        console.log(`Current page state: ${currentPage}`);
        console.log(`Filtered data length: ${filteredData.length}`);
        console.log(`Paginated data length: ${paginatedData.length}`);
        
        // Check if we have data but table is empty
        if (filteredData.length > 0 && paginatedData.length === 0 && !isLoading) {
            console.log("WARNING: Data exists but paginated data is empty! Forcing re-render...");
            setRenderKey(prev => prev + 1);
        }
        
        return () => {
            console.log("Component unmounting");
        };
    }, [location, filteredData, paginatedData, isLoading, currentPage]);

    // Restore scroll position
    useEffect(() => {
        if (!isLoading && paginatedData.length > 0 && mainContentRef.current && !isFirstLoadRef.current) {
            const savedScrollPosition = localStorage.getItem(STORAGE_KEYS.RETURNS_SCROLL_POSITION);
            if (savedScrollPosition) {
                console.log(`Restoring scroll position: ${savedScrollPosition}`);
                setTimeout(() => {
                    if (mainContentRef.current) {
                        mainContentRef.current.scrollTo({
                            top: parseInt(savedScrollPosition, 10),
                            behavior: 'auto'
                        });
                    }
                }, 100);
            }
        }
    }, [isLoading, paginatedData]);

    const handleScroll = useCallback(() => {
        if (mainContentRef.current && !isFirstLoadRef.current) {
            localStorage.setItem(STORAGE_KEYS.RETURNS_SCROLL_POSITION, mainContentRef.current.scrollTop.toString());
        }
    }, []);

    const handleExport = async () => {
        try {
            const headers = ['Receipt No', 'Date', 'Customer Name', 'Customer Phone', 'Subtotal', 'Tax', 'Total', 'Payment Method', 'Status', 'Fine Amount', 'Fine Reason', 'Return Reason'];
            const csvRows = [headers];

            for (const returnItem of filteredData) {
                csvRows.push([
                    `"${returnItem.receipt_number || ''}"`,
                    `"${format(new Date(returnItem.created_at), 'dd/MM/yyyy HH:mm')}"`,
                    `"${returnItem.customer_name || 'Walk-in Customer'}"`,
                    `"${returnItem.customer_phone || ''}"`,
                    returnItem.subtotal?.toString() || '0',
                    returnItem.tax?.toString() || '0',
                    returnItem.total?.toString() || '0',
                    `"${returnItem.payment_method || ''}"`,
                    `"${returnItem.payment_status || ''}"`,
                    returnItem.return_fee?.toString() || '0',
                    `"${returnItem.fine_reason || ''}"`,
                    `"${returnItem.return_reason || ''}"`
                ]);
            }

            const csvContent = csvRows.map(row => row.join(',')).join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `returns_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toast({ title: "Export Successful", description: `Exported ${filteredData.length} returns to CSV` });
        } catch (error) {
            console.error('Export failed:', error);
            toast({ title: "Export Failed", description: "Failed to export returns data", variant: "destructive" });
        }
    };

    const handleViewDetails = (saleId: string) => {
        const state = "returns";
        navigate(`/item-details/${saleId}/${state}`);
    };

    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'completed':
                return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
            case 'pending':
                return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
            case 'cancelled':
                return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
            default:
                return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
        }
    };

    const handleFilterChange = (key: string, value: any) => {
        console.log(`Filter changed: ${key} = ${value}`);
        setFilters(prev => ({ ...prev, [key]: value }));
        setCurrentPage(1); // Reset to first page when filters change
    };

    const totalPages = Math.ceil(filteredData.length / pageSize);
    const startIndex = filteredData.length > 0 ? (currentPage - 1) * pageSize + 1 : 0;
    const endIndex = Math.min(currentPage * pageSize, filteredData.length);

    // Calculate summary stats
    const totalReturnsAmount = filteredData.reduce((sum: number, returnItem: any) => sum + (parseFloat(returnItem.total) || 0), 0);
    const totalFines = filteredData.reduce((sum: number, returnItem: any) => sum + (parseFloat(returnItem.return_fee) || 0), 0);
    const completedReturns = filteredData.filter((returnItem: any) => returnItem.payment_status?.toLowerCase() === 'completed');
    const pendingReturns = filteredData.filter((returnItem: any) => returnItem.payment_status?.toLowerCase() === 'pending');

    const { setTitle, setSubtitle } = useHeader();

    useEffect(() => {
        setTitle("Returns");
        setSubtitle("View and manage all return transactions");
    }, []);

    // Debug render
    console.log("=== RENDERING COMPONENT ===");
    console.log(`isLoading: ${isLoading}`);
    console.log(`paginatedData.length: ${paginatedData.length}`);
    console.log(`filteredData.length: ${filteredData.length}`);
    console.log(`currentPage: ${currentPage}`);
    console.log(`renderKey: ${renderKey}`);

    return (
        <div className="flex-1 flex flex-col overflow-hidden" key={renderKey}>
            <main 
                ref={mainContentRef}
                className="flex-1 overflow-auto p-6"
                onScroll={handleScroll}
            >
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-6">
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Total Returns</p>
                                    <p className="text-2xl font-bold text-foreground">{filteredData.length}</p>
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
                                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatPKR(totalReturnsAmount)}</p>
                                </div>
                                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                                    <Download className="h-6 w-6 text-green-600 dark:text-green-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Total Fines</p>
                                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">{formatPKR(totalFines)}</p>
                                </div>
                                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                                    <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Completed</p>
                                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">{completedReturns.length}</p>
                                </div>
                                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">✓</Badge>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Pending</p>
                                    <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{pendingReturns.length}</p>
                                </div>
                                <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
                                    <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">⏳</Badge>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between flex-wrap gap-4">
                            <CardTitle>Returns History</CardTitle>
                            <div className="flex space-x-2">
                                <Button 
                                    onClick={() => {
                                        console.log("Reset button clicked");
                                        localStorage.removeItem(STORAGE_KEYS.RETURNS_PAGE);
                                        localStorage.removeItem(STORAGE_KEYS.RETURNS_FILTERS);
                                        localStorage.removeItem(STORAGE_KEYS.RETURNS_SCROLL_POSITION);
                                        setFilters({ startDate: "", endDate: "", paymentMethod: "", search: "" });
                                        setCurrentPage(1);
                                        isFirstLoadRef.current = true;
                                        setRenderKey(prev => prev + 1);
                                        toast({ title: "Reset", description: "All filters and pagination have been reset" });
                                        refetch();
                                    }} 
                                    variant="outline" 
                                    size="sm"
                                >
                                    Reset All
                                </Button>
                                <Button onClick={handleExport} variant="outline">
                                    <Download className="h-4 w-4 mr-2" />
                                    Export CSV
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {/* Filters */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                            <Input
                                placeholder="Search by receipt, customer..."
                                value={filters.search}
                                onChange={(e) => handleFilterChange('search', e.target.value)}
                            />
                            <Input
                                type="date"
                                placeholder="Start Date"
                                value={filters.startDate}
                                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                            />
                            <Input
                                type="date"
                                placeholder="End Date"
                                value={filters.endDate}
                                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                            />
                            <Select
                                value={filters.paymentMethod || "all"}
                                onValueChange={(value) => handleFilterChange('paymentMethod', value === "all" ? "" : value)}
                            >
                                <SelectTrigger>
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

                        {/* Debug info */}
                        <div className="mb-4 text-xs text-muted-foreground bg-muted p-2 rounded">
                            Debug: Page {currentPage} of {totalPages} | 
                            Filtered: {filteredData.length} | 
                            Paginated: {paginatedData.length} | 
                            Loading: {isLoading ? "Yes" : "No"}
                        </div>

                        {/* Results count */}
                        <div className="mb-4 text-sm text-muted-foreground">
                            {filteredData.length > 0 ? (
                                `Showing ${startIndex} to ${endIndex} of ${filteredData.length} results`
                            ) : (
                                !isLoading && "No results found"
                            )}
                        </div>

                        {/* Data Table */}
                        {isLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                <span className="ml-2 text-muted-foreground">Loading returns...</span>
                            </div>
                        ) : (
                            <>
                                <div className="border rounded-lg overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-muted/50 border-b">
                                                <tr>
                                                    <th className="text-left p-3 font-medium text-sm">Receipt No.</th>
                                                    <th className="text-left p-3 font-medium text-sm">Date/Time</th>
                                                    <th className="text-left p-3 font-medium text-sm">Subtotal</th>
                                                    <th className="text-left p-3 font-medium text-sm">Fine Amount</th>
                                                    <th className="text-left p-3 font-medium text-sm">Payment Method</th>
                                                    <th className="text-left p-3 font-medium text-sm">Status</th>
                                                    <th className="text-left p-3 font-medium text-sm">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {paginatedData.length > 0 ? (
                                                    paginatedData.map((returnItem: any, index: number) => (
                                                        <tr key={`${returnItem.id}-${index}`} className={`border-b hover:bg-muted/30 transition-colors ${index % 2 === 0 ? 'bg-background' : 'bg-muted/10'}`}>
                                                            <td className="p-3">
                                                                <span
                                                                    className="font-medium text-primary font-mono cursor-pointer hover:underline"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        navigator.clipboard.writeText(returnItem.receipt_number);
                                                                        toast({
                                                                            title: "Copied!",
                                                                            description: `Receipt ${returnItem.receipt_number} copied to clipboard`,
                                                                            duration: 1500
                                                                        });
                                                                    }}
                                                                >
                                                                    {returnItem.receipt_number}
                                                                </span>
                                                            </td>
                                                            <td className="p-3">
                                                                <div>
                                                                    <p className="text-sm">{format(new Date(returnItem.created_at), 'dd/MM/yyyy')}</p>
                                                                    <p className="text-xs text-muted-foreground">{format(new Date(returnItem.created_at), 'HH:mm:ss')}</p>
                                                                </div>
                                                            </td>
                                                            <td className="p-3">
                                                                <span className="font-semibold">{formatPKR(parseFloat(returnItem.subtotal) || 0)}</span>
                                                            </td>
                                                            <td className="p-3">
                                                                <div className="relative group">
                                                                    {parseFloat(returnItem.return_fee || '0') > 0 ? (
                                                                        <>
                                                                            <span className="font-semibold text-red-600 dark:text-red-400">{formatPKR(parseFloat(returnItem.return_fee))}</span>
                                                                            {returnItem.fine_reason && (
                                                                                <p className="text-xs text-muted-foreground">{returnItem.fine_reason}</p>
                                                                            )}
                                                                            {returnItem.return_reason && (
                                                                                <div className="absolute bottom-full left-0 mb-1 hidden group-hover:block z-10">
                                                                                    <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                                                                                        Return Reason: {returnItem.return_reason}
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </>
                                                                    ) : (
                                                                        <span className="text-muted-foreground">-</span>
                                                                    )}
                                                                </div>
                                                             </td>
                                                            <td className="p-3">
                                                                <Badge className={getPaymentMethodColor(returnItem.payment_method)} variant="secondary">
                                                                    {returnItem.payment_method?.toUpperCase()}
                                                                </Badge>
                                                             </td>
                                                            <td className="p-3">
                                                                <Badge className={getStatusColor(returnItem.payment_status)} variant="secondary">
                                                                    {returnItem.payment_status?.toUpperCase()}
                                                                </Badge>
                                                             </td>
                                                            <td className="p-3">
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    onClick={() => handleViewDetails(returnItem.id)}
                                                                >
                                                                    <Eye className="h-4 w-4" />
                                                                </Button>
                                                             </td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr>
                                                        <td colSpan={7} className="text-center p-8 text-muted-foreground">
                                                            No returns found. Debug: filteredData={filteredData.length}, paginatedData={paginatedData.length}
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Pagination Controls */}
                                {totalPages > 1 && (
                                    <div className="flex items-center justify-between mt-4 pt-4 border-t">
                                        <div className="text-sm text-muted-foreground">
                                            Page {currentPage} of {totalPages}
                                        </div>
                                        <div className="flex space-x-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    console.log(`Going to page ${currentPage - 1}`);
                                                    setCurrentPage(p => Math.max(1, p - 1));
                                                }}
                                                disabled={currentPage === 1}
                                            >
                                                <ChevronLeft className="h-4 w-4 mr-1" />
                                                Previous
                                            </Button>
                                            <div className="flex space-x-1">
                                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                                    let pageNum;
                                                    if (totalPages <= 5) {
                                                        pageNum = i + 1;
                                                    } else if (currentPage <= 3) {
                                                        pageNum = i + 1;
                                                    } else if (currentPage >= totalPages - 2) {
                                                        pageNum = totalPages - 4 + i;
                                                    } else {
                                                        pageNum = currentPage - 2 + i;
                                                    }
                                                    
                                                    return (
                                                        <Button
                                                            key={pageNum}
                                                            variant={currentPage === pageNum ? "default" : "outline"}
                                                            size="sm"
                                                            onClick={() => {
                                                                console.log(`Going to page ${pageNum}`);
                                                                setCurrentPage(pageNum);
                                                            }}
                                                            className="w-10"
                                                        >
                                                            {pageNum}
                                                        </Button>
                                                    );
                                                })}
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    console.log(`Going to page ${currentPage + 1}`);
                                                    setCurrentPage(p => Math.min(totalPages, p + 1));
                                                }}
                                                disabled={currentPage === totalPages}
                                            >
                                                Next
                                                <ChevronRight className="h-4 w-4 ml-1" />
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}