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

    let query = `SELECT
        id,
        name,
        legal_name,
        industry,
        website,
        logo_url,
        phone,
        email,
        address,
        company_size,
        annual_revenue,
        description,
        linkedin_url,
        twitter_url,
        facebook_url,
        owner_id,
        assigned_to,
        tags,
        custom_fields,
        created_at,
        updated_at
      FROM companies
      WHERE organization_id = $1 AND deleted_at IS NULL`;

    const params: any[] = [orgId];

    query += ` ORDER BY name ASC`;

    const result = await pool.query(query, params);

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
        legal_name,
        industry,
        website,
        logo_url,
        phone,
        email,
        address,
        company_size,
        annual_revenue,
        description,
        linkedin_url,
        twitter_url,
        facebook_url,
        owner_id,
        assigned_to,
        tags,
        custom_fields,
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
    const {
      name,
      legal_name,
      industry,
      website,
      logo_url,
      phone,
      email,
      address,
      company_size,
      annual_revenue,
      description,
      linkedin_url,
      twitter_url,
      facebook_url,
      tags,
      custom_fields
    } = req.body;
    const orgId = getOrgIdFromRequest(req);
    const userId = req.user?.id;

    if (!name) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    // Parse address if it's a string
    const parseAddress = (addr: any) => {
      if (!addr) return null;
      if (typeof addr === 'string') {
        try {
          return JSON.parse(addr);
        } catch (e) {
          return { street: addr };
        }
      }
      return addr;
    };

    const addressData = parseAddress(address);

    const result = await pool.query(
      `INSERT INTO companies (
        organization_id, name, legal_name, industry, website, logo_url, phone, email, address,
        company_size, annual_revenue, description, linkedin_url, twitter_url, facebook_url,
        owner_id, created_by, tags, custom_fields
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $16, $17, $18)
       RETURNING *`,
      [
        orgId, name, legal_name || null, industry || null, website || null, logo_url || null,
        phone || null, email || null, addressData ? JSON.stringify(addressData) : null,
        company_size || null, annual_revenue || null, description || null,
        linkedin_url || null, twitter_url || null, facebook_url || null,
        userId, tags || null, custom_fields || '{}'
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    console.error('Error creating company:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update company
router.put('/:id', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      legal_name,
      industry,
      website,
      logo_url,
      phone,
      email,
      address,
      company_size,
      annual_revenue,
      description,
      linkedin_url,
      twitter_url,
      facebook_url,
      assigned_to,
      tags,
      custom_fields
    } = req.body;
    const orgId = getOrgIdFromRequest(req);

    // Parse address if it's a string
    const parseAddress = (addr: any) => {
      if (!addr) return null;
      if (typeof addr === 'string') {
        try {
          return JSON.parse(addr);
        } catch (e) {
          return { street: addr };
        }
      }
      return addr;
    };

    const addressData = parseAddress(address);

    const result = await pool.query(
      `UPDATE companies
       SET name = $1, legal_name = $2, industry = $3, website = $4, logo_url = $5, phone = $6,
           email = $7, address = $8, company_size = $9, annual_revenue = $10, description = $11,
           linkedin_url = $12, twitter_url = $13, facebook_url = $14, assigned_to = $15,
           tags = $16, custom_fields = COALESCE($17, custom_fields), updated_at = NOW()
       WHERE id = $18 AND organization_id = $19 AND deleted_at IS NULL
       RETURNING *`,
      [
        name, legal_name || null, industry || null, website || null, logo_url || null,
        phone || null, email || null, addressData ? JSON.stringify(addressData) : null,
        company_size || null, annual_revenue || null, description || null,
        linkedin_url || null, twitter_url || null, facebook_url || null,
        assigned_to || null, tags || null, custom_fields,
        id, orgId
      ]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Company not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err: any) {
    console.error('Error updating company:', err);
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

// Get company contacts
router.get('/:id/contacts', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const orgId = getOrgIdFromRequest(req);

    const result = await pool.query(
      `SELECT
        c.*,
        u.first_name || ' ' || u.last_name as owner_name,
        (SELECT COUNT(*) FROM activities WHERE contact_id = c.id) as activity_count,
        (SELECT COUNT(*) FROM deals WHERE contact_id = c.id AND deleted_at IS NULL) as deal_count
      FROM contacts c
      LEFT JOIN users u ON c.owner_id = u.id
      WHERE c.company_id = $1 AND c.organization_id = $2 AND c.deleted_at IS NULL
      ORDER BY c.created_at DESC`,
      [id, orgId]
    );

    res.json(result.rows);
  } catch (err: any) {
    console.error('Error fetching company contacts:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
