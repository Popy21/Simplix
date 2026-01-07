import express, { Response } from 'express';
import { pool as db } from '../database/db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

// ==========================================
// CATÉGORIES CLIENTS
// ==========================================

// Liste des catégories clients
router.get('/customers', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;

    const result = await db.query(`
      SELECT
        cc.*,
        COUNT(c.id) as customer_count
      FROM customer_categories cc
      LEFT JOIN customers c ON c.category_id = cc.id AND c.deleted_at IS NULL
      WHERE cc.organization_id = $1
      GROUP BY cc.id
      ORDER BY cc.name
    `, [organizationId]);

    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Créer une catégorie client
router.post('/customers', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;
    const { name, description, color, discount_percent, payment_terms_days } = req.body;

    const result = await db.query(`
      INSERT INTO customer_categories (organization_id, name, description, color, discount_percent, payment_terms_days)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [organizationId, name, description, color || '#3B82F6', discount_percent || 0, payment_terms_days || 30]);

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') {
      res.status(400).json({ error: 'Une catégorie avec ce nom existe déjà' });
      return;
    }
    res.status(500).json({ error: err.message });
  }
});

// Modifier une catégorie client
router.put('/customers/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = (req.user as any)?.organizationId;
    const { name, description, color, discount_percent, payment_terms_days } = req.body;

    const result = await db.query(`
      UPDATE customer_categories
      SET name = $3, description = $4, color = $5, discount_percent = $6, payment_terms_days = $7, updated_at = NOW()
      WHERE id = $1 AND organization_id = $2
      RETURNING *
    `, [id, organizationId, name, description, color, discount_percent, payment_terms_days]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Catégorie non trouvée' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Supprimer une catégorie client
router.delete('/customers/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = (req.user as any)?.organizationId;

    // Retirer la catégorie des clients associés
    await db.query(`
      UPDATE customers SET category_id = NULL WHERE category_id = $1
    `, [id]);

    const result = await db.query(`
      DELETE FROM customer_categories WHERE id = $1 AND organization_id = $2 RETURNING id
    `, [id, organizationId]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Catégorie non trouvée' });
      return;
    }

    res.json({ message: 'Catégorie supprimée' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// CATÉGORIES PRODUITS
// ==========================================

// Liste des catégories produits (arborescence)
router.get('/products', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;

    const result = await db.query(`
      SELECT
        pc.*,
        parent.name as parent_name,
        COUNT(p.id) as product_count
      FROM product_categories pc
      LEFT JOIN product_categories parent ON pc.parent_id = parent.id
      LEFT JOIN products p ON p.category_id = pc.id AND p.deleted_at IS NULL
      WHERE pc.organization_id = $1
      GROUP BY pc.id, parent.name
      ORDER BY pc.parent_id NULLS FIRST, pc.display_order, pc.name
    `, [organizationId]);

    // Construire l'arborescence
    const categories = result.rows;
    const rootCategories = categories.filter(c => !c.parent_id);
    const childCategories = categories.filter(c => c.parent_id);

    const buildTree = (parent: any): any => {
      const children = childCategories.filter(c => c.parent_id === parent.id);
      return {
        ...parent,
        children: children.map(buildTree)
      };
    };

    const tree = rootCategories.map(buildTree);

    res.json({
      flat: categories,
      tree
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Créer une catégorie produit
router.post('/products', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;
    const { name, description, color, image_url, parent_id, display_order } = req.body;

    const result = await db.query(`
      INSERT INTO product_categories (organization_id, name, description, color, image_url, parent_id, display_order)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [organizationId, name, description, color || '#10B981', image_url, parent_id, display_order || 0]);

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') {
      res.status(400).json({ error: 'Une catégorie avec ce nom existe déjà à ce niveau' });
      return;
    }
    res.status(500).json({ error: err.message });
  }
});

// Modifier une catégorie produit
router.put('/products/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = (req.user as any)?.organizationId;
    const { name, description, color, image_url, parent_id, display_order, is_active } = req.body;

    const result = await db.query(`
      UPDATE product_categories
      SET name = $3, description = $4, color = $5, image_url = $6, parent_id = $7,
          display_order = $8, is_active = $9, updated_at = NOW()
      WHERE id = $1 AND organization_id = $2
      RETURNING *
    `, [id, organizationId, name, description, color, image_url, parent_id, display_order, is_active]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Catégorie non trouvée' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Supprimer une catégorie produit
router.delete('/products/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = (req.user as any)?.organizationId;

    // Vérifier s'il y a des sous-catégories
    const childCheck = await db.query(`
      SELECT COUNT(*) FROM product_categories WHERE parent_id = $1
    `, [id]);

    if (parseInt(childCheck.rows[0].count) > 0) {
      res.status(400).json({ error: 'Impossible de supprimer une catégorie qui contient des sous-catégories' });
      return;
    }

    // Retirer la catégorie des produits associés
    await db.query(`
      UPDATE products SET category_id = NULL WHERE category_id = $1
    `, [id]);

    const result = await db.query(`
      DELETE FROM product_categories WHERE id = $1 AND organization_id = $2 RETURNING id
    `, [id, organizationId]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Catégorie non trouvée' });
      return;
    }

    res.json({ message: 'Catégorie supprimée' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// UNITÉS
// ==========================================

// Liste des unités
router.get('/units', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;

    const result = await db.query(`
      SELECT * FROM units
      WHERE organization_id = $1 OR organization_id IS NULL
      ORDER BY is_system DESC, name
    `, [organizationId]);

    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Créer une unité personnalisée
router.post('/units', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;
    const { code, name, symbol } = req.body;

    const result = await db.query(`
      INSERT INTO units (organization_id, code, name, symbol, is_system)
      VALUES ($1, $2, $3, $4, false)
      RETURNING *
    `, [organizationId, code, name, symbol]);

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Supprimer une unité personnalisée
router.delete('/units/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = (req.user as any)?.organizationId;

    const result = await db.query(`
      DELETE FROM units
      WHERE id = $1 AND organization_id = $2 AND is_system = false
      RETURNING id
    `, [id, organizationId]);

    if (result.rows.length === 0) {
      res.status(400).json({ error: 'Unité non trouvée ou unité système non supprimable' });
      return;
    }

    res.json({ message: 'Unité supprimée' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
