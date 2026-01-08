import express, { Request, Response } from 'express';
import { pool as db } from '../database/db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

// ========== DOCUMENTS ROUTES ==========

/**
 * GET /api/documents
 * Récupérer tous les documents
 */
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { contact_id, deal_id, type } = req.query;
    const orgId = '00000000-0000-0000-0000-000000000001';

    let query = `
      SELECT 
        d.*,
        u.first_name || ' ' || u.last_name as uploaded_by_name,
        (SELECT COUNT(*) FROM document_versions WHERE document_id = d.id) as version_count
      FROM documents d
      LEFT JOIN users u ON d.uploaded_by = u.id
      WHERE d.organization_id = $1 AND d.deleted_at IS NULL
    `;

    const params: any[] = [orgId];
    let paramCount = 2;

    if (contact_id) {
      query += ` AND d.contact_id = $${paramCount}`;
      params.push(contact_id);
      paramCount++;
    }

    if (deal_id) {
      query += ` AND d.deal_id = $${paramCount}`;
      params.push(deal_id);
      paramCount++;
    }

    if (type) {
      query += ` AND d.document_type = $${paramCount}`;
      params.push(type);
      paramCount++;
    }

    query += ` ORDER BY d.created_at DESC`;

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err: any) {
    console.error('Error fetching documents:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/documents/stats
 * Statistiques de stockage
 */
router.get('/stats', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.user?.organization_id || '00000000-0000-0000-0000-000000000001';

    // Check if table exists and has the right columns
    const result = await db.query(
      `SELECT
        COUNT(*) as total_documents,
        COALESCE(SUM(CASE WHEN file_size IS NOT NULL THEN file_size ELSE 0 END), 0) as total_size_bytes,
        COUNT(*) FILTER (WHERE document_type = 'contract') as contracts,
        COUNT(*) FILTER (WHERE document_type = 'quote') as quotes,
        COUNT(*) FILTER (WHERE document_type = 'invoice') as invoices,
        COUNT(*) FILTER (WHERE document_type = 'proposal') as proposals,
        COUNT(*) FILTER (WHERE document_type = 'other' OR document_type = 'general' OR document_type IS NULL) as other
      FROM file_attachments
      WHERE organization_id = $1 AND deleted_at IS NULL`,
      [orgId]
    );

    res.json({
      ...result.rows[0],
      total_size_mb: Math.round((result.rows[0].total_size_bytes || 0) / 1024 / 1024 * 100) / 100,
    });
  } catch (err: any) {
    // Return empty stats on error
    res.json({
      total_documents: 0,
      total_size_bytes: 0,
      contracts: 0,
      quotes: 0,
      invoices: 0,
      proposals: 0,
      other: 0,
      total_size_mb: 0
    });
  }
});

/**
 * GET /api/documents/:id
 * Récupérer un document spécifique
 */
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const orgId = '00000000-0000-0000-0000-000000000001';

    const result = await db.query(
      `SELECT 
        d.*,
        u.first_name || ' ' || u.last_name as uploaded_by_name,
        (SELECT COUNT(*) FROM document_versions WHERE document_id = d.id) as version_count
      FROM documents d
      LEFT JOIN users u ON d.uploaded_by = u.id
      WHERE d.id = $1 AND d.organization_id = $2 AND d.deleted_at IS NULL`,
      [id, orgId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err: any) {
    console.error('Error fetching document:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/documents/upload
 * Enregistrer un nouveau document (URL-based ou reference)
 */
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, file_url, contact_id, deal_id, document_type = 'general' } = req.body;
    const orgId = '00000000-0000-0000-0000-000000000001';
    const userId = req.user?.id;

    if (!title || !file_url) {
      res.status(400).json({ error: 'title and file_url are required' });
      return;
    }

    const result = await db.query(
      `INSERT INTO file_attachments (
        organization_id,
        filename,
        original_filename,
        mime_type,
        title,
        description,
        document_type,
        contact_id,
        deal_id,
        uploaded_by,
        current_version
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 1)
      RETURNING *`,
      [
        orgId,
        file_url,
        title,
        'application/octet-stream',
        title,
        description || null,
        document_type,
        contact_id || null,
        deal_id || null,
        userId,
      ]
    );

    // Create initial version
    await db.query(
      `INSERT INTO document_versions (file_id, version_number, filename, original_filename, created_by)
       VALUES ($1, 1, $2, $3, $4)`,
      [result.rows[0].id, file_url, title, userId]
    );

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    console.error('Error creating document:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/documents/:id/versions
 * Récupérer l'historique des versions d'un document
 */
router.get('/:id/versions', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const orgId = '00000000-0000-0000-0000-000000000001';

    // Verify document exists
    const docCheck = await db.query(
      'SELECT id FROM file_attachments WHERE id = $1 AND organization_id = $2',
      [id, orgId]
    );

    if (docCheck.rows.length === 0) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    const result = await db.query(
      `SELECT 
        v.*,
        u.first_name || ' ' || u.last_name as created_by_name
      FROM document_versions v
      LEFT JOIN users u ON v.created_by = u.id
      WHERE v.file_id = $1
      ORDER BY v.version_number DESC`,
      [id]
    );

    res.json(result.rows);
  } catch (err: any) {
    console.error('Error fetching document versions:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/documents/:id/new-version
 * Enregistrer une nouvelle version d'un document
 */
router.post('/:id/new-version', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { file_url } = req.body;
    const orgId = '00000000-0000-0000-0000-000000000001';
    const userId = req.user?.id;

    if (!file_url) {
      res.status(400).json({ error: 'file_url is required' });
      return;
    }

    // Get current version
    const docResult = await db.query(
      'SELECT current_version FROM file_attachments WHERE id = $1 AND organization_id = $2',
      [id, orgId]
    );

    if (docResult.rows.length === 0) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    const newVersion = (docResult.rows[0].current_version || 0) + 1;

    // Update document
    await db.query(
      `UPDATE file_attachments 
       SET filename = $1, current_version = $2, updated_at = NOW()
       WHERE id = $3`,
      [file_url, newVersion, id]
    );

    // Create version record
    const result = await db.query(
      `INSERT INTO document_versions (file_id, version_number, filename, original_filename, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id, newVersion, file_url, file_url, userId]
    );

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    console.error('Error uploading new version:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/documents/:id
 * Supprimer un document (soft delete)
 */
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const orgId = '00000000-0000-0000-0000-000000000001';
    const userId = req.user?.id;

    const result = await db.query(
      `UPDATE file_attachments 
       SET deleted_at = NOW() 
       WHERE id = $1 AND organization_id = $2 
       RETURNING *`,
      [id, orgId]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    // Log deletion
    await db.query(
      `INSERT INTO audit_logs (organization_id, user_id, action, entity_type, entity_id, changes)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [orgId, userId, 'DELETE', 'document', id, JSON.stringify(result.rows[0])]
    );

    res.json({ message: 'Document deleted successfully' });
  } catch (err: any) {
    console.error('Error deleting document:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/documents/:id/share
 * Partager un document avec des utilisateurs externes
 */
router.post('/:id/share', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { email, access_type = 'view', expiration_date } = req.body;
    const orgId = '00000000-0000-0000-0000-000000000001';
    const userId = req.user?.id;

    if (!email) {
      res.status(400).json({ error: 'email is required' });
      return;
    }

    // Create share link
    const shareToken = require('crypto').randomBytes(32).toString('hex');

    const result = await db.query(
      `INSERT INTO document_shares (
        file_id,
        organization_id,
        shared_with_email,
        access_type,
        share_token,
        expiration_date,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [id, orgId, email, access_type, shareToken, expiration_date || null, userId]
    );

    // TODO: Send share email

    res.status(201).json({
      ...result.rows[0],
      share_link: `${process.env.APP_URL}/docs/share/${shareToken}`,
    });
  } catch (err: any) {
    console.error('Error sharing document:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/documents/stats/storage
 * Statistiques de stockage
 */
router.get('/stats/storage', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const orgId = '00000000-0000-0000-0000-000000000001';

    const result = await db.query(
      `SELECT 
        COUNT(*) as total_documents,
        SUM(file_size) as total_size_bytes,
        COUNT(*) FILTER (WHERE document_type = 'contract') as contracts,
        COUNT(*) FILTER (WHERE document_type = 'quote') as quotes,
        COUNT(*) FILTER (WHERE document_type = 'invoice') as invoices,
        COUNT(*) FILTER (WHERE document_type = 'proposal') as proposals,
        COUNT(*) FILTER (WHERE document_type = 'other') as other
      FROM file_attachments
      WHERE organization_id = $1 AND deleted_at IS NULL`,
      [orgId]
    );

    res.json({
      ...result.rows[0],
      total_size_mb: Math.round((result.rows[0].total_size_bytes || 0) / 1024 / 1024 * 100) / 100,
    });
  } catch (err: any) {
    console.error('Error fetching storage stats:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
