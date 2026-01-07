-- Migration 036: Mentions légales automatiques pour factures
-- Description: Gestion des mentions obligatoires selon la législation française
-- Author: Claude Code
-- Date: 2025-01-07

-- Table des paramètres de mentions légales
CREATE TABLE IF NOT EXISTS legal_settings (
    id SERIAL PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,

    -- Pénalités de retard (obligatoire depuis 2013)
    late_payment_rate DECIMAL(5, 2) DEFAULT 10.00, -- Taux des pénalités (minimum = 3x taux légal)
    late_payment_mention TEXT DEFAULT 'En cas de retard de paiement, une pénalité de {rate}% par an sera appliquée, ainsi qu''une indemnité forfaitaire de 40€ pour frais de recouvrement (Art. L441-6 du Code de commerce).',

    -- Escompte
    early_payment_discount_enabled BOOLEAN DEFAULT false,
    early_payment_discount_rate DECIMAL(5, 2) DEFAULT 2.00,
    early_payment_discount_days INTEGER DEFAULT 10, -- Jours avant échéance
    early_payment_mention TEXT DEFAULT 'Escompte de {rate}% pour paiement anticipé avant {days} jours.',
    no_discount_mention TEXT DEFAULT 'Pas d''escompte pour paiement anticipé.',

    -- Conditions de règlement
    default_payment_terms INTEGER DEFAULT 30, -- Jours
    payment_terms_mention TEXT DEFAULT 'Règlement à {days} jours à compter de la date de facture.',

    -- TVA
    show_tva_mention BOOLEAN DEFAULT true,
    tva_mention TEXT DEFAULT 'TVA non applicable, art. 293 B du CGI', -- Pour auto-entrepreneurs
    is_subject_to_tva BOOLEAN DEFAULT true,

    -- Assurance professionnelle (obligatoire pour certains métiers)
    has_professional_insurance BOOLEAN DEFAULT false,
    insurance_company VARCHAR(255),
    insurance_policy_number VARCHAR(100),
    insurance_coverage_area TEXT,

    -- Garantie légale (obligatoire pour ventes aux consommateurs)
    show_legal_guarantee BOOLEAN DEFAULT false,
    legal_guarantee_mention TEXT DEFAULT 'Le consommateur bénéficie de la garantie légale de conformité (art. L217-4 et suivants du Code de la consommation) et de la garantie contre les vices cachés (art. 1641 et suivants du Code civil).',

    -- Médiation (obligatoire B2C)
    show_mediation BOOLEAN DEFAULT false,
    mediator_name VARCHAR(255),
    mediator_url VARCHAR(500),
    mediation_mention TEXT,

    -- Autres mentions obligatoires
    custom_mentions TEXT,

    -- RCS/RM
    show_registration_mention BOOLEAN DEFAULT true,
    registration_mention TEXT, -- Ex: "RCS Paris B 123 456 789"

    -- Capital social (si applicable)
    show_capital BOOLEAN DEFAULT false,
    capital_amount DECIMAL(15, 2),
    capital_mention TEXT,

    -- Mentions pour devis
    quote_validity_days INTEGER DEFAULT 30,
    quote_validity_mention TEXT DEFAULT 'Ce devis est valable {days} jours à compter de sa date d''émission.',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ajouter des colonnes aux factures pour les mentions spécifiques
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS late_payment_rate DECIMAL(5, 2);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS early_discount_applied BOOLEAN DEFAULT false;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS early_discount_amount DECIMAL(12, 2);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS custom_legal_mentions TEXT;

-- Vue pour générer automatiquement les mentions légales
CREATE OR REPLACE VIEW invoice_legal_mentions AS
SELECT
    i.id as invoice_id,
    i.invoice_number,

    -- Mention pénalités de retard
    CASE
        WHEN ls.late_payment_rate IS NOT NULL THEN
            REPLACE(
                REPLACE(ls.late_payment_mention, '{rate}', ls.late_payment_rate::TEXT),
                '{indemnity}', '40'
            )
        ELSE 'En cas de retard de paiement, des pénalités seront appliquées conformément à l''article L441-6 du Code de commerce.'
    END as late_payment_mention,

    -- Mention escompte
    CASE
        WHEN ls.early_payment_discount_enabled THEN
            REPLACE(
                REPLACE(ls.early_payment_mention, '{rate}', ls.early_payment_discount_rate::TEXT),
                '{days}', ls.early_payment_discount_days::TEXT
            )
        ELSE COALESCE(ls.no_discount_mention, 'Pas d''escompte pour paiement anticipé.')
    END as early_payment_mention,

    -- Mention conditions de règlement
    REPLACE(
        COALESCE(ls.payment_terms_mention, 'Règlement à {days} jours.'),
        '{days}',
        COALESCE(ls.default_payment_terms, 30)::TEXT
    ) as payment_terms_mention,

    -- Mention TVA
    CASE
        WHEN ls.is_subject_to_tva = false THEN ls.tva_mention
        ELSE NULL
    END as tva_exemption_mention,

    -- Assurance professionnelle
    CASE
        WHEN ls.has_professional_insurance THEN
            'Assurance professionnelle: ' || ls.insurance_company ||
            ' - Contrat n°' || ls.insurance_policy_number ||
            CASE WHEN ls.insurance_coverage_area IS NOT NULL
                THEN ' - Couverture: ' || ls.insurance_coverage_area
                ELSE ''
            END
        ELSE NULL
    END as insurance_mention,

    -- Garantie légale
    CASE WHEN ls.show_legal_guarantee THEN ls.legal_guarantee_mention ELSE NULL END as guarantee_mention,

    -- Médiation
    CASE
        WHEN ls.show_mediation THEN
            'Médiation: ' || ls.mediator_name ||
            CASE WHEN ls.mediator_url IS NOT NULL THEN ' - ' || ls.mediator_url ELSE '' END
        ELSE NULL
    END as mediation_mention,

    -- RCS/RM
    ls.registration_mention,

    -- Capital
    CASE
        WHEN ls.show_capital AND ls.capital_amount IS NOT NULL THEN
            'Capital social: ' || ls.capital_amount || ' €'
        ELSE NULL
    END as capital_mention,

    -- Mentions personnalisées
    ls.custom_mentions,

    -- Mention complète formatée
    CONCAT_WS(E'\n',
        REPLACE(COALESCE(ls.payment_terms_mention, 'Règlement à 30 jours.'), '{days}', COALESCE(ls.default_payment_terms, 30)::TEXT),
        CASE
            WHEN ls.early_payment_discount_enabled THEN
                REPLACE(REPLACE(ls.early_payment_mention, '{rate}', ls.early_payment_discount_rate::TEXT), '{days}', ls.early_payment_discount_days::TEXT)
            ELSE COALESCE(ls.no_discount_mention, 'Pas d''escompte pour paiement anticipé.')
        END,
        REPLACE(REPLACE(ls.late_payment_mention, '{rate}', COALESCE(ls.late_payment_rate, 10)::TEXT), '{indemnity}', '40'),
        CASE WHEN ls.is_subject_to_tva = false THEN ls.tva_mention ELSE NULL END,
        ls.registration_mention,
        CASE WHEN ls.show_capital AND ls.capital_amount IS NOT NULL THEN 'Capital social: ' || ls.capital_amount || ' €' ELSE NULL END
    ) as full_legal_footer

FROM invoices i
LEFT JOIN legal_settings ls ON i.organization_id = ls.organization_id;

-- Index
CREATE INDEX IF NOT EXISTS idx_legal_settings_org ON legal_settings(organization_id);

-- Fonction pour obtenir les mentions légales formatées
CREATE OR REPLACE FUNCTION get_invoice_legal_footer(p_invoice_id INTEGER)
RETURNS TEXT AS $$
DECLARE
    v_footer TEXT;
BEGIN
    SELECT full_legal_footer INTO v_footer
    FROM invoice_legal_mentions
    WHERE invoice_id = p_invoice_id;

    RETURN COALESCE(v_footer, 'En cas de retard de paiement, des pénalités seront appliquées conformément à la législation en vigueur.');
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_legal_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_legal_settings_timestamp ON legal_settings;
CREATE TRIGGER trigger_legal_settings_timestamp
    BEFORE UPDATE ON legal_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_legal_settings_timestamp();

-- Commentaires
COMMENT ON TABLE legal_settings IS 'Paramètres des mentions légales obligatoires par organisation';
COMMENT ON COLUMN legal_settings.late_payment_rate IS 'Taux des pénalités de retard (minimum légal = 3x taux BCE)';
COMMENT ON COLUMN legal_settings.is_subject_to_tva IS 'False pour les auto-entrepreneurs non assujettis';
COMMENT ON VIEW invoice_legal_mentions IS 'Vue avec les mentions légales formatées pour chaque facture';
