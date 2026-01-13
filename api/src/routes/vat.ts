import express, { Response } from 'express';
import { pool as db } from '../database/db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

// ==========================================
// TVA SUR ENCAISSEMENT
// ==========================================

// Obtenir le régime TVA
router.get('/regime', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;

    const result = await db.query(`
      SELECT vat_regime FROM company_profiles WHERE organization_id = $1
    `, [organizationId]);

    res.json({
      regime: result.rows[0]?.vat_regime || 'debit',
      description: result.rows[0]?.vat_regime === 'cash'
        ? 'TVA sur encaissement (collectée au moment du paiement)'
        : 'TVA sur les débits (collectée à la facturation)'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Changer le régime TVA
router.put('/regime', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;
    const { regime } = req.body; // 'debit' ou 'cash'

    if (!['debit', 'cash'].includes(regime)) {
      res.status(400).json({ error: 'Régime invalide. Valeurs acceptées: debit, cash' });
      return;
    }

    await db.query(`
      UPDATE company_profiles SET vat_regime = $1 WHERE organization_id = $2
    `, [regime, organizationId]);

    res.json({ message: 'Régime TVA mis à jour', regime });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// TVA collectée sur encaissement (par période)
router.get('/cash-entries', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;
    const { period, start_date, end_date } = req.query;

    let query = `
      SELECT
        vce.*,
        i.invoice_number,
        p.payment_date,
        p.payment_method
      FROM vat_cash_entries vce
      JOIN invoices i ON vce.invoice_id = i.id
      JOIN payments p ON vce.payment_id = p.id
      WHERE vce.organization_id = $1
    `;
    const params: any[] = [organizationId];

    if (period) {
      params.push(period);
      query += ` AND vce.fiscal_period = $${params.length}`;
    } else if (start_date && end_date) {
      params.push(start_date, end_date);
      query += ` AND vce.payment_date BETWEEN $${params.length - 1} AND $${params.length}`;
    }

    query += ' ORDER BY vce.payment_date DESC';

    const result = await db.query(query, params);

    // Totaux par taux
    const totalsQuery = `
      SELECT
        vat_rate,
        SUM(amount_ht) as total_ht,
        SUM(vat_amount) as total_vat
      FROM vat_cash_entries
      WHERE organization_id = $1
      ${period ? 'AND fiscal_period = $2' : (start_date && end_date ? 'AND payment_date BETWEEN $2 AND $3' : '')}
      GROUP BY vat_rate
      ORDER BY vat_rate
    `;

    const totalsResult = await db.query(totalsQuery, params);

    res.json({
      entries: result.rows,
      totals_by_rate: totalsResult.rows,
      grand_total: {
        ht: totalsResult.rows.reduce((sum: number, r: any) => sum + parseFloat(r.total_ht), 0),
        vat: totalsResult.rows.reduce((sum: number, r: any) => sum + parseFloat(r.total_vat), 0)
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Enregistrer TVA sur encaissement (automatique lors du paiement)
router.post('/cash-entries', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;
    const { invoice_id, payment_id, payment_date } = req.body;

    // Vérifier le régime
    const regimeResult = await db.query(`
      SELECT vat_regime FROM company_profiles WHERE organization_id = $1
    `, [organizationId]);

    if (regimeResult.rows[0]?.vat_regime !== 'cash') {
      res.status(400).json({ error: 'TVA sur encaissement non activée' });
      return;
    }

    // Récupérer les détails de la facture
    const invoiceResult = await db.query(`
      SELECT i.*, p.amount as payment_amount
      FROM invoices i
      JOIN payments p ON p.id = $2
      WHERE i.id = $1
    `, [invoice_id, payment_id]);

    if (invoiceResult.rows.length === 0) {
      res.status(404).json({ error: 'Facture non trouvée' });
      return;
    }

    const invoice = invoiceResult.rows[0];

    // Calculer la TVA proportionnelle au paiement
    const paymentRatio = invoice.payment_amount / invoice.total_ttc;
    const amountHT = invoice.subtotal_ht * paymentRatio;
    const vatAmount = invoice.total_vat * paymentRatio;

    // Déterminer la période fiscale
    const paymentDateObj = new Date(payment_date || new Date());
    const fiscalPeriod = `${paymentDateObj.getFullYear()}-${String(paymentDateObj.getMonth() + 1).padStart(2, '0')}`;

    // Enregistrer l'entrée TVA
    const result = await db.query(`
      INSERT INTO vat_cash_entries (organization_id, invoice_id, payment_id, amount_ht, vat_amount, vat_rate, fiscal_period, payment_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [organizationId, invoice_id, payment_id, amountHT.toFixed(2), vatAmount.toFixed(2), 20, fiscalPeriod, payment_date || new Date()]);

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// AUTO-LIQUIDATION TVA
// ==========================================

// Créer une facture avec autoliquidation
router.post('/reverse-charge-invoice', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;
    const userId = (req.user as any)?.id;
    const {
      customer_id,
      invoice_date,
      due_date,
      items,
      notes,
      vat_type // 'reverse_charge', 'intracom', 'export'
    } = req.body;

    // Vérifier que le client a un numéro de TVA intracommunautaire
    const customerResult = await db.query(`
      SELECT * FROM customers WHERE id = $1
    `, [customer_id]);

    if (customerResult.rows.length === 0) {
      res.status(404).json({ error: 'Client non trouvé' });
      return;
    }

    const customer = customerResult.rows[0];

    if (vat_type === 'reverse_charge' && !customer.tva_intracom) {
      res.status(400).json({ error: 'Le client doit avoir un numéro de TVA intracommunautaire pour l\'autoliquidation' });
      return;
    }

    const client = await db.connect();
    try {
      await client.query('BEGIN');

      // Calculer le total HT (pas de TVA en autoliquidation)
      const subtotalHT = items.reduce((sum: number, item: any) => sum + (item.quantity * item.unit_price), 0);

      // Générer le numéro de facture
      const numberResult = await client.query(`
        SELECT get_next_invoice_number($1) as next_number
      `, [organizationId]);
      const invoiceNumber = numberResult.rows[0].next_number;

      // Déterminer la mention légale
      let vatExemptionReason = '';
      let reverseChargeMention = '';

      switch (vat_type) {
        case 'reverse_charge':
          vatExemptionReason = 'Autoliquidation de la TVA - Article 283 du CGI';
          reverseChargeMention = 'TVA due par le preneur - Article 196 de la directive 2006/112/CE';
          break;
        case 'intracom':
          vatExemptionReason = 'Exonération de TVA - Livraison intracommunautaire - Article 262 ter I du CGI';
          break;
        case 'export':
          vatExemptionReason = 'Exonération de TVA - Exportation hors UE - Article 262 I du CGI';
          break;
      }

      // Créer la facture
      const invoiceResult = await client.query(`
        INSERT INTO invoices (
          invoice_number, customer_id, user_id, organization_id,
          invoice_date, due_date, subtotal_ht, total_vat, total_ttc,
          vat_type, vat_exemption_reason, reverse_charge_mention, notes, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 0, $7, $8, $9, $10, $11, 'draft')
        RETURNING *
      `, [
        invoiceNumber, customer_id, userId, organizationId,
        invoice_date || new Date(), due_date, subtotalHT,
        vat_type, vatExemptionReason, reverseChargeMention, notes
      ]);

      const invoiceId = invoiceResult.rows[0].id;

      // Ajouter les lignes (TVA à 0)
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const subtotal = item.quantity * item.unit_price;

        await client.query(`
          INSERT INTO invoice_items (
            invoice_id, product_id, description, quantity, unit_price,
            vat_rate, vat_amount, subtotal, total, line_order
          ) VALUES ($1, $2, $3, $4, $5, 0, 0, $6, $6, $7)
        `, [invoiceId, item.product_id, item.description, item.quantity, item.unit_price, subtotal, i]);
      }

      await client.query('COMMIT');

      res.status(201).json({
        ...invoiceResult.rows[0],
        message: `Facture ${vat_type} créée avec mention: ${vatExemptionReason}`
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Liste des factures intracommunautaires/export
router.get('/intracom-invoices', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;
    const { year, quarter, vat_type } = req.query;

    let query = `
      SELECT
        i.id,
        i.invoice_number,
        i.invoice_date,
        i.vat_type,
        c.name as customer_name,
        c.tva_intracom as customer_vat_number,
        c.country,
        i.subtotal_ht as amount_ht,
        i.vat_exemption_reason
      FROM invoices i
      JOIN customers c ON i.customer_id = c.id
      WHERE i.organization_id = $1
      AND i.vat_type IN ('reverse_charge', 'intracom', 'export')
      AND i.deleted_at IS NULL
    `;
    const params: any[] = [organizationId];

    if (year) {
      params.push(year);
      query += ` AND EXTRACT(YEAR FROM i.invoice_date) = $${params.length}`;
    }
    if (quarter) {
      params.push(quarter);
      query += ` AND EXTRACT(QUARTER FROM i.invoice_date) = $${params.length}`;
    }
    if (vat_type) {
      params.push(vat_type);
      query += ` AND i.vat_type = $${params.length}`;
    }

    query += ' ORDER BY i.invoice_date DESC';

    const result = await db.query(query, params);

    // Totaux par type
    const totalsResult = await db.query(`
      SELECT
        vat_type,
        COUNT(*) as count,
        SUM(subtotal_ht) as total_ht
      FROM invoices
      WHERE organization_id = $1
      AND vat_type IN ('reverse_charge', 'intracom', 'export')
      AND deleted_at IS NULL
      ${year ? `AND EXTRACT(YEAR FROM invoice_date) = $2` : ''}
      GROUP BY vat_type
    `, year ? [organizationId, year] : [organizationId]);

    res.json({
      invoices: result.rows,
      totals: totalsResult.rows,
      note: 'Ces factures doivent être déclarées dans la DEB (Déclaration d\'Échanges de Biens) ou DES (Déclaration Européenne de Services)'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Déclaration d'échanges de biens (DEB) - Export
router.get('/deb-export', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;
    const { year, month } = req.query;

    if (!year || !month) {
      res.status(400).json({ error: 'Année et mois requis' });
      return;
    }

    // Récupérer les factures intracommunautaires du mois
    const result = await db.query(`
      SELECT
        i.invoice_number as numero_facture,
        i.invoice_date as date_facture,
        c.name as client,
        c.tva_intracom as numero_tva_client,
        c.country as pays,
        i.subtotal_ht as valeur_fiscale,
        i.vat_type as regime
      FROM invoices i
      JOIN customers c ON i.customer_id = c.id
      WHERE i.organization_id = $1
      AND i.vat_type = 'intracom'
      AND EXTRACT(YEAR FROM i.invoice_date) = $2
      AND EXTRACT(MONTH FROM i.invoice_date) = $3
      AND i.deleted_at IS NULL
      ORDER BY i.invoice_date
    `, [organizationId, year, month]);

    // Calculer les totaux par pays
    const byCountry = result.rows.reduce((acc: any, row: any) => {
      if (!acc[row.pays]) {
        acc[row.pays] = { count: 0, total: 0 };
      }
      acc[row.pays].count++;
      acc[row.pays].total += parseFloat(row.valeur_fiscale);
      return acc;
    }, {});

    res.json({
      period: `${year}-${month}`,
      lines: result.rows,
      by_country: byCountry,
      total: result.rows.reduce((sum: number, r: any) => sum + parseFloat(r.valeur_fiscale), 0),
      note: 'Export pour Déclaration d\'Échanges de Biens (DEB) - À soumettre avant le 10 du mois suivant'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Taux de TVA disponibles
router.get('/rates', authenticateToken, async (req: AuthRequest, res: Response) => {
  res.json({
    france: [
      { rate: 20, label: 'Taux normal', description: 'La plupart des biens et services' },
      { rate: 10, label: 'Taux intermédiaire', description: 'Restauration, transports, travaux rénovation' },
      { rate: 5.5, label: 'Taux réduit', description: 'Produits alimentaires, livres, énergie' },
      { rate: 2.1, label: 'Taux super-réduit', description: 'Médicaments remboursables, presse' },
      { rate: 0, label: 'Exonéré', description: 'Export, intracommunautaire, formation' }
    ],
    note: 'Les taux peuvent varier selon les DOM-TOM et les régimes spécifiques'
  });
});

// ==========================================
// DÉCLARATION TVA
// ==========================================

// Récupérer la déclaration TVA pour une période
router.get('/declaration', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;
    const { period, year, month, quarter } = req.query;

    // Determine date range based on parameters
    let startDate: string;
    let endDate: string;

    if (period) {
      const [y, m] = (period as string).split('-');
      startDate = `${y}-${m.padStart(2, '0')}-01`;
      endDate = new Date(parseInt(y), parseInt(m), 0).toISOString().split('T')[0];
    } else if (year && quarter) {
      const q = parseInt(quarter as string);
      const startMonth = (q - 1) * 3 + 1;
      startDate = `${year}-${String(startMonth).padStart(2, '0')}-01`;
      endDate = new Date(parseInt(year as string), startMonth + 2, 0).toISOString().split('T')[0];
    } else if (year && month) {
      startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      endDate = new Date(parseInt(year as string), parseInt(month as string), 0).toISOString().split('T')[0];
    } else {
      // Default to current month
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    }

    // TVA collectée (ventes)
    const salesResult = await db.query(`
      SELECT
        COALESCE(ii.tax_rate, 20) as taux,
        SUM(ii.quantity * ii.unit_price) as base_ht,
        SUM(COALESCE(ii.total_price - (ii.quantity * ii.unit_price), (ii.quantity * ii.unit_price) * COALESCE(ii.tax_rate, 20) / 100)) as tva_collectee
      FROM invoice_items ii
      JOIN invoices i ON ii.invoice_id = i.id
      WHERE i.invoice_date >= $1 AND i.invoice_date <= $2
        AND i.status NOT IN ('draft', 'cancelled')
      GROUP BY ii.tax_rate
      ORDER BY ii.tax_rate DESC
    `, [startDate, endDate]);

    // TVA déductible (achats)
    const purchasesResult = await db.query(`
      SELECT
        20 as taux,
        SUM(e.amount) as base_ht,
        SUM(COALESCE(e.tax_amount, e.amount * 20 / 100)) as tva_deductible
      FROM expenses e
      WHERE e.expense_date >= $1 AND e.expense_date <= $2
        AND e.status IN ('approved', 'paid')
        AND e.deleted_at IS NULL
        AND ($3::UUID IS NULL OR e.organization_id = $3)
      GROUP BY 1
      ORDER BY 1 DESC
    `, [startDate, endDate, organizationId]);

    // Calculate totals
    const totalCollected = salesResult.rows.reduce((sum: number, row: any) =>
      sum + parseFloat(row.tva_collectee || 0), 0);
    const totalDeductible = purchasesResult.rows.reduce((sum: number, row: any) =>
      sum + parseFloat(row.tva_deductible || 0), 0);
    const netVat = totalCollected - totalDeductible;

    res.json({
      period: { start: startDate, end: endDate },
      tva_collectee: {
        by_rate: salesResult.rows,
        total: totalCollected
      },
      tva_deductible: {
        by_rate: purchasesResult.rows,
        total: totalDeductible
      },
      net_vat: netVat,
      to_pay: netVat > 0 ? netVat : 0,
      credit: netVat < 0 ? Math.abs(netVat) : 0,
      status: netVat > 0 ? 'TVA à payer' : netVat < 0 ? 'Crédit de TVA' : 'Neutre',
      declaration_type: quarter ? 'CA3 Trimestrielle' : 'CA3 Mensuelle'
    });
  } catch (err: any) {
    console.error('Error generating VAT declaration:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
