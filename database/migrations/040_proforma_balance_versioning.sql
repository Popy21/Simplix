-- Migration 040: Factures proforma, factures de solde et versioning devis
-- Description: Types de factures avancés et historique des versions de devis
-- Author: Claude Code
-- Date: 2025-01-07

-- ==========================================
-- TYPES DE FACTURES (Proforma, Solde, etc.)
-- ==========================================

-- Ajouter le type de facture
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_type VARCHAR(20) DEFAULT 'standard'
    CHECK (invoice_type IN ('standard', 'proforma', 'deposit', 'balance', 'credit_note'));

-- Ajouter la référence à la facture principale (pour factures de solde)
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS parent_invoice_id INTEGER REFERENCES invoices(id);

-- Ajouter le pourcentage d'acompte
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS deposit_percent DECIMAL(5, 2);

-- Champs pour traçabilité proforma
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS proforma_converted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS proforma_converted_to INTEGER REFERENCES invoices(id);

-- Index
CREATE INDEX IF NOT EXISTS idx_invoices_type ON invoices(invoice_type);
CREATE INDEX IF NOT EXISTS idx_invoices_parent ON invoices(parent_invoice_id);

-- ==========================================
-- VERSIONING DES DEVIS
-- ==========================================

-- Table des versions de devis
CREATE TABLE IF NOT EXISTS quote_versions (
    id SERIAL PRIMARY KEY,
    quote_id INTEGER NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,

    -- Numéro de version
    version_number INTEGER NOT NULL DEFAULT 1,

    -- Snapshot des données du devis
    quote_data JSONB NOT NULL,
    items_data JSONB NOT NULL,

    -- Raison du changement
    change_reason TEXT,
    change_summary TEXT,

    -- Métadonnées
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Contrainte d'unicité
    UNIQUE(quote_id, version_number)
);

-- Ajouter la version courante au devis
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS current_version INTEGER DEFAULT 1;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS version_history JSONB DEFAULT '[]';

-- Index pour les versions
CREATE INDEX IF NOT EXISTS idx_quote_versions_quote ON quote_versions(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_versions_created ON quote_versions(created_at);

-- ==========================================
-- FONCTIONS DE VERSIONING
-- ==========================================

-- Fonction pour créer une nouvelle version d'un devis
CREATE OR REPLACE FUNCTION create_quote_version(
    p_quote_id INTEGER,
    p_user_id INTEGER,
    p_change_reason TEXT DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
    v_quote RECORD;
    v_items JSONB;
    v_new_version INTEGER;
BEGIN
    -- Récupérer le devis
    SELECT * INTO v_quote FROM quotes WHERE id = p_quote_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Devis non trouvé';
    END IF;

    -- Récupérer les items
    SELECT jsonb_agg(row_to_json(qi)) INTO v_items
    FROM quote_items qi WHERE qi.quote_id = p_quote_id;

    -- Déterminer le numéro de version
    SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_new_version
    FROM quote_versions WHERE quote_id = p_quote_id;

    -- Créer la version
    INSERT INTO quote_versions (
        quote_id, version_number, quote_data, items_data,
        change_reason, created_by
    ) VALUES (
        p_quote_id,
        v_new_version,
        row_to_json(v_quote)::jsonb,
        COALESCE(v_items, '[]'::jsonb),
        p_change_reason,
        p_user_id
    );

    -- Mettre à jour le numéro de version du devis
    UPDATE quotes SET
        current_version = v_new_version,
        updated_at = NOW()
    WHERE id = p_quote_id;

    RETURN v_new_version;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour restaurer une version de devis
CREATE OR REPLACE FUNCTION restore_quote_version(
    p_quote_id INTEGER,
    p_version_number INTEGER,
    p_user_id INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
    v_version RECORD;
    v_quote_data JSONB;
    v_item JSONB;
BEGIN
    -- Récupérer la version
    SELECT * INTO v_version FROM quote_versions
    WHERE quote_id = p_quote_id AND version_number = p_version_number;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Version non trouvée';
    END IF;

    v_quote_data := v_version.quote_data;

    -- Mettre à jour le devis
    UPDATE quotes SET
        title = v_quote_data->>'title',
        description = v_quote_data->>'description',
        subtotal = (v_quote_data->>'subtotal')::DECIMAL,
        tax_rate = (v_quote_data->>'tax_rate')::DECIMAL,
        tax_amount = (v_quote_data->>'tax_amount')::DECIMAL,
        total_amount = (v_quote_data->>'total_amount')::DECIMAL,
        discount_type = v_quote_data->>'discount_type',
        discount_percent = (v_quote_data->>'discount_percent')::DECIMAL,
        discount_amount = (v_quote_data->>'discount_amount')::DECIMAL,
        payment_terms = v_quote_data->>'payment_terms',
        notes = v_quote_data->>'notes',
        updated_at = NOW()
    WHERE id = p_quote_id;

    -- Supprimer les items actuels
    DELETE FROM quote_items WHERE quote_id = p_quote_id;

    -- Restaurer les items
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_version.items_data)
    LOOP
        INSERT INTO quote_items (
            quote_id, product_id, description, quantity,
            unit_price, total_price, discount_percent, tax_rate, sort_order
        ) VALUES (
            p_quote_id,
            (v_item->>'product_id')::INTEGER,
            v_item->>'description',
            (v_item->>'quantity')::DECIMAL,
            (v_item->>'unit_price')::DECIMAL,
            (v_item->>'total_price')::DECIMAL,
            COALESCE((v_item->>'discount_percent')::DECIMAL, 0),
            (v_item->>'tax_rate')::DECIMAL,
            COALESCE((v_item->>'sort_order')::INTEGER, 0)
        );
    END LOOP;

    -- Créer une nouvelle version pour tracer la restauration
    PERFORM create_quote_version(p_quote_id, p_user_id, 'Restauration de la version ' || p_version_number);

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- FONCTIONS POUR FACTURES PROFORMA/SOLDE
-- ==========================================

-- Fonction pour créer une facture proforma
CREATE OR REPLACE FUNCTION create_proforma_invoice(
    p_quote_id INTEGER,
    p_user_id INTEGER
) RETURNS INTEGER AS $$
DECLARE
    v_quote RECORD;
    v_invoice_id INTEGER;
    v_invoice_number VARCHAR(50);
    v_year INTEGER;
BEGIN
    -- Récupérer le devis
    SELECT * INTO v_quote FROM quotes WHERE id = p_quote_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Devis non trouvé';
    END IF;

    -- Générer le numéro de proforma
    v_year := EXTRACT(YEAR FROM CURRENT_DATE);
    SELECT 'PRO-' || v_year || '-' || LPAD((COALESCE(MAX(
        CASE WHEN invoice_number ~ 'PRO-[0-9]{4}-[0-9]+'
        THEN SUBSTRING(invoice_number FROM 'PRO-[0-9]{4}-([0-9]+)')::INTEGER
        END
    ), 0) + 1)::TEXT, 5, '0')
    INTO v_invoice_number
    FROM invoices
    WHERE invoice_type = 'proforma';

    -- Créer la facture proforma
    INSERT INTO invoices (
        customer_id, user_id, quote_id, invoice_number, invoice_type,
        title, description, subtotal, tax_rate, tax_amount, total_amount,
        status, template_id, organization_id
    ) SELECT
        v_quote.customer_id,
        p_user_id,
        p_quote_id,
        v_invoice_number,
        'proforma',
        'Facture Proforma - ' || v_quote.title,
        v_quote.description,
        v_quote.subtotal,
        v_quote.tax_rate,
        v_quote.tax_amount,
        v_quote.total_amount,
        'draft',
        v_quote.template_id,
        v_quote.organization_id
    RETURNING id INTO v_invoice_id;

    -- Copier les items
    INSERT INTO invoice_items (invoice_id, product_id, description, quantity, unit_price, total_price, sort_order)
    SELECT v_invoice_id, product_id, description, quantity, unit_price, total_price, sort_order
    FROM quote_items WHERE quote_id = p_quote_id;

    RETURN v_invoice_id;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour créer une facture d'acompte
CREATE OR REPLACE FUNCTION create_deposit_invoice(
    p_quote_id INTEGER,
    p_user_id INTEGER,
    p_deposit_percent DECIMAL DEFAULT 30
) RETURNS INTEGER AS $$
DECLARE
    v_quote RECORD;
    v_invoice_id INTEGER;
    v_invoice_number VARCHAR(50);
    v_deposit_amount DECIMAL;
    v_year INTEGER;
BEGIN
    -- Récupérer le devis
    SELECT * INTO v_quote FROM quotes WHERE id = p_quote_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Devis non trouvé';
    END IF;

    -- Calculer le montant de l'acompte
    v_deposit_amount := v_quote.total_amount * (p_deposit_percent / 100);

    -- Générer le numéro de facture d'acompte
    v_year := EXTRACT(YEAR FROM CURRENT_DATE);
    SELECT 'FA-' || v_year || '-' || LPAD((COALESCE(MAX(
        CASE WHEN invoice_number ~ 'FA-[0-9]{4}-[0-9]+'
        THEN SUBSTRING(invoice_number FROM 'FA-[0-9]{4}-([0-9]+)')::INTEGER
        END
    ), 0) + 1)::TEXT, 5, '0')
    INTO v_invoice_number
    FROM invoices;

    -- Créer la facture d'acompte
    INSERT INTO invoices (
        customer_id, user_id, quote_id, invoice_number, invoice_type,
        title, description, subtotal, tax_rate, tax_amount, total_amount,
        deposit_percent, status, template_id, organization_id
    ) VALUES (
        v_quote.customer_id,
        p_user_id,
        p_quote_id,
        v_invoice_number,
        'deposit',
        'Facture d''acompte (' || p_deposit_percent || '%) - ' || v_quote.title,
        'Acompte de ' || p_deposit_percent || '% sur le devis ' || v_quote.quote_number,
        v_deposit_amount / (1 + v_quote.tax_rate / 100),
        v_quote.tax_rate,
        v_deposit_amount - (v_deposit_amount / (1 + v_quote.tax_rate / 100)),
        v_deposit_amount,
        p_deposit_percent,
        'draft',
        v_quote.template_id,
        v_quote.organization_id
    ) RETURNING id INTO v_invoice_id;

    -- Ajouter une ligne unique pour l'acompte
    INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total_price)
    VALUES (
        v_invoice_id,
        'Acompte ' || p_deposit_percent || '% sur devis ' || v_quote.quote_number,
        1,
        v_deposit_amount / (1 + v_quote.tax_rate / 100),
        v_deposit_amount / (1 + v_quote.tax_rate / 100)
    );

    RETURN v_invoice_id;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour créer une facture de solde
CREATE OR REPLACE FUNCTION create_balance_invoice(
    p_deposit_invoice_id INTEGER,
    p_user_id INTEGER
) RETURNS INTEGER AS $$
DECLARE
    v_deposit RECORD;
    v_quote RECORD;
    v_invoice_id INTEGER;
    v_invoice_number VARCHAR(50);
    v_balance_amount DECIMAL;
    v_year INTEGER;
BEGIN
    -- Récupérer la facture d'acompte
    SELECT * INTO v_deposit FROM invoices
    WHERE id = p_deposit_invoice_id AND invoice_type = 'deposit';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Facture d''acompte non trouvée';
    END IF;

    -- Récupérer le devis original
    SELECT * INTO v_quote FROM quotes WHERE id = v_deposit.quote_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Devis original non trouvé';
    END IF;

    -- Calculer le solde
    v_balance_amount := v_quote.total_amount - v_deposit.total_amount;

    -- Générer le numéro de facture de solde
    v_year := EXTRACT(YEAR FROM CURRENT_DATE);
    SELECT 'FA-' || v_year || '-' || LPAD((COALESCE(MAX(
        CASE WHEN invoice_number ~ 'FA-[0-9]{4}-[0-9]+'
        THEN SUBSTRING(invoice_number FROM 'FA-[0-9]{4}-([0-9]+)')::INTEGER
        END
    ), 0) + 1)::TEXT, 5, '0')
    INTO v_invoice_number
    FROM invoices;

    -- Créer la facture de solde
    INSERT INTO invoices (
        customer_id, user_id, quote_id, invoice_number, invoice_type,
        parent_invoice_id, title, description, subtotal, tax_rate,
        tax_amount, total_amount, status, template_id, organization_id
    ) VALUES (
        v_quote.customer_id,
        p_user_id,
        v_quote.id,
        v_invoice_number,
        'balance',
        p_deposit_invoice_id,
        'Facture de solde - ' || v_quote.title,
        'Solde après acompte (facture ' || v_deposit.invoice_number || ')',
        v_balance_amount / (1 + v_quote.tax_rate / 100),
        v_quote.tax_rate,
        v_balance_amount - (v_balance_amount / (1 + v_quote.tax_rate / 100)),
        v_balance_amount,
        'draft',
        v_quote.template_id,
        v_quote.organization_id
    ) RETURNING id INTO v_invoice_id;

    -- Copier les items du devis
    INSERT INTO invoice_items (invoice_id, product_id, description, quantity, unit_price, total_price, sort_order)
    SELECT v_invoice_id, product_id, description, quantity, unit_price, total_price, sort_order
    FROM quote_items WHERE quote_id = v_quote.id;

    -- Ajouter une ligne de déduction de l'acompte
    INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total_price, sort_order)
    VALUES (
        v_invoice_id,
        'Déduction acompte (facture ' || v_deposit.invoice_number || ')',
        1,
        -v_deposit.total_amount / (1 + v_quote.tax_rate / 100),
        -v_deposit.total_amount / (1 + v_quote.tax_rate / 100),
        9999
    );

    RETURN v_invoice_id;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour convertir une proforma en facture définitive
CREATE OR REPLACE FUNCTION convert_proforma_to_invoice(
    p_proforma_id INTEGER,
    p_user_id INTEGER
) RETURNS INTEGER AS $$
DECLARE
    v_proforma RECORD;
    v_invoice_id INTEGER;
    v_invoice_number VARCHAR(50);
    v_year INTEGER;
BEGIN
    -- Récupérer la proforma
    SELECT * INTO v_proforma FROM invoices
    WHERE id = p_proforma_id AND invoice_type = 'proforma';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Facture proforma non trouvée';
    END IF;

    -- Générer le numéro de facture
    v_year := EXTRACT(YEAR FROM CURRENT_DATE);
    SELECT 'FA-' || v_year || '-' || LPAD((COALESCE(MAX(
        CASE WHEN invoice_number ~ 'FA-[0-9]{4}-[0-9]+'
        THEN SUBSTRING(invoice_number FROM 'FA-[0-9]{4}-([0-9]+)')::INTEGER
        END
    ), 0) + 1)::TEXT, 5, '0')
    INTO v_invoice_number
    FROM invoices;

    -- Créer la facture définitive
    INSERT INTO invoices (
        customer_id, user_id, quote_id, invoice_number, invoice_type,
        title, description, subtotal, tax_rate, tax_amount, total_amount,
        status, template_id, organization_id
    ) VALUES (
        v_proforma.customer_id,
        p_user_id,
        v_proforma.quote_id,
        v_invoice_number,
        'standard',
        REPLACE(v_proforma.title, 'Facture Proforma - ', ''),
        v_proforma.description,
        v_proforma.subtotal,
        v_proforma.tax_rate,
        v_proforma.tax_amount,
        v_proforma.total_amount,
        'draft',
        v_proforma.template_id,
        v_proforma.organization_id
    ) RETURNING id INTO v_invoice_id;

    -- Copier les items
    INSERT INTO invoice_items (invoice_id, product_id, description, quantity, unit_price, total_price, sort_order)
    SELECT v_invoice_id, product_id, description, quantity, unit_price, total_price, sort_order
    FROM invoice_items WHERE invoice_id = p_proforma_id;

    -- Marquer la proforma comme convertie
    UPDATE invoices SET
        proforma_converted_at = NOW(),
        proforma_converted_to = v_invoice_id,
        status = 'converted'
    WHERE id = p_proforma_id;

    RETURN v_invoice_id;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- VUES
-- ==========================================

-- Vue des devis avec leurs versions
CREATE OR REPLACE VIEW quotes_with_versions AS
SELECT
    q.*,
    c.name as customer_name,
    (SELECT COUNT(*) FROM quote_versions WHERE quote_id = q.id) as total_versions,
    (SELECT MAX(created_at) FROM quote_versions WHERE quote_id = q.id) as last_version_date
FROM quotes q
LEFT JOIN customers c ON q.customer_id = c.id;

-- Vue des factures par type
CREATE OR REPLACE VIEW invoices_by_type AS
SELECT
    invoice_type,
    COUNT(*) as count,
    SUM(total_amount) as total_amount,
    SUM(total_amount) FILTER (WHERE status = 'paid') as paid_amount,
    SUM(total_amount) FILTER (WHERE status IN ('sent', 'overdue')) as pending_amount
FROM invoices
WHERE deleted_at IS NULL
GROUP BY invoice_type;

-- Commentaires
COMMENT ON TABLE quote_versions IS 'Historique des versions des devis';
COMMENT ON FUNCTION create_quote_version IS 'Crée une nouvelle version d''un devis';
COMMENT ON FUNCTION restore_quote_version IS 'Restaure une version antérieure d''un devis';
COMMENT ON FUNCTION create_proforma_invoice IS 'Crée une facture proforma à partir d''un devis';
COMMENT ON FUNCTION create_deposit_invoice IS 'Crée une facture d''acompte à partir d''un devis';
COMMENT ON FUNCTION create_balance_invoice IS 'Crée une facture de solde à partir d''une facture d''acompte';
COMMENT ON FUNCTION convert_proforma_to_invoice IS 'Convertit une facture proforma en facture définitive';
