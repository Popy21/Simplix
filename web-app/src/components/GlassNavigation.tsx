import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
  Animated,
  Dimensions,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { BlurView } from 'expo-blur';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { glassTheme } from '../theme/glassTheme';
import {
  ChartIcon,
  TrendingUpIcon,
  CheckCircleIcon,
  UsersIcon,
  FileTextIcon,
  PackageIcon,
  DollarIcon,
  UserIcon,
} from './Icons';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const NAV_WIDTH = SCREEN_WIDTH > 768 ? 280 : 72;
const IS_LARGE_SCREEN = SCREEN_WIDTH > 768;

interface NavItem {
  name: keyof RootStackParamList;
  label: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  badge?: number;
  gradient?: [string, string];
}

const navigationItems: NavItem[] = [
  {
    name: 'Dashboard',
    label: 'Tableau de bord',
    icon: ChartIcon,
    gradient: ['#007AFF', '#5AC8FA'],
  },
  {
    name: 'Pipeline',
    label: 'Pipeline',
    icon: TrendingUpIcon,
    gradient: ['#5856D6', '#AF52DE'],
  },
  {
    name: 'Tasks',
    label: 'Tâches',
    icon: CheckCircleIcon,
    badge: 3,
    gradient: ['#FF9500', '#FFCC00'],
  },
  {
    name: 'Contacts',
    label: 'Contacts',
    icon: UsersIcon,
    gradient: ['#34C759', '#30D158'],
  },
  {
    name: 'Invoices',
    label: 'Factures',
    icon: FileTextIcon,
    gradient: ['#FF2D55', '#FF375F'],
  },
  {
    name: 'Products',
    label: 'Produits',
    icon: PackageIcon,
    gradient: ['#AF52DE', '#BF5AF2'],
  },
  {
    name: 'Sales',
    label: 'Ventes',
    icon: DollarIcon,
    gradient: ['#34C759', '#30D158'],
  },
];

export default function GlassNavigation() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const [isExpanded, setIsExpanded] = useState(IS_LARGE_SCREEN);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const handleLogout = async () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'Déconnexion',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('token');
              await AsyncStorage.removeItem('userId');
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            } catch (error) {
              console.error('Error logging out:', error);
              Alert.alert('Erreur', 'Impossible de se déconnecter');
            }
          },
        },
      ]
    );
  };

  const renderNavItem = (item: NavItem, index: number) => {
    const Icon = item.icon;
    const isActive = route.name === item.name;
    const isHovered = hoverIndex === index;

    return (
      <TouchableOpacity
        key={item.name}
        style={[
          styles.navItem,
          isActive && styles.navItemActive,
          isHovered && styles.navItemHovered,
        ]}
        onPress={() => navigation.navigate(item.name)}
        onPressIn={() => setHoverIndex(index)}
        onPressOut={() => setHoverIndex(null)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, isActive && styles.iconContainerActive]}>
          {isActive && (
            <View
              style={[
                styles.iconGlow,
                {
                  backgroundColor: item.gradient ? item.gradient[0] : glassTheme.colors.primary,
                },
              ]}
            />
          )}
          <Icon
            size={isExpanded ? 22 : 24}
            color={isActive ? glassTheme.colors.primary : glassTheme.colors.text.secondary}
          />
          {item.badge !== undefined && item.badge > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.badge}</Text>
            </View>
          )}
        </View>

        {isExpanded && (
          <View style={styles.labelContainer}>
            <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
              {item.label}
            </Text>
            {isActive && <View style={styles.activeIndicator} />}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { width: isExpanded ? NAV_WIDTH : 72 }]}>
      {/* Glass background with blur */}
      {Platform.OS === 'ios' ? (
        <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.androidGlass]} />
      )}

      {/* Navigation content */}
      <View style={styles.content}>
        {/* Logo/Brand */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>S</Text>
            </View>
            {isExpanded && (
              <View style={styles.brandTextContainer}>
                <Text style={styles.brandText}>Simplix</Text>
                <Text style={styles.brandSubtext}>CRM</Text>
              </View>
            )}
          </View>
        </View>

        {/* Navigation items */}
        <View style={styles.navList}>{navigationItems.map(renderNavItem)}</View>

        {/* User profile section */}
        <View style={styles.footer}>
          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.profileSection}
            onPress={() => navigation.navigate('Profile')}
            activeOpacity={0.7}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>AB</Text>
            </View>
            {isExpanded && (
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>Adel B.</Text>
                <Text style={styles.profileRole}>Administrateur</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Text style={styles.logoutIcon}>⏻</Text>
            {isExpanded && <Text style={styles.logoutText}>Déconnexion</Text>}
          </TouchableOpacity>
        </View>
      </View>

      {/* Border shimmer effect */}
      <View style={styles.borderShimmer} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: '100%',
    position: 'relative',
    ...glassTheme.shadows.lg,
  },
  androidGlass: {
    backgroundColor: glassTheme.glass.frosted.backgroundColor,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.2)',
  },
  content: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 60 : 24,
    paddingBottom: 24,
  },

  // Header
  header: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: glassTheme.radius.md,
    backgroundColor: glassTheme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...glassTheme.shadows.md,
  },
  logoText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  brandTextContainer: {
    flex: 1,
  },
  brandText: {
    ...glassTheme.typography.h3,
    color: glassTheme.colors.text.primary,
  },
  brandSubtext: {
    ...glassTheme.typography.caption,
    color: glassTheme.colors.text.tertiary,
  },

  // Navigation list
  navList: {
    flex: 1,
    paddingHorizontal: 12,
    gap: 4,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: glassTheme.radius.md,
    gap: 12,
    backgroundColor: 'transparent',
    transition: 'all 0.2s ease',
  },
  navItemActive: {
    backgroundColor: 'rgba(0, 122, 255, 0.08)',
  },
  navItemHovered: {
    backgroundColor: 'rgba(0, 122, 255, 0.04)',
  },
  iconContainer: {
    position: 'relative',
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainerActive: {
    // Active state
  },
  iconGlow: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    opacity: 0.15,
    ...glassTheme.shadows.glow,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: glassTheme.colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    ...glassTheme.typography.caption,
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  labelContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navLabel: {
    ...glassTheme.typography.body,
    color: glassTheme.colors.text.secondary,
    fontWeight: '500',
  },
  navLabelActive: {
    color: glassTheme.colors.primary,
    fontWeight: '600',
  },
  activeIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: glassTheme.colors.primary,
  },

  // Footer
  footer: {
    paddingHorizontal: 12,
    paddingTop: 16,
    gap: 12,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    marginBottom: 8,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: glassTheme.radius.md,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    gap: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: glassTheme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    ...glassTheme.typography.bodySmall,
    fontWeight: '600',
    color: glassTheme.colors.text.primary,
  },
  profileRole: {
    ...glassTheme.typography.caption,
    color: glassTheme.colors.text.tertiary,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: glassTheme.radius.md,
    backgroundColor: 'rgba(255, 59, 48, 0.08)',
    gap: 12,
  },
  logoutIcon: {
    fontSize: 20,
    color: glassTheme.colors.error,
  },
  logoutText: {
    ...glassTheme.typography.bodySmall,
    fontWeight: '600',
    color: glassTheme.colors.error,
  },

  // Border shimmer
  borderShimmer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
});
