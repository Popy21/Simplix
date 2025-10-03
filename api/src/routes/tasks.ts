import express, { Request, Response } from 'express';
import db from '../database/db';

const router = express.Router();

// Get all tasks
router.get('/', (req: Request, res: Response) => {
  const { userId, status, priority } = req.query;

  let query = 'SELECT * FROM tasks WHERE 1=1';
  const params: any[] = [];

  if (userId) {
    query += ' AND assigned_to = ?';
    params.push(userId);
  }

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  if (priority) {
    query += ' AND priority = ?';
    params.push(priority);
  }

  query += ' ORDER BY due_date ASC';

  db.all(query, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Get task by ID
router.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;

  db.get('SELECT * FROM tasks WHERE id = ?', [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    res.json(row);
  });
});

// Create task
router.post('/', (req: Request, res: Response) => {
  const { title, description, assigned_to, customer_id, due_date, priority, status } = req.body;

  if (!title || !assigned_to) {
    res.status(400).json({ error: 'title and assigned_to are required' });
    return;
  }

  const query = `
    INSERT INTO tasks (title, description, assigned_to, customer_id, due_date, priority, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(
    query,
    [title, description, assigned_to, customer_id, due_date, priority || 'medium', status || 'pending'],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.status(201).json({ id: this.lastID, message: 'Task created successfully' });
    }
  );
});

// Update task
router.put('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, description, assigned_to, customer_id, due_date, priority, status } = req.body;

  const query = `
    UPDATE tasks
    SET title = ?, description = ?, assigned_to = ?, customer_id = ?, due_date = ?, priority = ?, status = ?
    WHERE id = ?
  `;

  db.run(
    query,
    [title, description, assigned_to, customer_id, due_date, priority, status, id],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      if (this.changes === 0) {
        res.status(404).json({ error: 'Task not found' });
        return;
      }
      res.json({ message: 'Task updated successfully' });
    }
  );
});

// Update task status
router.patch('/:id/status', (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    res.status(400).json({ error: 'status is required' });
    return;
  }

  db.run('UPDATE tasks SET status = ? WHERE id = ?', [status, id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    res.json({ message: 'Task status updated successfully' });
  });
});

// Delete task
router.delete('/:id', (req: Request, res: Response) => {
  const { id } = req.params;

  db.run('DELETE FROM tasks WHERE id = ?', [id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    res.json({ message: 'Task deleted successfully' });
  });
});

// Get tasks by user
router.get('/user/:userId', (req: Request, res: Response) => {
  const { userId } = req.params;
  const { status } = req.query;

  let query = 'SELECT * FROM tasks WHERE assigned_to = ?';
  const params: any[] = [userId];

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  query += ' ORDER BY due_date ASC';

  db.all(query, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Get overdue tasks
router.get('/overdue/all', (req: Request, res: Response) => {
  const query = `
    SELECT * FROM tasks
    WHERE status != 'completed'
      AND due_date < date('now')
    ORDER BY due_date ASC
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

export default router;
