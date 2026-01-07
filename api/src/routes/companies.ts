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
    const { is_professional } = req.query;

    let query = `SELECT
        id,
        name,
        industry,
        website,
        logo_url,
        phone,
        email,
        address,
        siret,
        tva_number,
        is_professional,
        payment_terms_days,
        credit_limit,
        billing_address,
        shipping_address,
        ape_code,
        created_at,
        updated_at
      FROM companies
      WHERE organization_id = $1 AND deleted_at IS NULL`;

    const params: any[] = [orgId];

    if (is_professional !== undefined) {
      query += ` AND is_professional = $2`;
      params.push(is_professional === 'true');
    }

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
        industry,
        website,
        logo_url,
        phone,
        email,
        address,
        siret,
        tva_number,
        is_professional,
        payment_terms_days,
        credit_limit,
        billing_address,
        shipping_address,
        ape_code,
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
      industry,
      website,
      logo_url,
      phone,
      email,
      address,
      siret,
      tva_number,
      is_professional,
      payment_terms_days,
      credit_limit,
      billing_address,
      shipping_address,
      ape_code
    } = req.body;
    const orgId = getOrgIdFromRequest(req);

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
    const billingData = parseAddress(billing_address);
    const shippingData = parseAddress(shipping_address);

    const result = await pool.query(
      `INSERT INTO companies (
        organization_id, name, industry, website, logo_url, phone, email, address,
        siret, tva_number, is_professional, payment_terms_days, credit_limit,
        billing_address, shipping_address, ape_code
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       RETURNING *`,
      [
        orgId, name, industry, website, logo_url, phone, email,
        addressData ? JSON.stringify(addressData) : null,
        siret || null,
        tva_number || null,
        is_professional || false,
        payment_terms_days || 30,
        credit_limit || null,
        billingData ? JSON.stringify(billingData) : null,
        shippingData ? JSON.stringify(shippingData) : null,
        ape_code || null
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    console.error('Error creating company:', err);
    // Handle SIRET/TVA validation errors from triggers
    if (err.message.includes('SIRET') || err.message.includes('TVA')) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: err.message });
  }
});

// Update company
router.put('/:id', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      industry,
      website,
      logo_url,
      phone,
      email,
      address,
      siret,
      tva_number,
      is_professional,
      payment_terms_days,
      credit_limit,
      billing_address,
      shipping_address,
      ape_code
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
    const billingData = parseAddress(billing_address);
    const shippingData = parseAddress(shipping_address);

    const result = await pool.query(
      `UPDATE companies
       SET name = $1, industry = $2, website = $3, logo_url = $4, phone = $5, email = $6,
           address = $7, siret = $8, tva_number = $9, is_professional = $10,
           payment_terms_days = $11, credit_limit = $12, billing_address = $13,
           shipping_address = $14, ape_code = $15, updated_at = NOW()
       WHERE id = $16 AND organization_id = $17 AND deleted_at IS NULL
       RETURNING *`,
      [
        name, industry, website, logo_url, phone, email,
        addressData ? JSON.stringify(addressData) : null,
        siret || null,
        tva_number || null,
        is_professional !== undefined ? is_professional : false,
        payment_terms_days || 30,
        credit_limit || null,
        billingData ? JSON.stringify(billingData) : null,
        shippingData ? JSON.stringify(shippingData) : null,
        ape_code || null,
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
    // Handle SIRET/TVA validation errors from triggers
    if (err.message.includes('SIRET') || err.message.includes('TVA')) {
      res.status(400).json({ error: err.message });
      return;
    }
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
