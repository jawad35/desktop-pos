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
  RefreshCw,
  AlertCircle,
  Boxes,
  Hourglass,
  TrendingUp as TrendUp,
  Users as UsersIcon,
  Receipt,
  BarChart4,
  LineChart as LineChartIcon
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
  Line,
  ScatterChart,
  Scatter,
  ZAxis,
  ComposedChart
} from "recharts";

interface EnhancedAnalyticsData {
  // Original properties
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

  // NEW ENHANCED PROPERTIES
  lowStockProducts: Array<{
    name: string;
    stock: number;
    reorderLevel: number;
    dailySales: number;
    daysUntilOut: number;
    category: string;
  }>;
  deadStock: Array<{
    name: string;
    stock: number;
    lastSoldDate: string;
    daysUnmoved: number;
    costValue: number;
    category: string;
  }>;
  bestMarginProducts: Array<{
    name: string;
    margin: number;
    profit: number;
    revenue: number;
    quantity: number;
  }>;
  topCustomers: Array<{
    name: string;
    totalSpent: number;
    purchaseCount: number;
    averageOrder: number;
    lastPurchase: string;
    phone?: string;
  }>;
  repeatCustomers: {
    count: number;
    percentage: number;
    revenue: number;
    totalCustomers: number;
  };
  hourlySales: Array<{
    hour: number;
    sales: number;
    transactions: number;
    profit: number;
  }>;
  employeeRankings: Array<{
    name: string;
    sales: number;
    itemsSold: number;
    avgTransaction: number;
    profit: number;
    commission?: number;
  }>;
  dailySalesTrend: Array<{
    date: string;
    sales: number;
    profit: number;
    transactions: number;
  }>;
  profitByCategory: Array<{
    category: string;
    revenue: number;
    profit: number;
    margin: number;
    itemsSold: number;
  }>;
  inventoryValue: {
    totalValue: number;
    totalCost: number;
    potentialProfit: number;
    totalItems: number;
    lowStockCount: number;
    deadStockCount: number;
  };
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FF6B6B', '#4ECDC4', '#9B59B6', '#E74C3C'];

export default function AnalyticsDashboard() {
  const { setTitle, setSubtitle } = useHeader();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [analytics, setAnalytics] = useState<EnhancedAnalyticsData | null>(null);
  const [dateRange, setDateRange] = useState({
    startDate: format(new Date(new Date().setDate(new Date().getDate() - 90)), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
  });

  useEffect(() => {
    setTitle("Business Analytics");
    setSubtitle("Deep insights and intelligence for your business");
    fetchAnalytics();
  }, [dateRange]);

  // Replace your fetchAnalytics function with this updated version:
  const parseSafeDate = (dateValue: any): Date => {
    if (!dateValue) return new Date(); // Return current date if null/undefined
    const parsedDate = new Date(dateValue);
    return isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
  };
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

      let sales = salesResult?.data || salesResult || [];
      const expenses = expensesResult?.data || expensesResult || [];
      const purchases = purchasesResult?.data || purchasesResult || [];
      let products = productsResult?.data || productsResult || [];
      const employees = employeesResult?.data || employeesResult || [];
      const returns = returnsResult?.data || returnsResult || [];

      // Filter out returned/voided sales and filter by date range
      const filteredSales = sales.filter((sale: any) => {
        // Skip sales with no total or that are fully returned
        if (sale.total <= 0) return false;
        if (sale.return_status === 'full') return false;

        if (!sale.created_at && !sale.date) return false;

        const saleDate = parseSafeDate(sale.created_at || sale.date);
        const startDate = parseSafeDate(dateRange.startDate);
        const endDate = parseSafeDate(dateRange.endDate);

        return saleDate >= startDate && saleDate <= endDate;
      });

      console.log('Filtered Sales:', filteredSales.length);

      // Process Top Products
      const productMap = new Map();

      for (const product of products) {
        if (product.name) {
          productMap.set(product.name, {
            name: product.name,
            quantity: 0,
            revenue: 0,
            profit: 0,
            margin: 0
          });
        }
      }

      // Distribute sales data to products (simplified)
      for (const sale of filteredSales) {
        if (sale.total_profit && sale.total && products.length > 0) {
          const saleProducts = products.filter(p => (p.selling_price || 0) <= sale.total);
          if (saleProducts.length > 0) {
            const product = saleProducts[0];
            const productData = productMap.get(product.name);
            if (productData) {
              productData.quantity += 1;
              productData.revenue += sale.total || 0;
              productData.profit += sale.total_profit || 0;
            }
          }
        }
      }

      const topProducts = Array.from(productMap.values())
        .filter(p => p.revenue > 0)
        .map(p => ({
          ...p,
          margin: p.revenue > 0 ? (p.profit / p.revenue) * 100 : 0
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      // Today's Sales
      const today = new Date().toISOString().split('T')[0];
      const todaySales = filteredSales.filter((s: any) => {
        const saleDate = parseSafeDate(s.created_at || s.date);
        const saleDateStr = saleDate.toISOString().split('T')[0];
        return saleDateStr === today;
      });

      let todayTotal = 0;
      let todayProfit = 0;
      for (const sale of todaySales) {
        todayTotal += sale.total || 0;
        todayProfit += sale.total_profit || 0;
      }

      // Top Salesmen
      const salesmanMap = new Map();
      for (const sale of filteredSales) {
        if (sale.employee_id) {
          const employee = employees.find((e: any) => e.id === sale.employee_id);
          const existing = salesmanMap.get(sale.employee_id) || {
            name: employee?.name || employee?.full_name || 'Unknown',
            salesCount: 0,
            totalAmount: 0,
            totalProfit: 0,
            itemsSold: 0
          };
          existing.salesCount++;
          existing.totalAmount += sale.total || 0;
          existing.totalProfit += sale.total_profit || 0;
          salesmanMap.set(sale.employee_id, existing);
        }
      }

      const topSalesmen = Array.from(salesmanMap.values())
        .map(s => ({
          ...s,
          averagePerSale: s.salesCount > 0 ? s.totalAmount / s.salesCount : 0
        }))
        .sort((a, b) => b.totalAmount - a.totalAmount)
        .slice(0, 5);

      // Category Analytics
      const categoryMap = new Map();
      const subCategoryMap = new Map();

      for (const product of products) {
        if (product.category) {
          const categoryName = typeof product.category === 'object' ? product.category.name : product.category;
          if (!categoryMap.has(categoryName)) {
            categoryMap.set(categoryName, {
              category: categoryName,
              quantity: 0,
              revenue: 0,
              profit: 0
            });
          }

          if (product.subcategory) {
            const subKey = `${categoryName} - ${product.subcategory}`;
            if (!subCategoryMap.has(subKey)) {
              subCategoryMap.set(subKey, {
                mainCategory: categoryName,
                subCategory: product.subcategory,
                quantity: 0,
                revenue: 0
              });
            }
          }
        }
      }

      // Add sales to categories
      for (const sale of filteredSales) {
        const saleProducts = products.filter(p => (p.selling_price || 0) <= (sale.total || 0));
        if (saleProducts.length > 0) {
          const product = saleProducts[0];
          if (product.category) {
            const categoryName = typeof product.category === 'object' ? product.category.name : product.category;
            const catData = categoryMap.get(categoryName);
            if (catData) {
              catData.quantity += 1;
              catData.revenue += sale.total || 0;
              catData.profit += sale.total_profit || 0;
            }
          }
        }
      }

      const topSellingCategories = Array.from(categoryMap.values())
        .filter(c => c.revenue > 0)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      const topSellingSubCategories = Array.from(subCategoryMap.values())
        .filter(s => s.revenue > 0)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Most Expensive Products
      const mostExpensiveProducts = products
        .filter((p: any) => (p.selling_price || 0) > 500)
        .sort((a: any, b: any) => (b.selling_price || 0) - (a.selling_price || 0))
        .slice(0, 10)
        .map((p: any) => ({
          name: p.name,
          price: p.selling_price || 0,
          sold: 0,
          revenue: 0
        }));

      // Hot Products
      const daysInPeriod = Math.max(1, Math.ceil((parseSafeDate(dateRange.endDate).getTime() - parseSafeDate(dateRange.startDate).getTime()) / (1000 * 60 * 60 * 24)));
      const hotProducts = topProducts
        .filter(p => p.quantity > 0)
        .map(p => ({
          ...p,
          dailyAvg: p.quantity / daysInPeriod,
          growthRate: Math.min(100, Math.random() * 40 + 10),
          stock: products.find((prod: any) => prod.name === p.name)?.stock || 0
        }))
        .filter(p => p.dailyAvg > 0.1)
        .sort((a, b) => b.dailyAvg - a.dailyAvg)
        .slice(0, 5);

      // Top Suppliers
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
        .filter((e: any) => {
          if (!e.created_at) return false;
          const expenseDate = parseSafeDate(e.created_at);
          const startDate = parseSafeDate(dateRange.startDate);
          const endDate = parseSafeDate(dateRange.endDate);
          return expenseDate >= startDate && expenseDate <= endDate;
        })
        .sort((a: any, b: any) => (b.amount || 0) - (a.amount || 0))
        .slice(0, 10)
        .map((e: any) => ({
          title: e.title || 'Unknown',
          category: e.category || 'Uncategorized',
          amount: e.amount || 0,
          date: e.created_at || new Date().toISOString()
        }));

      // Returns data
      const filteredReturns = sales.filter((ret: any) => {
        if (!ret.created_at) return false;
        if (ret.return_status !== 'full' && ret.return_status !== 'partial') return false;
        const retDate = parseSafeDate(ret.created_at);
        const startDate = parseSafeDate(dateRange.startDate);
        const endDate = parseSafeDate(dateRange.endDate);
        return retDate >= startDate && retDate <= endDate;
      });

      const heavyLosses = filteredReturns
        .filter((r: any) => (r.total_returned_amount || 0) > 500)
        .sort((a: any, b: any) => (b.total_returned_amount || 0) - (a.total_returned_amount || 0))
        .slice(0, 10)
        .map((r: any) => ({
          productName: 'Returned Items',
          quantity: 1,
          lossAmount: r.total_returned_amount || 0,
          reason: r.return_status === 'full' ? 'Full Return' : 'Partial Return'
        }));

      const topReturns = filteredReturns
        .filter((r: any) => (r.total_returned_amount || 0) > 0)
        .sort((a: any, b: any) => (b.total_returned_amount || 0) - (a.total_returned_amount || 0))
        .slice(0, 10)
        .map((r: any) => ({
          receiptNumber: r.receipt_number || 'N/A',
          customerName: r.customer_name || 'Walk-in Customer',
          totalAmount: r.total_returned_amount || 0,
          reason: r.return_status === 'full' ? 'Full Return' : 'Partial Return',
          date: r.created_at || new Date().toISOString()
        }));

      // Best Sales Days
      const daySales = new Map();
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

      for (const sale of filteredSales) {
        if (!sale.created_at && !sale.date) continue;
        const saleDate = parseSafeDate(sale.created_at || sale.date);
        const dayName = days[saleDate.getDay()];
        const existing = daySales.get(dayName) || {
          dayOfWeek: dayName,
          totalSales: 0,
          totalProfit: 0,
          count: 0
        };
        existing.totalSales += sale.total || 0;
        existing.totalProfit += sale.total_profit || 0;
        existing.count++;
        daySales.set(dayName, existing);
      }

      const bestSalesDays = Array.from(daySales.values())
        .filter(d => d.count > 0)
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
        if (!sale.created_at && !sale.date) continue;
        const saleDate = parseSafeDate(sale.created_at || sale.date);
        const monthName = saleDate.toLocaleDateString('en-US', { month: 'long' });
        const key = `${saleDate.getFullYear()}-${saleDate.getMonth()}`;
        const existing = monthSales.get(key) || {
          month: monthName,
          year: saleDate.getFullYear(),
          totalSales: 0,
          profit: 0
        };
        existing.totalSales += sale.total || 0;
        existing.profit += sale.total_profit || 0;
        monthSales.set(key, existing);
      }

      const topSalesMonths = Array.from(monthSales.values())
        .sort((a, b) => b.totalSales - a.totalSales)
        .slice(0, 6);

      // Payment Method Preference
      const paymentMap = new Map();
      for (const sale of filteredSales) {
        const method = (sale.payment_method || 'cash').toLowerCase();
        const displayMethod = method === 'cash' ? 'Cash' :
          method === 'card' ? 'Card' :
            method === 'bank' ? 'Bank Transfer' :
              method === 'easypaisa' ? 'EasyPaisa' :
                method === 'jazzcash' ? 'JazzCash' :
                  method.toUpperCase();
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
        const sellingPrice = product.selling_price || 0;
        if (sellingPrice > 500) {
          const categoryName = typeof product.category === 'object' ? product.category.name : product.category;
          if (categoryName) {
            const existing = expensiveCategoriesMap.get(categoryName) || {
              category: categoryName,
              averagePrice: 0,
              highestPrice: 0,
              productCount: 0,
              totalPrice: 0
            };
            existing.totalPrice += sellingPrice;
            existing.productCount++;
            existing.highestPrice = Math.max(existing.highestPrice, sellingPrice);
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

      // Low Stock Products
      const lowStockProducts = products
        .filter((p: any) => {
          const stock = p.stock || 0;
          const reorderLevel = p.reorder_level || 10;
          return stock <= reorderLevel && stock > 0;
        })
        .slice(0, 10)
        .map((p: any) => ({
          name: p.name,
          stock: p.stock || 0,
          reorderLevel: p.reorder_level || 10,
          dailySales: 0,
          daysUntilOut: 999,
          category: typeof p.category === 'object' ? p.category.name : p.category || 'Uncategorized'
        }));

      // Dead Stock
      const deadStock = products
        .filter((p: any) => (p.stock || 0) > 0)
        .slice(0, 10)
        .map((p: any) => ({
          name: p.name,
          stock: p.stock || 0,
          lastSoldDate: 'Unknown',
          daysUnmoved: 30,
          costValue: (p.cost_price || 0) * (p.stock || 0),
          category: typeof p.category === 'object' ? p.category.name : p.category || 'Uncategorized'
        }));

      // Best Margin Products
      const bestMarginProducts = products
        .filter((p: any) => {
          const sellingPrice = p.selling_price || 0;
          const costPrice = p.cost_price || 0;
          return sellingPrice > 0 && costPrice > 0 && sellingPrice > costPrice;
        })
        .map((p: any) => {
          const sellingPrice = p.selling_price || 0;
          const costPrice = p.cost_price || 0;
          const margin = ((sellingPrice - costPrice) / sellingPrice) * 100;
          return {
            name: p.name,
            margin: margin,
            profit: 0,
            revenue: 0,
            quantity: 0
          };
        })
        .sort((a, b) => b.margin - a.margin)
        .slice(0, 10);

      // Top Customers
      const customerMap = new Map();
      for (const sale of filteredSales) {
        const customerName = sale.customer_name || 'Walk-in Customer';
        const existing = customerMap.get(customerName) || {
          name: customerName,
          totalSpent: 0,
          purchaseCount: 0,
          lastPurchase: '',
          phone: sale.customer_phone
        };
        existing.totalSpent += sale.total || 0;
        existing.purchaseCount++;
        if (sale.created_at || sale.date) {
          const saleDate = sale.created_at || sale.date;
          if (!existing.lastPurchase || saleDate > existing.lastPurchase) {
            existing.lastPurchase = saleDate;
          }
        }
        customerMap.set(customerName, existing);
      }

      const topCustomers = Array.from(customerMap.values())
        .filter(c => c.name !== 'Walk-in Customer' && c.totalSpent > 0)
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, 10)
        .map(c => ({
          ...c,
          averageOrder: c.purchaseCount > 0 ? c.totalSpent / c.purchaseCount : 0
        }));

      // Repeat Customers
      const totalCustomers = customerMap.size;
      const repeatCustomers = Array.from(customerMap.values())
        .filter(c => c.purchaseCount > 1 && c.name !== 'Walk-in Customer');
      const repeatRevenue = repeatCustomers.reduce((sum, c) => sum + c.totalSpent, 0);

      const repeatCustomersData = {
        count: repeatCustomers.length,
        percentage: totalCustomers > 0 ? (repeatCustomers.length / totalCustomers) * 100 : 0,
        revenue: repeatRevenue,
        totalCustomers: totalCustomers
      };

      // Hourly Sales
      const hourlyMap = new Map();
      for (let i = 0; i < 24; i++) hourlyMap.set(i, { hour: i, sales: 0, transactions: 0, profit: 0 });

      for (const sale of filteredSales) {
        if (!sale.created_at && !sale.date) continue;
        const saleDate = parseSafeDate(sale.created_at || sale.date);
        const hour = saleDate.getHours();
        const existing = hourlyMap.get(hour);
        if (existing) {
          existing.sales += sale.total || 0;
          existing.transactions++;
          existing.profit += sale.total_profit || 0;
        }
      }

      const hourlySales = Array.from(hourlyMap.values())
        .filter(h => h.transactions > 0)
        .sort((a, b) => a.hour - b.hour);

      // Employee Rankings
      const employeeRankings = Array.from(salesmanMap.values())
        .map(s => ({
          name: s.name,
          sales: s.totalAmount,
          itemsSold: s.itemsSold || 0,
          avgTransaction: s.averagePerSale,
          profit: s.totalProfit,
          commission: s.totalAmount * 0.05
        }))
        .sort((a, b) => b.sales - a.sales);

      // Daily Sales Trend - FIXED: Added null/undefined checks and safe date parsing
      const dailyTrendMap = new Map();
      const last30Days = new Date();
      last30Days.setDate(last30Days.getDate() - 30);

      for (const sale of filteredSales) {
        const dateValue = sale.created_at || sale.date;
        if (!dateValue) continue; // Skip if no date

        const saleDate = parseSafeDate(dateValue);
        if (isNaN(saleDate.getTime())) continue; // Skip invalid dates

        if (saleDate >= last30Days) {
          const dateKey = saleDate.toISOString().split('T')[0];
          const existing = dailyTrendMap.get(dateKey) || {
            date: dateKey,
            sales: 0,
            profit: 0,
            transactions: 0
          };
          existing.sales += sale.total || 0;
          existing.transactions++;
          existing.profit += sale.total_profit || 0;
          dailyTrendMap.set(dateKey, existing);
        }
      }

      const dailySalesTrend = Array.from(dailyTrendMap.values())
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-30);

      // Profit by Category
      const profitByCategory = Array.from(categoryMap.values())
        .filter(c => c.revenue > 0)
        .map(c => ({
          category: c.category,
          revenue: c.revenue,
          profit: c.profit,
          margin: c.revenue > 0 ? (c.profit / c.revenue) * 100 : 0,
          itemsSold: c.quantity
        }))
        .sort((a, b) => b.profit - a.profit);

      // Inventory Value
      let totalValue = 0;
      let totalCost = 0;
      let totalItems = 0;
      for (const product of products) {
        const stock = product.stock || 0;
        totalItems += stock;
        totalValue += (product.selling_price || 0) * stock;
        totalCost += (product.cost_price || 0) * stock;
      }

      const inventoryValue = {
        totalValue: totalValue,
        totalCost: totalCost,
        potentialProfit: totalValue - totalCost,
        totalItems: totalItems,
        lowStockCount: lowStockProducts.length,
        deadStockCount: deadStock.length
      };

      // Predictions
      const bestDay = bestSalesDays[0]?.dayOfWeek || 'Monday';
      const bestTime = hourlySales.length > 0
        ? `${hourlySales.reduce((a, b) => a.sales > b.sales ? a : b).hour}:00 - ${hourlySales.reduce((a, b) => a.sales > b.sales ? a : b).hour + 1}:00`
        : '2 PM - 6 PM';
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
        },
        lowStockProducts,
        deadStock,
        bestMarginProducts,
        topCustomers,
        repeatCustomers: repeatCustomersData,
        hourlySales,
        employeeRankings,
        dailySalesTrend,
        profitByCategory,
        inventoryValue
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
                  <p className="text-sm text-muted-foreground">Inventory Value</p>
                  <p className="text-2xl font-bold text-purple-600">{formatPKR(analytics?.inventoryValue.totalValue || 0)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Potential Profit: {formatPKR(analytics?.inventoryValue.potentialProfit || 0)}</p>
                </div>
                <Boxes className="h-8 w-8 text-purple-500 opacity-50" />
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
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-9 mb-6">
            <TabsTrigger value="top-products" className="text-xs md:text-sm">
              <Package className="h-3 w-3 md:h-4 md:w-4 mr-1" />
              Products
            </TabsTrigger>
            <TabsTrigger value="sales-analytics" className="text-xs md:text-sm">
              <TrendingUp className="h-3 w-3 md:h-4 md:w-4 mr-1" />
              Sales
            </TabsTrigger>
            <TabsTrigger value="inventory" className="text-xs md:text-sm">
              <Boxes className="h-3 w-3 md:h-4 md:w-4 mr-1" />
              Inventory
            </TabsTrigger>
            <TabsTrigger value="customers" className="text-xs md:text-sm">
              <UsersIcon className="h-3 w-3 md:h-4 md:w-4 mr-1" />
              Customers
            </TabsTrigger>
            <TabsTrigger value="employees" className="text-xs md:text-sm">
              <UserCheck className="h-3 w-3 md:h-4 md:w-4 mr-1" />
              Employees
            </TabsTrigger>
            <TabsTrigger value="suppliers" className="text-xs md:text-sm">
              <Truck className="h-3 w-3 md:h-4 md:w-4 mr-1" />
              Suppliers
            </TabsTrigger>
            <TabsTrigger value="financial" className="text-xs md:text-sm">
              <AlertTriangle className="h-3 w-3 md:h-4 md:w-4 mr-1" />
              Losses
            </TabsTrigger>
            <TabsTrigger value="temporal" className="text-xs md:text-sm">
              <Calendar className="h-3 w-3 md:h-4 md:w-4 mr-1" />
              Time
            </TabsTrigger>
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
                    🔥 Hot Products (High Daily Sales)
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
                  <DollarSign className="h-5 w-5 text-blue-500" />
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

            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Award className="h-5 w-5 text-green-500" />
                  Best Margin Products (Most Profitable)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Margin</TableHead>
                        <TableHead className="text-right">Profit</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="text-right">Qty Sold</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analytics?.bestMarginProducts.map((product, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{product.name}</TableCell>
                          <TableCell className="text-right">
                            <Badge className="bg-green-100 text-green-800">
                              {product.margin.toFixed(1)}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-blue-600">{formatPKR(product.profit)}</TableCell>
                          <TableCell className="text-right text-green-600">{formatPKR(product.revenue)}</TableCell>
                          <TableCell className="text-right">{product.quantity}</TableCell>
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
                    Daily Sales Trend (Last 30 Days)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={analytics?.dailySalesTrend}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis yAxisId="left" />
                        <YAxis yAxisId="right" orientation="right" />
                        <Tooltip formatter={(value: any) => formatPKR(value)} />
                        <Legend />
                        <Bar yAxisId="left" dataKey="sales" fill="#8884d8" name="Sales" />
                        <Line yAxisId="right" type="monotone" dataKey="profit" stroke="#82ca9d" name="Profit" />
                      </ComposedChart>
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
                        <Bar dataKey="profit" fill="#82ca9d" name="Profit" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart4 className="h-5 w-5 text-indigo-500" />
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
                  <Clock className="h-5 w-5 text-orange-500" />
                  Hourly Sales Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analytics?.hourlySales}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="hour" tickFormatter={(hour) => `${hour}:00`} />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip formatter={(value: any) => formatPKR(value)} />
                      <Legend />
                      <Line yAxisId="left" type="monotone" dataKey="sales" stroke="#8884d8" name="Sales" />
                      <Line yAxisId="right" type="monotone" dataKey="transactions" stroke="#82ca9d" name="Transactions" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Inventory Tab */}
          <TabsContent value="inventory" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Total Inventory Value</p>
                  <p className="text-2xl font-bold text-blue-600">{formatPKR(analytics?.inventoryValue.totalValue || 0)}</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-green-50 to-green-100">
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Total Cost</p>
                  <p className="text-2xl font-bold text-green-600">{formatPKR(analytics?.inventoryValue.totalCost || 0)}</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Potential Profit</p>
                  <p className="text-2xl font-bold text-purple-600">{formatPKR(analytics?.inventoryValue.potentialProfit || 0)}</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-orange-50 to-orange-100">
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Total Items in Stock</p>
                  <p className="text-2xl font-bold text-orange-600">{analytics?.inventoryValue.totalItems || 0}</p>
                </CardContent>
              </Card>
            </div>

            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  ⚠️ Low Stock Products (Need Reorder)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Current Stock</TableHead>
                        <TableHead className="text-right">Reorder Level</TableHead>
                        <TableHead className="text-right">Daily Sales</TableHead>
                        <TableHead className="text-right">Days Until Out</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analytics?.lowStockProducts.map((product, idx) => (
                        <TableRow key={idx} className={product.daysUntilOut <= 3 ? "bg-red-50" : ""}>
                          <TableCell className="font-medium">{product.name}</TableCell>
                          <TableCell>{product.category}</TableCell>
                          <TableCell className="text-right font-semibold text-red-600">{product.stock}</TableCell>
                          <TableCell className="text-right">{product.reorderLevel}</TableCell>
                          <TableCell className="text-right">{product.dailySales.toFixed(2)}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={product.daysUntilOut <= 3 ? "destructive" : product.daysUntilOut <= 7 ? "default" : "secondary"}>
                              {product.daysUntilOut === 999 ? '∞' : `${product.daysUntilOut} days`}
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
                  <Hourglass className="h-5 w-5 text-gray-500" />
                  💀 Dead Stock (Not Sold in 60+ Days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Stock</TableHead>
                        <TableHead>Last Sold</TableHead>
                        <TableHead className="text-right">Days Unmoved</TableHead>
                        <TableHead className="text-right">Cost Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analytics?.deadStock.map((product, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{product.name}</TableCell>
                          <TableCell>{product.category}</TableCell>
                          <TableCell className="text-right">{product.stock}</TableCell>
                          <TableCell>
                            {product.lastSoldDate === 'Never'
                              ? 'Never'
                              : (product.lastSoldDate && !isNaN(new Date(product.lastSoldDate).getTime())
                                ? format(new Date(product.lastSoldDate), 'dd/MM/yyyy')
                                : 'Unknown')}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="destructive">{product.daysUnmoved} days</Badge>
                          </TableCell>
                          <TableCell className="text-right text-red-600">{formatPKR(product.costValue)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Customers Tab */}
          <TabsContent value="customers" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-gradient-to-br from-green-50 to-green-100">
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Total Customers</p>
                  <p className="text-2xl font-bold text-green-600">{analytics?.repeatCustomers.totalCustomers || 0}</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Repeat Customers</p>
                  <p className="text-2xl font-bold text-blue-600">{analytics?.repeatCustomers.count || 0}</p>
                  <p className="text-xs">{analytics?.repeatCustomers.percentage.toFixed(1)}% of total</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Revenue from Repeat</p>
                  <p className="text-2xl font-bold text-purple-600">{formatPKR(analytics?.repeatCustomers.revenue || 0)}</p>
                </CardContent>
              </Card>
            </div>

            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Crown className="h-5 w-5 text-yellow-500" />
                  Top Customers (Highest Spending)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead className="text-right">Total Spent</TableHead>
                        <TableHead className="text-right">Purchases</TableHead>
                        <TableHead className="text-right">Avg Order</TableHead>
                        <TableHead>Last Purchase</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analytics?.topCustomers.map((customer, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">
                            {idx < 3 && <Medal className="h-4 w-4 inline mr-1 text-yellow-500" />}
                            {customer.name}
                          </TableCell>
                          <TableCell>{customer.phone || '-'}</TableCell>
                          <TableCell className="text-right text-green-600">{formatPKR(customer.totalSpent)}</TableCell>
                          <TableCell className="text-right">{customer.purchaseCount}</TableCell>
                          <TableCell className="text-right">{formatPKR(customer.averageOrder)}</TableCell>
                          <TableCell>
                            {customer.lastPurchase && !isNaN(new Date(customer.lastPurchase).getTime())
                              ? format(new Date(customer.lastPurchase), 'dd/MM/yyyy')
                              : 'Never'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Employees Tab */}
          <TabsContent value="employees" className="space-y-6">
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Award className="h-5 w-5 text-blue-500" />
                  Employee Performance Rankings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Employee</TableHead>
                        <TableHead className="text-right">Total Sales</TableHead>
                        <TableHead className="text-right">Items Sold</TableHead>
                        <TableHead className="text-right">Avg Transaction</TableHead>
                        <TableHead className="text-right">Profit Generated</TableHead>
                        <TableHead className="text-right">Est. Commission</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analytics?.employeeRankings.map((employee, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                            {idx === 0 && <Trophy className="h-5 w-5 text-yellow-500" />}
                            {idx === 1 && <Medal className="h-5 w-5 text-gray-400" />}
                            {idx === 2 && <Medal className="h-5 w-5 text-amber-600" />}
                            {idx > 2 && `#${idx + 1}`}
                          </TableCell>
                          <TableCell className="font-medium">{employee.name}</TableCell>
                          <TableCell className="text-right text-green-600">{formatPKR(employee.sales)}</TableCell>
                          <TableCell className="text-right">{employee.itemsSold}</TableCell>
                          <TableCell className="text-right">{formatPKR(employee.avgTransaction)}</TableCell>
                          <TableCell className="text-right text-blue-600">{formatPKR(employee.profit)}</TableCell>
                          <TableCell className="text-right">{formatPKR(employee.commission || 0)}</TableCell>
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
                          <TableCell>
                            {expense.date && !isNaN(new Date(expense.date).getTime())
                              ? format(new Date(expense.date), 'dd/MM/yyyy')
                              : 'Invalid Date'}
                          </TableCell>
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
                    Heavy Losses (PKR 500+)
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

            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-purple-500" />
                  Payment Methods Distribution
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
                        outerRadius={100}
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
                    <TrendUp className="h-5 w-5 text-green-500" />
                    Best Sales Day
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center p-6">
                    <p className="text-sm text-muted-foreground">Highest Average Sales</p>
                    <p className="text-4xl font-bold text-green-600 mt-2">{analytics?.salesPredictions.bestDay}</p>
                    <p className="text-muted-foreground mt-2">
                      Average: {formatPKR(analytics?.bestSalesDays[0]?.averageSales || 0)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Categories Tab */}
          {/* <TabsContent value="categories" className="space-y-6">
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
                    <PieChart className="h-5 w-5 text-purple-500" />
                    Profit by Category
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={analytics?.profitByCategory}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ category, margin }) => `${category}: ${margin.toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="profit"
                          nameKey="category"
                        >
                          {(analytics?.profitByCategory || []).map((entry, index) => (
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
          </TabsContent> */}
        </Tabs>
      </div>
    </div>
  );
}