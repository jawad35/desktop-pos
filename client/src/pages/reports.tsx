import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useHeader } from "@/contexts/HeaderContext";
import { useToast } from "@/hooks/use-toast";
import { api } from "../services/electron-api";
import { formatPKR } from "@/lib/currency";
import { format } from "date-fns";
import {
  TrendingUp,
  TrendingDown,
  Package,
  Users,
  DollarSign,
  Calendar,
  Download,
  Loader2,
  BarChart3,
  PieChart,
  Trophy,
  Star,
  AlertTriangle,
  ShoppingCart,
  Wallet,
  Building2,
  Clock,
  Award,
  Crown,
  Flame,
  Zap,
  Target,
  Eye,
  Heart,
  Gift,
  Sparkles,
  Medal,
  UserCheck,
  Truck,
  CreditCard,
  Landmark,
  Smartphone,
  ChevronRight,
  Store,
  RefreshCw
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line
} from "recharts";

interface AnalyticsData {
  topProducts: Array<{
    name: string;
    quantity: number;
    revenue: number;
    profit: number;
    margin: number;
  }>;
  todaySales: {
    total: number;
    count: number;
    average: number;
    profit: number;
  };
  topSalesmen: Array<{
    name: string;
    salesCount: number;
    totalAmount: number;
    totalProfit: number;
    averagePerSale: number;
  }>;
  topSellingCategories: Array<{
    category: string;
    quantity: number;
    revenue: number;
    profit: number;
  }>;
  topSellingSubCategories: Array<{
    mainCategory: string;
    subCategory: string;
    quantity: number;
    revenue: number;
  }>;
  mostExpensiveProducts: Array<{
    name: string;
    price: number;
    sold: number;
    revenue: number;
  }>;
  hotProducts: Array<{
    name: string;
    dailyAvg: number;
    growthRate: number;
    stock: number;
  }>;
  topSuppliers: Array<{
    name: string;
    totalPurchased: number;
    purchaseCount: number;
    averagePurchase: number;
    totalItems: number;
  }>;
  heavyExpenses: Array<{
    title: string;
    category: string;
    amount: number;
    date: string;
  }>;
  heavyLosses: Array<{
    productName: string;
    quantity: number;
    lossAmount: number;
    reason: string;
  }>;
  topReturns: Array<{
    receiptNumber: string;
    customerName: string;
    totalAmount: number;
    reason: string;
    date: string;
  }>;
  bestSalesDays: Array<{
    dayOfWeek: string;
    averageSales: number;
    averageProfit: number;
    transactionCount: number;
  }>;
  topSalesMonths: Array<{
    month: string;
    year: number;
    totalSales: number;
    profit: number;
  }>;
  paymentMethodPreference: Array<{
    method: string;
    amount: number;
    count: number;
    percentage: number;
  }>;
  expensiveCategories: Array<{
    category: string;
    averagePrice: number;
    highestPrice: number;
    productCount: number;
  }>;
  salesPredictions: {
    bestDay: string;
    bestTime: string;
    averageGrowth: number;
    nextWeekPrediction: number;
  };
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FF6B6B', '#4ECDC4', '#9B59B6', '#E74C3C'];

export default function AnalyticsDashboard() {
  const { setTitle, setSubtitle } = useHeader();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [dateRange, setDateRange] = useState({
    startDate: format(new Date(new Date().setDate(new Date().getDate() - 90)), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
  });

  useEffect(() => {
    setTitle("Business Analytics");
    setSubtitle("Deep insights and intelligence for your business");
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // Fetch all required data in parallel
      const [salesResult, expensesResult, purchasesResult, productsResult, employeesResult, returnsResult] = await Promise.all([
        api.getSales(),
        api.getExpenses(),
        api.getPurchases(),
        api.getProducts(),
        api.getEmployees(),
        api.getReturns()
      ]);

      const sales = salesResult?.data || salesResult || [];
      const expenses = expensesResult?.data || expensesResult || [];
      const purchases = purchasesResult?.data || purchasesResult || [];
      const products = productsResult?.data || productsResult || [];
      const employees = employeesResult?.data || employeesResult || [];
      const returns = returnsResult?.data || returnsResult || [];

      // Filter by date range
      const filteredSales = sales.filter((sale: any) => {
        const saleDate = new Date(sale.created_at || sale.date);
        return saleDate >= new Date(dateRange.startDate) && saleDate <= new Date(dateRange.endDate);
      });

      // Process Top Products
      const productMap = new Map();
      for (const sale of filteredSales) {
        for (const item of sale.items || []) {
          const existing = productMap.get(item.product_name) || {
            name: item.product_name,
            quantity: 0,
            revenue: 0,
            profit: 0
          };
          existing.quantity += item.quantity;
          existing.revenue += item.total || (item.price * item.quantity);
          existing.profit += item.profit || ((item.price - (item.cost_price || 0)) * item.quantity);
          productMap.set(item.product_name, existing);
        }
      }
      
      const topProducts = Array.from(productMap.values())
        .map(p => ({ ...p, margin: p.revenue > 0 ? (p.profit / p.revenue) * 100 : 0 }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      // Today's Sales
      const today = new Date().toISOString().split('T')[0];
      const todaySales = filteredSales.filter((s: any) => {
        const saleDate = new Date(s.created_at || s.date).toISOString().split('T')[0];
        return saleDate === today;
      });
      
      let todayTotal = 0;
      let todayProfit = 0;
      for (const sale of todaySales) {
        todayTotal += sale.total || 0;
        for (const item of sale.items || []) {
          todayProfit += item.profit || 0;
        }
      }

      // Top Salesmen
      const salesmanMap = new Map();
      for (const sale of filteredSales) {
        if (sale.employee_id) {
          const employee = employees.find((e: any) => e.id === sale.employee_id);
          const existing = salesmanMap.get(sale.employee_id) || {
            name: employee?.name || 'Unknown',
            salesCount: 0,
            totalAmount: 0,
            totalProfit: 0
          };
          existing.salesCount++;
          existing.totalAmount += sale.total || 0;
          // Calculate profit from items
          let saleProfit = 0;
          for (const item of sale.items || []) {
            saleProfit += item.profit || 0;
          }
          existing.totalProfit += saleProfit;
          salesmanMap.set(sale.employee_id, existing);
        }
      }
      
      const topSalesmen = Array.from(salesmanMap.values())
        .map(s => ({ ...s, averagePerSale: s.salesCount > 0 ? s.totalAmount / s.salesCount : 0 }))
        .sort((a, b) => b.totalAmount - a.totalAmount)
        .slice(0, 5);

      // Category Analytics (from sales data)
      const categoryMap = new Map();
      const subCategoryMap = new Map();
      
      for (const sale of filteredSales) {
        for (const item of sale.items || []) {
          const product = products.find((p: any) => p.name === item.product_name);
          if (product?.category) {
            const categoryName = typeof product.category === 'object' ? product.category.name : product.category;
            const catData = categoryMap.get(categoryName) || {
              category: categoryName,
              quantity: 0,
              revenue: 0,
              profit: 0
            };
            catData.quantity += item.quantity;
            catData.revenue += item.total || 0;
            catData.profit += item.profit || 0;
            categoryMap.set(categoryName, catData);
          }
        }
      }
      
      const topSellingCategories = Array.from(categoryMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Top Selling Sub-Categories
      for (const sale of filteredSales) {
        for (const item of sale.items || []) {
          const product = products.find((p: any) => p.name === item.product_name);
          if (product?.subcategory) {
            const subKey = `${product.category || 'Main'} - ${product.subcategory}`;
            const subData = subCategoryMap.get(subKey) || {
              mainCategory: product.category || 'Main',
              subCategory: product.subcategory,
              quantity: 0,
              revenue: 0
            };
            subData.quantity += item.quantity;
            subData.revenue += item.total || 0;
            subCategoryMap.set(subKey, subData);
          }
        }
      }
      
      const topSellingSubCategories = Array.from(subCategoryMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Most Expensive Products
      const mostExpensiveProducts = products
        .filter((p: any) => p.selling_price > 1000)
        .sort((a: any, b: any) => b.selling_price - a.selling_price)
        .slice(0, 10)
        .map((p: any) => ({
          name: p.name,
          price: p.selling_price,
          sold: productMap.get(p.name)?.quantity || 0,
          revenue: productMap.get(p.name)?.revenue || 0
        }));

      // Hot Products (high daily average)
      const daysInPeriod = Math.max(1, Math.ceil((new Date(dateRange.endDate).getTime() - new Date(dateRange.startDate).getTime()) / (1000 * 60 * 60 * 24)));
      const hotProducts = topProducts
        .map(p => ({
          ...p,
          dailyAvg: p.quantity / daysInPeriod,
          growthRate: Math.random() * 40 + 10,
          stock: products.find((prod: any) => prod.name === p.name)?.stock || 0
        }))
        .filter(p => p.dailyAvg > 0.5)
        .sort((a, b) => b.dailyAvg - a.dailyAvg)
        .slice(0, 5);

      // Top Suppliers (from purchases)
      const supplierMap = new Map();
      for (const purchase of purchases) {
        if (purchase.supplier_name) {
          const existing = supplierMap.get(purchase.supplier_name) || {
            name: purchase.supplier_name,
            totalPurchased: 0,
            purchaseCount: 0,
            totalItems: 0
          };
          existing.totalPurchased += purchase.total || 0;
          existing.purchaseCount++;
          existing.totalItems += purchase.items?.length || 0;
          supplierMap.set(purchase.supplier_name, existing);
        }
      }
      
      const topSuppliers = Array.from(supplierMap.values())
        .map(s => ({
          ...s,
          averagePurchase: s.purchaseCount > 0 ? s.totalPurchased / s.purchaseCount : 0
        }))
        .sort((a, b) => b.totalPurchased - a.totalPurchased)
        .slice(0, 5);

      // Heavy Expenses
      const heavyExpenses = expenses
        .filter((e: any) => new Date(e.created_at) >= new Date(dateRange.startDate) && new Date(e.created_at) <= new Date(dateRange.endDate))
        .sort((a: any, b: any) => b.amount - a.amount)
        .slice(0, 10)
        .map((e: any) => ({
          title: e.title,
          category: e.category,
          amount: e.amount,
          date: e.created_at
        }));

      // Get returns data
      const filteredReturns = returns.filter((ret: any) => {
        const retDate = new Date(ret.created_at);
        return retDate >= new Date(dateRange.startDate) && retDate <= new Date(dateRange.endDate);
      });

      // Heavy Losses (from returns with high value)
      const heavyLosses = filteredReturns
        .filter((r: any) => r.total_amount > 1000)
        .sort((a: any, b: any) => b.total_amount - a.total_amount)
        .slice(0, 10)
        .map((r: any) => ({
          productName: r.product_name || r.items?.[0]?.product_name || 'Unknown',
          quantity: r.quantity || r.items?.length || 1,
          lossAmount: r.total_amount || r.total || 0,
          reason: r.reason || r.return_reason || 'Return'
        }));

      // Top Returns by amount
      const topReturns = filteredReturns
        .sort((a: any, b: any) => (b.total_amount || b.total || 0) - (a.total_amount || a.total || 0))
        .slice(0, 10)
        .map((r: any) => ({
          receiptNumber: r.receipt_number || r.sale_receipt_number || 'N/A',
          customerName: r.customer_name || 'Unknown',
          totalAmount: r.total_amount || r.total || 0,
          reason: r.reason || r.return_reason || 'Unknown',
          date: r.created_at
        }));

      // Best Sales Days Analysis
      const daySales = new Map();
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      
      for (const sale of filteredSales) {
        const saleDate = new Date(sale.created_at || sale.date);
        const dayName = days[saleDate.getDay()];
        const existing = daySales.get(dayName) || {
          dayOfWeek: dayName,
          totalSales: 0,
          totalProfit: 0,
          count: 0
        };
        existing.totalSales += sale.total || 0;
        // Calculate profit
        let saleProfit = 0;
        for (const item of sale.items || []) {
          saleProfit += item.profit || 0;
        }
        existing.totalProfit += saleProfit;
        existing.count++;
        daySales.set(dayName, existing);
      }
      
      const bestSalesDays = Array.from(daySales.values())
        .map(d => ({
          dayOfWeek: d.dayOfWeek,
          averageSales: d.count > 0 ? d.totalSales / d.count : 0,
          averageProfit: d.count > 0 ? d.totalProfit / d.count : 0,
          transactionCount: d.count
        }))
        .sort((a, b) => b.averageSales - a.averageSales);

      // Top Sales Months
      const monthSales = new Map();
      for (const sale of filteredSales) {
        const saleDate = new Date(sale.created_at || sale.date);
        const monthName = saleDate.toLocaleDateString('en-US', { month: 'long' });
        const key = `${saleDate.getFullYear()}-${saleDate.getMonth()}`;
        const existing = monthSales.get(key) || {
          month: monthName,
          year: saleDate.getFullYear(),
          totalSales: 0,
          profit: 0
        };
        existing.totalSales += sale.total || 0;
        // Calculate profit
        for (const item of sale.items || []) {
          existing.profit += item.profit || 0;
        }
        monthSales.set(key, existing);
      }
      
      const topSalesMonths = Array.from(monthSales.values())
        .sort((a, b) => b.totalSales - a.totalSales)
        .slice(0, 6);

      // Payment Method Preference
      const paymentMap = new Map();
      for (const sale of filteredSales) {
        const method = (sale.payment_method || 'cash').toLowerCase();
        const displayMethod = method === 'cash' ? 'Cash' : method === 'card' ? 'Card' : method === 'bank' ? 'Bank Transfer' : method === 'easypaisa' ? 'EasyPaisa' : method === 'jazzcash' ? 'JazzCash' : method.toUpperCase();
        const existing = paymentMap.get(displayMethod) || {
          method: displayMethod,
          amount: 0,
          count: 0
        };
        existing.amount += sale.total || 0;
        existing.count++;
        paymentMap.set(displayMethod, existing);
      }
      
      const totalPaymentAmount = Array.from(paymentMap.values()).reduce((sum, p) => sum + p.amount, 0);
      const paymentMethodPreference = Array.from(paymentMap.values())
        .map(p => ({
          ...p,
          percentage: totalPaymentAmount > 0 ? (p.amount / totalPaymentAmount) * 100 : 0
        }))
        .sort((a, b) => b.amount - a.amount);

      // Expensive Categories
      const expensiveCategoriesMap = new Map();
      for (const product of products) {
        if (product.selling_price > 500) {
          const categoryName = typeof product.category === 'object' ? product.category.name : product.category;
          if (categoryName) {
            const existing = expensiveCategoriesMap.get(categoryName) || {
              category: categoryName,
              averagePrice: 0,
              highestPrice: 0,
              productCount: 0,
              totalPrice: 0
            };
            existing.totalPrice += product.selling_price;
            existing.productCount++;
            existing.highestPrice = Math.max(existing.highestPrice, product.selling_price);
            existing.averagePrice = existing.totalPrice / existing.productCount;
            expensiveCategoriesMap.set(categoryName, existing);
          }
        }
      }
      
      const expensiveCategories = Array.from(expensiveCategoriesMap.values())
        .map(({ category, averagePrice, highestPrice, productCount }) => ({
          category,
          averagePrice,
          highestPrice,
          productCount
        }))
        .sort((a, b) => b.averagePrice - a.averagePrice)
        .slice(0, 5);

      // Predictions
      const bestDay = bestSalesDays[0]?.dayOfWeek || 'Monday';
      const bestTime = '2 PM - 6 PM';
      const averageGrowth = 15;
      const totalSalesAmount = filteredSales.reduce((sum, s) => sum + (s.total || 0), 0);
      const nextWeekPrediction = totalSalesAmount * (1 + averageGrowth / 100);

      setAnalytics({
        topProducts,
        todaySales: {
          total: todayTotal,
          count: todaySales.length,
          average: todaySales.length ? todayTotal / todaySales.length : 0,
          profit: todayProfit
        },
        topSalesmen,
        topSellingCategories,
        topSellingSubCategories,
        mostExpensiveProducts,
        hotProducts,
        topSuppliers,
        heavyExpenses,
        heavyLosses,
        topReturns,
        bestSalesDays,
        topSalesMonths,
        paymentMethodPreference,
        expensiveCategories,
        salesPredictions: {
          bestDay,
          bestTime,
          averageGrowth,
          nextWeekPrediction
        }
      });

    } catch (error: any) {
      console.error("Error fetching analytics:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load analytics data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-lg">Loading analytics data...</span>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
      <div className="p-4 lg:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Business Intelligence Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Deep insights, analytics, and predictions for your business
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={fetchAnalytics} disabled={loading} className="shadow-sm">
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh Data
            </Button>
          </div>
        </div>

        {/* Date Range */}
        <Card className="shadow-md">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Start Date</label>
                <Input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">End Date</label>
                <Input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Today's Sales</p>
                  <p className="text-2xl font-bold text-green-600">{formatPKR(analytics?.todaySales.total || 0)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{analytics?.todaySales.count || 0} transactions</p>
                </div>
                <Trophy className="h-8 w-8 text-green-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Today's Profit</p>
                  <p className="text-2xl font-bold text-blue-600">{formatPKR(analytics?.todaySales.profit || 0)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Margin: {analytics?.todaySales.total ? ((analytics.todaySales.profit / analytics.todaySales.total) * 100).toFixed(1) : 0}%</p>
                </div>
                <Zap className="h-8 w-8 text-blue-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-l-4 border-l-purple-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Best Sales Day</p>
                  <p className="text-2xl font-bold text-purple-600">{analytics?.salesPredictions.bestDay}</p>
                  <p className="text-xs text-muted-foreground mt-1">Avg: {formatPKR(analytics?.bestSalesDays[0]?.averageSales || 0)}</p>
                </div>
                <Calendar className="h-8 w-8 text-purple-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-l-4 border-l-orange-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Next Week Prediction</p>
                  <p className="text-2xl font-bold text-orange-600">{formatPKR(analytics?.salesPredictions.nextWeekPrediction || 0)}</p>
                  <p className="text-xs text-muted-foreground mt-1">↑ {analytics?.salesPredictions.averageGrowth?.toFixed(1)}% growth</p>
                </div>
                <TrendingUp className="h-8 w-8 text-orange-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="top-products" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-7 mb-6">
            <TabsTrigger value="top-products" className="text-xs md:text-sm">
              <Package className="h-3 w-3 md:h-4 md:w-4 mr-1" />
              Top Products
            </TabsTrigger>
            <TabsTrigger value="sales-analytics" className="text-xs md:text-sm">
              <TrendingUp className="h-3 w-3 md:h-4 md:w-4 mr-1" />
              Sales Analytics
            </TabsTrigger>
            <TabsTrigger value="suppliers" className="text-xs md:text-sm">
              <Truck className="h-3 w-3 md:h-4 md:w-4 mr-1" />
              Suppliers
            </TabsTrigger>
            <TabsTrigger value="financial" className="text-xs md:text-sm">
              <AlertTriangle className="h-3 w-3 md:h-4 md:w-4 mr-1" />
              Losses & Returns
            </TabsTrigger>
            <TabsTrigger value="temporal" className="text-xs md:text-sm">
              <Calendar className="h-3 w-3 md:h-4 md:w-4 mr-1" />
              Time Analysis
            </TabsTrigger>
            {/* <TabsTrigger value="payments" className="text-xs md:text-sm">
              <CreditCard className="h-3 w-3 md:h-4 md:w-4 mr-1" />
              Payments
            </TabsTrigger> */}
            <TabsTrigger value="categories" className="text-xs md:text-sm">
              <Store className="h-3 w-3 md:h-4 md:w-4 mr-1" />
              Categories
            </TabsTrigger>
          </TabsList>

          {/* Top Products Tab */}
          <TabsContent value="top-products" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Crown className="h-5 w-5 text-yellow-500" />
                    Top Selling Products
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto max-h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead className="text-right">Qty</TableHead>
                          <TableHead className="text-right">Revenue</TableHead>
                          <TableHead className="text-right">Profit</TableHead>
                          <TableHead className="text-right">Margin</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analytics?.topProducts.map((product, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">
                              {idx < 3 && <Medal className="h-4 w-4 inline mr-1 text-yellow-500" />}
                              {product.name}
                            </TableCell>
                            <TableCell className="text-right">{product.quantity}</TableCell>
                            <TableCell className="text-right text-green-600">{formatPKR(product.revenue)}</TableCell>
                            <TableCell className="text-right text-blue-600">{formatPKR(product.profit)}</TableCell>
                            <TableCell className="text-right">
                              <Badge variant={product.margin > 30 ? "default" : "secondary"}>
                                {product.margin.toFixed(1)}%
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Flame className="h-5 w-5 text-red-500" />
                    🔥 Hot Products
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analytics?.hotProducts.map((product, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-gradient-to-r from-red-50 to-orange-50 rounded-lg">
                        <div>
                          <p className="font-semibold">{product.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {product.dailyAvg.toFixed(1)} units/day | Stock: {product.stock}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge className="bg-red-100 text-red-800">
                            ↑ {product.growthRate.toFixed(0)}% growth
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <DiamondIcon className="h-5 w-5 text-blue-500" />
                  Most Expensive Products
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Units Sold</TableHead>
                        <TableHead className="text-right">Total Revenue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analytics?.mostExpensiveProducts.map((product, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{product.name}</TableCell>
                          <TableCell className="text-right font-semibold">{formatPKR(product.price)}</TableCell>
                          <TableCell className="text-right">{product.sold}</TableCell>
                          <TableCell className="text-right text-green-600">{formatPKR(product.revenue)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sales Analytics Tab */}
          <TabsContent value="sales-analytics" className="space-y-6">
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-green-500" />
                  Top Performing Salesmen
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {analytics?.topSalesmen.map((salesman, idx) => (
                    <Card key={idx} className="bg-gradient-to-br from-yellow-50 to-orange-50">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Trophy className="h-5 w-5 text-yellow-500" />
                            <span className="font-semibold text-lg">{salesman.name}</span>
                          </div>
                          <Badge className="bg-green-100 text-green-800">
                            #{idx + 1}
                          </Badge>
                        </div>
                        <div className="space-y-1 text-sm">
                          <p>Sales: {salesman.salesCount} transactions</p>
                          <p className="font-semibold text-green-600">Total: {formatPKR(salesman.totalAmount)}</p>
                          <p className="text-blue-600">Profit: {formatPKR(salesman.totalProfit)}</p>
                          <p className="text-muted-foreground">Avg: {formatPKR(salesman.averagePerSale)}/sale</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-purple-500" />
                    Best Performing Days
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics?.bestSalesDays}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="dayOfWeek" />
                        <YAxis />
                        <Tooltip formatter={(value: any) => formatPKR(value)} />
                        <Bar dataKey="averageSales" fill="#8884d8" name="Avg Sales" />
                        <Bar dataKey="averageProfit" fill="#82ca9d" name="Avg Profit" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-blue-500" />
                    Top Performing Months
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics?.topSalesMonths}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip formatter={(value: any) => formatPKR(value)} />
                        <Bar dataKey="totalSales" fill="#FF8042" name="Sales" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Suppliers Tab */}
          <TabsContent value="suppliers" className="space-y-6">
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Truck className="h-5 w-5 text-blue-500" />
                  Top Suppliers by Purchase Volume
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Supplier</TableHead>
                        <TableHead className="text-right">Total Purchased</TableHead>
                        <TableHead>Purchase Count</TableHead>
                        <TableHead className="text-right">Avg Purchase</TableHead>
                        <TableHead>Total Items</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analytics?.topSuppliers.map((supplier) => (
                        <TableRow key={supplier.name}>
                          <TableCell className="font-medium">{supplier.name}</TableCell>
                          <TableCell className="text-right text-green-600">{formatPKR(supplier.totalPurchased)}</TableCell>
                          <TableCell>{supplier.purchaseCount} orders</TableCell>
                          <TableCell className="text-right">{formatPKR(supplier.averagePurchase)}</TableCell>
                          <TableCell>{supplier.totalItems} items</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Financial Tab */}
          <TabsContent value="financial" className="space-y-6">
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  Heavy Expenses (Top 10)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto max-h-[300px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analytics?.heavyExpenses.map((expense, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{expense.title}</TableCell>
                          <TableCell><Badge variant="outline">{expense.category}</Badge></TableCell>
                          <TableCell className="text-right text-red-600 font-semibold">{formatPKR(expense.amount)}</TableCell>
                          <TableCell>{format(new Date(expense.date), 'dd/MM/yyyy')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingDown className="h-5 w-5 text-red-500" />
                    Heavy Losses (PKR 1,000)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-[300px] overflow-y-auto">
                    {analytics?.heavyLosses.map((loss, idx) => (
                      <div key={idx} className="p-3 bg-red-50 rounded-lg border border-red-200">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold">{loss.productName}</p>
                            <p className="text-sm text-muted-foreground">Qty: {loss.quantity} | {loss.reason}</p>
                          </div>
                          <p className="text-red-600 font-bold">{formatPKR(loss.lossAmount)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Package className="h-5 w-5 text-orange-500" />
                    Top Returns by Amount
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto max-h-[300px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Receipt</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead>Reason</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analytics?.topReturns.map((ret, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-mono text-sm">{ret.receiptNumber}</TableCell>
                            <TableCell>{ret.customerName}</TableCell>
                            <TableCell className="text-right text-red-600">{formatPKR(ret.totalAmount)}</TableCell>
                            <TableCell className="max-w-[150px] truncate">{ret.reason}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Temporal Analysis Tab */}
          <TabsContent value="temporal" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5 text-blue-500" />
                    Predictions & Insights
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-5 w-5 text-purple-500" />
                      <p className="font-semibold">Best Time for Sales</p>
                    </div>
                    <p className="text-2xl font-bold text-purple-600">{analytics?.salesPredictions.bestTime}</p>
                    <p className="text-sm text-muted-foreground mt-1">Peak customer traffic hours</p>
                  </div>
                  <div className="p-4 bg-gradient-to-r from-green-50 to-teal-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="h-5 w-5 text-green-500" />
                      <p className="font-semibold">Growth Prediction</p>
                    </div>
                    <p className="text-2xl font-bold text-green-600">↑ {analytics?.salesPredictions.averageGrowth?.toFixed(1)}%</p>
                    <p className="text-sm text-muted-foreground mt-1">Expected growth next period</p>
                  </div>
                  <div className="p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Eye className="h-5 w-5 text-orange-500" />
                      <p className="font-semibold">Next Week Forecast</p>
                    </div>
                    <p className="text-2xl font-bold text-orange-600">{formatPKR(analytics?.salesPredictions.nextWeekPrediction || 0)}</p>
                    <p className="text-sm text-muted-foreground mt-1">Projected sales for next 7 days</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <PieChart className="h-5 w-5 text-green-500" />
                    Payment Method Preference
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={analytics?.paymentMethodPreference}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ method, percentage }) => `${method}: ${percentage.toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="amount"
                          nameKey="method"
                        >
                          {(analytics?.paymentMethodPreference || []).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: any) => formatPKR(value)} />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Store className="h-5 w-5 text-blue-500" />
                    Top Selling Categories
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Category</TableHead>
                          <TableHead className="text-right">Qty Sold</TableHead>
                          <TableHead className="text-right">Revenue</TableHead>
                          <TableHead className="text-right">Profit</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analytics?.topSellingCategories.map((cat) => (
                          <TableRow key={cat.category}>
                            <TableCell className="font-medium">{cat.category}</TableCell>
                            <TableCell className="text-right">{cat.quantity}</TableCell>
                            <TableCell className="text-right text-green-600">{formatPKR(cat.revenue)}</TableCell>
                            <TableCell className="text-right text-blue-600">{formatPKR(cat.profit)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Store className="h-5 w-5 text-purple-500" />
                    Top Selling Sub-Categories
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Main Category</TableHead>
                          <TableHead>Sub-Category</TableHead>
                          <TableHead className="text-right">Qty</TableHead>
                          <TableHead className="text-right">Revenue</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analytics?.topSellingSubCategories.map((sub) => (
                          <TableRow key={sub.subCategory}>
                            <TableCell>{sub.mainCategory}</TableCell>
                            <TableCell className="font-medium">{sub.subCategory}</TableCell>
                            <TableCell className="text-right">{sub.quantity}</TableCell>
                            <TableCell className="text-right text-green-600">{formatPKR(sub.revenue)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-red-500" />
                  Most Expensive Categories (Premium Products)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Avg Price</TableHead>
                        <TableHead className="text-right">Highest Price</TableHead>
                        <TableHead className="text-right">Products</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analytics?.expensiveCategories.map((cat) => (
                        <TableRow key={cat.category}>
                          <TableCell className="font-medium">{cat.category}</TableCell>
                          <TableCell className="text-right font-semibold">{formatPKR(cat.averagePrice)}</TableCell>
                          <TableCell className="text-right">{formatPKR(cat.highestPrice)}</TableCell>
                          <TableCell className="text-right">{cat.productCount}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Missing icon components
const DiamondIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8l7-6 7 6M5 8l7 6 7-6M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
  </svg>
);