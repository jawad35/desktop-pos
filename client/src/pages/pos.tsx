import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatPKR } from "@/lib/currency";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Product, Category, Brand, Supplier } from "@/types/api";
import BarcodeScanner from "react-qr-barcode-scanner"
import { api } from "../services/electron-api";
import { useSettings } from "@/hooks/useSettings";
import {
    Search,
    Mic,
    QrCode,
    ShoppingCart,
    Plus,
    Minus,
    CreditCard,
    Smartphone,
    Printer,
    X,
    Share,
    HandCoins,
    AlertTriangle,
    ChevronLeft,
    ChevronRight,
    RefreshCw,
    Banknote
} from "lucide-react";
import { useHeader } from "@/contexts/HeaderContext";
import { HanldePrintReceipt } from "@/utils/ReceiptGenerator";
import { useAuth } from "@/hooks/useAuth";
import { useNavigation } from "../App";

interface CartItem {
    id: string;
    name: string;
    price: string;
    cost_price: string;
    quantity: number;
    total: number;
    profit: number;
    profit_per_unit?: number;
    imageUrl: string;
    availableStock: number;
}

export default function Orders() {
    const [selectedCategory, setSelectedCategory] = useState("");
    const [cart, setCart] = useState<CartItem[]>([]);
    const [paymentMethod, setPaymentMethod] = useState("cash");
    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [scannedCode, setScannedCode] = useState<string | null>(null);
    const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
    const [amountPaid, setAmountPaid] = useState(0);
    const [isManualReturn, setIsManualReturn] = useState(false)
    const [discount, setDiscount] = useState(0);
    const [tax, setTax] = useState(0);
    const [paymentStatus, setPaymentStatus] = useState<string>("completed");
    // Add these to your existing state variables
    const [isReturnMode, setIsReturnMode] = useState(false);
    const [isOrderMode, setIsOrderMode] = useState(false);
    const [employeeId, setEmployeeId] = useState("");
    const [returnReceiptNumber, setReturnReceiptNumber] = useState("");
    const [returnReason, setReturnReason] = useState("");
    const [returnFeeType, setReturnFeeType] = useState<"percentage" | "fixed">("percentage");
    const [returnFeeValue, setReturnFeeValue] = useState(0);
    const [searchedSale, setSearchedSale] = useState<any>(null);
    // Add this with your other state variables (around line 100)
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
    // Add this with your other state variables
    const [returnedItemsList, setReturnedItemsList] = useState<any[]>([]);
    // Add this state with your other useState declarations
    const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
    const [manualBarcode, setManualBarcode] = useState('');

    // Add these with your other state variables
    const [taxEnabled, setTaxEnabled] = useState(true);
    const [discountEnabled, setDiscountEnabled] = useState(true);
    const [customTax, setCustomTax] = useState(0);
    const [customDiscount, setCustomDiscount] = useState(0);
    const [useCustomTax, setUseCustomTax] = useState(false);
    const [useCustomDiscount, setUseCustomDiscount] = useState(false);
    // Add this with your other state variables
    const [hasModifiedQuantities, setHasModifiedQuantities] = useState(false);
    // Add this with your other state variables
    const [reducedItemsMap, setReducedItemsMap] = useState<Map<string, { originalQuantity: number; returnQuantity: number }>>(new Map());
    // Add these with your other state variables
    const [fineEnabled, setFineEnabled] = useState(false);
    const [fineType, setFineType] = useState<"percentage" | "fixed">("percentage");
    const [fineValue, setFineValue] = useState(0);
    const [fineReason, setFineReason] = useState("");
    const { navigateTo } = useNavigation();
    const removeFromCart = (id: string) => {
        setCart(cart.filter(item => item.id !== id));
        toast({ title: "Item Removed", description: "Item removed from cart" });
    };
    // Enhanced filters and pagination
    const [filters, setFilters] = useState({
        search: "",
        categoryId: "",
        brandId: "",
        supplierId: "",
        productType: "",
        stockStatus: "all",
        minPrice: "",
        maxPrice: "",
        minStock: "",
        maxStock: "",
        isActive: undefined as boolean | undefined,
        sortBy: "createdAt",
        sortOrder: "desc" as "asc" | "desc",
        inStock: false,
        outOfStock: false,
        lowStock: false,
    });

    const pageSize = 50;
    const [page, setPage] = useState(1);
    const { shop } = useAuth();

    const { toast } = useToast();

    // Add this function at the top of your component (before return statement)
    const safeFormatDate = (dateValue: any) => {
        if (!dateValue) return 'N/A';
        try {
            const date = new Date(dateValue);
            if (isNaN(date.getTime())) return 'N/A';
            return date.toLocaleDateString();
        } catch (error) {
            return 'N/A';
        }
    };

    // Add this state for damage tracking
    const [damagedItems, setDamagedItems] = useState<{ [key: string]: { isDamaged: boolean; quantity: number; reason: string } }>({});

    // Add this to your cart items to show damage checkbox
    const [showDamageDialog, setShowDamageDialog] = useState(false);
    const [currentItemForDamage, setCurrentItemForDamage] = useState<any>(null);
    const [damageQuantity, setDamageQuantity] = useState(1);
    const [damageReason, setDamageReason] = useState("");
    const [damageNotes, setDamageNotes] = useState("");

    // Add damage reason options
    const damageReasons = [
        "Customer damaged",
        "Shipping damaged",
        "Manufacturing defect",
        "Expired product",
        "Wrong item received",
        "Other"
    ];

    const { settings, isLoading: settingsLoading } = useSettings();

    // Add this useEffect in your Orders component (add it with your other useEffects)
    useEffect(() => {
        // Check if we're coming from returns history
        const returnReceiptFromStorage = sessionStorage.getItem('returnReceiptNumber');
        const returnModeFromStorage = sessionStorage.getItem('returnMode');

        if (returnModeFromStorage === 'true' && returnReceiptFromStorage) {
            console.log('Auto-loading return for receipt:', returnReceiptFromStorage);

            // Disable order mode if active
            setIsOrderMode(false);

            // Enable return mode
            setIsReturnMode(true);

            // Set the receipt number
            setReturnReceiptNumber(returnReceiptFromStorage);

            // Auto-search for the sale
            searchSaleMutation.mutate(returnReceiptFromStorage);

            // Clear the session storage
            sessionStorage.removeItem('returnReceiptNumber');
            sessionStorage.removeItem('returnMode');

            toast({
                title: "Return Mode Enabled",
                description: `Loaded receipt ${returnReceiptFromStorage} for return`,
            });
        }
    }, []);

    const handleReturnModeToggle = () => {
        if (isOrderMode) {
            toast({
                title: "Cannot Enable Return Mode",
                description: "Please exit Order Mode first",
                variant: "destructive",
            });
            return;
        }
        setIsReturnMode(!isReturnMode);
        setHasModifiedQuantities(false);
    };
    const handleOrderModeToggle = () => {
        if (isReturnMode) {
            toast({
                title: "Cannot Enable Order Mode",
                description: "Please exit Return Mode first",
                variant: "destructive",
            });
            return;
        }
        setIsOrderMode(!isOrderMode);
    };

    // Add this useEffect to load settings when available
    useEffect(() => {
        if (settings) {
            setTax(settings.tax || 0);
            setDiscount(settings.discount || 0);
            setCustomTax(settings.tax || 0);
            setCustomDiscount(settings.discount || 0);
            console.log('Settings loaded:', settings);
        }
    }, [settings]);

    // Function to handle marking item as damaged
    const handleMarkDamaged = (item: any) => {
        setCurrentItemForDamage(item);
        setDamageQuantity(1);
        setDamageReason("");
        setDamageNotes("");
        setShowDamageDialog(true);
    };

    // Load cart from localStorage when component mounts
    useEffect(() => {
        const savedCart = localStorage.getItem('pos_cart');
        if (savedCart) {
            try {
                const parsedCart = JSON.parse(savedCart);
                setCart(parsedCart);
                console.log('Cart loaded from storage:', parsedCart.length, 'items');
            } catch (error) {
                console.error('Failed to load saved cart:', error);
            }
        }
    }, []); // Empty array = runs once when component mounts

    // Save cart to localStorage whenever it changes
    useEffect(() => {
        if (cart.length > 0) {
            localStorage.setItem('pos_cart', JSON.stringify(cart));
            console.log('Cart saved to storage:', cart.length, 'items');
        } else {
            localStorage.removeItem('pos_cart');
        }
    }, [cart]); // Runs every time cart changes


    // Add to your Orders.tsx
    // Keyboard Shortcuts - Add this useEffect in your Orders component
    // Keyboard Shortcuts - Updated with navigateTo
    useEffect(() => {
        const handleShortcuts = (e: KeyboardEvent) => {
            // Don't trigger if typing in input fields
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.isContentEditable) {
                return;
            }

            const selectedItem = cart.find(item => item.id === selectedItemId);

            // F1 - New Sale
            if (e.key === 'F1') {
                e.preventDefault();
                setCart([]);
                setSelectedItemId(null);
                toast({ title: "New Sale", description: "Cart cleared" });
                return;
            }

            // F2 - Process Payment
            if (e.key === 'F2') {
                e.preventDefault();
                handleProcessPayment();
                return;
            }

            // F3 - Print Receipt
            if (e.key === 'F3') {
                e.preventDefault();
                handlePrintReceipt();
                return;
            }

            // F4 - Search Product
            if (e.key === 'F4') {
                e.preventDefault();
                const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
                if (searchInput) {
                    searchInput.focus();
                }
                return;
            }

            // F5 - Toggle Return Mode
            if (e.key === 'F5') {
                e.preventDefault();
                handleReturnModeToggle();
                return;
            }

            // F6 - Toggle Order Mode
            if (e.key === 'F6') {
                e.preventDefault();
                handleOrderModeToggle();
                return;
            }

            // F7 - Focus Customer Name
            if (e.key === 'F7') {
                e.preventDefault();
                const customerNameInput = document.querySelector('input[placeholder*="Customer Name"]') as HTMLInputElement;
                if (customerNameInput) {
                    customerNameInput.focus();
                }
                return;
            }

            // F8 - Focus Customer Phone
            if (e.key === 'F8') {
                e.preventDefault();
                const customerPhoneInput = document.querySelector('input[placeholder*="Customer Phone"]') as HTMLInputElement;
                if (customerPhoneInput) {
                    customerPhoneInput.focus();
                }
                return;
            }

            // Delete - Remove selected item
            if (e.key === 'Delete' && selectedItem) {
                e.preventDefault();
                removeFromCart(selectedItem.id);
                setSelectedItemId(null);
                toast({ title: "Item Removed", description: `${selectedItem.name} removed from cart` });
                return;
            }

            // Ctrl combinations
            if (e.ctrlKey) {
                switch (e.key) {
                    case 'ArrowUp':
                        if (selectedItem) {
                            e.preventDefault();
                            updateQuantity(selectedItem.id, 1);
                        }
                        break;
                    case 'ArrowDown':
                        if (selectedItem) {
                            e.preventDefault();
                            updateQuantity(selectedItem.id, -1);
                        }
                        break;
                    case 'd':
                        e.preventDefault();
                        const discountInput = document.querySelector('input[placeholder*="Discount"]') as HTMLInputElement;
                        if (discountInput) {
                            discountInput.focus();
                        }
                        break;
                    case 't':
                        e.preventDefault();
                        const taxInput = document.querySelector('input[placeholder*="Tax"]') as HTMLInputElement;
                        if (taxInput) {
                            taxInput.focus();
                        }
                        break;
                    case 'r':
                        e.preventDefault();
                        // Use navigateTo from your navigation hook
                        navigateTo('/returns');
                        break;
                    case 's':
                        e.preventDefault();
                        // Use navigateTo from your navigation hook
                        navigateTo('/sales');
                    case 'p':
                        e.preventDefault();
                        // Use navigateTo from your navigation hook
                        navigateTo('/products');

                }
            }

            // Alt combinations for navigation
            if (e.altKey) {
                e.preventDefault();
                switch (e.key) {
                    case '1':
                        navigateTo('/');
                        break;
                    case '2':
                        navigateTo('/pos');
                        break;
                    case '3':
                        navigateTo('/sales');
                        break;
                    case '4':
                        navigateTo('/returns');
                        break;
                    case '5':
                        navigateTo('/products');
                        break;
                    case '6':
                        navigateTo('/employees');
                        break;
                    case '7':
                        navigateTo('/settings');
                        break;
                }
            }

            // Escape - Clear selection
            if (e.key === 'Escape') {
                e.preventDefault();
                setSelectedItemId(null);
                // Close any open modals
                setIsScannerOpen(false);
                setIsBarcodeModalOpen(false);
                setIsReceiptModalOpen(false);
            }
        };

        window.addEventListener('keydown', handleShortcuts);
        return () => window.removeEventListener('keydown', handleShortcuts);
    }, [cart, selectedItemId, isReturnMode, isOrderMode]);

    const handleReturnItem = (item: CartItem) => {
        console.log("🔍 [RETURN] Moving item to return list:", {
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            total: item.total,
            profit_per_unit: item.profit_per_unit
        });

        // Calculate profit loss for this item
        const profitPerUnit = item.profit_per_unit ||
            (parseFloat(item.price) - parseFloat(item.cost_price || "0"));
        const profitLoss = profitPerUnit * item.quantity;

        // Add to returned items list with profit_loss
        setReturnedItemsList(prev => [...prev, {
            ...item,
            profit_loss: profitLoss,
            returnReason: returnReason || "Product return",
            returnDate: new Date().toISOString()
        }]);

        // Remove from cart
        setCart(cart.filter(cartItem => cartItem.id !== item.id));
        setHasModifiedQuantities(false);

        toast({
            title: "Item Marked for Return",
            description: `${item.quantity} x ${item.name} will be returned when you process. (Profit loss: ${formatPKR(profitLoss)})`,
        });
    };



    // Fetch current settings


    // Enhanced products query with filters and pagination
    const { data: productsData, isLoading: productsLoading } = useQuery<{
        products: Product[];
        total: number;
    }>({
        queryKey: ["paginate-products", filters, page],
        queryFn: async () => {
            // Get all products first
            const result = await api.getProducts();
            let allProducts = [];

            if (Array.isArray(result)) {
                allProducts = result;
            } else if (result?.success && Array.isArray(result.data)) {
                allProducts = result.data;
            } else {
                return { products: [], total: 0 };
            }

            // Apply filters locally
            let filtered = allProducts;

            if (filters.search) {
                const search = filters.search.toLowerCase();
                filtered = filtered.filter(p =>
                    p.name?.toLowerCase().includes(search) ||
                    p.sku?.toLowerCase().includes(search) ||
                    p.barcode?.toLowerCase().includes(search)
                );
            }
            if (filters.categoryId) {
                filtered = filtered.filter(p => p.category_id === filters.categoryId);
            }
            if (filters.brandId) {
                filtered = filtered.filter(p => p.brand_id === filters.brandId);
            }
            if (filters.supplierId) {
                filtered = filtered.filter(p => p.supplier_id === filters.supplierId);
            }
            if (filters.inStock) {
                filtered = filtered.filter(p => p.stock > 0);
            }
            if (filters.outOfStock) {
                filtered = filtered.filter(p => p.stock === 0);
            }
            if (filters.lowStock) {
                filtered = filtered.filter(p => p.stock > 0 && p.stock <= p.min_stock);
            }
            if (filters.minPrice) {
                filtered = filtered.filter(p => parseFloat(p.selling_price) >= parseFloat(filters.minPrice));
            }
            if (filters.maxPrice) {
                filtered = filtered.filter(p => parseFloat(p.selling_price) <= parseFloat(filters.maxPrice));
            }

            // Sort
            const sortKey = filters.sortBy === 'sellingPrice' ? 'selling_price' : filters.sortBy;
            filtered.sort((a, b) => {
                let aVal = a[sortKey];
                let bVal = b[sortKey];
                if (filters.sortOrder === 'asc') {
                    return aVal > bVal ? 1 : -1;
                }
                return aVal < bVal ? 1 : -1;
            });

            // Paginate
            const start = (page - 1) * pageSize;
            const paginated = filtered.slice(start, start + pageSize);

            return { products: paginated, total: filtered.length };
        },
        keepPreviousData: true,
    });

    // Extract products and pagination info from response
    const products = productsData?.products || [];
    const totalCount = productsData?.total || 0;
    const totalPages = Math.ceil(totalCount / pageSize);

    // Update the salesman query
    const { data: salesman = [] } = useQuery<any[]>({
        queryKey: ["employees", "salesman"],
        queryFn: async () => {
            console.log("🔍 [SALESMAN] Fetching salesman...");
            const result = await api.getEmployees({ employeeType: "salesman" });
            console.log("🔍 [SALESMAN] Result:", result);

            if (Array.isArray(result)) return result;
            if (result?.success && Array.isArray(result.data)) return result.data;
            return [];
        },
    });

    const { data: categories = [] } = useQuery<any[]>({
        queryKey: ["categories"],
        queryFn: async () => {
            const result = await api.getCategories();
            if (Array.isArray(result)) return result;
            if (result?.success && Array.isArray(result.data)) return result.data;
            return [];
        },
    });

    const { data: brands = [] } = useQuery<any[]>({
        queryKey: ["brands"],
        queryFn: async () => {
            const result = await api.getBrands();
            if (Array.isArray(result)) return result;
            if (result?.success && Array.isArray(result.data)) return result.data;
            return [];
        },
    });

    const { data: suppliers = [] } = useQuery<any[]>({
        queryKey: ["suppliers"],
        queryFn: async () => {
            const result = await api.getSuppliers();
            if (Array.isArray(result)) return result;
            if (result?.success && Array.isArray(result.data)) return result.data;
            return [];
        },
    });


    const handleManualBarcodeAdd = async () => {
        if (!manualBarcode.trim()) {
            toast({ title: "Error", description: "Please enter a barcode", variant: "destructive" });
            return;
        }

        try {
            const result = await api.getProducts();
            let products = [];
            if (Array.isArray(result)) products = result;
            else if (result?.success && Array.isArray(result.data)) products = result.data;

            const product = products.find(p => p.barcode === manualBarcode);

            if (product) {
                addToCart(product);
                toast({ title: "Product Added", description: product.name });
                setManualBarcode('');
                setIsBarcodeModalOpen(false);
            } else {
                toast({
                    title: "Not Found",
                    description: `No product found with barcode ${manualBarcode}`,
                    variant: "destructive",
                });
            }
        } catch (err: any) {
            toast({
                title: "Error",
                description: err.message,
                variant: "destructive",
            });
        }
    };

    // Pagination Controls Component
    const PaginationControls = () => (
        <div className="flex items-center justify-between space-x-2 py-4">
            <div className="flex-1 text-sm text-muted-foreground">
                Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, totalCount)} of {totalCount} products
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

    // Add these mutations after your processSaleMutation
    // Update the searchSaleMutation
    const searchSaleMutation = useMutation({
        mutationFn: async (receiptNumber: string) => {
            const result = await api.getSaleByReceiptNumber(receiptNumber);
            if (!result) {
                throw new Error("Sale not found");
            }
            return result;
        },
        onSuccess: (data) => {
            console.log("🔍 [SEARCH] Sale found:", data);
            setHasModifiedQuantities(false);
            setReducedItemsMap(new Map());

            if (data.return_status === 'full') {
                toast({
                    title: "Sale Fully Returned",
                    description: "This sale has already been fully returned. No more returns possible.",
                    variant: "destructive",
                });
                setIsReturnMode(false);
                return;
            }

            setSearchedSale(data);

            // Load original sale's tax and discount
            const originalTax = parseFloat(data.tax) || 0;
            const originalDiscount = parseFloat(data.discount) || 0;
            setTax(originalTax);
            setDiscount(originalDiscount);
            setCustomTax(originalTax);
            setCustomDiscount(originalDiscount);
            setTaxEnabled(originalTax !== 0);
            setDiscountEnabled(originalDiscount !== 0);
            setUseCustomTax(false);
            setUseCustomDiscount(false);

            // Map cart items with profit per unit
            const cartItems = data.items?.map((item: any) => {
                // Get profit from sale_items (this is the total profit for this line item)
                const totalProfit = parseFloat(item.profit) || 0;
                // Calculate profit per unit
                const profitPerUnit = item.quantity > 0 ? totalProfit / item.quantity : 0;

                return {
                    id: item.product_id,
                    name: item.product_name || "Product",
                    price: item.unit_price,
                    cost_price: item.cost_price || "0",
                    quantity: item.quantity,
                    total: parseFloat(item.total),
                    profit: totalProfit,
                    profit_per_unit: profitPerUnit,
                    imageUrl: item.image_url,
                    availableStock: item.stock || 0,
                    originalQuantity: item.quantity,
                };
            }) || [];

            console.log('Cart items with profit per unit:', cartItems);
            setCart(cartItems);
            setReturnedItemsList([]);

            toast({
                title: "Sale Found",
                description: `Receipt: ${data.receipt_number} | Tax: ${originalTax}% | Discount: ${originalDiscount}%`
            });
        },
        onError: (error: Error) => {
            console.error("🔍 [SEARCH] Error:", error);
            toast({
                title: "Sale Not Found",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const processReturnMutation = useMutation({
        mutationFn: async ({ returnData, items }: { returnData: any; items: any[] }) => {
            console.log('Calling createReturn with:', returnData, items);
            const result = await api.createReturn(returnData, items);
            if (!result?.success && !result?.id) {
                throw new Error(result?.error || "Failed to process return");
            }
            return result;
        },
        onSuccess: () => {
            toast({
                title: "Return Processed",
                description: "Return completed successfully",
            });
            setCart([]);
            setCustomerName("");
            setCustomerPhone("");
            setReturnReceiptNumber("");
            setReturnReason("");
            setSearchedSale(null);
            setIsReturnMode(false);

            // Only refresh queries - let the main process handle stock update
            queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
            queryClient.invalidateQueries({ queryKey: ["paginate-products"] });
            queryClient.invalidateQueries({ queryKey: ["sales"] });
            queryClient.invalidateQueries({ queryKey: ["returns"] });
        },
        onError: (error: Error) => {
            console.error('Return mutation error:', error);
            toast({
                title: "Return Failed",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const processSaleMutation = useMutation({
        mutationFn: async ({ saleData, items }: { saleData: any; items: any[] }) => {
            // Don't update stock here - let the main process handle it
            const result = await api.createSale(saleData, items);
            if (!result?.success && !result?.id) {
                throw new Error(result?.error || "Failed to process sale");
            }
            return result;
        },
        onSuccess: () => {
            toast({
                title: "Sale Completed",
                description: "Transaction processed successfully",
            });
            setCart([]);
            setCustomerName("");
            setCustomerPhone("");
            queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
            queryClient.invalidateQueries({ queryKey: ["paginate-products"] });
        },
        onError: (error: Error) => {
            toast({
                title: "Sale Failed",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const addToCart = (product: any) => {
        const existingItem = cart.find(item => item.id === product.id);
        const productPrice = parseFloat(product.selling_price);
        const productCost = parseFloat(product.cost_price || 0);
        const profitPerUnit = productPrice - productCost;

        if (existingItem) {
            if (existingItem.quantity >= product.stock) {
                toast({
                    title: "Insufficient Stock",
                    description: `Only ${product.stock} items available`,
                    variant: "destructive"
                });
                return;
            }
            setCart(cart.map(item =>
                item.id === product.id
                    ? {
                        ...item,
                        quantity: item.quantity + 1,
                        total: (item.quantity + 1) * productPrice,
                        profit: (item.quantity + 1) * profitPerUnit,
                        availableStock: product.stock
                    }
                    : item
            ));
        } else {
            setCart([...cart, {
                id: product.id,
                name: product.name,
                price: product.selling_price,
                cost_price: product.cost_price || "0",
                quantity: 1,
                total: productPrice,
                profit: profitPerUnit,
                imageUrl: product.image_url,
                availableStock: product.stock
            }]);
        }
    };

    const updateQuantity = (id: string, change: number) => {
        setCart(prevCart => {
            const updatedCart = prevCart.map(item => {
                if (item.id === id) {
                    const newQuantity = item.quantity + change;

                    if (newQuantity < 1) {
                        return item;
                    }

                    if (!isReturnMode) {
                        if (newQuantity > item.availableStock) {
                            toast({
                                title: "Insufficient Stock",
                                description: `Only ${item.availableStock} items available`,
                                variant: "destructive"
                            });
                            return item;
                        }
                    } else {
                        const originalItem = searchedSale?.items?.find((saleItem: any) => saleItem.product_id === id);
                        if (originalItem && newQuantity < originalItem.quantity) {
                            const returnQuantity = originalItem.quantity - newQuantity;
                            setReducedItemsMap(prev => {
                                const newMap = new Map(prev);
                                newMap.set(id, {
                                    originalQuantity: originalItem.quantity,
                                    returnQuantity: returnQuantity
                                });
                                return newMap;
                            });
                            setHasModifiedQuantities(true);
                        } else if (originalItem && newQuantity >= originalItem.quantity) {
                            setReducedItemsMap(prev => {
                                const newMap = new Map(prev);
                                newMap.delete(id);
                                return newMap;
                            });
                            if (reducedItemsMap.size === 1 && newMap.size === 0) {
                                setHasModifiedQuantities(false);
                            }
                        }
                    }

                    const itemPrice = parseFloat(item.price);
                    const itemCost = parseFloat(item.cost_price || "0");
                    const profitPerUnit = itemPrice - itemCost;

                    return {
                        ...item,
                        quantity: newQuantity,
                        total: newQuantity * itemPrice,
                        profit: newQuantity * profitPerUnit
                    };
                }
                return item;
            });
            return updatedCart;
        });
    };


    const subtotal = cart.reduce((sum, item) => sum + item.total, 0);

    const currentTax = taxEnabled ? (useCustomTax ? customTax : tax) : 0;
    const currentDiscount = discountEnabled ? (useCustomDiscount ? customDiscount : discount) : 0;

    const taxAmount = (subtotal * currentTax) / 100;
    const discountAmount = (subtotal * currentDiscount) / 100;
    const total = subtotal + taxAmount - discountAmount;
    const handleProcessPayment = () => {
        if (cart.length === 0) {
            toast({
                title: "Cart Empty",
                description: "Please add items to cart before processing payment",
                variant: "destructive",
            });
            return;
        }

        const receiptNumber = `RCP-${Date.now()}`;
        const totalProfit = cart.reduce((sum, item) => sum + item.profit, 0);

        const items = cart.map(item => ({
            productId: item.id,
            quantity: item.quantity,
            unitPrice: parseFloat(item.price),
            total: item.total.toString(),
            costPrice: parseFloat(item.cost_price || "0"),
            profit: item.profit.toString(),
        }));

        const currentTaxValue = taxEnabled ? (useCustomTax ? customTax : tax) : 0;
        const currentDiscountValue = discountEnabled ? (useCustomDiscount ? customDiscount : discount) : 0;

        const taxAmountValue = (subtotal * currentTaxValue) / 100;
        const discountAmountValue = (subtotal * currentDiscountValue) / 100;
        const totalValue = subtotal + taxAmountValue - discountAmountValue;

        const saleData = {
            receiptNumber,
            customerName: customerName || null,
            customerPhone: customerPhone || null,
            subtotal: subtotal.toString(),
            tax: currentTaxValue.toString(),
            discount: currentDiscountValue.toString(),
            total: totalValue.toString(),
            total_profit: totalProfit.toString(),  // Add total profit
            paymentMethod,
            paymentStatus,
            employeeId: employeeId || null,
            userId: "system",
            shopId: "default",
        };

        console.log('Sending saleData:', saleData);
        console.log('Sending items with profit:', items);

        processSaleMutation.mutate({ saleData, items });
        localStorage.removeItem('pos_cart');
    };

    // Scanner functions
    const handleScan = (result: any) => {
        if (result?.text) {
            setScannedCode(result.text);
        }
    };

    const handleError = (err: any) => {
        console.error("Scanner Error:", err);
    };

    const handleAddScannedProduct = async () => {
        if (!scannedCode) return;

        try {
            const result = await api.getProducts();
            let products = [];
            if (Array.isArray(result)) products = result;
            else if (result?.success && Array.isArray(result.data)) products = result.data;

            const product = products.find(p => p.barcode === scannedCode);

            if (product) {
                addToCart(product);
                toast({ title: "Product Added", description: product.name });
            } else {
                toast({
                    title: "Not Found",
                    description: `No product found with barcode ${scannedCode}`,
                    variant: "destructive",
                });
            }
        } catch (err: any) {
            toast({
                title: "Scan Failed",
                description: err.message,
                variant: "destructive",
            });
        } finally {
            setIsScannerOpen(false);
            setScannedCode(null);
        }
    };

    // Voice search
    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const [isListening, setIsListening] = useState(false);

    useEffect(() => {
        if (typeof window !== "undefined") {
            const SpeechRecognition =
                (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

            if (SpeechRecognition) {
                recognitionRef.current = new SpeechRecognition();
                recognitionRef.current.continuous = false;
                recognitionRef.current.interimResults = true;
                recognitionRef.current.lang = "en-US";

                recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
                    let transcript = "";
                    for (let i = event.resultIndex; i < event.results.length; i++) {
                        transcript += event.results[i][0].transcript;
                    }
                    setFilters(prev => ({ ...prev, search: transcript }));
                };

                recognitionRef.current.onend = () => {
                    setIsListening(false);
                };
            }
        }
    }, []);

    const startListening = () => {
        if (recognitionRef.current && !isListening) {
            recognitionRef.current.start();
            setIsListening(true);
        }
    };

    const stopListening = () => {
        if (recognitionRef.current && isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
        }
    };

    // Receipt functions
    interface ReceiptData {
        shopName: string;
        shopAddress: string;
        receiptNumber: string;
        date: string;
        time: string;
        customerName: string;
        customerPhone: string;
        items: CartItem[];
        subtotal: number;
        tax: number;
        discount: number;
        total: number;
        paymentMethod: string;
        amountPaid: number;
        change: number;
        salesman?: string;
        paymentStatus?: string;
    }

    const handlePrintReceipt = () => {
        if (cart.length === 0) {
            toast({
                title: "Cart Empty",
                description: "Please add items to cart before printing receipt",
                variant: "destructive",
            });
            return;
        }
        setIsReceiptModalOpen(true);
    };

    const generateReceiptData = (): ReceiptData => {
        const now = new Date();
        const currentTaxValue = taxEnabled ? (useCustomTax ? customTax : tax) : 0;
        const currentDiscountValue = discountEnabled ? (useCustomDiscount ? customDiscount : discount) : 0;
        const taxAmountValue = (subtotal * currentTaxValue) / 100;
        const discountAmountValue = (subtotal * currentDiscountValue) / 100;
        const totalValue = subtotal + taxAmountValue - discountAmountValue;
        // Find salesman name
        const selectedSalesman = salesman.find(emp => emp.id === employeeId);
        console.log(selectedSalesman, salesman, employeeId)
        const salesmanName = selectedSalesman?.name || '';

        return {
            shopName: shop.name || '',
            shopAddress: shop.location || '',
            receiptNumber: `RCP-${Date.now()}`,
            date: now.toLocaleDateString(),
            time: now.toLocaleTimeString(),
            customerName: customerName || "Walk-in Customer",
            customerPhone: customerPhone || "N/A",
            items: cart,
            subtotal: subtotal,
            tax: taxAmountValue,
            discount: discountAmountValue,
            total: totalValue,
            paymentMethod: paymentMethod,
            amountPaid: amountPaid,
            change: Math.max(0, amountPaid - totalValue),
            salesman: salesmanName,  // Add this
            paymentStatus: paymentStatus,  // Add this
        };
    };



    const handleShareWhatsApp = () => {
        if (!customerPhone) {
            toast({
                title: "Phone Required",
                description: "Please enter customer phone number to share receipt",
                variant: "destructive",
            });
            return;
        }

        const receiptData = generateReceiptData();
        const itemsText = receiptData.items.map(item =>
            `${item.name} - ${item.quantity}x ${formatPKR(item.total)}`
        ).join('%0A');

        const message = `*${receiptData.shopName}*%0A%0A` +
            `Receipt: ${receiptData.receiptNumber}%0A` +
            `Date: ${receiptData.date} ${receiptData.time}%0A` +
            `Customer: ${receiptData.customerName}%0A%0A` +
            `*Items:*%0A${itemsText}%0A%0A` +
            `Subtotal: ${formatPKR(receiptData.subtotal)}%0A` +
            `Tax: ${formatPKR(receiptData.tax)}%0A` +
            `Discount: -${formatPKR(receiptData.discount)}%0A` +
            `*Total: ${formatPKR(receiptData.total)}*%0A%0A` +
            `Payment: ${receiptData.paymentMethod}%0A` +
            `Thank you for your purchase!`;

        const whatsappUrl = `https://wa.me/+92${customerPhone.replace(/\D/g, '').replace(/^0/, '')}?text=${message}`;
        window.open(whatsappUrl, '_blank');
        setIsReceiptModalOpen(false);
    };

    const { setTitle, setSubtitle } = useHeader();

    useEffect(() => {
        setTitle("POS Terminal");
        setSubtitle("Point of Sale System");
    }, []);

    // Update your handleProcessReturn function with better calculations
    const handleProcessReturn = async () => {
        let allReturnItems = [...returnedItemsList];
        // Add reduced quantity items to return list
        for (const [productId, reducedInfo] of reducedItemsMap.entries()) {
            const cartItem = cart.find(item => item.id === productId);
            if (cartItem && reducedInfo.returnQuantity > 0) {
                // Use profit_per_unit from the cart item
                const profitPerUnit = cartItem.profit_per_unit ||
                    (parseFloat(cartItem.price) - parseFloat(cartItem.cost_price || "0"));
                const profitLoss = profitPerUnit * reducedInfo.returnQuantity;

                console.log(`Returning ${reducedInfo.returnQuantity} of ${cartItem.name}, profit per unit: ${profitPerUnit}, total loss: ${profitLoss}`);

                allReturnItems.push({
                    ...cartItem,
                    quantity: reducedInfo.returnQuantity,
                    total: reducedInfo.returnQuantity * parseFloat(cartItem.price),
                    profit_loss: profitLoss,
                    returnReason: returnReason || "Product return",
                    returnDate: new Date().toISOString(),
                    imageUrl: cartItem.imageUrl
                });
            }
        }

        if (allReturnItems.length === 0) {
            toast({
                title: "No Items to Return",
                description: "Please select items to return or reduce quantity first",
                variant: "destructive",
            });
            return;
        }

        const returnSubtotal = allReturnItems.reduce((sum, item) => sum + item.total, 0);

        // Calculate total loss (profit that is being returned, NOT the selling price)
        const totalLoss = allReturnItems.reduce((sum, item) => sum + (item.profit_loss || 0), 0);

        // Calculate return fee
        let returnFee = 0;
        if (returnFeeType === "percentage") {
            returnFee = (returnSubtotal * returnFeeValue) / 100;
        } else {
            returnFee = returnFeeValue;
        }

        const returnTotal = returnSubtotal - returnFee;
        const returnReceiptNumber = `RET-${Date.now()}`;
        const originalSaleId = isManualReturn ? `manual-${Date.now()}` : searchedSale?.id;

        // Prepare return items for database
        const returnItems = allReturnItems.map(item => ({
            productId: item.id,
            quantity: item.quantity,
            unitPrice: parseFloat(item.price),
            total: item.total.toString(),
            profit_loss: item.profit_loss || 0,
        }));

        const returnData = {
            receiptNumber: returnReceiptNumber,
            originalSaleId: originalSaleId,
            customerName: customerName || searchedSale?.customerName || "Walk-in Customer",
            customerPhone: customerPhone || searchedSale?.customerPhone || "N/A",
            subtotal: returnSubtotal.toString(),
            tax: tax.toString(),
            discount: discount.toString(),
            returnFee: returnFee.toString(),
            total: returnTotal.toString(),
            total_loss: totalLoss.toString(), // This is the profit being lost
            isManualReturn: isManualReturn,
            returnReason: returnReason || "Product return",
            paymentMethod: paymentMethod,
            userId: "system",
            shopId: "default",
        };

        try {
            const result = await processReturnMutation.mutateAsync({ returnData, items: returnItems });

            if (result && searchedSale && !isManualReturn) {
                // Get current items from the sale
                let currentSaleItems = searchedSale.items || [];

                // Create a map of items being returned from both sources
                const returningItemsMap = new Map();
                allReturnItems.forEach(item => {
                    returningItemsMap.set(item.id, item.quantity);
                });

                // Update the sale items - remove returned quantities
                const updatedSaleItems = [];
                let totalReturnedAmountThisTransaction = 0;

                for (const saleItem of currentSaleItems) {
                    const returningQty = returningItemsMap.get(saleItem.product_id);

                    if (returningQty) {
                        if (returningQty >= saleItem.quantity) {
                            totalReturnedAmountThisTransaction += parseFloat(saleItem.total);
                        } else {
                            const newQuantity = saleItem.quantity - returningQty;
                            const newTotal = newQuantity * parseFloat(saleItem.unit_price);
                            totalReturnedAmountThisTransaction += returningQty * parseFloat(saleItem.unit_price);

                            updatedSaleItems.push({
                                product_id: saleItem.product_id,
                                quantity: newQuantity,
                                unit_price: saleItem.unit_price,
                                total: newTotal.toString()
                            });
                        }
                    } else {
                        updatedSaleItems.push({
                            product_id: saleItem.product_id,
                            quantity: saleItem.quantity,
                            unit_price: saleItem.unit_price,
                            total: saleItem.total
                        });
                    }
                }

                // Get existing returned items from the sale (preserve history)
                let existingReturnedItems = [];
                try {
                    if (searchedSale.returned_items) {
                        if (typeof searchedSale.returned_items === 'string') {
                            existingReturnedItems = JSON.parse(searchedSale.returned_items);
                        } else if (Array.isArray(searchedSale.returned_items)) {
                            existingReturnedItems = searchedSale.returned_items;
                        }
                    }
                } catch (e) {
                    console.error('Failed to parse existing returned_items:', e);
                    existingReturnedItems = [];
                }

                // APPEND current return to existing history
                const newReturnedItems = [
                    ...existingReturnedItems,
                    {
                        returnReceiptNumber: returnReceiptNumber,
                        returnDate: new Date().toISOString(),
                        returnReason: returnReason || "Product return",
                        returnFee: returnFee,
                        items: allReturnItems.map(item => ({
                            productId: item.id,
                            productName: item.name,
                            quantity: item.quantity,
                            unitPrice: parseFloat(item.price),
                            total: item.total
                        }))
                    }
                ];

                // Calculate new totals
                const newSubtotal = updatedSaleItems.reduce((sum, item) => sum + parseFloat(item.total), 0);
                const newTaxAmount = (newSubtotal * parseFloat(searchedSale.tax)) / 100;
                const newDiscountAmount = (newSubtotal * parseFloat(searchedSale.discount)) / 100;
                const newTotal = newSubtotal + newTaxAmount - newDiscountAmount;

                // Calculate new profit (original profit minus the profit loss from returned items)
                const originalProfit = parseFloat(searchedSale.total_profit) || 0;
                const newProfit = originalProfit - totalLoss; // Subtract ONLY the profit, not the selling price

                const previouslyReturned = parseFloat(searchedSale.total_returned_amount || 0);
                const returnStatus = updatedSaleItems.length === 0 ? 'full' : 'partial';

                // Update the sale with both metadata AND items
                await api.updateSale(originalSaleId, {
                    items: updatedSaleItems,
                    subtotal: newSubtotal,
                    total: newTotal,
                    total_profit: newProfit, // Update the profit
                    return_status: returnStatus,
                    total_returned_amount: previouslyReturned + totalReturnedAmountThisTransaction,
                    returned_items: JSON.stringify(newReturnedItems)
                });
            }

            toast({
                title: "Return Processed",
                description: `${allReturnItems.length} item(s) returned successfully. Profit decreased by ${formatPKR(totalLoss)}`,
            });

            // Reset state
            setCart([]);
            setReturnedItemsList([]);
            setReducedItemsMap(new Map());
            setHasModifiedQuantities(false);
            setCustomerName("");
            setCustomerPhone("");
            setReturnReceiptNumber("");
            setReturnReason("");
            setSearchedSale(null);
            setIsReturnMode(false);
            queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
            queryClient.invalidateQueries({ queryKey: ["sales"] });

        } catch (error) {
            console.error("Return processing error:", error);
            toast({
                title: "Return Failed",
                description: error.message,
                variant: "destructive",
            });
        }
    };

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            <main className="flex-1 overflow-auto p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Product Selection */}
                    <div className="lg:col-span-2">
                        {/* Enhanced Search Bar */}
                        <div className="mb-4 flex space-x-4">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search products or scan barcode..."
                                    value={filters.search}
                                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                    className="pl-10"
                                    data-testid="input-product-search"
                                />
                            </div>

                            <Button
                                variant="outline"
                                size="icon"
                                data-testid="button-barcode-scan"
                                onClick={() => setIsBarcodeModalOpen(true)}
                            >
                                <QrCode className="h-4 w-4" />
                            </Button>
                            <Button
                                variant={isListening ? "default" : "outline"}
                                size="icon"
                                data-testid="button-voice-search"
                                onMouseDown={startListening}
                                onMouseUp={stopListening}
                                onTouchStart={startListening}
                                onTouchEnd={stopListening}
                            >
                                <Mic className={`h-4 w-4 ${isListening ? "text-red-500" : ""}`} />
                            </Button>

                            <Button
                                variant="outline"
                                size="icon"
                                data-testid="button-barcode-scan"
                                onClick={() => setIsScannerOpen(true)}
                            >
                                <QrCode className="h-4 w-4" />
                            </Button>
                        </div>

                        {/* Enhanced Filters */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                            {/* Category Filter */}
                            <Select
                                value={filters.categoryId}
                                onValueChange={(value) => setFilters({ ...filters, categoryId: value === "all" ? "" : value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="All Categories" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Categories</SelectItem>
                                    {categories.map((category: any) => (
                                        <SelectItem key={category.id} value={category.id}>
                                            {category.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* Brand Filter */}
                            <Select
                                value={filters.brandId}
                                onValueChange={(value) => setFilters({ ...filters, brandId: value === "all" ? "" : value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="All Brands" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Brands</SelectItem>
                                    {brands.map((brand: any) => (
                                        <SelectItem key={brand.id} value={brand.id}>
                                            {brand.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* Stock Status Filter */}
                            <Select
                                value={filters.stockStatus}
                                onValueChange={(value) => setFilters({
                                    ...filters,
                                    stockStatus: value,
                                    inStock: value === "inStock",
                                    outOfStock: value === "outOfStock",
                                    lowStock: value === "lowStock"
                                })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Stock Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Stock</SelectItem>
                                    <SelectItem value="inStock">In Stock</SelectItem>
                                    <SelectItem value="outOfStock">Out of Stock</SelectItem>
                                    <SelectItem value="lowStock">Low Stock</SelectItem>
                                </SelectContent>
                            </Select>

                            {/* Sort By */}
                            <Select
                                value={filters.sortBy}
                                onValueChange={(value) => setFilters({ ...filters, sortBy: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Sort By" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="name">Name</SelectItem>
                                    <SelectItem value="sellingPrice">Price</SelectItem>
                                    <SelectItem value="stock">Stock</SelectItem>
                                    <SelectItem value="createdAt">Newest</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {/* Manual Barcode Input Modal */}
                        <Dialog open={isBarcodeModalOpen} onOpenChange={setIsBarcodeModalOpen}>
                            <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                    <DialogTitle>Enter Barcode</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Barcode Number</label>
                                        <Input
                                            type="text"
                                            placeholder="Scan or type barcode..."
                                            value={manualBarcode}
                                            onChange={(e) => setManualBarcode(e.target.value)}
                                            onKeyPress={(e) => {
                                                if (e.key === 'Enter') {
                                                    handleManualBarcodeAdd();
                                                }
                                            }}
                                            autoFocus
                                            className="font-mono text-lg"
                                        />
                                        <p className="text-xs text-muted-foreground mt-2">
                                            Enter the barcode number and press Enter or click Add
                                        </p>
                                    </div>
                                    <div className="flex justify-end gap-2">
                                        <Button variant="outline" onClick={() => setIsBarcodeModalOpen(false)}>
                                            Cancel
                                        </Button>
                                        <Button onClick={handleManualBarcodeAdd}>
                                            Add to Cart
                                        </Button>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                        {/* Quick Category Filters */}
                        {/* <div className="flex space-x-2 mb-4 overflow-x-auto">
                            <Button
                                variant={selectedCategory === "" ? "default" : "outline"}
                                size="sm"
                                onClick={() => setSelectedCategory("")}
                                data-testid="button-category-all"
                            >
                                All
                            </Button>
                            {categories.map((category: any) => (
                                <Button
                                    key={category.id}
                                    variant={selectedCategory === category.id ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setSelectedCategory(category.id)}
                                    className="whitespace-nowrap"
                                    data-testid={`button-category-${category.id}`}
                                >
                                    {category.name}
                                </Button>
                            ))}
                        </div> */}

                        {/* Product Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {productsLoading ? (
                                <div className="col-span-full text-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                                    <p className="text-muted-foreground">Loading products...</p>
                                </div>
                            ) : products.length === 0 ? (
                                <div className="col-span-full text-center py-8">
                                    <p className="text-muted-foreground">No products found</p>
                                </div>
                            ) : (
                                products
                                    .filter((product: any) => product.is_active === 1)
                                    .map((product: any) => (
                                        <Card
                                            key={product.id}
                                            className="cursor-pointer hover:shadow-md transition-shadow"
                                            onClick={() => addToCart(product)}
                                            data-testid={`product-card-${product.id}`}
                                        >
                                            <CardContent className="p-4">
                                                <div className="w-full h-32 bg-muted rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                                                    {product.image_url ? (
                                                        <img
                                                            src={product.image_url}
                                                            alt={product.name}
                                                            className="w-full h-full object-cover rounded-lg"
                                                        />
                                                    ) : (
                                                        <div className="flex items-center justify-center text-muted-foreground">
                                                            <span className="text-sm">No Image</span>
                                                        </div>
                                                    )}
                                                </div>

                                                <h3 className="font-medium text-sm mb-1 line-clamp-2">{product.name}</h3>
                                                <p className="text-primary font-semibold">{formatPKR(product.selling_price)}</p>

                                                <div className="flex items-center justify-between mt-2">
                                                    <p className="text-xs text-muted-foreground">Stock: {product.stock}</p>
                                                    {product.stock <= product.min_stock && (
                                                        <Badge variant="destructive" className="text-xs">
                                                            Low
                                                        </Badge>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))
                            )}
                        </div>

                        {/* Pagination */}
                        {
                            products.length > 50 && <PaginationControls />
                        }
                    </div>

                    {/* Shopping Cart - Rest of your existing cart code remains the same */}
                    <div>
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center">
                                    <ShoppingCart className="h-5 w-5 mr-2" />
                                    Shopping Cart
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-col sm:flex-row gap-2 mb-4">
                                    <Button
                                        variant={isOrderMode ? "destructive" : "outline"}
                                        onClick={handleOrderModeToggle}
                                        className="flex-1"
                                        disabled={isReturnMode}
                                    >
                                        {isOrderMode ? "Exit Order Mode" : "Order Mode"}
                                    </Button>
                                    <Button
                                        variant={isReturnMode ? "destructive" : "outline"}
                                        onClick={handleReturnModeToggle}
                                        className="flex-1"
                                        disabled={isOrderMode}
                                    >
                                        {isReturnMode ? "Exit Return Mode" : "Return Mode"}
                                    </Button>
                                </div>
                                {/* Receipt Search for Returns */}
                                {isReturnMode && (
                                    <div className="space-y-3 mb-4  bg-muted/30 rounded-lg">
                                        <div className="flex space-x-2">
                                            <Input
                                                placeholder="Enter Receipt Number"
                                                value={returnReceiptNumber}
                                                onChange={(e) => setReturnReceiptNumber(e.target.value)}
                                                className="flex-1"
                                            />
                                            <Button
                                                onClick={() => searchSaleMutation.mutate(returnReceiptNumber)}
                                                disabled={!returnReceiptNumber}
                                            >
                                                Search
                                            </Button>
                                        </div>

                                        {searchedSale && (
                                            <div className="text-sm p-2 bg-background rounded space-y-1">
                                                <p><strong>Receipt:</strong> {searchedSale.receipt_number || searchedSale.receiptNumber || 'N/A'}</p>
                                                <p><strong>Date:</strong> {safeFormatDate(searchedSale.created_at || searchedSale.createdAt)}</p>
                                                <p><strong>Original Total:</strong> {formatPKR(parseFloat(searchedSale.total || 0))}</p>
                                                {searchedSale.customer_name && (
                                                    <p><strong>Customer:</strong> {searchedSale.customer_name}</p>
                                                )}
                                            </div>
                                        )}

                                        <Input
                                            placeholder="Return Reason (Optional)"
                                            value={returnReason}
                                            onChange={(e) => setReturnReason(e.target.value)}
                                        />

                                        {/* Return Fee Settings */}
                                        <div className="grid grid-cols-3 gap-2">
                                            <Select value={returnFeeType} onValueChange={(value: "percentage" | "fixed") => setReturnFeeType(value)}>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="percentage">Percentage</SelectItem>
                                                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <Input
                                                type="number"
                                                placeholder="Fee Value"
                                                value={returnFeeValue}
                                                onChange={(e) => setReturnFeeValue(parseFloat(e.target.value) || 0)}
                                                className="col-span-2"
                                            />
                                        </div>
                                    </div>
                                )}
                                {/* Customer Info */}
                                <div className="space-y-3 mb-4">
                                    <Input
                                        placeholder="Customer Name (Optional)"
                                        value={customerName}
                                        onChange={(e) => setCustomerName(e.target.value)}
                                        data-testid="input-customer-name"
                                    />
                                    <Input
                                        placeholder="Customer Phone (Optional)"
                                        value={customerPhone}
                                        onChange={(e) => setCustomerPhone(e.target.value)}
                                        data-testid="input-customer-phone"
                                    />
                                </div>

                                {/* Cart Items */}
                                {/* Cart Items */}
                                <div className="space-y-3 mb-4 max-h-[300px] md:max-h-[400px] overflow-y-auto">
                                    {cart.length === 0 ? (
                                        <div className="text-center py-8">
                                            <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                                            <p className="text-muted-foreground">Cart is empty</p>
                                        </div>
                                    ) : (
                                        cart.map((item) => {
                                            const isMaxQuantity = item.quantity >= item.availableStock;
                                            const isMinQuantity = item.quantity <= 1;
                                            const isSelected = selectedItemId === item.id;

                                            return (
                                                <div
                                                    key={item.id}
                                                    className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 rounded-lg gap-3 cursor-pointer transition-colors ${isSelected
                                                        ? 'bg-primary/20 border-2 border-primary'
                                                        : 'bg-muted/30 hover:bg-muted/50'
                                                        }`}
                                                    onClick={() => setSelectedItemId(item.id)}
                                                >
                                                    {/* Product image */}
                                                    <div className="w-12 h-12 rounded-md overflow-hidden flex-shrink-0 bg-muted">
                                                        {item.imageUrl ? (
                                                            <img
                                                                src={item.imageUrl}
                                                                alt={item.name}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                                                                No Img
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Product info */}
                                                    <div className="flex-1 min-w-0 w-full sm:w-auto">
                                                        <p className="font-medium text-sm truncate">{item.name}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {formatPKR(item.price)} x {item.quantity}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            Stock: {item.availableStock}
                                                        </p>
                                                    </div>

                                                    {/* Quantity controls and actions */}
                                                    <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-3">
                                                        <div className="flex items-center space-x-2">
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    updateQuantity(item.id, -1);
                                                                }}
                                                                className="h-7 w-7 p-0"
                                                                disabled={isMinQuantity}
                                                            >
                                                                <Minus className="h-3 w-3" />
                                                            </Button>
                                                            <span className="text-sm font-medium w-8 text-center">
                                                                {item.quantity}
                                                            </span>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    updateQuantity(item.id, 1);
                                                                }}
                                                                className="h-7 w-7 p-0"
                                                                disabled={isMaxQuantity}
                                                            >
                                                                <Plus className="h-3 w-3" />
                                                            </Button>
                                                        </div>

                                                        {/* Total price */}
                                                        <p className="font-semibold text-sm min-w-[80px] text-right">
                                                            {formatPKR(item.total)}
                                                        </p>

                                                        {/* Delete button - always visible in sale mode */}
                                                        {!isReturnMode && (
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    removeFromCart(item.id);
                                                                }}
                                                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                                title="Remove item"
                                                            >
                                                                <X className="h-4 w-4" />
                                                            </Button>
                                                        )}

                                                        {/* Return button - only in return mode */}
                                                        {isReturnMode && searchedSale?.return_status !== 'full' && (
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleReturnItem(item);
                                                                }}
                                                                className="text-destructive hover:text-destructive"
                                                                title="Return this item"
                                                                disabled={searchedSale?.return_status === 'full'}
                                                            >
                                                                <RefreshCw className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>

                                {/* Cart Summary */}
                                {/* Cart Summary */}
                                <div className="border-t border-border pt-4 space-y-2">
                                    <div className="flex justify-between text-sm flex-wrap gap-2">
                                        <span className="text-muted-foreground">Subtotal:</span>
                                        <span className="data-table font-medium">{formatPKR(subtotal)}</span>
                                    </div>

                                    {/* Tax Section */}
                                    <div className="flex justify-between text-sm items-center flex-wrap gap-2">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <input
                                                type="checkbox"
                                                checked={taxEnabled}
                                                onChange={(e) => setTaxEnabled(e.target.checked)}
                                                className="h-4 w-4 rounded border-gray-300"
                                            />
                                            <span className="text-muted-foreground">Tax:</span>
                                            {taxEnabled && (
                                                <div className="flex items-center gap-1">
                                                    <input
                                                        type="number"
                                                        value={useCustomTax ? customTax : tax}
                                                        onChange={(e) => {
                                                            const value = parseFloat(e.target.value) || 0;
                                                            if (useCustomTax) {
                                                                setCustomTax(value);
                                                            } else {
                                                                setTax(value);
                                                            }
                                                        }}
                                                        className="w-16 px-1 py-0.5 text-sm border rounded"
                                                        step="0.1"
                                                    />
                                                    <span className="text-xs">%</span>
                                                    <button
                                                        onClick={() => setUseCustomTax(!useCustomTax)}
                                                        className="text-xs text-primary hover:underline"
                                                    >
                                                        {useCustomTax ? "Reset" : "Custom"}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        <span className="data-table">{formatPKR(taxAmount)}</span>
                                    </div>

                                    {/* Discount Section */}
                                    <div className="flex justify-between text-sm items-center flex-wrap gap-2">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <input
                                                type="checkbox"
                                                checked={discountEnabled}
                                                onChange={(e) => setDiscountEnabled(e.target.checked)}
                                                className="h-4 w-4 rounded border-gray-300"
                                            />
                                            <span className="text-muted-foreground">Discount:</span>
                                            {discountEnabled && (
                                                <div className="flex items-center gap-1">
                                                    <input
                                                        type="number"
                                                        value={useCustomDiscount ? customDiscount : discount}
                                                        onChange={(e) => {
                                                            const value = parseFloat(e.target.value) || 0;
                                                            if (useCustomDiscount) {
                                                                setCustomDiscount(value);
                                                            } else {
                                                                setDiscount(value);
                                                            }
                                                        }}
                                                        className="w-16 px-1 py-0.5 text-sm border rounded"
                                                        step="0.1"
                                                    />
                                                    <span className="text-xs">%</span>
                                                    <button
                                                        onClick={() => setUseCustomDiscount(!useCustomDiscount)}
                                                        className="text-xs text-primary hover:underline"
                                                    >
                                                        {useCustomDiscount ? "Reset" : "Custom"}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        <span className="data-table text-destructive">-{formatPKR(discountAmount)}</span>
                                    </div>

                                    <div className="flex justify-between font-semibold text-base md:text-lg border-t border-border pt-2">
                                        <span>Total:</span>
                                        <span className="data-table">{formatPKR(total)}</span>
                                    </div>
                                </div>
                                {/* Payment Method */}
                                <div className="mt-4">
                                    <label className="block text-sm font-medium text-muted-foreground mb-2">
                                        Payment Method
                                    </label>
                                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                        <SelectTrigger data-testid="select-payment-method">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="cash">
                                                <div className="flex items-center">
                                                    <HandCoins className="h-4 w-4 mr-2" />
                                                    Cash
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="card">
                                                <div className="flex items-center">
                                                    <CreditCard className="h-4 w-4 mr-2" />
                                                    Card
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="easypaisa">
                                                <div className="flex items-center">
                                                    <Smartphone className="h-4 w-4 mr-2" />
                                                    EasyPaisa
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="jazzcash">
                                                <div className="flex items-center">
                                                    <Smartphone className="h-4 w-4 mr-2" />
                                                    JazzCash
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="bank">
                                                <div className="flex items-center">
                                                    <Banknote className="h-4 w-4 mr-2" />
                                                    Bank
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="check">
                                                <div className="flex items-center">
                                                    <Banknote className="h-4 w-4 mr-2" />
                                                    Check
                                                </div>
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                {isOrderMode && (
                                    <div className="mt-4">
                                        <label className="block text-sm font-medium text-muted-foreground mb-2">
                                            Salesman
                                        </label>
                                        <Select value={employeeId} onValueChange={setEmployeeId}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select Salesman" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {salesman.map((emp: any) => (
                                                    <SelectItem key={emp.id} value={emp.id}>
                                                        {emp.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                {
                                    isOrderMode && <div className="mt-4">
                                        <label className="block text-sm font-medium text-muted-foreground mb-2">
                                            Payment Status
                                        </label>
                                        <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select Payment Status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {["completed", "pending", "cancelled"].map((status) => (
                                                    <SelectItem key={status} value={status}>
                                                        {status.charAt(0).toUpperCase() + status.slice(1)}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                }


                                {isReturnMode ? (
                                    <Button
                                        className="w-full mt-4"
                                        onClick={handleProcessReturn}
                                        disabled={
                                            (returnedItemsList.length === 0 && !hasModifiedQuantities) ||  // No items selected and no quantity modifications
                                            processReturnMutation.isPending ||  // Already processing
                                            (searchedSale?.return_status === 'full')  // Sale is fully returned already
                                        }
                                        variant="destructive"
                                    >
                                        {processReturnMutation.isPending ? (
                                            "Processing Return..."
                                        ) : (
                                            <>
                                                <RefreshCw className="h-4 w-4 mr-2" />
                                                Process Return ({returnedItemsList.length > 0 ? returnedItemsList.length : (hasModifiedQuantities ? "Modified" : "0")} items)
                                            </>
                                        )}
                                    </Button>
                                ) : (
                                    <Button
                                        className="w-full mt-4"
                                        onClick={handleProcessPayment}
                                        disabled={cart.length === 0 || processSaleMutation.isPending}
                                    >
                                        {processSaleMutation.isPending ? (
                                            "Processing..."
                                        ) : (
                                            <>
                                                <CreditCard className="h-4 w-4 mr-2" />
                                                Process Payment
                                            </>
                                        )}
                                    </Button>
                                )}

                                {/* Quick Actions */}
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            setCart([])
                                            localStorage.removeItem('pos_cart');
                                        }}
                                        disabled={cart.length === 0}
                                        className="text-sm"
                                    >
                                        Clear Cart
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handlePrintReceipt}
                                        className="text-sm"
                                    >
                                        <Printer className="h-4 w-4 mr-1 sm:mr-2" />
                                        <span className="hidden sm:inline">Print Receipt</span>
                                        <span className="sm:hidden">Print</span>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Receipt Modal */}
                {/* Receipt Modal */}
                <Dialog open={isReceiptModalOpen} onOpenChange={setIsReceiptModalOpen}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Receipt Preview</DialogTitle>
                        </DialogHeader>

                        <div className="space-y-4">
                            {/* Amount Paid Input */}
                            <div>
                                <label className="block text-sm font-medium mb-2">Amount Paid</label>
                                <Input
                                    type="number"
                                    value={amountPaid}
                                    onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                                    placeholder="Enter amount paid"
                                />
                            </div>

                            {/* Discount Input with default value indicator */}
                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    Discount
                                    {settings?.discount > 0 && (
                                        <span className="text-xs text-muted-foreground ml-2">
                                            (Default: {formatPKR(settings.discount)})
                                        </span>
                                    )}
                                </label>
                                <Input
                                    type="number"
                                    value={discount}
                                    onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                                    placeholder="Enter discount amount"
                                />
                                {settings?.discount > 0 && discount === settings.discount && (
                                    <p className="text-xs text-green-600 mt-1">
                                        Using default discount from store settings
                                    </p>
                                )}
                                {settings?.discount > 0 && discount !== settings.discount && (
                                    <p className="text-xs text-orange-600 mt-1">
                                        Custom discount applied (default: {formatPKR(settings.discount)})
                                    </p>
                                )}
                            </div>

                            {/* Tax Input with default value indicator */}
                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    Tax
                                    {settings?.tax > 0 && (
                                        <span className="text-xs text-muted-foreground ml-2">
                                            (Default: {formatPKR(settings.tax)})
                                        </span>
                                    )}
                                </label>
                                <Input
                                    type="number"
                                    value={tax}
                                    onChange={(e) => setTax(parseFloat(e.target.value) || 0)}
                                    placeholder="Enter tax amount"
                                />
                                {settings?.tax > 0 && tax === settings.tax && (
                                    <p className="text-xs text-green-600 mt-1">
                                        Using default tax from store settings
                                    </p>
                                )}
                                {settings?.tax > 0 && tax !== settings.tax && (
                                    <p className="text-xs text-orange-600 mt-1">
                                        Custom tax applied (default: {formatPKR(settings.tax)})
                                    </p>
                                )}
                            </div>

                            {/* Receipt Summary */}
                            <Card>
                                <CardContent className="p-4">
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span>Subtotal:</span>
                                            <span>{formatPKR(subtotal)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Tax:</span>
                                            <span>{formatPKR(tax)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Discount:</span>
                                            <span>-{formatPKR(discount)}</span>
                                        </div>
                                        <div className="flex justify-between font-bold border-t pt-2">
                                            <span>Total:</span>
                                            <span>{formatPKR(subtotal + tax - discount)}</span>
                                        </div>
                                        {amountPaid > 0 && (
                                            <div className="flex justify-between text-green-600">
                                                <span>Change:</span>
                                                <span>{formatPKR(Math.max(0, amountPaid - (subtotal + tax - discount)))}</span>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <DialogFooter className="flex gap-2 sm:gap-0">
                            <Button variant="outline" onClick={() => setIsReceiptModalOpen(false)}>
                                <X className="h-4 w-4 mr-2" />
                                Cancel
                            </Button>

                            {customerPhone && (
                                <Button variant="outline" onClick={handleShareWhatsApp}>
                                    <Share className="h-4 w-4 mr-2" />
                                    Share
                                </Button>
                            )}

                            <Button onClick={() => { HanldePrintReceipt({ generateReceiptData }) }}>
                                <Printer className="h-4 w-4 mr-2" />
                                Print
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Scanner Dialog */}
                <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Scan Product Barcode</DialogTitle>
                        </DialogHeader>

                        <div className="w-full h-64 bg-black rounded-md overflow-hidden flex items-center justify-center">
                            {!scannedCode ? (
                                <BarcodeScanner
                                    onUpdate={(err, result) => {
                                        if (result) handleScan(result);
                                        if (err) handleError(err);
                                    }}
                                />
                            ) : (
                                <p className="text-center text-lg font-medium">
                                    ✅ Code: {scannedCode}
                                </p>
                            )}
                        </div>

                        <DialogFooter className="flex justify-end gap-2 mt-4">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setIsScannerOpen(false);
                                    setScannedCode(null);
                                }}
                            >
                                Cancel
                            </Button>
                            {scannedCode && (
                                <Button onClick={handleAddScannedProduct}>Add</Button>
                            )}
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </main>
        </div>
    );
}