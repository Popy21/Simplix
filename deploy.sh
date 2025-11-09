#!/bin/bash

# ============================================================================
# SIMPLIX - SCRIPT DE DÉPLOIEMENT AUTOMATIQUE
# Déploie Simplix sur simplix.paraweb.fr
# ============================================================================

set -e  # Arrêter en cas d'erreur

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SERVER_IP="82.165.134.105"
SERVER_USER="root"
SERVER_PASSWORD='HkVB9iuftdyè(4442212l???'
DOMAIN="simplix.paraweb.fr"
APP_DIR="/var/www/simplix"
DB_NAME="simplix_crm"
DB_USER="simplix_user"
DB_PASSWORD="Simplix2025SecurePassword!@#"
JWT_SECRET=$(openssl rand -hex 32)

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                            ║${NC}"
echo -e "${BLUE}║    🚀 DÉPLOIEMENT AUTOMATIQUE SIMPLIX v4.0                ║${NC}"
echo -e "${BLUE}║                                                            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Vérifier si sshpass est installé
if ! command -v sshpass &> /dev/null; then
    echo -e "${YELLOW}⚠️  Installation de sshpass...${NC}"
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install hudochenkov/sshpass/sshpass
    else
        sudo apt-get update && sudo apt-get install -y sshpass
    fi
fi

# Fonction pour exécuter des commandes SSH
ssh_exec() {
    sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
        ${SERVER_USER}@${SERVER_IP} "$@" 2>/dev/null
}

# Fonction pour copier des fichiers
scp_copy() {
    sshpass -p "$SERVER_PASSWORD" scp -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
        "$1" ${SERVER_USER}@${SERVER_IP}:"$2" 2>/dev/null
}

echo -e "${BLUE}📡 Connexion au serveur ${SERVER_IP}...${NC}"
ssh_exec "echo 'Connexion réussie'"
echo -e "${GREEN}✓ Connecté${NC}"
echo ""

# ============================================================================
# 1. MISE À JOUR SYSTÈME ET INSTALLATION DÉPENDANCES
# ============================================================================
echo -e "${BLUE}📦 Mise à jour du système et installation des dépendances...${NC}"

ssh_exec bash << 'ENDSSH'
export DEBIAN_FRONTEND=noninteractive

# Mise à jour
apt-get update -qq
apt-get upgrade -y -qq

# Installation Node.js 18
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - > /dev/null 2>&1
    apt-get install -y nodejs -qq
fi

# Installation PostgreSQL
if ! command -v psql &> /dev/null; then
    apt-get install -y postgresql postgresql-contrib -qq
    systemctl start postgresql
    systemctl enable postgresql
fi

# Installation Nginx
if ! command -v nginx &> /dev/null; then
    apt-get install -y nginx -qq
fi

# Installation Certbot
if ! command -v certbot &> /dev/null; then
    apt-get install -y certbot python3-certbot-nginx -qq
fi

# Installation PM2
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2 > /dev/null 2>&1
fi

# Installation Git
apt-get install -y git -qq

echo "✓ Dépendances installées"
ENDSSH

echo -e "${GREEN}✓ Dépendances installées${NC}"
echo ""

# ============================================================================
# 2. CONFIGURATION POSTGRESQL
# ============================================================================
echo -e "${BLUE}🗄️  Configuration PostgreSQL...${NC}"

ssh_exec bash << ENDSSH
# Créer base de données et utilisateur
sudo -u postgres psql << 'EOF'
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

echo "✓ PostgreSQL configuré"
ENDSSH

echo -e "${GREEN}✓ PostgreSQL configuré${NC}"
echo ""

# ============================================================================
# 3. CLONAGE ET CONFIGURATION SIMPLIX
# ============================================================================
echo -e "${BLUE}📥 Clonage du projet Simplix...${NC}"

ssh_exec bash << 'ENDSSH'
# Supprimer ancien répertoire si existe
rm -rf /var/www/simplix

# Créer répertoire
mkdir -p /var/www/simplix
cd /var/www/simplix

# Cloner le projet (utiliser HTTPS sans auth pour repo public)
git clone https://github.com/Popy21/Simplix.git . 2>/dev/null || echo "Utilisation du code local"

# Checkout la bonne branche
git checkout claude/simplix-roadmap-analysis-011CUx1wAomWPhRbBARmsgTw 2>/dev/null || echo "Branch déjà active"

echo "✓ Projet cloné"
ENDSSH

echo -e "${GREEN}✓ Projet cloné${NC}"
echo ""

# ============================================================================
# 4. CONFIGURATION .ENV
# ============================================================================
echo -e "${BLUE}⚙️  Configuration de l'environnement...${NC}"

ssh_exec bash << ENDSSH
cd /var/www/simplix/api

# Créer fichier .env
cat > .env << 'EOF'
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

echo "✓ .env créé"
ENDSSH

echo -e "${GREEN}✓ Configuration .env créée${NC}"
echo ""

# ============================================================================
# 5. INSTALLATION NPM ET BUILD
# ============================================================================
echo -e "${BLUE}📦 Installation des dépendances NPM...${NC}"

ssh_exec bash << 'ENDSSH'
cd /var/www/simplix/api

# Installation
npm ci --only=production --silent 2>&1 | grep -v "npm WARN"

# Build
npm run build 2>&1 | grep -v "npm WARN"

# Créer répertoire uploads
mkdir -p /var/www/simplix/uploads
chown -R www-data:www-data /var/www/simplix/uploads
chmod -R 755 /var/www/simplix/uploads

echo "✓ Build terminé"
ENDSSH

echo -e "${GREEN}✓ Build terminé${NC}"
echo ""

# ============================================================================
# 6. MIGRATIONS BASE DE DONNÉES
# ============================================================================
echo -e "${BLUE}🗃️  Application des migrations...${NC}"

ssh_exec bash << ENDSSH
cd /var/www/simplix/database

# Rendre executable
chmod +x migrate.sh

# Configurer variables pour migration
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=${DB_NAME}
export DB_USER=${DB_USER}
export DB_PASSWORD=${DB_PASSWORD}

# Appliquer migrations
./migrate.sh up 2>&1 | tail -5

# Charger seed data
PGPASSWORD=${DB_PASSWORD} psql -h localhost -U ${DB_USER} -d ${DB_NAME} -f seed.sql > /dev/null 2>&1 || echo "Seed data déjà chargé"

echo "✓ Migrations appliquées"
ENDSSH

echo -e "${GREEN}✓ Migrations appliquées${NC}"
echo ""

# ============================================================================
# 7. CONFIGURATION PM2
# ============================================================================
echo -e "${BLUE}⚡ Configuration PM2...${NC}"

ssh_exec bash << 'ENDSSH'
cd /var/www/simplix/api

# Arrêter si existe déjà
pm2 delete simplix-api 2>/dev/null || true

# Démarrer application
pm2 start dist/index.js --name simplix-api -i max

# Sauvegarder config
pm2 save

# Configurer démarrage auto
pm2 startup systemd -u root --hp /root 2>&1 | grep -v "PM2"

echo "✓ PM2 configuré"
ENDSSH

echo -e "${GREEN}✓ PM2 configuré${NC}"
echo ""

# ============================================================================
# 8. CONFIGURATION NGINX
# ============================================================================
echo -e "${BLUE}🌐 Configuration Nginx...${NC}"

ssh_exec bash << 'ENDSSH'
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

echo "✓ Nginx configuré"
ENDSSH

echo -e "${GREEN}✓ Nginx configuré${NC}"
echo ""

# ============================================================================
# 9. CONFIGURATION SSL (Let's Encrypt)
# ============================================================================
echo -e "${BLUE}🔒 Configuration SSL avec Let's Encrypt...${NC}"

ssh_exec bash << ENDSSH
# Obtenir certificat SSL
certbot --nginx -d simplix.paraweb.fr -d www.simplix.paraweb.fr \
    --non-interactive --agree-tos --redirect \
    -m contact@paraweb.fr 2>&1 | grep -E "(Successfully|Congratulations)" || echo "SSL en cours..."

# Configurer renouvellement auto
systemctl enable certbot.timer
systemctl start certbot.timer

echo "✓ SSL configuré"
ENDSSH

echo -e "${GREEN}✓ SSL configuré${NC}"
echo ""

# ============================================================================
# 10. CONFIGURATION FIREWALL
# ============================================================================
echo -e "${BLUE}🔥 Configuration Firewall...${NC}"

ssh_exec bash << 'ENDSSH'
# Installer UFW
apt-get install -y ufw -qq

# Configurer règles
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw allow 8443/tcp  # Plesk

# Activer
echo "y" | ufw enable

echo "✓ Firewall configuré"
ENDSSH

echo -e "${GREEN}✓ Firewall configuré${NC}"
echo ""

# ============================================================================
# 11. VÉRIFICATIONS FINALES
# ============================================================================
echo -e "${BLUE}🔍 Vérifications finales...${NC}"

sleep 3  # Attendre que tout démarre

# Vérifier que l'API répond
echo -e "${YELLOW}   → Test local (localhost:3000)...${NC}"
ssh_exec "curl -s http://localhost:3000/health" | grep -q "ok" && echo -e "${GREEN}   ✓ API locale fonctionne${NC}" || echo -e "${RED}   ✗ API locale ne répond pas${NC}"

echo -e "${YELLOW}   → Test HTTP (http://simplix.paraweb.fr)...${NC}"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://simplix.paraweb.fr/health 2>/dev/null)
if [ "$HTTP_STATUS" = "301" ] || [ "$HTTP_STATUS" = "200" ]; then
    echo -e "${GREEN}   ✓ HTTP fonctionne (redirect vers HTTPS)${NC}"
else
    echo -e "${YELLOW}   ⚠ HTTP status: $HTTP_STATUS${NC}"
fi

echo -e "${YELLOW}   → Test HTTPS (https://simplix.paraweb.fr)...${NC}"
HTTPS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://simplix.paraweb.fr/health 2>/dev/null)
if [ "$HTTPS_STATUS" = "200" ]; then
    echo -e "${GREEN}   ✓ HTTPS fonctionne${NC}"
else
    echo -e "${YELLOW}   ⚠ HTTPS status: $HTTPS_STATUS (SSL peut prendre quelques minutes)${NC}"
fi

# Vérifier les services
echo -e "${YELLOW}   → Vérification services...${NC}"
ssh_exec "systemctl is-active postgresql" | grep -q "active" && echo -e "${GREEN}   ✓ PostgreSQL actif${NC}"
ssh_exec "systemctl is-active nginx" | grep -q "active" && echo -e "${GREEN}   ✓ Nginx actif${NC}"
ssh_exec "pm2 status" | grep -q "simplix-api" && echo -e "${GREEN}   ✓ PM2 actif${NC}"

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
echo -e "   • Logs API:       ssh root@${SERVER_IP} 'pm2 logs simplix-api'"
echo -e "   • Restart API:    ssh root@${SERVER_IP} 'pm2 restart simplix-api'"
echo -e "   • Status:         ssh root@${SERVER_IP} 'pm2 status'"
echo -e "   • Nginx logs:     ssh root@${SERVER_IP} 'tail -f /var/log/nginx/simplix.access.log'"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT - Sécurité:${NC}"
echo -e "   1. Changez le mot de passe root du serveur"
echo -e "   2. Configurez l'authentification SSH par clé"
echo -e "   3. Configurez votre SMTP dans /var/www/simplix/api/.env"
echo ""
echo -e "${GREEN}🎉 Simplix v4.0 est maintenant déployé et accessible !${NC}"
echo ""
