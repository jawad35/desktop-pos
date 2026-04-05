// API Response Types
export interface DashboardStats {
  todaySales: string;
  monthlyRevenue: string;
  outOfStock: number;
  totalProducts: number;
  lowStockProducts: Array<{
    id: string;
    name: string;
    stock: number;
    minStock: number;
  }>;
}

export interface Sale {
  id: string;
  receiptNumber: string;
  customerName?: string;
  customerPhone?: string;
  subtotal: string;
  tax: string;
  discount: string;
  total: string;
  paymentMethod: string;
  paymentStatus: string;
  userId: string;
  createdAt: string;
  items?: SaleItem[];
}

export interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  quantity: number;
  unitPrice: string;
  total: string;
  product?: Product;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  description?: string;
  categoryId?: string;
  brandId?: string;
  supplierId?: string;
  costPrice: string;
  sellingPrice: string;
  stock: number;
  minStock: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  category?: Category;
  brand?: Brand;
  supplier?: Supplier;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Brand {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Brand {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  selling?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  vehicleInfo?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type Purchase = {
  id: string;
  po_number: string;           // snake_case
  supplier_id: string;         // snake_case
  subtotal: number;
  tax: number;
  total: number;
  status: string;
  payment_status: string;      // snake_case
  payment_method: string;      // snake_case
  items_description: string;   // snake_case
  created_at: string;
  updated_at: string;
  user_id: string;
  shop_id: string;
};

export interface PurchaseItem {
  id: string;
  purchaseId: string;
  productId: string;
  quantity: number;
  unitPrice: string;
  total: string;
  product?: Product;
}

export interface Expense {
  id: string;
  title: string;
  description?: string;
  amount: string;
  category: string;
  paymentMethod?: string;
  receiptNumber?: string;
  userId: string;
  createdAt: string;
}

export interface TransactionLog {
  id: string;
  transactionId: string;
  type: string;
  amount: string;
  description?: string;
  userId: string;
  relatedId?: string;
  createdAt: string;
}

export interface User {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

// API Response wrappers
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}