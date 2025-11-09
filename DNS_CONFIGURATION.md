# 🌐 CONFIGURATION DNS POUR SIMPLIX

## ❌ Problème actuel

Le domaine `simplix.paraweb.fr` ne résout pas (erreur DNS_PROBE_FINISHED_NXDOMAIN).

L'application est **déployée et fonctionne**, mais le DNS n'est pas configuré.

---

## ✅ Solution rapide

### Étape 1: Corriger les permissions PostgreSQL

Connectez-vous au serveur et exécutez:

```bash
ssh root@82.165.134.105
curl -fsSL https://raw.githubusercontent.com/Popy21/Simplix/claude/simplix-roadmap-analysis-011CUx1wAomWPhRbBARmsgTw/fix-deployment.sh | bash
```

Ce script va:
- ✅ Corriger les permissions PostgreSQL
- ✅ Réappliquer les migrations
- ✅ Vérifier l'état du DNS
- ✅ Redémarrer l'application
- ✅ Tester que tout fonctionne

### Étape 2: Configurer le DNS

Vous avez **3 options**:

---

## Option 1: Via Plesk (RECOMMANDÉ) ⭐

1. **Connectez-vous à Plesk:**
   ```
   https://82.165.134.105:8443
   ```
   Utilisez vos credentials Plesk

2. **Ajoutez le sous-domaine:**
   - Cliquez sur "Domaines"
   - Sélectionnez `paraweb.fr`
   - Cliquez sur "Ajouter un sous-domaine"
   - Nom: `simplix`
   - Cochez "Synchroniser la zone DNS avec le domaine parent"

3. **Vérifiez l'enregistrement DNS:**
   - Allez dans "Paramètres DNS" pour `simplix.paraweb.fr`
   - Vérifiez qu'il y a un enregistrement A pointant vers `82.165.134.105`
   - Si absent, ajoutez:
     ```
     Type: A
     Nom: simplix.paraweb.fr
     Valeur: 82.165.134.105
     ```

4. **Attendez la propagation DNS (5-30 minutes)**

5. **Obtenez le certificat SSL:**
   ```bash
   ssh root@82.165.134.105
   certbot --nginx -d simplix.paraweb.fr -d www.simplix.paraweb.fr \
     -m contact@paraweb.fr --agree-tos --non-interactive --redirect
   ```

---

## Option 2: Via votre Registrar

Si `paraweb.fr` est géré ailleurs (OVH, Gandi, etc.):

1. **Connectez-vous à votre registrar**

2. **Accédez à la gestion DNS de `paraweb.fr`**

3. **Ajoutez un enregistrement A:**
   ```
   Type:    A
   Nom:     simplix
   Valeur:  82.165.134.105
   TTL:     300 (ou laisser par défaut)
   ```

4. **Sauvegardez**

5. **Attendez la propagation (5-30 minutes)**

6. **Vérifiez:**
   ```bash
   # Sur votre Mac
   nslookup simplix.paraweb.fr
   # ou
   dig simplix.paraweb.fr
   ```

7. **Obtenez le certificat SSL:**
   ```bash
   ssh root@82.165.134.105
   certbot --nginx -d simplix.paraweb.fr -d www.simplix.paraweb.fr \
     -m contact@paraweb.fr --agree-tos --non-interactive --redirect
   ```

---

## Option 3: Accès temporaire par IP

**En attendant la configuration DNS**, utilisez directement l'IP:

### URLs temporaires:

```
http://82.165.134.105/health
http://82.165.134.105/api-docs
```

### Test avec curl:

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
```

---

## 🔍 Vérifier la propagation DNS

Une fois le DNS configuré, vérifiez:

```bash
# Sur votre Mac
nslookup simplex.paraweb.fr

# Devrait retourner:
# Name:   simplix.paraweb.fr
# Address: 82.165.134.105
```

Ou utilisez un outil en ligne:
- https://dnschecker.org
- Entrez: `simplix.paraweb.fr`
- Vérifiez que l'IP `82.165.134.105` apparaît

---

## 🔒 Obtenir le certificat SSL

**Seulement après que le DNS fonctionne:**

```bash
ssh root@82.165.134.105
certbot --nginx -d simplix.paraweb.fr -d www.simplix.paraweb.fr \
  -m contact@paraweb.fr --agree-tos --non-interactive --redirect
```

Si le DNS n'est pas encore propagé, certbot échouera. Attendez quelques minutes et réessayez.

---

## ✅ Test final

Une fois le DNS configuré et le certificat SSL obtenu:

```bash
# Health check
curl https://simplix.paraweb.fr/health

# Documentation
open https://simplix.paraweb.fr/api-docs

# Login
curl -X POST https://simplix.paraweb.fr/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@simplix-demo.fr",
    "password": "Test1234!"
  }'
```

---

## 🐛 Dépannage

### Le DNS ne se propage pas

```bash
# Vérifier la configuration DNS sur le serveur
ssh root@82.165.134.105
cat /etc/nginx/sites-available/simplix.paraweb.fr
```

### L'application ne répond pas

```bash
# Voir les logs
ssh root@82.165.134.105
pm2 logs simplix-api --lines 50

# Redémarrer
pm2 restart simplix-api
```

### Nginx erreur 502

```bash
# Vérifier que l'API tourne
curl http://localhost:3000/health

# Voir les logs Nginx
tail -f /var/log/nginx/simplix.error.log
```

### Erreur base de données

```bash
# Réappliquer les migrations
ssh root@82.165.134.105
cd /var/www/simplix/database
./migrate.sh up
```

---

## 📞 Résumé des actions

1. ✅ **Exécuter le script de correction:**
   ```bash
   ssh root@82.165.134.105 'curl -fsSL https://raw.githubusercontent.com/Popy21/Simplix/claude/simplix-roadmap-analysis-011CUx1wAomWPhRbBARmsgTw/fix-deployment.sh | bash'
   ```

2. ✅ **Configurer le DNS** (Plesk ou Registrar)
   - Ajouter enregistrement A: `simplix.paraweb.fr` → `82.165.134.105`

3. ✅ **Attendre propagation** (5-30 min)

4. ✅ **Obtenir certificat SSL:**
   ```bash
   ssh root@82.165.134.105 'certbot --nginx -d simplix.paraweb.fr -d www.simplix.paraweb.fr -m contact@paraweb.fr --agree-tos --non-interactive --redirect'
   ```

5. ✅ **Tester:** https://simplix.paraweb.fr

---

**L'application fonctionne, il ne manque que la configuration DNS ! 🚀**
