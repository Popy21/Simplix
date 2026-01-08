import express, { Response } from 'express';
import { pool as db } from '../database/db';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { sendEmail, generateReminderEmailHTML, getCompanyProfile, logEmail } from '../services/emailService';

const router = express.Router();

// GET / - Liste toutes les relances (historique récent)
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user?.organization_id || null;
    const { page = 1, limit = 50 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const result = await db.query(`
      SELECT pr.*,
        i.invoice_number,
        c.name as customer_name
      FROM payment_reminders pr
      LEFT JOIN invoices i ON pr.invoice_id = i.id
      LEFT JOIN customers c ON i.customer_id = c.id
      WHERE ($1::UUID IS NULL OR i.organization_id = $1)
      ORDER BY pr.sent_at DESC
      LIMIT $2 OFFSET $3
    `, [organizationId, limit, offset]);

    const countResult = await db.query(`
      SELECT COUNT(*) as total FROM payment_reminders pr
      LEFT JOIN invoices i ON pr.invoice_id = i.id
      WHERE ($1::UUID IS NULL OR i.organization_id = $1)
    `, [organizationId]);

    res.json({
      reminders: result.rows,
      total: parseInt(countResult.rows[0].total),
      page: Number(page),
      limit: Number(limit)
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Récupérer les paramètres de relance
router.get('/settings', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user?.organization_id || null;

    const result = await db.query(
      'SELECT * FROM reminder_settings WHERE organization_id = $1 LIMIT 1',
      [organizationId]
    );

    if (result.rows.length === 0) {
      // Retourner les paramètres par défaut
      res.json({
        enabled: true,
        reminder_1_enabled: true,
        reminder_1_days: 7,
        reminder_1_subject: 'Rappel de paiement - Facture {invoice_number}',
        reminder_2_enabled: true,
        reminder_2_days: 15,
        reminder_2_subject: 'Second rappel - Facture {invoice_number}',
        reminder_3_enabled: true,
        reminder_3_days: 30,
        reminder_3_subject: 'Dernier rappel avant mise en recouvrement - Facture {invoice_number}',
        legal_notice_enabled: false,
        legal_notice_days: 45,
        include_pdf: true,
        exclude_weekends: true
      });
      return;
    }

    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Mettre à jour les paramètres de relance
router.put('/settings', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user?.organization_id || null;
    const {
      enabled,
      reminder_1_enabled, reminder_1_days, reminder_1_subject, reminder_1_template,
      reminder_2_enabled, reminder_2_days, reminder_2_subject, reminder_2_template,
      reminder_3_enabled, reminder_3_days, reminder_3_subject, reminder_3_template,
      legal_notice_enabled, legal_notice_days, legal_notice_subject, legal_notice_template,
      include_pdf, cc_email, exclude_weekends
    } = req.body;

    // Vérifier si les paramètres existent
    const existing = await db.query(
      'SELECT id FROM reminder_settings WHERE organization_id = $1',
      [organizationId]
    );

    let result;
    if (existing.rows.length > 0) {
      result = await db.query(`
        UPDATE reminder_settings SET
          enabled = COALESCE($1, enabled),
          reminder_1_enabled = COALESCE($2, reminder_1_enabled),
          reminder_1_days = COALESCE($3, reminder_1_days),
          reminder_1_subject = COALESCE($4, reminder_1_subject),
          reminder_1_template = $5,
          reminder_2_enabled = COALESCE($6, reminder_2_enabled),
          reminder_2_days = COALESCE($7, reminder_2_days),
          reminder_2_subject = COALESCE($8, reminder_2_subject),
          reminder_2_template = $9,
          reminder_3_enabled = COALESCE($10, reminder_3_enabled),
          reminder_3_days = COALESCE($11, reminder_3_days),
          reminder_3_subject = COALESCE($12, reminder_3_subject),
          reminder_3_template = $13,
          legal_notice_enabled = COALESCE($14, legal_notice_enabled),
          legal_notice_days = COALESCE($15, legal_notice_days),
          legal_notice_subject = COALESCE($16, legal_notice_subject),
          legal_notice_template = $17,
          include_pdf = COALESCE($18, include_pdf),
          cc_email = $19,
          exclude_weekends = COALESCE($20, exclude_weekends),
          updated_at = NOW()
        WHERE organization_id = $21
        RETURNING *
      `, [
        enabled,
        reminder_1_enabled, reminder_1_days, reminder_1_subject, reminder_1_template,
        reminder_2_enabled, reminder_2_days, reminder_2_subject, reminder_2_template,
        reminder_3_enabled, reminder_3_days, reminder_3_subject, reminder_3_template,
        legal_notice_enabled, legal_notice_days, legal_notice_subject, legal_notice_template,
        include_pdf, cc_email, exclude_weekends,
        organizationId
      ]);
    } else {
      result = await db.query(`
        INSERT INTO reminder_settings (
          organization_id, enabled,
          reminder_1_enabled, reminder_1_days, reminder_1_subject, reminder_1_template,
          reminder_2_enabled, reminder_2_days, reminder_2_subject, reminder_2_template,
          reminder_3_enabled, reminder_3_days, reminder_3_subject, reminder_3_template,
          legal_notice_enabled, legal_notice_days, legal_notice_subject, legal_notice_template,
          include_pdf, cc_email, exclude_weekends
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
        RETURNING *
      `, [
        organizationId, enabled ?? true,
        reminder_1_enabled ?? true, reminder_1_days ?? 7, reminder_1_subject, reminder_1_template,
        reminder_2_enabled ?? true, reminder_2_days ?? 15, reminder_2_subject, reminder_2_template,
        reminder_3_enabled ?? true, reminder_3_days ?? 30, reminder_3_subject, reminder_3_template,
        legal_notice_enabled ?? false, legal_notice_days ?? 45, legal_notice_subject, legal_notice_template,
        include_pdf ?? true, cc_email, exclude_weekends ?? true
      ]);
    }

    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Récupérer les factures en retard
router.get('/overdue', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user?.organization_id || null;
    const { min_days, max_days } = req.query;

    let query = `
      SELECT
        i.id,
        i.invoice_number,
        i.customer_id,
        c.name as customer_name,
        c.email as customer_email,
        i.total_amount,
        COALESCE((SELECT SUM(amount) FROM payments WHERE invoice_id = i.id), 0) as amount_paid,
        i.total_amount - COALESCE((SELECT SUM(amount) FROM payments WHERE invoice_id = i.id), 0) as amount_due,
        i.due_date,
        CURRENT_DATE - i.due_date::DATE as days_overdue,
        i.status,
        (SELECT COUNT(*) FROM payment_reminders WHERE invoice_id = i.id) as reminders_sent,
        (SELECT MAX(sent_at) FROM payment_reminders WHERE invoice_id = i.id) as last_reminder_date,
        (SELECT reminder_type FROM payment_reminders WHERE invoice_id = i.id ORDER BY sent_at DESC LIMIT 1) as last_reminder_type
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      WHERE i.status IN ('sent', 'overdue', 'partial')
        AND i.due_date < CURRENT_DATE
        AND i.deleted_at IS NULL
    `;

    const params: any[] = [];

    if (organizationId) {
      params.push(organizationId);
      query += ` AND i.organization_id = $${params.length}`;
    }

    if (min_days) {
      params.push(parseInt(min_days as string));
      query += ` AND CURRENT_DATE - i.due_date::DATE >= $${params.length}`;
    }

    if (max_days) {
      params.push(parseInt(max_days as string));
      query += ` AND CURRENT_DATE - i.due_date::DATE <= $${params.length}`;
    }

    query += ' ORDER BY days_overdue DESC';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Historique des relances
router.get('/history', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { invoice_id, limit } = req.query;

    let query = `
      SELECT pr.*,
        i.invoice_number,
        c.name as customer_name
      FROM payment_reminders pr
      LEFT JOIN invoices i ON pr.invoice_id = i.id
      LEFT JOIN customers c ON i.customer_id = c.id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (invoice_id) {
      params.push(invoice_id);
      query += ` AND pr.invoice_id = $${params.length}`;
    }

    query += ' ORDER BY pr.sent_at DESC';

    if (limit) {
      params.push(parseInt(limit as string));
      query += ` LIMIT $${params.length}`;
    } else {
      query += ' LIMIT 50';
    }

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err: any) {
    // Return empty array on error
    res.json([]);
  }
});

// Récupérer la queue des relances
router.get('/queue', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user?.organization_id || null;
    const { status } = req.query;

    let query = `
      SELECT rq.*,
        i.invoice_number,
        i.total_amount,
        c.name as customer_name,
        c.email as customer_email
      FROM reminder_queue rq
      LEFT JOIN invoices i ON rq.invoice_id = i.id
      LEFT JOIN customers c ON i.customer_id = c.id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (organizationId) {
      params.push(organizationId);
      query += ` AND rq.organization_id = $${params.length}`;
    }

    if (status) {
      params.push(status);
      query += ` AND rq.status = $${params.length}`;
    } else {
      query += ` AND rq.status = 'pending'`;
    }

    query += ' ORDER BY rq.scheduled_date ASC';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Envoyer une relance manuellement
router.post('/send/:invoiceId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { invoiceId } = req.params;
    const { reminder_type, custom_message } = req.body;
    const organizationId = req.user?.organization_id || null;

    // Récupérer la facture
    const invoiceResult = await db.query(`
      SELECT i.*, c.name as customer_name, c.email as customer_email
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      WHERE i.id = $1 AND i.deleted_at IS NULL
    `, [invoiceId]);

    if (invoiceResult.rows.length === 0) {
      res.status(404).json({ error: 'Facture non trouvée' });
      return;
    }

    const invoice = invoiceResult.rows[0];

    if (!invoice.customer_email) {
      res.status(400).json({ error: 'Le client n\'a pas d\'adresse email' });
      return;
    }

    // Calculer les jours de retard
    const daysOverdue = Math.floor((Date.now() - new Date(invoice.due_date).getTime()) / (1000 * 60 * 60 * 24));

    // Générer l'email
    const companyProfile = await getCompanyProfile();
    const reminderTypeToUse = reminder_type || (daysOverdue > 30 ? 'final' : daysOverdue > 15 ? 'second' : 'first');

    let htmlContent = generateReminderEmailHTML(invoice, reminderTypeToUse, companyProfile);
    if (custom_message) {
      htmlContent = `<p style="background: #fff3cd; padding: 15px; border-radius: 8px; margin-bottom: 20px;">${custom_message}</p>` + htmlContent;
    }

    // Récupérer les paramètres
    const settingsResult = await db.query(
      'SELECT * FROM reminder_settings WHERE organization_id = $1',
      [organizationId]
    );
    const settings = settingsResult.rows[0];

    const subjectTemplates: Record<string, string> = {
      first: 'Rappel de paiement - Facture {invoice_number}',
      second: 'Second rappel - Facture {invoice_number}',
      final: 'Dernier rappel avant mise en recouvrement - Facture {invoice_number}',
      legal: 'Mise en demeure de payer - Facture {invoice_number}'
    };

    const subject = (settings?.[`${reminderTypeToUse === 'first' ? 'reminder_1' : reminderTypeToUse === 'second' ? 'reminder_2' : reminderTypeToUse === 'final' ? 'reminder_3' : 'legal_notice'}_subject`] || subjectTemplates[reminderTypeToUse])
      .replace('{invoice_number}', invoice.invoice_number);

    // Envoyer l'email
    const emailResult = await sendEmail({
      to: invoice.customer_email,
      subject,
      html: htmlContent,
      cc: settings?.cc_email
    });

    // Logger l'email
    const emailLog = await logEmail('reminder', parseInt(invoiceId), invoice.customer_email, emailResult);

    // Enregistrer la relance
    await db.query(`
      INSERT INTO payment_reminders (
        invoice_id, customer_id, reminder_type, reminder_number,
        email_to, subject, status, amount_due, days_overdue, organization_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [
      invoiceId,
      invoice.customer_id,
      reminderTypeToUse,
      reminderTypeToUse === 'first' ? 1 : reminderTypeToUse === 'second' ? 2 : reminderTypeToUse === 'final' ? 3 : 4,
      invoice.customer_email,
      subject,
      emailResult.success ? 'sent' : 'failed',
      invoice.total_amount,
      daysOverdue,
      organizationId
    ]);

    // Annuler la relance dans la queue si elle existe
    await db.query(`
      UPDATE reminder_queue
      SET status = 'sent', processed_at = NOW()
      WHERE invoice_id = $1 AND reminder_type = $2 AND status = 'pending'
    `, [invoiceId, reminderTypeToUse]);

    // Mettre à jour le statut de la facture si nécessaire
    if (invoice.status === 'sent' && daysOverdue > 0) {
      await db.query(
        'UPDATE invoices SET status = $1 WHERE id = $2',
        ['overdue', invoiceId]
      );
    }

    if (emailResult.success) {
      res.json({
        message: 'Relance envoyée avec succès',
        reminder_type: reminderTypeToUse,
        days_overdue: daysOverdue
      });
    } else {
      res.status(500).json({
        error: 'Erreur lors de l\'envoi de la relance',
        details: emailResult.error
      });
    }
  } catch (err: any) {
    console.error('Erreur envoi relance:', err);
    res.status(500).json({ error: err.message });
  }
});

// Traiter les relances planifiées (pour le cron)
router.post('/process', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    // Récupérer les relances à envoyer aujourd'hui
    const today = new Date().toISOString().split('T')[0];

    const queueResult = await db.query(`
      SELECT rq.*,
        i.invoice_number, i.total_amount, i.due_date, i.customer_id,
        c.name as customer_name, c.email as customer_email
      FROM reminder_queue rq
      JOIN invoices i ON rq.invoice_id = i.id
      LEFT JOIN customers c ON i.customer_id = c.id
      WHERE rq.status = 'pending'
        AND rq.scheduled_date <= $1
        AND i.status IN ('sent', 'overdue', 'partial')
        AND i.deleted_at IS NULL
      ORDER BY rq.scheduled_date ASC
    `, [today]);

    const results = {
      processed: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      details: [] as any[]
    };

    for (const reminder of queueResult.rows) {
      results.processed++;

      // Vérifier le week-end
      const dayOfWeek = new Date().getDay();
      const settingsResult = await db.query(
        'SELECT exclude_weekends, cc_email FROM reminder_settings WHERE organization_id = $1',
        [reminder.organization_id]
      );
      const settings = settingsResult.rows[0];

      if (settings?.exclude_weekends && (dayOfWeek === 0 || dayOfWeek === 6)) {
        results.skipped++;
        await db.query(
          'UPDATE reminder_queue SET scheduled_date = scheduled_date + 1 WHERE id = $1',
          [reminder.id]
        );
        continue;
      }

      // Vérifier si le client a un email
      if (!reminder.customer_email) {
        results.skipped++;
        await db.query(
          'UPDATE reminder_queue SET status = $1, error_message = $2, processed_at = NOW() WHERE id = $3',
          ['skipped', 'Client sans adresse email', reminder.id]
        );
        continue;
      }

      try {
        // Calculer les jours de retard
        const daysOverdue = Math.floor((Date.now() - new Date(reminder.due_date).getTime()) / (1000 * 60 * 60 * 24));

        // Générer et envoyer l'email
        const companyProfile = await getCompanyProfile();
        const invoice = {
          ...reminder,
          invoice_number: reminder.invoice_number
        };

        const htmlContent = generateReminderEmailHTML(invoice, reminder.reminder_type, companyProfile);

        const subjectTemplates: Record<string, string> = {
          first: 'Rappel de paiement - Facture {invoice_number}',
          second: 'Second rappel - Facture {invoice_number}',
          final: 'Dernier rappel avant mise en recouvrement - Facture {invoice_number}',
          legal: 'Mise en demeure de payer - Facture {invoice_number}'
        };

        const subject = subjectTemplates[reminder.reminder_type].replace('{invoice_number}', reminder.invoice_number);

        const emailResult = await sendEmail({
          to: reminder.customer_email,
          subject,
          html: htmlContent,
          cc: settings?.cc_email
        });

        await logEmail('reminder', reminder.invoice_id, reminder.customer_email, emailResult);

        // Enregistrer la relance
        await db.query(`
          INSERT INTO payment_reminders (
            invoice_id, customer_id, reminder_type, reminder_number,
            email_to, subject, status, amount_due, days_overdue, organization_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
          reminder.invoice_id,
          reminder.customer_id,
          reminder.reminder_type,
          reminder.reminder_type === 'first' ? 1 : reminder.reminder_type === 'second' ? 2 : reminder.reminder_type === 'final' ? 3 : 4,
          reminder.customer_email,
          subject,
          emailResult.success ? 'sent' : 'failed',
          reminder.total_amount,
          daysOverdue,
          reminder.organization_id
        ]);

        // Mettre à jour la queue
        await db.query(
          'UPDATE reminder_queue SET status = $1, processed_at = NOW() WHERE id = $2',
          ['sent', reminder.id]
        );

        // Mettre à jour le statut de la facture
        await db.query(
          'UPDATE invoices SET status = $1 WHERE id = $2 AND status = $3',
          ['overdue', reminder.invoice_id, 'sent']
        );

        results.sent++;
        results.details.push({
          invoice_id: reminder.invoice_id,
          invoice_number: reminder.invoice_number,
          reminder_type: reminder.reminder_type,
          status: 'sent'
        });

      } catch (error: any) {
        results.failed++;
        await db.query(
          'UPDATE reminder_queue SET status = $1, error_message = $2, processed_at = NOW() WHERE id = $3',
          ['skipped', error.message, reminder.id]
        );

        results.details.push({
          invoice_id: reminder.invoice_id,
          invoice_number: reminder.invoice_number,
          reminder_type: reminder.reminder_type,
          status: 'failed',
          error: error.message
        });
      }
    }

    res.json(results);
  } catch (err: any) {
    console.error('Erreur traitement relances:', err);
    res.status(500).json({ error: err.message });
  }
});

// Statistiques des relances
router.get('/stats', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const result = await db.query(`
      SELECT
        COUNT(*) as total_reminders,
        COUNT(*) FILTER (WHERE reminder_type = 'first') as first_reminders,
        COUNT(*) FILTER (WHERE reminder_type = 'second') as second_reminders,
        COUNT(*) FILTER (WHERE reminder_type = 'final') as final_reminders,
        COUNT(*) FILTER (WHERE reminder_type = 'legal') as legal_notices,
        0 as resulted_in_payment,
        0 as success_rate
      FROM payment_reminders
    `);

    // Factures en retard
    const overdueResult = await db.query(`
      SELECT
        COUNT(*) as total_overdue,
        COALESCE(SUM(total_amount - COALESCE((SELECT SUM(amount) FROM payments WHERE invoice_id = i.id), 0)), 0) as total_amount_overdue,
        COALESCE(AVG(CURRENT_DATE - due_date::DATE), 0) as avg_days_overdue
      FROM invoices i
      WHERE status IN ('sent', 'overdue', 'partial')
        AND due_date < CURRENT_DATE
        AND deleted_at IS NULL
    `);

    res.json({
      reminders: result.rows[0],
      overdue: overdueResult.rows[0]
    });
  } catch (err: any) {
    // Return empty stats on error
    res.json({
      reminders: {
        total_reminders: 0,
        first_reminders: 0,
        second_reminders: 0,
        final_reminders: 0,
        legal_notices: 0,
        resulted_in_payment: 0,
        success_rate: 0
      },
      overdue: {
        total_overdue: 0,
        total_amount_overdue: 0,
        avg_days_overdue: 0
      }
    });
  }
});

// Annuler une relance planifiée
router.delete('/queue/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'UPDATE reminder_queue SET status = $1 WHERE id = $2 AND status = $3 RETURNING *',
      ['cancelled', id, 'pending']
    );

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Relance non trouvée ou déjà traitée' });
      return;
    }

    res.json({ message: 'Relance annulée' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
