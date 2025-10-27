-- Clean up test data from all tables
-- Run this to start fresh

-- Truncate tables with test data (keep structure)
TRUNCATE TABLE payments CASCADE;
TRUNCATE TABLE invoice_items CASCADE;
TRUNCATE TABLE invoices CASCADE;
TRUNCATE TABLE quote_items CASCADE;
TRUNCATE TABLE quotes CASCADE;
TRUNCATE TABLE sales CASCADE;
TRUNCATE TABLE products CASCADE;
TRUNCATE TABLE expenses CASCADE;
TRUNCATE TABLE suppliers CASCADE;
TRUNCATE TABLE activities CASCADE;
TRUNCATE TABLE tasks CASCADE;
TRUNCATE TABLE deals CASCADE;
TRUNCATE TABLE leads CASCADE;
TRUNCATE TABLE contacts CASCADE;
TRUNCATE TABLE companies CASCADE;
TRUNCATE TABLE customers CASCADE;

-- Keep invoice_templates default template if exists
-- Keep dashboard_kpis, revenue_projections, etc. (business data)

-- Reset sequences
ALTER SEQUENCE quotes_id_seq RESTART WITH 1;
ALTER SEQUENCE invoices_id_seq RESTART WITH 1;
ALTER SEQUENCE payments_id_seq RESTART WITH 1;
ALTER SEQUENCE products_id_seq RESTART WITH 1;
ALTER SEQUENCE sales_id_seq RESTART WITH 1;
ALTER SEQUENCE customers_id_seq RESTART WITH 1;
ALTER SEQUENCE suppliers_id_seq RESTART WITH 1;
ALTER SEQUENCE expenses_id_seq RESTART WITH 1;
ALTER SEQUENCE tasks_id_seq RESTART WITH 1;

COMMIT;
