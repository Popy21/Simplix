-- Create invoice_templates table for customizable invoice templates
CREATE TABLE IF NOT EXISTS invoice_templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  is_default BOOLEAN DEFAULT false,

  -- Logo and branding
  logo_url TEXT,
  company_name VARCHAR(255),
  company_address TEXT,
  company_email VARCHAR(255),
  company_phone VARCHAR(50),
  company_siret VARCHAR(50),
  company_tva VARCHAR(50),

  -- Colors and styling
  primary_color VARCHAR(7) DEFAULT '#007AFF',
  secondary_color VARCHAR(7) DEFAULT '#34C759',
  text_color VARCHAR(7) DEFAULT '#000000',
  header_background VARCHAR(7) DEFAULT '#F5F5F5',

  -- Layout options
  show_logo BOOLEAN DEFAULT true,
  show_company_info BOOLEAN DEFAULT true,
  show_payment_terms BOOLEAN DEFAULT true,
  show_bank_details BOOLEAN DEFAULT true,

  -- Custom fields
  header_text TEXT,
  footer_text TEXT,
  payment_terms TEXT DEFAULT 'Paiement à 30 jours',
  bank_details TEXT,
  legal_mentions TEXT,

  -- Template structure
  template_layout VARCHAR(50) DEFAULT 'classic' CHECK (template_layout IN ('classic', 'modern', 'minimal', 'professional')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create recurring_invoices table
CREATE TABLE IF NOT EXISTS recurring_invoices (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
  template_id INTEGER REFERENCES invoice_templates(id) ON DELETE SET NULL,

  -- Invoice details
  title VARCHAR(500),
  description TEXT,
  items JSONB NOT NULL, -- Store invoice items as JSON

  -- Amounts
  subtotal DECIMAL(15, 2) DEFAULT 0,
  tax_rate DECIMAL(5, 2) DEFAULT 0,
  tax_amount DECIMAL(15, 2) DEFAULT 0,
  total_amount DECIMAL(15, 2) DEFAULT 0,

  -- Recurrence settings
  frequency VARCHAR(50) NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
  start_date DATE NOT NULL,
  end_date DATE,
  next_invoice_date DATE NOT NULL,

  -- Status
  is_active BOOLEAN DEFAULT true,
  last_generated_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create progress_invoices table for factures d'avancement (situations)
CREATE TABLE IF NOT EXISTS progress_invoices (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
  project_name VARCHAR(255) NOT NULL,

  -- Total project amount
  total_project_amount DECIMAL(15, 2) NOT NULL,

  -- Current progress
  situation_number INTEGER NOT NULL,
  progress_percentage DECIMAL(5, 2) NOT NULL,
  previous_progress_percentage DECIMAL(5, 2) DEFAULT 0,

  -- This period's work
  period_amount DECIMAL(15, 2) NOT NULL,
  tax_rate DECIMAL(5, 2) DEFAULT 20,
  tax_amount DECIMAL(15, 2) DEFAULT 0,
  total_amount DECIMAL(15, 2) DEFAULT 0,

  -- Cumulative amounts
  cumulative_amount DECIMAL(15, 2) DEFAULT 0,

  -- Reference to generated invoice
  invoice_id INTEGER REFERENCES invoices(id) ON DELETE SET NULL,

  -- Details
  description TEXT,
  items JSONB, -- Store work items as JSON

  -- Status
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'cancelled')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create payment_reminders table for automatic reminders
CREATE TABLE IF NOT EXISTS payment_reminders (
  id SERIAL PRIMARY KEY,
  invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,

  -- Reminder details
  reminder_type VARCHAR(50) NOT NULL CHECK (reminder_type IN ('first', 'second', 'final', 'legal')),
  days_after_due INTEGER NOT NULL,

  -- Status
  sent_at TIMESTAMPTZ,
  email_subject VARCHAR(255),
  email_body TEXT,

  -- Automatic reminder settings
  is_automatic BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create accounting_exports table for parameterizable exports
CREATE TABLE IF NOT EXISTS accounting_exports (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  export_format VARCHAR(50) NOT NULL CHECK (export_format IN ('csv', 'xlsx', 'fec', 'ciel', 'sage', 'ebp', 'quadratus')),

  -- Column mapping
  column_mapping JSONB NOT NULL, -- Maps our fields to accounting software fields

  -- Filters
  date_from DATE,
  date_to DATE,
  include_paid BOOLEAN DEFAULT true,
  include_unpaid BOOLEAN DEFAULT true,

  -- Export settings
  separator VARCHAR(1) DEFAULT ',',
  decimal_separator VARCHAR(1) DEFAULT '.',
  date_format VARCHAR(20) DEFAULT 'DD/MM/YYYY',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_invoice_templates_default ON invoice_templates(is_default);
CREATE INDEX IF NOT EXISTS idx_recurring_invoices_customer ON recurring_invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_recurring_invoices_active ON recurring_invoices(is_active);
CREATE INDEX IF NOT EXISTS idx_recurring_invoices_next_date ON recurring_invoices(next_invoice_date);
CREATE INDEX IF NOT EXISTS idx_progress_invoices_customer ON progress_invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_progress_invoices_project ON progress_invoices(project_name);
CREATE INDEX IF NOT EXISTS idx_payment_reminders_invoice ON payment_reminders(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_reminders_sent ON payment_reminders(sent_at);

-- Grant permissions
GRANT ALL PRIVILEGES ON invoice_templates TO postgres;
GRANT ALL PRIVILEGES ON recurring_invoices TO postgres;
GRANT ALL PRIVILEGES ON progress_invoices TO postgres;
GRANT ALL PRIVILEGES ON payment_reminders TO postgres;
GRANT ALL PRIVILEGES ON accounting_exports TO postgres;
GRANT USAGE, SELECT ON SEQUENCE invoice_templates_id_seq TO postgres;
GRANT USAGE, SELECT ON SEQUENCE recurring_invoices_id_seq TO postgres;
GRANT USAGE, SELECT ON SEQUENCE progress_invoices_id_seq TO postgres;
GRANT USAGE, SELECT ON SEQUENCE payment_reminders_id_seq TO postgres;
GRANT USAGE, SELECT ON SEQUENCE accounting_exports_id_seq TO postgres;

-- No default template - user should create their first template via onboarding
-- This ensures users see the onboarding screen when they first access templates
