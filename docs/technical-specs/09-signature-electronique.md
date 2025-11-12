# ✍️ SIGNATURE ÉLECTRONIQUE

## 🎯 Objectif
Intégrer la signature électronique pour devis, contrats, documents via DocuSign/HelloSign.

## 📋 Fonctionnalités

### 1. Signature de Documents
- Devis signables
- Contrats
- Documents personnalisés
- Multi-signataires
- Ordre de signature
- Rappels automatiques

### 2. Tracking
- Statut en temps réel
- Historique signatures
- Certificat d'authenticité
- Archivage légal

### 3. Templates
- Templates de documents
- Champs de signature
- Champs formulaire
- Conditions

## 🗄️ Schéma BDD

```sql
CREATE TABLE IF NOT EXISTS signature_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  document_type VARCHAR(50) NOT NULL,
  document_id UUID NOT NULL,
  
  title VARCHAR(500),
  message TEXT,
  
  status VARCHAR(20) DEFAULT 'PENDING',
  
  provider VARCHAR(50) DEFAULT 'DOCUSIGN',
  provider_envelope_id VARCHAR(255),
  
  expires_at TIMESTAMP,
  completed_at TIMESTAMP,
  
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS signature_signers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  signature_request_id UUID REFERENCES signature_requests(id) ON DELETE CASCADE,
  
  signer_email VARCHAR(255) NOT NULL,
  signer_name VARCHAR(255) NOT NULL,
  
  signing_order INTEGER DEFAULT 1,
  role VARCHAR(50) DEFAULT 'SIGNER',
  
  status VARCHAR(20) DEFAULT 'PENDING',
  signed_at TIMESTAMP,
  declined_at TIMESTAMP,
  decline_reason TEXT,
  
  ip_address INET,
  user_agent TEXT
);

CREATE TABLE IF NOT EXISTS signature_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  signature_request_id UUID REFERENCES signature_requests(id) ON DELETE CASCADE,
  
  file_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  signed_file_path TEXT,
  
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🔧 DocuSign Integration

```typescript
import docusign from 'docusign-esign';

class SignatureService {
  private apiClient: any;
  
  async createEnvelope(documentPath: string, signers: any[]): Promise<string> {
    const envelope = {
      emailSubject: 'Please sign this document',
      documents: [{
        documentBase64: Buffer.from(fs.readFileSync(documentPath)).toString('base64'),
        name: 'Document',
        fileExtension: 'pdf',
        documentId: '1'
      }],
      recipients: {
        signers: signers.map((s, i) => ({
          email: s.email,
          name: s.name,
          recipientId: (i + 1).toString(),
          routingOrder: s.order.toString()
        }))
      },
      status: 'sent'
    };
    
    const result = await this.apiClient.createEnvelope(envelope);
    return result.envelopeId;
  }
  
  async getStatus(envelopeId: string): Promise<string> {
    const envelope = await this.apiClient.getEnvelope(envelopeId);
    return envelope.status;
  }
  
  async downloadSignedDocument(envelopeId: string): Promise<Buffer> {
    const doc = await this.apiClient.getDocument(envelopeId, '1');
    return doc;
  }
}
```

## ✅ Checklist
- [ ] Intégration DocuSign
- [ ] Signature devis
- [ ] Signature contrats
- [ ] Webhooks statuts
- [ ] Archivage documents signés
