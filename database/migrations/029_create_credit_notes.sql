-- Migration 029: Création des Avoirs (Credit Notes)
-- Description: Table des avoirs pour remboursements et corrections de factures
-- Author: Claude Code
-- Date: 2025-01-06

-- ============================================================================
-- TABLE: credit_notes (Avoirs)
-- ============================================================================

CREATE TABLE IF NOT EXISTS credit_notes (
    id SERIAL PRIMARY KEY,

    -- Numérotation séquentielle obligatoire
    credit_note_number VARCHAR(50) UNIQUE NOT NULL,

    -- Liens
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    invoice_id INTEGER REFERENCES invoices(id) ON DELETE SET NULL, -- Facture d'origine (optionnel)
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    template_id INTEGER REFERENCES invoice_templates(id) ON DELETE SET NULL,

    -- Dates
    credit_note_date DATE NOT NULL DEFAULT CURRENT_DATE,

    -- Motif de l'avoir
    reason VARCHAR(100) NOT NULL CHECK (reason IN (
        'refund',           -- Remboursement
        'discount',         -- Remise accordée
        'error',            -- Erreur de facturation
        'return',           -- Retour de marchandise
        'cancellation',     -- Annulation
        'price_adjustment', -- Ajustement de prix
        'duplicate',        -- Doublon de facture
        'other'             -- Autre
    )),
    reason_details TEXT,    -- Description détaillée du motif

    -- Montants (négatifs par convention comptable, mais stockés en positif)
    subtotal DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    tax_rate DECIMAL(5, 2) DEFAULT 20.00,
    tax_amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,

    -- Statut
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN (
        'draft',      -- Brouillon
        'issued',     -- Émis
        'applied',    -- Appliqué (déduit d'une facture ou remboursé)
        'cancelled'   -- Annulé
    )),

    -- Remboursement
    refund_method VARCHAR(50) CHECK (refund_method IN (
        'bank_transfer',  -- Virement
        'credit',         -- Avoir client (crédit)
        'check',          -- Chèque
        'card',           -- Carte bancaire
        'cash',           -- Espèces
        'deduction'       -- Déduction sur prochaine facture
    )),
    refund_date DATE,
    refund_reference VARCHAR(100),

    -- Notes
    notes TEXT,
    internal_notes TEXT,  -- Notes internes (non visibles sur le PDF)

    -- Métadonnées
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    -- Contraintes
    CONSTRAINT check_credit_note_amounts CHECK (subtotal >= 0 AND tax_amount >= 0 AND total_amount >= 0)
);

-- ============================================================================
-- TABLE: credit_note_items (Lignes d'avoir)
-- ============================================================================

CREATE TABLE IF NOT EXISTS credit_note_items (
    id SERIAL PRIMARY KEY,
    credit_note_id INTEGER NOT NULL REFERENCES credit_notes(id) ON DELETE CASCADE,

    -- Lien optionnel vers la ligne de facture d'origine
    invoice_item_id INTEGER REFERENCES invoice_items(id) ON DELETE SET NULL,
    product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,

    -- Description
    description TEXT NOT NULL,

    -- Quantités et prix
    quantity DECIMAL(10, 2) NOT NULL DEFAULT 1.00,
    unit_price DECIMAL(12, 2) NOT NULL,

    -- TVA
    tax_rate DECIMAL(5, 2) NOT NULL DEFAULT 20.00,
    tax_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,

    -- Totaux
    total_price DECIMAL(12, 2) NOT NULL, -- HT
    total_with_tax DECIMAL(12, 2) NOT NULL, -- TTC

    -- Ordre d'affichage
    line_order INTEGER NOT NULL DEFAULT 0,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Contraintes
    CONSTRAINT check_credit_item_quantity CHECK (quantity > 0),
    CONSTRAINT check_credit_item_price CHECK (unit_price >= 0),
    CONSTRAINT check_credit_item_tax CHECK (tax_rate >= 0 AND tax_rate <= 100)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_credit_notes_org ON credit_notes(organization_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_customer ON credit_notes(customer_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_invoice ON credit_notes(invoice_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_status ON credit_notes(status);
CREATE INDEX IF NOT EXISTS idx_credit_notes_date ON credit_notes(credit_note_date);
CREATE INDEX IF NOT EXISTS idx_credit_notes_number ON credit_notes(credit_note_number);
CREATE INDEX IF NOT EXISTS idx_credit_notes_deleted ON credit_notes(deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_credit_note_items_credit_note ON credit_note_items(credit_note_id);
CREATE INDEX IF NOT EXISTS idx_credit_note_items_product ON credit_note_items(product_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_credit_note_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_credit_note_updated_at ON credit_notes;
CREATE TRIGGER trigger_update_credit_note_updated_at
    BEFORE UPDATE ON credit_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_credit_note_updated_at();

-- Fonction pour calculer les totaux de l'avoir
CREATE OR REPLACE FUNCTION calculate_credit_note_totals(p_credit_note_id INTEGER)
RETURNS void AS $$
DECLARE
    v_subtotal DECIMAL(15, 2);
    v_tax_amount DECIMAL(15, 2);
    v_total DECIMAL(15, 2);
BEGIN
    SELECT
        COALESCE(SUM(total_price), 0),
        COALESCE(SUM(tax_amount), 0),
        COALESCE(SUM(total_with_tax), 0)
    INTO v_subtotal, v_tax_amount, v_total
    FROM credit_note_items
    WHERE credit_note_id = p_credit_note_id;

    UPDATE credit_notes
    SET
        subtotal = v_subtotal,
        tax_amount = v_tax_amount,
        total_amount = v_total
    WHERE id = p_credit_note_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour recalculer les totaux après modification des lignes
CREATE OR REPLACE FUNCTION trigger_recalculate_credit_note()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM calculate_credit_note_totals(OLD.credit_note_id);
        RETURN OLD;
    ELSE
        -- Calculer les montants de la ligne
        NEW.total_price = NEW.quantity * NEW.unit_price;
        NEW.tax_amount = NEW.total_price * (NEW.tax_rate / 100);
        NEW.total_with_tax = NEW.total_price + NEW.tax_amount;

        -- Après l'insertion/update, recalculer les totaux
        PERFORM calculate_credit_note_totals(NEW.credit_note_id);
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_credit_note_item_changes ON credit_note_items;
CREATE TRIGGER trigger_credit_note_item_changes
    AFTER INSERT OR UPDATE OR DELETE ON credit_note_items
    FOR EACH ROW
    EXECUTE FUNCTION trigger_recalculate_credit_note();

-- Trigger pour calculer les montants avant insertion
CREATE OR REPLACE FUNCTION calculate_credit_note_item_amounts()
RETURNS TRIGGER AS $$
BEGIN
    NEW.total_price = NEW.quantity * NEW.unit_price;
    NEW.tax_amount = NEW.total_price * (NEW.tax_rate / 100);
    NEW.total_with_tax = NEW.total_price + NEW.tax_amount;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calculate_credit_note_item ON credit_note_items;
CREATE TRIGGER trigger_calculate_credit_note_item
    BEFORE INSERT OR UPDATE ON credit_note_items
    FOR EACH ROW
    EXECUTE FUNCTION calculate_credit_note_item_amounts();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE credit_notes IS 'Avoirs (notes de crédit) pour remboursements et corrections';
COMMENT ON COLUMN credit_notes.credit_note_number IS 'Numéro unique de l''avoir (ex: AV-2024-0001)';
COMMENT ON COLUMN credit_notes.reason IS 'Motif de l''avoir';
COMMENT ON COLUMN credit_notes.status IS 'Statut: draft, issued, applied, cancelled';
COMMENT ON COLUMN credit_notes.refund_method IS 'Méthode de remboursement';

-- ============================================================================
-- SÉQUENCE POUR NUMÉROTATION AUTOMATIQUE
-- ============================================================================

CREATE SEQUENCE IF NOT EXISTS credit_note_number_seq START WITH 1;

-- Fonction pour générer le numéro d'avoir
CREATE OR REPLACE FUNCTION generate_credit_note_number()
RETURNS VARCHAR AS $$
DECLARE
    next_num INTEGER;
    year_str VARCHAR(4);
BEGIN
    year_str := TO_CHAR(CURRENT_DATE, 'YYYY');
    next_num := nextval('credit_note_number_seq');
    RETURN 'AV-' || year_str || '-' || LPAD(next_num::text, 6, '0');
END;
$$ LANGUAGE plpgsql;
