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

export interface Supplier {
  id?: string;
  name: string;
  legal_name?: string;
  category?: 'vendor' | 'service' | 'freelancer' | 'other';
  contact_name?: string;
  email?: string;
  phone?: string;
  website?: string;
  tax_number?: string;
  vat_number?: string;
  iban?: string;
  payment_terms?: number;
  billing_address?: Record<string, any>;
  shipping_address?: Record<string, any>;
  default_currency?: string;
  notes?: string;
  tags?: string[];
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface Expense {
  id?: string;
  supplier_id?: string;
  supplier_name?: string;
  category_id?: string;
  category_name?: string;
  expense_date: string;
  due_date?: string;
  description?: string;
  reference?: string;
  amount: number;
  tax_amount?: number;
  currency?: string;
  status?: 'draft' | 'submitted' | 'approved' | 'rejected' | 'paid';
  payment_status?: 'unpaid' | 'partial' | 'paid';
  expense_type?: string;
  payment_method?: string;
  attachments?: any[];
  notes?: string;
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}
