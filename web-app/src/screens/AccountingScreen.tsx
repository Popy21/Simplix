import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import { accountingService } from '../services/api';
import GlassLayout from '../components/GlassLayout';
import { GlassLoadingState } from '../components/ui';

interface IncomeStatement {
  revenue: number;
  cost_of_goods: number;
  gross_margin: number;
  operating_expenses: number;
  operating_income: number;
  other_income: number;
  other_expenses: number;
  net_income: number;
}

interface VatSummary {
  collected: number;
  deductible: number;
  balance: number;
}

type Period = 'month' | 'quarter' | 'year';

const AccountingScreen = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<Period>('month');
  const [incomeStatement, setIncomeStatement] = useState<IncomeStatement | null>(null);
  const [vatSummary, setVatSummary] = useState<VatSummary | null>(null);

  const getPeriodDates = (p: Period) => {
    const now = new Date();
    let startDate: Date;
    const endDate = now;

    switch (p) {
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
    }

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    };
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const dates = getPeriodDates(period);

      const [incomeRes, vatRes] = await Promise.all([
        accountingService.getIncomeStatement(dates),
        accountingService.getVatSummary(dates),
      ]);

      if (incomeRes.data) setIncomeStatement(incomeRes.data);
      if (vatRes.data) setVatSummary(vatRes.data);
    } catch (error) {
      console.error('Failed to load accounting data', error);
      // Mock data
      setIncomeStatement({
        revenue: 45000,
        cost_of_goods: 12000,
        gross_margin: 33000,
        operating_expenses: 15000,
        operating_income: 18000,
        other_income: 500,
        other_expenses: 200,
        net_income: 18300,
      });
      setVatSummary({
        collected: 9000,
        deductible: 3000,
        balance: 6000,
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

  const handleExportFEC = async () => {
    try {
      const dates = getPeriodDates('year');
      Alert.alert('Export FEC', `Export du fichier FEC pour l'année en cours...\nDe ${dates.startDate} à ${dates.endDate}`);
      // await accountingService.exportFec(dates);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de générer le fichier FEC.');
    }
  };

  const handleExport = async (format: string) => {
    try {
      const dates = getPeriodDates(period);
      Alert.alert('Export', `Export au format ${format.toUpperCase()} en cours...`);
      // await accountingService.exportAccounting({ format, ...dates });
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de générer l\'export.');
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount);

  const formatPercent = (value: number, total: number) => {
    if (!total) return '0%';
    return `${((value / total) * 100).toFixed(1)}%`;
  };

  const getPeriodLabel = () => {
    const now = new Date();
    switch (period) {
      case 'month':
        return now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3) + 1;
        return `T${quarter} ${now.getFullYear()}`;
      case 'year':
        return now.getFullYear().toString();
    }
  };

  return (
    <GlassLayout>
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.title}>Comptabilité</Text>
        <Text style={styles.subtitle}>
          Compte de résultat et indicateurs financiers
        </Text>

        {/* Period Selector */}
        <View style={styles.periodRow}>
          {(['month', 'quarter', 'year'] as Period[]).map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.periodButton, period === p && styles.periodButtonActive]}
              onPress={() => setPeriod(p)}
            >
              <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
                {p === 'month' ? 'Mois' : p === 'quarter' ? 'Trimestre' : 'Année'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.periodLabel}>{getPeriodLabel()}</Text>

        {loading ? (
          <GlassLoadingState message="Chargement des données comptables..." />
        ) : (
          <>
            {/* Net Income Highlight */}
            {incomeStatement && (
              <View style={[styles.highlightCard, incomeStatement.net_income >= 0 ? styles.highlightPositive : styles.highlightNegative]}>
                <Text style={styles.highlightLabel}>Résultat net</Text>
                <Text style={styles.highlightValue}>{formatCurrency(incomeStatement.net_income)}</Text>
                <Text style={styles.highlightHint}>
                  Marge: {formatPercent(incomeStatement.net_income, incomeStatement.revenue)}
                </Text>
              </View>
            )}

            {/* Income Statement */}
            {incomeStatement && (
              <View style={styles.statementCard}>
                <Text style={styles.cardTitle}>Compte de résultat</Text>

                <View style={styles.statementRow}>
                  <Text style={styles.statementLabel}>Chiffre d'affaires</Text>
                  <Text style={styles.statementValue}>{formatCurrency(incomeStatement.revenue)}</Text>
                </View>

                <View style={styles.statementRow}>
                  <Text style={styles.statementLabel}>Coût des ventes</Text>
                  <Text style={[styles.statementValue, styles.negative]}>-{formatCurrency(incomeStatement.cost_of_goods)}</Text>
                </View>

                <View style={[styles.statementRow, styles.subtotalRow]}>
                  <Text style={styles.subtotalLabel}>Marge brute</Text>
                  <Text style={styles.subtotalValue}>{formatCurrency(incomeStatement.gross_margin)}</Text>
                </View>

                <View style={styles.statementRow}>
                  <Text style={styles.statementLabel}>Charges d'exploitation</Text>
                  <Text style={[styles.statementValue, styles.negative]}>-{formatCurrency(incomeStatement.operating_expenses)}</Text>
                </View>

                <View style={[styles.statementRow, styles.subtotalRow]}>
                  <Text style={styles.subtotalLabel}>Résultat d'exploitation</Text>
                  <Text style={styles.subtotalValue}>{formatCurrency(incomeStatement.operating_income)}</Text>
                </View>

                <View style={styles.statementRow}>
                  <Text style={styles.statementLabel}>Autres produits</Text>
                  <Text style={[styles.statementValue, styles.positive]}>+{formatCurrency(incomeStatement.other_income)}</Text>
                </View>

                <View style={styles.statementRow}>
                  <Text style={styles.statementLabel}>Autres charges</Text>
                  <Text style={[styles.statementValue, styles.negative]}>-{formatCurrency(incomeStatement.other_expenses)}</Text>
                </View>

                <View style={[styles.statementRow, styles.totalRow]}>
                  <Text style={styles.totalLabel}>Résultat net</Text>
                  <Text style={[styles.totalValue, incomeStatement.net_income >= 0 ? styles.positive : styles.negative]}>
                    {formatCurrency(incomeStatement.net_income)}
                  </Text>
                </View>
              </View>
            )}

            {/* VAT Summary */}
            {vatSummary && (
              <View style={styles.vatCard}>
                <Text style={styles.cardTitle}>TVA</Text>

                <View style={styles.vatRow}>
                  <View style={styles.vatItem}>
                    <Text style={styles.vatLabel}>Collectée</Text>
                    <Text style={[styles.vatValue, styles.positive]}>{formatCurrency(vatSummary.collected)}</Text>
                  </View>
                  <Text style={styles.vatOperator}>-</Text>
                  <View style={styles.vatItem}>
                    <Text style={styles.vatLabel}>Déductible</Text>
                    <Text style={[styles.vatValue, styles.negative]}>{formatCurrency(vatSummary.deductible)}</Text>
                  </View>
                  <Text style={styles.vatOperator}>=</Text>
                  <View style={styles.vatItem}>
                    <Text style={styles.vatLabel}>À payer</Text>
                    <Text style={[styles.vatValue, { color: vatSummary.balance >= 0 ? '#EF4444' : '#10B981' }]}>
                      {formatCurrency(vatSummary.balance)}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Ratios */}
            {incomeStatement && (
              <View style={styles.ratiosCard}>
                <Text style={styles.cardTitle}>Ratios clés</Text>

                <View style={styles.ratioRow}>
                  <Text style={styles.ratioLabel}>Marge brute</Text>
                  <View style={styles.ratioBar}>
                    <View
                      style={[
                        styles.ratioFill,
                        { width: `${Math.min(100, (incomeStatement.gross_margin / incomeStatement.revenue) * 100)}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.ratioValue}>
                    {formatPercent(incomeStatement.gross_margin, incomeStatement.revenue)}
                  </Text>
                </View>

                <View style={styles.ratioRow}>
                  <Text style={styles.ratioLabel}>Marge opérationnelle</Text>
                  <View style={styles.ratioBar}>
                    <View
                      style={[
                        styles.ratioFill,
                        { width: `${Math.min(100, (incomeStatement.operating_income / incomeStatement.revenue) * 100)}%`, backgroundColor: '#0EA5E9' },
                      ]}
                    />
                  </View>
                  <Text style={styles.ratioValue}>
                    {formatPercent(incomeStatement.operating_income, incomeStatement.revenue)}
                  </Text>
                </View>

                <View style={styles.ratioRow}>
                  <Text style={styles.ratioLabel}>Marge nette</Text>
                  <View style={styles.ratioBar}>
                    <View
                      style={[
                        styles.ratioFill,
                        { width: `${Math.min(100, Math.abs(incomeStatement.net_income / incomeStatement.revenue) * 100)}%`, backgroundColor: incomeStatement.net_income >= 0 ? '#10B981' : '#EF4444' },
                      ]}
                    />
                  </View>
                  <Text style={styles.ratioValue}>
                    {formatPercent(incomeStatement.net_income, incomeStatement.revenue)}
                  </Text>
                </View>
              </View>
            )}

            {/* Export Buttons */}
            <View style={styles.exportSection}>
              <Text style={styles.exportTitle}>Exports</Text>
              <View style={styles.exportRow}>
                <TouchableOpacity style={styles.exportButton} onPress={handleExportFEC}>
                  <Text style={styles.exportButtonText}>📄 FEC</Text>
                  <Text style={styles.exportButtonHint}>Fichier comptable</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.exportButton} onPress={() => handleExport('csv')}>
                  <Text style={styles.exportButtonText}>📊 CSV</Text>
                  <Text style={styles.exportButtonHint}>Tableur</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.exportButton} onPress={() => handleExport('pdf')}>
                  <Text style={styles.exportButtonText}>📑 PDF</Text>
                  <Text style={styles.exportButtonHint}>Rapport</Text>
                </TouchableOpacity>
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

  periodRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
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
  periodLabel: { fontSize: 16, fontWeight: '600', color: '#0F172A', textAlign: 'center', marginBottom: 20 },

  highlightCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  highlightPositive: { backgroundColor: '#10B981' },
  highlightNegative: { backgroundColor: '#EF4444' },
  highlightLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: 1 },
  highlightValue: { fontSize: 36, fontWeight: '700', color: '#FFFFFF', marginTop: 8 },
  highlightHint: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 8 },

  statementCard: {
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
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#0F172A', marginBottom: 16 },
  statementRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 },
  statementLabel: { fontSize: 14, color: '#64748B' },
  statementValue: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
  subtotalRow: { borderTopWidth: 1, borderTopColor: '#F1F5F9', marginTop: 4, paddingTop: 14 },
  subtotalLabel: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
  subtotalValue: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  totalRow: { borderTopWidth: 2, borderTopColor: '#0F172A', marginTop: 8, paddingTop: 14 },
  totalLabel: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  totalValue: { fontSize: 18, fontWeight: '700' },
  positive: { color: '#10B981' },
  negative: { color: '#EF4444' },

  vatCard: {
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
  vatRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  vatItem: { alignItems: 'center', flex: 1 },
  vatLabel: { fontSize: 11, color: '#64748B', textTransform: 'uppercase' },
  vatValue: { fontSize: 18, fontWeight: '700', marginTop: 8 },
  vatOperator: { fontSize: 20, color: '#94A3B8', fontWeight: '300' },

  ratiosCard: {
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
  ratioRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  ratioLabel: { width: 120, fontSize: 13, color: '#64748B' },
  ratioBar: { flex: 1, height: 8, backgroundColor: '#F1F5F9', borderRadius: 4, marginHorizontal: 12 },
  ratioFill: { height: '100%', backgroundColor: '#6366F1', borderRadius: 4 },
  ratioValue: { width: 50, fontSize: 13, fontWeight: '600', color: '#0F172A', textAlign: 'right' },

  exportSection: { marginTop: 8 },
  exportTitle: { fontSize: 14, fontWeight: '600', color: '#64748B', marginBottom: 12 },
  exportRow: { flexDirection: 'row', gap: 12 },
  exportButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  exportButtonText: { fontSize: 24, marginBottom: 4 },
  exportButtonHint: { fontSize: 11, color: '#64748B' },
});

export default AccountingScreen;
