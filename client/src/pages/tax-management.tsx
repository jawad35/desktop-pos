import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatPKR } from "@/lib/currency";
import { format } from "date-fns";
import { api } from "../services/electron-api";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar, Download, FileText, Banknote, CheckCircle, AlertCircle } from "lucide-react";

export default function TaxManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [taxPeriodStart, setTaxPeriodStart] = useState("");
  const [taxPeriodEnd, setTaxPeriodEnd] = useState("");
  const [amountToPay, setAmountToPay] = useState(0);
  const [challanNumber, setChallanNumber] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("bank");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch tax payments history
  const { data: taxPayments = [], refetch: refetchPayments } = useQuery({
    queryKey: ["taxPayments"],
    queryFn: async () => {
      const result = await api.getTaxPayments();
      return Array.isArray(result) ? result : [];
    },
  });

  // Fetch sales for tax calculation
  const { data: sales = [] } = useQuery({
    queryKey: ["sales"],
    queryFn: async () => {
      const result = await api.getSales();
      return Array.isArray(result) ? result : [];
    },
  });

  // Calculate tax collected for a period
  const calculateTaxCollected = (startDate: string, endDate: string) => {
    const filteredSales = sales.filter(sale => {
      const saleDate = new Date(sale.created_at);
      return saleDate >= new Date(startDate) && saleDate <= new Date(endDate);
    });
    
    return filteredSales.reduce((sum, sale) => {
      const subtotal = parseFloat(sale.subtotal) || 0;
      const taxRate = parseFloat(sale.tax) || 0;
      const taxAmount = (subtotal * taxRate) / 100;
      return sum + taxAmount;
    }, 0);
  };

  // Get tax periods with calculated amounts
  const getTaxPeriods = () => {
    const periods = [];
    const now = new Date();
    
    // Last 12 months
    for (let i = 0; i < 12; i++) {
      const startDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      
      const periodStart = format(startDate, 'yyyy-MM-dd');
      const periodEnd = format(endDate, 'yyyy-MM-dd');
      const periodName = format(startDate, 'MMMM yyyy');
      
      const taxCollected = calculateTaxCollected(periodStart, periodEnd);
      const paidRecords = taxPayments.filter((p: any) => 
        p.period_start === periodStart && p.period_end === periodEnd
      );
      const totalPaid = paidRecords.reduce((sum: number, p: any) => sum + p.amount, 0);
      const balanceDue = taxCollected - totalPaid;
      
      periods.push({
        periodName,
        periodStart,
        periodEnd,
        taxCollected,
        totalPaid,
        balanceDue,
        status: balanceDue === 0 ? 'paid' : balanceDue > 0 ? 'partial' : 'overpaid',
        payments: paidRecords,
      });
    }
    
    return periods;
  };

  const periods = getTaxPeriods();
  const totalTaxCollected = periods.reduce((sum, p) => sum + p.taxCollected, 0);
  const totalTaxPaid = periods.reduce((sum, p) => sum + p.totalPaid, 0);
  const totalBalanceDue = totalTaxCollected - totalTaxPaid;

  const handleRecordPayment = async () => {
    if (!taxPeriodStart || !taxPeriodEnd || amountToPay <= 0) {
      toast({ title: "Error", description: "Please fill all required fields", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      await api.createTaxPayment({
        period_start: taxPeriodStart,
        period_end: taxPeriodEnd,
        amount: amountToPay,
        challan_number: challanNumber,
        payment_method: paymentMethod,
        notes: paymentNotes,
        payment_date: new Date().toISOString(),
      });

      toast({ title: "Success", description: "Tax payment recorded successfully" });
      setShowPaymentDialog(false);
      setChallanNumber("");
      setAmountToPay(0);
      setTaxPeriodStart("");
      setTaxPeriodEnd("");
      setPaymentNotes("");
      refetchPayments();
      queryClient.invalidateQueries({ queryKey: ["taxPayments"] });
      queryClient.invalidateQueries({ queryKey: ["sales"] });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportTaxReport = () => {
    const headers = ['Period', 'Start Date', 'End Date', 'Tax Collected (PKR)', 'Tax Paid (PKR)', 'Balance Due (PKR)', 'Status'];
    const rows = periods.map(p => [
      p.periodName,
      p.periodStart,
      p.periodEnd,
      p.taxCollected.toFixed(2),
      p.totalPaid.toFixed(2),
      p.balanceDue.toFixed(2),
      p.status.toUpperCase()
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tax_report_${format(new Date(), 'yyyyMMdd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({ title: "Export Successful", description: "Tax report exported" });
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Tax Management</h1>
          <p className="text-muted-foreground">Track tax collected from sales and payments made to government</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={handleExportTaxReport} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button onClick={() => setShowPaymentDialog(true)}>
            <Banknote className="h-4 w-4 mr-2" />
            Record Tax Payment
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card className="bg-blue-50">
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Total Tax Collected</p>
                <p className="text-2xl font-bold text-blue-600">{formatPKR(totalTaxCollected)}</p>
                <p className="text-xs text-muted-foreground">From all sales</p>
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-50">
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Total Tax Paid</p>
                <p className="text-2xl font-bold text-green-600">{formatPKR(totalTaxPaid)}</p>
                <p className="text-xs text-muted-foreground">To government</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className={totalBalanceDue > 0 ? "bg-red-50" : "bg-green-50"}>
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Balance Due</p>
                <p className={`text-2xl font-bold ${totalBalanceDue > 0 ? 'text-red-600' : totalBalanceDue < 0 ? 'text-green-600' : 'text-gray-600'}`}>
                  {formatPKR(Math.abs(totalBalanceDue))}
                </p>
                <p className="text-xs text-muted-foreground">
                  {totalBalanceDue > 0 ? 'Need to pay' : totalBalanceDue < 0 ? 'Overpaid' : 'Settled'}
                </p>
              </div>
              <AlertCircle className={`h-8 w-8 ${totalBalanceDue > 0 ? 'text-red-500' : totalBalanceDue < 0 ? 'text-green-500' : 'text-gray-500'}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tax Periods Table */}
      <Card>
        <CardHeader>
          <CardTitle>Tax Periods (Last 12 Months)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-left p-3">Period</th>
                  <th className="text-right p-3">Tax Collected</th>
                  <th className="text-right p-3">Tax Paid</th>
                  <th className="text-right p-3">Balance Due</th>
                  <th className="text-center p-3">Status</th>
                  <th className="text-center p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {periods.map((period) => (
                  <tr key={period.periodStart} className="border-b hover:bg-muted/30">
                    <td className="p-3 font-medium">{period.periodName}</td>
                    <td className="p-3 text-right">{formatPKR(period.taxCollected)}</td>
                    <td className="p-3 text-right">{formatPKR(period.totalPaid)}</td>
                    <td className={`p-3 text-right font-semibold ${period.balanceDue > 0 ? 'text-red-600' : period.balanceDue < 0 ? 'text-green-600' : ''}`}>
                      {formatPKR(Math.abs(period.balanceDue))}
                    </td>
                    <td className="p-3 text-center">
                      <Badge className={period.status === 'paid' ? 'bg-green-500' : period.status === 'partial' ? 'bg-yellow-500' : 'bg-red-500'}>
                        {period.status === 'paid' ? '✓ Paid' : period.status === 'partial' ? '⚠️ Partial' : 'Overpaid'}
                      </Badge>
                    </td>
                    <td className="p-3 text-center">
                      {period.balanceDue > 0 && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setSelectedPeriod(period.periodName);
                            setTaxPeriodStart(period.periodStart);
                            setTaxPeriodEnd(period.periodEnd);
                            setAmountToPay(period.balanceDue);
                            setShowPaymentDialog(true);
                          }}
                        >
                          Pay Now
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Tax Payment History */}
      {taxPayments.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Tax Payment History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="text-left p-3">Date</th>
                    <th className="text-left p-3">Period</th>
                    <th className="text-right p-3">Amount</th>
                    <th className="text-left p-3">Challan No.</th>
                    <th className="text-left p-3">Method</th>
                    <th className="text-left p-3">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {taxPayments.map((payment: any) => (
                    <tr key={payment.id} className="border-b hover:bg-muted/30">
                      <td className="p-3">{format(new Date(payment.payment_date), 'dd/MM/yyyy HH:mm')}</td>
                      <td className="p-3">
                        {format(new Date(payment.period_start), 'MMM yyyy')}
                      </td>
                      <td className="p-3 text-right font-semibold text-green-600">{formatPKR(payment.amount)}</td>
                      <td className="p-3 font-mono text-sm">{payment.challan_number || '-'}</td>
                      <td className="p-3 capitalize">{payment.payment_method}</td>
                      <td className="p-3 text-sm text-muted-foreground">{payment.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tax Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record Tax Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tax Period</Label>
              <Input value={selectedPeriod} disabled className="bg-muted" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Period Start</Label>
                <Input type="date" value={taxPeriodStart} disabled className="bg-muted" />
              </div>
              <div>
                <Label>Period End</Label>
                <Input type="date" value={taxPeriodEnd} disabled className="bg-muted" />
              </div>
            </div>
            <div>
              <Label>Amount to Pay (PKR)</Label>
              <Input 
                type="number" 
                value={amountToPay} 
                onChange={(e) => setAmountToPay(parseFloat(e.target.value) || 0)}
                placeholder="Enter amount"
              />
            </div>
            <div>
              <Label>Challan/Reference Number</Label>
              <Input 
                value={challanNumber} 
                onChange={(e) => setChallanNumber(e.target.value)}
                placeholder="Government challan number"
              />
              <p className="text-xs text-muted-foreground mt-1">Required for audit trail</p>
            </div>
            <div>
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank">Bank Transfer</SelectItem>
                  <SelectItem value="easypaisa">EasyPaisa</SelectItem>
                  <SelectItem value="jazzcash">JazzCash</SelectItem>
                  <SelectItem value="cash">Cash (Not Recommended)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes (Optional)</Label>
              <Textarea 
                value={paymentNotes} 
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="Additional notes..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>Cancel</Button>
            <Button onClick={handleRecordPayment} disabled={isSubmitting || amountToPay <= 0}>
              {isSubmitting ? "Processing..." : `Pay ${formatPKR(amountToPay)}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}