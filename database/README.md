# 🗄️ Simplix CRM - Base de données PostgreSQL

Documentation complète pour la base de données PostgreSQL du CRM Simplix. Cette base de données est conçue pour un SaaS multi-tenant avec gestion complète des utilisateurs, CRM, tâches, analytics et campagnes email.

## 📋 Table des matières

- [Architecture](#architecture)
- [Installation](#installation)
- [Migrations](#migrations)
- [Schéma de la base de données](#schéma-de-la-base-de-données)
- [Configuration](#configuration)
- [Bonnes pratiques](#bonnes-pratiques)

---

## 🏗️ Architecture

La base de données est structurée en 4 migrations principales :

### Migration 001: Schéma de base
- **Organizations** : Gestion multi-tenant
- **Users** : Utilisateurs avec authentification
- **Roles & Permissions** : RBAC (Role-Based Access Control)
- **Sessions** : Gestion des sessions utilisateurs
- **Audit Logs** : Traçabilité complète

### Migration 002: CRM
- **Companies** : Entreprises clientes
- **Contacts** : Contacts (leads, prospects, clients)
- **Pipelines & Stages** : Pipelines de vente personnalisables
- **Deals** : Opportunités commerciales
- **Activities** : Appels, emails, réunions, tâches
- **Notes** : Notes liées aux entités CRM

### Migration 003: Tâches & Notifications
- **Tasks** : Gestion des tâches avec checklists
- **Task Comments** : Commentaires sur les tâches
- **Notifications** : Notifications in-app
- **Reminders** : Rappels programmés
- **Webhooks** : Intégrations externes
- **File Attachments** : Gestion des pièces jointes

### Migration 004: Analytics & Emails
- **Email Templates** : Templates réutilisables
- **Email Campaigns** : Campagnes marketing
- **Email Logs** : Tracking des emails (ouvertures, clics)
- **Analytics Events** : Événements d'activité
- **Reports** : Rapports configurables
- **Dashboards** : Tableaux de bord personnalisés
- **Custom Fields** : Champs personnalisés
- **Tags** : Système de tags

---

## 🚀 Installation

### Prérequis

- PostgreSQL 13 ou supérieur
- psql (client PostgreSQL)

### 1. Créer la base de données

```bash
# Se connecter à PostgreSQL
psql -U postgres

# Créer la base de données
CREATE DATABASE simplix_crm;

# Créer un utilisateur dédié (optionnel)
CREATE USER simplix_user WITH PASSWORD 'votre_mot_de_passe';
GRANT ALL PRIVILEGES ON DATABASE simplix_crm TO simplix_user;
```

### 2. Configurer les variables d'environnement

#### Unix/Linux/macOS

```bash
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=simplix_crm
export DB_USER=postgres
export DB_PASSWORD=votre_mot_de_passe
```

#### Windows (PowerShell)

```powershell
$env:DB_HOST = "localhost"
$env:DB_PORT = "5432"
$env:DB_NAME = "simplix_crm"
$env:DB_USER = "postgres"
$env:DB_PASSWORD = "votre_mot_de_passe"
```

### 3. Exécuter les migrations

#### Unix/Linux/macOS

```bash
cd database
./migrate.sh up
```

#### Windows (PowerShell)

```powershell
cd database
.\migrate.ps1 up
```

---

## 🔄 Migrations

### Commandes disponibles

#### Appliquer toutes les migrations

```bash
# Unix/Linux/macOS
./migrate.sh up

# Windows
.\migrate.ps1 up
```

#### Appliquer jusqu'à une migration spécifique

```bash
# Unix/Linux/macOS
./migrate.sh up 002

# Windows
.\migrate.ps1 up 002
```

#### Afficher le statut des migrations

```bash
# Unix/Linux/macOS
./migrate.sh status

# Windows
.\migrate.ps1 status
```

#### Créer une nouvelle migration

```bash
# Unix/Linux/macOS
./migrate.sh create add_custom_feature

# Windows
.\migrate.ps1 create add_custom_feature
```

#### Réinitialiser complètement la base de données

```bash
# Unix/Linux/macOS
./migrate.sh reset

# Windows
.\migrate.ps1 reset
```

### Structure d'une migration

```sql
-- Migration XXX: Nom de la migration
-- Description: Description détaillée
-- Author: Nom de l'auteur
-- Date: YYYY-MM-DD

-- ============================================================================
-- ENUMS (si nécessaire)
-- ============================================================================

CREATE TYPE mon_enum AS ENUM ('value1', 'value2');

-- ============================================================================
-- TABLES
-- ============================================================================

CREATE TABLE ma_table (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    -- autres colonnes...
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_ma_table_org ON ma_table(organization_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE TRIGGER update_ma_table_updated_at
    BEFORE UPDATE ON ma_table
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE ma_table IS 'Description de la table';
```

---

## 📊 Schéma de la base de données

### Relations principales

```
organizations (1) ----< (N) users
organizations (1) ----< (N) companies
organizations (1) ----< (N) contacts
organizations (1) ----< (N) deals
organizations (1) ----< (N) tasks

companies (1) ----< (N) contacts
companies (1) ----< (N) deals

contacts (1) ----< (N) deals
contacts (1) ----< (N) activities
contacts (1) ----< (N) tasks

pipelines (1) ----< (N) pipeline_stages
pipeline_stages (1) ----< (N) deals

users (N) ----< (N) roles (via user_roles)

deals (1) ----< (N) activities
deals (1) ----< (N) notes
deals (1) ----< (N) tasks

email_campaigns (1) ----< (N) email_logs
email_logs (1) ----< (N) email_link_clicks
```

### Tables principales

| Table | Description | Lignes estimées |
|-------|-------------|-----------------|
| organizations | Organisations (tenants) | Faible |
| users | Utilisateurs | Moyenne |
| companies | Entreprises clientes | Élevée |
| contacts | Contacts CRM | Très élevée |
| deals | Opportunités commerciales | Élevée |
| activities | Activités CRM | Très élevée |
| tasks | Tâches | Élevée |
| email_logs | Logs des emails envoyés | Très élevée |
| analytics_events | Événements analytics | Très élevée |

---

## ⚙️ Configuration

### Configuration de la connexion

Créez un fichier `.env` à la racine du projet :

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=simplix_crm
DB_USER=simplix_user
DB_PASSWORD=votre_mot_de_passe_securise
```

### Configuration PostgreSQL recommandée

Pour de meilleures performances, ajustez les paramètres PostgreSQL dans `postgresql.conf` :

```conf
# Mémoire
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 16MB
maintenance_work_mem = 128MB

# Connexions
max_connections = 100

# Logs
log_min_duration_statement = 1000  # Log les requêtes > 1s

# Performance
random_page_cost = 1.1  # Pour SSD
effective_io_concurrency = 200
```

---

## 🔐 Sécurité

### Principes de sécurité

1. **Multi-tenancy** : Toutes les tables principales ont une colonne `organization_id`
2. **Soft Delete** : La plupart des tables utilisent `deleted_at` pour la suppression logique
3. **Audit Trail** : Table `audit_logs` pour tracer toutes les actions importantes
4. **Hash des mots de passe** : Les mots de passe sont stockés hashés avec bcrypt
5. **2FA** : Support de l'authentification à deux facteurs

### Row-Level Security (RLS)

Pour activer RLS sur les tables sensibles :

```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_isolation_policy ON users
    USING (organization_id = current_setting('app.current_organization_id')::UUID);
```

---

## 🎯 Bonnes pratiques

### Pour les développeurs

1. **Toujours utiliser des transactions**
   ```sql
   BEGIN;
   -- vos opérations
   COMMIT;
   ```

2. **Vérifier l'organization_id**
   - Toujours filtrer par `organization_id` pour éviter les fuites de données

3. **Utiliser les UUIDs**
   - Toutes les clés primaires utilisent des UUIDs pour la sécurité

4. **Soft Delete**
   - Utiliser `deleted_at` plutôt que DELETE pour la traçabilité

5. **Indexes**
   - Créer des indexes sur les colonnes fréquemment filtrées

### Requêtes optimisées

#### Récupérer les contacts avec leur entreprise

```sql
SELECT
    c.id,
    c.full_name,
    c.email,
    co.name as company_name
FROM contacts c
LEFT JOIN companies co ON c.company_id = co.id
WHERE c.organization_id = 'xxx'
    AND c.deleted_at IS NULL
ORDER BY c.created_at DESC
LIMIT 50;
```

#### Récupérer les deals avec leurs stages

```sql
SELECT
    d.id,
    d.title,
    d.value,
    ps.name as stage_name,
    p.name as pipeline_name,
    c.full_name as contact_name
FROM deals d
JOIN pipeline_stages ps ON d.stage_id = ps.id
JOIN pipelines p ON d.pipeline_id = p.id
LEFT JOIN contacts c ON d.contact_id = c.id
WHERE d.organization_id = 'xxx'
    AND d.deleted_at IS NULL
    AND d.status = 'open'
ORDER BY d.expected_close_date ASC;
```

#### Statistiques des campagnes email

```sql
SELECT
    ec.id,
    ec.name,
    ec.total_recipients,
    ec.sent_count,
    ec.opened_count,
    ec.clicked_count,
    ROUND((ec.opened_count::NUMERIC / NULLIF(ec.sent_count, 0) * 100), 2) as open_rate,
    ROUND((ec.clicked_count::NUMERIC / NULLIF(ec.opened_count, 0) * 100), 2) as click_rate
FROM email_campaigns ec
WHERE ec.organization_id = 'xxx'
    AND ec.status = 'sent'
ORDER BY ec.sent_at DESC;
```

---

## 🔧 Maintenance

### Backup

```bash
# Backup complet
pg_dump -U postgres -d simplix_crm -F c -f backup_$(date +%Y%m%d).dump

# Backup avec compression
pg_dump -U postgres -d simplix_crm | gzip > backup_$(date +%Y%m%d).sql.gz
```

### Restore

```bash
# Restore depuis un dump custom
pg_restore -U postgres -d simplix_crm -c backup.dump

# Restore depuis SQL
psql -U postgres -d simplix_crm < backup.sql
```

### Vacuum et Analyze

```sql
-- Vacuum complet (à faire régulièrement)
VACUUM ANALYZE;

-- Vacuum sur une table spécifique
VACUUM ANALYZE contacts;

-- Reindex
REINDEX DATABASE simplix_crm;
```

### Monitoring

#### Taille de la base de données

```sql
SELECT
    pg_size_pretty(pg_database_size('simplix_crm')) as database_size;
```

#### Taille des tables

```sql
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

#### Requêtes lentes

```sql
SELECT
    pid,
    now() - query_start as duration,
    query
FROM pg_stat_activity
WHERE state = 'active'
    AND now() - query_start > interval '5 seconds'
ORDER BY duration DESC;
```

---

## 📚 Ressources

- [Documentation PostgreSQL](https://www.postgresql.org/docs/)
- [Best Practices pour PostgreSQL](https://wiki.postgresql.org/wiki/Don%27t_Do_This)
- [pgAdmin](https://www.pgadmin.org/) - Interface graphique pour PostgreSQL
- [DBeaver](https://dbeaver.io/) - Client SQL universel

---

## 🤝 Contribution

### Créer une nouvelle migration

1. Créer la migration :
   ```bash
   ./migrate.sh create ma_nouvelle_feature
   ```

2. Éditer le fichier généré dans `migrations/`

3. Tester localement :
   ```bash
   ./migrate.sh up
   ```

4. Commiter et pusher :
   ```bash
   git add database/migrations/
   git commit -m "feat: add new migration for ma_nouvelle_feature"
   git push
   ```

### Convention de nommage

- Tables : `snake_case` au pluriel (ex: `email_campaigns`)
- Colonnes : `snake_case` (ex: `first_name`)
- Indexes : `idx_<table>_<column>` (ex: `idx_users_email`)
- Foreign Keys : `<table>_<column>_fkey` (ex: `contacts_company_id_fkey`)
- Enums : `snake_case` (ex: `user_status`)

---

## 📞 Support

Pour toute question ou problème :

1. Vérifiez la documentation ci-dessus
2. Consultez les logs PostgreSQL
3. Contactez l'équipe de développement

**Bon développement ! 🚀**
