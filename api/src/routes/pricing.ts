import express, { Response } from 'express';
import { pool as db } from '../database/db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

// ==========================================
// GRILLES TARIFAIRES
// ==========================================

// GET /lists - Alias pour /price-lists
router.get('/lists', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;

    const result = await db.query(`
      SELECT
        pl.*,
        COUNT(DISTINCT pli.product_id) as products_count,
        COUNT(DISTINCT c.id) as customers_count
      FROM price_lists pl
      LEFT JOIN price_list_items pli ON pl.id = pli.price_list_id
      LEFT JOIN customers c ON c.price_list_id = pl.id AND c.deleted_at IS NULL
      WHERE pl.organization_id = $1
      GROUP BY pl.id
      ORDER BY pl.name
    `, [organizationId]);

    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Liste des grilles tarifaires
router.get('/price-lists', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;

    const result = await db.query(`
      SELECT
        pl.*,
        COUNT(DISTINCT pli.product_id) as products_count,
        COUNT(DISTINCT c.id) as customers_count
      FROM price_lists pl
      LEFT JOIN price_list_items pli ON pl.id = pli.price_list_id
      LEFT JOIN customers c ON c.price_list_id = pl.id AND c.deleted_at IS NULL
      WHERE pl.organization_id = $1
      GROUP BY pl.id
      ORDER BY pl.name
    `, [organizationId]);

    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Détail d'une grille tarifaire
router.get('/price-lists/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = (req.user as any)?.organizationId;

    const listResult = await db.query(`
      SELECT * FROM price_lists WHERE id = $1 AND organization_id = $2
    `, [id, organizationId]);

    if (listResult.rows.length === 0) {
      res.status(404).json({ error: 'Grille tarifaire non trouvée' });
      return;
    }

    const itemsResult = await db.query(`
      SELECT
        pli.*,
        p.name as product_name,
        p.reference as product_reference,
        p.price as standard_price
      FROM price_list_items pli
      JOIN products p ON pli.product_id = p.id
      WHERE pli.price_list_id = $1
      ORDER BY p.name, pli.min_quantity
    `, [id]);

    res.json({
      ...listResult.rows[0],
      items: itemsResult.rows
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Créer une grille tarifaire
router.post('/price-lists', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;
    const { name, description, currency, is_default, valid_from, valid_until } = req.body;

    // Si c'est la grille par défaut, enlever le flag des autres
    if (is_default) {
      await db.query(`
        UPDATE price_lists SET is_default = false WHERE organization_id = $1
      `, [organizationId]);
    }

    const result = await db.query(`
      INSERT INTO price_lists (organization_id, name, description, currency, is_default, valid_from, valid_until)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [organizationId, name, description, currency || 'EUR', is_default || false, valid_from, valid_until]);

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Modifier une grille tarifaire
router.put('/price-lists/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = (req.user as any)?.organizationId;
    const { name, description, currency, is_default, valid_from, valid_until, is_active } = req.body;

    if (is_default) {
      await db.query(`
        UPDATE price_lists SET is_default = false WHERE organization_id = $1
      `, [organizationId]);
    }

    const result = await db.query(`
      UPDATE price_lists
      SET name = $3, description = $4, currency = $5, is_default = $6, valid_from = $7, valid_until = $8, is_active = $9, updated_at = NOW()
      WHERE id = $1 AND organization_id = $2
      RETURNING *
    `, [id, organizationId, name, description, currency, is_default, valid_from, valid_until, is_active]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Grille tarifaire non trouvée' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Supprimer une grille tarifaire
router.delete('/price-lists/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = (req.user as any)?.organizationId;

    // Retirer la grille des clients associés
    await db.query(`
      UPDATE customers SET price_list_id = NULL WHERE price_list_id = $1
    `, [id]);

    const result = await db.query(`
      DELETE FROM price_lists WHERE id = $1 AND organization_id = $2 RETURNING id
    `, [id, organizationId]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Grille tarifaire non trouvée' });
      return;
    }

    res.json({ message: 'Grille tarifaire supprimée' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Ajouter/modifier un prix dans une grille
router.post('/price-lists/:id/items', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { product_id, price, min_quantity, discount_percent } = req.body;

    const result = await db.query(`
      INSERT INTO price_list_items (price_list_id, product_id, price, min_quantity, discount_percent)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (price_list_id, product_id, min_quantity)
      DO UPDATE SET price = $3, discount_percent = $5
      RETURNING *
    `, [id, product_id, price, min_quantity || 1, discount_percent || 0]);

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Supprimer un prix d'une grille
router.delete('/price-lists/:listId/items/:itemId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { listId, itemId } = req.params;

    await db.query(`
      DELETE FROM price_list_items WHERE id = $1 AND price_list_id = $2
    `, [itemId, listId]);

    res.json({ message: 'Prix supprimé' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Import en masse des prix
router.post('/price-lists/:id/import', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { items } = req.body; // [{ product_id, price, min_quantity? }]

    const client = await db.connect();
    try {
      await client.query('BEGIN');

      for (const item of items) {
        await client.query(`
          INSERT INTO price_list_items (price_list_id, product_id, price, min_quantity)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (price_list_id, product_id, min_quantity)
          DO UPDATE SET price = $3
        `, [id, item.product_id, item.price, item.min_quantity || 1]);
      }

      await client.query('COMMIT');
      res.json({ message: `${items.length} prix importés` });
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

// ==========================================
// PRIX SPÉCIFIQUES PAR CLIENT
// ==========================================

// Liste des prix spécifiques d'un client
router.get('/customers/:customerId/prices', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { customerId } = req.params;

    const result = await db.query(`
      SELECT
        cp.*,
        p.name as product_name,
        p.reference as product_reference,
        p.price as standard_price
      FROM customer_prices cp
      JOIN products p ON cp.product_id = p.id
      WHERE cp.customer_id = $1
      ORDER BY p.name, cp.min_quantity
    `, [customerId]);

    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Ajouter/modifier un prix spécifique client
router.post('/customers/:customerId/prices', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { customerId } = req.params;
    const { product_id, price, min_quantity, valid_from, valid_until } = req.body;

    const result = await db.query(`
      INSERT INTO customer_prices (customer_id, product_id, price, min_quantity, valid_from, valid_until)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (customer_id, product_id, min_quantity)
      DO UPDATE SET price = $3, valid_from = $5, valid_until = $6
      RETURNING *
    `, [customerId, product_id, price, min_quantity || 1, valid_from, valid_until]);

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Supprimer un prix spécifique client
router.delete('/customers/:customerId/prices/:priceId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { customerId, priceId } = req.params;

    await db.query(`
      DELETE FROM customer_prices WHERE id = $1 AND customer_id = $2
    `, [priceId, customerId]);

    res.json({ message: 'Prix supprimé' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// CALCUL DE PRIX
// ==========================================

// Obtenir le prix effectif d'un produit pour un client
router.get('/calculate', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { customer_id, product_id, quantity } = req.query;

    // Prix spécifique client
    let priceResult = await db.query(`
      SELECT price, 'customer_price' as source
      FROM customer_prices
      WHERE customer_id = $1 AND product_id = $2 AND min_quantity <= $3
      AND (valid_from IS NULL OR valid_from <= CURRENT_DATE)
      AND (valid_until IS NULL OR valid_until >= CURRENT_DATE)
      ORDER BY min_quantity DESC
      LIMIT 1
    `, [customer_id, product_id, quantity || 1]);

    if (priceResult.rows.length === 0) {
      // Grille tarifaire du client
      priceResult = await db.query(`
        SELECT pli.price, 'price_list' as source
        FROM customers c
        JOIN price_lists pl ON c.price_list_id = pl.id
        JOIN price_list_items pli ON pl.id = pli.price_list_id
        WHERE c.id = $1 AND pli.product_id = $2 AND pli.min_quantity <= $3
        AND pl.is_active = true
        AND (pl.valid_from IS NULL OR pl.valid_from <= CURRENT_DATE)
        AND (pl.valid_until IS NULL OR pl.valid_until >= CURRENT_DATE)
        ORDER BY pli.min_quantity DESC
        LIMIT 1
      `, [customer_id, product_id, quantity || 1]);
    }

    if (priceResult.rows.length === 0) {
      // Prix standard du produit
      priceResult = await db.query(`
        SELECT price, 'standard' as source FROM products WHERE id = $1
      `, [product_id]);
    }

    if (priceResult.rows.length === 0) {
      res.status(404).json({ error: 'Produit non trouvé' });
      return;
    }

    res.json({
      product_id,
      customer_id,
      quantity: quantity || 1,
      unit_price: priceResult.rows[0].price,
      price_source: priceResult.rows[0].source
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
