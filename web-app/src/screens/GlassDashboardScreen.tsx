import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Platform,
  Dimensions,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { glassTheme, withShadow } from '../theme/glassTheme';
import { isMobile, isTablet, responsiveSpacing } from '../theme/responsive';
import GlassLayout from '../components/GlassLayout';
import GlassCard from '../components/GlassCard';
import {
  GlassKPICard,
  GlassLoadingState,
  GlassStats,
} from '../components/ui';
import { GlassBarChart, GlassAreaChart, GlassDonutChart } from '../components/ui/GlassChart';
import {
  DollarIcon,
  UsersIcon,
  FileTextIcon,
  TrendingUpIcon,
  CheckCircleIcon,
  ClockIcon,
  TargetIcon,
} from '../components/Icons';
import {
  dashboardService,
  analyticsService,
  tasksService,
  pipelineService,
} from '../services/api';
import { useAuth } from '../context/AuthContext';

type DashboardScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Dashboard'>;
};

interface DashboardData {
  kpis: {
    revenue: number;
    revenueChange: number;
    invoicesPending: number;
    invoicesOverdue: number;
    dealsWon: number;
    dealsLost: number;
    contactsNew: number;
    tasksCompleted: number;
  };
  revenueChart: { label: string; value: number }[];
  pipelineData: { label: string; value: number; color: string }[];
  recentActivities: {
    id: string;
    type: string;
    title: string;
    description: string;
    time: string;
  }[];
  upcomingTasks: {
    id: string;
    title: string;
    dueDate: string;
    priority: string;
    status: string;
  }[];
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = responsiveSpacing.md;

export default function GlassDashboardScreen({ navigation }: DashboardScreenProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const formatTimeAgo = (date: string) => {
    if (!date) return '';
    const now = new Date();
    const past = new Date(date);
    const diffMs = now.getTime() - past.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return 'Il y a quelques minutes';
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays === 1) return 'Hier';
    if (diffDays < 7) return `Il y a ${diffDays} jours`;
    return past.toLocaleDateString('fr-FR');
  };

  const fetchDashboardData = useCallback(async () => {
    try {
      const [
        kpisRes,
        revenueRes,
        pipelineRes,
        tasksRes,
        activityRes,
      ] = await Promise.allSettled([
        dashboardService.getKPIs(period),
        dashboardService.getRevenue(period),
        pipelineService.getSummary(),
        tasksService.getAll({ status: 'pending' }),
        analyticsService.getRecentActivity(5),
      ]);

      const kpis = kpisRes.status === 'fulfilled' ? kpisRes.value.data : null;
      const revenue = revenueRes.status === 'fulfilled' ? revenueRes.value.data : null;
      const pipeline = pipelineRes.status === 'fulfilled' ? pipelineRes.value.data : null;
      const tasks = tasksRes.status === 'fulfilled' ? tasksRes.value.data : [];
      const activities = activityRes.status === 'fulfilled' ? activityRes.value.data : [];

      const pipelineStages = pipeline?.stages || [];
      const pipelineChartData = pipelineStages.map((stage: any, index: number) => ({
        label: stage.name,
        value: stage.deal_count || stage.count || 0,
        color: stage.color || ['#007AFF', '#34C759', '#FF9500', '#FF3B30', '#5856D6'][index % 5],
      }));

      const revenueChartData = (revenue?.monthly || revenue?.data || []).map((item: any) => ({
        label: item.month || item.label || item.date,
        value: parseFloat(item.revenue || item.value || item.amount || 0),
      }));

      setDashboardData({
        kpis: {
          revenue: kpis?.total_revenue || kpis?.revenue || 0,
          revenueChange: kpis?.revenue_change || 0,
          invoicesPending: kpis?.pending_invoices || kpis?.invoices_pending || 0,
          invoicesOverdue: kpis?.overdue_invoices || kpis?.invoices_overdue || 0,
          dealsWon: kpis?.deals_won || 0,
          dealsLost: kpis?.deals_lost || 0,
          contactsNew: kpis?.new_contacts || kpis?.contacts_new || 0,
          tasksCompleted: kpis?.tasks_completed || 0,
        },
        revenueChart: revenueChartData.length > 0 ? revenueChartData : [
          { label: 'Jan', value: 12500 },
          { label: 'Fev', value: 18200 },
          { label: 'Mar', value: 15800 },
          { label: 'Avr', value: 22100 },
          { label: 'Mai', value: 19500 },
          { label: 'Juin', value: 28700 },
        ],
        pipelineData: pipelineChartData.length > 0 ? pipelineChartData : [
          { label: 'Prospection', value: 12, color: '#FF9500' },
          { label: 'Qualification', value: 8, color: '#007AFF' },
          { label: 'Proposition', value: 5, color: '#5856D6' },
          { label: 'Negociation', value: 3, color: '#34C759' },
        ],
        recentActivities: (activities.data || activities || []).slice(0, 5).map((a: any) => ({
          id: a.id,
          type: a.type || 'note',
          title: a.title || a.description?.substring(0, 50) || 'Activite',
          description: a.description || '',
          time: formatTimeAgo(a.created_at),
        })),
        upcomingTasks: (Array.isArray(tasks) ? tasks : tasks.data || []).slice(0, 5).map((t: any) => ({
          id: t.id,
          title: t.title,
          dueDate: t.due_date,
          priority: t.priority || 'medium',
          status: t.status,
        })),
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setDashboardData({
        kpis: {
          revenue: 127500,
          revenueChange: 12.5,
          invoicesPending: 8,
          invoicesOverdue: 2,
          dealsWon: 15,
          dealsLost: 3,
          contactsNew: 24,
          tasksCompleted: 42,
        },
        revenueChart: [
          { label: 'Jan', value: 12500 },
          { label: 'Fev', value: 18200 },
          { label: 'Mar', value: 15800 },
          { label: 'Avr', value: 22100 },
          { label: 'Mai', value: 19500 },
          { label: 'Juin', value: 28700 },
        ],
        pipelineData: [
          { label: 'Prospection', value: 12, color: '#FF9500' },
          { label: 'Qualification', value: 8, color: '#007AFF' },
          { label: 'Proposition', value: 5, color: '#5856D6' },
          { label: 'Negociation', value: 3, color: '#34C759' },
        ],
        recentActivities: [
          { id: '1', type: 'call', title: 'Appel avec TechCorp', description: 'Discussion commerciale', time: 'Il y a 2h' },
          { id: '2', type: 'email', title: 'Devis envoye', description: 'Devis #2024-042', time: 'Il y a 4h' },
          { id: '3', type: 'meeting', title: 'Reunion client', description: 'Presentation produit', time: 'Hier' },
        ],
        upcomingTasks: [
          { id: '1', title: 'Relance devis TechCorp', dueDate: new Date().toISOString(), priority: 'high', status: 'pending' },
          { id: '2', title: 'Preparer presentation', dueDate: new Date(Date.now() + 86400000).toISOString(), priority: 'medium', status: 'pending' },
        ],
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    if (!loading) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 10,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [loading, fadeAnim, slideAnim]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
    return value.toFixed(0);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#FF3B30';
      case 'medium': return '#FF9500';
      default: return '#34C759';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'call': return 'T';
      case 'email': return '@';
      case 'meeting': return 'M';
      default: return 'N';
    }
  };

  if (loading) {
    return (
      <GlassLayout>
        <GlassLoadingState
          message="Chargement du tableau de bord..."
          type="pulse"
          fullScreen
        />
      </GlassLayout>
    );
  }

  const data = dashboardData!;

  return (
    <GlassLayout>
      <LinearGradient
        colors={['#F2F2F7', '#E8E8ED', '#F2F2F7']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <Animated.View
          style={[
            styles.header,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>
              Bonjour, {user?.name || 'Utilisateur'}
            </Text>
            <Text style={styles.headerSubtitle}>
              Voici votre tableau de bord
            </Text>
          </View>

          <View style={styles.periodSelector}>
            {(['week', 'month', 'quarter', 'year'] as const).map((p) => (
              <TouchableOpacity
                key={p}
                style={[styles.periodButton, period === p && styles.periodButtonActive]}
                onPress={() => setPeriod(p)}
              >
                <Text style={[styles.periodButtonText, period === p && styles.periodButtonTextActive]}>
                  {p === 'week' ? 'Sem' : p === 'month' ? 'Mois' : p === 'quarter' ? 'Trim' : 'An'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* KPI Cards */}
        <Animated.View
          style={[styles.kpiGrid, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        >
          <View style={[styles.kpiItem, { width: isMobile ? '48%' : '23%' }]}>
            <GlassKPICard
              title="Chiffre d'affaires"
              value={`${formatCurrency(data.kpis.revenue)} EUR`}
              change={data.kpis.revenueChange}
              changeLabel="vs periode precedente"
              icon={<DollarIcon size={24} color="#FFFFFF" />}
              gradient={['#34C759', '#30D158']}
              size={isMobile ? 'sm' : 'md'}
              onPress={() => navigation.navigate('Analytics' as any)}
            />
          </View>

          <View style={[styles.kpiItem, { width: isMobile ? '48%' : '23%' }]}>
            <GlassKPICard
              title="Affaires gagnees"
              value={data.kpis.dealsWon}
              subtitle={`${data.kpis.dealsLost} perdues`}
              icon={<TrendingUpIcon size={24} color="#FFFFFF" />}
              gradient={['#007AFF', '#5AC8FA']}
              size={isMobile ? 'sm' : 'md'}
              onPress={() => navigation.navigate('Deals' as any)}
            />
          </View>

          <View style={[styles.kpiItem, { width: isMobile ? '48%' : '23%' }]}>
            <GlassKPICard
              title="Factures en attente"
              value={data.kpis.invoicesPending}
              subtitle={`${data.kpis.invoicesOverdue} en retard`}
              icon={<FileTextIcon size={24} color="#FFFFFF" />}
              gradient={data.kpis.invoicesOverdue > 0 ? ['#FF9500', '#FFCC00'] : ['#5856D6', '#AF52DE']}
              size={isMobile ? 'sm' : 'md'}
              onPress={() => navigation.navigate('Invoices' as any)}
            />
          </View>

          <View style={[styles.kpiItem, { width: isMobile ? '48%' : '23%' }]}>
            <GlassKPICard
              title="Nouveaux contacts"
              value={data.kpis.contactsNew}
              icon={<UsersIcon size={24} color="#FFFFFF" />}
              gradient={['#FF2D55', '#FF375F']}
              size={isMobile ? 'sm' : 'md'}
              onPress={() => navigation.navigate('Contacts' as any)}
            />
          </View>
        </Animated.View>

        {/* Charts Section */}
        <Animated.View
          style={[styles.chartsSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        >
          <View style={[styles.chartContainer, !isMobile && { width: '58%' }]}>
            <GlassBarChart
              data={data.revenueChart}
              title="Evolution du chiffre d'affaires"
              subtitle="Revenus mensuels"
              height={isMobile ? 180 : 220}
              gradient={['#007AFF', '#5AC8FA']}
              showLabels
              showGrid
            />
          </View>

          <View style={[styles.chartContainer, !isMobile && { width: '38%' }]}>
            <GlassDonutChart
              data={data.pipelineData}
              title="Pipeline commercial"
              subtitle="Repartition des affaires"
              height={isMobile ? 180 : 220}
            />
          </View>
        </Animated.View>

        {/* Quick Stats */}
        <Animated.View
          style={[styles.quickStatsContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        >
          <GlassStats
            variant="compact"
            items={[
              { label: 'Taches terminees', value: data.kpis.tasksCompleted, icon: <CheckCircleIcon size={18} color="#34C759" />, color: '#34C759' },
              { label: 'En cours', value: data.upcomingTasks.length, icon: <ClockIcon size={18} color="#FF9500" />, color: '#FF9500' },
              { label: 'Objectif', value: '85%', icon: <TargetIcon size={18} color="#007AFF" />, color: '#007AFF' },
            ]}
          />
        </Animated.View>

        {/* Activities and Tasks */}
        <Animated.View
          style={[styles.bottomSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        >
          {/* Recent Activities */}
          <View style={[styles.bottomCard, !isMobile && { width: '48%' }]}>
            <View style={styles.cardGlass} />
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Activites recentes</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Tasks' as any)}>
                <Text style={styles.cardLink}>Voir tout</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.activityList}>
              {data.recentActivities.length > 0 ? (
                data.recentActivities.map((activity) => (
                  <View key={activity.id} style={styles.activityItem}>
                    <View style={styles.activityIcon}>
                      <Text style={styles.activityIconText}>{getActivityIcon(activity.type)}</Text>
                    </View>
                    <View style={styles.activityContent}>
                      <Text style={styles.activityTitle} numberOfLines={1}>{activity.title}</Text>
                      <Text style={styles.activityTime}>{activity.time}</Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>Aucune activite recente</Text>
              )}
            </View>
          </View>

          {/* Upcoming Tasks */}
          <View style={[styles.bottomCard, !isMobile && { width: '48%' }]}>
            <View style={styles.cardGlass} />
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Taches a venir</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Tasks' as any)}>
                <Text style={styles.cardLink}>Voir tout</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.taskList}>
              {data.upcomingTasks.length > 0 ? (
                data.upcomingTasks.map((task) => (
                  <TouchableOpacity
                    key={task.id}
                    style={styles.taskItem}
                    onPress={() => navigation.navigate('Tasks' as any)}
                  >
                    <View style={[styles.taskPriority, { backgroundColor: getPriorityColor(task.priority) }]} />
                    <View style={styles.taskContent}>
                      <Text style={styles.taskTitle} numberOfLines={1}>{task.title}</Text>
                      <Text style={styles.taskDue}>
                        {task.dueDate ? new Date(task.dueDate).toLocaleDateString('fr-FR') : 'Pas de date'}
                      </Text>
                    </View>
                    <View style={styles.taskCheck}>
                      <View style={styles.checkbox} />
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={styles.emptyText}>Aucune tache en attente</Text>
              )}
            </View>
          </View>
        </Animated.View>

        {/* Quick Actions */}
        <Animated.View
          style={[styles.quickActions, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        >
          <Text style={styles.quickActionsTitle}>Actions rapides</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity style={styles.quickAction} onPress={() => navigation.navigate('Contacts' as any)}>
              <LinearGradient colors={['#34C759', '#30D158']} style={styles.quickActionGradient}>
                <UsersIcon size={24} color="#FFFFFF" />
              </LinearGradient>
              <Text style={styles.quickActionLabel}>Contact</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickAction} onPress={() => navigation.navigate('Invoices' as any)}>
              <LinearGradient colors={['#007AFF', '#5AC8FA']} style={styles.quickActionGradient}>
                <FileTextIcon size={24} color="#FFFFFF" />
              </LinearGradient>
              <Text style={styles.quickActionLabel}>Facture</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickAction} onPress={() => navigation.navigate('Deals' as any)}>
              <LinearGradient colors={['#FF9500', '#FFCC00']} style={styles.quickActionGradient}>
                <TrendingUpIcon size={24} color="#FFFFFF" />
              </LinearGradient>
              <Text style={styles.quickActionLabel}>Affaire</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickAction} onPress={() => navigation.navigate('Tasks' as any)}>
              <LinearGradient colors={['#5856D6', '#AF52DE']} style={styles.quickActionGradient}>
                <CheckCircleIcon size={24} color="#FFFFFF" />
              </LinearGradient>
              <Text style={styles.quickActionLabel}>Tache</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </GlassLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    padding: responsiveSpacing.lg,
    paddingTop: Platform.OS === 'ios' ? 60 : 24,
    paddingBottom: 100,
  },
  header: {
    flexDirection: isMobile ? 'column' : 'row',
    justifyContent: 'space-between',
    alignItems: isMobile ? 'flex-start' : 'center',
    marginBottom: responsiveSpacing.lg,
    gap: responsiveSpacing.md,
  },
  headerLeft: { flex: 1 },
  greeting: {
    fontSize: isMobile ? 28 : 36,
    fontWeight: '700',
    color: glassTheme.colors.text.primary,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    ...glassTheme.typography.body,
    color: glassTheme.colors.text.tertiary,
    marginTop: 4,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: glassTheme.radius.md,
    padding: 4,
    ...(Platform.OS === 'web' ? { backdropFilter: 'blur(10px)' } as any : {}),
    ...withShadow('sm'),
  },
  periodButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: glassTheme.radius.sm,
  },
  periodButtonActive: { backgroundColor: glassTheme.colors.primary },
  periodButtonText: {
    ...glassTheme.typography.bodySmall,
    color: glassTheme.colors.text.secondary,
    fontWeight: '500',
  },
  periodButtonTextActive: { color: '#FFFFFF', fontWeight: '600' },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_GAP,
    marginBottom: responsiveSpacing.lg,
  },
  kpiItem: { marginBottom: 0 },
  chartsSection: {
    flexDirection: isMobile ? 'column' : 'row',
    gap: CARD_GAP,
    marginBottom: responsiveSpacing.lg,
  },
  chartContainer: { flex: isMobile ? undefined : 1 },
  quickStatsContainer: { marginBottom: responsiveSpacing.lg },
  bottomSection: {
    flexDirection: isMobile ? 'column' : 'row',
    gap: CARD_GAP,
    marginBottom: responsiveSpacing.lg,
  },
  bottomCard: {
    borderRadius: glassTheme.radius.xl,
    overflow: 'hidden',
    padding: responsiveSpacing.md,
    position: 'relative',
    ...withShadow('md'),
  },
  cardGlass: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    ...(Platform.OS === 'web' ? { backdropFilter: 'blur(20px)' } as any : {}),
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: responsiveSpacing.md,
    zIndex: 1,
  },
  cardTitle: { ...glassTheme.typography.h2, color: glassTheme.colors.text.primary },
  cardLink: { ...glassTheme.typography.bodySmall, color: glassTheme.colors.primary, fontWeight: '600' },
  activityList: { gap: responsiveSpacing.sm, zIndex: 1 },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: responsiveSpacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderRadius: glassTheme.radius.md,
    gap: responsiveSpacing.sm,
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityIconText: { fontSize: 14, fontWeight: '700', color: glassTheme.colors.primary },
  activityContent: { flex: 1 },
  activityTitle: { ...glassTheme.typography.bodySmall, color: glassTheme.colors.text.primary, fontWeight: '500' },
  activityTime: { ...glassTheme.typography.caption, color: glassTheme.colors.text.tertiary, marginTop: 2 },
  taskList: { gap: responsiveSpacing.sm, zIndex: 1 },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: responsiveSpacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderRadius: glassTheme.radius.md,
    gap: responsiveSpacing.sm,
  },
  taskPriority: { width: 4, height: '100%', minHeight: 40, borderRadius: 2 },
  taskContent: { flex: 1 },
  taskTitle: { ...glassTheme.typography.bodySmall, color: glassTheme.colors.text.primary, fontWeight: '500' },
  taskDue: { ...glassTheme.typography.caption, color: glassTheme.colors.text.tertiary, marginTop: 2 },
  taskCheck: { width: 24, height: 24, justifyContent: 'center', alignItems: 'center' },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.15)',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  quickActions: { marginBottom: responsiveSpacing.lg },
  quickActionsTitle: { ...glassTheme.typography.h2, color: glassTheme.colors.text.primary, marginBottom: responsiveSpacing.md },
  quickActionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: responsiveSpacing.md },
  quickAction: { alignItems: 'center', gap: responsiveSpacing.xs },
  quickActionGradient: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    ...withShadow('md'),
  },
  quickActionLabel: { ...glassTheme.typography.caption, color: glassTheme.colors.text.secondary, fontWeight: '500' },
  emptyText: { ...glassTheme.typography.body, color: glassTheme.colors.text.tertiary, textAlign: 'center', paddingVertical: responsiveSpacing.lg },
});
