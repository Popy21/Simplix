#!/bin/bash

# =============================================================================
# SIMPLIX - Installation Serveur Production
# =============================================================================
# Ce script installe tous les prérequis sur le serveur
# À exécuter sur: 82.165.134.105
# =============================================================================

set -e  # Exit on error

echo "🚀 SIMPLIX - Installation Serveur Production"
echo "============================================="
echo ""

# Mise à jour système
echo "📦 Mise à jour du système..."
apt-get update -y
apt-get upgrade -y

# Installation des dépendances de base
echo "📦 Installation des outils de base..."
apt-get install -y curl wget git build-essential software-properties-common ufw

# Installation Node.js 20 LTS
echo "📦 Installation de Node.js 20 LTS..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

echo "✅ Node.js version: $(node --version)"
echo "✅ npm version: $(npm --version)"

# Installation PostgreSQL 16
echo "📦 Installation de PostgreSQL 16..."
sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
apt-get update -y
apt-get install -y postgresql-16 postgresql-contrib-16

echo "✅ PostgreSQL version: $(psql --version)"

# Démarrage PostgreSQL
systemctl start postgresql
systemctl enable postgresql

# Installation Nginx
echo "📦 Installation de Nginx..."
apt-get install -y nginx

echo "✅ Nginx version: $(nginx -v 2>&1)"

# Démarrage Nginx
systemctl start nginx
systemctl enable nginx

# Installation PM2 (process manager)
echo "📦 Installation de PM2..."
npm install -g pm2

echo "✅ PM2 version: $(pm2 --version)"

# Configuration PM2 pour démarrage auto
pm2 startup systemd -u root --hp /root
env PATH=$PATH:/usr/bin pm2 startup systemd -u root --hp /root

# Installation Certbot (SSL Let's Encrypt)
echo "📦 Installation de Certbot..."
apt-get install -y certbot python3-certbot-nginx

echo "✅ Certbot version: $(certbot --version)"

# Configuration Firewall UFW
echo "🔒 Configuration du firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw allow 8443/tcp  # Plesk
ufw --force enable

echo "✅ Firewall configuré"

# Création des répertoires
echo "📁 Création des répertoires..."
mkdir -p /var/www/simplix
mkdir -p /var/www/simplix/uploads
mkdir -p /var/log/simplix
mkdir -p /var/www/certbot

# Permissions
chown -R www-data:www-data /var/www/simplix
chmod -R 755 /var/www/simplix

echo ""
echo "✅ Installation serveur terminée!"
echo ""
echo "📋 Versions installées:"
echo "  - Node.js: $(node --version)"
echo "  - npm: $(npm --version)"
echo "  - PostgreSQL: $(psql --version | head -1)"
echo "  - Nginx: $(nginx -v 2>&1 | cut -d' ' -f3)"
echo "  - PM2: $(pm2 --version)"
echo "  - Certbot: $(certbot --version | head -1)"
echo ""
echo "🎯 Prochaine étape: Configuration PostgreSQL"
