import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
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
    Banknote,
    Keyboard
} from "lucide-react";
import { format } from "date-fns";
import { useHeader } from "@/contexts/HeaderContext";
import { z } from "zod";
import { useLocation } from "wouter";
import { KeyboardShortcutsModal } from "../components/modals/KeyboardShortcutsModal";

// Storage keys
const STORAGE_KEYS = {
    EXPENSES_PAGE: 'expenses_current_page',
    EXPENSES_FILTERS: 'expenses_filters',
    EXPENSES_SCROLL_POSITION: 'expenses_scroll_position'
};

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

const EXPENSE_FREQUENCIES = [
    { value: 'one-time', label: 'One Time', days: 1 },
    { value: 'daily', label: 'Daily', days: 1 },
    { value: 'weekly', label: 'Weekly', days: 7 },
    { value: 'monthly', label: 'Monthly', days: 30 },
    { value: 'yearly', label: 'Yearly', days: 365 },
];

const insertExpenseSchema = z.object({
    title: z.string().min(1, "Title is required"),
    description: z.string().optional(),
    amount: z.string().or(z.number()).transform(val => Number(val)).pipe(z.number().min(0.01, "Amount must be greater than 0")),
    category: z.string().min(1, "Category is required"),
    payment_method: z.string().min(1, "Payment method is required"),
    receiptNumber: z.string().optional(),
    frequency: z.string().default('one-time'),
    is_recurring: z.boolean().default(false),
});

export default function Expenses() {
    const pageSize = 50;
    const [location] = useLocation();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
    const [showShortcuts, setShowShortcuts] = useState(false);
    const { toast } = useToast();

    // Load saved state
    const loadSavedPage = () => {
        try {
            const savedPage = localStorage.getItem(STORAGE_KEYS.EXPENSES_PAGE);
            const page = savedPage ? parseInt(savedPage, 10) : 1;
            return isNaN(page) ? 1 : Math.max(1, page);
        } catch (error) {
            return 1;
        }
    };

    const loadSavedFilters = () => {
        try {
            const savedFilters = localStorage.getItem(STORAGE_KEYS.EXPENSES_FILTERS);
            if (savedFilters) {
                const parsed = JSON.parse(savedFilters);
                return {
                    startDate: parsed.startDate || "",
                    endDate: parsed.endDate || "",
                    category: parsed.category || "",
                    search: parsed.search || "",
                };
            }
        } catch (error) { }
        return {
            startDate: "",
            endDate: "",
            category: "",
            search: "",
        };
    };

    const [filters, setFilters] = useState(loadSavedFilters);
    const [currentPage, setCurrentPage] = useState(loadSavedPage);
    const [allExpensesData, setAllExpensesData] = useState<Expense[]>([]);
    const [renderKey, setRenderKey] = useState(0);

    const mainContentRef = useRef<HTMLDivElement>(null);
    const isFirstLoadRef = useRef(true);

    // Fetch expenses
    const { isLoading, refetch } = useQuery<Expense[]>({
        queryKey: ["expenses", location],
        queryFn: async () => {
            const result = await api.getExpenses();
            let allExpenses: Expense[] = [];

            if (Array.isArray(result)) {
                allExpenses = result;
            } else if (result?.success && Array.isArray(result.data)) {
                allExpenses = result.data;
            }

            allExpenses.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            setAllExpensesData(allExpenses);
            setRenderKey(prev => prev + 1);
            return allExpenses;
        },
        refetchOnMount: true,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        staleTime: 0,
        cacheTime: 0,
    });

    // Apply filters
    const filteredData = useMemo(() => {
        if (allExpensesData.length === 0) return [];

        let filtered = [...allExpensesData];

        if (filters.search) {
            const search = filters.search.toLowerCase();
            filtered = filtered.filter(expense =>
                expense.title.toLowerCase().includes(search) ||
                (expense.description && expense.description.toLowerCase().includes(search))
            );
        }

        if (filters.category && filters.category !== "all" && filters.category !== "") {
            filtered = filtered.filter(expense => expense.category === filters.category);
        }

        if (filters.startDate) {
            filtered = filtered.filter(expense =>
                new Date(expense.created_at) >= new Date(filters.startDate)
            );
        }

        if (filters.endDate) {
            filtered = filtered.filter(expense =>
                new Date(expense.created_at) <= new Date(filters.endDate)
            );
        }

        return filtered;
    }, [allExpensesData, filters]);

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
    const totalCount = filteredData.length;

    // Page validation
    useEffect(() => {
        if (filteredData.length > 0) {
            const totalPagesCount = Math.ceil(filteredData.length / pageSize);
            if (isFirstLoadRef.current) {
                const savedPage = loadSavedPage();
                let validPage = savedPage;
                if (validPage > totalPagesCount) validPage = totalPagesCount;
                if (validPage < 1) validPage = 1;
                if (validPage !== currentPage) setCurrentPage(validPage);
                isFirstLoadRef.current = false;
            } else if (currentPage > totalPagesCount) {
                setCurrentPage(totalPagesCount);
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
            localStorage.setItem(STORAGE_KEYS.EXPENSES_PAGE, currentPage.toString());
            localStorage.setItem(STORAGE_KEYS.EXPENSES_FILTERS, JSON.stringify(filters));
        }
    }, [currentPage, filters]);

    // Restore scroll position
    useEffect(() => {
        if (!isLoading && paginatedData.length > 0 && mainContentRef.current && !isFirstLoadRef.current) {
            const savedScrollPosition = localStorage.getItem(STORAGE_KEYS.EXPENSES_SCROLL_POSITION);
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
            localStorage.setItem(STORAGE_KEYS.EXPENSES_SCROLL_POSITION, mainContentRef.current.scrollTop.toString());
        }
    }, []);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleShortcuts = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

            // Ctrl + A - Add Expense
            if (e.ctrlKey && e.key === 'a') {
                e.preventDefault();
                e.stopPropagation();
                setEditingExpense(null);
                form.reset({
                    title: "",
                    description: "",
                    amount: "",
                    category: EXPENSE_CATEGORIES[0],
                    payment_method: PAYMENT_METHODS[0],
                    receiptNumber: "",
                    frequency: "one-time",
                    is_recurring: false,
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
            if (e.ctrlKey && e.key === 'c') {
                e.preventDefault();
                e.stopPropagation();
                setFilters({ startDate: "", endDate: "", category: "", search: "" });
                setCurrentPage(1);
                toast({ title: "Filters Cleared", description: "All filters have been reset" });
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
        resolver: zodResolver(insertExpenseSchema),
        defaultValues: {
            title: "",
            description: "",
            amount: "",
            category: EXPENSE_CATEGORIES[0],
            payment_method: PAYMENT_METHODS[0],
            receiptNumber: "",
            frequency: "one-time",
            is_recurring: false,
        },
    });

    const createExpenseMutation = useMutation({
        mutationFn: async (data: any) => {
            const result = await api.createExpense(data);
            if (!result || !result.success) {
                throw new Error(result?.error || 'Failed to create expense');
            }
            return result;
        },
        onSuccess: () => {
            toast({ title: "Expense Added", description: "Expense has been added successfully" });
            refetch();
            setDialogOpen(false);
            form.reset({
                title: "",
                description: "",
                amount: "",
                category: EXPENSE_CATEGORIES[0],
                payment_method: PAYMENT_METHODS[0],
                receiptNumber: "",
                frequency: "one-time",
                is_recurring: false,
            });
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    const updateExpenseMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: any }) => {
            const result = await api.updateExpense(id, data);
            if (!result.success) {
                throw new Error(result.error);
            }
            return result;
        },
        onSuccess: () => {
            toast({ title: "Expense Updated", description: "Expense has been updated successfully" });
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
                frequency: "one-time",
                is_recurring: false,
            });
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
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
            toast({ title: "Expense Deleted", description: "Expense has been deleted successfully" });
            refetch();
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    const onSubmit = (data: any) => {
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
    };

    const handleEdit = (expense: Expense) => {
        setEditingExpense(expense);
        form.reset({
            title: expense.title,
            description: expense.description || "",
            amount: expense.amount.toString(),
            category: expense.category,
            payment_method: expense.payment_method || "cash",
            receiptNumber: expense.receiptNumber || "",
            frequency: expense.frequency || "one-time",
            is_recurring: expense.is_recurring || false,
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
            const headers = ['Date', 'Title', 'Description', 'Category', 'Amount', 'Frequency', 'Payment Method', 'Receipt Number'];
            const csvRows = [headers];

            for (const expense of filteredData) {
                csvRows.push([
                    `"${format(new Date(expense.created_at), 'dd/MM/yyyy HH:mm')}"`,
                    `"${expense.title || ''}"`,
                    `"${expense.description || ''}"`,
                    `"${expense.category || ''}"`,
                    expense.amount?.toString() || '0',
                    `"${expense.frequency || 'one-time'}"`,
                    `"${expense.payment_method || 'cash'}"`,
                    `"${expense.receiptNumber || ''}"`
                ]);
            }

            const csvContent = csvRows.map(row => row.join(',')).join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `expenses_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toast({ title: "Export Successful", description: `Exported ${filteredData.length} expenses to CSV` });
        } catch (error) {
            console.error('Export failed:', error);
            toast({ title: "Export Failed", description: "Failed to export expenses data", variant: "destructive" });
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

    const calculateDailyCost = (amount: number, frequency: string): number => {
        const frequencyMap: { [key: string]: number } = {
            'one-time': 1,
            'daily': 1,
            'weekly': 7,
            'monthly': 30,
            'yearly': 365
        };
        const days = frequencyMap[frequency] || 1;
        return amount / days;
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
            key: 'frequency' as const,
            label: 'Frequency',
            render: (value: string, row: Expense) => {
                const freq = EXPENSE_FREQUENCIES.find(f => f.value === value);
                return (
                    <Badge variant="outline" className="capitalize">
                        {freq?.label || value || 'One Time'}
                        {row.is_recurring && <span className="ml-1 text-xs">🔄</span>}
                    </Badge>
                );
            },
        },
        {
            key: 'daily_cost' as const,
            label: 'Daily Cost',
            render: (_: string, row: Expense) => {
                const dailyCost = calculateDailyCost(row.amount, row.frequency || 'one-time');
                return (
                    <span className="text-xs text-muted-foreground">
                        {formatPKR(dailyCost)}/day
                    </span>
                );
            },
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
    const totalExpenses = filteredData.reduce((sum: number, expense: Expense) => sum + (expense.amount || 0), 0);
    const monthlyExpenses = filteredData.filter((expense: Expense) => {
        const expenseDate = new Date(expense.created_at);
        const currentDate = new Date();
        return expenseDate.getMonth() === currentDate.getMonth() &&
            expenseDate.getFullYear() === currentDate.getFullYear();
    });
    const monthlyTotal = monthlyExpenses.reduce((sum: number, expense: Expense) => sum + (expense.amount || 0), 0);

    const { setTitle, setSubtitle } = useHeader();

    useEffect(() => {
        setTitle("Expenses");
        setSubtitle("Track and manage business expenses");
    }, []);

    return (
        <div className="flex-1 flex flex-col overflow-hidden" key={renderKey}>
            <main
                ref={mainContentRef}
                className="flex-1 overflow-auto p-6"
                onScroll={handleScroll}
            >
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
                                    <p className="text-2xl font-bold text-foreground">{totalCount}</p>
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
                                        {formatPKR(totalCount ? totalExpenses / totalCount : 0)}
                                    </p>
                                </div>
                                <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center">
                                    <Banknote className="h-6 w-6 text-secondary" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between flex-wrap gap-4">
                            <div className="flex items-center gap-2">
                                <CardTitle>Expense Records</CardTitle>
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
                                        localStorage.removeItem(STORAGE_KEYS.EXPENSES_PAGE);
                                        localStorage.removeItem(STORAGE_KEYS.EXPENSES_FILTERS);
                                        localStorage.removeItem(STORAGE_KEYS.EXPENSES_SCROLL_POSITION);
                                        setFilters({ startDate: "", endDate: "", category: "", search: "" });
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
                                            Add Expense
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                                                                <Input {...field} placeholder="e.g., Office Supplies" />
                                                            </FormControl>
                                                            <FormMessage />
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
                                                                    <SelectTrigger>
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
                                                                    <Input type="number" step="0.01" {...field} placeholder="0.00" />
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                    <FormField
                                                        control={form.control}
                                                        name="frequency"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>Frequency</FormLabel>
                                                                <Select onValueChange={field.onChange} value={field.value}>
                                                                    <FormControl>
                                                                        <SelectTrigger>
                                                                            <SelectValue placeholder="Select frequency" />
                                                                        </SelectTrigger>
                                                                    </FormControl>
                                                                    <SelectContent>
                                                                        {EXPENSE_FREQUENCIES.map((freq) => (
                                                                            <SelectItem key={freq.value} value={freq.value}>
                                                                                {freq.label}
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                    <FormField
                                                        control={form.control}
                                                        name="is_recurring"
                                                        render={({ field }) => (
                                                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                                                <div className="space-y-0.5">
                                                                    <FormLabel>Recurring Expense</FormLabel>
                                                                    <FormDescription>
                                                                        Mark if this expense repeats
                                                                    </FormDescription>
                                                                </div>
                                                                <FormControl>
                                                                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                                                                </FormControl>
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
                                                                        <SelectTrigger>
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
                                                                <Input {...field} placeholder="e.g., RCP-001" />
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
                                                                <Textarea {...field} rows={3} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <div className="flex justify-end space-x-2">
                                                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                                                        Cancel
                                                    </Button>
                                                    <Button type="submit" disabled={createExpenseMutation.isPending || updateExpenseMutation.isPending}>
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
                        </div>
                    </CardHeader>
                    <CardContent>
                        {/* Filters */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                            <Input
                                placeholder="Search expenses... (Ctrl+F)"
                                value={filters.search}
                                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                            />
                            <Input
                                type="date"
                                placeholder="Start Date"
                                value={filters.startDate}
                                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                            />
                            <Input
                                type="date"
                                placeholder="End Date"
                                value={filters.endDate}
                                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                            />
                            <Select
                                value={filters.category || "all"}
                                onValueChange={(value) => setFilters({ ...filters, category: value === "all" ? "" : value })}
                            >
                                <SelectTrigger>
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

                        {/* Results count */}
                        <div className="mb-4 text-sm text-muted-foreground">
                            {totalCount > 0 ? (
                                `Showing ${startIndex} to ${endIndex} of ${totalCount} expenses`
                            ) : (
                                !isLoading && "No expenses found"
                            )}
                        </div>

                        {/* Data Table */}
                        {isLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                <span className="ml-2 text-muted-foreground">Loading expenses...</span>
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
                                                    paginatedData.map((expense: Expense, index: number) => (
                                                        <tr key={expense.id} className={`border-b hover:bg-muted/30 transition-colors ${index % 2 === 0 ? 'bg-background' : 'bg-muted/10'}`}>
                                                            {columns.map((column) => (
                                                                <td key={column.key} className="p-3">
                                                                    {column.render(expense[column.key as keyof Expense] as any, expense)}
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr>
                                                        <td colSpan={columns.length} className="text-center p-8 text-muted-foreground">
                                                            No expenses found.
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
                title="Expenses Page Shortcuts"
                shortcuts={[
                    { key: "Ctrl + A", description: "Add New Expense" },
                    { key: "Ctrl + E", description: "Export Expenses" },
                    { key: "Ctrl + C", description: "Clear All Filters" },
                    { key: "Ctrl + F", description: "Focus Search Bar" },
                    { key: "←", description: "Previous Page" },
                    { key: "→", description: "Next Page" },
                ]}
            />
        </div>
    );
}