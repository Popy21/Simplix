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
  MenuIcon,
  CalendarIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
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

const { width } = Dimensions.get('window');

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

      // Calculer les statistiques rapides (données simulées pour le moment)
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
      {/* En-tête */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>Bonjour, {user?.name} 👋</Text>
            <Text style={styles.subtitle}>Vue d'ensemble CRM</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.mainScroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#007AFF" />
        }
        showsVerticalScrollIndicator={false}
        horizontal={true}
        pagingEnabled={true}
        scrollEventThrottle={16}
      >
        {/* PANNEAU GAUCHE - Métriques et Statistiques */}
        <View style={styles.leftPanel}>
          <ScrollView
            style={styles.panelScroll}
            showsVerticalScrollIndicator={false}
          >
            {/* Métriques Principales - Vue compacte 2x2 */}
            <View style={styles.metricsSection}>
              <View style={styles.metricsGrid}>
            <TouchableOpacity
              style={styles.metricCardCompact}
              onPress={() => navigation.navigate('Sales')}
              activeOpacity={0.8}
            >
              <View style={[styles.iconCircleSmall, { backgroundColor: '#34C759' }]}>
                <DollarIcon size={18} color="#FFFFFF" />
              </View>
              <Text style={styles.metricLabelCompact}>Chiffre</Text>
              <Text style={styles.metricValueCompact}>{formatCurrency(dashboardData.totalRevenue)}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.metricCardCompact}
              onPress={() => navigation.navigate('Sales')}
              activeOpacity={0.8}
            >
              <View style={[styles.iconCircleSmall, { backgroundColor: '#007AFF' }]}>
                <ChartIcon size={18} color="#FFFFFF" />
              </View>
              <Text style={styles.metricLabelCompact}>Ventes</Text>
              <Text style={styles.metricValueCompact}>{formatNumber(dashboardData.totalSales)}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.metricCardCompact}
              onPress={() => navigation.navigate('Customers')}
              activeOpacity={0.8}
            >
              <View style={[styles.iconCircleSmall, { backgroundColor: '#FF9500' }]}>
                <UsersIcon size={18} color="#FFFFFF" />
              </View>
              <Text style={styles.metricLabelCompact}>Clients</Text>
              <Text style={styles.metricValueCompact}>{formatNumber(dashboardData.totalCustomers)}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.metricCardCompact}
              onPress={() => navigation.navigate('Products')}
              activeOpacity={0.8}
            >
              <View style={[styles.iconCircleSmall, { backgroundColor: '#AF52DE' }]}>
                <PackageIcon size={18} color="#FFFFFF" />
              </View>
              <Text style={styles.metricLabelCompact}>Produits</Text>
              <Text style={styles.metricValueCompact}>{formatNumber(dashboardData.totalProducts)}</Text>
            </TouchableOpacity>
          </View>
        </View>

      {/* Statistiques Rapides - Nouvelles Fonctionnalités */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>ACTIVITÉ CRM</Text>
        <View style={styles.quickStatsGrid}>
          {/* Pipeline */}
          <TouchableOpacity
            style={styles.quickStatCard}
            onPress={() => navigation.navigate('Pipeline')}
            activeOpacity={0.8}
          >
            <View style={styles.quickStatHeader}>
              <View style={[styles.quickStatIcon, { backgroundColor: '#FF9500' }]}>
                <TrendingUpIcon size={18} color="#FFFFFF" />
              </View>
              <Text style={styles.quickStatTitle}>Pipeline</Text>
            </View>
            <Text style={styles.quickStatValue}>{formatCurrency(quickStats.pipelineValue)}</Text>
            <Text style={styles.quickStatLabel}>{quickStats.pipelineCount} opportunités</Text>
          </TouchableOpacity>

          {/* Tâches */}
          <TouchableOpacity
            style={styles.quickStatCard}
            onPress={() => navigation.navigate('Tasks')}
            activeOpacity={0.8}
          >
            <View style={styles.quickStatHeader}>
              <View style={[styles.quickStatIcon, { backgroundColor: '#007AFF' }]}>
                <CheckCircleIcon size={18} color="#FFFFFF" />
              </View>
              <Text style={styles.quickStatTitle}>Tâches</Text>
            </View>
            <View style={styles.quickStatRow}>
              <View style={styles.quickStatItem}>
                <Text style={[styles.quickStatNumber, { color: '#FF3B30' }]}>{quickStats.tasksOverdue}</Text>
                <Text style={styles.quickStatSmallLabel}>en retard</Text>
              </View>
              <View style={styles.quickStatDivider} />
              <View style={styles.quickStatItem}>
                <Text style={[styles.quickStatNumber, { color: '#FF9500' }]}>{quickStats.tasksPending}</Text>
                <Text style={styles.quickStatSmallLabel}>à faire</Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Contacts */}
          <TouchableOpacity
            style={styles.quickStatCard}
            onPress={() => navigation.navigate('Contacts')}
            activeOpacity={0.8}
          >
            <View style={styles.quickStatHeader}>
              <View style={[styles.quickStatIcon, { backgroundColor: '#5856D6' }]}>
                <UsersIcon size={18} color="#FFFFFF" />
              </View>
              <Text style={styles.quickStatTitle}>Contacts</Text>
            </View>
            <Text style={styles.quickStatValue}>{quickStats.contactsThisMonth}</Text>
            <Text style={styles.quickStatLabel}>nouveaux ce mois</Text>
          </TouchableOpacity>

          {/* Factures */}
          <TouchableOpacity
            style={styles.quickStatCard}
            onPress={() => navigation.navigate('Invoices')}
            activeOpacity={0.8}
          >
            <View style={styles.quickStatHeader}>
              <View style={[styles.quickStatIcon, { backgroundColor: '#34C759' }]}>
                <FileTextIcon size={18} color="#FFFFFF" />
              </View>
              <Text style={styles.quickStatTitle}>Facturation</Text>
            </View>
            <Text style={styles.quickStatValue}>{formatCurrency(quickStats.invoicesPendingValue)}</Text>
            <View style={styles.quickStatRow}>
              <Text style={styles.quickStatSmallLabel}>
                {quickStats.invoicesPending} en attente
              </Text>
              {quickStats.invoicesOverdue > 0 && (
                <>
                  <Text style={styles.quickStatDot}>•</Text>
                  <Text style={[styles.quickStatSmallLabel, { color: '#FF3B30' }]}>
                    {quickStats.invoicesOverdue} en retard
                  </Text>
                </>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Devis */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>DEVIS</Text>
        <View style={styles.card}>
          <View style={styles.quotesHeader}>
            <FileTextIcon size={20} color="#007AFF" />
            <Text style={styles.cardTitle}>Performance des Devis</Text>
          </View>
          
          <View style={styles.quotesStatsRow}>
            <View style={styles.quoteStat}>
              <Text style={styles.quoteStatValue}>{quotesStats.total}</Text>
              <Text style={styles.quoteStatLabel}>Total</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.quoteStat}>
              <View style={styles.quoteStatIconRow}>
                <CheckCircleIcon size={16} color="#34C759" />
                <Text style={[styles.quoteStatValue, { color: '#34C759' }]}>
                  {quotesStats.won}
                </Text>
              </View>
              <Text style={styles.quoteStatLabel}>Acceptés</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.quoteStat}>
              <View style={styles.quoteStatIconRow}>
                <ClockIcon size={16} color="#FF9500" />
                <Text style={[styles.quoteStatValue, { color: '#FF9500' }]}>
                  {quotesStats.pending}
                </Text>
              </View>
              <Text style={styles.quoteStatLabel}>En attente</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.quoteStat}>
              <View style={styles.quoteStatIconRow}>
                <XCircleIcon size={16} color="#FF3B30" />
                <Text style={[styles.quoteStatValue, { color: '#FF3B30' }]}>
                  {quotesStats.lost}
                </Text>
              </View>
              <Text style={styles.quoteStatLabel}>Refusés</Text>
            </View>
          </View>

          <View style={styles.conversionContainer}>
            <View style={styles.conversionHeader}>
              <Text style={styles.conversionLabel}>Taux de Conversion</Text>
              <Text style={styles.conversionValue}>{quotesStats.rate.toFixed(1)}%</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${quotesStats.rate}%` }]} />
            </View>
          </View>

          <View style={styles.pendingBox}>
            <View style={styles.pendingRow}>
              <Text style={styles.pendingLabel}>Valeur des devis en attente</Text>
              <Text style={styles.pendingValue}>{formatCurrency(dashboardData.pendingQuotesValue)}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Meilleurs Clients */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionLabel}>MEILLEURS CLIENTS</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Customers')}>
            <Text style={styles.seeAllLink}>Voir tout</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.card}>
          {dashboardData.topCustomers.filter((c: any) => c.total_revenue).length > 0 ? (
            dashboardData.topCustomers
              .filter((c: any) => c.total_revenue)
              .slice(0, 5)
              .map((customer: any, index: number) => (
                <View key={customer.id || index} style={styles.listItem}>
                  <View style={styles.listItemLeft}>
                    <View style={[styles.rankBadge, index === 0 && styles.goldRank]}>
                      <Text style={[styles.rankText, index === 0 && styles.goldText]}>
                        {index + 1}
                      </Text>
                    </View>
                    <View style={styles.listItemContent}>
                      <Text style={styles.listItemTitle} numberOfLines={1}>
                        {customer.name}
                      </Text>
                      <Text style={styles.listItemSubtitle} numberOfLines={1}>
                        {customer.total_sales} ventes · {customer.company || customer.email}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.listItemAmount}>
                    {formatCurrency(parseFloat(customer.total_revenue) || 0)}
                  </Text>
                </View>
              ))
          ) : (
            <View style={styles.emptyState}>
              <UsersIcon size={40} color="#D1D1D6" />
              <Text style={styles.emptyText}>Aucun client pour le moment</Text>
            </View>
          )}
        </View>
      </View>

      {/* Meilleurs Produits */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionLabel}>PRODUITS POPULAIRES</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Products')}>
            <Text style={styles.seeAllLink}>Voir tout</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.card}>
          {dashboardData.topProducts.filter((p: any) => p.total_revenue).length > 0 ? (
            dashboardData.topProducts
              .filter((p: any) => p.total_revenue)
              .slice(0, 5)
              .map((product: any, index: number) => (
                <View key={product.id || index} style={styles.listItem}>
                  <View style={styles.listItemLeft}>
                    <View style={[styles.rankBadge, index === 0 && styles.goldRank]}>
                      <Text style={[styles.rankText, index === 0 && styles.goldText]}>
                        {index + 1}
                      </Text>
                    </View>
                    <View style={styles.listItemContent}>
                      <Text style={styles.listItemTitle} numberOfLines={1}>
                        {product.name}
                      </Text>
                      <Text style={styles.listItemSubtitle}>
                        {product.total_quantity || product.total_sold || 0} vendus · Stock: {product.stock}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.listItemAmount}>
                    {formatCurrency(parseFloat(product.total_revenue) || 0)}
                  </Text>
                </View>
              ))
          ) : (
            <View style={styles.emptyState}>
              <PackageIcon size={40} color="#D1D1D6" />
              <Text style={styles.emptyText}>Aucune vente de produit</Text>
            </View>
          )}
        </View>
      </View>

      {/* Alertes Stock */}
      {dashboardData.lowStock.length > 0 && (
        <View style={styles.section}>
          <View style={styles.alertHeader}>
            <AlertTriangleIcon size={18} color="#FF9500" />
            <Text style={[styles.sectionLabel, { color: '#FF9500', marginLeft: 8 }]}>
              ALERTES STOCK
            </Text>
          </View>
          <View style={[styles.card, styles.alertCard]}>
            {dashboardData.lowStock.slice(0, 5).map((product: any, index: number) => (
              <View key={product.id || index} style={styles.alertItem}>
                <View style={styles.alertItemContent}>
                  <Text style={styles.alertItemName} numberOfLines={1}>
                    {product.name}
                  </Text>
                  <Text style={styles.alertItemPrice}>
                    {formatCurrency(parseFloat(product.price))}
                  </Text>
                </View>
                <View style={styles.stockBadge}>
                  <Text style={styles.stockValue}>{product.stock}</Text>
                  <Text style={styles.stockLabel}>restant</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Activité Récente */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>ACTIVITÉ RÉCENTE</Text>
        <View style={styles.card}>
          {dashboardData.recentSales.length > 0 ? (
            dashboardData.recentSales.slice(0, 8).map((activity: any, index: number) => (
              <View key={activity.id || index} style={styles.activityItem}>
                <View style={[
                  styles.activityIcon,
                  activity.type === 'sale' && { backgroundColor: '#34C75920' },
                  activity.type === 'quote' && { backgroundColor: '#007AFF20' },
                  activity.type === 'customer' && { backgroundColor: '#FF950020' },
                ]}>
                  {activity.type === 'sale' && <ChartIcon size={16} color="#34C759" />}
                  {activity.type === 'quote' && <FileTextIcon size={16} color="#007AFF" />}
                  {activity.type === 'customer' && <UsersIcon size={16} color="#FF9500" />}
                </View>
                <View style={styles.activityContent}>
                  <Text style={styles.activityTitle}>
                    {activity.type === 'sale' && 'Nouvelle vente'}
                    {activity.type === 'quote' && 'Devis créé'}
                    {activity.type === 'customer' && `Nouveau client: ${activity.name}`}
                  </Text>
                  <View style={styles.activityTimeRow}>
                    <CalendarIcon size={11} color="#8E8E93" />
                    <Text style={styles.activityTime}>
                      {activity.created_at
                        ? new Date(activity.created_at).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Récemment'}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <ActivityIcon size={40} color="#D1D1D6" />
              <Text style={styles.emptyText}>Aucune activité récente</Text>
            </View>
          )}
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
  scrollContent: {
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
    letterSpacing: -0.4,
  },
  errorText: {
    fontSize: 17,
    color: '#FF3B30',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
    fontWeight: '500',
    letterSpacing: -0.4,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.4,
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 32,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
    letterSpacing: -0.6,
  },
  subtitle: {
    fontSize: 15,
    color: '#8E8E93',
    fontWeight: '400',
    letterSpacing: -0.2,
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricsSection: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    letterSpacing: -0.1,
    marginBottom: 12,
  },
  metricsGrid: {
    gap: 12,
  },
  metricCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  largeCard: {
    padding: 20,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  metricLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
    letterSpacing: -0.2,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  metricFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricTrend: {
    fontSize: 13,
    color: '#34C759',
    fontWeight: '500',
    letterSpacing: -0.1,
  },
  metricSubtext: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '400',
    letterSpacing: -0.1,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  seeAllLink: {
    fontSize: 15,
    color: '#007AFF',
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  alertCard: {
    borderLeftWidth: 3,
    borderLeftColor: '#FF9500',
  },
  quotesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    letterSpacing: -0.4,
  },
  quotesStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
    marginBottom: 16,
  },
  quoteStat: {
    flex: 1,
    alignItems: 'center',
  },
  divider: {
    width: 1,
    height: 32,
    backgroundColor: '#E5E5EA',
  },
  quoteStatIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  quoteStatValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.4,
  },
  quoteStatLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
    fontWeight: '400',
    letterSpacing: -0.1,
  },
  conversionContainer: {
    marginBottom: 16,
  },
  conversionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  conversionLabel: {
    fontSize: 15,
    color: '#000000',
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  conversionValue: {
    fontSize: 17,
    fontWeight: '700',
    color: '#34C759',
    letterSpacing: -0.4,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#F2F2F7',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#34C759',
    borderRadius: 3,
  },
  pendingBox: {
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
    padding: 12,
  },
  pendingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pendingLabel: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  pendingValue: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FF9500',
    letterSpacing: -0.4,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  listItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  goldRank: {
    backgroundColor: '#FFD700',
  },
  rankText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.1,
  },
  goldText: {
    color: '#FFFFFF',
  },
  listItemContent: {
    flex: 1,
  },
  listItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  listItemSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
    letterSpacing: -0.1,
  },
  listItemAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: '#34C759',
    letterSpacing: -0.2,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  alertItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#FFF9E6',
  },
  alertItemContent: {
    flex: 1,
    marginRight: 12,
  },
  alertItemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  alertItemPrice: {
    fontSize: 13,
    color: '#8E8E93',
    letterSpacing: -0.1,
  },
  stockBadge: {
    backgroundColor: '#FFEBEB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  stockValue: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FF3B30',
    letterSpacing: -0.4,
  },
  stockLabel: {
    fontSize: 11,
    color: '#FF3B30',
    fontWeight: '500',
    letterSpacing: -0.1,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  activityTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  activityTime: {
    fontSize: 13,
    color: '#8E8E93',
    letterSpacing: -0.1,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 15,
    color: '#8E8E93',
    fontWeight: '400',
    letterSpacing: -0.2,
  },
  // Quick Stats Styles
  quickStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickStatCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    width: (width - 48) / 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  quickStatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickStatIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  quickStatTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    letterSpacing: -0.2,
  },
  quickStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  quickStatLabel: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '400',
    letterSpacing: -0.1,
  },
  quickStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  quickStatItem: {
    alignItems: 'center',
  },
  quickStatNumber: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  quickStatSmallLabel: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '400',
    letterSpacing: -0.1,
  },
  quickStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E5E5EA',
    marginHorizontal: 8,
  },
  quickStatDot: {
    fontSize: 12,
    color: '#8E8E93',
  },
  // Compact Metrics Styles
  metricCardCompact: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    width: (width - 48) / 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    alignItems: 'center',
  },
  iconCircleSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricLabelCompact: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  metricValueCompact: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
});
