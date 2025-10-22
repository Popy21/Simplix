import express, { Router, Request, Response } from 'express';
import { pool } from '../database/db';
import { AuthRequest, authenticateToken } from '../middleware/auth';

const router = Router();

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  variables: string[];
}

interface EmailLog {
  id: string;
  to: string;
  subject: string;
  status: 'sent' | 'failed' | 'opened' | 'clicked';
  openedAt?: string;
  clickedAt?: string;
}

/**
 * POST /api/emails/send
 * Envoyer un email
 */
router.post('/send', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { organizationId, to, subject, body, cc, bcc, templateId, variables, attachments } = req.body;
    const userId = req.user!.id;

    if (!organizationId || !to || (!body && !templateId)) {
      return res.status(400).json({
        error: 'organizationId, to et (body ou templateId) sont requis',
      });
    }

    let emailBody = body;

    // Si un template est utilisé
    if (templateId) {
      const templateResult = await pool.query(
        'SELECT body, subject FROM email_templates WHERE id = $1 AND organization_id = $2',
        [templateId, organizationId]
      );

      if (templateResult.rows.length === 0) {
        return res.status(404).json({ error: 'Template non trouvé' });
      }

      emailBody = templateResult.rows[0].body;
      const templateSubject = templateResult.rows[0].subject;

      // Remplacer les variables
      if (variables) {
        Object.keys(variables).forEach(key => {
          emailBody = emailBody.replace(new RegExp(`{{${key}}}`, 'g'), variables[key]);
        });
      }
    }

    // Enregistrer l'email dans la base de données
    const result = await pool.query(
      `INSERT INTO email_logs (organization_id, from_user_id, to, subject, body, cc, bcc, status, template_id, opened_at, clicked_at, sent_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'sent', $8, NULL, NULL, NOW())
       RETURNING id, to, subject, status, sent_at`,
      [organizationId, userId, to, subject, emailBody, cc || null, bcc || null, templateId || null]
    );

    // TODO: Intégrer avec un service d'email réel (Sendgrid, Mailgun, etc.)
    // Pour le moment, simuler l'envoi

    // Enregistrer les pièces jointes si présentes
    if (attachments && Array.isArray(attachments)) {
      for (const attachment of attachments) {
        await pool.query(
          `INSERT INTO email_attachments (email_log_id, file_name, file_url, file_size)
           VALUES ($1, $2, $3, $4)`,
          [result.rows[0].id, attachment.name, attachment.url, attachment.size]
        );
      }
    }

    res.status(201).json({
      success: true,
      message: 'Email enregistré et envoyé',
      emailId: result.rows[0].id,
      email: result.rows[0],
    });
  } catch (error: any) {
    console.error('Erreur lors de l\'envoi de l\'email:', error);
    res.status(500).json({
      error: 'Erreur lors de l\'envoi de l\'email',
    });
  }
});

/**
 * POST /api/emails/templates
 * Créer un template d'email
 */
router.post('/templates', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { organizationId, name, subject, body, category } = req.body;
    const userId = req.user!.id;

    if (!organizationId || !name || !subject || !body) {
      return res.status(400).json({
        error: 'organizationId, name, subject et body sont requis',
      });
    }

    // Extraire les variables du template (format {{variable}})
    const variableMatches = body.match(/{{(\w+)}}/g) || [];
    const variables = [...new Set(variableMatches.map((m: string) => m.replace(/{{|}}/g, '')))];

    const result = await pool.query(
      `INSERT INTO email_templates (organization_id, name, subject, body, category, variables, created_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING id, name, subject, body, category, variables, created_at`,
      [organizationId, name, subject, body, category || 'general', JSON.stringify(variables), userId]
    );

    res.status(201).json({
      success: true,
      template: {
        ...result.rows[0],
        variables: JSON.parse(result.rows[0].variables),
      },
    });
  } catch (error: any) {
    console.error('Erreur lors de la création du template:', error);
    res.status(500).json({
      error: 'Erreur lors de la création du template',
    });
  }
});

/**
 * GET /api/emails/templates
 * Récupérer tous les templates
 */
router.get('/templates', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { organizationId } = req.query;

    if (!organizationId) {
      return res.status(400).json({
        error: 'organizationId est requis',
      });
    }

    const result = await pool.query(
      `SELECT id, name, subject, category, variables, created_at
       FROM email_templates
       WHERE organization_id = $1 AND deleted_at IS NULL
       ORDER BY category, name`,
      [organizationId]
    );

    const templates = result.rows.map(row => ({
      ...row,
      variables: JSON.parse(row.variables),
    }));

    res.json({
      success: true,
      templates,
      total: templates.length,
    });
  } catch (error: any) {
    console.error('Erreur lors de la récupération des templates:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des templates',
    });
  }
});

/**
 * POST /api/emails/schedule
 * Programmer l'envoi d'un email
 */
router.post('/schedule', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { organizationId, to, subject, body, templateId, variables, sendAt } = req.body;
    const userId = req.user!.id;

    if (!organizationId || !to || !sendAt) {
      return res.status(400).json({
        error: 'organizationId, to et sendAt sont requis',
      });
    }

    const scheduledDate = new Date(sendAt);
    if (scheduledDate < new Date()) {
      return res.status(400).json({
        error: 'La date d\'envoi doit être dans le futur',
      });
    }

    const result = await pool.query(
      `INSERT INTO scheduled_emails (organization_id, to, subject, body, template_id, variables, scheduled_at, created_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       RETURNING id, to, subject, scheduled_at`,
      [organizationId, to, subject || null, body || null, templateId || null, variables ? JSON.stringify(variables) : null, scheduledDate, userId]
    );

    res.status(201).json({
      success: true,
      message: 'Email programmé avec succès',
      scheduledEmail: result.rows[0],
    });
  } catch (error: any) {
    console.error('Erreur lors de la programmation de l\'email:', error);
    res.status(500).json({
      error: 'Erreur lors de la programmation de l\'email',
    });
  }
});

/**
 * GET /api/emails/logs
 * Récupérer l'historique des emails
 */
router.get('/logs', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { organizationId, limit = 50, offset = 0, status } = req.query;

    if (!organizationId) {
      return res.status(400).json({
        error: 'organizationId est requis',
      });
    }

    let query = `
      SELECT id, to, subject, status, sent_at, opened_at, clicked_at
      FROM email_logs
      WHERE organization_id = $1
    `;

    const params: any[] = [organizationId];

    if (status) {
      query += ` AND status = $${params.length + 1}`;
      params.push(status);
    }

    query += ` ORDER BY sent_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit as string));
    params.push(parseInt(offset as string));

    const result = await pool.query(query, params);

    res.json({
      success: true,
      logs: result.rows,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  } catch (error: any) {
    console.error('Erreur lors de la récupération des logs d\'emails:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des logs d\'emails',
    });
  }
});

/**
 * GET /api/emails/:emailId
 * Récupérer les détails d'un email
 */
router.get('/:emailId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { emailId } = req.params;

    const emailResult = await pool.query(
      `SELECT * FROM email_logs WHERE id = $1`,
      [emailId]
    );

    if (emailResult.rows.length === 0) {
      return res.status(404).json({ error: 'Email non trouvé' });
    }

    const attachmentsResult = await pool.query(
      `SELECT file_name, file_url, file_size FROM email_attachments WHERE email_log_id = $1`,
      [emailId]
    );

    const email = emailResult.rows[0];

    res.json({
      success: true,
      email: {
        ...email,
        attachments: attachmentsResult.rows,
      },
    });
  } catch (error: any) {
    console.error('Erreur lors de la récupération de l\'email:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération de l\'email',
    });
  }
});

/**
 * POST /api/emails/bulk-send
 * Envoyer un email en masse
 */
router.post('/bulk-send', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { organizationId, recipients, templateId, variables, subject, body } = req.body;
    const userId = req.user!.id;

    if (!organizationId || !recipients || recipients.length === 0) {
      return res.status(400).json({
        error: 'organizationId et recipients sont requis',
      });
    }

    const client = await pool.connect();
    let sentCount = 0;

    try {
      await client.query('BEGIN');

      for (const recipient of recipients) {
        let emailBody = body;
        let emailSubject = subject;

        // Si un template est utilisé
        if (templateId) {
          const templateResult = await client.query(
            'SELECT body, subject FROM email_templates WHERE id = $1',
            [templateId]
          );

          if (templateResult.rows.length > 0) {
            emailBody = templateResult.rows[0].body;
            emailSubject = templateResult.rows[0].subject;
          }
        }

        // Remplacer les variables pour ce destinataire
        if (variables) {
          Object.keys(variables).forEach(key => {
            const value = typeof variables[key] === 'function' 
              ? variables[key](recipient) 
              : variables[key];
            if (emailBody) emailBody = emailBody.replace(new RegExp(`{{${key}}}`, 'g'), value);
            if (emailSubject) emailSubject = emailSubject.replace(new RegExp(`{{${key}}}`, 'g'), value);
          });
        }

        await client.query(
          `INSERT INTO email_logs (organization_id, from_user_id, to, subject, body, status, template_id, sent_at)
           VALUES ($1, $2, $3, $4, $5, 'sent', $6, NOW())`,
          [organizationId, userId, recipient, emailSubject, emailBody, templateId || null]
        );

        sentCount++;
      }

      await client.query('COMMIT');

      res.json({
        success: true,
        message: `${sentCount} emails envoyés`,
        sentCount,
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Erreur lors de l\'envoi en masse:', error);
    res.status(500).json({
      error: 'Erreur lors de l\'envoi en masse',
    });
  }
});

/**
 * POST /api/emails/tracking/pixel
 * Tracker l'ouverture d'email via pixel
 */
router.post('/tracking/pixel/:emailId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { emailId } = req.params;

    await pool.query(
      `UPDATE email_logs 
       SET status = 'opened', opened_at = NOW() 
       WHERE id = $1 AND status != 'clicked'`,
      [emailId]
    );

    res.json({ success: true });
  } catch (error: any) {
    console.error('Erreur lors du tracking d\'ouverture:', error);
    res.status(500).json({
      error: 'Erreur lors du tracking d\'ouverture',
    });
  }
});

export default router;
