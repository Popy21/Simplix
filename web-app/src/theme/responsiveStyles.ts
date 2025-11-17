import { StyleSheet, TextStyle, ViewStyle } from 'react-native';
import { glassTheme } from './glassTheme';
import {
  isMobile,
  isTablet,
  layout,
  responsiveSpacing,
  responsiveFontSizes,
  getResponsiveValue,
} from './responsive';

// Common responsive styles
export const commonStyles = StyleSheet.create({
  // Containers
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: layout.contentPadding,
    paddingTop: isMobile ? responsiveSpacing.md : 24,
  },

  // Headers
  header: {
    marginBottom: responsiveSpacing.lg,
  },
  title: {
    fontSize: responsiveFontSizes.displayMedium,
    fontWeight: '700',
    color: glassTheme.colors.text.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: responsiveFontSizes.body,
    color: glassTheme.colors.text.tertiary,
  },

  // Cards
  card: {
    marginBottom: responsiveSpacing.md,
  },
  cardPadding: {
    padding: layout.cardPadding,
  },

  // Grid layouts
  grid: {
    gap: responsiveSpacing.md,
    flexDirection: isMobile ? 'column' : 'row',
    flexWrap: 'wrap',
  },
  gridItem: {
    flex: isMobile ? undefined : 1,
    minWidth: isMobile ? '100%' : '48%',
  },

  // Stats
  statsRow: {
    flexDirection: isMobile ? 'column' : 'row',
    gap: responsiveSpacing.md,
  },
  statCard: {
    flex: isMobile ? undefined : 1,
  },

  // Buttons
  button: {
    paddingVertical: getResponsiveValue(10, 12, 14),
    paddingHorizontal: getResponsiveValue(16, 20, 24),
    borderRadius: layout.borderRadius.md,
  },
  buttonText: {
    fontSize: responsiveFontSizes.body,
    fontWeight: '600',
  },

  // Typography responsive
  h1: {
    fontSize: responsiveFontSizes.h1,
    fontWeight: '700',
    color: glassTheme.colors.text.primary,
  },
  h2: {
    fontSize: responsiveFontSizes.h2,
    fontWeight: '600',
    color: glassTheme.colors.text.primary,
  },
  h3: {
    fontSize: responsiveFontSizes.h3,
    fontWeight: '600',
    color: glassTheme.colors.text.primary,
  },
  body: {
    fontSize: responsiveFontSizes.body,
    color: glassTheme.colors.text.primary,
  },
  bodyLarge: {
    fontSize: responsiveFontSizes.bodyLarge,
    color: glassTheme.colors.text.primary,
  },
  caption: {
    fontSize: responsiveFontSizes.caption,
    color: glassTheme.colors.text.tertiary,
  },

  // Spacing
  spacingXs: { marginBottom: responsiveSpacing.xs },
  spacingSm: { marginBottom: responsiveSpacing.sm },
  spacingMd: { marginBottom: responsiveSpacing.md },
  spacingLg: { marginBottom: responsiveSpacing.lg },
  spacingXl: { marginBottom: responsiveSpacing.xl },
});

// Helper function to create responsive grid
export const createResponsiveGrid = (columns: number = 2): ViewStyle => ({
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: responsiveSpacing.md,
  width: '100%',
});

// Helper function for responsive card width
export const getCardWidth = (columns: number = 2): ViewStyle => {
  if (isMobile) {
    return { width: '100%' };
  }

  const gap = responsiveSpacing.md;
  const totalGap = gap * (columns - 1);
  const cardWidth = `${(100 / columns) - (totalGap / columns)}%`;

  return {
    width: cardWidth,
    minWidth: getResponsiveValue(200, 250, 300),
  };
};

// Helper for modal container
export const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: layout.contentPadding,
  },
  container: {
    width: '100%',
    maxWidth: isMobile ? '100%' : (isTablet ? 500 : 600),
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: layout.borderRadius.lg,
    overflow: 'hidden',
  },
  header: {
    padding: layout.contentPadding,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.06)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: layout.contentPadding,
  },
  footer: {
    padding: layout.contentPadding,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.06)',
  },
});

export default {
  commonStyles,
  createResponsiveGrid,
  getCardWidth,
  modalStyles,
};
