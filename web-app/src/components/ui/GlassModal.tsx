import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  Dimensions,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { glassTheme, withShadow } from '../../theme/glassTheme';
import { isMobile } from '../../theme/responsive';

interface GlassModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'fullscreen';
  position?: 'center' | 'bottom';
  showCloseButton?: boolean;
  closeOnBackdrop?: boolean;
  gradient?: [string, string];
}

const SIZE_CONFIG = {
  sm: { maxWidth: 360, maxHeight: '50%' },
  md: { maxWidth: 500, maxHeight: '70%' },
  lg: { maxWidth: 700, maxHeight: '85%' },
  xl: { maxWidth: 900, maxHeight: '90%' },
  fullscreen: { maxWidth: '100%', maxHeight: '100%' },
};

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function GlassModal({
  visible,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = 'md',
  position = isMobile ? 'bottom' : 'center',
  showCloseButton = true,
  closeOnBackdrop = true,
  gradient,
}: GlassModalProps) {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 1,
          tension: 65,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 65,
          friction: 10,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      slideAnim.setValue(0);
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.95);
    }
  }, [visible]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => onClose());
  };

  const translateY = position === 'bottom'
    ? slideAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [300, 0],
      })
    : slideAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [50, 0],
      });

  const sizeConfig = SIZE_CONFIG[size];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        {/* Backdrop */}
        <TouchableWithoutFeedback
          onPress={closeOnBackdrop ? handleClose : undefined}
        >
          <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
            {Platform.OS === 'ios' ? (
              <BlurView
                intensity={30}
                tint="dark"
                style={StyleSheet.absoluteFill}
              />
            ) : (
              <View style={styles.backdropFallback} />
            )}
          </Animated.View>
        </TouchableWithoutFeedback>

        {/* Modal Container */}
        <View
          style={[
            styles.container,
            position === 'center' && styles.centerContainer,
            position === 'bottom' && styles.bottomContainer,
          ]}
          pointerEvents="box-none"
        >
          <Animated.View
            style={[
              styles.modal,
              position === 'center' && {
                transform: [{ translateY }, { scale: scaleAnim }],
                maxWidth: sizeConfig.maxWidth,
                maxHeight: sizeConfig.maxHeight,
              },
              position === 'bottom' && {
                transform: [{ translateY }],
                maxHeight: '90%',
              },
              size === 'fullscreen' && styles.fullscreenModal,
              withShadow('xl'),
            ]}
          >
            {/* Glass background */}
            <View style={styles.glassBackground} />

            {/* Header gradient */}
            {gradient && (
              <LinearGradient
                colors={gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.headerGradient}
              />
            )}

            {/* Header */}
            {(title || showCloseButton) && (
              <View style={[styles.header, gradient && styles.headerWithGradient]}>
                <View style={styles.headerContent}>
                  {title && (
                    <View style={styles.titleContainer}>
                      <Text
                        style={[
                          styles.title,
                          gradient && styles.titleWithGradient,
                        ]}
                        numberOfLines={1}
                      >
                        {title}
                      </Text>
                      {subtitle && (
                        <Text
                          style={[
                            styles.subtitle,
                            gradient && styles.subtitleWithGradient,
                          ]}
                          numberOfLines={1}
                        >
                          {subtitle}
                        </Text>
                      )}
                    </View>
                  )}
                </View>

                {showCloseButton && (
                  <TouchableOpacity
                    onPress={handleClose}
                    style={[
                      styles.closeButton,
                      gradient && styles.closeButtonWithGradient,
                    ]}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text style={styles.closeButtonText}>x</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Drag indicator for bottom sheets */}
            {position === 'bottom' && (
              <View style={styles.dragIndicator}>
                <View style={styles.dragHandle} />
              </View>
            )}

            {/* Body */}
            <ScrollView
              style={styles.body}
              contentContainerStyle={styles.bodyContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {children}
            </ScrollView>

            {/* Footer */}
            {footer && (
              <View style={styles.footer}>
                {footer}
              </View>
            )}
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  backdropFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    ...(Platform.OS === 'web' ? {
      // @ts-ignore
      backdropFilter: 'blur(10px)',
    } : {}),
  },
  container: {
    flex: 1,
    zIndex: 1,
  },
  centerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: glassTheme.spacing.lg,
  },
  bottomContainer: {
    justifyContent: 'flex-end',
  },
  modal: {
    width: '100%',
    borderRadius: glassTheme.radius.xl,
    overflow: 'hidden',
    position: 'relative',
  },
  fullscreenModal: {
    borderRadius: 0,
    flex: 1,
  },
  glassBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    ...(Platform.OS === 'web' ? {
      // @ts-ignore
      backdropFilter: 'blur(40px) saturate(180%)',
    } : {}),
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    opacity: 0.15,
  },
  dragIndicator: {
    alignItems: 'center',
    paddingTop: glassTheme.spacing.sm,
    paddingBottom: glassTheme.spacing.xs,
  },
  dragHandle: {
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: glassTheme.spacing.lg,
    paddingTop: glassTheme.spacing.lg,
    paddingBottom: glassTheme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.06)',
  },
  headerWithGradient: {
    borderBottomColor: 'rgba(0, 0, 0, 0.04)',
  },
  headerContent: {
    flex: 1,
    marginRight: glassTheme.spacing.md,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    ...glassTheme.typography.h1,
    color: glassTheme.colors.text.primary,
  },
  titleWithGradient: {
    color: glassTheme.colors.text.primary,
  },
  subtitle: {
    ...glassTheme.typography.bodySmall,
    color: glassTheme.colors.text.tertiary,
    marginTop: 4,
  },
  subtitleWithGradient: {
    color: glassTheme.colors.text.secondary,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? {
      // @ts-ignore
      cursor: 'pointer',
      transition: 'background-color 0.2s ease',
    } : {}),
  },
  closeButtonWithGradient: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  closeButtonText: {
    fontSize: 20,
    color: glassTheme.colors.text.secondary,
    fontWeight: '400',
    lineHeight: 22,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: glassTheme.spacing.lg,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: glassTheme.spacing.lg,
    paddingVertical: glassTheme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.06)',
    gap: glassTheme.spacing.sm,
  },
});
