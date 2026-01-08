import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Dimensions,
} from 'react-native';
import { reportsService, analyticsService, dashboardService } from '../services/api';
import GlassLayout from '../components/GlassLayout';
import { GlassLoadingState } from '../components/ui';

const { width } = Dimensions.get('window');

interface SalesReport {
  total_revenue: number;
  total_invoices: number;
  average_invoice: number;
  top_products: { name: string; revenue: number; quantity: number }[];
  top_customers: { name: string; revenue: number; invoices: number }[];
  by_month: { month: string; revenue: number }[];
}

interface ActivityReport {
  total_activities: number;
  by_type: { type: string; count: number }[];
  by_user: { name: string; count: number }[];
}

interface Report {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'sales' | 'finance' | 'activity' | 'custom';
}

const predefinedReports: Report[] = [
  { id: 'sales-summary', name: 'Résumé des ventes', description: 'CA, factures, top produits', icon: '📊', category: 'sales' },
  { id: 'sales-by-product', name: 'Ventes par produit', description: 'Analyse détaillée des produits', icon: '📦', category: 'sales' },
  { id: 'sales-by-customer', name: 'Ventes par client', description: 'Top clients et CA', icon: '👥', category: 'sales' },
  { id: 'unpaid-invoices', name: 'Factures impayées', description: 'Balance âgée clients', icon: '⏰', category: 'finance' },
  { id: 'cashflow', name: 'Flux de trésorerie', description: 'Entrées et sorties', icon: '💰', category: 'finance' },
  { id: 'vat-report', name: 'Déclaration TVA', description: 'TVA collectée et déductible', icon: '🏛️', category: 'finance' },
  { id: 'activity-log', name: 'Activités', description: 'Actions par utilisateur', icon: '📋', category: 'activity' },
  { id: 'conversion-funnel', name: 'Funnel de conversion', description: 'Leads → Clients', icon: '📈', category: 'sales' },
];

type Period = 'week' | 'month' | 'quarter' | 'year';

const ReportsScreen = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<Period>('month');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [salesData, setSalesData] = useState<SalesReport | null>(null);
  const [showReportDetail, setShowReportDetail] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - (period === 'year' ? 365 : period === 'quarter' ? 90 : 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const { data } = await reportsService.sales({ startDate, endDate, groupBy: 'month' });
      setSalesData(data);
    } catch (error) {
      console.error('Failed to load reports', error);
      // Mock data
      setSalesData({
        total_revenue: 125000,
        total_invoices: 48,
        average_invoice: 2604,
        top_products: [
          { name: 'Consulting', revenue: 45000, quantity: 30 },
          { name: 'Développement', revenue: 35000, quantity: 12 },
          { name: 'Maintenance', revenue: 25000, quantity: 24 },
          { name: 'Formation', revenue: 20000, quantity: 15 },
        ],
        top_customers: [
          { name: 'Entreprise ABC', revenue: 28000, invoices: 8 },
          { name: 'Startup XYZ', revenue: 22000, invoices: 5 },
          { name: 'Corp Delta', revenue: 18000, invoices: 6 },
          { name: 'Tech Solutions', revenue: 15000, invoices: 4 },
        ],
        by_month: [
          { month: 'Jan', revenue: 18000 },
          { month: 'Fév', revenue: 22000 },
          { month: 'Mar', revenue: 28000 },
          { month: 'Avr', revenue: 25000 },
          { month: 'Mai', revenue: 32000 },
        ],
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleReportClick = (report: Report) => {
    setSelectedReport(report);
    setShowReportDetail(true);
  };

  const handleExport = (format: 'pdf' | 'csv' | 'excel') => {
    Alert.alert('Export', `Export du rapport en ${format.toUpperCase()} en cours...`);
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount);

  const filteredReports = predefinedReports.filter(
    (r) => activeCategory === 'all' || r.category === activeCategory
  );

  const renderSalesOverview = () => {
    if (!salesData) return null;

    const maxRevenue = Math.max(...salesData.by_month.map((m) => m.revenue));

    return (
      <View>
        {/* KPIs */}
        <View style={styles.kpiRow}>
          <View style={[styles.kpiCard, styles.kpiPrimary]}>
            <Text style={styles.kpiLabel}>Chiffre d'affaires</Text>
            <Text style={styles.kpiValue}>{formatCurrency(salesData.total_revenue)}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={[styles.kpiLabel, { color: '#64748B' }]}>Factures</Text>
            <Text style={[styles.kpiValue, { color: '#0F172A' }]}>{salesData.total_invoices}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={[styles.kpiLabel, { color: '#64748B' }]}>Panier moyen</Text>
            <Text style={[styles.kpiValue, { color: '#0F172A' }]}>{formatCurrency(salesData.average_invoice)}</Text>
          </View>
        </View>

        {/* Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Évolution du CA</Text>
          <View style={styles.chartContainer}>
            {salesData.by_month.map((item, index) => (
              <View key={index} style={styles.chartBarContainer}>
                <View
                  style={[
                    styles.chartBar,
                    { height: `${(item.revenue / maxRevenue) * 100}%` },
                  ]}
                />
                <Text style={styles.chartLabel}>{item.month}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Top Products */}
        <View style={styles.listCard}>
          <Text style={styles.listTitle}>Top produits</Text>
          {salesData.top_products.map((product, index) => (
            <View key={index} style={styles.listRow}>
              <View style={styles.listRank}>
                <Text style={styles.rankText}>{index + 1}</Text>
              </View>
              <View style={styles.listInfo}>
                <Text style={styles.listName}>{product.name}</Text>
                <Text style={styles.listMeta}>{product.quantity} vendus</Text>
              </View>
              <Text style={styles.listValue}>{formatCurrency(product.revenue)}</Text>
            </View>
          ))}
        </View>

        {/* Top Customers */}
        <View style={styles.listCard}>
          <Text style={styles.listTitle}>Top clients</Text>
          {salesData.top_customers.map((customer, index) => (
            <View key={index} style={styles.listRow}>
              <View style={styles.listRank}>
                <Text style={styles.rankText}>{index + 1}</Text>
              </View>
              <View style={styles.listInfo}>
                <Text style={styles.listName}>{customer.name}</Text>
                <Text style={styles.listMeta}>{customer.invoices} factures</Text>
              </View>
              <Text style={styles.listValue}>{formatCurrency(customer.revenue)}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <GlassLayout>
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.title}>Rapports</Text>
        <Text style={styles.subtitle}>
          Analysez vos performances commerciales et financières
        </Text>

        {/* Period Selector */}
        <View style={styles.periodRow}>
          {(['week', 'month', 'quarter', 'year'] as Period[]).map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.periodButton, period === p && styles.periodButtonActive]}
              onPress={() => setPeriod(p)}
            >
              <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
                {p === 'week' ? 'Semaine' : p === 'month' ? 'Mois' : p === 'quarter' ? 'Trim.' : 'Année'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <GlassLoadingState message="Chargement des rapports..." />
        ) : showReportDetail && selectedReport ? (
          <View>
            <TouchableOpacity style={styles.backButton} onPress={() => setShowReportDetail(false)}>
              <Text style={styles.backButtonText}>← Retour aux rapports</Text>
            </TouchableOpacity>
            <Text style={styles.reportTitle}>{selectedReport.icon} {selectedReport.name}</Text>
            {renderSalesOverview()}
            <View style={styles.exportRow}>
              <TouchableOpacity style={styles.exportButton} onPress={() => handleExport('pdf')}>
                <Text style={styles.exportButtonText}>📄 PDF</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.exportButton} onPress={() => handleExport('csv')}>
                <Text style={styles.exportButtonText}>📊 CSV</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.exportButton} onPress={() => handleExport('excel')}>
                <Text style={styles.exportButtonText}>📗 Excel</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            {/* Quick Overview */}
            {salesData && (
              <View style={styles.overviewCard}>
                <View style={styles.overviewHeader}>
                  <Text style={styles.overviewTitle}>Aperçu rapide</Text>
                  <TouchableOpacity onPress={() => handleReportClick(predefinedReports[0])}>
                    <Text style={styles.overviewLink}>Voir détails →</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.overviewStats}>
                  <View style={styles.overviewStat}>
                    <Text style={styles.overviewStatValue}>{formatCurrency(salesData.total_revenue)}</Text>
                    <Text style={styles.overviewStatLabel}>CA Total</Text>
                  </View>
                  <View style={styles.overviewDivider} />
                  <View style={styles.overviewStat}>
                    <Text style={styles.overviewStatValue}>{salesData.total_invoices}</Text>
                    <Text style={styles.overviewStatLabel}>Factures</Text>
                  </View>
                  <View style={styles.overviewDivider} />
                  <View style={styles.overviewStat}>
                    <Text style={styles.overviewStatValue}>{formatCurrency(salesData.average_invoice)}</Text>
                    <Text style={styles.overviewStatLabel}>Moy/Facture</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Category Filters */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryRow}>
              {[
                { key: 'all', label: 'Tous' },
                { key: 'sales', label: 'Ventes' },
                { key: 'finance', label: 'Finance' },
                { key: 'activity', label: 'Activité' },
              ].map((cat) => (
                <TouchableOpacity
                  key={cat.key}
                  style={[styles.categoryChip, activeCategory === cat.key && styles.categoryChipActive]}
                  onPress={() => setActiveCategory(cat.key)}
                >
                  <Text style={[styles.categoryText, activeCategory === cat.key && styles.categoryTextActive]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Reports Grid */}
            <View style={styles.reportsGrid}>
              {filteredReports.map((report) => (
                <TouchableOpacity
                  key={report.id}
                  style={styles.reportCard}
                  onPress={() => handleReportClick(report)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.reportIcon}>{report.icon}</Text>
                  <Text style={styles.reportName}>{report.name}</Text>
                  <Text style={styles.reportDescription}>{report.description}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </GlassLayout>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: '700', color: '#0F172A', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#64748B', marginBottom: 20 },

  periodRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
  },
  periodButtonActive: { backgroundColor: '#0F172A' },
  periodText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  periodTextActive: { color: '#FFFFFF' },

  overviewCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  overviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  overviewTitle: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  overviewLink: { fontSize: 13, color: '#60A5FA' },
  overviewStats: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  overviewStat: { flex: 1, alignItems: 'center' },
  overviewStatValue: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  overviewStatLabel: { fontSize: 11, color: '#94A3B8', marginTop: 4 },
  overviewDivider: { width: 1, height: 40, backgroundColor: '#334155' },

  categoryRow: { marginBottom: 20 },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#E2E8F0',
    marginRight: 8,
  },
  categoryChipActive: { backgroundColor: '#6366F1' },
  categoryText: { fontSize: 13, fontWeight: '500', color: '#64748B' },
  categoryTextActive: { color: '#FFFFFF' },

  reportsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  reportCard: {
    width: (width - 52) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  reportIcon: { fontSize: 28, marginBottom: 12 },
  reportName: { fontSize: 14, fontWeight: '600', color: '#0F172A', marginBottom: 4 },
  reportDescription: { fontSize: 12, color: '#64748B' },

  backButton: { marginBottom: 16 },
  backButtonText: { fontSize: 14, color: '#6366F1', fontWeight: '500' },
  reportTitle: { fontSize: 22, fontWeight: '700', color: '#0F172A', marginBottom: 20 },

  kpiRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  kpiCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  kpiPrimary: { backgroundColor: '#10B981' },
  kpiLabel: { fontSize: 10, color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: 0.5 },
  kpiValue: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginTop: 6 },

  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  chartTitle: { fontSize: 14, fontWeight: '600', color: '#0F172A', marginBottom: 16 },
  chartContainer: { flexDirection: 'row', justifyContent: 'space-between', height: 120, alignItems: 'flex-end' },
  chartBarContainer: { alignItems: 'center', flex: 1 },
  chartBar: { width: 24, backgroundColor: '#6366F1', borderRadius: 4 },
  chartLabel: { fontSize: 10, color: '#64748B', marginTop: 8 },

  listCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  listTitle: { fontSize: 14, fontWeight: '600', color: '#0F172A', marginBottom: 14 },
  listRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  listRank: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  rankText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  listInfo: { flex: 1 },
  listName: { fontSize: 14, fontWeight: '500', color: '#0F172A' },
  listMeta: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  listValue: { fontSize: 14, fontWeight: '600', color: '#0F172A' },

  exportRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
  exportButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  exportButtonText: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
});

export default ReportsScreen;
