import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatPKR } from "@/lib/currency";
import { format } from "date-fns";
import { Eye, Download, ChevronRight, ChevronLeft, RotateCcw, Keyboard, MessageCircle, ShoppingBag, TrendingUp, AlertCircle, CheckCircle, Clock, RefreshCw, Wallet } from "lucide-react";
import { useHeader } from "@/contexts/HeaderContext";
import { useLocation } from "wouter";
import { getPaymentMethodColor } from "@/utils/GetPaymentMethodColor";
import { api } from "../services/electron-api";
import { useToast } from "@/hooks/use-toast";
import { useLoginType } from "@/hooks/useLoginType";
import { KeyboardShortcutsModal } from "../components/modals/KeyboardShortcutsModal";
import { useNavigation } from "../App";
import { DueListModal } from "../components/modals/DueListModal";

// Storage keys
const STORAGE_KEYS = {
  SALES_PAGE: 'sales_current_page',
  SALES_FILTERS: 'sales_filters',
  SALES_SCROLL_POSITION: 'sales_scroll_position'
};

// Keyboard shortcuts
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
  const { toast } = useToast();
  const { navigateTo } = useNavigation();
  const { setTitle, setSubtitle } = useHeader();
  const { loginType } = useLoginType();
  const mainContentRef = useRef<HTMLDivElement>(null);
  const isFirstLoadRef = useRef(true);

  // State
  const [filters, setFilters] = useState(() => {
    try {
      const savedFilters = localStorage.getItem(STORAGE_KEYS.SALES_FILTERS);
      if (savedFilters) {
        const parsed = JSON.parse(savedFilters);
        return {
          startDate: parsed.startDate || "",
          endDate: parsed.endDate || "",
          paymentMethod: parsed.paymentMethod || "",
          search: parsed.search || "",
          returnStatus: parsed.returnStatus || "all",
          minAmount: parsed.minAmount || "",
          maxAmount: parsed.maxAmount || "",
        };
      }
    } catch (error) { }
    return {
      startDate: "", endDate: "", paymentMethod: "", search: "",
      returnStatus: "all", minAmount: "", maxAmount: "",
    };
  });

  const [currentPage, setCurrentPage] = useState(() => {
    try {
      const savedPage = localStorage.getItem(STORAGE_KEYS.SALES_PAGE);
      return savedPage ? Math.max(1, parseInt(savedPage, 10)) : 1;
    } catch { return 1; }
  });

  const [allSalesData, setAllSalesData] = useState<any[]>([]);
  const [renderKey, setRenderKey] = useState(0);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [shopPhoneNo, setShopPhoneNo] = useState("");
  const [showDueList, setShowDueList] = useState(false);
  const [showShopOwesList, setShowShopOwesList] = useState(false);
  const [selectedSaleForPayment, setSelectedSaleForPayment] = useState<any>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
// Replace ALL THREE helper functions with these:

// Helper to calculate total customer paid from payments (positive amounts only)
const getTotalCustomerPaid = (sale: any) => {
  if (!sale.payments) return sale.paid_amount || 0;
  
  return sale.payments.reduce((total, payment) => {
    if (payment.amount > 0) {
      return total + payment.amount;
    }
    return total;
  }, 0);
};

// Helper to calculate total refunded to customer (negative amounts only)
const getTotalRefunded = (sale: any) => {
  if (!sale.payments) return 0;
  
  return sale.payments.reduce((total, payment) => {
    if (payment.amount < 0) {
      return total + Math.abs(payment.amount);
    }
    return total;
  }, 0);
};

// Helper to calculate net position 
// RESULT > 0 = Customer owes shop (Customer needs to pay more)
// RESULT < 0 = Shop owes customer (Shop needs to refund)
// RESULT = 0 = Fully settled
const getNetPosition = (sale: any) => {
  const totalPaid = getTotalCustomerPaid(sale);
  const totalRefunded = getTotalRefunded(sale);
  const saleTotal = parseFloat(sale.total) || 0;
  const totalReturned = parseFloat(sale.total_returned_amount) || 0;
  
  // Net amount customer has effectively paid (after refunds)
  const netCustomerPayment = totalPaid - totalRefunded;
  
  // Effective sale total after returns
  const effectiveSaleTotal = saleTotal - totalReturned;
  
  // Calculate net position: Positive = customer owes, Negative = shop owes
  const netPosition = effectiveSaleTotal - netCustomerPayment;
  
  return netPosition;
};

  // Fetch data
  const { isLoading, refetch } = useQuery<any[]>({
    queryKey: ["sales", location],
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

      // Fetch payments for each sale
      for (const sale of allSales) {
        try {
          const payments = await api.getSalePayments(sale.id);
          sale.payments = payments || [];
        } catch (error) {
          sale.payments = [];
        }
      }

      allSales.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setAllSalesData(allSales);
      setRenderKey(prev => prev + 1);
      return allSales;
    },
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Filter and paginate
  const filteredData = useMemo(() => {
    if (allSalesData.length === 0) return [];

    let filtered = [...allSalesData];

    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(sale =>
        sale.receipt_number?.toLowerCase().includes(search) ||
        sale.customer_name?.toLowerCase().includes(search) ||
        sale.customer_phone?.toLowerCase().includes(search)
      );
    }

    if (filters.returnStatus !== "all") {
      filtered = filtered.filter(sale => sale.return_status === filters.returnStatus);
    }

    if (filters.startDate) {
      filtered = filtered.filter(sale => new Date(sale.created_at) >= new Date(filters.startDate));
    }

    if (filters.endDate) {
      filtered = filtered.filter(sale => new Date(sale.created_at) <= new Date(filters.endDate));
    }

    if (filters.paymentMethod && filters.paymentMethod !== 'all') {
      filtered = filtered.filter(sale => sale.payment_method === filters.paymentMethod);
    }

    if (filters.minAmount) {
      filtered = filtered.filter(sale => parseFloat(sale.total) >= parseFloat(filters.minAmount));
    }

    if (filters.maxAmount) {
      filtered = filtered.filter(sale => parseFloat(sale.total) <= parseFloat(filters.maxAmount));
    }

    return filtered;
  }, [allSalesData, filters]);

  const paginatedData = useMemo(() => {
    if (filteredData.length === 0) return [];
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return filteredData.slice(start, end);
  }, [filteredData, currentPage]);

  // Statistics
  const totalSalesAmount = filteredData.reduce((sum, sale) => sum + parseFloat(sale.total || 0), 0);
  const totalReturnedAmount = filteredData.reduce((sum, sale) => sum + (parseFloat(sale.total_returned_amount) || 0), 0);
  const netRevenue = totalSalesAmount - totalReturnedAmount;
  const completedSales = filteredData.filter(sale => sale.payment_status === 'completed');
  const totalProfit = filteredData.filter(sale => sale.payment_status !== 'cancelled').reduce((sum, sale) => sum + (parseFloat(sale.total_profit) || 0), 0);
  const pendingSales = filteredData.filter(sale => sale.payment_status === 'pending');
  const cancelledSales = filteredData.filter(sale => sale.payment_status === 'cancelled');
  const fullyReturned = filteredData.filter(sale => sale.return_status === 'full');
  const totalCost = totalSalesAmount - totalProfit;
  const roi = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;

  // Page validation
  const totalPages = Math.ceil(filteredData.length / pageSize);
  useEffect(() => {
    if (filteredData.length > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    } else if (filteredData.length === 0 && currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [filteredData.length, currentPage, totalPages]);

  // Save state
  useEffect(() => {
    if (!isFirstLoadRef.current) {
      localStorage.setItem(STORAGE_KEYS.SALES_PAGE, currentPage.toString());
      localStorage.setItem(STORAGE_KEYS.SALES_FILTERS, JSON.stringify(filters));
    }
  }, [currentPage, filters]);

  // Load shop phone
  useEffect(() => {
    const loadShopPhoneNumber = async () => {
      try {
        if (window.electronAPI && window.electronAPI.getShopData) {
          const result = await window.electronAPI.getShopData();
          if (result.success && result.shop && result.shop.phoneNo) {
            setShopPhoneNo(result.shop.phoneNo);
            setWhatsappNumber(result.shop.phoneNo);
            return;
          }
        }
        const storedData = localStorage.getItem('shopData');
        if (storedData) {
          const shopData = JSON.parse(storedData);
          if (shopData.phoneNo) {
            setShopPhoneNo(shopData.phoneNo);
            setWhatsappNumber(shopData.phoneNo);
            return;
          }
        }
        setWhatsappNumber("03295121520");
      } catch (error) {
        setWhatsappNumber("03295121520");
      }
    };
    loadShopPhoneNumber();
  }, []);

  useEffect(() => {
    setTitle("Sales");
    setSubtitle("View and manage all sales transactions");
  }, [setTitle, setSubtitle]);

  // Handlers
  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    localStorage.removeItem(STORAGE_KEYS.SALES_PAGE);
    localStorage.removeItem(STORAGE_KEYS.SALES_FILTERS);
    localStorage.removeItem(STORAGE_KEYS.SALES_SCROLL_POSITION);
    setFilters({
      startDate: "", endDate: "", paymentMethod: "", search: "",
      returnStatus: "all", minAmount: "", maxAmount: ""
    });
    setCurrentPage(1);
    isFirstLoadRef.current = true;
    setRenderKey(prev => prev + 1);
    toast({ title: "Reset", description: "All filters and pagination have been reset" });
    refetch();
  };

  const handleExport = async () => {
    try {
      const headers = ['Receipt No', 'Date', 'Customer Name', 'Phone', 'Total', 'Payment Method', 'Status', 'Return Status', 'Returned Amount', 'Profit'];
      const csvRows = [headers];

      for (const sale of filteredData) {
        csvRows.push([
          `"${sale.receipt_number || ''}"`,
          `"${format(new Date(sale.created_at), 'dd/MM/yyyy HH:mm')}"`,
          `"${sale.customer_name || 'Walk-in Customer'}"`,
          `"${sale.customer_phone || ''}"`,
          sale.total?.toString() || '0',
          `"${sale.payment_method || ''}"`,
          `"${sale.payment_status || ''}"`,
          `"${sale.return_status || 'none'}"`,
          sale.total_returned_amount?.toString() || '0',
          sale.total_profit?.toString() || '0'
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
      toast({ title: "Export Failed", description: "Failed to export sales data", variant: "destructive" });
    }
  };

  const handleViewDetails = (saleId: string) => {
    navigateTo(`/item-details/${saleId}/sales`);
  };

  const handleReturnFromSale = (receiptNumber: string) => {
    sessionStorage.setItem('returnReceiptNumber', receiptNumber);
    sessionStorage.setItem('returnMode', 'true');
    navigateTo('/pos');
    toast({ title: "Return Mode Activated", description: `Preparing return for receipt: ${receiptNumber}` });
  };

  const sendSaleWhatsApp = (sale: any) => {
    const paidAmount = sale.paid_amount || 0;
    const netPos = getNetPosition(sale);
    let statusMessage = "";
    if (netPos > 0) {
      statusMessage = `\n⚠️ *Remaining Due: ${formatPKR(netPos)}*`;
    } else if (netPos < 0) {
      statusMessage = `\n💰 *Shop Owes: ${formatPKR(Math.abs(netPos))}*`;
    }

    const message = `🧾 *INVOICE* 🧾%0A%0A` +
      `Receipt: ${sale.receipt_number}%0A` +
      `Date: ${format(new Date(sale.created_at), 'dd/MM/yyyy HH:mm')}%0A` +
      `Customer: ${sale.customer_name || 'Walk-in Customer'}%0A%0A` +
      `💰 Total Amount: ${formatPKR(sale.total)}%0A` +
      `✅ Paid: ${formatPKR(paidAmount)}%0A` +
      `${statusMessage}%0A%0A` +
      `Thank you for your business! 🙏`;

    const whatsappUrl = `https://wa.me/${sale.customer_phone?.replace(/\D/g, '').replace(/^0/, '')}?text=${message}`;
    window.open(whatsappUrl, '_blank');
  };

  // Replace the PaymentHistoryModal component in your Sales.tsx with this corrected version:

  const PaymentHistoryModal = ({ sale, isOpen, onClose, onPaymentRecorded }) => {
    const [paymentAmount, setPaymentAmount] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState("cash");
    const [paymentNotes, setPaymentNotes] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [payments, setPayments] = useState<any[]>([]);
    const { toast } = useToast();

    // Calculate totals from payments
    const calculateTotals = useCallback(() => {
      let customerPaid = 0;
      let shopRefunded = 0;

      payments.forEach(payment => {
        if (payment.amount > 0) {
          customerPaid += payment.amount;
        } else if (payment.amount < 0) {
          shopRefunded += Math.abs(payment.amount);
        }
      });

      return { customerPaid, shopRefunded };
    }, [payments]);

    const { customerPaid, shopRefunded } = calculateTotals();

    const saleTotal = parseFloat(sale?.total) || 0;
    const returnedAmount = parseFloat(sale?.total_returned_amount) || 0;
    const effectiveTotal = saleTotal - returnedAmount;
    const effectivePaid = customerPaid - shopRefunded;
    const balance = effectiveTotal - effectivePaid;
    const customerDue = balance > 0 ? balance : 0;
    const shopOwe = balance < 0 ? Math.abs(balance) : 0;

    useEffect(() => {
      if (sale && isOpen && sale.id) {
        fetchPayments();
      }
    }, [sale, isOpen]);

    const fetchPayments = async () => {
      if (!sale?.id) {
        console.error('Cannot fetch payments: sale.id is missing', sale);
        return;
      }
      try {
        const result = await api.getSalePayments(sale.id);
        setPayments(result || []);
      } catch (error) {
        console.error("Failed to fetch payments:", error);
      }
    };

    const handleRecordCustomerPayment = async () => {
      if (!sale?.id) {
        toast({ title: "Error", description: "Sale ID is missing. Cannot record payment.", variant: "destructive" });
        console.error('Sale ID is missing:', sale);
        return;
      }

      if (paymentAmount <= 0) {
        toast({ title: "Invalid Amount", description: "Please enter a valid amount", variant: "destructive" });
        return;
      }

      // if (paymentAmount > customerDue) {
      //   toast({ title: "Amount Exceeds Due", description: `Maximum due is ${formatPKR(customerDue)}`, variant: "destructive" });
      //   return;
      // }

      setIsSubmitting(true);
      try {
        const newCustomerPaid = customerPaid + paymentAmount;
        const newEffectivePaid = newCustomerPaid - shopRefunded;
        const newBalance = effectiveTotal - newEffectivePaid;
        const newDueAmount = newBalance > 0 ? newBalance : 0;

        // Create payment record
        await api.createSalePayment({
          saleId: sale.id,
          amount: paymentAmount,
          paymentMethod: paymentMethod,
          notes: paymentNotes || `Payment received from customer`,
          remainingDue: newDueAmount,
          payment_date: new Date().toISOString()
        });

        // Update sale
        await api.updateSale(sale.id, {
          paid_amount: newCustomerPaid,
          due_amount: newDueAmount,
          payment_status: newBalance === 0 ? "completed" : (newBalance < 0 ? "refunded" : "partial")
        });

        toast({ title: "Payment Received", description: `${formatPKR(paymentAmount)} recorded from customer` });
        setPaymentAmount(0);
        setPaymentNotes("");
        await fetchPayments();
        onPaymentRecorded();
        refetch();
      } catch (error) {
        console.error('Error in handleRecordCustomerPayment:', error);
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } finally {
        setIsSubmitting(false);
      }
    };

    const handleFullRefund = async () => {
      if (!sale?.id) {
        toast({ title: "Error", description: "Sale ID is missing. Cannot record refund.", variant: "destructive" });
        return;
      }

      if (shopOwe <= 0) {
        toast({ title: "No Refund", description: "No amount to refund", variant: "destructive" });
        return;
      }

      setIsSubmitting(true);
      try {
        const refundAmount = shopOwe;
        const newShopRefunded = shopRefunded + refundAmount;
        const newEffectivePaid = customerPaid - newShopRefunded;
        const newBalance = effectiveTotal - newEffectivePaid;

        await api.createSalePayment({
          saleId: sale.id,
          amount: -refundAmount,
          paymentMethod: paymentMethod,
          notes: paymentNotes || `Full refund paid to customer`,
          remainingDue: 0,
          payment_date: new Date().toISOString()
        });

        await api.updateSale(sale.id, {
          due_amount: newBalance > 0 ? newBalance : 0,
          payment_status: newBalance === 0 ? "completed" : (newBalance < 0 ? "refunded" : "partial")
        });

        toast({ title: "Refund Paid", description: `${formatPKR(refundAmount)} refunded to customer` });
        setPaymentAmount(0);
        setPaymentNotes("");
        await fetchPayments();
        onPaymentRecorded();
        refetch();
      } catch (error) {
        console.error('Error in handleFullRefund:', error);
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } finally {
        setIsSubmitting(false);
      }
    };

    const handlePartialRefund = async () => {
      if (!sale?.id) {
        toast({ title: "Error", description: "Sale ID is missing. Cannot record refund.", variant: "destructive" });
        return;
      }

      if (paymentAmount <= 0 || paymentAmount > shopOwe) {
        toast({ title: "Invalid Amount", description: `Please enter amount between 1 and ${formatPKR(shopOwe)}`, variant: "destructive" });
        return;
      }

      setIsSubmitting(true);
      try {
        const newShopRefunded = shopRefunded + paymentAmount;
        const newEffectivePaid = customerPaid - newShopRefunded;
        const newBalance = effectiveTotal - newEffectivePaid;

        await api.createSalePayment({
          saleId: sale.id,
          amount: -paymentAmount,
          paymentMethod: paymentMethod,
          notes: paymentNotes || `Partial refund paid to customer`,
          remainingDue: 0,
          payment_date: new Date().toISOString()
        });

        await api.updateSale(sale.id, {
          due_amount: newBalance > 0 ? newBalance : 0,
          payment_status: newBalance === 0 ? "completed" : (newBalance < 0 ? "refunded" : "partial")
        });

        toast({ title: "Partial Refund Paid", description: `${formatPKR(paymentAmount)} refunded to customer` });
        setPaymentAmount(0);
        setPaymentNotes("");
        await fetchPayments();
        onPaymentRecorded();
        refetch();
      } catch (error) {
        console.error('Error in handlePartialRefund:', error);
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } finally {
        setIsSubmitting(false);
      }
    };

    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Transaction History - {sale?.receipt_number}</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="history" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="history">📋 History</TabsTrigger>
              <TabsTrigger value="customer-pay">💳 Receive Payment</TabsTrigger>
              <TabsTrigger value="shop-pay">💰 Pay Refund</TabsTrigger>
            </TabsList>

            <TabsContent value="history" className="space-y-4">
              {/* Summary Card */}
              <div className={`p-4 rounded-lg ${customerDue > 0 ? 'bg-red-50 border border-red-200' : shopOwe > 0 ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
                <div className="space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="text-sm font-medium">Sale Total:</span>
                    <span className="font-bold text-lg">{formatPKR(saleTotal)}</span>
                  </div>

                  {returnedAmount > 0 && (
                    <div className="flex justify-between items-center text-red-600">
                      <span className="text-sm font-medium">Returns:</span>
                      <span className="font-bold">-{formatPKR(returnedAmount)}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-1">
                    <span className="text-sm font-medium">Effective Total:</span>
                    <span className="font-semibold">{formatPKR(effectiveTotal)}</span>
                  </div>

                  <div className="flex justify-between items-center text-blue-600">
                    <span className="text-sm font-medium">Customer Paid:</span>
                    <span className="font-bold">+{formatPKR(customerPaid)}</span>
                  </div>

                  {shopRefunded > 0 && (
                    <div className="flex justify-between items-center text-orange-600">
                      <span className="text-sm font-medium">Shop Refunded:</span>
                      <span className="font-bold">-{formatPKR(shopRefunded)}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-2 border-t mt-2 bg-gray-100 -mx-4 px-4 py-3 rounded">
                    <span className="font-bold text-base">Net Position:</span>
                    {customerDue > 0 ? (
                      <div className="text-right">
                        <span className="font-bold text-red-600 text-xl">{formatPKR(customerDue)}</span>
                        <p className="text-xs text-red-500">Customer needs to pay</p>
                      </div>
                    ) : shopOwe > 0 ? (
                      <div className="text-right">
                        <span className="font-bold text-green-600 text-xl">{formatPKR(shopOwe)}</span>
                        <p className="text-xs text-green-500">Shop needs to refund</p>
                      </div>
                    ) : (
                      <span className="font-bold text-green-600">✓ Fully Settled</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Formula Explanation */}
              <div className="bg-blue-50 p-3 rounded-lg text-xs">
                <p className="font-medium mb-1">📊 Calculation:</p>
                <p className="text-muted-foreground">
                  Net Position = (Sale Total - Returns) - (Customer Paid - Shop Refunded)
                </p>
                <p className="text-muted-foreground mt-1">
                  Positive = Customer owes | Negative = Shop owes
                </p>
              </div>

              {/* Payment History */}
              {payments.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Transaction History ({payments.length} entries)
                  </h4>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {payments
                      .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())
                      .map((payment) => {
                        const isRefund = payment.amount < 0;
                        const isInitial = payment.notes?.includes('Initial payment');
                        return (
                          <div key={payment.id} className={`border rounded-lg p-3 ${isRefund ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'}`}>
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 flex-wrap mb-2">
                                  <Badge className={isRefund ? 'bg-green-600' : 'bg-blue-600'}>
                                    {isRefund ? '💰 SHOP → CUSTOMER' : '💳 CUSTOMER → SHOP'}
                                  </Badge>
                                  {isInitial && <Badge variant="outline" className="text-xs">Initial</Badge>}
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(payment.payment_date).toLocaleString()}
                                  </span>
                                </div>
                                <p className="text-sm">
                                  <strong>Method:</strong> {payment.payment_method?.toUpperCase()}
                                </p>
                                {payment.notes && (
                                  <p className="text-sm text-muted-foreground mt-1">
                                    📝 {payment.notes}
                                  </p>
                                )}
                              </div>
                              <div className="text-right">
                                <p className={`font-bold text-lg ${isRefund ? 'text-green-600' : 'text-blue-600'}`}>
                                  {isRefund ? '-' : '+'}{formatPKR(Math.abs(payment.amount))}
                                </p>
                                {payment.remaining_due !== undefined && payment.remaining_due > 0 && (
                                  <p className="text-xs text-muted-foreground">Remaining Due: {formatPKR(payment.remaining_due)}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="customer-pay" className="space-y-4">
              {customerDue > 0 ? (
                <div className="space-y-4">
                  <div className="bg-red-50 p-4 rounded-lg border border-red-200 text-center">
                    <p className="text-sm text-red-700 font-medium">Outstanding Customer Due</p>
                    <p className="text-4xl font-bold text-red-600 my-2">{formatPKR(customerDue)}</p>
                    <p className="text-xs text-red-500">Customer needs to pay this amount</p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Payment Amount</Label>
                    <Input
                      type="number"
                      value={paymentAmount}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setPaymentAmount(isNaN(val) ? 0 : val);
                      }}
                      placeholder="Enter amount to receive"
                      className="mt-1 text-lg"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Maximum: {formatPKR(customerDue)}</p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Payment Method</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">💵 Cash</SelectItem>
                        <SelectItem value="card">💳 Card</SelectItem>
                        <SelectItem value="easypaisa">📱 EasyPaisa</SelectItem>
                        <SelectItem value="jazzcash">📱 JazzCash</SelectItem>
                        <SelectItem value="bank">🏦 Bank Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Notes (Optional)</Label>
                    <Textarea
                      value={paymentNotes}
                      onChange={(e) => setPaymentNotes(e.target.value)}
                      placeholder="Add payment notes..."
                      className="mt-1"
                      rows={2}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={handleRecordCustomerPayment}
                      disabled={isSubmitting || paymentAmount <= 0}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 h-12 text-base"
                    >
                      {isSubmitting ? "Processing..." : `Receive ${formatPKR(paymentAmount || 0)}`}
                    </Button>
                    <Button
                      onClick={() => {
                        setPaymentAmount(customerDue);
                        setTimeout(() => handleRecordCustomerPayment(), 100);
                      }}
                      disabled={isSubmitting}
                      variant="outline"
                      className="flex-1 h-12"
                    >
                      Receive Full
                    </Button>
                  </div>

                  <div className="bg-blue-50 p-2 rounded text-center text-sm">
                    After payment: {customerDue - paymentAmount > 0 ?
                      `Remaining due: ${formatPKR(customerDue - paymentAmount)}` :
                      '✓ Account will be fully settled'}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <CheckCircle className="h-16 w-16 mx-auto mb-3 text-green-500" />
                  <p className="text-lg font-medium text-green-600">No Outstanding Due</p>
                  <p className="text-sm text-muted-foreground mt-1">Customer has paid all amounts</p>
                  {shopOwe > 0 && (
                    <p className="text-sm text-orange-600 mt-4">Note: Shop owes customer {formatPKR(shopOwe)}. Go to "Pay Refund" tab.</p>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="shop-pay" className="space-y-4">
              {shopOwe > 0 ? (
                <div className="space-y-4">
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200 text-center">
                    <p className="text-sm text-green-700 font-medium">Shop Owes Customer</p>
                    <p className="text-4xl font-bold text-green-600 my-2">{formatPKR(shopOwe)}</p>
                    <p className="text-xs text-green-500">Refund this amount to customer</p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Refund Amount</Label>
                    <Input
                      type="number"
                      value={paymentAmount}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setPaymentAmount(isNaN(val) ? 0 : Math.min(val, shopOwe));
                      }}
                      placeholder="Enter amount to refund"
                      className="mt-1 text-lg"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Maximum: {formatPKR(shopOwe)}</p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Refund Method</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">💵 Cash</SelectItem>
                        <SelectItem value="card">💳 Card Refund</SelectItem>
                        <SelectItem value="easypaisa">📱 EasyPaisa</SelectItem>
                        <SelectItem value="jazzcash">📱 JazzCash</SelectItem>
                        <SelectItem value="bank">🏦 Bank Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Refund Reason (Optional)</Label>
                    <Textarea
                      value={paymentNotes}
                      onChange={(e) => setPaymentNotes(e.target.value)}
                      placeholder="Reason for refund..."
                      className="mt-1"
                      rows={2}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={paymentAmount > 0 && paymentAmount < shopOwe ? handlePartialRefund : handleFullRefund}
                      disabled={isSubmitting || (paymentAmount <= 0 && paymentAmount !== shopOwe)}
                      className="flex-1 bg-green-600 hover:bg-green-700 h-12 text-base"
                    >
                      {isSubmitting ? "Processing..." :
                        (paymentAmount > 0 && paymentAmount < shopOwe ?
                          `Refund ${formatPKR(paymentAmount)}` :
                          `Refund Full ${formatPKR(shopOwe)}`)}
                    </Button>
                  </div>

                  <div className="bg-green-50 p-2 rounded text-center text-sm">
                    After refund: {shopOwe - paymentAmount > 0 ?
                      `Remaining shop owe: ${formatPKR(shopOwe - paymentAmount)}` :
                      '✓ All amounts will be settled'}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <CheckCircle className="h-16 w-16 mx-auto mb-3 text-green-500" />
                  <p className="text-lg font-medium text-green-600">No Refund Due</p>
                  <p className="text-sm text-muted-foreground mt-1">Shop doesn't owe any amount to customer</p>
                  {customerDue > 0 && (
                    <p className="text-sm text-red-600 mt-4">Note: Customer owes {formatPKR(customerDue)}. Go to "Receive Payment" tab.</p>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  // Shop Owes List Modal
  const ShopOwesListModal = ({ isOpen, onClose, sales }) => {
    const shopOwesSales = sales.filter(sale => getNetPosition(sale) < 0);
    const totalShopOwes = shopOwesSales.reduce((sum, sale) => sum + Math.abs(getNetPosition(sale)), 0);

    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>💰 Shop Owes Customers - Total: {formatPKR(totalShopOwes)}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {shopOwesSales.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                <p>No pending refunds to customers</p>
              </div>
            ) : (
              shopOwesSales.map((sale) => {
                const oweAmount = Math.abs(getNetPosition(sale));
                return (
                  <div key={sale.id} className="border rounded-lg p-4 bg-green-50">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold">Receipt: {sale.receipt_number}</p>
                        <p className="text-sm">Customer: {sale.customer_name || 'Walk-in Customer'}</p>
                        <p className="text-sm">Phone: {sale.customer_phone || 'N/A'}</p>
                        <p className="text-xs text-muted-foreground mt-1">Date: {format(new Date(sale.created_at), 'dd/MM/yyyy HH:mm')}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-600">Shop Owes: {formatPKR(oweAmount)}</p>
                        <Button size="sm" className="mt-2 bg-green-600" onClick={() => { setSelectedSaleForPayment(sale); setIsPaymentModalOpen(true); onClose(); }}>
                          Pay Now
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleShortcuts = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      if (e.ctrlKey && e.key === 'e') { e.preventDefault(); handleExport(); }
      if (e.ctrlKey && e.key === 'c') { e.preventDefault(); handleResetFilters(); }
      if (e.ctrlKey && e.key === 'f') { e.preventDefault(); document.querySelector('input[placeholder*="Search"]')?.focus(); }
      if (e.key === 'ArrowLeft' && currentPage > 1) { e.preventDefault(); setCurrentPage(p => p - 1); }
      if (e.key === 'ArrowRight' && currentPage < totalPages) { e.preventDefault(); setCurrentPage(p => p + 1); }
    };
    window.addEventListener('keydown', handleShortcuts);
    return () => window.removeEventListener('keydown', handleShortcuts);
  }, [currentPage, totalPages]);

  const totalCount = filteredData.length;
  const startIndex = totalCount > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const endIndex = Math.min(currentPage * pageSize, totalCount);
  const dueSalesCount = filteredData.filter(sale => getNetPosition(sale) > 0).length;
  const shopOwesCount = filteredData.filter(sale => getNetPosition(sale) < 0).length;
  const totalShopOwes = filteredData.reduce((sum, sale) => {
    const netPos = getNetPosition(sale);
    return netPos < 0 ? sum + Math.abs(netPos) : sum;
  }, 0);
  const totalCustomerOwes = filteredData.reduce((sum, sale) => {
    const netPos = getNetPosition(sale);
    return netPos > 0 ? sum + netPos : sum;
  }, 0);

  // Columns
  const columns = [
    { key: 'receipt_number', label: 'Receipt No.', render: (value: string) => <span className="font-mono cursor-pointer hover:underline" onClick={() => { navigator.clipboard.writeText(value); toast({ title: "Copied!", duration: 1500 }); }}>{value}</span> },
    { key: 'created_at', label: 'Date/Time', render: (value: string) => (<div><p className="text-sm">{format(new Date(value), 'dd/MM/yyyy')}</p><p className="text-xs text-muted-foreground">{format(new Date(value), 'HH:mm:ss')}</p></div>) },
    { key: 'customer_name', label: 'Customer', render: (value: string) => <span>{value || 'Walk-in'}</span> },
    { key: 'total', label: 'Amount', render: (value: string) => <span className="font-semibold">{formatPKR(value)}</span> },
    { key: 'payment_method', label: 'Method', render: (value: string) => <Badge className={getPaymentMethodColor(value)}>{value?.toUpperCase() || '-'}</Badge> },
  {
  key: 'payment_status' as const,
  label: 'Payment Status',
  render: (value: string, row: any) => {
    const netPosition = getNetPosition(row);
    
    // Debug log to verify
    console.log(`Sale ${row.receipt_number}: Net Position = ${netPosition}`);
    
    // CASE 1: Customer owes shop (netPosition > 0)
    if (netPosition > 0) {
      return (
        <div className="flex flex-col gap-1 min-w-[140px]">
          <Badge className="bg-red-600 whitespace-nowrap">⚠️ Customer Owes</Badge>
          <span className="text-xs font-bold text-red-600">Due: {formatPKR(netPosition)}</span>
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-7 bg-blue-50 text-blue-700 border-blue-300"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedSaleForPayment(row);
              setIsPaymentModalOpen(true);
            }}
          >
            Receive Payment
          </Button>
        </div>
      );
    }
    
    // CASE 2: Shop owes customer (netPosition < 0)
    if (netPosition < 0) {
      const oweAmount = Math.abs(netPosition);
      return (
        <div className="flex flex-col gap-1 min-w-[140px]">
          <Badge className="bg-green-600 whitespace-nowrap">💰 Shop Owes</Badge>
          <span className="text-xs font-bold text-green-600">Owe: {formatPKR(oweAmount)}</span>
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-7 bg-green-50 text-green-700 border-green-300"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedSaleForPayment(row);
              setIsPaymentModalOpen(true);
            }}
          >
            Pay Customer
          </Button>
        </div>
      );
    }
    
    // CASE 3: All settled
    return <Badge className="bg-green-500 whitespace-nowrap">✓ Settled</Badge>;
  },
},
    ...(loginType === "admin" ? [{
      key: 'total_profit', label: 'Profit', render: (value: string) => <Badge variant="secondary">{formatPKR(value)}</Badge>
    }] : []),
    {
      key: 'actions', label: 'Actions', render: (_: any, row: any) => (<div className="flex gap-1"><Button size="sm" variant="ghost" onClick={() => handleViewDetails(row.id)}><Eye className="h-4 w-4" /></Button><Button size="sm" variant="ghost" onClick={() => handleReturnFromSale(row.receipt_number)} disabled={row.return_status === 'full'}><RotateCcw className="h-4 w-4" /></Button></div>)
    },
    {
      key: 'whatsapp', label: 'WhatsApp', render: (_: any, row: any) => (row.customer_phone ? <Button size="sm" variant="ghost" onClick={() => sendSaleWhatsApp(row)} className="text-green-600"><MessageCircle className="h-4 w-4" /></Button> : <span className="text-xs">No phone</span>)
    },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden" key={renderKey}>
      <main ref={mainContentRef} className="flex-1 overflow-auto p-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-r from-green-50 to-emerald-50">
            <CardContent className="p-4"><div className="flex justify-between"><div><p className="text-sm text-muted-foreground">💰 Shop Owes</p><p className="text-2xl font-bold text-green-600">{formatPKR(totalShopOwes)}</p><p className="text-xs">{shopOwesCount} transactions</p></div><Wallet className="h-8 w-8 text-green-500" /></div></CardContent>
          </Card>
          <Card className="bg-gradient-to-r from-red-50 to-orange-50">
            <CardContent className="p-4"><div className="flex justify-between"><div><p className="text-sm text-muted-foreground">⚠️ Customers Owe</p><p className="text-2xl font-bold text-red-600">{formatPKR(totalCustomerOwes)}</p><p className="text-xs">{dueSalesCount} transactions</p></div><AlertCircle className="h-8 w-8 text-red-500" /></div></CardContent>
          </Card>
          <Card><CardContent className="p-4"><div className="flex justify-between"><div><p className="text-sm text-muted-foreground">Total Sales</p><p className="text-2xl font-bold text-blue-600">{formatPKR(totalSalesAmount)}</p></div><ShoppingBag className="h-8 w-8 text-blue-500" /></div></CardContent></Card>
          {loginType === "admin" && <Card><CardContent className="p-4"><div className="flex justify-between"><div><p className="text-sm text-muted-foreground">Total Profit</p><p className="text-2xl font-bold text-purple-600">{formatPKR(totalProfit)}</p><p className="text-xs">ROI: {roi.toFixed(1)}%</p></div><TrendingUp className="h-8 w-8 text-purple-500" /></div></CardContent></Card>}
        </div>

        <Card>
          <CardHeader>
            <div className="flex justify-between flex-wrap gap-4">
              <div className="flex items-center gap-2"><CardTitle>Sales History</CardTitle><Button variant="ghost" size="icon" onClick={() => setShowShortcuts(true)}><Keyboard className="h-4 w-4" /></Button></div>
              <div className="flex gap-2">
                <Button onClick={handleResetFilters} variant="outline" size="sm">Reset All</Button>
                <Button onClick={handleExport} variant="outline"><Download className="h-4 w-4 mr-2" />Export</Button>
                <Button variant="outline" onClick={() => setShowDueList(true)}><AlertCircle className="h-4 w-4 mr-2" />Due List ({dueSalesCount})</Button>
                <Button variant="outline" onClick={() => setShowShopOwesList(true)}><Wallet className="h-4 w-4 mr-2" />Shop Owes ({shopOwesCount})</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
              <Input placeholder="Search..." value={filters.search} onChange={(e) => handleFilterChange('search', e.target.value)} />
              <Input type="date" placeholder="Start Date" value={filters.startDate} onChange={(e) => handleFilterChange('startDate', e.target.value)} />
              <Input type="date" placeholder="End Date" value={filters.endDate} onChange={(e) => handleFilterChange('endDate', e.target.value)} />
              <Select value={filters.paymentMethod || "all"} onValueChange={(v) => handleFilterChange('paymentMethod', v === "all" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Payment Method" /></SelectTrigger>
                <SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="cash">Cash</SelectItem><SelectItem value="card">Card</SelectItem><SelectItem value="easypaisa">EasyPaisa</SelectItem><SelectItem value="jazzcash">JazzCash</SelectItem><SelectItem value="bank">Bank</SelectItem></SelectContent>
              </Select>
              <Select value={filters.returnStatus} onValueChange={(v) => handleFilterChange('returnStatus', v)}>
                <SelectTrigger><SelectValue placeholder="Return Status" /></SelectTrigger>
                <SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="none">No Return</SelectItem><SelectItem value="partial">Partial Return</SelectItem><SelectItem value="full">Full Return</SelectItem></SelectContent>
              </Select>
            </div>

            <div className="mb-4 text-sm text-muted-foreground">
              {totalCount > 0 ? `Showing ${startIndex} to ${endIndex} of ${totalCount} results` : (!isLoading && "No results found")}
            </div>

            {isLoading ? (
              <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div><span className="ml-2">Loading sales...</span></div>
            ) : (
              <>
                <div className="border rounded-lg overflow-hidden overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50 border-b"><tr>{columns.map(col => <th key={col.key} className="text-left p-3 text-sm">{col.label}</th>)}</tr></thead>
                    <tbody>
                      {paginatedData.map((sale, idx) => (
                        <tr key={sale.id} className={`border-b hover:bg-muted/30 ${idx % 2 === 0 ? 'bg-background' : 'bg-muted/10'}`}>
                          {columns.map(col => <td key={col.key} className="p-3">{col.render(sale[col.key], sale)}</td>)}
                        </tr>
                      ))}
                      {paginatedData.length === 0 && <tr><td colSpan={columns.length} className="text-center p-8">No sales found.</td></tr>}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div className="flex justify-between items-center mt-4 pt-4 border-t">
                    <div className="text-sm">Page {currentPage} of {totalPages}</div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4 mr-1" />Previous</Button>
                      <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next<ChevronRight className="h-4 w-4 ml-1" /></Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </main>

      <KeyboardShortcutsModal open={showShortcuts} onOpenChange={setShowShortcuts} title="Sales Page Shortcuts" shortcuts={shortcuts} />
      <DueListModal isOpen={showDueList} onClose={() => setShowDueList(false)} />
      <ShopOwesListModal isOpen={showShopOwesList} onClose={() => setShowShopOwesList(false)} sales={filteredData} />
      {selectedSaleForPayment && (
        <PaymentHistoryModal sale={selectedSaleForPayment} isOpen={isPaymentModalOpen} onClose={() => { setIsPaymentModalOpen(false); setSelectedSaleForPayment(null); }} onPaymentRecorded={() => { refetch(); setIsPaymentModalOpen(false); setSelectedSaleForPayment(null); }} />
      )}
    </div>
  );
}