import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DataTable } from "@/components/ui/data-table";
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
import { Plus, Edit, ShoppingCart, Clock, CheckCircle, AlertCircle, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { z } from "zod";
import { Purchase, Supplier } from "@/types/api";
import { useHeader } from "@/contexts/HeaderContext";
import { Textarea } from "@/components/ui/textarea";
import ItemsDescriptionCell from "@/components/purchase/ItemsDescriptionCell";

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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    supplierId: "",
    status: "",
  });
  const { toast } = useToast();

  // Fetch purchases using Electron API
  // Fetch purchases using Electron API
  const { data: purchases = [], isLoading, refetch } = useQuery<Purchase[]>({
    queryKey: ["purchases", filters],
    queryFn: async () => {
      const result = await api.getPurchases();
      // Handle both response formats
      let purchasesData: Purchase[] = [];
      if (Array.isArray(result)) {
        purchasesData = result;
      } else if (result?.success && Array.isArray(result.data)) {
        purchasesData = result.data;
      }

      // Apply filters locally
      let filteredPurchases = purchasesData;
      if (filters.supplierId) {
        filteredPurchases = filteredPurchases.filter((purchase: Purchase) =>
          purchase.supplier_id === filters.supplierId  // Changed from supplierId
        );
      }

      if (filters.status) {
        filteredPurchases = filteredPurchases.filter((purchase: Purchase) =>
          purchase.status === filters.status
        );
      }

      if (filters.startDate) {
        filteredPurchases = filteredPurchases.filter((purchase: Purchase) =>
          new Date(purchase.created_at) >= new Date(filters.startDate)
        );
      }

      if (filters.endDate) {
        filteredPurchases = filteredPurchases.filter((purchase: Purchase) =>
          new Date(purchase.created_at) <= new Date(filters.endDate)
        );
      }

      return filteredPurchases;
    },
  });

  // Fetch suppliers using Electron API
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
      // Add required user_id and shop_id with correct field names
      const purchaseWithIds = {
        ...data,
        user_id: data.user_id || 'system',  // Use user_id (not userId)
        shop_id: data.shop_id || 'default'  // Use shop_id (not shopId)
      };
      console.log('Creating purchase with data:', purchaseWithIds);
      const result = await api.createPurchase(purchaseWithIds);
      console.log('Create purchase result:', result);
      if (result?.success) return result.data;
      return result;
    },
    onSuccess: (data) => {
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
    // Send all fields that can be updated including supplier_id
    const updateData = {
      status: data.status,
      payment_status: data.paymentStatus,
      payment_method: data.paymentMethod,
      items_description: data.itemsDescription,
      subtotal: data.subtotal,
      tax: data.tax,
      total: data.total,
      supplier_id: data.supplier_id  // Add this line
    };
    console.log('Updating purchase with:', updateData);
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

  useEffect(() => {
    if (dialogOpen && !editingPurchase) {
      form.setValue('poNumber', generatePONumber());
    }
  }, [dialogOpen, editingPurchase, form]);

  const onSubmit = (data: any) => {
    if (editingPurchase) {
      // For update, send all fields that can be changed including supplier_id
      const updateData = {
        status: data.status,
        paymentStatus: data.paymentStatus,
        paymentMethod: data.paymentMethod,
        itemsDescription: data.itemsDescription,
        subtotal: parseFloat(data.subtotal),
        tax: parseFloat(data.tax || 0),
        total: parseFloat(data.total),
        supplier_id: data.supplierId  // Add this line to update supplier
      };
      updatePurchaseMutation.mutate({ id: editingPurchase.id, data: updateData });
    } else {
      // For create, send all fields
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
      const result = await api.getPurchases();
      let purchasesData: Purchase[] = [];

      // Handle both response formats
      if (Array.isArray(result)) {
        purchasesData = result;
      } else if (result?.success && Array.isArray(result.data)) {
        purchasesData = result.data;
      }

      if (purchasesData.length === 0) {
        toast({ title: "No Data", description: "No purchases to export", variant: "destructive" });
        return;
      }

      // Convert to CSV
      const headers = ['PO Number', 'Date', 'Supplier', 'Subtotal', 'Tax', 'Total', 'Status', 'Payment Status', 'Items Description'];
      const csvRows = [headers];

      for (const purchase of purchasesData) {
        const supplier = suppliers.find(s => s.id === purchase.supplierId);
        csvRows.push([
          purchase.poNumber,
          format(new Date(purchase.created_at), 'dd/MM/yyyy'),
          supplier?.name || '',
          purchase.subtotal.toString(),
          purchase.tax.toString(),
          purchase.total.toString(),
          purchase.status,
          purchase.paymentStatus,
          purchase.itemsDescription || ''
        ]);
      }

      const csvContent = csvRows.map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'purchases.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({ title: "Export Successful", description: "Purchases data has been exported to CSV" });
    } catch (error) {
      console.error('Export failed:', error);
      toast({ title: "Export Failed", description: "Failed to export purchases data", variant: "destructive" });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'bg-secondary/10 text-secondary';
      case 'pending':
        return 'bg-accent/10 text-accent';
      case 'cancelled':
        return 'bg-destructive/10 text-destructive';
      case 'overdue':
        return 'bg-destructive/10 text-destructive';
      default:
        return 'bg-muted/10 text-muted-foreground';
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
      key: 'po_number' as const,  // Changed from 'poNumber'
      label: 'PO Number',
      render: (value: string) => (
        <span className="font-medium text-primary font-mono">{value}</span>
      ),
    },
    {
      key: 'created_at' as const,
      label: 'Date',
      render: (value: string) => format(new Date(value), 'dd/MM/yyyy'),
    },
    {
      key: 'supplier_id' as const,  // Changed from 'supplierId'
      label: 'Supplier',
      render: (value: string) => {
        const supplier = suppliers.find((s: Supplier) => s.id === value);
        return supplier?.name || '-';
      },
    },
    {
      key: 'total' as const,
      label: 'Total Amount',
      render: (value: number) => (
        <span className="font-semibold data-table">{formatPKR(value)}</span>
      ),
    },
    {
      key: 'items_description' as const,  // Changed from 'itemsDescription'
      label: 'Items',
      render: (value: string, row: Purchase) => (
        <ItemsDescriptionCell description={value} />
      ),
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
      key: 'payment_status' as const,  // Changed from 'paymentStatus'
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
  const totalPurchases = purchases.reduce((sum: number, purchase: Purchase) => sum + (purchase.total || 0), 0);
  const pendingOrders = purchases.filter((purchase: Purchase) => purchase.status === 'pending');
  const deliveredOrders = purchases.filter((purchase: Purchase) => purchase.status === 'delivered');
  const overdueOrders = purchases.filter((purchase: Purchase) => purchase.status === 'overdue');

  const { setTitle, setSubtitle } = useHeader();

  useEffect(() => {
    setTitle("Purchase Management");
    setSubtitle("Manage purchase orders and supplier relationships");
  }, [setTitle, setSubtitle]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <main className="flex-1 overflow-auto p-6">
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
                  <p className="text-2xl font-bold text-accent">{pendingOrders.length}</p>
                </div>
                <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                  <Clock className="h-6 w-6 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Delivered</p>
                  <p className="text-2xl font-bold text-secondary">{deliveredOrders.length}</p>
                </div>
                <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-secondary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Overdue</p>
                  <p className="text-2xl font-bold text-destructive">{overdueOrders.length}</p>
                </div>
                <div className="w-12 h-12 bg-destructive/10 rounded-lg flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-destructive" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Purchase Orders</CardTitle>
              <div className="flex space-x-2">
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-new-purchase">
                      <Plus className="h-4 w-4 mr-2" />
                      New Purchase
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
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
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => field.onChange(generatePONumber())}
                                  data-testid="button-generate-po"
                                >
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
                                  <SelectTrigger data-testid="select-supplier">
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
                                  <Input type="number" step="0.01" {...field} data-testid="input-subtotal" />
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
                                  <Input type="number" step="0.01" {...field} data-testid="input-tax" />
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
                                <Input type="number" step="0.01" {...field} data-testid="input-total" />
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
                                  <SelectTrigger data-testid="select-payment-method">
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
                                <Textarea
                                  {...field}
                                  rows={4}
                                  placeholder="Describe items purchased (e.g. 10 boxes of smartphones, 5 laptops)"
                                  data-testid="textarea-items-description"
                                />
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
                                    <SelectTrigger data-testid="select-status">
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
                                    <SelectTrigger data-testid="select-payment-status">
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
                          <Button
                            type="submit"
                            disabled={createPurchaseMutation.isPending || updatePurchaseMutation.isPending}
                            data-testid="button-save-purchase"
                          >
                            {createPurchaseMutation.isPending || updatePurchaseMutation.isPending
                              ? "Saving..."
                              : editingPurchase
                                ? "Update Purchase"
                                : "Create Purchase"}
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div>
                <Input
                  type="date"
                  placeholder="Start Date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                  data-testid="input-filter-start-date"
                />
              </div>
              <div>
                <Input
                  type="date"
                  placeholder="End Date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                  data-testid="input-filter-end-date"
                />
              </div>

              <Select
                value={filters.supplierId || "all"}
                onValueChange={(value) =>
                  setFilters({ ...filters, supplierId: value === "all" ? "" : value })
                }
              >
                <SelectTrigger data-testid="select-filter-supplier">
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
                onValueChange={(value) =>
                  setFilters({ ...filters, status: value === "all" ? "" : value })
                }
              >
                <SelectTrigger data-testid="select-filter-status">
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

            {/* Data Table */}
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-2 text-muted-foreground">Loading purchases...</span>
              </div>
            ) : (
              <DataTable
                data={purchases}
                columns={columns}
                searchPlaceholder="Search purchase orders..."
                onExport={handleExport}
              />
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}