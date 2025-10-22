import express, { Request, Response } from 'express';
import { pool as db } from '../database/db';

const router = express.Router();

// Bulk create customers
router.post('/customers', async (req: Request, res: Response) => {
  const { customers } = req.body;

  if (!customers || !Array.isArray(customers) || customers.length === 0) {
    res.status(400).json({ error: 'customers array is required and must not be empty' });
    return;
  }

  try {
    const results = [];
    for (const customer of customers) {
      const { name, email, phone, company, address } = customer;

      if (!name || !email) {
        throw new Error('Each customer must have name and email');
      }

      const result = await db.query(
        'INSERT INTO customers (name, email, phone, company, address) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [name, email, phone, company, address]
      );
      results.push(result.rows[0]);
    }

    res.status(201).json({
      message: `${results.length} customers created successfully`,
      customers: results,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create customers' });
  }
});

// Bulk create products
router.post('/products', async (req: Request, res: Response) => {
  const { products } = req.body;

  if (!products || !Array.isArray(products) || products.length === 0) {
    res.status(400).json({ error: 'products array is required and must not be empty' });
    return;
  }

  try {
    const results = [];
    for (const product of products) {
      const { name, description, price, stock } = product;

      if (!name || price === undefined) {
        throw new Error('Each product must have name and price');
      }

      const result = await db.query(
        'INSERT INTO products (name, description, price, stock) VALUES ($1, $2, $3, $4) RETURNING *',
        [name, description, price, stock || 0]
      );
      results.push(result.rows[0]);
    }

    res.status(201).json({
      message: `${results.length} products created successfully`,
      products: results,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create products' });
  }
});

// Bulk delete customers
router.delete('/customers', async (req: Request, res: Response) => {
  const { ids } = req.body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ error: 'ids array is required and must not be empty' });
    return;
  }

  const placeholders = ids.map((_, index) => `$${index + 1}`).join(',');
  const query = `DELETE FROM customers WHERE id IN (${placeholders})`;

  try {
    const result = await db.query(query, ids);
    res.json({
      message: `${result.rowCount} customers deleted successfully`,
      deletedCount: result.rowCount,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Bulk delete products
router.delete('/products', async (req: Request, res: Response) => {
  const { ids } = req.body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ error: 'ids array is required and must not be empty' });
    return;
  }

  const placeholders = ids.map((_, index) => `$${index + 1}`).join(',');
  const query = `DELETE FROM products WHERE id IN (${placeholders})`;

  try {
    const result = await db.query(query, ids);
    res.json({
      message: `${result.rowCount} products deleted successfully`,
      deletedCount: result.rowCount,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Bulk delete sales
router.delete('/sales', async (req: Request, res: Response) => {
  const { ids } = req.body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ error: 'ids array is required and must not be empty' });
    return;
  }

  const placeholders = ids.map((_, index) => `$${index + 1}`).join(',');
  const query = `DELETE FROM sales WHERE id IN (${placeholders})`;

  try {
    const result = await db.query(query, ids);
    res.json({
      message: `${result.rowCount} sales deleted successfully`,
      deletedCount: result.rowCount,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Bulk update product stock
router.patch('/products/stock', async (req: Request, res: Response) => {
  const { updates } = req.body;

  if (!updates || !Array.isArray(updates) || updates.length === 0) {
    res.status(400).json({ error: 'updates array is required and must not be empty' });
    return;
  }

  try {
    const results = [];
    for (const update of updates) {
      const { id, stock } = update;

      if (id === undefined || stock === undefined) {
        throw new Error('Each update must have id and stock');
      }

      const result = await db.query(
        'UPDATE products SET stock = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [stock, id]
      );
      results.push({ id, stock, changes: result.rowCount });
    }

    res.json({
      message: `${results.length} products updated successfully`,
      updates: results,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update products' });
  }
});

// Bulk update sales status
router.patch('/sales/status', async (req: Request, res: Response) => {
  const { ids, status } = req.body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ error: 'ids array is required and must not be empty' });
    return;
  }

  if (!status) {
    res.status(400).json({ error: 'status is required' });
    return;
  }

  const placeholders = ids.map((_, index) => `$${index + 2}`).join(',');
  const query = `UPDATE sales SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`;

  try {
    const result = await db.query(query, [status, ...ids]);
    res.json({
      message: `${result.rowCount} sales updated successfully`,
      updatedCount: result.rowCount,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Bulk update quotes status
router.patch('/quotes/status', async (req: Request, res: Response) => {
  const { ids, status } = req.body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ error: 'ids array is required and must not be empty' });
    return;
  }

  if (!status) {
    res.status(400).json({ error: 'status is required' });
    return;
  }

  const placeholders = ids.map((_, index) => `$${index + 2}`).join(',');
  const query = `UPDATE quotes SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`;

  try {
    const result = await db.query(query, [status, ...ids]);
    res.json({
      message: `${result.rowCount} quotes updated successfully`,
      updatedCount: result.rowCount,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
