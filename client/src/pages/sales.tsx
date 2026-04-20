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
import { Eye, Download, ChevronRight, ChevronLeft, RotateCcw } from "lucide-react";
import { useHeader } from "@/contexts/HeaderContext";
import { useLocation } from "wouter";
import { getPaymentMethodColor } from "@/utils/GetPaymentMethodColor";
import { api } from "../services/electron-api";
import { useToast } from "@/hooks/use-toast";

export default function Sales() {
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    paymentMethod: "",
    search: "",
    shopId: ""
  });
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const pageSize = 50;
  const [page, setPage] = useState(1);



  const { data: sales = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ["sales", filters, page],
    queryFn: async () => {
      const result = await api.getSales();
      let allSales = [];

      if (Array.isArray(result)) {
        allSales = result;
      } else if (result?.success && Array.isArray(result.data)) {
        allSales = result.data;
      } else {
        return [];
      }

      let filtered = allSales;

      if (filters.search) {
        const search = filters.search.toLowerCase();
        filtered = filtered.filter(sale =>
          sale.receipt_number?.toLowerCase().includes(search) ||
          sale.customer_name?.toLowerCase().includes(search) ||
          sale.customer_phone?.toLowerCase().includes(search)
        );
      }

      if (filters.startDate) {
        filtered = filtered.filter(sale =>
          new Date(sale.created_at) >= new Date(filters.startDate)
        );
      }

      if (filters.endDate) {
        filtered = filtered.filter(sale =>
          new Date(sale.created_at) <= new Date(filters.endDate)
        );
      }

      if (filters.paymentMethod && filters.paymentMethod !== 'all') {
        filtered = filtered.filter(sale =>
          sale.payment_method === filters.paymentMethod
        );
      }

      filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      const start = (page - 1) * pageSize;
      const paginated = filtered.slice(start, start + pageSize);

      return paginated;
    },
    keepPreviousData: true,

  });

  const handleExport = async () => {
    try {
      const result = await api.getSales();
      let allSales = [];

      if (Array.isArray(result)) {
        allSales = result;
      } else if (result?.success && Array.isArray(result.data)) {
        allSales = result.data;
      }

      let filtered = allSales;

      if (filters.search) {
        const search = filters.search.toLowerCase();
        filtered = filtered.filter(sale =>
          sale.receipt_number?.toLowerCase().includes(search) ||
          sale.customer_name?.toLowerCase().includes(search)
        );
      }
      if (filters.startDate) {
        filtered = filtered.filter(sale =>
          new Date(sale.created_at) >= new Date(filters.startDate)
        );
      }
      if (filters.endDate) {
        filtered = filtered.filter(sale =>
          new Date(sale.created_at) <= new Date(filters.endDate)
        );
      }
      if (filters.paymentMethod && filters.paymentMethod !== 'all') {
        filtered = filtered.filter(sale =>
          sale.payment_method === filters.paymentMethod
        );
      }

      const headers = ['Receipt No', 'Date', 'Customer Name', 'Customer Phone', 'Subtotal', 'Tax', 'Total', 'Payment Method', 'Status'];
      const csvRows = [headers];

      for (const sale of filtered) {
        csvRows.push([
          sale.receipt_number || '',
          format(new Date(sale.created_at), 'dd/MM/yyyy HH:mm'),
          sale.customer_name || 'Walk-in Customer',
          sale.customer_phone || '',
          sale.subtotal?.toString() || '0',
          sale.tax?.toString() || '0',
          sale.total?.toString() || '0',
          sale.payment_method || '',
          sale.payment_status || ''
        ]);
      }

      const csvContent = csvRows.map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'sales.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Export Successful",
        description: "Sales data has been exported to CSV",
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export sales data",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    refetch();
  }, []);

  // Also add this to refresh when page changes
  useEffect(() => {
    refetch();
  }, [page, filters]);

  const handleViewDetails = (saleId: string) => {
    const state = "sales"
    console.log(saleId)
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

  // Add this function with your other handlers in Sales component
  const handleReturnFromSale = (receiptNumber: string) => {
    console.log(`Processing return for sale receipt: ${receiptNumber}`);

    // Store the receipt number in sessionStorage to pass to POS page
    sessionStorage.setItem('returnReceiptNumber', receiptNumber);
    sessionStorage.setItem('returnMode', 'true');

    // Navigate to orders page (adjust the path if needed - could be '/pos/orders' or '/orders')
    navigate('/pos');

    toast({
      title: "Return Mode Activated",
      description: `Preparing return for receipt: ${receiptNumber}`,
    });
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
    {
      key: 'total_profit' as const,
      label: 'Profit',
      render: (value: string) => (
        <Badge className={'bg-secondary/10 text-secondary'} variant="secondary">
          {value}
        </Badge>
      ),
    },
    {
      key: 'actions' as const,  // Changed from 'id' to 'actions' for clarity
      label: 'Actions',
      // Make sure row contains the full sale object with receipt_number
      render: (_: any, row: any) => (  // Use row parameter to access full sale data
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleViewDetails(row.id)}  // Use row.id
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleReturnFromSale(row.receipt_number)}  // Use row.receipt_number
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            title="Return this sale"
            disabled={row.return_status === 'full'}  // Disable if fully returned
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const totalSalesAmount = sales.reduce((sum: number, sale: any) => sum + parseFloat(sale.total || 0), 0);
  const completedSales = sales.filter((sale: any) => sale?.payment_status === 'completed');
  const pendingSales = sales.filter((sale: any) => sale?.payment_status === 'pending');
  const totalCount = sales.length;
  const totalPages = Math.ceil(totalCount / pageSize);

  const PaginationControls = () => (
    <div className="flex items-center justify-between space-x-2 py-4">
      <div className="flex-1 text-sm text-muted-foreground">
        Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, totalCount)} of {totalCount} sales
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
      </div>
    </div>
  );

  const { setTitle, setSubtitle } = useHeader();

  useEffect(() => {
    setTitle("Sales");
    setSubtitle("View and manage all sales transactions");
  }, []);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <main className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Sales</p>
                  <p className="text-2xl font-bold text-foreground">{sales.length}</p>
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
            <div className="flex items-center justify-between">
              <CardTitle>Sales History</CardTitle>
              <Button onClick={handleExport} variant="outline" data-testid="button-export-sales">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Input
                placeholder="Search sales..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                data-testid="input-search-sales"
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

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-2 text-muted-foreground">Loading sales...</span>
              </div>
            ) : (
              <DataTable
                data={sales}
                columns={columns}
                searchPlaceholder="Search sales..."
                onExport={handleExport}
              />
            )}
            <PaginationControls />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}