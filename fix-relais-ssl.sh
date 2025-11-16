#!/bin/bash

# Fix SSL certificate for relais.paraweb.fr
# Adds Let's Encrypt challenge support and obtains SSL certificate

set -e

SERVER_IP="82.165.134.105"
SERVER_USER="root"
SERVER_PASS='HkVB9iuftdyè(4442212l???'
DOMAIN="relais.paraweb.fr"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

remote_exec() {
    sshpass -p "$SERVER_PASS" ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "$1"
}

echo -e "${YELLOW}🔒 Fixing SSL certificate for ${DOMAIN}...${NC}"

# Step 1: Update nginx config to allow Let's Encrypt challenges
echo -e "${YELLOW}📝 Updating nginx configuration...${NC}"
remote_exec "cat > /etc/nginx/sites-available/relais-drive << 'NGINX_EOF'
server {
    listen 80;
    server_name ${DOMAIN};

    # Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root /var/www/relais-drive/frontend/dist;
        try_files \\\$uri =404;
    }

    # Frontend
    location / {
        root /var/www/relais-drive/frontend/dist;
        try_files \\\$uri \\\$uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:5004/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\\$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \\\$host;
        proxy_cache_bypass \\\$http_upgrade;
        proxy_set_header X-Real-IP \\\$remote_addr;
        proxy_set_header X-Forwarded-For \\\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\\$scheme;
        client_max_body_size 500M;
    }

    # Socket.IO
    location /socket.io/ {
        proxy_pass http://localhost:5004;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\\$http_upgrade;
        proxy_set_header Connection \"upgrade\";
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }
}
NGINX_EOF
"

# Step 2: Create .well-known directory
echo -e "${YELLOW}📁 Creating .well-known directory...${NC}"
remote_exec "
    mkdir -p /var/www/relais-drive/frontend/dist/.well-known/acme-challenge
    chown -R www-data:www-data /var/www/relais-drive/frontend/dist/.well-known
    chmod -R 755 /var/www/relais-drive/frontend/dist/.well-known
"

# Step 3: Test and reload nginx
echo -e "${YELLOW}🔄 Testing and reloading nginx...${NC}"
remote_exec "nginx -t && nginx -s reload"

# Step 4: Test the challenge directory is accessible
echo -e "${YELLOW}🧪 Testing challenge directory access...${NC}"
remote_exec "
    echo 'test' > /var/www/relais-drive/frontend/dist/.well-known/acme-challenge/test.txt
    curl -s http://${DOMAIN}/.well-known/acme-challenge/test.txt || echo 'Warning: Could not access test file'
    rm -f /var/www/relais-drive/frontend/dist/.well-known/acme-challenge/test.txt
"

# Step 5: Obtain SSL certificate with certbot
echo -e "${YELLOW}🔐 Obtaining SSL certificate...${NC}"
remote_exec "
    certbot --nginx -d ${DOMAIN} \
        --non-interactive \
        --agree-tos \
        --email adelb13000@gmail.com \
        --redirect \
        --keep-until-expiring
"

# Step 6: Reload nginx with new SSL config
echo -e "${YELLOW}🔄 Reloading nginx with SSL...${NC}"
remote_exec "nginx -s reload"

echo -e "${GREEN}✅ SSL certificate installed successfully!${NC}"
echo ""
echo -e "${GREEN}🌐 Your site is now accessible at: https://${DOMAIN}${NC}"
echo ""
echo -e "${YELLOW}🧪 Testing HTTPS access...${NC}"
curl -I "https://${DOMAIN}" 2>&1 | grep -E "HTTP|Server" || echo "Check manually"
