-- Migration 033: Signature électronique des devis
-- Description: Permet aux clients de signer les devis en ligne
-- Author: Claude Code
-- Date: 2025-01-07

-- Ajouter les colonnes de signature aux devis
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS signature_token VARCHAR(64) UNIQUE;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS signature_url TEXT;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS signed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS signed_by_name VARCHAR(255);
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS signed_by_email VARCHAR(255);
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS signature_ip VARCHAR(45);
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS signature_data TEXT; -- Base64 de la signature manuscrite
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS signature_method VARCHAR(20) DEFAULT 'click'
    CHECK (signature_method IS NULL OR signature_method IN ('click', 'draw', 'type'));

-- Table des événements de signature (audit trail)
CREATE TABLE IF NOT EXISTS quote_signature_events (
    id SERIAL PRIMARY KEY,
    quote_id INTEGER REFERENCES quotes(id) ON DELETE CASCADE,

    -- Type d'événement
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
        'link_generated',    -- Lien de signature généré
        'link_sent',         -- Lien envoyé par email
        'link_opened',       -- Client a ouvert le lien
        'quote_viewed',      -- Devis consulté
        'signature_started', -- Signature commencée
        'signature_completed', -- Signature terminée
        'signature_declined', -- Devis refusé
        'quote_expired',     -- Devis expiré
        'pdf_downloaded',    -- PDF téléchargé
        'reminder_sent'      -- Rappel envoyé
    )),

    -- Détails
    ip_address VARCHAR(45),
    user_agent TEXT,
    metadata JSONB,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table pour les conditions générales
CREATE TABLE IF NOT EXISTS quote_terms (
    id SERIAL PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

    name VARCHAR(100) NOT NULL DEFAULT 'Conditions générales',
    content TEXT NOT NULL,
    is_default BOOLEAN DEFAULT false,
    is_required BOOLEAN DEFAULT true, -- Le client doit accepter pour signer

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ajouter référence aux conditions dans les devis
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS terms_id INTEGER REFERENCES quote_terms(id);
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP WITH TIME ZONE;

-- Index
CREATE INDEX IF NOT EXISTS idx_quotes_signature_token ON quotes(signature_token);
CREATE INDEX IF NOT EXISTS idx_quote_signature_events_quote ON quote_signature_events(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_signature_events_type ON quote_signature_events(event_type);
CREATE INDEX IF NOT EXISTS idx_quote_terms_org ON quote_terms(organization_id);

-- Fonction pour générer un token de signature unique
CREATE OR REPLACE FUNCTION generate_signature_token()
RETURNS VARCHAR(64) AS $$
DECLARE
    v_token VARCHAR(64);
    v_exists BOOLEAN;
BEGIN
    LOOP
        -- Générer un token aléatoire
        v_token := encode(gen_random_bytes(32), 'hex');

        -- Vérifier l'unicité
        SELECT EXISTS(SELECT 1 FROM quotes WHERE signature_token = v_token) INTO v_exists;

        IF NOT v_exists THEN
            RETURN v_token;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour logger les événements de signature
CREATE OR REPLACE FUNCTION log_signature_event()
RETURNS TRIGGER AS $$
BEGIN
    -- Log quand une signature est ajoutée
    IF NEW.signed_at IS NOT NULL AND (OLD.signed_at IS NULL OR OLD.signed_at != NEW.signed_at) THEN
        INSERT INTO quote_signature_events (quote_id, event_type, ip_address, metadata)
        VALUES (NEW.id, 'signature_completed', NEW.signature_ip, jsonb_build_object(
            'signed_by_name', NEW.signed_by_name,
            'signed_by_email', NEW.signed_by_email,
            'signature_method', NEW.signature_method
        ));
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_log_signature ON quotes;
CREATE TRIGGER trigger_log_signature
    AFTER UPDATE ON quotes
    FOR EACH ROW
    EXECUTE FUNCTION log_signature_event();

-- Vue des devis en attente de signature
CREATE OR REPLACE VIEW quotes_pending_signature AS
SELECT
    q.id,
    q.quote_number,
    q.title,
    q.total_amount,
    q.status,
    q.valid_until,
    q.signature_token,
    q.created_at,
    c.name as customer_name,
    c.email as customer_email,
    CASE
        WHEN q.valid_until < CURRENT_DATE THEN 'expired'
        WHEN q.valid_until <= CURRENT_DATE + 7 THEN 'expiring_soon'
        ELSE 'valid'
    END as validity_status,
    (SELECT COUNT(*) FROM quote_signature_events WHERE quote_id = q.id AND event_type = 'link_opened') as times_viewed,
    (SELECT MAX(created_at) FROM quote_signature_events WHERE quote_id = q.id AND event_type = 'link_opened') as last_viewed
FROM quotes q
LEFT JOIN customers c ON q.customer_id = c.id
WHERE q.status = 'sent'
  AND q.signature_token IS NOT NULL
  AND q.signed_at IS NULL
  AND q.deleted_at IS NULL;

-- Commentaires
COMMENT ON COLUMN quotes.signature_token IS 'Token unique pour le lien de signature';
COMMENT ON COLUMN quotes.signature_data IS 'Signature manuscrite en base64 (si méthode draw)';
COMMENT ON COLUMN quotes.signature_method IS 'Méthode: click (bouton), draw (dessin), type (texte)';
COMMENT ON TABLE quote_signature_events IS 'Journal d''audit des événements de signature';
COMMENT ON TABLE quote_terms IS 'Conditions générales de vente attachées aux devis';
