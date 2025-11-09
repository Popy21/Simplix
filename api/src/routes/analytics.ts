import express, { Request, Response } from 'express';
import { pool as db } from '../database/db';

const router = express.Router();

// Get dashboard statistics
router.get('/dashboard', async (req: Request, res: Response) => {
  const stats: any = {};

  try {
    // Get total counts
    const customersResult = await db.query('SELECT COUNT(*) as count FROM customers', []);
    stats.totalCustomers = customersResult.rows[0].count;

    const productsResult = await db.query('SELECT COUNT(*) as count FROM products', []);
    stats.totalProducts = productsResult.rows[0].count;

    const salesResult = await db.query('SELECT COUNT(*) as count FROM sales', []);
    stats.totalSales = salesResult.rows[0].count;

    const quotesResult = await db.query('SELECT COUNT(*) as count FROM quotes', []);
    stats.totalQuotes = quotesResult.rows[0].count;

    const teamsResult = await db.query('SELECT COUNT(*) as count FROM teams', []);
    stats.totalTeams = teamsResult.rows[0].count;

    const usersResult = await db.query('SELECT COUNT(*) as count FROM users', []);
    stats.totalUsers = usersResult.rows[0].count;

    // Get revenue stats
    const revenueResult = await db.query('SELECT SUM(total_amount) as total FROM sales WHERE status = $1', ['completed']);
    stats.totalRevenue = revenueResult.rows[0].total || 0;

    // Get pending quotes value
    const pendingQuotesResult = await db.query('SELECT SUM(total_amount) as total FROM quotes WHERE status IN ($1, $2)', ['draft', 'sent']);
    stats.pendingQuotesValue = pendingQuotesResult.rows[0].total || 0;

    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get sales statistics by period
router.get('/sales-by-period', async (req: Request, res: Response) => {
  const { period = 'month' } = req.query;

  let dateFormat = 'YYYY-MM';
  if (period === 'day') dateFormat = 'YYYY-MM-DD';
  if (period === 'year') dateFormat = 'YYYY';

  const query = `
    SELECT
      to_char(sale_date, '${dateFormat}') as period,
      COUNT(*) as count,
      SUM(total_amount) as revenue
    FROM sales
    WHERE status = 'completed'
    GROUP BY period
    ORDER BY period DESC
    LIMIT 12
  `;

  try {
    const result = await db.query(query, []);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get top customers by revenue
router.get('/top-customers', async (req: Request, res: Response) => {
  const { limit = 10 } = req.query;

  const query = `
    SELECT
      c.id,
      c.name,
      c.email,
      c.company,
      COUNT(s.id) as total_sales,
      SUM(s.total_amount) as total_revenue
    FROM customers c
    LEFT JOIN sales s ON c.id = s.customer_id AND s.status = 'completed'
    GROUP BY c.id
    ORDER BY total_revenue DESC
    LIMIT $1
  `;

  try {
    const result = await db.query(query, [limit]);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get top products by sales
router.get('/top-products', async (req: Request, res: Response) => {
  const { limit = 10 } = req.query;

  const query = `
    SELECT
      p.id,
      p.name,
      p.price,
      p.stock,
      COUNT(s.id) as total_sales,
      SUM(s.quantity) as total_quantity,
      SUM(s.total_amount) as total_revenue
    FROM products p
    LEFT JOIN sales s ON p.id = s.product_id AND s.status = 'completed'
    GROUP BY p.id
    ORDER BY total_revenue DESC
    LIMIT $1
  `;

  try {
    const result = await db.query(query, [limit]);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get quotes conversion rate
router.get('/quotes-conversion', async (req: Request, res: Response) => {
  const query = `
    SELECT
      status,
      COUNT(*) as count,
      SUM(total_amount) as total_value
    FROM quotes
    GROUP BY status
  `;

  try {
    const result = await db.query(query, []);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get recent activity
router.get('/recent-activity', async (req: Request, res: Response) => {
  const { limit = 20 } = req.query;

  try {
    // Get recent sales
    const salesResult = await db.query(
      `SELECT 'sale' as type, id, customer_id, sale_date as created_at FROM sales ORDER BY sale_date DESC LIMIT $1`,
      [limit]
    );

    // Get recent quotes
    const quotesResult = await db.query(
      `SELECT 'quote' as type, id, customer_id, created_at FROM quotes ORDER BY created_at DESC LIMIT $1`,
      [limit]
    );

    // Get recent customers
    const customersResult = await db.query(
      `SELECT 'customer' as type, id, name, created_at FROM customers ORDER BY created_at DESC LIMIT $1`,
      [limit]
    );

    // Combine and sort
    const combined = [...salesResult.rows, ...quotesResult.rows, ...customersResult.rows]
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, Number(limit));

    res.json(combined);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get low stock products
router.get('/low-stock', async (req: Request, res: Response) => {
  const { threshold = 10 } = req.query;

  const query = `
    SELECT *
    FROM products
    WHERE stock <= $1
    ORDER BY stock ASC
  `;

  try {
    const result = await db.query(query, [threshold]);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get pending quotes for dashboard
router.get('/pending-quotes', async (req: Request, res: Response) => {
  try {
    const result = await db.query(`
      SELECT q.id, q.quote_number, q.total_amount, q.created_at, q.status,
             c.name as customer_name, c.company, c.logo_url as customer_logo_url
      FROM quotes q
      LEFT JOIN customers c ON q.customer_id = c.id
      WHERE q.status IN ('draft', 'sent')
      ORDER BY q.created_at DESC
      LIMIT 10
    `);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get tasks due today
router.get('/tasks-today', async (req: Request, res: Response) => {
  try {
    const result = await db.query(`
      SELECT t.id, t.title, t.due_date, t.priority, t.status,
             c.name as contact_name, c.id as contact_id
      FROM tasks t
      LEFT JOIN contacts c ON t.contact_id = c.id
      WHERE DATE(t.due_date) = CURRENT_DATE
      AND t.status NOT IN ('completed', 'done')
      AND t.deleted_at IS NULL
      ORDER BY t.priority DESC, t.due_date ASC
      LIMIT 10
    `);
    res.json(result.rows);
  } catch (err: any) {
    res.json([]);
  }
});

// Get top customers by revenue
router.get('/top-customers-enhanced', async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 5;
  try {
    const result = await db.query(`
      SELECT
        c.id,
        c.name as customer_name,
        COUNT(DISTINCT q.id) as total_quotes,
        COUNT(DISTINCT i.id) as total_invoices,
        COALESCE(SUM(CASE WHEN i.status = 'paid' THEN i.total_amount ELSE 0 END), 0) as total_revenue,
        MAX(q.created_at) as last_quote_date
      FROM customers c
      LEFT JOIN quotes q ON c.id = q.customer_id
      LEFT JOIN invoices i ON c.id = i.customer_id
      GROUP BY c.id, c.name
      HAVING COALESCE(SUM(CASE WHEN i.status = 'paid' THEN i.total_amount ELSE 0 END), 0) > 0
      ORDER BY total_revenue DESC
      LIMIT $1
    `, [limit]);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get conversion funnel stats
router.get('/conversion-funnel', async (req: Request, res: Response) => {
  try {
    const result = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM contacts) as total_contacts,
        (SELECT COUNT(*) FROM quotes) as total_quotes,
        (SELECT COUNT(*) FROM quotes WHERE status = 'accepted') as quotes_accepted,
        (SELECT COUNT(*) FROM invoices) as total_invoices,
        (SELECT COUNT(*) FROM invoices WHERE status = 'paid') as invoices_paid
    `);
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get recent activity summary
router.get('/activity-summary', async (req: Request, res: Response) => {
  try {
    const result = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM quotes WHERE created_at >= NOW() - INTERVAL '7 days') as quotes_this_week,
        (SELECT COUNT(*) FROM invoices WHERE created_at >= NOW() - INTERVAL '7 days') as invoices_this_week,
        (SELECT COUNT(*) FROM contacts WHERE created_at >= NOW() - INTERVAL '7 days') as contacts_this_week,
        (SELECT COALESCE(SUM(total_amount), 0) FROM invoices WHERE status = 'paid' AND updated_at >= NOW() - INTERVAL '7 days') as revenue_this_week
    `);
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get real quick stats for dashboard
router.get('/quick-stats', async (req: Request, res: Response) => {
  try {
    // Pipeline value and count (devis en cours)
    const pipelineResult = await db.query(`
      SELECT
        COUNT(*) as pipeline_count,
        COALESCE(SUM(total_amount), 0) as pipeline_value
      FROM quotes
      WHERE status IN ('draft', 'sent')
    `);

    // Tasks stats
    const tasksResult = await db.query(`
      SELECT
        COUNT(CASE WHEN due_date < NOW() AND status NOT IN ('completed', 'done') THEN 1 END) as tasks_overdue,
        COUNT(CASE WHEN status NOT IN ('completed', 'done') AND deleted_at IS NULL THEN 1 END) as tasks_pending
      FROM tasks
      WHERE deleted_at IS NULL
    `);

    // Contacts this month
    const contactsResult = await db.query(`
      SELECT COUNT(*) as contacts_this_month
      FROM contacts
      WHERE created_at >= DATE_TRUNC('month', NOW())
      AND deleted_at IS NULL
    `);

    // Invoices stats (sent = non payée, overdue = en retard)
    const invoicesResult = await db.query(`
      SELECT
        COUNT(CASE WHEN status IN ('sent', 'draft') THEN 1 END) as invoices_pending,
        COUNT(CASE WHEN status = 'overdue' OR (status IN ('sent', 'draft') AND due_date < CURRENT_DATE) THEN 1 END) as invoices_overdue,
        COALESCE(SUM(CASE WHEN status IN ('sent', 'draft', 'overdue') THEN total_amount ELSE 0 END), 0) as invoices_pending_value
      FROM invoices
    `);

    const pipeline = pipelineResult.rows[0];
    const tasks = tasksResult.rows[0];
    const contacts = contactsResult.rows[0];
    const invoices = invoicesResult.rows[0];

    res.json({
      pipelineValue: parseFloat(pipeline.pipeline_value),
      pipelineCount: parseInt(pipeline.pipeline_count),
      tasksOverdue: parseInt(tasks.tasks_overdue || 0),
      tasksPending: parseInt(tasks.tasks_pending || 0),
      contactsThisMonth: parseInt(contacts.contacts_this_month),
      invoicesPending: parseInt(invoices.invoices_pending || 0),
      invoicesOverdue: parseInt(invoices.invoices_overdue || 0),
      invoicesPendingValue: parseFloat(invoices.invoices_pending_value),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get lead scores (customers with activity metrics)
router.get('/lead-scores', async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 5;
  try {
    const result = await db.query(`
      SELECT
        c.id,
        c.name,
        COUNT(DISTINCT q.id) as quote_count,
        COALESCE(SUM(CASE WHEN i.status = 'paid' THEN i.total_amount ELSE 0 END), 0) as total_revenue,
        MAX(q.created_at) as last_activity,
        -- Score calculation: revenue weight + activity weight
        (
          LEAST(COALESCE(SUM(CASE WHEN i.status = 'paid' THEN i.total_amount ELSE 0 END), 0) / 100, 50) +
          (COUNT(DISTINCT q.id) * 5) +
          CASE
            WHEN MAX(q.created_at) > NOW() - INTERVAL '7 days' THEN 20
            WHEN MAX(q.created_at) > NOW() - INTERVAL '30 days' THEN 10
            ELSE 0
          END
        )::integer as score
      FROM customers c
      LEFT JOIN quotes q ON c.id = q.customer_id
      LEFT JOIN invoices i ON c.id = i.customer_id
      GROUP BY c.id, c.name
      HAVING COUNT(DISTINCT q.id) > 0 OR COALESCE(SUM(CASE WHEN i.status = 'paid' THEN i.total_amount ELSE 0 END), 0) > 0
      ORDER BY score DESC
      LIMIT $1
    `, [limit]);

    const leadsWithTrend = result.rows.map(lead => ({
      id: lead.id,
      name: lead.name,
      score: lead.score,
      contacts: parseInt(lead.quote_count) || 0,
      trend: lead.score > 70 ? 'up' : lead.score > 50 ? 'flat' : 'down',
    }));

    res.json(leadsWithTrend);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get pipeline stages with real data
router.get('/pipeline-stages', async (req: Request, res: Response) => {
  try {
    // Pour l'instant, on utilise les statuts de quotes comme stages
    const result = await db.query(`
      SELECT
        CASE
          WHEN status = 'draft' THEN 'Brouillon'
          WHEN status = 'sent' THEN 'Envoyé'
          WHEN status = 'accepted' THEN 'Accepté'
          WHEN status = 'rejected' THEN 'Rejeté'
          ELSE 'Autre'
        END as name,
        COUNT(*) as count,
        COALESCE(SUM(total_amount), 0) as value
      FROM quotes
      WHERE status IN ('draft', 'sent', 'accepted')
      GROUP BY status
      ORDER BY
        CASE
          WHEN status = 'draft' THEN 1
          WHEN status = 'sent' THEN 2
          WHEN status = 'accepted' THEN 3
          ELSE 4
        END
    `);

    const stages = result.rows.map((row, index) => ({
      id: index + 1,
      name: row.name,
      count: parseInt(row.count),
      value: parseFloat(row.value),
    }));

    res.json(stages);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get forecasting and insights
router.get('/forecasting', async (req: Request, res: Response) => {
  try {
    // Calcul du CA prévisionnel basé sur les devis en cours
    const forecastResult = await db.query(`
      SELECT
        COALESCE(SUM(CASE WHEN status = 'sent' THEN total_amount ELSE 0 END), 0) as potential_revenue,
        COUNT(CASE WHEN status = 'sent' THEN 1 END) as pending_quotes_count,
        COALESCE(SUM(CASE WHEN status IN ('sent', 'draft') THEN total_amount ELSE 0 END), 0) as pipeline_value
      FROM quotes
    `);

    // Calcul du taux de conversion historique
    const conversionResult = await db.query(`
      SELECT
        COUNT(CASE WHEN status = 'accepted' THEN 1 END)::float / NULLIF(COUNT(*), 0) as conversion_rate,
        COUNT(*) as total_quotes,
        COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted_quotes
      FROM quotes
      WHERE created_at >= NOW() - INTERVAL '90 days'
    `);

    // Calcul du délai moyen de paiement
    const paymentDelayResult = await db.query(`
      SELECT
        AVG(EXTRACT(DAY FROM (p.payment_date - i.created_at))) as avg_payment_delay_days
      FROM payments p
      JOIN invoices i ON p.invoice_id = i.id
      WHERE p.payment_date >= NOW() - INTERVAL '90 days'
    `);

    // CA des 30 derniers jours
    const recentRevenueResult = await db.query(`
      SELECT
        COALESCE(SUM(total_amount), 0) as revenue_last_30_days,
        COUNT(*) as invoices_last_30_days
      FROM invoices
      WHERE status = 'paid' AND updated_at >= NOW() - INTERVAL '30 days'
    `);

    // CA du mois précédent pour comparaison
    const previousMonthResult = await db.query(`
      SELECT
        COALESCE(SUM(total_amount), 0) as revenue_previous_month
      FROM invoices
      WHERE status = 'paid'
        AND updated_at >= NOW() - INTERVAL '60 days'
        AND updated_at < NOW() - INTERVAL '30 days'
    `);

    // Meilleur client du mois
    const topCustomerResult = await db.query(`
      SELECT
        c.id,
        c.name as customer_name,
        COALESCE(SUM(i.total_amount), 0) as total_spent
      FROM customers c
      JOIN invoices i ON c.id = i.customer_id
      WHERE i.status = 'paid' AND i.updated_at >= NOW() - INTERVAL '30 days'
      GROUP BY c.id, c.name
      ORDER BY total_spent DESC
      LIMIT 1
    `);

    const forecast = forecastResult.rows[0];
    const conversion = conversionResult.rows[0];
    const paymentDelay = paymentDelayResult.rows[0];
    const recentRevenue = recentRevenueResult.rows[0];
    const previousMonth = previousMonthResult.rows[0];
    const topCustomer = topCustomerResult.rows[0];

    // Calcul du CA prévisionnel avec taux de conversion
    const conversionRate = parseFloat(conversion.conversion_rate || 0);
    const forecastedRevenue = parseFloat(forecast.potential_revenue) * conversionRate;

    // Calcul du taux de croissance
    const currentRevenue = parseFloat(recentRevenue.revenue_last_30_days);
    const previousRevenue = parseFloat(previousMonth.revenue_previous_month);
    const growthRate = previousRevenue > 0
      ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
      : 0;

    res.json({
      potential_revenue: parseFloat(forecast.potential_revenue),
      forecasted_revenue: forecastedRevenue,
      pipeline_value: parseFloat(forecast.pipeline_value),
      pending_quotes_count: parseInt(forecast.pending_quotes_count),
      conversion_rate: conversionRate,
      avg_payment_delay_days: parseFloat(paymentDelay.avg_payment_delay_days || 0),
      revenue_last_30_days: currentRevenue,
      revenue_previous_month: previousRevenue,
      growth_rate: growthRate,
      top_customer: topCustomer || null,
      insights: {
        conversion_trend: conversionRate > 0.5 ? 'excellent' : conversionRate > 0.3 ? 'good' : 'needs_improvement',
        growth_trend: growthRate > 10 ? 'strong_growth' : growthRate > 0 ? 'growing' : growthRate > -10 ? 'stable' : 'declining',
        payment_speed: paymentDelay.avg_payment_delay_days < 15 ? 'fast' : paymentDelay.avg_payment_delay_days < 30 ? 'normal' : 'slow',
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Main analytics endpoint - consolidated overview
router.get('/', async (req: Request, res: Response) => {
  try {
    const analytics: any = {};

    // Deals analytics
    const dealsStats = await db.query(`
      SELECT
        COUNT(*) as total_deals,
        COUNT(*) FILTER (WHERE status = 'open') as open_deals,
        COUNT(*) FILTER (WHERE status = 'won') as won_deals,
        COUNT(*) FILTER (WHERE status = 'lost') as lost_deals,
        COALESCE(SUM(value), 0) as total_value,
        COALESCE(SUM(value) FILTER (WHERE status = 'won'), 0) as won_value,
        COALESCE(AVG(probability), 0) as avg_probability
      FROM deals
      WHERE deleted_at IS NULL
    `);
    analytics.deals = dealsStats.rows[0];

    // Contacts analytics
    const contactsStats = await db.query(`
      SELECT
        COUNT(*) as total_contacts,
        COUNT(*) FILTER (WHERE type = 'lead') as leads,
        COUNT(*) FILTER (WHERE type = 'customer') as customers,
        COALESCE(AVG(score), 0) as avg_score
      FROM contacts
      WHERE deleted_at IS NULL
    `);
    analytics.contacts = contactsStats.rows[0];

    // Revenue analytics
    const revenueStats = await db.query(`
      SELECT
        COALESCE(SUM(total_amount), 0) as total_revenue,
        COALESCE(SUM(total_amount) FILTER (WHERE status = 'paid'), 0) as paid_revenue,
        COALESCE(SUM(total_amount) FILTER (WHERE status IN ('pending', 'sent')), 0) as pending_revenue,
        COUNT(*) as total_invoices,
        COUNT(*) FILTER (WHERE status = 'paid') as paid_invoices,
        COUNT(*) FILTER (WHERE due_date < NOW() AND status NOT IN ('paid', 'cancelled')) as overdue_invoices
      FROM invoices
    `);
    analytics.revenue = revenueStats.rows[0];

    // Quotes analytics
    const quotesStats = await db.query(`
      SELECT
        COUNT(*) as total_quotes,
        COUNT(*) FILTER (WHERE status = 'draft') as draft_quotes,
        COUNT(*) FILTER (WHERE status = 'sent') as sent_quotes,
        COUNT(*) FILTER (WHERE status = 'accepted') as accepted_quotes,
        COALESCE(SUM(total_amount), 0) as total_value,
        ROUND(
          (COUNT(*) FILTER (WHERE status = 'accepted')::numeric /
           NULLIF(COUNT(*) FILTER (WHERE status IN ('accepted', 'rejected')), 0)) * 100,
          2
        ) as acceptance_rate
      FROM quotes
    `);
    analytics.quotes = quotesStats.rows[0];

    // Activities analytics
    const activitiesStats = await db.query(`
      SELECT
        COUNT(*) as total_activities,
        COUNT(*) FILTER (WHERE type = 'call') as calls,
        COUNT(*) FILTER (WHERE type = 'email') as emails,
        COUNT(*) FILTER (WHERE type = 'meeting') as meetings,
        COUNT(*) FILTER (WHERE scheduled_at > NOW() AND completed_at IS NULL) as upcoming,
        COUNT(*) FILTER (WHERE scheduled_at < NOW() AND completed_at IS NULL) as overdue
      FROM activities
    `);
    analytics.activities = activitiesStats.rows[0];

    res.json(analytics);
  } catch (err: any) {
    console.error('Error fetching analytics:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
