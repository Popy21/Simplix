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
 * GET /api/tax-rates
 * Liste des taux de TVA
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { organization_id } = req.body;
    const { country_code, is_active = true } = req.query;

    let query = `
      SELECT * FROM tax_rates
      WHERE organization_id = $1 AND deleted_at IS NULL
    `;

    const params: any[] = [organization_id];
    let paramIndex = 2;

    if (country_code) {
      query += ` AND country_code = $${paramIndex++}`;
      params.push(country_code);
    }

    if (is_active !== undefined) {
      query += ` AND is_active = $${paramIndex++}`;
      params.push(is_active === 'true');
    }

    query += ` AND (valid_until IS NULL OR valid_until >= CURRENT_DATE)`;
    query += ` ORDER BY is_default DESC, rate DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    logger.error('Error fetching tax rates:', error);
    res.status(500).json({ error: 'Failed to fetch tax rates' });
  }
});

/**
 * GET /api/tax-rates/:id
 * Détails d'un taux de TVA
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { organization_id } = req.body;

    const result = await pool.query(
      `SELECT * FROM tax_rates
       WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL`,
      [id, organization_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tax rate not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Error fetching tax rate:', error);
    res.status(500).json({ error: 'Failed to fetch tax rate' });
  }
});

/**
 * POST /api/tax-rates
 * Créer un taux de TVA
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      organization_id,
      name,
      rate,
      country_code = 'FR',
      tax_type = 'vat',
      is_default = false,
      account_number,
      valid_from,
      valid_until,
      description
    } = req.body;

    // Validation
    if (!name || rate === undefined) {
      return res.status(400).json({ error: 'Name and rate are required' });
    }

    if (rate < 0 || rate > 100) {
      return res.status(400).json({ error: 'Rate must be between 0 and 100' });
    }

    // Si c'est le taux par défaut, retirer le flag des autres
    if (is_default) {
      await pool.query(
        `UPDATE tax_rates SET is_default = false
         WHERE organization_id = $1 AND country_code = $2 AND deleted_at IS NULL`,
        [organization_id, country_code]
      );
    }

    const result = await pool.query(
      `INSERT INTO tax_rates (
        organization_id, name, rate, country_code, tax_type, is_default,
        account_number, valid_from, valid_until, description
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        organization_id, name, rate, country_code, tax_type, is_default,
        account_number, valid_from || new Date(), valid_until, description
      ]
    );

    logger.info(`Tax rate created: ${result.rows[0].name} (${rate}%)`);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    logger.error('Error creating tax rate:', error);
    res.status(500).json({ error: 'Failed to create tax rate' });
  }
});

/**
 * PUT /api/tax-rates/:id
 * Modifier un taux de TVA
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      organization_id,
      name,
      rate,
      country_code,
      tax_type,
      is_active,
      is_default,
      account_number,
      valid_from,
      valid_until,
      description
    } = req.body;

    // Si c'est le taux par défaut, retirer le flag des autres
    if (is_default) {
      const taxRate = await pool.query(
        `SELECT country_code FROM tax_rates WHERE id = $1`,
        [id]
      );

      if (taxRate.rows.length > 0) {
        await pool.query(
          `UPDATE tax_rates SET is_default = false
           WHERE organization_id = $1 AND country_code = $2 AND id != $3 AND deleted_at IS NULL`,
          [organization_id, taxRate.rows[0].country_code, id]
        );
      }
    }

    const result = await pool.query(
      `UPDATE tax_rates SET
        name = COALESCE($1, name),
        rate = COALESCE($2, rate),
        country_code = COALESCE($3, country_code),
        tax_type = COALESCE($4, tax_type),
        is_active = COALESCE($5, is_active),
        is_default = COALESCE($6, is_default),
        account_number = COALESCE($7, account_number),
        valid_from = COALESCE($8, valid_from),
        valid_until = COALESCE($9, valid_until),
        description = COALESCE($10, description),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $11 AND organization_id = $12 AND deleted_at IS NULL
      RETURNING *`,
      [name, rate, country_code, tax_type, is_active, is_default, account_number, valid_from, valid_until, description, id, organization_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tax rate not found' });
    }

    logger.info(`Tax rate updated: ${id}`);
    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Error updating tax rate:', error);
    res.status(500).json({ error: 'Failed to update tax rate' });
  }
});

/**
 * DELETE /api/tax-rates/:id
 * Supprimer un taux de TVA (soft delete)
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { organization_id } = req.body;

    // Vérifier si utilisé dans des écritures comptables
    const usageCheck = await pool.query(
      `SELECT COUNT(*) as count FROM accounting_entries
       WHERE tax_rate_id = $1 AND deleted_at IS NULL`,
      [id]
    );

    if (parseInt(usageCheck.rows[0].count) > 0) {
      return res.status(400).json({
        error: 'Cannot delete tax rate used in accounting entries. Deactivate it instead.'
      });
    }

    const result = await pool.query(
      `UPDATE tax_rates SET
        deleted_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
      RETURNING *`,
      [id, organization_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tax rate not found' });
    }

    logger.info(`Tax rate deleted: ${id}`);
    res.json({ message: 'Tax rate deleted successfully' });
  } catch (error) {
    logger.error('Error deleting tax rate:', error);
    res.status(500).json({ error: 'Failed to delete tax rate' });
  }
});

/**
 * GET /api/tax-rates/calculate
 * Calculer TVA pour un montant
 */
router.get('/calculate', async (req: Request, res: Response) => {
  try {
    const { amount, tax_rate_id, is_inclusive = false } = req.query;

    if (!amount || !tax_rate_id) {
      return res.status(400).json({ error: 'Amount and tax rate ID required' });
    }

    const taxRateResult = await pool.query(
      `SELECT rate FROM tax_rates WHERE id = $1 AND deleted_at IS NULL`,
      [tax_rate_id]
    );

    if (taxRateResult.rows.length === 0) {
      return res.status(404).json({ error: 'Tax rate not found' });
    }

    const rate = parseFloat(taxRateResult.rows[0].rate);
    const baseAmount = parseFloat(amount as string);

    let taxAmount, totalAmount, netAmount;

    if (is_inclusive === 'true') {
      // Montant TTC → calculer HT et TVA
      totalAmount = baseAmount;
      netAmount = baseAmount / (1 + rate / 100);
      taxAmount = totalAmount - netAmount;
    } else {
      // Montant HT → calculer TVA et TTC
      netAmount = baseAmount;
      taxAmount = baseAmount * (rate / 100);
      totalAmount = netAmount + taxAmount;
    }

    res.json({
      net_amount: parseFloat(netAmount.toFixed(2)),
      tax_amount: parseFloat(taxAmount.toFixed(2)),
      total_amount: parseFloat(totalAmount.toFixed(2)),
      tax_rate: rate,
      is_inclusive: is_inclusive === 'true'
    });
  } catch (error) {
    logger.error('Error calculating tax:', error);
    res.status(500).json({ error: 'Failed to calculate tax' });
  }
});

/**
 * GET /api/tax-rates/report
 * Rapport TVA pour une période
 */
router.get('/report', async (req: Request, res: Response) => {
  try {
    const { organization_id } = req.body;
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({ error: 'Start date and end date required' });
    }

    // TVA collectée (sur ventes)
    const collectedResult = await pool.query(
      `SELECT
        tr.id,
        tr.name,
        tr.rate,
        COUNT(ae.id) as transaction_count,
        SUM(ae.amount) as base_amount,
        SUM(ae.tax_amount) as tax_amount
      FROM accounting_entries ae
      JOIN tax_rates tr ON tr.id = ae.tax_rate_id
      WHERE ae.organization_id = $1
        AND ae.entry_type = 'sale'
        AND ae.entry_date BETWEEN $2 AND $3
        AND ae.is_validated = true
        AND ae.deleted_at IS NULL
      GROUP BY tr.id, tr.name, tr.rate
      ORDER BY tr.rate DESC`,
      [organization_id, start_date, end_date]
    );

    // TVA déductible (sur achats)
    const deductibleResult = await pool.query(
      `SELECT
        tr.id,
        tr.name,
        tr.rate,
        COUNT(ae.id) as transaction_count,
        SUM(ae.amount) as base_amount,
        SUM(ae.tax_amount) as tax_amount
      FROM accounting_entries ae
      JOIN tax_rates tr ON tr.id = ae.tax_rate_id
      WHERE ae.organization_id = $1
        AND ae.entry_type = 'purchase'
        AND ae.entry_date BETWEEN $2 AND $3
        AND ae.is_validated = true
        AND ae.deleted_at IS NULL
      GROUP BY tr.id, tr.name, tr.rate
      ORDER BY tr.rate DESC`,
      [organization_id, start_date, end_date]
    );

    const totalCollected = collectedResult.rows.reduce((sum, row) => sum + parseFloat(row.tax_amount || 0), 0);
    const totalDeductible = deductibleResult.rows.reduce((sum, row) => sum + parseFloat(row.tax_amount || 0), 0);
    const netTax = totalCollected - totalDeductible;

    res.json({
      period: { start_date, end_date },
      collected: {
        total: parseFloat(totalCollected.toFixed(2)),
        by_rate: collectedResult.rows
      },
      deductible: {
        total: parseFloat(totalDeductible.toFixed(2)),
        by_rate: deductibleResult.rows
      },
      net_tax: parseFloat(netTax.toFixed(2)),
      status: netTax > 0 ? 'to_pay' : 'credit'
    });
  } catch (error) {
    logger.error('Error generating tax report:', error);
    res.status(500).json({ error: 'Failed to generate tax report' });
  }
});

export default router;
