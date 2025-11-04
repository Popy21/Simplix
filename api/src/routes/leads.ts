import express, { Request, Response } from 'express';
import { pool as db } from '../database/db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

// ========== LEAD SCORING ROUTES ==========

/**
 * Lead Scoring Algorithm
 * Calcule un score basé sur:
 * - Email fourni: +10 points
 * - Phone fourni: +10 points
 * - Company fourni: +15 points
 * - LinkedIn profile: +20 points
 * - Nombre d'activités: +5 points par activité (max 25)
 * - Type de contact: lead=10, prospect=20, customer=30
 * - Source du lead: direct=20, referral=25, organic=15, paid=10, other=5
 * - Nombre de deals associés: +5 points par deal (max 20)
 * - Engagement score: calcul des interactions
 */

function calculateLeadScore(leadData: any): number {
  let score = 0;

  // Basic info
  if (leadData.email) score += 10;
  if (leadData.phone) score += 10;
  if (leadData.company_name) score += 15;
  if (leadData.linkedin_url) score += 20;

  // Contact type bonus
  const typeScores: { [key: string]: number } = {
    customer: 30,
    prospect: 20,
    lead: 10,
    partner: 15,
    other: 5,
  };
  score += typeScores[leadData.type] || 0;

  // Source bonus
  const sourceScores: { [key: string]: number } = {
    referral: 25,
    direct: 20,
    organic: 15,
    paid: 10,
    other: 5,
  };
  score += sourceScores[leadData.source] || 0;

  // Activities
  const activitiesScore = Math.min((leadData.activity_count || 0) * 5, 25);
  score += activitiesScore;

  // Deals
  const dealsScore = Math.min((leadData.deal_count || 0) * 5, 20);
  score += dealsScore;

  // Engagement bonus
  if (leadData.last_activity_days && leadData.last_activity_days < 7) {
    score += 20; // Recent activity
  } else if (leadData.last_activity_days && leadData.last_activity_days < 30) {
    score += 10;
  }

  return Math.min(score, 100); // Cap at 100
}

/**
 * GET /api/leads
 * Récupérer tous les leads avec pagination et filtres
 */
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const orgId = '00000000-0000-0000-0000-000000000001';
    const { status, source, min_score, max_score, page = 1, limit = 50 } = req.query;

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
    const offset = (pageNum - 1) * limitNum;

    let filters = ['c.organization_id = $1', 'c.deleted_at IS NULL'];
    const params: any[] = [orgId];
    let paramCount = 2;

    if (status) {
      filters.push(`c.type = $${paramCount}`);
      params.push(status);
      paramCount++;
    }

    if (source) {
      filters.push(`c.source = $${paramCount}`);
      params.push(source);
      paramCount++;
    }

    if (min_score) {
      filters.push(`c.score >= $${paramCount}`);
      params.push(parseInt(min_score as string));
      paramCount++;
    }

    if (max_score) {
      filters.push(`c.score <= $${paramCount}`);
      params.push(parseInt(max_score as string));
      paramCount++;
    }

    const result = await db.query(
      `SELECT
        c.*,
        co.name as company_name,
        u.first_name || ' ' || u.last_name as owner_name,
        (SELECT COUNT(*) FROM activities WHERE contact_id = c.id AND organization_id = $1) as activity_count,
        (SELECT COUNT(*) FROM deals WHERE contact_id = c.id AND organization_id = $1) as deal_count,
        (SELECT MAX(created_at) FROM activities WHERE contact_id = c.id AND organization_id = $1) as last_activity
      FROM contacts c
      LEFT JOIN companies co ON c.company_id = co.id
      LEFT JOIN users u ON c.owner_id = u.id
      WHERE ${filters.join(' AND ')}
      ORDER BY c.score DESC, c.created_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...params, limitNum, offset]
    );

    // Count total
    const countResult = await db.query(
      `SELECT COUNT(*) as total FROM contacts c WHERE ${filters.join(' AND ')}`,
      params
    );

    res.json({
      data: result.rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: parseInt(countResult.rows[0].total),
        pages: Math.ceil(parseInt(countResult.rows[0].total) / limitNum)
      }
    });
  } catch (err: any) {
    console.error('Error fetching leads:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/leads/stats/by-source
 * Statistiques par source
 */
router.get('/stats/by-source', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const orgId = '00000000-0000-0000-0000-000000000001';

    const result = await db.query(
      `SELECT
        source,
        COUNT(*) as count,
        AVG(score) as avg_score,
        COUNT(*) FILTER (WHERE score >= 70) as hot_count
      FROM contacts
      WHERE organization_id = $1 AND deleted_at IS NULL
      GROUP BY source
      ORDER BY count DESC`,
      [orgId]
    );

    res.json(result.rows);
  } catch (err: any) {
    console.error('Error fetching stats by source:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/leads/score
 * Recalculer les scores de tous les leads
 */
router.post('/score', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const orgId = '00000000-0000-0000-0000-000000000001';
    const userId = req.user?.id;

    // Get all contacts with their activities and deals
    const contacts = await db.query(
      `SELECT 
        c.id,
        c.email,
        c.phone,
        c.type,
        c.source,
        c.linkedin_url,
        co.name as company_name,
        (SELECT COUNT(*) FROM activities WHERE contact_id = c.id AND organization_id = $1) as activity_count,
        (SELECT COUNT(*) FROM deals WHERE contact_id = c.id AND organization_id = $1) as deal_count,
        (SELECT MAX(created_at) FROM activities WHERE contact_id = c.id AND organization_id = $1) as last_activity,
        c.created_at
      FROM contacts c
      LEFT JOIN companies co ON c.company_id = co.id
      WHERE c.organization_id = $1 AND c.deleted_at IS NULL`,
      [orgId]
    );

    let updatedCount = 0;

    for (const contact of contacts.rows) {
      const lastActivityDays = contact.last_activity
        ? Math.floor((Date.now() - new Date(contact.last_activity).getTime()) / (1000 * 60 * 60 * 24))
        : null;

      const score = calculateLeadScore({
        ...contact,
        last_activity_days: lastActivityDays,
      });

      await db.query(
        'UPDATE contacts SET score = $1, updated_at = NOW() WHERE id = $2',
        [score, contact.id]
      );

      updatedCount++;
    }

    // Log the scoring action
    await db.query(
      `INSERT INTO audit_logs (organization_id, user_id, action, entity_type, entity_id, new_values)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [orgId, userId, 'SCORE_RECALCULATE', 'contacts', null, JSON.stringify({ updated_count: updatedCount })]
    );

    res.json({
      message: 'Lead scores recalculated successfully',
      updated_count: updatedCount,
    });
  } catch (err: any) {
    console.error('Error recalculating lead scores:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/leads/hot
 * Récupérer les leads chauds (score > 70 ou activité récente)
 */
router.get('/hot', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const orgId = '00000000-0000-0000-0000-000000000001';
    const { min_score = 70 } = req.query;

    const result = await db.query(
      `SELECT 
        c.*,
        co.name as company_name,
        u.first_name || ' ' || u.last_name as owner_name,
        (SELECT COUNT(*) FROM activities WHERE contact_id = c.id AND organization_id = $1) as activity_count,
        (SELECT COUNT(*) FROM deals WHERE contact_id = c.id AND organization_id = $1) as deal_count,
        (SELECT MAX(created_at) FROM activities WHERE contact_id = c.id AND organization_id = $1) as last_activity
      FROM contacts c
      LEFT JOIN companies co ON c.company_id = co.id
      LEFT JOIN users u ON c.owner_id = u.id
      WHERE c.organization_id = $1 
        AND c.deleted_at IS NULL
        AND (c.score >= $2 OR (SELECT MAX(created_at) FROM activities WHERE contact_id = c.id) > NOW() - INTERVAL '7 days')
      ORDER BY c.score DESC, (SELECT MAX(created_at) FROM activities WHERE contact_id = c.id) DESC
      LIMIT 50`,
      [orgId, parseInt(min_score as string)]
    );

    res.json(result.rows);
  } catch (err: any) {
    console.error('Error fetching hot leads:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/leads/by-score
 * Filtrer les leads par score
 */
router.get('/by-score', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const orgId = '00000000-0000-0000-0000-000000000001';
    const { min_score = 0, max_score = 100, sort = 'desc' } = req.query;

    const result = await db.query(
      `SELECT 
        c.*,
        co.name as company_name,
        u.first_name || ' ' || u.last_name as owner_name,
        (SELECT COUNT(*) FROM activities WHERE contact_id = c.id AND organization_id = $1) as activity_count,
        (SELECT COUNT(*) FROM deals WHERE contact_id = c.id AND organization_id = $1) as deal_count
      FROM contacts c
      LEFT JOIN companies co ON c.company_id = co.id
      LEFT JOIN users u ON c.owner_id = u.id
      WHERE c.organization_id = $1 
        AND c.deleted_at IS NULL
        AND c.score >= $2 
        AND c.score <= $3
      ORDER BY c.score ${sort === 'asc' ? 'ASC' : 'DESC'}, c.created_at DESC`,
      [orgId, parseInt(min_score as string), parseInt(max_score as string)]
    );

    res.json(result.rows);
  } catch (err: any) {
    console.error('Error fetching leads by score:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/leads/:id
 * Récupérer les détails d'un lead avec scoring breakdown
 */
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const orgId = '00000000-0000-0000-0000-000000000001';

    const result = await db.query(
      `SELECT 
        c.*,
        co.name as company_name,
        u.first_name || ' ' || u.last_name as owner_name,
        (SELECT COUNT(*) FROM activities WHERE contact_id = c.id AND organization_id = $1) as activity_count,
        (SELECT COUNT(*) FROM deals WHERE contact_id = c.id AND organization_id = $1) as deal_count,
        (SELECT MAX(created_at) FROM activities WHERE contact_id = c.id AND organization_id = $1) as last_activity
      FROM contacts c
      LEFT JOIN companies co ON c.company_id = co.id
      LEFT JOIN users u ON c.owner_id = u.id
      WHERE c.id = $2 AND c.organization_id = $1 AND c.deleted_at IS NULL`,
      [orgId, id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Lead not found' });
      return;
    }

    const lead = result.rows[0];

    // Get score breakdown
    const typeScores: { [key: string]: number } = { customer: 30, prospect: 20, lead: 10, partner: 15, other: 5 };
    const sourceScores: { [key: string]: number } = { referral: 25, direct: 20, organic: 15, paid: 10, other: 5 };

    const breakdown = {
      email: lead.email ? 10 : 0,
      phone: lead.phone ? 10 : 0,
      company: lead.company_name ? 15 : 0,
      linkedin: lead.linkedin_url ? 20 : 0,
      type: typeScores[lead.type] || 0,
      source: sourceScores[lead.source] || 0,
      activities: Math.min((lead.activity_count || 0) * 5, 25),
      deals: Math.min((lead.deal_count || 0) * 5, 20),
      engagement: lead.last_activity
        ? Math.floor((Date.now() - new Date(lead.last_activity).getTime()) / (1000 * 60 * 60 * 24)) < 7
          ? 20
          : 10
        : 0,
    };

    res.json({
      ...lead,
      score_breakdown: breakdown,
      total_score: lead.score,
    });
  } catch (err: any) {
    console.error('Error fetching lead:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/leads/:id/assign
 * Assigner un lead à un utilisateur
 */
router.post('/:id/assign', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { owner_id } = req.body;
    const orgId = '00000000-0000-0000-0000-000000000001';
    const userId = req.user?.id;

    if (!owner_id) {
      res.status(400).json({ error: 'owner_id is required' });
      return;
    }

    const result = await db.query(
      `UPDATE contacts SET owner_id = $1, assigned_to = $1, updated_at = NOW() 
       WHERE id = $2 AND organization_id = $3 
       RETURNING *`,
      [owner_id, id, orgId]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Lead not found' });
      return;
    }

    // Create activity log
    await db.query(
      `INSERT INTO activities (organization_id, contact_id, type, description, created_by)
       VALUES ($1, $2, $3, $4, $5)`,
      [orgId, id, 'lead_assigned', `Lead assigned to new owner`, userId]
    );

    res.json(result.rows[0]);
  } catch (err: any) {
    console.error('Error assigning lead:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/leads/stats/distribution
 * Statistiques de distribution des leads par score
 */
router.get('/stats/distribution', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const orgId = '00000000-0000-0000-0000-000000000001';

    const result = await db.query(
      `SELECT 
        COUNT(*) FILTER (WHERE score >= 0 AND score < 20) as very_cold,
        COUNT(*) FILTER (WHERE score >= 20 AND score < 40) as cold,
        COUNT(*) FILTER (WHERE score >= 40 AND score < 60) as warm,
        COUNT(*) FILTER (WHERE score >= 60 AND score < 80) as hot,
        COUNT(*) FILTER (WHERE score >= 80) as very_hot,
        AVG(score) as avg_score,
        MAX(score) as max_score,
        MIN(score) as min_score,
        COUNT(*) as total_leads
      FROM contacts
      WHERE organization_id = $1 AND deleted_at IS NULL`,
      [orgId]
    );

    res.json(result.rows[0]);
  } catch (err: any) {
    console.error('Error fetching lead stats:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
