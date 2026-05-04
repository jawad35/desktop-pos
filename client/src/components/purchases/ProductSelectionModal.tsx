// client/src/components/purchases/ProductSelectionModal.tsx
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, ShoppingCart, History, X } from "lucide-react";
import { formatPKR } from "@/lib/currency";
import { useToast } from "@/hooks/use-toast";
import { api } from "../../services/electron-api";

interface Product {
    id: string;
    name: string;
    sku: string;
    barcode: string;
    selling_price: number;
    cost_price: number;
    stock: number;
    image_url?: string;
}

interface ProductSelectionModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onProductSelect: (product: Product, quantity: number, unitPrice: number) => void;
    selectedProductIds?: string[];
}

const STORAGE_KEY = 'product_search_history';

export function ProductSelectionModal({ open, onOpenChange, onProductSelect, selectedProductIds = [] }: ProductSelectionModalProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [searchResults, setSearchResults] = useState<Product[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [quantity, setQuantity] = useState(1);
    const [unitPrice, setUnitPrice] = useState(0);
    const [searchHistory, setSearchHistory] = useState<string[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const { toast } = useToast();

    // Load search history from localStorage
    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                setSearchHistory(JSON.parse(saved));
            }
        } catch (error) {
            console.error("Error loading search history:", error);
        }
    }, []);

    // Reset when modal closes
    useEffect(() => {
        if (!open) {
            setSelectedProduct(null);
            setSearchTerm("");
            setSearchResults([]);
            setShowHistory(false);
            setQuantity(1);
            setUnitPrice(0);
        }
    }, [open]);

    // Save search term to history
    const saveToHistory = (term: string) => {
        if (!term.trim()) return;
        const updated = [term, ...searchHistory.filter(h => h !== term)].slice(0, 10);
        setSearchHistory(updated);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    };

    const searchProducts = async () => {
        if (!searchTerm.trim()) {
            setSearchResults([]);
            return;
        }
        
        saveToHistory(searchTerm);
        setIsSearching(true);
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
            // Filter out already selected products
            products = products.filter(p => !selectedProductIds.includes(p.id));
            setSearchResults(products);
        } catch (error) {
            console.error("Error searching products:", error);
            toast({ title: "Error", description: "Failed to search products", variant: "destructive" });
        } finally {
            setIsSearching(false);
        }
    };

    const handleProductClick = (product: Product) => {
        setSelectedProduct(product);
        setQuantity(1);
        setUnitPrice(product.cost_price || product.selling_price || 0);
    };

    const handleAddToPurchase = () => {
        if (!selectedProduct) return;
        if (quantity <= 0) {
            toast({ title: "Error", description: "Quantity must be greater than 0", variant: "destructive" });
            return;
        }
        if (unitPrice <= 0) {
            toast({ title: "Error", description: "Unit price must be greater than 0", variant: "destructive" });
            return;
        }
        
        onProductSelect(selectedProduct, quantity, unitPrice);
        setSelectedProduct(null);
        setQuantity(1);
        setUnitPrice(0);
        setSearchTerm("");
        setSearchResults([]);
        onOpenChange(false);
    };

    const clearHistory = () => {
        setSearchHistory([]);
        localStorage.removeItem(STORAGE_KEY);
        toast({ description: "Search history cleared" });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-2xl">Select Products for Purchase</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Search Section */}
                    <div>
                        <Label>Search Products</Label>
                        <div className="flex gap-2 mt-1">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input 
                                    placeholder="Search by name, SKU, or barcode..." 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && searchProducts()}
                                    className="pl-10"
                                />
                            </div>
                            <Button onClick={searchProducts} disabled={isSearching}>
                                {isSearching ? "Searching..." : "Search"}
                            </Button>
                            <Button 
                                type="button" 
                                variant="outline" 
                                onClick={() => setShowHistory(!showHistory)}
                                title="Search History"
                            >
                                <History className="h-4 w-4" />
                            </Button>
                        </div>

                        {/* Search History */}
                        {showHistory && searchHistory.length > 0 && (
                            <div className="mt-2 border rounded-lg p-3">
                                <div className="flex justify-between items-center mb-2">
                                    <Label className="text-sm">Recent Searches</Label>
                                    <Button variant="ghost" size="sm" onClick={clearHistory}>
                                        Clear History
                                    </Button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {searchHistory.map((term, idx) => (
                                        <Button
                                            key={idx}
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                setSearchTerm(term);
                                                searchProducts();
                                                setShowHistory(false);
                                            }}
                                        >
                                            {term}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Search Results */}
                    {searchResults.length > 0 && !selectedProduct && (
                        <div>
                            <Label>Search Results ({searchResults.length} products found)</Label>
                            <div className="border rounded-lg mt-1 max-h-96 overflow-y-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-16">Image</TableHead>
                                            <TableHead>Product</TableHead>
                                            <TableHead>SKU</TableHead>
                                            <TableHead className="text-right">Cost Price</TableHead>
                                            <TableHead className="text-right">Selling Price</TableHead>
                                            <TableHead className="text-center">Stock</TableHead>
                                            <TableHead className="text-center w-20">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {searchResults.map(product => (
                                            <TableRow key={product.id} className="cursor-pointer hover:bg-muted/50">
                                                <TableCell>
                                                    {product.image_url ? (
                                                        <img src={product.image_url} alt={product.name} className="w-10 h-10 object-cover rounded" />
                                                    ) : (
                                                        <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                                                            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell className="font-medium">{product.name}</TableCell>
                                                <TableCell className="text-muted-foreground">{product.sku}</TableCell>
                                                <TableCell className="text-right">{formatPKR(product.cost_price)}</TableCell>
                                                <TableCell className="text-right">{formatPKR(product.selling_price)}</TableCell>
                                                <TableCell className="text-center">
                                                    <span className={product.stock <= 0 ? "text-red-500" : "text-green-500"}>
                                                        {product.stock}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Button 
                                                        size="sm" 
                                                        variant="outline"
                                                        onClick={() => handleProductClick(product)}
                                                    >
                                                        Select
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    )}

                    {/* No Results */}
                    {searchResults.length === 0 && searchTerm && !isSearching && !selectedProduct && (
                        <div className="text-center py-8 border rounded-lg">
                            <p className="text-muted-foreground">No products found matching "{searchTerm}"</p>
                        </div>
                    )}

                    {/* Selected Product Configuration */}
                    {selectedProduct && (
                        <div className="border rounded-lg p-4 space-y-4 bg-muted/20">
                            <div className="flex justify-between items-start">
                                <div className="flex gap-3">
                                    {selectedProduct.image_url ? (
                                        <img src={selectedProduct.image_url} alt={selectedProduct.name} className="w-16 h-16 object-cover rounded" />
                                    ) : (
                                        <div className="w-16 h-16 bg-muted rounded flex items-center justify-center">
                                            <ShoppingCart className="h-8 w-8 text-muted-foreground" />
                                        </div>
                                    )}
                                    <div>
                                        <h3 className="font-semibold text-lg">{selectedProduct.name}</h3>
                                        <p className="text-sm text-muted-foreground">SKU: {selectedProduct.sku}</p>
                                        <p className="text-sm text-muted-foreground">Current Stock: {selectedProduct.stock}</p>
                                    </div>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => setSelectedProduct(null)}>
                                    <X className="h-4 w-4 mr-1" />
                                    Change
                                </Button>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Quantity *</Label>
                                    <Input 
                                        type="number" 
                                        min="1"
                                        value={quantity}
                                        onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                        className="mt-1"
                                    />
                                </div>
                                <div>
                                    <Label>Purchase Unit Price (PKR) *</Label>
                                    <Input 
                                        type="number" 
                                        step="0.01"
                                        min="0"
                                        value={unitPrice}
                                        onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                                        className="mt-1"
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Current cost: {formatPKR(selectedProduct.cost_price)} | 
                                        Selling: {formatPKR(selectedProduct.selling_price)}
                                    </p>
                                </div>
                            </div>

                            <div className="bg-primary/10 p-3 rounded-lg">
                                <div className="flex justify-between items-center">
                                    <span className="font-medium">Total for this item:</span>
                                    <span className="font-bold text-xl text-primary">{formatPKR(quantity * unitPrice)}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    {selectedProduct && (
                        <Button onClick={handleAddToPurchase} className="bg-green-600 hover:bg-green-700">
                            Add to Purchase
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}