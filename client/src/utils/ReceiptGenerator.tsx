import { formatPKR } from "@/lib/currency";

export interface ReceiptData {
  shopName: string;
  salesman: string;
  shopAddress: string;
  receiptNumber: string;
  date: string;
  time: string;
  customerName: string;
  customerPhone: string;
  items: Array<{
    name: string;
    quantity: number;
    total: number;
  }>;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: string;
  amountPaid: number;
  change: number;
}

interface PrintReceiptProps {
  generateReceiptData: () => ReceiptData;
}

export const HanldePrintReceipt = ({ generateReceiptData }: PrintReceiptProps) => {
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    const receiptData = generateReceiptData();

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${receiptData.receiptNumber}</title>
          <style>
            body { 
              font-family: 'Courier New', monospace; 
              max-width: 300px; 
              margin: 0 auto; 
              padding: 10px; 
              font-size: 12px;
            }
            .header { text-align: center; margin-bottom: 15px; }
            .shop-name { font-weight: bold; font-size: 14px; margin: 5px 0; }
            .shop-address { font-size: 10px; margin-bottom: 10px; }
            .divider { border-top: 1px dashed #000; margin: 10px 0; }
            .receipt-info { display: flex; justify-content: space-between; margin: 5px 0; }
            .items-table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            .items-table td { padding: 3px 0; border-bottom: 1px dotted #ddd; }
            .items-table .item-name { width: 60%; }
            .items-table .item-qty { width: 15%; text-align: center; }
            .items-table .item-price { width: 25%; text-align: right; }
            .total-section { margin-top: 10px; }
            .total-row { display: flex; justify-content: space-between; margin: 3px 0; }
            .grand-total { font-weight: bold; border-top: 1px solid #000; padding-top: 5px; }
            .payment-info { margin-top: 10px; }
            .footer { text-align: center; margin-top: 15px; font-size: 10px; }
            @media print { 
              body { margin: 0; padding: 10px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="shop-name">${receiptData.shopName}</div>
            <div class="shop-address">${receiptData.shopAddress}</div>
          </div>
          
          <div class="divider"></div>
          
          <div class="receipt-info">
            <span>Receipt: ${receiptData.receiptNumber}</span>
            <span>${receiptData.date}</span>
          </div>
          <div class="receipt-info">
            <span>Time: ${receiptData.time}</span>
          </div>
          <div class="receipt-info">
            <span>Saleman: ${receiptData?.salesman ? receiptData?.salesman : "System"}</span>
          </div>
          
          <div class="divider"></div>
          
          <div class="customer-info">
            <div>Customer: ${receiptData.customerName}</div>
            <div>Phone: ${receiptData.customerPhone}</div>
          </div>
          
          <table class="items-table">
            <tbody>
              ${receiptData.items.map(item => `
                <tr>
                  <td class="item-name">${item.name}</td>
                  <td class="item-qty">${item.quantity}x</td>
                  <td class="item-price">${formatPKR(item.total)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="divider"></div>
          
          <div class="total-section">
            <div class="total-row">
              <span>Subtotal:</span>
              <span>${formatPKR(receiptData.subtotal)}</span>
            </div>
            <div class="total-row">
              <span>Tax:</span>
              <span>${formatPKR(receiptData.tax)}</span>
            </div>
            <div class="total-row">
              <span>Discount:</span>
              <span>-${formatPKR(receiptData.discount)}</span>
            </div>
            <div class="total-row grand-total">
              <span>Total:</span>
              <span>${formatPKR(receiptData.total)}</span>
            </div>
          </div>
          
          <div class="payment-info">
            <div class="total-row">
              <span>Payment Method:</span>
              <span>${receiptData.paymentMethod.toUpperCase()}</span>
            </div>
            <div class="total-row">
              <span>Amount Paid:</span>
              <span>${formatPKR(receiptData.amountPaid)}</span>
            </div>
            <div class="total-row">
              <span>Change:</span>
              <span>${formatPKR(receiptData.change)}</span>
            </div>
          </div>
          
          <div class="divider"></div>
          
          <div class="footer">
            <div>Thank you for your purchase!</div>
            <div>Visit again</div>
          </div>
          
          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => window.close(), 1000);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }
};