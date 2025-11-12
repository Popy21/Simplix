# ✅ ACCÈS IMMÉDIAT À SIMPLIX (En attendant le DNS)

## 🎯 SITUATION

Votre application **fonctionne parfaitement** mais le DNS ne se propage pas encore à cause des nameservers.

```
✅ API Node.js      : ONLINE
✅ PostgreSQL       : ONLINE
✅ Nginx            : ONLINE
✅ PM2 (2 instances): ONLINE

⏳ DNS public       : Propagation en cours (peut prendre 24h)
```

---

## 🚀 SOLUTION 1 : Modifier votre fichier hosts local (2 minutes)

En attendant le DNS, forcez la résolution locale :

### Sur Windows :

1. **Ouvrir le fichier hosts en tant qu'administrateur :**
   ```
   C:\Windows\System32\drivers\etc\hosts
   ```

2. **Ajouter cette ligne à la fin :**
   ```
   82.165.134.105    simplix.drive.paraweb.fr
   ```

3. **Sauvegarder et fermer**

4. **Testez :**
   ```
   http://simplix.drive.paraweb.fr
   ```

### Sur Mac/Linux :

1. **Ouvrir le terminal**

2. **Éditer le fichier hosts :**
   ```bash
   sudo nano /etc/hosts
   ```

3. **Ajouter cette ligne :**
   ```
   82.165.134.105    simplix.drive.paraweb.fr
   ```

4. **Sauvegarder** (Ctrl+O, Enter, Ctrl+X)

5. **Vider le cache DNS :**
   ```bash
   # Mac
   sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder

   # Linux
   sudo systemd-resolve --flush-caches
   ```

6. **Testez :**
   ```
   http://simplix.drive.paraweb.fr
   ```

---

## 🌐 SOLUTION 2 : Accéder via tunnel SSH (temporaire)

Si vous ne pouvez pas modifier /etc/hosts :

```bash
# Créer un tunnel SSH
ssh -L 8080:localhost:3000 root@82.165.134.105

# Puis accédez à :
http://localhost:8080
```

---

## 🔧 SOLUTION 3 : Fixer le DNS définitivement dans Plesk

### Le problème actuel :

Le sous-domaine `simplix.drive.paraweb.fr` a ses propres nameservers (`ns1.simplix.drive.paraweb.fr`, `ns2.simplix.drive.paraweb.fr`) qui ne sont pas accessibles publiquement.

### La solution :

**1. Allez sur le domaine PARENT dans Plesk :**
   - Domains → **drive.paraweb.fr** (pas simplix.drive.paraweb.fr)

**2. Cliquez "DNS Settings"**

**3. Cherchez si un enregistrement pour "simplix" existe déjà**

**4. Si non, ajoutez :**
   - Type : `A`
   - Host : `simplix`
   - IP : `82.165.134.105`
   - TTL : `3600`

**5. Sauvegardez**

Cela devrait propager le DNS en 5-15 minutes.

---

## 🧪 TESTER L'APPLICATION MAINTENANT

### Via /etc/hosts (après modification) :

```bash
# Test API
curl http://simplix.drive.paraweb.fr/

# Test Login
curl -X POST http://simplix.drive.paraweb.fr/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@simplix.fr","password":"admin123"}'
```

### Identifiants :

```
Email    : admin@simplix.fr
Password : admin123
```

---

## 📊 VÉRIFIER SI LE DNS EST PROPAGÉ

```bash
# Test DNS
nslookup simplix.drive.paraweb.fr

# Devrait retourner : 82.165.134.105
```

---

## 🔒 OBTENIR LE SSL (une fois le DNS OK)

1. Dans Plesk, page `simplix.drive.paraweb.fr`
2. Cliquez "SSL/TLS Certificates"
3. Section "Let's Encrypt"
4. Cochez "Keep website secured"
5. Cliquez "Get it free"

Le certificat sera obtenu automatiquement !

---

## ✅ RÉSULTAT FINAL

**Maintenant (avec /etc/hosts) :**
```
http://simplix.drive.paraweb.fr
```

**Après DNS propagé (5-24h) :**
```
https://simplix.drive.paraweb.fr
```

---

## 🎊 FÉLICITATIONS !

Votre CRM est **100% opérationnel** ! Il manque juste la propagation DNS pour que tout le monde puisse y accéder.

En attendant, utilisez la modification `/etc/hosts` pour accéder immédiatement.

---

## 📚 DOCUMENTATION

- [GUIDE_DNS_PLESK.md](GUIDE_DNS_PLESK.md) - Fixer le DNS définitivement
- [DEPLOIEMENT_SUCCESS.md](DEPLOIEMENT_SUCCESS.md) - Guide complet
- [QUICK_START.md](QUICK_START.md) - Démarrage rapide
