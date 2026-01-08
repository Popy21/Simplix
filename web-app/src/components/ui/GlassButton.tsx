import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  View,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { glassTheme, withShadow } from '../../theme/glassTheme';

type ButtonVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'ghost' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

interface GlassButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  gradient?: [string, string];
}

const GRADIENTS: Record<ButtonVariant, [string, string]> = {
  primary: ['#007AFF', '#5856D6'],
  secondary: ['#8E8E93', '#636366'],
  success: ['#34C759', '#30D158'],
  danger: ['#FF3B30', '#FF453A'],
  ghost: ['transparent', 'transparent'],
  outline: ['transparent', 'transparent'],
};

const SIZE_CONFIG: Record<ButtonSize, { paddingVertical: number; paddingHorizontal: number; fontSize: number; iconSize: number }> = {
  sm: { paddingVertical: 8, paddingHorizontal: 16, fontSize: 13, iconSize: 16 },
  md: { paddingVertical: 12, paddingHorizontal: 24, fontSize: 15, iconSize: 18 },
  lg: { paddingVertical: 16, paddingHorizontal: 32, fontSize: 17, iconSize: 22 },
};

export default function GlassButton({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  textStyle,
  gradient,
}: GlassButtonProps) {
  const sizeConfig = SIZE_CONFIG[size];
  const buttonGradient = gradient || GRADIENTS[variant];
  const isGhost = variant === 'ghost' || variant === 'outline';
  const isOutline = variant === 'outline';

  const getTextColor = () => {
    if (disabled) return glassTheme.colors.text.quaternary;
    if (isGhost) return glassTheme.colors.primary;
    if (isOutline) return glassTheme.colors.primary;
    return '#FFFFFF';
  };

  const content = (
    <View style={styles.contentContainer}>
      {loading ? (
        <ActivityIndicator
          size="small"
          color={isGhost || isOutline ? glassTheme.colors.primary : '#FFFFFF'}
        />
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <View style={styles.iconLeft}>{icon}</View>
          )}
          <Text
            style={[
              styles.text,
              {
                fontSize: sizeConfig.fontSize,
                color: getTextColor(),
              },
              textStyle,
            ]}
          >
            {title}
          </Text>
          {icon && iconPosition === 'right' && (
            <View style={styles.iconRight}>{icon}</View>
          )}
        </>
      )}
    </View>
  );

  const buttonStyles: ViewStyle[] = [
    styles.button,
    {
      paddingVertical: sizeConfig.paddingVertical,
      paddingHorizontal: sizeConfig.paddingHorizontal,
    },
    fullWidth && styles.fullWidth,
    disabled && styles.disabled,
    isOutline && styles.outline,
    !isGhost && !isOutline && withShadow('sm'),
    style,
  ];

  if (isGhost || isOutline) {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={0.7}
        style={buttonStyles}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[fullWidth && styles.fullWidth, style]}
    >
      <LinearGradient
        colors={disabled ? ['#C7C7CC', '#AEAEB2'] : buttonGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[
          styles.gradient,
          {
            paddingVertical: sizeConfig.paddingVertical,
            paddingHorizontal: sizeConfig.paddingHorizontal,
          },
          fullWidth && styles.fullWidth,
          !isGhost && !isOutline && withShadow('sm'),
        ]}
      >
        {content}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: glassTheme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  gradient: {
    borderRadius: glassTheme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    ...(Platform.OS === 'web' ? {
      // @ts-ignore
      transition: 'all 0.2s ease',
      cursor: 'pointer',
    } : {}),
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  iconLeft: {
    marginRight: glassTheme.spacing.sm,
  },
  iconRight: {
    marginLeft: glassTheme.spacing.sm,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  outline: {
    borderWidth: 1.5,
    borderColor: glassTheme.colors.primary,
    borderRadius: glassTheme.radius.md,
    backgroundColor: 'transparent',
  },
});
