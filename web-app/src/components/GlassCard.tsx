import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { glassTheme, withShadow } from '../theme/glassTheme';

interface GlassCardProps {
  children: ReactNode;
  variant?: 'light' | 'medium' | 'frosted';
  elevation?: 'sm' | 'md' | 'lg' | 'xl';
  style?: ViewStyle;
  padding?: number;
  borderRadius?: number;
  glow?: boolean;
  glowColor?: string;
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
}: GlassCardProps) {
  const glassStyle = glassTheme.glass[variant];
  const shadowStyle = withShadow(elevation);

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
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: glassStyle.backgroundColor,
              borderRadius,
            },
          ]}
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
    borderColor: 'rgba(255, 255, 255, 0.4)',
    pointerEvents: 'none',
  },
});
