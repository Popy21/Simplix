import express, { Response } from 'express';
import { pool as db } from '../database/db';
import { Product } from '../models/types';
import { authenticateToken } from '../middleware/auth';
import { requireOrganization } from '../middleware/multiTenancy';
import {
  getOrgIdFromRequest,
  buildOrgFilter,
  ensureOrgId
} from '../utils/multiTenancyHelper';
import { AuthRequest } from '../middleware/auth';

const router = express.Router();

// Get all products
router.get('/', 
  authenticateToken, 
  requireOrganization, 
  async (req: AuthRequest, res: Response) => {
  try {
    const orgId = getOrgIdFromRequest(req);
    const { page = '1', limit = '20' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
    const offset = (pageNum - 1) * limitNum;

    const result = await db.query(
      `SELECT * FROM products 
       WHERE organization_id = $1 AND deleted_at IS NULL
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [orgId, limitNum, offset]
    );

    const countResult = await db.query(
      `SELECT COUNT(*) as total FROM products 
       WHERE organization_id = $1 AND deleted_at IS NULL`,
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

// Get product by ID
router.get('/:id', 
  authenticateToken, 
  requireOrganization, 
  async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const orgId = getOrgIdFromRequest(req);

  try {
    const result = await db.query(
      `SELECT * FROM products 
       WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL`,
      [id, orgId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create product
router.post('/', 
  authenticateToken, 
  requireOrganization, 
  async (req: AuthRequest, res: Response) => {
  const { name, description, price, stock } = req.body;
  const orgId = getOrgIdFromRequest(req);

  if (!name || price === undefined) {
    res.status(400).json({ error: 'Name and price are required' });
    return;
  }

  try {
    const result = await db.query(
      `INSERT INTO products (organization_id, name, description, price, stock, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING *`,
      [orgId, name, description, price, stock || 0]
    );

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update product
router.put('/:id', 
  authenticateToken, 
  requireOrganization, 
  async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { name, description, price, stock } = req.body;
  const orgId = getOrgIdFromRequest(req);

  try {
    const result = await db.query(
      `UPDATE products 
       SET name = $1, description = $2, price = $3, stock = $4, updated_at = NOW()
       WHERE id = $5 AND organization_id = $6 AND deleted_at IS NULL
       RETURNING *`,
      [name, description, price, stock, id, orgId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete product (soft delete)
router.delete('/:id', 
  authenticateToken, 
  requireOrganization, 
  async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const orgId = getOrgIdFromRequest(req);

  try {
    const result = await db.query(
      `UPDATE products 
       SET deleted_at = NOW()
       WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
       RETURNING id`,
      [id, orgId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    res.json({ message: 'Product deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
