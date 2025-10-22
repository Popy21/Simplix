# 🚀 Guide de Démarrage - Navigation Simplix CRM

## Lancer l'Application

```bash
# Terminal 1 - Backend API
cd api
npm run dev

# Terminal 2 - Frontend Web App
cd web-app
npm run web
```

L'application sera accessible sur `http://localhost:8081`

## 🔐 Connexion

### Écran de Login
1. Ouvrez l'application
2. Entrez vos identifiants :
   - **Email:** `votre.email@exemple.com`
   - **Mot de passe:** `********`
3. Cliquez sur **"Se connecter"**
4. Ou cliquez sur **"S'inscrire"** pour créer un compte

### Après connexion
Vous arrivez automatiquement sur l'**écran Home** - le hub central du CRM.

## 🏠 Écran Home - Hub Central

L'écran Home est votre point de départ. Vous y trouverez :

### 📱 9 Cartes de Navigation Principales

1. **Tableau de Bord** 📊
   - Vue d'ensemble de votre activité
   - Métriques clés (CA, Ventes, Clients, Produits)
   - Statistiques en temps réel

2. **Pipeline** 📈
   - Gérez vos opportunités de vente
   - Vue Kanban avec 6 étapes
   - Suivi de la probabilité de conversion

3. **Tâches** ✅
   - Planification et suivi
   - Priorités et échéances
   - Alertes pour tâches en retard

4. **Contacts** 👥
   - Relations et interactions
   - Historique complet (appels, emails, réunions)
   - Pipeline de conversion

5. **Analytics** 📊
   - Rapports et statistiques
   - Graphiques CA, ventes, pipeline
   - KPIs détaillés

6. **Facturation** 💰
   - Devis et factures
   - Calculs TVA automatiques
   - Suivi des paiements

7. **Clients** 👤
   - Base de données clients
   - Recherche et filtres
   - Historique d'achats

8. **Produits** 📦
   - Catalogue et inventaire
   - Gestion des stocks
   - Prix et catégories

9. **Ventes** 💳
   - Historique des ventes
   - Statistiques
   - Détails des transactions

### 👤 Carte Utilisateur
- Affiche votre nom et email
- Avatar avec initiale
- Badge du rôle (si applicable)

### ⚙️ Section Paramètres
- **Changer le mot de passe** : Modifier vos identifiants
- **Tests API** : Interface de test des endpoints
- **Déconnexion** : Se déconnecter du CRM

## 🧭 Navigation dans l'Application

### Principe de Base
```
┌─────────┐
│  HOME   │ ◄─── Toujours accessible
└────┬────┘
     │
     ├──▶ Dashboard ◄─── Bouton "←" pour revenir
     ├──▶ Pipeline  ◄─── Bouton "←" pour revenir
     ├──▶ Tasks     ◄─── Bouton "←" pour revenir
     └──▶ ...
```

### Boutons de Navigation

#### Bouton Retour "←"
- **Présent sur tous les écrans** (sauf Home et Login/Register)
- **Position:** En haut à gauche
- **Couleur:** Bleu `#007AFF` (Apple style)
- **Action:** Retour à l'écran précédent

#### Navigation depuis les cartes
- Touchez une carte pour accéder à la fonctionnalité
- Exemple : Toucher "Pipeline" → Ouvre l'écran Pipeline

## 📊 Utilisation des Écrans Principaux

### Dashboard
```
Home → Tableau de Bord
```
**Que faire ici :**
- Consultez vos métriques du jour
- Voyez les alertes importantes
- Accédez rapidement aux sections via les cartes interactives
- Rafraîchissez en glissant vers le bas (pull-to-refresh)

**Navigation rapide :**
- Toucher une métrique → Ouvre l'écran correspondant
- Ex: "Clients" → Ouvre la base clients

---

### Pipeline
```
Home → Pipeline
```
**Que faire ici :**
- Glissez horizontalement pour voir toutes les colonnes
- Touchez une opportunité pour voir les détails
- Changez le statut directement dans le modal
- Ajoutez des notes

**Actions disponibles :**
- **Voir détails** : Touch sur la carte
- **Changer statut** : Boutons dans le modal
- **Fermer** : "×" ou swipe down

---

### Tâches
```
Home → Tâches
```
**Que faire ici :**
- Consultez vos tâches par statut
- Touchez la checkbox pour changer le statut
- Filtrez par priorité
- Voyez les tâches en retard (badge rouge)

**États des tâches :**
- ☐ À faire (gris)
- ⏳ En cours (orange)
- ✅ Terminé (vert)

---

### Contacts
```
Home → Contacts
```
**Que faire ici :**
- Recherchez un contact
- Filtrez par statut (lead/prospect/client/inactif)
- Consultez l'historique d'interactions
- Ajoutez des notes

**Filtres disponibles :**
- **Tous** : Tous les contacts
- **Leads** : Nouveaux contacts
- **Prospects** : Qualifiés
- **Clients** : Convertis
- **Inactifs** : Plus actifs

---

### Analytics
```
Home → Analytics
```
**Que faire ici :**
- Changez la période d'analyse (Semaine/Mois/Trimestre/Année)
- Consultez les graphiques
- Analysez les KPIs
- Identifiez les tendances

**Graphiques disponibles :**
- Chiffre d'affaires mensuel
- Ventes hebdomadaires
- Pipeline par étape
- Tunnel de conversion

---

### Facturation
```
Home → Facturation
```
**Que faire ici :**
- Consultez toutes vos factures
- Filtrez par statut
- Marquez comme payée
- Envoyez des relances
- Exportez en PDF (bientôt)

**Statuts de facture :**
- 📝 **Brouillon** : En cours de création
- 📨 **Envoyée** : Envoyée au client
- ✅ **Payée** : Paiement reçu
- ⚠️ **En retard** : Date dépassée
- ❌ **Annulée** : Annulée

**Actions rapides :**
- **Marquer payée** : Enregistre le paiement
- **Relancer** : Envoie un rappel au client
- **Télécharger PDF** : Export (prochainement)

---

## 💡 Astuces de Navigation

### 1. Pull-to-Refresh
Sur la plupart des écrans, glissez vers le bas pour rafraîchir les données.

### 2. Bouton Retour Rapide
Double-tap sur le bouton retour pour revenir directement à Home (si plusieurs niveaux).

### 3. Raccourcis depuis Dashboard
Les cartes de statistiques sont cliquables et mènent directement aux sections concernées.

### 4. Modals
Les modals se ferment par :
- Bouton "×" en haut à droite
- Swipe down (glissement vers le bas)
- Bouton "Fermer"

### 5. Recherche
Les écrans avec liste (Contacts, Clients, Produits) ont une barre de recherche en haut.

## 🎯 Workflows Recommandés

### Workflow 1 : Nouveau Prospect
```
1. Home → Contacts
2. Ajouter un nouveau contact
3. Statut : Lead
4. Home → Pipeline
5. Créer opportunité liée
6. Suivre jusqu'à conversion
```

### Workflow 2 : Créer une Facture
```
1. Home → Facturation
2. Créer nouvelle facture
3. Ajouter lignes de produits
4. Envoyer au client
5. Marquer comme payée quand reçu
```

### Workflow 3 : Planifier sa Journée
```
1. Home → Tableau de Bord
2. Voir les alertes du jour
3. Home → Tâches
4. Consulter tâches en retard
5. Mettre à jour les statuts
6. Home → Pipeline
7. Suivre opportunités à clôturer
```

### Workflow 4 : Analyse de Performance
```
1. Home → Analytics
2. Sélectionner période (Mois)
3. Analyser graphiques CA
4. Comparer avec objectifs
5. Identifier tendances
6. Home → Dashboard
7. Voir impact en temps réel
```

## 🔄 Synchronisation des Données

### Automatique
- Les données se rafraîchissent automatiquement au changement d'écran
- Les listes sont mises à jour après chaque action (création/modification)

### Manuel
- Pull-to-refresh sur la plupart des écrans
- Bouton "Rafraîchir" sur certains écrans

### Indicateurs
- **Icône de chargement** : Données en cours de récupération
- **Message "Chargement..."** : Première récupération
- **Pull indicator** : Animation lors du rafraîchissement manuel

## ⚠️ En Cas de Problème

### Écran blanc
1. Rafraîchissez la page (F5)
2. Vérifiez que l'API est démarrée
3. Consultez la console (F12)

### Données non chargées
1. Vérifiez votre connexion internet
2. Pull-to-refresh
3. Redémarrez l'application

### Bouton retour ne fonctionne pas
1. Utilisez le bouton Home dans la navigation
2. Fermez et rouvrez l'application

## 📞 Support

Pour toute question sur la navigation :
1. Consultez `/docs/NAVIGATION.md` pour la documentation technique
2. Consultez `/docs/API_DOCUMENTATION_V4.md` pour l'API
3. Tests disponibles via : Home → Paramètres → Tests API

---

**Version :** 4.0.0  
**Dernière mise à jour :** 22 octobre 2025  
**Design :** Apple Human Interface Guidelines  
**Langue :** Français 🇫🇷
