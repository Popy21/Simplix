import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  TextInput,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import {
  SearchIcon,
  BellIcon,
  ChevronLeftIcon,
  MenuIcon,
} from './Icons';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const isWeb = Platform.OS === 'web';

// Inject premium CSS for web
if (isWeb && typeof document !== 'undefined') {
  const styleId = 'liquid-glass-header-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @keyframes searchExpand {
        from { width: 40px; }
        to { width: 280px; }
      }

      @keyframes bellShake {
        0%, 100% { transform: rotate(0deg); }
        25% { transform: rotate(15deg); }
        75% { transform: rotate(-15deg); }
      }

      .liquid-header {
        font-family: 'SF Pro Display', 'Inter', -apple-system, sans-serif;
      }

      .liquid-header-btn {
        transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      }

      .liquid-header-btn:hover {
        background: rgba(255, 255, 255, 0.12);
        transform: scale(1.05);
      }

      .liquid-header-btn:active {
        transform: scale(0.95);
      }

      .liquid-search-input {
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .liquid-search-input:focus {
        background: rgba(255, 255, 255, 0.15);
        border-color: rgba(99, 102, 241, 0.5);
        box-shadow: 0 0 20px rgba(99, 102, 241, 0.2);
      }

      .liquid-notification-badge {
        animation: bellShake 0.5s ease-in-out;
      }

      .liquid-back-btn:hover {
        background: rgba(99, 102, 241, 0.15);
      }
    `;
    document.head.appendChild(style);
  }
}

// Screen titles mapping
const screenTitles: Record<string, string> = {
  Home: 'Accueil',
  Dashboard: 'Tableau de Bord',
  Analytics: 'Analytics',
  Pilotage: 'Pilotage',
  Pipeline: 'Pipeline des Ventes',
  Contacts: 'Contacts',
  Deals: 'Affaires',
  Leads: 'Leads',
  Tasks: 'Taches',
  Sales: 'Historique Ventes',
  Invoices: 'Factures',
  Products: 'Catalogue Produits',
  Expenses: 'Depenses',
  Suppliers: 'Fournisseurs',
  CreditNotes: 'Avoirs',
  RecurringInvoices: 'Factures Recurrentes',
  Cashflow: 'Tresorerie',
  BankReconciliation: 'Rapprochement',
  Reminders: 'Relances',
  Accounting: 'Comptabilite',
  Reports: 'Rapports',
  Workflows: 'Workflows',
  Emails: 'Emails',
  Documents: 'Documents',
  Templates: 'Templates',
  Teams: 'Equipes',
  Profile: 'Mon Profil',
  Settings: 'Parametres',
  TestAll: 'Tests API',
};

interface LiquidGlassHeaderProps {
  showBackButton?: boolean;
  onMenuPress?: () => void;
  onSearchPress?: () => void;
  notificationCount?: number;
}

export default function LiquidGlassHeader({
  showBackButton = false,
  onMenuPress,
  onSearchPress,
  notificationCount = 0,
}: LiquidGlassHeaderProps) {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchText, setSearchText] = useState('');

  const title = screenTitles[route.name as string] || route.name;
  const canGoBack = navigation.canGoBack() && route.name !== 'Home';

  const handleBack = () => {
    if (canGoBack) {
      navigation.goBack();
    } else {
      navigation.navigate('Home');
    }
  };

  return (
    <View
      style={styles.container}
      // @ts-ignore
      {...(isWeb && { className: 'liquid-header' })}
    >
      {/* Glass background */}
      {Platform.OS === 'ios' ? (
        <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
      ) : (
        <View style={styles.glassBackground}>
          <LinearGradient
            colors={['rgba(15, 23, 42, 0.95)', 'rgba(30, 41, 59, 0.9)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {/* Bottom border highlight */}
          <LinearGradient
            colors={['transparent', 'rgba(255, 255, 255, 0.08)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.bottomHighlight}
          />
        </View>
      )}

      {/* Content */}
      <View style={styles.content}>
        {/* Left section */}
        <View style={styles.leftSection}>
          {(canGoBack || showBackButton) && (
            <TouchableOpacity
              onPress={handleBack}
              style={styles.backButton}
              // @ts-ignore
              {...(isWeb && { className: 'liquid-header-btn liquid-back-btn' })}
            >
              <ChevronLeftIcon size={22} color="#94a3b8" />
            </TouchableOpacity>
          )}

          {onMenuPress && !canGoBack && (
            <TouchableOpacity
              onPress={onMenuPress}
              style={styles.menuButton}
              // @ts-ignore
              {...(isWeb && { className: 'liquid-header-btn' })}
            >
              <MenuIcon size={22} color="#94a3b8" />
            </TouchableOpacity>
          )}

          <View style={styles.titleContainer}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            {route.name === 'Home' && (
              <View style={styles.subtitleBadge}>
                <LinearGradient
                  colors={['#6366f1', '#a855f7']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
                <Text style={styles.subtitleText}>PRO</Text>
              </View>
            )}
          </View>
        </View>

        {/* Right section */}
        <View style={styles.rightSection}>
          {/* Search */}
          <View
            style={[
              styles.searchContainer,
              searchFocused && styles.searchContainerFocused,
            ]}
            // @ts-ignore
            {...(isWeb && { className: 'liquid-search-input' })}
          >
            <SearchIcon size={18} color="#64748b" />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher..."
              placeholderTextColor="#64748b"
              value={searchText}
              onChangeText={setSearchText}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
          </View>

          {/* Notifications */}
          <TouchableOpacity
            style={styles.notificationButton}
            // @ts-ignore
            {...(isWeb && { className: 'liquid-header-btn' })}
          >
            <BellIcon size={22} color="#94a3b8" />
            {notificationCount > 0 && (
              <View
                style={styles.notificationBadge}
                // @ts-ignore
                {...(isWeb && { className: 'liquid-notification-badge' })}
              >
                <LinearGradient
                  colors={['#ef4444', '#f87171']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <Text style={styles.notificationText}>
                  {notificationCount > 9 ? '9+' : notificationCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: Platform.OS === 'ios' ? 100 : 70,
    paddingTop: Platform.OS === 'ios' ? 50 : 0,
    position: 'relative',
    overflow: 'hidden',
    ...(isWeb ? {
      backgroundColor: 'rgba(15, 23, 42, 0.9)',
      backdropFilter: 'blur(40px) saturate(180%)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      boxShadow: '0 4px 30px rgba(0, 0, 0, 0.2)',
    } : {
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255, 255, 255, 0.08)',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 30,
      elevation: 10,
    }),
  },
  glassBackground: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  bottomHighlight: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },

  // Left section
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    ...(isWeb ? {
      transition: 'all 0.3s ease',
    } : {}),
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f8fafc',
    letterSpacing: -0.5,
  },
  subtitleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: 'hidden',
  },
  subtitleText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 1,
  },

  // Right section
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    minWidth: 180,
    ...(isWeb ? {
      transition: 'all 0.3s ease',
    } : {}),
  },
  searchContainerFocused: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderColor: 'rgba(99, 102, 241, 0.4)',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#f8fafc',
    ...(isWeb ? {
      outline: 'none',
    } : {}),
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    paddingHorizontal: 4,
    ...(isWeb ? {
      boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)',
    } : {
      shadowColor: '#ef4444',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 5,
    }),
  },
  notificationText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
    position: 'relative',
    zIndex: 1,
  },
});
