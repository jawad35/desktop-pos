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
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Calendar,
  Package,
  Users,
  FileText,
  Filter
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";

export default function ProfitDashboard() {
  const [dateRange, setDateRange] = useState({
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
  });
  const [profitData, setProfitData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("sales");
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // Search states
  const [searchSales, setSearchSales] = useState("");
  const [searchSalaries, setSearchSalaries] = useState("");
  const [searchExpenses, setSearchExpenses] = useState("");
  
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
      setCurrentPage(1); // Reset to first page when data changes
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

  const applyYearFilter = (year: number) => {
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31);
    setDateRange({
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd'),
    });
  };

  // Filter and paginate sales data
  const filteredSales = profitData?.sales?.filter((sale: any) => 
    sale.product_name?.toLowerCase().includes(searchSales.toLowerCase())
  ) || [];
  
  const paginatedSales = filteredSales.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  
  const totalSalesPages = Math.ceil(filteredSales.length / itemsPerPage);

  // Filter and paginate salaries data
  const filteredSalaries = profitData?.salaries?.filter((salary: any) => 
    salary.employee_name?.toLowerCase().includes(searchSalaries.toLowerCase())
  ) || [];
  
  const paginatedSalaries = filteredSalaries.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  
  const totalSalariesPages = Math.ceil(filteredSalaries.length / itemsPerPage);

  // Filter and paginate expenses data
  const filteredExpenses = profitData?.expenses?.filter((expense: any) => 
    expense.title?.toLowerCase().includes(searchExpenses.toLowerCase())
  ) || [];
  
  const paginatedExpenses = filteredExpenses.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  
  const totalExpensesPages = Math.ceil(filteredExpenses.length / itemsPerPage);

  const handlePageChange = (page: number, total: number) => {
    if (page >= 1 && page <= total) {
      setCurrentPage(page);
    }
  };

  if (isLoading || !profitData) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Loading profit data...</span>
      </div>
    );
  }

  const getTotalPages = () => {
    if (activeTab === "sales") return totalSalesPages;
    if (activeTab === "salaries") return totalSalariesPages;
    return totalExpensesPages;
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
      <main className="flex-1 overflow-auto p-4 lg:p-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Profit Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              {format(new Date(dateRange.startDate), 'dd MMM yyyy')} - {format(new Date(dateRange.endDate), 'dd MMM yyyy')}
            </p>
          </div>
          <Button onClick={fetchProfitData} disabled={isLoading} className="shadow-lg">
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Quick Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Button variant="outline" size="sm" onClick={() => applyQuickFilter(1)}>Today</Button>
          <Button variant="outline" size="sm" onClick={() => applyQuickFilter(7)}>Last 7 Days</Button>
          <Button variant="outline" size="sm" onClick={() => applyQuickFilter(30)}>Last 30 Days</Button>
          <Button variant="outline" size="sm" onClick={() => applyQuickFilter(90)}>Last 90 Days</Button>
          <Button variant="outline" size="sm" onClick={() => applyYearFilter(new Date().getFullYear())}>
            Current Year
          </Button>
          <Button variant="outline" size="sm" onClick={() => applyYearFilter(new Date().getFullYear() - 1)}>
            Last Year
          </Button>
        </div>

        {/* Date Range Picker */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="text-sm font-medium mb-1 block">Start Date</label>
            <Input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              className="w-full"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">End Date</label>
            <Input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              className="w-full"
            />
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-l-4 border-l-green-500 shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Sales</p>
                  <p className="text-2xl lg:text-3xl font-bold text-green-600 dark:text-green-400">
                    {formatPKR(profitData.summary.totalSales)}
                  </p>
                </div>
               
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 border-l-4 border-l-red-500 shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">COGS</p>
                  <p className="text-2xl lg:text-3xl font-bold text-red-600 dark:text-red-400">
                    {formatPKR(profitData.summary.totalCOGS)}
                  </p>
                </div>
                
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-l-4 border-l-orange-500 shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="p-6">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Expenses + Salaries</p>
                <p className="text-2xl lg:text-3xl font-bold text-orange-600 dark:text-orange-400">
                  {formatPKR(profitData.summary.totalExpenses + profitData.summary.totalSalaries)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-l-4 border-l-blue-500 shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Net Profit</p>
                  <p className={`text-2xl lg:text-3xl font-bold ${profitData.summary.netProfit >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>
                    {formatPKR(profitData.summary.netProfit)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Tables */}
        <Tabs defaultValue="sales" className="w-full" onValueChange={(value) => {
          setActiveTab(value);
          setCurrentPage(1);
        }}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="sales" className="flex items-center gap-2">
              Sales & Profit
            </TabsTrigger>
            <TabsTrigger value="salaries" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Salaries
            </TabsTrigger>
            <TabsTrigger value="expenses" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Expenses
            </TabsTrigger>
          </TabsList>

          {/* Sales Tab */}
          <TabsContent value="sales">
            <Card className="shadow-lg">
              <CardHeader>
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                  <CardTitle className="text-xl">Sales Breakdown</CardTitle>
                  <div className="relative w-full lg:w-96">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by product name..."
                      value={searchSales}
                      onChange={(e) => {
                        setSearchSales(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="pl-10"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-center">Qty</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Profit</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedSales.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground">
                            No sales found
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedSales.map((sale: any) => (
                          <TableRow key={sale.id} className="hover:bg-muted/50">
                            <TableCell className="font-medium">{sale.product_name}</TableCell>
                            <TableCell className="text-center">{sale.quantity}</TableCell>
                            <TableCell className="text-right">{formatPKR(sale.unit_price)}</TableCell>
                            <TableCell className="text-right font-semibold">{formatPKR(sale.total)}</TableCell>
                            <TableCell className="text-right text-green-600">{formatPKR(sale.profit)}</TableCell>
                            <TableCell>{format(new Date(sale.sale_date), 'dd/MM/yyyy')}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination for Sales */}
                {totalSalesPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-muted-foreground">
                      Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredSales.length)} of {filteredSales.length} sales
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(1, totalSalesPages)}
                        disabled={currentPage === 1}
                      >
                        <ChevronsLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1, totalSalesPages)}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="flex items-center px-4 text-sm">
                        Page {currentPage} of {totalSalesPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage + 1, totalSalesPages)}
                        disabled={currentPage === totalSalesPages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(totalSalesPages, totalSalesPages)}
                        disabled={currentPage === totalSalesPages}
                      >
                        <ChevronsRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Salaries Tab */}
          <TabsContent value="salaries">
            <Card className="shadow-lg">
              <CardHeader>
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                  <div>
                    <CardTitle className="text-xl">Salaries Paid</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Salaries are spread across month days. Only the days within selected period are counted.
                    </p>
                  </div>
                  <div className="relative w-full lg:w-96">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by employee name..."
                      value={searchSalaries}
                      onChange={(e) => {
                        setSearchSalaries(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="pl-10"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead className="text-right">Net Salary</TableHead>
                        <TableHead>Payment Date</TableHead>
                        <TableHead>Note</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedSalaries.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground">
                            No salaries found
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedSalaries.map((salary: any) => (
                          <TableRow key={salary.id} className="hover:bg-muted/50">
                            <TableCell className="font-medium">{salary.employee_name}</TableCell>
                            <TableCell className="text-right font-semibold">{formatPKR(salary.net_salary)}</TableCell>
                            <TableCell>{format(new Date(salary.payment_date), 'dd/MM/yyyy')}</TableCell>
                            <TableCell className="text-muted-foreground">{salary.note || '-'}</TableCell>
                            <TableCell>
                              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                                Paid
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination for Salaries */}
                {totalSalariesPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-muted-foreground">
                      Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredSalaries.length)} of {filteredSalaries.length} salaries
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(1, totalSalariesPages)}
                        disabled={currentPage === 1}
                      >
                        <ChevronsLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1, totalSalariesPages)}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="flex items-center px-4 text-sm">
                        Page {currentPage} of {totalSalariesPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage + 1, totalSalariesPages)}
                        disabled={currentPage === totalSalariesPages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(totalSalariesPages, totalSalariesPages)}
                        disabled={currentPage === totalSalariesPages}
                      >
                        <ChevronsRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Expenses Tab */}
          <TabsContent value="expenses">
            <Card className="shadow-lg">
              <CardHeader>
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                  <div>
                    <CardTitle className="text-xl">Expenses</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Recurring expenses are spread across days. Daily cost shown for recurring items.
                    </p>
                  </div>
                  <div className="relative w-full lg:w-96">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by expense title..."
                      value={searchExpenses}
                      onChange={(e) => {
                        setSearchExpenses(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="pl-10"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Frequency</TableHead>
                        <TableHead>Daily Cost</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedExpenses.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground">
                            No expenses found
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedExpenses.map((expense: any) => (
                          <TableRow key={expense.id} className="hover:bg-muted/50">
                            <TableCell className="font-medium">{expense.title}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{expense.category}</Badge>
                            </TableCell>
                            <TableCell className="text-right text-red-600 font-semibold">
                              {formatPKR(expense.amount)}
                            </TableCell>
                            <TableCell className="capitalize">{expense.frequency || 'one-time'}</TableCell>
                            <TableCell>
                              {expense.is_recurring ? formatPKR(expense.daily_cost) + '/day' : '-'}
                            </TableCell>
                            <TableCell>{format(new Date(expense.created_at), 'dd/MM/yyyy')}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination for Expenses */}
                {totalExpensesPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-muted-foreground">
                      Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredExpenses.length)} of {filteredExpenses.length} expenses
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(1, totalExpensesPages)}
                        disabled={currentPage === 1}
                      >
                        <ChevronsLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1, totalExpensesPages)}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="flex items-center px-4 text-sm">
                        Page {currentPage} of {totalExpensesPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage + 1, totalExpensesPages)}
                        disabled={currentPage === totalExpensesPages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(totalExpensesPages, totalExpensesPages)}
                        disabled={currentPage === totalExpensesPages}
                      >
                        <ChevronsRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Enhanced Profit Calculation Summary */}
        <Card className="mt-8 shadow-xl bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-950 border-t-4 border-t-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl lg:text-2xl flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-blue-600" />
              Profit Calculation Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Sales Row */}
              <div className="flex justify-between items-center py-2 border-b">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Total Sales</span>
                </div>
                <span className="text-lg font-semibold text-green-600">{formatPKR(profitData.summary.totalSales)}</span>
              </div>

              {/* COGS Row */}
              <div className="flex justify-between items-center py-2 border-b">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
                    <Package className="h-4 w-4 text-red-600" />
                  </div>
                  <span className="font-medium">Less: Cost of Goods Sold (COGS)</span>
                </div>
                <span className="text-lg text-red-600">-{formatPKR(profitData.summary.totalCOGS)}</span>
              </div>

              {/* Gross Profit Row - Highlighted */}
              <div className="flex justify-between items-center py-3 border-b-2 border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-transparent dark:from-blue-950/30 -mx-4 px-4 rounded-lg">
                <span className="font-bold text-base">Gross Profit</span>
                <span className="text-xl font-bold text-green-600">{formatPKR(profitData.summary.grossProfit)}</span>
              </div>

              {/* Salaries Row */}
              <div className="flex justify-between items-center py-2 border-b">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center">
                    <Users className="h-4 w-4 text-orange-600" />
                  </div>
                  <span className="font-medium">Less: Salaries (spread over {profitData.period?.days || 0} days)</span>
                </div>
                <span className="text-lg text-orange-600">-{formatPKR(profitData.summary.totalSalaries)}</span>
              </div>

              {/* Expenses Row */}
              <div className="flex justify-between items-center py-2 border-b">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                    <FileText className="h-4 w-4 text-purple-600" />
                  </div>
                  <span className="font-medium">Less: Operating Expenses (recurring spread)</span>
                </div>
                <span className="text-lg text-purple-600">-{formatPKR(profitData.summary.totalExpenses)}</span>
              </div>

              {/* Net Profit Row - Highlighted */}
              <div className="flex justify-between items-center py-4 mt-2 bg-gradient-to-r from-gray-100 to-transparent dark:from-gray-800 -mx-4 px-4 rounded-lg">
                <div>
                  <span className="text-base font-bold">Net Profit</span>
                  <p className="text-xs text-muted-foreground mt-1">
                    for {format(new Date(profitData.period?.startDate), 'dd MMM')} - {format(new Date(profitData.period?.endDate), 'dd MMM yyyy')}
                  </p>
                </div>
                <span className={`text-2xl font-bold ${profitData.summary.netProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  {formatPKR(profitData.summary.netProfit)}
                </span>
              </div>

              {/* Info Box */}
              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-600 text-lg">📌</span>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p className="font-semibold text-blue-800 dark:text-blue-300">How it's calculated:</p>
                    <p>• Monthly salaries are divided by days in that month, then multiplied by days in selected period</p>
                    <p>• Recurring expenses (monthly, weekly, yearly) are spread across days</p>
                    <p>• One-time expenses are counted fully on their date</p>
                    <p>• Sales profit is calculated at transaction time (selling price - cost price)</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}