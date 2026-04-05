import { useEffect } from "react";
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
  Download,
  User,
  Phone,
  CreditCard,
  Package,
  DollarSign
} from "lucide-react";
import { useHeader } from "@/contexts/HeaderContext";
import { HanldePrintReceipt, ReceiptData } from "@/utils/ReceiptGenerator";
import { useAuth } from "@/hooks/useAuth";
import { getPaymentMethodColor } from "@/utils/GetPaymentMethodColor";
import EditSaleForm from "@/components/Sale/EditSaleForm";
import { api } from "../services/electron-api";
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
  user: {
    id: string;
    name: string;
    email: string;
  } | null;
  items: SaleItem[];
}

export default function ItemDetails() {
  const [location, navigate] = useLocation();
  const { shop } = useAuth();

  const [match, params] = useRoute('/item-details/:id/:mode');
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
      } else if (mode === 'returns') {
        // Use getSale for returns too - it works the same way
        result = await api.getSale(id);
        console.log('api.getSale (for return) returned:', result);
      } else {
        throw new Error("Invalid mode");
      }

      if (!result) {
        throw new Error("Failed to fetch details");
      }

      // Handle both response formats
      let saleData = result;
      if (result.success === true && result.data) {
        saleData = result.data;
      }

      // Map snake_case to camelCase
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
        returnFee: saleData.return_fee,
        returnReason: saleData.return_reason
      };

      return mappedData;
    },
    enabled: !!id && !!mode,
  });

  const { setTitle, setSubtitle } = useHeader();

  useEffect(() => {
    setTitle("Sale Details");
    setSubtitle(`Receipt #${sale?.receiptNumber || 'Loading...'}`);
  }, [sale?.receiptNumber]);



  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-secondary/10 text-secondary';
      case 'pending':
        return 'bg-accent/10 text-accent';
      case 'cancelled':
        return 'bg-destructive/10 text-destructive';
      default:
        return 'bg-muted/10 text-muted-foreground';
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
        unitPrice: parseFloat(item.unit_price || item.unitPrice),
        barcode: item.product?.barcode || '',
        category: item.product?.category_name || ''
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


  const handleBack = () => {
    navigate(`/${mode}`);
  };

  // Check if route doesn't match or no ID
  if (!match || !id) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-auto p-6">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <p className="text-destructive text-lg mb-2">Sale not found</p>
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

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-auto p-6">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading sale details...</p>
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
              <p className="text-destructive text-lg mb-2">Error loading sale details</p>
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

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <main className="flex-1 overflow-auto p-6">
        {/* Header with Back Button */}
        <div className="flex items-center justify-between mb-6">
          <Button onClick={handleBack} variant="outline" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to {mode}
          </Button>

          <div className="flex space-x-2">
            <Button onClick={handlePrintReceipt}>
              <Printer className="h-4 w-4 mr-2" />
              Print Receipt
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sale Information */}
          {/* Sale Information */}
          <div className="lg:col-span-2 space-y-6">
            {mode === 'sales' && (
              <EditSaleForm
                currentEmployeeId={sale?.employeeId}
                currentPaymentStatus={sale?.paymentStatus}
                saleId={sale.id}
                onRefresh={refetch}
              />
            )}
          </div>

          <div className="lg:col-span-2 space-y-6">
            {/* Sale Summary Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Sale Information</span>
                  <Badge className={getStatusColor(sale.paymentStatus)}>
                    {sale.paymentStatus.toUpperCase()}
                  </Badge>
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
                      {sale.paymentMethod.toUpperCase()}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Processed By</p>
                    <p className="font-semibold">{sale.user?.name || 'System'}</p>
                  </div>
                </div>

                {/* Customer Information */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3 flex items-center">
                    <User className="h-4 w-4 mr-2" />
                    Customer Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Name</p>
                      <p className="font-semibold">
                        {sale.customerName || 'Walk-in Customer'}
                      </p>
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

            {/* Items List Card */}
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
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center space-x-4 flex-1">
                        {/* Product Image */}
                        <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                          {item.product?.imageUrl ? (
                            <img
                              src={item.product.imageUrl}
                              alt={item.product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Package className="h-6 w-6 text-muted-foreground" />
                          )}
                        </div>

                        {/* Product Details */}
                        <div className="flex-1">
                          <p className="font-semibold">{item.product?.name || 'Unknown Product'}</p>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                            {item.product?.barcode && (
                              <span>Barcode: {item.product.barcode}</span>
                            )}
                            {item.product?.categoryName && (
                              <span>Category: {item.product.categoryName}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Quantity and Price */}
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
          </div>

          {/* Summary Sidebar */}
          <div className="space-y-6">
            {/* Amount Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DollarSign className="h-5 w-5 mr-2" />
                  Amount Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-semibold">{formatPKR(parseFloat(sale.subtotal))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax:</span>
                  <span className="font-semibold">{formatPKR(parseFloat(sale.tax))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Discount:</span>
                  <span className="font-semibold text-destructive">
                    -{formatPKR(parseFloat(sale.discount))}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-3">
                  <span className="font-bold text-lg">Total:</span>
                  <span className="font-bold text-lg text-primary">
                    {formatPKR(parseFloat(sale.total))}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Payment Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CreditCard className="h-5 w-5 mr-2" />
                  Payment Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Method:</span>
                  <Badge className={getPaymentMethodColor(sale.paymentMethod)}>
                    {sale.paymentMethod.toUpperCase()}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge className={getStatusColor(sale.paymentStatus)}>
                    {sale.paymentStatus.toUpperCase()}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date:</span>
                  <span className="font-semibold">
                    {format(new Date(sale.createdAt), 'dd/MM/yyyy')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Time:</span>
                  <span className="font-semibold">
                    {format(new Date(sale.createdAt), 'HH:mm:ss')}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}