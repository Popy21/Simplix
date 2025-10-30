-- Add advanced customization fields to invoice_templates table
ALTER TABLE invoice_templates
  -- Add missing legal fields
  ADD COLUMN IF NOT EXISTS company_rcs VARCHAR(255),
  ADD COLUMN IF NOT EXISTS company_capital VARCHAR(100),
  ADD COLUMN IF NOT EXISTS company_legal_form VARCHAR(100),
  ADD COLUMN IF NOT EXISTS is_micro_entreprise BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS late_payment_penalty TEXT,
  ADD COLUMN IF NOT EXISTS recovery_indemnity TEXT,

  -- Add advanced color customization fields
  ADD COLUMN IF NOT EXISTS table_header_color VARCHAR(7),
  ADD COLUMN IF NOT EXISTS border_color VARCHAR(7),
  ADD COLUMN IF NOT EXISTS secondary_text_color VARCHAR(7),
  ADD COLUMN IF NOT EXISTS header_background_color VARCHAR(7),
  ADD COLUMN IF NOT EXISTS total_color VARCHAR(7),

  -- Add font customization
  ADD COLUMN IF NOT EXISTS font_family VARCHAR(100),

  -- Add editable invoice text fields
  ADD COLUMN IF NOT EXISTS invoice_title VARCHAR(100),
  ADD COLUMN IF NOT EXISTS invoice_number_prefix VARCHAR(50),
  ADD COLUMN IF NOT EXISTS client_label VARCHAR(100),
  ADD COLUMN IF NOT EXISTS client_name_placeholder VARCHAR(255),
  ADD COLUMN IF NOT EXISTS client_address_placeholder TEXT,
  ADD COLUMN IF NOT EXISTS table_header_description VARCHAR(100),
  ADD COLUMN IF NOT EXISTS table_header_quantity VARCHAR(100),
  ADD COLUMN IF NOT EXISTS table_header_unit_price VARCHAR(100),
  ADD COLUMN IF NOT EXISTS table_header_total VARCHAR(100),
  ADD COLUMN IF NOT EXISTS sample_item_description TEXT,
  ADD COLUMN IF NOT EXISTS subtotal_label VARCHAR(100),
  ADD COLUMN IF NOT EXISTS vat_label VARCHAR(100),
  ADD COLUMN IF NOT EXISTS total_label VARCHAR(100),

  -- Add bank details
  ADD COLUMN IF NOT EXISTS bank_iban VARCHAR(100),
  ADD COLUMN IF NOT EXISTS bank_bic VARCHAR(50),
  ADD COLUMN IF NOT EXISTS bank_name VARCHAR(255),

  -- Add show/hide toggles
  ADD COLUMN IF NOT EXISTS show_header BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_footer BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_legal_mentions BOOLEAN DEFAULT true;

-- Rename header_background to match the frontend field name (if not already renamed)
DO $$
BEGIN
  IF EXISTS(SELECT 1 FROM information_schema.columns
            WHERE table_name='invoice_templates' AND column_name='header_background') THEN
    ALTER TABLE invoice_templates RENAME COLUMN header_background TO header_background_color;
  END IF;
END $$;
