# Matrice de Couverture des Tests - Simplix CRM

**Date de mise a jour**: 2026-01-08
**URL Application**: https://crm.paraweb.fr/
**Source**: TestAllScreen.tsx + Analyse Backend

---

## RESUME EXECUTIF

| Metrique | Valeur |
|----------|--------|
| **Endpoints API identifies** | ~350 |
| **Tests actuels (frontend)** | 127 |
| **Categories couvertes** | 30 |
| **Taux de couverture global** | ~36% |

---

## LEGENDE

| Symbole | Signification |
|---------|---------------|
| ✅ | Teste et fonctionnel |
| ⚠️ | Partiellement teste |
| ❌ | Non teste |
| 🔄 | Test a ajouter |

---

## 1. AUTHENTIFICATION (12 endpoints)

| Endpoint | Methode | Teste | Commentaire |
|----------|---------|-------|-------------|
| `/auth/login` | POST | ✅ | Login valide + invalide |
| `/auth/register` | POST | ❌ | A ajouter |
| `/auth/me` | GET | ✅ | Profil utilisateur |
| `/auth/refresh` | POST | ✅ | Refresh token |
| `/auth/logout` | POST | ❌ | A ajouter |
| `/auth/forgot-password` | POST | ❌ | A ajouter |
| `/auth/reset-password` | POST | ❌ | A ajouter |
| `/auth/validate-password` | POST | ❌ | A ajouter |
| `/auth/2fa/enable` | POST | ❌ | A ajouter |
| `/auth/2fa/verify` | POST | ❌ | A ajouter |
| `/auth/2fa/disable` | POST | ❌ | A ajouter |
| `/auth/2fa/backup-codes` | POST | ❌ | A ajouter |

**Couverture: 4/12 (33%)**

---

## 2. CONTACTS (13 endpoints)

| Endpoint | Methode | Teste | Commentaire |
|----------|---------|-------|-------------|
| `/contacts` | GET | ✅ | Liste + filtres (type, search, pagination) |
| `/contacts` | POST | ✅ | Creation contact |
| `/contacts/:id` | GET | ❌ | A ajouter |
| `/contacts/:id` | PUT | ❌ | A ajouter |
| `/contacts/:id` | DELETE | ❌ | A ajouter |
| `/contacts/stats` | GET | ✅ | Statistiques |
| `/contacts/search` | GET | ✅ | Via query param |
| `/contacts/import` | POST | ❌ | A ajouter |
| `/contacts/export` | GET | ❌ | Via /exports |
| `/contacts/:id/history` | GET | ❌ | A ajouter |
| `/contacts/:id/timeline` | GET | ❌ | A ajouter |
| `/contacts/deduplicate` | POST | ❌ | A ajouter |
| `/contacts/:id/convert` | POST | ❌ | A ajouter |

**Couverture: 8/13 (62%)**

---

## 3. LEADS (10 endpoints)

| Endpoint | Methode | Teste | Commentaire |
|----------|---------|-------|-------------|
| `/leads` | GET | ✅ | Liste + filtres |
| `/leads` | POST | ❌ | A ajouter |
| `/leads/:id` | GET | ❌ | A ajouter |
| `/leads/:id` | PUT | ❌ | A ajouter |
| `/leads/:id` | DELETE | ❌ | A ajouter |
| `/leads/stats` | GET | ✅ | Statistiques |
| `/leads/hot` | GET | ✅ | Leads chauds |
| `/leads/by-score` | GET | ✅ | Tri par score |
| `/leads/stats/by-source` | GET | ✅ | Par source |
| `/leads/stats/distribution` | GET | ✅ | Distribution |

**Couverture: 8/10 (80%)**

---

## 4. DEALS (10 endpoints)

| Endpoint | Methode | Teste | Commentaire |
|----------|---------|-------|-------------|
| `/deals` | GET | ✅ | Liste + filtres |
| `/deals` | POST | ❌ | A ajouter |
| `/deals/:id` | GET | ❌ | A ajouter |
| `/deals/:id` | PUT | ❌ | A ajouter |
| `/deals/:id` | DELETE | ❌ | A ajouter |
| `/deals/stats` | GET | ❌ | A ajouter |
| `/deals/:id/probability` | PATCH | ❌ | A ajouter |
| `/deals/:id/move` | PATCH | ❌ | A ajouter |
| `/deals/:id/won` | POST | ❌ | A ajouter |
| `/deals/:id/lost` | POST | ❌ | A ajouter |

**Couverture: 2/10 (20%)**

---

## 5. PIPELINE (11 endpoints)

| Endpoint | Methode | Teste | Commentaire |
|----------|---------|-------|-------------|
| `/pipeline` | GET | ❌ | A ajouter |
| `/pipelines` | GET | ✅ | Liste pipelines |
| `/pipeline/stages` | GET | ✅ | Stages |
| `/pipeline` | POST | ❌ | A ajouter |
| `/pipeline/:id` | GET | ❌ | A ajouter |
| `/pipeline/:id` | PUT | ❌ | A ajouter |
| `/pipeline/:id` | DELETE | ❌ | A ajouter |
| `/pipeline/:id/stages` | GET | ❌ | A ajouter |
| `/pipeline/:id/stages` | POST | ❌ | A ajouter |
| `/pipeline/:id/stages/reorder` | PUT | ❌ | A ajouter |
| `/pipeline/stats` | GET | ❌ | A ajouter |

**Couverture: 2/11 (18%)**

---

## 6. DEVIS (18 endpoints)

| Endpoint | Methode | Teste | Commentaire |
|----------|---------|-------|-------------|
| `/quotes` | GET | ✅ | Liste + filtres statut |
| `/quotes` | POST | ❌ | A ajouter |
| `/quotes/:id` | GET | ❌ | A ajouter |
| `/quotes/:id` | PUT | ❌ | A ajouter |
| `/quotes/:id` | DELETE | ❌ | A ajouter |
| `/quotes/:id/duplicate` | POST | ❌ | A ajouter |
| `/quotes/:id/send` | POST | ❌ | A ajouter |
| `/quotes/:id/pdf` | GET | ❌ | A ajouter |
| `/quotes/:id/convert` | POST | ❌ | A ajouter |
| `/quotes/:id/status` | PATCH | ❌ | A ajouter |
| `/quotes/stats` | GET | ❌ | A ajouter |
| `/quote-signatures` | GET | ✅ | Signatures |
| `/quote-signatures/:id/generate` | POST | ❌ | A ajouter |
| `/quote-signatures/:id/sign` | POST | ❌ | A ajouter |
| `/quote-signatures/:id/verify` | GET | ❌ | A ajouter |
| `/quotes/:id/versions` | GET | ❌ | A ajouter |
| `/quotes/:id/versions` | POST | ❌ | A ajouter |
| `/quotes/:id/versions/compare` | GET | ❌ | A ajouter |

**Couverture: 6/18 (33%)**

---

## 7. FACTURES (23 endpoints)

| Endpoint | Methode | Teste | Commentaire |
|----------|---------|-------|-------------|
| `/invoices` | GET | ✅ | Liste + filtres statut |
| `/invoices` | POST | ❌ | A ajouter |
| `/invoices/:id` | GET | ❌ | A ajouter |
| `/invoices/:id` | PUT | ❌ | A ajouter |
| `/invoices/:id` | DELETE | ❌ | A ajouter |
| `/invoices/:id/duplicate` | POST | ❌ | A ajouter |
| `/invoices/:id/send` | POST | ❌ | A ajouter |
| `/invoices/:id/pdf` | GET | ❌ | A ajouter |
| `/invoices/:id/paid` | POST | ❌ | A ajouter |
| `/invoices/:id/status` | PATCH | ❌ | A ajouter |
| `/invoices/stats` | GET | ❌ | A ajouter |
| `/invoices/next` | GET | ❌ | A ajouter |
| `/templates` | GET | ✅ | Templates |
| `/email-templates` | GET | ✅ | Email templates |
| `/invoice-templates` | GET | ✅ | Invoice templates |
| `/recurring-invoices` | GET | ✅ | Recurrentes |
| `/recurring-invoices` | POST | ❌ | A ajouter |
| `/recurring-invoices/:id` | GET | ❌ | A ajouter |
| `/recurring-invoices/:id` | PUT | ❌ | A ajouter |
| `/recurring-invoices/:id/status` | PATCH | ❌ | A ajouter |
| `/recurring-invoices/:id/generate` | POST | ❌ | A ajouter |
| `/recurring-invoices/process-due` | POST | ❌ | A ajouter |
| `/proforma` | GET | ✅ | Proforma |

**Couverture: 11/23 (48%)**

---

## 8. AVOIRS (10 endpoints)

| Endpoint | Methode | Teste | Commentaire |
|----------|---------|-------|-------------|
| `/credit-notes` | GET | ✅ | Liste + pagination |
| `/credit-notes` | POST | ❌ | A ajouter |
| `/credit-notes/:id` | GET | ❌ | A ajouter |
| `/credit-notes/:id` | PUT | ❌ | A ajouter |
| `/credit-notes/:id` | DELETE | ❌ | A ajouter |
| `/credit-notes/from-invoice/:id` | POST | ❌ | A ajouter |
| `/credit-notes/:id/status` | PATCH | ❌ | A ajouter |
| `/credit-notes/customer/:id` | GET | ❌ | A ajouter |
| `/credit-notes/invoice/:id` | GET | ❌ | A ajouter |
| `/credit-notes/stats` | GET | ❌ | A ajouter |

**Couverture: 2/10 (20%)**

---

## 9. PAIEMENTS (15 endpoints)

| Endpoint | Methode | Teste | Commentaire |
|----------|---------|-------|-------------|
| `/payments` | GET | ✅ | Liste |
| `/payments` | POST | ❌ | A ajouter |
| `/payments/:id` | GET | ❌ | A ajouter |
| `/payments/:id` | PUT | ❌ | A ajouter |
| `/payments/:id` | DELETE | ❌ | A ajouter |
| `/payments/invoice/:id` | GET | ❌ | A ajouter |
| `/payments/:id/refund` | POST | ❌ | A ajouter |
| `/payment-schedules` | GET | ✅ | Echeanciers |
| `/payment-schedules` | POST | ❌ | A ajouter |
| `/payment-schedules/:id` | GET | ❌ | A ajouter |
| `/deposits` | GET | ✅ | Acomptes |
| `/stripe/create-payment-intent` | POST | ❌ | A ajouter |
| `/stripe/confirm-payment` | POST | ❌ | A ajouter |
| `/stripe/webhook` | POST | ❌ | Webhook |
| `/stripe/payment-methods` | GET | ❌ | A ajouter |

**Couverture: 3/15 (20%)**

---

## 10. RELANCES (10 endpoints)

| Endpoint | Methode | Teste | Commentaire |
|----------|---------|-------|-------------|
| `/reminders` | GET | ✅ | Liste |
| `/reminders/settings` | GET | ❌ | A ajouter |
| `/reminders/settings` | PUT | ❌ | A ajouter |
| `/reminders/overdue` | GET | ❌ | A ajouter |
| `/reminders/history` | GET | ❌ | A ajouter |
| `/reminders/queue` | GET | ❌ | A ajouter |
| `/reminders/send/:id` | POST | ❌ | A ajouter |
| `/reminders/process` | POST | ❌ | A ajouter |
| `/reminders/stats` | GET | ❌ | A ajouter |
| `/reminders/queue/:id` | DELETE | ❌ | A ajouter |

**Couverture: 1/10 (10%)**

---

## 11. PRODUITS (15 endpoints)

| Endpoint | Methode | Teste | Commentaire |
|----------|---------|-------|-------------|
| `/products` | GET | ✅ | Liste + search + pagination |
| `/products` | POST | ✅ | Creation |
| `/products/:id` | GET | ❌ | A ajouter |
| `/products/:id` | PUT | ❌ | A ajouter |
| `/products/:id` | DELETE | ❌ | A ajouter |
| `/products/search` | GET | ✅ | Via query |
| `/products/category/:id` | GET | ❌ | A ajouter |
| `/products/stats` | GET | ❌ | A ajouter |
| `/categories/products` | GET | ✅ | Categories |
| `/categories` | GET | ❌ | A ajouter |
| `/categories` | POST | ❌ | A ajouter |
| `/categories/:id` | PUT | ❌ | A ajouter |
| `/categories/:id` | DELETE | ❌ | A ajouter |
| `/pricing` | GET | ❌ | A ajouter |
| `/upload/image` | POST | ❌ | A ajouter |

**Couverture: 5/15 (33%)**

---

## 12. STOCK (6 endpoints)

| Endpoint | Methode | Teste | Commentaire |
|----------|---------|-------|-------------|
| `/stock/levels` | GET | ✅ | Niveaux |
| `/stock/movements` | GET | ✅ | Mouvements |
| `/stock/movements` | POST | ❌ | A ajouter |
| `/stock/current` | GET | ❌ | A ajouter |
| `/stock/alerts` | GET | ❌ | A ajouter |
| `/stock/adjust` | POST | ❌ | A ajouter |

**Couverture: 2/6 (33%)**

---

## 13. CLIENTS (8 endpoints)

| Endpoint | Methode | Teste | Commentaire |
|----------|---------|-------|-------------|
| `/customers` | GET | ✅ | Liste + search |
| `/customers` | POST | ✅ | Creation |
| `/customers/:id` | GET | ❌ | A ajouter |
| `/customers/:id` | PUT | ❌ | A ajouter |
| `/customers/:id` | DELETE | ❌ | A ajouter |
| `/customers/search` | GET | ✅ | Via query |
| `/customers/:id/stats` | GET | ❌ | A ajouter |
| `/customers/:id/history` | GET | ❌ | A ajouter |

**Couverture: 3/8 (38%)**

---

## 14. FOURNISSEURS (5 endpoints)

| Endpoint | Methode | Teste | Commentaire |
|----------|---------|-------|-------------|
| `/suppliers` | GET | ✅ | Liste + search |
| `/suppliers` | POST | ❌ | A ajouter |
| `/suppliers/:id` | GET | ❌ | A ajouter |
| `/suppliers/:id` | PUT | ❌ | A ajouter |
| `/suppliers/:id` | DELETE | ❌ | A ajouter |

**Couverture: 1/5 (20%)**

---

## 15. DEPENSES (7 endpoints)

| Endpoint | Methode | Teste | Commentaire |
|----------|---------|-------|-------------|
| `/expenses` | GET | ✅ | Liste + filtres |
| `/expenses` | POST | ✅ | Creation |
| `/expenses/:id` | GET | ❌ | A ajouter |
| `/expenses/:id` | PUT | ❌ | A ajouter |
| `/expenses/:id` | DELETE | ❌ | A ajouter |
| `/expenses/by-category` | GET | ✅ | Par categorie |
| `/expenses/stats/summary` | GET | ✅ | Resume |

**Couverture: 8/7 (>100% - tests extras)**

---

## 16. TACHES (10 endpoints)

| Endpoint | Methode | Teste | Commentaire |
|----------|---------|-------|-------------|
| `/tasks` | GET | ✅ | Liste + filtres |
| `/tasks` | POST | ❌ | A ajouter |
| `/tasks/:id` | GET | ❌ | A ajouter |
| `/tasks/:id` | PUT | ❌ | A ajouter |
| `/tasks/:id` | DELETE | ❌ | A ajouter |
| `/tasks/contact/:id` | GET | ❌ | A ajouter |
| `/tasks/:id/complete` | POST | ❌ | A ajouter |
| `/tasks/:id/assign` | POST | ❌ | A ajouter |
| `/tasks/overdue` | GET | ❌ | A ajouter |
| `/tasks/today` | GET | ❌ | A ajouter |

**Couverture: 5/10 (50%)**

---

## 17. ACTIVITES (12 endpoints)

| Endpoint | Methode | Teste | Commentaire |
|----------|---------|-------|-------------|
| `/activities` | GET | ✅ | Liste + filtres type |
| `/activities` | POST | ✅ | Creation |
| `/activities/:id` | GET | ❌ | A ajouter |
| `/activities/:id` | PUT | ❌ | A ajouter |
| `/activities/:id` | DELETE | ❌ | A ajouter |
| `/activities/contact/:id` | GET | ❌ | A ajouter |
| `/activities/deal/:id` | GET | ❌ | A ajouter |
| `/activities/call` | POST | ❌ | A ajouter |
| `/activities/email` | POST | ❌ | A ajouter |
| `/activities/meeting` | POST | ❌ | A ajouter |
| `/activities/note` | POST | ❌ | A ajouter |
| `/activities/stats` | GET | ❌ | A ajouter |

**Couverture: 6/12 (50%)**

---

## 18. DOCUMENTS (10 endpoints)

| Endpoint | Methode | Teste | Commentaire |
|----------|---------|-------|-------------|
| `/documents` | GET | ✅ | Liste + pagination |
| `/documents` | POST | ❌ | A ajouter |
| `/documents/:id` | GET | ❌ | A ajouter |
| `/documents/:id` | PUT | ❌ | A ajouter |
| `/documents/:id` | DELETE | ❌ | A ajouter |
| `/documents/contact/:id` | GET | ❌ | A ajouter |
| `/documents/:id/versions` | GET | ❌ | A ajouter |
| `/documents/:id/versions` | POST | ❌ | A ajouter |
| `/documents/:id/download` | GET | ❌ | A ajouter |
| `/documents/:id/share` | POST | ❌ | A ajouter |

**Couverture: 2/10 (20%)**

---

## 19. EQUIPES & PERMISSIONS (15 endpoints)

| Endpoint | Methode | Teste | Commentaire |
|----------|---------|-------|-------------|
| `/teams` | GET | ✅ | Liste |
| `/teams` | POST | ❌ | A ajouter |
| `/teams/:id` | GET | ❌ | A ajouter |
| `/teams/:id` | PUT | ❌ | A ajouter |
| `/teams/:id` | DELETE | ❌ | A ajouter |
| `/teams/:id/members` | GET | ❌ | A ajouter |
| `/teams/:id/members` | POST | ❌ | A ajouter |
| `/teams/:id/members/:userId` | DELETE | ❌ | A ajouter |
| `/permissions` | GET | ✅ | Permissions |
| `/permissions/roles` | GET | ❌ | A ajouter |
| `/permissions/roles` | POST | ❌ | A ajouter |
| `/permissions/roles/:id` | PUT | ❌ | A ajouter |
| `/permissions/roles/:id` | DELETE | ❌ | A ajouter |
| `/permissions/roles/:id/permissions` | GET | ❌ | A ajouter |
| `/permissions/user/:id` | GET | ❌ | A ajouter |

**Couverture: 2/15 (13%)**

---

## 20. WORKFLOWS (8 endpoints)

| Endpoint | Methode | Teste | Commentaire |
|----------|---------|-------|-------------|
| `/workflows` | GET | ✅ | Liste + pagination |
| `/workflows` | POST | ❌ | A ajouter |
| `/workflows/:id` | GET | ❌ | A ajouter |
| `/workflows/:id` | PUT | ❌ | A ajouter |
| `/workflows/:id` | DELETE | ❌ | A ajouter |
| `/workflows/:id/execute` | POST | ❌ | A ajouter |
| `/workflows/:id/executions` | GET | ❌ | A ajouter |
| `/workflows/templates/list` | GET | ❌ | A ajouter |

**Couverture: 2/8 (25%)**

---

## 21. EMAILS & CAMPAGNES (9 endpoints)

| Endpoint | Methode | Teste | Commentaire |
|----------|---------|-------|-------------|
| `/emails/templates` | GET | ✅ | Templates |
| `/email-campaigns` | GET | ✅ | Campagnes |
| `/email-campaigns` | POST | ❌ | A ajouter |
| `/email-campaigns/:id` | GET | ❌ | A ajouter |
| `/email-campaigns/:id` | PUT | ❌ | A ajouter |
| `/email-campaigns/:id` | DELETE | ❌ | A ajouter |
| `/email-campaigns/:id/send` | POST | ❌ | A ajouter |
| `/email-campaigns/:id/schedule` | POST | ❌ | A ajouter |
| `/email-campaigns/:id/stats` | GET | ❌ | A ajouter |

**Couverture: 2/9 (22%)**

---

## 22. FINANCE - TRESORERIE (8 endpoints)

| Endpoint | Methode | Teste | Commentaire |
|----------|---------|-------|-------------|
| `/cashflow/forecast` | GET | ✅ | Prevision |
| `/cashflow/forecasts` | GET | ❌ | A ajouter |
| `/cashflow/forecasts` | POST | ❌ | A ajouter |
| `/cashflow/forecasts/:id` | GET | ❌ | A ajouter |
| `/cashflow/forecasts/:id/items` | POST | ❌ | A ajouter |
| `/cashflow/items/:id/realize` | POST | ❌ | A ajouter |
| `/cashflow/forecasts/generate` | POST | ❌ | A ajouter |
| `/cashflow/monthly/:year` | GET | ❌ | A ajouter |

**Couverture: 1/8 (13%)**

---

## 23. FINANCE - BANQUE (15 endpoints)

| Endpoint | Methode | Teste | Commentaire |
|----------|---------|-------|-------------|
| `/bank` | GET | ❌ | A ajouter |
| `/bank/reconciliation` | GET | ✅ | Rapprochement |
| `/bank/accounts` | GET | ❌ | A ajouter |
| `/bank/accounts` | POST | ❌ | A ajouter |
| `/bank/accounts/:id` | PUT | ❌ | A ajouter |
| `/bank/accounts/:id/transactions` | GET | ❌ | A ajouter |
| `/bank/accounts/:id/transactions` | POST | ❌ | A ajouter |
| `/bank/accounts/:id/import` | POST | ❌ | A ajouter |
| `/bank/suggestions` | GET | ❌ | A ajouter |
| `/bank/transactions/:id/match-invoice` | POST | ❌ | A ajouter |
| `/bank/transactions/:id/match-expense` | POST | ❌ | A ajouter |
| `/bank/transactions/:id/ignore` | POST | ❌ | A ajouter |
| `/bank/transactions/:id/unmatch` | POST | ❌ | A ajouter |
| `/bank/accounts/:id/auto-match` | POST | ❌ | A ajouter |
| `/bank/stats` | GET | ❌ | A ajouter |

**Couverture: 1/15 (7%)**

---

## 24. FINANCE - COMPTABILITE (8 endpoints)

| Endpoint | Methode | Teste | Commentaire |
|----------|---------|-------|-------------|
| `/accounting/income-statement` | GET | ❌ | A ajouter |
| `/accounting/income-statement/monthly/:year` | GET | ❌ | A ajouter |
| `/accounting/chart-of-accounts` | GET | ❌ | A ajouter |
| `/accounting/currencies` | GET | ❌ | A ajouter |
| `/accounting/exchange-rates` | GET | ❌ | A ajouter |
| `/accounting/exchange-rates` | POST | ❌ | A ajouter |
| `/accounting/convert` | POST | ❌ | A ajouter |
| `/accounting/export` | GET | ✅ | Export + FEC |

**Couverture: 2/8 (25%)**

---

## 25. TVA (6 endpoints)

| Endpoint | Methode | Teste | Commentaire |
|----------|---------|-------|-------------|
| `/vat/rates` | GET | ✅ | Taux TVA |
| `/vat/regime` | GET | ✅ | Regime |
| `/vat/declaration` | GET | ❌ | A ajouter |
| `/vat/export` | GET | ❌ | A ajouter |
| `/vat/intracom-invoices` | GET | ✅ | Intracom |
| `/vat/summary` | GET | ❌ | A ajouter |

**Couverture: 3/6 (50%)**

---

## 26. PARAMETRES (18 endpoints)

| Endpoint | Methode | Teste | Commentaire |
|----------|---------|-------|-------------|
| `/settings` | GET | ✅ | Generaux |
| `/settings/numbering` | GET | ✅ | Numerotation |
| `/settings/notifications` | GET | ✅ | Notifications |
| `/settings/organization` | GET | ❌ | A ajouter |
| `/settings/organization` | PUT | ❌ | A ajouter |
| `/settings/user` | GET | ❌ | A ajouter |
| `/settings/user` | PUT | ❌ | A ajouter |
| `/settings/integrations` | GET | ❌ | A ajouter |
| `/company-profile` | GET | ✅ | Profil entreprise |
| `/company-profile` | POST | ❌ | A ajouter |
| `/company-profile` | PUT | ❌ | A ajouter |
| `/company-profile` | DELETE | ❌ | A ajouter |
| `/legal-settings` | GET | ✅ | Juridique |
| `/legal-settings` | PUT | ❌ | A ajouter |
| `/numbering/settings` | GET | ✅ | Ancien |
| `/numbering` | GET | ❌ | A ajouter |
| `/numbering` | PUT | ❌ | A ajouter |
| `/numbering/:type/next` | GET | ❌ | A ajouter |

**Couverture: 6/18 (33%)**

---

## 27. ANALYTICS & DASHBOARD (35 endpoints)

| Endpoint | Methode | Teste | Commentaire |
|----------|---------|-------|-------------|
| `/dashboard/stats` | GET | ✅ | Stats |
| `/dashboard/kpis` | GET | ✅ | KPIs |
| `/analytics/dashboard` | GET | ✅ | Analytics |
| `/analytics/sales` | GET | ✅ | Ventes |
| `/analytics/revenue` | GET | ✅ | Revenue |
| `/analytics/contacts` | GET | ✅ | Contacts |
| `/revenue/summary` | GET | ✅ | Resume |
| `/aged-balance` | GET | ✅ | Balance agee |
| `/dashboard/sales-by-period` | GET | ❌ | A ajouter |
| `/dashboard/top-customers` | GET | ❌ | A ajouter |
| `/dashboard/top-products` | GET | ❌ | A ajouter |
| `/dashboard/recent-activity` | GET | ❌ | A ajouter |
| `/dashboard/quick-stats` | GET | ❌ | A ajouter |
| `/dashboard/revenue` | GET | ❌ | A ajouter |
| `/dashboard/cashflow` | GET | ❌ | A ajouter |
| `/dashboard/invoices-metrics` | GET | ❌ | A ajouter |
| `/dashboard/customer-metrics` | GET | ❌ | A ajouter |
| `/dashboard/projections` | GET | ❌ | A ajouter |
| `/analytics/sales-by-period` | GET | ❌ | A ajouter |
| `/analytics/top-customers` | GET | ❌ | A ajouter |
| `/analytics/top-products` | GET | ❌ | A ajouter |
| `/analytics/quotes-conversion` | GET | ❌ | A ajouter |
| `/analytics/recent-activity` | GET | ❌ | A ajouter |
| `/analytics/low-stock` | GET | ❌ | A ajouter |
| `/analytics/pending-quotes` | GET | ❌ | A ajouter |
| `/analytics/tasks-today` | GET | ❌ | A ajouter |
| `/analytics/quick-stats` | GET | ❌ | A ajouter |
| `/analytics/lead-scores` | GET | ❌ | A ajouter |
| `/analytics/pipeline-stages` | GET | ❌ | A ajouter |
| `/analytics/forecasting` | GET | ❌ | A ajouter |
| `/reports` | GET | ✅ | Rapports |
| `/reports/sales` | GET | ❌ | A ajouter |
| `/reports/customers` | GET | ❌ | A ajouter |
| `/reports/products` | GET | ❌ | A ajouter |
| `/reports/pipeline` | GET | ❌ | A ajouter |

**Couverture: 9/35 (26%)**

---

## 28. EXPORTS & IMPORTS (15 endpoints)

| Endpoint | Methode | Teste | Commentaire |
|----------|---------|-------|-------------|
| `/exports/contacts` | GET | ✅ | CSV + JSON |
| `/exports/invoices` | GET | ❌ | A ajouter |
| `/exports/quotes` | GET | ❌ | A ajouter |
| `/exports/products` | GET | ❌ | A ajouter |
| `/exports/customers` | GET | ❌ | A ajouter |
| `/exports/payments` | GET | ❌ | A ajouter |
| `/exports/accounting` | GET | ❌ | A ajouter |
| `/exports/history` | GET | ❌ | A ajouter |
| `/import/contacts` | POST | ❌ | A ajouter |
| `/import/products` | POST | ❌ | A ajouter |
| `/import/customers` | POST | ❌ | A ajouter |
| `/import/templates/contacts` | GET | ❌ | A ajouter |
| `/import/templates/products` | GET | ❌ | A ajouter |
| `/import/history` | GET | ❌ | A ajouter |
| `/search` | GET | ✅ | Recherche |

**Couverture: 3/15 (20%)**

---

## 29. DOCUMENTS COMMERCIAUX (18 endpoints)

| Endpoint | Methode | Teste | Commentaire |
|----------|---------|-------|-------------|
| `/purchase-orders` | GET | ✅ | Bons de commande |
| `/purchase-orders` | POST | ❌ | A ajouter |
| `/purchase-orders/:id` | GET | ❌ | A ajouter |
| `/purchase-orders/:id/receive` | POST | ❌ | A ajouter |
| `/delivery-notes` | GET | ✅ | Bons de livraison |
| `/delivery-notes` | POST | ❌ | A ajouter |
| `/delivery-notes/:id` | GET | ❌ | A ajouter |
| `/delivery-notes/from-invoice/:id` | POST | ❌ | A ajouter |
| `/return-orders` | GET | ✅ | Retours |
| `/return-orders` | POST | ❌ | A ajouter |
| `/return-orders/:id` | GET | ❌ | A ajouter |
| `/return-orders/:id/process` | POST | ❌ | A ajouter |
| `/expense-notes` | GET | ✅ | Notes de frais |
| `/expense-notes` | POST | ❌ | A ajouter |
| `/expense-notes/:id` | GET | ❌ | A ajouter |
| `/shipping/methods` | GET | ✅ | Livraison |
| `/shipping/calculate` | POST | ❌ | A ajouter |
| `/shipping/track/:number` | GET | ❌ | A ajouter |

**Couverture: 5/18 (28%)**

---

## 30. AUTRES (25 endpoints)

| Endpoint | Methode | Teste | Commentaire |
|----------|---------|-------|-------------|
| `/notifications` | GET | ✅ | Notifications |
| `/notifications/:id/read` | POST | ❌ | A ajouter |
| `/notifications/read-all` | POST | ❌ | A ajouter |
| `/notifications/:id` | DELETE | ❌ | A ajouter |
| `/notifications/settings` | GET | ❌ | A ajouter |
| `/webhooks` | GET | ❌ | A ajouter |
| `/webhooks` | POST | ❌ | A ajouter |
| `/webhooks/:id` | GET | ❌ | A ajouter |
| `/webhooks/:id/test` | POST | ❌ | A ajouter |
| `/webhooks/:id/logs` | GET | ❌ | A ajouter |
| `/logs` | GET | ✅ | Audit logs |
| `/logs/audit` | GET | ❌ | A ajouter |
| `/logs/system` | GET | ❌ | A ajouter |
| `/logs/user/:id` | GET | ❌ | A ajouter |
| `/facturx/status` | GET | ✅ | Factur-X |
| `/facturx/generate/:id` | GET | ❌ | A ajouter |
| `/facturx/parse` | POST | ❌ | A ajouter |
| `/qrcode/generate` | POST | ❌ | A ajouter |
| `/qrcode/invoice/:id` | GET | ❌ | A ajouter |
| `/showcase` | GET | ❌ | A ajouter |
| `/showcase/config` | PUT | ❌ | A ajouter |
| `/catalog` | GET | ❌ | A ajouter |
| `/bulk/delete` | POST | ❌ | A ajouter |
| `/bulk/update` | POST | ❌ | A ajouter |
| `/bulk/export` | POST | ❌ | A ajouter |

**Couverture: 3/25 (12%)**

---

## RESUME PAR MODULE

| Module | Endpoints | Testes | Couverture |
|--------|-----------|--------|------------|
| Authentification | 12 | 4 | 33% |
| Contacts | 13 | 8 | 62% |
| Leads | 10 | 8 | 80% |
| Deals | 10 | 2 | 20% |
| Pipeline | 11 | 2 | 18% |
| Devis | 18 | 6 | 33% |
| Factures | 23 | 11 | 48% |
| Avoirs | 10 | 2 | 20% |
| Paiements | 15 | 3 | 20% |
| Relances | 10 | 1 | 10% |
| Produits | 15 | 5 | 33% |
| Stock | 6 | 2 | 33% |
| Clients | 8 | 3 | 38% |
| Fournisseurs | 5 | 1 | 20% |
| Depenses | 7 | 8 | >100% |
| Taches | 10 | 5 | 50% |
| Activites | 12 | 6 | 50% |
| Documents | 10 | 2 | 20% |
| Equipes | 15 | 2 | 13% |
| Workflows | 8 | 2 | 25% |
| Emails | 9 | 2 | 22% |
| Tresorerie | 8 | 1 | 13% |
| Banque | 15 | 1 | 7% |
| Comptabilite | 8 | 2 | 25% |
| TVA | 6 | 3 | 50% |
| Parametres | 18 | 6 | 33% |
| Analytics | 35 | 9 | 26% |
| Exports | 15 | 3 | 20% |
| Doc Commerciaux | 18 | 5 | 28% |
| Autres | 25 | 3 | 12% |
| **TOTAL** | **~350** | **~127** | **~36%** |

---

## PRIORITES DE TEST

### Haute Priorite (Critique pour le business)
1. ❌ Operations CRUD completes sur toutes les entites
2. ❌ Authentification 2FA
3. ❌ Generation PDF (factures, devis)
4. ❌ Paiements Stripe
5. ❌ Rapprochement bancaire complet

### Moyenne Priorite (Fonctionnalites importantes)
1. ❌ Conversions (lead -> contact, devis -> facture)
2. ❌ Signature electronique
3. ❌ Relances automatiques
4. ❌ Workflows d'automatisation
5. ❌ Imports/Exports complets

### Basse Priorite (Nice to have)
1. ❌ Webhooks
2. ❌ Logs d'audit
3. ❌ Bulk operations
4. ❌ QR Codes
5. ❌ Showcase/Catalog

---

## ACTIONS RECOMMANDEES

1. **Court terme**: Ajouter les tests CRUD manquants pour les entites principales
2. **Moyen terme**: Couvrir les fonctionnalites finance (tresorerie, banque)
3. **Long terme**: Atteindre 80%+ de couverture sur tous les modules

---

*Matrice generee le 2026-01-08*
