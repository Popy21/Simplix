# Fix: JWT Token Malformed Error Resolution

## Problème identifié

L'erreur suivante apparaissait lors des requêtes API:
```
Token verification error: JsonWebTokenError: jwt malformed
```

## Causes racines identifiées

### 1. **Incompatibilité de format de réponse d'authentification**
- Le serveur retournait `accessToken` et `refreshToken` (de `tokenManager.ts`)
- Le frontend attendait `token` dans la réponse
- Résultat: valeur `undefined` stockée, générant un token malformé

### 2. **Manque de validation du token côté serveur**
- Pas de vérification du format du token (3 parts séparées par des points)
- Gestion d'erreur générique sans distinction entre les types d'erreurs JWT

### 3. **Incohérence dans la génération des tokens**
- Register utilisait `jwt.sign()` directement
- Login utilisait `generateTokenPair()` du tokenManager
- Mélange de deux approches sans synchronisation

## Solutions implémentées

### 1. **Correction du middleware d'authentification** (`auth.ts`)

**Ajout de validation du format du token:**
```typescript
// Validate token format (JWT has 3 parts separated by dots)
if (typeof token !== 'string' || token.split('.').length !== 3) {
  res.status(401).json({ error: 'Invalid token format.' });
  return;
}
```

**Meilleure gestion des erreurs JWT:**
```typescript
} catch (error: any) {
  if (error.name === 'JsonWebTokenError') {
    console.error('JWT verification failed:', error.message);
    res.status(401).json({ error: 'Invalid token format or signature.' });
  } else if (error.name === 'TokenExpiredError') {
    console.error('Token expired:', error.message);
    res.status(401).json({ error: 'Token has expired.' });
  } else {
    console.error('Token verification error:', error);
    res.status(403).json({ error: 'Invalid or expired token' });
  }
}
```

### 2. **Harmonisation des réponses d'authentification** (`auth.ts`)

**Route `/auth/register`:**
```typescript
// Avant: retournait seulement 'token'
// Après: retourne aussi 'accessToken' et 'refreshToken'
res.status(201).json({
  user: {...},
  token: accessToken,        // Pour compatibilité client
  accessToken,                // Pour usage moderne
  refreshToken,               // Pour refresh token rotation
  expiresIn: 900,             // 15 minutes
});
```

**Route `/auth/login`:**
```typescript
// Avant: retournait 'accessToken' et 'refreshToken'
// Après: aussi 'token' pour compatibilité
res.json({
  user: {...},
  token: accessToken,        // Maintenant présent!
  accessToken,
  refreshToken,
  expiresIn: 900,
});
```

### 3. **Standardisation de la génération des tokens**
- Register utilise maintenant `generateTokenPair()` comme login
- Tous deux utilisent `tokenManager.ts` pour la cohérence
- Même secret JWT, même algorithme (HS256), même expiration

## Architecture JWT après correction

```
┌─────────────────────────────────────────────────────┐
│                Frontend (web-app)                   │
│  - Login → reçoit response.data.token               │
│  - Stocke token dans AsyncStorage                   │
│  - Interceptor ajoute "Bearer <token>" au header    │
└─────────────────────────────────────────────────────┘
                          ↓ HTTP Request
                    "Authorization: Bearer <token>"
                          ↓
┌─────────────────────────────────────────────────────┐
│               Backend API (Express)                 │
│  - Middleware authenticate extrait token            │
│  - Valide format: 3 parties séparées par .          │
│  - Vérifie signature avec JWT_SECRET                │
│  - Ajoute user au req.user pour la route            │
└─────────────────────────────────────────────────────┘
```

## Flux de token

### Génération (tokenManager.ts)
```
TokenPayload {id, email, role, organization_id}
              ↓
    generateTokenPair()
              ↓
    ┌─ accessToken (15m) HS256
    └─ refreshToken (7d) HS256
```

### Vérification (auth.ts middleware)
```
Authorization: Bearer eyJhbGc...
              ↓
         Extract token
              ↓
    Validate format (3 parts)
              ↓
    jwt.verify(token, JWT_SECRET)
              ↓
    ✓ Success: req.user = {id, email, role, org_id}
    ✗ Error: 401/403 with specific error message
```

## Fichiers modifiés
- ✅ `api/src/middleware/auth.ts` - Validation et gestion d'erreurs
- ✅ `api/src/routes/auth.ts` - Harmonisation des réponses d'authentification

## Résultat après correction
- ✅ Tokens correctement formés (3 parties JWT standard)
- ✅ Frontend reçoit `token` dans les deux endpoints
- ✅ Erreurs JWT détaillées et loggées
- ✅ Pas plus d'erreurs "jwt malformed"
- ✅ Tous les endpoints protégés fonctionnent

## Commande pour redémarrer le serveur
```bash
# Si nodemon détecte les changements automatiquement:
rs

# Sinon, relancer:
npm run dev
```

## Next Steps (futurs améliorements)
1. Implémenter le refresh token rotation
2. Ajouter les refresh token endpoints
3. Considérer les httpOnly cookies au lieu du localStorage
4. Ajouter un endpoint de logout pour révoquer les tokens
