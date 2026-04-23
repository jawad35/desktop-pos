import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { formatPKR } from "@/lib/currency";
import { useToast } from "@/hooks/use-toast";
import { api } from "../services/electron-api";
import { Plus, Edit, ShoppingCart, Clock, CheckCircle, AlertCircle, Trash2, Keyboard, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { z } from "zod";
import { Purchase, Supplier } from "@/types/api";
import { useHeader } from "@/contexts/HeaderContext";
import { Textarea } from "@/components/ui/textarea";
import ItemsDescriptionCell from "@/components/purchase/ItemsDescriptionCell";
import { useLocation } from "wouter";
import { KeyboardShortcutsModal } from "../components/modals/KeyboardShortcutsModal";

// Storage keys
const STORAGE_KEYS = {
  PURCHASES_PAGE: 'purchases_current_page',
  PURCHASES_FILTERS: 'purchases_filters',
  PURCHASES_SCROLL_POSITION: 'purchases_scroll_position'
};

const purchaseFormSchema = z.object({
  poNumber: z.string().min(1, "PO Number is required"),
  supplierId: z.string().min(1, "Supplier is required"),
  subtotal: z.coerce.number().min(0.01, "Subtotal is required"),
  tax: z.coerce.number().min(0, "Tax cannot be negative").default(0),
  total: z.coerce.number().min(0.01, "Total is required"),
  paymentMethod: z.string().default("cash"),
  status: z.string().default("pending"),
  paymentStatus: z.string().default("pending"),
  itemsDescription: z.string().optional(),
});

export default function Purchases() {
  const pageSize = 50;
  const [location] = useLocation();
  const { setTitle, setSubtitle } = useHeader();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  // Load saved state
  const loadSavedPage = () => {
    try {
      const savedPage = localStorage.getItem(STORAGE_KEYS.PURCHASES_PAGE);
      const page = savedPage ? parseInt(savedPage, 10) : 1;
      return isNaN(page) ? 1 : Math.max(1, page);
    } catch (error) {
      return 1;
    }
  };

  const loadSavedFilters = () => {
    try {
      const savedFilters = localStorage.getItem(STORAGE_KEYS.PURCHASES_FILTERS);
      if (savedFilters) {
        const parsed = JSON.parse(savedFilters);
        return {
          startDate: parsed.startDate || "",
          endDate: parsed.endDate || "",
          supplierId: parsed.supplierId || "",
          status: parsed.status || "",
          search: parsed.search || "",  // Add this
        };
      }
    } catch (error) { }
    return {
      startDate: "",
      endDate: "",
      supplierId: "",
      status: "",
      search: "",  // Add this
    };
  };

  const [filters, setFilters] = useState(loadSavedFilters);
  const [currentPage, setCurrentPage] = useState(loadSavedPage);
  const [allPurchasesData, setAllPurchasesData] = useState<any[]>([]);
  const [renderKey, setRenderKey] = useState(0);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);

  const mainContentRef = useRef<HTMLDivElement>(null);
  const isFirstLoadRef = useRef(true);

  // Fetch purchases
  const { isLoading, refetch } = useQuery<any[]>({
    queryKey: ["purchases", location],
    queryFn: async () => {
      const result = await api.getPurchases();
      let allPurchases = [];

      if (Array.isArray(result)) {
        allPurchases = result;
      } else if (result?.success && Array.isArray(result.data)) {
        allPurchases = result.data;
      } else {
        return [];
      }

      allPurchases.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setAllPurchasesData(allPurchases);
      setRenderKey(prev => prev + 1);
      return allPurchases;
    },
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 0,
    cacheTime: 0,
  });

  // Fetch suppliers
  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const result = await api.getSuppliers();
      if (Array.isArray(result)) return result;
      if (result?.success && Array.isArray(result.data)) return result.data;
      return [];
    },
  });

  const form = useForm({
    resolver: zodResolver(purchaseFormSchema),
    defaultValues: {
      poNumber: "",
      supplierId: "",
      subtotal: "",
      tax: "0",
      total: "",
      paymentMethod: "cash",
      status: "pending",
      paymentStatus: "pending",
      itemsDescription: "",
    },
  });

  const createPurchaseMutation = useMutation({
    mutationFn: async (data: any) => {
      const purchaseWithIds = {
        ...data,
        user_id: data.user_id || 'system',
        shop_id: data.shop_id || 'default'
      };
      const result = await api.createPurchase(purchaseWithIds);
      if (result?.success) return result.data;
      return result;
    },
    onSuccess: () => {
      toast({ title: "Purchase Created", description: "Purchase order has been created successfully" });
      refetch();
      setDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updatePurchaseMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const updateData = {
        status: data.status,
        payment_status: data.paymentStatus,
        payment_method: data.paymentMethod,
        items_description: data.itemsDescription,
        subtotal: data.subtotal,
        tax: data.tax,
        total: data.total,
        supplier_id: data.supplier_id
      };
      const result = await api.updatePurchase(id, updateData);
      return result;
    },
    onSuccess: () => {
      toast({ title: "Purchase Updated", description: "Purchase order has been updated successfully" });
      refetch();
      setDialogOpen(false);
      setEditingPurchase(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deletePurchaseMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await api.deletePurchase(id);
      return result?.success === true;
    },
    onSuccess: () => {
      toast({ title: "Purchase Deleted", description: "Purchase order has been deleted successfully" });
      refetch();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this purchase order?")) {
      deletePurchaseMutation.mutate(id);
    }
  };

  const filteredData = useMemo(() => {
    if (allPurchasesData.length === 0) return [];

    let filtered = [...allPurchasesData];

    // Add search filter
    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(purchase =>
        purchase.po_number?.toLowerCase().includes(search) ||
        purchase.items_description?.toLowerCase().includes(search)
      );
    }

    if (filters.supplierId) {
      filtered = filtered.filter(purchase => purchase.supplier_id === filters.supplierId);
    }

    if (filters.status) {
      filtered = filtered.filter(purchase => purchase.status === filters.status);
    }

    if (filters.startDate) {
      filtered = filtered.filter(purchase =>
        new Date(purchase.created_at) >= new Date(filters.startDate)
      );
    }

    if (filters.endDate) {
      filtered = filtered.filter(purchase =>
        new Date(purchase.created_at) <= new Date(filters.endDate)
      );
    }

    return filtered;
  }, [allPurchasesData, filters]);

  // Apply pagination
  const paginatedData = useMemo(() => {
    if (filteredData.length === 0) return [];
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return filteredData.slice(start, end);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / pageSize);
  const startIndex = filteredData.length > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const endIndex = Math.min(currentPage * pageSize, filteredData.length);

  // Page validation
  useEffect(() => {
    if (filteredData.length > 0) {
      const totalPages = Math.ceil(filteredData.length / pageSize);
      if (isFirstLoadRef.current) {
        const savedPage = loadSavedPage();
        let validPage = savedPage;
        if (validPage > totalPages) validPage = totalPages;
        if (validPage < 1) validPage = 1;
        if (validPage !== currentPage) setCurrentPage(validPage);
        isFirstLoadRef.current = false;
      } else if (currentPage > totalPages) {
        setCurrentPage(totalPages);
      } else if (currentPage < 1) {
        setCurrentPage(1);
      }
    } else {
      if (currentPage !== 1) setCurrentPage(1);
    }
  }, [filteredData]);

  // Save to localStorage
  useEffect(() => {
    if (!isFirstLoadRef.current) {
      localStorage.setItem(STORAGE_KEYS.PURCHASES_PAGE, currentPage.toString());
      localStorage.setItem(STORAGE_KEYS.PURCHASES_FILTERS, JSON.stringify(filters));
    }
  }, [currentPage, filters]);

  // Restore scroll position
  useEffect(() => {
    if (!isLoading && paginatedData.length > 0 && mainContentRef.current && !isFirstLoadRef.current) {
      const savedScrollPosition = localStorage.getItem(STORAGE_KEYS.PURCHASES_SCROLL_POSITION);
      if (savedScrollPosition) {
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
      localStorage.setItem(STORAGE_KEYS.PURCHASES_SCROLL_POSITION, mainContentRef.current.scrollTop.toString());
    }
  }, []);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleShortcuts = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
      // Add this inside the keyboard shortcuts useEffect
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
      // Ctrl + A - New Purchase
      if (e.ctrlKey && e.key === 'a') {
        e.preventDefault();
        e.stopPropagation();
        setEditingPurchase(null);
        form.reset({
          poNumber: generatePONumber(),
          supplierId: "",
          subtotal: "",
          tax: "0",
          total: "",
          paymentMethod: "cash",
          status: "pending",
          paymentStatus: "pending",
          itemsDescription: "",
        });
        setDialogOpen(true);
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
        setFilters({ startDate: "", endDate: "", supplierId: "", status: "" });
        setCurrentPage(1);
        return;
      }

      // Arrow Left - Previous Page
      if (e.key === 'ArrowLeft' && currentPage > 1) {
        e.preventDefault();
        setCurrentPage(p => p - 1);
        return;
      }

      // Arrow Right - Next Page
      if (e.key === 'ArrowRight' && currentPage < totalPages) {
        e.preventDefault();
        setCurrentPage(p => p + 1);
        return;
      }
    };

    window.addEventListener('keydown', handleShortcuts);
    return () => window.removeEventListener('keydown', handleShortcuts);
  }, [currentPage, totalPages]);

  const onSubmit = (data: any) => {
    if (editingPurchase) {
      const updateData = {
        status: data.status,
        paymentStatus: data.paymentStatus,
        paymentMethod: data.paymentMethod,
        itemsDescription: data.itemsDescription,
        subtotal: parseFloat(data.subtotal),
        tax: parseFloat(data.tax || 0),
        total: parseFloat(data.total),
        supplier_id: data.supplierId
      };
      updatePurchaseMutation.mutate({ id: editingPurchase.id, data: updateData });
    } else {
      const purchaseData = {
        poNumber: data.poNumber,
        supplierId: data.supplierId,
        subtotal: parseFloat(data.subtotal),
        tax: parseFloat(data.tax || 0),
        total: parseFloat(data.total),
        paymentMethod: data.paymentMethod || "cash",
        status: data.status || "pending",
        paymentStatus: data.paymentStatus || "pending",
        itemsDescription: data.itemsDescription || "",
        user_id: "system",
        shop_id: "default"
      };
      createPurchaseMutation.mutate(purchaseData);
    }
  };

  const generatePONumber = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `PO-${year}${month}${day}-${random}`;
  };

  const handleEdit = (purchase: Purchase) => {
    setEditingPurchase(purchase);
    form.reset({
      poNumber: purchase.po_number,
      supplierId: purchase.supplier_id,
      subtotal: purchase.subtotal.toString(),
      tax: purchase.tax.toString(),
      total: purchase.total.toString(),
      paymentMethod: purchase.payment_method || "cash",
      status: purchase.status,
      paymentStatus: purchase.payment_status,
      itemsDescription: purchase.items_description || "",
    });
    setDialogOpen(true);
  };

  const handleExport = async () => {
    try {
      const headers = ['PO Number', 'Date', 'Supplier', 'Subtotal', 'Tax', 'Total', 'Status', 'Payment Status', 'Items Description'];
      const csvRows = [headers];

      for (const purchase of filteredData) {
        const supplier = suppliers.find(s => s.id === purchase.supplier_id);
        csvRows.push([
          `"${purchase.po_number || ''}"`,
          `"${format(new Date(purchase.created_at), 'dd/MM/yyyy HH:mm')}"`,
          `"${supplier?.name || ''}"`,
          purchase.subtotal?.toString() || '0',
          purchase.tax?.toString() || '0',
          purchase.total?.toString() || '0',
          `"${purchase.status || ''}"`,
          `"${purchase.payment_status || ''}"`,
          `"${purchase.items_description || ''}"`
        ]);
      }

      const csvContent = csvRows.map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `purchases_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({ title: "Export Successful", description: `Exported ${filteredData.length} purchases to CSV` });
    } catch (error) {
      console.error('Export failed:', error);
      toast({ title: "Export Failed", description: "Failed to export purchases data", variant: "destructive" });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'overdue':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'cancelled':
      case 'overdue':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const columns = [
    {
      key: 'po_number' as const,
      label: 'PO Number',
      render: (value: string) => (
        <span className="font-medium text-primary font-mono cursor-pointer hover:underline" onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(value); toast({ title: "Copied!", description: `PO ${value} copied`, duration: 1500 }); }}>
          {value}
        </span>
      ),
    },
    {
      key: 'created_at' as const,
      label: 'Date',
      render: (value: string) => format(new Date(value), 'dd/MM/yyyy'),
    },
    {
      key: 'supplier_id' as const,
      label: 'Supplier',
      render: (value: string) => {
        const supplier = suppliers.find((s: Supplier) => s.id === value);
        return supplier?.name || '-';
      },
    },
    {
      key: 'total' as const,
      label: 'Total Amount',
      render: (value: number) => <span className="font-semibold data-table">{formatPKR(value)}</span>,
    },
    {
      key: 'items_description' as const,
      label: 'Items',
      render: (value: string, row: Purchase) => <ItemsDescriptionCell description={value} />,
    },
    {
      key: 'status' as const,
      label: 'Status',
      render: (value: string) => (
        <Badge className={getStatusColor(value)} variant="secondary">
          <span className="flex items-center space-x-1">
            {getStatusIcon(value)}
            <span>{value?.toUpperCase() || 'UNKNOWN'}</span>
          </span>
        </Badge>
      ),
    },
    {
      key: 'payment_status' as const,
      label: 'Payment',
      render: (value: string) => (
        <Badge className={getStatusColor(value)} variant="outline">
          {value?.toUpperCase() || 'UNKNOWN'}
        </Badge>
      ),
    },
    {
      key: 'id' as const,
      label: 'Actions',
      render: (value: string, row: Purchase) => (
        <div className="flex space-x-2">
          <Button size="sm" variant="ghost" onClick={() => handleEdit(row)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => handleDelete(value)} className="text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  // Calculate summary stats
  const totalPurchases = filteredData.reduce((sum: number, purchase: Purchase) => sum + (purchase.total || 0), 0);
  const pendingOrders = filteredData.filter((purchase: Purchase) => purchase.status === 'pending');
  const deliveredOrders = filteredData.filter((purchase: Purchase) => purchase.status === 'delivered');
  const overdueOrders = filteredData.filter((purchase: Purchase) => purchase.status === 'overdue');

  useEffect(() => {
    setTitle("Purchase Management");
    setSubtitle("Manage purchase orders and supplier relationships");
  }, []);

  return (
    <div className="flex-1 flex flex-col overflow-hidden" key={renderKey}>
      <main
        ref={mainContentRef}
        className="flex-1 overflow-auto p-6"
        onScroll={handleScroll}
      >
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Purchases</p>
                  <p className="text-2xl font-bold text-foreground">{formatPKR(totalPurchases)}</p>
                </div>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <ShoppingCart className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending Orders</p>
                  <p className="text-2xl font-bold text-yellow-600">{pendingOrders.length}</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Delivered</p>
                  <p className="text-2xl font-bold text-green-600">{deliveredOrders.length}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Overdue</p>
                  <p className="text-2xl font-bold text-red-600">{overdueOrders.length}</p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <CardTitle>Purchase Orders</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowShortcuts(true)}
                  className="h-8 w-8"
                  title="Keyboard Shortcuts"
                >
                  <Keyboard className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex space-x-2">
                <Button
                  onClick={() => {
                    localStorage.removeItem(STORAGE_KEYS.PURCHASES_PAGE);
                    localStorage.removeItem(STORAGE_KEYS.PURCHASES_FILTERS);
                    localStorage.removeItem(STORAGE_KEYS.PURCHASES_SCROLL_POSITION);
                    setFilters({ startDate: "", endDate: "", supplierId: "", status: "" });
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
                  Export CSV
                </Button>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-new-purchase">
                      <Plus className="h-4 w-4 mr-2" />
                      New Purchase
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>
                        {editingPurchase ? "Edit Purchase Order" : "Create New Purchase Order"}
                      </DialogTitle>
                    </DialogHeader>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                          control={form.control}
                          name="poNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>PO Number</FormLabel>
                              <div className="flex space-x-2">
                                <FormControl>
                                  <Input {...field} placeholder="PO-2024-001" data-testid="input-po-number" />
                                </FormControl>
                                <Button type="button" variant="outline" onClick={() => field.onChange(generatePONumber())}>
                                  Generate
                                </Button>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="supplierId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Supplier</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select supplier" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {suppliers.map((supplier: Supplier) => (
                                    <SelectItem key={supplier.id} value={supplier.id}>
                                      {supplier.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="subtotal"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Subtotal (PKR)</FormLabel>
                                <FormControl>
                                  <Input type="number" step="0.01" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="tax"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Tax (PKR)</FormLabel>
                                <FormControl>
                                  <Input type="number" step="0.01" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name="total"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Total (PKR)</FormLabel>
                              <FormControl>
                                <Input type="number" step="0.01" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="paymentMethod"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Payment Method</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value || "cash"}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select payment method" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="cash">Cash</SelectItem>
                                  <SelectItem value="card">Card</SelectItem>
                                  <SelectItem value="bank">Bank Transfer</SelectItem>
                                  <SelectItem value="mobile">Mobile Wallet</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="itemsDescription"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Items Purchased</FormLabel>
                              <FormControl>
                                <Textarea {...field} rows={4} placeholder="Describe items purchased (e.g. 10 boxes of smartphones, 5 laptops)" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="status"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Status</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="delivered">Delivered</SelectItem>
                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                    <SelectItem value="overdue">Overdue</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="paymentStatus"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Payment Status</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="paid">Paid</SelectItem>
                                    <SelectItem value="overdue">Overdue</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="flex justify-end space-x-2">
                          <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button type="submit" disabled={createPurchaseMutation.isPending || updatePurchaseMutation.isPending}>
                            {createPurchaseMutation.isPending || updatePurchaseMutation.isPending ? "Saving..." : editingPurchase ? "Update Purchase" : "Create Purchase"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filters */}
          {/* Filters */}
<div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
    <Input
        placeholder="Search by PO number or items... (Ctrl+F)"
        value={filters.search || ""}
        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
    />
    <Input
        type="date"
        placeholder="Start Date"
        value={filters.startDate}
        onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
    />
    <Input
        type="date"
        placeholder="End Date"
        value={filters.endDate}
        onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
    />
    <Select
        value={filters.supplierId || "all"}
        onValueChange={(value) => setFilters({ ...filters, supplierId: value === "all" ? "" : value })}
    >
        <SelectTrigger>
            <SelectValue placeholder="All Suppliers" />
        </SelectTrigger>
        <SelectContent>
            <SelectItem value="all">All Suppliers</SelectItem>
            {suppliers.map((supplier: Supplier) => (
                <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.name}
                </SelectItem>
            ))}
        </SelectContent>
    </Select>
    <Select
        value={filters.status || "all"}
        onValueChange={(value) => setFilters({ ...filters, status: value === "all" ? "" : value })}
    >
        <SelectTrigger>
            <SelectValue placeholder="All Status" />
        </SelectTrigger>
        <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
        </SelectContent>
    </Select>
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
                <span className="ml-2 text-muted-foreground">Loading purchases...</span>
              </div>
            ) : (
              <>
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
                          paginatedData.map((purchase: any, index: number) => (
                            <tr key={purchase.id} className={`border-b hover:bg-muted/30 transition-colors ${index % 2 === 0 ? 'bg-background' : 'bg-muted/10'}`}>
                              {columns.map((column) => (
                                <td key={column.key} className="p-3">
                                  {column.render(purchase[column.key], purchase)}
                                </td>
                              ))}
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={columns.length} className="text-center p-8 text-muted-foreground">
                              No purchases found.
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

      <KeyboardShortcutsModal
        open={showShortcuts}
        onOpenChange={setShowShortcuts}
        title="Purchases Page Shortcuts"
        shortcuts={[
          { key: "Ctrl + A", description: "New Purchase Order" },
          { key: "Ctrl + E", description: "Export Purchases" },
          { key: "Ctrl + C", description: "Clear All Filters" },
          { key: "Ctrl + F", description: "Focus Search Bar" },
          { key: "←", description: "Previous Page" },
          { key: "→", description: "Next Page" },
        ]}
      />
    </div>
  );
}