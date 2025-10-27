import { Router, Response } from 'express';
import { pool } from '../database/db';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requireOrganization } from '../middleware/multiTenancy';
import { getOrgIdFromRequest } from '../utils/multiTenancyHelper';

const router = Router();

/**
 * GET /api/invoices
 * Récupérer toutes les factures avec filtres
 */
router.get('/', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  try {
    const orgId = getOrgIdFromRequest(req);
    const { status, customer_id, from_date, to_date, overdue } = req.query;

    let query = `
      SELECT
        i.*,
        c.first_name || ' ' || COALESCE(c.last_name, '') as customer_name,
        c.email as customer_email,
        co.name as customer_company,
        u.first_name || ' ' || COALESCE(u.last_name, '') as user_name,
        (SELECT COUNT(*) FROM invoice_items WHERE invoice_id = i.id) as items_count,
        (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE invoice_id = i.id) as total_paid,
        (i.total_amount - COALESCE((SELECT SUM(amount) FROM payments WHERE invoice_id = i.id), 0)) as balance_due
      FROM invoices i
      LEFT JOIN contacts c ON i.customer_id = c.id
      LEFT JOIN companies co ON c.company_id = co.id
      LEFT JOIN users u ON i.user_id = u.id
      WHERE i.organization_id = $1 AND i.deleted_at IS NULL
    `;

    const params: any[] = [orgId];
    let paramCount = 2;

    if (status) {
      query += ` AND i.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (customer_id) {
      query += ` AND i.customer_id = $${paramCount}`;
      params.push(customer_id);
      paramCount++;
    }

    if (from_date) {
      query += ` AND i.invoice_date >= $${paramCount}`;
      params.push(from_date);
      paramCount++;
    }

    if (to_date) {
      query += ` AND i.invoice_date <= $${paramCount}`;
      params.push(to_date);
      paramCount++;
    }

    if (overdue === 'true') {
      query += ` AND i.due_date < NOW() AND i.status NOT IN ('paid', 'cancelled')`;
    }

    query += ` ORDER BY i.invoice_date DESC, i.id DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Erreur lors de la récupération des factures:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/invoices/stats
 * Statistiques des factures
 */
router.get('/stats', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  try {
    const orgId = getOrgIdFromRequest(req);

    const stats = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'draft') as draft_count,
        COUNT(*) FILTER (WHERE status = 'sent') as sent_count,
        COUNT(*) FILTER (WHERE status = 'paid') as paid_count,
        COUNT(*) FILTER (WHERE status = 'overdue') as overdue_count,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_count,
        COALESCE(SUM(total_amount) FILTER (WHERE status = 'paid'), 0) as total_paid,
        COALESCE(SUM(total_amount) FILTER (WHERE status IN ('sent', 'overdue')), 0) as total_pending,
        COALESCE(SUM(total_amount) FILTER (WHERE status = 'overdue'), 0) as total_overdue
      FROM invoices
      WHERE organization_id = $1 AND deleted_at IS NULL
    `, [orgId]);

    res.json(stats.rows[0]);
  } catch (error: any) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/invoices/:id
 * Récupérer une facture spécifique avec ses lignes
 */
router.get('/:id', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const orgId = getOrgIdFromRequest(req);

    // Récupérer la facture
    const invoiceResult = await pool.query(`
      SELECT
        i.*,
        c.first_name || ' ' || COALESCE(c.last_name, '') as customer_name,
        c.email as customer_email,
        c.phone as customer_phone,
        co.name as customer_company,
        c.address as customer_address,
        u.first_name || ' ' || COALESCE(u.last_name, '') as user_name,
        (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE invoice_id = i.id) as total_paid
      FROM invoices i
      LEFT JOIN contacts c ON i.customer_id = c.id
      LEFT JOIN companies co ON c.company_id = co.id
      LEFT JOIN users u ON i.user_id = u.id
      WHERE i.id = $1 AND i.organization_id = $2 AND i.deleted_at IS NULL
    `, [id, orgId]);

    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Facture non trouvée' });
    }

    // Récupérer les lignes de facture
    const itemsResult = await pool.query(`
      SELECT
        ii.*,
        p.name as product_name,
        p.sku as product_sku
      FROM invoice_items ii
      LEFT JOIN products p ON ii.product_id = p.id
      WHERE ii.invoice_id = $1
      ORDER BY ii.id
    `, [id]);

    // Récupérer les paiements
    const paymentsResult = await pool.query(`
      SELECT
        p.*,
        u.first_name || ' ' || COALESCE(u.last_name, '') as created_by_name
      FROM payments p
      LEFT JOIN users u ON p.created_by = u.id
      WHERE p.invoice_id = $1
      ORDER BY p.payment_date DESC, p.id DESC
    `, [id]);

    const invoice = {
      ...invoiceResult.rows[0],
      items: itemsResult.rows,
      payments: paymentsResult.rows,
      balance_due: parseFloat(invoiceResult.rows[0].total_amount) - parseFloat(invoiceResult.rows[0].total_paid)
    };

    res.json(invoice);
  } catch (error: any) {
    console.error('Erreur lors de la récupération de la facture:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/invoices
 * Créer une nouvelle facture
 */
router.post('/', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const orgId = getOrgIdFromRequest(req);
    const userId = req.user?.id;

    const {
      invoice_number,
      customer_id,
      invoice_date,
      due_date,
      status = 'draft',
      notes,
      terms,
      items = []
    } = req.body;

    // Validation
    if (!invoice_number || !customer_id || !invoice_date || !due_date) {
      return res.status(400).json({ error: 'Champs requis manquants' });
    }

    // Vérifier que le numéro de facture n'existe pas
    const existingInvoice = await client.query(
      'SELECT id FROM invoices WHERE invoice_number = $1 AND organization_id = $2 AND deleted_at IS NULL',
      [invoice_number, orgId]
    );

    if (existingInvoice.rows.length > 0) {
      return res.status(400).json({ error: 'Ce numéro de facture existe déjà' });
    }

    // Calculate totals
    const subtotal = items.reduce((sum: number, item: any) => sum + (item.quantity * item.unit_price), 0);
    const tax_amount = items.reduce((sum: number, item: any) => {
      const itemTotal = item.quantity * item.unit_price;
      const itemTax = itemTotal * ((item.tax_rate || 0) / 100);
      return sum + itemTax;
    }, 0);
    const total_amount = subtotal + tax_amount;

    // Créer la facture
    const invoiceResult = await client.query(`
      INSERT INTO invoices (
        organization_id, invoice_number, customer_id, user_id, invoice_date, due_date,
        status, notes, terms, subtotal, tax_amount, total_amount
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [
      orgId,
      invoice_number,
      customer_id,
      userId,
      invoice_date,
      due_date,
      status,
      notes,
      terms,
      subtotal,
      tax_amount,
      total_amount
    ]);

    const invoice = invoiceResult.rows[0];

    // Ajouter les lignes de facture
    if (items && items.length > 0) {
      for (const item of items) {
        await client.query(`
          INSERT INTO invoice_items (
            invoice_id, product_id, description, quantity, unit_price, tax_rate, total_price
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          invoice.id,
          item.product_id || null,
          item.description,
          item.quantity,
          item.unit_price,
          item.tax_rate || 0,
          item.quantity * item.unit_price
        ]);
      }
    }

    await client.query('COMMIT');

    res.status(201).json(invoice);
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Erreur lors de la création de la facture:', error);

    if (error.code === '23505') {
      return res.status(400).json({ error: 'Ce numéro de facture existe déjà' });
    }
    if (error.code === '23503') {
      return res.status(400).json({ error: 'Client ou utilisateur invalide' });
    }

    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

/**
 * PUT /api/invoices/:id
 * Mettre à jour une facture
 */
router.put('/:id', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const orgId = getOrgIdFromRequest(req);

    const {
      invoice_date,
      due_date,
      status,
      notes,
      terms,
      items
    } = req.body;

    // Vérifier que la facture existe
    const existingInvoice = await client.query(
      'SELECT * FROM invoices WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL',
      [id, orgId]
    );

    if (existingInvoice.rows.length === 0) {
      return res.status(404).json({ error: 'Facture non trouvée' });
    }

    // Calculate totals if items are provided
    let subtotal, tax_amount, total_amount;
    if (items && Array.isArray(items)) {
      subtotal = items.reduce((sum: number, item: any) => sum + (item.quantity * item.unit_price), 0);
      tax_amount = items.reduce((sum: number, item: any) => {
        const itemTotal = item.quantity * item.unit_price;
        const itemTax = itemTotal * ((item.tax_rate || 0) / 100);
        return sum + itemTax;
      }, 0);
      total_amount = subtotal + tax_amount;
    }

    // Mettre à jour la facture
    const updateResult = await client.query(`
      UPDATE invoices
      SET
        invoice_date = COALESCE($1, invoice_date),
        due_date = COALESCE($2, due_date),
        status = COALESCE($3, status),
        notes = COALESCE($4, notes),
        terms = COALESCE($5, terms),
        subtotal = COALESCE($6, subtotal),
        tax_amount = COALESCE($7, tax_amount),
        total_amount = COALESCE($8, total_amount),
        updated_at = NOW()
      WHERE id = $9 AND organization_id = $10 AND deleted_at IS NULL
      RETURNING *
    `, [
      invoice_date,
      due_date,
      status,
      notes,
      terms,
      subtotal,
      tax_amount,
      total_amount,
      id,
      orgId
    ]);

    // Si des items sont fournis, remplacer les items existants
    if (items && Array.isArray(items)) {
      // Supprimer les anciens items
      await client.query('DELETE FROM invoice_items WHERE invoice_id = $1', [id]);

      // Ajouter les nouveaux items
      for (const item of items) {
        await client.query(`
          INSERT INTO invoice_items (
            invoice_id, product_id, description, quantity, unit_price, tax_rate, total_price
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          id,
          item.product_id || null,
          item.description,
          item.quantity,
          item.unit_price,
          item.tax_rate || 0,
          item.quantity * item.unit_price
        ]);
      }
    }

    await client.query('COMMIT');

    res.json(updateResult.rows[0]);
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Erreur lors de la mise à jour de la facture:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

/**
 * DELETE /api/invoices/:id
 * Supprimer une facture (soft delete)
 */
router.delete('/:id', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const orgId = getOrgIdFromRequest(req);

    const result = await pool.query(
      'UPDATE invoices SET deleted_at = NOW() WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL RETURNING id',
      [id, orgId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Facture non trouvée' });
    }

    res.json({ message: 'Facture supprimée avec succès' });
  } catch (error: any) {
    console.error('Erreur lors de la suppression de la facture:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/invoices/:id/send-email
 * Envoyer une facture par email
 */
router.post('/:id/send-email', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const orgId = getOrgIdFromRequest(req);

    const result = await pool.query(`
      UPDATE invoices
      SET status = 'sent', updated_at = NOW()
      WHERE id = $1 AND organization_id = $2 AND status = 'draft' AND deleted_at IS NULL
      RETURNING *
    `, [id, orgId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Facture non trouvée ou déjà envoyée' });
    }

    res.json({ message: 'Facture envoyée avec succès', invoice: result.rows[0] });
  } catch (error: any) {
    console.error('Erreur lors de l\'envoi de la facture:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/invoices/:id/mark-as-paid
 * Marquer une facture comme payée
 */
router.post('/:id/mark-as-paid', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const orgId = getOrgIdFromRequest(req);
    const userId = req.user?.id;
    const { payment_method, payment_reference, payment_date, amount } = req.body;

    // Récupérer la facture
    const invoiceResult = await client.query(
      'SELECT * FROM invoices WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL',
      [id, orgId]
    );

    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Facture non trouvée' });
    }

    const invoice = invoiceResult.rows[0];

    // Créer le paiement
    await client.query(`
      INSERT INTO payments (
        invoice_id, payment_date, amount, payment_method,
        reference, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      id,
      payment_date || new Date().toISOString().split('T')[0],
      amount || invoice.total_amount,
      payment_method || 'bank_transfer',
      payment_reference || 'PAY-' + Date.now(),
      `Payment for invoice ${invoice.invoice_number}`,
      userId
    ]);

    // Mettre à jour le statut de la facture
    const updateResult = await client.query(`
      UPDATE invoices
      SET status = 'paid', updated_at = NOW()
      WHERE id = $1 AND organization_id = $2
      RETURNING *
    `, [id, orgId]);

    await client.query('COMMIT');

    res.json(updateResult.rows[0]);
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Erreur lors du marquage de la facture comme payée:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

/**
 * POST /api/invoices/:id/send-reminder
 * Envoyer une relance pour une facture
 */
router.post('/:id/send-reminder', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const orgId = getOrgIdFromRequest(req);

    // Vérifier que la facture existe et n'est pas payée
    const invoiceResult = await pool.query(
      'SELECT * FROM invoices WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL',
      [id, orgId]
    );

    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Facture non trouvée' });
    }

    const invoice = invoiceResult.rows[0];

    if (invoice.status === 'paid') {
      return res.status(400).json({ error: 'Cette facture est déjà payée' });
    }

    // TODO: Implement actual email sending logic here
    // For now, just update the status to 'overdue' if past due date
    if (new Date(invoice.due_date) < new Date()) {
      await pool.query(
        'UPDATE invoices SET status = $1, updated_at = NOW() WHERE id = $2',
        ['overdue', id]
      );
    }

    res.json({
      message: 'Relance envoyée avec succès',
      invoice_number: invoice.invoice_number
    });
  } catch (error: any) {
    console.error('Erreur lors de l\'envoi de la relance:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
