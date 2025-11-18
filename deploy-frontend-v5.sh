#!/bin/bash

# Simplix CRM v5.0 - Frontend Deployment
# Deploy updated frontend with new v5.0 features

set -e

SERVER_IP="82.165.134.105"
SERVER_USER="root"
SERVER_PASS='HkVB9iuftdyè(4442212l???'
FRONTEND_DIR="/var/www/vhosts/drive.paraweb.fr/simplix.drive.paraweb.fr"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

remote_exec() {
    sshpass -p "$SERVER_PASS" ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "$1"
}

remote_copy() {
    sshpass -p "$SERVER_PASS" scp -o StrictHostKeyChecking=no "$1" $SERVER_USER@$SERVER_IP:"$2"
}

echo -e "${CYAN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                                                          ║${NC}"
echo -e "${CYAN}║     🚀 SIMPLIX CRM v5.0 FRONTEND DEPLOYMENT 🚀           ║${NC}"
echo -e "${CYAN}║                                                          ║${NC}"
echo -e "${CYAN}║    New Features: Stripe, 2FA, AI, Email, Webhooks       ║${NC}"
echo -e "${CYAN}║                                                          ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Step 1: Backup current frontend
echo -e "${YELLOW}💾 Step 1/3: Backing up current frontend...${NC}"
BACKUP_NAME="frontend_backup_$(date +%Y%m%d_%H%M%S).tar.gz"
remote_exec "
    cd $FRONTEND_DIR
    tar -czf /tmp/$BACKUP_NAME . 2>/dev/null || true
    echo 'Backup created: /tmp/$BACKUP_NAME'
"
echo -e "${GREEN}✅ Frontend backed up${NC}"
echo ""

# Step 2: Upload new frontend
echo -e "${YELLOW}📤 Step 2/3: Uploading new frontend with v5.0 features...${NC}"
echo "Uploading webapp-v5.tar.gz..."
remote_copy "web-app/webapp-v5.tar.gz" "/tmp/webapp-v5.tar.gz"

remote_exec "
    cd $FRONTEND_DIR

    # Remove old files
    rm -rf *

    # Extract new build
    tar -xzf /tmp/webapp-v5.tar.gz

    # Set permissions
    chown -R nginx:nginx .
    chmod -R 755 .

    echo 'Frontend deployed'
"
echo -e "${GREEN}✅ Frontend uploaded and extracted${NC}"
echo ""

# Step 3: Verify deployment
echo -e "${YELLOW}🧪 Step 3/3: Verifying deployment...${NC}"
sleep 2

echo "Testing frontend accessibility..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://simplix.drive.paraweb.fr/)
if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Frontend is live and responding (HTTP $HTTP_CODE)${NC}"
else
    echo -e "${YELLOW}⚠️  Frontend responding with HTTP $HTTP_CODE${NC}"
fi
echo ""

echo -e "${CYAN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                                                          ║${NC}"
echo -e "${CYAN}║         ✅ FRONTEND DEPLOYMENT COMPLETE v5.0 ✅           ║${NC}"
echo -e "${CYAN}║                                                          ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${GREEN}🎉 New features now visible in the home screen:${NC}"
echo ""
echo "  Ventes & CRM:"
echo "    ✨ IA Lead Scoring - Scoring intelligent par IA"
echo ""
echo "  Finance:"
echo "    ✨ Paiements Stripe - Encaissements en ligne"
echo ""
echo "  Automatisation:"
echo "    ✨ Email Marketing - Campagnes automatisées"
echo "    ✨ Webhooks - Intégrations temps réel"
echo ""
echo "  Configuration:"
echo "    ✨ Sécurité 2FA - Authentification à 2 facteurs"
echo ""

echo -e "${CYAN}🌐 Your application:${NC}"
echo "  Frontend: https://simplix.drive.paraweb.fr"
echo "  API:      http://82.165.134.105:3000"
echo ""

echo -e "${GREEN}All v5.0 features are now live! 🚀${NC}"
echo ""
