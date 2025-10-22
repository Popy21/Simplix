import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../database/db';
import { User } from '../models/types';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { validatePassword, isCommonPassword } from '../utils/passwordValidator';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Validate password strength (public endpoint for real-time feedback)
router.post('/validate-password', (req: Request, res: Response) => {
  const { password } = req.body;

  if (!password) {
    res.status(400).json({ error: 'Password is required' });
    return;
  }

  const validation = validatePassword(password);
  const isCommon = isCommonPassword(password);

  res.json({
    ...validation,
    isCommonPassword: isCommon,
    warning: isCommon ? 'This password is too common and easily guessable' : null
  });
});

// Register new user
router.post('/register', async (req: Request, res: Response) => {
  const { email, password, name, role } = req.body;

  if (!email || !password || !name) {
    res.status(400).json({ error: 'Email, password, and name are required' });
    return;
  }

  // Validate password strength
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.isValid) {
    res.status(400).json({
      error: 'Password does not meet security requirements',
      details: passwordValidation.errors,
      criteria: passwordValidation.criteria
    });
    return;
  }

  // Check for common passwords
  if (isCommonPassword(password)) {
    res.status(400).json({
      error: 'This password is too common. Please choose a more secure password.'
    });
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

      // Hash password with stronger algorithm
      const hashedPassword = await bcrypt.hash(password, 12);

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

// Get current user (protected route)
router.get('/me', authenticateToken, (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'User not authenticated' });
    return;
  }

  db.get(
    'SELECT id, email, name, role, team_id, created_at, updated_at FROM users WHERE id = ?',
    [req.user.id],
    (err, row) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }

      if (!row) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.json(row);
    }
  );
});

// Change password (protected route)
router.post('/change-password', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: 'Current password and new password are required' });
    return;
  }

  if (!req.user) {
    res.status(401).json({ error: 'User not authenticated' });
    return;
  }

  // Validate new password strength
  const passwordValidation = validatePassword(newPassword);
  if (!passwordValidation.isValid) {
    res.status(400).json({
      error: 'New password does not meet security requirements',
      details: passwordValidation.errors,
      criteria: passwordValidation.criteria
    });
    return;
  }

  // Check for common passwords
  if (isCommonPassword(newPassword)) {
    res.status(400).json({
      error: 'This password is too common. Please choose a more secure password.'
    });
    return;
  }

  // Check if new password is same as current
  if (currentPassword === newPassword) {
    res.status(400).json({
      error: 'New password must be different from current password'
    });
    return;
  }

  try {
    // Get user from database
    db.get(
      'SELECT * FROM users WHERE id = ?',
      [req.user.id],
      async (err, row: any) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }

        if (!row) {
          res.status(404).json({ error: 'User not found' });
          return;
        }

        // Verify current password
        const validPassword = await bcrypt.compare(currentPassword, row.password);

        if (!validPassword) {
          res.status(401).json({ error: 'Current password is incorrect' });
          return;
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 12);

        // Update password
        db.run(
          'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [hashedPassword, req.user!.id],
          (err) => {
            if (err) {
              res.status(500).json({ error: err.message });
              return;
            }

            res.json({
              message: 'Password updated successfully',
              timestamp: new Date().toISOString()
            });
          }
        );
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Failed to change password' });
  }
});

export default router;
