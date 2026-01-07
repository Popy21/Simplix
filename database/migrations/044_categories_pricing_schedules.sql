-- Migration 044: Catégories, Tarifs clients, Échéanciers, Unités
-- Description: Fonctionnalités avancées pour parité Henrri
-- Author: Claude Code
-- Date: 2025-01-07

-- ==========================================
-- CATÉGORIES CLIENTS
-- ==========================================

CREATE TABLE IF NOT EXISTS customer_categories (
    id SERIAL PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#3B82F6', -- Hex color
    discount_percent DECIMAL(5, 2) DEFAULT 0, -- Remise par défaut pour cette catégorie
    payment_terms_days INTEGER DEFAULT 30, -- Délai de paiement par défaut
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id, name)
);

-- Ajouter catégorie aux clients
ALTER TABLE customers ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES customer_categories(id) ON DELETE SET NULL;

-- ==========================================
-- CATÉGORIES PRODUITS
-- ==========================================

CREATE TABLE IF NOT EXISTS product_categories (
    id SERIAL PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    parent_id INTEGER REFERENCES product_categories(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#10B981',
    image_url TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id, name, parent_id)
);

-- Ajouter catégorie aux produits
ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES product_categories(id) ON DELETE SET NULL;

-- ==========================================
-- UNITÉS PERSONNALISÉES
-- ==========================================

CREATE TABLE IF NOT EXISTS units (
    id SERIAL PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL, -- ex: 'h', 'j', 'kg', 'pce'
    name VARCHAR(100) NOT NULL, -- ex: 'Heure', 'Jour', 'Kilogramme', 'Pièce'
    symbol VARCHAR(10), -- ex: 'h', 'j', 'kg', 'pce'
    is_default BOOLEAN DEFAULT false,
    is_system BOOLEAN DEFAULT false, -- Unités prédéfinies non supprimables
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insérer les unités par défaut
INSERT INTO units (organization_id, code, name, symbol, is_default, is_system) VALUES
    (NULL, 'unit', 'Unité', 'u', true, true),
    (NULL, 'hour', 'Heure', 'h', false, true),
    (NULL, 'day', 'Jour', 'j', false, true),
    (NULL, 'kg', 'Kilogramme', 'kg', false, true),
    (NULL, 'g', 'Gramme', 'g', false, true),
    (NULL, 'l', 'Litre', 'L', false, true),
    (NULL, 'm', 'Mètre', 'm', false, true),
    (NULL, 'm2', 'Mètre carré', 'm²', false, true),
    (NULL, 'm3', 'Mètre cube', 'm³', false, true),
    (NULL, 'km', 'Kilomètre', 'km', false, true),
    (NULL, 'pack', 'Pack', 'pack', false, true),
    (NULL, 'box', 'Carton', 'ctn', false, true),
    (NULL, 'pallet', 'Palette', 'pal', false, true),
    (NULL, 'piece', 'Pièce', 'pce', false, true),
    (NULL, 'set', 'Ensemble', 'ens', false, true),
    (NULL, 'month', 'Mois', 'mois', false, true),
    (NULL, 'year', 'Année', 'an', false, true),
    (NULL, 'forfait', 'Forfait', 'forf', false, true)
ON CONFLICT DO NOTHING;

-- Ajouter unité aux produits
ALTER TABLE products ADD COLUMN IF NOT EXISTS unit_id INTEGER REFERENCES units(id) ON DELETE SET NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS unit_code VARCHAR(20) DEFAULT 'unit';

-- ==========================================
-- GRILLES TARIFAIRES PAR CLIENT
-- ==========================================

CREATE TABLE IF NOT EXISTS price_lists (
    id SERIAL PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    currency VARCHAR(3) DEFAULT 'EUR',
    is_default BOOLEAN DEFAULT false,
    valid_from DATE,
    valid_until DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id, name)
);

-- Prix par produit dans une grille tarifaire
CREATE TABLE IF NOT EXISTS price_list_items (
    id SERIAL PRIMARY KEY,
    price_list_id INTEGER REFERENCES price_lists(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    price DECIMAL(12, 2) NOT NULL,
    min_quantity DECIMAL(10, 2) DEFAULT 1, -- Prix valable à partir de cette quantité
    discount_percent DECIMAL(5, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(price_list_id, product_id, min_quantity)
);

-- Associer une grille tarifaire à un client
ALTER TABLE customers ADD COLUMN IF NOT EXISTS price_list_id INTEGER REFERENCES price_lists(id) ON DELETE SET NULL;

-- Prix spécifiques par client (override de la grille)
CREATE TABLE IF NOT EXISTS customer_prices (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    price DECIMAL(12, 2) NOT NULL,
    min_quantity DECIMAL(10, 2) DEFAULT 1,
    valid_from DATE,
    valid_until DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(customer_id, product_id, min_quantity)
);

-- ==========================================
-- ÉCHÉANCIER DE PAIEMENT
-- ==========================================

CREATE TABLE IF NOT EXISTS payment_schedules (
    id SERIAL PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

    -- Peut être lié à une facture ou un devis
    invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
    quote_id INTEGER REFERENCES quotes(id) ON DELETE CASCADE,

    -- Montant total de l'échéancier
    total_amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',

    -- Nombre d'échéances
    installments_count INTEGER NOT NULL DEFAULT 1,

    -- Type: equal (montants égaux), custom (montants personnalisés), percentage (%)
    schedule_type VARCHAR(20) DEFAULT 'equal',

    -- Statut global
    status VARCHAR(20) DEFAULT 'pending', -- pending, partial, completed, cancelled

    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT check_payment_schedule_type CHECK (schedule_type IN ('equal', 'custom', 'percentage')),
    CONSTRAINT check_schedule_status CHECK (status IN ('pending', 'partial', 'completed', 'cancelled'))
);

-- Détail des échéances
CREATE TABLE IF NOT EXISTS payment_schedule_items (
    id SERIAL PRIMARY KEY,
    schedule_id INTEGER REFERENCES payment_schedules(id) ON DELETE CASCADE,

    -- Numéro d'échéance (1, 2, 3...)
    installment_number INTEGER NOT NULL,

    -- Montant de l'échéance
    amount DECIMAL(12, 2) NOT NULL,
    percentage DECIMAL(5, 2), -- Si type = percentage

    -- Date d'échéance
    due_date DATE NOT NULL,

    -- Statut de cette échéance
    status VARCHAR(20) DEFAULT 'pending', -- pending, paid, overdue, cancelled

    -- Paiement effectué
    paid_amount DECIMAL(12, 2) DEFAULT 0,
    paid_date DATE,
    payment_id INTEGER REFERENCES payments(id) ON DELETE SET NULL,

    -- Notes
    notes TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(schedule_id, installment_number),
    CONSTRAINT check_installment_status CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled'))
);

-- ==========================================
-- BONS DE RETOUR
-- ==========================================

CREATE TABLE IF NOT EXISTS return_orders (
    id SERIAL PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    return_number VARCHAR(50) UNIQUE,

    -- Références
    customer_id INTEGER REFERENCES customers(id) ON DELETE RESTRICT,
    invoice_id INTEGER REFERENCES invoices(id) ON DELETE SET NULL,
    delivery_note_id INTEGER REFERENCES delivery_notes(id) ON DELETE SET NULL,

    -- Dates
    return_date DATE NOT NULL DEFAULT CURRENT_DATE,
    received_date DATE,

    -- Motif
    reason VARCHAR(50), -- defective, wrong_item, damaged, other
    reason_details TEXT,

    -- Statut
    status VARCHAR(20) DEFAULT 'pending', -- pending, received, inspected, refunded, rejected

    -- Montants
    total_amount DECIMAL(12, 2) DEFAULT 0,

    -- Action: credit_note, replacement, refund
    resolution_type VARCHAR(20),
    credit_note_id INTEGER REFERENCES credit_notes(id) ON DELETE SET NULL,

    notes TEXT,

    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT check_return_reason CHECK (reason IN ('defective', 'wrong_item', 'damaged', 'not_as_described', 'other')),
    CONSTRAINT check_return_status CHECK (status IN ('pending', 'received', 'inspected', 'refunded', 'replaced', 'rejected')),
    CONSTRAINT check_resolution_type CHECK (resolution_type IS NULL OR resolution_type IN ('credit_note', 'replacement', 'refund', 'none'))
);

-- Lignes du bon de retour
CREATE TABLE IF NOT EXISTS return_order_items (
    id SERIAL PRIMARY KEY,
    return_order_id INTEGER REFERENCES return_orders(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,

    description TEXT NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    unit_price DECIMAL(12, 2) NOT NULL,

    -- État du produit retourné
    condition VARCHAR(20) DEFAULT 'unknown', -- new, good, damaged, defective, unknown

    -- Réintégration stock
    restock BOOLEAN DEFAULT false,
    restocked_quantity DECIMAL(10, 2) DEFAULT 0,

    line_total DECIMAL(12, 2) NOT NULL,

    CONSTRAINT check_item_condition CHECK (condition IN ('new', 'good', 'damaged', 'defective', 'unknown'))
);

-- ==========================================
-- TVA SUR ENCAISSEMENT
-- ==========================================

-- Ajouter le régime TVA aux organisations
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS vat_regime VARCHAR(20) DEFAULT 'debit';
-- debit = TVA sur les débits (facturation)
-- cash = TVA sur encaissement (paiement)

COMMENT ON COLUMN company_profiles.vat_regime IS 'Régime TVA: debit (sur débits/facturation) ou cash (sur encaissement)';

-- Table pour suivre la TVA collectée sur encaissement
CREATE TABLE IF NOT EXISTS vat_cash_entries (
    id SERIAL PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
    payment_id INTEGER REFERENCES payments(id) ON DELETE CASCADE,

    -- Montant HT encaissé
    amount_ht DECIMAL(12, 2) NOT NULL,

    -- TVA collectée
    vat_amount DECIMAL(12, 2) NOT NULL,
    vat_rate DECIMAL(5, 2) NOT NULL,

    -- Période fiscale
    fiscal_period VARCHAR(7), -- Format: YYYY-MM

    -- Date d'encaissement
    payment_date DATE NOT NULL,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- AUTO-LIQUIDATION TVA (INTRACOMMUNAUTAIRE)
-- ==========================================

-- Types d'opérations intracommunautaires
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS vat_type VARCHAR(20) DEFAULT 'standard';
-- standard = TVA normale
-- reverse_charge = Autoliquidation (client redevable)
-- intracom = Livraison intracommunautaire exonérée
-- export = Exportation hors UE

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS vat_exemption_reason TEXT;

COMMENT ON COLUMN invoices.vat_type IS 'Type TVA: standard, reverse_charge (autoliquidation), intracom (intracommunautaire), export';

-- Mentions légales pour autoliquidation
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS reverse_charge_mention TEXT;

-- Vue pour les déclarations TVA intracommunautaires
CREATE OR REPLACE VIEW intracom_invoices AS
SELECT
    i.id,
    i.invoice_number,
    i.invoice_date,
    i.vat_type,
    c.name as customer_name,
    c.tva_intracom as customer_vat_number,
    c.country,
    i.subtotal_ht as amount_ht,
    i.total_vat,
    i.total_ttc,
    i.vat_exemption_reason,
    i.organization_id
FROM invoices i
LEFT JOIN customers c ON i.customer_id = c.id
WHERE i.vat_type IN ('reverse_charge', 'intracom', 'export')
AND i.deleted_at IS NULL
ORDER BY i.invoice_date DESC;

-- ==========================================
-- INDEX
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_customer_categories_org ON customer_categories(organization_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_org ON product_categories(organization_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_parent ON product_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_units_org ON units(organization_id);
CREATE INDEX IF NOT EXISTS idx_price_lists_org ON price_lists(organization_id);
CREATE INDEX IF NOT EXISTS idx_price_list_items_list ON price_list_items(price_list_id);
CREATE INDEX IF NOT EXISTS idx_customer_prices_customer ON customer_prices(customer_id);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_invoice ON payment_schedules(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_quote ON payment_schedules(quote_id);
CREATE INDEX IF NOT EXISTS idx_payment_schedule_items_schedule ON payment_schedule_items(schedule_id);
CREATE INDEX IF NOT EXISTS idx_return_orders_org ON return_orders(organization_id);
CREATE INDEX IF NOT EXISTS idx_return_orders_customer ON return_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_vat_cash_entries_org ON vat_cash_entries(organization_id);
CREATE INDEX IF NOT EXISTS idx_vat_cash_entries_period ON vat_cash_entries(fiscal_period);

-- ==========================================
-- FONCTIONS UTILES
-- ==========================================

-- Fonction pour obtenir le prix d'un produit pour un client
CREATE OR REPLACE FUNCTION get_customer_price(
    p_customer_id INTEGER,
    p_product_id INTEGER,
    p_quantity DECIMAL DEFAULT 1
)
RETURNS DECIMAL AS $$
DECLARE
    v_price DECIMAL;
    v_price_list_id INTEGER;
BEGIN
    -- 1. Vérifier s'il y a un prix spécifique client
    SELECT price INTO v_price
    FROM customer_prices
    WHERE customer_id = p_customer_id
    AND product_id = p_product_id
    AND min_quantity <= p_quantity
    AND (valid_from IS NULL OR valid_from <= CURRENT_DATE)
    AND (valid_until IS NULL OR valid_until >= CURRENT_DATE)
    ORDER BY min_quantity DESC
    LIMIT 1;

    IF v_price IS NOT NULL THEN
        RETURN v_price;
    END IF;

    -- 2. Vérifier la grille tarifaire du client
    SELECT price_list_id INTO v_price_list_id
    FROM customers WHERE id = p_customer_id;

    IF v_price_list_id IS NOT NULL THEN
        SELECT pli.price INTO v_price
        FROM price_list_items pli
        JOIN price_lists pl ON pli.price_list_id = pl.id
        WHERE pl.id = v_price_list_id
        AND pli.product_id = p_product_id
        AND pli.min_quantity <= p_quantity
        AND pl.is_active = true
        AND (pl.valid_from IS NULL OR pl.valid_from <= CURRENT_DATE)
        AND (pl.valid_until IS NULL OR pl.valid_until >= CURRENT_DATE)
        ORDER BY pli.min_quantity DESC
        LIMIT 1;

        IF v_price IS NOT NULL THEN
            RETURN v_price;
        END IF;
    END IF;

    -- 3. Prix standard du produit
    SELECT price INTO v_price
    FROM products WHERE id = p_product_id;

    RETURN v_price;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour calculer un échéancier
CREATE OR REPLACE FUNCTION generate_payment_schedule(
    p_total_amount DECIMAL,
    p_installments INTEGER,
    p_first_due_date DATE,
    p_interval_days INTEGER DEFAULT 30
)
RETURNS TABLE (
    installment_number INTEGER,
    amount DECIMAL,
    due_date DATE
) AS $$
DECLARE
    v_amount_per_installment DECIMAL;
    v_remainder DECIMAL;
BEGIN
    v_amount_per_installment := ROUND(p_total_amount / p_installments, 2);
    v_remainder := p_total_amount - (v_amount_per_installment * p_installments);

    FOR i IN 1..p_installments LOOP
        installment_number := i;
        -- Ajouter le reste à la dernière échéance
        IF i = p_installments THEN
            amount := v_amount_per_installment + v_remainder;
        ELSE
            amount := v_amount_per_installment;
        END IF;
        due_date := p_first_due_date + ((i - 1) * p_interval_days);
        RETURN NEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- COMMENTAIRES
-- ==========================================

COMMENT ON TABLE customer_categories IS 'Catégories clients avec conditions par défaut';
COMMENT ON TABLE product_categories IS 'Catégories produits hiérarchiques';
COMMENT ON TABLE units IS 'Unités de mesure personnalisables';
COMMENT ON TABLE price_lists IS 'Grilles tarifaires par segment client';
COMMENT ON TABLE customer_prices IS 'Prix spécifiques par client';
COMMENT ON TABLE payment_schedules IS 'Échéanciers de paiement';
COMMENT ON TABLE return_orders IS 'Bons de retour marchandises';
COMMENT ON TABLE vat_cash_entries IS 'Suivi TVA sur encaissement';
COMMENT ON VIEW intracom_invoices IS 'Factures intracommunautaires et export';
