#!/bin/bash
# Ce script doit être exécuté dans le TERMINAL PLESK directement

set -e

echo "📦 Déploiement Frontend Simplix CRM"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Vérifier si on est root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Ce script doit être exécuté en tant que root dans le terminal Plesk"
    exit 1
fi

# Créer répertoire web
echo "📂 Création du répertoire web..."
mkdir -p /var/www/simplix/web
cd /var/www/simplix/web

# Note: Le fichier dist.tar.gz doit être uploadé via File Manager Plesk dans /var/www/simplix/
if [ ! -f "/var/www/simplix/dist.tar.gz" ]; then
    echo "⚠️  Le fichier dist.tar.gz n'est pas trouvé !"
    echo ""
    echo "📤 UPLOADEZ D'ABORD dist.tar.gz via Plesk File Manager :"
    echo "   1. Allez dans Domains > simplix.drive.paraweb.fr > File Manager"
    echo "   2. Naviguez vers /var/www/simplix/"
    echo "   3. Uploadez le fichier dist.tar.gz (disponible localement)"
    echo ""
    echo "   Puis relancez ce script"
    exit 1
fi

# Extraire le frontend
echo "📦 Extraction du frontend..."
rm -rf /var/www/simplix/web/*
cd /var/www/simplix/web
tar -xzf /var/www/simplix/dist.tar.gz

# Permissions
echo "🔒 Configuration des permissions..."
chown -R www-data:www-data /var/www/simplix/web
chmod -R 755 /var/www/simplix/web

# Configurer Nginx
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

    # Serve frontend (SPA routing)
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

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
NGINX_CONFIG

# Vérifier la configuration Nginx
echo "🔍 Test de la configuration Nginx..."
nginx -t

# Recharger Nginx
echo "🔄 Rechargement de Nginx..."
systemctl reload nginx

# Vérifier les services
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ DÉPLOIEMENT RÉUSSI !"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 État des services :"
echo "   Nginx : $(systemctl is-active nginx)"
echo "   PM2   : $(pm2 list 2>/dev/null | grep -q online && echo 'online' || echo 'offline')"
echo ""
echo "🌐 Accédez à votre application :"
echo "   https://simplix.drive.paraweb.fr"
echo ""
echo "🔐 Identifiants :"
echo "   Email    : admin@simplix.fr"
echo "   Password : admin123"
echo ""
echo "📁 Fichiers déployés :"
ls -lh /var/www/simplix/web/ | head -10
