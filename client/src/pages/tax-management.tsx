import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatPKR } from "@/lib/currency";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { api } from "../services/electron-api";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  Calendar, Download, FileText, Banknote, CheckCircle, AlertCircle, 
  ChevronLeft, ChevronRight, Loader2, Clock, Building2, History, 
  RefreshCw, X, Edit, Trash2, Plus
} from "lucide-react";

interface TaxPeriod {
  periodName: string;
  periodStart: string;
  periodEnd: string;
  taxCollected: number;
  totalPaid: number;
  balanceDue: number;
  status: 'paid' | 'pending';
  payments: any[];
  transactionCount: number;
}

interface CustomTax {
  id: string;
  name: string;
  amount: number;
  date: string;
  notes: string;
  challanNumber: string;
  paymentMethod: string;
  taxType: string;
}

export default function TaxManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<TaxPeriod | null>(null);
  const [editingPayment, setEditingPayment] = useState<any | null>(null);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentNotes, setPaymentNotes] = useState("");
  const [challanNumber, setChallanNumber] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("bank");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Date picker filters
  const [startDate, setStartDate] = useState<string>(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  
  // Custom Tax States
  const [showCustomTaxDialog, setShowCustomTaxDialog] = useState(false);
  const [editingCustomTax, setEditingCustomTax] = useState<CustomTax | null>(null);
  const [customTaxName, setCustomTaxName] = useState("");
  const [customTaxAmount, setCustomTaxAmount] = useState(0);
  const [customTaxDate, setCustomTaxDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [customTaxNotes, setCustomTaxNotes] = useState("");
  const [customTaxChallan, setCustomTaxChallan] = useState("");
  const [customTaxMethod, setCustomTaxMethod] = useState("bank");
  const [customTaxType, setCustomTaxType] = useState("income_tax");
  
  // Custom Taxes State
  const [customTaxes, setCustomTaxes] = useState<CustomTax[]>(() => {
    const saved = localStorage.getItem('customTaxes');
    return saved ? JSON.parse(saved) : [];
  });

  // Save custom taxes to localStorage
  useEffect(() => {
    localStorage.setItem('customTaxes', JSON.stringify(customTaxes));
  }, [customTaxes]);

  // Fetch tax payments history
  const { data: taxPayments = [], refetch: refetchPayments, isLoading: paymentsLoading } = useQuery({
    queryKey: ["taxPayments"],
    queryFn: async () => {
      const result = await api.getTaxPayments();
      return Array.isArray(result) ? result : [];
    },
  });

  // Fetch all sales
  const { data: sales = [], isLoading: salesLoading, refetch: refetchSales } = useQuery({
    queryKey: ["sales"],
    queryFn: async () => {
      const result = await api.getSales();
      return Array.isArray(result) ? result : [];
    },
    refetchInterval: 10000,
  });

  // Calculate tax for a specific period
  const calculateTaxForPeriod = (startDate: Date, endDate: Date) => {
    const filteredSales = sales.filter(sale => {
      const saleDate = new Date(sale.created_at);
      return saleDate >= startDate && saleDate <= endDate;
    });
    
    let totalTax = 0;
    let transactionCount = 0;
    
    filteredSales.forEach(sale => {
      const subtotal = parseFloat(sale.subtotal) || 0;
      const taxRate = parseFloat(sale.tax) || 0;
      const taxAmount = (subtotal * taxRate) / 100;
      totalTax += taxAmount;
      transactionCount++;
    });
    
    return { totalTax, transactionCount };
  };

  // Generate monthly tax periods based on date range
  const monthlyPeriods = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const periods: TaxPeriod[] = [];
    
    // Get all months between start and end dates
    const currentDate = startOfMonth(start);
    const endMonth = endOfMonth(end);
    
    while (currentDate <= endMonth) {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      
      const { totalTax, transactionCount } = calculateTaxForPeriod(monthStart, monthEnd);
      
      // Get payments for this specific period
      const periodStartStr = format(monthStart, 'yyyy-MM-dd');
      const periodEndStr = format(monthEnd, 'yyyy-MM-dd');
      
      const periodPayments = taxPayments.filter((p: any) => 
        p.period_start === periodStartStr && p.period_end === periodEndStr
      );
      
      const totalPaid = periodPayments.reduce((sum: number, p: any) => sum + p.amount, 0);
      const balanceDue = totalTax - totalPaid;
      
      let status: 'paid' | 'pending' = 'pending';
      if (balanceDue <= 0 && totalTax > 0) {
        status = 'paid';
      } else if (totalTax === 0) {
        status = 'paid';
      }
      
      periods.push({
        periodName: format(monthStart, 'MMMM yyyy'),
        periodStart: periodStartStr,
        periodEnd: periodEndStr,
        taxCollected: totalTax,
        totalPaid: totalPaid,
        balanceDue: balanceDue > 0 ? balanceDue : 0,
        status,
        payments: periodPayments,
        transactionCount
      });
      
      // Move to next month
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
    
    return periods;
  }, [sales, taxPayments, startDate, endDate]);

  // Filter periods by status
  const filteredPeriods = useMemo(() => {
    let filtered = monthlyPeriods;
    
    if (statusFilter !== "all") {
      if (statusFilter === "paid") filtered = filtered.filter(p => p.status === 'paid' && p.taxCollected > 0);
      if (statusFilter === "pending") filtered = filtered.filter(p => p.status === 'pending' && p.taxCollected > 0);
    }
    
    return filtered;
  }, [monthlyPeriods, statusFilter]);

  // Custom Tax Functions
  const handleAddCustomTax = () => {
    if (!customTaxName || customTaxAmount <= 0) {
      toast({ title: "Error", description: "Please fill all required fields", variant: "destructive" });
      return;
    }
    
    const newTax: CustomTax = {
      id: editingCustomTax?.id || Date.now().toString(),
      name: customTaxName,
      amount: customTaxAmount,
      date: customTaxDate,
      notes: customTaxNotes,
      challanNumber: customTaxChallan,
      paymentMethod: customTaxMethod,
      taxType: customTaxType,
    };
    
    if (editingCustomTax) {
      setCustomTaxes(prev => prev.map(tax => tax.id === editingCustomTax.id ? newTax : tax));
      toast({ title: "Success", description: "Tax payment updated successfully" });
    } else {
      setCustomTaxes(prev => [...prev, newTax]);
      toast({ title: "Success", description: "Custom tax payment added successfully" });
    }
    
    resetCustomTaxForm();
    setShowCustomTaxDialog(false);
  };
  
  const handleEditCustomTax = (tax: CustomTax) => {
    setEditingCustomTax(tax);
    setCustomTaxName(tax.name);
    setCustomTaxAmount(tax.amount);
    setCustomTaxDate(tax.date);
    setCustomTaxNotes(tax.notes);
    setCustomTaxChallan(tax.challanNumber);
    setCustomTaxMethod(tax.paymentMethod);
    setCustomTaxType(tax.taxType);
    setShowCustomTaxDialog(true);
  };
  
  const handleDeleteCustomTax = (id: string) => {
    if (confirm("Are you sure you want to delete this tax payment?")) {
      setCustomTaxes(prev => prev.filter(tax => tax.id !== id));
      toast({ title: "Success", description: "Tax payment deleted successfully" });
    }
  };
  
  const handleEditSalesTaxPayment = (payment: any) => {
    setEditingPayment(payment);
    setPaymentAmount(payment.amount);
    setPaymentNotes(payment.notes || "");
    setChallanNumber(payment.challan_number || "");
    setPaymentMethod(payment.payment_method || "bank");
    setShowPaymentDialog(true);
  };
  
const handleUpdateSalesTaxPayment = async () => {
    if (!editingPayment) {
        console.log('No editing payment found');
        return;
    }
    
    console.log('Updating payment:', editingPayment.id);
    console.log('Update data:', {
        amount: paymentAmount,
        challan_number: challanNumber,
        payment_method: paymentMethod,
        notes: paymentNotes,
    });
    
    if (paymentAmount <= 0) {
        toast({ title: "Error", description: "Please enter a valid amount", variant: "destructive" });
        return;
    }
    
    if (!paymentNotes || paymentNotes.trim().length < 3) {
        toast({ title: "Error", description: "Please provide payment notes", variant: "destructive" });
        return;
    }
    
    if (!challanNumber || challanNumber.trim().length < 3) {
        toast({ title: "Error", description: "Please provide challan/reference number", variant: "destructive" });
        return;
    }

    setIsSubmitting(true);
    try {
        const result = await api.updateTaxPayment(editingPayment.id, {
            amount: paymentAmount,
            challan_number: challanNumber,
            payment_method: paymentMethod,
            notes: paymentNotes,
        });
        
        console.log('Update result:', result);
        
        if (result && result.success === false) {
            throw new Error(result.error || 'Update failed');
        }

        toast({ 
            title: "Success", 
            description: `Tax payment updated successfully` 
        });
        
        resetPaymentForm();
        
        // Force refetch with more aggressive approach
        await refetchPayments();
        await refetchSales();
        
        // Invalidate all related queries
        queryClient.invalidateQueries({ queryKey: ["taxPayments"] });
        queryClient.invalidateQueries({ queryKey: ["sales"] });
        
        // Additional force refetch
        setTimeout(async () => {
            await refetchPayments();
            await refetchSales();
        }, 500);
        
    } catch (error: any) {
        console.error('Update error:', error);
        toast({ title: "Error", description: error.message || "Failed to update payment", variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
};
  
  const resetCustomTaxForm = () => {
    setEditingCustomTax(null);
    setCustomTaxName("");
    setCustomTaxAmount(0);
    setCustomTaxDate(format(new Date(), 'yyyy-MM-dd'));
    setCustomTaxNotes("");
    setCustomTaxChallan("");
    setCustomTaxMethod("bank");
    setCustomTaxType("income_tax");
  };

  // Summary stats including custom taxes
  const totalTaxCollected = monthlyPeriods.reduce((sum, p) => sum + p.taxCollected, 0);
  const totalTaxPaid = monthlyPeriods.reduce((sum, p) => sum + p.totalPaid, 0);
  const totalCustomTaxes = customTaxes.reduce((sum, tax) => sum + tax.amount, 0);
  const totalBalanceDue = totalTaxCollected - totalTaxPaid;
  const pendingPeriods = monthlyPeriods.filter(p => p.status === 'pending' && p.taxCollected > 0).length;

  // Pagination
  const totalPages = Math.ceil(filteredPeriods.length / itemsPerPage);
  const paginatedPeriods = filteredPeriods.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refetchSales(), refetchPayments()]);
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["taxPayments"] });
      toast({ title: "Refreshed", description: "Tax data has been updated" });
    } catch (error) {
      console.error("Refresh error:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRecordPayment = async () => {
    if (!selectedPeriod) {
      toast({ title: "Error", description: "No period selected", variant: "destructive" });
      return;
    }
    
    if (paymentAmount <= 0) {
      toast({ title: "Error", description: "Please enter a valid amount", variant: "destructive" });
      return;
    }
    
    if (paymentAmount > selectedPeriod.balanceDue) {
      toast({ 
        title: "Payment Exceeds Balance", 
        description: `Maximum payment allowed is ${formatPKR(selectedPeriod.balanceDue)}.`,
        variant: "destructive" 
      });
      return;
    }
    
    if (!paymentNotes || paymentNotes.trim().length < 3) {
      toast({ title: "Error", description: "Please provide payment notes", variant: "destructive" });
      return;
    }
    
    if (!challanNumber || challanNumber.trim().length < 3) {
      toast({ title: "Error", description: "Please provide challan/reference number", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      await api.createTaxPayment({
        period_start: selectedPeriod.periodStart,
        period_end: selectedPeriod.periodEnd,
        amount: paymentAmount,
        challan_number: challanNumber,
        payment_method: paymentMethod,
        tax_type: "sales_tax",
        notes: paymentNotes,
        payment_date: new Date().toISOString(),
      });

      toast({ 
        title: "Success", 
        description: `Tax payment of ${formatPKR(paymentAmount)} recorded for ${selectedPeriod.periodName}` 
      });
      
      resetPaymentForm();
      await Promise.all([refetchPayments(), refetchSales()]);
      queryClient.invalidateQueries({ queryKey: ["taxPayments"] });
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetPaymentForm = () => {
    setShowPaymentDialog(false);
    setSelectedPeriod(null);
    setEditingPayment(null);
    setPaymentAmount(0);
    setPaymentNotes("");
    setChallanNumber("");
  };

  const handleExportReport = () => {
    const headers = ['Period', 'Tax Collected (PKR)', 'Tax Paid (PKR)', 'Balance Due (PKR)', 'Status', 'Transactions'];
    const rows = monthlyPeriods.map(p => [
      p.periodName,
      p.taxCollected.toFixed(2),
      p.totalPaid.toFixed(2),
      p.balanceDue.toFixed(2),
      p.status.toUpperCase(),
      p.transactionCount
    ]);
    
    // Add custom taxes summary
    rows.push(['', '', '', '', '', '']);
    rows.push(['CUSTOM TAXES', '', '', '', '', '']);
    customTaxes.forEach(tax => {
      rows.push([
        `${tax.name} (${tax.taxType})`,
        '',
        tax.amount.toFixed(2),
        '',
        '',
        format(new Date(tax.date), 'dd/MM/yyyy')
      ]);
    });
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tax_report_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({ title: "Export Successful", description: "Tax report exported" });
  };

  const resetFilters = () => {
    setStatusFilter("all");
    setStartDate(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    setEndDate(format(new Date(), 'yyyy-MM-dd'));
    setCurrentPage(1);
  };

  if (salesLoading || paymentsLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-lg">Loading tax data...</span>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
      <div className="p-4 lg:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Tax Management
            </h1>
            <p className="text-muted-foreground mt-1">
              Track sales tax and custom tax payments
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={handleRefresh} variant="outline" disabled={isRefreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={handleExportReport} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-muted-foreground">Sales Tax Collected</p>
                  <p className="text-2xl font-bold text-blue-600">{formatPKR(totalTaxCollected)}</p>
                  <p className="text-xs text-muted-foreground mt-1">From customer sales</p>
                </div>
                <FileText className="h-8 w-8 text-blue-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-muted-foreground">Sales Tax Paid</p>
                  <p className="text-2xl font-bold text-green-600">{formatPKR(totalTaxPaid)}</p>
                  <p className="text-xs text-muted-foreground mt-1">To government</p>
                </div>
                <Building2 className="h-8 w-8 text-green-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-l-4 border-l-orange-500">
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-muted-foreground">Other Taxes Paid</p>
                  <p className="text-2xl font-bold text-orange-600">{formatPKR(totalCustomTaxes)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Income, Professional, etc.</p>
                </div>
                <FileText className="h-8 w-8 text-orange-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className={totalBalanceDue > 0 ? "bg-gradient-to-br from-red-50 to-red-100 border-l-4 border-l-red-500" : "bg-gradient-to-br from-green-50 to-green-100 border-l-4 border-l-green-500"}>
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-muted-foreground">Sales Tax Balance</p>
                  <p className={`text-2xl font-bold ${totalBalanceDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatPKR(Math.abs(totalBalanceDue))}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {totalBalanceDue > 0 ? 'Need to pay' : 'All taxes paid'}
                  </p>
                </div>
                <AlertCircle className={`h-8 w-8 ${totalBalanceDue > 0 ? 'text-red-500' : 'text-green-500'} opacity-50`} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for Sales Tax and Other Taxes */}
        <Tabs defaultValue="sales-tax" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="sales-tax" className="flex items-center gap-2">
              <Banknote className="h-4 w-4" />
              Sales Tax
            </TabsTrigger>
            <TabsTrigger value="other-taxes" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Other Taxes (Income, Professional, etc.)
            </TabsTrigger>
          </TabsList>

          {/* Sales Tax Tab */}
          <TabsContent value="sales-tax" className="space-y-6">
            {/* Date Range Filters */}
            <Card className="shadow-md">
              <CardContent className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <Label>Start Date</Label>
                    <Input 
                      type="month" 
                      value={startDate.substring(0, 7)} 
                      onChange={(e) => {
                        const newStartDate = `${e.target.value}-01`;
                        setStartDate(newStartDate);
                        setCurrentPage(1);
                      }}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>End Date</Label>
                    <Input 
                      type="month" 
                      value={endDate.substring(0, 7)} 
                      onChange={(e) => {
                        const newEndDate = `${e.target.value}-01`;
                        setEndDate(newEndDate);
                        setCurrentPage(1);
                      }}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Months</SelectItem>
                        <SelectItem value="pending">Pending Payment</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button variant="outline" onClick={resetFilters} className="w-full">
                      <X className="h-4 w-4 mr-2" />
                      Reset Filters
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tax Periods Table */}
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-500" />
                  Monthly Tax Summary
                  {pendingPeriods > 0 && (
                    <Badge variant="destructive" className="ml-2">
                      {pendingPeriods} Month(s) Pending
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {filteredPeriods.length > 0 ? (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-muted/50 border-b">
                          <tr>
                            <th className="text-left p-3">Month</th>
                            <th className="text-right p-3">Tax Collected</th>
                            <th className="text-right p-3">Tax Paid</th>
                            <th className="text-right p-3">Balance</th>
                            <th className="text-center p-3">Status</th>
                            <th className="text-center p-3">Sales</th>
                            <th className="text-center p-3">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedPeriods.map((period) => (
                            <tr key={period.periodStart} className={`border-b hover:bg-muted/30 ${period.status === 'pending' && period.taxCollected > 0 ? 'bg-red-50/20' : ''}`}>
                              <td className="p-3 font-medium">
                                {period.periodName}
                                {period.transactionCount > 0 && (
                                  <p className="text-xs text-muted-foreground mt-1">{period.transactionCount} sale(s)</p>
                                )}
                              </td>
                              <td className="p-3 text-right text-blue-600 font-semibold">
                                {formatPKR(period.taxCollected)}
                              </td>
                              <td className="p-3 text-right text-green-600">
                                {formatPKR(period.totalPaid)}
                              </td>
                              <td className={`p-3 text-right font-semibold ${period.balanceDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {formatPKR(period.balanceDue)}
                              </td>
                              <td className="p-3 text-center">
                                {period.status === 'paid' ? (
                                  <Badge className="bg-green-500">✓ Paid</Badge>
                                ) : period.taxCollected === 0 ? (
                                  <Badge variant="outline">No Sales</Badge>
                                ) : (
                                  <Badge className="bg-red-500">⏰ Pending</Badge>
                                )}
                              </td>
                              <td className="p-3 text-center">
                                {period.transactionCount > 0 ? (
                                  <span className="text-sm">{period.transactionCount}</span>
                                ) : (
                                  <span className="text-sm text-muted-foreground">-</span>
                                )}
                              </td>
                              <td className="p-3 text-center">
                                {period.status === 'pending' && period.taxCollected > 0 && (
                                  <Button 
                                    size="sm" 
                                    onClick={() => {
                                      setSelectedPeriod(period);
                                      setPaymentAmount(period.balanceDue);
                                      setEditingPayment(null);
                                      setShowPaymentDialog(true);
                                    }}
                                  >
                                    <Banknote className="h-3 w-3 mr-1" />
                                    Pay Now
                                  </Button>
                                )}
                                {period.status === 'paid' && period.taxCollected > 0 && (
                                  <Badge variant="outline" className="bg-green-50">
                                    <CheckCircle className="h-3 w-3 mr-1 text-green-600" />
                                    Paid
                                  </Badge>
                                )}
                                {period.taxCollected === 0 && (
                                  <Badge variant="outline" className="bg-gray-50">
                                    No Tax Due
                                  </Badge>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between mt-4 pt-4 border-t flex-col sm:flex-row gap-4">
                        <div className="text-sm text-muted-foreground">
                          Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredPeriods.length)} of {filteredPeriods.length} months
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                          >
                            <ChevronLeft className="h-4 w-4" />
                            Previous
                          </Button>
                          <span className="flex items-center px-4 text-sm">
                            Page {currentPage} of {totalPages}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                          >
                            Next
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No tax data found for the selected date range</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Sales Tax Payment History */}
            {taxPayments.length > 0 && (
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <History className="h-5 w-5 text-purple-500" />
                    Sales Tax Payment History ({taxPayments.length} payments)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto max-h-[400px]">
                    <table className="w-full">
                      <thead className="bg-muted/50 border-b sticky top-0">
                        <tr>
                          <th className="text-left p-3">Date</th>
                          <th className="text-left p-3">Period</th>
                          <th className="text-right p-3">Amount</th>
                          <th className="text-left p-3">Challan No.</th>
                          <th className="text-left p-3">Method</th>
                          <th className="text-left p-3">Notes</th>
                          <th className="text-center p-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {taxPayments.slice().reverse().map((payment: any) => (
                          <tr key={payment.id} className="border-b hover:bg-muted/30">
                            <td className="p-3">{format(new Date(payment.payment_date), 'dd/MM/yyyy')}</td>
                            <td className="p-3">{format(new Date(payment.period_start), 'MMM yyyy')}</td>
                            <td className="p-3 text-right font-semibold text-green-600">
                              {formatPKR(payment.amount)}
                            </td>
                            <td className="p-3 font-mono text-sm">{payment.challan_number || '-'}</td>
                            <td className="p-3 capitalize">{payment.payment_method}</td>
                            <td className="p-3 max-w-[200px] truncate text-sm text-muted-foreground">
                              {payment.notes || '-'}
                            </td>
                            <td className="p-3 text-center">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEditSalesTaxPayment(payment)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Other Taxes Tab */}
          <TabsContent value="other-taxes" className="space-y-6">
            <Card className="shadow-md">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5 text-orange-500" />
                    Other Tax Payments - Total: {formatPKR(totalCustomTaxes)}
                  </CardTitle>
                  <Button size="sm" onClick={() => {
                    resetCustomTaxForm();
                    setShowCustomTaxDialog(true);
                  }}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Tax Payment
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {customTaxes.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/50 border-b">
                        <tr>
                          <th className="text-left p-3">Date</th>
                          <th className="text-left p-3">Tax Name</th>
                          <th className="text-left p-3">Type</th>
                          <th className="text-right p-3">Amount</th>
                          <th className="text-left p-3">Challan No.</th>
                          <th className="text-left p-3">Method</th>
                          <th className="text-left p-3">Notes</th>
                          <th className="text-center p-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {customTaxes.map((tax) => (
                          <tr key={tax.id} className="border-b hover:bg-muted/30">
                            <td className="p-3">{format(new Date(tax.date), 'dd/MM/yyyy')}</td>
                            <td className="p-3 font-medium">{tax.name}</td>
                            <td className="p-3 capitalize">{tax.taxType.replace('_', ' ')}</td>
                            <td className="p-3 text-right font-semibold text-orange-600">
                              {formatPKR(tax.amount)}
                            </td>
                            <td className="p-3 font-mono text-sm">{tax.challanNumber || '-'}</td>
                            <td className="p-3 capitalize">{tax.paymentMethod}</td>
                            <td className="p-3 max-w-[200px] truncate text-sm text-muted-foreground">
                              {tax.notes || '-'}
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex gap-2 justify-center">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleEditCustomTax(tax)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-red-600 hover:text-red-700"
                                  onClick={() => handleDeleteCustomTax(tax.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No other tax payments recorded yet</p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => {
                        resetCustomTaxForm();
                        setShowCustomTaxDialog(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Your First Tax Payment
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Payment Dialog for Sales Tax (Add/Edit) */}
        <Dialog open={showPaymentDialog} onOpenChange={(open) => {
          if (!open) resetPaymentForm();
          setShowPaymentDialog(open);
        }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Banknote className="h-5 w-5 text-green-600" />
                {editingPayment ? 'Edit Sales Tax Payment' : `Pay Sales Tax for ${selectedPeriod?.periodName}`}
              </DialogTitle>
              <DialogDescription>
                {editingPayment ? 'Update payment details' : 'Record government tax payment'}
              </DialogDescription>
            </DialogHeader>
            
            {(selectedPeriod || editingPayment) && (
              <div className="space-y-4">
                {!editingPayment && selectedPeriod && (
                  <div className="bg-muted p-3 rounded-lg">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Tax Collected:</span>
                      <span className="font-semibold text-blue-600">{formatPKR(selectedPeriod.taxCollected)}</span>
                    </div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Already Paid:</span>
                      <span className="font-semibold text-green-600">{formatPKR(selectedPeriod.totalPaid)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-semibold pt-2 border-t">
                      <span>Balance Due:</span>
                      <span className="text-red-600">{formatPKR(selectedPeriod.balanceDue)}</span>
                    </div>
                  </div>
                )}

                <div>
                  <Label>Payment Amount (PKR) *</Label>
                  <Input 
                    type="number" 
                    disabled
                    value={paymentAmount} 
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      if (!editingPayment && selectedPeriod && value > selectedPeriod.balanceDue) {
                        toast({ 
                          title: "Amount Limited", 
                          description: `Maximum amount is ${formatPKR(selectedPeriod.balanceDue)}.`,
                          variant: "destructive"
                        });
                        setPaymentAmount(selectedPeriod.balanceDue);
                      } else {
                        setPaymentAmount(value);
                      }
                    }}
                    className="mt-1"
                  />
                  {!editingPayment && selectedPeriod && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Amount to pay for this month
                    </p>
                  )}
                </div>

                <div>
                  <Label>Challan/Reference Number *</Label>
                  <Input 
                    value={challanNumber} 
                    onChange={(e) => setChallanNumber(e.target.value)}
                    placeholder="Government challan number"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Payment Method</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank">🏦 Bank Transfer</SelectItem>
                      <SelectItem value="easypaisa">📱 EasyPaisa</SelectItem>
                      <SelectItem value="jazzcash">📱 JazzCash</SelectItem>
                      <SelectItem value="cash">💵 Cash</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Payment Notes *</Label>
                  <Textarea 
                    value={paymentNotes} 
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    placeholder="e.g., Payment reference, bank branch, transaction date"
                    rows={3}
                    className="mt-1"
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={resetPaymentForm}>
                Cancel
              </Button>
              <Button 
                onClick={editingPayment ? handleUpdateSalesTaxPayment : handleRecordPayment} 
                disabled={isSubmitting || paymentAmount <= 0 || !paymentNotes || !challanNumber}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {editingPayment ? 'Update Payment' : 'Confirm Payment'}
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Custom Tax Dialog */}
        <Dialog open={showCustomTaxDialog} onOpenChange={(open) => {
          if (!open) resetCustomTaxForm();
          setShowCustomTaxDialog(open);
        }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-orange-600" />
                {editingCustomTax ? 'Edit Tax Payment' : 'Add Other Tax Payment'}
              </DialogTitle>
              <DialogDescription>
                Record income tax, professional tax, or other tax payments
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label>Tax Name *</Label>
                <Input 
                  value={customTaxName} 
                  onChange={(e) => setCustomTaxName(e.target.value)}
                  placeholder="e.g., Income Tax, Professional Tax"
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Tax Type</Label>
                <Select value={customTaxType} onValueChange={setCustomTaxType}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income_tax">Income Tax</SelectItem>
                    <SelectItem value="professional_tax">Professional Tax</SelectItem>
                    <SelectItem value="property_tax">Property Tax</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Amount (PKR) *</Label>
                <Input 
                  type="number" 
                  value={customTaxAmount} 
                  onChange={(e) => setCustomTaxAmount(parseFloat(e.target.value) || 0)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Payment Date *</Label>
                <Input 
                  type="date" 
                  value={customTaxDate} 
                  onChange={(e) => setCustomTaxDate(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Challan/Reference Number</Label>
                <Input 
                  value={customTaxChallan} 
                  onChange={(e) => setCustomTaxChallan(e.target.value)}
                  placeholder="Challan or reference number"
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Payment Method</Label>
                <Select value={customTaxMethod} onValueChange={setCustomTaxMethod}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank">🏦 Bank Transfer</SelectItem>
                    <SelectItem value="easypaisa">📱 EasyPaisa</SelectItem>
                    <SelectItem value="jazzcash">📱 JazzCash</SelectItem>
                    <SelectItem value="cash">💵 Cash</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea 
                  value={customTaxNotes} 
                  onChange={(e) => setCustomTaxNotes(e.target.value)}
                  placeholder="Additional details"
                  rows={2}
                  className="mt-1"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCustomTaxDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddCustomTax}>
                <CheckCircle className="h-4 w-4 mr-2" />
                {editingCustomTax ? 'Update' : 'Add'} Payment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}