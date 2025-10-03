# Simplix CRM - Documentation API v4.0

## 📚 Table des Matières

1. [Introduction](#introduction)
2. [Authentication](#authentication)
3. [Core Resources](#core-resources)
4. [Analytics & Dashboard](#analytics--dashboard)
5. [Search & Filtering](#search--filtering)
6. [Bulk Operations](#bulk-operations)
7. [Reports & Exports](#reports--exports)
8. [Notifications](#notifications)
9. [Tasks & Activities](#tasks--activities)
10. [Sales Pipeline](#sales-pipeline)
11. [Email Campaigns](#email-campaigns)

---

## Introduction

**Base URL**: `http://localhost:3000/api`

**Version**: 4.0.0

**Format**: JSON

**Authentication**: JWT Bearer Token (pour les endpoints protégés)

### Nouveautés v4.0 🆕

- 🔔 **Notifications** - Système de notifications en temps réel pour les utilisateurs
- ✅ **Tasks & Activities** - Gestion complète des tâches et activités
- 📊 **Sales Pipeline** - Pipeline de vente avec stages personnalisables et opportunités
- 📧 **Email Campaigns** - Gestion de campagnes email avec tracking

### Features v3.0

- 🎯 **Analytics Dashboard** - Statistiques et KPIs en temps réel
- 🔍 **Recherche Avancée** - Recherche globale et filtres sur toutes les entités
- ⚡ **Opérations en Masse** - Création, mise à jour et suppression en bulk
- 📈 **Rapports Détaillés** - 8 types de rapports différents

**Total Endpoints**: 80+

---

## Notifications

### 🔔 GET /api/notifications/user/:userId

Récupère toutes les notifications d'un utilisateur.

**Query Parameters:**
- `unreadOnly` (boolean, optional) - Récupérer uniquement les non lues

**Response:**
```json
[
  {
    "id": 1,
    "user_id": 5,
    "title": "New Sale",
    "message": "Customer John Doe made a purchase",
    "type": "info",
    "link": "/sales/42",
    "is_read": 0,
    "created_at": "2025-10-03T10:30:00"
  }
]
```

### 🔔 POST /api/notifications

Créer une nouvelle notification.

**Request Body:**
```json
{
  "user_id": 5,
  "title": "Task Reminder",
  "message": "Don't forget to follow up with customer",
  "type": "reminder",
  "link": "/tasks/10"
}
```

**Types disponibles:** `info`, `success`, `warning`, `error`, `reminder`

### 🔔 PATCH /api/notifications/:id/read

Marquer une notification comme lue.

### 🔔 PATCH /api/notifications/user/:userId/read-all

Marquer toutes les notifications d'un utilisateur comme lues.

### 🔔 GET /api/notifications/user/:userId/unread-count

Obtenir le nombre de notifications non lues.

**Response:**
```json
{
  "count": 5
}
```

### 🔔 DELETE /api/notifications/:id

Supprimer une notification.

---

## Tasks & Activities

### ✅ GET /api/tasks

Récupère toutes les tâches avec filtres optionnels.

**Query Parameters:**
- `userId` (number, optional) - Filtrer par utilisateur assigné
- `status` (string, optional) - Filtrer par statut
- `priority` (string, optional) - Filtrer par priorité

**Response:**
```json
[
  {
    "id": 1,
    "title": "Follow up with customer",
    "description": "Call customer about quote",
    "assigned_to": 5,
    "customer_id": 10,
    "due_date": "2025-10-05",
    "priority": "high",
    "status": "pending",
    "created_at": "2025-10-03T09:00:00"
  }
]
```

**Statuts:** `pending`, `in-progress`, `completed`, `cancelled`

**Priorités:** `low`, `medium`, `high`, `urgent`

### ✅ POST /api/tasks

Créer une nouvelle tâche.

**Request Body:**
```json
{
  "title": "Send proposal",
  "description": "Prepare and send proposal to client",
  "assigned_to": 5,
  "customer_id": 10,
  "due_date": "2025-10-10",
  "priority": "high",
  "status": "pending"
}
```

### ✅ PUT /api/tasks/:id

Mettre à jour une tâche complète.

### ✅ PATCH /api/tasks/:id/status

Mettre à jour uniquement le statut d'une tâche.

**Request Body:**
```json
{
  "status": "completed"
}
```

### ✅ GET /api/tasks/user/:userId

Récupère les tâches d'un utilisateur spécifique.

### ✅ GET /api/tasks/overdue/all

Récupère toutes les tâches en retard (date dépassée et non complétées).

### ✅ DELETE /api/tasks/:id

Supprimer une tâche.

---

## Sales Pipeline

### 📊 Pipeline Stages

#### GET /api/pipeline/stages

Récupère tous les stages du pipeline.

**Response:**
```json
[
  {
    "id": 1,
    "name": "Qualification",
    "color": "#4CAF50",
    "position": 1,
    "created_at": "2025-10-03T08:00:00"
  },
  {
    "id": 2,
    "name": "Proposal",
    "color": "#2196F3",
    "position": 2,
    "created_at": "2025-10-03T08:00:00"
  }
]
```

#### POST /api/pipeline/stages

Créer un nouveau stage.

**Request Body:**
```json
{
  "name": "Negotiation",
  "color": "#FF9800",
  "position": 3
}
```

#### PUT /api/pipeline/stages/:id

Mettre à jour un stage.

#### DELETE /api/pipeline/stages/:id

Supprimer un stage.

---

### 📊 Opportunities

#### GET /api/pipeline/opportunities

Récupère toutes les opportunités avec détails enrichis.

**Query Parameters:**
- `stageId` (number, optional) - Filtrer par stage
- `userId` (number, optional) - Filtrer par propriétaire
- `customerId` (number, optional) - Filtrer par client

**Response:**
```json
[
  {
    "id": 1,
    "name": "Enterprise Deal - Acme Corp",
    "customer_id": 15,
    "customer_name": "Acme Corporation",
    "customer_email": "contact@acme.com",
    "user_id": 5,
    "owner_name": "John Sales",
    "stage_id": 2,
    "stage_name": "Proposal",
    "stage_color": "#2196F3",
    "value": 150000,
    "probability": 75,
    "expected_close_date": "2025-11-15",
    "description": "Major software licensing deal",
    "created_at": "2025-10-01T10:00:00"
  }
]
```

#### POST /api/pipeline/opportunities

Créer une nouvelle opportunité.

**Request Body:**
```json
{
  "name": "New Enterprise Deal",
  "customer_id": 15,
  "user_id": 5,
  "stage_id": 1,
  "value": 150000,
  "probability": 50,
  "expected_close_date": "2025-12-31",
  "description": "Potential major deal with enterprise client"
}
```

#### PUT /api/pipeline/opportunities/:id

Mettre à jour une opportunité complète.

#### PATCH /api/pipeline/opportunities/:id/stage

Déplacer une opportunité vers un autre stage.

**Request Body:**
```json
{
  "stage_id": 3
}
```

#### DELETE /api/pipeline/opportunities/:id

Supprimer une opportunité.

---

### 📊 GET /api/pipeline/summary

Récupère un résumé du pipeline avec statistiques par stage.

**Response:**
```json
[
  {
    "stage_id": 1,
    "stage_name": "Qualification",
    "stage_color": "#4CAF50",
    "opportunity_count": 5,
    "total_value": 250000,
    "avg_probability": 45.5
  },
  {
    "stage_id": 2,
    "stage_name": "Proposal",
    "stage_color": "#2196F3",
    "opportunity_count": 3,
    "total_value": 450000,
    "avg_probability": 70.2
  }
]
```

---

## Email Campaigns

### 📧 GET /api/campaigns

Récupère toutes les campagnes.

**Query Parameters:**
- `status` (string, optional) - Filtrer par statut

**Statuts:** `draft`, `scheduled`, `sent`, `archived`

**Response:**
```json
[
  {
    "id": 1,
    "name": "Summer Promotion 2025",
    "subject": "Save 20% on all products!",
    "content": "Dear customer, check out our amazing summer offers...",
    "status": "sent",
    "scheduled_date": "2025-07-01T09:00:00",
    "sent_count": 1250,
    "opened_count": 850,
    "clicked_count": 320,
    "created_at": "2025-06-25T10:00:00"
  }
]
```

### 📧 POST /api/campaigns

Créer une nouvelle campagne.

**Request Body:**
```json
{
  "name": "Fall Sale 2025",
  "subject": "Exclusive Fall Offers Inside",
  "content": "<html>Your email content here...</html>",
  "status": "draft",
  "scheduled_date": "2025-09-15T10:00:00"
}
```

### 📧 PUT /api/campaigns/:id

Mettre à jour une campagne.

### 📧 PATCH /api/campaigns/:id/status

Mettre à jour le statut d'une campagne.

**Request Body:**
```json
{
  "status": "scheduled"
}
```

---

### 📧 Campaign Recipients

#### GET /api/campaigns/:id/recipients

Récupère tous les destinataires d'une campagne.

**Response:**
```json
[
  {
    "id": 1,
    "campaign_id": 5,
    "customer_id": 10,
    "name": "John Doe",
    "email": "john@example.com",
    "status": "sent",
    "opened": 1,
    "clicked": 0,
    "sent_at": "2025-09-15T10:05:00"
  }
]
```

#### POST /api/campaigns/:id/recipients

Ajouter des destinataires à une campagne.

**Request Body:**
```json
{
  "customer_ids": [10, 15, 20, 25]
}
```

---

### 📧 Campaign Actions

#### POST /api/campaigns/:id/send

Envoyer une campagne (marque tous les destinataires comme "sent").

**Response:**
```json
{
  "message": "Campaign sent to 1250 recipients"
}
```

#### POST /api/campaigns/:id/track/:action

Tracker une action (open ou click) pour un destinataire.

**Actions:** `open`, `click`

**Request Body:**
```json
{
  "customer_id": 10
}
```

#### GET /api/campaigns/:id/stats

Récupère les statistiques détaillées d'une campagne.

**Response:**
```json
{
  "id": 5,
  "name": "Summer Promotion 2025",
  "status": "sent",
  "sent_count": 1250,
  "opened_count": 850,
  "clicked_count": 320,
  "open_rate": 68.0,
  "click_rate": 25.6
}
```

---

### 📧 DELETE /api/campaigns/:id

Supprimer une campagne et tous ses destinataires.

---

## Analytics & Dashboard

Voir [API_DOCUMENTATION_V3.md](./API_DOCUMENTATION_V3.md) pour les détails sur Analytics, Search, Bulk Operations et Reports.

---

## Codes d'erreur

| Code | Description |
|------|-------------|
| 200 | Succès |
| 201 | Créé avec succès |
| 400 | Requête invalide |
| 401 | Non authentifié |
| 403 | Non autorisé |
| 404 | Ressource non trouvée |
| 500 | Erreur serveur |

---

## Exemples d'utilisation

### Workflow complet - De la tâche à la vente

#### 1. Créer une tâche de suivi

```javascript
POST /api/tasks
{
  "title": "Follow up on enterprise opportunity",
  "assigned_to": 5,
  "customer_id": 15,
  "due_date": "2025-10-10",
  "priority": "high"
}
```

#### 2. Créer une opportunité dans le pipeline

```javascript
POST /api/pipeline/opportunities
{
  "name": "Enterprise Software License",
  "customer_id": 15,
  "user_id": 5,
  "stage_id": 1,
  "value": 150000,
  "probability": 50
}
```

#### 3. Déplacer l'opportunité vers "Proposal"

```javascript
PATCH /api/pipeline/opportunities/1/stage
{
  "stage_id": 2
}
```

#### 4. Créer un devis

```javascript
POST /api/quotes
{
  "customer_id": 15,
  "user_id": 5,
  "title": "Enterprise License Quote",
  "items": [...]
}
```

#### 5. Envoyer une notification

```javascript
POST /api/notifications
{
  "user_id": 5,
  "title": "Quote Accepted!",
  "message": "Customer accepted the enterprise quote",
  "type": "success",
  "link": "/quotes/42"
}
```

#### 6. Marquer la tâche comme complétée

```javascript
PATCH /api/tasks/1/status
{
  "status": "completed"
}
```

---

## Support

Pour toute question ou problème, contactez l'équipe de développement.

**Version**: 4.0.0  
**Date**: Octobre 2025
