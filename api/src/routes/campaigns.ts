import express, { Request, Response } from 'express';
import db from '../database/db';

const router = express.Router();

// Get all campaigns
router.get('/', (req: Request, res: Response) => {
  const { status } = req.query;

  let query = 'SELECT * FROM campaigns WHERE 1=1';
  const params: any[] = [];

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  query += ' ORDER BY id DESC';

  db.all(query, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Get campaign by ID
router.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;

  db.get('SELECT * FROM campaigns WHERE id = ?', [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }
    res.json(row);
  });
});

// Create campaign
router.post('/', (req: Request, res: Response) => {
  const { name, subject, content, status, scheduled_date } = req.body;

  if (!name || !subject || !content) {
    res.status(400).json({ error: 'name, subject, and content are required' });
    return;
  }

  const query = `
    INSERT INTO campaigns (name, subject, content, status, scheduled_date, sent_count, opened_count, clicked_count)
    VALUES (?, ?, ?, ?, ?, 0, 0, 0)
  `;

  db.run(query, [name, subject, content, status || 'draft', scheduled_date], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.status(201).json({ id: this.lastID, message: 'Campaign created successfully' });
  });
});

// Update campaign
router.put('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, subject, content, status, scheduled_date } = req.body;

  const query = `
    UPDATE campaigns
    SET name = ?, subject = ?, content = ?, status = ?, scheduled_date = ?
    WHERE id = ?
  `;

  db.run(query, [name, subject, content, status, scheduled_date, id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }
    res.json({ message: 'Campaign updated successfully' });
  });
});

// Update campaign status
router.patch('/:id/status', (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    res.status(400).json({ error: 'status is required' });
    return;
  }

  db.run('UPDATE campaigns SET status = ? WHERE id = ?', [status, id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }
    res.json({ message: 'Campaign status updated successfully' });
  });
});

// Delete campaign
router.delete('/:id', (req: Request, res: Response) => {
  const { id } = req.params;

  db.run('DELETE FROM campaigns WHERE id = ?', [id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }
    res.json({ message: 'Campaign deleted successfully' });
  });
});

// Get campaign recipients
router.get('/:id/recipients', (req: Request, res: Response) => {
  const { id } = req.params;

  const query = `
    SELECT cr.*, c.name, c.email
    FROM campaign_recipients cr
    LEFT JOIN customers c ON cr.customer_id = c.id
    WHERE cr.campaign_id = ?
  `;

  db.all(query, [id], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Add recipients to campaign
router.post('/:id/recipients', (req: Request, res: Response) => {
  const { id } = req.params;
  const { customer_ids } = req.body;

  if (!customer_ids || !Array.isArray(customer_ids) || customer_ids.length === 0) {
    res.status(400).json({ error: 'customer_ids array is required' });
    return;
  }

  const query = `
    INSERT INTO campaign_recipients (campaign_id, customer_id, status)
    VALUES (?, ?, 'pending')
  `;

  const stmt = db.prepare(query);
  let added = 0;

  customer_ids.forEach((customerId) => {
    stmt.run([id, customerId], (err) => {
      if (!err) added++;
    });
  });

  stmt.finalize(() => {
    res.json({ message: `Added ${added} recipients to campaign` });
  });
});

// Send campaign (mark as sent)
router.post('/:id/send', (req: Request, res: Response) => {
  const { id } = req.params;

  // Update campaign status to sent
  db.run('UPDATE campaigns SET status = ? WHERE id = ?', ['sent', id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }

    // Update recipient count
    db.get('SELECT COUNT(*) as count FROM campaign_recipients WHERE campaign_id = ?', [id], (err, row: any) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }

      db.run('UPDATE campaigns SET sent_count = ? WHERE id = ?', [row.count, id], (err) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }

        // Mark all recipients as sent
        db.run('UPDATE campaign_recipients SET status = ? WHERE campaign_id = ?', ['sent', id], (err) => {
          if (err) {
            res.status(500).json({ error: err.message });
            return;
          }
          res.json({ message: `Campaign sent to ${row.count} recipients` });
        });
      });
    });
  });
});

// Track campaign metrics (open/click)
router.post('/:id/track/:action', (req: Request, res: Response) => {
  const { id, action } = req.params;
  const { customer_id } = req.body;

  if (!customer_id) {
    res.status(400).json({ error: 'customer_id is required' });
    return;
  }

  // Update recipient status
  const recipientQuery = action === 'open'
    ? 'UPDATE campaign_recipients SET opened = 1 WHERE campaign_id = ? AND customer_id = ?'
    : 'UPDATE campaign_recipients SET clicked = 1 WHERE campaign_id = ? AND customer_id = ?';

  db.run(recipientQuery, [id, customer_id], (err) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    // Update campaign totals
    const countField = action === 'open' ? 'opened_count' : 'clicked_count';
    const countQuery = `
      UPDATE campaigns
      SET ${countField} = (
        SELECT COUNT(*) FROM campaign_recipients
        WHERE campaign_id = ? AND ${action === 'open' ? 'opened' : 'clicked'} = 1
      )
      WHERE id = ?
    `;

    db.run(countQuery, [id, id], (err) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ message: `${action} tracked successfully` });
    });
  });
});

// Get campaign statistics
router.get('/:id/stats', (req: Request, res: Response) => {
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
    WHERE c.id = ?
  `;

  db.get(query, [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }
    res.json(row);
  });
});

export default router;
