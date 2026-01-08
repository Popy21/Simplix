import express, { Request, Response } from 'express';
import { pool as db } from '../database/db';

const router = express.Router();

const clampProbability = (value: number | null | undefined) => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return null;
  }
  return Math.min(100, Math.max(0, value));
};

// ========== PIPELINES ==========

// List all pipelines (or return a default pipeline)
router.get('/', async (req: Request, res: Response) => {
  try {
    // Try to get from pipelines table if it exists, otherwise return default
    const result = await db.query(
      `SELECT DISTINCT pipeline_id as id,
        COALESCE(pipeline_id, 'default') as name
       FROM pipeline_stages
       WHERE pipeline_id IS NOT NULL
       LIMIT 10`
    );

    // If no results, return a default pipeline
    if (result.rows.length === 0) {
      res.json([{ id: 'default', name: 'Pipeline par défaut' }]);
      return;
    }

    res.json(result.rows);
  } catch (err: any) {
    // Return default pipeline on error
    res.json([{ id: 'default', name: 'Pipeline par défaut' }]);
  }
});

// ========== PIPELINE STAGES ==========

// Get all pipeline stages
router.get('/stages', async (req: Request, res: Response) => {
  try {
    const result = await db.query('SELECT * FROM pipeline_stages ORDER BY display_order ASC', []);
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
  const { name, color, display_order, pipeline_id } = req.body;

  if (!name || !pipeline_id) {
    res.status(400).json({ error: 'name and pipeline_id are required' });
    return;
  }

  const query = `
    INSERT INTO pipeline_stages (name, color, display_order, pipeline_id)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `;

  try {
    const result = await db.query(query, [name, color || '#2196F3', display_order || 0, pipeline_id]);
    res.status(201).json({ id: result.rows[0].id, message: 'Stage created successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update pipeline stage
router.put('/stages/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, color, display_order } = req.body;

  const query = `
    UPDATE pipeline_stages
    SET name = $1, color = $2, display_order = $3
    WHERE id = $4
  `;

  try {
    const result = await db.query(query, [name, color, display_order, id]);
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

// ========== OPPORTUNITIES (DEALS) ==========

// Get all opportunities
router.get('/opportunities', async (req: Request, res: Response) => {
  const { stageId, userId, customerId } = req.query;

  let query = `
    SELECT d.*,
           comp.name as customer_name,
           u.full_name as owner_name,
           s.name as stage_name,
           s.color as stage_color,
           d.id, d.title as name, d.value, d.expected_close_date, d.description, d.stage_id, d.company_id as customer_id, d.owner_id as user_id
    FROM deals d
    LEFT JOIN companies comp ON d.company_id = comp.id
    LEFT JOIN users u ON d.owner_id = u.id
    LEFT JOIN pipeline_stages s ON d.stage_id = s.id
    WHERE d.deleted_at IS NULL
  `;
  const params: any[] = [];
  let paramCount = 1;

  if (stageId) {
    query += ` AND d.stage_id = $${paramCount}`;
    params.push(stageId);
    paramCount++;
  }

  if (userId) {
    query += ` AND d.owner_id = $${paramCount}`;
    params.push(userId);
    paramCount++;
  }

  if (customerId) {
    query += ` AND d.company_id = $${paramCount}`;
    params.push(customerId);
    paramCount++;
  }

  query += ' ORDER BY d.expected_close_date ASC';

  try {
    const result = await db.query(query, params);
    // Transform data to match expected format
    const transformedRows = result.rows.map(row => ({
      id: row.id,
      name: row.title || row.name,
      value: parseFloat(row.value) || 0,
      probability: row.probability ?? 0,
      expected_close_date: row.expected_close_date,
      description: row.description,
      stage_id: row.stage_id,
      customer_id: row.company_id,
      customer_name: row.customer_name,
      user_id: row.owner_id,
      owner_name: row.owner_name,
      stage_name: row.stage_name,
      stage_color: row.stage_color
    }));
    res.json(transformedRows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get opportunity by ID
router.get('/opportunities/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  const query = `
    SELECT d.*,
           comp.name as customer_name,
           u.full_name as owner_name,
           s.name as stage_name,
           s.color as stage_color
    FROM deals d
    LEFT JOIN companies comp ON d.company_id = comp.id
    LEFT JOIN users u ON d.owner_id = u.id
    LEFT JOIN pipeline_stages s ON d.stage_id = s.id
    WHERE d.id = $1 AND d.deleted_at IS NULL
  `;

  try {
    const result = await db.query(query, [id]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Opportunity not found' });
      return;
    }
    const row = result.rows[0];
    res.json({
      id: row.id,
      name: row.title,
      value: parseFloat(row.value) || 0,
      probability: row.probability ?? 0,
      expected_close_date: row.expected_close_date,
      description: row.description,
      stage_id: row.stage_id,
      customer_id: row.company_id,
      customer_name: row.customer_name,
      user_id: row.owner_id,
      owner_name: row.owner_name,
      stage_name: row.stage_name,
      stage_color: row.stage_color
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create opportunity
router.post('/opportunities', async (req: Request, res: Response) => {
  const { name, customer_id, user_id, stage_id, value, probability, expected_close_date, description } = req.body;

  if (!name || !user_id || !stage_id) {
    res.status(400).json({ error: 'name, user_id, and stage_id are required' });
    return;
  }

  try {
    // Get organization_id and pipeline_id from stage
    const stageQuery = 'SELECT pipeline_id FROM pipeline_stages WHERE id = $1';
    const stageResult = await db.query(stageQuery, [stage_id]);

    if (stageResult.rows.length === 0) {
      res.status(400).json({ error: 'Invalid stage_id' });
      return;
    }

    const pipeline_id = stageResult.rows[0].pipeline_id;

    // Get organization from user
    const userQuery = 'SELECT organization_id FROM users WHERE id = $1';
    const userResult = await db.query(userQuery, [user_id]);

    if (userResult.rows.length === 0) {
      res.status(400).json({ error: 'Invalid user_id' });
      return;
    }

    const organization_id = userResult.rows[0].organization_id;

    const probabilityValueRaw =
      typeof probability === 'number'
        ? probability
        : probability
        ? parseInt(probability, 10)
        : null;
    const finalProbability = clampProbability(probabilityValueRaw);

    const query = `
      INSERT INTO deals (
        title,
        company_id,
        owner_id,
        stage_id,
        pipeline_id,
        organization_id,
        value,
        probability,
        expected_close_date,
        description,
        created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const result = await db.query(
      query,
      [
        name,
        customer_id || null,
        user_id,
        stage_id,
        pipeline_id,
        organization_id,
        value || 0,
        finalProbability ?? 0,
        expected_close_date,
        description,
        user_id,
      ]
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

  const probabilityProvided = probability !== undefined;
  const probabilityValue =
    typeof probability === 'number'
      ? probability
      : probabilityProvided && probability !== null
      ? parseInt(probability, 10)
      : null;

  const normalizedProbability = clampProbability(probabilityValue);

  const query = `
    UPDATE deals
    SET
      title = $1,
      company_id = $2,
      owner_id = $3,
      stage_id = $4,
      value = $5,
      probability = COALESCE($6, probability),
      expected_close_date = $7,
      description = $8
    WHERE id = $9 AND deleted_at IS NULL
  `;

  try {
    const result = await db.query(
      query,
      [
        name,
        customer_id,
        user_id,
        stage_id,
        value,
        probabilityProvided ? normalizedProbability : null,
        expected_close_date,
        description,
        id,
      ]
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
    const stageExists = await db.query('SELECT id FROM pipeline_stages WHERE id = $1', [stage_id]);
    if (stageExists.rows.length === 0) {
      res.status(404).json({ error: 'Stage not found' });
      return;
    }

    const result = await db.query(
      'UPDATE deals SET stage_id = $1 WHERE id = $2 AND deleted_at IS NULL',
      [stage_id, id]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Opportunity not found' });
      return;
    }
    res.json({ message: 'Opportunity moved to new stage' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete opportunity (soft delete)
router.delete('/opportunities/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const result = await db.query('UPDATE deals SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL', [id]);
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Opportunity not found' });
      return;
    }
    res.json({ message: 'Opportunity deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Recently deleted opportunities (last 30 days)
router.get('/opportunities/deleted/recent', async (req: Request, res: Response) => {
  const { limit } = req.query;

  // normalize query params that can be string | string[] | ParsedQs
  const normalizeQueryParam = (param: any): string | undefined => {
    if (typeof param === 'string') return param;
    if (Array.isArray(param) && param.length > 0 && typeof param[0] === 'string') return param[0];
    return undefined;
  };

  const limitStr = normalizeQueryParam(limit);
  const parsedLimit = limitStr ? parseInt(limitStr, 10) : NaN;
  const limitValue = !Number.isNaN(parsedLimit) && parsedLimit > 0 ? parsedLimit : 20;

  const query = `
    SELECT
      d.*,
      comp.name AS customer_name,
      u.full_name AS owner_name,
      s.name AS stage_name,
      s.color AS stage_color
    FROM deals d
    LEFT JOIN companies comp ON d.company_id = comp.id
    LEFT JOIN users u ON d.owner_id = u.id
    LEFT JOIN pipeline_stages s ON d.stage_id = s.id
    WHERE d.deleted_at IS NOT NULL
      AND d.deleted_at >= NOW() - INTERVAL '30 days'
    ORDER BY d.deleted_at DESC
    LIMIT $1
  `;

  try {
    const result = await db.query(query, [limitValue]);
    const transformedRows = result.rows.map(row => ({
      id: row.id,
      name: row.title || row.name,
      value: parseFloat(row.value) || 0,
      probability: row.probability ?? 0,
      expected_close_date: row.expected_close_date,
      description: row.description,
      stage_id: row.stage_id,
      customer_id: row.company_id,
      customer_name: row.customer_name,
      user_id: row.owner_id,
      owner_name: row.owner_name,
      stage_name: row.stage_name,
      stage_color: row.stage_color,
      deleted_at: row.deleted_at,
    }));
    res.json(transformedRows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Restore deleted opportunity
router.patch('/opportunities/:id/restore', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const result = await db.query(
      'UPDATE deals SET deleted_at = NULL WHERE id = $1 AND deleted_at IS NOT NULL RETURNING *',
      [id]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Deleted opportunity not found' });
      return;
    }
    res.json({ message: 'Opportunity restored successfully', opportunity: result.rows[0] });
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
      COUNT(d.id) as opportunity_count,
      COALESCE(SUM(d.value), 0) as total_value,
      COALESCE(AVG(d.probability), 0) as avg_probability
    FROM pipeline_stages s
    LEFT JOIN deals d ON s.id = d.stage_id AND d.deleted_at IS NULL
    GROUP BY s.id
    ORDER BY s.display_order ASC
  `;

  try {
    const result = await db.query(query, []);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get pipeline overview with stats
router.get('/overview', async (req: Request, res: Response) => {
  try {
    const result = await db.query(`
      SELECT
        p.id,
        p.name,
        p.is_default,
        p.description,
        COUNT(DISTINCT d.id) as deal_count,
        COUNT(DISTINCT d.id) FILTER (WHERE d.status = 'open') as open_deals,
        COUNT(DISTINCT d.id) FILTER (WHERE d.status = 'won') as won_deals,
        COUNT(DISTINCT d.id) FILTER (WHERE d.status = 'lost') as lost_deals,
        COALESCE(SUM(d.value), 0) as total_value,
        COALESCE(SUM(d.value) FILTER (WHERE d.status = 'open'), 0) as open_value,
        COALESCE(SUM(d.value) FILTER (WHERE d.status = 'won'), 0) as won_value,
        COALESCE(AVG(d.probability), 0) as avg_probability,
        COUNT(DISTINCT ps.id) as stage_count,
        p.created_at,
        p.updated_at
      FROM pipelines p
      LEFT JOIN deals d ON d.pipeline_id = p.id AND d.deleted_at IS NULL
      LEFT JOIN pipeline_stages ps ON ps.pipeline_id = p.id
      WHERE p.deleted_at IS NULL
      GROUP BY p.id, p.name, p.is_default, p.description, p.created_at, p.updated_at
      ORDER BY p.created_at DESC
    `);

    res.json(result.rows);
  } catch (err: any) {
    console.error('Error fetching pipeline overview:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
