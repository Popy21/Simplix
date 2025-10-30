import express, { Request, Response } from 'express';
import { pool } from '../database/db';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import puppeteer from 'puppeteer';

const router = express.Router();

// GET /api/templates/:id/preview-pdf
router.get('/templates/:id/preview-pdf', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Récupérer le template
    const templateResult = await pool.query(`
      SELECT * FROM invoice_templates WHERE id = $1
    `, [id]);

    if (templateResult.rows.length === 0) {
      res.status(404).json({ error: 'Template not found' });
      return;
    }

    const template = templateResult.rows[0];

    // Données d'exemple pour la preview
    const sampleDocument = {
      ...template,
      invoice_number: 'FACT-2024-001',
      invoice_date: new Date().toISOString(),
      customer_name: 'Client Exemple',
      customer_email: 'client@example.com',
      customer_address: '123 Rue Example, 75001 Paris',
    };

    const sampleItems = [
      {
        description: template.sample_item_description || 'Prestation de service',
        quantity: 1,
        unit_price: 100,
      },
    ];

    const html = generateDocumentHTML(sampleDocument, sampleItems, template.invoice_title || 'FACTURE');

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error: any) {
    console.error('Error generating template preview PDF:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/preview-pdf - Generate PDF with custom data
router.post('/preview-pdf', async (req: Request, res: Response) => {
  try {
    const { template, document, items } = req.body;

    if (!template || !document || !items) {
      res.status(400).json({ error: 'Missing required fields: template, document, items' });
      return;
    }

    // Fusionner le template avec les données du document
    const fullDocument = {
      ...template,
      ...document,
    };

    const html = generateDocumentHTML(fullDocument, items, document.type === 'quote' ? 'DEVIS' : 'FACTURE');

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error: any) {
    console.error('Error generating preview PDF:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/quotes/:id/download - Download quote as PDF
router.get('/quotes/:id/download', async (req: Request, res: Response) => {
  let browser;
  try {
    const { id } = req.params;

    // Récupérer le devis avec le template et les infos de l'entreprise
    const quoteResult = await pool.query(`
      SELECT
        q.*,
        c.name as customer_name,
        c.email as customer_email,
        c.company as customer_company,
        c.address as customer_address,
        t.*,
        cp.company_name as profile_company_name,
        cp.company_legal_form as profile_company_legal_form,
        cp.company_phone as profile_company_phone,
        cp.company_email as profile_company_email,
        cp.company_siret as profile_company_siret,
        cp.company_tva as profile_company_tva,
        cp.company_rcs as profile_company_rcs,
        cp.company_capital as profile_company_capital,
        cp.is_micro_entreprise as profile_is_micro_entreprise,
        cp.logo_url as profile_logo_url,
        cp.late_payment_penalty as profile_late_payment_penalty,
        cp.recovery_indemnity as profile_recovery_indemnity,
        cp.payment_terms as profile_payment_terms,
        cp.footer_text as profile_footer_text,
        (cp.company_street || ', ' || cp.company_postal_code || ', ' || cp.company_city || ', ' || cp.company_country) as profile_company_address
      FROM quotes q
      LEFT JOIN customers c ON q.customer_id = c.id
      LEFT JOIN invoice_templates t ON q.template_id = t.id
      LEFT JOIN company_profiles cp ON cp.id = (SELECT id FROM company_profiles LIMIT 1)
      WHERE q.id = $1
    `, [id]);

    if (quoteResult.rows.length === 0) {
      res.status(404).json({ error: 'Quote not found' });
      return;
    }

    const quote = quoteResult.rows[0];

    // Fusionner les données du profil avec le template
    const documentData = {
      ...quote,
      company_name: quote.profile_company_name || quote.company_name,
      company_legal_form: quote.profile_company_legal_form || quote.company_legal_form,
      company_address: quote.profile_company_address || quote.company_address,
      company_phone: quote.profile_company_phone || quote.company_phone,
      company_email: quote.profile_company_email || quote.company_email,
      company_siret: quote.profile_company_siret || quote.company_siret,
      company_tva: quote.profile_company_tva || quote.company_tva,
      company_rcs: quote.profile_company_rcs || quote.company_rcs,
      company_capital: quote.profile_company_capital || quote.company_capital,
      is_micro_entreprise: quote.profile_is_micro_entreprise !== null ? quote.profile_is_micro_entreprise : quote.is_micro_entreprise,
      logo_url: quote.profile_logo_url || quote.logo_url,
      late_payment_penalty: quote.profile_late_payment_penalty || quote.late_payment_penalty,
      recovery_indemnity: quote.profile_recovery_indemnity || quote.recovery_indemnity,
      payment_terms: quote.profile_payment_terms || quote.payment_terms,
      footer_text: quote.profile_footer_text || quote.footer_text,
    };

    // Récupérer les items
    const itemsResult = await pool.query(`
      SELECT * FROM quote_items WHERE quote_id = $1
    `, [id]);

    // Adapter le footer pour les devis
    const quoteFooterText = documentData.footer_text
      ? documentData.footer_text.replace(/facture/gi, 'devis').replace(/Facture/g, 'Devis')
      : 'Merci pour votre confiance. Ce devis est valable 30 jours à compter de sa date d\'émission.';

    const html = generateDocumentHTML({ ...documentData, footer_text: quoteFooterText }, itemsResult.rows, 'DEVIS');

    // Lancer Puppeteer pour générer le PDF
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    // Générer le PDF avec options A4
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '12mm',
        right: '15mm',
        bottom: '12mm',
        left: '15mm'
      },
      preferCSSPageSize: true,
    });

    await browser.close();

    // Définir le nom du fichier
    const filename = `Devis_${documentData.customer_name || 'Document'}.pdf`;

    // Envoyer le PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (error: any) {
    console.error('Error generating quote PDF download:', error);
    if (browser) {
      await browser.close();
    }
    res.status(500).json({ error: error.message });
  }
});

// GET /api/invoices/:id/download - Download invoice as PDF
router.get('/invoices/:id/download', async (req: Request, res: Response) => {
  let browser;
  try {
    const { id } = req.params;

    // Récupérer la facture avec le template et les infos de l'entreprise
    const invoiceResult = await pool.query(`
      SELECT
        i.*,
        c.name as customer_name,
        c.email as customer_email,
        c.address as customer_address,
        t.*,
        cp.company_name as profile_company_name,
        cp.company_legal_form as profile_company_legal_form,
        cp.company_phone as profile_company_phone,
        cp.company_email as profile_company_email,
        cp.company_siret as profile_company_siret,
        cp.company_tva as profile_company_tva,
        cp.company_rcs as profile_company_rcs,
        cp.company_capital as profile_company_capital,
        cp.is_micro_entreprise as profile_is_micro_entreprise,
        cp.logo_url as profile_logo_url,
        cp.late_payment_penalty as profile_late_payment_penalty,
        cp.recovery_indemnity as profile_recovery_indemnity,
        cp.payment_terms as profile_payment_terms,
        cp.footer_text as profile_footer_text,
        cp.bank_iban as profile_bank_iban,
        cp.bank_bic as profile_bank_bic,
        cp.bank_name as profile_bank_name,
        (cp.company_street || ', ' || cp.company_postal_code || ', ' || cp.company_city || ', ' || cp.company_country) as profile_company_address
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      LEFT JOIN invoice_templates t ON i.template_id = t.id
      LEFT JOIN company_profiles cp ON cp.id = (SELECT id FROM company_profiles LIMIT 1)
      WHERE i.id = $1
    `, [id]);

    if (invoiceResult.rows.length === 0) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    const invoice = invoiceResult.rows[0];

    // Fusionner les données du profil avec le template
    const documentData = {
      ...invoice,
      company_name: invoice.profile_company_name || invoice.company_name,
      company_legal_form: invoice.profile_company_legal_form || invoice.company_legal_form,
      company_address: invoice.profile_company_address || invoice.company_address,
      company_phone: invoice.profile_company_phone || invoice.company_phone,
      company_email: invoice.profile_company_email || invoice.company_email,
      company_siret: invoice.profile_company_siret || invoice.company_siret,
      company_tva: invoice.profile_company_tva || invoice.company_tva,
      company_rcs: invoice.profile_company_rcs || invoice.company_rcs,
      company_capital: invoice.profile_company_capital || invoice.company_capital,
      is_micro_entreprise: invoice.profile_is_micro_entreprise !== null ? invoice.profile_is_micro_entreprise : invoice.is_micro_entreprise,
      logo_url: invoice.profile_logo_url || invoice.logo_url,
      late_payment_penalty: invoice.profile_late_payment_penalty || invoice.late_payment_penalty,
      recovery_indemnity: invoice.profile_recovery_indemnity || invoice.recovery_indemnity,
      payment_terms: invoice.profile_payment_terms || invoice.payment_terms,
      footer_text: invoice.profile_footer_text || invoice.footer_text,
      bank_iban: invoice.profile_bank_iban || invoice.bank_iban,
      bank_bic: invoice.profile_bank_bic || invoice.bank_bic,
      bank_name: invoice.profile_bank_name || invoice.bank_name,
      show_bank_details: true,
    };

    // Récupérer les items
    const itemsResult = await pool.query(`
      SELECT * FROM invoice_items WHERE invoice_id = $1
    `, [id]);

    const html = generateDocumentHTML(documentData, itemsResult.rows, 'FACTURE');

    // Lancer Puppeteer pour générer le PDF
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    // Générer le PDF avec options A4
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '12mm',
        right: '15mm',
        bottom: '12mm',
        left: '15mm'
      },
      preferCSSPageSize: true,
    });

    await browser.close();

    // Définir le nom du fichier
    const filename = `Facture_${documentData.customer_name || 'Document'}.pdf`;

    // Envoyer le PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (error: any) {
    console.error('Error generating invoice PDF download:', error);
    if (browser) {
      await browser.close();
    }
    res.status(500).json({ error: error.message });
  }
});

// POST /api/download-pdf - Generate and download real PDF
router.post('/download-pdf', async (req: Request, res: Response) => {
  let browser;
  try {
    const { template, document, items } = req.body;

    if (!template || !document || !items) {
      res.status(400).json({ error: 'Missing required fields: template, document, items' });
      return;
    }

    // Fusionner le template avec les données du document
    const fullDocument = {
      ...template,
      ...document,
    };

    const html = generateDocumentHTML(fullDocument, items, document.type === 'quote' ? 'DEVIS' : 'FACTURE');

    // Lancer Puppeteer pour générer le PDF
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    // Générer le PDF avec options pour 1 page A4
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '12mm',
        right: '15mm',
        bottom: '12mm',
        left: '15mm'
      },
      preferCSSPageSize: true,
    });

    await browser.close();

    // Définir le nom du fichier
    const filename = `${document.type === 'quote' ? 'Devis' : 'Facture'}_${document.customer_name || 'Document'}.pdf`;

    // Envoyer le PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (error: any) {
    console.error('Error generating PDF:', error);
    if (browser) {
      await browser.close();
    }
    res.status(500).json({ error: error.message });
  }
});

// GET /api/quotes/:id/pdf
router.get('/quotes/:id/pdf', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Récupérer le devis avec le template et les infos de l'entreprise
    const quoteResult = await pool.query(`
      SELECT
        q.*,
        c.name as customer_name,
        c.email as customer_email,
        c.company as customer_company,
        c.address as customer_address,
        t.*,
        cp.company_name as profile_company_name,
        cp.company_legal_form as profile_company_legal_form,
        cp.company_phone as profile_company_phone,
        cp.company_email as profile_company_email,
        cp.company_siret as profile_company_siret,
        cp.company_tva as profile_company_tva,
        cp.company_rcs as profile_company_rcs,
        cp.company_capital as profile_company_capital,
        cp.is_micro_entreprise as profile_is_micro_entreprise,
        cp.logo_url as profile_logo_url,
        cp.late_payment_penalty as profile_late_payment_penalty,
        cp.recovery_indemnity as profile_recovery_indemnity,
        cp.payment_terms as profile_payment_terms,
        cp.footer_text as profile_footer_text,
        (cp.company_street || ', ' || cp.company_postal_code || ', ' || cp.company_city || ', ' || cp.company_country) as profile_company_address
      FROM quotes q
      LEFT JOIN customers c ON q.customer_id = c.id
      LEFT JOIN invoice_templates t ON q.template_id = t.id
      LEFT JOIN company_profiles cp ON cp.id = (SELECT id FROM company_profiles LIMIT 1)
      WHERE q.id = $1
    `, [id]);

    if (quoteResult.rows.length === 0) {
      res.status(404).json({ error: 'Quote not found' });
      return;
    }

    const quote = quoteResult.rows[0];

    // Fusionner les données du profil avec le template (priorité au profil)
    const documentData = {
      ...quote,
      company_name: quote.profile_company_name || quote.company_name,
      company_legal_form: quote.profile_company_legal_form || quote.company_legal_form,
      company_address: quote.profile_company_address || quote.company_address,
      company_phone: quote.profile_company_phone || quote.company_phone,
      company_email: quote.profile_company_email || quote.company_email,
      company_siret: quote.profile_company_siret || quote.company_siret,
      company_tva: quote.profile_company_tva || quote.company_tva,
      company_rcs: quote.profile_company_rcs || quote.company_rcs,
      company_capital: quote.profile_company_capital || quote.company_capital,
      is_micro_entreprise: quote.profile_is_micro_entreprise !== null ? quote.profile_is_micro_entreprise : quote.is_micro_entreprise,
      logo_url: quote.profile_logo_url || quote.logo_url,
      late_payment_penalty: quote.profile_late_payment_penalty || quote.late_payment_penalty,
      recovery_indemnity: quote.profile_recovery_indemnity || quote.recovery_indemnity,
      payment_terms: quote.profile_payment_terms || quote.payment_terms,
      footer_text: quote.profile_footer_text || quote.footer_text,
    };

    // Récupérer les items
    const itemsResult = await pool.query(`
      SELECT * FROM quote_items WHERE quote_id = $1
    `, [id]);

    // Adapter le footer pour les devis
    const quoteFooterText = documentData.footer_text
      ? documentData.footer_text.replace(/facture/gi, 'devis').replace(/Facture/g, 'Devis')
      : 'Merci pour votre confiance. Ce devis est valable 30 jours à compter de sa date d\'émission.';

    const html = generateDocumentHTML({ ...documentData, footer_text: quoteFooterText }, itemsResult.rows, 'DEVIS');

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error: any) {
    console.error('Error generating quote PDF:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/invoices/:id/pdf
router.get('/invoices/:id/pdf', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Récupérer la facture avec le template et les infos de l'entreprise
    const invoiceResult = await pool.query(`
      SELECT
        i.*,
        c.name as customer_name,
        c.email as customer_email,
        c.address as customer_address,
        t.*,
        cp.company_name as profile_company_name,
        cp.company_legal_form as profile_company_legal_form,
        cp.company_phone as profile_company_phone,
        cp.company_email as profile_company_email,
        cp.company_siret as profile_company_siret,
        cp.company_tva as profile_company_tva,
        cp.company_rcs as profile_company_rcs,
        cp.company_capital as profile_company_capital,
        cp.is_micro_entreprise as profile_is_micro_entreprise,
        cp.logo_url as profile_logo_url,
        cp.late_payment_penalty as profile_late_payment_penalty,
        cp.recovery_indemnity as profile_recovery_indemnity,
        cp.payment_terms as profile_payment_terms,
        cp.footer_text as profile_footer_text,
        cp.bank_iban as profile_bank_iban,
        cp.bank_bic as profile_bank_bic,
        cp.bank_name as profile_bank_name,
        (cp.company_street || ', ' || cp.company_postal_code || ', ' || cp.company_city || ', ' || cp.company_country) as profile_company_address
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      LEFT JOIN invoice_templates t ON i.template_id = t.id
      LEFT JOIN company_profiles cp ON cp.id = (SELECT id FROM company_profiles LIMIT 1)
      WHERE i.id = $1
    `, [id]);

    if (invoiceResult.rows.length === 0) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    const invoice = invoiceResult.rows[0];

    // Fusionner les données du profil avec le template (priorité au profil)
    const documentData = {
      ...invoice,
      company_name: invoice.profile_company_name || invoice.company_name,
      company_legal_form: invoice.profile_company_legal_form || invoice.company_legal_form,
      company_address: invoice.profile_company_address || invoice.company_address,
      company_phone: invoice.profile_company_phone || invoice.company_phone,
      company_email: invoice.profile_company_email || invoice.company_email,
      company_siret: invoice.profile_company_siret || invoice.company_siret,
      company_tva: invoice.profile_company_tva || invoice.company_tva,
      company_rcs: invoice.profile_company_rcs || invoice.company_rcs,
      company_capital: invoice.profile_company_capital || invoice.company_capital,
      is_micro_entreprise: invoice.profile_is_micro_entreprise !== null ? invoice.profile_is_micro_entreprise : invoice.is_micro_entreprise,
      logo_url: invoice.profile_logo_url || invoice.logo_url,
      late_payment_penalty: invoice.profile_late_payment_penalty || invoice.late_payment_penalty,
      recovery_indemnity: invoice.profile_recovery_indemnity || invoice.recovery_indemnity,
      payment_terms: invoice.profile_payment_terms || invoice.payment_terms,
      footer_text: invoice.profile_footer_text || invoice.footer_text,
      bank_iban: invoice.profile_bank_iban || invoice.bank_iban,
      bank_bic: invoice.profile_bank_bic || invoice.bank_bic,
      bank_name: invoice.profile_bank_name || invoice.bank_name,
      show_bank_details: true,
    };

    // Récupérer les items
    const itemsResult = await pool.query(`
      SELECT * FROM invoice_items WHERE invoice_id = $1
    `, [id]);

    const html = generateDocumentHTML(documentData, itemsResult.rows, 'FACTURE');

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error: any) {
    console.error('Error generating invoice PDF:', error);
    res.status(500).json({ error: error.message });
  }
});

function generateDocumentHTML(document: any, items: any[], type: string): string {
  const primaryColor = document.primary_color || '#007AFF';
  const companyName = document.company_name || 'Nom de l\'entreprise';

  // Convertir le logo_url en URL absolue si c'est un chemin relatif
  let logoUrl = document.logo_url || '';
  if (logoUrl && !logoUrl.startsWith('http')) {
    logoUrl = `http://localhost:3000${logoUrl}`;
  }

  const isInvoice = type === 'FACTURE';

  const total_ht = items.reduce((sum, item) => sum + (parseFloat(item.quantity) * parseFloat(item.unit_price)), 0);
  const total_tva = total_ht * 0.20;
  const total_ttc = total_ht + total_tva;

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${type} - ${document.invoice_number || document.quote_number}</title>
  <style>
    @page {
      size: A4;
      margin: 12mm 15mm;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Helvetica', 'Arial', sans-serif;
      font-size: 8.5pt;
      line-height: 1.25;
      color: #1a1a1a;
      background: white;
      -webkit-font-smoothing: antialiased;
    }

    .document {
      max-width: 210mm;
      margin: 0 auto;
      background: white;
      position: relative;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 12px;
      border-bottom: 3px solid ${primaryColor};
      margin-bottom: 12px;
    }

    .logo {
      width: 55px;
      height: 55px;
      object-fit: contain;
      border-radius: 4px;
    }

    .company-info {
      flex: 1;
      margin-left: 14px;
    }

    .company-name {
      font-size: 13pt;
      font-weight: 700;
      color: #000;
      margin-bottom: 3px;
      letter-spacing: -0.2pt;
    }

    .company-detail {
      font-size: 8.5pt;
      color: #4a4a4a;
      line-height: 1.3;
      margin-bottom: 1px;
    }

    .document-info {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 12px;
    }

    .document-type {
      font-size: 20pt;
      font-weight: 700;
      color: ${primaryColor};
      margin-bottom: 5px;
      letter-spacing: -0.5pt;
    }

    .document-number {
      font-size: 10.5pt;
      font-weight: 600;
      color: #000;
      margin-bottom: 3px;
    }

    .document-date {
      font-size: 8.5pt;
      color: #666;
      line-height: 1.3;
    }

    .client-info {
      background: linear-gradient(135deg, #f9f9f9 0%, #f5f5f5 100%);
      padding: 10px;
      border-radius: 4px;
      border: 1px solid #e8e8e8;
      max-width: 48%;
      box-shadow: 0 1px 2px rgba(0,0,0,0.03);
    }

    .client-label {
      font-size: 8pt;
      font-weight: 700;
      color: ${primaryColor};
      text-transform: uppercase;
      margin-bottom: 4px;
      letter-spacing: 0.5pt;
    }

    .client-name {
      font-size: 10.5pt;
      font-weight: 700;
      color: #000;
      margin-bottom: 3px;
    }

    .client-detail {
      font-size: 8.5pt;
      color: #4a4a4a;
      line-height: 1.3;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0;
      font-size: 8.5pt;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      overflow: hidden;
    }

    thead {
      background: linear-gradient(180deg, ${primaryColor} 0%, ${primaryColor}dd 100%);
      color: white;
    }

    th {
      padding: 8px 6px;
      text-align: left;
      font-size: 8.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.3pt;
    }

    th:nth-child(2), th:nth-child(3), th:nth-child(4) {
      text-align: right;
    }

    tbody tr {
      border-bottom: 1px solid #e8e8e8;
      transition: background 0.15s ease;
    }

    tbody tr:nth-child(even) {
      background: #fafafa;
    }

    tbody tr:last-child {
      border-bottom: none;
    }

    td {
      padding: 5px 6px;
      font-size: 8pt;
      color: #1a1a1a;
      line-height: 1.2;
    }

    td:nth-child(2), td:nth-child(3), td:nth-child(4) {
      text-align: right;
      font-weight: 500;
    }

    td:nth-child(4) {
      font-weight: 600;
    }

    .totals {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      margin-top: 12px;
      padding: 10px;
      background: #fafafa;
      border-radius: 4px;
      border: 1px solid #e8e8e8;
    }

    .total-row {
      display: flex;
      justify-content: space-between;
      min-width: 240px;
      padding: 4px 0;
      font-size: 9.5pt;
    }

    .total-label {
      color: #666;
      font-weight: 500;
    }

    .total-value {
      font-weight: 600;
      color: #1a1a1a;
      font-variant-numeric: tabular-nums;
    }

    .total-final {
      border-top: 2px solid ${primaryColor};
      margin-top: 6px;
      padding-top: 8px;
      background: white;
      padding: 8px;
      border-radius: 3px;
      margin-left: -8px;
      margin-right: -8px;
    }

    .total-final .total-label {
      font-size: 12pt;
      font-weight: 700;
      color: #000;
    }

    .total-final .total-value {
      font-size: 14pt;
      font-weight: 700;
      color: ${primaryColor};
    }

    .legal-mentions {
      margin-top: 10px;
      padding: 8px;
      background: linear-gradient(135deg, #f9f9f9 0%, #f5f5f5 100%);
      border-left: 3px solid ${primaryColor};
      border-radius: 0 4px 4px 0;
      font-size: 7pt;
      line-height: 1.3;
      box-shadow: 0 1px 2px rgba(0,0,0,0.03);
    }

    .legal-title {
      font-weight: 700;
      margin-bottom: 5px;
      font-size: 8.5pt;
      color: ${primaryColor};
      text-transform: uppercase;
      letter-spacing: 0.3pt;
    }

    .legal-text {
      color: #4a4a4a;
      margin-bottom: 3px;
      padding-left: 8px;
    }

    .footer {
      margin-top: 12px;
      padding-top: 10px;
      border-top: 2px solid #e8e8e8;
      text-align: center;
      font-size: 7.5pt;
      color: #888;
      line-height: 1.4;
    }

    .payment-info {
      margin-top: 10px;
      padding: 8px;
      background: linear-gradient(135deg, #e8f4fd 0%, #dceefb 100%);
      border-radius: 4px;
      border: 1px solid #b8ddf5;
      font-size: 8pt;
      line-height: 1.3;
      box-shadow: 0 1px 2px rgba(0,0,0,0.03);
    }

    .payment-title {
      font-weight: 700;
      margin-bottom: 5px;
      color: #0066cc;
      font-size: 9pt;
      text-transform: uppercase;
      letter-spacing: 0.3pt;
    }

    .payment-detail {
      color: #1a1a1a;
      font-weight: 500;
      margin-bottom: 2px;
    }

    @media print {
      @page {
        margin: 12mm 15mm;
      }

      body {
        margin: 0;
        padding: 0;
      }

      .document {
        margin: 0;
        box-shadow: none;
        page-break-after: avoid;
      }

      .header, .document-info, table, .totals, .payment-info, .legal-mentions {
        page-break-inside: avoid;
      }

      tbody tr:nth-child(even) {
        background: #fafafa !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }

    /* Masquer l'URL en bas de page */
    @page {
      @bottom-center {
        content: none;
      }
    }
  </style>
</head>
<body>
  <div class="document">
    <!-- Header -->
    <div class="header">
      <div style="display: flex; flex: 1;">
        ${logoUrl ? `<img src="${logoUrl}" alt="Logo" class="logo">` : ''}
        <div class="company-info">
          <div class="company-name">${companyName}${document.company_legal_form ? ` (${document.company_legal_form})` : ''}</div>
          ${document.company_address ? `<div class="company-detail">${document.company_address}</div>` : ''}
          ${document.company_phone ? `<div class="company-detail">Tél: ${document.company_phone}</div>` : ''}
          ${document.company_email ? `<div class="company-detail">Email: ${document.company_email}</div>` : ''}
          ${document.company_siret ? `<div class="company-detail">SIRET: ${document.company_siret}</div>` : ''}
          ${document.company_tva && !document.is_micro_entreprise ? `<div class="company-detail">N° TVA: ${document.company_tva}</div>` : ''}
          ${document.company_rcs ? `<div class="company-detail">${document.company_rcs}</div>` : ''}
          ${document.company_capital ? `<div class="company-detail">Capital: ${document.company_capital}</div>` : ''}
        </div>
      </div>
    </div>

    <!-- Document Info & Client -->
    <div class="document-info">
      <div>
        <div class="document-type">${type}</div>
        <div class="document-number">N° ${document.invoice_number || document.quote_number || 'N/A'}</div>
        <div class="document-date">Date d'émission: ${new Date(document.invoice_date || document.created_at).toLocaleDateString('fr-FR')}</div>
        ${isInvoice && document.due_date ? `<div class="document-date">Date d'échéance: ${new Date(document.due_date).toLocaleDateString('fr-FR')}</div>` : ''}
      </div>
      <div class="client-info">
        <div class="client-label">Client:</div>
        <div class="client-name">${document.customer_name || 'N/A'}</div>
        ${document.customer_email ? `<div class="client-detail">${document.customer_email}</div>` : ''}
        ${document.customer_address ? `<div class="client-detail">${document.customer_address}</div>` : ''}
      </div>
    </div>

    <!-- Items Table -->
    <table>
      <thead>
        <tr>
          <th>${document.table_header_description || 'Description'}</th>
          <th>${document.table_header_quantity || 'Qté'}</th>
          <th>${document.table_header_unit_price || 'Prix U. HT'}</th>
          <th>${document.table_header_total || 'Total HT'}</th>
        </tr>
      </thead>
      <tbody>
        ${items.map((item, index) => `
          <tr>
            <td>${item.description || `Article ${index + 1}`}</td>
            <td>${item.quantity || 1}</td>
            <td>${parseFloat(item.unit_price || 0).toFixed(2)} €</td>
            <td style="font-weight: 600;">${(parseFloat(item.quantity || 1) * parseFloat(item.unit_price || 0)).toFixed(2)} €</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <!-- Totals -->
    <div class="totals">
      <div class="total-row">
        <span class="total-label">${document.subtotal_label || 'Total HT:'}</span>
        <span class="total-value">${total_ht.toFixed(2)} €</span>
      </div>
      <div class="total-row">
        <span class="total-label">${document.vat_label || 'TVA (20%):'}</span>
        <span class="total-value">${total_tva.toFixed(2)} €</span>
      </div>
      <div class="total-row total-final">
        <span class="total-label">${document.total_label || 'Total TTC:'}</span>
        <span class="total-value">${total_ttc.toFixed(2)} €</span>
      </div>
    </div>

    <!-- Payment Info for Invoices -->
    ${isInvoice && document.show_bank_details ? `
      <div class="payment-info">
        <div class="payment-title">Coordonnées bancaires</div>
        ${document.bank_name ? `<div class="payment-detail">Banque: ${document.bank_name}</div>` : ''}
        ${document.bank_iban ? `<div class="payment-detail">IBAN: ${document.bank_iban}</div>` : ''}
        ${document.bank_bic ? `<div class="payment-detail">BIC: ${document.bank_bic}</div>` : ''}
        ${!document.bank_name && !document.bank_iban && !document.bank_bic ? `<div class="payment-detail" style="font-style: italic; color: #666;">À configurer dans les paramètres de votre profil d'entreprise</div>` : ''}
      </div>
    ` : ''}

    <!-- Legal Mentions (Obligatoires pour factures) -->
    ${isInvoice ? `
      <div class="legal-mentions">
        <div class="legal-title">Mentions légales obligatoires</div>
        <div class="legal-text">• ${document.late_payment_penalty || 'En cas de retard de paiement, pénalité égale à 3 fois le taux d\'intérêt légal (article L441-6 du Code de commerce)'}</div>
        <div class="legal-text">• ${document.recovery_indemnity || 'Indemnité forfaitaire pour frais de recouvrement en cas de retard de paiement : 40 € (décret 2012-1115)'}</div>
        ${document.is_micro_entreprise ? `<div class="legal-text">• TVA non applicable, article 293 B du Code général des impôts</div>` : ''}
        ${document.payment_terms ? `<div class="legal-text">• Conditions de paiement: ${document.payment_terms}</div>` : ''}
      </div>
    ` : ''}

    <!-- Footer -->
    ${document.footer_text ? `<div class="footer">${document.footer_text}</div>` : ''}
  </div>

  <script>
    // Auto-print désactivé pour éviter l'affichage de l'URL blob
    // L'utilisateur peut imprimer manuellement avec Ctrl+P ou Cmd+P
    // En désactivant "En-têtes et pieds de page" dans les options d'impression
  </script>
</body>
</html>
  `;
}

export default router;
