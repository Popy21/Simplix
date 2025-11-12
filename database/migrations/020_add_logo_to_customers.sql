-- Migration: Add logo_url to customers table
-- Date: 2025-11-11

-- Add logo_url column to customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_customers_logo_url ON customers(logo_url);
