#!/bin/bash

# Fix uploads path issue
# This script deploys the upload directory fix to production

set -e

SERVER_IP="82.165.134.105"
SERVER_USER="root"
SERVER_PASS='HkVB9iuftdyè(4442212l???'
APP_DIR="/var/www/simplix"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

remote_exec() {
    sshpass -p "$SERVER_PASS" ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "$1"
}

remote_copy() {
    sshpass -p "$SERVER_PASS" scp -o StrictHostKeyChecking=no -r "$1" $SERVER_USER@$SERVER_IP:"$2"
}

echo -e "${YELLOW}🔧 Fixing uploads path configuration...${NC}"

# Ensure uploads directory exists with correct permissions
echo -e "${YELLOW}📁 Setting up uploads directory...${NC}"
remote_exec "
    mkdir -p $APP_DIR/uploads
    chown -R www-data:www-data $APP_DIR/uploads
    chmod -R 755 $APP_DIR/uploads
    ls -la $APP_DIR/ | grep uploads
"

# Pull latest code changes
echo -e "${YELLOW}📥 Pulling latest code...${NC}"
remote_exec "
    cd $APP_DIR
    git pull origin main
"

# Copy updated ecosystem config
echo -e "${YELLOW}⚙️  Updating PM2 configuration...${NC}"
remote_copy "ecosystem.config.js" "$APP_DIR/"

# Rebuild API
echo -e "${YELLOW}🔨 Building API...${NC}"
remote_exec "
    cd $APP_DIR/api
    npm run build
"

# Restart PM2
echo -e "${YELLOW}🔄 Restarting API...${NC}"
remote_exec "
    pm2 delete simplix-api 2>/dev/null || true
    cd $APP_DIR
    pm2 start ecosystem.config.js
    pm2 save
"

# Test the configuration
echo -e "${YELLOW}🧪 Testing upload configuration...${NC}"
remote_exec "
    echo 'Test file' > $APP_DIR/uploads/test.txt
    ls -la $APP_DIR/uploads/test.txt
    rm $APP_DIR/uploads/test.txt
"

echo -e "${GREEN}✅ Upload path fix deployed successfully!${NC}"
echo ""
echo -e "${GREEN}📝 Summary:${NC}"
echo "  - API now uses UPLOAD_DIR=/var/www/simplix/uploads"
echo "  - Nginx serves files from /var/www/simplix/uploads"
echo "  - Directory has correct permissions (www-data:www-data)"
echo ""
echo -e "${GREEN}🧪 Test by uploading a new image in the app${NC}"
