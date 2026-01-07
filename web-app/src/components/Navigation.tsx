import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ChartIcon,
  TrendingUpIcon,
  CheckCircleIcon,
  UsersIcon,
  FileTextIcon,
  PackageIcon,
  DollarIcon,
  UserIcon,
} from './Icons';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const isWeb = Platform.OS === 'web';

const navigationItems = [
  { name: 'Dashboard', label: 'Dashboard', icon: ChartIcon, color: '#6366f1' },
  { name: 'Pipeline', label: 'Pipeline', icon: TrendingUpIcon, color: '#8b5cf6' },
  { name: 'Tasks', label: 'Tâches', icon: CheckCircleIcon, color: '#f59e0b' },
  { name: 'Contacts', label: 'Contacts', icon: UsersIcon, color: '#10b981' },
  { name: 'Products', label: 'Produits', icon: PackageIcon, color: '#ec4899' },
  { name: 'Sales', label: 'Ventes', icon: DollarIcon, color: '#14b8a6' },
  { name: 'Profile', label: 'Mon Profil', icon: UserIcon, color: '#64748b' },
];

export default function Navigation() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();

  const handleLogout = async () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'Déconnexion',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('token');
              await AsyncStorage.removeItem('userId');
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            } catch (error) {
              console.error('Error logging out:', error);
              Alert.alert('Erreur', 'Impossible de se déconnecter');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Glass background layer */}
      <View style={styles.glassBackground} />

      <View style={styles.nav}>
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = route.name === item.name;

          return (
            <TouchableOpacity
              key={item.name}
              style={[styles.navItem, isActive && styles.navItemActive]}
              onPress={() => navigation.navigate(item.name as keyof RootStackParamList)}
              activeOpacity={0.7}
            >
              {/* Active indicator glow */}
              {isActive && <View style={[styles.activeGlow, { backgroundColor: item.color + '30' }]} />}

              <View style={[
                styles.iconWrapper,
                isActive && { backgroundColor: item.color + '20' }
              ]}>
                <Icon size={18} color={isActive ? item.color : '#64748b'} />
              </View>
              <Text style={[
                styles.navLabel,
                isActive && { color: item.color, fontWeight: '700' }
              ]}>
                {item.label}
              </Text>

              {/* Active dot indicator */}
              {isActive && (
                <View style={[styles.activeDot, { backgroundColor: item.color }]} />
              )}
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Text style={styles.logoutText}>Déconnexion</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    position: 'relative',
    overflow: 'hidden',
    // Ultra transparent glass effect
    ...(isWeb ? {
      backgroundColor: 'rgba(255, 255, 255, 0.25)',
      backdropFilter: 'blur(24px) saturate(180%)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
      boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
    } : {
      backgroundColor: 'rgba(255, 255, 255, 0.85)',
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(0, 0, 0, 0.05)',
    }),
  },
  glassBackground: {
    ...StyleSheet.absoluteFillObject,
    ...(isWeb ? {
      background: `
        linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 100%)
      `,
    } : {}),
  },
  nav: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 6,
    alignItems: 'center',
    position: 'relative',
    zIndex: 1,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    gap: 8,
    position: 'relative',
    overflow: 'hidden',
    // Glass item effect
    ...(isWeb ? {
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    } : {}),
  },
  navItemActive: {
    // Active glass effect - more transparent
    ...(isWeb ? {
      backgroundColor: 'rgba(255, 255, 255, 0.35)',
      boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1), inset 0 1px 1px rgba(255, 255, 255, 0.4)',
      transform: [{ scale: 1.02 }],
    } : {
      backgroundColor: 'rgba(255, 255, 255, 0.7)',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 15,
      elevation: 4,
    }),
  },
  activeGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 14,
    opacity: 0.5,
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    letterSpacing: -0.2,
  },
  activeDot: {
    position: 'absolute',
    bottom: 4,
    left: '50%',
    marginLeft: -3,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  logoutButton: {
    marginLeft: 'auto',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 14,
    // Gradient logout button
    ...(isWeb ? {
      background: 'linear-gradient(135deg, #ef4444 0%, #f87171 100%)',
      boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.2)',
    } : {
      backgroundColor: '#ef4444',
    }),
  },
  logoutText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
});
