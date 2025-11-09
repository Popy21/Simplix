-- Migration 024: Module Gestion de Stock
-- Inventaire, Mouvements stock, Bons de commande, Bons de livraison, Multi-dépôts

-- ============================================
-- 1. ENTREPÔTS / DÉPÔTS
-- ============================================
CREATE TABLE IF NOT EXISTS warehouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Informations
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    warehouse_type VARCHAR(50), -- 'main', 'secondary', 'retail', 'virtual'

    -- Adresse
    address TEXT,
    city VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'France',

    -- Contact
    manager_name VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),

    -- État
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,

    -- Métadonnées
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_warehouses_org ON warehouses(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_warehouses_active ON warehouses(is_active) WHERE deleted_at IS NULL;

-- ============================================
-- 2. STOCK PAR PRODUIT/DÉPÔT
-- ============================================
CREATE TABLE IF NOT EXISTS inventory_levels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,

    -- Quantités
    quantity_on_hand DECIMAL(15,3) DEFAULT 0, -- En stock
    quantity_reserved DECIMAL(15,3) DEFAULT 0, -- Réservé (commandes en cours)
    quantity_available DECIMAL(15,3) DEFAULT 0, -- Disponible = on_hand - reserved

    -- Seuils
    reorder_point DECIMAL(15,3), -- Point de réapprovisionnement
    reorder_quantity DECIMAL(15,3), -- Quantité à recommander
    minimum_stock DECIMAL(15,3) DEFAULT 0,
    maximum_stock DECIMAL(15,3),

    -- Coûts
    unit_cost DECIMAL(15,2), -- Coût unitaire moyen pondéré
    total_value DECIMAL(15,2), -- Valeur totale du stock

    -- Localisation dans entrepôt
    bin_location VARCHAR(100), -- Ex: "A1-B3-C5"
    aisle VARCHAR(50),
    shelf VARCHAR(50),

    -- Métadonnées
    last_counted_at TIMESTAMP,
    last_movement_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(product_id, warehouse_id, organization_id)
);

CREATE INDEX idx_inventory_org ON inventory_levels(organization_id);
CREATE INDEX idx_inventory_product ON inventory_levels(product_id);
CREATE INDEX idx_inventory_warehouse ON inventory_levels(warehouse_id);
CREATE INDEX idx_inventory_low_stock ON inventory_levels(product_id)
    WHERE quantity_available <= reorder_point;

-- Trigger: Calculer quantité disponible
CREATE OR REPLACE FUNCTION calculate_available_quantity()
RETURNS TRIGGER AS $$
BEGIN
    NEW.quantity_available := NEW.quantity_on_hand - COALESCE(NEW.quantity_reserved, 0);
    NEW.total_value := NEW.quantity_on_hand * COALESCE(NEW.unit_cost, 0);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_available_quantity
BEFORE INSERT OR UPDATE ON inventory_levels
FOR EACH ROW
EXECUTE FUNCTION calculate_available_quantity();

-- ============================================
-- 3. MOUVEMENTS DE STOCK
-- ============================================
CREATE TYPE movement_type AS ENUM (
    'purchase',          -- Achat fournisseur
    'sale',              -- Vente client
    'adjustment',        -- Ajustement inventaire
    'transfer',          -- Transfert entre dépôts
    'return',            -- Retour
    'damage',            -- Perte/Casse
    'production',        -- Production/Assemblage
    'consumption'        -- Consommation (matières premières)
);

CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Produit et entrepôt
    product_id UUID NOT NULL REFERENCES products(id),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id),

    -- Mouvement
    movement_type movement_type NOT NULL,
    movement_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    quantity DECIMAL(15,3) NOT NULL, -- Positif = entrée, Négatif = sortie
    unit_cost DECIMAL(15,2),

    -- Référence document source
    reference_type VARCHAR(50), -- 'purchase_order', 'sales_order', 'transfer', etc.
    reference_id UUID,
    reference_number VARCHAR(100),

    -- Pour transferts
    from_warehouse_id UUID REFERENCES warehouses(id),
    to_warehouse_id UUID REFERENCES warehouses(id),

    -- Utilisateur
    created_by UUID REFERENCES users(id),

    -- Métadonnées
    reason TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_movements_org ON stock_movements(organization_id);
CREATE INDEX idx_movements_product ON stock_movements(product_id);
CREATE INDEX idx_movements_warehouse ON stock_movements(warehouse_id);
CREATE INDEX idx_movements_date ON stock_movements(movement_date);
CREATE INDEX idx_movements_type ON stock_movements(movement_type);
CREATE INDEX idx_movements_reference ON stock_movements(reference_type, reference_id);

-- Trigger: Mettre à jour inventory_levels lors d'un mouvement
CREATE OR REPLACE FUNCTION update_inventory_on_movement()
RETURNS TRIGGER AS $$
DECLARE
    current_qty DECIMAL(15,3);
    current_value DECIMAL(15,2);
    new_avg_cost DECIMAL(15,2);
BEGIN
    -- Récupérer quantité actuelle
    SELECT quantity_on_hand, total_value
    INTO current_qty, current_value
    FROM inventory_levels
    WHERE product_id = NEW.product_id
      AND warehouse_id = NEW.warehouse_id
      AND organization_id = NEW.organization_id;

    -- Si pas d'enregistrement, créer
    IF current_qty IS NULL THEN
        INSERT INTO inventory_levels (
            organization_id, product_id, warehouse_id,
            quantity_on_hand, unit_cost
        ) VALUES (
            NEW.organization_id, NEW.product_id, NEW.warehouse_id,
            NEW.quantity, NEW.unit_cost
        );
    ELSE
        -- Calculer nouveau coût moyen pondéré (pour entrées uniquement)
        IF NEW.quantity > 0 AND NEW.unit_cost IS NOT NULL THEN
            new_avg_cost := ((current_value + (NEW.quantity * NEW.unit_cost)) / (current_qty + NEW.quantity));
        ELSE
            new_avg_cost := NULL;
        END IF;

        -- Mettre à jour
        UPDATE inventory_levels SET
            quantity_on_hand = quantity_on_hand + NEW.quantity,
            unit_cost = COALESCE(new_avg_cost, unit_cost),
            last_movement_at = NEW.movement_date,
            updated_at = CURRENT_TIMESTAMP
        WHERE product_id = NEW.product_id
          AND warehouse_id = NEW.warehouse_id
          AND organization_id = NEW.organization_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_inventory_on_movement
AFTER INSERT ON stock_movements
FOR EACH ROW
EXECUTE FUNCTION update_inventory_on_movement();

-- ============================================
-- 4. BONS DE COMMANDE FOURNISSEURS
-- ============================================
CREATE TYPE purchase_order_status AS ENUM ('draft', 'sent', 'confirmed', 'partial', 'received', 'cancelled');

CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Numérotation
    order_number VARCHAR(50) UNIQUE,

    -- Fournisseur
    supplier_id UUID NOT NULL REFERENCES suppliers(id),

    -- Dates
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_delivery_date DATE,
    received_date DATE,

    -- Entrepôt de destination
    warehouse_id UUID REFERENCES warehouses(id),

    -- Statut
    status purchase_order_status DEFAULT 'draft',

    -- Lignes commande
    items JSONB NOT NULL, -- [{product_id, quantity, unit_price, tax_rate}]

    -- Montants
    subtotal_amount DECIMAL(15,2) NOT NULL,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    shipping_cost DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL,

    -- Paiement
    payment_terms VARCHAR(100),
    payment_status VARCHAR(50) DEFAULT 'pending',

    -- Documents
    pdf_url TEXT,

    -- Métadonnées
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_purchase_orders_org ON purchase_orders(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX idx_purchase_orders_warehouse ON purchase_orders(warehouse_id);

-- Trigger: Générer numéro bon de commande
CREATE OR REPLACE FUNCTION generate_purchase_order_number()
RETURNS TRIGGER AS $$
DECLARE
    next_number INT;
    year_suffix VARCHAR(4);
BEGIN
    year_suffix := TO_CHAR(NEW.order_date, 'YYYY');

    SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 'BC-' || year_suffix || '-([0-9]+)') AS INT)), 0) + 1
    INTO next_number
    FROM purchase_orders
    WHERE organization_id = NEW.organization_id
      AND order_number LIKE 'BC-' || year_suffix || '%';

    NEW.order_number := 'BC-' || year_suffix || '-' || LPAD(next_number::TEXT, 5, '0');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_purchase_order_number
BEFORE INSERT ON purchase_orders
FOR EACH ROW
WHEN (NEW.order_number IS NULL OR NEW.order_number = '')
EXECUTE FUNCTION generate_purchase_order_number();

-- ============================================
-- 5. RÉCEPTIONS FOURNISSEURS
-- ============================================
CREATE TABLE IF NOT EXISTS purchase_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id),

    -- Réception
    receipt_number VARCHAR(50) UNIQUE,
    receipt_date DATE NOT NULL DEFAULT CURRENT_DATE,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id),

    -- Lignes reçues
    items JSONB NOT NULL, -- [{product_id, quantity_ordered, quantity_received}]

    -- Qualité
    has_issues BOOLEAN DEFAULT false,
    issues_description TEXT,

    -- Métadonnées
    received_by UUID REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_receipts_org ON purchase_receipts(organization_id);
CREATE INDEX idx_receipts_po ON purchase_receipts(purchase_order_id);
CREATE INDEX idx_receipts_warehouse ON purchase_receipts(warehouse_id);

-- ============================================
-- 6. BONS DE LIVRAISON CLIENTS
-- ============================================
CREATE TYPE delivery_status AS ENUM ('draft', 'preparing', 'packed', 'shipped', 'delivered', 'cancelled');

CREATE TABLE IF NOT EXISTS delivery_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Numérotation
    delivery_number VARCHAR(50) UNIQUE,

    -- Lié à commande/facture
    invoice_id UUID REFERENCES invoices(id),
    order_id UUID, -- Référence générique

    -- Client
    customer_id UUID REFERENCES contacts(id),
    company_id UUID REFERENCES companies(id),

    -- Dates
    delivery_date DATE NOT NULL DEFAULT CURRENT_DATE,
    shipped_date DATE,
    delivered_date DATE,

    -- Entrepôt source
    warehouse_id UUID REFERENCES warehouses(id),

    -- Statut
    status delivery_status DEFAULT 'draft',

    -- Lignes livraison
    items JSONB NOT NULL, -- [{product_id, quantity, serial_numbers}]

    -- Adresse livraison
    delivery_address TEXT,
    delivery_city VARCHAR(100),
    delivery_postal_code VARCHAR(20),
    delivery_country VARCHAR(100),

    -- Transport
    carrier VARCHAR(100),
    tracking_number VARCHAR(100),
    shipping_method VARCHAR(100),

    -- Documents
    pdf_url TEXT,
    signature_url TEXT, -- Signature du destinataire

    -- Métadonnées
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_delivery_notes_org ON delivery_notes(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_delivery_notes_customer ON delivery_notes(customer_id);
CREATE INDEX idx_delivery_notes_invoice ON delivery_notes(invoice_id);
CREATE INDEX idx_delivery_notes_status ON delivery_notes(status);

-- Trigger: Générer numéro bon de livraison
CREATE OR REPLACE FUNCTION generate_delivery_number()
RETURNS TRIGGER AS $$
DECLARE
    next_number INT;
    year_suffix VARCHAR(4);
BEGIN
    year_suffix := TO_CHAR(NEW.delivery_date, 'YYYY');

    SELECT COALESCE(MAX(CAST(SUBSTRING(delivery_number FROM 'BL-' || year_suffix || '-([0-9]+)') AS INT)), 0) + 1
    INTO next_number
    FROM delivery_notes
    WHERE organization_id = NEW.organization_id
      AND delivery_number LIKE 'BL-' || year_suffix || '%';

    NEW.delivery_number := 'BL-' || year_suffix || '-' || LPAD(next_number::TEXT, 5, '0');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_delivery_number
BEFORE INSERT ON delivery_notes
FOR EACH ROW
WHEN (NEW.delivery_number IS NULL OR NEW.delivery_number = '')
EXECUTE FUNCTION generate_delivery_number();

-- ============================================
-- 7. VARIANTES PRODUITS
-- ============================================
CREATE TABLE IF NOT EXISTS product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,

    -- Variante
    sku VARCHAR(100) UNIQUE,
    variant_name VARCHAR(255), -- Ex: "Taille M, Couleur Bleu"

    -- Attributs
    attributes JSONB, -- {size: 'M', color: 'Blue', material: 'Cotton'}

    -- Prix
    price DECIMAL(15,2),
    cost DECIMAL(15,2),

    -- Stock
    quantity_on_hand DECIMAL(15,3) DEFAULT 0,

    -- Images
    image_url TEXT,

    -- État
    is_active BOOLEAN DEFAULT true,

    -- Métadonnées
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_variants_org ON product_variants(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_variants_product ON product_variants(product_id);
CREATE INDEX idx_variants_sku ON product_variants(sku);

-- ============================================
-- 8. VUES UTILES
-- ============================================

-- Vue: Stock faible (à réapprovisionner)
CREATE OR REPLACE VIEW v_low_stock_products AS
SELECT
    il.product_id,
    p.name as product_name,
    p.sku,
    il.warehouse_id,
    w.name as warehouse_name,
    il.quantity_available,
    il.reorder_point,
    il.reorder_quantity,
    il.quantity_on_hand,
    il.quantity_reserved
FROM inventory_levels il
JOIN products p ON p.id = il.product_id
JOIN warehouses w ON w.id = il.warehouse_id
WHERE il.quantity_available <= il.reorder_point
  AND p.deleted_at IS NULL
ORDER BY il.quantity_available ASC;

-- Vue: Valeur totale du stock par entrepôt
CREATE OR REPLACE VIEW v_warehouse_inventory_value AS
SELECT
    w.id as warehouse_id,
    w.organization_id,
    w.name as warehouse_name,
    COUNT(DISTINCT il.product_id) as product_count,
    SUM(il.quantity_on_hand) as total_quantity,
    SUM(il.total_value) as total_value
FROM warehouses w
LEFT JOIN inventory_levels il ON il.warehouse_id = w.id
WHERE w.deleted_at IS NULL
GROUP BY w.id, w.organization_id, w.name;

-- ============================================
-- Commentaires tables
-- ============================================
COMMENT ON TABLE warehouses IS 'Entrepôts et dépôts de stockage';
COMMENT ON TABLE inventory_levels IS 'Niveaux de stock par produit et entrepôt';
COMMENT ON TABLE stock_movements IS 'Historique des mouvements de stock';
COMMENT ON TABLE purchase_orders IS 'Bons de commande fournisseurs';
COMMENT ON TABLE purchase_receipts IS 'Réceptions de marchandises';
COMMENT ON TABLE delivery_notes IS 'Bons de livraison clients';
COMMENT ON TABLE product_variants IS 'Variantes de produits (taille, couleur, etc.)';
