-- Migration: Enhance invoice templates with advanced features
-- Date: 2026-01-13
-- Description: Add CGV, custom notes, font family, background image, footer, column labels, decimals

-- Add new columns to invoice_templates table
ALTER TABLE invoice_templates
ADD COLUMN IF NOT EXISTS cgv_text TEXT,
ADD COLUMN IF NOT EXISTS custom_note TEXT,
ADD COLUMN IF NOT EXISTS footer_custom_text TEXT,
ADD COLUMN IF NOT EXISTS background_image_url TEXT,
ADD COLUMN IF NOT EXISTS font_family VARCHAR(100) DEFAULT 'Inter',
ADD COLUMN IF NOT EXISTS decimal_places INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS column_description_label VARCHAR(100) DEFAULT 'Description',
ADD COLUMN IF NOT EXISTS column_quantity_label VARCHAR(100) DEFAULT 'Quantité',
ADD COLUMN IF NOT EXISTS column_unit_price_label VARCHAR(100) DEFAULT 'Prix unitaire',
ADD COLUMN IF NOT EXISTS column_vat_label VARCHAR(100) DEFAULT 'TVA',
ADD COLUMN IF NOT EXISTS column_total_label VARCHAR(100) DEFAULT 'Total',
ADD COLUMN IF NOT EXISTS show_cgv BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS show_custom_note BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS date_format VARCHAR(50) DEFAULT 'dd/MM/yyyy',
ADD COLUMN IF NOT EXISTS currency_symbol VARCHAR(10) DEFAULT '€',
ADD COLUMN IF NOT EXISTS currency_position VARCHAR(10) DEFAULT 'after';

-- Add comments for documentation
COMMENT ON COLUMN invoice_templates.cgv_text IS 'Conditions Générales de Vente - texte libre';
COMMENT ON COLUMN invoice_templates.custom_note IS 'Note personnalisée pour le client';
COMMENT ON COLUMN invoice_templates.footer_custom_text IS 'Texte personnalisé du pied de page';
COMMENT ON COLUMN invoice_templates.background_image_url IS 'URL de l''image de fond du document';
COMMENT ON COLUMN invoice_templates.font_family IS 'Police de caractères du document';
COMMENT ON COLUMN invoice_templates.decimal_places IS 'Nombre de décimales pour les montants';
COMMENT ON COLUMN invoice_templates.column_description_label IS 'Intitulé de la colonne Description';
COMMENT ON COLUMN invoice_templates.column_quantity_label IS 'Intitulé de la colonne Quantité';
COMMENT ON COLUMN invoice_templates.column_unit_price_label IS 'Intitulé de la colonne Prix unitaire';
COMMENT ON COLUMN invoice_templates.column_vat_label IS 'Intitulé de la colonne TVA';
COMMENT ON COLUMN invoice_templates.column_total_label IS 'Intitulé de la colonne Total';
COMMENT ON COLUMN invoice_templates.show_cgv IS 'Afficher les CGV sur le document';
COMMENT ON COLUMN invoice_templates.show_custom_note IS 'Afficher la note personnalisée';
COMMENT ON COLUMN invoice_templates.date_format IS 'Format de date (dd/MM/yyyy, MM/dd/yyyy, etc.)';
COMMENT ON COLUMN invoice_templates.currency_symbol IS 'Symbole de la devise';
COMMENT ON COLUMN invoice_templates.currency_position IS 'Position du symbole (before/after)';

-- Set default values for existing rows
UPDATE invoice_templates SET
    cgv_text = 'Conditions générales de vente disponibles sur demande.',
    font_family = 'Inter',
    decimal_places = 2,
    column_description_label = 'Description',
    column_quantity_label = 'Quantité',
    column_unit_price_label = 'Prix unitaire',
    column_vat_label = 'TVA',
    column_total_label = 'Total',
    show_cgv = true,
    show_custom_note = false,
    date_format = 'dd/MM/yyyy',
    currency_symbol = '€',
    currency_position = 'after'
WHERE cgv_text IS NULL;
