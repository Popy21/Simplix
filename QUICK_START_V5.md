# 🚀 Quick Start - Simplix CRM v5.0

## Installation rapide (5 minutes)

### 1️⃣ Migrations base de données

```bash
cd /Users/adelbouachraoui/Desktop/Bureau/Simplix

# Exécuter toutes les migrations (ordre important!)
PGPASSWORD=postgres psql -h localhost -U postgres -d simplix_crm -f database/migrations/022_fix_payments_uuid.sql
PGPASSWORD=postgres psql -h localhost -U postgres -d simplix_crm -f database/migrations/023_add_stripe_integration.sql
PGPASSWORD=postgres psql -h localhost -U postgres -d simplix_crm -f database/migrations/024_add_2fa_and_security.sql
PGPASSWORD=postgres psql -h localhost -U postgres -d simplix_crm -f database/migrations/025_add_webhooks_and_integrations.sql
PGPASSWORD=postgres psql -h localhost -U postgres -d simplix_crm -f database/migrations/026_add_ai_features.sql
```

**Vérification:**
```bash
PGPASSWORD=postgres psql -h localhost -U postgres -d simplix_crm -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('payments', 'webhooks', 'email_templates', 'ai_predictions');"
```
Devrait afficher: `4`

---

### 2️⃣ Configuration (optionnel mais recommandé)

Ajouter dans `api/.env`:

```bash
# Stripe (pour paiements)
STRIPE_SECRET_KEY=sk_test_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# IA (optionnel)
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-your-key

# Email (optionnel)
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=your-sendgrid-key
```

---

### 3️⃣ Démarrer l'API

```bash
cd api
npm run dev
```

**Vérification:**
Devrait afficher:
```
Server running on port 3000
Database connected
```

---

### 4️⃣ Tester les nouvelles fonctionnalités

```bash
cd /Users/adelbouachraoui/Desktop/Bureau/Simplix
chmod +x test-new-features.sh
./test-new-features.sh
```

**Résultat attendu:**
```
✅ Logged in successfully
✅ 2FA Setup
✅ Webhook created
✅ Email template created
✅ AI Lead Scoring
✅ All tests passed!
```

---

## 🎯 Fonctionnalités disponibles

### 1. Paiements Stripe
```bash
POST /api/stripe/create-payment-intent
POST /api/stripe/confirm-payment
POST /api/stripe/create-subscription
```

### 2. Authentification 2FA
```bash
POST /api/auth/2fa/setup
POST /api/auth/2fa/verify
```

### 3. Webhooks
```bash
GET  /api/webhooks
POST /api/webhooks
POST /api/webhooks/:id/test
```

### 4. Email Marketing
```bash
GET  /api/email-campaigns/templates
POST /api/email-campaigns
POST /api/email-campaigns/:id/send
```

### 5. Intelligence Artificielle
```bash
POST /api/ai/score-lead/:id
POST /api/ai/predict-deal-probability/:id
GET  /api/ai/forecasts
```

---

## 📚 Documentation complète

- **Guide détaillé:** [NEW_FEATURES_IMPLEMENTATION.md](NEW_FEATURES_IMPLEMENTATION.md)
- **Comparaison:** [FEATURES_COMPARISON.md](FEATURES_COMPARISON.md)
- **Résumé:** [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)

---

## ⚡ Test rapide

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@admin.com","password":"Admin123"}'

# Remplacer TOKEN par le token reçu
curl http://localhost:3000/api/webhooks \
  -H "Authorization: Bearer TOKEN"
```

---

## 🎉 C'est tout !

Votre Simplix CRM v5.0 est prêt avec:
- ✅ Paiements Stripe
- ✅ 2FA
- ✅ Webhooks
- ✅ Email marketing
- ✅ IA lead scoring

**Profitez de votre CRM Enterprise-grade!** 🚀
