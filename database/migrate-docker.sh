#!/bin/sh

# Script de migration pour environnement Docker
# Applique toutes les migrations SQL dans l'ordre

set -e

echo "🔧 Waiting for PostgreSQL to be ready..."
until PGPASSWORD=$DB_PASSWORD psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c '\q' 2>/dev/null; do
  echo "⏳ PostgreSQL is unavailable - sleeping"
  sleep 2
done

echo "✅ PostgreSQL is up - executing migrations"

# Créer la table de suivi des migrations
PGPASSWORD=$DB_PASSWORD psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" <<-EOSQL
  CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    version VARCHAR(50) NOT NULL UNIQUE,
    filename VARCHAR(255) NOT NULL,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
EOSQL

echo "📊 Migration table created"

# Appliquer chaque migration
for migration_file in /migrations/*.sql; do
  if [ -f "$migration_file" ]; then
    filename=$(basename "$migration_file")
    version=$(echo "$filename" | cut -d'_' -f1)

    # Vérifier si déjà appliquée
    count=$(PGPASSWORD=$DB_PASSWORD psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -c \
      "SELECT COUNT(*) FROM schema_migrations WHERE version = '$version';" | tr -d ' ')

    if [ "$count" = "0" ]; then
      echo "⏳ Applying migration $version: $filename"

      if PGPASSWORD=$DB_PASSWORD psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -f "$migration_file" > /dev/null 2>&1; then
        # Enregistrer comme appliquée
        PGPASSWORD=$DB_PASSWORD psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c \
          "INSERT INTO schema_migrations (version, filename) VALUES ('$version', '$filename');" > /dev/null
        echo "✅ Migration $version applied successfully"
      else
        echo "❌ Error applying migration $version"
        exit 1
      fi
    else
      echo "✓ Migration $version already applied"
    fi
  fi
done

echo ""
echo "🎉 All migrations completed successfully!"
