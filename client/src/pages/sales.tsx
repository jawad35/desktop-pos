import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { DataTable } from "@/components/ui/data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { formatPKR } from "@/lib/currency";
import { format } from "date-fns";
import { Eye, Download, ChevronRight, ChevronLeft, RotateCcw, Keyboard } from "lucide-react";
import { useHeader } from "@/contexts/HeaderContext";
import { useLocation } from "wouter";
import { getPaymentMethodColor } from "@/utils/GetPaymentMethodColor";
import { api } from "../services/electron-api";
import { useToast } from "@/hooks/use-toast";
import { useLoginType } from "@/hooks/useLoginType";
import { KeyboardShortcutsModal } from "../components/modals/KeyboardShortcutsModal";
import { useNavigation } from "../App";

// Storage keys
const STORAGE_KEYS = {
  SALES_PAGE: 'sales_current_page',
  SALES_FILTERS: 'sales_filters',
  SALES_SCROLL_POSITION: 'sales_scroll_position'
};

// Keyboard shortcuts for Sales page
const shortcuts = [
  { key: "Ctrl + E", description: "Export Sales to CSV" },
  { key: "Ctrl + C", description: "Clear All Filters" },
  { key: "Ctrl + F", description: "Focus Search Bar" },
  { key: "←", description: "Previous Page" },
  { key: "→", description: "Next Page" },
];

export default function Sales() {
  const pageSize = 50;
  const [location] = useLocation();

  // Load saved state
  const loadSavedPage = () => {
    try {
      const savedPage = localStorage.getItem(STORAGE_KEYS.SALES_PAGE);
      const page = savedPage ? parseInt(savedPage, 10) : 1;
      console.log(`Loading saved sales page: ${page}`);
      return isNaN(page) ? 1 : Math.max(1, page);
    } catch (error) {
      return 1;
    }
  };

  const loadSavedFilters = () => {
    try {
      const savedFilters = localStorage.getItem(STORAGE_KEYS.SALES_FILTERS);
      if (savedFilters) {
        const parsed = JSON.parse(savedFilters);
        console.log(`Loading saved sales filters:`, parsed);
        return {
          startDate: parsed.startDate || "",
          endDate: parsed.endDate || "",
          paymentMethod: parsed.paymentMethod || "",
          search: parsed.search || "",
        };
      }
    } catch (error) { }
    return {
      startDate: "",
      endDate: "",
      paymentMethod: "",
      search: "",
    };
  };

  const [filters, setFilters] = useState(loadSavedFilters);
  const [currentPage, setCurrentPage] = useState(loadSavedPage);
  const [allSalesData, setAllSalesData] = useState<any[]>([]);
  const [renderKey, setRenderKey] = useState(0);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const mainContentRef = useRef<HTMLDivElement>(null);
  const isFirstLoadRef = useRef(true);
  const { loginType } = useLoginType();
  const [showShortcuts, setShowShortcuts] = useState(false);
  // Fetch data
  const { isLoading, refetch } = useQuery<any[]>({
    queryKey: ["sales", location],
    queryFn: async () => {
      console.log("=== FETCHING SALES DATA ===");
      const result = await api.getSales();
      let allSales = [];

      if (Array.isArray(result)) {
        allSales = result;
      } else if (result?.success && Array.isArray(result.data)) {
        allSales = result.data;
      } else {
        console.log("No sales data found");
        return [];
      }

      // Sort by created_at descending
      allSales.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      console.log(`Loaded ${allSales.length} sales`);
      setAllSalesData(allSales);
      setRenderKey(prev => prev + 1);

      return allSales;
    },
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 0,
    cacheTime: 0,
  });

  // Apply filters using useMemo
  const filteredData = useMemo(() => {
    console.log("=== COMPUTING FILTERED SALES DATA ===");
    console.log(`All sales data length: ${allSalesData.length}`);

    if (allSalesData.length === 0) {
      console.log("No data to filter");
      return [];
    }

    let filtered = [...allSalesData];

    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(sale =>
        sale.receipt_number?.toLowerCase().includes(search) ||
        sale.customer_name?.toLowerCase().includes(search) ||
        sale.customer_phone?.toLowerCase().includes(search)
      );
      console.log(`After search filter: ${filtered.length} records`);
    }

    if (filters.startDate) {
      filtered = filtered.filter(sale =>
        new Date(sale.created_at) >= new Date(filters.startDate)
      );
      console.log(`After start date filter: ${filtered.length} records`);
    }

    if (filters.endDate) {
      filtered = filtered.filter(sale =>
        new Date(sale.created_at) <= new Date(filters.endDate)
      );
      console.log(`After end date filter: ${filtered.length} records`);
    }

    if (filters.paymentMethod && filters.paymentMethod !== 'all') {
      filtered = filtered.filter(sale =>
        sale.payment_method === filters.paymentMethod
      );
      console.log(`After payment method filter: ${filtered.length} records`);
    }

    console.log(`Final filtered count: ${filtered.length}`);
    return filtered;
  }, [allSalesData, filters]);

  // Apply pagination using useMemo
  const paginatedData = useMemo(() => {
    console.log("=== COMPUTING PAGINATED SALES DATA ===");
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
      } else if (currentPage > totalPages) {
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

  // Save to localStorage whenever state changes
  useEffect(() => {
    if (!isFirstLoadRef.current) {
      console.log(`Saving to localStorage - Page: ${currentPage}, Filters:`, filters);
      localStorage.setItem(STORAGE_KEYS.SALES_PAGE, currentPage.toString());
      localStorage.setItem(STORAGE_KEYS.SALES_FILTERS, JSON.stringify(filters));
    }
  }, [currentPage, filters]);

  // Restore scroll position
  useEffect(() => {
    if (!isLoading && paginatedData.length > 0 && mainContentRef.current && !isFirstLoadRef.current) {
      const savedScrollPosition = localStorage.getItem(STORAGE_KEYS.SALES_SCROLL_POSITION);
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
      localStorage.setItem(STORAGE_KEYS.SALES_SCROLL_POSITION, mainContentRef.current.scrollTop.toString());
    }
  }, []);

  const handleFilterChange = (key: string, value: any) => {
    console.log(`Filter changed: ${key} = ${value}`);
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    console.log("Reset button clicked");
    localStorage.removeItem(STORAGE_KEYS.SALES_PAGE);
    localStorage.removeItem(STORAGE_KEYS.SALES_FILTERS);
    localStorage.removeItem(STORAGE_KEYS.SALES_SCROLL_POSITION);
    setFilters({ startDate: "", endDate: "", paymentMethod: "", search: "" });
    setCurrentPage(1);
    isFirstLoadRef.current = true;
    setRenderKey(prev => prev + 1);
    toast({ title: "Reset", description: "All filters and pagination have been reset" });
    refetch();
  };

  const handleExport = async () => {
    try {
      const headers = ['Receipt No', 'Date', 'Customer Name', 'Customer Phone', 'Subtotal', 'Tax', 'Total', 'Payment Method', 'Status', 'Return Status', 'Returned Amount'];
      const csvRows = [headers];

      for (const sale of filteredData) {
        csvRows.push([
          `"${sale.receipt_number || ''}"`,
          `"${format(new Date(sale.created_at), 'dd/MM/yyyy HH:mm')}"`,
          `"${sale.customer_name || 'Walk-in Customer'}"`,
          `"${sale.customer_phone || ''}"`,
          sale.subtotal?.toString() || '0',
          sale.tax?.toString() || '0',
          sale.total?.toString() || '0',
          `"${sale.payment_method || ''}"`,
          `"${sale.payment_status || ''}"`,
          `"${sale.return_status || 'none'}"`,
          sale.total_returned_amount?.toString() || '0'
        ]);
      }

      const csvContent = csvRows.map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sales_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({ title: "Export Successful", description: `Exported ${filteredData.length} sales to CSV` });
    } catch (error) {
      console.error('Export failed:', error);
      toast({ title: "Export Failed", description: "Failed to export sales data", variant: "destructive" });
    }
  };
  const { navigateTo } = useNavigation();
  const handleViewDetails = (saleId: string) => {
    navigateTo(`/item-details/${saleId}/sales`);
  };

  const handleReturnFromSale = (receiptNumber: string) => {
    console.log(`Processing return for sale receipt: ${receiptNumber}`);
    sessionStorage.setItem('returnReceiptNumber', receiptNumber);
    sessionStorage.setItem('returnMode', 'true');
    navigate('/pos');
    toast({
      title: "Return Mode Activated",
      description: `Preparing return for receipt: ${receiptNumber}`,
    });
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
    {
      key: 'total' as const,
      label: 'Amount',
      render: (value: string) => (
        <span className="font-semibold text-foreground data-table">{formatPKR(value)}</span>
      ),
    },
    {
      key: 'payment_method' as const,
      label: 'Payment Method',
      render: (value: string) => (
        <Badge className={getPaymentMethodColor(value)} variant="secondary">
          {value?.toUpperCase() || '-'}
        </Badge>
      ),
    },
    {
      key: 'return_status' as const,
      label: 'Return Status',
      render: (value: string) => {
        switch (value) {
          case 'full':
            return <Badge className="bg-red-500 text-white whitespace-nowrap">Fully Returned</Badge>;
          case 'partial':
            return <Badge className="bg-yellow-500 text-white whitespace-nowrap">Partially Returned</Badge>;
          case 'none':
            return <Badge variant="outline" className="whitespace-nowrap">No Return</Badge>;
          default:
            return <Badge variant="outline" className="whitespace-nowrap">No Return</Badge>;
        }
      },
    },
    {
      key: 'total_returned_amount' as const,
      label: 'Returned Amount',
      render: (value: number) => (
        <span className="text-destructive font-semibold">
          {value && value > 0 ? formatPKR(value) : '-'}
        </span>
      ),
    },
    ...(loginType === "admin" ? [{
      key: 'total_profit' as const,
      label: 'Profit',
      render: (value: string) => (
        <Badge className={'bg-secondary/10 text-secondary'} variant="secondary">
          {formatPKR(value)}
        </Badge>
      ),
    }] : []),
    {
      key: 'actions' as const,
      label: 'Actions',
      render: (_: any, row: any) => (
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleViewDetails(row.id)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleReturnFromSale(row.receipt_number)}
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            title="Return this sale"
            disabled={row.return_status === 'full'}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ].filter(Boolean);

  const totalSalesAmount = filteredData.reduce((sum: number, sale: any) => sum + parseFloat(sale.total || 0), 0);
  const completedSales = filteredData.filter((sale: any) => sale?.payment_status === 'completed');
  const pendingSales = filteredData.filter((sale: any) => sale?.payment_status === 'pending');
  const totalCount = filteredData.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const startIndex = totalCount > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const endIndex = Math.min(currentPage * pageSize, totalCount);

  const { setTitle, setSubtitle } = useHeader();

  // Keyboard Shortcuts
  useEffect(() => {
    const handleShortcuts = (e: KeyboardEvent) => {
      // Don't trigger if typing in input fields
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable) {
        return;
      }

      // Ctrl + E - Export
      if (e.ctrlKey && e.key === 'e') {
        e.preventDefault();
        e.stopPropagation();
        handleExport();
        return;
      }

      // Ctrl + C - Clear Filters
      if (e.ctrlKey && e.key === 'c') {
        e.preventDefault();
        e.stopPropagation();
        handleResetFilters();
        return;
      }

      // Ctrl + F - Focus Search
      if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        e.stopPropagation();
        const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        }
        return;
      }

      // Arrow Left - Previous Page
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        e.stopPropagation();
        if (currentPage > 1) {
          setCurrentPage(p => p - 1);
        }
        return;
      }

      // Arrow Right - Next Page
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        e.stopPropagation();
        if (currentPage < totalPages) {
          setCurrentPage(p => p + 1);
        }
        return;
      }
    };

    window.addEventListener('keydown', handleShortcuts);
    return () => window.removeEventListener('keydown', handleShortcuts);
  }, [currentPage, totalPages]);

  useEffect(() => {
    setTitle("Sales");
    setSubtitle("View and manage all sales transactions");
  }, []);

  
  return (
    <div className="flex-1 flex flex-col overflow-hidden" key={renderKey}>
      <main
        ref={mainContentRef}
        className="flex-1 overflow-auto p-6"
        onScroll={handleScroll}
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Sales</p>
                  <p className="text-2xl font-bold text-foreground">{totalCount}</p>
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
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold text-secondary">{formatPKR(totalSalesAmount)}</p>
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
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold text-secondary">{completedSales.length}</p>
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
                  <p className="text-2xl font-bold text-accent">{pendingSales.length}</p>
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
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <CardTitle>Sales History</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowShortcuts(true)}
                  className="h-8 w-8"
                  title="Keyboard Shortcuts"
                >
                  <Keyboard className="h-4 w-4" />
                </Button>
                <KeyboardShortcutsModal
                  open={showShortcuts}
                  onOpenChange={setShowShortcuts}
                  title="Sales Page Shortcuts"
                  shortcuts={shortcuts}
                />
              </div>
              <div className="flex space-x-2">
                <Button onClick={handleResetFilters} variant="outline" size="sm">
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

            <div className="mb-4 text-xs text-muted-foreground bg-muted p-2 rounded">
              Debug: Page {currentPage} of {totalPages} |
              Filtered: {totalCount} |
              Paginated: {paginatedData.length} |
              Loading: {isLoading ? "Yes" : "No"}
            </div>

            <div className="mb-4 text-sm text-muted-foreground">
              {totalCount > 0 ? (
                `Showing ${startIndex} to ${endIndex} of ${totalCount} results`
              ) : (
                !isLoading && "No results found"
              )}
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-2 text-muted-foreground">Loading sales...</span>
              </div>
            ) : (
              <>
                {/* Data Table - Custom like Returns page */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/50 border-b">
                        <tr>
                          {columns.map((column) => (
                            <th key={column.key} className="text-left p-3 font-medium text-sm">
                              {column.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedData.length > 0 ? (
                          paginatedData.map((sale: any, index: number) => (
                            <tr key={`${sale.id}-${index}`} className={`border-b hover:bg-muted/30 transition-colors ${index % 2 === 0 ? 'bg-background' : 'bg-muted/10'}`}>
                              {columns.map((column) => (
                                <td key={column.key} className="p-3">
                                  {column.render(sale[column.key], sale)}
                                </td>
                              ))}
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={columns.length} className="text-center p-8 text-muted-foreground">
                              No sales found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <div className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
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
                              onClick={() => setCurrentPage(pageNum)}
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
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
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