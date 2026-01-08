import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
  Platform,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { glassTheme, withShadow } from '../../theme/glassTheme';

interface DataPoint {
  value: number;
  label?: string;
}

interface GlassChartProps {
  data: DataPoint[];
  type?: 'bar' | 'line' | 'area' | 'donut';
  title?: string;
  subtitle?: string;
  height?: number;
  gradient?: [string, string];
  showLabels?: boolean;
  showValues?: boolean;
  showGrid?: boolean;
  style?: ViewStyle;
  valueFormatter?: (value: number) => string;
}

// Simple Bar Chart
export function GlassBarChart({
  data,
  title,
  subtitle,
  height = 200,
  gradient = ['#007AFF', '#5AC8FA'],
  showLabels = true,
  showValues = true,
  showGrid = true,
  style,
  valueFormatter,
}: GlassChartProps) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const barWidth = `${100 / data.length - 4}%`;

  const formatValue = (val: number) => {
    if (valueFormatter) return valueFormatter(val);
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `${(val / 1000).toFixed(1)}k`;
    return val.toString();
  };

  return (
    <View style={[styles.container, withShadow('md'), style]}>
      <View style={styles.glassBackground} />

      {(title || subtitle) && (
        <View style={styles.header}>
          {title && <Text style={styles.title}>{title}</Text>}
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      )}

      <View style={[styles.chartArea, { height }]}>
        {/* Grid lines */}
        {showGrid && (
          <View style={styles.gridContainer}>
            {[0, 25, 50, 75, 100].map((percent) => (
              <View
                key={percent}
                style={[styles.gridLine, { bottom: `${percent}%` }]}
              />
            ))}
          </View>
        )}

        {/* Bars */}
        <View style={styles.barsContainer}>
          {data.map((point, index) => {
            const barHeight = (point.value / maxValue) * 100;

            return (
              <View key={index} style={[styles.barWrapper, { width: barWidth }]}>
                {showValues && (
                  <Text style={styles.barValue}>{formatValue(point.value)}</Text>
                )}
                <View
                  style={[
                    styles.bar,
                    { height: `${barHeight}%` },
                  ]}
                >
                  <LinearGradient
                    colors={gradient}
                    start={{ x: 0, y: 1 }}
                    end={{ x: 0, y: 0 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <View style={styles.barShine} />
                </View>
                {showLabels && point.label && (
                  <Text style={styles.barLabel} numberOfLines={1}>
                    {point.label}
                  </Text>
                )}
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

// Simple Area/Line Chart
export function GlassAreaChart({
  data,
  title,
  subtitle,
  height = 200,
  gradient = ['#007AFF', '#5AC8FA'],
  showLabels = true,
  showValues = false,
  showGrid = true,
  style,
  valueFormatter,
}: GlassChartProps) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const minValue = Math.min(...data.map((d) => d.value), 0);
  const range = maxValue - minValue || 1;

  const points = data.map((point, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = ((point.value - minValue) / range) * 100;
    return { x, y, value: point.value, label: point.label };
  });

  return (
    <View style={[styles.container, withShadow('md'), style]}>
      <View style={styles.glassBackground} />

      {(title || subtitle) && (
        <View style={styles.header}>
          {title && <Text style={styles.title}>{title}</Text>}
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      )}

      <View style={[styles.chartArea, { height }]}>
        {/* Grid lines */}
        {showGrid && (
          <View style={styles.gridContainer}>
            {[0, 25, 50, 75, 100].map((percent) => (
              <View
                key={percent}
                style={[styles.gridLine, { bottom: `${percent}%` }]}
              />
            ))}
          </View>
        )}

        {/* Area fill using views */}
        <View style={styles.areaContainer}>
          {points.map((point, index) => (
            <View
              key={index}
              style={[
                styles.areaSegment,
                {
                  left: `${point.x}%`,
                  height: `${point.y}%`,
                  backgroundColor: gradient[0] + '30',
                },
              ]}
            />
          ))}
        </View>

        {/* Data points */}
        <View style={styles.pointsContainer}>
          {points.map((point, index) => (
            <View
              key={index}
              style={[
                styles.dataPoint,
                {
                  left: `${point.x}%`,
                  bottom: `${point.y}%`,
                },
              ]}
            >
              <LinearGradient
                colors={gradient}
                style={styles.dataPointFill}
              />
              <View style={styles.dataPointInner} />
            </View>
          ))}
        </View>

        {/* Labels */}
        {showLabels && (
          <View style={styles.labelsContainer}>
            {data.map((point, index) => (
              <Text
                key={index}
                style={[
                  styles.areaLabel,
                  { left: `${(index / (data.length - 1)) * 100}%` },
                ]}
                numberOfLines={1}
              >
                {point.label}
              </Text>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

// Simple Donut Chart
export function GlassDonutChart({
  data,
  title,
  subtitle,
  height = 200,
  style,
  valueFormatter,
}: GlassChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const colors = [
    '#007AFF',
    '#34C759',
    '#FF9500',
    '#FF3B30',
    '#5856D6',
    '#AF52DE',
    '#00C7BE',
    '#FF2D55',
  ];

  let currentAngle = -90;

  return (
    <View style={[styles.container, withShadow('md'), style]}>
      <View style={styles.glassBackground} />

      {(title || subtitle) && (
        <View style={styles.header}>
          {title && <Text style={styles.title}>{title}</Text>}
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      )}

      <View style={[styles.donutContainer, { height }]}>
        {/* Donut visualization using segments */}
        <View style={styles.donut}>
          {data.map((point, index) => {
            const percentage = (point.value / total) * 100;
            const angle = (percentage / 100) * 360;
            const startAngle = currentAngle;
            currentAngle += angle;

            return (
              <View
                key={index}
                style={[
                  styles.donutSegment,
                  {
                    backgroundColor: colors[index % colors.length],
                    transform: [
                      { rotate: `${startAngle}deg` },
                    ],
                    opacity: percentage > 0 ? 1 : 0,
                  },
                ]}
              />
            );
          })}
          <View style={styles.donutCenter}>
            <Text style={styles.donutTotal}>
              {valueFormatter ? valueFormatter(total) : total.toLocaleString()}
            </Text>
            <Text style={styles.donutTotalLabel}>Total</Text>
          </View>
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          {data.map((point, index) => {
            const percentage = (point.value / total) * 100;
            return (
              <View key={index} style={styles.legendItem}>
                <View
                  style={[
                    styles.legendColor,
                    { backgroundColor: colors[index % colors.length] },
                  ]}
                />
                <View style={styles.legendContent}>
                  <Text style={styles.legendLabel} numberOfLines={1}>
                    {point.label}
                  </Text>
                  <Text style={styles.legendValue}>
                    {percentage.toFixed(1)}%
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

// Default export with type selection
export default function GlassChart(props: GlassChartProps) {
  switch (props.type) {
    case 'bar':
      return <GlassBarChart {...props} />;
    case 'line':
    case 'area':
      return <GlassAreaChart {...props} />;
    case 'donut':
      return <GlassDonutChart {...props} />;
    default:
      return <GlassBarChart {...props} />;
  }
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
  header: {
    padding: glassTheme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.04)',
    zIndex: 1,
  },
  title: {
    ...glassTheme.typography.h2,
    color: glassTheme.colors.text.primary,
  },
  subtitle: {
    ...glassTheme.typography.caption,
    color: glassTheme.colors.text.tertiary,
    marginTop: 2,
  },
  chartArea: {
    padding: glassTheme.spacing.md,
    position: 'relative',
    zIndex: 1,
  },
  gridContainer: {
    ...StyleSheet.absoluteFillObject,
    paddingHorizontal: glassTheme.spacing.md,
  },
  gridLine: {
    position: 'absolute',
    left: glassTheme.spacing.md,
    right: glassTheme.spacing.md,
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
  },

  // Bar chart styles
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    flex: 1,
    paddingTop: 20,
    paddingBottom: 24,
  },
  barWrapper: {
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '70%',
    borderRadius: 6,
    overflow: 'hidden',
    minHeight: 4,
  },
  barShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: '50%',
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  barValue: {
    ...glassTheme.typography.caption,
    color: glassTheme.colors.text.secondary,
    fontWeight: '600',
    marginBottom: 4,
  },
  barLabel: {
    ...glassTheme.typography.caption,
    color: glassTheme.colors.text.tertiary,
    marginTop: glassTheme.spacing.sm,
    textAlign: 'center',
  },

  // Area chart styles
  areaContainer: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
  },
  areaSegment: {
    position: 'absolute',
    width: 2,
    bottom: 24,
  },
  pointsContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  dataPoint: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    marginLeft: -7,
    marginBottom: -7,
    overflow: 'hidden',
  },
  dataPointFill: {
    ...StyleSheet.absoluteFillObject,
  },
  dataPointInner: {
    position: 'absolute',
    top: 3,
    left: 3,
    right: 3,
    bottom: 3,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  labelsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: glassTheme.spacing.md,
  },
  areaLabel: {
    ...glassTheme.typography.caption,
    color: glassTheme.colors.text.tertiary,
    position: 'absolute',
    transform: [{ translateX: -20 }],
    textAlign: 'center',
    width: 40,
  },

  // Donut chart styles
  donutContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: glassTheme.spacing.md,
    zIndex: 1,
  },
  donut: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  donutSegment: {
    position: 'absolute',
    width: '50%',
    height: '100%',
    right: 0,
    transformOrigin: 'left center',
  },
  donutCenter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'web' ? {
      // @ts-ignore
      backdropFilter: 'blur(10px)',
    } : {}),
  },
  donutTotal: {
    ...glassTheme.typography.h2,
    color: glassTheme.colors.text.primary,
    fontWeight: '700',
  },
  donutTotalLabel: {
    ...glassTheme.typography.caption,
    color: glassTheme.colors.text.tertiary,
  },
  legend: {
    flex: 1,
    marginLeft: glassTheme.spacing.lg,
    gap: glassTheme.spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 3,
    marginRight: glassTheme.spacing.sm,
  },
  legendContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  legendLabel: {
    ...glassTheme.typography.bodySmall,
    color: glassTheme.colors.text.primary,
    flex: 1,
  },
  legendValue: {
    ...glassTheme.typography.bodySmall,
    color: glassTheme.colors.text.tertiary,
    fontWeight: '600',
  },
});
