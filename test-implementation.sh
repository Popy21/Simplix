#!/bin/bash

# Script de test de l'implémentation complète de Simplix CRM
# Ce script teste toutes les catégories d'actions utilisateur

API_URL="http://localhost:3000/api"
TOKEN=""
USER_ID=""

# Couleurs pour l'affichage
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction pour afficher les résultats
print_result() {
    local category=$1
    local action=$2
    local status=$3

    if [ "$status" = "OK" ]; then
        echo -e "${GREEN}✓${NC} ${BLUE}[$category]${NC} $action"
    elif [ "$status" = "SKIP" ]; then
        echo -e "${YELLOW}⊘${NC} ${BLUE}[$category]${NC} $action (Non implémenté)"
    else
        echo -e "${RED}✗${NC} ${BLUE}[$category]${NC} $action"
    fi
}

print_header() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Fonction pour tester un endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local category=$3
    local action=$4
    local data=$5

    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" -X GET "$API_URL$endpoint" \
            -H "Authorization: Bearer $TOKEN" 2>/dev/null)
    elif [ "$method" = "POST" ]; then
        response=$(curl -s -w "\n%{http_code}" -X POST "$API_URL$endpoint" \
            -H "Authorization: Bearer $TOKEN" \
            -H "Content-Type: application/json" \
            -d "$data" 2>/dev/null)
    elif [ "$method" = "PUT" ]; then
        response=$(curl -s -w "\n%{http_code}" -X PUT "$API_URL$endpoint" \
            -H "Authorization: Bearer $TOKEN" \
            -H "Content-Type: application/json" \
            -d "$data" 2>/dev/null)
    elif [ "$method" = "DELETE" ]; then
        response=$(curl -s -w "\n%{http_code}" -X DELETE "$API_URL$endpoint" \
            -H "Authorization: Bearer $TOKEN" 2>/dev/null)
    fi

    http_code=$(echo "$response" | tail -n1)

    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        print_result "$category" "$action" "OK"
        return 0
    elif [ "$http_code" -eq 404 ]; then
        print_result "$category" "$action" "SKIP"
        return 1
    else
        print_result "$category" "$action" "FAIL (HTTP $http_code)"
        return 1
    fi
}

# ═══════════════════════════════════════════════════════════
# CATÉGORIE 1: AUTHENTIFICATION
# ═══════════════════════════════════════════════════════════
test_authentication() {
    print_header "1. AUTHENTIFICATION (6 actions)"

    # Login
    login_response=$(curl -s -X POST "$API_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"email":"admin@admin.com","password":"Admin123"}')

    TOKEN=$(echo "$login_response" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    USER_ID=$(echo "$login_response" | grep -o '"id":"[^"]*' | cut -d'"' -f4)

    if [ -n "$TOKEN" ]; then
        print_result "Authentification" "Login" "OK"
    else
        print_result "Authentification" "Login" "FAIL"
        echo "Impossible de continuer sans token"
        exit 1
    fi

    # Get current user
    test_endpoint "GET" "/auth/me" "Authentification" "Récupérer profil utilisateur"

    # Validate password
    test_endpoint "POST" "/auth/validate-password" "Authentification" "Valider mot de passe" '{"password":"Test123!"}'

    # Refresh token (besoin du refresh token)
    refresh_token=$(echo "$login_response" | grep -o '"refreshToken":"[^"]*' | cut -d'"' -f4)
    if [ -n "$refresh_token" ]; then
        test_endpoint "POST" "/auth/refresh" "Authentification" "Rafraîchir token" "{\"refreshToken\":\"$refresh_token\"}"
    fi
}

# ═══════════════════════════════════════════════════════════
# CATÉGORIE 2: CONTACTS
# ═══════════════════════════════════════════════════════════
test_contacts() {
    print_header "2. GESTION DES CONTACTS (9 actions)"

    test_endpoint "GET" "/contacts" "Contacts" "Lister contacts"
    test_endpoint "GET" "/contacts?page=1&limit=10" "Contacts" "Pagination contacts"
    test_endpoint "GET" "/contacts?search=test" "Contacts" "Recherche contacts"

    # Créer un contact
    create_response=$(curl -s -X POST "$API_URL/contacts" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"first_name":"Test","last_name":"Contact","email":"test@contact.com","phone":"0123456789"}')

    contact_id=$(echo "$create_response" | grep -o '"id":"[^"]*' | cut -d'"' -f4)

    if [ -n "$contact_id" ]; then
        print_result "Contacts" "Créer contact" "OK"
        test_endpoint "GET" "/contacts/$contact_id" "Contacts" "Récupérer contact par ID"
        test_endpoint "PUT" "/contacts/$contact_id" "Contacts" "Modifier contact" '{"first_name":"Test Updated"}'
        test_endpoint "GET" "/contacts/$contact_id/activities" "Contacts" "Activités du contact"
        test_endpoint "GET" "/contacts/$contact_id/deals" "Contacts" "Deals du contact"
        test_endpoint "DELETE" "/contacts/$contact_id" "Contacts" "Supprimer contact"
    else
        print_result "Contacts" "Créer contact" "FAIL"
    fi

    test_endpoint "GET" "/contacts/deleted" "Contacts" "Contacts supprimés"
}

# ═══════════════════════════════════════════════════════════
# CATÉGORIE 3: ENTREPRISES
# ═══════════════════════════════════════════════════════════
test_companies() {
    print_header "3. GESTION DES ENTREPRISES (6 actions)"

    test_endpoint "GET" "/companies" "Entreprises" "Lister entreprises"
    test_endpoint "GET" "/companies?search=test" "Entreprises" "Recherche entreprises"

    # Tester avec une entreprise existante
    companies=$(curl -s -X GET "$API_URL/companies" -H "Authorization: Bearer $TOKEN")
    company_id=$(echo "$companies" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

    if [ -n "$company_id" ]; then
        test_endpoint "GET" "/companies/$company_id" "Entreprises" "Récupérer entreprise par ID"
        test_endpoint "GET" "/companies/$company_id/contacts" "Entreprises" "Contacts de l'entreprise"
    fi
}

# ═══════════════════════════════════════════════════════════
# CATÉGORIE 4: PRODUITS
# ═══════════════════════════════════════════════════════════
test_products() {
    print_header "4. GESTION DES PRODUITS (7 actions)"

    test_endpoint "GET" "/products" "Produits" "Lister produits"
    test_endpoint "GET" "/products?page=1&limit=10" "Produits" "Pagination produits"

    # Récupérer un produit existant
    products=$(curl -s -X GET "$API_URL/products" -H "Authorization: Bearer $TOKEN")
    product_id=$(echo "$products" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

    if [ -n "$product_id" ]; then
        test_endpoint "GET" "/products/$product_id" "Produits" "Récupérer produit par ID"
        test_endpoint "PUT" "/products/$product_id" "Produits" "Modifier produit" '{"name":"Produit Test"}'
    fi
}

# ═══════════════════════════════════════════════════════════
# CATÉGORIE 5: DEVIS
# ═══════════════════════════════════════════════════════════
test_quotes() {
    print_header "5. GESTION DES DEVIS (9 actions)"

    test_endpoint "GET" "/quotes" "Devis" "Lister devis"
    test_endpoint "GET" "/quotes?status=draft" "Devis" "Filtrer devis par statut"

    # Récupérer un devis existant
    quotes=$(curl -s -X GET "$API_URL/quotes" -H "Authorization: Bearer $TOKEN")
    quote_id=$(echo "$quotes" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

    if [ -n "$quote_id" ]; then
        test_endpoint "GET" "/quotes/$quote_id" "Devis" "Récupérer devis par ID"
        test_endpoint "GET" "/quotes/$quote_id/items" "Devis" "Lignes du devis"
        test_endpoint "PUT" "/quotes/$quote_id" "Devis" "Modifier devis" '{"notes":"Test update"}'
    fi
}

# ═══════════════════════════════════════════════════════════
# CATÉGORIE 6: FACTURES
# ═══════════════════════════════════════════════════════════
test_invoices() {
    print_header "6. GESTION DES FACTURES (10 actions)"

    test_endpoint "GET" "/invoices" "Factures" "Lister factures"
    test_endpoint "GET" "/invoices?status=pending" "Factures" "Filtrer factures par statut"

    # Récupérer une facture existante
    invoices=$(curl -s -X GET "$API_URL/invoices" -H "Authorization: Bearer $TOKEN")
    invoice_id=$(echo "$invoices" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

    if [ -n "$invoice_id" ]; then
        test_endpoint "GET" "/invoices/$invoice_id" "Factures" "Récupérer facture par ID"
        test_endpoint "GET" "/invoices/$invoice_id/items" "Factures" "Lignes de la facture"
        test_endpoint "GET" "/invoices/$invoice_id/payments" "Factures" "Paiements de la facture"
    fi

    test_endpoint "GET" "/invoices/overdue" "Factures" "Factures en retard"
}

# ═══════════════════════════════════════════════════════════
# CATÉGORIE 7: PAIEMENTS
# ═══════════════════════════════════════════════════════════
test_payments() {
    print_header "7. GESTION DES PAIEMENTS (6 actions)"

    test_endpoint "GET" "/payments" "Paiements" "Lister paiements"
    test_endpoint "GET" "/payments?page=1&limit=10" "Paiements" "Pagination paiements"
    test_endpoint "GET" "/payments/stats/summary" "Paiements" "Statistiques paiements"
}

# ═══════════════════════════════════════════════════════════
# CATÉGORIE 8: DÉPENSES
# ═══════════════════════════════════════════════════════════
test_expenses() {
    print_header "8. GESTION DES DÉPENSES (7 actions)"

    test_endpoint "GET" "/expenses" "Dépenses" "Lister dépenses"
    test_endpoint "GET" "/expenses?page=1&limit=10" "Dépenses" "Pagination dépenses"
    test_endpoint "GET" "/expenses/stats/summary" "Dépenses" "Statistiques dépenses"
    test_endpoint "GET" "/expenses/by-category" "Dépenses" "Dépenses par catégorie"
}

# ═══════════════════════════════════════════════════════════
# CATÉGORIE 9: TÂCHES
# ═══════════════════════════════════════════════════════════
test_tasks() {
    print_header "9. GESTION DES TÂCHES (8 actions)"

    test_endpoint "GET" "/tasks" "Tâches" "Lister tâches"
    test_endpoint "GET" "/tasks/today" "Tâches" "Tâches du jour"
    test_endpoint "GET" "/tasks/overdue" "Tâches" "Tâches en retard"
}

# ═══════════════════════════════════════════════════════════
# CATÉGORIE 10: DEALS
# ═══════════════════════════════════════════════════════════
test_deals() {
    print_header "10. GESTION DES DEALS (8 actions)"

    test_endpoint "GET" "/deals" "Deals" "Lister deals"
    test_endpoint "GET" "/deals?status=active" "Deals" "Filtrer deals par statut"
    test_endpoint "GET" "/deals/stats/summary" "Deals" "Statistiques deals"
}

# ═══════════════════════════════════════════════════════════
# CATÉGORIE 11: LEADS
# ═══════════════════════════════════════════════════════════
test_leads() {
    print_header "11. GESTION DES LEADS (8 actions)"

    test_endpoint "GET" "/leads" "Leads" "Lister leads"
    test_endpoint "GET" "/leads?status=new" "Leads" "Filtrer leads par statut"
    test_endpoint "GET" "/leads/stats/by-source" "Leads" "Statistiques par source"
}

# ═══════════════════════════════════════════════════════════
# CATÉGORIE 12: PIPELINE
# ═══════════════════════════════════════════════════════════
test_pipeline() {
    print_header "12. GESTION DU PIPELINE (6 actions)"

    test_endpoint "GET" "/pipeline/stages" "Pipeline" "Lister étapes"
    test_endpoint "GET" "/pipeline/overview" "Pipeline" "Vue d'ensemble"
}

# ═══════════════════════════════════════════════════════════
# CATÉGORIE 13: DASHBOARD & ANALYTICS
# ═══════════════════════════════════════════════════════════
test_dashboard() {
    print_header "13. DASHBOARD & ANALYTICS (13 actions)"

    test_endpoint "GET" "/dashboard" "Dashboard" "Statistiques principales"
    test_endpoint "GET" "/dashboard/sales-by-period?period=month" "Dashboard" "Ventes par période"
    test_endpoint "GET" "/dashboard/top-customers?limit=5" "Dashboard" "Top clients"
    test_endpoint "GET" "/dashboard/top-products?limit=5" "Dashboard" "Top produits"
    test_endpoint "GET" "/dashboard/recent-activity?limit=10" "Dashboard" "Activités récentes"
    test_endpoint "GET" "/dashboard/quick-stats" "Dashboard" "Stats rapides"
}

# ═══════════════════════════════════════════════════════════
# CATÉGORIE 14: RECHERCHE
# ═══════════════════════════════════════════════════════════
test_search() {
    print_header "14. RECHERCHE GLOBALE (5 actions)"

    test_endpoint "GET" "/search?q=test" "Recherche" "Recherche globale"
    test_endpoint "GET" "/search/customers?q=test" "Recherche" "Recherche clients"
    test_endpoint "GET" "/search/products?q=test" "Recherche" "Recherche produits"
}

# ═══════════════════════════════════════════════════════════
# CATÉGORIE 15: TEMPLATES
# ═══════════════════════════════════════════════════════════
test_templates() {
    print_header "15. TEMPLATES DE FACTURES (6 actions)"

    test_endpoint "GET" "/templates" "Templates" "Lister templates"
    test_endpoint "GET" "/templates/default/template" "Templates" "Template par défaut"
}

# ═══════════════════════════════════════════════════════════
# CATÉGORIE 16: NOTIFICATIONS
# ═══════════════════════════════════════════════════════════
test_notifications() {
    print_header "16. NOTIFICATIONS (9 actions)"

    test_endpoint "GET" "/notifications/contextual" "Notifications" "Notifications contextuelles"
    test_endpoint "GET" "/notifications/contextual/count" "Notifications" "Compte notifications"

    if [ -n "$USER_ID" ]; then
        test_endpoint "GET" "/notifications/user/$USER_ID" "Notifications" "Notifications utilisateur"
        test_endpoint "GET" "/notifications/user/$USER_ID/unread-count" "Notifications" "Notifications non lues"
    fi
}

# ═══════════════════════════════════════════════════════════
# CATÉGORIE 17: PROFIL ENTREPRISE
# ═══════════════════════════════════════════════════════════
test_company_profile() {
    print_header "17. PROFIL ENTREPRISE (4 actions)"

    test_endpoint "GET" "/company-profile" "Profil Entreprise" "Récupérer profil"
}

# ═══════════════════════════════════════════════════════════
# CATÉGORIE 18: ANALYTICS
# ═══════════════════════════════════════════════════════════
test_analytics() {
    print_header "18. ANALYTICS (rapports)"

    test_endpoint "GET" "/analytics" "Analytics" "Analytics générales"
}

# ═══════════════════════════════════════════════════════════
# CATÉGORIE 19: FOURNISSEURS
# ═══════════════════════════════════════════════════════════
test_suppliers() {
    print_header "19. GESTION DES FOURNISSEURS (6 actions)"

    test_endpoint "GET" "/suppliers" "Fournisseurs" "Lister fournisseurs"
    test_endpoint "GET" "/suppliers/stats/summary" "Fournisseurs" "Statistiques fournisseurs"
}

# ═══════════════════════════════════════════════════════════
# EXÉCUTION DE TOUS LES TESTS
# ═══════════════════════════════════════════════════════════

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                        ║${NC}"
echo -e "${BLUE}║       TESTS D'IMPLÉMENTATION - SIMPLIX CRM             ║${NC}"
echo -e "${BLUE}║                                                        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Vérifier que le serveur est accessible
if ! curl -s "$API_URL/../" > /dev/null; then
    echo -e "${RED}ERREUR: Le serveur API n'est pas accessible à $API_URL${NC}"
    echo "Assurez-vous que le serveur est démarré (npm run dev dans le dossier api/)"
    exit 1
fi

# Exécuter tous les tests
test_authentication
test_contacts
test_companies
test_products
test_quotes
test_invoices
test_payments
test_expenses
test_tasks
test_deals
test_leads
test_pipeline
test_dashboard
test_search
test_templates
test_notifications
test_company_profile
test_analytics
test_suppliers

# Résumé final
echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║              TESTS TERMINÉS                            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
