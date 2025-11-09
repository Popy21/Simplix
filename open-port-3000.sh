#!/bin/bash

# Ouvrir le port 3000 pour accès direct à l'API Simplix
echo "🔓 Ouverture du port 3000 dans le firewall..."
ufw allow 3000/tcp
ufw status

echo ""
echo "✅ Port 3000 ouvert !"
echo ""
echo "🌐 Accédez maintenant à l'API Simplix:"
echo ""
SERVER_IP=$(curl -s ifconfig.me)
echo "   📊 API Documentation: http://${SERVER_IP}:3000/api-docs"
echo "   🏥 Health Check:      http://${SERVER_IP}:3000/health"
echo "   🔐 API Base:          http://${SERVER_IP}:3000/api"
echo ""
echo "🔐 Credentials de test:"
echo "   Email:    admin@simplix-demo.fr"
echo "   Password: Test1234!"
echo ""

# Test
echo "🧪 Test de l'API..."
if curl -s http://localhost:3000/health | grep -q "ok"; then
    echo "   ✅ API fonctionne !"
    curl -s http://localhost:3000/health | python3 -m json.tool 2>/dev/null || curl -s http://localhost:3000/health
else
    echo "   ❌ API ne répond pas"
    echo ""
    echo "Redémarrage de l'API..."
    pm2 restart simplix-api
    sleep 3
    echo "   Réessai..."
    curl -s http://localhost:3000/health
fi

echo ""
echo "🎉 Simplix est accessible sur le port 3000 !"
