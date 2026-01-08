import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { glassTheme, withShadow } from '../../theme/glassTheme';
import { isMobile } from '../../theme/responsive';

interface StatItem {
  label: string;
  value: string | number;
  change?: number;
  icon?: React.ReactNode;
  color?: string;
}

interface GlassStatsProps {
  items: StatItem[];
  columns?: 2 | 3 | 4;
  style?: ViewStyle;
  variant?: 'default' | 'compact' | 'cards';
}

export default function GlassStats({
  items,
  columns = isMobile ? 2 : 4,
  style,
  variant = 'default',
}: GlassStatsProps) {
  if (variant === 'cards') {
    return (
      <View style={[styles.cardsContainer, style]}>
        {items.map((item, index) => (
          <View
            key={index}
            style={[
              styles.card,
              { width: `${100 / columns - 2}%` },
              withShadow('sm'),
            ]}
          >
            <View style={styles.cardGlass} />

            {item.icon && (
              <View
                style={[
                  styles.cardIcon,
                  { backgroundColor: (item.color || glassTheme.colors.primary) + '15' },
                ]}
              >
                {item.icon}
              </View>
            )}

            <Text style={styles.cardValue}>
              {typeof item.value === 'number'
                ? item.value.toLocaleString('fr-FR')
                : item.value}
            </Text>

            <Text style={styles.cardLabel}>{item.label}</Text>

            {item.change !== undefined && (
              <View
                style={[
                  styles.cardChange,
                  {
                    backgroundColor:
                      item.change >= 0
                        ? 'rgba(52, 199, 89, 0.1)'
                        : 'rgba(255, 59, 48, 0.1)',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.cardChangeText,
                    {
                      color:
                        item.change >= 0
                          ? glassTheme.colors.success
                          : glassTheme.colors.error,
                    },
                  ]}
                >
                  {item.change >= 0 ? '+' : ''}{item.change.toFixed(1)}%
                </Text>
              </View>
            )}
          </View>
        ))}
      </View>
    );
  }

  if (variant === 'compact') {
    return (
      <View style={[styles.compactContainer, withShadow('sm'), style]}>
        <View style={styles.compactGlass} />
        {items.map((item, index) => (
          <View
            key={index}
            style={[
              styles.compactItem,
              index < items.length - 1 && styles.compactItemBorder,
            ]}
          >
            <Text style={styles.compactValue}>
              {typeof item.value === 'number'
                ? item.value.toLocaleString('fr-FR')
                : item.value}
            </Text>
            <Text style={styles.compactLabel}>{item.label}</Text>
          </View>
        ))}
      </View>
    );
  }

  // Default variant
  return (
    <View style={[styles.container, withShadow('md'), style]}>
      <View style={styles.glassBackground} />

      <View style={styles.grid}>
        {items.map((item, index) => (
          <View
            key={index}
            style={[
              styles.item,
              { width: `${100 / columns}%` },
              index < items.length - columns && styles.itemBorderBottom,
              (index + 1) % columns !== 0 && styles.itemBorderRight,
            ]}
          >
            <View style={styles.itemHeader}>
              {item.icon && (
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: (item.color || glassTheme.colors.primary) + '12' },
                  ]}
                >
                  {item.icon}
                </View>
              )}
              {item.change !== undefined && (
                <View
                  style={[
                    styles.changeBadge,
                    {
                      backgroundColor:
                        item.change >= 0
                          ? 'rgba(52, 199, 89, 0.12)'
                          : 'rgba(255, 59, 48, 0.12)',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.changeText,
                      {
                        color:
                          item.change >= 0
                            ? glassTheme.colors.success
                            : glassTheme.colors.error,
                      },
                    ]}
                  >
                    {item.change >= 0 ? '^' : 'v'} {Math.abs(item.change).toFixed(1)}%
                  </Text>
                </View>
              )}
            </View>

            <Text style={[styles.value, { color: item.color || glassTheme.colors.text.primary }]}>
              {typeof item.value === 'number'
                ? item.value.toLocaleString('fr-FR')
                : item.value}
            </Text>

            <Text style={styles.label}>{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: glassTheme.radius.xl,
    overflow: 'hidden',
  },
  glassBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    ...(Platform.OS === 'web' ? {
      // @ts-ignore
      backdropFilter: 'blur(20px)',
    } : {}),
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  item: {
    padding: glassTheme.spacing.lg,
    alignItems: 'flex-start',
  },
  itemBorderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.04)',
  },
  itemBorderRight: {
    borderRightWidth: 1,
    borderRightColor: 'rgba(0, 0, 0, 0.04)',
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: glassTheme.spacing.sm,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  changeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  changeText: {
    ...glassTheme.typography.caption,
    fontWeight: '700',
  },
  value: {
    ...glassTheme.typography.displaySmall,
    fontWeight: '700',
    marginBottom: 4,
  },
  label: {
    ...glassTheme.typography.caption,
    color: glassTheme.colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Compact variant
  compactContainer: {
    flexDirection: 'row',
    borderRadius: glassTheme.radius.lg,
    overflow: 'hidden',
  },
  compactGlass: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    ...(Platform.OS === 'web' ? {
      // @ts-ignore
      backdropFilter: 'blur(15px)',
    } : {}),
  },
  compactItem: {
    flex: 1,
    paddingVertical: glassTheme.spacing.md,
    paddingHorizontal: glassTheme.spacing.sm,
    alignItems: 'center',
  },
  compactItemBorder: {
    borderRightWidth: 1,
    borderRightColor: 'rgba(0, 0, 0, 0.06)',
  },
  compactValue: {
    ...glassTheme.typography.h2,
    color: glassTheme.colors.text.primary,
    fontWeight: '700',
  },
  compactLabel: {
    ...glassTheme.typography.caption,
    color: glassTheme.colors.text.tertiary,
    marginTop: 2,
  },

  // Cards variant
  cardsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: glassTheme.spacing.md,
  },
  card: {
    borderRadius: glassTheme.radius.lg,
    padding: glassTheme.spacing.md,
    overflow: 'hidden',
    minHeight: 100,
  },
  cardGlass: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    ...(Platform.OS === 'web' ? {
      // @ts-ignore
      backdropFilter: 'blur(15px)',
    } : {}),
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: glassTheme.spacing.sm,
    zIndex: 1,
  },
  cardValue: {
    ...glassTheme.typography.h1,
    color: glassTheme.colors.text.primary,
    fontWeight: '700',
    zIndex: 1,
  },
  cardLabel: {
    ...glassTheme.typography.caption,
    color: glassTheme.colors.text.tertiary,
    marginTop: 4,
    zIndex: 1,
  },
  cardChange: {
    position: 'absolute',
    top: glassTheme.spacing.sm,
    right: glassTheme.spacing.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  cardChangeText: {
    ...glassTheme.typography.caption,
    fontWeight: '700',
    fontSize: 10,
  },
});
