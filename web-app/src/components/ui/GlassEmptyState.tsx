import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { glassTheme } from '../../theme/glassTheme';
import GlassButton from './GlassButton';

interface GlassEmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  style?: ViewStyle;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_CONFIG = {
  sm: { iconSize: 48, padding: 20, titleSize: 16, gap: 8 },
  md: { iconSize: 80, padding: 32, titleSize: 20, gap: 12 },
  lg: { iconSize: 120, padding: 48, titleSize: 24, gap: 16 },
};

export default function GlassEmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  style,
  size = 'md',
}: GlassEmptyStateProps) {
  const config = SIZE_CONFIG[size];

  return (
    <View style={[styles.container, { padding: config.padding }, style]}>
      {/* Glass card background */}
      <View style={styles.glassCard}>
        <View style={styles.glassBackground} />

        {/* Decorative gradient orbs */}
        <View style={styles.orbContainer}>
          <LinearGradient
            colors={['rgba(0, 122, 255, 0.15)', 'rgba(88, 86, 214, 0.1)']}
            style={[styles.orb, styles.orb1]}
          />
          <LinearGradient
            colors={['rgba(52, 199, 89, 0.12)', 'rgba(48, 209, 88, 0.08)']}
            style={[styles.orb, styles.orb2]}
          />
        </View>

        <View style={styles.content}>
          {/* Icon */}
          {icon && (
            <View
              style={[
                styles.iconContainer,
                {
                  width: config.iconSize,
                  height: config.iconSize,
                  borderRadius: config.iconSize / 2,
                },
              ]}
            >
              <LinearGradient
                colors={['rgba(0, 122, 255, 0.1)', 'rgba(88, 86, 214, 0.1)']}
                style={StyleSheet.absoluteFill}
              />
              {icon}
            </View>
          )}

          {/* Title */}
          <Text
            style={[
              styles.title,
              { fontSize: config.titleSize, marginTop: config.gap },
            ]}
          >
            {title}
          </Text>

          {/* Description */}
          {description && (
            <Text style={[styles.description, { marginTop: config.gap / 2 }]}>
              {description}
            </Text>
          )}

          {/* Actions */}
          {(actionLabel || secondaryActionLabel) && (
            <View style={[styles.actions, { marginTop: config.gap * 2 }]}>
              {actionLabel && onAction && (
                <GlassButton
                  title={actionLabel}
                  onPress={onAction}
                  variant="primary"
                  size={size === 'lg' ? 'lg' : 'md'}
                />
              )}
              {secondaryActionLabel && onSecondaryAction && (
                <GlassButton
                  title={secondaryActionLabel}
                  onPress={onSecondaryAction}
                  variant="ghost"
                  size={size === 'lg' ? 'md' : 'sm'}
                  style={{ marginTop: glassTheme.spacing.sm }}
                />
              )}
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  glassCard: {
    position: 'relative',
    borderRadius: glassTheme.radius.xl,
    overflow: 'hidden',
    maxWidth: 400,
    width: '100%',
  },
  glassBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    ...(Platform.OS === 'web' ? {
      // @ts-ignore
      backdropFilter: 'blur(20px)',
    } : {}),
  },
  orbContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
  },
  orb1: {
    width: 200,
    height: 200,
    top: -50,
    right: -50,
  },
  orb2: {
    width: 150,
    height: 150,
    bottom: -40,
    left: -40,
  },
  content: {
    padding: glassTheme.spacing.xl,
    alignItems: 'center',
    zIndex: 1,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? {
      // @ts-ignore
      backdropFilter: 'blur(10px)',
    } : {}),
  },
  title: {
    fontWeight: '700',
    color: glassTheme.colors.text.primary,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  description: {
    ...glassTheme.typography.body,
    color: glassTheme.colors.text.tertiary,
    textAlign: 'center',
    maxWidth: 300,
    lineHeight: 22,
  },
  actions: {
    alignItems: 'center',
    width: '100%',
  },
});
