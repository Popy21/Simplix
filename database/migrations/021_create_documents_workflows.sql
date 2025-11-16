-- Migration 021: Create Documents and Workflows Tables
-- This migration adds support for document management and workflow automation

-- ========================================
-- DOCUMENTS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    file_url TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(100),
    document_type VARCHAR(50) DEFAULT 'general', -- general, contract, invoice, quote, etc.
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    uploaded_by UUID REFERENCES users(id),
    tags TEXT[],
    version_number INTEGER DEFAULT 1,
    is_current_version BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT document_title_not_empty CHECK (title <> ''),
    CONSTRAINT document_file_size_positive CHECK (file_size > 0)
);

CREATE INDEX idx_documents_org ON documents(organization_id);
CREATE INDEX idx_documents_contact ON documents(contact_id);
CREATE INDEX idx_documents_deal ON documents(deal_id);
CREATE INDEX idx_documents_company ON documents(company_id);
CREATE INDEX idx_documents_type ON documents(document_type);
CREATE INDEX idx_documents_deleted ON documents(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_tags ON documents USING GIN(tags);

-- ========================================
-- DOCUMENT VERSIONS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS document_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    file_url TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT,
    uploaded_by UUID REFERENCES users(id),
    change_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT version_number_positive CHECK (version_number > 0)
);

CREATE INDEX idx_document_versions_document ON document_versions(document_id);
CREATE INDEX idx_document_versions_number ON document_versions(document_id, version_number);

-- ========================================
-- WORKFLOWS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    trigger JSONB NOT NULL, -- {type: 'contact_created', conditions: {...}}
    actions JSONB NOT NULL, -- [{type: 'send_email', config: {...}}, ...]
    enabled BOOLEAN DEFAULT true,
    execution_count INTEGER DEFAULT 0,
    last_execution_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT workflow_name_not_empty CHECK (name <> '')
);

CREATE INDEX idx_workflows_org ON workflows(organization_id);
CREATE INDEX idx_workflows_enabled ON workflows(enabled) WHERE enabled = true AND deleted_at IS NULL;
CREATE INDEX idx_workflows_deleted ON workflows(deleted_at) WHERE deleted_at IS NULL;

-- ========================================
-- WORKFLOW EXECUTIONS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS workflow_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'running', -- running, completed, failed
    trigger_data JSONB,
    actions_executed JSONB, -- Array of executed actions with results
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_ms INTEGER
);

CREATE INDEX idx_workflow_executions_workflow ON workflow_executions(workflow_id);
CREATE INDEX idx_workflow_executions_org ON workflow_executions(organization_id);
CREATE INDEX idx_workflow_executions_status ON workflow_executions(status);
CREATE INDEX idx_workflow_executions_started ON workflow_executions(started_at DESC);

-- ========================================
-- EMAIL ATTACHMENTS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS email_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email_log_id UUID NOT NULL REFERENCES email_logs(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_email_attachments_email ON email_attachments(email_log_id);

-- ========================================
-- UPDATE TRIGGERS
-- ========================================
CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflows_updated_at
    BEFORE UPDATE ON workflows
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- COMMENTS
-- ========================================
COMMENT ON TABLE documents IS 'Stores document metadata and file references';
COMMENT ON TABLE document_versions IS 'Version history for documents';
COMMENT ON TABLE workflows IS 'Automation workflows with triggers and actions';
COMMENT ON TABLE workflow_executions IS 'Execution logs for workflows';
COMMENT ON TABLE email_attachments IS 'Attachments for email logs';
