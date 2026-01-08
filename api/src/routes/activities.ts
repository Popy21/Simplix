import express, { Request, Response } from 'express';
import { pool as db } from '../database/db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

// ========== ACTIVITIES ROUTES ==========

/**
 * GET /api/activities
 * Récupérer toutes les activités
 */
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { contact_id, deal_id, type, from_date, to_date, user_id } = req.query;
    const orgId = '00000000-0000-0000-0000-000000000001';

    let query = `
      SELECT 
        a.*,
        c.first_name || ' ' || c.last_name as contact_name,
        d.title as deal_title,
        u.first_name || ' ' || u.last_name as created_by_name
      FROM activities a
      LEFT JOIN contacts c ON a.contact_id = c.id
      LEFT JOIN deals d ON a.deal_id = d.id
      LEFT JOIN users u ON a.created_by = u.id
      WHERE a.organization_id = $1
    `;

    const params: any[] = [orgId];
    let paramCount = 2;

    if (contact_id) {
      query += ` AND a.contact_id = $${paramCount}`;
      params.push(contact_id);
      paramCount++;
    }

    if (deal_id) {
      query += ` AND a.deal_id = $${paramCount}`;
      params.push(deal_id);
      paramCount++;
    }

    if (type) {
      query += ` AND a.type = $${paramCount}`;
      params.push(type);
      paramCount++;
    }

    if (from_date) {
      query += ` AND a.created_at >= $${paramCount}`;
      params.push(from_date);
      paramCount++;
    }

    if (to_date) {
      query += ` AND a.created_at <= $${paramCount}`;
      params.push(to_date);
      paramCount++;
    }

    if (user_id) {
      query += ` AND a.created_by = $${paramCount}`;
      params.push(user_id);
      paramCount++;
    }

    query += ` ORDER BY a.created_at DESC LIMIT 200`;

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err: any) {
    console.error('Error fetching activities:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/activities/upcoming
 * Récupérer les activités à venir (schedulées dans le futur)
 */
router.get('/upcoming', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const orgId = '00000000-0000-0000-0000-000000000001';
    const { limit = 50 } = req.query;

    const result = await db.query(
      `SELECT
        a.*,
        c.first_name || ' ' || c.last_name as contact_name,
        d.title as deal_title,
        u.first_name || ' ' || u.last_name as created_by_name
      FROM activities a
      LEFT JOIN contacts c ON a.contact_id = c.id
      LEFT JOIN deals d ON a.deal_id = d.id
      LEFT JOIN users u ON a.created_by = u.id
      WHERE a.organization_id = $1
        AND a.scheduled_at IS NOT NULL
        AND a.scheduled_at > NOW()
        AND a.completed_at IS NULL
      ORDER BY a.scheduled_at ASC
      LIMIT $2`,
      [orgId, parseInt(limit as string)]
    );

    res.json(result.rows);
  } catch (err: any) {
    console.error('Error fetching upcoming activities:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/activities/overdue
 * Récupérer les activités en retard (scheduled_at dans le passé mais pas complétées)
 */
router.get('/overdue', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const orgId = '00000000-0000-0000-0000-000000000001';

    const result = await db.query(
      `SELECT
        a.*,
        c.first_name || ' ' || c.last_name as contact_name,
        d.title as deal_title,
        u.first_name || ' ' || u.last_name as created_by_name,
        EXTRACT(DAY FROM (NOW() - a.scheduled_at)) as days_overdue
      FROM activities a
      LEFT JOIN contacts c ON a.contact_id = c.id
      LEFT JOIN deals d ON a.deal_id = d.id
      LEFT JOIN users u ON a.created_by = u.id
      WHERE a.organization_id = $1
        AND a.scheduled_at IS NOT NULL
        AND a.scheduled_at < NOW()
        AND a.completed_at IS NULL
      ORDER BY a.scheduled_at ASC`,
      [orgId]
    );

    res.json(result.rows);
  } catch (err: any) {
    console.error('Error fetching overdue activities:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/activities/:id
 * Récupérer une activité spécifique
 */
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const orgId = '00000000-0000-0000-0000-000000000001';

    const result = await db.query(
      `SELECT 
        a.*,
        c.first_name || ' ' || c.last_name as contact_name,
        d.title as deal_title,
        u.first_name || ' ' || u.last_name as created_by_name
      FROM activities a
      LEFT JOIN contacts c ON a.contact_id = c.id
      LEFT JOIN deals d ON a.deal_id = d.id
      LEFT JOIN users u ON a.created_by = u.id
      WHERE a.id = $1 AND a.organization_id = $2`,
      [id, orgId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Activity not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err: any) {
    console.error('Error fetching activity:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/activities/contact/:contactId
 * Récupérer toutes les activités d'un contact
 */
router.get('/contact/:contactId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { contactId } = req.params;
    const orgId = '00000000-0000-0000-0000-000000000001';

    const result = await db.query(
      `SELECT 
        a.*,
        u.first_name || ' ' || u.last_name as created_by_name,
        d.title as deal_title
      FROM activities a
      LEFT JOIN users u ON a.created_by = u.id
      LEFT JOIN deals d ON a.deal_id = d.id
      WHERE a.contact_id = $1 AND a.organization_id = $2
      ORDER BY a.created_at DESC`,
      [contactId, orgId]
    );

    res.json(result.rows);
  } catch (err: any) {
    console.error('Error fetching contact activities:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/activities
 * Créer une nouvelle activité générique
 */
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { type, description, subject, contact_id, deal_id, scheduled_at } = req.body;
    const orgId = '00000000-0000-0000-0000-000000000001';
    const userId = req.user?.id;

    if (!type || !description) {
      res.status(400).json({ error: 'type and description are required' });
      return;
    }

    const result = await db.query(
      `INSERT INTO activities (
        organization_id,
        contact_id,
        deal_id,
        type,
        subject,
        description,
        scheduled_at,
        created_by,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING *`,
      [orgId, contact_id || null, deal_id || null, type, subject || description, description, scheduled_at || null, userId]
    );

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    console.error('Error creating activity:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/activities/call
 * Logger un appel téléphonique
 */
router.post('/call', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { contact_id, deal_id, duration_minutes, notes, status = 'completed' } = req.body;
    const orgId = '00000000-0000-0000-0000-000000000001';
    const userId = req.user?.id;

    if (!contact_id) {
      res.status(400).json({ error: 'contact_id is required' });
      return;
    }

    const description = `Call - ${duration_minutes || 0} min - ${notes || 'No notes'}`;

    const result = await db.query(
      `INSERT INTO activities (
        organization_id,
        contact_id,
        deal_id,
        type,
        description,
        status,
        metadata,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        orgId,
        contact_id,
        deal_id || null,
        'call',
        description,
        status,
        JSON.stringify({ duration_minutes, notes }),
        userId,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    console.error('Error logging call:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/activities/email
 * Logger un email
 */
router.post('/email', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { contact_id, deal_id, subject, email_body, recipients, status = 'sent' } = req.body;
    const orgId = '00000000-0000-0000-0000-000000000001';
    const userId = req.user?.id;

    if (!contact_id || !subject) {
      res.status(400).json({ error: 'contact_id and subject are required' });
      return;
    }

    const result = await db.query(
      `INSERT INTO activities (
        organization_id,
        contact_id,
        deal_id,
        type,
        description,
        status,
        metadata,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        orgId,
        contact_id,
        deal_id || null,
        'email',
        subject,
        status,
        JSON.stringify({ email_body, recipients, opened: false, clicked: false }),
        userId,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    console.error('Error logging email:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/activities/meeting
 * Logger une réunion
 */
router.post('/meeting', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const {
      contact_id,
      deal_id,
      title,
      start_time,
      end_time,
      location,
      attendees,
      notes,
      status = 'scheduled',
    } = req.body;
    const orgId = '00000000-0000-0000-0000-000000000001';
    const userId = req.user?.id;

    if (!contact_id || !title || !start_time) {
      res.status(400).json({ error: 'contact_id, title, and start_time are required' });
      return;
    }

    const result = await db.query(
      `INSERT INTO activities (
        organization_id,
        contact_id,
        deal_id,
        type,
        subject,
        description,
        scheduled_at,
        location,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        orgId,
        contact_id,
        deal_id || null,
        'meeting',
        title,
        notes || title,
        start_time,
        location || null,
        userId,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    console.error('Error logging meeting:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/activities/note
 * Ajouter une note
 */
router.post('/note', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { contact_id, deal_id, content } = req.body;
    const orgId = '00000000-0000-0000-0000-000000000001';
    const userId = req.user?.id;

    if (!content) {
      res.status(400).json({ error: 'content is required' });
      return;
    }

    const result = await db.query(
      `INSERT INTO activities (
        organization_id,
        contact_id,
        deal_id,
        type,
        description,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [orgId, contact_id || null, deal_id || null, 'note', content, userId]
    );

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    console.error('Error creating note:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/activities/:id
 * Mettre à jour une activité
 */
router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { type, description, status, metadata } = req.body;
    const orgId = '00000000-0000-0000-0000-000000000001';

    const updates: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (type !== undefined) {
      updates.push(`type = $${paramCount}`);
      params.push(type);
      paramCount++;
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount}`);
      params.push(description);
      paramCount++;
    }
    if (status !== undefined) {
      updates.push(`status = $${paramCount}`);
      params.push(status);
      paramCount++;
    }
    if (metadata !== undefined) {
      updates.push(`metadata = $${paramCount}`);
      params.push(JSON.stringify(metadata));
      paramCount++;
    }

    if (updates.length === 0) {
      res.status(400).json({ error: 'No updates provided' });
      return;
    }

    updates.push(`updated_at = NOW()`);
    params.push(id);
    params.push(orgId);

    const result = await db.query(
      `UPDATE activities SET ${updates.join(', ')} WHERE id = $${paramCount} AND organization_id = $${paramCount + 1} RETURNING *`,
      params
    );

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Activity not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err: any) {
    console.error('Error updating activity:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/activities/:id
 * Supprimer une activité
 */
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const orgId = '00000000-0000-0000-0000-000000000001';

    const result = await db.query('DELETE FROM activities WHERE id = $1 AND organization_id = $2', [id, orgId]);

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Activity not found' });
      return;
    }

    res.json({ message: 'Activity deleted successfully' });
  } catch (err: any) {
    console.error('Error deleting activity:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/activities/stats/timeline
 * Timeline des activités récentes
 */
router.get('/stats/timeline', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const orgId = '00000000-0000-0000-0000-000000000001';
    const { days = 30 } = req.query;

    const result = await db.query(
      `SELECT 
        DATE(a.created_at) as date,
        COUNT(*) as total_activities,
        COUNT(*) FILTER (WHERE a.type = 'call') as calls,
        COUNT(*) FILTER (WHERE a.type = 'email') as emails,
        COUNT(*) FILTER (WHERE a.type = 'meeting') as meetings,
        COUNT(*) FILTER (WHERE a.type = 'note') as notes
      FROM activities a
      WHERE a.organization_id = $1 AND a.created_at > NOW() - INTERVAL '1 day' * $2
      GROUP BY DATE(a.created_at)
      ORDER BY date DESC`,
      [orgId, parseInt(days as string)]
    );

    res.json(result.rows);
  } catch (err: any) {
    console.error('Error fetching activity timeline:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
