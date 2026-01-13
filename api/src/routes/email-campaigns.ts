import { Router, Response } from 'express';
import { pool as db } from '../database/db';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requireOrganization } from '../middleware/multiTenancy';
import { triggerEventWebhooks } from './webhooks';

const router = Router();

// ========================================
// EMAIL TEMPLATES
// ========================================

/**
 * GET /api/email-campaigns/templates
 * List all email templates
 */
router.get('/templates', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.user!.organization_id;

    const result = await db.query(`
      SELECT
        et.*,
        u.first_name || ' ' || u.last_name as created_by_name
      FROM email_templates et
      LEFT JOIN users u ON et.created_by = u.id
      WHERE et.organization_id = $1
      ORDER BY et.is_default DESC, et.created_at DESC
    `, [orgId]);

    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching email templates:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/email-campaigns/templates
 * Create email template
 */
router.post('/templates', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.user!.organization_id;
    const userId = req.user!.id;
    const { name, subject, body_html, body_text, variables, category } = req.body;

    if (!name || !subject || !body_html) {
      return res.status(400).json({ error: 'name, subject, and body_html are required' });
    }

    const result = await db.query(`
      INSERT INTO email_templates (
        organization_id, name, subject, body_html, body_text,
        variables, category, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [orgId, name, subject, body_html, body_text, JSON.stringify(variables || []), category, userId]);

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Error creating email template:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/email-campaigns/templates/:id
 * Get email template by ID
 */
router.get('/templates/:id', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.user!.organization_id;
    const { id } = req.params;

    const result = await db.query(
      'SELECT * FROM email_templates WHERE id = $1 AND organization_id = $2',
      [id, orgId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error fetching email template:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/email-campaigns/templates/:id
 * Update email template
 */
router.put('/templates/:id', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.user!.organization_id;
    const { id } = req.params;
    const { name, subject, body_html, body_text, variables, category } = req.body;

    const result = await db.query(`
      UPDATE email_templates SET
        name = COALESCE($1, name),
        subject = COALESCE($2, subject),
        body_html = COALESCE($3, body_html),
        body_text = COALESCE($4, body_text),
        variables = COALESCE($5, variables),
        category = COALESCE($6, category),
        updated_at = NOW()
      WHERE id = $7 AND organization_id = $8
      RETURNING *
    `, [name, subject, body_html, body_text, JSON.stringify(variables), category, id, orgId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error updating email template:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/email-campaigns/templates/:id
 * Delete email template
 */
router.delete('/templates/:id', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.user!.organization_id;
    const { id } = req.params;

    const result = await db.query(
      'DELETE FROM email_templates WHERE id = $1 AND organization_id = $2 AND is_default = false RETURNING id',
      [id, orgId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found or is default template' });
    }

    res.json({ success: true, message: 'Template deleted' });
  } catch (error: any) {
    console.error('Error deleting email template:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========================================
// EMAIL CAMPAIGNS
// ========================================

/**
 * GET /api/email-campaigns
 * List all email campaigns
 */
router.get('/', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.user!.organization_id;
    const { status } = req.query;

    let query = `
      SELECT
        ec.*,
        et.name as template_name,
        u.first_name || ' ' || u.last_name as created_by_name,
        ROUND((ec.opened_count::numeric / NULLIF(ec.sent_count, 0)) * 100, 2) as open_rate,
        ROUND((ec.clicked_count::numeric / NULLIF(ec.sent_count, 0)) * 100, 2) as click_rate
      FROM email_campaigns ec
      LEFT JOIN email_templates et ON ec.template_id = et.id
      LEFT JOIN users u ON ec.created_by = u.id
      WHERE ec.organization_id = $1
    `;

    const params: any[] = [orgId];

    if (status) {
      query += ' AND ec.status = $2';
      params.push(status);
    }

    query += ' ORDER BY ec.created_at DESC';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching campaigns:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/email-campaigns
 * Create email campaign
 */
router.post('/', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.user!.organization_id;
    const userId = req.user!.id;
    const { template_id, name, subject, from_email, from_name, reply_to, scheduled_at } = req.body;

    if (!name || !subject || !from_email) {
      return res.status(400).json({ error: 'name, subject, and from_email are required' });
    }

    const result = await db.query(`
      INSERT INTO email_campaigns (
        organization_id, template_id, name, subject,
        from_email, from_name, reply_to, scheduled_at, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [orgId, template_id, name, subject, from_email, from_name, reply_to, scheduled_at, userId]);

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Error creating campaign:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/email-campaigns/:id/send
 * Send email campaign
 */
router.post('/:id/send', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.user!.organization_id;
    const { id } = req.params;
    const { contact_ids } = req.body;

    if (!contact_ids || !Array.isArray(contact_ids) || contact_ids.length === 0) {
      return res.status(400).json({ error: 'contact_ids array is required' });
    }

    // Get campaign
    const campaignResult = await db.query(
      'SELECT * FROM email_campaigns WHERE id = $1 AND organization_id = $2',
      [id, orgId]
    );

    if (campaignResult.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const campaign = campaignResult.rows[0];

    if (campaign.status !== 'draft' && campaign.status !== 'paused') {
      return res.status(400).json({ error: 'Campaign is not in draft or paused status' });
    }

    // Get template if exists
    let bodyHtml = '';
    let bodyText = '';

    if (campaign.template_id) {
      const templateResult = await db.query(
        'SELECT body_html, body_text FROM email_templates WHERE id = $1',
        [campaign.template_id]
      );
      if (templateResult.rows.length > 0) {
        bodyHtml = templateResult.rows[0].body_html;
        bodyText = templateResult.rows[0].body_text;
      }
    }

    // Get contacts
    const contactsResult = await db.query(`
      SELECT id, email, first_name, last_name
      FROM contacts
      WHERE id = ANY($1) AND organization_id = $2 AND deleted_at IS NULL
    `, [contact_ids, orgId]);

    const contacts = contactsResult.rows;

    // Update campaign status
    await db.query(`
      UPDATE email_campaigns SET
        status = 'sending',
        recipient_count = $1,
        updated_at = NOW()
      WHERE id = $2
    `, [contacts.length, id]);

    // Send emails (in background)
    setImmediate(async () => {
      await sendCampaignEmails(campaign, contacts, bodyHtml, bodyText);
    });

    res.json({
      success: true,
      message: `Campaign queued for ${contacts.length} recipients`,
      recipient_count: contacts.length,
    });
  } catch (error: any) {
    console.error('Error sending campaign:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/email-campaigns/:id/stats
 * Get campaign statistics
 */
router.get('/:id/stats', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.user!.organization_id;
    const { id } = req.params;

    const result = await db.query(`
      SELECT
        ec.*,
        COUNT(el.id) as total_emails,
        COUNT(CASE WHEN el.status = 'sent' THEN 1 END) as sent,
        COUNT(CASE WHEN el.status = 'delivered' THEN 1 END) as delivered,
        COUNT(CASE WHEN el.status = 'opened' THEN 1 END) as opened,
        COUNT(CASE WHEN el.status = 'clicked' THEN 1 END) as clicked,
        COUNT(CASE WHEN el.status = 'bounced' THEN 1 END) as bounced,
        COUNT(CASE WHEN el.status = 'complained' THEN 1 END) as complained,
        ROUND((COUNT(CASE WHEN el.status = 'opened' THEN 1 END)::numeric / NULLIF(COUNT(CASE WHEN el.status IN ('sent', 'delivered', 'opened', 'clicked') THEN 1 END), 0)) * 100, 2) as open_rate,
        ROUND((COUNT(CASE WHEN el.status = 'clicked' THEN 1 END)::numeric / NULLIF(COUNT(CASE WHEN el.status = 'opened' THEN 1 END), 0)) * 100, 2) as click_through_rate
      FROM email_campaigns ec
      LEFT JOIN email_logs el ON ec.id = el.campaign_id
      WHERE ec.id = $1 AND ec.organization_id = $2
      GROUP BY ec.id
    `, [id, orgId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error fetching campaign stats:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/email-campaigns/:id/pause
 * Pause sending campaign
 */
router.post('/:id/pause', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.user!.organization_id;
    const { id } = req.params;

    const result = await db.query(`
      UPDATE email_campaigns SET
        status = 'paused',
        updated_at = NOW()
      WHERE id = $1 AND organization_id = $2 AND status = 'sending'
      RETURNING *
    `, [id, orgId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found or not sending' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error pausing campaign:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========================================
// EMAIL LOGS
// ========================================

/**
 * GET /api/email-campaigns/logs
 * Get email logs with filtering
 */
router.get('/logs', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.user!.organization_id;
    const { campaign_id, contact_id, status, limit = 100 } = req.query;

    let query = `
      SELECT
        el.*,
        c.first_name, c.last_name, c.email as contact_email,
        ec.name as campaign_name
      FROM email_logs el
      LEFT JOIN contacts c ON el.contact_id = c.id
      LEFT JOIN email_campaigns ec ON el.campaign_id = ec.id
      WHERE el.organization_id = $1
    `;

    const params: any[] = [orgId];
    let paramCount = 1;

    if (campaign_id) {
      params.push(campaign_id);
      query += ` AND el.campaign_id = $${++paramCount}`;
    }

    if (contact_id) {
      params.push(contact_id);
      query += ` AND el.contact_id = $${++paramCount}`;
    }

    if (status) {
      params.push(status);
      query += ` AND el.status = $${++paramCount}`;
    }

    params.push(limit);
    query += ` ORDER BY el.created_at DESC LIMIT $${++paramCount}`;

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching email logs:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========================================
// CAMPAIGN STATISTICS
// ========================================

// GET /api/email-campaigns/stats - Get global email campaign statistics
router.get('/stats', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user?.organization_id;

    // Get campaign statistics
    const campaignStats = await db.query(`
      SELECT
        COUNT(*) as total_campaigns,
        COUNT(*) FILTER (WHERE status = 'sent') as sent_campaigns,
        COUNT(*) FILTER (WHERE status = 'draft') as draft_campaigns,
        COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled_campaigns,
        COALESCE(SUM(sent_count), 0) as total_emails_sent,
        COALESCE(SUM(opened_count), 0) as total_opens,
        COALESCE(SUM(clicked_count), 0) as total_clicks,
        COALESCE(SUM(bounced_count), 0) as total_bounces,
        COALESCE(SUM(unsubscribed_count), 0) as total_unsubscribes
      FROM email_campaigns
      WHERE organization_id = $1
    `, [organizationId]);

    const stats = campaignStats.rows[0];

    // Calculate rates
    const totalSent = parseInt(stats.total_emails_sent) || 1; // Avoid division by zero
    const openRate = ((parseInt(stats.total_opens) / totalSent) * 100).toFixed(2);
    const clickRate = ((parseInt(stats.total_clicks) / totalSent) * 100).toFixed(2);
    const bounceRate = ((parseInt(stats.total_bounces) / totalSent) * 100).toFixed(2);

    // Get recent campaigns performance
    const recentCampaigns = await db.query(`
      SELECT
        id, name, subject, status,
        sent_count, opened_count, clicked_count, bounced_count,
        sent_at, created_at,
        CASE WHEN sent_count > 0 THEN
          ROUND((opened_count::numeric / sent_count) * 100, 2)
        ELSE 0 END as open_rate,
        CASE WHEN sent_count > 0 THEN
          ROUND((clicked_count::numeric / sent_count) * 100, 2)
        ELSE 0 END as click_rate
      FROM email_campaigns
      WHERE organization_id = $1 AND status = 'sent'
      ORDER BY sent_at DESC
      LIMIT 5
    `, [organizationId]);

    res.json({
      summary: {
        total_campaigns: parseInt(stats.total_campaigns),
        sent_campaigns: parseInt(stats.sent_campaigns),
        draft_campaigns: parseInt(stats.draft_campaigns),
        scheduled_campaigns: parseInt(stats.scheduled_campaigns),
        total_emails_sent: parseInt(stats.total_emails_sent),
        total_opens: parseInt(stats.total_opens),
        total_clicks: parseInt(stats.total_clicks),
        total_bounces: parseInt(stats.total_bounces),
        total_unsubscribes: parseInt(stats.total_unsubscribes)
      },
      rates: {
        open_rate: parseFloat(openRate),
        click_rate: parseFloat(clickRate),
        bounce_rate: parseFloat(bounceRate)
      },
      recent_campaigns: recentCampaigns.rows
    });
  } catch (error: any) {
    console.error('Error fetching campaign stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Send campaign emails
 */
async function sendCampaignEmails(campaign: any, contacts: any[], bodyHtml: string, bodyText: string) {
  let sentCount = 0;

  for (const contact of contacts) {
    try {
      // Replace variables in template
      const personalizedHtml = replaceVariables(bodyHtml, contact);
      const personalizedText = replaceVariables(bodyText || '', contact);
      const personalizedSubject = replaceVariables(campaign.subject, contact);

      // Log email
      const logResult = await db.query(`
        INSERT INTO email_logs (
          organization_id, campaign_id, contact_id,
          to_email, from_email, subject, status
        ) VALUES ($1, $2, $3, $4, $5, $6, 'pending')
        RETURNING id
      `, [
        campaign.organization_id,
        campaign.id,
        contact.id,
        contact.email,
        campaign.from_email,
        personalizedSubject,
      ]);

      const emailLogId = logResult.rows[0].id;

      // TODO: Integrate with actual email service (SendGrid, AWS SES, etc.)
      // For now, just simulate sending
      await simulateSendEmail(campaign, contact, personalizedSubject, personalizedHtml);

      // Update log as sent
      await db.query(
        'UPDATE email_logs SET status = $1 WHERE id = $2',
        ['sent', emailLogId]
      );

      sentCount++;

      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`Failed to send email to ${contact.email}:`, error);
    }
  }

  // Update campaign
  await db.query(`
    UPDATE email_campaigns SET
      status = 'sent',
      sent_count = $1,
      sent_at = NOW(),
      updated_at = NOW()
    WHERE id = $2
  `, [sentCount, campaign.id]);

  // Trigger webhook
  await triggerEventWebhooks(campaign.organization_id, 'campaign.sent', {
    campaign_id: campaign.id,
    sent_count: sentCount,
  });
}

/**
 * Replace template variables
 */
function replaceVariables(template: string, contact: any): string {
  let result = template;

  const variables: Record<string, string> = {
    first_name: contact.first_name || '',
    last_name: contact.last_name || '',
    email: contact.email || '',
    full_name: `${contact.first_name || ''} ${contact.last_name || ''}`.trim(),
  };

  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    result = result.replace(regex, value);
  }

  return result;
}

/**
 * Simulate sending email (replace with real email service)
 */
async function simulateSendEmail(campaign: any, contact: any, subject: string, html: string): Promise<void> {
  console.log(`[EMAIL] To: ${contact.email}, Subject: ${subject}`);
  // In production, integrate with SendGrid, AWS SES, Mailgun, etc.
  return Promise.resolve();
}

export default router;
