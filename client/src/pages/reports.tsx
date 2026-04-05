import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPKR } from "@/lib/currency";
import { Calendar, Download, BarChart3, TrendingUp, DollarSign, Package } from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { Sale, Product, Expense, DashboardStats } from "@/types/api";
import { useHeader } from "@/contexts/HeaderContext";

export default function Reports() {
  const [dateRange, setDateRange] = useState({
    startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  });

  const { data: sales = [] } = useQuery<Sale[]>({
    queryKey: ["/api/sales", dateRange],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (dateRange.startDate) queryParams.append("startDate", dateRange.startDate);
      if (dateRange.endDate) queryParams.append("endDate", dateRange.endDate);

      const url = `/api/sales?${queryParams.toString()}`;
      const token = localStorage.getItem("token");

      const response = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      });

      if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);
      return response.json();
    },
  });


  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: expenses = [] } = useQuery<Expense[]>({
    queryKey: ["/api/expenses", dateRange],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (dateRange.startDate) queryParams.append("startDate", dateRange.startDate);
      if (dateRange.endDate) queryParams.append("endDate", dateRange.endDate);

      const url = `/api/expenses?${queryParams.toString()}`;
      const token = localStorage.getItem("token");

      const response = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      });

      if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);
      return response.json();
    },
  });


  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  // Calculate metrics
  const totalRevenue = sales.reduce((sum: number, sale: any) => sum + parseFloat(sale.total || 0), 0);
  const totalExpenses = expenses.reduce((sum: number, expense: any) => sum + parseFloat(expense.amount || 0), 0);
  const profit = totalRevenue - totalExpenses;

  const lowStockItems = products.filter((p: any) => p.stock <= p.minStock);
  const outOfStockItems = products.filter((p: any) => p.stock === 0);

  // Top products by sales
  const productSales = sales.reduce((acc: any, sale: any) => {
    if (sale.items) {
      sale.items.forEach((item: any) => {
        if (!acc[item.productId]) {
          acc[item.productId] = { quantity: 0, revenue: 0, name: item.product?.name || 'Unknown' };
        }
        acc[item.productId].quantity += item.quantity;
        acc[item.productId].revenue += parseFloat(item.total || 0);
      });
    }
    return acc;
  }, {});

  const topProducts = Object.entries(productSales)
    .map(([id, data]: [string, any]) => ({ id, ...data }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  const handleExportReport = async () => {
    try {
      const reportData = {
        summary: {
          totalRevenue,
          totalExpenses,
          profit,
          totalSales: sales.length,
          totalProducts: products.length,
          lowStockItems: lowStockItems.length,
          outOfStockItems: outOfStockItems.length,
        },
        topProducts,
        dateRange,
        generatedAt: new Date().toISOString(),
      };

      const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `business-report-${format(new Date(), 'yyyy-MM-dd')}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const { setTitle, setSubtitle } = useHeader();

  useEffect(() => {
    setTitle("Reports & Analytics");
    setSubtitle("Business performance insights");
  }, []);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <main className="flex-1 overflow-auto p-6">
        {/* Date Range Filter */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Report Period
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Start Date
                </label>
                <Input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                  data-testid="input-report-start-date"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  End Date
                </label>
                <Input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                  data-testid="input-report-end-date"
                />
              </div>
              <div className="pt-6">
                <Button onClick={handleExportReport} variant="outline" data-testid="button-export-report">
                  <Download className="h-4 w-4 mr-2" />
                  Export Report
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold text-secondary">{formatPKR(totalRevenue)}</p>
                </div>
                <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-secondary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Expenses</p>
                  <p className="text-2xl font-bold text-destructive">{formatPKR(totalExpenses)}</p>
                </div>
                <div className="w-12 h-12 bg-destructive/10 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-destructive" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Net Profit</p>
                  <p className={`text-2xl font-bold ${profit >= 0 ? 'text-secondary' : 'text-destructive'}`}>
                    {formatPKR(profit)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Sales</p>
                  <p className="text-2xl font-bold text-foreground">{sales.length}</p>
                </div>
                <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                  <Package className="h-6 w-6 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Inventory Status */}
          <Card>
            <CardHeader>
              <CardTitle>Inventory Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Products:</span>
                  <span className="font-semibold">{products.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Low Stock Items:</span>
                  <span className="font-semibold text-destructive">{lowStockItems.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Out of Stock:</span>
                  <span className="font-semibold text-destructive">{outOfStockItems.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">In Stock:</span>
                  <span className="font-semibold text-secondary">
                    {products.length - outOfStockItems.length}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top Products */}
          <Card>
            <CardHeader>
              <CardTitle>Top Selling Products</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topProducts.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    No sales data available for this period
                  </p>
                ) : (
                  topProducts.map((product, index) => (
                    <div key={product.id} className="flex justify-between items-center">
                      <div>
                        <span className="text-sm font-medium">{product.name}</span>
                        <p className="text-xs text-muted-foreground">
                          {product.quantity} units sold
                        </p>
                      </div>
                      <span className="font-semibold">{formatPKR(product.revenue)}</span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Placeholder */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Sales Trend (Last 30 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-muted/30 rounded-lg flex items-center justify-center">
                <p className="text-muted-foreground">Chart visualization will be implemented here</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Category Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-muted/30 rounded-lg flex items-center justify-center">
                <p className="text-muted-foreground">Pie chart will be implemented here</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
