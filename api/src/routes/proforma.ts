import express, { Response } from 'express';
import { pool as db } from '../database/db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

// ==========================================
// FACTURES PROFORMA
// ==========================================

// Créer une facture proforma à partir d'un devis
router.post('/from-quote/:quoteId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { quoteId } = req.params;
    const organizationId = (req.user as any)?.organizationId;
    const userId = (req.user as any)?.id;

    // Récupérer le devis
    const quoteResult = await db.query(`
      SELECT q.*, c.name as customer_name
      FROM quotes q
      LEFT JOIN customers c ON q.customer_id = c.id
      WHERE q.id = $1
    `, [quoteId]);

    if (quoteResult.rows.length === 0) {
      res.status(404).json({ error: 'Devis non trouvé' });
      return;
    }

    const quote = quoteResult.rows[0];

    // Générer le numéro de proforma
    const year = new Date().getFullYear();
    const numResult = await db.query(`
      SELECT invoice_number FROM invoices
      WHERE invoice_type = 'proforma' AND invoice_number LIKE $1
      ORDER BY invoice_number DESC LIMIT 1
    `, [`PRO-${year}-%`]);

    let nextNum = 1;
    if (numResult.rows.length > 0) {
      const match = numResult.rows[0].invoice_number.match(/PRO-\d{4}-(\d+)/);
      if (match) nextNum = parseInt(match[1]) + 1;
    }
    const proformaNumber = `PRO-${year}-${String(nextNum).padStart(5, '0')}`;

    // Créer la facture proforma
    const invoiceResult = await db.query(`
      INSERT INTO invoices (
        customer_id, user_id, quote_id, invoice_number, invoice_type,
        title, description, subtotal, tax_rate, tax_amount, total_amount,
        status, template_id, organization_id, due_date
      ) VALUES ($1, $2, $3, $4, 'proforma', $5, $6, $7, $8, $9, $10, 'draft', $11, $12, $13)
      RETURNING *
    `, [
      quote.customer_id, userId, quoteId, proformaNumber,
      `Facture Proforma - ${quote.title}`, quote.description,
      quote.subtotal, quote.tax_rate, quote.tax_amount, quote.total_amount,
      quote.template_id, organizationId,
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    ]);

    const invoiceId = invoiceResult.rows[0].id;

    // Copier les items
    const itemsResult = await db.query('SELECT * FROM quote_items WHERE quote_id = $1', [quoteId]);
    for (const item of itemsResult.rows) {
      await db.query(`
        INSERT INTO invoice_items (invoice_id, product_id, description, quantity, unit_price, total_price, sort_order)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [invoiceId, item.product_id, item.description, item.quantity, item.unit_price, item.total_price, item.sort_order || 0]);
    }

    res.status(201).json({
      ...invoiceResult.rows[0],
      message: 'Facture proforma créée avec succès'
    });
  } catch (err: any) {
    console.error('Erreur création proforma:', err);
    res.status(500).json({ error: err.message });
  }
});

// Convertir une proforma en facture définitive
router.post('/:id/convert', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = (req.user as any)?.organizationId;
    const userId = (req.user as any)?.id;

    // Récupérer la proforma
    const proformaResult = await db.query(`
      SELECT * FROM invoices
      WHERE id = $1 AND invoice_type = 'proforma' AND organization_id = $2
    `, [id, organizationId]);

    if (proformaResult.rows.length === 0) {
      res.status(404).json({ error: 'Facture proforma non trouvée' });
      return;
    }

    const proforma = proformaResult.rows[0];

    if (proforma.proforma_converted_to) {
      res.status(400).json({ error: 'Cette proforma a déjà été convertie' });
      return;
    }

    // Générer le numéro de facture
    const year = new Date().getFullYear();
    const numResult = await db.query(`
      SELECT invoice_number FROM invoices
      WHERE invoice_number LIKE $1 AND organization_id = $2
      ORDER BY invoice_number DESC LIMIT 1
    `, [`FA-${year}-%`, organizationId]);

    let nextNum = 1;
    if (numResult.rows.length > 0) {
      const match = numResult.rows[0].invoice_number.match(/FA-\d{4}-(\d+)/);
      if (match) nextNum = parseInt(match[1]) + 1;
    }
    const invoiceNumber = `FA-${year}-${String(nextNum).padStart(5, '0')}`;

    // Créer la facture définitive
    const invoiceResult = await db.query(`
      INSERT INTO invoices (
        customer_id, user_id, quote_id, invoice_number, invoice_type,
        title, description, subtotal, tax_rate, tax_amount, total_amount,
        status, template_id, organization_id, due_date
      ) VALUES ($1, $2, $3, $4, 'standard', $5, $6, $7, $8, $9, $10, 'draft', $11, $12, $13)
      RETURNING *
    `, [
      proforma.customer_id, userId, proforma.quote_id, invoiceNumber,
      proforma.title.replace('Facture Proforma - ', ''), proforma.description,
      proforma.subtotal, proforma.tax_rate, proforma.tax_amount, proforma.total_amount,
      proforma.template_id, organizationId,
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    ]);

    const invoiceId = invoiceResult.rows[0].id;

    // Copier les items
    const itemsResult = await db.query('SELECT * FROM invoice_items WHERE invoice_id = $1', [id]);
    for (const item of itemsResult.rows) {
      await db.query(`
        INSERT INTO invoice_items (invoice_id, product_id, description, quantity, unit_price, total_price, sort_order)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [invoiceId, item.product_id, item.description, item.quantity, item.unit_price, item.total_price, item.sort_order || 0]);
    }

    // Marquer la proforma comme convertie
    await db.query(`
      UPDATE invoices SET
        proforma_converted_at = NOW(),
        proforma_converted_to = $1,
        status = 'converted'
      WHERE id = $2
    `, [invoiceId, id]);

    res.status(201).json({
      ...invoiceResult.rows[0],
      message: 'Proforma convertie en facture définitive'
    });
  } catch (err: any) {
    console.error('Erreur conversion proforma:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// FACTURES D'ACOMPTE
// ==========================================

// Créer une facture d'acompte
router.post('/deposit/from-quote/:quoteId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { quoteId } = req.params;
    const { deposit_percent = 30 } = req.body;
    const organizationId = (req.user as any)?.organizationId;
    const userId = (req.user as any)?.id;

    // Récupérer le devis
    const quoteResult = await db.query('SELECT * FROM quotes WHERE id = $1', [quoteId]);

    if (quoteResult.rows.length === 0) {
      res.status(404).json({ error: 'Devis non trouvé' });
      return;
    }

    const quote = quoteResult.rows[0];
    const depositAmount = quote.total_amount * (deposit_percent / 100);
    const depositSubtotal = depositAmount / (1 + (quote.tax_rate || 20) / 100);
    const depositTax = depositAmount - depositSubtotal;

    // Générer le numéro de facture
    const year = new Date().getFullYear();
    const numResult = await db.query(`
      SELECT invoice_number FROM invoices
      WHERE invoice_number LIKE $1 AND organization_id = $2
      ORDER BY invoice_number DESC LIMIT 1
    `, [`FA-${year}-%`, organizationId]);

    let nextNum = 1;
    if (numResult.rows.length > 0) {
      const match = numResult.rows[0].invoice_number.match(/FA-\d{4}-(\d+)/);
      if (match) nextNum = parseInt(match[1]) + 1;
    }
    const invoiceNumber = `FA-${year}-${String(nextNum).padStart(5, '0')}`;

    // Créer la facture d'acompte
    const invoiceResult = await db.query(`
      INSERT INTO invoices (
        customer_id, user_id, quote_id, invoice_number, invoice_type,
        title, description, subtotal, tax_rate, tax_amount, total_amount,
        deposit_percent, status, template_id, organization_id, due_date
      ) VALUES ($1, $2, $3, $4, 'deposit', $5, $6, $7, $8, $9, $10, $11, 'draft', $12, $13, $14)
      RETURNING *
    `, [
      quote.customer_id, userId, quoteId, invoiceNumber,
      `Facture d'acompte (${deposit_percent}%) - ${quote.title}`,
      `Acompte de ${deposit_percent}% sur le devis ${quote.quote_number}`,
      depositSubtotal, quote.tax_rate || 20, depositTax, depositAmount,
      deposit_percent, quote.template_id, organizationId,
      new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
    ]);

    const invoiceId = invoiceResult.rows[0].id;

    // Ajouter une ligne pour l'acompte
    await db.query(`
      INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total_price)
      VALUES ($1, $2, 1, $3, $3)
    `, [invoiceId, `Acompte ${deposit_percent}% sur devis ${quote.quote_number}`, depositSubtotal]);

    res.status(201).json({
      ...invoiceResult.rows[0],
      message: `Facture d'acompte de ${deposit_percent}% créée`
    });
  } catch (err: any) {
    console.error('Erreur création acompte:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// FACTURES DE SOLDE
// ==========================================

// Créer une facture de solde
router.post('/balance/from-deposit/:depositId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { depositId } = req.params;
    const organizationId = (req.user as any)?.organizationId;
    const userId = (req.user as any)?.id;

    // Récupérer la facture d'acompte
    const depositResult = await db.query(`
      SELECT * FROM invoices
      WHERE id = $1 AND invoice_type = 'deposit' AND organization_id = $2
    `, [depositId, organizationId]);

    if (depositResult.rows.length === 0) {
      res.status(404).json({ error: 'Facture d\'acompte non trouvée' });
      return;
    }

    const deposit = depositResult.rows[0];

    // Vérifier qu'une facture de solde n'existe pas déjà
    const existingBalance = await db.query(`
      SELECT id FROM invoices WHERE parent_invoice_id = $1 AND invoice_type = 'balance'
    `, [depositId]);

    if (existingBalance.rows.length > 0) {
      res.status(400).json({ error: 'Une facture de solde existe déjà pour cet acompte' });
      return;
    }

    // Récupérer le devis original
    const quoteResult = await db.query('SELECT * FROM quotes WHERE id = $1', [deposit.quote_id]);

    if (quoteResult.rows.length === 0) {
      res.status(404).json({ error: 'Devis original non trouvé' });
      return;
    }

    const quote = quoteResult.rows[0];
    const balanceAmount = quote.total_amount - deposit.total_amount;
    const balanceSubtotal = balanceAmount / (1 + (quote.tax_rate || 20) / 100);
    const balanceTax = balanceAmount - balanceSubtotal;

    // Générer le numéro de facture
    const year = new Date().getFullYear();
    const numResult = await db.query(`
      SELECT invoice_number FROM invoices
      WHERE invoice_number LIKE $1 AND organization_id = $2
      ORDER BY invoice_number DESC LIMIT 1
    `, [`FA-${year}-%`, organizationId]);

    let nextNum = 1;
    if (numResult.rows.length > 0) {
      const match = numResult.rows[0].invoice_number.match(/FA-\d{4}-(\d+)/);
      if (match) nextNum = parseInt(match[1]) + 1;
    }
    const invoiceNumber = `FA-${year}-${String(nextNum).padStart(5, '0')}`;

    // Créer la facture de solde
    const invoiceResult = await db.query(`
      INSERT INTO invoices (
        customer_id, user_id, quote_id, invoice_number, invoice_type,
        parent_invoice_id, title, description, subtotal, tax_rate,
        tax_amount, total_amount, status, template_id, organization_id, due_date
      ) VALUES ($1, $2, $3, $4, 'balance', $5, $6, $7, $8, $9, $10, $11, 'draft', $12, $13, $14)
      RETURNING *
    `, [
      quote.customer_id, userId, quote.id, invoiceNumber, depositId,
      `Facture de solde - ${quote.title}`,
      `Solde après acompte (facture ${deposit.invoice_number})`,
      balanceSubtotal, quote.tax_rate || 20, balanceTax, balanceAmount,
      quote.template_id, organizationId,
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    ]);

    const invoiceId = invoiceResult.rows[0].id;

    // Copier les items du devis
    const itemsResult = await db.query('SELECT * FROM quote_items WHERE quote_id = $1 ORDER BY sort_order', [quote.id]);
    for (const item of itemsResult.rows) {
      await db.query(`
        INSERT INTO invoice_items (invoice_id, product_id, description, quantity, unit_price, total_price, sort_order)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [invoiceId, item.product_id, item.description, item.quantity, item.unit_price, item.total_price, item.sort_order || 0]);
    }

    // Ajouter la ligne de déduction de l'acompte
    await db.query(`
      INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total_price, sort_order)
      VALUES ($1, $2, 1, $3, $3, 9999)
    `, [
      invoiceId,
      `Déduction acompte (facture ${deposit.invoice_number})`,
      -(deposit.total_amount / (1 + (quote.tax_rate || 20) / 100))
    ]);

    res.status(201).json({
      ...invoiceResult.rows[0],
      message: 'Facture de solde créée'
    });
  } catch (err: any) {
    console.error('Erreur création facture de solde:', err);
    res.status(500).json({ error: err.message });
  }
});

// Liste des factures par type
router.get('/by-type', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;
    const { type } = req.query;

    let query = `
      SELECT
        i.*,
        c.name as customer_name,
        p.invoice_number as parent_invoice_number
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      LEFT JOIN invoices p ON i.parent_invoice_id = p.id
      WHERE i.organization_id = $1 AND i.deleted_at IS NULL
    `;
    const params: any[] = [organizationId];

    if (type) {
      params.push(type);
      query += ` AND i.invoice_type = $${params.length}`;
    }

    query += ` ORDER BY i.created_at DESC`;

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
