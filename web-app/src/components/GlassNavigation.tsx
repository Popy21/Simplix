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
const isWeb = Platform.OS === 'web';

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
  { id: 'dashboard', name: 'Dashboard', label: 'Tableau de bord', icon: ChartIcon, gradient: ['#3b82f6', '#60a5fa'], category: 'Vue d\'ensemble' },
  { id: 'analytics', name: 'Analytics', label: 'Analytics', icon: BarChartIcon, gradient: ['#8b5cf6', '#a78bfa'], category: 'Vue d\'ensemble' },
  { id: 'pilotage', name: 'Pilotage', label: 'Pilotage', icon: PieChartIcon, gradient: ['#f59e0b', '#fbbf24'], category: 'Vue d\'ensemble' },

  // Ventes & CRM
  { id: 'pipeline', name: 'Pipeline', label: 'Pipeline', icon: TrendingUpIcon, gradient: ['#8b5cf6', '#a78bfa'], category: 'Ventes & CRM' },
  { id: 'contacts', name: 'Contacts', label: 'Contacts', icon: UsersIcon, gradient: ['#10b981', '#34d399'], category: 'Ventes & CRM' },
  { id: 'deals', name: 'Deals', label: 'Affaires', icon: BriefcaseIcon, gradient: ['#3b82f6', '#60a5fa'], category: 'Ventes & CRM' },
  { id: 'leads', name: 'Leads', label: 'Leads', icon: TargetIcon, gradient: ['#ef4444', '#f87171'], category: 'Ventes & CRM' },

  // Opérations
  { id: 'tasks', name: 'Tasks', label: 'Tâches', icon: CheckCircleIcon, gradient: ['#f59e0b', '#fbbf24'], category: 'Opérations' },
  { id: 'sales', name: 'Sales', label: 'Ventes', icon: DollarIcon, gradient: ['#10b981', '#34d399'], category: 'Opérations' },
  { id: 'invoices', name: 'Invoices', label: 'Factures', icon: FileTextIcon, gradient: ['#ec4899', '#f472b6'], category: 'Opérations' },
  { id: 'products', name: 'Products', label: 'Produits', icon: PackageIcon, gradient: ['#a855f7', '#c084fc'], category: 'Opérations' },

  // Finance
  { id: 'expenses', name: 'Expenses', label: 'Dépenses', icon: ShoppingCartIcon, gradient: ['#f59e0b', '#fbbf24'], category: 'Finance' },
  { id: 'suppliers', name: 'Suppliers', label: 'Fournisseurs', icon: TruckIcon, gradient: ['#6b7280', '#9ca3af'], category: 'Finance' },
  { id: 'creditnotes', name: 'CreditNotes', label: 'Avoirs', icon: FileTextIcon, gradient: ['#ef4444', '#f87171'], category: 'Finance' },
  { id: 'recurring', name: 'RecurringInvoices', label: 'Récurrences', icon: RepeatIcon, gradient: ['#8b5cf6', '#a78bfa'], category: 'Finance' },
  { id: 'cashflow', name: 'Cashflow', label: 'Trésorerie', icon: TrendingUpIcon, gradient: ['#10b981', '#34d399'], category: 'Finance' },
  { id: 'reconciliation', name: 'BankReconciliation', label: 'Rapprochement', icon: LayersIcon, gradient: ['#3b82f6', '#60a5fa'], category: 'Finance' },
  { id: 'reminders', name: 'Reminders', label: 'Relances', icon: SendIcon, gradient: ['#f59e0b', '#fbbf24'], category: 'Finance' },
  { id: 'accounting', name: 'Accounting', label: 'Comptabilité', icon: BarChartIcon, gradient: ['#8b5cf6', '#a78bfa'], category: 'Finance' },
  { id: 'reports', name: 'Reports', label: 'Rapports', icon: PieChartIcon, gradient: ['#3b82f6', '#60a5fa'], category: 'Finance' },

  // Automatisation
  { id: 'workflows', name: 'Workflows', label: 'Workflows', icon: RepeatIcon, gradient: ['#06b6d4', '#22d3ee'], category: 'Automatisation' },
  { id: 'emails', name: 'Emails', label: 'Emails', icon: SendIcon, gradient: ['#10b981', '#34d399'], category: 'Automatisation' },
  { id: 'documents', name: 'Documents', label: 'Documents', icon: FolderIcon, gradient: ['#3b82f6', '#60a5fa'], category: 'Automatisation' },
  { id: 'templates', name: 'Templates', label: 'Templates', icon: CopyIcon, gradient: ['#a855f7', '#c084fc'], category: 'Automatisation' },

  // Configuration
  { id: 'teams', name: 'Teams', label: 'Équipes', icon: UsersIcon, gradient: ['#8b5cf6', '#a78bfa'], category: 'Configuration' },
  { id: 'profile', name: 'Profile', label: 'Profil', icon: SettingsIcon, gradient: ['#6b7280', '#9ca3af'], category: 'Configuration' },
];

// Modules par défaut
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

    const touchableProps: any = {
      key: item.id,
      onPress: () => navigation.navigate(item.name as any),
      style: styles.navItem,
      activeOpacity: 0.7,
    };

    if (Platform.OS === 'web') {
      touchableProps.onMouseEnter = () => setHoverIndex(index);
      touchableProps.onMouseLeave = () => setHoverIndex(null);
    }

    return (
      <TouchableOpacity {...touchableProps}>
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

  // ============================================
  // MODAL PERSONNALISER - DESIGN PREMIUM
  // ============================================
  const renderCustomizeModal = () => (
    <Modal
      visible={customizeModalVisible}
      animationType="slide"
      transparent
      onRequestClose={() => setCustomizeModalVisible(false)}
    >
      <View style={modalStyles.overlay}>
        {/* Zone cliquable pour fermer le modal */}
        <TouchableOpacity
          style={modalStyles.overlayClickable}
          onPress={() => setCustomizeModalVisible(false)}
          activeOpacity={1}
        />

        <View style={modalStyles.container}>
          {/* Glass effect layer */}
          <View style={modalStyles.glassLayer} />

          {/* Header */}
          <View style={modalStyles.header}>
            <View style={modalStyles.headerLeft}>
              <View style={modalStyles.headerIcon}>
                <SettingsIcon size={24} color="#a78bfa" />
              </View>
              <View>
                <Text style={modalStyles.title}>Personnaliser</Text>
                <Text style={modalStyles.subtitle}>Gérez vos modules favoris</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => setCustomizeModalVisible(false)}
              style={modalStyles.closeButton}
              activeOpacity={0.7}
            >
              <Text style={modalStyles.closeIcon}>×</Text>
            </TouchableOpacity>
          </View>

          {/* Categories Pills */}
          <View style={modalStyles.categoriesWrapper}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={modalStyles.categoriesContent}
            >
              {categories.map((category) => {
                const isSelected = selectedCategory === category;
                return (
                  <TouchableOpacity
                    key={category}
                    onPress={() => setSelectedCategory(category)}
                    style={[
                      modalStyles.categoryPill,
                      isSelected && modalStyles.categoryPillActive,
                    ]}
                    activeOpacity={0.7}
                  >
                    {isSelected && (
                      <LinearGradient
                        colors={['#8b5cf6', '#a855f7']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={StyleSheet.absoluteFill}
                      />
                    )}
                    <Text
                      style={[
                        modalStyles.categoryText,
                        isSelected && modalStyles.categoryTextActive,
                      ]}
                    >
                      {category}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Modules Grid */}
          <ScrollView
            style={modalStyles.modulesScroll}
            contentContainerStyle={modalStyles.modulesGrid}
            showsVerticalScrollIndicator={false}
          >
            {filteredModules.map((module) => {
              const isPinned = pinnedModuleIds.includes(module.id);
              const Icon = module.icon;

              return (
                <TouchableOpacity
                  key={module.id}
                  onPress={() => toggleModule(module.id)}
                  style={[
                    modalStyles.moduleCard,
                    isPinned && modalStyles.moduleCardActive,
                  ]}
                  activeOpacity={0.8}
                >
                  {/* Background gradient for active */}
                  {isPinned && (
                    <LinearGradient
                      colors={[module.gradient[0] + '30', module.gradient[1] + '10']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />
                  )}

                  {/* Icon container */}
                  <View style={[
                    modalStyles.moduleIconWrapper,
                    { backgroundColor: module.gradient[0] + '20' }
                  ]}>
                    <LinearGradient
                      colors={module.gradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={modalStyles.moduleIconGradient}
                    >
                      <Icon size={22} color="#FFFFFF" />
                    </LinearGradient>
                  </View>

                  {/* Label */}
                  <Text style={modalStyles.moduleLabel} numberOfLines={1}>
                    {module.label}
                  </Text>

                  {/* Category tag */}
                  <Text style={modalStyles.moduleCategory} numberOfLines={1}>
                    {module.category}
                  </Text>

                  {/* Pinned indicator */}
                  {isPinned && (
                    <View style={modalStyles.pinnedBadge}>
                      <LinearGradient
                        colors={['#10b981', '#34d399']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={StyleSheet.absoluteFill}
                      />
                      <Text style={modalStyles.pinnedBadgeText}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Aperçu en temps réel des modules épinglés */}
          <View style={modalStyles.previewSection}>
            <Text style={modalStyles.previewTitle}>Aperçu de votre navigation</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={modalStyles.previewContent}
            >
              {pinnedModules.map((module) => {
                const Icon = module.icon;
                return (
                  <View key={module.id} style={modalStyles.previewItem}>
                    <LinearGradient
                      colors={module.gradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={modalStyles.previewIcon}
                    >
                      <Icon size={16} color="#FFFFFF" />
                    </LinearGradient>
                    <Text style={modalStyles.previewLabel} numberOfLines={1}>
                      {module.label}
                    </Text>
                  </View>
                );
              })}
            </ScrollView>
          </View>

          {/* Footer */}
          <View style={modalStyles.footer}>
            <View style={modalStyles.footerInfo}>
              <View style={modalStyles.footerBadge}>
                <Text style={modalStyles.footerBadgeText}>{pinnedModuleIds.length}</Text>
              </View>
              <Text style={modalStyles.footerText}>modules épinglés</Text>
            </View>

            <TouchableOpacity
              onPress={() => savePinnedModules(DEFAULT_PINNED_MODULES)}
              style={modalStyles.resetButton}
              activeOpacity={0.7}
            >
              <Text style={modalStyles.resetButtonText}>Réinitialiser</Text>
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
          {...(Platform.OS === 'web' && {
            style: {
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(40px) saturate(180%)',
              WebkitBackdropFilter: 'blur(40px) saturate(180%)',
              borderRadius: 0,
            },
          })}
          style={Platform.OS !== 'web' ? [
            StyleSheet.absoluteFill,
            { backgroundColor: 'rgba(255, 255, 255, 0.95)' },
          ] : undefined}
        />
      )}

      <View style={styles.content}>
        {/* Header with Home Button */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Home' as any)}
            style={styles.homeButton}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#3b82f6', '#60a5fa']}
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
              <SettingsIcon size={20} color="#8b5cf6" />
              {isExpanded && (
                <Text style={styles.customizeButtonText}>Personnaliser</Text>
              )}
            </View>
          </TouchableOpacity>

          {/* Profile */}
          <TouchableOpacity
            onPress={() => navigation.navigate('Profile' as any)}
            style={styles.profileButton}
            activeOpacity={0.8}
          >
            <View style={styles.profileContent}>
              <LinearGradient
                colors={['#8b5cf6', '#a855f7']}
                style={styles.profileAvatar}
              >
                <UserIcon size={18} color="#FFFFFF" />
              </LinearGradient>
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

// ============================================
// STYLES MODAL - GLASSMORPHISME PREMIUM
// ============================================
const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
    ...(isWeb ? {
      backgroundColor: 'rgba(0, 0, 0, 0.3)',
    } : {
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
    }),
  },

  // Zone cliquable pour fermer (côté gauche)
  overlayClickable: {
    flex: 1,
    minWidth: IS_LARGE_SCREEN ? NAV_WIDTH + 40 : 60,
  },

  container: {
    width: IS_LARGE_SCREEN ? 500 : '90%',
    maxWidth: 550,
    height: '100%',
    borderTopLeftRadius: 28,
    borderBottomLeftRadius: 28,
    overflow: 'hidden',
    position: 'relative',
    ...(isWeb ? {
      backgroundColor: 'rgba(30, 41, 59, 0.95)',
      backdropFilter: 'blur(40px) saturate(180%)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRightWidth: 0,
      boxShadow: `
        -10px 0 40px rgba(0, 0, 0, 0.4),
        0 0 0 1px rgba(255, 255, 255, 0.05),
        inset 0 1px 0 rgba(255, 255, 255, 0.1)
      `,
    } : {
      backgroundColor: 'rgba(30, 41, 59, 0.98)',
    }),
  },

  glassLayer: {
    ...StyleSheet.absoluteFillObject,
    ...(isWeb ? {
      background: `
        linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 30%),
        linear-gradient(270deg, rgba(139,92,246,0.1) 0%, transparent 50%)
      `,
    } : {}),
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    ...(isWeb ? {
      backgroundColor: 'rgba(139, 92, 246, 0.15)',
      border: '1px solid rgba(139, 92, 246, 0.2)',
    } : {
      backgroundColor: 'rgba(139, 92, 246, 0.2)',
    }),
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f8fafc',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 2,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    ...(isWeb ? {
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      transition: 'all 0.2s ease',
    } : {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
    }),
  },
  closeIcon: {
    fontSize: 28,
    color: '#94a3b8',
    fontWeight: '300',
    lineHeight: 28,
  },

  // Categories
  categoriesWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  categoriesContent: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 10,
  },
  categoryPill: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 100,
    overflow: 'hidden',
    ...(isWeb ? {
      backgroundColor: 'rgba(255, 255, 255, 0.06)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      transition: 'all 0.2s ease',
    } : {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
    }),
  },
  categoryPillActive: {
    ...(isWeb ? {
      boxShadow: '0 4px 15px rgba(139, 92, 246, 0.4)',
      border: '1px solid rgba(139, 92, 246, 0.5)',
    } : {}),
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
  },
  categoryTextActive: {
    color: '#FFFFFF',
  },

  // Modules Grid
  modulesScroll: {
    flex: 1,
  },
  modulesGrid: {
    padding: 24,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  moduleCard: {
    width: '30%',
    minWidth: 150,
    aspectRatio: 1,
    borderRadius: 20,
    padding: 16,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    ...(isWeb ? {
      backgroundColor: 'rgba(255, 255, 255, 0.04)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      transition: 'all 0.3s ease',
      cursor: 'pointer',
    } : {
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.1)',
    }),
  },
  moduleCardActive: {
    ...(isWeb ? {
      border: '1px solid rgba(139, 92, 246, 0.4)',
      boxShadow: '0 8px 25px rgba(139, 92, 246, 0.2)',
      transform: [{ scale: 1.02 }],
    } : {
      borderColor: 'rgba(139, 92, 246, 0.5)',
    }),
  },
  moduleIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    overflow: 'hidden',
  },
  moduleIconGradient: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moduleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f1f5f9',
    textAlign: 'center',
    marginBottom: 4,
  },
  moduleCategory: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
  },
  pinnedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pinnedBadgeText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // Preview Section
  previewSection: {
    padding: 16,
    paddingHorizontal: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    ...(isWeb ? {
      backgroundColor: 'rgba(139, 92, 246, 0.08)',
    } : {
      backgroundColor: 'rgba(139, 92, 246, 0.1)',
    }),
  },
  previewTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#a78bfa',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  previewContent: {
    gap: 12,
    paddingVertical: 4,
  },
  previewItem: {
    alignItems: 'center',
    width: 64,
  },
  previewIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  previewLabel: {
    fontSize: 10,
    color: '#94a3b8',
    textAlign: 'center',
  },

  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingHorizontal: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    ...(isWeb ? {
      backgroundColor: 'rgba(0, 0, 0, 0.2)',
    } : {}),
  },
  footerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  footerBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    ...(isWeb ? {
      backgroundColor: 'rgba(139, 92, 246, 0.2)',
      border: '1px solid rgba(139, 92, 246, 0.3)',
    } : {
      backgroundColor: 'rgba(139, 92, 246, 0.3)',
    }),
  },
  footerBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#a78bfa',
  },
  footerText: {
    fontSize: 14,
    color: '#94a3b8',
  },
  resetButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    ...(isWeb ? {
      backgroundColor: 'rgba(239, 68, 68, 0.15)',
      border: '1px solid rgba(239, 68, 68, 0.2)',
      transition: 'all 0.2s ease',
    } : {
      backgroundColor: 'rgba(239, 68, 68, 0.2)',
    }),
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f87171',
  },
});

// ============================================
// STYLES NAVIGATION PRINCIPALE
// ============================================
const styles = StyleSheet.create({
  container: {
    width: NAV_WIDTH,
    height: '100%',
    overflow: 'hidden',
    ...(isWeb ? {
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
      backdropFilter: 'blur(24px) saturate(180%)',
      borderRight: '1px solid rgba(255, 255, 255, 0.1)',
      boxShadow: '4px 0 30px rgba(0, 0, 0, 0.1)',
    } : {
      borderRightWidth: 1,
      borderRightColor: 'rgba(0, 0, 0, 0.06)',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
    }),
  },
  containerCollapsed: {
    width: 72,
  },
  content: {
    flex: 1,
    paddingVertical: 16,
  },

  // Header
  header: {
    paddingHorizontal: 16,
    marginBottom: 24,
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
    gap: 10,
  },
  homeButtonText: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // Nav List
  navList: {
    flex: 1,
  },
  navListContent: {
    paddingHorizontal: 8,
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
    gap: 10,
  },
  navItemActive: {
    backgroundColor: '#3b82f6',
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
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
    flex: 1,
  },
  navLabelActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  badge: {
    backgroundColor: '#ef4444',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // Footer
  footer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.06)',
    gap: 8,
  },
  customizeButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
  },
  customizeButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  customizeButtonText: {
    fontSize: 14,
    color: '#8b5cf6',
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
    gap: 10,
  },
  profileAvatar: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '600',
  },
  profileRole: {
    fontSize: 11,
    color: '#9ca3af',
  },
  logoutButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  logoutText: {
    fontSize: 24,
    color: '#ef4444',
    fontWeight: '300',
    lineHeight: 24,
  },
});
