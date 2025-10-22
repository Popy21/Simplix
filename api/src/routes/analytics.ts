import express, { Request, Response } from 'express';
import { pool as db } from '../database/db';

const router = express.Router();

// Get dashboard statistics
router.get('/dashboard', (req: Request, res: Response) => {
  const stats: any = {};

  // Get total counts
  db.get('SELECT COUNT(*) as count FROM customers', [], (err, result: any) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    stats.totalCustomers = result.count;

    db.get('SELECT COUNT(*) as count FROM products', [], (err, result: any) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      stats.totalProducts = result.count;

      db.get('SELECT COUNT(*) as count FROM sales', [], (err, result: any) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        stats.totalSales = result.count;

        db.get('SELECT COUNT(*) as count FROM quotes', [], (err, result: any) => {
          if (err) {
            res.status(500).json({ error: err.message });
            return;
          }
          stats.totalQuotes = result.count;

          db.get('SELECT COUNT(*) as count FROM teams', [], (err, result: any) => {
            if (err) {
              res.status(500).json({ error: err.message });
              return;
            }
            stats.totalTeams = result.count;

            db.get('SELECT COUNT(*) as count FROM users', [], (err, result: any) => {
              if (err) {
                res.status(500).json({ error: err.message });
                return;
              }
              stats.totalUsers = result.count;

              // Get revenue stats
              db.get('SELECT SUM(total_amount) as total FROM sales WHERE status = "completed"', [], (err, result: any) => {
                if (err) {
                  res.status(500).json({ error: err.message });
                  return;
                }
                stats.totalRevenue = result.total || 0;

                // Get pending quotes value
                db.get('SELECT SUM(total_amount) as total FROM quotes WHERE status IN ("draft", "sent")', [], (err, result: any) => {
                  if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                  }
                  stats.pendingQuotesValue = result.total || 0;

                  res.json(stats);
                });
              });
            });
          });
        });
      });
    });
  });
});

// Get sales statistics by period
router.get('/sales-by-period', (req: Request, res: Response) => {
  const { period = 'month' } = req.query;

  let dateFormat = '%Y-%m';
  if (period === 'day') dateFormat = '%Y-%m-%d';
  if (period === 'year') dateFormat = '%Y';

  const query = `
    SELECT
      strftime('${dateFormat}', sale_date) as period,
      COUNT(*) as count,
      SUM(total_amount) as revenue
    FROM sales
    WHERE status = 'completed'
    GROUP BY period
    ORDER BY period DESC
    LIMIT 12
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Get top customers by revenue
router.get('/top-customers', (req: Request, res: Response) => {
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
    LIMIT ?
  `;

  db.all(query, [limit], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Get top products by sales
router.get('/top-products', (req: Request, res: Response) => {
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
    LIMIT ?
  `;

  db.all(query, [limit], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Get quotes conversion rate
router.get('/quotes-conversion', (req: Request, res: Response) => {
  const query = `
    SELECT
      status,
      COUNT(*) as count,
      SUM(total_amount) as total_value
    FROM quotes
    GROUP BY status
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Get recent activity
router.get('/recent-activity', (req: Request, res: Response) => {
  const { limit = 20 } = req.query;

  const activities: any[] = [];

  // Get recent sales
  db.all(
    `SELECT 'sale' as type, id, customer_id, sale_date as created_at FROM sales ORDER BY sale_date DESC LIMIT ?`,
    [limit],
    (err, sales) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }

      // Get recent quotes
      db.all(
        `SELECT 'quote' as type, id, customer_id, created_at FROM quotes ORDER BY created_at DESC LIMIT ?`,
        [limit],
        (err, quotes) => {
          if (err) {
            res.status(500).json({ error: err.message });
            return;
          }

          // Get recent customers
          db.all(
            `SELECT 'customer' as type, id, name, created_at FROM customers ORDER BY created_at DESC LIMIT ?`,
            [limit],
            (err, customers) => {
              if (err) {
                res.status(500).json({ error: err.message });
                return;
              }

              // Combine and sort
              const combined = [...sales, ...quotes, ...customers]
                .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .slice(0, Number(limit));

              res.json(combined);
            }
          );
        }
      );
    }
  );
});

// Get low stock products
router.get('/low-stock', (req: Request, res: Response) => {
  const { threshold = 10 } = req.query;

  const query = `
    SELECT *
    FROM products
    WHERE stock <= ?
    ORDER BY stock ASC
  `;

  db.all(query, [threshold], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

export default router;
