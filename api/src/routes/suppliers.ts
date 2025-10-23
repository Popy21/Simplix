import express, { Response } from 'express';
import { pool as db } from '../database/db';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requireOrganization } from '../middleware/multiTenancy';
import { getOrgIdFromRequest } from '../utils/multiTenancyHelper';

const router = express.Router();

const parsePagination = (query: any) => {
  const page = Math.max(1, parseInt(query.page as string, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit as string, 10) || 20));
  return { page, limit, offset: (page - 1) * limit };
};

// List suppliers with optional filters
router.get(
  '/',
  authenticateToken,
  requireOrganization,
  async (req: AuthRequest, res: Response) => {
    try {
      const orgId = getOrgIdFromRequest(req);
      const { search, category } = req.query;
      const { page, limit, offset } = parsePagination(req.query);

      const filters: string[] = ['organization_id = $1', 'deleted_at IS NULL'];
      const filterParams: any[] = [orgId];
      let index = 2;

      if (search && typeof search === 'string') {
        filters.push(
          `(name ILIKE $${index} OR COALESCE(legal_name, '') ILIKE $${index} OR COALESCE(contact_name, '') ILIKE $${index} OR COALESCE(email, '') ILIKE $${index})`
        );
        filterParams.push(`%${search}%`);
        index += 1;
      }

      if (category && typeof category === 'string') {
        filters.push(`category = $${index}`);
        filterParams.push(category);
        index += 1;
      }

      const baseQuery = `
        SELECT id, name, legal_name, category, contact_name, email, phone, website,
               payment_terms, default_currency, tags, created_at, updated_at
        FROM suppliers
        WHERE ${filters.join(' AND ')}
        ORDER BY created_at DESC
        LIMIT $${index} OFFSET $${index + 1}
      `;

      const dataParams = [...filterParams, limit, offset];
      const result = await db.query(baseQuery, dataParams);

      const countQuery = `
        SELECT COUNT(*) AS total, COALESCE(SUM(CASE WHEN deleted_at IS NULL THEN 1 ELSE 0 END), 0) AS active
        FROM suppliers
        WHERE ${filters.join(' AND ')}
      `;

      const countResult = await db.query(countQuery, filterParams);

      const total = parseInt(countResult.rows[0]?.total || '0', 10);

      res.json({
        data: result.rows,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error: any) {
      console.error('Error fetching suppliers:', error);
      res.status(500).json({ error: 'Failed to fetch suppliers' });
    }
  }
);

// Supplier detail
router.get(
  '/:id',
  authenticateToken,
  requireOrganization,
  async (req: AuthRequest, res: Response) => {
    try {
      const orgId = getOrgIdFromRequest(req);
      const { id } = req.params;

      const result = await db.query(
        `SELECT * FROM suppliers WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL`,
        [id, orgId]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Supplier not found' });
        return;
      }

      res.json(result.rows[0]);
    } catch (error: any) {
      console.error('Error fetching supplier:', error);
      res.status(500).json({ error: 'Failed to fetch supplier' });
    }
  }
);

// Create supplier
router.post(
  '/',
  authenticateToken,
  requireOrganization,
  async (req: AuthRequest, res: Response) => {
    try {
      const orgId = getOrgIdFromRequest(req);
      const {
        name,
        legal_name,
        category,
        contact_name,
        email,
        phone,
        website,
        tax_number,
        vat_number,
        iban,
        payment_terms,
        billing_address,
        shipping_address,
        default_currency,
        notes,
        tags,
        metadata,
      } = req.body;

      if (!name) {
        res.status(400).json({ error: 'Name is required' });
        return;
      }

      const result = await db.query(
        `INSERT INTO suppliers (
            organization_id, name, legal_name, category, contact_name, email, phone, website,
            tax_number, vat_number, iban, payment_terms, billing_address, shipping_address,
            default_currency, notes, tags, metadata, created_by, updated_by
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8,
            $9, $10, $11, $12, $13::jsonb, $14::jsonb,
            $15, $16, $17, $18::jsonb, $19, $19
        ) RETURNING *`,
        [
          orgId,
          name,
          legal_name,
          category,
          contact_name,
          email,
          phone,
          website,
          tax_number,
          vat_number,
          iban,
          payment_terms || 30,
          billing_address ? JSON.stringify(billing_address) : null,
          shipping_address ? JSON.stringify(shipping_address) : null,
          default_currency || 'EUR',
          notes || null,
          tags || null,
          metadata ? JSON.stringify(metadata) : JSON.stringify({}),
          req.user?.id || null,
        ]
      );

      res.status(201).json(result.rows[0]);
    } catch (error: any) {
      console.error('Error creating supplier:', error);
      res.status(500).json({ error: 'Failed to create supplier' });
    }
  }
);

// Update supplier
router.put(
  '/:id',
  authenticateToken,
  requireOrganization,
  async (req: AuthRequest, res: Response) => {
    try {
      const orgId = getOrgIdFromRequest(req);
      const { id } = req.params;
      const {
        name,
        legal_name,
        category,
        contact_name,
        email,
        phone,
        website,
        tax_number,
        vat_number,
        iban,
        payment_terms,
        billing_address,
        shipping_address,
        default_currency,
        notes,
        tags,
        metadata,
      } = req.body;

      const result = await db.query(
        `UPDATE suppliers SET
            name = $1,
            legal_name = $2,
            category = $3,
            contact_name = $4,
            email = $5,
            phone = $6,
            website = $7,
            tax_number = $8,
            vat_number = $9,
            iban = $10,
            payment_terms = $11,
            billing_address = $12::jsonb,
            shipping_address = $13::jsonb,
            default_currency = $14,
            notes = $15,
            tags = $16,
            metadata = $17::jsonb,
            updated_by = $18,
            updated_at = NOW()
         WHERE id = $19 AND organization_id = $20 AND deleted_at IS NULL
         RETURNING *`,
        [
          name,
          legal_name,
          category,
          contact_name,
          email,
          phone,
          website,
          tax_number,
          vat_number,
          iban,
          payment_terms || 30,
          billing_address ? JSON.stringify(billing_address) : null,
          shipping_address ? JSON.stringify(shipping_address) : null,
          default_currency || 'EUR',
          notes || null,
          tags || null,
          metadata ? JSON.stringify(metadata) : JSON.stringify({}),
          req.user?.id || null,
          id,
          orgId,
        ]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Supplier not found' });
        return;
      }

      res.json(result.rows[0]);
    } catch (error: any) {
      console.error('Error updating supplier:', error);
      res.status(500).json({ error: 'Failed to update supplier' });
    }
  }
);

// Soft delete supplier
router.delete(
  '/:id',
  authenticateToken,
  requireOrganization,
  async (req: AuthRequest, res: Response) => {
    try {
      const orgId = getOrgIdFromRequest(req);
      const { id } = req.params;

      const result = await db.query(
        `UPDATE suppliers
         SET deleted_at = NOW(), updated_by = $1
         WHERE id = $2 AND organization_id = $3 AND deleted_at IS NULL
         RETURNING id`,
        [req.user?.id || null, id, orgId]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Supplier not found' });
        return;
      }

      res.json({ message: 'Supplier archived successfully' });
    } catch (error: any) {
      console.error('Error deleting supplier:', error);
      res.status(500).json({ error: 'Failed to archive supplier' });
    }
  }
);

// Supplier stats summary
router.get(
  '/stats/summary',
  authenticateToken,
  requireOrganization,
  async (req: AuthRequest, res: Response) => {
    try {
      const orgId = getOrgIdFromRequest(req);

      const stats = await db.query(
        `SELECT
            COUNT(*) FILTER (WHERE deleted_at IS NULL) AS total_active,
            COUNT(*) FILTER (WHERE deleted_at IS NOT NULL) AS total_archived,
            COUNT(*) FILTER (WHERE category = 'vendor' AND deleted_at IS NULL) AS vendors,
            COUNT(*) FILTER (WHERE category = 'service' AND deleted_at IS NULL) AS services,
            COUNT(*) FILTER (WHERE category = 'freelancer' AND deleted_at IS NULL) AS freelancers
         FROM suppliers
         WHERE organization_id = $1`,
        [orgId]
      );

      res.json(stats.rows[0]);
    } catch (error: any) {
      console.error('Error fetching supplier stats:', error);
      res.status(500).json({ error: 'Failed to fetch supplier stats' });
    }
  }
);

export default router;
