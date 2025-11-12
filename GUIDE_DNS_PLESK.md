# 🌐 GUIDE : Configuration DNS pour simplix.drive.paraweb.fr

## 📊 SITUATION ACTUELLE

Votre sous-domaine `simplix.drive.paraweb.fr` existe dans Plesk mais le DNS n'est pas correctement configuré.

---

## ✅ SOLUTION RAPIDE (5 minutes)

### Étape 1 : Dans Plesk, allez sur la page du sous-domaine

Vous êtes déjà sur la bonne page :
```
Home > Subscriptions > drive.paraweb.fr > simplix.drive.paraweb.fr
```

### Étape 2 : Cliquez sur "Hosting & DNS"

Dans le menu de gauche de la page `simplix.drive.paraweb.fr`

### Étape 3 : Cliquez sur "DNS Settings"

### Étape 4 : Vérifiez/Ajoutez l'enregistrement A

Vous devriez voir quelque chose comme :

| Type | Host | Value |
|------|------|-------|
| A | simplix | 82.165.134.105 |

**Si l'enregistrement n'existe pas :**

1. Cliquez sur "Add Record"
2. Sélectionnez "A" dans Type
3. Dans "Host" : `simplix`
4. Dans "Value/IP Address" : `82.165.134.105`
5. TTL : `3600`
6. Cliquez "OK"

### Étape 5 : Attendez la propagation (5-15 minutes)

Testez régulièrement :
```bash
nslookup simplix.drive.paraweb.fr
```

Quand ça retourne `82.165.134.105`, c'est bon !

---

## 🔒 ALTERNATIVE : Obtenir le SSL maintenant

Si vous ne voulez pas attendre la propagation DNS, vous pouvez forcer le SSL via Plesk :

### Dans Plesk :

1. Allez sur `simplix.drive.paraweb.fr`
2. Cliquez sur "SSL/TLS Certificates"
3. Sélectionnez "Let's Encrypt"
4. Cochez "Keep website secured"
5. Cliquez "Install" ou "Get it free"

Plesk essaiera d'obtenir le certificat automatiquement.

---

## 🧪 TEST MANUEL (sans attendre DNS)

En attendant la propagation DNS, vous pouvez tester l'API directement :

```bash
# Via IP (fonctionne déjà)
curl http://82.165.134.105:3000/

# Test avec le bon header Host
curl -H "Host: simplix.drive.paraweb.fr" http://82.165.134.105/
```

---

## 🎯 VÉRIFICATION FINALE

Une fois le DNS propagé et le SSL obtenu :

```bash
# Test HTTPS
curl https://simplix.drive.paraweb.fr/

# Test Login
curl -X POST https://simplix.drive.paraweb.fr/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@simplix.fr","password":"admin123"}'
```

---

## 📋 CHECKLIST

- [x] Nginx configuré pour simplix.drive.paraweb.fr
- [x] PM2 en ligne (2 instances)
- [ ] **→ DNS enregistrement A ajouté** ← VOUS ÊTES ICI
- [ ] Propagation DNS (5-15 min)
- [ ] SSL Let's Encrypt installé
- [ ] Application accessible via HTTPS

---

## 🆘 SI LE PROBLÈME PERSISTE

### Option 1 : Vérifiez les nameservers

```bash
dig NS drive.paraweb.fr
```

Assurez-vous que les nameservers pointent bien vers votre serveur ou le DNS de votre registrar.

### Option 2 : Forcez la mise à jour DNS

Dans Plesk :
1. Allez sur `Domains` > `drive.paraweb.fr`
2. Cliquez sur "DNS Settings"
3. Cliquez sur "Update" ou "Sync"

### Option 3 : Utilisez un enregistrement CNAME

Si l'enregistrement A ne fonctionne pas, essayez un CNAME :

```
Type: CNAME
Host: simplix
Value: drive.paraweb.fr
```

---

## ✅ RÉSUMÉ RAPIDE

**Ce qui fonctionne déjà :**
- ✅ API Node.js sur port 3000
- ✅ PostgreSQL avec 86 tables
- ✅ Nginx configuré
- ✅ PM2 avec 2 instances

**Ce qui manque :**
- ⏳ DNS enregistrement A pour `simplix`
- ⏳ Propagation DNS
- ⏳ SSL Let's Encrypt

**Durée estimée :** 5-15 minutes après avoir ajouté l'enregistrement DNS

---

**Prochaine action :** Ajoutez l'enregistrement DNS A dans Plesk (voir Étape 4 ci-dessus)
