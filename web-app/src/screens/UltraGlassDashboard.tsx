import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  Animated,
  Platform,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { analyticsService, notificationsService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Navigation from '../components/Navigation';
import ultraGlassTheme from '../theme/ultraGlassTheme';
import {
  DollarIcon,
  ChartIcon,
  UsersIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  FileTextIcon,
  CheckCircleIcon,
  ClockIcon,
  AlertTriangleIcon,
  ActivityIcon,
} from '../components/Icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

type DashboardScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Dashboard'>;
};

interface MetricData {
  label: string;
  value: string;
  change: number;
  icon: React.ReactNode;
  color: string;
  gradient: readonly [string, string, ...string[]];
}

export default function UltraGlassDashboard({ navigation }: DashboardScreenProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [quickStats, setQuickStats] = useState<any>(null);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [pipelineStages, setPipelineStages] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const cardAnims = useRef([...Array(4)].map(() => new Animated.Value(0))).current;

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!loading) {
      // Staggered entrance animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();

      // Staggered card animations
      cardAnims.forEach((anim, index) => {
        Animated.timing(anim, {
          toValue: 1,
          duration: 600,
          delay: index * 100,
          useNativeDriver: true,
        }).start();
      });
    }
  }, [loading]);

  const fetchData = async () => {
    try {
      const [
        dashboardResponse,
        quickStatsResponse,
        recentActivityResponse,
        pipelineResponse,
        notificationsResponse,
      ] = await Promise.all([
        analyticsService.getDashboard(),
        analyticsService.getQuickStats(),
        analyticsService.getRecentActivity(8),
        analyticsService.getPipelineStages(),
        notificationsService.getContextual(),
      ]);

      setDashboardData(dashboardResponse.data);
      setQuickStats(quickStatsResponse.data);
      setRecentActivity(recentActivityResponse.data || []);
      setPipelineStages(pipelineResponse.data || []);
      setNotifications(notificationsResponse.data?.notifications || []);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
  };

  const metrics: MetricData[] = dashboardData ? [
    {
      label: 'Chiffre d\'affaires',
      value: formatCurrency(parseFloat(dashboardData.totalRevenue) || 0),
      change: 12.5,
      icon: <DollarIcon size={28} color="#FFFFFF" />,
      color: '#10B981',
      gradient: ['#10B981', '#34D399', '#6EE7B7'] as const,
    },
    {
      label: 'Ventes',
      value: formatNumber(parseInt(dashboardData.totalSales) || 0),
      change: 8.3,
      icon: <ChartIcon size={28} color="#FFFFFF" />,
      color: '#3B82F6',
      gradient: ['#3B82F6', '#60A5FA', '#93C5FD'] as const,
    },
    {
      label: 'Clients',
      value: formatNumber(parseInt(dashboardData.totalCustomers) || 0),
      change: 5.7,
      icon: <UsersIcon size={28} color="#FFFFFF" />,
      color: '#F59E0B',
      gradient: ['#F59E0B', '#FBBF24', '#FCD34D'] as const,
    },
    {
      label: 'Pipeline',
      value: formatCurrency(quickStats?.pipelineValue || 0),
      change: quickStats?.pipelineCount || 0,
      icon: <TrendingUpIcon size={28} color="#FFFFFF" />,
      color: '#8B5CF6',
      gradient: ['#8B5CF6', '#A78BFA', '#C4B5FD'] as const,
    },
  ] : [];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient
          colors={['#f8fafc', '#e2e8f0', '#f1f5f9']}
          style={StyleSheet.absoluteFill}
        />
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Navigation />

      {/* Animated Mesh Gradient Background */}
      <View style={styles.backgroundContainer}>
        <LinearGradient
          colors={['#f8fafc', '#f1f5f9', '#e2e8f0']}
          style={StyleSheet.absoluteFill}
        />
        {/* Animated orbs */}
        <Animated.View style={[styles.orb, styles.orb1, { opacity: fadeAnim }]} />
        <Animated.View style={[styles.orb, styles.orb2, { opacity: fadeAnim }]} />
        <Animated.View style={[styles.orb, styles.orb3, { opacity: fadeAnim }]} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" />
        }
      >
        {/* Header with Glass Effect */}
        <Animated.View
          style={[
            styles.header,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.greeting}>{getGreeting()},</Text>
              <Text style={styles.userName}>{user?.first_name || 'Utilisateur'}</Text>
            </View>
            <View style={styles.headerRight}>
              <View style={styles.dateBadge}>
                <Text style={styles.dateText}>
                  {new Date().toLocaleDateString('fr-FR', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  })}
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Main Metrics Grid */}
        <View style={styles.metricsGrid}>
          {metrics.map((metric, index) => (
            <Animated.View
              key={metric.label}
              style={[
                styles.metricCardWrapper,
                {
                  opacity: cardAnims[index],
                  transform: [
                    {
                      translateY: cardAnims[index].interpolate({
                        inputRange: [0, 1],
                        outputRange: [40, 0],
                      }),
                    },
                    {
                      scale: cardAnims[index].interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.9, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <TouchableOpacity
                activeOpacity={0.9}
                style={styles.metricCard}
                onPress={() => {
                  if (metric.label === 'Pipeline') navigation.navigate('Pipeline' as any);
                  else if (metric.label === 'Clients') navigation.navigate('Contacts' as any);
                  else navigation.navigate('Sales' as any);
                }}
              >
                {/* Glass background */}
                <View style={styles.metricGlassLayer} />

                {/* Gradient accent */}
                <LinearGradient
                  colors={metric.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.metricGradient}
                />

                {/* Content */}
                <View style={styles.metricContent}>
                  {/* Icon with glow */}
                  <View style={[styles.metricIconContainer, { backgroundColor: metric.color + '20' }]}>
                    <View style={[styles.metricIconGlow, { backgroundColor: metric.color + '40' }]} />
                    {metric.icon}
                  </View>

                  {/* Value */}
                  <Text style={styles.metricValue}>{metric.value}</Text>
                  <Text style={styles.metricLabel}>{metric.label}</Text>

                  {/* Change indicator */}
                  <View style={styles.changeContainer}>
                    <View style={[
                      styles.changeBadge,
                      { backgroundColor: metric.change >= 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)' }
                    ]}>
                      {metric.change >= 0 ? (
                        <TrendingUpIcon size={12} color="#10B981" />
                      ) : (
                        <TrendingDownIcon size={12} color="#EF4444" />
                      )}
                      <Text style={[
                        styles.changeText,
                        { color: metric.change >= 0 ? '#10B981' : '#EF4444' }
                      ]}>
                        {metric.change >= 0 ? '+' : ''}{metric.change}%
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Shine effect */}
                <View style={styles.shineEffect} />
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>

        {/* Pipeline Progress */}
        {pipelineStages.length > 0 && (
          <Animated.View
            style={[
              styles.section,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Pipeline</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Pipeline' as any)}>
                <Text style={styles.seeAllText}>Voir tout</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.glassPanel}>
              <View style={styles.glassPanelInner} />
              {pipelineStages.slice(0, 4).map((stage, index) => {
                const maxValue = Math.max(...pipelineStages.map((s: any) => s.value || 0));
                const percentage = maxValue > 0 ? ((stage.value || 0) / maxValue) * 100 : 0;
                const colors = [
                  ['#10B981', '#34D399'],
                  ['#3B82F6', '#60A5FA'],
                  ['#F59E0B', '#FBBF24'],
                  ['#8B5CF6', '#A78BFA'],
                ];

                return (
                  <TouchableOpacity
                    key={stage.id || index}
                    style={styles.pipelineItem}
                    onPress={() => navigation.navigate('Invoices' as any)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.pipelineHeader}>
                      <Text style={styles.pipelineName}>{stage.name}</Text>
                      <Text style={styles.pipelineValue}>{formatCurrency(stage.value || 0)}</Text>
                    </View>
                    <View style={styles.pipelineBarContainer}>
                      <LinearGradient
                        colors={colors[index % 4] as readonly [string, string, ...string[]]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[styles.pipelineBarFill, { width: `${Math.max(percentage, 5)}%` }]}
                      />
                    </View>
                    <Text style={styles.pipelineCount}>{stage.count || 0} opportunités</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>
        )}

        {/* Alerts & Notifications */}
        {notifications.length > 0 && (
          <Animated.View
            style={[
              styles.section,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionTitle}>Alertes</Text>
                <View style={styles.alertBadge}>
                  <Text style={styles.alertBadgeText}>{notifications.length}</Text>
                </View>
              </View>
            </View>

            <View style={styles.glassPanel}>
              <View style={styles.glassPanelInner} />
              {notifications.slice(0, 4).map((notif, index) => (
                <TouchableOpacity
                  key={notif.id || index}
                  style={[
                    styles.notificationItem,
                    notif.priority === 'high' && styles.notificationItemHigh,
                  ]}
                  activeOpacity={0.8}
                >
                  <View style={[
                    styles.notificationDot,
                    {
                      backgroundColor:
                        notif.type === 'danger' ? '#EF4444' :
                        notif.type === 'warning' ? '#F59E0B' :
                        notif.type === 'success' ? '#10B981' : '#3B82F6'
                    }
                  ]} />
                  <View style={styles.notificationContent}>
                    <Text style={styles.notificationTitle}>{notif.title}</Text>
                    <Text style={styles.notificationMessage} numberOfLines={1}>
                      {notif.message}
                    </Text>
                  </View>
                  {notif.priority === 'high' && (
                    <View style={styles.urgentBadge}>
                      <Text style={styles.urgentText}>Urgent</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Recent Activity */}
        <Animated.View
          style={[
            styles.section,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Activité récente</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Sales' as any)}>
              <Text style={styles.seeAllText}>Voir tout</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.glassPanel}>
            <View style={styles.glassPanelInner} />
            {recentActivity.length > 0 ? (
              recentActivity.slice(0, 5).map((activity, index) => (
                <View key={`activity-${activity.id || index}`} style={styles.activityItem}>
                  <View style={[
                    styles.activityIcon,
                    {
                      backgroundColor:
                        activity.type === 'sale' ? 'rgba(16, 185, 129, 0.15)' :
                        activity.type === 'quote' ? 'rgba(59, 130, 246, 0.15)' :
                        'rgba(245, 158, 11, 0.15)'
                    }
                  ]}>
                    {activity.type === 'sale' && <ChartIcon size={16} color="#10B981" />}
                    {activity.type === 'quote' && <FileTextIcon size={16} color="#3B82F6" />}
                    {activity.type === 'customer' && <UsersIcon size={16} color="#F59E0B" />}
                  </View>
                  <View style={styles.activityContent}>
                    <Text style={styles.activityTitle}>
                      {activity.type === 'sale' ? 'Nouvelle vente' :
                       activity.type === 'quote' ? 'Devis créé' :
                       `Client: ${activity.name}`}
                    </Text>
                    <Text style={styles.activityTime}>
                      {activity.created_at
                        ? new Date(activity.created_at).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Récemment'}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <ActivityIcon size={32} color="#94A3B8" />
                <Text style={styles.emptyText}>Aucune activité récente</Text>
              </View>
            )}
          </View>
        </Animated.View>

        {/* Quick Actions */}
        <Animated.View
          style={[
            styles.quickActions,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('Contacts' as any)}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#6366F1', '#8B5CF6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.quickActionGradient}
            />
            <UsersIcon size={20} color="#FFFFFF" />
            <Text style={styles.quickActionText}>Contacts</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('Invoices' as any)}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#10B981', '#34D399']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.quickActionGradient}
            />
            <FileTextIcon size={20} color="#FFFFFF" />
            <Text style={styles.quickActionText}>Facturation</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('Analytics' as any)}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#F59E0B', '#FBBF24']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.quickActionGradient}
            />
            <ChartIcon size={20} color="#FFFFFF" />
            <Text style={styles.quickActionText}>Analytics</Text>
          </TouchableOpacity>
        </Animated.View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748B',
  },

  // Background
  backgroundContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  orb: {
    position: 'absolute',
    borderRadius: 9999,
  },
  orb1: {
    width: 400,
    height: 400,
    top: -100,
    left: -100,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    ...(isWeb ? { filter: 'blur(80px)' } : {}),
  },
  orb2: {
    width: 300,
    height: 300,
    top: 200,
    right: -80,
    backgroundColor: 'rgba(236, 72, 153, 0.12)',
    ...(isWeb ? { filter: 'blur(60px)' } : {}),
  },
  orb3: {
    width: 350,
    height: 350,
    bottom: 100,
    left: -50,
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    ...(isWeb ? { filter: 'blur(70px)' } : {}),
  },

  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 16,
  },

  // Header
  header: {
    marginBottom: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greeting: {
    fontSize: 16,
    color: '#64748B',
    marginBottom: 4,
  },
  userName: {
    fontSize: 32,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -1,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  dateBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    ...(isWeb ? {
      backdropFilter: 'blur(20px)',
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.06)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 16,
      elevation: 4,
    }),
  },
  dateText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },

  // Metrics Grid
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 28,
  },
  metricCardWrapper: {
    width: SCREEN_WIDTH > 768 ? `${(100 - 6) / 2}%` : '100%',
    minWidth: SCREEN_WIDTH > 768 ? 'auto' : undefined,
  },
  metricCard: {
    borderRadius: 28,
    overflow: 'hidden',
    minHeight: 160,
    position: 'relative',
  },
  metricGlassLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    ...(isWeb ? {
      backdropFilter: 'blur(40px) saturate(180%)',
    } : {}),
  },
  metricGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 6,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  metricContent: {
    padding: 24,
    position: 'relative',
    zIndex: 1,
  },
  metricIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  metricIconGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
    ...(isWeb ? { filter: 'blur(8px)' } : {}),
  },
  metricValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -1.5,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 12,
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 4,
  },
  changeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  shineEffect: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'transparent',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    ...(isWeb ? {
      background: 'linear-gradient(180deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 100%)',
    } : {}),
  },

  // Sections
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
  },
  alertBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  alertBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Glass Panel
  glassPanel: {
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
    padding: 20,
    ...(isWeb ? {
      backgroundColor: 'rgba(255, 255, 255, 0.7)',
      backdropFilter: 'blur(40px) saturate(180%)',
      border: '1px solid rgba(255, 255, 255, 0.4)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08), inset 0 1px 1px rgba(255, 255, 255, 0.6)',
    } : {
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.08,
      shadowRadius: 32,
      elevation: 8,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.4)',
    }),
  },
  glassPanelInner: {
    ...StyleSheet.absoluteFillObject,
    ...(isWeb ? {
      background: 'linear-gradient(135deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.2) 100%)',
    } : {}),
  },

  // Pipeline
  pipelineItem: {
    marginBottom: 20,
  },
  pipelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  pipelineName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  pipelineValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#10B981',
  },
  pipelineBarContainer: {
    height: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 6,
  },
  pipelineBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  pipelineCount: {
    fontSize: 12,
    color: '#64748B',
  },

  // Notifications
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  notificationItemHigh: {
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    marginHorizontal: -20,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderBottomWidth: 0,
    marginBottom: 8,
  },
  notificationDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 14,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 2,
  },
  notificationMessage: {
    fontSize: 13,
    color: '#64748B',
  },
  urgentBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  urgentText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },

  // Activity
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.04)',
  },
  activityIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#0F172A',
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 13,
    color: '#94A3B8',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: '#94A3B8',
  },

  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  quickActionGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
