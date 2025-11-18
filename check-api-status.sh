#!/bin/bash

API_URL="http://82.165.134.105:3000/api"
TOKEN=""

echo "🔍 Checking Simplix API Status..."
echo ""

# Test authentication first
echo "=== Authentication ===" 
RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@admin.com","password":"Admin123!"}')

TOKEN=$(echo $RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -n "$TOKEN" ]; then
  echo "✅ Login successful"
else
  echo "❌ Login failed"
  echo "Response: $RESPONSE"
fi

echo ""
echo "=== Testing Endpoints ===" 

ENDPOINTS=(
  "contacts"
  "companies"
  "deals"
  "leads"
  "tasks"
  "products"
  "invoices"
  "quotes"
  "sales"
  "expenses"
  "suppliers"
  "templates"
  "teams"
  "workflows"
  "emails"
  "email-campaigns/templates"
  "documents"
  "webhooks"
  "stripe/payment-methods"
  "ai/lead-scoring"
)

for endpoint in "${ENDPOINTS[@]}"; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $TOKEN" \
    "$API_URL/$endpoint")
  
  if [ "$STATUS" = "200" ]; then
    echo "✅ /$endpoint - OK"
  elif [ "$STATUS" = "401" ]; then
    echo "🔐 /$endpoint - Auth required"
  elif [ "$STATUS" = "404" ]; then
    echo "❌ /$endpoint - Not found"
  else
    echo "⚠️  /$endpoint - Status $STATUS"
  fi
done

echo ""
echo "✅ Check complete"
