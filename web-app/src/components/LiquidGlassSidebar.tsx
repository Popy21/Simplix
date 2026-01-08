import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ScrollView,
  Animated,
  Dimensions,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ChartIcon,
  TrendingUpIcon,
  CheckCircleIcon,
  UsersIcon,
  FileTextIcon,
  PackageIcon,
  DollarIcon,
  UserIcon,
  GridIcon,
  BarChartIcon,
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
  SettingsIcon,
  LogOutIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
} from './Icons';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const SIDEBAR_EXPANDED = 280;
const SIDEBAR_COLLAPSED = 78;

// Inject premium CSS animations for web
if (isWeb && typeof document !== 'undefined') {
  const styleId = 'liquid-glass-sidebar-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=SF+Pro+Display:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap');

      :root {
        --glass-bg: rgba(255, 255, 255, 0.08);
        --glass-border: rgba(255, 255, 255, 0.12);
        --glass-highlight: rgba(255, 255, 255, 0.25);
        --prism-1: rgba(99, 102, 241, 0.15);
        --prism-2: rgba(168, 85, 247, 0.12);
        --prism-3: rgba(236, 72, 153, 0.10);
      }

      @keyframes liquidShimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }

      @keyframes gentlePulse {
        0%, 100% { opacity: 0.6; transform: scale(1); }
        50% { opacity: 0.8; transform: scale(1.05); }
      }

      @keyframes floatOrb {
        0%, 100% { transform: translateY(0) translateX(0); }
        25% { transform: translateY(-15px) translateX(8px); }
        50% { transform: translateY(-8px) translateX(-5px); }
        75% { transform: translateY(-20px) translateX(3px); }
      }

      @keyframes prismRotate {
        0% { filter: hue-rotate(0deg); }
        100% { filter: hue-rotate(360deg); }
      }

      @keyframes slideIn {
        from { transform: translateX(-20px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }

      @keyframes activeGlow {
        0%, 100% { box-shadow: 0 0 20px rgba(99, 102, 241, 0.3); }
        50% { box-shadow: 0 0 35px rgba(99, 102, 241, 0.5); }
      }

      .liquid-glass-sidebar {
        font-family: 'SF Pro Display', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        -webkit-font-smoothing: antialiased;
      }

      .liquid-sidebar-item {
        position: relative;
        transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
      }

      .liquid-sidebar-item:hover {
        transform: translateX(6px);
        background: rgba(255, 255, 255, 0.12);
      }

      .liquid-sidebar-item:hover::before {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: inherit;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
        background-size: 200% 100%;
        animation: liquidShimmer 1.5s ease-in-out;
      }

      .liquid-sidebar-item-active {
        background: linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(168, 85, 247, 0.15)) !important;
        animation: activeGlow 3s ease-in-out infinite;
      }

      .liquid-sidebar-item-active::after {
        content: '';
        position: absolute;
        left: 0;
        top: 50%;
        transform: translateY(-50%);
        width: 4px;
        height: 70%;
        border-radius: 0 4px 4px 0;
        background: linear-gradient(180deg, #6366f1, #a855f7);
      }

      .liquid-orb {
        animation: floatOrb 12s ease-in-out infinite;
      }

      .liquid-orb-prism {
        animation: floatOrb 15s ease-in-out infinite, prismRotate 30s linear infinite;
      }

      .liquid-logo-glow {
        animation: gentlePulse 4s ease-in-out infinite;
      }

      .liquid-nav-section {
        animation: slideIn 0.5s ease-out backwards;
      }

      .liquid-collapse-btn {
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .liquid-collapse-btn:hover {
        background: rgba(255, 255, 255, 0.15);
        transform: scale(1.1);
      }

      .liquid-profile-card:hover {
        background: rgba(255, 255, 255, 0.12);
        transform: translateY(-2px);
      }

      .liquid-logout-btn:hover {
        background: rgba(239, 68, 68, 0.15) !important;
        border-color: rgba(239, 68, 68, 0.3) !important;
      }

      /* Scrollbar styling */
      .liquid-scroll::-webkit-scrollbar {
        width: 6px;
      }
      .liquid-scroll::-webkit-scrollbar-track {
        background: transparent;
      }
      .liquid-scroll::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.15);
        border-radius: 3px;
      }
      .liquid-scroll::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.25);
      }
    `;
    document.head.appendChild(style);
  }
}

interface NavItem {
  id: string;
  name: keyof RootStackParamList;
  label: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  gradient: [string, string];
  category: string;
}

const navItems: NavItem[] = [
  // Core
  { id: 'home', name: 'Home', label: 'Accueil', icon: GridIcon, gradient: ['#6366f1', '#8b5cf6'], category: 'core' },
  { id: 'dashboard', name: 'Dashboard', label: 'Dashboard', icon: ChartIcon, gradient: ['#06b6d4', '#22d3ee'], category: 'core' },
  { id: 'analytics', name: 'Analytics', label: 'Analytics', icon: BarChartIcon, gradient: ['#8b5cf6', '#a855f7'], category: 'core' },

  // CRM
  { id: 'pipeline', name: 'Pipeline', label: 'Pipeline', icon: TrendingUpIcon, gradient: ['#f59e0b', '#fbbf24'], category: 'crm' },
  { id: 'contacts', name: 'Contacts', label: 'Contacts', icon: UsersIcon, gradient: ['#10b981', '#34d399'], category: 'crm' },
  { id: 'deals', name: 'Deals', label: 'Affaires', icon: BriefcaseIcon, gradient: ['#6366f1', '#818cf8'], category: 'crm' },
  { id: 'leads', name: 'Leads', label: 'Leads', icon: TargetIcon, gradient: ['#ef4444', '#f87171'], category: 'crm' },

  // Operations
  { id: 'tasks', name: 'Tasks', label: 'Taches', icon: CheckCircleIcon, gradient: ['#f59e0b', '#fbbf24'], category: 'ops' },
  { id: 'invoices', name: 'Invoices', label: 'Factures', icon: FileTextIcon, gradient: ['#ec4899', '#f472b6'], category: 'ops' },
  { id: 'products', name: 'Products', label: 'Produits', icon: PackageIcon, gradient: ['#a855f7', '#c084fc'], category: 'ops' },

  // Finance
  { id: 'expenses', name: 'Expenses', label: 'Depenses', icon: ShoppingCartIcon, gradient: ['#ef4444', '#f87171'], category: 'finance' },
  { id: 'suppliers', name: 'Suppliers', label: 'Fournisseurs', icon: TruckIcon, gradient: ['#64748b', '#94a3b8'], category: 'finance' },

  // Settings
  { id: 'profile', name: 'Profile', label: 'Profil', icon: SettingsIcon, gradient: ['#64748b', '#94a3b8'], category: 'settings' },
];

const categoryLabels: Record<string, string> = {
  core: 'Vue d\'ensemble',
  crm: 'CRM & Ventes',
  ops: 'Operations',
  finance: 'Finance',
  settings: 'Configuration',
};

interface LiquidGlassSidebarProps {
  onCollapse?: (collapsed: boolean) => void;
}

export default function LiquidGlassSidebar({ onCollapse }: LiquidGlassSidebarProps) {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const widthAnim = useRef(new Animated.Value(SIDEBAR_EXPANDED)).current;

  useEffect(() => {
    Animated.spring(widthAnim, {
      toValue: isCollapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED,
      useNativeDriver: false,
      friction: 8,
      tension: 40,
    }).start();
    onCollapse?.(isCollapsed);
  }, [isCollapsed]);

  const handleLogout = async () => {
    Alert.alert(
      'Deconnexion',
      'Etes-vous sur de vouloir vous deconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Deconnexion',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('authToken');
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          },
        },
      ]
    );
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const groupedItems = navItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, NavItem[]>);

  const renderNavItem = (item: NavItem, index: number) => {
    const isActive = route.name === item.name;
    const isHovered = hoveredItem === item.id;
    const Icon = item.icon;

    const itemContent = (
      <View style={[
        styles.navItemInner,
        isActive && styles.navItemActive,
      ]}>
        {/* Active gradient background */}
        {isActive && (
          <LinearGradient
            colors={[item.gradient[0] + '30', item.gradient[1] + '20']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        )}

        {/* Icon with gradient when active */}
        <View style={[
          styles.iconWrapper,
          isActive && { backgroundColor: item.gradient[0] + '25' },
        ]}>
          <Icon
            size={22}
            color={isActive ? item.gradient[0] : (isHovered ? '#e2e8f0' : '#94a3b8')}
          />
        </View>

        {/* Label - hidden when collapsed */}
        {!isCollapsed && (
          <Text style={[
            styles.navLabel,
            isActive && { color: '#f8fafc', fontWeight: '600' },
            isHovered && !isActive && { color: '#e2e8f0' },
          ]}>
            {item.label}
          </Text>
        )}

        {/* Active indicator */}
        {isActive && (
          <View style={[styles.activeIndicator, { backgroundColor: item.gradient[0] }]} />
        )}
      </View>
    );

    const touchableProps: any = {
      key: item.id,
      onPress: () => navigation.navigate(item.name as any),
      activeOpacity: 0.8,
      style: styles.navItem,
    };

    if (isWeb) {
      touchableProps.onMouseEnter = () => setHoveredItem(item.id);
      touchableProps.onMouseLeave = () => setHoveredItem(null);
    }

    return (
      <TouchableOpacity {...touchableProps}>
        <View
          // @ts-ignore
          {...(isWeb && {
            className: `liquid-sidebar-item ${isActive ? 'liquid-sidebar-item-active' : ''}`,
          })}
        >
          {itemContent}
        </View>
      </TouchableOpacity>
    );
  };

  const renderCategory = (categoryId: string, items: NavItem[], index: number) => (
    <View
      key={categoryId}
      style={styles.categorySection}
      // @ts-ignore
      {...(isWeb && { className: 'liquid-nav-section' })}
    >
      {!isCollapsed && (
        <Text style={styles.categoryLabel}>{categoryLabels[categoryId]}</Text>
      )}
      <View style={styles.categoryItems}>
        {items.map((item, idx) => renderNavItem(item, idx))}
      </View>
    </View>
  );

  return (
    <Animated.View
      style={[styles.container, { width: widthAnim }]}
      // @ts-ignore
      {...(isWeb && { className: 'liquid-glass-sidebar' })}
    >
      {/* Layered glass background */}
      {Platform.OS === 'ios' ? (
        <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
      ) : (
        <View style={styles.glassBackground}>
          {/* Base layer */}
          <View style={styles.baseLayer} />

          {/* Prism orbs */}
          <View
            style={[styles.prismOrb, styles.prismOrb1]}
            // @ts-ignore
            {...(isWeb && { className: 'liquid-orb-prism' })}
          />
          <View
            style={[styles.prismOrb, styles.prismOrb2]}
            // @ts-ignore
            {...(isWeb && { className: 'liquid-orb' })}
          />
          <View
            style={[styles.prismOrb, styles.prismOrb3]}
            // @ts-ignore
            {...(isWeb && { className: 'liquid-orb-prism' })}
          />

          {/* Crystal edge highlight */}
          <LinearGradient
            colors={['rgba(255,255,255,0.15)', 'transparent', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.edgeHighlight}
          />
        </View>
      )}

      {/* Content */}
      <View style={styles.content}>
        {/* Header / Logo */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Home')}
            style={styles.logoContainer}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#6366f1', '#a855f7', '#ec4899']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logoGradient}
              // @ts-ignore
              {...(isWeb && { className: 'liquid-logo-glow' })}
            >
              <Text style={styles.logoIcon}>S</Text>
            </LinearGradient>
            {!isCollapsed && (
              <View style={styles.logoText}>
                <Text style={styles.logoTitle}>Simplix</Text>
                <Text style={styles.logoSubtitle}>CRM</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Collapse button */}
          <TouchableOpacity
            onPress={toggleCollapse}
            style={styles.collapseBtn}
            // @ts-ignore
            {...(isWeb && { className: 'liquid-collapse-btn' })}
          >
            {isCollapsed ? (
              <ChevronRightIcon size={18} color="#94a3b8" />
            ) : (
              <ChevronLeftIcon size={18} color="#94a3b8" />
            )}
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.1)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.divider}
        />

        {/* Navigation items */}
        <ScrollView
          style={styles.navScroll}
          contentContainerStyle={styles.navContent}
          showsVerticalScrollIndicator={false}
          // @ts-ignore
          {...(isWeb && { className: 'liquid-scroll' })}
        >
          {Object.entries(groupedItems).map(([categoryId, items], index) =>
            renderCategory(categoryId, items, index)
          )}
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.08)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.footerDivider}
          />

          {/* Profile card */}
          <TouchableOpacity
            onPress={() => navigation.navigate('Profile')}
            style={styles.profileCard}
            // @ts-ignore
            {...(isWeb && { className: 'liquid-profile-card' })}
          >
            <LinearGradient
              colors={['#6366f1', '#a855f7']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.profileAvatar}
            >
              <UserIcon size={18} color="#ffffff" />
            </LinearGradient>
            {!isCollapsed && (
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>Utilisateur</Text>
                <Text style={styles.profileRole}>Administrateur</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Logout button */}
          <TouchableOpacity
            onPress={handleLogout}
            style={styles.logoutBtn}
            // @ts-ignore
            {...(isWeb && { className: 'liquid-logout-btn' })}
          >
            <LogOutIcon size={18} color="#f87171" />
            {!isCollapsed && (
              <Text style={styles.logoutText}>Deconnexion</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: '100%',
    position: 'relative',
    overflow: 'hidden',
    ...(isWeb ? {
      backgroundColor: 'rgba(15, 23, 42, 0.85)',
      backdropFilter: 'blur(40px) saturate(180%)',
      borderRight: '1px solid rgba(255, 255, 255, 0.08)',
      boxShadow: '4px 0 40px rgba(0, 0, 0, 0.3), inset -1px 0 0 rgba(255, 255, 255, 0.05)',
    } : {
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      borderRightWidth: 1,
      borderRightColor: 'rgba(255, 255, 255, 0.08)',
    }),
  },
  glassBackground: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  baseLayer: {
    ...StyleSheet.absoluteFillObject,
    ...(isWeb ? {
      background: `
        linear-gradient(180deg,
          rgba(30, 41, 59, 0.9) 0%,
          rgba(15, 23, 42, 0.95) 50%,
          rgba(30, 41, 59, 0.9) 100%
        )
      `,
    } : {
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
    }),
  },
  prismOrb: {
    position: 'absolute',
    borderRadius: 999,
    ...(isWeb ? {
      filter: 'blur(60px)',
    } : {}),
  },
  prismOrb1: {
    width: 200,
    height: 200,
    top: -50,
    left: -50,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
  },
  prismOrb2: {
    width: 150,
    height: 150,
    top: '40%',
    right: -30,
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
  },
  prismOrb3: {
    width: 180,
    height: 180,
    bottom: -40,
    left: -40,
    backgroundColor: 'rgba(236, 72, 153, 0.12)',
  },
  edgeHighlight: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
  content: {
    flex: 1,
    position: 'relative',
    zIndex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 24,
    paddingBottom: 16,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoGradient: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    ...(isWeb ? {
      boxShadow: '0 4px 20px rgba(99, 102, 241, 0.4)',
    } : {
      shadowColor: '#6366f1',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 20,
      elevation: 10,
    }),
  },
  logoIcon: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -1,
  },
  logoText: {
    flexDirection: 'column',
  },
  logoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f8fafc',
    letterSpacing: -0.5,
  },
  logoSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748b',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  collapseBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },

  // Divider
  divider: {
    height: 1,
    marginHorizontal: 16,
    marginBottom: 8,
  },

  // Navigation
  navScroll: {
    flex: 1,
  },
  navContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 24,
  },
  categorySection: {
    gap: 4,
  },
  categoryLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginLeft: 12,
    marginBottom: 8,
  },
  categoryItems: {
    gap: 2,
  },
  navItem: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  navItemInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 12,
    position: 'relative',
  },
  navItemActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
  },
  iconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#94a3b8',
    letterSpacing: -0.2,
    flex: 1,
  },
  activeIndicator: {
    position: 'absolute',
    left: 0,
    top: '20%',
    bottom: '20%',
    width: 3,
    borderRadius: 2,
  },

  // Footer
  footer: {
    paddingHorizontal: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    paddingTop: 8,
    gap: 8,
  },
  footerDivider: {
    height: 1,
    marginBottom: 8,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    gap: 12,
    ...(isWeb ? {
      transition: 'all 0.3s ease',
    } : {}),
  },
  profileAvatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f8fafc',
    letterSpacing: -0.2,
  },
  profileRole: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748b',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.15)',
    gap: 8,
    ...(isWeb ? {
      transition: 'all 0.3s ease',
    } : {}),
  },
  logoutText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#f87171',
  },
});
