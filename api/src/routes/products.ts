import express, { Request, Response } from 'express';
import db from '../database/db';
import { Product } from '../models/types';

const router = express.Router();

// Get all products
router.get('/', (req: Request, res: Response) => {
  db.all('SELECT * FROM products ORDER BY created_at DESC', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Get product by ID
router.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  db.get('SELECT * FROM products WHERE id = ?', [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }
    res.json(row);
  });
});

// Create product
router.post('/', (req: Request, res: Response) => {
  const product: Product = req.body;
  const { name, description, price, stock } = product;

  if (!name || price === undefined) {
    res.status(400).json({ error: 'Name and price are required' });
    return;
  }

  db.run(
    'INSERT INTO products (name, description, price, stock) VALUES (?, ?, ?, ?)',
    [name, description, price, stock || 0],
    function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.status(201).json({ id: this.lastID, ...product });
    }
  );
});

// Update product
router.put('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, description, price, stock } = req.body;

  db.run(
    'UPDATE products SET name = ?, description = ?, price = ?, stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [name, description, price, stock, id],
    function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      if (this.changes === 0) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }
      res.json({ id, ...req.body });
    }
  );
});

// Delete product
router.delete('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  db.run('DELETE FROM products WHERE id = ?', [id], function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }
    res.json({ message: 'Product deleted successfully' });
  });
});

export default router;
