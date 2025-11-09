import express, { Request, Response } from 'express';
import { pool } from '../database/connection';
import { authenticateToken } from '../middleware/auth';
import { requireOrganization } from '../middleware/organization';
import logger from '../utils/logger';
import { addDays, addWeeks, addMonths, addYears, format } from 'date-fns';

const router = express.Router();

// Middleware
router.use(authenticateToken);
router.use(requireOrganization);

/**
 * Calculer prochaine date facture selon fréquence
 */
function calculateNextInvoiceDate(current_date: Date, frequency: string, interval: number = 1): Date {
  switch (frequency) {
    case 'daily':
      return addDays(current_date, interval);
    case 'weekly':
      return addWeeks(current_date, interval);
    case 'biweekly':
      return addWeeks(current_date, 2 * interval);
    case 'monthly':
      return addMonths(current_date, interval);
    case 'quarterly':
      return addMonths(current_date, 3 * interval);
    case 'semi_annual':
      return addMonths(current_date, 6 * interval);
    case 'annual':
      return addYears(current_date, interval);
    default:
      return addMonths(current_date, interval);
  }
}

/**
 * GET /api/recurring-invoices
 * Liste des factures récurrentes
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { organization_id } = req.body;
    const { status, is_active } = req.query;

    let query = `
      SELECT
        ri.*,
        c.name as customer_name,
        c.email as customer_email,
        co.name as company_name
      FROM recurring_invoices ri
      LEFT JOIN contacts c ON c.id = ri.customer_id
      LEFT JOIN companies co ON co.id = ri.company_id
      WHERE ri.organization_id = $1 AND ri.deleted_at IS NULL
    `;

    const params: any[] = [organization_id];
    let paramIndex = 2;

    if (status) {
      query += ` AND ri.status = $${paramIndex++}`;
      params.push(status);
    }

    if (is_active !== undefined) {
      query += ` AND ri.is_active = $${paramIndex++}`;
      params.push(is_active === 'true');
    }

    query += ` ORDER BY ri.next_invoice_date ASC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    logger.error('Error fetching recurring invoices:', error);
    res.status(500).json({ error: 'Failed to fetch recurring invoices' });
  }
});

/**
 * GET /api/recurring-invoices/:id
 * Détails facture récurrente
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { organization_id } = req.body;

    const result = await pool.query(
      `SELECT ri.*,
        c.name as customer_name,
        c.email as customer_email
       FROM recurring_invoices ri
       LEFT JOIN contacts c ON c.id = ri.customer_id
       WHERE ri.id = $1 AND ri.organization_id = $2 AND ri.deleted_at IS NULL`,
      [id, organization_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Recurring invoice not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Error fetching recurring invoice:', error);
    res.status(500).json({ error: 'Failed to fetch recurring invoice' });
  }
});

/**
 * POST /api/recurring-invoices
 * Créer facture récurrente
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      organization_id,
      customer_id,
      company_id,
      frequency,
      interval_count = 1,
      start_date,
      end_date,
      title,
      description,
      items,
      subtotal_amount,
      tax_amount = 0,
      discount_amount = 0,
      total_amount,
      auto_send = true,
      payment_terms = 30,
      payment_method,
      invoice_template_id,
      notes
    } = req.body;

    // Validation
    if (!customer_id || !frequency || !start_date || !items || !total_amount) {
      return res.status(400).json({
        error: 'Customer, frequency, start date, items and total amount are required'
      });
    }

    // Calculer next_invoice_date
    const next_invoice_date = new Date(start_date);

    const result = await pool.query(
      `INSERT INTO recurring_invoices (
        organization_id, customer_id, company_id, frequency, interval_count,
        start_date, end_date, next_invoice_date, title, description, items,
        subtotal_amount, tax_amount, discount_amount, total_amount,
        auto_send, payment_terms, payment_method, invoice_template_id, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING *`,
      [
        organization_id, customer_id, company_id, frequency, interval_count,
        start_date, end_date, next_invoice_date, title, description, JSON.stringify(items),
        subtotal_amount, tax_amount, discount_amount, total_amount,
        auto_send, payment_terms, payment_method, invoice_template_id, notes
      ]
    );

    logger.info(`Recurring invoice created: ${result.rows[0].id}`);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    logger.error('Error creating recurring invoice:', error);
    res.status(500).json({ error: 'Failed to create recurring invoice' });
  }
});

/**
 * PUT /api/recurring-invoices/:id
 * Modifier facture récurrente
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { organization_id, ...updates } = req.body;

    const allowedUpdates = [
      'frequency', 'interval_count', 'end_date', 'title', 'description',
      'items', 'subtotal_amount', 'tax_amount', 'discount_amount', 'total_amount',
      'auto_send', 'payment_terms', 'payment_method', 'notes', 'status'
    ];

    const setClause = [];
    const values: any[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (allowedUpdates.includes(key) && value !== undefined) {
        setClause.push(`${key} = $${paramIndex++}`);
        values.push(key === 'items' ? JSON.stringify(value) : value);
      }
    }

    if (setClause.length === 0) {
      return res.status(400).json({ error: 'No valid updates provided' });
    }

    setClause.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id, organization_id);

    const result = await pool.query(
      `UPDATE recurring_invoices SET ${setClause.join(', ')}
       WHERE id = $${paramIndex++} AND organization_id = $${paramIndex} AND deleted_at IS NULL
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Recurring invoice not found' });
    }

    logger.info(`Recurring invoice updated: ${id}`);
    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Error updating recurring invoice:', error);
    res.status(500).json({ error: 'Failed to update recurring invoice' });
  }
});

/**
 * POST /api/recurring-invoices/:id/pause
 * Mettre en pause
 */
router.post('/:id/pause', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { organization_id } = req.body;

    const result = await pool.query(
      `UPDATE recurring_invoices SET
        status = 'paused',
        is_active = false,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
       RETURNING *`,
      [id, organization_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Recurring invoice not found' });
    }

    logger.info(`Recurring invoice paused: ${id}`);
    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Error pausing recurring invoice:', error);
    res.status(500).json({ error: 'Failed to pause recurring invoice' });
  }
});

/**
 * POST /api/recurring-invoices/:id/resume
 * Reprendre
 */
router.post('/:id/resume', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { organization_id } = req.body;

    const result = await pool.query(
      `UPDATE recurring_invoices SET
        status = 'active',
        is_active = true,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
       RETURNING *`,
      [id, organization_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Recurring invoice not found' });
    }

    logger.info(`Recurring invoice resumed: ${id}`);
    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Error resuming recurring invoice:', error);
    res.status(500).json({ error: 'Failed to resume recurring invoice' });
  }
});

/**
 * POST /api/recurring-invoices/:id/cancel
 * Annuler
 */
router.post('/:id/cancel', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { organization_id } = req.body;

    const result = await pool.query(
      `UPDATE recurring_invoices SET
        status = 'cancelled',
        is_active = false,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
       RETURNING *`,
      [id, organization_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Recurring invoice not found' });
    }

    logger.info(`Recurring invoice cancelled: ${id}`);
    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Error cancelling recurring invoice:', error);
    res.status(500).json({ error: 'Failed to cancel recurring invoice' });
  }
});

/**
 * POST /api/recurring-invoices/:id/generate-now
 * Générer facture immédiatement (hors planning)
 */
router.post('/:id/generate-now', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { organization_id } = req.body;

    // Récupérer facture récurrente
    const recurringResult = await pool.query(
      `SELECT * FROM recurring_invoices
       WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL`,
      [id, organization_id]
    );

    if (recurringResult.rows.length === 0) {
      return res.status(404).json({ error: 'Recurring invoice not found' });
    }

    const recurring = recurringResult.rows[0];

    // Générer facture
    const issueDate = new Date();
    const dueDate = addDays(issueDate, recurring.payment_terms);

    const invoiceResult = await pool.query(
      `INSERT INTO invoices (
        organization_id, customer_id, company_id, issue_date, due_date,
        items, subtotal_amount, tax_amount, discount_amount, total_amount,
        status, notes, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'sent', $11, $12)
      RETURNING *`,
      [
        organization_id,
        recurring.customer_id,
        recurring.company_id,
        issueDate,
        dueDate,
        recurring.items,
        recurring.subtotal_amount,
        recurring.tax_amount,
        recurring.discount_amount,
        recurring.total_amount,
        recurring.notes,
        JSON.stringify({ recurring_invoice_id: id, generated_manually: true })
      ]
    );

    const invoice = invoiceResult.rows[0];

    // Mettre à jour récurrente (mais ne pas changer next_invoice_date car manuel)
    await pool.query(
      `UPDATE recurring_invoices SET
        last_generated_at = CURRENT_TIMESTAMP,
        last_invoice_id = $1,
        total_invoices_generated = total_invoices_generated + 1,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [invoice.id, id]
    );

    logger.info(`Manual invoice generated from recurring: ${invoice.invoice_number}`);
    res.status(201).json(invoice);
  } catch (error) {
    logger.error('Error generating invoice:', error);
    res.status(500).json({ error: 'Failed to generate invoice' });
  }
});

/**
 * POST /api/recurring-invoices/process-due
 * Traiter toutes les factures récurrentes dues (CRON)
 */
router.post('/process-due', async (req: Request, res: Response) => {
  try {
    const { organization_id } = req.body;

    // Récupérer factures récurrentes dues
    const dueInvoices = await pool.query(
      `SELECT * FROM recurring_invoices
       WHERE organization_id = $1
         AND is_active = true
         AND status = 'active'
         AND next_invoice_date <= CURRENT_DATE
         AND (end_date IS NULL OR end_date >= CURRENT_DATE)
         AND deleted_at IS NULL
       ORDER BY next_invoice_date ASC`,
      [organization_id]
    );

    const generated = [];
    const errors = [];

    for (const recurring of dueInvoices.rows) {
      try {
        // Générer facture
        const issueDate = new Date();
        const dueDate = addDays(issueDate, recurring.payment_terms);

        const invoiceResult = await pool.query(
          `INSERT INTO invoices (
            organization_id, customer_id, company_id, issue_date, due_date,
            items, subtotal_amount, tax_amount, discount_amount, total_amount,
            status, notes, metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          RETURNING *`,
          [
            organization_id,
            recurring.customer_id,
            recurring.company_id,
            issueDate,
            dueDate,
            recurring.items,
            recurring.subtotal_amount,
            recurring.tax_amount,
            recurring.discount_amount,
            recurring.total_amount,
            recurring.auto_send ? 'sent' : 'draft',
            recurring.notes,
            JSON.stringify({ recurring_invoice_id: recurring.id })
          ]
        );

        const invoice = invoiceResult.rows[0];

        // Calculer prochaine date
        const nextDate = calculateNextInvoiceDate(
          new Date(recurring.next_invoice_date),
          recurring.frequency,
          recurring.interval_count
        );

        // Mettre à jour récurrente
        await pool.query(
          `UPDATE recurring_invoices SET
            next_invoice_date = $1,
            last_generated_at = CURRENT_TIMESTAMP,
            last_invoice_id = $2,
            total_invoices_generated = total_invoices_generated + 1,
            updated_at = CURRENT_TIMESTAMP
           WHERE id = $3`,
          [nextDate, invoice.id, recurring.id]
        );

        generated.push(invoice);

        // TODO: Envoyer email si auto_send = true
      } catch (err: any) {
        errors.push({ recurring_id: recurring.id, error: err.message });
      }
    }

    logger.info(`Processed ${generated.length} recurring invoices`);
    res.json({
      generated: generated.length,
      errors: errors.length,
      invoices: generated,
      error_details: errors
    });
  } catch (error) {
    logger.error('Error processing recurring invoices:', error);
    res.status(500).json({ error: 'Failed to process recurring invoices' });
  }
});

/**
 * DELETE /api/recurring-invoices/:id
 * Supprimer facture récurrente
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { organization_id } = req.body;

    const result = await pool.query(
      `UPDATE recurring_invoices SET
        deleted_at = CURRENT_TIMESTAMP,
        is_active = false,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
       RETURNING *`,
      [id, organization_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Recurring invoice not found' });
    }

    logger.info(`Recurring invoice deleted: ${id}`);
    res.json({ message: 'Recurring invoice deleted successfully' });
  } catch (error) {
    logger.error('Error deleting recurring invoice:', error);
    res.status(500).json({ error: 'Failed to delete recurring invoice' });
  }
});

export default router;
