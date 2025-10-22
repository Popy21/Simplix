import express, { Request, Response } from 'express';
import { pool as db } from '../database/db';
import { Product } from '../models/types';

const router = express.Router();

// Get all products
router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await db.query('SELECT * FROM products ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get product by ID
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await db.query('SELECT * FROM products WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create product
router.post('/', async (req: Request, res: Response) => {
  const product: Product = req.body;
  const { name, description, price, stock } = product;

  if (!name || price === undefined) {
    res.status(400).json({ error: 'Name and price are required' });
    return;
  }

  try {
    const result = await db.query(
      'INSERT INTO products (name, description, price, stock) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, description, price, stock || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update product
router.put('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, description, price, stock } = req.body;

  try {
    const result = await db.query(
      'UPDATE products SET name = $1, description = $2, price = $3, stock = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5 RETURNING *',
      [name, description, price, stock, id]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete product
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await db.query('DELETE FROM products WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }
    res.json({ message: 'Product deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
