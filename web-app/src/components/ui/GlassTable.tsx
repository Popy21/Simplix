import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ViewStyle,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { glassTheme, withShadow } from '../../theme/glassTheme';
import { isMobile, isTablet } from '../../theme/responsive';

interface Column<T> {
  key: keyof T | string;
  title: string;
  width?: number | string;
  render?: (item: T, index: number) => React.ReactNode;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  hideOnMobile?: boolean;
}

interface GlassTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T, index: number) => string;
  onRowPress?: (item: T, index: number) => void;
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  selectedRows?: string[];
  onSelectRow?: (key: string) => void;
  onSelectAll?: () => void;
  selectable?: boolean;
  style?: ViewStyle;
  emptyMessage?: string;
  stickyHeader?: boolean;
  striped?: boolean;
}

export default function GlassTable<T>({
  data,
  columns,
  keyExtractor,
  onRowPress,
  onSort,
  selectedRows = [],
  onSelectRow,
  onSelectAll,
  selectable = false,
  style,
  emptyMessage = 'Aucune donnee trouvee',
  stickyHeader = true,
  striped = true,
}: GlassTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  const visibleColumns = isMobile
    ? columns.filter((col) => !col.hideOnMobile)
    : columns;

  const handleSort = (key: string) => {
    const newDirection =
      sortKey === key && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortKey(key);
    setSortDirection(newDirection);
    onSort?.(key, newDirection);
  };

  const getValue = (item: T, key: keyof T | string): any => {
    if (typeof key === 'string' && key.includes('.')) {
      return key.split('.').reduce((obj: any, k) => obj?.[k], item);
    }
    return (item as any)[key];
  };

  const renderHeader = () => (
    <View style={[styles.headerRow, stickyHeader && styles.stickyHeader]}>
      {/* Glass background for header */}
      <View style={styles.headerBackground}>
        <LinearGradient
          colors={['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.8)']}
          style={StyleSheet.absoluteFill}
        />
      </View>

      {selectable && (
        <TouchableOpacity
          style={styles.checkboxCell}
          onPress={onSelectAll}
        >
          <View
            style={[
              styles.checkbox,
              selectedRows.length === data.length && styles.checkboxChecked,
            ]}
          >
            {selectedRows.length === data.length && (
              <Text style={styles.checkmark}>L</Text>
            )}
          </View>
        </TouchableOpacity>
      )}

      {visibleColumns.map((column) => (
        <TouchableOpacity
          key={String(column.key)}
          style={[
            styles.headerCell,
            { width: column.width, flex: column.width ? undefined : 1 },
            column.align === 'center' && styles.alignCenter,
            column.align === 'right' && styles.alignRight,
          ]}
          onPress={() => column.sortable && handleSort(String(column.key))}
          disabled={!column.sortable}
        >
          <Text style={styles.headerText}>{column.title}</Text>
          {column.sortable && sortKey === column.key && (
            <Text style={styles.sortIndicator}>
              {sortDirection === 'asc' ? ' ^' : ' v'}
            </Text>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderRow = (item: T, index: number) => {
    const rowKey = keyExtractor(item, index);
    const isSelected = selectedRows.includes(rowKey);
    const isHovered = hoveredRow === index;
    const isStriped = striped && index % 2 === 1;

    const rowTouchProps: any = {
      key: rowKey,
      onPress: () => onRowPress?.(item, index),
      style: [
        styles.row,
        isStriped && styles.stripedRow,
        isSelected && styles.selectedRow,
        isHovered && styles.hoveredRow,
      ],
      activeOpacity: 0.7,
    };

    if (Platform.OS === 'web') {
      rowTouchProps.onMouseEnter = () => setHoveredRow(index);
      rowTouchProps.onMouseLeave = () => setHoveredRow(null);
    }

    return (
      <TouchableOpacity {...rowTouchProps}>
        {selectable && (
          <TouchableOpacity
            style={styles.checkboxCell}
            onPress={() => onSelectRow?.(rowKey)}
          >
            <View
              style={[styles.checkbox, isSelected && styles.checkboxChecked]}
            >
              {isSelected && <Text style={styles.checkmark}>L</Text>}
            </View>
          </TouchableOpacity>
        )}

        {visibleColumns.map((column) => (
          <View
            key={String(column.key)}
            style={[
              styles.cell,
              { width: column.width, flex: column.width ? undefined : 1 },
              column.align === 'center' && styles.alignCenter,
              column.align === 'right' && styles.alignRight,
            ]}
          >
            {column.render ? (
              column.render(item, index)
            ) : (
              <Text style={styles.cellText} numberOfLines={1}>
                {String(getValue(item, column.key) ?? '-')}
              </Text>
            )}
          </View>
        ))}
      </TouchableOpacity>
    );
  };

  if (data.length === 0) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.glassBackground} />
        {renderHeader()}
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{emptyMessage}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, withShadow('md'), style]}>
      {/* Glass background */}
      <View style={styles.glassBackground} />

      {renderHeader()}

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        {data.map(renderRow)}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: glassTheme.radius.lg,
    overflow: 'hidden',
    flex: 1,
  },
  glassBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    ...(Platform.OS === 'web' ? {
      // @ts-ignore
      backdropFilter: 'blur(20px)',
    } : {}),
  },
  scrollView: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.06)',
    zIndex: 10,
  },
  stickyHeader: {
    ...(Platform.OS === 'web' ? {
      // @ts-ignore
      position: 'sticky',
      top: 0,
    } : {}),
  },
  headerBackground: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  headerCell: {
    paddingHorizontal: glassTheme.spacing.md,
    paddingVertical: glassTheme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    ...glassTheme.typography.caption,
    color: glassTheme.colors.text.secondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sortIndicator: {
    ...glassTheme.typography.caption,
    color: glassTheme.colors.primary,
    marginLeft: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.04)',
    ...(Platform.OS === 'web' ? {
      // @ts-ignore
      transition: 'background-color 0.2s ease',
      cursor: 'pointer',
    } : {}),
  },
  stripedRow: {
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
  },
  selectedRow: {
    backgroundColor: 'rgba(0, 122, 255, 0.08)',
  },
  hoveredRow: {
    backgroundColor: 'rgba(0, 122, 255, 0.05)',
  },
  cell: {
    paddingHorizontal: glassTheme.spacing.md,
    paddingVertical: glassTheme.spacing.sm,
    justifyContent: 'center',
  },
  cellText: {
    ...glassTheme.typography.body,
    color: glassTheme.colors.text.primary,
  },
  alignCenter: {
    alignItems: 'center',
  },
  alignRight: {
    alignItems: 'flex-end',
  },
  checkboxCell: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  checkboxChecked: {
    backgroundColor: glassTheme.colors.primary,
    borderColor: glassTheme.colors.primary,
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    transform: [{ scaleX: -1 }, { rotate: '-45deg' }],
  },
  emptyContainer: {
    padding: glassTheme.spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    ...glassTheme.typography.body,
    color: glassTheme.colors.text.tertiary,
  },
});
