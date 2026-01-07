import express, { Response } from 'express';
import { pool as db } from '../database/db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

// ==========================================
// PRÉVISION DE TRÉSORERIE
// ==========================================

// Prévision de trésorerie automatique basée sur les factures
router.get('/forecast', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;
    const { months = 3 } = req.query;
    const numMonths = Math.min(12, Math.max(1, parseInt(months as string) || 3));

    // Encaissements prévus (factures non payées)
    const inflows = await db.query(`
      SELECT
        date_trunc('month', due_date) as month,
        COALESCE(SUM(total_amount - COALESCE(paid_amount, 0)), 0) as expected_amount,
        COUNT(*) as invoice_count
      FROM invoices
      WHERE organization_id = $1
        AND status IN ('sent', 'partial')
        AND deleted_at IS NULL
        AND due_date >= CURRENT_DATE
        AND due_date < CURRENT_DATE + INTERVAL '${numMonths} months'
      GROUP BY date_trunc('month', due_date)
      ORDER BY month
    `, [organizationId]);

    // Décaissements prévus (factures fournisseurs, charges récurrentes)
    const outflows = await db.query(`
      SELECT
        date_trunc('month', due_date) as month,
        COALESCE(SUM(amount), 0) as expected_amount,
        COUNT(*) as expense_count
      FROM expenses
      WHERE organization_id = $1
        AND status = 'pending'
        AND deleted_at IS NULL
        AND due_date >= CURRENT_DATE
        AND due_date < CURRENT_DATE + INTERVAL '${numMonths} months'
      GROUP BY date_trunc('month', due_date)
      ORDER BY month
    `, [organizationId]);

    // Solde actuel estimé
    const balance = await db.query(`
      SELECT
        COALESCE(SUM(amount) FILTER (WHERE p.payment_date IS NOT NULL), 0) as total_received,
        COALESCE(SUM(e.amount) FILTER (WHERE e.status = 'paid'), 0) as total_paid
      FROM invoices i
      LEFT JOIN payments p ON p.invoice_id = i.id
      CROSS JOIN expenses e
      WHERE i.organization_id = $1 AND i.deleted_at IS NULL
        AND e.organization_id = $1 AND e.deleted_at IS NULL
    `, [organizationId]);

    res.json({
      period: `${numMonths} months`,
      currentBalance: parseFloat(balance.rows[0]?.total_received || 0) - parseFloat(balance.rows[0]?.total_paid || 0),
      expectedInflows: inflows.rows,
      expectedOutflows: outflows.rows,
      summary: {
        totalExpectedInflows: inflows.rows.reduce((sum: number, r: any) => sum + parseFloat(r.expected_amount), 0),
        totalExpectedOutflows: outflows.rows.reduce((sum: number, r: any) => sum + parseFloat(r.expected_amount), 0)
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Liste des prévisions
router.get('/forecasts', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;

    const result = await db.query(`
      SELECT
        cf.*,
        u.first_name || ' ' || u.last_name as created_by_name,
        COALESCE(SUM(ci.amount) FILTER (WHERE ci.type = 'inflow'), 0) as total_inflows,
        COALESCE(SUM(ci.amount) FILTER (WHERE ci.type = 'outflow'), 0) as total_outflows,
        cf.opening_balance +
          COALESCE(SUM(ci.amount) FILTER (WHERE ci.type = 'inflow'), 0) -
          COALESCE(SUM(ci.amount) FILTER (WHERE ci.type = 'outflow'), 0) as closing_balance
      FROM cashflow_forecasts cf
      LEFT JOIN users u ON cf.created_by = u.id
      LEFT JOIN cashflow_items ci ON cf.id = ci.forecast_id
      WHERE cf.organization_id = $1
      GROUP BY cf.id, u.first_name, u.last_name
      ORDER BY cf.start_date DESC
    `, [organizationId]);

    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Créer une prévision
router.post('/forecasts', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;
    const userId = (req.user as any)?.id;
    const { name, description, start_date, end_date, opening_balance } = req.body;

    const result = await db.query(`
      INSERT INTO cashflow_forecasts (
        organization_id, name, description, start_date, end_date,
        opening_balance, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [organizationId, name, description, start_date, end_date, opening_balance || 0, userId]);

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Détail d'une prévision avec items
router.get('/forecasts/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = (req.user as any)?.organizationId;

    const forecastResult = await db.query(`
      SELECT cf.*, u.first_name || ' ' || u.last_name as created_by_name
      FROM cashflow_forecasts cf
      LEFT JOIN users u ON cf.created_by = u.id
      WHERE cf.id = $1 AND cf.organization_id = $2
    `, [id, organizationId]);

    if (forecastResult.rows.length === 0) {
      res.status(404).json({ error: 'Prévision non trouvée' });
      return;
    }

    const itemsResult = await db.query(`
      SELECT * FROM cashflow_items
      WHERE forecast_id = $1
      ORDER BY expected_date, type
    `, [id]);

    // Calculer les totaux par catégorie
    const summaryResult = await db.query(`
      SELECT
        type,
        category,
        SUM(amount) as total_amount,
        COUNT(*) as count
      FROM cashflow_items
      WHERE forecast_id = $1
      GROUP BY type, category
      ORDER BY type, total_amount DESC
    `, [id]);

    res.json({
      ...forecastResult.rows[0],
      items: itemsResult.rows,
      summary: summaryResult.rows
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Ajouter une ligne de prévision
router.post('/forecasts/:id/items', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      type, category, expected_date, amount, description,
      reference_type, reference_id, is_recurring, recurrence_pattern
    } = req.body;

    const result = await db.query(`
      INSERT INTO cashflow_items (
        forecast_id, type, category, expected_date, amount,
        description, reference_type, reference_id,
        is_recurring, recurrence_pattern
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      id, type, category, expected_date, amount, description,
      reference_type, reference_id, is_recurring || false, recurrence_pattern
    ]);

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Marquer une ligne comme réalisée
router.post('/items/:itemId/realize', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { itemId } = req.params;
    const { realized_amount, realized_date } = req.body;

    const result = await db.query(`
      UPDATE cashflow_items SET
        is_realized = true,
        realized_amount = $1,
        realized_date = $2
      WHERE id = $3
      RETURNING *
    `, [realized_amount, realized_date || new Date(), itemId]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Item non trouvé' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Générer une prévision automatique basée sur les factures
router.post('/forecasts/generate', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;
    const userId = (req.user as any)?.id;
    const { name, start_date, end_date, opening_balance } = req.body;

    // Créer la prévision
    const forecastResult = await db.query(`
      INSERT INTO cashflow_forecasts (
        organization_id, name, start_date, end_date, opening_balance, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [organizationId, name || 'Prévision automatique', start_date, end_date, opening_balance || 0, userId]);

    const forecastId = forecastResult.rows[0].id;

    // Ajouter les factures à encaisser
    await db.query(`
      INSERT INTO cashflow_items (forecast_id, type, category, expected_date, amount, description, reference_type, reference_id)
      SELECT
        $1, 'inflow', 'invoices', due_date, total_amount - COALESCE(paid_amount, 0),
        'Facture ' || invoice_number || ' - ' || c.name, 'invoice', i.id
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      WHERE i.organization_id = $2
        AND i.status IN ('sent', 'partial', 'overdue')
        AND i.due_date BETWEEN $3 AND $4
        AND i.deleted_at IS NULL
    `, [forecastId, organizationId, start_date, end_date]);

    // Ajouter les dépenses à payer
    await db.query(`
      INSERT INTO cashflow_items (forecast_id, type, category, expected_date, amount, description, reference_type, reference_id)
      SELECT
        $1, 'outflow', 'suppliers', due_date, amount,
        'Dépense ' || COALESCE(reference, '') || ' - ' || COALESCE(s.name, description), 'expense', e.id
      FROM expenses e
      LEFT JOIN suppliers s ON e.supplier_id = s.id
      WHERE e.organization_id = $2
        AND e.status != 'paid'
        AND e.due_date BETWEEN $3 AND $4
        AND e.deleted_at IS NULL
    `, [forecastId, organizationId, start_date, end_date]);

    // Récupérer la prévision complète
    const result = await db.query(`
      SELECT
        cf.*,
        COALESCE(SUM(ci.amount) FILTER (WHERE ci.type = 'inflow'), 0) as total_inflows,
        COALESCE(SUM(ci.amount) FILTER (WHERE ci.type = 'outflow'), 0) as total_outflows
      FROM cashflow_forecasts cf
      LEFT JOIN cashflow_items ci ON cf.id = ci.forecast_id
      WHERE cf.id = $1
      GROUP BY cf.id
    `, [forecastId]);

    res.status(201).json({
      ...result.rows[0],
      message: 'Prévision générée automatiquement'
    });
  } catch (err: any) {
    console.error('Erreur génération prévision:', err);
    res.status(500).json({ error: err.message });
  }
});

// Vue mensuelle de la trésorerie
router.get('/monthly/:year', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { year } = req.params;
    const organizationId = (req.user as any)?.organizationId;

    // Encaissements réels (paiements reçus)
    const inflows = await db.query(`
      SELECT
        EXTRACT(MONTH FROM payment_date)::INTEGER as month,
        SUM(amount) as amount
      FROM payments p
      JOIN invoices i ON p.invoice_id = i.id
      WHERE i.organization_id = $1
        AND EXTRACT(YEAR FROM payment_date) = $2
      GROUP BY EXTRACT(MONTH FROM payment_date)
    `, [organizationId, year]);

    // Décaissements réels (dépenses payées)
    const outflows = await db.query(`
      SELECT
        EXTRACT(MONTH FROM paid_date)::INTEGER as month,
        SUM(amount) as amount
      FROM expenses
      WHERE organization_id = $1
        AND EXTRACT(YEAR FROM paid_date) = $2
        AND status = 'paid'
      GROUP BY EXTRACT(MONTH FROM paid_date)
    `, [organizationId, year]);

    // Construire le tableau mensuel
    const monthlyData = [];
    let runningBalance = 0;

    for (let month = 1; month <= 12; month++) {
      const inflow = inflows.rows.find(r => r.month === month);
      const outflow = outflows.rows.find(r => r.month === month);

      const monthInflows = parseFloat(inflow?.amount || '0');
      const monthOutflows = parseFloat(outflow?.amount || '0');
      const netFlow = monthInflows - monthOutflows;
      runningBalance += netFlow;

      monthlyData.push({
        month,
        inflows: monthInflows,
        outflows: monthOutflows,
        net_flow: netFlow,
        cumulative_balance: runningBalance
      });
    }

    res.json({
      year: parseInt(year),
      monthly_data: monthlyData,
      totals: {
        total_inflows: monthlyData.reduce((sum, m) => sum + m.inflows, 0),
        total_outflows: monthlyData.reduce((sum, m) => sum + m.outflows, 0),
        net_result: runningBalance
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
