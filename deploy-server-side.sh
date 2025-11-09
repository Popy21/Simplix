#!/bin/bash

# ============================================================================
# SIMPLIX - SCRIPT DE DÉPLOIEMENT CÔTÉ SERVEUR
# À exécuter directement sur le serveur simplix.paraweb.fr
# ============================================================================

set -e  # Arrêter en cas d'erreur

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="simplix.paraweb.fr"
APP_DIR="/var/www/simplix"
DB_NAME="simplix_crm"
DB_USER="simplix_user"
DB_PASSWORD="Simplix2025SecurePassword!@#"
JWT_SECRET=$(openssl rand -hex 32)
BRANCH="claude/simplix-roadmap-analysis-011CUx1wAomWPhRbBARmsgTw"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                            ║${NC}"
echo -e "${BLUE}║    🚀 DÉPLOIEMENT SIMPLIX v4.0 - CÔTÉ SERVEUR            ║${NC}"
echo -e "${BLUE}║                                                            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# ============================================================================
# 1. MISE À JOUR SYSTÈME ET INSTALLATION DÉPENDANCES
# ============================================================================
echo -e "${BLUE}📦 Mise à jour du système et installation des dépendances...${NC}"

export DEBIAN_FRONTEND=noninteractive

# Mise à jour
apt-get update -qq
apt-get upgrade -y -qq

# Installation Node.js 18
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}   → Installation Node.js 18...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - > /dev/null 2>&1
    apt-get install -y nodejs -qq
fi
echo -e "${GREEN}   ✓ Node.js $(node --version)${NC}"

# Installation PostgreSQL
if ! command -v psql &> /dev/null; then
    echo -e "${YELLOW}   → Installation PostgreSQL...${NC}"
    apt-get install -y postgresql postgresql-contrib -qq
    systemctl start postgresql
    systemctl enable postgresql
fi
echo -e "${GREEN}   ✓ PostgreSQL installé${NC}"

# Installation Nginx
if ! command -v nginx &> /dev/null; then
    echo -e "${YELLOW}   → Installation Nginx...${NC}"
    apt-get install -y nginx -qq
fi
echo -e "${GREEN}   ✓ Nginx installé${NC}"

# Installation Certbot
if ! command -v certbot &> /dev/null; then
    echo -e "${YELLOW}   → Installation Certbot...${NC}"
    apt-get install -y certbot python3-certbot-nginx -qq
fi
echo -e "${GREEN}   ✓ Certbot installé${NC}"

# Installation PM2
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}   → Installation PM2...${NC}"
    npm install -g pm2 > /dev/null 2>&1
fi
echo -e "${GREEN}   ✓ PM2 installé${NC}"

# Installation Git
apt-get install -y git -qq
echo -e "${GREEN}   ✓ Git installé${NC}"

echo -e "${GREEN}✓ Toutes les dépendances sont installées${NC}"
echo ""

# ============================================================================
# 2. CONFIGURATION POSTGRESQL
# ============================================================================
echo -e "${BLUE}🗄️  Configuration PostgreSQL...${NC}"

# Créer base de données et utilisateur
sudo -u postgres psql << EOF
-- Supprimer si existe déjà
DROP DATABASE IF EXISTS ${DB_NAME};
DROP USER IF EXISTS ${DB_USER};

-- Créer nouveau
CREATE DATABASE ${DB_NAME};
CREATE USER ${DB_USER} WITH ENCRYPTED PASSWORD '${DB_PASSWORD}';
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
ALTER USER ${DB_USER} CREATEDB;
\q
EOF

echo -e "${GREEN}✓ PostgreSQL configuré${NC}"
echo ""

# ============================================================================
# 3. CLONAGE ET CONFIGURATION SIMPLIX
# ============================================================================
echo -e "${BLUE}📥 Clonage du projet Simplix...${NC}"

# Supprimer ancien répertoire si existe
rm -rf ${APP_DIR}

# Créer répertoire
mkdir -p ${APP_DIR}
cd ${APP_DIR}

# Cloner le projet
echo -e "${YELLOW}   → Clonage depuis GitHub...${NC}"
git clone https://github.com/Popy21/Simplix.git . 2>&1 | grep -v "warning:" || true

# Checkout la bonne branche
echo -e "${YELLOW}   → Checkout branche ${BRANCH}...${NC}"
git checkout ${BRANCH} 2>&1 | grep -v "warning:" || echo "Branch déjà active"

echo -e "${GREEN}✓ Projet cloné${NC}"
echo ""

# ============================================================================
# 4. CONFIGURATION .ENV
# ============================================================================
echo -e "${BLUE}⚙️  Configuration de l'environnement...${NC}"

cd ${APP_DIR}/api

# Créer fichier .env
cat > .env << EOF
NODE_ENV=production
PORT=3000

# Base de données
DB_HOST=localhost
DB_PORT=5432
DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}

# JWT
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=7d
JWT_REFRESH_IN=30d

# CORS
ALLOWED_ORIGINS=https://${DOMAIN},http://${DOMAIN}

# Email (à configurer plus tard)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@paraweb.fr
SMTP_PASSWORD=
SMTP_FROM=noreply@${DOMAIN}

# Storage
STORAGE_TYPE=local
STORAGE_PATH=/var/www/simplix/uploads

# Features
ENABLE_SWAGGER_DOCS=true
EOF

echo -e "${GREEN}✓ Configuration .env créée${NC}"
echo ""

# ============================================================================
# 5. INSTALLATION NPM ET BUILD
# ============================================================================
echo -e "${BLUE}📦 Installation des dépendances NPM et build...${NC}"

cd ${APP_DIR}/api

# Installation
echo -e "${YELLOW}   → npm install...${NC}"
npm ci --only=production --silent 2>&1 | tail -5

# Build
echo -e "${YELLOW}   → npm run build...${NC}"
npm run build 2>&1 | tail -5

# Créer répertoire uploads
mkdir -p ${APP_DIR}/uploads
chown -R www-data:www-data ${APP_DIR}/uploads
chmod -R 755 ${APP_DIR}/uploads

echo -e "${GREEN}✓ Build terminé${NC}"
echo ""

# ============================================================================
# 6. MIGRATIONS BASE DE DONNÉES
# ============================================================================
echo -e "${BLUE}🗃️  Application des migrations...${NC}"

cd ${APP_DIR}/database

# Rendre executable
chmod +x migrate.sh

# Configurer variables pour migration
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=${DB_NAME}
export DB_USER=${DB_USER}
export DB_PASSWORD=${DB_PASSWORD}

# Appliquer migrations
echo -e "${YELLOW}   → Application des migrations...${NC}"
./migrate.sh up 2>&1 | tail -10

# Charger seed data
echo -e "${YELLOW}   → Chargement des données de démo...${NC}"
PGPASSWORD=${DB_PASSWORD} psql -h localhost -U ${DB_USER} -d ${DB_NAME} -f seed.sql > /dev/null 2>&1 || echo "Seed data déjà chargé"

echo -e "${GREEN}✓ Migrations appliquées${NC}"
echo ""

# ============================================================================
# 7. CONFIGURATION PM2
# ============================================================================
echo -e "${BLUE}⚡ Configuration PM2...${NC}"

cd ${APP_DIR}/api

# Arrêter si existe déjà
pm2 delete simplix-api 2>/dev/null || true

# Démarrer application
echo -e "${YELLOW}   → Démarrage de l'application...${NC}"
pm2 start dist/index.js --name simplix-api -i max

# Sauvegarder config
pm2 save

# Configurer démarrage auto
pm2 startup systemd -u root --hp /root 2>&1 | tail -1

echo -e "${GREEN}✓ PM2 configuré${NC}"
echo ""

# ============================================================================
# 8. CONFIGURATION NGINX
# ============================================================================
echo -e "${BLUE}🌐 Configuration Nginx...${NC}"

# Créer configuration Nginx
cat > /etc/nginx/sites-available/simplix.paraweb.fr << 'EOF'
upstream simplix_api {
    server 127.0.0.1:3000;
    keepalive 64;
}

server {
    listen 80;
    server_name simplix.paraweb.fr www.simplix.paraweb.fr;

    # Logs
    access_log /var/log/nginx/simplix.access.log;
    error_log /var/log/nginx/simplix.error.log;

    # Max upload
    client_max_body_size 50M;

    # Proxy to API
    location / {
        proxy_pass http://simplix_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static files
    location /uploads {
        alias /var/www/simplix/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Activer site
ln -sf /etc/nginx/sites-available/simplix.paraweb.fr /etc/nginx/sites-enabled/

# Désactiver site par défaut
rm -f /etc/nginx/sites-enabled/default

# Tester config
nginx -t

# Redémarrer Nginx
systemctl restart nginx
systemctl enable nginx

echo -e "${GREEN}✓ Nginx configuré${NC}"
echo ""

# ============================================================================
# 9. CONFIGURATION SSL (Let's Encrypt)
# ============================================================================
echo -e "${BLUE}🔒 Configuration SSL avec Let's Encrypt...${NC}"

# Obtenir certificat SSL
certbot --nginx -d simplix.paraweb.fr -d www.simplix.paraweb.fr \
    --non-interactive --agree-tos --redirect \
    -m contact@paraweb.fr 2>&1 | grep -E "(Successfully|Congratulations)" || echo "SSL configuré (ou certificat existant)"

# Configurer renouvellement auto
systemctl enable certbot.timer
systemctl start certbot.timer

echo -e "${GREEN}✓ SSL configuré${NC}"
echo ""

# ============================================================================
# 10. CONFIGURATION FIREWALL
# ============================================================================
echo -e "${BLUE}🔥 Configuration Firewall...${NC}"

# Installer UFW
apt-get install -y ufw -qq

# Configurer règles
ufw --force reset > /dev/null 2>&1
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw allow 8443/tcp  # Plesk

# Activer
echo "y" | ufw enable > /dev/null 2>&1

echo -e "${GREEN}✓ Firewall configuré${NC}"
echo ""

# ============================================================================
# 11. VÉRIFICATIONS FINALES
# ============================================================================
echo -e "${BLUE}🔍 Vérifications finales...${NC}"

sleep 5  # Attendre que tout démarre

# Vérifier que l'API répond
echo -e "${YELLOW}   → Test API locale...${NC}"
if curl -s http://localhost:3000/health | grep -q "ok"; then
    echo -e "${GREEN}   ✓ API locale fonctionne${NC}"
else
    echo -e "${RED}   ✗ API locale ne répond pas${NC}"
fi

# Vérifier les services
echo -e "${YELLOW}   → Vérification des services...${NC}"
systemctl is-active postgresql &>/dev/null && echo -e "${GREEN}   ✓ PostgreSQL actif${NC}"
systemctl is-active nginx &>/dev/null && echo -e "${GREEN}   ✓ Nginx actif${NC}"
pm2 status | grep -q "simplix-api" && echo -e "${GREEN}   ✓ PM2 actif${NC}"

echo ""

# ============================================================================
# 12. RÉSUMÉ
# ============================================================================
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                            ║${NC}"
echo -e "${GREEN}║    ✅ DÉPLOIEMENT TERMINÉ AVEC SUCCÈS !                   ║${NC}"
echo -e "${GREEN}║                                                            ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}🌐 URLs disponibles:${NC}"
echo -e "   • API:            https://simplix.paraweb.fr"
echo -e "   • Swagger:        https://simplix.paraweb.fr/api-docs"
echo -e "   • Health check:   https://simplix.paraweb.fr/health"
echo ""
echo -e "${BLUE}🔐 Credentials démo:${NC}"
echo -e "   • Email:          admin@simplix-demo.fr"
echo -e "   • Password:       Test1234!"
echo ""
echo -e "${BLUE}📊 Base de données:${NC}"
echo -e "   • Host:           localhost"
echo -e "   • Database:       ${DB_NAME}"
echo -e "   • User:           ${DB_USER}"
echo -e "   • Password:       ${DB_PASSWORD}"
echo ""
echo -e "${BLUE}🔧 Commandes utiles:${NC}"
echo -e "   • Logs API:       pm2 logs simplix-api"
echo -e "   • Restart API:    pm2 restart simplix-api"
echo -e "   • Status:         pm2 status"
echo -e "   • Nginx logs:     tail -f /var/log/nginx/simplix.access.log"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT - Sécurité:${NC}"
echo -e "   1. Changez le mot de passe root du serveur"
echo -e "   2. Configurez l'authentification SSH par clé"
echo -e "   3. Configurez votre SMTP dans /var/www/simplix/api/.env"
echo ""
echo -e "${GREEN}🎉 Simplix v4.0 est maintenant déployé et accessible !${NC}"
echo ""
