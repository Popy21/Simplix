import express, { Request, Response } from 'express';
import { pool as db } from '../database/db';

const router = express.Router();

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
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = 0',
      [userId]
    );
    res.json({ count: result.rows[0].count });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
