-- Migration 005: Facturation (Invoices & Payments)
-- Description: Tables pour la gestion complète de la facturation avec TVA

-- Table des factures
CREATE TABLE IF NOT EXISTS invoices (
    id SERIAL PRIMARY KEY,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    
    -- Dates
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    paid_date DATE,
    
    -- Statuts: draft, sent, paid, overdue, cancelled
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    
    -- Montants
    subtotal_ht DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    total_vat DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    total_ttc DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    
    -- Paiement
    payment_method VARCHAR(50), -- card, transfer, check, cash
    payment_reference VARCHAR(100),
    
    -- Notes et conditions
    notes TEXT,
    terms TEXT,
    
    -- Métadonnées
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Contraintes
    CONSTRAINT check_invoice_status CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
    CONSTRAINT check_payment_method CHECK (payment_method IS NULL OR payment_method IN ('card', 'transfer', 'check', 'cash')),
    CONSTRAINT check_amounts CHECK (subtotal_ht >= 0 AND total_vat >= 0 AND total_ttc >= 0),
    CONSTRAINT check_due_date CHECK (due_date >= invoice_date),
    CONSTRAINT check_paid_date CHECK (paid_date IS NULL OR paid_date >= invoice_date)
);

-- Table des lignes de facture
CREATE TABLE IF NOT EXISTS invoice_items (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
    
    -- Description de la ligne
    description TEXT NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL DEFAULT 1.00,
    unit_price DECIMAL(12, 2) NOT NULL,
    
    -- TVA
    vat_rate DECIMAL(5, 2) NOT NULL DEFAULT 20.00, -- Taux de TVA en %
    vat_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00, -- Montant de TVA
    
    -- Montants
    subtotal DECIMAL(12, 2) NOT NULL, -- quantity * unit_price
    total DECIMAL(12, 2) NOT NULL, -- subtotal + vat_amount
    
    -- Ordre d'affichage
    line_order INTEGER NOT NULL DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Contraintes
    CONSTRAINT check_quantity CHECK (quantity > 0),
    CONSTRAINT check_unit_price CHECK (unit_price >= 0),
    CONSTRAINT check_vat_rate CHECK (vat_rate >= 0 AND vat_rate <= 100),
    CONSTRAINT check_item_amounts CHECK (subtotal >= 0 AND vat_amount >= 0 AND total >= 0)
);

-- Table des paiements
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    
    -- Informations du paiement
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount DECIMAL(12, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL, -- card, transfer, check, cash
    
    -- Références
    reference VARCHAR(100), -- Numéro de chèque, référence virement, etc.
    transaction_id VARCHAR(100), -- ID de transaction bancaire
    
    -- Notes
    notes TEXT,
    
    -- Métadonnées
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Contraintes
    CONSTRAINT check_payment_amount CHECK (amount > 0),
    CONSTRAINT check_payment_method_value CHECK (payment_method IN ('card', 'transfer', 'check', 'cash'))
);

-- Table des relances
CREATE TABLE IF NOT EXISTS invoice_reminders (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    
    -- Informations de la relance
    reminder_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reminder_type VARCHAR(20) NOT NULL, -- email, phone, sms
    
    -- Contenu
    subject VARCHAR(255),
    message TEXT,
    
    -- Statut
    sent BOOLEAN DEFAULT false,
    sent_at TIMESTAMP,
    
    -- Métadonnées
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Contraintes
    CONSTRAINT check_reminder_type CHECK (reminder_type IN ('email', 'phone', 'sms'))
);

-- Index pour les performances
CREATE INDEX idx_invoices_customer ON invoices(customer_id);
CREATE INDEX idx_invoices_user ON invoices(user_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_invoice_date ON invoices(invoice_date);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
CREATE INDEX idx_invoices_number ON invoices(invoice_number);

CREATE INDEX idx_invoice_items_invoice ON invoice_items(invoice_id);
CREATE INDEX idx_invoice_items_product ON invoice_items(product_id);

CREATE INDEX idx_payments_invoice ON payments(invoice_id);
CREATE INDEX idx_payments_date ON payments(payment_date);

CREATE INDEX idx_reminders_invoice ON invoice_reminders(invoice_id);
CREATE INDEX idx_reminders_sent ON invoice_reminders(sent);

-- Trigger pour mettre à jour updated_at sur invoices
CREATE OR REPLACE FUNCTION update_invoice_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_invoice_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_invoice_updated_at();

-- Fonction pour calculer les totaux d'une facture
CREATE OR REPLACE FUNCTION calculate_invoice_totals(p_invoice_id INTEGER)
RETURNS void AS $$
DECLARE
    v_subtotal DECIMAL(12, 2);
    v_total_vat DECIMAL(12, 2);
    v_total_ttc DECIMAL(12, 2);
BEGIN
    -- Calculer les totaux depuis les lignes
    SELECT 
        COALESCE(SUM(subtotal), 0),
        COALESCE(SUM(vat_amount), 0),
        COALESCE(SUM(total), 0)
    INTO v_subtotal, v_total_vat, v_total_ttc
    FROM invoice_items
    WHERE invoice_id = p_invoice_id;
    
    -- Mettre à jour la facture
    UPDATE invoices
    SET 
        subtotal_ht = v_subtotal,
        total_vat = v_total_vat,
        total_ttc = v_total_ttc
    WHERE id = p_invoice_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour recalculer les totaux lors de l'ajout/modification/suppression d'une ligne
CREATE OR REPLACE FUNCTION trigger_recalculate_invoice()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM calculate_invoice_totals(OLD.invoice_id);
    ELSE
        -- Calculer les montants de la ligne
        NEW.subtotal = NEW.quantity * NEW.unit_price;
        NEW.vat_amount = NEW.subtotal * (NEW.vat_rate / 100);
        NEW.total = NEW.subtotal + NEW.vat_amount;
        
        PERFORM calculate_invoice_totals(NEW.invoice_id);
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_invoice_item_changes
    AFTER INSERT OR UPDATE OR DELETE ON invoice_items
    FOR EACH ROW
    EXECUTE FUNCTION trigger_recalculate_invoice();

-- Fonction pour mettre à jour le statut 'overdue' automatiquement
CREATE OR REPLACE FUNCTION update_overdue_invoices()
RETURNS void AS $$
BEGIN
    UPDATE invoices
    SET status = 'overdue'
    WHERE status = 'sent'
    AND due_date < CURRENT_DATE
    AND paid_date IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Vue pour les factures avec informations client
CREATE OR REPLACE VIEW v_invoices_with_customer AS
SELECT 
    i.*,
    c.name as customer_name,
    c.email as customer_email,
    c.phone as customer_phone,
    c.company as customer_company,
    u.name as user_name,
    (SELECT COUNT(*) FROM invoice_items WHERE invoice_id = i.id) as items_count,
    (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE invoice_id = i.id) as total_paid,
    (i.total_ttc - COALESCE((SELECT SUM(amount) FROM payments WHERE invoice_id = i.id), 0)) as balance_due
FROM invoices i
JOIN customers c ON i.customer_id = c.id
JOIN users u ON i.user_id = u.id;

-- Vue pour le rapport des paiements
CREATE OR REPLACE VIEW v_payment_summary AS
SELECT 
    DATE_TRUNC('month', payment_date) as month,
    payment_method,
    COUNT(*) as payment_count,
    SUM(amount) as total_amount
FROM payments
GROUP BY DATE_TRUNC('month', payment_date), payment_method
ORDER BY month DESC, payment_method;

-- Données de test (optionnel)
-- Insérer quelques factures de test
INSERT INTO invoices (invoice_number, customer_id, user_id, invoice_date, due_date, status, notes)
SELECT 
    'INV-2024-' || LPAD(generate_series::text, 4, '0'),
    (SELECT id FROM customers ORDER BY RANDOM() LIMIT 1),
    (SELECT id FROM users ORDER BY RANDOM() LIMIT 1),
    CURRENT_DATE - (random() * 90)::integer,
    CURRENT_DATE + (random() * 30)::integer,
    (ARRAY['draft', 'sent', 'paid', 'overdue'])[floor(random() * 4 + 1)],
    'Facture générée automatiquement pour test'
FROM generate_series(1, 10)
WHERE EXISTS (SELECT 1 FROM customers) AND EXISTS (SELECT 1 FROM users);

-- Commentaires pour la documentation
COMMENT ON TABLE invoices IS 'Table principale des factures avec TVA et gestion des paiements';
COMMENT ON TABLE invoice_items IS 'Lignes de facture avec calcul automatique de la TVA';
COMMENT ON TABLE payments IS 'Historique des paiements reçus pour les factures';
COMMENT ON TABLE invoice_reminders IS 'Historique des relances clients pour factures impayées';

COMMENT ON COLUMN invoices.status IS 'Statut: draft (brouillon), sent (envoyée), paid (payée), overdue (en retard), cancelled (annulée)';
COMMENT ON COLUMN invoices.subtotal_ht IS 'Sous-total HT (hors taxes)';
COMMENT ON COLUMN invoices.total_vat IS 'Montant total de la TVA';
COMMENT ON COLUMN invoices.total_ttc IS 'Montant total TTC (toutes taxes comprises)';

COMMENT ON COLUMN invoice_items.vat_rate IS 'Taux de TVA en pourcentage (ex: 20.00 pour 20%)';
COMMENT ON COLUMN invoice_items.vat_amount IS 'Montant de TVA calculé automatiquement';
