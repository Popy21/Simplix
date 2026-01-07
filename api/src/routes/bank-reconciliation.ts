import express, { Response } from 'express';
import { pool as db } from '../database/db';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import multer from 'multer';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// ==========================================
// COMPTES BANCAIRES
// ==========================================

// GET / - Vue d'ensemble du rapprochement bancaire
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;

    // Comptes bancaires
    const accountsResult = await db.query(`
      SELECT
        id, name, bank_name, iban, currency, current_balance, is_default
      FROM bank_accounts
      WHERE organization_id = $1 AND is_active = true
      ORDER BY is_default DESC, name
    `, [organizationId]);

    // Stats globales
    const statsResult = await db.query(`
      SELECT
        COUNT(*) as total_transactions,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE status = 'matched') as matched_count,
        COALESCE(SUM(CASE WHEN type = 'credit' AND status = 'pending' THEN amount ELSE 0 END), 0) as pending_credits,
        COALESCE(SUM(CASE WHEN type = 'debit' AND status = 'pending' THEN amount ELSE 0 END), 0) as pending_debits
      FROM bank_transactions
      WHERE organization_id = $1
    `, [organizationId]);

    // Derniers imports
    const importsResult = await db.query(`
      SELECT id, filename, imported_at, total_transactions, pending_count, matched_count
      FROM bank_imports
      WHERE organization_id = $1
      ORDER BY imported_at DESC
      LIMIT 5
    `, [organizationId]);

    res.json({
      accounts: accountsResult.rows,
      statistics: statsResult.rows[0],
      recent_imports: importsResult.rows,
      total_balance: accountsResult.rows.reduce((sum: number, acc: any) => sum + parseFloat(acc.current_balance || 0), 0)
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Récupérer tous les comptes bancaires
router.get('/accounts', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;

    const result = await db.query(`
      SELECT ba.*,
        (SELECT COUNT(*) FROM bank_transactions WHERE bank_account_id = ba.id AND status = 'pending') as pending_count,
        (SELECT MAX(transaction_date) FROM bank_transactions WHERE bank_account_id = ba.id) as last_transaction_date
      FROM bank_accounts ba
      WHERE ba.organization_id = $1 AND ba.is_active = true
      ORDER BY ba.is_default DESC, ba.name
    `, [organizationId]);

    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Créer un compte bancaire
router.post('/accounts', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;
    const { name, bank_name, iban, bic, account_number, currency, initial_balance, is_default } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Le nom est requis' });
      return;
    }

    // Si c'est le compte par défaut, enlever le défaut des autres
    if (is_default) {
      await db.query(
        'UPDATE bank_accounts SET is_default = false WHERE organization_id = $1',
        [organizationId]
      );
    }

    const result = await db.query(`
      INSERT INTO bank_accounts (organization_id, name, bank_name, iban, bic, account_number, currency, initial_balance, current_balance, is_default)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8, $9)
      RETURNING *
    `, [organizationId, name, bank_name, iban, bic, account_number, currency || 'EUR', initial_balance || 0, is_default || false]);

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Mettre à jour un compte bancaire
router.put('/accounts/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = (req.user as any)?.organizationId;
    const { name, bank_name, iban, bic, account_number, is_default, is_active } = req.body;

    if (is_default) {
      await db.query(
        'UPDATE bank_accounts SET is_default = false WHERE organization_id = $1',
        [organizationId]
      );
    }

    const result = await db.query(`
      UPDATE bank_accounts SET
        name = COALESCE($1, name),
        bank_name = COALESCE($2, bank_name),
        iban = COALESCE($3, iban),
        bic = COALESCE($4, bic),
        account_number = COALESCE($5, account_number),
        is_default = COALESCE($6, is_default),
        is_active = COALESCE($7, is_active),
        updated_at = NOW()
      WHERE id = $8 AND organization_id = $9
      RETURNING *
    `, [name, bank_name, iban, bic, account_number, is_default, is_active, id, organizationId]);

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Compte non trouvé' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// TRANSACTIONS
// ==========================================

// Récupérer les transactions d'un compte
router.get('/accounts/:accountId/transactions', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { accountId } = req.params;
    const { status, from_date, to_date, limit, offset } = req.query;

    let query = `
      SELECT bt.*,
        i.invoice_number as matched_invoice_number,
        e.reference as matched_expense_reference,
        p.payment_date as matched_payment_date
      FROM bank_transactions bt
      LEFT JOIN invoices i ON bt.matched_invoice_id = i.id
      LEFT JOIN expenses e ON bt.matched_expense_id = e.id
      LEFT JOIN payments p ON bt.matched_payment_id = p.id
      WHERE bt.bank_account_id = $1
    `;
    const params: any[] = [accountId];

    if (status) {
      params.push(status);
      query += ` AND bt.status = $${params.length}`;
    }

    if (from_date) {
      params.push(from_date);
      query += ` AND bt.transaction_date >= $${params.length}`;
    }

    if (to_date) {
      params.push(to_date);
      query += ` AND bt.transaction_date <= $${params.length}`;
    }

    query += ' ORDER BY bt.transaction_date DESC, bt.id DESC';

    if (limit) {
      params.push(parseInt(limit as string));
      query += ` LIMIT $${params.length}`;
    }

    if (offset) {
      params.push(parseInt(offset as string));
      query += ` OFFSET $${params.length}`;
    }

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Ajouter une transaction manuelle
router.post('/accounts/:accountId/transactions', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { accountId } = req.params;
    const organizationId = (req.user as any)?.organizationId;
    const {
      transaction_date,
      amount,
      type,
      description,
      reference,
      counterparty_name,
      category
    } = req.body;

    if (!transaction_date || !amount || !type) {
      res.status(400).json({ error: 'Date, montant et type requis' });
      return;
    }

    const result = await db.query(`
      INSERT INTO bank_transactions (
        bank_account_id, organization_id, transaction_date, amount, type,
        description, reference, counterparty_name, category, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'manual')
      RETURNING *
    `, [accountId, organizationId, transaction_date, amount, type, description, reference, counterparty_name, category]);

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// IMPORT DE RELEVÉS
// ==========================================

// Importer un relevé CSV
router.post('/accounts/:accountId/import', authenticateToken, upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    const { accountId } = req.params;
    const organizationId = (req.user as any)?.organizationId;
    const userId = (req.user as any)?.userId;

    if (!req.file) {
      res.status(400).json({ error: 'Fichier requis' });
      return;
    }

    const content = req.file.buffer.toString('utf-8');
    const lines = content.split('\n').filter(line => line.trim());

    if (lines.length < 2) {
      res.status(400).json({ error: 'Fichier vide ou format invalide' });
      return;
    }

    // Détecter le format (basique - suppose CSV avec headers)
    const headers = lines[0].toLowerCase().split(/[,;]/);
    const dateIndex = headers.findIndex(h => h.includes('date'));
    const amountIndex = headers.findIndex(h => h.includes('montant') || h.includes('amount') || h.includes('credit') || h.includes('debit'));
    const descIndex = headers.findIndex(h => h.includes('libelle') || h.includes('description') || h.includes('label'));

    if (dateIndex === -1 || amountIndex === -1) {
      res.status(400).json({ error: 'Format non reconnu. Colonnes date et montant requises.' });
      return;
    }

    // Créer l'import
    const importResult = await db.query(`
      INSERT INTO bank_imports (bank_account_id, organization_id, filename, format, imported_by)
      VALUES ($1, $2, $3, 'csv', $4)
      RETURNING id
    `, [accountId, organizationId, req.file.originalname, userId]);

    const importId = importResult.rows[0].id;

    let imported = 0;
    let errors = 0;
    const transactions = [];

    // Parser les lignes
    for (let i = 1; i < lines.length; i++) {
      try {
        const cols = lines[i].split(/[,;]/).map(c => c.trim().replace(/^"|"$/g, ''));

        const dateStr = cols[dateIndex];
        const amountStr = cols[amountIndex]?.replace(/[^\d.,-]/g, '').replace(',', '.');
        const description = descIndex >= 0 ? cols[descIndex] : '';

        if (!dateStr || !amountStr) continue;

        // Parser la date (DD/MM/YYYY ou YYYY-MM-DD)
        let transactionDate;
        if (dateStr.includes('/')) {
          const [d, m, y] = dateStr.split('/');
          transactionDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        } else {
          transactionDate = dateStr;
        }

        const amount = parseFloat(amountStr);
        if (isNaN(amount)) continue;

        const type = amount >= 0 ? 'credit' : 'debit';

        const txResult = await db.query(`
          INSERT INTO bank_transactions (
            bank_account_id, organization_id, transaction_date, amount, type,
            description, import_id, import_row, raw_data
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING *
        `, [
          accountId, organizationId, transactionDate, Math.abs(amount), type,
          description, importId, i, JSON.stringify(cols)
        ]);

        transactions.push(txResult.rows[0]);
        imported++;
      } catch (e) {
        errors++;
      }
    }

    // Mettre à jour les stats de l'import
    await db.query(`
      UPDATE bank_imports SET
        total_transactions = $1,
        pending_count = $1,
        start_date = (SELECT MIN(transaction_date) FROM bank_transactions WHERE import_id = $2),
        end_date = (SELECT MAX(transaction_date) FROM bank_transactions WHERE import_id = $2)
      WHERE id = $2
    `, [imported, importId]);

    res.json({
      import_id: importId,
      imported,
      errors,
      transactions: transactions.slice(0, 10) // Aperçu des 10 premières
    });
  } catch (err: any) {
    console.error('Erreur import:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// RAPPROCHEMENT
// ==========================================

// Obtenir les suggestions de rapprochement
router.get('/suggestions', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;
    const { transaction_id, min_confidence } = req.query;

    let query = `
      SELECT * FROM bank_matching_suggestions
      WHERE 1=1
    `;
    const params: any[] = [];

    if (transaction_id) {
      params.push(transaction_id);
      query += ` AND transaction_id = $${params.length}`;
    }

    if (min_confidence) {
      params.push(parseInt(min_confidence as string));
      query += ` AND confidence_score >= $${params.length}`;
    }

    query += ' ORDER BY confidence_score DESC LIMIT 50';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Rapprocher une transaction avec une facture
router.post('/transactions/:transactionId/match-invoice', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { transactionId } = req.params;
    const { invoice_id } = req.body;
    const userId = (req.user as any)?.userId;

    if (!invoice_id) {
      res.status(400).json({ error: 'invoice_id requis' });
      return;
    }

    // Récupérer la transaction
    const txResult = await db.query(
      'SELECT * FROM bank_transactions WHERE id = $1',
      [transactionId]
    );

    if (txResult.rows.length === 0) {
      res.status(404).json({ error: 'Transaction non trouvée' });
      return;
    }

    const transaction = txResult.rows[0];

    // Récupérer la facture
    const invResult = await db.query(
      'SELECT * FROM invoices WHERE id = $1',
      [invoice_id]
    );

    if (invResult.rows.length === 0) {
      res.status(404).json({ error: 'Facture non trouvée' });
      return;
    }

    const invoice = invResult.rows[0];

    // Créer le paiement
    const paymentResult = await db.query(`
      INSERT INTO payments (invoice_id, amount, payment_date, payment_method, notes)
      VALUES ($1, $2, $3, 'bank_transfer', $4)
      RETURNING *
    `, [
      invoice_id,
      transaction.amount,
      transaction.transaction_date,
      `Rapprochement bancaire - Transaction ${transactionId}`
    ]);

    // Mettre à jour la transaction
    await db.query(`
      UPDATE bank_transactions SET
        status = 'matched',
        matched_invoice_id = $1,
        matched_payment_id = $2,
        match_confidence = 100,
        matched_at = NOW(),
        matched_by = $3
      WHERE id = $4
    `, [invoice_id, paymentResult.rows[0].id, userId, transactionId]);

    // Mettre à jour le statut de la facture si entièrement payée
    const totalPaidResult = await db.query(
      'SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE invoice_id = $1',
      [invoice_id]
    );

    const totalPaid = parseFloat(totalPaidResult.rows[0].total);
    const invoiceTotal = parseFloat(invoice.total_amount);

    if (totalPaid >= invoiceTotal) {
      await db.query('UPDATE invoices SET status = $1 WHERE id = $2', ['paid', invoice_id]);
    } else if (totalPaid > 0) {
      await db.query('UPDATE invoices SET status = $1 WHERE id = $2', ['partial', invoice_id]);
    }

    res.json({
      message: 'Rapprochement effectué',
      payment: paymentResult.rows[0]
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Rapprocher avec une dépense
router.post('/transactions/:transactionId/match-expense', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { transactionId } = req.params;
    const { expense_id } = req.body;
    const userId = (req.user as any)?.userId;

    if (!expense_id) {
      res.status(400).json({ error: 'expense_id requis' });
      return;
    }

    // Mettre à jour la transaction
    await db.query(`
      UPDATE bank_transactions SET
        status = 'matched',
        matched_expense_id = $1,
        match_confidence = 100,
        matched_at = NOW(),
        matched_by = $2
      WHERE id = $3
    `, [expense_id, userId, transactionId]);

    // Mettre à jour la dépense
    await db.query(
      'UPDATE expenses SET status = $1, paid_at = (SELECT transaction_date FROM bank_transactions WHERE id = $2) WHERE id = $3',
      ['paid', transactionId, expense_id]
    );

    res.json({ message: 'Rapprochement effectué' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Ignorer une transaction
router.post('/transactions/:transactionId/ignore', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { transactionId } = req.params;
    const { reason } = req.body;
    const userId = (req.user as any)?.userId;

    await db.query(`
      UPDATE bank_transactions SET
        status = 'ignored',
        category = $1,
        matched_at = NOW(),
        matched_by = $2
      WHERE id = $3
    `, [reason || 'ignored', userId, transactionId]);

    res.json({ message: 'Transaction ignorée' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Annuler un rapprochement
router.post('/transactions/:transactionId/unmatch', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { transactionId } = req.params;

    // Récupérer la transaction
    const txResult = await db.query(
      'SELECT * FROM bank_transactions WHERE id = $1',
      [transactionId]
    );

    if (txResult.rows.length === 0) {
      res.status(404).json({ error: 'Transaction non trouvée' });
      return;
    }

    const tx = txResult.rows[0];

    // Supprimer le paiement associé si existe
    if (tx.matched_payment_id) {
      await db.query('DELETE FROM payments WHERE id = $1', [tx.matched_payment_id]);
    }

    // Remettre la transaction en pending
    await db.query(`
      UPDATE bank_transactions SET
        status = 'pending',
        matched_invoice_id = NULL,
        matched_payment_id = NULL,
        matched_expense_id = NULL,
        match_confidence = NULL,
        matched_at = NULL,
        matched_by = NULL
      WHERE id = $1
    `, [transactionId]);

    res.json({ message: 'Rapprochement annulé' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// AUTO-MATCHING
// ==========================================

// Lancer le rapprochement automatique
router.post('/accounts/:accountId/auto-match', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { accountId } = req.params;
    const { min_confidence } = req.body;
    const minConf = min_confidence || 80;
    const userId = (req.user as any)?.userId;

    // Récupérer les transactions en attente
    const pendingResult = await db.query(`
      SELECT bt.*, bms.match_type, bms.document_id, bms.confidence_score
      FROM bank_transactions bt
      JOIN bank_matching_suggestions bms ON bt.id = bms.transaction_id
      WHERE bt.bank_account_id = $1
        AND bt.status = 'pending'
        AND bms.confidence_score >= $2
      ORDER BY bms.confidence_score DESC
    `, [accountId, minConf]);

    const matched = [];

    for (const suggestion of pendingResult.rows) {
      try {
        if (suggestion.match_type === 'invoice') {
          // Créer le paiement
          const paymentResult = await db.query(`
            INSERT INTO payments (invoice_id, amount, payment_date, payment_method, notes)
            VALUES ($1, $2, $3, 'bank_transfer', 'Auto-match bancaire')
            RETURNING id
          `, [suggestion.document_id, suggestion.amount, suggestion.transaction_date]);

          // Mettre à jour la transaction
          await db.query(`
            UPDATE bank_transactions SET
              status = 'matched',
              matched_invoice_id = $1,
              matched_payment_id = $2,
              match_confidence = $3,
              matched_at = NOW(),
              matched_by = $4
            WHERE id = $5
          `, [suggestion.document_id, paymentResult.rows[0].id, suggestion.confidence_score, userId, suggestion.id]);

          matched.push({
            transaction_id: suggestion.id,
            matched_with: 'invoice',
            document_id: suggestion.document_id,
            confidence: suggestion.confidence_score
          });

        } else if (suggestion.match_type === 'expense') {
          await db.query(`
            UPDATE bank_transactions SET
              status = 'matched',
              matched_expense_id = $1,
              match_confidence = $2,
              matched_at = NOW(),
              matched_by = $3
            WHERE id = $4
          `, [suggestion.document_id, suggestion.confidence_score, userId, suggestion.id]);

          await db.query(
            'UPDATE expenses SET status = $1 WHERE id = $2',
            ['paid', suggestion.document_id]
          );

          matched.push({
            transaction_id: suggestion.id,
            matched_with: 'expense',
            document_id: suggestion.document_id,
            confidence: suggestion.confidence_score
          });
        }
      } catch (e) {
        // Ignorer les erreurs individuelles
      }
    }

    res.json({
      message: `${matched.length} transactions rapprochées automatiquement`,
      matched
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// STATISTIQUES
// ==========================================

router.get('/stats', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;

    const result = await db.query(`
      SELECT
        COUNT(*) as total_transactions,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE status = 'matched') as matched_count,
        COUNT(*) FILTER (WHERE status = 'ignored') as ignored_count,
        COALESCE(SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END), 0) as total_credits,
        COALESCE(SUM(CASE WHEN type = 'debit' THEN ABS(amount) ELSE 0 END), 0) as total_debits,
        (SELECT COALESCE(SUM(current_balance), 0) FROM bank_accounts WHERE organization_id = $1 AND is_active = true) as total_balance
      FROM bank_transactions
      WHERE organization_id = $1
    `, [organizationId]);

    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
