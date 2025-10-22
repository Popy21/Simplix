-- Migration 002: CRM Schema
-- Description: Tables pour la gestion CRM (contacts, entreprises, deals, pipelines)
-- Author: Team Simplix
-- Date: 2025-10-22

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE contact_type AS ENUM ('lead', 'prospect', 'customer', 'partner', 'other');
CREATE TYPE deal_status AS ENUM ('open', 'won', 'lost', 'abandoned');
CREATE TYPE activity_type AS ENUM ('call', 'email', 'meeting', 'task', 'note', 'sms', 'other');
CREATE TYPE company_size AS ENUM ('1-10', '11-50', '51-200', '201-500', '501-1000', '1000+');

-- ============================================================================
-- TABLE: companies
-- ============================================================================
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Basic Info
    name VARCHAR(255) NOT NULL,
    legal_name VARCHAR(255),
    website VARCHAR(255),
    logo_url TEXT,

    -- Business Info
    industry VARCHAR(100),
    company_size company_size,
    annual_revenue DECIMAL(15, 2),
    description TEXT,

    -- Contact Info
    email VARCHAR(255),
    phone VARCHAR(50),
    address JSONB,

    -- Social Media
    linkedin_url VARCHAR(255),
    twitter_url VARCHAR(255),
    facebook_url VARCHAR(255),

    -- Owner & Assignment
    owner_id UUID REFERENCES users(id),
    assigned_to UUID REFERENCES users(id),

    -- Tags & Custom Fields
    tags TEXT[],
    custom_fields JSONB DEFAULT '{}',

    -- Metadata
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT company_name_not_empty CHECK (name <> '')
);

CREATE INDEX idx_companies_org ON companies(organization_id);
CREATE INDEX idx_companies_owner ON companies(owner_id);
CREATE INDEX idx_companies_name ON companies(name);
CREATE INDEX idx_companies_deleted ON companies(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_companies_tags ON companies USING GIN(tags);

-- ============================================================================
-- TABLE: contacts
-- ============================================================================
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,

    -- Personal Info
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    full_name VARCHAR(255) GENERATED ALWAYS AS (
        TRIM(COALESCE(first_name, '') || ' ' || COALESCE(last_name, ''))
    ) STORED,
    avatar_url TEXT,
    title VARCHAR(100),
    department VARCHAR(100),

    -- Contact Info
    email VARCHAR(255),
    phone VARCHAR(50),
    mobile VARCHAR(50),
    address JSONB,

    -- Social Media
    linkedin_url VARCHAR(255),
    twitter_url VARCHAR(255),

    -- Classification
    type contact_type DEFAULT 'lead',
    source VARCHAR(100),

    -- Owner & Assignment
    owner_id UUID REFERENCES users(id),
    assigned_to UUID REFERENCES users(id),

    -- Lead Scoring
    score INTEGER DEFAULT 0,

    -- Tags & Custom Fields
    tags TEXT[],
    custom_fields JSONB DEFAULT '{}',

    -- Notes
    notes TEXT,

    -- Metadata
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT contact_email_valid CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

CREATE INDEX idx_contacts_org ON contacts(organization_id);
CREATE INDEX idx_contacts_company ON contacts(company_id);
CREATE INDEX idx_contacts_owner ON contacts(owner_id);
CREATE INDEX idx_contacts_email ON contacts(email);
CREATE INDEX idx_contacts_type ON contacts(type);
CREATE INDEX idx_contacts_deleted ON contacts(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_contacts_tags ON contacts USING GIN(tags);
CREATE INDEX idx_contacts_full_name ON contacts(full_name);

-- ============================================================================
-- TABLE: pipelines
-- ============================================================================
CREATE TABLE pipelines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    name VARCHAR(100) NOT NULL,
    description TEXT,

    -- Settings
    is_default BOOLEAN DEFAULT FALSE,
    currency VARCHAR(3) DEFAULT 'USD',

    -- Ordering
    display_order INTEGER DEFAULT 0,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT pipeline_name_not_empty CHECK (name <> '')
);

CREATE INDEX idx_pipelines_org ON pipelines(organization_id);
CREATE INDEX idx_pipelines_default ON pipelines(is_default) WHERE is_default = TRUE;
CREATE INDEX idx_pipelines_deleted ON pipelines(deleted_at) WHERE deleted_at IS NULL;

-- ============================================================================
-- TABLE: pipeline_stages
-- ============================================================================
CREATE TABLE pipeline_stages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,

    name VARCHAR(100) NOT NULL,
    description TEXT,

    -- Probability of winning (0-100)
    win_probability INTEGER DEFAULT 0,

    -- Ordering
    display_order INTEGER DEFAULT 0,

    -- Settings
    is_closed BOOLEAN DEFAULT FALSE,
    color VARCHAR(7), -- Hex color

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT stage_name_not_empty CHECK (name <> ''),
    CONSTRAINT stage_win_probability_range CHECK (win_probability >= 0 AND win_probability <= 100)
);

CREATE INDEX idx_pipeline_stages_pipeline ON pipeline_stages(pipeline_id);
CREATE INDEX idx_pipeline_stages_order ON pipeline_stages(display_order);

-- ============================================================================
-- TABLE: deals
-- ============================================================================
CREATE TABLE deals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    pipeline_id UUID NOT NULL REFERENCES pipelines(id),
    stage_id UUID NOT NULL REFERENCES pipeline_stages(id),

    -- Basic Info
    title VARCHAR(255) NOT NULL,
    description TEXT,

    -- Financial
    value DECIMAL(15, 2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',

    -- Relationships
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,

    -- Owner & Assignment
    owner_id UUID REFERENCES users(id),
    assigned_to UUID REFERENCES users(id),

    -- Status & Dates
    status deal_status DEFAULT 'open',
    expected_close_date DATE,
    actual_close_date DATE,

    -- Win/Loss
    won_at TIMESTAMP WITH TIME ZONE,
    lost_at TIMESTAMP WITH TIME ZONE,
    lost_reason TEXT,

    -- Tags & Custom Fields
    tags TEXT[],
    custom_fields JSONB DEFAULT '{}',

    -- Metadata
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT deal_title_not_empty CHECK (title <> ''),
    CONSTRAINT deal_value_positive CHECK (value >= 0)
);

CREATE INDEX idx_deals_org ON deals(organization_id);
CREATE INDEX idx_deals_pipeline ON deals(pipeline_id);
CREATE INDEX idx_deals_stage ON deals(stage_id);
CREATE INDEX idx_deals_contact ON deals(contact_id);
CREATE INDEX idx_deals_company ON deals(company_id);
CREATE INDEX idx_deals_owner ON deals(owner_id);
CREATE INDEX idx_deals_status ON deals(status);
CREATE INDEX idx_deals_close_date ON deals(expected_close_date);
CREATE INDEX idx_deals_deleted ON deals(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_deals_tags ON deals USING GIN(tags);

-- ============================================================================
-- TABLE: activities
-- ============================================================================
CREATE TABLE activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Activity Info
    type activity_type NOT NULL,
    subject VARCHAR(255) NOT NULL,
    description TEXT,

    -- Relationships
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,

    -- Scheduling
    scheduled_at TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER,
    completed_at TIMESTAMP WITH TIME ZONE,

    -- Owner & Assignment
    owner_id UUID REFERENCES users(id),
    assigned_to UUID REFERENCES users(id),

    -- Participants
    participants UUID[] DEFAULT '{}',

    -- Location/Link
    location TEXT,
    meeting_link TEXT,

    -- Metadata
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT activity_subject_not_empty CHECK (subject <> ''),
    CONSTRAINT activity_duration_positive CHECK (duration_minutes IS NULL OR duration_minutes > 0)
);

CREATE INDEX idx_activities_org ON activities(organization_id);
CREATE INDEX idx_activities_contact ON activities(contact_id);
CREATE INDEX idx_activities_company ON activities(company_id);
CREATE INDEX idx_activities_deal ON activities(deal_id);
CREATE INDEX idx_activities_owner ON activities(owner_id);
CREATE INDEX idx_activities_type ON activities(type);
CREATE INDEX idx_activities_scheduled ON activities(scheduled_at);
CREATE INDEX idx_activities_completed ON activities(completed_at);

-- ============================================================================
-- TABLE: notes
-- ============================================================================
CREATE TABLE notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    content TEXT NOT NULL,

    -- Relationships (at least one must be set)
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,

    -- Pinned notes appear first
    is_pinned BOOLEAN DEFAULT FALSE,

    -- Metadata
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT note_content_not_empty CHECK (content <> ''),
    CONSTRAINT note_has_relationship CHECK (
        contact_id IS NOT NULL OR company_id IS NOT NULL OR deal_id IS NOT NULL
    )
);

CREATE INDEX idx_notes_org ON notes(organization_id);
CREATE INDEX idx_notes_contact ON notes(contact_id);
CREATE INDEX idx_notes_company ON notes(company_id);
CREATE INDEX idx_notes_deal ON notes(deal_id);
CREATE INDEX idx_notes_pinned ON notes(is_pinned) WHERE is_pinned = TRUE;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at
    BEFORE UPDATE ON contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pipelines_updated_at
    BEFORE UPDATE ON pipelines
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pipeline_stages_updated_at
    BEFORE UPDATE ON pipeline_stages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deals_updated_at
    BEFORE UPDATE ON deals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_activities_updated_at
    BEFORE UPDATE ON activities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notes_updated_at
    BEFORE UPDATE ON notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE companies IS 'Companies/Organizations in CRM';
COMMENT ON TABLE contacts IS 'Contacts (leads, prospects, customers) in CRM';
COMMENT ON TABLE pipelines IS 'Sales pipelines';
COMMENT ON TABLE pipeline_stages IS 'Stages within each pipeline';
COMMENT ON TABLE deals IS 'Sales opportunities/deals';
COMMENT ON TABLE activities IS 'Activities (calls, meetings, tasks, etc.) related to CRM entities';
COMMENT ON TABLE notes IS 'Notes attached to contacts, companies, or deals';
