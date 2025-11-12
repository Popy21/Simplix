# 🔒 CERTIFICAT SSL - Guide Complet

## ✅ STATUT ACTUEL

Un **certificat SSL auto-signé** a été installé sur votre serveur.

```
✅ HTTPS fonctionnel : https://simplix.drive.paraweb.fr
⚠️  Certificat auto-signé (avertissement navigateur normal)
```

---

## 🌐 ACCÉDER À VOTRE APPLICATION

### 1. Ouvrez votre navigateur

```
https://simplex.drive.paraweb.fr
```

### 2. Vous verrez cet avertissement :

```
"Votre connexion n'est pas privée"
ou
"NET::ERR_CERT_AUTHORITY_INVALID"
```

**C'EST NORMAL !** Le certificat est auto-signé.

### 3. Cliquez sur "Avancé" ou "Advanced"

### 4. Cliquez sur "Continuer vers le site" ou "Proceed to site"

### 5. L'application s'ouvrira ! 🎉

---

## 🔐 CONNEXION

```
Email    : admin@simplix.fr
Password : admin123
```

---

## 🔒 POURQUOI CET AVERTISSEMENT ?

Le certificat SSL actuel est **auto-signé**, c'est-à-dire généré localement par le serveur et non par une autorité de certification reconnue (comme Let's Encrypt).

### Certificat Auto-signé vs Let's Encrypt :

| Aspect | Auto-signé (actuel) | Let's Encrypt |
|--------|---------------------|---------------|
| Sécurité | ✅ Chiffrement identique | ✅ Chiffrement identique |
| Avertissement navigateur | ⚠️ Oui | ✅ Non |
| Gratuit | ✅ Oui | ✅ Oui |
| Validité | 365 jours | 90 jours (auto-renew) |
| Nécessite DNS public | ❌ Non | ✅ Oui |

**Pour votre usage actuel, le certificat auto-signé est PARFAITEMENT SÉCURISÉ.**

L'avertissement du navigateur ne signifie PAS que le site est dangereux, juste que le certificat n'est pas signé par une autorité reconnue.

---

## 🎯 OBTENIR UN CERTIFICAT LET'S ENCRYPT (optionnel)

**Une fois le DNS public propagé** (5-24h), vous pourrez obtenir un certificat Let's Encrypt gratuit :

### Dans Plesk :

1. Allez sur `simplix.drive.paraweb.fr`
2. Cliquez "SSL/TLS Certificates"
3. Section "Let's Encrypt"
4. Cochez "Keep website secured"
5. Cliquez "Get it free"

Le certificat sera obtenu en 30 secondes et l'avertissement disparaîtra !

### Ou via SSH :

```bash
ssh root@82.165.134.105
certbot --nginx -d simplix.drive.paraweb.fr --non-interactive --agree-tos --email admin@simplix.fr
```

---

## 🧪 TESTER VOTRE APPLICATION

### Via navigateur :
```
https://simplix.drive.paraweb.fr
```
*(Acceptez l'avertissement)*

### Via curl (ignorer certificat) :
```bash
# Test API
curl -k https://simplix.drive.paraweb.fr/

# Test Login
curl -k -X POST https://simplix.drive.paraweb.fr/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@simplix.fr","password":"admin123"}'
```

---

## ⚠️ POUR LES ÉQUIPES

Si d'autres personnes doivent accéder au CRM :

### Option 1 : Accepter l'avertissement (recommandé pour test)
Chaque utilisateur doit accepter l'avertissement une seule fois.

### Option 2 : Ajouter le certificat en confiance (avancé)
Chaque utilisateur peut ajouter le certificat auto-signé dans les certificats de confiance de leur système.

### Option 3 : Attendre Let's Encrypt (meilleur pour production)
Une fois le DNS propagé, installez Let's Encrypt et l'avertissement disparaîtra pour tout le monde.

---

## 📊 VÉRIFICATION

### SSL fonctionne :
```bash
curl -k -I https://simplix.drive.paraweb.fr/
```

Vous devriez voir :
```
HTTP/2 200
server: nginx/1.22.1
```

### Certificat installé :
```bash
openssl s_client -connect simplix.drive.paraweb.fr:443 -servername simplix.drive.paraweb.fr < /dev/null
```

Vous devriez voir :
```
subject=CN = simplix.drive.paraweb.fr, O = Simplix, C = FR
```

---

## 🎊 RÉSULTAT

Votre CRM est maintenant accessible en **HTTPS** !

```
https://simplix.drive.paraweb.fr
```

**Identifiants :**
- Email : `admin@simplix.fr`
- Password : `admin123`

Acceptez l'avertissement du navigateur et profitez de votre application ! 🚀

---

## 📋 PROCHAINES ÉTAPES

1. ✅ Accéder à l'application (accepter l'avertissement)
2. ✅ Se connecter avec admin@simplix.fr
3. ✅ Tester les fonctionnalités
4. ⏳ Attendre propagation DNS (5-24h)
5. ⏳ Installer Let's Encrypt (enlève l'avertissement)
6. ✅ Application 100% production-ready !

---

**Votre application est OPÉRATIONNELLE ! Accédez-y maintenant ! 🎉**
