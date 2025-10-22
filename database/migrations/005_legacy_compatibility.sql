-- Migration 005: Legacy Compatibility Tables
-- Description: Tables de compatibilité pour l'ancien schéma (customers, products, sales)
-- Author: Team Simplix
-- Date: 2025-10-22

-- ============================================================================
-- TABLE: customers (Legacy - maps to contacts)
-- ============================================================================
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    company VARCHAR(255),
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT customers_name_not_empty CHECK (name <> '')
);

CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);

-- ============================================================================
-- TABLE: products
-- ============================================================================
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    stock INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT products_name_not_empty CHECK (name <> ''),
    CONSTRAINT products_price_positive CHECK (price >= 0),
    CONSTRAINT products_stock_nonnegative CHECK (stock >= 0)
);

CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);

-- ============================================================================
-- TABLE: sales
-- ============================================================================
CREATE TABLE IF NOT EXISTS sales (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    total_amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    sale_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT sales_quantity_positive CHECK (quantity > 0),
    CONSTRAINT sales_amount_positive CHECK (total_amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_product ON sales(product_id);
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date);

-- ============================================================================
-- TABLE: quotes
-- ============================================================================
CREATE TABLE IF NOT EXISTS quotes (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    user_id INTEGER,
    title VARCHAR(255),
    description TEXT,
    subtotal DECIMAL(10, 2) DEFAULT 0,
    tax_rate DECIMAL(5, 2) DEFAULT 0,
    tax_amount DECIMAL(10, 2) DEFAULT 0,
    total_amount DECIMAL(10, 2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'draft',
    valid_until DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT quotes_total_nonnegative CHECK (total_amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_quotes_customer ON quotes(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);

-- ============================================================================
-- TABLE: quote_items
-- ============================================================================
CREATE TABLE IF NOT EXISTS quote_items (
    id SERIAL PRIMARY KEY,
    quote_id INTEGER REFERENCES quotes(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
    description VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT quote_items_quantity_positive CHECK (quantity > 0),
    CONSTRAINT quote_items_unit_price_nonnegative CHECK (unit_price >= 0),
    CONSTRAINT quote_items_total_nonnegative CHECK (total_price >= 0)
);

CREATE INDEX IF NOT EXISTS idx_quote_items_quote ON quote_items(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_items_product ON quote_items(product_id);

-- ============================================================================
-- TABLE: teams
-- ============================================================================
CREATE TABLE IF NOT EXISTS teams (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    owner_id INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT teams_name_not_empty CHECK (name <> '')
);

CREATE INDEX IF NOT EXISTS idx_teams_name ON teams(name);

-- ============================================================================
-- TABLE: team_members
-- ============================================================================
CREATE TABLE IF NOT EXISTS team_members (
    id SERIAL PRIMARY KEY,
    team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
    user_id INTEGER,
    role VARCHAR(50) DEFAULT 'member',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(team_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);

-- ============================================================================
-- TRIGGERS: updated_at
-- ============================================================================

CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sales_updated_at
    BEFORE UPDATE ON sales
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quotes_updated_at
    BEFORE UPDATE ON quotes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teams_updated_at
    BEFORE UPDATE ON teams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Insert sample customers
INSERT INTO customers (name, email, phone, company, address) VALUES
    ('John Doe', 'john@example.com', '+1234567890', 'Acme Corp', '123 Main St'),
    ('Jane Smith', 'jane@example.com', '+1234567891', 'Tech Inc', '456 Oak Ave'),
    ('Bob Johnson', 'bob@example.com', '+1234567892', 'StartUp LLC', '789 Pine Rd')
ON CONFLICT DO NOTHING;

-- Insert sample products
INSERT INTO products (name, description, price, stock) VALUES
    ('Product A', 'High quality product A', 99.99, 100),
    ('Product B', 'Premium product B', 149.99, 50),
    ('Product C', 'Basic product C', 49.99, 200),
    ('Product D', 'Enterprise product D', 299.99, 25)
ON CONFLICT DO NOTHING;

-- Insert sample sales
INSERT INTO sales (customer_id, product_id, quantity, total_amount, status, sale_date) VALUES
    (1, 1, 2, 199.98, 'completed', NOW() - INTERVAL '1 day'),
    (2, 2, 1, 149.99, 'completed', NOW() - INTERVAL '2 days'),
    (1, 3, 5, 249.95, 'completed', NOW() - INTERVAL '3 days'),
    (3, 4, 1, 299.99, 'pending', NOW())
ON CONFLICT DO NOTHING;

-- Insert sample quotes
INSERT INTO quotes (customer_id, title, total_amount, status, valid_until) VALUES
    (1, 'Q2025-001', 500.00, 'sent', NOW() + INTERVAL '30 days'),
    (2, 'Q2025-002', 750.00, 'draft', NOW() + INTERVAL '30 days'),
    (3, 'Q2025-003', 1200.00, 'accepted', NOW() + INTERVAL '30 days')
ON CONFLICT DO NOTHING;

COMMENT ON TABLE customers IS 'Legacy compatibility table for customers';
COMMENT ON TABLE products IS 'Product catalog';
COMMENT ON TABLE sales IS 'Sales transactions';
COMMENT ON TABLE quotes IS 'Sales quotes/proposals';
