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

// GET /api/dashboard - Main dashboard endpoint with all stats
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const period = (req.query.period as string) || 'month';
    const { startDate, endDate } = getDateRange(period);

    // Quick stats
    const quickStats = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM invoices WHERE invoice_date >= $1 AND invoice_date <= $2) as total_invoices,
        (SELECT COUNT(*) FROM quotes WHERE created_at >= $1 AND created_at <= $2) as total_quotes,
        (SELECT COUNT(DISTINCT customer_id) FROM invoices WHERE invoice_date >= $1 AND invoice_date <= $2) as active_customers,
        (SELECT COALESCE(SUM(total_amount), 0) FROM invoices WHERE invoice_date >= $1 AND invoice_date <= $2 AND status = 'paid') as total_revenue,
        (SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE expense_date >= $1 AND expense_date <= $2) as total_expenses
    `, [startDate, endDate]);

    const stats = quickStats.rows[0];
    const profit = parseFloat(stats.total_revenue) - parseFloat(stats.total_expenses);

    // Recent activity (last 10 items)
    const recentActivity = await db.query(`
      (SELECT 'invoice' as type, id, created_at, invoice_number as reference FROM invoices ORDER BY created_at DESC LIMIT 5)
      UNION ALL
      (SELECT 'quote' as type, id, created_at, quote_number as reference FROM quotes ORDER BY created_at DESC LIMIT 5)
      ORDER BY created_at DESC
      LIMIT 10
    `);

    // Pending quotes count
    const pendingQuotes = await db.query(`
      SELECT COUNT(*) as count FROM quotes
      WHERE status IN ('draft', 'sent') AND created_at >= $1 AND created_at <= $2
    `, [startDate, endDate]);

    // Overdue invoices
    const overdueInvoices = await db.query(`
      SELECT COUNT(*) as count FROM invoices
      WHERE status NOT IN ('paid', 'cancelled') AND due_date < CURRENT_DATE
    `);

    res.json({
      period,
      dateRange: { startDate, endDate },
      quickStats: {
        totalInvoices: parseInt(stats.total_invoices),
        totalQuotes: parseInt(stats.total_quotes),
        activeCustomers: parseInt(stats.active_customers),
        totalRevenue: parseFloat(stats.total_revenue),
        totalExpenses: parseFloat(stats.total_expenses),
        profit,
      },
      pendingQuotes: parseInt(pendingQuotes.rows[0].count),
      overdueInvoices: parseInt(overdueInvoices.rows[0].count),
      recentActivity: recentActivity.rows,
    });
  } catch (error: any) {
    console.error('Error fetching dashboard:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/dashboard/sales-by-period
router.get('/sales-by-period', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const period = (req.query.period as string) || 'month';

    let dateFormat = 'YYYY-MM-DD';
    let dateInterval = '1 day';

    if (period === 'year') {
      dateFormat = 'YYYY-MM';
      dateInterval = '1 month';
    } else if (period === 'quarter') {
      dateFormat = 'YYYY-WW';
      dateInterval = '1 week';
    }

    const { startDate, endDate } = getDateRange(period);

    const sales = await db.query(`
      SELECT
        TO_CHAR(invoice_date, $3) as period,
        COUNT(*) as count,
        COALESCE(SUM(total_amount), 0) as total
      FROM invoices
      WHERE invoice_date >= $1 AND invoice_date <= $2 AND status = 'paid'
      GROUP BY TO_CHAR(invoice_date, $3)
      ORDER BY period ASC
    `, [startDate, endDate, dateFormat]);

    res.json({
      period,
      data: sales.rows.map(row => ({
        period: row.period,
        count: parseInt(row.count),
        total: parseFloat(row.total),
      })),
    });
  } catch (error: any) {
    console.error('Error fetching sales by period:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/dashboard/top-customers
router.get('/top-customers', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 5;
    const { startDate, endDate } = getDateRange((req.query.period as string) || 'month');

    const topCustomers = await db.query(`
      SELECT
        c.id,
        c.name,
        c.email,
        c.company,
        COUNT(i.id) as invoice_count,
        COALESCE(SUM(i.total_amount), 0) as total_spent
      FROM customers c
      JOIN invoices i ON i.customer_id = c.id
      WHERE i.invoice_date >= $1 AND i.invoice_date <= $2 AND i.status = 'paid'
      GROUP BY c.id, c.name, c.email, c.company
      ORDER BY total_spent DESC
      LIMIT $3
    `, [startDate, endDate, limit]);

    res.json(topCustomers.rows.map(row => ({
      id: row.id,
      name: row.name,
      email: row.email,
      company: row.company,
      invoiceCount: parseInt(row.invoice_count),
      totalSpent: parseFloat(row.total_spent),
    })));
  } catch (error: any) {
    console.error('Error fetching top customers:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/dashboard/top-products
router.get('/top-products', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 5;
    const { startDate, endDate } = getDateRange((req.query.period as string) || 'month');

    const topProducts = await db.query(`
      SELECT
        p.id,
        p.name,
        p.price,
        COUNT(ii.id) as times_sold,
        COALESCE(SUM(ii.quantity), 0) as total_quantity,
        COALESCE(SUM(ii.total_price), 0) as total_revenue
      FROM products p
      JOIN invoice_items ii ON ii.product_id = p.id
      JOIN invoices i ON i.id = ii.invoice_id
      WHERE i.invoice_date >= $1 AND i.invoice_date <= $2 AND i.status = 'paid'
      GROUP BY p.id, p.name, p.price
      ORDER BY total_revenue DESC
      LIMIT $3
    `, [startDate, endDate, limit]);

    res.json(topProducts.rows.map(row => ({
      id: row.id,
      name: row.name,
      unitPrice: parseFloat(row.price),
      timesSold: parseInt(row.times_sold),
      totalQuantity: parseInt(row.total_quantity),
      totalRevenue: parseFloat(row.total_revenue),
    })));
  } catch (error: any) {
    console.error('Error fetching top products:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/dashboard/recent-activity
router.get('/recent-activity', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;

    const activity = await db.query(`
      SELECT * FROM (
        SELECT
          'invoice' as type,
          i.id,
          i.invoice_number as reference,
          i.total_amount as amount,
          i.status,
          i.created_at,
          c.name as customer_name
        FROM invoices i
        LEFT JOIN customers c ON c.id = i.customer_id
        ORDER BY i.created_at DESC
        LIMIT $1
      ) invoices
      UNION ALL
      SELECT * FROM (
        SELECT
          'quote' as type,
          q.id,
          q.quote_number as reference,
          q.total_amount as amount,
          q.status,
          q.created_at,
          NULL as customer_name
        FROM quotes q
        ORDER BY q.created_at DESC
        LIMIT $1
      ) quotes
      ORDER BY created_at DESC
      LIMIT $1
    `, [limit]);

    res.json(activity.rows);
  } catch (error: any) {
    console.error('Error fetching recent activity:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/dashboard/quick-stats
router.get('/quick-stats', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const stats = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM invoices WHERE status IN ('sent', 'pending')) as pending_invoices,
        (SELECT COUNT(*) FROM invoices WHERE status NOT IN ('paid', 'cancelled') AND due_date < CURRENT_DATE) as overdue_invoices,
        (SELECT COUNT(*) FROM quotes WHERE status = 'draft') as draft_quotes,
        (SELECT COUNT(*) FROM products WHERE stock <= 10) as low_stock_products,
        (SELECT COALESCE(SUM(total_amount), 0) FROM invoices WHERE status NOT IN ('paid', 'cancelled')) as outstanding_amount
    `);

    res.json({
      pendingInvoices: parseInt(stats.rows[0].pending_invoices),
      overdueInvoices: parseInt(stats.rows[0].overdue_invoices),
      draftQuotes: parseInt(stats.rows[0].draft_quotes),
      lowStockProducts: parseInt(stats.rows[0].low_stock_products),
      outstandingAmount: parseFloat(stats.rows[0].outstanding_amount),
    });
  } catch (error: any) {
    console.error('Error fetching quick stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/dashboard/stats - General dashboard statistics
router.get('/stats', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user?.organization_id;
    const period = (req.query.period as string) || 'month';
    const { startDate, endDate } = getDateRange(period);

    // Get comprehensive stats
    const [contacts, deals, invoices, quotes, products] = await Promise.all([
      db.query(`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE type = 'lead') as leads,
          COUNT(*) FILTER (WHERE type = 'customer') as customers,
          COUNT(*) FILTER (WHERE created_at >= $2) as new_period
        FROM contacts WHERE organization_id = $1 AND deleted_at IS NULL
      `, [organizationId, startDate]),

      db.query(`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'won') as won,
          COUNT(*) FILTER (WHERE status = 'lost') as lost,
          COALESCE(SUM(value) FILTER (WHERE status = 'won'), 0) as won_value
        FROM deals WHERE organization_id = $1 AND deleted_at IS NULL AND created_at >= $2
      `, [organizationId, startDate]),

      db.query(`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'paid') as paid,
          COUNT(*) FILTER (WHERE status = 'pending' OR status = 'sent') as pending,
          COALESCE(SUM(total_amount) FILTER (WHERE status = 'paid'), 0) as revenue,
          COALESCE(SUM(total_amount) FILTER (WHERE status IN ('pending', 'sent')), 0) as outstanding
        FROM invoices WHERE invoice_date >= $1
      `, [startDate]),

      db.query(`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'accepted') as accepted,
          COUNT(*) FILTER (WHERE status = 'pending' OR status = 'sent') as pending,
          COALESCE(SUM(total_amount) FILTER (WHERE status = 'accepted'), 0) as accepted_value
        FROM quotes WHERE created_at >= $1
      `, [startDate]),

      db.query(`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE track_stock = true AND stock_quantity <= COALESCE(stock_min_alert, 0)) as low_stock
        FROM products WHERE organization_id = $1 AND deleted_at IS NULL
      `, [organizationId])
    ]);

    res.json({
      period,
      contacts: contacts.rows[0],
      deals: deals.rows[0],
      invoices: invoices.rows[0],
      quotes: quotes.rows[0],
      products: products.rows[0]
    });
  } catch (error: any) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/dashboard/kpis
router.get('/kpis', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const period = (req.query.period as string) || 'month';
    const { startDate, endDate } = getDateRange(period);
    const organizationId = req.user?.organization_id;

    // Calculate key KPIs
    const kpis = [];

    // Revenue KPI
    const revenueQuery = await db.query(`
      SELECT
        COALESCE(SUM(total_amount), 0) as current_revenue
      FROM invoices
      WHERE organization_id = $1 AND invoice_date >= $2 AND invoice_date <= $3 AND status = 'paid' AND deleted_at IS NULL
    `, [organizationId, startDate, endDate]);

    const previousRevenue = await db.query(`
      SELECT COALESCE(SUM(total_amount), 0) as previous_revenue
      FROM invoices
      WHERE organization_id = $1 AND invoice_date >= $2 AND invoice_date < $3 AND status = 'paid' AND deleted_at IS NULL
    `, [organizationId, new Date(startDate.getTime() - (endDate.getTime() - startDate.getTime())), startDate]);

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
      WHERE organization_id = $1 AND invoice_date >= $2 AND invoice_date <= $3 AND deleted_at IS NULL
    `, [organizationId, startDate, endDate]);

    const previousInvoiceCount = await db.query(`
      SELECT COUNT(*) as count
      FROM invoices
      WHERE organization_id = $1 AND invoice_date >= $2 AND invoice_date < $3 AND deleted_at IS NULL
    `, [organizationId, new Date(startDate.getTime() - (endDate.getTime() - startDate.getTime())), startDate]);

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
        AVG(p.payment_date - i.due_date) as avg_delay
      FROM invoices i
      JOIN payments p ON p.invoice_id = i.id
      WHERE i.organization_id = $1 AND i.invoice_date >= $2 AND i.invoice_date <= $3 AND i.deleted_at IS NULL
    `, [organizationId, startDate, endDate]);

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
      WHERE organization_id = $1 AND invoice_date >= $2 AND invoice_date <= $3 AND deleted_at IS NULL
    `, [organizationId, startDate, endDate]);

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
    const organizationId = req.user?.organization_id;

    const metrics = await db.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'paid') as paid,
        COUNT(*) FILTER (WHERE status IN ('sent', 'pending')) as pending,
        COUNT(*) FILTER (WHERE status = 'overdue' OR (status NOT IN ('paid', 'cancelled') AND due_date < CURRENT_DATE)) as overdue
      FROM invoices
      WHERE organization_id = $1 AND invoice_date >= $2 AND invoice_date <= $3 AND deleted_at IS NULL
    `, [organizationId, startDate, endDate]);

    // Average payment delay
    const delayQuery = await db.query(`
      SELECT AVG(p.payment_date - i.due_date) as avg_delay
      FROM invoices i
      JOIN payments p ON p.invoice_id = i.id
      WHERE i.organization_id = $1 AND i.invoice_date >= $2 AND i.invoice_date <= $3 AND i.deleted_at IS NULL
    `, [organizationId, startDate, endDate]);

    res.json({
      total: parseInt(metrics.rows[0].total || 0),
      paid: parseInt(metrics.rows[0].paid || 0),
      pending: parseInt(metrics.rows[0].pending || 0),
      overdue: parseInt(metrics.rows[0].overdue || 0),
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
