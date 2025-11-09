#!/bin/bash

# ============================================================================
# SIMPLIX - CORRECTION NGINX
# Diagnostique et corrige le routage Nginx
# ============================================================================

set -e

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║    🔍 DIAGNOSTIC NGINX - SIMPLIX                          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# ============================================================================
# 1. DIAGNOSTIC
# ============================================================================
echo -e "${BLUE}🔍 Diagnostic de la configuration actuelle...${NC}"
echo ""

# Qui écoute sur le port 80 ?
echo -e "${YELLOW}   → Processus écoutant sur le port 80:${NC}"
netstat -tlnp | grep :80 || ss -tlnp | grep :80

echo ""

# Configuration Nginx
echo -e "${YELLOW}   → Sites Nginx activés:${NC}"
ls -la /etc/nginx/sites-enabled/

echo ""

# Voir la config Simplix
echo -e "${YELLOW}   → Configuration Simplix:${NC}"
if [ -f /etc/nginx/sites-enabled/simplix.drive.paraweb.fr ]; then
    echo -e "${GREEN}   ✓ Fichier existe${NC}"
    head -30 /etc/nginx/sites-enabled/simplix.drive.paraweb.fr
else
    echo -e "${RED}   ✗ Fichier n'existe pas${NC}"
fi

echo ""

# Test Nginx syntax
echo -e "${YELLOW}   → Test syntaxe Nginx:${NC}"
nginx -t

echo ""

# ============================================================================
# 2. IDENTIFIER LE PROBLÈME
# ============================================================================
echo -e "${BLUE}🔧 Identification du problème...${NC}"
echo ""

# Vérifier si Plesk/Apache écoute sur le port 80
if netstat -tlnp | grep -q ":80.*apache\|:80.*httpd"; then
    echo -e "${RED}   ✗ Apache/Plesk écoute sur le port 80${NC}"
    echo -e "${YELLOW}   → Solution: Utiliser un virtual host basé sur le nom de domaine${NC}"
    USE_VHOST=true
elif ss -tlnp | grep -q ":80.*apache\|:80.*httpd"; then
    echo -e "${RED}   ✗ Apache/Plesk écoute sur le port 80${NC}"
    echo -e "${YELLOW}   → Solution: Utiliser un virtual host basé sur le nom de domaine${NC}"
    USE_VHOST=true
else
    echo -e "${YELLOW}   → Nginx devrait pouvoir écouter sur le port 80${NC}"
    USE_VHOST=false
fi

echo ""

# ============================================================================
# 3. SOLUTION: CONFIGURER PLESK POUR SIMPLIX
# ============================================================================
echo -e "${BLUE}💡 Solution recommandée: Configuration via Plesk${NC}"
echo ""

echo -e "${YELLOW}Le serveur utilise Plesk qui gère Apache/Nginx.${NC}"
echo -e "${YELLOW}Il faut configurer Simplix comme une application Node.js dans Plesk.${NC}"
echo ""

echo -e "${BLUE}Option 1: Configuration manuelle dans Plesk (RECOMMANDÉ)${NC}"
echo -e "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "1. Connectez-vous à Plesk: https://82.165.134.105:8443"
echo -e "2. Allez sur le domaine: ${GREEN}simplix.drive.paraweb.fr${NC}"
echo -e "3. Cliquez sur ${GREEN}'Node.js'${NC} dans les paramètres"
echo -e "4. Configurez:"
echo -e "   - Node.js version: ${GREEN}18.x${NC}"
echo -e "   - Application mode: ${GREEN}Production${NC}"
echo -e "   - Application root: ${GREEN}/var/www/simplix/api${NC}"
echo -e "   - Application URL: ${GREEN}/${NC}"
echo -e "   - Application startup file: ${GREEN}dist/index.js${NC}"
echo -e "5. Cliquez sur ${GREEN}'Enable Node.js'${NC}"
echo -e "6. Dans 'Environment Variables', ajoutez:"
echo -e "   ${GREEN}NODE_ENV=production${NC}"
echo -e "   ${GREEN}PORT=3000${NC}"
echo ""

echo -e "${BLUE}Option 2: Proxy Nginx via Plesk${NC}"
echo -e "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "1. Connectez-vous à Plesk: https://82.165.134.105:8443"
echo -e "2. Allez sur: ${GREEN}simplix.drive.paraweb.fr${NC}"
echo -e "3. Cliquez sur ${GREEN}'Apache & Nginx Settings'${NC}"
echo -e "4. Dans la section ${GREEN}'Additional nginx directives'${NC}, ajoutez:"
echo ""
cat << 'EOF'
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
}
EOF
echo ""
echo -e "5. Cliquez sur ${GREEN}'OK'${NC}"
echo -e "6. Attendez que Plesk reconfigure Nginx"
echo ""

# ============================================================================
# 4. ALTERNATIVE: UTILISER UN PORT DIFFÉRENT
# ============================================================================
echo -e "${BLUE}Option 3: Accès direct par port (Temporaire)${NC}"
echo -e "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "L'API Simplix fonctionne déjà sur le port 3000."
echo -e "Vous pouvez y accéder directement:"
echo ""
echo -e "   ${GREEN}http://82.165.134.105:3000/health${NC}"
echo -e "   ${GREEN}http://82.165.134.105:3000/api-docs${NC}"
echo ""
echo -e "${YELLOW}⚠️  Vous devez ouvrir le port 3000 dans le firewall:${NC}"
echo ""
echo -e "   ${BLUE}ufw allow 3000/tcp${NC}"
echo ""

# Test si le port 3000 est accessible
echo -e "${YELLOW}   → Test accès au port 3000...${NC}"
if curl -s http://localhost:3000/health | grep -q "ok"; then
    echo -e "${GREEN}   ✓ API fonctionne sur localhost:3000${NC}"

    # Ouvrir le port 3000
    echo ""
    echo -e "${YELLOW}   → Ouverture du port 3000 dans le firewall...${NC}"
    ufw allow 3000/tcp
    echo -e "${GREEN}   ✓ Port 3000 ouvert${NC}"

    SERVER_IP=$(curl -s ifconfig.me)
    echo ""
    echo -e "${GREEN}   🎉 Vous pouvez maintenant accéder à l'API:${NC}"
    echo -e "   ${BLUE}http://${SERVER_IP}:3000/api-docs${NC}"
    echo -e "   ${BLUE}http://${SERVER_IP}:3000/health${NC}"
fi

echo ""

# ============================================================================
# 5. RÉSUMÉ
# ============================================================================
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║    📋 RÉSUMÉ ET PROCHAINES ÉTAPES                         ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

SERVER_IP=$(curl -s ifconfig.me)

echo -e "${BLUE}✅ Ce qui fonctionne:${NC}"
echo -e "   • API Simplix sur localhost:3000"
echo -e "   • PM2 avec 4 instances en cluster"
echo -e "   • Base de données PostgreSQL"
echo -e "   • Données de démo chargées"
echo ""

echo -e "${BLUE}🔧 Ce qui doit être corrigé:${NC}"
echo -e "   • Routage HTTP via Plesk/Nginx vers l'API"
echo ""

echo -e "${BLUE}🎯 Actions recommandées (par ordre de préférence):${NC}"
echo ""
echo -e "${YELLOW}1. Configuration Plesk (MEILLEURE SOLUTION)${NC}"
echo -e "   → Suivez les instructions de l'Option 1 ou 2 ci-dessus"
echo -e "   → Cela configurera proprement le reverse proxy"
echo ""
echo -e "${YELLOW}2. Accès temporaire par port (SOLUTION RAPIDE)${NC}"
echo -e "   → ${GREEN}http://${SERVER_IP}:3000/api-docs${NC}"
echo -e "   → Fonctionne immédiatement mais pas idéal pour la prod"
echo ""

echo -e "${BLUE}🔐 Credentials de test:${NC}"
echo -e "   Email:    admin@simplix-demo.fr"
echo -e "   Password: Test1234!"
echo ""

echo -e "${BLUE}📚 Documentation Plesk Node.js:${NC}"
echo -e "   https://docs.plesk.com/en-US/obsidian/administrator-guide/website-management/nodejs.73383/"
echo ""
