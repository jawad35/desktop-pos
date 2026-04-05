import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { DataTable } from "@/components/ui/data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { formatPKR } from "@/lib/currency";
import { Sale } from "@/types/api";
import {
  Plus,
  Upload,
  Printer,
  Download,
  Share,
  Cloud,
  Search,
  Filter
} from "lucide-react";
import { format } from "date-fns";
import { useHeader } from "@/contexts/HeaderContext";

export default function ReceiptManagement() {
  const [filters, setFilters] = useState({
    search: "",
    paymentMethod: "",
    status: "",
    startDate: "",
    endDate: "",
  });

  const { data: receipts = [], isLoading } = useQuery<Sale[]>({
    queryKey: ["/api/sales", filters],
  });

  const handlePrint = (receiptId: string) => {
    // Implement print functionality
    console.log(`Printing receipt ${receiptId}`);
  };

  const handleDownload = (receiptId: string) => {
    // Implement download functionality
    console.log(`Downloading receipt ${receiptId}`);
  };

  const handleWhatsAppShare = (receiptId: string) => {
    // Implement WhatsApp sharing
    console.log(`Sharing receipt ${receiptId} on WhatsApp`);
  };

  const handleDriveUpload = (receiptId: string) => {
    // Implement Google Drive upload
    console.log(`Uploading receipt ${receiptId} to Google Drive`);
  };

  const handleExport = async () => {
    try {
      const queryParams = new URLSearchParams(filters).toString();
      const response = await fetch(`/api/export/sales?${queryParams}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'receipts.csv';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
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
      key: 'receiptNumber' as const,
      label: 'Receipt No.',
      render: (value: string) => (
        <span className="font-medium text-primary">#{value}</span>
      ),
    },
    {
      key: 'createdAt' as const,
      label: 'Date/Time',
      render: (value: string) => format(new Date(value), 'dd/MM/yyyy HH:mm'),
    },
    {
      key: 'customerName' as const,
      label: 'Customer',
      render: (value: string) => value || 'Walk-in Customer',
    },
    {
      key: 'total' as const,
      label: 'Amount',
      render: (value: string) => (
        <span className="font-semibold">{formatPKR(value)}</span>
      ),
    },
    {
      key: 'paymentMethod' as const,
      label: 'Payment Method',
    },
    {
      key: 'paymentStatus' as const,
      label: 'Status',
      render: (value: string) => (
        <Badge className={getStatusColor(value)} variant="secondary">
          {value.toUpperCase()}
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
            onClick={() => handlePrint(value)}
            data-testid={`button-print-${value}`}
          >
            <Printer className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleDownload(value)}
            data-testid={`button-download-${value}`}
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleWhatsAppShare(value)}
            className="text-green-600 hover:text-green-700"
            data-testid={`button-whatsapp-${value}`}
          >
            <Share className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleDriveUpload(value)}
            className="text-blue-600 hover:text-blue-700"
            data-testid={`button-drive-${value}`}
          >
            <Cloud className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const { setTitle, setSubtitle } = useHeader();

  useEffect(() => {
    setTitle("Receipt Management");
    setSubtitle("Manage and share customer receipts");
  }, []);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <main className="flex-1 overflow-auto p-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Receipt Records</CardTitle>
              <div className="flex space-x-2">
                <Button variant="outline" data-testid="button-bulk-upload">
                  <Upload className="h-4 w-4 mr-2" />
                  Bulk Upload
                </Button>
                <Button data-testid="button-new-receipt">
                  <Plus className="h-4 w-4 mr-2" />
                  New Receipt
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
              <div>
                <Input
                  placeholder="Search receipts..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  data-testid="input-search-receipts"
                />
              </div>
              <div>
                <Select
                  value={filters.status}
                  onValueChange={(value) => setFilters({ ...filters, status: value })}
                >
                  <SelectTrigger data-testid="select-status">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                  data-testid="input-filter-start-date"
                />
              </div>
              <div>
                <Input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                  data-testid="input-filter-end-date"
                />
              </div>
              <div>
                <Select
                  value={filters.paymentMethod}
                  onValueChange={(value) => setFilters({ ...filters, paymentMethod: value })}
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

                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Data Table */}
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-2 text-muted-foreground">Loading receipts...</span>
              </div>
            ) : (
              <DataTable
                data={receipts}
                columns={columns}
                searchPlaceholder="Search receipts..."
                onExport={handleExport}
              />
            )}
          </CardContent>
        </Card>

        {/* Receipt Actions Info */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Receipt Actions Guide</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg">
                <Printer className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-medium">Printer Receipt</p>
                  <p className="text-sm text-muted-foreground">Printer physical receipt</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg">
                <Download className="h-8 w-8 text-secondary" />
                <div>
                  <p className="font-medium">Download PDF</p>
                  <p className="text-sm text-muted-foreground">Save as PDF file</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg">
                <Share className="h-8 w-8 text-green-600" />
                <div>
                  <p className="font-medium">WhatsApp Share</p>
                  <p className="text-sm text-muted-foreground">Send via WhatsApp</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg">
                <Cloud className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="font-medium">Google Drive</p>
                  <p className="text-sm text-muted-foreground">Upload to cloud</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
