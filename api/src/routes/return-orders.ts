import express, { Response } from 'express';
import { pool as db } from '../database/db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

// ==========================================
// BONS DE RETOUR
// ==========================================

// Liste des bons de retour
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;
    const { status, customer_id, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = `
      SELECT
        ro.*,
        c.name as customer_name,
        i.invoice_number,
        dn.delivery_number,
        cn.credit_note_number,
        u.first_name || ' ' || u.last_name as created_by_name
      FROM return_orders ro
      LEFT JOIN customers c ON ro.customer_id = c.id
      LEFT JOIN invoices i ON ro.invoice_id = i.id
      LEFT JOIN delivery_notes dn ON ro.delivery_note_id = dn.id
      LEFT JOIN credit_notes cn ON ro.credit_note_id = cn.id
      LEFT JOIN users u ON ro.created_by = u.id
      WHERE ro.organization_id = $1 AND ro.deleted_at IS NULL
    `;
    const params: any[] = [organizationId];

    if (status) {
      params.push(status);
      query += ` AND ro.status = $${params.length}`;
    }
    if (customer_id) {
      params.push(customer_id);
      query += ` AND ro.customer_id = $${params.length}`;
    }

    query += ` ORDER BY ro.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    // Count total
    const countQuery = `
      SELECT COUNT(*) FROM return_orders
      WHERE organization_id = $1 AND deleted_at IS NULL
      ${status ? 'AND status = $2' : ''}
      ${customer_id ? `AND customer_id = $${status ? 3 : 2}` : ''}
    `;
    const countParams: any[] = [organizationId];
    if (status) countParams.push(status);
    if (customer_id) countParams.push(customer_id);

    const countResult = await db.query(countQuery, countParams);

    res.json({
      data: result.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: parseInt(countResult.rows[0].count),
        totalPages: Math.ceil(parseInt(countResult.rows[0].count) / Number(limit))
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Détail d'un bon de retour
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = (req.user as any)?.organizationId;

    const orderResult = await db.query(`
      SELECT
        ro.*,
        c.name as customer_name,
        c.email as customer_email,
        i.invoice_number,
        dn.delivery_number,
        cn.credit_note_number
      FROM return_orders ro
      LEFT JOIN customers c ON ro.customer_id = c.id
      LEFT JOIN invoices i ON ro.invoice_id = i.id
      LEFT JOIN delivery_notes dn ON ro.delivery_note_id = dn.id
      LEFT JOIN credit_notes cn ON ro.credit_note_id = cn.id
      WHERE ro.id = $1 AND ro.organization_id = $2 AND ro.deleted_at IS NULL
    `, [id, organizationId]);

    if (orderResult.rows.length === 0) {
      res.status(404).json({ error: 'Bon de retour non trouvé' });
      return;
    }

    const itemsResult = await db.query(`
      SELECT
        roi.*,
        p.name as product_name,
        p.reference as product_reference
      FROM return_order_items roi
      LEFT JOIN products p ON roi.product_id = p.id
      WHERE roi.return_order_id = $1
    `, [id]);

    res.json({
      ...orderResult.rows[0],
      items: itemsResult.rows
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Créer un bon de retour
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;
    const userId = (req.user as any)?.id;
    const {
      customer_id,
      invoice_id,
      delivery_note_id,
      return_date,
      reason,
      reason_details,
      notes,
      items
    } = req.body;

    const client = await db.connect();
    try {
      await client.query('BEGIN');

      // Générer le numéro de retour
      const numberResult = await client.query(`
        SELECT COALESCE(MAX(CAST(SUBSTRING(return_number FROM 'RET-([0-9]+)') AS INTEGER)), 0) + 1 as next_num
        FROM return_orders WHERE organization_id = $1
      `, [organizationId]);
      const returnNumber = `RET-${String(numberResult.rows[0].next_num).padStart(5, '0')}`;

      // Calculer le total
      const totalAmount = items.reduce((sum: number, item: any) => sum + (item.quantity * item.unit_price), 0);

      // Créer le bon de retour
      const orderResult = await client.query(`
        INSERT INTO return_orders (
          organization_id, return_number, customer_id, invoice_id, delivery_note_id,
          return_date, reason, reason_details, total_amount, notes, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `, [
        organizationId, returnNumber, customer_id, invoice_id, delivery_note_id,
        return_date || new Date(), reason, reason_details, totalAmount, notes, userId
      ]);

      const orderId = orderResult.rows[0].id;

      // Ajouter les lignes
      for (const item of items) {
        await client.query(`
          INSERT INTO return_order_items (
            return_order_id, product_id, description, quantity, unit_price, condition, line_total
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          orderId, item.product_id, item.description, item.quantity,
          item.unit_price, item.condition || 'unknown', item.quantity * item.unit_price
        ]);
      }

      await client.query('COMMIT');

      res.status(201).json({
        ...orderResult.rows[0],
        items
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

// Créer un bon de retour depuis une facture
router.post('/from-invoice/:invoiceId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { invoiceId } = req.params;
    const organizationId = (req.user as any)?.organizationId;
    const userId = (req.user as any)?.id;
    const { items, reason, reason_details, notes } = req.body;

    // Récupérer la facture
    const invoiceResult = await db.query(`
      SELECT * FROM invoices WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
    `, [invoiceId, organizationId]);

    if (invoiceResult.rows.length === 0) {
      res.status(404).json({ error: 'Facture non trouvée' });
      return;
    }

    const invoice = invoiceResult.rows[0];

    const client = await db.connect();
    try {
      await client.query('BEGIN');

      // Générer le numéro
      const numberResult = await client.query(`
        SELECT COALESCE(MAX(CAST(SUBSTRING(return_number FROM 'RET-([0-9]+)') AS INTEGER)), 0) + 1 as next_num
        FROM return_orders WHERE organization_id = $1
      `, [organizationId]);
      const returnNumber = `RET-${String(numberResult.rows[0].next_num).padStart(5, '0')}`;

      // Calculer le total
      const totalAmount = items.reduce((sum: number, item: any) => sum + (item.quantity * item.unit_price), 0);

      // Créer le bon de retour
      const orderResult = await client.query(`
        INSERT INTO return_orders (
          organization_id, return_number, customer_id, invoice_id,
          return_date, reason, reason_details, total_amount, notes, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `, [
        organizationId, returnNumber, invoice.customer_id, invoiceId,
        new Date(), reason, reason_details, totalAmount, notes, userId
      ]);

      const orderId = orderResult.rows[0].id;

      // Ajouter les lignes
      for (const item of items) {
        await client.query(`
          INSERT INTO return_order_items (
            return_order_id, product_id, description, quantity, unit_price, condition, line_total
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          orderId, item.product_id, item.description, item.quantity,
          item.unit_price, item.condition || 'unknown', item.quantity * item.unit_price
        ]);
      }

      await client.query('COMMIT');

      res.status(201).json(orderResult.rows[0]);
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

// Marquer comme reçu
router.post('/:id/receive', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = (req.user as any)?.organizationId;
    const { received_date, item_conditions } = req.body;

    const client = await db.connect();
    try {
      await client.query('BEGIN');

      // Mettre à jour le statut
      await client.query(`
        UPDATE return_orders
        SET status = 'received', received_date = $3, updated_at = NOW()
        WHERE id = $1 AND organization_id = $2
      `, [id, organizationId, received_date || new Date()]);

      // Mettre à jour l'état des articles si fourni
      if (item_conditions) {
        for (const itemCondition of item_conditions) {
          await client.query(`
            UPDATE return_order_items SET condition = $2 WHERE id = $1
          `, [itemCondition.item_id, itemCondition.condition]);
        }
      }

      await client.query('COMMIT');
      res.json({ message: 'Retour reçu' });
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

// Générer un avoir depuis le bon de retour
router.post('/:id/create-credit-note', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = (req.user as any)?.organizationId;
    const userId = (req.user as any)?.id;

    // Récupérer le bon de retour
    const returnResult = await db.query(`
      SELECT ro.*, i.invoice_number FROM return_orders ro
      LEFT JOIN invoices i ON ro.invoice_id = i.id
      WHERE ro.id = $1 AND ro.organization_id = $2 AND ro.deleted_at IS NULL
    `, [id, organizationId]);

    if (returnResult.rows.length === 0) {
      res.status(404).json({ error: 'Bon de retour non trouvé' });
      return;
    }

    const returnOrder = returnResult.rows[0];

    if (returnOrder.credit_note_id) {
      res.status(400).json({ error: 'Un avoir a déjà été créé pour ce retour' });
      return;
    }

    // Récupérer les lignes
    const itemsResult = await db.query(`
      SELECT * FROM return_order_items WHERE return_order_id = $1
    `, [id]);

    const client = await db.connect();
    try {
      await client.query('BEGIN');

      // Générer le numéro d'avoir
      const numberResult = await client.query(`
        SELECT COALESCE(MAX(CAST(SUBSTRING(credit_note_number FROM 'AV-([0-9]+)') AS INTEGER)), 0) + 1 as next_num
        FROM credit_notes WHERE organization_id = $1
      `, [organizationId]);
      const creditNoteNumber = `AV-${String(numberResult.rows[0].next_num).padStart(5, '0')}`;

      // Créer l'avoir
      const creditNoteResult = await client.query(`
        INSERT INTO credit_notes (
          organization_id, credit_note_number, customer_id, invoice_id,
          issue_date, total_amount, reason, status, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'draft', $8)
        RETURNING *
      `, [
        organizationId, creditNoteNumber, returnOrder.customer_id, returnOrder.invoice_id,
        new Date(), returnOrder.total_amount, `Retour marchandise - ${returnOrder.return_number}`, userId
      ]);

      const creditNoteId = creditNoteResult.rows[0].id;

      // Ajouter les lignes d'avoir
      for (const item of itemsResult.rows) {
        await client.query(`
          INSERT INTO credit_note_items (
            credit_note_id, product_id, description, quantity, unit_price, subtotal
          ) VALUES ($1, $2, $3, $4, $5, $6)
        `, [creditNoteId, item.product_id, item.description, item.quantity, item.unit_price, item.line_total]);
      }

      // Lier l'avoir au bon de retour
      await client.query(`
        UPDATE return_orders SET credit_note_id = $1, resolution_type = 'credit_note', status = 'refunded', updated_at = NOW()
        WHERE id = $2
      `, [creditNoteId, id]);

      await client.query('COMMIT');

      res.status(201).json({
        message: 'Avoir créé',
        credit_note_id: creditNoteId,
        credit_note_number: creditNoteNumber
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

// Réintégrer au stock
router.post('/:id/restock', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = (req.user as any)?.organizationId;
    const userId = (req.user as any)?.id;
    const { items } = req.body; // [{ item_id, quantity_to_restock }]

    const client = await db.connect();
    try {
      await client.query('BEGIN');

      for (const item of items) {
        // Récupérer la ligne
        const itemResult = await client.query(`
          SELECT roi.*, p.id as product_id FROM return_order_items roi
          JOIN products p ON roi.product_id = p.id
          WHERE roi.id = $1 AND roi.return_order_id = $2
        `, [item.item_id, id]);

        if (itemResult.rows.length === 0) continue;

        const returnItem = itemResult.rows[0];

        // Mettre à jour le stock
        await client.query(`
          UPDATE products SET stock_quantity = stock_quantity + $1 WHERE id = $2
        `, [item.quantity_to_restock, returnItem.product_id]);

        // Enregistrer le mouvement de stock
        await client.query(`
          INSERT INTO stock_movements (organization_id, product_id, movement_type, quantity, reference, notes, created_by)
          VALUES ($1, $2, 'in', $3, $4, 'Réintégration retour client', $5)
        `, [organizationId, returnItem.product_id, item.quantity_to_restock, `RET-${id}`, userId]);

        // Marquer comme réintégré
        await client.query(`
          UPDATE return_order_items SET restock = true, restocked_quantity = $1 WHERE id = $2
        `, [item.quantity_to_restock, item.item_id]);
      }

      await client.query('COMMIT');
      res.json({ message: 'Stock mis à jour' });
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

// Supprimer un bon de retour (soft delete)
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = (req.user as any)?.organizationId;

    // Vérifier si résolu
    const checkResult = await db.query(`
      SELECT status FROM return_orders WHERE id = $1 AND organization_id = $2
    `, [id, organizationId]);

    if (checkResult.rows.length === 0) {
      res.status(404).json({ error: 'Bon de retour non trouvé' });
      return;
    }

    if (['refunded', 'replaced'].includes(checkResult.rows[0].status)) {
      res.status(400).json({ error: 'Impossible de supprimer un retour déjà traité' });
      return;
    }

    await db.query(`
      UPDATE return_orders SET deleted_at = NOW() WHERE id = $1 AND organization_id = $2
    `, [id, organizationId]);

    res.json({ message: 'Bon de retour supprimé' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
