import React, { ReactNode, useState } from 'react';
import { View, StyleSheet, Platform, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import LiquidGlassSidebar from './LiquidGlassSidebar';
import LiquidGlassBottomNav from './LiquidGlassBottomNav';
import { isMobile, isTablet, layout } from '../theme/responsive';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const SIDEBAR_EXPANDED = 280;
const SIDEBAR_COLLAPSED = 78;
const BOTTOM_NAV_HEIGHT = 72 + (Platform.OS === 'ios' ? 34 : 0);

// Inject premium global CSS
if (isWeb && typeof document !== 'undefined') {
  const styleId = 'liquid-glass-layout-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

      * {
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }

      body {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
        min-height: 100vh;
      }

      /* Custom scrollbar for the whole app */
      ::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }
      ::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.02);
      }
      ::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 4px;
      }
      ::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.2);
      }

      /* Smooth transitions for layout */
      .liquid-main-content {
        transition: margin-left 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      }

      /* Background animated gradient */
      @keyframes backgroundShift {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }

      .liquid-background-animated {
        background-size: 400% 400%;
        animation: backgroundShift 30s ease infinite;
      }

      /* Ambient glow effects */
      @keyframes ambientGlow1 {
        0%, 100% { opacity: 0.3; transform: translate(0, 0) scale(1); }
        50% { opacity: 0.5; transform: translate(30px, -20px) scale(1.2); }
      }

      @keyframes ambientGlow2 {
        0%, 100% { opacity: 0.2; transform: translate(0, 0) scale(1); }
        50% { opacity: 0.4; transform: translate(-40px, 30px) scale(1.1); }
      }

      .ambient-glow-1 {
        animation: ambientGlow1 15s ease-in-out infinite;
      }

      .ambient-glow-2 {
        animation: ambientGlow2 20s ease-in-out infinite;
      }
    `;
    document.head.appendChild(style);
  }
}

interface LiquidGlassLayoutProps {
  children: ReactNode;
  hideNavigation?: boolean;
}

export default function LiquidGlassLayout({ children, hideNavigation = false }: LiquidGlassLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const sidebarWidth = sidebarCollapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED;

  if (hideNavigation) {
    return (
      <View style={styles.fullScreen}>
        <BackgroundLayer />
        {children}
      </View>
    );
  }

  // Mobile: Bottom navigation
  if (isMobile) {
    return (
      <View style={styles.mobileContainer}>
        <BackgroundLayer />
        <View style={styles.mobileContent}>{children}</View>
        <LiquidGlassBottomNav />
      </View>
    );
  }

  // Tablet/Desktop: Sidebar navigation
  return (
    <View style={styles.container}>
      <BackgroundLayer />

      {/* Sidebar */}
      <View style={[styles.sidebar, { width: sidebarWidth }]}>
        <LiquidGlassSidebar onCollapse={setSidebarCollapsed} />
      </View>

      {/* Main content */}
      <View
        style={[styles.content, { marginLeft: sidebarWidth }]}
        // @ts-ignore
        {...(isWeb && { className: 'liquid-main-content' })}
      >
        {children}
      </View>
    </View>
  );
}

// Background layer with animated gradients
function BackgroundLayer() {
  return (
    <View style={styles.backgroundContainer}>
      {/* Base gradient */}
      <LinearGradient
        colors={['#0f172a', '#1e293b', '#0f172a']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Ambient glow orbs */}
      <View
        style={[styles.ambientOrb, styles.ambientOrb1]}
        // @ts-ignore
        {...(isWeb && { className: 'ambient-glow-1' })}
      />
      <View
        style={[styles.ambientOrb, styles.ambientOrb2]}
        // @ts-ignore
        {...(isWeb && { className: 'ambient-glow-2' })}
      />
      <View
        style={[styles.ambientOrb, styles.ambientOrb3]}
        // @ts-ignore
        {...(isWeb && { className: 'ambient-glow-1' })}
      />

      {/* Subtle noise texture overlay - web only */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#0f172a',
  },
  backgroundContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  ambientOrb: {
    position: 'absolute',
    borderRadius: 9999,
    ...(isWeb ? {
      filter: 'blur(100px)',
    } : {}),
  },
  ambientOrb1: {
    width: 400,
    height: 400,
    top: -100,
    left: '20%',
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
  },
  ambientOrb2: {
    width: 350,
    height: 350,
    bottom: '20%',
    right: -50,
    backgroundColor: 'rgba(168, 85, 247, 0.12)',
  },
  ambientOrb3: {
    width: 300,
    height: 300,
    bottom: -50,
    left: '30%',
    backgroundColor: 'rgba(236, 72, 153, 0.1)',
  },
  sidebar: {
    // @ts-ignore - web uses fixed positioning
    position: isWeb ? 'fixed' : 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 100,
  },
  content: {
    flex: 1,
    position: 'relative',
    zIndex: 1,
  },
  fullScreen: {
    flex: 1,
    position: 'relative',
  },
  // Mobile styles
  mobileContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#0f172a',
  },
  mobileContent: {
    flex: 1,
    paddingBottom: BOTTOM_NAV_HEIGHT,
    position: 'relative',
    zIndex: 1,
  },
});
