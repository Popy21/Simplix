import express, { Response } from 'express';
import { pool as db } from '../database/db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

// ==========================================
// BONS DE LIVRAISON (Delivery Notes)
// ==========================================

// Liste des bons de livraison
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;
    const { status, customer_id, purchase_order_id, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = `
      SELECT
        dn.*,
        c.name as customer_name,
        c.email as customer_email,
        po.order_number as purchase_order_number,
        u.first_name || ' ' || u.last_name as created_by_name
      FROM delivery_notes dn
      LEFT JOIN customers c ON dn.customer_id = c.id
      LEFT JOIN purchase_orders po ON dn.purchase_order_id = po.id
      LEFT JOIN users u ON dn.created_by = u.id
      WHERE dn.organization_id = $1 AND dn.deleted_at IS NULL
    `;
    const params: any[] = [organizationId];

    if (status) {
      params.push(status);
      query += ` AND dn.status = $${params.length}`;
    }

    if (customer_id) {
      params.push(customer_id);
      query += ` AND dn.customer_id = $${params.length}`;
    }

    if (purchase_order_id) {
      params.push(purchase_order_id);
      query += ` AND dn.purchase_order_id = $${params.length}`;
    }

    query += ` ORDER BY dn.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(Number(limit), offset);

    const result = await db.query(query, params);

    // Count total
    let countQuery = `
      SELECT COUNT(*) FROM delivery_notes dn
      WHERE dn.organization_id = $1 AND dn.deleted_at IS NULL
    `;
    const countParams: any[] = [organizationId];

    if (status) {
      countParams.push(status);
      countQuery += ` AND dn.status = $${countParams.length}`;
    }
    if (customer_id) {
      countParams.push(customer_id);
      countQuery += ` AND dn.customer_id = $${countParams.length}`;
    }
    if (purchase_order_id) {
      countParams.push(purchase_order_id);
      countQuery += ` AND dn.purchase_order_id = $${countParams.length}`;
    }

    const countResult = await db.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      data: result.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Générer un numéro de BL
router.get('/next-number', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;
    const year = new Date().getFullYear();

    const result = await db.query(`
      SELECT delivery_number FROM delivery_notes
      WHERE organization_id = $1
        AND delivery_number LIKE $2
      ORDER BY delivery_number DESC LIMIT 1
    `, [organizationId, `BL-${year}-%`]);

    let nextNumber = 1;
    if (result.rows.length > 0) {
      const lastNumber = result.rows[0].delivery_number;
      const match = lastNumber.match(/BL-\d{4}-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }

    res.json({
      delivery_number: `BL-${year}-${String(nextNumber).padStart(5, '0')}`
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Créer un bon de livraison
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;
    const userId = (req.user as any)?.id;
    const {
      delivery_number,
      purchase_order_id,
      customer_id,
      delivery_date,
      shipped_date,
      carrier_name,
      tracking_number,
      shipping_method,
      shipping_address,
      shipping_contact,
      shipping_phone,
      total_weight,
      weight_unit,
      package_count,
      notes,
      delivery_instructions,
      items
    } = req.body;

    // Générer le numéro si non fourni
    let finalDeliveryNumber = delivery_number;
    if (!finalDeliveryNumber) {
      const year = new Date().getFullYear();
      const numResult = await db.query(`
        SELECT delivery_number FROM delivery_notes
        WHERE organization_id = $1 AND delivery_number LIKE $2
        ORDER BY delivery_number DESC LIMIT 1
      `, [organizationId, `BL-${year}-%`]);

      let nextNum = 1;
      if (numResult.rows.length > 0) {
        const match = numResult.rows[0].delivery_number.match(/BL-\d{4}-(\d+)/);
        if (match) nextNum = parseInt(match[1]) + 1;
      }
      finalDeliveryNumber = `BL-${year}-${String(nextNum).padStart(5, '0')}`;
    }

    // Créer le bon de livraison
    const result = await db.query(`
      INSERT INTO delivery_notes (
        delivery_number, purchase_order_id, customer_id, delivery_date,
        shipped_date, carrier_name, tracking_number, shipping_method,
        shipping_address, shipping_contact, shipping_phone,
        total_weight, weight_unit, package_count, notes, delivery_instructions,
        organization_id, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *
    `, [
      finalDeliveryNumber, purchase_order_id, customer_id,
      delivery_date || new Date(), shipped_date, carrier_name,
      tracking_number, shipping_method, shipping_address, shipping_contact,
      shipping_phone, total_weight, weight_unit || 'kg', package_count || 1,
      notes, delivery_instructions, organizationId, userId
    ]);

    const deliveryNoteId = result.rows[0].id;

    // Ajouter les lignes
    if (items && items.length > 0) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        await db.query(`
          INSERT INTO delivery_note_items (
            delivery_note_id, purchase_order_item_id, product_id,
            description, quantity_ordered, quantity_delivered,
            lot_number, serial_numbers, condition, condition_notes, sort_order
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `, [
          deliveryNoteId, item.purchase_order_item_id, item.product_id,
          item.description, item.quantity_ordered, item.quantity_delivered,
          item.lot_number, item.serial_numbers, item.condition || 'good',
          item.condition_notes, i
        ]);
      }
    }

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    console.error('Erreur création BL:', err);
    res.status(500).json({ error: err.message });
  }
});

// Détail d'un bon de livraison
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = (req.user as any)?.organizationId;

    const result = await db.query(`
      SELECT
        dn.*,
        c.name as customer_name,
        c.email as customer_email,
        c.phone as customer_phone,
        po.order_number as purchase_order_number,
        u.first_name || ' ' || u.last_name as created_by_name
      FROM delivery_notes dn
      LEFT JOIN customers c ON dn.customer_id = c.id
      LEFT JOIN purchase_orders po ON dn.purchase_order_id = po.id
      LEFT JOIN users u ON dn.created_by = u.id
      WHERE dn.id = $1 AND dn.organization_id = $2 AND dn.deleted_at IS NULL
    `, [id, organizationId]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Bon de livraison non trouvé' });
      return;
    }

    // Récupérer les lignes
    const itemsResult = await db.query(`
      SELECT
        dni.*,
        p.name as product_name,
        p.sku as product_sku
      FROM delivery_note_items dni
      LEFT JOIN products p ON dni.product_id = p.id
      WHERE dni.delivery_note_id = $1
      ORDER BY dni.sort_order
    `, [id]);

    res.json({
      ...result.rows[0],
      items: itemsResult.rows
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Mettre à jour un bon de livraison
router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = (req.user as any)?.organizationId;
    const {
      delivery_date,
      shipped_date,
      carrier_name,
      tracking_number,
      shipping_method,
      shipping_address,
      shipping_contact,
      shipping_phone,
      total_weight,
      weight_unit,
      package_count,
      status,
      notes,
      delivery_instructions,
      items
    } = req.body;

    const result = await db.query(`
      UPDATE delivery_notes SET
        delivery_date = COALESCE($1, delivery_date),
        shipped_date = $2,
        carrier_name = $3,
        tracking_number = $4,
        shipping_method = $5,
        shipping_address = COALESCE($6, shipping_address),
        shipping_contact = $7,
        shipping_phone = $8,
        total_weight = $9,
        weight_unit = COALESCE($10, weight_unit),
        package_count = COALESCE($11, package_count),
        status = COALESCE($12, status),
        notes = $13,
        delivery_instructions = $14,
        updated_at = NOW()
      WHERE id = $15 AND organization_id = $16 AND deleted_at IS NULL
      RETURNING *
    `, [
      delivery_date, shipped_date, carrier_name, tracking_number,
      shipping_method, shipping_address, shipping_contact, shipping_phone,
      total_weight, weight_unit, package_count, status, notes,
      delivery_instructions, id, organizationId
    ]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Bon de livraison non trouvé' });
      return;
    }

    // Mettre à jour les lignes si fournies
    if (items !== undefined) {
      await db.query('DELETE FROM delivery_note_items WHERE delivery_note_id = $1', [id]);

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        await db.query(`
          INSERT INTO delivery_note_items (
            delivery_note_id, purchase_order_item_id, product_id,
            description, quantity_ordered, quantity_delivered,
            lot_number, serial_numbers, condition, condition_notes, sort_order
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `, [
          id, item.purchase_order_item_id, item.product_id,
          item.description, item.quantity_ordered, item.quantity_delivered,
          item.lot_number, item.serial_numbers, item.condition || 'good',
          item.condition_notes, i
        ]);
      }
    }

    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Supprimer un bon de livraison (soft delete)
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = (req.user as any)?.organizationId;

    const result = await db.query(`
      UPDATE delivery_notes
      SET deleted_at = NOW(), updated_at = NOW()
      WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
      RETURNING id
    `, [id, organizationId]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Bon de livraison non trouvé' });
      return;
    }

    res.json({ message: 'Bon de livraison supprimé' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Créer un BL à partir d'un bon de commande
router.post('/from-order/:orderId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { orderId } = req.params;
    const organizationId = (req.user as any)?.organizationId;
    const userId = (req.user as any)?.id;
    const { items: selectedItems } = req.body; // Permet livraison partielle

    // Récupérer le BC
    const bcResult = await db.query(`
      SELECT po.*, c.name as customer_name, c.address as customer_address
      FROM purchase_orders po
      LEFT JOIN customers c ON po.customer_id = c.id
      WHERE po.id = $1 AND po.organization_id = $2 AND po.deleted_at IS NULL
    `, [orderId, organizationId]);

    if (bcResult.rows.length === 0) {
      res.status(404).json({ error: 'Bon de commande non trouvé' });
      return;
    }

    const bc = bcResult.rows[0];

    if (!['confirmed', 'partial'].includes(bc.status)) {
      res.status(400).json({ error: 'Ce bon de commande n\'est pas disponible pour livraison' });
      return;
    }

    // Générer le numéro de BL
    const year = new Date().getFullYear();
    const numResult = await db.query(`
      SELECT delivery_number FROM delivery_notes
      WHERE organization_id = $1 AND delivery_number LIKE $2
      ORDER BY delivery_number DESC LIMIT 1
    `, [organizationId, `BL-${year}-%`]);

    let nextNum = 1;
    if (numResult.rows.length > 0) {
      const match = numResult.rows[0].delivery_number.match(/BL-\d{4}-(\d+)/);
      if (match) nextNum = parseInt(match[1]) + 1;
    }
    const deliveryNumber = `BL-${year}-${String(nextNum).padStart(5, '0')}`;

    // Créer le BL
    const blResult = await db.query(`
      INSERT INTO delivery_notes (
        delivery_number, purchase_order_id, customer_id, delivery_date,
        shipping_address, notes, organization_id, created_by, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'draft')
      RETURNING *
    `, [
      deliveryNumber, orderId, bc.customer_id, new Date(),
      bc.shipping_address || bc.customer_address,
      `Livraison pour commande ${bc.order_number}`,
      organizationId, userId
    ]);

    const blId = blResult.rows[0].id;

    // Récupérer les lignes à livrer
    let itemsToDeliver;
    if (selectedItems && selectedItems.length > 0) {
      // Livraison partielle - utiliser les items sélectionnés
      itemsToDeliver = selectedItems;
    } else {
      // Livraison complète - prendre tous les items avec quantité restante
      const itemsResult = await db.query(`
        SELECT
          poi.id as purchase_order_item_id,
          poi.product_id,
          poi.description,
          poi.quantity as quantity_ordered,
          poi.quantity_remaining as quantity_delivered
        FROM purchase_order_items poi
        WHERE poi.purchase_order_id = $1 AND poi.quantity_remaining > 0
        ORDER BY poi.sort_order
      `, [orderId]);
      itemsToDeliver = itemsResult.rows;
    }

    // Ajouter les lignes de livraison
    for (let i = 0; i < itemsToDeliver.length; i++) {
      const item = itemsToDeliver[i];
      await db.query(`
        INSERT INTO delivery_note_items (
          delivery_note_id, purchase_order_item_id, product_id,
          description, quantity_ordered, quantity_delivered, sort_order
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        blId, item.purchase_order_item_id, item.product_id,
        item.description, item.quantity_ordered, item.quantity_delivered, i
      ]);
    }

    res.status(201).json(blResult.rows[0]);
  } catch (err: any) {
    console.error('Erreur création BL depuis BC:', err);
    res.status(500).json({ error: err.message });
  }
});

// Marquer comme expédié
router.post('/:id/ship', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = (req.user as any)?.organizationId;
    const { carrier_name, tracking_number, shipping_method } = req.body;

    const result = await db.query(`
      UPDATE delivery_notes SET
        status = 'shipped',
        shipped_date = NOW(),
        carrier_name = COALESCE($1, carrier_name),
        tracking_number = COALESCE($2, tracking_number),
        shipping_method = COALESCE($3, shipping_method),
        updated_at = NOW()
      WHERE id = $4 AND organization_id = $5 AND status IN ('draft', 'shipped') AND deleted_at IS NULL
      RETURNING *
    `, [carrier_name, tracking_number, shipping_method, id, organizationId]);

    if (result.rows.length === 0) {
      res.status(400).json({ error: 'Impossible de marquer comme expédié' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Marquer comme livré
router.post('/:id/deliver', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = (req.user as any)?.organizationId;
    const { signed_by, signature_data, signature_ip } = req.body;

    const result = await db.query(`
      UPDATE delivery_notes SET
        status = 'delivered',
        signed_by = $1,
        signed_at = NOW(),
        signature_data = $2,
        signature_ip = $3,
        updated_at = NOW()
      WHERE id = $4 AND organization_id = $5 AND status IN ('shipped', 'in_transit', 'draft') AND deleted_at IS NULL
      RETURNING *
    `, [signed_by, signature_data, signature_ip, id, organizationId]);

    if (result.rows.length === 0) {
      res.status(400).json({ error: 'Impossible de marquer comme livré' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Signature client (route publique)
router.post('/sign/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { signed_by, signature_data } = req.body;
    const signatureIp = req.ip || req.connection.remoteAddress;

    // Trouver le BL par token (on utilise delivery_number comme token pour simplifier)
    const result = await db.query(`
      UPDATE delivery_notes SET
        status = 'delivered',
        signed_by = $1,
        signed_at = NOW(),
        signature_data = $2,
        signature_ip = $3,
        updated_at = NOW()
      WHERE delivery_number = $4 AND status IN ('shipped', 'in_transit') AND deleted_at IS NULL
      RETURNING id, delivery_number, signed_by, signed_at
    `, [signed_by, signature_data, signatureIp, token]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Bon de livraison non trouvé ou déjà signé' });
      return;
    }

    res.json({
      success: true,
      message: 'Livraison confirmée',
      delivery: result.rows[0]
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Statistiques des livraisons
router.get('/stats/summary', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;

    const result = await db.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'draft') as draft_count,
        COUNT(*) FILTER (WHERE status = 'shipped') as shipped_count,
        COUNT(*) FILTER (WHERE status = 'in_transit') as in_transit_count,
        COUNT(*) FILTER (WHERE status = 'delivered') as delivered_count,
        COUNT(*) FILTER (WHERE status = 'returned') as returned_count,
        COUNT(*) as total_count,
        COUNT(*) FILTER (WHERE delivery_date >= CURRENT_DATE - INTERVAL '30 days') as last_30_days
      FROM delivery_notes
      WHERE organization_id = $1 AND deleted_at IS NULL
    `, [organizationId]);

    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Dupliquer un BL
router.post('/:id/duplicate', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = (req.user as any)?.organizationId;
    const userId = (req.user as any)?.id;

    // Récupérer le BL original
    const blResult = await db.query(`
      SELECT * FROM delivery_notes WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
    `, [id, organizationId]);

    if (blResult.rows.length === 0) {
      res.status(404).json({ error: 'Bon de livraison non trouvé' });
      return;
    }

    const bl = blResult.rows[0];

    // Générer un nouveau numéro
    const year = new Date().getFullYear();
    const numResult = await db.query(`
      SELECT delivery_number FROM delivery_notes
      WHERE organization_id = $1 AND delivery_number LIKE $2
      ORDER BY delivery_number DESC LIMIT 1
    `, [organizationId, `BL-${year}-%`]);

    let nextNum = 1;
    if (numResult.rows.length > 0) {
      const match = numResult.rows[0].delivery_number.match(/BL-\d{4}-(\d+)/);
      if (match) nextNum = parseInt(match[1]) + 1;
    }
    const newDeliveryNumber = `BL-${year}-${String(nextNum).padStart(5, '0')}`;

    // Créer la copie
    const newBlResult = await db.query(`
      INSERT INTO delivery_notes (
        delivery_number, customer_id, delivery_date, shipping_address,
        shipping_contact, shipping_phone, carrier_name, shipping_method,
        total_weight, weight_unit, package_count, notes, delivery_instructions,
        organization_id, created_by, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'draft')
      RETURNING *
    `, [
      newDeliveryNumber, bl.customer_id, new Date(), bl.shipping_address,
      bl.shipping_contact, bl.shipping_phone, bl.carrier_name, bl.shipping_method,
      bl.total_weight, bl.weight_unit, bl.package_count, bl.notes,
      bl.delivery_instructions, organizationId, userId
    ]);

    const newBlId = newBlResult.rows[0].id;

    // Copier les lignes
    await db.query(`
      INSERT INTO delivery_note_items (
        delivery_note_id, product_id, description,
        quantity_ordered, quantity_delivered, lot_number,
        serial_numbers, condition, condition_notes, sort_order
      )
      SELECT
        $1, product_id, description,
        quantity_ordered, quantity_delivered, lot_number,
        serial_numbers, condition, condition_notes, sort_order
      FROM delivery_note_items
      WHERE delivery_note_id = $2
    `, [newBlId, id]);

    res.status(201).json(newBlResult.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
