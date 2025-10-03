import express, { Request, Response } from 'express';
import db from '../database/db';

const router = express.Router();

// Get all notifications for a user
router.get('/user/:userId', (req: Request, res: Response) => {
  const { userId } = req.params;
  const { unreadOnly } = req.query;

  let query = 'SELECT * FROM notifications WHERE user_id = ?';
  const params: any[] = [userId];

  if (unreadOnly === 'true') {
    query += ' AND is_read = 0';
  }

  query += ' ORDER BY id DESC';

  db.all(query, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Get notification by ID
router.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;

  db.get('SELECT * FROM notifications WHERE id = ?', [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }
    res.json(row);
  });
});

// Create notification
router.post('/', (req: Request, res: Response) => {
  const { user_id, title, message, type, link } = req.body;

  if (!user_id || !title || !message) {
    res.status(400).json({ error: 'user_id, title, and message are required' });
    return;
  }

  const query = `
    INSERT INTO notifications (user_id, title, message, type, link, is_read)
    VALUES (?, ?, ?, ?, ?, 0)
  `;

  db.run(query, [user_id, title, message, type || 'info', link], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.status(201).json({ id: this.lastID, message: 'Notification created successfully' });
  });
});

// Mark notification as read
router.patch('/:id/read', (req: Request, res: Response) => {
  const { id } = req.params;

  db.run('UPDATE notifications SET is_read = 1 WHERE id = ?', [id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }
    res.json({ message: 'Notification marked as read' });
  });
});

// Mark all notifications as read for a user
router.patch('/user/:userId/read-all', (req: Request, res: Response) => {
  const { userId } = req.params;

  db.run('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [userId], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message: `${this.changes} notifications marked as read` });
  });
});

// Delete notification
router.delete('/:id', (req: Request, res: Response) => {
  const { id } = req.params;

  db.run('DELETE FROM notifications WHERE id = ?', [id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }
    res.json({ message: 'Notification deleted successfully' });
  });
});

// Get unread count for a user
router.get('/user/:userId/unread-count', (req: Request, res: Response) => {
  const { userId } = req.params;

  db.get(
    'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
    [userId],
    (err, row: any) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ count: row.count });
    }
  );
});

export default router;
