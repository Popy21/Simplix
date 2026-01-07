-- Migration 032: Système de relances automatiques
-- Description: Gestion automatique des relances de paiement
-- Author: Claude Code
-- Date: 2025-01-07

-- Configuration des relances par défaut
CREATE TABLE IF NOT EXISTS reminder_settings (
    id SERIAL PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

    -- Activation
    enabled BOOLEAN DEFAULT true,

    -- Relance 1
    reminder_1_enabled BOOLEAN DEFAULT true,
    reminder_1_days INTEGER DEFAULT 7, -- Jours après échéance
    reminder_1_subject VARCHAR(255) DEFAULT 'Rappel de paiement - Facture {invoice_number}',
    reminder_1_template TEXT,

    -- Relance 2
    reminder_2_enabled BOOLEAN DEFAULT true,
    reminder_2_days INTEGER DEFAULT 15,
    reminder_2_subject VARCHAR(255) DEFAULT 'Second rappel - Facture {invoice_number}',
    reminder_2_template TEXT,

    -- Relance 3 (finale)
    reminder_3_enabled BOOLEAN DEFAULT true,
    reminder_3_days INTEGER DEFAULT 30,
    reminder_3_subject VARCHAR(255) DEFAULT 'Dernier rappel avant mise en recouvrement - Facture {invoice_number}',
    reminder_3_template TEXT,

    -- Mise en demeure
    legal_notice_enabled BOOLEAN DEFAULT false,
    legal_notice_days INTEGER DEFAULT 45,
    legal_notice_subject VARCHAR(255) DEFAULT 'Mise en demeure de payer - Facture {invoice_number}',
    legal_notice_template TEXT,

    -- Options
    include_pdf BOOLEAN DEFAULT true,
    cc_email VARCHAR(255), -- Copie à cette adresse
    exclude_weekends BOOLEAN DEFAULT true, -- Ne pas envoyer le week-end

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des relances envoyées
CREATE TABLE IF NOT EXISTS payment_reminders (
    id SERIAL PRIMARY KEY,

    invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
    customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,

    -- Type de relance
    reminder_type VARCHAR(20) NOT NULL CHECK (reminder_type IN ('first', 'second', 'final', 'legal')),
    reminder_number INTEGER DEFAULT 1, -- 1, 2, 3, 4 (mise en demeure)

    -- Détails
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    email_to VARCHAR(255) NOT NULL,
    subject VARCHAR(255),

    -- Statut
    status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('pending', 'sent', 'failed', 'opened', 'paid')),
    email_log_id INTEGER REFERENCES email_logs(id) ON DELETE SET NULL,

    -- Montants au moment de la relance
    amount_due DECIMAL(12, 2),
    days_overdue INTEGER,

    -- Réponse client
    customer_response TEXT,
    response_date TIMESTAMP WITH TIME ZONE,

    -- Multi-tenant
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Planning des relances à envoyer
CREATE TABLE IF NOT EXISTS reminder_queue (
    id SERIAL PRIMARY KEY,

    invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
    reminder_type VARCHAR(20) NOT NULL,

    scheduled_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'cancelled', 'skipped')),

    processed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,

    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_reminder_settings_org ON reminder_settings(organization_id);
CREATE INDEX IF NOT EXISTS idx_payment_reminders_invoice ON payment_reminders(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_reminders_customer ON payment_reminders(customer_id);
CREATE INDEX IF NOT EXISTS idx_payment_reminders_type ON payment_reminders(reminder_type);
CREATE INDEX IF NOT EXISTS idx_payment_reminders_org ON payment_reminders(organization_id);
CREATE INDEX IF NOT EXISTS idx_reminder_queue_date ON reminder_queue(scheduled_date, status);
CREATE INDEX IF NOT EXISTS idx_reminder_queue_invoice ON reminder_queue(invoice_id);

-- Vue des factures en retard
CREATE OR REPLACE VIEW overdue_invoices AS
SELECT
    i.id,
    i.invoice_number,
    i.customer_id,
    c.name as customer_name,
    c.email as customer_email,
    i.total_amount,
    COALESCE(
        (SELECT SUM(amount) FROM payments WHERE invoice_id = i.id),
        0
    ) as amount_paid,
    i.total_amount - COALESCE(
        (SELECT SUM(amount) FROM payments WHERE invoice_id = i.id),
        0
    ) as amount_due,
    i.due_date,
    CURRENT_DATE - i.due_date::DATE as days_overdue,
    i.status,
    i.organization_id,
    (SELECT COUNT(*) FROM payment_reminders WHERE invoice_id = i.id) as reminders_sent,
    (SELECT MAX(sent_at) FROM payment_reminders WHERE invoice_id = i.id) as last_reminder_date,
    (SELECT reminder_type FROM payment_reminders WHERE invoice_id = i.id ORDER BY sent_at DESC LIMIT 1) as last_reminder_type
FROM invoices i
LEFT JOIN customers c ON i.customer_id = c.id
WHERE i.status IN ('sent', 'overdue', 'partial')
  AND i.due_date < CURRENT_DATE
  AND i.deleted_at IS NULL;

-- Fonction pour planifier les relances d'une facture
CREATE OR REPLACE FUNCTION schedule_invoice_reminders(p_invoice_id INTEGER)
RETURNS void AS $$
DECLARE
    v_invoice RECORD;
    v_settings RECORD;
BEGIN
    -- Récupérer la facture
    SELECT i.*, i.organization_id INTO v_invoice
    FROM invoices i
    WHERE i.id = p_invoice_id;

    IF v_invoice IS NULL THEN
        RETURN;
    END IF;

    -- Récupérer les paramètres de relance
    SELECT * INTO v_settings
    FROM reminder_settings
    WHERE organization_id = v_invoice.organization_id
    LIMIT 1;

    -- Si pas de paramètres, utiliser les valeurs par défaut
    IF v_settings IS NULL THEN
        v_settings := ROW(
            1, v_invoice.organization_id, true,
            true, 7, NULL, NULL,
            true, 15, NULL, NULL,
            true, 30, NULL, NULL,
            false, 45, NULL, NULL,
            true, NULL, true, NOW(), NOW()
        );
    END IF;

    -- Supprimer les relances en attente existantes
    DELETE FROM reminder_queue
    WHERE invoice_id = p_invoice_id AND status = 'pending';

    -- Planifier les relances si activées
    IF v_settings.enabled AND v_settings.reminder_1_enabled THEN
        INSERT INTO reminder_queue (invoice_id, reminder_type, scheduled_date, organization_id)
        VALUES (p_invoice_id, 'first', v_invoice.due_date + v_settings.reminder_1_days, v_invoice.organization_id)
        ON CONFLICT DO NOTHING;
    END IF;

    IF v_settings.enabled AND v_settings.reminder_2_enabled THEN
        INSERT INTO reminder_queue (invoice_id, reminder_type, scheduled_date, organization_id)
        VALUES (p_invoice_id, 'second', v_invoice.due_date + v_settings.reminder_2_days, v_invoice.organization_id)
        ON CONFLICT DO NOTHING;
    END IF;

    IF v_settings.enabled AND v_settings.reminder_3_enabled THEN
        INSERT INTO reminder_queue (invoice_id, reminder_type, scheduled_date, organization_id)
        VALUES (p_invoice_id, 'final', v_invoice.due_date + v_settings.reminder_3_days, v_invoice.organization_id)
        ON CONFLICT DO NOTHING;
    END IF;

    IF v_settings.enabled AND v_settings.legal_notice_enabled THEN
        INSERT INTO reminder_queue (invoice_id, reminder_type, scheduled_date, organization_id)
        VALUES (p_invoice_id, 'legal', v_invoice.due_date + v_settings.legal_notice_days, v_invoice.organization_id)
        ON CONFLICT DO NOTHING;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour planifier automatiquement les relances à la création de facture
CREATE OR REPLACE FUNCTION trigger_schedule_reminders()
RETURNS TRIGGER AS $$
BEGIN
    -- Planifier les relances uniquement pour les factures envoyées
    IF NEW.status = 'sent' AND (TG_OP = 'INSERT' OR OLD.status != 'sent') THEN
        PERFORM schedule_invoice_reminders(NEW.id);
    END IF;

    -- Annuler les relances si facture payée
    IF NEW.status = 'paid' THEN
        UPDATE reminder_queue
        SET status = 'cancelled'
        WHERE invoice_id = NEW.id AND status = 'pending';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_invoice_reminders ON invoices;
CREATE TRIGGER trigger_invoice_reminders
    AFTER INSERT OR UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION trigger_schedule_reminders();

-- Paramètres par défaut (sera inséré au premier démarrage)
-- INSERT INTO reminder_settings (organization_id) SELECT id FROM organizations LIMIT 1 ON CONFLICT DO NOTHING;

-- Commentaires
COMMENT ON TABLE reminder_settings IS 'Configuration des relances automatiques par organisation';
COMMENT ON TABLE payment_reminders IS 'Historique des relances envoyées';
COMMENT ON TABLE reminder_queue IS 'File d''attente des relances planifiées';
COMMENT ON VIEW overdue_invoices IS 'Vue des factures en retard de paiement';
