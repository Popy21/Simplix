import express, { Request, Response } from 'express';
import db from '../database/db';
import { Customer } from '../models/types';

const router = express.Router();

// Get all customers
router.get('/', (req: Request, res: Response) => {
  db.all('SELECT * FROM customers ORDER BY created_at DESC', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Get customer by ID
router.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  db.get('SELECT * FROM customers WHERE id = ?', [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }
    res.json(row);
  });
});

// Create customer
router.post('/', (req: Request, res: Response) => {
  const customer: Customer = req.body;
  const { name, email, phone, company, address } = customer;

  if (!name) {
    res.status(400).json({ error: 'Name is required' });
    return;
  }

  db.run(
    'INSERT INTO customers (name, email, phone, company, address) VALUES (?, ?, ?, ?, ?)',
    [name, email, phone, company, address],
    function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.status(201).json({ id: this.lastID, ...customer });
    }
  );
});

// Update customer
router.put('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, email, phone, company, address } = req.body;

  db.run(
    'UPDATE customers SET name = ?, email = ?, phone = ?, company = ?, address = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [name, email, phone, company, address, id],
    function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      if (this.changes === 0) {
        res.status(404).json({ error: 'Customer not found' });
        return;
      }
      res.json({ id, ...req.body });
    }
  );
});

// Delete customer
router.delete('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  db.run('DELETE FROM customers WHERE id = ?', [id], function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }
    res.json({ message: 'Customer deleted successfully' });
  });
});

export default router;
