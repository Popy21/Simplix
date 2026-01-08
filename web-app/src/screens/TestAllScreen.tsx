import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

interface TestResult {
  name: string;
  category: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message?: string;
  duration?: number;
}

interface TestCategory {
  name: string;
  icon: string;
  tests: TestConfig[];
}

interface TestConfig {
  name: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  requiresAuth: boolean;
  expectedStatus?: number[];
}

const TEST_CATEGORIES: TestCategory[] = [
  // ==================== AUTHENTIFICATION ====================
  {
    name: 'Authentification',
    icon: '🔐',
    tests: [
      { name: 'Login valide', endpoint: '/auth/login', method: 'POST', body: { email: 'a@gmail.com', password: 'test123' }, requiresAuth: false, expectedStatus: [200, 401] },
      { name: 'Login invalide', endpoint: '/auth/login', method: 'POST', body: { email: 'test@test.com', password: 'wrong' }, requiresAuth: false, expectedStatus: [401] },
      { name: 'Me (profil)', endpoint: '/auth/me', method: 'GET', requiresAuth: true },
      { name: 'Refresh token', endpoint: '/auth/refresh', method: 'POST', body: { refreshToken: 'test' }, requiresAuth: false, expectedStatus: [200, 401] },
    ],
  },
  // ==================== CONTACTS ====================
  {
    name: 'Contacts',
    icon: '👥',
    tests: [
      // GET
      { name: 'Liste contacts', endpoint: '/contacts', method: 'GET', requiresAuth: true },
      { name: 'Stats contacts', endpoint: '/contacts/stats', method: 'GET', requiresAuth: true },
      { name: 'Contacts (type=lead)', endpoint: '/contacts?type=lead', method: 'GET', requiresAuth: true },
      { name: 'Contacts (type=prospect)', endpoint: '/contacts?type=prospect', method: 'GET', requiresAuth: true },
      { name: 'Contacts (type=customer)', endpoint: '/contacts?type=customer', method: 'GET', requiresAuth: true },
      { name: 'Contacts (search)', endpoint: '/contacts?search=test', method: 'GET', requiresAuth: true },
      { name: 'Contacts (pagination)', endpoint: '/contacts?page=1&limit=10', method: 'GET', requiresAuth: true },
      // CRUD
      { name: 'Créer contact', endpoint: '/contacts', method: 'POST', body: { first_name: 'Test', last_name: 'API', email: `test${Date.now()}@api.com`, type: 'lead', source: 'direct' }, requiresAuth: true },
    ],
  },
  // ==================== ENTREPRISES ====================
  {
    name: 'Entreprises',
    icon: '🏢',
    tests: [
      { name: 'Liste entreprises', endpoint: '/companies', method: 'GET', requiresAuth: true },
      { name: 'Entreprises (search)', endpoint: '/companies?search=test', method: 'GET', requiresAuth: true },
      { name: 'Entreprises (pagination)', endpoint: '/companies?page=1&limit=10', method: 'GET', requiresAuth: true },
      { name: 'Créer entreprise', endpoint: '/companies', method: 'POST', body: { name: `TestCo${Date.now()}`, email: 'company@test.com', industry: 'Technology' }, requiresAuth: true },
    ],
  },
  // ==================== PRODUITS ====================
  {
    name: 'Produits',
    icon: '📦',
    tests: [
      { name: 'Liste produits', endpoint: '/products', method: 'GET', requiresAuth: true },
      { name: 'Produits (search)', endpoint: '/products?search=test', method: 'GET', requiresAuth: true },
      { name: 'Produits (pagination)', endpoint: '/products?page=1&limit=10', method: 'GET', requiresAuth: true },
      { name: 'Catégories produits', endpoint: '/categories/products', method: 'GET', requiresAuth: true },
      { name: 'Créer produit', endpoint: '/products', method: 'POST', body: { name: `Product${Date.now()}`, description: 'Test', price: 99.99 }, requiresAuth: true },
    ],
  },
  // ==================== CLIENTS ====================
  {
    name: 'Clients',
    icon: '🧑‍💼',
    tests: [
      { name: 'Liste clients', endpoint: '/customers', method: 'GET', requiresAuth: true },
      { name: 'Clients (search)', endpoint: '/customers?search=test', method: 'GET', requiresAuth: true },
      { name: 'Créer client', endpoint: '/customers', method: 'POST', body: { name: `Customer${Date.now()}`, email: 'cust@test.com', phone: '+33612345678' }, requiresAuth: true },
    ],
  },
  // ==================== DEVIS ====================
  {
    name: 'Devis',
    icon: '📝',
    tests: [
      { name: 'Liste devis', endpoint: '/quotes', method: 'GET', requiresAuth: true },
      { name: 'Devis (status=draft)', endpoint: '/quotes?status=draft', method: 'GET', requiresAuth: true },
      { name: 'Devis (status=sent)', endpoint: '/quotes?status=sent', method: 'GET', requiresAuth: true },
      { name: 'Devis (status=accepted)', endpoint: '/quotes?status=accepted', method: 'GET', requiresAuth: true },
      { name: 'Devis (pagination)', endpoint: '/quotes?page=1&limit=10', method: 'GET', requiresAuth: true },
      { name: 'Signatures devis', endpoint: '/quote-signatures', method: 'GET', requiresAuth: true },
    ],
  },
  // ==================== FACTURES ====================
  {
    name: 'Factures',
    icon: '🧾',
    tests: [
      { name: 'Liste factures', endpoint: '/invoices', method: 'GET', requiresAuth: true },
      { name: 'Factures (status=draft)', endpoint: '/invoices?status=draft', method: 'GET', requiresAuth: true },
      { name: 'Factures (status=sent)', endpoint: '/invoices?status=sent', method: 'GET', requiresAuth: true },
      { name: 'Factures (status=paid)', endpoint: '/invoices?status=paid', method: 'GET', requiresAuth: true },
      { name: 'Factures (status=unpaid)', endpoint: '/invoices?status=unpaid', method: 'GET', requiresAuth: true },
      { name: 'Factures (pagination)', endpoint: '/invoices?page=1&limit=10', method: 'GET', requiresAuth: true },
      { name: 'Templates factures', endpoint: '/templates', method: 'GET', requiresAuth: true },
      { name: 'Email templates', endpoint: '/email-templates', method: 'GET', requiresAuth: true },
      { name: 'Invoice templates', endpoint: '/invoice-templates', method: 'GET', requiresAuth: true },
      { name: 'Factures récurrentes', endpoint: '/recurring-invoices', method: 'GET', requiresAuth: true },
      { name: 'Proforma', endpoint: '/proforma', method: 'GET', requiresAuth: true },
    ],
  },
  // ==================== AVOIRS ====================
  {
    name: 'Avoirs',
    icon: '↩️',
    tests: [
      { name: 'Liste avoirs', endpoint: '/credit-notes', method: 'GET', requiresAuth: true },
      { name: 'Avoirs (pagination)', endpoint: '/credit-notes?page=1&limit=10', method: 'GET', requiresAuth: true },
    ],
  },
  // ==================== PAIEMENTS ====================
  {
    name: 'Paiements',
    icon: '💳',
    tests: [
      { name: 'Liste paiements', endpoint: '/payments', method: 'GET', requiresAuth: true },
      { name: 'Échéanciers', endpoint: '/payment-schedules', method: 'GET', requiresAuth: true },
      { name: 'Acomptes', endpoint: '/deposits', method: 'GET', requiresAuth: true },
    ],
  },
  // ==================== PIPELINE & DEALS ====================
  {
    name: 'Pipeline & Deals',
    icon: '📊',
    tests: [
      { name: 'Liste pipelines', endpoint: '/pipelines', method: 'GET', requiresAuth: true },
      { name: 'Stages pipeline', endpoint: '/pipeline/stages', method: 'GET', requiresAuth: true },
      { name: 'Liste deals', endpoint: '/deals', method: 'GET', requiresAuth: true },
      { name: 'Deals (stage=new)', endpoint: '/deals?stage=new', method: 'GET', requiresAuth: true },
      { name: 'Deals (pagination)', endpoint: '/deals?page=1&limit=10', method: 'GET', requiresAuth: true },
    ],
  },
  // ==================== LEADS ====================
  {
    name: 'Leads',
    icon: '🎯',
    tests: [
      { name: 'Liste leads', endpoint: '/leads', method: 'GET', requiresAuth: true },
      { name: 'Stats leads', endpoint: '/leads/stats', method: 'GET', requiresAuth: true },
      { name: 'Leads chauds', endpoint: '/leads/hot', method: 'GET', requiresAuth: true },
      { name: 'Leads par score', endpoint: '/leads/by-score', method: 'GET', requiresAuth: true },
      { name: 'Stats par source', endpoint: '/leads/stats/by-source', method: 'GET', requiresAuth: true },
      { name: 'Distribution scores', endpoint: '/leads/stats/distribution', method: 'GET', requiresAuth: true },
      { name: 'Leads (min_score=50)', endpoint: '/leads?min_score=50', method: 'GET', requiresAuth: true },
      { name: 'Leads (pagination)', endpoint: '/leads?page=1&limit=10', method: 'GET', requiresAuth: true },
    ],
  },
  // ==================== FOURNISSEURS ====================
  {
    name: 'Fournisseurs',
    icon: '🚚',
    tests: [
      { name: 'Liste fournisseurs', endpoint: '/suppliers', method: 'GET', requiresAuth: true },
      { name: 'Fournisseurs (search)', endpoint: '/suppliers?search=test', method: 'GET', requiresAuth: true },
      { name: 'Bons de commande', endpoint: '/purchase-orders', method: 'GET', requiresAuth: true },
      { name: 'Bons de livraison', endpoint: '/delivery-notes', method: 'GET', requiresAuth: true },
    ],
  },
  // ==================== STOCK ====================
  {
    name: 'Stock',
    icon: '📋',
    tests: [
      { name: 'Niveaux stock', endpoint: '/stock/levels', method: 'GET', requiresAuth: true },
      { name: 'Mouvements stock', endpoint: '/stock/movements', method: 'GET', requiresAuth: true },
      { name: 'Retours', endpoint: '/return-orders', method: 'GET', requiresAuth: true },
    ],
  },
  // ==================== DÉPENSES ====================
  {
    name: 'Dépenses',
    icon: '💸',
    tests: [
      { name: 'Liste dépenses', endpoint: '/expenses', method: 'GET', requiresAuth: true },
      { name: 'Dépenses (status=draft)', endpoint: '/expenses?status=draft', method: 'GET', requiresAuth: true },
      { name: 'Dépenses (status=submitted)', endpoint: '/expenses?status=submitted', method: 'GET', requiresAuth: true },
      { name: 'Dépenses (status=approved)', endpoint: '/expenses?status=approved', method: 'GET', requiresAuth: true },
      { name: 'Dépenses par catégorie', endpoint: '/expenses/by-category', method: 'GET', requiresAuth: true },
      { name: 'Résumé dépenses', endpoint: '/expenses/stats/summary', method: 'GET', requiresAuth: true },
      { name: 'Notes de frais', endpoint: '/expense-notes', method: 'GET', requiresAuth: true },
      { name: 'Créer dépense', endpoint: '/expenses', method: 'POST', body: { amount: 100, description: 'Test expense', expense_date: new Date().toISOString() }, requiresAuth: true },
    ],
  },
  // ==================== TÂCHES ====================
  {
    name: 'Tâches',
    icon: '✅',
    tests: [
      { name: 'Liste tâches', endpoint: '/tasks', method: 'GET', requiresAuth: true },
      { name: 'Tâches (status=pending)', endpoint: '/tasks?status=pending', method: 'GET', requiresAuth: true },
      { name: 'Tâches (status=completed)', endpoint: '/tasks?status=completed', method: 'GET', requiresAuth: true },
      { name: 'Tâches (priority=high)', endpoint: '/tasks?priority=high', method: 'GET', requiresAuth: true },
      { name: 'Tâches (pagination)', endpoint: '/tasks?page=1&limit=10', method: 'GET', requiresAuth: true },
    ],
  },
  // ==================== ACTIVITÉS ====================
  {
    name: 'Activités',
    icon: '📅',
    tests: [
      { name: 'Liste activités', endpoint: '/activities', method: 'GET', requiresAuth: true },
      { name: 'Activités (type=call)', endpoint: '/activities?type=call', method: 'GET', requiresAuth: true },
      { name: 'Activités (type=email)', endpoint: '/activities?type=email', method: 'GET', requiresAuth: true },
      { name: 'Activités (type=meeting)', endpoint: '/activities?type=meeting', method: 'GET', requiresAuth: true },
      { name: 'Activités (pagination)', endpoint: '/activities?page=1&limit=10', method: 'GET', requiresAuth: true },
      { name: 'Créer activité', endpoint: '/activities', method: 'POST', body: { type: 'call', description: 'Test call' }, requiresAuth: true },
    ],
  },
  // ==================== DASHBOARD & ANALYTICS ====================
  {
    name: 'Dashboard & Analytics',
    icon: '📈',
    tests: [
      { name: 'Dashboard stats', endpoint: '/dashboard/stats', method: 'GET', requiresAuth: true },
      { name: 'KPIs', endpoint: '/dashboard/kpis', method: 'GET', requiresAuth: true },
      { name: 'Analytics dashboard', endpoint: '/analytics/dashboard', method: 'GET', requiresAuth: true },
      { name: 'Analytics ventes', endpoint: '/analytics/sales', method: 'GET', requiresAuth: true },
      { name: 'Analytics revenue', endpoint: '/analytics/revenue', method: 'GET', requiresAuth: true },
      { name: 'Analytics contacts', endpoint: '/analytics/contacts', method: 'GET', requiresAuth: true },
      { name: 'Revenue summary', endpoint: '/revenue/summary', method: 'GET', requiresAuth: true },
      { name: 'Cashflow forecast', endpoint: '/cashflow/forecast', method: 'GET', requiresAuth: true },
      { name: 'Balance âgée', endpoint: '/aged-balance', method: 'GET', requiresAuth: true },
    ],
  },
  // ==================== ÉQUIPES ====================
  {
    name: 'Équipes',
    icon: '👨‍💼',
    tests: [
      { name: 'Liste équipes', endpoint: '/teams', method: 'GET', requiresAuth: true },
      { name: 'Permissions', endpoint: '/permissions', method: 'GET', requiresAuth: true },
    ],
  },
  // ==================== DOCUMENTS ====================
  {
    name: 'Documents',
    icon: '📁',
    tests: [
      { name: 'Liste documents', endpoint: '/documents', method: 'GET', requiresAuth: true },
      { name: 'Documents (pagination)', endpoint: '/documents?page=1&limit=10', method: 'GET', requiresAuth: true },
    ],
  },
  // ==================== EMAILS ====================
  {
    name: 'Emails',
    icon: '📧',
    tests: [
      { name: 'Templates email', endpoint: '/emails/templates', method: 'GET', requiresAuth: true },
      { name: 'Campagnes email', endpoint: '/email-campaigns', method: 'GET', requiresAuth: true },
    ],
  },
  // ==================== WORKFLOWS ====================
  {
    name: 'Workflows',
    icon: '⚙️',
    tests: [
      { name: 'Liste workflows', endpoint: '/workflows', method: 'GET', requiresAuth: true },
      { name: 'Workflows (pagination)', endpoint: '/workflows?page=1&limit=10', method: 'GET', requiresAuth: true },
    ],
  },
  // ==================== TVA & COMPTABILITÉ ====================
  {
    name: 'TVA & Comptabilité',
    icon: '🏛️',
    tests: [
      { name: 'Taux TVA', endpoint: '/vat/rates', method: 'GET', requiresAuth: true },
      { name: 'Régime TVA', endpoint: '/vat/regime', method: 'GET', requiresAuth: true },
      { name: 'Export comptable', endpoint: '/accounting/export', method: 'GET', requiresAuth: true },
      { name: 'Export FEC', endpoint: '/accounting/export?format=fec', method: 'GET', requiresAuth: true },
      { name: 'Factures intracom', endpoint: '/vat/intracom-invoices', method: 'GET', requiresAuth: true },
    ],
  },
  // ==================== CONFIGURATION ====================
  {
    name: 'Configuration',
    icon: '⚡',
    tests: [
      { name: 'Paramètres généraux', endpoint: '/settings', method: 'GET', requiresAuth: true },
      { name: 'Paramètres numérotation', endpoint: '/settings/numbering', method: 'GET', requiresAuth: true },
      { name: 'Paramètres notifications', endpoint: '/settings/notifications', method: 'GET', requiresAuth: true },
      { name: 'Profil entreprise', endpoint: '/company-profile', method: 'GET', requiresAuth: true },
      { name: 'Paramètres légaux', endpoint: '/legal-settings', method: 'GET', requiresAuth: true },
      { name: 'Numérotation (ancien)', endpoint: '/numbering/settings', method: 'GET', requiresAuth: true },
    ],
  },
  // ==================== TARIFICATION ====================
  {
    name: 'Tarification',
    icon: '💰',
    tests: [
      { name: 'Listes de prix', endpoint: '/pricing/lists', method: 'GET', requiresAuth: true },
      { name: 'Catégories clients', endpoint: '/categories/customers', method: 'GET', requiresAuth: true },
      { name: 'Unités', endpoint: '/categories/units', method: 'GET', requiresAuth: true },
    ],
  },
  // ==================== NOTIFICATIONS ====================
  {
    name: 'Notifications',
    icon: '🔔',
    tests: [
      { name: 'Notifications', endpoint: '/notifications', method: 'GET', requiresAuth: true },
      { name: 'Relances', endpoint: '/reminders', method: 'GET', requiresAuth: true },
    ],
  },
  // ==================== RECHERCHE & RAPPORTS ====================
  {
    name: 'Recherche & Rapports',
    icon: '🔍',
    tests: [
      { name: 'Recherche globale', endpoint: '/search?q=test', method: 'GET', requiresAuth: true },
      { name: 'Rapports', endpoint: '/reports', method: 'GET', requiresAuth: true },
      { name: 'Logs audit', endpoint: '/logs', method: 'GET', requiresAuth: true },
    ],
  },
  // ==================== EXPORTS ====================
  {
    name: 'Exports',
    icon: '📤',
    tests: [
      { name: 'Export contacts CSV', endpoint: '/exports/contacts?format=csv', method: 'GET', requiresAuth: true },
      { name: 'Export contacts JSON', endpoint: '/exports/contacts?format=json', method: 'GET', requiresAuth: true },
    ],
  },
  // ==================== BANQUE ====================
  {
    name: 'Banque',
    icon: '🏦',
    tests: [
      { name: 'Rapprochement bancaire', endpoint: '/bank/reconciliation', method: 'GET', requiresAuth: true },
    ],
  },
  // ==================== FACTUR-X ====================
  {
    name: 'Factur-X',
    icon: '🇫🇷',
    tests: [
      { name: 'Status Factur-X', endpoint: '/facturx/status', method: 'GET', requiresAuth: true },
    ],
  },
  // ==================== SHIPPING ====================
  {
    name: 'Shipping',
    icon: '📬',
    tests: [
      { name: 'Méthodes livraison', endpoint: '/shipping/methods', method: 'GET', requiresAuth: true },
    ],
  },
];

export default function TestAllScreen() {
  const { token } = useAuth();
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const runSingleTest = async (test: TestConfig, category: string): Promise<TestResult> => {
    const startTime = Date.now();
    try {
      const config: any = {
        method: test.method,
        url: test.endpoint,
      };

      if (test.body) {
        config.data = test.body;
      }

      if (test.requiresAuth && token) {
        config.headers = { Authorization: `Bearer ${token}` };
      }

      const response = await api(config);
      const duration = Date.now() - startTime;

      let message = `${response.status}`;
      if (typeof response.data === 'object') {
        if (Array.isArray(response.data)) {
          message += ` - ${response.data.length} items`;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          message += ` - ${response.data.data.length} items`;
        } else {
          message += ' - OK';
        }
      }

      return {
        name: test.name,
        category,
        status: 'success',
        message,
        duration,
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      const status = error.response?.status;
      const expectedStatuses = test.expectedStatus || [200, 201];

      if (status && expectedStatuses.includes(status)) {
        return {
          name: test.name,
          category,
          status: 'success',
          message: `${status} (expected)`,
          duration,
        };
      }

      return {
        name: test.name,
        category,
        status: 'error',
        message: error.response?.data?.error || error.message || `${status || 'Network'} error`,
        duration,
      };
    }
  };

  const runAllTests = useCallback(async () => {
    setIsRunning(true);
    setResults([]);

    const allTests: { test: TestConfig; category: string }[] = [];
    TEST_CATEGORIES.forEach((cat) => {
      cat.tests.forEach((test) => {
        allTests.push({ test, category: cat.name });
      });
    });

    setResults(
      allTests.map(({ test, category }) => ({
        name: test.name,
        category,
        status: 'pending',
      }))
    );

    const newResults: TestResult[] = [];
    for (let i = 0; i < allTests.length; i++) {
      const { test, category } = allTests[i];

      setResults((prev) =>
        prev.map((r, idx) => (idx === i ? { ...r, status: 'running' } : r))
      );

      const result = await runSingleTest(test, category);
      newResults.push(result);

      setResults((prev) =>
        prev.map((r, idx) => (idx === i ? result : r))
      );

      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    setIsRunning(false);
  }, [token]);

  const runCategoryTests = useCallback(
    async (category: TestCategory) => {
      setIsRunning(true);

      const categoryResults = category.tests.map((test) => ({
        name: test.name,
        category: category.name,
        status: 'pending' as const,
      }));

      setResults((prev) => {
        const filtered = prev.filter((r) => r.category !== category.name);
        return [...filtered, ...categoryResults];
      });

      for (let i = 0; i < category.tests.length; i++) {
        const test = category.tests[i];

        setResults((prev) =>
          prev.map((r) =>
            r.name === test.name && r.category === category.name
              ? { ...r, status: 'running' }
              : r
          )
        );

        const result = await runSingleTest(test, category.name);

        setResults((prev) =>
          prev.map((r) =>
            r.name === test.name && r.category === category.name ? result : r
          )
        );

        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      setIsRunning(false);
    },
    [token]
  );

  const toggleCategory = (categoryName: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(categoryName)) {
        newSet.delete(categoryName);
      } else {
        newSet.add(categoryName);
      }
      return newSet;
    });
  };

  const getResultsForCategory = (categoryName: string) => {
    return results.filter((r) => r.category === categoryName);
  };

  const getCategoryStatus = (categoryName: string) => {
    const categoryResults = getResultsForCategory(categoryName);
    if (categoryResults.length === 0) return 'pending';
    if (categoryResults.some((r) => r.status === 'running')) return 'running';
    if (categoryResults.some((r) => r.status === 'error')) return 'error';
    if (categoryResults.every((r) => r.status === 'success')) return 'success';
    return 'pending';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'running': return '⏳';
      default: return '⚪';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return '#10B981';
      case 'error': return '#EF4444';
      case 'running': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  const totalTests = TEST_CATEGORIES.reduce((acc, cat) => acc + cat.tests.length, 0);
  const successCount = results.filter((r) => r.status === 'success').length;
  const errorCount = results.filter((r) => r.status === 'error').length;
  const totalDuration = results.reduce((acc, r) => acc + (r.duration || 0), 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🧪 Test Dashboard</Text>
        <Text style={styles.subtitle}>
          {totalTests} tests • {TEST_CATEGORIES.length} catégories
        </Text>
      </View>

      {results.length > 0 && (
        <View style={styles.summary}>
          <View style={[styles.summaryItem, { backgroundColor: '#10B98120' }]}>
            <Text style={[styles.summaryValue, { color: '#10B981' }]}>{successCount}</Text>
            <Text style={styles.summaryLabel}>Succès</Text>
          </View>
          <View style={[styles.summaryItem, { backgroundColor: '#EF444420' }]}>
            <Text style={[styles.summaryValue, { color: '#EF4444' }]}>{errorCount}</Text>
            <Text style={styles.summaryLabel}>Erreurs</Text>
          </View>
          <View style={[styles.summaryItem, { backgroundColor: '#6366F120' }]}>
            <Text style={[styles.summaryValue, { color: '#6366F1' }]}>
              {(totalDuration / 1000).toFixed(1)}s
            </Text>
            <Text style={styles.summaryLabel}>Durée</Text>
          </View>
        </View>
      )}

      <TouchableOpacity
        style={[styles.runAllButton, isRunning && styles.runAllButtonDisabled]}
        onPress={runAllTests}
        disabled={isRunning}
      >
        {isRunning ? (
          <View style={styles.runningContainer}>
            <ActivityIndicator color="#FFF" size="small" />
            <Text style={styles.runAllButtonText}> Tests en cours...</Text>
          </View>
        ) : (
          <Text style={styles.runAllButtonText}>🚀 Lancer tous les tests ({totalTests})</Text>
        )}
      </TouchableOpacity>

      <ScrollView style={styles.categoriesList} showsVerticalScrollIndicator={false}>
        {TEST_CATEGORIES.map((category) => {
          const isExpanded = expandedCategories.has(category.name);
          const categoryStatus = getCategoryStatus(category.name);
          const categoryResults = getResultsForCategory(category.name);
          const categorySuccess = categoryResults.filter(r => r.status === 'success').length;
          const categoryError = categoryResults.filter(r => r.status === 'error').length;

          return (
            <View key={category.name} style={styles.categoryContainer}>
              <TouchableOpacity
                style={styles.categoryHeader}
                onPress={() => toggleCategory(category.name)}
              >
                <View style={styles.categoryLeft}>
                  <Text style={styles.categoryIcon}>{category.icon}</Text>
                  <View>
                    <Text style={styles.categoryName}>{category.name}</Text>
                    {categoryResults.length > 0 && (
                      <Text style={styles.categoryStats}>
                        {categorySuccess}/{category.tests.length} OK
                        {categoryError > 0 && <Text style={{color: '#EF4444'}}> • {categoryError} erreurs</Text>}
                      </Text>
                    )}
                  </View>
                </View>
                <View style={styles.categoryRight}>
                  {categoryResults.length > 0 && (
                    <Text style={styles.categoryStatus}>
                      {getStatusIcon(categoryStatus)}
                    </Text>
                  )}
                  <TouchableOpacity
                    style={styles.runCategoryButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      runCategoryTests(category);
                    }}
                    disabled={isRunning}
                  >
                    <Text style={styles.runCategoryButtonText}>▶️</Text>
                  </TouchableOpacity>
                  <Text style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</Text>
                </View>
              </TouchableOpacity>

              {isExpanded && (
                <View style={styles.testsList}>
                  {category.tests.map((test) => {
                    const result = results.find(
                      (r) => r.name === test.name && r.category === category.name
                    );

                    return (
                      <View key={test.name} style={styles.testItem}>
                        <View style={styles.testLeft}>
                          <Text style={styles.testStatus}>
                            {result ? getStatusIcon(result.status) : '⚪'}
                          </Text>
                          <View style={styles.testInfo}>
                            <Text style={styles.testName}>{test.name}</Text>
                            <Text style={styles.testEndpoint}>
                              {test.method} {test.endpoint}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.testRight}>
                          {result?.duration && (
                            <Text style={styles.testDuration}>{result.duration}ms</Text>
                          )}
                          {result?.message && (
                            <Text
                              style={[
                                styles.testMessage,
                                { color: getStatusColor(result.status) },
                              ]}
                              numberOfLines={1}
                            >
                              {result.message}
                            </Text>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {!token && (
        <View style={styles.authWarning}>
          <Text style={styles.authWarningText}>
            ⚠️ Non connecté - Les tests authentifiés échoueront
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    padding: 20,
    paddingTop: 20,
    backgroundColor: '#1E293B',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
  },
  summary: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  summaryItem: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
  },
  runAllButton: {
    backgroundColor: '#6366F1',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  runAllButtonDisabled: {
    backgroundColor: '#4B5563',
  },
  runAllButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  runningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoriesList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  categoryContainer: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  categoryIcon: {
    fontSize: 24,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  categoryStats: {
    fontSize: 12,
    color: '#10B981',
    marginTop: 2,
  },
  categoryRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryStatus: {
    fontSize: 18,
  },
  runCategoryButton: {
    padding: 8,
    backgroundColor: '#334155',
    borderRadius: 8,
  },
  runCategoryButtonText: {
    fontSize: 14,
  },
  expandIcon: {
    fontSize: 12,
    color: '#64748B',
  },
  testsList: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  testItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  testLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  testStatus: {
    fontSize: 16,
  },
  testInfo: {
    flex: 1,
  },
  testName: {
    fontSize: 14,
    color: '#E2E8F0',
    fontWeight: '500',
  },
  testEndpoint: {
    fontSize: 11,
    color: '#64748B',
    fontFamily: 'monospace',
  },
  testRight: {
    alignItems: 'flex-end',
    maxWidth: 120,
  },
  testDuration: {
    fontSize: 11,
    color: '#64748B',
  },
  testMessage: {
    fontSize: 11,
    marginTop: 2,
  },
  authWarning: {
    backgroundColor: '#F59E0B20',
    padding: 12,
    margin: 16,
    borderRadius: 12,
  },
  authWarningText: {
    color: '#F59E0B',
    textAlign: 'center',
    fontSize: 14,
  },
});
