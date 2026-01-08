import React, { useState, useRef } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ViewStyle,
  Platform,
} from 'react-native';
import { glassTheme } from '../../theme/glassTheme';
import { SearchIcon, XIcon } from '../Icons';

interface GlassSearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  onSubmit?: () => void;
  style?: ViewStyle;
  showClearButton?: boolean;
  leftIcon?: React.ReactNode;
  rightContent?: React.ReactNode;
}

export default function GlassSearchBar({
  value,
  onChangeText,
  placeholder = 'Rechercher...',
  autoFocus = false,
  onFocus,
  onBlur,
  onSubmit,
  style,
  showClearButton = true,
  leftIcon,
  rightContent,
}: GlassSearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);
  const focusAnim = useRef(new Animated.Value(0)).current;

  const handleFocus = () => {
    setIsFocused(true);
    Animated.spring(focusAnim, {
      toValue: 1,
      tension: 60,
      friction: 10,
      useNativeDriver: false,
    }).start();
    onFocus?.();
  };

  const handleBlur = () => {
    setIsFocused(false);
    Animated.spring(focusAnim, {
      toValue: 0,
      tension: 60,
      friction: 10,
      useNativeDriver: false,
    }).start();
    onBlur?.();
  };

  const handleClear = () => {
    onChangeText('');
  };

  const borderColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(0, 0, 0, 0.06)', glassTheme.colors.primary],
  });

  const backgroundColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255, 255, 255, 0.7)', 'rgba(255, 255, 255, 0.9)'],
  });

  const scale = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.01],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          borderColor,
          backgroundColor,
          transform: [{ scale }],
        },
        style,
      ]}
    >
      {/* Glass effect background */}
      <View style={styles.glassBackground} />

      {/* Left icon */}
      <View style={styles.leftIcon}>
        {leftIcon || (
          <SearchIcon
            size={20}
            color={isFocused ? glassTheme.colors.primary : glassTheme.colors.text.tertiary}
          />
        )}
      </View>

      {/* Input */}
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={glassTheme.colors.text.quaternary}
        autoFocus={autoFocus}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onSubmitEditing={onSubmit}
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
      />

      {/* Clear button */}
      {showClearButton && value.length > 0 && (
        <TouchableOpacity
          onPress={handleClear}
          style={styles.clearButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <View style={styles.clearButtonInner}>
            <XIcon size={12} color="#FFFFFF" />
          </View>
        </TouchableOpacity>
      )}

      {/* Right content */}
      {rightContent && <View style={styles.rightContent}>{rightContent}</View>}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: glassTheme.radius.md,
    borderWidth: 1.5,
    minHeight: 48,
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? {
      // @ts-ignore
      transition: 'all 0.2s ease',
    } : {}),
  },
  glassBackground: {
    ...StyleSheet.absoluteFillObject,
    ...(Platform.OS === 'web' ? {
      // @ts-ignore
      backdropFilter: 'blur(10px)',
    } : {}),
  },
  leftIcon: {
    paddingLeft: glassTheme.spacing.md,
    paddingRight: glassTheme.spacing.xs,
    zIndex: 1,
  },
  input: {
    flex: 1,
    paddingVertical: glassTheme.spacing.sm,
    paddingHorizontal: glassTheme.spacing.xs,
    ...glassTheme.typography.body,
    color: glassTheme.colors.text.primary,
    zIndex: 1,
    ...(Platform.OS === 'web' ? {
      // @ts-ignore
      outlineStyle: 'none',
    } : {}),
  },
  clearButton: {
    padding: glassTheme.spacing.sm,
    zIndex: 1,
  },
  clearButtonInner: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: glassTheme.colors.text.quaternary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightContent: {
    paddingRight: glassTheme.spacing.md,
    zIndex: 1,
  },
});
