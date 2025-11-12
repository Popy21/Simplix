#!/bin/bash
set -e

SERVER="root@82.165.134.105"
PASSWORD="uF.6734Simplix"

echo "📦 Déploiement du frontend Simplix..."

# Créer le répertoire web sur le serveur
sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no "$SERVER" << 'EOF'
mkdir -p /var/www/simplix/web
EOF

# Envoyer l'archive
echo "📤 Upload du frontend..."
sshpass -p "$PASSWORD" scp -o StrictHostKeyChecking=no dist.tar.gz "$SERVER:/tmp/"

# Extraire sur le serveur
echo "📂 Extraction sur le serveur..."
sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no "$SERVER" << 'EOF'
cd /var/www/simplix/web
rm -rf *
tar -xzf /tmp/dist.tar.gz
rm /tmp/dist.tar.gz
chown -R www-data:www-data /var/www/simplix/web
chmod -R 755 /var/www/simplix/web
EOF

# Configurer Nginx
echo "⚙️  Configuration Nginx..."
sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no "$SERVER" << 'EOF'
cat > /etc/nginx/sites-available/simplix.drive.paraweb.fr << 'NGINX_EOF'
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

    # Serve frontend static files
    location / {
        try_files $uri $uri/ /index.html;
        expires 1y;
        add_header Cache-Control "public, immutable";
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

    # Uploads directory
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
NGINX_EOF

# Tester et recharger Nginx
nginx -t
systemctl reload nginx

echo "✅ Nginx configuré et rechargé"
EOF

echo "✅ Déploiement du frontend terminé !"
echo ""
echo "🌐 Accédez à votre application sur :"
echo "   https://simplix.drive.paraweb.fr"
echo ""
echo "🔐 Identifiants :"
echo "   Email: admin@simplix.fr"
echo "   Password: admin123"
