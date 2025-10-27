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
import Navigation from '../components/Navigation';
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
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);

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

  // Mode Simple
  const renderSimpleMode = () => (
    <>
      {/* Métriques Principales - Compacte */}
      <View style={styles.simpleMetrics}>
        <TouchableOpacity style={styles.simpleMetricCard} onPress={() => navigation.navigate('Sales')}>
          <DollarIcon size={24} color="#34C759" />
          <Text style={styles.simpleMetricValue}>{formatCurrency(dashboardData.totalRevenue)}</Text>
          <Text style={styles.simpleMetricLabel}>Revenus</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.simpleMetricCard} onPress={() => navigation.navigate('Sales')}>
          <ChartIcon size={24} color="#007AFF" />
          <Text style={styles.simpleMetricValue}>{formatNumber(dashboardData.totalSales)}</Text>
          <Text style={styles.simpleMetricLabel}>Ventes</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.simpleMetricCard} onPress={() => navigation.navigate('Customers')}>
          <UsersIcon size={24} color="#FF9500" />
          <Text style={styles.simpleMetricValue}>{formatNumber(dashboardData.totalCustomers)}</Text>
          <Text style={styles.simpleMetricLabel}>Clients</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.simpleMetricCard} onPress={() => navigation.navigate('Pipeline')}>
          <TrendingUpIcon size={24} color="#AF52DE" />
          <Text style={styles.simpleMetricValue}>{formatCurrency(quickStats.pipelineValue)}</Text>
          <Text style={styles.simpleMetricLabel}>Pipeline</Text>
        </TouchableOpacity>
      </View>

      {/* Activité Récente - Simple */}
      <View style={styles.simpleSection}>
        <Text style={styles.simpleSectionTitle}>Activité récente</Text>
        <View style={styles.card}>
          {dashboardData.recentSales.length > 0 ? (
            dashboardData.recentSales.slice(0, 5).map((activity: any, index: number) => (
              <View key={`activity-${activity.type}-${activity.id || index}`} style={styles.simpleActivityItem}>
                <View style={[
                  styles.simpleActivityIcon,
                  activity.type === 'sale' && { backgroundColor: '#34C75920' },
                  activity.type === 'quote' && { backgroundColor: '#007AFF20' },
                  activity.type === 'customer' && { backgroundColor: '#FF950020' },
                ]}>
                  {activity.type === 'sale' && <ChartIcon size={16} color="#34C759" />}
                  {activity.type === 'quote' && <FileTextIcon size={16} color="#007AFF" />}
                  {activity.type === 'customer' && <UsersIcon size={16} color="#FF9500" />}
                </View>
                <View style={styles.simpleActivityContent}>
                  <Text style={styles.simpleActivityTitle}>
                    {activity.type === 'sale' && 'Nouvelle vente'}
                    {activity.type === 'quote' && 'Devis créé'}
                    {activity.type === 'customer' && `Client: ${activity.name}`}
                  </Text>
                  <Text style={styles.simpleActivityTime}>
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

      {/* Top Clients - Simple */}
      <View style={styles.simpleSection}>
        <Text style={styles.simpleSectionTitle}>Top clients</Text>
        <View style={styles.card}>
          {dashboardData.topCustomers.filter((c: any) => c.total_revenue).length > 0 ? (
            dashboardData.topCustomers
              .filter((c: any) => c.total_revenue)
              .slice(0, 3)
              .map((customer: any, index: number) => (
                <View key={`customer-simple-${customer.id || index}`} style={styles.simpleListItem}>
                  <Text style={styles.simpleListName}>{customer.name}</Text>
                  <Text style={styles.simpleListAmount}>{formatCurrency(parseFloat(customer.total_revenue) || 0)}</Text>
                </View>
              ))
          ) : (
            <Text style={styles.emptyText}>Aucun client</Text>
          )}
        </View>
      </View>
    </>
  );

  // Mode Avancé - Style Kibana
  const renderAdvancedMode = () => (
    <>
      {/* En-tête Style Kibana */}
      <View style={styles.kibanaHeader}>
        <View style={styles.kibanaTimeline}>
          <ClockIcon size={16} color="#6B6B6B" />
          <Text style={styles.kibanaTimeText}>Dernières 30 jours</Text>
        </View>
        <TouchableOpacity style={styles.kibanaRefresh}>
          <ActivityIcon size={16} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Grille de Métriques KPI - Style Kibana */}
      <View style={styles.kibanaKpiGrid}>
        <View style={styles.kibanaKpiCard}>
          <Text style={styles.kibanaKpiLabel}>Total Revenue</Text>
          <Text style={styles.kibanaKpiValue}>{formatCurrency(dashboardData.totalRevenue)}</Text>
          <View style={styles.kibanaKpiTrend}>
            <TrendingUpIcon size={12} color="#34C759" />
            <Text style={styles.kibanaKpiTrendText}>+12.5%</Text>
          </View>
        </View>

        <View style={styles.kibanaKpiCard}>
          <Text style={styles.kibanaKpiLabel}>Sales Count</Text>
          <Text style={styles.kibanaKpiValue}>{formatNumber(dashboardData.totalSales)}</Text>
          <View style={styles.kibanaKpiTrend}>
            <TrendingUpIcon size={12} color="#34C759" />
            <Text style={styles.kibanaKpiTrendText}>+8.3%</Text>
          </View>
        </View>

        <View style={styles.kibanaKpiCard}>
          <Text style={styles.kibanaKpiLabel}>Pipeline Value</Text>
          <Text style={styles.kibanaKpiValue}>{formatCurrency(quickStats.pipelineValue)}</Text>
          <View style={styles.kibanaKpiTrend}>
            <TrendingUpIcon size={12} color="#34C759" />
            <Text style={styles.kibanaKpiTrendText}>+15.2%</Text>
          </View>
        </View>

        <View style={styles.kibanaKpiCard}>
          <Text style={styles.kibanaKpiLabel}>Conversion Rate</Text>
          <Text style={styles.kibanaKpiValue}>{quotesStats.rate.toFixed(1)}%</Text>
          <View style={styles.kibanaKpiTrend}>
            <TrendingDownIcon size={12} color="#FF3B30" />
            <Text style={[styles.kibanaKpiTrendText, { color: '#FF3B30' }]}>-2.1%</Text>
          </View>
        </View>
      </View>

      {/* Layout 2 Colonnes - Style Kibana */}
      <View style={styles.twoColumnContainer}>
        {/* Colonne Gauche */}
        <View style={styles.leftColumn}>
          {/* Graphique Pipeline */}
          <View style={styles.kibanaPanel}>
            <Text style={styles.kibanaPanelTitle}>Pipeline Stages</Text>
            <View style={styles.kibanaPanelContent}>
              {pipelineStages.map((stage, index) => (
                <View key={stage.id} style={styles.kibanaBarItem}>
                  <View style={styles.kibanaBarHeader}>
                    <Text style={styles.kibanaBarLabel}>{stage.name}</Text>
                    <Text style={styles.kibanaBarValue}>{formatCurrency(stage.value)}</Text>
                  </View>
                  <View style={styles.kibanaBarContainer}>
                    <View style={[styles.kibanaBarFill, {
                      width: `${(stage.value / 50000) * 100}%`,
                      backgroundColor: ['#00BFB3', '#3185FC', '#F66', '#D36086'][index % 4]
                    }]} />
                  </View>
                  <Text style={styles.kibanaBarCount}>{stage.count} deals</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Heat Map - Lead Scores */}
          <View style={styles.kibanaPanel}>
            <Text style={styles.kibanaPanelTitle}>Lead Scoring Heatmap</Text>
            <View style={styles.kibanaHeatmap}>
              {leadScores.map((lead) => (
                <View key={lead.id} style={[
                  styles.kibanaHeatCell,
                  { backgroundColor: lead.score >= 75 ? '#00BFB320' : lead.score >= 60 ? '#F6640020' : '#98A2B320' }
                ]}>
                  <Text style={styles.kibanaHeatName}>{lead.name}</Text>
                  <Text style={[
                    styles.kibanaHeatScore,
                    { color: lead.score >= 75 ? '#00BFB3' : lead.score >= 60 ? '#F66' : '#98A2B3' }
                  ]}>{lead.score}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Table de données */}
          <View style={styles.kibanaPanel}>
            <Text style={styles.kibanaPanelTitle}>Top Customers by Revenue</Text>
            <View style={styles.kibanaTable}>
              <View style={styles.kibanaTableHeader}>
                <Text style={[styles.kibanaTableHeaderCell, { flex: 2 }]}>Customer</Text>
                <Text style={styles.kibanaTableHeaderCell}>Sales</Text>
                <Text style={[styles.kibanaTableHeaderCell, { textAlign: 'right' }]}>Revenue</Text>
              </View>
              {dashboardData.topCustomers.filter((c: any) => c.total_revenue).slice(0, 5).map((customer: any, index: number) => (
                <View key={`customer-kibana-${customer.id || index}`} style={styles.kibanaTableRow}>
                  <Text style={[styles.kibanaTableCell, { flex: 2 }]} numberOfLines={1}>{customer.name}</Text>
                  <Text style={styles.kibanaTableCell}>{customer.total_sales}</Text>
                  <Text style={[styles.kibanaTableCell, { textAlign: 'right', fontWeight: '600' }]}>
                    {formatCurrency(parseFloat(customer.total_revenue) || 0)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Colonne Droite */}
        <View style={styles.rightColumn}>
          {/* Donut Chart - Quotes */}
          <View style={styles.kibanaPanel}>
            <Text style={styles.kibanaPanelTitle}>Quote Status Distribution</Text>
            <View style={styles.kibanaDonutContainer}>
              <View style={styles.kibanaDonutCenter}>
                <Text style={styles.kibanaDonutValue}>{quotesStats.total}</Text>
                <Text style={styles.kibanaDonutLabel}>Total</Text>
              </View>
            </View>
            <View style={styles.kibanaLegend}>
              <View style={styles.kibanaLegendItem}>
                <View style={[styles.kibanaLegendDot, { backgroundColor: '#00BFB3' }]} />
                <Text style={styles.kibanaLegendText}>Acceptés ({quotesStats.won})</Text>
              </View>
              <View style={styles.kibanaLegendItem}>
                <View style={[styles.kibanaLegendDot, { backgroundColor: '#F66' }]} />
                <Text style={styles.kibanaLegendText}>Refusés ({quotesStats.lost})</Text>
              </View>
              <View style={styles.kibanaLegendItem}>
                <View style={[styles.kibanaLegendDot, { backgroundColor: '#FFCE7A' }]} />
                <Text style={styles.kibanaLegendText}>En attente ({quotesStats.pending})</Text>
              </View>
            </View>
          </View>

          {/* Metric Panel - CRM Activity */}
          <View style={styles.kibanaPanel}>
            <Text style={styles.kibanaPanelTitle}>CRM Activity Metrics</Text>
            <View style={styles.kibanaMetricsList}>
              <View style={styles.kibanaMetricItem}>
                <View style={styles.kibanaMetricHeader}>
                  <UsersIcon size={16} color="#3185FC" />
                  <Text style={styles.kibanaMetricTitle}>Contacts</Text>
                </View>
                <Text style={styles.kibanaMetricNumber}>{quickStats.contactsThisMonth}</Text>
                <Text style={styles.kibanaMetricSubtext}>this month</Text>
              </View>

              <View style={styles.kibanaMetricItem}>
                <View style={styles.kibanaMetricHeader}>
                  <CheckCircleIcon size={16} color="#00BFB3" />
                  <Text style={styles.kibanaMetricTitle}>Tasks</Text>
                </View>
                <Text style={styles.kibanaMetricNumber}>{quickStats.tasksPending}</Text>
                <Text style={styles.kibanaMetricSubtext}>{quickStats.tasksOverdue} overdue</Text>
              </View>

              <View style={styles.kibanaMetricItem}>
                <View style={styles.kibanaMetricHeader}>
                  <FileTextIcon size={16} color="#D36086" />
                  <Text style={styles.kibanaMetricTitle}>Invoices</Text>
                </View>
                <Text style={styles.kibanaMetricNumber}>{quickStats.invoicesPending}</Text>
                <Text style={styles.kibanaMetricSubtext}>{formatCurrency(quickStats.invoicesPendingValue)}</Text>
              </View>
            </View>
          </View>

          {/* Timeline - Recent Activity */}
          <View style={styles.kibanaPanel}>
            <Text style={styles.kibanaPanelTitle}>Recent Activity Timeline</Text>
            <View style={styles.kibanaTimeline}>
              {dashboardData.recentSales.slice(0, 6).map((activity: any, index: number) => (
                <View key={`timeline-${activity.type}-${activity.id || index}`} style={styles.kibanaTimelineItem}>
                  <View style={styles.kibanaTimelineDot} />
                  <View style={styles.kibanaTimelineContent}>
                    <Text style={styles.kibanaTimelineTitle}>
                      {activity.type === 'sale' && 'Sale Created'}
                      {activity.type === 'quote' && 'Quote Generated'}
                      {activity.type === 'customer' && 'Customer Added'}
                    </Text>
                    <Text style={styles.kibanaTimelineTime}>
                      {activity.created_at ? new Date(activity.created_at).toLocaleString('fr-FR', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : 'Recently'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Stock Alert */}
          {dashboardData.lowStock.length > 0 && (
            <View style={[styles.kibanaPanel, styles.kibanaAlertPanel]}>
              <View style={styles.kibanaAlertHeader}>
                <AlertTriangleIcon size={18} color="#F66" />
                <Text style={styles.kibanaAlertTitle}>Low Stock Alert</Text>
              </View>
              {dashboardData.lowStock.slice(0, 3).map((product: any, index: number) => (
                <View key={`lowstock-${product.id || index}`} style={styles.kibanaAlertItem}>
                  <Text style={styles.kibanaAlertName} numberOfLines={1}>{product.name}</Text>
                  <Text style={styles.kibanaAlertValue}>Stock: {product.stock}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    </>
  );

  return (
    <View style={styles.container}>
      <Navigation />
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Bonjour, {user?.name} 👋</Text>
          <Text style={styles.subtitle}>{isAdvancedMode ? 'Analytics Dashboard' : 'Vue d\'ensemble'}</Text>
        </View>
        <TouchableOpacity
          style={styles.modeToggle}
          onPress={() => setIsAdvancedMode(!isAdvancedMode)}
        >
          <Text style={styles.modeToggleText}>{isAdvancedMode ? 'Simple' : 'Avancé'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.mainScroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#007AFF" />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentPadding}>
          {isAdvancedMode ? renderAdvancedMode() : renderSimpleMode()}
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 24,
    fontWeight: '300',
    color: '#1A1A1A',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    color: '#6B6B6B',
    fontWeight: '400',
    letterSpacing: 0,
  },
  modeToggle: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  modeToggleText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  mainScroll: {
    flex: 1,
  },
  contentPadding: {
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: '#6B6B6B',
    fontWeight: '400',
  },
  errorText: {
    fontSize: 15,
    color: '#FF3B30',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
    fontWeight: '400',
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
  },

  // SIMPLE MODE STYLES
  simpleMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  simpleMetricCard: {
    flex: 1,
    minWidth: (width / 2) - 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  simpleMetricValue: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1A1A1A',
    marginTop: 12,
    marginBottom: 4,
  },
  simpleMetricLabel: {
    fontSize: 13,
    color: '#8E8E8E',
    fontWeight: '500',
  },
  simpleSection: {
    marginBottom: 20,
  },
  simpleSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  simpleActivityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  simpleActivityIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  simpleActivityContent: {
    flex: 1,
  },
  simpleActivityTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  simpleActivityTime: {
    fontSize: 12,
    color: '#8E8E8E',
  },
  simpleListItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  simpleListName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A1A',
    flex: 1,
  },
  simpleListAmount: {
    fontSize: 15,
    fontWeight: '600',
    color: '#34C759',
  },

  // KIBANA ADVANCED MODE STYLES
  kibanaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  kibanaTimeline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  kibanaTimeText: {
    fontSize: 13,
    color: '#6B6B6B',
    fontWeight: '400',
  },
  kibanaRefresh: {
    padding: 8,
  },
  kibanaKpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  kibanaKpiCard: {
    flex: 1,
    minWidth: (width / 2) - 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    padding: 16,
    borderWidth: 1,
    borderColor: '#D3DAE6',
  },
  kibanaKpiLabel: {
    fontSize: 11,
    color: '#69707D',
    fontWeight: '400',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  kibanaKpiValue: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1A1C21',
    marginBottom: 6,
  },
  kibanaKpiTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  kibanaKpiTrendText: {
    fontSize: 12,
    color: '#34C759',
    fontWeight: '500',
  },
  kibanaPanel: {
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#D3DAE6',
  },
  kibanaPanelTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1C21',
    marginBottom: 16,
  },
  kibanaPanelContent: {
    gap: 12,
  },
  kibanaBarItem: {
    marginBottom: 16,
  },
  kibanaBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  kibanaBarLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1A1C21',
  },
  kibanaBarValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#00BFB3',
  },
  kibanaBarContainer: {
    height: 8,
    backgroundColor: '#F5F7FA',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  kibanaBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  kibanaBarCount: {
    fontSize: 11,
    color: '#69707D',
  },
  kibanaHeatmap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  kibanaHeatCell: {
    flex: 1,
    minWidth: (width / 2) - 60,
    padding: 12,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#D3DAE6',
  },
  kibanaHeatName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1A1C21',
    marginBottom: 6,
  },
  kibanaHeatScore: {
    fontSize: 20,
    fontWeight: '600',
  },
  kibanaTable: {
    borderWidth: 1,
    borderColor: '#D3DAE6',
    borderRadius: 4,
    overflow: 'hidden',
  },
  kibanaTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F5F7FA',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#D3DAE6',
  },
  kibanaTableHeaderCell: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    color: '#69707D',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  kibanaTableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F7FA',
  },
  kibanaTableCell: {
    flex: 1,
    fontSize: 13,
    color: '#1A1C21',
  },
  kibanaDonutContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  kibanaDonutCenter: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F5F7FA',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 12,
    borderColor: '#00BFB3',
  },
  kibanaDonutValue: {
    fontSize: 32,
    fontWeight: '600',
    color: '#1A1C21',
  },
  kibanaDonutLabel: {
    fontSize: 11,
    color: '#69707D',
    marginTop: 4,
  },
  kibanaLegend: {
    marginTop: 16,
    gap: 8,
  },
  kibanaLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  kibanaLegendDot: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  kibanaLegendText: {
    fontSize: 13,
    color: '#1A1C21',
  },
  kibanaMetricsList: {
    gap: 16,
  },
  kibanaMetricItem: {
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F7FA',
  },
  kibanaMetricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  kibanaMetricTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1A1C21',
  },
  kibanaMetricNumber: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1A1C21',
    marginBottom: 4,
  },
  kibanaMetricSubtext: {
    fontSize: 12,
    color: '#69707D',
  },
  kibanaTimelineItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  kibanaTimelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#00BFB3',
    marginTop: 4,
    marginRight: 12,
  },
  kibanaTimelineContent: {
    flex: 1,
  },
  kibanaTimelineTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1A1C21',
    marginBottom: 4,
  },
  kibanaTimelineTime: {
    fontSize: 12,
    color: '#69707D',
  },
  kibanaAlertPanel: {
    borderLeftWidth: 4,
    borderLeftColor: '#F66',
    backgroundColor: '#FEF6F6',
  },
  kibanaAlertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  kibanaAlertTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F66',
  },
  kibanaAlertItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#FEE',
  },
  kibanaAlertName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1A1C21',
    marginBottom: 4,
  },
  kibanaAlertValue: {
    fontSize: 12,
    color: '#F66',
    fontWeight: '500',
  },

  twoColumnContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  leftColumn: {
    flex: 1,
  },
  rightColumn: {
    flex: 1,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyText: {
    fontSize: 13,
    color: '#8E8E8E',
    textAlign: 'center',
    paddingVertical: 16,
    fontWeight: '400',
  },
});
