# 🚀 SIMPLIX - CONFIGURATION FINALE

## ✅ Bonne nouvelle !

Le DNS est **déjà configuré** dans Plesk :
```
simplix.drive.paraweb.fr → 82.165.134.105 ✅
```

Il faut juste:
1. ✅ Corriger PostgreSQL et configurer Nginx (2 minutes)
2. ⏳ Attendre la propagation DNS (5-30 minutes)
3. ✅ Le SSL sera obtenu automatiquement !

---

## 🔧 EXÉCUTEZ CETTE COMMANDE

Sur votre Mac, copiez-collez:

```bash
ssh root@82.165.134.105 'curl -fsSL https://raw.githubusercontent.com/Popy21/Simplix/claude/simplix-roadmap-analysis-011CUx1wAomWPhRbBARmsgTw/configure-simplix-drive.sh | bash'
```

**Mot de passe:** `HkVB9iuftdyè(4442212l???`

---

## 📦 Ce que le script va faire

1. ✅ Corriger les permissions PostgreSQL
2. ✅ Appliquer toutes les migrations (25 migrations)
3. ✅ Charger les données de démo
4. ✅ Configurer Nginx pour `simplix.drive.paraweb.fr`
5. ✅ Redémarrer l'application
6. ✅ Tester que tout fonctionne
7. ✅ **Si le DNS est propagé:** Obtenir le SSL automatiquement
8. ✅ **Sinon:** Vous dire comment vérifier et obtenir le SSL

---

## ⏱️ Durée

- Script: **2-3 minutes**
- Propagation DNS: **5-30 minutes** (déjà en cours !)

---

## 🌐 URLs après configuration

### Immédiatement disponible (par IP):
```
http://82.165.134.105/health
http://82.165.134.105/api-docs
```

### Une fois le DNS propagé:
```
https://simplix.drive.paraweb.fr
https://simplix.drive.paraweb.fr/api-docs
https://simplix.drive.paraweb.fr/health
```

---

## 🔐 Credentials de test

```
Email:    admin@simplix-demo.fr
Password: Test1234!
```

---

## 🧪 Tester immédiatement par IP

Pendant que le DNS se propage, testez:

```bash
# Health check
curl http://82.165.134.105/health

# Login
curl -X POST http://82.165.134.105/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@simplix-demo.fr",
    "password": "Test1234!"
  }'

# Documentation dans le navigateur
open http://82.165.134.105/api-docs
```

---

## 🔍 Vérifier la propagation DNS

Sur votre Mac:

```bash
# Vérifier si le DNS est propagé
nslookup simplix.drive.paraweb.fr

# Devrait retourner:
# Name: simplix.drive.paraweb.fr
# Address: 82.165.134.105
```

Ou en ligne:
- https://dnschecker.org
- Entrez: `simplix.drive.paraweb.fr`

---

## 🔒 SSL automatique

Le script détecte automatiquement si le DNS est propagé:

- **Si OUI:** Le certificat SSL sera obtenu automatiquement ! 🎉
- **Si NON:** Le script vous dira comment le faire manuellement quand le DNS sera prêt

**Commande manuelle SSL** (si nécessaire plus tard):
```bash
ssh root@82.165.134.105
certbot --nginx -d simplix.drive.paraweb.fr -d www.simplix.drive.paraweb.fr \
  -m contact@paraweb.fr --agree-tos --non-interactive --redirect
```

---

## 🎯 Checklist

- [ ] Exécuter le script de configuration (commande ci-dessus)
- [ ] Tester par IP: `http://82.165.134.105/api-docs` ✅
- [ ] Attendre propagation DNS (5-30 min)
- [ ] Vérifier DNS: `nslookup simplix.drive.paraweb.fr`
- [ ] Tester HTTPS: `https://simplix.drive.paraweb.fr`
- [ ] Se connecter avec credentials démo

---

## ✅ Résultat attendu

```bash
╔════════════════════════════════════════════════════════════╗
║    ✅ CONFIGURATION TERMINÉE                              ║
╚════════════════════════════════════════════════════════════╝

🌐 URLs d'accès:
   • https://simplix.drive.paraweb.fr
   • https://simplix.drive.paraweb.fr/api-docs

🎉 SIMPLIX EST EN LIGNE !
```

---

## 🐛 Si problème

### Le script échoue
```bash
# Voir les logs
ssh root@82.165.134.105
pm2 logs simplix-api --lines 50
```

### DNS pas encore propagé
```bash
# Attendre et revérifier
nslookup simplix.drive.paraweb.fr
```

### SSL échoue
```bash
# Réessayer manuellement
ssh root@82.165.134.105
certbot --nginx -d simplix.drive.paraweb.fr -d www.simplix.drive.paraweb.fr \
  -m contact@paraweb.fr --agree-tos --non-interactive --redirect
```

---

## 🚀 COMMANDE FINALE

```bash
ssh root@82.165.134.105 'curl -fsSL https://raw.githubusercontent.com/Popy21/Simplix/claude/simplix-roadmap-analysis-011CUx1wAomWPhRbBARmsgTw/configure-simplix-drive.sh | bash'
```

**C'est tout ! Le script fait le reste. 🎉**
