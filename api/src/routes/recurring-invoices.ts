import express, { Response } from 'express';
import { pool as db } from '../database/db';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { sendEmail, generateInvoiceEmailHTML, getCompanyProfile, logEmail } from '../services/emailService';

const router = express.Router();

// Récupérer toutes les factures récurrentes
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { status, customer_id } = req.query;

    let query = `
      SELECT ri.*,
        c.name as customer_name,
        c.email as customer_email,
        (SELECT COUNT(*) FROM recurring_invoice_history WHERE recurring_invoice_id = ri.id) as total_generated
      FROM recurring_invoices ri
      LEFT JOIN customers c ON ri.customer_id = c.id
      WHERE ri.deleted_at IS NULL
    `;
    const params: any[] = [];

    if (status) {
      params.push(status);
      query += ` AND ri.status = $${params.length}`;
    }

    if (customer_id) {
      params.push(customer_id);
      query += ` AND ri.customer_id = $${params.length}`;
    }

    query += ' ORDER BY ri.created_at DESC';

    const result = await db.query(query, params);

    // Récupérer les items pour chaque facture récurrente
    const recurringWithItems = await Promise.all(
      result.rows.map(async (recurring) => {
        const itemsResult = await db.query(
          `SELECT ri.*, p.name as product_name
           FROM recurring_invoice_items ri
           LEFT JOIN products p ON ri.product_id = p.id
           WHERE ri.recurring_invoice_id = $1`,
          [recurring.id]
        );
        return { ...recurring, items: itemsResult.rows };
      })
    );

    res.json(recurringWithItems);
  } catch (err: any) {
    console.error('Erreur récupération factures récurrentes:', err);
    res.status(500).json({ error: err.message });
  }
});

// Récupérer une facture récurrente par ID
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await db.query(`
      SELECT ri.*,
        c.name as customer_name,
        c.email as customer_email,
        c.address as customer_address
      FROM recurring_invoices ri
      LEFT JOIN customers c ON ri.customer_id = c.id
      WHERE ri.id = $1 AND ri.deleted_at IS NULL
    `, [id]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Facture récurrente non trouvée' });
      return;
    }

    // Récupérer les items
    const itemsResult = await db.query(
      `SELECT ri.*, p.name as product_name
       FROM recurring_invoice_items ri
       LEFT JOIN products p ON ri.product_id = p.id
       WHERE ri.recurring_invoice_id = $1`,
      [id]
    );

    // Récupérer l'historique
    const historyResult = await db.query(
      `SELECT rih.*, i.invoice_number
       FROM recurring_invoice_history rih
       LEFT JOIN invoices i ON rih.invoice_id = i.id
       WHERE rih.recurring_invoice_id = $1
       ORDER BY rih.generated_at DESC
       LIMIT 20`,
      [id]
    );

    res.json({
      ...result.rows[0],
      items: itemsResult.rows,
      history: historyResult.rows
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Créer une facture récurrente
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = (req.user as any)?.userId || 1;
    const organizationId = (req.user as any)?.organizationId;

    const {
      customer_id,
      title,
      description,
      frequency,
      interval_count,
      start_date,
      end_date,
      items,
      tax_rate,
      auto_send_email,
      days_before_due,
      template_id,
      max_invoices
    } = req.body;

    if (!customer_id || !title || !items || items.length === 0) {
      res.status(400).json({ error: 'customer_id, title et items sont requis' });
      return;
    }

    // Calculer les totaux
    const subtotal = items.reduce((sum: number, item: any) => sum + (item.quantity * item.unit_price), 0);
    const taxRate = tax_rate || 20;
    const taxAmount = subtotal * (taxRate / 100);
    const totalAmount = subtotal + taxAmount;

    // Date de début par défaut = aujourd'hui
    const startDate = start_date || new Date().toISOString().split('T')[0];

    const result = await db.query(`
      INSERT INTO recurring_invoices (
        customer_id, title, description, frequency, interval_count,
        start_date, end_date, next_invoice_date, subtotal, tax_rate,
        tax_amount, total_amount, auto_send_email, days_before_due,
        template_id, max_invoices, organization_id, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *
    `, [
      customer_id, title, description, frequency || 'monthly', interval_count || 1,
      startDate, end_date, startDate, subtotal, taxRate,
      taxAmount, totalAmount, auto_send_email !== false, days_before_due || 30,
      template_id, max_invoices, organizationId, userId
    ]);

    const recurringId = result.rows[0].id;

    // Insérer les items
    for (const item of items) {
      await db.query(`
        INSERT INTO recurring_invoice_items (recurring_invoice_id, product_id, description, quantity, unit_price, total_price)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [recurringId, item.product_id, item.description, item.quantity, item.unit_price, item.quantity * item.unit_price]);
    }

    res.status(201).json({ ...result.rows[0], items });
  } catch (err: any) {
    console.error('Erreur création facture récurrente:', err);
    res.status(500).json({ error: err.message });
  }
});

// Mettre à jour une facture récurrente
router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      frequency,
      interval_count,
      end_date,
      items,
      tax_rate,
      auto_send_email,
      days_before_due,
      template_id,
      max_invoices
    } = req.body;

    // Recalculer les totaux si items fournis
    let subtotal, taxAmount, totalAmount;
    if (items) {
      subtotal = items.reduce((sum: number, item: any) => sum + (item.quantity * item.unit_price), 0);
      const taxR = tax_rate || 20;
      taxAmount = subtotal * (taxR / 100);
      totalAmount = subtotal + taxAmount;
    }

    const result = await db.query(`
      UPDATE recurring_invoices SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        frequency = COALESCE($3, frequency),
        interval_count = COALESCE($4, interval_count),
        end_date = $5,
        subtotal = COALESCE($6, subtotal),
        tax_rate = COALESCE($7, tax_rate),
        tax_amount = COALESCE($8, tax_amount),
        total_amount = COALESCE($9, total_amount),
        auto_send_email = COALESCE($10, auto_send_email),
        days_before_due = COALESCE($11, days_before_due),
        template_id = COALESCE($12, template_id),
        max_invoices = $13
      WHERE id = $14 AND deleted_at IS NULL
      RETURNING *
    `, [
      title, description, frequency, interval_count, end_date,
      subtotal, tax_rate, taxAmount, totalAmount,
      auto_send_email, days_before_due, template_id, max_invoices, id
    ]);

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Facture récurrente non trouvée' });
      return;
    }

    // Mettre à jour les items si fournis
    if (items) {
      await db.query('DELETE FROM recurring_invoice_items WHERE recurring_invoice_id = $1', [id]);
      for (const item of items) {
        await db.query(`
          INSERT INTO recurring_invoice_items (recurring_invoice_id, product_id, description, quantity, unit_price, total_price)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [id, item.product_id, item.description, item.quantity, item.unit_price, item.quantity * item.unit_price]);
      }
    }

    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Changer le statut (pause, reprendre, annuler)
router.patch('/:id/status', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'paused', 'cancelled', 'completed'].includes(status)) {
      res.status(400).json({ error: 'Statut invalide' });
      return;
    }

    const result = await db.query(
      'UPDATE recurring_invoices SET status = $1 WHERE id = $2 AND deleted_at IS NULL RETURNING *',
      [status, id]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Facture récurrente non trouvée' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Supprimer une facture récurrente (soft delete)
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'UPDATE recurring_invoices SET deleted_at = NOW(), status = $1 WHERE id = $2 AND deleted_at IS NULL RETURNING id',
      ['cancelled', id]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Facture récurrente non trouvée' });
      return;
    }

    res.json({ message: 'Facture récurrente supprimée' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Générer manuellement une facture
router.post('/:id/generate', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req.user as any)?.userId || 1;

    // Récupérer la facture récurrente
    const recurringResult = await db.query(`
      SELECT ri.*, c.email as customer_email, c.name as customer_name
      FROM recurring_invoices ri
      LEFT JOIN customers c ON ri.customer_id = c.id
      WHERE ri.id = $1 AND ri.deleted_at IS NULL
    `, [id]);

    if (recurringResult.rows.length === 0) {
      res.status(404).json({ error: 'Facture récurrente non trouvée' });
      return;
    }

    const recurring = recurringResult.rows[0];

    if (recurring.status !== 'active') {
      res.status(400).json({ error: 'La facture récurrente n\'est pas active' });
      return;
    }

    // Vérifier limite de factures
    if (recurring.max_invoices && recurring.invoices_generated >= recurring.max_invoices) {
      res.status(400).json({ error: 'Nombre maximum de factures atteint' });
      return;
    }

    // Générer le numéro de facture
    const invoiceCountResult = await db.query('SELECT COUNT(*) as count FROM invoices');
    const invoiceCount = parseInt(invoiceCountResult.rows[0].count) + 1;
    const invoiceNumber = `FAC-${new Date().getFullYear()}-${String(invoiceCount).padStart(5, '0')}`;

    // Date d'échéance
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + (recurring.days_before_due || 30));

    // Créer la facture
    const invoiceResult = await db.query(`
      INSERT INTO invoices (
        customer_id, user_id, invoice_number, title, description,
        subtotal, tax_rate, tax_amount, total_amount, status, due_date, template_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'sent', $10, $11)
      RETURNING *
    `, [
      recurring.customer_id, userId, invoiceNumber, recurring.title, recurring.description,
      recurring.subtotal, recurring.tax_rate, recurring.tax_amount, recurring.total_amount,
      dueDate.toISOString().split('T')[0], recurring.template_id
    ]);

    const invoiceId = invoiceResult.rows[0].id;

    // Copier les items
    const itemsResult = await db.query(
      'SELECT * FROM recurring_invoice_items WHERE recurring_invoice_id = $1',
      [id]
    );

    for (const item of itemsResult.rows) {
      await db.query(`
        INSERT INTO invoice_items (invoice_id, product_id, description, quantity, unit_price, total_price)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [invoiceId, item.product_id, item.description, item.quantity, item.unit_price, item.total_price]);
    }

    // Calculer la prochaine date
    const nextDateResult = await db.query(
      `SELECT calculate_next_invoice_date($1::DATE, $2, $3) as next_date`,
      [recurring.next_invoice_date, recurring.frequency, recurring.interval_count]
    );
    const nextDate = nextDateResult.rows[0].next_date;

    // Mettre à jour la facture récurrente
    await db.query(`
      UPDATE recurring_invoices SET
        last_invoice_date = NOW(),
        next_invoice_date = $1,
        invoices_generated = invoices_generated + 1,
        status = CASE
          WHEN max_invoices IS NOT NULL AND invoices_generated + 1 >= max_invoices THEN 'completed'
          WHEN end_date IS NOT NULL AND $1 > end_date THEN 'completed'
          ELSE status
        END
      WHERE id = $2
    `, [nextDate, id]);

    // Enregistrer dans l'historique
    await db.query(`
      INSERT INTO recurring_invoice_history (recurring_invoice_id, invoice_id, status, period_start, period_end)
      VALUES ($1, $2, 'success', $3, $4)
    `, [id, invoiceId, recurring.next_invoice_date, nextDate]);

    // Envoyer l'email si configuré
    if (recurring.auto_send_email && recurring.customer_email) {
      const companyProfile = await getCompanyProfile();
      const invoice = { ...invoiceResult.rows[0], customer_name: recurring.customer_name };
      const htmlContent = generateInvoiceEmailHTML(invoice, companyProfile);

      const emailResult = await sendEmail({
        to: recurring.customer_email,
        subject: `Facture ${invoiceNumber} - ${companyProfile?.company_name || 'Simplix'}`,
        html: htmlContent
      });

      await logEmail('invoice', invoiceId, recurring.customer_email, emailResult);
    }

    res.status(201).json({
      message: 'Facture générée avec succès',
      invoice: invoiceResult.rows[0],
      next_invoice_date: nextDate
    });
  } catch (err: any) {
    console.error('Erreur génération facture:', err);
    res.status(500).json({ error: err.message });
  }
});

// Endpoint pour le cron job - Générer toutes les factures dues
router.post('/process-due', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    // Récupérer toutes les factures récurrentes actives dont la date est passée
    const dueResult = await db.query(`
      SELECT ri.*, c.email as customer_email, c.name as customer_name
      FROM recurring_invoices ri
      LEFT JOIN customers c ON ri.customer_id = c.id
      WHERE ri.status = 'active'
        AND ri.deleted_at IS NULL
        AND ri.next_invoice_date <= CURRENT_DATE
        AND (ri.end_date IS NULL OR ri.next_invoice_date <= ri.end_date)
        AND (ri.max_invoices IS NULL OR ri.invoices_generated < ri.max_invoices)
    `);

    const results = {
      processed: 0,
      success: 0,
      failed: 0,
      invoices: [] as any[]
    };

    for (const recurring of dueResult.rows) {
      results.processed++;

      try {
        // Générer le numéro de facture
        const invoiceCountResult = await db.query('SELECT COUNT(*) as count FROM invoices');
        const invoiceCount = parseInt(invoiceCountResult.rows[0].count) + 1;
        const invoiceNumber = `FAC-${new Date().getFullYear()}-${String(invoiceCount).padStart(5, '0')}`;

        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + (recurring.days_before_due || 30));

        // Créer la facture
        const invoiceResult = await db.query(`
          INSERT INTO invoices (
            customer_id, user_id, invoice_number, title, description,
            subtotal, tax_rate, tax_amount, total_amount, status, due_date, template_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'sent', $10, $11)
          RETURNING *
        `, [
          recurring.customer_id, recurring.created_by || 1, invoiceNumber,
          recurring.title, recurring.description, recurring.subtotal,
          recurring.tax_rate, recurring.tax_amount, recurring.total_amount,
          dueDate.toISOString().split('T')[0], recurring.template_id
        ]);

        const invoiceId = invoiceResult.rows[0].id;

        // Copier les items
        const itemsResult = await db.query(
          'SELECT * FROM recurring_invoice_items WHERE recurring_invoice_id = $1',
          [recurring.id]
        );

        for (const item of itemsResult.rows) {
          await db.query(`
            INSERT INTO invoice_items (invoice_id, product_id, description, quantity, unit_price, total_price)
            VALUES ($1, $2, $3, $4, $5, $6)
          `, [invoiceId, item.product_id, item.description, item.quantity, item.unit_price, item.total_price]);
        }

        // Calculer la prochaine date
        const nextDateResult = await db.query(
          `SELECT calculate_next_invoice_date($1::DATE, $2, $3) as next_date`,
          [recurring.next_invoice_date, recurring.frequency, recurring.interval_count]
        );
        const nextDate = nextDateResult.rows[0].next_date;

        // Mettre à jour la facture récurrente
        await db.query(`
          UPDATE recurring_invoices SET
            last_invoice_date = NOW(),
            next_invoice_date = $1,
            invoices_generated = invoices_generated + 1,
            status = CASE
              WHEN max_invoices IS NOT NULL AND invoices_generated + 1 >= max_invoices THEN 'completed'
              WHEN end_date IS NOT NULL AND $1 > end_date THEN 'completed'
              ELSE status
            END
          WHERE id = $2
        `, [nextDate, recurring.id]);

        // Enregistrer dans l'historique
        await db.query(`
          INSERT INTO recurring_invoice_history (recurring_invoice_id, invoice_id, status, period_start, period_end)
          VALUES ($1, $2, 'success', $3, $4)
        `, [recurring.id, invoiceId, recurring.next_invoice_date, nextDate]);

        // Envoyer l'email si configuré
        if (recurring.auto_send_email && recurring.customer_email) {
          const companyProfile = await getCompanyProfile();
          const invoice = { ...invoiceResult.rows[0], customer_name: recurring.customer_name };
          const htmlContent = generateInvoiceEmailHTML(invoice, companyProfile);

          await sendEmail({
            to: recurring.customer_email,
            subject: `Facture ${invoiceNumber} - ${companyProfile?.company_name || 'Simplix'}`,
            html: htmlContent
          });
        }

        results.success++;
        results.invoices.push({
          recurring_id: recurring.id,
          invoice_id: invoiceId,
          invoice_number: invoiceNumber
        });

      } catch (error: any) {
        results.failed++;

        // Enregistrer l'erreur dans l'historique
        await db.query(`
          INSERT INTO recurring_invoice_history (recurring_invoice_id, status, error_message)
          VALUES ($1, 'failed', $2)
        `, [recurring.id, error.message]);
      }
    }

    res.json(results);
  } catch (err: any) {
    console.error('Erreur traitement factures récurrentes:', err);
    res.status(500).json({ error: err.message });
  }
});

// Statistiques des factures récurrentes
router.get('/stats/summary', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const result = await db.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'active') as active_count,
        COUNT(*) FILTER (WHERE status = 'paused') as paused_count,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_count,
        COALESCE(SUM(total_amount) FILTER (WHERE status = 'active'), 0) as monthly_recurring_revenue,
        COALESCE(SUM(invoices_generated), 0) as total_invoices_generated
      FROM recurring_invoices
      WHERE deleted_at IS NULL
    `);

    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
