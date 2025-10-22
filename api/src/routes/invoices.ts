import { Router } from 'express';
import { pool } from '../database/db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// Toutes les routes nécessitent une authentification
router.use(authenticateToken);

/**
 * GET /api/invoices
 * Récupérer toutes les factures avec filtres
 */
router.get('/', async (req, res) => {
  try {
    const { status, customer_id, from_date, to_date, overdue } = req.query;
    
    let query = `
      SELECT 
        i.*,
        c.name as customer_name,
        c.email as customer_email,
        c.company as customer_company,
        u.name as user_name,
        (SELECT COUNT(*) FROM invoice_items WHERE invoice_id = i.id) as items_count,
        (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE invoice_id = i.id) as total_paid,
        (i.total_ttc - COALESCE((SELECT SUM(amount) FROM payments WHERE invoice_id = i.id), 0)) as balance_due
      FROM invoices i
      JOIN customers c ON i.customer_id = c.id
      JOIN users u ON i.user_id = u.id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    let paramCount = 1;
    
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
      query += ` AND i.status = 'overdue'`;
    }
    
    query += ` ORDER BY i.invoice_date DESC, i.id DESC`;
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Erreur lors de la récupération des factures:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/invoices/stats
 * Statistiques des factures
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'draft') as draft_count,
        COUNT(*) FILTER (WHERE status = 'sent') as sent_count,
        COUNT(*) FILTER (WHERE status = 'paid') as paid_count,
        COUNT(*) FILTER (WHERE status = 'overdue') as overdue_count,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_count,
        COALESCE(SUM(total_ttc) FILTER (WHERE status = 'paid'), 0) as total_paid,
        COALESCE(SUM(total_ttc) FILTER (WHERE status IN ('sent', 'overdue')), 0) as total_pending,
        COALESCE(SUM(total_ttc) FILTER (WHERE status = 'overdue'), 0) as total_overdue
      FROM invoices
    `);
    
    res.json(stats.rows[0]);
  } catch (error: any) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/invoices/:id
 * Récupérer une facture spécifique avec ses lignes
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Récupérer la facture
    const invoiceResult = await pool.query(`
      SELECT 
        i.*,
        c.name as customer_name,
        c.email as customer_email,
        c.phone as customer_phone,
        c.company as customer_company,
        c.address as customer_address,
        u.name as user_name,
        (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE invoice_id = i.id) as total_paid
      FROM invoices i
      JOIN customers c ON i.customer_id = c.id
      JOIN users u ON i.user_id = u.id
      WHERE i.id = $1
    `, [id]);
    
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
      ORDER BY ii.line_order, ii.id
    `, [id]);
    
    // Récupérer les paiements
    const paymentsResult = await pool.query(`
      SELECT 
        p.*,
        u.name as created_by_name
      FROM payments p
      LEFT JOIN users u ON p.created_by = u.id
      WHERE p.invoice_id = $1
      ORDER BY p.payment_date DESC, p.id DESC
    `, [id]);
    
    const invoice = {
      ...invoiceResult.rows[0],
      items: itemsResult.rows,
      payments: paymentsResult.rows,
      balance_due: parseFloat(invoiceResult.rows[0].total_ttc) - parseFloat(invoiceResult.rows[0].total_paid)
    };
    
    res.json(invoice);
  } catch (error: any) {
    console.error('Erreur lors de la récupération de la facture:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/invoices
 * Créer une nouvelle facture
 */
router.post('/', async (req: AuthRequest, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
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
      'SELECT id FROM invoices WHERE invoice_number = $1',
      [invoice_number]
    );
    
    if (existingInvoice.rows.length > 0) {
      return res.status(400).json({ error: 'Ce numéro de facture existe déjà' });
    }
    
    // Créer la facture
    const invoiceResult = await client.query(`
      INSERT INTO invoices (
        invoice_number, customer_id, user_id, invoice_date, due_date,
        status, notes, terms
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      invoice_number,
      customer_id,
      req.user!.id,
      invoice_date,
      due_date,
      status,
      notes,
      terms
    ]);
    
    const invoice = invoiceResult.rows[0];
    
    // Ajouter les lignes de facture
    if (items && items.length > 0) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        await client.query(`
          INSERT INTO invoice_items (
            invoice_id, product_id, description, quantity, unit_price,
            vat_rate, line_order
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          invoice.id,
          item.product_id || null,
          item.description,
          item.quantity,
          item.unit_price,
          item.vat_rate || 20.00,
          i
        ]);
      }
    }
    
    await client.query('COMMIT');
    
    // Récupérer la facture complète
    const fullInvoice = await pool.query(`
      SELECT i.*, 
        (SELECT json_agg(ii.*) FROM invoice_items ii WHERE ii.invoice_id = i.id) as items
      FROM invoices i
      WHERE i.id = $1
    `, [invoice.id]);
    
    res.status(201).json(fullInvoice.rows[0]);
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Erreur lors de la création de la facture:', error);
    
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Ce numéro de facture existe déjà' });
    }
    if (error.code === '23503') {
      return res.status(400).json({ error: 'Client ou utilisateur invalide' });
    }
    
    res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    client.release();
  }
});

/**
 * PUT /api/invoices/:id
 * Mettre à jour une facture
 */
router.put('/:id', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const {
      invoice_date,
      due_date,
      status,
      payment_method,
      payment_reference,
      notes,
      terms,
      items
    } = req.body;
    
    // Vérifier que la facture existe
    const existingInvoice = await client.query(
      'SELECT * FROM invoices WHERE id = $1',
      [id]
    );
    
    if (existingInvoice.rows.length === 0) {
      return res.status(404).json({ error: 'Facture non trouvée' });
    }
    
    // Mettre à jour la facture
    const updateResult = await client.query(`
      UPDATE invoices
      SET 
        invoice_date = COALESCE($1, invoice_date),
        due_date = COALESCE($2, due_date),
        status = COALESCE($3, status),
        payment_method = $4,
        payment_reference = $5,
        notes = $6,
        terms = $7,
        paid_date = CASE WHEN $3 = 'paid' AND paid_date IS NULL THEN CURRENT_DATE ELSE paid_date END
      WHERE id = $8
      RETURNING *
    `, [
      invoice_date,
      due_date,
      status,
      payment_method,
      payment_reference,
      notes,
      terms,
      id
    ]);
    
    // Si des items sont fournis, remplacer les items existants
    if (items && Array.isArray(items)) {
      // Supprimer les anciens items
      await client.query('DELETE FROM invoice_items WHERE invoice_id = $1', [id]);
      
      // Ajouter les nouveaux items
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        await client.query(`
          INSERT INTO invoice_items (
            invoice_id, product_id, description, quantity, unit_price,
            vat_rate, line_order
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          id,
          item.product_id || null,
          item.description,
          item.quantity,
          item.unit_price,
          item.vat_rate || 20.00,
          i
        ]);
      }
    }
    
    await client.query('COMMIT');
    
    // Récupérer la facture mise à jour
    const fullInvoice = await pool.query(`
      SELECT i.*, 
        (SELECT json_agg(ii.*) FROM invoice_items ii WHERE ii.invoice_id = i.id ORDER BY ii.line_order) as items
      FROM invoices i
      WHERE i.id = $1
    `, [id]);
    
    res.json(fullInvoice.rows[0]);
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Erreur lors de la mise à jour de la facture:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    client.release();
  }
});

/**
 * DELETE /api/invoices/:id
 * Supprimer une facture
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM invoices WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Facture non trouvée' });
    }
    
    res.json({ message: 'Facture supprimée avec succès' });
  } catch (error: any) {
    console.error('Erreur lors de la suppression de la facture:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/invoices/:id/send
 * Envoyer une facture (changer le statut à 'sent')
 */
router.post('/:id/send', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      UPDATE invoices
      SET status = 'sent'
      WHERE id = $1 AND status = 'draft'
      RETURNING *
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Facture non trouvée ou déjà envoyée' });
    }
    
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Erreur lors de l\'envoi de la facture:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/invoices/:id/mark-paid
 * Marquer une facture comme payée
 */
router.post('/:id/mark-paid', async (req: AuthRequest, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { payment_method, payment_reference, payment_date, amount } = req.body;
    
    // Récupérer la facture
    const invoiceResult = await client.query(
      'SELECT * FROM invoices WHERE id = $1',
      [id]
    );
    
    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Facture non trouvée' });
    }
    
    const invoice = invoiceResult.rows[0];
    
    // Créer le paiement
    await client.query(`
      INSERT INTO payments (
        invoice_id, payment_date, amount, payment_method,
        reference, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      id,
      payment_date || new Date(),
      amount || invoice.total_ttc,
      payment_method || 'transfer',
      payment_reference,
      req.user!.id
    ]);
    
    // Mettre à jour le statut de la facture
    const updateResult = await client.query(`
      UPDATE invoices
      SET 
        status = 'paid',
        paid_date = $1,
        payment_method = $2,
        payment_reference = $3
      WHERE id = $4
      RETURNING *
    `, [
      payment_date || new Date(),
      payment_method,
      payment_reference,
      id
    ]);
    
    await client.query('COMMIT');
    
    res.json(updateResult.rows[0]);
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Erreur lors du marquage de la facture comme payée:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    client.release();
  }
});

/**
 * POST /api/invoices/:id/reminder
 * Envoyer une relance pour une facture
 */
router.post('/:id/reminder', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { reminder_type = 'email', subject, message } = req.body;
    
    // Créer l'enregistrement de relance
    const result = await pool.query(`
      INSERT INTO invoice_reminders (
        invoice_id, reminder_type, subject, message, sent, sent_at, created_by
      ) VALUES ($1, $2, $3, $4, true, CURRENT_TIMESTAMP, $5)
      RETURNING *
    `, [id, reminder_type, subject, message, req.user!.id]);
    
    res.json({
      message: 'Relance enregistrée avec succès',
      reminder: result.rows[0]
    });
  } catch (error: any) {
    console.error('Erreur lors de l\'envoi de la relance:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
