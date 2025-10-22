# 🔐 Guide du Système d'Authentification Simplix CRM

## 📋 Vue d'ensemble

Ce guide décrit le système d'authentification complet qui a été implémenté pour Simplix CRM, incluant :
- ✅ Création de compte utilisateur avec validation de mot de passe
- ✅ Système de connexion sécurisé avec JWT
- ✅ Changement de mot de passe avec vérification
- ✅ Interface utilisateur élégante avec glassmorphisme avancé
- ✅ Indicateurs dynamiques de sécurité de mot de passe

---

## 🏗️ Architecture

### Backend (API)

#### Nouveaux fichiers créés :
1. **`api/src/middleware/auth.ts`** - Middleware d'authentification JWT
   - Fonction `authenticateToken` : Vérifie les tokens JWT
   - Fonction `authorizeRole` : Contrôle d'accès basé sur les rôles

2. **`api/src/utils/passwordValidator.ts`** - Validation de mot de passe
   - Validation des critères de sécurité (longueur, majuscules, minuscules, chiffres, caractères spéciaux)
   - Calcul de la force du mot de passe (weak, medium, strong, very-strong)
   - Détection des mots de passe communs

#### Améliorations apportées :
- **`api/src/routes/auth.ts`** - Routes d'authentification améliorées
  - `POST /api/auth/validate-password` - Validation en temps réel du mot de passe
  - `POST /api/auth/register` - Inscription avec validation renforcée
  - `POST /api/auth/login` - Connexion inchangée
  - `GET /api/auth/me` - Récupération du profil utilisateur (protégé)
  - `POST /api/auth/change-password` - Changement de mot de passe (protégé)

### Frontend (Web App)

#### Nouveaux fichiers créés :

1. **`web-app/src/utils/storage.ts`** - Gestion du stockage local
   - Sauvegarde/récupération du token JWT
   - Sauvegarde/récupération des données utilisateur
   - Nettoyage des données d'authentification

2. **`web-app/src/context/AuthContext.tsx`** - Contexte d'authentification React
   - Gestion de l'état d'authentification global
   - Fonctions : `login`, `register`, `logout`, `changePassword`
   - Rechargement automatique de la session au démarrage

3. **`web-app/src/screens/LoginScreen.tsx`** - Écran de connexion
   - Design glassmorphisme élégant
   - Champs email et mot de passe avec visibilité
   - Validation des champs
   - Navigation vers l'inscription

4. **`web-app/src/screens/RegisterScreen.tsx`** - Écran d'inscription
   - Design glassmorphisme élégant
   - Indicateurs dynamiques de sécurité du mot de passe
   - Barre de force de mot de passe colorée
   - Liste de critères avec validation en temps réel
   - Avertissements pour les mots de passe communs
   - Confirmation du mot de passe

5. **`web-app/src/screens/ChangePasswordScreen.tsx`** - Écran de changement de mot de passe
   - Design glassmorphisme élégant
   - Vérification du mot de passe actuel
   - Validation du nouveau mot de passe
   - Conseils de sécurité

#### Fichiers modifiés :

1. **`web-app/App.tsx`** - Navigation conditionnelle
   - Intégration de l'AuthProvider
   - Navigation Auth Stack vs App Stack
   - Écran de chargement pendant la vérification de session

2. **`web-app/src/screens/HomeScreen.tsx`** - Page d'accueil améliorée
   - Affichage des informations utilisateur
   - Section "Account Settings"
   - Bouton de changement de mot de passe
   - Bouton de déconnexion

3. **`web-app/src/navigation/types.ts`** - Types de navigation
   - Ajout des routes : `Login`, `Register`, `ChangePassword`

4. **`web-app/src/services/api.ts`** - Services API
   - Ajout de `validatePassword` et `changePassword` dans `authService`

5. **`web-app/package.json`** - Dépendances
   - Ajout de `@react-native-async-storage/async-storage`
   - Ajout de `expo-linear-gradient`
   - Ajout de `expo-blur`

---

## 🎨 Design - Glassmorphisme Avancé

Le design utilise des techniques de glassmorphisme modernes :

### Caractéristiques visuelles :
- **Dégradés de couleur** : `#667eea` → `#764ba2` → `#f093fb`
- **Effet de flou** : BlurView avec intensité 15-20
- **Transparence** : Cartes avec `rgba(255, 255, 255, 0.1)`
- **Bordures semi-transparentes** : `rgba(255, 255, 255, 0.2)`
- **Ombres élégantes** : Ombres douces avec opacité 0.3

### Indicateurs de sécurité du mot de passe :
- **Barre de progression** : Change de couleur selon la force
  - Faible (25%) : Rouge `#ef4444`
  - Moyen (50%) : Orange `#f59e0b`
  - Fort (75%) : Vert `#10b981`
  - Très fort (100%) : Cyan `#06b6d4`

- **Critères de validation** :
  - ○ Non validé (gris)
  - ✓ Validé (vert)

- **Avertissements** : Fond rouge transparent pour les mots de passe communs

---

## 🔒 Critères de Sécurité du Mot de Passe

Les mots de passe doivent respecter **TOUS** les critères suivants :

1. ✅ Au moins 8 caractères
2. ✅ Au moins une lettre majuscule (A-Z)
3. ✅ Au moins une lettre minuscule (a-z)
4. ✅ Au moins un chiffre (0-9)
5. ✅ Au moins un caractère spécial (!@#$%^&*()_+-=[]{}...)
6. ❌ Ne doit pas être un mot de passe commun (password, 123456, etc.)

### Calcul de la force :
- **Weak** : Moins de 3 critères validés
- **Medium** : 3+ critères validés et 8+ caractères
- **Strong** : 4+ critères validés et 10+ caractères
- **Very Strong** : Tous les critères validés et 12+ caractères

---

## 🚀 Installation et Démarrage

### 1. Installation des dépendances Backend

```bash
cd api
npm install
```

### 2. Installation des dépendances Frontend

```bash
cd web-app
npm install
```

### 3. Configuration de l'environnement Backend

Créez un fichier `.env` dans le dossier `api/` :

```env
PORT=3000
NODE_ENV=development
JWT_SECRET=votre-secret-key-ultra-securise-changez-moi-en-production
```

**⚠️ IMPORTANT** : Changez le `JWT_SECRET` en production avec une valeur aléatoire et sécurisée !

### 4. Démarrage du Backend

```bash
cd api
npm run dev
```

Le serveur démarre sur `http://localhost:3000`

### 5. Démarrage du Frontend

```bash
cd web-app
npm start
```

Options :
- Appuyez sur `w` pour ouvrir dans le navigateur web
- Appuyez sur `i` pour ouvrir dans le simulateur iOS
- Appuyez sur `a` pour ouvrir dans l'émulateur Android

---

## 📝 Utilisation

### Créer un compte

1. Lancez l'application
2. Sur l'écran de connexion, cliquez sur "Sign Up"
3. Remplissez le formulaire :
   - Nom complet
   - Email
   - Mot de passe (observez les indicateurs de sécurité en temps réel)
   - Confirmation du mot de passe
4. Cliquez sur "Create Account"
5. Vous êtes automatiquement connecté et redirigé vers l'écran d'accueil

### Se connecter

1. Entrez votre email et mot de passe
2. Cliquez sur "Sign In"
3. Vous êtes redirigé vers l'écran d'accueil

### Changer le mot de passe

1. Sur l'écran d'accueil, allez dans "Account Settings"
2. Cliquez sur "Change Password"
3. Entrez votre mot de passe actuel
4. Entrez un nouveau mot de passe (respectez les critères de sécurité)
5. Confirmez le nouveau mot de passe
6. Cliquez sur "Update Password"

### Se déconnecter

1. Sur l'écran d'accueil, allez dans "Account Settings"
2. Cliquez sur "Logout"
3. Confirmez la déconnexion

---

## 🔑 Endpoints API

### Publics (non authentifiés)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/auth/register` | Créer un compte utilisateur |
| POST | `/api/auth/login` | Se connecter |
| POST | `/api/auth/validate-password` | Valider un mot de passe (pour indicateurs temps réel) |

### Protégés (authentifiés)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/auth/me` | Récupérer le profil utilisateur |
| POST | `/api/auth/change-password` | Changer le mot de passe |

**Format de l'authentification** :
```
Authorization: Bearer <votre-token-jwt>
```

---

## 🧪 Test de l'API avec curl

### Créer un compte

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123!",
    "name": "John Doe"
  }'
```

### Se connecter

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123!"
  }'
```

### Valider un mot de passe

```bash
curl -X POST http://localhost:3000/api/auth/validate-password \
  -H "Content-Type: application/json" \
  -d '{
    "password": "TestPassword123!"
  }'
```

### Récupérer le profil (avec token)

```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer <votre-token>"
```

### Changer le mot de passe (avec token)

```bash
curl -X POST http://localhost:3000/api/auth/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <votre-token>" \
  -d '{
    "currentPassword": "SecurePass123!",
    "newPassword": "NewSecurePass456!"
  }'
```

---

## 🛡️ Sécurité

### Implémentations de sécurité :

1. **Hashage de mot de passe** : bcrypt avec 12 rounds
2. **JWT** : Token avec expiration de 7 jours
3. **Validation côté serveur** : Tous les critères de mot de passe sont vérifiés
4. **Protection CORS** : Configuré dans Express
5. **Vérification du token** : Middleware authentifie chaque requête protégée
6. **Pas de stockage en clair** : Les mots de passe ne sont jamais stockés en clair

### Bonnes pratiques :

✅ Les tokens sont stockés de manière sécurisée avec AsyncStorage
✅ Les mots de passe ne sont jamais loggés
✅ La vérification du token se fait sur chaque requête protégée
✅ L'utilisateur doit confirmer avant de se déconnecter
✅ Les erreurs d'authentification sont génériques pour éviter les fuites d'information

---

## 🎯 Prochaines améliorations possibles

1. **Reset de mot de passe** : Envoi d'email pour réinitialiser le mot de passe
2. **Authentification à deux facteurs (2FA)** : Code OTP par email/SMS
3. **Refresh tokens** : Renouvellement automatique des tokens expirés
4. **Sessions multiples** : Gestion des connexions sur plusieurs appareils
5. **Historique de connexion** : Logs des connexions avec IP et appareil
6. **Blocage de compte** : Après X tentatives de connexion échouées
7. **OAuth** : Connexion avec Google, Facebook, etc.

---

## 📞 Support

Pour toute question ou problème :
- Consultez la documentation du code
- Vérifiez que toutes les dépendances sont installées
- Assurez-vous que le backend est démarré avant le frontend

---

## ✅ Checklist de vérification

Avant de déployer en production :

- [ ] Changer le `JWT_SECRET` dans `.env`
- [ ] Configurer un vrai serveur SMTP pour les emails
- [ ] Configurer HTTPS pour l'API
- [ ] Activer les logs de sécurité
- [ ] Mettre en place un rate limiting
- [ ] Configurer un système de backup de la base de données
- [ ] Tester tous les scénarios d'authentification
- [ ] Vérifier que les tokens expirent correctement
- [ ] Tester sur différents appareils (iOS, Android, Web)

---

**Fait avec ❤️ pour Simplix CRM**
