import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { glassTheme } from '../theme/glassTheme';
import GlassCard from '../components/GlassCard';
import { analyticsService } from '../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH > 768 ? (SCREEN_WIDTH - 360) / 3 : SCREEN_WIDTH - 48;

type DashboardScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Dashboard'>;
};

interface QuickStat {
  id: string;
  label: string;
  value: string;
  change: number;
  changeLabel: string;
  gradient: [string, string];
  icon: string;
}

export default function GlassDashboardScreen({ navigation }: DashboardScreenProps) {
  const [loading, setLoading] = useState(true);
  const [quickStats, setQuickStats] = useState<QuickStat[]>([]);
  const fadeAnim = new Animated.Value(0);
  const slideAnim = new Animated.Value(50);

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    if (!loading) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 40,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [loading]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const response = await analyticsService.getQuickStats();
      const stats = response.data;

      const formattedStats: QuickStat[] = [
        {
          id: '1',
          label: 'Chiffre d\'affaires',
          value: `${(stats.revenue || 0).toLocaleString('fr-FR')}€`,
          change: stats.revenue_change || 0,
          changeLabel: 'vs mois dernier',
          gradient: ['#007AFF', '#5AC8FA'],
          icon: '📈',
        },
        {
          id: '2',
          label: 'Deals actifs',
          value: `${stats.active_deals || 0}`,
          change: stats.deals_change || 0,
          changeLabel: 'cette semaine',
          gradient: ['#5856D6', '#AF52DE'],
          icon: '🎯',
        },
        {
          id: '3',
          label: 'Taux de conversion',
          value: `${stats.conversion_rate || 0}%`,
          change: stats.conversion_change || 0,
          changeLabel: 'vs mois dernier',
          gradient: ['#34C759', '#30D158'],
          icon: '⚡',
        },
        {
          id: '4',
          label: 'Nouveaux contacts',
          value: `${stats.new_contacts || 0}`,
          change: stats.contacts_change || 0,
          changeLabel: 'cette semaine',
          gradient: ['#FF9500', '#FFCC00'],
          icon: '👥',
        },
      ];

      setQuickStats(formattedStats);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      // Fallback to mock data
      setQuickStats([
        {
          id: '1',
          label: 'Chiffre d\'affaires',
          value: '245 890€',
          change: 12.5,
          changeLabel: 'vs mois dernier',
          gradient: ['#007AFF', '#5AC8FA'],
          icon: '📈',
        },
        {
          id: '2',
          label: 'Deals actifs',
          value: '34',
          change: 8.3,
          changeLabel: 'cette semaine',
          gradient: ['#5856D6', '#AF52DE'],
          icon: '🎯',
        },
        {
          id: '3',
          label: 'Taux de conversion',
          value: '68%',
          change: 5.2,
          changeLabel: 'vs mois dernier',
          gradient: ['#34C759', '#30D158'],
          icon: '⚡',
        },
        {
          id: '4',
          label: 'Nouveaux contacts',
          value: '127',
          change: 15.7,
          changeLabel: 'cette semaine',
          gradient: ['#FF9500', '#FFCC00'],
          icon: '👥',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const renderStatCard = (stat: QuickStat, index: number) => {
    const isPositive = stat.change >= 0;

    return (
      <Animated.View
        key={stat.id}
        style={[
          styles.statCardWrapper,
          {
            opacity: fadeAnim,
            transform: [
              {
                translateY: slideAnim.interpolate({
                  inputRange: [0, 50],
                  outputRange: [0, 50],
                }),
              },
            ],
          },
        ]}
      >
        <TouchableOpacity activeOpacity={0.9} style={styles.statCardTouchable}>
          <GlassCard variant="frosted" elevation="lg" padding={0} glow glowColor={stat.gradient[0]}>
            {/* Gradient background */}
            <LinearGradient
              colors={[...stat.gradient.map(c => c + '15')]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />

            <View style={styles.statCardContent}>
              {/* Icon */}
              <View style={styles.statIconContainer}>
                <Text style={styles.statIcon}>{stat.icon}</Text>
              </View>

              {/* Value */}
              <View style={styles.statValueContainer}>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>

              {/* Change indicator */}
              <View style={styles.statChangeContainer}>
                <View
                  style={[
                    styles.changeBadge,
                    {
                      backgroundColor: isPositive
                        ? 'rgba(52, 199, 89, 0.15)'
                        : 'rgba(255, 59, 48, 0.15)',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.changeValue,
                      {
                        color: isPositive ? glassTheme.colors.success : glassTheme.colors.error,
                      },
                    ]}
                  >
                    {isPositive ? '↑' : '↓'} {Math.abs(stat.change)}%
                  </Text>
                </View>
                <Text style={styles.changeLabel}>{stat.changeLabel}</Text>
              </View>
            </View>
          </GlassCard>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Animated gradient background */}
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
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>Bonjour 👋</Text>
              <Text style={styles.title}>Tableau de bord</Text>
            </View>

            {/* Time indicator */}
            <GlassCard variant="light" elevation="sm" padding={12} borderRadius={12}>
              <View style={styles.timeContainer}>
                <Text style={styles.timeLabel}>Aujourd'hui</Text>
                <Text style={styles.timeValue}>
                  {new Date().toLocaleDateString('fr-FR', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  })}
                </Text>
              </View>
            </GlassCard>
          </View>
        </View>

        {/* Quick Stats Grid */}
        <View style={styles.statsGrid}>
          {quickStats.map((stat, index) => renderStatCard(stat, index))}
        </View>

        {/* Activity Section */}
        <Animated.View
          style={[
            styles.section,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={styles.sectionTitle}>Activité récente</Text>
          <GlassCard variant="frosted" elevation="md">
            <View style={styles.activityPlaceholder}>
              <Text style={styles.placeholderText}>🚀 Chargement de l'activité...</Text>
            </View>
          </GlassCard>
        </Animated.View>

        {/* Pipeline Preview */}
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
            <TouchableOpacity onPress={() => navigation.navigate('Pipeline')}>
              <Text style={styles.seeAllButton}>Voir tout →</Text>
            </TouchableOpacity>
          </View>

          <GlassCard variant="frosted" elevation="md">
            <View style={styles.pipelinePlaceholder}>
              <Text style={styles.placeholderText}>📊 Visualisation du pipeline</Text>
            </View>
          </GlassCard>
        </Animated.View>
      </ScrollView>
    </View>
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
    marginBottom: glassTheme.spacing.xl,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greeting: {
    ...glassTheme.typography.body,
    color: glassTheme.colors.text.secondary,
    marginBottom: 4,
  },
  title: {
    ...glassTheme.typography.displayMedium,
    color: glassTheme.colors.text.primary,
  },
  timeContainer: {
    alignItems: 'center',
    minWidth: 80,
  },
  timeLabel: {
    ...glassTheme.typography.caption,
    color: glassTheme.colors.text.tertiary,
    marginBottom: 2,
  },
  timeValue: {
    ...glassTheme.typography.bodySmall,
    fontWeight: '600',
    color: glassTheme.colors.text.primary,
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: glassTheme.spacing.md,
    marginBottom: glassTheme.spacing.xl,
  },
  statCardWrapper: {
    width: SCREEN_WIDTH > 768 ? 'calc(50% - 8px)' : '100%',
    minWidth: 280,
  },
  statCardTouchable: {
    width: '100%',
  },
  statCardContent: {
    padding: glassTheme.spacing.lg,
    minHeight: 140,
  },
  statIconContainer: {
    marginBottom: glassTheme.spacing.sm,
  },
  statIcon: {
    fontSize: 32,
  },
  statValueContainer: {
    marginBottom: glassTheme.spacing.md,
  },
  statValue: {
    ...glassTheme.typography.displaySmall,
    color: glassTheme.colors.text.primary,
    marginBottom: 4,
  },
  statLabel: {
    ...glassTheme.typography.bodySmall,
    color: glassTheme.colors.text.secondary,
  },
  statChangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  changeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  changeValue: {
    ...glassTheme.typography.captionBold,
    fontWeight: '700',
  },
  changeLabel: {
    ...glassTheme.typography.caption,
    color: glassTheme.colors.text.tertiary,
  },

  // Sections
  section: {
    marginBottom: glassTheme.spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: glassTheme.spacing.md,
  },
  sectionTitle: {
    ...glassTheme.typography.h2,
    color: glassTheme.colors.text.primary,
  },
  seeAllButton: {
    ...glassTheme.typography.bodySmall,
    color: glassTheme.colors.primary,
    fontWeight: '600',
  },

  // Placeholders
  activityPlaceholder: {
    padding: glassTheme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  pipelinePlaceholder: {
    padding: glassTheme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 300,
  },
  placeholderText: {
    ...glassTheme.typography.body,
    color: glassTheme.colors.text.tertiary,
  },
});
