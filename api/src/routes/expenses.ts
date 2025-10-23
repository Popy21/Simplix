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

// List expenses with filters
router.get(
  '/',
  authenticateToken,
  requireOrganization,
  async (req: AuthRequest, res: Response) => {
    try {
      const orgId = getOrgIdFromRequest(req);
      const { status, supplierId, categoryId, paymentStatus, search, from, to } = req.query;
      const { page, limit, offset } = parsePagination(req.query);

      const filters: string[] = ['e.organization_id = $1', 'e.deleted_at IS NULL'];
      const filterParams: any[] = [orgId];
      let nextParam = 2;

      if (status && typeof status === 'string') {
        filters.push(`e.status = $${nextParam}`);
        filterParams.push(status);
        nextParam += 1;
      }

      if (paymentStatus && typeof paymentStatus === 'string') {
        filters.push(`e.payment_status = $${nextParam}`);
        filterParams.push(paymentStatus);
        nextParam += 1;
      }

      if (supplierId && typeof supplierId === 'string') {
        filters.push(`e.supplier_id = $${nextParam}`);
        filterParams.push(supplierId);
        nextParam += 1;
      }

      if (categoryId && typeof categoryId === 'string') {
        filters.push(`e.category_id = $${nextParam}`);
        filterParams.push(categoryId);
        nextParam += 1;
      }

      if (search && typeof search === 'string') {
        filters.push(
          `(COALESCE(e.description, '') ILIKE $${nextParam} OR COALESCE(e.reference, '') ILIKE $${nextParam})`
        );
        filterParams.push(`%${search}%`);
        nextParam += 1;
      }

      if (from && typeof from === 'string') {
        filters.push(`e.expense_date >= $${nextParam}`);
        filterParams.push(from);
        nextParam += 1;
      }

      if (to && typeof to === 'string') {
        filters.push(`e.expense_date <= $${nextParam}`);
        filterParams.push(to);
        nextParam += 1;
      }

      const query = `
        SELECT 
          e.id,
          e.expense_date,
          e.due_date,
          e.description,
          e.reference,
          e.amount,
          e.tax_amount,
          e.currency,
          e.status,
          e.payment_status,
          e.expense_type,
          e.payment_method,
          e.attachments,
          e.notes,
          e.supplier_id,
          COALESCE(s.name, s.legal_name) AS supplier_name,
          e.category_id,
          c.name AS category_name,
          e.created_at,
          e.updated_at
        FROM expenses e
        LEFT JOIN suppliers s ON e.supplier_id = s.id
        LEFT JOIN expense_categories c ON e.category_id = c.id
        WHERE ${filters.join(' AND ')}
        ORDER BY e.expense_date DESC
        LIMIT $${nextParam} OFFSET $${nextParam + 1}
      `;

      const dataParams = [...filterParams, limit, offset];
      const result = await db.query(query, dataParams);

      const countQuery = `
        SELECT
          COUNT(*) AS total,
          COALESCE(SUM(amount), 0) AS total_amount,
          COALESCE(SUM(tax_amount), 0) AS total_tax
        FROM expenses e
        WHERE ${filters.join(' AND ')}
      `;

      const countResult = await db.query(countQuery, filterParams);

      const total = parseInt(countResult.rows[0]?.total || '0', 10);

      res.json({
        data: result.rows,
        meta: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          amount: countResult.rows[0]?.total_amount || 0,
          tax: countResult.rows[0]?.total_tax || 0,
        },
      });
    } catch (error: any) {
      console.error('Error fetching expenses:', error);
      res.status(500).json({ error: 'Failed to fetch expenses' });
    }
  }
);

// Expense detail
router.get(
  '/:id',
  authenticateToken,
  requireOrganization,
  async (req: AuthRequest, res: Response) => {
    try {
      const orgId = getOrgIdFromRequest(req);
      const { id } = req.params;

      const result = await db.query(
        `SELECT 
            e.*,
            COALESCE(s.name, s.legal_name) AS supplier_name,
            c.name AS category_name
         FROM expenses e
         LEFT JOIN suppliers s ON e.supplier_id = s.id
         LEFT JOIN expense_categories c ON e.category_id = c.id
         WHERE e.id = $1 AND e.organization_id = $2 AND e.deleted_at IS NULL`,
        [id, orgId]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Expense not found' });
        return;
      }

      res.json(result.rows[0]);
    } catch (error: any) {
      console.error('Error fetching expense:', error);
      res.status(500).json({ error: 'Failed to fetch expense' });
    }
  }
);

// Create expense
router.post(
  '/',
  authenticateToken,
  requireOrganization,
  async (req: AuthRequest, res: Response) => {
    try {
      const orgId = getOrgIdFromRequest(req);
      const {
        supplier_id,
        category_id,
        expense_date,
        due_date,
        description,
        reference,
        amount,
        tax_amount,
        currency,
        status,
        payment_status,
        expense_type,
        payment_method,
        notes,
        attachments,
        metadata,
      } = req.body;

      if (!amount || Number.isNaN(Number(amount))) {
        res.status(400).json({ error: 'Amount is required and must be a number' });
        return;
      }

      const result = await db.query(
        `INSERT INTO expenses (
            organization_id,
            supplier_id,
            category_id,
            submitted_by,
            status,
            payment_status,
            expense_type,
            expense_date,
            due_date,
            description,
            reference,
            amount,
            tax_amount,
            currency,
            payment_method,
            attachments,
            notes,
            metadata
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7,
            $8, $9, $10, $11, $12, $13, $14,
            $15, $16::jsonb, $17, $18::jsonb
        )
        RETURNING *`,
        [
          orgId,
          supplier_id || null,
          category_id || null,
          req.user?.id || null,
          status || 'submitted',
          payment_status || 'unpaid',
          expense_type || 'purchase',
          expense_date || new Date(),
          due_date || null,
          description || null,
          reference || null,
          Number(amount),
          tax_amount ? Number(tax_amount) : 0,
          currency || 'EUR',
          payment_method || null,
          attachments ? JSON.stringify(attachments) : JSON.stringify([]),
          notes || null,
          metadata ? JSON.stringify(metadata) : JSON.stringify({}),
        ]
      );

      res.status(201).json(result.rows[0]);
    } catch (error: any) {
      console.error('Error creating expense:', error);
      res.status(500).json({ error: 'Failed to create expense' });
    }
  }
);

// Update expense
router.put(
  '/:id',
  authenticateToken,
  requireOrganization,
  async (req: AuthRequest, res: Response) => {
    try {
      const orgId = getOrgIdFromRequest(req);
      const { id } = req.params;
      const {
        supplier_id,
        category_id,
        expense_date,
        due_date,
        description,
        reference,
        amount,
        tax_amount,
        currency,
        status,
        payment_status,
        expense_type,
        payment_method,
        notes,
        attachments,
        metadata,
      } = req.body;

      const result = await db.query(
        `UPDATE expenses SET
            supplier_id = COALESCE($1, supplier_id),
            category_id = COALESCE($2, category_id),
            expense_date = COALESCE($3, expense_date),
            due_date = COALESCE($4, due_date),
            description = COALESCE($5, description),
            reference = COALESCE($6, reference),
            amount = COALESCE($7, amount),
            tax_amount = COALESCE($8, tax_amount),
            currency = COALESCE($9, currency),
            status = COALESCE($10, status),
            payment_status = COALESCE($11, payment_status),
            expense_type = COALESCE($12, expense_type),
            payment_method = COALESCE($13, payment_method),
            notes = COALESCE($14, notes),
            attachments = COALESCE($15::jsonb, attachments),
            metadata = COALESCE($16::jsonb, metadata),
            updated_at = NOW()
         WHERE id = $17 AND organization_id = $18 AND deleted_at IS NULL
         RETURNING *`,
        [
          supplier_id ?? null,
          category_id ?? null,
          expense_date || null,
          due_date || null,
          description ?? null,
          reference ?? null,
          amount !== undefined ? Number(amount) : null,
          tax_amount !== undefined ? Number(tax_amount) : null,
          currency ?? null,
          status ?? null,
          payment_status ?? null,
          expense_type ?? null,
          payment_method ?? null,
          notes ?? null,
          attachments ? JSON.stringify(attachments) : null,
          metadata ? JSON.stringify(metadata) : null,
          id,
          orgId,
        ]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Expense not found' });
        return;
      }

      res.json(result.rows[0]);
    } catch (error: any) {
      console.error('Error updating expense:', error);
      res.status(500).json({ error: 'Failed to update expense' });
    }
  }
);

// Update status/payment_status
router.patch(
  '/:id/status',
  authenticateToken,
  requireOrganization,
  async (req: AuthRequest, res: Response) => {
    try {
      const orgId = getOrgIdFromRequest(req);
      const { id } = req.params;
      const { status, payment_status, payment_date, approved_by } = req.body;

      if (!status && !payment_status) {
        res.status(400).json({ error: 'status or payment_status is required' });
        return;
      }

      const result = await db.query(
        `UPDATE expenses SET
            status = COALESCE($1, status),
            payment_status = COALESCE($2, payment_status),
            payment_date = COALESCE($3, payment_date),
            approved_by = COALESCE($4, approved_by),
            updated_at = NOW()
         WHERE id = $5 AND organization_id = $6 AND deleted_at IS NULL
         RETURNING *`,
        [
          status || null,
          payment_status || null,
          payment_date || null,
          approved_by || req.user?.id || null,
          id,
          orgId,
        ]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Expense not found' });
        return;
      }

      res.json(result.rows[0]);
    } catch (error: any) {
      console.error('Error updating status:', error);
      res.status(500).json({ error: 'Failed to update expense status' });
    }
  }
);

// Soft delete expense
router.delete(
  '/:id',
  authenticateToken,
  requireOrganization,
  async (req: AuthRequest, res: Response) => {
    try {
      const orgId = getOrgIdFromRequest(req);
      const { id } = req.params;

      const result = await db.query(
        `UPDATE expenses
         SET deleted_at = NOW()
         WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
         RETURNING id`,
        [id, orgId]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Expense not found' });
        return;
      }

      res.json({ message: 'Expense archived successfully' });
    } catch (error: any) {
      console.error('Error deleting expense:', error);
      res.status(500).json({ error: 'Failed to delete expense' });
    }
  }
);

// Expense summary
router.get(
  '/stats/summary',
  authenticateToken,
  requireOrganization,
  async (req: AuthRequest, res: Response) => {
    try {
      const orgId = getOrgIdFromRequest(req);

      const summary = await db.query(
        `SELECT
            COUNT(*) FILTER (WHERE deleted_at IS NULL) AS total_expenses,
            COALESCE(SUM(amount), 0) FILTER (WHERE deleted_at IS NULL) AS total_amount,
            COALESCE(SUM(amount - tax_amount), 0) FILTER (WHERE deleted_at IS NULL) AS total_ht,
            COUNT(*) FILTER (WHERE status = 'submitted' AND deleted_at IS NULL) AS pending_approval,
            COUNT(*) FILTER (WHERE payment_status = 'unpaid' AND deleted_at IS NULL) AS unpaid,
            COUNT(*) FILTER (WHERE payment_status = 'paid' AND deleted_at IS NULL) AS paid,
            COALESCE(SUM(amount), 0) FILTER (WHERE payment_status = 'paid' AND deleted_at IS NULL) AS paid_amount
         FROM expenses
         WHERE organization_id = $1`,
        [orgId]
      );

      res.json(summary.rows[0]);
    } catch (error: any) {
      console.error('Error fetching expense summary:', error);
      res.status(500).json({ error: 'Failed to fetch expense summary' });
    }
  }
);

export default router;
