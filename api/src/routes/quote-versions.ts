import express, { Response } from 'express';
import { pool as db } from '../database/db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

// ==========================================
// VERSIONING DES DEVIS
// ==========================================

// Liste des versions d'un devis
router.get('/:quoteId/versions', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { quoteId } = req.params;

    const result = await db.query(`
      SELECT
        qv.*,
        u.first_name || ' ' || u.last_name as created_by_name
      FROM quote_versions qv
      LEFT JOIN users u ON qv.created_by = u.id
      WHERE qv.quote_id = $1
      ORDER BY qv.version_number DESC
    `, [quoteId]);

    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Détail d'une version
router.get('/:quoteId/versions/:versionNumber', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { quoteId, versionNumber } = req.params;

    const result = await db.query(`
      SELECT
        qv.*,
        u.first_name || ' ' || u.last_name as created_by_name
      FROM quote_versions qv
      LEFT JOIN users u ON qv.created_by = u.id
      WHERE qv.quote_id = $1 AND qv.version_number = $2
    `, [quoteId, versionNumber]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Version non trouvée' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Créer une nouvelle version
router.post('/:quoteId/versions', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { quoteId } = req.params;
    const { change_reason, change_summary } = req.body;
    const userId = (req.user as any)?.id;

    // Vérifier que le devis existe
    const quoteResult = await db.query('SELECT * FROM quotes WHERE id = $1', [quoteId]);

    if (quoteResult.rows.length === 0) {
      res.status(404).json({ error: 'Devis non trouvé' });
      return;
    }

    const quote = quoteResult.rows[0];

    // Récupérer les items
    const itemsResult = await db.query('SELECT * FROM quote_items WHERE quote_id = $1 ORDER BY sort_order', [quoteId]);

    // Déterminer le numéro de version
    const versionResult = await db.query(
      'SELECT COALESCE(MAX(version_number), 0) + 1 as next_version FROM quote_versions WHERE quote_id = $1',
      [quoteId]
    );
    const newVersion = versionResult.rows[0].next_version;

    // Créer la version
    const result = await db.query(`
      INSERT INTO quote_versions (
        quote_id, version_number, quote_data, items_data,
        change_reason, change_summary, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      quoteId,
      newVersion,
      JSON.stringify(quote),
      JSON.stringify(itemsResult.rows),
      change_reason,
      change_summary,
      userId
    ]);

    // Mettre à jour le numéro de version du devis
    await db.query('UPDATE quotes SET current_version = $1, updated_at = NOW() WHERE id = $2', [newVersion, quoteId]);

    res.status(201).json({
      ...result.rows[0],
      message: `Version ${newVersion} créée`
    });
  } catch (err: any) {
    console.error('Erreur création version:', err);
    res.status(500).json({ error: err.message });
  }
});

// Restaurer une version
router.post('/:quoteId/versions/:versionNumber/restore', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { quoteId, versionNumber } = req.params;
    const userId = (req.user as any)?.id;

    // Récupérer la version
    const versionResult = await db.query(
      'SELECT * FROM quote_versions WHERE quote_id = $1 AND version_number = $2',
      [quoteId, versionNumber]
    );

    if (versionResult.rows.length === 0) {
      res.status(404).json({ error: 'Version non trouvée' });
      return;
    }

    const version = versionResult.rows[0];
    const quoteData = version.quote_data;
    const itemsData = version.items_data;

    // Créer une nouvelle version avant restauration (sauvegarde)
    const currentQuote = await db.query('SELECT * FROM quotes WHERE id = $1', [quoteId]);
    const currentItems = await db.query('SELECT * FROM quote_items WHERE quote_id = $1', [quoteId]);

    const backupVersionResult = await db.query(
      'SELECT COALESCE(MAX(version_number), 0) + 1 as next_version FROM quote_versions WHERE quote_id = $1',
      [quoteId]
    );
    const backupVersion = backupVersionResult.rows[0].next_version;

    await db.query(`
      INSERT INTO quote_versions (
        quote_id, version_number, quote_data, items_data,
        change_reason, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      quoteId,
      backupVersion,
      JSON.stringify(currentQuote.rows[0]),
      JSON.stringify(currentItems.rows),
      `Sauvegarde avant restauration de la version ${versionNumber}`,
      userId
    ]);

    // Restaurer le devis
    await db.query(`
      UPDATE quotes SET
        title = $1,
        description = $2,
        subtotal = $3,
        tax_rate = $4,
        tax_amount = $5,
        total_amount = $6,
        discount_type = $7,
        discount_percent = $8,
        discount_amount = $9,
        payment_terms = $10,
        notes = $11,
        current_version = $12,
        updated_at = NOW()
      WHERE id = $13
    `, [
      quoteData.title,
      quoteData.description,
      quoteData.subtotal,
      quoteData.tax_rate,
      quoteData.tax_amount,
      quoteData.total_amount,
      quoteData.discount_type || 'none',
      quoteData.discount_percent || 0,
      quoteData.discount_amount || 0,
      quoteData.payment_terms,
      quoteData.notes,
      backupVersion + 1,
      quoteId
    ]);

    // Supprimer les items actuels
    await db.query('DELETE FROM quote_items WHERE quote_id = $1', [quoteId]);

    // Restaurer les items
    for (const item of itemsData) {
      await db.query(`
        INSERT INTO quote_items (
          quote_id, product_id, description, quantity,
          unit_price, total_price, discount_percent, tax_rate, sort_order
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        quoteId,
        item.product_id,
        item.description,
        item.quantity,
        item.unit_price,
        item.total_price,
        item.discount_percent || 0,
        item.tax_rate,
        item.sort_order || 0
      ]);
    }

    // Créer une version pour la restauration
    const newVersionNum = backupVersion + 1;
    const restoredQuote = await db.query('SELECT * FROM quotes WHERE id = $1', [quoteId]);
    const restoredItems = await db.query('SELECT * FROM quote_items WHERE quote_id = $1', [quoteId]);

    await db.query(`
      INSERT INTO quote_versions (
        quote_id, version_number, quote_data, items_data,
        change_reason, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      quoteId,
      newVersionNum,
      JSON.stringify(restoredQuote.rows[0]),
      JSON.stringify(restoredItems.rows),
      `Restauration de la version ${versionNumber}`,
      userId
    ]);

    await db.query('UPDATE quotes SET current_version = $1 WHERE id = $2', [newVersionNum, quoteId]);

    res.json({
      message: `Version ${versionNumber} restaurée avec succès`,
      new_version: newVersionNum
    });
  } catch (err: any) {
    console.error('Erreur restauration version:', err);
    res.status(500).json({ error: err.message });
  }
});

// Comparer deux versions
router.get('/:quoteId/versions/compare', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { quoteId } = req.params;
    const { v1, v2 } = req.query;

    if (!v1 || !v2) {
      res.status(400).json({ error: 'Paramètres v1 et v2 requis' });
      return;
    }

    const version1Result = await db.query(
      'SELECT * FROM quote_versions WHERE quote_id = $1 AND version_number = $2',
      [quoteId, v1]
    );

    const version2Result = await db.query(
      'SELECT * FROM quote_versions WHERE quote_id = $1 AND version_number = $2',
      [quoteId, v2]
    );

    if (version1Result.rows.length === 0 || version2Result.rows.length === 0) {
      res.status(404).json({ error: 'Une ou plusieurs versions non trouvées' });
      return;
    }

    const v1Data = version1Result.rows[0];
    const v2Data = version2Result.rows[0];

    // Comparer les données
    const differences = {
      quote: {} as any,
      items: {
        added: [] as any[],
        removed: [] as any[],
        modified: [] as any[]
      }
    };

    // Comparer les champs du devis
    const quoteFields = ['title', 'description', 'subtotal', 'tax_rate', 'tax_amount', 'total_amount', 'discount_percent', 'discount_amount'];
    for (const field of quoteFields) {
      if (v1Data.quote_data[field] !== v2Data.quote_data[field]) {
        differences.quote[field] = {
          v1: v1Data.quote_data[field],
          v2: v2Data.quote_data[field]
        };
      }
    }

    // Comparer les items (simplification)
    const v1Items = v1Data.items_data || [];
    const v2Items = v2Data.items_data || [];

    // Utiliser product_id ou description comme clé
    const v1Map = new Map(v1Items.map((i: any) => [i.product_id || i.description, i]));
    const v2Map = new Map(v2Items.map((i: any) => [i.product_id || i.description, i]));

    for (const [key, item] of v2Map as any) {
      if (!v1Map.has(key)) {
        differences.items.added.push(item);
      } else {
        const oldItem = v1Map.get(key);
        if (JSON.stringify(oldItem) !== JSON.stringify(item)) {
          differences.items.modified.push({ old: oldItem, new: item });
        }
      }
    }

    for (const [key, item] of v1Map as any) {
      if (!v2Map.has(key)) {
        differences.items.removed.push(item);
      }
    }

    res.json({
      version1: { number: v1, created_at: v1Data.created_at, change_reason: v1Data.change_reason },
      version2: { number: v2, created_at: v2Data.created_at, change_reason: v2Data.change_reason },
      differences,
      has_changes: Object.keys(differences.quote).length > 0 ||
                   differences.items.added.length > 0 ||
                   differences.items.removed.length > 0 ||
                   differences.items.modified.length > 0
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
