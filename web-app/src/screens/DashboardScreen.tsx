import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { analyticsService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  DollarIcon,
  ChartIcon,
  UsersIcon,
  PackageIcon,
  FileTextIcon,
  TrendingUpIcon,
  AlertTriangleIcon,
  ActivityIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  TrendingDownIcon,
  CalendarIcon,
} from '../components/Icons';

type DashboardScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Dashboard'>;
};

interface DashboardData {
  totalRevenue: number;
  totalSales: number;
  totalCustomers: number;
  totalProducts: number;
  totalQuotes: number;
  pendingQuotesValue: number;
  recentSales: any[];
  topCustomers: any[];
  topProducts: any[];
  lowStock: any[];
  quotesConversion: any[];
}

interface QuickStats {
  pipelineValue: number;
  pipelineCount: number;
  tasksOverdue: number;
  tasksPending: number;
  contactsThisMonth: number;
  invoicesPending: number;
  invoicesOverdue: number;
  invoicesPendingValue: number;
}

const { width, height } = Dimensions.get('window');

export default function DashboardScreen({ navigation }: DashboardScreenProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [quickStats, setQuickStats] = useState<QuickStats>({
    pipelineValue: 0,
    pipelineCount: 0,
    tasksOverdue: 0,
    tasksPending: 0,
    contactsThisMonth: 0,
    invoicesPending: 0,
    invoicesOverdue: 0,
    invoicesPendingValue: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [leadScores, setLeadScores] = useState<any[]>([]);
  const [pipelineStages, setPipelineStages] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setError(null);
      
      const [
        dashboardResponse,
        topCustomersResponse,
        topProductsResponse,
        quotesConversionResponse,
        recentActivityResponse,
        lowStockResponse,
      ] = await Promise.all([
        analyticsService.getDashboard(),
        analyticsService.getTopCustomers(5),
        analyticsService.getTopProducts(5),
        analyticsService.getQuotesConversion(),
        analyticsService.getRecentActivity(10),
        analyticsService.getLowStock(10),
      ]);

      const dashboard = dashboardResponse.data;
      
      setDashboardData({
        totalRevenue: parseFloat(dashboard.totalRevenue) || 0,
        totalSales: parseInt(dashboard.totalSales) || 0,
        totalCustomers: parseInt(dashboard.totalCustomers) || 0,
        totalProducts: parseInt(dashboard.totalProducts) || 0,
        totalQuotes: parseInt(dashboard.totalQuotes) || 0,
        pendingQuotesValue: parseFloat(dashboard.pendingQuotesValue) || 0,
        recentSales: recentActivityResponse.data || [],
        topCustomers: topCustomersResponse.data || [],
        topProducts: topProductsResponse.data || [],
        lowStock: lowStockResponse.data || [],
        quotesConversion: quotesConversionResponse.data || [],
      });

      // Mock Lead Scores
      setLeadScores([
        { id: 1, name: 'Acme Corp', score: 85, trend: 'up', contacts: 3 },
        { id: 2, name: 'Tech Industries', score: 78, trend: 'up', contacts: 2 },
        { id: 3, name: 'Global Solutions', score: 72, trend: 'flat', contacts: 1 },
        { id: 4, name: 'Enterprise Ltd', score: 65, trend: 'down', contacts: 2 },
        { id: 5, name: 'Startup XYZ', score: 58, trend: 'up', contacts: 1 },
      ]);

      // Mock Pipeline Stages
      setPipelineStages([
        { id: 1, name: 'Prospection', count: 8, value: 45000 },
        { id: 2, name: 'Qualification', count: 5, value: 32000 },
        { id: 3, name: 'Proposition', count: 4, value: 38000 },
        { id: 4, name: 'Négociation', count: 6, value: 30000 },
      ]);

      setQuickStats({
        pipelineValue: 145000,
        pipelineCount: 23,
        tasksOverdue: 5,
        tasksPending: 12,
        contactsThisMonth: 8,
        invoicesPending: 7,
        invoicesOverdue: 3,
        invoicesPendingValue: 34500,
      });
    } catch (err: any) {
      console.error('Erreur lors du chargement des données:', err);
      setError(err.response?.data?.error || 'Impossible de charger les données du tableau de bord');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('fr-FR').format(num);
  };

  const calculateQuotesStats = () => {
    if (!dashboardData?.quotesConversion) return { won: 0, lost: 0, pending: 0, total: 0, rate: 0 };
    
    const won = dashboardData.quotesConversion.find((q: any) => q.status === 'accepted')?.count || 0;
    const lost = dashboardData.quotesConversion.find((q: any) => q.status === 'rejected')?.count || 0;
    const draft = dashboardData.quotesConversion.find((q: any) => q.status === 'draft')?.count || 0;
    const sent = dashboardData.quotesConversion.find((q: any) => q.status === 'sent')?.count || 0;
    const pending = parseInt(draft) + parseInt(sent);
    const total = parseInt(won) + parseInt(lost) + pending;
    const rate = total > 0 ? (parseInt(won) / total) * 100 : 0;
    
    return { won: parseInt(won), lost: parseInt(lost), pending, total, rate };
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <AlertTriangleIcon size={64} color="#FF3B30" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchDashboardData}>
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!dashboardData) return null;

  const quotesStats = calculateQuotesStats();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Bonjour, {user?.name} 👋</Text>
        <Text style={styles.subtitle}>Vue d'ensemble complète</Text>
      </View>

      <ScrollView
        style={styles.mainScroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#007AFF" />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Layout 2 Colonnes */}
        <View style={styles.twoColumnContainer}>
          {/* COLONNE GAUCHE */}
          <View style={styles.leftColumn}>
            {/* Métriques Principales 2x2 */}
            <View style={styles.metricsGrid}>
              <TouchableOpacity
                style={styles.metricCard}
                onPress={() => navigation.navigate('Sales')}
                activeOpacity={0.8}
              >
                <View style={[styles.metricIcon, { backgroundColor: '#34C75920' }]}>
                  <DollarIcon size={20} color="#34C759" />
                </View>
                <Text style={styles.metricLabel}>Revenus</Text>
                <Text style={styles.metricValue}>{formatCurrency(dashboardData.totalRevenue)}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.metricCard}
                onPress={() => navigation.navigate('Sales')}
                activeOpacity={0.8}
              >
                <View style={[styles.metricIcon, { backgroundColor: '#007AFF20' }]}>
                  <ChartIcon size={20} color="#007AFF" />
                </View>
                <Text style={styles.metricLabel}>Ventes</Text>
                <Text style={styles.metricValue}>{formatNumber(dashboardData.totalSales)}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.metricCard}
                onPress={() => navigation.navigate('Customers')}
                activeOpacity={0.8}
              >
                <View style={[styles.metricIcon, { backgroundColor: '#FF950020' }]}>
                  <UsersIcon size={20} color="#FF9500" />
                </View>
                <Text style={styles.metricLabel}>Clients</Text>
                <Text style={styles.metricValue}>{formatNumber(dashboardData.totalCustomers)}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.metricCard}
                onPress={() => navigation.navigate('Products')}
                activeOpacity={0.8}
              >
                <View style={[styles.metricIcon, { backgroundColor: '#AF52DE20' }]}>
                  <PackageIcon size={20} color="#AF52DE" />
                </View>
                <Text style={styles.metricLabel}>Produits</Text>
                <Text style={styles.metricValue}>{formatNumber(dashboardData.totalProducts)}</Text>
              </TouchableOpacity>
            </View>

            {/* Statistiques Rapides */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>ACTIVITÉ CRM</Text>
              <View style={styles.statsGrid}>
                <TouchableOpacity style={styles.statCard} onPress={() => navigation.navigate('Pipeline')}>
                  <View style={[styles.statIcon, { backgroundColor: '#FF950020' }]}>
                    <TrendingUpIcon size={16} color="#FF9500" />
                  </View>
                  <Text style={styles.statLabel}>Pipeline</Text>
                  <Text style={styles.statValue}>{formatCurrency(quickStats.pipelineValue)}</Text>
                  <Text style={styles.statSmall}>{quickStats.pipelineCount} deals</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.statCard} onPress={() => navigation.navigate('Tasks')}>
                  <View style={[styles.statIcon, { backgroundColor: '#007AFF20' }]}>
                    <CheckCircleIcon size={16} color="#007AFF" />
                  </View>
                  <Text style={styles.statLabel}>Tâches</Text>
                  <Text style={[styles.statValue, { color: '#FF3B30' }]}>{quickStats.tasksOverdue}</Text>
                  <Text style={styles.statSmall}>en retard</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.statCard} onPress={() => navigation.navigate('Invoices')}>
                  <View style={[styles.statIcon, { backgroundColor: '#34C75920' }]}>
                    <FileTextIcon size={16} color="#34C759" />
                  </View>
                  <Text style={styles.statLabel}>Facturation</Text>
                  <Text style={styles.statValue}>{formatCurrency(quickStats.invoicesPendingValue)}</Text>
                  <Text style={styles.statSmall}>{quickStats.invoicesPending} en attente</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.statCard} onPress={() => navigation.navigate('Contacts')}>
                  <View style={[styles.statIcon, { backgroundColor: '#5856D620' }]}>
                    <UsersIcon size={16} color="#5856D6" />
                  </View>
                  <Text style={styles.statLabel}>Contacts</Text>
                  <Text style={styles.statValue}>{quickStats.contactsThisMonth}</Text>
                  <Text style={styles.statSmall}>ce mois</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Meilleurs Clients */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>TOP CLIENTS</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Customers')}>
                  <Text style={styles.seeAll}>Voir tout</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.card}>
                {dashboardData.topCustomers.filter((c: any) => c.total_revenue).length > 0 ? (
                  dashboardData.topCustomers
                    .filter((c: any) => c.total_revenue)
                    .slice(0, 3)
                    .map((customer: any, index: number) => (
                      <View key={customer.id || index} style={styles.listItem}>
                        <View style={styles.listRank}>
                          <Text style={styles.rankNumber}>{index + 1}</Text>
                        </View>
                        <View style={styles.listContent}>
                          <Text style={styles.listName} numberOfLines={1}>{customer.name}</Text>
                          <Text style={styles.listMeta}>{customer.total_sales} ventes</Text>
                        </View>
                        <Text style={styles.listAmount}>{formatCurrency(parseFloat(customer.total_revenue) || 0)}</Text>
                      </View>
                    ))
                ) : (
                  <Text style={styles.emptyText}>Aucun client</Text>
                )}
              </View>
            </View>

            {/* Alertes Stock */}
            {dashboardData.lowStock.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: '#FF9500' }]}>⚠ STOCK FAIBLE</Text>
                <View style={[styles.card, styles.alertCard]}>
                  {dashboardData.lowStock.slice(0, 3).map((product: any, index: number) => (
                    <View key={product.id || index} style={styles.alertItem}>
                      <View style={styles.alertContent}>
                        <Text style={styles.alertName} numberOfLines={1}>{product.name}</Text>
                        <Text style={styles.alertStock}>Stock: {product.stock}</Text>
                      </View>
                      <Text style={styles.alertPrice}>{formatCurrency(parseFloat(product.price))}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>

          {/* COLONNE DROITE */}
          <View style={styles.rightColumn}>
            {/* Lead Scoring */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🎯 LEADS CHAUDS</Text>
              <View style={styles.card}>
                {leadScores.map((lead, index) => (
                  <View key={lead.id} style={styles.leadItem}>
                    <View style={styles.leadScore}>
                      <Text style={[styles.leadScoreValue, 
                        lead.score >= 75 ? { color: '#34C759' } : 
                        lead.score >= 60 ? { color: '#FF9500' } : 
                        { color: '#FF3B30' }
                      ]}>
                        {lead.score}
                      </Text>
                    </View>
                    <View style={styles.leadInfo}>
                      <Text style={styles.leadName} numberOfLines={1}>{lead.name}</Text>
                      <View style={styles.leadMeta}>
                        <Text style={styles.leadContacts}>{lead.contacts} contacts</Text>
                        <View style={styles.trendIcon}>
                          {lead.trend === 'up' && <TrendingUpIcon size={12} color="#34C759" />}
                          {lead.trend === 'down' && <TrendingDownIcon size={12} color="#FF3B30" />}
                        </View>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* Pipeline par Stage */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📊 PIPELINE</Text>
              <View style={styles.card}>
                {pipelineStages.map((stage, index) => (
                  <View key={stage.id} style={styles.stageItem}>
                    <View style={styles.stageHeader}>
                      <Text style={styles.stageName}>{stage.name}</Text>
                      <View style={styles.stageBadge}>
                        <Text style={styles.stageBadgeText}>{stage.count}</Text>
                      </View>
                    </View>
                    <View style={styles.stageBar}>
                      <View style={[styles.stageBarFill, { 
                        width: `${(stage.count / 10) * 100}%`,
                        backgroundColor: ['#34C759', '#007AFF', '#FF9500', '#AF52DE'][index % 4]
                      }]} />
                    </View>
                    <Text style={styles.stageValue}>{formatCurrency(stage.value)}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Devis Performance */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📄 DEVIS</Text>
              <View style={styles.card}>
                <View style={styles.quotesOverview}>
                  <View style={styles.quoteStatMini}>
                    <Text style={styles.quoteStatNumber}>{quotesStats.total}</Text>
                    <Text style={styles.quoteStatLabel}>Total</Text>
                  </View>
                  <View style={styles.quoteStatMini}>
                    <Text style={[styles.quoteStatNumber, { color: '#34C759' }]}>{quotesStats.won}</Text>
                    <Text style={styles.quoteStatLabel}>Acceptés</Text>
                  </View>
                  <View style={styles.quoteStatMini}>
                    <Text style={[styles.quoteStatNumber, { color: '#FF9500' }]}>{quotesStats.pending}</Text>
                    <Text style={styles.quoteStatLabel}>En attente</Text>
                  </View>
                  <View style={styles.quoteStatMini}>
                    <Text style={[styles.quoteStatNumber, { color: '#FF3B30' }]}>{quotesStats.lost}</Text>
                    <Text style={styles.quoteStatLabel}>Refusés</Text>
                  </View>
                </View>
                <View style={styles.conversionBar}>
                  <Text style={styles.conversionLabel}>Taux conversion</Text>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${quotesStats.rate}%` }]} />
                  </View>
                  <Text style={styles.conversionValue}>{quotesStats.rate.toFixed(1)}%</Text>
                </View>
              </View>
            </View>

            {/* Produits Populaires */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>🔥 PRODUITS</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Products')}>
                  <Text style={styles.seeAll}>Voir tout</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.card}>
                {dashboardData.topProducts.filter((p: any) => p.total_revenue).length > 0 ? (
                  dashboardData.topProducts
                    .filter((p: any) => p.total_revenue)
                    .slice(0, 3)
                    .map((product: any, index: number) => (
                      <View key={product.id || index} style={styles.listItem}>
                        <View style={styles.listRank}>
                          <Text style={styles.rankNumber}>{index + 1}</Text>
                        </View>
                        <View style={styles.listContent}>
                          <Text style={styles.listName} numberOfLines={1}>{product.name}</Text>
                          <Text style={styles.listMeta}>{product.total_quantity || 0} vendus</Text>
                        </View>
                        <Text style={styles.listAmount}>{formatCurrency(parseFloat(product.total_revenue) || 0)}</Text>
                      </View>
                    ))
                ) : (
                  <Text style={styles.emptyText}>Aucune vente</Text>
                )}
              </View>
            </View>

            {/* Activité Récente */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>⏱ RÉCENT</Text>
              <View style={styles.card}>
                {dashboardData.recentSales.length > 0 ? (
                  dashboardData.recentSales.slice(0, 4).map((activity: any, index: number) => (
                    <View key={activity.id || index} style={styles.activityMini}>
                      <View style={[
                        styles.activityMiniIcon,
                        activity.type === 'sale' && { backgroundColor: '#34C75920' },
                        activity.type === 'quote' && { backgroundColor: '#007AFF20' },
                        activity.type === 'customer' && { backgroundColor: '#FF950020' },
                      ]}>
                        {activity.type === 'sale' && <ChartIcon size={14} color="#34C759" />}
                        {activity.type === 'quote' && <FileTextIcon size={14} color="#007AFF" />}
                        {activity.type === 'customer' && <UsersIcon size={14} color="#FF9500" />}
                      </View>
                      <View style={styles.activityMiniContent}>
                        <Text style={styles.activityMiniTitle} numberOfLines={1}>
                          {activity.type === 'sale' && 'Nouvelle vente'}
                          {activity.type === 'quote' && 'Devis créé'}
                          {activity.type === 'customer' && `Client: ${activity.name}`}
                        </Text>
                        <Text style={styles.activityMiniTime}>
                          {activity.created_at ? new Date(activity.created_at).toLocaleDateString('fr-FR', {
                            month: 'short',
                            day: 'numeric',
                          }) : 'Récemment'}
                        </Text>
                      </View>
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyText}>Aucune activité</Text>
                )}
              </View>
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '400',
    letterSpacing: -0.2,
  },
  mainScroll: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 17,
    color: '#8E8E93',
    fontWeight: '500',
  },
  errorText: {
    fontSize: 17,
    color: '#FF3B30',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  twoColumnContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingTop: 16,
    gap: 12,
  },
  leftColumn: {
    flex: 1,
  },
  rightColumn: {
    flex: 1,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  metricCard: {
    width: (width / 2) - 22,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  metricIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '500',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8E8E93',
    letterSpacing: 0.5,
  },
  seeAll: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  alertCard: {
    borderLeftWidth: 3,
    borderLeftColor: '#FF9500',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    width: (width / 2) - 22,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  statIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '500',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 2,
  },
  statSmall: {
    fontSize: 10,
    color: '#8E8E93',
    fontWeight: '400',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  listRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  rankNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000000',
  },
  listContent: {
    flex: 1,
  },
  listName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  listMeta: {
    fontSize: 11,
    color: '#8E8E93',
  },
  listAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#34C759',
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#FFF9E6',
  },
  alertContent: {
    flex: 1,
    marginRight: 10,
  },
  alertName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  alertStock: {
    fontSize: 11,
    color: '#FF9500',
    fontWeight: '500',
  },
  alertPrice: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF3B30',
  },
  leadItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  leadScore: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  leadScoreValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  leadInfo: {
    flex: 1,
  },
  leadName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  leadMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  leadContacts: {
    fontSize: 11,
    color: '#8E8E93',
  },
  trendIcon: {
    marginLeft: 4,
  },
  stageItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  stageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  stageName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
  },
  stageBadge: {
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  stageBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#000000',
  },
  stageBar: {
    height: 4,
    backgroundColor: '#F2F2F7',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 6,
  },
  stageBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  stageValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#34C759',
  },
  quotesOverview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  quoteStatMini: {
    alignItems: 'center',
    flex: 1,
  },
  quoteStatNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
  },
  quoteStatLabel: {
    fontSize: 10,
    color: '#8E8E93',
    marginTop: 2,
  },
  conversionBar: {
    gap: 6,
  },
  conversionLabel: {
    fontSize: 12,
    color: '#000000',
    fontWeight: '600',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#F2F2F7',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#34C759',
    borderRadius: 2,
  },
  conversionValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#34C759',
  },
  activityMini: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  activityMiniIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  activityMiniContent: {
    flex: 1,
  },
  activityMiniTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  activityMiniTime: {
    fontSize: 11,
    color: '#8E8E93',
  },
  emptyText: {
    fontSize: 13,
    color: '#8E8E93',
    textAlign: 'center',
    paddingVertical: 12,
  },
});
