import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Truck, Phone, Mail, MapPin, User, Car } from "lucide-react";
import { useHeader } from "@/contexts/HeaderContext";
import { api } from "../services/electron-api";
import { z } from "zod";

// Define the supplier schema locally for validation
const insertSupplierSchema = z.object({
  name: z.string().min(1, "Name is required"),
  selling: z.string().optional(),
  phone: z.string().min(1, "Phone is required"),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  vehicleInfo: z.string().min(1, "Vehicle info is required"),
  isActive: z.boolean().default(true),
});

type Supplier = {
  id: string;
  name: string;
  selling: string | null;
  phone: string;
  email: string | null;
  address: string;
  city: string;
  vehicle_info: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
};

export default function Suppliers() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const { toast } = useToast();
  const [formErrors, setFormErrors] = useState({
    name: '',
    phone: '',
    city: '',
    address: '',
    vehicleInfo: '',
  });

  // Fetch suppliers using the api service
// Fetch suppliers using the api service
const { data: suppliers = [], isLoading, refetch } = useQuery<Supplier[]>({
  queryKey: ["suppliers"],
  queryFn: async () => {
    const result = await api.getSuppliers();
    // Handle both response formats
    if (Array.isArray(result)) return result;
    if (result?.success && Array.isArray(result.data)) return result.data;
    return [];
  },
});

  const form = useForm({
    resolver: zodResolver(insertSupplierSchema),
    defaultValues: {
      name: "",
      selling: "",
      phone: "",
      email: "",
      address: "",
      city: "",
      vehicleInfo: "",
      isActive: true,
    },
  });

const createSupplierMutation = useMutation({
  mutationFn: async (data: any) => {
    // Add required userId and shopId
    const supplierWithIds = {
      ...data,
      user_id: 'system',
      shop_id: 'default'
    };
    const result = await api.createSupplier(supplierWithIds);
    // Handle response
    if (result?.success) return result.data;
    return result;
  },
  onSuccess: () => {
    toast({ title: "Supplier Created", description: "Supplier has been created successfully" });
    refetch();
    setDialogOpen(false);
    form.reset();
  },
  onError: (error: Error) => {
    toast({ title: "Error", description: error.message, variant: "destructive" });
  },
});

  const updateSupplierMutation = useMutation({
  mutationFn: async ({ id, data }: { id: string; data: any }) => {
    const result = await api.updateSupplier(id, data);
    if (result?.success) return result.data;
    return result;
  },
  onSuccess: () => {
    toast({ title: "Supplier Updated", description: "Supplier has been updated successfully" });
    refetch();
    setDialogOpen(false);
    setEditingSupplier(null);
    form.reset();
  },
  onError: (error: Error) => {
    toast({ title: "Error", description: error.message, variant: "destructive" });
  },
});

 const deleteSupplierMutation = useMutation({
  mutationFn: async (id: string) => {
    const result = await api.deleteSupplier(id);
    return result?.success === true;
  },
  onSuccess: () => {
    toast({ title: "Supplier Deleted", description: "Supplier has been deleted successfully" });
    refetch();
  },
  onError: (error: Error) => {
    toast({ title: "Error", description: error.message, variant: "destructive" });
  },
});

  const onSubmit = (data: any) => {
    // Reset errors
    const newErrors = {
      name: '',
      phone: '',
      city: '',
      address: '',
      vehicleInfo: ''
    };

    let hasError = false;

    // Validate mandatory fields
    if (!data.name?.trim()) {
      newErrors.name = "Supplier name is required";
      hasError = true;
    }

    if (!data.phone?.trim()) {
      newErrors.phone = "Phone number is required";
      hasError = true;
    }

    if (!data.city?.trim()) {
      newErrors.city = "City is required";
      hasError = true;
    }

    if (!data.address?.trim()) {
      newErrors.address = "Address is required";
      hasError = true;
    }

    if (!data.vehicleInfo?.trim()) {
      newErrors.vehicleInfo = "VehicleInfo is required";
      hasError = true;
    }

    if (hasError) {
      setFormErrors(newErrors);
      return;
    }

    // Clear errors if validation passes
    setFormErrors({ name: '', phone: '', city: '', address: '', vehicleInfo: '' });

    if (editingSupplier) {
      updateSupplierMutation.mutate({ id: editingSupplier.id, data });
    } else {
      createSupplierMutation.mutate(data);
    }
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    form.reset({
      name: supplier.name,
      selling: supplier.selling || "",
      phone: supplier.phone || "",
      email: supplier.email || "",
      address: supplier.address || "",
      city: supplier.city || "",
      vehicleInfo: supplier.vehicle_info || "",
      isActive: supplier.is_active === 1,
    });
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this supplier?")) {
      deleteSupplierMutation.mutate(id);
    }
  };

 const handleExport = async () => {
  try {
    const result = await api.getSuppliers();
    let suppliers: Supplier[] = [];
    
    // Handle both response formats
    if (Array.isArray(result)) {
      suppliers = result;
    } else if (result?.success && Array.isArray(result.data)) {
      suppliers = result.data;
    }
    
    if (suppliers.length === 0) {
      toast({ title: "No Data", description: "No suppliers to export", variant: "destructive" });
      return;
    }
    
    // Convert to CSV
    const headers = ['Name', 'Selling', 'Phone', 'Email', 'Address', 'City', 'Vehicle Info', 'Status'];
    const csvRows = [headers];
    
    for (const supplier of suppliers) {
      csvRows.push([
        supplier.name,
        supplier.selling || '',
        supplier.phone || '',
        supplier.email || '',
        supplier.address || '',
        supplier.city || '',
        supplier.vehicle_info || '',
        supplier.is_active ? 'Active' : 'Inactive'
      ]);
    }
    
    const csvContent = csvRows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'suppliers.csv';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    toast({ title: "Export Successful", description: "Suppliers data has been exported to CSV" });
  } catch (error) {
    console.error('Export failed:', error);
    toast({ title: "Export Failed", description: "Failed to export suppliers data", variant: "destructive" });
  }
};

  useEffect(() => {
    if (!dialogOpen) {
      setFormErrors({ name: '', phone: '', city: '', address: '', vehicleInfo: '' });
    }
  }, [dialogOpen]);

  const columns = [
    {
      key: 'name' as const,
      label: 'Supplier Name',
      render: (value: string, row: Supplier) => (
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <Truck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium">{value}</p>
            {row.selling && (
              <p className="text-sm text-muted-foreground flex items-center">
                <User className="h-3 w-3 mr-1" />
                {row.selling}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'phone' as const,
      label: 'Contact Info',
      render: (value: string, row: Supplier) => (
        <div className="space-y-1">
          {value && (
            <div className="flex items-center text-sm">
              <Phone className="h-3 w-3 mr-2 text-muted-foreground" />
              {value}
            </div>
          )}
          {row.email && (
            <div className="flex items-center text-sm">
              <Mail className="h-3 w-3 mr-2 text-muted-foreground" />
              {row.email}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'address' as const,
      label: 'Location',
      render: (value: string, row: Supplier) => (
        <div>
          {value && (
            <div className="flex items-start text-sm">
              <MapPin className="h-3 w-3 mr-2 text-muted-foreground mt-0.5" />
              <div>
                <p>{value}</p>
                {row.city && <p className="text-muted-foreground">{row.city}</p>}
              </div>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'vehicle_info' as const,
      label: 'Vehicle Info',
      render: (value: string | null) => (
        <div>
          {value ? (
            <div className="flex items-center text-sm">
              <Car className="h-3 w-3 mr-2 text-muted-foreground" />
              {value}
            </div>
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
        </div>
      ),
    },
    {
      key: 'is_active' as const,
      label: 'Status',
      render: (value: number) => (
        <Badge variant={value === 1 ? "default" : "secondary"}>
          {value === 1 ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: 'id' as const,
      label: 'Actions',
      render: (value: string, row: Supplier) => (
        <div className="flex space-x-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleEdit(row)}
            data-testid={`button-edit-${value}`}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleDelete(value)}
            className="text-destructive hover:text-destructive"
            data-testid={`button-delete-${value}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const { setTitle, setSubtitle } = useHeader();

  useEffect(() => {
    setTitle("Suppliers");
    setSubtitle("Manage your supplier network");
  }, [setTitle, setSubtitle]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <main className="flex-1 overflow-auto p-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Supplier Directory</CardTitle>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-supplier"
                    onClick={() => {
                      setEditingSupplier(null);
                      form.reset({
                        name: "",
                        selling: "",
                        phone: "",
                        email: "",
                        address: "",
                        city: "",
                        vehicleInfo: "",
                        isActive: true,
                      });
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Supplier
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>
                      {editingSupplier ? "Edit Supplier" : "Add New Supplier"}
                    </DialogTitle>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Supplier Name *</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  placeholder="Enter supplier name"
                                  data-testid="input-supplier-name"
                                  onChange={(e) => {
                                    field.onChange(e);
                                    if (formErrors.name) {
                                      setFormErrors(prev => ({ ...prev, name: '' }));
                                    }
                                  }}
                                />
                              </FormControl>
                              {formErrors.name && (
                                <p className="text-sm font-medium text-destructive">{formErrors.name}</p>
                              )}
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="selling"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Selling</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  placeholder="What Supplier Sell"
                                  data-testid="input-sell"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phone Number *</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  placeholder="+92-XXX-XXXXXXX"
                                  data-testid="input-phone"
                                  onChange={(e) => {
                                    field.onChange(e);
                                    if (formErrors.phone) {
                                      setFormErrors(prev => ({ ...prev, phone: '' }));
                                    }
                                  }}
                                />
                              </FormControl>
                              {formErrors.phone && (
                                <p className="text-sm font-medium text-destructive">{formErrors.phone}</p>
                              )}
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email Address</FormLabel>
                              <FormControl>
                                <Input
                                  type="email"
                                  {...field}
                                  placeholder="Enter email address"
                                  data-testid="input-email"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="city"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>City *</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  placeholder="Enter city"
                                  data-testid="input-city"
                                  onChange={(e) => {
                                    field.onChange(e);
                                    if (formErrors.city) {
                                      setFormErrors(prev => ({ ...prev, city: '' }));
                                    }
                                  }}
                                />
                              </FormControl>
                              {formErrors.city && (
                                <p className="text-sm font-medium text-destructive">{formErrors.city}</p>
                              )}
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="vehicleInfo"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Transport Information *</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  data-testid="input-transport"
                                  onChange={(e) => {
                                    field.onChange(e);
                                    if (formErrors.vehicleInfo) {
                                      setFormErrors(prev => ({ ...prev, vehicleInfo: '' }));
                                    }
                                  }}
                                />
                              </FormControl>
                              {formErrors.vehicleInfo && (
                                <p className="text-sm font-medium text-destructive">{formErrors.vehicleInfo}</p>
                              )}
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Address *</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                rows={3}
                                data-testid="textarea-address"
                                onChange={(e) => {
                                  field.onChange(e);
                                  if (formErrors.address) {
                                    setFormErrors(prev => ({ ...prev, address: '' }));
                                  }
                                }}
                              />
                            </FormControl>
                            {formErrors.address && (
                              <p className="text-sm font-medium text-destructive">{formErrors.address}</p>
                            )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex justify-end space-x-2">
                        <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={createSupplierMutation.isPending || updateSupplierMutation.isPending}
                          data-testid="button-save-supplier"
                        >
                          {createSupplierMutation.isPending || updateSupplierMutation.isPending
                            ? "Saving..."
                            : editingSupplier
                              ? "Update Supplier"
                              : "Create Supplier"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-2 text-muted-foreground">Loading suppliers...</span>
              </div>
            ) : (
              <DataTable
                data={suppliers}
                columns={columns}
                searchPlaceholder="Search suppliers..."
                onExport={handleExport}
              />
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}