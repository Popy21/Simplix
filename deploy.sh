#!/bin/bash

# =============================================================================
# SIMPLIX - Script de Déploiement Automatique
# =============================================================================
# Déploie Simplix CRM sur simplix.paraweb.fr
# Serveur: 82.165.134.105
# =============================================================================

set -e  # Exit on error

# Couleurs pour output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SERVER_IP="82.165.134.105"
SERVER_USER="root"
SERVER_PASS='HkVB9iuftdyè(4442212l???'
DOMAIN="simplix.paraweb.fr"
APP_DIR="/var/www/simplix"
REPO_URL="https://github.com/Popy21/Simplix.git"
BRANCH="main"

echo -e "${BLUE}"
echo "╔════════════════════════════════════════╗"
echo "║   SIMPLIX - Déploiement Production    ║"
echo "║         simplix.paraweb.fr             ║"
echo "╚════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# Check if sshpass is installed
if ! command -v sshpass &> /dev/null; then
    echo -e "${YELLOW}⚠️  Installation de sshpass...${NC}"
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install hudochenkov/sshpass/sshpass
    else
        apt-get install -y sshpass
    fi
fi

# Function to execute command on remote server
remote_exec() {
    sshpass -p "$SERVER_PASS" ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "$1"
}

# Function to copy file to remote server
remote_copy() {
    sshpass -p "$SERVER_PASS" scp -o StrictHostKeyChecking=no -r "$1" $SERVER_USER@$SERVER_IP:"$2"
}

echo -e "${YELLOW}📋 Étape 1/7: Vérification du serveur...${NC}"
if remote_exec "echo 'Serveur accessible'"; then
    echo -e "${GREEN}✅ Connexion serveur OK${NC}"
else
    echo -e "${RED}❌ Impossible de se connecter au serveur${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}📦 Étape 2/7: Installation des dépendances serveur...${NC}"
echo "  → Node.js 20, PostgreSQL 16, Nginx, PM2, Certbot"

# Copy and execute installation script
remote_copy "scripts/install-server.sh" "/tmp/"
remote_exec "chmod +x /tmp/install-server.sh && /tmp/install-server.sh"

echo -e "${GREEN}✅ Dépendances installées${NC}"

echo ""
echo -e "${YELLOW}🗄️  Étape 3/7: Configuration PostgreSQL...${NC}"

# Create database directory on server
remote_exec "mkdir -p /tmp/simplix-migrations"

# Copy migration files
echo "  → Copie des migrations SQL..."
remote_copy "database/migrations/" "/tmp/simplix-migrations/"

# Copy and execute database setup script
remote_copy "scripts/setup-production-db.sh" "/tmp/"
remote_exec "chmod +x /tmp/setup-production-db.sh && /tmp/setup-production-db.sh"

echo -e "${GREEN}✅ Base de données configurée${NC}"

echo ""
echo -e "${YELLOW}📥 Étape 4/7: Déploiement du code...${NC}"

# Clone or pull repository
remote_exec "
    if [ -d '$APP_DIR/.git' ]; then
        echo '  → Mise à jour du code existant...'
        cd $APP_DIR && git fetch --all && git reset --hard origin/$BRANCH
    else
        echo '  → Clonage du repository...'
        rm -rf $APP_DIR
        git clone -b $BRANCH $REPO_URL $APP_DIR
    fi
"

echo -e "${GREEN}✅ Code déployé (branch: $BRANCH)${NC}"

echo ""
echo -e "${YELLOW}⚙️  Étape 5/7: Configuration de l'application...${NC}"

# Copy environment file
echo "  → Copie du fichier .env.production..."
remote_copy ".env.production" "$APP_DIR/api/.env"

# Copy PM2 ecosystem
echo "  → Copie de la configuration PM2..."
remote_copy "ecosystem.config.js" "$APP_DIR/"

# Install dependencies and build
echo "  → Installation des dépendances npm..."
remote_exec "
    cd $APP_DIR/api && npm install --production
    npm run build
"

echo -e "${GREEN}✅ Application configurée${NC}"

echo ""
echo -e "${YELLOW}🚀 Étape 6/7: Démarrage de l'application avec PM2...${NC}"

# Stop existing PM2 processes
remote_exec "pm2 delete simplix-api 2>/dev/null || true"

# Start with PM2
remote_exec "
    cd $APP_DIR
    pm2 start ecosystem.config.js
    pm2 save
"

echo -e "${GREEN}✅ Application démarrée avec PM2${NC}"

echo ""
echo -e "${YELLOW}🌐 Étape 7/7: Configuration Nginx et SSL...${NC}"

# Copy nginx config
echo "  → Configuration Nginx..."
remote_copy "nginx-simplix.conf" "/etc/nginx/sites-available/simplix"
remote_exec "
    ln -sf /etc/nginx/sites-available/simplix /etc/nginx/sites-enabled/simplix
    rm -f /etc/nginx/sites-enabled/default
    nginx -t
"

# Get SSL certificate
echo "  → Obtention du certificat SSL Let's Encrypt..."
remote_exec "
    certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN --redirect || true
"

# Reload Nginx
echo "  → Rechargement Nginx..."
remote_exec "systemctl reload nginx"

echo -e "${GREEN}✅ Nginx et SSL configurés${NC}"

echo ""
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     ✅ DÉPLOIEMENT RÉUSSI! 🎉          ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}📊 Informations de déploiement:${NC}"
echo -e "  ${GREEN}🌐 URL:${NC} https://$DOMAIN"
echo -e "  ${GREEN}🗄️  Database:${NC} simplix_crm"
echo -e "  ${GREEN}👤 Admin:${NC} admin@simplix.fr / admin123"
echo ""
echo -e "${BLUE}📋 Commandes utiles:${NC}"
echo -e "  ${YELLOW}# Voir les logs PM2${NC}"
echo -e "  ssh root@$SERVER_IP 'pm2 logs simplix-api'"
echo ""
echo -e "  ${YELLOW}# Statut de l'application${NC}"
echo -e "  ssh root@$SERVER_IP 'pm2 status'"
echo ""
echo -e "  ${YELLOW}# Redémarrer l'application${NC}"
echo -e "  ssh root@$SERVER_IP 'pm2 restart simplix-api'"
echo ""
echo -e "  ${YELLOW}# Voir les logs Nginx${NC}"
echo -e "  ssh root@$SERVER_IP 'tail -f /var/log/nginx/simplix-error.log'"
echo ""
echo -e "${RED}⚠️  ACTIONS DE SÉCURITÉ URGENTES:${NC}"
echo -e "  ${YELLOW}1. Changez le mot de passe root Plesk immédiatement${NC}"
echo -e "  ${YELLOW}2. Configurez une clé SSH et désactivez l'auth par mot de passe${NC}"
echo -e "  ${YELLOW}3. Changez le mot de passe admin de l'application${NC}"
echo -e "  ${YELLOW}4. Mettez à jour JWT_SECRET dans .env${NC}"
echo ""
echo -e "${GREEN}🎯 Testez votre application:${NC}"
echo -e "  curl https://$DOMAIN/api/auth/login -H 'Content-Type: application/json' -d '{\"email\":\"admin@simplex.fr\",\"password\":\"admin123\"}'"
echo ""
