#!/bin/bash

# Fix deployment issues and continue

set -e

SERVER_IP="82.165.134.105"
SERVER_USER="root"
SERVER_PASS='HkVB9iuftdyè(4442212l???'
DOMAIN="simplix.paraweb.fr"
APP_DIR="/var/www/simplix"
REPO_URL="https://github.com/Popy21/Simplix.git"
BRANCH="main"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

remote_exec() {
    sshpass -p "$SERVER_PASS" ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "$1"
}

remote_copy() {
    sshpass -p "$SERVER_PASS" scp -o StrictHostKeyChecking=no -r "$1" $SERVER_USER@$SERVER_IP:"$2"
}

echo -e "${YELLOW}🔧 Fix Git permissions et finalisation du déploiement...${NC}"

# Fix Git ownership
remote_exec "git config --global --add safe.directory $APP_DIR"

# Pull latest code
echo -e "${YELLOW}📥 Mise à jour du code...${NC}"
remote_exec "
    cd $APP_DIR
    git fetch --all
    git reset --hard origin/$BRANCH
    git clean -fd
"

# Copy environment file
echo -e "${YELLOW}⚙️  Configuration .env...${NC}"
remote_copy ".env.production" "$APP_DIR/api/.env"
remote_copy "ecosystem.config.js" "$APP_DIR/"

# Fix permissions
remote_exec "
    chown -R www-data:www-data $APP_DIR
    chmod -R 755 $APP_DIR
    mkdir -p $APP_DIR/uploads
    chown -R www-data:www-data $APP_DIR/uploads
    mkdir -p /var/log/simplix
    chown -R www-data:www-data /var/log/simplix
"

# Install and build
echo -e "${YELLOW}📦 Installation des dépendances...${NC}"
remote_exec "
    cd $APP_DIR/api
    npm install --production
    npm run build
"

# Start with PM2
echo -e "${YELLOW}🚀 Démarrage PM2...${NC}"
remote_exec "
    pm2 delete simplix-api 2>/dev/null || true
    cd $APP_DIR
    pm2 start ecosystem.config.js
    pm2 save
    pm2 startup systemd -u root --hp /root
"

# Configure Nginx
echo -e "${YELLOW}🌐 Configuration Nginx...${NC}"
remote_copy "nginx-simplix.conf" "/etc/nginx/sites-available/simplix"
remote_exec "
    ln -sf /etc/nginx/sites-available/simplix /etc/nginx/sites-enabled/simplix
    rm -f /etc/nginx/sites-enabled/default
    nginx -t && nginx -s reload
"

# Get SSL
echo -e "${YELLOW}🔒 Configuration SSL...${NC}"
remote_exec "
    certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN --redirect 2>&1 || true
    nginx -s reload
"

echo -e "${GREEN}✅ Déploiement terminé!${NC}"
echo ""
echo -e "${GREEN}🌐 Votre application: https://$DOMAIN${NC}"
echo -e "${GREEN}👤 Admin: admin@simplix.fr / admin123${NC}"
echo ""
echo "📊 Test rapide:"
echo "  curl https://$DOMAIN/"
echo ""
echo "📋 Logs PM2:"
echo "  ssh root@$SERVER_IP 'pm2 logs simplix-api'"
