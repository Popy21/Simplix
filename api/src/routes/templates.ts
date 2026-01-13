import express, { Request, Response } from 'express';
import { pool } from '../database/db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

// GET /api/templates - Get all invoice templates
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        name,
        is_default,
        logo_url,
        company_name,
        company_address,
        company_phone,
        company_email,
        company_siret,
        company_tva,
        company_rcs,
        company_capital,
        company_legal_form,
        is_micro_entreprise,
        late_payment_penalty,
        recovery_indemnity,
        primary_color,
        secondary_color,
        text_color,
        secondary_text_color,
        table_header_color,
        border_color,
        header_background_color,
        total_color,
        template_layout,
        font_family,
        header_text,
        footer_text,
        invoice_title,
        invoice_number_prefix,
        client_label,
        client_name_placeholder,
        client_address_placeholder,
        table_header_description,
        table_header_quantity,
        table_header_unit_price,
        table_header_total,
        sample_item_description,
        subtotal_label,
        vat_label,
        total_label,
        payment_terms,
        bank_iban,
        bank_bic,
        bank_name,
        show_logo,
        show_header,
        show_footer,
        show_payment_terms,
        show_bank_details,
        show_legal_mentions,
        cgv_text,
        custom_note,
        footer_custom_text,
        background_image_url,
        decimal_places,
        column_description_label,
        column_quantity_label,
        column_unit_price_label,
        column_vat_label,
        column_total_label,
        show_cgv,
        show_custom_note,
        date_format,
        currency_symbol,
        currency_position,
        created_at,
        updated_at
      FROM invoice_templates
      WHERE 1=1
      ORDER BY is_default DESC, created_at DESC
    `);

    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/templates/:id - Get template by ID
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT
        id,
        name,
        is_default,
        logo_url,
        company_name,
        company_address,
        company_phone,
        company_email,
        company_siret,
        company_tva,
        company_rcs,
        company_capital,
        company_legal_form,
        is_micro_entreprise,
        late_payment_penalty,
        recovery_indemnity,
        primary_color,
        secondary_color,
        text_color,
        secondary_text_color,
        table_header_color,
        border_color,
        header_background_color,
        total_color,
        template_layout,
        font_family,
        header_text,
        footer_text,
        invoice_title,
        invoice_number_prefix,
        client_label,
        client_name_placeholder,
        client_address_placeholder,
        table_header_description,
        table_header_quantity,
        table_header_unit_price,
        table_header_total,
        sample_item_description,
        subtotal_label,
        vat_label,
        total_label,
        payment_terms,
        bank_iban,
        bank_bic,
        bank_name,
        show_logo,
        show_header,
        show_footer,
        show_payment_terms,
        show_bank_details,
        show_legal_mentions,
        cgv_text,
        custom_note,
        footer_custom_text,
        background_image_url,
        decimal_places,
        column_description_label,
        column_quantity_label,
        column_unit_price_label,
        column_vat_label,
        column_total_label,
        show_cgv,
        show_custom_note,
        date_format,
        currency_symbol,
        currency_position,
        created_at,
        updated_at
      FROM invoice_templates
      WHERE id = $1
    `, [id]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Template not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error fetching template:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/templates/default - Get default template
router.get('/default/template', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        name,
        is_default,
        logo_url,
        company_name,
        company_address,
        company_phone,
        company_email,
        company_siret,
        company_tva,
        primary_color,
        secondary_color,
        template_layout,
        header_text,
        footer_text,
        payment_terms,
        bank_details,
        show_logo,
        show_company_info,
        show_payment_terms,
        show_bank_details,
        created_at,
        updated_at
      FROM invoice_templates
      WHERE is_default = true
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      // Return a basic default template if none exists
      res.json({
        name: 'Template par défaut',
        is_default: true,
        primary_color: '#007AFF',
        template_layout: 'classic',
        show_logo: true,
        show_company_info: true,
        show_payment_terms: true,
        show_bank_details: true,
      });
      return;
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error fetching default template:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/templates - Create new template
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const {
      name,
      is_default,
      logo_url,
      company_name,
      company_address,
      company_phone,
      company_email,
      company_siret,
      company_tva,
      company_rcs,
      company_capital,
      company_legal_form,
      is_micro_entreprise,
      late_payment_penalty,
      recovery_indemnity,
      primary_color,
      secondary_color,
      text_color,
      secondary_text_color,
      table_header_color,
      border_color,
      header_background_color,
      total_color,
      template_layout,
      font_family,
      header_text,
      footer_text,
      invoice_title,
      invoice_number_prefix,
      client_label,
      client_name_placeholder,
      client_address_placeholder,
      table_header_description,
      table_header_quantity,
      table_header_unit_price,
      table_header_total,
      sample_item_description,
      subtotal_label,
      vat_label,
      total_label,
      payment_terms,
      bank_iban,
      bank_bic,
      bank_name,
      show_logo,
      show_header,
      show_footer,
      show_payment_terms,
      show_bank_details,
      show_legal_mentions,
      // New fields
      cgv_text,
      custom_note,
      footer_custom_text,
      background_image_url,
      decimal_places,
      column_description_label,
      column_quantity_label,
      column_unit_price_label,
      column_vat_label,
      column_total_label,
      show_cgv,
      show_custom_note,
      date_format,
      currency_symbol,
      currency_position,
    } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Template name is required' });
      return;
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // If setting as default, unset all other defaults
      if (is_default) {
        await client.query(`
          UPDATE invoice_templates
          SET is_default = false
          WHERE is_default = true
        `);
      }

      const result = await client.query(`
        INSERT INTO invoice_templates (
          name, is_default, logo_url,
          company_name, company_address, company_phone, company_email,
          company_siret, company_tva, company_rcs, company_capital, company_legal_form,
          is_micro_entreprise, late_payment_penalty, recovery_indemnity,
          primary_color, secondary_color, text_color, secondary_text_color,
          table_header_color, border_color, header_background_color, total_color,
          template_layout, font_family, header_text, footer_text,
          invoice_title, invoice_number_prefix, client_label,
          client_name_placeholder, client_address_placeholder,
          table_header_description, table_header_quantity, table_header_unit_price, table_header_total,
          sample_item_description, subtotal_label, vat_label, total_label,
          payment_terms, bank_iban, bank_bic, bank_name,
          show_logo, show_header, show_footer, show_payment_terms, show_bank_details, show_legal_mentions,
          cgv_text, custom_note, footer_custom_text, background_image_url,
          decimal_places, column_description_label, column_quantity_label, column_unit_price_label,
          column_vat_label, column_total_label, show_cgv, show_custom_note,
          date_format, currency_symbol, currency_position
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
          $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28,
          $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41,
          $42, $43, $44, $45, $46, $47, $48, $49, $50,
          $51, $52, $53, $54, $55, $56, $57, $58, $59, $60, $61, $62, $63, $64, $65
        )
        RETURNING *
      `, [
        name, is_default || false, logo_url,
        company_name, company_address, company_phone, company_email,
        company_siret, company_tva, company_rcs, company_capital, company_legal_form,
        is_micro_entreprise || false, late_payment_penalty, recovery_indemnity,
        primary_color || '#2563EB', secondary_color, text_color, secondary_text_color,
        table_header_color, border_color, header_background_color, total_color,
        template_layout || 'professional', font_family || 'Inter', header_text, footer_text,
        invoice_title, invoice_number_prefix, client_label,
        client_name_placeholder, client_address_placeholder,
        table_header_description, table_header_quantity, table_header_unit_price, table_header_total,
        sample_item_description, subtotal_label, vat_label, total_label,
        payment_terms, bank_iban, bank_bic, bank_name,
        show_logo !== false, show_header !== false, show_footer !== false,
        show_payment_terms !== false, show_bank_details !== false, show_legal_mentions !== false,
        cgv_text, custom_note, footer_custom_text, background_image_url,
        decimal_places || 2, column_description_label || 'Description', column_quantity_label || 'Quantité',
        column_unit_price_label || 'Prix unitaire', column_vat_label || 'TVA', column_total_label || 'Total',
        show_cgv !== false, show_custom_note || false,
        date_format || 'dd/MM/yyyy', currency_symbol || '€', currency_position || 'after'
      ]);

      await client.query('COMMIT');

      res.status(201).json(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error creating template:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/templates/:id - Update template
router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      is_default,
      logo_url,
      company_name,
      company_address,
      company_phone,
      company_email,
      company_siret,
      company_tva,
      company_rcs,
      company_capital,
      company_legal_form,
      is_micro_entreprise,
      late_payment_penalty,
      recovery_indemnity,
      primary_color,
      secondary_color,
      text_color,
      secondary_text_color,
      table_header_color,
      border_color,
      header_background_color,
      total_color,
      template_layout,
      font_family,
      header_text,
      footer_text,
      invoice_title,
      invoice_number_prefix,
      client_label,
      client_name_placeholder,
      client_address_placeholder,
      table_header_description,
      table_header_quantity,
      table_header_unit_price,
      table_header_total,
      sample_item_description,
      subtotal_label,
      vat_label,
      total_label,
      payment_terms,
      bank_iban,
      bank_bic,
      bank_name,
      show_logo,
      show_header,
      show_footer,
      show_payment_terms,
      show_bank_details,
      show_legal_mentions,
      // New fields
      cgv_text,
      custom_note,
      footer_custom_text,
      background_image_url,
      decimal_places,
      column_description_label,
      column_quantity_label,
      column_unit_price_label,
      column_vat_label,
      column_total_label,
      show_cgv,
      show_custom_note,
      date_format,
      currency_symbol,
      currency_position,
    } = req.body;

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // If setting as default, unset all other defaults
      if (is_default) {
        await client.query(`
          UPDATE invoice_templates
          SET is_default = false
          WHERE is_default = true AND id != $1
        `, [id]);
      }

      const result = await client.query(`
        UPDATE invoice_templates
        SET
          name = $1, is_default = $2, logo_url = $3,
          company_name = $4, company_address = $5, company_phone = $6, company_email = $7,
          company_siret = $8, company_tva = $9, company_rcs = $10, company_capital = $11,
          company_legal_form = $12, is_micro_entreprise = $13,
          late_payment_penalty = $14, recovery_indemnity = $15,
          primary_color = $16, secondary_color = $17, text_color = $18, secondary_text_color = $19,
          table_header_color = $20, border_color = $21, header_background_color = $22, total_color = $23,
          template_layout = $24, font_family = $25, header_text = $26, footer_text = $27,
          invoice_title = $28, invoice_number_prefix = $29, client_label = $30,
          client_name_placeholder = $31, client_address_placeholder = $32,
          table_header_description = $33, table_header_quantity = $34,
          table_header_unit_price = $35, table_header_total = $36,
          sample_item_description = $37, subtotal_label = $38, vat_label = $39, total_label = $40,
          payment_terms = $41, bank_iban = $42, bank_bic = $43, bank_name = $44,
          show_logo = $45, show_header = $46, show_footer = $47,
          show_payment_terms = $48, show_bank_details = $49, show_legal_mentions = $50,
          cgv_text = $51, custom_note = $52, footer_custom_text = $53, background_image_url = $54,
          decimal_places = $55, column_description_label = $56, column_quantity_label = $57,
          column_unit_price_label = $58, column_vat_label = $59, column_total_label = $60,
          show_cgv = $61, show_custom_note = $62, date_format = $63, currency_symbol = $64, currency_position = $65,
          updated_at = NOW()
        WHERE id = $66
        RETURNING *
      `, [
        name, is_default, logo_url,
        company_name, company_address, company_phone, company_email,
        company_siret, company_tva, company_rcs, company_capital,
        company_legal_form, is_micro_entreprise,
        late_payment_penalty, recovery_indemnity,
        primary_color, secondary_color, text_color, secondary_text_color,
        table_header_color, border_color, header_background_color, total_color,
        template_layout, font_family, header_text, footer_text,
        invoice_title, invoice_number_prefix, client_label,
        client_name_placeholder, client_address_placeholder,
        table_header_description, table_header_quantity,
        table_header_unit_price, table_header_total,
        sample_item_description, subtotal_label, vat_label, total_label,
        payment_terms, bank_iban, bank_bic, bank_name,
        show_logo, show_header, show_footer,
        show_payment_terms, show_bank_details, show_legal_mentions,
        cgv_text, custom_note, footer_custom_text, background_image_url,
        decimal_places, column_description_label, column_quantity_label,
        column_unit_price_label, column_vat_label, column_total_label,
        show_cgv, show_custom_note, date_format, currency_symbol, currency_position,
        id,
      ]);

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        res.status(404).json({ error: 'Template not found' });
        return;
      }

      await client.query('COMMIT');

      res.json(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error updating template:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/templates/:id - Delete template
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Check if template exists
    const checkResult = await pool.query(`
      SELECT id FROM invoice_templates WHERE id = $1
    `, [id]);

    if (checkResult.rows.length === 0) {
      res.status(404).json({ error: 'Template not found' });
      return;
    }

    const result = await pool.query(`
      DELETE FROM invoice_templates
      WHERE id = $1
      RETURNING id
    `, [id]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Template not found' });
      return;
    }

    res.json({ message: 'Template deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting template:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
