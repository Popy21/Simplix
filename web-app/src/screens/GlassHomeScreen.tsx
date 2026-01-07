import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
  LayoutAnimation,
  UIManager,
} from 'react-native';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { glassTheme } from '../theme/glassTheme';
import { isMobile, layout, responsiveSpacing, responsiveFontSizes } from '../theme/responsive';
import GlassCard from '../components/GlassCard';
import GlassLayout from '../components/GlassLayout';
import {
  ChartIcon,
  TrendingUpIcon,
  CheckCircleIcon,
  UsersIcon,
  FileTextIcon,
  PackageIcon,
  DollarIcon,
  SettingsIcon,
  BarChartIcon,
  GridIcon,
  TargetIcon,
  BriefcaseIcon,
  SendIcon,
  ZapIcon,
  RepeatIcon,
  ShoppingCartIcon,
  TruckIcon,
  FolderIcon,
  CopyIcon,
  PieChartIcon,
  LayersIcon,
  ShieldIcon,
  WebhookIcon,
  MailOpenIcon,
  CreditCard2Icon,
} from '../components/Icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

type HomeScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

interface MenuCategory {
  id: string;
  title: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  gradient: [string, string];
  items: MenuItem[];
}

interface MenuItem {
  id: string;
  title: string;
  subtitle: string;
  screen: keyof RootStackParamList;
  icon: React.ComponentType<{ size: number; color: string }>;
  badge?: string;
  isNew?: boolean;
}

const menuCategories: MenuCategory[] = [
  {
    id: 'core',
    title: 'Vue d\'ensemble',
    icon: GridIcon,
    gradient: ['#007AFF', '#5AC8FA'],
    items: [
      {
        id: 'dashboard',
        title: 'Tableau de bord',
        subtitle: 'Vue d\'ensemble et KPIs',
        screen: 'Dashboard',
        icon: ChartIcon,
      },
      {
        id: 'analytics',
        title: 'Analytique',
        subtitle: 'Rapports et statistiques',
        screen: 'Analytics',
        icon: BarChartIcon,
      },
      {
        id: 'pilotage',
        title: 'Pilotage',
        subtitle: 'Indicateurs de performance',
        screen: 'Pilotage',
        icon: PieChartIcon,
      },
    ],
  },
  {
    id: 'sales',
    title: 'Ventes & CRM',
    icon: TargetIcon,
    gradient: ['#5856D6', '#AF52DE'],
    items: [
      {
        id: 'pipeline',
        title: 'Pipeline',
        subtitle: 'Gestion des opportunités',
        screen: 'Pipeline',
        icon: TrendingUpIcon,
        badge: '12',
      },
      {
        id: 'contacts',
        title: 'Contacts',
        subtitle: 'Base de données clients',
        screen: 'Contacts',
        icon: UsersIcon,
      },
      {
        id: 'deals',
        title: 'Affaires',
        subtitle: 'Suivi des deals',
        screen: 'Deals',
        icon: BriefcaseIcon,
      },
      {
        id: 'leads',
        title: 'Leads',
        subtitle: 'Gestion des prospects',
        screen: 'Leads',
        icon: TargetIcon,
      },
    ],
  },
  {
    id: 'operations',
    title: 'Opérations',
    icon: LayersIcon,
    gradient: ['#FF9500', '#FFCC00'],
    items: [
      {
        id: 'tasks',
        title: 'Tâches',
        subtitle: 'Suivi des actions',
        screen: 'Tasks',
        icon: CheckCircleIcon,
        badge: '7',
      },
      {
        id: 'sales',
        title: 'Ventes',
        subtitle: 'Historique des transactions',
        screen: 'Sales',
        icon: DollarIcon,
      },
      {
        id: 'invoices',
        title: 'Factures',
        subtitle: 'Gestion comptable',
        screen: 'Invoices',
        icon: FileTextIcon,
      },
      {
        id: 'products',
        title: 'Produits',
        subtitle: 'Catalogue et tarifs',
        screen: 'Products',
        icon: PackageIcon,
      },
    ],
  },
  {
    id: 'finance',
    title: 'Finance',
    icon: DollarIcon,
    gradient: ['#34C759', '#30D158'],
    items: [
      {
        id: 'stripe-payments',
        title: 'Paiements Stripe',
        subtitle: 'Encaissements en ligne',
        screen: 'Dashboard',
        icon: CreditCard2Icon,
        isNew: true,
      },
      {
        id: 'expenses',
        title: 'Dépenses',
        subtitle: 'Gestion des frais',
        screen: 'Expenses',
        icon: ShoppingCartIcon,
      },
      {
        id: 'suppliers',
        title: 'Fournisseurs',
        subtitle: 'Base fournisseurs',
        screen: 'Suppliers',
        icon: TruckIcon,
      },
    ],
  },
  {
    id: 'automation',
    title: 'Automatisation',
    icon: ZapIcon,
    gradient: ['#FF2D55', '#FF375F'],
    items: [
      {
        id: 'workflows',
        title: 'Workflows',
        subtitle: 'Automatisation des processus',
        screen: 'Workflows',
        icon: RepeatIcon,
        isNew: true,
      },
      {
        id: 'email-campaigns',
        title: 'Email Marketing',
        subtitle: 'Campagnes automatisées',
        screen: 'Dashboard',
        icon: MailOpenIcon,
        isNew: true,
      },
      {
        id: 'webhooks',
        title: 'Webhooks',
        subtitle: 'Intégrations temps réel',
        screen: 'Dashboard',
        icon: WebhookIcon,
        isNew: true,
      },
      {
        id: 'emails',
        title: 'Emails',
        subtitle: 'Campagnes et templates',
        screen: 'Emails',
        icon: SendIcon,
      },
      {
        id: 'documents',
        title: 'Documents',
        subtitle: 'Gestion documentaire',
        screen: 'Documents',
        icon: FolderIcon,
      },
      {
        id: 'templates',
        title: 'Templates',
        subtitle: 'Modèles de documents',
        screen: 'Templates',
        icon: CopyIcon,
      },
    ],
  },
  {
    id: 'settings',
    title: 'Configuration',
    icon: SettingsIcon,
    gradient: ['#8E8E93', '#AEAEB2'],
    items: [
      {
        id: 'security-2fa',
        title: 'Sécurité 2FA',
        subtitle: 'Authentification à 2 facteurs',
        screen: 'Profile',
        icon: ShieldIcon,
        isNew: true,
      },
      {
        id: 'teams',
        title: 'Équipes',
        subtitle: 'Gestion des utilisateurs',
        screen: 'Teams',
        icon: UsersIcon,
      },
      {
        id: 'profile',
        title: 'Profil',
        subtitle: 'Paramètres personnels',
        screen: 'Profile',
        icon: SettingsIcon,
      },
    ],
  },
];

export default function GlassHomeScreen({ navigation }: HomeScreenProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>('core');

  const toggleCategory = (categoryId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedCategory(expandedCategory === categoryId ? null : categoryId);
  };

  const renderCategoryHeader = (category: MenuCategory) => {
    const Icon = category.icon;
    const isExpanded = expandedCategory === category.id;

    return (
      <TouchableOpacity
        key={category.id}
        onPress={() => toggleCategory(category.id)}
        activeOpacity={0.8}
        style={styles.categoryHeader}
      >
        <GlassCard variant="frosted" elevation="md" glow glowColor={category.gradient[0]} borderRadius={24} padding={20}>
          <LinearGradient
            colors={[category.gradient[0] + '35', category.gradient[1] + '35'] as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, { borderRadius: 24 }]}
          />

          <View style={styles.categoryHeaderContent}>
            <View style={styles.categoryLeft}>
              <View
                style={[
                  styles.categoryIconContainer,
                  { backgroundColor: category.gradient[0] + '20' },
                ]}
              >
                <Icon size={28} color={category.gradient[0]} />
              </View>

              <View>
                <Text style={styles.categoryTitle}>{category.title}</Text>
                <Text style={styles.categorySubtitle}>
                  {category.items.length} modules
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.chevron,
                { transform: [{ rotate: isExpanded ? '180deg' : '0deg' }] },
              ]}
            >
              <Text style={styles.chevronText}>▼</Text>
            </View>
          </View>
        </GlassCard>
      </TouchableOpacity>
    );
  };

  const renderMenuItem = (item: MenuItem, categoryGradient: [string, string], index: number, categoryId: string) => {
    const Icon = item.icon;

    return (
      <TouchableOpacity
        key={`${categoryId}-${item.id}`}
        onPress={() => navigation.navigate(item.screen as any)}
        activeOpacity={0.9}
        style={styles.menuItemWrapper}
      >
        <GlassCard
          variant="frosted"
          elevation="md"
          glow
          glowColor={categoryGradient[0]}
          animated={true}
          animationDelay={index * 50}
          borderRadius={20}
          padding={18}
        >
          <LinearGradient
            colors={[categoryGradient[0] + '30', categoryGradient[1] + '30'] as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, { borderRadius: 20 }]}
          />

          <View style={styles.menuItemContent}>
            <View style={styles.menuItemLeft}>
              <View
                style={[
                  styles.menuIconContainer,
                  { backgroundColor: categoryGradient[0] + '15' },
                ]}
              >
                <Icon size={24} color={categoryGradient[0]} />
              </View>

              <View style={styles.menuItemText}>
                <View style={styles.menuItemTitleRow}>
                  <Text style={styles.menuItemTitle}>{item.title}</Text>
                  {item.isNew && (
                    <View style={styles.newBadge}>
                      <Text style={styles.newBadgeText}>NEW</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.menuItemSubtitle}>{item.subtitle}</Text>
              </View>
            </View>

            <View style={styles.menuItemRight}>
              {item.badge && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.badge}</Text>
                </View>
              )}
              <Text style={styles.arrow}>→</Text>
            </View>
          </View>
        </GlassCard>
      </TouchableOpacity>
    );
  };

  const renderCategory = (category: MenuCategory) => {
    const isExpanded = expandedCategory === category.id;

    return (
      <View key={category.id} style={styles.categoryWrapper}>
        {renderCategoryHeader(category)}

        {isExpanded && (
          <View style={styles.categoryItems}>
            {category.items.map((item, index) => renderMenuItem(item, category.gradient, index, category.id))}
          </View>
        )}
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
            <Text style={styles.title}>Simplix CRM</Text>
            <Text style={styles.subtitle}>
              Plateforme IA Complète - Paiements, Automatisation & Marketing
            </Text>
          </View>

          {/* Quick Stats */}
          <GlassCard variant="frosted" elevation="lg" glow glowColor="#007AFF" borderRadius={24} padding={24} style={styles.statsCard}>
            <LinearGradient
              colors={['#007AFF15', '#5AC8FA15']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[StyleSheet.absoluteFill, { borderRadius: 24 }]}
            />
            <View style={styles.statsContent}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>24</Text>
                <Text style={styles.statLabel}>Tâches actives</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={styles.statValue}>156</Text>
                <Text style={styles.statLabel}>Contacts</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={styles.statValue}>12</Text>
                <Text style={styles.statLabel}>Deals ouverts</Text>
              </View>
            </View>
          </GlassCard>

          {/* Categories */}
          <View style={styles.categoriesContainer}>
            {menuCategories.map(renderCategory)}
          </View>
        </ScrollView>
      </View>
    </GlassLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    ...(isWeb ? {
      background: `
        radial-gradient(at 20% 20%, rgba(99, 102, 241, 0.2) 0px, transparent 50%),
        radial-gradient(at 80% 10%, rgba(236, 72, 153, 0.15) 0px, transparent 50%),
        radial-gradient(at 10% 80%, rgba(6, 182, 212, 0.12) 0px, transparent 50%),
        radial-gradient(at 90% 90%, rgba(139, 92, 246, 0.12) 0px, transparent 50%),
        linear-gradient(135deg, #f0f4ff 0%, #e8f0fe 50%, #f5f0ff 100%)
      `,
    } : {}),
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: layout.contentPadding,
    paddingTop: isMobile ? responsiveSpacing.md : (Platform.OS === 'ios' ? 60 : 24),
  },

  // Header - Glass effect
  header: {
    marginBottom: responsiveSpacing.lg,
    ...(isWeb ? {
      padding: 24,
      borderRadius: 24,
      backgroundColor: 'rgba(255, 255, 255, 0.15)',
      backdropFilter: 'blur(30px) saturate(200%)',
      WebkitBackdropFilter: 'blur(30px) saturate(200%)',
      border: '1px solid rgba(255, 255, 255, 0.25)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.06), inset 0 1px 1px rgba(255, 255, 255, 0.4)',
    } : {}),
  },
  title: {
    fontSize: responsiveFontSizes.displayMedium,
    fontWeight: '700',
    color: glassTheme.colors.text.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: responsiveFontSizes.body,
    color: glassTheme.colors.text.tertiary,
  },

  // Stats Card - Glass effect
  statsCard: {
    marginBottom: glassTheme.spacing.xl,
    ...(isWeb ? {
      backgroundColor: 'rgba(255, 255, 255, 0.12)',
      backdropFilter: 'blur(30px) saturate(200%)',
      WebkitBackdropFilter: 'blur(30px) saturate(200%)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      boxShadow: '0 12px 40px rgba(0, 102, 255, 0.08), inset 0 1px 1px rgba(255, 255, 255, 0.3)',
    } : {}),
  },
  statsContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: glassTheme.spacing.md,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    ...(isWeb ? {
      padding: 12,
      borderRadius: 16,
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      backdropFilter: 'blur(10px)',
      margin: 4,
    } : {}),
  },
  statValue: {
    ...glassTheme.typography.displaySmall,
    color: glassTheme.colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    ...glassTheme.typography.caption,
    color: glassTheme.colors.text.tertiary,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    ...(isWeb ? {
      boxShadow: '0 0 8px rgba(255, 255, 255, 0.5)',
    } : {}),
  },

  // Categories - Glass container
  categoriesContainer: {
    gap: glassTheme.spacing.lg,
    ...(isWeb ? {
      padding: 16,
      borderRadius: 28,
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
      backdropFilter: 'blur(20px) saturate(180%)',
      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      border: '1px solid rgba(255, 255, 255, 0.15)',
    } : {}),
  },
  categoryWrapper: {
    gap: glassTheme.spacing.sm,
    ...(isWeb ? {
      padding: 8,
      borderRadius: 20,
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
    } : {}),
  },

  // Category Header
  categoryHeader: {
    marginBottom: 0,
    ...(isWeb ? {
      transition: 'all 0.3s ease',
    } : {}),
  },
  categoryHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: glassTheme.spacing.md,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: glassTheme.spacing.md,
  },
  categoryIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
    ...(isWeb ? {
      backdropFilter: 'blur(10px)',
      boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.3)',
    } : {}),
  },
  categoryTitle: {
    ...glassTheme.typography.h2,
    color: glassTheme.colors.text.primary,
    marginBottom: 2,
  },
  categorySubtitle: {
    ...glassTheme.typography.caption,
    color: glassTheme.colors.text.tertiary,
  },
  chevron: {
    marginRight: 10,
  },
  chevronText: {
    fontSize: 12,
    color: glassTheme.colors.text.tertiary,
  },

  // Category Items - Glass container
  categoryItems: {
    gap: glassTheme.spacing.sm,
    paddingLeft: glassTheme.spacing.md,
    ...(isWeb ? {
      padding: 12,
      borderRadius: 16,
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      backdropFilter: 'blur(10px)',
    } : {}),
  },

  // Menu Item - Glass hover effect
  menuItemWrapper: {
    width: '100%',
    ...(isWeb ? {
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    } : {}),
  },
  menuItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: glassTheme.spacing.md,
    flex: 1,
  },
  menuIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
    marginVertical: 8,
    ...(isWeb ? {
      backdropFilter: 'blur(8px)',
      boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.25)',
    } : {}),
  },
  menuItemText: {
    flex: 1,
  },
  menuItemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  menuItemTitle: {
    ...glassTheme.typography.bodyLarge,
    color: glassTheme.colors.text.primary,
    fontWeight: '600',
  },
  menuItemSubtitle: {
    ...glassTheme.typography.caption,
    color: glassTheme.colors.text.tertiary,
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: glassTheme.spacing.sm,
    marginRight: 10,
  },
  badge: {
    backgroundColor: glassTheme.colors.error,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    ...(isWeb ? {
      backdropFilter: 'blur(8px)',
      boxShadow: '0 2px 8px rgba(255, 59, 48, 0.3)',
    } : {}),
  },
  badgeText: {
    ...glassTheme.typography.caption,
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  newBadge: {
    backgroundColor: glassTheme.colors.success,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    ...(isWeb ? {
      backdropFilter: 'blur(8px)',
      boxShadow: '0 2px 8px rgba(52, 199, 89, 0.3)',
    } : {}),
  },
  newBadgeText: {
    ...glassTheme.typography.caption,
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
  arrow: {
    fontSize: 18,
    color: glassTheme.colors.text.tertiary,
    ...(isWeb ? {
      transition: 'transform 0.2s ease',
    } : {}),
  },
});
