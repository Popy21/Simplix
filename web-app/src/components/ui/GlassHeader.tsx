import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { glassTheme, withShadow } from '../../theme/glassTheme';
import { isMobile, responsiveFontSizes, responsiveSpacing } from '../../theme/responsive';

interface GlassHeaderProps {
  title: string;
  subtitle?: string;
  backButton?: boolean;
  onBackPress?: () => void;
  rightContent?: React.ReactNode;
  gradient?: [string, string];
  transparent?: boolean;
  style?: ViewStyle;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_CONFIG = {
  sm: { paddingVertical: 12, titleSize: 20 },
  md: { paddingVertical: 16, titleSize: 28 },
  lg: { paddingVertical: 24, titleSize: 36 },
};

export default function GlassHeader({
  title,
  subtitle,
  backButton = false,
  onBackPress,
  rightContent,
  gradient,
  transparent = false,
  style,
  size = 'md',
}: GlassHeaderProps) {
  const config = SIZE_CONFIG[size];

  return (
    <View
      style={[
        styles.container,
        { paddingVertical: config.paddingVertical },
        !transparent && styles.glassContainer,
        !transparent && withShadow('sm'),
        style,
      ]}
    >
      {/* Glass background */}
      {!transparent && <View style={styles.glassBackground} />}

      {/* Gradient accent */}
      {gradient && (
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradientAccent}
        />
      )}

      <View style={styles.content}>
        {/* Left side */}
        <View style={styles.left}>
          {backButton && (
            <TouchableOpacity
              onPress={onBackPress}
              style={styles.backButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.backIcon}>{'<'}</Text>
            </TouchableOpacity>
          )}

          <View style={styles.titleContainer}>
            <Text
              style={[
                styles.title,
                { fontSize: isMobile ? config.titleSize - 4 : config.titleSize },
              ]}
              numberOfLines={1}
            >
              {title}
            </Text>
            {subtitle && (
              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            )}
          </View>
        </View>

        {/* Right side */}
        {rightContent && <View style={styles.right}>{rightContent}</View>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: responsiveSpacing.lg,
    paddingTop: isMobile ? responsiveSpacing.md : responsiveSpacing.lg,
    position: 'relative',
    overflow: 'hidden',
    zIndex: 10,
  },
  glassContainer: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.04)',
  },
  glassBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    ...(Platform.OS === 'web' ? {
      // @ts-ignore
      backdropFilter: 'blur(20px) saturate(180%)',
    } : {}),
  },
  gradientAccent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 1,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: glassTheme.spacing.md,
    ...(Platform.OS === 'web' ? {
      // @ts-ignore
      cursor: 'pointer',
      transition: 'background-color 0.2s ease',
    } : {}),
  },
  backIcon: {
    fontSize: 24,
    color: glassTheme.colors.text.secondary,
    fontWeight: '300',
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontWeight: '700',
    color: glassTheme.colors.text.primary,
    letterSpacing: -0.5,
  },
  subtitle: {
    ...glassTheme.typography.bodySmall,
    color: glassTheme.colors.text.tertiary,
    marginTop: 4,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: glassTheme.spacing.sm,
  },
});
