import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPKR } from "@/lib/currency";
import { format } from "date-fns";
import {
  ArrowLeft,
  Printer,
  User,
  Phone,
  CreditCard,
  Package,
  Banknote,
  RefreshCw
} from "lucide-react";
import { useHeader } from "@/contexts/HeaderContext";
import { HanldePrintReceipt, ReceiptData } from "@/utils/ReceiptGenerator";
import { useAuth } from "@/hooks/useAuth";
import { getPaymentMethodColor } from "@/utils/GetPaymentMethodColor";
import EditSaleForm from "@/components/Sale/EditSaleForm";
import { api } from "../services/electron-api";
import { useNavigation } from "../App";

interface SaleItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: string;
  total: string;
  product: {
    id: string;
    name: string;
    imageUrl: string;
    barcode: string;
    categoryName: string;
  } | null;
}

interface ReturnedRecordItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  isDamaged?: boolean;
  damageReason?: string;
}

interface ReturnedRecord {
  returnReceiptNumber: string;
  returnDate: string;
  returnReason: string;
  returnFee: number;
  items: ReturnedRecordItem[];
}

interface ItemDetails {
  id: string;
  receiptNumber: string;
  customerName: string;
  customerPhone: string;
  subtotal: string;
  tax: string;
  discount: string;
  total: string;
  paymentMethod: string;
  paymentStatus: string;
  createdAt: string;
  employeeId?: string;
  returnStatus?: string;
  totalReturnedAmount?: number;
  returned_items?: ReturnedRecord[];
  paid_amount?: number;
  due_amount?: number;
  due_date?: string;
  due_reason?: string;
  payments?: any[];
  user: {
    id: string;
    name: string;
    email: string;
  } | null;
  items: SaleItem[];
  returnItems?: SaleItem[];
  returnReason?: string;
  returnFee?: number;
}
// Add these helper functions at the top of ItemDetails component (after imports)

const getTotalCustomerPaid = (sale: any) => {
  if (!sale.payments) return sale.paid_amount || 0;
  return sale.payments.reduce((total, payment) => {
    if (payment.amount > 0) return total + payment.amount;
    return total;
  }, 0);
};

const getTotalRefunded = (sale: any) => {
  if (!sale.payments) return 0;
  return sale.payments.reduce((total, payment) => {
    if (payment.amount < 0) return total + Math.abs(payment.amount);
    return total;
  }, 0);
};

const getNetPosition = (sale: any) => {
  const totalPaid = getTotalCustomerPaid(sale);
  const totalRefunded = getTotalRefunded(sale);
  const saleTotal = parseFloat(sale.total) || 0;
  const totalReturned = parseFloat(sale.totalReturnedAmount) || 0;
  const netCustomerPayment = totalPaid - totalRefunded;
  const adjustedSaleTotal = saleTotal - totalReturned;
  return netCustomerPayment - adjustedSaleTotal;
};

export default function ItemDetails({ params }) {
  const [, navigate] = useLocation();
  const { shop } = useAuth();
  const { id, mode } = params || {};

  const { data: sale, isLoading, error, refetch } = useQuery<ItemDetails>({
    queryKey: [`${mode}-items`, id],
    queryFn: async () => {
      console.log('=== FETCHING DETAILS ===');
      console.log('Mode:', mode);
      console.log('ID:', id);

      let result;
      if (mode === 'sales') {
        result = await api.getSale(id);
        console.log('api.getSale returned:', result);

        if (result?.id) {
          // Fetch payments
          const salePayments = await api.getSalePayments(result.id);
          result.payments = salePayments || [];
          
          // Fetch returns
          const returns = await api.getReturns();
          let saleReturns = [];
          if (Array.isArray(returns)) {
            saleReturns = returns.filter(r => r.original_sale_id === result.id);
          } else if (returns?.success && Array.isArray(returns.data)) {
            saleReturns = returns.data.filter(r => r.original_sale_id === result.id);
          }
          result.returns = saleReturns;

          if (saleReturns.length > 0) {
            result.totalReturnedAmount = saleReturns.reduce((sum, r) => sum + parseFloat(r.total), 0);
            result.returnStatus = saleReturns.length > 0 ? 'partial' : 'none';
            const totalItems = result.items?.reduce((sum, i) => sum + i.quantity, 0) || 0;
            const totalReturnedItems = saleReturns.reduce((sum, r) => {
              return sum + (r.items?.reduce((s, i) => s + i.quantity, 0) || 0);
            }, 0);
            if (totalReturnedItems >= totalItems && totalItems > 0) {
              result.returnStatus = 'full';
            }
          }
        }
      } else if (mode === 'returns') {
        result = await api.getSale(id);
      } else {
        throw new Error("Invalid mode");
      }

      if (!result) {
        throw new Error("Failed to fetch details");
      }

      let saleData = result;
      if (result.success === true && result.data) {
        saleData = result.data;
      }

      // Parse returned_items
      let returnedItems: ReturnedRecord[] = [];
      if (saleData.returned_items) {
        try {
          if (typeof saleData.returned_items === 'string') {
            returnedItems = JSON.parse(saleData.returned_items);
          } else if (Array.isArray(saleData.returned_items)) {
            returnedItems = saleData.returned_items;
          }
        } catch (e) {
          console.error('Failed to parse returned_items:', e);
        }
      }

      // Map data
      const mappedData = {
        id: saleData.id,
        receiptNumber: saleData.receipt_number,
        customerName: saleData.customer_name,
        customerPhone: saleData.customer_phone,
        subtotal: saleData.subtotal?.toString() || "0",
        tax: saleData.tax?.toString() || "0",
        discount: saleData.discount?.toString() || "0",
        total: saleData.total?.toString() || "0",
        paymentMethod: saleData.payment_method,
        paymentStatus: saleData.payment_status,
        createdAt: saleData.created_at,
        employeeId: saleData.employee_id,
        returnStatus: saleData.return_status,
        totalReturnedAmount: saleData.total_returned_amount,
        returned_items: returnedItems,
        paid_amount: saleData.paid_amount || 0,
        due_amount: saleData.due_amount || 0,
        due_date: saleData.due_date,
        due_reason: saleData.due_reason,
        payments: saleData.payments || [],
        user: saleData.user_id ? { id: saleData.user_id, name: 'System', email: '' } : null,
        items: (saleData.items || []).map((item: any) => ({
          id: item.id,
          productId: item.product_id,
          quantity: item.quantity,
          unitPrice: item.unit_price?.toString() || "0",
          total: item.total?.toString() || "0",
          product: item.product ? {
            id: item.product.id,
            name: item.product.name || 'Unknown Product',
            imageUrl: item.product.image_url,
            barcode: item.product.barcode,
            categoryName: item.product.category_name
          } : null
        })),
        returnItems: (saleData.returns || []).flatMap((returnRecord: any) =>
          (returnRecord.items || []).map((item: any) => ({
            id: item.id,
            productId: item.product_id,
            quantity: item.quantity,
            unitPrice: item.unit_price,
            total: item.total,
            product: item.product ? {
              id: item.product.id,
              name: item.product.name || 'Unknown Product',
              imageUrl: item.product.image_url,
              barcode: item.product.barcode,
              categoryName: item.product.category_name
            } : null
          }))
        ),
        returnReason: saleData.return_reason,
        returnFee: saleData.return_fee
      };

      return mappedData;
    },
    enabled: !!id && !!mode,
  });

  useEffect(() => {
    if (id && mode) {
      refetch();
    }
  }, [id, mode, refetch]);

  const { setTitle, setSubtitle } = useHeader();

  useEffect(() => {
    setTitle(mode === 'returns' ? "Return Details" : "Sale Details");
    setSubtitle(`Receipt #${sale?.receiptNumber || 'Loading...'}`);
  }, [sale?.receiptNumber, mode]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getReturnStatusBadge = (status: string) => {
    switch (status) {
      case 'full':
        return <Badge className="bg-red-500 text-white">Fully Returned</Badge>;
      case 'partial':
        return <Badge className="bg-yellow-500 text-white">Partially Returned</Badge>;
      default:
        return <Badge variant="outline">No Return</Badge>;
    }
  };

  const generateReceiptData = (): ReceiptData => {
    if (!sale) throw new Error("No sale data available");

    const isReturn = mode === 'returns';
    const receiptType = isReturn ? 'RETURN' : 'SALE';

    return {
      shopName: shop?.name || '',
      shopAddress: shop?.location || '',
      receiptNumber: sale.receiptNumber,
      date: format(new Date(sale.createdAt), 'dd/MM/yyyy'),
      time: format(new Date(sale.createdAt), 'HH:mm:ss'),
      customerName: sale.customerName || "Walk-in Customer",
      customerPhone: sale.customerPhone || "N/A",
      items: sale.items.map((item: any) => ({
        name: item.product?.name || 'Unknown Product',
        quantity: item.quantity,
        total: parseFloat(item.total),
        unitPrice: parseFloat(item.unitPrice),
        barcode: item.product?.barcode || '',
        category: item.product?.categoryName || ''
      })),
      subtotal: parseFloat(sale.subtotal),
      tax: parseFloat(sale.tax),
      discount: parseFloat(sale.discount),
      total: parseFloat(sale.total),
      paymentMethod: sale.paymentMethod,
      amountPaid: parseFloat(sale.total),
      change: 0,
      receiptType: receiptType,
      processedBy: sale.user?.name || 'System',
      returnFee: isReturn ? (sale as any).returnFee || 0 : 0,
      returnReason: isReturn ? (sale as any).returnReason || 'Product return' : undefined
    };
  };

  const handlePrintReceipt = () => {
    if (sale) {
      HanldePrintReceipt({ generateReceiptData });
    }
  };

  const { navigateTo } = useNavigation();
  const handleBack = () => {
    navigateTo(`/${mode}`);
  };

  if (!id || isLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-auto p-6">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading details...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !sale) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-auto p-6">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <p className="text-destructive text-lg mb-2">Error loading details</p>
              <p className="text-sm text-muted-foreground mb-4">{error?.message}</p>
              <Button onClick={handleBack} variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to {mode}
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const totalPaid = sale.payments?.reduce((sum, p) => sum + p.amount, 0) || sale.paid_amount || 0;
  const totalDue = sale.due_amount || (parseFloat(sale.total) - totalPaid);
  const netReceivable = parseFloat(sale.total) - (sale.totalReturnedAmount || 0) - totalPaid;
  const isOverdue = sale.due_date && new Date(sale.due_date) < new Date() && totalDue > 0;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <main className="flex-1 overflow-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <Button onClick={handleBack} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to {mode}
          </Button>
          <Button onClick={handlePrintReceipt}>
            <Printer className="h-4 w-4 mr-2" />
            Print Receipt
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Sale Info & Items */}
          <div className="lg:col-span-2 space-y-6">
            {mode === 'sales' && (
              <EditSaleForm
                currentEmployeeId={sale?.employeeId}
                currentPaymentStatus={sale?.paymentStatus}
                saleId={sale.id}
                onRefresh={refetch}
              />
            )}

            {/* Sale Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{mode === 'returns' ? 'Return Information' : 'Sale Information'}</span>
                  <div className="flex gap-2">
                    {mode === 'sales' && sale.returnStatus && getReturnStatusBadge(sale.returnStatus)}
                    <Badge className={getStatusColor(sale.paymentStatus)}>
                      {sale.paymentStatus?.toUpperCase()}
                    </Badge>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Receipt Number</p>
                    <p className="font-semibold">#{sale.receiptNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Date & Time</p>
                    <p className="font-semibold">
                      {format(new Date(sale.createdAt), 'dd/MM/yyyy HH:mm')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Payment Method</p>
                    <Badge className={getPaymentMethodColor(sale.paymentMethod)}>
                      {sale.paymentMethod?.toUpperCase()}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Processed By</p>
                    <p className="font-semibold">{sale.user?.name || 'System'}</p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3 flex items-center">
                    <User className="h-4 w-4 mr-2" />
                    Customer Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Name</p>
                      <p className="font-semibold">{sale.customerName || 'Walk-in Customer'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="font-semibold flex items-center">
                        <Phone className="h-4 w-4 mr-1" />
                        {sale.customerPhone || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sale Items */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Package className="h-5 w-5 mr-2" />
                  Sale Items ({sale.items.length} items)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {sale.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4 flex-1">
                        <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                          {item.product?.imageUrl ? (
                            <img src={item.product.imageUrl} alt={item.product.name} className="w-full h-full object-cover" />
                          ) : (
                            <Package className="h-6 w-6 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold">{item.product?.name || 'Unknown Product'}</p>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                            {item.product?.barcode && <span>Barcode: {item.product.barcode}</span>}
                            {item.product?.categoryName && <span>Category: {item.product.categoryName}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatPKR(parseFloat(item.total))}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.quantity} × {formatPKR(parseFloat(item.unitPrice))}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Returned Items History */}
            {sale.returned_items && sale.returned_items.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-destructive">
                    <RefreshCw className="h-5 w-5 mr-2" />
                    Returned Items History ({sale.returned_items.reduce((total, record) => total + record.items.length, 0)} items)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {sale.returned_items.map((returnRecord, idx) => (
                      <div key={idx} className="border border-destructive/30 rounded-lg overflow-hidden">
                        <div className="bg-destructive/10 p-3">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-semibold text-sm">Return Receipt: {returnRecord.returnReceiptNumber}</p>
                              <p className="text-xs text-muted-foreground">
                                Date: {new Date(returnRecord.returnDate).toLocaleString()}
                              </p>
                            </div>
                            <Badge variant="destructive" className="text-xs">Return #{idx + 1}</Badge>
                          </div>
                          {returnRecord.returnReason && <p className="text-sm mt-2">Reason: {returnRecord.returnReason}</p>}
                          {returnRecord.returnFee > 0 && <p className="text-sm">Return Fee: {formatPKR(returnRecord.returnFee)}</p>}
                        </div>
                        <div className="p-3 space-y-2">
                          <p className="text-sm font-medium">Returned Items:</p>
                          {returnRecord.items.map((item, itemIdx) => (
                            <div key={itemIdx} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                              <div className="flex-1">
                                <p className="font-medium text-sm">{item.productName}</p>
                                <p className="text-xs text-muted-foreground">
                                  Quantity: {item.quantity} × {formatPKR(item.unitPrice)}
                                </p>
                                {item.isDamaged && <Badge variant="destructive" className="text-xs mt-1">Damaged</Badge>}
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-destructive">{formatPKR(item.total)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Financial Summary */}
          <div className="space-y-6">
            {/* Amount Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Banknote className="h-5 w-5 mr-2" />
                  Amount Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-semibold">{formatPKR(parseFloat(sale.subtotal))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax ({parseFloat(sale.tax)}%):</span>
                  <span className="font-semibold">{formatPKR((parseFloat(sale.subtotal) * parseFloat(sale.tax)) / 100)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Discount ({parseFloat(sale.discount)}%):</span>
                  <span className="font-semibold text-destructive">-{formatPKR((parseFloat(sale.subtotal) * parseFloat(sale.discount)) / 100)}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-bold">Total:</span>
                  <span className="font-bold text-primary">{formatPKR(parseFloat(sale.total))}</span>
                </div>

                {/* Payment Status */}
                <div className="border-t pt-2 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Paid:</span>
                    <span className="font-semibold text-green-600">{formatPKR(totalPaid)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Due Amount:</span>
                    <span className={`font-semibold ${isOverdue ? 'text-red-600' : 'text-orange-600'}`}>
                      {formatPKR(totalDue)}
                      {isOverdue && " (Overdue)"}
                    </span>
                  </div>
                  {sale.due_date && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Due Date:</span>
                      <span className={isOverdue ? "text-red-600 font-bold" : ""}>
                        {new Date(sale.due_date).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {sale.due_reason && (
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">Reason:</span> {sale.due_reason}
                    </div>
                  )}
                </div>

                {sale.totalReturnedAmount && sale.totalReturnedAmount > 0 && (
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-muted-foreground">Total Returned:</span>
                    <span className="font-semibold text-destructive">-{formatPKR(sale.totalReturnedAmount)}</span>
                  </div>
                )}

                <div className="flex justify-between border-t pt-3">
                  <span className="font-bold text-lg">Net Receivable:</span>
                  <span className="font-bold text-lg text-primary">{formatPKR(netReceivable)}</span>
                </div>
              </CardContent>
            </Card>
            {/* Replace the Amount Summary Card Content with this */}

<div className="space-y-3">
  <div className="flex justify-between">
    <span className="text-muted-foreground">Subtotal:</span>
    <span className="font-semibold">{formatPKR(parseFloat(sale.subtotal))}</span>
  </div>
  <div className="flex justify-between">
    <span className="text-muted-foreground">Tax:</span>
    <span className="font-semibold">{formatPKR((parseFloat(sale.subtotal) * parseFloat(sale.tax)) / 100)}</span>
  </div>
  <div className="flex justify-between">
    <span className="text-muted-foreground">Discount:</span>
    <span className="font-semibold text-destructive">-{formatPKR((parseFloat(sale.subtotal) * parseFloat(sale.discount)) / 100)}</span>
  </div>
  <div className="flex justify-between border-t pt-2">
    <span className="font-bold">Total:</span>
    <span className="font-bold text-primary">{formatPKR(parseFloat(sale.total))}</span>
  </div>

  {sale.totalReturnedAmount > 0 && (
    <div className="flex justify-between text-destructive">
      <span>Total Returned:</span>
      <span>-{formatPKR(sale.totalReturnedAmount)}</span>
    </div>
  )}

  <div className="border-t pt-2 space-y-2">
    <div className="flex justify-between">
      <span className="text-muted-foreground">Total Paid by Customer:</span>
      <span className="font-semibold text-green-600">{formatPKR(getTotalCustomerPaid(sale))}</span>
    </div>
    <div className="flex justify-between">
      <span className="text-muted-foreground">Total Refunded to Customer:</span>
      <span className="font-semibold text-red-600">{formatPKR(getTotalRefunded(sale))}</span>
    </div>
  </div>

  <div className="flex justify-between border-t pt-3 bg-muted/30 p-3 rounded-lg">
    <span className="font-bold">Net Position:</span>
    {getNetPosition(sale) > 0 ? (
      <span className="font-bold text-red-600">Customer Owes: {formatPKR(getNetPosition(sale))}</span>
    ) : getNetPosition(sale) < 0 ? (
      <span className="font-bold text-green-600">Shop Owes: {formatPKR(Math.abs(getNetPosition(sale)))}</span>
    ) : (
      <span className="font-bold text-green-600">✓ Fully Settled</span>
    )}
  </div>
</div>

            {/* Payment History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CreditCard className="h-5 w-5 mr-2" />
                  Payment History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {sale.payments && sale.payments.length > 0 ? (
                  <div className="space-y-3">
                    {sale.payments.map((payment, idx) => (
                      <div key={payment.id} className="border rounded-lg p-3">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium">Payment #{idx + 1}</span>
                          <Badge variant="outline">{payment.payment_method?.toUpperCase()}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Amount:</span>
                          <span className="font-semibold text-green-600">{formatPKR(payment.amount)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Date:</span>
                          <span>{new Date(payment.payment_date).toLocaleString()}</span>
                        </div>
                        {payment.notes && (
                          <div className="text-xs text-muted-foreground mt-2">
                            Note: {payment.notes}
                          </div>
                        )}
                      </div>
                    ))}
                    <div className="mt-3 pt-2 border-t text-right text-sm font-semibold">
                      Total Paid: {formatPKR(sale.payments.reduce((sum, p) => sum + p.amount, 0))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <p>No payments recorded</p>
                    {sale.payment_status === 'partial' && (
                      <p className="text-xs mt-2">Due amount: {formatPKR(totalDue)}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}