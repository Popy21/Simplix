# 🚀 DÉPLOYER SIMPLIX MAINTENANT

## Commande unique pour déployer en production

Connectez-vous à votre serveur et exécutez cette commande unique:

```bash
ssh root@82.165.134.105 'bash -s' << 'ENDOFCOMMANDS'
# Télécharger et exécuter le script de déploiement
curl -fsSL https://raw.githubusercontent.com/Popy21/Simplix/claude/simplix-roadmap-analysis-011CUx1wAomWPhRbBARmsgTw/deploy-server-side.sh | bash
ENDOFCOMMANDS
```

**OU** si vous préférez en 2 étapes:

### Étape 1: Connectez-vous au serveur
```bash
ssh root@82.165.134.105
```
Mot de passe: `HkVB9iuftdyè(4442212l???`

### Étape 2: Téléchargez et exécutez le script
```bash
curl -fsSL https://raw.githubusercontent.com/Popy21/Simplix/claude/simplix-roadmap-analysis-011CUx1wAomWPhRbBARmsgTw/deploy-server-side.sh | bash
```

---

## ⏱️ Durée: 10-15 minutes

Le script va automatiquement:
- ✅ Installer toutes les dépendances (Node.js, PostgreSQL, Nginx, PM2, SSL)
- ✅ Configurer la base de données
- ✅ Cloner et builder l'application
- ✅ Appliquer les migrations
- ✅ Charger les données de démo
- ✅ Configurer HTTPS avec Let's Encrypt
- ✅ Démarrer l'application en production

---

## ✅ URLs après déploiement

- **Application:** https://simplix.paraweb.fr
- **API Documentation:** https://simplix.paraweb.fr/api-docs
- **Health Check:** https://simplix.paraweb.fr/health

---

## 🔐 Credentials de test

- **Email:** admin@simplix-demo.fr
- **Password:** Test1234!

---

## 📱 Tester immédiatement

### 1. Vérifier que l'API fonctionne
```bash
curl https://simplix.paraweb.fr/health
```

### 2. Se connecter avec Swagger
Ouvrez dans votre navigateur: https://simplix.paraweb.fr/api-docs

### 3. Tester l'authentification
```bash
curl -X POST https://simplix.paraweb.fr/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@simplix-demo.fr",
    "password": "Test1234!"
  }'
```

---

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
```

---

## 🎉 C'est tout !

Après l'exécution du script, Simplix v4.0 sera entièrement déployé et fonctionnel en production.

Pour plus de détails, consultez [DEPLOY_INSTRUCTIONS.md](./DEPLOY_INSTRUCTIONS.md)
