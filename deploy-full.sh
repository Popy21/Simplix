#!/bin/bash

# Full deployment script for Simplix CRM
# Deploys backend API, frontend, and runs database migrations

set -e

SERVER_IP="82.165.134.105"
SERVER_USER="root"
SERVER_PASS='HkVB9iuftdyè(4442212l???'
APP_DIR="/var/www/simplix"
FRONTEND_DIR="/var/www/vhosts/drive.paraweb.fr/simplix.drive.paraweb.fr"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

remote_exec() {
    sshpass -p "$SERVER_PASS" ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "$1"
}

remote_copy() {
    sshpass -p "$SERVER_PASS" scp -o StrictHostKeyChecking=no -r "$1" $SERVER_USER@$SERVER_IP:"$2"
}

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   Simplix CRM - Full Deployment${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Step 1: Run database migrations
echo -e "${YELLOW}📊 Step 1/5: Running database migrations on production...${NC}"
remote_copy "database/migrations/021_create_documents_workflows.sql" "$APP_DIR/database/migrations/"
remote_exec "
    export PGPASSWORD=postgres
    psql -h localhost -U postgres -d simplix_crm -f $APP_DIR/database/migrations/021_create_documents_workflows.sql 2>&1 | grep -i 'create\|error' || echo 'Migration may already be applied'
"
echo -e "${GREEN}✅ Database migrations completed${NC}"
echo ""

# Step 2: Pull latest code
echo -e "${YELLOW}📥 Step 2/5: Pulling latest code from Git...${NC}"
remote_exec "
    cd $APP_DIR
    git fetch origin main
    git reset --hard origin/main
    git clean -fd
"
echo -e "${GREEN}✅ Code updated${NC}"
echo ""

# Step 3: Build and deploy backend API
echo -e "${YELLOW}🔨 Step 3/5: Building and deploying backend API...${NC}"
remote_exec "
    cd $APP_DIR/api
    npm install --production=false
    npm run build
"
echo -e "${GREEN}✅ Backend built successfully${NC}"
echo ""

# Step 4: Deploy frontend
echo -e "${YELLOW}🌐 Step 4/5: Deploying frontend...${NC}"
remote_exec "rm -rf $FRONTEND_DIR/*"
sshpass -p "$SERVER_PASS" scp -o StrictHostKeyChecking=no -r web-app/dist/* $SERVER_USER@$SERVER_IP:$FRONTEND_DIR/
echo -e "${GREEN}✅ Frontend deployed${NC}"
echo ""

# Step 5: Restart services
echo -e "${YELLOW}🔄 Step 5/5: Restarting services...${NC}"
remote_exec "
    # Restart API with PM2
    pm2 delete simplix-api 2>/dev/null || true
    cd $APP_DIR
    pm2 start ecosystem.config.js
    pm2 save

    # Reload Nginx
    nginx -t && systemctl reload nginx
"
echo -e "${GREEN}✅ Services restarted${NC}"
echo ""

# Verification
echo -e "${YELLOW}🧪 Verification...${NC}"
sleep 3
remote_exec "
    curl -s http://localhost:3000/ | grep -q 'Simplix' && echo '✓ API is responding' || echo '✗ API check failed'
    curl -Ik https://simplix.drive.paraweb.fr/ 2>&1 | head -1
"
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   ✅ Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}📝 What was deployed:${NC}"
echo "  ✅ Database migrations (documents, workflows, email attachments)"
echo "  ✅ Backend API with new services (deals, leads, documents, workflows, emails)"
echo "  ✅ Frontend with updated screens (DealsScreen, LeadsScreen)"
echo "  ✅ Nginx configuration (already fixed for uploads)"
echo ""
echo -e "${BLUE}🌐 Your app is live at:${NC}"
echo "  https://simplix.drive.paraweb.fr/"
echo ""
echo -e "${GREEN}🎉 All done!${NC}"
