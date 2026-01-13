import express, { Request, Response } from 'express';
import { pool } from '../database/db';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requireOrganization } from '../middleware/multiTenancy';
import { getOrgIdFromRequest } from '../utils/multiTenancyHelper';

const router = express.Router();

// Get all contacts
router.get('/', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  try {
    const orgId = getOrgIdFromRequest(req);
    const { page = '1', limit = '50', type } = req.query;
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 50));
    const offset = (pageNum - 1) * limitNum;

    let query = `
      SELECT
        c.id,
        c.first_name,
        c.last_name,
        c.full_name,
        c.avatar_url,
        c.email,
        c.phone,
        c.mobile,
        c.title,
        c.department,
        c.type,
        c.source,
        c.score,
        c.linkedin_url,
        c.twitter_url,
        c.company_id,
        co.name as company_name,
        co.logo_url as company_logo,
        c.created_at,
        c.updated_at
      FROM contacts c
      LEFT JOIN companies co ON c.company_id = co.id
      WHERE c.organization_id = $1 AND c.deleted_at IS NULL
    `;

    const params: any[] = [orgId];

    if (type) {
      query += ` AND c.type = $${params.length + 1}`;
      params.push(type);
    }

    query += ` ORDER BY c.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limitNum, offset);

    const result = await pool.query(query, params);

    const countQuery = `
      SELECT COUNT(*) as total FROM contacts
      WHERE organization_id = $1 AND deleted_at IS NULL
      ${type ? 'AND type = $2' : ''}
    `;
    const countParams = type ? [orgId, type] : [orgId];
    const countResult = await pool.query(countQuery, countParams);

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
    res.status(500).json({ error: err.message });
  }
});

// Get deleted contacts (alias for backward compatibility)
router.get('/deleted', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  try {
    const orgId = getOrgIdFromRequest(req);
    const { page = '1', limit = '50' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 50));
    const offset = (pageNum - 1) * limitNum;

    const query = `
      SELECT
        c.id,
        c.first_name,
        c.last_name,
        c.full_name,
        c.email,
        c.phone,
        c.company_id,
        co.name as company_name,
        c.deleted_at,
        c.created_at
      FROM contacts c
      LEFT JOIN companies co ON c.company_id = co.id
      WHERE c.organization_id = $1 AND c.deleted_at IS NOT NULL
      ORDER BY c.deleted_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await pool.query(query, [orgId, limitNum, offset]);
    res.json(result.rows);
  } catch (err: any) {
    console.error('Error fetching deleted contacts:', err);
    res.status(500).json({ error: err.message });
  }
});

// Import contacts from CSV/Excel
router.post('/import', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  try {
    const orgId = getOrgIdFromRequest(req);
    const userId = req.user?.id;
    const { contacts, mapping } = req.body;

    if (!contacts || !Array.isArray(contacts)) {
      return res.status(400).json({ error: 'contacts array is required' });
    }

    const imported = [];
    const errors = [];

    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];
      try {
        const result = await pool.query(
          `INSERT INTO contacts (
            organization_id, first_name, last_name, email, phone, type, source, created_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING id`,
          [
            orgId,
            contact.first_name || contact.firstName || '',
            contact.last_name || contact.lastName || '',
            contact.email || '',
            contact.phone || '',
            contact.type || 'lead',
            'import',
            userId
          ]
        );
        imported.push(result.rows[0]);
      } catch (err: any) {
        errors.push({ row: i + 1, error: err.message });
      }
    }

    res.json({
      success: true,
      imported: imported.length,
      errors: errors.length,
      details: { imported, errors }
    });
  } catch (err: any) {
    console.error('Error importing contacts:', err);
    res.status(500).json({ error: err.message });
  }
});

// Find duplicate contacts
router.get('/deduplicate', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  try {
    const orgId = getOrgIdFromRequest(req);

    const result = await pool.query(`
      SELECT
        c1.id as contact_id,
        c1.first_name,
        c1.last_name,
        c1.email,
        c1.phone,
        c2.id as duplicate_id,
        c2.first_name as dup_first_name,
        c2.last_name as dup_last_name,
        c2.email as dup_email,
        CASE
          WHEN c1.email = c2.email THEN 'email'
          WHEN c1.phone = c2.phone THEN 'phone'
          WHEN c1.first_name = c2.first_name AND c1.last_name = c2.last_name THEN 'name'
        END as match_type
      FROM contacts c1
      JOIN contacts c2 ON c1.id < c2.id
        AND c1.organization_id = c2.organization_id
        AND (
          (c1.email IS NOT NULL AND c1.email = c2.email) OR
          (c1.phone IS NOT NULL AND c1.phone = c2.phone) OR
          (c1.first_name = c2.first_name AND c1.last_name = c2.last_name)
        )
      WHERE c1.organization_id = $1
        AND c1.deleted_at IS NULL
        AND c2.deleted_at IS NULL
      ORDER BY c1.email, c1.phone
      LIMIT 100
    `, [orgId]);

    res.json({
      duplicates: result.rows,
      total: result.rows.length
    });
  } catch (err: any) {
    console.error('Error finding duplicates:', err);
    res.status(500).json({ error: err.message });
  }
});

// Merge duplicate contacts
router.post('/deduplicate', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  try {
    const orgId = getOrgIdFromRequest(req);
    const { primary_id, duplicate_ids } = req.body;

    if (!primary_id || !duplicate_ids || !Array.isArray(duplicate_ids)) {
      return res.status(400).json({ error: 'primary_id and duplicate_ids array are required' });
    }

    // Soft delete duplicates
    const result = await pool.query(
      `UPDATE contacts
       SET deleted_at = NOW()
       WHERE id = ANY($1) AND organization_id = $2 AND deleted_at IS NULL
       RETURNING id`,
      [duplicate_ids, orgId]
    );

    res.json({
      success: true,
      merged: result.rows.length,
      primary_id
    });
  } catch (err: any) {
    console.error('Error merging contacts:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get contact statistics
router.get('/stats', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  try {
    const orgId = getOrgIdFromRequest(req);

    const stats = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE deleted_at IS NULL) as total,
        COUNT(*) FILTER (WHERE type = 'lead' AND deleted_at IS NULL) as leads,
        COUNT(*) FILTER (WHERE type = 'prospect' AND deleted_at IS NULL) as prospects,
        COUNT(*) FILTER (WHERE type = 'customer' AND deleted_at IS NULL) as customers,
        COUNT(*) FILTER (WHERE type IN ('partner', 'other') AND deleted_at IS NULL) as others,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days' AND deleted_at IS NULL) as new_this_month,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days' AND deleted_at IS NULL) as new_this_week
      FROM contacts
      WHERE organization_id = $1
    `, [orgId]);

    res.json(stats.rows[0]);
  } catch (err: any) {
    console.error('Error fetching contact stats:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get deleted contacts (full route) - MUST BE BEFORE /:id
router.get('/deleted/list', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  try {
    const orgId = getOrgIdFromRequest(req);
    const { page = '1', limit = '50' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 50));
    const offset = (pageNum - 1) * limitNum;

    const query = `
      SELECT
        c.id,
        c.first_name,
        c.last_name,
        c.full_name,
        c.email,
        c.phone,
        c.company_id,
        co.name as company_name,
        c.deleted_at,
        c.created_at
      FROM contacts c
      LEFT JOIN companies co ON c.company_id = co.id
      WHERE c.organization_id = $1 AND c.deleted_at IS NOT NULL
      ORDER BY c.deleted_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await pool.query(query, [orgId, limitNum, offset]);

    const countResult = await pool.query(
      'SELECT COUNT(*) as total FROM contacts WHERE organization_id = $1 AND deleted_at IS NOT NULL',
      [orgId]
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
    res.status(500).json({ error: err.message });
  }
});

// Get contact by ID
router.get('/:id', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const orgId = getOrgIdFromRequest(req);

    const result = await pool.query(
      `SELECT
        c.*,
        co.name as company_name,
        co.logo_url as company_logo,
        u.first_name || ' ' || u.last_name as owner_name
      FROM contacts c
      LEFT JOIN companies co ON c.company_id = co.id
      LEFT JOIN users u ON c.owner_id = u.id
      WHERE c.id = $1 AND c.organization_id = $2 AND c.deleted_at IS NULL`,
      [id, orgId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Contact not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create contact
router.post('/', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  try {
    const {
      first_name,
      last_name,
      avatar_url,
      email,
      phone,
      mobile,
      title,
      department,
      company_id,
      type,
      source,
      linkedin_url,
      twitter_url,
      address,
      tags,
      custom_fields,
      notes,
      owner_id
    } = req.body;

    const orgId = getOrgIdFromRequest(req);
    const userId = req.user?.id;

    const result = await pool.query(
      `INSERT INTO contacts (
        organization_id, first_name, last_name, avatar_url, email, phone, mobile,
        title, department, company_id, type, source, linkedin_url, twitter_url,
        address, tags, custom_fields, notes, owner_id, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING *`,
      [
        orgId, first_name, last_name, avatar_url, email, phone, mobile,
        title, department, company_id, type || 'lead', source, linkedin_url, twitter_url,
        address, tags, custom_fields || {}, notes, owner_id || userId, userId
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update contact
router.put('/:id', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      first_name,
      last_name,
      avatar_url,
      email,
      phone,
      mobile,
      title,
      department,
      company_id,
      type,
      source,
      linkedin_url,
      twitter_url,
      address,
      tags,
      custom_fields,
      notes,
      owner_id,
      score
    } = req.body;

    const orgId = getOrgIdFromRequest(req);

    const result = await pool.query(
      `UPDATE contacts
       SET first_name = $1, last_name = $2, avatar_url = $3, email = $4, phone = $5, mobile = $6,
           title = $7, department = $8, company_id = $9, type = $10, source = $11,
           linkedin_url = $12, twitter_url = $13, address = $14, tags = $15,
           custom_fields = $16, notes = $17, owner_id = $18, score = $19, updated_at = NOW()
       WHERE id = $20 AND organization_id = $21 AND deleted_at IS NULL
       RETURNING *`,
      [
        first_name, last_name, avatar_url, email, phone, mobile,
        title, department, company_id, type, source,
        linkedin_url, twitter_url, address, tags,
        custom_fields, notes, owner_id, score,
        id, orgId
      ]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Contact not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Restore deleted contact
router.patch('/:id/restore', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const orgId = getOrgIdFromRequest(req);

    const result = await pool.query(
      `UPDATE contacts
       SET deleted_at = NULL
       WHERE id = $1 AND organization_id = $2 AND deleted_at IS NOT NULL
       RETURNING id`,
      [id, orgId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Deleted contact not found' });
      return;
    }

    res.json({ message: 'Contact restored successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete contact (soft delete)
router.delete('/:id', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const orgId = getOrgIdFromRequest(req);

    const result = await pool.query(
      `UPDATE contacts
       SET deleted_at = NOW()
       WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
       RETURNING id`,
      [id, orgId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Contact not found' });
      return;
    }

    res.json({ message: 'Contact deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get contact activities
router.get('/:id/activities', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const orgId = getOrgIdFromRequest(req);

    const result = await pool.query(
      `SELECT
        a.*,
        u.first_name || ' ' || u.last_name as created_by_name,
        d.title as deal_title
      FROM activities a
      LEFT JOIN users u ON a.created_by = u.id
      LEFT JOIN deals d ON a.deal_id = d.id
      WHERE a.contact_id = $1 AND a.organization_id = $2
      ORDER BY a.created_at DESC`,
      [id, orgId]
    );

    res.json(result.rows);
  } catch (err: any) {
    console.error('Error fetching contact activities:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get contact deals
router.get('/:id/deals', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const orgId = getOrgIdFromRequest(req);

    const result = await pool.query(
      `SELECT
        d.*,
        ps.name as stage_name,
        p.name as pipeline_name,
        u.first_name || ' ' || u.last_name as owner_name
      FROM deals d
      LEFT JOIN pipeline_stages ps ON d.stage_id = ps.id
      LEFT JOIN pipelines p ON d.pipeline_id = p.id
      LEFT JOIN users u ON d.owner_id = u.id
      WHERE d.contact_id = $1 AND d.organization_id = $2 AND d.deleted_at IS NULL
      ORDER BY d.created_at DESC`,
      [id, orgId]
    );

    res.json(result.rows);
  } catch (err: any) {
    console.error('Error fetching contact deals:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
