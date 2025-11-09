-- Migration 025: Sécurité avancée et Conformité RGPD
-- 2FA, Audit logs avancés, RGPD exports, Backup automatique

-- ============================================
-- 1. AUTHENTIFICATION 2 FACTEURS (2FA)
-- ============================================
CREATE TYPE mfa_method AS ENUM ('totp', 'sms', 'email', 'backup_codes');

CREATE TABLE IF NOT EXISTS user_mfa_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Statut 2FA
    is_enabled BOOLEAN DEFAULT false,
    primary_method mfa_method,

    -- TOTP (Google Authenticator, etc.)
    totp_secret VARCHAR(255), -- Encrypted
    totp_verified BOOLEAN DEFAULT false,
    totp_verified_at TIMESTAMP,

    -- SMS
    phone_number VARCHAR(50),
    phone_verified BOOLEAN DEFAULT false,

    -- Email
    email_verified BOOLEAN DEFAULT false,

    -- Backup codes (codes de secours)
    backup_codes TEXT[], -- Array de codes hashés

    -- Dernière utilisation
    last_used_at TIMESTAMP,
    last_used_method mfa_method,

    -- Métadonnées
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(user_id, organization_id)
);

CREATE INDEX idx_mfa_user ON user_mfa_settings(user_id);
CREATE INDEX idx_mfa_enabled ON user_mfa_settings(is_enabled) WHERE is_enabled = true;

-- Table: Tentatives de connexion (sécurité)
CREATE TABLE IF NOT EXISTS login_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    email VARCHAR(255),

    -- Tentative
    success BOOLEAN NOT NULL,
    mfa_required BOOLEAN DEFAULT false,
    mfa_success BOOLEAN,

    -- Détails
    ip_address INET,
    user_agent TEXT,
    country VARCHAR(100),
    city VARCHAR(100),

    -- Raison échec
    failure_reason VARCHAR(255),

    -- Métadonnées
    attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_login_attempts_user ON login_attempts(user_id);
CREATE INDEX idx_login_attempts_email ON login_attempts(email);
CREATE INDEX idx_login_attempts_ip ON login_attempts(ip_address);
CREATE INDEX idx_login_attempts_date ON login_attempts(attempted_at);
CREATE INDEX idx_login_attempts_failed ON login_attempts(success) WHERE success = false;

-- ============================================
-- 2. SESSIONS UTILISATEURS
-- ============================================
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Session
    session_token VARCHAR(500) UNIQUE NOT NULL,
    refresh_token VARCHAR(500),

    -- Device/Browser
    device_name VARCHAR(255),
    device_type VARCHAR(50), -- 'desktop', 'mobile', 'tablet'
    browser VARCHAR(100),
    os VARCHAR(100),
    ip_address INET,
    user_agent TEXT,

    -- Localisation
    country VARCHAR(100),
    city VARCHAR(100),
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),

    -- Dates
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP,

    -- État
    is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_sessions_user ON user_sessions(user_id) WHERE is_active = true;
CREATE INDEX idx_sessions_token ON user_sessions(session_token) WHERE is_active = true;
CREATE INDEX idx_sessions_expires ON user_sessions(expires_at);

-- ============================================
-- 3. AUDIT LOGS AVANCÉS
-- ============================================
CREATE TYPE audit_action AS ENUM (
    'create', 'read', 'update', 'delete',
    'login', 'logout', 'failed_login',
    'export', 'import', 'share', 'download',
    'permission_change', 'settings_change'
);

CREATE TYPE audit_severity AS ENUM ('low', 'medium', 'high', 'critical');

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

    -- Utilisateur
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_email VARCHAR(255),
    user_name VARCHAR(255),

    -- Action
    action audit_action NOT NULL,
    resource_type VARCHAR(100) NOT NULL, -- 'invoice', 'contact', 'user', etc.
    resource_id UUID,
    severity audit_severity DEFAULT 'low',

    -- Détails
    description TEXT NOT NULL,
    changes JSONB, -- Before/After values
    metadata JSONB,

    -- Contexte
    ip_address INET,
    user_agent TEXT,
    request_path VARCHAR(500),
    request_method VARCHAR(10),

    -- Résultat
    success BOOLEAN DEFAULT true,
    error_message TEXT,

    -- Timestamp
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_org ON audit_logs(organization_id);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_date ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_severity ON audit_logs(severity) WHERE severity IN ('high', 'critical');

-- Partition par mois (pour performance avec gros volumes)
-- CREATE TABLE audit_logs_y2025m01 PARTITION OF audit_logs
-- FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

-- ============================================
-- 4. GDPR - EXPORTS DONNÉES PERSONNELLES
-- ============================================
CREATE TYPE gdpr_request_type AS ENUM ('data_export', 'data_deletion', 'data_correction', 'data_portability');
CREATE TYPE gdpr_request_status AS ENUM ('pending', 'processing', 'completed', 'rejected');

CREATE TABLE IF NOT EXISTS gdpr_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Demandeur
    user_id UUID REFERENCES users(id),
    contact_id UUID REFERENCES contacts(id),
    requester_email VARCHAR(255) NOT NULL,
    requester_name VARCHAR(255),

    -- Type demande
    request_type gdpr_request_type NOT NULL,
    status gdpr_request_status DEFAULT 'pending',

    -- Détails demande
    reason TEXT,
    notes TEXT,

    -- Traitement
    processed_by UUID REFERENCES users(id),
    processed_at TIMESTAMP,

    -- Export (si data_export)
    export_file_url TEXT,
    export_file_size BIGINT,

    -- Suppression (si data_deletion)
    data_deleted_at TIMESTAMP,
    deletion_confirmation TEXT,

    -- Délais RGPD (30 jours max)
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deadline_at TIMESTAMP, -- requested_at + 30 days

    -- Métadonnées
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_gdpr_org ON gdpr_requests(organization_id);
CREATE INDEX idx_gdpr_user ON gdpr_requests(user_id);
CREATE INDEX idx_gdpr_status ON gdpr_requests(status);
CREATE INDEX idx_gdpr_deadline ON gdpr_requests(deadline_at) WHERE status = 'pending';

-- Trigger: Calculer deadline GDPR (30 jours)
CREATE OR REPLACE FUNCTION set_gdpr_deadline()
RETURNS TRIGGER AS $$
BEGIN
    NEW.deadline_at := NEW.requested_at + INTERVAL '30 days';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_gdpr_deadline
BEFORE INSERT ON gdpr_requests
FOR EACH ROW
WHEN (NEW.deadline_at IS NULL)
EXECUTE FUNCTION set_gdpr_deadline();

-- ============================================
-- 5. CONSENTEMENTS RGPD
-- ============================================
CREATE TYPE consent_type AS ENUM (
    'marketing_emails',
    'analytics',
    'third_party_sharing',
    'data_processing',
    'cookies'
);

CREATE TABLE IF NOT EXISTS user_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,

    -- Consentement
    consent_type consent_type NOT NULL,
    is_granted BOOLEAN NOT NULL,

    -- Versioning (pour prouver quand consentement donné)
    consent_version VARCHAR(50), -- v1.0, v2.0, etc.
    consent_text TEXT, -- Texte exact montré à l'utilisateur

    -- Métadonnées
    ip_address INET,
    user_agent TEXT,
    granted_at TIMESTAMP,
    revoked_at TIMESTAMP,

    -- Historique
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_consents_user ON user_consents(user_id);
CREATE INDEX idx_consents_contact ON user_consents(contact_id);
CREATE INDEX idx_consents_type ON user_consents(consent_type);
CREATE INDEX idx_consents_granted ON user_consents(is_granted);

-- ============================================
-- 6. BACKUPS AUTOMATIQUES
-- ============================================
CREATE TYPE backup_type AS ENUM ('full', 'incremental', 'differential');
CREATE TYPE backup_status AS ENUM ('pending', 'running', 'completed', 'failed');

CREATE TABLE IF NOT EXISTS backups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

    -- Backup
    backup_type backup_type NOT NULL,
    status backup_status DEFAULT 'pending',

    -- Fichier
    file_name VARCHAR(500),
    file_path TEXT,
    file_size BIGINT,
    compression_type VARCHAR(50), -- 'gzip', 'zip', 'none'

    -- Cloud storage
    storage_provider VARCHAR(100), -- 's3', 'gcs', 'azure', 'local'
    storage_url TEXT,

    -- Checksums (intégrité)
    md5_checksum VARCHAR(32),
    sha256_checksum VARCHAR(64),

    -- Métadonnées
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    duration_seconds INT,
    error_message TEXT,

    -- Rétention
    expires_at TIMESTAMP, -- Après cette date, peut être supprimé
    is_encrypted BOOLEAN DEFAULT false,

    -- Métadonnées
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_backups_org ON backups(organization_id);
CREATE INDEX idx_backups_status ON backups(status);
CREATE INDEX idx_backups_date ON backups(created_at DESC);
CREATE INDEX idx_backups_expires ON backups(expires_at) WHERE status = 'completed';

-- ============================================
-- 7. PERMISSIONS GRANULAIRES
-- ============================================
CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,

    -- Permission
    resource VARCHAR(100) NOT NULL, -- 'invoices', 'contacts', 'users', etc.
    action VARCHAR(50) NOT NULL, -- 'create', 'read', 'update', 'delete', 'export'

    -- Conditions (optionnel - permissions conditionnelles)
    conditions JSONB, -- {owner_only: true, department: 'sales'}

    -- Métadonnées
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(role_id, resource, action)
);

CREATE INDEX idx_role_perms_role ON role_permissions(role_id);
CREATE INDEX idx_role_perms_resource ON role_permissions(resource, action);

-- ============================================
-- 8. VUES UTILES
-- ============================================

-- Vue: Sessions actives par utilisateur
CREATE OR REPLACE VIEW v_active_sessions AS
SELECT
    us.user_id,
    u.name as user_name,
    u.email,
    COUNT(*) as active_sessions,
    MAX(us.last_activity_at) as last_activity,
    array_agg(DISTINCT us.ip_address::text) as ip_addresses
FROM user_sessions us
JOIN users u ON u.id = us.user_id
WHERE us.is_active = true
  AND us.expires_at > CURRENT_TIMESTAMP
  AND us.revoked_at IS NULL
GROUP BY us.user_id, u.name, u.email;

-- Vue: Tentatives de connexion suspectes
CREATE OR REPLACE VIEW v_suspicious_login_attempts AS
SELECT
    email,
    ip_address,
    COUNT(*) as failed_attempts,
    MAX(attempted_at) as last_attempt,
    array_agg(DISTINCT country) as countries,
    array_agg(DISTINCT city) as cities
FROM login_attempts
WHERE success = false
  AND attempted_at >= CURRENT_TIMESTAMP - INTERVAL '1 hour'
GROUP BY email, ip_address
HAVING COUNT(*) >= 3
ORDER BY failed_attempts DESC;

-- Vue: Demandes RGPD en retard
CREATE OR REPLACE VIEW v_overdue_gdpr_requests AS
SELECT
    gr.*,
    u.name as user_name,
    CURRENT_TIMESTAMP - gr.deadline_at as days_overdue
FROM gdpr_requests gr
LEFT JOIN users u ON u.id = gr.user_id
WHERE gr.status IN ('pending', 'processing')
  AND gr.deadline_at < CURRENT_TIMESTAMP
ORDER BY gr.deadline_at ASC;

-- ============================================
-- Commentaires tables
-- ============================================
COMMENT ON TABLE user_mfa_settings IS 'Paramètres authentification à 2 facteurs par utilisateur';
COMMENT ON TABLE login_attempts IS 'Historique des tentatives de connexion (sécurité)';
COMMENT ON TABLE user_sessions IS 'Sessions utilisateurs actives et historique';
COMMENT ON TABLE audit_logs IS 'Logs d''audit complets pour toutes les actions';
COMMENT ON TABLE gdpr_requests IS 'Demandes RGPD (export, suppression, correction de données)';
COMMENT ON TABLE user_consents IS 'Consentements RGPD des utilisateurs';
COMMENT ON TABLE backups IS 'Historique des sauvegardes automatiques';
COMMENT ON TABLE role_permissions IS 'Permissions granulaires par rôle';
