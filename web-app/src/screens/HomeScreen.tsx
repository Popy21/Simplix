import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';

type HomeScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

export default function HomeScreen({ navigation }: HomeScreenProps) {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Simplix CRM</Text>
        <Text style={styles.subtitle}>Sales Management System</Text>
      </View>

      <View style={styles.menuContainer}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('Customers')}
        >
          <Text style={styles.menuIcon}>👥</Text>
          <Text style={styles.menuText}>Customers</Text>
          <Text style={styles.menuDescription}>Manage customer information</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('Products')}
        >
          <Text style={styles.menuIcon}>📦</Text>
          <Text style={styles.menuText}>Products</Text>
          <Text style={styles.menuDescription}>Manage product catalog</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('Sales')}
        >
          <Text style={styles.menuIcon}>💰</Text>
          <Text style={styles.menuText}>Sales</Text>
          <Text style={styles.menuDescription}>View and create sales</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, styles.testMenuItem]}
          onPress={() => navigation.navigate('TestAll')}
        >
          <Text style={styles.menuIcon}>🧪</Text>
          <Text style={styles.menuText}>Test All</Text>
          <Text style={styles.menuDescription}>Run automated API tests (Core)</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, styles.testV3MenuItem]}
          onPress={() => navigation.navigate('TestV3')}
        >
          <Text style={styles.menuIcon}>⚡</Text>
          <Text style={styles.menuText}>Test API v3.0</Text>
          <Text style={styles.menuDescription}>Test Analytics, Search, Bulk & Reports</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 30,
    backgroundColor: '#2196F3',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
  },
  menuContainer: {
    padding: 20,
  },
  menuItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  menuIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  menuText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  menuDescription: {
    fontSize: 14,
    color: '#666',
  },
  testMenuItem: {
    borderWidth: 2,
    borderColor: '#FF9800',
    backgroundColor: '#FFF3E0',
  },
  testV3MenuItem: {
    borderWidth: 2,
    borderColor: '#9C27B0',
    backgroundColor: '#F3E5F5',
  },
});
