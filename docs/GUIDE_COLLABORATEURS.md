# Guide pour les Collaborateurs - Simplix CRM

## 📋 Table des matières
1. [Récupérer le projet depuis GitHub](#récupérer-le-projet)
2. [Installation et configuration](#installation-et-configuration)
3. [Lancer le projet en développement](#lancer-le-projet)
4. [Workflow Git pour les collaborateurs](#workflow-git)
5. [Structure du projet](#structure-du-projet)
6. [Commandes utiles](#commandes-utiles)

---

## 🚀 Récupérer le projet depuis GitHub

### Première fois (Clone)

```bash
# Cloner le repository
git clone https://github.com/Popy21/Simplix.git

# Entrer dans le dossier
cd Simplix
```

### Mettre à jour votre copie locale

```bash
# Récupérer les dernières modifications
git pull origin main
```

---

## 💻 Installation et configuration

### Prérequis

Assurez-vous d'avoir installé :
- **Node.js** (v16 ou supérieur) - [Télécharger](https://nodejs.org/)
- **npm** ou **yarn** - Installé automatiquement avec Node.js
- **Flutter SDK** (optionnel, pour l'app mobile Flutter) - [Installation](https://flutter.dev/docs/get-started/install)

### Installation des dépendances

#### 1. API Backend

```bash
cd api
npm install
```

Créez un fichier `.env` dans le dossier `api/` :
```env
PORT=3000
NODE_ENV=development
```

#### 2. Application Web/Mobile (React Native)

```bash
cd web-app
npm install
```

#### 3. Application Mobile (Flutter) - Optionnel

```bash
cd mobile-app
flutter pub get
```

---

## 🏃 Lancer le projet en développement

### Étape 1 : Démarrer l'API Backend

**Important** : L'API doit toujours être lancée en premier car les applications front-end en dépendent.

```bash
cd api
npm run dev
```

L'API sera accessible sur `http://localhost:3000`

### Étape 2 : Lancer l'application front-end

#### Option A : Application Web/Mobile (React Native)

Ouvrez un **nouveau terminal** (gardez l'API en cours d'exécution) :

```bash
cd web-app

# Pour le web
npm run web

# Pour iOS (macOS uniquement)
npm run ios

# Pour Android
npm run android
```

#### Option B : Application Mobile Flutter

```bash
cd mobile-app
flutter run
```

---

## 🔄 Workflow Git pour les collaborateurs

### Récupérer les dernières modifications

Avant de commencer à travailler :

```bash
git pull origin main
```

### Créer une branche pour vos modifications

```bash
# Créer et basculer sur une nouvelle branche
git checkout -b feature/nom-de-votre-feature

# Exemples :
git checkout -b feature/add-customer-filter
git checkout -b fix/login-bug
```

### Faire vos modifications

1. Faites vos changements dans le code
2. Testez localement

### Committer vos changements

```bash
# Voir les fichiers modifiés
git status

# Ajouter les fichiers modifiés
git add .
# ou ajouter des fichiers spécifiques
git add chemin/vers/fichier.ts

# Créer un commit avec un message descriptif
git commit -m "Description de vos modifications"
```

### Pousser vos changements sur GitHub

```bash
# Première fois pour cette branche
git push -u origin feature/nom-de-votre-feature

# Les fois suivantes
git push
```

### Créer une Pull Request (PR)

1. Allez sur https://github.com/Popy21/Simplix
2. Cliquez sur "Pull requests" → "New pull request"
3. Sélectionnez votre branche
4. Ajoutez une description de vos modifications
5. Cliquez sur "Create pull request"
6. Attendez la revue de code et l'approbation

### Mettre à jour votre branche avec les derniers changements

Si la branche `main` a été mise à jour pendant que vous travailliez :

```bash
# Basculer sur main
git checkout main

# Récupérer les dernières modifications
git pull origin main

# Retourner sur votre branche
git checkout feature/nom-de-votre-feature

# Fusionner les modifications de main dans votre branche
git merge main
```

---

## 📁 Structure du projet

```
Simplix/
├── api/                      # Backend API TypeScript
│   ├── src/
│   │   ├── database/        # Configuration base de données
│   │   ├── models/          # Modèles de données
│   │   ├── routes/          # Endpoints API
│   │   └── index.ts         # Point d'entrée
│   ├── data/                # Base de données SQLite
│   └── package.json
│
├── web-app/                 # Application React Native (Web/Mobile)
│   ├── src/
│   │   ├── screens/        # Écrans de l'application
│   │   ├── services/       # Services API
│   │   ├── types/          # Types TypeScript
│   │   └── navigation/     # Configuration navigation
│   └── package.json
│
├── mobile-app/              # Application Flutter
│   ├── lib/
│   │   ├── models/         # Modèles de données
│   │   ├── screens/        # Écrans de l'application
│   │   └── services/       # Services API
│   └── pubspec.yaml
│
├── ReadMe/                  # Documentation projet
├── ARCHITECTURE.md          # Architecture technique
├── QUICKSTART.md           # Guide de démarrage rapide
└── README.md               # Documentation principale
```

---

## 🛠️ Commandes utiles

### Git

```bash
# Voir l'état des fichiers
git status

# Voir l'historique des commits
git log

# Voir les différences non commitées
git diff

# Annuler les modifications locales d'un fichier
git checkout -- chemin/vers/fichier

# Changer de branche
git checkout nom-de-la-branche

# Voir toutes les branches
git branch -a

# Supprimer une branche locale
git branch -d nom-de-la-branche
```

### API

```bash
# Démarrer en mode développement (auto-reload)
npm run dev

# Compiler le TypeScript
npm run build

# Lancer en production
npm start
```

### Web App

```bash
# Lancer sur web
npm run web

# Lancer sur iOS
npm run ios

# Lancer sur Android
npm run android

# Nettoyer le cache
npx expo start --clear
```

### Mobile App (Flutter)

```bash
# Installer les dépendances
flutter pub get

# Lancer l'app
flutter run

# Lister les devices disponibles
flutter devices

# Nettoyer le projet
flutter clean
```

---

## 🧪 Tester l'API avec cURL

### Créer un client

```bash
curl -X POST http://localhost:3000/api/customers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jean Dupont",
    "email": "jean@example.com",
    "phone": "0612345678",
    "company": "Tech Corp"
  }'
```

### Récupérer tous les clients

```bash
curl http://localhost:3000/api/customers
```

### Créer un produit

```bash
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Widget Premium",
    "description": "Un widget de haute qualité",
    "price": 99.99,
    "stock": 50
  }'
```

---

## 🐛 Résolution des problèmes courants

### L'API ne démarre pas

**Problème** : Port 3000 déjà utilisé

**Solution** :
```bash
# Sur macOS/Linux
lsof -ti:3000 | xargs kill -9

# Sur Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### L'application ne se connecte pas à l'API

**Solution** :
1. Vérifiez que l'API est bien lancée sur `http://localhost:3000`
2. Pour tester sur un appareil physique, remplacez `localhost` par l'adresse IP de votre ordinateur dans les fichiers de configuration :
   - `web-app/src/services/api.ts`
   - `mobile-app/lib/services/api_service.dart`

### Erreurs de dépendances

**Solution** :
```bash
# Supprimer node_modules et réinstaller
rm -rf node_modules package-lock.json
npm install

# Pour Flutter
flutter clean
flutter pub get
```

### Erreurs Git lors du push

**Solution** :
```bash
# Récupérer les dernières modifications
git pull origin main --rebase

# Résoudre les conflits si nécessaire
# Puis pousser à nouveau
git push
```

---

## 📞 Support

- **Repository GitHub** : https://github.com/Popy21/Simplix
- **Issues** : https://github.com/Popy21/Simplix/issues
- **Documentation technique** : Voir `ARCHITECTURE.md`
- **Guide de démarrage rapide** : Voir `QUICKSTART.md`

---

## ✅ Checklist pour nouveau collaborateur

- [ ] Cloner le repository
- [ ] Installer Node.js et npm
- [ ] Installer les dépendances de l'API (`cd api && npm install`)
- [ ] Installer les dépendances de web-app (`cd web-app && npm install`)
- [ ] Lancer l'API (`cd api && npm run dev`)
- [ ] Lancer web-app (`cd web-app && npm run web`)
- [ ] Tester la création d'un client via l'interface
- [ ] Créer une branche pour vos modifications
- [ ] Faire un premier commit de test
- [ ] Créer une Pull Request de test

---

**Bon développement ! 🚀**
