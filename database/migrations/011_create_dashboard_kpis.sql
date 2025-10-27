-- Create dashboard_kpis table for real-time KPI tracking
CREATE TABLE IF NOT EXISTS dashboard_kpis (
  id SERIAL PRIMARY KEY,
  kpi_name VARCHAR(255) NOT NULL,
  kpi_type VARCHAR(50) NOT NULL CHECK (kpi_type IN ('revenue', 'profit', 'cash_flow', 'ar_aging', 'invoice_count', 'customer_count', 'payment_delay', 'conversion_rate')),

  -- Current values
  current_value DECIMAL(15, 2),
  previous_value DECIMAL(15, 2),
  target_value DECIMAL(15, 2),

  -- Period
  period_type VARCHAR(50) CHECK (period_type IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Metadata
  unit VARCHAR(20), -- €, %, count, days, etc.
  is_favorable BOOLEAN, -- Is higher better?

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create revenue_projections table for CA and result forecasting
CREATE TABLE IF NOT EXISTS revenue_projections (
  id SERIAL PRIMARY KEY,

  -- Period
  projection_date DATE NOT NULL,
  projection_type VARCHAR(50) CHECK (projection_type IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),

  -- Revenue metrics
  projected_revenue DECIMAL(15, 2) NOT NULL,
  actual_revenue DECIMAL(15, 2),
  invoiced_amount DECIMAL(15, 2),
  paid_amount DECIMAL(15, 2),
  outstanding_amount DECIMAL(15, 2),

  -- Cost and profit
  projected_costs DECIMAL(15, 2),
  actual_costs DECIMAL(15, 2),
  projected_profit DECIMAL(15, 2),
  actual_profit DECIMAL(15, 2),

  -- Confidence
  confidence_level DECIMAL(5, 2), -- 0-100%

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(projection_date, projection_type)
);

-- Create business_decisions table for impact measurement
CREATE TABLE IF NOT EXISTS business_decisions (
  id SERIAL PRIMARY KEY,
  decision_name VARCHAR(255) NOT NULL,
  description TEXT,
  decision_type VARCHAR(50) CHECK (decision_type IN ('pricing', 'hiring', 'investment', 'cost_reduction', 'marketing', 'other')),

  -- Decision details
  implementation_date DATE,
  expected_impact_type VARCHAR(50), -- revenue_increase, cost_reduction, etc.
  expected_impact_amount DECIMAL(15, 2),
  expected_impact_percentage DECIMAL(5, 2),

  -- Actual impact (measured over time)
  actual_impact_amount DECIMAL(15, 2),
  actual_impact_percentage DECIMAL(5, 2),
  measurement_period_days INTEGER DEFAULT 90,

  -- Status
  status VARCHAR(50) DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create multi_company_access table for managing multiple companies
CREATE TABLE IF NOT EXISTS multi_company_access (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  company_id INTEGER NOT NULL,

  -- Access details
  role VARCHAR(50) DEFAULT 'viewer' CHECK (role IN ('owner', 'admin', 'accountant', 'viewer')),
  can_create_invoices BOOLEAN DEFAULT false,
  can_view_financials BOOLEAN DEFAULT true,
  can_manage_settings BOOLEAN DEFAULT false,

  -- Status
  is_active BOOLEAN DEFAULT true,
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, company_id)
);

-- Create companies_settings table for storing company-specific settings
CREATE TABLE IF NOT EXISTS companies_settings (
  id SERIAL PRIMARY KEY,
  company_name VARCHAR(255) NOT NULL UNIQUE,

  -- Company details
  legal_form VARCHAR(100),
  siret VARCHAR(50),
  tva_number VARCHAR(50),
  capital DECIMAL(15, 2),

  -- Contact info
  address TEXT,
  postal_code VARCHAR(10),
  city VARCHAR(100),
  country VARCHAR(100) DEFAULT 'France',
  phone VARCHAR(50),
  email VARCHAR(255),
  website VARCHAR(255),

  -- Banking
  bank_name VARCHAR(255),
  iban VARCHAR(50),
  bic VARCHAR(20),

  -- Default settings
  default_payment_terms INTEGER DEFAULT 30, -- days
  default_tax_rate DECIMAL(5, 2) DEFAULT 20.00,
  invoice_prefix VARCHAR(10) DEFAULT 'INV',
  quote_prefix VARCHAR(10) DEFAULT 'DEV',

  -- Branding
  logo_url TEXT,
  primary_color VARCHAR(7) DEFAULT '#007AFF',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create article_packs table for managing product/service bundles
CREATE TABLE IF NOT EXISTS article_packs (
  id SERIAL PRIMARY KEY,
  pack_name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Pack details
  pack_type VARCHAR(50) CHECK (pack_type IN ('fixed', 'variable', 'mixed')),
  items JSONB NOT NULL, -- Array of {product_id, quantity, unit_price}

  -- Pricing
  total_price DECIMAL(15, 2),
  discount_percentage DECIMAL(5, 2) DEFAULT 0,
  final_price DECIMAL(15, 2),

  -- Status
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create bank_transactions table for Linxo integration
CREATE TABLE IF NOT EXISTS bank_transactions (
  id SERIAL PRIMARY KEY,
  external_id VARCHAR(255), -- Linxo transaction ID

  -- Transaction details
  transaction_date DATE NOT NULL,
  value_date DATE,
  description TEXT,
  amount DECIMAL(15, 2) NOT NULL,
  balance_after DECIMAL(15, 2),

  -- Categorization
  category VARCHAR(100),
  subcategory VARCHAR(100),
  is_expense BOOLEAN,

  -- Matching
  matched_invoice_id INTEGER REFERENCES invoices(id) ON DELETE SET NULL,
  matched_payment_id INTEGER REFERENCES payments(id) ON DELETE SET NULL,
  is_reconciled BOOLEAN DEFAULT false,
  reconciled_at TIMESTAMPTZ,

  -- Bank details
  bank_account_id INTEGER,
  bank_name VARCHAR(255),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_dashboard_kpis_type ON dashboard_kpis(kpi_type);
CREATE INDEX IF NOT EXISTS idx_dashboard_kpis_period ON dashboard_kpis(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_revenue_projections_date ON revenue_projections(projection_date);
CREATE INDEX IF NOT EXISTS idx_revenue_projections_type ON revenue_projections(projection_type);
CREATE INDEX IF NOT EXISTS idx_business_decisions_status ON business_decisions(status);
CREATE INDEX IF NOT EXISTS idx_business_decisions_date ON business_decisions(implementation_date);
CREATE INDEX IF NOT EXISTS idx_multi_company_user ON multi_company_access(user_id);
CREATE INDEX IF NOT EXISTS idx_multi_company_company ON multi_company_access(company_id);
CREATE INDEX IF NOT EXISTS idx_article_packs_active ON article_packs(is_active);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_date ON bank_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_reconciled ON bank_transactions(is_reconciled);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_invoice ON bank_transactions(matched_invoice_id);

-- Grant permissions
GRANT ALL PRIVILEGES ON dashboard_kpis TO postgres;
GRANT ALL PRIVILEGES ON revenue_projections TO postgres;
GRANT ALL PRIVILEGES ON business_decisions TO postgres;
GRANT ALL PRIVILEGES ON multi_company_access TO postgres;
GRANT ALL PRIVILEGES ON companies_settings TO postgres;
GRANT ALL PRIVILEGES ON article_packs TO postgres;
GRANT ALL PRIVILEGES ON bank_transactions TO postgres;
GRANT USAGE, SELECT ON SEQUENCE dashboard_kpis_id_seq TO postgres;
GRANT USAGE, SELECT ON SEQUENCE revenue_projections_id_seq TO postgres;
GRANT USAGE, SELECT ON SEQUENCE business_decisions_id_seq TO postgres;
GRANT USAGE, SELECT ON SEQUENCE multi_company_access_id_seq TO postgres;
GRANT USAGE, SELECT ON SEQUENCE companies_settings_id_seq TO postgres;
GRANT USAGE, SELECT ON SEQUENCE article_packs_id_seq TO postgres;
GRANT USAGE, SELECT ON SEQUENCE bank_transactions_id_seq TO postgres;
