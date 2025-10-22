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
import { ChartIcon, TrendingUpIcon, DollarIcon, UsersIcon, FileTextIcon } from '../components/Icons';

type AnalyticsScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Analytics'>;
};

const { width } = Dimensions.get('window');
const chartWidth = width - 48;

export default function AnalyticsScreen({ navigation }: AnalyticsScreenProps) {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month');

  // Données simulées pour les graphiques
  const revenueData = [
    { label: 'Jan', value: 45000 },
    { label: 'Fév', value: 52000 },
    { label: 'Mar', value: 48000 },
    { label: 'Avr', value: 61000 },
    { label: 'Mai', value: 55000 },
    { label: 'Jun', value: 67000 },
  ];

  const salesData = [
    { label: 'Lun', value: 12 },
    { label: 'Mar', value: 19 },
    { label: 'Mer', value: 15 },
    { label: 'Jeu', value: 22 },
    { label: 'Ven', value: 18 },
    { label: 'Sam', value: 8 },
    { label: 'Dim', value: 5 },
  ];

  const pipelineData = [
    { label: 'Prospect', value: 15000, count: 8, color: '#8E8E93' },
    { label: 'Qualifié', value: 25000, count: 12, color: '#5856D6' },
    { label: 'Proposition', value: 45000, count: 9, color: '#007AFF' },
    { label: 'Négociation', value: 35000, count: 6, color: '#FF9500' },
    { label: 'Gagné', value: 67000, count: 14, color: '#34C759' },
    { label: 'Perdu', value: 22000, count: 11, color: '#FF3B30' },
  ];

  const conversionData = [
    { label: 'Leads', value: 150, color: '#8E8E93' },
    { label: 'Prospects', value: 87, color: '#5856D6' },
    { label: 'Opportunités', value: 45, color: '#007AFF' },
    { label: 'Clients', value: 28, color: '#34C759' },
  ];

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getMaxValue = (data: any[]) => {
    return Math.max(...data.map(d => d.value));
  };

  const renderBarChart = (data: any[], maxValue: number, showCurrency: boolean = false) => {
    return (
      <View style={styles.chartContainer}>
        <View style={styles.barsContainer}>
          {data.map((item, index) => {
            const height = (item.value / maxValue) * 150;
            return (
              <View key={index} style={styles.barWrapper}>
                <View style={styles.barColumn}>
                  <Text style={styles.barValue}>
                    {showCurrency ? formatCurrency(item.value) : item.value}
                  </Text>
                  <View style={styles.barContainer}>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: height,
                          backgroundColor: item.color || '#007AFF',
                        },
                      ]}
                    />
                  </View>
                </View>
                <Text style={styles.barLabel}>{item.label}</Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderFunnelChart = (data: any[]) => {
    const maxValue = data[0].value;
    return (
      <View style={styles.funnelContainer}>
        {data.map((item, index) => {
          const widthPercentage = (item.value / maxValue) * 100;
          const conversionRate = index > 0 ? ((item.value / data[index - 1].value) * 100).toFixed(1) : '100.0';
          
          return (
            <View key={index} style={styles.funnelItem}>
              <View style={styles.funnelHeader}>
                <Text style={styles.funnelLabel}>{item.label}</Text>
                <View style={styles.funnelStats}>
                  <Text style={styles.funnelValue}>{item.value}</Text>
                  {index > 0 && (
                    <Text style={styles.funnelRate}>({conversionRate}%)</Text>
                  )}
                </View>
              </View>
              <View style={styles.funnelBarContainer}>
                <View
                  style={[
                    styles.funnelBar,
                    {
                      width: `${widthPercentage}%`,
                      backgroundColor: item.color,
                    },
                  ]}
                />
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#007AFF" />
      }
    >
      {/* En-tête */}
      <View style={styles.header}>
        <Text style={styles.title}>Analytics & Rapports</Text>
        <Text style={styles.subtitle}>Analyse détaillée de vos performances</Text>
      </View>

      {/* Sélecteur de Période */}
      <View style={styles.periodSelector}>
        {(['week', 'month', 'quarter', 'year'] as const).map((period) => (
          <TouchableOpacity
            key={period}
            style={[
              styles.periodButton,
              selectedPeriod === period && styles.periodButtonActive,
            ]}
            onPress={() => setSelectedPeriod(period)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.periodButtonText,
                selectedPeriod === period && styles.periodButtonTextActive,
              ]}
            >
              {period === 'week' && 'Semaine'}
              {period === 'month' && 'Mois'}
              {period === 'quarter' && 'Trimestre'}
              {period === 'year' && 'Année'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Chiffre d'Affaires */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <DollarIcon size={20} color="#34C759" />
            <Text style={styles.sectionTitle}>Chiffre d'Affaires</Text>
          </View>
          <TouchableOpacity>
            <Text style={styles.seeAllText}>Détails</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.card}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Évolution mensuelle</Text>
            <View style={styles.chartLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#34C759' }]} />
                <Text style={styles.legendText}>Revenue</Text>
              </View>
            </View>
          </View>
          {renderBarChart(revenueData, getMaxValue(revenueData), true)}
          <View style={styles.chartFooter}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Total</Text>
              <Text style={styles.statValue}>
                {formatCurrency(revenueData.reduce((sum, item) => sum + item.value, 0))}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Moyenne</Text>
              <Text style={styles.statValue}>
                {formatCurrency(
                  revenueData.reduce((sum, item) => sum + item.value, 0) / revenueData.length
                )}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Meilleur</Text>
              <Text style={[styles.statValue, { color: '#34C759' }]}>
                {formatCurrency(Math.max(...revenueData.map(d => d.value)))}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Ventes */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <ChartIcon size={20} color="#007AFF" />
            <Text style={styles.sectionTitle}>Ventes</Text>
          </View>
          <TouchableOpacity>
            <Text style={styles.seeAllText}>Détails</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.card}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Cette semaine</Text>
            <View style={styles.chartLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#007AFF' }]} />
                <Text style={styles.legendText}>Transactions</Text>
              </View>
            </View>
          </View>
          {renderBarChart(salesData, getMaxValue(salesData), false)}
          <View style={styles.chartFooter}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Total</Text>
              <Text style={styles.statValue}>
                {salesData.reduce((sum, item) => sum + item.value, 0)}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Moy/jour</Text>
              <Text style={styles.statValue}>
                {(salesData.reduce((sum, item) => sum + item.value, 0) / salesData.length).toFixed(1)}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Record</Text>
              <Text style={[styles.statValue, { color: '#007AFF' }]}>
                {Math.max(...salesData.map(d => d.value))}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Pipeline */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <TrendingUpIcon size={20} color="#FF9500" />
            <Text style={styles.sectionTitle}>Pipeline de Ventes</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('Pipeline')}>
            <Text style={styles.seeAllText}>Voir tout</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.card}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Répartition par étape</Text>
            <Text style={styles.chartSubtitle}>
              Total: {formatCurrency(pipelineData.reduce((sum, item) => sum + item.value, 0))}
            </Text>
          </View>
          {renderBarChart(pipelineData, getMaxValue(pipelineData), true)}
          <View style={styles.pipelineSummary}>
            <View style={styles.pipelineStatRow}>
              <Text style={styles.pipelineStatLabel}>Opportunités actives:</Text>
              <Text style={styles.pipelineStatValue}>
                {pipelineData.slice(0, 4).reduce((sum, item) => sum + item.count, 0)}
              </Text>
            </View>
            <View style={styles.pipelineStatRow}>
              <Text style={styles.pipelineStatLabel}>Taux de conversion:</Text>
              <Text style={[styles.pipelineStatValue, { color: '#34C759' }]}>
                {((pipelineData[4].count / (pipelineData[4].count + pipelineData[5].count)) * 100).toFixed(1)}%
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Tunnel de Conversion */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <UsersIcon size={20} color="#5856D6" />
            <Text style={styles.sectionTitle}>Tunnel de Conversion</Text>
          </View>
        </View>
        <View style={styles.card}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Du lead au client</Text>
            <Text style={styles.chartSubtitle}>
              Taux global: {((conversionData[3].value / conversionData[0].value) * 100).toFixed(1)}%
            </Text>
          </View>
          {renderFunnelChart(conversionData)}
        </View>
      </View>

      {/* KPIs */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>INDICATEURS CLÉS</Text>
        <View style={styles.kpiGrid}>
          <View style={styles.kpiCard}>
            <View style={[styles.kpiIcon, { backgroundColor: '#E8F5E9' }]}>
              <DollarIcon size={24} color="#34C759" />
            </View>
            <Text style={styles.kpiValue}>24.5k €</Text>
            <Text style={styles.kpiLabel}>Panier moyen</Text>
            <View style={styles.kpiTrend}>
              <TrendingUpIcon size={12} color="#34C759" />
              <Text style={[styles.kpiTrendText, { color: '#34C759' }]}>+12%</Text>
            </View>
          </View>

          <View style={styles.kpiCard}>
            <View style={[styles.kpiIcon, { backgroundColor: '#E3F2FD' }]}>
              <ChartIcon size={24} color="#007AFF" />
            </View>
            <Text style={styles.kpiValue}>67%</Text>
            <Text style={styles.kpiLabel}>Taux de clôture</Text>
            <View style={styles.kpiTrend}>
              <TrendingUpIcon size={12} color="#007AFF" />
              <Text style={[styles.kpiTrendText, { color: '#007AFF' }]}>+5%</Text>
            </View>
          </View>

          <View style={styles.kpiCard}>
            <View style={[styles.kpiIcon, { backgroundColor: '#FFF3E0' }]}>
              <FileTextIcon size={24} color="#FF9500" />
            </View>
            <Text style={styles.kpiValue}>18 jours</Text>
            <Text style={styles.kpiLabel}>Cycle de vente</Text>
            <View style={styles.kpiTrend}>
              <Text style={[styles.kpiTrendText, { color: '#34C759' }]}>↓ -3j</Text>
            </View>
          </View>

          <View style={styles.kpiCard}>
            <View style={[styles.kpiIcon, { backgroundColor: '#F3E5F5' }]}>
              <UsersIcon size={24} color="#5856D6" />
            </View>
            <Text style={styles.kpiValue}>42%</Text>
            <Text style={styles.kpiLabel}>Rétention client</Text>
            <View style={styles.kpiTrend}>
              <TrendingUpIcon size={12} color="#5856D6" />
              <Text style={[styles.kpiTrendText, { color: '#5856D6' }]}>+8%</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingHorizontal: 24,
    paddingBottom: 24,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -1,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 17,
    color: '#8E8E93',
    fontWeight: '400',
    letterSpacing: -0.4,
  },
  periodSelector: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 8,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  periodButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    letterSpacing: -0.2,
  },
  periodButtonTextActive: {
    color: '#FFFFFF',
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    letterSpacing: -0.1,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.5,
  },
  seeAllText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#007AFF',
    letterSpacing: -0.2,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  chartHeader: {
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
    letterSpacing: -0.4,
  },
  chartSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '400',
    letterSpacing: -0.2,
  },
  chartLegend: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '400',
  },
  chartContainer: {
    marginVertical: 12,
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 4,
  },
  barWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  barColumn: {
    alignItems: 'center',
    width: '100%',
  },
  barValue: {
    fontSize: 11,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 6,
    letterSpacing: -0.1,
  },
  barContainer: {
    width: '100%',
    height: 150,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: '80%',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 8,
    fontWeight: '500',
    letterSpacing: -0.1,
  },
  chartFooter: {
    flexDirection: 'row',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: '100%',
    backgroundColor: '#E5E5EA',
  },
  statLabel: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '400',
    marginBottom: 4,
    letterSpacing: -0.1,
  },
  statValue: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.4,
  },
  pipelineSummary: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
    gap: 8,
  },
  pipelineStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pipelineStatLabel: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '400',
    letterSpacing: -0.2,
  },
  pipelineStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.3,
  },
  funnelContainer: {
    gap: 16,
  },
  funnelItem: {
    gap: 8,
  },
  funnelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  funnelLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
    letterSpacing: -0.2,
  },
  funnelStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  funnelValue: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.4,
  },
  funnelRate: {
    fontSize: 14,
    color: '#34C759',
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  funnelBarContainer: {
    height: 32,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    overflow: 'hidden',
  },
  funnelBar: {
    height: '100%',
    borderRadius: 8,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  kpiCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    width: (width - 60) / 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  kpiIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  kpiValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
    letterSpacing: -0.6,
  },
  kpiLabel: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '400',
    marginBottom: 8,
    letterSpacing: -0.1,
  },
  kpiTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  kpiTrendText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
});
