import crypto from 'crypto';
import { db } from '../../database/db';
import { v4 as uuidv4 } from 'uuid';

export class ApiKeyService {
  async createKey(
    organizationId: string,
    userId: string,
    name: string,
    options: {
      scopes?: string[];
      rateLimit?: number;
      expiresAt?: Date;
      environment?: 'live' | 'test';
    } = {}
  ): Promise<{ key: string; keyId: string }> {
    const randomBytes = crypto.randomBytes(32);
    const keyPrefix = options.environment === 'test' ? 'sk_test_' : 'sk_live_';
    const key = keyPrefix + randomBytes.toString('base64url');

    const keyHash = crypto
      .createHash('sha256')
      .update(key)
      .digest('hex');

    const keyLast4 = key.slice(-4);

    const result = await db.query(
      `INSERT INTO api_keys
       (organization_id, key_name, key_prefix, key_hash, key_last_4, scopes,
        rate_limit_per_hour, expires_at, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [
        organizationId,
        name,
        keyPrefix,
        keyHash,
        keyLast4,
        JSON.stringify(options.scopes || ['read']),
        options.rateLimit || 1000,
        options.expiresAt,
        userId
      ]
    );

    return {
      key,
      keyId: result.rows[0].id
    };
  }

  async revokeKey(keyId: string, userId: string, reason: string): Promise<void> {
    await db.query(
      `UPDATE api_keys
       SET is_active = false, revoked_at = NOW(), revoked_by = $1, revoke_reason = $2
       WHERE id = $3`,
      [userId, reason, keyId]
    );
  }

  async listKeys(organizationId: string): Promise<any[]> {
    const result = await db.query(
      `SELECT id, key_name, key_prefix, key_last_4, scopes, is_active,
              rate_limit_per_hour, usage_count, last_used_at, created_at, expires_at
       FROM api_keys
       WHERE organization_id = $1
       ORDER BY created_at DESC`,
      [organizationId]
    );

    return result.rows;
  }
}
