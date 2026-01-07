import nodemailer from 'nodemailer';
import { pool } from '../database/db';

/**
 * Service d'envoi d'emails pour Simplix CRM
 * Supporte SMTP classique et SendGrid
 */

interface EmailConfig {
  host?: string;
  port?: number;
  secure?: boolean;
  user?: string;
  pass?: string;
  from?: string;
  fromName?: string;
  provider?: 'smtp' | 'sendgrid';
  sendgridApiKey?: string;
}

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
}

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Configuration par défaut depuis les variables d'environnement
function getDefaultConfig(): EmailConfig {
  return {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@simplix.fr',
    fromName: process.env.SMTP_FROM_NAME || 'Simplix CRM',
    provider: (process.env.EMAIL_PROVIDER as 'smtp' | 'sendgrid') || 'smtp',
    sendgridApiKey: process.env.SENDGRID_API_KEY || ''
  };
}

// Créer le transporteur Nodemailer
function createTransporter(config: EmailConfig = getDefaultConfig()): nodemailer.Transporter {
  if (config.provider === 'sendgrid' && config.sendgridApiKey) {
    // Configuration SendGrid via SMTP
    return nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      secure: false,
      auth: {
        user: 'apikey',
        pass: config.sendgridApiKey
      }
    });
  }

  // Configuration SMTP standard
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass
    },
    // Options pour la fiabilité
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    rateDelta: 1000,
    rateLimit: 5
  });
}

// Envoyer un email
export async function sendEmail(options: EmailOptions, config?: EmailConfig): Promise<EmailResult> {
  try {
    const emailConfig = config || getDefaultConfig();
    const transporter = createTransporter(emailConfig);

    // Vérifier la configuration
    if (!emailConfig.user && !emailConfig.sendgridApiKey) {
      console.warn('Email non configuré - Mode simulation');
      return {
        success: true,
        messageId: `simulated-${Date.now()}`,
        error: 'Email envoyé en mode simulation (SMTP non configuré)'
      };
    }

    const mailOptions: nodemailer.SendMailOptions = {
      from: `"${emailConfig.fromName}" <${emailConfig.from}>`,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ''),
      attachments: options.attachments,
      cc: options.cc,
      bcc: options.bcc,
      replyTo: options.replyTo || emailConfig.from
    };

    const info = await transporter.sendMail(mailOptions);

    console.log('Email envoyé:', info.messageId);

    return {
      success: true,
      messageId: info.messageId
    };

  } catch (error: any) {
    console.error('Erreur envoi email:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Templates d'emails

export function generateInvoiceEmailHTML(invoice: any, companyProfile: any): string {
  const primaryColor = '#007AFF';
  const companyName = companyProfile?.company_name || 'Simplix';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Facture ${invoice.invoice_number}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, ${primaryColor} 0%, #0056b3 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="margin: 0; font-size: 28px;">${companyName}</h1>
    <p style="margin: 10px 0 0; opacity: 0.9;">Nouvelle facture</p>
  </div>

  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="margin: 0 0 20px;">Bonjour${invoice.customer_name ? ' ' + invoice.customer_name : ''},</p>

    <p>Veuillez trouver ci-joint votre facture <strong>${invoice.invoice_number}</strong>.</p>

    <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid ${primaryColor};">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #666;">Numéro de facture:</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600;">${invoice.invoice_number}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Date d'émission:</td>
          <td style="padding: 8px 0; text-align: right;">${new Date(invoice.invoice_date).toLocaleDateString('fr-FR')}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Date d'échéance:</td>
          <td style="padding: 8px 0; text-align: right;">${invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('fr-FR') : '-'}</td>
        </tr>
        <tr style="border-top: 2px solid ${primaryColor};">
          <td style="padding: 15px 0 8px; font-weight: 600; font-size: 18px;">Montant total:</td>
          <td style="padding: 15px 0 8px; text-align: right; font-weight: 700; font-size: 24px; color: ${primaryColor};">${parseFloat(invoice.total_amount || 0).toFixed(2)} €</td>
        </tr>
      </table>
    </div>

    ${invoice.notes ? `<p style="background: #fff3cd; padding: 15px; border-radius: 8px; color: #856404;">${invoice.notes}</p>` : ''}

    <p style="margin-top: 20px;">Pour toute question, n'hésitez pas à nous contacter.</p>

    <p style="margin-top: 30px;">
      Cordialement,<br>
      <strong>L'équipe ${companyName}</strong>
    </p>
  </div>

  <div style="text-align: center; padding: 20px; color: #888; font-size: 12px;">
    <p>${companyName}${companyProfile?.company_address ? ' - ' + companyProfile.company_address : ''}</p>
    ${companyProfile?.company_siret ? `<p>SIRET: ${companyProfile.company_siret}</p>` : ''}
  </div>
</body>
</html>
  `;
}

export function generateQuoteEmailHTML(quote: any, companyProfile: any): string {
  const primaryColor = '#34C759';
  const companyName = companyProfile?.company_name || 'Simplix';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Devis ${quote.quote_number}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, ${primaryColor} 0%, #28a745 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="margin: 0; font-size: 28px;">${companyName}</h1>
    <p style="margin: 10px 0 0; opacity: 0.9;">Votre devis</p>
  </div>

  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="margin: 0 0 20px;">Bonjour${quote.customer_name ? ' ' + quote.customer_name : ''},</p>

    <p>Suite à votre demande, veuillez trouver ci-joint notre devis <strong>${quote.quote_number}</strong>.</p>

    <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid ${primaryColor};">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #666;">Référence:</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600;">${quote.quote_number}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Date:</td>
          <td style="padding: 8px 0; text-align: right;">${new Date(quote.created_at).toLocaleDateString('fr-FR')}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Validité:</td>
          <td style="padding: 8px 0; text-align: right;">${quote.valid_until ? new Date(quote.valid_until).toLocaleDateString('fr-FR') : '30 jours'}</td>
        </tr>
        <tr style="border-top: 2px solid ${primaryColor};">
          <td style="padding: 15px 0 8px; font-weight: 600; font-size: 18px;">Montant total:</td>
          <td style="padding: 15px 0 8px; text-align: right; font-weight: 700; font-size: 24px; color: ${primaryColor};">${parseFloat(quote.total_amount || 0).toFixed(2)} €</td>
        </tr>
      </table>
    </div>

    ${quote.description ? `<p style="background: #e8f5e9; padding: 15px; border-radius: 8px; color: #2e7d32;">${quote.description}</p>` : ''}

    <p style="margin-top: 20px;">Ce devis est valable 30 jours à compter de sa date d'émission.</p>

    <p>Pour accepter ce devis, vous pouvez nous contacter directement ou répondre à cet email.</p>

    <p style="margin-top: 30px;">
      Cordialement,<br>
      <strong>L'équipe ${companyName}</strong>
    </p>
  </div>

  <div style="text-align: center; padding: 20px; color: #888; font-size: 12px;">
    <p>${companyName}${companyProfile?.company_address ? ' - ' + companyProfile.company_address : ''}</p>
    ${companyProfile?.company_siret ? `<p>SIRET: ${companyProfile.company_siret}</p>` : ''}
  </div>
</body>
</html>
  `;
}

export function generateReminderEmailHTML(invoice: any, reminderType: string, companyProfile: any): string {
  const primaryColor = reminderType === 'final' ? '#DC3545' : '#FFC107';
  const companyName = companyProfile?.company_name || 'Simplix';

  const titles: Record<string, string> = {
    first: 'Rappel de paiement',
    second: 'Second rappel de paiement',
    final: 'Dernier rappel avant mise en recouvrement',
    legal: 'Mise en demeure de payer'
  };

  const messages: Record<string, string> = {
    first: 'Nous vous rappelons que la facture ci-dessous est arrivée à échéance. Merci de bien vouloir procéder au règlement.',
    second: 'Malgré notre précédent rappel, votre facture reste impayée. Nous vous prions de régulariser cette situation dans les plus brefs délais.',
    final: 'Votre facture n\'étant toujours pas réglée, nous nous voyons dans l\'obligation de vous adresser ce dernier rappel avant transmission au service de recouvrement.',
    legal: 'Conformément à l\'article L441-6 du Code de commerce, nous vous mettons en demeure de régler la somme due sous 8 jours.'
  };

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: ${primaryColor}; color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="margin: 0; font-size: 24px;">${titles[reminderType] || 'Rappel de paiement'}</h1>
    <p style="margin: 10px 0 0; opacity: 0.9;">Facture ${invoice.invoice_number}</p>
  </div>

  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="margin: 0 0 20px;">Bonjour${invoice.customer_name ? ' ' + invoice.customer_name : ''},</p>

    <p>${messages[reminderType] || messages.first}</p>

    <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid ${primaryColor};">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #666;">Facture:</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600;">${invoice.invoice_number}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Échéance:</td>
          <td style="padding: 8px 0; text-align: right; color: ${primaryColor}; font-weight: 600;">${invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('fr-FR') : '-'}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Retard:</td>
          <td style="padding: 8px 0; text-align: right;">${Math.floor((Date.now() - new Date(invoice.due_date).getTime()) / (1000 * 60 * 60 * 24))} jours</td>
        </tr>
        <tr style="border-top: 2px solid ${primaryColor};">
          <td style="padding: 15px 0 8px; font-weight: 600; font-size: 18px;">Montant dû:</td>
          <td style="padding: 15px 0 8px; text-align: right; font-weight: 700; font-size: 24px; color: ${primaryColor};">${parseFloat(invoice.total_amount || 0).toFixed(2)} €</td>
        </tr>
      </table>
    </div>

    <p style="background: ${reminderType === 'final' || reminderType === 'legal' ? '#fce4ec' : '#fff3cd'}; padding: 15px; border-radius: 8px; color: ${reminderType === 'final' || reminderType === 'legal' ? '#c62828' : '#856404'};">
      ${reminderType === 'legal'
        ? 'En cas de non-paiement dans les 8 jours, des pénalités de retard (taux légal x 3) et une indemnité forfaitaire de 40€ seront appliquées.'
        : 'Nous vous remercions de votre attention et restons à votre disposition pour toute question.'}
    </p>

    <p style="margin-top: 30px;">
      Cordialement,<br>
      <strong>${companyName}</strong>
    </p>
  </div>
</body>
</html>
  `;
}

export function generateCreditNoteEmailHTML(creditNote: any, companyProfile: any): string {
  const primaryColor = '#DC3545';
  const companyName = companyProfile?.company_name || 'Simplix';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: ${primaryColor}; color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="margin: 0; font-size: 28px;">${companyName}</h1>
    <p style="margin: 10px 0 0; opacity: 0.9;">Avoir ${creditNote.credit_note_number}</p>
  </div>

  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="margin: 0 0 20px;">Bonjour${creditNote.customer_name ? ' ' + creditNote.customer_name : ''},</p>

    <p>Veuillez trouver ci-joint l'avoir <strong>${creditNote.credit_note_number}</strong> d'un montant de <strong>${parseFloat(creditNote.total_amount || 0).toFixed(2)} €</strong>.</p>

    ${creditNote.original_invoice_number ? `<p>Cet avoir fait référence à la facture ${creditNote.original_invoice_number}.</p>` : ''}

    <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid ${primaryColor};">
      <p style="margin: 0; font-weight: 600;">Motif: ${creditNote.reason_details || creditNote.reason}</p>
    </div>

    <p style="margin-top: 30px;">
      Cordialement,<br>
      <strong>L'équipe ${companyName}</strong>
    </p>
  </div>
</body>
</html>
  `;
}

// Récupérer le profil de l'entreprise pour les emails
export async function getCompanyProfile(): Promise<any> {
  try {
    const result = await pool.query('SELECT * FROM company_profiles LIMIT 1');
    return result.rows[0] || null;
  } catch (error) {
    console.error('Erreur récupération profil entreprise:', error);
    return null;
  }
}

// Enregistrer l'email dans les logs
export async function logEmail(
  type: 'invoice' | 'quote' | 'reminder' | 'credit_note',
  documentId: number,
  to: string,
  result: EmailResult
): Promise<void> {
  try {
    await pool.query(`
      INSERT INTO email_logs (type, document_id, recipient, status, message_id, error, sent_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
    `, [
      type,
      documentId,
      to,
      result.success ? 'sent' : 'failed',
      result.messageId || null,
      result.error || null
    ]);
  } catch (error) {
    console.error('Erreur log email:', error);
  }
}

export default {
  sendEmail,
  generateInvoiceEmailHTML,
  generateQuoteEmailHTML,
  generateReminderEmailHTML,
  generateCreditNoteEmailHTML,
  getCompanyProfile,
  logEmail
};
