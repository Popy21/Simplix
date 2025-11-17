import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { glassTheme } from '../theme/glassTheme';
import { layout } from '../theme/responsive';
import {
  GridIcon,
  ChartIcon,
  TrendingUpIcon,
  CheckCircleIcon,
  UserIcon,
} from './Icons';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface BottomNavItem {
  name: keyof RootStackParamList;
  label: string;
  icon: React.ComponentType<{ size: number; color: string }>;
}

const bottomNavItems: BottomNavItem[] = [
  { name: 'Home', label: 'Accueil', icon: GridIcon },
  { name: 'Dashboard', label: 'Stats', icon: ChartIcon },
  { name: 'Pipeline', label: 'Pipeline', icon: TrendingUpIcon },
  { name: 'Tasks', label: 'Tâches', icon: CheckCircleIcon },
  { name: 'Profile', label: 'Profil', icon: UserIcon },
];

export default function GlassBottomNav() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();

  const renderNavItem = (item: BottomNavItem) => {
    const isActive = route.name === item.name;
    const Icon = item.icon;

    return (
      <TouchableOpacity
        key={item.name}
        onPress={() => navigation.navigate(item.name)}
        style={styles.navItem}
        activeOpacity={0.7}
      >
        <View style={styles.navItemContent}>
          {isActive && (
            <View style={styles.activeIndicator}>
              <LinearGradient
                colors={['#007AFF', '#5AC8FA']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
            </View>
          )}

          <Icon
            size={24}
            color={isActive ? '#007AFF' : glassTheme.colors.text.tertiary}
          />

          <Text
            style={[
              styles.navLabel,
              isActive && styles.navLabelActive,
            ]}
          >
            {item.label}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {Platform.OS === 'ios' ? (
        <BlurView
          intensity={90}
          tint="light"
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: glassTheme.glass.frosted.backgroundColor },
          ]}
        />
      )}

      <View style={styles.content}>
        {bottomNavItems.map(renderNavItem)}
      </View>

      {/* iPhone X notch safe area */}
      <View style={styles.safeArea} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: layout.bottomNavHeight + (Platform.OS === 'ios' ? 20 : 0),
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.06)',
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    height: layout.bottomNavHeight,
    paddingHorizontal: glassTheme.spacing.xs,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  navItemContent: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  activeIndicator: {
    position: 'absolute',
    top: -8,
    width: 32,
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
  },
  navLabel: {
    ...glassTheme.typography.caption,
    fontSize: 11,
    color: glassTheme.colors.text.tertiary,
    marginTop: 4,
    fontWeight: '500',
  },
  navLabelActive: {
    color: glassTheme.colors.primary,
    fontWeight: '600',
  },
  safeArea: {
    height: Platform.OS === 'ios' ? 20 : 0,
    backgroundColor: 'transparent',
  },
});
