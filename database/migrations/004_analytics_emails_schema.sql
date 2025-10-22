-- Migration 004: Analytics & Email Campaigns Schema
-- Description: Tables pour analytics, rapports et campagnes email
-- Author: Team Simplix
-- Date: 2025-10-22

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE email_campaign_status AS ENUM ('draft', 'scheduled', 'sending', 'sent', 'paused', 'canceled');
CREATE TYPE email_status AS ENUM ('pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed', 'unsubscribed');
CREATE TYPE report_type AS ENUM ('sales', 'pipeline', 'activities', 'performance', 'custom');
CREATE TYPE report_format AS ENUM ('pdf', 'xlsx', 'csv', 'json');

-- ============================================================================
-- TABLE: email_templates
-- ============================================================================
CREATE TABLE email_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Template Info
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    html_content TEXT NOT NULL,
    text_content TEXT,

    -- Variables available in template
    variables JSONB DEFAULT '[]',

    -- Category
    category VARCHAR(100),

    -- Status
    is_active BOOLEAN DEFAULT TRUE,

    -- Metadata
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT template_name_not_empty CHECK (name <> '')
);

CREATE INDEX idx_email_templates_org ON email_templates(organization_id);
CREATE INDEX idx_email_templates_active ON email_templates(is_active);
CREATE INDEX idx_email_templates_category ON email_templates(category);

-- ============================================================================
-- TABLE: email_campaigns
-- ============================================================================
CREATE TABLE email_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Campaign Info
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    html_content TEXT NOT NULL,
    text_content TEXT,

    -- Template
    template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,

    -- Sender
    from_name VARCHAR(255),
    from_email VARCHAR(255),
    reply_to VARCHAR(255),

    -- Status & Scheduling
    status email_campaign_status DEFAULT 'draft',
    scheduled_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,

    -- Target Audience
    target_contacts UUID[] DEFAULT '{}',
    target_filter JSONB, -- Dynamic filter criteria

    -- Stats
    total_recipients INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    delivered_count INTEGER DEFAULT 0,
    opened_count INTEGER DEFAULT 0,
    clicked_count INTEGER DEFAULT 0,
    bounced_count INTEGER DEFAULT 0,
    unsubscribed_count INTEGER DEFAULT 0,

    -- Metadata
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT campaign_name_not_empty CHECK (name <> '')
);

CREATE INDEX idx_email_campaigns_org ON email_campaigns(organization_id);
CREATE INDEX idx_email_campaigns_status ON email_campaigns(status);
CREATE INDEX idx_email_campaigns_scheduled ON email_campaigns(scheduled_at);
CREATE INDEX idx_email_campaigns_template ON email_campaigns(template_id);

-- ============================================================================
-- TABLE: email_logs
-- ============================================================================
CREATE TABLE email_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES email_campaigns(id) ON DELETE CASCADE,

    -- Recipient
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    to_email VARCHAR(255) NOT NULL,
    to_name VARCHAR(255),

    -- Email Content
    subject VARCHAR(255) NOT NULL,
    html_content TEXT,
    text_content TEXT,

    -- Status
    status email_status DEFAULT 'pending',

    -- Tracking
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    opened_at TIMESTAMP WITH TIME ZONE,
    clicked_at TIMESTAMP WITH TIME ZONE,
    bounced_at TIMESTAMP WITH TIME ZONE,
    unsubscribed_at TIMESTAMP WITH TIME ZONE,

    -- Open & Click Tracking
    open_count INTEGER DEFAULT 0,
    click_count INTEGER DEFAULT 0,
    last_opened_at TIMESTAMP WITH TIME ZONE,
    last_clicked_at TIMESTAMP WITH TIME ZONE,

    -- Error handling
    error_message TEXT,
    bounce_reason TEXT,

    -- Provider info
    provider_message_id VARCHAR(255),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_email_logs_org ON email_logs(organization_id);
CREATE INDEX idx_email_logs_campaign ON email_logs(campaign_id);
CREATE INDEX idx_email_logs_contact ON email_logs(contact_id);
CREATE INDEX idx_email_logs_email ON email_logs(to_email);
CREATE INDEX idx_email_logs_status ON email_logs(status);
CREATE INDEX idx_email_logs_sent ON email_logs(sent_at);

-- ============================================================================
-- TABLE: email_link_clicks
-- ============================================================================
CREATE TABLE email_link_clicks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email_log_id UUID NOT NULL REFERENCES email_logs(id) ON DELETE CASCADE,

    url TEXT NOT NULL,
    clicked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- User Agent Info
    ip_address INET,
    user_agent TEXT,
    device_info JSONB
);

CREATE INDEX idx_email_clicks_log ON email_link_clicks(email_log_id);
CREATE INDEX idx_email_clicks_clicked ON email_link_clicks(clicked_at);

-- ============================================================================
-- TABLE: analytics_events
-- ============================================================================
CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Event Info
    event_name VARCHAR(100) NOT NULL,
    event_category VARCHAR(100),

    -- Entity
    entity_type VARCHAR(100),
    entity_id UUID,

    -- Properties
    properties JSONB DEFAULT '{}',

    -- Session Info
    session_id UUID,
    ip_address INET,
    user_agent TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_analytics_events_org ON analytics_events(organization_id);
CREATE INDEX idx_analytics_events_user ON analytics_events(user_id);
CREATE INDEX idx_analytics_events_name ON analytics_events(event_name);
CREATE INDEX idx_analytics_events_category ON analytics_events(event_category);
CREATE INDEX idx_analytics_events_created ON analytics_events(created_at);
CREATE INDEX idx_analytics_events_entity ON analytics_events(entity_type, entity_id);

-- ============================================================================
-- TABLE: reports
-- ============================================================================
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Report Info
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type report_type NOT NULL,

    -- Configuration
    config JSONB NOT NULL,
    filters JSONB DEFAULT '{}',

    -- Scheduling
    is_scheduled BOOLEAN DEFAULT FALSE,
    schedule_cron VARCHAR(100),
    last_run_at TIMESTAMP WITH TIME ZONE,
    next_run_at TIMESTAMP WITH TIME ZONE,

    -- Recipients
    recipients UUID[] DEFAULT '{}',

    -- Status
    is_active BOOLEAN DEFAULT TRUE,

    -- Metadata
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT report_name_not_empty CHECK (name <> '')
);

CREATE INDEX idx_reports_org ON reports(organization_id);
CREATE INDEX idx_reports_type ON reports(type);
CREATE INDEX idx_reports_scheduled ON reports(is_scheduled);
CREATE INDEX idx_reports_active ON reports(is_active);

-- ============================================================================
-- TABLE: report_runs
-- ============================================================================
CREATE TABLE report_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,

    -- Execution Info
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'running',

    -- Results
    result_data JSONB,
    file_path TEXT,
    file_format report_format,

    -- Error handling
    error_message TEXT,

    -- Triggered by
    triggered_by UUID REFERENCES users(id)
);

CREATE INDEX idx_report_runs_report ON report_runs(report_id);
CREATE INDEX idx_report_runs_started ON report_runs(started_at);
CREATE INDEX idx_report_runs_status ON report_runs(status);

-- ============================================================================
-- TABLE: dashboards
-- ============================================================================
CREATE TABLE dashboards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Dashboard Info
    name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Layout Configuration
    layout JSONB NOT NULL,

    -- Widgets
    widgets JSONB DEFAULT '[]',

    -- Sharing
    is_public BOOLEAN DEFAULT FALSE,
    shared_with UUID[] DEFAULT '{}',

    -- Default dashboard
    is_default BOOLEAN DEFAULT FALSE,

    -- Metadata
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT dashboard_name_not_empty CHECK (name <> '')
);

CREATE INDEX idx_dashboards_org ON dashboards(organization_id);
CREATE INDEX idx_dashboards_default ON dashboards(is_default) WHERE is_default = TRUE;
CREATE INDEX idx_dashboards_public ON dashboards(is_public) WHERE is_public = TRUE;

-- ============================================================================
-- TABLE: custom_fields_definitions
-- ============================================================================
CREATE TABLE custom_fields_definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Field Info
    entity_type VARCHAR(100) NOT NULL, -- 'contact', 'company', 'deal', etc.
    field_name VARCHAR(100) NOT NULL,
    field_label VARCHAR(255) NOT NULL,
    field_type VARCHAR(50) NOT NULL, -- 'text', 'number', 'date', 'select', 'multiselect', 'checkbox', etc.

    -- Options for select/multiselect
    options JSONB DEFAULT '[]',

    -- Validation
    is_required BOOLEAN DEFAULT FALSE,
    validation_rules JSONB DEFAULT '{}',

    -- Display
    display_order INTEGER DEFAULT 0,
    is_visible BOOLEAN DEFAULT TRUE,

    -- Metadata
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT custom_field_entity_name_unique UNIQUE (organization_id, entity_type, field_name)
);

CREATE INDEX idx_custom_fields_org ON custom_fields_definitions(organization_id);
CREATE INDEX idx_custom_fields_entity ON custom_fields_definitions(entity_type);

-- ============================================================================
-- TABLE: tags_definitions
-- ============================================================================
CREATE TABLE tags_definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    name VARCHAR(100) NOT NULL,
    color VARCHAR(7), -- Hex color
    entity_types TEXT[] DEFAULT '{}', -- Which entities can use this tag

    usage_count INTEGER DEFAULT 0,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT tag_name_org_unique UNIQUE (organization_id, name)
);

CREATE INDEX idx_tags_org ON tags_definitions(organization_id);
CREATE INDEX idx_tags_entity_types ON tags_definitions USING GIN(entity_types);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE TRIGGER update_email_templates_updated_at
    BEFORE UPDATE ON email_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_campaigns_updated_at
    BEFORE UPDATE ON email_campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reports_updated_at
    BEFORE UPDATE ON reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dashboards_updated_at
    BEFORE UPDATE ON dashboards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_custom_fields_updated_at
    BEFORE UPDATE ON custom_fields_definitions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FUNCTIONS: Update email campaign stats
-- ============================================================================

CREATE OR REPLACE FUNCTION update_campaign_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE email_campaigns
        SET
            sent_count = (SELECT COUNT(*) FROM email_logs WHERE campaign_id = NEW.campaign_id AND status IN ('sent', 'delivered', 'opened', 'clicked')),
            delivered_count = (SELECT COUNT(*) FROM email_logs WHERE campaign_id = NEW.campaign_id AND status IN ('delivered', 'opened', 'clicked')),
            opened_count = (SELECT COUNT(*) FROM email_logs WHERE campaign_id = NEW.campaign_id AND opened_at IS NOT NULL),
            clicked_count = (SELECT COUNT(*) FROM email_logs WHERE campaign_id = NEW.campaign_id AND clicked_at IS NOT NULL),
            bounced_count = (SELECT COUNT(*) FROM email_logs WHERE campaign_id = NEW.campaign_id AND status = 'bounced'),
            unsubscribed_count = (SELECT COUNT(*) FROM email_logs WHERE campaign_id = NEW.campaign_id AND status = 'unsubscribed')
        WHERE id = NEW.campaign_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER email_log_stats_trigger
    AFTER INSERT OR UPDATE ON email_logs
    FOR EACH ROW
    WHEN (NEW.campaign_id IS NOT NULL)
    EXECUTE FUNCTION update_campaign_stats();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE email_templates IS 'Reusable email templates';
COMMENT ON TABLE email_campaigns IS 'Email marketing campaigns';
COMMENT ON TABLE email_logs IS 'Individual email send logs with tracking';
COMMENT ON TABLE email_link_clicks IS 'Tracks clicks on links in emails';
COMMENT ON TABLE analytics_events IS 'Analytics events for user activity tracking';
COMMENT ON TABLE reports IS 'Configured reports';
COMMENT ON TABLE report_runs IS 'History of report executions';
COMMENT ON TABLE dashboards IS 'Custom dashboards with widgets';
COMMENT ON TABLE custom_fields_definitions IS 'Custom field definitions for entities';
COMMENT ON TABLE tags_definitions IS 'Available tags for entities';
