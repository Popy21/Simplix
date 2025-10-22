# 🔄 Guide de Migration - SQLite vers PostgreSQL

Ce guide détaille la migration complète de l'ancienne API utilisant SQLite vers la nouvelle architecture PostgreSQL avec le schéma complet du CRM SaaS.

## 📋 Table des matières

- [Vue d'ensemble](#vue-densemble)
- [Différences principales](#différences-principales)
- [Mapping des tables](#mapping-des-tables)
- [Migration des données](#migration-des-données)
- [Adaptation de l'API](#adaptation-de-lapi)
- [Tests](#tests)

---

## 🎯 Vue d'ensemble

### Ancien système (SQLite)
- Base de données: SQLite3
- ID: `INTEGER PRIMARY KEY AUTOINCREMENT`
- Timestamps: `DATETIME DEFAULT CURRENT_TIMESTAMP`
- Simple structure mono-tenant
- ~15 tables

### Nouveau système (PostgreSQL)
- Base de données: PostgreSQL 15+
- ID: `UUID DEFAULT uuid_generate_v4()`
- Timestamps: `TIMESTAMP WITH TIME ZONE`
- Architecture multi-tenant
- ~40 tables avec schéma complet

---

## 🔀 Différences principales

### 1. Types de données

| SQLite | PostgreSQL | Notes |
|--------|------------|-------|
| `INTEGER` | `INTEGER` / `BIGINT` | Pas de changement majeur |
| `TEXT` | `VARCHAR(n)` / `TEXT` | Limites de taille définies |
| `REAL` | `DECIMAL(15,2)` | Précision fixe pour les montants |
| `DATETIME` | `TIMESTAMP WITH TIME ZONE` | Gestion des fuseaux horaires |
| `INTEGER` (boolean) | `BOOLEAN` | Type natif |
| N/A | `UUID` | Nouveaux identifiants |
| N/A | `JSONB` | Champs flexibles |
| N/A | `ENUM` | Types énumérés |

### 2. Clés primaires

```sql
-- Ancien (SQLite)
id INTEGER PRIMARY KEY AUTOINCREMENT

-- Nouveau (PostgreSQL)
id UUID PRIMARY KEY DEFAULT uuid_generate_v4()
```

### 3. Timestamps

```sql
-- Ancien (SQLite)
created_at DATETIME DEFAULT CURRENT_TIMESTAMP

-- Nouveau (PostgreSQL)
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

### 4. Multi-tenancy

**Changement majeur**: Toutes les tables principales ont maintenant un `organization_id`

```sql
-- Nouveau champ obligatoire
organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE
```

---

## 📊 Mapping des tables

### Customers → Contacts + Companies

L'ancienne table `customers` est maintenant divisée en deux:

#### Ancienne structure
```sql
CREATE TABLE customers (
  id INTEGER PRIMARY KEY,
  name TEXT,
  email TEXT,
  phone TEXT,
  company TEXT,
  address TEXT
)
```

#### Nouvelle structure

**Companies:**
```sql
CREATE TABLE companies (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  website VARCHAR(255),
  industry VARCHAR(100),
  ...
)
```

**Contacts:**
```sql
CREATE TABLE contacts (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  company_id UUID REFERENCES companies(id),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  email VARCHAR(255),
  phone VARCHAR(50),
  type contact_type DEFAULT 'customer',
  ...
)
```

### Products → Products (avec modifications)

```sql
-- Ancien
CREATE TABLE products (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price REAL NOT NULL,
  stock INTEGER DEFAULT 0
)

-- Nouveau: Doit être adapté ou mappé vers la nouvelle structure
-- Pour l'instant, vous pouvez créer une table products similaire
-- ou utiliser un système de catalogue dans la nouvelle BDD
```

### Sales → Deals

Les ventes deviennent des "deals" dans le pipeline:

```sql
-- Ancien
CREATE TABLE sales (
  id INTEGER PRIMARY KEY,
  customer_id INTEGER,
  product_id INTEGER,
  quantity INTEGER,
  total_amount REAL,
  status TEXT
)

-- Nouveau
CREATE TABLE deals (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  pipeline_id UUID NOT NULL,
  stage_id UUID NOT NULL,
  title VARCHAR(255) NOT NULL,
  value DECIMAL(15,2),
  contact_id UUID REFERENCES contacts(id),
  company_id UUID REFERENCES companies(id),
  status deal_status DEFAULT 'open'
)
```

### Users → Users (avec organisations)

```sql
-- Ancien
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  team_id INTEGER
)

-- Nouveau
CREATE TABLE users (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash TEXT,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  status user_status DEFAULT 'active',
  ...
  UNIQUE(email, organization_id)
)
```

### Teams → Teams (inchangé mais avec UUID)

Structure similaire mais avec UUID et organization_id.

### Quotes → Quotes (adaptation mineure)

Structure similaire avec UUID et liaison à l'organisation.

### Notifications → Notifications

Structure similaire avec amélioration des types.

### Tasks → Tasks

Structure similaire avec plus de champs et relations.

### Pipeline Stages → Pipeline Stages + Pipelines

Ajout d'une table `pipelines` pour gérer plusieurs pipelines:

```sql
CREATE TABLE pipelines (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  name VARCHAR(100) NOT NULL,
  is_default BOOLEAN DEFAULT FALSE
)

CREATE TABLE pipeline_stages (
  id UUID PRIMARY KEY,
  pipeline_id UUID NOT NULL,
  name VARCHAR(100) NOT NULL,
  win_probability INTEGER,
  display_order INTEGER
)
```

### Opportunities → Deals

Fusionné avec la logique des deals.

### Campaigns → Email Campaigns

```sql
-- Structure étendue avec tracking complet
CREATE TABLE email_campaigns (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  html_content TEXT NOT NULL,
  status email_campaign_status DEFAULT 'draft',
  sent_count INTEGER DEFAULT 0,
  opened_count INTEGER DEFAULT 0,
  clicked_count INTEGER DEFAULT 0,
  ...
)

CREATE TABLE email_logs (
  id UUID PRIMARY KEY,
  campaign_id UUID,
  contact_id UUID,
  status email_status,
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  ...
)
```

---

## 📦 Migration des données

### Étape 1: Exporter les données de SQLite

```bash
# Script d'export des données SQLite vers JSON
```

```javascript
// export-sqlite-data.js
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

const db = new sqlite3.Database('./data/crm.db');

const tables = ['customers', 'products', 'sales', 'users', 'teams', 'quotes', 'notifications', 'tasks', 'campaigns'];

const exportData = {};

const exportTable = (tableName) => {
  return new Promise((resolve, reject) => {
    db.all(`SELECT * FROM ${tableName}`, (err, rows) => {
      if (err) {
        console.error(`Error exporting ${tableName}:`, err);
        reject(err);
      } else {
        exportData[tableName] = rows;
        console.log(`✓ Exported ${rows.length} rows from ${tableName}`);
        resolve();
      }
    });
  });
};

(async () => {
  for (const table of tables) {
    await exportTable(table);
  }

  fs.writeFileSync('./migration-data.json', JSON.stringify(exportData, null, 2));
  console.log('✓ Data exported to migration-data.json');
  db.close();
})();
```

```bash
node export-sqlite-data.js
```

### Étape 2: Préparer la base PostgreSQL

```bash
cd database
./migrate.sh up
```

### Étape 3: Créer un script de transformation

```javascript
// transform-data.js
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const oldData = JSON.parse(fs.readFileSync('./migration-data.json', 'utf8'));

const DEMO_ORG_ID = '00000000-0000-0000-0000-000000000001';

// Map old IDs to new UUIDs
const idMaps = {
  customers: {},
  products: {},
  users: {},
  teams: {},
};

// Transform customers → companies + contacts
const transformCustomers = () => {
  const companies = [];
  const contacts = [];

  oldData.customers.forEach(customer => {
    const companyId = uuidv4();
    const contactId = uuidv4();

    idMaps.customers[customer.id] = { companyId, contactId };

    // Créer la company
    if (customer.company) {
      companies.push({
        id: companyId,
        organization_id: DEMO_ORG_ID,
        name: customer.company,
        email: customer.email,
        phone: customer.phone,
        created_at: customer.created_at || new Date().toISOString(),
      });
    }

    // Créer le contact
    const nameParts = customer.name ? customer.name.split(' ') : ['', ''];
    contacts.push({
      id: contactId,
      organization_id: DEMO_ORG_ID,
      company_id: customer.company ? companyId : null,
      first_name: nameParts[0],
      last_name: nameParts.slice(1).join(' ') || null,
      email: customer.email,
      phone: customer.phone,
      type: 'customer',
      score: 0,
      created_at: customer.created_at || new Date().toISOString(),
    });
  });

  return { companies, contacts };
};

// Transform users
const transformUsers = () => {
  return oldData.users.map(user => {
    const userId = uuidv4();
    idMaps.users[user.id] = userId;

    const nameParts = user.name ? user.name.split(' ') : ['', ''];
    return {
      id: userId,
      organization_id: DEMO_ORG_ID,
      email: user.email,
      password_hash: user.password,
      first_name: nameParts[0],
      last_name: nameParts.slice(1).join(' ') || null,
      status: 'active',
      email_verified: true,
      timezone: 'UTC',
      language: 'fr',
      two_factor_enabled: false,
      created_at: user.created_at || new Date().toISOString(),
    };
  });
};

// Transform sales → deals
const transformSales = (pipelineId, stageId) => {
  return oldData.sales.map(sale => {
    const customerMapping = idMaps.customers[sale.customer_id];

    return {
      id: uuidv4(),
      organization_id: DEMO_ORG_ID,
      pipeline_id: pipelineId,
      stage_id: stageId,
      title: `Vente #${sale.id}`,
      value: sale.total_amount,
      currency: 'EUR',
      contact_id: customerMapping?.contactId || null,
      company_id: customerMapping?.companyId || null,
      status: sale.status === 'completed' ? 'won' : 'open',
      created_at: sale.sale_date || new Date().toISOString(),
    };
  });
};

// Transform tasks
const transformTasks = () => {
  return oldData.tasks.map(task => {
    const customerMapping = idMaps.customers[task.customer_id];
    const userId = idMaps.users[task.assigned_to];

    return {
      id: uuidv4(),
      organization_id: DEMO_ORG_ID,
      title: task.title,
      description: task.description,
      status: task.status === 'pending' ? 'todo' : task.status === 'completed' ? 'completed' : 'in_progress',
      priority: task.priority || 'medium',
      contact_id: customerMapping?.contactId || null,
      assigned_to: userId || null,
      due_date: task.due_date,
      created_at: task.created_at || new Date().toISOString(),
    };
  });
};

// Main transformation
const newData = {
  ...transformCustomers(),
  users: transformUsers(),
  deals: transformSales('00000000-0000-0000-0003-000000000001', '00000000-0000-0000-0004-000000000001'),
  tasks: transformTasks(),
};

fs.writeFileSync('./transformed-data.json', JSON.stringify(newData, null, 2));
console.log('✓ Data transformed and saved to transformed-data.json');
```

### Étape 4: Importer dans PostgreSQL

```javascript
// import-to-postgres.js
const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'simplix_crm',
  user: 'postgres',
  password: 'postgres',
});

const data = JSON.parse(fs.readFileSync('./transformed-data.json', 'utf8'));

const importData = async () => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Import companies
    for (const company of data.companies) {
      await client.query(`
        INSERT INTO companies (id, organization_id, name, email, phone, created_at)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [company.id, company.organization_id, company.name, company.email, company.phone, company.created_at]);
    }
    console.log(`✓ Imported ${data.companies.length} companies`);

    // Import contacts
    for (const contact of data.contacts) {
      await client.query(`
        INSERT INTO contacts (id, organization_id, company_id, first_name, last_name, email, phone, type, score, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [contact.id, contact.organization_id, contact.company_id, contact.first_name, contact.last_name, contact.email, contact.phone, contact.type, contact.score, contact.created_at]);
    }
    console.log(`✓ Imported ${data.contacts.length} contacts`);

    // Import users
    for (const user of data.users) {
      await client.query(`
        INSERT INTO users (id, organization_id, email, password_hash, first_name, last_name, status, email_verified, timezone, language, two_factor_enabled, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `, [user.id, user.organization_id, user.email, user.password_hash, user.first_name, user.last_name, user.status, user.email_verified, user.timezone, user.language, user.two_factor_enabled, user.created_at]);
    }
    console.log(`✓ Imported ${data.users.length} users`);

    // Import deals
    for (const deal of data.deals) {
      await client.query(`
        INSERT INTO deals (id, organization_id, pipeline_id, stage_id, title, value, currency, contact_id, company_id, status, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [deal.id, deal.organization_id, deal.pipeline_id, deal.stage_id, deal.title, deal.value, deal.currency, deal.contact_id, deal.company_id, deal.status, deal.created_at]);
    }
    console.log(`✓ Imported ${data.deals.length} deals`);

    // Import tasks
    for (const task of data.tasks) {
      await client.query(`
        INSERT INTO tasks (id, organization_id, title, description, status, priority, contact_id, assigned_to, due_date, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [task.id, task.organization_id, task.title, task.description, task.status, task.priority, task.contact_id, task.assigned_to, task.due_date, task.created_at]);
    }
    console.log(`✓ Imported ${data.tasks.length} tasks`);

    await client.query('COMMIT');
    console.log('✓ All data imported successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error importing data:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

importData();
```

---

## 🔧 Adaptation de l'API

### 1. Mise à jour de la configuration

```typescript
// api/src/database/db.ts
import { Pool } from 'pg';

export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'simplix_crm',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});
```

### 2. Adaptation des requêtes

#### Avant (SQLite)
```typescript
db.all('SELECT * FROM customers WHERE id = ?', [id], (err, rows) => {
  // ...
});
```

#### Après (PostgreSQL)
```typescript
const result = await pool.query(
  'SELECT * FROM contacts WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL',
  [id, organizationId]
);
const contact = result.rows[0];
```

### 3. Gestion du multi-tenancy

**Très important**: Toutes les requêtes doivent filtrer par `organization_id`:

```typescript
// Middleware pour extraire l'organization_id du token JWT
app.use((req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.organizationId = decoded.organization_id;
    req.userId = decoded.user_id;
  }
  next();
});

// Dans les routes
router.get('/contacts', async (req, res) => {
  const { organizationId } = req;

  const result = await pool.query(
    'SELECT * FROM contacts WHERE organization_id = $1 AND deleted_at IS NULL',
    [organizationId]
  );

  res.json(result.rows);
});
```

### 4. Soft Delete

Utiliser `deleted_at` au lieu de supprimer:

```typescript
// Avant
await pool.query('DELETE FROM contacts WHERE id = $1', [id]);

// Après
await pool.query(
  'UPDATE contacts SET deleted_at = NOW() WHERE id = $1 AND organization_id = $2',
  [id, organizationId]
);
```

---

## ✅ Tests

### Script de test automatique

Voir le fichier `api/test/test-all-endpoints.ts` pour tester tous les endpoints avec la nouvelle BDD.

### Tests unitaires recommandés

1. **Test de connexion** à PostgreSQL
2. **Test multi-tenancy**: Vérifier l'isolation des données
3. **Test CRUD** pour chaque entité
4. **Test des relations**: Companies ↔ Contacts ↔ Deals
5. **Test soft delete**: Vérifier que les données ne sont pas vraiment supprimées
6. **Test des permissions**: RBAC
7. **Test de sécurité**: SQL injection, XSS

---

## 📚 Ressources

- [Database schema documentation](../database/README.md)
- [API types](../api/src/types/index.ts)
- [PostgreSQL documentation](https://www.postgresql.org/docs/)

---

## 🤝 Support

Pour toute question sur la migration:
1. Consultez d'abord ce guide
2. Vérifiez la documentation de la BDD
3. Demandez à l'équipe

**Bonne migration ! 🚀**
