import express, { Request, Response } from 'express';
import { pool as db } from '../database/db';

const router = express.Router();

// Global search across all entities
router.get('/', (req: Request, res: Response) => {
  const { q } = req.query;

  if (!q || typeof q !== 'string') {
    res.status(400).json({ error: 'Search query (q) is required' });
    return;
  }

  const searchTerm = `%${q}%`;
  const results: any = {
    customers: [],
    products: [],
    sales: [],
    quotes: [],
    users: [],
  };

  // Search customers
  db.all(
    `SELECT * FROM customers WHERE name LIKE ? OR email LIKE ? OR company LIKE ? LIMIT 10`,
    [searchTerm, searchTerm, searchTerm],
    (err, customers) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      results.customers = customers;

      // Search products
      db.all(
        `SELECT * FROM products WHERE name LIKE ? OR description LIKE ? LIMIT 10`,
        [searchTerm, searchTerm],
        (err, products) => {
          if (err) {
            res.status(500).json({ error: err.message });
            return;
          }
          results.products = products;

          // Search quotes
          db.all(
            `SELECT q.*, c.name as customer_name FROM quotes q
             LEFT JOIN customers c ON q.customer_id = c.id
             WHERE q.title LIKE ? OR q.description LIKE ? LIMIT 10`,
            [searchTerm, searchTerm],
            (err, quotes) => {
              if (err) {
                res.status(500).json({ error: err.message });
                return;
              }
              results.quotes = quotes;

              // Search users
              db.all(
                `SELECT id, name, email, role FROM users WHERE name LIKE ? OR email LIKE ? LIMIT 10`,
                [searchTerm, searchTerm],
                (err, users) => {
                  if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                  }
                  results.users = users;

                  res.json(results);
                }
              );
            }
          );
        }
      );
    }
  );
});

// Search customers with filters
router.get('/customers', (req: Request, res: Response) => {
  const { q, company, email } = req.query;

  let query = 'SELECT * FROM customers WHERE 1=1';
  const params: any[] = [];

  if (q && typeof q === 'string') {
    query += ' AND (name LIKE ? OR email LIKE ? OR company LIKE ?)';
    const searchTerm = `%${q}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  if (company && typeof company === 'string') {
    query += ' AND company LIKE ?';
    params.push(`%${company}%`);
  }

  if (email && typeof email === 'string') {
    query += ' AND email LIKE ?';
    params.push(`%${email}%`);
  }

  query += ' ORDER BY created_at DESC LIMIT 50';

  db.all(query, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Search products with filters
router.get('/products', (req: Request, res: Response) => {
  const { q, minPrice, maxPrice, inStock } = req.query;

  let query = 'SELECT * FROM products WHERE 1=1';
  const params: any[] = [];

  if (q && typeof q === 'string') {
    query += ' AND (name LIKE ? OR description LIKE ?)';
    const searchTerm = `%${q}%`;
    params.push(searchTerm, searchTerm);
  }

  if (minPrice) {
    query += ' AND price >= ?';
    params.push(Number(minPrice));
  }

  if (maxPrice) {
    query += ' AND price <= ?';
    params.push(Number(maxPrice));
  }

  if (inStock === 'true') {
    query += ' AND stock > 0';
  }

  query += ' ORDER BY created_at DESC LIMIT 50';

  db.all(query, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Search sales with filters
router.get('/sales', (req: Request, res: Response) => {
  const { customerId, productId, status, startDate, endDate } = req.query;

  let query = `
    SELECT s.*, c.name as customer_name, p.name as product_name
    FROM sales s
    LEFT JOIN customers c ON s.customer_id = c.id
    LEFT JOIN products p ON s.product_id = p.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (customerId) {
    query += ' AND s.customer_id = ?';
    params.push(Number(customerId));
  }

  if (productId) {
    query += ' AND s.product_id = ?';
    params.push(Number(productId));
  }

  if (status && typeof status === 'string') {
    query += ' AND s.status = ?';
    params.push(status);
  }

  if (startDate && typeof startDate === 'string') {
    query += ' AND s.sale_date >= ?';
    params.push(startDate);
  }

  if (endDate && typeof endDate === 'string') {
    query += ' AND s.sale_date <= ?';
    params.push(endDate);
  }

  query += ' ORDER BY s.sale_date DESC LIMIT 100';

  db.all(query, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Search quotes with filters
router.get('/quotes', (req: Request, res: Response) => {
  const { customerId, userId, status, startDate, endDate } = req.query;

  let query = `
    SELECT q.*, c.name as customer_name, u.name as user_name
    FROM quotes q
    LEFT JOIN customers c ON q.customer_id = c.id
    LEFT JOIN users u ON q.user_id = u.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (customerId) {
    query += ' AND q.customer_id = ?';
    params.push(Number(customerId));
  }

  if (userId) {
    query += ' AND q.user_id = ?';
    params.push(Number(userId));
  }

  if (status && typeof status === 'string') {
    query += ' AND q.status = ?';
    params.push(status);
  }

  if (startDate && typeof startDate === 'string') {
    query += ' AND q.created_at >= ?';
    params.push(startDate);
  }

  if (endDate && typeof endDate === 'string') {
    query += ' AND q.created_at <= ?';
    params.push(endDate);
  }

  query += ' ORDER BY q.created_at DESC LIMIT 100';

  db.all(query, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

export default router;
