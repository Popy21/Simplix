# Guide d'Utilisation - Page Test All

## 🧪 Qu'est-ce que la page Test All ?

La page **Test All** est un outil de test automatisé intégré à l'application web Simplix CRM. Elle permet de tester tous les endpoints de l'API en un seul clic, facilitant ainsi la validation du bon fonctionnement du système.

## 🚀 Comment y accéder ?

### Depuis l'application web

1. Lancez l'API :
   ```bash
   cd api
   npm run dev
   ```

2. Lancez l'application web :
   ```bash
   cd web-app
   npm run web
   ```

3. Sur la page d'accueil, cliquez sur le bouton **"Test All"** (🧪)

## 📋 Tests effectués

La page Test All exécute automatiquement **8 tests** couvrant tous les endpoints de l'API :

### Tests Customers (Clients)
1. **GET /api/customers** - Récupère tous les clients
2. **POST /api/customers** - Crée un nouveau client de test
3. **GET /api/customers/:id** - Récupère un client spécifique
4. **PUT /api/customers/:id** - Met à jour un client

### Tests Products (Produits)
5. **GET /api/products** - Récupère tous les produits
6. **POST /api/products** - Crée un nouveau produit de test

### Tests Sales (Ventes)
7. **GET /api/sales** - Récupère toutes les ventes
8. **POST /api/sales** - Crée une nouvelle vente de test

## 🎯 Fonctionnalités

### Boutons d'action

- **Run All Tests** (Vert) : Lance tous les tests automatiquement
- **Clear Results** (Rouge) : Efface les résultats des tests précédents

### Affichage des résultats

Chaque test affiche :
- ✓ Symbole de succès (vert) ou ✗ symbole d'échec (rouge)
- Nom de l'endpoint testé
- Message détaillé du résultat
- Extrait des données retournées

### Résumé

Une barre de progression affiche :
- **Total** : Nombre total de tests
- **Passed** : Nombre de tests réussis
- **Failed** : Nombre de tests échoués
- Barre visuelle de progression (verte si 100% réussi, orange sinon)

## 📊 Exemple de résultats

```
Total: 8 | Passed: 8 | Failed: 0
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 100%

✓ GET /api/customers
  ✓ Retrieved 4 customers

✓ POST /api/customers
  ✓ Created customer ID: 5

✓ GET /api/products
  ✓ Retrieved 4 products

✓ POST /api/products
  ✓ Created product ID: 4

✓ GET /api/sales
  ✓ Retrieved 5 sales

✓ POST /api/sales
  ✓ Created sale ID: 5

✓ PUT /api/customers/:id
  ✓ Updated customer ID: 1

✓ GET /api/customers/:id
  ✓ Retrieved customer ID: 1
```

## ⚠️ Prérequis

1. **L'API doit être en cours d'exécution** sur `http://localhost:3000`
2. **La base de données doit être initialisée** avec au moins quelques données
3. **L'application web doit pouvoir se connecter à l'API**

## 🔧 Dépannage

### Tous les tests échouent

**Problème** : L'API n'est pas démarrée ou n'est pas accessible

**Solution** :
```bash
# Vérifier que l'API est en cours d'exécution
cd api
npm run dev

# L'API devrait afficher :
# ⚡️[server]: Server is running at http://localhost:3000
```

### Certains tests échouent (POST /api/sales)

**Problème** : Pas de clients ou de produits dans la base de données

**Solution** :
- Créez d'abord des clients via la page "Customers"
- Créez ensuite des produits via la page "Products"
- Relancez les tests

### Erreur de connexion

**Problème** : L'URL de l'API est incorrecte

**Solution** :
- Vérifiez `web-app/src/services/api.ts`
- L'URL doit être `http://localhost:3000/api`
- Pour un appareil physique, utilisez l'adresse IP de votre ordinateur

## 💡 Utilisation recommandée

### Après chaque modification de l'API

1. Faites vos modifications dans le code de l'API
2. Redémarrez l'API
3. Lancez **Test All** pour vérifier que tout fonctionne

### Avant de déployer

1. Lancez **Test All** pour valider tous les endpoints
2. Vérifiez que tous les tests passent (8/8)
3. Si un test échoue, corrigez le problème avant de déployer

### Pour démontrer le projet

1. Préparez des données d'exemple dans la base de données
2. Lancez **Test All** devant votre audience
3. Montrez les résultats en temps réel

## 🛠️ Extension future

Vous pouvez facilement ajouter de nouveaux tests en modifiant :
`web-app/src/screens/TestAllScreen.tsx`

Exemple d'ajout d'un test DELETE :

```typescript
// Test DELETE customer
try {
  const customersResponse = await customerService.getAll();
  if (customersResponse.data.length > 0) {
    const customerId = customersResponse.data[0].id!;
    await customerService.delete(customerId);
    const result: TestResult = {
      test: 'DELETE /api/customers/:id',
      status: 'success',
      message: `✓ Deleted customer ID: ${customerId}`,
    };
    testResults.push(result);
    addResult(result);
    passed++;
  }
} catch (error) {
  const result: TestResult = {
    test: 'DELETE /api/customers/:id',
    status: 'failed',
    message: `✗ Error: ${error}`,
  };
  testResults.push(result);
  addResult(result);
  failed++;
}
```

## 📝 Notes

- Les tests créent de vraies données dans la base de données
- Les données de test incluent un timestamp pour éviter les doublons
- Les tests sont exécutés séquentiellement, pas en parallèle
- L'interface se met à jour en temps réel pendant l'exécution

---

**Bon testing ! 🚀**
