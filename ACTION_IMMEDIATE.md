# ⚡ ACTION IMMÉDIATE - Configuration DNS

## ✅ VOTRE APPLICATION EST DÉJÀ EN LIGNE !

```
🟢 API Node.js : ONLINE (2 instances PM2)
🟢 PostgreSQL  : ONLINE (86 tables)
🟢 Nginx       : ONLINE (port 80, 443)

Test immédiat : http://82.165.134.105:3000/
```

---

## 🎯 IL MANQUE JUSTE LE DNS (5 MINUTES)

### 📸 SUIVEZ CES ÉTAPES DANS PLESK :

#### 1. Vous êtes sur cette page :
```
Home > Subscriptions > drive.paraweb.fr > simplix.drive.paraweb.fr
```

#### 2. Cliquez sur "Hosting & DNS" (menu gauche)

#### 3. Cliquez sur "DNS Settings"

#### 4. Vérifiez qu'il y a cet enregistrement :

```
Type: A
Host: simplix
IP Address: 82.165.134.105
```

**Si l'enregistrement manque :**
- Cliquez "Add Record"
- Type : **A**
- Host : **simplix**
- Value : **82.165.134.105**
- Cliquez **OK**

#### 5. Attendez 5-15 minutes

Testez avec :
```bash
nslookup simplix.drive.paraweb.fr
```

Quand ça retourne `82.165.134.105` → C'est prêt !

---

## 🔒 OBTENIR LE SSL (2 MINUTES)

### Une fois le DNS propagé :

#### 1. Sur la page `simplix.drive.paraweb.fr`

#### 2. Cliquez sur "SSL/TLS Certificates"

#### 3. Section "Let's Encrypt"
- Cochez ☑️ "Keep website secured"
- Cliquez **"Get it free"** ou **"Install"**

**Plesk obtient le certificat automatiquement !**

---

## ✅ RÉSULTAT FINAL

Après ces 2 étapes (7 minutes total) :

```
https://simplix.drive.paraweb.fr
```

Votre CRM sera accessible en HTTPS !

---

## 🧪 TEST IMMÉDIAT (SANS ATTENDRE)

En attendant le DNS, testez via IP :

```bash
# Test API
curl http://82.165.134.105:3000/

# Test Login
curl -X POST http://82.165.134.105:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@simplix.fr","password":"admin123"}'
```

---

## 📋 IDENTIFIANTS

```
Email    : admin@simplix.fr
Password : admin123
```

---

## 🎊 APRÈS LE DNS

**Accédez à :**
```
https://simplix.drive.paraweb.fr
```

**Et connectez-vous avec :**
- Email : `admin@simplix.fr`
- Password : `admin123`

---

## 📊 RÉCAPITULATIF

| Étape | Statut | Durée |
|-------|--------|-------|
| Infrastructure installée | ✅ FAIT | 10 min |
| PostgreSQL configuré | ✅ FAIT | 2 min |
| Application déployée | ✅ FAIT | 2 min |
| Nginx configuré | ✅ FAIT | 1 min |
| **DNS à configurer** | ⏳ **À FAIRE** | **5 min** |
| SSL Let's Encrypt | ⏳ Après DNS | 2 min |

---

**TOTAL : 7 minutes de votre part, puis l'application est 100% opérationnelle !**

---

## 🆘 BESOIN D'AIDE ?

Consultez [GUIDE_DNS_PLESK.md](GUIDE_DNS_PLESK.md) pour des instructions détaillées.
