import express, { Response } from 'express';
import { pool as db } from '../database/db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

// ==========================================
// NOTES DE FRAIS
// ==========================================

// Liste des notes de frais
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;
    const { status, employee_id, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = `
      SELECT
        en.*,
        u.first_name || ' ' || u.last_name as employee_name,
        a.first_name || ' ' || a.last_name as approved_by_name
      FROM expense_notes en
      LEFT JOIN users u ON en.employee_id = u.id
      LEFT JOIN users a ON en.approved_by = a.id
      WHERE en.organization_id = $1
    `;
    const params: any[] = [organizationId];

    if (status) {
      params.push(status);
      query += ` AND en.status = $${params.length}`;
    }

    if (employee_id) {
      params.push(employee_id);
      query += ` AND en.employee_id = $${params.length}`;
    }

    query += ` ORDER BY en.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(Number(limit), offset);

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Générer un numéro de note de frais
router.get('/next-number', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');

    const result = await db.query(`
      SELECT expense_number FROM expense_notes
      WHERE organization_id = $1 AND expense_number LIKE $2
      ORDER BY expense_number DESC LIMIT 1
    `, [organizationId, `NDF-${year}${month}-%`]);

    let nextNum = 1;
    if (result.rows.length > 0) {
      const match = result.rows[0].expense_number.match(/NDF-\d{6}-(\d+)/);
      if (match) nextNum = parseInt(match[1]) + 1;
    }

    res.json({
      expense_number: `NDF-${year}${month}-${String(nextNum).padStart(4, '0')}`
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Créer une note de frais
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;
    const userId = (req.user as any)?.id;
    const {
      expense_number,
      employee_id,
      employee_name,
      period_start,
      period_end,
      notes,
      items
    } = req.body;

    // Générer le numéro si non fourni
    let finalExpenseNumber = expense_number;
    if (!finalExpenseNumber) {
      const year = new Date().getFullYear();
      const month = String(new Date().getMonth() + 1).padStart(2, '0');
      const numResult = await db.query(`
        SELECT expense_number FROM expense_notes
        WHERE organization_id = $1 AND expense_number LIKE $2
        ORDER BY expense_number DESC LIMIT 1
      `, [organizationId, `NDF-${year}${month}-%`]);

      let nextNum = 1;
      if (numResult.rows.length > 0) {
        const match = numResult.rows[0].expense_number.match(/NDF-\d{6}-(\d+)/);
        if (match) nextNum = parseInt(match[1]) + 1;
      }
      finalExpenseNumber = `NDF-${year}${month}-${String(nextNum).padStart(4, '0')}`;
    }

    // Créer la note de frais
    const result = await db.query(`
      INSERT INTO expense_notes (
        organization_id, expense_number, employee_id, employee_name,
        period_start, period_end, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      organizationId, finalExpenseNumber,
      employee_id || userId, employee_name,
      period_start, period_end, notes, userId
    ]);

    const expenseNoteId = result.rows[0].id;

    // Ajouter les lignes
    if (items && items.length > 0) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        await db.query(`
          INSERT INTO expense_note_items (
            expense_note_id, expense_type, expense_date, description,
            amount, currency, km_distance, km_rate, vehicle_type,
            vehicle_power, receipt_url, receipt_filename,
            departure_location, arrival_location, customer_id,
            project_name, is_billable, sort_order
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        `, [
          expenseNoteId, item.expense_type, item.expense_date, item.description,
          item.amount, item.currency || 'EUR', item.km_distance, item.km_rate,
          item.vehicle_type, item.vehicle_power, item.receipt_url, item.receipt_filename,
          item.departure_location, item.arrival_location, item.customer_id,
          item.project_name, item.is_billable || false, i
        ]);
      }
    }

    // Récupérer la note complète
    const completeResult = await db.query(`
      SELECT * FROM expense_notes WHERE id = $1
    `, [expenseNoteId]);

    res.status(201).json(completeResult.rows[0]);
  } catch (err: any) {
    console.error('Erreur création note de frais:', err);
    res.status(500).json({ error: err.message });
  }
});

// Détail d'une note de frais
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = (req.user as any)?.organizationId;

    const result = await db.query(`
      SELECT
        en.*,
        u.first_name || ' ' || u.last_name as employee_name,
        a.first_name || ' ' || a.last_name as approved_by_name
      FROM expense_notes en
      LEFT JOIN users u ON en.employee_id = u.id
      LEFT JOIN users a ON en.approved_by = a.id
      WHERE en.id = $1 AND en.organization_id = $2
    `, [id, organizationId]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Note de frais non trouvée' });
      return;
    }

    // Récupérer les lignes
    const itemsResult = await db.query(`
      SELECT
        eni.*,
        c.name as customer_name
      FROM expense_note_items eni
      LEFT JOIN customers c ON eni.customer_id = c.id
      WHERE eni.expense_note_id = $1
      ORDER BY eni.sort_order
    `, [id]);

    res.json({
      ...result.rows[0],
      items: itemsResult.rows
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Mettre à jour une note de frais
router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = (req.user as any)?.organizationId;
    const { period_start, period_end, notes, items } = req.body;

    // Vérifier que la note existe et n'est pas validée
    const existing = await db.query(
      'SELECT id, status FROM expense_notes WHERE id = $1 AND organization_id = $2',
      [id, organizationId]
    );

    if (existing.rows.length === 0) {
      res.status(404).json({ error: 'Note de frais non trouvée' });
      return;
    }

    if (['approved', 'paid'].includes(existing.rows[0].status)) {
      res.status(400).json({ error: 'Cette note de frais ne peut plus être modifiée' });
      return;
    }

    await db.query(`
      UPDATE expense_notes SET
        period_start = COALESCE($1, period_start),
        period_end = COALESCE($2, period_end),
        notes = $3,
        updated_at = NOW()
      WHERE id = $4
    `, [period_start, period_end, notes, id]);

    // Mettre à jour les lignes si fournies
    if (items !== undefined) {
      await db.query('DELETE FROM expense_note_items WHERE expense_note_id = $1', [id]);

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        await db.query(`
          INSERT INTO expense_note_items (
            expense_note_id, expense_type, expense_date, description,
            amount, currency, km_distance, km_rate, vehicle_type,
            vehicle_power, receipt_url, receipt_filename,
            departure_location, arrival_location, customer_id,
            project_name, is_billable, sort_order
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        `, [
          id, item.expense_type, item.expense_date, item.description,
          item.amount, item.currency || 'EUR', item.km_distance, item.km_rate,
          item.vehicle_type, item.vehicle_power, item.receipt_url, item.receipt_filename,
          item.departure_location, item.arrival_location, item.customer_id,
          item.project_name, item.is_billable || false, i
        ]);
      }
    }

    // Récupérer la note mise à jour
    const result = await db.query('SELECT * FROM expense_notes WHERE id = $1', [id]);
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Soumettre une note de frais
router.post('/:id/submit', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = (req.user as any)?.organizationId;

    const result = await db.query(`
      UPDATE expense_notes SET
        status = 'submitted',
        submitted_at = NOW(),
        updated_at = NOW()
      WHERE id = $1 AND organization_id = $2 AND status = 'draft'
      RETURNING *
    `, [id, organizationId]);

    if (result.rows.length === 0) {
      res.status(400).json({ error: 'Impossible de soumettre cette note de frais' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Approuver une note de frais
router.post('/:id/approve', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = (req.user as any)?.organizationId;
    const userId = (req.user as any)?.id;

    const result = await db.query(`
      UPDATE expense_notes SET
        status = 'approved',
        approved_by = $1,
        approved_at = NOW(),
        updated_at = NOW()
      WHERE id = $2 AND organization_id = $3 AND status = 'submitted'
      RETURNING *
    `, [userId, id, organizationId]);

    if (result.rows.length === 0) {
      res.status(400).json({ error: 'Impossible d\'approuver cette note de frais' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Rejeter une note de frais
router.post('/:id/reject', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { rejection_reason } = req.body;
    const organizationId = (req.user as any)?.organizationId;
    const userId = (req.user as any)?.id;

    const result = await db.query(`
      UPDATE expense_notes SET
        status = 'rejected',
        approved_by = $1,
        approved_at = NOW(),
        rejection_reason = $2,
        updated_at = NOW()
      WHERE id = $3 AND organization_id = $4 AND status = 'submitted'
      RETURNING *
    `, [userId, rejection_reason, id, organizationId]);

    if (result.rows.length === 0) {
      res.status(400).json({ error: 'Impossible de rejeter cette note de frais' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Marquer comme payée
router.post('/:id/pay', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { payment_reference } = req.body;
    const organizationId = (req.user as any)?.organizationId;

    const result = await db.query(`
      UPDATE expense_notes SET
        status = 'paid',
        paid_at = NOW(),
        payment_reference = $1,
        updated_at = NOW()
      WHERE id = $2 AND organization_id = $3 AND status = 'approved'
      RETURNING *
    `, [payment_reference, id, organizationId]);

    if (result.rows.length === 0) {
      res.status(400).json({ error: 'Impossible de marquer cette note comme payée' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Supprimer une note de frais
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = (req.user as any)?.organizationId;

    const result = await db.query(`
      DELETE FROM expense_notes
      WHERE id = $1 AND organization_id = $2 AND status = 'draft'
      RETURNING id
    `, [id, organizationId]);

    if (result.rows.length === 0) {
      res.status(400).json({ error: 'Impossible de supprimer cette note de frais' });
      return;
    }

    res.json({ message: 'Note de frais supprimée' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Barème kilométrique
router.get('/km-rates/:year', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { year } = req.params;

    const result = await db.query(`
      SELECT * FROM km_rates WHERE year = $1 ORDER BY vehicle_type, vehicle_power
    `, [year]);

    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Calculer indemnité km
router.post('/calculate-km', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { year, vehicle_type, vehicle_power, total_km } = req.body;

    const rateResult = await db.query(`
      SELECT * FROM km_rates
      WHERE year = $1 AND vehicle_type = $2 AND vehicle_power = $3
    `, [year || new Date().getFullYear(), vehicle_type, vehicle_power]);

    if (rateResult.rows.length === 0) {
      // Taux par défaut
      res.json({
        amount: parseFloat((total_km * 0.603).toFixed(2)),
        rate_used: 0.603,
        note: 'Taux par défaut utilisé'
      });
      return;
    }

    const rate = rateResult.rows[0];
    let amount = 0;

    if (total_km <= 5000) {
      amount = total_km * parseFloat(rate.rate_up_to_5000);
    } else if (total_km <= 20000) {
      amount = (total_km * parseFloat(rate.rate_5001_to_20000)) + parseFloat(rate.fixed_amount_5001_20000 || 0);
    } else {
      amount = total_km * parseFloat(rate.rate_above_20000);
    }

    res.json({
      amount: parseFloat(amount.toFixed(2)),
      rate_bracket: total_km <= 5000 ? 'up_to_5000' : (total_km <= 20000 ? '5001_to_20000' : 'above_20000'),
      km_rate: total_km <= 5000 ? rate.rate_up_to_5000 : (total_km <= 20000 ? rate.rate_5001_to_20000 : rate.rate_above_20000)
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Statistiques des notes de frais
router.get('/stats/summary', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;
    const { year } = req.query;
    const targetYear = year || new Date().getFullYear();

    const result = await db.query(`
      SELECT
        COUNT(*) as total_notes,
        COUNT(*) FILTER (WHERE status = 'draft') as draft_count,
        COUNT(*) FILTER (WHERE status = 'submitted') as submitted_count,
        COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
        COUNT(*) FILTER (WHERE status = 'paid') as paid_count,
        COALESCE(SUM(total_amount), 0) as total_amount,
        COALESCE(SUM(total_amount) FILTER (WHERE status = 'paid'), 0) as paid_amount,
        COALESCE(SUM(total_amount) FILTER (WHERE status IN ('submitted', 'approved')), 0) as pending_amount,
        COALESCE(SUM(total_km), 0) as total_km
      FROM expense_notes
      WHERE organization_id = $1
        AND EXTRACT(YEAR FROM created_at) = $2
    `, [organizationId, targetYear]);

    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
