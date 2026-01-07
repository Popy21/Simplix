import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  RefreshControl,
  Platform,
} from 'react-native';
import { api } from '../services/api';
import { BarChartIcon, TrendingUpIcon, DollarIcon, UsersIcon, FileTextIcon, XCircleIcon } from '../components/Icons';

const { width } = Dimensions.get('window');

interface KPI {
  id: string;
  name: string;
  value: number;
  previousValue: number;
  target: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  isFavorable: boolean;
}

interface RevenueProjection {
  date: string;
  projectedRevenue: number;
  actualRevenue: number;
  projectedProfit: number;
  actualProfit: number;
  confidence: number;
}

export default function PilotageScreen() {
  const [loading, setLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month');

  // KPIs
  const [kpis, setKpis] = useState<KPI[]>([]);

  // Revenue & Profit
  const [revenue, setRevenue] = useState({
    current: 0,
    projected: 0,
    lastPeriod: 0,
    growth: 0,
  });

  const [profit, setProfit] = useState({
    current: 0,
    projected: 0,
    margin: 0,
  });

  // Cash flow
  const [cashFlow, setCashFlow] = useState({
    incoming: 0,
    outgoing: 0,
    balance: 0,
  });

  // Invoices metrics
  const [invoicesMetrics, setInvoicesMetrics] = useState({
    total: 0,
    paid: 0,
    pending: 0,
    overdue: 0,
    averagePaymentDelay: 0,
  });

  // Customer metrics
  const [customerMetrics, setCustomerMetrics] = useState({
    total: 0,
    new: 0,
    active: 0,
    averageValue: 0,
  });

  // Projections
  const [projections, setProjections] = useState<RevenueProjection[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, [selectedPeriod]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch all dashboard data
      await Promise.all([
        fetchKPIs(),
        fetchRevenueData(),
        fetchCashFlow(),
        fetchInvoicesMetrics(),
        fetchCustomerMetrics(),
        fetchProjections(),
      ]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchKPIs = async () => {
    try {
      const response = await api.get(`/dashboard/kpis?period=${selectedPeriod}`);
      setKpis(response.data || []);
    } catch (error) {
      console.error('Error fetching KPIs:', error);
    }
  };

  const fetchRevenueData = async () => {
    try {
      const response = await api.get(`/dashboard/revenue?period=${selectedPeriod}`);
      setRevenue(response.data || { current: 0, projected: 0, lastPeriod: 0, growth: 0 });
      setProfit(response.data?.profit || { current: 0, projected: 0, margin: 0 });
    } catch (error) {
      console.error('Error fetching revenue:', error);
    }
  };

  const fetchCashFlow = async () => {
    try {
      const response = await api.get(`/dashboard/cashflow?period=${selectedPeriod}`);
      setCashFlow(response.data || { incoming: 0, outgoing: 0, balance: 0 });
    } catch (error) {
      console.error('Error fetching cash flow:', error);
    }
  };

  const fetchInvoicesMetrics = async () => {
    try {
      const response = await api.get(`/dashboard/invoices-metrics?period=${selectedPeriod}`);
      setInvoicesMetrics(response.data || { total: 0, paid: 0, pending: 0, overdue: 0, averagePaymentDelay: 0 });
    } catch (error) {
      console.error('Error fetching invoices metrics:', error);
    }
  };

  const fetchCustomerMetrics = async () => {
    try {
      const response = await api.get(`/dashboard/customer-metrics?period=${selectedPeriod}`);
      setCustomerMetrics(response.data || { total: 0, new: 0, active: 0, averageValue: 0 });
    } catch (error) {
      console.error('Error fetching customer metrics:', error);
    }
  };

  const fetchProjections = async () => {
    try {
      const response = await api.get(`/dashboard/projections?period=${selectedPeriod}`);
      setProjections(response.data || []);
    } catch (error) {
      console.error('Error fetching projections:', error);
    }
  };

  const getTrendColor = (trend: 'up' | 'down' | 'stable', isFavorable: boolean) => {
    if (trend === 'stable') return '#8E8E93';
    if (trend === 'up') return isFavorable ? '#34C759' : '#FF3B30';
    return isFavorable ? '#FF3B30' : '#34C759';
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const renderPeriodSelector = () => (
    <View style={styles.periodSelector}>
      {['week', 'month', 'quarter', 'year'].map((period) => (
        <TouchableOpacity
          key={period}
          style={[styles.periodButton, selectedPeriod === period && styles.periodButtonActive]}
          onPress={() => setSelectedPeriod(period as any)}
        >
          <Text style={[styles.periodButtonText, selectedPeriod === period && styles.periodButtonTextActive]}>
            {period === 'week' ? 'Semaine' : period === 'month' ? 'Mois' : period === 'quarter' ? 'Trimestre' : 'Année'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderKPICard = (kpi: KPI) => {
    const percentChange = kpi.previousValue ? ((kpi.value - kpi.previousValue) / kpi.previousValue) * 100 : 0;
    const trend = percentChange > 5 ? 'up' : percentChange < -5 ? 'down' : 'stable';

    return (
      <View key={kpi.id} style={styles.kpiCard}>
        <Text style={styles.kpiName}>{kpi.name}</Text>
        <View style={styles.kpiValueRow}>
          <Text style={styles.kpiValue}>
            {kpi.unit === '€' ? formatCurrency(kpi.value) : `${kpi.value}${kpi.unit}`}
          </Text>
          <View style={[styles.kpiTrend, { backgroundColor: getTrendColor(trend, kpi.isFavorable) }]}>
            <Text style={styles.kpiTrendText}>{formatPercentage(percentChange)}</Text>
          </View>
        </View>
        {kpi.target > 0 && (
          <View style={styles.kpiProgress}>
            <View style={styles.kpiProgressBar}>
              <View
                style={[
                  styles.kpiProgressFill,
                  { width: `${Math.min((kpi.value / kpi.target) * 100, 100)}%` },
                ]}
              />
            </View>
            <Text style={styles.kpiTarget}>Objectif: {kpi.unit === '€' ? formatCurrency(kpi.target) : `${kpi.target}${kpi.unit}`}</Text>
          </View>
        )}
      </View>
    );
  };

  const renderRevenueCard = () => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <DollarIcon size={24} color="#007AFF" />
        <Text style={styles.cardTitle}>Chiffre d'affaires</Text>
      </View>
      <View style={styles.revenueGrid}>
        <View style={styles.revenueItem}>
          <Text style={styles.revenueLabel}>Réalisé</Text>
          <Text style={styles.revenueValue}>{formatCurrency(revenue.current)}</Text>
        </View>
        <View style={styles.revenueItem}>
          <Text style={styles.revenueLabel}>Projeté</Text>
          <Text style={[styles.revenueValue, { color: '#007AFF' }]}>{formatCurrency(revenue.projected)}</Text>
        </View>
        <View style={styles.revenueItem}>
          <Text style={styles.revenueLabel}>Période précédente</Text>
          <Text style={styles.revenueValue}>{formatCurrency(revenue.lastPeriod)}</Text>
        </View>
        <View style={styles.revenueItem}>
          <Text style={styles.revenueLabel}>Croissance</Text>
          <Text style={[styles.revenueValue, { color: revenue.growth >= 0 ? '#34C759' : '#FF3B30' }]}>
            {formatPercentage(revenue.growth)}
          </Text>
        </View>
      </View>
    </View>
  );

  const renderProfitCard = () => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <TrendingUpIcon size={24} color="#34C759" />
        <Text style={styles.cardTitle}>Résultat</Text>
      </View>
      <View style={styles.profitRow}>
        <View style={styles.profitItem}>
          <Text style={styles.profitLabel}>Résultat actuel</Text>
          <Text style={[styles.profitValue, { color: profit.current >= 0 ? '#34C759' : '#FF3B30' }]}>
            {formatCurrency(profit.current)}
          </Text>
        </View>
        <View style={styles.profitItem}>
          <Text style={styles.profitLabel}>Marge</Text>
          <Text style={styles.profitValue}>{profit.margin.toFixed(1)}%</Text>
        </View>
      </View>
    </View>
  );

  const renderCashFlowCard = () => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <BarChartIcon size={24} color="#FF9500" />
        <Text style={styles.cardTitle}>Trésorerie</Text>
      </View>
      <View style={styles.cashFlowRow}>
        <View style={styles.cashFlowItem}>
          <Text style={styles.cashFlowLabel}>Encaissements</Text>
          <Text style={[styles.cashFlowValue, { color: '#34C759' }]}>{formatCurrency(cashFlow.incoming)}</Text>
        </View>
        <View style={styles.cashFlowItem}>
          <Text style={styles.cashFlowLabel}>Décaissements</Text>
          <Text style={[styles.cashFlowValue, { color: '#FF3B30' }]}>{formatCurrency(cashFlow.outgoing)}</Text>
        </View>
        <View style={styles.cashFlowItem}>
          <Text style={styles.cashFlowLabel}>Solde</Text>
          <Text style={[styles.cashFlowValue, { fontWeight: 'bold', color: cashFlow.balance >= 0 ? '#007AFF' : '#FF3B30' }]}>
            {formatCurrency(cashFlow.balance)}
          </Text>
        </View>
      </View>
    </View>
  );

  const renderInvoicesCard = () => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <FileTextIcon size={24} color="#5856D6" />
        <Text style={styles.cardTitle}>Factures</Text>
      </View>
      <View style={styles.invoicesGrid}>
        <View style={styles.invoiceMetric}>
          <Text style={styles.invoiceMetricValue}>{invoicesMetrics.total}</Text>
          <Text style={styles.invoiceMetricLabel}>Total</Text>
        </View>
        <View style={styles.invoiceMetric}>
          <Text style={[styles.invoiceMetricValue, { color: '#34C759' }]}>{invoicesMetrics.paid}</Text>
          <Text style={styles.invoiceMetricLabel}>Payées</Text>
        </View>
        <View style={styles.invoiceMetric}>
          <Text style={[styles.invoiceMetricValue, { color: '#FF9500' }]}>{invoicesMetrics.pending}</Text>
          <Text style={styles.invoiceMetricLabel}>En attente</Text>
        </View>
        <View style={styles.invoiceMetric}>
          <Text style={[styles.invoiceMetricValue, { color: '#FF3B30' }]}>{invoicesMetrics.overdue}</Text>
          <Text style={styles.invoiceMetricLabel}>En retard</Text>
        </View>
      </View>
      {invoicesMetrics.averagePaymentDelay > 0 && (
        <View style={styles.paymentDelayBanner}>
          <XCircleIcon size={16} color="#FF9500" />
          <Text style={styles.paymentDelayText}>
            Délai moyen de paiement: {invoicesMetrics.averagePaymentDelay} jours
          </Text>
        </View>
      )}
    </View>
  );

  const renderCustomersCard = () => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <UsersIcon size={24} color="#FF2D55" />
        <Text style={styles.cardTitle}>Clients</Text>
      </View>
      <View style={styles.customersGrid}>
        <View style={styles.customerMetric}>
          <Text style={styles.customerMetricValue}>{customerMetrics.total}</Text>
          <Text style={styles.customerMetricLabel}>Total</Text>
        </View>
        <View style={styles.customerMetric}>
          <Text style={[styles.customerMetricValue, { color: '#34C759' }]}>{customerMetrics.new}</Text>
          <Text style={styles.customerMetricLabel}>Nouveaux</Text>
        </View>
        <View style={styles.customerMetric}>
          <Text style={[styles.customerMetricValue, { color: '#007AFF' }]}>{customerMetrics.active}</Text>
          <Text style={styles.customerMetricLabel}>Actifs</Text>
        </View>
        <View style={styles.customerMetric}>
          <Text style={styles.customerMetricValue}>{formatCurrency(customerMetrics.averageValue)}</Text>
          <Text style={styles.customerMetricLabel}>Panier moyen</Text>
        </View>
      </View>
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchDashboardData} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Tableau de pilotage</Text>
        <Text style={styles.subtitle}>Vue d'ensemble de votre activité</Text>
      </View>

      {renderPeriodSelector()}

      {/* Main KPIs Grid */}
      <View style={styles.kpisContainer}>
        {kpis.slice(0, 4).map(renderKPICard)}
      </View>

      {/* Revenue & Profit */}
      {renderRevenueCard()}
      {renderProfitCard()}

      {/* Cash Flow */}
      {renderCashFlowCard()}

      {/* Invoices */}
      {renderInvoicesCard()}

      {/* Customers */}
      {renderCustomersCard()}

      {/* Projections section */}
      {projections.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <TrendingUpIcon size={24} color="#007AFF" />
            <Text style={styles.cardTitle}>Projections</Text>
          </View>
          <Text style={styles.projectionsText}>
            Projections pour les {projections.length} prochaines périodes basées sur vos données actuelles
          </Text>
          {/* TODO: Add chart visualization here */}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  contentContainer: {
    padding: 16,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: '#8E8E93',
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  periodButtonActive: {
    backgroundColor: '#007AFF',
  },
  periodButtonText: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  periodButtonTextActive: {
    color: '#FFFFFF',
  },
  kpisContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
    marginBottom: 12,
  },
  kpiCard: {
    width: width / 2 - 28,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    margin: 6,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      },
    }),
  },
  kpiName: {
    fontSize: 13,
    color: '#8E8E93',
    marginBottom: 8,
  },
  kpiValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  kpiValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    flex: 1,
  },
  kpiTrend: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  kpiTrendText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  kpiProgress: {
    marginTop: 4,
  },
  kpiProgressBar: {
    height: 4,
    backgroundColor: '#E5E5EA',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  kpiProgressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
  },
  kpiTarget: {
    fontSize: 11,
    color: '#8E8E93',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginLeft: 8,
  },
  revenueGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  revenueItem: {
    width: '50%',
    marginBottom: 16,
  },
  revenueLabel: {
    fontSize: 13,
    color: '#8E8E93',
    marginBottom: 4,
  },
  revenueValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  profitRow: {
    flexDirection: 'row',
  },
  profitItem: {
    flex: 1,
  },
  profitLabel: {
    fontSize: 13,
    color: '#8E8E93',
    marginBottom: 4,
  },
  profitValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  cashFlowRow: {
    flexDirection: 'row',
  },
  cashFlowItem: {
    flex: 1,
  },
  cashFlowLabel: {
    fontSize: 13,
    color: '#8E8E93',
    marginBottom: 4,
  },
  cashFlowValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  invoicesGrid: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  invoiceMetric: {
    flex: 1,
    alignItems: 'center',
  },
  invoiceMetricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  invoiceMetricLabel: {
    fontSize: 12,
    color: '#8E8E93',
  },
  paymentDelayBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3CD',
    padding: 12,
    borderRadius: 8,
  },
  paymentDelayText: {
    fontSize: 13,
    color: '#856404',
    marginLeft: 8,
  },
  customersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  customerMetric: {
    width: '50%',
    marginBottom: 16,
  },
  customerMetricValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  customerMetricLabel: {
    fontSize: 13,
    color: '#8E8E93',
  },
  projectionsText: {
    fontSize: 14,
    color: '#8E8E93',
  },
});
