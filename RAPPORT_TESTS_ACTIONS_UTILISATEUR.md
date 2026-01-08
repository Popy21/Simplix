# Rapport Complet des Actions Utilisateur - Simplix CRM

**URL de l'application**: https://crm.paraweb.fr/
**API Backend**: https://crm.paraweb.fr/api/
**Date d'analyse**: 2026-01-08

---

## 1. AUTHENTIFICATION

### 1.1 Connexion / Inscription

| Action | Endpoint | Methode | Statut |
|--------|----------|---------|--------|
| Inscription utilisateur | `/api/auth/register` | POST | A tester |
| Connexion email/mot de passe | `/api/auth/login` | POST | A tester |
| Deconnexion | `/api/auth/logout` | POST | A tester |
| Validation du mot de passe | `/api/auth/validate-password` | POST | A tester |
| Recuperer utilisateur courant | `/api/auth/me` | GET | A tester |
| Rafraichir le token | `/api/auth/refresh` | POST | A tester |
| Mot de passe oublie | `/api/auth/forgot-password` | POST | A tester |
| Reinitialiser mot de passe | `/api/auth/reset-password` | POST | A tester |

### 1.2 Authentification 2FA

| Action | Endpoint | Methode | Statut |
|--------|----------|---------|--------|
| Activer 2FA | `/api/auth/2fa/enable` | POST | A tester |
| Verifier 2FA | `/api/auth/2fa/verify` | POST | A tester |
| Desactiver 2FA | `/api/auth/2fa/disable` | POST | A tester |
| Generer codes de secours | `/api/auth/2fa/backup-codes` | POST | A tester |

---

## 2. CONTACTS

| Action | Endpoint | Methode | Statut |
|--------|----------|---------|--------|
| Lister les contacts | `/api/contacts` | GET | A tester |
| Creer un contact | `/api/contacts` | POST | A tester |
| Recuperer un contact | `/api/contacts/:id` | GET | A tester |
| Mettre a jour un contact | `/api/contacts/:id` | PUT | A tester |
| Supprimer un contact | `/api/contacts/:id` | DELETE | A tester |
| Rechercher des contacts | `/api/contacts/search` | GET | A tester |
| Statistiques contacts | `/api/contacts/stats` | GET | A tester |
| Importer des contacts | `/api/contacts/import` | POST | A tester |
| Exporter des contacts | `/api/contacts/export` | GET | A tester |
| Historique d'un contact | `/api/contacts/:id/history` | GET | A tester |
| Timeline d'un contact | `/api/contacts/:id/timeline` | GET | A tester |
| Deduplication | `/api/contacts/deduplicate` | POST | A tester |
| Convertir contact en client | `/api/contacts/:id/convert` | POST | A tester |

---

## 3. LEADS (Prospects)

| Action | Endpoint | Methode | Statut |
|--------|----------|---------|--------|
| Lister les leads | `/api/leads` | GET | A tester |
| Creer un lead | `/api/leads` | POST | A tester |
| Recuperer un lead | `/api/leads/:id` | GET | A tester |
| Mettre a jour un lead | `/api/leads/:id` | PUT | A tester |
| Supprimer un lead | `/api/leads/:id` | DELETE | A tester |
| Statistiques leads | `/api/leads/stats` | GET | A tester |
| Scoring des leads | `/api/leads/:id/score` | GET | A tester |
| Convertir lead en contact | `/api/leads/:id/convert` | POST | A tester |
| Lead scoring automatique | `/api/leads/auto-score` | POST | A tester |
| Assigner un lead | `/api/leads/:id/assign` | POST | A tester |

---

## 4. DEALS (Opportunites)

| Action | Endpoint | Methode | Statut |
|--------|----------|---------|--------|
| Lister les deals | `/api/deals` | GET | A tester |
| Creer un deal | `/api/deals` | POST | A tester |
| Recuperer un deal | `/api/deals/:id` | GET | A tester |
| Mettre a jour un deal | `/api/deals/:id` | PUT | A tester |
| Supprimer un deal | `/api/deals/:id` | DELETE | A tester |
| Statistiques deals | `/api/deals/stats` | GET | A tester |
| Mettre a jour la probabilite | `/api/deals/:id/probability` | PATCH | A tester |
| Deplacer dans le pipeline | `/api/deals/:id/move` | PATCH | A tester |
| Marquer comme gagne | `/api/deals/:id/won` | POST | A tester |
| Marquer comme perdu | `/api/deals/:id/lost` | POST | A tester |

---

## 5. PIPELINE

| Action | Endpoint | Methode | Statut |
|--------|----------|---------|--------|
| Lister les pipelines | `/api/pipeline` | GET | A tester |
| Creer un pipeline | `/api/pipeline` | POST | A tester |
| Recuperer un pipeline | `/api/pipeline/:id` | GET | A tester |
| Mettre a jour un pipeline | `/api/pipeline/:id` | PUT | A tester |
| Supprimer un pipeline | `/api/pipeline/:id` | DELETE | A tester |
| Lister les etapes | `/api/pipeline/:id/stages` | GET | A tester |
| Creer une etape | `/api/pipeline/:id/stages` | POST | A tester |
| Mettre a jour une etape | `/api/pipeline/:pipelineId/stages/:stageId` | PUT | A tester |
| Supprimer une etape | `/api/pipeline/:pipelineId/stages/:stageId` | DELETE | A tester |
| Reordonner les etapes | `/api/pipeline/:id/stages/reorder` | PUT | A tester |
| Statistiques pipeline | `/api/pipeline/stats` | GET | A tester |

---

## 6. DEVIS (Quotes)

| Action | Endpoint | Methode | Statut |
|--------|----------|---------|--------|
| Lister les devis | `/api/quotes` | GET | A tester |
| Creer un devis | `/api/quotes` | POST | A tester |
| Recuperer un devis | `/api/quotes/:id` | GET | A tester |
| Mettre a jour un devis | `/api/quotes/:id` | PUT | A tester |
| Supprimer un devis | `/api/quotes/:id` | DELETE | A tester |
| Dupliquer un devis | `/api/quotes/:id/duplicate` | POST | A tester |
| Envoyer un devis par email | `/api/quotes/:id/send` | POST | A tester |
| Generer PDF du devis | `/api/quotes/:id/pdf` | GET | A tester |
| Convertir en facture | `/api/quotes/:id/convert` | POST | A tester |
| Changer le statut | `/api/quotes/:id/status` | PATCH | A tester |
| Statistiques devis | `/api/quotes/stats` | GET | A tester |

### 6.1 Signature electronique des devis

| Action | Endpoint | Methode | Statut |
|--------|----------|---------|--------|
| Generer lien de signature | `/api/quote-signatures/:quoteId/generate` | POST | A tester |
| Recuperer signature | `/api/quote-signatures/:quoteId` | GET | A tester |
| Signer le devis | `/api/quote-signatures/:quoteId/sign` | POST | A tester |
| Verifier signature | `/api/quote-signatures/:quoteId/verify` | GET | A tester |
| Renvoyer lien signature | `/api/quote-signatures/:quoteId/resend` | POST | A tester |
| Annuler demande signature | `/api/quote-signatures/:quoteId/cancel` | POST | A tester |

### 6.2 Versionnage des devis

| Action | Endpoint | Methode | Statut |
|--------|----------|---------|--------|
| Lister les versions | `/api/quotes/:id/versions` | GET | A tester |
| Creer une nouvelle version | `/api/quotes/:id/versions` | POST | A tester |
| Recuperer une version | `/api/quotes/:id/versions/:versionId` | GET | A tester |
| Comparer deux versions | `/api/quotes/:id/versions/compare` | GET | A tester |

---

## 7. FACTURES (Invoices)

| Action | Endpoint | Methode | Statut |
|--------|----------|---------|--------|
| Lister les factures | `/api/invoices` | GET | A tester |
| Creer une facture | `/api/invoices` | POST | A tester |
| Recuperer une facture | `/api/invoices/:id` | GET | A tester |
| Mettre a jour une facture | `/api/invoices/:id` | PUT | A tester |
| Supprimer une facture | `/api/invoices/:id` | DELETE | A tester |
| Dupliquer une facture | `/api/invoices/:id/duplicate` | POST | A tester |
| Envoyer par email | `/api/invoices/:id/send` | POST | A tester |
| Generer PDF | `/api/invoices/:id/pdf` | GET | A tester |
| Marquer comme payee | `/api/invoices/:id/paid` | POST | A tester |
| Changer le statut | `/api/invoices/:id/status` | PATCH | A tester |
| Statistiques factures | `/api/invoices/stats` | GET | A tester |
| Prochaine facture a emettre | `/api/invoices/next` | GET | A tester |

### 7.1 Factures recurrentes

| Action | Endpoint | Methode | Statut |
|--------|----------|---------|--------|
| Lister factures recurrentes | `/api/recurring-invoices` | GET | A tester |
| Creer facture recurrente | `/api/recurring-invoices` | POST | A tester |
| Recuperer facture recurrente | `/api/recurring-invoices/:id` | GET | A tester |
| Mettre a jour | `/api/recurring-invoices/:id` | PUT | A tester |
| Supprimer | `/api/recurring-invoices/:id` | DELETE | A tester |
| Changer statut (pause/actif) | `/api/recurring-invoices/:id/status` | PATCH | A tester |
| Generer facture manuellement | `/api/recurring-invoices/:id/generate` | POST | A tester |
| Traiter toutes les factures dues | `/api/recurring-invoices/process-due` | POST | A tester |
| Statistiques | `/api/recurring-invoices/stats/summary` | GET | A tester |

---

## 8. AVOIRS (Credit Notes)

| Action | Endpoint | Methode | Statut |
|--------|----------|---------|--------|
| Lister les avoirs | `/api/credit-notes` | GET | A tester |
| Creer un avoir | `/api/credit-notes` | POST | A tester |
| Recuperer un avoir | `/api/credit-notes/:id` | GET | A tester |
| Mettre a jour un avoir | `/api/credit-notes/:id` | PUT | A tester |
| Supprimer un avoir | `/api/credit-notes/:id` | DELETE | A tester |
| Creer depuis une facture | `/api/credit-notes/from-invoice/:invoiceId` | POST | A tester |
| Changer le statut | `/api/credit-notes/:id/status` | PATCH | A tester |
| Avoirs d'un client | `/api/credit-notes/customer/:customerId` | GET | A tester |
| Avoirs d'une facture | `/api/credit-notes/invoice/:invoiceId` | GET | A tester |
| Statistiques | `/api/credit-notes/stats` | GET | A tester |

---

## 9. PAIEMENTS

| Action | Endpoint | Methode | Statut |
|--------|----------|---------|--------|
| Lister les paiements | `/api/payments` | GET | A tester |
| Enregistrer un paiement | `/api/payments` | POST | A tester |
| Recuperer un paiement | `/api/payments/:id` | GET | A tester |
| Mettre a jour un paiement | `/api/payments/:id` | PUT | A tester |
| Supprimer un paiement | `/api/payments/:id` | DELETE | A tester |
| Paiements d'une facture | `/api/payments/invoice/:invoiceId` | GET | A tester |
| Rembourser un paiement | `/api/payments/:id/refund` | POST | A tester |

### 9.1 Stripe

| Action | Endpoint | Methode | Statut |
|--------|----------|---------|--------|
| Creer intention de paiement | `/api/stripe/create-payment-intent` | POST | A tester |
| Confirmer paiement | `/api/stripe/confirm-payment` | POST | A tester |
| Webhook Stripe | `/api/stripe/webhook` | POST | A tester |
| Lister moyens de paiement | `/api/stripe/payment-methods` | GET | A tester |

### 9.2 Echeancier de paiement

| Action | Endpoint | Methode | Statut |
|--------|----------|---------|--------|
| Lister les echeanciers | `/api/payment-schedules` | GET | A tester |
| Creer un echeancier | `/api/payment-schedules` | POST | A tester |
| Recuperer un echeancier | `/api/payment-schedules/:id` | GET | A tester |
| Mettre a jour | `/api/payment-schedules/:id` | PUT | A tester |
| Supprimer | `/api/payment-schedules/:id` | DELETE | A tester |
| Marquer echeance payee | `/api/payment-schedules/:id/installments/:installmentId/pay` | POST | A tester |

---

## 10. RELANCES (Reminders)

| Action | Endpoint | Methode | Statut |
|--------|----------|---------|--------|
| Lister les relances | `/api/reminders` | GET | A tester |
| Parametres de relance | `/api/reminders/settings` | GET | A tester |
| Modifier parametres | `/api/reminders/settings` | PUT | A tester |
| Factures en retard | `/api/reminders/overdue` | GET | A tester |
| Historique relances | `/api/reminders/history` | GET | A tester |
| File d'attente relances | `/api/reminders/queue` | GET | A tester |
| Envoyer relance manuelle | `/api/reminders/send/:invoiceId` | POST | A tester |
| Traiter relances planifiees | `/api/reminders/process` | POST | A tester |
| Statistiques | `/api/reminders/stats` | GET | A tester |
| Annuler relance planifiee | `/api/reminders/queue/:id` | DELETE | A tester |

---

## 11. PRODUITS

| Action | Endpoint | Methode | Statut |
|--------|----------|---------|--------|
| Lister les produits | `/api/products` | GET | A tester |
| Creer un produit | `/api/products` | POST | A tester |
| Recuperer un produit | `/api/products/:id` | GET | A tester |
| Mettre a jour un produit | `/api/products/:id` | PUT | A tester |
| Supprimer un produit | `/api/products/:id` | DELETE | A tester |
| Rechercher produits | `/api/products/search` | GET | A tester |
| Produits par categorie | `/api/products/category/:categoryId` | GET | A tester |
| Statistiques produits | `/api/products/stats` | GET | A tester |
| Telecharger image produit | `/api/upload/image` | POST | A tester |

### 11.1 Categories

| Action | Endpoint | Methode | Statut |
|--------|----------|---------|--------|
| Lister les categories | `/api/categories` | GET | A tester |
| Creer une categorie | `/api/categories` | POST | A tester |
| Recuperer une categorie | `/api/categories/:id` | GET | A tester |
| Mettre a jour | `/api/categories/:id` | PUT | A tester |
| Supprimer | `/api/categories/:id` | DELETE | A tester |

### 11.2 Tarification

| Action | Endpoint | Methode | Statut |
|--------|----------|---------|--------|
| Regles de tarification | `/api/pricing` | GET | A tester |
| Creer regle | `/api/pricing` | POST | A tester |
| Mettre a jour regle | `/api/pricing/:id` | PUT | A tester |
| Supprimer regle | `/api/pricing/:id` | DELETE | A tester |
| Calculer prix | `/api/pricing/calculate` | POST | A tester |

---

## 12. STOCK

| Action | Endpoint | Methode | Statut |
|--------|----------|---------|--------|
| Mouvements de stock | `/api/stock/movements` | GET | A tester |
| Ajouter mouvement | `/api/stock/movements` | POST | A tester |
| Stock actuel | `/api/stock/current` | GET | A tester |
| Alertes stock bas | `/api/stock/alerts` | GET | A tester |
| Inventaire | `/api/stock/inventory` | GET | A tester |
| Ajustement stock | `/api/stock/adjust` | POST | A tester |

---

## 13. CLIENTS (Customers)

| Action | Endpoint | Methode | Statut |
|--------|----------|---------|--------|
| Lister les clients | `/api/customers` | GET | A tester |
| Creer un client | `/api/customers` | POST | A tester |
| Recuperer un client | `/api/customers/:id` | GET | A tester |
| Mettre a jour un client | `/api/customers/:id` | PUT | A tester |
| Supprimer un client | `/api/customers/:id` | DELETE | A tester |
| Rechercher clients | `/api/customers/search` | GET | A tester |
| Statistiques client | `/api/customers/:id/stats` | GET | A tester |
| Historique client | `/api/customers/:id/history` | GET | A tester |

---

## 14. FOURNISSEURS (Suppliers)

| Action | Endpoint | Methode | Statut |
|--------|----------|---------|--------|
| Lister les fournisseurs | `/api/suppliers` | GET | A tester |
| Creer un fournisseur | `/api/suppliers` | POST | A tester |
| Recuperer un fournisseur | `/api/suppliers/:id` | GET | A tester |
| Mettre a jour | `/api/suppliers/:id` | PUT | A tester |
| Supprimer | `/api/suppliers/:id` | DELETE | A tester |

---

## 15. DEPENSES (Expenses)

| Action | Endpoint | Methode | Statut |
|--------|----------|---------|--------|
| Lister les depenses | `/api/expenses` | GET | A tester |
| Creer une depense | `/api/expenses` | POST | A tester |
| Recuperer une depense | `/api/expenses/:id` | GET | A tester |
| Mettre a jour | `/api/expenses/:id` | PUT | A tester |
| Supprimer | `/api/expenses/:id` | DELETE | A tester |
| Statistiques | `/api/expenses/stats` | GET | A tester |
| Par categorie | `/api/expenses/by-category` | GET | A tester |

---

## 16. TACHES

| Action | Endpoint | Methode | Statut |
|--------|----------|---------|--------|
| Lister les taches | `/api/tasks` | GET | A tester |
| Creer une tache | `/api/tasks` | POST | A tester |
| Recuperer une tache | `/api/tasks/:id` | GET | A tester |
| Mettre a jour une tache | `/api/tasks/:id` | PUT | A tester |
| Supprimer une tache | `/api/tasks/:id` | DELETE | A tester |
| Taches d'un contact | `/api/tasks/contact/:contactId` | GET | A tester |
| Marquer comme terminee | `/api/tasks/:id/complete` | POST | A tester |
| Assigner une tache | `/api/tasks/:id/assign` | POST | A tester |
| Taches en retard | `/api/tasks/overdue` | GET | A tester |
| Taches du jour | `/api/tasks/today` | GET | A tester |

---

## 17. ACTIVITES

| Action | Endpoint | Methode | Statut |
|--------|----------|---------|--------|
| Lister les activites | `/api/activities` | GET | A tester |
| Creer une activite | `/api/activities` | POST | A tester |
| Recuperer une activite | `/api/activities/:id` | GET | A tester |
| Mettre a jour | `/api/activities/:id` | PUT | A tester |
| Supprimer | `/api/activities/:id` | DELETE | A tester |
| Activites d'un contact | `/api/activities/contact/:contactId` | GET | A tester |
| Activites d'un deal | `/api/activities/deal/:dealId` | GET | A tester |
| Ajouter un appel | `/api/activities/call` | POST | A tester |
| Ajouter un email | `/api/activities/email` | POST | A tester |
| Ajouter une reunion | `/api/activities/meeting` | POST | A tester |
| Ajouter une note | `/api/activities/note` | POST | A tester |
| Statistiques | `/api/activities/stats` | GET | A tester |

---

## 18. DOCUMENTS

| Action | Endpoint | Methode | Statut |
|--------|----------|---------|--------|
| Lister les documents | `/api/documents` | GET | A tester |
| Telecharger un document | `/api/documents` | POST | A tester |
| Recuperer un document | `/api/documents/:id` | GET | A tester |
| Mettre a jour | `/api/documents/:id` | PUT | A tester |
| Supprimer | `/api/documents/:id` | DELETE | A tester |
| Documents d'un contact | `/api/documents/contact/:contactId` | GET | A tester |
| Versions d'un document | `/api/documents/:id/versions` | GET | A tester |
| Ajouter version | `/api/documents/:id/versions` | POST | A tester |
| Telecharger fichier | `/api/documents/:id/download` | GET | A tester |
| Partager document | `/api/documents/:id/share` | POST | A tester |

---

## 19. EQUIPES ET PERMISSIONS

### 19.1 Equipes

| Action | Endpoint | Methode | Statut |
|--------|----------|---------|--------|
| Lister les equipes | `/api/teams` | GET | A tester |
| Creer une equipe | `/api/teams` | POST | A tester |
| Recuperer une equipe | `/api/teams/:id` | GET | A tester |
| Mettre a jour | `/api/teams/:id` | PUT | A tester |
| Supprimer | `/api/teams/:id` | DELETE | A tester |
| Membres d'une equipe | `/api/teams/:id/members` | GET | A tester |
| Ajouter membre | `/api/teams/:id/members` | POST | A tester |
| Retirer membre | `/api/teams/:id/members/:userId` | DELETE | A tester |

### 19.2 Permissions

| Action | Endpoint | Methode | Statut |
|--------|----------|---------|--------|
| Lister les roles | `/api/permissions/roles` | GET | A tester |
| Creer un role | `/api/permissions/roles` | POST | A tester |
| Mettre a jour role | `/api/permissions/roles/:id` | PUT | A tester |
| Supprimer role | `/api/permissions/roles/:id` | DELETE | A tester |
| Permissions d'un role | `/api/permissions/roles/:id/permissions` | GET | A tester |
| Assigner permissions | `/api/permissions/roles/:id/permissions` | PUT | A tester |
| Permissions utilisateur | `/api/permissions/user/:userId` | GET | A tester |

---

## 20. WORKFLOWS (Automatisation)

| Action | Endpoint | Methode | Statut |
|--------|----------|---------|--------|
| Lister les workflows | `/api/workflows` | GET | A tester |
| Creer un workflow | `/api/workflows` | POST | A tester |
| Recuperer un workflow | `/api/workflows/:id` | GET | A tester |
| Mettre a jour | `/api/workflows/:id` | PUT | A tester |
| Supprimer | `/api/workflows/:id` | DELETE | A tester |
| Executer manuellement | `/api/workflows/:id/execute` | POST | A tester |
| Historique executions | `/api/workflows/:id/executions` | GET | A tester |
| Modeles predefinies | `/api/workflows/templates/list` | GET | A tester |

---

## 21. CAMPAGNES EMAIL

| Action | Endpoint | Methode | Statut |
|--------|----------|---------|--------|
| Lister les campagnes | `/api/email-campaigns` | GET | A tester |
| Creer une campagne | `/api/email-campaigns` | POST | A tester |
| Recuperer une campagne | `/api/email-campaigns/:id` | GET | A tester |
| Mettre a jour | `/api/email-campaigns/:id` | PUT | A tester |
| Supprimer | `/api/email-campaigns/:id` | DELETE | A tester |
| Envoyer campagne | `/api/email-campaigns/:id/send` | POST | A tester |
| Programmer envoi | `/api/email-campaigns/:id/schedule` | POST | A tester |
| Statistiques campagne | `/api/email-campaigns/:id/stats` | GET | A tester |
| Test d'envoi | `/api/email-campaigns/:id/test` | POST | A tester |

---

## 22. MODELES (Templates)

| Action | Endpoint | Methode | Statut |
|--------|----------|---------|--------|
| Lister les modeles | `/api/templates` | GET | A tester |
| Creer un modele | `/api/templates` | POST | A tester |
| Recuperer un modele | `/api/templates/:id` | GET | A tester |
| Mettre a jour | `/api/templates/:id` | PUT | A tester |
| Supprimer | `/api/templates/:id` | DELETE | A tester |
| Modeles email | `/api/email-templates` | GET | A tester |
| Modeles facture | `/api/invoice-templates` | GET | A tester |
| Dupliquer modele | `/api/templates/:id/duplicate` | POST | A tester |

---

## 23. FINANCE

### 23.1 Tresorerie (Cashflow)

| Action | Endpoint | Methode | Statut |
|--------|----------|---------|--------|
| Prevision automatique | `/api/cashflow/forecast` | GET | A tester |
| Lister previsions | `/api/cashflow/forecasts` | GET | A tester |
| Creer prevision | `/api/cashflow/forecasts` | POST | A tester |
| Detail prevision | `/api/cashflow/forecasts/:id` | GET | A tester |
| Ajouter ligne | `/api/cashflow/forecasts/:id/items` | POST | A tester |
| Marquer comme realise | `/api/cashflow/items/:itemId/realize` | POST | A tester |
| Generer prevision auto | `/api/cashflow/forecasts/generate` | POST | A tester |
| Vue mensuelle | `/api/cashflow/monthly/:year` | GET | A tester |

### 23.2 Rapprochement bancaire

| Action | Endpoint | Methode | Statut |
|--------|----------|---------|--------|
| Vue d'ensemble | `/api/bank` | GET | A tester |
| Vue reconciliation | `/api/bank/reconciliation` | GET | A tester |
| Lister comptes bancaires | `/api/bank/accounts` | GET | A tester |
| Creer compte bancaire | `/api/bank/accounts` | POST | A tester |
| Mettre a jour compte | `/api/bank/accounts/:id` | PUT | A tester |
| Transactions d'un compte | `/api/bank/accounts/:accountId/transactions` | GET | A tester |
| Ajouter transaction | `/api/bank/accounts/:accountId/transactions` | POST | A tester |
| Importer releve CSV | `/api/bank/accounts/:accountId/import` | POST | A tester |
| Suggestions rapprochement | `/api/bank/suggestions` | GET | A tester |
| Rapprocher avec facture | `/api/bank/transactions/:transactionId/match-invoice` | POST | A tester |
| Rapprocher avec depense | `/api/bank/transactions/:transactionId/match-expense` | POST | A tester |
| Ignorer transaction | `/api/bank/transactions/:transactionId/ignore` | POST | A tester |
| Annuler rapprochement | `/api/bank/transactions/:transactionId/unmatch` | POST | A tester |
| Rapprochement auto | `/api/bank/accounts/:accountId/auto-match` | POST | A tester |
| Statistiques | `/api/bank/stats` | GET | A tester |

### 23.3 Comptabilite

| Action | Endpoint | Methode | Statut |
|--------|----------|---------|--------|
| Compte de resultat | `/api/accounting/income-statement` | GET | A tester |
| Resultat mensuel | `/api/accounting/income-statement/monthly/:year` | GET | A tester |
| Plan comptable | `/api/accounting/chart-of-accounts` | GET | A tester |
| Liste devises | `/api/accounting/currencies` | GET | A tester |
| Taux de change | `/api/accounting/exchange-rates` | GET | A tester |
| Ajouter taux | `/api/accounting/exchange-rates` | POST | A tester |
| Convertir montant | `/api/accounting/convert` | POST | A tester |
| Export comptable | `/api/accounting/export` | GET | A tester |

### 23.4 Balance agee

| Action | Endpoint | Methode | Statut |
|--------|----------|---------|--------|
| Balance agee clients | `/api/aged-balance` | GET | A tester |
| Balance agee fournisseurs | `/api/aged-balance/suppliers` | GET | A tester |
| Detail client | `/api/aged-balance/customer/:customerId` | GET | A tester |

### 23.5 TVA

| Action | Endpoint | Methode | Statut |
|--------|----------|---------|--------|
| Taux TVA | `/api/vat/rates` | GET | A tester |
| Declaration TVA | `/api/vat/declaration` | GET | A tester |
| Exporter declaration | `/api/vat/export` | GET | A tester |

---

## 24. PARAMETRES

### 24.1 Profil entreprise

| Action | Endpoint | Methode | Statut |
|--------|----------|---------|--------|
| Recuperer profil | `/api/company-profile` | GET | A tester |
| Creer profil | `/api/company-profile` | POST | A tester |
| Mettre a jour profil | `/api/company-profile` | PUT | A tester |
| Supprimer profil | `/api/company-profile` | DELETE | A tester |

### 24.2 Parametres generaux

| Action | Endpoint | Methode | Statut |
|--------|----------|---------|--------|
| Tous les parametres | `/api/settings` | GET | A tester |
| Parametres organisation | `/api/settings/organization` | GET | A tester |
| Modifier organisation | `/api/settings/organization` | PUT | A tester |
| Preferences utilisateur | `/api/settings/user` | GET | A tester |
| Modifier preferences | `/api/settings/user` | PUT | A tester |
| Integrations | `/api/settings/integrations` | GET | A tester |
| Notifications | `/api/settings/notifications` | GET | A tester |
| Parametres numerotation | `/api/settings/numbering` | GET | A tester |

### 24.3 Parametres juridiques

| Action | Endpoint | Methode | Statut |
|--------|----------|---------|--------|
| Recuperer parametres | `/api/legal-settings` | GET | A tester |
| Modifier parametres | `/api/legal-settings` | PUT | A tester |

### 24.4 Numerotation

| Action | Endpoint | Methode | Statut |
|--------|----------|---------|--------|
| Parametres numerotation | `/api/numbering` | GET | A tester |
| Modifier numerotation | `/api/numbering` | PUT | A tester |
| Prochain numero | `/api/numbering/:type/next` | GET | A tester |

---

## 25. ANALYTICS ET RAPPORTS

### 25.1 Analytics

| Action | Endpoint | Methode | Statut |
|--------|----------|---------|--------|
| Vue d'ensemble | `/api/analytics` | GET | A tester |
| Dashboard stats | `/api/analytics/dashboard` | GET | A tester |
| Analytics ventes | `/api/analytics/sales` | GET | A tester |
| Ventes par periode | `/api/analytics/sales-by-period` | GET | A tester |
| Top clients | `/api/analytics/top-customers` | GET | A tester |
| Top produits | `/api/analytics/top-products` | GET | A tester |
| Taux conversion devis | `/api/analytics/quotes-conversion` | GET | A tester |
| Activite recente | `/api/analytics/recent-activity` | GET | A tester |
| Produits stock bas | `/api/analytics/low-stock` | GET | A tester |
| Devis en attente | `/api/analytics/pending-quotes` | GET | A tester |
| Taches du jour | `/api/analytics/tasks-today` | GET | A tester |
| Quick stats | `/api/analytics/quick-stats` | GET | A tester |
| Scores leads | `/api/analytics/lead-scores` | GET | A tester |
| Etapes pipeline | `/api/analytics/pipeline-stages` | GET | A tester |
| Previsions | `/api/analytics/forecasting` | GET | A tester |
| Revenue analytics | `/api/analytics/revenue` | GET | A tester |
| Contacts analytics | `/api/analytics/contacts` | GET | A tester |

### 25.2 Dashboard

| Action | Endpoint | Methode | Statut |
|--------|----------|---------|--------|
| Dashboard principal | `/api/dashboard` | GET | A tester |
| Ventes par periode | `/api/dashboard/sales-by-period` | GET | A tester |
| Top clients | `/api/dashboard/top-customers` | GET | A tester |
| Top produits | `/api/dashboard/top-products` | GET | A tester |
| Activite recente | `/api/dashboard/recent-activity` | GET | A tester |
| Quick stats | `/api/dashboard/quick-stats` | GET | A tester |
| Stats generales | `/api/dashboard/stats` | GET | A tester |
| KPIs | `/api/dashboard/kpis` | GET | A tester |
| Revenue | `/api/dashboard/revenue` | GET | A tester |
| Cashflow | `/api/dashboard/cashflow` | GET | A tester |
| Metriques factures | `/api/dashboard/invoices-metrics` | GET | A tester |
| Metriques clients | `/api/dashboard/customer-metrics` | GET | A tester |
| Projections | `/api/dashboard/projections` | GET | A tester |
| Creer projection | `/api/dashboard/projections` | POST | A tester |

### 25.3 Rapports

| Action | Endpoint | Methode | Statut |
|--------|----------|---------|--------|
| Rapport ventes | `/api/reports/sales` | GET | A tester |
| Rapport clients | `/api/reports/customers` | GET | A tester |
| Rapport produits | `/api/reports/products` | GET | A tester |
| Rapport pipeline | `/api/reports/pipeline` | GET | A tester |
| Rapport activites | `/api/reports/activities` | GET | A tester |

---

## 26. EXPORTS

| Action | Endpoint | Methode | Statut |
|--------|----------|---------|--------|
| Export contacts | `/api/exports/contacts` | GET | A tester |
| Export factures | `/api/exports/invoices` | GET | A tester |
| Export devis | `/api/exports/quotes` | GET | A tester |
| Export produits | `/api/exports/products` | GET | A tester |
| Export clients | `/api/exports/customers` | GET | A tester |
| Export paiements | `/api/exports/payments` | GET | A tester |
| Export comptable | `/api/exports/accounting` | GET | A tester |
| Historique exports | `/api/exports/history` | GET | A tester |

---

## 27. IMPORTS

| Action | Endpoint | Methode | Statut |
|--------|----------|---------|--------|
| Importer contacts | `/api/import/contacts` | POST | A tester |
| Importer produits | `/api/import/products` | POST | A tester |
| Importer clients | `/api/import/customers` | POST | A tester |
| Modele import contacts | `/api/import/templates/contacts` | GET | A tester |
| Modele import produits | `/api/import/templates/products` | GET | A tester |
| Historique imports | `/api/import/history` | GET | A tester |

---

## 28. DOCUMENTS COMMERCIAUX ADDITIONNELS

### 28.1 Bons de commande (Purchase Orders)

| Action | Endpoint | Methode | Statut |
|--------|----------|---------|--------|
| Lister | `/api/purchase-orders` | GET | A tester |
| Creer | `/api/purchase-orders` | POST | A tester |
| Recuperer | `/api/purchase-orders/:id` | GET | A tester |
| Mettre a jour | `/api/purchase-orders/:id` | PUT | A tester |
| Supprimer | `/api/purchase-orders/:id` | DELETE | A tester |
| Recevoir commande | `/api/purchase-orders/:id/receive` | POST | A tester |

### 28.2 Bons de livraison (Delivery Notes)

| Action | Endpoint | Methode | Statut |
|--------|----------|---------|--------|
| Lister | `/api/delivery-notes` | GET | A tester |
| Creer | `/api/delivery-notes` | POST | A tester |
| Recuperer | `/api/delivery-notes/:id` | GET | A tester |
| Mettre a jour | `/api/delivery-notes/:id` | PUT | A tester |
| Supprimer | `/api/delivery-notes/:id` | DELETE | A tester |
| Creer depuis facture | `/api/delivery-notes/from-invoice/:invoiceId` | POST | A tester |

### 28.3 Factures proforma

| Action | Endpoint | Methode | Statut |
|--------|----------|---------|--------|
| Lister | `/api/proforma` | GET | A tester |
| Creer | `/api/proforma` | POST | A tester |
| Recuperer | `/api/proforma/:id` | GET | A tester |
| Mettre a jour | `/api/proforma/:id` | PUT | A tester |
| Supprimer | `/api/proforma/:id` | DELETE | A tester |
| Convertir en facture | `/api/proforma/:id/convert` | POST | A tester |

### 28.4 Retours

| Action | Endpoint | Methode | Statut |
|--------|----------|---------|--------|
| Lister retours | `/api/return-orders` | GET | A tester |
| Creer retour | `/api/return-orders` | POST | A tester |
| Recuperer | `/api/return-orders/:id` | GET | A tester |
| Mettre a jour | `/api/return-orders/:id` | PUT | A tester |
| Traiter retour | `/api/return-orders/:id/process` | POST | A tester |

---

## 29. AUTRES FONCTIONNALITES

### 29.1 Recherche globale

| Action | Endpoint | Methode | Statut |
|--------|----------|---------|--------|
| Recherche globale | `/api/search` | GET | A tester |
| Recherche contacts | `/api/search/contacts` | GET | A tester |
| Recherche produits | `/api/search/products` | GET | A tester |
| Recherche factures | `/api/search/invoices` | GET | A tester |

### 29.2 Operations en masse

| Action | Endpoint | Methode | Statut |
|--------|----------|---------|--------|
| Suppression en masse | `/api/bulk/delete` | POST | A tester |
| Mise a jour en masse | `/api/bulk/update` | POST | A tester |
| Export en masse | `/api/bulk/export` | POST | A tester |

### 29.3 Notifications

| Action | Endpoint | Methode | Statut |
|--------|----------|---------|--------|
| Lister notifications | `/api/notifications` | GET | A tester |
| Marquer comme lue | `/api/notifications/:id/read` | POST | A tester |
| Marquer toutes comme lues | `/api/notifications/read-all` | POST | A tester |
| Supprimer | `/api/notifications/:id` | DELETE | A tester |
| Parametres | `/api/notifications/settings` | GET | A tester |

### 29.4 Webhooks

| Action | Endpoint | Methode | Statut |
|--------|----------|---------|--------|
| Lister webhooks | `/api/webhooks` | GET | A tester |
| Creer webhook | `/api/webhooks` | POST | A tester |
| Recuperer | `/api/webhooks/:id` | GET | A tester |
| Mettre a jour | `/api/webhooks/:id` | PUT | A tester |
| Supprimer | `/api/webhooks/:id` | DELETE | A tester |
| Tester webhook | `/api/webhooks/:id/test` | POST | A tester |
| Logs webhook | `/api/webhooks/:id/logs` | GET | A tester |

### 29.5 Logs

| Action | Endpoint | Methode | Statut |
|--------|----------|---------|--------|
| Logs d'audit | `/api/logs/audit` | GET | A tester |
| Logs systeme | `/api/logs/system` | GET | A tester |
| Logs utilisateur | `/api/logs/user/:userId` | GET | A tester |

### 29.6 QR Code et Factur-X

| Action | Endpoint | Methode | Statut |
|--------|----------|---------|--------|
| Generer QR code | `/api/qrcode/generate` | POST | A tester |
| QR code facture | `/api/qrcode/invoice/:invoiceId` | GET | A tester |
| Generer Factur-X | `/api/facturx/generate/:invoiceId` | GET | A tester |
| Parser Factur-X | `/api/facturx/parse` | POST | A tester |

### 29.7 Showcase (Vitrine)

| Action | Endpoint | Methode | Statut |
|--------|----------|---------|--------|
| Produits vitrine | `/api/showcase` | GET | A tester |
| Configurer vitrine | `/api/showcase/config` | PUT | A tester |
| Catalogue public | `/api/catalog` | GET | A tester |

### 29.8 Livraison

| Action | Endpoint | Methode | Statut |
|--------|----------|---------|--------|
| Methodes livraison | `/api/shipping/methods` | GET | A tester |
| Calculer frais | `/api/shipping/calculate` | POST | A tester |
| Suivre livraison | `/api/shipping/track/:trackingNumber` | GET | A tester |

---

## RESUME

### Nombre total d'actions identifiees: **~350 endpoints**

### Repartition par module:

| Module | Nombre d'endpoints |
|--------|-------------------|
| Authentification | 12 |
| Contacts | 13 |
| Leads | 10 |
| Deals | 10 |
| Pipeline | 11 |
| Devis | 18 |
| Factures | 23 |
| Avoirs | 10 |
| Paiements | 15 |
| Relances | 10 |
| Produits | 15 |
| Stock | 6 |
| Clients | 8 |
| Fournisseurs | 5 |
| Depenses | 7 |
| Taches | 10 |
| Activites | 12 |
| Documents | 10 |
| Equipes/Permissions | 15 |
| Workflows | 8 |
| Campagnes email | 9 |
| Templates | 8 |
| Finance (Cashflow, Banque, Compta) | 35 |
| Parametres | 18 |
| Analytics/Dashboard | 35 |
| Exports/Imports | 15 |
| Documents commerciaux | 18 |
| Autres (Search, Bulk, etc.) | 25 |

---

## NOTES IMPORTANTES

### Multi-Tenancy
Tous les endpoints necessitant une authentification doivent filtrer les donnees par `organization_id`. Ceci est critique pour la securite des donnees entre organisations.

### Soft Deletes
La plupart des entites utilisent `deleted_at` pour les suppressions logiques. Les requetes doivent toujours filtrer `WHERE deleted_at IS NULL`.

### Pagination
Tous les endpoints de liste supportent la pagination avec `page` et `limit` comme query parameters.

### Tests prioritaires
1. **Authentification** - Critique pour la securite
2. **Factures/Paiements** - Critique pour le business
3. **Contacts/Leads/Deals** - Fonctionnalites CRM core
4. **Multi-tenancy** - Securite des donnees

---

*Rapport genere automatiquement par l'analyse du code source de Simplix CRM*
