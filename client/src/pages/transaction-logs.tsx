import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DataTable } from "@/components/ui/data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { formatPKR } from "@/lib/currency";
import { Download, Filter } from "lucide-react";
import { format } from "date-fns";
import { formatExpenseLogType, getTransactionTypeColor } from "@/utils/Contants";
import { useHeader } from "@/contexts/HeaderContext";
import { api } from "../services/electron-api";
import { useToast } from "@/hooks/use-toast";

export default function TransactionLogs() {
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    type: "all",
    userId: "",
  });
  const { toast } = useToast();

  const { data: logs = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ["transaction-logs", filters],
    queryFn: async () => {
      const result = await api.getTransactionLogs();
      let allLogs = [];
      
      if (Array.isArray(result)) {
        allLogs = result;
      } else if (result?.success && Array.isArray(result.data)) {
        allLogs = result.data;
      } else {
        return [];
      }
      
      // Apply filters locally
      let filtered = allLogs;
      
      if (filters.startDate) {
        filtered = filtered.filter(log =>
          new Date(log.created_at) >= new Date(filters.startDate)
        );
      }
      
      if (filters.endDate) {
        filtered = filtered.filter(log =>
          new Date(log.created_at) <= new Date(filters.endDate)
        );
      }
      
      if (filters.type && filters.type !== "all") {
        filtered = filtered.filter(log => log.type === filters.type);
      }
      
      if (filters.userId) {
        filtered = filtered.filter(log => log.user_id === filters.userId);
      }
      
      // Sort by created_at descending
      filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      // Map snake_case to camelCase for component compatibility
      return filtered.map(log => ({
        id: log.id,
        transactionId: log.transaction_id,
        type: log.type,
        amount: log.amount,
        description: log.description,
        paymentMethod: log.payment_method,
        cashFlow: log.cash_flow,
        userId: log.user_id,
        shopId: log.shop_id,
        relatedId: log.related_id,
        createdAt: log.created_at,
      }));
    },
  });

  const handleExport = async () => {
    try {
      const result = await api.getTransactionLogs();
      let allLogs = [];
      
      if (Array.isArray(result)) {
        allLogs = result;
      } else if (result?.success && Array.isArray(result.data)) {
        allLogs = result.data;
      }
      
      // Apply filters
      let filtered = allLogs;
      
      if (filters.startDate) {
        filtered = filtered.filter(log =>
          new Date(log.created_at) >= new Date(filters.startDate)
        );
      }
      if (filters.endDate) {
        filtered = filtered.filter(log =>
          new Date(log.created_at) <= new Date(filters.endDate)
        );
      }
      if (filters.type && filters.type !== "all") {
        filtered = filtered.filter(log => log.type === filters.type);
      }
      
      const headers = ['Date', 'Transaction ID', 'Type', 'Amount', 'Description', 'Payment Method', 'Cash Flow'];
      const csvRows = [headers];
      
      for (const log of filtered) {
        csvRows.push([
          format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss'),
          log.transaction_id || '',
          log.type || '',
          log.amount?.toString() || '0',
          log.description || '',
          log.payment_method || '',
          log.cash_flow || ''
        ]);
      }
      
      const csvContent = csvRows.map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'transaction-logs.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Export Successful",
        description: "Transaction logs have been exported to CSV",
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export transaction logs",
        variant: "destructive",
      });
    }
  };

  const columns = [
    {
      key: 'createdAt' as const,
      label: 'Date/Time',
      render: (value: string) => format(new Date(value), 'dd/MM/yyyy HH:mm:ss'),
    },
    {
      key: 'transactionId' as const,
      label: 'Transaction ID',
      render: (value: string) => (
        <span className="font-medium font-mono">{value}</span>
      ),
    },
    {
      key: 'type' as const,
      label: 'Type',
      render: (value: string) => (
        <Badge className={getTransactionTypeColor(value)} variant="secondary">
          {formatExpenseLogType(value)}
        </Badge>
      ),
    },
    {
      key: 'amount' as const,
      label: 'Amount',
      render: (value: string, row: any) => (
        <span className={`font-semibold ${row.type === 'sale' ? 'text-secondary' :
          row.type === 'purchase' || row.type === 'expense' ? 'text-destructive' :
            'text-foreground'
          }`}>
          {formatPKR(value)}
        </span>
      ),
    },
    {
      key: 'description' as const,
      label: 'Description',
      render: (value: string) => (
        <span className="text-sm text-muted-foreground max-w-xs truncate">
          {value}
        </span>
      ),
    },
  ];

  const { setTitle, setSubtitle } = useHeader();

  useEffect(() => {
    setTitle("Transaction Logs");
    setSubtitle("Complete audit trail of all transactions");
  }, []);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <main className="flex-1 overflow-auto p-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Transaction History</CardTitle>
              <div className="flex space-x-2">
                <Button onClick={handleExport} variant="outline" data-testid="button-export-logs">
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Start Date
                </label>
                <Input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                  data-testid="input-start-date"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  End Date
                </label>
                <Input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                  data-testid="input-end-date"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Transaction Type
                </label>
                <Select
                  value={filters.type || "all"}
                  onValueChange={(value) =>
                    setFilters({ ...filters, type: value === "all" ? "" : value })
                  }
                >
                  <SelectTrigger data-testid="select-type">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="sale">Sale</SelectItem>
                    <SelectItem value="purchase">Purchase</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="return">Return</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Actions
                </label>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setFilters({ startDate: "", endDate: "", type: "", userId: "" })}
                  data-testid="button-clear-filters"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
              </div>
            </div>

            {/* Data Table */}
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-2 text-muted-foreground">Loading transaction logs...</span>
              </div>
            ) : (
              <DataTable
                data={logs}
                columns={columns}
                searchPlaceholder="Search transaction logs..."
                onExport={handleExport}
              />
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}