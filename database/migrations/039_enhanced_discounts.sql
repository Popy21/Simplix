-- Migration 039: Système de remises amélioré
-- Description: Remises par ligne et remises globales sur devis/factures
-- Author: Claude Code
-- Date: 2025-01-07

-- ==========================================
-- REMISES SUR DEVIS
-- ==========================================

-- Remise globale sur devis
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS discount_type VARCHAR(20) DEFAULT 'none'
    CHECK (discount_type IN ('none', 'percent', 'amount'));
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS discount_percent DECIMAL(5, 2) DEFAULT 0;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS discount_reason TEXT;

-- Remise par ligne sur devis (si pas déjà présent)
ALTER TABLE quote_items ADD COLUMN IF NOT EXISTS discount_type VARCHAR(20) DEFAULT 'none'
    CHECK (discount_type IN ('none', 'percent', 'amount'));
ALTER TABLE quote_items ADD COLUMN IF NOT EXISTS discount_percent DECIMAL(5, 2) DEFAULT 0;
ALTER TABLE quote_items ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE quote_items ADD COLUMN IF NOT EXISTS subtotal DECIMAL(12, 2);

-- ==========================================
-- REMISES SUR FACTURES
-- ==========================================

-- Remise globale sur factures
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount_type VARCHAR(20) DEFAULT 'none'
    CHECK (discount_type IN ('none', 'percent', 'amount'));
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount_percent DECIMAL(5, 2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount_reason TEXT;

-- Remise par ligne sur factures (si pas déjà présent)
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS discount_type VARCHAR(20) DEFAULT 'none'
    CHECK (discount_type IN ('none', 'percent', 'amount'));
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS discount_percent DECIMAL(5, 2) DEFAULT 0;
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS subtotal DECIMAL(12, 2);

-- ==========================================
-- FONCTIONS DE CALCUL DES REMISES
-- ==========================================

-- Fonction pour calculer le prix après remise ligne
CREATE OR REPLACE FUNCTION calculate_line_discount(
    quantity DECIMAL,
    unit_price DECIMAL,
    discount_type VARCHAR,
    discount_percent DECIMAL,
    discount_amount DECIMAL
) RETURNS TABLE (
    subtotal DECIMAL,
    discount DECIMAL,
    total_price DECIMAL
) AS $$
DECLARE
    v_subtotal DECIMAL;
    v_discount DECIMAL;
BEGIN
    v_subtotal := quantity * unit_price;

    CASE discount_type
        WHEN 'percent' THEN
            v_discount := v_subtotal * (discount_percent / 100);
        WHEN 'amount' THEN
            v_discount := discount_amount;
        ELSE
            v_discount := 0;
    END CASE;

    RETURN QUERY SELECT v_subtotal, v_discount, (v_subtotal - v_discount);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Fonction pour calculer le total avec remise globale
CREATE OR REPLACE FUNCTION calculate_document_total(
    subtotal_before_discount DECIMAL,
    doc_discount_type VARCHAR,
    doc_discount_percent DECIMAL,
    doc_discount_amount DECIMAL,
    tax_rate DECIMAL,
    shipping_cost DECIMAL DEFAULT 0
) RETURNS TABLE (
    subtotal DECIMAL,
    discount DECIMAL,
    subtotal_after_discount DECIMAL,
    tax_amount DECIMAL,
    total_amount DECIMAL
) AS $$
DECLARE
    v_discount DECIMAL;
    v_subtotal_after DECIMAL;
    v_tax DECIMAL;
BEGIN
    CASE doc_discount_type
        WHEN 'percent' THEN
            v_discount := subtotal_before_discount * (doc_discount_percent / 100);
        WHEN 'amount' THEN
            v_discount := doc_discount_amount;
        ELSE
            v_discount := 0;
    END CASE;

    v_subtotal_after := subtotal_before_discount - v_discount + COALESCE(shipping_cost, 0);
    v_tax := v_subtotal_after * (tax_rate / 100);

    RETURN QUERY SELECT
        subtotal_before_discount,
        v_discount,
        v_subtotal_after,
        v_tax,
        (v_subtotal_after + v_tax);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ==========================================
-- TRIGGER POUR RECALCULER LES TOTAUX
-- ==========================================

-- Trigger pour recalculer les totaux du devis
CREATE OR REPLACE FUNCTION recalculate_quote_totals()
RETURNS TRIGGER AS $$
DECLARE
    v_subtotal DECIMAL;
    v_discount DECIMAL;
    v_subtotal_after DECIMAL;
    v_tax_amount DECIMAL;
    v_total DECIMAL;
    v_quote RECORD;
BEGIN
    -- Récupérer le devis
    SELECT * INTO v_quote FROM quotes
    WHERE id = COALESCE(NEW.quote_id, OLD.quote_id);

    IF v_quote IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- Calculer le sous-total des lignes
    SELECT COALESCE(SUM(
        CASE
            WHEN qi.discount_type = 'percent' THEN
                (qi.quantity * qi.unit_price) * (1 - COALESCE(qi.discount_percent, 0) / 100)
            WHEN qi.discount_type = 'amount' THEN
                (qi.quantity * qi.unit_price) - COALESCE(qi.discount_amount, 0)
            ELSE
                qi.quantity * qi.unit_price
        END
    ), 0) INTO v_subtotal
    FROM quote_items qi
    WHERE qi.quote_id = v_quote.id;

    -- Calculer la remise globale
    CASE v_quote.discount_type
        WHEN 'percent' THEN
            v_discount := v_subtotal * (COALESCE(v_quote.discount_percent, 0) / 100);
        WHEN 'amount' THEN
            v_discount := COALESCE(v_quote.discount_amount, 0);
        ELSE
            v_discount := 0;
    END CASE;

    v_subtotal_after := v_subtotal - v_discount;
    v_tax_amount := v_subtotal_after * (COALESCE(v_quote.tax_rate, 20) / 100);
    v_total := v_subtotal_after + v_tax_amount;

    -- Mettre à jour le devis
    UPDATE quotes SET
        subtotal = v_subtotal,
        discount_amount = v_discount,
        tax_amount = v_tax_amount,
        total_amount = v_total,
        updated_at = NOW()
    WHERE id = v_quote.id;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger pour recalculer les totaux de la facture
CREATE OR REPLACE FUNCTION recalculate_invoice_totals()
RETURNS TRIGGER AS $$
DECLARE
    v_subtotal DECIMAL;
    v_discount DECIMAL;
    v_subtotal_after DECIMAL;
    v_tax_amount DECIMAL;
    v_total DECIMAL;
    v_invoice RECORD;
BEGIN
    -- Récupérer la facture
    SELECT * INTO v_invoice FROM invoices
    WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);

    IF v_invoice IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- Calculer le sous-total des lignes
    SELECT COALESCE(SUM(
        CASE
            WHEN ii.discount_type = 'percent' THEN
                (ii.quantity * ii.unit_price) * (1 - COALESCE(ii.discount_percent, 0) / 100)
            WHEN ii.discount_type = 'amount' THEN
                (ii.quantity * ii.unit_price) - COALESCE(ii.discount_amount, 0)
            ELSE
                ii.quantity * ii.unit_price
        END
    ), 0) INTO v_subtotal
    FROM invoice_items ii
    WHERE ii.invoice_id = v_invoice.id;

    -- Calculer la remise globale
    CASE v_invoice.discount_type
        WHEN 'percent' THEN
            v_discount := v_subtotal * (COALESCE(v_invoice.discount_percent, 0) / 100);
        WHEN 'amount' THEN
            v_discount := COALESCE(v_invoice.discount_amount, 0);
        ELSE
            v_discount := 0;
    END CASE;

    v_subtotal_after := v_subtotal - v_discount;
    v_tax_amount := v_subtotal_after * (COALESCE(v_invoice.tax_rate, 20) / 100);
    v_total := v_subtotal_after + v_tax_amount;

    -- Mettre à jour la facture
    UPDATE invoices SET
        subtotal = v_subtotal,
        discount_amount = v_discount,
        tax_amount = v_tax_amount,
        total_amount = v_total,
        updated_at = NOW()
    WHERE id = v_invoice.id;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Activer les triggers (désactivé par défaut pour éviter les problèmes de performance)
-- Décommenter si vous souhaitez un recalcul automatique:
-- DROP TRIGGER IF EXISTS trigger_recalculate_quote ON quote_items;
-- CREATE TRIGGER trigger_recalculate_quote
--     AFTER INSERT OR UPDATE OR DELETE ON quote_items
--     FOR EACH ROW EXECUTE FUNCTION recalculate_quote_totals();

-- DROP TRIGGER IF EXISTS trigger_recalculate_invoice ON invoice_items;
-- CREATE TRIGGER trigger_recalculate_invoice
--     AFTER INSERT OR UPDATE OR DELETE ON invoice_items
--     FOR EACH ROW EXECUTE FUNCTION recalculate_invoice_totals();

-- ==========================================
-- VUES POUR REPORTING
-- ==========================================

-- Vue des remises accordées
CREATE OR REPLACE VIEW discount_summary AS
SELECT
    'quote' as document_type,
    q.id as document_id,
    q.quote_number as document_number,
    q.created_at,
    c.name as customer_name,
    q.subtotal as original_amount,
    q.discount_type,
    q.discount_percent,
    q.discount_amount,
    q.discount_reason,
    q.total_amount as final_amount,
    q.organization_id
FROM quotes q
LEFT JOIN customers c ON q.customer_id = c.id
WHERE q.discount_amount > 0 OR q.discount_percent > 0

UNION ALL

SELECT
    'invoice' as document_type,
    i.id as document_id,
    i.invoice_number as document_number,
    i.created_at,
    c.name as customer_name,
    i.subtotal as original_amount,
    i.discount_type,
    i.discount_percent,
    i.discount_amount,
    i.discount_reason,
    i.total_amount as final_amount,
    i.organization_id
FROM invoices i
LEFT JOIN customers c ON i.customer_id = c.id
WHERE i.discount_amount > 0 OR i.discount_percent > 0

ORDER BY created_at DESC;

-- Commentaires
COMMENT ON TABLE quotes IS 'Devis avec support remises globales';
COMMENT ON TABLE invoices IS 'Factures avec support remises globales';
COMMENT ON VIEW discount_summary IS 'Synthèse des remises accordées sur tous les documents';
