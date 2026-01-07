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
import { analyticsService, notificationsService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Navigation from '../components/Navigation';
import {
  DollarIcon,
  ChartIcon,
  UsersIcon,
  FileTextIcon,
  TrendingUpIcon,
  AlertTriangleIcon,
  ActivityIcon,
  CheckCircleIcon,
  ClockIcon,
  TrendingDownIcon,
  MailIcon,
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
const isWeb = Platform.OS === 'web';

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
  const [pipelineStages, setPipelineStages] = useState<any[]>([]);
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);
  const [pendingQuotes, setPendingQuotes] = useState<any[]>([]);
  const [tasksToday, setTasksToday] = useState<any[]>([]);
  const [topCustomersEnhanced, setTopCustomersEnhanced] = useState<any[]>([]);
  const [conversionFunnel, setConversionFunnel] = useState<any>(null);
  const [activitySummary, setActivitySummary] = useState<any>(null);
  const [forecasting, setForecasting] = useState<any>(null);
  const [contextualNotifications, setContextualNotifications] = useState<any[]>([]);

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
        pendingQuotesResponse,
        tasksTodayResponse,
        topCustomersEnhancedResponse,
        conversionFunnelResponse,
        activitySummaryResponse,
        forecastingResponse,
        contextualNotificationsResponse,
        quickStatsResponse,
        pipelineStagesResponse,
      ] = await Promise.all([
        analyticsService.getDashboard(),
        analyticsService.getTopCustomers(5),
        analyticsService.getTopProducts(5),
        analyticsService.getQuotesConversion(),
        analyticsService.getRecentActivity(10),
        analyticsService.getLowStock(10),
        analyticsService.getPendingQuotes(),
        analyticsService.getTasksToday(),
        analyticsService.getTopCustomersEnhanced(5),
        analyticsService.getConversionFunnel(),
        analyticsService.getActivitySummary(),
        analyticsService.getForecasting(),
        notificationsService.getContextual(),
        analyticsService.getQuickStats(),
        analyticsService.getPipelineStages(),
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

      setPendingQuotes(pendingQuotesResponse.data || []);
      setTasksToday(tasksTodayResponse.data || []);
      setTopCustomersEnhanced(topCustomersEnhancedResponse.data || []);
      setConversionFunnel(conversionFunnelResponse.data || {});
      setActivitySummary(activitySummaryResponse.data || {});
      setForecasting(forecastingResponse.data || null);
      setContextualNotifications(contextualNotificationsResponse.data?.notifications || []);

      // Real Pipeline Stages from database
      setPipelineStages(pipelineStagesResponse.data || []);

      // Real Quick Stats from database
      setQuickStats(quickStatsResponse.data || {
        pipelineValue: 0,
        pipelineCount: 0,
        tasksOverdue: 0,
        tasksPending: 0,
        contactsThisMonth: 0,
        invoicesPending: 0,
        invoicesOverdue: 0,
        invoicesPendingValue: 0,
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
        <TouchableOpacity style={styles.simpleMetricCard} onPress={() => navigation.navigate('Sales' as any)}>
          <DollarIcon size={24} color="#34C759" />
          <Text style={styles.simpleMetricValue}>{formatCurrency(dashboardData.totalRevenue)}</Text>
          <Text style={styles.simpleMetricLabel}>Revenus</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.simpleMetricCard} onPress={() => navigation.navigate('Sales' as any)}>
          <ChartIcon size={24} color="#007AFF" />
          <Text style={styles.simpleMetricValue}>{formatNumber(dashboardData.totalSales)}</Text>
          <Text style={styles.simpleMetricLabel}>Ventes</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.simpleMetricCard} onPress={() => navigation.navigate('Customers' as any)}>
          <UsersIcon size={24} color="#FF9500" />
          <Text style={styles.simpleMetricValue}>{formatNumber(dashboardData.totalCustomers)}</Text>
          <Text style={styles.simpleMetricLabel}>Clients</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.simpleMetricCard} onPress={() => navigation.navigate('Pipeline' as any)}>
          <TrendingUpIcon size={24} color="#AF52DE" />
          <Text style={styles.simpleMetricValue}>{formatCurrency(quickStats.pipelineValue)}</Text>
          <Text style={styles.simpleMetricLabel}>Pipeline</Text>
        </TouchableOpacity>
      </View>

      {/* Activité Récente - Simple */}
      <View style={styles.simpleSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.simpleSectionTitle}>Activité récente</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Sales' as any)}>
            <Text style={styles.seeAllText}>Voir tout →</Text>
          </TouchableOpacity>
        </View>
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

      {/* Notifications contextuelles */}
      {contextualNotifications.length > 0 && (
        <View style={styles.simpleSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.simpleSectionTitle}>🔔 Alertes & Actions</Text>
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>{contextualNotifications.length}</Text>
            </View>
          </View>
          <View style={styles.card}>
            {contextualNotifications.slice(0, 5).map((notif: any, index: number) => (
              <View key={notif.id || index} style={[
                styles.notificationItem,
                notif.priority === 'high' && styles.notificationItemHigh,
                notif.priority === 'medium' && styles.notificationItemMedium,
              ]}>
                <View style={styles.notificationHeader}>
                  <View style={styles.notificationTitleRow}>
                    <View style={[
                      styles.notificationDot,
                      notif.type === 'danger' && { backgroundColor: '#FF3B30' },
                      notif.type === 'warning' && { backgroundColor: '#FF9500' },
                      notif.type === 'info' && { backgroundColor: '#007AFF' },
                      notif.type === 'success' && { backgroundColor: '#34C759' },
                    ]} />
                    <Text style={styles.notificationTitle}>{notif.title}</Text>
                    {notif.priority === 'high' && (
                      <View style={styles.priorityBadge}>
                        <Text style={styles.priorityBadgeText}>Urgent</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.notificationMessage}>{notif.message}</Text>
                </View>
                {notif.action && (
                  <View style={styles.notificationActions}>
                    {notif.action === 'relance' && (
                      <TouchableOpacity style={styles.notificationActionButton}>
                        <Text style={styles.notificationActionText}>Envoyer relance</Text>
                      </TouchableOpacity>
                    )}
                    {notif.action === 'create_quote' && (
                      <TouchableOpacity
                        style={styles.notificationActionButton}
                        onPress={() => navigation.navigate('Invoices' as any, {
                          action: 'createQuote',
                          customerId: notif.data?.contact_id || notif.data?.customer_id,
                        })}
                      >
                        <Text style={styles.notificationActionText}>Créer devis</Text>
                      </TouchableOpacity>
                    )}
                    {notif.action === 'view' && (
                      <TouchableOpacity style={styles.notificationActionButton}>
                        <Text style={styles.notificationActionText}>Voir détails</Text>
                      </TouchableOpacity>
                    )}
                    {notif.action === 'complete' && (
                      <TouchableOpacity style={styles.notificationActionButton}>
                        <Text style={styles.notificationActionText}>Marquer complété</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            ))}
            {contextualNotifications.length > 5 && (
              <TouchableOpacity style={styles.notificationViewAll}>
                <Text style={styles.notificationViewAllText}>
                  Voir toutes les alertes ({contextualNotifications.length})
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Devis en attente avec actions rapides */}
      {pendingQuotes.length > 0 && (
        <View style={styles.simpleSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.simpleSectionTitle}>Devis en attente</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Invoices' as any)}>
              <Text style={styles.seeAllText}>Voir tout →</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.card}>
            {pendingQuotes.slice(0, 3).map((quote: any) => (
              <TouchableOpacity
                key={quote.id}
                style={styles.actionableItem}
                onPress={() => navigation.navigate('Invoices' as any, { quoteId: quote.id })}
              >
                <View style={styles.itemLeft}>
                  <View style={[styles.statusDot, { backgroundColor: quote.status === 'sent' ? '#FF9500' : '#8E8E93' }]} />
                  <View>
                    <Text style={styles.itemTitle}>{quote.quote_number}</Text>
                    <Text style={styles.itemSubtitle}>{quote.customer_name || 'Client'}</Text>
                  </View>
                </View>
                <View style={styles.itemRight}>
                  <Text style={styles.itemAmount}>{formatCurrency(parseFloat(quote.total_amount))}</Text>
                  <TouchableOpacity
                    style={styles.quickActionBtn}
                    onPress={(e) => {
                      e.stopPropagation();
                      navigation.navigate('Invoices' as any, { action: 'sendQuote', quoteId: quote.id });
                    }}
                  >
                    <MailIcon size={14} color="#007AFF" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Tâches du jour avec liens */}
      {tasksToday.length > 0 && (
        <View style={styles.simpleSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.simpleSectionTitle}>Tâches à faire aujourd'hui</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Tasks' as any)}>
              <Text style={styles.seeAllText}>Voir tout →</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.card}>
            {tasksToday.slice(0, 3).map((task: any) => (
              <TouchableOpacity
                key={task.id}
                style={styles.actionableItem}
                onPress={() => {
                  if (task.contact_id) {
                    navigation.navigate('Contacts' as any, { customerId: task.contact_id });
                  } else {
                    navigation.navigate('Tasks' as any);
                  }
                }}
              >
                <View style={styles.itemLeft}>
                  <View style={[
                    styles.priorityDot,
                    {
                      backgroundColor: task.priority === 'high' ? '#FF3B30' :
                        task.priority === 'medium' ? '#FF9500' : '#34C759'
                    }
                  ]} />
                  <View>
                    <Text style={styles.itemTitle}>{task.title}</Text>
                    {task.contact_name && (
                      <Text style={styles.itemSubtitle}>→ {task.contact_name}</Text>
                    )}
                  </View>
                </View>
                <ClockIcon size={16} color="#8E8E93" />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Top Clients Enhanced */}
      {topCustomersEnhanced.length > 0 && (
        <View style={styles.simpleSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.simpleSectionTitle}>Meilleurs clients</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Contacts' as any)}>
              <Text style={styles.seeAllText}>Voir tout →</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.card}>
            {topCustomersEnhanced.map((customer: any, index: number) => (
              <TouchableOpacity
                key={customer.id}
                style={styles.actionableItem}
                onPress={() => navigation.navigate('Contacts' as any, { customerId: customer.id })}
              >
                <View style={styles.itemLeft}>
                  <View style={styles.rankBadge}>
                    <Text style={styles.rankText}>#{index + 1}</Text>
                  </View>
                  <View>
                    <Text style={styles.itemTitle}>{customer.customer_name}</Text>
                    <Text style={styles.itemSubtitle}>
                      {customer.total_quotes} devis • {customer.total_invoices} factures
                    </Text>
                  </View>
                </View>
                <View style={styles.itemRight}>
                  <Text style={styles.itemAmount}>{formatCurrency(parseFloat(customer.total_revenue))}</Text>
                  <TouchableOpacity
                    style={styles.quickActionBtn}
                    onPress={(e) => {
                      e.stopPropagation();
                      navigation.navigate('Invoices' as any, {
                        action: 'createQuote',
                        customerId: customer.id,
                        customerType: 'customer'
                      });
                    }}
                  >
                    <FileTextIcon size={14} color="#007AFF" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Prévisions et insights */}
      {forecasting && (
        <View style={styles.simpleSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.simpleSectionTitle}>🔮 Prévisions & Insights</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Analytics' as any)}>
              <Text style={styles.seeAllText}>Voir plus →</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.card}>
            <View style={styles.forecastRow}>
              <TouchableOpacity
                style={styles.forecastItem}
                onPress={() => navigation.navigate('Invoices' as any)}
              >
                <Text style={styles.forecastLabel}>CA Prévisionnel</Text>
                <Text style={styles.forecastValue}>{formatCurrency(forecasting.forecasted_revenue || 0)}</Text>
                <Text style={styles.forecastSubtext}>
                  Basé sur {forecasting.pending_quotes_count || 0} devis en cours
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.forecastItem}
                onPress={() => navigation.navigate('Analytics' as any)}
              >
                <Text style={styles.forecastLabel}>Taux de conversion</Text>
                <Text style={styles.forecastValue}>{((forecasting.conversion_rate || 0) * 100).toFixed(1)}%</Text>
                <Text style={styles.forecastSubtext}>
                  {forecasting.insights?.conversion_trend === 'excellent' ? '🟢 Excellent' :
                   forecasting.insights?.conversion_trend === 'good' ? '🟡 Bon' : '🔴 À améliorer'}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.forecastRow}>
              <TouchableOpacity
                style={styles.forecastItem}
                onPress={() => navigation.navigate('Analytics' as any)}
              >
                <Text style={styles.forecastLabel}>Croissance</Text>
                <Text style={[styles.forecastValue, forecasting.growth_rate >= 0 ? styles.positiveGrowth : styles.negativeGrowth]}>
                  {forecasting.growth_rate >= 0 ? '+' : ''}{forecasting.growth_rate.toFixed(1)}%
                </Text>
                <Text style={styles.forecastSubtext}>vs mois précédent</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.forecastItem}
                onPress={() => navigation.navigate('Invoices' as any)}
              >
                <Text style={styles.forecastLabel}>Délai paiement</Text>
                <Text style={styles.forecastValue}>{Math.round(forecasting.avg_payment_delay_days || 0)}j</Text>
                <Text style={styles.forecastSubtext}>
                  {forecasting.insights?.payment_speed === 'fast' ? '⚡ Rapide' :
                   forecasting.insights?.payment_speed === 'normal' ? '✓ Normal' : '⚠️ Lent'}
                </Text>
              </TouchableOpacity>
            </View>
            {forecasting.top_customer && (
              <TouchableOpacity
                style={styles.topCustomerHighlight}
                onPress={() => navigation.navigate('Contacts' as any, { customerId: forecasting.top_customer.id })}
              >
                <Text style={styles.topCustomerLabel}>🏆 Meilleur client du mois</Text>
                <Text style={styles.topCustomerName}>{forecasting.top_customer.customer_name}</Text>
                <Text style={styles.topCustomerValue}>{formatCurrency(forecasting.top_customer.total_spent || 0)}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Funnel de conversion */}
      {conversionFunnel && (
        <View style={styles.simpleSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.simpleSectionTitle}>Conversion</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Analytics' as any)}>
              <Text style={styles.seeAllText}>Voir plus →</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.funnelStep}
              onPress={() => navigation.navigate('Contacts' as any)}
            >
              <View style={styles.funnelStepInfo}>
                <UsersIcon size={16} color="#007AFF" />
                <Text style={styles.funnelStepLabel}>Contacts</Text>
              </View>
              <Text style={styles.funnelStepValue}>{conversionFunnel.total_contacts || 0}</Text>
            </TouchableOpacity>
            <View style={styles.funnelArrow}><Text style={styles.funnelArrowText}>↓</Text></View>
            <TouchableOpacity
              style={styles.funnelStep}
              onPress={() => navigation.navigate('Invoices' as any)}
            >
              <View style={styles.funnelStepInfo}>
                <FileTextIcon size={16} color="#FF9500" />
                <Text style={styles.funnelStepLabel}>Devis</Text>
              </View>
              <Text style={styles.funnelStepValue}>{conversionFunnel.total_quotes || 0}</Text>
            </TouchableOpacity>
            <View style={styles.funnelArrow}><Text style={styles.funnelArrowText}>↓</Text></View>
            <TouchableOpacity
              style={styles.funnelStep}
              onPress={() => navigation.navigate('Invoices' as any)}
            >
              <View style={styles.funnelStepInfo}>
                <CheckCircleIcon size={16} color="#34C759" />
                <Text style={styles.funnelStepLabel}>Payées</Text>
              </View>
              <Text style={styles.funnelStepValue}>{conversionFunnel.invoices_paid || 0}</Text>
            </TouchableOpacity>
            {conversionFunnel.total_quotes > 0 && (
              <View style={styles.conversionRate}>
                <Text style={styles.conversionRateText}>
                  Taux: {((conversionFunnel.invoices_paid / conversionFunnel.total_quotes) * 100).toFixed(1)}%
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Top Clients - Simple */}
      <View style={styles.simpleSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.simpleSectionTitle}>Top clients</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Contacts' as any)}>
            <Text style={styles.seeAllText}>Voir tout →</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.card}>
          {dashboardData.topCustomers.filter((c: any) => c.total_revenue).length > 0 ? (
            dashboardData.topCustomers
              .filter((c: any) => c.total_revenue)
              .slice(0, 3)
              .map((customer: any, index: number) => (
                <TouchableOpacity
                  key={`customer-simple-${customer.id || index}`}
                  style={styles.simpleListItem}
                  onPress={() => navigation.navigate('Contacts' as any, { customerId: customer.id })}
                >
                  <Text style={styles.simpleListName}>{customer.name}</Text>
                  <Text style={styles.simpleListAmount}>{formatCurrency(parseFloat(customer.total_revenue) || 0)}</Text>
                </TouchableOpacity>
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
        <TouchableOpacity
          style={styles.kibanaKpiCard}
          onPress={() => navigation.navigate('Sales' as any)}
        >
          <Text style={styles.kibanaKpiLabel}>Revenu Total</Text>
          <Text style={styles.kibanaKpiValue}>{formatCurrency(dashboardData.totalRevenue)}</Text>
          <View style={styles.kibanaKpiTrend}>
            <TrendingUpIcon size={12} color="#34C759" />
            <Text style={styles.kibanaKpiTrendText}>
              {forecasting ? `${forecasting.growth_rate >= 0 ? '+' : ''}${forecasting.growth_rate.toFixed(1)}%` : '+0%'}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.kibanaKpiCard}
          onPress={() => navigation.navigate('Sales' as any)}
        >
          <Text style={styles.kibanaKpiLabel}>Sales Count</Text>
          <Text style={styles.kibanaKpiValue}>{formatNumber(dashboardData.totalSales)}</Text>
          <View style={styles.kibanaKpiTrend}>
            <TrendingUpIcon size={12} color="#34C759" />
            <Text style={styles.kibanaKpiTrendText}>
              {activitySummary ? `${activitySummary.invoices_this_week || 0} cette semaine` : '+0%'}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.kibanaKpiCard}
          onPress={() => navigation.navigate('Pipeline' as any)}
        >
          <Text style={styles.kibanaKpiLabel}>Valeur Pipeline</Text>
          <Text style={styles.kibanaKpiValue}>{formatCurrency(quickStats.pipelineValue)}</Text>
          <View style={styles.kibanaKpiTrend}>
            <TrendingUpIcon size={12} color="#34C759" />
            <Text style={styles.kibanaKpiTrendText}>{quickStats.pipelineCount} devis</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.kibanaKpiCard}
          onPress={() => navigation.navigate('Analytics' as any)}
        >
          <Text style={styles.kibanaKpiLabel}>Taux de Conversion</Text>
          <Text style={styles.kibanaKpiValue}>{quotesStats.rate.toFixed(1)}%</Text>
          <View style={styles.kibanaKpiTrend}>
            {forecasting && forecasting.conversion_rate > 0.5 ? (
              <TrendingUpIcon size={12} color="#34C759" />
            ) : (
              <TrendingDownIcon size={12} color="#FF3B30" />
            )}
            <Text style={[styles.kibanaKpiTrendText, forecasting && forecasting.conversion_rate <= 0.5 && { color: '#FF3B30' }]}>
              {forecasting ? `${(forecasting.conversion_rate * 100).toFixed(1)}%` : 'N/A'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Layout 2 Colonnes - Style Kibana */}
      <View style={styles.twoColumnContainer}>
        {/* Colonne Gauche */}
        <View style={styles.leftColumn}>
          {/* Graphique Pipeline */}
          <View style={styles.kibanaPanel}>
            <View style={styles.kibanaPanelHeader}>
              <Text style={styles.kibanaPanelTitle}>Étapes du Pipeline</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Pipeline' as any)}>
                <Text style={styles.seeAllText}>Voir →</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.kibanaPanelContent}>
              {pipelineStages.map((stage, index) => (
                <TouchableOpacity
                  key={stage.id}
                  style={styles.kibanaBarItem}
                  onPress={() => navigation.navigate('Invoices' as any)}
                >
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
                  <Text style={styles.kibanaBarCount}>{stage.count} devis</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Table de données */}
          <View style={styles.kibanaPanel}>
            <Text style={styles.kibanaPanelTitle}>Meilleurs Clients par Revenu</Text>
            <View style={styles.kibanaTable}>
              <View style={styles.kibanaTableHeader}>
                <Text style={[styles.kibanaTableHeaderCell, { flex: 2 }]}>Client</Text>
                <Text style={styles.kibanaTableHeaderCell}>Ventes</Text>
                <Text style={[styles.kibanaTableHeaderCell, { textAlign: 'right' }]}>Revenu</Text>
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
                <Text style={styles.kibanaMetricSubtext}>ce mois-ci</Text>
              </View>

              <View style={styles.kibanaMetricItem}>
                <View style={styles.kibanaMetricHeader}>
                  <CheckCircleIcon size={16} color="#00BFB3" />
                  <Text style={styles.kibanaMetricTitle}>Tâches</Text>
                </View>
                <Text style={styles.kibanaMetricNumber}>{quickStats.tasksPending}</Text>
                <Text style={styles.kibanaMetricSubtext}>{quickStats.tasksOverdue} en retard</Text>
              </View>

              <View style={styles.kibanaMetricItem}>
                <View style={styles.kibanaMetricHeader}>
                  <FileTextIcon size={16} color="#D36086" />
                  <Text style={styles.kibanaMetricTitle}>Factures</Text>
                </View>
                <Text style={styles.kibanaMetricNumber}>{quickStats.invoicesPending}</Text>
                <Text style={styles.kibanaMetricSubtext}>{formatCurrency(quickStats.invoicesPendingValue)}</Text>
              </View>
            </View>
          </View>

          {/* Timeline - Recent Activity */}
          <View style={styles.kibanaPanel}>
            <Text style={styles.kibanaPanelTitle}>Activité Récente</Text>
            <View style={styles.kibanaTimeline}>
              {dashboardData.recentSales.slice(0, 6).map((activity: any, index: number) => (
                <View key={`timeline-${activity.type}-${activity.id || index}`} style={styles.kibanaTimelineItem}>
                  <View style={styles.kibanaTimelineDot} />
                  <View style={styles.kibanaTimelineContent}>
                    <Text style={styles.kibanaTimelineTitle}>
                      {activity.type === 'sale' && 'Vente créée'}
                      {activity.type === 'quote' && 'Devis généré'}
                      {activity.type === 'customer' && 'Client ajouté'}
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
    backgroundColor: '#f0f4f8',
    // Mesh gradient background effect via CSS on web
    ...(isWeb ? {
      background: `
        radial-gradient(at 20% 20%, rgba(99, 102, 241, 0.15) 0px, transparent 50%),
        radial-gradient(at 80% 10%, rgba(236, 72, 153, 0.12) 0px, transparent 50%),
        radial-gradient(at 10% 80%, rgba(6, 182, 212, 0.1) 0px, transparent 50%),
        radial-gradient(at 90% 90%, rgba(139, 92, 246, 0.1) 0px, transparent 50%),
        linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)
      `,
    } : {}),
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    // Transparent glass effect
    ...(isWeb ? {
      backgroundColor: 'rgba(255, 255, 255, 0.25)',
      backdropFilter: 'blur(20px) saturate(180%)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.15)',
      boxShadow: '0 4px 30px rgba(0, 0, 0, 0.08)',
    } : {
      backgroundColor: 'rgba(255, 255, 255, 0.85)',
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(0, 0, 0, 0.05)',
    }),
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  modeToggle: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    // Glass button effect
    ...(isWeb ? {
      background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
      boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.3)',
    } : {
      backgroundColor: '#6366f1',
    }),
  },
  modeToggleText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  mainScroll: {
    flex: 1,
  },
  contentPadding: {
    padding: 20,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    ...(isWeb ? {
      background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
    } : {
      backgroundColor: '#f8fafc',
    }),
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
  errorText: {
    fontSize: 15,
    color: '#ef4444',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
    fontWeight: '500',
  },
  retryButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 16,
    ...(isWeb ? {
      background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
      boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)',
    } : {
      backgroundColor: '#6366f1',
    }),
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },

  // SIMPLE MODE STYLES - Ultra Glass Design
  simpleMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
  },
  simpleMetricCard: {
    flex: 1,
    minWidth: (width / 2) - 28,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    // Transparent glass effect
    ...(isWeb ? {
      backgroundColor: 'rgba(255, 255, 255, 0.25)',
      backdropFilter: 'blur(24px) saturate(180%)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      boxShadow: `
        0 8px 32px rgba(0, 0, 0, 0.1),
        0 2px 8px rgba(0, 0, 0, 0.05),
        inset 0 1px 1px rgba(255, 255, 255, 0.3)
      `,
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    } : {
      backgroundColor: 'rgba(255, 255, 255, 0.85)',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.1,
      shadowRadius: 32,
      elevation: 8,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.3)',
    }),
  },
  simpleMetricValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 16,
    marginBottom: 6,
    letterSpacing: -1.5,
  },
  simpleMetricLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  simpleSection: {
    marginBottom: 24,
  },
  simpleSectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  simpleActivityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.04)',
  },
  simpleActivityIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  simpleActivityContent: {
    flex: 1,
  },
  simpleActivityTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 3,
  },
  simpleActivityTime: {
    fontSize: 13,
    color: '#94a3b8',
  },
  simpleListItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.04)',
  },
  simpleListName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
    flex: 1,
  },
  simpleListAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10b981',
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
  kibanaPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    borderRadius: 24,
    padding: 20,
    // Transparent glass card effect
    ...(isWeb ? {
      backgroundColor: 'rgba(255, 255, 255, 0.25)',
      backdropFilter: 'blur(24px) saturate(180%)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      boxShadow: `
        0 8px 32px rgba(0, 0, 0, 0.1),
        0 2px 8px rgba(0, 0, 0, 0.05),
        inset 0 1px 1px rgba(255, 255, 255, 0.3)
      `,
    } : {
      backgroundColor: 'rgba(255, 255, 255, 0.85)',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.1,
      shadowRadius: 32,
      elevation: 8,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.3)',
    }),
  },
  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    paddingVertical: 20,
    fontWeight: '500',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  seeAllText: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '600',
  },
  actionableItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  priorityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  itemSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
  },
  itemAmount: {
    fontSize: 15,
    fontWeight: '600',
    color: '#34C759',
  },
  quickActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rankText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  funnelStep: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
  },
  funnelStepInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  funnelStepLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1C1C1E',
  },
  funnelStepValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  funnelArrow: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  funnelArrowText: {
    fontSize: 18,
    color: '#8E8E93',
  },
  conversionRate: {
    marginTop: 12,
    padding: 8,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    alignItems: 'center',
  },
  conversionRateText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#34C759',
  },
  forecastRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  forecastItem: {
    flex: 1,
    padding: 12,
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
  },
  forecastLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  forecastValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  forecastSubtext: {
    fontSize: 11,
    color: '#8E8E93',
  },
  positiveGrowth: {
    color: '#34C759',
  },
  negativeGrowth: {
    color: '#FF3B30',
  },
  topCustomerHighlight: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#FFF9E6',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  topCustomerLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 4,
  },
  topCustomerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  topCustomerValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF9500',
  },
  notificationBadge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minWidth: 26,
    alignItems: 'center',
    justifyContent: 'center',
    ...(isWeb ? {
      background: 'linear-gradient(135deg, #ef4444 0%, #f87171 100%)',
      boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)',
    } : {
      backgroundColor: '#ef4444',
    }),
  },
  notificationBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  notificationItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#94a3b8',
    ...(isWeb ? {
      backgroundColor: 'rgba(255, 255, 255, 0.5)',
      backdropFilter: 'blur(20px)',
    } : {
      backgroundColor: 'rgba(249, 250, 251, 0.95)',
    }),
  },
  notificationItemHigh: {
    borderLeftColor: '#ef4444',
    ...(isWeb ? {
      backgroundColor: 'rgba(254, 226, 226, 0.6)',
    } : {
      backgroundColor: 'rgba(254, 226, 226, 0.95)',
    }),
  },
  notificationItemMedium: {
    borderLeftColor: '#f59e0b',
    ...(isWeb ? {
      backgroundColor: 'rgba(254, 243, 199, 0.6)',
    } : {
      backgroundColor: 'rgba(254, 243, 199, 0.95)',
    }),
  },
  notificationHeader: {
    marginBottom: 8,
  },
  notificationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  notificationDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#94a3b8',
    marginRight: 10,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
  },
  priorityBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    ...(isWeb ? {
      background: 'linear-gradient(135deg, #ef4444 0%, #f87171 100%)',
    } : {
      backgroundColor: '#ef4444',
    }),
  },
  priorityBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  notificationMessage: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
  },
  notificationActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  notificationActionButton: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    ...(isWeb ? {
      background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
      boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
    } : {
      backgroundColor: '#6366f1',
    }),
  },
  notificationActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  notificationViewAll: {
    paddingVertical: 10,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    marginTop: 4,
  },
  notificationViewAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#007AFF',
  },
});
