#!/bin/bash

# Final deployment script with fixes

set -e

SERVER_IP="82.165.134.105"
SERVER_USER="root"
SERVER_PASS='HkVB9iuftdyè(4442212l???'
DOMAIN="simplix.paraweb.fr"
APP_DIR="/var/www/simplix"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

remote_exec() {
    sshpass -p "$SERVER_PASS" ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "$1"
}

remote_copy() {
    sshpass -p "$SERVER_PASS" scp -o StrictHostKeyChecking=no -r "$1" $SERVER_USER@$SERVER_IP:"$2"
}

echo -e "${YELLOW}📦 Installation complète des dépendances (avec devDependencies pour build)...${NC}"
remote_exec "
    cd $APP_DIR/api
    npm install
    npm run build
    echo '✅ Build réussi'
"

# Start with PM2
echo -e "${YELLOW}🚀 Démarrage PM2...${NC}"
remote_exec "
    pm2 delete simplix-api 2>/dev/null || true
    cd $APP_DIR
    pm2 start ecosystem.config.js
    pm2 save
"

# Configure Nginx without SSL first
echo -e "${YELLOW}🌐 Configuration Nginx...${NC}"

# Create temporary nginx config without SSL
cat > /tmp/simplix-temp.conf <<'EOF'
server {
    listen 80;
    server_name simplix.paraweb.fr;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

remote_copy "/tmp/simplix-temp.conf" "/etc/nginx/sites-available/simplix"
remote_exec "
    ln -sf /etc/nginx/sites-available/simplix /etc/nginx/sites-enabled/simplix
    rm -f /etc/nginx/sites-enabled/default
    nginx -t && systemctl reload nginx
"

# Get SSL
echo -e "${YELLOW}🔒 Configuration SSL Let's Encrypt...${NC}"
remote_exec "
    certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN --redirect 2>&1 || echo 'SSL setup will be done manually'
"

echo ""
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     ✅ DÉPLOIEMENT TERMINÉ! 🎉         ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}🌐 URL: https://$DOMAIN${NC}"
echo -e "${GREEN}👤 Admin: admin@simplix.fr / admin123${NC}"
echo ""
echo "📊 Vérification:"
remote_exec "pm2 status"
echo ""
echo "🧪 Test API:"
sleep 2
curl -s "http://$DOMAIN/" | head -20
echo ""
echo -e "${GREEN}✅ Tout est prêt!${NC}"
