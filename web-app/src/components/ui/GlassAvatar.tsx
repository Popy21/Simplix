import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ViewStyle,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { glassTheme } from '../../theme/glassTheme';

interface GlassAvatarProps {
  source?: string | null;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  status?: 'online' | 'offline' | 'busy' | 'away';
  badge?: string | number;
  style?: ViewStyle;
  gradient?: [string, string];
}

const SIZE_CONFIG = {
  xs: { container: 24, fontSize: 10, status: 6, badge: 14 },
  sm: { container: 32, fontSize: 12, status: 8, badge: 16 },
  md: { container: 40, fontSize: 14, status: 10, badge: 18 },
  lg: { container: 56, fontSize: 18, status: 12, badge: 20 },
  xl: { container: 80, fontSize: 24, status: 16, badge: 24 },
};

const STATUS_COLORS = {
  online: '#34C759',
  offline: '#8E8E93',
  busy: '#FF3B30',
  away: '#FF9500',
};

const GRADIENTS: [string, string][] = [
  ['#007AFF', '#5AC8FA'],
  ['#5856D6', '#AF52DE'],
  ['#34C759', '#30D158'],
  ['#FF9500', '#FFCC00'],
  ['#FF2D55', '#FF375F'],
  ['#AF52DE', '#BF5AF2'],
];

const getInitials = (name?: string): string => {
  if (!name) return '?';
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

const getGradientFromName = (name?: string): [string, string] => {
  if (!name) return GRADIENTS[0];
  const charSum = name.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return GRADIENTS[charSum % GRADIENTS.length];
};

export default function GlassAvatar({
  source,
  name,
  size = 'md',
  status,
  badge,
  style,
  gradient,
}: GlassAvatarProps) {
  const config = SIZE_CONFIG[size];
  const initials = getInitials(name);
  const avatarGradient = gradient || getGradientFromName(name);

  return (
    <View
      style={[
        styles.container,
        {
          width: config.container,
          height: config.container,
          borderRadius: config.container / 2,
        },
        style,
      ]}
    >
      {source ? (
        <Image
          source={{ uri: source }}
          style={[
            styles.image,
            {
              width: config.container,
              height: config.container,
              borderRadius: config.container / 2,
            },
          ]}
        />
      ) : (
        <LinearGradient
          colors={avatarGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.placeholder,
            {
              width: config.container,
              height: config.container,
              borderRadius: config.container / 2,
            },
          ]}
        >
          <Text style={[styles.initials, { fontSize: config.fontSize }]}>
            {initials}
          </Text>
        </LinearGradient>
      )}

      {/* Glass overlay */}
      <View
        style={[
          styles.glassOverlay,
          {
            width: config.container,
            height: config.container,
            borderRadius: config.container / 2,
          },
        ]}
      />

      {/* Status indicator */}
      {status && (
        <View
          style={[
            styles.statusIndicator,
            {
              width: config.status,
              height: config.status,
              borderRadius: config.status / 2,
              backgroundColor: STATUS_COLORS[status],
              borderWidth: config.status > 8 ? 2 : 1.5,
            },
          ]}
        />
      )}

      {/* Badge */}
      {badge !== undefined && (
        <View
          style={[
            styles.badge,
            {
              minWidth: config.badge,
              height: config.badge,
              borderRadius: config.badge / 2,
            },
          ]}
        >
          <Text
            style={[
              styles.badgeText,
              { fontSize: config.badge * 0.6 },
            ]}
            numberOfLines={1}
          >
            {typeof badge === 'number' && badge > 99 ? '99+' : badge}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  image: {
    resizeMode: 'cover',
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    color: '#FFFFFF',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderColor: '#FFFFFF',
    ...(Platform.OS === 'web' ? {
      // @ts-ignore
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.15)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 2,
    }),
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: glassTheme.colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    ...(Platform.OS === 'web' ? {
      // @ts-ignore
      boxShadow: '0 2px 4px rgba(255, 59, 48, 0.3)',
    } : {
      shadowColor: glassTheme.colors.error,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 2,
    }),
  },
  badgeText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
