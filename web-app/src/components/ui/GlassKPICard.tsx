import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { glassTheme, withShadow } from '../../theme/glassTheme';

interface GlassKPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  gradient?: [string, string];
  onPress?: () => void;
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
  sparklineData?: number[];
}

const SIZE_CONFIG = {
  sm: { minHeight: 100, padding: 12, valueSize: 20, titleSize: 11 },
  md: { minHeight: 140, padding: 16, valueSize: 28, titleSize: 12 },
  lg: { minHeight: 180, padding: 20, valueSize: 36, titleSize: 13 },
};

export default function GlassKPICard({
  title,
  value,
  subtitle,
  change,
  changeLabel,
  icon,
  gradient = ['#007AFF', '#5AC8FA'],
  onPress,
  size = 'md',
  style,
  sparklineData,
}: GlassKPICardProps) {
  const config = SIZE_CONFIG[size];
  const isPositiveChange = change !== undefined && change >= 0;
  const isWeb = Platform.OS === 'web';

  const renderSparkline = () => {
    if (!sparklineData || sparklineData.length < 2) return null;

    const max = Math.max(...sparklineData);
    const min = Math.min(...sparklineData);
    const range = max - min || 1;
    const height = 40;
    const width = 80;
    const stepX = width / (sparklineData.length - 1);

    const points = sparklineData.map((value, index) => {
      const x = index * stepX;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    }).join(' ');

    return (
      <View style={styles.sparklineContainer}>
        <View style={{ width, height, opacity: 0.6 }}>
          {/* Simple SVG-like sparkline using views */}
          {sparklineData.map((val, idx) => {
            if (idx === sparklineData.length - 1) return null;
            const x1 = idx * stepX;
            const y1 = height - ((val - min) / range) * height;
            const x2 = (idx + 1) * stepX;
            const y2 = height - ((sparklineData[idx + 1] - min) / range) * height;

            return (
              <View
                key={idx}
                style={{
                  position: 'absolute',
                  left: x1,
                  top: Math.min(y1, y2),
                  width: stepX,
                  height: Math.abs(y2 - y1) || 2,
                  backgroundColor: 'rgba(255, 255, 255, 0.4)',
                  transform: [{ rotate: `${Math.atan2(y2 - y1, stepX) * (180 / Math.PI)}deg` }],
                }}
              />
            );
          })}
        </View>
      </View>
    );
  };

  const content = (
    <View style={styles.contentWrapper}>
      {/* Background gradient */}
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Glass overlay */}
      <View style={styles.glassOverlay} />

      {/* Decorative circles */}
      <View style={[styles.decorativeCircle, styles.circle1]} />
      <View style={[styles.decorativeCircle, styles.circle2]} />

      <View style={[styles.content, { padding: config.padding }]}>
        {/* Header with icon */}
        <View style={styles.header}>
          {icon && <View style={styles.iconContainer}>{icon}</View>}
          <View style={styles.titleContainer}>
            <Text style={[styles.title, { fontSize: config.titleSize }]} numberOfLines={1}>
              {title}
            </Text>
            {subtitle && (
              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            )}
          </View>
        </View>

        {/* Value */}
        <View style={styles.valueContainer}>
          <Text style={[styles.value, { fontSize: config.valueSize }]} numberOfLines={1}>
            {typeof value === 'number' ? value.toLocaleString('fr-FR') : value}
          </Text>
          {renderSparkline()}
        </View>

        {/* Change indicator */}
        {change !== undefined && (
          <View style={styles.changeContainer}>
            <View
              style={[
                styles.changeBadge,
                {
                  backgroundColor: isPositiveChange
                    ? 'rgba(52, 199, 89, 0.2)'
                    : 'rgba(255, 59, 48, 0.2)',
                },
              ]}
            >
              <Text
                style={[
                  styles.changeValue,
                  {
                    color: isPositiveChange ? '#34C759' : '#FF3B30',
                  },
                ]}
              >
                {isPositiveChange ? '+' : ''}{change.toFixed(1)}%
              </Text>
            </View>
            {changeLabel && (
              <Text style={styles.changeLabel}>{changeLabel}</Text>
            )}
          </View>
        )}
      </View>
    </View>
  );

  const cardStyles: ViewStyle[] = [
    styles.card,
    { minHeight: config.minHeight },
    withShadow('lg'),
    isWeb && {
      // @ts-ignore
      cursor: onPress ? 'pointer' : 'default',
      transition: 'all 0.3s ease',
    },
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.9}
        style={cardStyles}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyles}>{content}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: glassTheme.radius.xl,
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? {
      // @ts-ignore
      ':hover': {
        transform: 'translateY(-4px)',
        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15)',
      },
    } : {}),
  },
  contentWrapper: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    ...(Platform.OS === 'web' ? {
      // @ts-ignore
      backdropFilter: 'blur(10px)',
    } : {}),
  },
  decorativeCircle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  circle1: {
    width: 100,
    height: 100,
    top: -30,
    right: -30,
  },
  circle2: {
    width: 60,
    height: 60,
    bottom: -20,
    left: -20,
  },
  content: {
    flex: 1,
    zIndex: 1,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: glassTheme.spacing.sm,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subtitle: {
    ...glassTheme.typography.caption,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  value: {
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: -1,
  },
  sparklineContainer: {
    marginLeft: glassTheme.spacing.md,
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: glassTheme.spacing.sm,
  },
  changeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: glassTheme.radius.xs,
  },
  changeValue: {
    ...glassTheme.typography.caption,
    fontWeight: '700',
  },
  changeLabel: {
    ...glassTheme.typography.caption,
    color: 'rgba(255, 255, 255, 0.7)',
    marginLeft: glassTheme.spacing.sm,
  },
});
