import express, { Request, Response } from 'express';
import { pool as db } from '../database/db';
import { Team, TeamMember } from '../models/types';

const router = express.Router();

// Get all teams
router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await db.query('SELECT * FROM teams ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get team by ID with members
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  const teamQuery = 'SELECT * FROM teams WHERE id = $1';
  const membersQuery = `
    SELECT tm.*, u.name, u.email
    FROM team_members tm
    LEFT JOIN users u ON tm.user_id = u.id
    WHERE tm.team_id = $1
  `;

  try {
    const teamResult = await db.query(teamQuery, [id]);

    if (teamResult.rows.length === 0) {
      res.status(404).json({ error: 'Team not found' });
      return;
    }

    const membersResult = await db.query(membersQuery, [id]);
    res.json({ ...teamResult.rows[0], members: membersResult.rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create team
router.post('/', async (req: Request, res: Response) => {
  const { name, description, owner_id } = req.body;

  if (!name || !owner_id) {
    res.status(400).json({ error: 'Name and owner_id are required' });
    return;
  }

  try {
    const teamResult = await db.query(
      'INSERT INTO teams (name, description, owner_id) VALUES ($1, $2, $3) RETURNING *',
      [name, description, owner_id]
    );

    const team = teamResult.rows[0];

    // Automatically add owner as admin member
    try {
      await db.query(
        'INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, $3)',
        [team.id, owner_id, 'admin']
      );
    } catch (memberErr) {
      console.error('Error adding owner to team:', memberErr);
    }

    res.status(201).json(team);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update team
router.put('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, description } = req.body;

  try {
    const result = await db.query(
      'UPDATE teams SET name = $1, description = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
      [name, description, id]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Team not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete team
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const result = await db.query('DELETE FROM teams WHERE id = $1', [id]);

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Team not found' });
      return;
    }

    res.json({ message: 'Team deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Add member to team
router.post('/:id/members', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { user_id, role } = req.body;

  if (!user_id) {
    res.status(400).json({ error: 'user_id is required' });
    return;
  }

  try {
    const result = await db.query(
      'INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, $3) RETURNING *',
      [id, user_id, role || 'member']
    );

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    if (err.message.includes('duplicate key') || err.message.includes('unique constraint')) {
      res.status(400).json({ error: 'User is already a member of this team' });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

// Remove member from team
router.delete('/:id/members/:memberId', async (req: Request, res: Response) => {
  const { id, memberId } = req.params;

  try {
    const result = await db.query(
      'DELETE FROM team_members WHERE team_id = $1 AND user_id = $2',
      [id, memberId]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Member not found in this team' });
      return;
    }

    res.json({ message: 'Member removed successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update member role
router.put('/:id/members/:memberId', async (req: Request, res: Response) => {
  const { id, memberId } = req.params;
  const { role } = req.body;

  if (!role) {
    res.status(400).json({ error: 'role is required' });
    return;
  }

  try {
    const result = await db.query(
      'UPDATE team_members SET role = $1 WHERE team_id = $2 AND user_id = $3 RETURNING *',
      [role, id, memberId]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Member not found in this team' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
