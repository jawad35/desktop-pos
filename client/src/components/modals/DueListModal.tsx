// components/DueListModal.tsx
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatPKR } from "@/lib/currency";
import { format } from "date-fns";
import { 
  Search, 
  Phone, 
  Mail, 
  Printer, 
  Download, 
  MessageCircle,
  ChevronLeft, 
  ChevronRight,
  CalendarIcon
} from "lucide-react";
import { api } from "../../services/electron-api";
import { useToast } from "@/hooks/use-toast";

interface DueSale {
  id: string;
  receipt_number: string;
  customer_name: string;
  customer_phone: string;
  total: number;
  paid_amount: number;
  due_amount: number;
  due_date: string;
  due_reason: string;
  created_at: string;
}

export function DueListModal({ isOpen, onClose }) {
  const [dueSales, setDueSales] = useState<DueSale[]>([]);
  const [filteredSales, setFilteredSales] = useState<DueSale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState<"today" | "tomorrow" | "week" | "all">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalDue, setTotalDue] = useState(0);
  const itemsPerPage = 20;
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchDueSales();
    }
  }, [isOpen]);

  useEffect(() => {
    filterSales();
  }, [dueSales, searchTerm, dateFilter]);

  const fetchDueSales = async () => {
    setIsLoading(true);
    try {
      const sales = await api.getSales();
      const due = sales.filter((sale: any) => 
        sale.payment_status === 'partial' && (sale.due_amount || 0) > 0
      ).map((sale: any) => ({
        id: sale.id,
        receipt_number: sale.receipt_number,
        customer_name: sale.customer_name || "Walk-in Customer",
        customer_phone: sale.customer_phone || "N/A",
        total: parseFloat(sale.total),
        paid_amount: parseFloat(sale.paid_amount) || 0,
        due_amount: parseFloat(sale.due_amount) || 0,
        due_date: sale.due_date,
        due_reason: sale.due_reason,
        created_at: sale.created_at,
      }));
      
      setDueSales(due);
      const total = due.reduce((sum, sale) => sum + sale.due_amount, 0);
      setTotalDue(total);
    } catch (error) {
      console.error("Failed to fetch due sales:", error);
      toast({ title: "Error", description: "Failed to load due list", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const filterSales = () => {
    let filtered = [...dueSales];
    
    // Date filter
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    if (dateFilter === "today") {
      filtered = filtered.filter(sale => {
        if (!sale.due_date) return false;
        const dueDate = new Date(sale.due_date);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate.getTime() === today.getTime();
      });
    } else if (dateFilter === "tomorrow") {
      filtered = filtered.filter(sale => {
        if (!sale.due_date) return false;
        const dueDate = new Date(sale.due_date);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate.getTime() === tomorrow.getTime();
      });
    } else if (dateFilter === "week") {
      filtered = filtered.filter(sale => {
        if (!sale.due_date) return false;
        const dueDate = new Date(sale.due_date);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate >= today && dueDate <= nextWeek;
      });
    }
    
    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(sale =>
        sale.receipt_number.toLowerCase().includes(term) ||
        sale.customer_name.toLowerCase().includes(term) ||
        sale.customer_phone.toLowerCase().includes(term)
      );
    }
    
    setFilteredSales(filtered);
    setCurrentPage(1);
  };

  const sendWhatsAppReminder = (sale: DueSale) => {
    if (!sale.customer_phone || sale.customer_phone === "N/A") {
      toast({ title: "No Phone Number", description: "Customer phone number not available", variant: "destructive" });
      return;
    }
    
    const message = `🔔 *Payment Reminder* 🔔%0A%0A` +
      `Dear ${sale.customer_name},%0A%0A` +
      `This is a reminder that you have an outstanding payment of *${formatPKR(sale.due_amount)}* for invoice *${sale.receipt_number}*.%0A%0A` +
      `📅 Due Date: ${sale.due_date ? new Date(sale.due_date).toLocaleDateString() : 'Not specified'}%0A` +
      `💰 Total Amount: ${formatPKR(sale.total)}%0A` +
      `✅ Already Paid: ${formatPKR(sale.paid_amount)}%0A` +
      `⚠️ Remaining Due: ${formatPKR(sale.due_amount)}%0A%0A` +
      `Please clear your payment at your earliest convenience.%0A%0A` +
      `Thank you! 🙏`;
    
    const whatsappUrl = `https://wa.me/${sale.customer_phone.replace(/\D/g, '').replace(/^0/, '')}?text=${message}`;
    window.open(whatsappUrl, '_blank');
  };

  const printDueList = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Due Payments Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #333; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .total { font-weight: bold; margin-top: 20px; text-align: right; }
        </style>
      </head>
      <body>
        <h1>Due Payments Report</h1>
        <p>Generated: ${new Date().toLocaleString()}</p>
        <p>Filter: ${dateFilter === 'today' ? 'Today' : dateFilter === 'tomorrow' ? 'Tomorrow' : dateFilter === 'week' ? 'Next 7 Days' : 'All Due'}</p>
        <table>
          <thead>
            <tr><th>Receipt #</th><th>Customer</th><th>Phone</th><th>Total</th><th>Paid</th><th>Due</th><th>Due Date</th></tr>
          </thead>
          <tbody>
            ${filteredSales.map(sale => `
              <tr>
                <td>${sale.receipt_number}</td>
                <td>${sale.customer_name}</td>
                <td>${sale.customer_phone}</td>
                <td>${formatPKR(sale.total)}</td>
                <td>${formatPKR(sale.paid_amount)}</td>
                <td>${formatPKR(sale.due_amount)}</td>
                <td>${sale.due_date ? new Date(sale.due_date).toLocaleDateString() : '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="total">Total Due: ${formatPKR(filteredSales.reduce((sum, s) => sum + s.due_amount, 0))}</div>
      </body>
      </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  const exportToCSV = () => {
    const headers = ['Receipt #', 'Customer Name', 'Phone', 'Total Amount', 'Paid Amount', 'Due Amount', 'Due Date', 'Reason'];
    const rows = filteredSales.map(sale => [
      sale.receipt_number,
      sale.customer_name,
      sale.customer_phone,
      sale.total,
      sale.paid_amount,
      sale.due_amount,
      sale.due_date ? new Date(sale.due_date).toLocaleDateString() : '',
      sale.due_reason || ''
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `due_payments_${format(new Date(), 'yyyyMMdd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Export Successful", description: "Due list exported to CSV" });
  };

  const paginatedSales = filteredSales.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(filteredSales.length / itemsPerPage);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Due Payments List</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={printDueList}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button variant="outline" size="sm" onClick={exportToCSV}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Total Due Amount</p>
                <p className="text-2xl font-bold text-orange-600">{formatPKR(totalDue)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Number of Due Invoices</p>
                <p className="text-2xl font-bold text-blue-600">{dueSales.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Overdue</p>
                <p className="text-2xl font-bold text-red-600">
                  {dueSales.filter(s => s.due_date && new Date(s.due_date) < new Date()).length}
                </p>
              </CardContent>
            </Card>
          </div>
          
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Search by receipt, customer, phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex gap-2">
              <Button variant={dateFilter === "today" ? "default" : "outline"} onClick={() => setDateFilter("today")}>
                Today
              </Button>
              <Button variant={dateFilter === "tomorrow" ? "default" : "outline"} onClick={() => setDateFilter("tomorrow")}>
                Tomorrow
              </Button>
              <Button variant={dateFilter === "week" ? "default" : "outline"} onClick={() => setDateFilter("week")}>
                Next 7 Days
              </Button>
              <Button variant={dateFilter === "all" ? "default" : "outline"} onClick={() => setDateFilter("all")}>
                All Due
              </Button>
            </div>
          </div>
          
          {/* Due List Table */}
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : filteredSales.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No due payments found</div>
          ) : (
            <>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="p-3 text-left">Receipt #</th>
                      <th className="p-3 text-left">Customer</th>
                      <th className="p-3 text-left">Phone</th>
                      <th className="p-3 text-right">Total</th>
                      <th className="p-3 text-right">Paid</th>
                      <th className="p-3 text-right">Due</th>
                      <th className="p-3 text-left">Due Date</th>
                      <th className="p-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedSales.map((sale) => {
                      const isOverdue = sale.due_date && new Date(sale.due_date) < new Date();
                      return (
                        <tr key={sale.id} className="border-t hover:bg-muted/30">
                          <td className="p-3 font-mono">{sale.receipt_number}</td>
                          <td className="p-3">{sale.customer_name}</td>
                          <td className="p-3">{sale.customer_phone}</td>
                          <td className="p-3 text-right">{formatPKR(sale.total)}</td>
                          <td className="p-3 text-right text-green-600">{formatPKR(sale.paid_amount)}</td>
                          <td className="p-3 text-right font-semibold text-orange-600">{formatPKR(sale.due_amount)}</td>
                          <td className="p-3">
                            <span className={isOverdue ? "text-red-600 font-bold" : ""}>
                              {sale.due_date ? new Date(sale.due_date).toLocaleDateString() : '-'}
                              {isOverdue && " (Overdue)"}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex justify-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => sendWhatsAppReminder(sale)}
                                title="Send WhatsApp Reminder"
                              >
                                <MessageCircle className="h-4 w-4 text-green-600" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredSales.length)} of {filteredSales.length}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <span className="px-4 py-2 text-sm">Page {currentPage} of {totalPages}</span>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}