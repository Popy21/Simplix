-- ========================================
-- MIGRATION 021: TOUS LES NOUVEAUX MODULES
-- E-Facturation, Comptabilité, API, Marketing, E-commerce, RH, Ticketing, Multi-devises, Signature, Inventaire avancé
-- ========================================

-- ========================================
-- 1. E-FACTURATION
-- ========================================

-- Configuration e-facturation par organisation
CREATE TABLE IF NOT EXISTS efacture_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  facturx_enabled BOOLEAN DEFAULT false,
  chorus_pro_enabled BOOLEAN DEFAULT false,
  chorus_pro_client_id VARCHAR(255),
  chorus_pro_client_secret_encrypted TEXT,
  auto_generate_facturx BOOLEAN DEFAULT true,
  auto_submit_chorus_pro BOOLEAN DEFAULT false,
  signature_enabled BOOLEAN DEFAULT false,
  certificate_path VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(organization_id)
);

-- Ajouter colonnes e-facturation aux invoices
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS facturx_file VARCHAR(255);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS facturx_generated_at TIMESTAMP;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS chorus_pro_id VARCHAR(100);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS chorus_pro_submitted_at TIMESTAMP;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS chorus_pro_status VARCHAR(50);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS buyer_siret VARCHAR(14);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS service_code VARCHAR(50);

-- Historique des soumissions Chorus Pro
CREATE TABLE IF NOT EXISTS chorus_pro_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  chorus_pro_id VARCHAR(100) UNIQUE,
  status VARCHAR(50),
  submitted_at TIMESTAMP,
  validated_at TIMESTAMP,
  rejected_at TIMESTAMP,
  rejection_reason TEXT,
  paid_at TIMESTAMP,
  response_data JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chorus_submissions_invoice ON chorus_pro_submissions(invoice_id);
CREATE INDEX idx_chorus_submissions_status ON chorus_pro_submissions(status);

-- ========================================
-- 2. COMPTABILITÉ & TRÉSORERIE
-- ========================================

-- Plan comptable
CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  account_number VARCHAR(20) NOT NULL,
  account_name VARCHAR(255) NOT NULL,
  account_type VARCHAR(50) NOT NULL,
  parent_account_id UUID REFERENCES chart_of_accounts(id),
  is_active BOOLEAN DEFAULT true,
  is_system BOOLEAN DEFAULT false,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(organization_id, account_number)
);

CREATE INDEX idx_coa_org ON chart_of_accounts(organization_id);
CREATE INDEX idx_coa_number ON chart_of_accounts(account_number);
CREATE INDEX idx_coa_type ON chart_of_accounts(account_type);

-- Écritures comptables
CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  entry_number VARCHAR(50) UNIQUE NOT NULL,
  entry_date DATE NOT NULL,
  description TEXT,
  reference VARCHAR(100),
  reference_type VARCHAR(50),
  reference_id UUID,
  status VARCHAR(20) DEFAULT 'DRAFT',
  posted_at TIMESTAMP,
  posted_by UUID REFERENCES users(id),
  reversed_at TIMESTAMP,
  reversed_by UUID REFERENCES users(id),
  reversal_entry_id UUID REFERENCES journal_entries(id),
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_je_org ON journal_entries(organization_id);
CREATE INDEX idx_je_date ON journal_entries(entry_date);
CREATE INDEX idx_je_status ON journal_entries(status);
CREATE INDEX idx_je_reference ON journal_entries(reference_type, reference_id);

-- Lignes d'écritures
CREATE TABLE IF NOT EXISTS journal_entry_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id UUID REFERENCES chart_of_accounts(id),
  description TEXT,
  debit DECIMAL(15, 2) DEFAULT 0,
  credit DECIMAL(15, 2) DEFAULT 0,
  line_number INTEGER,
  tax_code VARCHAR(20),
  tax_amount DECIMAL(15, 2),
  analytic_code VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_jel_entry ON journal_entry_lines(journal_entry_id);
CREATE INDEX idx_jel_account ON journal_entry_lines(account_id);

-- Comptes bancaires
CREATE TABLE IF NOT EXISTS bank_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  account_name VARCHAR(255) NOT NULL,
  account_number VARCHAR(50),
  iban VARCHAR(34),
  bic VARCHAR(11),
  bank_name VARCHAR(255),
  currency VARCHAR(3) DEFAULT 'EUR',
  opening_balance DECIMAL(15, 2) DEFAULT 0,
  current_balance DECIMAL(15, 2) DEFAULT 0,
  chart_account_id UUID REFERENCES chart_of_accounts(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_bank_accounts_org ON bank_accounts(organization_id);

-- Transactions bancaires
CREATE TABLE IF NOT EXISTS bank_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bank_account_id UUID REFERENCES bank_accounts(id) ON DELETE CASCADE,
  transaction_date DATE NOT NULL,
  value_date DATE,
  description TEXT,
  reference VARCHAR(100),
  amount DECIMAL(15, 2) NOT NULL,
  balance_after DECIMAL(15, 2),
  category VARCHAR(100),
  imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  import_batch_id UUID,
  is_reconciled BOOLEAN DEFAULT false,
  reconciled_with_id UUID REFERENCES journal_entries(id),
  reconciled_at TIMESTAMP,
  reconciled_by UUID REFERENCES users(id),
  notes TEXT,
  raw_data JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_bank_trans_account ON bank_transactions(bank_account_id);
CREATE INDEX idx_bank_trans_date ON bank_transactions(transaction_date);
CREATE INDEX idx_bank_trans_reconciled ON bank_transactions(is_reconciled);

-- Règles de rapprochement
CREATE TABLE IF NOT EXISTS reconciliation_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  match_type VARCHAR(50) NOT NULL,
  match_pattern VARCHAR(255) NOT NULL,
  account_id UUID REFERENCES chart_of_accounts(id),
  category VARCHAR(100),
  auto_reconcile BOOLEAN DEFAULT false,
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_recon_rules_org ON reconciliation_rules(organization_id);

-- Scénarios de trésorerie
CREATE TABLE IF NOT EXISTS cash_flow_scenarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  assumptions JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Prévisions de trésorerie
CREATE TABLE IF NOT EXISTS cash_flow_forecasts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  scenario_id UUID REFERENCES cash_flow_scenarios(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  period_type VARCHAR(20) DEFAULT 'MONTH',
  expected_revenue DECIMAL(15, 2) DEFAULT 0,
  expected_payments_received DECIMAL(15, 2) DEFAULT 0,
  other_income DECIMAL(15, 2) DEFAULT 0,
  expected_expenses DECIMAL(15, 2) DEFAULT 0,
  expected_payments_made DECIMAL(15, 2) DEFAULT 0,
  payroll DECIMAL(15, 2) DEFAULT 0,
  taxes DECIMAL(15, 2) DEFAULT 0,
  other_expenses DECIMAL(15, 2) DEFAULT 0,
  opening_balance DECIMAL(15, 2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(organization_id, scenario_id, period_start)
);

CREATE INDEX idx_cf_forecasts_org ON cash_flow_forecasts(organization_id);
CREATE INDEX idx_cf_forecasts_period ON cash_flow_forecasts(period_start, period_end);

-- Budgets
CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  fiscal_year INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'DRAFT',
  total_budget DECIMAL(15, 2),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Lignes budgétaires
CREATE TABLE IF NOT EXISTS budget_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  budget_id UUID REFERENCES budgets(id) ON DELETE CASCADE,
  account_id UUID REFERENCES chart_of_accounts(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  budgeted_amount DECIMAL(15, 2) NOT NULL,
  actual_amount DECIMAL(15, 2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_budget_lines_budget ON budget_lines(budget_id);
CREATE INDEX idx_budget_lines_account ON budget_lines(account_id);

-- Historique des exports comptables
CREATE TABLE IF NOT EXISTS accounting_exports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  export_type VARCHAR(50) NOT NULL,
  export_format VARCHAR(50),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  file_name VARCHAR(255),
  file_path VARCHAR(500),
  file_size INTEGER,
  entry_count INTEGER,
  exported_by UUID REFERENCES users(id),
  exported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  download_count INTEGER DEFAULT 0,
  last_downloaded_at TIMESTAMP,
  notes TEXT
);

CREATE INDEX idx_exports_org ON accounting_exports(organization_id);
CREATE INDEX idx_exports_date ON accounting_exports(exported_at);

-- Accès expert-comptable
CREATE TABLE IF NOT EXISTS accountant_access (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  accountant_email VARCHAR(255) NOT NULL,
  accountant_name VARCHAR(255),
  accountant_firm VARCHAR(255),
  access_token VARCHAR(255) UNIQUE,
  access_granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  access_expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  permissions JSONB DEFAULT '{"read_entries": true, "read_reports": true, "export": true, "comment": true}',
  last_access_at TIMESTAMP,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Commentaires expert-comptable
CREATE TABLE IF NOT EXISTS accountant_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  accountant_id UUID REFERENCES accountant_access(id),
  reference_type VARCHAR(50),
  reference_id UUID,
  comment TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'PENDING',
  resolved_at TIMESTAMP,
  resolved_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- 3. API PUBLIQUE & WEBHOOKS
-- ========================================

-- Clés API
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  key_name VARCHAR(255) NOT NULL,
  key_prefix VARCHAR(20) NOT NULL,
  key_hash VARCHAR(255) NOT NULL,
  key_last_4 VARCHAR(4) NOT NULL,
  scopes JSONB DEFAULT '["read"]',
  allowed_ips TEXT[],
  rate_limit_per_hour INTEGER DEFAULT 1000,
  rate_limit_per_day INTEGER DEFAULT 10000,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP,
  last_used_at TIMESTAMP,
  usage_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  revoked_at TIMESTAMP,
  revoked_by UUID REFERENCES users(id),
  revoke_reason TEXT,
  UNIQUE(key_hash)
);

CREATE INDEX idx_api_keys_org ON api_keys(organization_id);
CREATE INDEX idx_api_keys_prefix ON api_keys(key_prefix);
CREATE INDEX idx_api_keys_active ON api_keys(is_active) WHERE is_active = true;

-- OAuth applications
CREATE TABLE IF NOT EXISTS oauth_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  app_name VARCHAR(255) NOT NULL,
  app_description TEXT,
  client_id VARCHAR(100) UNIQUE NOT NULL,
  client_secret_hash VARCHAR(255) NOT NULL,
  redirect_uris TEXT[] NOT NULL,
  allowed_scopes TEXT[] DEFAULT ARRAY['read', 'write'],
  grant_types TEXT[] DEFAULT ARRAY['authorization_code', 'refresh_token'],
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- OAuth access tokens
CREATE TABLE IF NOT EXISTS oauth_access_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID REFERENCES oauth_applications(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  access_token_hash VARCHAR(255) UNIQUE NOT NULL,
  refresh_token_hash VARCHAR(255) UNIQUE,
  scopes TEXT[],
  expires_at TIMESTAMP NOT NULL,
  refresh_expires_at TIMESTAMP,
  is_revoked BOOLEAN DEFAULT false,
  revoked_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_oauth_tokens_app ON oauth_access_tokens(application_id);
CREATE INDEX idx_oauth_tokens_user ON oauth_access_tokens(user_id);

-- API request logs
CREATE TABLE IF NOT EXISTS api_requests_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
  method VARCHAR(10) NOT NULL,
  endpoint VARCHAR(500) NOT NULL,
  api_version VARCHAR(10) DEFAULT 'v1',
  status_code INTEGER NOT NULL,
  response_time_ms INTEGER,
  ip_address INET,
  user_agent TEXT,
  request_id VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_api_log_org_date ON api_requests_log(organization_id, created_at DESC);
CREATE INDEX idx_api_log_key ON api_requests_log(api_key_id, created_at DESC);

-- Rate limits
CREATE TABLE IF NOT EXISTS api_rate_limits (
  api_key_id UUID NOT NULL,
  window_start TIMESTAMP NOT NULL,
  window_type VARCHAR(10) NOT NULL,
  request_count INTEGER DEFAULT 0,
  PRIMARY KEY (api_key_id, window_start, window_type)
);

-- Webhooks endpoints
CREATE TABLE IF NOT EXISTS webhook_endpoints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  description TEXT,
  secret VARCHAR(255) NOT NULL,
  events TEXT[] NOT NULL,
  is_active BOOLEAN DEFAULT true,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  last_success_at TIMESTAMP,
  last_failure_at TIMESTAMP,
  last_failure_reason TEXT,
  retry_enabled BOOLEAN DEFAULT true,
  max_retries INTEGER DEFAULT 3,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_webhooks_org ON webhook_endpoints(organization_id);
CREATE INDEX idx_webhooks_active ON webhook_endpoints(is_active) WHERE is_active = true;

-- Webhook deliveries
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  webhook_endpoint_id UUID REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  event_id UUID NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'PENDING',
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  next_retry_at TIMESTAMP,
  http_status_code INTEGER,
  response_body TEXT,
  response_time_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  delivered_at TIMESTAMP,
  failed_at TIMESTAMP
);

CREATE INDEX idx_webhook_deliveries_endpoint ON webhook_deliveries(webhook_endpoint_id);
CREATE INDEX idx_webhook_deliveries_status ON webhook_deliveries(status);
CREATE INDEX idx_webhook_deliveries_retry ON webhook_deliveries(next_retry_at)
  WHERE status = 'RETRYING' AND next_retry_at IS NOT NULL;

-- API changelog
CREATE TABLE IF NOT EXISTS api_changelog (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  version VARCHAR(20) NOT NULL,
  release_date DATE NOT NULL,
  changes JSONB NOT NULL,
  breaking_changes BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- 4. MARKETING AUTOMATION
-- ========================================

-- Landing pages
CREATE TABLE IF NOT EXISTS landing_pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  title VARCHAR(255),
  meta_description TEXT,
  template_id UUID,
  content JSONB NOT NULL,
  custom_css TEXT,
  custom_js TEXT,
  status VARCHAR(20) DEFAULT 'DRAFT',
  published_at TIMESTAMP,
  views_count INTEGER DEFAULT 0,
  submissions_count INTEGER DEFAULT 0,
  canonical_url TEXT,
  og_image TEXT,
  settings JSONB DEFAULT '{}',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(organization_id, slug)
);

CREATE INDEX idx_landing_pages_org ON landing_pages(organization_id);
CREATE INDEX idx_landing_pages_slug ON landing_pages(slug);
CREATE INDEX idx_landing_pages_status ON landing_pages(status);

-- Landing page visits
CREATE TABLE IF NOT EXISTS landing_page_visits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  landing_page_id UUID REFERENCES landing_pages(id) ON DELETE CASCADE,
  visitor_id UUID,
  ip_address INET,
  user_agent TEXT,
  referrer TEXT,
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(100),
  utm_content VARCHAR(100),
  utm_term VARCHAR(100),
  time_on_page INTEGER,
  did_convert BOOLEAN DEFAULT false,
  form_submission_id UUID,
  visited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_lp_visits_page ON landing_page_visits(landing_page_id);
CREATE INDEX idx_lp_visits_visitor ON landing_page_visits(visitor_id);

-- Forms
CREATE TABLE IF NOT EXISTS forms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  fields JSONB NOT NULL,
  settings JSONB DEFAULT '{}',
  webhook_url TEXT,
  integrations JSONB,
  is_active BOOLEAN DEFAULT true,
  submissions_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_forms_org ON forms(organization_id);

-- Form submissions
CREATE TABLE IF NOT EXISTS form_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  form_id UUID REFERENCES forms(id) ON DELETE CASCADE,
  landing_page_id UUID REFERENCES landing_pages(id),
  data JSONB NOT NULL,
  visitor_id UUID,
  contact_id UUID REFERENCES contacts(id),
  ip_address INET,
  user_agent TEXT,
  status VARCHAR(20) DEFAULT 'NEW',
  processed_at TIMESTAMP,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_form_submissions_form ON form_submissions(form_id);
CREATE INDEX idx_form_submissions_contact ON form_submissions(contact_id);

-- A/B tests
CREATE TABLE IF NOT EXISTS ab_tests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  test_type VARCHAR(50) NOT NULL,
  variants JSONB NOT NULL,
  traffic_split JSONB DEFAULT '{"A": 50, "B": 50}',
  status VARCHAR(20) DEFAULT 'DRAFT',
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  goal_metric VARCHAR(50),
  goal_value DECIMAL(15, 2),
  winner VARCHAR(10),
  confidence_level DECIMAL(5, 2),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- A/B test results
CREATE TABLE IF NOT EXISTS ab_test_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ab_test_id UUID REFERENCES ab_tests(id) ON DELETE CASCADE,
  variant VARCHAR(10) NOT NULL,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  revenue DECIMAL(15, 2) DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(ab_test_id, variant)
);

-- Lead scoring rules
CREATE TABLE IF NOT EXISTS lead_scoring_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  rule_type VARCHAR(50) NOT NULL,
  condition JSONB NOT NULL,
  score_change INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Lead scores
CREATE TABLE IF NOT EXISTS lead_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE UNIQUE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  current_score INTEGER DEFAULT 0,
  previous_score INTEGER DEFAULT 0,
  score_grade VARCHAR(5),
  last_scored_at TIMESTAMP,
  last_activity_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_lead_scores_contact ON lead_scores(contact_id);
CREATE INDEX idx_lead_scores_grade ON lead_scores(score_grade);

-- Lead score history
CREATE TABLE IF NOT EXISTS lead_score_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_score_id UUID REFERENCES lead_scores(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES lead_scoring_rules(id),
  score_change INTEGER NOT NULL,
  reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Email sequences (amélioration de la table existante email_campaigns)
ALTER TABLE email_campaigns ADD COLUMN IF NOT EXISTS campaign_type VARCHAR(50) DEFAULT 'ONE_TIME';

CREATE TABLE IF NOT EXISTS email_sequences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  trigger_type VARCHAR(50),
  trigger_config JSONB,
  is_active BOOLEAN DEFAULT true,
  enrolled_count INTEGER DEFAULT 0,
  completed_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Email sequence steps
CREATE TABLE IF NOT EXISTS email_sequence_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sequence_id UUID REFERENCES email_sequences(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  step_type VARCHAR(50) DEFAULT 'EMAIL',
  subject VARCHAR(500),
  body TEXT,
  template_id UUID,
  delay_value INTEGER NOT NULL,
  delay_unit VARCHAR(20) NOT NULL,
  send_conditions JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(sequence_id, step_number)
);

-- Email sequence enrollments
CREATE TABLE IF NOT EXISTS email_sequence_enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sequence_id UUID REFERENCES email_sequences(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  current_step_number INTEGER DEFAULT 1,
  status VARCHAR(20) DEFAULT 'ACTIVE',
  enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  next_step_at TIMESTAMP,
  UNIQUE(sequence_id, contact_id)
);

CREATE INDEX idx_enrollments_sequence ON email_sequence_enrollments(sequence_id);
CREATE INDEX idx_enrollments_contact ON email_sequence_enrollments(contact_id);
CREATE INDEX idx_enrollments_next_step ON email_sequence_enrollments(next_step_at)
  WHERE status = 'ACTIVE';

-- ========================================
-- 5. INTÉGRATIONS E-COMMERCE
-- ========================================

-- Integrations
CREATE TABLE IF NOT EXISTS integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL,
  integration_name VARCHAR(255) NOT NULL,
  auth_type VARCHAR(50),
  credentials JSONB NOT NULL,
  config JSONB DEFAULT '{}',
  sync_settings JSONB DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'ACTIVE',
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMP,
  last_success_at TIMESTAMP,
  last_error_at TIMESTAMP,
  last_error_message TEXT,
  sync_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  connected_by UUID REFERENCES users(id),
  connected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_integrations_org ON integrations(organization_id);
CREATE INDEX idx_integrations_platform ON integrations(platform);

-- Integration sync logs
CREATE TABLE IF NOT EXISTS integration_sync_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  integration_id UUID REFERENCES integrations(id) ON DELETE CASCADE,
  sync_type VARCHAR(50) NOT NULL,
  direction VARCHAR(20) NOT NULL,
  records_processed INTEGER DEFAULT 0,
  records_created INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'RUNNING',
  error_details JSONB,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  duration_ms INTEGER
);

CREATE INDEX idx_sync_logs_integration ON integration_sync_logs(integration_id);
CREATE INDEX idx_sync_logs_status ON integration_sync_logs(status);

-- Integration mappings
CREATE TABLE IF NOT EXISTS integration_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  integration_id UUID REFERENCES integrations(id) ON DELETE CASCADE,
  entity_type VARCHAR(50) NOT NULL,
  internal_id UUID NOT NULL,
  external_id VARCHAR(255) NOT NULL,
  external_data JSONB,
  last_synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  sync_direction VARCHAR(20),
  UNIQUE(integration_id, entity_type, internal_id),
  UNIQUE(integration_id, entity_type, external_id)
);

CREATE INDEX idx_mappings_integration ON integration_mappings(integration_id);
CREATE INDEX idx_mappings_internal ON integration_mappings(entity_type, internal_id);
CREATE INDEX idx_mappings_external ON integration_mappings(external_id);

-- Integration webhook events
CREATE TABLE IF NOT EXISTS integration_webhook_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  integration_id UUID REFERENCES integrations(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'PENDING',
  processed_at TIMESTAMP,
  error_message TEXT,
  ip_address INET,
  signature VARCHAR(255),
  received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_webhook_events_integration ON integration_webhook_events(integration_id);
CREATE INDEX idx_webhook_events_status ON integration_webhook_events(status);

-- Shopify shops
CREATE TABLE IF NOT EXISTS shopify_shops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  integration_id UUID REFERENCES integrations(id) ON DELETE CASCADE UNIQUE,
  shop_domain VARCHAR(255) NOT NULL UNIQUE,
  shop_name VARCHAR(255),
  shop_email VARCHAR(255),
  access_token TEXT NOT NULL,
  scopes TEXT[],
  currency VARCHAR(3),
  timezone VARCHAR(100),
  plan_name VARCHAR(100),
  installed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- WooCommerce stores
CREATE TABLE IF NOT EXISTS woocommerce_stores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  integration_id UUID REFERENCES integrations(id) ON DELETE CASCADE UNIQUE,
  store_url TEXT NOT NULL,
  consumer_key TEXT NOT NULL,
  consumer_secret TEXT NOT NULL,
  wc_version VARCHAR(20),
  wp_version VARCHAR(20),
  connected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- 6. MODULE RH
-- ========================================

-- Employés
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(50),
  employee_number VARCHAR(50) UNIQUE,
  hire_date DATE NOT NULL,
  termination_date DATE,
  status VARCHAR(20) DEFAULT 'ACTIVE',
  job_title VARCHAR(255),
  department VARCHAR(255),
  manager_id UUID REFERENCES employees(id),
  salary DECIMAL(15, 2),
  salary_currency VARCHAR(3) DEFAULT 'EUR',
  address TEXT,
  city VARCHAR(255),
  country VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Types de congés
CREATE TABLE IF NOT EXISTS leave_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(20) NOT NULL,
  is_paid BOOLEAN DEFAULT true,
  annual_allowance INTEGER,
  requires_approval BOOLEAN DEFAULT true,
  UNIQUE(organization_id, code)
);

-- Demandes de congés
CREATE TABLE IF NOT EXISTS leave_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  leave_type_id UUID REFERENCES leave_types(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days_count DECIMAL(5, 2) NOT NULL,
  reason TEXT,
  status VARCHAR(20) DEFAULT 'PENDING',
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_at TIMESTAMP,
  approved_by UUID REFERENCES users(id),
  rejected_at TIMESTAMP,
  rejected_by UUID REFERENCES users(id),
  rejection_reason TEXT
);

-- Soldes de congés
CREATE TABLE IF NOT EXISTS leave_balances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  leave_type_id UUID REFERENCES leave_types(id),
  year INTEGER NOT NULL,
  total_allowance DECIMAL(5, 2),
  used DECIMAL(5, 2) DEFAULT 0,
  pending DECIMAL(5, 2) DEFAULT 0,
  UNIQUE(employee_id, leave_type_id, year)
);

-- Time entries
CREATE TABLE IF NOT EXISTS time_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  duration_hours DECIMAL(5, 2),
  task_id UUID REFERENCES tasks(id),
  project_id UUID,
  description TEXT,
  is_billable BOOLEAN DEFAULT false,
  hourly_rate DECIMAL(10, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- 7. SYSTÈME DE TICKETING
-- ========================================

-- Tickets
CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  ticket_number VARCHAR(50) UNIQUE NOT NULL,
  subject VARCHAR(500) NOT NULL,
  description TEXT NOT NULL,
  customer_id UUID REFERENCES companies(id),
  contact_id UUID REFERENCES contacts(id),
  status VARCHAR(20) DEFAULT 'OPEN',
  priority VARCHAR(20) DEFAULT 'MEDIUM',
  category VARCHAR(100),
  assigned_to UUID REFERENCES users(id),
  assigned_at TIMESTAMP,
  sla_due_at TIMESTAMP,
  first_response_at TIMESTAMP,
  resolved_at TIMESTAMP,
  closed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ticket replies
CREATE TABLE IF NOT EXISTS ticket_replies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- KB articles
CREATE TABLE IF NOT EXISTS kb_articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(100),
  views_count INTEGER DEFAULT 0,
  helpful_count INTEGER DEFAULT 0,
  not_helpful_count INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMP,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SLA policies
CREATE TABLE IF NOT EXISTS sla_policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  priority VARCHAR(20) NOT NULL,
  first_response_hours INTEGER,
  resolution_hours INTEGER,
  is_active BOOLEAN DEFAULT true
);

-- ========================================
-- 8. MULTI-DEVISES
-- ========================================

-- Devises
CREATE TABLE IF NOT EXISTS currencies (
  code VARCHAR(3) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  symbol VARCHAR(10),
  decimal_places INTEGER DEFAULT 2,
  is_active BOOLEAN DEFAULT true
);

-- Taux de change
CREATE TABLE IF NOT EXISTS exchange_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_currency VARCHAR(3) REFERENCES currencies(code),
  to_currency VARCHAR(3) REFERENCES currencies(code),
  rate DECIMAL(20, 10) NOT NULL,
  effective_date DATE NOT NULL,
  source VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(from_currency, to_currency, effective_date)
);

-- Organization currencies
CREATE TABLE IF NOT EXISTS organization_currencies (
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  currency_code VARCHAR(3) REFERENCES currencies(code),
  is_default BOOLEAN DEFAULT false,
  PRIMARY KEY (organization_id, currency_code)
);

-- Ajouter colonnes currency
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'EUR';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(20, 10) DEFAULT 1;
ALTER TABLE products ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'EUR';
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'EUR';
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(20, 10) DEFAULT 1;

-- Legal entities (multi-sociétés)
CREATE TABLE IF NOT EXISTS legal_entities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  entity_name VARCHAR(255) NOT NULL,
  legal_form VARCHAR(100),
  registration_number VARCHAR(100),
  tax_id VARCHAR(100),
  default_currency VARCHAR(3) DEFAULT 'EUR',
  address TEXT,
  city VARCHAR(255),
  country VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- 9. SIGNATURE ÉLECTRONIQUE
-- ========================================

-- Signature requests
CREATE TABLE IF NOT EXISTS signature_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  document_type VARCHAR(50) NOT NULL,
  document_id UUID NOT NULL,
  title VARCHAR(500),
  message TEXT,
  status VARCHAR(20) DEFAULT 'PENDING',
  provider VARCHAR(50) DEFAULT 'DOCUSIGN',
  provider_envelope_id VARCHAR(255),
  expires_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Signature signers
CREATE TABLE IF NOT EXISTS signature_signers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  signature_request_id UUID REFERENCES signature_requests(id) ON DELETE CASCADE,
  signer_email VARCHAR(255) NOT NULL,
  signer_name VARCHAR(255) NOT NULL,
  signing_order INTEGER DEFAULT 1,
  role VARCHAR(50) DEFAULT 'SIGNER',
  status VARCHAR(20) DEFAULT 'PENDING',
  signed_at TIMESTAMP,
  declined_at TIMESTAMP,
  decline_reason TEXT,
  ip_address INET,
  user_agent TEXT
);

-- Signature documents
CREATE TABLE IF NOT EXISTS signature_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  signature_request_id UUID REFERENCES signature_requests(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  signed_file_path TEXT,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- 10. INVENTAIRE AVANCÉ
-- ========================================

-- Entrepôts
CREATE TABLE IF NOT EXISTS warehouses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL,
  address TEXT,
  city VARCHAR(255),
  country VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(organization_id, code)
);

-- Product stock locations
CREATE TABLE IF NOT EXISTS product_stock_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  warehouse_id UUID REFERENCES warehouses(id) ON DELETE CASCADE,
  quantity DECIMAL(15, 3) DEFAULT 0,
  reserved_quantity DECIMAL(15, 3) DEFAULT 0,
  min_threshold DECIMAL(15, 3),
  max_threshold DECIMAL(15, 3),
  reorder_point DECIMAL(15, 3),
  reorder_quantity DECIMAL(15, 3),
  last_count_date DATE,
  UNIQUE(product_id, warehouse_id)
);

-- Purchase orders
CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  po_number VARCHAR(50) UNIQUE NOT NULL,
  supplier_id UUID REFERENCES suppliers(id),
  warehouse_id UUID REFERENCES warehouses(id),
  order_date DATE NOT NULL,
  expected_delivery_date DATE,
  status VARCHAR(20) DEFAULT 'DRAFT',
  subtotal DECIMAL(15, 2),
  tax_amount DECIMAL(15, 2),
  total_amount DECIMAL(15, 2),
  notes TEXT,
  created_by UUID REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Purchase order items
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  quantity DECIMAL(15, 3) NOT NULL,
  received_quantity DECIMAL(15, 3) DEFAULT 0,
  unit_price DECIMAL(15, 2) NOT NULL,
  tax_rate DECIMAL(5, 2) DEFAULT 0
);

-- Delivery notes
CREATE TABLE IF NOT EXISTS delivery_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  dn_number VARCHAR(50) UNIQUE NOT NULL,
  sale_id UUID REFERENCES sales(id),
  customer_id UUID REFERENCES companies(id),
  warehouse_id UUID REFERENCES warehouses(id),
  delivery_date DATE NOT NULL,
  delivery_address TEXT,
  carrier VARCHAR(255),
  tracking_number VARCHAR(255),
  status VARCHAR(20) DEFAULT 'PENDING',
  signed_at TIMESTAMP,
  signature_file TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Delivery note items
CREATE TABLE IF NOT EXISTS delivery_note_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  delivery_note_id UUID REFERENCES delivery_notes(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  quantity DECIMAL(15, 3) NOT NULL,
  serial_numbers TEXT[]
);

-- Stock movements
CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  warehouse_id UUID REFERENCES warehouses(id) ON DELETE CASCADE,
  movement_type VARCHAR(50) NOT NULL,
  quantity DECIMAL(15, 3) NOT NULL,
  reference_type VARCHAR(50),
  reference_id UUID,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX idx_stock_movements_warehouse ON stock_movements(warehouse_id);
CREATE INDEX idx_stock_movements_date ON stock_movements(created_at DESC);

-- ========================================
-- DONNÉES DE BASE
-- ========================================

-- Insérer quelques devises de base
INSERT INTO currencies (code, name, symbol, decimal_places) VALUES
  ('EUR', 'Euro', '€', 2),
  ('USD', 'US Dollar', '$', 2),
  ('GBP', 'British Pound', '£', 2),
  ('CHF', 'Swiss Franc', 'CHF', 2),
  ('CAD', 'Canadian Dollar', 'C$', 2),
  ('JPY', 'Japanese Yen', '¥', 0)
ON CONFLICT (code) DO NOTHING;

-- ========================================
-- FIN DE LA MIGRATION
-- ========================================
