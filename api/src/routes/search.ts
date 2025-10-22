import express, { Request, Response } from 'express';
import { pool as db } from '../database/db';

const router = express.Router();

// Global search across all entities
router.get('/', async (req: Request, res: Response) => {
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

  try {
    // Search customers
    const customersResult = await db.query(
      `SELECT * FROM customers WHERE name LIKE $1 OR email LIKE $1 OR company LIKE $1 LIMIT 10`,
      [searchTerm]
    );
    results.customers = customersResult.rows;

    // Search products
    const productsResult = await db.query(
      `SELECT * FROM products WHERE name LIKE $1 OR description LIKE $1 LIMIT 10`,
      [searchTerm]
    );
    results.products = productsResult.rows;

    // Search quotes
    const quotesResult = await db.query(
      `SELECT q.*, c.name as customer_name FROM quotes q
       LEFT JOIN customers c ON q.customer_id = c.id
       WHERE q.title LIKE $1 OR q.description LIKE $1 LIMIT 10`,
      [searchTerm]
    );
    results.quotes = quotesResult.rows;

    // Search users
    const usersResult = await db.query(
      `SELECT id, name, email, role FROM users WHERE name LIKE $1 OR email LIKE $1 LIMIT 10`,
      [searchTerm]
    );
    results.users = usersResult.rows;

    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Search customers with filters
router.get('/customers', async (req: Request, res: Response) => {
  const { q, company, email } = req.query;

  let query = 'SELECT * FROM customers WHERE 1=1';
  const params: any[] = [];
  let paramCount = 1;

  if (q && typeof q === 'string') {
    query += ` AND (name LIKE $${paramCount} OR email LIKE $${paramCount} OR company LIKE $${paramCount})`;
    const searchTerm = `%${q}%`;
    params.push(searchTerm);
    paramCount++;
  }

  if (company && typeof company === 'string') {
    query += ` AND company LIKE $${paramCount}`;
    params.push(`%${company}%`);
    paramCount++;
  }

  if (email && typeof email === 'string') {
    query += ` AND email LIKE $${paramCount}`;
    params.push(`%${email}%`);
    paramCount++;
  }

  query += ' ORDER BY created_at DESC LIMIT 50';

  try {
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Search products with filters
router.get('/products', async (req: Request, res: Response) => {
  const { q, minPrice, maxPrice, inStock } = req.query;

  let query = 'SELECT * FROM products WHERE 1=1';
  const params: any[] = [];
  let paramCount = 1;

  if (q && typeof q === 'string') {
    query += ` AND (name LIKE $${paramCount} OR description LIKE $${paramCount})`;
    const searchTerm = `%${q}%`;
    params.push(searchTerm);
    paramCount++;
  }

  if (minPrice) {
    query += ` AND price >= $${paramCount}`;
    params.push(Number(minPrice));
    paramCount++;
  }

  if (maxPrice) {
    query += ` AND price <= $${paramCount}`;
    params.push(Number(maxPrice));
    paramCount++;
  }

  if (inStock === 'true') {
    query += ' AND stock > 0';
  }

  query += ' ORDER BY created_at DESC LIMIT 50';

  try {
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Search sales with filters
router.get('/sales', async (req: Request, res: Response) => {
  const { customerId, productId, status, startDate, endDate } = req.query;

  let query = `
    SELECT s.*, c.name as customer_name, p.name as product_name
    FROM sales s
    LEFT JOIN customers c ON s.customer_id = c.id
    LEFT JOIN products p ON s.product_id = p.id
    WHERE 1=1
  `;
  const params: any[] = [];
  let paramCount = 1;

  if (customerId) {
    query += ` AND s.customer_id = $${paramCount}`;
    params.push(Number(customerId));
    paramCount++;
  }

  if (productId) {
    query += ` AND s.product_id = $${paramCount}`;
    params.push(Number(productId));
    paramCount++;
  }

  if (status && typeof status === 'string') {
    query += ` AND s.status = $${paramCount}`;
    params.push(status);
    paramCount++;
  }

  if (startDate && typeof startDate === 'string') {
    query += ` AND s.sale_date >= $${paramCount}`;
    params.push(startDate);
    paramCount++;
  }

  if (endDate && typeof endDate === 'string') {
    query += ` AND s.sale_date <= $${paramCount}`;
    params.push(endDate);
    paramCount++;
  }

  query += ' ORDER BY s.sale_date DESC LIMIT 100';

  try {
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Search quotes with filters
router.get('/quotes', async (req: Request, res: Response) => {
  const { customerId, userId, status, startDate, endDate } = req.query;

  let query = `
    SELECT q.*, c.name as customer_name, u.name as user_name
    FROM quotes q
    LEFT JOIN customers c ON q.customer_id = c.id
    LEFT JOIN users u ON q.user_id = u.id
    WHERE 1=1
  `;
  const params: any[] = [];
  let paramCount = 1;

  if (customerId) {
    query += ` AND q.customer_id = $${paramCount}`;
    params.push(Number(customerId));
    paramCount++;
  }

  if (userId) {
    query += ` AND q.user_id = $${paramCount}`;
    params.push(Number(userId));
    paramCount++;
  }

  if (status && typeof status === 'string') {
    query += ` AND q.status = $${paramCount}`;
    params.push(status);
    paramCount++;
  }

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

  query += ' ORDER BY q.created_at DESC LIMIT 100';

  try {
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
