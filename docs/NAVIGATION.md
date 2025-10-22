# 🧭 Navigation Simplix CRM

## Structure de Navigation

Le CRM Simplix utilise une navigation en stack avec **Home** comme hub central.

### 📱 Architecture de Navigation

```
┌─────────────────────────────────────┐
│          Auth Stack                 │
│  ┌─────────┐      ┌──────────┐     │
│  │  Login  │ ───▶ │ Register │     │
│  └─────────┘      └──────────┘     │
└─────────────────────────────────────┘
              │
              │ (après authentification)
              ▼
┌─────────────────────────────────────┐
│           App Stack                 │
│                                     │
│        ┌──────────┐                │
│        │   HOME   │ ◄── Hub Central│
│        └──────────┘                │
│             │                       │
│    ┌────────┼────────┐             │
│    │        │        │             │
│    ▼        ▼        ▼             │
│ ┌────┐  ┌────┐  ┌────┐  ...       │
│ │ DB │  │ PI │  │ TA │             │
│ └────┘  └────┘  └────┘             │
└─────────────────────────────────────┘
```

## 🏠 Écran Principal: Home

**Route:** `Home`  
**Description:** Hub central avec cartes d'accès à toutes les fonctionnalités  
**Header:** Masqué (design custom)  
**Fonctionnalités:**
- 9 cartes de navigation principales
- Carte utilisateur avec avatar
- Section paramètres (Changer mot de passe, Tests API, Déconnexion)

### Navigation depuis Home:
```typescript
const menuItems = [
  'Dashboard',      // Tableau de bord
  'Pipeline',       // Opportunités de vente
  'Tasks',          // Tâches
  'Contacts',       // Relations et interactions
  'Analytics',      // Rapports et statistiques
  'Invoices',       // Facturation
  'Customers',      // Base de données clients
  'Products',       // Catalogue produits
  'Sales',          // Historique des ventes
];
```

## 📊 Écrans Principaux

### 1. Dashboard (Tableau de Bord)
**Route:** `Dashboard`  
**Title:** "Tableau de Bord"  
**Header:** Visible avec bouton retour  
**Couleur Header:** `#F2F2F7`  

**Fonctionnalités:**
- Vue d'ensemble des métriques (CA, Ventes, Clients, Produits)
- Cartes statistiques (Pipeline, Tâches, Contacts, Factures)
- Performance des devis
- Top clients et produits
- Alertes stock

**Navigation:**
- Retour → Home
- Navigation vers Sales, Customers, Products

---

### 2. Pipeline (Pipeline des Ventes)
**Route:** `Pipeline`  
**Title:** "Pipeline des Ventes"  
**Header:** Visible avec bouton retour  
**Couleur Header:** `#F2F2F7`

**Fonctionnalités:**
- Vue Kanban avec 6 colonnes
- Statuts: Prospect → Qualifié → Proposition → Négociation → Gagné/Perdu
- Valeur pondérée par probabilité
- Modal de détails avec actions

**Navigation:**
- Retour → Home

---

### 3. Tasks (Tâches)
**Route:** `Tasks`  
**Title:** "Tâches"  
**Header:** Visible avec bouton retour  
**Couleur Header:** `#F2F2F7`

**Fonctionnalités:**
- Liste des tâches avec priorités (haute/moyenne/basse)
- Statuts: À faire, En cours, Terminé
- Détection des tâches en retard
- Statistiques (4 cartes)
- Modal de détails

**Navigation:**
- Retour → Home

---

### 4. Contacts (Contacts)
**Route:** `Contacts`  
**Title:** "Contacts"  
**Header:** Visible avec bouton retour  
**Couleur Header:** `#F2F2F7`

**Fonctionnalités:**
- Gestion contacts avec pipeline (lead → prospect → client → inactif)
- Historique d'interactions (appels, emails, réunions, notes)
- Recherche et filtres
- Modal de détails avec timeline

**Navigation:**
- Retour → Home
- Lien vers Customers (base de données)

---

### 5. Analytics (Analytics & Rapports)
**Route:** `Analytics`  
**Title:** "Analytics & Rapports"  
**Header:** Visible avec bouton retour  
**Couleur Header:** `#F2F2F7`

**Fonctionnalités:**
- Graphiques CA, Ventes, Pipeline, Tunnel de conversion
- Sélecteur de période (Semaine/Mois/Trimestre/Année)
- 4 KPIs clés
- Statistiques détaillées

**Navigation:**
- Retour → Home
- Navigation vers Pipeline (voir tout)

---

### 6. Invoices (Facturation)
**Route:** `Invoices`  
**Title:** "Facturation"  
**Header:** Visible avec bouton retour  
**Couleur Header:** `#F2F2F7`

**Fonctionnalités:**
- Liste factures avec 5 statuts
- Calculs TVA (HT, TVA, TTC)
- Suivi paiements
- Actions: Marquer payé, Relancer, Exporter PDF
- Modal détails avec ligne items

**Navigation:**
- Retour → Home

---

### 7. Customers (Base Clients)
**Route:** `Customers`  
**Title:** "Base Clients"  
**Header:** Visible avec bouton retour  
**Couleur Header:** `#F2F2F7`

**Fonctionnalités:**
- Liste complète des clients
- Recherche et filtres
- Ajout/modification clients
- Historique achats

**Navigation:**
- Retour → Home
- Lien vers Sales (historique)

---

### 8. Products (Catalogue Produits)
**Route:** `Products`  
**Title:** "Catalogue Produits"  
**Header:** Visible avec bouton retour  
**Couleur Header:** `#F2F2F7`

**Fonctionnalités:**
- Catalogue complet avec images
- Gestion stock
- Prix et catégories
- SKU

**Navigation:**
- Retour → Home

---

### 9. Sales (Historique des Ventes)
**Route:** `Sales`  
**Title:** "Historique des Ventes"  
**Header:** Visible avec bouton retour  
**Couleur Header:** `#F2F2F7`

**Fonctionnalités:**
- Liste des ventes avec filtres
- Détails transactions
- Statistiques

**Navigation:**
- Retour → Home

---

## ⚙️ Écrans Utilitaires

### Change Password
**Route:** `ChangePassword`  
**Title:** "Changer le mot de passe"  
**Header:** Visible  
**Présentation:** Modal

**Accès:** Home → Paramètres → Changer le mot de passe

---

### Test All
**Route:** `TestAll`  
**Title:** "Tests API"  
**Header:** Visible  
**Présentation:** Modal

**Accès:** Home → Paramètres → Tests API

---

## 🎨 Design System de Navigation

### Headers
- **Couleur de fond:** `#FFFFFF` (par défaut) ou `#F2F2F7` (écrans principaux)
- **Couleur texte:** `#007AFF` (Apple Blue)
- **Police titre:** Poids 600, Taille 17pt
- **Bouton retour:** Chevron bleu `#007AFF`
- **Pas de titre du bouton retour** (iOS style)

### Transitions
- **Animation:** Slide from right (native)
- **Durée:** Standard iOS/Android
- **Type:** Stack navigation

### Status Bar
- **Style:** Dark content
- **Compatible:** iOS et Android

## 📋 Flux Utilisateur Typiques

### Flux 1: Créer une facture
```
Home → Invoices → [Bouton +] → Formulaire facture → Sauvegarde → Retour liste
```

### Flux 2: Suivre une opportunité
```
Home → Pipeline → [Card opportunité] → Modal détails → Changer statut → Fermer modal
```

### Flux 3: Ajouter une tâche
```
Home → Tasks → [Bouton +] → Formulaire tâche → Sauvegarde → Retour liste
```

### Flux 4: Consulter analytics
```
Home → Dashboard → [Voir métriques] → Analytics → [Filtrer période] → Retour
```

### Flux 5: Gérer un contact
```
Home → Contacts → [Contact] → Modal → [Ajouter interaction] → Sauvegarde → Fermer
```

## 🔧 Configuration Technique

### Stack Navigator
```typescript
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator<RootStackParamList>();
```

### Options globales
```typescript
screenOptions={{
  headerStyle: { backgroundColor: '#FFFFFF' },
  headerTintColor: '#007AFF',
  headerTitleStyle: { fontWeight: '600', fontSize: 17 },
}}
```

### Types de routes
```typescript
type RootStackParamList = {
  // Auth
  Login: undefined;
  Register: undefined;
  
  // App
  Home: undefined;
  Dashboard: undefined;
  Pipeline: undefined;
  Tasks: undefined;
  Contacts: undefined;
  Analytics: undefined;
  Invoices: undefined;
  Customers: undefined;
  Products: undefined;
  Sales: undefined;
  ChangePassword: undefined;
  TestAll: undefined;
};
```

## 🚀 Bonnes Pratiques

1. **Toujours partir de Home** - Hub central pour toute navigation
2. **Bouton retour visible** - Sur tous les écrans sauf Home et Auth
3. **Headers cohérents** - Même style sur tous les écrans
4. **Modals pour actions** - ChangePassword et TestAll en modal
5. **Deep linking prêt** - Structure permet URLs personnalisées
6. **Accessibilité** - Labels clairs et navigation logique
7. **Performance** - Lazy loading des écrans

## 📱 Responsive

- **Mobile:** Optimisé pour iPhone et Android
- **Tablette:** Profite de l'espace avec COLUMN_WIDTH adaptatif
- **Dimensions dynamiques:** `Dimensions.get('window')`
- **Safe Area:** Padding iOS adapté (60pt top)

## 🔐 Protection de Navigation

- **Auth Guard:** Affiche Login/Register si non authentifié
- **Auto-redirect:** Vers Home après login
- **Token refresh:** Géré par AuthContext
- **Logout:** Retour automatique vers Login

## 📊 Métriques de Navigation

Pour suivre l'utilisation:
- Écran le plus visité: Dashboard
- Flux le plus utilisé: Home → Dashboard
- Taux de rebond: Home (hub, normal)
- Profondeur moyenne: 2 niveaux (Home → Feature)
