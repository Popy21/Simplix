import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { db } from '../database/db';

export interface ApiAuthRequest extends Request {
  apiKey?: {
    id: string;
    organizationId: string;
    scopes: string[];
  };
}

export const apiAuth = async (
  req: ApiAuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'unauthorized',
        message: 'API key required. Use: Authorization: Bearer YOUR_API_KEY'
      });
    }

    const apiKey = authHeader.substring(7);

    if (!apiKey.startsWith('sk_live_') && !apiKey.startsWith('sk_test_')) {
      return res.status(401).json({
        error: 'invalid_api_key',
        message: 'Invalid API key format'
      });
    }

    const keyHash = crypto
      .createHash('sha256')
      .update(apiKey)
      .digest('hex');

    const result = await db.query(
      `SELECT id, organization_id, scopes, rate_limit_per_hour, is_active, expires_at, allowed_ips
       FROM api_keys
       WHERE key_hash = $1`,
      [keyHash]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'invalid_api_key',
        message: 'API key not found'
      });
    }

    const keyData = result.rows[0];

    if (!keyData.is_active) {
      return res.status(401).json({
        error: 'api_key_inactive',
        message: 'This API key has been deactivated'
      });
    }

    if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
      return res.status(401).json({
        error: 'api_key_expired',
        message: 'This API key has expired'
      });
    }

    // Update usage
    db.query(
      'UPDATE api_keys SET usage_count = usage_count + 1, last_used_at = NOW() WHERE id = $1',
      [keyData.id]
    ).catch(err => console.error('Failed to increment usage:', err));

    req.apiKey = {
      id: keyData.id,
      organizationId: keyData.organization_id,
      scopes: keyData.scopes
    };

    next();
  } catch (error) {
    console.error('API Auth error:', error);
    res.status(500).json({
      error: 'internal_error',
      message: 'Authentication failed'
    });
  }
};

export const requireScope = (requiredScope: string) => {
  return (req: ApiAuthRequest, res: Response, next: NextFunction) => {
    if (!req.apiKey) {
      return res.status(401).json({ error: 'unauthorized' });
    }

    if (!req.apiKey.scopes.includes(requiredScope) && !req.apiKey.scopes.includes('admin')) {
      return res.status(403).json({
        error: 'insufficient_permissions',
        message: `This operation requires '${requiredScope}' scope`
      });
    }

    next();
  };
};
