import express, { Request, Response } from 'express';
import { pool as db } from '../database/db';

const router = express.Router();

// Get all campaigns
router.get('/', async (req: Request, res: Response) => {
  const { status } = req.query;

  let query = 'SELECT * FROM campaigns WHERE 1=1';
  const params: any[] = [];
  let paramCount = 1;

  if (status) {
    query += ` AND status = $${paramCount}`;
    params.push(status);
    paramCount++;
  }

  query += ' ORDER BY id DESC';

  try {
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get campaign by ID
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const result = await db.query('SELECT * FROM campaigns WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create campaign
router.post('/', async (req: Request, res: Response) => {
  const { name, subject, content, status, scheduled_date } = req.body;

  if (!name || !subject || !content) {
    res.status(400).json({ error: 'name, subject, and content are required' });
    return;
  }

  const query = `
    INSERT INTO campaigns (name, subject, content, status, scheduled_date, sent_count, opened_count, clicked_count)
    VALUES ($1, $2, $3, $4, $5, 0, 0, 0)
    RETURNING *
  `;

  try {
    const result = await db.query(query, [name, subject, content, status || 'draft', scheduled_date]);
    res.status(201).json({ id: result.rows[0].id, message: 'Campaign created successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update campaign
router.put('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, subject, content, status, scheduled_date } = req.body;

  const query = `
    UPDATE campaigns
    SET name = $1, subject = $2, content = $3, status = $4, scheduled_date = $5
    WHERE id = $6
  `;

  try {
    const result = await db.query(query, [name, subject, content, status, scheduled_date, id]);
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }
    res.json({ message: 'Campaign updated successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update campaign status
router.patch('/:id/status', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    res.status(400).json({ error: 'status is required' });
    return;
  }

  try {
    const result = await db.query('UPDATE campaigns SET status = $1 WHERE id = $2', [status, id]);
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }
    res.json({ message: 'Campaign status updated successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete campaign
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const result = await db.query('DELETE FROM campaigns WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }
    res.json({ message: 'Campaign deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get campaign recipients
router.get('/:id/recipients', async (req: Request, res: Response) => {
  const { id } = req.params;

  const query = `
    SELECT cr.*, c.name, c.email
    FROM campaign_recipients cr
    LEFT JOIN customers c ON cr.customer_id = c.id
    WHERE cr.campaign_id = $1
  `;

  try {
    const result = await db.query(query, [id]);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Add recipients to campaign
router.post('/:id/recipients', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { customer_ids } = req.body;

  if (!customer_ids || !Array.isArray(customer_ids) || customer_ids.length === 0) {
    res.status(400).json({ error: 'customer_ids array is required' });
    return;
  }

  const query = `
    INSERT INTO campaign_recipients (campaign_id, customer_id, status)
    VALUES ($1, $2, 'pending')
  `;

  try {
    let added = 0;
    for (const customerId of customer_ids) {
      try {
        await db.query(query, [id, customerId]);
        added++;
      } catch (err) {
        // Skip if recipient already exists (unique constraint violation)
        continue;
      }
    }

    res.json({ message: `Added ${added} recipients to campaign` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Send campaign (mark as sent)
router.post('/:id/send', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    // Update campaign status to sent
    const campaignResult = await db.query('UPDATE campaigns SET status = $1 WHERE id = $2', ['sent', id]);

    if (campaignResult.rowCount === 0) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }

    // Get recipient count
    const countResult = await db.query('SELECT COUNT(*) as count FROM campaign_recipients WHERE campaign_id = $1', [id]);
    const count = countResult.rows[0].count;

    // Update sent count
    await db.query('UPDATE campaigns SET sent_count = $1 WHERE id = $2', [count, id]);

    // Mark all recipients as sent
    await db.query('UPDATE campaign_recipients SET status = $1 WHERE campaign_id = $2', ['sent', id]);

    res.json({ message: `Campaign sent to ${count} recipients` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Track campaign metrics (open/click)
router.post('/:id/track/:action', async (req: Request, res: Response) => {
  const { id, action } = req.params;
  const { customer_id } = req.body;

  if (!customer_id) {
    res.status(400).json({ error: 'customer_id is required' });
    return;
  }

  try {
    // Update recipient status
    const recipientQuery = action === 'open'
      ? 'UPDATE campaign_recipients SET opened = 1 WHERE campaign_id = $1 AND customer_id = $2'
      : 'UPDATE campaign_recipients SET clicked = 1 WHERE campaign_id = $1 AND customer_id = $2';

    await db.query(recipientQuery, [id, customer_id]);

    // Update campaign totals
    const countField = action === 'open' ? 'opened_count' : 'clicked_count';
    const countQuery = `
      UPDATE campaigns
      SET ${countField} = (
        SELECT COUNT(*) FROM campaign_recipients
        WHERE campaign_id = $1 AND ${action === 'open' ? 'opened' : 'clicked'} = 1
      )
      WHERE id = $1
    `;

    await db.query(countQuery, [id]);

    res.json({ message: `${action} tracked successfully` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get campaign statistics
router.get('/:id/stats', async (req: Request, res: Response) => {
  const { id } = req.params;

  const query = `
    SELECT
      c.id,
      c.name,
      c.status,
      c.sent_count,
      c.opened_count,
      c.clicked_count,
      CASE
        WHEN c.sent_count > 0 THEN (c.opened_count * 100.0 / c.sent_count)
        ELSE 0
      END as open_rate,
      CASE
        WHEN c.sent_count > 0 THEN (c.clicked_count * 100.0 / c.sent_count)
        ELSE 0
      END as click_rate
    FROM campaigns c
    WHERE c.id = $1
  `;

  try {
    const result = await db.query(query, [id]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
