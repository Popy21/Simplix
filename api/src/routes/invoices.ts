import { Router, Response } from 'express';
import { pool } from '../database/db';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requireOrganization } from '../middleware/multiTenancy';
import { getOrgIdFromRequest } from '../utils/multiTenancyHelper';
import {
  sendEmail,
  generateInvoiceEmailHTML,
  generateReminderEmailHTML,
  getCompanyProfile,
  logEmail
} from '../services/emailService';

const router = Router();

/**
 * GET /api/invoices
 * Récupérer toutes les factures avec filtres
 */
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { status, customer_id, from_date, to_date, overdue } = req.query;

    let query = `
      SELECT
        i.*,
        c.name as customer_name,
        c.email as customer_email,
        c.company as customer_company,
        (SELECT COUNT(*) FROM invoice_items WHERE invoice_id = i.id) as items_count,
        t.id as template_id,
        t.name as template_name,
        t.logo_url as template_logo_url,
        t.primary_color as template_primary_color,
        t.company_name as template_company_name,
        t.company_address as template_company_address,
        t.company_phone as template_company_phone,
        t.company_email as template_company_email,
        t.company_siret as template_company_siret,
        t.company_tva as template_company_tva
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      LEFT JOIN invoice_templates t ON i.template_id = t.id
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
 * GET /api/invoices/overdue
 * Récupérer toutes les factures en retard
 */
router.get('/overdue', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const query = `
      SELECT
        i.*,
        c.name as customer_name,
        c.email as customer_email,
        c.company as customer_company
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      WHERE i.due_date < NOW()
      AND i.status NOT IN ('paid', 'cancelled')
      ORDER BY i.due_date ASC
    `;

    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Erreur lors de la récupération des factures en retard:', error);
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
    `);

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
        c.name as customer_name,
        c.email as customer_email,
        c.phone as customer_phone,
        c.company as customer_company,
        c.address as customer_address,
        u.first_name || ' ' || COALESCE(u.last_name, '') as user_name,
        (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE invoice_id = i.id) as total_paid
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      LEFT JOIN users u ON i.user_id::text = u.id::text
      WHERE i.id = $1
    `, [id]);

    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Facture non trouvée' });
    }

    // Récupérer les lignes de facture
    const itemsResult = await pool.query(`
      SELECT
        ii.*,
        p.name as product_name
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
      items = [],
      template_id
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
        invoice_number, customer_id, user_id, invoice_date, due_date,
        status, notes, terms, subtotal, tax_amount, total_amount, template_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [
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
      total_amount,
      template_id || null
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
      'SELECT * FROM invoices WHERE id = $1',
      [id]
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
      WHERE id = $9
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
      id
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
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM invoices WHERE id = $1 RETURNING id',
      [id]
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
    const { to, cc, subject } = req.body; // Email personnalisé optionnel

    // Récupérer la facture avec les infos client
    const invoiceResult = await pool.query(`
      SELECT i.*, c.name as customer_name, c.email as customer_email, c.company as customer_company
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      WHERE i.id = $1
    `, [id]);

    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Facture non trouvée' });
    }

    const invoice = invoiceResult.rows[0];

    // Déterminer le destinataire
    const recipient = to || invoice.customer_email;
    if (!recipient) {
      return res.status(400).json({ error: 'Aucun email client disponible. Veuillez spécifier un destinataire.' });
    }

    // Récupérer le profil entreprise
    const companyProfile = await getCompanyProfile();

    // Générer le contenu de l'email
    const html = generateInvoiceEmailHTML(invoice, companyProfile);
    const emailSubject = subject || `Facture ${invoice.invoice_number} - ${companyProfile?.company_name || 'Simplix'}`;

    // Envoyer l'email
    const result = await sendEmail({
      to: recipient,
      cc: cc,
      subject: emailSubject,
      html: html
    });

    // Logger l'envoi
    await logEmail('invoice', parseInt(id), recipient, result);

    if (result.success) {
      // Mettre à jour le statut si c'était un brouillon
      if (invoice.status === 'draft') {
        await pool.query(
          'UPDATE invoices SET status = $1, updated_at = NOW() WHERE id = $2',
          ['sent', id]
        );
      }

      res.json({
        message: 'Facture envoyée avec succès',
        messageId: result.messageId,
        recipient: recipient
      });
    } else {
      res.status(500).json({
        error: 'Erreur lors de l\'envoi de l\'email',
        details: result.error
      });
    }
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
      WHERE id = $1
      RETURNING *
    `, [id]);

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
    const { reminder_type = 'first', to } = req.body; // first, second, final, legal

    // Récupérer la facture avec les infos client
    const invoiceResult = await pool.query(`
      SELECT i.*, c.name as customer_name, c.email as customer_email, c.company as customer_company
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      WHERE i.id = $1
    `, [id]);

    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Facture non trouvée' });
    }

    const invoice = invoiceResult.rows[0];

    if (invoice.status === 'paid') {
      return res.status(400).json({ error: 'Cette facture est déjà payée' });
    }

    // Déterminer le destinataire
    const recipient = to || invoice.customer_email;
    if (!recipient) {
      return res.status(400).json({ error: 'Aucun email client disponible' });
    }

    // Récupérer le profil entreprise
    const companyProfile = await getCompanyProfile();

    // Générer le contenu de l'email de relance
    const html = generateReminderEmailHTML(invoice, reminder_type, companyProfile);

    const reminderTitles: Record<string, string> = {
      first: 'Rappel de paiement',
      second: 'Second rappel de paiement',
      final: 'Dernier rappel avant mise en recouvrement',
      legal: 'Mise en demeure de payer'
    };

    const emailSubject = `${reminderTitles[reminder_type] || 'Rappel'} - Facture ${invoice.invoice_number}`;

    // Envoyer l'email
    const result = await sendEmail({
      to: recipient,
      subject: emailSubject,
      html: html
    });

    // Logger l'envoi
    await logEmail('reminder', parseInt(id), recipient, result);

    // Enregistrer la relance dans payment_reminders si la table existe
    try {
      await pool.query(`
        INSERT INTO payment_reminders (invoice_id, reminder_type, days_after_due, sent_at, email_subject)
        VALUES ($1, $2, $3, NOW(), $4)
      `, [
        id,
        reminder_type,
        Math.floor((Date.now() - new Date(invoice.due_date).getTime()) / (1000 * 60 * 60 * 24)),
        emailSubject
      ]);
    } catch (e) {
      // Table peut ne pas exister, ignorer
    }

    // Mettre à jour le statut en 'overdue' si nécessaire
    if (new Date(invoice.due_date) < new Date() && invoice.status === 'sent') {
      await pool.query(
        'UPDATE invoices SET status = $1, updated_at = NOW() WHERE id = $2',
        ['overdue', id]
      );
    }

    if (result.success) {
      res.json({
        message: 'Relance envoyée avec succès',
        invoice_number: invoice.invoice_number,
        reminder_type: reminder_type,
        recipient: recipient,
        messageId: result.messageId
      });
    } else {
      res.status(500).json({
        error: 'Erreur lors de l\'envoi de la relance',
        details: result.error
      });
    }
  } catch (error: any) {
    console.error('Erreur lors de l\'envoi de la relance:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/invoices/:id/convert-to-quote
 * Convertir une facture en devis
 */
router.post('/:id/convert-to-quote', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req.user as any)?.userId || 1;

    // Get the invoice
    const invoiceResult = await pool.query('SELECT * FROM invoices WHERE id = $1', [id]);

    if (invoiceResult.rows.length === 0) {
      res.status(404).json({ error: 'Facture non trouvée' });
      return;
    }

    const invoice = invoiceResult.rows[0];

    // Create quote from invoice
    const quoteResult = await pool.query(
      `INSERT INTO quotes (customer_id, user_id, title, description, subtotal, tax_rate, tax_amount, total_amount, status, template_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'draft', $9)
       RETURNING *`,
      [
        invoice.customer_id,
        userId,
        invoice.title?.replace('Facture', 'Devis') || 'Devis',
        invoice.description,
        invoice.subtotal,
        invoice.tax_rate,
        invoice.tax_amount,
        invoice.total_amount,
        invoice.template_id
      ]
    );

    const quoteId = quoteResult.rows[0].id;

    // Copy invoice items to quote items
    const itemsResult = await pool.query('SELECT * FROM invoice_items WHERE invoice_id = $1', [id]);
    for (const item of itemsResult.rows) {
      await pool.query(
        'INSERT INTO quote_items (quote_id, product_id, description, quantity, unit_price, total_price) VALUES ($1, $2, $3, $4, $5, $6)',
        [quoteId, item.product_id, item.description, Math.round(parseFloat(item.quantity)), item.unit_price, item.total_price]
      );
    }

    res.status(201).json(quoteResult.rows[0]);
  } catch (err: any) {
    console.error('Erreur lors de la conversion en devis:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/invoices/:id/duplicate
 * Dupliquer une facture
 */
router.post('/:id/duplicate', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req.user as any)?.userId || 1;
    const organizationId = (req.user as any)?.organizationId;

    // Récupérer la facture originale
    const invoiceResult = await pool.query(
      'SELECT * FROM invoices WHERE id = $1 AND organization_id = $2',
      [id, organizationId]
    );

    if (invoiceResult.rows.length === 0) {
      res.status(404).json({ error: 'Facture non trouvée' });
      return;
    }

    const originalInvoice = invoiceResult.rows[0];

    // Générer un nouveau numéro de facture
    const year = new Date().getFullYear();
    const numResult = await pool.query(`
      SELECT invoice_number FROM invoices
      WHERE organization_id = $1 AND invoice_number LIKE $2
      ORDER BY invoice_number DESC LIMIT 1
    `, [organizationId, `FA-${year}-%`]);

    let nextNum = 1;
    if (numResult.rows.length > 0) {
      const match = numResult.rows[0].invoice_number.match(/FA-\d{4}-(\d+)/);
      if (match) nextNum = parseInt(match[1]) + 1;
    }
    const newInvoiceNumber = `FA-${year}-${String(nextNum).padStart(5, '0')}`;

    // Créer la nouvelle facture
    const newInvoiceResult = await pool.query(
      `INSERT INTO invoices (
        customer_id, user_id, invoice_number, title, description,
        subtotal, tax_rate, tax_amount, total_amount, status,
        due_date, template_id, billing_address, payment_terms,
        notes, discount_amount, organization_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'draft', $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
      [
        originalInvoice.customer_id,
        userId,
        newInvoiceNumber,
        originalInvoice.title,
        originalInvoice.description,
        originalInvoice.subtotal,
        originalInvoice.tax_rate,
        originalInvoice.tax_amount,
        originalInvoice.total_amount,
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 jours
        originalInvoice.template_id,
        originalInvoice.billing_address,
        originalInvoice.payment_terms,
        originalInvoice.notes,
        originalInvoice.discount_amount,
        organizationId
      ]
    );

    const newInvoiceId = newInvoiceResult.rows[0].id;

    // Copier les lignes de la facture
    const itemsResult = await pool.query('SELECT * FROM invoice_items WHERE invoice_id = $1', [id]);
    for (const item of itemsResult.rows) {
      await pool.query(
        `INSERT INTO invoice_items (invoice_id, product_id, description, quantity, unit_price, total_price, discount_percent, tax_rate, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          newInvoiceId,
          item.product_id,
          item.description,
          item.quantity,
          item.unit_price,
          item.total_price,
          item.discount_percent || 0,
          item.tax_rate,
          item.sort_order || 0
        ]
      );
    }

    // Récupérer la facture complète avec les items
    const completeInvoice = await pool.query(`
      SELECT i.*, c.name as customer_name
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      WHERE i.id = $1
    `, [newInvoiceId]);

    res.status(201).json({
      ...completeInvoice.rows[0],
      message: 'Facture dupliquée avec succès'
    });
  } catch (err: any) {
    console.error('Erreur lors de la duplication de la facture:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
