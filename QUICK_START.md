# 🚀 SIMPLIX - QUICK START GUIDE

## ✅ VOTRE APPLICATION EST EN LIGNE !

```
🌐 API: http://82.165.134.105:3000
📊 Status: 🟢 ONLINE (2 instances PM2)
💾 Database: 86 tables PostgreSQL
👤 Admin: admin@simplix.fr / admin123
```

---

## 🎯 ÉTAPES RAPIDES

### 1️⃣ TESTEZ L'API MAINTENANT (via IP)

```bash
# Test simple
curl http://82.165.134.105:3000/

# Login
curl -X POST http://82.165.134.105:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@simplix.fr","password":"admin123"}'
```

**✅ Fonctionne maintenant !**

---

### 2️⃣ CONFIGUREZ LE DNS (5 minutes)

#### Option A: Via Plesk (graphique)
1. Allez sur : https://82.165.134.105:8443
2. Domaines → `paraweb.fr` → DNS
3. Ajoutez :
   ```
   Type: A
   Nom: simplix
   IP: 82.165.134.105
   ```

#### Option B: Automatique
```bash
./configure-dns-plesk.sh
```

---

### 3️⃣ ATTENDEZ LA PROPAGATION (5-30 min)

```bash
# Testez régulièrement
nslookup simplix.paraweb.fr

# Quand ça retourne 82.165.134.105 → C'est prêt !
```

---

### 4️⃣ OBTENEZ LE SSL (automatique)

```bash
ssh root@82.165.134.105
certbot --nginx -d simplix.paraweb.fr --non-interactive --agree-tos --email admin@simplix.fr
```

**Le SSL se configure en 30 secondes une fois le DNS propagé**

---

### 5️⃣ ACCÉDEZ À VOTRE APP

```bash
# Avec HTTPS (après DNS + SSL)
https://simplix.paraweb.fr

# Test login
curl -X POST https://simplix.paraweb.fr/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@simplix.fr","password":"admin123"}'
```

---

## 🔐 SÉCURITÉ (URGENT)

### Changez immédiatement :

1. **Mot de passe Plesk :** https://82.165.134.105:8443
2. **Mot de passe admin :** Via l'app ou API
3. **JWT_SECRET :** Dans `/var/www/simplix/api/.env`

---

## 📊 COMMANDES ESSENTIELLES

```bash
# Logs en temps réel
ssh root@82.165.134.105 'pm2 logs simplix-api'

# Redémarrer
ssh root@82.165.134.105 'pm2 restart simplix-api'

# Statut
ssh root@82.165.134.105 'pm2 status'
```

---

## 📁 FICHIERS IMPORTANTS

- `DEPLOIEMENT_SUCCESS.md` - Guide complet détaillé
- `DEPLOYMENT_SUMMARY.md` - Résumé technique
- `deploy.sh` - Script de déploiement
- `.env.production` - Variables d'environnement

---

## 🆘 PROBLÈME ?

```bash
# Redémarrage d'urgence
ssh root@82.165.134.105 '
pm2 restart simplix-api
systemctl restart nginx
'

# Vérifier les logs
ssh root@82.165.134.105 'pm2 logs simplix-api --lines 100'
```

---

## ✅ CHECKLIST

- [x] Serveur configuré
- [x] PostgreSQL avec 86 tables
- [x] PM2 avec 2 instances online
- [x] API accessible via IP
- [ ] **→ CONFIGUREZ LE DNS** ← VOUS ÊTES ICI
- [ ] Attendez propagation DNS
- [ ] Obtenez SSL automatiquement
- [ ] Testez https://simplix.paraweb.fr
- [ ] Changez les mots de passe
- [ ] C'est fini ! 🎉

---

## 🎊 FÉLICITATIONS !

Votre CRM est déployé en **15 minutes** !

**Prochaine étape :** Configurez le DNS et attendez 5-30 minutes.

Puis accédez à : **https://simplix.paraweb.fr** 🚀
