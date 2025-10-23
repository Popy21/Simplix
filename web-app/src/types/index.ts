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

export interface Supplier {
  id?: string;
  name: string;
  legal_name?: string;
  category?: 'vendor' | 'service' | 'freelancer' | 'other';
  contact_name?: string;
  email?: string;
  phone?: string;
  website?: string;
  payment_terms?: number;
  default_currency?: string;
  tags?: string[];
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
  notes?: string;
  attachments?: any[];
  created_at?: string;
  updated_at?: string;
}
