import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool as db } from '../database/db';
import { User } from '../models/types';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { validatePassword, isCommonPassword } from '../utils/passwordValidator';
import {
  generateTokenPair,
  verifyRefreshToken,
  generateAccessToken,
  TokenPayload,
} from '../utils/tokenManager';

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
    // Check if user already exists within the default organization
    const DEFAULT_ORG_ID = process.env.DEFAULT_ORG_ID || '00000000-0000-0000-0000-000000000001';

    const existingUser = await db.query('SELECT * FROM users WHERE email = $1 AND organization_id = $2', [email, DEFAULT_ORG_ID]);

    if (existingUser.rows.length > 0) {
      res.status(400).json({ error: 'User already exists' });
      return;
    }

    // Hash password with stronger algorithm
    const hashedPassword = await bcrypt.hash(password, 12);

    // Split name into first/last
    const nameParts = (name || '').trim().split(/\s+/);
    const firstName = nameParts.shift() || '';
    const lastName = nameParts.join(' ') || '';

    // Create user using current DB schema (organization_id, email, password_hash, first_name, last_name)
    const insertResult = await db.query(
      `INSERT INTO users (organization_id, email, password_hash, first_name, last_name, status, email_verified)
       VALUES ($1, $2, $3, $4, $5, 'active', true) RETURNING id, email, first_name, last_name`,
      [DEFAULT_ORG_ID, email, hashedPassword, firstName, lastName]
    );

    const user = insertResult.rows[0];

    // Try to assign a role: find a role matching the requested type or default to 'user'
    const desiredRoleType = role || 'user';
  const roleRes = await db.query('SELECT id, name, type FROM roles WHERE organization_id = $1 AND (type = $2 OR name ILIKE $3) LIMIT 1', [DEFAULT_ORG_ID, desiredRoleType, desiredRoleType]);
  let assignedRoleType = 'user';
    if (roleRes.rows.length > 0) {
      const roleRow = roleRes.rows[0];
      assignedRoleType = roleRow.type || roleRow.name || 'user';
      // Insert mapping in user_roles
      try {
        await db.query('INSERT INTO user_roles (user_id, role_id, assigned_by) VALUES ($1, $2, $3) ON CONFLICT (user_id, role_id) DO NOTHING', [user.id, roleRow.id, user.id]);
      } catch (e) {
        // Non-fatal; continue
        console.error('Failed to assign role to user:', e);
      }
    }

    const token = jwt.sign(
      { id: user.id, email, role: assignedRoleType },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
        role: assignedRoleType,
      },
      token,
    });
  } catch (error) {
    // Log full error for debugging
    console.error('Registration error:', error);

    // In development return error details to help debugging, otherwise return generic message
    if (process.env.NODE_ENV === 'development') {
      // @ts-ignore
      res.status(500).json({ error: 'Registration failed', details: error?.message || error });
    } else {
      res.status(500).json({ error: 'Registration failed' });
    }
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
    const result = await db.query(
      `SELECT u.id, u.email, u.password_hash, u.first_name, u.last_name, 
              u.organization_id, COALESCE(r.type::text, r.name, 'user') as role
       FROM users u
       LEFT JOIN user_roles ur ON u.id = ur.user_id
       LEFT JOIN roles r ON ur.role_id = r.id
       WHERE u.email = $1 AND u.deleted_at IS NULL
       LIMIT 1`,
      [email]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Generate token pair with proper payload
    const tokenPayload: TokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role || 'user',
      organization_id: user.organization_id,
    };

    const { accessToken, refreshToken } = generateTokenPair(tokenPayload);

    // Store refresh token in database for revocation later if needed
    await db.query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at) 
       VALUES ($1, $2, NOW() + INTERVAL '7 days')
       ON CONFLICT DO NOTHING`,
      [user.id, refreshToken]
    ).catch(() => {
      // Table might not exist yet, ignore
    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
        role: user.role || 'user',
        organization_id: user.organization_id,
      },
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes in seconds
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
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
      `SELECT u.id, u.email, 
              u.first_name, u.last_name,
              u.organization_id,
              COALESCE(r.type::text, r.name, 'user') as role,
              u.created_at, u.updated_at
       FROM users u
       LEFT JOIN user_roles ur ON u.id = ur.user_id
       LEFT JOIN roles r ON ur.role_id = r.id
       WHERE u.id = $1 AND u.deleted_at IS NULL
       LIMIT 1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const user = result.rows[0];
    res.json({
      id: user.id,
      email: user.email,
      name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
      role: user.role || 'user',
      organization_id: user.organization_id,
      created_at: user.created_at,
      updated_at: user.updated_at,
    });
  } catch (err: any) {
    console.error('Error in /auth/me:', err);
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

// Refresh token endpoint
router.post('/refresh', async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    res.status(400).json({ error: 'Refresh token is required' });
    return;
  }

  try {
    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);

    if (!decoded) {
      res.status(401).json({ error: 'Invalid or expired refresh token' });
      return;
    }

    // Get user from database to ensure they still exist and are active
    const userResult = await db.query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.organization_id,
              COALESCE(r.type::text, r.name, 'user') as role
       FROM users u
       LEFT JOIN user_roles ur ON u.id = ur.user_id
       LEFT JOIN roles r ON ur.role_id = r.id
       WHERE u.id = $1 AND u.deleted_at IS NULL
       LIMIT 1`,
      [decoded.id]
    );

    if (userResult.rows.length === 0) {
      res.status(401).json({ error: 'User no longer exists' });
      return;
    }

    const user = userResult.rows[0];

    // Generate new token pair
    const tokenPayload: TokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role || 'user',
      organization_id: user.organization_id,
    };

    const { accessToken, refreshToken: newRefreshToken } = generateTokenPair(tokenPayload);

    res.json({
      accessToken,
      refreshToken: newRefreshToken,
      expiresIn: 900, // 15 minutes
      user: {
        id: user.id,
        email: user.email,
        name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
        role: user.role || 'user',
      },
    });
  } catch (err: any) {
    console.error('Refresh token error:', err);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
});

// Logout endpoint (optional - mainly for frontend cleanup)
router.post('/logout', authenticateToken, async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'User not authenticated' });
    return;
  }

  try {
    // Optionally invalidate refresh token in database
    await db.query(
      `DELETE FROM refresh_tokens WHERE user_id = $1`,
      [req.user.id]
    ).catch(() => {
      // Table might not exist, ignore
    });

    res.json({ message: 'Logged out successfully' });
  } catch (err: any) {
    console.error('Logout error:', err);
    res.status(500).json({ error: 'Logout failed' });
  }
});

export default router;
