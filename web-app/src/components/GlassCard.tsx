import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { glassTheme, withShadow } from '../theme/glassTheme';
import { entranceAnimation } from '../utils/animations';

// Web-specific style injection - MUST run immediately
if (Platform.OS === 'web') {
  setTimeout(() => {
    if (typeof document !== 'undefined') {
      const styleId = 'glass-morphism-styles';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
          /* Ultra transparent glassmorphism */
          [style*="rgba(255, 255, 255, 0.2)"],
          [style*="rgba(255, 255, 255, 0.18)"],
          [style*="rgba(255, 255, 255, 0.15)"] {
            backdrop-filter: blur(24px) saturate(180%) !important;
            -webkit-backdrop-filter: blur(24px) saturate(180%) !important;
          }

          /* Specific glass classes - Transparent */
          .glass-blur-bg {
            backdrop-filter: blur(24px) saturate(180%) !important;
            -webkit-backdrop-filter: blur(24px) saturate(180%) !important;
          }
          .glass-blur-medium {
            backdrop-filter: blur(20px) saturate(160%) !important;
            -webkit-backdrop-filter: blur(20px) saturate(160%) !important;
          }
          .glass-blur-light {
            backdrop-filter: blur(16px) saturate(140%) !important;
            -webkit-backdrop-filter: blur(16px) saturate(140%) !important;
          }
        `;
        document.head.appendChild(style);
        console.log('✨ Glassmorphism styles injected');
      }
    }
  }, 0);
}

interface GlassCardProps {
  children: ReactNode;
  variant?: 'light' | 'medium' | 'frosted';
  elevation?: 'sm' | 'md' | 'lg' | 'xl';
  style?: ViewStyle;
  padding?: number;
  borderRadius?: number;
  glow?: boolean;
  glowColor?: string;
  animated?: boolean;
  animationDelay?: number;
}

export default function GlassCard({
  children,
  variant = 'frosted',
  elevation = 'md',
  style,
  padding = glassTheme.spacing.md,
  borderRadius = glassTheme.radius.lg,
  glow = false,
  glowColor = glassTheme.colors.primary,
  animated = false, // Disabled by default to avoid hooks in loops
  animationDelay = 0,
}: GlassCardProps) {
  const glassStyle = glassTheme.glass[variant];
  const shadowStyle = withShadow(elevation);

  // Animation disabled to avoid React hooks violations when used in .map()
  // TODO: Implement animation with CSS or a different approach

  return (
    <View
      style={[
        styles.container,
        {
          padding,
          borderRadius,
          borderWidth: glassStyle.borderWidth,
          borderColor: glassStyle.borderColor,
        },
        shadowStyle,
        glow && {
          shadowColor: glowColor,
          shadowOpacity: 0.25,
          shadowRadius: 20,
        },
        style,
      ]}
    >
      {/* Glass blur background */}
      {Platform.OS === 'ios' ? (
        <BlurView
          intensity={variant === 'frosted' ? 90 : variant === 'medium' ? 70 : 60}
          tint="light"
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius,
              backgroundColor: glassStyle.backgroundColor,
            },
          ]}
        />
      ) : (
        <View
          // @ts-ignore - className and web styles
          {...(Platform.OS === 'web' && {
            className: variant === 'frosted'
              ? 'glass-blur-bg'
              : variant === 'medium'
              ? 'glass-blur-medium'
              : 'glass-blur-light',
            style: {
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              borderRadius,
              backdropFilter: 'blur(24px) saturate(180%)',
              WebkitBackdropFilter: 'blur(24px) saturate(180%)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.3)',
            },
          })}
          style={Platform.OS !== 'web' ? [
            StyleSheet.absoluteFill,
            {
              backgroundColor: glassStyle.backgroundColor,
              borderRadius,
            },
          ] : undefined}
        />
      )}

      {/* Content */}
      <View style={styles.content}>{children}</View>

      {/* Subtle inner border highlight */}
      <View
        style={[
          styles.innerBorder,
          {
            borderRadius,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  content: {
    position: 'relative',
    zIndex: 1,
  },
  innerBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    pointerEvents: 'none',
  },
});
