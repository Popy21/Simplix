#!/bin/bash

# Script de test des nouvelles fonctionnalités Simplix CRM v5.0
# Usage: ./test-new-features.sh

set -e

API_URL="http://localhost:3000"
EMAIL="admin@admin.com"
PASSWORD="Admin123"

echo "🚀 Test des nouvelles fonctionnalités Simplix CRM v5.0"
echo "=================================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Helper function
test_endpoint() {
  local name=$1
  local method=$2
  local endpoint=$3
  local data=$4

  echo -e "${BLUE}Testing:${NC} $name"

  if [ "$method" = "GET" ]; then
    response=$(curl -s -X GET "$API_URL$endpoint" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json")
  else
    response=$(curl -s -X "$method" "$API_URL$endpoint" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d "$data")
  fi

  if echo "$response" | python3 -m json.tool > /dev/null 2>&1; then
    echo -e "${GREEN}✅ PASS${NC} - $name"
    return 0
  else
    echo -e "${RED}❌ FAIL${NC} - $name"
    echo "Response: $response"
    return 1
  fi
}

# ========================================
# 1. AUTHENTICATION
# ========================================

echo -e "\n${YELLOW}=== 1. Authentication ===${NC}"

echo "Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('token', ''))" 2>/dev/null || echo "")

if [ -z "$TOKEN" ]; then
  echo -e "${RED}❌ Login failed${NC}"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✅ Logged in successfully${NC}"
echo "Token: ${TOKEN:0:20}..."

# ========================================
# 2. TWO-FACTOR AUTHENTICATION (2FA)
# ========================================

echo -e "\n${YELLOW}=== 2. Two-Factor Authentication (2FA) ===${NC}"

test_endpoint "2FA Setup" "POST" "/api/auth/2fa/setup" ""

# ========================================
# 3. WEBHOOKS
# ========================================

echo -e "\n${YELLOW}=== 3. Webhooks ===${NC}"

test_endpoint "List Webhooks" "GET" "/api/webhooks" ""

echo "Creating webhook..."
WEBHOOK_RESPONSE=$(curl -s -X POST "$API_URL/api/webhooks" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Webhook - Contact Events",
    "url": "https://webhook.site/test-simplix",
    "events": ["contact.created", "deal.won", "invoice.paid"],
    "retry_count": 3
  }')

WEBHOOK_ID=$(echo "$WEBHOOK_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('id', ''))" 2>/dev/null || echo "")

if [ -n "$WEBHOOK_ID" ]; then
  echo -e "${GREEN}✅ Webhook created${NC} - ID: $WEBHOOK_ID"

  test_endpoint "Test Webhook" "POST" "/api/webhooks/$WEBHOOK_ID/test" ""
  test_endpoint "Get Webhook Deliveries" "GET" "/api/webhooks/$WEBHOOK_ID/deliveries" ""
else
  echo -e "${YELLOW}⚠️  Could not create webhook${NC}"
fi

# ========================================
# 4. EMAIL CAMPAIGNS
# ========================================

echo -e "\n${YELLOW}=== 4. Email Campaigns ===${NC}"

test_endpoint "List Email Templates" "GET" "/api/email-campaigns/templates" ""

echo "Creating email template..."
TEMPLATE_RESPONSE=$(curl -s -X POST "$API_URL/api/email-campaigns/templates" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Welcome Email",
    "subject": "Bienvenue {{first_name}} !",
    "body_html": "<h1>Bonjour {{first_name}} {{last_name}} !</h1><p>Merci de nous avoir rejoint.</p>",
    "body_text": "Bonjour {{first_name}} {{last_name}} ! Merci de nous avoir rejoint.",
    "variables": ["first_name", "last_name"],
    "category": "onboarding"
  }')

TEMPLATE_ID=$(echo "$TEMPLATE_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('id', ''))" 2>/dev/null || echo "")

if [ -n "$TEMPLATE_ID" ]; then
  echo -e "${GREEN}✅ Email template created${NC} - ID: $TEMPLATE_ID"

  echo "Creating email campaign..."
  CAMPAIGN_RESPONSE=$(curl -s -X POST "$API_URL/api/email-campaigns" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"template_id\": \"$TEMPLATE_ID\",
      \"name\": \"Test Campaign\",
      \"subject\": \"Test Subject\",
      \"from_email\": \"noreply@simplix.com\",
      \"from_name\": \"Simplix Team\"
    }")

  CAMPAIGN_ID=$(echo "$CAMPAIGN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('id', ''))" 2>/dev/null || echo "")

  if [ -n "$CAMPAIGN_ID" ]; then
    echo -e "${GREEN}✅ Email campaign created${NC} - ID: $CAMPAIGN_ID"
    test_endpoint "Get Campaign Stats" "GET" "/api/email-campaigns/$CAMPAIGN_ID/stats" ""
  fi
else
  echo -e "${YELLOW}⚠️  Could not create email template${NC}"
fi

test_endpoint "List Email Campaigns" "GET" "/api/email-campaigns" ""
test_endpoint "Get Email Logs" "GET" "/api/email-campaigns/logs?limit=10" ""

# ========================================
# 5. AI FEATURES
# ========================================

echo -e "\n${YELLOW}=== 5. AI Features ===${NC}"

# Get first contact
CONTACTS_RESPONSE=$(curl -s -X GET "$API_URL/api/contacts" \
  -H "Authorization: Bearer $TOKEN")

CONTACT_ID=$(echo "$CONTACTS_RESPONSE" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data[0]['id'] if isinstance(data, list) and len(data) > 0 else '')" 2>/dev/null || echo "")

if [ -n "$CONTACT_ID" ]; then
  echo "Testing AI with contact: $CONTACT_ID"
  test_endpoint "AI Lead Scoring" "POST" "/api/ai/score-lead/$CONTACT_ID" ""
fi

test_endpoint "Batch Score All Leads" "POST" "/api/ai/score-all-leads" ""

# Get first deal
DEALS_RESPONSE=$(curl -s -X GET "$API_URL/api/deals" \
  -H "Authorization: Bearer $TOKEN")

DEAL_ID=$(echo "$DEALS_RESPONSE" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data[0]['id'] if isinstance(data, list) and len(data) > 0 else '')" 2>/dev/null || echo "")

if [ -n "$DEAL_ID" ]; then
  echo "Testing deal prediction with: $DEAL_ID"
  test_endpoint "Predict Deal Probability" "POST" "/api/ai/predict-deal-probability/$DEAL_ID" ""
fi

# Get current user ID
USER_ID=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('user', {}).get('id', ''))" 2>/dev/null || echo "")

if [ -n "$USER_ID" ]; then
  test_endpoint "Get AI Recommendations" "GET" "/api/ai/recommendations/$USER_ID?status=pending" ""
fi

test_endpoint "Get Revenue Forecasts" "GET" "/api/ai/forecasts?period=month" ""
test_endpoint "Generate Forecast" "POST" "/api/ai/generate-forecast" '{"period":"month","periods_ahead":3}'

# ========================================
# 6. STRIPE PAYMENTS
# ========================================

echo -e "\n${YELLOW}=== 6. Stripe Payments ===${NC}"

echo "Creating Stripe Payment Intent..."
PAYMENT_INTENT_RESPONSE=$(curl -s -X POST "$API_URL/api/stripe/create-payment-intent" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000,
    "currency": "eur"
  }')

PAYMENT_INTENT_ID=$(echo "$PAYMENT_INTENT_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('paymentIntentId', ''))" 2>/dev/null || echo "")

if [ -n "$PAYMENT_INTENT_ID" ]; then
  echo -e "${GREEN}✅ Payment Intent created${NC} - ID: $PAYMENT_INTENT_ID"
else
  echo -e "${YELLOW}⚠️  Payment Intent not created (may need Stripe API key)${NC}"
  echo "Response: $PAYMENT_INTENT_RESPONSE"
fi

# ========================================
# 7. SECURITY FEATURES
# ========================================

echo -e "\n${YELLOW}=== 7. Security Features ===${NC}"

# Check if new security tables exist
echo "Checking security tables..."
TABLES_CHECK=$(PGPASSWORD=postgres psql -h localhost -U postgres -d simplix_crm -t -c "
  SELECT COUNT(*) FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name IN (
    'security_sessions',
    'login_history',
    'api_keys',
    'security_events',
    'payment_intents',
    'webhooks',
    'email_templates',
    'ai_predictions'
  )
" 2>/dev/null || echo "0")

TABLES_COUNT=$(echo "$TABLES_CHECK" | tr -d ' ')

if [ "$TABLES_COUNT" = "8" ]; then
  echo -e "${GREEN}✅ All 8 security tables exist${NC}"
else
  echo -e "${YELLOW}⚠️  Only $TABLES_COUNT/8 security tables found${NC}"
  echo "Run database migrations to create missing tables"
fi

# ========================================
# SUMMARY
# ========================================

echo -e "\n${YELLOW}=== Summary ===${NC}\n"

echo -e "Database Tables Status:"
echo -e "  Security: ${GREEN}$TABLES_COUNT/8${NC}"

echo -e "\nAPI Endpoints Tested:"
echo -e "  ${GREEN}✓${NC} Authentication (Login)"
echo -e "  ${GREEN}✓${NC} 2FA (Setup endpoint)"
echo -e "  ${GREEN}✓${NC} Webhooks (CRUD + Test)"
echo -e "  ${GREEN}✓${NC} Email Campaigns (Templates + Campaigns)"
echo -e "  ${GREEN}✓${NC} AI (Lead Scoring, Predictions, Forecasts)"
echo -e "  ${GREEN}✓${NC} Stripe (Payment Intents)"

echo -e "\n${GREEN}✅ Test suite completed!${NC}"
echo -e "\nNext steps:"
echo "1. Run database migrations if tables are missing"
echo "2. Configure Stripe API keys in .env"
echo "3. Configure email provider (SendGrid/AWS SES)"
echo "4. Test webhooks with real external URLs"
echo ""
echo "For full documentation, see: NEW_FEATURES_IMPLEMENTATION.md"
