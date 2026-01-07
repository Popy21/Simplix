import express, { Response } from 'express';
import { pool as db } from '../database/db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

// ==========================================
// ÉCHÉANCIERS DE PAIEMENT
// ==========================================

// Liste des échéanciers
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;
    const { invoice_id, quote_id, status } = req.query;

    let query = `
      SELECT
        ps.*,
        i.invoice_number,
        q.quote_number,
        c.name as customer_name,
        (SELECT COUNT(*) FROM payment_schedule_items WHERE schedule_id = ps.id) as installments_count,
        (SELECT COUNT(*) FROM payment_schedule_items WHERE schedule_id = ps.id AND status = 'paid') as paid_count,
        (SELECT SUM(paid_amount) FROM payment_schedule_items WHERE schedule_id = ps.id) as total_paid
      FROM payment_schedules ps
      LEFT JOIN invoices i ON ps.invoice_id = i.id
      LEFT JOIN quotes q ON ps.quote_id = q.id
      LEFT JOIN customers c ON COALESCE(i.customer_id, q.customer_id) = c.id
      WHERE ps.organization_id = $1
    `;
    const params: any[] = [organizationId];

    if (invoice_id) {
      params.push(invoice_id);
      query += ` AND ps.invoice_id = $${params.length}`;
    }
    if (quote_id) {
      params.push(quote_id);
      query += ` AND ps.quote_id = $${params.length}`;
    }
    if (status) {
      params.push(status);
      query += ` AND ps.status = $${params.length}`;
    }

    query += ' ORDER BY ps.created_at DESC';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Détail d'un échéancier
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = (req.user as any)?.organizationId;

    const scheduleResult = await db.query(`
      SELECT
        ps.*,
        i.invoice_number,
        q.quote_number,
        c.name as customer_name
      FROM payment_schedules ps
      LEFT JOIN invoices i ON ps.invoice_id = i.id
      LEFT JOIN quotes q ON ps.quote_id = q.id
      LEFT JOIN customers c ON COALESCE(i.customer_id, q.customer_id) = c.id
      WHERE ps.id = $1 AND ps.organization_id = $2
    `, [id, organizationId]);

    if (scheduleResult.rows.length === 0) {
      res.status(404).json({ error: 'Échéancier non trouvé' });
      return;
    }

    const itemsResult = await db.query(`
      SELECT * FROM payment_schedule_items
      WHERE schedule_id = $1
      ORDER BY installment_number
    `, [id]);

    res.json({
      ...scheduleResult.rows[0],
      items: itemsResult.rows
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Créer un échéancier
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;
    const {
      invoice_id,
      quote_id,
      total_amount,
      currency,
      installments_count,
      schedule_type,
      first_due_date,
      interval_days,
      custom_items,
      notes
    } = req.body;

    const client = await db.connect();
    try {
      await client.query('BEGIN');

      // Créer l'échéancier
      const scheduleResult = await client.query(`
        INSERT INTO payment_schedules (organization_id, invoice_id, quote_id, total_amount, currency, installments_count, schedule_type, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [organizationId, invoice_id, quote_id, total_amount, currency || 'EUR', installments_count, schedule_type || 'equal', notes]);

      const scheduleId = scheduleResult.rows[0].id;

      // Générer les échéances
      if (schedule_type === 'custom' && custom_items) {
        // Échéances personnalisées
        for (const item of custom_items) {
          await client.query(`
            INSERT INTO payment_schedule_items (schedule_id, installment_number, amount, percentage, due_date)
            VALUES ($1, $2, $3, $4, $5)
          `, [scheduleId, item.installment_number, item.amount, item.percentage, item.due_date]);
        }
      } else {
        // Génération automatique (montants égaux)
        const amountPerInstallment = Math.round((total_amount / installments_count) * 100) / 100;
        const remainder = Math.round((total_amount - amountPerInstallment * installments_count) * 100) / 100;

        const baseDate = new Date(first_due_date || new Date());
        const interval = interval_days || 30;

        for (let i = 1; i <= installments_count; i++) {
          const dueDate = new Date(baseDate);
          dueDate.setDate(dueDate.getDate() + (i - 1) * interval);

          const amount = i === installments_count ? amountPerInstallment + remainder : amountPerInstallment;
          const percentage = Math.round((amount / total_amount) * 10000) / 100;

          await client.query(`
            INSERT INTO payment_schedule_items (schedule_id, installment_number, amount, percentage, due_date)
            VALUES ($1, $2, $3, $4, $5)
          `, [scheduleId, i, amount, percentage, dueDate.toISOString().split('T')[0]]);
        }
      }

      await client.query('COMMIT');

      // Récupérer l'échéancier complet
      const result = await db.query(`
        SELECT * FROM payment_schedule_items WHERE schedule_id = $1 ORDER BY installment_number
      `, [scheduleId]);

      res.status(201).json({
        ...scheduleResult.rows[0],
        items: result.rows
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Enregistrer un paiement sur une échéance
router.post('/:scheduleId/items/:itemId/pay', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { scheduleId, itemId } = req.params;
    const organizationId = (req.user as any)?.organizationId;
    const { amount, payment_date, payment_method, reference } = req.body;

    const client = await db.connect();
    try {
      await client.query('BEGIN');

      // Vérifier l'échéancier
      const scheduleCheck = await client.query(`
        SELECT ps.*, i.id as invoice_id FROM payment_schedules ps
        LEFT JOIN invoices i ON ps.invoice_id = i.id
        WHERE ps.id = $1 AND ps.organization_id = $2
      `, [scheduleId, organizationId]);

      if (scheduleCheck.rows.length === 0) {
        res.status(404).json({ error: 'Échéancier non trouvé' });
        return;
      }

      const schedule = scheduleCheck.rows[0];

      // Créer le paiement si lié à une facture
      let paymentId = null;
      if (schedule.invoice_id) {
        const paymentResult = await client.query(`
          INSERT INTO payments (invoice_id, payment_date, amount, payment_method, reference, organization_id)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id
        `, [schedule.invoice_id, payment_date || new Date(), amount, payment_method || 'transfer', reference, organizationId]);
        paymentId = paymentResult.rows[0].id;
      }

      // Mettre à jour l'échéance
      await client.query(`
        UPDATE payment_schedule_items
        SET paid_amount = paid_amount + $1, paid_date = $2, payment_id = $3,
            status = CASE WHEN paid_amount + $1 >= amount THEN 'paid' ELSE 'pending' END
        WHERE id = $4 AND schedule_id = $5
      `, [amount, payment_date || new Date(), paymentId, itemId, scheduleId]);

      // Mettre à jour le statut global de l'échéancier
      const itemsCheck = await client.query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'paid') as paid_count,
          COUNT(*) as total_count
        FROM payment_schedule_items WHERE schedule_id = $1
      `, [scheduleId]);

      const { paid_count, total_count } = itemsCheck.rows[0];
      let newStatus = 'pending';
      if (paid_count === total_count) {
        newStatus = 'completed';
      } else if (paid_count > 0) {
        newStatus = 'partial';
      }

      await client.query(`
        UPDATE payment_schedules SET status = $1, updated_at = NOW() WHERE id = $2
      `, [newStatus, scheduleId]);

      await client.query('COMMIT');

      res.json({ message: 'Paiement enregistré', status: newStatus });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Supprimer un échéancier
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = (req.user as any)?.organizationId;

    // Vérifier qu'aucun paiement n'a été effectué
    const paidCheck = await db.query(`
      SELECT COUNT(*) FROM payment_schedule_items WHERE schedule_id = $1 AND status = 'paid'
    `, [id]);

    if (parseInt(paidCheck.rows[0].count) > 0) {
      res.status(400).json({ error: 'Impossible de supprimer un échéancier avec des paiements effectués' });
      return;
    }

    await db.query(`
      DELETE FROM payment_schedules WHERE id = $1 AND organization_id = $2
    `, [id, organizationId]);

    res.json({ message: 'Échéancier supprimé' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Simulation d'échéancier (sans création)
router.post('/simulate', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { total_amount, installments_count, first_due_date, interval_days } = req.body;

    const items = [];
    const amountPerInstallment = Math.round((total_amount / installments_count) * 100) / 100;
    const remainder = Math.round((total_amount - amountPerInstallment * installments_count) * 100) / 100;

    const baseDate = new Date(first_due_date || new Date());
    const interval = interval_days || 30;

    for (let i = 1; i <= installments_count; i++) {
      const dueDate = new Date(baseDate);
      dueDate.setDate(dueDate.getDate() + (i - 1) * interval);

      const amount = i === installments_count ? amountPerInstallment + remainder : amountPerInstallment;

      items.push({
        installment_number: i,
        amount,
        percentage: Math.round((amount / total_amount) * 10000) / 100,
        due_date: dueDate.toISOString().split('T')[0]
      });
    }

    res.json({
      total_amount,
      installments_count,
      interval_days: interval,
      items
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
