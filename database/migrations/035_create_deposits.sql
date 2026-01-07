-- Migration 035: Gestion des acomptes
-- Description: Système complet de gestion des acomptes sur devis et factures
-- Author: Claude Code
-- Date: 2025-01-07

-- Table des acomptes
CREATE TABLE IF NOT EXISTS deposits (
    id SERIAL PRIMARY KEY,

    -- Références
    quote_id INTEGER REFERENCES quotes(id) ON DELETE SET NULL,
    invoice_id INTEGER REFERENCES invoices(id) ON DELETE SET NULL, -- Facture finale
    deposit_invoice_id INTEGER REFERENCES invoices(id) ON DELETE SET NULL, -- Facture d'acompte
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,

    -- Montant
    amount DECIMAL(12, 2) NOT NULL,
    percentage DECIMAL(5, 2), -- Pourcentage du montant total (si applicable)

    -- Statut: pending, invoiced, paid, refunded, applied
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'invoiced', 'paid', 'refunded', 'applied', 'cancelled')),

    -- Paiement
    payment_id INTEGER REFERENCES payments(id) ON DELETE SET NULL,
    paid_at TIMESTAMP WITH TIME ZONE,
    payment_method VARCHAR(50),

    -- Dates
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    due_date DATE,

    -- Description
    description TEXT,
    notes TEXT,

    -- Multi-tenant
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ajouter des colonnes aux devis pour les acomptes
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS deposit_required BOOLEAN DEFAULT false;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS deposit_percentage DECIMAL(5, 2);
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS deposit_amount DECIMAL(12, 2);
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS deposit_status VARCHAR(20)
    CHECK (deposit_status IS NULL OR deposit_status IN ('none', 'pending', 'partial', 'paid'));

-- Ajouter des colonnes aux factures pour les acomptes
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS is_deposit_invoice BOOLEAN DEFAULT false;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS parent_quote_id INTEGER REFERENCES quotes(id);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS deposit_amount_applied DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS remaining_after_deposits DECIMAL(12, 2);

-- Index
CREATE INDEX IF NOT EXISTS idx_deposits_quote ON deposits(quote_id);
CREATE INDEX IF NOT EXISTS idx_deposits_invoice ON deposits(invoice_id);
CREATE INDEX IF NOT EXISTS idx_deposits_customer ON deposits(customer_id);
CREATE INDEX IF NOT EXISTS idx_deposits_status ON deposits(status);
CREATE INDEX IF NOT EXISTS idx_deposits_org ON deposits(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_deposit ON invoices(is_deposit_invoice) WHERE is_deposit_invoice = true;
CREATE INDEX IF NOT EXISTS idx_invoices_parent_quote ON invoices(parent_quote_id);

-- Trigger pour mettre à jour le statut de l'acompte sur le devis
CREATE OR REPLACE FUNCTION update_quote_deposit_status()
RETURNS TRIGGER AS $$
DECLARE
    v_total_paid DECIMAL(12, 2);
    v_total_required DECIMAL(12, 2);
BEGIN
    IF NEW.quote_id IS NOT NULL THEN
        -- Calculer le total des acomptes payés
        SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
        FROM deposits
        WHERE quote_id = NEW.quote_id AND status = 'paid';

        -- Récupérer le montant d'acompte requis
        SELECT deposit_amount INTO v_total_required
        FROM quotes WHERE id = NEW.quote_id;

        -- Mettre à jour le statut
        UPDATE quotes SET
            deposit_status = CASE
                WHEN v_total_required IS NULL OR v_total_required = 0 THEN 'none'
                WHEN v_total_paid >= v_total_required THEN 'paid'
                WHEN v_total_paid > 0 THEN 'partial'
                ELSE 'pending'
            END
        WHERE id = NEW.quote_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_quote_deposit ON deposits;
CREATE TRIGGER trigger_update_quote_deposit
    AFTER INSERT OR UPDATE ON deposits
    FOR EACH ROW
    EXECUTE FUNCTION update_quote_deposit_status();

-- Fonction pour créer une facture d'acompte
CREATE OR REPLACE FUNCTION create_deposit_invoice(
    p_quote_id INTEGER,
    p_amount DECIMAL(12, 2),
    p_description TEXT DEFAULT NULL,
    p_user_id INTEGER DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
    v_quote RECORD;
    v_invoice_id INTEGER;
    v_invoice_number VARCHAR(50);
    v_deposit_id INTEGER;
BEGIN
    -- Récupérer le devis
    SELECT * INTO v_quote FROM quotes WHERE id = p_quote_id;

    IF v_quote IS NULL THEN
        RAISE EXCEPTION 'Devis non trouvé';
    END IF;

    -- Générer le numéro de facture d'acompte
    SELECT 'FA-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-' ||
           LPAD((COUNT(*) + 1)::TEXT, 5, '0')
    INTO v_invoice_number
    FROM invoices
    WHERE invoice_number LIKE 'FA-%';

    -- Créer la facture d'acompte
    INSERT INTO invoices (
        customer_id, user_id, quote_id, invoice_number, title,
        description, subtotal, tax_rate, tax_amount, total_amount,
        status, is_deposit_invoice, parent_quote_id, organization_id
    ) VALUES (
        v_quote.customer_id,
        COALESCE(p_user_id, v_quote.user_id),
        p_quote_id,
        v_invoice_number,
        'Acompte - ' || v_quote.title,
        COALESCE(p_description, 'Facture d''acompte pour le devis ' || v_quote.quote_number),
        p_amount / (1 + v_quote.tax_rate),
        v_quote.tax_rate,
        p_amount - (p_amount / (1 + v_quote.tax_rate)),
        p_amount,
        'sent',
        true,
        p_quote_id,
        v_quote.organization_id
    ) RETURNING id INTO v_invoice_id;

    -- Créer l'enregistrement d'acompte
    INSERT INTO deposits (
        quote_id, deposit_invoice_id, customer_id, amount,
        percentage, status, description, organization_id, created_by
    ) VALUES (
        p_quote_id,
        v_invoice_id,
        v_quote.customer_id,
        p_amount,
        (p_amount / v_quote.total_amount) * 100,
        'invoiced',
        COALESCE(p_description, 'Acompte de ' || p_amount || '€'),
        v_quote.organization_id,
        p_user_id
    ) RETURNING id INTO v_deposit_id;

    -- Mettre à jour le devis
    UPDATE quotes SET
        deposit_required = true,
        deposit_amount = COALESCE(deposit_amount, 0) + p_amount,
        deposit_status = 'pending'
    WHERE id = p_quote_id;

    RETURN v_invoice_id;
END;
$$ LANGUAGE plpgsql;

-- Vue des acomptes avec détails
CREATE OR REPLACE VIEW deposits_details AS
SELECT
    d.*,
    q.quote_number,
    q.title as quote_title,
    q.total_amount as quote_total,
    di.invoice_number as deposit_invoice_number,
    fi.invoice_number as final_invoice_number,
    c.name as customer_name,
    c.email as customer_email,
    p.payment_date,
    p.payment_method as actual_payment_method
FROM deposits d
LEFT JOIN quotes q ON d.quote_id = q.id
LEFT JOIN invoices di ON d.deposit_invoice_id = di.id
LEFT JOIN invoices fi ON d.invoice_id = fi.id
LEFT JOIN customers c ON d.customer_id = c.id
LEFT JOIN payments p ON d.payment_id = p.id;

-- Commentaires
COMMENT ON TABLE deposits IS 'Gestion des acomptes sur devis et factures';
COMMENT ON COLUMN deposits.deposit_invoice_id IS 'Facture d''acompte générée';
COMMENT ON COLUMN deposits.invoice_id IS 'Facture finale où l''acompte est appliqué';
COMMENT ON COLUMN invoices.is_deposit_invoice IS 'True si c''est une facture d''acompte';
COMMENT ON COLUMN invoices.deposit_amount_applied IS 'Montant des acomptes déduits de cette facture';
