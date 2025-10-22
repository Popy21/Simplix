#!/bin/bash

# Script de migration PostgreSQL pour Simplix CRM
# Usage: ./migrate.sh [up|down|status|reset] [migration_number]

set -e

# Configuration (à personnaliser selon votre environnement)
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-simplix_crm}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"

MIGRATIONS_DIR="$(dirname "$0")/migrations"
MIGRATIONS_TABLE="schema_migrations"

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction pour exécuter des commandes SQL
psql_exec() {
    PGPASSWORD=$DB_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "$1"
}

# Fonction pour exécuter un fichier SQL
psql_file() {
    PGPASSWORD=$DB_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$1"
}

# Créer la table de suivi des migrations
init_migrations_table() {
    echo -e "${BLUE}🔧 Initialisation de la table de migrations...${NC}"
    psql_exec "CREATE TABLE IF NOT EXISTS $MIGRATIONS_TABLE (
        id SERIAL PRIMARY KEY,
        version VARCHAR(50) NOT NULL UNIQUE,
        filename VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );" > /dev/null
    echo -e "${GREEN}✓ Table de migrations initialisée${NC}"
}

# Vérifier si une migration a été exécutée
is_migration_applied() {
    local version=$1
    result=$(psql_exec "SELECT COUNT(*) FROM $MIGRATIONS_TABLE WHERE version = '$version';" 2>/dev/null | tr -d ' ')
    if [ "$result" = "1" ]; then
        return 0
    else
        return 1
    fi
}

# Enregistrer une migration comme exécutée
record_migration() {
    local version=$1
    local filename=$2
    psql_exec "INSERT INTO $MIGRATIONS_TABLE (version, filename) VALUES ('$version', '$filename');" > /dev/null
}

# Supprimer l'enregistrement d'une migration
remove_migration_record() {
    local version=$1
    psql_exec "DELETE FROM $MIGRATIONS_TABLE WHERE version = '$version';" > /dev/null
}

# Obtenir le dernier numéro de migration appliquée
get_latest_migration() {
    psql_exec "SELECT version FROM $MIGRATIONS_TABLE ORDER BY executed_at DESC LIMIT 1;" 2>/dev/null | tr -d ' '
}

# Exécuter les migrations UP
migrate_up() {
    local target_version=$1

    echo -e "${BLUE}📤 Exécution des migrations UP...${NC}"
    echo ""

    for migration_file in "$MIGRATIONS_DIR"/*.sql; do
        if [ ! -f "$migration_file" ]; then
            continue
        fi

        filename=$(basename "$migration_file")
        version=$(echo "$filename" | cut -d'_' -f1)

        # Si une version cible est spécifiée, s'arrêter après cette version
        if [ -n "$target_version" ] && [ "$version" -gt "$target_version" ]; then
            continue
        fi

        if ! is_migration_applied "$version"; then
            echo -e "${YELLOW}⏳ Application de la migration $version: $filename${NC}"

            if psql_file "$migration_file" > /dev/null 2>&1; then
                record_migration "$version" "$filename"
                echo -e "${GREEN}✓ Migration $version appliquée avec succès${NC}"
            else
                echo -e "${RED}❌ Erreur lors de l'application de la migration $version${NC}"
                exit 1
            fi
        else
            echo -e "${GREEN}✓ Migration $version déjà appliquée${NC}"
        fi
    done

    echo ""
    echo -e "${GREEN}🎉 Toutes les migrations ont été appliquées avec succès${NC}"
}

# Afficher le statut des migrations
show_status() {
    echo -e "${BLUE}📊 Statut des migrations:${NC}"
    echo ""

    latest=$(get_latest_migration)
    if [ -z "$latest" ]; then
        echo -e "${YELLOW}Aucune migration appliquée${NC}"
        latest="000"
    else
        echo -e "${GREEN}Dernière migration appliquée: $latest${NC}"
    fi

    echo ""
    echo "Migrations disponibles:"
    echo "----------------------"

    for migration_file in "$MIGRATIONS_DIR"/*.sql; do
        if [ ! -f "$migration_file" ]; then
            continue
        fi

        filename=$(basename "$migration_file")
        version=$(echo "$filename" | cut -d'_' -f1)

        if is_migration_applied "$version"; then
            echo -e "${GREEN}✓${NC} $filename"
        else
            echo -e "${RED}✗${NC} $filename"
        fi
    done
}

# Réinitialiser la base de données
reset_database() {
    echo -e "${RED}⚠️  ATTENTION: Cette opération va supprimer TOUTES les données!${NC}"
    read -p "Êtes-vous sûr de vouloir continuer? (tapez 'yes' pour confirmer): " confirm

    if [ "$confirm" != "yes" ]; then
        echo "Opération annulée."
        exit 0
    fi

    echo -e "${YELLOW}🔄 Suppression de toutes les tables...${NC}"

    # Drop all tables
    psql_exec "DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO $DB_USER; GRANT ALL ON SCHEMA public TO public;" > /dev/null

    echo -e "${GREEN}✓ Base de données réinitialisée${NC}"

    # Réappliquer les migrations
    init_migrations_table
    migrate_up
}

# Créer une nouvelle migration
create_migration() {
    local name=$1

    if [ -z "$name" ]; then
        echo -e "${RED}❌ Erreur: Vous devez spécifier un nom pour la migration${NC}"
        echo "Usage: $0 create <nom_de_la_migration>"
        exit 1
    fi

    # Trouver le prochain numéro de version
    last_migration=$(ls -1 "$MIGRATIONS_DIR"/*.sql 2>/dev/null | tail -1 || echo "000")
    if [ "$last_migration" = "000" ]; then
        next_version="001"
    else
        last_version=$(basename "$last_migration" | cut -d'_' -f1)
        next_version=$(printf "%03d" $((10#$last_version + 1)))
    fi

    filename="${next_version}_${name}.sql"
    filepath="$MIGRATIONS_DIR/$filename"

    cat > "$filepath" << EOF
-- Migration $next_version: $name
-- Description:
-- Author: Team Simplix
-- Date: $(date +%Y-%m-%d)

-- ============================================================================
-- TODO: Add your migration SQL here
-- ============================================================================


-- ============================================================================
-- COMMENTS
-- ============================================================================

EOF

    echo -e "${GREEN}✓ Migration créée: $filepath${NC}"
}

# Menu d'aide
show_help() {
    echo "Script de migration PostgreSQL pour Simplix CRM"
    echo ""
    echo "Usage: $0 [command] [options]"
    echo ""
    echo "Commandes:"
    echo "  up [version]     Appliquer toutes les migrations (ou jusqu'à une version spécifique)"
    echo "  status           Afficher le statut des migrations"
    echo "  reset            Réinitialiser complètement la base de données"
    echo "  create <name>    Créer une nouvelle migration"
    echo "  help             Afficher cette aide"
    echo ""
    echo "Variables d'environnement:"
    echo "  DB_HOST          Hôte PostgreSQL (défaut: localhost)"
    echo "  DB_PORT          Port PostgreSQL (défaut: 5432)"
    echo "  DB_NAME          Nom de la base de données (défaut: simplix_crm)"
    echo "  DB_USER          Utilisateur PostgreSQL (défaut: postgres)"
    echo "  DB_PASSWORD      Mot de passe PostgreSQL (défaut: postgres)"
    echo ""
    echo "Exemples:"
    echo "  $0 up                    # Appliquer toutes les migrations"
    echo "  $0 up 002                # Appliquer jusqu'à la migration 002"
    echo "  $0 status                # Voir l'état des migrations"
    echo "  $0 reset                 # Réinitialiser la BDD"
    echo "  $0 create add_users      # Créer une nouvelle migration"
}

# Point d'entrée principal
main() {
    local command=${1:-help}

    # Vérifier que PostgreSQL est accessible
    if ! PGPASSWORD=$DB_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c '\q' 2>/dev/null; then
        echo -e "${RED}❌ Erreur: Impossible de se connecter à PostgreSQL${NC}"
        echo "Vérifiez vos paramètres de connexion."
        exit 1
    fi

    # Initialiser la table de migrations si nécessaire
    if [ "$command" != "help" ] && [ "$command" != "create" ]; then
        init_migrations_table
    fi

    case $command in
        up)
            migrate_up "$2"
            ;;
        status)
            show_status
            ;;
        reset)
            reset_database
            ;;
        create)
            create_migration "$2"
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            echo -e "${RED}Commande inconnue: $command${NC}"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

main "$@"
