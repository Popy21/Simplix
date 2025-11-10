# ✅ SIMPLIX - DÉPLOIEMENT RÉUSSI !

**Date:** 10 novembre 2025
**Serveur:** 82.165.134.105
**Statut:** 🟢 **EN LIGNE**

---

## 🎉 RÉSUMÉ

Simplix CRM a été **déployé avec succès** sur votre serveur VPS !

### ✅ Ce qui fonctionne :
- ✅ **API Node.js** démarrée avec PM2 (2 instances en cluster)
- ✅ **PostgreSQL 16** configuré avec 86 tables
- ✅ **Nginx** configuré comme reverse proxy
- ✅ **Organisation par défaut** créée
- ✅ **Utilisateur admin** créé
- ✅ **Migrations SQL** exécutées (19 fichiers)

---

## 🌐 ACCÈS À L'APPLICATION

### API directe (fonctionne ✅) :
```
http://82.165.134.105:3000/
```

### Avec domaine (nécessite configuration DNS) :
```
https://simplix.paraweb.fr
```

---

## 🔐 IDENTIFIANTS PAR DÉFAUT

### Base de données :
- **Database:** `simplix_crm`
- **User:** `simplix`
- **Password:** `Simplix2024!SecurePass`
- **Connection String:** `postgresql://simplix:Simplix2024!SecurePass@localhost:5432/simplix_crm`

### Application :
- **Email:** `admin@simplix.fr`
- **Password:** `admin123`

---

## 📋 ÉTAPE CRITIQUE : CONFIGURATION DNS

Pour que `simplix.paraweb.fr` fonctionne, vous devez configurer le DNS :

### Option 1 : Via Plesk (RECOMMANDÉ)

1. **Connectez-vous à Plesk :**
   ```
   https://82.165.134.105:8443
   ```

2. **Allez dans "Domaines" :**
   - Cliquez sur le domaine `paraweb.fr`
   - Allez dans "Paramètres DNS"

3. **Ajoutez un enregistrement A :**
   ```
   Type: A
   Nom: simplix
   Adresse IP: 82.165.134.105
   TTL: 3600
   ```

4. **Sauvegardez**

### Option 2 : Via votre registrar (OVH, Gandi, etc.)

Si votre DNS n'est PAS géré par Plesk :

1. **Connectez-vous à votre registrar**
2. **Ajoutez un enregistrement A :**
   ```
   Sous-domaine: simplix
   Type: A
   Valeur: 82.165.134.105
   TTL: 3600
   ```

### Vérification DNS :

Une fois configuré, testez avec :
```bash
nslookup simplix.paraweb.fr
# Devrait retourner: 82.165.134.105
```

**⏱️ Délai de propagation:** 5 minutes à 48 heures (généralement < 1 heure)

---

## 🔒 SSL (HTTPS)

Le certificat SSL Let's Encrypt sera automatiquement obtenu quand le DNS sera configuré.

Pour le forcer manuellement :
```bash
ssh root@82.165.134.105
certbot --nginx -d simplix.paraweb.fr --non-interactive --agree-tos --email admin@simplix.fr
```

---

## 🧪 TESTS

### Test API (fonctionne déjà ✅) :

```bash
# Test root
curl http://82.165.134.105:3000/

# Test login
curl -X POST http://82.165.134.105:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@simplix.fr","password":"admin123"}'
```

### Une fois le DNS configuré :

```bash
# Test HTTPS
curl https://simplix.paraweb.fr/

# Test login
curl -X POST https://simplix.paraweb.fr/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@simplix.fr","password":"admin123"}'
```

---

## 📊 STATUT DU SERVEUR

### PM2 (process manager) :
```bash
ssh root@82.165.134.105 'pm2 status'
```

### Logs en temps réel :
```bash
ssh root@82.165.134.105 'pm2 logs simplix-api'
```

### Redémarrer l'application :
```bash
ssh root@82.165.134.105 'pm2 restart simplix-api'
```

### Arrêter l'application :
```bash
ssh root@82.165.134.105 'pm2 stop simplix-api'
```

---

## 📁 STRUCTURE DES FICHIERS

```
/var/www/simplix/
├── api/                    # API Node.js
│   ├── dist/              # Code compilé TypeScript
│   ├── src/               # Code source
│   ├── .env               # Variables d'environnement
│   └── package.json
├── database/
│   └── migrations/        # 19 migrations SQL exécutées
├── ecosystem.config.js    # Config PM2
└── uploads/               # Fichiers uploadés

/etc/nginx/sites-available/
└── simplix                # Config Nginx

/var/log/simplix/
├── error.log
├── out.log
└── combined.log
```

---

## 🚨 ACTIONS DE SÉCURITÉ URGENTES

⚠️ **À FAIRE IMMÉDIATEMENT** :

### 1. Changez le mot de passe root Plesk
```
https://82.165.134.105:8443
→ Paramètres > Sécurité > Changer mot de passe
```

### 2. Changez le mot de passe admin de l'app
```bash
curl -X POST https://simplix.paraweb.fr/api/auth/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  -d '{"currentPassword":"admin123","newPassword":"<NOUVEAU_MOT_DE_PASSE_SECURISE>"}'
```

### 3. Mettez à jour le JWT_SECRET
```bash
ssh root@82.165.134.105
nano /var/www/simplix/api/.env
# Changez JWT_SECRET et JWT_REFRESH_SECRET avec des valeurs aléatoires
pm2 restart simplix-api
```

### 4. Configurez une clé SSH
```bash
# Sur votre machine locale
ssh-keygen -t ed25519 -C "simplix-deploy"
ssh-copy-id root@82.165.134.105

# Puis désactivez l'auth par mot de passe SSH
ssh root@82.165.134.105
nano /etc/ssh/sshd_config
# Changez: PasswordAuthentication no
systemctl restart sshd
```

---

## 🛠️ COMMANDES UTILES

### Base de données :
```bash
# Se connecter à PostgreSQL
ssh root@82.165.134.105
sudo -u postgres psql -d simplix_crm

# Lister les tables
\dt

# Voir les users
SELECT * FROM users;

# Quitter
\q
```

### Nginx :
```bash
# Tester la config
nginx -t

# Recharger
nginx -s reload

# Logs
tail -f /var/log/nginx/simplix-error.log
```

### Mises à jour :
```bash
# Pull dernières modifications GitHub
ssh root@82.165.134.105
cd /var/www/simplix
git pull origin main
cd api
npm install
npm run build
pm2 restart simplix-api
```

---

## 📈 STATISTIQUES

### Infrastructure déployée :
- **Tables BDD :** 86 tables PostgreSQL
- **Endpoints API :** 25+ routes
- **Instances PM2 :** 2 (cluster mode)
- **Migrations :** 19 fichiers SQL exécutés
- **Lignes de code :** ~15 000 lignes TypeScript

### Performance :
- **RAM utilisée :** ~170 MB (2 instances)
- **Port :** 3000
- **Mode :** Production
- **Auto-restart :** Activé

---

## 🔄 PROCHAINES ÉTAPES

### Immédiat :
1. ✅ **Configurer le DNS** (voir section ci-dessus)
2. ⏳ Attendre propagation DNS (5 min - 48h)
3. ✅ Obtenir certificat SSL automatiquement
4. ✅ Tester l'application via `https://simplix.paraweb.fr`

### Court terme (cette semaine) :
5. 🔐 Changer les mots de passe (root, admin, JWT)
6. 📧 Configurer l'envoi d'emails (SMTP)
7. 💳 Configurer Stripe (paiements)
8. 📱 Tester toutes les fonctionnalités

### Moyen terme (ce mois) :
9. 🔒 Certificat SSL auto-renew (Let's Encrypt)
10. 💾 Backups automatiques BDD
11. 📊 Monitoring (Uptime Robot, etc.)
12. 🚀 Optimisations performance

---

## 🆘 EN CAS DE PROBLÈME

### L'application ne démarre pas :
```bash
ssh root@82.165.134.105
pm2 logs simplix-api --lines 100
# Regardez les erreurs dans les logs
```

### Erreur de base de données :
```bash
# Vérifier que PostgreSQL tourne
systemctl status postgresql

# Tester la connexion
PGPASSWORD=Simplix2024!SecurePass psql -h localhost -U simplix -d simplix_crm -c "SELECT version();"
```

### Nginx ne répond pas :
```bash
# Vérifier le statut
systemctl status nginx

# Tester la config
nginx -t

# Redémarrer
systemctl restart nginx
```

---

## 📞 SUPPORT

Si vous avez besoin d'aide :

1. **Vérifiez les logs :**
   ```bash
   pm2 logs simplix-api
   tail -f /var/log/nginx/simplix-error.log
   ```

2. **Redémarrez les services :**
   ```bash
   pm2 restart simplix-api
   systemctl restart nginx
   systemctl restart postgresql
   ```

3. **Contactez l'équipe**

---

## ✅ CHECKLIST POST-DÉPLOIEMENT

- [ ] DNS configuré pour `simplix.paraweb.fr`
- [ ] SSL Let's Encrypt obtenu et actif
- [ ] Mot de passe root Plesk changé
- [ ] Mot de passe admin app changé
- [ ] JWT_SECRET mis à jour
- [ ] Clé SSH configurée
- [ ] Auth par mot de passe SSH désactivée
- [ ] SMTP configuré (emails)
- [ ] Stripe configuré (paiements)
- [ ] Backups BDD configurés
- [ ] Monitoring configuré
- [ ] Tests complets effectués

---

## 🎊 FÉLICITATIONS !

Votre application **Simplix CRM** est maintenant déployée en production !

Une fois le DNS configuré, elle sera accessible à l'adresse :
**https://simplix.paraweb.fr**

---

**Dernière mise à jour :** 10 novembre 2025, 06:45 UTC
**Version déployée :** main branch (commit 91a84a1)
**Statut :** 🟢 **OPÉRATIONNEL**
