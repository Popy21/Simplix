import express, { Response } from 'express';
import { pool } from '../database/db';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requireOrganization } from '../middleware/multiTenancy';
import { getOrgIdFromRequest } from '../utils/multiTenancyHelper';

const router = express.Router();

/**
 * GET /api/credit-notes
 * Liste tous les avoirs avec filtres
 */
router.get('/', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  try {
    const orgId = getOrgIdFromRequest(req);
    const { status, customer_id, invoice_id, from_date, to_date } = req.query;

    let query = `
      SELECT
        cn.*,
        c.name as customer_name,
        c.email as customer_email,
        c.company as customer_company,
        i.invoice_number as original_invoice_number,
        (SELECT COUNT(*) FROM credit_note_items WHERE credit_note_id = cn.id) as items_count
      FROM credit_notes cn
      LEFT JOIN customers c ON cn.customer_id = c.id
      LEFT JOIN invoices i ON cn.invoice_id = i.id
      WHERE cn.deleted_at IS NULL
    `;

    const params: any[] = [];
    let paramCount = 1;

    // Filtre par organisation si disponible
    if (orgId) {
      query += ` AND cn.organization_id = $${paramCount}`;
      params.push(orgId);
      paramCount++;
    }

    if (status) {
      query += ` AND cn.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (customer_id) {
      query += ` AND cn.customer_id = $${paramCount}`;
      params.push(customer_id);
      paramCount++;
    }

    if (invoice_id) {
      query += ` AND cn.invoice_id = $${paramCount}`;
      params.push(invoice_id);
      paramCount++;
    }

    if (from_date) {
      query += ` AND cn.credit_note_date >= $${paramCount}`;
      params.push(from_date);
      paramCount++;
    }

    if (to_date) {
      query += ` AND cn.credit_note_date <= $${paramCount}`;
      params.push(to_date);
      paramCount++;
    }

    query += ` ORDER BY cn.credit_note_date DESC, cn.id DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Erreur lors de la récupération des avoirs:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/credit-notes/stats
 * Statistiques des avoirs
 */
router.get('/stats', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  try {
    const stats = await pool.query(`
      SELECT
        COUNT(*) as total_count,
        COUNT(*) FILTER (WHERE status = 'draft') as draft_count,
        COUNT(*) FILTER (WHERE status = 'issued') as issued_count,
        COUNT(*) FILTER (WHERE status = 'applied') as applied_count,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_count,
        COALESCE(SUM(total_amount) FILTER (WHERE status != 'cancelled'), 0) as total_amount,
        COALESCE(SUM(total_amount) FILTER (WHERE status = 'applied'), 0) as applied_amount,
        COALESCE(SUM(total_amount) FILTER (WHERE status = 'issued'), 0) as pending_amount
      FROM credit_notes
      WHERE deleted_at IS NULL
    `);

    res.json(stats.rows[0]);
  } catch (error: any) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/credit-notes/:id
 * Récupérer un avoir avec ses lignes
 */
router.get('/:id', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Récupérer l'avoir
    const creditNoteResult = await pool.query(`
      SELECT
        cn.*,
        c.name as customer_name,
        c.email as customer_email,
        c.phone as customer_phone,
        c.company as customer_company,
        c.address as customer_address,
        i.invoice_number as original_invoice_number,
        i.invoice_date as original_invoice_date,
        i.total_amount as original_invoice_amount,
        u.first_name || ' ' || COALESCE(u.last_name, '') as user_name,
        t.id as template_id,
        t.name as template_name,
        t.logo_url as template_logo_url,
        t.primary_color as template_primary_color,
        t.company_name as template_company_name,
        t.company_address as template_company_address,
        t.company_phone as template_company_phone,
        t.company_email as template_company_email,
        t.company_siret as template_company_siret,
        t.company_tva as template_company_tva
      FROM credit_notes cn
      LEFT JOIN customers c ON cn.customer_id = c.id
      LEFT JOIN invoices i ON cn.invoice_id = i.id
      LEFT JOIN users u ON cn.user_id = u.id
      LEFT JOIN invoice_templates t ON cn.template_id = t.id
      WHERE cn.id = $1 AND cn.deleted_at IS NULL
    `, [id]);

    if (creditNoteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Avoir non trouvé' });
    }

    // Récupérer les lignes
    const itemsResult = await pool.query(`
      SELECT
        cni.*,
        p.name as product_name,
        ii.description as original_item_description
      FROM credit_note_items cni
      LEFT JOIN products p ON cni.product_id = p.id
      LEFT JOIN invoice_items ii ON cni.invoice_item_id = ii.id
      WHERE cni.credit_note_id = $1
      ORDER BY cni.line_order, cni.id
    `, [id]);

    const creditNote = {
      ...creditNoteResult.rows[0],
      items: itemsResult.rows
    };

    res.json(creditNote);
  } catch (error: any) {
    console.error('Erreur lors de la récupération de l\'avoir:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/credit-notes
 * Créer un nouvel avoir
 */
router.post('/', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const orgId = getOrgIdFromRequest(req);
    const userId = req.user?.id;

    const {
      customer_id,
      invoice_id,
      credit_note_date,
      reason,
      reason_details,
      status = 'draft',
      refund_method,
      notes,
      internal_notes,
      items = [],
      template_id
    } = req.body;

    // Validation
    if (!customer_id) {
      return res.status(400).json({ error: 'customer_id est requis' });
    }

    if (!reason) {
      return res.status(400).json({ error: 'Le motif (reason) est requis' });
    }

    // Générer le numéro d'avoir
    const numberResult = await client.query('SELECT generate_credit_note_number() as credit_note_number');
    const creditNoteNumber = numberResult.rows[0].credit_note_number;

    // Calculer les totaux
    let subtotal = 0;
    let taxAmount = 0;
    let totalAmount = 0;

    if (items && items.length > 0) {
      for (const item of items) {
        const itemSubtotal = item.quantity * item.unit_price;
        const itemTax = itemSubtotal * ((item.tax_rate || 20) / 100);
        subtotal += itemSubtotal;
        taxAmount += itemTax;
      }
      totalAmount = subtotal + taxAmount;
    }

    // Créer l'avoir
    const creditNoteResult = await client.query(`
      INSERT INTO credit_notes (
        credit_note_number, organization_id, customer_id, invoice_id, user_id,
        credit_note_date, reason, reason_details, status, refund_method,
        notes, internal_notes, template_id,
        subtotal, tax_amount, total_amount
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `, [
      creditNoteNumber,
      orgId,
      customer_id,
      invoice_id || null,
      userId,
      credit_note_date || new Date().toISOString().split('T')[0],
      reason,
      reason_details || null,
      status,
      refund_method || null,
      notes || null,
      internal_notes || null,
      template_id || null,
      subtotal,
      taxAmount,
      totalAmount
    ]);

    const creditNote = creditNoteResult.rows[0];

    // Ajouter les lignes
    if (items && items.length > 0) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        await client.query(`
          INSERT INTO credit_note_items (
            credit_note_id, invoice_item_id, product_id, description,
            quantity, unit_price, tax_rate, line_order
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          creditNote.id,
          item.invoice_item_id || null,
          item.product_id || null,
          item.description,
          item.quantity,
          item.unit_price,
          item.tax_rate || 20,
          i
        ]);
      }
    }

    await client.query('COMMIT');

    res.status(201).json(creditNote);
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Erreur lors de la création de l\'avoir:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

/**
 * POST /api/credit-notes/from-invoice/:invoiceId
 * Créer un avoir à partir d'une facture existante
 */
router.post('/from-invoice/:invoiceId', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { invoiceId } = req.params;
    const orgId = getOrgIdFromRequest(req);
    const userId = req.user?.id;

    const {
      reason,
      reason_details,
      partial = false,     // Avoir partiel ou total
      item_ids = [],       // IDs des lignes à inclure (si partiel)
      quantities = {},     // Quantités personnalisées par item_id
      template_id
    } = req.body;

    // Récupérer la facture
    const invoiceResult = await client.query(
      'SELECT * FROM invoices WHERE id = $1',
      [invoiceId]
    );

    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Facture non trouvée' });
    }

    const invoice = invoiceResult.rows[0];

    // Récupérer les lignes de facture
    let itemsQuery = 'SELECT * FROM invoice_items WHERE invoice_id = $1';
    const itemsParams: any[] = [invoiceId];

    if (partial && item_ids.length > 0) {
      itemsQuery += ' AND id = ANY($2)';
      itemsParams.push(item_ids);
    }

    const invoiceItemsResult = await client.query(itemsQuery, itemsParams);

    if (invoiceItemsResult.rows.length === 0) {
      return res.status(400).json({ error: 'Aucune ligne à inclure dans l\'avoir' });
    }

    // Générer le numéro d'avoir
    const numberResult = await client.query('SELECT generate_credit_note_number() as credit_note_number');
    const creditNoteNumber = numberResult.rows[0].credit_note_number;

    // Créer l'avoir
    const creditNoteResult = await client.query(`
      INSERT INTO credit_notes (
        credit_note_number, organization_id, customer_id, invoice_id, user_id,
        credit_note_date, reason, reason_details, status, template_id
      ) VALUES ($1, $2, $3, $4, $5, CURRENT_DATE, $6, $7, 'draft', $8)
      RETURNING *
    `, [
      creditNoteNumber,
      orgId,
      invoice.customer_id,
      invoice.id,
      userId,
      reason || 'refund',
      reason_details || `Avoir sur facture ${invoice.invoice_number}`,
      template_id || invoice.template_id
    ]);

    const creditNote = creditNoteResult.rows[0];

    // Copier les lignes
    for (let i = 0; i < invoiceItemsResult.rows.length; i++) {
      const item = invoiceItemsResult.rows[i];
      const qty = quantities[item.id] || item.quantity;

      await client.query(`
        INSERT INTO credit_note_items (
          credit_note_id, invoice_item_id, product_id, description,
          quantity, unit_price, tax_rate, line_order
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        creditNote.id,
        item.id,
        item.product_id,
        item.description,
        qty,
        item.unit_price,
        item.tax_rate || 20,
        i
      ]);
    }

    // Recalculer les totaux (le trigger le fait automatiquement)

    await client.query('COMMIT');

    // Récupérer l'avoir complet avec les lignes
    const fullCreditNote = await pool.query(`
      SELECT cn.*,
        (SELECT json_agg(cni.*) FROM credit_note_items cni WHERE cni.credit_note_id = cn.id) as items
      FROM credit_notes cn
      WHERE cn.id = $1
    `, [creditNote.id]);

    res.status(201).json(fullCreditNote.rows[0]);
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Erreur lors de la création de l\'avoir depuis facture:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

/**
 * PUT /api/credit-notes/:id
 * Mettre à jour un avoir
 */
router.put('/:id', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { id } = req.params;

    const {
      credit_note_date,
      reason,
      reason_details,
      status,
      refund_method,
      refund_date,
      refund_reference,
      notes,
      internal_notes,
      items
    } = req.body;

    // Vérifier que l'avoir existe et n'est pas appliqué
    const existingResult = await client.query(
      'SELECT * FROM credit_notes WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Avoir non trouvé' });
    }

    const existing = existingResult.rows[0];
    if (existing.status === 'applied') {
      return res.status(400).json({ error: 'Un avoir appliqué ne peut pas être modifié' });
    }

    // Mettre à jour l'avoir
    const updateResult = await client.query(`
      UPDATE credit_notes
      SET
        credit_note_date = COALESCE($1, credit_note_date),
        reason = COALESCE($2, reason),
        reason_details = COALESCE($3, reason_details),
        status = COALESCE($4, status),
        refund_method = COALESCE($5, refund_method),
        refund_date = COALESCE($6, refund_date),
        refund_reference = COALESCE($7, refund_reference),
        notes = COALESCE($8, notes),
        internal_notes = COALESCE($9, internal_notes),
        updated_at = NOW()
      WHERE id = $10
      RETURNING *
    `, [
      credit_note_date,
      reason,
      reason_details,
      status,
      refund_method,
      refund_date,
      refund_reference,
      notes,
      internal_notes,
      id
    ]);

    // Si des items sont fournis, remplacer les items existants
    if (items && Array.isArray(items)) {
      await client.query('DELETE FROM credit_note_items WHERE credit_note_id = $1', [id]);

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        await client.query(`
          INSERT INTO credit_note_items (
            credit_note_id, invoice_item_id, product_id, description,
            quantity, unit_price, tax_rate, line_order
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          id,
          item.invoice_item_id || null,
          item.product_id || null,
          item.description,
          item.quantity,
          item.unit_price,
          item.tax_rate || 20,
          i
        ]);
      }
    }

    await client.query('COMMIT');

    res.json(updateResult.rows[0]);
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Erreur lors de la mise à jour de l\'avoir:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

/**
 * PATCH /api/credit-notes/:id/status
 * Changer le statut d'un avoir
 */
router.patch('/:id/status', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, refund_method, refund_reference } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Le statut est requis' });
    }

    const validStatuses = ['draft', 'issued', 'applied', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Statut invalide. Valeurs possibles: ${validStatuses.join(', ')}` });
    }

    const updateData: any = { status };

    // Si on passe à "applied", enregistrer la date et méthode de remboursement
    if (status === 'applied') {
      updateData.refund_date = new Date().toISOString().split('T')[0];
      if (refund_method) updateData.refund_method = refund_method;
      if (refund_reference) updateData.refund_reference = refund_reference;
    }

    const result = await pool.query(`
      UPDATE credit_notes
      SET status = $1,
          refund_date = COALESCE($2, refund_date),
          refund_method = COALESCE($3, refund_method),
          refund_reference = COALESCE($4, refund_reference),
          updated_at = NOW()
      WHERE id = $5 AND deleted_at IS NULL
      RETURNING *
    `, [
      status,
      updateData.refund_date || null,
      updateData.refund_method || null,
      updateData.refund_reference || null,
      id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Avoir non trouvé' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Erreur lors du changement de statut:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/credit-notes/:id
 * Supprimer un avoir (soft delete)
 */
router.delete('/:id', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Vérifier le statut avant suppression
    const checkResult = await pool.query(
      'SELECT status FROM credit_notes WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Avoir non trouvé' });
    }

    if (checkResult.rows[0].status === 'applied') {
      return res.status(400).json({ error: 'Un avoir appliqué ne peut pas être supprimé' });
    }

    const result = await pool.query(
      'UPDATE credit_notes SET deleted_at = NOW(), status = $1 WHERE id = $2 RETURNING id',
      ['cancelled', id]
    );

    res.json({ message: 'Avoir supprimé avec succès' });
  } catch (error: any) {
    console.error('Erreur lors de la suppression de l\'avoir:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/credit-notes/customer/:customerId
 * Avoirs d'un client spécifique
 */
router.get('/customer/:customerId', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  try {
    const { customerId } = req.params;

    const result = await pool.query(`
      SELECT cn.*,
        i.invoice_number as original_invoice_number
      FROM credit_notes cn
      LEFT JOIN invoices i ON cn.invoice_id = i.id
      WHERE cn.customer_id = $1 AND cn.deleted_at IS NULL
      ORDER BY cn.credit_note_date DESC
    `, [customerId]);

    res.json(result.rows);
  } catch (error: any) {
    console.error('Erreur lors de la récupération des avoirs client:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/credit-notes/invoice/:invoiceId
 * Avoirs liés à une facture
 */
router.get('/invoice/:invoiceId', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  try {
    const { invoiceId } = req.params;

    const result = await pool.query(`
      SELECT cn.*
      FROM credit_notes cn
      WHERE cn.invoice_id = $1 AND cn.deleted_at IS NULL
      ORDER BY cn.credit_note_date DESC
    `, [invoiceId]);

    res.json(result.rows);
  } catch (error: any) {
    console.error('Erreur lors de la récupération des avoirs de la facture:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
