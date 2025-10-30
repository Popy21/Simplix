-- Add quote_number column to quotes table
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS quote_number VARCHAR(50);

-- Create index on quote_number for faster lookups
CREATE INDEX IF NOT EXISTS idx_quotes_quote_number ON quotes(quote_number);

-- Generate quote numbers for existing quotes
UPDATE quotes
SET quote_number = 'DEV-' || LPAD(id::text, 6, '0')
WHERE quote_number IS NULL;
