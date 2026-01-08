import express, { Router, Request, Response } from 'express';
import { pool } from '../database/db';
import { AuthRequest, authenticateToken } from '../middleware/auth';

const router = Router();

// Types
interface Permission {
  id: string;
  module: string;
  action: string;
  description: string;
  created_at: string;
}

interface RolePermission {
  role_id: string;
  permission_id: string;
  created_at: string;
}

/**
 * GET /api/permissions
 * Récupérer toutes les permissions disponibles
 */
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    // Check if permissions table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'permissions'
      )
    `);

    if (!tableCheck.rows[0].exists) {
      // Return default permissions if table doesn't exist
      return res.json({
        success: true,
        permissions: [
          { id: 1, module: 'contacts', action: 'read', description: 'Voir les contacts' },
          { id: 2, module: 'contacts', action: 'write', description: 'Modifier les contacts' },
          { id: 3, module: 'invoices', action: 'read', description: 'Voir les factures' },
          { id: 4, module: 'invoices', action: 'write', description: 'Créer/modifier les factures' },
          { id: 5, module: 'quotes', action: 'read', description: 'Voir les devis' },
          { id: 6, module: 'quotes', action: 'write', description: 'Créer/modifier les devis' },
          { id: 7, module: 'products', action: 'read', description: 'Voir les produits' },
          { id: 8, module: 'products', action: 'write', description: 'Modifier les produits' },
          { id: 9, module: 'reports', action: 'read', description: 'Voir les rapports' },
          { id: 10, module: 'settings', action: 'admin', description: 'Administrer les paramètres' }
        ],
        total: 10,
      });
    }

    const result = await pool.query(
      `SELECT id, resource as module, action,
              resource || ' - ' || action as description, created_at
       FROM permissions
       ORDER BY resource, action`
    );

    res.json({
      success: true,
      permissions: result.rows,
      total: result.rows.length,
    });
  } catch (error: any) {
    console.error('Erreur lors de la récupération des permissions:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des permissions',
    });
  }
});

/**
 * GET /api/permissions/roles
 * Récupérer tous les rôles
 */
router.get('/roles', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    // Check if roles table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'roles'
      )
    `);

    if (!tableCheck.rows[0].exists) {
      // Return default roles if table doesn't exist
      return res.json({
        success: true,
        roles: [
          { id: 1, name: 'admin', description: 'Administrateur avec tous les droits', permissions_count: 10 },
          { id: 2, name: 'manager', description: 'Manager avec droits de gestion', permissions_count: 7 },
          { id: 3, name: 'user', description: 'Utilisateur standard', permissions_count: 4 },
          { id: 4, name: 'viewer', description: 'Accès en lecture seule', permissions_count: 2 }
        ],
        total: 4,
      });
    }

    const result = await pool.query(`
      SELECT r.id, r.name, r.description, r.created_at,
             COUNT(rp.permission_id) as permissions_count
      FROM roles r
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      GROUP BY r.id, r.name, r.description, r.created_at
      ORDER BY r.name
    `);

    res.json({
      success: true,
      roles: result.rows,
      total: result.rows.length,
    });
  } catch (error: any) {
    console.error('Erreur lors de la récupération des rôles:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des rôles',
    });
  }
});

/**
 * POST /api/permissions
 * Créer une nouvelle permission
 */
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { module, action, description } = req.body;

    if (!module || !action) {
      return res.status(400).json({
        error: 'module et action sont requis',
      });
    }

    const result = await pool.query(
      `INSERT INTO permissions (module, action, description)
       VALUES ($1, $2, $3)
       RETURNING id, module, action, description, created_at`,
      [module, action, description || null]
    );

    res.status(201).json({
      success: true,
      permission: result.rows[0],
    });
  } catch (error: any) {
    console.error('Erreur lors de la création de la permission:', error);
    res.status(500).json({
      error: 'Erreur lors de la création de la permission',
    });
  }
});

/**
 * GET /api/permissions/by-role/:roleId
 * Récupérer les permissions d'un rôle
 */
router.get('/by-role/:roleId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { roleId } = req.params;

    const result = await pool.query(
      `SELECT p.id, p.resource as module, p.action, p.resource || ' - ' || p.action as description
       FROM permissions p
       INNER JOIN role_permissions rp ON p.id = rp.permission_id
       WHERE rp.role_id = $1
       ORDER BY p.resource, p.action`,
      [roleId]
    );

    res.json({
      success: true,
      permissions: result.rows,
      total: result.rows.length,
    });
  } catch (error: any) {
    console.error('Erreur lors de la récupération des permissions du rôle:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des permissions du rôle',
    });
  }
});

/**
 * POST /api/permissions/assign-role
 * Assigner une permission à un rôle
 */
router.post('/assign-role', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { roleId, permissionId } = req.body;

    if (!roleId || !permissionId) {
      return res.status(400).json({
        error: 'roleId et permissionId sont requis',
      });
    }

    // Vérifier si la permission existe
    const permCheck = await pool.query(
      'SELECT id FROM permissions WHERE id = $1',
      [permissionId]
    );
    if (permCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Permission non trouvée' });
    }

    // Vérifier si la permission est déjà assignée
    const existingCheck = await pool.query(
      'SELECT id FROM role_permissions WHERE role_id = $1 AND permission_id = $2',
      [roleId, permissionId]
    );
    if (existingCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Permission déjà assignée à ce rôle' });
    }

    await pool.query(
      `INSERT INTO role_permissions (role_id, permission_id)
       VALUES ($1, $2)`,
      [roleId, permissionId]
    );

    res.json({ success: true, message: 'Permission assignée au rôle' });
  } catch (error: any) {
    console.error('Erreur lors de l\'assignation de la permission:', error);
    res.status(500).json({
      error: 'Erreur lors de l\'assignation de la permission',
    });
  }
});

/**
 * DELETE /api/permissions/revoke-role/:roleId/:permissionId
 * Retirer une permission d'un rôle
 */
router.delete('/revoke-role/:roleId/:permissionId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { roleId, permissionId } = req.params;

    await pool.query(
      'DELETE FROM role_permissions WHERE role_id = $1 AND permission_id = $2',
      [roleId, permissionId]
    );

    res.json({ success: true, message: 'Permission retirée du rôle' });
  } catch (error: any) {
    console.error('Erreur lors du retrait de la permission:', error);
    res.status(500).json({
      error: 'Erreur lors du retrait de la permission',
    });
  }
});

/**
 * POST /api/permissions/check
 * Vérifier si l'utilisateur a une permission
 */
router.post('/check', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { module, action } = req.body;
    const userId = req.user!.id;

    if (!module || !action) {
      return res.status(400).json({
        error: 'module et action sont requis',
      });
    }

    const result = await pool.query(
      `SELECT COUNT(*) as count FROM permissions p
       INNER JOIN role_permissions rp ON p.id = rp.permission_id
       INNER JOIN roles r ON rp.role_id = r.id
       INNER JOIN users u ON u.role_id = r.id
       WHERE u.id = $1 AND p.resource = $2 AND p.action = $3`,
      [userId, module, action]
    );

    const hasPermission = parseInt(result.rows[0].count) > 0;

    res.json({
      success: true,
      hasPermission,
      module,
      action,
    });
  } catch (error: any) {
    console.error('Erreur lors de la vérification de la permission:', error);
    res.status(500).json({
      error: 'Erreur lors de la vérification de la permission',
    });
  }
});

/**
 * GET /api/permissions/user/:userId
 * Récupérer toutes les permissions d'un utilisateur
 */
router.get('/user/:userId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;

    const result = await pool.query(
      `SELECT DISTINCT p.resource as module, p.action, p.resource || ' - ' || p.action as description
       FROM permissions p
       INNER JOIN role_permissions rp ON p.id = rp.permission_id
       INNER JOIN users u ON u.role_id = rp.role_id
       WHERE u.id = $1
       ORDER BY p.resource, p.action`,
      [userId]
    );

    const grouped = result.rows.reduce((acc: any, perm: any) => {
      if (!acc[perm.module]) {
        acc[perm.module] = [];
      }
      acc[perm.module].push({ action: perm.action, description: perm.description });
      return acc;
    }, {});

    res.json({
      success: true,
      permissions: grouped,
      total: result.rows.length,
    });
  } catch (error: any) {
    console.error('Erreur lors de la récupération des permissions utilisateur:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des permissions utilisateur',
    });
  }
});

/**
 * POST /api/permissions/territory
 * Assigner un territoire à un utilisateur (contrôle d'accès territorial)
 */
router.post('/territory', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { userId, territory } = req.body;

    if (!userId || !territory) {
      return res.status(400).json({
        error: 'userId et territory sont requis',
      });
    }

    await pool.query(
      `UPDATE users SET territory = $1 WHERE id = $2`,
      [territory, userId]
    );

    res.json({ success: true, message: 'Territoire assigné à l\'utilisateur' });
  } catch (error: any) {
    console.error('Erreur lors de l\'assignation du territoire:', error);
    res.status(500).json({
      error: 'Erreur lors de l\'assignation du territoire',
    });
  }
});

/**
 * POST /api/permissions/field-access
 * Contrôler l'accès à un champ spécifique par rôle
 */
router.post('/field-access', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { roleId, module, field, access } = req.body;

    if (!roleId || !module || !field || !access) {
      return res.status(400).json({
        error: 'roleId, module, field et access sont requis',
      });
    }

    // Créer table field_access si nécessaire
    await pool.query(
      `INSERT INTO field_access (role_id, module, field, access_level, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (role_id, module, field) 
       DO UPDATE SET access_level = $4`,
      [roleId, module, field, access]
    );

    res.json({ 
      success: true, 
      message: 'Accès aux champs configuré',
      config: { roleId, module, field, access }
    });
  } catch (error: any) {
    console.error('Erreur lors de la configuration de l\'accès aux champs:', error);
    res.status(500).json({
      error: 'Erreur lors de la configuration de l\'accès aux champs',
    });
  }
});

export default router;
