import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatPKR } from "@/lib/currency";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import {
    TrendingUp,
    TrendingDown,
    DollarSign,
    CreditCard,
    Users,
    Package,
    ShoppingCart,
    Calculator,
    BarChart3,
    Download,
    Eye,
    Calendar,
    Building,
    Wallet,
    ArrowDown,
    PieChart,
    Activity,
    RefreshCw
} from "lucide-react";
import { useHeader } from "@/contexts/HeaderContext";
import { format, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";

interface DashboardTotals {
    sales: number;
    returns: number;
    expenses: number;
    purchases: number;
    salaries: number;
    netProfit: number;
    grossRevenue: number;
    cashInHand: number;
    cashFlow: {
        in: number;
        out: number;
    };
}

export default function AdminDashboard() {
    const { toast } = useToast();
    const { user, isAuthenticated, isLoading: authLoading } = useAuth();

    // Date filter state
    const [dateRange, setDateRange] = useState({
        startDate: format(new Date(), 'yyyy-MM-dd'),
        endDate: format(new Date(), 'yyyy-MM-dd'),
        period: 'today',
        paymentMethod: 'all'
    });

    const { setTitle, setSubtitle } = useHeader();

    useEffect(() => {
        setTitle("Admin Dashboard");
        setSubtitle("Business Overview & Analytics");
    }, []);

    // Fetch dashboard totals
    const { data: totals, isLoading: totalsLoading, error, refetch } = useQuery<DashboardTotals>({
        queryKey: ["/api/dashboard/totals", dateRange],
        queryFn: async () => {
            const queryParams = new URLSearchParams();
            if (dateRange.startDate) queryParams.append("startDate", dateRange.startDate);
            if (dateRange.endDate) queryParams.append("endDate", dateRange.endDate);
            if (dateRange.paymentMethod !== 'all') queryParams.append("paymentMethod", dateRange.paymentMethod);

            const token = localStorage.getItem("token");
            const response = await fetch(`/api/dashboard/totals?${queryParams.toString()}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });

            if (!response.ok) throw new Error("Failed to fetch dashboard totals");
            return response.json();
        },
        enabled: isAuthenticated && user?.role === 'admin',
    });

    // Quick date range presets
    const handleDatePreset = (preset: string) => {
        const today = new Date();
        let startDate = today;
        let endDate = today;

        switch (preset) {
            case 'today':
                startDate = today;
                endDate = today;
                break;
            case 'yesterday':
                startDate = subDays(today, 1);
                endDate = subDays(today, 1);
                break;
            case 'week':
                startDate = subDays(today, 7);
                endDate = today;
                break;
            case 'month':
                startDate = startOfMonth(today);
                endDate = endOfMonth(today);
                break;
            case 'year':
                startDate = startOfYear(today);
                endDate = endOfYear(today);
                break;
            case 'lastMonth':
                const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                startDate = startOfMonth(lastMonth);
                endDate = endOfMonth(lastMonth);
                break;
        }

        setDateRange(prev => ({
            ...prev,
            startDate: format(startDate, 'yyyy-MM-dd'),
            endDate: format(endDate, 'yyyy-MM-dd'),
            period: preset
        }));
    };

    const profitLossColor = totals?.netProfit >= 0 ? "text-green-600" : "text-red-600";
    const profitLossIcon = totals?.netProfit >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />;

    if (authLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading...</p>
                </div>
            </div>
        );
    }

    if (user?.role !== 'admin') {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-destructive mb-4">Access Denied</h2>
                    <p className="text-muted-foreground">This dashboard is only accessible to administrators.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            <main className="flex-1 overflow-auto p-6">
                {/* Date Filter Controls */}

                <Card className="mb-6">
                    <CardContent className="p-4 space-y-4">
                        {/* Row 1: Quick filters */}
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium">Quick Range:</span>
                            </div>

                            {/* Responsive Button Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                                {["today", "yesterday", "week", "month", "lastMonth", "year"].map((preset) => (
                                    <Button
                                        key={preset}
                                        variant={dateRange.period === preset ? "default" : "outline"}
                                        size="sm"
                                        className="w-full"
                                        onClick={() => handleDatePreset(preset)}
                                    >
                                        {preset.charAt(0).toUpperCase() + preset.slice(1)}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        {/* Row 2: Filters */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-center">
                            {/* Payment Method */}
                            <div className="w-full flex flex-col justify-center">
                                <label className="text-sm text-muted-foreground mb-1 block">Payment Method</label>
                                <Select
                                    value={dateRange.paymentMethod}
                                    onValueChange={(value) =>
                                        setDateRange((prev) => ({ ...prev, paymentMethod: value }))
                                    }
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select Method" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Methods</SelectItem>
                                        <SelectItem value="cash">Cash</SelectItem>
                                        <SelectItem value="bank">Bank</SelectItem>
                                        <SelectItem value="easypaisa">EasyPaisa</SelectItem>
                                        <SelectItem value="jazzcash">JazzCash</SelectItem>
                                        <SelectItem value="card">Card</SelectItem>
                                        <SelectItem value="check">Check</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* From Date */}
                            <div className="w-full flex flex-col justify-center">
                                <label className="text-sm text-muted-foreground mb-1 block">From</label>
                                <Input
                                    type="date"
                                    value={dateRange.startDate}
                                    onChange={(e) =>
                                        setDateRange((prev) => ({
                                            ...prev,
                                            startDate: e.target.value,
                                            period: "custom",
                                        }))
                                    }
                                    className="w-full"
                                />
                            </div>

                            {/* To Date */}
                            <div className="w-full flex flex-col justify-center">
                                <label className="text-sm text-muted-foreground mb-1 block">To</label>
                                <Input
                                    type="date"
                                    value={dateRange.endDate}
                                    onChange={(e) =>
                                        setDateRange((prev) => ({
                                            ...prev,
                                            endDate: e.target.value,
                                            period: "custom",
                                        }))
                                    }
                                    className="w-full"
                                />
                            </div>

                            {/* Refresh */}
                            <div className="w-full flex flex-col justify-center">
                                <label className="text-sm text-muted-foreground mb-1 block">Refresh</label>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => refetch()}
                                    disabled={totalsLoading}
                                    className="w-full"
                                >
                                    <RefreshCw className={`mr-2 h-4 w-4 ${totalsLoading ? "animate-spin" : ""}`} />
                                    Refresh
                                </Button>
                            </div>
                        </div>

                    </CardContent>
                </Card>

                {/* Loading State */}
                {totalsLoading && (
                    <div className="flex items-center justify-center py-12">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                            <p className="text-muted-foreground">Loading financial data...</p>
                        </div>
                    </div>
                )}

                {/* Error State */}
                {error && !totalsLoading && (
                    <Card className="mb-6 border-destructive">
                        <CardContent className="p-6">
                            <div className="text-center text-destructive">
                                <p className="font-semibold">Failed to load dashboard data</p>
                                <p className="text-sm mt-2">Please try refreshing the page</p>
                                <Button onClick={() => refetch()} variant="outline" className="mt-4">
                                    Retry
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Dashboard Content */}
                {!totalsLoading && !error && totals && (
                    <>
                        {/* Key Metrics */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                            {/* Net Profit/Loss */}
                            <Card className="hover:shadow-lg transition-all">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-muted-foreground">Net Profit/Loss</p>
                                            <p className={`text-2xl font-bold ${profitLossColor}`}>
                                                {formatPKR(totals.netProfit)}
                                            </p>
                                            <p className={`text-sm ${profitLossColor}`}>
                                                {totals.netProfit >= 0 ? 'Profit' : 'Loss'}
                                            </p>
                                        </div>
                                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${totals.netProfit >= 0 ? 'bg-green-100' : 'bg-red-100'
                                            }`}>
                                            {profitLossIcon}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Gross Revenue */}
                            <Card className="hover:shadow-lg transition-all">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-muted-foreground">Gross Revenue</p>
                                            <p className="text-2xl font-bold text-foreground">
                                                {formatPKR(totals.grossRevenue)}
                                            </p>
                                            <p className="text-sm text-blue-600">Total Sales</p>
                                        </div>
                                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                            <DollarSign className="h-6 w-6 text-blue-600" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Cash in Hand */}
                            <Card className="hover:shadow-lg transition-all">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-muted-foreground">Cash in Hand</p>
                                            <p className="text-2xl font-bold text-foreground">
                                                {formatPKR(totals.cashInHand)}
                                            </p>
                                            <p className="text-sm text-green-600">Available</p>
                                        </div>
                                        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                            <Wallet className="h-6 w-6 text-green-600" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Cash Flow */}
                            <Card className="hover:shadow-lg transition-all">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-muted-foreground">Cash Flow</p>
                                            <p className="text-2xl font-bold text-foreground">
                                                {/* {formatPKR(totals.cashFlow.in - totals.cashFlow.out)} */}
                                            </p>
                                            <p className="text-sm text-purple-600">Net Flow</p>
                                        </div>
                                        <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                                            <Activity className="h-6 w-6 text-purple-600" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Detailed Breakdown */}
                        <Tabs defaultValue="breakdown" className="space-y-6">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="breakdown">Financial Breakdown</TabsTrigger>
                                <TabsTrigger value="cashflow">Cash Flow Details</TabsTrigger>
                            </TabsList>

                            {/* Financial Breakdown Tab */}
                            <TabsContent value="breakdown">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Income & Expenses</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-4">
                                                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                                                    <span className="font-medium">Sales Revenue</span>
                                                    <span className="font-bold text-green-600">{formatPKR(totals.sales)}</span>
                                                </div>

                                                <div className="space-y-2">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-muted-foreground">Returns</span>
                                                        <span className="text-red-600">-{formatPKR(totals.returns)}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-muted-foreground">Expenses</span>
                                                        <span className="text-red-600">-{formatPKR(totals.expenses)}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-muted-foreground">Purchases</span>
                                                        <span className="text-red-600">-{formatPKR(totals.purchases)}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-muted-foreground">Salaries</span>
                                                        <span className="text-red-600">-{formatPKR(totals.salaries)}</span>
                                                    </div>
                                                </div>

                                                <div className="flex justify-between items-center pt-3 border-t font-bold">
                                                    <span>Net Profit</span>
                                                    <span className={profitLossColor}>{formatPKR(totals.netProfit)}</span>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Quick Actions</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="grid grid-cols-1 gap-3">
                                                <Link href="/sales">
                                                    <Button variant="outline" className="w-full justify-start">
                                                        <ShoppingCart className="h-4 w-4 mr-2" />
                                                        View Sales Report
                                                    </Button>
                                                </Link>
                                                <Link href="/expenses">
                                                    <Button variant="outline" className="w-full justify-start">
                                                        <Calculator className="h-4 w-4 mr-2" />
                                                        Manage Expenses
                                                    </Button>
                                                </Link>
                                                <Link href="/purchases">
                                                    <Button variant="outline" className="w-full justify-start">
                                                        <Package className="h-4 w-4 mr-2" />
                                                        View Purchases
                                                    </Button>
                                                </Link>
                                                <Link href="/employees">
                                                    <Button variant="outline" className="w-full justify-start">
                                                        <Users className="h-4 w-4 mr-2" />
                                                        Manage Salaries
                                                    </Button>
                                                </Link>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </TabsContent>

                            {/* Cash Flow Tab */}
                            <TabsContent value="cashflow">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Cash Flow Analysis</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-4">
                                                <h4 className="font-semibold text-green-600">Cash In</h4>
                                                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                                                    <span>Sales</span>
                                                    {/* <span className="font-bold">{formatPKR(totals.cashFlow.in)}</span> */}
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <h4 className="font-semibold text-red-600">Cash Out</h4>
                                                <div className="space-y-2">
                                                    <div className="flex justify-between items-center">
                                                        <span>Returns</span>
                                                        <span className="text-red-600">-{formatPKR(totals.returns)}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span>Expenses</span>
                                                        <span className="text-red-600">-{formatPKR(totals.expenses)}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span>Purchases</span>
                                                        <span className="text-red-600">-{formatPKR(totals.purchases)}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span>Salaries</span>
                                                        <span className="text-red-600">-{formatPKR(totals.salaries)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg mt-4">
                                            <span className="font-bold">Net Cash Flow</span>
                                            {/* <span className={`font-bold text-lg ${totals.cashFlow.in - totals.cashFlow.out >= 0 ? 'text-green-600' : 'text-red-600'
                                                }`}>
                                                {formatPKR(totals.cashFlow.in - totals.cashFlow.out)}
                                            </span> */}
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>
                    </>
                )}
            </main>
        </div>
    );
}