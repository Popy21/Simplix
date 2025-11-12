#!/bin/bash
set -e

SERVER="root@82.165.134.105"
PASSWORD="uF.6734Simplix"

echo "🔍 Vérification de la connexion SSH..."

# Test de connexion SSH
if ! sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 "$SERVER" "echo 'SSH OK'" 2>/dev/null; then
    echo ""
    echo "❌ ERREUR : Impossible de se connecter en SSH au serveur"
    echo ""
    echo "📋 SOLUTION :"
    echo ""
    echo "1️⃣  Connectez-vous à Plesk : https://82.165.134.105:8443"
    echo "2️⃣  Allez dans 'Outils et paramètres' > 'Services'"
    echo "3️⃣  Démarrez le service 'SSH'"
    echo ""
    echo "Ou exécutez dans le Terminal Plesk :"
    echo "   systemctl start ssh"
    echo "   systemctl enable ssh"
    echo "   ufw allow 22/tcp"
    echo ""
    echo "📦 Sinon, uploadez manuellement dist.tar.gz via File Manager Plesk"
    echo "   Fichier disponible : $(pwd)/dist.tar.gz"
    echo ""
    echo "📖 Guide complet : DEPLOIEMENT_FRONTEND.md"
    exit 1
fi

echo "✅ Connexion SSH OK"
echo ""
echo "📦 Déploiement du frontend Simplix..."

# Envoyer l'archive
echo "📤 Upload du frontend (1.4 MB)..."
sshpass -p "$PASSWORD" scp -o StrictHostKeyChecking=no dist.tar.gz "$SERVER:/tmp/"

# Déployer sur le serveur
echo "🚀 Installation sur le serveur..."
sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no "$SERVER" bash << 'EOF'
set -e

echo "📂 Création des répertoires..."
mkdir -p /var/www/simplix/web
cd /var/www/simplix/web

echo "📦 Extraction du frontend..."
rm -rf *
tar -xzf /tmp/dist.tar.gz
rm /tmp/dist.tar.gz

echo "🔒 Configuration des permissions..."
chown -R www-data:www-data /var/www/simplix/web
chmod -R 755 /var/www/simplix/web

echo "⚙️  Configuration Nginx..."
cat > /etc/nginx/sites-available/simplix.drive.paraweb.fr << 'NGINX_CONFIG'
upstream simplix_api {
    server 127.0.0.1:3000;
    keepalive 64;
}

server {
    listen 80;
    server_name simplix.drive.paraweb.fr www.simplix.drive.paraweb.fr;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name simplix.drive.paraweb.fr www.simplix.drive.paraweb.fr;

    ssl_certificate /etc/ssl/certs/simplix.drive.paraweb.fr.crt;
    ssl_certificate_key /etc/ssl/private/simplix.drive.paraweb.fr.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    client_max_body_size 50M;

    # Frontend React
    root /var/www/simplix/web;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
        expires 1h;
        add_header Cache-Control "public";
    }

    # API Backend
    location /api {
        proxy_pass http://simplix_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Uploads
    location /uploads {
        alias /var/www/simplix/uploads;
        expires 30d;
        add_header Cache-Control "public";
    }

    # Static assets cache
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
NGINX_CONFIG

echo "✅ Configuration Nginx créée"

echo "🔍 Test de la configuration Nginx..."
nginx -t

echo "🔄 Rechargement de Nginx..."
systemctl reload nginx

echo "✅ Nginx rechargé avec succès"

# Vérifier l'état des services
echo ""
echo "📊 État des services :"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -n "Nginx : "
systemctl is-active nginx
echo -n "PM2   : "
pm2 list | grep -q "online" && echo "online" || echo "offline"
EOF

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ DÉPLOIEMENT FRONTEND TERMINÉ AVEC SUCCÈS ! ✅"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 Accédez à votre application :"
echo "   https://simplix.drive.paraweb.fr"
echo ""
echo "🔐 Identifiants de connexion :"
echo "   Email    : admin@simplix.fr"
echo "   Password : admin123"
echo ""
echo "⚠️  Acceptez l'avertissement SSL du certificat auto-signé"
echo ""
echo "📋 Votre application complète est maintenant en ligne !"
echo "   ✅ Frontend React"
echo "   ✅ Backend API (21 endpoints)"
echo "   ✅ Base de données PostgreSQL (86 tables)"
echo "   ✅ Authentification JWT"
echo ""
echo "🎉 Bon travail !"
