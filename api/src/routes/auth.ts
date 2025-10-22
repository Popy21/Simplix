import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool as db } from '../database/db';
import { User } from '../models/types';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Register new user
router.post('/register', async (req: Request, res: Response) => {
  const { email, password, name, role } = req.body;

  if (!email || !password || !name) {
    res.status(400).json({ error: 'Email, password, and name are required' });
    return;
  }

  try {
    // Check if user already exists
    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, row) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }

      if (row) {
        res.status(400).json({ error: 'User already exists' });
        return;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      db.run(
        'INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)',
        [email, hashedPassword, name, role || 'user'],
        function (err) {
          if (err) {
            res.status(500).json({ error: err.message });
            return;
          }

          const token = jwt.sign(
            { id: this.lastID, email, role: role || 'user' },
            JWT_SECRET,
            { expiresIn: '7d' }
          );

          res.status(201).json({
            user: {
              id: this.lastID,
              email,
              name,
              role: role || 'user',
            },
            token,
          });
        }
      );
    });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, row: any) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    if (!row) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const validPassword = await bcrypt.compare(password, row.password);

    if (!validPassword) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = jwt.sign(
      { id: row.id, email: row.email, role: row.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      user: {
        id: row.id,
        email: row.email,
        name: row.name,
        role: row.role,
        team_id: row.team_id,
      },
      token,
    });
  });
});

// Get current user
router.get('/me', (req: Request, res: Response) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);

    db.get('SELECT id, email, name, role, team_id FROM users WHERE id = ?', [decoded.id], (err, row) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }

      if (!row) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.json(row);
    });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;
