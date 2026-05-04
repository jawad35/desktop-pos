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
import { Plus, Edit, ShoppingCart, Clock, CheckCircle, AlertCircle, Trash2, Keyboard, ChevronLeft, ChevronRight, Package, Search, Save } from "lucide-react";
import { format } from "date-fns";
import { z } from "zod";
import { Purchase, Supplier, Product } from "@/types/api";
import { useHeader } from "@/contexts/HeaderContext";
import { Textarea } from "@/components/ui/textarea";
import ItemsDescriptionCell from "@/components/purchase/ItemsDescriptionCell";
import { useLocation } from "wouter";
import { KeyboardShortcutsModal } from "../components/modals/KeyboardShortcutsModal";
import { ProductModal } from "../components/purchases/ProductModal";

// Storage keys
// Storage keys - separate for new purchase drafts
const STORAGE_KEYS = {
  PURCHASES_PAGE: 'purchases_current_page',
  PURCHASES_FILTERS: 'purchases_filters',
  PURCHASES_SCROLL_POSITION: 'purchases_scroll_position',
  PURCHASES_DRAFT: 'purchases_draft_items',
  PURCHASES_DRAFT_FORM: 'purchases_draft_form'
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

interface PurchaseItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface DraftFormData {
  poNumber: string;
  supplierId: string;
  tax: number;
  paymentMethod: string;
  status: string;
  paymentStatus: string;
}

export default function Purchases() {
  const pageSize = 50;
  const [location] = useLocation();
  const { setTitle, setSubtitle } = useHeader();
  const { toast } = useToast();
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([]);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editProductModalOpen, setEditProductModalOpen] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

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
          search: parsed.search || "",
        };
      }
    } catch (error) { }
    return {
      startDate: "",
      endDate: "",
      supplierId: "",
      status: "",
      search: "",
    };
  };

  const loadDraftItems = (): PurchaseItem[] => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PURCHASES_DRAFT);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Validate and return only valid items
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (error) {
      console.error("Error loading draft items:", error);
    }
    return [];
  };

  const loadDraftFormData = (): DraftFormData | null => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PURCHASES_DRAFT_FORM);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error("Error loading draft form data:", error);
    }
    return null;
  };

  const saveDraftItems = (items: PurchaseItem[]) => {
    try {
      localStorage.setItem(STORAGE_KEYS.PURCHASES_DRAFT, JSON.stringify(items));
    } catch (error) {
      console.error("Error saving draft items:", error);
    }
  };

  const saveDraftFormData = (data: DraftFormData) => {
    try {
      localStorage.setItem(STORAGE_KEYS.PURCHASES_DRAFT_FORM, JSON.stringify(data));
    } catch (error) {
      console.error("Error saving draft form data:", error);
    }
  };

  const clearDraft = () => {
    localStorage.removeItem(STORAGE_KEYS.PURCHASES_DRAFT);
    localStorage.removeItem(STORAGE_KEYS.PURCHASES_DRAFT_FORM);
    // Don't set form value here, let the reset handle it
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

  const form = useForm({
    resolver: zodResolver(purchaseFormSchema),
    defaultValues: {
      poNumber: "",
      supplierId: "none", // Change from "" to "none"
      subtotal: 0,
      tax: 0,
      total: 0,
      paymentMethod: "cash",
      status: "pending",
      paymentStatus: "pending",
      itemsDescription: "",
    },
  });
// Save form data to localStorage ONLY for new purchases (not edit)
useEffect(() => {
  if (dialogOpen && !editingPurchase && !isInitialLoad) {
    const formData: DraftFormData = {
      poNumber: form.watch("poNumber"),
      supplierId: form.watch("supplierId"),
      tax: form.watch("tax"),
      paymentMethod: form.watch("paymentMethod"),
      status: form.watch("status"),
      paymentStatus: form.watch("paymentStatus"),
    };
    saveDraftFormData(formData);
  }
}, [
  dialogOpen,
  editingPurchase,
  form.watch("poNumber"),
  form.watch("supplierId"),
  form.watch("tax"),
  form.watch("paymentMethod"),
  form.watch("status"),
  form.watch("paymentStatus"),
]);

// Save purchase items to localStorage ONLY for new purchases
useEffect(() => {
  if (dialogOpen && !editingPurchase && purchaseItems.length > 0) {
    saveDraftItems(purchaseItems);
  } else if (dialogOpen && !editingPurchase && purchaseItems.length === 0) {
    localStorage.removeItem(STORAGE_KEYS.PURCHASES_DRAFT);
  }
}, [purchaseItems, dialogOpen, editingPurchase]);

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


  // Load draft data when component mounts (for tab switching)
  useEffect(() => {
    console.log("🔄 Component mounted - loading draft data");
    const savedItems = loadDraftItems();
    const savedForm = loadDraftFormData();

    if (savedItems.length > 0 && !dialogOpen) {
      console.log("✅ Loading saved draft items on mount:", savedItems.length);
      setPurchaseItems(savedItems);

      if (savedForm && savedForm.poNumber) {
        form.setValue("poNumber", savedForm.poNumber);
        form.setValue("supplierId", savedForm.supplierId || "none");
        form.setValue("tax", savedForm.tax);
        form.setValue("paymentMethod", savedForm.paymentMethod);
        form.setValue("status", savedForm.status);
        form.setValue("paymentStatus", savedForm.paymentStatus);
      }
    } else {
      console.log("ℹ️ No draft items found on mount");
    }
  }, []); // Empty dependency array - runs only on mount

  // Save draft when component unmounts (tab switching)
  useEffect(() => {
    return () => {
      // This runs when component unmounts (switching tabs)
      if (purchaseItems.length > 0 && !dialogOpen) {
        console.log("💾 Saving draft before unmount:", purchaseItems.length, "items");
        saveDraftItems(purchaseItems);
        saveDraftFormData({
          poNumber: form.getValues("poNumber"),
          supplierId: form.getValues("supplierId"),
          tax: form.getValues("tax"),
          paymentMethod: form.getValues("paymentMethod"),
          status: form.getValues("status"),
          paymentStatus: form.getValues("paymentStatus"),
        });
      }
    };
  }, [purchaseItems, form]); // Runs when purchaseItems or form changes


  const [productSearchTerm, setProductSearchTerm] = useState("");
  const [productSearchResults, setProductSearchResults] = useState<Product[]>([]);
  const [isSearchingProducts, setIsSearchingProducts] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();


  // Add this function before the return statement (around line 600-620):

  const shareViaWhatsApp = () => {
    const supplierId = form.getValues("supplierId");
    const supplier = suppliers.find(s => s.id === supplierId);

    if (!supplier) {
      toast({ title: "Error", description: "Please select a supplier first", variant: "destructive" });
      return;
    }

    if (!supplier.phone) {
      toast({ title: "Error", description: "Supplier has no phone number", variant: "destructive" });
      return;
    }

    if (purchaseItems.length === 0) {
      toast({ title: "Error", description: "No items to share", variant: "destructive" });
      return;
    }

    // Build the message
    let message = `*PURCHASE ORDER*\n`;
    message += `PO Number: ${form.getValues("poNumber")}\n`;
    message += `Date: ${format(new Date(), 'dd/MM/yyyy')}\n`;
    message += `Supplier: ${supplier.name}\n`;
    message += `\n*ITEMS:*\n`;

    purchaseItems.forEach((item, index) => {
      message += `${index + 1}. ${item.product_name}\n`;
      message += `   Qty: ${item.quantity} × ${formatPKR(item.unit_price)} = ${formatPKR(item.total)}\n`;
    });

    const subtotal = calculateSubtotal();
    const tax = form.getValues("tax");
    const total = subtotal + tax;

    message += `\n*SUMMARY:*\n`;
    message += `Subtotal: ${formatPKR(subtotal)}\n`;
    message += `Tax: ${formatPKR(tax)}\n`;
    message += `*Total: ${formatPKR(total)}*\n`;
    message += `\nThank you for your business!`;

    // Encode for WhatsApp
    const encodedMessage = encodeURIComponent(message);
    const phoneNumber = supplier.phone.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;

    window.open(whatsappUrl, '_blank');
    toast({ description: "Opening WhatsApp..." });
  };

  const searchProducts = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setProductSearchResults([]);
      return;
    }

    setIsSearchingProducts(true);
    try {
      const result = await api.getProducts({ search: searchTerm });
      let products = [];
      if (Array.isArray(result)) {
        products = result;
      } else if (result?.success && Array.isArray(result.data)) {
        products = result.data;
      } else if (result?.data && Array.isArray(result.data)) {
        products = result.data;
      }
      setProductSearchResults(products);
    } catch (error) {
      console.error("Error searching products:", error);
    } finally {
      setIsSearchingProducts(false);
    }
  };

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      searchProducts(productSearchTerm);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [productSearchTerm]);

  const addProductToPurchase = (product: Product) => {
    const existingItem = purchaseItems.find(item => item.product_id === product.id);

    if (existingItem) {
      const newItems = purchaseItems.map(item =>
        item.product_id === product.id
          ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.unit_price }
          : item
      );
      setPurchaseItems(newItems);
    } else {
      const newItems = [...purchaseItems, {
        product_id: product.id,
        product_name: product.name,
        quantity: 1,
        unit_price: product.cost_price || product.selling_price || 0,
        total: product.cost_price || product.selling_price || 0
      }];
      setPurchaseItems(newItems);
    }

    setProductSearchTerm("");
    setProductSearchResults([]);
    toast({ description: `${product.name} added to purchase` });
  };

  const removePurchaseItem = (productId: string) => {
    const newItems = purchaseItems.filter(item => item.product_id !== productId);
    setPurchaseItems(newItems);
    toast({ description: "Item removed from purchase" });
  };

  const updatePurchaseItemQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removePurchaseItem(productId);
      return;
    }

    const newItems = purchaseItems.map(item =>
      item.product_id === productId
        ? { ...item, quantity, total: quantity * item.unit_price }
        : item
    );
    setPurchaseItems(newItems);
  };

  const updatePurchaseItemPrice = (productId: string, unitPrice: number) => {
    const newItems = purchaseItems.map(item =>
      item.product_id === productId
        ? { ...item, unit_price: unitPrice, total: item.quantity * unitPrice }
        : item
    );
    setPurchaseItems(newItems);
  };

  const calculateSubtotal = () => {
    return purchaseItems.reduce((sum, item) => sum + item.total, 0);
  };

  const generateItemsDescription = () => {
    if (purchaseItems.length === 0) return "";
    return purchaseItems.map(item =>
      `${item.product_name}: ${item.quantity} × ${formatPKR(item.unit_price)} = ${formatPKR(item.total)}`
    ).join("\n");
  };

  // Update form when purchase items change
  useEffect(() => {
    const subtotal = calculateSubtotal();
    const tax = form.watch("tax") || 0;
    const total = subtotal + tax;

    form.setValue("subtotal", subtotal);
    form.setValue("total", total);
    form.setValue("itemsDescription", generateItemsDescription());
  }, [purchaseItems]);

  // Load draft when dialog opens
  // Load draft when dialog opens
  useEffect(() => {
    if (dialogOpen && !editingPurchase) {
      setIsInitialLoad(true);

      // Load saved items
      const draftItems = loadDraftItems();
      if (draftItems.length > 0) {
        setPurchaseItems(draftItems);
      } else {
        setPurchaseItems([]);
      }

      // Load saved form data
      const draftForm = loadDraftFormData();
      if (draftForm && draftForm.poNumber) { // Check if draft exists
        form.setValue("poNumber", draftForm.poNumber);
        form.setValue("supplierId", draftForm.supplierId || "none");
        form.setValue("tax", draftForm.tax);
        form.setValue("paymentMethod", draftForm.paymentMethod);
        form.setValue("status", draftForm.status);
        form.setValue("paymentStatus", draftForm.paymentStatus);
      } else {
        // Only set PO number if no draft exists
        if (!form.getValues("poNumber")) {
          form.setValue("poNumber", generatePONumber());
        }
        if (!form.getValues("supplierId") || form.getValues("supplierId") === "") {
          form.setValue("supplierId", "none");
        }
      }

      setIsInitialLoad(false);
    }
  }, [dialogOpen, editingPurchase]);




const createPurchaseMutation = useMutation({
  mutationFn: async (data: any) => {
    const purchaseWithIds = {
      ...data,
      user_id: data.user_id || 'system',
      shop_id: data.shop_id || 'default',
      items: purchaseItems.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price
      }))
    };
    const result = await api.createPurchase(purchaseWithIds);
    if (result?.success) return result.data;
    return result;
  },
  onSuccess: () => {
    toast({ title: "Purchase Created", description: "Purchase order has been created successfully" });
    refetch();
    
    setPurchaseItems([]);
    clearDraft(); // Clear draft ONLY after successful new purchase
    
    form.reset({
      poNumber: generatePONumber(),
      supplierId: "none",
      subtotal: 0,
      tax: 0,
      total: 0,
      paymentMethod: "cash",
      status: "pending",
      paymentStatus: "pending",
      itemsDescription: "",
    });
    
    setDialogOpen(false);
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
      supplier_id: data.supplier_id === "none" ? "" : data.supplier_id,
      items: purchaseItems.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price
      }))
    };
    const result = await api.updatePurchase(id, updateData);
    return result;
  },
  onSuccess: () => {
    toast({ title: "Purchase Updated", description: "Purchase order has been updated successfully" });
    refetch();
    setDialogOpen(false);
    setEditingPurchase(null);
    setPurchaseItems([]);
    // DON'T clear draft here - keep for new purchases
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

  const paginatedData = useMemo(() => {
    if (filteredData.length === 0) return [];
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return filteredData.slice(start, end);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / pageSize);
  const startIndex = filteredData.length > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const endIndex = Math.min(currentPage * pageSize, filteredData.length);

  useEffect(() => {
    if (filteredData.length > 0) {
      const totalPagesCount = Math.ceil(filteredData.length / pageSize);
      if (isFirstLoadRef.current) {
        const savedPage = loadSavedPage();
        let validPage = savedPage;
        if (validPage > totalPagesCount) validPage = totalPagesCount;
        if (validPage < 1) validPage = 1;
        if (validPage !== currentPage) setCurrentPage(validPage);
        isFirstLoadRef.current = false;
      } else if (currentPage > totalPagesCount) {
        setCurrentPage(totalPagesCount);
      } else if (currentPage < 1) {
        setCurrentPage(1);
      }
    } else {
      if (currentPage !== 1) setCurrentPage(1);
    }
  }, [filteredData]);

  useEffect(() => {
    if (!isFirstLoadRef.current) {
      localStorage.setItem(STORAGE_KEYS.PURCHASES_PAGE, currentPage.toString());
      localStorage.setItem(STORAGE_KEYS.PURCHASES_FILTERS, JSON.stringify(filters));
    }
  }, [currentPage, filters]);

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

  useEffect(() => {
    const handleShortcuts = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        e.stopPropagation();
        const searchInput = document.querySelector('input[placeholder*="Search PO"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        }
        return;
      }

      if (e.ctrlKey && e.key === 'a') {
        e.preventDefault();
        e.stopPropagation();
        setEditingPurchase(null);
        const draftItems = loadDraftItems();
        const draftForm = loadDraftFormData();
        setPurchaseItems(draftItems);
        form.reset({
          poNumber: draftForm?.poNumber || generatePONumber(),
          supplierId: draftForm?.supplierId || "",
          subtotal: 0,
          tax: draftForm?.tax || 0,
          total: 0,
          paymentMethod: draftForm?.paymentMethod || "cash",
          status: draftForm?.status || "pending",
          paymentStatus: draftForm?.paymentStatus || "pending",
          itemsDescription: "",
        });
        setDialogOpen(true);
        return;
      }

      if (e.ctrlKey && e.key === 'e') {
        e.preventDefault();
        e.stopPropagation();
        handleExport();
        return;
      }

      if (e.ctrlKey && e.key === 'c') {
        e.preventDefault();
        e.stopPropagation();
        setFilters({ startDate: "", endDate: "", supplierId: "", status: "", search: "" });
        setCurrentPage(1);
        return;
      }

      if (e.key === 'ArrowLeft' && currentPage > 1) {
        e.preventDefault();
        setCurrentPage(p => p - 1);
        return;
      }

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
    const supplierId = data.supplierId === "none" ? "" : data.supplierId;

    if (editingPurchase) {
      const updateData = {
        status: data.status,
        paymentStatus: data.paymentStatus,
        paymentMethod: data.paymentMethod,
        itemsDescription: data.itemsDescription,
        subtotal: parseFloat(data.subtotal),
        tax: parseFloat(data.tax || 0),
        total: parseFloat(data.total),
        supplier_id: supplierId,
        items: purchaseItems.map(item => ({  // Send items for update
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price
        }))
      };
      updatePurchaseMutation.mutate({ id: editingPurchase.id, data: updateData });
    } else {
      const purchaseData = {
        poNumber: data.poNumber,
        supplierId: supplierId,
        subtotal: parseFloat(data.subtotal),
        tax: parseFloat(data.tax || 0),
        total: parseFloat(data.total),
        paymentMethod: data.paymentMethod || "cash",
        status: data.status || "pending",
        paymentStatus: data.paymentStatus || "pending",
        itemsDescription: data.itemsDescription || "",
        user_id: "system",
        shop_id: "default",
        items: purchaseItems.map(item => ({  // Send items for new purchase
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price
        }))
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

    // Find the full purchase data from already loaded data
    const fullPurchase = allPurchasesData.find(p => p.id === purchase.id);

    if (fullPurchase && fullPurchase.items) {
      // Load items into state
      const items = fullPurchase.items.map((item: any) => ({
        product_id: item.product_id,
        product_name: item.product_name || 'Unknown Product',
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.quantity * item.unit_price
      }));
      setPurchaseItems(items);
      console.log("Loaded items:", items.length);
    } else {
      setPurchaseItems([]);
    }

    form.reset({
      poNumber: purchase.po_number,
      supplierId: purchase.supplier_id || "none",
      subtotal: purchase.subtotal,
      tax: purchase.tax,
      total: purchase.total,
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
      render: (value: number) => <span className="font-semibold">{formatPKR(value)}</span>,
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

  console.log(form.getValues("supplierId"), 'han 9999')

  const totalPurchases = filteredData.reduce((sum: number, purchase: Purchase) => sum + (purchase.total || 0), 0);
  const pendingOrders = filteredData.filter((purchase: Purchase) => purchase.status === 'pending');
  const deliveredOrders = filteredData.filter((purchase: Purchase) => purchase.status === 'delivered');
  const overdueOrders = filteredData.filter((purchase: Purchase) => purchase.status === 'overdue');

  useEffect(() => {
    setTitle("Purchase Management");
    setSubtitle("Manage purchase orders and supplier relationships");
  }, []);

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setEditProductModalOpen(true);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden" key={renderKey}>
      <main
        ref={mainContentRef}
        className="flex-1 overflow-auto p-6"
        onScroll={handleScroll}
      >
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
                <Button variant="ghost" size="icon" onClick={() => setShowShortcuts(true)} className="h-8 w-8" title="Keyboard Shortcuts">
                  <Keyboard className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex space-x-2">
                <Button onClick={() => {
                  localStorage.removeItem(STORAGE_KEYS.PURCHASES_PAGE);
                  localStorage.removeItem(STORAGE_KEYS.PURCHASES_FILTERS);
                  localStorage.removeItem(STORAGE_KEYS.PURCHASES_SCROLL_POSITION);
                  setFilters({ startDate: "", endDate: "", supplierId: "", status: "", search: "" });
                  setCurrentPage(1);
                  isFirstLoadRef.current = true;
                  setRenderKey(prev => prev + 1);
                  toast({ title: "Reset", description: "All filters and pagination have been reset" });
                  refetch();
                }} variant="outline" size="sm">Reset All</Button>
                <Button onClick={handleExport} variant="outline">Export CSV</Button>

                <Dialog open={dialogOpen} onOpenChange={(open) => {
                  setDialogOpen(open);
                  if (!open && !editingPurchase) {
                    // Don't clear on close - keep draft for next time
                    // The draft persists in localStorage
                  }
                }}>
         <DialogTrigger asChild>
  <Button 
    data-testid="button-new-purchase"
    onClick={() => {
      setEditingPurchase(null);
      // Load draft items for new purchase
      const draftItems = loadDraftItems();
      const draftForm = loadDraftFormData();
      
      if (draftItems.length > 0) {
        setPurchaseItems(draftItems);
      } else {
        setPurchaseItems([]);
      }
      
      if (draftForm && draftForm.poNumber) {
        form.reset({
          poNumber: draftForm.poNumber,
          supplierId: draftForm.supplierId || "none",
          subtotal: 0,
          tax: draftForm.tax || 0,
          total: 0,
          paymentMethod: draftForm.paymentMethod || "cash",
          status: draftForm.status || "pending",
          paymentStatus: draftForm.paymentStatus || "pending",
          itemsDescription: "",
        });
      } else {
        form.reset({
          poNumber: generatePONumber(),
          supplierId: "none",
          subtotal: 0,
          tax: 0,
          total: 0,
          paymentMethod: "cash",
          status: "pending",
          paymentStatus: "pending",
          itemsDescription: "",
        });
      }
    }}
  >
    <Plus className="h-4 w-4 mr-2" />
    New Purchase
  </Button>
</DialogTrigger>
                  <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{editingPurchase ? "Edit Purchase Order" : "Create New Purchase Order"}</DialogTitle>
                    </DialogHeader>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField control={form.control} name="poNumber" render={({ field }) => (
                            <FormItem>
                              <FormLabel>PO Number</FormLabel>
                              <div className="flex space-x-2">
                                <FormControl><Input {...field} placeholder="PO-2024-001" /></FormControl>
                                <Button type="button" variant="outline" onClick={() => field.onChange(generatePONumber())}>Generate</Button>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )} />


                          <FormField control={form.control} name="supplierId" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Supplier</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value || "none"}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select supplier" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="none">None</SelectItem>
                                  {suppliers.map((supplier: Supplier) => (
                                    <SelectItem key={supplier.id} value={supplier.id}>{supplier.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <FormLabel>Search & Add Products</FormLabel>
                            <Button type="button" variant="outline" size="sm" onClick={() => setProductModalOpen(true)}>
                              <Plus className="h-4 w-4 mr-1" /> Add New Product
                            </Button>
                          </div>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Type to search products by name, SKU, or barcode..." value={productSearchTerm} onChange={(e) => setProductSearchTerm(e.target.value)} className="pl-10" />
                          </div>

                          {productSearchTerm && productSearchResults.length > 0 && (
                            <div className="mt-2 border rounded-lg max-h-60 overflow-y-auto">
                              <div className="sticky top-0 bg-muted px-3 py-2 text-xs font-medium border-b">Found {productSearchResults.length} products</div>
                              {productSearchResults.map(product => (
                                <div key={product.id} className="flex justify-between items-center p-3 hover:bg-muted cursor-pointer border-b">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-3">
                                      {product.image_url ? (
                                        <img src={product.image_url} alt={product.name} className="w-10 h-10 object-cover rounded" />
                                      ) : (
                                        <div className="w-10 h-10 bg-muted rounded flex items-center justify-center"><Package className="h-5 w-5 text-muted-foreground" /></div>
                                      )}
                                      <div>
                                        <p className="font-medium">{product.name}</p>
                                        <p className="text-xs text-muted-foreground">SKU: {product.sku} | Stock: {product.stock}</p>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="text-right mr-3">
                                    <p className="text-sm">Cost: {formatPKR(product.cost_price)}</p>
                                    <p className="text-sm">Selling: {formatPKR(product.selling_price)}</p>
                                  </div>
                                  <div className="flex gap-1">
                                    <Button size="sm" variant="outline" onClick={() => handleEditProduct(product)}><Edit className="h-3 w-3 mr-1" />Edit</Button>
                                    <Button size="sm" onClick={() => addProductToPurchase(product)}>Add</Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {productSearchTerm && !isSearchingProducts && productSearchResults.length === 0 && (
                            <div className="mt-2 p-3 text-center text-muted-foreground border rounded-lg">
                              No products found. <Button variant="link" className="p-0 h-auto" onClick={() => setProductModalOpen(true)}>Add new product?</Button>
                            </div>
                          )}
                        </div>

                        {purchaseItems.length > 0 ? (
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <FormLabel>Purchase Items ({purchaseItems.length} items)</FormLabel>
                              <Button type="button" variant="ghost" size="sm" onClick={() => { if (confirm("Clear all items?")) { setPurchaseItems([]); clearDraft(); } }}>Clear All</Button>
                            </div>
                            <div className="border rounded-lg mt-1 overflow-x-auto">
                              <table className="w-full">
                                <thead className="bg-muted/50">
                                  <tr>
                                    <th className="text-left p-2 text-sm">Product</th>
                                    <th className="text-center p-2 text-sm w-24">Quantity</th>
                                    <th className="text-right p-2 text-sm w-32">Unit Price</th>
                                    <th className="text-right p-2 text-sm w-32">Total</th>
                                    <th className="text-center p-2 text-sm w-16">Action</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {purchaseItems.map(item => (
                                    <tr key={item.product_id} className="border-t">
                                      <td className="p-2 text-sm font-medium">{item.product_name}</td>
                                      <td className="p-2 text-center">
                                        <Input type="number" min="1" value={item.quantity} onChange={(e) => updatePurchaseItemQuantity(item.product_id, parseInt(e.target.value))} className="w-20 text-center" />
                                      </td>
                                      <td className="p-2 text-right">
                                        <Input type="number" step="0.01" value={item.unit_price} onChange={(e) => updatePurchaseItemPrice(item.product_id, parseFloat(e.target.value))} className="w-28 text-right" />
                                      </td>
                                      <td className="p-2 text-right font-semibold">{formatPKR(item.total)}</td>
                                      <td className="p-2 text-center">
                                        <Button type="button" size="sm" variant="ghost" onClick={() => removePurchaseItem(item.product_id)} className="text-red-500">
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ) : (
                          <div className="border rounded-lg p-8 text-center text-muted-foreground">
                            <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p>No items added yet</p>
                            <p className="text-sm">Type above to search and add products to your purchase</p>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                          <FormField control={form.control} name="subtotal" render={({ field }) => (
                            <FormItem><FormLabel>Subtotal (PKR)</FormLabel><FormControl><Input type="number" step="0.01" {...field} readOnly className="bg-muted" /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="tax" render={({ field }) => (
                            <FormItem><FormLabel>Tax (PKR)</FormLabel><FormControl><Input type="number" step="0.01" {...field} onChange={(e) => { field.onChange(e); const tax = parseFloat(e.target.value) || 0; form.setValue("total", calculateSubtotal() + tax); }} /></FormControl><FormMessage /></FormItem>
                          )} />
                        </div>

                        <FormField control={form.control} name="total" render={({ field }) => (
                          <FormItem><FormLabel>Total (PKR)</FormLabel><FormControl><Input type="number" step="0.01" {...field} readOnly className="bg-muted font-bold" /></FormControl><FormMessage /></FormItem>
                        )} />

                        <div className="grid grid-cols-2 gap-4">
                          <FormField control={form.control} name="paymentMethod" render={({ field }) => (
                            <FormItem><FormLabel>Payment Method</FormLabel><Select onValueChange={field.onChange} value={field.value || "cash"}><FormControl><SelectTrigger><SelectValue placeholder="Select payment method" /></SelectTrigger></FormControl><SelectContent><SelectItem value="cash">Cash</SelectItem><SelectItem value="card">Card</SelectItem><SelectItem value="bank">Bank Transfer</SelectItem><SelectItem value="mobile">Mobile Wallet</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                          )} />
                          <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="status" render={({ field }) => (
                              <FormItem><FormLabel>Status</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="delivered">Delivered</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem><SelectItem value="overdue">Overdue</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="paymentStatus" render={({ field }) => (
                              <FormItem><FormLabel>Payment Status</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="paid">Paid</SelectItem><SelectItem value="overdue">Overdue</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                            )} />
                          </div>
                        </div>

                        <FormField control={form.control} name="itemsDescription" render={({ field }) => (
                          <FormItem><FormLabel>Items Description (Auto-generated)</FormLabel><FormControl><Textarea {...field} rows={3} readOnly className="bg-muted" /></FormControl><FormMessage /></FormItem>
                        )} />

                        <div className="flex justify-end space-x-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setDialogOpen(false);
                            }}
                          >
                            Cancel
                          </Button>

                          {/* WhatsApp Share Button */}
                          <Button
                            type="button"
                            variant="outline"
                            className="bg-green-500 hover:bg-green-600 text-white"
                            onClick={shareViaWhatsApp}
                            disabled={purchaseItems.length === 0 || !form.getValues("supplierId") || form.getValues("supplierId") === "none"}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="mr-2"
                            >
                              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                            </svg>
                            Share via WhatsApp
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
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
              <Input placeholder="Search PO number or items... (Ctrl+F)" value={filters.search || ""} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
              <Input type="date" placeholder="Start Date" value={filters.startDate} onChange={(e) => setFilters({ ...filters, startDate: e.target.value })} />
              <Input type="date" placeholder="End Date" value={filters.endDate} onChange={(e) => setFilters({ ...filters, endDate: e.target.value })} />
              <Select value={filters.supplierId || "all"} onValueChange={(value) => setFilters({ ...filters, supplierId: value === "all" ? "" : value })}>
                <SelectTrigger><SelectValue placeholder="All Suppliers" /></SelectTrigger>
                <SelectContent><SelectItem value="all">All Suppliers</SelectItem>{suppliers.map((supplier: Supplier) => (<SelectItem key={supplier.id} value={supplier.id}>{supplier.name}</SelectItem>))}</SelectContent>
              </Select>
              <Select value={filters.status || "all"} onValueChange={(value) => setFilters({ ...filters, status: value === "all" ? "" : value })}>
                <SelectTrigger><SelectValue placeholder="All Status" /></SelectTrigger>
                <SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="delivered">Delivered</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem><SelectItem value="overdue">Overdue</SelectItem></SelectContent>
              </Select>
            </div>

            <div className="mb-4 text-sm text-muted-foreground">
              {filteredData.length > 0 ? `Showing ${startIndex} to ${endIndex} of ${filteredData.length} results` : (!isLoading && "No results found")}
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div><span className="ml-2 text-muted-foreground">Loading purchases...</span></div>
            ) : (
              <>
                <div className="border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/50 border-b">
                        <tr>
                          {columns.map((column) => (<th key={column.key} className="text-left p-3 font-medium text-sm">{column.label}</th>))}
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedData.length > 0 ? paginatedData.map((purchase: any, index: number) => (
                          <tr key={purchase.id} className={`border-b hover:bg-muted/30 transition-colors ${index % 2 === 0 ? 'bg-background' : 'bg-muted/10'}`}>
                            {columns.map((column) => (<td key={column.key} className="p-3">{column.render(purchase[column.key], purchase)}</td>))}
                          </tr>
                        )) : (
                          <tr><td colSpan={columns.length} className="text-center p-8 text-muted-foreground">No purchases found.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <div className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</div>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4 mr-1" />Previous</Button>
                      <div className="flex space-x-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) { pageNum = i + 1; }
                          else if (currentPage <= 3) { pageNum = i + 1; }
                          else if (currentPage >= totalPages - 2) { pageNum = totalPages - 4 + i; }
                          else { pageNum = currentPage - 2 + i; }
                          return (<Button key={pageNum} variant={currentPage === pageNum ? "default" : "outline"} size="sm" onClick={() => setCurrentPage(pageNum)} className="w-10">{pageNum}</Button>);
                        })}
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next<ChevronRight className="h-4 w-4 ml-1" /></Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </main>

      <KeyboardShortcutsModal open={showShortcuts} onOpenChange={setShowShortcuts} title="Purchases Page Shortcuts" shortcuts={[
        { key: "Ctrl + A", description: "New Purchase Order" },
        { key: "Ctrl + E", description: "Export Purchases" },
        { key: "Ctrl + C", description: "Clear All Filters" },
        { key: "Ctrl + F", description: "Focus Search Bar" },
        { key: "←", description: "Previous Page" },
        { key: "→", description: "Next Page" },
      ]} />

      <ProductModal open={productModalOpen} onOpenChange={setProductModalOpen} onProductCreated={() => { toast({ title: "Product Created", description: "Product has been added. You can now add it to your purchase." }); setProductModalOpen(false); }} />

      <ProductModal open={editProductModalOpen} onOpenChange={setEditProductModalOpen} editingProduct={editingProduct} onProductUpdated={() => { toast({ title: "Product Updated", description: "Product has been updated." }); setEditProductModalOpen(false); setEditingProduct(null); if (productSearchTerm) { searchProducts(productSearchTerm); } }} />
    </div>
  );
}