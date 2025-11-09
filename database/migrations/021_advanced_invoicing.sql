-- Migration 021: Module Facturation Avancée
-- Factures récurrentes, Avoirs, Relances automatiques, Signature électronique

-- ============================================
-- 1. FACTURES RÉCURRENTES (Abonnements)
-- ============================================
CREATE TYPE recurring_frequency AS ENUM ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'semi_annual', 'annual');
CREATE TYPE recurring_status AS ENUM ('active', 'paused', 'cancelled', 'expired');

CREATE TABLE IF NOT EXISTS recurring_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Référence client
    customer_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,

    -- Paramètres récurrence
    frequency recurring_frequency NOT NULL,
    interval_count INT DEFAULT 1, -- Ex: tous les 2 mois = monthly + interval 2
    start_date DATE NOT NULL,
    end_date DATE, -- NULL = illimité
    next_invoice_date DATE NOT NULL,

    -- Statut
    status recurring_status DEFAULT 'active',
    is_active BOOLEAN DEFAULT true,

    -- Modèle de facture
    invoice_template_id UUID REFERENCES invoice_templates(id),

    -- Données facture
    title VARCHAR(255),
    description TEXT,
    items JSONB NOT NULL, -- Lignes de facturation
    subtotal_amount DECIMAL(15,2) NOT NULL,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL,

    -- Options
    auto_send BOOLEAN DEFAULT true, -- Envoyer automatiquement par email
    payment_terms INT DEFAULT 30, -- Jours avant échéance
    payment_method VARCHAR(50),

    -- Historique
    last_generated_at TIMESTAMP,
    last_invoice_id UUID,
    total_invoices_generated INT DEFAULT 0,

    -- Métadonnées
    notes TEXT,
    metadata JSONB, -- Données custom
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_recurring_invoices_org ON recurring_invoices(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_recurring_invoices_customer ON recurring_invoices(customer_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_recurring_invoices_status ON recurring_invoices(status) WHERE is_active = true;
CREATE INDEX idx_recurring_invoices_next_date ON recurring_invoices(next_invoice_date) WHERE is_active = true;

-- ============================================
-- 2. AVOIRS (Credit Notes)
-- ============================================
CREATE TYPE credit_note_type AS ENUM ('full_refund', 'partial_refund', 'discount', 'error_correction');
CREATE TYPE credit_note_status AS ENUM ('draft', 'issued', 'applied', 'cancelled');

CREATE TABLE IF NOT EXISTS credit_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Référence
    credit_note_number VARCHAR(50) UNIQUE NOT NULL,
    original_invoice_id UUID NOT NULL REFERENCES invoices(id),

    -- Client
    customer_id UUID REFERENCES contacts(id),
    company_id UUID REFERENCES companies(id),

    -- Type et statut
    credit_note_type credit_note_type NOT NULL,
    status credit_note_status DEFAULT 'draft',

    -- Dates
    issue_date DATE NOT NULL,
    applied_date DATE,

    -- Montants
    items JSONB NOT NULL, -- Lignes avoir
    subtotal_amount DECIMAL(15,2) NOT NULL,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL,

    -- Application
    applied_to_invoice_id UUID REFERENCES invoices(id), -- Facture où l'avoir est déduit
    refund_method VARCHAR(50), -- 'bank_transfer', 'credit_balance', 'new_invoice'

    -- Documents
    pdf_url TEXT,

    -- Raison
    reason TEXT NOT NULL,
    notes TEXT,

    -- Métadonnées
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_credit_notes_org ON credit_notes(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_credit_notes_invoice ON credit_notes(original_invoice_id);
CREATE INDEX idx_credit_notes_customer ON credit_notes(customer_id);
CREATE INDEX idx_credit_notes_status ON credit_notes(status);

-- Trigger: Générer numéro avoir automatiquement
CREATE OR REPLACE FUNCTION generate_credit_note_number()
RETURNS TRIGGER AS $$
DECLARE
    next_number INT;
    year_suffix VARCHAR(4);
BEGIN
    year_suffix := TO_CHAR(NEW.issue_date, 'YYYY');

    SELECT COALESCE(MAX(CAST(SUBSTRING(credit_note_number FROM 'AV-' || year_suffix || '-([0-9]+)') AS INT)), 0) + 1
    INTO next_number
    FROM credit_notes
    WHERE organization_id = NEW.organization_id
      AND credit_note_number LIKE 'AV-' || year_suffix || '%';

    NEW.credit_note_number := 'AV-' || year_suffix || '-' || LPAD(next_number::TEXT, 5, '0');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_credit_note_number
BEFORE INSERT ON credit_notes
FOR EACH ROW
WHEN (NEW.credit_note_number IS NULL OR NEW.credit_note_number = '')
EXECUTE FUNCTION generate_credit_note_number();

-- ============================================
-- 3. RELANCES AUTOMATIQUES (Payment Reminders)
-- ============================================
CREATE TYPE reminder_type AS ENUM ('before_due', 'on_due', 'overdue_1', 'overdue_2', 'overdue_3', 'final_notice');
CREATE TYPE reminder_channel AS ENUM ('email', 'sms', 'letter', 'phone');

CREATE TABLE IF NOT EXISTS payment_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Configuration relance
    reminder_type reminder_type NOT NULL,
    days_offset INT NOT NULL, -- Jours avant/après échéance (négatif = avant, positif = après)

    -- Canal
    channel reminder_channel DEFAULT 'email',

    -- Modèle message
    email_subject VARCHAR(255),
    email_body TEXT,
    sms_message TEXT,

    -- Options
    is_active BOOLEAN DEFAULT true,
    auto_send BOOLEAN DEFAULT false, -- Envoyer automatiquement

    -- Métadonnées
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payment_reminders_org ON payment_reminders(organization_id) WHERE is_active = true;
CREATE INDEX idx_payment_reminders_type ON payment_reminders(reminder_type) WHERE is_active = true;

-- Table historique envois
CREATE TABLE IF NOT EXISTS payment_reminder_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Facture concernée
    invoice_id UUID NOT NULL REFERENCES invoices(id),
    reminder_config_id UUID REFERENCES payment_reminders(id),

    -- Type et canal
    reminder_type reminder_type NOT NULL,
    channel reminder_channel NOT NULL,

    -- Statut envoi
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'sent', -- 'sent', 'failed', 'bounced', 'opened', 'clicked'

    -- Destinataire
    recipient_email VARCHAR(255),
    recipient_phone VARCHAR(50),

    -- Contenu
    subject VARCHAR(255),
    message TEXT,

    -- Résultat
    error_message TEXT,
    metadata JSONB,

    -- Métadonnées
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reminder_history_org ON payment_reminder_history(organization_id);
CREATE INDEX idx_reminder_history_invoice ON payment_reminder_history(invoice_id);
CREATE INDEX idx_reminder_history_sent ON payment_reminder_history(sent_at);

-- ============================================
-- 4. SIGNATURES ÉLECTRONIQUES
-- ============================================
CREATE TYPE signature_status AS ENUM ('pending', 'signed', 'declined', 'expired');

CREATE TABLE IF NOT EXISTS document_signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Document signé
    document_type VARCHAR(50) NOT NULL, -- 'invoice', 'quote', 'contract'
    document_id UUID NOT NULL,

    -- Signataire
    signer_name VARCHAR(255) NOT NULL,
    signer_email VARCHAR(255) NOT NULL,
    signer_role VARCHAR(100), -- 'client', 'supplier', 'manager'

    -- Signature
    signature_data TEXT, -- Données signature (base64 SVG ou image)
    signature_method VARCHAR(50), -- 'drawn', 'typed', 'uploaded', 'esign_provider'
    ip_address INET,
    user_agent TEXT,

    -- Statut
    status signature_status DEFAULT 'pending',

    -- Dates
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    signed_at TIMESTAMP,
    expires_at TIMESTAMP,

    -- Token sécurité
    signature_token VARCHAR(255) UNIQUE, -- Token URL signature

    -- Métadonnées
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_signatures_org ON document_signatures(organization_id);
CREATE INDEX idx_signatures_document ON document_signatures(document_type, document_id);
CREATE INDEX idx_signatures_status ON document_signatures(status);
CREATE INDEX idx_signatures_token ON document_signatures(signature_token) WHERE status = 'pending';

-- ============================================
-- 5. FACTURES DE SITUATION (Progress Invoices)
-- ============================================
CREATE TABLE IF NOT EXISTS progress_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Projet/Contrat lié
    project_name VARCHAR(255) NOT NULL,
    contract_amount DECIMAL(15,2) NOT NULL,

    -- Client
    customer_id UUID REFERENCES contacts(id),
    company_id UUID REFERENCES companies(id),

    -- Progression
    sequence_number INT NOT NULL, -- N° situation (1, 2, 3...)
    previous_invoice_id UUID REFERENCES invoices(id),

    -- Pourcentages
    work_completed_percent DECIMAL(5,2) NOT NULL, -- % travaux réalisés
    previous_total_percent DECIMAL(5,2) DEFAULT 0, -- Cumul situations précédentes

    -- Montants
    current_work_amount DECIMAL(15,2) NOT NULL, -- Montant situation actuelle
    previous_total_amount DECIMAL(15,2) DEFAULT 0,
    retention_percent DECIMAL(5,2) DEFAULT 0, -- Retenue de garantie
    retention_amount DECIMAL(15,2) DEFAULT 0,

    -- Facture générée
    invoice_id UUID REFERENCES invoices(id),

    -- Statut
    is_final BOOLEAN DEFAULT false, -- Dernière situation (solde)

    -- Métadonnées
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_progress_invoices_org ON progress_invoices(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_progress_invoices_customer ON progress_invoices(customer_id);
CREATE INDEX idx_progress_invoices_invoice ON progress_invoices(invoice_id);

-- ============================================
-- 6. ACOMPTES (Advance Payments / Deposits)
-- ============================================
CREATE TABLE IF NOT EXISTS advance_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Document lié
    document_type VARCHAR(50) NOT NULL, -- 'quote', 'invoice', 'order'
    document_id UUID NOT NULL,

    -- Client
    customer_id UUID REFERENCES contacts(id),

    -- Acompte
    advance_type VARCHAR(50) NOT NULL, -- 'fixed_amount', 'percentage'
    advance_value DECIMAL(15,2) NOT NULL, -- Montant ou %
    advance_amount DECIMAL(15,2) NOT NULL, -- Montant final

    -- Paiement
    is_paid BOOLEAN DEFAULT false,
    payment_id UUID REFERENCES payments(id),
    paid_at TIMESTAMP,

    -- Application
    is_applied BOOLEAN DEFAULT false, -- Déduit de la facture finale
    applied_to_invoice_id UUID REFERENCES invoices(id),

    -- Facture d'acompte
    advance_invoice_id UUID REFERENCES invoices(id),

    -- Métadonnées
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_advance_payments_org ON advance_payments(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_advance_payments_customer ON advance_payments(customer_id);
CREATE INDEX idx_advance_payments_document ON advance_payments(document_type, document_id);

-- ============================================
-- 7. MENTIONS LÉGALES AUTO (Legal Mentions)
-- ============================================
CREATE TABLE IF NOT EXISTS legal_mentions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Type document
    document_type VARCHAR(50) NOT NULL, -- 'invoice', 'quote', 'credit_note'

    -- Mentions obligatoires France
    company_legal_name VARCHAR(255),
    siret VARCHAR(14),
    siren VARCHAR(9),
    vat_number VARCHAR(20), -- N° TVA intracommunautaire
    ape_code VARCHAR(10), -- Code APE/NAF
    legal_form VARCHAR(100), -- SARL, SAS, etc.
    share_capital DECIMAL(15,2), -- Capital social
    rcs_number VARCHAR(100), -- Immatriculation RCS

    -- Contact légal
    legal_address TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),

    -- Mentions spéciales
    insurance_info TEXT, -- Assurance professionnelle
    mediation_info TEXT, -- Médiateur consommation
    data_protection_info TEXT, -- RGPD

    -- Conditions
    payment_conditions TEXT,
    late_payment_penalty_rate DECIMAL(5,2), -- Pénalités retard (%)
    recovery_fees DECIMAL(10,2), -- Indemnité forfaitaire recouvrement (40€ mini France)

    -- Template
    footer_text TEXT, -- Texte pied de page
    custom_mentions TEXT, -- Mentions custom

    -- Actif
    is_active BOOLEAN DEFAULT true,

    -- Métadonnées
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_legal_mentions_org ON legal_mentions(organization_id) WHERE is_active = true;

-- Insérer mentions légales par défaut depuis company_profile
INSERT INTO legal_mentions (
    organization_id, document_type, company_legal_name, siret, vat_number,
    legal_address, phone, email, payment_conditions, late_payment_penalty_rate, recovery_fees
)
SELECT
    cp.organization_id,
    'invoice',
    cp.company_name,
    cp.siret,
    cp.vat_number,
    CONCAT_WS(', ', cp.address, cp.postal_code, cp.city, cp.country),
    cp.phone,
    cp.email,
    'Paiement à réception de facture. En cas de retard de paiement, seront exigibles, conformément à l''article L 441-6 du code de commerce, une indemnité calculée sur la base de trois fois le taux de l''intérêt légal en vigueur ainsi qu''une indemnité forfaitaire pour frais de recouvrement de 40 euros.',
    10.00, -- 3x taux légal ~10%
    40.00 -- Indemnité forfaitaire France
FROM company_profiles cp
WHERE NOT EXISTS (
    SELECT 1 FROM legal_mentions lm
    WHERE lm.organization_id = cp.organization_id AND lm.document_type = 'invoice'
);

-- ============================================
-- 8. VUES UTILES
-- ============================================

-- Vue: Factures en retard nécessitant relance
CREATE OR REPLACE VIEW v_invoices_requiring_reminder AS
SELECT
    i.id,
    i.organization_id,
    i.invoice_number,
    i.customer_id,
    i.total_amount,
    i.due_date,
    CURRENT_DATE - i.due_date as days_overdue,
    CASE
        WHEN CURRENT_DATE < i.due_date - 7 THEN 'before_due'
        WHEN CURRENT_DATE = i.due_date THEN 'on_due'
        WHEN CURRENT_DATE BETWEEN i.due_date + 1 AND i.due_date + 15 THEN 'overdue_1'
        WHEN CURRENT_DATE BETWEEN i.due_date + 16 AND i.due_date + 30 THEN 'overdue_2'
        WHEN CURRENT_DATE BETWEEN i.due_date + 31 AND i.due_date + 60 THEN 'overdue_3'
        WHEN CURRENT_DATE > i.due_date + 60 THEN 'final_notice'
    END as recommended_reminder_type,
    (SELECT MAX(sent_at) FROM payment_reminder_history prh WHERE prh.invoice_id = i.id) as last_reminder_sent
FROM invoices i
WHERE i.status IN ('sent', 'overdue')
  AND i.deleted_at IS NULL;

-- Vue: Statistiques factures récurrentes
CREATE OR REPLACE VIEW v_recurring_invoices_stats AS
SELECT
    ri.id,
    ri.organization_id,
    ri.status,
    ri.frequency,
    ri.total_invoices_generated,
    ri.total_amount,
    ri.total_amount * 12 / CASE ri.frequency
        WHEN 'monthly' THEN 1
        WHEN 'quarterly' THEN 3
        WHEN 'semi_annual' THEN 6
        WHEN 'annual' THEN 12
        ELSE 1
    END as annual_revenue_estimate
FROM recurring_invoices ri
WHERE ri.deleted_at IS NULL;

-- ============================================
-- Commentaires tables
-- ============================================
COMMENT ON TABLE recurring_invoices IS 'Factures récurrentes pour abonnements et contrats réguliers';
COMMENT ON TABLE credit_notes IS 'Avoirs clients pour remboursements et corrections';
COMMENT ON TABLE payment_reminders IS 'Configuration des relances automatiques impayés';
COMMENT ON TABLE payment_reminder_history IS 'Historique envois de relances';
COMMENT ON TABLE document_signatures IS 'Signatures électroniques des documents';
COMMENT ON TABLE progress_invoices IS 'Factures de situation pour projets BTP/travaux';
COMMENT ON TABLE advance_payments IS 'Acomptes et arrhes';
COMMENT ON TABLE legal_mentions IS 'Mentions légales obligatoires sur documents';
