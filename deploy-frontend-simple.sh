#!/bin/bash

echo "📦 Préparation du déploiement frontend..."
echo ""
echo "⚠️  Le serveur SSH n'est pas accessible actuellement."
echo ""
echo "📋 INSTRUCTIONS MANUELLES DE DÉPLOIEMENT :"
echo ""
echo "1️⃣  Transférer le fichier dist.tar.gz vers le serveur via Plesk File Manager"
echo "    - Connectez-vous à Plesk"
echo "    - Allez dans File Manager"
echo "    - Uploadez dist.tar.gz dans /var/www/simplix/"
echo ""
echo "2️⃣  Connectez-vous en SSH via Plesk Terminal et exécutez :"
echo ""
echo "cat > /tmp/deploy-web.sh << 'EOF'
#!/bin/bash
set -e

# Créer répertoire web
mkdir -p /var/www/simplix/web
cd /var/www/simplix/web

# Extraire le frontend
rm -rf *
tar -xzf /var/www/simplix/dist.tar.gz
rm /var/www/simplix/dist.tar.gz

# Permissions
chown -R www-data:www-data /var/www/simplix/web
chmod -R 755 /var/www/simplix/web

# Configurer Nginx
cat > /etc/nginx/sites-available/simplix.drive.paraweb.fr << 'NGINX_EOF'
upstream simplix_api {
    server 127.0.0.1:3000;
    keepalive 64;
}

server {
    listen 80;
    server_name simplix.drive.paraweb.fr www.simplix.drive.paraweb.fr;
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name simplix.drive.paraweb.fr www.simplix.drive.paraweb.fr;

    ssl_certificate /etc/ssl/certs/simplix.drive.paraweb.fr.crt;
    ssl_certificate_key /etc/ssl/private/simplix.drive.paraweb.fr.key;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    client_max_body_size 50M;

    root /var/www/simplix/web;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
        expires 1y;
        add_header Cache-Control \"public, immutable\";
    }

    location /api {
        proxy_pass http://simplix_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    location /uploads {
        alias /var/www/simplix/uploads;
        expires 30d;
        add_header Cache-Control \"public\";
    }

    location ~* \\\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)\$ {
        expires 1y;
        add_header Cache-Control \"public, immutable\";
    }
}
NGINX_EOF

# Recharger Nginx
nginx -t && systemctl reload nginx

echo \"✅ Frontend déployé avec succès !\"
EOF

chmod +x /tmp/deploy-web.sh
/tmp/deploy-web.sh"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "ℹ️  Le fichier dist.tar.gz est prêt dans :"
echo "   $(pwd)/dist.tar.gz"
echo ""
echo "📝 Ou vous pouvez activer SSH dans Plesk :"
echo "   - Allez dans Plesk > Paramètres du serveur > Services"
echo "   - Activez le service SSH"
echo "   - Relancez ce script"
