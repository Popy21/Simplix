import express, { Request, Response } from 'express';
import { pool as db } from '../database/db';

const router = express.Router();

// Get all tasks
router.get('/', async (req: Request, res: Response) => {
  const { userId, status, priority } = req.query;

  let query = 'SELECT * FROM tasks WHERE deleted_at IS NULL';
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

// Get today's tasks
router.get('/today', async (req: Request, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const result = await db.query(
      `SELECT t.*,
              u.first_name || ' ' || u.last_name as assigned_to_name
       FROM tasks t
       LEFT JOIN users u ON t.assigned_to = u.id
       WHERE t.deleted_at IS NULL
       AND t.due_date >= $1
       AND t.due_date < $2
       ORDER BY t.due_date ASC, t.priority DESC`,
      [today, tomorrow]
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get overdue tasks
router.get('/overdue', async (req: Request, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await db.query(
      `SELECT t.*,
              u.first_name || ' ' || u.last_name as assigned_to_name
       FROM tasks t
       LEFT JOIN users u ON t.assigned_to = u.id
       WHERE t.deleted_at IS NULL
       AND t.due_date < $1
       AND t.status NOT IN ('done', 'completed')
       ORDER BY t.due_date ASC`,
      [today]
    );
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
  const { title, description, assigned_to, company_id, contact_id, due_date, priority, status } = req.body;

  if (!title || !assigned_to) {
    res.status(400).json({ error: 'title and assigned_to are required' });
    return;
  }

  try {
    // Get organization_id from the assigned user
    const userResult = await db.query('SELECT organization_id FROM users WHERE id = $1', [assigned_to]);
    if (userResult.rows.length === 0) {
      res.status(400).json({ error: 'Invalid assigned_to user ID' });
      return;
    }
    const organization_id = userResult.rows[0].organization_id;

    const query = `
      INSERT INTO tasks (title, description, assigned_to, company_id, contact_id, due_date, priority, status, organization_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const result = await db.query(
      query,
      [title, description, assigned_to, company_id, contact_id, due_date, priority || 'medium', status || 'todo', organization_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update task
router.put('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, description, assigned_to, company_id, due_date, priority, status } = req.body;

  const query = `
    UPDATE tasks
    SET title = $1, description = $2, assigned_to = $3, company_id = $4, due_date = $5, priority = $6, status = $7
    WHERE id = $8 AND deleted_at IS NULL
    RETURNING *
  `;

  try {
    const result = await db.query(
      query,
      [title, description, assigned_to, company_id, due_date, priority, status, id]
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
    const result = await db.query('UPDATE tasks SET status = $1 WHERE id = $2 AND deleted_at IS NULL RETURNING *', [status, id]);
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete task (soft delete)
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const result = await db.query('UPDATE tasks SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL', [id]);
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

  let query = 'SELECT * FROM tasks WHERE assigned_to = $1 AND deleted_at IS NULL';
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
      AND deleted_at IS NULL
    ORDER BY due_date ASC
  `;

  try {
    const result = await db.query(query);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Recently deleted tasks (last 30 days)
router.get('/deleted/recent', async (req: Request, res: Response) => {
  const { limit } = req.query;
  const limitValue = limit ? parseInt(limit as string, 10) : 20;

  const query = `
    SELECT * FROM tasks
    WHERE deleted_at IS NOT NULL
      AND deleted_at >= NOW() - INTERVAL '30 days'
    ORDER BY deleted_at DESC
    LIMIT $1
  `;

  try {
    const result = await db.query(query, [limitValue]);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Restore deleted task
router.patch('/:id/restore', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const result = await db.query(
      'UPDATE tasks SET deleted_at = NULL WHERE id = $1 AND deleted_at IS NOT NULL RETURNING *',
      [id]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Deleted task not found' });
      return;
    }
    res.json({ message: 'Task restored successfully', task: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
