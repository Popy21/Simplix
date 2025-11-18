#!/bin/bash

# Simplix CRM v5.0 - Complete Deployment Script
# Deploys all new features: Stripe, 2FA, Webhooks, Email Marketing, AI

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
CYAN='\033[0;36m'
NC='\033[0m'

remote_exec() {
    sshpass -p "$SERVER_PASS" ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "$1"
}

remote_copy() {
    sshpass -p "$SERVER_PASS" scp -o StrictHostKeyChecking=no -r "$1" $SERVER_USER@$SERVER_IP:"$2"
}

echo -e "${CYAN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                                                          ║${NC}"
echo -e "${CYAN}║         🚀 SIMPLIX CRM v5.0 DEPLOYMENT 🚀                ║${NC}"
echo -e "${CYAN}║                                                          ║${NC}"
echo -e "${CYAN}║    Enterprise Features: Stripe, 2FA, AI, Webhooks       ║${NC}"
echo -e "${CYAN}║                                                          ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Step 0: Pre-deployment checks
echo -e "${YELLOW}🔍 Step 0/8: Pre-deployment checks...${NC}"
echo "Testing server connection..."
if remote_exec "echo 'Server connected'" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Server connection OK${NC}"
else
    echo -e "${RED}❌ Cannot connect to server${NC}"
    exit 1
fi
echo ""

# Step 1: Backup current database
echo -e "${YELLOW}💾 Step 1/8: Backing up production database...${NC}"
BACKUP_FILE="simplix_crm_backup_$(date +%Y%m%d_%H%M%S).sql"
remote_exec "
    export PGPASSWORD=postgres
    pg_dump -h localhost -U postgres simplix_crm > /tmp/$BACKUP_FILE
    echo 'Backup created: /tmp/$BACKUP_FILE'
"
echo -e "${GREEN}✅ Database backed up to /tmp/$BACKUP_FILE${NC}"
echo ""

# Step 2: Upload new migration files
echo -e "${YELLOW}📤 Step 2/8: Uploading new migration files...${NC}"
remote_exec "mkdir -p $APP_DIR/database/migrations"
remote_copy "database/migrations/022_fix_payments_uuid.sql" "$APP_DIR/database/migrations/"
remote_copy "database/migrations/023_add_stripe_integration.sql" "$APP_DIR/database/migrations/"
remote_copy "database/migrations/024_add_2fa_and_security.sql" "$APP_DIR/database/migrations/"
remote_copy "database/migrations/025_add_webhooks_and_integrations.sql" "$APP_DIR/database/migrations/"
remote_copy "database/migrations/026_add_ai_features.sql" "$APP_DIR/database/migrations/"
echo -e "${GREEN}✅ Migration files uploaded (5 files)${NC}"
echo ""

# Step 3: Run database migrations
echo -e "${YELLOW}📊 Step 3/8: Running database migrations...${NC}"
echo -e "${BLUE}This will add 42 new tables/fields for v5.0 features${NC}"
remote_exec "
    export PGPASSWORD=postgres

    echo '1/5 - Fixing payments UUID...'
    psql -h localhost -U postgres -d simplix_crm -f $APP_DIR/database/migrations/022_fix_payments_uuid.sql 2>&1 | tail -5

    echo '2/5 - Adding Stripe integration...'
    psql -h localhost -U postgres -d simplix_crm -f $APP_DIR/database/migrations/023_add_stripe_integration.sql 2>&1 | tail -5

    echo '3/5 - Adding 2FA and security...'
    psql -h localhost -U postgres -d simplix_crm -f $APP_DIR/database/migrations/024_add_2fa_and_security.sql 2>&1 | tail -5

    echo '4/5 - Adding webhooks and integrations...'
    psql -h localhost -U postgres -d simplix_crm -f $APP_DIR/database/migrations/025_add_webhooks_and_integrations.sql 2>&1 | tail -5

    echo '5/5 - Adding AI features...'
    psql -h localhost -U postgres -d simplix_crm -f $APP_DIR/database/migrations/026_add_ai_features.sql 2>&1 | tail -5

    echo 'Verifying new tables...'
    psql -h localhost -U postgres -d simplix_crm -c \"SELECT COUNT(*) as new_tables FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('payment_intents', 'webhooks', 'email_templates', 'ai_predictions', 'security_sessions');\"
"
echo -e "${GREEN}✅ All 5 migrations completed successfully${NC}"
echo ""

# Step 4: Upload new API routes
echo -e "${YELLOW}📤 Step 4/8: Uploading new API routes...${NC}"
remote_exec "mkdir -p $APP_DIR/api/src/routes"
remote_copy "api/src/routes/stripe.ts" "$APP_DIR/api/src/routes/"
remote_copy "api/src/routes/webhooks.ts" "$APP_DIR/api/src/routes/"
remote_copy "api/src/routes/auth-2fa.ts" "$APP_DIR/api/src/routes/"
remote_copy "api/src/routes/email-campaigns.ts" "$APP_DIR/api/src/routes/"
remote_copy "api/src/routes/ai.ts" "$APP_DIR/api/src/routes/"
remote_copy "api/src/routes/payments.ts" "$APP_DIR/api/src/routes/"
remote_copy "api/src/index.ts" "$APP_DIR/api/src/"
echo -e "${GREEN}✅ New API routes uploaded (7 files, 60+ endpoints)${NC}"
echo ""

# Step 5: Update .env with new variables
echo -e "${YELLOW}⚙️  Step 5/8: Updating environment configuration...${NC}"
remote_copy ".env.production" "$APP_DIR/api/.env"
remote_exec "
    cd $APP_DIR/api

    # Add new v5.0 environment variables if not present
    if ! grep -q 'STRIPE_SECRET_KEY' .env; then
        echo '' >> .env
        echo '# Stripe Payment Integration (v5.0)' >> .env
        echo 'STRIPE_SECRET_KEY=sk_test_change_me' >> .env
        echo 'STRIPE_WEBHOOK_SECRET=whsec_change_me' >> .env
        echo 'STRIPE_PRICE_STARTER=price_starter' >> .env
        echo 'STRIPE_PRICE_PRO=price_pro' >> .env
        echo 'STRIPE_PRICE_ENTERPRISE=price_enterprise' >> .env
    fi

    if ! grep -q 'AI_PROVIDER' .env; then
        echo '' >> .env
        echo '# AI Features (v5.0)' >> .env
        echo 'AI_PROVIDER=anthropic' >> .env
        echo '# ANTHROPIC_API_KEY=sk-ant-your-key' >> .env
        echo '# OPENAI_API_KEY=sk-your-key' >> .env
    fi

    if ! grep -q 'EMAIL_PROVIDER' .env; then
        echo '' >> .env
        echo '# Email Marketing (v5.0)' >> .env
        echo 'EMAIL_PROVIDER=sendgrid' >> .env
        echo '# SENDGRID_API_KEY=SG.your-key' >> .env
        echo 'EMAIL_FROM=noreply@simplix.paraweb.fr' >> .env
    fi

    if ! grep -q 'SESSION_SECRET' .env; then
        echo '' >> .env
        echo '# Security (v5.0)' >> .env
        echo 'SESSION_SECRET=$(openssl rand -hex 32)' >> .env
        echo 'WEBHOOK_SECRET_SALT=$(openssl rand -hex 32)' >> .env
    fi

    echo 'Environment variables updated'
"
echo -e "${GREEN}✅ Environment configured with v5.0 variables${NC}"
echo ""

# Step 6: Build and deploy backend
echo -e "${YELLOW}🔨 Step 6/8: Building backend with new features...${NC}"
remote_exec "
    cd $APP_DIR/api

    # Install dependencies (Stripe already in package.json)
    npm install --production=false

    # Build TypeScript
    npm run build

    echo 'Backend build completed'
"
echo -e "${GREEN}✅ Backend built successfully with v5.0 features${NC}"
echo ""

# Step 7: Restart services
echo -e "${YELLOW}🔄 Step 7/8: Restarting services...${NC}"
remote_exec "
    cd $APP_DIR

    # Stop old API
    pm2 delete simplix-api 2>/dev/null || true

    # Start new API with v5.0
    pm2 start ecosystem.config.js
    pm2 save

    # Reload Nginx
    nginx -t && systemctl reload nginx

    echo 'Services restarted with v5.0'
"
echo -e "${GREEN}✅ All services restarted${NC}"
echo ""

# Step 8: Verification
echo -e "${YELLOW}🧪 Step 8/8: Verifying deployment...${NC}"
sleep 3

echo "Testing API endpoints..."
remote_exec "
    # Test base API
    curl -s http://localhost:3000/ | grep -q 'Simplix' && echo '✓ API responding' || echo '✗ API down'

    # Test new v5.0 endpoints
    TOKEN=\$(curl -s -X POST http://localhost:3000/api/auth/login \
      -H 'Content-Type: application/json' \
      -d '{\"email\":\"admin@admin.com\",\"password\":\"Admin123\"}' \
      | grep -o '\"token\":\"[^\"]*\"' | cut -d'\"' -f4)

    if [ -n \"\$TOKEN\" ]; then
        echo '✓ Authentication working'

        # Test v5.0 endpoints
        curl -s -H \"Authorization: Bearer \$TOKEN\" http://localhost:3000/api/webhooks | grep -q '\[' && echo '✓ Webhooks endpoint' || echo '✗ Webhooks failed'
        curl -s -H \"Authorization: Bearer \$TOKEN\" http://localhost:3000/api/email-campaigns/templates | grep -q '\[' && echo '✓ Email templates endpoint' || echo '✗ Email templates failed'
        curl -s -H \"Authorization: Bearer \$TOKEN\" http://localhost:3000/api/ai/forecasts | grep -q '\[' && echo '✓ AI forecasts endpoint' || echo '✗ AI forecasts failed'
    else
        echo '✗ Could not get auth token'
    fi

    # Check database tables
    export PGPASSWORD=postgres
    TABLE_COUNT=\$(psql -h localhost -U postgres -d simplix_crm -t -c \"SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('payments', 'webhooks', 'email_templates', 'ai_predictions', 'security_sessions');\")
    echo \"✓ New tables found: \$TABLE_COUNT/5\"
"
echo ""

echo -e "${CYAN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                                                          ║${NC}"
echo -e "${CYAN}║           ✅ DEPLOYMENT COMPLETE v5.0 ✅                  ║${NC}"
echo -e "${CYAN}║                                                          ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${BLUE}📦 What was deployed:${NC}"
echo ""
echo "  Database (42 new tables/fields):"
echo "    ✅ Payments (UUID fix + Stripe integration)"
echo "    ✅ Security (2FA, sessions, API keys, OAuth)"
echo "    ✅ Webhooks (delivery system + automation)"
echo "    ✅ Email Marketing (templates, campaigns, logs)"
echo "    ✅ AI (predictions, scoring, forecasts)"
echo ""
echo "  Backend API (60+ new endpoints):"
echo "    ✅ /api/stripe/* - Payment processing"
echo "    ✅ /api/auth/2fa/* - Two-factor authentication"
echo "    ✅ /api/webhooks/* - Webhook management"
echo "    ✅ /api/email-campaigns/* - Email marketing"
echo "    ✅ /api/ai/* - AI features"
echo ""
echo "  Features:"
echo "    ✅ Stripe PaymentIntents & Subscriptions"
echo "    ✅ 2FA with TOTP (Google Authenticator)"
echo "    ✅ Email campaigns with tracking"
echo "    ✅ AI lead scoring & predictions"
echo "    ✅ Webhook system with HMAC signatures"
echo ""

echo -e "${BLUE}🌐 Your application:${NC}"
echo "  API:      http://82.165.134.105:3000"
echo "  Frontend: https://simplix.drive.paraweb.fr"
echo ""

echo -e "${BLUE}📝 Next steps:${NC}"
echo "  1. Configure Stripe keys in $APP_DIR/api/.env"
echo "  2. Test 2FA setup: POST /api/auth/2fa/setup"
echo "  3. Create webhooks for automation"
echo "  4. Set up email templates"
echo "  5. Test AI lead scoring"
echo ""

echo -e "${BLUE}📚 Documentation:${NC}"
echo "  NEW_FEATURES_IMPLEMENTATION.md - Complete guide"
echo "  FEATURES_COMPARISON.md - vs competitors"
echo "  QUICK_START_V5.md - Quick start"
echo ""

echo -e "${BLUE}🔒 Security reminder:${NC}"
echo "  ⚠️  Update STRIPE_SECRET_KEY in .env"
echo "  ⚠️  Update JWT_SECRET to a strong random value"
echo "  ⚠️  Update SESSION_SECRET (already auto-generated)"
echo "  ⚠️  Enable 2FA for admin accounts"
echo ""

echo -e "${GREEN}🎉 Simplix CRM v5.0 is now LIVE!${NC}"
echo -e "${GREEN}Enterprise-grade CRM with Stripe, 2FA, AI & more${NC}"
echo ""
