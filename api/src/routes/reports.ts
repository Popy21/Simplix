import express, { Request, Response } from 'express';
import db from '../database/db';

const router = express.Router();

// Sales report by date range
router.get('/sales', (req: Request, res: Response) => {
  const { startDate, endDate, groupBy = 'day' } = req.query;

  if (!startDate || !endDate) {
    res.status(400).json({ error: 'startDate and endDate are required' });
    return;
  }

  let dateFormat = '%Y-%m-%d';
  if (groupBy === 'month') dateFormat = '%Y-%m';
  if (groupBy === 'year') dateFormat = '%Y';

  const query = `
    SELECT
      strftime('${dateFormat}', sale_date) as date,
      COUNT(*) as total_sales,
      SUM(quantity) as total_quantity,
      SUM(total_amount) as total_revenue,
      AVG(total_amount) as average_sale,
      status
    FROM sales
    WHERE sale_date BETWEEN ? AND ?
    GROUP BY date, status
    ORDER BY date DESC
  `;

  db.all(query, [startDate, endDate], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Customer report with sales summary
router.get('/customers', (req: Request, res: Response) => {
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

  db.all(query, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Product performance report
router.get('/products', (req: Request, res: Response) => {
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

  db.all(query, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Quotes report with conversion metrics
router.get('/quotes', (req: Request, res: Response) => {
  const { startDate, endDate } = req.query;

  let query = `
    SELECT
      q.*,
      c.name as customer_name,
      c.company as customer_company,
      u.name as created_by,
      (julianday(q.updated_at) - julianday(q.created_at)) as days_to_update
    FROM quotes q
    LEFT JOIN customers c ON q.customer_id = c.id
    LEFT JOIN users u ON q.user_id = u.id
    WHERE 1=1
  `;

  const params: any[] = [];

  if (startDate && typeof startDate === 'string') {
    query += ' AND q.created_at >= ?';
    params.push(startDate);
  }

  if (endDate && typeof endDate === 'string') {
    query += ' AND q.created_at <= ?';
    params.push(endDate);
  }

  query += ' ORDER BY q.created_at DESC';

  db.all(query, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Team performance report
router.get('/teams', (req: Request, res: Response) => {
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

  db.all(query, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// User performance report
router.get('/users', (req: Request, res: Response) => {
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

  db.all(query, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Revenue report by period
router.get('/revenue', (req: Request, res: Response) => {
  const { startDate, endDate, groupBy = 'month' } = req.query;

  let dateFormat = '%Y-%m';
  if (groupBy === 'day') dateFormat = '%Y-%m-%d';
  if (groupBy === 'year') dateFormat = '%Y';

  let query = `
    SELECT
      strftime('${dateFormat}', sale_date) as period,
      SUM(total_amount) as revenue,
      COUNT(*) as sales_count,
      AVG(total_amount) as avg_sale
    FROM sales
    WHERE status = 'completed'
  `;

  const params: any[] = [];

  if (startDate && typeof startDate === 'string') {
    query += ' AND sale_date >= ?';
    params.push(startDate);
  }

  if (endDate && typeof endDate === 'string') {
    query += ' AND sale_date <= ?';
    params.push(endDate);
  }

  query += ' GROUP BY period ORDER BY period DESC';

  db.all(query, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Inventory report
router.get('/inventory', (req: Request, res: Response) => {
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

  db.all(query, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

export default router;
