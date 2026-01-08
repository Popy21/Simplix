import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ScrollView,
  ViewStyle,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { glassTheme, withShadow } from '../../theme/glassTheme';

interface Tab {
  key: string;
  label: string;
  icon?: React.ReactNode;
  badge?: number;
}

interface GlassTabBarProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (key: string) => void;
  variant?: 'default' | 'pills' | 'underline' | 'segmented';
  scrollable?: boolean;
  style?: ViewStyle;
  gradient?: [string, string];
}

export default function GlassTabBar({
  tabs,
  activeTab,
  onTabChange,
  variant = 'default',
  scrollable = false,
  style,
  gradient = ['#007AFF', '#5AC8FA'],
}: GlassTabBarProps) {
  const indicatorAnim = useRef(new Animated.Value(0)).current;
  const activeIndex = tabs.findIndex((tab) => tab.key === activeTab);

  useEffect(() => {
    Animated.spring(indicatorAnim, {
      toValue: activeIndex,
      tension: 60,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, [activeIndex]);

  const renderTab = (tab: Tab, index: number) => {
    const isActive = tab.key === activeTab;

    if (variant === 'pills') {
      return (
        <TouchableOpacity
          key={tab.key}
          onPress={() => onTabChange(tab.key)}
          activeOpacity={0.8}
          style={[
            styles.pillTab,
            isActive && styles.pillTabActive,
          ]}
        >
          {isActive && (
            <LinearGradient
              colors={gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          )}
          {tab.icon && (
            <View style={styles.tabIcon}>{tab.icon}</View>
          )}
          <Text
            style={[
              styles.pillTabText,
              isActive && styles.pillTabTextActive,
            ]}
          >
            {tab.label}
          </Text>
          {tab.badge !== undefined && tab.badge > 0 && (
            <View style={[styles.badge, isActive && styles.badgeActive]}>
              <Text style={styles.badgeText}>
                {tab.badge > 99 ? '99+' : tab.badge}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      );
    }

    if (variant === 'segmented') {
      return (
        <TouchableOpacity
          key={tab.key}
          onPress={() => onTabChange(tab.key)}
          activeOpacity={0.8}
          style={[
            styles.segmentedTab,
            index > 0 && styles.segmentedTabBorder,
          ]}
        >
          {isActive && (
            <View style={styles.segmentedActive}>
              <View style={styles.segmentedActiveGlass} />
            </View>
          )}
          {tab.icon && (
            <View style={styles.tabIcon}>{tab.icon}</View>
          )}
          <Text
            style={[
              styles.segmentedTabText,
              isActive && styles.segmentedTabTextActive,
            ]}
          >
            {tab.label}
          </Text>
        </TouchableOpacity>
      );
    }

    if (variant === 'underline') {
      return (
        <TouchableOpacity
          key={tab.key}
          onPress={() => onTabChange(tab.key)}
          activeOpacity={0.7}
          style={styles.underlineTab}
        >
          {tab.icon && (
            <View style={styles.tabIcon}>{tab.icon}</View>
          )}
          <Text
            style={[
              styles.underlineTabText,
              isActive && styles.underlineTabTextActive,
            ]}
          >
            {tab.label}
          </Text>
          {tab.badge !== undefined && tab.badge > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{tab.badge}</Text>
            </View>
          )}
          {isActive && (
            <LinearGradient
              colors={gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.underlineIndicator}
            />
          )}
        </TouchableOpacity>
      );
    }

    // Default variant
    return (
      <TouchableOpacity
        key={tab.key}
        onPress={() => onTabChange(tab.key)}
        activeOpacity={0.7}
        style={[styles.defaultTab, isActive && styles.defaultTabActive]}
      >
        {tab.icon && (
          <View style={styles.tabIcon}>{tab.icon}</View>
        )}
        <Text
          style={[
            styles.defaultTabText,
            isActive && styles.defaultTabTextActive,
          ]}
        >
          {tab.label}
        </Text>
        {tab.badge !== undefined && tab.badge > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{tab.badge}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const getContainerStyle = () => {
    switch (variant) {
      case 'pills':
        return styles.pillsContainer;
      case 'segmented':
        return styles.segmentedContainer;
      case 'underline':
        return styles.underlineContainer;
      default:
        return styles.defaultContainer;
    }
  };

  const content = (
    <View style={[getContainerStyle(), style]}>
      {variant !== 'pills' && variant !== 'underline' && (
        <View style={styles.glassBackground} />
      )}
      {tabs.map(renderTab)}
    </View>
  );

  if (scrollable) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {content}
      </ScrollView>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: glassTheme.spacing.md,
  },

  // Default variant
  defaultContainer: {
    flexDirection: 'row',
    borderRadius: glassTheme.radius.lg,
    padding: glassTheme.spacing.xs,
    overflow: 'hidden',
    ...withShadow('sm'),
  },
  glassBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    ...(Platform.OS === 'web' ? {
      // @ts-ignore
      backdropFilter: 'blur(15px)',
    } : {}),
  },
  defaultTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: glassTheme.spacing.sm,
    paddingHorizontal: glassTheme.spacing.md,
    borderRadius: glassTheme.radius.md,
    gap: 6,
  },
  defaultTabActive: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  defaultTabText: {
    ...glassTheme.typography.bodySmall,
    color: glassTheme.colors.text.secondary,
    fontWeight: '500',
  },
  defaultTabTextActive: {
    color: glassTheme.colors.primary,
    fontWeight: '600',
  },

  // Pills variant
  pillsContainer: {
    flexDirection: 'row',
    gap: glassTheme.spacing.sm,
  },
  pillTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: glassTheme.spacing.sm,
    paddingHorizontal: glassTheme.spacing.md,
    borderRadius: glassTheme.radius.full,
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
    gap: 6,
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? {
      // @ts-ignore
      transition: 'all 0.2s ease',
    } : {}),
  },
  pillTabActive: {
    ...withShadow('sm'),
  },
  pillTabText: {
    ...glassTheme.typography.bodySmall,
    color: glassTheme.colors.text.secondary,
    fontWeight: '500',
    zIndex: 1,
  },
  pillTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // Segmented variant
  segmentedContainer: {
    flexDirection: 'row',
    borderRadius: glassTheme.radius.md,
    padding: 4,
    overflow: 'hidden',
    ...withShadow('sm'),
  },
  segmentedTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: glassTheme.spacing.sm,
    paddingHorizontal: glassTheme.spacing.md,
    position: 'relative',
    gap: 6,
  },
  segmentedTabBorder: {
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(0, 0, 0, 0.06)',
  },
  segmentedActive: {
    ...StyleSheet.absoluteFillObject,
    margin: 2,
    borderRadius: glassTheme.radius.sm,
    overflow: 'hidden',
  },
  segmentedActiveGlass: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
    ...(Platform.OS === 'web' ? {
      // @ts-ignore
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 2,
    }),
  },
  segmentedTabText: {
    ...glassTheme.typography.bodySmall,
    color: glassTheme.colors.text.tertiary,
    fontWeight: '500',
    zIndex: 1,
  },
  segmentedTabTextActive: {
    color: glassTheme.colors.text.primary,
    fontWeight: '600',
  },

  // Underline variant
  underlineContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.06)',
  },
  underlineTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: glassTheme.spacing.md,
    paddingHorizontal: glassTheme.spacing.sm,
    position: 'relative',
    gap: 6,
  },
  underlineTabText: {
    ...glassTheme.typography.body,
    color: glassTheme.colors.text.tertiary,
    fontWeight: '500',
  },
  underlineTabTextActive: {
    color: glassTheme.colors.primary,
    fontWeight: '600',
  },
  underlineIndicator: {
    position: 'absolute',
    bottom: -1,
    left: glassTheme.spacing.md,
    right: glassTheme.spacing.md,
    height: 3,
    borderRadius: 2,
  },

  // Common
  tabIcon: {
    marginRight: 4,
  },
  badge: {
    backgroundColor: glassTheme.colors.error,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginLeft: 4,
  },
  badgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  badgeText: {
    ...glassTheme.typography.caption,
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 10,
  },
});
