import React, { useState, useRef } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  ViewStyle,
  TextInputProps,
  Animated,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { glassTheme } from '../../theme/glassTheme';

interface GlassInputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
  inputStyle?: ViewStyle;
  required?: boolean;
  disabled?: boolean;
}

export default function GlassInput({
  label,
  error,
  hint,
  icon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  inputStyle,
  required = false,
  disabled = false,
  onFocus,
  onBlur,
  value,
  ...props
}: GlassInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const focusAnim = useRef(new Animated.Value(0)).current;

  const handleFocus = (e: any) => {
    setIsFocused(true);
    Animated.spring(focusAnim, {
      toValue: 1,
      useNativeDriver: false,
      tension: 40,
      friction: 8,
    }).start();
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    Animated.spring(focusAnim, {
      toValue: 0,
      useNativeDriver: false,
      tension: 40,
      friction: 8,
    }).start();
    onBlur?.(e);
  };

  const borderColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [
      error ? glassTheme.colors.error : 'rgba(0, 0, 0, 0.08)',
      error ? glassTheme.colors.error : glassTheme.colors.primary,
    ],
  });

  const glowOpacity = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.15],
  });

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <View style={styles.labelContainer}>
          <Text style={[styles.label, error && styles.labelError]}>
            {label}
            {required && <Text style={styles.required}> *</Text>}
          </Text>
        </View>
      )}

      <Animated.View
        style={[
          styles.inputWrapper,
          {
            borderColor,
          },
          disabled && styles.disabled,
        ]}
      >
        {/* Focus glow effect */}
        <Animated.View
          style={[
            styles.glowEffect,
            {
              opacity: glowOpacity,
              backgroundColor: error ? glassTheme.colors.error : glassTheme.colors.primary,
            },
          ]}
        />

        {/* Glass background */}
        <View style={styles.glassBackground} />

        {icon && <View style={styles.iconLeft}>{icon}</View>}

        <TextInput
          {...props}
          value={value}
          style={[
            styles.input,
            icon && styles.inputWithLeftIcon,
            rightIcon && styles.inputWithRightIcon,
            inputStyle,
          ]}
          placeholderTextColor={glassTheme.colors.text.quaternary}
          onFocus={handleFocus}
          onBlur={handleBlur}
          editable={!disabled}
        />

        {rightIcon && (
          <TouchableOpacity
            onPress={onRightIconPress}
            disabled={!onRightIconPress}
            style={styles.iconRight}
          >
            {rightIcon}
          </TouchableOpacity>
        )}
      </Animated.View>

      {(error || hint) && (
        <Text style={[styles.helperText, error && styles.errorText]}>
          {error || hint}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: glassTheme.spacing.md,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: glassTheme.spacing.xs,
  },
  label: {
    ...glassTheme.typography.bodySmall,
    color: glassTheme.colors.text.secondary,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  labelError: {
    color: glassTheme.colors.error,
  },
  required: {
    color: glassTheme.colors.error,
    fontWeight: '500',
  },
  inputWrapper: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: glassTheme.radius.md,
    borderWidth: 1.5,
    overflow: 'hidden',
    minHeight: 48,
    ...(Platform.OS === 'web' ? {
      // @ts-ignore
      transition: 'all 0.2s ease',
    } : {}),
  },
  glassBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    ...(Platform.OS === 'web' ? {
      // @ts-ignore
      backdropFilter: 'blur(10px)',
    } : {}),
  },
  glowEffect: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: glassTheme.radius.md,
  },
  input: {
    flex: 1,
    paddingHorizontal: glassTheme.spacing.md,
    paddingVertical: glassTheme.spacing.sm,
    ...glassTheme.typography.body,
    color: glassTheme.colors.text.primary,
    backgroundColor: 'transparent',
    zIndex: 1,
    ...(Platform.OS === 'web' ? {
      // @ts-ignore
      outlineStyle: 'none',
    } : {}),
  },
  inputWithLeftIcon: {
    paddingLeft: glassTheme.spacing.xs,
  },
  inputWithRightIcon: {
    paddingRight: glassTheme.spacing.xs,
  },
  iconLeft: {
    paddingLeft: glassTheme.spacing.md,
    zIndex: 1,
  },
  iconRight: {
    paddingRight: glassTheme.spacing.md,
    zIndex: 1,
  },
  disabled: {
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
    opacity: 0.6,
  },
  helperText: {
    ...glassTheme.typography.caption,
    color: glassTheme.colors.text.tertiary,
    marginTop: glassTheme.spacing.xs,
    marginLeft: glassTheme.spacing.xs,
  },
  errorText: {
    color: glassTheme.colors.error,
  },
});
