-- Migration 043: Support Factur-X
-- Description: Préparation pour la facturation électronique obligatoire (2026)
-- Format: ZUGFeRD 2.0 / Factur-X (EN 16931)
-- Author: Claude Code
-- Date: 2025-01-07

-- ==========================================
-- CONFIGURATION FACTUR-X
-- ==========================================

-- Table de configuration Factur-X par organisation
CREATE TABLE IF NOT EXISTS facturx_settings (
    id SERIAL PRIMARY KEY,
    organization_id UUID UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,

    -- Activation
    is_enabled BOOLEAN DEFAULT false,

    -- Profil Factur-X (niveau de détail)
    -- MINIMUM: Données essentielles uniquement
    -- BASIC WL: Basic Without Lines (sans détail lignes)
    -- BASIC: Basique avec lignes
    -- EN16931: Conforme norme européenne (recommandé pour B2B)
    -- EXTENDED: Informations étendues
    profile VARCHAR(20) DEFAULT 'EN16931'
        CHECK (profile IN ('MINIMUM', 'BASIC_WL', 'BASIC', 'EN16931', 'EXTENDED')),

    -- Identification vendeur
    seller_siret VARCHAR(14),
    seller_siren VARCHAR(9),
    seller_tva_intracom VARCHAR(20),
    seller_naf_code VARCHAR(10),
    seller_rcs VARCHAR(100),
    seller_legal_form VARCHAR(50), -- SARL, SAS, SA, etc.

    -- Coordonnées bancaires pour paiement
    bank_iban VARCHAR(34),
    bank_bic VARCHAR(11),
    bank_name VARCHAR(100),

    -- Options d'envoi
    auto_generate BOOLEAN DEFAULT true, -- Générer XML automatiquement
    auto_embed_pdf BOOLEAN DEFAULT true, -- Intégrer XML dans PDF/A-3
    send_to_pdp BOOLEAN DEFAULT false, -- Envoyer à une plateforme de dématérialisation

    -- Plateforme de dématérialisation partenaire (PDP)
    pdp_provider VARCHAR(50), -- chorus_pro, docaposte, etc.
    pdp_api_key TEXT,
    pdp_api_secret TEXT,
    pdp_endpoint VARCHAR(255),

    -- Chorus Pro (obligatoire pour B2G en France)
    chorus_pro_enabled BOOLEAN DEFAULT false,
    chorus_pro_siret VARCHAR(14),
    chorus_pro_service_code VARCHAR(50),
    chorus_pro_engagement VARCHAR(50),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ajouter les champs Factur-X aux factures
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS facturx_xml TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS facturx_profile VARCHAR(20);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS facturx_generated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS facturx_sent_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS facturx_status VARCHAR(20)
    CHECK (facturx_status IN ('pending', 'generated', 'sent', 'accepted', 'rejected', 'error'));
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS facturx_error_message TEXT;

-- Historique des envois Factur-X
CREATE TABLE IF NOT EXISTS facturx_logs (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

    action VARCHAR(20) NOT NULL, -- generate, send, status_update
    status VARCHAR(20),
    profile VARCHAR(20),

    -- Réponse du PDP/Chorus Pro
    external_id VARCHAR(100),
    external_status VARCHAR(50),
    response_data JSONB,

    error_message TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_facturx_logs_invoice ON facturx_logs(invoice_id);
CREATE INDEX IF NOT EXISTS idx_facturx_logs_org ON facturx_logs(organization_id);

-- Ajouter les identifiants Factur-X aux clients
ALTER TABLE customers ADD COLUMN IF NOT EXISTS facturx_identifier VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS facturx_identifier_scheme VARCHAR(20); -- SIRET, SIREN, GLN, etc.
ALTER TABLE customers ADD COLUMN IF NOT EXISTS chorus_pro_service_code VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS chorus_pro_engagement VARCHAR(50);

-- ==========================================
-- VUES STATISTIQUES
-- ==========================================

-- Vue des factures Factur-X
CREATE OR REPLACE VIEW facturx_invoices AS
SELECT
    i.id,
    i.invoice_number,
    i.invoice_date,
    i.total_amount,
    i.facturx_status,
    i.facturx_profile,
    i.facturx_generated_at,
    i.facturx_sent_at,
    c.name as customer_name,
    c.facturx_identifier as customer_identifier,
    i.organization_id
FROM invoices i
LEFT JOIN customers c ON i.customer_id = c.id
WHERE i.facturx_xml IS NOT NULL
ORDER BY i.invoice_date DESC;

-- Vue de conformité Factur-X par organisation
CREATE OR REPLACE VIEW facturx_compliance AS
SELECT
    fs.organization_id,
    fs.is_enabled,
    fs.profile,
    fs.seller_siret IS NOT NULL as has_siret,
    fs.seller_tva_intracom IS NOT NULL as has_tva,
    fs.bank_iban IS NOT NULL as has_iban,
    fs.chorus_pro_enabled,
    (SELECT COUNT(*) FROM invoices i WHERE i.organization_id = fs.organization_id AND i.facturx_xml IS NOT NULL) as facturx_invoices_count,
    (SELECT COUNT(*) FROM invoices i WHERE i.organization_id = fs.organization_id AND i.facturx_status = 'sent') as sent_count,
    (SELECT COUNT(*) FROM invoices i WHERE i.organization_id = fs.organization_id AND i.facturx_status = 'error') as error_count
FROM facturx_settings fs;

-- ==========================================
-- COMMENTAIRES
-- ==========================================

COMMENT ON TABLE facturx_settings IS 'Configuration Factur-X/ZUGFeRD par organisation';
COMMENT ON TABLE facturx_logs IS 'Historique des opérations Factur-X';
COMMENT ON COLUMN facturx_settings.profile IS 'Profil Factur-X: MINIMUM, BASIC_WL, BASIC, EN16931 (recommandé), EXTENDED';
COMMENT ON COLUMN facturx_settings.pdp_provider IS 'Plateforme de dématérialisation partenaire';
COMMENT ON COLUMN invoices.facturx_xml IS 'Contenu XML Factur-X intégré dans le PDF';

-- ==========================================
-- NOTE IMPORTANTE - ÉCHÉANCES LÉGALES
-- ==========================================
-- France: Facturation électronique obligatoire
-- - 1er septembre 2026: Grandes entreprises (émission et réception)
-- - 1er septembre 2027: ETI et PME (émission et réception)
-- - 1er septembre 2028: Micro-entreprises et TPE (émission)
--
-- Format requis: Factur-X (ZUGFeRD 2.0), UBL, ou CII
-- Les factures B2B devront transiter par des PDP agréées ou le PPF (Portail Public de Facturation)
