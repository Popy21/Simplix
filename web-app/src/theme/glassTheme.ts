// Apple-inspired Liquid Glass Design System
// Premium glassmorphism theme with depth and fluidity

export const glassTheme = {
  // Colors - Apple-inspired palette
  colors: {
    // Primary
    primary: '#007AFF',
    primaryLight: '#5AC8FA',
    primaryDark: '#0051D5',

    // Accent colors
    accent: {
      purple: '#AF52DE',
      pink: '#FF2D55',
      orange: '#FF9500',
      yellow: '#FFCC00',
      green: '#34C759',
      teal: '#5AC8FA',
      indigo: '#5856D6',
    },

    // Neutrals with alpha
    glass: {
      light: 'rgba(255, 255, 255, 0.72)',
      medium: 'rgba(255, 255, 255, 0.5)',
      dark: 'rgba(0, 0, 0, 0.15)',
      backdrop: 'rgba(242, 242, 247, 0.88)',
    },

    // Backgrounds
    background: {
      primary: '#F2F2F7',
      secondary: '#FFFFFF',
      tertiary: '#F9F9F9',
      elevated: '#FFFFFF',
    },

    // Text
    text: {
      primary: '#000000',
      secondary: '#3C3C43',
      tertiary: '#8E8E93',
      quaternary: '#C7C7CC',
      inverse: '#FFFFFF',
    },

    // Semantic
    success: '#34C759',
    warning: '#FF9500',
    error: '#FF3B30',
    info: '#007AFF',
  },

  // Glassmorphism effects
  glass: {
    // Light glass (for bright backgrounds)
    light: {
      backgroundColor: 'rgba(255, 255, 255, 0.72)',
      backdropFilter: 'blur(40px) saturate(180%)',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.18)',
    },

    // Medium glass
    medium: {
      backgroundColor: 'rgba(255, 255, 255, 0.5)',
      backdropFilter: 'blur(30px) saturate(160%)',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.1)',
    },

    // Dark glass
    dark: {
      backgroundColor: 'rgba(0, 0, 0, 0.15)',
      backdropFilter: 'blur(20px) saturate(140%)',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.05)',
    },

    // Frosted glass
    frosted: {
      backgroundColor: 'rgba(242, 242, 247, 0.88)',
      backdropFilter: 'blur(50px) saturate(200%)',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.3)',
    },
  },

  // Shadows - Depth system
  shadows: {
    // Subtle elevation
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },

    // Medium elevation
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
      elevation: 4,
    },

    // High elevation
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 24,
      elevation: 8,
    },

    // Dramatic elevation
    xl: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: 0.16,
      shadowRadius: 32,
      elevation: 12,
    },

    // Inner glow
    glow: {
      shadowColor: '#007AFF',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 0,
    },
  },

  // Typography - SF Pro inspired
  typography: {
    // Display
    displayLarge: {
      fontSize: 48,
      fontWeight: '700' as const,
      letterSpacing: -1.5,
      lineHeight: 56,
    },
    displayMedium: {
      fontSize: 36,
      fontWeight: '700' as const,
      letterSpacing: -1,
      lineHeight: 44,
    },
    displaySmall: {
      fontSize: 28,
      fontWeight: '600' as const,
      letterSpacing: -0.5,
      lineHeight: 36,
    },

    // Headings
    h1: {
      fontSize: 24,
      fontWeight: '700' as const,
      letterSpacing: -0.5,
      lineHeight: 32,
    },
    h2: {
      fontSize: 20,
      fontWeight: '600' as const,
      letterSpacing: -0.3,
      lineHeight: 28,
    },
    h3: {
      fontSize: 17,
      fontWeight: '600' as const,
      letterSpacing: -0.2,
      lineHeight: 24,
    },

    // Body
    bodyLarge: {
      fontSize: 17,
      fontWeight: '400' as const,
      letterSpacing: -0.4,
      lineHeight: 24,
    },
    body: {
      fontSize: 15,
      fontWeight: '400' as const,
      letterSpacing: -0.2,
      lineHeight: 22,
    },
    bodySmall: {
      fontSize: 13,
      fontWeight: '400' as const,
      letterSpacing: -0.1,
      lineHeight: 18,
    },

    // Captions
    caption: {
      fontSize: 12,
      fontWeight: '400' as const,
      letterSpacing: 0,
      lineHeight: 16,
    },
    captionBold: {
      fontSize: 12,
      fontWeight: '600' as const,
      letterSpacing: 0,
      lineHeight: 16,
    },

    // Labels
    label: {
      fontSize: 11,
      fontWeight: '500' as const,
      letterSpacing: 0.1,
      lineHeight: 14,
      textTransform: 'uppercase' as const,
    },
  },

  // Spacing - 8px grid
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
    xxxl: 64,
  },

  // Border radius - Fluid corners
  radius: {
    xs: 6,
    sm: 10,
    md: 14,
    lg: 20,
    xl: 28,
    xxl: 40,
    full: 9999,
  },

  // Animations - Fluid motion
  animation: {
    duration: {
      fast: 150,
      normal: 250,
      slow: 350,
      slower: 500,
    },

    easing: {
      // Apple's spring curve
      spring: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
      // Smooth deceleration
      decelerate: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
      // Quick acceleration
      accelerate: 'cubic-bezier(0.4, 0.0, 1, 1)',
      // Standard curve
      standard: 'cubic-bezier(0.4, 0.0, 0.6, 1)',
    },
  },

  // Blur levels
  blur: {
    sm: 10,
    md: 20,
    lg: 30,
    xl: 40,
    xxl: 50,
  },
};

// Helper functions
export const withGlass = (variant: keyof typeof glassTheme.glass = 'light') => ({
  ...glassTheme.glass[variant],
});

export const withShadow = (variant: keyof typeof glassTheme.shadows = 'md') => ({
  ...glassTheme.shadows[variant],
});

export const getSpacing = (...multipliers: number[]) => {
  return multipliers.map(m => m * glassTheme.spacing.sm);
};
