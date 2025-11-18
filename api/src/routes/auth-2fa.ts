import { Router, Response } from 'express';
import * as crypto from 'crypto';
import { pool as db } from '../database/db';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const router = Router();

// ========================================
// TWO-FACTOR AUTHENTICATION (2FA)
// ========================================

/**
 * POST /api/auth/2fa/setup
 * Initialize 2FA setup for user
 */
router.post('/2fa/setup', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Generate TOTP secret
    const secret = generateTOTPSecret();
    const backupCodes = generateBackupCodes();

    // Hash backup codes before storing
    const hashedBackupCodes = await Promise.all(
      backupCodes.map(code => bcrypt.hash(code, 10))
    );

    // Save to database (not enabled yet)
    await db.query(`
      UPDATE users SET
        two_factor_secret = $1,
        two_factor_backup_codes = $2,
        updated_at = NOW()
      WHERE id = $3
    `, [secret, JSON.stringify(hashedBackupCodes), userId]);

    // Generate QR code data
    const userResult = await db.query('SELECT email FROM users WHERE id = $1', [userId]);
    const email = userResult.rows[0].email;
    const otpauthUrl = `otpauth://totp/Simplix CRM:${email}?secret=${secret}&issuer=Simplix`;

    res.json({
      secret,
      qr_code_url: otpauthUrl,
      backup_codes: backupCodes, // Show only once
      message: 'Scan QR code with your authenticator app, then verify to enable 2FA',
    });
  } catch (error: any) {
    console.error('Error setting up 2FA:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/auth/2fa/verify-setup
 * Verify and enable 2FA
 */
router.post('/2fa/verify-setup', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Verification code required' });
    }

    // Get user's secret
    const userResult = await db.query(
      'SELECT two_factor_secret FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0 || !userResult.rows[0].two_factor_secret) {
      return res.status(400).json({ error: '2FA not initialized. Call /2fa/setup first' });
    }

    const secret = userResult.rows[0].two_factor_secret;

    // Verify TOTP code
    const isValid = verifyTOTP(secret, code);

    if (!isValid) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    // Enable 2FA
    await db.query(`
      UPDATE users SET
        two_factor_enabled = true,
        updated_at = NOW()
      WHERE id = $1
    `, [userId]);

    // Log security event
    await db.query(`
      INSERT INTO security_events (user_id, event_type, severity, description)
      VALUES ($1, '2fa_enabled', 'medium', 'Two-factor authentication enabled')
    `, [userId]);

    res.json({
      success: true,
      message: '2FA enabled successfully',
    });
  } catch (error: any) {
    console.error('Error verifying 2FA setup:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/auth/2fa/verify
 * Verify 2FA code during login
 */
router.post('/2fa/verify', async (req, res) => {
  try {
    const { email, code, temporary_token } = req.body;

    if (!email || !code || !temporary_token) {
      return res.status(400).json({ error: 'email, code, and temporary_token required' });
    }

    // Verify temporary token
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
    let decoded: any;
    try {
      decoded = jwt.verify(temporary_token, JWT_SECRET);
      if (decoded.type !== '2fa_required') {
        throw new Error('Invalid token type');
      }
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired temporary token' });
    }

    // Get user
    const userResult = await db.query(`
      SELECT id, email, two_factor_secret, two_factor_backup_codes, organization_id
      FROM users
      WHERE email = $1 AND deleted_at IS NULL
    `, [email]);

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Try TOTP code first
    let isValid = verifyTOTP(user.two_factor_secret, code);

    // If TOTP fails, try backup codes
    if (!isValid && user.two_factor_backup_codes) {
      const backupCodes = JSON.parse(user.two_factor_backup_codes);
      for (let i = 0; i < backupCodes.length; i++) {
        const matches = await bcrypt.compare(code, backupCodes[i]);
        if (matches) {
          isValid = true;
          // Remove used backup code
          backupCodes.splice(i, 1);
          await db.query(
            'UPDATE users SET two_factor_backup_codes = $1 WHERE id = $2',
            [JSON.stringify(backupCodes), user.id]
          );
          break;
        }
      }
    }

    if (!isValid) {
      // Log failed attempt
      await db.query(`
        INSERT INTO login_history (user_id, email, ip_address, status, failure_reason)
        VALUES ($1, $2, $3, 'failed', '2FA code invalid')
      `, [user.id, email, req.ip]);

      return res.status(401).json({ error: 'Invalid 2FA code' });
    }

    // Generate real JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, organization_id: user.organization_id },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    // Update last login
    await db.query(`
      UPDATE users SET
        last_login_at = NOW(),
        last_login_ip = $1,
        failed_login_attempts = 0
      WHERE id = $2
    `, [req.ip, user.id]);

    // Log successful login
    await db.query(`
      INSERT INTO login_history (user_id, email, ip_address, user_agent, status)
      VALUES ($1, $2, $3, $4, 'success')
    `, [user.id, email, req.ip, req.headers['user-agent']]);

    res.json({ token, user: { id: user.id, email: user.email } });
  } catch (error: any) {
    console.error('Error verifying 2FA:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/auth/2fa/disable
 * Disable 2FA for user
 */
router.post('/2fa/disable', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password required to disable 2FA' });
    }

    // Verify password
    const userResult = await db.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
    const user = userResult.rows[0];

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Disable 2FA
    await db.query(`
      UPDATE users SET
        two_factor_enabled = false,
        two_factor_secret = NULL,
        two_factor_backup_codes = NULL,
        updated_at = NOW()
      WHERE id = $1
    `, [userId]);

    // Log security event
    await db.query(`
      INSERT INTO security_events (user_id, event_type, severity, description)
      VALUES ($1, '2fa_disabled', 'high', 'Two-factor authentication disabled')
    `, [userId]);

    res.json({
      success: true,
      message: '2FA disabled successfully',
    });
  } catch (error: any) {
    console.error('Error disabling 2FA:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/auth/2fa/regenerate-backup-codes
 * Generate new backup codes
 */
router.post('/2fa/regenerate-backup-codes', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password required' });
    }

    // Verify password
    const userResult = await db.query(
      'SELECT password_hash, two_factor_enabled FROM users WHERE id = $1',
      [userId]
    );
    const user = userResult.rows[0];

    if (!user.two_factor_enabled) {
      return res.status(400).json({ error: '2FA is not enabled' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Generate new backup codes
    const backupCodes = generateBackupCodes();
    const hashedBackupCodes = await Promise.all(
      backupCodes.map(code => bcrypt.hash(code, 10))
    );

    await db.query(`
      UPDATE users SET
        two_factor_backup_codes = $1,
        updated_at = NOW()
      WHERE id = $2
    `, [JSON.stringify(hashedBackupCodes), userId]);

    res.json({
      backup_codes: backupCodes,
      message: 'Save these codes securely. They will only be shown once.',
    });
  } catch (error: any) {
    console.error('Error regenerating backup codes:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Generate TOTP secret (base32)
 */
function generateTOTPSecret(): string {
  const buffer = crypto.randomBytes(20);
  return base32Encode(buffer);
}

/**
 * Generate backup codes
 */
function generateBackupCodes(count: number = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    codes.push(code);
  }
  return codes;
}

/**
 * Verify TOTP code
 */
function verifyTOTP(secret: string, token: string, window: number = 1): boolean {
  const time = Math.floor(Date.now() / 1000 / 30); // 30-second window

  for (let i = -window; i <= window; i++) {
    const totp = generateTOTP(secret, time + i);
    if (totp === token) {
      return true;
    }
  }

  return false;
}

/**
 * Generate TOTP token
 */
function generateTOTP(secret: string, time: number): string {
  const buffer = Buffer.alloc(8);
  buffer.writeBigInt64BE(BigInt(time));

  const secretBuffer = base32Decode(secret);
  const hmac = crypto.createHmac('sha1', secretBuffer);
  hmac.update(buffer);
  const digest = hmac.digest();

  const offset = digest[19] & 0xf;
  const code = (
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff)
  );

  return (code % 1000000).toString().padStart(6, '0');
}

/**
 * Base32 encode
 */
function base32Encode(buffer: Buffer): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      output += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += alphabet[(value << (5 - bits)) & 31];
  }

  return output;
}

/**
 * Base32 decode
 */
function base32Decode(input: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  let index = 0;
  const output = Buffer.alloc(Math.ceil((input.length * 5) / 8));

  for (let i = 0; i < input.length; i++) {
    const idx = alphabet.indexOf(input[i].toUpperCase());
    if (idx === -1) continue;

    value = (value << 5) | idx;
    bits += 5;

    if (bits >= 8) {
      output[index++] = (value >>> (bits - 8)) & 255;
      bits -= 8;
    }
  }

  return output.slice(0, index);
}

export default router;
