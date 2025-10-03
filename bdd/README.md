# Base de Données Simplix CRM

## 📊 Informations sur la base de données

- **Type** : SQLite
- **Fichier** : `simplix-crm.db`
- **Taille** : 24 KB
- **Date d'export** : 3 octobre 2025

## 🗂️ Structure de la base de données

### Table `customers` (Clients)
- `id` : INTEGER PRIMARY KEY AUTOINCREMENT
- `name` : TEXT NOT NULL - Nom du client
- `email` : TEXT UNIQUE - Email du client
- `phone` : TEXT - Téléphone
- `company` : TEXT - Nom de l'entreprise
- `address` : TEXT - Adresse complète
- `created_at` : DATETIME - Date de création
- `updated_at` : DATETIME - Date de mise à jour

### Table `products` (Produits)
- `id` : INTEGER PRIMARY KEY AUTOINCREMENT
- `name` : TEXT NOT NULL - Nom du produit
- `description` : TEXT - Description détaillée
- `price` : REAL NOT NULL - Prix unitaire
- `stock` : INTEGER DEFAULT 0 - Quantité en stock
- `created_at` : DATETIME - Date de création
- `updated_at` : DATETIME - Date de mise à jour

### Table `sales` (Ventes)
- `id` : INTEGER PRIMARY KEY AUTOINCREMENT
- `customer_id` : INTEGER NOT NULL - ID du client (clé étrangère)
- `product_id` : INTEGER NOT NULL - ID du produit (clé étrangère)
- `quantity` : INTEGER NOT NULL - Quantité vendue
- `total_amount` : REAL NOT NULL - Montant total
- `status` : TEXT DEFAULT 'pending' - Statut (pending/completed/cancelled)
- `sale_date` : DATETIME - Date de la vente
- `notes` : TEXT - Notes additionnelles

## 📦 Données d'exemple incluses

### 3 Clients
1. **Alice Johnson** - Tech Solutions Inc
   - Email: alice@example.com
   - Téléphone: 0601020304
   - Adresse: 123 Rue de la Tech, Paris

2. **Marc Dubois** - StartupCo
   - Email: marc@startup.fr
   - Téléphone: 0612345678
   - Adresse: 45 Avenue Innovation, Lyon

3. **Sophie Martin** - Enterprise Corp
   - Email: sophie.martin@entreprise.com
   - Téléphone: 0623456789
   - Adresse: 78 Boulevard Commerce, Marseille

### 3 Produits
1. **Widget Premium** - 149.99€
   - Stock: 50 unités
   - Description: Widget de haute qualité pour professionnels

2. **Service Consulting** - 250.00€
   - Stock: 100 unités
   - Description: Consultation professionnelle 1 heure

3. **Licence Logiciel Annuelle** - 599.99€
   - Stock: 25 unités
   - Description: Licence pour 1 utilisateur

### 4 Ventes
1. Alice Johnson - 3x Widget Premium = 449.97€ (Complété)
2. Marc Dubois - 2x Service Consulting = 500.00€ (Complété)
3. Sophie Martin - 5x Licence Logiciel = 2999.95€ (En attente)
4. Alice Johnson - 1x Service Consulting = 250.00€ (Complété)

**Total des ventes** : 4 199.92€

## 🔧 Utilisation de la base de données

### Ouvrir avec SQLite CLI
```bash
sqlite3 simplix-crm.db
```

### Commandes SQLite utiles
```sql
-- Lister toutes les tables
.tables

-- Voir le schéma d'une table
.schema customers

-- Voir tous les clients
SELECT * FROM customers;

-- Voir toutes les ventes avec détails
SELECT
  s.*,
  c.name as customer_name,
  p.name as product_name
FROM sales s
LEFT JOIN customers c ON s.customer_id = c.id
LEFT JOIN products p ON s.product_id = p.id;

-- Voir le chiffre d'affaires total
SELECT SUM(total_amount) as total_revenue FROM sales WHERE status = 'completed';
```

### Restaurer la base de données dans l'API
```bash
# Copier la base de données dans le dossier api/data/
cp simplix-crm.db ../api/data/crm.db
```

## 📊 Outils de visualisation recommandés

1. **DB Browser for SQLite** (Gratuit)
   - https://sqlitebrowser.org/
   - Interface graphique complète

2. **SQLite Viewer (VS Code Extension)**
   - Visualiser directement dans VS Code

3. **DBeaver** (Gratuit)
   - https://dbeaver.io/
   - Client universel pour bases de données

## 🔒 Sécurité

- Cette base de données contient des données de démonstration uniquement
- En production, il est recommandé d'utiliser PostgreSQL ou MySQL
- Ne jamais commiter de bases de données contenant des données réelles sur GitHub
- Le fichier `.gitignore` exclut déjà `api/data/` pour éviter les commits accidentels

## 📝 Notes

- Les timestamps sont générés automatiquement
- Les IDs sont auto-incrémentés
- Les clés étrangères maintiennent l'intégrité référentielle
- La base est légère et portable (24 KB)
