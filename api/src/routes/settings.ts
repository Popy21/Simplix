import express, { Request, Response } from 'express';
import { pool as db } from '../database/db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

/**
 * @swagger
 * /api/settings/organization:
 *   get:
 *     summary: Récupérer les paramètres de l'organisation
 *     tags: [⚙️ Configuration]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Paramètres de l'organisation
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 organization:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     name:
 *                       type: string
 *                     domain:
 *                       type: string
 *                     settings:
 *                       type: object
 *                       properties:
 *                         currency:
 *                           type: string
 *                           default: EUR
 *                         language:
 *                           type: string
 *                           default: fr
 *                         timezone:
 *                           type: string
 *                           default: Europe/Paris
 *                         dateFormat:
 *                           type: string
 *                           default: DD/MM/YYYY
 *                         fiscalYearStart:
 *                           type: string
 *                           default: "01-01"
 *                     billing:
 *                       type: object
 *                       properties:
 *                         plan:
 *                           type: string
 *                           enum: [free, starter, pro, enterprise]
 *                         seats:
 *                           type: integer
 *                         billingCycle:
 *                           type: string
 *                           enum: [monthly, yearly]
 *             example:
 *               organization:
 *                 id: "00000000-0000-0000-0000-000000000001"
 *                 name: "Simplix Corp"
 *                 domain: "simplix.com"
 *                 settings:
 *                   currency: "EUR"
 *                   language: "fr"
 *                   timezone: "Europe/Paris"
 *                   dateFormat: "DD/MM/YYYY"
 *                   fiscalYearStart: "01-01"
 *                 billing:
 *                   plan: "pro"
 *                   seats: 25
 *                   billingCycle: "yearly"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/organization', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const result = await db.query(
      `SELECT id, name, domain, settings, created_at, updated_at
       FROM organizations
       WHERE id = $1`,
      [req.user?.organization_id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Organization not found' });
      return;
    }

    const org = result.rows[0];

    // Default settings if not set
    const defaultSettings = {
      currency: 'EUR',
      language: 'fr',
      timezone: 'Europe/Paris',
      dateFormat: 'DD/MM/YYYY',
      fiscalYearStart: '01-01'
    };

    res.json({
      organization: {
        ...org,
        settings: { ...defaultSettings, ...(org.settings || {}) }
      }
    });
  } catch (error) {
    console.error('Error fetching organization settings:', error);
    res.status(500).json({ error: 'Failed to fetch organization settings' });
  }
});

/**
 * @swagger
 * /api/settings/organization:
 *   put:
 *     summary: Mettre à jour les paramètres de l'organisation
 *     tags: [⚙️ Configuration]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Nom de l'organisation
 *               domain:
 *                 type: string
 *                 description: Domaine de l'organisation
 *               settings:
 *                 type: object
 *                 properties:
 *                   currency:
 *                     type: string
 *                   language:
 *                     type: string
 *                   timezone:
 *                     type: string
 *                   dateFormat:
 *                     type: string
 *                   fiscalYearStart:
 *                     type: string
 *           example:
 *             name: "Ma Société"
 *             settings:
 *               currency: "USD"
 *               language: "en"
 *               timezone: "America/New_York"
 *     responses:
 *       200:
 *         description: Paramètres mis à jour
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 organization:
 *                   type: object
 *       403:
 *         description: Permissions insuffisantes (admin requis)
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.put('/organization', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { name, domain, settings } = req.body;

    // Check if user is admin
    const roleCheck = await db.query(
      `SELECT r.type FROM users u
       JOIN user_roles ur ON u.id = ur.user_id
       JOIN roles r ON ur.role_id = r.id
       WHERE u.id = $1 AND r.type = 'admin'`,
      [req.user?.id]
    );

    if (roleCheck.rows.length === 0) {
      res.status(403).json({ error: 'Admin privileges required' });
      return;
    }

    // Build update query dynamically
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (domain) {
      updates.push(`domain = $${paramCount++}`);
      values.push(domain);
    }
    if (settings) {
      updates.push(`settings = settings || $${paramCount++}`);
      values.push(JSON.stringify(settings));
    }

    if (updates.length === 0) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }

    values.push(req.user?.organization_id);
    const updateQuery = `
      UPDATE organizations
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *`;

    const result = await db.query(updateQuery, values);

    res.json({
      message: 'Organization settings updated successfully',
      organization: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating organization settings:', error);
    res.status(500).json({ error: 'Failed to update organization settings' });
  }
});

/**
 * @swagger
 * /api/settings/user:
 *   get:
 *     summary: Récupérer les préférences utilisateur
 *     tags: [⚙️ Configuration]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Préférences utilisateur
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 preferences:
 *                   type: object
 *                   properties:
 *                     theme:
 *                       type: string
 *                       enum: [light, dark, auto]
 *                       default: light
 *                     notifications:
 *                       type: object
 *                       properties:
 *                         email:
 *                           type: boolean
 *                           default: true
 *                         push:
 *                           type: boolean
 *                           default: true
 *                         sms:
 *                           type: boolean
 *                           default: false
 *                     dashboard:
 *                       type: object
 *                       properties:
 *                         widgets:
 *                           type: array
 *                           items:
 *                             type: string
 *                         layout:
 *                           type: string
 *                           enum: [grid, list, cards]
 *             example:
 *               preferences:
 *                 theme: "dark"
 *                 notifications:
 *                   email: true
 *                   push: true
 *                   sms: false
 *                 dashboard:
 *                   widgets: ["sales", "leads", "tasks"]
 *                   layout: "grid"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/user', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const result = await db.query(
      `SELECT metadata FROM users WHERE id = $1`,
      [req.user?.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const defaultPreferences = {
      theme: 'light',
      notifications: {
        email: true,
        push: true,
        sms: false
      },
      dashboard: {
        widgets: ['sales', 'leads', 'tasks'],
        layout: 'grid'
      }
    };

    const userMetadata = result.rows[0].metadata || {};
    const preferences = userMetadata.preferences || {};

    res.json({
      preferences: { ...defaultPreferences, ...preferences }
    });
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    res.status(500).json({ error: 'Failed to fetch user preferences' });
  }
});

/**
 * @swagger
 * /api/settings/user:
 *   put:
 *     summary: Mettre à jour les préférences utilisateur
 *     tags: [⚙️ Configuration]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               theme:
 *                 type: string
 *                 enum: [light, dark, auto]
 *               notifications:
 *                 type: object
 *                 properties:
 *                   email:
 *                     type: boolean
 *                   push:
 *                     type: boolean
 *                   sms:
 *                     type: boolean
 *               dashboard:
 *                 type: object
 *                 properties:
 *                   widgets:
 *                     type: array
 *                     items:
 *                       type: string
 *                   layout:
 *                     type: string
 *                     enum: [grid, list, cards]
 *           example:
 *             theme: "dark"
 *             notifications:
 *               email: false
 *               push: true
 *     responses:
 *       200:
 *         description: Préférences mises à jour
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 preferences:
 *                   type: object
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.put('/user', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const preferences = req.body;

    // Get current metadata
    const currentResult = await db.query(
      `SELECT metadata FROM users WHERE id = $1`,
      [req.user?.id]
    );

    const currentMetadata = currentResult.rows[0]?.metadata || {};
    const updatedMetadata = {
      ...currentMetadata,
      preferences: {
        ...(currentMetadata.preferences || {}),
        ...preferences
      }
    };

    // Update user metadata
    await db.query(
      `UPDATE users
       SET metadata = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [JSON.stringify(updatedMetadata), req.user?.id]
    );

    res.json({
      message: 'User preferences updated successfully',
      preferences: updatedMetadata.preferences
    });
  } catch (error) {
    console.error('Error updating user preferences:', error);
    res.status(500).json({ error: 'Failed to update user preferences' });
  }
});

/**
 * @swagger
 * /api/settings/integrations:
 *   get:
 *     summary: Récupérer les intégrations configurées
 *     tags: [⚙️ Configuration]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des intégrations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 integrations:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       name:
 *                         type: string
 *                       type:
 *                         type: string
 *                         enum: [stripe, paypal, google, microsoft, slack, zapier]
 *                       status:
 *                         type: string
 *                         enum: [active, inactive, error]
 *                       config:
 *                         type: object
 *                       connected_at:
 *                         type: string
 *                         format: date-time
 *             example:
 *               integrations:
 *                 - id: "123e4567-e89b-12d3-a456-426614174000"
 *                   name: "Stripe Payment"
 *                   type: "stripe"
 *                   status: "active"
 *                   config:
 *                     webhook_url: "https://api.simplix.com/webhooks/stripe"
 *                   connected_at: "2024-01-15T10:30:00Z"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/integrations', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const result = await db.query(
      `SELECT id, name, type, status, config, created_at as connected_at
       FROM integrations
       WHERE organization_id = $1
       ORDER BY created_at DESC`,
      [req.user?.organization_id]
    );

    res.json({
      integrations: result.rows
    });
  } catch (error) {
    console.error('Error fetching integrations:', error);
    res.status(500).json({ error: 'Failed to fetch integrations' });
  }
});

/**
 * @swagger
 * /api/settings/notifications:
 *   get:
 *     summary: Récupérer les paramètres de notifications
 *     tags: [⚙️ Configuration]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Paramètres de notifications
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 channels:
 *                   type: object
 *                   properties:
 *                     email:
 *                       type: object
 *                       properties:
 *                         enabled:
 *                           type: boolean
 *                         frequency:
 *                           type: string
 *                           enum: [instant, daily, weekly]
 *                     push:
 *                       type: object
 *                       properties:
 *                         enabled:
 *                           type: boolean
 *                     sms:
 *                       type: object
 *                       properties:
 *                         enabled:
 *                           type: boolean
 *                         phone:
 *                           type: string
 *                 types:
 *                   type: object
 *                   properties:
 *                     newDeal:
 *                       type: boolean
 *                     taskDue:
 *                       type: boolean
 *                     leadAssigned:
 *                       type: boolean
 *                     invoicePaid:
 *                       type: boolean
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/notifications', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const result = await db.query(
      `SELECT metadata FROM users WHERE id = $1`,
      [req.user?.id]
    );

    const metadata = result.rows[0]?.metadata || {};
    const notificationSettings = metadata.notificationSettings || {
      channels: {
        email: { enabled: true, frequency: 'instant' },
        push: { enabled: true },
        sms: { enabled: false }
      },
      types: {
        newDeal: true,
        taskDue: true,
        leadAssigned: true,
        invoicePaid: true
      }
    };

    res.json(notificationSettings);
  } catch (error) {
    console.error('Error fetching notification settings:', error);
    res.status(500).json({ error: 'Failed to fetch notification settings' });
  }
});

export default router;