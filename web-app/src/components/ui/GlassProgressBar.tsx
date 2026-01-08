import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  ViewStyle,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { glassTheme } from '../../theme/glassTheme';

interface GlassProgressBarProps {
  value: number;
  maxValue?: number;
  label?: string;
  showValue?: boolean;
  valueFormatter?: (value: number, maxValue: number) => string;
  gradient?: [string, string];
  height?: number;
  animated?: boolean;
  style?: ViewStyle;
  variant?: 'default' | 'thin' | 'thick';
}

const VARIANT_CONFIG = {
  thin: { height: 4, borderRadius: 2 },
  default: { height: 8, borderRadius: 4 },
  thick: { height: 16, borderRadius: 8 },
};

export default function GlassProgressBar({
  value,
  maxValue = 100,
  label,
  showValue = true,
  valueFormatter,
  gradient = ['#007AFF', '#5AC8FA'],
  height,
  animated = true,
  style,
  variant = 'default',
}: GlassProgressBarProps) {
  const progressAnim = useRef(new Animated.Value(0)).current;
  const config = VARIANT_CONFIG[variant];
  const barHeight = height || config.height;
  const percentage = Math.min(Math.max((value / maxValue) * 100, 0), 100);

  useEffect(() => {
    if (animated) {
      Animated.spring(progressAnim, {
        toValue: percentage,
        tension: 40,
        friction: 10,
        useNativeDriver: false,
      }).start();
    } else {
      progressAnim.setValue(percentage);
    }
  }, [percentage, animated]);

  const width = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  const getFormattedValue = () => {
    if (valueFormatter) {
      return valueFormatter(value, maxValue);
    }
    return `${Math.round(percentage)}%`;
  };

  const getProgressColor = (): [string, string] => {
    if (percentage >= 80) return ['#34C759', '#30D158'];
    if (percentage >= 50) return ['#FF9500', '#FFCC00'];
    if (percentage >= 25) return ['#FF9500', '#FF6B6B'];
    return ['#FF3B30', '#FF453A'];
  };

  return (
    <View style={[styles.container, style]}>
      {(label || showValue) && (
        <View style={styles.header}>
          {label && <Text style={styles.label}>{label}</Text>}
          {showValue && <Text style={styles.value}>{getFormattedValue()}</Text>}
        </View>
      )}

      <View
        style={[
          styles.track,
          {
            height: barHeight,
            borderRadius: config.borderRadius,
          },
        ]}
      >
        {/* Glass background */}
        <View style={styles.trackBackground} />

        {/* Progress fill */}
        <Animated.View
          style={[
            styles.progress,
            {
              width,
              height: barHeight,
              borderRadius: config.borderRadius,
            },
          ]}
        >
          <LinearGradient
            colors={gradient || getProgressColor()}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />

          {/* Shine effect */}
          <View style={styles.shine} />
        </Animated.View>

        {/* Segment markers for thick variant */}
        {variant === 'thick' && (
          <View style={styles.segments}>
            {[25, 50, 75].map((seg) => (
              <View
                key={seg}
                style={[
                  styles.segment,
                  { left: `${seg}%` },
                ]}
              />
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

// Multi-segment progress bar
interface SegmentedProgressProps {
  segments: {
    value: number;
    color: string;
    label?: string;
  }[];
  total?: number;
  height?: number;
  showLabels?: boolean;
  style?: ViewStyle;
}

export function GlassSegmentedProgress({
  segments,
  total,
  height = 12,
  showLabels = true,
  style,
}: SegmentedProgressProps) {
  const calculatedTotal = total || segments.reduce((sum, seg) => sum + seg.value, 0);

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.track, { height, borderRadius: height / 2 }]}>
        <View style={styles.trackBackground} />

        <View style={styles.segmentedFill}>
          {segments.map((segment, index) => {
            const percentage = (segment.value / calculatedTotal) * 100;
            return (
              <View
                key={index}
                style={[
                  styles.segmentFill,
                  {
                    width: `${percentage}%`,
                    backgroundColor: segment.color,
                    borderTopLeftRadius: index === 0 ? height / 2 : 0,
                    borderBottomLeftRadius: index === 0 ? height / 2 : 0,
                    borderTopRightRadius: index === segments.length - 1 ? height / 2 : 0,
                    borderBottomRightRadius: index === segments.length - 1 ? height / 2 : 0,
                  },
                ]}
              />
            );
          })}
        </View>
      </View>

      {showLabels && (
        <View style={styles.legendContainer}>
          {segments.map((segment, index) => (
            <View key={index} style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: segment.color }]}
              />
              <Text style={styles.legendText}>
                {segment.label || `${Math.round((segment.value / calculatedTotal) * 100)}%`}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: glassTheme.spacing.xs,
  },
  label: {
    ...glassTheme.typography.bodySmall,
    color: glassTheme.colors.text.secondary,
    fontWeight: '500',
  },
  value: {
    ...glassTheme.typography.bodySmall,
    color: glassTheme.colors.text.primary,
    fontWeight: '600',
  },
  track: {
    overflow: 'hidden',
    position: 'relative',
  },
  trackBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    ...(Platform.OS === 'web' ? {
      // @ts-ignore
      backdropFilter: 'blur(5px)',
    } : {}),
  },
  progress: {
    overflow: 'hidden',
    position: 'relative',
  },
  shine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  segments: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
  },
  segment: {
    position: 'absolute',
    top: 2,
    bottom: 2,
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  segmentedFill: {
    flexDirection: 'row',
    height: '100%',
  },
  segmentFill: {
    height: '100%',
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: glassTheme.spacing.sm,
    gap: glassTheme.spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    ...glassTheme.typography.caption,
    color: glassTheme.colors.text.secondary,
  },
});
