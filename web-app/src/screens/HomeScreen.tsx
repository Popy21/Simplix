import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useAuth } from '../context/AuthContext';

type HomeScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              Alert.alert('Error', 'Failed to logout');
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Simplix CRM</Text>
        <Text style={styles.subtitle}>Sales Management System</Text>
        {user && (
          <View style={styles.userInfo}>
            <Text style={styles.userName}>Welcome, {user.name}</Text>
            <Text style={styles.userEmail}>{user.email}</Text>
          </View>
        )}
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
          <Text style={styles.menuText}>Complete API Tests</Text>
          <Text style={styles.menuDescription}>Test all 80+ endpoints (Core + v4.0)</Text>
        </TouchableOpacity>

        {/* Account Settings Section */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Account Settings</Text>

          <TouchableOpacity
            style={styles.settingsItem}
            onPress={() => navigation.navigate('ChangePassword')}
          >
            <Text style={styles.settingsIcon}>🔒</Text>
            <View style={styles.settingsTextContainer}>
              <Text style={styles.settingsText}>Change Password</Text>
              <Text style={styles.settingsDescription}>Update your password</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.settingsItem, styles.logoutItem]}
            onPress={handleLogout}
          >
            <Text style={styles.settingsIcon}>🚪</Text>
            <View style={styles.settingsTextContainer}>
              <Text style={[styles.settingsText, styles.logoutText]}>Logout</Text>
              <Text style={styles.settingsDescription}>Sign out of your account</Text>
            </View>
          </TouchableOpacity>
        </View>
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
    backgroundColor: '#667eea',
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
    marginBottom: 16,
  },
  userInfo: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
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
    borderColor: '#667eea',
    backgroundColor: '#E3F2FD',
  },
  settingsSection: {
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    marginLeft: 4,
  },
  settingsItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  settingsIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  settingsTextContainer: {
    flex: 1,
  },
  settingsText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  settingsDescription: {
    fontSize: 13,
    color: '#666',
  },
  arrow: {
    fontSize: 24,
    color: '#999',
  },
  logoutItem: {
    borderWidth: 1,
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  logoutText: {
    color: '#ef4444',
  },
});
