import express, { Request, Response } from 'express';
import { pool as db } from '../database/db';

const router = express.Router();

// GET / - Liste des rapports disponibles et résumé
router.get('/', async (req: Request, res: Response) => {
  try {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    // Résumé rapide
    const [salesSummary, quoteSummary, productSummary] = await Promise.all([
      db.query(`
        SELECT
          COUNT(*) as total_sales,
          COALESCE(SUM(total_amount), 0) as total_revenue
        FROM sales
        WHERE EXTRACT(YEAR FROM sale_date) = $1
      `, [currentYear]),
      db.query(`
        SELECT
          COUNT(*) as total_quotes,
          COUNT(*) FILTER (WHERE status = 'accepted') as accepted_quotes,
          COALESCE(SUM(total_amount) FILTER (WHERE status = 'accepted'), 0) as accepted_value
        FROM quotes
        WHERE EXTRACT(YEAR FROM created_at) = $1
      `, [currentYear]),
      db.query(`
        SELECT
          COUNT(*) as total_products,
          COALESCE(SUM(stock * price), 0) as total_stock_value
        FROM products
        WHERE deleted_at IS NULL
      `)
    ]);

    res.json({
      available_reports: [
        { id: 'sales', name: 'Rapport des ventes', endpoint: '/api/reports/sales' },
        { id: 'customers', name: 'Rapport clients', endpoint: '/api/reports/customers' },
        { id: 'products', name: 'Performance produits', endpoint: '/api/reports/products' },
        { id: 'quotes', name: 'Rapport devis', endpoint: '/api/reports/quotes' },
        { id: 'teams', name: 'Performance équipes', endpoint: '/api/reports/teams' },
        { id: 'users', name: 'Performance utilisateurs', endpoint: '/api/reports/users' },
        { id: 'revenue', name: 'Revenus par période', endpoint: '/api/reports/revenue' },
        { id: 'inventory', name: 'État des stocks', endpoint: '/api/reports/inventory' }
      ],
      summary: {
        year: currentYear,
        sales: salesSummary.rows[0],
        quotes: quoteSummary.rows[0],
        products: productSummary.rows[0]
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Sales report by date range
router.get('/sales', async (req: Request, res: Response) => {
  const { startDate, endDate, groupBy = 'day' } = req.query;

  if (!startDate || !endDate) {
    res.status(400).json({ error: 'startDate and endDate are required' });
    return;
  }

  let dateFormat = 'YYYY-MM-DD';
  if (groupBy === 'month') dateFormat = 'YYYY-MM';
  if (groupBy === 'year') dateFormat = 'YYYY';

  const query = `
    SELECT
      to_char(sale_date, '${dateFormat}') as date,
      COUNT(*) as total_sales,
      SUM(quantity) as total_quantity,
      SUM(total_amount) as total_revenue,
      AVG(total_amount) as average_sale,
      status
    FROM sales
    WHERE sale_date BETWEEN $1 AND $2
    GROUP BY date, status
    ORDER BY date DESC
  `;

  try {
    const result = await db.query(query, [startDate, endDate]);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Customer report with sales summary
router.get('/customers', async (req: Request, res: Response) => {
  const query = `
    SELECT
      c.*,
      COUNT(s.id) as total_sales,
      SUM(s.total_amount) as total_revenue,
      MAX(s.sale_date) as last_sale_date,
      COUNT(q.id) as total_quotes,
      SUM(CASE WHEN q.status = 'accepted' THEN 1 ELSE 0 END) as accepted_quotes
    FROM customers c
    LEFT JOIN sales s ON c.id = s.customer_id
    LEFT JOIN quotes q ON c.id = q.customer_id
    GROUP BY c.id
    ORDER BY total_revenue DESC
  `;

  try {
    const result = await db.query(query, []);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Product performance report
router.get('/products', async (req: Request, res: Response) => {
  const query = `
    SELECT
      p.*,
      COUNT(s.id) as total_sales,
      SUM(s.quantity) as total_quantity_sold,
      SUM(s.total_amount) as total_revenue,
      AVG(s.total_amount) as average_sale_amount,
      (p.stock * p.price) as stock_value
    FROM products p
    LEFT JOIN sales s ON p.id = s.product_id AND s.status = 'completed'
    GROUP BY p.id
    ORDER BY total_revenue DESC
  `;

  try {
    const result = await db.query(query, []);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Quotes report with conversion metrics
router.get('/quotes', async (req: Request, res: Response) => {
  const { startDate, endDate } = req.query;

  let query = `
    SELECT
      q.*,
      c.name as customer_name,
      c.company as customer_company,
      u.name as created_by,
      EXTRACT(EPOCH FROM (q.updated_at - q.created_at))/86400 as days_to_update
    FROM quotes q
    LEFT JOIN customers c ON q.customer_id = c.id
    LEFT JOIN users u ON q.user_id = u.id
    WHERE 1=1
  `;

  const params: any[] = [];
  let paramCount = 1;

  if (startDate && typeof startDate === 'string') {
    query += ` AND q.created_at >= $${paramCount}`;
    params.push(startDate);
    paramCount++;
  }

  if (endDate && typeof endDate === 'string') {
    query += ` AND q.created_at <= $${paramCount}`;
    params.push(endDate);
    paramCount++;
  }

  query += ' ORDER BY q.created_at DESC';

  try {
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Team performance report
router.get('/teams', async (req: Request, res: Response) => {
  const query = `
    SELECT
      t.*,
      COUNT(DISTINCT tm.user_id) as member_count,
      COUNT(DISTINCT q.id) as total_quotes,
      SUM(CASE WHEN q.status = 'accepted' THEN 1 ELSE 0 END) as accepted_quotes,
      SUM(CASE WHEN q.status = 'accepted' THEN q.total_amount ELSE 0 END) as total_quote_value
    FROM teams t
    LEFT JOIN team_members tm ON t.id = tm.team_id
    LEFT JOIN users u ON tm.user_id = u.id
    LEFT JOIN quotes q ON u.id = q.user_id
    GROUP BY t.id
    ORDER BY total_quote_value DESC
  `;

  try {
    const result = await db.query(query, []);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// User performance report
router.get('/users', async (req: Request, res: Response) => {
  const query = `
    SELECT
      u.id,
      u.name,
      u.email,
      u.role,
      COUNT(DISTINCT q.id) as total_quotes,
      SUM(CASE WHEN q.status = 'accepted' THEN 1 ELSE 0 END) as accepted_quotes,
      SUM(CASE WHEN q.status = 'rejected' THEN 1 ELSE 0 END) as rejected_quotes,
      SUM(CASE WHEN q.status = 'accepted' THEN q.total_amount ELSE 0 END) as total_quote_value,
      AVG(CASE WHEN q.status = 'accepted' THEN q.total_amount ELSE NULL END) as avg_quote_value
    FROM users u
    LEFT JOIN quotes q ON u.id = q.user_id
    GROUP BY u.id
    ORDER BY total_quote_value DESC
  `;

  try {
    const result = await db.query(query, []);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Revenue report by period
router.get('/revenue', async (req: Request, res: Response) => {
  const { startDate, endDate, groupBy = 'month' } = req.query;

  let dateFormat = 'YYYY-MM';
  if (groupBy === 'day') dateFormat = 'YYYY-MM-DD';
  if (groupBy === 'year') dateFormat = 'YYYY';

  let query = `
    SELECT
      to_char(sale_date, '${dateFormat}') as period,
      SUM(total_amount) as revenue,
      COUNT(*) as sales_count,
      AVG(total_amount) as avg_sale
    FROM sales
    WHERE status = 'completed'
  `;

  const params: any[] = [];
  let paramCount = 1;

  if (startDate && typeof startDate === 'string') {
    query += ` AND sale_date >= $${paramCount}`;
    params.push(startDate);
    paramCount++;
  }

  if (endDate && typeof endDate === 'string') {
    query += ` AND sale_date <= $${paramCount}`;
    params.push(endDate);
    paramCount++;
  }

  query += ' GROUP BY period ORDER BY period DESC';

  try {
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Inventory report
router.get('/inventory', async (req: Request, res: Response) => {
  const query = `
    SELECT
      p.*,
      (p.stock * p.price) as stock_value,
      COUNT(s.id) as times_sold,
      SUM(s.quantity) as total_quantity_sold,
      CASE
        WHEN p.stock = 0 THEN 'Out of Stock'
        WHEN p.stock <= 10 THEN 'Low Stock'
        WHEN p.stock <= 50 THEN 'Medium Stock'
        ELSE 'High Stock'
      END as stock_status
    FROM products p
    LEFT JOIN sales s ON p.id = s.product_id
    GROUP BY p.id
    ORDER BY stock_value DESC
  `;

  try {
    const result = await db.query(query, []);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
