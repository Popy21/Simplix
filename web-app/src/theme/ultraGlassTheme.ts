// Ultra Glass Theme - Beyond Apple's Liquid Glass
// Premium glassmorphism with depth, refraction, and fluid animations

export const ultraGlassTheme = {
  // Gradient Backgrounds - Dynamic mesh gradients
  gradients: {
    // Aurora gradient - shifting colors like northern lights
    aurora: {
      colors: ['#667eea', '#764ba2', '#f093fb', '#f5576c'],
      start: { x: 0, y: 0 },
      end: { x: 1, y: 1 },
    },
    // Ocean depth - calm yet alive
    ocean: {
      colors: ['#0077B6', '#00B4D8', '#48CAE4', '#90E0EF'],
      start: { x: 0, y: 0 },
      end: { x: 1, y: 1 },
    },
    // Sunset glow - warm and inviting
    sunset: {
      colors: ['#f093fb', '#f5576c', '#FF6B6B', '#FFE66D'],
      start: { x: 0, y: 0 },
      end: { x: 1, y: 1 },
    },
    // Midnight - deep and luxurious
    midnight: {
      colors: ['#0f0c29', '#302b63', '#24243e'],
      start: { x: 0, y: 0 },
      end: { x: 0, y: 1 },
    },
    // Crystal - light refraction effect
    crystal: {
      colors: ['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.4)', 'rgba(200,220,255,0.3)'],
      start: { x: 0, y: 0 },
      end: { x: 1, y: 1 },
    },
    // Prism - rainbow light dispersion
    prism: {
      colors: ['#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#54a0ff'],
      start: { x: 0, y: 0 },
      end: { x: 1, y: 0 },
    },
  },

  // Glass Panels - Multi-layer glassmorphism
  glass: {
    // Ultra clear - like looking through water
    ultraClear: {
      backgroundColor: 'rgba(255, 255, 255, 0.15)',
      backdropFilter: 'blur(40px) saturate(200%) brightness(1.1)',
      WebkitBackdropFilter: 'blur(40px) saturate(200%) brightness(1.1)',
      borderRadius: 24,
      border: '1px solid rgba(255, 255, 255, 0.3)',
      boxShadow: `
        0 8px 32px rgba(0, 0, 0, 0.1),
        0 2px 8px rgba(0, 0, 0, 0.05),
        inset 0 1px 1px rgba(255, 255, 255, 0.4),
        inset 0 -1px 1px rgba(255, 255, 255, 0.2)
      `,
    },

    // Frosted - soft matte finish
    frosted: {
      backgroundColor: 'rgba(255, 255, 255, 0.25)',
      backdropFilter: 'blur(60px) saturate(180%)',
      WebkitBackdropFilter: 'blur(60px) saturate(180%)',
      borderRadius: 28,
      border: '1px solid rgba(255, 255, 255, 0.35)',
      boxShadow: `
        0 12px 40px rgba(0, 0, 0, 0.12),
        0 4px 12px rgba(0, 0, 0, 0.08),
        inset 0 2px 2px rgba(255, 255, 255, 0.5),
        inset 0 -1px 2px rgba(0, 0, 0, 0.05)
      `,
    },

    // Liquid - flowing like mercury
    liquid: {
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      backdropFilter: 'blur(50px) saturate(220%) contrast(1.1)',
      WebkitBackdropFilter: 'blur(50px) saturate(220%) contrast(1.1)',
      borderRadius: 32,
      border: '1.5px solid rgba(255, 255, 255, 0.4)',
      boxShadow: `
        0 20px 60px rgba(0, 0, 0, 0.15),
        0 8px 20px rgba(0, 0, 0, 0.1),
        inset 0 2px 4px rgba(255, 255, 255, 0.6),
        inset 0 -2px 4px rgba(0, 0, 0, 0.05)
      `,
    },

    // Holographic - rainbow refraction
    holographic: {
      backgroundColor: 'rgba(255, 255, 255, 0.18)',
      backdropFilter: 'blur(45px) saturate(250%) hue-rotate(10deg)',
      WebkitBackdropFilter: 'blur(45px) saturate(250%) hue-rotate(10deg)',
      borderRadius: 24,
      border: '1px solid rgba(255, 255, 255, 0.5)',
      boxShadow: `
        0 16px 48px rgba(120, 80, 200, 0.2),
        0 6px 16px rgba(100, 150, 255, 0.15),
        inset 0 1px 2px rgba(255, 255, 255, 0.7),
        inset 0 -1px 2px rgba(100, 50, 150, 0.1)
      `,
    },

    // Deep - creates depth illusion
    deep: {
      backgroundColor: 'rgba(10, 20, 40, 0.4)',
      backdropFilter: 'blur(30px) saturate(150%) brightness(0.9)',
      WebkitBackdropFilter: 'blur(30px) saturate(150%) brightness(0.9)',
      borderRadius: 20,
      border: '1px solid rgba(255, 255, 255, 0.1)',
      boxShadow: `
        0 24px 80px rgba(0, 0, 0, 0.4),
        0 10px 30px rgba(0, 0, 0, 0.3),
        inset 0 1px 1px rgba(255, 255, 255, 0.15),
        inset 0 -2px 4px rgba(0, 0, 0, 0.2)
      `,
    },

    // Neon glow
    neon: {
      backgroundColor: 'rgba(20, 10, 40, 0.6)',
      backdropFilter: 'blur(35px) saturate(200%)',
      WebkitBackdropFilter: 'blur(35px) saturate(200%)',
      borderRadius: 24,
      border: '2px solid rgba(138, 43, 226, 0.5)',
      boxShadow: `
        0 0 40px rgba(138, 43, 226, 0.4),
        0 0 80px rgba(138, 43, 226, 0.2),
        inset 0 0 20px rgba(138, 43, 226, 0.1)
      `,
    },
  },

  // Card Variants with hover states
  cards: {
    metric: {
      base: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        backdropFilter: 'blur(40px) saturate(180%)',
        WebkitBackdropFilter: 'blur(40px) saturate(180%)',
        borderRadius: 24,
        padding: 24,
        border: '1px solid rgba(255, 255, 255, 0.3)',
        boxShadow: `
          0 8px 32px rgba(0, 0, 0, 0.08),
          inset 0 1px 1px rgba(255, 255, 255, 0.4)
        `,
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      },
      hover: {
        transform: 'translateY(-4px) scale(1.02)',
        boxShadow: `
          0 16px 48px rgba(0, 0, 0, 0.15),
          0 8px 24px rgba(0, 0, 0, 0.1),
          inset 0 2px 2px rgba(255, 255, 255, 0.5)
        `,
        border: '1px solid rgba(255, 255, 255, 0.5)',
      },
    },

    activity: {
      base: {
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        backdropFilter: 'blur(30px)',
        WebkitBackdropFilter: 'blur(30px)',
        borderRadius: 20,
        padding: 20,
        border: '1px solid rgba(255, 255, 255, 0.2)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
        transition: 'all 0.3s ease',
      },
      hover: {
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        transform: 'translateX(8px)',
      },
    },
  },

  // Animated Backgrounds
  backgrounds: {
    meshGradient: `
      radial-gradient(at 40% 20%, rgba(120, 100, 255, 0.3) 0px, transparent 50%),
      radial-gradient(at 80% 0%, rgba(255, 100, 150, 0.25) 0px, transparent 50%),
      radial-gradient(at 0% 50%, rgba(100, 200, 255, 0.2) 0px, transparent 50%),
      radial-gradient(at 80% 50%, rgba(200, 100, 255, 0.2) 0px, transparent 50%),
      radial-gradient(at 0% 100%, rgba(255, 200, 100, 0.25) 0px, transparent 50%),
      radial-gradient(at 80% 100%, rgba(100, 255, 200, 0.2) 0px, transparent 50%),
      linear-gradient(135deg, #f5f7fa 0%, #e4e8f0 100%)
    `,

    auroraGradient: `
      radial-gradient(ellipse at 0% 0%, rgba(120, 100, 255, 0.4) 0%, transparent 50%),
      radial-gradient(ellipse at 100% 0%, rgba(255, 100, 200, 0.3) 0%, transparent 50%),
      radial-gradient(ellipse at 50% 100%, rgba(100, 200, 255, 0.3) 0%, transparent 50%),
      linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)
    `,

    cosmicGradient: `
      radial-gradient(circle at 20% 20%, rgba(79, 70, 229, 0.3) 0%, transparent 40%),
      radial-gradient(circle at 80% 30%, rgba(236, 72, 153, 0.25) 0%, transparent 40%),
      radial-gradient(circle at 40% 80%, rgba(6, 182, 212, 0.2) 0%, transparent 40%),
      linear-gradient(135deg, #fafbfc 0%, #e8ecf4 100%)
    `,

    crystalGradient: `
      linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(240,245,255,0.8) 50%, rgba(220,230,250,0.9) 100%),
      repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(255,255,255,0.2) 35px, rgba(255,255,255,0.2) 70px)
    `,
  },

  // Colors with semantic meaning
  colors: {
    // Primary accent
    primary: {
      light: '#818CF8',
      main: '#6366F1',
      dark: '#4F46E5',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    },

    // Success
    success: {
      light: '#34D399',
      main: '#10B981',
      dark: '#059669',
      gradient: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)',
      glow: '0 0 20px rgba(16, 185, 129, 0.4)',
    },

    // Warning
    warning: {
      light: '#FBBF24',
      main: '#F59E0B',
      dark: '#D97706',
      gradient: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)',
      glow: '0 0 20px rgba(245, 158, 11, 0.4)',
    },

    // Error
    error: {
      light: '#F87171',
      main: '#EF4444',
      dark: '#DC2626',
      gradient: 'linear-gradient(135deg, #EF4444 0%, #F87171 100%)',
      glow: '0 0 20px rgba(239, 68, 68, 0.4)',
    },

    // Info
    info: {
      light: '#60A5FA',
      main: '#3B82F6',
      dark: '#2563EB',
      gradient: 'linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)',
      glow: '0 0 20px rgba(59, 130, 246, 0.4)',
    },

    // Text
    text: {
      primary: 'rgba(15, 23, 42, 0.9)',
      secondary: 'rgba(51, 65, 85, 0.7)',
      tertiary: 'rgba(100, 116, 139, 0.6)',
      inverse: 'rgba(255, 255, 255, 0.95)',
      muted: 'rgba(148, 163, 184, 0.8)',
    },
  },

  // Typography
  typography: {
    display: {
      fontSize: 56,
      fontWeight: '800',
      letterSpacing: -2,
      lineHeight: 1.1,
    },
    h1: {
      fontSize: 36,
      fontWeight: '700',
      letterSpacing: -1.5,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: 28,
      fontWeight: '600',
      letterSpacing: -1,
      lineHeight: 1.3,
    },
    h3: {
      fontSize: 22,
      fontWeight: '600',
      letterSpacing: -0.5,
      lineHeight: 1.4,
    },
    body: {
      fontSize: 16,
      fontWeight: '400',
      letterSpacing: -0.2,
      lineHeight: 1.6,
    },
    caption: {
      fontSize: 13,
      fontWeight: '500',
      letterSpacing: 0,
      lineHeight: 1.5,
    },
    metric: {
      fontSize: 42,
      fontWeight: '700',
      letterSpacing: -2,
      lineHeight: 1,
    },
    metricSmall: {
      fontSize: 28,
      fontWeight: '600',
      letterSpacing: -1,
      lineHeight: 1.2,
    },
  },

  // Animations
  animations: {
    // Smooth spring
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    // Ease out expo
    easeOutExpo: 'cubic-bezier(0.16, 1, 0.3, 1)',
    // Smooth
    smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
    // Bounce
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',

    // Keyframes for CSS
    shimmer: `
      @keyframes shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
    `,
    float: `
      @keyframes float {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-10px); }
      }
    `,
    pulse: `
      @keyframes pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.8; transform: scale(0.98); }
      }
    `,
    glow: `
      @keyframes glow {
        0%, 100% { box-shadow: 0 0 20px rgba(99, 102, 241, 0.4); }
        50% { box-shadow: 0 0 40px rgba(99, 102, 241, 0.6); }
      }
    `,
    gradient: `
      @keyframes gradient {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
    `,
  },

  // Shadows with depth
  shadows: {
    xs: '0 1px 2px rgba(0, 0, 0, 0.05)',
    sm: '0 2px 8px rgba(0, 0, 0, 0.08)',
    md: '0 4px 16px rgba(0, 0, 0, 0.1)',
    lg: '0 8px 32px rgba(0, 0, 0, 0.12)',
    xl: '0 16px 48px rgba(0, 0, 0, 0.15)',
    '2xl': '0 24px 64px rgba(0, 0, 0, 0.18)',
    inner: 'inset 0 2px 4px rgba(0, 0, 0, 0.06)',
    glow: {
      primary: '0 0 30px rgba(99, 102, 241, 0.4)',
      success: '0 0 30px rgba(16, 185, 129, 0.4)',
      warning: '0 0 30px rgba(245, 158, 11, 0.4)',
      error: '0 0 30px rgba(239, 68, 68, 0.4)',
    },
  },

  // Border radius
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    '2xl': 32,
    '3xl': 40,
    full: 9999,
  },

  // Spacing
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    '2xl': 48,
    '3xl': 64,
  },
};

// Helper functions
export const createGlassStyle = (variant: keyof typeof ultraGlassTheme.glass) => {
  return ultraGlassTheme.glass[variant];
};

export const createGradient = (variant: keyof typeof ultraGlassTheme.gradients) => {
  return ultraGlassTheme.gradients[variant];
};

// Web-specific CSS for animated elements
export const webAnimatedStyles = `
  .glass-card {
    transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .glass-card:hover {
    transform: translateY(-8px) scale(1.02);
  }

  .glass-shimmer {
    background: linear-gradient(
      90deg,
      rgba(255, 255, 255, 0) 0%,
      rgba(255, 255, 255, 0.4) 50%,
      rgba(255, 255, 255, 0) 100%
    );
    background-size: 200% 100%;
    animation: shimmer 2s infinite;
  }

  .glass-float {
    animation: float 6s ease-in-out infinite;
  }

  .glass-pulse {
    animation: pulse 2s ease-in-out infinite;
  }

  .glass-glow {
    animation: glow 2s ease-in-out infinite;
  }

  .gradient-animate {
    background-size: 400% 400%;
    animation: gradient 15s ease infinite;
  }

  .glass-morphing {
    transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .glass-morphing:hover {
    backdrop-filter: blur(60px) saturate(250%);
    border-color: rgba(255, 255, 255, 0.5);
  }

  ${ultraGlassTheme.animations.shimmer}
  ${ultraGlassTheme.animations.float}
  ${ultraGlassTheme.animations.pulse}
  ${ultraGlassTheme.animations.glow}
  ${ultraGlassTheme.animations.gradient}
`;

export default ultraGlassTheme;
