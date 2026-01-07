import express, { Response } from 'express';
import { pool } from '../database/db';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requireOrganization } from '../middleware/multiTenancy';
import { getOrgIdFromRequest } from '../utils/multiTenancyHelper';

const router = express.Router();

/**
 * FEC (Fichier des Écritures Comptables) - Format obligatoire pour contrôle fiscal France
 *
 * Colonnes obligatoires selon l'article A47 A-1 du Livre des Procédures Fiscales:
 * JournalCode, JournalLib, EcritureNum, EcritureDate, CompteNum, CompteLib,
 * CompAuxNum, CompAuxLib, PieceRef, PieceDate, EcritureLib, Debit, Credit,
 * EcritureLet, DateLet, ValidDate, Montantdevise, Idevise
 */

// Types de journaux comptables
const JOURNAL_CODES = {
  VE: { code: 'VE', lib: 'Ventes' },
  AC: { code: 'AC', lib: 'Achats' },
  BQ: { code: 'BQ', lib: 'Banque' },
  CA: { code: 'CA', lib: 'Caisse' },
  OD: { code: 'OD', lib: 'Opérations Diverses' },
  AN: { code: 'AN', lib: 'À Nouveaux' }
};

// Comptes comptables standards (Plan Comptable Général)
const ACCOUNTS = {
  // Classe 4 - Tiers
  CLIENT: { num: '411000', lib: 'Clients' },
  CLIENT_DOUTEUX: { num: '416000', lib: 'Clients douteux' },
  FOURNISSEUR: { num: '401000', lib: 'Fournisseurs' },
  TVA_COLLECTEE: { num: '445710', lib: 'TVA collectée' },
  TVA_DEDUCTIBLE: { num: '445660', lib: 'TVA déductible sur ABS' },
  // Classe 5 - Financiers
  BANQUE: { num: '512000', lib: 'Banque' },
  CAISSE: { num: '530000', lib: 'Caisse' },
  // Classe 6 - Charges
  ACHATS: { num: '607000', lib: 'Achats de marchandises' },
  SERVICES: { num: '611000', lib: 'Sous-traitance générale' },
  // Classe 7 - Produits
  VENTES_MARCHANDISES: { num: '707000', lib: 'Ventes de marchandises' },
  VENTES_SERVICES: { num: '706000', lib: 'Prestations de services' },
};

interface FECLine {
  JournalCode: string;
  JournalLib: string;
  EcritureNum: string;
  EcritureDate: string;
  CompteNum: string;
  CompteLib: string;
  CompAuxNum: string;
  CompAuxLib: string;
  PieceRef: string;
  PieceDate: string;
  EcritureLib: string;
  Debit: string;
  Credit: string;
  EcritureLet: string;
  DateLet: string;
  ValidDate: string;
  Montantdevise: string;
  Idevise: string;
}

function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toISOString().split('T')[0].replace(/-/g, '');
}

function formatAmount(amount: number): string {
  return amount.toFixed(2).replace('.', ',');
}

function escapeFECField(value: string): string {
  if (!value) return '';
  // Escape pipe characters and remove line breaks
  return value.replace(/\|/g, ' ').replace(/[\r\n]/g, ' ').trim();
}

/**
 * GET /api/exports/fec
 * Génère le FEC (Fichier des Écritures Comptables) au format réglementaire
 */
router.get('/fec', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  try {
    const orgId = getOrgIdFromRequest(req);
    const { from_date, to_date, siren } = req.query;

    if (!from_date || !to_date) {
      return res.status(400).json({
        error: 'Les paramètres from_date et to_date sont requis (format: YYYY-MM-DD)'
      });
    }

    const lines: FECLine[] = [];
    let ecritureNum = 1;

    // =========================================================================
    // 1. FACTURES DE VENTE (Journal VE)
    // =========================================================================
    const invoicesResult = await pool.query(`
      SELECT
        i.*,
        c.name as customer_name,
        c.email as customer_email
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      WHERE i.invoice_date >= $1 AND i.invoice_date <= $2
        AND i.status NOT IN ('draft', 'cancelled')
      ORDER BY i.invoice_date, i.id
    `, [from_date, to_date]);

    for (const invoice of invoicesResult.rows) {
      const pieceRef = invoice.invoice_number;
      const pieceDate = formatDate(invoice.invoice_date);
      const totalHT = parseFloat(invoice.subtotal || 0);
      const totalTVA = parseFloat(invoice.tax_amount || 0);
      const totalTTC = parseFloat(invoice.total_amount || 0);
      const ecritureNumStr = String(ecritureNum).padStart(8, '0');
      const customerRef = `C${invoice.customer_id}`;

      // Ligne débit client (411)
      lines.push({
        JournalCode: JOURNAL_CODES.VE.code,
        JournalLib: JOURNAL_CODES.VE.lib,
        EcritureNum: ecritureNumStr,
        EcritureDate: pieceDate,
        CompteNum: ACCOUNTS.CLIENT.num,
        CompteLib: ACCOUNTS.CLIENT.lib,
        CompAuxNum: customerRef,
        CompAuxLib: escapeFECField(invoice.customer_name || ''),
        PieceRef: pieceRef,
        PieceDate: pieceDate,
        EcritureLib: escapeFECField(`Facture ${pieceRef} - ${invoice.customer_name || 'Client'}`),
        Debit: formatAmount(totalTTC),
        Credit: '0,00',
        EcritureLet: invoice.status === 'paid' ? 'L' + pieceRef.slice(-6) : '',
        DateLet: invoice.paid_date ? formatDate(invoice.paid_date) : '',
        ValidDate: pieceDate,
        Montantdevise: '',
        Idevise: 'EUR'
      });

      // Ligne crédit ventes (706/707)
      lines.push({
        JournalCode: JOURNAL_CODES.VE.code,
        JournalLib: JOURNAL_CODES.VE.lib,
        EcritureNum: ecritureNumStr,
        EcritureDate: pieceDate,
        CompteNum: ACCOUNTS.VENTES_SERVICES.num,
        CompteLib: ACCOUNTS.VENTES_SERVICES.lib,
        CompAuxNum: '',
        CompAuxLib: '',
        PieceRef: pieceRef,
        PieceDate: pieceDate,
        EcritureLib: escapeFECField(`Ventes ${pieceRef}`),
        Debit: '0,00',
        Credit: formatAmount(totalHT),
        EcritureLet: '',
        DateLet: '',
        ValidDate: pieceDate,
        Montantdevise: '',
        Idevise: 'EUR'
      });

      // Ligne crédit TVA collectée (44571)
      if (totalTVA > 0) {
        lines.push({
          JournalCode: JOURNAL_CODES.VE.code,
          JournalLib: JOURNAL_CODES.VE.lib,
          EcritureNum: ecritureNumStr,
          EcritureDate: pieceDate,
          CompteNum: ACCOUNTS.TVA_COLLECTEE.num,
          CompteLib: ACCOUNTS.TVA_COLLECTEE.lib,
          CompAuxNum: '',
          CompAuxLib: '',
          PieceRef: pieceRef,
          PieceDate: pieceDate,
          EcritureLib: escapeFECField(`TVA sur ${pieceRef}`),
          Debit: '0,00',
          Credit: formatAmount(totalTVA),
          EcritureLet: '',
          DateLet: '',
          ValidDate: pieceDate,
          Montantdevise: '',
          Idevise: 'EUR'
        });
      }

      ecritureNum++;
    }

    // =========================================================================
    // 2. AVOIRS (Journal VE - écritures inverses)
    // =========================================================================
    const creditNotesResult = await pool.query(`
      SELECT
        cn.*,
        c.name as customer_name
      FROM credit_notes cn
      LEFT JOIN customers c ON cn.customer_id = c.id
      WHERE cn.credit_note_date >= $1 AND cn.credit_note_date <= $2
        AND cn.status NOT IN ('draft', 'cancelled')
        AND cn.deleted_at IS NULL
      ORDER BY cn.credit_note_date, cn.id
    `, [from_date, to_date]);

    for (const creditNote of creditNotesResult.rows) {
      const pieceRef = creditNote.credit_note_number;
      const pieceDate = formatDate(creditNote.credit_note_date);
      const totalHT = parseFloat(creditNote.subtotal || 0);
      const totalTVA = parseFloat(creditNote.tax_amount || 0);
      const totalTTC = parseFloat(creditNote.total_amount || 0);
      const ecritureNumStr = String(ecritureNum).padStart(8, '0');
      const customerRef = `C${creditNote.customer_id}`;

      // Ligne crédit client (411) - Avoir = crédit client
      lines.push({
        JournalCode: JOURNAL_CODES.VE.code,
        JournalLib: JOURNAL_CODES.VE.lib,
        EcritureNum: ecritureNumStr,
        EcritureDate: pieceDate,
        CompteNum: ACCOUNTS.CLIENT.num,
        CompteLib: ACCOUNTS.CLIENT.lib,
        CompAuxNum: customerRef,
        CompAuxLib: escapeFECField(creditNote.customer_name || ''),
        PieceRef: pieceRef,
        PieceDate: pieceDate,
        EcritureLib: escapeFECField(`Avoir ${pieceRef}`),
        Debit: '0,00',
        Credit: formatAmount(totalTTC),
        EcritureLet: '',
        DateLet: '',
        ValidDate: pieceDate,
        Montantdevise: '',
        Idevise: 'EUR'
      });

      // Ligne débit ventes (706/707)
      lines.push({
        JournalCode: JOURNAL_CODES.VE.code,
        JournalLib: JOURNAL_CODES.VE.lib,
        EcritureNum: ecritureNumStr,
        EcritureDate: pieceDate,
        CompteNum: ACCOUNTS.VENTES_SERVICES.num,
        CompteLib: ACCOUNTS.VENTES_SERVICES.lib,
        CompAuxNum: '',
        CompAuxLib: '',
        PieceRef: pieceRef,
        PieceDate: pieceDate,
        EcritureLib: escapeFECField(`Annulation ventes ${pieceRef}`),
        Debit: formatAmount(totalHT),
        Credit: '0,00',
        EcritureLet: '',
        DateLet: '',
        ValidDate: pieceDate,
        Montantdevise: '',
        Idevise: 'EUR'
      });

      // Ligne débit TVA collectée (44571)
      if (totalTVA > 0) {
        lines.push({
          JournalCode: JOURNAL_CODES.VE.code,
          JournalLib: JOURNAL_CODES.VE.lib,
          EcritureNum: ecritureNumStr,
          EcritureDate: pieceDate,
          CompteNum: ACCOUNTS.TVA_COLLECTEE.num,
          CompteLib: ACCOUNTS.TVA_COLLECTEE.lib,
          CompAuxNum: '',
          CompAuxLib: '',
          PieceRef: pieceRef,
          PieceDate: pieceDate,
          EcritureLib: escapeFECField(`TVA sur avoir ${pieceRef}`),
          Debit: formatAmount(totalTVA),
          Credit: '0,00',
          EcritureLet: '',
          DateLet: '',
          ValidDate: pieceDate,
          Montantdevise: '',
          Idevise: 'EUR'
        });
      }

      ecritureNum++;
    }

    // =========================================================================
    // 3. PAIEMENTS REÇUS (Journal BQ)
    // =========================================================================
    const paymentsResult = await pool.query(`
      SELECT
        p.*,
        i.invoice_number,
        c.name as customer_name
      FROM payments p
      LEFT JOIN invoices i ON p.invoice_id = i.id
      LEFT JOIN customers c ON i.customer_id = c.id
      WHERE p.payment_date >= $1 AND p.payment_date <= $2
      ORDER BY p.payment_date, p.id
    `, [from_date, to_date]);

    for (const payment of paymentsResult.rows) {
      const pieceRef = `REG-${payment.id}`;
      const pieceDate = formatDate(payment.payment_date);
      const amount = parseFloat(payment.amount || 0);
      const ecritureNumStr = String(ecritureNum).padStart(8, '0');
      const customerRef = payment.invoice_id ? `C${payment.invoice_id}` : '';

      // Ligne débit banque (512)
      lines.push({
        JournalCode: JOURNAL_CODES.BQ.code,
        JournalLib: JOURNAL_CODES.BQ.lib,
        EcritureNum: ecritureNumStr,
        EcritureDate: pieceDate,
        CompteNum: payment.payment_method === 'cash' ? ACCOUNTS.CAISSE.num : ACCOUNTS.BANQUE.num,
        CompteLib: payment.payment_method === 'cash' ? ACCOUNTS.CAISSE.lib : ACCOUNTS.BANQUE.lib,
        CompAuxNum: '',
        CompAuxLib: '',
        PieceRef: pieceRef,
        PieceDate: pieceDate,
        EcritureLib: escapeFECField(`Règlement ${payment.invoice_number || 'facture'} - ${payment.customer_name || 'Client'}`),
        Debit: formatAmount(amount),
        Credit: '0,00',
        EcritureLet: '',
        DateLet: '',
        ValidDate: pieceDate,
        Montantdevise: '',
        Idevise: 'EUR'
      });

      // Ligne crédit client (411)
      lines.push({
        JournalCode: JOURNAL_CODES.BQ.code,
        JournalLib: JOURNAL_CODES.BQ.lib,
        EcritureNum: ecritureNumStr,
        EcritureDate: pieceDate,
        CompteNum: ACCOUNTS.CLIENT.num,
        CompteLib: ACCOUNTS.CLIENT.lib,
        CompAuxNum: customerRef,
        CompAuxLib: escapeFECField(payment.customer_name || ''),
        PieceRef: pieceRef,
        PieceDate: pieceDate,
        EcritureLib: escapeFECField(`Règlement ${payment.invoice_number || ''}`),
        Debit: '0,00',
        Credit: formatAmount(amount),
        EcritureLet: payment.invoice_number ? 'L' + payment.invoice_number.slice(-6) : '',
        DateLet: pieceDate,
        ValidDate: pieceDate,
        Montantdevise: '',
        Idevise: 'EUR'
      });

      ecritureNum++;
    }

    // =========================================================================
    // 4. DÉPENSES (Journal AC)
    // =========================================================================
    const expensesResult = await pool.query(`
      SELECT
        e.*,
        s.name as supplier_name,
        ec.name as category_name
      FROM expenses e
      LEFT JOIN suppliers s ON e.supplier_id = s.id
      LEFT JOIN expense_categories ec ON e.category_id = ec.id
      WHERE e.expense_date >= $1 AND e.expense_date <= $2
        AND e.status != 'draft'
        AND e.deleted_at IS NULL
      ORDER BY e.expense_date, e.id
    `, [from_date, to_date]);

    for (const expense of expensesResult.rows) {
      const pieceRef = expense.reference || `DEP-${expense.id}`;
      const pieceDate = formatDate(expense.expense_date);
      const amountHT = parseFloat(expense.amount || 0);
      const amountTVA = parseFloat(expense.tax_amount || 0);
      const amountTTC = amountHT + amountTVA;
      const ecritureNumStr = String(ecritureNum).padStart(8, '0');
      const supplierRef = expense.supplier_id ? `F${expense.supplier_id}` : '';

      // Ligne débit charges (6xx)
      lines.push({
        JournalCode: JOURNAL_CODES.AC.code,
        JournalLib: JOURNAL_CODES.AC.lib,
        EcritureNum: ecritureNumStr,
        EcritureDate: pieceDate,
        CompteNum: ACCOUNTS.SERVICES.num,
        CompteLib: escapeFECField(expense.category_name || ACCOUNTS.SERVICES.lib),
        CompAuxNum: '',
        CompAuxLib: '',
        PieceRef: pieceRef,
        PieceDate: pieceDate,
        EcritureLib: escapeFECField(expense.description || `Dépense ${pieceRef}`),
        Debit: formatAmount(amountHT),
        Credit: '0,00',
        EcritureLet: '',
        DateLet: '',
        ValidDate: pieceDate,
        Montantdevise: '',
        Idevise: 'EUR'
      });

      // Ligne débit TVA déductible (44566) si applicable
      if (amountTVA > 0) {
        lines.push({
          JournalCode: JOURNAL_CODES.AC.code,
          JournalLib: JOURNAL_CODES.AC.lib,
          EcritureNum: ecritureNumStr,
          EcritureDate: pieceDate,
          CompteNum: ACCOUNTS.TVA_DEDUCTIBLE.num,
          CompteLib: ACCOUNTS.TVA_DEDUCTIBLE.lib,
          CompAuxNum: '',
          CompAuxLib: '',
          PieceRef: pieceRef,
          PieceDate: pieceDate,
          EcritureLib: escapeFECField(`TVA déductible ${pieceRef}`),
          Debit: formatAmount(amountTVA),
          Credit: '0,00',
          EcritureLet: '',
          DateLet: '',
          ValidDate: pieceDate,
          Montantdevise: '',
          Idevise: 'EUR'
        });
      }

      // Ligne crédit fournisseur (401)
      lines.push({
        JournalCode: JOURNAL_CODES.AC.code,
        JournalLib: JOURNAL_CODES.AC.lib,
        EcritureNum: ecritureNumStr,
        EcritureDate: pieceDate,
        CompteNum: ACCOUNTS.FOURNISSEUR.num,
        CompteLib: ACCOUNTS.FOURNISSEUR.lib,
        CompAuxNum: supplierRef,
        CompAuxLib: escapeFECField(expense.supplier_name || ''),
        PieceRef: pieceRef,
        PieceDate: pieceDate,
        EcritureLib: escapeFECField(`Facture fournisseur ${pieceRef}`),
        Debit: '0,00',
        Credit: formatAmount(amountTTC),
        EcritureLet: expense.payment_status === 'paid' ? 'L' + pieceRef.slice(-6) : '',
        DateLet: expense.payment_date ? formatDate(expense.payment_date) : '',
        ValidDate: pieceDate,
        Montantdevise: '',
        Idevise: 'EUR'
      });

      ecritureNum++;
    }

    // =========================================================================
    // GÉNÉRATION DU FICHIER FEC
    // =========================================================================

    // Nom du fichier selon norme: SIREN + FEC + AAAAMMJJ.txt
    const sirenValue = siren || '000000000';
    const endDate = new Date(to_date as string);
    const filename = `${sirenValue}FEC${formatDate(endDate)}.txt`;

    // En-têtes FEC
    const headers = [
      'JournalCode', 'JournalLib', 'EcritureNum', 'EcritureDate',
      'CompteNum', 'CompteLib', 'CompAuxNum', 'CompAuxLib',
      'PieceRef', 'PieceDate', 'EcritureLib', 'Debit', 'Credit',
      'EcritureLet', 'DateLet', 'ValidDate', 'Montantdevise', 'Idevise'
    ];

    // Générer le contenu du fichier
    let content = headers.join('|') + '\n';

    for (const line of lines) {
      const row = [
        line.JournalCode,
        line.JournalLib,
        line.EcritureNum,
        line.EcritureDate,
        line.CompteNum,
        line.CompteLib,
        line.CompAuxNum,
        line.CompAuxLib,
        line.PieceRef,
        line.PieceDate,
        line.EcritureLib,
        line.Debit,
        line.Credit,
        line.EcritureLet,
        line.DateLet,
        line.ValidDate,
        line.Montantdevise,
        line.Idevise
      ];
      content += row.join('|') + '\n';
    }

    // Envoi du fichier
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(content);

  } catch (error: any) {
    console.error('Erreur lors de la génération du FEC:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/exports/fec/preview
 * Prévisualisation du FEC sans téléchargement
 */
router.get('/fec/preview', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  try {
    const { from_date, to_date } = req.query;

    if (!from_date || !to_date) {
      return res.status(400).json({
        error: 'Les paramètres from_date et to_date sont requis (format: YYYY-MM-DD)'
      });
    }

    // Compter les écritures
    const invoicesCount = await pool.query(`
      SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total
      FROM invoices
      WHERE invoice_date >= $1 AND invoice_date <= $2
        AND status NOT IN ('draft', 'cancelled')
    `, [from_date, to_date]);

    const creditNotesCount = await pool.query(`
      SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total
      FROM credit_notes
      WHERE credit_note_date >= $1 AND credit_note_date <= $2
        AND status NOT IN ('draft', 'cancelled')
        AND deleted_at IS NULL
    `, [from_date, to_date]);

    const paymentsCount = await pool.query(`
      SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total
      FROM payments
      WHERE payment_date >= $1 AND payment_date <= $2
    `, [from_date, to_date]);

    const expensesCount = await pool.query(`
      SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total
      FROM expenses
      WHERE expense_date >= $1 AND expense_date <= $2
        AND status != 'draft'
        AND deleted_at IS NULL
    `, [from_date, to_date]);

    res.json({
      period: { from: from_date, to: to_date },
      summary: {
        invoices: {
          count: parseInt(invoicesCount.rows[0].count),
          total: parseFloat(invoicesCount.rows[0].total)
        },
        credit_notes: {
          count: parseInt(creditNotesCount.rows[0].count),
          total: parseFloat(creditNotesCount.rows[0].total)
        },
        payments: {
          count: parseInt(paymentsCount.rows[0].count),
          total: parseFloat(paymentsCount.rows[0].total)
        },
        expenses: {
          count: parseInt(expensesCount.rows[0].count),
          total: parseFloat(expensesCount.rows[0].total)
        }
      },
      estimated_lines: (
        parseInt(invoicesCount.rows[0].count) * 3 +   // 3 lignes par facture
        parseInt(creditNotesCount.rows[0].count) * 3 + // 3 lignes par avoir
        parseInt(paymentsCount.rows[0].count) * 2 +   // 2 lignes par paiement
        parseInt(expensesCount.rows[0].count) * 3     // 3 lignes par dépense
      )
    });

  } catch (error: any) {
    console.error('Erreur lors de la prévisualisation du FEC:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/exports/csv
 * Export CSV générique des données
 */
router.get('/csv/:type', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  try {
    const { type } = req.params;
    const { from_date, to_date } = req.query;

    let query = '';
    let filename = '';
    let headers: string[] = [];

    switch (type) {
      case 'invoices':
        query = `
          SELECT
            i.invoice_number as "Numéro",
            i.invoice_date as "Date",
            c.name as "Client",
            i.subtotal as "HT",
            i.tax_amount as "TVA",
            i.total_amount as "TTC",
            i.status as "Statut"
          FROM invoices i
          LEFT JOIN customers c ON i.customer_id = c.id
          WHERE i.invoice_date >= $1 AND i.invoice_date <= $2
          ORDER BY i.invoice_date DESC
        `;
        filename = 'factures.csv';
        headers = ['Numéro', 'Date', 'Client', 'HT', 'TVA', 'TTC', 'Statut'];
        break;

      case 'payments':
        query = `
          SELECT
            p.payment_date as "Date",
            i.invoice_number as "Facture",
            c.name as "Client",
            p.amount as "Montant",
            p.payment_method as "Mode"
          FROM payments p
          LEFT JOIN invoices i ON p.invoice_id = i.id
          LEFT JOIN customers c ON i.customer_id = c.id
          WHERE p.payment_date >= $1 AND p.payment_date <= $2
          ORDER BY p.payment_date DESC
        `;
        filename = 'paiements.csv';
        headers = ['Date', 'Facture', 'Client', 'Montant', 'Mode'];
        break;

      case 'expenses':
        query = `
          SELECT
            e.expense_date as "Date",
            e.reference as "Référence",
            s.name as "Fournisseur",
            ec.name as "Catégorie",
            e.amount as "Montant HT",
            e.tax_amount as "TVA",
            e.status as "Statut"
          FROM expenses e
          LEFT JOIN suppliers s ON e.supplier_id = s.id
          LEFT JOIN expense_categories ec ON e.category_id = ec.id
          WHERE e.expense_date >= $1 AND e.expense_date <= $2
            AND e.deleted_at IS NULL
          ORDER BY e.expense_date DESC
        `;
        filename = 'depenses.csv';
        headers = ['Date', 'Référence', 'Fournisseur', 'Catégorie', 'Montant HT', 'TVA', 'Statut'];
        break;

      default:
        return res.status(400).json({ error: 'Type d\'export non supporté. Types valides: invoices, payments, expenses' });
    }

    const result = await pool.query(query, [from_date || '1900-01-01', to_date || '2099-12-31']);

    // Générer CSV
    let csv = headers.join(';') + '\n';
    for (const row of result.rows) {
      const values = headers.map(h => {
        const val = row[h];
        if (val === null || val === undefined) return '';
        if (typeof val === 'number') return val.toString().replace('.', ',');
        if (val instanceof Date) return val.toLocaleDateString('fr-FR');
        return `"${String(val).replace(/"/g, '""')}"`;
      });
      csv += values.join(';') + '\n';
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('\ufeff' + csv); // BOM for Excel UTF-8 support

  } catch (error: any) {
    console.error('Erreur lors de l\'export CSV:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
