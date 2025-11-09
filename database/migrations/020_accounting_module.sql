-- Migration 020: Module Comptabilité Complet
-- Rapprochement bancaire, Écritures comptables, TVA multi-taux, Export FEC

-- ============================================
-- 1. COMPTES BANCAIRES
-- ============================================
CREATE TABLE IF NOT EXISTS bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Informations bancaires
    account_name VARCHAR(255) NOT NULL,
    bank_name VARCHAR(255) NOT NULL,
    account_number VARCHAR(50),
    iban VARCHAR(34),
    bic VARCHAR(11),
    currency VARCHAR(3) DEFAULT 'EUR',

    -- Soldes
    opening_balance DECIMAL(15,2) DEFAULT 0,
    current_balance DECIMAL(15,2) DEFAULT 0,

    -- État
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,

    -- Métadonnées
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_bank_accounts_org ON bank_accounts(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_bank_accounts_active ON bank_accounts(organization_id, is_active) WHERE deleted_at IS NULL;

-- ============================================
-- 2. TRANSACTIONS BANCAIRES (Rapprochement)
-- ============================================
CREATE TYPE transaction_type AS ENUM ('debit', 'credit', 'transfer');
CREATE TYPE reconciliation_status AS ENUM ('pending', 'matched', 'reviewed', 'confirmed');

CREATE TABLE IF NOT EXISTS bank_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    bank_account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,

    -- Détails transaction
    transaction_date DATE NOT NULL,
    value_date DATE,
    description TEXT NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    transaction_type transaction_type NOT NULL,

    -- Rapprochement automatique
    reconciliation_status reconciliation_status DEFAULT 'pending',
    matched_invoice_id UUID REFERENCES invoices(id),
    matched_expense_id UUID REFERENCES expenses(id),
    matched_payment_id UUID REFERENCES payments(id),
    reconciled_at TIMESTAMP,
    reconciled_by UUID REFERENCES users(id),

    -- Informations bancaires brutes
    bank_reference VARCHAR(255),
    counterparty_name VARCHAR(255),
    counterparty_account VARCHAR(50),

    -- Catégorisation
    category VARCHAR(100),
    tags TEXT[], -- Array de tags pour filtrage

    -- Métadonnées
    notes TEXT,
    imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_bank_transactions_org ON bank_transactions(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_bank_transactions_account ON bank_transactions(bank_account_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_bank_transactions_date ON bank_transactions(transaction_date);
CREATE INDEX idx_bank_transactions_status ON bank_transactions(reconciliation_status);
CREATE INDEX idx_bank_transactions_invoice ON bank_transactions(matched_invoice_id) WHERE matched_invoice_id IS NOT NULL;

-- ============================================
-- 3. TAUX DE TVA (Multi-taux, Multi-pays)
-- ============================================
CREATE TABLE IF NOT EXISTS tax_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Informations TVA
    name VARCHAR(100) NOT NULL, -- Ex: "TVA Standard 20%"
    rate DECIMAL(5,2) NOT NULL, -- Ex: 20.00
    country_code VARCHAR(2) DEFAULT 'FR',

    -- Types de TVA
    is_default BOOLEAN DEFAULT false,
    tax_type VARCHAR(50), -- 'vat', 'sales_tax', 'gst', etc.

    -- Dates validité
    valid_from DATE DEFAULT CURRENT_DATE,
    valid_until DATE,

    -- Comptes comptables associés
    account_number VARCHAR(20), -- Ex: "44571" pour TVA collectée

    -- État
    is_active BOOLEAN DEFAULT true,

    -- Métadonnées
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_tax_rates_org ON tax_rates(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_tax_rates_country ON tax_rates(country_code, is_active) WHERE deleted_at IS NULL;

-- Insertion des taux TVA français par défaut
INSERT INTO tax_rates (organization_id, name, rate, country_code, is_default, tax_type, account_number, description)
SELECT
    id as organization_id,
    'TVA Standard 20%',
    20.00,
    'FR',
    true,
    'vat',
    '44571',
    'Taux normal de TVA en France'
FROM organizations
WHERE NOT EXISTS (
    SELECT 1 FROM tax_rates WHERE name = 'TVA Standard 20%' AND organization_id = organizations.id
);

INSERT INTO tax_rates (organization_id, name, rate, country_code, is_default, tax_type, account_number, description)
SELECT
    id as organization_id,
    'TVA Intermédiaire 10%',
    10.00,
    'FR',
    false,
    'vat',
    '44571',
    'Taux intermédiaire (restauration, travaux, etc.)'
FROM organizations
WHERE NOT EXISTS (
    SELECT 1 FROM tax_rates WHERE name = 'TVA Intermédiaire 10%' AND organization_id = organizations.id
);

INSERT INTO tax_rates (organization_id, name, rate, country_code, is_default, tax_type, account_number, description)
SELECT
    id as organization_id,
    'TVA Réduite 5.5%',
    5.50,
    'FR',
    false,
    'vat',
    '44571',
    'Taux réduit (produits alimentaires, livres, etc.)'
FROM organizations
WHERE NOT EXISTS (
    SELECT 1 FROM tax_rates WHERE name = 'TVA Réduite 5.5%' AND organization_id = organizations.id
);

INSERT INTO tax_rates (organization_id, name, rate, country_code, is_default, tax_type, account_number, description)
SELECT
    id as organization_id,
    'TVA Super Réduite 2.1%',
    2.10,
    'FR',
    false,
    'vat',
    '44571',
    'Taux particulier (médicaments, presse, etc.)'
FROM organizations
WHERE NOT EXISTS (
    SELECT 1 FROM tax_rates WHERE name = 'TVA Super Réduite 2.1%' AND organization_id = organizations.id
);

-- ============================================
-- 4. ÉCRITURES COMPTABLES
-- ============================================
CREATE TYPE entry_type AS ENUM ('sale', 'purchase', 'payment', 'expense', 'adjustment', 'opening', 'closing');
CREATE TYPE journal_type AS ENUM ('sales', 'purchases', 'bank', 'miscellaneous');

CREATE TABLE IF NOT EXISTS accounting_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Référence document source
    source_type VARCHAR(50), -- 'invoice', 'expense', 'payment', 'bank_transaction'
    source_id UUID,

    -- Informations comptables
    entry_date DATE NOT NULL,
    journal_type journal_type NOT NULL,
    entry_type entry_type NOT NULL,
    entry_number VARCHAR(50) UNIQUE, -- Numéro séquentiel par journal

    -- Libellé
    description TEXT NOT NULL,

    -- Comptes (plan comptable français)
    debit_account VARCHAR(20) NOT NULL,
    credit_account VARCHAR(20) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,

    -- TVA
    tax_rate_id UUID REFERENCES tax_rates(id),
    tax_amount DECIMAL(15,2) DEFAULT 0,

    -- Validation
    is_validated BOOLEAN DEFAULT false,
    validated_at TIMESTAMP,
    validated_by UUID REFERENCES users(id),

    -- Période comptable
    fiscal_year INT,
    fiscal_period INT, -- 1-12 pour mois

    -- Métadonnées
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_accounting_entries_org ON accounting_entries(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_accounting_entries_date ON accounting_entries(entry_date);
CREATE INDEX idx_accounting_entries_journal ON accounting_entries(journal_type);
CREATE INDEX idx_accounting_entries_source ON accounting_entries(source_type, source_id);
CREATE INDEX idx_accounting_entries_fiscal ON accounting_entries(fiscal_year, fiscal_period);
CREATE INDEX idx_accounting_entries_validated ON accounting_entries(is_validated);

-- ============================================
-- 5. EXPORTS COMPTABLES (FEC, QuadraCompta, etc.)
-- ============================================
CREATE TYPE export_format AS ENUM ('fec', 'quadracompta', 'sage', 'cegid', 'ebp', 'csv');
CREATE TYPE export_status AS ENUM ('pending', 'processing', 'completed', 'failed');

CREATE TABLE IF NOT EXISTS accounting_exports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Paramètres export
    export_format export_format NOT NULL,
    export_status export_status DEFAULT 'pending',

    -- Période exportée
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    fiscal_year INT,

    -- Filtres
    journal_types journal_type[],
    include_validated_only BOOLEAN DEFAULT true,

    -- Résultats
    file_path TEXT,
    file_size BIGINT,
    entries_count INT DEFAULT 0,

    -- Métadonnées export
    exported_by UUID REFERENCES users(id),
    exported_at TIMESTAMP,
    error_message TEXT,

    -- Métadonnées
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_accounting_exports_org ON accounting_exports(organization_id);
CREATE INDEX idx_accounting_exports_status ON accounting_exports(export_status);
CREATE INDEX idx_accounting_exports_date ON accounting_exports(exported_at);

-- ============================================
-- 6. PRÉVISIONNEL DE TRÉSORERIE
-- ============================================
CREATE TYPE forecast_type AS ENUM ('revenue', 'expense', 'payment_in', 'payment_out');

CREATE TABLE IF NOT EXISTS cash_flow_forecasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Date prévision
    forecast_date DATE NOT NULL,

    -- Type et montant
    forecast_type forecast_type NOT NULL,
    amount DECIMAL(15,2) NOT NULL,

    -- Source prévision
    source_type VARCHAR(50), -- 'invoice', 'quote', 'recurring_invoice', 'manual'
    source_id UUID,

    -- Probabilité réalisation (0-100%)
    probability INT DEFAULT 100,

    -- Catégorie
    category VARCHAR(100),

    -- Description
    description TEXT,

    -- Statut
    is_realized BOOLEAN DEFAULT false,
    realized_at TIMESTAMP,
    realized_amount DECIMAL(15,2),

    -- Métadonnées
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_cash_flow_forecasts_org ON cash_flow_forecasts(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_cash_flow_forecasts_date ON cash_flow_forecasts(forecast_date);
CREATE INDEX idx_cash_flow_forecasts_type ON cash_flow_forecasts(forecast_type);
CREATE INDEX idx_cash_flow_forecasts_source ON cash_flow_forecasts(source_type, source_id);

-- ============================================
-- 7. PLAN COMPTABLE (référence)
-- ============================================
CREATE TABLE IF NOT EXISTS chart_of_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Compte
    account_number VARCHAR(20) NOT NULL,
    account_name VARCHAR(255) NOT NULL,

    -- Classification
    account_class INT, -- 1-8 (Plan comptable français)
    account_type VARCHAR(50), -- 'asset', 'liability', 'equity', 'revenue', 'expense'

    -- Hiérarchie
    parent_account VARCHAR(20),

    -- Comportement
    is_active BOOLEAN DEFAULT true,
    is_system BOOLEAN DEFAULT false, -- Comptes système non modifiables
    allow_transactions BOOLEAN DEFAULT true,

    -- Métadonnées
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,

    UNIQUE(organization_id, account_number)
);

CREATE INDEX idx_chart_accounts_org ON chart_of_accounts(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_chart_accounts_number ON chart_of_accounts(account_number);
CREATE INDEX idx_chart_accounts_class ON chart_of_accounts(account_class);

-- Insertion plan comptable français de base
INSERT INTO chart_of_accounts (organization_id, account_number, account_name, account_class, account_type, is_system, allow_transactions, description)
SELECT
    id as organization_id,
    '411',
    'Clients',
    4,
    'asset',
    true,
    true,
    'Créances clients'
FROM organizations
WHERE NOT EXISTS (
    SELECT 1 FROM chart_of_accounts WHERE account_number = '411' AND organization_id = organizations.id
);

INSERT INTO chart_of_accounts (organization_id, account_number, account_name, account_class, account_type, is_system, allow_transactions, description)
SELECT
    id as organization_id,
    '401',
    'Fournisseurs',
    4,
    'liability',
    true,
    true,
    'Dettes fournisseurs'
FROM organizations
WHERE NOT EXISTS (
    SELECT 1 FROM chart_of_accounts WHERE account_number = '401' AND organization_id = organizations.id
);

INSERT INTO chart_of_accounts (organization_id, account_number, account_name, account_class, account_type, is_system, allow_transactions, description)
SELECT
    id as organization_id,
    '44571',
    'TVA collectée',
    4,
    'liability',
    true,
    true,
    'TVA collectée sur ventes'
FROM organizations
WHERE NOT EXISTS (
    SELECT 1 FROM chart_of_accounts WHERE account_number = '44571' AND organization_id = organizations.id
);

INSERT INTO chart_of_accounts (organization_id, account_number, account_name, account_class, account_type, is_system, allow_transactions, description)
SELECT
    id as organization_id,
    '44566',
    'TVA déductible',
    4,
    'asset',
    true,
    true,
    'TVA déductible sur achats'
FROM organizations
WHERE NOT EXISTS (
    SELECT 1 FROM chart_of_accounts WHERE account_number = '44566' AND organization_id = organizations.id
);

INSERT INTO chart_of_accounts (organization_id, account_number, account_name, account_class, account_type, is_system, allow_transactions, description)
SELECT
    id as organization_id,
    '512',
    'Banque',
    5,
    'asset',
    true,
    true,
    'Comptes bancaires'
FROM organizations
WHERE NOT EXISTS (
    SELECT 1 FROM chart_of_accounts WHERE account_number = '512' AND organization_id = organizations.id
);

INSERT INTO chart_of_accounts (organization_id, account_number, account_name, account_class, account_type, is_system, allow_transactions, description)
SELECT
    id as organization_id,
    '706',
    'Prestations de services',
    7,
    'revenue',
    true,
    true,
    'Chiffre d''affaires prestations'
FROM organizations
WHERE NOT EXISTS (
    SELECT 1 FROM chart_of_accounts WHERE account_number = '706' AND organization_id = organizations.id
);

INSERT INTO chart_of_accounts (organization_id, account_number, account_name, account_class, account_type, is_system, allow_transactions, description)
SELECT
    id as organization_id,
    '707',
    'Ventes de marchandises',
    7,
    'revenue',
    true,
    true,
    'Chiffre d''affaires ventes'
FROM organizations
WHERE NOT EXISTS (
    SELECT 1 FROM chart_of_accounts WHERE account_number = '707' AND organization_id = organizations.id
);

INSERT INTO chart_of_accounts (organization_id, account_number, account_name, account_class, account_type, is_system, allow_transactions, description)
SELECT
    id as organization_id,
    '6061',
    'Fournitures non stockables',
    6,
    'expense',
    true,
    true,
    'Achats fournitures'
FROM organizations
WHERE NOT EXISTS (
    SELECT 1 FROM chart_of_accounts WHERE account_number = '6061' AND organization_id = organizations.id
);

-- ============================================
-- 8. TRIGGERS pour mise à jour automatique
-- ============================================

-- Trigger: Mettre à jour le solde du compte bancaire lors d'une transaction
CREATE OR REPLACE FUNCTION update_bank_account_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE bank_accounts
        SET current_balance = current_balance +
            CASE
                WHEN NEW.transaction_type = 'credit' THEN NEW.amount
                WHEN NEW.transaction_type = 'debit' THEN -NEW.amount
                ELSE 0
            END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.bank_account_id;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Recalculer le solde complet (au cas où transaction modifiée)
        UPDATE bank_accounts
        SET current_balance = opening_balance + COALESCE((
            SELECT SUM(
                CASE
                    WHEN transaction_type = 'credit' THEN amount
                    WHEN transaction_type = 'debit' THEN -amount
                    ELSE 0
                END
            )
            FROM bank_transactions
            WHERE bank_account_id = NEW.bank_account_id
              AND deleted_at IS NULL
        ), 0),
        updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.bank_account_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_bank_balance
AFTER INSERT OR UPDATE ON bank_transactions
FOR EACH ROW
EXECUTE FUNCTION update_bank_account_balance();

-- Trigger: Générer numéro séquentiel pour écritures comptables
CREATE OR REPLACE FUNCTION generate_entry_number()
RETURNS TRIGGER AS $$
DECLARE
    next_number INT;
    journal_code VARCHAR(10);
BEGIN
    -- Déterminer code journal
    journal_code := CASE NEW.journal_type
        WHEN 'sales' THEN 'VE'
        WHEN 'purchases' THEN 'AC'
        WHEN 'bank' THEN 'BQ'
        WHEN 'miscellaneous' THEN 'OD'
        ELSE 'XX'
    END;

    -- Obtenir prochain numéro
    SELECT COALESCE(MAX(CAST(SUBSTRING(entry_number FROM '[0-9]+$') AS INT)), 0) + 1
    INTO next_number
    FROM accounting_entries
    WHERE organization_id = NEW.organization_id
      AND journal_type = NEW.journal_type
      AND entry_number LIKE journal_code || '%';

    -- Générer numéro: VE-2025-00001
    NEW.entry_number := journal_code || '-' ||
                       EXTRACT(YEAR FROM NEW.entry_date) || '-' ||
                       LPAD(next_number::TEXT, 5, '0');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_entry_number
BEFORE INSERT ON accounting_entries
FOR EACH ROW
WHEN (NEW.entry_number IS NULL)
EXECUTE FUNCTION generate_entry_number();

-- ============================================
-- 9. VUES utiles
-- ============================================

-- Vue: Solde par compte bancaire
CREATE OR REPLACE VIEW v_bank_account_balances AS
SELECT
    ba.id,
    ba.organization_id,
    ba.account_name,
    ba.bank_name,
    ba.currency,
    ba.opening_balance,
    ba.current_balance,
    COUNT(bt.id) as transaction_count,
    MAX(bt.transaction_date) as last_transaction_date
FROM bank_accounts ba
LEFT JOIN bank_transactions bt ON bt.bank_account_id = ba.id AND bt.deleted_at IS NULL
WHERE ba.deleted_at IS NULL
GROUP BY ba.id, ba.organization_id, ba.account_name, ba.bank_name, ba.currency, ba.opening_balance, ba.current_balance;

-- Vue: Transactions non rapprochées
CREATE OR REPLACE VIEW v_unreconciled_transactions AS
SELECT
    bt.*,
    ba.account_name,
    ba.bank_name
FROM bank_transactions bt
JOIN bank_accounts ba ON ba.id = bt.bank_account_id
WHERE bt.reconciliation_status = 'pending'
  AND bt.deleted_at IS NULL
  AND ba.deleted_at IS NULL
ORDER BY bt.transaction_date DESC;

-- Vue: Balance comptable
CREATE OR REPLACE VIEW v_trial_balance AS
SELECT
    ae.organization_id,
    ae.debit_account as account_number,
    SUM(ae.amount) as debit_total,
    0 as credit_total
FROM accounting_entries ae
WHERE ae.deleted_at IS NULL
  AND ae.is_validated = true
GROUP BY ae.organization_id, ae.debit_account

UNION ALL

SELECT
    ae.organization_id,
    ae.credit_account as account_number,
    0 as debit_total,
    SUM(ae.amount) as credit_total
FROM accounting_entries ae
WHERE ae.deleted_at IS NULL
  AND ae.is_validated = true
GROUP BY ae.organization_id, ae.credit_account;

-- Vue: Prévisionnel trésorerie (prochains 90 jours)
CREATE OR REPLACE VIEW v_cash_flow_forecast_90d AS
SELECT
    cf.organization_id,
    cf.forecast_date,
    SUM(CASE WHEN cf.forecast_type IN ('revenue', 'payment_in') THEN cf.amount * cf.probability / 100.0 ELSE 0 END) as expected_inflow,
    SUM(CASE WHEN cf.forecast_type IN ('expense', 'payment_out') THEN cf.amount * cf.probability / 100.0 ELSE 0 END) as expected_outflow,
    SUM(
        CASE
            WHEN cf.forecast_type IN ('revenue', 'payment_in') THEN cf.amount * cf.probability / 100.0
            ELSE -cf.amount * cf.probability / 100.0
        END
    ) as net_flow
FROM cash_flow_forecasts cf
WHERE cf.forecast_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '90 days'
  AND cf.is_realized = false
  AND cf.deleted_at IS NULL
GROUP BY cf.organization_id, cf.forecast_date
ORDER BY cf.forecast_date;

-- ============================================
-- Commentaires tables
-- ============================================
COMMENT ON TABLE bank_accounts IS 'Comptes bancaires de l''organisation';
COMMENT ON TABLE bank_transactions IS 'Transactions bancaires importées pour rapprochement automatique';
COMMENT ON TABLE tax_rates IS 'Taux de TVA multi-pays et multi-taux';
COMMENT ON TABLE accounting_entries IS 'Écritures comptables (double entrée)';
COMMENT ON TABLE accounting_exports IS 'Historique des exports comptables (FEC, QuadraCompta, etc.)';
COMMENT ON TABLE cash_flow_forecasts IS 'Prévisionnel de trésorerie';
COMMENT ON TABLE chart_of_accounts IS 'Plan comptable de l''organisation';
