/**
 * Service pour génération automatique d'écritures comptables
 * Appelé lors de création/modification de factures, paiements, dépenses
 */

import { pool } from '../database/connection';
import logger from './logger';

interface AccountingEntryParams {
  organization_id: string;
  source_type: 'invoice' | 'expense' | 'payment' | 'quote';
  source_id: string;
  entry_date: Date;
  description: string;
  amount: number;
  tax_amount?: number;
  tax_rate_id?: string;
}

/**
 * Générer écriture comptable pour une facture client
 */
export async function generateInvoiceEntry(
  organization_id: string,
  invoice_id: string
): Promise<void> {
  try {
    // Récupérer données facture
    const invoiceResult = await pool.query(
      `SELECT
        i.*,
        c.name as customer_name
      FROM invoices i
      LEFT JOIN contacts c ON c.id = i.customer_id
      WHERE i.id = $1 AND i.organization_id = $2`,
      [invoice_id, organization_id]
    );

    if (invoiceResult.rows.length === 0) {
      throw new Error('Invoice not found');
    }

    const invoice = invoiceResult.rows[0];

    // Récupérer taux de TVA par défaut si pas spécifié
    let tax_rate_id = invoice.tax_rate_id;
    let tax_amount = invoice.tax_amount || 0;

    if (!tax_rate_id) {
      const defaultTaxRate = await pool.query(
        `SELECT id, rate FROM tax_rates
         WHERE organization_id = $1 AND is_default = true AND deleted_at IS NULL
         LIMIT 1`,
        [organization_id]
      );

      if (defaultTaxRate.rows.length > 0) {
        tax_rate_id = defaultTaxRate.rows[0].id;
        const rate = parseFloat(defaultTaxRate.rows[0].rate);
        // Calculer TVA si montant HT
        const subtotal = invoice.subtotal_amount || invoice.total_amount;
        tax_amount = subtotal * (rate / 100);
      }
    }

    const entry_date = invoice.issue_date || new Date();
    const fiscal_year = new Date(entry_date).getFullYear();
    const fiscal_period = new Date(entry_date).getMonth() + 1;

    // Vérifier si écriture existe déjà
    const existingEntry = await pool.query(
      `SELECT id FROM accounting_entries
       WHERE source_type = 'invoice' AND source_id = $1 AND deleted_at IS NULL`,
      [invoice_id]
    );

    if (existingEntry.rows.length > 0) {
      logger.info(`Accounting entry already exists for invoice ${invoice.invoice_number}`);
      return;
    }

    // Créer écriture: Débit 411 (Clients) / Crédit 706 ou 707 (Ventes)
    const net_amount = parseFloat(invoice.subtotal_amount || invoice.total_amount);

    await pool.query(
      `INSERT INTO accounting_entries (
        organization_id, source_type, source_id, entry_date, journal_type, entry_type,
        description, debit_account, credit_account, amount, tax_rate_id, tax_amount,
        fiscal_year, fiscal_period
      ) VALUES ($1, 'invoice', $2, $3, 'sales', 'sale', $4, '411', '706', $5, $6, $7, $8, $9)`,
      [
        organization_id,
        invoice_id,
        entry_date,
        `Facture ${invoice.invoice_number} - ${invoice.customer_name || 'Client'}`,
        net_amount,
        tax_rate_id,
        tax_amount,
        fiscal_year,
        fiscal_period
      ]
    );

    // Si TVA > 0, créer écriture TVA collectée
    if (tax_amount > 0) {
      await pool.query(
        `INSERT INTO accounting_entries (
          organization_id, source_type, source_id, entry_date, journal_type, entry_type,
          description, debit_account, credit_account, amount, tax_rate_id, tax_amount,
          fiscal_year, fiscal_period
        ) VALUES ($1, 'invoice', $2, $3, 'sales', 'sale', $4, '411', '44571', $5, $6, $7, $8, $9)`,
        [
          organization_id,
          invoice_id,
          entry_date,
          `TVA collectée - Facture ${invoice.invoice_number}`,
          tax_amount,
          tax_rate_id,
          tax_amount,
          fiscal_year,
          fiscal_period
        ]
      );
    }

    logger.info(`Accounting entries generated for invoice ${invoice.invoice_number}`);
  } catch (error) {
    logger.error('Error generating invoice accounting entry:', error);
    throw error;
  }
}

/**
 * Générer écriture comptable pour une dépense fournisseur
 */
export async function generateExpenseEntry(
  organization_id: string,
  expense_id: string
): Promise<void> {
  try {
    // Récupérer données dépense
    const expenseResult = await pool.query(
      `SELECT
        e.*,
        s.name as supplier_name
      FROM expenses e
      LEFT JOIN suppliers s ON s.id = e.supplier_id
      WHERE e.id = $1 AND e.organization_id = $2`,
      [expense_id, organization_id]
    );

    if (expenseResult.rows.length === 0) {
      throw new Error('Expense not found');
    }

    const expense = expenseResult.rows[0];

    // Vérifier si écriture existe déjà
    const existingEntry = await pool.query(
      `SELECT id FROM accounting_entries
       WHERE source_type = 'expense' AND source_id = $1 AND deleted_at IS NULL`,
      [expense_id]
    );

    if (existingEntry.rows.length > 0) {
      logger.info(`Accounting entry already exists for expense ${expense.expense_number}`);
      return;
    }

    const entry_date = expense.expense_date || new Date();
    const fiscal_year = new Date(entry_date).getFullYear();
    const fiscal_period = new Date(entry_date).getMonth() + 1;

    // Créer écriture: Débit 6061 (Achats) / Crédit 401 (Fournisseurs)
    const amount = parseFloat(expense.amount);

    await pool.query(
      `INSERT INTO accounting_entries (
        organization_id, source_type, source_id, entry_date, journal_type, entry_type,
        description, debit_account, credit_account, amount,
        fiscal_year, fiscal_period
      ) VALUES ($1, 'expense', $2, $3, 'purchases', 'purchase', $4, '6061', '401', $5, $6, $7)`,
      [
        organization_id,
        expense_id,
        entry_date,
        `Dépense ${expense.expense_number} - ${expense.supplier_name || 'Fournisseur'}`,
        amount,
        fiscal_year,
        fiscal_period
      ]
    );

    logger.info(`Accounting entry generated for expense ${expense.expense_number}`);
  } catch (error) {
    logger.error('Error generating expense accounting entry:', error);
    throw error;
  }
}

/**
 * Générer écriture comptable pour un paiement
 */
export async function generatePaymentEntry(
  organization_id: string,
  payment_id: string
): Promise<void> {
  try {
    // Récupérer données paiement
    const paymentResult = await pool.query(
      `SELECT
        p.*,
        i.invoice_number
      FROM payments p
      LEFT JOIN invoices i ON i.id = p.invoice_id
      WHERE p.id = $1 AND p.organization_id = $2`,
      [payment_id, organization_id]
    );

    if (paymentResult.rows.length === 0) {
      throw new Error('Payment not found');
    }

    const payment = paymentResult.rows[0];

    // Vérifier si écriture existe déjà
    const existingEntry = await pool.query(
      `SELECT id FROM accounting_entries
       WHERE source_type = 'payment' AND source_id = $1 AND deleted_at IS NULL`,
      [payment_id]
    );

    if (existingEntry.rows.length > 0) {
      logger.info(`Accounting entry already exists for payment ${payment.id}`);
      return;
    }

    const entry_date = payment.payment_date || new Date();
    const fiscal_year = new Date(entry_date).getFullYear();
    const fiscal_period = new Date(entry_date).getMonth() + 1;

    // Créer écriture: Débit 512 (Banque) / Crédit 411 (Clients)
    const amount = parseFloat(payment.amount);

    await pool.query(
      `INSERT INTO accounting_entries (
        organization_id, source_type, source_id, entry_date, journal_type, entry_type,
        description, debit_account, credit_account, amount,
        fiscal_year, fiscal_period
      ) VALUES ($1, 'payment', $2, $3, 'bank', 'payment', $4, '512', '411', $5, $6, $7)`,
      [
        organization_id,
        payment_id,
        entry_date,
        `Paiement ${payment.invoice_number ? 'facture ' + payment.invoice_number : 'reçu'} - ${payment.payment_method || 'Virement'}`,
        amount,
        fiscal_year,
        fiscal_period
      ]
    );

    logger.info(`Accounting entry generated for payment ${payment.id}`);
  } catch (error) {
    logger.error('Error generating payment accounting entry:', error);
    throw error;
  }
}

/**
 * Valider toutes les écritures d'une période
 */
export async function validateEntriesPeriod(
  organization_id: string,
  user_id: string,
  fiscal_year: number,
  fiscal_period: number
): Promise<number> {
  try {
    const result = await pool.query(
      `UPDATE accounting_entries SET
        is_validated = true,
        validated_at = CURRENT_TIMESTAMP,
        validated_by = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE organization_id = $2
        AND fiscal_year = $3
        AND fiscal_period = $4
        AND is_validated = false
        AND deleted_at IS NULL
      RETURNING id`,
      [user_id, organization_id, fiscal_year, fiscal_period]
    );

    logger.info(`Validated ${result.rows.length} accounting entries for ${fiscal_year}-${fiscal_period}`);
    return result.rows.length;
  } catch (error) {
    logger.error('Error validating entries:', error);
    throw error;
  }
}

/**
 * Clôturer un exercice comptable
 */
export async function closeFiscalYear(
  organization_id: string,
  user_id: string,
  fiscal_year: number
): Promise<void> {
  try {
    // Vérifier que toutes les écritures sont validées
    const unvalidatedCount = await pool.query(
      `SELECT COUNT(*) as count FROM accounting_entries
       WHERE organization_id = $1
         AND fiscal_year = $2
         AND is_validated = false
         AND deleted_at IS NULL`,
      [organization_id, fiscal_year]
    );

    if (parseInt(unvalidatedCount.rows[0].count) > 0) {
      throw new Error(`Cannot close fiscal year ${fiscal_year}: ${unvalidatedCount.rows[0].count} unvalidated entries remaining`);
    }

    // Calculer résultat de l'exercice
    const resultQuery = await pool.query(
      `SELECT
        COALESCE(SUM(amount) FILTER (WHERE credit_account LIKE '7%'), 0) as revenue,
        COALESCE(SUM(amount) FILTER (WHERE debit_account LIKE '6%'), 0) as expenses
       FROM accounting_entries
       WHERE organization_id = $1
         AND fiscal_year = $2
         AND is_validated = true
         AND deleted_at IS NULL`,
      [organization_id, fiscal_year]
    );

    const revenue = parseFloat(resultQuery.rows[0].revenue);
    const expenses = parseFloat(resultQuery.rows[0].expenses);
    const result = revenue - expenses;

    // Créer écriture de clôture
    await pool.query(
      `INSERT INTO accounting_entries (
        organization_id, entry_date, journal_type, entry_type, description,
        debit_account, credit_account, amount, is_validated, validated_by, validated_at,
        fiscal_year, fiscal_period
      ) VALUES ($1, $2, 'miscellaneous', 'closing', $3, $4, $5, $6, true, $7, CURRENT_TIMESTAMP, $8, 12)`,
      [
        organization_id,
        `${fiscal_year}-12-31`,
        `Clôture exercice ${fiscal_year} - Résultat: ${result >= 0 ? 'bénéfice' : 'perte'}`,
        result >= 0 ? '120' : '129', // Compte résultat
        result >= 0 ? '129' : '120',
        Math.abs(result),
        user_id,
        fiscal_year
      ]
    );

    logger.info(`Fiscal year ${fiscal_year} closed - Result: ${result}`);
  } catch (error) {
    logger.error('Error closing fiscal year:', error);
    throw error;
  }
}

export default {
  generateInvoiceEntry,
  generateExpenseEntry,
  generatePaymentEntry,
  validateEntriesPeriod,
  closeFiscalYear
};
