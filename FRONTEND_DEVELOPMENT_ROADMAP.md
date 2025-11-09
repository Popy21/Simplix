# 📱 SIMPLIX - ROADMAP DÉVELOPPEMENT FRONTEND

## 🎯 État actuel

**✅ Backend complet** - API REST avec 100+ endpoints
**✅ App React Native** - Structure existante avec 27 écrans
**⚠️ Écrans manquants** - 8 modules à intégrer

---

## 📋 Écrans à créer pour MVP 100%

### 1. Module Comptabilité (3 écrans)

#### 🏦 BankAccountsScreen.tsx
**Endpoint:** `/api/bank-accounts`
**Fonctionnalités:**
- Liste des comptes bancaires avec soldes
- Créer/modifier/supprimer compte
- Ajuster solde manuellement
- Filtrer par type (courant, épargne)

**Champs du formulaire:**
```typescript
{
  account_name: string
  bank_name: string
  iban: string
  bic: string
  account_type: 'checking' | 'savings' | 'credit'
  currency: 'EUR' | 'USD'
  opening_balance: number
}
```

#### 💳 BankTransactionsScreen.tsx
**Endpoint:** `/api/bank-transactions`
**Fonctionnalités:**
- Liste des transactions par compte
- Créer transaction manuelle
- Importer fichier bancaire (CSV/OFX)
- Rapprocher avec factures
- Recherche et filtres (date, montant, type)

**Champs:**
```typescript
{
  bank_account_id: uuid
  transaction_type: 'credit' | 'debit'
  amount: number
  description: string
  transaction_date: date
  reference: string
  category: string
}
```

#### 📊 AccountingScreen.tsx
**Endpoint:** `/api/accounting`
**Fonctionnalités:**
- Tableau de bord comptable
- Balance générale
- Grand livre par compte
- Export FEC (bouton)
- Journal des écritures

---

### 2. Module Facturation Avancée (2 écrans)

#### 🔄 RecurringInvoicesScreen.tsx
**Endpoint:** `/api/recurring-invoices`
**Fonctionnalités:**
- Liste des abonnements/factures récurrentes
- Créer modèle récurrent
- Pause/Reprendre/Arrêter
- Voir historique de génération
- Déclencher génération manuelle

**Champs:**
```typescript
{
  customer_id: uuid
  frequency: 'monthly' | 'quarterly' | 'yearly'
  interval_count: number
  start_date: date
  end_date?: date
  title: string
  items: Array<{...}>
  auto_send: boolean
}
```

#### 📝 CreditNotesScreen.tsx
**Endpoint:** `/api/credit-notes`
**Fonctionnalités:**
- Liste des avoirs
- Créer avoir depuis facture
- Créer avoir manuel
- Appliquer avoir sur facture
- PDF download

---

### 3. Module Projets & Temps (2 écrans)

#### 📁 ProjectsScreen.tsx
**Endpoint:** `/api/projects`
**Fonctionnalités:**
- Liste projets avec statut (planning, active, completed)
- Créer projet (3 types: forfait, régie, retainer)
- Vue détail avec KPIs (rentabilité, temps, budget)
- Tâches du projet
- Timeline/Gantt basique

**Champs:**
```typescript
{
  name: string
  customer_id: uuid
  project_type: 'time_and_materials' | 'fixed_price' | 'retainer'
  status: 'planning' | 'active' | 'on_hold' | 'completed'
  start_date: date
  end_date?: date
  estimated_hours?: number
  hourly_rate?: number
  budget_amount?: number
}
```

#### ⏱️ TimeEntriesScreen.tsx
**Endpoint:** `/api/time-entries`
**Fonctionnalités:**
- Timer démarrer/arrêter
- Liste temps par projet/jour/semaine
- Créer entrée manuelle
- Marquer billable/non-billable
- Export timesheet
- Résumé hebdo/mensuel

**Champs:**
```typescript
{
  project_id: uuid
  task_id?: uuid
  description: string
  duration_hours: number
  hourly_rate: number
  is_billable: boolean
  entry_date: date
}
```

---

### 4. Module RH (3 écrans)

#### 👥 EmployeesScreen.tsx
**Endpoint:** `/api/employees`
**Fonctionnalités:**
- Liste employés avec photo
- Créer/modifier employé
- Vue détail (infos perso, contrat, docs)
- Organigramme
- Export liste

**Champs:**
```typescript
{
  first_name: string
  last_name: string
  email: string
  employee_number: string
  job_title: string
  department: string
  employment_type: 'full_time' | 'part_time' | 'contractor'
  hire_date: date
  base_salary: number
  status: 'active' | 'on_leave' | 'terminated'
}
```

#### 🏖️ LeavesScreen.tsx
**Endpoint:** `/api/employee-leaves`
**Fonctionnalités:**
- Calendrier des congés
- Demander congé
- Approuver/Refuser (manager)
- Solde de congés par employé
- Types: vacation, sick, parental, unpaid...

**Champs:**
```typescript
{
  employee_id: uuid
  leave_type: 'vacation' | 'sick' | 'parental' | ...
  start_date: date
  end_date: date
  half_day: boolean
  reason: string
  status: 'pending' | 'approved' | 'rejected'
}
```

#### ⏰ TimeClocksScreen.tsx
**Endpoint:** `/api/time-clockings`
**Fonctionnalités:**
- Pointer arrivée/départ (bouton gros)
- Historique pointages
- Géolocalisation optionnelle
- Heures travaillées par jour/semaine
- Export feuille de temps

---

### 5. Module Stock (2 écrans)

#### 📦 InventoryScreen.tsx
**Endpoint:** `/api/inventory-levels`
**Fonctionnalités:**
- Liste produits avec niveaux stock
- Multi-entrepôts
- Alertes stock faible
- Recherche/filtres
- Mouvements récents

#### 🏭 WarehousesScreen.tsx
**Endpoint:** `/api/warehouses`
**Fonctionnalités:**
- Liste entrepôts
- Créer/modifier entrepôt
- Vue détail avec stock
- Carte/localisation

---

## 🎨 Guidelines Design

### Structure type d'un écran

```typescript
import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import Navigation from '../components/Navigation';
import { serviceAPI } from '../services/api';

export default function ModuleScreen({ navigation }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await serviceAPI.getAll();
      setData(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Navigation navigation={navigation} />
      {/* Content */}
    </View>
  );
}
```

### Palette couleurs Simplix

```typescript
const colors = {
  primary: '#6366F1',      // Indigo
  secondary: '#8B5CF6',    // Purple
  success: '#10B981',      // Green
  warning: '#F59E0B',      // Orange
  error: '#EF4444',        // Red
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    800: '#1F2937',
    900: '#111827'
  }
};
```

---

## 🔌 Services API à créer

Créer dans `/web-app/src/services/api.ts`:

```typescript
// Comptabilité
export const bankAccountsService = {
  getAll: () => api.get('/bank-accounts'),
  getOne: (id: string) => api.get(`/bank-accounts/${id}`),
  create: (data: any) => api.post('/bank-accounts', data),
  update: (id: string, data: any) => api.put(`/bank-accounts/${id}`, data),
  delete: (id: string) => api.delete(`/bank-accounts/${id}`)
};

export const bankTransactionsService = {
  getAll: (accountId?: string) => api.get('/bank-transactions', { params: { account_id: accountId }}),
  create: (data: any) => api.post('/bank-transactions', data),
  reconcile: (id: string, invoiceId: string) => api.post(`/bank-transactions/${id}/reconcile`, { invoice_id: invoiceId })
};

export const accountingService = {
  getEntries: (params: any) => api.get('/accounting/entries', { params }),
  exportFEC: (fiscalYear: number) => api.post('/accounting/export/fec', { fiscal_year: fiscalYear })
};

// Facturation avancée
export const recurringInvoicesService = {
  getAll: () => api.get('/recurring-invoices'),
  create: (data: any) => api.post('/recurring-invoices', data),
  pause: (id: string) => api.post(`/recurring-invoices/${id}/pause`),
  resume: (id: string) => api.post(`/recurring-invoices/${id}/resume`)
};

export const creditNotesService = {
  getAll: () => api.get('/credit-notes'),
  create: (data: any) => api.post('/credit-notes', data),
  fromInvoice: (invoiceId: string, data: any) => api.post(`/credit-notes/from-invoice/${invoiceId}`, data),
  apply: (id: string, invoiceId: string) => api.post(`/credit-notes/${id}/apply`, { invoice_id: invoiceId })
};

// Projets & Temps
export const projectsService = {
  getAll: () => api.get('/projects'),
  getOne: (id: string) => api.get(`/projects/${id}`),
  create: (data: any) => api.post('/projects', data),
  update: (id: string, data: any) => api.put(`/projects/${id}`, data),
  getStats: (id: string) => api.get(`/projects/${id}/stats`)
};

export const timeEntriesService = {
  getAll: (params: any) => api.get('/time-entries', { params }),
  create: (data: any) => api.post('/time-entries', data),
  update: (id: string, data: any) => api.put(`/time-entries/${id}`, data)
};

// RH
export const employeesService = {
  getAll: () => api.get('/employees'),
  getOne: (id: string) => api.get(`/employees/${id}`),
  create: (data: any) => api.post('/employees', data),
  update: (id: string, data: any) => api.put(`/employees/${id}`, data)
};

export const leavesService = {
  getAll: (employeeId?: string) => api.get('/employee-leaves', { params: { employee_id: employeeId }}),
  request: (data: any) => api.post('/employee-leaves', data),
  approve: (id: string) => api.post(`/employee-leaves/${id}/approve`),
  reject: (id: string) => api.post(`/employee-leaves/${id}/reject`)
};

// Stock
export const inventoryService = {
  getAll: (warehouseId?: string) => api.get('/inventory-levels', { params: { warehouse_id: warehouseId }}),
  getLowStock: () => api.get('/inventory-levels/low-stock')
};

export const warehousesService = {
  getAll: () => api.get('/warehouses'),
  create: (data: any) => api.post('/warehouses', data)
};
```

---

## 🧪 Testing checklist

Pour chaque écran créé:

- [ ] Affichage liste fonctionne
- [ ] Recherche/filtres fonctionnent
- [ ] Créer nouvel élément fonctionne
- [ ] Modifier élément existant fonctionne
- [ ] Supprimer élément fonctionne (avec confirmation)
- [ ] Messages d'erreur affichés
- [ ] Loading states gérés
- [ ] Refresh/pull-to-refresh fonctionne
- [ ] Navigation vers détails fonctionne
- [ ] Responsive mobile/tablet/web

---

## 📅 Timeline développement

### Sprint 1 (2-3 jours)
- ✅ Setup Docker
- ✅ Seed data
- ✅ Swagger docs
- ⏳ Écrans Comptabilité (3)

### Sprint 2 (2 jours)
- Écrans Facturation avancée (2)
- Écrans Projets & Temps (2)

### Sprint 3 (2 jours)
- Écrans RH (3)
- Écrans Stock (2)

### Sprint 4 (1 jour)
- Tests end-to-end
- Corrections bugs
- Documentation finale

**Total estimé: 7-8 jours de développement**

---

## 🚀 Commandes utiles

### Démarrer le backend

```bash
cd /home/user/Simplix
docker-compose up -d

# Appliquer les migrations
docker-compose --profile tools run --rm migrations

# Charger seed data
docker-compose exec postgres psql -U simplix_user -d simplix_crm -f /migrations/seed.sql
```

### Démarrer le frontend

```bash
cd /home/user/Simplix/web-app
npm install
npm start

# Pour web
npm run web
```

### Tests

```bash
# Backend
cd api
npm test

# Frontend
cd web-app
npm test
```

---

## 📝 Notes importantes

1. **Authentification:** Tous les écrans doivent vérifier l'auth avec AuthContext
2. **Multi-tenant:** Toujours inclure organization_id (géré automatiquement par API)
3. **Offline:** Utiliser AsyncStorage pour cache basique
4. **Erreurs:** Afficher toasts/alerts user-friendly
5. **Performance:** Pagination pour listes > 50 items

---

## 🔗 Ressources

- **Backend API:** http://localhost:3000
- **Swagger docs:** http://localhost:3000/api-docs
- **Adminer (DB):** http://localhost:8080
- **Guide déploiement:** [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
- **Roadmap implémentation:** [ROADMAP_IMPLEMENTATION.md](./ROADMAP_IMPLEMENTATION.md)

---

**Prochaine étape:** Commencer par BankAccountsScreen.tsx pour le module Comptabilité.

Copier un écran existant comme base (ex: InvoicesScreen.tsx) et adapter.
