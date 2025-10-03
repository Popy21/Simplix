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
}

export interface User {
  id?: number;
  email: string;
  password: string;
  name: string;
  role?: string;
  team_id?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Team {
  id?: number;
  name: string;
  description?: string;
  owner_id: number;
  created_at?: string;
  updated_at?: string;
}

export interface TeamMember {
  id?: number;
  team_id: number;
  user_id: number;
  role?: string;
  joined_at?: string;
}

export interface Quote {
  id?: number;
  customer_id: number;
  user_id: number;
  title: string;
  description?: string;
  items: QuoteItem[];
  subtotal: number;
  tax_rate?: number;
  tax_amount?: number;
  total_amount: number;
  status?: string;
  valid_until?: string;
  created_at?: string;
  updated_at?: string;
}

export interface QuoteItem {
  id?: number;
  quote_id?: number;
  product_id?: number;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}
