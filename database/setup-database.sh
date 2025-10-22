#!/bin/bash

# Script de setup automatique de la base de données PostgreSQL pour Simplix CRM
# Compatible: macOS, Linux (Ubuntu/Debian, CentOS/RHEL)
# Usage: ./setup-database.sh

set -e

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration par défaut
DB_NAME="simplix_crm"
DB_PORT="5432"
DB_HOST="localhost"

echo -e "${CYAN}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║         Simplix CRM - Database Setup Script               ║"
echo "║                PostgreSQL Installation                     ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Fonction pour détecter l'OS
detect_os() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    elif [[ -f /etc/debian_version ]]; then
        echo "debian"
    elif [[ -f /etc/redhat-release ]]; then
        echo "redhat"
    else
        echo "unknown"
    fi
}

# Fonction pour vérifier si une commande existe
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Détection de l'OS
OS=$(detect_os)
echo -e "${BLUE}🔍 Détection du système d'exploitation: $OS${NC}"
echo ""

# 1. Installation de PostgreSQL
echo -e "${YELLOW}📦 Étape 1/5: Installation de PostgreSQL${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if command_exists psql; then
    PSQL_VERSION=$(psql --version | awk '{print $3}')
    echo -e "${GREEN}✓ PostgreSQL est déjà installé (version $PSQL_VERSION)${NC}"
else
    echo -e "${YELLOW}PostgreSQL n'est pas installé. Installation en cours...${NC}"

    case $OS in
        macos)
            if ! command_exists brew; then
                echo -e "${RED}❌ Homebrew n'est pas installé. Veuillez l'installer d'abord:${NC}"
                echo -e "   /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
                exit 1
            fi

            echo "Installation via Homebrew..."
            brew install postgresql@14
            brew services start postgresql@14

            # Ajouter PostgreSQL au PATH pour cette session
            export PATH="/opt/homebrew/opt/postgresql@14/bin:$PATH"
            ;;

        debian)
            echo "Installation via apt (Debian/Ubuntu)..."
            sudo apt update
            sudo apt install -y postgresql postgresql-contrib
            sudo systemctl start postgresql
            sudo systemctl enable postgresql
            ;;

        redhat)
            echo "Installation via yum/dnf (CentOS/RHEL)..."
            sudo yum install -y postgresql-server postgresql-contrib
            sudo postgresql-setup initdb
            sudo systemctl start postgresql
            sudo systemctl enable postgresql
            ;;

        *)
            echo -e "${RED}❌ Système d'exploitation non supporté${NC}"
            echo "Veuillez installer PostgreSQL manuellement: https://www.postgresql.org/download/"
            exit 1
            ;;
    esac

    echo -e "${GREEN}✓ PostgreSQL installé avec succès${NC}"
fi

echo ""
sleep 2

# 2. Configuration de l'utilisateur et du mot de passe
echo -e "${YELLOW}📝 Étape 2/5: Configuration de l'utilisateur${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Déterminer l'utilisateur PostgreSQL par défaut
if [[ $OS == "macos" ]]; then
    DB_USER=$(whoami)
    DB_PASSWORD=""
    echo -e "${BLUE}ℹ️  Sur macOS, on utilise l'utilisateur système: $DB_USER${NC}"
else
    echo "Utilisateur PostgreSQL par défaut: postgres"
    read -p "Voulez-vous créer un nouvel utilisateur ? (y/n) [n]: " create_user

    if [[ $create_user == "y" ]]; then
        read -p "Nom d'utilisateur: " DB_USER
        read -sp "Mot de passe: " DB_PASSWORD
        echo ""

        sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';"
        sudo -u postgres psql -c "ALTER USER $DB_USER CREATEDB;"
        echo -e "${GREEN}✓ Utilisateur $DB_USER créé${NC}"
    else
        DB_USER="postgres"
        DB_PASSWORD=""
        echo -e "${BLUE}ℹ️  Utilisation de l'utilisateur par défaut: postgres${NC}"
    fi
fi

echo ""
sleep 1

# 3. Création de la base de données
echo -e "${YELLOW}🗄️  Étape 3/5: Création de la base de données${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Vérifier si la base existe déjà
if psql -U "$DB_USER" -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    echo -e "${YELLOW}⚠️  La base de données '$DB_NAME' existe déjà${NC}"
    read -p "Voulez-vous la supprimer et la recréer ? (y/n) [n]: " recreate_db

    if [[ $recreate_db == "y" ]]; then
        echo "Suppression de la base existante..."
        if [[ $OS == "macos" ]]; then
            psql -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;"
        else
            sudo -u "$DB_USER" psql -c "DROP DATABASE IF EXISTS $DB_NAME;"
        fi
        echo -e "${GREEN}✓ Base de données supprimée${NC}"
    else
        echo -e "${BLUE}ℹ️  Conservation de la base de données existante${NC}"
        echo ""
        read -p "Appuyez sur Entrée pour continuer..."
    fi
fi

# Créer la base de données si elle n'existe pas
if ! psql -U "$DB_USER" -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    echo "Création de la base de données '$DB_NAME'..."

    if [[ $OS == "macos" ]]; then
        psql -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME;"
    else
        sudo -u "$DB_USER" psql -c "CREATE DATABASE $DB_NAME;"
        sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
    fi

    echo -e "${GREEN}✓ Base de données '$DB_NAME' créée${NC}"
else
    echo -e "${BLUE}ℹ️  Base de données '$DB_NAME' déjà existante${NC}"
fi

echo ""
sleep 1

# 4. Application des migrations
echo -e "${YELLOW}🚀 Étape 4/5: Application des migrations${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Créer le fichier .env
cat > .env << EOF
DB_HOST=$DB_HOST
DB_PORT=$DB_PORT
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
EOF

echo -e "${GREEN}✓ Fichier .env créé${NC}"

# Exporter les variables d'environnement
export DB_HOST="$DB_HOST"
export DB_PORT="$DB_PORT"
export DB_NAME="$DB_NAME"
export DB_USER="$DB_USER"
export DB_PASSWORD="$DB_PASSWORD"

# Appliquer les migrations
echo "Application des migrations SQL..."
./migrate.sh up

echo ""
sleep 1

# 5. Chargement des données de démonstration
echo -e "${YELLOW}📊 Étape 5/5: Chargement des données de démonstration${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

read -p "Voulez-vous charger les données de démonstration ? (y/n) [y]: " load_seeds
load_seeds=${load_seeds:-y}

if [[ $load_seeds == "y" ]]; then
    echo "Chargement des données de seed..."

    if [[ -f "seeds/001_default_data.sql" ]]; then
        if [[ $OS == "macos" ]]; then
            psql -U "$DB_USER" -d "$DB_NAME" -f seeds/001_default_data.sql
        else
            sudo -u "$DB_USER" psql -d "$DB_NAME" -f seeds/001_default_data.sql
        fi
        echo -e "${GREEN}✓ Données de démonstration chargées${NC}"
    else
        echo -e "${YELLOW}⚠️  Fichier seeds/001_default_data.sql non trouvé${NC}"
    fi
else
    echo -e "${BLUE}ℹ️  Pas de données de démonstration chargées${NC}"
fi

echo ""
echo -e "${GREEN}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║              ✅ Installation terminée !                    ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""
echo -e "${CYAN}📋 Informations de connexion:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}Host:${NC}     $DB_HOST"
echo -e "${BLUE}Port:${NC}     $DB_PORT"
echo -e "${BLUE}Database:${NC} $DB_NAME"
echo -e "${BLUE}User:${NC}     $DB_USER"
if [[ -n "$DB_PASSWORD" ]]; then
    echo -e "${BLUE}Password:${NC} ********"
else
    echo -e "${BLUE}Password:${NC} (vide)"
fi
echo ""
echo -e "${CYAN}🔧 Commandes utiles:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}# Se connecter à la base${NC}"
echo "  psql -U $DB_USER -d $DB_NAME"
echo ""
echo -e "${GREEN}# Voir le statut des migrations${NC}"
echo "  ./migrate.sh status"
echo ""
echo -e "${GREEN}# Appliquer de nouvelles migrations${NC}"
echo "  ./migrate.sh up"
echo ""
echo -e "${GREEN}# Créer une nouvelle migration${NC}"
echo "  ./migrate.sh create nom_de_la_migration"
echo ""
echo -e "${GREEN}# Réinitialiser complètement la base${NC}"
echo "  ./migrate.sh reset"
echo ""
echo -e "${CYAN}📚 Documentation:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  - README.md              - Documentation complète de la BDD"
echo "  - ../docs/MIGRATION_GUIDE.md    - Guide de migration"
echo "  - ../docs/STATUS.md             - État du projet"
echo ""
echo -e "${GREEN}🎉 La base de données Simplix CRM est prête à l'emploi !${NC}"
echo ""
