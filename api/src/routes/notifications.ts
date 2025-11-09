import express, { Request, Response } from 'express';
import { pool as db } from '../database/db';

const router = express.Router();

// IMPORTANT: Routes avec des chemins spécifiques DOIVENT être avant /:id

// Get contextual notification count
router.get('/contextual/count', async (req: Request, res: Response) => {
  try {
    // Compter uniquement les notifications critiques (devis expirés, factures en retard, tâches en retard)
    const [expiredQuotes, overdueInvoices, overdueTasks] = await Promise.all([
      db.query(`SELECT COUNT(*) as count FROM quotes WHERE status = 'sent' AND created_at < NOW() - INTERVAL '30 days'`),
      db.query(`SELECT COUNT(*) as count FROM invoices WHERE status IN ('pending', 'sent') AND due_date < NOW()`),
      db.query(`SELECT COUNT(*) as count FROM tasks WHERE status != 'completed' AND due_date < NOW()`),
    ]);

    const totalCount =
      parseInt(expiredQuotes.rows[0].count) +
      parseInt(overdueInvoices.rows[0].count) +
      parseInt(overdueTasks.rows[0].count);

    res.json({ count: totalCount });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get contextual notifications (système intelligent)
router.get('/contextual', async (req: Request, res: Response) => {
  try {
    const notifications: any[] = [];

    // 1. Devis expirés ou proches de l'expiration (30 jours)
    const expiredQuotesResult = await db.query(`
      SELECT
        q.id,
        q.quote_number,
        q.total_amount,
        q.created_at,
        c.name as customer_name,
        EXTRACT(DAY FROM (NOW() - q.created_at)) as days_old
      FROM quotes q
      LEFT JOIN customers c ON q.customer_id = c.id
      WHERE q.status = 'sent'
        AND q.created_at < NOW() - INTERVAL '25 days'
      ORDER BY q.created_at ASC
      LIMIT 5
    `);

    expiredQuotesResult.rows.forEach((quote: any) => {
      notifications.push({
        id: `quote-expired-${quote.id}`,
        type: 'warning',
        category: 'quote',
        priority: quote.days_old > 30 ? 'high' : 'medium',
        title: quote.days_old > 30 ? 'Devis expiré' : 'Devis bientôt expiré',
        message: `Le devis ${quote.quote_number || 'N/A'} pour ${quote.customer_name || 'Client'} date de ${Math.round(quote.days_old)} jours`,
        action: 'relance',
        data: { quote_id: quote.id, customer_name: quote.customer_name },
        created_at: new Date(),
      });
    });

    // 2. Factures en retard
    const overdueInvoicesResult = await db.query(`
      SELECT
        i.id,
        i.invoice_number,
        i.total_amount,
        i.due_date,
        c.name as customer_name,
        EXTRACT(DAY FROM (NOW() - i.due_date)) as days_overdue
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      WHERE i.status IN ('pending', 'sent')
        AND i.due_date < NOW()
      ORDER BY i.due_date ASC
      LIMIT 5
    `);

    overdueInvoicesResult.rows.forEach((invoice: any) => {
      notifications.push({
        id: `invoice-overdue-${invoice.id}`,
        type: 'danger',
        category: 'invoice',
        priority: 'high',
        title: 'Facture en retard',
        message: `La facture ${invoice.invoice_number || 'N/A'} pour ${invoice.customer_name || 'Client'} est en retard de ${Math.round(invoice.days_overdue)} jours`,
        action: 'relance',
        data: { invoice_id: invoice.id, customer_name: invoice.customer_name, amount: invoice.total_amount },
        created_at: new Date(),
      });
    });

    // 3. Stock faible (simplifié)
    const lowStockResult = await db.query(`
      SELECT id, name, stock
      FROM products
      WHERE stock < 5 AND stock > 0
      ORDER BY stock ASC
      LIMIT 3
    `);

    lowStockResult.rows.forEach((product: any) => {
      notifications.push({
        id: `stock-low-${product.id}`,
        type: 'warning',
        category: 'product',
        priority: product.stock === 1 ? 'high' : 'low',
        title: 'Stock faible',
        message: `Le produit "${product.name}" n'a plus que ${product.stock} unité${product.stock > 1 ? 's' : ''}`,
        action: 'restock',
        data: { product_id: product.id, stock: product.stock },
        created_at: new Date(),
      });
    });

    // Trier par priorité (high, medium, low) puis par date
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    notifications.sort((a, b) => {
      const priorityDiff = (priorityOrder[a.priority as keyof typeof priorityOrder] || 3) -
                          (priorityOrder[b.priority as keyof typeof priorityOrder] || 3);
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    res.json({
      total: notifications.length,
      unread: notifications.length,
      notifications: notifications,
    });
  } catch (err: any) {
    console.error('Error fetching contextual notifications:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get all notifications for a user
router.get('/user/:userId', async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { unreadOnly } = req.query;

  let query = 'SELECT * FROM notifications WHERE user_id = $1';
  const params: any[] = [userId];

  if (unreadOnly === 'true') {
    query += ' AND is_read = 0';
  }

  query += ' ORDER BY id DESC';

  try {
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get unread notifications
router.get('/unread', async (req: Request, res: Response) => {
  try {
    const result = await db.query(`
      SELECT * FROM notifications
      WHERE read = false
      ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get notification by ID
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const result = await db.query('SELECT * FROM notifications WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create notification
router.post('/', async (req: Request, res: Response) => {
  const { user_id, title, message, type, link } = req.body;

  if (!user_id || !title || !message) {
    res.status(400).json({ error: 'user_id, title, and message are required' });
    return;
  }

  const query = `
    INSERT INTO notifications (user_id, title, message, type, link, is_read)
    VALUES ($1, $2, $3, $4, $5, 0)
    RETURNING *
  `;

  try {
    const result = await db.query(query, [user_id, title, message, type || 'info', link]);
    res.status(201).json({ id: result.rows[0].id, message: 'Notification created successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Mark notification as read
router.patch('/:id/read', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const result = await db.query('UPDATE notifications SET is_read = 1 WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }
    res.json({ message: 'Notification marked as read' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Mark all notifications as read for a user
router.patch('/user/:userId/read-all', async (req: Request, res: Response) => {
  const { userId } = req.params;

  try {
    const result = await db.query('UPDATE notifications SET is_read = 1 WHERE user_id = $1', [userId]);
    res.json({ message: `${result.rowCount} notifications marked as read` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete notification
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const result = await db.query('DELETE FROM notifications WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }
    res.json({ message: 'Notification deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get unread count for a user
router.get('/user/:userId/unread-count', async (req: Request, res: Response) => {
  const { userId } = req.params;

  try {
    const result = await db.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND read = false',
      [userId]
    );
    res.json({ count: result.rows[0].count });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


export default router;
