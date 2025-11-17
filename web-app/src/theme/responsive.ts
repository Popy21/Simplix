import { Dimensions, Platform } from 'react-native';

const { width, height } = Dimensions.get('window');

// Breakpoints
export const breakpoints = {
  mobile: 480,
  tablet: 768,
  desktop: 1024,
  wide: 1440,
};

// Device detection
export const isMobile = width < breakpoints.tablet;
export const isTablet = width >= breakpoints.tablet && width < breakpoints.desktop;
export const isDesktop = width >= breakpoints.desktop;
export const isWide = width >= breakpoints.wide;

// Screen dimensions
export const screenWidth = width;
export const screenHeight = height;

// Responsive values helper
export const getResponsiveValue = <T,>(
  mobile: T,
  tablet: T,
  desktop: T
): T => {
  if (isMobile) return mobile;
  if (isTablet) return tablet;
  return desktop;
};

// Spacing helpers
export const responsiveSpacing = {
  xs: getResponsiveValue(4, 6, 8),
  sm: getResponsiveValue(8, 10, 12),
  md: getResponsiveValue(12, 16, 20),
  lg: getResponsiveValue(16, 24, 32),
  xl: getResponsiveValue(24, 32, 48),
  xxl: getResponsiveValue(32, 48, 64),
};

// Font sizes
export const responsiveFontSizes = {
  caption: getResponsiveValue(11, 12, 12),
  body: getResponsiveValue(14, 15, 16),
  bodyLarge: getResponsiveValue(15, 16, 17),
  h3: getResponsiveValue(16, 18, 20),
  h2: getResponsiveValue(18, 20, 24),
  h1: getResponsiveValue(22, 26, 32),
  displaySmall: getResponsiveValue(24, 28, 32),
  displayMedium: getResponsiveValue(28, 32, 40),
  displayLarge: getResponsiveValue(32, 40, 48),
};

// Layout helpers
export const layout = {
  sidebarWidth: getResponsiveValue(0, 72, 280),
  sidebarCollapsedWidth: 72,
  headerHeight: getResponsiveValue(56, 64, 72),
  bottomNavHeight: 64,
  contentPadding: getResponsiveValue(12, 16, 24),
  cardPadding: getResponsiveValue(12, 16, 20),
  borderRadius: {
    sm: getResponsiveValue(6, 8, 10),
    md: getResponsiveValue(10, 12, 16),
    lg: getResponsiveValue(16, 20, 24),
  },
};

// Grid helpers
export const getGridColumns = (minWidth: number = 280): number => {
  const availableWidth = width - layout.sidebarWidth - (layout.contentPadding * 2);
  return Math.floor(availableWidth / minWidth);
};

// Utility to check if device is touch-enabled
export const isTouchDevice = Platform.OS === 'ios' || Platform.OS === 'android';

export default {
  breakpoints,
  isMobile,
  isTablet,
  isDesktop,
  isWide,
  screenWidth,
  screenHeight,
  getResponsiveValue,
  responsiveSpacing,
  responsiveFontSizes,
  layout,
  getGridColumns,
  isTouchDevice,
};
