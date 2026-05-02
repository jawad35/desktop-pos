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
  Filter,
  Clock,
  Briefcase
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
  const [searchWages, setSearchWages] = useState("");
  const [searchExpenses, setSearchExpenses] = useState("");
  const [wageTypeFilter, setWageTypeFilter] = useState("all");
  
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
      setCurrentPage(1);
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

  // Filter wages data - includes both salaries and wages
  const filteredWages = profitData?.allWages?.filter((wage: any) => {
    const matchesSearch = wage.employee_name?.toLowerCase().includes(searchWages.toLowerCase());
    const matchesType = wageTypeFilter === "all" || wage.payment_type === wageTypeFilter;
    return matchesSearch && matchesType;
  }) || [];
  
  const paginatedWages = filteredWages.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalWagesPages = Math.ceil(filteredWages.length / itemsPerPage);

  // Filter sales data
  const filteredSales = profitData?.sales?.filter((sale: any) => 
    sale.product_name?.toLowerCase().includes(searchSales.toLowerCase())
  ) || [];
  
  const paginatedSales = filteredSales.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  console.log(paginatedWages)
  const totalSalesPages = Math.ceil(filteredSales.length / itemsPerPage);

  // Filter expenses data
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

  // Get wage type label with proper display
  const getWageTypeLabel = (type: string) => {
    switch(type) {
      case 'salary': return '📅 Monthly Salary';
      case 'monthly': return '📅 Monthly Salary';
      case 'daily': return '📆 Daily Wages';
      case 'weekly': return '📆 Weekly Wages';
      case 'hourly': return '⏰ Hourly Rate';
      case 'contract': return '📄 Contract Payment';
      case 'extra_work': return '⚡ Extra Work / Overtime';
      default: return type || 'Other';
    }
  };

  // Get badge for wage type
  // In profit-dashboard.tsx, update the getWageBadge function:
const getWageBadge = (type: string) => {
    switch(type) {
        case 'salary': return <Badge variant="outline" className="bg-blue-100 text-blue-800">📅 Monthly Salary</Badge>;
        case 'monthly': return <Badge variant="outline" className="bg-blue-100 text-blue-800">📅 Monthly Salary</Badge>;
        case 'contract': return <Badge variant="outline" className="bg-purple-100 text-purple-800">📄 Contract Payment</Badge>;
        case 'daily': return <Badge variant="outline" className="bg-green-100 text-green-800">📆 Daily Wages</Badge>;
        case 'weekly': return <Badge variant="outline" className="bg-teal-100 text-teal-800">📆 Weekly Wages</Badge>;
        case 'hourly': return <Badge variant="outline" className="bg-orange-100 text-orange-800">⏰ Hourly Rate</Badge>;
        case 'extra_work': return <Badge variant="outline" className="bg-pink-100 text-pink-800">⚡ Extra Work</Badge>;
        default: return <Badge variant="outline">{type || 'Other'}</Badge>;
    }
};

  // Calculate total wages (excluding monthly salaries)
  const totalWagesOnly = (profitData?.wageBreakdown?.daily || 0) + 
                         (profitData?.wageBreakdown?.weekly || 0) + 
                         (profitData?.wageBreakdown?.hourly || 0) + 
                         (profitData?.wageBreakdown?.contract || 0) + 
                         (profitData?.wageBreakdown?.extraWork || 0);

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
          <Button variant="outline" size="sm" onClick={() => applyYearFilter(new Date().getFullYear())}>Current Year</Button>
          <Button variant="outline" size="sm" onClick={() => applyYearFilter(new Date().getFullYear() - 1)}>Last Year</Button>
        </div>

        {/* Date Range Picker */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="text-sm font-medium mb-1 block">Start Date</label>
            <Input type="date" value={dateRange.startDate} onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })} className="w-full" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">End Date</label>
            <Input type="date" value={dateRange.endDate} onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })} className="w-full" />
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-l-4 border-l-green-500 shadow-lg">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-muted-foreground">Total Sales</p>
              <p className="text-2xl lg:text-3xl font-bold text-green-600">{formatPKR(profitData.summary.totalSales)}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-l-4 border-l-red-500 shadow-lg">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-muted-foreground">COGS</p>
              <p className="text-2xl lg:text-3xl font-bold text-red-600">{formatPKR(profitData.summary.totalCOGS)}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-l-4 border-l-orange-500 shadow-lg">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-muted-foreground">Salaries & Wages</p>
              <p className="text-2xl lg:text-3xl font-bold text-orange-600">
                {formatPKR((profitData.summary.totalSalaries || 0) + (profitData.summary.totalWages || 0))}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Salaries: {formatPKR(profitData.summary.totalSalaries || 0)} | 
                Wages: {formatPKR(profitData.summary.totalWages || 0)}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-l-4 border-l-purple-500 shadow-lg">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-muted-foreground">Expenses</p>
              <p className="text-2xl lg:text-3xl font-bold text-purple-600">{formatPKR(profitData.summary.totalExpenses)}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-l-blue-500 shadow-lg">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-muted-foreground">Net Profit</p>
              <p className={`text-2xl lg:text-3xl font-bold ${profitData.summary.netProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                {formatPKR(profitData.summary.netProfit)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Tables */}
        <Tabs defaultValue="sales" className="w-full" onValueChange={(value) => { setActiveTab(value); setCurrentPage(1); }}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="sales" className="flex items-center gap-2">📊 Sales & Profit</TabsTrigger>
            <TabsTrigger value="wages" className="flex items-center gap-2"><Users className="h-4 w-4" /> Salaries & Wages</TabsTrigger>
            <TabsTrigger value="expenses" className="flex items-center gap-2"><FileText className="h-4 w-4" /> Expenses</TabsTrigger>
          </TabsList>

          {/* Sales Tab */}
          <TabsContent value="sales">
            <Card className="shadow-lg">
              <CardHeader>
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                  <CardTitle className="text-xl">Sales Breakdown</CardTitle>
                  <div className="relative w-full lg:w-96">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search by product name..." value={searchSales} onChange={(e) => { setSearchSales(e.target.value); setCurrentPage(1); }} className="pl-10" />
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
                        <TableRow><TableCell colSpan={6} className="text-center">No sales found</TableCell></TableRow>
                      ) : (
                        paginatedSales.map((sale: any) => (
                          <TableRow key={sale.id}>
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
                {totalSalesPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-muted-foreground">Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredSales.length)} of {filteredSales.length} sales</div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handlePageChange(1, totalSalesPages)} disabled={currentPage === 1}><ChevronsLeft className="h-4 w-4" /></Button>
                      <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage - 1, totalSalesPages)} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
                      <span className="flex items-center px-4 text-sm">Page {currentPage} of {totalSalesPages}</span>
                      <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage + 1, totalSalesPages)} disabled={currentPage === totalSalesPages}><ChevronRight className="h-4 w-4" /></Button>
                      <Button variant="outline" size="sm" onClick={() => handlePageChange(totalSalesPages, totalSalesPages)} disabled={currentPage === totalSalesPages}><ChevronsRight className="h-4 w-4" /></Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Salaries & Wages Tab - Complete with ALL payment types */}
          <TabsContent value="wages">
            <Card className="shadow-lg">
              <CardHeader>
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                  <div>
                    <CardTitle className="text-xl">Salaries & Wages</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Includes monthly salaries, daily/weekly wages, hourly rates, contract payments, and extra work/overtime.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Select value={wageTypeFilter} onValueChange={setWageTypeFilter}>
                      <SelectTrigger className="w-40"><SelectValue placeholder="Filter by type" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="salary">Monthly Salary</SelectItem>
                        <SelectItem value="monthly">Monthly Salary</SelectItem>
                        <SelectItem value="daily">Daily Wages</SelectItem>
                        <SelectItem value="weekly">Weekly Wages</SelectItem>
                        <SelectItem value="hourly">Hourly Rate</SelectItem>
                        <SelectItem value="contract">Contract</SelectItem>
                        <SelectItem value="extra_work">Extra Work</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="relative w-64">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Search by employee..." value={searchWages} onChange={(e) => { setSearchWages(e.target.value); setCurrentPage(1); }} className="pl-10" />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Summary by Type - Expanded */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
                  <Card className="bg-blue-50">
                    <CardContent className="p-3">
                      <p className="text-xs text-muted-foreground">Monthly Salary</p>
                      <p className="text-lg font-bold text-blue-600">{formatPKR(profitData?.wageBreakdown?.monthly || 0)}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-green-50">
                    <CardContent className="p-3">
                      <p className="text-xs text-muted-foreground">Daily Wages</p>
                      <p className="text-lg font-bold text-green-600">{formatPKR(profitData?.wageBreakdown?.daily || 0)}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-teal-50">
                    <CardContent className="p-3">
                      <p className="text-xs text-muted-foreground">Weekly Wages</p>
                      <p className="text-lg font-bold text-teal-600">{formatPKR(profitData?.wageBreakdown?.weekly || 0)}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-purple-50">
                    <CardContent className="p-3">
                      <p className="text-xs text-muted-foreground">Hourly Rate</p>
                      <p className="text-lg font-bold text-purple-600">{formatPKR(profitData?.wageBreakdown?.hourly || 0)}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-orange-50">
                    <CardContent className="p-3">
                      <p className="text-xs text-muted-foreground">Contract</p>
                      <p className="text-lg font-bold text-orange-600">{formatPKR(profitData?.wageBreakdown?.contract || 0)}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-pink-50">
                    <CardContent className="p-3">
                      <p className="text-xs text-muted-foreground">Extra Work</p>
                      <p className="text-lg font-bold text-pink-600">{formatPKR(profitData?.wageBreakdown?.extraWork || 0)}</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Salaries vs Wages Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                  <div className="text-center p-3 bg-blue-100 rounded-lg">
                    <p className="text-sm font-medium text-blue-800">💰 Total Monthly Salaries</p>
                    <p className="text-2xl font-bold text-blue-600">{formatPKR(profitData?.summary?.totalSalaries || 0)}</p>
                    <p className="text-xs text-muted-foreground">Fixed monthly salary payments</p>
                  </div>
                  <div className="text-center p-3 bg-green-100 rounded-lg">
                    <p className="text-sm font-medium text-green-800">⏰ Total Variable Wages</p>
                    <p className="text-2xl font-bold text-green-600">{formatPKR(totalWagesOnly)}</p>
                    <p className="text-xs text-muted-foreground">Includes daily, weekly, hourly, contract, and extra work</p>
                  </div>
                </div>

                {/* Wages Table */}
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Period / Details</TableHead>
                        <TableHead>Payment Date</TableHead>
                        <TableHead>Method</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedWages.length === 0 ? (
                        <TableRow><TableCell colSpan={6} className="text-center">No records found</TableCell></TableRow>
                      ) : (
                        paginatedWages.map((wage: any) => (
                          <TableRow key={wage.id}>
                            <TableCell className="font-medium">{wage.employee_name}</TableCell>
                            <TableCell>{getWageBadge(wage.payment_type)}</TableCell>
                            <TableCell className="text-right font-semibold text-green-600">{formatPKR(wage.amount)}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {wage.payment_type === 'salary' && wage.month && `Month: ${wage.month}/${wage.year}`}
                              {wage.payment_type === 'monthly' && wage.month && `Month: ${wage.month}/${wage.year}`}
                              {wage.payment_type === 'daily' && wage.period_start && `Day: ${format(new Date(wage.period_start), 'dd/MM/yyyy')}`}
                              {wage.payment_type === 'weekly' && wage.period_start && wage.period_end && `Week: ${format(new Date(wage.period_start), 'dd/MM')} - ${format(new Date(wage.period_end), 'dd/MM/yyyy')}`}
                              {wage.payment_type === 'hourly' && `${wage.hours || 0} hours @ ${formatPKR(wage.hourly_rate || 0)}/hr`}
                              {wage.payment_type === 'contract' && wage.period_start && wage.period_end && `Contract: ${format(new Date(wage.period_start), 'dd/MM')} - ${format(new Date(wage.period_end), 'dd/MM/yyyy')}`}
                              {wage.payment_type === 'extra_work' && wage.description}
                              {wage.payment_type === 'salary' && !wage.month && wage.description && wage.description}
                              {!wage.period_start && wage.description && !wage.payment_type?.includes('salary') && wage.description}
                            </TableCell>
                            <TableCell>{format(new Date(wage.payment_date), 'dd/MM/yyyy')}</TableCell>
                            <TableCell className="capitalize">{wage.payment_method}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Daily Average Wage Calculation */}
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm font-semibold flex items-center gap-2"><Clock className="h-4 w-4" /> Daily Average Employee Cost</p>
                  <p className="text-2xl font-bold text-blue-600 mt-1">{formatPKR(profitData?.summary?.dailyAverageWage || 0)}<span className="text-sm font-normal text-muted-foreground"> per day</span></p>
                  <p className="text-xs text-muted-foreground mt-1">Total employee cost (salaries + wages) divided by {profitData?.period?.days || 0} days in period</p>
                </div>

                {totalWagesPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-muted-foreground">Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredWages.length)} of {filteredWages.length} records</div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handlePageChange(1, totalWagesPages)} disabled={currentPage === 1}><ChevronsLeft className="h-4 w-4" /></Button>
                      <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage - 1, totalWagesPages)} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
                      <span className="flex items-center px-4 text-sm">Page {currentPage} of {totalWagesPages}</span>
                      <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage + 1, totalWagesPages)} disabled={currentPage === totalWagesPages}><ChevronRight className="h-4 w-4" /></Button>
                      <Button variant="outline" size="sm" onClick={() => handlePageChange(totalWagesPages, totalWagesPages)} disabled={currentPage === totalWagesPages}><ChevronsRight className="h-4 w-4" /></Button>
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
                    <p className="text-sm text-muted-foreground mt-1">Recurring expenses are spread across days. Daily cost shown for recurring items.</p>
                  </div>
                  <div className="relative w-full lg:w-96">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search by expense title..." value={searchExpenses} onChange={(e) => { setSearchExpenses(e.target.value); setCurrentPage(1); }} className="pl-10" />
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
                        <TableRow><TableCell colSpan={6} className="text-center">No expenses found</TableCell></TableRow>
                      ) : (
                        paginatedExpenses.map((expense: any) => (
                          <TableRow key={expense.id}>
                            <TableCell className="font-medium">{expense.title}</TableCell>
                            <TableCell><Badge variant="outline">{expense.category}</Badge></TableCell>
                            <TableCell className="text-right text-red-600 font-semibold">{formatPKR(expense.amount)}</TableCell>
                            <TableCell className="capitalize">{expense.frequency || 'one-time'}</TableCell>
                            <TableCell>{expense.is_recurring ? formatPKR(expense.daily_cost) + '/day' : '-'}</TableCell>
                            <TableCell>{format(new Date(expense.created_at), 'dd/MM/yyyy')}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                {totalExpensesPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-muted-foreground">Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredExpenses.length)} of {filteredExpenses.length} expenses</div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handlePageChange(1, totalExpensesPages)} disabled={currentPage === 1}><ChevronsLeft className="h-4 w-4" /></Button>
                      <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage - 1, totalExpensesPages)} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
                      <span className="flex items-center px-4 text-sm">Page {currentPage} of {totalExpensesPages}</span>
                      <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage + 1, totalExpensesPages)} disabled={currentPage === totalExpensesPages}><ChevronRight className="h-4 w-4" /></Button>
                      <Button variant="outline" size="sm" onClick={() => handlePageChange(totalExpensesPages, totalExpensesPages)} disabled={currentPage === totalExpensesPages}><ChevronsRight className="h-4 w-4" /></Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Profit Calculation Summary */}
        <Card className="mt-8 shadow-xl bg-gradient-to-br from-white to-gray-50 border-t-4 border-t-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl lg:text-2xl flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-blue-600" />
              Profit Calculation Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="font-medium">Total Sales</span>
                <span className="text-lg font-semibold text-green-600">{formatPKR(profitData.summary.totalSales)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="font-medium">Less: Cost of Goods Sold (COGS)</span>
                <span className="text-lg text-red-600">-{formatPKR(profitData.summary.totalCOGS)}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b-2 bg-gradient-to-r from-blue-50 to-transparent -mx-4 px-4 rounded-lg">
                <span className="font-bold text-base">Gross Profit</span>
                <span className="text-xl font-bold text-green-600">{formatPKR(profitData.summary.grossProfit)}</span>
              </div>
              
              <div className="flex justify-between items-center py-2 border-b">
                <span className="font-medium">Less: Monthly Salaries</span>
                <span className="text-lg text-orange-600">-{formatPKR(profitData.summary.totalSalaries)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="font-medium">Less: Daily Wages</span>
                <span className="text-lg text-orange-600">-{formatPKR(profitData.wageBreakdown?.daily || 0)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="font-medium">Less: Weekly Wages</span>
                <span className="text-lg text-orange-600">-{formatPKR(profitData.wageBreakdown?.weekly || 0)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="font-medium">Less: Hourly Payments</span>
                <span className="text-lg text-orange-600">-{formatPKR(profitData.wageBreakdown?.hourly || 0)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="font-medium">Less: Contract Payments</span>
                <span className="text-lg text-orange-600">-{formatPKR(profitData.wageBreakdown?.contract || 0)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="font-medium">Less: Extra Work / Overtime</span>
                <span className="text-lg text-orange-600">-{formatPKR(profitData.wageBreakdown?.extraWork || 0)}</span>
              </div>
              
              <div className="flex justify-between items-center py-2 border-b">
                <span className="font-medium">Less: Operating Expenses</span>
                <span className="text-lg text-purple-600">-{formatPKR(profitData.summary.totalExpenses)}</span>
              </div>
              
              <div className="flex justify-between items-center py-4 mt-2 bg-gradient-to-r from-gray-100 to-transparent -mx-4 px-4 rounded-lg">
                <div>
                  <span className="text-base font-bold">Net Profit</span>
                  <p className="text-xs text-muted-foreground mt-1">for {format(new Date(profitData.period?.startDate), 'dd MMM')} - {format(new Date(profitData.period?.endDate), 'dd MMM yyyy')}</p>
                </div>
                <span className={`text-2xl font-bold ${profitData.summary.netProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  {formatPKR(profitData.summary.netProfit)}
                </span>
              </div>

              {/* Daily Average Calculation */}
              <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm font-semibold">📊 Daily Averages for Selected Period ({profitData?.period?.days || 0} days)</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Daily Sales Avg</p>
                    <p className="text-lg font-bold text-green-600">{formatPKR(profitData.summary.totalSales / (profitData?.period?.days || 1))}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Daily COGS Avg</p>
                    <p className="text-lg font-bold text-red-600">{formatPKR(profitData.summary.totalCOGS / (profitData?.period?.days || 1))}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Daily Salary Expense</p>
                    <p className="text-lg font-bold text-orange-600">{formatPKR((profitData.summary.totalSalaries) / (profitData?.period?.days || 1))}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Daily Wage Expense</p>
                    <p className="text-lg font-bold text-orange-600">{formatPKR((profitData.summary.totalWages) / (profitData?.period?.days || 1))}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Daily Net Profit</p>
                    <p className="text-lg font-bold text-blue-600">{formatPKR(profitData.summary.netProfit / (profitData?.period?.days || 1))}</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-600 text-lg">📌</span>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p className="font-semibold text-blue-800">How employee costs are calculated:</p>
                    <p>• Monthly salaries: Full salary amount for the month (counted once per month)</p>
                    <p>• Daily wages: Counted fully for each day worked in selected period</p>
                    <p>• Weekly wages: Divided by 7 days, multiplied by days in selected period</p>
                    <p>• Hourly rates: Calculated based on hours worked × hourly rate</p>
                    <p>• Contract payments: Spread across contract duration days</p>
                    <p>• Extra work: Counted fully on payment date</p>
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