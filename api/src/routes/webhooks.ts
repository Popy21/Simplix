import { Router, Response } from 'express';
import crypto from 'crypto';
import { pool as db } from '../database/db';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requireOrganization } from '../middleware/multiTenancy';

const router = Router();

// ========================================
// WEBHOOK MANAGEMENT
// ========================================

/**
 * GET /api/webhooks
 * List all webhooks for organization
 */
router.get('/', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.user!.organization_id;

    const result = await db.query(`
      SELECT
        w.*,
        COUNT(wd.id) as total_deliveries,
        COUNT(CASE WHEN wd.status = 'success' THEN 1 END) as successful_deliveries,
        COUNT(CASE WHEN wd.status = 'failed' THEN 1 END) as failed_deliveries
      FROM webhooks w
      LEFT JOIN webhook_deliveries wd ON w.id = wd.webhook_id
      WHERE w.organization_id = $1
      GROUP BY w.id
      ORDER BY w.created_at DESC
    `, [orgId]);

    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching webhooks:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/webhooks
 * Create a new webhook
 */
router.post('/', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.user!.organization_id;
    const userId = req.user!.id;
    const { name, url, events, headers, retry_count, timeout_ms } = req.body;

    if (!name || !url || !events || events.length === 0) {
      return res.status(400).json({ error: 'name, url, and events are required' });
    }

    // Generate secret for signature verification
    const secret = crypto.randomBytes(32).toString('hex');

    const result = await db.query(`
      INSERT INTO webhooks (
        organization_id, name, url, secret, events,
        retry_count, timeout_ms, headers, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      orgId,
      name,
      url,
      secret,
      events,
      retry_count || 3,
      timeout_ms || 5000,
      JSON.stringify(headers || {}),
      userId,
    ]);

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Error creating webhook:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/webhooks/:id
 * Update webhook
 */
router.put('/:id', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.user!.organization_id;
    const { id } = req.params;
    const { name, url, events, is_active, headers, retry_count, timeout_ms } = req.body;

    const result = await db.query(`
      UPDATE webhooks SET
        name = COALESCE($1, name),
        url = COALESCE($2, url),
        events = COALESCE($3, events),
        is_active = COALESCE($4, is_active),
        headers = COALESCE($5, headers),
        retry_count = COALESCE($6, retry_count),
        timeout_ms = COALESCE($7, timeout_ms),
        updated_at = NOW()
      WHERE id = $8 AND organization_id = $9
      RETURNING *
    `, [name, url, events, is_active, JSON.stringify(headers), retry_count, timeout_ms, id, orgId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Webhook not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error updating webhook:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/webhooks/:id
 * Delete webhook
 */
router.delete('/:id', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.user!.organization_id;
    const { id } = req.params;

    const result = await db.query(
      'DELETE FROM webhooks WHERE id = $1 AND organization_id = $2 RETURNING id',
      [id, orgId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Webhook not found' });
    }

    res.json({ success: true, message: 'Webhook deleted' });
  } catch (error: any) {
    console.error('Error deleting webhook:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/webhooks/:id/deliveries
 * Get webhook delivery history
 */
router.get('/:id/deliveries', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.user!.organization_id;
    const { id } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;

    // Verify webhook belongs to organization
    const webhookResult = await db.query(
      'SELECT id FROM webhooks WHERE id = $1 AND organization_id = $2',
      [id, orgId]
    );

    if (webhookResult.rows.length === 0) {
      return res.status(404).json({ error: 'Webhook not found' });
    }

    const result = await db.query(`
      SELECT * FROM webhook_deliveries
      WHERE webhook_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `, [id, limit]);

    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching deliveries:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/webhooks/:id/test
 * Send a test webhook
 */
router.post('/:id/test', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.user!.organization_id;
    const { id } = req.params;

    const webhookResult = await db.query(
      'SELECT * FROM webhooks WHERE id = $1 AND organization_id = $2',
      [id, orgId]
    );

    if (webhookResult.rows.length === 0) {
      return res.status(404).json({ error: 'Webhook not found' });
    }

    const webhook = webhookResult.rows[0];

    // Send test event
    const testPayload = {
      event: 'webhook.test',
      timestamp: new Date().toISOString(),
      data: { message: 'This is a test webhook from Simplix CRM' },
    };

    const deliveryId = await triggerWebhook(webhook, 'webhook.test', testPayload);

    res.json({
      success: true,
      message: 'Test webhook sent',
      delivery_id: deliveryId,
    });
  } catch (error: any) {
    console.error('Error sending test webhook:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Trigger a webhook
 */
export async function triggerWebhook(webhook: any, eventType: string, payload: any): Promise<string> {
  // Create delivery record
  const deliveryResult = await db.query(`
    INSERT INTO webhook_deliveries (webhook_id, event_type, payload, status)
    VALUES ($1, $2, $3, 'pending')
    RETURNING id
  `, [webhook.id, eventType, JSON.stringify(payload)]);

  const deliveryId = deliveryResult.rows[0].id;

  // Send webhook asynchronously
  setImmediate(async () => {
    await sendWebhook(webhook, deliveryId, eventType, payload);
  });

  return deliveryId;
}

/**
 * Send webhook with retries
 */
async function sendWebhook(webhook: any, deliveryId: string, eventType: string, payload: any, attempt: number = 1): Promise<void> {
  try {
    const headers: any = JSON.parse(webhook.headers || '{}');

    // Generate signature
    const signature = crypto
      .createHmac('sha256', webhook.secret)
      .update(JSON.stringify(payload))
      .digest('hex');

    headers['X-Webhook-Signature'] = signature;
    headers['X-Webhook-Event'] = eventType;
    headers['X-Webhook-Delivery-Id'] = deliveryId;
    headers['Content-Type'] = 'application/json';

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), webhook.timeout_ms || 5000);

    const response = await fetch(webhook.url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const responseBody = await response.text().catch(() => '');

    if (response.ok) {
      // Success
      await db.query(`
        UPDATE webhook_deliveries SET
          status = 'success',
          http_status = $1,
          response_body = $2,
          delivered_at = NOW(),
          attempt_count = $3
        WHERE id = $4
      `, [response.status, responseBody, attempt, deliveryId]);

      await db.query(
        'UPDATE webhooks SET last_triggered_at = NOW() WHERE id = $1',
        [webhook.id]
      );
    } else {
      throw new Error(`HTTP ${response.status}: ${responseBody}`);
    }
  } catch (error: any) {
    console.error('Webhook delivery failed:', error);

    // Retry logic
    if (attempt < webhook.retry_count) {
      const nextRetry = new Date(Date.now() + Math.pow(2, attempt) * 1000); // Exponential backoff

      await db.query(`
        UPDATE webhook_deliveries SET
          status = 'retrying',
          error_message = $1,
          attempt_count = $2,
          next_retry_at = $3
        WHERE id = $4
      `, [error.message, attempt, nextRetry, deliveryId]);

      // Schedule retry
      setTimeout(() => {
        sendWebhook(webhook, deliveryId, eventType, payload, attempt + 1);
      }, nextRetry.getTime() - Date.now());
    } else {
      // Final failure
      await db.query(`
        UPDATE webhook_deliveries SET
          status = 'failed',
          error_message = $1,
          attempt_count = $2
        WHERE id = $3
      `, [error.message, attempt, deliveryId]);
    }
  }
}

/**
 * Trigger all webhooks for an event
 */
export async function triggerEventWebhooks(orgId: string, eventType: string, data: any): Promise<void> {
  try {
    const result = await db.query(`
      SELECT * FROM webhooks
      WHERE organization_id = $1 AND is_active = true AND $2 = ANY(events)
    `, [orgId, eventType]);

    for (const webhook of result.rows) {
      const payload = {
        event: eventType,
        timestamp: new Date().toISOString(),
        organization_id: orgId,
        data,
      };

      await triggerWebhook(webhook, eventType, payload);
    }
  } catch (error) {
    console.error('Error triggering event webhooks:', error);
  }
}

export default router;
