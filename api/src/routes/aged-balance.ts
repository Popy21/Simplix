import express, { Response } from 'express';
import { pool as db } from '../database/db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Résumé de la balance âgée
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;
    const referenceDate = new Date().toISOString().split('T')[0];

    const result = await db.query(`
      WITH balances AS (
        SELECT
          i.total_amount - COALESCE((SELECT SUM(amount) FROM payments WHERE invoice_id = i.id), 0) as balance,
          CURRENT_DATE - i.due_date::DATE as days_overdue
        FROM invoices i
        WHERE i.organization_id = $1
          AND i.deleted_at IS NULL
          AND i.status NOT IN ('paid', 'cancelled', 'draft')
          AND i.total_amount > COALESCE((SELECT SUM(amount) FROM payments WHERE invoice_id = i.id), 0)
      )
      SELECT
        COUNT(*) as total_invoices,
        COALESCE(SUM(balance), 0) as total_outstanding,
        COALESCE(SUM(balance) FILTER (WHERE days_overdue < 0), 0) as not_yet_due,
        COALESCE(SUM(balance) FILTER (WHERE days_overdue BETWEEN 0 AND 30), 0) as overdue_0_30,
        COALESCE(SUM(balance) FILTER (WHERE days_overdue BETWEEN 31 AND 60), 0) as overdue_31_60,
        COALESCE(SUM(balance) FILTER (WHERE days_overdue BETWEEN 61 AND 90), 0) as overdue_61_90,
        COALESCE(SUM(balance) FILTER (WHERE days_overdue > 90), 0) as overdue_90_plus
      FROM balances
    `, [organizationId]);

    const summary = result.rows[0];

    res.json({
      referenceDate,
      totalInvoices: parseInt(summary.total_invoices),
      totalOutstanding: parseFloat(summary.total_outstanding),
      agingBuckets: {
        notYetDue: parseFloat(summary.not_yet_due),
        overdue_0_30: parseFloat(summary.overdue_0_30),
        overdue_31_60: parseFloat(summary.overdue_31_60),
        overdue_61_90: parseFloat(summary.overdue_61_90),
        overdue_90_plus: parseFloat(summary.overdue_90_plus)
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Balance âgée des créances clients
router.get('/receivables', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;
    const { as_of_date, customer_id } = req.query;

    // Date de référence (par défaut: aujourd'hui)
    const referenceDate = as_of_date || new Date().toISOString().split('T')[0];

    let query = `
      WITH invoice_balances AS (
        SELECT
          i.id,
          i.invoice_number,
          i.customer_id,
          c.name as customer_name,
          c.email as customer_email,
          i.invoice_date,
          i.due_date,
          i.total_amount,
          COALESCE((SELECT SUM(amount) FROM payments WHERE invoice_id = i.id AND payment_date <= $1::DATE), 0) as amount_paid,
          i.total_amount - COALESCE((SELECT SUM(amount) FROM payments WHERE invoice_id = i.id AND payment_date <= $1::DATE), 0) as balance_due,
          $1::DATE - i.due_date::DATE as days_overdue,
          i.status,
          i.organization_id
        FROM invoices i
        LEFT JOIN customers c ON i.customer_id = c.id
        WHERE i.deleted_at IS NULL
          AND i.status NOT IN ('paid', 'cancelled', 'draft')
          AND i.total_amount > COALESCE((SELECT SUM(amount) FROM payments WHERE invoice_id = i.id AND payment_date <= $1::DATE), 0)
    `;

    const params: any[] = [referenceDate];

    if (organizationId) {
      params.push(organizationId);
      query += ` AND i.organization_id = $${params.length}`;
    }

    if (customer_id) {
      params.push(customer_id);
      query += ` AND i.customer_id = $${params.length}`;
    }

    query += `
      )
      SELECT
        customer_id,
        customer_name,
        customer_email,
        COUNT(*) as invoice_count,
        SUM(balance_due) as total_balance,

        -- Non échu (due_date >= reference_date)
        SUM(CASE WHEN days_overdue <= 0 THEN balance_due ELSE 0 END) as not_due,

        -- 1-30 jours
        SUM(CASE WHEN days_overdue > 0 AND days_overdue <= 30 THEN balance_due ELSE 0 END) as days_1_30,

        -- 31-60 jours
        SUM(CASE WHEN days_overdue > 30 AND days_overdue <= 60 THEN balance_due ELSE 0 END) as days_31_60,

        -- 61-90 jours
        SUM(CASE WHEN days_overdue > 60 AND days_overdue <= 90 THEN balance_due ELSE 0 END) as days_61_90,

        -- Plus de 90 jours
        SUM(CASE WHEN days_overdue > 90 THEN balance_due ELSE 0 END) as days_over_90,

        -- Détails
        json_agg(json_build_object(
          'invoice_id', id,
          'invoice_number', invoice_number,
          'invoice_date', invoice_date,
          'due_date', due_date,
          'total_amount', total_amount,
          'amount_paid', amount_paid,
          'balance_due', balance_due,
          'days_overdue', days_overdue,
          'status', status
        ) ORDER BY due_date) as invoices

      FROM invoice_balances
      GROUP BY customer_id, customer_name, customer_email
      HAVING SUM(balance_due) > 0
      ORDER BY SUM(balance_due) DESC
    `;

    const result = await db.query(query, params);

    // Calculer les totaux
    const totals = {
      total_customers: result.rows.length,
      total_invoices: 0,
      total_balance: 0,
      not_due: 0,
      days_1_30: 0,
      days_31_60: 0,
      days_61_90: 0,
      days_over_90: 0
    };

    result.rows.forEach(row => {
      totals.total_invoices += parseInt(row.invoice_count);
      totals.total_balance += parseFloat(row.total_balance);
      totals.not_due += parseFloat(row.not_due);
      totals.days_1_30 += parseFloat(row.days_1_30);
      totals.days_31_60 += parseFloat(row.days_31_60);
      totals.days_61_90 += parseFloat(row.days_61_90);
      totals.days_over_90 += parseFloat(row.days_over_90);
    });

    res.json({
      as_of_date: referenceDate,
      totals,
      customers: result.rows
    });
  } catch (err: any) {
    console.error('Erreur balance âgée:', err);
    res.status(500).json({ error: err.message });
  }
});

// Balance âgée résumée (pour dashboard)
router.get('/receivables/summary', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;

    const result = await db.query(`
      WITH invoice_balances AS (
        SELECT
          i.total_amount - COALESCE((SELECT SUM(amount) FROM payments WHERE invoice_id = i.id), 0) as balance_due,
          CURRENT_DATE - i.due_date::DATE as days_overdue
        FROM invoices i
        WHERE i.deleted_at IS NULL
          AND i.status NOT IN ('paid', 'cancelled', 'draft')
          AND i.total_amount > COALESCE((SELECT SUM(amount) FROM payments WHERE invoice_id = i.id), 0)
          AND ($1::UUID IS NULL OR i.organization_id = $1)
      )
      SELECT
        COUNT(*) as total_invoices,
        COALESCE(SUM(balance_due), 0) as total_balance,
        COALESCE(SUM(CASE WHEN days_overdue <= 0 THEN balance_due ELSE 0 END), 0) as not_due,
        COALESCE(SUM(CASE WHEN days_overdue > 0 AND days_overdue <= 30 THEN balance_due ELSE 0 END), 0) as days_1_30,
        COALESCE(SUM(CASE WHEN days_overdue > 30 AND days_overdue <= 60 THEN balance_due ELSE 0 END), 0) as days_31_60,
        COALESCE(SUM(CASE WHEN days_overdue > 60 AND days_overdue <= 90 THEN balance_due ELSE 0 END), 0) as days_61_90,
        COALESCE(SUM(CASE WHEN days_overdue > 90 THEN balance_due ELSE 0 END), 0) as days_over_90,
        COALESCE(AVG(CASE WHEN days_overdue > 0 THEN days_overdue END), 0) as avg_days_overdue
      FROM invoice_balances
    `, [organizationId]);

    const summary = result.rows[0];

    // Calculer les pourcentages
    const total = parseFloat(summary.total_balance) || 1;

    res.json({
      ...summary,
      percentages: {
        not_due: ((parseFloat(summary.not_due) / total) * 100).toFixed(1),
        days_1_30: ((parseFloat(summary.days_1_30) / total) * 100).toFixed(1),
        days_31_60: ((parseFloat(summary.days_31_60) / total) * 100).toFixed(1),
        days_61_90: ((parseFloat(summary.days_61_90) / total) * 100).toFixed(1),
        days_over_90: ((parseFloat(summary.days_over_90) / total) * 100).toFixed(1)
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Balance âgée d'un client spécifique
router.get('/receivables/customer/:customerId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { customerId } = req.params;
    const organizationId = (req.user as any)?.organizationId;

    // Infos client
    const customerResult = await db.query(
      'SELECT id, name, email, phone, company FROM customers WHERE id = $1',
      [customerId]
    );

    if (customerResult.rows.length === 0) {
      res.status(404).json({ error: 'Client non trouvé' });
      return;
    }

    // Factures impayées
    const invoicesResult = await db.query(`
      SELECT
        i.id,
        i.invoice_number,
        i.invoice_date,
        i.due_date,
        i.total_amount,
        COALESCE((SELECT SUM(amount) FROM payments WHERE invoice_id = i.id), 0) as amount_paid,
        i.total_amount - COALESCE((SELECT SUM(amount) FROM payments WHERE invoice_id = i.id), 0) as balance_due,
        CURRENT_DATE - i.due_date::DATE as days_overdue,
        i.status,
        CASE
          WHEN CURRENT_DATE <= i.due_date::DATE THEN 'not_due'
          WHEN CURRENT_DATE - i.due_date::DATE <= 30 THEN '1-30'
          WHEN CURRENT_DATE - i.due_date::DATE <= 60 THEN '31-60'
          WHEN CURRENT_DATE - i.due_date::DATE <= 90 THEN '61-90'
          ELSE '90+'
        END as aging_bucket
      FROM invoices i
      WHERE i.customer_id = $1
        AND i.deleted_at IS NULL
        AND i.status NOT IN ('paid', 'cancelled', 'draft')
        AND i.total_amount > COALESCE((SELECT SUM(amount) FROM payments WHERE invoice_id = i.id), 0)
        AND ($2::UUID IS NULL OR i.organization_id = $2)
      ORDER BY i.due_date ASC
    `, [customerId, organizationId]);

    // Historique des paiements
    const paymentsResult = await db.query(`
      SELECT
        p.*,
        i.invoice_number
      FROM payments p
      JOIN invoices i ON p.invoice_id = i.id
      WHERE i.customer_id = $1
        AND ($2::UUID IS NULL OR i.organization_id = $2)
      ORDER BY p.payment_date DESC
      LIMIT 20
    `, [customerId, organizationId]);

    // Statistiques
    const statsResult = await db.query(`
      SELECT
        COUNT(*) as total_invoices,
        COALESCE(SUM(total_amount), 0) as total_invoiced,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN total_amount ELSE 0 END), 0) as total_paid,
        COALESCE(AVG(CASE
          WHEN status = 'paid' THEN
            EXTRACT(DAY FROM (
              (SELECT MIN(payment_date) FROM payments WHERE invoice_id = i.id) - i.invoice_date
            ))
          END
        ), 0) as avg_payment_days
      FROM invoices i
      WHERE i.customer_id = $1
        AND i.deleted_at IS NULL
        AND ($2::UUID IS NULL OR i.organization_id = $2)
    `, [customerId, organizationId]);

    // Calculer les totaux par bucket
    const buckets = {
      not_due: 0,
      '1-30': 0,
      '31-60': 0,
      '61-90': 0,
      '90+': 0
    };

    invoicesResult.rows.forEach(inv => {
      buckets[inv.aging_bucket as keyof typeof buckets] += parseFloat(inv.balance_due);
    });

    res.json({
      customer: customerResult.rows[0],
      statistics: statsResult.rows[0],
      aging_buckets: buckets,
      total_balance: Object.values(buckets).reduce((a, b) => a + b, 0),
      invoices: invoicesResult.rows,
      recent_payments: paymentsResult.rows
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Balance âgée des dettes fournisseurs
router.get('/payables', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;
    const { as_of_date, supplier_id } = req.query;

    const referenceDate = as_of_date || new Date().toISOString().split('T')[0];

    let query = `
      SELECT
        e.supplier_id,
        s.name as supplier_name,
        COUNT(*) as expense_count,
        SUM(e.amount) as total_amount,

        -- Non échu
        SUM(CASE WHEN e.due_date >= $1::DATE OR e.due_date IS NULL THEN e.amount ELSE 0 END) as not_due,

        -- 1-30 jours
        SUM(CASE WHEN e.due_date < $1::DATE AND $1::DATE - e.due_date::DATE <= 30 THEN e.amount ELSE 0 END) as days_1_30,

        -- 31-60 jours
        SUM(CASE WHEN e.due_date < $1::DATE AND $1::DATE - e.due_date::DATE > 30 AND $1::DATE - e.due_date::DATE <= 60 THEN e.amount ELSE 0 END) as days_31_60,

        -- 61-90 jours
        SUM(CASE WHEN e.due_date < $1::DATE AND $1::DATE - e.due_date::DATE > 60 AND $1::DATE - e.due_date::DATE <= 90 THEN e.amount ELSE 0 END) as days_61_90,

        -- Plus de 90 jours
        SUM(CASE WHEN e.due_date < $1::DATE AND $1::DATE - e.due_date::DATE > 90 THEN e.amount ELSE 0 END) as days_over_90

      FROM expenses e
      LEFT JOIN suppliers s ON e.supplier_id = s.id
      WHERE e.deleted_at IS NULL
        AND e.status != 'paid'
    `;

    const params: any[] = [referenceDate];

    if (organizationId) {
      params.push(organizationId);
      query += ` AND e.organization_id = $${params.length}`;
    }

    if (supplier_id) {
      params.push(supplier_id);
      query += ` AND e.supplier_id = $${params.length}`;
    }

    query += `
      GROUP BY e.supplier_id, s.name
      HAVING SUM(e.amount) > 0
      ORDER BY SUM(e.amount) DESC
    `;

    const result = await db.query(query, params);

    // Calculer les totaux
    const totals = {
      total_suppliers: result.rows.length,
      total_expenses: 0,
      total_amount: 0,
      not_due: 0,
      days_1_30: 0,
      days_31_60: 0,
      days_61_90: 0,
      days_over_90: 0
    };

    result.rows.forEach(row => {
      totals.total_expenses += parseInt(row.expense_count);
      totals.total_amount += parseFloat(row.total_amount);
      totals.not_due += parseFloat(row.not_due);
      totals.days_1_30 += parseFloat(row.days_1_30);
      totals.days_31_60 += parseFloat(row.days_31_60);
      totals.days_61_90 += parseFloat(row.days_61_90);
      totals.days_over_90 += parseFloat(row.days_over_90);
    });

    res.json({
      as_of_date: referenceDate,
      totals,
      suppliers: result.rows
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Évolution de la balance âgée dans le temps
router.get('/receivables/trend', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;
    const { months } = req.query;
    const numMonths = parseInt(months as string) || 6;

    const trendData = [];

    for (let i = numMonths - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const lastDayOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      const dateStr = lastDayOfMonth.toISOString().split('T')[0];

      const result = await db.query(`
        WITH invoice_balances AS (
          SELECT
            i.total_amount - COALESCE((SELECT SUM(amount) FROM payments WHERE invoice_id = i.id AND payment_date <= $1::DATE), 0) as balance_due,
            $1::DATE - i.due_date::DATE as days_overdue
          FROM invoices i
          WHERE i.deleted_at IS NULL
            AND i.invoice_date <= $1::DATE
            AND i.status NOT IN ('cancelled', 'draft')
            AND i.total_amount > COALESCE((SELECT SUM(amount) FROM payments WHERE invoice_id = i.id AND payment_date <= $1::DATE), 0)
            AND ($2::UUID IS NULL OR i.organization_id = $2)
        )
        SELECT
          COALESCE(SUM(balance_due), 0) as total_balance,
          COALESCE(SUM(CASE WHEN days_overdue <= 0 THEN balance_due ELSE 0 END), 0) as not_due,
          COALESCE(SUM(CASE WHEN days_overdue > 0 AND days_overdue <= 30 THEN balance_due ELSE 0 END), 0) as days_1_30,
          COALESCE(SUM(CASE WHEN days_overdue > 30 AND days_overdue <= 60 THEN balance_due ELSE 0 END), 0) as days_31_60,
          COALESCE(SUM(CASE WHEN days_overdue > 60 AND days_overdue <= 90 THEN balance_due ELSE 0 END), 0) as days_61_90,
          COALESCE(SUM(CASE WHEN days_overdue > 90 THEN balance_due ELSE 0 END), 0) as days_over_90
        FROM invoice_balances
      `, [dateStr, organizationId]);

      trendData.push({
        date: dateStr,
        month: lastDayOfMonth.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }),
        ...result.rows[0]
      });
    }

    res.json(trendData);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Export CSV de la balance âgée
router.get('/receivables/export', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;
    const { as_of_date } = req.query;
    const referenceDate = as_of_date || new Date().toISOString().split('T')[0];

    const result = await db.query(`
      SELECT
        c.name as "Client",
        i.invoice_number as "N° Facture",
        i.invoice_date as "Date Facture",
        i.due_date as "Date Échéance",
        i.total_amount as "Montant Total",
        COALESCE((SELECT SUM(amount) FROM payments WHERE invoice_id = i.id AND payment_date <= $1::DATE), 0) as "Montant Payé",
        i.total_amount - COALESCE((SELECT SUM(amount) FROM payments WHERE invoice_id = i.id AND payment_date <= $1::DATE), 0) as "Solde Dû",
        $1::DATE - i.due_date::DATE as "Jours de Retard",
        CASE
          WHEN $1::DATE <= i.due_date::DATE THEN 'Non échu'
          WHEN $1::DATE - i.due_date::DATE <= 30 THEN '1-30 jours'
          WHEN $1::DATE - i.due_date::DATE <= 60 THEN '31-60 jours'
          WHEN $1::DATE - i.due_date::DATE <= 90 THEN '61-90 jours'
          ELSE 'Plus de 90 jours'
        END as "Tranche"
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      WHERE i.deleted_at IS NULL
        AND i.status NOT IN ('paid', 'cancelled', 'draft')
        AND i.total_amount > COALESCE((SELECT SUM(amount) FROM payments WHERE invoice_id = i.id AND payment_date <= $1::DATE), 0)
        AND ($2::UUID IS NULL OR i.organization_id = $2)
      ORDER BY c.name, i.due_date
    `, [referenceDate, organizationId]);

    // Générer le CSV
    const headers = Object.keys(result.rows[0] || {});
    let csv = headers.join(';') + '\n';

    result.rows.forEach(row => {
      csv += headers.map(h => {
        let val = row[h];
        if (val instanceof Date) {
          val = val.toLocaleDateString('fr-FR');
        }
        if (typeof val === 'number') {
          val = val.toFixed(2).replace('.', ',');
        }
        return `"${val}"`;
      }).join(';') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=balance-agee-${referenceDate}.csv`);
    res.send('\uFEFF' + csv); // BOM pour Excel
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Alias for suppliers (same as payables)
router.get('/suppliers', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;
    const { as_of_date } = req.query;

    const referenceDate = as_of_date || new Date().toISOString().split('T')[0];

    const result = await db.query(`
      SELECT
        e.supplier_id,
        s.name as supplier_name,
        s.email as supplier_email,
        COUNT(*) as expense_count,
        SUM(e.amount) as total_amount,
        SUM(CASE WHEN e.due_date >= $1::DATE OR e.due_date IS NULL THEN e.amount ELSE 0 END) as not_due,
        SUM(CASE WHEN e.due_date < $1::DATE AND $1::DATE - e.due_date::DATE <= 30 THEN e.amount ELSE 0 END) as days_1_30,
        SUM(CASE WHEN e.due_date < $1::DATE AND $1::DATE - e.due_date::DATE > 30 AND $1::DATE - e.due_date::DATE <= 60 THEN e.amount ELSE 0 END) as days_31_60,
        SUM(CASE WHEN e.due_date < $1::DATE AND $1::DATE - e.due_date::DATE > 60 AND $1::DATE - e.due_date::DATE <= 90 THEN e.amount ELSE 0 END) as days_61_90,
        SUM(CASE WHEN e.due_date < $1::DATE AND $1::DATE - e.due_date::DATE > 90 THEN e.amount ELSE 0 END) as days_over_90
      FROM expenses e
      LEFT JOIN suppliers s ON e.supplier_id = s.id
      WHERE e.deleted_at IS NULL
        AND e.status != 'paid'
        AND ($2::UUID IS NULL OR e.organization_id = $2)
      GROUP BY e.supplier_id, s.name, s.email
      HAVING SUM(e.amount) > 0
      ORDER BY SUM(e.amount) DESC
    `, [referenceDate, organizationId]);

    const totals = {
      total_suppliers: result.rows.length,
      total_expenses: 0,
      total_amount: 0,
      not_due: 0,
      days_1_30: 0,
      days_31_60: 0,
      days_61_90: 0,
      days_over_90: 0
    };

    result.rows.forEach(row => {
      totals.total_expenses += parseInt(row.expense_count);
      totals.total_amount += parseFloat(row.total_amount);
      totals.not_due += parseFloat(row.not_due);
      totals.days_1_30 += parseFloat(row.days_1_30);
      totals.days_31_60 += parseFloat(row.days_31_60);
      totals.days_61_90 += parseFloat(row.days_61_90);
      totals.days_over_90 += parseFloat(row.days_over_90);
    });

    res.json({
      as_of_date: referenceDate,
      totals,
      suppliers: result.rows
    });
  } catch (err: any) {
    console.error('Error fetching supplier balances:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
