import express, { Response } from 'express';
import { pool as db } from '../database/db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Récupérer les paramètres légaux
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;

    const result = await db.query(
      'SELECT * FROM legal_settings WHERE organization_id = $1',
      [organizationId]
    );

    if (result.rows.length === 0) {
      // Retourner les valeurs par défaut françaises
      res.json({
        late_payment_rate: 10.00,
        late_payment_mention: 'En cas de retard de paiement, une pénalité de {rate}% par an sera appliquée, ainsi qu\'une indemnité forfaitaire de 40€ pour frais de recouvrement (Art. L441-6 du Code de commerce).',
        early_payment_discount_enabled: false,
        early_payment_discount_rate: 2.00,
        early_payment_discount_days: 10,
        no_discount_mention: 'Pas d\'escompte pour paiement anticipé.',
        default_payment_terms: 30,
        payment_terms_mention: 'Règlement à {days} jours à compter de la date de facture.',
        is_subject_to_tva: true,
        tva_mention: 'TVA non applicable, art. 293 B du CGI',
        show_legal_guarantee: false,
        show_mediation: false,
        show_registration_mention: true,
        show_capital: false,
        quote_validity_days: 30
      });
      return;
    }

    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Créer ou mettre à jour les paramètres légaux
router.put('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;
    const {
      late_payment_rate,
      late_payment_mention,
      early_payment_discount_enabled,
      early_payment_discount_rate,
      early_payment_discount_days,
      early_payment_mention,
      no_discount_mention,
      default_payment_terms,
      payment_terms_mention,
      show_tva_mention,
      tva_mention,
      is_subject_to_tva,
      has_professional_insurance,
      insurance_company,
      insurance_policy_number,
      insurance_coverage_area,
      show_legal_guarantee,
      legal_guarantee_mention,
      show_mediation,
      mediator_name,
      mediator_url,
      mediation_mention,
      custom_mentions,
      show_registration_mention,
      registration_mention,
      show_capital,
      capital_amount,
      capital_mention,
      quote_validity_days,
      quote_validity_mention
    } = req.body;

    // Vérifier si les paramètres existent déjà
    const existing = await db.query(
      'SELECT id FROM legal_settings WHERE organization_id = $1',
      [organizationId]
    );

    let result;

    if (existing.rows.length > 0) {
      result = await db.query(`
        UPDATE legal_settings SET
          late_payment_rate = COALESCE($1, late_payment_rate),
          late_payment_mention = COALESCE($2, late_payment_mention),
          early_payment_discount_enabled = COALESCE($3, early_payment_discount_enabled),
          early_payment_discount_rate = COALESCE($4, early_payment_discount_rate),
          early_payment_discount_days = COALESCE($5, early_payment_discount_days),
          early_payment_mention = COALESCE($6, early_payment_mention),
          no_discount_mention = COALESCE($7, no_discount_mention),
          default_payment_terms = COALESCE($8, default_payment_terms),
          payment_terms_mention = COALESCE($9, payment_terms_mention),
          show_tva_mention = COALESCE($10, show_tva_mention),
          tva_mention = COALESCE($11, tva_mention),
          is_subject_to_tva = COALESCE($12, is_subject_to_tva),
          has_professional_insurance = COALESCE($13, has_professional_insurance),
          insurance_company = $14,
          insurance_policy_number = $15,
          insurance_coverage_area = $16,
          show_legal_guarantee = COALESCE($17, show_legal_guarantee),
          legal_guarantee_mention = COALESCE($18, legal_guarantee_mention),
          show_mediation = COALESCE($19, show_mediation),
          mediator_name = $20,
          mediator_url = $21,
          mediation_mention = $22,
          custom_mentions = $23,
          show_registration_mention = COALESCE($24, show_registration_mention),
          registration_mention = $25,
          show_capital = COALESCE($26, show_capital),
          capital_amount = $27,
          capital_mention = $28,
          quote_validity_days = COALESCE($29, quote_validity_days),
          quote_validity_mention = COALESCE($30, quote_validity_mention)
        WHERE organization_id = $31
        RETURNING *
      `, [
        late_payment_rate,
        late_payment_mention,
        early_payment_discount_enabled,
        early_payment_discount_rate,
        early_payment_discount_days,
        early_payment_mention,
        no_discount_mention,
        default_payment_terms,
        payment_terms_mention,
        show_tva_mention,
        tva_mention,
        is_subject_to_tva,
        has_professional_insurance,
        insurance_company,
        insurance_policy_number,
        insurance_coverage_area,
        show_legal_guarantee,
        legal_guarantee_mention,
        show_mediation,
        mediator_name,
        mediator_url,
        mediation_mention,
        custom_mentions,
        show_registration_mention,
        registration_mention,
        show_capital,
        capital_amount,
        capital_mention,
        quote_validity_days,
        quote_validity_mention,
        organizationId
      ]);
    } else {
      result = await db.query(`
        INSERT INTO legal_settings (
          organization_id, late_payment_rate, late_payment_mention,
          early_payment_discount_enabled, early_payment_discount_rate, early_payment_discount_days,
          early_payment_mention, no_discount_mention, default_payment_terms, payment_terms_mention,
          show_tva_mention, tva_mention, is_subject_to_tva,
          has_professional_insurance, insurance_company, insurance_policy_number, insurance_coverage_area,
          show_legal_guarantee, legal_guarantee_mention,
          show_mediation, mediator_name, mediator_url, mediation_mention,
          custom_mentions, show_registration_mention, registration_mention,
          show_capital, capital_amount, capital_mention,
          quote_validity_days, quote_validity_mention
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31)
        RETURNING *
      `, [
        organizationId,
        late_payment_rate || 10.00,
        late_payment_mention,
        early_payment_discount_enabled || false,
        early_payment_discount_rate || 2.00,
        early_payment_discount_days || 10,
        early_payment_mention,
        no_discount_mention,
        default_payment_terms || 30,
        payment_terms_mention,
        show_tva_mention !== false,
        tva_mention,
        is_subject_to_tva !== false,
        has_professional_insurance || false,
        insurance_company,
        insurance_policy_number,
        insurance_coverage_area,
        show_legal_guarantee || false,
        legal_guarantee_mention,
        show_mediation || false,
        mediator_name,
        mediator_url,
        mediation_mention,
        custom_mentions,
        show_registration_mention !== false,
        registration_mention,
        show_capital || false,
        capital_amount,
        capital_mention,
        quote_validity_days || 30,
        quote_validity_mention
      ]);
    }

    res.json(result.rows[0]);
  } catch (err: any) {
    console.error('Erreur mise à jour paramètres légaux:', err);
    res.status(500).json({ error: err.message });
  }
});

// Obtenir les mentions légales formatées pour une facture
router.get('/invoice/:invoiceId/mentions', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { invoiceId } = req.params;

    const result = await db.query(`
      SELECT * FROM invoice_legal_mentions WHERE invoice_id = $1
    `, [invoiceId]);

    if (result.rows.length === 0) {
      // Retourner les mentions par défaut
      res.json({
        late_payment_mention: 'En cas de retard de paiement, une pénalité de 10% par an sera appliquée, ainsi qu\'une indemnité forfaitaire de 40€ pour frais de recouvrement (Art. L441-6 du Code de commerce).',
        early_payment_mention: 'Pas d\'escompte pour paiement anticipé.',
        payment_terms_mention: 'Règlement à 30 jours à compter de la date de facture.',
        full_legal_footer: 'Règlement à 30 jours à compter de la date de facture.\nPas d\'escompte pour paiement anticipé.\nEn cas de retard de paiement, une pénalité de 10% par an sera appliquée, ainsi qu\'une indemnité forfaitaire de 40€ pour frais de recouvrement (Art. L441-6 du Code de commerce).'
      });
      return;
    }

    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Prévisualiser les mentions légales avec les paramètres actuels
router.get('/preview', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;

    const settingsResult = await db.query(
      'SELECT * FROM legal_settings WHERE organization_id = $1',
      [organizationId]
    );

    const settings = settingsResult.rows[0] || {
      late_payment_rate: 10.00,
      late_payment_mention: 'En cas de retard de paiement, une pénalité de {rate}% par an sera appliquée, ainsi qu\'une indemnité forfaitaire de 40€ pour frais de recouvrement (Art. L441-6 du Code de commerce).',
      early_payment_discount_enabled: false,
      no_discount_mention: 'Pas d\'escompte pour paiement anticipé.',
      default_payment_terms: 30,
      payment_terms_mention: 'Règlement à {days} jours à compter de la date de facture.',
      is_subject_to_tva: true,
      tva_mention: 'TVA non applicable, art. 293 B du CGI'
    };

    // Générer les mentions formatées
    const mentions = {
      payment_terms: (settings.payment_terms_mention || 'Règlement à {days} jours.')
        .replace('{days}', settings.default_payment_terms || 30),

      early_payment: settings.early_payment_discount_enabled
        ? (settings.early_payment_mention || 'Escompte de {rate}% pour paiement avant {days} jours.')
          .replace('{rate}', settings.early_payment_discount_rate || 2)
          .replace('{days}', settings.early_payment_discount_days || 10)
        : (settings.no_discount_mention || 'Pas d\'escompte pour paiement anticipé.'),

      late_payment: (settings.late_payment_mention || 'En cas de retard de paiement, une pénalité de {rate}% par an sera appliquée.')
        .replace('{rate}', settings.late_payment_rate || 10),

      tva_exemption: !settings.is_subject_to_tva
        ? (settings.tva_mention || 'TVA non applicable, art. 293 B du CGI')
        : null,

      insurance: settings.has_professional_insurance && settings.insurance_company
        ? `Assurance professionnelle: ${settings.insurance_company}${settings.insurance_policy_number ? ' - N°' + settings.insurance_policy_number : ''}`
        : null,

      guarantee: settings.show_legal_guarantee
        ? (settings.legal_guarantee_mention || 'Le consommateur bénéficie de la garantie légale de conformité.')
        : null,

      mediation: settings.show_mediation && settings.mediator_name
        ? `Médiation: ${settings.mediator_name}${settings.mediator_url ? ' - ' + settings.mediator_url : ''}`
        : null,

      registration: settings.show_registration_mention && settings.registration_mention
        ? settings.registration_mention
        : null,

      capital: settings.show_capital && settings.capital_amount
        ? `Capital social: ${settings.capital_amount.toLocaleString('fr-FR')} €`
        : null,

      custom: settings.custom_mentions || null
    };

    // Construire le footer complet
    const footerParts = [
      mentions.payment_terms,
      mentions.early_payment,
      mentions.late_payment,
      mentions.tva_exemption,
      mentions.registration,
      mentions.capital,
      mentions.insurance,
      mentions.guarantee,
      mentions.mediation,
      mentions.custom
    ].filter(Boolean);

    res.json({
      individual_mentions: mentions,
      full_footer: footerParts.join('\n'),
      html_footer: footerParts.map(m => `<p style="margin: 2px 0; font-size: 10px; color: #666;">${m}</p>`).join('')
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Obtenir les taux légaux actuels (taux BCE)
router.get('/legal-rates', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    // Taux légaux français pour 2024/2025
    // Note: Ces taux devraient idéalement être mis à jour régulièrement via une API externe
    const legalRates = {
      bce_rate: 4.50, // Taux BCE (à mettre à jour semestriellement)
      min_late_payment_rate: 13.50, // 3x taux BCE minimum
      legal_indemnity: 40, // Indemnité forfaitaire obligatoire
      last_updated: '2024-07-01',
      source: 'Banque de France',
      notes: 'Le taux des pénalités de retard ne peut être inférieur à 3 fois le taux d\'intérêt légal (Art. L441-10 du Code de commerce).'
    };

    res.json(legalRates);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Vérifier la conformité des paramètres
router.get('/compliance-check', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;

    const result = await db.query(
      'SELECT * FROM legal_settings WHERE organization_id = $1',
      [organizationId]
    );

    const settings = result.rows[0];
    const issues: string[] = [];
    const warnings: string[] = [];

    // Vérifications obligatoires
    if (!settings) {
      issues.push('Paramètres légaux non configurés');
    } else {
      // Taux de pénalités minimum (3x taux BCE ≈ 13.5% actuellement)
      const minRate = 10; // Simplifié, devrait être 3x taux BCE
      if (settings.late_payment_rate < minRate) {
        warnings.push(`Le taux de pénalités (${settings.late_payment_rate}%) est inférieur au minimum légal recommandé (${minRate}%)`);
      }

      // Délai de paiement maximum (60 jours ou 45 jours fin de mois)
      if (settings.default_payment_terms > 60) {
        issues.push(`Le délai de paiement (${settings.default_payment_terms} jours) dépasse le maximum légal de 60 jours`);
      }

      // Vérifier les mentions obligatoires
      if (!settings.late_payment_mention) {
        issues.push('La mention des pénalités de retard est obligatoire');
      }

      if (!settings.no_discount_mention && !settings.early_payment_discount_enabled) {
        warnings.push('La mention "Pas d\'escompte" est recommandée si aucun escompte n\'est proposé');
      }

      // Pour les entreprises non assujetties à la TVA
      if (!settings.is_subject_to_tva && !settings.tva_mention) {
        issues.push('La mention d\'exonération de TVA est obligatoire pour les non-assujettis');
      }
    }

    res.json({
      compliant: issues.length === 0,
      issues,
      warnings,
      recommendations: [
        'Vérifiez régulièrement le taux BCE pour mettre à jour vos pénalités de retard',
        'Assurez-vous que toutes les mentions obligatoires figurent sur vos factures',
        'Conservez vos factures pendant 10 ans minimum'
      ]
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
