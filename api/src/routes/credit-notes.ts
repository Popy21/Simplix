import express, { Request, Response } from 'express';
import { pool } from '../database/connection';
import { authenticateToken } from '../middleware/auth';
import { requireOrganization } from '../middleware/organization';
import logger from '../utils/logger';

const router = express.Router();

// Middleware
router.use(authenticateToken);
router.use(requireOrganization);

/**
 * GET /api/credit-notes
 * Liste des avoirs
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { organization_id } = req.body;
    const { status, customer_id } = req.query;

    let query = `
      SELECT
        cn.*,
        i.invoice_number as original_invoice_number,
        c.name as customer_name,
        u.name as created_by_name
      FROM credit_notes cn
      LEFT JOIN invoices i ON i.id = cn.original_invoice_id
      LEFT JOIN contacts c ON c.id = cn.customer_id
      LEFT JOIN users u ON u.id = cn.created_by
      WHERE cn.organization_id = $1 AND cn.deleted_at IS NULL
    `;

    const params: any[] = [organization_id];
    let paramIndex = 2;

    if (status) {
      query += ` AND cn.status = $${paramIndex++}`;
      params.push(status);
    }

    if (customer_id) {
      query += ` AND cn.customer_id = $${paramIndex++}`;
      params.push(customer_id);
    }

    query += ` ORDER BY cn.issue_date DESC, cn.created_at DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    logger.error('Error fetching credit notes:', error);
    res.status(500).json({ error: 'Failed to fetch credit notes' });
  }
});

/**
 * GET /api/credit-notes/:id
 * Détails avoir
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { organization_id } = req.body;

    const result = await pool.query(
      `SELECT cn.*,
        i.invoice_number as original_invoice_number,
        c.name as customer_name,
        c.email as customer_email
       FROM credit_notes cn
       LEFT JOIN invoices i ON i.id = cn.original_invoice_id
       LEFT JOIN contacts c ON c.id = cn.customer_id
       WHERE cn.id = $1 AND cn.organization_id = $2 AND cn.deleted_at IS NULL`,
      [id, organization_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Credit note not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Error fetching credit note:', error);
    res.status(500).json({ error: 'Failed to fetch credit note' });
  }
});

/**
 * POST /api/credit-notes
 * Créer un avoir
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      organization_id,
      user_id,
      original_invoice_id,
      credit_note_type,
      issue_date = new Date(),
      items,
      subtotal_amount,
      tax_amount = 0,
      total_amount,
      reason,
      refund_method = 'credit_balance',
      notes
    } = req.body;

    // Validation
    if (!original_invoice_id || !credit_note_type || !items || !total_amount || !reason) {
      return res.status(400).json({
        error: 'Original invoice, type, items, amount and reason are required'
      });
    }

    // Récupérer facture originale
    const invoiceResult = await pool.query(
      `SELECT * FROM invoices
       WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL`,
      [original_invoice_id, organization_id]
    );

    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Original invoice not found' });
    }

    const invoice = invoiceResult.rows[0];

    // Vérifier montant (ne peut pas dépasser facture originale)
    if (total_amount > parseFloat(invoice.total_amount)) {
      return res.status(400).json({
        error: 'Credit note amount cannot exceed original invoice amount'
      });
    }

    // Créer avoir
    const result = await pool.query(
      `INSERT INTO credit_notes (
        organization_id, original_invoice_id, customer_id, company_id,
        credit_note_type, issue_date, items, subtotal_amount, tax_amount, total_amount,
        reason, refund_method, notes, created_by, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'issued')
      RETURNING *`,
      [
        organization_id,
        original_invoice_id,
        invoice.customer_id,
        invoice.company_id,
        credit_note_type,
        issue_date,
        JSON.stringify(items),
        subtotal_amount,
        tax_amount,
        total_amount,
        reason,
        refund_method,
        notes,
        user_id
      ]
    );

    const creditNote = result.rows[0];

    // Si remboursement complet, marquer facture comme cancelled
    if (credit_note_type === 'full_refund') {
      await pool.query(
        `UPDATE invoices SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [original_invoice_id]
      );
    }

    logger.info(`Credit note created: ${creditNote.credit_note_number}`);
    res.status(201).json(creditNote);
  } catch (error) {
    logger.error('Error creating credit note:', error);
    res.status(500).json({ error: 'Failed to create credit note' });
  }
});

/**
 * POST /api/credit-notes/from-invoice/:invoice_id
 * Créer avoir automatiquement depuis facture (remboursement complet)
 */
router.post('/from-invoice/:invoice_id', async (req: Request, res: Response) => {
  try {
    const { invoice_id } = req.params;
    const { organization_id, user_id, reason, refund_method = 'bank_transfer' } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Reason is required' });
    }

    // Récupérer facture
    const invoiceResult = await pool.query(
      `SELECT * FROM invoices
       WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL`,
      [invoice_id, organization_id]
    );

    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const invoice = invoiceResult.rows[0];

    // Créer avoir complet
    const result = await pool.query(
      `INSERT INTO credit_notes (
        organization_id, original_invoice_id, customer_id, company_id,
        credit_note_type, issue_date, items, subtotal_amount, tax_amount, total_amount,
        reason, refund_method, created_by, status
      ) VALUES ($1, $2, $3, $4, 'full_refund', CURRENT_DATE, $5, $6, $7, $8, $9, $10, $11, 'issued')
      RETURNING *`,
      [
        organization_id,
        invoice_id,
        invoice.customer_id,
        invoice.company_id,
        invoice.items,
        invoice.subtotal_amount,
        invoice.tax_amount,
        invoice.total_amount,
        reason,
        refund_method,
        user_id
      ]
    );

    // Marquer facture comme cancelled
    await pool.query(
      `UPDATE invoices SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [invoice_id]
    );

    logger.info(`Full credit note created from invoice: ${invoice.invoice_number}`);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    logger.error('Error creating credit note from invoice:', error);
    res.status(500).json({ error: 'Failed to create credit note' });
  }
});

/**
 * POST /api/credit-notes/:id/apply
 * Appliquer avoir à une facture
 */
router.post('/:id/apply', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { organization_id, invoice_id } = req.body;

    if (!invoice_id) {
      return res.status(400).json({ error: 'Invoice ID is required' });
    }

    // Vérifier avoir
    const creditNoteResult = await pool.query(
      `SELECT * FROM credit_notes
       WHERE id = $1 AND organization_id = $2 AND status = 'issued' AND deleted_at IS NULL`,
      [id, organization_id]
    );

    if (creditNoteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Credit note not found or already applied' });
    }

    const creditNote = creditNoteResult.rows[0];

    // Vérifier facture
    const invoiceResult = await pool.query(
      `SELECT * FROM invoices
       WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL`,
      [invoice_id, organization_id]
    );

    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const invoice = invoiceResult.rows[0];

    // Appliquer avoir
    const creditAmount = parseFloat(creditNote.total_amount);
    const invoiceAmount = parseFloat(invoice.total_amount);
    const newAmount = Math.max(0, invoiceAmount - creditAmount);

    await pool.query(
      `UPDATE invoices SET
        total_amount = $1,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [newAmount, invoice_id]
    );

    // Marquer avoir comme appliqué
    await pool.query(
      `UPDATE credit_notes SET
        status = 'applied',
        applied_to_invoice_id = $1,
        applied_date = CURRENT_DATE,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [invoice_id, id]
    );

    logger.info(`Credit note ${creditNote.credit_note_number} applied to invoice ${invoice.invoice_number}`);
    res.json({
      message: 'Credit note applied successfully',
      new_invoice_amount: newAmount
    });
  } catch (error) {
    logger.error('Error applying credit note:', error);
    res.status(500).json({ error: 'Failed to apply credit note' });
  }
});

/**
 * POST /api/credit-notes/:id/cancel
 * Annuler un avoir
 */
router.post('/:id/cancel', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { organization_id } = req.body;

    const result = await pool.query(
      `UPDATE credit_notes SET
        status = 'cancelled',
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND organization_id = $2 AND status IN ('draft', 'issued') AND deleted_at IS NULL
       RETURNING *`,
      [id, organization_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Credit note not found or cannot be cancelled' });
    }

    logger.info(`Credit note cancelled: ${result.rows[0].credit_note_number}`);
    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Error cancelling credit note:', error);
    res.status(500).json({ error: 'Failed to cancel credit note' });
  }
});

/**
 * DELETE /api/credit-notes/:id
 * Supprimer avoir
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { organization_id } = req.body;

    // Seuls les avoirs en brouillon peuvent être supprimés
    const result = await pool.query(
      `UPDATE credit_notes SET
        deleted_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND organization_id = $2 AND status = 'draft' AND deleted_at IS NULL
       RETURNING *`,
      [id, organization_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Credit note not found or cannot be deleted (only drafts can be deleted)'
      });
    }

    logger.info(`Credit note deleted: ${result.rows[0].credit_note_number}`);
    res.json({ message: 'Credit note deleted successfully' });
  } catch (error) {
    logger.error('Error deleting credit note:', error);
    res.status(500).json({ error: 'Failed to delete credit note' });
  }
});

/**
 * GET /api/credit-notes/stats
 * Statistiques avoirs
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const { organization_id } = req.body;
    const { period = '30' } = req.query;

    const result = await pool.query(
      `SELECT
        COUNT(*) as total_count,
        COUNT(*) FILTER (WHERE status = 'issued') as issued_count,
        COUNT(*) FILTER (WHERE status = 'applied') as applied_count,
        COALESCE(SUM(total_amount), 0) as total_amount,
        COALESCE(SUM(total_amount) FILTER (WHERE issue_date >= CURRENT_DATE - INTERVAL '1 day' * $2), 0) as period_amount,
        COALESCE(SUM(total_amount) FILTER (WHERE credit_note_type = 'full_refund'), 0) as full_refund_amount
       FROM credit_notes
       WHERE organization_id = $1 AND deleted_at IS NULL`,
      [organization_id, period]
    );

    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Error fetching credit note stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

export default router;
