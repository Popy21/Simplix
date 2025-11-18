import { Animated, Easing } from 'react-native';

// Spring animation configurations
export const springConfig = {
  light: {
    tension: 300,
    friction: 20,
    useNativeDriver: true,
  },
  medium: {
    tension: 200,
    friction: 25,
    useNativeDriver: true,
  },
  heavy: {
    tension: 150,
    friction: 30,
    useNativeDriver: true,
  },
};

// Timing animation configurations
export const timingConfig = {
  fast: {
    duration: 200,
    easing: Easing.bezier(0.4, 0.0, 0.2, 1),
    useNativeDriver: true,
  },
  medium: {
    duration: 300,
    easing: Easing.bezier(0.4, 0.0, 0.2, 1),
    useNativeDriver: true,
  },
  slow: {
    duration: 500,
    easing: Easing.bezier(0.4, 0.0, 0.2, 1),
    useNativeDriver: true,
  },
};

// Entrance animations
export const fadeIn = (animatedValue: Animated.Value, delay: number = 0) => {
  animatedValue.setValue(0);
  return Animated.timing(animatedValue, {
    toValue: 1,
    delay,
    ...timingConfig.medium,
  });
};

export const slideUp = (animatedValue: Animated.Value, delay: number = 0) => {
  animatedValue.setValue(20);
  return Animated.spring(animatedValue, {
    toValue: 0,
    delay,
    ...springConfig.light,
  });
};

export const scaleIn = (animatedValue: Animated.Value, delay: number = 0) => {
  animatedValue.setValue(0.9);
  return Animated.spring(animatedValue, {
    toValue: 1,
    delay,
    ...springConfig.light,
  });
};

// Combined entrance animation
export const entranceAnimation = (
  opacity: Animated.Value,
  translateY: Animated.Value,
  scale: Animated.Value,
  delay: number = 0
) => {
  opacity.setValue(0);
  translateY.setValue(20);
  scale.setValue(0.95);

  return Animated.parallel([
    Animated.timing(opacity, {
      toValue: 1,
      delay,
      ...timingConfig.medium,
    }),
    Animated.spring(translateY, {
      toValue: 0,
      delay,
      ...springConfig.light,
    }),
    Animated.spring(scale, {
      toValue: 1,
      delay,
      ...springConfig.light,
    }),
  ]);
};

// Press animation
export const createPressAnimation = (animatedValue: Animated.Value) => {
  const pressIn = () => {
    Animated.spring(animatedValue, {
      toValue: 0.96,
      ...springConfig.light,
    }).start();
  };

  const pressOut = () => {
    Animated.spring(animatedValue, {
      toValue: 1,
      ...springConfig.light,
    }).start();
  };

  return { pressIn, pressOut };
};

// Shimmer animation for skeleton loading
export const createShimmerAnimation = (animatedValue: Animated.Value) => {
  animatedValue.setValue(0);

  const animate = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1200,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  return animate;
};

// Collapse/Expand animation
export const createCollapseAnimation = (
  height: Animated.Value,
  isExpanded: boolean,
  maxHeight: number
) => {
  return Animated.spring(height, {
    toValue: isExpanded ? maxHeight : 0,
    ...springConfig.medium,
  });
};

// Modal animations
export const modalAnimation = (
  opacity: Animated.Value,
  scale: Animated.Value,
  show: boolean
) => {
  if (show) {
    opacity.setValue(0);
    scale.setValue(0.9);

    return Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        ...timingConfig.fast,
      }),
      Animated.spring(scale, {
        toValue: 1,
        ...springConfig.light,
      }),
    ]);
  } else {
    return Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        ...timingConfig.fast,
      }),
      Animated.timing(scale, {
        toValue: 0.9,
        duration: 150,
        easing: Easing.bezier(0.4, 0.0, 1, 1),
        useNativeDriver: true,
      }),
    ]);
  }
};

// Stagger children animations
export const staggerAnimation = (
  animations: Animated.CompositeAnimation[],
  staggerDelay: number = 50
) => {
  return Animated.stagger(staggerDelay, animations);
};

// Chart reveal animation
export const chartRevealAnimation = (animatedValue: Animated.Value, delay: number = 0) => {
  animatedValue.setValue(0);

  return Animated.timing(animatedValue, {
    toValue: 1,
    delay,
    duration: 800,
    easing: Easing.bezier(0.4, 0.0, 0.2, 1),
    useNativeDriver: true,
  });
};

// Pulse animation for badges
export const pulseAnimation = (animatedValue: Animated.Value) => {
  return Animated.loop(
    Animated.sequence([
      Animated.timing(animatedValue, {
        toValue: 1.1,
        duration: 600,
        easing: Easing.ease,
        useNativeDriver: true,
      }),
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 600,
        easing: Easing.ease,
        useNativeDriver: true,
      }),
    ])
  );
};

// Rotate animation for loading indicators
export const rotateAnimation = (animatedValue: Animated.Value) => {
  return Animated.loop(
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: 1000,
      easing: Easing.linear,
      useNativeDriver: true,
    })
  );
};

// useNativeDriver: false for layout animations
export const layoutSpringConfig = {
  light: {
    tension: 300,
    friction: 20,
    useNativeDriver: false,
  },
  medium: {
    tension: 200,
    friction: 25,
    useNativeDriver: false,
  },
};
