-- Migration 007: Suppliers & Expenses
-- Description: Ajoute la gestion des fournisseurs et des notes de frais pour couvrir les fonctionnalités de dépenses comparables à Axonaut / Sellsy

-- ============================================================================
-- ENUMS
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'supplier_category') THEN
        CREATE TYPE supplier_category AS ENUM ('vendor', 'service', 'freelancer', 'other');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'expense_status') THEN
        CREATE TYPE expense_status AS ENUM ('draft', 'submitted', 'approved', 'rejected', 'paid');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'expense_payment_status') THEN
        CREATE TYPE expense_payment_status AS ENUM ('unpaid', 'partial', 'paid');
    END IF;
END$$;

-- ============================================================================
-- TABLE: suppliers
-- ============================================================================

CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    name VARCHAR(255) NOT NULL,
    legal_name VARCHAR(255),
    category supplier_category DEFAULT 'vendor',

    contact_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    website VARCHAR(255),

    tax_number VARCHAR(50),
    vat_number VARCHAR(50),
    iban VARCHAR(34),
    payment_terms INTEGER DEFAULT 30,

    billing_address JSONB,
    shipping_address JSONB,

    default_currency VARCHAR(3) DEFAULT 'EUR',
    notes TEXT,
    tags TEXT[],
    metadata JSONB DEFAULT '{}',

    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_suppliers_org ON suppliers(organization_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_category ON suppliers(category);
CREATE INDEX IF NOT EXISTS idx_suppliers_deleted ON suppliers(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_suppliers_tags ON suppliers USING GIN(tags);

-- ============================================================================
-- TABLE: expense_categories
-- ============================================================================

CREATE TABLE IF NOT EXISTS expense_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    name VARCHAR(100) NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES expense_categories(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expense_categories_org ON expense_categories(organization_id);
CREATE INDEX IF NOT EXISTS idx_expense_categories_parent ON expense_categories(parent_id);

-- ============================================================================
-- TABLE: expenses
-- ============================================================================

CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    category_id UUID REFERENCES expense_categories(id) ON DELETE SET NULL,
    submitted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,

    status expense_status DEFAULT 'draft',
    payment_status expense_payment_status DEFAULT 'unpaid',
    expense_type VARCHAR(50) DEFAULT 'purchase',

    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    payment_date DATE,

    description TEXT,
    reference VARCHAR(100),
    amount DECIMAL(12, 2) NOT NULL CHECK (amount >= 0),
    tax_amount DECIMAL(12, 2) DEFAULT 0 CHECK (tax_amount >= 0),
    currency VARCHAR(3) DEFAULT 'EUR',
    payment_method VARCHAR(50),
    attachments JSONB DEFAULT '[]',
    notes TEXT,
    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_expenses_org ON expenses(organization_id);
CREATE INDEX IF NOT EXISTS idx_expenses_supplier ON expenses(supplier_id);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_deleted ON expenses(deleted_at) WHERE deleted_at IS NULL;

-- Trigger to keep updated_at fresh
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_suppliers_timestamp'
    ) THEN
        CREATE TRIGGER trigger_suppliers_timestamp
            BEFORE UPDATE ON suppliers
            FOR EACH ROW
            EXECUTE FUNCTION trigger_set_timestamp();
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_expense_categories_timestamp'
    ) THEN
        CREATE TRIGGER trigger_expense_categories_timestamp
            BEFORE UPDATE ON expense_categories
            FOR EACH ROW
            EXECUTE FUNCTION trigger_set_timestamp();
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_expenses_timestamp'
    ) THEN
        CREATE TRIGGER trigger_expenses_timestamp
            BEFORE UPDATE ON expenses
            FOR EACH ROW
            EXECUTE FUNCTION trigger_set_timestamp();
    END IF;
END$$;
