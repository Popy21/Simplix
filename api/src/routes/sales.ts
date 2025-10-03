import express, { Request, Response } from 'express';
import db from '../database/db';
import { Sale } from '../models/types';

const router = express.Router();

// Get all sales with customer and product details
router.get('/', (req: Request, res: Response) => {
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
  
  db.all(query, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Get sale by ID
router.get('/:id', (req: Request, res: Response) => {
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
    WHERE s.id = ?
  `;
  
  db.get(query, [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Sale not found' });
      return;
    }
    res.json(row);
  });
});

// Create sale
router.post('/', (req: Request, res: Response) => {
  const sale: Sale = req.body;
  const { customer_id, product_id, quantity, total_amount, status, notes } = sale;

  if (!customer_id || !product_id || !quantity || !total_amount) {
    res.status(400).json({ error: 'customer_id, product_id, quantity, and total_amount are required' });
    return;
  }

  db.run(
    'INSERT INTO sales (customer_id, product_id, quantity, total_amount, status, notes) VALUES (?, ?, ?, ?, ?, ?)',
    [customer_id, product_id, quantity, total_amount, status || 'pending', notes],
    function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.status(201).json({ id: this.lastID, ...sale });
    }
  );
});

// Update sale
router.put('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { customer_id, product_id, quantity, total_amount, status, notes } = req.body;

  db.run(
    'UPDATE sales SET customer_id = ?, product_id = ?, quantity = ?, total_amount = ?, status = ?, notes = ? WHERE id = ?',
    [customer_id, product_id, quantity, total_amount, status, notes, id],
    function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      if (this.changes === 0) {
        res.status(404).json({ error: 'Sale not found' });
        return;
      }
      res.json({ id, ...req.body });
    }
  );
});

// Delete sale
router.delete('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  db.run('DELETE FROM sales WHERE id = ?', [id], function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Sale not found' });
      return;
    }
    res.json({ message: 'Sale deleted successfully' });
  });
});

export default router;
