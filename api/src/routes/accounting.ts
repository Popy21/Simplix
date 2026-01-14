import express, { Response } from 'express';
import { pool as db } from '../database/db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

// ==========================================
// COMPTE DE RÉSULTAT
// ==========================================

// Compte de résultat par période
router.get('/income-statement', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;
    const { start_date, end_date, period } = req.query;

    // Si pas de dates, utiliser l'année en cours
    const startDate = start_date || `${new Date().getFullYear()}-01-01`;
    const endDate = end_date || `${new Date().getFullYear()}-12-31`;

    // Revenus (factures payées)
    const salesResult = await db.query(`
      SELECT
        'sales' as category,
        COALESCE(SUM(i.total_amount), 0) as amount
      FROM invoices i
      JOIN payments p ON i.id = p.invoice_id
      WHERE p.payment_date BETWEEN $1 AND $2
    `, [startDate, endDate]);

    // Charges (dépenses payées)
    const expensesResult = await db.query(`
      SELECT
        COALESCE(expense_type, 'other') as category,
        COALESCE(SUM(amount), 0) as amount
      FROM expenses
      WHERE organization_id = $1
        AND payment_date BETWEEN $2 AND $3
        AND payment_status = 'paid'
        AND deleted_at IS NULL
      GROUP BY expense_type
    `, [organizationId, startDate, endDate]);

    // Construire le compte de résultat
    const sales = parseFloat(salesResult.rows[0]?.amount || '0');

    const expensesByCategory: { [key: string]: number } = {};
    let totalExpenses = 0;
    for (const row of expensesResult.rows) {
      const amount = parseFloat(row.amount);
      expensesByCategory[row.category] = amount;
      totalExpenses += amount;
    }

    const incomeStatement = {
      period: { start_date: startDate, end_date: endDate },

      // Produits d'exploitation
      operating_revenue: {
        sales,
        other_revenue: 0,
        total: sales
      },

      // Charges d'exploitation
      operating_expenses: {
        cost_of_goods: expensesByCategory['supplies'] || 0,
        purchases: expensesByCategory['purchases'] || 0,
        external_services: (expensesByCategory['services'] || 0) + (expensesByCategory['other'] || 0),
        personnel: expensesByCategory['salaries'] || 0,
        taxes_fees: expensesByCategory['taxes'] || 0,
        depreciation: expensesByCategory['depreciation'] || 0,
        other: expensesByCategory['misc'] || 0,
        total: totalExpenses
      },

      // Résultat d'exploitation
      operating_income: sales - totalExpenses,

      // Résultat financier (simplifié)
      financial_result: {
        income: 0,
        expenses: expensesByCategory['financial'] || 0,
        total: -(expensesByCategory['financial'] || 0)
      },

      // Résultat exceptionnel
      exceptional_result: {
        income: 0,
        expenses: 0,
        total: 0
      },

      // Résultat avant impôts
      income_before_tax: sales - totalExpenses - (expensesByCategory['financial'] || 0),

      // Impôts (estimé)
      corporate_tax: 0,

      // Résultat net
      net_income: sales - totalExpenses - (expensesByCategory['financial'] || 0)
    };

    res.json(incomeStatement);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Compte de résultat mensuel
router.get('/income-statement/monthly/:year', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { year } = req.params;
    const organizationId = (req.user as any)?.organizationId;

    // Revenus mensuels
    const salesResult = await db.query(`
      SELECT
        EXTRACT(MONTH FROM p.payment_date)::INTEGER as month,
        COALESCE(SUM(i.total_amount), 0) as amount
      FROM invoices i
      JOIN payments p ON i.id = p.invoice_id
      WHERE EXTRACT(YEAR FROM p.payment_date) = $1
      GROUP BY EXTRACT(MONTH FROM p.payment_date)
    `, [year]);

    // Dépenses mensuelles
    const expensesResult = await db.query(`
      SELECT
        EXTRACT(MONTH FROM payment_date)::INTEGER as month,
        COALESCE(SUM(amount), 0) as amount
      FROM expenses
      WHERE organization_id = $1
        AND EXTRACT(YEAR FROM payment_date) = $2
        AND payment_status = 'paid'
        AND deleted_at IS NULL
      GROUP BY EXTRACT(MONTH FROM payment_date)
    `, [organizationId, year]);

    const monthlyData = [];

    for (let month = 1; month <= 12; month++) {
      const salesRow = salesResult.rows.find(r => r.month === month);
      const expensesRow = expensesResult.rows.find(r => r.month === month);

      const revenue = parseFloat(salesRow?.amount || '0');
      const expenses = parseFloat(expensesRow?.amount || '0');

      monthlyData.push({
        month,
        revenue,
        expenses,
        operating_income: revenue - expenses,
        margin_percent: revenue > 0 ? ((revenue - expenses) / revenue * 100).toFixed(1) : 0
      });
    }

    const totals = {
      total_revenue: monthlyData.reduce((sum, m) => sum + m.revenue, 0),
      total_expenses: monthlyData.reduce((sum, m) => sum + m.expenses, 0),
      total_operating_income: monthlyData.reduce((sum, m) => sum + m.operating_income, 0)
    };

    res.json({
      year: parseInt(year),
      monthly_data: monthlyData,
      totals,
      average_margin: totals.total_revenue > 0
        ? ((totals.total_operating_income / totals.total_revenue) * 100).toFixed(1)
        : 0
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Plan comptable
router.get('/chart-of-accounts', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;

    const result = await db.query(`
      SELECT * FROM accounting_categories
      WHERE organization_id = $1 OR organization_id IS NULL
      ORDER BY code
    `, [organizationId]);

    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// MULTI-DEVISES
// ==========================================

// Liste des devises
router.get('/currencies', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const result = await db.query('SELECT * FROM currencies ORDER BY code');
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Taux de change
router.get('/exchange-rates', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { base = 'EUR', date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const result = await db.query(`
      SELECT DISTINCT ON (target_currency)
        er.*,
        c.name as currency_name,
        c.symbol
      FROM exchange_rates er
      JOIN currencies c ON er.target_currency = c.code
      WHERE er.base_currency = $1 AND er.rate_date <= $2
      ORDER BY target_currency, rate_date DESC
    `, [base, targetDate]);

    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Ajouter/mettre à jour un taux de change
router.post('/exchange-rates', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { base_currency, target_currency, rate, rate_date } = req.body;

    const result = await db.query(`
      INSERT INTO exchange_rates (base_currency, target_currency, rate, rate_date)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (base_currency, target_currency, rate_date)
      DO UPDATE SET rate = $3
      RETURNING *
    `, [base_currency || 'EUR', target_currency, rate, rate_date || new Date()]);

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Convertir un montant
router.post('/convert', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { amount, from_currency, to_currency, date } = req.body;
    const targetDate = date || new Date().toISOString().split('T')[0];

    if (from_currency === to_currency) {
      res.json({
        original_amount: amount,
        converted_amount: amount,
        rate: 1,
        from_currency,
        to_currency
      });
      return;
    }

    // Chercher le taux
    let rateResult = await db.query(`
      SELECT rate FROM exchange_rates
      WHERE base_currency = $1 AND target_currency = $2 AND rate_date <= $3
      ORDER BY rate_date DESC LIMIT 1
    `, [from_currency, to_currency, targetDate]);

    let rate = rateResult.rows[0]?.rate;

    if (!rate) {
      // Essayer le taux inverse
      rateResult = await db.query(`
        SELECT 1 / rate as rate FROM exchange_rates
        WHERE base_currency = $1 AND target_currency = $2 AND rate_date <= $3
        ORDER BY rate_date DESC LIMIT 1
      `, [to_currency, from_currency, targetDate]);
      rate = rateResult.rows[0]?.rate;
    }

    if (!rate) {
      res.status(400).json({ error: 'Taux de change non disponible pour cette paire de devises' });
      return;
    }

    res.json({
      original_amount: amount,
      converted_amount: parseFloat((amount * rate).toFixed(2)),
      rate: parseFloat(rate),
      from_currency,
      to_currency,
      rate_date: targetDate
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// EXPORT COMPTABLE
// ==========================================

// Export des données comptables
router.get('/export', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;
    const { format = 'json', start_date, end_date, type = 'all' } = req.query;

    const startDate = start_date || `${new Date().getFullYear()}-01-01`;
    const endDate = end_date || new Date().toISOString().split('T')[0];

    let exportData: any = {
      period: { start_date: startDate, end_date: endDate },
      generated_at: new Date().toISOString(),
      organization_id: organizationId
    };

    // Factures
    if (type === 'all' || type === 'invoices') {
      const invoicesResult = await db.query(`
        SELECT
          i.invoice_number,
          i.invoice_date,
          i.due_date,
          i.status,
          i.subtotal,
          i.tax_rate,
          i.tax_amount,
          i.total_amount,
          c.name as customer_name
        FROM invoices i
        LEFT JOIN customers c ON i.customer_id = c.id
        WHERE i.invoice_date BETWEEN $1 AND $2
        ORDER BY i.invoice_date
      `, [startDate, endDate]);
      exportData.invoices = invoicesResult.rows;
    }

    // Paiements reçus
    if (type === 'all' || type === 'payments') {
      const paymentsResult = await db.query(`
        SELECT
          p.id,
          p.amount,
          p.payment_date,
          p.payment_method,
          i.invoice_number,
          c.name as customer_name
        FROM payments p
        JOIN invoices i ON p.invoice_id = i.id
        LEFT JOIN customers c ON i.customer_id = c.id
        WHERE p.payment_date BETWEEN $1 AND $2
        ORDER BY p.payment_date
      `, [startDate, endDate]);
      exportData.payments = paymentsResult.rows;
    }

    // Dépenses
    if (type === 'all' || type === 'expenses') {
      const expensesResult = await db.query(`
        SELECT
          e.reference,
          e.expense_date,
          e.description,
          e.expense_type,
          e.amount,
          e.tax_amount,
          e.payment_status,
          e.payment_date,
          s.name as supplier_name
        FROM expenses e
        LEFT JOIN suppliers s ON e.supplier_id = s.id
        WHERE e.organization_id = $1
          AND e.deleted_at IS NULL
          AND e.expense_date BETWEEN $2 AND $3
        ORDER BY e.expense_date
      `, [organizationId, startDate, endDate]);
      exportData.expenses = expensesResult.rows;
    }

    // Calculer les totaux
    exportData.summary = {
      total_invoiced: exportData.invoices?.reduce((sum: number, i: any) => sum + parseFloat(i.total_amount || 0), 0) || 0,
      total_received: exportData.payments?.reduce((sum: number, p: any) => sum + parseFloat(p.amount || 0), 0) || 0,
      total_expenses: exportData.expenses?.reduce((sum: number, e: any) => sum + parseFloat(e.amount || 0), 0) || 0
    };
    exportData.summary.net_result = exportData.summary.total_received - exportData.summary.total_expenses;

    if (format === 'csv') {
      // Générer CSV simple
      let csv = 'Type,Date,Reference,Description,Montant HT,TVA,Montant TTC\n';

      if (exportData.invoices) {
        for (const inv of exportData.invoices) {
          csv += `Facture,${inv.invoice_date},${inv.invoice_number},${inv.customer_name || ''},${inv.subtotal},${inv.tax_amount},${inv.total_amount}\n`;
        }
      }

      if (exportData.expenses) {
        for (const exp of exportData.expenses) {
          csv += `Dépense,${exp.expense_date},${exp.reference || ''},${exp.description || ''},${exp.amount},${exp.tax_amount || 0},${parseFloat(exp.amount) + parseFloat(exp.tax_amount || 0)}\n`;
        }
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=export-comptable-${startDate}-${endDate}.csv`);
      res.send(csv);
      return;
    }

    res.json(exportData);
  } catch (err: any) {
    console.error('Erreur export comptable:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// BILAN (BALANCE SHEET)
// ==========================================

router.get('/balance-sheet', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user?.organization_id || '00000000-0000-0000-0000-000000000001';
    const { date } = req.query;
    const asOfDate = date || new Date().toISOString().split('T')[0];

    // Actifs - Créances clients (comptes clients)
    const receivables = await db.query(`
      SELECT COALESCE(SUM(total_amount - COALESCE(paid_amount, 0)), 0) as total
      FROM invoices
      WHERE status IN ('sent', 'pending', 'partial')
        AND created_at <= $1
    `, [asOfDate]);

    // Passifs - Dettes fournisseurs
    const payables = await db.query(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM expenses
      WHERE organization_id = $1
        AND payment_status IN ('unpaid', 'partial')
        AND deleted_at IS NULL
        AND expense_date <= $2
    `, [organizationId, asOfDate]);

    // Revenus cumulés
    const totalRevenue = await db.query(`
      SELECT COALESCE(SUM(total_amount), 0) as total
      FROM invoices
      WHERE status = 'paid'
        AND created_at <= $1
    `, [asOfDate]);

    // Dépenses cumulées
    const totalExpenses = await db.query(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM expenses
      WHERE organization_id = $1
        AND payment_status = 'paid'
        AND deleted_at IS NULL
        AND expense_date <= $2
    `, [organizationId, asOfDate]);

    const assets = {
      receivables: parseFloat(receivables.rows[0].total),
      cash: parseFloat(totalRevenue.rows[0].total) - parseFloat(totalExpenses.rows[0].total),
      total: 0
    };
    assets.total = assets.receivables + assets.cash;

    const liabilities = {
      payables: parseFloat(payables.rows[0].total),
      total: parseFloat(payables.rows[0].total)
    };

    const equity = assets.total - liabilities.total;

    res.json({
      asOfDate,
      assets,
      liabilities,
      equity,
      balanced: Math.abs(assets.total - (liabilities.total + equity)) < 0.01
    });
  } catch (err: any) {
    console.error('Erreur bilan:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// RÉSUMÉ TVA
// ==========================================

router.get('/vat-summary', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user?.organization_id || '00000000-0000-0000-0000-000000000001';
    const { startDate, endDate } = req.query;

    const start = startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const end = endDate || new Date().toISOString().split('T')[0];

    // TVA collectée (sur ventes)
    const vatCollected = await db.query(`
      SELECT
        COALESCE(SUM(total_amount - (total_amount / (1 + 0.20))), 0) as vat_20,
        COALESCE(SUM(
          CASE WHEN vat_rate = 10 THEN total_amount - (total_amount / 1.10) ELSE 0 END
        ), 0) as vat_10,
        COALESCE(SUM(
          CASE WHEN vat_rate = 5.5 THEN total_amount - (total_amount / 1.055) ELSE 0 END
        ), 0) as vat_55
      FROM invoices
      WHERE status = 'paid'
        AND created_at >= $1
        AND created_at <= $2
    `, [start, end]);

    // TVA déductible (sur achats)
    const vatDeductible = await db.query(`
      SELECT
        COALESCE(SUM(amount * 0.20 / 1.20), 0) as vat_20,
        COALESCE(SUM(
          CASE WHEN vat_rate = 10 THEN amount * 0.10 / 1.10 ELSE 0 END
        ), 0) as vat_10,
        COALESCE(SUM(
          CASE WHEN vat_rate = 5.5 THEN amount * 0.055 / 1.055 ELSE 0 END
        ), 0) as vat_55
      FROM expenses
      WHERE organization_id = $1
        AND payment_status = 'paid'
        AND deleted_at IS NULL
        AND expense_date >= $2
        AND expense_date <= $3
    `, [organizationId, start, end]);

    const collected = {
      vat20: parseFloat(vatCollected.rows[0].vat_20 || 0),
      vat10: parseFloat(vatCollected.rows[0].vat_10 || 0),
      vat55: parseFloat(vatCollected.rows[0].vat_55 || 0),
      total: 0
    };
    collected.total = collected.vat20 + collected.vat10 + collected.vat55;

    const deductible = {
      vat20: parseFloat(vatDeductible.rows[0].vat_20 || 0),
      vat10: parseFloat(vatDeductible.rows[0].vat_10 || 0),
      vat55: parseFloat(vatDeductible.rows[0].vat_55 || 0),
      total: 0
    };
    deductible.total = deductible.vat20 + deductible.vat10 + deductible.vat55;

    res.json({
      period: { startDate: start, endDate: end },
      collected,
      deductible,
      balance: collected.total - deductible.total,
      status: collected.total - deductible.total > 0 ? 'to_pay' : 'credit'
    });
  } catch (err: any) {
    console.error('Erreur résumé TVA:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
