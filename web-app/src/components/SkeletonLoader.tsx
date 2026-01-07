import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { glassTheme } from '../theme/glassTheme';

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export default function SkeletonLoader({
  width = '100%',
  height = 20,
  borderRadius = glassTheme.radius.md,
  style,
}: SkeletonLoaderProps) {
  // Animation disabled to avoid React hooks violations when used in .map()
  return (
    <View
      style={[
        styles.container,
        {
          width: width as any, // Support both string and number
          height,
          borderRadius,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    overflow: 'hidden',
  },
});

// Skeleton variants for common use cases

interface SkeletonCardProps {
  style?: ViewStyle;
}

export function SkeletonCard({ style }: SkeletonCardProps) {
  return (
    <View style={[skeletonStyles.card, style]}>
      <SkeletonLoader width="40%" height={24} style={{ marginBottom: 12 }} />
      <SkeletonLoader width="100%" height={16} style={{ marginBottom: 8 }} />
      <SkeletonLoader width="80%" height={16} style={{ marginBottom: 8 }} />
      <SkeletonLoader width="60%" height={16} />
    </View>
  );
}

export function SkeletonKPICard({ style }: SkeletonCardProps) {
  return (
    <View style={[skeletonStyles.kpiCard, style]}>
      <View style={skeletonStyles.kpiHeader}>
        <SkeletonLoader width={40} height={40} borderRadius={20} />
        <SkeletonLoader width="60%" height={16} style={{ marginLeft: 12 }} />
      </View>
      <SkeletonLoader width="50%" height={32} style={{ marginTop: 16, marginBottom: 8 }} />
      <SkeletonLoader width="40%" height={14} />
    </View>
  );
}

export function SkeletonList({ count = 3, style }: { count?: number; style?: ViewStyle }) {
  return (
    <View style={style}>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={skeletonStyles.listItem}>
          <SkeletonLoader width={48} height={48} borderRadius={24} />
          <View style={skeletonStyles.listItemContent}>
            <SkeletonLoader width="70%" height={16} style={{ marginBottom: 8 }} />
            <SkeletonLoader width="40%" height={14} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function SkeletonChart({ style }: SkeletonCardProps) {
  return (
    <View style={[skeletonStyles.chart, style]}>
      <SkeletonLoader width="40%" height={20} style={{ marginBottom: 20 }} />
      <View style={skeletonStyles.chartBars}>
        <SkeletonLoader width="100%" height={8} style={{ marginBottom: 12 }} />
        <SkeletonLoader width="80%" height={8} style={{ marginBottom: 12 }} />
        <SkeletonLoader width="60%" height={8} style={{ marginBottom: 12 }} />
        <SkeletonLoader width="90%" height={8} />
      </View>
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  card: {
    padding: glassTheme.spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: glassTheme.radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
  kpiCard: {
    padding: glassTheme.spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: glassTheme.radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
  kpiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: glassTheme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  listItemContent: {
    flex: 1,
    marginLeft: glassTheme.spacing.sm,
  },
  chart: {
    padding: glassTheme.spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: glassTheme.radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
  chartBars: {
    marginTop: glassTheme.spacing.md,
  },
});
