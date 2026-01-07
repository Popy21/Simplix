import express, { Response } from 'express';
import { pool as db } from '../database/db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

// ==========================================
// CONFIGURATION FACTUR-X
// ==========================================

// Récupérer la configuration
router.get('/settings', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;

    const result = await db.query(
      'SELECT * FROM facturx_settings WHERE organization_id = $1',
      [organizationId]
    );

    if (result.rows.length === 0) {
      // Retourner les valeurs par défaut
      res.json({
        is_enabled: false,
        profile: 'EN16931',
        auto_generate: true,
        auto_embed_pdf: true,
        send_to_pdp: false,
        chorus_pro_enabled: false,
        compliance_status: 'not_configured'
      });
      return;
    }

    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Mettre à jour la configuration
router.put('/settings', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;
    const {
      is_enabled,
      profile,
      seller_siret,
      seller_siren,
      seller_tva_intracom,
      seller_naf_code,
      seller_rcs,
      seller_legal_form,
      bank_iban,
      bank_bic,
      bank_name,
      auto_generate,
      auto_embed_pdf,
      send_to_pdp,
      pdp_provider,
      pdp_api_key,
      pdp_api_secret,
      pdp_endpoint,
      chorus_pro_enabled,
      chorus_pro_siret,
      chorus_pro_service_code,
      chorus_pro_engagement
    } = req.body;

    // Vérifier si la config existe
    const existing = await db.query(
      'SELECT id FROM facturx_settings WHERE organization_id = $1',
      [organizationId]
    );

    let result;

    if (existing.rows.length > 0) {
      result = await db.query(`
        UPDATE facturx_settings SET
          is_enabled = COALESCE($1, is_enabled),
          profile = COALESCE($2, profile),
          seller_siret = $3,
          seller_siren = $4,
          seller_tva_intracom = $5,
          seller_naf_code = $6,
          seller_rcs = $7,
          seller_legal_form = $8,
          bank_iban = $9,
          bank_bic = $10,
          bank_name = $11,
          auto_generate = COALESCE($12, auto_generate),
          auto_embed_pdf = COALESCE($13, auto_embed_pdf),
          send_to_pdp = COALESCE($14, send_to_pdp),
          pdp_provider = $15,
          pdp_api_key = $16,
          pdp_api_secret = $17,
          pdp_endpoint = $18,
          chorus_pro_enabled = COALESCE($19, chorus_pro_enabled),
          chorus_pro_siret = $20,
          chorus_pro_service_code = $21,
          chorus_pro_engagement = $22,
          updated_at = NOW()
        WHERE organization_id = $23
        RETURNING *
      `, [
        is_enabled, profile, seller_siret, seller_siren, seller_tva_intracom,
        seller_naf_code, seller_rcs, seller_legal_form, bank_iban, bank_bic,
        bank_name, auto_generate, auto_embed_pdf, send_to_pdp, pdp_provider,
        pdp_api_key, pdp_api_secret, pdp_endpoint, chorus_pro_enabled,
        chorus_pro_siret, chorus_pro_service_code, chorus_pro_engagement,
        organizationId
      ]);
    } else {
      result = await db.query(`
        INSERT INTO facturx_settings (
          organization_id, is_enabled, profile, seller_siret, seller_siren,
          seller_tva_intracom, seller_naf_code, seller_rcs, seller_legal_form,
          bank_iban, bank_bic, bank_name, auto_generate, auto_embed_pdf,
          send_to_pdp, pdp_provider, pdp_api_key, pdp_api_secret, pdp_endpoint,
          chorus_pro_enabled, chorus_pro_siret, chorus_pro_service_code,
          chorus_pro_engagement
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
        RETURNING *
      `, [
        organizationId, is_enabled || false, profile || 'EN16931',
        seller_siret, seller_siren, seller_tva_intracom, seller_naf_code,
        seller_rcs, seller_legal_form, bank_iban, bank_bic, bank_name,
        auto_generate !== false, auto_embed_pdf !== false, send_to_pdp || false,
        pdp_provider, pdp_api_key, pdp_api_secret, pdp_endpoint,
        chorus_pro_enabled || false, chorus_pro_siret, chorus_pro_service_code,
        chorus_pro_engagement
      ]);
    }

    res.json(result.rows[0]);
  } catch (err: any) {
    console.error('Erreur mise à jour config Factur-X:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// GÉNÉRATION FACTUR-X
// ==========================================

// Générer le XML Factur-X pour une facture
router.post('/generate/:invoiceId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { invoiceId } = req.params;
    const organizationId = (req.user as any)?.organizationId;

    // Récupérer la configuration
    const settingsResult = await db.query(
      'SELECT * FROM facturx_settings WHERE organization_id = $1',
      [organizationId]
    );

    if (settingsResult.rows.length === 0 || !settingsResult.rows[0].is_enabled) {
      res.status(400).json({ error: 'Factur-X n\'est pas activé pour cette organisation' });
      return;
    }

    const settings = settingsResult.rows[0];

    // Récupérer la facture
    const invoiceResult = await db.query(`
      SELECT
        i.*,
        c.name as customer_name,
        c.email as customer_email,
        c.address as customer_address,
        c.city as customer_city,
        c.postal_code as customer_postal_code,
        c.country as customer_country,
        c.siret as customer_siret,
        c.tva_number as customer_tva,
        c.facturx_identifier,
        c.facturx_identifier_scheme
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      WHERE i.id = $1 AND i.organization_id = $2 AND i.deleted_at IS NULL
    `, [invoiceId, organizationId]);

    if (invoiceResult.rows.length === 0) {
      res.status(404).json({ error: 'Facture non trouvée' });
      return;
    }

    const invoice = invoiceResult.rows[0];

    // Récupérer les lignes
    const itemsResult = await db.query(`
      SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY sort_order
    `, [invoiceId]);

    // Récupérer le profil entreprise
    const companyResult = await db.query(
      'SELECT * FROM company_profiles WHERE organization_id = $1 LIMIT 1',
      [organizationId]
    );

    const company = companyResult.rows[0] || {};

    // Générer le XML Factur-X (format simplifié - EN16931)
    const xml = generateFacturXML({
      settings,
      company,
      invoice,
      items: itemsResult.rows,
      profile: settings.profile
    });

    // Sauvegarder le XML
    await db.query(`
      UPDATE invoices SET
        facturx_xml = $1,
        facturx_profile = $2,
        facturx_generated_at = NOW(),
        facturx_status = 'generated'
      WHERE id = $3
    `, [xml, settings.profile, invoiceId]);

    // Logger l'action
    await db.query(`
      INSERT INTO facturx_logs (invoice_id, organization_id, action, status, profile)
      VALUES ($1, $2, 'generate', 'generated', $3)
    `, [invoiceId, organizationId, settings.profile]);

    res.json({
      invoice_id: invoiceId,
      invoice_number: invoice.invoice_number,
      profile: settings.profile,
      xml,
      generated_at: new Date().toISOString(),
      message: 'XML Factur-X généré avec succès'
    });
  } catch (err: any) {
    console.error('Erreur génération Factur-X:', err);
    res.status(500).json({ error: err.message });
  }
});

// Fonction pour générer le XML Factur-X (format EN16931)
function generateFacturXML(data: {
  settings: any;
  company: any;
  invoice: any;
  items: any[];
  profile: string;
}): string {
  const { settings, company, invoice, items, profile } = data;

  // Format date ISO
  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toISOString().split('T')[0].replace(/-/g, '');
  };

  // Échapper les caractères XML
  const escapeXml = (str: string | null | undefined) => {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  // Générer les lignes de facture
  const lineItems = items.map((item, index) => `
    <ram:IncludedSupplyChainTradeLineItem>
      <ram:AssociatedDocumentLineDocument>
        <ram:LineID>${index + 1}</ram:LineID>
      </ram:AssociatedDocumentLineDocument>
      <ram:SpecifiedTradeProduct>
        <ram:Name>${escapeXml(item.description)}</ram:Name>
      </ram:SpecifiedTradeProduct>
      <ram:SpecifiedLineTradeAgreement>
        <ram:NetPriceProductTradePrice>
          <ram:ChargeAmount>${parseFloat(item.unit_price).toFixed(2)}</ram:ChargeAmount>
        </ram:NetPriceProductTradePrice>
      </ram:SpecifiedLineTradeAgreement>
      <ram:SpecifiedLineTradeDelivery>
        <ram:BilledQuantity unitCode="C62">${parseFloat(item.quantity).toFixed(2)}</ram:BilledQuantity>
      </ram:SpecifiedLineTradeDelivery>
      <ram:SpecifiedLineTradeSettlement>
        <ram:ApplicableTradeTax>
          <ram:TypeCode>VAT</ram:TypeCode>
          <ram:CategoryCode>S</ram:CategoryCode>
          <ram:RateApplicablePercent>${parseFloat(item.tax_rate || invoice.tax_rate || 20).toFixed(2)}</ram:RateApplicablePercent>
        </ram:ApplicableTradeTax>
        <ram:SpecifiedTradeSettlementLineMonetarySummation>
          <ram:LineTotalAmount>${parseFloat(item.total_price).toFixed(2)}</ram:LineTotalAmount>
        </ram:SpecifiedTradeSettlementLineMonetarySummation>
      </ram:SpecifiedLineTradeSettlement>
    </ram:IncludedSupplyChainTradeLineItem>`).join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
  xmlns:qdt="urn:un:unece:uncefact:data:standard:QualifiedDataType:100"
  xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"
  xmlns:xs="http://www.w3.org/2001/XMLSchema"
  xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">
  <rsm:ExchangedDocumentContext>
    <ram:GuidelineSpecifiedDocumentContextParameter>
      <ram:ID>urn:factur-x.eu:1p0:${profile.toLowerCase()}</ram:ID>
    </ram:GuidelineSpecifiedDocumentContextParameter>
  </rsm:ExchangedDocumentContext>
  <rsm:ExchangedDocument>
    <ram:ID>${escapeXml(invoice.invoice_number)}</ram:ID>
    <ram:TypeCode>380</ram:TypeCode>
    <ram:IssueDateTime>
      <udt:DateTimeString format="102">${formatDate(invoice.invoice_date)}</udt:DateTimeString>
    </ram:IssueDateTime>
  </rsm:ExchangedDocument>
  <rsm:SupplyChainTradeTransaction>
    <ram:ApplicableHeaderTradeAgreement>
      <ram:SellerTradeParty>
        <ram:Name>${escapeXml(company.company_name || 'Entreprise')}</ram:Name>
        <ram:SpecifiedLegalOrganization>
          <ram:ID schemeID="0002">${escapeXml(settings.seller_siret || '')}</ram:ID>
        </ram:SpecifiedLegalOrganization>
        <ram:PostalTradeAddress>
          <ram:LineOne>${escapeXml(company.address || '')}</ram:LineOne>
          <ram:PostcodeCode>${escapeXml(company.postal_code || '')}</ram:PostcodeCode>
          <ram:CityName>${escapeXml(company.city || '')}</ram:CityName>
          <ram:CountryID>${escapeXml(company.country || 'FR')}</ram:CountryID>
        </ram:PostalTradeAddress>
        <ram:SpecifiedTaxRegistration>
          <ram:ID schemeID="VA">${escapeXml(settings.seller_tva_intracom || '')}</ram:ID>
        </ram:SpecifiedTaxRegistration>
      </ram:SellerTradeParty>
      <ram:BuyerTradeParty>
        <ram:Name>${escapeXml(invoice.customer_name)}</ram:Name>
        ${invoice.customer_siret ? `<ram:SpecifiedLegalOrganization><ram:ID schemeID="0002">${escapeXml(invoice.customer_siret)}</ram:ID></ram:SpecifiedLegalOrganization>` : ''}
        <ram:PostalTradeAddress>
          <ram:LineOne>${escapeXml(invoice.customer_address || '')}</ram:LineOne>
          <ram:PostcodeCode>${escapeXml(invoice.customer_postal_code || '')}</ram:PostcodeCode>
          <ram:CityName>${escapeXml(invoice.customer_city || '')}</ram:CityName>
          <ram:CountryID>${escapeXml(invoice.customer_country || 'FR')}</ram:CountryID>
        </ram:PostalTradeAddress>
        ${invoice.customer_tva ? `<ram:SpecifiedTaxRegistration><ram:ID schemeID="VA">${escapeXml(invoice.customer_tva)}</ram:ID></ram:SpecifiedTaxRegistration>` : ''}
      </ram:BuyerTradeParty>
    </ram:ApplicableHeaderTradeAgreement>
    <ram:ApplicableHeaderTradeDelivery/>
    <ram:ApplicableHeaderTradeSettlement>
      <ram:InvoiceCurrencyCode>${invoice.currency || 'EUR'}</ram:InvoiceCurrencyCode>
      ${settings.bank_iban ? `
      <ram:SpecifiedTradeSettlementPaymentMeans>
        <ram:TypeCode>30</ram:TypeCode>
        <ram:PayeePartyCreditorFinancialAccount>
          <ram:IBANID>${escapeXml(settings.bank_iban)}</ram:IBANID>
        </ram:PayeePartyCreditorFinancialAccount>
        ${settings.bank_bic ? `<ram:PayeeSpecifiedCreditorFinancialInstitution><ram:BICID>${escapeXml(settings.bank_bic)}</ram:BICID></ram:PayeeSpecifiedCreditorFinancialInstitution>` : ''}
      </ram:SpecifiedTradeSettlementPaymentMeans>` : ''}
      <ram:ApplicableTradeTax>
        <ram:CalculatedAmount>${parseFloat(invoice.tax_amount || 0).toFixed(2)}</ram:CalculatedAmount>
        <ram:TypeCode>VAT</ram:TypeCode>
        <ram:BasisAmount>${parseFloat(invoice.subtotal || 0).toFixed(2)}</ram:BasisAmount>
        <ram:CategoryCode>S</ram:CategoryCode>
        <ram:RateApplicablePercent>${parseFloat(invoice.tax_rate || 20).toFixed(2)}</ram:RateApplicablePercent>
      </ram:ApplicableTradeTax>
      ${invoice.due_date ? `
      <ram:SpecifiedTradePaymentTerms>
        <ram:DueDateDateTime>
          <udt:DateTimeString format="102">${formatDate(invoice.due_date)}</udt:DateTimeString>
        </ram:DueDateDateTime>
      </ram:SpecifiedTradePaymentTerms>` : ''}
      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:LineTotalAmount>${parseFloat(invoice.subtotal || 0).toFixed(2)}</ram:LineTotalAmount>
        <ram:TaxBasisTotalAmount>${parseFloat(invoice.subtotal || 0).toFixed(2)}</ram:TaxBasisTotalAmount>
        <ram:TaxTotalAmount currencyID="${invoice.currency || 'EUR'}">${parseFloat(invoice.tax_amount || 0).toFixed(2)}</ram:TaxTotalAmount>
        <ram:GrandTotalAmount>${parseFloat(invoice.total_amount || 0).toFixed(2)}</ram:GrandTotalAmount>
        <ram:DuePayableAmount>${(parseFloat(invoice.total_amount || 0) - parseFloat(invoice.paid_amount || 0)).toFixed(2)}</ram:DuePayableAmount>
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
    </ram:ApplicableHeaderTradeSettlement>
    ${lineItems}
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>`;

  return xml.trim();
}

// Récupérer le XML d'une facture
router.get('/xml/:invoiceId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { invoiceId } = req.params;
    const organizationId = (req.user as any)?.organizationId;

    const result = await db.query(`
      SELECT invoice_number, facturx_xml, facturx_profile, facturx_generated_at
      FROM invoices
      WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
    `, [invoiceId, organizationId]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Facture non trouvée' });
      return;
    }

    const invoice = result.rows[0];

    if (!invoice.facturx_xml) {
      res.status(400).json({ error: 'Aucun XML Factur-X généré pour cette facture' });
      return;
    }

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename=facturx_${invoice.invoice_number}.xml`);
    res.send(invoice.facturx_xml);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Statut de conformité
router.get('/compliance', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;

    const settingsResult = await db.query(
      'SELECT * FROM facturx_settings WHERE organization_id = $1',
      [organizationId]
    );

    const settings = settingsResult.rows[0];
    const issues: string[] = [];
    const warnings: string[] = [];

    if (!settings || !settings.is_enabled) {
      issues.push('Factur-X n\'est pas activé');
    } else {
      if (!settings.seller_siret) issues.push('SIRET vendeur non renseigné');
      if (!settings.seller_tva_intracom) issues.push('Numéro de TVA intracommunautaire non renseigné');
      if (!settings.bank_iban) warnings.push('IBAN non renseigné (recommandé pour le paiement)');
      if (!settings.bank_bic) warnings.push('BIC non renseigné');
    }

    // Vérifier le profil entreprise
    const companyResult = await db.query(
      'SELECT * FROM company_profiles WHERE organization_id = $1',
      [organizationId]
    );

    if (companyResult.rows.length === 0) {
      issues.push('Profil entreprise non configuré');
    } else {
      const company = companyResult.rows[0];
      if (!company.company_name) issues.push('Nom de l\'entreprise non renseigné');
      if (!company.address) warnings.push('Adresse de l\'entreprise non renseignée');
    }

    res.json({
      compliant: issues.length === 0,
      is_enabled: settings?.is_enabled || false,
      profile: settings?.profile || 'EN16931',
      issues,
      warnings,
      deadlines: {
        large_companies: '2026-09-01',
        mid_companies: '2027-09-01',
        small_companies: '2028-09-01'
      },
      recommendation: issues.length > 0
        ? 'Complétez les informations manquantes pour être conforme à la facturation électronique'
        : 'Votre configuration Factur-X est prête pour la facturation électronique'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Logs Factur-X
router.get('/logs', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = (req.user as any)?.organizationId;
    const { invoice_id, limit = 50 } = req.query;

    let query = `
      SELECT
        fl.*,
        i.invoice_number
      FROM facturx_logs fl
      LEFT JOIN invoices i ON fl.invoice_id = i.id
      WHERE fl.organization_id = $1
    `;
    const params: any[] = [organizationId];

    if (invoice_id) {
      params.push(invoice_id);
      query += ` AND fl.invoice_id = $${params.length}`;
    }

    query += ` ORDER BY fl.created_at DESC LIMIT $${params.length + 1}`;
    params.push(Number(limit));

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
