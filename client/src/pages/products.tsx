import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader,
  DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem,
  FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { formatPKR } from "@/lib/currency";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Edit, Trash2, Upload,
  ChevronRight, ChevronLeft, RefreshCw,
} from "lucide-react";
import { Product, Category, Brand, Supplier } from "@/types/api";
import { useHeader } from "@/contexts/HeaderContext";
import { ReactBarcode } from "react-jsbarcode";
import jsPDF from "jspdf";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { api } from "../services/electron-api";

const productFormSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  sku: z.string().min(1, "SKU is required"),
  barcode: z.string().optional(),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  brandId: z.string().optional(),
  supplierId: z.string().optional(),
  costPrice: z.string().min(1, "Cost price is required"),
  sellingPrice: z.string().min(1, "Selling price is required"),
  stock: z.string().min(0),
  minStock: z.string().min(0),
  isActive: z.boolean().optional().default(true),
  productType: z.string().optional(),
  taxRate: z.string().optional(),
  discount: z.string().optional(),
  unitOfMeasure: z.string().optional(),
  weight: z.string().optional(),
  colors: z.string().optional(),
  sizes: z.string().optional(),
  material: z.string().optional(),
  tags: z.string().optional(),
  warranty: z.string().optional(),
  expiryDate: z.string().nullable().optional(),
  manufacturer: z.string().optional(),
  countryOfOrigin: z.string().optional(),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

export default function Products() {
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);

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

  const [barcodeModalOpen, setBarcodeModalOpen] = useState(false);
  const [barcodeValue, setBarcodeValue] = useState("");
  const [barcodeQuantity, setBarcodeQuantity] = useState(1);
  const [generatedBarcodes, setGeneratedBarcodes] = useState<string[]>([]);

  const [importOpen, setImportOpen] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [importFile, setImportFile] = useState<File | null>(null);

  const { toast } = useToast();
  const { setTitle, setSubtitle } = useHeader();

  const pageSize = 50;
  const [page, setPage] = useState(1);

  useEffect(() => {
    setTitle("Products");
    setSubtitle("Manage your product inventory");
  }, []);

  // Fetch products
  const { data: products = [], isLoading, refetch } = useQuery<Product[]>({
    queryKey: ["products", filters],
    queryFn: async () => {
      const result = await api.getProducts(filters);
      if (Array.isArray(result)) return result;
      if (result?.success && Array.isArray(result.data)) return result.data;
      return [];
    },
  });

  // Fetch categories
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      const result = await api.getCategories();
      if (Array.isArray(result)) return result;
      if (result?.success && Array.isArray(result.data)) return result.data;
      return [];
    },
  });

  // Fetch brands
  const { data: brands = [] } = useQuery<Brand[]>({
    queryKey: ["brands"],
    queryFn: async () => {
      const result = await api.getBrands();
      if (Array.isArray(result)) return result;
      if (result?.success && Array.isArray(result.data)) return result.data;
      return [];
    },
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

  const totalCount = products.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const paginatedProducts = products.slice((page - 1) * pageSize, page * pageSize);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      sku: "",
      barcode: "",
      description: "",
      categoryId: "",
      brandId: "",
      supplierId: "",
      costPrice: "",
      sellingPrice: "",
      stock: "0",
      minStock: "0",
      isActive: true,
      productType: "physical",
      taxRate: "0",
      discount: "0",
      unitOfMeasure: "piece",
      weight: "0",
      colors: "",
      sizes: "",
      material: "",
      tags: "",
      warranty: "0",
      expiryDate: "",
      manufacturer: "",
      countryOfOrigin: "",
    },
  });

  // Barcode helpers
  const handleGenerateBarcodes = () => {
    if (!barcodeValue || barcodeQuantity < 1) {
      toast({ description: "Enter barcode & quantity", variant: "destructive" });
      return;
    }
    setGeneratedBarcodes(Array.from({ length: barcodeQuantity }, () => barcodeValue));
    setBarcodeModalOpen(true);
  };

  const handleDownloadPDF = () => {
    const pdf = new jsPDF();
    let x = 10, y = 10;
    generatedBarcodes.forEach((code) => {
      const canvas = document.createElement("canvas");
      // @ts-ignore
      JsBarcode(canvas, code, { format: "CODE128" });
      const imgData = canvas.toDataURL("image/png");
      pdf.addImage(imgData, "PNG", x, y, 50, 20);
      y += 30;
      if (y > 270) { y = 10; pdf.addPage(); }
    });
    pdf.save("barcodes.pdf");
  };

  const handlePrint = () => {
    const printWindow = window.open("", "", "width=800,height=600");
    if (!printWindow) return;
    printWindow.document.write("<html><head><title>Print Barcodes</title></head><body>");
    generatedBarcodes.forEach((code) => {
      printWindow.document.write(
        `<div style="margin:10px;text-align:center;">
          <svg class="barcode" jsbarcode-format="CODE128" jsbarcode-value="${code}"
               jsbarcode-textmargin="2" jsbarcode-height="40"></svg>
        </div>`
      );
    });
    printWindow.document.write("</body></html>");
    printWindow.document.close();
    printWindow.onload = () => {
      const script = printWindow.document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/jsbarcode";
      script.onload = () => {
        // @ts-ignore
        printWindow.JsBarcode(".barcode").init();
        printWindow.print();
      };
      printWindow.document.body.appendChild(script);
    };
  };

  // Create mutation
  const createProductMutation = useMutation({
    mutationFn: async (data: any) => {
      const productWithIds = { ...data, userId: 'system', shopId: 'default' };
      const result = await api.createProduct(productWithIds);
      return result;
    },
    onSuccess: () => {
      toast({ title: "Product Created" });
      refetch();
      setDialogOpen(false);
      form.reset();
      setSelectedImages([]);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Update mutation
  const updateProductMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const result = await api.updateProduct(id, data);
      return result;
    },
    onSuccess: () => {
      toast({ title: "Product Updated" });
      refetch();
      setDialogOpen(false);
      setEditingProduct(null);
      form.reset();
      setSelectedImages([]);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Disable mutation
  const disableProductMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await api.deleteProduct(id);
      return result === true;
    },
    onSuccess: () => {
      toast({ title: "Product Disabled", description: "Product has been disabled" });
      refetch();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Restore mutation
  const restoreProductMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await api.restoreProduct(id);
      return result === true;
    },
    onSuccess: () => {
      toast({ title: "Product Restored", description: "Product has been restored" });
      refetch();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleDisable = (id: string, name: string) => {
    if (confirm(`Disable "${name}"? It will be hidden from POS but kept in records.`)) {
      disableProductMutation.mutate(id);
    }
  };

  const handleRestore = (id: string, name: string) => {
    if (confirm(`Restore "${name}"? It will appear in POS again.`)) {
      restoreProductMutation.mutate(id);
    }
  };

  const onSubmit = (data: ProductFormValues) => {
    const payload: Record<string, any> = {
      name: data.name,
      sku: data.sku,
      barcode: data.barcode || "",
      description: data.description || "",
      categoryId: data.categoryId || null,
      brandId: data.brandId || null,
      supplierId: data.supplierId || null,
      costPrice: parseFloat(data.costPrice),
      sellingPrice: parseFloat(data.sellingPrice),
      stock: parseInt(data.stock, 10),
      minStock: parseInt(data.minStock, 10),
      isActive: data.isActive ?? true,
      productType: data.productType || "physical",
      taxRate: parseFloat(data.taxRate || "0"),
      discount: parseFloat(data.discount || "0"),
      unitOfMeasure: data.unitOfMeasure || "piece",
      weight: parseFloat(data.weight || "0"),
      colors: data.colors || "",
      sizes: data.sizes || "",
      material: data.material || "",
      tags: data.tags || "",
      warranty: parseInt(data.warranty || "0"),
      expiryDate: data.expiryDate || null,
      manufacturer: data.manufacturer || "",
      countryOfOrigin: data.countryOfOrigin || "",
      userId: "system",
      shopId: "default"
    };

    if (selectedImages.length > 0) {
      const readers = selectedImages.map(
        (file) => new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        })
      );
      Promise.all(readers).then((base64Images) => {
        payload.imageUrl = base64Images[0];
        if (editingProduct) {
          updateProductMutation.mutate({ id: editingProduct.id, data: payload });
        } else {
          createProductMutation.mutate(payload);
        }
      });
    } else {
      if (editingProduct) {
        updateProductMutation.mutate({ id: editingProduct.id, data: payload });
      } else {
        createProductMutation.mutate(payload);
      }
    }
  };

  const handleEdit = (product: any) => {
    setEditingProduct(product);
    setExistingImages(product.imageUrl ? [product.imageUrl] : []);
    form.reset({
      name: product.name,
      sku: product.sku,
      barcode: product.barcode || "",
      description: product.description || "",
      categoryId: product.category_id || "",
      brandId: product.brand_id || "",
      supplierId: product.supplier_id || "",
      costPrice: product.cost_price?.toString() || "",
      sellingPrice: product.selling_price?.toString() || "",
      stock: product.stock?.toString() || "0",
      minStock: product.min_stock?.toString() || "0",
      isActive: product.is_active === 1,
      productType: product.product_type || "physical",
      taxRate: product.tax_rate?.toString() || "0",
      discount: product.discount?.toString() || "0",
      unitOfMeasure: product.unit_of_measure || "piece",
      weight: product.weight?.toString() || "0",
      colors: product.colors || "",
      sizes: product.sizes || "",
      material: product.material || "",
      tags: product.tags || "",
      warranty: product.warranty?.toString() || "0",
      expiryDate: product.expiry_date ? new Date(product.expiry_date).toISOString().split("T")[0] : "",
      manufacturer: product.manufacturer || "",
      countryOfOrigin: product.country_of_origin || "",
    });
    setSelectedImages([]);
    setDialogOpen(true);
  };

  const handleExport = async () => {
    try {
      const result = await api.getProducts();
      let allProducts: Product[] = [];
      if (Array.isArray(result)) allProducts = result;
      else if (result?.success && Array.isArray(result.data)) allProducts = result.data;

      const headers = ["Name", "SKU", "Barcode", "Category", "Brand", "Supplier", "Cost Price", "Selling Price", "Stock", "Min Stock", "Product Type", "Status"];
      const rows = allProducts.map((p: any) => [
        p.name, p.sku, p.barcode,
        categories.find((c) => c.id === p.category_id)?.name || "",
        brands.find((b) => b.id === p.brand_id)?.name || "",
        suppliers.find((s) => s.id === p.supplier_id)?.name || "",
        p.cost_price, p.selling_price, p.stock, p.min_stock,
        p.product_type, p.is_active === 1 ? "Active" : "Disabled"
      ]);

      const csvContent = [headers, ...rows].map((r) => r.map((v: any) => `"${v ?? ""}"`).join(",")).join("\n");
      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "products.csv";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({ title: "Export Successful" });
    } catch (error) {
      toast({ title: "Export Failed", variant: "destructive" });
    }
  };

  const handleImport = async () => {
    try {
      if (!importFile && !importUrl) {
        alert("Please select a file or enter a URL.");
        return;
      }
      if (importFile) {
        const text = await importFile.text();
        const lines = text.split("\n").filter(Boolean);
        const [headerLine, ...dataLines] = lines;
        const headers = headerLine.split(",").map((h) => h.replace(/"/g, "").trim());
        const products = dataLines.map((line) => {
          const values = line.split(",").map((v) => v.replace(/"/g, "").trim());
          return headers.reduce((obj: any, key, i) => {
            obj[key] = values[i];
            return obj;
          }, {});
        });
        for (const product of products) {
          await api.createProduct(product);
        }
        refetch();
        toast({ title: "Import Successful", description: `Imported ${products.length} products.` });
      }
      setImportOpen(false);
      setImportUrl("");
      setImportFile(null);
    } catch (err) {
      console.error(err);
      alert("Failed to import products.");
    }
  };

  const fillDemoProduct = () => {
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    form.reset({
      name: "Premium Wireless Headphones",
      sku: `DEMO-${Date.now()}`,
      barcode: `880${Math.floor(100000000 + Math.random() * 900000000)}`,
      description: "High-quality wireless headphones with noise cancellation.",
      categoryId: categories.length > 0 ? categories[0].id : "",
      brandId: brands.length > 0 ? brands[0].id : "",
      supplierId: suppliers.length > 0 ? suppliers[0].id : "",
      costPrice: "4500",
      sellingPrice: "7999",
      stock: "50",
      minStock: "10",
      isActive: true,
      productType: "physical",
      taxRate: "16",
      discount: "10",
      unitOfMeasure: "piece",
      weight: "0.25",
      colors: "Black, White, Blue, Red",
      sizes: "One Size",
      material: "Plastic, Metal, Leather",
      tags: "electronics, audio, wireless, premium",
      warranty: "12",
      expiryDate: expiryDate.toISOString().split("T")[0],
      manufacturer: "SoundTech Inc.",
      countryOfOrigin: "China",
    });
    setBarcodeValue(`880${Math.floor(100000000 + Math.random() * 900000000)}`);
    toast({ description: "Demo product loaded." });
  };

  const PaginationControls = () => (
    <div className="flex items-center justify-between space-x-2 py-4">
      <div className="flex-1 text-sm text-muted-foreground">
        Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, totalCount)} of {totalCount} products
      </div>
      <div className="flex items-center space-x-2">
        <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(p - 1, 1))} disabled={page === 1}>
          <ChevronLeft className="h-4 w-4" /> Previous
        </Button>
        <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(p + 1, totalPages))} disabled={page === totalPages}>
          Next <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  const columns = [
    {
      key: "image_url" as const,
      label: "Product Image",
      render: (value: string, row: any) => (
        <div className="w-20 h-20 flex items-center justify-center overflow-hidden rounded-md bg-muted">
          {row.image_url ? (
            <img src={row.image_url} alt={row.name} className="w-full h-full object-cover" />
          ) : (
            <div className="text-xs text-muted-foreground">No Image</div>
          )}
        </div>
      ),
    },
    {
      key: "name" as const,
      label: "Product Name",
      render: (value: string, row: any) => (
        <div>
          <p className="font-medium">{value}</p>
          <p className="text-sm text-muted-foreground">SKU: {row.sku}</p>
        </div>
      ),
    },
    {
      key: "category_id" as const,
      label: "Category",
      render: (value: string) => categories.find((c) => c.id === value)?.name || "-",
    },
    {
      key: "brand_id" as const,
      label: "Brand",
      render: (value: string) => brands.find((b) => b.id === value)?.name || "-",
    },
    {
      key: "selling_price" as const,
      label: "Price",
      render: (value: number) => <span className="font-semibold">{formatPKR(value)}</span>,
    },
    {
      key: "stock" as const,
      label: "Stock",
      render: (value: number, row: any) => (
        <div className="flex items-center space-x-2">
          <span className={`font-semibold ${value === 0 ? "text-destructive" : value <= row.min_stock ? "text-accent" : "text-foreground"}`}>
            {value}
          </span>
          {value === 0 && <Badge variant="destructive">Out</Badge>}
          {value > 0 && value <= row.min_stock && <Badge variant="outline">Low</Badge>}
        </div>
      ),
    },
    {
      key: "is_active" as const,
      label: "Status",
      render: (value: number) => (
        <Badge className={value === 1 ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
          {value === 1 ? "Active" : "Disabled"}
        </Badge>
      ),
    },
    {
      key: "id" as const,
      label: "Actions",
      render: (value: string, row: any) => (
        <div className="flex space-x-2">
          <Button size="sm" variant="ghost" onClick={() => handleEdit(row)} title="Edit Product">
            <Edit className="h-4 w-4" />
          </Button>
          {row.is_active === 1 ? (
            <Button size="sm" variant="ghost" onClick={() => handleDisable(value, row.name)} className="text-orange-500" title="Disable Product">
              <Trash2 className="h-4 w-4" />
            </Button>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => handleRestore(value, row.name)} className="text-green-500" title="Restore Product">
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <main className="flex-1 overflow-auto p-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Product Inventory</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setImportOpen(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Import
                </Button>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Product
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{editingProduct ? "Edit Product" : "Add New Product"}</DialogTitle>
                    </DialogHeader>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        {/* Basic Information */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold border-b pb-2">Basic Information</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <FormField control={form.control} name="name" render={({ field }) => (
                              <FormItem><FormLabel>Product Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="sku" render={({ field }) => (
                              <FormItem><FormLabel>SKU *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="barcode" render={({ field }) => (
                              <FormItem>
                                <FormLabel>Barcode</FormLabel>
                                <FormControl>
                                  <div className="flex space-x-2">
                                    <Input {...field} onChange={(e) => { field.onChange(e); setBarcodeValue(e.target.value); }} />
                                    <Input type="number" min={1} className="w-20" placeholder="Qty" value={barcodeQuantity} onChange={(e) => setBarcodeQuantity(Number(e.target.value))} />
                                    <Button type="button" onClick={handleGenerateBarcodes}>Generate</Button>
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                          </div>
                        </div>

                        {/* Classification */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold border-b pb-2">Classification</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <FormField control={form.control} name="categoryId" render={({ field }) => (
                              <FormItem><FormLabel>Category</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger></FormControl><SelectContent>{categories.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="brandId" render={({ field }) => (
                              <FormItem><FormLabel>Brand</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select brand" /></SelectTrigger></FormControl><SelectContent>{brands.map((b) => (<SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="supplierId" render={({ field }) => (
                              <FormItem><FormLabel>Supplier</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger></FormControl><SelectContent>{suppliers.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="productType" render={({ field }) => (
                              <FormItem><FormLabel>Product Type</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl><SelectContent><SelectItem value="physical">Physical</SelectItem><SelectItem value="digital">Digital</SelectItem><SelectItem value="service">Service</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                            )} />
                          </div>
                        </div>

                        {/* Pricing */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold border-b pb-2">Pricing</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <FormField control={form.control} name="costPrice" render={({ field }) => (<FormItem><FormLabel>Cost Price (PKR) *</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="sellingPrice" render={({ field }) => (<FormItem><FormLabel>Selling Price (PKR) *</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="taxRate" render={({ field }) => (<FormItem><FormLabel>Tax Rate (%)</FormLabel><FormControl><Input type="number" step="0.01" {...field} placeholder="0" /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="discount" render={({ field }) => (<FormItem><FormLabel>Discount (%)</FormLabel><FormControl><Input type="number" step="0.01" {...field} placeholder="0" /></FormControl><FormMessage /></FormItem>)} />
                          </div>
                        </div>

                        {/* Inventory & Measurement */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold border-b pb-2">Inventory & Measurement</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <FormField control={form.control} name="stock" render={({ field }) => (<FormItem><FormLabel>Stock Quantity *</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="minStock" render={({ field }) => (<FormItem><FormLabel>Minimum Stock *</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="unitOfMeasure" render={({ field }) => (<FormItem><FormLabel>Unit of Measure</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger></FormControl><SelectContent>{["piece", "kg", "gram", "liter", "ml", "dozen", "pack", "box", "meter", "cm"].map((u) => (<SelectItem key={u} value={u}>{u.charAt(0).toUpperCase() + u.slice(1)}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="weight" render={({ field }) => (<FormItem><FormLabel>Weight (kg)</FormLabel><FormControl><Input type="number" step="0.01" {...field} placeholder="0.00" /></FormControl><FormMessage /></FormItem>)} />
                          </div>
                        </div>

                        {/* Variants & Attributes */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold border-b pb-2">Variants & Attributes</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="colors" render={({ field }) => (<FormItem><FormLabel>Colors</FormLabel><FormControl><Input {...field} placeholder="Red, Blue, Green" /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="sizes" render={({ field }) => (<FormItem><FormLabel>Sizes</FormLabel><FormControl><Input {...field} placeholder="S, M, L, XL" /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="material" render={({ field }) => (<FormItem><FormLabel>Material</FormLabel><FormControl><Input {...field} placeholder="Cotton, Leather" /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="tags" render={({ field }) => (<FormItem><FormLabel>Tags</FormLabel><FormControl><Input {...field} placeholder="tag1, tag2, tag3" /></FormControl><FormMessage /></FormItem>)} />
                          </div>
                        </div>

                        {/* Media & Description */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold border-b pb-2">Media & Description</h3>
                          <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Description</FormLabel><FormControl><textarea {...field} rows={3} className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></FormControl><FormMessage /></FormItem>)} />
                          <FormItem><FormLabel>Product Images</FormLabel><FormControl><Input type="file" accept="image/*" multiple onChange={(e) => setSelectedImages(Array.from(e.target.files || []))} /></FormControl>
                            <div className="mt-3">
                              {existingImages.length > 0 && selectedImages.length === 0 && (<div><p className="text-sm text-muted-foreground mb-2">Current Images:</p><div className="flex flex-wrap gap-2">{existingImages.map((img, i) => (<img key={i} src={img} className="w-24 h-24 object-cover rounded border" />))}</div></div>)}
                              {selectedImages.length > 0 && (<div><p className="text-sm text-muted-foreground mb-2">New Images Preview:</p><div className="flex flex-wrap gap-2">{selectedImages.map((file, i) => (<img key={i} src={URL.createObjectURL(file)} className="w-24 h-24 object-cover rounded border" />))}</div></div>)}
                            </div>
                          </FormItem>
                        </div>

                        {/* Additional Information */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold border-b pb-2">Additional Information</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="warranty" render={({ field }) => (<FormItem><FormLabel>Warranty (months)</FormLabel><FormControl><Input type="number" {...field} placeholder="0" /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="expiryDate" render={({ field }) => (<FormItem><FormLabel>Expiry Date</FormLabel><FormControl><Input type="date" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="manufacturer" render={({ field }) => (<FormItem><FormLabel>Manufacturer</FormLabel><FormControl><Input {...field} placeholder="Manufacturer name" /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="countryOfOrigin" render={({ field }) => (<FormItem><FormLabel>Country of Origin</FormLabel><FormControl><Input {...field} placeholder="Country" /></FormControl><FormMessage /></FormItem>)} />
                          </div>
                          <FormField control={form.control} name="isActive" render={({ field }) => (<FormItem className="flex flex-row items-start space-x-3 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><div className="space-y-1 leading-none"><FormLabel>Product is active</FormLabel></div></FormItem>)} />
                        </div>

                        <div className="flex justify-end space-x-2 pt-4 border-t">
                          <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                          <Button type="button" onClick={fillDemoProduct}>Demo</Button>
                          <Button type="submit" disabled={createProductMutation.isPending || updateProductMutation.isPending}>Save</Button>
                        </div>
                      </form>
                    </Form>

                    {/* Barcode Modal */}
                    <Dialog open={barcodeModalOpen} onOpenChange={setBarcodeModalOpen}>
                      <DialogContent><DialogHeader><DialogTitle>Generated Barcodes</DialogTitle></DialogHeader><div className="grid grid-cols-3 gap-4 max-h-96 overflow-y-auto p-4">{generatedBarcodes.map((code, idx) => (<div key={idx} className="flex flex-col items-center border rounded p-2"><ReactBarcode value={code} options={{ format: "CODE128" }} /><p className="text-xs mt-1">{code}</p></div>))}</div><div className="flex justify-end space-x-2 mt-4"><Button variant="outline" onClick={() => setBarcodeModalOpen(false)}>Cancel</Button><Button variant="outline" onClick={handleDownloadPDF}>Download PDF</Button><Button onClick={handlePrint}>Print</Button></div></DialogContent>
                    </Dialog>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
              <Input placeholder="Search products..." value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
              <Select value={filters.categoryId || "all"} onValueChange={(v) => setFilters({ ...filters, categoryId: v === "all" ? "" : v })}><SelectTrigger><SelectValue placeholder="All Categories" /></SelectTrigger><SelectContent><SelectItem value="all">All Categories</SelectItem>{categories.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}</SelectContent></Select>
              <Select value={filters.brandId || "all"} onValueChange={(v) => setFilters({ ...filters, brandId: v === "all" ? "" : v })}><SelectTrigger><SelectValue placeholder="All Brands" /></SelectTrigger><SelectContent><SelectItem value="all">All Brands</SelectItem>{brands.map((b) => (<SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>))}</SelectContent></Select>
              <Select value={filters.supplierId || "all"} onValueChange={(v) => setFilters({ ...filters, supplierId: v === "all" ? "" : v })}><SelectTrigger><SelectValue placeholder="All Suppliers" /></SelectTrigger><SelectContent><SelectItem value="all">All Suppliers</SelectItem>{suppliers.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}</SelectContent></Select>
              <Select value={filters.productType || "all"} onValueChange={(v) => setFilters({ ...filters, productType: v === "all" ? "" : v })}><SelectTrigger><SelectValue placeholder="All Types" /></SelectTrigger><SelectContent><SelectItem value="all">All Types</SelectItem><SelectItem value="physical">Physical</SelectItem><SelectItem value="digital">Digital</SelectItem><SelectItem value="service">Service</SelectItem></SelectContent></Select>
              <Select value={filters.stockStatus} onValueChange={(v) => setFilters({ ...filters, stockStatus: v, inStock: v === "inStock", outOfStock: v === "outOfStock", lowStock: v === "lowStock" })}><SelectTrigger><SelectValue placeholder="Stock Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Stock</SelectItem><SelectItem value="inStock">In Stock</SelectItem><SelectItem value="outOfStock">Out of Stock</SelectItem><SelectItem value="lowStock">Low Stock</SelectItem></SelectContent></Select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
              <div className="flex space-x-2"><Input placeholder="Min Price" type="number" value={filters.minPrice} onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })} /><Input placeholder="Max Price" type="number" value={filters.maxPrice} onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })} /></div>
              <div className="flex space-x-2"><Input placeholder="Min Stock" type="number" value={filters.minStock} onChange={(e) => setFilters({ ...filters, minStock: e.target.value })} /><Input placeholder="Max Stock" type="number" value={filters.maxStock} onChange={(e) => setFilters({ ...filters, maxStock: e.target.value })} /></div>
              <Select value={filters.isActive === undefined ? "all" : filters.isActive ? "active" : "inactive"} onValueChange={(v) => setFilters({ ...filters, isActive: v === "all" ? undefined : v === "active" })}><SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="active">Active Only</SelectItem><SelectItem value="inactive">Disabled Only</SelectItem></SelectContent></Select>
              <Select value={filters.sortBy} onValueChange={(v) => setFilters({ ...filters, sortBy: v })}><SelectTrigger><SelectValue placeholder="Sort By" /></SelectTrigger><SelectContent><SelectItem value="created_at">Newest</SelectItem><SelectItem value="name">Name</SelectItem><SelectItem value="selling_price">Price</SelectItem><SelectItem value="stock">Stock</SelectItem></SelectContent></Select>
              <Button variant="outline" onClick={() => setFilters({ search: "", categoryId: "", brandId: "", supplierId: "", productType: "", stockStatus: "all", minPrice: "", maxPrice: "", minStock: "", maxStock: "", isActive: undefined, sortBy: "created_at", sortOrder: "desc", inStock: false, outOfStock: false, lowStock: false })}>Clear Filters</Button>
            </div>

            {/* Import Dialog */}
            <Dialog open={importOpen} onOpenChange={setImportOpen}><DialogContent><DialogHeader><DialogTitle>Import Products</DialogTitle></DialogHeader><div className="space-y-4"><div><Label>From URL</Label><Input placeholder="https://example.com/products.csv" value={importUrl} onChange={(e) => setImportUrl(e.target.value)} /></div><div><Label>From Computer</Label><Input type="file" accept=".csv,.xlsx" onChange={(e) => setImportFile(e.target.files?.[0] || null)} /></div></div><DialogFooter><Button variant="outline" onClick={() => setImportOpen(false)}>Cancel</Button><Button onClick={handleImport}>Import</Button></DialogFooter></DialogContent></Dialog>

            {/* Data Table */}
            {isLoading ? (<div className="flex items-center justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /><span className="ml-2">Loading products...</span></div>) : (<><DataTable data={paginatedProducts} columns={columns} searchPlaceholder="Search products..." onExport={handleExport} /><PaginationControls /></>)}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}