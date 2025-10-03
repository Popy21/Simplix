import express, { Request, Response } from 'express';
import db from '../database/db';

const router = express.Router();

// ========== PIPELINE STAGES ==========

// Get all pipeline stages
router.get('/stages', (req: Request, res: Response) => {
  db.all('SELECT * FROM pipeline_stages ORDER BY position ASC', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Get stage by ID
router.get('/stages/:id', (req: Request, res: Response) => {
  const { id } = req.params;

  db.get('SELECT * FROM pipeline_stages WHERE id = ?', [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Stage not found' });
      return;
    }
    res.json(row);
  });
});

// Create pipeline stage
router.post('/stages', (req: Request, res: Response) => {
  const { name, color, position } = req.body;

  if (!name) {
    res.status(400).json({ error: 'name is required' });
    return;
  }

  const query = `
    INSERT INTO pipeline_stages (name, color, position)
    VALUES (?, ?, ?)
  `;

  db.run(query, [name, color || '#2196F3', position || 0], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.status(201).json({ id: this.lastID, message: 'Stage created successfully' });
  });
});

// Update pipeline stage
router.put('/stages/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, color, position } = req.body;

  const query = `
    UPDATE pipeline_stages
    SET name = ?, color = ?, position = ?
    WHERE id = ?
  `;

  db.run(query, [name, color, position, id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Stage not found' });
      return;
    }
    res.json({ message: 'Stage updated successfully' });
  });
});

// Delete pipeline stage
router.delete('/stages/:id', (req: Request, res: Response) => {
  const { id } = req.params;

  db.run('DELETE FROM pipeline_stages WHERE id = ?', [id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Stage not found' });
      return;
    }
    res.json({ message: 'Stage deleted successfully' });
  });
});

// ========== OPPORTUNITIES ==========

// Get all opportunities
router.get('/opportunities', (req: Request, res: Response) => {
  const { stageId, userId, customerId } = req.query;

  let query = `
    SELECT o.*, c.name as customer_name, c.email as customer_email,
           u.name as owner_name, s.name as stage_name, s.color as stage_color
    FROM opportunities o
    LEFT JOIN customers c ON o.customer_id = c.id
    LEFT JOIN users u ON o.user_id = u.id
    LEFT JOIN pipeline_stages s ON o.stage_id = s.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (stageId) {
    query += ' AND o.stage_id = ?';
    params.push(stageId);
  }

  if (userId) {
    query += ' AND o.user_id = ?';
    params.push(userId);
  }

  if (customerId) {
    query += ' AND o.customer_id = ?';
    params.push(customerId);
  }

  query += ' ORDER BY o.expected_close_date ASC';

  db.all(query, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Get opportunity by ID
router.get('/opportunities/:id', (req: Request, res: Response) => {
  const { id } = req.params;

  const query = `
    SELECT o.*, c.name as customer_name, c.email as customer_email,
           u.name as owner_name, s.name as stage_name, s.color as stage_color
    FROM opportunities o
    LEFT JOIN customers c ON o.customer_id = c.id
    LEFT JOIN users u ON o.user_id = u.id
    LEFT JOIN pipeline_stages s ON o.stage_id = s.id
    WHERE o.id = ?
  `;

  db.get(query, [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Opportunity not found' });
      return;
    }
    res.json(row);
  });
});

// Create opportunity
router.post('/opportunities', (req: Request, res: Response) => {
  const { name, customer_id, user_id, stage_id, value, probability, expected_close_date, description } = req.body;

  if (!name || !customer_id || !user_id || !stage_id) {
    res.status(400).json({ error: 'name, customer_id, user_id, and stage_id are required' });
    return;
  }

  const query = `
    INSERT INTO opportunities (name, customer_id, user_id, stage_id, value, probability, expected_close_date, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(
    query,
    [name, customer_id, user_id, stage_id, value || 0, probability || 50, expected_close_date, description],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.status(201).json({ id: this.lastID, message: 'Opportunity created successfully' });
    }
  );
});

// Update opportunity
router.put('/opportunities/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, customer_id, user_id, stage_id, value, probability, expected_close_date, description } = req.body;

  const query = `
    UPDATE opportunities
    SET name = ?, customer_id = ?, user_id = ?, stage_id = ?, value = ?, probability = ?, expected_close_date = ?, description = ?
    WHERE id = ?
  `;

  db.run(
    query,
    [name, customer_id, user_id, stage_id, value, probability, expected_close_date, description, id],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      if (this.changes === 0) {
        res.status(404).json({ error: 'Opportunity not found' });
        return;
      }
      res.json({ message: 'Opportunity updated successfully' });
    }
  );
});

// Move opportunity to different stage
router.patch('/opportunities/:id/stage', (req: Request, res: Response) => {
  const { id } = req.params;
  const { stage_id } = req.body;

  if (!stage_id) {
    res.status(400).json({ error: 'stage_id is required' });
    return;
  }

  db.run('UPDATE opportunities SET stage_id = ? WHERE id = ?', [stage_id, id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Opportunity not found' });
      return;
    }
    res.json({ message: 'Opportunity moved to new stage' });
  });
});

// Delete opportunity
router.delete('/opportunities/:id', (req: Request, res: Response) => {
  const { id } = req.params;

  db.run('DELETE FROM opportunities WHERE id = ?', [id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Opportunity not found' });
      return;
    }
    res.json({ message: 'Opportunity deleted successfully' });
  });
});

// Get pipeline summary
router.get('/summary', (req: Request, res: Response) => {
  const query = `
    SELECT
      s.id as stage_id,
      s.name as stage_name,
      s.color as stage_color,
      COUNT(o.id) as opportunity_count,
      COALESCE(SUM(o.value), 0) as total_value,
      COALESCE(AVG(o.probability), 0) as avg_probability
    FROM pipeline_stages s
    LEFT JOIN opportunities o ON s.id = o.stage_id
    GROUP BY s.id
    ORDER BY s.position ASC
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

export default router;
