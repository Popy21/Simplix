import express, { Request, Response } from 'express';
import { pool as db } from '../database/db';

const router = express.Router();

// ========== PIPELINE STAGES ==========

// Get all pipeline stages
router.get('/stages', async (req: Request, res: Response) => {
  try {
    const result = await db.query('SELECT * FROM pipeline_stages ORDER BY position ASC', []);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get stage by ID
router.get('/stages/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const result = await db.query('SELECT * FROM pipeline_stages WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Stage not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create pipeline stage
router.post('/stages', async (req: Request, res: Response) => {
  const { name, color, position } = req.body;

  if (!name) {
    res.status(400).json({ error: 'name is required' });
    return;
  }

  const query = `
    INSERT INTO pipeline_stages (name, color, position)
    VALUES ($1, $2, $3)
    RETURNING *
  `;

  try {
    const result = await db.query(query, [name, color || '#2196F3', position || 0]);
    res.status(201).json({ id: result.rows[0].id, message: 'Stage created successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update pipeline stage
router.put('/stages/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, color, position } = req.body;

  const query = `
    UPDATE pipeline_stages
    SET name = $1, color = $2, position = $3
    WHERE id = $4
  `;

  try {
    const result = await db.query(query, [name, color, position, id]);
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Stage not found' });
      return;
    }
    res.json({ message: 'Stage updated successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete pipeline stage
router.delete('/stages/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const result = await db.query('DELETE FROM pipeline_stages WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Stage not found' });
      return;
    }
    res.json({ message: 'Stage deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ========== OPPORTUNITIES ==========

// Get all opportunities
router.get('/opportunities', async (req: Request, res: Response) => {
  const { stageId, userId, customerId } = req.query;

  let query = `
    SELECT o.*, c.name as customer_name, c.email as customer_email,
           u.name as owner_name, s.name as stage_name, s.color as stage_color
    FROM opportunities o
    LEFT JOIN customers c ON o.customer_id = c.id
    LEFT JOIN users u ON o.user_id = u.id
    LEFT JOIN pipeline_stages s ON o.stage_id = s.id
    WHERE 1=1
  `;
  const params: any[] = [];
  let paramCount = 1;

  if (stageId) {
    query += ` AND o.stage_id = $${paramCount}`;
    params.push(stageId);
    paramCount++;
  }

  if (userId) {
    query += ` AND o.user_id = $${paramCount}`;
    params.push(userId);
    paramCount++;
  }

  if (customerId) {
    query += ` AND o.customer_id = $${paramCount}`;
    params.push(customerId);
    paramCount++;
  }

  query += ' ORDER BY o.expected_close_date ASC';

  try {
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get opportunity by ID
router.get('/opportunities/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  const query = `
    SELECT o.*, c.name as customer_name, c.email as customer_email,
           u.name as owner_name, s.name as stage_name, s.color as stage_color
    FROM opportunities o
    LEFT JOIN customers c ON o.customer_id = c.id
    LEFT JOIN users u ON o.user_id = u.id
    LEFT JOIN pipeline_stages s ON o.stage_id = s.id
    WHERE o.id = $1
  `;

  try {
    const result = await db.query(query, [id]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Opportunity not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create opportunity
router.post('/opportunities', async (req: Request, res: Response) => {
  const { name, customer_id, user_id, stage_id, value, probability, expected_close_date, description } = req.body;

  if (!name || !customer_id || !user_id || !stage_id) {
    res.status(400).json({ error: 'name, customer_id, user_id, and stage_id are required' });
    return;
  }

  const query = `
    INSERT INTO opportunities (name, customer_id, user_id, stage_id, value, probability, expected_close_date, description)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `;

  try {
    const result = await db.query(
      query,
      [name, customer_id, user_id, stage_id, value || 0, probability || 50, expected_close_date, description]
    );
    res.status(201).json({ id: result.rows[0].id, message: 'Opportunity created successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update opportunity
router.put('/opportunities/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, customer_id, user_id, stage_id, value, probability, expected_close_date, description } = req.body;

  const query = `
    UPDATE opportunities
    SET name = $1, customer_id = $2, user_id = $3, stage_id = $4, value = $5, probability = $6, expected_close_date = $7, description = $8
    WHERE id = $9
  `;

  try {
    const result = await db.query(
      query,
      [name, customer_id, user_id, stage_id, value, probability, expected_close_date, description, id]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Opportunity not found' });
      return;
    }
    res.json({ message: 'Opportunity updated successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Move opportunity to different stage
router.patch('/opportunities/:id/stage', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { stage_id } = req.body;

  if (!stage_id) {
    res.status(400).json({ error: 'stage_id is required' });
    return;
  }

  try {
    const result = await db.query('UPDATE opportunities SET stage_id = $1 WHERE id = $2', [stage_id, id]);
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Opportunity not found' });
      return;
    }
    res.json({ message: 'Opportunity moved to new stage' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete opportunity
router.delete('/opportunities/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const result = await db.query('DELETE FROM opportunities WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Opportunity not found' });
      return;
    }
    res.json({ message: 'Opportunity deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get pipeline summary
router.get('/summary', async (req: Request, res: Response) => {
  const query = `
    SELECT
      s.id as stage_id,
      s.name as stage_name,
      s.color as stage_color,
      COUNT(o.id) as opportunity_count,
      COALESCE(SUM(o.value), 0) as total_value,
      COALESCE(AVG(o.probability), 0) as avg_probability
    FROM pipeline_stages s
    LEFT JOIN opportunities o ON s.id = o.stage_id
    GROUP BY s.id
    ORDER BY s.position ASC
  `;

  try {
    const result = await db.query(query, []);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
