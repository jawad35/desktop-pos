import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Truck, Phone, Mail, MapPin, User, Car, Keyboard, ChevronLeft, ChevronRight } from "lucide-react";
import { useHeader } from "@/contexts/HeaderContext";
import { api } from "../services/electron-api";
import { z } from "zod";
import { KeyboardShortcutsModal } from "../components/modals/KeyboardShortcutsModal";
import { useLocation } from "wouter";
import { format } from "date-fns";
// Storage keys
const STORAGE_KEYS = {
  SUPPLIERS_PAGE: 'suppliers_current_page',
  SUPPLIERS_FILTERS: 'suppliers_filters',
  SUPPLIERS_SCROLL_POSITION: 'suppliers_scroll_position'
};

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
  const pageSize = 50;
  const [location] = useLocation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const { toast } = useToast();
  const [formErrors, setFormErrors] = useState({
    name: '',
    phone: '',
    city: '',
    address: '',
    vehicleInfo: '',
  });

  // Load saved state
  const loadSavedPage = () => {
    try {
      const savedPage = localStorage.getItem(STORAGE_KEYS.SUPPLIERS_PAGE);
      const page = savedPage ? parseInt(savedPage, 10) : 1;
      return isNaN(page) ? 1 : Math.max(1, page);
    } catch (error) {
      return 1;
    }
  };

  const loadSavedFilters = () => {
    try {
      const savedFilters = localStorage.getItem(STORAGE_KEYS.SUPPLIERS_FILTERS);
      if (savedFilters) {
        const parsed = JSON.parse(savedFilters);
        return {
          search: parsed.search || "",
          status: parsed.status || "all",  // Add this
        };
      }
    } catch (error) { }
    return {
      search: "",
      status: "all",  // Add this
    };
  };


  const [filters, setFilters] = useState(loadSavedFilters);
  const [currentPage, setCurrentPage] = useState(loadSavedPage);
  const [allSuppliersData, setAllSuppliersData] = useState<Supplier[]>([]);
  const [renderKey, setRenderKey] = useState(0);

  const mainContentRef = useRef<HTMLDivElement>(null);
  const isFirstLoadRef = useRef(true);

  // Fetch suppliers
  const { isLoading, refetch } = useQuery<Supplier[]>({
    queryKey: ["suppliers", location],
    queryFn: async () => {
      const result = await api.getSuppliers();
      let allSuppliers: Supplier[] = [];

      if (Array.isArray(result)) {
        allSuppliers = result;
      } else if (result?.success && Array.isArray(result.data)) {
        allSuppliers = result.data;
      }

      allSuppliers.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setAllSuppliersData(allSuppliers);
      setRenderKey(prev => prev + 1);
      return allSuppliers;
    },
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 0,
    cacheTime: 0,
  });

  // Apply filters
  const filteredData = useMemo(() => {
    if (allSuppliersData.length === 0) return [];

    let filtered = [...allSuppliersData];

    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(supplier =>
        supplier.name?.toLowerCase().includes(search) ||
        supplier.phone?.toLowerCase().includes(search) ||
        supplier.city?.toLowerCase().includes(search) ||
        supplier.selling?.toLowerCase().includes(search)
      );
    }

    // Add status filter
    if (filters.status && filters.status !== 'all') {
      filtered = filtered.filter(supplier =>
        filters.status === 'active' ? supplier.is_active === 1 : supplier.is_active === 0
      );
    }

    return filtered;
  }, [allSuppliersData, filters]);

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
      localStorage.setItem(STORAGE_KEYS.SUPPLIERS_PAGE, currentPage.toString());
      localStorage.setItem(STORAGE_KEYS.SUPPLIERS_FILTERS, JSON.stringify(filters));
    }
  }, [currentPage, filters]);

  // Restore scroll position
  useEffect(() => {
    if (!isLoading && paginatedData.length > 0 && mainContentRef.current && !isFirstLoadRef.current) {
      const savedScrollPosition = localStorage.getItem(STORAGE_KEYS.SUPPLIERS_SCROLL_POSITION);
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
      localStorage.setItem(STORAGE_KEYS.SUPPLIERS_SCROLL_POSITION, mainContentRef.current.scrollTop.toString());
    }
  }, []);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleShortcuts = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      // Ctrl + A - Add Supplier
      if (e.ctrlKey && e.key === 'a') {
        e.preventDefault();
        e.stopPropagation();
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
      // Ctrl + C - Clear Filters
      if (e.ctrlKey && e.key === 'c') {
        e.preventDefault();
        e.stopPropagation();
        setFilters({ search: "" });
        setCurrentPage(1);
        // Also clear the search input field if it has focus
        const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.value = "";
        }
        toast({ title: "Filters Cleared", description: "Search filter has been cleared" });
        return;
      }

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
      const supplierWithIds = {
        ...data,
        user_id: 'system',
        shop_id: 'default'
      };
      const result = await api.createSupplier(supplierWithIds);
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
    const newErrors = {
      name: '',
      phone: '',
      city: '',
      address: '',
      vehicleInfo: ''
    };

    let hasError = false;

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
      const headers = ['Name', 'Selling', 'Phone', 'Email', 'Address', 'City', 'Vehicle Info', 'Status'];
      const csvRows = [headers];

      for (const supplier of filteredData) {
        csvRows.push([
          `"${supplier.name || ''}"`,
          `"${supplier.selling || ''}"`,
          `"${supplier.phone || ''}"`,
          `"${supplier.email || ''}"`,
          `"${supplier.address || ''}"`,
          `"${supplier.city || ''}"`,
          `"${supplier.vehicle_info || ''}"`,
          supplier.is_active ? 'Active' : 'Inactive'
        ]);
      }

      const csvContent = csvRows.map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `suppliers_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({ title: "Export Successful", description: `Exported ${filteredData.length} suppliers to CSV` });
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

  const { setTitle, setSubtitle } = useHeader();

  useEffect(() => {
    setTitle("Suppliers");
    setSubtitle("Manage your supplier network");
  }, []);

  return (
    <div className="flex-1 flex flex-col overflow-hidden" key={renderKey}>
      <main
        ref={mainContentRef}
        className="flex-1 overflow-auto p-6"
        onScroll={handleScroll}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <CardTitle>Supplier Directory</CardTitle>
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
                    localStorage.removeItem(STORAGE_KEYS.SUPPLIERS_PAGE);
                    localStorage.removeItem(STORAGE_KEYS.SUPPLIERS_FILTERS);
                    localStorage.removeItem(STORAGE_KEYS.SUPPLIERS_SCROLL_POSITION);
                    setFilters({ search: "", status: "all" });
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
                    <Button>
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
                                    onChange={(e) => {
                                      field.onChange(e);
                                      if (formErrors.name) {
                                        setFormErrors(prev => ({ ...prev, name: '' }));
                                      }
                                    }}
                                  />
                                </FormControl>
                                {formErrors.name && <p className="text-sm font-medium text-destructive">{formErrors.name}</p>}
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
                                  <Input {...field} placeholder="What Supplier Sell" />
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
                                    onChange={(e) => {
                                      field.onChange(e);
                                      if (formErrors.phone) {
                                        setFormErrors(prev => ({ ...prev, phone: '' }));
                                      }
                                    }}
                                  />
                                </FormControl>
                                {formErrors.phone && <p className="text-sm font-medium text-destructive">{formErrors.phone}</p>}
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
                                  <Input type="email" {...field} placeholder="Enter email address" />
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
                                    onChange={(e) => {
                                      field.onChange(e);
                                      if (formErrors.city) {
                                        setFormErrors(prev => ({ ...prev, city: '' }));
                                      }
                                    }}
                                  />
                                </FormControl>
                                {formErrors.city && <p className="text-sm font-medium text-destructive">{formErrors.city}</p>}
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
                                    onChange={(e) => {
                                      field.onChange(e);
                                      if (formErrors.vehicleInfo) {
                                        setFormErrors(prev => ({ ...prev, vehicleInfo: '' }));
                                      }
                                    }}
                                  />
                                </FormControl>
                                {formErrors.vehicleInfo && <p className="text-sm font-medium text-destructive">{formErrors.vehicleInfo}</p>}
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
                                  onChange={(e) => {
                                    field.onChange(e);
                                    if (formErrors.address) {
                                      setFormErrors(prev => ({ ...prev, address: '' }));
                                    }
                                  }}
                                />
                              </FormControl>
                              {formErrors.address && <p className="text-sm font-medium text-destructive">{formErrors.address}</p>}
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="flex justify-end space-x-2">
                          <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button type="submit" disabled={createSupplierMutation.isPending || updateSupplierMutation.isPending}>
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
            </div>
          </CardHeader>
          <CardContent>
            {/* Search Bar */}
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <Input
                placeholder="Search suppliers by name, phone, city or selling... (Ctrl+F)"
                value={filters.search || ""}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="flex-1"
              />
              <Select
                value={filters.status || "all"}
                onValueChange={(value) => setFilters({ ...filters, status: value })}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active Only</SelectItem>
                  <SelectItem value="inactive">Inactive Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Results count */}
            <div className="mb-4 text-sm text-muted-foreground">
              {filteredData.length > 0 ? (
                `Showing ${startIndex} to ${endIndex} of ${filteredData.length} suppliers`
              ) : (
                !isLoading && "No suppliers found"
              )}
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-2 text-muted-foreground">Loading suppliers...</span>
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
                          paginatedData.map((supplier: Supplier, index: number) => (
                            <tr key={supplier.id} className={`border-b hover:bg-muted/30 transition-colors ${index % 2 === 0 ? 'bg-background' : 'bg-muted/10'}`}>
                              {columns.map((column) => (
                                <td key={column.key} className="p-3">
                                  {column.render(supplier[column.key as keyof Supplier] as any, supplier)}
                                </td>
                              ))}
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={columns.length} className="text-center p-8 text-muted-foreground">
                              No suppliers found.
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
        title="Suppliers Page Shortcuts"
        shortcuts={[
          { key: "Ctrl + A", description: "Add New Supplier" },
          { key: "Ctrl + E", description: "Export Suppliers" },
          { key: "Ctrl + C", description: "Clear Search Filter" },
          { key: "Ctrl + F", description: "Focus Search Bar" },
          { key: "←", description: "Previous Page" },
          { key: "→", description: "Next Page" },
        ]}
      />
    </div>
  );
}