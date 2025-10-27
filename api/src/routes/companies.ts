import express, { Request, Response } from 'express';
import { pool } from '../database/db';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requireOrganization } from '../middleware/multiTenancy';
import { getOrgIdFromRequest } from '../utils/multiTenancyHelper';

const router = express.Router();

// Get all companies
router.get('/', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  try {
    const orgId = getOrgIdFromRequest(req);

    const result = await pool.query(
      `SELECT
        id,
        name,
        industry,
        website,
        phone,
        email,
        address,
        created_at,
        updated_at
      FROM companies
      WHERE organization_id = $1 AND deleted_at IS NULL
      ORDER BY name ASC`,
      [orgId]
    );

    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get company by ID
router.get('/:id', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const orgId = getOrgIdFromRequest(req);

    const result = await pool.query(
      `SELECT
        id,
        name,
        industry,
        website,
        phone,
        email,
        address,
        created_at,
        updated_at
      FROM companies
      WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL`,
      [id, orgId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Company not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create company
router.post('/', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  try {
    const { name, industry, website, phone, email, address } = req.body;
    const orgId = getOrgIdFromRequest(req);

    if (!name) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    const result = await pool.query(
      `INSERT INTO companies (organization_id, name, industry, website, phone, email, address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [orgId, name, industry, website, phone, email, address || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update company
router.put('/:id', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, industry, website, phone, email, address } = req.body;
    const orgId = getOrgIdFromRequest(req);

    const result = await pool.query(
      `UPDATE companies
       SET name = $1, industry = $2, website = $3, phone = $4, email = $5,
           address = $6, updated_at = NOW()
       WHERE id = $7 AND organization_id = $8 AND deleted_at IS NULL
       RETURNING *`,
      [name, industry, website, phone, email, address, id, orgId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Company not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete company (soft delete)
router.delete('/:id', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const orgId = getOrgIdFromRequest(req);

    const result = await pool.query(
      `UPDATE companies
       SET deleted_at = NOW()
       WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
       RETURNING id`,
      [id, orgId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Company not found' });
      return;
    }

    res.json({ message: 'Company deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
