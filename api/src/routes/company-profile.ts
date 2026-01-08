import express, { Request, Response } from 'express';
import { pool } from '../database/db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

// GET /api/company-profile - Get company profile for current user
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const result = await pool.query(`
      SELECT
        id,
        user_id,
        organization_id,
        company_name,
        company_legal_form,
        company_street,
        company_postal_code,
        company_city,
        company_country,
        company_phone,
        company_email,
        company_siret,
        company_tva,
        company_rcs,
        company_capital,
        is_micro_entreprise,
        bank_iban,
        bank_bic,
        bank_name,
        logo_url,
        late_payment_penalty,
        recovery_indemnity,
        payment_terms,
        invoice_number_prefix,
        footer_text,
        created_at,
        updated_at
      FROM company_profiles
      WHERE user_id = $1
    `, [userId]);

    if (result.rows.length === 0) {
      // Return empty profile instead of 404
      res.json({
        id: null,
        user_id: userId,
        company_name: '',
        company_email: '',
        company_phone: '',
        company_siret: '',
        is_setup_complete: false
      });
      return;
    }

    res.json({ ...result.rows[0], is_setup_complete: true });
  } catch (error: any) {
    console.error('Error fetching company profile:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/company-profile - Create company profile
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const organizationId = req.user?.organization_id;

    if (!userId || !organizationId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const {
      company_name,
      company_legal_form,
      company_street,
      company_postal_code,
      company_city,
      company_country,
      company_phone,
      company_email,
      company_siret,
      company_tva,
      company_rcs,
      company_capital,
      is_micro_entreprise,
      bank_iban,
      bank_bic,
      bank_name,
      logo_url,
      late_payment_penalty,
      recovery_indemnity,
      payment_terms,
      invoice_number_prefix,
      footer_text,
    } = req.body;

    // Validation
    if (!company_name || !company_street || !company_postal_code || !company_city || !company_siret) {
      res.status(400).json({
        error: 'Les champs obligatoires sont: company_name, company_street, company_postal_code, company_city, company_siret'
      });
      return;
    }

    // Vérifier le format du SIRET (14 chiffres)
    if (!/^\d{14}$/.test(company_siret)) {
      res.status(400).json({ error: 'Le SIRET doit contenir exactement 14 chiffres' });
      return;
    }

    // Vérifier si un profil existe déjà
    const existingProfile = await pool.query(
      'SELECT id FROM company_profiles WHERE user_id = $1',
      [userId]
    );

    if (existingProfile.rows.length > 0) {
      res.status(409).json({ error: 'Un profil entreprise existe déjà pour cet utilisateur' });
      return;
    }

    const result = await pool.query(`
      INSERT INTO company_profiles (
        user_id,
        organization_id,
        company_name,
        company_legal_form,
        company_street,
        company_postal_code,
        company_city,
        company_country,
        company_phone,
        company_email,
        company_siret,
        company_tva,
        company_rcs,
        company_capital,
        is_micro_entreprise,
        bank_iban,
        bank_bic,
        bank_name,
        logo_url,
        late_payment_penalty,
        recovery_indemnity,
        payment_terms,
        invoice_number_prefix,
        footer_text
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
      RETURNING *
    `, [
      userId,
      organizationId,
      company_name,
      company_legal_form,
      company_street,
      company_postal_code,
      company_city,
      company_country || 'France',
      company_phone,
      company_email,
      company_siret,
      company_tva,
      company_rcs,
      company_capital,
      is_micro_entreprise || false,
      bank_iban,
      bank_bic,
      bank_name,
      logo_url,
      late_payment_penalty,
      recovery_indemnity,
      payment_terms,
      invoice_number_prefix,
      footer_text,
    ]);

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Error creating company profile:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/company-profile - Update company profile
router.put('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const {
      company_name,
      company_legal_form,
      company_street,
      company_postal_code,
      company_city,
      company_country,
      company_phone,
      company_email,
      company_siret,
      company_tva,
      company_rcs,
      company_capital,
      is_micro_entreprise,
      bank_iban,
      bank_bic,
      bank_name,
      logo_url,
      late_payment_penalty,
      recovery_indemnity,
      payment_terms,
      invoice_number_prefix,
      footer_text,
    } = req.body;

    // Validation
    if (!company_name || !company_street || !company_postal_code || !company_city || !company_siret) {
      res.status(400).json({
        error: 'Les champs obligatoires sont: company_name, company_street, company_postal_code, company_city, company_siret'
      });
      return;
    }

    // Vérifier le format du SIRET (14 chiffres)
    if (!/^\d{14}$/.test(company_siret)) {
      res.status(400).json({ error: 'Le SIRET doit contenir exactement 14 chiffres' });
      return;
    }

    const result = await pool.query(`
      UPDATE company_profiles
      SET
        company_name = $1,
        company_legal_form = $2,
        company_street = $3,
        company_postal_code = $4,
        company_city = $5,
        company_country = $6,
        company_phone = $7,
        company_email = $8,
        company_siret = $9,
        company_tva = $10,
        company_rcs = $11,
        company_capital = $12,
        is_micro_entreprise = $13,
        bank_iban = $14,
        bank_bic = $15,
        bank_name = $16,
        logo_url = $17,
        late_payment_penalty = $18,
        recovery_indemnity = $19,
        payment_terms = $20,
        invoice_number_prefix = $21,
        footer_text = $22,
        updated_at = NOW()
      WHERE user_id = $23
      RETURNING *
    `, [
      company_name,
      company_legal_form,
      company_street,
      company_postal_code,
      company_city,
      company_country || 'France',
      company_phone,
      company_email,
      company_siret,
      company_tva,
      company_rcs,
      company_capital,
      is_micro_entreprise,
      bank_iban,
      bank_bic,
      bank_name,
      logo_url,
      late_payment_penalty,
      recovery_indemnity,
      payment_terms,
      invoice_number_prefix,
      footer_text,
      userId,
    ]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Profil entreprise non trouvé' });
      return;
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error updating company profile:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/company-profile - Delete company profile
router.delete('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const result = await pool.query(
      'DELETE FROM company_profiles WHERE user_id = $1 RETURNING id',
      [userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Profil entreprise non trouvé' });
      return;
    }

    res.json({ message: 'Profil entreprise supprimé avec succès' });
  } catch (error: any) {
    console.error('Error deleting company profile:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
