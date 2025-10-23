import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import db from '../database/db';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Extend Express Request type to include user
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    organization_id?: string;
  };
}

// Middleware to verify JWT token
export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({ error: 'Access denied. No token provided.' });
    return;
  }

  // Validate token format (JWT has 3 parts separated by dots)
  if (typeof token !== 'string' || token.split('.').length !== 3) {
    res.status(401).json({ error: 'Invalid token format.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      email: string;
      role: string;
    };

    // Verify user still exists in database and get their role
    const result = await db.query(
      `SELECT u.id, u.email, u.first_name, u.last_name, 
              COALESCE(r.type::text, r.name, 'user') as role
       FROM users u
       LEFT JOIN user_roles ur ON u.id = ur.user_id
       LEFT JOIN roles r ON ur.role_id = r.id
       WHERE u.id = $1 AND u.deleted_at IS NULL
       LIMIT 1`,
      [decoded.id]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ error: 'Invalid token. User not found.' });
      return;
    }

    const row = result.rows[0];
    req.user = {
      id: row.id,
      email: row.email,
      role: row.role || 'user',
    };

    next();
  } catch (error: any) {
    // Better error handling for JWT errors
    if (error.name === 'JsonWebTokenError') {
      console.error('JWT verification failed:', error.message);
      res.status(401).json({ error: 'Invalid token format or signature.' });
    } else if (error.name === 'TokenExpiredError') {
      console.error('Token expired:', error.message);
      res.status(401).json({ error: 'Token has expired.' });
    } else {
      console.error('Token verification error:', error);
      res.status(403).json({ error: 'Invalid or expired token' });
    }
  }
};

// Middleware to check if user has required role
export const authorizeRole = (...allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: 'Access denied. Insufficient permissions.',
        requiredRole: allowedRoles,
        currentRole: req.user.role
      });
      return;
    }

    next();
  };
};
