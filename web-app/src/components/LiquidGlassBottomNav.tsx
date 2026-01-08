import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Dimensions,
  Animated,
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
const BOTTOM_NAV_HEIGHT = 72;
const SAFE_AREA_BOTTOM = Platform.OS === 'ios' ? 34 : 0;

// Inject premium CSS for web
if (isWeb && typeof document !== 'undefined') {
  const styleId = 'liquid-glass-bottom-nav-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @keyframes liquidRipple {
        0% { transform: scale(0); opacity: 0.8; }
        100% { transform: scale(2.5); opacity: 0; }
      }

      @keyframes tabPop {
        0% { transform: scale(1); }
        50% { transform: scale(0.9); }
        100% { transform: scale(1); }
      }

      @keyframes glowPulse {
        0%, 100% { box-shadow: 0 0 20px rgba(99, 102, 241, 0.4); }
        50% { box-shadow: 0 0 40px rgba(99, 102, 241, 0.6); }
      }

      @keyframes floatIndicator {
        0%, 100% { transform: translateX(-50%) scaleX(1); }
        50% { transform: translateX(-50%) scaleX(1.2); }
      }

      @keyframes orbFloat {
        0%, 100% { transform: translateY(0) scale(1); opacity: 0.5; }
        50% { transform: translateY(-8px) scale(1.1); opacity: 0.7; }
      }

      .liquid-bottom-nav {
        font-family: 'SF Pro Display', 'Inter', -apple-system, sans-serif;
      }

      .liquid-tab-item {
        transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        position: relative;
        overflow: hidden;
      }

      .liquid-tab-item:active {
        animation: tabPop 0.3s ease;
      }

      .liquid-tab-item::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        width: 40px;
        height: 40px;
        background: radial-gradient(circle, rgba(255,255,255,0.3), transparent 70%);
        transform: translate(-50%, -50%) scale(0);
        pointer-events: none;
        border-radius: 50%;
      }

      .liquid-tab-item:active::before {
        animation: liquidRipple 0.6s ease-out;
      }

      .liquid-tab-active .liquid-tab-icon {
        animation: glowPulse 2s ease-in-out infinite;
      }

      .liquid-active-indicator {
        animation: floatIndicator 2s ease-in-out infinite;
      }

      .liquid-nav-orb {
        animation: orbFloat 8s ease-in-out infinite;
      }

      .liquid-nav-orb-delay {
        animation: orbFloat 10s ease-in-out infinite;
        animation-delay: -3s;
      }
    `;
    document.head.appendChild(style);
  }
}

interface BottomNavItem {
  name: keyof RootStackParamList;
  label: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  gradient: [string, string];
}

const bottomNavItems: BottomNavItem[] = [
  { name: 'Home', label: 'Accueil', icon: GridIcon, gradient: ['#6366f1', '#8b5cf6'] },
  { name: 'Dashboard', label: 'Stats', icon: ChartIcon, gradient: ['#06b6d4', '#22d3ee'] },
  { name: 'Pipeline', label: 'Pipeline', icon: TrendingUpIcon, gradient: ['#f59e0b', '#fbbf24'] },
  { name: 'Tasks', label: 'Taches', icon: CheckCircleIcon, gradient: ['#10b981', '#34d399'] },
  { name: 'Profile', label: 'Profil', icon: UserIcon, gradient: ['#64748b', '#94a3b8'] },
];

export default function LiquidGlassBottomNav() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const [activeIndex, setActiveIndex] = useState(0);
  const indicatorAnim = useRef(new Animated.Value(0)).current;
  const scaleAnims = useRef(bottomNavItems.map(() => new Animated.Value(1))).current;

  useEffect(() => {
    const currentIndex = bottomNavItems.findIndex(item => item.name === route.name);
    if (currentIndex !== -1) {
      setActiveIndex(currentIndex);
      Animated.spring(indicatorAnim, {
        toValue: currentIndex,
        useNativeDriver: true,
        friction: 6,
        tension: 50,
      }).start();
    }
  }, [route.name]);

  const handlePress = (index: number, name: keyof RootStackParamList) => {
    // Animate scale
    Animated.sequence([
      Animated.timing(scaleAnims[index], {
        toValue: 0.85,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnims[index], {
        toValue: 1,
        useNativeDriver: true,
        friction: 3,
        tension: 100,
      }),
    ]).start();

    navigation.navigate(name as any);
  };

  const renderNavItem = (item: BottomNavItem, index: number) => {
    const isActive = route.name === item.name;
    const Icon = item.icon;
    const itemWidth = SCREEN_WIDTH / bottomNavItems.length;

    return (
      <Animated.View
        key={item.name}
        style={[
          styles.tabWrapper,
          { transform: [{ scale: scaleAnims[index] }] },
        ]}
      >
        <TouchableOpacity
          onPress={() => handlePress(index, item.name)}
          activeOpacity={1}
          style={styles.tabButton}
          // @ts-ignore
          {...(isWeb && {
            className: `liquid-tab-item ${isActive ? 'liquid-tab-active' : ''}`,
          })}
        >
          {/* Glow effect behind active icon */}
          {isActive && (
            <View style={[styles.glowEffect, { backgroundColor: item.gradient[0] }]} />
          )}

          {/* Icon container */}
          <View
            style={[styles.iconContainer, isActive && styles.iconContainerActive]}
            // @ts-ignore
            {...(isWeb && isActive && { className: 'liquid-tab-icon' })}
          >
            {isActive ? (
              <LinearGradient
                colors={item.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.iconGradient}
              >
                <Icon size={24} color="#ffffff" />
              </LinearGradient>
            ) : (
              <Icon size={24} color="#64748b" />
            )}
          </View>

          {/* Label */}
          <Text
            style={[
              styles.tabLabel,
              isActive && { color: item.gradient[0], fontWeight: '700' },
            ]}
          >
            {item.label}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const itemWidth = SCREEN_WIDTH / bottomNavItems.length;
  const indicatorTranslateX = indicatorAnim.interpolate({
    inputRange: bottomNavItems.map((_, i) => i),
    outputRange: bottomNavItems.map((_, i) => i * itemWidth + itemWidth / 2 - 20),
  });

  return (
    <View style={styles.container}>
      {/* Glass background */}
      {Platform.OS === 'ios' ? (
        <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
      ) : (
        <View style={styles.glassBackground}>
          {/* Base gradient */}
          <LinearGradient
            colors={['rgba(15, 23, 42, 0.95)', 'rgba(30, 41, 59, 0.98)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          {/* Decorative orbs */}
          <View
            style={[styles.decorativeOrb, styles.orb1]}
            // @ts-ignore
            {...(isWeb && { className: 'liquid-nav-orb' })}
          />
          <View
            style={[styles.decorativeOrb, styles.orb2]}
            // @ts-ignore
            {...(isWeb && { className: 'liquid-nav-orb-delay' })}
          />

          {/* Top edge highlight */}
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.15)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.topHighlight}
          />
        </View>
      )}

      {/* Animated active indicator */}
      <Animated.View
        style={[
          styles.activeIndicator,
          { transform: [{ translateX: indicatorTranslateX }] },
        ]}
        // @ts-ignore
        {...(isWeb && { className: 'liquid-active-indicator' })}
      >
        <LinearGradient
          colors={bottomNavItems[activeIndex]?.gradient || ['#6366f1', '#8b5cf6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.indicatorGradient}
        />
      </Animated.View>

      {/* Tab items */}
      <View style={styles.tabsContainer}>
        {bottomNavItems.map((item, index) => renderNavItem(item, index))}
      </View>

      {/* Safe area spacer */}
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
    overflow: 'hidden',
    ...(isWeb ? {
      backgroundColor: 'rgba(15, 23, 42, 0.9)',
      backdropFilter: 'blur(40px) saturate(180%)',
      borderTop: '1px solid rgba(255, 255, 255, 0.08)',
      boxShadow: `
        0 -8px 40px rgba(0, 0, 0, 0.4),
        0 -2px 10px rgba(0, 0, 0, 0.2),
        inset 0 1px 0 rgba(255, 255, 255, 0.1)
      `,
    } : {
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      borderTopWidth: 1,
      borderTopColor: 'rgba(255, 255, 255, 0.08)',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -8 },
      shadowOpacity: 0.3,
      shadowRadius: 40,
      elevation: 20,
    }),
  },
  glassBackground: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  topHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
  },
  decorativeOrb: {
    position: 'absolute',
    borderRadius: 999,
    ...(isWeb ? {
      filter: 'blur(50px)',
    } : {}),
  },
  orb1: {
    width: 150,
    height: 150,
    top: -75,
    left: SCREEN_WIDTH * 0.2,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
  },
  orb2: {
    width: 120,
    height: 120,
    top: -60,
    right: SCREEN_WIDTH * 0.15,
    backgroundColor: 'rgba(168, 85, 247, 0.12)',
  },

  // Active indicator
  activeIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 40,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    zIndex: 10,
  },
  indicatorGradient: {
    flex: 1,
    borderRadius: 2,
    ...(isWeb ? {
      boxShadow: '0 0 20px rgba(99, 102, 241, 0.6)',
    } : {}),
  },

  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    height: BOTTOM_NAV_HEIGHT,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'space-around',
    position: 'relative',
    zIndex: 1,
  },
  tabWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    position: 'relative',
  },
  glowEffect: {
    position: 'absolute',
    top: 0,
    width: 60,
    height: 60,
    borderRadius: 30,
    opacity: 0.2,
    ...(isWeb ? {
      filter: 'blur(25px)',
    } : {}),
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    backgroundColor: 'transparent',
  },
  iconContainerActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  iconGradient: {
    width: 48,
    height: 48,
    borderRadius: 16,
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
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    letterSpacing: -0.2,
  },
  safeArea: {
    height: SAFE_AREA_BOTTOM,
    backgroundColor: 'transparent',
  },
});
