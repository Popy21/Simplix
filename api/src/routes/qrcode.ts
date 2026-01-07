import express, { Response } from 'express';
import { pool as db } from '../database/db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

// ==========================================
// QR CODE DE PAIEMENT
// ==========================================

// Générer les données QR Code pour une facture
router.get('/invoice/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = (req.user as any)?.organizationId;

    // Récupérer la facture
    const invoiceResult = await db.query(`
      SELECT
        i.*,
        c.name as customer_name,
        c.email as customer_email
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      WHERE i.id = $1 AND i.organization_id = $2 AND i.deleted_at IS NULL
    `, [id, organizationId]);

    if (invoiceResult.rows.length === 0) {
      res.status(404).json({ error: 'Facture non trouvée' });
      return;
    }

    const invoice = invoiceResult.rows[0];

    // Récupérer les coordonnées bancaires
    const bankResult = await db.query(`
      SELECT * FROM bank_accounts
      WHERE organization_id = $1 AND is_default = true AND is_active = true
      LIMIT 1
    `, [organizationId]);

    const bankAccount = bankResult.rows[0];

    if (!bankAccount || !bankAccount.iban) {
      res.status(400).json({ error: 'Aucun compte bancaire configuré avec IBAN' });
      return;
    }

    // Récupérer le profil entreprise
    const companyResult = await db.query(`
      SELECT * FROM company_profiles WHERE organization_id = $1 LIMIT 1
    `, [organizationId]);

    const company = companyResult.rows[0];

    // Générer le payload EPC QR Code (European Payments Council)
    // Format: https://www.europeanpaymentscouncil.eu/document-library/guidance-documents/quick-response-code-guidelines-enable-data-capture-initiation
    const epcPayload = generateEPCQRCode({
      serviceTag: 'BCD', // Service Tag
      version: '002', // Version
      characterSet: '1', // UTF-8
      identification: 'SCT', // SEPA Credit Transfer
      bic: bankAccount.bic || '',
      beneficiaryName: (company?.company_name || 'Entreprise').substring(0, 70),
      iban: bankAccount.iban.replace(/\s/g, ''),
      amount: invoice.total_amount,
      purpose: '', // Purpose Code (optional)
      reference: invoice.invoice_number,
      text: `Facture ${invoice.invoice_number}`.substring(0, 140),
      information: ''
    });

    // Générer aussi le format Swiss QR Code si CHF
    let swissQRPayload = null;
    if (invoice.currency === 'CHF' || bankAccount.currency === 'CHF') {
      swissQRPayload = generateSwissQRCode({
        iban: bankAccount.iban,
        amount: invoice.total_amount,
        currency: 'CHF',
        creditor: {
          name: company?.company_name || 'Entreprise',
          address: company?.address || '',
          postalCode: company?.postal_code || '',
          city: company?.city || '',
          country: 'CH'
        },
        reference: invoice.invoice_number,
        additionalInfo: `Facture ${invoice.invoice_number}`
      });
    }

    // URL de paiement en ligne (si Stripe activé)
    let onlinePaymentUrl = null;
    if (invoice.stripe_payment_link) {
      onlinePaymentUrl = invoice.stripe_payment_link;
    }

    res.json({
      invoice_id: invoice.id,
      invoice_number: invoice.invoice_number,
      amount: invoice.total_amount,
      currency: invoice.currency || 'EUR',
      customer_name: invoice.customer_name,

      // QR Code EPC (virement SEPA)
      epc_qr: {
        payload: epcPayload,
        type: 'EPC',
        description: 'QR Code pour virement SEPA (compatible avec la plupart des applications bancaires européennes)'
      },

      // QR Code Swiss (si applicable)
      swiss_qr: swissQRPayload ? {
        payload: swissQRPayload,
        type: 'Swiss QR',
        description: 'QR Code suisse pour paiement'
      } : null,

      // Paiement en ligne
      online_payment: onlinePaymentUrl ? {
        url: onlinePaymentUrl,
        type: 'Stripe',
        description: 'Lien de paiement en ligne par carte bancaire'
      } : null,

      // Instructions
      instructions: {
        fr: 'Scannez ce QR code avec votre application bancaire pour payer par virement.',
        en: 'Scan this QR code with your banking app to pay by bank transfer.'
      }
    });
  } catch (err: any) {
    console.error('Erreur génération QR code:', err);
    res.status(500).json({ error: err.message });
  }
});

// Fonction pour générer le payload EPC QR Code
function generateEPCQRCode(data: {
  serviceTag: string;
  version: string;
  characterSet: string;
  identification: string;
  bic: string;
  beneficiaryName: string;
  iban: string;
  amount: number;
  purpose: string;
  reference: string;
  text: string;
  information: string;
}): string {
  // Format EPC069-12
  const lines = [
    data.serviceTag,
    data.version,
    data.characterSet,
    data.identification,
    data.bic,
    data.beneficiaryName,
    data.iban,
    `EUR${data.amount.toFixed(2)}`,
    data.purpose,
    data.reference,
    data.text,
    data.information
  ];

  return lines.join('\n');
}

// Fonction pour générer le payload Swiss QR Code
function generateSwissQRCode(data: {
  iban: string;
  amount: number;
  currency: string;
  creditor: {
    name: string;
    address: string;
    postalCode: string;
    city: string;
    country: string;
  };
  reference: string;
  additionalInfo: string;
}): string {
  // Format Swiss QR Code (simplifié)
  const lines = [
    'SPC', // Swiss Payments Code
    '0200', // Version
    '1', // Coding Type
    data.iban,
    'S', // Address Type (Structured)
    data.creditor.name,
    data.creditor.address,
    data.creditor.postalCode,
    data.creditor.city,
    '', // Building number
    '', // Building number suffix
    data.creditor.country,
    '', '', '', '', '', '', '', // Ultimate Creditor (empty)
    data.amount.toFixed(2),
    data.currency,
    '', '', '', '', '', '', '', // Ultimate Debtor (empty)
    'NON', // Reference Type
    '', // Reference
    data.additionalInfo,
    'EPD', // Trailer
    ''
  ];

  return lines.join('\n');
}

// Générer QR code pour un devis (pré-remplir les infos)
router.get('/quote/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = (req.user as any)?.organizationId;

    const quoteResult = await db.query(`
      SELECT
        q.*,
        c.name as customer_name
      FROM quotes q
      LEFT JOIN customers c ON q.customer_id = c.id
      WHERE q.id = $1 AND q.organization_id = $2 AND q.deleted_at IS NULL
    `, [id, organizationId]);

    if (quoteResult.rows.length === 0) {
      res.status(404).json({ error: 'Devis non trouvé' });
      return;
    }

    const quote = quoteResult.rows[0];

    // Pour un devis, on génère un QR code qui pointe vers la page de signature/paiement
    const baseUrl = process.env.APP_URL || 'https://app.simplix.fr';
    const signatureUrl = `${baseUrl}/sign/${quote.id}`;

    res.json({
      quote_id: quote.id,
      quote_number: quote.quote_number,
      amount: quote.total_amount,
      customer_name: quote.customer_name,

      // QR Code vers la page de signature
      signature_qr: {
        payload: signatureUrl,
        type: 'URL',
        description: 'QR Code pour accéder à la page de signature du devis'
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
