import express, { Request, Response } from 'express';
import { pool } from '../database/connection';
import { authenticateToken } from '../middleware/auth';
import { requireOrganization } from '../middleware/organization';
import logger from '../utils/logger';
import { addDays, format, startOfMonth, endOfMonth } from 'date-fns';

const router = express.Router();

// Middleware
router.use(authenticateToken);
router.use(requireOrganization);

/**
 * GET /api/cash-flow/forecast
 * Prévisionnel de trésorerie
 */
router.get('/forecast', async (req: Request, res: Response) => {
  try {
    const { organization_id } = req.body;
    const { start_date, end_date, days = 90 } = req.query;

    const startDate = start_date || format(new Date(), 'yyyy-MM-dd');
    const endDate = end_date || format(addDays(new Date(), parseInt(days as string)), 'yyyy-MM-dd');

    const result = await pool.query(
      `SELECT
        cf.forecast_date,
        cf.forecast_type,
        cf.amount,
        cf.probability,
        cf.category,
        cf.description,
        cf.source_type,
        cf.source_id,
        cf.is_realized,
        cf.realized_amount
      FROM cash_flow_forecasts cf
      WHERE cf.organization_id = $1
        AND cf.forecast_date BETWEEN $2 AND $3
        AND cf.deleted_at IS NULL
      ORDER BY cf.forecast_date ASC, cf.forecast_type`,
      [organization_id, startDate, endDate]
    );

    // Grouper par date
    const forecastByDate: any = {};

    result.rows.forEach(row => {
      const date = format(new Date(row.forecast_date), 'yyyy-MM-dd');

      if (!forecastByDate[date]) {
        forecastByDate[date] = {
          date,
          inflows: [],
          outflows: [],
          total_inflow: 0,
          total_outflow: 0,
          net_flow: 0
        };
      }

      const adjustedAmount = row.amount * (row.probability / 100);

      if (['revenue', 'payment_in'].includes(row.forecast_type)) {
        forecastByDate[date].inflows.push(row);
        forecastByDate[date].total_inflow += adjustedAmount;
      } else {
        forecastByDate[date].outflows.push(row);
        forecastByDate[date].total_outflow += adjustedAmount;
      }

      forecastByDate[date].net_flow = forecastByDate[date].total_inflow - forecastByDate[date].total_outflow;
    });

    // Calculer solde cumulé
    const forecasts = Object.values(forecastByDate);
    let cumulativeBalance = 0;

    // Récupérer solde bancaire actuel
    const bankBalanceResult = await pool.query(
      `SELECT COALESCE(SUM(current_balance), 0) as total_balance
       FROM bank_accounts
       WHERE organization_id = $1 AND is_active = true AND deleted_at IS NULL`,
      [organization_id]
    );

    cumulativeBalance = parseFloat(bankBalanceResult.rows[0].total_balance || 0);

    const forecastsWithBalance = forecasts.map((f: any) => {
      cumulativeBalance += f.net_flow;
      return { ...f, cumulative_balance: parseFloat(cumulativeBalance.toFixed(2)) };
    });

    res.json({
      start_date: startDate,
      end_date: endDate,
      initial_balance: parseFloat(bankBalanceResult.rows[0].total_balance || 0),
      forecasts: forecastsWithBalance
    });
  } catch (error) {
    logger.error('Error fetching cash flow forecast:', error);
    res.status(500).json({ error: 'Failed to fetch forecast' });
  }
});

/**
 * POST /api/cash-flow/forecast
 * Créer une prévision manuelle
 */
router.post('/forecast', async (req: Request, res: Response) => {
  try {
    const {
      organization_id,
      forecast_date,
      forecast_type,
      amount,
      probability = 100,
      category,
      description,
      notes
    } = req.body;

    // Validation
    if (!forecast_date || !forecast_type || !amount) {
      return res.status(400).json({
        error: 'Forecast date, type and amount are required'
      });
    }

    const validTypes = ['revenue', 'expense', 'payment_in', 'payment_out'];
    if (!validTypes.includes(forecast_type)) {
      return res.status(400).json({ error: 'Invalid forecast type' });
    }

    if (probability < 0 || probability > 100) {
      return res.status(400).json({ error: 'Probability must be between 0 and 100' });
    }

    const result = await pool.query(
      `INSERT INTO cash_flow_forecasts (
        organization_id, forecast_date, forecast_type, amount, probability,
        category, description, source_type, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'manual', $8)
      RETURNING *`,
      [organization_id, forecast_date, forecast_type, amount, probability, category, description, notes]
    );

    logger.info(`Cash flow forecast created: ${result.rows[0].id}`);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    logger.error('Error creating forecast:', error);
    res.status(500).json({ error: 'Failed to create forecast' });
  }
});

/**
 * POST /api/cash-flow/forecast/auto-generate
 * Générer automatiquement les prévisions basées sur factures, devis, dépenses
 */
router.post('/forecast/auto-generate', async (req: Request, res: Response) => {
  try {
    const { organization_id, days = 90 } = req.body;

    const endDate = format(addDays(new Date(), days), 'yyyy-MM-dd');
    let generatedCount = 0;

    // 1. Prévisions depuis factures impayées
    const invoicesResult = await pool.query(
      `SELECT id, invoice_number, due_date, total_amount
       FROM invoices
       WHERE organization_id = $1
         AND status IN ('sent', 'overdue')
         AND due_date <= $2
         AND deleted_at IS NULL`,
      [organization_id, endDate]
    );

    for (const invoice of invoicesResult.rows) {
      // Vérifier si prévision existe déjà
      const existingForecast = await pool.query(
        `SELECT id FROM cash_flow_forecasts
         WHERE source_type = 'invoice' AND source_id = $1 AND deleted_at IS NULL`,
        [invoice.id]
      );

      if (existingForecast.rows.length === 0) {
        await pool.query(
          `INSERT INTO cash_flow_forecasts (
            organization_id, forecast_date, forecast_type, amount, probability,
            category, description, source_type, source_id
          ) VALUES ($1, $2, 'payment_in', $3, 80, 'invoice', $4, 'invoice', $5)`,
          [
            organization_id,
            invoice.due_date,
            invoice.total_amount,
            `Payment for invoice ${invoice.invoice_number}`,
            invoice.id
          ]
        );
        generatedCount++;
      }
    }

    // 2. Prévisions depuis devis acceptés
    const quotesResult = await pool.query(
      `SELECT id, quote_number, valid_until, total
       FROM quotes
       WHERE organization_id = $1
         AND status = 'accepted'
         AND valid_until <= $2
         AND deleted_at IS NULL`,
      [organization_id, endDate]
    );

    for (const quote of quotesResult.rows) {
      const existingForecast = await pool.query(
        `SELECT id FROM cash_flow_forecasts
         WHERE source_type = 'quote' AND source_id = $1 AND deleted_at IS NULL`,
        [quote.id]
      );

      if (existingForecast.rows.length === 0) {
        await pool.query(
          `INSERT INTO cash_flow_forecasts (
            organization_id, forecast_date, forecast_type, amount, probability,
            category, description, source_type, source_id
          ) VALUES ($1, $2, 'revenue', $3, 70, 'quote', $4, 'quote', $5)`,
          [
            organization_id,
            quote.valid_until,
            quote.total,
            `Expected revenue from quote ${quote.quote_number}`,
            quote.id
          ]
        );
        generatedCount++;
      }
    }

    // 3. Prévisions depuis dépenses à payer
    const expensesResult = await pool.query(
      `SELECT id, expense_number, due_date, amount
       FROM expenses
       WHERE organization_id = $1
         AND payment_status IN ('pending', 'partial')
         AND due_date <= $2
         AND deleted_at IS NULL`,
      [organization_id, endDate]
    );

    for (const expense of expensesResult.rows) {
      const existingForecast = await pool.query(
        `SELECT id FROM cash_flow_forecasts
         WHERE source_type = 'expense' AND source_id = $1 AND deleted_at IS NULL`,
        [expense.id]
      );

      if (existingForecast.rows.length === 0) {
        await pool.query(
          `INSERT INTO cash_flow_forecasts (
            organization_id, forecast_date, forecast_type, amount, probability,
            category, description, source_type, source_id
          ) VALUES ($1, $2, 'payment_out', $3, 95, 'expense', $4, 'expense', $5)`,
          [
            organization_id,
            expense.due_date,
            expense.amount,
            `Payment for expense ${expense.expense_number}`,
            expense.id
          ]
        );
        generatedCount++;
      }
    }

    logger.info(`Auto-generated ${generatedCount} cash flow forecasts`);
    res.json({
      generated: generatedCount,
      message: `Successfully generated ${generatedCount} forecasts`
    });
  } catch (error) {
    logger.error('Error auto-generating forecasts:', error);
    res.status(500).json({ error: 'Failed to auto-generate forecasts' });
  }
});

/**
 * PUT /api/cash-flow/forecast/:id
 * Modifier une prévision
 */
router.put('/forecast/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      organization_id,
      forecast_date,
      amount,
      probability,
      category,
      description,
      notes
    } = req.body;

    const result = await pool.query(
      `UPDATE cash_flow_forecasts SET
        forecast_date = COALESCE($1, forecast_date),
        amount = COALESCE($2, amount),
        probability = COALESCE($3, probability),
        category = COALESCE($4, category),
        description = COALESCE($5, description),
        notes = COALESCE($6, notes),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7 AND organization_id = $8 AND deleted_at IS NULL
      RETURNING *`,
      [forecast_date, amount, probability, category, description, notes, id, organization_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Forecast not found' });
    }

    logger.info(`Forecast updated: ${id}`);
    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Error updating forecast:', error);
    res.status(500).json({ error: 'Failed to update forecast' });
  }
});

/**
 * POST /api/cash-flow/forecast/:id/realize
 * Marquer une prévision comme réalisée
 */
router.post('/forecast/:id/realize', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { organization_id, realized_amount } = req.body;

    const result = await pool.query(
      `UPDATE cash_flow_forecasts SET
        is_realized = true,
        realized_at = CURRENT_TIMESTAMP,
        realized_amount = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND organization_id = $3 AND deleted_at IS NULL
      RETURNING *`,
      [realized_amount, id, organization_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Forecast not found' });
    }

    logger.info(`Forecast realized: ${id}`);
    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Error realizing forecast:', error);
    res.status(500).json({ error: 'Failed to realize forecast' });
  }
});

/**
 * DELETE /api/cash-flow/forecast/:id
 * Supprimer une prévision
 */
router.delete('/forecast/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { organization_id } = req.body;

    const result = await pool.query(
      `UPDATE cash_flow_forecasts SET
        deleted_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
      RETURNING *`,
      [id, organization_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Forecast not found' });
    }

    logger.info(`Forecast deleted: ${id}`);
    res.json({ message: 'Forecast deleted successfully' });
  } catch (error) {
    logger.error('Error deleting forecast:', error);
    res.status(500).json({ error: 'Failed to delete forecast' });
  }
});

/**
 * GET /api/cash-flow/stats
 * Statistiques de trésorerie
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const { organization_id } = req.body;
    const { period = '30' } = req.query;

    // Solde bancaire actuel
    const bankBalanceResult = await pool.query(
      `SELECT
        COALESCE(SUM(current_balance), 0) as total_balance,
        COUNT(*) as account_count
       FROM bank_accounts
       WHERE organization_id = $1 AND is_active = true AND deleted_at IS NULL`,
      [organization_id]
    );

    // Prévisions prochains jours
    const forecastResult = await pool.query(
      `SELECT
        COUNT(*) FILTER (WHERE forecast_type IN ('revenue', 'payment_in')) as inflow_count,
        COUNT(*) FILTER (WHERE forecast_type IN ('expense', 'payment_out')) as outflow_count,
        COALESCE(SUM(amount * probability / 100) FILTER (WHERE forecast_type IN ('revenue', 'payment_in')), 0) as expected_inflow,
        COALESCE(SUM(amount * probability / 100) FILTER (WHERE forecast_type IN ('expense', 'payment_out')), 0) as expected_outflow
       FROM cash_flow_forecasts
       WHERE organization_id = $1
         AND forecast_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '1 day' * $2)
         AND is_realized = false
         AND deleted_at IS NULL`,
      [organization_id, period]
    );

    const forecast = forecastResult.rows[0];
    const netForecast = parseFloat(forecast.expected_inflow) - parseFloat(forecast.expected_outflow);
    const projectedBalance = parseFloat(bankBalanceResult.rows[0].total_balance) + netForecast;

    res.json({
      current_balance: parseFloat(bankBalanceResult.rows[0].total_balance),
      bank_accounts: parseInt(bankBalanceResult.rows[0].account_count),
      forecast_period_days: parseInt(period as string),
      expected_inflow: parseFloat(forecast.expected_inflow),
      expected_outflow: parseFloat(forecast.expected_outflow),
      net_forecast: parseFloat(netForecast.toFixed(2)),
      projected_balance: parseFloat(projectedBalance.toFixed(2)),
      inflow_count: parseInt(forecast.inflow_count),
      outflow_count: parseInt(forecast.outflow_count)
    });
  } catch (error) {
    logger.error('Error fetching cash flow stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

/**
 * GET /api/cash-flow/chart
 * Données pour graphique trésorerie
 */
router.get('/chart', async (req: Request, res: Response) => {
  try {
    const { organization_id } = req.body;
    const { days = 90 } = req.query;

    const result = await pool.query(
      `SELECT * FROM v_cash_flow_forecast_90d
       WHERE organization_id = $1
       ORDER BY forecast_date`,
      [organization_id]
    );

    // Récupérer solde initial
    const bankBalanceResult = await pool.query(
      `SELECT COALESCE(SUM(current_balance), 0) as total_balance
       FROM bank_accounts
       WHERE organization_id = $1 AND is_active = true AND deleted_at IS NULL`,
      [organization_id]
    );

    let cumulativeBalance = parseFloat(bankBalanceResult.rows[0].total_balance);
    const chartData = result.rows.map(row => {
      cumulativeBalance += parseFloat(row.net_flow);
      return {
        date: format(new Date(row.forecast_date), 'yyyy-MM-dd'),
        inflow: parseFloat(row.expected_inflow || 0),
        outflow: parseFloat(row.expected_outflow || 0),
        net: parseFloat(row.net_flow || 0),
        balance: parseFloat(cumulativeBalance.toFixed(2))
      };
    });

    res.json({
      initial_balance: parseFloat(bankBalanceResult.rows[0].total_balance),
      data: chartData
    });
  } catch (error) {
    logger.error('Error fetching chart data:', error);
    res.status(500).json({ error: 'Failed to fetch chart data' });
  }
});

export default router;
