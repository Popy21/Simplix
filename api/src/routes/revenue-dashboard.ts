import express, { Response } from 'express';
import { pool as db } from '../database/db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Dashboard principal du CA
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    // CA annuel
    const yearlyResult = await db.query(`
      SELECT
        COALESCE(SUM(total_amount), 0) as total_revenue,
        COUNT(*) as invoice_count,
        COALESCE(AVG(total_amount), 0) as avg_invoice
      FROM invoices
      WHERE EXTRACT(YEAR FROM invoice_date) = $1
        AND status IN ('sent', 'paid', 'partial')
        AND deleted_at IS NULL
        AND ($2::UUID IS NULL OR organization_id = $2)
    `, [currentYear, organizationId]);

    // CA mensuel (mois en cours)
    const monthlyResult = await db.query(`
      SELECT
        COALESCE(SUM(total_amount), 0) as total_revenue,
        COUNT(*) as invoice_count
      FROM invoices
      WHERE EXTRACT(YEAR FROM invoice_date) = $1
        AND EXTRACT(MONTH FROM invoice_date) = $2
        AND status IN ('sent', 'paid', 'partial')
        AND deleted_at IS NULL
        AND ($3::UUID IS NULL OR organization_id = $3)
    `, [currentYear, currentMonth, organizationId]);

    // CA du mois précédent (pour comparaison)
    const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;

    const lastMonthResult = await db.query(`
      SELECT COALESCE(SUM(total_amount), 0) as total_revenue
      FROM invoices
      WHERE EXTRACT(YEAR FROM invoice_date) = $1
        AND EXTRACT(MONTH FROM invoice_date) = $2
        AND status IN ('sent', 'paid', 'partial')
        AND deleted_at IS NULL
        AND ($3::UUID IS NULL OR organization_id = $3)
    `, [lastMonthYear, lastMonth, organizationId]);

    // Encaissements réels
    const paymentsResult = await db.query(`
      SELECT
        COALESCE(SUM(p.amount), 0) as total_collected
      FROM payments p
      JOIN invoices i ON p.invoice_id = i.id
      WHERE EXTRACT(YEAR FROM p.payment_date) = $1
        AND i.deleted_at IS NULL
        AND ($2::UUID IS NULL OR i.organization_id = $2)
    `, [currentYear, organizationId]);

    // Impayés
    const unpaidResult = await db.query(`
      SELECT
        COALESCE(SUM(i.total_amount - COALESCE((SELECT SUM(amount) FROM payments WHERE invoice_id = i.id), 0)), 0) as total_unpaid,
        COUNT(*) as unpaid_count
      FROM invoices i
      WHERE i.status IN ('sent', 'overdue', 'partial')
        AND i.deleted_at IS NULL
        AND ($1::UUID IS NULL OR i.organization_id = $1)
    `, [organizationId]);

    // Calcul de la variation mensuelle
    const currentMonthRevenue = parseFloat(monthlyResult.rows[0].total_revenue);
    const lastMonthRevenue = parseFloat(lastMonthResult.rows[0].total_revenue);
    const monthlyVariation = lastMonthRevenue > 0
      ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
      : 0;

    res.json({
      period: {
        year: currentYear,
        month: currentMonth
      },
      yearly: {
        revenue: parseFloat(yearlyResult.rows[0].total_revenue),
        invoice_count: parseInt(yearlyResult.rows[0].invoice_count),
        avg_invoice: parseFloat(yearlyResult.rows[0].avg_invoice),
        collected: parseFloat(paymentsResult.rows[0].total_collected)
      },
      monthly: {
        revenue: currentMonthRevenue,
        invoice_count: parseInt(monthlyResult.rows[0].invoice_count),
        variation: parseFloat(monthlyVariation.toFixed(2)),
        last_month_revenue: lastMonthRevenue
      },
      unpaid: {
        total: parseFloat(unpaidResult.rows[0].total_unpaid),
        count: parseInt(unpaidResult.rows[0].unpaid_count)
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Résumé du CA (summary)
router.get('/summary', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;
    const { period = 'month' } = req.query;
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
        break;
      case 'month':
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const result = await db.query(`
      SELECT
        COALESCE(SUM(total_amount) FILTER (WHERE status IN ('sent', 'paid', 'partial')), 0) as total_revenue,
        COALESCE(SUM(total_amount) FILTER (WHERE status = 'paid'), 0) as collected,
        COALESCE(SUM(total_amount) FILTER (WHERE status IN ('sent', 'partial')), 0) as outstanding,
        COUNT(*) FILTER (WHERE status IN ('sent', 'paid', 'partial')) as invoice_count,
        COUNT(*) FILTER (WHERE status = 'paid') as paid_count,
        COUNT(*) FILTER (WHERE status IN ('sent', 'partial') AND due_date < CURRENT_DATE) as overdue_count,
        COALESCE(SUM(total_amount) FILTER (WHERE status IN ('sent', 'partial') AND due_date < CURRENT_DATE), 0) as overdue_amount
      FROM invoices
      WHERE invoice_date >= $1
        AND deleted_at IS NULL
        AND ($2::UUID IS NULL OR organization_id = $2)
    `, [startDate, organizationId]);

    res.json({
      period,
      startDate: startDate.toISOString().split('T')[0],
      ...result.rows[0]
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// CA mensuel détaillé
router.get('/monthly', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;
    const { year } = req.query;
    const targetYear = year ? parseInt(year as string) : new Date().getFullYear();

    const result = await db.query(`
      SELECT
        EXTRACT(MONTH FROM invoice_date) as month,
        TO_CHAR(invoice_date, 'TMMonth') as month_name,
        COALESCE(SUM(total_amount), 0) as revenue,
        COUNT(*) as invoice_count,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN total_amount ELSE 0 END), 0) as paid_revenue,
        COALESCE(SUM(CASE WHEN status IN ('sent', 'overdue', 'partial') THEN total_amount ELSE 0 END), 0) as pending_revenue
      FROM invoices
      WHERE EXTRACT(YEAR FROM invoice_date) = $1
        AND status IN ('sent', 'paid', 'partial', 'overdue')
        AND deleted_at IS NULL
        AND ($2::UUID IS NULL OR organization_id = $2)
      GROUP BY EXTRACT(MONTH FROM invoice_date), TO_CHAR(invoice_date, 'TMMonth')
      ORDER BY month
    `, [targetYear, organizationId]);

    // Compléter les mois manquants
    const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
                        'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    const completeData = monthNames.map((name, index) => {
      const existing = result.rows.find(r => parseInt(r.month) === index + 1);
      return existing || {
        month: index + 1,
        month_name: name,
        revenue: 0,
        invoice_count: 0,
        paid_revenue: 0,
        pending_revenue: 0
      };
    });

    // Calculer les totaux
    const totals = completeData.reduce((acc, m) => ({
      revenue: acc.revenue + parseFloat(m.revenue),
      invoice_count: acc.invoice_count + parseInt(m.invoice_count),
      paid_revenue: acc.paid_revenue + parseFloat(m.paid_revenue),
      pending_revenue: acc.pending_revenue + parseFloat(m.pending_revenue)
    }), { revenue: 0, invoice_count: 0, paid_revenue: 0, pending_revenue: 0 });

    res.json({
      year: targetYear,
      months: completeData,
      totals
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// CA trimestriel
router.get('/quarterly', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;
    const { year } = req.query;
    const targetYear = year ? parseInt(year as string) : new Date().getFullYear();

    const result = await db.query(`
      SELECT
        EXTRACT(QUARTER FROM invoice_date) as quarter,
        COALESCE(SUM(total_amount), 0) as revenue,
        COUNT(*) as invoice_count,
        COALESCE(SUM(tax_amount), 0) as tax_collected
      FROM invoices
      WHERE EXTRACT(YEAR FROM invoice_date) = $1
        AND status IN ('sent', 'paid', 'partial', 'overdue')
        AND deleted_at IS NULL
        AND ($2::UUID IS NULL OR organization_id = $2)
      GROUP BY EXTRACT(QUARTER FROM invoice_date)
      ORDER BY quarter
    `, [targetYear, organizationId]);

    // Compléter les trimestres manquants
    const quarterNames = ['T1 (Jan-Mar)', 'T2 (Avr-Jun)', 'T3 (Jul-Sep)', 'T4 (Oct-Dec)'];
    const completeData = quarterNames.map((name, index) => {
      const existing = result.rows.find(r => parseInt(r.quarter) === index + 1);
      return {
        quarter: index + 1,
        quarter_name: name,
        revenue: existing ? parseFloat(existing.revenue) : 0,
        invoice_count: existing ? parseInt(existing.invoice_count) : 0,
        tax_collected: existing ? parseFloat(existing.tax_collected) : 0
      };
    });

    res.json({
      year: targetYear,
      quarters: completeData
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// CA par client (Top clients)
router.get('/by-customer', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;
    const { year, limit } = req.query;
    const targetYear = year ? parseInt(year as string) : new Date().getFullYear();
    const topLimit = limit ? parseInt(limit as string) : 10;

    const result = await db.query(`
      SELECT
        c.id as customer_id,
        c.name as customer_name,
        c.email as customer_email,
        COUNT(DISTINCT i.id) as invoice_count,
        COALESCE(SUM(i.total_amount), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN i.status = 'paid' THEN i.total_amount ELSE 0 END), 0) as paid_revenue,
        COALESCE(AVG(i.total_amount), 0) as avg_invoice
      FROM customers c
      JOIN invoices i ON c.id = i.customer_id
      WHERE EXTRACT(YEAR FROM i.invoice_date) = $1
        AND i.status IN ('sent', 'paid', 'partial', 'overdue')
        AND i.deleted_at IS NULL
        AND ($2::UUID IS NULL OR i.organization_id = $2)
      GROUP BY c.id, c.name, c.email
      ORDER BY total_revenue DESC
      LIMIT $3
    `, [targetYear, organizationId, topLimit]);

    // Calculer le pourcentage du CA total
    const totalRevenue = result.rows.reduce((sum, r) => sum + parseFloat(r.total_revenue), 0);
    const withPercentage = result.rows.map(r => ({
      ...r,
      percentage: totalRevenue > 0 ? ((parseFloat(r.total_revenue) / totalRevenue) * 100).toFixed(1) : 0
    }));

    res.json({
      year: targetYear,
      total_revenue: totalRevenue,
      top_customers: withPercentage
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// CA par produit/service
router.get('/by-product', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;
    const { year, limit } = req.query;
    const targetYear = year ? parseInt(year as string) : new Date().getFullYear();
    const topLimit = limit ? parseInt(limit as string) : 10;

    const result = await db.query(`
      SELECT
        p.id as product_id,
        p.name as product_name,
        p.category,
        COUNT(*) as times_sold,
        COALESCE(SUM(ii.quantity), 0) as total_quantity,
        COALESCE(SUM(ii.total_price), 0) as total_revenue,
        COALESCE(AVG(ii.unit_price), 0) as avg_unit_price
      FROM products p
      JOIN invoice_items ii ON p.id = ii.product_id
      JOIN invoices i ON ii.invoice_id = i.id
      WHERE EXTRACT(YEAR FROM i.invoice_date) = $1
        AND i.status IN ('sent', 'paid', 'partial', 'overdue')
        AND i.deleted_at IS NULL
        AND ($2::UUID IS NULL OR i.organization_id = $2)
      GROUP BY p.id, p.name, p.category
      ORDER BY total_revenue DESC
      LIMIT $3
    `, [targetYear, organizationId, topLimit]);

    res.json({
      year: targetYear,
      top_products: result.rows
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Comparaison année sur année
router.get('/year-comparison', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;
    const currentYear = new Date().getFullYear();
    const years = [currentYear - 2, currentYear - 1, currentYear];

    const results = await Promise.all(years.map(async (year) => {
      const result = await db.query(`
        SELECT
          COALESCE(SUM(total_amount), 0) as revenue,
          COUNT(*) as invoice_count,
          COALESCE(AVG(total_amount), 0) as avg_invoice
        FROM invoices
        WHERE EXTRACT(YEAR FROM invoice_date) = $1
          AND status IN ('sent', 'paid', 'partial', 'overdue')
          AND deleted_at IS NULL
          AND ($2::UUID IS NULL OR organization_id = $2)
      `, [year, organizationId]);

      return {
        year,
        ...result.rows[0]
      };
    }));

    // Calculer les variations
    const withVariations = results.map((r, index) => {
      if (index === 0) return { ...r, variation: null };
      const previousRevenue = parseFloat(results[index - 1].revenue);
      const currentRevenue = parseFloat(r.revenue);
      const variation = previousRevenue > 0
        ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
        : 0;
      return { ...r, variation: parseFloat(variation.toFixed(2)) };
    });

    res.json(withVariations);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Prévisions basées sur les tendances
router.get('/forecast', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    // Récupérer les 12 derniers mois
    const result = await db.query(`
      SELECT
        DATE_TRUNC('month', invoice_date) as month,
        COALESCE(SUM(total_amount), 0) as revenue
      FROM invoices
      WHERE invoice_date >= CURRENT_DATE - INTERVAL '12 months'
        AND status IN ('sent', 'paid', 'partial', 'overdue')
        AND deleted_at IS NULL
        AND ($1::UUID IS NULL OR organization_id = $1)
      GROUP BY DATE_TRUNC('month', invoice_date)
      ORDER BY month
    `, [organizationId]);

    // Calculer la moyenne mobile
    const revenues = result.rows.map(r => parseFloat(r.revenue));
    const avgRevenue = revenues.length > 0
      ? revenues.reduce((a, b) => a + b, 0) / revenues.length
      : 0;

    // Tendance (régression linéaire simple)
    let trend = 0;
    if (revenues.length >= 3) {
      const n = revenues.length;
      const sumX = (n * (n - 1)) / 2;
      const sumY = revenues.reduce((a, b) => a + b, 0);
      const sumXY = revenues.reduce((sum, y, i) => sum + i * y, 0);
      const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
      trend = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    }

    // Prévoir les 3 prochains mois
    const forecast = [];
    for (let i = 1; i <= 3; i++) {
      const forecastMonth = new Date(currentYear, currentMonth - 1 + i, 1);
      const forecastedRevenue = avgRevenue + (trend * (revenues.length + i));
      forecast.push({
        month: forecastMonth.toISOString().substring(0, 7),
        month_name: forecastMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
        forecasted_revenue: Math.max(0, forecastedRevenue).toFixed(2),
        confidence: revenues.length >= 6 ? 'high' : revenues.length >= 3 ? 'medium' : 'low'
      });
    }

    // Devis en cours (potentiel)
    const quotesResult = await db.query(`
      SELECT COALESCE(SUM(total_amount), 0) as potential_revenue
      FROM quotes
      WHERE status IN ('sent', 'draft')
        AND deleted_at IS NULL
        AND ($1::UUID IS NULL OR organization_id = $1)
    `, [organizationId]);

    res.json({
      historical: result.rows,
      average_monthly: avgRevenue.toFixed(2),
      trend: trend > 0 ? 'up' : trend < 0 ? 'down' : 'stable',
      trend_value: trend.toFixed(2),
      forecast,
      potential_from_quotes: parseFloat(quotesResult.rows[0].potential_revenue)
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// KPIs de performance
router.get('/kpis', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;
    const currentYear = new Date().getFullYear();

    // Délai moyen de paiement
    const dsoResult = await db.query(`
      SELECT
        COALESCE(AVG(
          CASE WHEN p.payment_date IS NOT NULL
            THEN EXTRACT(DAY FROM (p.payment_date - i.invoice_date))
            ELSE NULL
          END
        ), 0) as avg_payment_days
      FROM invoices i
      LEFT JOIN (
        SELECT invoice_id, MIN(payment_date) as payment_date
        FROM payments
        GROUP BY invoice_id
      ) p ON i.id = p.invoice_id
      WHERE EXTRACT(YEAR FROM i.invoice_date) = $1
        AND i.status = 'paid'
        AND i.deleted_at IS NULL
        AND ($2::UUID IS NULL OR i.organization_id = $2)
    `, [currentYear, organizationId]);

    // Taux de conversion devis -> facture
    const conversionResult = await db.query(`
      SELECT
        COUNT(*) as total_quotes,
        COUNT(*) FILTER (WHERE status IN ('accepted', 'converted')) as converted_quotes
      FROM quotes
      WHERE EXTRACT(YEAR FROM created_at) = $1
        AND deleted_at IS NULL
        AND ($2::UUID IS NULL OR organization_id = $2)
    `, [currentYear, organizationId]);

    const conversionRate = parseInt(conversionResult.rows[0].total_quotes) > 0
      ? (parseInt(conversionResult.rows[0].converted_quotes) / parseInt(conversionResult.rows[0].total_quotes)) * 100
      : 0;

    // Taux de recouvrement
    const recoveryResult = await db.query(`
      SELECT
        COALESCE(SUM(i.total_amount), 0) as total_invoiced,
        COALESCE(SUM(CASE WHEN i.status = 'paid' THEN i.total_amount ELSE 0 END), 0) as total_paid
      FROM invoices i
      WHERE EXTRACT(YEAR FROM i.invoice_date) = $1
        AND i.status IN ('sent', 'paid', 'partial', 'overdue')
        AND i.deleted_at IS NULL
        AND ($2::UUID IS NULL OR i.organization_id = $2)
    `, [currentYear, organizationId]);

    const recoveryRate = parseFloat(recoveryResult.rows[0].total_invoiced) > 0
      ? (parseFloat(recoveryResult.rows[0].total_paid) / parseFloat(recoveryResult.rows[0].total_invoiced)) * 100
      : 0;

    // Panier moyen
    const avgBasketResult = await db.query(`
      SELECT COALESCE(AVG(total_amount), 0) as avg_basket
      FROM invoices
      WHERE EXTRACT(YEAR FROM invoice_date) = $1
        AND status IN ('sent', 'paid', 'partial', 'overdue')
        AND deleted_at IS NULL
        AND ($2::UUID IS NULL OR organization_id = $2)
    `, [currentYear, organizationId]);

    res.json({
      year: currentYear,
      dso: parseFloat(dsoResult.rows[0].avg_payment_days).toFixed(1), // Days Sales Outstanding
      conversion_rate: conversionRate.toFixed(1),
      recovery_rate: recoveryRate.toFixed(1),
      avg_basket: parseFloat(avgBasketResult.rows[0].avg_basket).toFixed(2),
      quotes: {
        total: parseInt(conversionResult.rows[0].total_quotes),
        converted: parseInt(conversionResult.rows[0].converted_quotes)
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
