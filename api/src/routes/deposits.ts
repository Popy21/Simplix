import express, { Response } from 'express';
import { pool as db } from '../database/db';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { sendEmail, generateInvoiceEmailHTML, getCompanyProfile, logEmail } from '../services/emailService';

const router = express.Router();

// Récupérer tous les acomptes
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;
    const { status, customer_id, quote_id } = req.query;

    let query = `
      SELECT
        d.*,
        q.quote_number, q.title as quote_title, q.total_amount as quote_total,
        di.invoice_number as deposit_invoice_number,
        fi.invoice_number as final_invoice_number,
        c.name as customer_name, c.email as customer_email
      FROM deposits d
      LEFT JOIN quotes q ON d.quote_id = q.id
      LEFT JOIN invoices di ON d.deposit_invoice_id = di.id
      LEFT JOIN invoices fi ON d.invoice_id = fi.id
      LEFT JOIN customers c ON d.customer_id = c.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (organizationId) {
      params.push(organizationId);
      query += ` AND d.organization_id = $${params.length}`;
    }

    if (status) {
      params.push(status);
      query += ` AND d.status = $${params.length}`;
    }

    if (customer_id) {
      params.push(customer_id);
      query += ` AND d.customer_id = $${params.length}`;
    }

    if (quote_id) {
      params.push(quote_id);
      query += ` AND d.quote_id = $${params.length}`;
    }

    query += ' ORDER BY d.created_at DESC';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Créer un acompte et sa facture
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = (req.user as any)?.userId;
    const organizationId = (req.user as any)?.organizationId;
    const { quote_id, amount, percentage, description, send_invoice } = req.body;

    if (!quote_id || (!amount && !percentage)) {
      res.status(400).json({ error: 'quote_id et amount ou percentage requis' });
      return;
    }

    // Récupérer le devis
    const quoteResult = await db.query(`
      SELECT q.*, c.email as customer_email, c.name as customer_name
      FROM quotes q
      LEFT JOIN customers c ON q.customer_id = c.id
      WHERE q.id = $1
    `, [quote_id]);

    if (quoteResult.rows.length === 0) {
      res.status(404).json({ error: 'Devis non trouvé' });
      return;
    }

    const quote = quoteResult.rows[0];

    // Calculer le montant
    const depositAmount = amount || (quote.total_amount * (percentage / 100));

    // Générer le numéro de facture d'acompte
    const invoiceCountResult = await db.query('SELECT COUNT(*) as count FROM invoices');
    const invoiceCount = parseInt(invoiceCountResult.rows[0].count) + 1;
    const invoiceNumber = `FA-${new Date().getFullYear()}-${String(invoiceCount).padStart(5, '0')}`;

    // Calculer TVA
    const taxRate = parseFloat(quote.tax_rate) || 0.20;
    const subtotal = depositAmount / (1 + taxRate);
    const taxAmount = depositAmount - subtotal;

    // Créer la facture d'acompte
    const invoiceResult = await db.query(`
      INSERT INTO invoices (
        customer_id, user_id, quote_id, invoice_number, title,
        description, subtotal, tax_rate, tax_amount, total_amount,
        status, is_deposit_invoice, parent_quote_id, organization_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'sent', true, $3, $11)
      RETURNING *
    `, [
      quote.customer_id, userId, quote_id, invoiceNumber,
      `Acompte - ${quote.title}`,
      description || `Facture d'acompte pour le devis ${quote.quote_number}`,
      subtotal, taxRate, taxAmount, depositAmount, organizationId
    ]);

    const invoiceId = invoiceResult.rows[0].id;

    // Créer l'enregistrement d'acompte
    const depositResult = await db.query(`
      INSERT INTO deposits (
        quote_id, deposit_invoice_id, customer_id, amount,
        percentage, status, description, organization_id, created_by
      ) VALUES ($1, $2, $3, $4, $5, 'invoiced', $6, $7, $8)
      RETURNING *
    `, [
      quote_id, invoiceId, quote.customer_id, depositAmount,
      percentage || ((depositAmount / quote.total_amount) * 100),
      description, organizationId, userId
    ]);

    // Mettre à jour le devis
    await db.query(`
      UPDATE quotes SET
        deposit_required = true,
        deposit_amount = COALESCE(deposit_amount, 0) + $1,
        deposit_status = 'pending'
      WHERE id = $2
    `, [depositAmount, quote_id]);

    // Envoyer la facture par email si demandé
    if (send_invoice && quote.customer_email) {
      const companyProfile = await getCompanyProfile();
      const invoice = {
        ...invoiceResult.rows[0],
        customer_name: quote.customer_name
      };
      const htmlContent = generateInvoiceEmailHTML(invoice, companyProfile);

      const emailResult = await sendEmail({
        to: quote.customer_email,
        subject: `Facture d'acompte ${invoiceNumber} - ${companyProfile?.company_name || 'Simplix'}`,
        html: htmlContent
      });

      await logEmail('invoice', invoiceId, quote.customer_email, emailResult);
    }

    res.status(201).json({
      deposit: depositResult.rows[0],
      invoice: invoiceResult.rows[0]
    });
  } catch (err: any) {
    console.error('Erreur création acompte:', err);
    res.status(500).json({ error: err.message });
  }
});

// Marquer un acompte comme payé
router.post('/:id/pay', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { payment_method, payment_date, notes } = req.body;

    // Récupérer l'acompte
    const depositResult = await db.query(
      'SELECT * FROM deposits WHERE id = $1',
      [id]
    );

    if (depositResult.rows.length === 0) {
      res.status(404).json({ error: 'Acompte non trouvé' });
      return;
    }

    const deposit = depositResult.rows[0];

    if (deposit.status === 'paid') {
      res.status(400).json({ error: 'Acompte déjà payé' });
      return;
    }

    // Créer le paiement
    const paymentResult = await db.query(`
      INSERT INTO payments (invoice_id, amount, payment_date, payment_method, notes)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [
      deposit.deposit_invoice_id,
      deposit.amount,
      payment_date || new Date().toISOString(),
      payment_method || 'bank_transfer',
      notes || 'Paiement acompte'
    ]);

    // Mettre à jour l'acompte
    await db.query(`
      UPDATE deposits SET
        status = 'paid',
        payment_id = $1,
        paid_at = NOW(),
        payment_method = $2
      WHERE id = $3
    `, [paymentResult.rows[0].id, payment_method, id]);

    // Mettre à jour la facture d'acompte
    await db.query(
      'UPDATE invoices SET status = $1 WHERE id = $2',
      ['paid', deposit.deposit_invoice_id]
    );

    res.json({
      message: 'Acompte marqué comme payé',
      payment: paymentResult.rows[0]
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Appliquer les acomptes à une facture finale
router.post('/apply-to-invoice', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { quote_id, invoice_id } = req.body;

    if (!quote_id || !invoice_id) {
      res.status(400).json({ error: 'quote_id et invoice_id requis' });
      return;
    }

    // Récupérer les acomptes payés pour ce devis
    const depositsResult = await db.query(`
      SELECT * FROM deposits
      WHERE quote_id = $1 AND status = 'paid'
    `, [quote_id]);

    if (depositsResult.rows.length === 0) {
      res.status(400).json({ error: 'Aucun acompte payé pour ce devis' });
      return;
    }

    // Calculer le total des acomptes
    const totalDeposits = depositsResult.rows.reduce((sum, d) => sum + parseFloat(d.amount), 0);

    // Récupérer la facture
    const invoiceResult = await db.query(
      'SELECT * FROM invoices WHERE id = $1',
      [invoice_id]
    );

    if (invoiceResult.rows.length === 0) {
      res.status(404).json({ error: 'Facture non trouvée' });
      return;
    }

    const invoice = invoiceResult.rows[0];

    // Mettre à jour la facture avec les acomptes déduits
    const remainingAmount = parseFloat(invoice.total_amount) - totalDeposits;

    await db.query(`
      UPDATE invoices SET
        deposit_amount_applied = $1,
        remaining_after_deposits = $2
      WHERE id = $3
    `, [totalDeposits, remainingAmount, invoice_id]);

    // Marquer les acomptes comme appliqués
    await db.query(`
      UPDATE deposits SET
        status = 'applied',
        invoice_id = $1
      WHERE quote_id = $2 AND status = 'paid'
    `, [invoice_id, quote_id]);

    res.json({
      message: 'Acomptes appliqués à la facture',
      total_deposits: totalDeposits,
      remaining_amount: remainingAmount,
      deposits_applied: depositsResult.rows.length
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Récupérer les acomptes d'un devis
router.get('/quote/:quoteId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { quoteId } = req.params;

    const result = await db.query(`
      SELECT
        d.*,
        di.invoice_number as deposit_invoice_number,
        di.status as invoice_status,
        p.payment_date, p.payment_method as actual_payment_method
      FROM deposits d
      LEFT JOIN invoices di ON d.deposit_invoice_id = di.id
      LEFT JOIN payments p ON d.payment_id = p.id
      WHERE d.quote_id = $1
      ORDER BY d.created_at ASC
    `, [quoteId]);

    // Calculer les totaux
    const totals = {
      total_requested: 0,
      total_paid: 0,
      total_pending: 0
    };

    result.rows.forEach(d => {
      totals.total_requested += parseFloat(d.amount);
      if (d.status === 'paid' || d.status === 'applied') {
        totals.total_paid += parseFloat(d.amount);
      } else if (d.status === 'invoiced' || d.status === 'pending') {
        totals.total_pending += parseFloat(d.amount);
      }
    });

    res.json({
      deposits: result.rows,
      totals
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Annuler un acompte
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const depositResult = await db.query(
      'SELECT * FROM deposits WHERE id = $1',
      [id]
    );

    if (depositResult.rows.length === 0) {
      res.status(404).json({ error: 'Acompte non trouvé' });
      return;
    }

    const deposit = depositResult.rows[0];

    if (deposit.status === 'paid' || deposit.status === 'applied') {
      res.status(400).json({ error: 'Impossible d\'annuler un acompte déjà payé ou appliqué' });
      return;
    }

    // Annuler l'acompte
    await db.query(
      'UPDATE deposits SET status = $1 WHERE id = $2',
      ['cancelled', id]
    );

    // Annuler la facture d'acompte
    if (deposit.deposit_invoice_id) {
      await db.query(
        'UPDATE invoices SET status = $1 WHERE id = $2',
        ['cancelled', deposit.deposit_invoice_id]
      );
    }

    // Mettre à jour le devis
    await db.query(`
      UPDATE quotes SET
        deposit_amount = deposit_amount - $1
      WHERE id = $2
    `, [deposit.amount, deposit.quote_id]);

    res.json({ message: 'Acompte annulé' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Statistiques des acomptes
router.get('/stats/summary', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;

    const result = await db.query(`
      SELECT
        COUNT(*) as total_deposits,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE status = 'invoiced') as invoiced_count,
        COUNT(*) FILTER (WHERE status = 'paid') as paid_count,
        COUNT(*) FILTER (WHERE status = 'applied') as applied_count,
        COALESCE(SUM(amount), 0) as total_amount,
        COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0) as total_paid,
        COALESCE(SUM(amount) FILTER (WHERE status IN ('pending', 'invoiced')), 0) as total_pending
      FROM deposits
      WHERE ($1::UUID IS NULL OR organization_id = $1)
        AND status != 'cancelled'
    `, [organizationId]);

    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
