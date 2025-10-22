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

export default router;
