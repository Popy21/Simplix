import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  ViewStyle,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { glassTheme } from '../../theme/glassTheme';

interface GlassLoadingStateProps {
  message?: string;
  type?: 'spinner' | 'skeleton' | 'dots' | 'pulse';
  fullScreen?: boolean;
  style?: ViewStyle;
  skeletonRows?: number;
}

// Skeleton component for loading placeholders
const SkeletonBlock = ({
  width = '100%',
  height = 20,
  borderRadius = 8,
  style,
}: {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: 'rgba(0, 0, 0, 0.08)',
          opacity,
        },
        style,
      ]}
    />
  );
};

// Card skeleton for list items
const CardSkeleton = () => (
  <View style={styles.cardSkeleton}>
    <View style={styles.cardSkeletonHeader}>
      <SkeletonBlock width={48} height={48} borderRadius={24} />
      <View style={styles.cardSkeletonContent}>
        <SkeletonBlock width="60%" height={16} />
        <SkeletonBlock width="40%" height={12} style={{ marginTop: 8 }} />
      </View>
    </View>
    <View style={styles.cardSkeletonBody}>
      <SkeletonBlock width="100%" height={12} />
      <SkeletonBlock width="80%" height={12} style={{ marginTop: 8 }} />
    </View>
  </View>
);

// Animated dots loader
const DotsLoader = () => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createAnimation = (animValue: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(animValue, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(animValue, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      );

    const anim1 = createAnimation(dot1, 0);
    const anim2 = createAnimation(dot2, 150);
    const anim3 = createAnimation(dot3, 300);

    anim1.start();
    anim2.start();
    anim3.start();

    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
    };
  }, []);

  const renderDot = (anim: Animated.Value) => {
    const scale = anim.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 1.3],
    });
    const opacity = anim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.4, 1],
    });

    return (
      <Animated.View
        style={[
          styles.dot,
          {
            transform: [{ scale }],
            opacity,
          },
        ]}
      />
    );
  };

  return (
    <View style={styles.dotsContainer}>
      {renderDot(dot1)}
      {renderDot(dot2)}
      {renderDot(dot3)}
    </View>
  );
};

// Pulse loader
const PulseLoader = () => {
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const scale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.9, 1.1],
  });

  const opacity = pulseAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.6, 1, 0.6],
  });

  return (
    <Animated.View
      style={[
        styles.pulseContainer,
        {
          transform: [{ scale }],
          opacity,
        },
      ]}
    >
      <LinearGradient
        colors={['#007AFF', '#5AC8FA']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.pulseGradient}
      />
    </Animated.View>
  );
};

// Spinner loader
const SpinnerLoader = () => {
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      })
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={[
        styles.spinnerContainer,
        {
          transform: [{ rotate: spin }],
        },
      ]}
    >
      <LinearGradient
        colors={['#007AFF', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.spinnerGradient}
      />
    </Animated.View>
  );
};

export default function GlassLoadingState({
  message = 'Chargement...',
  type = 'spinner',
  fullScreen = false,
  style,
  skeletonRows = 3,
}: GlassLoadingStateProps) {
  const renderLoader = () => {
    switch (type) {
      case 'dots':
        return <DotsLoader />;
      case 'pulse':
        return <PulseLoader />;
      case 'skeleton':
        return (
          <View style={styles.skeletonContainer}>
            {Array.from({ length: skeletonRows }).map((_, index) => (
              <CardSkeleton key={index} />
            ))}
          </View>
        );
      case 'spinner':
      default:
        return <SpinnerLoader />;
    }
  };

  if (type === 'skeleton') {
    return <View style={[styles.container, style]}>{renderLoader()}</View>;
  }

  return (
    <View
      style={[
        styles.container,
        fullScreen && styles.fullScreen,
        style,
      ]}
    >
      <View style={styles.loaderCard}>
        {/* Glass effect */}
        <View style={styles.glassBackground} />

        {renderLoader()}

        {message && <Text style={styles.message}>{message}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: glassTheme.spacing.lg,
  },
  fullScreen: {
    flex: 1,
    backgroundColor: 'rgba(242, 242, 247, 0.9)',
    ...(Platform.OS === 'web' ? {
      // @ts-ignore
      backdropFilter: 'blur(10px)',
    } : {}),
  },
  loaderCard: {
    padding: glassTheme.spacing.xl,
    borderRadius: glassTheme.radius.xl,
    alignItems: 'center',
    overflow: 'hidden',
    minWidth: 160,
  },
  glassBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    ...(Platform.OS === 'web' ? {
      // @ts-ignore
      backdropFilter: 'blur(20px)',
    } : {}),
  },
  message: {
    ...glassTheme.typography.body,
    color: glassTheme.colors.text.secondary,
    marginTop: glassTheme.spacing.md,
    textAlign: 'center',
  },

  // Dots styles
  dotsContainer: {
    flexDirection: 'row',
    gap: glassTheme.spacing.sm,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: glassTheme.colors.primary,
  },

  // Pulse styles
  pulseContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
  },
  pulseGradient: {
    flex: 1,
  },

  // Spinner styles
  spinnerContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 4,
    borderColor: 'rgba(0, 122, 255, 0.2)',
    borderTopColor: glassTheme.colors.primary,
  },
  spinnerGradient: {
    flex: 1,
    borderRadius: 25,
  },

  // Skeleton styles
  skeletonContainer: {
    width: '100%',
    gap: glassTheme.spacing.md,
  },
  cardSkeleton: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: glassTheme.radius.lg,
    padding: glassTheme.spacing.md,
    ...(Platform.OS === 'web' ? {
      // @ts-ignore
      backdropFilter: 'blur(10px)',
    } : {}),
  },
  cardSkeletonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: glassTheme.spacing.md,
  },
  cardSkeletonContent: {
    flex: 1,
    marginLeft: glassTheme.spacing.md,
  },
  cardSkeletonBody: {
    gap: glassTheme.spacing.xs,
  },
});

export { SkeletonBlock, CardSkeleton };
