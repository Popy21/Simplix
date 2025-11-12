# 🔐 Solution : Erreur HSTS avec Certificat Auto-Signé

## ❌ Problème Rencontré

```
net::ERR_CERT_AUTHORITY_INVALID
Vous ne pouvez pas visiter simplix.drive.paraweb.fr maintenant parce que le site utilise HSTS.
```

Le navigateur refuse d'accepter le certificat auto-signé à cause de la politique HSTS (HTTP Strict Transport Security).

---

## ✅ Solution 1 : Supprimer l'entrée HSTS dans Opera

### Étapes pour Opera :

1. **Ouvrez cette page dans Opera :**
   ```
   opera://net-internals/#hsts
   ```

2. **Dans la section "Delete domain security policies" :**
   - Tapez : `simplix.drive.paraweb.fr`
   - Cliquez sur **"Delete"**

3. **Fermez complètement Opera** (Cmd+Q sur Mac)

4. **Rouvrez Opera** et essayez à nouveau :
   ```
   https://simplix.drive.paraweb.fr
   ```

---

## ✅ Solution 2 : Utiliser Chrome ou Firefox

### Chrome :
1. Ouvrez : `chrome://net-internals/#hsts`
2. Section "Delete domain security policies"
3. Entrez : `simplix.drive.paraweb.fr`
4. Cliquez "Delete"
5. Redémarrez Chrome

### Firefox :
1. Ouvrez : `about:support`
2. Cliquez "Clear Startup Cache"
3. Redémarrez Firefox
4. Essayez : `https://simplix.drive.paraweb.fr`

---

## ✅ Solution 3 : Accès Direct par IP (Sans HTTPS)

Si les solutions ci-dessus ne fonctionnent pas, accédez directement par HTTP :

```
http://82.165.134.105
```

⚠️ **Attention :** Cette méthode fonctionne UNIQUEMENT si vous avez modifié votre fichier `/etc/hosts` comme indiqué dans ACCES_IMMEDIAT.md

---

## ✅ Solution 4 : Mode Incognito/Navigation Privée

Essayez d'ouvrir en mode navigation privée :
- **Opera :** Cmd+Shift+N (Mac) ou Ctrl+Shift+N (Windows)
- **Chrome :** Cmd+Shift+N (Mac) ou Ctrl+Shift+N (Windows)
- **Firefox :** Cmd+Shift+P (Mac) ou Ctrl+Shift+P (Windows)

Puis allez sur : `https://simplix.drive.paraweb.fr`

---

## 🔄 Solution Permanente : Obtenir un Vrai Certificat SSL

Une fois le DNS propagé (dans 5-24h), installez Let's Encrypt :

```bash
sshpass -p 'uF.6734Simplix' ssh root@82.165.134.105 << 'EOF'
certbot --nginx -d simplix.drive.paraweb.fr \
  --non-interactive \
  --agree-tos \
  --email admin@simplix.fr
systemctl reload nginx
EOF
```

Cela donnera un certificat SSL valide reconnu par tous les navigateurs ! 🎉

---

## 📞 Besoin d'Aide ?

Si aucune solution ne fonctionne, essayez dans l'ordre :
1. Solution 1 (Supprimer HSTS)
2. Solution 4 (Mode Incognito)
3. Solution 2 (Changer de navigateur)
4. Solution 3 (Accès HTTP direct par IP)

**Note :** La solution permanente (Let's Encrypt) résoudra définitivement ce problème.
