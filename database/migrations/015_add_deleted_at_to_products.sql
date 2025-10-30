-- Add deleted_at column to products table for soft delete
ALTER TABLE products
ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create index for better query performance
CREATE INDEX idx_products_deleted_at ON products(deleted_at);

COMMENT ON COLUMN products.deleted_at IS 'Timestamp when the product was soft deleted';
