import express, { Response } from 'express';
import { pool as db } from '../database/db';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requireOrganization } from '../middleware/multiTenancy';
import { getOrgIdFromRequest } from '../utils/multiTenancyHelper';

const router = express.Router();

// ========== DEALS (OPPORTUNITIES) ROUTES ==========

/**
 * GET /api/deals
 * Récupérer toutes les opportunités avec filtres
 */
router.get('/', 
  authenticateToken, 
  requireOrganization, 
  async (req: AuthRequest, res: Response) => {
  try {
    const { pipeline_id, stage_id, status, owner_id, min_value, max_value, search } = req.query;
    const orgId = getOrgIdFromRequest(req);

    let query = `
      SELECT
        d.*,
        c.full_name as contact_name,
        c.email as contact_email,
        co.name as company_name,
        p.name as pipeline_name,
        ps.name as stage_name,
        u.first_name || ' ' || u.last_name as owner_name
      FROM deals d
      LEFT JOIN contacts c ON d.contact_id = c.id
      LEFT JOIN companies co ON d.company_id = co.id
      LEFT JOIN pipelines p ON d.pipeline_id = p.id
      LEFT JOIN pipeline_stages ps ON d.stage_id = ps.id
      LEFT JOIN users u ON d.owner_id = u.id
      WHERE d.organization_id = $1 AND d.deleted_at IS NULL
    `;

    const params: any[] = [orgId];
    let paramCount = 2;

    if (pipeline_id) {
      query += ` AND d.pipeline_id = $${paramCount}`;
      params.push(pipeline_id);
      paramCount++;
    }

    if (stage_id) {
      query += ` AND d.stage_id = $${paramCount}`;
      params.push(stage_id);
      paramCount++;
    }

    if (status) {
      query += ` AND d.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (owner_id) {
      query += ` AND d.owner_id = $${paramCount}`;
      params.push(owner_id);
      paramCount++;
    }

    if (min_value) {
      query += ` AND d.value >= $${paramCount}`;
      params.push(parseFloat(min_value as string));
      paramCount++;
    }

    if (max_value) {
      query += ` AND d.value <= $${paramCount}`;
      params.push(parseFloat(max_value as string));
      paramCount++;
    }

    if (search) {
      query += ` AND (d.title ILIKE $${paramCount} OR d.description ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    query += ` ORDER BY d.expected_close_date ASC, d.created_at DESC`;

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err: any) {
    console.error('Error fetching deals:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/deals/won
 * Récupérer tous les deals gagnés
 */
router.get('/won',
  authenticateToken,
  requireOrganization,
  async (req: AuthRequest, res: Response) => {
  try {
    const orgId = getOrgIdFromRequest(req);
    const { limit = 50, offset = 0 } = req.query;

    const result = await db.query(
      `SELECT
        d.*,
        c.full_name as contact_name,
        co.name as company_name,
        p.name as pipeline_name,
        ps.name as stage_name,
        u.first_name || ' ' || u.last_name as owner_name
      FROM deals d
      LEFT JOIN contacts c ON d.contact_id = c.id
      LEFT JOIN companies co ON d.company_id = co.id
      LEFT JOIN pipelines p ON d.pipeline_id = p.id
      LEFT JOIN pipeline_stages ps ON d.stage_id = ps.id
      LEFT JOIN users u ON d.owner_id = u.id
      WHERE d.status = 'won' AND d.organization_id = $1 AND d.deleted_at IS NULL
      ORDER BY d.won_at DESC, d.actual_close_date DESC
      LIMIT $2 OFFSET $3`,
      [orgId, parseInt(limit as string), parseInt(offset as string)]
    );

    res.json(result.rows);
  } catch (err: any) {
    console.error('Error fetching won deals:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/deals/conversion-rate
 * Calculer le taux de conversion des deals
 */
router.get('/conversion-rate',
  authenticateToken,
  requireOrganization,
  async (req: AuthRequest, res: Response) => {
  try {
    const orgId = getOrgIdFromRequest(req);

    const result = await db.query(
      `SELECT
        COUNT(*) as total_deals,
        COUNT(*) FILTER (WHERE status = 'won') as won_deals,
        COUNT(*) FILTER (WHERE status = 'lost') as lost_deals,
        COUNT(*) FILTER (WHERE status IN ('won', 'lost')) as closed_deals,
        COALESCE(SUM(value), 0) as total_value,
        COALESCE(SUM(value) FILTER (WHERE status = 'won'), 0) as won_value,
        COALESCE(SUM(value) FILTER (WHERE status = 'lost'), 0) as lost_value,
        ROUND(
          (COUNT(*) FILTER (WHERE status = 'won')::numeric /
           NULLIF(COUNT(*) FILTER (WHERE status IN ('won', 'lost')), 0)) * 100,
          2
        ) as conversion_rate_percent,
        ROUND(
          (SUM(value) FILTER (WHERE status = 'won')::numeric /
           NULLIF(SUM(value) FILTER (WHERE status IN ('won', 'lost')), 0)) * 100,
          2
        ) as value_conversion_rate_percent,
        AVG(EXTRACT(DAY FROM (actual_close_date - created_at::date))) FILTER (WHERE status = 'won') as avg_days_to_win
      FROM deals
      WHERE organization_id = $1 AND deleted_at IS NULL`,
      [orgId]
    );

    res.json(result.rows[0]);
  } catch (err: any) {
    console.error('Error calculating conversion rate:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/deals/stats
 * Alias pour stats/summary (pour compatibilité)
 */
router.get('/stats',
  authenticateToken,
  requireOrganization,
  async (req: AuthRequest, res: Response) => {
  try {
    const orgId = getOrgIdFromRequest(req);

    const result = await db.query(
      `SELECT
        COUNT(*) as total_deals,
        COUNT(*) FILTER (WHERE status = 'open') as open_deals,
        COUNT(*) FILTER (WHERE status = 'won') as won_deals,
        COUNT(*) FILTER (WHERE status = 'lost') as lost_deals,
        COALESCE(SUM(value), 0) as total_value,
        COALESCE(SUM(value) FILTER (WHERE status = 'open'), 0) as open_value,
        COALESCE(SUM(value) FILTER (WHERE status = 'won'), 0) as won_value,
        AVG(probability) as avg_probability
      FROM deals
      WHERE organization_id = $1 AND deleted_at IS NULL`,
      [orgId]
    );

    res.json(result.rows[0]);
  } catch (err: any) {
    console.error('Error fetching deal stats:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/deals/by-pipeline/:pipelineId
 * Récupérer tous les deals d'un pipeline spécifique
 */
router.get('/by-pipeline/:pipelineId',
  authenticateToken,
  requireOrganization,
  async (req: AuthRequest, res: Response) => {
  try {
    const { pipelineId } = req.params;
    const orgId = getOrgIdFromRequest(req);

    const result = await db.query(
      `SELECT
        d.*,
        c.full_name as contact_name,
        co.name as company_name,
        ps.name as stage_name,
        u.first_name || ' ' || u.last_name as owner_name,
        COUNT(*) OVER() as total_count,
        SUM(d.value) OVER() as pipeline_total_value
      FROM deals d
      LEFT JOIN contacts c ON d.contact_id = c.id
      LEFT JOIN companies co ON d.company_id = co.id
      LEFT JOIN pipeline_stages ps ON d.stage_id = ps.id
      LEFT JOIN users u ON d.owner_id = u.id
      WHERE d.pipeline_id = $1 AND d.organization_id = $2 AND d.deleted_at IS NULL
      ORDER BY ps.display_order ASC, d.created_at DESC`,
      [pipelineId, orgId]
    );

    res.json(result.rows);
  } catch (err: any) {
    console.error('Error fetching deals by pipeline:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/deals/:id
 * Récupérer une opportunité complète avec détails
 */
router.get('/:id', 
  authenticateToken, 
  requireOrganization, 
  async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const orgId = getOrgIdFromRequest(req);

    const result = await db.query(
      `SELECT
        d.*,
        c.full_name as contact_name,
        c.email as contact_email,
        co.name as company_name,
        p.name as pipeline_name,
        ps.name as stage_name,
        u.first_name || ' ' || u.last_name as owner_name
      FROM deals d
      LEFT JOIN contacts c ON d.contact_id = c.id
      LEFT JOIN companies co ON d.company_id = co.id
      LEFT JOIN pipelines p ON d.pipeline_id = p.id
      LEFT JOIN pipeline_stages ps ON d.stage_id = ps.id
      LEFT JOIN users u ON d.owner_id = u.id
      WHERE d.id = $1 AND d.organization_id = $2 AND d.deleted_at IS NULL`,
      [id, orgId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Deal not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err: any) {
    console.error('Error fetching deal:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/deals/by-stage/:stageId
 * Récupérer toutes les opportunités par étape de pipeline
 */
router.get('/by-stage/:stageId', 
  authenticateToken, 
  requireOrganization, 
  async (req: AuthRequest, res: Response) => {
  try {
    const { stageId } = req.params;
    const orgId = getOrgIdFromRequest(req);

    const result = await db.query(
      `SELECT
        d.*,
        c.full_name as contact_name,
        co.name as company_name,
        u.first_name || ' ' || u.last_name as owner_name,
        COUNT(*) OVER() as total_count,
        SUM(d.value) OVER() as stage_total_value
      FROM deals d
      LEFT JOIN contacts c ON d.contact_id = c.id
      LEFT JOIN companies co ON d.company_id = co.id
      LEFT JOIN users u ON d.owner_id = u.id
      WHERE d.stage_id = $1 AND d.organization_id = $2 AND d.deleted_at IS NULL
      ORDER BY d.display_order ASC, d.created_at DESC`,
      [stageId, orgId]
    );

    res.json(result.rows);
  } catch (err: any) {
    console.error('Error fetching deals by stage:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/deals
 * Créer une nouvelle opportunité
 */
router.post('/', 
  authenticateToken, 
  requireOrganization, 
  async (req: AuthRequest, res: Response) => {
  try {
    const {
      title,
      description,
      pipeline_id,
      stage_id,
      contact_id,
      company_id,
      value,
      probability,
      close_date,
      owner_id,
      status = 'open',
    } = req.body;

    const orgId = getOrgIdFromRequest(req);
    const userId = req.user?.id;

    if (!title || !pipeline_id || !stage_id) {
      res.status(400).json({ error: 'title, pipeline_id, and stage_id are required' });
      return;
    }

    // Get the stage to get its win_probability if not provided
    let winProb = probability;
    if (!winProb) {
      const stageResult = await db.query(
        'SELECT win_probability FROM pipeline_stages WHERE id = $1',
        [stage_id]
      );
      if (stageResult.rows.length > 0) {
        winProb = stageResult.rows[0].win_probability;
      }
    }

    const result = await db.query(
      `INSERT INTO deals (
        organization_id,
        title,
        description,
        pipeline_id,
        stage_id,
        contact_id,
        company_id,
        value,
        probability,
        close_date,
        owner_id,
        status,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        orgId,
        title,
        description,
        pipeline_id,
        stage_id,
        contact_id,
        company_id,
        value || 0,
        winProb || 0,
        close_date,
        owner_id || userId,
        status,
        userId,
      ]
    );

    // Create audit log
    await db.query(
      `INSERT INTO audit_logs (organization_id, user_id, action, entity_type, entity_id, changes)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [orgId, userId, 'CREATE', 'deal', result.rows[0].id, JSON.stringify(result.rows[0])]
    );

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    console.error('Error creating deal:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/deals/:id
 * Mettre à jour une opportunité
 */
router.put('/:id', 
  authenticateToken, 
  requireOrganization, 
  async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      stage_id,
      contact_id,
      company_id,
      value,
      probability,
      close_date,
      owner_id,
      status,
    } = req.body;

    const orgId = getOrgIdFromRequest(req);
    const userId = req.user?.id;

    // Get current deal for audit
    const currentResult = await db.query(
      'SELECT * FROM deals WHERE id = $1 AND organization_id = $2',
      [id, orgId]
    );

    if (currentResult.rows.length === 0) {
      res.status(404).json({ error: 'Deal not found' });
      return;
    }

    const updates: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramCount}`);
      params.push(title);
      paramCount++;
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount}`);
      params.push(description);
      paramCount++;
    }
    if (stage_id !== undefined) {
      updates.push(`stage_id = $${paramCount}`);
      params.push(stage_id);
      paramCount++;
    }
    if (contact_id !== undefined) {
      updates.push(`contact_id = $${paramCount}`);
      params.push(contact_id);
      paramCount++;
    }
    if (company_id !== undefined) {
      updates.push(`company_id = $${paramCount}`);
      params.push(company_id);
      paramCount++;
    }
    if (value !== undefined) {
      updates.push(`value = $${paramCount}`);
      params.push(value);
      paramCount++;
    }
    if (probability !== undefined) {
      updates.push(`probability = $${paramCount}`);
      params.push(probability);
      paramCount++;
    }
    if (close_date !== undefined) {
      updates.push(`close_date = $${paramCount}`);
      params.push(close_date);
      paramCount++;
    }
    if (owner_id !== undefined) {
      updates.push(`owner_id = $${paramCount}`);
      params.push(owner_id);
      paramCount++;
    }
    if (status !== undefined) {
      updates.push(`status = $${paramCount}`);
      params.push(status);
      paramCount++;
    }

    if (updates.length === 0) {
      res.status(400).json({ error: 'No updates provided' });
      return;
    }

    updates.push(`updated_at = NOW()`);
    params.push(id);

    const result = await db.query(
      `UPDATE deals SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      params
    );

    // Create audit log
    await db.query(
      `INSERT INTO audit_logs (organization_id, user_id, action, entity_type, entity_id, changes)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        orgId,
        userId,
        'UPDATE',
        'deal',
        id,
        JSON.stringify({
          before: currentResult.rows[0],
          after: result.rows[0],
        }),
      ]
    );

    res.json(result.rows[0]);
  } catch (err: any) {
    console.error('Error updating deal:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/deals/:id
 * Supprimer une opportunité (soft delete)
 */
router.delete('/:id', 
  authenticateToken, 
  requireOrganization, 
  async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const orgId = getOrgIdFromRequest(req);
    const userId = req.user?.id;

    const result = await db.query(
      `UPDATE deals SET deleted_at = NOW() WHERE id = $1 AND organization_id = $2 RETURNING *`,
      [id, orgId]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Deal not found' });
      return;
    }

    // Create audit log
    await db.query(
      `INSERT INTO audit_logs (organization_id, user_id, action, entity_type, entity_id, changes)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [orgId, userId, 'DELETE', 'deal', id, JSON.stringify(result.rows[0])]
    );

    res.json({ message: 'Deal deleted successfully' });
  } catch (err: any) {
    console.error('Error deleting deal:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/deals/:id/move
 * Déplacer une opportunité dans une autre étape du pipeline
 */
router.post('/:id/move', 
  authenticateToken, 
  requireOrganization, 
  async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { stage_id } = req.body;
    const orgId = getOrgIdFromRequest(req);
    const userId = req.user?.id;

    if (!stage_id) {
      res.status(400).json({ error: 'stage_id is required' });
      return;
    }

    // Verify stage exists and get its probability
    const stageResult = await db.query(
      'SELECT win_probability FROM pipeline_stages WHERE id = $1',
      [stage_id]
    );

    if (stageResult.rows.length === 0) {
      res.status(404).json({ error: 'Stage not found' });
      return;
    }

    const newProbability = stageResult.rows[0].win_probability;

    // Update deal
    const result = await db.query(
      `UPDATE deals 
       SET stage_id = $1, probability = $2, updated_at = NOW()
       WHERE id = $3 AND organization_id = $4
       RETURNING *`,
      [stage_id, newProbability, id, orgId]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Deal not found' });
      return;
    }

    // Create activity log
    await db.query(
      `INSERT INTO activities (
        organization_id,
        deal_id,
        type,
        description,
        created_by
      ) VALUES ($1, $2, $3, $4, $5)`,
      [orgId, id, 'deal_stage_change', `Deal moved to new stage. Probability: ${newProbability}%`, userId]
    );

    // Create audit log
    await db.query(
      `INSERT INTO audit_logs (organization_id, user_id, action, entity_type, entity_id, changes)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        orgId,
        userId,
        'MOVE',
        'deal',
        id,
        JSON.stringify({ stage_id, probability: newProbability }),
      ]
    );

    res.json(result.rows[0]);
  } catch (err: any) {
    console.error('Error moving deal:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/deals/:id/history
 * Récupérer l'historique d'une opportunité
 */
router.get('/:id/history', 
  authenticateToken, 
  requireOrganization, 
  async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const orgId = getOrgIdFromRequest(req);

    const result = await db.query(
      `SELECT 
        a.*,
        u.first_name || ' ' || u.last_name as created_by_name
      FROM activities a
      LEFT JOIN users u ON a.created_by = u.id
      WHERE a.deal_id = $1 AND a.organization_id = $2
      ORDER BY a.created_at DESC`,
      [id, orgId]
    );

    res.json(result.rows);
  } catch (err: any) {
    console.error('Error fetching deal history:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/deals/:id/add-activity
 * Ajouter une activité à une opportunité
 */
router.post('/:id/add-activity', 
  authenticateToken, 
  requireOrganization,
  async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { type, description } = req.body;
    const orgId = getOrgIdFromRequest(req);
    const userId = req.user?.id;

    if (!type || !description) {
      res.status(400).json({ error: 'type and description are required' });
      return;
    }

    const result = await db.query(
      `INSERT INTO activities (organization_id, deal_id, type, description, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [orgId, id, type, description, userId]
    );

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    console.error('Error adding activity:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/deals/stats/summary
 * Récupérer les statistiques des deals
 */
router.get('/stats/summary', 
  authenticateToken, 
  requireOrganization,
  async (req: AuthRequest, res: Response) => {
  try {
    const orgId = getOrgIdFromRequest(req);

    const result = await db.query(
      `SELECT 
        COUNT(*) as total_deals,
        COUNT(*) FILTER (WHERE status = 'open') as open_deals,
        COUNT(*) FILTER (WHERE status = 'won') as won_deals,
        COUNT(*) FILTER (WHERE status = 'lost') as lost_deals,
        COALESCE(SUM(value), 0) as total_value,
        COALESCE(SUM(value) FILTER (WHERE status = 'open'), 0) as open_value,
        COALESCE(SUM(value) FILTER (WHERE status = 'won'), 0) as won_value,
        AVG(probability) as avg_probability,
        AVG(EXTRACT(DAY FROM (expected_close_date - created_at::date))) as avg_days_in_pipeline
      FROM deals
      WHERE organization_id = $1 AND deleted_at IS NULL`,
      [orgId]
    );

    res.json(result.rows[0]);
  } catch (err: any) {
    console.error('Error fetching deal stats:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
