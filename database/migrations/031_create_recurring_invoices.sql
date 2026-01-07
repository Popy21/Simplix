-- Migration 031: Factures récurrentes (abonnements)
-- Description: Système de facturation récurrente pour les abonnements
-- Author: Claude Code
-- Date: 2025-01-07

-- Table des modèles de facturation récurrente
CREATE TABLE IF NOT EXISTS recurring_invoices (
    id SERIAL PRIMARY KEY,

    -- Client
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,

    -- Configuration
    title VARCHAR(255) NOT NULL,
    description TEXT,

    -- Fréquence: daily, weekly, monthly, quarterly, yearly
    frequency VARCHAR(20) NOT NULL DEFAULT 'monthly'
        CHECK (frequency IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),

    -- Intervalle (ex: tous les 2 mois = frequency=monthly, interval_count=2)
    interval_count INTEGER NOT NULL DEFAULT 1,

    -- Dates
    start_date DATE NOT NULL,
    end_date DATE, -- NULL = pas de fin
    next_invoice_date DATE NOT NULL,
    last_invoice_date DATE,

    -- Montants
    subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
    tax_rate DECIMAL(5, 2) NOT NULL DEFAULT 20.00,
    tax_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,

    -- Statut: active, paused, cancelled, completed
    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'paused', 'cancelled', 'completed')),

    -- Options
    auto_send_email BOOLEAN DEFAULT true,
    days_before_due INTEGER DEFAULT 30, -- Délai de paiement

    -- Template
    template_id INTEGER REFERENCES invoice_templates(id) ON DELETE SET NULL,

    -- Compteurs
    invoices_generated INTEGER DEFAULT 0,
    max_invoices INTEGER, -- NULL = illimité

    -- Multi-tenant
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Items des factures récurrentes
CREATE TABLE IF NOT EXISTS recurring_invoice_items (
    id SERIAL PRIMARY KEY,
    recurring_invoice_id INTEGER REFERENCES recurring_invoices(id) ON DELETE CASCADE,

    product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
    description VARCHAR(500) NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL DEFAULT 1,
    unit_price DECIMAL(12, 2) NOT NULL,
    total_price DECIMAL(12, 2) NOT NULL,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Historique des factures générées
CREATE TABLE IF NOT EXISTS recurring_invoice_history (
    id SERIAL PRIMARY KEY,
    recurring_invoice_id INTEGER REFERENCES recurring_invoices(id) ON DELETE CASCADE,
    invoice_id INTEGER REFERENCES invoices(id) ON DELETE SET NULL,

    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'success' CHECK (status IN ('success', 'failed', 'skipped')),
    error_message TEXT,

    -- Période facturée
    period_start DATE,
    period_end DATE
);

-- Index
CREATE INDEX IF NOT EXISTS idx_recurring_invoices_customer ON recurring_invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_recurring_invoices_status ON recurring_invoices(status);
CREATE INDEX IF NOT EXISTS idx_recurring_invoices_next_date ON recurring_invoices(next_invoice_date);
CREATE INDEX IF NOT EXISTS idx_recurring_invoices_org ON recurring_invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_recurring_items_recurring ON recurring_invoice_items(recurring_invoice_id);
CREATE INDEX IF NOT EXISTS idx_recurring_history_recurring ON recurring_invoice_history(recurring_invoice_id);

-- Fonction pour calculer la prochaine date de facturation
CREATE OR REPLACE FUNCTION calculate_next_invoice_date(
    current_date DATE,
    freq VARCHAR(20),
    interval_cnt INTEGER
) RETURNS DATE AS $$
BEGIN
    RETURN CASE freq
        WHEN 'daily' THEN current_date + (interval_cnt || ' days')::INTERVAL
        WHEN 'weekly' THEN current_date + (interval_cnt || ' weeks')::INTERVAL
        WHEN 'monthly' THEN current_date + (interval_cnt || ' months')::INTERVAL
        WHEN 'quarterly' THEN current_date + (interval_cnt * 3 || ' months')::INTERVAL
        WHEN 'yearly' THEN current_date + (interval_cnt || ' years')::INTERVAL
        ELSE current_date + '1 month'::INTERVAL
    END;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_recurring_invoice_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_recurring_invoice_timestamp ON recurring_invoices;
CREATE TRIGGER trigger_recurring_invoice_timestamp
    BEFORE UPDATE ON recurring_invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_recurring_invoice_timestamp();

-- Commentaires
COMMENT ON TABLE recurring_invoices IS 'Modèles de factures récurrentes pour abonnements';
COMMENT ON COLUMN recurring_invoices.frequency IS 'Fréquence: daily, weekly, monthly, quarterly, yearly';
COMMENT ON COLUMN recurring_invoices.interval_count IS 'Intervalle (ex: 2 = tous les 2 mois si frequency=monthly)';
COMMENT ON COLUMN recurring_invoices.max_invoices IS 'Nombre max de factures à générer (NULL = illimité)';
