import express, { Response } from 'express';
import { pool as db } from '../database/db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

// ==========================================
// GESTION DES STOCKS
// ==========================================

// Alertes stock
router.get('/alerts', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;

    const result = await db.query(`
      SELECT
        p.id,
        p.name,
        p.sku,
        p.stock_quantity,
        p.stock_min_alert,
        p.stock_location,
        CASE
          WHEN p.stock_quantity <= 0 THEN 'out_of_stock'
          WHEN p.stock_quantity <= p.stock_min_alert THEN 'low_stock'
          ELSE 'ok'
        END as stock_status
      FROM products p
      WHERE p.organization_id = $1
        AND p.track_stock = true
        AND p.deleted_at IS NULL
        AND p.stock_quantity <= p.stock_min_alert
      ORDER BY p.stock_quantity ASC
    `, [organizationId]);

    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Valorisation du stock
router.get('/valuation', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;

    const result = await db.query(`
      SELECT
        COUNT(*) as total_products,
        SUM(p.stock_quantity) as total_quantity,
        SUM(p.stock_quantity * p.price) as total_value_selling,
        SUM(p.stock_quantity * COALESCE(p.cost_price, p.price * 0.7)) as total_value_cost
      FROM products p
      WHERE p.organization_id = $1
        AND p.track_stock = true
        AND p.deleted_at IS NULL
    `, [organizationId]);

    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Liste des mouvements de stock
router.get('/movements', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;
    const { product_id, movement_type, page = 1, limit = 50 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = `
      SELECT
        sm.*,
        p.name as product_name,
        p.sku as product_sku,
        u.first_name || ' ' || u.last_name as created_by_name
      FROM stock_movements sm
      LEFT JOIN products p ON sm.product_id = p.id
      LEFT JOIN users u ON sm.created_by = u.id
      WHERE sm.organization_id = $1
    `;
    const params: any[] = [organizationId];

    if (product_id) {
      params.push(product_id);
      query += ` AND sm.product_id = $${params.length}`;
    }

    if (movement_type) {
      params.push(movement_type);
      query += ` AND sm.movement_type = $${params.length}`;
    }

    query += ` ORDER BY sm.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(Number(limit), offset);

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Créer un mouvement de stock
router.post('/movements', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;
    const userId = (req.user as any)?.id;
    const {
      product_id,
      movement_type,
      quantity,
      reason,
      notes,
      lot_number,
      serial_number,
      unit_cost,
      location_from,
      location_to,
      reference_type,
      reference_id
    } = req.body;

    // Vérifier que le produit existe et a le suivi de stock activé
    const productResult = await db.query(
      'SELECT id, stock_quantity, track_stock FROM products WHERE id = $1 AND organization_id = $2',
      [product_id, organizationId]
    );

    if (productResult.rows.length === 0) {
      res.status(404).json({ error: 'Produit non trouvé' });
      return;
    }

    const product = productResult.rows[0];
    if (!product.track_stock) {
      res.status(400).json({ error: 'Le suivi de stock n\'est pas activé pour ce produit' });
      return;
    }

    // Ajuster la quantité selon le type de mouvement
    let adjustedQuantity = quantity;
    if (['out', 'transfer'].includes(movement_type) && quantity > 0) {
      adjustedQuantity = -quantity;
    }

    const result = await db.query(`
      INSERT INTO stock_movements (
        product_id, organization_id, movement_type, quantity,
        reason, notes, lot_number, serial_number, unit_cost,
        total_cost, location_from, location_to, reference_type,
        reference_id, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `, [
      product_id, organizationId, movement_type, adjustedQuantity,
      reason, notes, lot_number, serial_number, unit_cost,
      unit_cost ? unit_cost * Math.abs(adjustedQuantity) : null,
      location_from, location_to, reference_type, reference_id, userId
    ]);

    // Récupérer le produit mis à jour
    const updatedProduct = await db.query(
      'SELECT id, name, stock_quantity FROM products WHERE id = $1',
      [product_id]
    );

    res.status(201).json({
      movement: result.rows[0],
      product: updatedProduct.rows[0],
      message: 'Mouvement de stock enregistré'
    });
  } catch (err: any) {
    console.error('Erreur mouvement stock:', err);
    res.status(500).json({ error: err.message });
  }
});

// Ajustement de stock (inventaire)
router.post('/adjustment', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;
    const userId = (req.user as any)?.id;
    const { product_id, new_quantity, reason } = req.body;

    const productResult = await db.query(
      'SELECT id, stock_quantity, track_stock FROM products WHERE id = $1 AND organization_id = $2',
      [product_id, organizationId]
    );

    if (productResult.rows.length === 0) {
      res.status(404).json({ error: 'Produit non trouvé' });
      return;
    }

    const product = productResult.rows[0];
    const difference = new_quantity - product.stock_quantity;

    if (difference === 0) {
      res.json({ message: 'Aucun ajustement nécessaire', difference: 0 });
      return;
    }

    const result = await db.query(`
      INSERT INTO stock_movements (
        product_id, organization_id, movement_type, quantity,
        reason, reference_type, created_by
      ) VALUES ($1, $2, 'adjustment', $3, $4, 'inventory', $5)
      RETURNING *
    `, [product_id, organizationId, difference, reason || 'Ajustement inventaire', userId]);

    res.json({
      movement: result.rows[0],
      old_quantity: product.stock_quantity,
      new_quantity,
      difference,
      message: 'Ajustement de stock effectué'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Sessions d'inventaire
router.get('/inventory', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;

    const result = await db.query(`
      SELECT
        inv.*,
        u.first_name || ' ' || u.last_name as created_by_name
      FROM inventory_sessions inv
      LEFT JOIN users u ON inv.created_by = u.id
      WHERE inv.organization_id = $1
      ORDER BY inv.created_at DESC
    `, [organizationId]);

    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Créer une session d'inventaire
router.post('/inventory', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;
    const userId = (req.user as any)?.id;
    const { name, description } = req.body;

    // Compter les produits à inventorier
    const countResult = await db.query(
      'SELECT COUNT(*) FROM products WHERE organization_id = $1 AND track_stock = true AND deleted_at IS NULL',
      [organizationId]
    );

    const result = await db.query(`
      INSERT INTO inventory_sessions (
        organization_id, name, description, total_products, created_by
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [organizationId, name, description, countResult.rows[0].count, userId]);

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Enregistrer un comptage d'inventaire
router.post('/inventory/:sessionId/count', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { sessionId } = req.params;
    const userId = (req.user as any)?.id;
    const { product_id, counted_quantity, notes } = req.body;

    // Récupérer la quantité attendue
    const productResult = await db.query(
      'SELECT stock_quantity FROM products WHERE id = $1',
      [product_id]
    );

    if (productResult.rows.length === 0) {
      res.status(404).json({ error: 'Produit non trouvé' });
      return;
    }

    const result = await db.query(`
      INSERT INTO inventory_counts (
        inventory_session_id, product_id, expected_quantity,
        counted_quantity, notes, counted_by
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (inventory_session_id, product_id)
      DO UPDATE SET
        counted_quantity = $4,
        notes = $5,
        counted_by = $6,
        counted_at = NOW()
      RETURNING *
    `, [sessionId, product_id, productResult.rows[0].stock_quantity, counted_quantity, notes, userId]);

    // Mettre à jour les statistiques de la session
    await db.query(`
      UPDATE inventory_sessions SET
        products_counted = (SELECT COUNT(*) FROM inventory_counts WHERE inventory_session_id = $1),
        discrepancies_found = (SELECT COUNT(*) FROM inventory_counts WHERE inventory_session_id = $1 AND difference != 0)
      WHERE id = $1
    `, [sessionId]);

    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Valider l'inventaire et appliquer les ajustements
router.post('/inventory/:sessionId/validate', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { sessionId } = req.params;
    const organizationId = (req.user as any)?.organizationId;
    const userId = (req.user as any)?.id;

    // Récupérer les écarts
    const countsResult = await db.query(`
      SELECT ic.*, p.name as product_name
      FROM inventory_counts ic
      LEFT JOIN products p ON ic.product_id = p.id
      WHERE ic.inventory_session_id = $1 AND ic.difference != 0
    `, [sessionId]);

    // Appliquer les ajustements
    for (const count of countsResult.rows) {
      await db.query(`
        INSERT INTO stock_movements (
          product_id, organization_id, movement_type, quantity,
          reason, reference_type, reference_id, created_by
        ) VALUES ($1, $2, 'adjustment', $3, $4, 'inventory', $5, $6)
      `, [
        count.product_id,
        organizationId,
        count.difference,
        `Régularisation inventaire session #${sessionId}`,
        sessionId,
        userId
      ]);
    }

    // Marquer la session comme terminée
    await db.query(`
      UPDATE inventory_sessions SET
        status = 'completed',
        completed_at = NOW(),
        total_value_adjustment = COALESCE((
          SELECT SUM(ABS(ic.difference) * p.price)
          FROM inventory_counts ic
          LEFT JOIN products p ON ic.product_id = p.id
          WHERE ic.inventory_session_id = $1
        ), 0)
      WHERE id = $1
    `, [sessionId]);

    res.json({
      message: 'Inventaire validé',
      adjustments_count: countsResult.rows.length
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
