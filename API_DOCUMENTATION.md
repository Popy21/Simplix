# Simplix CRM - Documentation API Complète

## 📚 Table des Matières

1. [Introduction](#introduction)
2. [Authentication](#authentication)
3. [Customers](#customers)
4. [Products](#products)
5. [Sales](#sales)
6. [Teams](#teams)
7. [Quotes](#quotes)
8. [Codes d'erreur](#codes-derreur)

---

## Introduction

**Base URL**: `http://localhost:3000/api`

**Version**: 2.0.0

**Format**: JSON

**Authentication**: JWT Bearer Token (pour les endpoints protégés)

---

## Authentication

### POST /auth/register
Créer un nouveau compte utilisateur.

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe",
  "role": "user"  // optionnel: "user", "admin"
}
```

**Response** (201):
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### POST /auth/login
Se connecter avec email et mot de passe.

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response** (200):
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user",
    "team_id": null
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### GET /auth/me
Obtenir le profil de l'utilisateur connecté.

**Headers**:
```
Authorization: Bearer {token}
```

**Response** (200):
```json
{
  "id": 1,
  "email": "user@example.com",
  "name": "John Doe",
  "role": "user",
  "team_id": null
}
```

---

## Customers

### GET /customers
Récupérer tous les clients.

**Response** (200):
```json
[
  {
    "id": 1,
    "name": "Alice Johnson",
    "email": "alice@example.com",
    "phone": "0601020304",
    "company": "Tech Solutions Inc",
    "address": "123 Rue de la Tech, Paris",
    "created_at": "2025-10-03T10:00:00.000Z",
    "updated_at": "2025-10-03T10:00:00.000Z"
  }
]
```

### GET /customers/:id
Récupérer un client spécifique.

**Response** (200):
```json
{
  "id": 1,
  "name": "Alice Johnson",
  "email": "alice@example.com",
  "phone": "0601020304",
  "company": "Tech Solutions Inc",
  "address": "123 Rue de la Tech, Paris",
  "created_at": "2025-10-03T10:00:00.000Z",
  "updated_at": "2025-10-03T10:00:00.000Z"
}
```

### POST /customers
Créer un nouveau client.

**Request Body**:
```json
{
  "name": "Alice Johnson",
  "email": "alice@example.com",
  "phone": "0601020304",
  "company": "Tech Solutions Inc",
  "address": "123 Rue de la Tech, Paris"
}
```

**Response** (201):
```json
{
  "id": 1,
  "name": "Alice Johnson",
  "email": "alice@example.com",
  "phone": "0601020304",
  "company": "Tech Solutions Inc",
  "address": "123 Rue de la Tech, Paris"
}
```

### PUT /customers/:id
Mettre à jour un client.

**Request Body**:
```json
{
  "name": "Alice Johnson Updated",
  "email": "alice.new@example.com",
  "phone": "0611111111",
  "company": "New Company",
  "address": "456 New Street"
}
```

**Response** (200):
```json
{
  "id": 1,
  "name": "Alice Johnson Updated",
  "email": "alice.new@example.com",
  "phone": "0611111111",
  "company": "New Company",
  "address": "456 New Street"
}
```

### DELETE /customers/:id
Supprimer un client.

**Response** (200):
```json
{
  "message": "Customer deleted successfully"
}
```

---

## Products

### GET /products
Récupérer tous les produits.

**Response** (200):
```json
[
  {
    "id": 1,
    "name": "Widget Premium",
    "description": "High-quality widget",
    "price": 149.99,
    "stock": 50,
    "created_at": "2025-10-03T10:00:00.000Z",
    "updated_at": "2025-10-03T10:00:00.000Z"
  }
]
```

### GET /products/:id
Récupérer un produit spécifique.

### POST /products
Créer un nouveau produit.

**Request Body**:
```json
{
  "name": "Widget Premium",
  "description": "High-quality widget",
  "price": 149.99,
  "stock": 50
}
```

**Response** (201):
```json
{
  "id": 1,
  "name": "Widget Premium",
  "description": "High-quality widget",
  "price": 149.99,
  "stock": 50
}
```

### PUT /products/:id
Mettre à jour un produit.

### DELETE /products/:id
Supprimer un produit.

---

## Sales

### GET /sales
Récupérer toutes les ventes avec détails client/produit.

**Response** (200):
```json
[
  {
    "id": 1,
    "customer_id": 1,
    "product_id": 1,
    "quantity": 3,
    "total_amount": 449.97,
    "status": "completed",
    "sale_date": "2025-10-03T10:00:00.000Z",
    "notes": "Première commande",
    "customer_name": "Alice Johnson",
    "product_name": "Widget Premium",
    "product_price": 149.99
  }
]
```

### GET /sales/:id
Récupérer une vente spécifique.

### POST /sales
Créer une nouvelle vente.

**Request Body**:
```json
{
  "customer_id": 1,
  "product_id": 1,
  "quantity": 3,
  "total_amount": 449.97,
  "status": "completed",
  "notes": "Première commande"
}
```

**Response** (201):
```json
{
  "id": 1,
  "customer_id": 1,
  "product_id": 1,
  "quantity": 3,
  "total_amount": 449.97,
  "status": "completed",
  "notes": "Première commande"
}
```

### PUT /sales/:id
Mettre à jour une vente.

### DELETE /sales/:id
Supprimer une vente.

---

## Teams

### GET /teams
Récupérer toutes les équipes.

**Response** (200):
```json
[
  {
    "id": 1,
    "name": "Development Team",
    "description": "Core development team",
    "owner_id": 1,
    "created_at": "2025-10-03T10:00:00.000Z",
    "updated_at": "2025-10-03T10:00:00.000Z"
  }
]
```

### GET /teams/:id
Récupérer une équipe avec ses membres.

**Response** (200):
```json
{
  "id": 1,
  "name": "Development Team",
  "description": "Core development team",
  "owner_id": 1,
  "created_at": "2025-10-03T10:00:00.000Z",
  "updated_at": "2025-10-03T10:00:00.000Z",
  "members": [
    {
      "id": 1,
      "team_id": 1,
      "user_id": 1,
      "role": "admin",
      "joined_at": "2025-10-03T10:00:00.000Z",
      "name": "John Doe",
      "email": "john@example.com"
    }
  ]
}
```

### POST /teams
Créer une nouvelle équipe.

**Request Body**:
```json
{
  "name": "Development Team",
  "description": "Core development team",
  "owner_id": 1
}
```

**Response** (201):
```json
{
  "id": 1,
  "name": "Development Team",
  "description": "Core development team",
  "owner_id": 1
}
```

### PUT /teams/:id
Mettre à jour une équipe.

**Request Body**:
```json
{
  "name": "Updated Team Name",
  "description": "Updated description"
}
```

### DELETE /teams/:id
Supprimer une équipe.

### POST /teams/:id/members
Ajouter un membre à l'équipe.

**Request Body**:
```json
{
  "user_id": 2,
  "role": "developer"  // optionnel: "admin", "developer", "member"
}
```

**Response** (201):
```json
{
  "id": 1,
  "team_id": 1,
  "user_id": 2,
  "role": "developer"
}
```

### PUT /teams/:id/members/:memberId
Mettre à jour le rôle d'un membre.

**Request Body**:
```json
{
  "role": "admin"
}
```

### DELETE /teams/:id/members/:memberId
Retirer un membre de l'équipe.

**Response** (200):
```json
{
  "message": "Member removed successfully"
}
```

---

## Quotes

### GET /quotes
Récupérer tous les devis.

**Response** (200):
```json
[
  {
    "id": 1,
    "customer_id": 1,
    "user_id": 1,
    "title": "Devis Website",
    "description": "Développement site web",
    "subtotal": 1000.00,
    "tax_rate": 0.20,
    "tax_amount": 200.00,
    "total_amount": 1200.00,
    "status": "draft",
    "valid_until": "2025-11-03T10:00:00.000Z",
    "created_at": "2025-10-03T10:00:00.000Z",
    "updated_at": "2025-10-03T10:00:00.000Z",
    "customer_name": "Alice Johnson",
    "user_name": "John Doe"
  }
]
```

### GET /quotes/:id
Récupérer un devis avec ses lignes.

**Response** (200):
```json
{
  "id": 1,
  "customer_id": 1,
  "user_id": 1,
  "title": "Devis Website",
  "description": "Développement site web",
  "subtotal": 1000.00,
  "tax_rate": 0.20,
  "tax_amount": 200.00,
  "total_amount": 1200.00,
  "status": "draft",
  "valid_until": "2025-11-03T10:00:00.000Z",
  "customer_name": "Alice Johnson",
  "customer_email": "alice@example.com",
  "customer_company": "Tech Solutions Inc",
  "user_name": "John Doe",
  "items": [
    {
      "id": 1,
      "quote_id": 1,
      "product_id": 1,
      "description": "Widget Premium",
      "quantity": 2,
      "unit_price": 500.00,
      "total_price": 1000.00,
      "product_name": "Widget Premium"
    }
  ]
}
```

### POST /quotes
Créer un nouveau devis.

**Request Body**:
```json
{
  "customer_id": 1,
  "user_id": 1,
  "title": "Devis Website",
  "description": "Développement site web",
  "items": [
    {
      "product_id": 1,
      "description": "Widget Premium",
      "quantity": 2,
      "unit_price": 500.00,
      "total_price": 1000.00
    }
  ],
  "tax_rate": 0.20,
  "status": "draft",
  "valid_until": "2025-11-03T10:00:00.000Z"
}
```

**Response** (201):
```json
{
  "id": 1,
  "customer_id": 1,
  "user_id": 1,
  "title": "Devis Website",
  "description": "Développement site web",
  "subtotal": 1000.00,
  "tax_rate": 0.20,
  "tax_amount": 200.00,
  "total_amount": 1200.00,
  "status": "draft",
  "items": [...]
}
```

### PUT /quotes/:id
Mettre à jour un devis.

**Request Body**:
```json
{
  "title": "Devis Updated",
  "description": "Updated description",
  "status": "sent",
  "items": [
    {
      "product_id": 1,
      "description": "Widget Premium",
      "quantity": 3,
      "unit_price": 500.00,
      "total_price": 1500.00
    }
  ],
  "tax_rate": 0.20
}
```

### PATCH /quotes/:id/status
Mettre à jour uniquement le statut.

**Request Body**:
```json
{
  "status": "accepted"  // draft, sent, accepted, rejected
}
```

**Response** (200):
```json
{
  "id": 1,
  "status": "accepted"
}
```

### DELETE /quotes/:id
Supprimer un devis.

**Response** (200):
```json
{
  "message": "Quote deleted successfully"
}
```

---

## Codes d'Erreur

### 400 Bad Request
Paramètres manquants ou invalides.

```json
{
  "error": "Email and password are required"
}
```

### 401 Unauthorized
Token invalide ou manquant.

```json
{
  "error": "Invalid token"
}
```

### 404 Not Found
Ressource non trouvée.

```json
{
  "error": "Customer not found"
}
```

### 500 Internal Server Error
Erreur serveur.

```json
{
  "error": "Something went wrong!"
}
```

---

## Exemples avec cURL

### Créer un compte et se connecter
```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "name": "John Doe"
  }'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

### Créer un devis complet
```bash
curl -X POST http://localhost:3000/api/quotes \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": 1,
    "user_id": 1,
    "title": "Devis Development",
    "description": "Développement application web",
    "items": [
      {
        "description": "Frontend React",
        "quantity": 1,
        "unit_price": 5000,
        "total_price": 5000
      },
      {
        "description": "Backend API",
        "quantity": 1,
        "unit_price": 3000,
        "total_price": 3000
      }
    ],
    "tax_rate": 0.20,
    "status": "draft"
  }'
```

### Gérer une équipe
```bash
# Créer équipe
curl -X POST http://localhost:3000/api/teams \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Dev Team",
    "description": "Development team",
    "owner_id": 1
  }'

# Ajouter membre
curl -X POST http://localhost:3000/api/teams/1/members \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 2,
    "role": "developer"
  }'
```

---

## Notes de Sécurité

- **Mots de passe** : Hashés avec bcrypt (salt rounds: 10)
- **JWT Secret** : Configurer `JWT_SECRET` dans `.env` en production
- **Expiration JWT** : 7 jours par défaut
- **CORS** : Activé pour tous les domaines (restreindre en production)

---

**Développé avec ❤️ par l'équipe Simplix**
