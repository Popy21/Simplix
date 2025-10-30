-- Add images and organization_id to products table
ALTER TABLE products
ADD COLUMN images TEXT[] DEFAULT '{}',
ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Create index for organization_id
CREATE INDEX idx_products_org ON products(organization_id);

-- Update description to allow longer text
COMMENT ON COLUMN products.description IS 'Detailed product description';
COMMENT ON COLUMN products.images IS 'Array of image URLs for the product';
