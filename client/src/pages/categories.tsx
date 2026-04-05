import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { api } from "../services/electron-api";
import { Category, Brand } from "@/types/api";
import {
  Plus,
  Edit,
  Trash2,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Building,
  Tags
} from "lucide-react";
import { useHeader } from "@/contexts/HeaderContext";
import { z } from "zod";

const insertCategorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  description: z.string().optional(),
  parentId: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
});

const insertBrandSchema = z.object({
  name: z.string().min(1, "Brand name is required"),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

export default function Categories() {
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [brandDialogOpen, setBrandDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  // Fetch categories
  const { data: categories = [], isLoading: categoriesLoading, refetch: refetchCategories } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      const result = await api.getCategories();
      if (Array.isArray(result)) return result;
      if (result?.success && Array.isArray(result.data)) return result.data;
      return [];
    },
  });

  // Fetch brands
  const { data: brands = [], isLoading: brandsLoading, refetch: refetchBrands } = useQuery<Brand[]>({
    queryKey: ["brands"],
    queryFn: async () => {
      const result = await api.getBrands();
      if (Array.isArray(result)) return result;
      if (result?.success && Array.isArray(result.data)) return result.data;
      return [];
    },
  });

  // Category Form
  const categoryForm = useForm({
    resolver: zodResolver(insertCategorySchema),
    defaultValues: {
      name: "",
      description: "",
      parentId: null,
      isActive: true,
    },
  });

  // Brand Form
  const brandForm = useForm({
    resolver: zodResolver(insertBrandSchema),
    defaultValues: {
      name: "",
      description: "",
      isActive: true,
    },
  });

  // ========== CATEGORY MUTATIONS ==========
  const createCategoryMutation = useMutation({
    mutationFn: async (data: any) => {
      const result = await api.createCategory(data);
      if (result?.success && result.data) return result.data;
      if (result?.id) return result;
      return result;
    },
    onSuccess: () => {
      toast({ title: "Category Created" });
      refetchCategories();
      setCategoryDialogOpen(false);
      categoryForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const updateData = {
        name: data.name,
        description: data.description,
        parentId: data.parentId === "none" || data.parentId === "" ? null : data.parentId,
        isActive: data.isActive
      };
      const result = await api.updateCategory(id, updateData);
      if (!result) throw new Error("Failed to update category");
      return result;
    },
    onSuccess: () => {
      toast({ title: "Category Updated" });
      refetchCategories();
      setCategoryDialogOpen(false);
      setEditingCategory(null);
      categoryForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await api.deleteCategory(id);
      if (!result) throw new Error("Failed to delete category");
      return result;
    },
    onSuccess: () => {
      toast({ title: "Category Deleted", description: "All child categories were also deleted" });
      refetchCategories();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // ========== BRAND MUTATIONS ==========
  const createBrandMutation = useMutation({
    mutationFn: async (data: any) => {
      const result = await api.createBrand(data);
      if (!result) throw new Error("Failed to create brand");
      return result;
    },
    onSuccess: () => {
      toast({ title: "Brand Created" });
      refetchBrands();
      setBrandDialogOpen(false);
      brandForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateBrandMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const result = await api.updateBrand(id, data);
      if (!result) throw new Error("Failed to update brand");
      return result;
    },
    onSuccess: () => {
      toast({ title: "Brand Updated" });
      refetchBrands();
      setBrandDialogOpen(false);
      setEditingBrand(null);
      brandForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteBrandMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await api.deleteBrand(id);
      if (!result) throw new Error("Failed to delete brand");
      return result;
    },
    onSuccess: () => {
      toast({ title: "Brand Deleted" });
      refetchBrands();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // ========== CATEGORY HANDLERS ==========
  const onCategorySubmit = (data: any) => {
    const transformedData = {
      name: data.name,
      description: data.description || "",
      parentId: data.parentId === "none" || data.parentId === "" ? null : data.parentId,
      isActive: data.isActive,
      user_id: "system",
      shop_id: "default"
    };

    if (editingCategory) {
      updateCategoryMutation.mutate({ id: editingCategory.id, data: transformedData });
    } else {
      createCategoryMutation.mutate(transformedData);
    }
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    categoryForm.reset({
      name: category.name,
      description: category.description || "",
      parentId: category.parent_id || "none",
      isActive: category.is_active === 1,
    });
    setCategoryDialogOpen(true);
  };

  const handleDeleteCategory = (id: string, hasChildren: boolean) => {
    const message = hasChildren 
      ? "This category has child categories. Deleting it will also delete ALL child categories. Are you sure?"
      : "Are you sure you want to delete this category?";
    if (confirm(message)) {
      deleteCategoryMutation.mutate(id);
    }
  };

  const toggleCategoryExpansion = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  // Get available parent categories (exclude current category and its children when editing)
  const getAvailableParents = () => {
    if (!editingCategory) return categories;
    
    const getDescendantIds = (catId: string): string[] => {
      const children = categories.filter(c => c.parent_id === catId);
      let ids = [catId];
      children.forEach(child => {
        ids = [...ids, ...getDescendantIds(child.id)];
      });
      return ids;
    };
    
    const excludeIds = getDescendantIds(editingCategory.id);
    return categories.filter(cat => !excludeIds.includes(cat.id));
  };

  const renderCategoryTree = (parentId: string | null = null, level = 0) => {
    const children = categories.filter(cat => (cat.parent_id ?? null) === parentId);
    
    return children.map((category) => {
      const hasChildren = categories.some(cat => cat.parent_id === category.id);
      const isExpanded = expandedCategories.has(category.id);
      
      return (
        <div key={category.id} className="border border-border rounded-lg mb-2">
          <div className="flex items-center justify-between p-3 hover:bg-muted/50">
            <div 
              className="flex items-center flex-1 cursor-pointer"
              onClick={() => hasChildren && toggleCategoryExpansion(category.id)}
            >
              <div style={{ marginLeft: `${level * 20}px` }} className="flex items-center space-x-2">
                {hasChildren ? (
                  isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )
                ) : (
                  <div className="w-4" />
                )}
                {isExpanded ? (
                  <FolderOpen className="h-5 w-5 text-primary" />
                ) : (
                  <Folder className="h-5 w-5 text-primary" />
                )}
                <span className="font-medium">{category.name}</span>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button size="sm" variant="ghost" onClick={() => handleEditCategory(category)}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => handleDeleteCategory(category.id, hasChildren)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {hasChildren && isExpanded && (
            <div className="pb-2">
              {renderCategoryTree(category.id, level + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  // ========== BRAND HANDLERS ==========
  const onBrandSubmit = (data: any) => {
    const transformedData = {
      name: data.name,
      description: data.description || "",
      isActive: data.isActive,
      user_id: "system",
      shop_id: "default"
    };

    if (editingBrand) {
      updateBrandMutation.mutate({ id: editingBrand.id, data: transformedData });
    } else {
      createBrandMutation.mutate(transformedData);
    }
  };

  const handleEditBrand = (brand: Brand) => {
    setEditingBrand(brand);
    brandForm.reset({
      name: brand.name,
      description: brand.description || "",
      isActive: brand.is_active === 1,
    });
    setBrandDialogOpen(true);
  };

  const handleDeleteBrand = (id: string) => {
    if (confirm("Are you sure you want to delete this brand?")) {
      deleteBrandMutation.mutate(id);
    }
  };

  const { setTitle, setSubtitle } = useHeader();

  useEffect(() => {
    setTitle("Category & Brand Management");
    setSubtitle("Organize your products with categories and brands");
  }, [setTitle, setSubtitle]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <main className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* ========== CATEGORY MANAGEMENT ========== */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <Tags className="h-5 w-5 mr-2" />
                  Category Hierarchy
                </CardTitle>
                <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => { setEditingCategory(null); categoryForm.reset({ name: "", description: "", parentId: null, isActive: true }); }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Category
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {editingCategory ? "Edit Category" : "Add New Category"}
                      </DialogTitle>
                    </DialogHeader>
                    <Form {...categoryForm}>
                      <form onSubmit={categoryForm.handleSubmit(onCategorySubmit)} className="space-y-4">
                        <FormField
                          control={categoryForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Category Name *</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Enter category name" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={categoryForm.control}
                          name="parentId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Parent Category (Optional)</FormLabel>
                              <Select
                                onValueChange={(val) => field.onChange(val === "none" ? null : val)}
                                value={field.value || "none"}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select parent category" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="none">None (Root Category)</SelectItem>
                                  {getAvailableParents().map((cat) => (
                                    <SelectItem key={cat.id} value={cat.id}>
                                      {cat.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={categoryForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Textarea {...field} rows={3} placeholder="Optional description" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="flex justify-end space-x-2">
                          <Button type="button" variant="outline" onClick={() => setCategoryDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button type="submit" disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}>
                            {createCategoryMutation.isPending || updateCategoryMutation.isPending
                              ? "Saving..."
                              : editingCategory
                                ? "Update Category"
                                : "Create Category"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {categoriesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <span className="ml-2 text-muted-foreground">Loading categories...</span>
                </div>
              ) : categories.length === 0 ? (
                <div className="text-center py-8">
                  <Tags className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No categories found</p>
                  <p className="text-sm text-muted-foreground">Click "Add Category" to create your first category</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {renderCategoryTree(null)}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ========== BRAND MANAGEMENT ========== */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <Building className="h-5 w-5 mr-2" />
                  Brand Management
                </CardTitle>
                <Dialog open={brandDialogOpen} onOpenChange={setBrandDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => { setEditingBrand(null); brandForm.reset({ name: "", description: "", isActive: true }); }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Brand
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {editingBrand ? "Edit Brand" : "Add New Brand"}
                      </DialogTitle>
                    </DialogHeader>
                    <Form {...brandForm}>
                      <form onSubmit={brandForm.handleSubmit(onBrandSubmit)} className="space-y-4">
                        <FormField
                          control={brandForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Brand Name *</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Enter brand name" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={brandForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Textarea {...field} rows={3} placeholder="Optional description" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="flex justify-end space-x-2">
                          <Button type="button" variant="outline" onClick={() => setBrandDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button type="submit" disabled={createBrandMutation.isPending || updateBrandMutation.isPending}>
                            {createBrandMutation.isPending || updateBrandMutation.isPending
                              ? "Saving..."
                              : editingBrand
                                ? "Update Brand"
                                : "Create Brand"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {brandsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <span className="ml-2 text-muted-foreground">Loading brands...</span>
                </div>
              ) : brands.length === 0 ? (
                <div className="text-center py-8">
                  <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No brands found</p>
                  <p className="text-sm text-muted-foreground">Click "Add Brand" to create your first brand</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {brands.map((brand: Brand) => (
                    <div
                      key={brand.id}
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                          <Building className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{brand.name}</p>
                          {brand.description && (
                            <p className="text-xs text-muted-foreground mt-1">{brand.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button size="sm" variant="ghost" onClick={() => handleEditBrand(brand)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDeleteBrand(brand.id)} className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}