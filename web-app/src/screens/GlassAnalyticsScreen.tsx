import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { glassTheme } from '../theme/glassTheme';
import GlassCard from '../components/GlassCard';
import GlassLayout from '../components/GlassLayout';
import { chartRevealAnimation } from '../utils/animations';
import {
  TrendingUpIcon,
  TrendingDownIcon,
  DollarIcon,
  UsersIcon,
  TargetIcon,
  BriefcaseIcon,
  BarChartIcon,
  PieChartIcon,
  ChartIcon,
} from '../components/Icons';
import { api } from '../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type AnalyticsScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Analytics'>;
};

interface ChartData {
  label: string;
  value: number;
  percentage: number;
  color?: string;
}

interface TimeSeriesData {
  date: string;
  value: number;
}

interface KPIMetric {
  id: string;
  title: string;
  value: string | number;
  unit?: string;
  trend?: number;
  trendLabel: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  gradient: [string, string];
}

export default function GlassAnalyticsScreen({ navigation }: AnalyticsScreenProps) {
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const [loading, setLoading] = useState(true);

  // Analytics Data
  const [kpis, setKpis] = useState<KPIMetric[]>([]);
  const [revenueByProduct, setRevenueByProduct] = useState<ChartData[]>([]);
  const [conversionFunnel, setConversionFunnel] = useState<ChartData[]>([]);
  const [dealsByStage, setDealsByStage] = useState<ChartData[]>([]);
  const [topPerformers, setTopPerformers] = useState<any[]>([]);
  const [revenueTimeSeries, setRevenueTimeSeries] = useState<TimeSeriesData[]>([]);

  // Animation values for charts
  const chartAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadAnalyticsData();
  }, [period]);

  const loadAnalyticsData = async () => {
    setLoading(true);
    try {
      // Mock data - remplacer par vraies API calls

      // KPIs
      const kpiMetrics: KPIMetric[] = [
        {
          id: 'revenue',
          title: 'Chiffre d\'affaires',
          value: '267 450',
          unit: '€',
          trend: 12.5,
          trendLabel: 'vs mois précédent',
          icon: DollarIcon,
          gradient: ['#34C759', '#30D158'],
        },
        {
          id: 'deals',
          title: 'Deals gagnés',
          value: 24,
          trend: 8.3,
          trendLabel: 'vs mois précédent',
          icon: BriefcaseIcon,
          gradient: ['#007AFF', '#5AC8FA'],
        },
        {
          id: 'conversion',
          title: 'Taux de conversion',
          value: '21.5',
          unit: '%',
          trend: -2.1,
          trendLabel: 'vs mois précédent',
          icon: TargetIcon,
          gradient: ['#FF9500', '#FFCC00'],
        },
        {
          id: 'avg_deal',
          title: 'Valeur moyenne',
          value: '11 144',
          unit: '€',
          trend: 5.7,
          trendLabel: 'vs mois précédent',
          icon: ChartIcon,
          gradient: ['#5856D6', '#AF52DE'],
        },
      ];

      // Revenue by Product
      const revenue: ChartData[] = [
        { label: 'CRM Premium', value: 125000, percentage: 47, color: '#007AFF' },
        { label: 'Intégration', value: 75000, percentage: 28, color: '#5856D6' },
        { label: 'Support', value: 45000, percentage: 17, color: '#34C759' },
        { label: 'Formation', value: 22450, percentage: 8, color: '#FF9500' },
      ];

      // Conversion Funnel
      const funnel: ChartData[] = [
        { label: 'Prospection', value: 150, percentage: 100, color: '#007AFF' },
        { label: 'Qualification', value: 95, percentage: 63, color: '#5AC8FA' },
        { label: 'Proposition', value: 58, percentage: 39, color: '#5856D6' },
        { label: 'Négociation', value: 32, percentage: 21, color: '#AF52DE' },
        { label: 'Gagnée', value: 24, percentage: 16, color: '#34C759' },
      ];

      // Deals by Stage
      const stages: ChartData[] = [
        { label: 'Qualification', value: 28, percentage: 35, color: '#007AFF' },
        { label: 'Proposition', value: 22, percentage: 28, color: '#5AC8FA' },
        { label: 'Négociation', value: 18, percentage: 23, color: '#5856D6' },
        { label: 'Closing', value: 12, percentage: 14, color: '#34C759' },
      ];


      // Top Performers
      const performers = [
        { rank: 1, name: 'Sophie Durand', deals: 12, revenue: 185000, icon: '🥇' },
        { rank: 2, name: 'Laurent Michel', deals: 9, revenue: 142000, icon: '🥈' },
        { rank: 3, name: 'Marie Martin', deals: 7, revenue: 98000, icon: '🥉' },
        { rank: 4, name: 'Pierre Leroy', deals: 5, revenue: 67000, icon: '⭐' },
        { rank: 5, name: 'Julie Petit', deals: 4, revenue: 52000, icon: '⭐' },
      ];

      // Revenue Time Series (last 12 months)
      const timeSeries: TimeSeriesData[] = [
        { date: 'Jan', value: 185000 },
        { date: 'Fév', value: 195000 },
        { date: 'Mar', value: 220000 },
        { date: 'Avr', value: 210000 },
        { date: 'Mai', value: 235000 },
        { date: 'Juin', value: 245000 },
        { date: 'Juil', value: 230000 },
        { date: 'Août', value: 215000 },
        { date: 'Sep', value: 250000 },
        { date: 'Oct', value: 260000 },
        { date: 'Nov', value: 267450 },
        { date: 'Déc', value: 280000 },
      ];

      setKpis(kpiMetrics);
      setRevenueByProduct(revenue);
      setConversionFunnel(funnel);
      setDealsByStage(stages);
      setTopPerformers(performers);
      setRevenueTimeSeries(timeSeries);

    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
      // Animate charts on load
      chartRevealAnimation(chartAnim, 300).start();
    }
  };

  const renderKPICard = (metric: KPIMetric) => {
    const Icon = metric.icon;
    const isPositive = (metric.trend || 0) > 0;

    return (
      <GlassCard key={metric.id} variant="frosted" elevation="md" glow glowColor={metric.gradient[0]}>
        <LinearGradient
          colors={metric.gradient as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.kpiContent}>
          <View style={styles.kpiHeader}>
            <View
              style={[
                styles.kpiIcon,
                { backgroundColor: metric.gradient[0] + '20' },
              ]}
            >
              <Icon size={20} color={metric.gradient[0]} />
            </View>
            <Text style={styles.kpiTitle}>{metric.title}</Text>
          </View>

          <View style={styles.kpiValueRow}>
            <Text style={styles.kpiValue}>
              {metric.value}
              {metric.unit && (
                <Text style={styles.kpiUnit}> {metric.unit}</Text>
              )}
            </Text>
          </View>

          {metric.trend !== undefined && (
            <View style={styles.kpiTrend}>
              {isPositive ? (
                <TrendingUpIcon size={14} color="#34C759" />
              ) : (
                <TrendingDownIcon size={14} color="#FF3B30" />
              )}
              <Text
                style={[
                  styles.kpiTrendValue,
                  { color: isPositive ? '#34C759' : '#FF3B30' },
                ]}
              >
                {Math.abs(metric.trend).toFixed(1)}%
              </Text>
              <Text style={styles.kpiTrendLabel}>{metric.trendLabel}</Text>
            </View>
          )}
        </View>
      </GlassCard>
    );
  };

  const renderBarChart = (data: ChartData[], title: string, showPercentage = true) => {
    const maxValue = Math.max(...data.map((d) => d.value));

    return (
      <GlassCard variant="frosted" elevation="md">
        <Text style={styles.chartTitle}>{title}</Text>

        <View style={styles.barChartContainer}>
          {data.map((item, index) => {
            const barWidth = chartAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', `${(item.value / maxValue) * 100}%`],
            });

            return (
              <View key={index} style={styles.barRow}>
                <Text style={styles.barLabel}>{item.label}</Text>
                <View style={styles.barTrack}>
                  <Animated.View style={{ width: barWidth }}>
                    <LinearGradient
                      colors={[item.color || '#007AFF', (item.color || '#007AFF') + '80']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.barFill}
                    />
                  </Animated.View>
                </View>
                <Animated.Text style={[styles.barValue, { opacity: chartAnim }]}>
                  {showPercentage ? `${item.percentage}%` : item.value}
                </Animated.Text>
              </View>
            );
          })}
        </View>
      </GlassCard>
    );
  };

  const renderFunnelChart = () => {
    return (
      <GlassCard variant="frosted" elevation="md">
        <Text style={styles.chartTitle}>Pipeline de conversion</Text>

        <View style={styles.funnelContainer}>
          {conversionFunnel.map((stage, index) => (
            <View key={index} style={styles.funnelStage}>
              <View
                style={[
                  styles.funnelBar,
                  {
                    width: `${stage.percentage}%`,
                    minWidth: 120,
                  },
                ]}
              >
                <LinearGradient
                  colors={[stage.color!, stage.color! + '90']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
                <Text style={styles.funnelLabel}>{stage.label}</Text>
              </View>
              <Text style={styles.funnelValue}>
                {stage.value} deals • {stage.percentage}%
              </Text>
            </View>
          ))}
        </View>
      </GlassCard>
    );
  };

  const renderLineChart = () => {
    const maxValue = Math.max(...revenueTimeSeries.map((d) => d.value));
    const minValue = Math.min(...revenueTimeSeries.map((d) => d.value));
    const range = maxValue - minValue;

    return (
      <GlassCard variant="frosted" elevation="md">
        <Text style={styles.chartTitle}>Évolution du CA sur 12 mois</Text>

        <View style={styles.lineChartContainer}>
          <View style={styles.lineChartYAxis}>
            <Text style={styles.yAxisLabel}>{Math.round(maxValue / 1000)}k€</Text>
            <Text style={styles.yAxisLabel}>{Math.round((maxValue + minValue) / 2000)}k€</Text>
            <Text style={styles.yAxisLabel}>{Math.round(minValue / 1000)}k€</Text>
          </View>

          <View style={styles.lineChartContent}>
            <View style={styles.lineChartGrid}>
              {revenueTimeSeries.map((point, index) => {
                const height = ((point.value - minValue) / range) * 100;
                return (
                  <View key={index} style={styles.lineChartColumn}>
                    <View style={styles.lineChartBarWrapper}>
                      <LinearGradient
                        colors={['#007AFF', '#5AC8FA']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        style={[styles.lineChartBar, { height: `${height}%` }]}
                      />
                    </View>
                    <Text style={styles.xAxisLabel}>{point.date}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      </GlassCard>
    );
  };

  const renderTopPerformers = () => {
    return (
      <GlassCard variant="frosted" elevation="md">
        <Text style={styles.chartTitle}>Top commerciaux</Text>

        <View style={styles.performersList}>
          {topPerformers.map((performer, index) => (
            <TouchableOpacity
              key={index}
              style={styles.performerCard}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={
                  index === 0
                    ? ['#FFD70010', '#FFA50010']
                    : index === 1
                    ? ['#C0C0C010', '#A8A8A810']
                    : ['#CD7F3210', '#8B451310']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />

              <Text style={styles.performerIcon}>{performer.icon}</Text>
              <View style={styles.performerInfo}>
                <Text style={styles.performerName}>{performer.name}</Text>
                <Text style={styles.performerStats}>
                  {performer.deals} deals • {(performer.revenue / 1000).toFixed(0)}k€
                </Text>
              </View>
              <View style={styles.performerRank}>
                <Text style={styles.performerRankText}>#{performer.rank}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </GlassCard>
    );
  };

  const renderPeriodSelector = () => {
    const periods = [
      { id: 'week', label: 'Semaine' },
      { id: 'month', label: 'Mois' },
      { id: 'quarter', label: 'Trimestre' },
      { id: 'year', label: 'Année' },
    ];

    return (
      <View style={styles.periodSelector}>
        {periods.map((p) => (
          <TouchableOpacity
            key={p.id}
            style={[
              styles.periodButton,
              period === p.id && styles.periodButtonActive,
            ]}
            onPress={() => setPeriod(p.id as typeof period)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.periodButtonText,
                period === p.id && styles.periodButtonTextActive,
              ]}
            >
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <GlassLayout>
      <View style={styles.container}>
        <LinearGradient
          colors={['#F2F2F7', '#E8E8ED', '#F2F2F7']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Analytics</Text>
            <Text style={styles.subtitle}>
              Analyse complète des performances commerciales
            </Text>
          </View>

          {/* Period Selector */}
          {renderPeriodSelector()}

          {/* KPIs Grid */}
          <View style={styles.kpiGrid}>
            {kpis.map(renderKPICard)}
          </View>

          {/* Line Chart - Revenue Evolution */}
          {renderLineChart()}

          {/* Bar Chart - Revenue by Product */}
          {renderBarChart(revenueByProduct, 'Chiffre d\'affaires par produit')}

          {/* Funnel Chart */}
          {renderFunnelChart()}

          {/* Deals by Stage */}
          {renderBarChart(dealsByStage, 'Répartition des deals par étape', false)}

          {/* Top Performers */}
          {renderTopPerformers()}

          {/* Additional Metrics */}
          <GlassCard variant="frosted" elevation="md">
            <Text style={styles.chartTitle}>Métriques additionnelles</Text>

            <View style={styles.metricsGrid}>
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>Cycle de vente moyen</Text>
                <Text style={styles.metricValue}>42 jours</Text>
              </View>
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>Win rate</Text>
                <Text style={styles.metricValue}>32%</Text>
              </View>
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>Forecast vs Réalisé</Text>
                <Text style={styles.metricValue}>+12%</Text>
              </View>
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>Churn rate</Text>
                <Text style={styles.metricValue}>4.2%</Text>
              </View>
            </View>
          </GlassCard>

          {/* Export Actions */}
          <View style={styles.exportSection}>
            <TouchableOpacity style={styles.exportButton} activeOpacity={0.8}>
              <LinearGradient
                colors={['#007AFF', '#5AC8FA']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
              <BarChartIcon size={18} color="#FFFFFF" />
              <Text style={styles.exportText}>Exporter PDF</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.exportButton} activeOpacity={0.8}>
              <LinearGradient
                colors={['#34C759', '#30D158']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
              <Text style={styles.exportText}>Exporter Excel</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </GlassLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: glassTheme.spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 60 : 24,
  },

  // Header
  header: {
    marginBottom: glassTheme.spacing.lg,
  },
  title: {
    ...glassTheme.typography.displayMedium,
    color: glassTheme.colors.text.primary,
    marginBottom: 8,
  },
  subtitle: {
    ...glassTheme.typography.body,
    color: glassTheme.colors.text.tertiary,
  },

  // Period Selector
  periodSelector: {
    flexDirection: 'row',
    gap: glassTheme.spacing.sm,
    marginBottom: glassTheme.spacing.lg,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
  periodButtonActive: {
    backgroundColor: glassTheme.colors.primary,
    borderColor: glassTheme.colors.primary,
  },
  periodButtonText: {
    ...glassTheme.typography.bodySmall,
    color: glassTheme.colors.text.secondary,
    fontWeight: '600',
  },
  periodButtonTextActive: {
    color: '#FFFFFF',
  },

  // KPI Grid
  kpiGrid: {
    gap: glassTheme.spacing.md,
    marginBottom: glassTheme.spacing.lg,
  },
  kpiContent: {
    gap: glassTheme.spacing.sm,
  },
  kpiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: glassTheme.spacing.sm,
  },
  kpiIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  kpiTitle: {
    ...glassTheme.typography.bodySmall,
    color: glassTheme.colors.text.secondary,
    fontWeight: '600',
  },
  kpiValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  kpiValue: {
    ...glassTheme.typography.displaySmall,
    color: glassTheme.colors.text.primary,
    fontWeight: '700',
  },
  kpiUnit: {
    ...glassTheme.typography.body,
    color: glassTheme.colors.text.secondary,
  },
  kpiTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  kpiTrendValue: {
    ...glassTheme.typography.caption,
    fontWeight: '700',
  },
  kpiTrendLabel: {
    ...glassTheme.typography.caption,
    color: glassTheme.colors.text.tertiary,
  },

  // Charts
  chartTitle: {
    ...glassTheme.typography.h2,
    color: glassTheme.colors.text.primary,
    marginBottom: glassTheme.spacing.md,
  },

  // Bar Chart
  barChartContainer: {
    gap: glassTheme.spacing.md,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: glassTheme.spacing.sm,
  },
  barLabel: {
    ...glassTheme.typography.bodySmall,
    color: glassTheme.colors.text.primary,
    fontWeight: '600',
    width: 100,
  },
  barTrack: {
    flex: 1,
    height: 28,
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
    borderRadius: 8,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 8,
  },
  barValue: {
    ...glassTheme.typography.bodySmall,
    color: glassTheme.colors.text.primary,
    fontWeight: '700',
    width: 50,
    textAlign: 'right',
  },

  // Funnel Chart
  funnelContainer: {
    gap: glassTheme.spacing.md,
  },
  funnelStage: {
    alignItems: 'center',
  },
  funnelBar: {
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    overflow: 'hidden',
  },
  funnelLabel: {
    ...glassTheme.typography.body,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  funnelValue: {
    ...glassTheme.typography.caption,
    color: glassTheme.colors.text.tertiary,
  },

  // Line Chart
  lineChartContainer: {
    flexDirection: 'row',
    height: 180,
  },
  lineChartYAxis: {
    width: 50,
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  yAxisLabel: {
    ...glassTheme.typography.caption,
    color: glassTheme.colors.text.tertiary,
    fontSize: 10,
  },
  lineChartContent: {
    flex: 1,
  },
  lineChartGrid: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  lineChartColumn: {
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
  },
  lineChartBarWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 20,
  },
  lineChartBar: {
    borderRadius: 4,
    minHeight: 8,
  },
  xAxisLabel: {
    ...glassTheme.typography.caption,
    color: glassTheme.colors.text.tertiary,
    fontSize: 9,
    textAlign: 'center',
    marginTop: 4,
  },

  // Top Performers
  performersList: {
    gap: glassTheme.spacing.sm,
  },
  performerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: glassTheme.spacing.md,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
  },
  performerIcon: {
    fontSize: 24,
    marginRight: glassTheme.spacing.sm,
  },
  performerInfo: {
    flex: 1,
  },
  performerName: {
    ...glassTheme.typography.body,
    color: glassTheme.colors.text.primary,
    fontWeight: '600',
    marginBottom: 2,
  },
  performerStats: {
    ...glassTheme.typography.caption,
    color: glassTheme.colors.text.tertiary,
  },
  performerRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: glassTheme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  performerRankText: {
    ...glassTheme.typography.caption,
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // Metrics Grid
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: glassTheme.spacing.sm,
  },
  metricBox: {
    flex: 1,
    minWidth: '48%',
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    padding: glassTheme.spacing.md,
    borderRadius: 10,
  },
  metricLabel: {
    ...glassTheme.typography.caption,
    color: glassTheme.colors.text.tertiary,
    marginBottom: 4,
  },
  metricValue: {
    ...glassTheme.typography.h2,
    color: glassTheme.colors.text.primary,
    fontWeight: '700',
  },

  // Export Section
  exportSection: {
    flexDirection: 'row',
    gap: glassTheme.spacing.md,
    marginTop: glassTheme.spacing.lg,
    marginBottom: glassTheme.spacing.xl,
  },
  exportButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: glassTheme.spacing.sm,
    overflow: 'hidden',
  },
  exportText: {
    ...glassTheme.typography.body,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
