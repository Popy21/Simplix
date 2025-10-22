import express, { Request, Response } from 'express';
import { pool as db } from '../database/db';
import { Team, TeamMember } from '../models/types';

const router = express.Router();

// Get all teams
router.get('/', (req: Request, res: Response) => {
  db.all('SELECT * FROM teams ORDER BY created_at DESC', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Get team by ID with members
router.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;

  const teamQuery = 'SELECT * FROM teams WHERE id = ?';
  const membersQuery = `
    SELECT tm.*, u.name, u.email
    FROM team_members tm
    LEFT JOIN users u ON tm.user_id = u.id
    WHERE tm.team_id = ?
  `;

  db.get(teamQuery, [id], (err, team) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    if (!team) {
      res.status(404).json({ error: 'Team not found' });
      return;
    }

    db.all(membersQuery, [id], (err, members) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }

      res.json({ ...team, members });
    });
  });
});

// Create team
router.post('/', (req: Request, res: Response) => {
  const { name, description, owner_id } = req.body;

  if (!name || !owner_id) {
    res.status(400).json({ error: 'Name and owner_id are required' });
    return;
  }

  db.run(
    'INSERT INTO teams (name, description, owner_id) VALUES (?, ?, ?)',
    [name, description, owner_id],
    function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }

      // Automatically add owner as admin member
      db.run(
        'INSERT INTO team_members (team_id, user_id, role) VALUES (?, ?, ?)',
        [this.lastID, owner_id, 'admin'],
        (memberErr) => {
          if (memberErr) {
            console.error('Error adding owner to team:', memberErr);
          }

          res.status(201).json({ id: this.lastID, name, description, owner_id });
        }
      );
    }
  );
});

// Update team
router.put('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, description } = req.body;

  db.run(
    'UPDATE teams SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [name, description, id],
    function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }

      if (this.changes === 0) {
        res.status(404).json({ error: 'Team not found' });
        return;
      }

      res.json({ id, name, description });
    }
  );
});

// Delete team
router.delete('/:id', (req: Request, res: Response) => {
  const { id } = req.params;

  db.run('DELETE FROM teams WHERE id = ?', [id], function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    if (this.changes === 0) {
      res.status(404).json({ error: 'Team not found' });
      return;
    }

    res.json({ message: 'Team deleted successfully' });
  });
});

// Add member to team
router.post('/:id/members', (req: Request, res: Response) => {
  const { id } = req.params;
  const { user_id, role } = req.body;

  if (!user_id) {
    res.status(400).json({ error: 'user_id is required' });
    return;
  }

  db.run(
    'INSERT INTO team_members (team_id, user_id, role) VALUES (?, ?, ?)',
    [id, user_id, role || 'member'],
    function (err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          res.status(400).json({ error: 'User is already a member of this team' });
        } else {
          res.status(500).json({ error: err.message });
        }
        return;
      }

      res.status(201).json({ id: this.lastID, team_id: id, user_id, role: role || 'member' });
    }
  );
});

// Remove member from team
router.delete('/:id/members/:memberId', (req: Request, res: Response) => {
  const { id, memberId } = req.params;

  db.run(
    'DELETE FROM team_members WHERE team_id = ? AND user_id = ?',
    [id, memberId],
    function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }

      if (this.changes === 0) {
        res.status(404).json({ error: 'Member not found in this team' });
        return;
      }

      res.json({ message: 'Member removed successfully' });
    }
  );
});

// Update member role
router.put('/:id/members/:memberId', (req: Request, res: Response) => {
  const { id, memberId } = req.params;
  const { role } = req.body;

  if (!role) {
    res.status(400).json({ error: 'role is required' });
    return;
  }

  db.run(
    'UPDATE team_members SET role = ? WHERE team_id = ? AND user_id = ?',
    [role, id, memberId],
    function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }

      if (this.changes === 0) {
        res.status(404).json({ error: 'Member not found in this team' });
        return;
      }

      res.json({ team_id: id, user_id: memberId, role });
    }
  );
});

export default router;
