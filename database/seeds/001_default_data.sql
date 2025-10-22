-- Seed 001: Données par défaut
-- Description: Crée un organisation de démonstration avec des données initiales
-- Author: Team Simplix
-- Date: 2025-10-22

-- ============================================================================
-- Organization de démonstration
-- ============================================================================

INSERT INTO organizations (id, name, slug, subscription_status, subscription_plan, trial_ends_at)
VALUES
    ('00000000-0000-0000-0000-000000000001', 'Simplix Demo', 'simplix-demo', 'trial', 'professional', NOW() + INTERVAL '30 days')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Rôles système
-- ============================================================================

INSERT INTO roles (id, organization_id, name, type, description, is_system, permissions)
VALUES
    ('00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0000-000000000001', 'Owner', 'owner', 'Organisation owner with full access', true, '["*"]'),
    ('00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0000-000000000001', 'Admin', 'admin', 'Administrator with most permissions', true, '["users.*", "contacts.*", "companies.*", "deals.*", "tasks.*", "settings.read"]'),
    ('00000000-0000-0000-0001-000000000003', '00000000-0000-0000-0000-000000000001', 'Manager', 'manager', 'Manager with team permissions', true, '["contacts.*", "companies.*", "deals.*", "tasks.*"]'),
    ('00000000-0000-0000-0001-000000000004', '00000000-0000-0000-0000-000000000001', 'User', 'user', 'Regular user with basic permissions', true, '["contacts.read", "companies.read", "deals.read", "tasks.*"]'),
    ('00000000-0000-0000-0001-000000000005', '00000000-0000-0000-0000-000000000001', 'Guest', 'guest', 'Guest with read-only access', true, '["contacts.read", "companies.read", "deals.read"]')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Utilisateur admin par défaut
-- ============================================================================

-- Mot de passe: Admin123! (à changer en production!)
INSERT INTO users (id, organization_id, email, password_hash, first_name, last_name, status, email_verified)
VALUES
    ('00000000-0000-0000-0002-000000000001', '00000000-0000-0000-0000-000000000001', 'admin@simplix-demo.com', '$2b$10$rKvDxX6Z7X9X9X9X9X9X9.X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9', 'Admin', 'User', 'active', true)
ON CONFLICT (email, organization_id) DO NOTHING;

-- Assigner le rôle Owner
INSERT INTO user_roles (user_id, role_id, assigned_by)
VALUES
    ('00000000-0000-0000-0002-000000000001', '00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0002-000000000001')
ON CONFLICT (user_id, role_id) DO NOTHING;

-- ============================================================================
-- Pipeline par défaut
-- ============================================================================

INSERT INTO pipelines (id, organization_id, name, description, is_default)
VALUES
    ('00000000-0000-0000-0003-000000000001', '00000000-0000-0000-0000-000000000001', 'Sales Pipeline', 'Default sales pipeline', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Stages du pipeline
-- ============================================================================

INSERT INTO pipeline_stages (id, pipeline_id, name, win_probability, display_order, color)
VALUES
    ('00000000-0000-0000-0004-000000000001', '00000000-0000-0000-0003-000000000001', 'Lead', 10, 1, '#95a5a6'),
    ('00000000-0000-0000-0004-000000000002', '00000000-0000-0000-0003-000000000001', 'Qualified', 25, 2, '#3498db'),
    ('00000000-0000-0000-0004-000000000003', '00000000-0000-0000-0003-000000000001', 'Proposal', 50, 3, '#f39c12'),
    ('00000000-0000-0000-0004-000000000004', '00000000-0000-0000-0003-000000000001', 'Negotiation', 75, 4, '#e67e22'),
    ('00000000-0000-0000-0004-000000000005', '00000000-0000-0000-0003-000000000001', 'Won', 100, 5, '#27ae60'),
    ('00000000-0000-0000-0004-000000000006', '00000000-0000-0000-0003-000000000001', 'Lost', 0, 6, '#e74c3c')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Template email par défaut
-- ============================================================================

INSERT INTO email_templates (id, organization_id, name, subject, html_content, text_content, category, is_active, created_by)
VALUES
    (
        '00000000-0000-0000-0005-000000000001',
        '00000000-0000-0000-0000-000000000001',
        'Welcome Email',
        'Welcome to {{company_name}}!',
        '<html><body><h1>Welcome {{first_name}}!</h1><p>Thank you for joining {{company_name}}.</p></body></html>',
        'Welcome {{first_name}}! Thank you for joining {{company_name}}.',
        'onboarding',
        true,
        '00000000-0000-0000-0002-000000000001'
    ),
    (
        '00000000-0000-0000-0005-000000000002',
        '00000000-0000-0000-0000-000000000001',
        'Follow-up Email',
        'Following up on our conversation',
        '<html><body><h1>Hi {{first_name}},</h1><p>I wanted to follow up on our recent conversation...</p></body></html>',
        'Hi {{first_name}}, I wanted to follow up on our recent conversation...',
        'sales',
        true,
        '00000000-0000-0000-0002-000000000001'
    )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Tags par défaut
-- ============================================================================

INSERT INTO tags_definitions (organization_id, name, color, entity_types)
VALUES
    ('00000000-0000-0000-0000-000000000001', 'Hot Lead', '#e74c3c', ARRAY['contact', 'deal']),
    ('00000000-0000-0000-0000-000000000001', 'Cold Lead', '#3498db', ARRAY['contact', 'deal']),
    ('00000000-0000-0000-0000-000000000001', 'VIP', '#f39c12', ARRAY['contact', 'company']),
    ('00000000-0000-0000-0000-000000000001', 'Partner', '#9b59b6', ARRAY['company']),
    ('00000000-0000-0000-0000-000000000001', 'Priority', '#e67e22', ARRAY['task', 'deal'])
ON CONFLICT (organization_id, name) DO NOTHING;

-- ============================================================================
-- Champs personnalisés exemples
-- ============================================================================

INSERT INTO custom_fields_definitions (organization_id, entity_type, field_name, field_label, field_type, is_required, display_order)
VALUES
    ('00000000-0000-0000-0000-000000000001', 'contact', 'linkedin_profile', 'LinkedIn Profile', 'text', false, 1),
    ('00000000-0000-0000-0000-000000000001', 'contact', 'lead_source', 'Lead Source', 'select', false, 2),
    ('00000000-0000-0000-0000-000000000001', 'company', 'number_of_employees', 'Number of Employees', 'number', false, 1),
    ('00000000-0000-0000-0000-000000000001', 'deal', 'competitors', 'Competitors', 'text', false, 1)
ON CONFLICT (organization_id, entity_type, field_name) DO NOTHING;

-- Ajouter les options pour le champ lead_source
UPDATE custom_fields_definitions
SET options = '[
    {"value": "website", "label": "Website"},
    {"value": "referral", "label": "Referral"},
    {"value": "linkedin", "label": "LinkedIn"},
    {"value": "cold_call", "label": "Cold Call"},
    {"value": "trade_show", "label": "Trade Show"},
    {"value": "other", "label": "Other"}
]'
WHERE organization_id = '00000000-0000-0000-0000-000000000001'
    AND entity_type = 'contact'
    AND field_name = 'lead_source';

-- ============================================================================
-- Données de démonstration (optionnel)
-- ============================================================================

-- Entreprises de démonstration
INSERT INTO companies (organization_id, name, website, industry, company_size, owner_id, created_by)
VALUES
    ('00000000-0000-0000-0000-000000000001', 'Acme Corporation', 'https://acme-corp.example', 'Technology', '51-200', '00000000-0000-0000-0002-000000000001', '00000000-0000-0000-0002-000000000001'),
    ('00000000-0000-0000-0000-000000000001', 'TechStart Inc', 'https://techstart.example', 'Software', '11-50', '00000000-0000-0000-0002-000000000001', '00000000-0000-0000-0002-000000000001'),
    ('00000000-0000-0000-0000-000000000001', 'Global Solutions', 'https://globalsolutions.example', 'Consulting', '201-500', '00000000-0000-0000-0002-000000000001', '00000000-0000-0000-0002-000000000001')
ON CONFLICT DO NOTHING;

-- Contacts de démonstration
INSERT INTO contacts (organization_id, first_name, last_name, email, title, type, owner_id, created_by, company_id)
SELECT
    '00000000-0000-0000-0000-000000000001',
    'John',
    'Doe',
    'john.doe@acme-corp.example',
    'CEO',
    'customer',
    '00000000-0000-0000-0002-000000000001',
    '00000000-0000-0000-0002-000000000001',
    id
FROM companies
WHERE name = 'Acme Corporation'
    AND organization_id = '00000000-0000-0000-0000-000000000001'
ON CONFLICT DO NOTHING;

COMMENT ON TABLE organizations IS 'Table initialisée avec des données de démonstration';
