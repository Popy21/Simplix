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

type BadgeVariant =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral';

type BadgeSize = 'xs' | 'sm' | 'md' | 'lg';

interface GlassBadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: React.ReactNode;
  dot?: boolean;
  outlined?: boolean;
  gradient?: boolean;
  style?: ViewStyle;
}

const VARIANT_STYLES: Record<BadgeVariant, { bg: string; text: string; gradient: [string, string] }> = {
  primary: {
    bg: 'rgba(0, 122, 255, 0.12)',
    text: '#007AFF',
    gradient: ['#007AFF', '#5AC8FA'],
  },
  secondary: {
    bg: 'rgba(142, 142, 147, 0.12)',
    text: '#8E8E93',
    gradient: ['#8E8E93', '#AEAEB2'],
  },
  success: {
    bg: 'rgba(52, 199, 89, 0.12)',
    text: '#34C759',
    gradient: ['#34C759', '#30D158'],
  },
  warning: {
    bg: 'rgba(255, 149, 0, 0.12)',
    text: '#FF9500',
    gradient: ['#FF9500', '#FFCC00'],
  },
  danger: {
    bg: 'rgba(255, 59, 48, 0.12)',
    text: '#FF3B30',
    gradient: ['#FF3B30', '#FF453A'],
  },
  info: {
    bg: 'rgba(88, 86, 214, 0.12)',
    text: '#5856D6',
    gradient: ['#5856D6', '#AF52DE'],
  },
  neutral: {
    bg: 'rgba(0, 0, 0, 0.06)',
    text: glassTheme.colors.text.secondary,
    gradient: ['#636366', '#8E8E93'],
  },
};

const SIZE_CONFIG: Record<BadgeSize, { paddingH: number; paddingV: number; fontSize: number; dotSize: number }> = {
  xs: { paddingH: 6, paddingV: 2, fontSize: 10, dotSize: 4 },
  sm: { paddingH: 8, paddingV: 3, fontSize: 11, dotSize: 5 },
  md: { paddingH: 10, paddingV: 4, fontSize: 12, dotSize: 6 },
  lg: { paddingH: 12, paddingV: 6, fontSize: 14, dotSize: 8 },
};

export default function GlassBadge({
  label,
  variant = 'neutral',
  size = 'sm',
  icon,
  dot = false,
  outlined = false,
  gradient = false,
  style,
}: GlassBadgeProps) {
  const variantStyle = VARIANT_STYLES[variant];
  const sizeConfig = SIZE_CONFIG[size];

  if (gradient) {
    return (
      <View
        style={[
          styles.container,
          {
            paddingHorizontal: sizeConfig.paddingH,
            paddingVertical: sizeConfig.paddingV,
          },
          styles.gradientContainer,
          style,
        ]}
      >
        <LinearGradient
          colors={variantStyle.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.content}>
          {dot && (
            <View
              style={[
                styles.dot,
                {
                  width: sizeConfig.dotSize,
                  height: sizeConfig.dotSize,
                  backgroundColor: '#FFFFFF',
                },
              ]}
            />
          )}
          {icon && <View style={styles.icon}>{icon}</View>}
          <Text
            style={[
              styles.label,
              { fontSize: sizeConfig.fontSize, color: '#FFFFFF' },
            ]}
            numberOfLines={1}
          >
            {label}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          paddingHorizontal: sizeConfig.paddingH,
          paddingVertical: sizeConfig.paddingV,
          backgroundColor: outlined ? 'transparent' : variantStyle.bg,
          borderWidth: outlined ? 1 : 0,
          borderColor: outlined ? variantStyle.text : 'transparent',
        },
        style,
      ]}
    >
      <View style={styles.content}>
        {dot && (
          <View
            style={[
              styles.dot,
              {
                width: sizeConfig.dotSize,
                height: sizeConfig.dotSize,
                backgroundColor: variantStyle.text,
              },
            ]}
          />
        )}
        {icon && <View style={styles.icon}>{icon}</View>}
        <Text
          style={[
            styles.label,
            { fontSize: sizeConfig.fontSize, color: variantStyle.text },
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: glassTheme.radius.full,
    alignSelf: 'flex-start',
    ...(Platform.OS === 'web' ? {
      // @ts-ignore
      backdropFilter: 'blur(8px)',
    } : {}),
  },
  gradientContainer: {
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    zIndex: 1,
  },
  dot: {
    borderRadius: 999,
  },
  icon: {
    marginRight: 2,
  },
  label: {
    fontWeight: '600',
    letterSpacing: -0.1,
  },
});
