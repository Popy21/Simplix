# 📊 Analyse Complète de la Codebase Simplix - JWT Authentication

## ✅ Ce qui est DÉJÀ IMPLÉMENTÉ

### Backend API (auth.ts)
- ✅ **POST /auth/register** - Création de compte avec tokens
- ✅ **POST /auth/login** - Connexion avec génération de paire de tokens
- ✅ **POST /auth/refresh** - Renouvellement des tokens
- ✅ **GET /auth/me** - Récupération de l'utilisateur courant
- ✅ **POST /auth/change-password** - Changement de mot de passe
- ✅ **POST /auth/logout** - Déconnexion
- ✅ **POST /auth/validate-password** - Validation de la force du mot de passe
- ✅ Token Pair Generation (access + refresh)
- ✅ JWT Token Verification
- ✅ Refresh Token Storage en BD
- ✅ Password Hashing (Bcrypt)

### Middleware (auth.ts)
- ✅ `authenticateToken` - Vérification JWT
- ✅ `authorizeRole` - Vérification des permissions
- ✅ `requireOrganization` - Validation multi-tenancy
- ✅ Validation du format JWT (3 parties)
- ✅ Gestion d'erreurs JWT détaillée

### Frontend Services (api.ts)
- ✅ Axios Instance avec configuration
- ✅ Request Interceptor (ajoute token Bearer)
- ✅ Response Interceptor (gère 401)
- ✅ Service methods pour auth

### Frontend Context (AuthContext.tsx)
- ✅ Login, Register, Logout
- ✅ Change Password
- ✅ Token & User Management
- ✅ Auth State Management
- ✅ Token Storage (AsyncStorage)

### Database
- ✅ Migration 006_jwt_tokens.sql
- ✅ Table refresh_tokens pour révocation
- ✅ Indexes pour performance

---

## ❌ CE QUI MANQUE

### 1. **Frontend - Refresh Token Handling MANQUANT**

**Problème**: Le frontend n'implémente PAS automatiquement le refresh des tokens
- L'accessToken expire après 15 minutes
- Pas de mécanisme pour utiliser le refreshToken
- Les requêtes échoueront après 15 minutes avec 401

**Fichier à créer/modifier**: `web-app/src/utils/tokenManager.ts` (NOUVEAU)

**Impact**: Token va expirer et l'utilisateur sera déconnecté sans pouvoir se reconnecter automatiquement

### 2. **Frontend - Refresh Token Storage MANQUANT**

**Problème**: Le frontend ne stocke PAS le refreshToken
- Seul le accessToken est stocké
- `authService.login()` ne stocke pas le refreshToken
- Impossible de rafraîchir le token

**Fichier à modifier**: 
- `web-app/src/utils/storage.ts` - Ajouter `saveRefreshToken()`, `getRefreshToken()`
- `web-app/src/context/AuthContext.tsx` - Stocker le refreshToken reçu
- `web-app/src/services/api.ts` - Utiliser le refreshToken dans l'interceptor

**Code manquant**:
```typescript
// storage.ts - MANQUANT
async saveRefreshToken(refreshToken: string): Promise<void>
async getRefreshToken(): Promise<string | null>
```

```typescript
// AuthContext.tsx - MANQUANT
const login = async (email, password) => {
  const { token, refreshToken } = response.data;
  await storage.saveRefreshToken(refreshToken); // <- MANQUANT!
};
```

### 3. **Frontend - Token Refresh Interceptor Response MANQUANT**

**Problème**: L'interceptor response ne gère PAS correctement le refresh
- Il détecte bien le 401
- Mais il ne call pas `/auth/refresh`
- Il n'utilise pas le refreshToken pour obtenir un nouveau token

**Fichier à modifier**: `web-app/src/services/api.ts`

**Code manquant**:
```typescript
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      try {
        const refreshToken = await storage.getRefreshToken(); // <- Besoin de cette fonction
        if (refreshToken) {
          // Appeler POST /auth/refresh <- MANQUANT
          // Mettre à jour le token <- MANQUANT
          // Retry la requête <- MANQUANT
        }
      } catch (err) {
        // Clear auth and redirect
      }
    }
    return Promise.reject(error);
  }
);
```

### 4. **Frontend - Logout Implementation MANQUANT**

**Problème**: Le logout n'appelle pas l'API
- `AuthContext.logout()` ne call pas `/auth/logout`
- Il ne nettoie pas les refresh tokens en BD
- Le token reste valide en BD

**Fichier à modifier**: `web-app/src/context/AuthContext.tsx`

**Code manquant**:
```typescript
const logout = async () => {
  try {
    await authService.logout(); // <- MANQUANT! Ne fait pas la requête API
    await storage.clearAuth();
    setToken(null);
    setUser(null);
  } catch (error) {
    // ...
  }
};
```

**Fichier à modifier**: `web-app/src/services/api.ts`

**Code manquant**:
```typescript
export const authService = {
  // ...
  logout: () => api.post('/auth/logout'), // <- MANQUANT!
};
```

### 5. **Frontend - Error Handling pour Expired Token MANQUANT**

**Problème**: Pas de UI feedback quand token expire
- Utilisateur ne sait pas pourquoi ça ne fonctionne plus
- Pas de message "Session expirée, veuillez vous reconnecter"
- L'app silencieusement échoue

**Fichier à modifier**: `web-app/src/services/api.ts` et `web-app/src/context/AuthContext.tsx`

**Code manquant**:
```typescript
// Besoin d'une fonction pour notifier l'utilisateur
const notifySessionExpired = () => {
  Alert.alert(
    'Session expirée',
    'Votre session a expiré. Veuillez vous reconnecter.',
    [{ text: 'OK', onPress: () => redirectToLogin() }]
  );
};
```

### 6. **Frontend - Organization ID in Header MANQUANT**

**Problème**: Les requêtes n'envoient PAS l'organization_id
- Backend middleware `requireOrganization` l'attend
- Multi-tenancy ne fonctionne pas correctement
- Risque de data leak entre organisations

**Fichier à modifier**: `web-app/src/services/api.ts`

**Code manquant**:
```typescript
api.interceptors.request.use(async (config) => {
  const token = await storage.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // MANQUANT:
  // const orgId = await storage.getOrgId();
  // if (orgId) {
  //   config.headers['X-Organization-Id'] = orgId;
  // }
  
  return config;
});
```

### 7. **Frontend - Token Expiry Proactive Check MANQUANT**

**Problème**: Pas de vérification proactive de l'expiration
- Token expira sans prévention
- Utilisateur ne peut pas se reconnecter avant
- Mauvaise UX

**Fichier à créer**: `web-app/src/utils/tokenManager.ts`

**Code manquant**:
```typescript
export const isTokenExpiringSoon = (token: string, bufferSeconds = 300) => {
  const decoded = jwtDecode(token);
  const expiresIn = decoded.exp * 1000 - Date.now();
  return expiresIn < bufferSeconds * 1000;
};

// À utiliser dans un useEffect:
useEffect(() => {
  const checkTokenExpiry = async () => {
    const token = await storage.getToken();
    if (token && isTokenExpiringSoon(token)) {
      // Refresh token proactivement
      await refreshAccessToken();
    }
  };
  
  const interval = setInterval(checkTokenExpiry, 60000); // Check toutes les 60s
  return () => clearInterval(interval);
}, []);
```

### 8. **Frontend - Register ne stocke pas le refreshToken MANQUANT**

**Problème**: L'enregistrement crée un token mais ne le stocke pas complètement

**Fichier à modifier**: `web-app/src/context/AuthContext.tsx`

```typescript
const register = async (email, password, name) => {
  const response = await authService.register({ email, password, name });
  const { token, refreshToken } = response.data; // <- refreshToken reçu
  
  await storage.saveToken(token);
  // await storage.saveRefreshToken(refreshToken); <- MANQUANT!
  
  setToken(token);
  setUser(newUser);
};
```

### 9. **Frontend - TestAllScreen ne teste pas le refresh MANQUANT**

**Problème**: Les tests n'incluent pas le flow de refresh

**Fichier à modifier**: `web-app/src/screens/TestAllScreen.tsx`

**Code manquant**:
```typescript
// Ajouter test pour le refresh endpoint
await test(
  'POST /api/auth/refresh',
  async () => {
    const refreshToken = await storage.getRefreshToken();
    const response = await api.post('/api/auth/refresh', { refreshToken });
    return {
      message: '✓ Token refreshed successfully',
      data: response.data,
    };
  },
  'Authentication'
);
```

### 10. **Frontend - Navigation/Redirection après Token Expiry MANQUANT**

**Problème**: Pas de logique pour rediriger vers login après expiration

**Fichier à modifier**: `web-app/src/services/api.ts`

**Code manquant**:
```typescript
const api = axios.create({...});

// Besoin d'une référence au navigation ou state manager
// pour rediriger quand session expire
```

---

## 🎯 PLAN D'IMPLÉMENTATION

### PRIORITÉ 1 - CRITIQUE (Sans cela, rien ne fonctionne)
1. ✅ Créer `web-app/src/utils/tokenManager.ts`
   - Fonction `isTokenExpired()`
   - Fonction `isTokenExpiringSoon()`
   - Fonction `refreshAccessToken()`

2. ✅ Modifier `web-app/src/utils/storage.ts`
   - Ajouter `saveRefreshToken()`, `getRefreshToken()`, `removeRefreshToken()`

3. ✅ Modifier `web-app/src/context/AuthContext.tsx`
   - Stocker refreshToken dans login() et register()
   - Implémenter fonction `refreshToken()`
   - Ajouter logique de refresh automatique dans useEffect

4. ✅ Modifier `web-app/src/services/api.ts`
   - Response interceptor utiliser refreshToken
   - POST /auth/refresh implementation
   - Retry logic après refresh

### PRIORITÉ 2 - IMPORTANT (Pour la qualité)
5. ✅ Ajouter `logout()` à `authService`
6. ✅ Implémenter `/auth/logout` call dans `AuthContext.logout()`
7. ✅ Ajouter tests pour refresh dans `TestAllScreen.tsx`
8. ✅ Ajouter notifications d'erreur utilisateur

### PRIORITÉ 3 - BONUS (Sécurité avancée)
9. Ajouter support pour Organization ID header
10. Ajouter proactive token refresh check
11. Implémenter token rotation strategy
12. Ajouter rate limiting sur refresh endpoint

---

## 📋 Résumé des Modifications Nécessaires

| Fichier | Statut | Action | Lignes |
|---------|--------|--------|--------|
| `web-app/src/utils/tokenManager.ts` | ❌ NOUVEAU | Créer | ~100 |
| `web-app/src/utils/storage.ts` | ⚠️ INCOMPLET | Ajouter refresh token methods | ~20 |
| `web-app/src/services/api.ts` | ⚠️ INCOMPLET | Ajouter refresh logic | ~50 |
| `web-app/src/context/AuthContext.tsx` | ⚠️ INCOMPLET | Ajouter refresh + logout | ~50 |
| `web-app/src/screens/TestAllScreen.tsx` | ⚠️ INCOMPLET | Ajouter tests refresh | ~20 |
| `api/src/routes/auth.ts` | ✅ OK | Rien à faire | - |
| `api/src/middleware/auth.ts` | ✅ OK | Rien à faire | - |

---

## 🚨 Problème CRITIQUE Actuellement

**Situation**: 
- ✅ Utilisateur se connecte (token reçu)
- ✅ Token stocké dans AsyncStorage
- ✅ Interceptor ajoute token aux requêtes
- ❌ **Après 15 minutes**: Token expire
- ❌ **Requête suivante**: 401 Unauthorized
- ❌ **Pas de refresh**: Utilisateur reste bloqué
- ❌ **Interceptor efface token**: Utilisateur redirigé à login

**Résultat**: Utilisateur ne peut pas utiliser l'app plus de 15 minutes!

---

## 📝 Tests de Validation

Après implémentation:

```bash
# 1. Se connecter
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@simplix.local", "password": "Test123!Abc"}'

# 2. Attendre 16 minutes OU modifier l'expiry à 10s dans .env
# JWT_EXPIRY=10s

# 3. Faire une requête avec le token (sera 401)

# 4. Refresh le token
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "<refreshToken>"}'

# 5. Utiliser le nouveau token (doit fonctionner)
curl -X GET http://localhost:3000/api/customers \
  -H "Authorization: Bearer <newAccessToken>"
```

---

## 🎓 Architecture Complète Après Implémentation

```
┌─────────────────────────────────────────┐
│         Frontend (web-app)              │
│                                         │
│  LoginScreen                            │
│       ↓                                 │
│  POST /auth/login                       │
│       ↓ (reçoit accessToken + refreshToken)
│  AsyncStorage.setItem(token, refresh)  │
│       ↓                                 │
│  AuthContext { isAuthenticated=true }   │
│       ↓                                 │
│  HomeScreen + API calls                 │
│       ↓                                 │
│  Interceptor ajoute: Bearer token       │
│       ↓                                 │
│  Si response 401:                       │
│    - GET refreshToken d'AsyncStorage   │
│    - POST /auth/refresh                 │
│    - Mise à jour accessToken            │
│    - Retry requête originale            │
│    ↓ Si refresh 401:                    │
│    - Clear AsyncStorage                 │
│    - AuthContext { isAuthenticated=false}
│    - Redirection LoginScreen            │
└─────────────────────────────────────────┘
           ↕ HTTP Requests
┌─────────────────────────────────────────┐
│        Backend API (Express)            │
│                                         │
│ POST /auth/login                        │
│   ↓ Vérifier credentials                │
│   ↓ Générer accessToken (15m)           │
│   ↓ Générer refreshToken (7d)           │
│   ↓ Stocker refreshToken en BD          │
│   ↓ Retourner les deux tokens           │
│                                         │
│ POST /auth/refresh                      │
│   ↓ Vérifier refreshToken               │
│   ↓ Générer nouveau accessToken         │
│   ↓ Retourner nouveau token             │
│                                         │
│ GET /api/* (protégée)                   │
│   ↓ Middleware vérifie accessToken      │
│   ↓ Si valide: req.user = {id, email}   │
│   ↓ Si invalide: 401 Unauthorized       │
│                                         │
│ POST /auth/logout                       │
│   ↓ Supprimer refreshToken de BD        │
│   ↓ Retourner success                   │
└─────────────────────────────────────────┘
           ↕ PostgreSQL
┌─────────────────────────────────────────┐
│           Database                      │
│                                         │
│ users { id, email, password_hash }      │
│ refresh_tokens { user_id, token, exp }  │
│                                         │
│ Lors du logout: DELETE refresh_tokens   │
│ Lors du refresh: UPDATE refresh_tokens  │
└─────────────────────────────────────────┘
```
