export interface Customer {
  id?: number;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  address?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Product {
  id?: number;
  name: string;
  description?: string;
  price: number;
  stock: number;
  created_at?: string;
  updated_at?: string;
}

export interface Sale {
  id?: number;
  customer_id: number;
  product_id: number;
  quantity: number;
  total_amount: number;
  status?: string;
  sale_date?: string;
  notes?: string;
  customer_name?: string;
  product_name?: string;
  product_price?: number;
}
