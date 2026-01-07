-- Migration 037: Rapprochement bancaire
-- Description: Import relevés bancaires et matching avec factures/paiements
-- Author: Claude Code
-- Date: 2025-01-07

-- Comptes bancaires de l'entreprise
CREATE TABLE IF NOT EXISTS bank_accounts (
    id SERIAL PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

    name VARCHAR(100) NOT NULL,
    bank_name VARCHAR(100),
    iban VARCHAR(34),
    bic VARCHAR(11),
    account_number VARCHAR(50),

    currency VARCHAR(3) DEFAULT 'EUR',
    initial_balance DECIMAL(15, 2) DEFAULT 0,
    current_balance DECIMAL(15, 2) DEFAULT 0,

    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,

    -- Connexion Open Banking (futur)
    provider VARCHAR(50),
    provider_account_id VARCHAR(100),
    last_sync_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transactions bancaires (importées ou saisies)
CREATE TABLE IF NOT EXISTS bank_transactions (
    id SERIAL PRIMARY KEY,
    bank_account_id INTEGER REFERENCES bank_accounts(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

    -- Données de la transaction
    transaction_date DATE NOT NULL,
    value_date DATE,
    amount DECIMAL(15, 2) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('credit', 'debit')),

    -- Informations
    description TEXT,
    reference VARCHAR(100),
    counterparty_name VARCHAR(255),
    counterparty_iban VARCHAR(34),

    -- Catégorisation
    category VARCHAR(50),

    -- Statut de rapprochement
    status VARCHAR(20) DEFAULT 'pending'
        CHECK (status IN ('pending', 'matched', 'partial', 'ignored', 'manual')),

    -- Liens avec documents
    matched_invoice_id INTEGER REFERENCES invoices(id) ON DELETE SET NULL,
    matched_payment_id INTEGER REFERENCES payments(id) ON DELETE SET NULL,
    matched_expense_id INTEGER REFERENCES expenses(id) ON DELETE SET NULL,

    -- Confiance du matching automatique
    match_confidence DECIMAL(5, 2), -- 0-100%
    matched_at TIMESTAMP WITH TIME ZONE,
    matched_by INTEGER REFERENCES users(id),

    -- Import
    import_id INTEGER,
    import_row INTEGER,
    raw_data JSONB,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Imports de relevés bancaires
CREATE TABLE IF NOT EXISTS bank_imports (
    id SERIAL PRIMARY KEY,
    bank_account_id INTEGER REFERENCES bank_accounts(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

    filename VARCHAR(255),
    format VARCHAR(20) CHECK (format IN ('csv', 'ofx', 'qif', 'camt053', 'mt940')),

    -- Statistiques
    total_transactions INTEGER DEFAULT 0,
    matched_count INTEGER DEFAULT 0,
    pending_count INTEGER DEFAULT 0,

    -- Période couverte
    start_date DATE,
    end_date DATE,

    imported_by INTEGER REFERENCES users(id),
    imported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Règles de rapprochement automatique
CREATE TABLE IF NOT EXISTS bank_matching_rules (
    id SERIAL PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

    name VARCHAR(100) NOT NULL,
    priority INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,

    -- Conditions (JSON pour flexibilité)
    conditions JSONB NOT NULL,
    -- Ex: {"description_contains": "FACTURE", "amount_range": [100, 500]}

    -- Action
    action_type VARCHAR(20) CHECK (action_type IN ('match_invoice', 'match_expense', 'categorize', 'ignore')),
    action_params JSONB,

    -- Stats
    times_applied INTEGER DEFAULT 0,
    last_applied_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_bank_accounts_org ON bank_accounts(organization_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_account ON bank_transactions(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_date ON bank_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_status ON bank_transactions(status);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_org ON bank_transactions(organization_id);
CREATE INDEX IF NOT EXISTS idx_bank_imports_account ON bank_imports(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_bank_matching_rules_org ON bank_matching_rules(organization_id);

-- Vue des transactions non rapprochées
CREATE OR REPLACE VIEW unmatched_bank_transactions AS
SELECT
    bt.*,
    ba.name as account_name,
    ba.bank_name
FROM bank_transactions bt
JOIN bank_accounts ba ON bt.bank_account_id = ba.id
WHERE bt.status = 'pending'
ORDER BY bt.transaction_date DESC;

-- Vue des suggestions de rapprochement
CREATE OR REPLACE VIEW bank_matching_suggestions AS
SELECT
    bt.id as transaction_id,
    bt.transaction_date,
    bt.amount,
    bt.description,
    bt.counterparty_name,
    'invoice' as match_type,
    i.id as document_id,
    i.invoice_number as document_number,
    i.total_amount as document_amount,
    c.name as customer_name,
    -- Score de confiance basé sur montant et date
    CASE
        WHEN bt.amount = i.total_amount THEN 90
        WHEN ABS(bt.amount - i.total_amount) < 1 THEN 80
        WHEN ABS(bt.amount - i.total_amount) < i.total_amount * 0.05 THEN 60
        ELSE 30
    END as confidence_score
FROM bank_transactions bt
JOIN invoices i ON (
    bt.type = 'credit'
    AND bt.amount > 0
    AND i.status IN ('sent', 'partial', 'overdue')
    AND ABS(bt.amount - i.total_amount) < i.total_amount * 0.1
    AND bt.transaction_date >= i.invoice_date
)
LEFT JOIN customers c ON i.customer_id = c.id
WHERE bt.status = 'pending'

UNION ALL

SELECT
    bt.id as transaction_id,
    bt.transaction_date,
    bt.amount,
    bt.description,
    bt.counterparty_name,
    'expense' as match_type,
    e.id as document_id,
    e.reference as document_number,
    e.amount as document_amount,
    s.name as customer_name,
    CASE
        WHEN ABS(bt.amount) = e.amount THEN 90
        WHEN ABS(ABS(bt.amount) - e.amount) < 1 THEN 80
        ELSE 40
    END as confidence_score
FROM bank_transactions bt
JOIN expenses e ON (
    bt.type = 'debit'
    AND bt.amount < 0
    AND e.status != 'paid'
    AND ABS(ABS(bt.amount) - e.amount) < e.amount * 0.1
)
LEFT JOIN suppliers s ON e.supplier_id = s.id
WHERE bt.status = 'pending'
ORDER BY confidence_score DESC;

-- Fonction pour mettre à jour le solde du compte
CREATE OR REPLACE FUNCTION update_bank_account_balance()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE bank_accounts
    SET current_balance = initial_balance + COALESCE(
        (SELECT SUM(CASE WHEN type = 'credit' THEN amount ELSE -ABS(amount) END)
         FROM bank_transactions
         WHERE bank_account_id = COALESCE(NEW.bank_account_id, OLD.bank_account_id)),
        0
    )
    WHERE id = COALESCE(NEW.bank_account_id, OLD.bank_account_id);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_bank_balance ON bank_transactions;
CREATE TRIGGER trigger_update_bank_balance
    AFTER INSERT OR UPDATE OR DELETE ON bank_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_bank_account_balance();

-- Commentaires
COMMENT ON TABLE bank_accounts IS 'Comptes bancaires de l''entreprise';
COMMENT ON TABLE bank_transactions IS 'Transactions bancaires importées ou saisies';
COMMENT ON TABLE bank_imports IS 'Historique des imports de relevés';
COMMENT ON TABLE bank_matching_rules IS 'Règles de rapprochement automatique';
COMMENT ON VIEW bank_matching_suggestions IS 'Suggestions de rapprochement basées sur montants similaires';
