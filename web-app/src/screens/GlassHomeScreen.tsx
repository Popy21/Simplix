import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { glassTheme } from '../theme/glassTheme';
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
} from '../components/Icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type HomeScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

interface MenuItem {
  id: string;
  title: string;
  subtitle: string;
  screen: keyof RootStackParamList;
  icon: React.ComponentType<{ size: number; color: string }>;
  gradient: [string, string];
  badge?: string;
}

const menuItems: MenuItem[] = [
  {
    id: '1',
    title: 'Tableau de bord',
    subtitle: 'Vue d\'ensemble et statistiques',
    screen: 'Dashboard',
    icon: ChartIcon,
    gradient: ['#007AFF', '#5AC8FA'],
  },
  {
    id: '2',
    title: 'Pipeline',
    subtitle: 'Gestion des opportunités',
    screen: 'Pipeline',
    icon: TrendingUpIcon,
    gradient: ['#5856D6', '#AF52DE'],
  },
  {
    id: '3',
    title: 'Tâches',
    subtitle: 'Suivi des actions',
    screen: 'Tasks',
    icon: CheckCircleIcon,
    gradient: ['#FF9500', '#FFCC00'],
    badge: '3',
  },
  {
    id: '4',
    title: 'Contacts',
    subtitle: 'Base de données clients',
    screen: 'Contacts',
    icon: UsersIcon,
    gradient: ['#34C759', '#30D158'],
  },
  {
    id: '5',
    title: 'Factures',
    subtitle: 'Gestion comptable',
    screen: 'Invoices',
    icon: FileTextIcon,
    gradient: ['#FF2D55', '#FF375F'],
  },
  {
    id: '6',
    title: 'Produits',
    subtitle: 'Catalogue et tarifs',
    screen: 'Products',
    icon: PackageIcon,
    gradient: ['#AF52DE', '#BF5AF2'],
  },
  {
    id: '7',
    title: 'Ventes',
    subtitle: 'Historique des transactions',
    screen: 'Sales',
    icon: DollarIcon,
    gradient: ['#007AFF', '#5AC8FA'],
  },
  {
    id: '8',
    title: 'Paramètres',
    subtitle: 'Configuration de l\'application',
    screen: 'Profile',
    icon: SettingsIcon,
    gradient: ['#8E8E93', '#AEAEB2'],
  },
];

export default function GlassHomeScreen({ navigation }: HomeScreenProps) {
  const renderMenuItem = (item: MenuItem) => {
    const Icon = item.icon;

    return (
      <TouchableOpacity
        key={item.id}
        onPress={() => navigation.navigate(item.screen)}
        activeOpacity={0.9}
        style={styles.menuItemWrapper}
      >
        <GlassCard variant="frosted" elevation="md" padding={0} glow glowColor={item.gradient[0]}>
          <LinearGradient
            colors={[...item.gradient.map(c => c + '10')]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          <View style={styles.menuItemContent}>
            <View style={styles.menuItemHeader}>
              <View
                style={[
                  styles.iconContainer,
                  {
                    backgroundColor: item.gradient[0] + '20',
                  },
                ]}
              >
                <Icon size={28} color={item.gradient[0]} />
              </View>

              {item.badge && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.badge}</Text>
                </View>
              )}
            </View>

            <View style={styles.menuItemText}>
              <Text style={styles.menuItemTitle}>{item.title}</Text>
              <Text style={styles.menuItemSubtitle}>{item.subtitle}</Text>
            </View>

            <View style={styles.arrowContainer}>
              <Text style={styles.arrow}>→</Text>
            </View>
          </View>
        </GlassCard>
      </TouchableOpacity>
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
            <Text style={styles.subtitle}>Bienvenue dans votre espace de gestion</Text>
          </View>

          {/* Menu Grid */}
          <View style={styles.menuGrid}>{menuItems.map(renderMenuItem)}</View>

          {/* Quick Stats Footer */}
          <GlassCard variant="light" elevation="sm" style={styles.footer}>
            <View style={styles.footerContent}>
              <View style={styles.footerStat}>
                <Text style={styles.footerStatValue}>24</Text>
                <Text style={styles.footerStatLabel}>Tâches en cours</Text>
              </View>
              <View style={styles.footerDivider} />
              <View style={styles.footerStat}>
                <Text style={styles.footerStatValue}>156</Text>
                <Text style={styles.footerStatLabel}>Contacts</Text>
              </View>
              <View style={styles.footerDivider} />
              <View style={styles.footerStat}>
                <Text style={styles.footerStatValue}>12</Text>
                <Text style={styles.footerStatLabel}>Deals actifs</Text>
              </View>
            </View>
          </GlassCard>
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
    marginBottom: glassTheme.spacing.xl,
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

  // Menu Grid
  menuGrid: {
    gap: glassTheme.spacing.md,
    marginBottom: glassTheme.spacing.xl,
  },
  menuItemWrapper: {
    width: '100%',
  },
  menuItemContent: {
    padding: glassTheme.spacing.lg,
    minHeight: 100,
  },
  menuItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: glassTheme.spacing.md,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    backgroundColor: glassTheme.colors.error,
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  badgeText: {
    ...glassTheme.typography.caption,
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  menuItemText: {
    marginBottom: glassTheme.spacing.sm,
  },
  menuItemTitle: {
    ...glassTheme.typography.h2,
    color: glassTheme.colors.text.primary,
    marginBottom: 4,
  },
  menuItemSubtitle: {
    ...glassTheme.typography.bodySmall,
    color: glassTheme.colors.text.tertiary,
  },
  arrowContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  arrow: {
    fontSize: 20,
    color: glassTheme.colors.text.tertiary,
  },

  // Footer
  footer: {
    marginTop: glassTheme.spacing.lg,
  },
  footerContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: glassTheme.spacing.md,
  },
  footerStat: {
    flex: 1,
    alignItems: 'center',
  },
  footerStatValue: {
    ...glassTheme.typography.displaySmall,
    color: glassTheme.colors.primary,
    marginBottom: 4,
  },
  footerStatLabel: {
    ...glassTheme.typography.caption,
    color: glassTheme.colors.text.tertiary,
  },
  footerDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
  },
});
