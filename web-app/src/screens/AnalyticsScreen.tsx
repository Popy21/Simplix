import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
  FlatList,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { TrendingUpIcon, TrendingDownIcon, UsersIcon } from '../components/Icons';
import Navigation from '../components/Navigation';

type AnalyticsScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Dashboard'>;
};

interface ChartData {
  label: string;
  value: number;
  percentage: number;
  trend?: number;
}

interface KPICard {
  title: string;
  value: string | number;
  unit?: string;
  trend?: number;
  trendLabel?: string;
  backgroundColor: string;
}

const { width } = Dimensions.get('window');

export default function AnalyticsScreen({ navigation }: AnalyticsScreenProps) {
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const [revenueData, setRevenueData] = useState<ChartData[]>([]);
  const [conversionData, setConversionData] = useState<ChartData[]>([]);
  const [kpis, setKpis] = useState<KPICard[]>([]);

  useEffect(() => {
    loadAnalyticsData();
  }, [period]);

  const loadAnalyticsData = () => {
    // Revenue by Product
    const revenue: ChartData[] = [
      { label: 'CRM Premium', value: 125000, percentage: 45 },
      { label: 'Integration', value: 75000, percentage: 27 },
      { label: 'Support', value: 45000, percentage: 16 },
      { label: 'Training', value: 22000, percentage: 8 },
    ];

    // Sales Pipeline Conversion
    const conversion: ChartData[] = [
      { label: 'Prospection', value: 150, percentage: 100 },
      { label: 'Qualification', value: 95, percentage: 63 },
      { label: 'Proposition', value: 58, percentage: 39 },
      { label: 'Négociation', value: 32, percentage: 21 },
      { label: 'Signée', value: 12, percentage: 8 },
    ];

    // KPIs
    const kpiCards: KPICard[] = [
      {
        title: 'Revenu Total',
        value: '267K€',
        trend: 12,
        trendLabel: 'vs mois précédent',
        backgroundColor: '#34C75920',
      },
      {
        title: 'Deals Gagnés',
        value: 12,
        unit: 'deals',
        trend: 8,
        trendLabel: 'vs mois précédent',
        backgroundColor: '#007AFF20',
      },
      {
        title: 'Taux de Conversion',
        value: '21%',
        trend: -2,
        trendLabel: 'vs mois précédent',
        backgroundColor: '#FF950020',
      },
      {
        title: 'Valeur Moyenne Deal',
        value: '22.2K€',
        trend: 5,
        trendLabel: 'vs mois précédent',
        backgroundColor: '#5856D620',
      },
    ];

    setRevenueData(revenue);
    setConversionData(conversion);
    setKpis(kpiCards);
  };

  const getTotalRevenue = () => {
    return revenueData.reduce((sum, item) => sum + item.value, 0);
  };

  const renderBarChart = (data: ChartData[], title: string, color: string) => {
    const maxValue = Math.max(...data.map(d => d.value));

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>{title}</Text>
        <View style={styles.barChartContent}>
          {data.map((item, index) => (
            <View key={index} style={styles.barRow}>
              <Text style={styles.barLabel}>{item.label}</Text>
              <View style={styles.barWrapper}>
                <View
                  style={[
                    styles.bar,
                    {
                      width: `${(item.value / maxValue) * 100}%`,
                      backgroundColor: color,
                    },
                  ]}
                />
              </View>
              <View style={styles.barValue}>
                <Text style={styles.barValueText}>
                  {item.percentage}%
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Legend */}
        <View style={styles.chartLegend}>
          {data.map((item, index) => (
            <View key={index} style={styles.legendItem}>
              <View
                style={[
                  styles.legendDot,
                  { backgroundColor: `${color}${Math.round((100 - index * 15)).toString(16).padStart(2, '0')}` },
                ]}
              />
              <Text style={styles.legendLabel}>
                {item.label}: {(item.value / 1000).toFixed(0)}k
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderFunnelChart = (data: ChartData[]) => {
    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Pipeline Conversion Funnel</Text>
        <View style={styles.funnelContent}>
          {data.map((item, index) => (
            <View key={index} style={styles.funnelStage}>
              <View
                style={[
                  styles.funnelBar,
                  {
                    width: `${item.percentage}%`,
                    backgroundColor: `rgba(0, 122, 255, ${1 - index * 0.15})`,
                  },
                ]}
              >
                <Text style={styles.funnelLabel}>
                  {item.label}
                </Text>
              </View>
              <Text style={styles.funnelValue}>
                {item.value} deals ({item.percentage}%)
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderKPICard = (kpi: KPICard, index: number) => (
    <TouchableOpacity key={index} style={[styles.kpiCard, { backgroundColor: kpi.backgroundColor }]}>
      <Text style={styles.kpiTitle}>{kpi.title}</Text>
      <View style={styles.kpiContent}>
        <Text style={styles.kpiValue}>{kpi.value}</Text>
        {kpi.unit && <Text style={styles.kpiUnit}>{kpi.unit}</Text>}
      </View>
      {kpi.trend && (
        <View style={styles.kpiTrend}>
          {kpi.trend > 0 ? (
            <TrendingUpIcon size={14} color="#34C759" />
          ) : (
            <TrendingDownIcon size={14} color="#FF3B30" />
          )}
          <Text style={[styles.kpiTrendValue, { color: kpi.trend > 0 ? '#34C759' : '#FF3B30' }]}>
            {Math.abs(kpi.trend)}%
          </Text>
          <Text style={styles.kpiTrendLabel}>{kpi.trendLabel}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Navigation />
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📊 Analytics</Text>
        <Text style={styles.headerSubtitle}>Tableau de bord des performances</Text>
      </View>

      {/* Period Selector */}
      <View style={styles.periodSelector}>
        {['week', 'month', 'quarter', 'year'].map(p => (
          <TouchableOpacity
            key={p}
            style={[
              styles.periodButton,
              period === p && styles.periodButtonActive,
            ]}
            onPress={() => setPeriod(p as typeof period)}
          >
            <Text
              style={[
                styles.periodButtonText,
                period === p && styles.periodButtonTextActive,
              ]}
            >
              {p === 'week' ? 'Semaine' : p === 'month' ? 'Mois' : p === 'quarter' ? 'Trimestre' : 'Année'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* KPI Cards */}
        <View style={styles.kpiGrid}>
          {kpis.map((kpi, index) => renderKPICard(kpi, index))}
        </View>

        {/* Revenue Chart */}
        {renderBarChart(revenueData, 'Revenu par Produit', '#34C759')}

        {/* Conversion Funnel */}
        {renderFunnelChart(conversionData)}

        {/* Performance Metrics */}
        <View style={styles.metricsContainer}>
          <Text style={styles.chartTitle}>Métriques de Performance</Text>

          <View style={styles.metricRow}>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Temps Cycle Moyen</Text>
              <Text style={styles.metricValue}>42 jours</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Taille Deal Moyenne</Text>
              <Text style={styles.metricValue}>22.2K€</Text>
            </View>
          </View>

          <View style={styles.metricRow}>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Win Rate</Text>
              <Text style={styles.metricValue}>32%</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Forecast vs Réel</Text>
              <Text style={styles.metricValue}>+12%</Text>
            </View>
          </View>
        </View>

        {/* Top Performers */}
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Top Commerciaux</Text>
          <View style={styles.performersList}>
            {[
              { name: 'Sophie Durand', deals: 8, revenue: 156000 },
              { name: 'Laurent Michel', deals: 6, revenue: 89000 },
              { name: 'Pierre Leroy', deals: 4, revenue: 58000 },
              { name: 'Marie Martin', deals: 3, revenue: 32000 },
            ].map((performer, index) => (
              <View key={index} style={styles.performerCard}>
                <View style={styles.performerRank}>
                  <Text style={styles.performerRankText}>{index + 1}</Text>
                </View>
                <View style={styles.performerInfo}>
                  <Text style={styles.performerName}>{performer.name}</Text>
                  <Text style={styles.performerStats}>
                    {performer.deals} deals • {(performer.revenue / 1000).toFixed(0)}k€
                  </Text>
                </View>
                <View>
                  <Text style={styles.medalIcon}>
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '⭐'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Export Section */}
        <View style={styles.exportSection}>
          <TouchableOpacity style={styles.exportButton}>
            <Text style={styles.exportIcon}>📥</Text>
            <Text style={styles.exportText}>Exporter PDF</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.exportButton}>
            <Text style={styles.exportIcon}>📧</Text>
            <Text style={styles.exportText}>Envoyer Par Email</Text>
          </TouchableOpacity>
        </View>
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
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#007AFF',
  },
  periodButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
  },
  periodButtonTextActive: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  kpiGrid: {
    gap: 8,
    marginBottom: 16,
  },
  kpiCard: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 14,
    marginBottom: 8,
  },
  kpiTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 6,
  },
  kpiContent: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  kpiValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
  },
  kpiUnit: {
    fontSize: 12,
    color: '#8E8E93',
    marginLeft: 4,
  },
  kpiTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  kpiTrendValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  kpiTrendLabel: {
    fontSize: 10,
    color: '#8E8E93',
  },
  chartContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 12,
  },
  barChartContent: {
    gap: 12,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  barLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#000000',
    width: 100,
  },
  barWrapper: {
    flex: 1,
    height: 24,
    backgroundColor: '#F2F2F7',
    borderRadius: 4,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: 4,
  },
  barValue: {
    width: 40,
    alignItems: 'flex-end',
  },
  barValueText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#000000',
  },
  chartLegend: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
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
  legendLabel: {
    fontSize: 11,
    color: '#8E8E93',
  },
  funnelContent: {
    gap: 12,
  },
  funnelStage: {
    alignItems: 'center',
  },
  funnelBar: {
    minHeight: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  funnelLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  funnelValue: {
    fontSize: 11,
    color: '#8E8E93',
  },
  metricsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  metricRow: {
    flexDirection: 'row',
    gap: 8,
  },
  metricBox: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 14,
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 11,
    color: '#8E8E93',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
  },
  performersList: {
    gap: 8,
  },
  performerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    gap: 8,
  },
  performerRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  performerRankText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  performerInfo: {
    flex: 1,
  },
  performerName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 2,
  },
  performerStats: {
    fontSize: 11,
    color: '#8E8E93',
  },
  performerMedal: {
    fontSize: 16,
  },
  medalIcon: {
    fontSize: 16,
  },
  scoringDistribution: {
    gap: 12,
  },
  scoringItem: {
    marginBottom: 8,
  },
  scoringHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  scoringDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  scoringLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000000',
  },
  scoringBar: {
    height: 16,
    backgroundColor: '#F2F2F7',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  scoringBarFill: {
    height: '100%',
  },
  scoringCount: {
    fontSize: 11,
    color: '#8E8E93',
  },
  exportSection: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  exportButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 12,
    gap: 6,
  },
  exportIcon: {
    fontSize: 16,
  },
  exportText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
