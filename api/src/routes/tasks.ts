import express, { Request, Response } from 'express';
import { pool as db } from '../database/db';

const router = express.Router();

// Get all tasks
router.get('/', async (req: Request, res: Response) => {
  const { userId, status, priority } = req.query;

  let query = 'SELECT * FROM tasks WHERE 1=1';
  const params: any[] = [];
  let paramCount = 1;

  if (userId) {
    query += ` AND assigned_to = $${paramCount++}`;
    params.push(userId);
  }

  if (status) {
    query += ` AND status = $${paramCount++}`;
    params.push(status);
  }

  if (priority) {
    query += ` AND priority = $${paramCount++}`;
    params.push(priority);
  }

  query += ' ORDER BY due_date ASC';

  try {
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get task by ID
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const result = await db.query('SELECT * FROM tasks WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create task
router.post('/', async (req: Request, res: Response) => {
  const { title, description, assigned_to, customer_id, due_date, priority, status } = req.body;

  if (!title || !assigned_to) {
    res.status(400).json({ error: 'title and assigned_to are required' });
    return;
  }

  const query = `
    INSERT INTO tasks (title, description, assigned_to, customer_id, due_date, priority, status)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `;

  try {
    const result = await db.query(
      query,
      [title, description, assigned_to, customer_id, due_date, priority || 'medium', status || 'pending']
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update task
router.put('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, description, assigned_to, customer_id, due_date, priority, status } = req.body;

  const query = `
    UPDATE tasks
    SET title = $1, description = $2, assigned_to = $3, customer_id = $4, due_date = $5, priority = $6, status = $7
    WHERE id = $8
    RETURNING *
  `;

  try {
    const result = await db.query(
      query,
      [title, description, assigned_to, customer_id, due_date, priority, status, id]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update task status
router.patch('/:id/status', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    res.status(400).json({ error: 'status is required' });
    return;
  }

  try {
    const result = await db.query('UPDATE tasks SET status = $1 WHERE id = $2 RETURNING *', [status, id]);
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete task
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const result = await db.query('DELETE FROM tasks WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    res.json({ message: 'Task deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get tasks by user
router.get('/user/:userId', async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { status } = req.query;

  let query = 'SELECT * FROM tasks WHERE assigned_to = $1';
  const params: any[] = [userId];

  if (status) {
    query += ' AND status = $2';
    params.push(status);
  }

  query += ' ORDER BY due_date ASC';

  try {
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get overdue tasks
router.get('/overdue/all', async (req: Request, res: Response) => {
  const query = `
    SELECT * FROM tasks
    WHERE status != 'completed'
      AND due_date < CURRENT_DATE
    ORDER BY due_date ASC
  `;

  try {
    const result = await db.query(query);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
