# 🚀 Migration API - Quick Start

## ⚠️ Situation actuelle

L'API utilise encore SQLite avec l'ancienne structure. Pour la faire fonctionner avec PostgreSQL, il faut adapter chaque route.

## ✅ Routes adaptées

- ✅ `customers.ts` - ADAPTÉ pour PostgreSQL (mapping vers contacts + companies)

## ⏳ Routes à adapter (13 restantes)

- ❌ `products.ts`
- ❌ `sales.ts`
- ❌ `auth.ts`
- ❌ `teams.ts`
- ❌ `quotes.ts`
- ❌ `search.ts`
- ❌ `bulk.ts`
- ❌ `reports.ts`
- ❌ `tasks.ts`
- ❌ `pipeline.ts`
- ❌ `notifications.ts`
- ❌ `campaigns.ts`
- ❌ `analytics.ts`

## 📝 Pattern de migration

### Avant (SQLite)
```typescript
import db from '../database/db';

router.get('/', (req: Request, res: Response) => {
  db.all('SELECT * FROM table', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});
```

### Après (PostgreSQL)
```typescript
import { pool } from '../database/db';

router.get('/', async (req: Request, res: Response) => {
  try {
    const orgId = '00000000-0000-0000-0000-000000000001'; // Demo org

    const result = await pool.query(
      'SELECT * FROM table WHERE organization_id = $1 AND deleted_at IS NULL',
      [orgId]
    );

    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
```

## 🔑 Changements principaux

### 1. Import
```typescript
// Avant
import db from '../database/db';

// Après
import { pool } from '../database/db';
```

### 2. Callbacks → Async/Await
```typescript
// Avant (callback)
db.all('SELECT...', [], (err, rows) => { ... });

// Après (async/await)
const result = await pool.query('SELECT...', [param1]);
const rows = result.rows;
```

### 3. Placeholders
```typescript
// Avant SQLite (?)
db.get('SELECT * FROM users WHERE id = ?', [id], ...)

// Après PostgreSQL ($1, $2, ...)
await pool.query('SELECT * FROM users WHERE id = $1', [id])
```

### 4. Multi-tenancy
**TOUJOURS** filtrer par `organization_id` :
```typescript
const orgId = '00000000-0000-0000-0000-000000000001';

await pool.query(
  'SELECT * FROM contacts WHERE organization_id = $1 AND deleted_at IS NULL',
  [orgId]
);
```

### 5. Soft Delete
Utiliser `deleted_at` au lieu de `DELETE` :
```typescript
// Avant
db.run('DELETE FROM table WHERE id = ?', [id])

// Après
await pool.query(
  'UPDATE table SET deleted_at = NOW() WHERE id = $1',
  [id]
);
```

### 6. INSERT with RETURNING
```typescript
// Avant (SQLite)
db.run('INSERT INTO...', [...], function(err) {
  const id = this.lastID;
  res.json({ id, ...data });
});

// Après (PostgreSQL)
const result = await pool.query(
  'INSERT INTO table (...) VALUES ($1, $2) RETURNING id, ...',
  [val1, val2]
);
const newRecord = result.rows[0];
res.json(newRecord);
```

## 🎯 Exemple complet: Route Products

```typescript
import express, { Request, Response } from 'express';
import { pool } from '../database/db';

const router = express.Router();
const DEMO_ORG_ID = '00000000-0000-0000-0000-000000000001';

// GET /api/products
router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT * FROM products
       WHERE organization_id = $1 AND deleted_at IS NULL
       ORDER BY created_at DESC`,
      [DEMO_ORG_ID]
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/products/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT * FROM products
       WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL`,
      [id, DEMO_ORG_ID]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/products
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, description, price, stock } = req.body;

    if (!name || !price) {
      res.status(400).json({ error: 'Name and price are required' });
      return;
    }

    const result = await pool.query(
      `INSERT INTO products (organization_id, name, description, price, stock)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, description, price, stock, created_at`,
      [DEMO_ORG_ID, name, description, price, stock || 0]
    );

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/products/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, price, stock } = req.body;

    const result = await pool.query(
      `UPDATE products
       SET name = $1, description = $2, price = $3, stock = $4, updated_at = NOW()
       WHERE id = $5 AND organization_id = $6 AND deleted_at IS NULL
       RETURNING id, name, description, price, stock, updated_at`,
      [name, description, price, stock, id, DEMO_ORG_ID]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/products/:id (soft delete)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE products
       SET deleted_at = NOW()
       WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
       RETURNING id`,
      [id, DEMO_ORG_ID]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    res.json({ message: 'Product deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
```

## ⚡ Script rapide pour adapter une route

Utilise ce template et remplace `TABLE_NAME` et `ENTITY_NAME` :

```bash
# Exemple pour products
sed 's/TABLE_NAME/products/g; s/ENTITY_NAME/Product/g' template.ts > products.ts
```

## 📋 Checklist par route

Pour chaque route à adapter :

- [ ] Changer l'import de `db` vers `{ pool }`
- [ ] Convertir tous les callbacks en async/await
- [ ] Remplacer `?` par `$1, $2, ...`
- [ ] Ajouter `organization_id` dans toutes les requêtes
- [ ] Ajouter `AND deleted_at IS NULL` dans les SELECT
- [ ] Changer DELETE en UPDATE avec `deleted_at = NOW()`
- [ ] Utiliser `RETURNING` dans INSERT/UPDATE
- [ ] Gérer les erreurs avec try/catch
- [ ] Tester les endpoints

## 🚀 Prochaines étapes

1. **Option 1 (Rapide)** - Adapter une par une les routes les plus utilisées
2. **Option 2 (Complet)** - Créer de nouvelles routes basées sur la nouvelle structure
3. **Option 3 (Hybride)** - Garder les anciennes routes pour compatibilité + créer les nouvelles

## 🆘 Besoin d'aide ?

Consulte :
- [database/README.md](../database/README.md) - Documentation BDD
- [docs/MIGRATION_GUIDE.md](MIGRATION_GUIDE.md) - Guide complet
- [api/src/types/index.ts](../api/src/types/index.ts) - Types TypeScript
- [api/src/routes/customers.ts](../api/src/routes/customers.ts) - Exemple adapté

**Note**: La route `customers` a été adaptée et peut servir d'exemple !
