import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatPKR } from "@/lib/currency";
import { format } from "date-fns";
import { Eye, Download, ChevronRight, ChevronLeft, RotateCcw, Keyboard, MessageCircle, ShoppingBag, TrendingUp, AlertCircle, CheckCircle, Clock, RefreshCw, TrendingDown, Package, Users, Wallet, Banknote, CreditCard, Smartphone } from "lucide-react";
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

// Helper to format time in Pakistan timezone
// Helper to format time in Pakistan timezone (UTC+5)
const formatPakistanTime = (dateString: string) => {
  const date = new Date(dateString);
  // Add 5 hours for Pakistan time (UTC+5)
  const pakistanTime = new Date(date.getTime() + (5 * 60 * 60 * 1000));
  return {
    date: format(pakistanTime, 'dd/MM/yyyy'),
    time: format(pakistanTime, 'hh:mm:ss a'),
    full: format(pakistanTime, 'dd/MM/yyyy hh:mm:ss a')
  };
};

export default function Sales() {
  const pageSize = 50;
  const [location] = useLocation();
  const { toast } = useToast();
  const { navigateTo } = useNavigation();
  const { setTitle, setSubtitle } = useHeader();
  const { loginType } = useLoginType();
  const queryClient = useQueryClient();
  const mainContentRef = useRef<HTMLDivElement>(null);
  const isFirstLoadRef = useRef(true);
  const [showAllCards, setShowAllCards] = useState(false);
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
          paymentStatus: parsed.paymentStatus || "all",
          minAmount: parsed.minAmount || "",
          maxAmount: parsed.maxAmount || "",
          customerName: parsed.customerName || "",
        };
      }
    } catch (error) { }
    return {
      startDate: "", endDate: "", paymentMethod: "", search: "",
      returnStatus: "all", paymentStatus: "all", minAmount: "", maxAmount: "", customerName: ""
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
  const [selectedSaleForPayment, setSelectedSaleForPayment] = useState<any>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [showOverpaymentModal, setShowOverpaymentModal] = useState(false);
  const [overpaymentInfo, setOverpaymentInfo] = useState<any>(null);
  const [cashInHand, setCashInHand] = useState(0);

  // Helper functions
  const getTotalCustomerPaid = (sale: any) => {
    if (!sale.payments) return sale.paid_amount || 0;
    return sale.payments.reduce((total, payment) => {
      if (payment.amount > 0) return total + payment.amount;
      return total;
    }, 0);
  };

  // Replace the getCustomerDue function with this:
  const getCustomerDue = (sale: any) => {
    // First check payments array if available
    let totalPaid = 0;
    if (sale.payments && sale.payments.length > 0) {
      totalPaid = sale.payments.reduce((sum, p) => {
        if (p.amount > 0) return sum + p.amount;
        return sum;
      }, 0);
    } else {
      // Fallback to paid_amount field
      totalPaid = sale.paid_amount || 0;
    }

    const saleTotal = parseFloat(sale.total) || 0;
    const totalReturned = parseFloat(sale.total_returned_amount) || 0;
    const effectiveTotal = saleTotal - totalReturned;
    const due = effectiveTotal - totalPaid;

    // If due is less than 0.01 (rounding), treat as 0
    return due > 0.01 ? due : 0;
  };

// Calculate cash in hand from all cash payments (including refunds)
// Calculate cash in hand from payments only (most reliable)
const calculateCashInHand = useCallback((sales: any[]) => {
    let totalCashReceived = 0;
    let totalCashRefunded = 0;

    sales.forEach(sale => {
        if (sale.payments && sale.payments.length > 0) {
            sale.payments.forEach(payment => {
                if (payment.payment_method === 'cash') {
                    if (payment.amount > 0) {
                        totalCashReceived += payment.amount;
                    } else if (payment.amount < 0) {
                        totalCashRefunded += Math.abs(payment.amount);
                    }
                }
            });
        }
    });

    const cashInHand = totalCashReceived - totalCashRefunded;
    console.log('Cash Calculation (from payments only):', { totalCashReceived, totalCashRefunded, cashInHand });
    return cashInHand;
}, []);

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
        return [];
      }
      console.log(allSales)

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

      // Calculate cash in hand
      const cashTotal = calculateCashInHand(allSales);
      setCashInHand(cashTotal);

      setRenderKey(prev => prev + 1);
      return allSales;
    },
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 0,
    cacheTime: 0,
  });

  // Apply filters
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

    if (filters.customerName) {
      const customerName = filters.customerName.toLowerCase();
      filtered = filtered.filter(sale =>
        sale.customer_name?.toLowerCase().includes(customerName)
      );
    }

    if (filters.returnStatus !== "all") {
      filtered = filtered.filter(sale => sale.return_status === filters.returnStatus);
    }

    if (filters.paymentStatus !== "all") {
      filtered = filtered.filter(sale => sale.payment_status === filters.paymentStatus);
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

  // Statistics for cards
  // Exclude: cancelled, refunded, AND fully returned
  const totalSalesAmount = filteredData
    .filter(sale => {
      // Exclude cancelled
      if (sale.payment_status === 'cancelled') return false;
      // Exclude refunded  
      if (sale.payment_status === 'refunded') return false;
      // Exclude fully returned
      if (sale.return_status === 'full') return false;
      // Include all others (completed, partial, pending, no return, partial return)
      return true;
    })
    .reduce((sum, sale) => sum + parseFloat(sale.total || 0), 0);
  const totalReturnedAmount = filteredData.reduce((sum, sale) => sum + (parseFloat(sale.total_returned_amount) || 0), 0);
  const netRevenue = totalSalesAmount - totalReturnedAmount;

  const completedSales = filteredData.filter(sale => sale.payment_status === 'completed');
  const pendingSales = filteredData.filter(sale => sale.payment_status === 'pending');
  const cancelledSales = filteredData.filter(sale => sale.payment_status === 'cancelled');
  const refundedSales = filteredData.filter(sale => sale.payment_status === 'refunded');

  const fullyReturned = filteredData.filter(sale => sale.return_status === 'full');
  const partiallyReturned = filteredData.filter(sale => sale.return_status === 'partial');
  const noReturn = filteredData.filter(sale => sale.return_status === 'none' || !sale.return_status);

  const totalProfit = filteredData
    .filter(sale => sale.payment_status !== 'cancelled')
    .reduce((sum, sale) => sum + (parseFloat(sale.total_profit) || 0), 0);

  const totalCost = totalSalesAmount - totalProfit;
  const roi = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;
  const dueSalesCount = filteredData.filter(sale => getCustomerDue(sale) > 0).length;
  const totalCustomerOwes = filteredData.reduce((sum, sale) => sum + getCustomerDue(sale), 0);

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
    if (!isFirstLoadRef.current && !isLoading) {
      localStorage.setItem(STORAGE_KEYS.SALES_PAGE, currentPage.toString());
      localStorage.setItem(STORAGE_KEYS.SALES_FILTERS, JSON.stringify(filters));
    } else {
      isFirstLoadRef.current = false;
    }
  }, [currentPage, filters, isLoading]);

  // Restore scroll position
  useEffect(() => {
    if (!isLoading && paginatedData.length > 0 && mainContentRef.current) {
      const savedScrollPosition = localStorage.getItem(STORAGE_KEYS.SALES_SCROLL_POSITION);
      if (savedScrollPosition) {
        setTimeout(() => {
          if (mainContentRef.current) {
            mainContentRef.current.scrollTo({ top: parseInt(savedScrollPosition, 10), behavior: 'auto' });
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
    isFirstLoadRef.current = false;
  };

  const handleResetFilters = () => {
    localStorage.removeItem(STORAGE_KEYS.SALES_PAGE);
    localStorage.removeItem(STORAGE_KEYS.SALES_FILTERS);
    localStorage.removeItem(STORAGE_KEYS.SALES_SCROLL_POSITION);
    setFilters({
      startDate: "", endDate: "", paymentMethod: "", search: "",
      returnStatus: "all", paymentStatus: "all", minAmount: "", maxAmount: "", customerName: ""
    });
    setCurrentPage(1);
    setRenderKey(prev => prev + 1);
    toast({ title: "Reset", description: "All filters and pagination have been reset" });
    refetch();
  };

  const handleExport = async () => {
    try {
      const headers = ['Receipt No', 'Date', 'Time', 'Customer Name', 'Phone', 'Subtotal', 'Tax', 'Discount', 'Total', 'Payment Method', 'Payment Status', 'Return Status', 'Returned Amount', 'Profit'];
      const csvRows = [headers];

      for (const sale of filteredData) {
        const { date, time } = formatPakistanTime(sale.created_at);
        csvRows.push([
          `"${sale.receipt_number || ''}"`,
          `"${date}"`,
          `"${time}"`,
          `"${sale.customer_name || 'Walk-in Customer'}"`,
          `"${sale.customer_phone || ''}"`,
          sale.subtotal?.toString() || '0',
          sale.tax?.toString() || '0',
          sale.discount?.toString() || '0',
          sale.total?.toString() || '0',
          `"${sale.payment_method || ''}"`,
          `"${sale.payment_status || ''}"`,
          `"${sale.return_status || 'none'}"`,
          sale.total_returned_amount?.toString() || '0',
          loginType === "admin" ? (sale.total_profit?.toString() || '0') : 'Hidden'
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
    const due = getCustomerDue(sale);
    const { date, time } = formatPakistanTime(sale.created_at);
    let statusMessage = "";
    if (due > 0) {
      statusMessage = `\n⚠️ *Remaining Due: ${formatPKR(due)}*`;
    }

    const message = `🧾 *INVOICE* 🧾%0A%0A` +
      `Receipt: ${sale.receipt_number}%0A` +
      `Date: ${date} at ${time}%0A` +
      `Customer: ${sale.customer_name || 'Walk-in Customer'}%0A%0A` +
      `💰 Total Amount: ${formatPKR(sale.total)}%0A` +
      `✅ Paid: ${formatPKR(paidAmount)}%0A` +
      `${statusMessage}%0A%0A` +
      `Thank you for your business! 🙏`;

    const whatsappUrl = `https://wa.me/${sale.customer_phone?.replace(/\D/g, '').replace(/^0/, '')}?text=${message}`;
    window.open(whatsappUrl, '_blank');
  };

  // PaymentHistoryModal Component
  const PaymentHistoryModal = ({ sale, isOpen, onClose, onPaymentRecorded }) => {
    const [paymentAmount, setPaymentAmount] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState("cash");
    const [paymentNotes, setPaymentNotes] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [payments, setPayments] = useState<any[]>([]);
    const { toast } = useToast();

    const calculateTotals = useCallback(() => {
      let customerPaid = 0;
      payments.forEach(payment => {
        if (payment.amount > 0) customerPaid += payment.amount;
      });
      return { customerPaid };
    }, [payments]);

    const { customerPaid } = calculateTotals();
    const saleTotal = parseFloat(sale?.total) || 0;
    const returnedAmount = parseFloat(sale?.total_returned_amount) || 0;
    const effectiveTotal = saleTotal - returnedAmount;
    const customerDue = effectiveTotal - customerPaid > 0 ? effectiveTotal - customerPaid : 0;

    useEffect(() => {
      if (sale && isOpen && sale.id) fetchPayments();
    }, [sale, isOpen]);

    const fetchPayments = async () => {
      if (!sale?.id) return;
      try {
        const result = await api.getSalePayments(sale.id);
        setPayments(result || []);
      } catch (error) {
        console.error("Failed to fetch payments:", error);
      }
    };

    const handleRecordPayment = async () => {
      if (!sale?.id) {
        toast({ title: "Error", description: "Sale ID is missing", variant: "destructive" });
        return;
      }
      if (paymentAmount <= 0) {
        toast({ title: "Invalid Amount", description: "Please enter a valid amount", variant: "destructive" });
        return;
      }

      if (paymentAmount > customerDue && customerDue > 0) {
        const changeAmount = paymentAmount - customerDue;
        setOverpaymentInfo({
          sale: sale,
          paymentAmount: paymentAmount,
          dueAmount: customerDue,
          changeAmount: changeAmount,
          paymentMethod: paymentMethod,
          notes: paymentNotes
        });
        setShowOverpaymentModal(true);
        return;
      }

      await processPayment(paymentAmount);
    };

    const processPayment = async (amount: number) => {
      setIsSubmitting(true);
      try {
        const newCustomerPaid = customerPaid + amount;
        const newDue = effectiveTotal - newCustomerPaid > 0 ? effectiveTotal - newCustomerPaid : 0;

        await api.createSalePayment({
          saleId: sale.id,
          amount: amount,
          paymentMethod: paymentMethod,
          notes: paymentNotes || `Payment received from customer`,
          remainingDue: newDue,
          payment_date: new Date().toISOString()
        });

        await api.updateSale(sale.id, {
          paid_amount: newCustomerPaid,
          due_amount: newDue,
          payment_status: newDue === 0 ? "completed" : "partial"
        });

        toast({ title: "Payment Received", description: `${formatPKR(amount)} recorded from customer` });
        setPaymentAmount(0);
        setPaymentNotes("");
        await fetchPayments();
        onPaymentRecorded();
        refetch();
        queryClient.invalidateQueries({ queryKey: ["sales"] });

        // Update cash in hand
        if (paymentMethod === 'cash') {
          const newCashTotal = cashInHand + amount;
          setCashInHand(newCashTotal);
        }
      } catch (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } finally {
        setIsSubmitting(false);
      }
    };

    const handleOverpaymentGiveChange = async () => {
      if (!overpaymentInfo) return;

      setIsSubmitting(true);
      try {
        const { sale, dueAmount, paymentMethod, notes } = overpaymentInfo;

        await api.createSalePayment({
          saleId: sale.id,
          amount: dueAmount,
          paymentMethod: paymentMethod,
          notes: notes || `Payment received. Customer paid ${formatPKR(overpaymentInfo.paymentAmount)}, change given: ${formatPKR(overpaymentInfo.changeAmount)}`,
          remainingDue: 0,
          payment_date: new Date().toISOString()
        });

        await api.updateSale(sale.id, {
          paid_amount: customerPaid + dueAmount,
          due_amount: 0,
          payment_status: "completed"
        });

        toast({
          title: "Payment Received",
          description: `Received ${formatPKR(dueAmount)}. Change to return: ${formatPKR(overpaymentInfo.changeAmount)}`,
          duration: 5000
        });

        await fetchPayments();
        onPaymentRecorded();
        refetch();
        queryClient.invalidateQueries({ queryKey: ["sales"] });

        if (paymentMethod === 'cash') {
          const newCashTotal = cashInHand + dueAmount;
          setCashInHand(newCashTotal);
        }

        setShowOverpaymentModal(false);
        setOverpaymentInfo(null);
        setPaymentAmount(0);
        setPaymentNotes("");
      } catch (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } finally {
        setIsSubmitting(false);
      }
    };

    const handleOverpaymentAdjust = () => {
      if (!overpaymentInfo) return;
      setPaymentAmount(overpaymentInfo.dueAmount);
      setShowOverpaymentModal(false);
      setOverpaymentInfo(null);
    };

    return (
      <>
        <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Payment History - {sale?.receipt_number}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className={`p-4 rounded-lg ${customerDue > 0 ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
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
                    <span className="text-sm font-medium">Total Paid:</span>
                    <span className="font-bold">+{formatPKR(customerPaid)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t mt-2 bg-gray-100 -mx-4 px-4 py-3 rounded">
                    <span className="font-bold text-base">Remaining Due:</span>
                    {customerDue > 0 ? (
                      <div className="text-right">
                        <span className="font-bold text-red-600 text-xl">{formatPKR(customerDue)}</span>
                        <p className="text-xs text-red-500">Customer needs to pay</p>
                      </div>
                    ) : (
                      <span className="font-bold text-green-600">✓ Fully Paid</span>
                    )}
                  </div>
                </div>
              </div>

              {payments.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Payment History ({payments.length} entries)
                  </h4>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {payments.sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()).map((payment) => {
                      const isRefund = payment.amount < 0;
                      if (isRefund) return null;
                      const { date, time } = formatPakistanTime(payment.payment_date);
                      return (
                        <div key={payment.id} className="border rounded-lg p-3 bg-blue-50 border-blue-200">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap mb-2">
                                <Badge className="bg-blue-600">💳 PAYMENT RECEIVED</Badge>
                                <span className="text-xs text-muted-foreground">
                                  {date} at {time}
                                </span>
                              </div>
                              <p className="text-sm"><strong>Method:</strong> {payment.payment_method?.toUpperCase()}</p>
                              {payment.notes && <p className="text-sm text-muted-foreground mt-1">📝 {payment.notes}</p>}
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-lg text-blue-600">+{formatPKR(Math.abs(payment.amount))}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {customerDue > 0 ? (
                <div className="space-y-4 border-t pt-4">
                  <div className="bg-red-50 p-4 rounded-lg border border-red-200 text-center">
                    <p className="text-sm text-red-700 font-medium">Outstanding Due</p>
                    <p className="text-4xl font-bold text-red-600 my-2">{formatPKR(customerDue)}</p>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Payment Amount</label>
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
                    {paymentAmount > customerDue && (
                      <p className="text-xs text-yellow-600 mt-1">
                        ⚠️ Change to return: {formatPKR(paymentAmount - customerDue)}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium">Payment Method</label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
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
                    <label className="text-sm font-medium">Notes (Optional)</label>
                    <textarea
                      value={paymentNotes}
                      onChange={(e) => setPaymentNotes(e.target.value)}
                      placeholder="Add payment notes..."
                      className="mt-1 w-full p-2 text-sm border rounded-md"
                      rows={2}
                    />
                  </div>

                  <Button onClick={handleRecordPayment} disabled={isSubmitting || paymentAmount <= 0} className="w-full bg-blue-600 h-12">
                    {isSubmitting ? "Processing..." : `Receive ${formatPKR(paymentAmount || 0)}`}
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8 border-t">
                  <CheckCircle className="h-16 w-16 mx-auto mb-3 text-green-500" />
                  <p className="text-lg font-medium text-green-600">Fully Paid</p>
                  <p className="text-sm text-muted-foreground">No outstanding due</p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showOverpaymentModal} onOpenChange={setShowOverpaymentModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>💰 Overpayment - Give Change</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 text-center">
                <p className="text-sm text-yellow-800 mb-2">
                  Customer paid <strong>{formatPKR(overpaymentInfo?.paymentAmount || 0)}</strong>
                </p>
                <p className="text-sm text-yellow-800">
                  Due amount: <strong>{formatPKR(overpaymentInfo?.dueAmount || 0)}</strong>
                </p>
                <p className="text-lg font-bold text-yellow-800 mt-2">
                  Change to return: {formatPKR(overpaymentInfo?.changeAmount || 0)}
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-center">What would you like to do?</p>
                <Button className="w-full" onClick={handleOverpaymentGiveChange}>
                  💵 Give Change ({formatPKR(overpaymentInfo?.changeAmount || 0)})
                </Button>
                <Button className="w-full" variant="outline" onClick={handleOverpaymentAdjust}>
                  🔧 Adjust amount to {formatPKR(overpaymentInfo?.dueAmount || 0)}
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowOverpaymentModal(false)}>Cancel</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
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

  // Columns
  const columns = [
    { key: 'receipt_number', label: 'Receipt No.', render: (value: string) => <span className="font-mono cursor-pointer hover:underline" onClick={() => { navigator.clipboard.writeText(value); toast({ title: "Copied!", duration: 1500 }); }}>{value}</span> },
    {
      key: 'created_at', label: 'Date/Time', render: (value: string) => {
        const { date, time } = formatPakistanTime(value);
        return (<div><p className="text-sm">{date}</p><p className="text-xs text-muted-foreground">{time}</p></div>);
      }
    },
    { key: 'customer_name', label: 'Customer', render: (value: string) => <span>{value || 'Walk-in'}</span> },
    {
      key: 'total',
      label: 'Amount',
      render: (value: string, row: any) => {
        const taxAmount = (parseFloat(row.subtotal) * parseFloat(row.tax || 0)) / 100;
        return (
          <div>
            <span className="font-semibold">{formatPKR(value)}</span>
            {taxAmount > 0 && (
              <p className="text-xs text-muted-foreground">Tax: {formatPKR(taxAmount)}</p>
            )}
          </div>
        );
      }
    },
    { key: 'payment_method', label: 'Method', render: (value: string) => <Badge className={getPaymentMethodColor(value)}>{value?.toUpperCase() || '-'}</Badge> },
    {
      key: 'payment_status', label: 'Status', render: (value: string, row: any) => {
        const due = getCustomerDue(row);
        if (due > 0) {
          return (
            <div className="flex flex-col gap-1 min-w-[140px]">
              <Badge className="bg-red-600">⚠️ Due</Badge>
              <span className="text-xs font-bold text-red-600">Due: {formatPKR(due)}</span>
              <Button size="sm" variant="outline" className="text-xs h-7 bg-blue-50" onClick={(e) => { e.stopPropagation(); setSelectedSaleForPayment(row); setIsPaymentModalOpen(true); }}>Receive Payment</Button>
            </div>
          );
        }
        if (value === 'completed') return <Badge className="bg-green-500">✓ Paid</Badge>;
        if (value === 'pending') return <Badge className="bg-yellow-500">Pending</Badge>;
        if (value === 'cancelled') return <Badge className="bg-red-500">❌ Cancelled</Badge>;
        if (value === 'refunded') return <Badge className="bg-orange-500">↺ Refunded</Badge>;
        return <Badge variant="outline">{value || '-'}</Badge>;
      }
    },
    {
      key: 'return_status', label: 'Return', render: (value: string) => {
        if (value === 'full') return <Badge className="bg-red-500">Fully Returned</Badge>;
        if (value === 'partial') return <Badge className="bg-yellow-500">Partial Return</Badge>;
        return <Badge variant="outline">No Return</Badge>;
      }
    },
    ...(loginType === "admin" ? [{
      key: 'total_profit', label: 'Profit', render: (value: string) => {
        let profit = parseFloat(value) || 0;
        return <Badge className="bg-purple-100 text-purple-800">{formatPKR(profit)}</Badge>;
      }
    }] : []),
    {
      key: 'actions', label: 'Actions', render: (_: any, row: any) => (
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={() => handleViewDetails(row.id)}><Eye className="h-4 w-4" /></Button>
          <Button size="sm" variant="ghost" onClick={() => handleReturnFromSale(row.receipt_number)} disabled={row.return_status === 'full'}><RotateCcw className="h-4 w-4" /></Button>
        </div>
      )
    },
    {
      key: 'whatsapp', label: 'WhatsApp', render: (_: any, row: any) => (
        row.customer_phone ?
          <Button size="sm" variant="ghost" onClick={() => sendSaleWhatsApp(row)} className="text-green-600"><MessageCircle className="h-4 w-4" /></Button> :
          <span className="text-xs text-muted-foreground">No phone</span>
      )
    },
  ];

  // Summary Cards Component - Collapsible
  const SummaryCards = () => {
    // Primary cards (always visible)
    const primaryCards = [
      {
        title: "💰 Cash in Hand",
        value: cashInHand,
        color: "text-green-600",
        bg: "from-green-50 to-emerald-50",
        icon: <Banknote className="h-8 w-8 text-green-500" />,
        subtitle: "From cash payments",
        showFor: "all"
      },
      {
        title: "📊 Total Sales",
        value: totalSalesAmount,
        color: "text-blue-600",
        bg: "from-blue-50 to-cyan-50",
        icon: <ShoppingBag className="h-8 w-8 text-blue-500" />,
        subtitle: `${filteredData.length} transactions`,
        showFor: "all"
      },
      {
        title: "📈 Net Revenue",
        value: netRevenue,
        color: "text-teal-600",
        bg: "from-teal-50 to-emerald-50",
        icon: <TrendingUp className="h-8 w-8 text-teal-500" />,
        subtitle: "After returns",
        showFor: "all"
      },
      {
        title: "💵 Total Profit",
        value: totalProfit,
        color: "text-purple-600",
        bg: "from-purple-50 to-pink-50",
        icon: <TrendingUp className="h-8 w-8 text-purple-500" />,
        subtitle: `ROI: ${roi.toFixed(1)}%`,
        tooltip: "Total profit from all sales. ROI = (Profit / Cost) × 100",
        showFor: "admin"
      }
    ];

    // Filter cards based on login type
    const visiblePrimaryCards = primaryCards.filter(card =>
      card.showFor === "all" || (card.showFor === "admin" && loginType === "admin")
    );

    // Secondary cards (hidden by default)
    const secondaryCards = [
      {
        title: "⚠️ Total Due",
        value: totalCustomerOwes,
        color: "text-red-600",
        bg: "from-red-50 to-orange-50",
        icon: <AlertCircle className="h-8 w-8 text-red-500" />,
        subtitle: `${dueSalesCount} transactions`
      },
      {
        title: "✅ Completed",
        value: completedSales.length,
        color: "text-green-600",
        bg: "from-green-50 to-emerald-50",
        icon: <CheckCircle className="h-8 w-8 text-green-500" />,
        subtitle: formatPKR(completedSales.reduce((sum, s) => sum + parseFloat(s.total), 0))
      },
      {
        title: "Pending",
        value: pendingSales.length,
        color: "text-yellow-600",
        bg: "from-yellow-50 to-amber-50",
        icon: <Clock className="h-8 w-8 text-yellow-500" />,
        subtitle: formatPKR(pendingSales.reduce((sum, s) => sum + parseFloat(s.total), 0))
      },
      {
        title: "❌ Cancelled",
        value: cancelledSales.length,
        color: "text-red-600",
        bg: "from-red-50 to-rose-50",
        icon: <AlertCircle className="h-8 w-8 text-red-500" />,
        subtitle: formatPKR(cancelledSales.reduce((sum, s) => sum + parseFloat(s.total), 0))
      },
      {
        title: "↺ Refunded",
        value: refundedSales.length,
        color: "text-orange-600",
        bg: "from-orange-50 to-amber-50",
        icon: <RefreshCw className="h-8 w-8 text-orange-500" />,
        subtitle: formatPKR(refundedSales.reduce((sum, s) => sum + parseFloat(s.total), 0))
      },
      {
        title: "🔄 Fully Returned",
        value: fullyReturned.length,
        color: "text-red-600",
        bg: "from-red-50 to-rose-50",
        icon: <Package className="h-8 w-8 text-red-500" />,
        subtitle: formatPKR(fullyReturned.reduce((sum, s) => sum + parseFloat(s.total_returned_amount || 0), 0))
      },
      {
        title: "🟡 Partial Return",
        value: partiallyReturned.length,
        color: "text-yellow-600",
        bg: "from-yellow-50 to-amber-50",
        icon: <Package className="h-8 w-8 text-yellow-500" />
      },
      {
        title: "🟢 No Return",
        value: noReturn.length,
        color: "text-green-600",
        bg: "from-green-50 to-emerald-50",
        icon: <Package className="h-8 w-8 text-green-500" />
      }
    ];

    return (
      <TooltipProvider>
        <div className="space-y-4 mb-6">
          {/* Primary Cards - Always Visible */}
          <div className={`grid grid-cols-1 sm:grid-cols-2 ${visiblePrimaryCards.length === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-4'} gap-4`}>
            {visiblePrimaryCards.map((card, idx) => (
              <Card key={idx} className={`bg-gradient-to-r ${card.bg}`}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-muted-foreground">{card.title}</p>
                      <p className={`text-2xl font-bold ${card.color}`}>{formatPKR(card.value)}</p>
                      <p className="text-xs text-muted-foreground mt-1">{card.subtitle}</p>
                    </div>
                    {card.icon}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Show More/Less Button - Only show if there are secondary cards */}
          {secondaryCards.length > 0 && (
            <div className="flex justify-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllCards(!showAllCards)}
                className="text-muted-foreground hover:text-foreground"
              >
                {showAllCards ? (
                  <>
                    <ChevronLeft className="h-4 w-4 mr-1 rotate-90" />
                    Show Less
                  </>
                ) : (
                  <>
                    <ChevronRight className="h-4 w-4 mr-1 -rotate-90" />
                    Show More ({secondaryCards.length} more cards)
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Secondary Cards - Collapsible */}
          {showAllCards && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in slide-in-from-top-2 duration-200">
              {secondaryCards.map((card, idx) => (
                <Card key={idx} className={`bg-gradient-to-r ${card.bg}`}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm text-muted-foreground">{card.title}</p>
                        <p className={`text-2xl font-bold ${card.color}`}>
                          {typeof card.value === 'number' ? card.value.toLocaleString() : formatPKR(card.value)}
                        </p>
                        {card.subtitle && (
                          <p className="text-xs text-muted-foreground mt-1">{card.subtitle}</p>
                        )}
                      </div>
                      {card.icon}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </TooltipProvider>
    );
  };


  return (
    <div className="flex-1 flex flex-col overflow-hidden" key={renderKey}>
      <main ref={mainContentRef} className="flex-1 overflow-auto p-6" onScroll={handleScroll}>
        <SummaryCards />

        <Card>
          <CardHeader>
            <div className="flex justify-between flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <CardTitle>Sales History</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setShowShortcuts(true)}><Keyboard className="h-4 w-4" /></Button>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button onClick={handleResetFilters} variant="outline" size="sm">Reset All</Button>
                <Button onClick={handleExport} variant="outline"><Download className="h-4 w-4 mr-2" />Export</Button>
                <Button variant="outline" onClick={() => setShowDueList(true)}><AlertCircle className="h-4 w-4 mr-2" />Due List ({dueSalesCount})</Button>
                <Button variant="outline" onClick={() => setShowWhatsAppModal(true)}><MessageCircle className="h-4 w-4 mr-2" />Share Report</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Input placeholder="Search by receipt, customer, phone..." value={filters.search} onChange={(e) => handleFilterChange('search', e.target.value)} />
              <Input placeholder="Customer Name" value={filters.customerName} onChange={(e) => handleFilterChange('customerName', e.target.value)} />
              <Input type="date" placeholder="Start Date" value={filters.startDate} onChange={(e) => handleFilterChange('startDate', e.target.value)} />
              <Input type="date" placeholder="End Date" value={filters.endDate} onChange={(e) => handleFilterChange('endDate', e.target.value)} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Select value={filters.paymentMethod || "all"} onValueChange={(v) => handleFilterChange('paymentMethod', v === "all" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Payment Method" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectItem value="cash">💵 Cash</SelectItem>
                  <SelectItem value="card">💳 Card</SelectItem>
                  <SelectItem value="easypaisa">📱 EasyPaisa</SelectItem>
                  <SelectItem value="jazzcash">📱 JazzCash</SelectItem>
                  <SelectItem value="bank">🏦 Bank</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.paymentStatus} onValueChange={(v) => handleFilterChange('paymentStatus', v)}>
                <SelectTrigger><SelectValue placeholder="Payment Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">✅ Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="partial">⚠️ Partial</SelectItem>
                  <SelectItem value="cancelled">❌ Cancelled</SelectItem>
                  <SelectItem value="refunded">↺ Refunded</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.returnStatus} onValueChange={(v) => handleFilterChange('returnStatus', v)}>
                <SelectTrigger><SelectValue placeholder="Return Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Returns</SelectItem>
                  <SelectItem value="none">No Return</SelectItem>
                  <SelectItem value="partial">Partial Return</SelectItem>
                  <SelectItem value="full">Full Return</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex gap-2">
                <Input type="number" placeholder="Min Amount" value={filters.minAmount} onChange={(e) => handleFilterChange('minAmount', e.target.value)} className="w-1/2" />
                <Input type="number" placeholder="Max Amount" value={filters.maxAmount} onChange={(e) => handleFilterChange('maxAmount', e.target.value)} className="w-1/2" />
              </div>
            </div>

            <div className="mb-4 text-sm text-muted-foreground">
              {totalCount > 0 ? `Showing ${startIndex} to ${endIndex} of ${totalCount} results` : (!isLoading && "No results found")}
            </div>

            {isLoading ? (
              <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div><span className="ml-2">Loading sales...</span></div>
            ) : (
              <>
                <div className="border rounded-lg overflow-hidden overflow-x-auto">
                  <table className="w-full min-w-[800px]">
                    <thead className="bg-muted/50 border-b">
                      <tr>
                        {columns.map(col => (
                          <th key={col.key} className="text-left p-3 text-sm font-medium">{col.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedData.length > 0 ? (
                        paginatedData.map((sale, idx) => (
                          <tr key={sale.id} className={`border-b hover:bg-muted/30 transition-colors ${idx % 2 === 0 ? 'bg-background' : 'bg-muted/10'}`}>
                            {columns.map(col => (
                              <td key={col.key} className="p-3 align-top">{col.render(sale[col.key], sale)}</td>
                            ))}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={columns.length} className="text-center p-8 text-muted-foreground">
                            No sales found. Try adjusting your filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Custom Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t flex-wrap gap-4">
                    <div className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</div>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                        <ChevronLeft className="h-4 w-4 mr-1" />Previous
                      </Button>
                      <div className="flex space-x-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) pageNum = i + 1;
                          else if (currentPage <= 3) pageNum = i + 1;
                          else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                          else pageNum = currentPage - 2 + i;
                          return (
                            <Button key={pageNum} variant={currentPage === pageNum ? "default" : "outline"} size="sm" onClick={() => setCurrentPage(pageNum)} className="w-10">
                              {pageNum}
                            </Button>
                          );
                        })}
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                        Next<ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
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

      {/* WhatsApp Modal */}
      <Dialog open={showWhatsAppModal} onOpenChange={setShowWhatsAppModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share Sales Report</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-1">WhatsApp Number</p>
              <Input placeholder="923295121520" value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} />
              {shopPhoneNo && (
                <p className="text-xs text-green-600 mt-1">
                  ✓ Shop phone number loaded: {shopPhoneNo}
                  <button onClick={() => setWhatsappNumber(shopPhoneNo)} className="ml-2 text-blue-500 hover:underline text-xs">Use shop number</button>
                </p>
              )}
            </div>
            <div className="bg-muted p-3 rounded-lg">
              <p className="text-sm font-medium">Report Summary:</p>
              <p className="text-xs text-muted-foreground mt-1">Total Sales: {formatPKR(totalSalesAmount)}</p>
              <p className="text-xs text-muted-foreground">Net Revenue: {formatPKR(netRevenue)}</p>
              <p className="text-xs text-muted-foreground">Total Due: {formatPKR(totalCustomerOwes)}</p>
              <p className="text-xs text-muted-foreground">Cash in Hand: {formatPKR(cashInHand)}</p>
              <p className="text-xs text-muted-foreground">Transactions: {totalCount}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWhatsAppModal(false)}>Cancel</Button>
            <Button onClick={() => {
              const dateRange = filters.startDate && filters.endDate
                ? `${filters.startDate} to ${filters.endDate}`
                : 'All Time';
              const message = `📊 *SALES REPORT* 📊%0A%0A` +
                `📅 Period: ${dateRange}%0A` +
                `💰 Total Sales: ${formatPKR(totalSalesAmount)}%0A` +
                `📈 Net Revenue: ${formatPKR(netRevenue)}%0A` +
                `⚠️ Total Due: ${formatPKR(totalCustomerOwes)}%0A` +
                `💵 Cash in Hand: ${formatPKR(cashInHand)}%0A` +
                `📝 Transactions: ${totalCount}%0A%0A` +
                `🏪 Generated: ${new Date().toLocaleString()}`;
              const whatsappUrl = `https://wa.me/${whatsappNumber.replace(/\D/g, '').replace(/^0/, '')}?text=${message}`;
              window.open(whatsappUrl, '_blank');
              setShowWhatsAppModal(false);
            }}>
              <MessageCircle className="h-4 w-4 mr-2" />
              Send via WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selectedSaleForPayment && (
        <PaymentHistoryModal sale={selectedSaleForPayment} isOpen={isPaymentModalOpen} onClose={() => { setIsPaymentModalOpen(false); setSelectedSaleForPayment(null); }} onPaymentRecorded={() => { refetch(); setIsPaymentModalOpen(false); setSelectedSaleForPayment(null); }} />
      )}
    </div>
  );
}