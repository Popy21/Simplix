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

export default router;
