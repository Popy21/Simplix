-- Add template_id to quotes and invoices tables

-- Add template_id to quotes
ALTER TABLE quotes
ADD COLUMN template_id INTEGER REFERENCES invoice_templates(id) ON DELETE SET NULL;

-- Add template_id to invoices
ALTER TABLE invoices
ADD COLUMN template_id INTEGER REFERENCES invoice_templates(id) ON DELETE SET NULL;

-- Add indexes for better performance
CREATE INDEX idx_quotes_template_id ON quotes(template_id);
CREATE INDEX idx_invoices_template_id ON invoices(template_id);

-- Add comment
COMMENT ON COLUMN quotes.template_id IS 'Reference to the invoice template used for this quote';
COMMENT ON COLUMN invoices.template_id IS 'Reference to the invoice template used for this invoice';
