import express, { Request, Response } from 'express';
import db from '../database/db';

const router = express.Router();

// Bulk create customers
router.post('/customers', (req: Request, res: Response) => {
  const { customers } = req.body;

  if (!customers || !Array.isArray(customers) || customers.length === 0) {
    res.status(400).json({ error: 'customers array is required and must not be empty' });
    return;
  }

  const insertPromises = customers.map((customer) => {
    return new Promise((resolve, reject) => {
      const { name, email, phone, company, address } = customer;

      if (!name || !email) {
        reject(new Error('Each customer must have name and email'));
        return;
      }

      db.run(
        'INSERT INTO customers (name, email, phone, company, address) VALUES (?, ?, ?, ?, ?)',
        [name, email, phone, company, address],
        function (err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, ...customer });
        }
      );
    });
  });

  Promise.all(insertPromises)
    .then((results) => {
      res.status(201).json({
        message: `${results.length} customers created successfully`,
        customers: results,
      });
    })
    .catch((error) => {
      res.status(500).json({ error: error.message || 'Failed to create customers' });
    });
});

// Bulk create products
router.post('/products', (req: Request, res: Response) => {
  const { products } = req.body;

  if (!products || !Array.isArray(products) || products.length === 0) {
    res.status(400).json({ error: 'products array is required and must not be empty' });
    return;
  }

  const insertPromises = products.map((product) => {
    return new Promise((resolve, reject) => {
      const { name, description, price, stock } = product;

      if (!name || price === undefined) {
        reject(new Error('Each product must have name and price'));
        return;
      }

      db.run(
        'INSERT INTO products (name, description, price, stock) VALUES (?, ?, ?, ?)',
        [name, description, price, stock || 0],
        function (err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, ...product });
        }
      );
    });
  });

  Promise.all(insertPromises)
    .then((results) => {
      res.status(201).json({
        message: `${results.length} products created successfully`,
        products: results,
      });
    })
    .catch((error) => {
      res.status(500).json({ error: error.message || 'Failed to create products' });
    });
});

// Bulk delete customers
router.delete('/customers', (req: Request, res: Response) => {
  const { ids } = req.body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ error: 'ids array is required and must not be empty' });
    return;
  }

  const placeholders = ids.map(() => '?').join(',');
  const query = `DELETE FROM customers WHERE id IN (${placeholders})`;

  db.run(query, ids, function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    res.json({
      message: `${this.changes} customers deleted successfully`,
      deletedCount: this.changes,
    });
  });
});

// Bulk delete products
router.delete('/products', (req: Request, res: Response) => {
  const { ids } = req.body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ error: 'ids array is required and must not be empty' });
    return;
  }

  const placeholders = ids.map(() => '?').join(',');
  const query = `DELETE FROM products WHERE id IN (${placeholders})`;

  db.run(query, ids, function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    res.json({
      message: `${this.changes} products deleted successfully`,
      deletedCount: this.changes,
    });
  });
});

// Bulk delete sales
router.delete('/sales', (req: Request, res: Response) => {
  const { ids } = req.body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ error: 'ids array is required and must not be empty' });
    return;
  }

  const placeholders = ids.map(() => '?').join(',');
  const query = `DELETE FROM sales WHERE id IN (${placeholders})`;

  db.run(query, ids, function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    res.json({
      message: `${this.changes} sales deleted successfully`,
      deletedCount: this.changes,
    });
  });
});

// Bulk update product stock
router.patch('/products/stock', (req: Request, res: Response) => {
  const { updates } = req.body;

  if (!updates || !Array.isArray(updates) || updates.length === 0) {
    res.status(400).json({ error: 'updates array is required and must not be empty' });
    return;
  }

  const updatePromises = updates.map((update: { id: number; stock: number }) => {
    return new Promise((resolve, reject) => {
      const { id, stock } = update;

      if (id === undefined || stock === undefined) {
        reject(new Error('Each update must have id and stock'));
        return;
      }

      db.run(
        'UPDATE products SET stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [stock, id],
        function (err) {
          if (err) reject(err);
          else resolve({ id, stock, changes: this.changes });
        }
      );
    });
  });

  Promise.all(updatePromises)
    .then((results) => {
      res.json({
        message: `${results.length} products updated successfully`,
        updates: results,
      });
    })
    .catch((error) => {
      res.status(500).json({ error: error.message || 'Failed to update products' });
    });
});

// Bulk update sales status
router.patch('/sales/status', (req: Request, res: Response) => {
  const { ids, status } = req.body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ error: 'ids array is required and must not be empty' });
    return;
  }

  if (!status) {
    res.status(400).json({ error: 'status is required' });
    return;
  }

  const placeholders = ids.map(() => '?').join(',');
  const query = `UPDATE sales SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`;

  db.run(query, [status, ...ids], function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    res.json({
      message: `${this.changes} sales updated successfully`,
      updatedCount: this.changes,
    });
  });
});

// Bulk update quotes status
router.patch('/quotes/status', (req: Request, res: Response) => {
  const { ids, status } = req.body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ error: 'ids array is required and must not be empty' });
    return;
  }

  if (!status) {
    res.status(400).json({ error: 'status is required' });
    return;
  }

  const placeholders = ids.map(() => '?').join(',');
  const query = `UPDATE quotes SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`;

  db.run(query, [status, ...ids], function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    res.json({
      message: `${this.changes} quotes updated successfully`,
      updatedCount: this.changes,
    });
  });
});

export default router;
