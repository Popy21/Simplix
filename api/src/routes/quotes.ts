import express, { Request, Response } from 'express';
import { pool as db } from '../database/db';
import { Quote, QuoteItem } from '../models/types';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Get all quotes
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  const query = `
    SELECT
      q.*,
      c.name as customer_name
    FROM quotes q
    LEFT JOIN customers c ON q.customer_id = c.id
    ORDER BY q.created_at DESC
  `;

  try {
    const result = await db.query(query, []);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get quote by ID with items
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const quoteQuery = `
      SELECT
        q.*,
        c.name as customer_name,
        c.email as customer_email,
        c.company as customer_company
      FROM quotes q
      LEFT JOIN customers c ON q.customer_id = c.id
      WHERE q.id = $1
    `;

    const itemsQuery = `
      SELECT qi.*, p.name as product_name
      FROM quote_items qi
      LEFT JOIN products p ON qi.product_id = p.id
      WHERE qi.quote_id = $1
    `;

    const quoteResult = await db.query(quoteQuery, [id]);

    if (quoteResult.rows.length === 0) {
      res.status(404).json({ error: 'Quote not found' });
      return;
    }

    const itemsResult = await db.query(itemsQuery, [id]);
    res.json({ ...quoteResult.rows[0], items: itemsResult.rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create quote with items
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = (req.user as any)?.userId || 1;
    const {
      customer_id,
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

    if (!customer_id || !title || !items || items.length === 0) {
      res.status(400).json({ error: 'customer_id, title, and items are required' });
      return;
    }

    // Calculate totals
    const calculatedSubtotal = items.reduce((sum: number, item: QuoteItem) => sum + item.total_price, 0);
    const calculatedTaxAmount = calculatedSubtotal * (tax_rate || 0);
    const calculatedTotal = calculatedSubtotal + calculatedTaxAmount;

    const quoteResult = await db.query(
      `INSERT INTO quotes (customer_id, user_id, title, description, subtotal, tax_rate, tax_amount, total_amount, status, valid_until)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        customer_id,
        userId,
        title,
        description,
        calculatedSubtotal,
        tax_rate || 0,
        calculatedTaxAmount,
        calculatedTotal,
        status || 'draft',
        valid_until
      ]
    );

    const quoteId = quoteResult.rows[0].id;

    // Insert quote items
    for (const item of items) {
      await db.query(
        'INSERT INTO quote_items (quote_id, product_id, description, quantity, unit_price, total_price) VALUES ($1, $2, $3, $4, $5, $6)',
        [quoteId, item.product_id, item.description, item.quantity, item.unit_price, item.total_price]
      );
    }

    res.status(201).json({
      id: quoteId,
      customer_id,
      user_id: userId,
      title,
      description,
      subtotal: calculatedSubtotal,
      tax_rate: tax_rate || 0,
      tax_amount: calculatedTaxAmount,
      total_amount: calculatedTotal,
      status: status || 'draft',
      items
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update quote
router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
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

    const result = await db.query(
      `UPDATE quotes
       SET title = $1, description = $2, subtotal = $3, tax_rate = $4, tax_amount = $5, total_amount = $6, status = $7, valid_until = $8, updated_at = NOW()
       WHERE id = $9
       RETURNING *`,
      [title, description, calculatedSubtotal, tax_rate, calculatedTaxAmount, calculatedTotal, status, valid_until, id]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Quote not found' });
      return;
    }

    // Update items if provided
    if (items) {
      // Delete existing items
      await db.query('DELETE FROM quote_items WHERE quote_id = $1', [id]);

      // Insert new items
      for (const item of items) {
        await db.query(
          'INSERT INTO quote_items (quote_id, product_id, description, quantity, unit_price, total_price) VALUES ($1, $2, $3, $4, $5, $6)',
          [id, item.product_id, item.description, item.quantity, item.unit_price, item.total_price]
        );
      }
    }

    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete quote
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await db.query('DELETE FROM quotes WHERE id = $1 RETURNING id', [id]);

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Quote not found' });
      return;
    }

    res.json({ message: 'Quote deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update quote status
router.patch('/:id/status', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      res.status(400).json({ error: 'status is required' });
      return;
    }

    const result = await db.query(
      'UPDATE quotes SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, id]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Quote not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Convert quote to invoice
router.post('/:id/convert-to-invoice', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req.user as any)?.userId || 1;

    // Get the quote
    const quoteResult = await db.query('SELECT * FROM quotes WHERE id = $1', [id]);

    if (quoteResult.rows.length === 0) {
      res.status(404).json({ error: 'Quote not found' });
      return;
    }

    const quote = quoteResult.rows[0];

    // Create invoice from quote
    const invoiceResult = await db.query(
      `INSERT INTO invoices (customer_id, user_id, quote_id, invoice_number, title, description, subtotal, tax_rate, tax_amount, total_amount, status, due_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'draft', NOW() + INTERVAL '30 days')
       RETURNING *`,
      [
        quote.customer_id,
        userId,
        quote.id,
        'INV-' + Date.now(),
        quote.title,
        quote.description,
        quote.subtotal,
        quote.tax_rate,
        quote.tax_amount,
        quote.total_amount
      ]
    );

    const invoiceId = invoiceResult.rows[0].id;

    // Copy quote items to invoice items
    const itemsResult = await db.query('SELECT * FROM quote_items WHERE quote_id = $1', [id]);
    for (const item of itemsResult.rows) {
      await db.query(
        'INSERT INTO invoice_items (invoice_id, product_id, description, quantity, unit_price, total_price) VALUES ($1, $2, $3, $4, $5, $6)',
        [invoiceId, item.product_id, item.description, item.quantity, item.unit_price, item.total_price]
      );
    }

    // Update quote status to converted
    await db.query('UPDATE quotes SET status = $1, updated_at = NOW() WHERE id = $2', ['converted', id]);

    res.status(201).json(invoiceResult.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Send quote email
router.post('/:id/send-email', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await db.query('SELECT * FROM quotes WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Quote not found' });
      return;
    }

    // TODO: Implement actual email sending logic here
    // For now, just update the status to 'sent'
    await db.query('UPDATE quotes SET status = $1, updated_at = NOW() WHERE id = $2', ['sent', id]);

    res.json({ message: 'Quote email sent successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
