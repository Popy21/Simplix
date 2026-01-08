import express, { Request, Response } from 'express';
import { pool as db } from '../database/db';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import crypto from 'crypto';
import { sendEmail, getCompanyProfile } from '../services/emailService';

const router = express.Router();

// ==========================================
// ROUTES AUTHENTIFIÉES (pour l'entreprise)
// ==========================================

// GET / - Liste des signatures de devis (alias pour /pending)
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause = `1=1`;

    if (status === 'pending') {
      whereClause += ` AND q.status = 'sent'`;
    } else if (status === 'signed') {
      whereClause += ` AND q.status = 'accepted'`;
    }

    const result = await db.query(`
      SELECT
        q.id,
        q.quote_number,
        q.title,
        q.total_amount,
        q.status,
        q.valid_until,
        q.created_at,
        c.name as customer_name,
        c.email as customer_email
      FROM quotes q
      LEFT JOIN customers c ON q.customer_id = c.id
      WHERE ${whereClause}
      ORDER BY q.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    const countResult = await db.query(`
      SELECT COUNT(*) as total FROM quotes q WHERE ${whereClause}
    `);

    res.json({
      signatures: result.rows,
      total: parseInt(countResult.rows[0].total),
      page: Number(page),
      limit: Number(limit)
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Générer un lien de signature pour un devis
router.post('/:quoteId/generate-link', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { quoteId } = req.params;
    const { terms_id, send_email } = req.body;

    // Vérifier que le devis existe
    const quoteResult = await db.query(`
      SELECT q.*, c.email as customer_email, c.name as customer_name
      FROM quotes q
      LEFT JOIN customers c ON q.customer_id = c.id
      WHERE q.id = $1
    `, [quoteId]);

    if (quoteResult.rows.length === 0) {
      res.status(404).json({ error: 'Devis non trouvé' });
      return;
    }

    const quote = quoteResult.rows[0];

    // Générer le token
    const token = crypto.randomBytes(32).toString('hex');
    const baseUrl = process.env.APP_URL || 'https://app.simplix.fr';
    const signatureUrl = `${baseUrl}/sign/${token}`;

    // Mettre à jour le devis
    await db.query(`
      UPDATE quotes SET
        signature_token = $1,
        signature_url = $2,
        terms_id = $3,
        status = CASE WHEN status = 'draft' THEN 'sent' ELSE status END
      WHERE id = $4
    `, [token, signatureUrl, terms_id, quoteId]);

    // Logger l'événement
    await db.query(`
      INSERT INTO quote_signature_events (quote_id, event_type, metadata)
      VALUES ($1, 'link_generated', $2)
    `, [quoteId, JSON.stringify({ signature_url: signatureUrl })]);

    // Envoyer par email si demandé
    if (send_email && quote.customer_email) {
      const companyProfile = await getCompanyProfile();
      const companyName = companyProfile?.company_name || 'Simplix';

      const emailHtml = generateSignatureEmailHTML(quote, signatureUrl, companyProfile);

      const emailResult = await sendEmail({
        to: quote.customer_email,
        subject: `Devis ${quote.quote_number} à signer - ${companyName}`,
        html: emailHtml
      });

      if (emailResult.success) {
        await db.query(`
          INSERT INTO quote_signature_events (quote_id, event_type, metadata)
          VALUES ($1, 'link_sent', $2)
        `, [quoteId, JSON.stringify({ email: quote.customer_email })]);
      }
    }

    res.json({
      signature_url: signatureUrl,
      token,
      quote_number: quote.quote_number
    });
  } catch (err: any) {
    console.error('Erreur génération lien signature:', err);
    res.status(500).json({ error: err.message });
  }
});

// Récupérer les événements de signature d'un devis
router.get('/:quoteId/events', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { quoteId } = req.params;

    const result = await db.query(`
      SELECT * FROM quote_signature_events
      WHERE quote_id = $1
      ORDER BY created_at DESC
    `, [quoteId]);

    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Renvoyer le lien de signature par email
router.post('/:quoteId/resend', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { quoteId } = req.params;

    const quoteResult = await db.query(`
      SELECT q.*, c.email as customer_email, c.name as customer_name
      FROM quotes q
      LEFT JOIN customers c ON q.customer_id = c.id
      WHERE q.id = $1 AND q.signature_url IS NOT NULL
    `, [quoteId]);

    if (quoteResult.rows.length === 0) {
      res.status(404).json({ error: 'Devis non trouvé ou lien non généré' });
      return;
    }

    const quote = quoteResult.rows[0];

    if (!quote.customer_email) {
      res.status(400).json({ error: 'Le client n\'a pas d\'adresse email' });
      return;
    }

    if (quote.signed_at) {
      res.status(400).json({ error: 'Le devis est déjà signé' });
      return;
    }

    const companyProfile = await getCompanyProfile();
    const emailHtml = generateSignatureEmailHTML(quote, quote.signature_url, companyProfile);

    const emailResult = await sendEmail({
      to: quote.customer_email,
      subject: `Rappel: Devis ${quote.quote_number} en attente de signature`,
      html: emailHtml
    });

    if (emailResult.success) {
      await db.query(`
        INSERT INTO quote_signature_events (quote_id, event_type, metadata)
        VALUES ($1, 'reminder_sent', $2)
      `, [quoteId, JSON.stringify({ email: quote.customer_email })]);

      res.json({ message: 'Rappel envoyé avec succès' });
    } else {
      res.status(500).json({ error: 'Erreur envoi email', details: emailResult.error });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Récupérer les devis en attente de signature
router.get('/pending', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const result = await db.query(`
      SELECT
        q.id,
        q.quote_number,
        q.title,
        q.total_amount,
        q.status,
        q.valid_until,
        q.created_at,
        c.name as customer_name,
        c.email as customer_email,
        CASE
          WHEN q.valid_until < CURRENT_DATE THEN 'expired'
          WHEN q.valid_until <= CURRENT_DATE + 7 THEN 'expiring_soon'
          ELSE 'valid'
        END as validity_status
      FROM quotes q
      LEFT JOIN customers c ON q.customer_id = c.id
      WHERE q.status = 'sent'
      ORDER BY q.valid_until ASC NULLS LAST
    `);

    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Gérer les conditions générales
router.get('/terms', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;

    const result = await db.query(
      'SELECT * FROM quote_terms WHERE organization_id = $1 ORDER BY is_default DESC, name ASC',
      [organizationId]
    );

    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/terms', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;
    const { name, content, is_default, is_required } = req.body;

    if (!content) {
      res.status(400).json({ error: 'Le contenu est requis' });
      return;
    }

    // Si c'est le défaut, enlever le défaut des autres
    if (is_default) {
      await db.query(
        'UPDATE quote_terms SET is_default = false WHERE organization_id = $1',
        [organizationId]
      );
    }

    const result = await db.query(`
      INSERT INTO quote_terms (organization_id, name, content, is_default, is_required)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [organizationId, name || 'Conditions générales', content, is_default || false, is_required !== false]);

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/terms/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = (req.user as any)?.organizationId;
    const { name, content, is_default, is_required } = req.body;

    if (is_default) {
      await db.query(
        'UPDATE quote_terms SET is_default = false WHERE organization_id = $1',
        [organizationId]
      );
    }

    const result = await db.query(`
      UPDATE quote_terms SET
        name = COALESCE($1, name),
        content = COALESCE($2, content),
        is_default = COALESCE($3, is_default),
        is_required = COALESCE($4, is_required),
        updated_at = NOW()
      WHERE id = $5 AND organization_id = $6
      RETURNING *
    `, [name, content, is_default, is_required, id, organizationId]);

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Conditions non trouvées' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/terms/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = (req.user as any)?.organizationId;

    const result = await db.query(
      'DELETE FROM quote_terms WHERE id = $1 AND organization_id = $2 RETURNING id',
      [id, organizationId]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Conditions non trouvées' });
      return;
    }

    res.json({ message: 'Conditions supprimées' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// ROUTES PUBLIQUES (pour les clients)
// ==========================================

// Voir un devis via le lien de signature (public)
router.get('/public/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const clientIp = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    const result = await db.query(`
      SELECT
        q.id, q.quote_number, q.title, q.description,
        q.subtotal, q.tax_rate, q.tax_amount, q.total_amount,
        q.status, q.valid_until, q.signed_at, q.created_at,
        q.terms_id,
        c.name as customer_name, c.email as customer_email,
        c.company as customer_company, c.address as customer_address,
        t.content as terms_content, t.name as terms_name, t.is_required as terms_required
      FROM quotes q
      LEFT JOIN customers c ON q.customer_id = c.id
      LEFT JOIN quote_terms t ON q.terms_id = t.id
      WHERE q.signature_token = $1
    `, [token]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Devis non trouvé ou lien invalide' });
      return;
    }

    const quote = result.rows[0];

    // Logger la consultation
    await db.query(`
      INSERT INTO quote_signature_events (quote_id, event_type, ip_address, user_agent)
      VALUES ($1, 'link_opened', $2, $3)
    `, [quote.id, clientIp, userAgent]);

    // Récupérer les items
    const itemsResult = await db.query(`
      SELECT qi.*, p.name as product_name
      FROM quote_items qi
      LEFT JOIN products p ON qi.product_id = p.id
      WHERE qi.quote_id = $1
    `, [quote.id]);

    // Récupérer le profil de l'entreprise
    const companyProfile = await getCompanyProfile();

    res.json({
      quote: {
        ...quote,
        items: itemsResult.rows
      },
      company: companyProfile,
      is_signed: !!quote.signed_at,
      is_expired: quote.valid_until && new Date(quote.valid_until) < new Date()
    });
  } catch (err: any) {
    console.error('Erreur consultation devis:', err);
    res.status(500).json({ error: err.message });
  }
});

// Signer un devis (public)
router.post('/public/:token/sign', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { name, email, signature_data, signature_method, terms_accepted } = req.body;
    const clientIp = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    if (!name || !email) {
      res.status(400).json({ error: 'Nom et email requis' });
      return;
    }

    // Récupérer le devis
    const quoteResult = await db.query(`
      SELECT q.*, t.is_required as terms_required
      FROM quotes q
      LEFT JOIN quote_terms t ON q.terms_id = t.id
      WHERE q.signature_token = $1
    `, [token]);

    if (quoteResult.rows.length === 0) {
      res.status(404).json({ error: 'Devis non trouvé' });
      return;
    }

    const quote = quoteResult.rows[0];

    // Vérifications
    if (quote.signed_at) {
      res.status(400).json({ error: 'Ce devis a déjà été signé' });
      return;
    }

    if (quote.valid_until && new Date(quote.valid_until) < new Date()) {
      res.status(400).json({ error: 'Ce devis a expiré' });
      return;
    }

    if (quote.terms_required && !terms_accepted) {
      res.status(400).json({ error: 'Vous devez accepter les conditions générales' });
      return;
    }

    // Logger le début de signature
    await db.query(`
      INSERT INTO quote_signature_events (quote_id, event_type, ip_address, user_agent, metadata)
      VALUES ($1, 'signature_started', $2, $3, $4)
    `, [quote.id, clientIp, userAgent, JSON.stringify({ name, email })]);

    // Enregistrer la signature
    const result = await db.query(`
      UPDATE quotes SET
        status = 'accepted',
        signed_at = NOW(),
        signed_by_name = $1,
        signed_by_email = $2,
        signature_ip = $3,
        signature_data = $4,
        signature_method = $5,
        terms_accepted_at = CASE WHEN $6 THEN NOW() ELSE NULL END
      WHERE id = $7
      RETURNING *
    `, [name, email, clientIp, signature_data, signature_method || 'click', terms_accepted, quote.id]);

    // Envoyer une notification à l'entreprise
    const companyProfile = await getCompanyProfile();
    if (companyProfile?.company_email) {
      await sendEmail({
        to: companyProfile.company_email,
        subject: `Devis ${quote.quote_number} signé par ${name}`,
        html: `
          <h2>Devis signé !</h2>
          <p>Le devis <strong>${quote.quote_number}</strong> a été signé par :</p>
          <ul>
            <li>Nom: ${name}</li>
            <li>Email: ${email}</li>
            <li>Date: ${new Date().toLocaleString('fr-FR')}</li>
            <li>Montant: ${parseFloat(quote.total_amount).toFixed(2)} €</li>
          </ul>
        `
      });
    }

    res.json({
      message: 'Devis signé avec succès',
      signed_at: result.rows[0].signed_at,
      quote_number: quote.quote_number
    });
  } catch (err: any) {
    console.error('Erreur signature devis:', err);
    res.status(500).json({ error: err.message });
  }
});

// Refuser un devis (public)
router.post('/public/:token/decline', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { reason } = req.body;
    const clientIp = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    const quoteResult = await db.query(
      'SELECT * FROM quotes WHERE signature_token = $1',
      [token]
    );

    if (quoteResult.rows.length === 0) {
      res.status(404).json({ error: 'Devis non trouvé' });
      return;
    }

    const quote = quoteResult.rows[0];

    if (quote.signed_at) {
      res.status(400).json({ error: 'Ce devis a déjà été signé' });
      return;
    }

    // Mettre à jour le statut
    await db.query(
      'UPDATE quotes SET status = $1 WHERE id = $2',
      ['rejected', quote.id]
    );

    // Logger l'événement
    await db.query(`
      INSERT INTO quote_signature_events (quote_id, event_type, ip_address, user_agent, metadata)
      VALUES ($1, 'signature_declined', $2, $3, $4)
    `, [quote.id, clientIp, userAgent, JSON.stringify({ reason })]);

    // Notifier l'entreprise
    const companyProfile = await getCompanyProfile();
    if (companyProfile?.company_email) {
      await sendEmail({
        to: companyProfile.company_email,
        subject: `Devis ${quote.quote_number} refusé`,
        html: `
          <h2>Devis refusé</h2>
          <p>Le devis <strong>${quote.quote_number}</strong> a été refusé.</p>
          ${reason ? `<p>Raison: ${reason}</p>` : ''}
        `
      });
    }

    res.json({ message: 'Devis refusé' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Helper pour générer l'email de signature
function generateSignatureEmailHTML(quote: any, signatureUrl: string, companyProfile: any): string {
  const companyName = companyProfile?.company_name || 'Simplix';
  const primaryColor = '#007AFF';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, ${primaryColor} 0%, #0056b3 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="margin: 0; font-size: 28px;">${companyName}</h1>
    <p style="margin: 10px 0 0; opacity: 0.9;">Devis à signer</p>
  </div>

  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="margin: 0 0 20px;">Bonjour${quote.customer_name ? ' ' + quote.customer_name : ''},</p>

    <p>Vous avez reçu un devis de <strong>${companyName}</strong>.</p>

    <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid ${primaryColor};">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #666;">Référence:</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600;">${quote.quote_number}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Objet:</td>
          <td style="padding: 8px 0; text-align: right;">${quote.title || '-'}</td>
        </tr>
        ${quote.valid_until ? `
        <tr>
          <td style="padding: 8px 0; color: #666;">Valide jusqu'au:</td>
          <td style="padding: 8px 0; text-align: right;">${new Date(quote.valid_until).toLocaleDateString('fr-FR')}</td>
        </tr>
        ` : ''}
        <tr style="border-top: 2px solid ${primaryColor};">
          <td style="padding: 15px 0 8px; font-weight: 600; font-size: 18px;">Montant total:</td>
          <td style="padding: 15px 0 8px; text-align: right; font-weight: 700; font-size: 24px; color: ${primaryColor};">${parseFloat(quote.total_amount || 0).toFixed(2)} €</td>
        </tr>
      </table>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${signatureUrl}" style="display: inline-block; background: ${primaryColor}; color: white; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;">
        Consulter et signer le devis
      </a>
    </div>

    <p style="color: #666; font-size: 14px; text-align: center;">
      Ce lien est personnel et sécurisé. Ne le partagez pas.
    </p>

    <p style="margin-top: 30px;">
      Cordialement,<br>
      <strong>L'équipe ${companyName}</strong>
    </p>
  </div>

  <div style="text-align: center; padding: 20px; color: #888; font-size: 12px;">
    <p>${companyName}${companyProfile?.company_address ? ' - ' + companyProfile.company_address : ''}</p>
  </div>
</body>
</html>
  `;
}

export default router;
