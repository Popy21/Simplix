# Fix: JWT Authorization pour les requêtes API

## Problème identifié
Les requêtes HTTP du web-app vers l'API retournaient des erreurs **401 Unauthorized** car le token JWT n'était pas automatiquement envoyé au serveur.

**Erreurs observées:**
```
GET http://localhost:3000/api/products 401 (Unauthorized)
GET http://localhost:3000/api/customers 401 (Unauthorized)
```

## Cause racine
L'instance Axios dans `web-app/src/services/api.ts` n'avait pas d'intercepteur de requête pour ajouter automatiquement le header `Authorization: Bearer <token>` à chaque appel API.

## Solution implémentée

### 1. Ajout d'intercepteurs Axios (`api.ts`)

**Request Interceptor:**
```typescript
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await storage.getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error retrieving token:', error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);
```

- Récupère le token du stockage local à chaque requête
- Ajoute automatiquement le header `Authorization` avec le token
- Gère les erreurs de récupération du token

**Response Interceptor:**
```typescript
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      try {
        await storage.clearAuth();
        console.log('Token expired or invalid, user logged out');
      } catch (err) {
        console.error('Error clearing auth:', err);
      }
    }
    return Promise.reject(error);
  }
);
```

- Détecte les erreurs 401 (token expiré/invalide)
- Efface automatiquement les données d'authentification du stockage
- Permet une redirection vers la page de connexion

### 2. Simplification de `authService`

**Avant (redondant):**
```typescript
authService = {
  me: (token: string) =>
    api.get('/auth/me', { headers: { Authorization: `Bearer ${token}` } }),
  changePassword: (token: string, data: {...}) =>
    api.post('/auth/change-password', data, {
      headers: { Authorization: `Bearer ${token}` },
    }),
}
```

**Après (avec intercepteur):**
```typescript
authService = {
  me: () => api.get('/auth/me'),
  changePassword: (data: {...}) =>
    api.post('/auth/change-password', data),
}
```

Les tokens sont maintenant gérés automatiquement par l'intercepteur.

### 3. Mise à jour des appels dans `AuthContext`

**Avant:**
```typescript
const response = await authService.me(storedToken);
await authService.changePassword(token, { currentPassword, newPassword });
```

**Après:**
```typescript
const response = await authService.me();
await authService.changePassword({ currentPassword, newPassword });
```

### 4. Correction de `TestAllScreen`

Mise à jour de l'appel test pour utiliser la nouvelle signature sans token en paramètre.

## Fichiers modifiés
- ✅ `/web-app/src/services/api.ts` - Ajout des intercepteurs
- ✅ `/web-app/src/context/AuthContext.tsx` - Simplification des appels
- ✅ `/web-app/src/screens/TestAllScreen.tsx` - Correction des appels test

## Résultat attendu
Toutes les requêtes API incluront désormais automatiquement le header `Authorization: Bearer <token>`, ce qui devrait résoudre les erreurs 401 et permettre:
- ✅ Récupération des produits
- ✅ Récupération des clients
- ✅ Récupération des commandes
- ✅ Gestion automatique de l'expiration du token

## Flux d'authentification
1. Utilisateur se connecte → token reçu et stocké
2. Chaque requête API → intercepteur ajoute le token automatiquement
3. Token expiré → réponse 401 → intercepteur efface le token → redirection login
4. Utilisateur connecté → requête API normale → intercepteur ajoute le token

## Architecture de sécurité
- **JWT Token**: Stocké dans le local storage (peut être amélioré avec httpOnly cookies)
- **Bearer Header**: Format standard pour les APIs REST
- **Auto-refresh**: À implémenter si besoin de refresh tokens
- **Logout**: Effacement du stockage lors des erreurs 401
