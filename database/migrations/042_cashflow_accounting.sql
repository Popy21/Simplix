-- Migration 042: Prévision trésorerie et compte de résultat
-- Description: Outils de pilotage financier
-- Author: Claude Code
-- Date: 2025-01-07

-- ==========================================
-- PRÉVISION DE TRÉSORERIE
-- ==========================================

-- Table des prévisions de trésorerie
CREATE TABLE IF NOT EXISTS cashflow_forecasts (
    id SERIAL PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

    name VARCHAR(100) NOT NULL,
    description TEXT,

    -- Période
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,

    -- Solde initial
    opening_balance DECIMAL(15, 2) DEFAULT 0,

    -- Statut
    status VARCHAR(20) DEFAULT 'draft'
        CHECK (status IN ('draft', 'active', 'archived')),

    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Lignes de prévision
CREATE TABLE IF NOT EXISTS cashflow_items (
    id SERIAL PRIMARY KEY,
    forecast_id INTEGER REFERENCES cashflow_forecasts(id) ON DELETE CASCADE,

    -- Type: encaissement ou décaissement
    type VARCHAR(20) NOT NULL CHECK (type IN ('inflow', 'outflow')),

    -- Catégorie
    category VARCHAR(50) NOT NULL,
    -- Encaissements: invoices, deposits, other_income
    -- Décaissements: suppliers, salaries, taxes, rent, other_expenses

    -- Date prévue
    expected_date DATE NOT NULL,

    -- Montant
    amount DECIMAL(15, 2) NOT NULL,

    -- Description
    description TEXT,

    -- Référence (facture, fournisseur, etc.)
    reference_type VARCHAR(20),
    reference_id INTEGER,

    -- Récurrence
    is_recurring BOOLEAN DEFAULT false,
    recurrence_pattern VARCHAR(20), -- weekly, monthly, quarterly, yearly

    -- Réalisation
    is_realized BOOLEAN DEFAULT false,
    realized_amount DECIMAL(15, 2),
    realized_date DATE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cashflow_forecasts_org ON cashflow_forecasts(organization_id);
CREATE INDEX IF NOT EXISTS idx_cashflow_items_forecast ON cashflow_items(forecast_id);
CREATE INDEX IF NOT EXISTS idx_cashflow_items_date ON cashflow_items(expected_date);

-- ==========================================
-- COMPTE DE RÉSULTAT
-- ==========================================

-- Plan comptable simplifié
CREATE TABLE IF NOT EXISTS accounting_categories (
    id SERIAL PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

    code VARCHAR(10) NOT NULL,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('revenue', 'expense', 'asset', 'liability')),

    -- Catégorie parente
    parent_id INTEGER REFERENCES accounting_categories(id),

    -- Pour le compte de résultat
    income_statement_section VARCHAR(30)
        CHECK (income_statement_section IN (
            'sales', 'other_revenue', 'cost_of_goods', 'operating_expenses',
            'depreciation', 'financial_income', 'financial_expense',
            'exceptional_income', 'exceptional_expense', 'taxes'
        )),

    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,

    UNIQUE(organization_id, code)
);

-- Écritures comptables simplifiées
CREATE TABLE IF NOT EXISTS accounting_entries (
    id SERIAL PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

    entry_date DATE NOT NULL,
    accounting_period VARCHAR(7), -- Format: YYYY-MM

    -- Catégorie
    category_id INTEGER REFERENCES accounting_categories(id),

    -- Montant
    amount DECIMAL(15, 2) NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('debit', 'credit')),

    -- Description
    description TEXT,

    -- Référence au document source
    source_type VARCHAR(20), -- invoice, expense, payment
    source_id INTEGER,

    -- Journal
    journal_code VARCHAR(10), -- VE (ventes), AC (achats), BQ (banque), OD (opérations diverses)

    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_accounting_entries_org ON accounting_entries(organization_id);
CREATE INDEX IF NOT EXISTS idx_accounting_entries_date ON accounting_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_accounting_entries_period ON accounting_entries(accounting_period);
CREATE INDEX IF NOT EXISTS idx_accounting_entries_category ON accounting_entries(category_id);

-- Insérer le plan comptable simplifié par défaut
INSERT INTO accounting_categories (organization_id, code, name, type, income_statement_section, sort_order)
SELECT
    o.id,
    cat.code,
    cat.name,
    cat.type,
    cat.section,
    cat.sort_order
FROM organizations o
CROSS JOIN (VALUES
    ('701', 'Ventes de produits finis', 'revenue', 'sales', 10),
    ('706', 'Prestations de services', 'revenue', 'sales', 20),
    ('708', 'Autres produits d''activité', 'revenue', 'other_revenue', 30),
    ('607', 'Achats de marchandises', 'expense', 'cost_of_goods', 100),
    ('601', 'Achats de matières premières', 'expense', 'cost_of_goods', 110),
    ('611', 'Sous-traitance', 'expense', 'operating_expenses', 200),
    ('613', 'Locations', 'expense', 'operating_expenses', 210),
    ('615', 'Entretien et réparations', 'expense', 'operating_expenses', 220),
    ('616', 'Assurances', 'expense', 'operating_expenses', 230),
    ('622', 'Honoraires', 'expense', 'operating_expenses', 240),
    ('623', 'Publicité', 'expense', 'operating_expenses', 250),
    ('625', 'Déplacements et missions', 'expense', 'operating_expenses', 260),
    ('626', 'Frais postaux et télécom', 'expense', 'operating_expenses', 270),
    ('641', 'Rémunérations du personnel', 'expense', 'operating_expenses', 300),
    ('645', 'Charges sociales', 'expense', 'operating_expenses', 310),
    ('681', 'Dotations aux amortissements', 'expense', 'depreciation', 400),
    ('761', 'Produits de participations', 'revenue', 'financial_income', 500),
    ('766', 'Gains de change', 'revenue', 'financial_income', 510),
    ('661', 'Charges d''intérêts', 'expense', 'financial_expense', 520),
    ('666', 'Pertes de change', 'expense', 'financial_expense', 530),
    ('771', 'Produits exceptionnels', 'revenue', 'exceptional_income', 600),
    ('671', 'Charges exceptionnelles', 'expense', 'exceptional_expense', 610),
    ('695', 'Impôts sur les bénéfices', 'expense', 'taxes', 700)
) AS cat(code, name, type, section, sort_order)
ON CONFLICT DO NOTHING;

-- ==========================================
-- VUES POUR LE COMPTE DE RÉSULTAT
-- ==========================================

-- Vue du compte de résultat
CREATE OR REPLACE VIEW income_statement AS
WITH period_entries AS (
    SELECT
        ae.organization_id,
        ae.accounting_period,
        ac.income_statement_section,
        SUM(CASE WHEN ae.type = 'credit' THEN ae.amount ELSE -ae.amount END) as net_amount
    FROM accounting_entries ae
    JOIN accounting_categories ac ON ae.category_id = ac.id
    WHERE ac.income_statement_section IS NOT NULL
    GROUP BY ae.organization_id, ae.accounting_period, ac.income_statement_section
)
SELECT
    organization_id,
    accounting_period,
    -- Chiffre d'affaires
    COALESCE(SUM(net_amount) FILTER (WHERE income_statement_section = 'sales'), 0) as sales,
    COALESCE(SUM(net_amount) FILTER (WHERE income_statement_section = 'other_revenue'), 0) as other_revenue,
    -- Total produits d'exploitation
    COALESCE(SUM(net_amount) FILTER (WHERE income_statement_section IN ('sales', 'other_revenue')), 0) as total_operating_revenue,

    -- Charges d'exploitation
    COALESCE(SUM(net_amount) FILTER (WHERE income_statement_section = 'cost_of_goods'), 0) as cost_of_goods,
    COALESCE(SUM(net_amount) FILTER (WHERE income_statement_section = 'operating_expenses'), 0) as operating_expenses,
    COALESCE(SUM(net_amount) FILTER (WHERE income_statement_section = 'depreciation'), 0) as depreciation,

    -- Résultat d'exploitation
    COALESCE(SUM(net_amount) FILTER (WHERE income_statement_section IN ('sales', 'other_revenue')), 0) -
    COALESCE(SUM(net_amount) FILTER (WHERE income_statement_section IN ('cost_of_goods', 'operating_expenses', 'depreciation')), 0) as operating_income,

    -- Résultat financier
    COALESCE(SUM(net_amount) FILTER (WHERE income_statement_section = 'financial_income'), 0) as financial_income,
    COALESCE(SUM(net_amount) FILTER (WHERE income_statement_section = 'financial_expense'), 0) as financial_expense,
    COALESCE(SUM(net_amount) FILTER (WHERE income_statement_section = 'financial_income'), 0) -
    COALESCE(SUM(net_amount) FILTER (WHERE income_statement_section = 'financial_expense'), 0) as financial_result,

    -- Résultat exceptionnel
    COALESCE(SUM(net_amount) FILTER (WHERE income_statement_section = 'exceptional_income'), 0) as exceptional_income,
    COALESCE(SUM(net_amount) FILTER (WHERE income_statement_section = 'exceptional_expense'), 0) as exceptional_expense,
    COALESCE(SUM(net_amount) FILTER (WHERE income_statement_section = 'exceptional_income'), 0) -
    COALESCE(SUM(net_amount) FILTER (WHERE income_statement_section = 'exceptional_expense'), 0) as exceptional_result,

    -- Impôts
    COALESCE(SUM(net_amount) FILTER (WHERE income_statement_section = 'taxes'), 0) as taxes,

    -- Résultat net
    COALESCE(SUM(net_amount), 0) as net_income
FROM period_entries
GROUP BY organization_id, accounting_period;

-- Vue de la prévision de trésorerie
CREATE OR REPLACE VIEW cashflow_summary AS
SELECT
    cf.id as forecast_id,
    cf.name as forecast_name,
    cf.organization_id,
    cf.start_date,
    cf.end_date,
    cf.opening_balance,

    -- Encaissements prévus
    COALESCE(SUM(ci.amount) FILTER (WHERE ci.type = 'inflow' AND NOT ci.is_realized), 0) as expected_inflows,
    -- Décaissements prévus
    COALESCE(SUM(ci.amount) FILTER (WHERE ci.type = 'outflow' AND NOT ci.is_realized), 0) as expected_outflows,

    -- Réalisés
    COALESCE(SUM(ci.realized_amount) FILTER (WHERE ci.type = 'inflow' AND ci.is_realized), 0) as realized_inflows,
    COALESCE(SUM(ci.realized_amount) FILTER (WHERE ci.type = 'outflow' AND ci.is_realized), 0) as realized_outflows,

    -- Solde prévu
    cf.opening_balance +
    COALESCE(SUM(ci.amount) FILTER (WHERE ci.type = 'inflow'), 0) -
    COALESCE(SUM(ci.amount) FILTER (WHERE ci.type = 'outflow'), 0) as expected_closing_balance

FROM cashflow_forecasts cf
LEFT JOIN cashflow_items ci ON cf.id = ci.forecast_id
GROUP BY cf.id, cf.name, cf.organization_id, cf.start_date, cf.end_date, cf.opening_balance;

-- ==========================================
-- MULTI-DEVISES
-- ==========================================

-- Table des devises
CREATE TABLE IF NOT EXISTS currencies (
    code VARCHAR(3) PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    symbol VARCHAR(5) NOT NULL,
    decimal_places INTEGER DEFAULT 2
);

-- Taux de change
CREATE TABLE IF NOT EXISTS exchange_rates (
    id SERIAL PRIMARY KEY,
    base_currency VARCHAR(3) REFERENCES currencies(code),
    target_currency VARCHAR(3) REFERENCES currencies(code),
    rate DECIMAL(15, 6) NOT NULL,
    rate_date DATE NOT NULL,

    source VARCHAR(50) DEFAULT 'manual', -- manual, api, ecb

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(base_currency, target_currency, rate_date)
);

-- Insérer les devises principales
INSERT INTO currencies (code, name, symbol, decimal_places) VALUES
    ('EUR', 'Euro', '€', 2),
    ('USD', 'Dollar américain', '$', 2),
    ('GBP', 'Livre sterling', '£', 2),
    ('CHF', 'Franc suisse', 'CHF', 2),
    ('CAD', 'Dollar canadien', 'CA$', 2),
    ('JPY', 'Yen japonais', '¥', 0),
    ('CNY', 'Yuan chinois', '¥', 2),
    ('MAD', 'Dirham marocain', 'DH', 2),
    ('TND', 'Dinar tunisien', 'DT', 3),
    ('XOF', 'Franc CFA', 'CFA', 0)
ON CONFLICT DO NOTHING;

-- Ajouter le support multi-devises aux tables existantes
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'EUR';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(15, 6) DEFAULT 1;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS total_amount_eur DECIMAL(15, 2);

ALTER TABLE quotes ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'EUR';
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(15, 6) DEFAULT 1;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS total_amount_eur DECIMAL(15, 2);

ALTER TABLE expenses ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'EUR';
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(15, 6) DEFAULT 1;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS amount_eur DECIMAL(15, 2);

-- Fonction pour convertir un montant
CREATE OR REPLACE FUNCTION convert_currency(
    p_amount DECIMAL,
    p_from_currency VARCHAR,
    p_to_currency VARCHAR,
    p_date DATE DEFAULT CURRENT_DATE
) RETURNS DECIMAL AS $$
DECLARE
    v_rate DECIMAL;
BEGIN
    IF p_from_currency = p_to_currency THEN
        RETURN p_amount;
    END IF;

    -- Chercher le taux direct
    SELECT rate INTO v_rate FROM exchange_rates
    WHERE base_currency = p_from_currency
      AND target_currency = p_to_currency
      AND rate_date <= p_date
    ORDER BY rate_date DESC LIMIT 1;

    IF v_rate IS NOT NULL THEN
        RETURN p_amount * v_rate;
    END IF;

    -- Chercher le taux inverse
    SELECT 1 / rate INTO v_rate FROM exchange_rates
    WHERE base_currency = p_to_currency
      AND target_currency = p_from_currency
      AND rate_date <= p_date
    ORDER BY rate_date DESC LIMIT 1;

    IF v_rate IS NOT NULL THEN
        RETURN p_amount * v_rate;
    END IF;

    -- Pas de taux trouvé
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Commentaires
COMMENT ON TABLE cashflow_forecasts IS 'Prévisions de trésorerie';
COMMENT ON TABLE cashflow_items IS 'Lignes de prévision (encaissements/décaissements)';
COMMENT ON TABLE accounting_categories IS 'Plan comptable simplifié';
COMMENT ON TABLE accounting_entries IS 'Écritures comptables';
COMMENT ON VIEW income_statement IS 'Compte de résultat par période';
COMMENT ON TABLE currencies IS 'Liste des devises supportées';
COMMENT ON TABLE exchange_rates IS 'Historique des taux de change';
