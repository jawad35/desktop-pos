export interface Product {
  id: number;
  name: string;
  price: number;
  quantity: number;
  category: string;
  created_at?: string;
  updated_at?: string;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Order {
  id: number;
  order_number: string;
  total: number;
  status: string;
  created_at: string;
  items: OrderItem[];
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  quantity: number;
  price: number;
}
