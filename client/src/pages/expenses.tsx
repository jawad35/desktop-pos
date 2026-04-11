import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { formatPKR } from "@/lib/currency";
import { useToast } from "@/hooks/use-toast";
import { api } from "../services/electron-api";
import { Expense } from "@/types/api";
import {
  Plus,
  Edit,
  Trash2,
  Calculator,
  Receipt,
  TrendingUp,
  ChevronRight,
  ChevronLeft,
  List,
  Banknote
} from "lucide-react";
import { format } from "date-fns";
import { useEffect } from "react";
import { useHeader } from "@/contexts/HeaderContext";
import { z } from "zod";

const EXPENSE_CATEGORIES = [
  "Utilities",
  "Rent",
  "Supplies",
  "Marketing",
  "Transportation",
  "Maintenance",
  "Insurance",
  "Staff",
  "Equipment",
  "Other"
];

const PAYMENT_METHODS = [
  "cash",
  "card",
  "bank_transfer",
  "easypaisa",
  "jazzcash",
  "check"
];

// Define the expense schema locally
const insertExpenseSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  amount: z.string().or(z.number()).transform(val => Number(val)).pipe(z.number().min(0.01, "Amount must be greater than 0")),
  category: z.string().min(1, "Category is required"),
  payment_method: z.string().min(1, "Payment method is required"),
  receiptNumber: z.string().optional(),
});

export default function Expenses() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    category: "",
    search: "",
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
  });
  const { toast } = useToast();

  // Fetch expenses using Electron API
  const { data: expenses = [], isLoading, refetch } = useQuery<Expense[]>({
    queryKey: ["expenses", filters, pagination],
    queryFn: async () => {
      console.log('=== GET EXPENSES DEBUG ===');
      const result = await api.getExpenses();
      console.log('Raw getExpenses result:', result);

      // Handle both formats: array directly or { success, data }
      let expensesData = [];
      if (Array.isArray(result)) {
        expensesData = result;
      } else if (result?.success && Array.isArray(result.data)) {
        expensesData = result.data;
      } else {
        console.error('Unexpected result format:', result);
        return [];
      }

      console.log('Expenses data array:', expensesData);
      console.log('Number of expenses:', expensesData.length);

      // Apply filters...
      let filteredExpenses = expensesData;

      if (filters.search) {
        filteredExpenses = filteredExpenses.filter((expense: Expense) =>
          expense.title.toLowerCase().includes(filters.search.toLowerCase()) ||
          (expense.description && expense.description.toLowerCase().includes(filters.search.toLowerCase()))
        );
      }

      if (filters.category && filters.category !== "all") {
        filteredExpenses = filteredExpenses.filter((expense: Expense) =>
          expense.category === filters.category
        );
      }

      if (filters.startDate) {
        filteredExpenses = filteredExpenses.filter((expense: Expense) =>
          new Date(expense.created_at) >= new Date(filters.startDate)
        );
      }

      if (filters.endDate) {
        filteredExpenses = filteredExpenses.filter((expense: Expense) =>
          new Date(expense.created_at) <= new Date(filters.endDate)
        );
      }

      return filteredExpenses;
    },
  });

  const total = expenses.length;
  const totalPages = Math.ceil(total / pagination.limit);

  // Get paginated expenses
  const paginatedExpenses = expenses.slice(
    (pagination.page - 1) * pagination.limit,
    pagination.page * pagination.limit
  );

  // Pagination Controls Component
  const PaginationControls = () => (
    <div className="flex items-center justify-between space-x-2 py-4">
      <div className="flex-1 text-sm text-muted-foreground">
        Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, total)} of {total} expenses
      </div>
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPagination(prev => ({ ...prev, page: Math.max(prev.page - 1, 1) }))}
          disabled={pagination.page === 1}
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        <div className="flex items-center space-x-1">
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum;
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (pagination.page <= 3) {
              pageNum = i + 1;
            } else if (pagination.page >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
            } else {
              pageNum = pagination.page - 2 + i;
            }

            return (
              <Button
                key={pageNum}
                variant={pagination.page === pageNum ? "default" : "outline"}
                size="sm"
                onClick={() => setPagination(prev => ({ ...prev, page: pageNum }))}
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
          onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.page + 1, totalPages) }))}
          disabled={pagination.page === totalPages}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  const form = useForm({
    resolver: zodResolver(insertExpenseSchema),
    defaultValues: {
      title: "",
      description: "",
      amount: "",
      category: EXPENSE_CATEGORIES[0],
      payment_method: PAYMENT_METHODS[0],
      receiptNumber: "",
    },
  });

  const createExpenseMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log('Sending expense data:', data);
      const result = await api.createExpense(data);
      console.log('Create expense result:', result);

      // The result already has success property, just return it
      if (!result || !result.success) {
        throw new Error(result?.error || 'Failed to create expense');
      }
      return result;
    },
    onSuccess: () => {
      toast({
        title: "Expense Added",
        description: "Expense has been added successfully",
      });
      refetch();
      setDialogOpen(false);
      form.reset({
        title: "",
        description: "",
        amount: "",
        category: EXPENSE_CATEGORIES[0],
        payment_method: PAYMENT_METHODS[0],
        receiptNumber: "",
      });
    },
    onError: (error: Error) => {
      console.error('Mutation error:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  const updateExpenseMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      // Use updateExpense API, not createExpense
      const result = await api.updateExpense(id, data);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result;
    },
    onSuccess: () => {
      toast({
        title: "Expense Updated",
        description: "Expense has been updated successfully",
      });
      refetch();
      setDialogOpen(false);
      setEditingExpense(null);
      form.reset({
        title: "",
        description: "",
        amount: "",
        category: EXPENSE_CATEGORIES[0],
        payment_method: PAYMENT_METHODS[0],
        receiptNumber: "",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  const deleteExpenseMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await api.deleteExpense(id);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result;
    },
    onSuccess: () => {
      toast({
        title: "Expense Deleted",
        description: "Expense has been deleted successfully",
      });
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  const onSubmit = (data: any) => {
    form.trigger().then(isValid => {
      if (!isValid) {
        toast({
          title: "Validation Error",
          description: "Please fix the highlighted errors before submitting",
          variant: "destructive",
        });
        return;
      }

      const expenseData = {
        ...data,
        amount: parseFloat(data.amount),
        user_id: "system",
        shop_id: "default"
      };

      if (editingExpense) {
        updateExpenseMutation.mutate({ id: editingExpense.id, data: expenseData });
      } else {
        createExpenseMutation.mutate(expenseData);
      }
    });
  };

  useEffect(() => {
    const subscription = form.watch((value, { name, type }) => {
      if (name && form.formState.errors[name as keyof typeof form.formState.errors]) {
        form.clearErrors(name as any);
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    form.reset({
      title: expense.title,
      description: expense.description || "",
      amount: expense.amount.toString(),
      category: expense.category,
      payment_method: expense.payment_method || "cash",
      receiptNumber: expense.receiptNumber || "",
    });
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this expense?")) {
      deleteExpenseMutation.mutate(id);
    }
  };

  const handleExport = async () => {
    try {
      const result = await api.getExpenses();
      if (result.success && result.data) {
        const expenses = result.data;

        // Convert to CSV
        const headers = ['Date', 'Title', 'Description', 'Category', 'Amount', 'Payment Method', 'Receipt Number'];
        const csvRows = [headers];

        for (const expense of expenses) {
          csvRows.push([
            format(new Date(expense.created_at), 'dd/MM/yyyy HH:mm'),
            expense.title,
            expense.description || '',
            expense.category,
            expense.amount.toString(),
            expense.payment_method || 'cash',
            expense.receiptNumber || ''
          ]);
        }

        const csvContent = csvRows.map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'expenses.csv';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast({
          title: "Export Successful",
          description: "Expenses data has been exported to CSV",
        });
      }
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export expenses data",
        variant: "destructive",
      });
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      "Utilities": "bg-blue-100 text-blue-800",
      "Rent": "bg-green-100 text-green-800",
      "Supplies": "bg-purple-100 text-purple-800",
      "Marketing": "bg-pink-100 text-pink-800",
      "Transportation": "bg-yellow-100 text-yellow-800",
      "Maintenance": "bg-orange-100 text-orange-800",
      "Insurance": "bg-red-100 text-red-800",
      "Staff": "bg-indigo-100 text-indigo-800",
      "Equipment": "bg-gray-100 text-gray-800",
      "Other": "bg-slate-100 text-slate-800"
    };
    return colors[category] || "bg-muted/10 text-muted-foreground";
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method?.toLowerCase()) {
      case 'cash':
        return <Banknote className="h-3 w-3" />;
      case 'card':
        return <Receipt className="h-3 w-3" />;
      default:
        return <Calculator className="h-3 w-3" />;
    }
  };

  const columns = [
    {
      key: 'created_at' as const,
      label: 'Date',
      render: (value: string) => (
        <div>
          <p className="text-sm">{format(new Date(value), 'dd/MM/yyyy')}</p>
          <p className="text-xs text-muted-foreground">{format(new Date(value), 'HH:mm')}</p>
        </div>
      ),
    },
    {
      key: 'title' as const,
      label: 'Expense Details',
      render: (value: string, row: Expense) => (
        <div>
          <p className="font-medium">{value}</p>
          {row.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">{row.description}</p>
          )}
          {row.receiptNumber && (
            <p className="text-xs text-muted-foreground font-mono">
              Receipt: {row.receiptNumber}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'category' as const,
      label: 'Category',
      render: (value: string) => (
        <Badge className={getCategoryColor(value)} variant="secondary">
          {value}
        </Badge>
      ),
    },
    {
      key: 'amount' as const,
      label: 'Amount',
      render: (value: number) => (
        <span className="font-semibold text-destructive data-table">
          {formatPKR(value)}
        </span>
      ),
    },
    {
      key: 'payment_method' as const,
      label: 'Payment Method',
      render: (value: string) => (
        <div className="flex items-center space-x-2">
          {getPaymentMethodIcon(value)}
          <span className="text-sm capitalize">{value?.replace('_', ' ') || '-'}</span>
        </div>
      ),
    },
    {
      key: 'id' as const,
      label: 'Actions',
      render: (value: string, row: Expense) => (
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

  // Calculate summary stats
  const totalExpenses = expenses.reduce((sum: number, expense: Expense) => sum + (expense.amount || 0), 0);
  const monthlyExpenses = expenses.filter((expense: Expense) => {
    const expenseDate = new Date(expense.created_at);
    const currentDate = new Date();
    return expenseDate.getMonth() === currentDate.getMonth() &&
      expenseDate.getFullYear() === currentDate.getFullYear();
  });
  const monthlyTotal = monthlyExpenses.reduce((sum: number, expense: Expense) => sum + (expense.amount || 0), 0);

  // Category breakdown
  const categoryBreakdown = expenses.reduce((acc: any, expense: Expense) => {
    const category = expense.category;
    if (!acc[category]) {
      acc[category] = { count: 0, total: 0 };
    }
    acc[category].count++;
    acc[category].total += expense.amount || 0;
    return acc;
  }, {});

  const topCategories = Object.entries(categoryBreakdown)
    .sort(([, a]: any, [, b]: any) => b.total - a.total)
    .slice(0, 5);

  const { setTitle, setSubtitle } = useHeader();

  useEffect(() => {
    setTitle("Expenses");
    setSubtitle("Track and manage business expenses");
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
                  <p className="text-sm text-muted-foreground">Total Expenses</p>
                  <p className="text-2xl font-bold text-destructive">{formatPKR(totalExpenses)}</p>
                </div>
                <div className="w-12 h-12 bg-destructive/10 rounded-lg flex items-center justify-center">
                  <Calculator className="h-6 w-6 text-destructive" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">This Month</p>
                  <p className="text-2xl font-bold text-accent">{formatPKR(monthlyTotal)}</p>
                </div>
                <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Records</p>
                  <p className="text-2xl font-bold text-foreground">{expenses.length}</p>
                </div>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <List className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg. Expense</p>
                  <p className="text-2xl font-bold text-secondary">
                    {formatPKR(expenses.length ? totalExpenses / expenses.length : 0)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center">
                  <Banknote className="h-6 w-6 text-secondary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
          <div className="lg:col-span-12">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Expense Records</CardTitle>
                  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                      <Button data-testid="button-add-expense">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Expense
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>
                          {editingExpense ? "Edit Expense" : "Add New Expense"}
                        </DialogTitle>
                      </DialogHeader>
                      <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                          <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Expense Title *</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    placeholder="e.g., Office Supplies"
                                    data-testid="input-expense-title"
                                    className={form.formState.errors.title ? "border-destructive" : ""}
                                  />
                                </FormControl>
                                {form.formState.errors.title && (
                                  <div className="flex items-center space-x-2 text-destructive text-sm">
                                    <span>⚠️</span>
                                    <span>{form.formState.errors.title.message}</span>
                                  </div>
                                )}
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="category"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Category</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-expense-category">
                                      <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {EXPENSE_CATEGORIES.map((category) => (
                                      <SelectItem key={category} value={category}>
                                        {category}
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
                              name="amount"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Amount (PKR) *</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      {...field}
                                      placeholder="0.00"
                                      data-testid="input-expense-amount"
                                      className={form.formState.errors.amount ? "border-destructive" : ""}
                                    />
                                  </FormControl>
                                  {form.formState.errors.amount && (
                                    <div className="flex items-center space-x-2 text-destructive text-sm">
                                      <span>⚠️</span>
                                      <span>{form.formState.errors.amount.message}</span>
                                    </div>
                                  )}
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="payment_method"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Payment Method</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger data-testid="select-payment-method">
                                        <SelectValue placeholder="Select method" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {PAYMENT_METHODS.map((method) => (
                                        <SelectItem key={method} value={method}>
                                          {method.replace('_', ' ').toUpperCase()}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <FormField
                            control={form.control}
                            name="receiptNumber"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Receipt Number (Optional)</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="e.g., RCP-001" data-testid="input-receipt-number" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Description (Optional)</FormLabel>
                                <FormControl>
                                  <Textarea {...field} rows={3} data-testid="textarea-description" />
                                </FormControl>
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
                              disabled={createExpenseMutation.isPending || updateExpenseMutation.isPending}
                              data-testid="button-save-expense"
                            >
                              {createExpenseMutation.isPending || updateExpenseMutation.isPending
                                ? "Saving..."
                                : editingExpense
                                  ? "Update Expense"
                                  : "Add Expense"}
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <Input
                    placeholder="Search expenses..."
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    data-testid="input-search-expenses"
                  />
                  <div>
                    <Input
                      type="date"
                      placeholder="Start Date"
                      value={filters.startDate}
                      onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                      data-testid="input-start-date"
                    />
                  </div>
                  <div>
                    <Input
                      type="date"
                      placeholder="End Date"
                      value={filters.endDate}
                      onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                      data-testid="input-end-date"
                    />
                  </div>
                  <Select
                    value={filters.category}
                    onValueChange={(value) => setFilters({ ...filters, category: value })}
                  >
                    <SelectTrigger data-testid="select-filter-category">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {EXPENSE_CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Data Table */}
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <span className="ml-2 text-muted-foreground">Loading expenses...</span>
                  </div>
                ) : (
                  <DataTable
                    data={paginatedExpenses}
                    columns={columns}
                    searchPlaceholder="Search expenses..."
                    onExport={handleExport}
                  />
                )}
                {total > pagination.limit && <PaginationControls />}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}