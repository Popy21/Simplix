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
      WHERE i.organization_id = $1
        AND p.payment_date BETWEEN $2 AND $3
        AND i.deleted_at IS NULL
    `, [organizationId, startDate, endDate]);

    // Charges (dépenses payées)
    const expensesResult = await db.query(`
      SELECT
        COALESCE(category, 'other') as category,
        COALESCE(SUM(amount), 0) as amount
      FROM expenses
      WHERE organization_id = $1
        AND paid_date BETWEEN $2 AND $3
        AND status = 'paid'
        AND deleted_at IS NULL
      GROUP BY category
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
      WHERE i.organization_id = $1
        AND EXTRACT(YEAR FROM p.payment_date) = $2
        AND i.deleted_at IS NULL
      GROUP BY EXTRACT(MONTH FROM p.payment_date)
    `, [organizationId, year]);

    // Dépenses mensuelles
    const expensesResult = await db.query(`
      SELECT
        EXTRACT(MONTH FROM paid_date)::INTEGER as month,
        COALESCE(SUM(amount), 0) as amount
      FROM expenses
      WHERE organization_id = $1
        AND EXTRACT(YEAR FROM paid_date) = $2
        AND status = 'paid'
        AND deleted_at IS NULL
      GROUP BY EXTRACT(MONTH FROM paid_date)
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

export default router;
