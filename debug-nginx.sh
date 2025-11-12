#!/bin/bash
# Copiez ce script dans le Terminal Plesk pour diagnostiquer l'erreur 500

echo "🔍 Diagnostic Erreur 500"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "📁 Vérification du répertoire frontend :"
ls -la /var/www/vhosts/simplix.drive.paraweb.fr/simplix.drive.paraweb.fr/ 2>&1 || echo "❌ Répertoire non trouvé"
echo ""

echo "📋 Dernières erreurs Nginx :"
tail -20 /var/log/nginx/error.log
echo ""

echo "📊 État des services :"
echo -n "Nginx : "
systemctl is-active nginx
echo -n "PM2   : "
pm2 list | grep -q online && echo "online" || echo "offline"
echo ""

echo "🔍 Test API backend :"
curl -s http://localhost:3000/ | head -3
