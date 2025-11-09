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
 * GET /api/bank-accounts
 * Liste des comptes bancaires
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { organization_id } = req.body;

    const result = await pool.query(
      `SELECT
        ba.*,
        (SELECT COUNT(*) FROM bank_transactions bt
         WHERE bt.bank_account_id = ba.id AND bt.deleted_at IS NULL) as transaction_count,
        (SELECT MAX(transaction_date) FROM bank_transactions bt
         WHERE bt.bank_account_id = ba.id AND bt.deleted_at IS NULL) as last_transaction_date
       FROM bank_accounts ba
       WHERE ba.organization_id = $1 AND ba.deleted_at IS NULL
       ORDER BY ba.is_default DESC, ba.account_name ASC`,
      [organization_id]
    );

    res.json(result.rows);
  } catch (error) {
    logger.error('Error fetching bank accounts:', error);
    res.status(500).json({ error: 'Failed to fetch bank accounts' });
  }
});

/**
 * GET /api/bank-accounts/:id
 * Détails d'un compte bancaire
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { organization_id } = req.body;

    const result = await pool.query(
      `SELECT ba.*,
        (SELECT COUNT(*) FROM bank_transactions bt
         WHERE bt.bank_account_id = ba.id AND bt.deleted_at IS NULL) as transaction_count
       FROM bank_accounts ba
       WHERE ba.id = $1 AND ba.organization_id = $2 AND ba.deleted_at IS NULL`,
      [id, organization_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Bank account not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Error fetching bank account:', error);
    res.status(500).json({ error: 'Failed to fetch bank account' });
  }
});

/**
 * POST /api/bank-accounts
 * Créer un compte bancaire
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      organization_id,
      account_name,
      bank_name,
      account_number,
      iban,
      bic,
      currency = 'EUR',
      opening_balance = 0,
      is_default = false,
      notes
    } = req.body;

    // Validation
    if (!account_name || !bank_name) {
      return res.status(400).json({ error: 'Account name and bank name are required' });
    }

    // Si c'est le compte par défaut, retirer le flag des autres
    if (is_default) {
      await pool.query(
        `UPDATE bank_accounts SET is_default = false
         WHERE organization_id = $1 AND deleted_at IS NULL`,
        [organization_id]
      );
    }

    const result = await pool.query(
      `INSERT INTO bank_accounts (
        organization_id, account_name, bank_name, account_number, iban, bic,
        currency, opening_balance, current_balance, is_default, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8, $9, $10)
      RETURNING *`,
      [
        organization_id, account_name, bank_name, account_number, iban, bic,
        currency, opening_balance, is_default, notes
      ]
    );

    logger.info(`Bank account created: ${result.rows[0].id}`);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    logger.error('Error creating bank account:', error);
    res.status(500).json({ error: 'Failed to create bank account' });
  }
});

/**
 * PUT /api/bank-accounts/:id
 * Modifier un compte bancaire
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      organization_id,
      account_name,
      bank_name,
      account_number,
      iban,
      bic,
      currency,
      is_active,
      is_default,
      notes
    } = req.body;

    // Si c'est le compte par défaut, retirer le flag des autres
    if (is_default) {
      await pool.query(
        `UPDATE bank_accounts SET is_default = false
         WHERE organization_id = $1 AND id != $2 AND deleted_at IS NULL`,
        [organization_id, id]
      );
    }

    const result = await pool.query(
      `UPDATE bank_accounts SET
        account_name = COALESCE($1, account_name),
        bank_name = COALESCE($2, bank_name),
        account_number = COALESCE($3, account_number),
        iban = COALESCE($4, iban),
        bic = COALESCE($5, bic),
        currency = COALESCE($6, currency),
        is_active = COALESCE($7, is_active),
        is_default = COALESCE($8, is_default),
        notes = COALESCE($9, notes),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $10 AND organization_id = $11 AND deleted_at IS NULL
      RETURNING *`,
      [account_name, bank_name, account_number, iban, bic, currency, is_active, is_default, notes, id, organization_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Bank account not found' });
    }

    logger.info(`Bank account updated: ${id}`);
    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Error updating bank account:', error);
    res.status(500).json({ error: 'Failed to update bank account' });
  }
});

/**
 * DELETE /api/bank-accounts/:id
 * Supprimer un compte bancaire (soft delete)
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { organization_id } = req.body;

    // Vérifier s'il y a des transactions
    const transactionsCheck = await pool.query(
      `SELECT COUNT(*) as count FROM bank_transactions
       WHERE bank_account_id = $1 AND deleted_at IS NULL`,
      [id]
    );

    if (parseInt(transactionsCheck.rows[0].count) > 0) {
      return res.status(400).json({
        error: 'Cannot delete bank account with existing transactions. Archive it instead.'
      });
    }

    const result = await pool.query(
      `UPDATE bank_accounts SET
        deleted_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
      RETURNING *`,
      [id, organization_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Bank account not found' });
    }

    logger.info(`Bank account deleted: ${id}`);
    res.json({ message: 'Bank account deleted successfully' });
  } catch (error) {
    logger.error('Error deleting bank account:', error);
    res.status(500).json({ error: 'Failed to delete bank account' });
  }
});

/**
 * GET /api/bank-accounts/:id/balance
 * Obtenir le solde d'un compte
 */
router.get('/:id/balance', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { organization_id } = req.body;

    const result = await pool.query(
      `SELECT
        ba.id,
        ba.account_name,
        ba.opening_balance,
        ba.current_balance,
        ba.currency,
        (SELECT COUNT(*) FROM bank_transactions bt
         WHERE bt.bank_account_id = ba.id
         AND bt.reconciliation_status = 'pending'
         AND bt.deleted_at IS NULL) as pending_transactions,
        (SELECT SUM(amount) FROM bank_transactions bt
         WHERE bt.bank_account_id = ba.id
         AND bt.transaction_type = 'credit'
         AND bt.transaction_date >= CURRENT_DATE - INTERVAL '30 days'
         AND bt.deleted_at IS NULL) as credits_30d,
        (SELECT SUM(amount) FROM bank_transactions bt
         WHERE bt.bank_account_id = ba.id
         AND bt.transaction_type = 'debit'
         AND bt.transaction_date >= CURRENT_DATE - INTERVAL '30 days'
         AND bt.deleted_at IS NULL) as debits_30d
       FROM bank_accounts ba
       WHERE ba.id = $1 AND ba.organization_id = $2 AND ba.deleted_at IS NULL`,
      [id, organization_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Bank account not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Error fetching bank account balance:', error);
    res.status(500).json({ error: 'Failed to fetch balance' });
  }
});

/**
 * POST /api/bank-accounts/:id/adjust-balance
 * Ajuster manuellement le solde (crée une transaction d'ajustement)
 */
router.post('/:id/adjust-balance', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { organization_id, new_balance, reason } = req.body;

    if (new_balance === undefined) {
      return res.status(400).json({ error: 'New balance is required' });
    }

    // Récupérer solde actuel
    const accountResult = await pool.query(
      `SELECT current_balance FROM bank_accounts
       WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL`,
      [id, organization_id]
    );

    if (accountResult.rows.length === 0) {
      return res.status(404).json({ error: 'Bank account not found' });
    }

    const currentBalance = parseFloat(accountResult.rows[0].current_balance);
    const difference = new_balance - currentBalance;

    if (difference === 0) {
      return res.json({ message: 'Balance already matches', current_balance: currentBalance });
    }

    // Créer transaction d'ajustement
    const transactionType = difference > 0 ? 'credit' : 'debit';
    const amount = Math.abs(difference);

    await pool.query(
      `INSERT INTO bank_transactions (
        organization_id, bank_account_id, transaction_date, description,
        amount, transaction_type, reconciliation_status, category, notes
      ) VALUES ($1, $2, CURRENT_DATE, $3, $4, $5, 'confirmed', 'adjustment', $6)`,
      [
        organization_id,
        id,
        'Balance adjustment',
        amount,
        transactionType,
        reason || 'Manual balance adjustment'
      ]
    );

    // Le trigger mettra à jour automatiquement le solde
    const updatedAccount = await pool.query(
      `SELECT * FROM bank_accounts WHERE id = $1`,
      [id]
    );

    logger.info(`Bank account balance adjusted: ${id} (${difference > 0 ? '+' : ''}${difference})`);
    res.json(updatedAccount.rows[0]);
  } catch (error) {
    logger.error('Error adjusting balance:', error);
    res.status(500).json({ error: 'Failed to adjust balance' });
  }
});

export default router;
