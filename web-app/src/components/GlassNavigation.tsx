import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
  ScrollView,
  Modal,
  Dimensions,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { glassTheme } from '../theme/glassTheme';
import GlassCard from './GlassCard';
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
} from './Icons';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const NAV_WIDTH = SCREEN_WIDTH > 768 ? 280 : 72;
const IS_LARGE_SCREEN = SCREEN_WIDTH > 768;

interface NavModule {
  id: string;
  name: keyof RootStackParamList;
  label: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  badge?: number;
  gradient: [string, string];
  category: string;
}

// Tous les modules disponibles
const ALL_MODULES: NavModule[] = [
  // Vue d'ensemble
  { id: 'dashboard', name: 'Dashboard', label: 'Tableau de bord', icon: ChartIcon, gradient: ['#007AFF', '#5AC8FA'], category: 'Vue d\'ensemble' },
  { id: 'analytics', name: 'Analytics', label: 'Analytics', icon: BarChartIcon, gradient: ['#5856D6', '#AF52DE'], category: 'Vue d\'ensemble' },
  { id: 'pilotage', name: 'Pilotage', label: 'Pilotage', icon: PieChartIcon, gradient: ['#FF9500', '#FFCC00'], category: 'Vue d\'ensemble' },

  // Ventes & CRM
  { id: 'pipeline', name: 'Pipeline', label: 'Pipeline', icon: TrendingUpIcon, gradient: ['#5856D6', '#AF52DE'], category: 'Ventes & CRM' },
  { id: 'contacts', name: 'Contacts', label: 'Contacts', icon: UsersIcon, gradient: ['#34C759', '#30D158'], category: 'Ventes & CRM' },
  { id: 'deals', name: 'Deals', label: 'Affaires', icon: BriefcaseIcon, gradient: ['#007AFF', '#5AC8FA'], category: 'Ventes & CRM' },
  { id: 'leads', name: 'Leads', label: 'Leads', icon: TargetIcon, gradient: ['#FF3B30', '#FF6B6B'], category: 'Ventes & CRM' },

  // Opérations
  { id: 'tasks', name: 'Tasks', label: 'Tâches', icon: CheckCircleIcon, gradient: ['#FF9500', '#FFCC00'], category: 'Opérations' },
  { id: 'sales', name: 'Sales', label: 'Ventes', icon: DollarIcon, gradient: ['#34C759', '#30D158'], category: 'Opérations' },
  { id: 'invoices', name: 'Invoices', label: 'Factures', icon: FileTextIcon, gradient: ['#FF2D55', '#FF375F'], category: 'Opérations' },
  { id: 'products', name: 'Products', label: 'Produits', icon: PackageIcon, gradient: ['#AF52DE', '#BF5AF2'], category: 'Opérations' },

  // Finance
  { id: 'expenses', name: 'Expenses', label: 'Dépenses', icon: ShoppingCartIcon, gradient: ['#FF9500', '#FFCC00'], category: 'Finance' },
  { id: 'suppliers', name: 'Suppliers', label: 'Fournisseurs', icon: TruckIcon, gradient: ['#8E8E93', '#AEAEB2'], category: 'Finance' },

  // Automatisation
  { id: 'workflows', name: 'Workflows', label: 'Workflows', icon: RepeatIcon, gradient: ['#5AC8FA', '#007AFF'], category: 'Automatisation' },
  { id: 'emails', name: 'Emails', label: 'Emails', icon: SendIcon, gradient: ['#34C759', '#30D158'], category: 'Automatisation' },
  { id: 'documents', name: 'Documents', label: 'Documents', icon: FolderIcon, gradient: ['#007AFF', '#5AC8FA'], category: 'Automatisation' },
  { id: 'templates', name: 'Templates', label: 'Templates', icon: CopyIcon, gradient: ['#AF52DE', '#BF5AF2'], category: 'Automatisation' },

  // Configuration
  { id: 'teams', name: 'Teams', label: 'Équipes', icon: UsersIcon, gradient: ['#5856D6', '#AF52DE'], category: 'Configuration' },
  { id: 'profile', name: 'Profile', label: 'Profil', icon: SettingsIcon, gradient: ['#8E8E93', '#AEAEB2'], category: 'Configuration' },
];

// Modules par défaut (comme épinglés sur iPhone)
const DEFAULT_PINNED_MODULES = ['dashboard', 'pipeline', 'tasks', 'contacts', 'invoices', 'products'];

export default function GlassNavigation() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const [isExpanded, setIsExpanded] = useState(IS_LARGE_SCREEN);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [customizeModalVisible, setCustomizeModalVisible] = useState(false);
  const [pinnedModuleIds, setPinnedModuleIds] = useState<string[]>(DEFAULT_PINNED_MODULES);
  const [selectedCategory, setSelectedCategory] = useState<string>('Tous');

  useEffect(() => {
    loadPinnedModules();
  }, []);

  const loadPinnedModules = async () => {
    try {
      const saved = await AsyncStorage.getItem('pinnedModules');
      if (saved) {
        setPinnedModuleIds(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading pinned modules:', error);
    }
  };

  const savePinnedModules = async (moduleIds: string[]) => {
    try {
      await AsyncStorage.setItem('pinnedModules', JSON.stringify(moduleIds));
      setPinnedModuleIds(moduleIds);
    } catch (error) {
      console.error('Error saving pinned modules:', error);
    }
  };

  const toggleModule = (moduleId: string) => {
    const newPinned = pinnedModuleIds.includes(moduleId)
      ? pinnedModuleIds.filter((id) => id !== moduleId)
      : [...pinnedModuleIds, moduleId];
    savePinnedModules(newPinned);
  };

  const handleLogout = async () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnexion',
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

  const pinnedModules = ALL_MODULES.filter((m) => pinnedModuleIds.includes(m.id));

  const categories = ['Tous', ...Array.from(new Set(ALL_MODULES.map((m) => m.category)))];
  const filteredModules = selectedCategory === 'Tous'
    ? ALL_MODULES
    : ALL_MODULES.filter((m) => m.category === selectedCategory);

  const renderNavItem = (item: NavModule, index: number) => {
    const isActive = route.name === item.name;
    const Icon = item.icon;
    const isHovered = hoverIndex === index;

    return (
      <TouchableOpacity
        key={item.id}
        onPress={() => navigation.navigate(item.name)}
        onMouseEnter={() => Platform.OS === 'web' && setHoverIndex(index)}
        onMouseLeave={() => Platform.OS === 'web' && setHoverIndex(null)}
        style={styles.navItem}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.navItemContent,
            isActive && styles.navItemActive,
            isHovered && !isActive && styles.navItemHover,
          ]}
        >
          {isActive && (
            <LinearGradient
              colors={item.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          )}

          <View style={styles.iconContainer}>
            <Icon
              size={22}
              color={isActive ? '#FFFFFF' : item.gradient[0]}
            />
          </View>

          {isExpanded && (
            <Text
              style={[
                styles.navLabel,
                isActive && styles.navLabelActive,
              ]}
              numberOfLines={1}
            >
              {item.label}
            </Text>
          )}

          {item.badge && item.badge > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.badge}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderCustomizeModal = () => (
    <Modal
      visible={customizeModalVisible}
      animationType="slide"
      transparent
      onRequestClose={() => setCustomizeModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Personnaliser la navigation</Text>
            <TouchableOpacity
              onPress={() => setCustomizeModalVisible(false)}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
          </View>

          {/* Categories */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoriesScroll}
            contentContainerStyle={styles.categoriesContent}
          >
            {categories.map((category) => (
              <TouchableOpacity
                key={category}
                onPress={() => setSelectedCategory(category)}
                style={[
                  styles.categoryChip,
                  selectedCategory === category && styles.categoryChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    selectedCategory === category && styles.categoryChipTextActive,
                  ]}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Modules Grid */}
          <ScrollView
            style={styles.modulesScroll}
            contentContainerStyle={styles.modulesGrid}
          >
            {filteredModules.map((module) => {
              const isPinned = pinnedModuleIds.includes(module.id);
              const Icon = module.icon;

              return (
                <TouchableOpacity
                  key={module.id}
                  onPress={() => toggleModule(module.id)}
                  style={[
                    styles.moduleCard,
                    isPinned && styles.moduleCardPinned,
                  ]}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={[...module.gradient.map((c) => c + '15')]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />

                  <View
                    style={[
                      styles.moduleIcon,
                      { backgroundColor: module.gradient[0] + '20' },
                    ]}
                  >
                    <Icon size={24} color={module.gradient[0]} />
                  </View>

                  <Text style={styles.moduleLabel} numberOfLines={1}>
                    {module.label}
                  </Text>

                  {isPinned && (
                    <View style={styles.pinnedIndicator}>
                      <View style={styles.pinnedDot} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Footer */}
          <View style={styles.modalFooter}>
            <Text style={styles.footerText}>
              {pinnedModuleIds.length} modules épinglés
            </Text>
            <TouchableOpacity
              onPress={() => savePinnedModules(DEFAULT_PINNED_MODULES)}
              style={styles.resetButton}
            >
              <Text style={styles.resetButtonText}>Réinitialiser</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={[styles.container, !isExpanded && styles.containerCollapsed]}>
      {Platform.OS === 'ios' ? (
        <BlurView
          intensity={90}
          tint="light"
          style={[StyleSheet.absoluteFill, { borderRadius: 0 }]}
        />
      ) : (
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: glassTheme.glass.frosted.backgroundColor },
          ]}
        />
      )}

      <View style={styles.content}>
        {/* Header with Home Button */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Home')}
            style={styles.homeButton}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#007AFF', '#5AC8FA']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.homeButtonGradient}
            >
              <GridIcon size={24} color="#FFFFFF" />
              {isExpanded && (
                <Text style={styles.homeButtonText}>Accueil</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Navigation Items */}
        <ScrollView
          style={styles.navList}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.navListContent}
        >
          {pinnedModules.map(renderNavItem)}
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          {/* Customize Button */}
          <TouchableOpacity
            onPress={() => setCustomizeModalVisible(true)}
            style={styles.customizeButton}
            activeOpacity={0.8}
          >
            <View style={styles.customizeButtonContent}>
              <SettingsIcon size={20} color={glassTheme.colors.text.secondary} />
              {isExpanded && (
                <Text style={styles.customizeButtonText}>Personnaliser</Text>
              )}
            </View>
          </TouchableOpacity>

          {/* Profile */}
          <TouchableOpacity
            onPress={() => navigation.navigate('Profile')}
            style={styles.profileButton}
            activeOpacity={0.8}
          >
            <View style={styles.profileContent}>
              <View style={styles.profileAvatar}>
                <UserIcon size={18} color="#FFFFFF" />
              </View>
              {isExpanded && (
                <View style={styles.profileInfo}>
                  <Text style={styles.profileName} numberOfLines={1}>
                    Utilisateur
                  </Text>
                  <Text style={styles.profileRole} numberOfLines={1}>
                    Admin
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>

          {/* Logout */}
          <TouchableOpacity
            onPress={handleLogout}
            style={styles.logoutButton}
            activeOpacity={0.8}
          >
            <Text style={styles.logoutText}>×</Text>
          </TouchableOpacity>
        </View>
      </View>

      {renderCustomizeModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: NAV_WIDTH,
    height: '100%',
    borderRightWidth: 1,
    borderRightColor: 'rgba(0, 0, 0, 0.06)',
    overflow: 'hidden',
  },
  containerCollapsed: {
    width: 72,
  },
  content: {
    flex: 1,
    paddingVertical: glassTheme.spacing.md,
  },

  // Header
  header: {
    paddingHorizontal: glassTheme.spacing.md,
    marginBottom: glassTheme.spacing.lg,
  },
  homeButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  homeButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: glassTheme.spacing.sm,
  },
  homeButtonText: {
    ...glassTheme.typography.body,
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // Nav List
  navList: {
    flex: 1,
  },
  navListContent: {
    paddingHorizontal: glassTheme.spacing.sm,
    gap: 4,
  },
  navItem: {
    marginBottom: 4,
  },
  navItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    overflow: 'hidden',
    gap: glassTheme.spacing.sm,
  },
  navItemActive: {
    backgroundColor: glassTheme.colors.primary,
  },
  navItemHover: {
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
  },
  iconContainer: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navLabel: {
    ...glassTheme.typography.body,
    color: glassTheme.colors.text.primary,
    fontWeight: '500',
    flex: 1,
  },
  navLabelActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  badge: {
    backgroundColor: glassTheme.colors.error,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    ...glassTheme.typography.caption,
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },

  // Footer
  footer: {
    paddingHorizontal: glassTheme.spacing.md,
    paddingTop: glassTheme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.06)',
    gap: glassTheme.spacing.sm,
  },
  customizeButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
  },
  customizeButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: glassTheme.spacing.sm,
  },
  customizeButtonText: {
    ...glassTheme.typography.bodySmall,
    color: glassTheme.colors.text.secondary,
    fontWeight: '500',
  },
  profileButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  profileContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: glassTheme.spacing.sm,
  },
  profileAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: glassTheme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    ...glassTheme.typography.bodySmall,
    color: glassTheme.colors.text.primary,
    fontWeight: '600',
  },
  profileRole: {
    ...glassTheme.typography.caption,
    color: glassTheme.colors.text.tertiary,
    fontSize: 11,
  },
  logoutButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  logoutText: {
    fontSize: 24,
    color: glassTheme.colors.error,
    fontWeight: '300',
    lineHeight: 24,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: glassTheme.spacing.lg,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 600,
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: glassTheme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.06)',
  },
  modalTitle: {
    ...glassTheme.typography.h1,
    color: glassTheme.colors.text.primary,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    color: glassTheme.colors.text.secondary,
    fontWeight: '300',
    lineHeight: 24,
  },

  // Categories
  categoriesScroll: {
    maxHeight: 50,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.06)',
  },
  categoriesContent: {
    paddingHorizontal: glassTheme.spacing.lg,
    paddingVertical: glassTheme.spacing.sm,
    gap: glassTheme.spacing.sm,
  },
  categoryChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
  },
  categoryChipActive: {
    backgroundColor: glassTheme.colors.primary,
  },
  categoryChipText: {
    ...glassTheme.typography.bodySmall,
    color: glassTheme.colors.text.secondary,
    fontWeight: '500',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // Modules Grid
  modulesScroll: {
    flex: 1,
  },
  modulesGrid: {
    padding: glassTheme.spacing.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: glassTheme.spacing.md,
  },
  moduleCard: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 16,
    padding: glassTheme.spacing.md,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moduleCardPinned: {
    borderColor: glassTheme.colors.primary,
    borderWidth: 2,
  },
  moduleIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: glassTheme.spacing.sm,
  },
  moduleLabel: {
    ...glassTheme.typography.bodySmall,
    color: glassTheme.colors.text.primary,
    fontWeight: '600',
    textAlign: 'center',
  },
  pinnedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  pinnedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: glassTheme.colors.primary,
  },

  // Modal Footer
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: glassTheme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.06)',
  },
  footerText: {
    ...glassTheme.typography.body,
    color: glassTheme.colors.text.tertiary,
  },
  resetButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  resetButtonText: {
    ...glassTheme.typography.bodySmall,
    color: glassTheme.colors.primary,
    fontWeight: '600',
  },
});
