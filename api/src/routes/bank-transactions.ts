import express, { Request, Response } from 'express';
import { pool } from '../database/connection';
import { authenticateToken } from '../middleware/auth';
import { requireOrganization } from '../middleware/organization';
import logger from '../utils/logger';

const router = express.Router();

// Middleware
router.use(authenticateToken);
router.use(requireOrganization);

/**
 * GET /api/bank-transactions
 * Liste des transactions bancaires
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { organization_id } = req.body;
    const {
      bank_account_id,
      status,
      start_date,
      end_date,
      transaction_type,
      limit = 100,
      offset = 0
    } = req.query;

    let query = `
      SELECT
        bt.*,
        ba.account_name,
        ba.bank_name,
        i.invoice_number as matched_invoice_number,
        e.expense_number as matched_expense_number
      FROM bank_transactions bt
      JOIN bank_accounts ba ON ba.id = bt.bank_account_id
      LEFT JOIN invoices i ON i.id = bt.matched_invoice_id
      LEFT JOIN expenses e ON e.id = bt.matched_expense_id
      WHERE bt.organization_id = $1 AND bt.deleted_at IS NULL
    `;

    const params: any[] = [organization_id];
    let paramIndex = 2;

    if (bank_account_id) {
      query += ` AND bt.bank_account_id = $${paramIndex++}`;
      params.push(bank_account_id);
    }

    if (status) {
      query += ` AND bt.reconciliation_status = $${paramIndex++}`;
      params.push(status);
    }

    if (start_date) {
      query += ` AND bt.transaction_date >= $${paramIndex++}`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND bt.transaction_date <= $${paramIndex++}`;
      params.push(end_date);
    }

    if (transaction_type) {
      query += ` AND bt.transaction_type = $${paramIndex++}`;
      params.push(transaction_type);
    }

    query += ` ORDER BY bt.transaction_date DESC, bt.created_at DESC`;
    query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Compter total pour pagination
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM bank_transactions
       WHERE organization_id = $1 AND deleted_at IS NULL`,
      [organization_id]
    );

    res.json({
      transactions: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    });
  } catch (error) {
    logger.error('Error fetching bank transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

/**
 * GET /api/bank-transactions/unreconciled
 * Transactions non rapprochées (pour rapprochement automatique)
 */
router.get('/unreconciled', async (req: Request, res: Response) => {
  try {
    const { organization_id } = req.body;
    const { bank_account_id } = req.query;

    let query = `
      SELECT bt.*, ba.account_name, ba.bank_name
      FROM bank_transactions bt
      JOIN bank_accounts ba ON ba.id = bt.bank_account_id
      WHERE bt.organization_id = $1
        AND bt.reconciliation_status = 'pending'
        AND bt.deleted_at IS NULL
    `;

    const params: any[] = [organization_id];

    if (bank_account_id) {
      query += ` AND bt.bank_account_id = $2`;
      params.push(bank_account_id);
    }

    query += ` ORDER BY bt.transaction_date DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    logger.error('Error fetching unreconciled transactions:', error);
    res.status(500).json({ error: 'Failed to fetch unreconciled transactions' });
  }
});

/**
 * POST /api/bank-transactions
 * Créer une transaction bancaire manuelle
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      organization_id,
      bank_account_id,
      transaction_date,
      description,
      amount,
      transaction_type,
      counterparty_name,
      category,
      notes
    } = req.body;

    // Validation
    if (!bank_account_id || !transaction_date || !description || !amount || !transaction_type) {
      return res.status(400).json({
        error: 'Bank account, date, description, amount and type are required'
      });
    }

    const result = await pool.query(
      `INSERT INTO bank_transactions (
        organization_id, bank_account_id, transaction_date, description,
        amount, transaction_type, counterparty_name, category, notes,
        reconciliation_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')
      RETURNING *`,
      [
        organization_id, bank_account_id, transaction_date, description,
        amount, transaction_type, counterparty_name, category, notes
      ]
    );

    logger.info(`Bank transaction created: ${result.rows[0].id}`);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    logger.error('Error creating bank transaction:', error);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

/**
 * POST /api/bank-transactions/import
 * Importer des transactions bancaires (format CSV)
 */
router.post('/import', async (req: Request, res: Response) => {
  try {
    const { organization_id, bank_account_id, transactions } = req.body;

    if (!bank_account_id || !Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({ error: 'Bank account and transactions array required' });
    }

    const imported = [];
    const errors = [];

    for (const tx of transactions) {
      try {
        // Vérifier doublon (même date + montant + description)
        const duplicateCheck = await pool.query(
          `SELECT id FROM bank_transactions
           WHERE bank_account_id = $1
             AND transaction_date = $2
             AND amount = $3
             AND description = $4
             AND deleted_at IS NULL`,
          [bank_account_id, tx.transaction_date, tx.amount, tx.description]
        );

        if (duplicateCheck.rows.length > 0) {
          errors.push({ transaction: tx, error: 'Duplicate transaction' });
          continue;
        }

        const result = await pool.query(
          `INSERT INTO bank_transactions (
            organization_id, bank_account_id, transaction_date, value_date,
            description, amount, transaction_type, bank_reference,
            counterparty_name, counterparty_account, category
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING *`,
          [
            organization_id,
            bank_account_id,
            tx.transaction_date,
            tx.value_date || tx.transaction_date,
            tx.description,
            Math.abs(tx.amount),
            tx.amount >= 0 ? 'credit' : 'debit',
            tx.reference,
            tx.counterparty_name,
            tx.counterparty_account,
            tx.category
          ]
        );

        imported.push(result.rows[0]);
      } catch (err: any) {
        errors.push({ transaction: tx, error: err.message });
      }
    }

    logger.info(`Bank transactions imported: ${imported.length} success, ${errors.length} errors`);
    res.json({
      imported: imported.length,
      errors: errors.length,
      transactions: imported,
      error_details: errors
    });
  } catch (error) {
    logger.error('Error importing transactions:', error);
    res.status(500).json({ error: 'Failed to import transactions' });
  }
});

/**
 * POST /api/bank-transactions/:id/reconcile
 * Rapprocher une transaction avec une facture/dépense/paiement
 */
router.post('/:id/reconcile', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { organization_id, user_id, match_type, match_id } = req.body;

    // Validation
    if (!match_type || !match_id) {
      return res.status(400).json({ error: 'Match type and ID required' });
    }

    const validTypes = ['invoice', 'expense', 'payment'];
    if (!validTypes.includes(match_type)) {
      return res.status(400).json({ error: 'Invalid match type' });
    }

    // Vérifier que le document existe
    let matchColumn = '';
    let checkQuery = '';

    switch (match_type) {
      case 'invoice':
        matchColumn = 'matched_invoice_id';
        checkQuery = 'SELECT id FROM invoices WHERE id = $1 AND organization_id = $2';
        break;
      case 'expense':
        matchColumn = 'matched_expense_id';
        checkQuery = 'SELECT id FROM expenses WHERE id = $1 AND organization_id = $2';
        break;
      case 'payment':
        matchColumn = 'matched_payment_id';
        checkQuery = 'SELECT id FROM payments WHERE id = $1 AND organization_id = $2';
        break;
    }

    const checkResult = await pool.query(checkQuery, [match_id, organization_id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: `${match_type} not found` });
    }

    // Rapprocher
    const result = await pool.query(
      `UPDATE bank_transactions SET
        ${matchColumn} = $1,
        reconciliation_status = 'matched',
        reconciled_at = CURRENT_TIMESTAMP,
        reconciled_by = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3 AND organization_id = $4 AND deleted_at IS NULL
      RETURNING *`,
      [match_id, user_id, id, organization_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    logger.info(`Transaction reconciled: ${id} with ${match_type} ${match_id}`);
    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Error reconciling transaction:', error);
    res.status(500).json({ error: 'Failed to reconcile transaction' });
  }
});

/**
 * POST /api/bank-transactions/:id/unreconcile
 * Annuler le rapprochement d'une transaction
 */
router.post('/:id/unreconcile', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { organization_id } = req.body;

    const result = await pool.query(
      `UPDATE bank_transactions SET
        matched_invoice_id = NULL,
        matched_expense_id = NULL,
        matched_payment_id = NULL,
        reconciliation_status = 'pending',
        reconciled_at = NULL,
        reconciled_by = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
      RETURNING *`,
      [id, organization_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    logger.info(`Transaction unreconciled: ${id}`);
    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Error unreconciling transaction:', error);
    res.status(500).json({ error: 'Failed to unreconcile transaction' });
  }
});

/**
 * POST /api/bank-transactions/auto-reconcile
 * Rapprochement automatique intelligent
 */
router.post('/auto-reconcile', async (req: Request, res: Response) => {
  try {
    const { organization_id, bank_account_id, tolerance_days = 7, tolerance_amount = 0.01 } = req.body;

    // Récupérer transactions non rapprochées
    const transactionsResult = await pool.query(
      `SELECT * FROM bank_transactions
       WHERE organization_id = $1
         AND ($2::uuid IS NULL OR bank_account_id = $2)
         AND reconciliation_status = 'pending'
         AND deleted_at IS NULL
       ORDER BY transaction_date DESC`,
      [organization_id, bank_account_id]
    );

    const matched = [];
    const unmatched = [];

    for (const tx of transactionsResult.rows) {
      let matchFound = false;

      // Essayer de matcher avec factures (pour crédits)
      if (tx.transaction_type === 'credit') {
        const invoiceMatch = await pool.query(
          `SELECT i.* FROM invoices i
           WHERE i.organization_id = $1
             AND i.status = 'sent'
             AND ABS(i.total_amount - $2) <= $3
             AND i.due_date BETWEEN ($4::date - INTERVAL '${tolerance_days} days')
                                AND ($4::date + INTERVAL '${tolerance_days} days')
             AND NOT EXISTS (
               SELECT 1 FROM bank_transactions bt2
               WHERE bt2.matched_invoice_id = i.id AND bt2.deleted_at IS NULL
             )
           ORDER BY ABS(i.total_amount - $2) ASC, ABS(i.due_date - $4) ASC
           LIMIT 1`,
          [organization_id, tx.amount, tolerance_amount, tx.transaction_date]
        );

        if (invoiceMatch.rows.length > 0) {
          const invoice = invoiceMatch.rows[0];

          await pool.query(
            `UPDATE bank_transactions SET
              matched_invoice_id = $1,
              reconciliation_status = 'matched',
              reconciled_at = CURRENT_TIMESTAMP,
              notes = COALESCE(notes || ' - ', '') || 'Auto-matched with invoice ' || $2
            WHERE id = $3`,
            [invoice.id, invoice.invoice_number, tx.id]
          );

          // Marquer facture comme payée
          await pool.query(
            `UPDATE invoices SET status = 'paid', updated_at = CURRENT_TIMESTAMP
             WHERE id = $1`,
            [invoice.id]
          );

          matched.push({ transaction: tx, matched_with: 'invoice', invoice_number: invoice.invoice_number });
          matchFound = true;
        }
      }

      // Essayer de matcher avec dépenses (pour débits)
      if (!matchFound && tx.transaction_type === 'debit') {
        const expenseMatch = await pool.query(
          `SELECT e.* FROM expenses e
           WHERE e.organization_id = $1
             AND e.payment_status IN ('pending', 'partial')
             AND ABS(e.amount - $2) <= $3
             AND e.expense_date BETWEEN ($4::date - INTERVAL '${tolerance_days} days')
                                    AND ($4::date + INTERVAL '${tolerance_days} days')
             AND NOT EXISTS (
               SELECT 1 FROM bank_transactions bt2
               WHERE bt2.matched_expense_id = e.id AND bt2.deleted_at IS NULL
             )
           ORDER BY ABS(e.amount - $2) ASC, ABS(e.expense_date - $4) ASC
           LIMIT 1`,
          [organization_id, tx.amount, tolerance_amount, tx.transaction_date]
        );

        if (expenseMatch.rows.length > 0) {
          const expense = expenseMatch.rows[0];

          await pool.query(
            `UPDATE bank_transactions SET
              matched_expense_id = $1,
              reconciliation_status = 'matched',
              reconciled_at = CURRENT_TIMESTAMP,
              notes = COALESCE(notes || ' - ', '') || 'Auto-matched with expense ' || $2
            WHERE id = $3`,
            [expense.id, expense.expense_number, tx.id]
          );

          // Marquer dépense comme payée
          await pool.query(
            `UPDATE expenses SET payment_status = 'paid', updated_at = CURRENT_TIMESTAMP
             WHERE id = $1`,
            [expense.id]
          );

          matched.push({ transaction: tx, matched_with: 'expense', expense_number: expense.expense_number });
          matchFound = true;
        }
      }

      if (!matchFound) {
        unmatched.push(tx);
      }
    }

    logger.info(`Auto-reconciliation completed: ${matched.length} matched, ${unmatched.length} unmatched`);
    res.json({
      matched: matched.length,
      unmatched: unmatched.length,
      matched_transactions: matched,
      unmatched_transactions: unmatched
    });
  } catch (error) {
    logger.error('Error in auto-reconciliation:', error);
    res.status(500).json({ error: 'Failed to auto-reconcile transactions' });
  }
});

/**
 * DELETE /api/bank-transactions/:id
 * Supprimer une transaction (soft delete)
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { organization_id } = req.body;

    const result = await pool.query(
      `UPDATE bank_transactions SET
        deleted_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
      RETURNING *`,
      [id, organization_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    logger.info(`Bank transaction deleted: ${id}`);
    res.json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    logger.error('Error deleting transaction:', error);
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
});

/**
 * GET /api/bank-transactions/stats
 * Statistiques des transactions bancaires
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const { organization_id } = req.body;
    const { bank_account_id, period = '30' } = req.query;

    let accountFilter = '';
    const params: any[] = [organization_id, period];

    if (bank_account_id) {
      accountFilter = 'AND bank_account_id = $3';
      params.push(bank_account_id);
    }

    const result = await pool.query(
      `SELECT
        COUNT(*) as total_transactions,
        COUNT(*) FILTER (WHERE reconciliation_status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE reconciliation_status = 'matched') as matched_count,
        COUNT(*) FILTER (WHERE reconciliation_status = 'confirmed') as confirmed_count,
        SUM(amount) FILTER (WHERE transaction_type = 'credit' AND transaction_date >= CURRENT_DATE - INTERVAL '1 day' * $2) as total_credits,
        SUM(amount) FILTER (WHERE transaction_type = 'debit' AND transaction_date >= CURRENT_DATE - INTERVAL '1 day' * $2) as total_debits,
        AVG(amount) as average_amount
      FROM bank_transactions
      WHERE organization_id = $1
        AND deleted_at IS NULL
        ${accountFilter}`,
      params
    );

    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Error fetching transaction stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

export default router;
