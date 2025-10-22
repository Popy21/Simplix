import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool as db } from '../database/db';
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
    const existingUser = await db.query('SELECT * FROM users WHERE email = $1', [email]);

    if (existingUser.rows.length > 0) {
      res.status(400).json({ error: 'User already exists' });
      return;
    }

    // Hash password with stronger algorithm
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const result = await db.query(
      'INSERT INTO users (email, password, name, role) VALUES ($1, $2, $3, $4) RETURNING *',
      [email, hashedPassword, name, role || 'user']
    );

    const user = result.rows[0];

    const token = jwt.sign(
      { id: user.id, email, role: role || 'user' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      user: {
        id: user.id,
        email,
        name,
        role: role || 'user',
      },
      token,
    });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  try {
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const row = result.rows[0];
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
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get current user (protected route)
router.get('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'User not authenticated' });
    return;
  }

  try {
    const result = await db.query(
      'SELECT id, email, name, role, team_id, created_at, updated_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
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
    const userResult = await db.query('SELECT * FROM users WHERE id = $1', [req.user.id]);

    if (userResult.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const row = userResult.rows[0];

    // Verify current password
    const validPassword = await bcrypt.compare(currentPassword, row.password);

    if (!validPassword) {
      res.status(401).json({ error: 'Current password is incorrect' });
      return;
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await db.query(
      'UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hashedPassword, req.user.id]
    );

    res.json({
      message: 'Password updated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to change password' });
  }
});

export default router;
