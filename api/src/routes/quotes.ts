import express, { Request, Response } from 'express';
import db from '../database/db';
import { Quote, QuoteItem } from '../models/types';

const router = express.Router();

// Get all quotes
router.get('/', (req: Request, res: Response) => {
  const query = `
    SELECT
      q.*,
      c.name as customer_name,
      u.name as user_name
    FROM quotes q
    LEFT JOIN customers c ON q.customer_id = c.id
    LEFT JOIN users u ON q.user_id = u.id
    ORDER BY q.created_at DESC
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Get quote by ID with items
router.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;

  const quoteQuery = `
    SELECT
      q.*,
      c.name as customer_name,
      c.email as customer_email,
      c.company as customer_company,
      u.name as user_name
    FROM quotes q
    LEFT JOIN customers c ON q.customer_id = c.id
    LEFT JOIN users u ON q.user_id = u.id
    WHERE q.id = ?
  `;

  const itemsQuery = `
    SELECT qi.*, p.name as product_name
    FROM quote_items qi
    LEFT JOIN products p ON qi.product_id = p.id
    WHERE qi.quote_id = ?
  `;

  db.get(quoteQuery, [id], (err, quote) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    if (!quote) {
      res.status(404).json({ error: 'Quote not found' });
      return;
    }

    db.all(itemsQuery, [id], (err, items) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }

      res.json({ ...quote, items });
    });
  });
});

// Create quote with items
router.post('/', (req: Request, res: Response) => {
  const {
    customer_id,
    user_id,
    title,
    description,
    items,
    subtotal,
    tax_rate,
    tax_amount,
    total_amount,
    status,
    valid_until
  } = req.body;

  if (!customer_id || !user_id || !title || !items || items.length === 0) {
    res.status(400).json({ error: 'customer_id, user_id, title, and items are required' });
    return;
  }

  // Calculate totals
  const calculatedSubtotal = items.reduce((sum: number, item: QuoteItem) => sum + item.total_price, 0);
  const calculatedTaxAmount = calculatedSubtotal * (tax_rate || 0);
  const calculatedTotal = calculatedSubtotal + calculatedTaxAmount;

  db.run(
    `INSERT INTO quotes (customer_id, user_id, title, description, subtotal, tax_rate, tax_amount, total_amount, status, valid_until)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      customer_id,
      user_id,
      title,
      description,
      calculatedSubtotal,
      tax_rate || 0,
      calculatedTaxAmount,
      calculatedTotal,
      status || 'draft',
      valid_until
    ],
    function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }

      const quoteId = this.lastID;

      // Insert quote items
      const itemInserts = items.map((item: QuoteItem) => {
        return new Promise((resolve, reject) => {
          db.run(
            'INSERT INTO quote_items (quote_id, product_id, description, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?, ?)',
            [quoteId, item.product_id, item.description, item.quantity, item.unit_price, item.total_price],
            function (err) {
              if (err) reject(err);
              else resolve(this.lastID);
            }
          );
        });
      });

      Promise.all(itemInserts)
        .then(() => {
          res.status(201).json({
            id: quoteId,
            customer_id,
            user_id,
            title,
            description,
            subtotal: calculatedSubtotal,
            tax_rate: tax_rate || 0,
            tax_amount: calculatedTaxAmount,
            total_amount: calculatedTotal,
            status: status || 'draft',
            items
          });
        })
        .catch((error) => {
          res.status(500).json({ error: 'Failed to create quote items' });
        });
    }
  );
});

// Update quote
router.put('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    title,
    description,
    items,
    subtotal,
    tax_rate,
    tax_amount,
    total_amount,
    status,
    valid_until
  } = req.body;

  // If items are provided, recalculate totals
  let calculatedSubtotal = subtotal;
  let calculatedTaxAmount = tax_amount;
  let calculatedTotal = total_amount;

  if (items) {
    calculatedSubtotal = items.reduce((sum: number, item: QuoteItem) => sum + item.total_price, 0);
    calculatedTaxAmount = calculatedSubtotal * (tax_rate || 0);
    calculatedTotal = calculatedSubtotal + calculatedTaxAmount;
  }

  db.run(
    `UPDATE quotes
     SET title = ?, description = ?, subtotal = ?, tax_rate = ?, tax_amount = ?, total_amount = ?, status = ?, valid_until = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [title, description, calculatedSubtotal, tax_rate, calculatedTaxAmount, calculatedTotal, status, valid_until, id],
    function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }

      if (this.changes === 0) {
        res.status(404).json({ error: 'Quote not found' });
        return;
      }

      // Update items if provided
      if (items) {
        // Delete existing items
        db.run('DELETE FROM quote_items WHERE quote_id = ?', [id], (err) => {
          if (err) {
            res.status(500).json({ error: 'Failed to update quote items' });
            return;
          }

          // Insert new items
          const itemInserts = items.map((item: QuoteItem) => {
            return new Promise((resolve, reject) => {
              db.run(
                'INSERT INTO quote_items (quote_id, product_id, description, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?, ?)',
                [id, item.product_id, item.description, item.quantity, item.unit_price, item.total_price],
                function (err) {
                  if (err) reject(err);
                  else resolve(this.lastID);
                }
              );
            });
          });

          Promise.all(itemInserts)
            .then(() => {
              res.json({ id, ...req.body });
            })
            .catch((error) => {
              res.status(500).json({ error: 'Failed to update quote items' });
            });
        });
      } else {
        res.json({ id, ...req.body });
      }
    }
  );
});

// Delete quote
router.delete('/:id', (req: Request, res: Response) => {
  const { id } = req.params;

  db.run('DELETE FROM quotes WHERE id = ?', [id], function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    if (this.changes === 0) {
      res.status(404).json({ error: 'Quote not found' });
      return;
    }

    res.json({ message: 'Quote deleted successfully' });
  });
});

// Update quote status
router.patch('/:id/status', (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    res.status(400).json({ error: 'status is required' });
    return;
  }

  db.run(
    'UPDATE quotes SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [status, id],
    function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }

      if (this.changes === 0) {
        res.status(404).json({ error: 'Quote not found' });
        return;
      }

      res.json({ id, status });
    }
  );
});

export default router;
