# 🚀 Déploiement Frontend Simplix CRM

## ⚠️ Problème Actuel

Le SSH est désactivé ou bloqué sur le serveur. Il faut le réactiver pour continuer.

---

## 🔧 SOLUTION : Réactiver SSH dans Plesk

### Étape 1 : Vérifier l'état de SSH dans Plesk

1. **Connectez-vous à Plesk** : `https://82.165.134.105:8443`
2. Allez dans **"Outils et paramètres"** (barre latérale gauche)
3. Cliquez sur **"Services"**
4. Cherchez **"SSH"** dans la liste

### Étape 2 : Activer SSH

**Option A - Si SSH est désactivé :**
- Cliquez sur le bouton **"Démarrer"** ou **"Start"** à côté de SSH
- Vérifiez que le statut passe à **"En cours d'exécution"** (Running)

**Option B - Si SSH n'apparaît pas :**
Via le terminal Plesk, exécutez :
```bash
systemctl start ssh
systemctl enable ssh
systemctl status ssh
```

### Étape 3 : Vérifier le pare-feu

Dans le terminal Plesk :
```bash
# Vérifier si le port 22 est ouvert
ufw status | grep 22

# Si fermé, ouvrir le port SSH
ufw allow 22/tcp
ufw reload
```

---

## 📦 Une fois SSH réactivé - Déploiement Automatique

Depuis votre machine locale, exécutez :

```bash
cd /Users/adelbouachraoui/Desktop/Bureau/Simplix
bash deploy-frontend-full.sh
```

---

## 🎯 Déploiement Manuel via Plesk (Alternative)

Si vous ne pouvez pas réactiver SSH, voici la méthode manuelle :

### Étape 1 : Upload du fichier

1. **File Manager Plesk** :
   - Allez dans **Domaines** > **simplix.drive.paraweb.fr** > **File Manager**
   - Naviguez vers `/var/www/simplix/`
   - Uploadez le fichier `dist.tar.gz` (disponible localement dans le dossier Simplix)

### Étape 2 : Terminal Plesk

Dans **Outils et paramètres** > **Scheduled Tasks** ou via le **Terminal Plesk**, exécutez :

```bash
#!/bin/bash
set -e

echo "📦 Déploiement frontend..."

# Créer répertoire
mkdir -p /var/www/simplix/web
cd /var/www/simplix/web

# Extraire
rm -rf *
tar -xzf /var/www/simplix/dist.tar.gz

# Permissions
chown -R www-data:www-data /var/www/simplix/web
chmod -R 755 /var/www/simplix/web

# Configuration Nginx
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

    # Frontend
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

    # Static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
NGINX_CONFIG

# Vérifier et recharger Nginx
nginx -t
systemctl reload nginx

echo "✅ Frontend déployé avec succès !"
echo ""
echo "🌐 Accédez à : https://simplix.drive.paraweb.fr"
```

---

## 📋 Fichiers Préparés

✅ **Frontend buildé** : `dist/` (1.48 MB)
✅ **Archive prête** : `dist.tar.gz` (Compressée)
✅ **Config API** : Pointe vers `https://simplix.drive.paraweb.fr/api`

---

## 🎯 Résultat Attendu

Une fois déployé, vous aurez :

- **Frontend React** : Interface utilisateur complète
- **Backend API** : 21 endpoints fonctionnels
- **Base de données** : 86 tables PostgreSQL
- **Authentification** : Login admin@simplix.fr / admin123

Tous accessibles via : **https://simplix.drive.paraweb.fr**

---

## 🆘 Besoin d'Aide ?

**SSH refusé** : Réactivez SSH dans Plesk > Services
**Pas d'accès root** : Utilisez le Terminal Plesk
**Erreur Nginx** : Vérifiez les logs avec `tail -f /var/log/nginx/error.log`

---

## 📞 Actions Immédiates

1. **Réactivez SSH dans Plesk**
2. **Ou uploadez manuellement dist.tar.gz**
3. **Exécutez le script de déploiement**

Le frontend est prêt à être déployé ! 🚀
