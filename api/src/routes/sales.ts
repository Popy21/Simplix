import express, { Request, Response } from 'express';
import { pool as db } from '../database/db';
import { Sale } from '../models/types';

const router = express.Router();

// Get all sales with customer and product details
router.get('/', async (req: Request, res: Response) => {
  const query = `
    SELECT
      s.*,
      c.name as customer_name,
      p.name as product_name,
      p.price as product_price
    FROM sales s
    LEFT JOIN customers c ON s.customer_id = c.id
    LEFT JOIN products p ON s.product_id = p.id
    ORDER BY s.sale_date DESC
  `;

  try {
    const result = await db.query(query);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get sale by ID
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const query = `
    SELECT
      s.*,
      c.name as customer_name,
      p.name as product_name,
      p.price as product_price
    FROM sales s
    LEFT JOIN customers c ON s.customer_id = c.id
    LEFT JOIN products p ON s.product_id = p.id
    WHERE s.id = $1
  `;

  try {
    const result = await db.query(query, [id]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Sale not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create sale
router.post('/', async (req: Request, res: Response) => {
  const sale: Sale = req.body;
  const { customer_id, product_id, quantity, total_amount, status, notes } = sale;

  if (!customer_id || !product_id || !quantity || !total_amount) {
    res.status(400).json({ error: 'customer_id, product_id, quantity, and total_amount are required' });
    return;
  }

  try {
    const result = await db.query(
      'INSERT INTO sales (customer_id, product_id, quantity, total_amount, status, notes) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [customer_id, product_id, quantity, total_amount, status || 'pending', notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update sale
router.put('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { customer_id, product_id, quantity, total_amount, status, notes } = req.body;

  try {
    const result = await db.query(
      'UPDATE sales SET customer_id = $1, product_id = $2, quantity = $3, total_amount = $4, status = $5, notes = $6 WHERE id = $7 RETURNING *',
      [customer_id, product_id, quantity, total_amount, status, notes, id]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Sale not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete sale
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await db.query('DELETE FROM sales WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Sale not found' });
      return;
    }
    res.json({ message: 'Sale deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
