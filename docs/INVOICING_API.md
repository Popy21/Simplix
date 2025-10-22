# API Facturation - Documentation

## 📋 Vue d'ensemble

L'API de facturation Simplix permet de gérer un système complet de facturation avec TVA, paiements partiels, relances automatiques et suivi des paiements.

## 🔐 Authentification

Toutes les routes nécessitent un token JWT dans le header :
```
Authorization: Bearer <token>
```

## 📊 Routes Factures

### GET /api/invoices
Récupérer toutes les factures avec filtres optionnels.

**Query Parameters:**
- `status` (optional): draft | sent | paid | overdue | cancelled
- `customer_id` (optional): ID du client
- `from_date` (optional): Date de début (YYYY-MM-DD)
- `to_date` (optional): Date de fin (YYYY-MM-DD)
- `overdue` (optional): true pour uniquement les factures en retard

**Réponse:**
```json
[
  {
    "id": 1,
    "invoice_number": "INV-2024-0001",
    "customer_id": 5,
    "customer_name": "Acme Corp",
    "customer_email": "contact@acme.com",
    "customer_company": "Acme Corporation",
    "invoice_date": "2024-10-01",
    "due_date": "2024-10-31",
    "status": "sent",
    "subtotal_ht": 1000.00,
    "total_vat": 200.00,
    "total_ttc": 1200.00,
    "total_paid": 0.00,
    "balance_due": 1200.00,
    "items_count": 3,
    "notes": "Merci pour votre confiance"
  }
]
```

### GET /api/invoices/stats
Statistiques globales des factures.

**Réponse:**
```json
{
  "draft_count": 5,
  "sent_count": 12,
  "paid_count": 45,
  "overdue_count": 3,
  "cancelled_count": 2,
  "total_paid": 125000.00,
  "total_pending": 34500.00,
  "total_overdue": 8900.00
}
```

### GET /api/invoices/:id
Récupérer une facture complète avec lignes et paiements.

**Réponse:**
```json
{
  "id": 1,
  "invoice_number": "INV-2024-0001",
  "customer_name": "Acme Corp",
  "invoice_date": "2024-10-01",
  "due_date": "2024-10-31",
  "status": "sent",
  "subtotal_ht": 1000.00,
  "total_vat": 200.00,
  "total_ttc": 1200.00,
  "total_paid": 0.00,
  "balance_due": 1200.00,
  "items": [
    {
      "id": 1,
      "description": "Développement site web",
      "quantity": 10.00,
      "unit_price": 100.00,
      "vat_rate": 20.00,
      "vat_amount": 200.00,
      "subtotal": 1000.00,
      "total": 1200.00
    }
  ],
  "payments": []
}
```

### POST /api/invoices
Créer une nouvelle facture.

**Body:**
```json
{
  "invoice_number": "INV-2024-0001",
  "customer_id": 5,
  "invoice_date": "2024-10-01",
  "due_date": "2024-10-31",
  "status": "draft",
  "notes": "Merci pour votre confiance",
  "terms": "Paiement à 30 jours",
  "items": [
    {
      "description": "Développement site web",
      "quantity": 10,
      "unit_price": 100.00,
      "vat_rate": 20.00,
      "product_id": 12
    }
  ]
}
```

**Réponse:** Facture créée (201)

### PUT /api/invoices/:id
Mettre à jour une facture.

**Body:**
```json
{
  "invoice_date": "2024-10-01",
  "due_date": "2024-11-01",
  "status": "sent",
  "notes": "Notes mises à jour",
  "items": [
    {
      "description": "Service 1",
      "quantity": 5,
      "unit_price": 200.00,
      "vat_rate": 20.00
    }
  ]
}
```

### DELETE /api/invoices/:id
Supprimer une facture.

**Réponse:**
```json
{
  "message": "Facture supprimée avec succès"
}
```

### POST /api/invoices/:id/send
Envoyer une facture (passe de draft à sent).

**Réponse:** Facture mise à jour

### POST /api/invoices/:id/mark-paid
Marquer une facture comme payée.

**Body:**
```json
{
  "payment_method": "transfer",
  "payment_reference": "VIR-123456",
  "payment_date": "2024-10-15",
  "amount": 1200.00
}
```

**Réponse:** Facture marquée comme payée + paiement créé

### POST /api/invoices/:id/reminder
Envoyer une relance client.

**Body:**
```json
{
  "reminder_type": "email",
  "subject": "Rappel facture INV-2024-0001",
  "message": "Nous vous rappelons que la facture est en attente de paiement."
}
```

**Réponse:**
```json
{
  "message": "Relance enregistrée avec succès",
  "reminder": {
    "id": 1,
    "invoice_id": 1,
    "reminder_type": "email",
    "sent": true,
    "sent_at": "2024-10-22T10:30:00Z"
  }
}
```

## 💳 Routes Paiements

### GET /api/payments
Récupérer tous les paiements avec filtres.

**Query Parameters:**
- `invoice_id` (optional): ID de la facture
- `from_date` (optional): Date de début
- `to_date` (optional): Date de fin
- `payment_method` (optional): card | transfer | check | cash

**Réponse:**
```json
[
  {
    "id": 1,
    "invoice_id": 1,
    "invoice_number": "INV-2024-0001",
    "invoice_total": 1200.00,
    "customer_name": "Acme Corp",
    "payment_date": "2024-10-15",
    "amount": 1200.00,
    "payment_method": "transfer",
    "reference": "VIR-123456",
    "created_by_name": "John Doe"
  }
]
```

### GET /api/payments/stats
Statistiques des paiements par période.

**Query Parameters:**
- `period` (optional): day | week | month | year (défaut: month)

**Réponse:**
```json
{
  "by_period": [
    {
      "period": "2024-10-01T00:00:00Z",
      "payment_method": "transfer",
      "payment_count": 15,
      "total_amount": 45000.00
    }
  ],
  "total": {
    "total_payments": 150,
    "total_amount": 450000.00,
    "average_payment": 3000.00,
    "invoices_paid": 125
  }
}
```

### GET /api/payments/:id
Récupérer un paiement spécifique.

### POST /api/payments
Créer un nouveau paiement.

**Body:**
```json
{
  "invoice_id": 1,
  "payment_date": "2024-10-15",
  "amount": 600.00,
  "payment_method": "card",
  "reference": "CARD-789",
  "transaction_id": "TXN-456789",
  "notes": "Paiement partiel"
}
```

**Réponse:**
```json
{
  "payment": {
    "id": 1,
    "invoice_id": 1,
    "amount": 600.00,
    "payment_method": "card"
  },
  "invoice": {
    "id": 1,
    "invoice_number": "INV-2024-0001",
    "total_ttc": 1200.00,
    "total_paid": 600.00,
    "balance_due": 600.00,
    "status": "sent"
  }
}
```

### PUT /api/payments/:id
Mettre à jour un paiement.

### DELETE /api/payments/:id
Supprimer un paiement (recalcule automatiquement le statut de la facture).

## 🧮 Calculs TVA

Les calculs de TVA sont automatiques :

- **Sous-total HT** = Σ (quantité × prix unitaire)
- **TVA** = Σ (quantité × prix unitaire × taux TVA / 100)
- **Total TTC** = Sous-total HT + TVA

Les totaux sont recalculés automatiquement via des triggers PostgreSQL à chaque modification des lignes de facture.

## 📊 Statuts de Facture

- `draft` - Brouillon (en cours de création)
- `sent` - Envoyée au client
- `paid` - Payée intégralement
- `overdue` - En retard (date d'échéance dépassée)
- `cancelled` - Annulée

Les factures passent automatiquement à `overdue` si la date d'échéance est dépassée et qu'elles ne sont pas payées.

## 💰 Méthodes de Paiement

- `card` - Carte bancaire 💳
- `transfer` - Virement bancaire 🏦
- `check` - Chèque 📝
- `cash` - Espèces 💵

## ⚠️ Codes d'Erreur

- `400` - Données invalides
- `401` - Non authentifié
- `404` - Ressource non trouvée
- `500` - Erreur serveur

## 🔄 Paiements Partiels

L'API supporte les paiements partiels :
1. Un paiement partiel met à jour le `total_paid`
2. Le `balance_due` est recalculé automatiquement
3. La facture reste en statut `sent` ou `overdue` tant qu'elle n'est pas totalement payée
4. Quand `total_paid` >= `total_ttc`, la facture passe en statut `paid`

## 📝 Exemple de Workflow Complet

```bash
# 1. Créer une facture
POST /api/invoices
{
  "invoice_number": "INV-2024-0050",
  "customer_id": 10,
  "invoice_date": "2024-10-22",
  "due_date": "2024-11-22",
  "items": [
    { "description": "Consulting", "quantity": 5, "unit_price": 200, "vat_rate": 20 }
  ]
}

# 2. Envoyer la facture au client
POST /api/invoices/1/send

# 3. Enregistrer un paiement partiel
POST /api/payments
{
  "invoice_id": 1,
  "amount": 600.00,
  "payment_method": "transfer"
}

# 4. Envoyer une relance si nécessaire
POST /api/invoices/1/reminder
{
  "reminder_type": "email",
  "subject": "Rappel facture"
}

# 5. Enregistrer le paiement final
POST /api/payments
{
  "invoice_id": 1,
  "amount": 600.00,
  "payment_method": "card"
}
# La facture passe automatiquement en statut "paid"
```

## 🗄️ Base de Données

Pour créer les tables nécessaires, exécuter la migration :

```bash
cd database
psql -U postgres -d simplix_crm -f migrations/005_invoicing_schema.sql
```

## 🚀 Fonctionnalités Avancées

- ✅ Calcul automatique de la TVA
- ✅ Paiements partiels supportés
- ✅ Historique complet des paiements
- ✅ Relances automatiques
- ✅ Triggers PostgreSQL pour cohérence des données
- ✅ Vues SQL pour rapports
- ✅ Fonction `calculate_invoice_totals()` pour recalcul manuel
- ✅ Fonction `update_overdue_invoices()` pour batch de mise à jour
