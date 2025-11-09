import express, { Request, Response } from 'express';
import { pool } from '../database/connection';
import { authenticateToken } from '../middleware/auth';
import { requireOrganization } from '../middleware/organization';
import logger from '../utils/logger';
import fs from 'fs/promises';
import path from 'path';
import { format } from 'date-fns';

const router = express.Router();

// Middleware
router.use(authenticateToken);
router.use(requireOrganization);

/**
 * GET /api/accounting/entries
 * Liste des écritures comptables
 */
router.get('/entries', async (req: Request, res: Response) => {
  try {
    const { organization_id } = req.body;
    const {
      journal_type,
      start_date,
      end_date,
      fiscal_year,
      is_validated,
      limit = 100,
      offset = 0
    } = req.query;

    let query = `
      SELECT
        ae.*,
        tr.name as tax_rate_name,
        tr.rate as tax_rate_value,
        u.name as validated_by_name
      FROM accounting_entries ae
      LEFT JOIN tax_rates tr ON tr.id = ae.tax_rate_id
      LEFT JOIN users u ON u.id = ae.validated_by
      WHERE ae.organization_id = $1 AND ae.deleted_at IS NULL
    `;

    const params: any[] = [organization_id];
    let paramIndex = 2;

    if (journal_type) {
      query += ` AND ae.journal_type = $${paramIndex++}`;
      params.push(journal_type);
    }

    if (start_date) {
      query += ` AND ae.entry_date >= $${paramIndex++}`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND ae.entry_date <= $${paramIndex++}`;
      params.push(end_date);
    }

    if (fiscal_year) {
      query += ` AND ae.fiscal_year = $${paramIndex++}`;
      params.push(fiscal_year);
    }

    if (is_validated !== undefined) {
      query += ` AND ae.is_validated = $${paramIndex++}`;
      params.push(is_validated === 'true');
    }

    query += ` ORDER BY ae.entry_date DESC, ae.entry_number DESC`;
    query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM accounting_entries
       WHERE organization_id = $1 AND deleted_at IS NULL`,
      [organization_id]
    );

    res.json({
      entries: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    });
  } catch (error) {
    logger.error('Error fetching accounting entries:', error);
    res.status(500).json({ error: 'Failed to fetch accounting entries' });
  }
});

/**
 * POST /api/accounting/entries
 * Créer une écriture comptable
 */
router.post('/entries', async (req: Request, res: Response) => {
  try {
    const {
      organization_id,
      entry_date,
      journal_type,
      entry_type,
      description,
      debit_account,
      credit_account,
      amount,
      tax_rate_id,
      tax_amount = 0,
      source_type,
      source_id,
      notes
    } = req.body;

    // Validation
    if (!entry_date || !journal_type || !entry_type || !description || !debit_account || !credit_account || !amount) {
      return res.status(400).json({
        error: 'Entry date, journal, type, description, accounts and amount are required'
      });
    }

    // Calculer année et période fiscale
    const date = new Date(entry_date);
    const fiscal_year = date.getFullYear();
    const fiscal_period = date.getMonth() + 1;

    const result = await pool.query(
      `INSERT INTO accounting_entries (
        organization_id, entry_date, journal_type, entry_type, description,
        debit_account, credit_account, amount, tax_rate_id, tax_amount,
        source_type, source_id, fiscal_year, fiscal_period, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        organization_id, entry_date, journal_type, entry_type, description,
        debit_account, credit_account, amount, tax_rate_id, tax_amount,
        source_type, source_id, fiscal_year, fiscal_period, notes
      ]
    );

    logger.info(`Accounting entry created: ${result.rows[0].entry_number}`);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    logger.error('Error creating accounting entry:', error);
    res.status(500).json({ error: 'Failed to create accounting entry' });
  }
});

/**
 * POST /api/accounting/entries/:id/validate
 * Valider une écriture comptable
 */
router.post('/entries/:id/validate', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { organization_id, user_id } = req.body;

    const result = await pool.query(
      `UPDATE accounting_entries SET
        is_validated = true,
        validated_at = CURRENT_TIMESTAMP,
        validated_by = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND organization_id = $3 AND deleted_at IS NULL
      RETURNING *`,
      [user_id, id, organization_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Accounting entry not found' });
    }

    logger.info(`Accounting entry validated: ${result.rows[0].entry_number}`);
    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Error validating accounting entry:', error);
    res.status(500).json({ error: 'Failed to validate entry' });
  }
});

/**
 * POST /api/accounting/entries/bulk-validate
 * Valider plusieurs écritures en masse
 */
router.post('/entries/bulk-validate', async (req: Request, res: Response) => {
  try {
    const { organization_id, user_id, entry_ids } = req.body;

    if (!Array.isArray(entry_ids) || entry_ids.length === 0) {
      return res.status(400).json({ error: 'Entry IDs array required' });
    }

    const result = await pool.query(
      `UPDATE accounting_entries SET
        is_validated = true,
        validated_at = CURRENT_TIMESTAMP,
        validated_by = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE organization_id = $2
        AND id = ANY($3::uuid[])
        AND deleted_at IS NULL
      RETURNING *`,
      [user_id, organization_id, entry_ids]
    );

    logger.info(`Bulk validated ${result.rows.length} accounting entries`);
    res.json({ validated: result.rows.length, entries: result.rows });
  } catch (error) {
    logger.error('Error bulk validating entries:', error);
    res.status(500).json({ error: 'Failed to validate entries' });
  }
});

/**
 * GET /api/accounting/trial-balance
 * Balance générale (tous comptes)
 */
router.get('/trial-balance', async (req: Request, res: Response) => {
  try {
    const { organization_id } = req.body;
    const { fiscal_year, start_date, end_date } = req.query;

    let dateFilter = '';
    const params: any[] = [organization_id];
    let paramIndex = 2;

    if (fiscal_year) {
      dateFilter = `AND ae.fiscal_year = $${paramIndex++}`;
      params.push(fiscal_year);
    } else if (start_date && end_date) {
      dateFilter = `AND ae.entry_date BETWEEN $${paramIndex++} AND $${paramIndex++}`;
      params.push(start_date, end_date);
    }

    const result = await pool.query(
      `SELECT
        account_number,
        coa.account_name,
        coa.account_class,
        coa.account_type,
        SUM(debit_total) as total_debit,
        SUM(credit_total) as total_credit,
        SUM(debit_total) - SUM(credit_total) as balance
      FROM (
        SELECT debit_account as account_number, SUM(amount) as debit_total, 0 as credit_total
        FROM accounting_entries ae
        WHERE ae.organization_id = $1 AND ae.is_validated = true AND ae.deleted_at IS NULL ${dateFilter}
        GROUP BY debit_account

        UNION ALL

        SELECT credit_account as account_number, 0 as debit_total, SUM(amount) as credit_total
        FROM accounting_entries ae
        WHERE ae.organization_id = $1 AND ae.is_validated = true AND ae.deleted_at IS NULL ${dateFilter}
        GROUP BY credit_account
      ) combined
      LEFT JOIN chart_of_accounts coa ON coa.account_number = combined.account_number AND coa.organization_id = $1
      GROUP BY account_number, coa.account_name, coa.account_class, coa.account_type
      ORDER BY account_number`,
      params
    );

    res.json(result.rows);
  } catch (error) {
    logger.error('Error fetching trial balance:', error);
    res.status(500).json({ error: 'Failed to fetch trial balance' });
  }
});

/**
 * GET /api/accounting/ledger/:account
 * Grand livre d'un compte spécifique
 */
router.get('/ledger/:account', async (req: Request, res: Response) => {
  try {
    const { account } = req.params;
    const { organization_id } = req.body;
    const { start_date, end_date } = req.query;

    let dateFilter = '';
    const params: any[] = [organization_id, account];
    let paramIndex = 3;

    if (start_date && end_date) {
      dateFilter = `AND ae.entry_date BETWEEN $${paramIndex++} AND $${paramIndex++}`;
      params.push(start_date, end_date);
    }

    const result = await pool.query(
      `SELECT
        ae.entry_date,
        ae.entry_number,
        ae.description,
        ae.journal_type,
        CASE
          WHEN ae.debit_account = $2 THEN ae.amount
          ELSE 0
        END as debit,
        CASE
          WHEN ae.credit_account = $2 THEN ae.amount
          ELSE 0
        END as credit,
        CASE
          WHEN ae.debit_account = $2 THEN ae.credit_account
          ELSE ae.debit_account
        END as contra_account
      FROM accounting_entries ae
      WHERE ae.organization_id = $1
        AND (ae.debit_account = $2 OR ae.credit_account = $2)
        AND ae.is_validated = true
        AND ae.deleted_at IS NULL
        ${dateFilter}
      ORDER BY ae.entry_date ASC, ae.entry_number ASC`,
      params
    );

    // Calculer solde cumulé
    let balance = 0;
    const entriesWithBalance = result.rows.map(row => {
      balance += (row.debit - row.credit);
      return { ...row, balance };
    });

    res.json(entriesWithBalance);
  } catch (error) {
    logger.error('Error fetching ledger:', error);
    res.status(500).json({ error: 'Failed to fetch ledger' });
  }
});

/**
 * POST /api/accounting/export/fec
 * Générer export FEC (Fichier des Écritures Comptables)
 * Format requis par l'administration fiscale française
 */
router.post('/export/fec', async (req: Request, res: Response) => {
  try {
    const { organization_id, user_id, start_date, end_date, fiscal_year } = req.body;

    if (!fiscal_year && (!start_date || !end_date)) {
      return res.status(400).json({ error: 'Fiscal year or date range required' });
    }

    // Créer enregistrement export
    const exportRecord = await pool.query(
      `INSERT INTO accounting_exports (
        organization_id, export_format, start_date, end_date, fiscal_year,
        include_validated_only, exported_by, export_status
      ) VALUES ($1, 'fec', $2, $3, $4, true, $5, 'processing')
      RETURNING *`,
      [
        organization_id,
        start_date || `${fiscal_year}-01-01`,
        end_date || `${fiscal_year}-12-31`,
        fiscal_year || new Date(start_date).getFullYear(),
        user_id
      ]
    );

    const exportId = exportRecord.rows[0].id;

    try {
      // Récupérer écritures comptables
      const entriesResult = await pool.query(
        `SELECT
          ae.journal_type,
          ae.entry_number,
          ae.entry_date,
          ae.debit_account,
          ae.credit_account,
          ae.description,
          ae.amount,
          ae.tax_amount,
          COALESCE(ae.source_type, '') as piece_ref,
          COALESCE(ae.source_id::text, '') as piece_num
        FROM accounting_entries ae
        WHERE ae.organization_id = $1
          AND ae.entry_date BETWEEN $2 AND $3
          AND ae.is_validated = true
          AND ae.deleted_at IS NULL
        ORDER BY ae.entry_date, ae.entry_number`,
        [organization_id, start_date, end_date]
      );

      // Format FEC: délimité par pipe |
      // Colonnes: JournalCode|JournalLib|EcritureNum|EcritureDate|CompteNum|CompteLib|CompAuxNum|CompAuxLib|PieceRef|PieceDate|EcritureLib|Debit|Credit|EcritureLet|DateLet|ValidDate|Montantdevise|Idevise
      let fecContent = '';

      // En-tête
      const headers = [
        'JournalCode',
        'JournalLib',
        'EcritureNum',
        'EcritureDate',
        'CompteNum',
        'CompteLib',
        'CompAuxNum',
        'CompAuxLib',
        'PieceRef',
        'PieceDate',
        'EcritureLib',
        'Debit',
        'Credit',
        'EcritureLet',
        'DateLet',
        'ValidDate',
        'Montantdevise',
        'Idevise'
      ];
      fecContent += headers.join('|') + '\r\n';

      // Lignes (chaque écriture génère 2 lignes: débit et crédit)
      for (const entry of entriesResult.rows) {
        const journalCode = entry.journal_type.substring(0, 2).toUpperCase();
        const journalLib = entry.journal_type;
        const ecritureNum = entry.entry_number;
        const ecritureDate = format(new Date(entry.entry_date), 'yyyyMMdd');
        const pieceDate = ecritureDate;
        const ecritureLib = entry.description.replace(/[\r\n|]/g, ' ');

        // Ligne débit
        fecContent += [
          journalCode,
          journalLib,
          ecritureNum,
          ecritureDate,
          entry.debit_account,
          '', // CompteLib
          '', // CompAuxNum
          '', // CompAuxLib
          entry.piece_ref,
          pieceDate,
          ecritureLib,
          entry.amount.toFixed(2).replace('.', ','), // Débit
          '0,00', // Crédit
          '', // EcritureLet
          '', // DateLet
          ecritureDate, // ValidDate
          '', // Montantdevise
          'EUR' // Idevise
        ].join('|') + '\r\n';

        // Ligne crédit
        fecContent += [
          journalCode,
          journalLib,
          ecritureNum,
          ecritureDate,
          entry.credit_account,
          '', // CompteLib
          '', // CompAuxNum
          '', // CompAuxLib
          entry.piece_ref,
          pieceDate,
          ecritureLib,
          '0,00', // Débit
          entry.amount.toFixed(2).replace('.', ','), // Crédit
          '', // EcritureLet
          '', // DateLet
          ecritureDate, // ValidDate
          '', // Montantdevise
          'EUR' // Idevise
        ].join('|') + '\r\n';
      }

      // Sauvegarder fichier
      const uploadsDir = path.join(__dirname, '../../uploads/accounting-exports');
      await fs.mkdir(uploadsDir, { recursive: true });

      const filename = `FEC_${fiscal_year || format(new Date(start_date), 'yyyy')}_${format(new Date(), 'yyyyMMddHHmmss')}.txt`;
      const filepath = path.join(uploadsDir, filename);

      await fs.writeFile(filepath, fecContent, 'utf-8');

      const fileSize = (await fs.stat(filepath)).size;

      // Mettre à jour enregistrement export
      await pool.query(
        `UPDATE accounting_exports SET
          export_status = 'completed',
          file_path = $1,
          file_size = $2,
          entries_count = $3,
          exported_at = CURRENT_TIMESTAMP
        WHERE id = $4`,
        [filepath, fileSize, entriesResult.rows.length, exportId]
      );

      logger.info(`FEC export created: ${filename} (${entriesResult.rows.length} entries)`);
      res.json({
        export_id: exportId,
        filename,
        filepath,
        entries_count: entriesResult.rows.length,
        file_size: fileSize
      });
    } catch (error) {
      // Marquer export comme échoué
      await pool.query(
        `UPDATE accounting_exports SET
          export_status = 'failed',
          error_message = $1
        WHERE id = $2`,
        [(error as Error).message, exportId]
      );
      throw error;
    }
  } catch (error) {
    logger.error('Error generating FEC export:', error);
    res.status(500).json({ error: 'Failed to generate FEC export' });
  }
});

/**
 * GET /api/accounting/exports
 * Liste des exports comptables
 */
router.get('/exports', async (req: Request, res: Response) => {
  try {
    const { organization_id } = req.body;

    const result = await pool.query(
      `SELECT
        ae.*,
        u.name as exported_by_name
      FROM accounting_exports ae
      LEFT JOIN users u ON u.id = ae.exported_by
      WHERE ae.organization_id = $1
      ORDER BY ae.created_at DESC
      LIMIT 50`,
      [organization_id]
    );

    res.json(result.rows);
  } catch (error) {
    logger.error('Error fetching exports:', error);
    res.status(500).json({ error: 'Failed to fetch exports' });
  }
});

/**
 * GET /api/accounting/exports/:id/download
 * Télécharger un export
 */
router.get('/exports/:id/download', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { organization_id } = req.body;

    const result = await pool.query(
      `SELECT * FROM accounting_exports
       WHERE id = $1 AND organization_id = $2 AND export_status = 'completed'`,
      [id, organization_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Export not found or not completed' });
    }

    const exportData = result.rows[0];

    if (!exportData.file_path) {
      return res.status(404).json({ error: 'Export file not found' });
    }

    res.download(exportData.file_path);
  } catch (error) {
    logger.error('Error downloading export:', error);
    res.status(500).json({ error: 'Failed to download export' });
  }
});

/**
 * GET /api/accounting/chart-of-accounts
 * Plan comptable
 */
router.get('/chart-of-accounts', async (req: Request, res: Response) => {
  try {
    const { organization_id } = req.body;
    const { account_class, is_active = true } = req.query;

    let query = `
      SELECT * FROM chart_of_accounts
      WHERE organization_id = $1 AND deleted_at IS NULL
    `;

    const params: any[] = [organization_id];
    let paramIndex = 2;

    if (account_class) {
      query += ` AND account_class = $${paramIndex++}`;
      params.push(account_class);
    }

    if (is_active !== undefined) {
      query += ` AND is_active = $${paramIndex++}`;
      params.push(is_active === 'true');
    }

    query += ` ORDER BY account_number`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    logger.error('Error fetching chart of accounts:', error);
    res.status(500).json({ error: 'Failed to fetch chart of accounts' });
  }
});

/**
 * POST /api/accounting/chart-of-accounts
 * Ajouter un compte au plan comptable
 */
router.post('/chart-of-accounts', async (req: Request, res: Response) => {
  try {
    const {
      organization_id,
      account_number,
      account_name,
      account_class,
      account_type,
      parent_account,
      description
    } = req.body;

    if (!account_number || !account_name || !account_class || !account_type) {
      return res.status(400).json({
        error: 'Account number, name, class and type are required'
      });
    }

    const result = await pool.query(
      `INSERT INTO chart_of_accounts (
        organization_id, account_number, account_name, account_class,
        account_type, parent_account, description
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [organization_id, account_number, account_name, account_class, account_type, parent_account, description]
    );

    logger.info(`Chart of account created: ${account_number}`);
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    if (error.code === '23505') { // Unique violation
      return res.status(400).json({ error: 'Account number already exists' });
    }
    logger.error('Error creating chart of account:', error);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

export default router;
