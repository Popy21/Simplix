import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Dimensions,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { layout } from '../theme/responsive';
import {
  GridIcon,
  ChartIcon,
  TrendingUpIcon,
  CheckCircleIcon,
  UserIcon,
} from './Icons';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

interface BottomNavItem {
  name: keyof RootStackParamList;
  label: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  color: string;
  gradient: readonly [string, string];
}

const bottomNavItems: BottomNavItem[] = [
  { name: 'Home', label: 'Accueil', icon: GridIcon, color: '#6366f1', gradient: ['#6366f1', '#8b5cf6'] },
  { name: 'Dashboard', label: 'Stats', icon: ChartIcon, color: '#10b981', gradient: ['#10b981', '#34d399'] },
  { name: 'Pipeline', label: 'Pipeline', icon: TrendingUpIcon, color: '#8b5cf6', gradient: ['#8b5cf6', '#a78bfa'] },
  { name: 'Tasks', label: 'Tâches', icon: CheckCircleIcon, color: '#f59e0b', gradient: ['#f59e0b', '#fbbf24'] },
  { name: 'Profile', label: 'Profil', icon: UserIcon, color: '#64748b', gradient: ['#64748b', '#94a3b8'] },
];

export default function GlassBottomNav() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();

  const renderNavItem = (item: BottomNavItem, index: number) => {
    const isActive = route.name === item.name;
    const Icon = item.icon;
    const isCenter = index === Math.floor(bottomNavItems.length / 2);

    return (
      <TouchableOpacity
        key={item.name}
        onPress={() => navigation.navigate(item.name as any)}
        style={[styles.navItem, isCenter && styles.navItemCenter]}
        activeOpacity={0.7}
      >
        <View style={[styles.navItemContent, isActive && styles.navItemContentActive]}>
          {/* Glow effect for active item */}
          {isActive && (
            <View style={[styles.activeGlow, { backgroundColor: item.color }]} />
          )}

          {/* Icon container with gradient background when active */}
          <View style={[
            styles.iconContainer,
            isActive && { backgroundColor: item.color + '20' }
          ]}>
            {isActive ? (
              <LinearGradient
                colors={item.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.iconGradient}
              >
                <Icon size={22} color="#FFFFFF" />
              </LinearGradient>
            ) : (
              <Icon size={22} color="#94a3b8" />
            )}
          </View>

          {/* Label */}
          <Text
            style={[
              styles.navLabel,
              isActive && { color: item.color, fontWeight: '700' }
            ]}
          >
            {item.label}
          </Text>

          {/* Active indicator line */}
          {isActive && (
            <LinearGradient
              colors={item.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.activeIndicator}
            />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Glass background */}
      {Platform.OS === 'ios' ? (
        <BlurView
          intensity={95}
          tint="light"
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <View style={styles.glassBackground} />
      )}

      {/* Animated orbs for depth effect */}
      <View style={[styles.orb, styles.orb1]} />
      <View style={[styles.orb, styles.orb2]} />

      <View style={styles.content}>
        {bottomNavItems.map((item, index) => renderNavItem(item, index))}
      </View>

      {/* iPhone X notch safe area */}
      <View style={styles.safeArea} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: layout.bottomNavHeight + (Platform.OS === 'ios' ? 24 : 0),
    overflow: 'hidden',
    // Ultra transparent glass effect
    ...(isWeb ? {
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      backdropFilter: 'blur(24px) saturate(180%)',
      borderTop: '1px solid rgba(255, 255, 255, 0.15)',
      boxShadow: `
        0 -8px 32px rgba(0, 0, 0, 0.1),
        0 -2px 8px rgba(0, 0, 0, 0.05),
        inset 0 1px 1px rgba(255, 255, 255, 0.25)
      `,
    } : {
      backgroundColor: 'rgba(255, 255, 255, 0.85)',
      borderTopWidth: 1,
      borderTopColor: 'rgba(255, 255, 255, 0.3)',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -8 },
      shadowOpacity: 0.1,
      shadowRadius: 32,
      elevation: 20,
    }),
  },
  glassBackground: {
    ...StyleSheet.absoluteFillObject,
    ...(isWeb ? {
      background: `
        linear-gradient(180deg, rgba(255,255,255,0.1) 0%, rgba(248,250,252,0.15) 100%)
      `,
    } : {
      backgroundColor: 'rgba(255, 255, 255, 0.85)',
    }),
  },
  orb: {
    position: 'absolute',
    borderRadius: 9999,
    ...(isWeb ? {
      filter: 'blur(40px)',
    } : {}),
  },
  orb1: {
    width: 120,
    height: 120,
    top: -60,
    left: SCREEN_WIDTH * 0.2,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  orb2: {
    width: 100,
    height: 100,
    top: -50,
    right: SCREEN_WIDTH * 0.15,
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
  },
  content: {
    flexDirection: 'row',
    height: layout.bottomNavHeight,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'space-around',
    position: 'relative',
    zIndex: 1,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  navItemCenter: {
    // Make center item slightly larger
  },
  navItemContent: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 16,
    ...(isWeb ? {
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    } : {}),
  },
  navItemContentActive: {
    ...(isWeb ? {
      backgroundColor: 'rgba(255, 255, 255, 0.25)',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
    } : {
      backgroundColor: 'rgba(255, 255, 255, 0.6)',
    }),
  },
  activeGlow: {
    position: 'absolute',
    top: -20,
    width: 60,
    height: 60,
    borderRadius: 30,
    opacity: 0.15,
    ...(isWeb ? {
      filter: 'blur(20px)',
    } : {}),
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  iconGradient: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    ...(isWeb ? {
      boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
    } : {
      shadowColor: '#6366f1',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 8,
    }),
  },
  navLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  activeIndicator: {
    position: 'absolute',
    top: -4,
    width: 24,
    height: 3,
    borderRadius: 2,
  },
  safeArea: {
    height: Platform.OS === 'ios' ? 24 : 0,
    backgroundColor: 'transparent',
  },
});
