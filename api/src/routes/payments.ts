import { Router, Response } from 'express';
import { pool } from '../database/db';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requireOrganization } from '../middleware/multiTenancy';
import { getOrgIdFromRequest } from '../utils/multiTenancyHelper';

const router = Router();

/**
 * GET /api/payments
 * Récupérer tous les paiements
 */
router.get('/', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  try {
    const orgId = getOrgIdFromRequest(req);
    const { invoice_id, from_date, to_date, payment_method } = req.query;

    let query = `
      SELECT
        p.*,
        i.invoice_number,
        i.total_amount as invoice_total,
        c.first_name || ' ' || COALESCE(c.last_name, '') as customer_name,
        co.name as customer_company,
        u.first_name || ' ' || COALESCE(u.last_name, '') as created_by_name
      FROM payments p
      JOIN invoices i ON p.invoice_id = i.id
      LEFT JOIN contacts c ON i.customer_id = c.id
      LEFT JOIN companies co ON c.company_id = co.id
      LEFT JOIN users u ON p.created_by = u.id
      WHERE i.organization_id = $1
    `;

    const params: any[] = [orgId];
    let paramCount = 2;

    if (invoice_id) {
      query += ` AND p.invoice_id = $${paramCount}`;
      params.push(invoice_id);
      paramCount++;
    }

    if (from_date) {
      query += ` AND p.payment_date >= $${paramCount}`;
      params.push(from_date);
      paramCount++;
    }

    if (to_date) {
      query += ` AND p.payment_date <= $${paramCount}`;
      params.push(to_date);
      paramCount++;
    }

    if (payment_method) {
      query += ` AND p.payment_method = $${paramCount}`;
      params.push(payment_method);
      paramCount++;
    }

    query += ` ORDER BY p.payment_date DESC, p.id DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Erreur lors de la récupération des paiements:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/payments/stats
 * Statistiques des paiements
 */
router.get('/stats', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  try {
    const orgId = getOrgIdFromRequest(req);
    const { period = 'month' } = req.query;

    let dateFormat = 'month';
    if (period === 'day') dateFormat = 'day';
    else if (period === 'week') dateFormat = 'week';
    else if (period === 'year') dateFormat = 'year';

    const stats = await pool.query(`
      SELECT
        DATE_TRUNC($1, p.payment_date) as period,
        p.payment_method,
        COUNT(*) as payment_count,
        SUM(p.amount) as total_amount
      FROM payments p
      JOIN invoices i ON p.invoice_id = i.id
      WHERE i.organization_id = $2 AND p.payment_date >= CURRENT_DATE - INTERVAL '6 months'
      GROUP BY DATE_TRUNC($1, p.payment_date), p.payment_method
      ORDER BY period DESC, p.payment_method
    `, [dateFormat, orgId]);

    // Total global
    const totalStats = await pool.query(`
      SELECT
        COUNT(*) as total_payments,
        SUM(p.amount) as total_amount,
        AVG(p.amount) as average_payment,
        COUNT(DISTINCT p.invoice_id) as invoices_paid
      FROM payments p
      JOIN invoices i ON p.invoice_id = i.id
      WHERE i.organization_id = $1
    `, [orgId]);

    res.json({
      by_period: stats.rows,
      total: totalStats.rows[0]
    });
  } catch (error: any) {
    console.error('Erreur lors de la récupération des statistiques de paiements:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/payments/:id
 * Récupérer un paiement spécifique
 */
router.get('/:id', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const orgId = getOrgIdFromRequest(req);

    const result = await pool.query(`
      SELECT
        p.*,
        i.invoice_number,
        i.total_amount as invoice_total,
        c.first_name || ' ' || COALESCE(c.last_name, '') as customer_name,
        c.email as customer_email,
        co.name as customer_company,
        u.first_name || ' ' || COALESCE(u.last_name, '') as created_by_name
      FROM payments p
      JOIN invoices i ON p.invoice_id = i.id
      LEFT JOIN contacts c ON i.customer_id = c.id
      LEFT JOIN companies co ON c.company_id = co.id
      LEFT JOIN users u ON p.created_by = u.id
      WHERE p.id = $1 AND i.organization_id = $2
    `, [id, orgId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Paiement non trouvé' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Erreur lors de la récupération du paiement:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/payments
 * Créer un nouveau paiement
 */
router.post('/', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const orgId = getOrgIdFromRequest(req);
    const userId = req.user?.id;

    const {
      invoice_id,
      payment_date,
      amount,
      payment_method,
      reference,
      transaction_id,
      notes
    } = req.body;

    // Validation
    if (!invoice_id || !amount || !payment_method) {
      return res.status(400).json({ error: 'Champs requis manquants' });
    }

    // Vérifier que la facture existe et appartient à l'organisation
    const invoiceResult = await client.query(`
      SELECT
        *,
        (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE invoice_id = $1) as total_paid
      FROM invoices
      WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
    `, [invoice_id, orgId]);

    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Facture non trouvée' });
    }

    const invoice = invoiceResult.rows[0];
    const totalPaid = parseFloat(invoice.total_paid);
    const balanceDue = parseFloat(invoice.total_amount) - totalPaid;

    if (balanceDue <= 0) {
      return res.status(400).json({ error: 'Cette facture est déjà entièrement payée' });
    }

    if (parseFloat(amount) > balanceDue) {
      return res.status(400).json({
        error: `Le montant du paiement (${amount}€) dépasse le solde dû (${balanceDue}€)`
      });
    }

    // Créer le paiement
    const paymentResult = await client.query(`
      INSERT INTO payments (
        invoice_id, payment_date, amount, payment_method,
        reference, transaction_id, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      invoice_id,
      payment_date || new Date().toISOString().split('T')[0],
      amount,
      payment_method,
      reference,
      transaction_id,
      notes,
      userId
    ]);

    const payment = paymentResult.rows[0];

    // Calculer le nouveau total payé
    const newTotalPaid = totalPaid + parseFloat(amount);
    const newBalanceDue = parseFloat(invoice.total_amount) - newTotalPaid;

    // Mettre à jour le statut de la facture si entièrement payée
    if (newBalanceDue <= 0.01) {
      await client.query(`
        UPDATE invoices
        SET status = 'paid', updated_at = NOW()
        WHERE id = $1
      `, [invoice_id]);
    } else if (invoice.status === 'draft') {
      await client.query(`
        UPDATE invoices
        SET status = 'sent', updated_at = NOW()
        WHERE id = $1
      `, [invoice_id]);
    }

    await client.query('COMMIT');

    res.status(201).json({
      payment: payment,
      invoice: {
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        total_amount: invoice.total_amount,
        total_paid: newTotalPaid,
        balance_due: newBalanceDue,
        status: newBalanceDue <= 0.01 ? 'paid' : invoice.status
      }
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Erreur lors de la création du paiement:', error);

    if (error.code === '23503') {
      return res.status(400).json({ error: 'Facture invalide' });
    }

    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

/**
 * DELETE /api/payments/:id
 * Supprimer un paiement
 */
router.delete('/:id', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const orgId = getOrgIdFromRequest(req);

    // Récupérer le paiement et vérifier qu'il appartient à l'organisation
    const paymentResult = await client.query(`
      SELECT p.*, i.organization_id
      FROM payments p
      JOIN invoices i ON p.invoice_id = i.id
      WHERE p.id = $1 AND i.organization_id = $2
    `, [id, orgId]);

    if (paymentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Paiement non trouvé' });
    }

    const payment = paymentResult.rows[0];
    const invoiceId = payment.invoice_id;

    // Supprimer le paiement
    await client.query('DELETE FROM payments WHERE id = $1', [id]);

    // Recalculer le statut de la facture
    const invoiceResult = await client.query(`
      SELECT
        *,
        (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE invoice_id = $1) as total_paid
      FROM invoices
      WHERE id = $1
    `, [invoiceId]);

    if (invoiceResult.rows.length > 0) {
      const invoice = invoiceResult.rows[0];
      const totalPaid = parseFloat(invoice.total_paid);
      const balanceDue = parseFloat(invoice.total_amount) - totalPaid;

      let newStatus = invoice.status;
      if (balanceDue > 0 && invoice.status === 'paid') {
        if (new Date(invoice.due_date) < new Date()) {
          newStatus = 'overdue';
        } else {
          newStatus = 'sent';
        }

        await client.query(`
          UPDATE invoices
          SET status = $1, updated_at = NOW()
          WHERE id = $2
        `, [newStatus, invoiceId]);
      }
    }

    await client.query('COMMIT');

    res.json({ message: 'Paiement supprimé avec succès' });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Erreur lors de la suppression du paiement:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

/**
 * POST /api/payments/process-card
 * Process credit card payment
 */
router.post('/process-card', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const orgId = getOrgIdFromRequest(req);
    const userId = req.user?.id;
    const { invoice_id, amount, card_token } = req.body;

    if (!invoice_id || !amount || !card_token) {
      return res.status(400).json({ error: 'invoice_id, amount, and card_token are required' });
    }

    // TODO: Integrate with actual payment processor (Stripe, etc.)
    // For now, simulate successful payment
    const transaction_id = 'CARD-' + Date.now();
    const reference = 'TXN-' + Date.now();

    // Verify invoice belongs to organization
    const invoiceResult = await client.query(
      'SELECT * FROM invoices WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL',
      [invoice_id, orgId]
    );

    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Facture non trouvée' });
    }

    // Create payment record
    await client.query(`
      INSERT INTO payments (
        invoice_id, payment_date, amount, payment_method,
        reference, transaction_id, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      invoice_id,
      new Date().toISOString().split('T')[0],
      amount,
      'card',
      reference,
      transaction_id,
      'Credit card payment',
      userId
    ]);

    await client.query('COMMIT');

    res.json({ message: 'Card payment processed successfully', transaction_id });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error processing card payment:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

/**
 * POST /api/payments/process-apple-pay
 * Process Apple Pay payment
 */
router.post('/process-apple-pay', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const orgId = getOrgIdFromRequest(req);
    const userId = req.user?.id;
    const { invoice_id, amount, apple_pay_token } = req.body;

    if (!invoice_id || !amount || !apple_pay_token) {
      return res.status(400).json({ error: 'invoice_id, amount, and apple_pay_token are required' });
    }

    // TODO: Integrate with actual Apple Pay processor
    const transaction_id = 'APPLE-' + Date.now();
    const reference = 'TXN-' + Date.now();

    // Verify invoice belongs to organization
    const invoiceResult = await client.query(
      'SELECT * FROM invoices WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL',
      [invoice_id, orgId]
    );

    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Facture non trouvée' });
    }

    // Create payment record
    await client.query(`
      INSERT INTO payments (
        invoice_id, payment_date, amount, payment_method,
        reference, transaction_id, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      invoice_id,
      new Date().toISOString().split('T')[0],
      amount,
      'apple_pay',
      reference,
      transaction_id,
      'Apple Pay payment',
      userId
    ]);

    await client.query('COMMIT');

    res.json({ message: 'Apple Pay payment processed successfully', transaction_id });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error processing Apple Pay payment:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

/**
 * POST /api/payments/process-google-pay
 * Process Google Pay payment
 */
router.post('/process-google-pay', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const orgId = getOrgIdFromRequest(req);
    const userId = req.user?.id;
    const { invoice_id, amount, google_pay_token } = req.body;

    if (!invoice_id || !amount || !google_pay_token) {
      return res.status(400).json({ error: 'invoice_id, amount, and google_pay_token are required' });
    }

    // TODO: Integrate with actual Google Pay processor
    const transaction_id = 'GOOGLE-' + Date.now();
    const reference = 'TXN-' + Date.now();

    // Verify invoice belongs to organization
    const invoiceResult = await client.query(
      'SELECT * FROM invoices WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL',
      [invoice_id, orgId]
    );

    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Facture non trouvée' });
    }

    // Create payment record
    await client.query(`
      INSERT INTO payments (
        invoice_id, payment_date, amount, payment_method,
        reference, transaction_id, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      invoice_id,
      new Date().toISOString().split('T')[0],
      amount,
      'google_pay',
      reference,
      transaction_id,
      'Google Pay payment',
      userId
    ]);

    await client.query('COMMIT');

    res.json({ message: 'Google Pay payment processed successfully', transaction_id });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error processing Google Pay payment:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

export default router;
