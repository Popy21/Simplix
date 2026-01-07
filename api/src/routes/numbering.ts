import express, { Response } from 'express';
import { pool as db } from '../database/db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

// GET / - Alias pour /sequences (paramètres de numérotation)
router.get('/settings', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;

    const result = await db.query(`
      SELECT
        ds.*,
        (SELECT COUNT(*) FROM document_number_audit WHERE sequence_id = ds.id) as total_generated,
        (SELECT COUNT(*) FROM document_number_audit WHERE sequence_id = ds.id AND year = EXTRACT(YEAR FROM CURRENT_DATE)) as generated_this_year,
        (SELECT MAX(generated_at) FROM document_number_audit WHERE sequence_id = ds.id) as last_generated_at
      FROM document_sequences ds
      WHERE ds.organization_id = $1
      ORDER BY ds.document_type
    `, [organizationId]);

    res.json({
      sequences: result.rows,
      defaults: {
        invoice: { prefix: 'FAC', separator: '-', include_year: true, min_digits: 5, reset_yearly: true },
        quote: { prefix: 'DEV', separator: '-', include_year: true, min_digits: 5, reset_yearly: true },
        credit_note: { prefix: 'AV', separator: '-', include_year: true, min_digits: 5, reset_yearly: true },
        delivery_note: { prefix: 'BL', separator: '-', include_year: true, min_digits: 5, reset_yearly: true },
        purchase_order: { prefix: 'BC', separator: '-', include_year: true, min_digits: 5, reset_yearly: true }
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Récupérer toutes les séquences de l'organisation
router.get('/sequences', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;

    const result = await db.query(`
      SELECT
        ds.*,
        (SELECT COUNT(*) FROM document_number_audit WHERE sequence_id = ds.id) as total_generated,
        (SELECT COUNT(*) FROM document_number_audit WHERE sequence_id = ds.id AND year = EXTRACT(YEAR FROM CURRENT_DATE)) as generated_this_year,
        (SELECT MAX(generated_at) FROM document_number_audit WHERE sequence_id = ds.id) as last_generated_at
      FROM document_sequences ds
      WHERE ds.organization_id = $1
      ORDER BY ds.document_type
    `, [organizationId]);

    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Récupérer une séquence spécifique
router.get('/sequences/:type', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;
    const { type } = req.params;

    const result = await db.query(`
      SELECT
        ds.*,
        (SELECT COUNT(*) FROM document_number_audit WHERE sequence_id = ds.id) as total_generated,
        (SELECT COUNT(*) FROM document_number_audit WHERE sequence_id = ds.id AND year = EXTRACT(YEAR FROM CURRENT_DATE)) as generated_this_year
      FROM document_sequences ds
      WHERE ds.organization_id = $1 AND ds.document_type = $2
    `, [organizationId, type]);

    if (result.rows.length === 0) {
      // Créer la séquence avec les valeurs par défaut
      const prefixes: Record<string, string> = {
        invoice: 'FAC',
        quote: 'DEV',
        credit_note: 'AV',
        delivery_note: 'BL',
        purchase_order: 'BC'
      };

      const insertResult = await db.query(`
        INSERT INTO document_sequences (organization_id, document_type, prefix, last_number, last_year)
        VALUES ($1, $2, $3, 0, EXTRACT(YEAR FROM CURRENT_DATE))
        RETURNING *
      `, [organizationId, type, prefixes[type] || 'DOC']);

      res.json(insertResult.rows[0]);
      return;
    }

    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Mettre à jour une séquence (seulement si non verrouillée ou champs autorisés)
router.put('/sequences/:type', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;
    const { type } = req.params;
    const {
      prefix,
      separator,
      include_year,
      year_format,
      min_digits,
      reset_yearly
    } = req.body;

    // Vérifier si la séquence est verrouillée
    const checkResult = await db.query(
      'SELECT is_locked FROM document_sequences WHERE organization_id = $1 AND document_type = $2',
      [organizationId, type]
    );

    if (checkResult.rows.length > 0 && checkResult.rows[0].is_locked) {
      // Seuls certains champs peuvent être modifiés une fois verrouillé
      const result = await db.query(`
        UPDATE document_sequences SET
          separator = COALESCE($1, separator),
          updated_at = NOW()
        WHERE organization_id = $2 AND document_type = $3
        RETURNING *
      `, [separator, organizationId, type]);

      res.json({
        ...result.rows[0],
        warning: 'Séquence verrouillée - seul le séparateur peut être modifié'
      });
      return;
    }

    const result = await db.query(`
      UPDATE document_sequences SET
        prefix = COALESCE($1, prefix),
        separator = COALESCE($2, separator),
        include_year = COALESCE($3, include_year),
        year_format = COALESCE($4, year_format),
        min_digits = COALESCE($5, min_digits),
        reset_yearly = COALESCE($6, reset_yearly),
        updated_at = NOW()
      WHERE organization_id = $7 AND document_type = $8
      RETURNING *
    `, [prefix, separator, include_year, year_format, min_digits, reset_yearly, organizationId, type]);

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Séquence non trouvée' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Générer un numéro de document (utilise la fonction PL/pgSQL)
router.post('/generate/:type', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;
    const userId = (req.user as any)?.userId;
    const { type } = req.params;
    const { document_id } = req.body;

    if (!document_id) {
      res.status(400).json({ error: 'document_id requis' });
      return;
    }

    const result = await db.query(
      'SELECT generate_document_number($1, $2, $3, $4) as document_number',
      [organizationId, type, document_id, userId]
    );

    res.json({ document_number: result.rows[0].document_number });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Prévisualiser le prochain numéro (sans le générer)
router.get('/preview/:type', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;
    const { type } = req.params;

    const result = await db.query(`
      SELECT
        prefix,
        separator,
        include_year,
        year_format,
        min_digits,
        reset_yearly,
        last_number,
        last_year
      FROM document_sequences
      WHERE organization_id = $1 AND document_type = $2
    `, [organizationId, type]);

    if (result.rows.length === 0) {
      // Valeurs par défaut
      const prefixes: Record<string, string> = {
        invoice: 'FAC',
        quote: 'DEV',
        credit_note: 'AV'
      };
      const currentYear = new Date().getFullYear();
      res.json({
        next_number: `${prefixes[type] || 'DOC'}-${currentYear}-00001`,
        preview: true
      });
      return;
    }

    const seq = result.rows[0];
    const currentYear = new Date().getFullYear();
    let nextNumber;

    if (seq.reset_yearly && (!seq.last_year || seq.last_year < currentYear)) {
      nextNumber = 1;
    } else {
      nextNumber = seq.last_number + 1;
    }

    let yearStr = '';
    if (seq.include_year) {
      yearStr = seq.year_format === 'YY'
        ? String(currentYear % 100).padStart(2, '0')
        : String(currentYear);
    }

    const formattedNumber = seq.include_year
      ? `${seq.prefix}${seq.separator}${yearStr}${seq.separator}${String(nextNumber).padStart(seq.min_digits, '0')}`
      : `${seq.prefix}${seq.separator}${String(nextNumber).padStart(seq.min_digits, '0')}`;

    res.json({
      next_number: formattedNumber,
      sequence_number: nextNumber,
      year: currentYear,
      preview: true
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Audit trail des numéros générés
router.get('/audit', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;
    const { document_type, year, limit } = req.query;

    let query = `
      SELECT
        dna.*,
        u.first_name || ' ' || u.last_name as generated_by_name
      FROM document_number_audit dna
      LEFT JOIN users u ON dna.generated_by = u.id
      WHERE dna.organization_id = $1
    `;
    const params: any[] = [organizationId];

    if (document_type) {
      params.push(document_type);
      query += ` AND dna.document_type = $${params.length}`;
    }

    if (year) {
      params.push(parseInt(year as string));
      query += ` AND dna.year = $${params.length}`;
    }

    query += ' ORDER BY dna.generated_at DESC';

    if (limit) {
      params.push(parseInt(limit as string));
      query += ` LIMIT $${params.length}`;
    }

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Vérifier l'intégrité de la numérotation
router.get('/check-integrity/:type', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;
    const { type } = req.params;
    const { year } = req.query;

    const result = await db.query(
      'SELECT * FROM check_numbering_integrity($1, $2, $3)',
      [organizationId, type, year ? parseInt(year as string) : null]
    );

    if (result.rows.length === 0) {
      res.json({
        status: 'OK',
        message: 'Aucun problème de numérotation détecté',
        issues: []
      });
    } else {
      res.json({
        status: 'WARNING',
        message: 'Problèmes de numérotation détectés',
        issues: result.rows
      });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Statistiques de numérotation
router.get('/stats', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;
    const currentYear = new Date().getFullYear();

    const result = await db.query(`
      SELECT
        document_type,
        COUNT(*) as total_documents,
        MIN(sequence_number) as first_number,
        MAX(sequence_number) as last_number,
        MAX(generated_at) as last_generated
      FROM document_number_audit
      WHERE organization_id = $1 AND year = $2
      GROUP BY document_type
      ORDER BY document_type
    `, [organizationId, currentYear]);

    // Vérifier les trous pour chaque type
    const statsWithIntegrity = await Promise.all(
      result.rows.map(async (row) => {
        const integrityResult = await db.query(
          'SELECT COUNT(*) as issues FROM check_numbering_integrity($1, $2, $3)',
          [organizationId, row.document_type, currentYear]
        );
        return {
          ...row,
          has_gaps: parseInt(integrityResult.rows[0].issues) > 0
        };
      })
    );

    res.json({
      year: currentYear,
      statistics: statsWithIntegrity
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
