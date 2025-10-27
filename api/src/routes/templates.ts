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
          show_bank_details
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
        RETURNING *
      `, [
        name,
        is_default || false,
        logo_url,
        company_name,
        company_address,
        company_phone,
        company_email,
        company_siret,
        company_tva,
        primary_color || '#007AFF',
        secondary_color,
        template_layout || 'classic',
        header_text,
        footer_text,
        payment_terms,
        bank_details,
        show_logo !== false,
        show_company_info !== false,
        show_payment_terms !== false,
        show_bank_details !== false,
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
          name = $1,
          is_default = $2,
          logo_url = $3,
          company_name = $4,
          company_address = $5,
          company_phone = $6,
          company_email = $7,
          company_siret = $8,
          company_tva = $9,
          primary_color = $10,
          secondary_color = $11,
          template_layout = $12,
          header_text = $13,
          footer_text = $14,
          payment_terms = $15,
          bank_details = $16,
          show_logo = $17,
          show_company_info = $18,
          show_payment_terms = $19,
          show_bank_details = $20,
          updated_at = NOW()
        WHERE id = $21
        RETURNING *
      `, [
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

// DELETE /api/templates/:id - Soft delete template
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Check if template is default
    const checkResult = await pool.query(`
      SELECT is_default FROM invoice_templates WHERE id = $1
    `, [id]);

    if (checkResult.rows.length === 0) {
      res.status(404).json({ error: 'Template not found' });
      return;
    }

    if (checkResult.rows[0].is_default) {
      res.status(400).json({ error: 'Cannot delete default template' });
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
