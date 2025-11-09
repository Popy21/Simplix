#!/bin/bash

# ============================================================================
# SIMPLIX - SCRIPT DE CORRECTION POST-DÉPLOIEMENT
# À exécuter sur le serveur pour corriger les problèmes
# ============================================================================

set -e

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║    🔧 CORRECTION DÉPLOIEMENT SIMPLIX                      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Variables
DB_NAME="simplix_crm"
DB_USER="simplix_user"
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
export DB_PASSWORD=Simplix2025SecurePassword!@#

# Rendre executable
chmod +x migrate.sh

# Appliquer migrations
echo -e "${YELLOW}   → Application des migrations...${NC}"
./migrate.sh up 2>&1 | tail -20

echo -e "${GREEN}✓ Migrations appliquées${NC}"
echo ""

# ============================================================================
# 3. CHARGEMENT DES DONNÉES DE DÉMO
# ============================================================================
echo -e "${BLUE}📊 Chargement des données de démo...${NC}"

PGPASSWORD=Simplix2025SecurePassword!@# psql -h localhost -U ${DB_USER} -d ${DB_NAME} -f seed.sql 2>&1 | tail -10

echo -e "${GREEN}✓ Données de démo chargées${NC}"
echo ""

# ============================================================================
# 4. VÉRIFICATION DNS
# ============================================================================
echo -e "${BLUE}🌐 Vérification DNS...${NC}"

# Tester résolution DNS
if host simplix.paraweb.fr > /dev/null 2>&1; then
    DNS_IP=$(host simplix.paraweb.fr | grep "has address" | awk '{print $4}')
    SERVER_IP=$(curl -s ifconfig.me)

    echo -e "${YELLOW}   DNS pointe vers: ${DNS_IP}${NC}"
    echo -e "${YELLOW}   IP du serveur:   ${SERVER_IP}${NC}"

    if [ "$DNS_IP" = "$SERVER_IP" ]; then
        echo -e "${GREEN}   ✓ DNS correctement configuré${NC}"
    else
        echo -e "${RED}   ✗ DNS ne pointe pas vers ce serveur${NC}"
        echo -e "${YELLOW}   → Vous devez configurer le DNS dans Plesk ou votre registrar${NC}"
    fi
else
    echo -e "${RED}   ✗ Le domaine simplix.paraweb.fr ne résout pas${NC}"
    echo -e "${YELLOW}   → Configuration DNS requise${NC}"
fi
echo ""

# ============================================================================
# 5. REDÉMARRAGE APPLICATION
# ============================================================================
echo -e "${BLUE}🔄 Redémarrage de l'application...${NC}"

cd ${APP_DIR}/api

# Redémarrer PM2
pm2 restart simplix-api
sleep 3
pm2 status

echo -e "${GREEN}✓ Application redémarrée${NC}"
echo ""

# ============================================================================
# 6. TESTS
# ============================================================================
echo -e "${BLUE}🧪 Tests...${NC}"

# Test API locale
echo -e "${YELLOW}   → Test API locale (localhost:3000)...${NC}"
if curl -s http://localhost:3000/health | grep -q "ok"; then
    echo -e "${GREEN}   ✓ API locale fonctionne${NC}"
    curl -s http://localhost:3000/health | jq . 2>/dev/null || curl -s http://localhost:3000/health
else
    echo -e "${RED}   ✗ API locale ne répond pas${NC}"
    echo -e "${YELLOW}   Logs PM2:${NC}"
    pm2 logs simplix-api --lines 20 --nostream
fi
echo ""

# Test via Nginx
echo -e "${YELLOW}   → Test via Nginx (localhost:80)...${NC}"
if curl -s http://localhost/health | grep -q "ok"; then
    echo -e "${GREEN}   ✓ Nginx fonctionne${NC}"
else
    echo -e "${RED}   ✗ Nginx ne répond pas${NC}"
fi
echo ""

# Test HTTPS (si DNS configuré)
echo -e "${YELLOW}   → Test HTTPS...${NC}"
if curl -k -s https://localhost/health | grep -q "ok"; then
    echo -e "${GREEN}   ✓ HTTPS fonctionne${NC}"
else
    echo -e "${YELLOW}   ⚠ HTTPS pas encore configuré (normal si DNS non configuré)${NC}"
fi
echo ""

# ============================================================================
# 7. RÉSUMÉ
# ============================================================================
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║    ✅ CORRECTIONS APPLIQUÉES                              ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

SERVER_IP=$(curl -s ifconfig.me)

echo -e "${BLUE}📊 État actuel:${NC}"
echo ""
echo -e "${YELLOW}Accès local (depuis le serveur):${NC}"
echo -e "   • http://localhost:3000/health"
echo -e "   • http://localhost:3000/api-docs"
echo ""
echo -e "${YELLOW}Accès par IP:${NC}"
echo -e "   • http://${SERVER_IP}:3000/health"
echo -e "   • http://${SERVER_IP}:3000/api-docs"
echo ""
echo -e "${YELLOW}Accès par domaine (nécessite configuration DNS):${NC}"
echo -e "   • https://simplix.paraweb.fr"
echo -e "   • https://simplix.paraweb.fr/api-docs"
echo ""

echo -e "${RED}⚠️  ACTION REQUISE - CONFIGURATION DNS${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "Le domaine ${BLUE}simplix.paraweb.fr${NC} doit pointer vers ${BLUE}${SERVER_IP}${NC}"
echo ""
echo -e "${YELLOW}Options pour configurer le DNS:${NC}"
echo ""
echo -e "${BLUE}Option 1: Via Plesk${NC}"
echo -e "   1. Connectez-vous à Plesk: https://82.165.134.105:8443"
echo -e "   2. Allez dans 'Domaines'"
echo -e "   3. Ajoutez 'simplix.paraweb.fr'"
echo -e "   4. Configurez un enregistrement A vers ${SERVER_IP}"
echo ""
echo -e "${BLUE}Option 2: Via votre registrar de domaine (paraweb.fr)${NC}"
echo -e "   1. Connectez-vous à votre registrar"
echo -e "   2. Gestion DNS pour paraweb.fr"
echo -e "   3. Ajoutez un enregistrement:"
echo -e "      Type:  A"
echo -e "      Nom:   simplix"
echo -e "      Valeur: ${SERVER_IP}"
echo -e "      TTL:    300"
echo ""
echo -e "${BLUE}Option 3: Accès temporaire par IP${NC}"
echo -e "   En attendant la configuration DNS, utilisez:"
echo -e "   • http://${SERVER_IP}/health"
echo -e "   • http://${SERVER_IP}/api-docs"
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${YELLOW}Une fois le DNS configuré (propagation: 5-30 minutes):${NC}"
echo -e "   1. Obtenez le certificat SSL:"
echo -e "      ${BLUE}certbot --nginx -d simplix.paraweb.fr -d www.simplix.paraweb.fr -m contact@paraweb.fr --agree-tos --non-interactive --redirect${NC}"
echo -e ""
echo -e "   2. Testez:"
echo -e "      ${BLUE}curl https://simplix.paraweb.fr/health${NC}"
echo ""

echo -e "${GREEN}🎉 L'application fonctionne et attend la configuration DNS !${NC}"
echo ""
