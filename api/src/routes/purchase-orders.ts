import express, { Response } from 'express';
import { pool as db } from '../database/db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

// ==========================================
// BONS DE COMMANDE (Purchase Orders)
// ==========================================

// Liste des bons de commande
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;
    const { status, customer_id, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = `
      SELECT
        po.*,
        c.name as customer_name,
        c.email as customer_email,
        u.first_name || ' ' || u.last_name as created_by_name,
        (SELECT COUNT(*) FROM delivery_notes dn WHERE dn.purchase_order_id = po.id AND dn.deleted_at IS NULL) as delivery_count
      FROM purchase_orders po
      LEFT JOIN customers c ON po.customer_id = c.id
      LEFT JOIN users u ON po.created_by = u.id
      WHERE po.organization_id = $1 AND po.deleted_at IS NULL
    `;
    const params: any[] = [organizationId];

    if (status) {
      params.push(status);
      query += ` AND po.status = $${params.length}`;
    }

    if (customer_id) {
      params.push(customer_id);
      query += ` AND po.customer_id = $${params.length}`;
    }

    query += ` ORDER BY po.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(Number(limit), offset);

    const result = await db.query(query, params);

    // Count total
    let countQuery = `
      SELECT COUNT(*) FROM purchase_orders po
      WHERE po.organization_id = $1 AND po.deleted_at IS NULL
    `;
    const countParams: any[] = [organizationId];

    if (status) {
      countParams.push(status);
      countQuery += ` AND po.status = $${countParams.length}`;
    }
    if (customer_id) {
      countParams.push(customer_id);
      countQuery += ` AND po.customer_id = $${countParams.length}`;
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

// Générer un numéro de BC
router.get('/next-number', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;
    const year = new Date().getFullYear();

    const result = await db.query(`
      SELECT order_number FROM purchase_orders
      WHERE organization_id = $1
        AND order_number LIKE $2
      ORDER BY order_number DESC LIMIT 1
    `, [organizationId, `BC-${year}-%`]);

    let nextNumber = 1;
    if (result.rows.length > 0) {
      const lastNumber = result.rows[0].order_number;
      const match = lastNumber.match(/BC-\d{4}-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }

    res.json({
      order_number: `BC-${year}-${String(nextNumber).padStart(5, '0')}`
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Créer un bon de commande
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;
    const userId = (req.user as any)?.id;
    const {
      order_number,
      customer_id,
      quote_id,
      order_date,
      expected_delivery_date,
      billing_address,
      shipping_address,
      discount_amount,
      shipping_cost,
      tax_rate,
      payment_terms,
      notes,
      internal_notes,
      customer_po_number,
      template_id,
      items
    } = req.body;

    // Générer le numéro si non fourni
    let finalOrderNumber = order_number;
    if (!finalOrderNumber) {
      const year = new Date().getFullYear();
      const numResult = await db.query(`
        SELECT order_number FROM purchase_orders
        WHERE organization_id = $1 AND order_number LIKE $2
        ORDER BY order_number DESC LIMIT 1
      `, [organizationId, `BC-${year}-%`]);

      let nextNum = 1;
      if (numResult.rows.length > 0) {
        const match = numResult.rows[0].order_number.match(/BC-\d{4}-(\d+)/);
        if (match) nextNum = parseInt(match[1]) + 1;
      }
      finalOrderNumber = `BC-${year}-${String(nextNum).padStart(5, '0')}`;
    }

    // Créer le bon de commande
    const result = await db.query(`
      INSERT INTO purchase_orders (
        order_number, customer_id, quote_id, order_date, expected_delivery_date,
        billing_address, shipping_address, discount_amount, shipping_cost,
        tax_rate, payment_terms, notes, internal_notes, customer_po_number,
        template_id, organization_id, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *
    `, [
      finalOrderNumber, customer_id, quote_id, order_date || new Date(),
      expected_delivery_date, billing_address, shipping_address,
      discount_amount || 0, shipping_cost || 0, tax_rate || 20,
      payment_terms, notes, internal_notes, customer_po_number,
      template_id, organizationId, userId
    ]);

    const orderId = result.rows[0].id;

    // Ajouter les lignes
    if (items && items.length > 0) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const subtotal = item.quantity * item.unit_price * (1 - (item.discount_percent || 0) / 100);
        const itemTaxRate = item.tax_rate ?? tax_rate ?? 20;
        const totalPrice = subtotal * (1 + itemTaxRate / 100);

        await db.query(`
          INSERT INTO purchase_order_items (
            purchase_order_id, product_id, description, quantity, unit,
            unit_price, discount_percent, discount_amount, tax_rate,
            subtotal, total_price, sort_order
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `, [
          orderId, item.product_id, item.description, item.quantity,
          item.unit || 'unité', item.unit_price, item.discount_percent || 0,
          item.discount_amount || 0, itemTaxRate, subtotal, totalPrice, i
        ]);
      }
    }

    // Récupérer le BC complet avec totaux mis à jour
    const finalResult = await db.query(`
      SELECT po.*, c.name as customer_name
      FROM purchase_orders po
      LEFT JOIN customers c ON po.customer_id = c.id
      WHERE po.id = $1
    `, [orderId]);

    res.status(201).json(finalResult.rows[0]);
  } catch (err: any) {
    console.error('Erreur création BC:', err);
    res.status(500).json({ error: err.message });
  }
});

// Détail d'un bon de commande
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = (req.user as any)?.organizationId;

    const result = await db.query(`
      SELECT
        po.*,
        c.name as customer_name,
        c.email as customer_email,
        c.phone as customer_phone,
        c.address as customer_address,
        q.quote_number as quote_reference,
        u.first_name || ' ' || u.last_name as created_by_name
      FROM purchase_orders po
      LEFT JOIN customers c ON po.customer_id = c.id
      LEFT JOIN quotes q ON po.quote_id = q.id
      LEFT JOIN users u ON po.created_by = u.id
      WHERE po.id = $1 AND po.organization_id = $2 AND po.deleted_at IS NULL
    `, [id, organizationId]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Bon de commande non trouvé' });
      return;
    }

    // Récupérer les lignes
    const itemsResult = await db.query(`
      SELECT
        poi.*,
        p.name as product_name,
        p.sku as product_sku
      FROM purchase_order_items poi
      LEFT JOIN products p ON poi.product_id = p.id
      WHERE poi.purchase_order_id = $1
      ORDER BY poi.sort_order
    `, [id]);

    // Récupérer les livraisons associées
    const deliveriesResult = await db.query(`
      SELECT id, delivery_number, delivery_date, status
      FROM delivery_notes
      WHERE purchase_order_id = $1 AND deleted_at IS NULL
      ORDER BY delivery_date DESC
    `, [id]);

    res.json({
      ...result.rows[0],
      items: itemsResult.rows,
      deliveries: deliveriesResult.rows
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Mettre à jour un bon de commande
router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = (req.user as any)?.organizationId;
    const {
      customer_id,
      expected_delivery_date,
      billing_address,
      shipping_address,
      discount_amount,
      shipping_cost,
      tax_rate,
      status,
      payment_terms,
      notes,
      internal_notes,
      customer_po_number,
      template_id,
      items
    } = req.body;

    // Vérifier que le BC existe et appartient à l'organisation
    const existing = await db.query(
      'SELECT id, status FROM purchase_orders WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL',
      [id, organizationId]
    );

    if (existing.rows.length === 0) {
      res.status(404).json({ error: 'Bon de commande non trouvé' });
      return;
    }

    // Mettre à jour le BC
    const result = await db.query(`
      UPDATE purchase_orders SET
        customer_id = COALESCE($1, customer_id),
        expected_delivery_date = $2,
        billing_address = COALESCE($3, billing_address),
        shipping_address = COALESCE($4, shipping_address),
        discount_amount = COALESCE($5, discount_amount),
        shipping_cost = COALESCE($6, shipping_cost),
        tax_rate = COALESCE($7, tax_rate),
        status = COALESCE($8, status),
        payment_terms = COALESCE($9, payment_terms),
        notes = $10,
        internal_notes = $11,
        customer_po_number = $12,
        template_id = $13,
        updated_at = NOW()
      WHERE id = $14 AND organization_id = $15
      RETURNING *
    `, [
      customer_id, expected_delivery_date, billing_address, shipping_address,
      discount_amount, shipping_cost, tax_rate, status, payment_terms,
      notes, internal_notes, customer_po_number, template_id, id, organizationId
    ]);

    // Mettre à jour les lignes si fournies
    if (items !== undefined) {
      // Supprimer les anciennes lignes
      await db.query('DELETE FROM purchase_order_items WHERE purchase_order_id = $1', [id]);

      // Ajouter les nouvelles
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const subtotal = item.quantity * item.unit_price * (1 - (item.discount_percent || 0) / 100);
        const itemTaxRate = item.tax_rate ?? tax_rate ?? 20;
        const totalPrice = subtotal * (1 + itemTaxRate / 100);

        await db.query(`
          INSERT INTO purchase_order_items (
            purchase_order_id, product_id, description, quantity, unit,
            unit_price, discount_percent, discount_amount, tax_rate,
            subtotal, total_price, sort_order
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `, [
          id, item.product_id, item.description, item.quantity,
          item.unit || 'unité', item.unit_price, item.discount_percent || 0,
          item.discount_amount || 0, itemTaxRate, subtotal, totalPrice, i
        ]);
      }
    }

    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Supprimer un bon de commande (soft delete)
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = (req.user as any)?.organizationId;

    const result = await db.query(`
      UPDATE purchase_orders
      SET deleted_at = NOW(), updated_at = NOW()
      WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
      RETURNING id
    `, [id, organizationId]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Bon de commande non trouvé' });
      return;
    }

    res.json({ message: 'Bon de commande supprimé' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Confirmer un bon de commande
router.post('/:id/confirm', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = (req.user as any)?.organizationId;

    const result = await db.query(`
      UPDATE purchase_orders
      SET status = 'confirmed', updated_at = NOW()
      WHERE id = $1 AND organization_id = $2 AND status = 'draft' AND deleted_at IS NULL
      RETURNING *
    `, [id, organizationId]);

    if (result.rows.length === 0) {
      res.status(400).json({ error: 'Impossible de confirmer ce bon de commande' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Créer un BC à partir d'un devis
router.post('/from-quote/:quoteId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { quoteId } = req.params;
    const organizationId = (req.user as any)?.organizationId;
    const userId = (req.user as any)?.id;

    // Récupérer le devis
    const quoteResult = await db.query(`
      SELECT q.*, c.name as customer_name, c.address as customer_address
      FROM quotes q
      LEFT JOIN customers c ON q.customer_id = c.id
      WHERE q.id = $1 AND q.organization_id = $2 AND q.deleted_at IS NULL
    `, [quoteId, organizationId]);

    if (quoteResult.rows.length === 0) {
      res.status(404).json({ error: 'Devis non trouvé' });
      return;
    }

    const quote = quoteResult.rows[0];

    // Générer le numéro de BC
    const year = new Date().getFullYear();
    const numResult = await db.query(`
      SELECT order_number FROM purchase_orders
      WHERE organization_id = $1 AND order_number LIKE $2
      ORDER BY order_number DESC LIMIT 1
    `, [organizationId, `BC-${year}-%`]);

    let nextNum = 1;
    if (numResult.rows.length > 0) {
      const match = numResult.rows[0].order_number.match(/BC-\d{4}-(\d+)/);
      if (match) nextNum = parseInt(match[1]) + 1;
    }
    const orderNumber = `BC-${year}-${String(nextNum).padStart(5, '0')}`;

    // Créer le BC
    const bcResult = await db.query(`
      INSERT INTO purchase_orders (
        order_number, customer_id, quote_id, order_date,
        billing_address, shipping_address, subtotal, discount_amount,
        tax_rate, tax_amount, total_amount, payment_terms, notes,
        organization_id, created_by, status
      ) VALUES ($1, $2, $3, $4, $5, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'confirmed')
      RETURNING *
    `, [
      orderNumber, quote.customer_id, quoteId, new Date(),
      quote.customer_address, quote.subtotal || 0, quote.discount_amount || 0,
      quote.tax_rate || 20, quote.tax_amount || 0, quote.total_amount || 0,
      quote.payment_terms, `Créé depuis devis ${quote.quote_number}`,
      organizationId, userId
    ]);

    const bcId = bcResult.rows[0].id;

    // Copier les lignes du devis
    const itemsResult = await db.query(`
      SELECT * FROM quote_items WHERE quote_id = $1 ORDER BY sort_order
    `, [quoteId]);

    for (let i = 0; i < itemsResult.rows.length; i++) {
      const item = itemsResult.rows[i];
      await db.query(`
        INSERT INTO purchase_order_items (
          purchase_order_id, product_id, description, quantity, unit,
          unit_price, discount_percent, tax_rate, subtotal, total_price, sort_order
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        bcId, item.product_id, item.description, item.quantity,
        item.unit || 'unité', item.unit_price, item.discount_percent || 0,
        item.tax_rate || 20, item.subtotal || 0, item.total_price || 0, i
      ]);
    }

    // Mettre à jour le statut du devis
    await db.query(`
      UPDATE quotes SET status = 'accepted', updated_at = NOW() WHERE id = $1
    `, [quoteId]);

    res.status(201).json(bcResult.rows[0]);
  } catch (err: any) {
    console.error('Erreur création BC depuis devis:', err);
    res.status(500).json({ error: err.message });
  }
});

// Convertir un BC en facture
router.post('/:id/to-invoice', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = (req.user as any)?.organizationId;
    const userId = (req.user as any)?.id;

    // Récupérer le BC
    const bcResult = await db.query(`
      SELECT * FROM purchase_orders
      WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
    `, [id, organizationId]);

    if (bcResult.rows.length === 0) {
      res.status(404).json({ error: 'Bon de commande non trouvé' });
      return;
    }

    const bc = bcResult.rows[0];

    if (bc.status === 'invoiced') {
      res.status(400).json({ error: 'Ce bon de commande a déjà été facturé' });
      return;
    }

    // Générer le numéro de facture
    const year = new Date().getFullYear();
    const numResult = await db.query(`
      SELECT invoice_number FROM invoices
      WHERE organization_id = $1 AND invoice_number LIKE $2
      ORDER BY invoice_number DESC LIMIT 1
    `, [organizationId, `FA-${year}-%`]);

    let nextNum = 1;
    if (numResult.rows.length > 0) {
      const match = numResult.rows[0].invoice_number.match(/FA-\d{4}-(\d+)/);
      if (match) nextNum = parseInt(match[1]) + 1;
    }
    const invoiceNumber = `FA-${year}-${String(nextNum).padStart(5, '0')}`;

    // Créer la facture
    const invoiceResult = await db.query(`
      INSERT INTO invoices (
        invoice_number, customer_id, invoice_date, due_date,
        billing_address, subtotal, discount_amount, tax_rate,
        tax_amount, total_amount, notes, organization_id, created_by, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'sent')
      RETURNING *
    `, [
      invoiceNumber, bc.customer_id, new Date(),
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 jours
      bc.billing_address, bc.subtotal, bc.discount_amount,
      bc.tax_rate, bc.tax_amount, bc.total_amount,
      `Facture pour BC ${bc.order_number}`, organizationId, userId
    ]);

    const invoiceId = invoiceResult.rows[0].id;

    // Copier les lignes
    const itemsResult = await db.query(`
      SELECT * FROM purchase_order_items WHERE purchase_order_id = $1 ORDER BY sort_order
    `, [id]);

    for (const item of itemsResult.rows) {
      await db.query(`
        INSERT INTO invoice_items (
          invoice_id, product_id, description, quantity, unit,
          unit_price, discount_percent, tax_rate, subtotal, total_price, sort_order
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        invoiceId, item.product_id, item.description, item.quantity,
        item.unit, item.unit_price, item.discount_percent,
        item.tax_rate, item.subtotal, item.total_price, item.sort_order
      ]);
    }

    // Mettre à jour le statut du BC
    await db.query(`
      UPDATE purchase_orders SET status = 'invoiced', updated_at = NOW() WHERE id = $1
    `, [id]);

    res.status(201).json(invoiceResult.rows[0]);
  } catch (err: any) {
    console.error('Erreur conversion BC en facture:', err);
    res.status(500).json({ error: err.message });
  }
});

// Commandes en attente de livraison
router.get('/pending/deliveries', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;

    const result = await db.query(`
      SELECT
        po.id,
        po.order_number,
        po.order_date,
        po.expected_delivery_date,
        po.status,
        c.name as customer_name,
        po.shipping_address,
        po.total_amount,
        (SELECT COUNT(*) FROM purchase_order_items WHERE purchase_order_id = po.id AND quantity_remaining > 0) as pending_items,
        (SELECT SUM(quantity_remaining) FROM purchase_order_items WHERE purchase_order_id = po.id) as total_pending_qty
      FROM purchase_orders po
      LEFT JOIN customers c ON po.customer_id = c.id
      WHERE po.organization_id = $1
        AND po.status IN ('confirmed', 'partial')
        AND po.deleted_at IS NULL
      ORDER BY po.expected_delivery_date NULLS LAST, po.order_date
    `, [organizationId]);

    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Dupliquer un BC
router.post('/:id/duplicate', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = (req.user as any)?.organizationId;
    const userId = (req.user as any)?.id;

    // Récupérer le BC original
    const bcResult = await db.query(`
      SELECT * FROM purchase_orders WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
    `, [id, organizationId]);

    if (bcResult.rows.length === 0) {
      res.status(404).json({ error: 'Bon de commande non trouvé' });
      return;
    }

    const bc = bcResult.rows[0];

    // Générer un nouveau numéro
    const year = new Date().getFullYear();
    const numResult = await db.query(`
      SELECT order_number FROM purchase_orders
      WHERE organization_id = $1 AND order_number LIKE $2
      ORDER BY order_number DESC LIMIT 1
    `, [organizationId, `BC-${year}-%`]);

    let nextNum = 1;
    if (numResult.rows.length > 0) {
      const match = numResult.rows[0].order_number.match(/BC-\d{4}-(\d+)/);
      if (match) nextNum = parseInt(match[1]) + 1;
    }
    const newOrderNumber = `BC-${year}-${String(nextNum).padStart(5, '0')}`;

    // Créer la copie
    const newBcResult = await db.query(`
      INSERT INTO purchase_orders (
        order_number, customer_id, order_date, expected_delivery_date,
        billing_address, shipping_address, subtotal, discount_amount,
        shipping_cost, tax_rate, tax_amount, total_amount, payment_terms,
        notes, internal_notes, template_id, organization_id, created_by, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, 'draft')
      RETURNING *
    `, [
      newOrderNumber, bc.customer_id, new Date(), bc.expected_delivery_date,
      bc.billing_address, bc.shipping_address, bc.subtotal, bc.discount_amount,
      bc.shipping_cost, bc.tax_rate, bc.tax_amount, bc.total_amount,
      bc.payment_terms, bc.notes, bc.internal_notes, bc.template_id,
      organizationId, userId
    ]);

    const newBcId = newBcResult.rows[0].id;

    // Copier les lignes
    await db.query(`
      INSERT INTO purchase_order_items (
        purchase_order_id, product_id, description, quantity, unit,
        unit_price, discount_percent, discount_amount, tax_rate,
        subtotal, total_price, sort_order
      )
      SELECT
        $1, product_id, description, quantity, unit,
        unit_price, discount_percent, discount_amount, tax_rate,
        subtotal, total_price, sort_order
      FROM purchase_order_items
      WHERE purchase_order_id = $2
    `, [newBcId, id]);

    res.status(201).json(newBcResult.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
