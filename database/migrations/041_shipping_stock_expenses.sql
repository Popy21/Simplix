-- Migration 041: Frais de port, Gestion stock et Notes de frais
-- Description: Transport, suivi des stocks, notes de frais et indemnités kilométriques
-- Author: Claude Code
-- Date: 2025-01-07

-- ==========================================
-- FRAIS DE PORT
-- ==========================================

-- Ajouter les frais de port aux devis
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS shipping_cost DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS shipping_method VARCHAR(100);
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS shipping_carrier VARCHAR(100);
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS shipping_notes TEXT;

-- Ajouter les frais de port aux factures
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS shipping_cost DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS shipping_method VARCHAR(100);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS shipping_carrier VARCHAR(100);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS shipping_notes TEXT;

-- Table des tarifs de livraison
CREATE TABLE IF NOT EXISTS shipping_rates (
    id SERIAL PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

    name VARCHAR(100) NOT NULL,
    carrier VARCHAR(100),
    description TEXT,

    -- Type de calcul
    calculation_type VARCHAR(20) DEFAULT 'fixed'
        CHECK (calculation_type IN ('fixed', 'weight', 'amount', 'free_above')),

    -- Tarif fixe
    fixed_rate DECIMAL(12, 2),

    -- Par poids
    rate_per_kg DECIMAL(12, 2),
    min_weight DECIMAL(10, 2),
    max_weight DECIMAL(10, 2),

    -- Par montant
    rate_percent DECIMAL(5, 2),

    -- Gratuit au-dessus de
    free_above_amount DECIMAL(12, 2),

    -- Délai de livraison
    delivery_days_min INTEGER,
    delivery_days_max INTEGER,

    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shipping_rates_org ON shipping_rates(organization_id);

-- ==========================================
-- GESTION DES STOCKS
-- ==========================================

-- Ajouter les champs stock aux produits
ALTER TABLE products ADD COLUMN IF NOT EXISTS track_stock BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_quantity DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_min_alert DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_max DECIMAL(10, 2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_location VARCHAR(100);
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_unit VARCHAR(20) DEFAULT 'unité';

-- Table des mouvements de stock
CREATE TABLE IF NOT EXISTS stock_movements (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

    -- Type de mouvement
    movement_type VARCHAR(20) NOT NULL
        CHECK (movement_type IN ('in', 'out', 'adjustment', 'return', 'transfer')),

    -- Quantité (positive pour entrée, négatif pour sortie)
    quantity DECIMAL(10, 2) NOT NULL,
    quantity_before DECIMAL(10, 2),
    quantity_after DECIMAL(10, 2),

    -- Référence
    reference_type VARCHAR(20)
        CHECK (reference_type IN ('purchase_order', 'delivery_note', 'invoice', 'manual', 'inventory')),
    reference_id INTEGER,

    -- Informations
    reason TEXT,
    notes TEXT,
    lot_number VARCHAR(50),
    serial_number VARCHAR(100),

    -- Coût unitaire pour valorisation
    unit_cost DECIMAL(12, 2),
    total_cost DECIMAL(12, 2),

    -- Localisation
    location_from VARCHAR(100),
    location_to VARCHAR(100),

    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_org ON stock_movements(organization_id);

-- Table d'inventaire
CREATE TABLE IF NOT EXISTS inventory_sessions (
    id SERIAL PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

    name VARCHAR(100) NOT NULL,
    description TEXT,

    -- Dates
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,

    -- Statut
    status VARCHAR(20) DEFAULT 'in_progress'
        CHECK (status IN ('draft', 'in_progress', 'completed', 'cancelled')),

    -- Statistiques
    total_products INTEGER DEFAULT 0,
    products_counted INTEGER DEFAULT 0,
    discrepancies_found INTEGER DEFAULT 0,
    total_value_adjustment DECIMAL(15, 2) DEFAULT 0,

    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_counts (
    id SERIAL PRIMARY KEY,
    inventory_session_id INTEGER REFERENCES inventory_sessions(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,

    expected_quantity DECIMAL(10, 2),
    counted_quantity DECIMAL(10, 2),
    difference DECIMAL(10, 2) GENERATED ALWAYS AS (counted_quantity - expected_quantity) STORED,

    notes TEXT,
    counted_by INTEGER REFERENCES users(id),
    counted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_counts_session ON inventory_counts(inventory_session_id);
CREATE INDEX IF NOT EXISTS idx_inventory_counts_product ON inventory_counts(product_id);

-- Trigger pour mettre à jour le stock après un mouvement
CREATE OR REPLACE FUNCTION update_product_stock()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Sauvegarder la quantité avant
        NEW.quantity_before := (SELECT stock_quantity FROM products WHERE id = NEW.product_id);

        -- Mettre à jour le stock
        UPDATE products SET
            stock_quantity = stock_quantity + NEW.quantity,
            updated_at = NOW()
        WHERE id = NEW.product_id;

        -- Calculer la quantité après
        NEW.quantity_after := (SELECT stock_quantity FROM products WHERE id = NEW.product_id);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_stock ON stock_movements;
CREATE TRIGGER trigger_update_stock
    BEFORE INSERT ON stock_movements
    FOR EACH ROW
    EXECUTE FUNCTION update_product_stock();

-- ==========================================
-- NOTES DE FRAIS
-- ==========================================

CREATE TABLE IF NOT EXISTS expense_notes (
    id SERIAL PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

    -- Référence
    expense_number VARCHAR(50) UNIQUE NOT NULL,

    -- Employé
    employee_id INTEGER REFERENCES users(id),
    employee_name VARCHAR(255),

    -- Période
    period_start DATE,
    period_end DATE,

    -- Statut
    status VARCHAR(20) DEFAULT 'draft'
        CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'paid')),

    -- Totaux
    total_amount DECIMAL(12, 2) DEFAULT 0,
    total_km DECIMAL(10, 2) DEFAULT 0,
    total_km_amount DECIMAL(12, 2) DEFAULT 0,

    -- Validation
    submitted_at TIMESTAMP WITH TIME ZONE,
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,

    -- Paiement
    paid_at TIMESTAMP WITH TIME ZONE,
    payment_reference VARCHAR(100),

    notes TEXT,

    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Lignes de notes de frais
CREATE TABLE IF NOT EXISTS expense_note_items (
    id SERIAL PRIMARY KEY,
    expense_note_id INTEGER REFERENCES expense_notes(id) ON DELETE CASCADE,

    -- Type de dépense
    expense_type VARCHAR(50) NOT NULL
        CHECK (expense_type IN (
            'transport', 'fuel', 'toll', 'parking', 'taxi', 'train', 'flight',
            'accommodation', 'meals', 'entertainment', 'supplies', 'phone',
            'internet', 'other', 'km'
        )),

    -- Date et description
    expense_date DATE NOT NULL,
    description TEXT NOT NULL,

    -- Montant
    amount DECIMAL(12, 2),
    currency VARCHAR(3) DEFAULT 'EUR',

    -- Pour les indemnités kilométriques
    km_distance DECIMAL(10, 2),
    km_rate DECIMAL(6, 4), -- Taux par km
    vehicle_type VARCHAR(20), -- car, motorcycle, bike
    vehicle_power VARCHAR(10), -- 3cv, 4cv, 5cv, 6cv, 7cv+

    -- Justificatif
    receipt_url TEXT,
    receipt_filename VARCHAR(255),

    -- Lieu
    departure_location VARCHAR(255),
    arrival_location VARCHAR(255),

    -- Client/Projet associé
    customer_id INTEGER REFERENCES customers(id),
    project_name VARCHAR(255),

    -- Refacturable au client
    is_billable BOOLEAN DEFAULT false,
    billed_invoice_id INTEGER REFERENCES invoices(id),

    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expense_notes_org ON expense_notes(organization_id);
CREATE INDEX IF NOT EXISTS idx_expense_notes_employee ON expense_notes(employee_id);
CREATE INDEX IF NOT EXISTS idx_expense_notes_status ON expense_notes(status);
CREATE INDEX IF NOT EXISTS idx_expense_note_items_note ON expense_note_items(expense_note_id);

-- Barème kilométrique (fiscal français 2024)
CREATE TABLE IF NOT EXISTS km_rates (
    id SERIAL PRIMARY KEY,
    year INTEGER NOT NULL,
    vehicle_type VARCHAR(20) NOT NULL, -- car, motorcycle
    vehicle_power VARCHAR(10), -- pour voitures: 3cv, 4cv, 5cv, 6cv, 7cv+

    -- Barème à 3 tranches
    rate_up_to_5000 DECIMAL(6, 4),  -- Taux jusqu'à 5000 km
    rate_5001_to_20000 DECIMAL(6, 4), -- Taux de 5001 à 20000 km
    rate_above_20000 DECIMAL(6, 4), -- Taux au-delà de 20000 km

    -- Montant fixe à ajouter (pour certaines tranches)
    fixed_amount_5001_20000 DECIMAL(8, 2),

    UNIQUE(year, vehicle_type, vehicle_power)
);

-- Insérer le barème 2024
INSERT INTO km_rates (year, vehicle_type, vehicle_power, rate_up_to_5000, rate_5001_to_20000, rate_above_20000, fixed_amount_5001_20000)
VALUES
    -- Voitures
    (2024, 'car', '3cv', 0.529, 0.316, 0.370, 1065),
    (2024, 'car', '4cv', 0.606, 0.340, 0.407, 1330),
    (2024, 'car', '5cv', 0.636, 0.357, 0.427, 1395),
    (2024, 'car', '6cv', 0.665, 0.374, 0.447, 1457),
    (2024, 'car', '7cv+', 0.697, 0.394, 0.470, 1515),
    -- Motos (>50cc)
    (2024, 'motorcycle', '1-2cv', 0.395, 0.099, 0.000, 891),
    (2024, 'motorcycle', '3-5cv', 0.468, 0.082, 0.000, 1158),
    (2024, 'motorcycle', '6cv+', 0.606, 0.079, 0.000, 1583)
ON CONFLICT (year, vehicle_type, vehicle_power) DO NOTHING;

-- Fonction pour calculer les indemnités km
CREATE OR REPLACE FUNCTION calculate_km_indemnity(
    p_year INTEGER,
    p_vehicle_type VARCHAR,
    p_vehicle_power VARCHAR,
    p_total_km DECIMAL
) RETURNS DECIMAL AS $$
DECLARE
    v_rate RECORD;
    v_amount DECIMAL;
BEGIN
    SELECT * INTO v_rate FROM km_rates
    WHERE year = p_year
      AND vehicle_type = p_vehicle_type
      AND vehicle_power = p_vehicle_power;

    IF NOT FOUND THEN
        -- Taux par défaut
        RETURN p_total_km * 0.603;
    END IF;

    IF p_total_km <= 5000 THEN
        v_amount := p_total_km * v_rate.rate_up_to_5000;
    ELSIF p_total_km <= 20000 THEN
        v_amount := (p_total_km * v_rate.rate_5001_to_20000) + COALESCE(v_rate.fixed_amount_5001_20000, 0);
    ELSE
        v_amount := p_total_km * v_rate.rate_above_20000;
    END IF;

    RETURN ROUND(v_amount, 2);
END;
$$ LANGUAGE plpgsql;

-- Trigger pour recalculer les totaux de la note de frais
CREATE OR REPLACE FUNCTION recalculate_expense_note_totals()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE expense_notes SET
        total_amount = COALESCE((
            SELECT SUM(COALESCE(amount, km_distance * km_rate))
            FROM expense_note_items
            WHERE expense_note_id = COALESCE(NEW.expense_note_id, OLD.expense_note_id)
        ), 0),
        total_km = COALESCE((
            SELECT SUM(km_distance)
            FROM expense_note_items
            WHERE expense_note_id = COALESCE(NEW.expense_note_id, OLD.expense_note_id)
              AND expense_type = 'km'
        ), 0),
        total_km_amount = COALESCE((
            SELECT SUM(km_distance * km_rate)
            FROM expense_note_items
            WHERE expense_note_id = COALESCE(NEW.expense_note_id, OLD.expense_note_id)
              AND expense_type = 'km'
        ), 0),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.expense_note_id, OLD.expense_note_id);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_recalculate_expense_note ON expense_note_items;
CREATE TRIGGER trigger_recalculate_expense_note
    AFTER INSERT OR UPDATE OR DELETE ON expense_note_items
    FOR EACH ROW
    EXECUTE FUNCTION recalculate_expense_note_totals();

-- ==========================================
-- VUES
-- ==========================================

-- Produits en alerte stock
CREATE OR REPLACE VIEW stock_alerts AS
SELECT
    p.id,
    p.name,
    p.sku,
    p.stock_quantity,
    p.stock_min_alert,
    p.stock_location,
    p.organization_id,
    CASE
        WHEN p.stock_quantity <= 0 THEN 'out_of_stock'
        WHEN p.stock_quantity <= p.stock_min_alert THEN 'low_stock'
        ELSE 'ok'
    END as stock_status
FROM products p
WHERE p.track_stock = true
  AND p.deleted_at IS NULL
  AND p.stock_quantity <= p.stock_min_alert
ORDER BY p.stock_quantity ASC;

-- Valorisation du stock
CREATE OR REPLACE VIEW stock_valuation AS
SELECT
    p.organization_id,
    COUNT(*) as total_products,
    SUM(p.stock_quantity) as total_quantity,
    SUM(p.stock_quantity * p.price) as total_value_selling,
    SUM(p.stock_quantity * COALESCE(p.cost_price, p.price * 0.7)) as total_value_cost
FROM products p
WHERE p.track_stock = true
  AND p.deleted_at IS NULL
GROUP BY p.organization_id;

-- Notes de frais par employé
CREATE OR REPLACE VIEW expense_notes_by_employee AS
SELECT
    en.employee_id,
    u.first_name || ' ' || u.last_name as employee_name,
    en.organization_id,
    COUNT(*) as total_notes,
    SUM(en.total_amount) as total_amount,
    SUM(en.total_km) as total_km,
    SUM(en.total_amount) FILTER (WHERE en.status = 'paid') as paid_amount,
    SUM(en.total_amount) FILTER (WHERE en.status IN ('submitted', 'approved')) as pending_amount
FROM expense_notes en
LEFT JOIN users u ON en.employee_id = u.id
GROUP BY en.employee_id, u.first_name, u.last_name, en.organization_id;

-- Commentaires
COMMENT ON TABLE shipping_rates IS 'Grille tarifaire des frais de port';
COMMENT ON TABLE stock_movements IS 'Historique des mouvements de stock';
COMMENT ON TABLE inventory_sessions IS 'Sessions d''inventaire';
COMMENT ON TABLE expense_notes IS 'Notes de frais employés';
COMMENT ON TABLE expense_note_items IS 'Lignes de notes de frais';
COMMENT ON TABLE km_rates IS 'Barème kilométrique fiscal';
COMMENT ON VIEW stock_alerts IS 'Produits en alerte stock';
