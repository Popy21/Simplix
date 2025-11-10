#!/bin/bash

# =============================================================================
# SIMPLIX - Setup Base de Données Production
# =============================================================================
# Ce script configure PostgreSQL et crée la base de données
# =============================================================================

set -e

echo "🗄️  SIMPLIX - Configuration PostgreSQL"
echo "======================================="
echo ""

DB_NAME="simplix_crm"
DB_USER="simplix"
DB_PASS="Simplix2024!SecurePass"

# Become postgres user and execute SQL
echo "📦 Création de la base de données et de l'utilisateur..."

sudo -u postgres psql <<EOF
-- Drop existing if exists
DROP DATABASE IF EXISTS $DB_NAME;
DROP USER IF EXISTS $DB_USER;

-- Create user
CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';

-- Create database
CREATE DATABASE $DB_NAME OWNER $DB_USER;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;

\c $DB_NAME

-- Grant schema privileges
GRANT ALL ON SCHEMA public TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $DB_USER;

\q
EOF

echo "✅ Base de données créée: $DB_NAME"
echo "✅ Utilisateur créé: $DB_USER"
echo ""

# Execute migrations
echo "📦 Exécution des migrations SQL..."

MIGRATION_DIR="/var/www/simplix/database/migrations"

if [ -d "$MIGRATION_DIR" ]; then
    for migration in $(ls $MIGRATION_DIR/*.sql | sort); do
        echo "  → $(basename $migration)"
        PGPASSWORD=$DB_PASS psql -h localhost -U $DB_USER -d $DB_NAME -f $migration
    done
    echo "✅ Migrations exécutées"
else
    echo "⚠️  Répertoire migrations non trouvé: $MIGRATION_DIR"
fi

echo ""

# Insert default organization
echo "📦 Création de l'organisation par défaut..."

PGPASSWORD=$DB_PASS psql -h localhost -U $DB_USER -d $DB_NAME <<EOF
-- Insert default organization if not exists
INSERT INTO organizations (id, name, slug, timezone, currency, subscription_status, subscription_plan)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Simplix Default',
    'simplix-default',
    'Europe/Paris',
    'EUR',
    'active',
    'professional'
) ON CONFLICT (id) DO NOTHING;

-- Insert admin user (password: admin123)
INSERT INTO users (
    organization_id,
    email,
    password_hash,
    first_name,
    last_name,
    status,
    email_verified
)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'admin@simplix.fr',
    '\$2b\$12\$qGJwMQgQGRyVR1qycvPd7OMbSFpo/rDLTAzniGTQJL7lAW/BAtAEi',
    'Admin',
    'Simplix',
    'active',
    true
) ON CONFLICT (email, organization_id) DO NOTHING;

\q
EOF

echo "✅ Organisation par défaut créée"
echo ""

# Show stats
echo "📊 Statistiques de la base de données:"
PGPASSWORD=$DB_PASS psql -h localhost -U $DB_USER -d $DB_NAME <<EOF
SELECT
    schemaname,
    COUNT(*) as tables
FROM pg_tables
WHERE schemaname = 'public'
GROUP BY schemaname;

SELECT COUNT(*) as total_tables FROM pg_tables WHERE schemaname = 'public';
\q
EOF

echo ""
echo "✅ Base de données prête!"
echo ""
echo "📋 Informations de connexion:"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo "  Password: $DB_PASS"
echo "  Connection: postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME"
