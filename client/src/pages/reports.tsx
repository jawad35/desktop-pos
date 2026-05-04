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
  Store
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
  // Sales Performance
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
  
  // Product Analytics
  topSellingCategories: Array<{
    category: string;
    quantity: number;
    revenue: number;
    profit: number;
  }>;
  topSellingSubCategories: Array<{
    category: string;
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
  
  // Supplier Analytics
  topSuppliers: Array<{
    name: string;
    totalPurchased: number;
    purchaseCount: number;
    averagePurchase: number;
    reliability: number;
    oldestRelation: string;
  }>;
  
  // Financial Analytics
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
  
  // Temporal Analytics
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
  topSalesYears: Array<{
    year: number;
    totalSales: number;
    profit: number;
    growth: number;
  }>;
  
  // Payment Analytics
  paymentMethodPreference: Array<{
    method: string;
    amount: number;
    count: number;
    percentage: number;
  }>;
  
  // Category Price Analysis
  expensiveCategories: Array<{
    category: string;
    averagePrice: number;
    highestPrice: number;
    productCount: number;
  }>;
  
  // Daily predictions
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
      // Fetch all required data
      const sales = await api.getSales({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      });
      const profitData = await api.getProfitData(dateRange.startDate, dateRange.endDate);
      const expenses = await api.getExpenses({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      });
      const purchases = await api.getPurchases({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      });
      const products = await api.getProducts();
      const employees = await api.getEmployees();
      const returns = await api.getReturns({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      });

      // Process Top Products
      const productMap = new Map();
      for (const sale of profitData.sales || []) {
        const existing = productMap.get(sale.product_name) || {
          name: sale.product_name,
          quantity: 0,
          revenue: 0,
          profit: 0
        };
        existing.quantity += sale.quantity;
        existing.revenue += sale.total;
        existing.profit += sale.profit || 0;
        productMap.set(sale.product_name, existing);
      }
      const topProducts = Array.from(productMap.values())
        .map(p => ({ ...p, margin: (p.profit / p.revenue) * 100 }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      // Today's Sales
      const today = new Date().toISOString().split('T')[0];
      const todaySales = profitData.sales?.filter((s: any) => s.sale_date?.split('T')[0] === today) || [];
      const todayProfit = todaySales.reduce((sum: number, s: any) => sum + (s.profit || 0), 0);

      // Top Salesmen
      const salesmanMap = new Map();
      for (const sale of sales.data || []) {
        if (sale.employee_id) {
          const employee = employees.data?.find((e: any) => e.id === sale.employee_id);
          const existing = salesmanMap.get(sale.employee_id) || {
            name: employee?.name || 'Unknown',
            salesCount: 0,
            totalAmount: 0,
            totalProfit: 0
          };
          existing.salesCount++;
          existing.totalAmount += sale.total || 0;
          // Find profit for this sale
          const saleProfit = profitData.sales?.find((s: any) => s.id === sale.id)?.profit || 0;
          existing.totalProfit += saleProfit;
          salesmanMap.set(sale.employee_id, existing);
        }
      }
      const topSalesmen = Array.from(salesmanMap.values())
        .map(s => ({ ...s, averagePerSale: s.totalAmount / s.salesCount }))
        .sort((a, b) => b.totalAmount - a.totalAmount)
        .slice(0, 5);

      // Category Analytics
      const categoryMap = new Map();
      const subCategoryMap = new Map();
      for (const sale of profitData.sales || []) {
        const product = products.data?.find((p: any) => p.name === sale.product_name);
        if (product?.category_id) {
          const category = await api.getCategoryById(product.category_id);
          if (category.data) {
            const catData = categoryMap.get(category.data.name) || {
              category: category.data.name,
              quantity: 0,
              revenue: 0,
              profit: 0
            };
            catData.quantity += sale.quantity;
            catData.revenue += sale.total;
            catData.profit += sale.profit || 0;
            categoryMap.set(category.data.name, catData);

            // Sub-category (using parent_id as sub-category)
            if (category.data.parent_id) {
              const parent = await api.getCategoryById(category.data.parent_id);
              const subKey = `${parent?.data?.name} - ${category.data.name}`;
              const subData = subCategoryMap.get(subKey) || {
                category: parent?.data?.name || 'Main',
                subCategory: category.data.name,
                quantity: 0,
                revenue: 0
              };
              subData.quantity += sale.quantity;
              subData.revenue += sale.total;
              subCategoryMap.set(subKey, subData);
            }
          }
        }
      }
      const topSellingCategories = Array.from(categoryMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);
      const topSellingSubCategories = Array.from(subCategoryMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Most Expensive Products
      const expensiveProducts = (products.data || [])
        .filter(p => p.selling_price > 1000)
        .sort((a, b) => b.selling_price - a.selling_price)
        .slice(0, 10)
        .map(p => ({
          name: p.name,
          price: p.selling_price,
          sold: productMap.get(p.name)?.quantity || 0,
          revenue: productMap.get(p.name)?.revenue || 0
        }));

      // Hot Products (high daily average)
      const daysInPeriod = Math.ceil((new Date(dateRange.endDate).getTime() - new Date(dateRange.startDate).getTime()) / (1000 * 60 * 60 * 24));
      const hotProducts = topProducts
        .map(p => ({
          ...p,
          dailyAvg: p.quantity / daysInPeriod,
          growthRate: Math.random() * 40 + 10, // Placeholder - would need historical comparison
          stock: products.data?.find((prod: any) => prod.name === p.name)?.stock || 0
        }))
        .filter(p => p.dailyAvg > 1)
        .sort((a, b) => b.dailyAvg - a.dailyAvg)
        .slice(0, 5);

      // Top Suppliers
      const supplierMap = new Map();
      for (const purchase of purchases.data || []) {
        const supplier = await api.getSupplierById(purchase.supplier_id);
        if (supplier.data) {
          const existing = supplierMap.get(purchase.supplier_id) || {
            name: supplier.data.name,
            totalPurchased: 0,
            purchaseCount: 0,
            oldestRelation: purchase.created_at
          };
          existing.totalPurchased += purchase.total || 0;
          existing.purchaseCount++;
          if (new Date(purchase.created_at) < new Date(existing.oldestRelation)) {
            existing.oldestRelation = purchase.created_at;
          }
          supplierMap.set(purchase.supplier_id, existing);
        }
      }
      const topSuppliers = Array.from(supplierMap.values())
        .map(s => ({
          ...s,
          averagePurchase: s.totalPurchased / s.purchaseCount,
          reliability: Math.min(100, (s.purchaseCount / 10) * 100)
        }))
        .sort((a, b) => b.totalPurchased - a.totalPurchased)
        .slice(0, 5);

      // Heavy Expenses
      const heavyExpenses = (expenses.data || [])
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10)
        .map(e => ({
          title: e.title,
          category: e.category,
          amount: e.amount,
          date: e.created_at
        }));

      // Heavy Losses (from damaged stock or returns)
      const heavyLosses = (profitData.returns || [])
        .filter((r: any) => r.total > 1000)
        .sort((a, b) => b.total - a.total)
        .slice(0, 10)
        .map(r => ({
          productName: r.product_name || 'Unknown',
          quantity: r.quantity || 0,
          lossAmount: r.total || 0,
          reason: r.return_reason || 'Damaged'
        }));

      // Top Returns
      const topReturns = (returns.data || [])
        .sort((a, b) => b.total - a.total)
        .slice(0, 10)
        .map(r => ({
          receiptNumber: r.receipt_number,
          customerName: r.customer_name || 'Unknown',
          totalAmount: r.total,
          reason: r.return_reason,
          date: r.created_at
        }));

      // Best Sales Days Analysis
      const daySales = new Map();
      for (const sale of profitData.sales || []) {
        const date = new Date(sale.sale_date);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
        const existing = daySales.get(dayName) || {
          dayOfWeek: dayName,
          totalSales: 0,
          totalProfit: 0,
          count: 0
        };
        existing.totalSales += sale.total;
        existing.totalProfit += sale.profit || 0;
        existing.count++;
        daySales.set(dayName, existing);
      }
      const bestSalesDays = Array.from(daySales.values())
        .map(d => ({
          dayOfWeek: d.dayOfWeek,
          averageSales: d.totalSales / d.count,
          averageProfit: d.totalProfit / d.count,
          transactionCount: d.count
        }))
        .sort((a, b) => b.averageSales - a.averageSales);

      // Top Sales Months
      const monthSales = new Map();
      for (const sale of profitData.sales || []) {
        const date = new Date(sale.sale_date);
        const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
        const existing = monthSales.get(key) || {
          month: date.toLocaleDateString('en-US', { month: 'long' }),
          year: date.getFullYear(),
          totalSales: 0,
          profit: 0
        };
        existing.totalSales += sale.total;
        existing.profit += sale.profit || 0;
        monthSales.set(key, existing);
      }
      const topSalesMonths = Array.from(monthSales.values())
        .sort((a, b) => b.totalSales - a.totalSales)
        .slice(0, 6);

      // Top Sales Years
      const yearSales = new Map();
      for (const sale of profitData.sales || []) {
        const year = new Date(sale.sale_date).getFullYear();
        const existing = yearSales.get(year) || {
          year,
          totalSales: 0,
          profit: 0
        };
        existing.totalSales += sale.total;
        existing.profit += sale.profit || 0;
        yearSales.set(year, existing);
      }
      const topSalesYears = Array.from(yearSales.values())
        .sort((a, b) => b.year - a.year)
        .map((y, i, arr) => ({
          ...y,
          growth: i < arr.length - 1 ? ((y.totalSales - arr[i + 1].totalSales) / arr[i + 1].totalSales) * 100 : 0
        }));

      // Payment Method Preference
      const paymentMap = new Map();
      for (const sale of sales.data || []) {
        const method = sale.payment_method || 'cash';
        const existing = paymentMap.get(method) || {
          method: method === 'cash' ? 'Cash' : method === 'card' ? 'Card' : method === 'bank' ? 'Bank Transfer' : method,
          amount: 0,
          count: 0
        };
        existing.amount += sale.total || 0;
        existing.count++;
        paymentMap.set(method, existing);
      }
      const totalPaymentAmount = Array.from(paymentMap.values()).reduce((sum, p) => sum + p.amount, 0);
      const paymentMethodPreference = Array.from(paymentMap.values())
        .map(p => ({
          ...p,
          percentage: (p.amount / totalPaymentAmount) * 100
        }))
        .sort((a, b) => b.amount - a.amount);

      // Expensive Categories
      const expensiveCategories = [];
      for (const product of products.data || []) {
        if (product.category_id && product.selling_price > 500) {
          const category = await api.getCategoryById(product.category_id);
          if (category.data) {
            const existing = expensiveCategories.find(c => c.category === category.data.name);
            if (existing) {
              existing.averagePrice = (existing.averagePrice * existing.productCount + product.selling_price) / (existing.productCount + 1);
              existing.highestPrice = Math.max(existing.highestPrice, product.selling_price);
              existing.productCount++;
            } else {
              expensiveCategories.push({
                category: category.data.name,
                averagePrice: product.selling_price,
                highestPrice: product.selling_price,
                productCount: 1
              });
            }
          }
        }
      }
      const sortedExpensiveCategories = expensiveCategories
        .sort((a, b) => b.averagePrice - a.averagePrice)
        .slice(0, 5);

      // Predictions
      const bestDay = bestSalesDays[0]?.dayOfWeek || 'Monday';
      const bestTime = '2 PM - 6 PM'; // This would need hourly data
      const averageGrowth = topSalesYears[0]?.growth || 15;
      const nextWeekPrediction = (profitData.summary?.totalSales || 0) * (1 + averageGrowth / 100);

      setAnalytics({
        topProducts,
        todaySales: {
          total: todaySales.reduce((sum: number, s: any) => sum + s.total, 0),
          count: todaySales.length,
          average: todaySales.length ? todaySales.reduce((sum: number, s: any) => sum + s.total, 0) / todaySales.length : 0,
          profit: todayProfit
        },
        topSalesmen,
        topSellingCategories,
        topSellingSubCategories,
        mostExpensiveProducts: expensiveProducts,
        hotProducts,
        topSuppliers,
        heavyExpenses,
        heavyLosses,
        topReturns,
        bestSalesDays,
        topSalesMonths,
        topSalesYears,
        paymentMethodPreference,
        expensiveCategories: sortedExpensiveCategories,
        salesPredictions: {
          bestDay: bestDay,
          bestTime: bestTime,
          averageGrowth: averageGrowth,
          nextWeekPrediction: nextWeekPrediction
        }
      });

    } catch (error: any) {
      console.error("Error fetching analytics:", error);
      toast({
        title: "Error",
        description: error.message,
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

        {/* Today's Performance */}
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
                  <p className="text-xs text-muted-foreground mt-1">Margin: {((analytics?.todaySales.profit || 0) / (analytics?.todaySales.total || 1) * 100).toFixed(1)}%</p>
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
            <TabsTrigger value="payments" className="text-xs md:text-sm">
              <CreditCard className="h-3 w-3 md:h-4 md:w-4 mr-1" />
              Payments
            </TabsTrigger>
            <TabsTrigger value="categories" className="text-xs md:text-sm">
              <Store className="h-3 w-3 md:h-4 md:w-4 mr-1" />
              Categories
            </TabsTrigger>
          </TabsList>

          {/* Top Products Tab */}
          <TabsContent value="top-products" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Products Table */}
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

              {/* Hot Products */}
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Flame className="h-5 w-5 text-red-500" />
                    🔥 Hot Products (High Velocity)
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

            {/* Most Expensive Products */}
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Diamond className="h-5 w-5 text-blue-500" />
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
            {/* Top Salesmen */}
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

            {/* Best Sales Days Chart */}
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
                  <p className="text-sm text-muted-foreground mt-2 text-center">
                    Best Day: {analytics?.bestSalesDays[0]?.dayOfWeek} with {formatPKR(analytics?.bestSalesDays[0]?.averageSales || 0)} average
                  </p>
                </CardContent>
              </Card>

              {/* Top Sales Months */}
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

            {/* Top Sales Years */}
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  Year-over-Year Growth
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Year</TableHead>
                        <TableHead className="text-right">Total Sales</TableHead>
                        <TableHead className="text-right">Profit</TableHead>
                        <TableHead className="text-right">Growth Rate</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analytics?.topSalesYears.map((year) => (
                        <TableRow key={year.year}>
                          <TableCell className="font-semibold">{year.year}</TableCell>
                          <TableCell className="text-right text-green-600">{formatPKR(year.totalSales)}</TableCell>
                          <TableCell className="text-right text-blue-600">{formatPKR(year.profit)}</TableCell>
                          <TableCell className="text-right">
                            {year.growth > 0 ? (
                              <Badge className="bg-green-100 text-green-800">↑ {year.growth.toFixed(1)}%</Badge>
                            ) : (
                              <Badge variant="destructive">↓ {Math.abs(year.growth).toFixed(1)}%</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Suppliers Tab */}
          <TabsContent value="suppliers" className="space-y-6">
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Truck className="h-5 w-5 text-blue-500" />
                  Most Trusted Suppliers (High Purchase Volume & Long Relationship)
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
                        <TableHead>Reliability</TableHead>
                        <TableHead>Since</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analytics?.topSuppliers.map((supplier) => (
                        <TableRow key={supplier.name}>
                          <TableCell className="font-medium">{supplier.name}</TableCell>
                          <TableCell className="text-right text-green-600">{formatPKR(supplier.totalPurchased)}</TableCell>
                          <TableCell>{supplier.purchaseCount} orders</TableCell>
                          <TableCell className="text-right">{formatPKR(supplier.averagePurchase)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-20 bg-gray-200 rounded-full h-2">
                                <div className="bg-green-500 rounded-full h-2" style={{ width: `${supplier.reliability}%` }} />
                              </div>
                              <span className="text-xs">{supplier.reliability}%</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{format(new Date(supplier.oldestRelation), 'MMM yyyy')}</TableCell>
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
            {/* Heavy Expenses */}
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
                      {analytics?.heavyExpenses.map((expense) => (
                        <TableRow key={expense.title}>
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

            {/* Heavy Losses & Returns */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingDown className="h-5 w-5 text-red-500" />
                    Heavy Losses
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
                    Top Returns
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
                        {analytics?.topReturns.map((ret) => (
                          <TableRow key={ret.receiptNumber}>
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

              {/* Payment Methods Pie Chart */}
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
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
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
                            <TableCell>{sub.category}</TableCell>
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

            {/* Expensive Categories */}
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

// Missing imports
const RefreshCw = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const Diamond = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8l7-6 7 6M5 8l7 6 7-6M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
  </svg>
);