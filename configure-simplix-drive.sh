#!/bin/bash

# ============================================================================
# SIMPLIX - CONFIGURATION POUR simplix.drive.paraweb.fr
# ============================================================================

set -e

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║    🔧 CONFIGURATION SIMPLIX - simplix.drive.paraweb.fr   ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Variables
DOMAIN="simplix.drive.paraweb.fr"
DB_NAME="simplix_crm"
DB_USER="simplix_user"
DB_PASSWORD="Simplix2025SecurePassword!@#"
APP_DIR="/var/www/simplix"

# ============================================================================
# 1. CORRECTION PERMISSIONS POSTGRESQL
# ============================================================================
echo -e "${BLUE}🔧 Correction des permissions PostgreSQL...${NC}"

sudo -u postgres psql -d ${DB_NAME} << 'EOF'
-- Donner tous les droits sur le schéma public
GRANT ALL ON SCHEMA public TO simplix_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO simplix_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO simplix_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO simplix_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO simplix_user;

-- Rendre simplix_user propriétaire du schéma
ALTER SCHEMA public OWNER TO simplix_user;
\q
EOF

echo -e "${GREEN}✓ Permissions PostgreSQL corrigées${NC}"
echo ""

# ============================================================================
# 2. APPLICATION DES MIGRATIONS
# ============================================================================
echo -e "${BLUE}🗃️  Application des migrations SQL...${NC}"

cd ${APP_DIR}/database

# Configurer variables
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=${DB_NAME}
export DB_USER=${DB_USER}
export DB_PASSWORD=${DB_PASSWORD}

# Rendre executable
chmod +x migrate.sh

# Appliquer migrations
echo -e "${YELLOW}   → Application des migrations...${NC}"
./migrate.sh up 2>&1 | tail -30

echo -e "${GREEN}✓ Migrations appliquées${NC}"
echo ""

# ============================================================================
# 3. CHARGEMENT DES DONNÉES DE DÉMO
# ============================================================================
echo -e "${BLUE}📊 Chargement des données de démo...${NC}"

PGPASSWORD=${DB_PASSWORD} psql -h localhost -U ${DB_USER} -d ${DB_NAME} -f seed.sql 2>&1 | tail -20

echo -e "${GREEN}✓ Données de démo chargées${NC}"
echo ""

# ============================================================================
# 4. MISE À JOUR CONFIGURATION .ENV
# ============================================================================
echo -e "${BLUE}⚙️  Mise à jour configuration .env...${NC}"

cd ${APP_DIR}/api

# Mettre à jour les CORS
sed -i "s|ALLOWED_ORIGINS=.*|ALLOWED_ORIGINS=https://${DOMAIN},http://${DOMAIN}|" .env

echo -e "${GREEN}✓ Configuration .env mise à jour${NC}"
echo ""

# ============================================================================
# 5. MISE À JOUR NGINX
# ============================================================================
echo -e "${BLUE}🌐 Configuration Nginx pour ${DOMAIN}...${NC}"

# Créer nouvelle configuration Nginx
cat > /etc/nginx/sites-available/${DOMAIN} << 'NGINXCONF'
upstream simplix_api {
    server 127.0.0.1:3000;
    keepalive 64;
}

server {
    listen 80;
    server_name simplix.drive.paraweb.fr www.simplix.drive.paraweb.fr;

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
NGINXCONF

# Supprimer ancien lien symbolique si existe
rm -f /etc/nginx/sites-enabled/simplix.paraweb.fr

# Activer nouveau site
ln -sf /etc/nginx/sites-available/${DOMAIN} /etc/nginx/sites-enabled/

# Tester config
nginx -t

# Redémarrer Nginx
systemctl restart nginx

echo -e "${GREEN}✓ Nginx configuré pour ${DOMAIN}${NC}"
echo ""

# ============================================================================
# 6. REDÉMARRAGE APPLICATION
# ============================================================================
echo -e "${BLUE}🔄 Redémarrage de l'application...${NC}"

cd ${APP_DIR}/api

# Redémarrer PM2
pm2 restart simplix-api
sleep 3

echo -e "${GREEN}✓ Application redémarrée${NC}"
echo ""

# ============================================================================
# 7. TESTS
# ============================================================================
echo -e "${BLUE}🧪 Tests de l'application...${NC}"
echo ""

# Test API locale
echo -e "${YELLOW}   → Test API locale (localhost:3000)...${NC}"
if curl -s http://localhost:3000/health | grep -q "ok"; then
    echo -e "${GREEN}   ✓ API locale fonctionne${NC}"
    curl -s http://localhost:3000/health | python3 -m json.tool 2>/dev/null || curl -s http://localhost:3000/health
else
    echo -e "${RED}   ✗ API locale ne répond pas${NC}"
    echo -e "${YELLOW}   Logs PM2:${NC}"
    pm2 logs simplix-api --lines 20 --nostream
fi
echo ""

# Test via Nginx (localhost)
echo -e "${YELLOW}   → Test via Nginx (localhost:80)...${NC}"
if curl -s http://localhost/health | grep -q "ok"; then
    echo -e "${GREEN}   ✓ Nginx fonctionne${NC}"
else
    echo -e "${RED}   ✗ Nginx ne répond pas${NC}"
fi
echo ""

# Test par IP
SERVER_IP=$(curl -s ifconfig.me)
echo -e "${YELLOW}   → Test par IP (${SERVER_IP})...${NC}"
if curl -s http://${SERVER_IP}/health | grep -q "ok"; then
    echo -e "${GREEN}   ✓ Accès par IP fonctionne${NC}"
else
    echo -e "${YELLOW}   ⚠ Accès par IP peut nécessiter configuration Plesk${NC}"
fi
echo ""

# Test DNS
echo -e "${YELLOW}   → Vérification DNS pour ${DOMAIN}...${NC}"
if host ${DOMAIN} > /dev/null 2>&1; then
    DNS_IP=$(host ${DOMAIN} | grep "has address" | awk '{print $4}' | head -1)
    echo -e "${GREEN}   ✓ DNS résout vers: ${DNS_IP}${NC}"

    if [ "$DNS_IP" = "$SERVER_IP" ]; then
        echo -e "${GREEN}   ✓ DNS pointe vers ce serveur !${NC}"
        echo ""
        echo -e "${BLUE}📝 Le DNS est propagé ! Obtention du certificat SSL...${NC}"

        # Obtenir certificat SSL
        certbot --nginx -d ${DOMAIN} -d www.${DOMAIN} \
            --non-interactive --agree-tos --redirect \
            -m contact@paraweb.fr 2>&1 | grep -E "(Successfully|Congratulations|Certificate.*successfully)" || echo "Certificat en cours d'obtention..."

        echo ""
        echo -e "${GREEN}✓ SSL configuré !${NC}"
        echo ""

        # Test HTTPS
        echo -e "${YELLOW}   → Test HTTPS...${NC}"
        sleep 2
        if curl -s https://${DOMAIN}/health | grep -q "ok"; then
            echo -e "${GREEN}   ✓ HTTPS fonctionne !${NC}"
        fi
    else
        echo -e "${YELLOW}   ⚠ DNS pointe vers ${DNS_IP} au lieu de ${SERVER_IP}${NC}"
    fi
else
    echo -e "${YELLOW}   ⏳ DNS pas encore propagé (normal, patience 5-30 min)${NC}"
fi
echo ""

# ============================================================================
# 8. RÉSUMÉ
# ============================================================================
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║    ✅ CONFIGURATION TERMINÉE                              ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${BLUE}📊 État de l'application:${NC}"
echo ""
pm2 status
echo ""

echo -e "${BLUE}🌐 URLs d'accès:${NC}"
echo ""
echo -e "${YELLOW}Accès par IP (disponible immédiatement):${NC}"
echo -e "   • http://${SERVER_IP}/health"
echo -e "   • http://${SERVER_IP}/api-docs"
echo ""
echo -e "${YELLOW}Accès par domaine (une fois DNS propagé):${NC}"
echo -e "   • https://${DOMAIN}"
echo -e "   • https://${DOMAIN}/api-docs"
echo -e "   • https://${DOMAIN}/health"
echo ""

echo -e "${BLUE}🔐 Credentials de test:${NC}"
echo -e "   • Email:     admin@simplix-demo.fr"
echo -e "   • Password:  Test1234!"
echo ""

echo -e "${BLUE}🔧 Commandes utiles:${NC}"
echo -e "   • Logs:      pm2 logs simplix-api"
echo -e "   • Restart:   pm2 restart simplix-api"
echo -e "   • Status:    pm2 status"
echo ""

if host ${DOMAIN} > /dev/null 2>&1 && curl -s https://${DOMAIN}/health | grep -q "ok"; then
    echo -e "${GREEN}🎉 SIMPLIX EST EN LIGNE !${NC}"
    echo ""
    echo -e "Testez: ${BLUE}https://${DOMAIN}/api-docs${NC}"
else
    echo -e "${YELLOW}⏳ En attente de la propagation DNS...${NC}"
    echo ""
    echo -e "Le DNS Plesk est configuré. La propagation peut prendre 5-30 minutes."
    echo ""
    echo -e "Pour vérifier la propagation:"
    echo -e "   ${BLUE}watch -n 30 'host ${DOMAIN}'${NC}"
    echo ""
    echo -e "Une fois propagé, le certificat SSL sera automatiquement obtenu."
    echo -e "Ou exécutez manuellement:"
    echo -e "   ${BLUE}certbot --nginx -d ${DOMAIN} -d www.${DOMAIN} -m contact@paraweb.fr --agree-tos --non-interactive --redirect${NC}"
    echo ""
    echo -e "En attendant, testez par IP: ${BLUE}http://${SERVER_IP}/api-docs${NC}"
fi
echo ""
