import express, { Router, Request, Response } from 'express';
import { pool } from '../database/db';
import { AuthRequest, authenticateToken } from '../middleware/auth';

const router = Router();

interface DuplicateCandidate {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  similarity: number;
}

interface MergeResult {
  survivingId: string;
  mergedId: string;
  fieldsUpdated: string[];
  mergedAt: string;
}

/**
 * POST /api/contacts/deduplicate/detect
 * Détecter les contacts en doublon basé sur similitude
 */
router.post('/deduplicate/detect', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { organizationId } = req.body;
    const userId = req.user!.id;

    if (!organizationId) {
      return res.status(400).json({
        error: 'organizationId est requis',
      });
    }

    // Récupérer tous les contacts
    const contactsResult = await pool.query(
      `SELECT id, name, email, phone, company, created_at
       FROM contacts
       WHERE organization_id = $1 AND deleted_at IS NULL
       ORDER BY name`,
      [organizationId]
    );

    const contacts = contactsResult.rows;
    const duplicatePairs: Array<{
      contact1: any;
      contact2: any;
      similarity: number;
      reasons: string[];
    }> = [];

    // Fonction de similarité simple (Levenshtein)
    const levenshteinSimilarity = (str1: string, str2: string): number => {
      const s1 = str1.toLowerCase().trim();
      const s2 = str2.toLowerCase().trim();
      
      if (s1 === s2) return 1;
      
      const len1 = s1.length;
      const len2 = s2.length;
      const maxLen = Math.max(len1, len2);
      
      let matches = 0;
      for (let i = 0; i < Math.min(len1, len2); i++) {
        if (s1[i] === s2[i]) matches++;
      }
      
      return matches / maxLen;
    };

    // Comparer tous les contacts
    for (let i = 0; i < contacts.length; i++) {
      for (let j = i + 1; j < contacts.length; j++) {
        const c1 = contacts[i];
        const c2 = contacts[j];
        let similarity = 0;
        const reasons: string[] = [];

        // Vérifier les emails
        if (c1.email && c2.email && c1.email === c2.email) {
          similarity += 0.4;
          reasons.push('Email identique');
        }

        // Vérifier les numéros de téléphone
        if (c1.phone && c2.phone && c1.phone === c2.phone) {
          similarity += 0.4;
          reasons.push('Téléphone identique');
        }

        // Vérifier la similarité des noms
        const nameSim = levenshteinSimilarity(c1.name, c2.name);
        similarity += nameSim * 0.2;
        if (nameSim > 0.8) {
          reasons.push('Nom similaire');
        }

        if (similarity > 0.5 && reasons.length > 0) {
          duplicatePairs.push({
            contact1: c1,
            contact2: c2,
            similarity: Math.round(similarity * 100),
            reasons,
          });
        }
      }
    }

    res.json({
      success: true,
      duplicates: duplicatePairs,
      total: duplicatePairs.length,
    });
  } catch (error: any) {
    console.error('Erreur lors de la détection des doublons:', error);
    res.status(500).json({
      error: 'Erreur lors de la détection des doublons',
    });
  }
});

/**
 * POST /api/contacts/deduplicate/merge
 * Fusionner deux contacts
 */
router.post('/deduplicate/merge', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { survivingContactId, mergeContactId, mergedFields } = req.body;
    const userId = req.user!.id;

    if (!survivingContactId || !mergeContactId) {
      return res.status(400).json({
        error: 'survivingContactId et mergeContactId sont requis',
      });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Récupérer les deux contacts
      const survivingResult = await client.query(
        'SELECT * FROM contacts WHERE id = $1',
        [survivingContactId]
      );

      const mergeResult = await client.query(
        'SELECT * FROM contacts WHERE id = $1',
        [mergeContactId]
      );

      if (survivingResult.rows.length === 0 || mergeResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Contact non trouvé' });
      }

      const surviving = survivingResult.rows[0];
      const toMerge = mergeResult.rows[0];
      const updatedFields: string[] = [];

      // Préparer les données fusionnées
      const merged = { ...surviving };

      if (mergedFields) {
        Object.keys(mergedFields).forEach(field => {
          const value = mergedFields[field];
          if (value && (!merged[field] || merged[field].length === 0)) {
            merged[field] = value;
            updatedFields.push(field);
          }
        });
      }

      // Mettre à jour le contact principal
      const updateQuery = `
        UPDATE contacts 
        SET name = $2, email = $3, phone = $4, company = $5, 
            position = $6, notes = $7, enriched_data = $8,
            updated_at = NOW()
        WHERE id = $1
      `;

      await client.query(updateQuery, [
        survivingContactId,
        merged.name,
        merged.email,
        merged.phone,
        merged.company,
        merged.position,
        merged.notes ? `${merged.notes}\n[Fusionné avec: ${toMerge.name}]` : `[Fusionné avec: ${toMerge.name}]`,
        merged.enriched_data,
      ]);

      // Réassigner toutes les activités du contact supprimé
      await client.query(
        `UPDATE activities SET contact_id = $1 WHERE contact_id = $2`,
        [survivingContactId, mergeContactId]
      );

      // Réassigner les deals
      await client.query(
        `UPDATE deals SET contact_id = $1 WHERE contact_id = $2`,
        [survivingContactId, mergeContactId]
      );

      // Réassigner les opportunités
      await client.query(
        `UPDATE opportunities SET contact_id = $1 WHERE contact_id = $2`,
        [survivingContactId, mergeContactId]
      );

      // Soft delete du contact supprimé
      await client.query(
        `UPDATE contacts SET deleted_at = NOW() WHERE id = $1`,
        [mergeContactId]
      );

      // Enregistrer la fusion pour audit
      await client.query(
        `INSERT INTO contact_merges (surviving_id, merged_id, merged_fields, merged_by, merged_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [survivingContactId, mergeContactId, JSON.stringify(updatedFields), userId]
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'Contacts fusionnés avec succès',
        result: {
          survivingId: survivingContactId,
          mergedId: mergeContactId,
          fieldsUpdated: updatedFields,
          mergedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Erreur lors de la fusion des contacts:', error);
    res.status(500).json({
      error: 'Erreur lors de la fusion des contacts',
    });
  }
});

/**
 * GET /api/contacts/deduplicate/related/:contactId
 * Obtenir les contacts apparentés (entreprise, domaine email, etc.)
 */
router.get('/deduplicate/related/:contactId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { contactId } = req.params;

    const contactResult = await pool.query(
      'SELECT * FROM contacts WHERE id = $1',
      [contactId]
    );

    if (contactResult.rows.length === 0) {
      return res.status(404).json({ error: 'Contact non trouvé' });
    }

    const contact = contactResult.rows[0];
    const related: any[] = [];

    // Contacts de la même entreprise
    if (contact.company) {
      const companyResult = await pool.query(
        `SELECT id, name, email, phone, position
         FROM contacts
         WHERE company = $1 AND id != $2 AND deleted_at IS NULL`,
        [contact.company, contactId]
      );
      related.push({
        type: 'company',
        label: `Autres contacts de ${contact.company}`,
        contacts: companyResult.rows,
      });
    }

    // Contacts avec le même domaine email
    if (contact.email) {
      const domain = contact.email.split('@')[1];
      const domainResult = await pool.query(
        `SELECT id, name, email, phone, company
         FROM contacts
         WHERE email LIKE $1 AND id != $2 AND deleted_at IS NULL`,
        [`%@${domain}`, contactId]
      );
      related.push({
        type: 'email_domain',
        label: `Autres contacts du domaine @${domain}`,
        contacts: domainResult.rows,
      });
    }

    res.json({
      success: true,
      relatedContacts: related,
    });
  } catch (error: any) {
    console.error('Erreur lors de la récupération des contacts apparentés:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des contacts apparentés',
    });
  }
});

/**
 * POST /api/contacts/deduplicate/batch-merge
 * Fusionner plusieurs paires de doublons
 */
router.post('/deduplicate/batch-merge', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { merges } = req.body;
    const userId = req.user!.id;

    if (!Array.isArray(merges) || merges.length === 0) {
      return res.status(400).json({
        error: 'merges doit être un tableau non vide',
      });
    }

    const results: MergeResult[] = [];
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      for (const merge of merges) {
        const { survivingId, mergeId } = merge;

        if (!survivingId || !mergeId) continue;

        // Réassigner les relations
        await client.query(
          'UPDATE activities SET contact_id = $1 WHERE contact_id = $2',
          [survivingId, mergeId]
        );

        await client.query(
          'UPDATE deals SET contact_id = $1 WHERE contact_id = $2',
          [survivingId, mergeId]
        );

        // Soft delete
        await client.query(
          'UPDATE contacts SET deleted_at = NOW() WHERE id = $1',
          [mergeId]
        );

        results.push({
          survivingId,
          mergedId: mergeId,
          fieldsUpdated: [],
          mergedAt: new Date().toISOString(),
        });
      }

      await client.query('COMMIT');

      res.json({
        success: true,
        message: `${results.length} paires de contacts fusionnées`,
        results,
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Erreur lors de la fusion en masse:', error);
    res.status(500).json({
      error: 'Erreur lors de la fusion en masse',
    });
  }
});

export default router;
