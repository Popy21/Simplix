#!/bin/bash

# =============================================================================
# Configuration DNS via Plesk API
# =============================================================================

SERVER_IP="82.165.134.105"
SERVER_USER="root"
SERVER_PASS='HkVB9iuftdyè(4442212l???'
DOMAIN="paraweb.fr"
SUBDOMAIN="simplix"
FULL_DOMAIN="simplix.paraweb.fr"

echo "🌐 Configuration DNS pour $FULL_DOMAIN"
echo "========================================"
echo ""

# Option 1: Via Plesk CLI
echo "📋 Tentative de configuration via Plesk CLI..."

sshpass -p "$SERVER_PASS" ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "
    # Check if plesk command exists
    if command -v plesk &> /dev/null; then
        echo '✅ Plesk CLI disponible'

        # Add subdomain
        echo '📝 Ajout du sous-domaine...'
        plesk bin subdomain --create $SUBDOMAIN -domain $DOMAIN -www false || echo 'Sous-domaine existe déjà'

        # Add A record
        echo '📝 Ajout de l enregistrement A...'
        plesk bin dns --add $DOMAIN -type A -host $SUBDOMAIN -ip $SERVER_IP || echo 'Enregistrement existe déjà'

        echo '✅ DNS configuré via Plesk CLI'
    else
        echo '⚠️  Plesk CLI non disponible'
        echo 'Vous devez configurer le DNS manuellement via l interface Plesk'
        echo ''
        echo 'Étapes manuelles:'
        echo '1. Allez sur: https://82.165.134.105:8443'
        echo '2. Domaines > paraweb.fr > Paramètres DNS'
        echo '3. Ajoutez un enregistrement A:'
        echo '   - Type: A'
        echo '   - Nom: simplix'
        echo '   - Adresse: 82.165.134.105'
        echo '   - TTL: 3600'
    fi

    echo ''
    echo '🔍 Vérification DNS...'
    sleep 2
    nslookup $FULL_DOMAIN || echo 'DNS pas encore propagé (normal)'
"

echo ""
echo "✅ Configuration terminée!"
echo ""
echo "📋 Prochaines étapes:"
echo "1. Attendez 5-30 minutes pour la propagation DNS"
echo "2. Testez avec: nslookup $FULL_DOMAIN"
echo "3. Une fois le DNS propagé, obtenez le SSL:"
echo "   ssh root@$SERVER_IP 'certbot --nginx -d $FULL_DOMAIN --non-interactive --agree-tos --email admin@$FULL_DOMAIN'"
echo ""
echo "4. Testez l'application: https://$FULL_DOMAIN"
