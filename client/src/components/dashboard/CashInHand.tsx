// components/CashInHand.tsx
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPKR } from "@/lib/currency";
import { api } from "../services/electron-api";
import { Coins, TrendingUp, TrendingDown } from "lucide-react";

export function CashInHand() {
  const [cashData, setCashData] = useState({
    totalCashReceived: 0,
    totalCashPaidOut: 0,
    cashInHand: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCashData();
  }, []);

  const fetchCashData = async () => {
    try {
      const sales = await api.getSales();
      const expenses = await api.getExpenses();
      
      // Cash received from sales
      const cashSales = sales.filter((s: any) => s.payment_method === 'cash' && s.payment_status !== 'cancelled');
      const totalCashReceived = cashSales.reduce((sum: number, sale: any) => sum + parseFloat(sale.total), 0);
      
      // Cash paid out (expenses)
      const cashExpenses = expenses.filter((e: any) => e.payment_method === 'cash');
      const totalCashPaidOut = cashExpenses.reduce((sum: number, exp: any) => sum + parseFloat(exp.amount), 0);
      
      setCashData({
        totalCashReceived,
        totalCashPaidOut,
        cashInHand: totalCashReceived - totalCashPaidOut
      });
    } catch (error) {
      console.error("Failed to fetch cash data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return null;

  return (
    <Card className="bg-gradient-to-r from-green-50 to-emerald-50">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Coins className="h-5 w-5 text-green-600" />
          Cash in Hand
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Cash Received:</span>
            <span className="font-semibold text-green-600">{formatPKR(cashData.totalCashReceived)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Cash Paid Out:</span>
            <span className="font-semibold text-red-600">{formatPKR(cashData.totalCashPaidOut)}</span>
          </div>
          <div className="flex justify-between pt-2 border-t">
            <span className="font-bold">Cash in Hand:</span>
            <span className={`font-bold text-lg ${cashData.cashInHand >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatPKR(cashData.cashInHand)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}