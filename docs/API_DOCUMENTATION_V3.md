# Simplix CRM - Documentation API v3.0

## 📚 Table des Matières

1. [Introduction](#introduction)
2. [Authentication](#authentication)
3. [Core Resources](#core-resources)
   - [Customers](#customers)
   - [Products](#products)
   - [Sales](#sales)
   - [Teams](#teams)
   - [Quotes](#quotes)
4. [Analytics & Dashboard](#analytics--dashboard)
5. [Search & Filtering](#search--filtering)
6. [Bulk Operations](#bulk-operations)
7. [Reports & Exports](#reports--exports)
8. [Codes d'erreur](#codes-derreur)

---

## Introduction

**Base URL**: `http://localhost:3000/api`

**Version**: 3.0.0

**Format**: JSON

**Authentication**: JWT Bearer Token (pour les endpoints protégés)

### Nouveautés v3.0

- 🎯 **Analytics Dashboard** - Statistiques et KPIs en temps réel
- 🔍 **Recherche Avancée** - Recherche globale et filtres sur toutes les entités
- ⚡ **Opérations en Masse** - Création, mise à jour et suppression en bulk
- 📊 **Rapports Détaillés** - 8 types de rapports différents
- 📈 **Métriques de Performance** - Analyse des ventes, clients et produits

---

## Authentication

Voir [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) pour les détails sur l'authentification.

---

## Core Resources

### Customers, Products, Sales, Teams, Quotes

Voir [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) pour les endpoints CRUD de base.

---

## Analytics & Dashboard

### GET /analytics/dashboard

Obtenir toutes les statistiques du tableau de bord.

**Response** (200):
```json
{
  "totalCustomers": 150,
  "totalProducts": 85,
  "totalSales": 420,
  "totalQuotes": 65,
  "totalTeams": 12,
  "totalUsers": 45,
  "totalRevenue": 125400.50,
  "pendingQuotesValue": 45000.00
}
```

### GET /analytics/sales-by-period

Obtenir les ventes par période.

**Query Parameters**:
- `period` (optional): `day`, `month` (default), `year`

**Response** (200):
```json
[
  {
    "period": "2025-10",
    "count": 45,
    "revenue": 15200.50
  },
  {
    "period": "2025-09",
    "count": 52,
    "revenue": 18400.75
  }
]
```

### GET /analytics/top-customers

Obtenir les meilleurs clients par chiffre d'affaires.

**Query Parameters**:
- `limit` (optional): nombre de résultats (default: 10)

**Response** (200):
```json
[
  {
    "id": 1,
    "name": "Alice Johnson",
    "email": "alice@example.com",
    "company": "Tech Solutions Inc",
    "total_sales": 15,
    "total_revenue": 25400.50
  }
]
```

### GET /analytics/top-products

Obtenir les meilleurs produits par ventes.

**Query Parameters**:
- `limit` (optional): nombre de résultats (default: 10)

**Response** (200):
```json
[
  {
    "id": 1,
    "name": "Widget Premium",
    "price": 149.99,
    "stock": 50,
    "total_sales": 120,
    "total_quantity": 350,
    "total_revenue": 52496.50
  }
]
```

### GET /analytics/quotes-conversion

Obtenir le taux de conversion des devis.

**Response** (200):
```json
[
  {
    "status": "draft",
    "count": 10,
    "total_value": 15000.00
  },
  {
    "status": "sent",
    "count": 15,
    "total_value": 22000.00
  },
  {
    "status": "accepted",
    "count": 30,
    "total_value": 85000.00
  },
  {
    "status": "rejected",
    "count": 5,
    "total_value": 8000.00
  }
]
```

### GET /analytics/recent-activity

Obtenir l'activité récente (ventes, devis, clients).

**Query Parameters**:
- `limit` (optional): nombre de résultats (default: 20)

**Response** (200):
```json
[
  {
    "type": "sale",
    "id": 45,
    "customer_id": 12,
    "created_at": "2025-10-03T14:30:00.000Z"
  },
  {
    "type": "quote",
    "id": 23,
    "customer_id": 8,
    "created_at": "2025-10-03T14:15:00.000Z"
  },
  {
    "type": "customer",
    "id": 150,
    "name": "New Customer",
    "created_at": "2025-10-03T14:00:00.000Z"
  }
]
```

### GET /analytics/low-stock

Obtenir les produits en stock faible.

**Query Parameters**:
- `threshold` (optional): seuil de stock (default: 10)

**Response** (200):
```json
[
  {
    "id": 5,
    "name": "Widget Basic",
    "stock": 3,
    "price": 49.99
  },
  {
    "id": 12,
    "name": "Gadget Pro",
    "stock": 7,
    "price": 199.99
  }
]
```

---

## Search & Filtering

### GET /search

Recherche globale sur toutes les entités.

**Query Parameters**:
- `q` (required): terme de recherche

**Response** (200):
```json
{
  "customers": [
    {
      "id": 1,
      "name": "Alice Johnson",
      "email": "alice@example.com"
    }
  ],
  "products": [
    {
      "id": 5,
      "name": "Widget Premium",
      "price": 149.99
    }
  ],
  "quotes": [
    {
      "id": 10,
      "title": "Website Development",
      "customer_name": "Alice Johnson"
    }
  ],
  "users": [
    {
      "id": 2,
      "name": "John Doe",
      "email": "john@simplix.com"
    }
  ]
}
```

### GET /search/customers

Recherche avancée de clients.

**Query Parameters**:
- `q` (optional): recherche générale
- `company` (optional): filtrer par entreprise
- `email` (optional): filtrer par email

**Response** (200):
```json
[
  {
    "id": 1,
    "name": "Alice Johnson",
    "email": "alice@example.com",
    "company": "Tech Solutions Inc"
  }
]
```

### GET /search/products

Recherche avancée de produits.

**Query Parameters**:
- `q` (optional): recherche générale
- `minPrice` (optional): prix minimum
- `maxPrice` (optional): prix maximum
- `inStock` (optional): `true` pour produits en stock uniquement

**Response** (200):
```json
[
  {
    "id": 1,
    "name": "Widget Premium",
    "price": 149.99,
    "stock": 50
  }
]
```

### GET /search/sales

Recherche avancée de ventes.

**Query Parameters**:
- `customerId` (optional): filtrer par client
- `productId` (optional): filtrer par produit
- `status` (optional): filtrer par statut
- `startDate` (optional): date de début (YYYY-MM-DD)
- `endDate` (optional): date de fin (YYYY-MM-DD)

**Response** (200):
```json
[
  {
    "id": 1,
    "customer_name": "Alice Johnson",
    "product_name": "Widget Premium",
    "quantity": 3,
    "total_amount": 449.97,
    "status": "completed",
    "sale_date": "2025-10-03T10:00:00.000Z"
  }
]
```

### GET /search/quotes

Recherche avancée de devis.

**Query Parameters**:
- `customerId` (optional): filtrer par client
- `userId` (optional): filtrer par utilisateur
- `status` (optional): filtrer par statut
- `startDate` (optional): date de début (YYYY-MM-DD)
- `endDate` (optional): date de fin (YYYY-MM-DD)

**Response** (200):
```json
[
  {
    "id": 1,
    "customer_name": "Alice Johnson",
    "user_name": "John Doe",
    "title": "Website Development",
    "total_amount": 12000.00,
    "status": "accepted"
  }
]
```

---

## Bulk Operations

### POST /bulk/customers

Créer plusieurs clients en une seule requête.

**Request Body**:
```json
{
  "customers": [
    {
      "name": "Customer 1",
      "email": "customer1@example.com",
      "phone": "0600000001",
      "company": "Company 1"
    },
    {
      "name": "Customer 2",
      "email": "customer2@example.com",
      "phone": "0600000002",
      "company": "Company 2"
    }
  ]
}
```

**Response** (201):
```json
{
  "message": "2 customers created successfully",
  "customers": [
    {
      "id": 101,
      "name": "Customer 1",
      "email": "customer1@example.com"
    },
    {
      "id": 102,
      "name": "Customer 2",
      "email": "customer2@example.com"
    }
  ]
}
```

### POST /bulk/products

Créer plusieurs produits en une seule requête.

**Request Body**:
```json
{
  "products": [
    {
      "name": "Product 1",
      "price": 99.99,
      "stock": 100
    },
    {
      "name": "Product 2",
      "price": 149.99,
      "stock": 50
    }
  ]
}
```

### DELETE /bulk/customers

Supprimer plusieurs clients en une seule requête.

**Request Body**:
```json
{
  "ids": [1, 2, 3, 4, 5]
}
```

**Response** (200):
```json
{
  "message": "5 customers deleted successfully",
  "deletedCount": 5
}
```

### DELETE /bulk/products

Supprimer plusieurs produits.

### DELETE /bulk/sales

Supprimer plusieurs ventes.

### PATCH /bulk/products/stock

Mettre à jour le stock de plusieurs produits.

**Request Body**:
```json
{
  "updates": [
    { "id": 1, "stock": 100 },
    { "id": 2, "stock": 50 },
    { "id": 3, "stock": 75 }
  ]
}
```

**Response** (200):
```json
{
  "message": "3 products updated successfully",
  "updates": [
    { "id": 1, "stock": 100, "changes": 1 },
    { "id": 2, "stock": 50, "changes": 1 },
    { "id": 3, "stock": 75, "changes": 1 }
  ]
}
```

### PATCH /bulk/sales/status

Mettre à jour le statut de plusieurs ventes.

**Request Body**:
```json
{
  "ids": [1, 2, 3],
  "status": "completed"
}
```

### PATCH /bulk/quotes/status

Mettre à jour le statut de plusieurs devis.

**Request Body**:
```json
{
  "ids": [10, 11, 12],
  "status": "accepted"
}
```

---

## Reports & Exports

### GET /reports/sales

Rapport de ventes par période.

**Query Parameters**:
- `startDate` (required): date de début (YYYY-MM-DD)
- `endDate` (required): date de fin (YYYY-MM-DD)
- `groupBy` (optional): `day`, `month` (default), `year`

**Response** (200):
```json
[
  {
    "date": "2025-10",
    "total_sales": 45,
    "total_quantity": 150,
    "total_revenue": 15200.50,
    "average_sale": 337.79,
    "status": "completed"
  }
]
```

### GET /reports/customers

Rapport détaillé des clients avec statistiques de ventes.

**Response** (200):
```json
[
  {
    "id": 1,
    "name": "Alice Johnson",
    "email": "alice@example.com",
    "total_sales": 15,
    "total_revenue": 25400.50,
    "last_sale_date": "2025-10-03T10:00:00.000Z",
    "total_quotes": 8,
    "accepted_quotes": 5
  }
]
```

### GET /reports/products

Rapport de performance des produits.

**Response** (200):
```json
[
  {
    "id": 1,
    "name": "Widget Premium",
    "price": 149.99,
    "stock": 50,
    "total_sales": 120,
    "total_quantity_sold": 350,
    "total_revenue": 52496.50,
    "average_sale_amount": 437.47,
    "stock_value": 7499.50
  }
]
```

### GET /reports/quotes

Rapport des devis avec métriques de conversion.

**Query Parameters**:
- `startDate` (optional): date de début (YYYY-MM-DD)
- `endDate` (optional): date de fin (YYYY-MM-DD)

**Response** (200):
```json
[
  {
    "id": 1,
    "customer_name": "Alice Johnson",
    "customer_company": "Tech Solutions Inc",
    "created_by": "John Doe",
    "title": "Website Development",
    "status": "accepted",
    "total_amount": 12000.00,
    "days_to_update": 5.5
  }
]
```

### GET /reports/teams

Rapport de performance des équipes.

**Response** (200):
```json
[
  {
    "id": 1,
    "name": "Sales Team",
    "member_count": 8,
    "total_quotes": 45,
    "accepted_quotes": 30,
    "total_quote_value": 125000.00
  }
]
```

### GET /reports/users

Rapport de performance des utilisateurs.

**Response** (200):
```json
[
  {
    "id": 1,
    "name": "John Doe",
    "email": "john@simplix.com",
    "role": "user",
    "total_quotes": 25,
    "accepted_quotes": 18,
    "rejected_quotes": 3,
    "total_quote_value": 85000.00,
    "avg_quote_value": 4722.22
  }
]
```

### GET /reports/revenue

Rapport de revenus par période.

**Query Parameters**:
- `startDate` (optional): date de début (YYYY-MM-DD)
- `endDate` (optional): date de fin (YYYY-MM-DD)
- `groupBy` (optional): `day`, `month` (default), `year`

**Response** (200):
```json
[
  {
    "period": "2025-10",
    "revenue": 45200.50,
    "sales_count": 120,
    "avg_sale": 376.67
  }
]
```

### GET /reports/inventory

Rapport détaillé de l'inventaire.

**Response** (200):
```json
[
  {
    "id": 1,
    "name": "Widget Premium",
    "price": 149.99,
    "stock": 50,
    "stock_value": 7499.50,
    "times_sold": 120,
    "total_quantity_sold": 350,
    "stock_status": "Medium Stock"
  }
]
```

**Stock Status**:
- `Out of Stock`: stock = 0
- `Low Stock`: stock ≤ 10
- `Medium Stock`: 10 < stock ≤ 50
- `High Stock`: stock > 50

---

## Codes d'Erreur

Voir [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) pour les codes d'erreur.

---

## Exemples avec cURL

### Analytics Dashboard
```bash
curl http://localhost:3000/api/analytics/dashboard
```

### Recherche Globale
```bash
curl "http://localhost:3000/api/search?q=Alice"
```

### Création en Masse de Clients
```bash
curl -X POST http://localhost:3000/api/bulk/customers \
  -H "Content-Type: application/json" \
  -d '{
    "customers": [
      {
        "name": "Customer 1",
        "email": "customer1@example.com",
        "phone": "0600000001"
      },
      {
        "name": "Customer 2",
        "email": "customer2@example.com",
        "phone": "0600000002"
      }
    ]
  }'
```

### Rapport de Ventes
```bash
curl "http://localhost:3000/api/reports/sales?startDate=2025-01-01&endDate=2025-12-31&groupBy=month"
```

### Mise à Jour en Masse du Stock
```bash
curl -X PATCH http://localhost:3000/api/bulk/products/stock \
  -H "Content-Type: application/json" \
  -d '{
    "updates": [
      { "id": 1, "stock": 100 },
      { "id": 2, "stock": 50 }
    ]
  }'
```

---

## Récapitulatif des Endpoints v3.0

**Total**: 50+ endpoints

### Core (voir API_DOCUMENTATION.md)
- 5 resources × 5 endpoints (GET all, GET one, POST, PUT, DELETE) = 25 endpoints
- 3 endpoints auth
- 3 endpoints teams members

### Analytics (7 endpoints)
- Dashboard stats
- Sales by period
- Top customers
- Top products
- Quotes conversion
- Recent activity
- Low stock

### Search (5 endpoints)
- Global search
- Customers search
- Products search
- Sales search
- Quotes search

### Bulk Operations (8 endpoints)
- Bulk create customers
- Bulk create products
- Bulk delete customers/products/sales
- Bulk update product stock
- Bulk update sales/quotes status

### Reports (8 endpoints)
- Sales report
- Customers report
- Products report
- Quotes report
- Teams report
- Users report
- Revenue report
- Inventory report

---

**Développé avec ❤️ par l'équipe Simplix**

**Version 3.0.0** - Octobre 2025
