import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatPKR } from "@/lib/currency";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Product, Category, Brand, Supplier } from "@/types/api";
import BarcodeScanner from "react-qr-barcode-scanner"
import { api } from "../services/electron-api";
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

interface CartItem {
    id: string;
    name: string;
    price: string;
    quantity: number;
    total: number;
    imageUrl: string;
    availableStock: number; // Add this line
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
    const [isManualReturn, setIsManualReturn] = useState(true)
    const [discount, setDiscount] = useState(0);
    const [tax, setTax] = useState(1);
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

    const { data: salesman = [] } = useQuery<any[]>({
        queryKey: ["employees", "salesman"],
        queryFn: async () => {
            const result = await api.getEmployees({ employeeType: "salesman" });
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
    const searchSaleMutation = useMutation({
        mutationFn: async (receiptNumber: string) => {
            const result = await api.getSaleByReceiptNumber(receiptNumber);
            if (!result) throw new Error("Sale not found");
            return result;
        },
        onSuccess: (data) => {
            setSearchedSale(data);
            const returnItems = data.items?.map((item: any) => ({
                id: item.product_id,
                name: item.product?.name || "Product",
                price: item.unit_price,
                quantity: item.quantity,
                total: parseFloat(item.total),
                imageUrl: item.product?.image_url,
                availableStock: item.product?.stock || 0,
                originalQuantity: item.quantity,
            })) || [];
            setCart(returnItems);
        },
        onError: (error: Error) => {
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
            queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
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

    // Rest of your existing functions remain the same...
    const processSaleMutation = useMutation({
        mutationFn: async ({ saleData, items }: { saleData: any; items: any[] }) => {
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
                        total: (item.quantity + 1) * parseFloat(item.selling_price),
                        availableStock: product.stock
                    }
                    : item
            ));
        } else {
            setCart([...cart, {
                id: product.id,
                name: product.name,
                price: product.selling_price,
                imageUrl: product.image_url,
                quantity: 1,
                total: parseFloat(product.selling_price),
                availableStock: product.stock
            }]);
        }
    };

    const updateQuantity = (id: string, change: number) => {
        setCart(cart.map(item => {
            if (item.id === id) {
                const newQuantity = item.quantity + change;

                // Prevent going below 1
                if (newQuantity < 1) {
                    return item;
                }

                // Prevent exceeding available stock
                if (newQuantity > item.availableStock) {
                    toast({
                        title: "Insufficient Stock",
                        description: `Only ${item.availableStock} items available`,
                        variant: "destructive"
                    });
                    return item;
                }

                return {
                    ...item,
                    quantity: newQuantity,
                    total: newQuantity * parseFloat(item.price)
                };
            }
            return item;
        }));
    };

    const removeFromCart = (id: string) => {
        setCart(cart.filter(item => item.id !== id));
    };

    const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
    const total = subtotal + tax;

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
        const items = cart.map(item => ({
            productId: item.id,
            quantity: item.quantity,
            unitPrice: parseFloat(item.price),
            total: item.total.toString(),
        }));

        const saleData = {
            receiptNumber,
            customerName: customerName || null,
            customerPhone: customerPhone || null,
            subtotal: subtotal.toString(),
            tax: tax.toString(),
            total: total.toString(),
            paymentMethod,
            paymentStatus,
            employeeId: employeeId || null,
            userId: "system",
            shopId: "default",
        };

        console.log('Sending saleData:', saleData);
        console.log('Sending items:', items);

        processSaleMutation.mutate({ saleData, items });
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
            tax: tax,
            discount: discount,
            total: total - discount,
            paymentMethod: paymentMethod,
            amountPaid: amountPaid,
            change: Math.max(0, amountPaid - (total - discount)),
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
    const handleProcessReturn = () => {
        if (cart.length === 0) {
            toast({
                title: "Cart Empty",
                description: "Please add items to return",
                variant: "destructive",
            });
            return;
        }

        // Calculate return fee
        let returnFee = 0;
        if (returnFeeType === "percentage") {
            returnFee = (subtotal * returnFeeValue) / 100;
        } else {
            returnFee = returnFeeValue;
        }

        const returnTotal = Math.max(0, subtotal - returnFee);
        const returnReceiptNumber = `RET-${Date.now()}`;
        const originalSaleId = isManualReturn
            ? `manual-${Date.now()}`
            : searchedSale?.id;

        const items = cart.map(item => ({
            productId: item.id,
            quantity: item.quantity,
            unitPrice: parseFloat(item.price),
            total: item.total.toString(),
        }));

        const returnData = {
            receiptNumber: returnReceiptNumber,
            originalSaleId: originalSaleId,
            customerName: customerName || searchedSale?.customerName || "Walk-in Customer",
            customerPhone: customerPhone || searchedSale?.customerPhone || "N/A",
            subtotal: subtotal.toString(),
            tax: tax.toString(),
            discount: discount.toString(),
            returnFee: returnFee.toString(),
            total: returnTotal.toString(),
            isManualReturn: isManualReturn,
            returnReason: returnReason || "Product return",
            paymentMethod: paymentMethod,
            userId: "system",
            shopId: "default",
        };

        console.log('Return Data:', returnData);
        console.log('Return Items:', items);

        processReturnMutation.mutate({ returnData, items });
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
                                <div className="flex space-x-2 mb-4">
                                    <Button
                                        variant={isOrderMode ? "destructive" : "outline"}
                                        onClick={() => setIsOrderMode(!isOrderMode)}
                                        className="flex-1"
                                    >
                                        {isOrderMode ? "Exit Order Mode" : "Order Mode"}
                                    </Button>
                                </div>
                                <div className="flex space-x-2 mb-4">
                                    <Button
                                        variant={isReturnMode ? "destructive" : "outline"}
                                        onClick={() => setIsReturnMode(!isReturnMode)}
                                        className="flex-1"
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
                                            <div className="text-sm p-2 bg-background rounded">
                                                <p><strong>Receipt:</strong> {searchedSale.receiptNumber}</p>
                                                <p><strong>Date:</strong> {new Date(searchedSale.createdAt).toLocaleDateString()}</p>
                                                <p><strong>Original Total:</strong> {formatPKR(parseFloat(searchedSale.total))}</p>
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
                                <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
                                    {cart.length === 0 ? (
                                        <div className="text-center py-8">
                                            <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                                            <p className="text-muted-foreground">Cart is empty</p>
                                        </div>
                                    ) : (
                                        cart.map((item) => {
                                            const isMaxQuantity = item.quantity >= item.availableStock;
                                            const isMinQuantity = item.quantity <= 1;

                                            return (
                                                <div
                                                    key={item.id}
                                                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                                                    data-testid={`cart-item-${item.id}`}
                                                >
                                                    {/* Product image */}
                                                    <div className="w-12 h-12 rounded-md overflow-hidden flex-shrink-0 mr-3 bg-muted">
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
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-medium text-sm truncate">{item.name}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {formatPKR(item.price)} x {item.quantity}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            Stock: {item.availableStock}
                                                        </p>
                                                    </div>

                                                    {/* Quantity controls */}
                                                    <div className="flex items-center space-x-2 ml-2">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => updateQuantity(item.id, -1)}
                                                            className="h-6 w-6 p-0"
                                                            disabled={isMinQuantity}
                                                            data-testid={`button-decrease-${item.id}`}
                                                        >
                                                            <Minus className="h-3 w-3" />
                                                        </Button>
                                                        <span className="text-sm font-medium w-8 text-center">
                                                            {item.quantity}
                                                        </span>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => updateQuantity(item.id, 1)}
                                                            className="h-6 w-6 p-0"
                                                            disabled={isMaxQuantity}
                                                            data-testid={`button-increase-${item.id}`}
                                                        >
                                                            <Plus className="h-3 w-3" />
                                                        </Button>
                                                    </div>

                                                    {/* Total price */}
                                                    <p className="font-semibold text-sm ml-3 data-table">
                                                        {formatPKR(item.total)}
                                                    </p>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>

                                {/* Cart Summary */}
                                <div className="border-t border-border pt-4 space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Subtotal:</span>
                                        <span className="data-table">{formatPKR(subtotal)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Tax:</span>
                                        <span className="data-table">{formatPKR(tax)}</span>
                                    </div>
                                    <div className="flex justify-between font-semibold text-lg border-t border-border pt-2">
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
                                {
                                    isOrderMode && <div className="mt-4">
                                        <label className="block text-sm font-medium text-muted-foreground mb-2">
                                            Salesman
                                        </label>
                                        <Select value={employeeId} onValueChange={setEmployeeId}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select Salesman" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {salesman?.data?.map((emp: any) => (
                                                    <SelectItem key={emp.id} value={emp.id}>
                                                        {emp.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                }

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


                                {/* Process Payment Button */}
                                {/* Replace your existing Process Payment button with this */}
                                {isReturnMode ? (
                                    <Button
                                        className="w-full mt-4"
                                        onClick={handleProcessReturn}
                                        disabled={cart.length === 0 || processReturnMutation.isPending}
                                        variant="destructive"
                                    >
                                        {processReturnMutation.isPending ? (
                                            "Processing Return..."
                                        ) : (
                                            <>
                                                <RefreshCw className="h-4 w-4 mr-2" />
                                                Process Return
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
                                        onClick={() => setCart([])}
                                        disabled={cart.length === 0}
                                        data-testid="button-clear-cart"
                                    >
                                        Clear Cart
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handlePrintReceipt}
                                        data-testid="button-print-receipt"
                                    >
                                        <Printer className="h-4 w-4 mr-2" />
                                        Print Receipt
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

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

                            {/* Discount Input */}
                            <div>
                                <label className="block text-sm font-medium mb-2">Discount</label>
                                <Input
                                    type="number"
                                    value={discount}
                                    onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                                    placeholder="Enter discount amount"
                                />
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
                                            <span>Discount:</span>
                                            <span>-{formatPKR(discount)}</span>
                                        </div>
                                        <div className="flex justify-between font-bold border-t pt-2">
                                            <span>Total:</span>
                                            <span>{formatPKR(total - discount)}</span>
                                        </div>
                                        {amountPaid > 0 && (
                                            <div className="flex justify-between text-green-600">
                                                <span>Change:</span>
                                                <span>{formatPKR(Math.max(0, amountPaid - (total - discount)))}</span>
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