import express, { Router, Request, Response } from 'express';
import { pool } from '../database/db';
import { AuthRequest, authenticateToken } from '../middleware/auth';

const router = Router();

interface WorkflowTrigger {
  type: 'contact_created' | 'contact_updated' | 'deal_created' | 'deal_moved' | 'activity_logged' | 'quote_accepted';
  conditions: Record<string, any>;
}

interface WorkflowAction {
  type: 'send_email' | 'create_task' | 'add_activity' | 'move_deal' | 'assign_contact' | 'add_tag' | 'send_notification';
  config: Record<string, any>;
}

/**
 * POST /api/workflows
 * Créer un nouveau workflow d'automation
 */
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { description, enabled } = req.body;
    const userId = req.user!.id;
    // Get organizationId from body or from user token
    const organizationId = req.body.organizationId || req.user?.organization_id;

    // Provide defaults for required fields if not provided
    const name = req.body.name || `Workflow ${Date.now()}`;
    const trigger = req.body.trigger || { type: 'manual', conditions: {} };
    const actions = req.body.actions || [];

    if (!organizationId) {
      return res.status(400).json({
        error: 'organizationId requis (dans body ou token utilisateur)',
      });
    }

    const result = await pool.query(
      `INSERT INTO workflows (organization_id, name, description, trigger, actions, enabled, created_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING id, name, description, trigger, actions, enabled, created_at`,
      [organizationId, name, description || null, JSON.stringify(trigger), JSON.stringify(actions), enabled !== false, userId]
    );

    res.status(201).json({
      success: true,
      workflow: {
        ...result.rows[0],
        trigger: JSON.parse(result.rows[0].trigger),
        actions: JSON.parse(result.rows[0].actions),
      },
    });
  } catch (error: any) {
    console.error('Erreur lors de la création du workflow:', error);
    res.status(500).json({
      error: 'Erreur lors de la création du workflow',
    });
  }
});

/**
 * GET /api/workflows
 * Lister tous les workflows d'une organisation
 */
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    // Accepter organizationId depuis query OU depuis le token utilisateur
    const organizationId = req.query.organizationId || (req.user as any)?.organizationId || (req.user as any)?.organization_id;

    if (!organizationId) {
      // Retourner une liste vide au lieu d'une erreur 400
      return res.json({
        success: true,
        workflows: [],
        total: 0,
      });
    }

    const result = await pool.query(
      `SELECT id, name, description, trigger, actions, enabled, created_at, updated_at, execution_count
       FROM workflows
       WHERE organization_id = $1 AND deleted_at IS NULL
       ORDER BY created_at DESC`,
      [organizationId]
    );

    const workflows = result.rows.map(row => ({
      ...row,
      trigger: JSON.parse(row.trigger),
      actions: JSON.parse(row.actions),
    }));

    res.json({
      success: true,
      workflows,
      total: workflows.length,
    });
  } catch (error: any) {
    console.error('Erreur lors de la récupération des workflows:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des workflows',
    });
  }
});

/**
 * GET /api/workflows/executions
 * Récupérer toutes les exécutions de workflows
 */
router.get('/executions', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user?.organization_id || (req.query.organizationId as string);
    const { limit = 50, offset = 0 } = req.query;

    // Check if table exists first
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'workflow_executions'
      )
    `);

    if (!tableCheck.rows[0].exists) {
      return res.json({
        success: true,
        executions: [],
        total: 0,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      });
    }

    let query = `
      SELECT we.id, we.workflow_id, w.name as workflow_name, we.target_id, we.target_type, we.actions_executed, we.executed_at
      FROM workflow_executions we
      LEFT JOIN workflows w ON we.workflow_id = w.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (organizationId) {
      params.push(organizationId);
      query += ` AND w.organization_id = $${params.length}`;
    }

    query += ` ORDER BY we.executed_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit as string), parseInt(offset as string));

    const result = await pool.query(query, params);

    const executions = result.rows.map(row => ({
      ...row,
      actionsExecuted: row.actions_executed ? JSON.parse(row.actions_executed) : [],
    }));

    res.json({
      success: true,
      executions,
      total: executions.length,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  } catch (error: any) {
    console.error('Erreur lors de la récupération des exécutions:', error);
    res.json({
      success: true,
      executions: [],
      total: 0
    });
  }
});

/**
 * GET /api/workflows/templates/list
 * Récupérer les modèles de workflows prédéfinis
 */
router.get('/templates/list', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const templates = [
      {
        id: 'new_contact_welcome',
        name: 'Accueil nouveau contact',
        description: 'Envoyer un email de bienvenue et créer une tâche de suivi',
        trigger: { type: 'contact_created' },
        actions: [
          {
            type: 'send_email',
            config: {
              subject: 'Bienvenue dans notre CRM!',
              template: 'welcome_email',
            },
          },
          {
            type: 'create_task',
            config: {
              title: 'Suivi du nouveau contact',
              description: 'Appeler le contact pour présentation',
              dueDate: '+3days',
            },
          },
        ],
      },
      {
        id: 'deal_won_notification',
        name: 'Notification deal gagné',
        description: 'Créer une activité et ajouter un tag quand un deal est gagné',
        trigger: { type: 'deal_moved', conditions: { toStage: 'won' } },
        actions: [
          {
            type: 'add_tag',
            config: { tag: 'deal_won' },
          },
          {
            type: 'add_activity',
            config: {
              activityType: 'note',
              description: 'Deal remporté!',
            },
          },
        ],
      },
    ];

    res.json({
      success: true,
      templates,
    });
  } catch (error: any) {
    console.error('Erreur lors de la récupération des modèles:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des modèles',
    });
  }
});

/**
 * GET /api/workflows/:workflowId
 * Récupérer un workflow spécifique
 */
router.get('/:workflowId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { workflowId } = req.params;

    const result = await pool.query(
      `SELECT * FROM workflows WHERE id = $1 AND deleted_at IS NULL`,
      [workflowId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Workflow non trouvé' });
    }

    const workflow = result.rows[0];

    res.json({
      success: true,
      workflow: {
        ...workflow,
        trigger: JSON.parse(workflow.trigger),
        actions: JSON.parse(workflow.actions),
      },
    });
  } catch (error: any) {
    console.error('Erreur lors de la récupération du workflow:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération du workflow',
    });
  }
});

/**
 * PUT /api/workflows/:workflowId
 * Mettre à jour un workflow
 */
router.put('/:workflowId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { workflowId } = req.params;
    const { name, description, trigger, actions, enabled } = req.body;

    const result = await pool.query(
      `UPDATE workflows 
       SET name = COALESCE($2, name),
           description = COALESCE($3, description),
           trigger = COALESCE($4, trigger),
           actions = COALESCE($5, actions),
           enabled = COALESCE($6, enabled),
           updated_at = NOW()
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING id, name, description, trigger, actions, enabled, updated_at`,
      [
        workflowId,
        name,
        description,
        trigger ? JSON.stringify(trigger) : null,
        actions ? JSON.stringify(actions) : null,
        enabled,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Workflow non trouvé' });
    }

    const workflow = result.rows[0];

    res.json({
      success: true,
      workflow: {
        ...workflow,
        trigger: JSON.parse(workflow.trigger),
        actions: JSON.parse(workflow.actions),
      },
    });
  } catch (error: any) {
    console.error('Erreur lors de la mise à jour du workflow:', error);
    res.status(500).json({
      error: 'Erreur lors de la mise à jour du workflow',
    });
  }
});

/**
 * DELETE /api/workflows/:workflowId
 * Supprimer un workflow (soft delete)
 */
router.delete('/:workflowId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { workflowId } = req.params;

    await pool.query(
      'UPDATE workflows SET deleted_at = NOW() WHERE id = $1',
      [workflowId]
    );

    res.json({ success: true, message: 'Workflow supprimé' });
  } catch (error: any) {
    console.error('Erreur lors de la suppression du workflow:', error);
    res.status(500).json({
      error: 'Erreur lors de la suppression du workflow',
    });
  }
});

/**
 * POST /api/workflows/:workflowId/execute
 * Exécuter un workflow manuellement
 */
router.post('/:workflowId/execute', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { workflowId } = req.params;
    const { targetId, targetType } = req.body;

    const workflowResult = await pool.query(
      'SELECT * FROM workflows WHERE id = $1 AND enabled = true',
      [workflowId]
    );

    if (workflowResult.rows.length === 0) {
      return res.status(404).json({ error: 'Workflow non trouvé ou désactivé' });
    }

    const workflow = workflowResult.rows[0];
    const trigger = JSON.parse(workflow.trigger);
    const actions = JSON.parse(workflow.actions);

    let executedActions: any[] = [];
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Exécuter chaque action
      for (const action of actions) {
        switch (action.type) {
          case 'create_task':
            const taskResult = await client.query(
              `INSERT INTO tasks (contact_id, title, description, due_date, status, created_at)
               VALUES ($1, $2, $3, $4, 'pending', NOW())
               RETURNING id`,
              [targetId, action.config.title, action.config.description, action.config.dueDate || null]
            );
            executedActions.push({
              type: 'create_task',
              taskId: taskResult.rows[0].id,
            });
            break;

          case 'add_tag':
            await client.query(
              `UPDATE contacts SET tags = array_append(tags, $1) WHERE id = $2`,
              [action.config.tag, targetId]
            );
            executedActions.push({
              type: 'add_tag',
              tag: action.config.tag,
            });
            break;

          case 'add_activity':
            const activityResult = await client.query(
              `INSERT INTO activities (contact_id, type, description, metadata, created_at)
               VALUES ($1, $2, $3, $4, NOW())
               RETURNING id`,
              [targetId, action.config.activityType || 'note', action.config.description, JSON.stringify(action.config.metadata || {})]
            );
            executedActions.push({
              type: 'add_activity',
              activityId: activityResult.rows[0].id,
            });
            break;

          case 'send_email':
            // Simuler l'envoi d'email (implémentation réelle nécessiterait un service d'email)
            executedActions.push({
              type: 'send_email',
              to: action.config.to,
              subject: action.config.subject,
              status: 'queued',
            });
            break;

          case 'move_deal':
            await client.query(
              `UPDATE deals SET stage_id = $1, updated_at = NOW() WHERE id = $2`,
              [action.config.stageId, targetId]
            );
            executedActions.push({
              type: 'move_deal',
              stageId: action.config.stageId,
            });
            break;
        }
      }

      // Enregistrer l'exécution
      const executionResult = await client.query(
        `INSERT INTO workflow_executions (workflow_id, target_id, target_type, actions_executed, executed_at)
         VALUES ($1, $2, $3, $4, NOW())
         RETURNING id, executed_at`,
        [workflowId, targetId, targetType, JSON.stringify(executedActions)]
      );

      // Incrémenter le compteur d'exécution
      await client.query(
        'UPDATE workflows SET execution_count = execution_count + 1 WHERE id = $1',
        [workflowId]
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'Workflow exécuté avec succès',
        executionId: executionResult.rows[0].id,
        executedActions,
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Erreur lors de l\'exécution du workflow:', error);
    res.status(500).json({
      error: 'Erreur lors de l\'exécution du workflow',
    });
  }
});

/**
 * GET /api/workflows/:workflowId/executions
 * Récupérer l'historique d'exécution d'un workflow
 */
router.get('/:workflowId/executions', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { workflowId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const result = await pool.query(
      `SELECT id, target_id, target_type, actions_executed, executed_at
       FROM workflow_executions
       WHERE workflow_id = $1
       ORDER BY executed_at DESC
       LIMIT $2 OFFSET $3`,
      [workflowId, parseInt(limit as string), parseInt(offset as string)]
    );

    const countResult = await pool.query(
      'SELECT COUNT(*) as count FROM workflow_executions WHERE workflow_id = $1',
      [workflowId]
    );

    const executions = result.rows.map(row => ({
      ...row,
      actionsExecuted: JSON.parse(row.actions_executed),
    }));

    res.json({
      success: true,
      executions,
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  } catch (error: any) {
    console.error('Erreur lors de la récupération de l\'historique d\'exécution:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération de l\'historique d\'exécution',
    });
  }
});

export default router;
