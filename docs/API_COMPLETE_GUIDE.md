# Documentation Complète API CRM v4.0

## Table des matières
1. [Authentification](#authentification)
2. [Dealsampionships & Pipeline](#deals-opportunities)
3. [Lead Scoring](#lead-scoring)
4. [Activités](#activities)
5. [Documents](#documents)
6. [Permissions RBAC](#permissions-rbac)
7. [Déduplication Contacts](#deduplication)
8. [Automation Workflows](#workflows)
9. [Emails & Templates](#emails)
10. [Erreurs & Codes](#codes-erreur)

---

## Authentification

### POST /api/auth/login
Connexion utilisateur
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Réponse:** `{ accessToken, refreshToken, user }`

---

## Deals & Opportunities

### POST /api/deals
Créer un deal
```json
{
  "organization_id": "org_123",
  "contact_id": "contact_456",
  "pipeline_id": "pipeline_789",
  "stage_id": "stage_001",
  "name": "Vente Produit X",
  "value": 50000,
  "probability": 75,
  "expected_close_date": "2025-12-31",
  "owner_id": "user_123",
  "notes": "Client prioritaire",
  "metadata": { "industry": "Tech", "company_size": "Enterprise" }
}
```

### GET /api/deals
Lister les deals avec filtres
```
?pipeline_id=xxx&stage_id=yyy&owner_id=zzz&value_min=10000&value_max=100000
```

### POST /api/deals/:id/move
Déplacer un deal dans le pipeline
```json
{
  "stage_id": "stage_002",
  "probability": 90
}
```

### GET /api/deals/by-stage/:stageId
Agrégation Kanban par stage

---

## Lead Scoring

### POST /api/leads/score
Scorer un lead
```json
{
  "contact_id": "contact_456",
  "algorithm": "simplix"
}
```

**Scoring Formula:**
- Email valide: +10 points
- Téléphone: +10 points
- Entreprise: +15 points
- LinkedIn profile: +20 points
- Type de contact: +30 points
- Source: +25 points
- Activités: +25 points
- Deals: +20 points
- Engagement: +20 points

**Total: 0-100 points**

### GET /api/leads/hot
Lister les leads "chauds" (score > 70 ou activité récente)

### GET /api/leads/by-score
Filtrer par plage de score
```
?min_score=60&max_score=100&limit=50
```

---

## Activities

### POST /api/activities/call
Logger un appel
```json
{
  "contact_id": "contact_456",
  "duration_minutes": 30,
  "notes": "Discusión de budget",
  "outcome": "interested"
}
```

### POST /api/activities/email
Logger un email
```json
{
  "contact_id": "contact_456",
  "subject": "Suivi proposition",
  "body": "Avez-vous des questions?",
  "sent_by": "user_123",
  "tracking": true
}
```

### POST /api/activities/meeting
Logger une réunion
```json
{
  "contact_id": "contact_456",
  "title": "Réunion de vente",
  "start_time": "2025-12-15T14:00:00Z",
  "end_time": "2025-12-15T15:00:00Z",
  "attendees": ["user_123", "contact_456"],
  "location": "Zoom",
  "recording_url": "https://..."
}
```

### GET /api/activities/stats/timeline
Timeline agrégée sur 30 jours

---

## Documents

### POST /api/documents
Créer un document
```json
{
  "organization_id": "org_123",
  "contact_id": "contact_456",
  "deal_id": "deal_789",
  "title": "Proposition Commerciale",
  "description": "Proposition pour projet X",
  "document_type": "proposal",
  "file_url": "https://storage.example.com/doc_123.pdf",
  "file_size": 2048000,
  "tags": ["proposal", "2025", "active"]
}
```

### GET /api/documents/:id/versions
Historique des versions

### POST /api/documents/:id/new-version
Créer une nouvelle version
```json
{
  "file_url": "https://storage.example.com/doc_123_v2.pdf",
  "change_summary": "Mise à jour des tarifs"
}
```

### POST /api/documents/:id/share
Générer un lien de partage
```json
{
  "expires_in_days": 30,
  "permissions": ["view", "download"],
  "password": "optional_password"
}
```

---

## Permissions RBAC

### GET /api/permissions
Lister toutes les permissions

### POST /api/permissions
Créer une permission
```json
{
  "module": "deals",
  "action": "update",
  "description": "Pouvoir modifier les deals"
}
```

### POST /api/permissions/assign-role
Assigner permission à rôle
```json
{
  "roleId": "role_manager",
  "permissionId": "perm_123"
}
```

### POST /api/permissions/check
Vérifier permission utilisateur
```json
{
  "module": "deals",
  "action": "delete"
}
```

**Réponse:** `{ hasPermission: true|false }`

### POST /api/permissions/territory
Assigner un territoire à utilisateur
```json
{
  "userId": "user_123",
  "territory": "Île-de-France"
}
```

### POST /api/permissions/field-access
Contrôler l'accès aux champs par rôle
```json
{
  "roleId": "role_manager",
  "module": "contacts",
  "field": "email",
  "access": "read_write"
}
```

**Access levels:** `hidden`, `read_only`, `read_write`

---

## Déduplication Contacts

### POST /api/contacts/deduplicate/detect
Détecter les doublons
```json
{
  "organizationId": "org_123"
}
```

**Réponse:**
```json
{
  "duplicates": [
    {
      "contact1": {...},
      "contact2": {...},
      "similarity": 85,
      "reasons": ["Email identique", "Nom similaire"]
    }
  ]
}
```

### POST /api/contacts/deduplicate/merge
Fusionner deux contacts
```json
{
  "survivingContactId": "contact_123",
  "mergeContactId": "contact_456",
  "mergedFields": {
    "phone": "+33612345678"
  }
}
```

### GET /api/contacts/deduplicate/related/:contactId
Contacts apparentés (même entreprise, même domaine email)

### POST /api/contacts/deduplicate/batch-merge
Fusionner plusieurs paires
```json
{
  "merges": [
    { "survivingId": "contact_1", "mergeId": "contact_2" },
    { "survivingId": "contact_3", "mergeId": "contact_4" }
  ]
}
```

---

## Automation Workflows

### POST /api/workflows
Créer un workflow
```json
{
  "organizationId": "org_123",
  "name": "Accueil nouveau client",
  "description": "Envoyer email et créer tâche",
  "trigger": {
    "type": "contact_created",
    "conditions": {}
  },
  "actions": [
    {
      "type": "send_email",
      "config": {
        "subject": "Bienvenue!",
        "template": "welcome_email"
      }
    },
    {
      "type": "create_task",
      "config": {
        "title": "Suivi client",
        "dueDate": "+3days"
      }
    }
  ],
  "enabled": true
}
```

**Trigger types:**
- `contact_created`
- `contact_updated`
- `deal_created`
- `deal_moved`
- `activity_logged`
- `quote_accepted`

**Action types:**
- `send_email`
- `create_task`
- `add_activity`
- `move_deal`
- `assign_contact`
- `add_tag`
- `send_notification`

### GET /api/workflows
Lister les workflows

### POST /api/workflows/:workflowId/execute
Exécuter manuellement
```json
{
  "targetId": "contact_123",
  "targetType": "contact"
}
```

### GET /api/workflows/:workflowId/executions
Historique d'exécution

### GET /api/workflows/templates/list
Récupérer les modèles prédéfinis

---

## Emails & Templates

### POST /api/emails/send
Envoyer un email
```json
{
  "organizationId": "org_123",
  "to": "client@example.com",
  "subject": "Suivi de votre demande",
  "body": "Nous avons reçu votre demande...",
  "cc": "manager@example.com",
  "bcc": "archive@example.com",
  "attachments": [
    {
      "name": "document.pdf",
      "url": "https://storage.example.com/doc.pdf",
      "size": 1024000
    }
  ]
}
```

### POST /api/emails/templates
Créer un template
```json
{
  "organizationId": "org_123",
  "name": "Email de bienvenue",
  "subject": "Bienvenue {{firstName}}",
  "body": "Bonjour {{firstName}} {{lastName}},\n\n Bienvenue dans notre plateforme...",
  "category": "welcome"
}
```

**Variables extraites automatiquement du template**

### GET /api/emails/templates
Lister tous les templates
```
?organizationId=org_123
```

### POST /api/emails/schedule
Programmer un email
```json
{
  "organizationId": "org_123",
  "to": "client@example.com",
  "subject": "Rappel de votre demande",
  "body": "Vous aviez demandé...",
  "sendAt": "2025-12-25T09:00:00Z"
}
```

### POST /api/emails/bulk-send
Envoi en masse
```json
{
  "organizationId": "org_123",
  "recipients": ["user1@example.com", "user2@example.com"],
  "templateId": "template_123",
  "variables": {
    "firstName": "recipient.name.split(' ')[0]"
  }
}
```

### GET /api/emails/logs
Historique d'emails
```
?organizationId=org_123&status=sent&limit=50
```

### POST /api/emails/tracking/pixel/:emailId
Tracker l'ouverture d'email

---

## Codes d'Erreur

### 400 - Bad Request
Paramètre manquant ou invalide

### 401 - Unauthorized
Token non fourni ou expiré

### 403 - Forbidden
Permissions insuffisantes

### 404 - Not Found
Ressource non trouvée

### 409 - Conflict
Ressource en doublon (ex: email déjà existant)

### 429 - Too Many Requests
Rate limit atteint

### 500 - Internal Server Error
Erreur serveur

---

## Exemple d'utilisation complet

```typescript
// 1. Authentification
const auth = await api.post('/api/auth/login', {
  email: 'sales@company.com',
  password: 'password123'
});

const accessToken = auth.accessToken;

// 2. Créer un contact et scorer
const contact = await api.post('/api/customers', {
  name: 'Acme Corp',
  email: 'contact@acme.com',
  phone: '+33612345678'
}, { headers: { Authorization: `Bearer ${accessToken}` } });

const score = await api.post('/api/leads/score', {
  contact_id: contact.id
}, { headers: { Authorization: `Bearer ${accessToken}` } });

// 3. Créer un deal si lead est hot
if (score.score > 70) {
  const deal = await api.post('/api/deals', {
    organization_id: 'org_123',
    contact_id: contact.id,
    name: 'Vente Solution CRM',
    value: 75000,
    pipeline_id: 'pipeline_1',
    stage_id: 'stage_prospection'
  }, { headers: { Authorization: `Bearer ${accessToken}` } });

  // 4. Déclencher workflow
  await api.post(`/api/workflows/deal_created/execute`, {
    targetId: deal.id,
    targetType: 'deal'
  }, { headers: { Authorization: `Bearer ${accessToken}` } });
}

// 5. Envoyer email template
await api.post('/api/emails/send', {
  organizationId: 'org_123',
  to: contact.email,
  templateId: 'welcome_email',
  variables: { firstName: 'Acme' }
}, { headers: { Authorization: `Bearer ${accessToken}` } });
```

---

## Permissions Requises par Endpoint

| Endpoint | Permission Requise |
|----------|-------------------|
| POST /api/deals | deals.create |
| PUT /api/deals/:id | deals.update |
| DELETE /api/deals/:id | deals.delete |
| POST /api/leads/score | leads.score |
| GET /api/leads/hot | leads.view |
| POST /api/workflows | workflows.create |
| POST /api/emails/send | emails.send |
| POST /api/contacts/deduplicate/merge | contacts.merge |

---

## Rate Limiting

- **Free Plan:** 100 requêtes/minute
- **Pro Plan:** 1000 requêtes/minute
- **Enterprise:** Illimité

Headers de réponse:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1703088000
```

---

**Version:** 4.0.0
**Dernière mise à jour:** 22 Octobre 2025
