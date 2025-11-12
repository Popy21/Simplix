# 📄 E-FACTURATION (FACTUR-X / CHORUS PRO)

## 🎯 Objectif
Rendre Simplix conforme à la réforme française de la facturation électronique obligatoire à partir de 2026, en supportant les formats Factur-X et l'intégration avec Chorus Pro.

---

## 📋 Contexte réglementaire

### Obligation légale France
- **2024-2026** : Déploiement progressif obligatoire
- **Entreprises B2B** : Toutes factures doivent être électroniques
- **Formats acceptés** : Factur-X (PDF/A-3 + XML), UBL, CII
- **Plateforme** : Chorus Pro pour secteur public

### Standards à implémenter
1. **Factur-X** (recommandé) : PDF/A-3 + XML embarqué (norme EN 16931)
2. **Chorus Pro API** : Dépôt automatique des factures
3. **Signature électronique** : Optionnelle mais recommandée

---

## 🏗️ Architecture technique

### Stack technologique
```
Backend (Node.js/TypeScript):
├── Génération PDF/A-3: pdf-lib + Puppeteer
├── Génération XML: xml-js ou fast-xml-parser
├── Validation: factur-x-validator
├── Chorus Pro API: axios + authentification OAuth2
└── Signature: node-signpdf (PKCS#7)

Frontend (React Native):
├── Aperçu factures Factur-X
├── Toggle E-facture activé/désactivé
└── Configuration Chorus Pro
```

### Composants à développer

#### 1. **Module Factur-X Generator**
```typescript
// api/src/services/facturx/generator.ts
interface FacturXConfig {
  invoiceData: Invoice;
  sellerInfo: Company;
  buyerInfo: Company;
  lineItems: InvoiceItem[];
  taxDetails: Tax[];
  paymentTerms: PaymentTerms;
}

class FacturXGenerator {
  async generateFacturX(config: FacturXConfig): Promise<Buffer> {
    // 1. Générer PDF classique (existant)
    const pdf = await this.generatePDF(config);

    // 2. Générer XML EN 16931
    const xml = await this.generateXML(config);

    // 3. Convertir PDF en PDF/A-3
    const pdfA3 = await this.convertToPDFA3(pdf);

    // 4. Embarquer XML dans PDF/A-3
    const facturX = await this.embedXMLInPDF(pdfA3, xml);

    return facturX;
  }

  private async generateXML(config: FacturXConfig): Promise<string> {
    // Format CII (Cross Industry Invoice)
    const xml = {
      'rsm:CrossIndustryInvoice': {
        '@xmlns:rsm': 'urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100',
        '@xmlns:qdt': 'urn:un:unece:uncefact:data:standard:QualifiedDataType:100',
        '@xmlns:ram': 'urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100',
        '@xmlns:udt': 'urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100',
        'rsm:ExchangedDocumentContext': {
          'ram:GuidelineSpecifiedDocumentContextParameter': {
            'ram:ID': 'urn:cen.eu:en16931:2017'
          }
        },
        'rsm:ExchangedDocument': {
          'ram:ID': config.invoiceData.invoice_number,
          'ram:TypeCode': '380', // Facture commerciale
          'ram:IssueDateTime': {
            'udt:DateTimeString': {
              '@format': '102',
              '#text': this.formatDate(config.invoiceData.issue_date)
            }
          }
        },
        'rsm:SupplyChainTradeTransaction': {
          'ram:ApplicableHeaderTradeAgreement': {
            'ram:SellerTradeParty': this.formatSellerXML(config.sellerInfo),
            'ram:BuyerTradeParty': this.formatBuyerXML(config.buyerInfo)
          },
          'ram:ApplicableHeaderTradeDelivery': {
            // Informations de livraison
          },
          'ram:ApplicableHeaderTradeSettlement': {
            'ram:InvoiceCurrencyCode': config.invoiceData.currency || 'EUR',
            'ram:SpecifiedTradeSettlementHeaderMonetarySummation': {
              'ram:TaxBasisTotalAmount': config.invoiceData.subtotal,
              'ram:TaxTotalAmount': config.invoiceData.tax_amount,
              'ram:GrandTotalAmount': config.invoiceData.total_amount,
              'ram:DuePayableAmount': config.invoiceData.amount_due
            }
          },
          'ram:IncludedSupplyChainTradeLineItem': config.lineItems.map(item =>
            this.formatLineItemXML(item)
          )
        }
      }
    };

    return xmlBuilder.build(xml);
  }

  private async convertToPDFA3(pdfBuffer: Buffer): Promise<Buffer> {
    // Utiliser pdf-lib pour conversion PDF/A-3
    const pdfDoc = await PDFDocument.load(pdfBuffer);

    // Ajouter métadonnées PDF/A-3
    pdfDoc.setTitle('Invoice ' + invoiceNumber);
    pdfDoc.setSubject('Electronic Invoice');
    pdfDoc.setCreator('Simplix CRM');
    pdfDoc.setProducer('Simplix E-Invoicing Module');

    // Ajouter profil couleur ICC (requis PDF/A)
    const iccProfile = await fs.readFile('./assets/sRGB_IEC61966-2-1.icc');
    // ... embed ICC profile

    return await pdfDoc.save();
  }

  private async embedXMLInPDF(pdf: Buffer, xml: string): Promise<Buffer> {
    const pdfDoc = await PDFDocument.load(pdf);

    // Attacher le XML comme fichier embarqué
    await pdfDoc.attach(
      Buffer.from(xml, 'utf-8'),
      'factur-x.xml',
      {
        mimeType: 'text/xml',
        description: 'Factur-X Invoice',
        creationDate: new Date(),
        modificationDate: new Date(),
      }
    );

    return await pdfDoc.save();
  }
}
```

#### 2. **Chorus Pro Integration**
```typescript
// api/src/services/chorus-pro/client.ts
class ChorusProClient {
  private baseURL = 'https://chorus-pro.gouv.fr/api';
  private oauth: OAuth2Client;

  constructor(clientId: string, clientSecret: string) {
    this.oauth = new OAuth2Client({
      clientId,
      clientSecret,
      tokenEndpoint: `${this.baseURL}/oauth/token`
    });
  }

  async authenticate(): Promise<string> {
    const token = await this.oauth.getToken({
      grant_type: 'client_credentials',
      scope: 'invoice:write'
    });
    return token.access_token;
  }

  async submitInvoice(facturX: Buffer, metadata: ChorusProMetadata): Promise<string> {
    const token = await this.authenticate();

    const formData = new FormData();
    formData.append('file', facturX, 'invoice.pdf');
    formData.append('metadata', JSON.stringify({
      destinataire_siret: metadata.buyerSiret,
      service_executant: metadata.serviceCode,
      montant_ht: metadata.amountExclTax,
      montant_ttc: metadata.amountInclTax
    }));

    const response = await axios.post(
      `${this.baseURL}/factures/deposer`,
      formData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      }
    );

    return response.data.identifiantFacture; // ID Chorus Pro
  }

  async getInvoiceStatus(chorusProId: string): Promise<ChorusProStatus> {
    const token = await this.authenticate();

    const response = await axios.get(
      `${this.baseURL}/factures/${chorusProId}/statut`,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );

    return response.data;
  }
}
```

#### 3. **Routes API**
```typescript
// api/src/routes/efacture.ts
import express from 'express';
import { authenticate } from '../middleware/auth';
import { FacturXGenerator } from '../services/facturx/generator';
import { ChorusProClient } from '../services/chorus-pro/client';

const router = express.Router();

// Générer une facture Factur-X
router.post('/invoices/:id/generate-facturx', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const invoice = await db.query('SELECT * FROM invoices WHERE id = $1', [id]);

    if (!invoice.rows[0]) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const generator = new FacturXGenerator();
    const facturXBuffer = await generator.generateFacturX({
      invoiceData: invoice.rows[0],
      // ... autres données
    });

    // Sauvegarder le fichier
    const filename = `invoice-${invoice.rows[0].invoice_number}-facturx.pdf`;
    await fs.writeFile(`./uploads/invoices/${filename}`, facturXBuffer);

    // Mettre à jour la BDD
    await db.query(
      'UPDATE invoices SET facturx_file = $1, facturx_generated_at = NOW() WHERE id = $2',
      [filename, id]
    );

    res.json({
      success: true,
      filename,
      downloadUrl: `/api/invoices/${id}/download-facturx`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Soumettre à Chorus Pro
router.post('/invoices/:id/submit-chorus-pro', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const invoice = await db.query('SELECT * FROM invoices WHERE id = $1', [id]);

    if (!invoice.rows[0].facturx_file) {
      return res.status(400).json({ error: 'Factur-X not generated yet' });
    }

    const facturXBuffer = await fs.readFile(`./uploads/invoices/${invoice.rows[0].facturx_file}`);

    const chorusClient = new ChorusProClient(
      process.env.CHORUS_PRO_CLIENT_ID,
      process.env.CHORUS_PRO_CLIENT_SECRET
    );

    const chorusProId = await chorusClient.submitInvoice(facturXBuffer, {
      buyerSiret: req.body.buyer_siret,
      serviceCode: req.body.service_code,
      amountExclTax: invoice.rows[0].subtotal,
      amountInclTax: invoice.rows[0].total_amount
    });

    // Sauvegarder l'ID Chorus Pro
    await db.query(
      'UPDATE invoices SET chorus_pro_id = $1, chorus_pro_submitted_at = NOW() WHERE id = $2',
      [chorusProId, id]
    );

    res.json({
      success: true,
      chorusProId,
      message: 'Invoice submitted to Chorus Pro successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Vérifier le statut Chorus Pro
router.get('/invoices/:id/chorus-pro-status', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const invoice = await db.query('SELECT chorus_pro_id FROM invoices WHERE id = $1', [id]);

    if (!invoice.rows[0].chorus_pro_id) {
      return res.status(404).json({ error: 'Not submitted to Chorus Pro' });
    }

    const chorusClient = new ChorusProClient(
      process.env.CHORUS_PRO_CLIENT_ID,
      process.env.CHORUS_PRO_CLIENT_SECRET
    );

    const status = await chorusClient.getInvoiceStatus(invoice.rows[0].chorus_pro_id);

    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

---

## 🗄️ Schéma de base de données

```sql
-- Ajouter colonnes aux invoices
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS facturx_file VARCHAR(255);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS facturx_generated_at TIMESTAMP;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS chorus_pro_id VARCHAR(100);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS chorus_pro_submitted_at TIMESTAMP;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS chorus_pro_status VARCHAR(50);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS buyer_siret VARCHAR(14);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS service_code VARCHAR(50);

-- Table de configuration e-facturation par organisation
CREATE TABLE IF NOT EXISTS efacture_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  facturx_enabled BOOLEAN DEFAULT false,
  chorus_pro_enabled BOOLEAN DEFAULT false,
  chorus_pro_client_id VARCHAR(255),
  chorus_pro_client_secret_encrypted TEXT,
  auto_generate_facturx BOOLEAN DEFAULT true,
  auto_submit_chorus_pro BOOLEAN DEFAULT false,
  signature_enabled BOOLEAN DEFAULT false,
  certificate_path VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(organization_id)
);

-- Table d'historique des soumissions Chorus Pro
CREATE TABLE IF NOT EXISTS chorus_pro_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  chorus_pro_id VARCHAR(100) UNIQUE,
  status VARCHAR(50), -- SUBMITTED, VALIDATED, REJECTED, PAID
  submitted_at TIMESTAMP,
  validated_at TIMESTAMP,
  rejected_at TIMESTAMP,
  rejection_reason TEXT,
  paid_at TIMESTAMP,
  response_data JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chorus_submissions_invoice ON chorus_pro_submissions(invoice_id);
CREATE INDEX idx_chorus_submissions_status ON chorus_pro_submissions(status);
```

---

## 🎨 Frontend (React Native)

### Écrans à créer/modifier

#### 1. **Settings: E-Facturation Config**
```typescript
// web-app/src/screens/EFactureSettingsScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, Switch, TextInput, Button } from 'react-native';
import api from '../services/api';

const EFactureSettingsScreen = () => {
  const [config, setConfig] = useState({
    facturx_enabled: false,
    chorus_pro_enabled: false,
    chorus_pro_client_id: '',
    chorus_pro_client_secret: '',
    auto_generate_facturx: true,
    auto_submit_chorus_pro: false
  });

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    const response = await api.get('/efacture/config');
    setConfig(response.data);
  };

  const saveConfig = async () => {
    await api.put('/efacture/config', config);
    alert('Configuration sauvegardée');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Configuration E-Facturation</Text>

      <View style={styles.section}>
        <Text style={styles.label}>Activer Factur-X</Text>
        <Switch
          value={config.facturx_enabled}
          onValueChange={(val) => setConfig({...config, facturx_enabled: val})}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Activer Chorus Pro</Text>
        <Switch
          value={config.chorus_pro_enabled}
          onValueChange={(val) => setConfig({...config, chorus_pro_enabled: val})}
        />
      </View>

      {config.chorus_pro_enabled && (
        <>
          <TextInput
            style={styles.input}
            placeholder="Chorus Pro Client ID"
            value={config.chorus_pro_client_id}
            onChangeText={(val) => setConfig({...config, chorus_pro_client_id: val})}
          />
          <TextInput
            style={styles.input}
            placeholder="Chorus Pro Client Secret"
            value={config.chorus_pro_client_secret}
            onChangeText={(val) => setConfig({...config, chorus_pro_client_secret: val})}
            secureTextEntry
          />
        </>
      )}

      <View style={styles.section}>
        <Text style={styles.label}>Auto-générer Factur-X</Text>
        <Switch
          value={config.auto_generate_facturx}
          onValueChange={(val) => setConfig({...config, auto_generate_facturx: val})}
        />
      </View>

      <Button title="Sauvegarder" onPress={saveConfig} />
    </View>
  );
};

export default EFactureSettingsScreen;
```

#### 2. **Invoice Details: Actions Factur-X**
```typescript
// Ajouter dans InvoiceDetailsScreen.tsx
const generateFacturX = async () => {
  try {
    setLoading(true);
    const response = await api.post(`/invoices/${invoiceId}/generate-facturx`);
    alert('Facture Factur-X générée avec succès');
    loadInvoice(); // Recharger les données
  } catch (error) {
    alert('Erreur: ' + error.message);
  } finally {
    setLoading(false);
  }
};

const submitToChorusPro = async () => {
  try {
    setLoading(true);
    const response = await api.post(`/invoices/${invoiceId}/submit-chorus-pro`, {
      buyer_siret: invoice.buyer_siret,
      service_code: invoice.service_code
    });
    alert('Facture soumise à Chorus Pro: ' + response.data.chorusProId);
    loadInvoice();
  } catch (error) {
    alert('Erreur: ' + error.message);
  } finally {
    setLoading(false);
  }
};

// Dans le render
<View style={styles.actions}>
  <Button
    title="Générer Factur-X"
    onPress={generateFacturX}
    disabled={!!invoice.facturx_file}
  />
  {invoice.facturx_file && (
    <Button
      title="Soumettre à Chorus Pro"
      onPress={submitToChorusPro}
      disabled={!!invoice.chorus_pro_id}
    />
  )}
  {invoice.chorus_pro_id && (
    <Text>Chorus Pro ID: {invoice.chorus_pro_id}</Text>
  )}
</View>
```

---

## 📦 Dépendances à ajouter

```json
// api/package.json
{
  "dependencies": {
    "pdf-lib": "^1.17.1",
    "fast-xml-parser": "^4.3.2",
    "node-signpdf": "^1.5.0",
    "@pdf-lib/fontkit": "^1.1.1",
    "form-data": "^4.0.0"
  }
}
```

---

## ✅ Checklist d'implémentation

### Phase 1: Factur-X (2-3 semaines)
- [ ] Créer le service FacturXGenerator
- [ ] Implémenter génération XML EN 16931
- [ ] Implémenter conversion PDF/A-3
- [ ] Implémenter embedding XML dans PDF
- [ ] Ajouter routes API
- [ ] Créer migrations BDD
- [ ] Créer écran de configuration
- [ ] Tester avec factures réelles
- [ ] Valider avec un validateur Factur-X officiel

### Phase 2: Chorus Pro (1-2 semaines)
- [ ] Créer client OAuth2 Chorus Pro
- [ ] Implémenter soumission de factures
- [ ] Implémenter suivi de statut
- [ ] Ajouter gestion des erreurs
- [ ] Créer interface configuration
- [ ] Tester en environnement de test Chorus Pro
- [ ] Documenter le processus d'inscription

### Phase 3: Automatisation (1 semaine)
- [ ] Auto-génération lors de validation facture
- [ ] Auto-soumission Chorus Pro (optionnel)
- [ ] Notifications par email
- [ ] Webhooks pour statuts Chorus Pro
- [ ] Logs et audit trail

---

## 🧪 Tests

```typescript
// api/src/tests/facturx.test.ts
describe('Factur-X Generator', () => {
  it('should generate valid Factur-X PDF', async () => {
    const generator = new FacturXGenerator();
    const buffer = await generator.generateFacturX(mockInvoiceData);

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);

    // Vérifier que c'est un PDF valide
    const pdfDoc = await PDFDocument.load(buffer);
    expect(pdfDoc.getPageCount()).toBeGreaterThan(0);

    // Vérifier que le XML est embarqué
    const attachments = pdfDoc.getAttachments();
    expect(attachments).toHaveLength(1);
    expect(attachments[0].name).toBe('factur-x.xml');
  });

  it('should generate valid EN 16931 XML', async () => {
    const generator = new FacturXGenerator();
    const xml = await generator.generateXML(mockInvoiceData);

    // Valider contre le schéma XSD
    const isValid = await validateXMLSchema(xml, 'EN16931-schema.xsd');
    expect(isValid).toBe(true);
  });
});
```

---

## 🚀 Déploiement

### Variables d'environnement
```bash
# .env.production
FACTURX_ENABLED=true
CHORUS_PRO_ENABLED=false
CHORUS_PRO_BASE_URL=https://chorus-pro.gouv.fr/api
CHORUS_PRO_CLIENT_ID=your_client_id
CHORUS_PRO_CLIENT_SECRET=your_client_secret
CHORUS_PRO_REDIRECT_URI=https://simplix.paraweb.fr/api/chorus-pro/callback
```

### Documentation utilisateur
- Guide d'inscription Chorus Pro
- Configuration des identifiants
- Processus de génération Factur-X
- Résolution des erreurs courantes

---

## 📊 KPIs de succès

- ✅ 100% des factures générées conformes EN 16931
- ✅ Taux de succès soumission Chorus Pro > 95%
- ✅ Temps de génération < 2 secondes par facture
- ✅ 0 rejet pour format invalide

---

## 🔗 Ressources

- [Norme EN 16931](https://ec.europa.eu/digital-building-blocks/wikis/display/DIGITAL/Semantic+Data+Model)
- [Factur-X.org](https://www.factur-x.org/)
- [Documentation Chorus Pro](https://chorus-pro.gouv.fr/documentation)
- [Validateur Factur-X](https://portal3.gefeg.com/invoice-validation)
