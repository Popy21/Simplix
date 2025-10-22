-- Migration 003: Tasks & Notifications Schema
-- Description: Tables pour la gestion des tâches, notifications et rappels
-- Author: Team Simplix
-- Date: 2025-10-22

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'completed', 'canceled');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE notification_type AS ENUM ('info', 'success', 'warning', 'error', 'task', 'mention', 'system');
CREATE TYPE reminder_type AS ENUM ('email', 'push', 'in_app', 'sms');

-- ============================================================================
-- TABLE: tasks
-- ============================================================================
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Task Info
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status task_status DEFAULT 'todo',
    priority task_priority DEFAULT 'medium',

    -- Relationships
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
    parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,

    -- Assignment
    assigned_to UUID REFERENCES users(id),
    assigned_by UUID REFERENCES users(id),

    -- Dates
    due_date TIMESTAMP WITH TIME ZONE,
    start_date TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,

    -- Tags & Custom Fields
    tags TEXT[],
    custom_fields JSONB DEFAULT '{}',

    -- Checklist
    checklist JSONB DEFAULT '[]',

    -- Metadata
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT task_title_not_empty CHECK (title <> '')
);

CREATE INDEX idx_tasks_org ON tasks(organization_id);
CREATE INDEX idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_contact ON tasks(contact_id);
CREATE INDEX idx_tasks_company ON tasks(company_id);
CREATE INDEX idx_tasks_deal ON tasks(deal_id);
CREATE INDEX idx_tasks_parent ON tasks(parent_task_id);
CREATE INDEX idx_tasks_deleted ON tasks(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_tags ON tasks USING GIN(tags);

-- ============================================================================
-- TABLE: task_comments
-- ============================================================================
CREATE TABLE task_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    content TEXT NOT NULL,

    -- Mentions
    mentions UUID[] DEFAULT '{}',

    -- Attachments
    attachments JSONB DEFAULT '[]',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT comment_content_not_empty CHECK (content <> '')
);

CREATE INDEX idx_task_comments_task ON task_comments(task_id);
CREATE INDEX idx_task_comments_user ON task_comments(user_id);
CREATE INDEX idx_task_comments_deleted ON task_comments(deleted_at) WHERE deleted_at IS NULL;

-- ============================================================================
-- TABLE: notifications
-- ============================================================================
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Notification Info
    type notification_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,

    -- Link/Action
    action_url TEXT,
    action_label VARCHAR(100),

    -- Related Entity
    entity_type VARCHAR(100),
    entity_id UUID,

    -- Status
    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,

    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT notification_title_not_empty CHECK (title <> '')
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_org ON notifications(organization_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_created ON notifications(created_at);
CREATE INDEX idx_notifications_entity ON notifications(entity_type, entity_id);

-- ============================================================================
-- TABLE: reminders
-- ============================================================================
CREATE TABLE reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Reminder Info
    title VARCHAR(255) NOT NULL,
    message TEXT,
    type reminder_type DEFAULT 'in_app',

    -- Related Entity
    entity_type VARCHAR(100),
    entity_id UUID,

    -- Scheduling
    remind_at TIMESTAMP WITH TIME ZONE NOT NULL,
    sent BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP WITH TIME ZONE,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT reminder_title_not_empty CHECK (title <> '')
);

CREATE INDEX idx_reminders_user ON reminders(user_id);
CREATE INDEX idx_reminders_org ON reminders(organization_id);
CREATE INDEX idx_reminders_sent ON reminders(sent);
CREATE INDEX idx_reminders_remind_at ON reminders(remind_at);
CREATE INDEX idx_reminders_entity ON reminders(entity_type, entity_id);

-- ============================================================================
-- TABLE: webhooks
-- ============================================================================
CREATE TABLE webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Webhook Info
    name VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    secret TEXT,

    -- Events to listen to
    events TEXT[] NOT NULL,

    -- Status
    active BOOLEAN DEFAULT TRUE,
    last_triggered_at TIMESTAMP WITH TIME ZONE,
    last_error TEXT,
    retry_count INTEGER DEFAULT 0,

    -- Headers
    headers JSONB DEFAULT '{}',

    -- Metadata
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT webhook_name_not_empty CHECK (name <> ''),
    CONSTRAINT webhook_url_not_empty CHECK (url <> '')
);

CREATE INDEX idx_webhooks_org ON webhooks(organization_id);
CREATE INDEX idx_webhooks_active ON webhooks(active);
CREATE INDEX idx_webhooks_events ON webhooks USING GIN(events);

-- ============================================================================
-- TABLE: webhook_logs
-- ============================================================================
CREATE TABLE webhook_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,

    -- Request
    event_type VARCHAR(100) NOT NULL,
    payload JSONB,

    -- Response
    status_code INTEGER,
    response_body TEXT,
    error_message TEXT,

    -- Timing
    duration_ms INTEGER,
    triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_webhook_logs_webhook ON webhook_logs(webhook_id);
CREATE INDEX idx_webhook_logs_event ON webhook_logs(event_type);
CREATE INDEX idx_webhook_logs_triggered ON webhook_logs(triggered_at);

-- ============================================================================
-- TABLE: file_attachments
-- ============================================================================
CREATE TABLE file_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- File Info
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100),
    file_size BIGINT,
    file_path TEXT NOT NULL,

    -- Storage
    storage_provider VARCHAR(50) DEFAULT 'local',
    storage_url TEXT,

    -- Related Entity
    entity_type VARCHAR(100),
    entity_id UUID,

    -- Metadata
    uploaded_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT attachment_filename_not_empty CHECK (filename <> ''),
    CONSTRAINT attachment_file_size_positive CHECK (file_size > 0)
);

CREATE INDEX idx_attachments_org ON file_attachments(organization_id);
CREATE INDEX idx_attachments_entity ON file_attachments(entity_type, entity_id);
CREATE INDEX idx_attachments_uploaded_by ON file_attachments(uploaded_by);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_comments_updated_at
    BEFORE UPDATE ON task_comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_webhooks_updated_at
    BEFORE UPDATE ON webhooks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FUNCTIONS: Auto-complete tasks when all checklist items are done
-- ============================================================================

CREATE OR REPLACE FUNCTION check_task_completion()
RETURNS TRIGGER AS $$
BEGIN
    -- Auto-complete task when status changes to 'completed'
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        NEW.completed_at = NOW();
    END IF;

    -- Remove completed_at when task is uncompleted
    IF NEW.status != 'completed' AND OLD.status = 'completed' THEN
        NEW.completed_at = NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER task_completion_trigger
    BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION check_task_completion();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE tasks IS 'Tasks that can be assigned to users and related to CRM entities';
COMMENT ON TABLE task_comments IS 'Comments on tasks';
COMMENT ON TABLE notifications IS 'In-app notifications for users';
COMMENT ON TABLE reminders IS 'Scheduled reminders for users';
COMMENT ON TABLE webhooks IS 'Webhook configurations for external integrations';
COMMENT ON TABLE webhook_logs IS 'Logs of webhook deliveries';
COMMENT ON TABLE file_attachments IS 'File attachments for various entities';
