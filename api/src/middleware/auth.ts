import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import db from '../database/db';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Extend Express Request type to include user
export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
  };
}

// Middleware to verify JWT token
export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({ error: 'Access denied. No token provided.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: number;
      email: string;
      role: string;
    };

    // Verify user still exists in database
    db.get(
      'SELECT id, email, role FROM users WHERE id = ?',
      [decoded.id],
      (err, row: any) => {
        if (err) {
          res.status(500).json({ error: 'Database error' });
          return;
        }

        if (!row) {
          res.status(401).json({ error: 'Invalid token. User not found.' });
          return;
        }

        req.user = {
          id: row.id,
          email: row.email,
          role: row.role,
        };

        next();
      }
    );
  } catch (error) {
    res.status(403).json({ error: 'Invalid or expired token' });
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
