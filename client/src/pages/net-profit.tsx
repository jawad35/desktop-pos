// pages/profit-dashboard.tsx
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatPKR } from "@/lib/currency";
import { format } from "date-fns";
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  CalendarIcon
} from "lucide-react";
import { useHeader } from "@/contexts/HeaderContext";
import { useToast } from "@/hooks/use-toast";
import { api } from "../services/electron-api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";

export default function ProfitDashboard() {
  const [dateRange, setDateRange] = useState({
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
  });
  const [profitData, setProfitData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { setTitle, setSubtitle } = useHeader();

  useEffect(() => {
    setTitle("Profit Dashboard");
    setSubtitle("Track your business performance");
  }, []);

  useEffect(() => {
    fetchProfitData();
  }, [dateRange]);

  const fetchProfitData = async () => {
    setIsLoading(true);
    try {
      const data = await api.getProfitData(dateRange.startDate, dateRange.endDate);
      setProfitData(data);
    } catch (error: any) {
      console.error("Error fetching profit data:", error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const applyQuickFilter = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    setDateRange({
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd'),
    });
  };

  if (isLoading || !profitData) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Loading profit data...</span>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <main className="flex-1 overflow-auto p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Profit Dashboard</h1>
            <p className="text-muted-foreground">
              {format(new Date(dateRange.startDate), 'dd MMM yyyy')} - {format(new Date(dateRange.endDate), 'dd MMM yyyy')}
            </p>
          </div>
          <Button onClick={fetchProfitData} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Quick Filters */}
        <div className="flex gap-2 mb-6">
          <Button variant="outline" size="sm" onClick={() => applyQuickFilter(1)}>Today</Button>
          <Button variant="outline" size="sm" onClick={() => applyQuickFilter(7)}>Last 7 Days</Button>
          <Button variant="outline" size="sm" onClick={() => applyQuickFilter(30)}>Last 30 Days</Button>
          <Button variant="outline" size="sm" onClick={() => applyQuickFilter(90)}>Last 90 Days</Button>
        </div>

        {/* Date Range Picker */}
        <div className="grid grid-cols-2 gap-4 mb-6">
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

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <Card className="bg-green-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Sales</p>
                  <p className="text-2xl font-bold text-green-600">{formatPKR(profitData.summary.totalSales)}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-red-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">COGS</p>
                  <p className="text-2xl font-bold text-red-600">{formatPKR(profitData.summary.totalCOGS)}</p>
                </div>
                <TrendingDown className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-orange-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Expenses + Salaries</p>
                  <p className="text-2xl font-bold text-orange-600">{formatPKR(profitData.summary.totalExpenses + profitData.summary.totalSalaries)}</p>
                </div>
                <TrendingDown className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-blue-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Net Profit</p>
                  <p className={`text-2xl font-bold ${profitData.summary.netProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                    {formatPKR(profitData.summary.netProfit)}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Tables */}
        <Tabs defaultValue="sales" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="sales">Sales & Profit</TabsTrigger>
            <TabsTrigger value="salaries">Salaries</TabsTrigger>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
          </TabsList>

          <TabsContent value="sales">
            <Card>
              <CardHeader>
                <CardTitle>Sales Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Profit</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {profitData.sales.map((sale: any) => (
                        <TableRow key={sale.id}>
                          <TableCell>{sale.product_name}</TableCell>
                          <TableCell>{sale.quantity}</TableCell>
                          <TableCell>{formatPKR(sale.unit_price)}</TableCell>
                          <TableCell>{formatPKR(sale.total)}</TableCell>
                          <TableCell className="text-green-600">{formatPKR(sale.profit)}</TableCell>
                          <TableCell>{format(new Date(sale.sale_date), 'dd/MM/yyyy')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="salaries">
            <Card>
              <CardHeader>
                <CardTitle>Salaries Paid</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Salaries are spread across month days. Only the days within selected period are counted.
                </p>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Net Salary</TableHead>
                        <TableHead>Payment Date</TableHead>
                        <TableHead>Daily Rate</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {profitData.salaries.map((salary: any) => (
                        <TableRow key={salary.id}>
                          <TableCell>{salary.employee_name}</TableCell>
                          <TableCell>{formatPKR(salary.net_salary)}</TableCell>
                          <TableCell>{format(new Date(salary.payment_date), 'dd/MM/yyyy')}</TableCell>
                          <TableCell className="text-muted-foreground">{salary.note}</TableCell>
                          <TableCell><Badge className="bg-green-100 text-green-800">Paid</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="expenses">
            <Card>
              <CardHeader>
                <CardTitle>Expenses</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Recurring expenses are spread across days. Daily cost shown for recurring items.
                </p>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Frequency</TableHead>
                        <TableHead>Daily Cost</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {profitData.expenses.map((expense: any) => (
                        <TableRow key={expense.id}>
                          <TableCell>{expense.title}</TableCell>
                          <TableCell><Badge variant="outline">{expense.category}</Badge></TableCell>
                          <TableCell className="text-red-600">{formatPKR(expense.amount)}</TableCell>
                          <TableCell className="capitalize">{expense.frequency || 'one-time'}</TableCell>
                          <TableCell>
                            {expense.is_recurring ? formatPKR(expense.daily_cost) + '/day' : '-'}
                          </TableCell>
                          <TableCell>{format(new Date(expense.created_at), 'dd/MM/yyyy')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Profit Calculation Summary */}
        <Card className="mt-6">
    <CardHeader>
        <CardTitle>Profit Calculation</CardTitle>
    </CardHeader>
    <CardContent>
        <div className="space-y-2 text-sm">
            <div className="flex justify-between">
                <span>Total Sales:</span>
                <span>{formatPKR(profitData.summary.totalSales)}</span>
            </div>
            <div className="flex justify-between">
                <span>Less: Cost of Goods Sold (COGS):</span>
                <span className="text-red-600">-{formatPKR(profitData.summary.totalCOGS)}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
                <span className="font-semibold">Gross Profit:</span>
                <span className="font-semibold text-green-600">{formatPKR(profitData.summary.grossProfit)}</span>
            </div>
            <div className="flex justify-between">
                <span>Less: Salaries (spread over {profitData.period.days} days):</span>
                <span className="text-red-600">-{formatPKR(profitData.summary.totalSalaries)}</span>
            </div>
            <div className="flex justify-between">
                <span>Less: Operating Expenses (recurring spread):</span>
                <span className="text-red-600">-{formatPKR(profitData.summary.totalExpenses)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t font-bold">
                <span>Net Profit for {format(new Date(profitData.period.startDate), 'dd MMM')} - {format(new Date(profitData.period.endDate), 'dd MMM yyyy')}:</span>
                <span className={profitData.summary.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {formatPKR(profitData.summary.netProfit)}
                </span>
            </div>
            <div className="mt-4 p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground">
                <p>📌 <strong>How it's calculated:</strong></p>
                <p>• Monthly salaries are divided by days in that month, then multiplied by days in selected period</p>
                <p>• Recurring expenses (monthly, weekly, yearly) are spread across days</p>
                <p>• One-time expenses are counted fully on their date</p>
                <p>• Sales profit is calculated at transaction time (selling price - cost price)</p>
            </div>
        </div>
    </CardContent>
</Card>
      </main>
    </div>
  );
}