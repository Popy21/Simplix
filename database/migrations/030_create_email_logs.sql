-- Migration 030: Table de logs pour les emails envoyés
-- Description: Historique et suivi des emails envoyés (factures, devis, relances)
-- Author: Claude Code
-- Date: 2025-01-06

CREATE TABLE IF NOT EXISTS email_logs (
    id SERIAL PRIMARY KEY,

    -- Type de document
    type VARCHAR(50) NOT NULL CHECK (type IN ('invoice', 'quote', 'reminder', 'credit_note', 'other')),
    document_id INTEGER, -- ID de la facture/devis/avoir

    -- Destinataire
    recipient VARCHAR(255) NOT NULL,
    cc TEXT,
    bcc TEXT,

    -- Contenu
    subject VARCHAR(500),

    -- Statut
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'bounced', 'opened', 'clicked')),
    message_id VARCHAR(255), -- ID du message retourné par le provider

    -- Erreur éventuelle
    error TEXT,

    -- Tracking
    opened_at TIMESTAMP WITH TIME ZONE,
    clicked_at TIMESTAMP WITH TIME ZONE,

    -- Métadonnées
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Contexte
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE
);

-- Index
CREATE INDEX IF NOT EXISTS idx_email_logs_type ON email_logs(type);
CREATE INDEX IF NOT EXISTS idx_email_logs_document ON email_logs(type, document_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON email_logs(recipient);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent ON email_logs(sent_at);
CREATE INDEX IF NOT EXISTS idx_email_logs_org ON email_logs(organization_id);

-- Commentaires
COMMENT ON TABLE email_logs IS 'Historique des emails envoyés pour factures, devis, relances';
COMMENT ON COLUMN email_logs.type IS 'Type: invoice, quote, reminder, credit_note';
COMMENT ON COLUMN email_logs.status IS 'Statut: pending, sent, failed, bounced, opened, clicked';
