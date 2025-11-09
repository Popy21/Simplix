# 🚀 INSTRUCTIONS DE DÉPLOIEMENT SIMPLIX v4.0

## Serveur de production: simplix.paraweb.fr (82.165.134.105)

---

## ✅ Option 1: Déploiement automatique (RECOMMANDÉ)

### Étape 1: Connectez-vous au serveur

```bash
ssh root@82.165.134.105
```

Mot de passe: `HkVB9iuftdyè(4442212l???`

### Étape 2: Téléchargez et exécutez le script de déploiement

```bash
# Télécharger le script
curl -o deploy.sh https://raw.githubusercontent.com/Popy21/Simplix/claude/simplix-roadmap-analysis-011CUx1wAomWPhRbBARmsgTw/deploy-server-side.sh

# Rendre exécutable
chmod +x deploy.sh

# Exécuter
./deploy.sh
```

**OU** si le fichier n'est pas encore sur GitHub:

```bash
# Créer le fichier directement sur le serveur
cat > deploy.sh << 'ENDOFSCRIPT'
[Copier tout le contenu de deploy-server-side.sh ici]
ENDOFSCRIPT

# Rendre exécutable
chmod +x deploy.sh

# Exécuter
./deploy.sh
```

### Durée estimée: 10-15 minutes

Le script va automatiquement:
- ✅ Installer Node.js, PostgreSQL, Nginx, PM2, Certbot
- ✅ Configurer la base de données
- ✅ Cloner le projet depuis GitHub
- ✅ Installer les dépendances et builder
- ✅ Appliquer les migrations
- ✅ Charger les données de démo
- ✅ Configurer PM2 pour le démarrage automatique
- ✅ Configurer Nginx
- ✅ Obtenir un certificat SSL
- ✅ Configurer le firewall

---

## 📋 Option 2: Déploiement manuel étape par étape

### 1. Connexion au serveur

```bash
ssh root@82.165.134.105
```

### 2. Mise à jour et installation des dépendances

```bash
# Mise à jour du système
apt-get update && apt-get upgrade -y

# Installation Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Installation PostgreSQL
apt-get install -y postgresql postgresql-contrib
systemctl start postgresql
systemctl enable postgresql

# Installation Nginx
apt-get install -y nginx

# Installation Certbot pour SSL
apt-get install -y certbot python3-certbot-nginx

# Installation PM2
npm install -g pm2

# Installation Git
apt-get install -y git
```

### 3. Configuration PostgreSQL

```bash
sudo -u postgres psql << EOF
DROP DATABASE IF EXISTS simplix_crm;
DROP USER IF EXISTS simplix_user;
CREATE DATABASE simplix_crm;
CREATE USER simplix_user WITH ENCRYPTED PASSWORD 'Simplix2025SecurePassword!@#';
GRANT ALL PRIVILEGES ON DATABASE simplix_crm TO simplix_user;
ALTER USER simplix_user CREATEDB;
\q
EOF
```

### 4. Clonage du projet

```bash
# Créer répertoire
mkdir -p /var/www/simplix
cd /var/www/simplix

# Cloner
git clone https://github.com/Popy21/Simplix.git .

# Checkout la branche
git checkout claude/simplix-roadmap-analysis-011CUx1wAomWPhRbBARmsgTw
```

### 5. Configuration .env

```bash
cd /var/www/simplix/api

cat > .env << EOF
NODE_ENV=production
PORT=3000

DB_HOST=localhost
DB_PORT=5432
DB_NAME=simplix_crm
DB_USER=simplix_user
DB_PASSWORD=Simplix2025SecurePassword!@#

JWT_SECRET=$(openssl rand -hex 32)
JWT_EXPIRES_IN=7d
JWT_REFRESH_IN=30d

ALLOWED_ORIGINS=https://simplix.paraweb.fr,http://simplix.paraweb.fr

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@paraweb.fr
SMTP_PASSWORD=
SMTP_FROM=noreply@simplix.paraweb.fr

STORAGE_TYPE=local
STORAGE_PATH=/var/www/simplix/uploads

ENABLE_SWAGGER_DOCS=true
EOF
```

### 6. Installation et build

```bash
cd /var/www/simplix/api

# Installation
npm ci --only=production

# Build
npm run build

# Créer répertoire uploads
mkdir -p /var/www/simplix/uploads
chown -R www-data:www-data /var/www/simplix/uploads
chmod -R 755 /var/www/simplix/uploads
```

### 7. Migrations base de données

```bash
cd /var/www/simplix/database

# Rendre exécutable
chmod +x migrate.sh

# Configurer variables
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=simplix_crm
export DB_USER=simplix_user
export DB_PASSWORD=Simplix2025SecurePassword!@#

# Appliquer migrations
./migrate.sh up

# Charger données de démo
PGPASSWORD=Simplix2025SecurePassword!@# psql -h localhost -U simplix_user -d simplix_crm -f seed.sql
```

### 8. Configuration PM2

```bash
cd /var/www/simplix/api

# Démarrer l'application
pm2 start dist/index.js --name simplix-api -i max

# Sauvegarder
pm2 save

# Démarrage automatique
pm2 startup systemd -u root --hp /root
```

### 9. Configuration Nginx

```bash
cat > /etc/nginx/sites-available/simplix.paraweb.fr << 'EOF'
upstream simplix_api {
    server 127.0.0.1:3000;
    keepalive 64;
}

server {
    listen 80;
    server_name simplix.paraweb.fr www.simplix.paraweb.fr;

    access_log /var/log/nginx/simplix.access.log;
    error_log /var/log/nginx/simplix.error.log;

    client_max_body_size 50M;

    location / {
        proxy_pass http://simplix_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    location /uploads {
        alias /var/www/simplix/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Activer le site
ln -sf /etc/nginx/sites-available/simplix.paraweb.fr /etc/nginx/sites-enabled/

# Désactiver site par défaut
rm -f /etc/nginx/sites-enabled/default

# Tester et redémarrer
nginx -t
systemctl restart nginx
systemctl enable nginx
```

### 10. Configuration SSL

```bash
certbot --nginx -d simplix.paraweb.fr -d www.simplix.paraweb.fr \
    --non-interactive --agree-tos --redirect \
    -m contact@paraweb.fr

# Auto-renouvellement
systemctl enable certbot.timer
systemctl start certbot.timer
```

### 11. Configuration Firewall

```bash
apt-get install -y ufw

ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 8443/tcp

echo "y" | ufw enable
```

### 12. Vérifications

```bash
# Test API locale
curl http://localhost:3000/health

# Voir les logs
pm2 logs simplix-api

# Vérifier les services
systemctl status postgresql
systemctl status nginx
pm2 status
```

---

## 🌐 URLs après déploiement

- **API:** https://simplix.paraweb.fr
- **Documentation Swagger:** https://simplix.paraweb.fr/api-docs
- **Health Check:** https://simplix.paraweb.fr/health

## 🔐 Credentials de démo

- **Email:** admin@simplix-demo.fr
- **Mot de passe:** Test1234!

## 📊 Informations base de données

- **Host:** localhost
- **Database:** simplix_crm
- **User:** simplix_user
- **Password:** Simplix2025SecurePassword!@#

## 🔧 Commandes de gestion

```bash
# Voir les logs en temps réel
pm2 logs simplix-api

# Redémarrer l'application
pm2 restart simplix-api

# Voir le statut
pm2 status

# Logs Nginx
tail -f /var/log/nginx/simplix.access.log
tail -f /var/log/nginx/simplix.error.log

# Mettre à jour l'application
cd /var/www/simplix
git pull
cd api
npm run build
pm2 restart simplix-api
```

## ⚠️ Sécurité post-déploiement

1. **Changez le mot de passe root:**
   ```bash
   passwd
   ```

2. **Configurez SSH avec clés (recommandé):**
   ```bash
   ssh-keygen -t ed25519
   # Copiez votre clé publique dans ~/.ssh/authorized_keys
   # Désactivez l'auth par mot de passe dans /etc/ssh/sshd_config
   ```

3. **Configurez le SMTP:**
   Éditez `/var/www/simplix/api/.env` et ajoutez vos credentials SMTP

4. **Sauvegardez la base de données:**
   ```bash
   # Créer un backup
   pg_dump -U simplix_user simplix_crm > backup.sql

   # Restaurer un backup
   psql -U simplix_user simplix_crm < backup.sql
   ```

## 🐛 Dépannage

### L'API ne démarre pas
```bash
pm2 logs simplix-api --lines 100
```

### Problème de connexion base de données
```bash
# Vérifier PostgreSQL
systemctl status postgresql

# Tester connexion
psql -h localhost -U simplix_user -d simplix_crm
```

### Nginx erreur 502
```bash
# Vérifier que l'API tourne
curl http://localhost:3000/health

# Logs Nginx
tail -f /var/log/nginx/simplix.error.log
```

### SSL ne fonctionne pas
```bash
# Renouveler manuellement
certbot renew --dry-run
certbot renew
```

---

## ✅ Checklist de déploiement

- [ ] Connexion SSH au serveur réussie
- [ ] Dépendances installées (Node.js, PostgreSQL, Nginx, PM2)
- [ ] Base de données créée et configurée
- [ ] Projet cloné depuis GitHub
- [ ] Fichier .env créé
- [ ] npm install et build réussis
- [ ] Migrations appliquées
- [ ] Données de démo chargées
- [ ] PM2 configuré et application démarrée
- [ ] Nginx configuré
- [ ] Certificat SSL obtenu
- [ ] Firewall configuré
- [ ] Test https://simplix.paraweb.fr/health réussi
- [ ] Swagger accessible sur /api-docs
- [ ] Connexion avec credentials démo fonctionne

---

## 🎉 Succès !

Une fois toutes les étapes terminées, votre application Simplix v4.0 sera:

✅ Accessible sur https://simplix.paraweb.fr
✅ Sécurisée avec SSL/TLS
✅ Configurée pour redémarrer automatiquement
✅ Prête pour la production

**Bon déploiement ! 🚀**
