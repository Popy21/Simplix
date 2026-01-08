import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { cashflowService, dashboardService } from '../services/api';
import GlassLayout from '../components/GlassLayout';
import { GlassLoadingState, GlassChart } from '../components/ui';

const { width } = Dimensions.get('window');

interface CashflowData {
  month: string;
  income: number;
  expenses: number;
  balance: number;
}

interface Summary {
  currentBalance: number;
  projectedBalance: number;
  totalIncome: number;
  totalExpenses: number;
  pendingInvoices: number;
  pendingExpenses: number;
}

const CashflowScreen = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<'3' | '6' | '12'>('6');
  const [forecast, setForecast] = useState<CashflowData[]>([]);
  const [summary, setSummary] = useState<Summary>({
    currentBalance: 0,
    projectedBalance: 0,
    totalIncome: 0,
    totalExpenses: 0,
    pendingInvoices: 0,
    pendingExpenses: 0,
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [forecastRes, summaryRes] = await Promise.all([
        cashflowService.getForecast({ months: parseInt(period) }),
        cashflowService.getSummary(),
      ]);

      const forecastData = forecastRes.data.forecast || forecastRes.data || [];
      setForecast(forecastData);

      if (summaryRes.data) {
        setSummary({
          currentBalance: summaryRes.data.current_balance || 0,
          projectedBalance: summaryRes.data.projected_balance || forecastData[forecastData.length - 1]?.balance || 0,
          totalIncome: summaryRes.data.total_income || forecastData.reduce((s: number, d: CashflowData) => s + d.income, 0),
          totalExpenses: summaryRes.data.total_expenses || forecastData.reduce((s: number, d: CashflowData) => s + d.expenses, 0),
          pendingInvoices: summaryRes.data.pending_invoices || 0,
          pendingExpenses: summaryRes.data.pending_expenses || 0,
        });
      }
    } catch (error) {
      console.error('Failed to load cashflow data', error);
      // Use mock data for demo
      const mockData: CashflowData[] = [];
      const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
      const now = new Date();
      let balance = 15000;

      for (let i = 0; i < parseInt(period); i++) {
        const date = new Date(now.getFullYear(), now.getMonth() + i);
        const income = 8000 + Math.random() * 4000;
        const expenses = 5000 + Math.random() * 3000;
        balance += income - expenses;
        mockData.push({
          month: months[date.getMonth()],
          income,
          expenses,
          balance,
        });
      }
      setForecast(mockData);
      setSummary({
        currentBalance: 15000,
        projectedBalance: balance,
        totalIncome: mockData.reduce((s, d) => s + d.income, 0),
        totalExpenses: mockData.reduce((s, d) => s + d.expenses, 0),
        pendingInvoices: 12500,
        pendingExpenses: 4200,
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

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount);

  const getBalanceColor = (current: number, projected: number) => {
    if (projected < 0) return '#EF4444';
    if (projected < current * 0.5) return '#F59E0B';
    return '#10B981';
  };

  const balanceColor = getBalanceColor(summary.currentBalance, summary.projectedBalance);

  return (
    <GlassLayout>
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.title}>Trésorerie</Text>
        <Text style={styles.subtitle}>
          Prévision et suivi de votre trésorerie
        </Text>

        {loading ? (
          <GlassLoadingState message="Chargement des données..." />
        ) : (
          <>
            {/* Main KPIs */}
            <View style={styles.mainKpiRow}>
              <View style={styles.mainKpiCard}>
                <Text style={styles.mainKpiLabel}>Solde actuel</Text>
                <Text style={[styles.mainKpiValue, { color: summary.currentBalance >= 0 ? '#10B981' : '#EF4444' }]}>
                  {formatCurrency(summary.currentBalance)}
                </Text>
              </View>
              <View style={styles.mainKpiCard}>
                <Text style={styles.mainKpiLabel}>Solde projeté ({period} mois)</Text>
                <Text style={[styles.mainKpiValue, { color: balanceColor }]}>
                  {formatCurrency(summary.projectedBalance)}
                </Text>
              </View>
            </View>

            {/* Period Selector */}
            <View style={styles.periodRow}>
              {(['3', '6', '12'] as const).map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[styles.periodButton, period === p && styles.periodButtonActive]}
                  onPress={() => setPeriod(p)}
                >
                  <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
                    {p} mois
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Chart */}
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Évolution de la trésorerie</Text>
              <View style={styles.chartContainer}>
                {forecast.map((item, index) => {
                  const maxValue = Math.max(...forecast.map(f => Math.max(f.income, f.expenses)));
                  const incomeHeight = (item.income / maxValue) * 100;
                  const expenseHeight = (item.expenses / maxValue) * 100;
                  return (
                    <View key={index} style={styles.chartBar}>
                      <View style={styles.barGroup}>
                        <View style={[styles.bar, styles.incomeBar, { height: `${incomeHeight}%` }]} />
                        <View style={[styles.bar, styles.expenseBar, { height: `${expenseHeight}%` }]} />
                      </View>
                      <Text style={styles.chartLabel}>{item.month}</Text>
                    </View>
                  );
                })}
              </View>
              <View style={styles.legend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
                  <Text style={styles.legendText}>Encaissements</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
                  <Text style={styles.legendText}>Décaissements</Text>
                </View>
              </View>
            </View>

            {/* Balance Evolution */}
            <View style={styles.balanceCard}>
              <Text style={styles.balanceTitle}>Solde mensuel</Text>
              {forecast.map((item, index) => (
                <View key={index} style={styles.balanceRow}>
                  <Text style={styles.balanceMonth}>{item.month}</Text>
                  <View style={styles.balanceProgress}>
                    <View
                      style={[
                        styles.balanceBar,
                        {
                          width: `${Math.min(100, (item.balance / summary.projectedBalance) * 100)}%`,
                          backgroundColor: item.balance >= 0 ? '#10B981' : '#EF4444',
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.balanceAmount, { color: item.balance >= 0 ? '#10B981' : '#EF4444' }]}>
                    {formatCurrency(item.balance)}
                  </Text>
                </View>
              ))}
            </View>

            {/* Pending Items */}
            <View style={styles.pendingRow}>
              <View style={styles.pendingCard}>
                <Text style={styles.pendingLabel}>Factures à encaisser</Text>
                <Text style={[styles.pendingValue, { color: '#10B981' }]}>
                  +{formatCurrency(summary.pendingInvoices)}
                </Text>
                <Text style={styles.pendingHint}>En attente de paiement</Text>
              </View>
              <View style={styles.pendingCard}>
                <Text style={styles.pendingLabel}>Dépenses à payer</Text>
                <Text style={[styles.pendingValue, { color: '#EF4444' }]}>
                  -{formatCurrency(summary.pendingExpenses)}
                </Text>
                <Text style={styles.pendingHint}>Factures fournisseurs</Text>
              </View>
            </View>

            {/* Summary */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Résumé période</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total encaissements</Text>
                <Text style={[styles.summaryValue, { color: '#10B981' }]}>
                  +{formatCurrency(summary.totalIncome)}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total décaissements</Text>
                <Text style={[styles.summaryValue, { color: '#EF4444' }]}>
                  -{formatCurrency(summary.totalExpenses)}
                </Text>
              </View>
              <View style={[styles.summaryRow, styles.summaryTotal]}>
                <Text style={styles.summaryTotalLabel}>Variation nette</Text>
                <Text
                  style={[
                    styles.summaryTotalValue,
                    { color: summary.totalIncome - summary.totalExpenses >= 0 ? '#10B981' : '#EF4444' },
                  ]}
                >
                  {summary.totalIncome - summary.totalExpenses >= 0 ? '+' : ''}
                  {formatCurrency(summary.totalIncome - summary.totalExpenses)}
                </Text>
              </View>
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

  mainKpiRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  mainKpiCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  mainKpiLabel: { fontSize: 12, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 },
  mainKpiValue: { fontSize: 24, fontWeight: '700', marginTop: 8 },

  periodRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
  },
  periodButtonActive: { backgroundColor: '#0F172A' },
  periodText: { fontSize: 14, fontWeight: '600', color: '#64748B' },
  periodTextActive: { color: '#FFFFFF' },

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
  chartTitle: { fontSize: 16, fontWeight: '600', color: '#0F172A', marginBottom: 20 },
  chartContainer: { flexDirection: 'row', justifyContent: 'space-between', height: 150, alignItems: 'flex-end' },
  chartBar: { alignItems: 'center', flex: 1 },
  barGroup: { flexDirection: 'row', alignItems: 'flex-end', height: '100%', gap: 2 },
  bar: { width: 12, borderRadius: 4 },
  incomeBar: { backgroundColor: '#10B981' },
  expenseBar: { backgroundColor: '#EF4444' },
  chartLabel: { fontSize: 10, color: '#64748B', marginTop: 8 },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 24, marginTop: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, color: '#64748B' },

  balanceCard: {
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
  balanceTitle: { fontSize: 16, fontWeight: '600', color: '#0F172A', marginBottom: 16 },
  balanceRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  balanceMonth: { width: 40, fontSize: 12, fontWeight: '600', color: '#64748B' },
  balanceProgress: { flex: 1, height: 8, backgroundColor: '#F1F5F9', borderRadius: 4, marginHorizontal: 12 },
  balanceBar: { height: '100%', borderRadius: 4 },
  balanceAmount: { width: 80, fontSize: 12, fontWeight: '600', textAlign: 'right' },

  pendingRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  pendingCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  pendingLabel: { fontSize: 12, color: '#64748B', marginBottom: 8 },
  pendingValue: { fontSize: 18, fontWeight: '700' },
  pendingHint: { fontSize: 11, color: '#94A3B8', marginTop: 4 },

  summaryCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 4,
  },
  summaryTitle: { fontSize: 16, fontWeight: '600', color: '#FFFFFF', marginBottom: 16 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 },
  summaryLabel: { fontSize: 14, color: '#94A3B8' },
  summaryValue: { fontSize: 14, fontWeight: '600' },
  summaryTotal: { borderTopWidth: 1, borderTopColor: '#334155', marginTop: 8, paddingTop: 16 },
  summaryTotalLabel: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  summaryTotalValue: { fontSize: 18, fontWeight: '700' },
});

export default CashflowScreen;
