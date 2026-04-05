import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
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
import { insertCategorySchema, insertBrandSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Category, Brand, Product } from "@/types/api";
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

export default function Categories() {
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [brandDialogOpen, setBrandDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const { data: categories = [], isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  console.log(categories, 'cat123')

  const { data: brands = [], isLoading: brandsLoading } = useQuery<Brand[]>({
    queryKey: ["/api/brands"],
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const categoryForm = useForm({
    resolver: zodResolver(insertCategorySchema),
    defaultValues: {
      name: "",
      description: "",
      parentId: null,
      isActive: true,
    },
  });

  const brandForm = useForm({
    resolver: zodResolver(insertBrandSchema),
    defaultValues: {
      name: "",
      description: "",
      isActive: true,
    },
  });

  // Category mutations
  const createCategoryMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/categories", data);
    },
    onSuccess: () => {
      toast({
        title: "Category Created",
        description: "Category has been created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      setCategoryDialogOpen(false);
      categoryForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await apiRequest("PUT", `/api/categories/${id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Category Updated",
        description: "Category has been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      setCategoryDialogOpen(false);
      setEditingCategory(null);
      categoryForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/categories/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Category Deleted",
        description: "Category has been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Brand mutations
  const createBrandMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/brands", data);
    },
    onSuccess: () => {
      toast({
        title: "Brand Created",
        description: "Brand has been created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/brands"] });
      setBrandDialogOpen(false);
      brandForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateBrandMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await apiRequest("PUT", `/api/brands/${id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Brand Updated",
        description: "Brand has been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/brands"] });
      setBrandDialogOpen(false);
      setEditingBrand(null);
      brandForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteBrandMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/brands/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Brand Deleted",
        description: "Brand has been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/brands"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onCategorySubmit = (data: any) => {
    // Transform empty string to null for parentId
    const transformedData = {
      ...data,
      parentId: data.parentId === "" ? null : data.parentId
    };

    console.log(transformedData);

    if (editingCategory) {
      updateCategoryMutation.mutate({ id: editingCategory.id, data: transformedData });
    } else {
      createCategoryMutation.mutate(transformedData);
    }
  };

  const onBrandSubmit = (data: any) => {
    if (editingBrand) {
      updateBrandMutation.mutate({ id: editingBrand.id, data });
    } else {
      createBrandMutation.mutate(data);
    }
  };

  const handleEditCategory = (category: any) => {
    setEditingCategory(category);
    categoryForm.reset({
      name: category.name,
      description: category.description || "",
      parentId: category.parentId || "",
      isActive: category.isActive,
    });
    setCategoryDialogOpen(true);
  };

  const handleEditBrand = (brand: any) => {
    setEditingBrand(brand);
    brandForm.reset({
      name: brand.name,
      description: brand.description || "",
      isActive: brand.isActive,
    });
    setBrandDialogOpen(true);
  };

  const handleDeleteCategory = (id: string) => {
    if (confirm("Are you sure you want to delete this category?")) {
      deleteCategoryMutation.mutate(id);
    }
  };

  const handleDeleteBrand = (id: string) => {
    if (confirm("Are you sure you want to delete this brand?")) {
      deleteBrandMutation.mutate(id);
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

  const getProductCount = (categoryId: string) => {
    return Array.isArray(products) ? products.filter((product: any) => product.categoryId === categoryId).length : 0;
  };

  const getBrandProductCount = (brandId: string) => {
    return products?.filter((product: any) => product.brandId === brandId).length;
  };

  const renderCategoryTree = (categories: any[], parentId: string | null = null, level = 0) => {
    const filteredCategories = categories.filter(
      (cat) => (cat.parentId ?? null) === parentId
    );

    return filteredCategories.map((category) => {
      const hasChildren = categories.some(cat => cat.parentId === category.id);
      const isExpanded = expandedCategories.has(category.id);
      const productCount = getProductCount(category.id);

      return (
        <div key={category.id} className="border border-border rounded-lg mb-2">
          <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50">
            <div
              className="flex items-center flex-1"
              onClick={() => hasChildren && toggleCategoryExpansion(category.id)}
            >
              <div className="flex items-center space-x-2" style={{ marginLeft: `${level * 20}px` }}>
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
                <span className="font-medium text-foreground">{category.name}</span>
                <Badge variant="secondary">{productCount} products</Badge>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleEditCategory(category)}
                data-testid={`button-edit-category-${category.id}`}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDeleteCategory(category.id)}
                className="text-destructive hover:text-destructive"
                data-testid={`button-delete-category-${category.id}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {hasChildren && isExpanded && (
            <div className="pb-3">
              {renderCategoryTree(categories, category.id, level + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  const { setTitle, setSubtitle } = useHeader();

  useEffect(() => {
    setTitle("Category Management");
    setSubtitle("Organize your products with categories and brands");
  }, []);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <main className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Category Management */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <Tags className="h-5 w-5 mr-2" />
                  Category Hierarchy
                </CardTitle>
                <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-add-category">
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
                              <FormLabel>Category Name</FormLabel>
                              <FormControl>
                                <Input {...field} data-testid="input-category-name" />
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
                                value={field.value || "none"} // fallback to "none" if no parent
                              >
                                <FormControl>
                                  <SelectTrigger data-testid="select-parent-category">
                                    <SelectValue placeholder="Select parent category" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="none">No Parent (Root Category)</SelectItem>
                                  {categories.map((category: any) => (
                                    <SelectItem key={category.id} value={category.id}>
                                      {category.name}
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
                                <Textarea {...field} rows={3} data-testid="textarea-category-description" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="flex justify-end space-x-2">
                          <Button type="button" variant="outline" onClick={() => setCategoryDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}
                            data-testid="button-save-category"
                          >
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
                  <p className="text-sm text-muted-foreground">Create your first category to get started</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {renderCategoryTree(categories)}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Brand Management */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <Building className="h-5 w-5 mr-2" />
                  Brand Management
                </CardTitle>
                <Dialog open={brandDialogOpen} onOpenChange={setBrandDialogOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-add-brand">
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
                              <FormLabel>Brand Name</FormLabel>
                              <FormControl>
                                <Input {...field} data-testid="input-brand-name" />
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
                                <Textarea {...field} rows={3} data-testid="textarea-brand-description" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="flex justify-end space-x-2">
                          <Button type="button" variant="outline" onClick={() => setBrandDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            disabled={createBrandMutation.isPending || updateBrandMutation.isPending}
                            data-testid="button-save-brand"
                          >
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
                  <p className="text-sm text-muted-foreground">Create your first brand to get started</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {brands.map((brand: any) => {
                    const productCount = getBrandProductCount(brand.id);
                    return (
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
                            <p className="text-sm text-muted-foreground">{productCount} products</p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditBrand(brand)}
                            data-testid={`button-edit-brand-${brand.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteBrand(brand.id)}
                            className="text-destructive hover:text-destructive"
                            data-testid={`button-delete-brand-${brand.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
