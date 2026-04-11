import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatPKR } from "@/lib/currency";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { Link } from "wouter";
import {
  TrendingUp,
  Banknote,
  AlertTriangle,
  Package,
  CreditCard,
  Plus,
  Calculator,
} from "lucide-react";
import { useHeader } from "@/contexts/HeaderContext";
import { api } from "../services/electron-api";

export default function Home() {
  const { toast } = useToast();
  const [isAuthenticated, setIsAuthenticated] = useState(true); // Electron app is always authenticated


  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboardStats"],
    queryFn: async () => {
      const result = await api.getDashboardStats();
      if (result?.success && result.data) return result.data;
      return result;
    },
  });

  // Fetch recent sales
  const { data: recentSales, isLoading: salesLoading } = useQuery({
    queryKey: ["recentSales"],
    queryFn: async () => {
      const result = await api.getSales();
      let sales = [];
      if (Array.isArray(result)) {
        sales = result;
      } else if (result?.success && Array.isArray(result.data)) {
        sales = result.data;
      }
      // Sort by created_at descending and take first 3
      return sales.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 3);
    },
  });

  const { setTitle, setSubtitle } = useHeader();

  useEffect(() => {
    setTitle("Dashboard");
    setSubtitle("Welcome to POS Desktop App");
  }, []);

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <main className="flex-1 overflow-auto p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Today's Sales</p>
                  <p className="text-2xl font-bold text-foreground">
                    {formatPKR(stats?.todaySales || 0)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-secondary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Sales</p>
                  <p className="text-2xl font-bold text-foreground">
                    {formatPKR(stats?.totalSales || 0)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Banknote className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Low Stock Items</p>
                  <p className="text-2xl font-bold text-destructive">
                    {stats?.lowStockCount || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-destructive/10 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-destructive" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Products</p>
                  <p className="text-2xl font-bold text-foreground">
                    {stats?.totalProducts || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                  <Package className="h-6 w-6 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity and Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Recent Sales */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Recent Sales</CardTitle>
                  <Link href="/sales">
                    <Button variant="ghost" size="sm" data-testid="button-view-all-sales">
                      View All
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {salesLoading ? (
                    <div className="text-center py-4">
                      <p className="text-muted-foreground">Loading recent sales...</p>
                    </div>
                  ) : !recentSales || recentSales.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No recent sales found</p>
                    </div>
                  ) : (
                    recentSales.map((sale: any) => (
                      <div
                        key={sale.id}
                        className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                            <CreditCard className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">
                              Receipt #{sale.receipt_number}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {sale.customer_name || "Walk-in Customer"}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-foreground">
                            {formatPKR(sale.total)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(sale.created_at).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Link href="/pos">
                  <Button className="w-full justify-start" data-testid="button-open-pos">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Open POS
                  </Button>
                </Link>

                <Link href="/products">
                  <Button
                    variant="secondary"
                    className="w-full justify-start"
                    data-testid="button-add-product"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Product
                  </Button>
                </Link>

                <Link href="/expenses">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    data-testid="button-manage-expenses"
                  >
                    <Calculator className="h-4 w-4 mr-2" />
                    Manage Expenses
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Low Stock Alerts */}
        {stats?.lowStockCount > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Low Stock Alerts</CardTitle>
                <Badge variant="destructive">{stats.lowStockCount} Items</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-muted-foreground text-center py-4">
                  {stats.lowStockCount} products are running low on stock. 
                  Please check inventory and reorder soon.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}