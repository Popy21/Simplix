import express, { Request, Response } from 'express';
import { pool as db } from '../database/db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Helper function to get date range based on period
const getDateRange = (period: string) => {
  const now = new Date();
  let startDate = new Date();

  switch (period) {
    case 'week':
      startDate.setDate(now.getDate() - 7);
      break;
    case 'month':
      startDate.setMonth(now.getMonth() - 1);
      break;
    case 'quarter':
      startDate.setMonth(now.getMonth() - 3);
      break;
    case 'year':
      startDate.setFullYear(now.getFullYear() - 1);
      break;
    default:
      startDate.setMonth(now.getMonth() - 1);
  }

  return { startDate, endDate: now };
};

// GET /api/dashboard/kpis
router.get('/kpis', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const period = (req.query.period as string) || 'month';
    const { startDate, endDate } = getDateRange(period);

    // Calculate key KPIs
    const kpis = [];

    // Revenue KPI
    const revenueQuery = await db.query(`
      SELECT
        COALESCE(SUM(total_amount), 0) as current_revenue
      FROM invoices
      WHERE invoice_date >= $1 AND invoice_date <= $2 AND status = 'paid'
    `, [startDate, endDate]);

    const previousRevenue = await db.query(`
      SELECT COALESCE(SUM(total_amount), 0) as previous_revenue
      FROM invoices
      WHERE invoice_date >= $1 AND invoice_date < $2 AND status = 'paid'
    `, [new Date(startDate.getTime() - (endDate.getTime() - startDate.getTime())), startDate]);

    kpis.push({
      id: 'revenue',
      name: 'Chiffre d\'affaires',
      value: parseFloat(revenueQuery.rows[0].current_revenue),
      previousValue: parseFloat(previousRevenue.rows[0].previous_revenue),
      target: 0,
      unit: '€',
      isFavorable: true,
    });

    // Invoice count KPI
    const invoiceCountQuery = await db.query(`
      SELECT COUNT(*) as count
      FROM invoices
      WHERE invoice_date >= $1 AND invoice_date <= $2
    `, [startDate, endDate]);

    const previousInvoiceCount = await db.query(`
      SELECT COUNT(*) as count
      FROM invoices
      WHERE invoice_date >= $1 AND invoice_date < $2
    `, [new Date(startDate.getTime() - (endDate.getTime() - startDate.getTime())), startDate]);

    kpis.push({
      id: 'invoices',
      name: 'Factures émises',
      value: parseInt(invoiceCountQuery.rows[0].count),
      previousValue: parseInt(previousInvoiceCount.rows[0].count),
      target: 0,
      unit: '',
      isFavorable: true,
    });

    // Payment delay KPI
    const paymentDelayQuery = await db.query(`
      SELECT
        AVG(EXTRACT(DAY FROM (p.payment_date - i.due_date))) as avg_delay
      FROM invoices i
      JOIN payments p ON p.invoice_id = i.id
      WHERE i.invoice_date >= $1 AND i.invoice_date <= $2
    `, [startDate, endDate]);

    kpis.push({
      id: 'payment_delay',
      name: 'Délai moyen de paiement',
      value: Math.round(parseFloat(paymentDelayQuery.rows[0].avg_delay || 0)),
      previousValue: 0,
      target: 30,
      unit: ' j',
      isFavorable: false,
    });

    // Customer count KPI
    const customerCountQuery = await db.query(`
      SELECT COUNT(DISTINCT customer_id) as count
      FROM invoices
      WHERE invoice_date >= $1 AND invoice_date <= $2
    `, [startDate, endDate]);

    kpis.push({
      id: 'customers',
      name: 'Clients actifs',
      value: parseInt(customerCountQuery.rows[0].count),
      previousValue: 0,
      target: 0,
      unit: '',
      isFavorable: true,
    });

    res.json(kpis);
  } catch (error: any) {
    console.error('Error fetching KPIs:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/dashboard/revenue
router.get('/revenue', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const period = (req.query.period as string) || 'month';
    const { startDate, endDate } = getDateRange(period);

    // Current period revenue
    const currentRevenue = await db.query(`
      SELECT COALESCE(SUM(total_amount), 0) as revenue
      FROM invoices
      WHERE invoice_date >= $1 AND invoice_date <= $2 AND status = 'paid'
    `, [startDate, endDate]);

    // Previous period revenue
    const previousPeriodStart = new Date(startDate.getTime() - (endDate.getTime() - startDate.getTime()));
    const previousRevenue = await db.query(`
      SELECT COALESCE(SUM(total_amount), 0) as revenue
      FROM invoices
      WHERE invoice_date >= $1 AND invoice_date < $2 AND status = 'paid'
    `, [previousPeriodStart, startDate]);

    // Projected revenue (pending + sent invoices)
    const projectedRevenue = await db.query(`
      SELECT COALESCE(SUM(total_amount), 0) as revenue
      FROM invoices
      WHERE invoice_date >= $1 AND invoice_date <= $2 AND status IN ('sent', 'pending')
    `, [startDate, endDate]);

    const current = parseFloat(currentRevenue.rows[0].revenue);
    const previous = parseFloat(previousRevenue.rows[0].revenue);
    const projected = parseFloat(projectedRevenue.rows[0].revenue);
    const growth = previous > 0 ? ((current - previous) / previous) * 100 : 0;

    // Calculate profit (simplified - revenue minus expenses)
    const expenses = await db.query(`
      SELECT COALESCE(SUM(amount), 0) as expenses
      FROM expenses
      WHERE expense_date >= $1 AND expense_date <= $2
    `, [startDate, endDate]);

    const expenseAmount = parseFloat(expenses.rows[0].expenses || 0);
    const profit = current - expenseAmount;
    const margin = current > 0 ? (profit / current) * 100 : 0;

    res.json({
      current,
      projected: current + projected,
      lastPeriod: previous,
      growth,
      profit: {
        current: profit,
        projected: profit + projected * 0.3, // Assume 30% margin on projected
        margin,
      },
    });
  } catch (error: any) {
    console.error('Error fetching revenue:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/dashboard/cashflow
router.get('/cashflow', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const period = (req.query.period as string) || 'month';
    const { startDate, endDate } = getDateRange(period);

    // Incoming cash (payments received)
    const incoming = await db.query(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM payments
      WHERE payment_date >= $1 AND payment_date <= $2
    `, [startDate, endDate]);

    // Outgoing cash (expenses paid)
    const outgoing = await db.query(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM expenses
      WHERE expense_date >= $1 AND expense_date <= $2
    `, [startDate, endDate]);

    const incomingAmount = parseFloat(incoming.rows[0].total);
    const outgoingAmount = parseFloat(outgoing.rows[0].total);

    res.json({
      incoming: incomingAmount,
      outgoing: outgoingAmount,
      balance: incomingAmount - outgoingAmount,
    });
  } catch (error: any) {
    console.error('Error fetching cash flow:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/dashboard/invoices-metrics
router.get('/invoices-metrics', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const period = (req.query.period as string) || 'month';
    const { startDate, endDate } = getDateRange(period);

    const metrics = await db.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'paid') as paid,
        COUNT(*) FILTER (WHERE status IN ('sent', 'pending')) as pending,
        COUNT(*) FILTER (WHERE status = 'overdue' OR (status NOT IN ('paid', 'cancelled') AND due_date < CURRENT_DATE)) as overdue
      FROM invoices
      WHERE invoice_date >= $1 AND invoice_date <= $2
    `, [startDate, endDate]);

    // Average payment delay
    const delayQuery = await db.query(`
      SELECT AVG(EXTRACT(DAY FROM (p.payment_date - i.due_date))) as avg_delay
      FROM invoices i
      JOIN payments p ON p.invoice_id = i.id
      WHERE i.invoice_date >= $1 AND i.invoice_date <= $2
    `, [startDate, endDate]);

    res.json({
      total: parseInt(metrics.rows[0].total),
      paid: parseInt(metrics.rows[0].paid),
      pending: parseInt(metrics.rows[0].pending),
      overdue: parseInt(metrics.rows[0].overdue),
      averagePaymentDelay: Math.round(parseFloat(delayQuery.rows[0].avg_delay || 0)),
    });
  } catch (error: any) {
    console.error('Error fetching invoices metrics:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/dashboard/customer-metrics
router.get('/customer-metrics', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const period = (req.query.period as string) || 'month';
    const { startDate, endDate } = getDateRange(period);

    // Total unique customers
    const total = await db.query(`
      SELECT COUNT(DISTINCT customer_id) as count
      FROM invoices
      WHERE invoice_date >= $1 AND invoice_date <= $2
    `, [startDate, endDate]);

    // New customers (first invoice in period)
    const newCustomers = await db.query(`
      SELECT COUNT(DISTINCT i.customer_id) as count
      FROM invoices i
      WHERE i.invoice_date >= $1 AND i.invoice_date <= $2
      AND NOT EXISTS (
        SELECT 1 FROM invoices i2
        WHERE i2.customer_id = i.customer_id
        AND i2.invoice_date < $1
      )
    `, [startDate, endDate]);

    // Active customers (paid at least one invoice)
    const active = await db.query(`
      SELECT COUNT(DISTINCT i.customer_id) as count
      FROM invoices i
      WHERE i.invoice_date >= $1 AND i.invoice_date <= $2 AND i.status = 'paid'
    `, [startDate, endDate]);

    // Average customer value
    const avgValue = await db.query(`
      SELECT AVG(customer_total) as avg_value
      FROM (
        SELECT customer_id, SUM(total_amount) as customer_total
        FROM invoices
        WHERE invoice_date >= $1 AND invoice_date <= $2 AND status = 'paid'
        GROUP BY customer_id
      ) customer_totals
    `, [startDate, endDate]);

    res.json({
      total: parseInt(total.rows[0].count),
      new: parseInt(newCustomers.rows[0].count),
      active: parseInt(active.rows[0].count),
      averageValue: parseFloat(avgValue.rows[0].avg_value || 0),
    });
  } catch (error: any) {
    console.error('Error fetching customer metrics:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/dashboard/projections
router.get('/projections', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const period = (req.query.period as string) || 'month';

    // Fetch existing projections from database
    const projections = await db.query(`
      SELECT
        projection_date as date,
        projected_revenue,
        actual_revenue,
        projected_profit,
        actual_profit,
        confidence_level as confidence
      FROM revenue_projections
      WHERE projection_type = $1
      ORDER BY projection_date DESC
      LIMIT 12
    `, [period]);

    // If no projections exist, generate simple ones based on historical data
    if (projections.rows.length === 0) {
      const { startDate, endDate } = getDateRange(period);

      const historical = await db.query(`
        SELECT COALESCE(AVG(total_amount), 0) as avg_revenue
        FROM invoices
        WHERE invoice_date >= $1 AND invoice_date <= $2 AND status = 'paid'
      `, [startDate, endDate]);

      const avgRevenue = parseFloat(historical.rows[0].avg_revenue);
      const generatedProjections = [];

      for (let i = 1; i <= 6; i++) {
        const projectionDate = new Date();
        projectionDate.setMonth(projectionDate.getMonth() + i);

        generatedProjections.push({
          date: projectionDate.toISOString().split('T')[0],
          projected_revenue: avgRevenue * (1 + Math.random() * 0.1 - 0.05), // ±5% variance
          actual_revenue: null,
          projected_profit: avgRevenue * 0.3, // 30% margin
          actual_profit: null,
          confidence: 70 - (i * 5), // Decreasing confidence
        });
      }

      return res.json(generatedProjections);
    }

    res.json(projections.rows);
  } catch (error: any) {
    console.error('Error fetching projections:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/dashboard/projections - Create or update projection
router.post('/projections', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const {
      projection_date,
      projection_type,
      projected_revenue,
      projected_costs,
      confidence_level,
    } = req.body;

    const projected_profit = projected_revenue - (projected_costs || 0);

    const result = await db.query(`
      INSERT INTO revenue_projections (
        projection_date, projection_type, projected_revenue,
        projected_costs, projected_profit, confidence_level
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (projection_date, projection_type)
      DO UPDATE SET
        projected_revenue = $3,
        projected_costs = $4,
        projected_profit = $5,
        confidence_level = $6,
        updated_at = NOW()
      RETURNING *
    `, [projection_date, projection_type, projected_revenue, projected_costs, projected_profit, confidence_level]);

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Error creating projection:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
