# Debug Guide: JWT Authentication Flow

## ⚠️ Problème actuel
Les écrans affichent des erreurs **401 Unauthorized** car l'utilisateur n'est pas authentifié.

## 🔐 Flux d'authentification requis

```
1. Application se charge
   ↓
2. AuthContext vérifie le token stocké (AsyncStorage)
   ├─ Token trouvé → isAuthenticated = true → Affiche HomeScreen
   └─ Token NOT trouvé → isAuthenticated = false → Affiche LoginScreen
   ↓
3. Utilisateur se connecte via LoginScreen
   ↓
4. POST /api/auth/login → Reçoit token
   ↓
5. Token stocké dans AsyncStorage
   ↓
6. isAuthenticated = true → Navigation vers HomeScreen
   ↓
7. Intercepteur Axios ajoute "Authorization: Bearer <token>"
   ↓
8. Requêtes API fonctionnent ✓
```

## 🧪 Étapes pour tester

### Option 1: Créer un compte de test
1. **Accédez au RegisterScreen**
   - Cliquez sur "S'inscrire" sur le LoginScreen
   - Remplissez le formulaire:
     - Email: `test@example.com`
     - Mot de passe: `Test1234!Abc` (respecte les critères de sécurité)
     - Nom: `Test User`
   - Cliquez "S'inscrire"
   - Vérifiez que le token est reçu et stocké
   - Vous serez redirigé vers HomeScreen

### Option 2: Créer un utilisateur directement en base de données
```sql
-- Exécuter dans la base de données PostgreSQL
INSERT INTO users (
  organization_id, 
  email, 
  password_hash, 
  first_name, 
  last_name, 
  status, 
  email_verified
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'test@example.com',
  '$2a$12$...',  -- Bcrypt hash de "Test1234!Abc"
  'Test',
  'User',
  'active',
  true
);
```

### Option 3: Tester avec cURL
```bash
# 1. S'enregistrer
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234!Abc",
    "name": "Test User"
  }'

# Réponse attendue:
# {
#   "user": {...},
#   "token": "eyJhbGc...",
#   "accessToken": "eyJhbGc...",
#   "refreshToken": "eyJhbGc...",
#   "expiresIn": 900
# }

# 2. Utiliser le token pour accéder aux ressources
curl -X GET http://localhost:3000/api/customers \
  -H "Authorization: Bearer eyJhbGc..."

# Réponse attendue: 200 OK + liste des clients
```

## 🔍 Vérifier le flux

### Vérifier que le token est stocké
Ouvrez la console du navigateur et exécutez:
```javascript
// Dans React Native (web)
// Le token est dans AsyncStorage
// Impossible à accéder directement depuis la console

// À la place, inspectez le state du composant App.tsx
// ou vérifie les Network requests dans DevTools
```

### Vérifier les Network requests
1. Ouvrez DevTools (F12)
2. Allez à l'onglet "Network"
3. Naviguez vers CustomersScreen
4. Inspectez la requête GET /api/customers
5. Vérifiez le header:
   ```
   Authorization: Bearer eyJhbGc...
   ```
   - ✓ Si présent → Intercepteur fonctionne
   - ✗ Si absent → Problème d'intercepteur

### Vérifier le token JWT
```bash
# Décodez le token (pas sécurisé, juste pour debug)
# Allez à https://jwt.io et collez le token

# Résultat attendu:
# {
#   "id": "uuid-user-id",
#   "email": "test@example.com",
#   "role": "user",
#   "organization_id": "00000000-0000-0000-0000-000000000001",
#   "iat": 1697988...,
#   "exp": 1697989...
# }
```

## 📋 Checklist de vérification

- [ ] Serveur API tourne (`npm run dev` dans `/api`)
- [ ] Serveur web tourne (`npm run dev` dans `/web-app`)
- [ ] Utilisateur créé (via Register ou direct DB)
- [ ] Connexion réussie (token reçu et affiché)
- [ ] Token stocké dans AsyncStorage
- [ ] Header Authorization présent dans les requêtes
- [ ] GET /api/customers retourne 200 OK (pas 401)

## 🐛 Troubleshooting

### Problème: "Invalid token format"
**Solution**: Le token n'est pas au format JWT valide (3 parties séparées par des points)
- Vérifiez que le serveur retourne bien `token` et `accessToken`
- Vérifiez que `JWT_SECRET` est défini dans `.env`

### Problème: "Token verification error"
**Solution**: La signature du token ne correspond pas au secret
- Assurez-vous que `JWT_SECRET` est identique côté client et serveur
- Dans `.env`: `JWT_SECRET=your-secret-key-change-in-production`

### Problème: "401 Unauthorized" même avec token
**Solution**: L'intercepteur n'ajoute pas le token au header
- Vérifiez que `api.interceptors.request.use()` est exécuté
- Vérifiez que `storage.getToken()` retourne une valeur

### Problème: "User not found"
**Solution**: L'utilisateur n'existe pas en base de données
- Créez un utilisateur via Register
- Ou insérez directement en BD

## 📝 Étapes suivantes après test

1. ✅ Vérifier que toutes les requêtes API reçoivent le token
2. ✅ Tester tous les endpoints (GET, POST, PUT, DELETE)
3. ✅ Implémenter le refresh token (token expiration)
4. ✅ Ajouter un endpoint de logout
5. ✅ Améliorer la sécurité (httpOnly cookies au lieu de localStorage)
