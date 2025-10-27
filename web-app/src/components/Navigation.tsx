import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import {
  ChartIcon,
  TrendingUpIcon,
  CheckCircleIcon,
  UsersIcon,
  FileTextIcon,
  PackageIcon,
  DollarIcon,
} from './Icons';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const navigationItems = [
  { name: 'Dashboard', label: 'Dashboard', icon: ChartIcon },
  { name: 'Pipeline', label: 'Pipeline', icon: TrendingUpIcon },
  { name: 'Tasks', label: 'Tâches', icon: CheckCircleIcon },
  { name: 'Contacts', label: 'Contacts', icon: UsersIcon },
  { name: 'Invoices', label: 'Factures', icon: FileTextIcon },
  { name: 'Customers', label: 'Clients', icon: UsersIcon },
  { name: 'Products', label: 'Produits', icon: PackageIcon },
  { name: 'Sales', label: 'Ventes', icon: DollarIcon },
];

export default function Navigation() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();

  return (
    <View style={styles.container}>
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
              <Icon size={18} color={isActive ? '#007AFF' : '#6B6B6B'} />
              <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
  },
  nav: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    backgroundColor: 'transparent',
  },
  navItemActive: {
    backgroundColor: '#F0F5FF',
  },
  navLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B6B6B',
    letterSpacing: -0.1,
  },
  navLabelActive: {
    color: '#007AFF',
  },
});
