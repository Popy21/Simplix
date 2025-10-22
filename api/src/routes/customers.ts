import express, { Request, Response } from 'express';
import { pool } from '../database/db';

const router = express.Router();

// IMPORTANT: Cette route utilise l'ancienne structure "customers"
// Pour la nouvelle BDD PostgreSQL, utilisez "contacts" et "companies"
// Voir /api/contacts et /api/companies

// Get all customers (legacy - mapped to contacts)
router.get('/', async (req: Request, res: Response) => {
  try {
    // Pour la démo, on utilise l'org par défaut
    const orgId = '00000000-0000-0000-0000-000000000001';

    const result = await pool.query(
      `SELECT
        c.id,
        c.first_name || ' ' || COALESCE(c.last_name, '') as name,
        c.email,
        c.phone,
        co.name as company,
        c.created_at,
        c.updated_at
      FROM contacts c
      LEFT JOIN companies co ON c.company_id = co.id
      WHERE c.organization_id = $1 AND c.deleted_at IS NULL
      ORDER BY c.created_at DESC`,
      [orgId]
    );

    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get customer by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const orgId = '00000000-0000-0000-0000-000000000001';

    const result = await pool.query(
      `SELECT
        c.id,
        c.first_name || ' ' || COALESCE(c.last_name, '') as name,
        c.email,
        c.phone,
        co.name as company,
        c.created_at,
        c.updated_at
      FROM contacts c
      LEFT JOIN companies co ON c.company_id = co.id
      WHERE c.id = $1 AND c.organization_id = $2 AND c.deleted_at IS NULL`,
      [id, orgId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create customer (legacy - creates a contact)
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, email, phone, company, address } = req.body;
    const orgId = '00000000-0000-0000-0000-000000000001';

    if (!name) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    // Split name into first_name and last_name
    const nameParts = name.split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || null;

    // Create or find company if provided
    let companyId = null;
    if (company) {
      const companyResult = await pool.query(
        `INSERT INTO companies (organization_id, name)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING
         RETURNING id`,
        [orgId, company]
      );
      if (companyResult.rows.length > 0) {
        companyId = companyResult.rows[0].id;
      } else {
        // Company already exists, find it
        const existingCompany = await pool.query(
          'SELECT id FROM companies WHERE organization_id = $1 AND name = $2 AND deleted_at IS NULL',
          [orgId, company]
        );
        if (existingCompany.rows.length > 0) {
          companyId = existingCompany.rows[0].id;
        }
      }
    }

    // Create contact
    const result = await pool.query(
      `INSERT INTO contacts (organization_id, company_id, first_name, last_name, email, phone, type)
       VALUES ($1, $2, $3, $4, $5, $6, 'customer')
       RETURNING id, first_name, last_name, email, phone, created_at`,
      [orgId, companyId, firstName, lastName, email, phone]
    );

    const contact = result.rows[0];
    res.status(201).json({
      id: contact.id,
      name: `${contact.first_name} ${contact.last_name || ''}`.trim(),
      email: contact.email,
      phone: contact.phone,
      company,
      created_at: contact.created_at
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update customer
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, phone, company, address } = req.body;
    const orgId = '00000000-0000-0000-0000-000000000001';

    // Split name into first_name and last_name
    const nameParts = name?.split(' ') || [];
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || null;

    // Handle company update
    let companyId = null;
    if (company) {
      const companyResult = await pool.query(
        `INSERT INTO companies (organization_id, name)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING
         RETURNING id`,
        [orgId, company]
      );
      if (companyResult.rows.length > 0) {
        companyId = companyResult.rows[0].id;
      } else {
        const existingCompany = await pool.query(
          'SELECT id FROM companies WHERE organization_id = $1 AND name = $2 AND deleted_at IS NULL',
          [orgId, company]
        );
        if (existingCompany.rows.length > 0) {
          companyId = existingCompany.rows[0].id;
        }
      }
    }

    const result = await pool.query(
      `UPDATE contacts
       SET first_name = $1, last_name = $2, email = $3, phone = $4, company_id = $5, updated_at = NOW()
       WHERE id = $6 AND organization_id = $7 AND deleted_at IS NULL
       RETURNING id`,
      [firstName, lastName, email, phone, companyId, id, orgId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }

    res.json({ id, ...req.body });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete customer (soft delete)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const orgId = '00000000-0000-0000-0000-000000000001';

    const result = await pool.query(
      `UPDATE contacts
       SET deleted_at = NOW()
       WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
       RETURNING id`,
      [id, orgId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }

    res.json({ message: 'Customer deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
