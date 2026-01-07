-- Migration 038: Bons de commande et Bons de livraison
-- Description: Gestion complète du cycle commande → livraison → facture
-- Author: Claude Code
-- Date: 2025-01-07

-- ==========================================
-- BONS DE COMMANDE (Purchase Orders)
-- ==========================================

CREATE TABLE IF NOT EXISTS purchase_orders (
    id SERIAL PRIMARY KEY,

    -- Numérotation
    order_number VARCHAR(50) UNIQUE NOT NULL,

    -- Client
    customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,

    -- Référence devis
    quote_id INTEGER REFERENCES quotes(id) ON DELETE SET NULL,

    -- Dates
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_delivery_date DATE,
    actual_delivery_date DATE,

    -- Adresses
    billing_address TEXT,
    shipping_address TEXT,

    -- Montants
    subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(12, 2) DEFAULT 0,
    shipping_cost DECIMAL(12, 2) DEFAULT 0,
    tax_rate DECIMAL(5, 2) DEFAULT 20.00,
    tax_amount DECIMAL(12, 2) DEFAULT 0,
    total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,

    -- Statut: draft, confirmed, partial, delivered, invoiced, cancelled
    status VARCHAR(20) DEFAULT 'draft'
        CHECK (status IN ('draft', 'confirmed', 'partial', 'delivered', 'invoiced', 'cancelled')),

    -- Conditions
    payment_terms TEXT,
    notes TEXT,
    internal_notes TEXT,

    -- Références externes
    customer_po_number VARCHAR(100), -- N° de commande client

    -- Template
    template_id INTEGER REFERENCES invoice_templates(id),

    -- Multi-tenant
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    created_by INTEGER REFERENCES users(id),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Lignes de commande
CREATE TABLE IF NOT EXISTS purchase_order_items (
    id SERIAL PRIMARY KEY,
    purchase_order_id INTEGER REFERENCES purchase_orders(id) ON DELETE CASCADE,

    product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
    description VARCHAR(500) NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL DEFAULT 1,
    unit VARCHAR(20) DEFAULT 'unité',
    unit_price DECIMAL(12, 2) NOT NULL,

    -- Remise par ligne
    discount_percent DECIMAL(5, 2) DEFAULT 0,
    discount_amount DECIMAL(12, 2) DEFAULT 0,

    -- TVA spécifique par ligne
    tax_rate DECIMAL(5, 2),

    -- Totaux
    subtotal DECIMAL(12, 2) NOT NULL,
    total_price DECIMAL(12, 2) NOT NULL,

    -- Livraison
    quantity_delivered DECIMAL(10, 2) DEFAULT 0,
    quantity_remaining DECIMAL(10, 2) GENERATED ALWAYS AS (quantity - quantity_delivered) STORED,

    -- Position
    sort_order INTEGER DEFAULT 0,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- BONS DE LIVRAISON (Delivery Notes)
-- ==========================================

CREATE TABLE IF NOT EXISTS delivery_notes (
    id SERIAL PRIMARY KEY,

    -- Numérotation
    delivery_number VARCHAR(50) UNIQUE NOT NULL,

    -- Références
    purchase_order_id INTEGER REFERENCES purchase_orders(id) ON DELETE SET NULL,
    customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    invoice_id INTEGER REFERENCES invoices(id) ON DELETE SET NULL,

    -- Dates
    delivery_date DATE NOT NULL DEFAULT CURRENT_DATE,
    shipped_date DATE,

    -- Transporteur
    carrier_name VARCHAR(100),
    tracking_number VARCHAR(100),
    shipping_method VARCHAR(50),

    -- Adresse de livraison
    shipping_address TEXT,
    shipping_contact VARCHAR(255),
    shipping_phone VARCHAR(50),

    -- Poids et colis
    total_weight DECIMAL(10, 2),
    weight_unit VARCHAR(10) DEFAULT 'kg',
    package_count INTEGER DEFAULT 1,

    -- Statut: draft, shipped, in_transit, delivered, returned, cancelled
    status VARCHAR(20) DEFAULT 'draft'
        CHECK (status IN ('draft', 'shipped', 'in_transit', 'delivered', 'returned', 'cancelled')),

    -- Signature client
    signed_by VARCHAR(255),
    signed_at TIMESTAMP WITH TIME ZONE,
    signature_data TEXT, -- Base64
    signature_ip VARCHAR(45),

    -- Notes
    notes TEXT,
    delivery_instructions TEXT,

    -- Multi-tenant
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    created_by INTEGER REFERENCES users(id),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Lignes de livraison
CREATE TABLE IF NOT EXISTS delivery_note_items (
    id SERIAL PRIMARY KEY,
    delivery_note_id INTEGER REFERENCES delivery_notes(id) ON DELETE CASCADE,

    -- Référence à la ligne de commande
    purchase_order_item_id INTEGER REFERENCES purchase_order_items(id) ON DELETE SET NULL,

    product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
    description VARCHAR(500) NOT NULL,

    -- Quantités
    quantity_ordered DECIMAL(10, 2),
    quantity_delivered DECIMAL(10, 2) NOT NULL,
    quantity_returned DECIMAL(10, 2) DEFAULT 0,

    -- Lot/Série (traçabilité)
    lot_number VARCHAR(50),
    serial_numbers TEXT, -- Liste séparée par virgules

    -- État
    condition VARCHAR(20) DEFAULT 'good'
        CHECK (condition IN ('good', 'damaged', 'partial')),
    condition_notes TEXT,

    -- Position
    sort_order INTEGER DEFAULT 0,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- INDEX
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_purchase_orders_customer ON purchase_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_quote ON purchase_orders(quote_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_date ON purchase_orders(order_date);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_org ON purchase_orders(organization_id);
CREATE INDEX IF NOT EXISTS idx_po_items_order ON purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_po_items_product ON purchase_order_items(product_id);

CREATE INDEX IF NOT EXISTS idx_delivery_notes_order ON delivery_notes(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_customer ON delivery_notes(customer_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_invoice ON delivery_notes(invoice_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_status ON delivery_notes(status);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_date ON delivery_notes(delivery_date);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_org ON delivery_notes(organization_id);
CREATE INDEX IF NOT EXISTS idx_dn_items_note ON delivery_note_items(delivery_note_id);

-- ==========================================
-- TRIGGERS
-- ==========================================

-- Trigger pour mettre à jour les totaux du bon de commande
CREATE OR REPLACE FUNCTION update_purchase_order_totals()
RETURNS TRIGGER AS $$
DECLARE
    v_subtotal DECIMAL(12, 2);
    v_order RECORD;
BEGIN
    -- Récupérer le bon de commande
    SELECT * INTO v_order FROM purchase_orders
    WHERE id = COALESCE(NEW.purchase_order_id, OLD.purchase_order_id);

    -- Calculer le sous-total
    SELECT COALESCE(SUM(total_price), 0) INTO v_subtotal
    FROM purchase_order_items
    WHERE purchase_order_id = v_order.id;

    -- Mettre à jour
    UPDATE purchase_orders SET
        subtotal = v_subtotal,
        tax_amount = (v_subtotal - COALESCE(discount_amount, 0) + COALESCE(shipping_cost, 0)) * (tax_rate / 100),
        total_amount = (v_subtotal - COALESCE(discount_amount, 0) + COALESCE(shipping_cost, 0)) * (1 + tax_rate / 100),
        updated_at = NOW()
    WHERE id = v_order.id;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_po_totals ON purchase_order_items;
CREATE TRIGGER trigger_update_po_totals
    AFTER INSERT OR UPDATE OR DELETE ON purchase_order_items
    FOR EACH ROW
    EXECUTE FUNCTION update_purchase_order_totals();

-- Trigger pour mettre à jour les quantités livrées sur le BC
CREATE OR REPLACE FUNCTION update_po_delivered_quantities()
RETURNS TRIGGER AS $$
BEGIN
    -- Mettre à jour la quantité livrée sur la ligne de commande
    IF NEW.purchase_order_item_id IS NOT NULL THEN
        UPDATE purchase_order_items SET
            quantity_delivered = COALESCE((
                SELECT SUM(quantity_delivered)
                FROM delivery_note_items
                WHERE purchase_order_item_id = NEW.purchase_order_item_id
            ), 0)
        WHERE id = NEW.purchase_order_item_id;

        -- Mettre à jour le statut du BC
        UPDATE purchase_orders SET
            status = CASE
                WHEN (SELECT SUM(quantity_remaining) FROM purchase_order_items WHERE purchase_order_id = purchase_orders.id) = 0 THEN 'delivered'
                WHEN (SELECT SUM(quantity_delivered) FROM purchase_order_items WHERE purchase_order_id = purchase_orders.id) > 0 THEN 'partial'
                ELSE status
            END
        WHERE id = (SELECT purchase_order_id FROM purchase_order_items WHERE id = NEW.purchase_order_item_id);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_po_delivered ON delivery_note_items;
CREATE TRIGGER trigger_update_po_delivered
    AFTER INSERT OR UPDATE ON delivery_note_items
    FOR EACH ROW
    EXECUTE FUNCTION update_po_delivered_quantities();

-- ==========================================
-- VUES
-- ==========================================

-- Vue des commandes en attente de livraison
CREATE OR REPLACE VIEW pending_deliveries AS
SELECT
    po.id,
    po.order_number,
    po.order_date,
    po.expected_delivery_date,
    po.status,
    c.name as customer_name,
    po.shipping_address,
    po.total_amount,
    (SELECT COUNT(*) FROM purchase_order_items WHERE purchase_order_id = po.id AND quantity_remaining > 0) as pending_items,
    (SELECT SUM(quantity_remaining) FROM purchase_order_items WHERE purchase_order_id = po.id) as total_pending_qty
FROM purchase_orders po
LEFT JOIN customers c ON po.customer_id = c.id
WHERE po.status IN ('confirmed', 'partial')
  AND po.deleted_at IS NULL
ORDER BY po.expected_delivery_date NULLS LAST, po.order_date;

-- Commentaires
COMMENT ON TABLE purchase_orders IS 'Bons de commande clients';
COMMENT ON TABLE delivery_notes IS 'Bons de livraison';
COMMENT ON VIEW pending_deliveries IS 'Commandes en attente de livraison';
