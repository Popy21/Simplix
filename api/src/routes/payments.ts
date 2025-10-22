import { Router } from 'express';
import { pool } from '../database/db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// Toutes les routes nécessitent une authentification
router.use(authenticateToken);

/**
 * GET /api/payments
 * Récupérer tous les paiements
 */
router.get('/', async (req, res) => {
  try {
    const { invoice_id, from_date, to_date, payment_method } = req.query;
    
    let query = `
      SELECT 
        p.*,
        i.invoice_number,
        i.total_ttc as invoice_total,
        c.name as customer_name,
        c.company as customer_company,
        u.name as created_by_name
      FROM payments p
      JOIN invoices i ON p.invoice_id = i.id
      JOIN customers c ON i.customer_id = c.id
      LEFT JOIN users u ON p.created_by = u.id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    let paramCount = 1;
    
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
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/payments/stats
 * Statistiques des paiements
 */
router.get('/stats', async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    
    let dateFormat = 'month';
    if (period === 'day') dateFormat = 'day';
    else if (period === 'week') dateFormat = 'week';
    else if (period === 'year') dateFormat = 'year';
    
    const stats = await pool.query(`
      SELECT 
        DATE_TRUNC($1, payment_date) as period,
        payment_method,
        COUNT(*) as payment_count,
        SUM(amount) as total_amount
      FROM payments
      WHERE payment_date >= CURRENT_DATE - INTERVAL '6 months'
      GROUP BY DATE_TRUNC($1, payment_date), payment_method
      ORDER BY period DESC, payment_method
    `, [dateFormat]);
    
    // Total global
    const totalStats = await pool.query(`
      SELECT 
        COUNT(*) as total_payments,
        SUM(amount) as total_amount,
        AVG(amount) as average_payment,
        COUNT(DISTINCT invoice_id) as invoices_paid
      FROM payments
    `);
    
    res.json({
      by_period: stats.rows,
      total: totalStats.rows[0]
    });
  } catch (error: any) {
    console.error('Erreur lors de la récupération des statistiques de paiements:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/payments/:id
 * Récupérer un paiement spécifique
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT 
        p.*,
        i.invoice_number,
        i.total_ttc as invoice_total,
        c.name as customer_name,
        c.email as customer_email,
        c.company as customer_company,
        u.name as created_by_name
      FROM payments p
      JOIN invoices i ON p.invoice_id = i.id
      JOIN customers c ON i.customer_id = c.id
      LEFT JOIN users u ON p.created_by = u.id
      WHERE p.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Paiement non trouvé' });
    }
    
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Erreur lors de la récupération du paiement:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/payments
 * Créer un nouveau paiement
 */
router.post('/', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
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
    
    // Vérifier que la facture existe et n'est pas déjà payée
    const invoiceResult = await client.query(`
      SELECT 
        *,
        (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE invoice_id = $1) as total_paid
      FROM invoices
      WHERE id = $1
    `, [invoice_id]);
    
    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Facture non trouvée' });
    }
    
    const invoice = invoiceResult.rows[0];
    const totalPaid = parseFloat(invoice.total_paid);
    const balanceDue = parseFloat(invoice.total_ttc) - totalPaid;
    
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
      payment_date || new Date(),
      amount,
      payment_method,
      reference,
      transaction_id,
      notes,
      (req as AuthRequest).user!.id
    ]);
    
    const payment = paymentResult.rows[0];
    
    // Calculer le nouveau total payé
    const newTotalPaid = totalPaid + parseFloat(amount);
    const newBalanceDue = parseFloat(invoice.total_ttc) - newTotalPaid;
    
    // Mettre à jour le statut de la facture si entièrement payée
    if (newBalanceDue <= 0.01) { // Utiliser une marge d'erreur pour les arrondis
      await client.query(`
        UPDATE invoices
        SET 
          status = 'paid',
          paid_date = $1,
          payment_method = $2
        WHERE id = $3
      `, [payment_date || new Date(), payment_method, invoice_id]);
    } else if (invoice.status === 'draft') {
      // Si c'était un brouillon, passer en "sent" car il y a un paiement
      await client.query(`
        UPDATE invoices
        SET status = 'sent'
        WHERE id = $1
      `, [invoice_id]);
    }
    
    await client.query('COMMIT');
    
    res.status(201).json({
      payment: payment,
      invoice: {
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        total_ttc: invoice.total_ttc,
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
    
    res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    client.release();
  }
});

/**
 * PUT /api/payments/:id
 * Mettre à jour un paiement
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      payment_date,
      amount,
      payment_method,
      reference,
      transaction_id,
      notes
    } = req.body;
    
    // Vérifier que le paiement existe
    const existingPayment = await pool.query(
      'SELECT * FROM payments WHERE id = $1',
      [id]
    );
    
    if (existingPayment.rows.length === 0) {
      return res.status(404).json({ error: 'Paiement non trouvé' });
    }
    
    // Mettre à jour le paiement
    const result = await pool.query(`
      UPDATE payments
      SET 
        payment_date = COALESCE($1, payment_date),
        amount = COALESCE($2, amount),
        payment_method = COALESCE($3, payment_method),
        reference = $4,
        transaction_id = $5,
        notes = $6
      WHERE id = $7
      RETURNING *
    `, [
      payment_date,
      amount,
      payment_method,
      reference,
      transaction_id,
      notes,
      id
    ]);
    
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Erreur lors de la mise à jour du paiement:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * DELETE /api/payments/:id
 * Supprimer un paiement
 */
router.delete('/:id', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    
    // Récupérer le paiement
    const paymentResult = await client.query(
      'SELECT * FROM payments WHERE id = $1',
      [id]
    );
    
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
      const balanceDue = parseFloat(invoice.total_ttc) - totalPaid;
      
      let newStatus = invoice.status;
      if (balanceDue > 0 && invoice.status === 'paid') {
        // Si la facture était payée et qu'il reste un solde, changer le statut
        if (new Date(invoice.due_date) < new Date()) {
          newStatus = 'overdue';
        } else {
          newStatus = 'sent';
        }
        
        await client.query(`
          UPDATE invoices
          SET status = $1, paid_date = NULL
          WHERE id = $2
        `, [newStatus, invoiceId]);
      }
    }
    
    await client.query('COMMIT');
    
    res.json({ message: 'Paiement supprimé avec succès' });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Erreur lors de la suppression du paiement:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    client.release();
  }
});

export default router;
