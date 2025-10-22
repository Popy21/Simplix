import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useAuth } from '../context/AuthContext';
import { ChartIcon, UsersIcon, PackageIcon, DollarIcon, FileTextIcon, CheckCircleIcon, TrendingUpIcon } from '../components/Icons';

type HomeScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert('Déconnexion', 'Êtes-vous sûr de vouloir vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Déconnexion',
        style: 'destructive',
        onPress: async () => {
          try {
            await logout();
          } catch (error) {
            Alert.alert('Erreur', 'Échec de la déconnexion');
          }
        },
      },
    ]);
  };

  const menuItems = [
    { title: 'Tableau de Bord', description: 'Vue d\'ensemble', icon: ChartIcon, color: '#007AFF', screen: 'Dashboard' as keyof RootStackParamList },
    { title: 'Pipeline', description: 'Opportunités de vente', icon: TrendingUpIcon, color: '#FF9500', screen: 'Pipeline' as keyof RootStackParamList },
    { title: 'Tâches', description: 'Planification et suivi', icon: CheckCircleIcon, color: '#FF9500', screen: 'Tasks' as keyof RootStackParamList },
    { title: 'Contacts', description: 'Relations et interactions', icon: UsersIcon, color: '#5856D6', screen: 'Contacts' as keyof RootStackParamList },
    { title: 'Analytics', description: 'Rapports et statistiques', icon: ChartIcon, color: '#AF52DE', screen: 'Analytics' as keyof RootStackParamList },
    { title: 'Facturation', description: 'Devis et factures', icon: FileTextIcon, color: '#34C759', screen: 'Invoices' as keyof RootStackParamList },
    { title: 'Clients', description: 'Base de données clients', icon: UsersIcon, color: '#34C759', screen: 'Customers' as keyof RootStackParamList },
    { title: 'Produits', description: 'Catalogue et inventaire', icon: PackageIcon, color: '#5856D6', screen: 'Products' as keyof RootStackParamList },
    { title: 'Ventes', description: 'Historique des ventes', icon: DollarIcon, color: '#34C759', screen: 'Sales' as keyof RootStackParamList },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.appTitle}>Simplix CRM</Text>
            <Text style={styles.appSubtitle}>Système de Gestion Commerciale</Text>
          </View>
        </View>
        {user && (
          <View style={styles.userCard}>
            <View style={styles.userAvatar}>
              <Text style={styles.userInitial}>{user.name ? user.name.charAt(0).toUpperCase() : 'U'}</Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user.name}</Text>
              <Text style={styles.userEmail}>{user.email}</Text>
              {user.role && <Text style={styles.userRole}>{user.role}</Text>}
            </View>
          </View>
        )}
      </View>
      <View style={styles.menuSection}>
        <Text style={styles.sectionLabel}>MENU PRINCIPAL</Text>
        <View style={styles.menuGrid}>
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <TouchableOpacity key={index} style={styles.menuCard} onPress={() => navigation.navigate(item.screen)} activeOpacity={0.7}>
                <View style={[styles.menuIconContainer, { backgroundColor: `${item.color}20` }]}>
                  <Icon size={28} color={item.color} />
                </View>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuDescription}>{item.description}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
      <View style={styles.settingsSection}>
        <Text style={styles.sectionLabel}>PARAMÈTRES</Text>
        <TouchableOpacity style={styles.settingsCard} onPress={() => navigation.navigate('ChangePassword')} activeOpacity={0.7}>
          <View style={styles.settingsIcon}><Text style={styles.lockEmoji}>🔒</Text></View>
          <View style={styles.settingsContent}>
            <Text style={styles.settingsTitle}>Changer le Mot de Passe</Text>
            <Text style={styles.settingsDescription}>Mettre à jour vos identifiants</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingsCard} onPress={() => navigation.navigate('TestAll')} activeOpacity={0.7}>
          <View style={styles.settingsIcon}><Text style={styles.lockEmoji}>🧪</Text></View>
          <View style={styles.settingsContent}>
            <Text style={styles.settingsTitle}>Tests API</Text>
            <Text style={styles.settingsDescription}>Tests complets des endpoints</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.settingsCard, styles.logoutCard]} onPress={handleLogout} activeOpacity={0.7}>
          <View style={styles.settingsIcon}><Text style={styles.lockEmoji}>🚪</Text></View>
          <View style={styles.settingsContent}>
            <Text style={[styles.settingsTitle, styles.logoutText]}>Déconnexion</Text>
            <Text style={styles.settingsDescription}>Se déconnecter du compte</Text>
          </View>
        </TouchableOpacity>
      </View>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  header: { backgroundColor: '#FFFFFF', paddingTop: Platform.OS === 'ios' ? 60 : 20, paddingHorizontal: 20, paddingBottom: 24 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  appTitle: { fontSize: 32, fontWeight: '700', color: '#000000', letterSpacing: -0.6, marginBottom: 4 },
  appSubtitle: { fontSize: 15, color: '#8E8E93', letterSpacing: -0.2 },
  userCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F2F2F7', borderRadius: 16, padding: 16 },
  userAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  userInitial: { fontSize: 24, fontWeight: '700', color: '#FFFFFF', letterSpacing: -0.5 },
  userInfo: { flex: 1 },
  userName: { fontSize: 17, fontWeight: '600', color: '#000000', marginBottom: 2, letterSpacing: -0.4 },
  userEmail: { fontSize: 14, color: '#8E8E93', marginBottom: 4, letterSpacing: -0.2 },
  userRole: { fontSize: 12, color: '#007AFF', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  menuSection: { paddingHorizontal: 20, paddingTop: 24 },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: '#8E8E93', letterSpacing: -0.1, marginBottom: 12 },
  menuGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  menuCard: { width: '48%', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 },
  menuIconContainer: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  menuTitle: { fontSize: 17, fontWeight: '600', color: '#000000', marginBottom: 4, letterSpacing: -0.4 },
  menuDescription: { fontSize: 13, color: '#8E8E93', lineHeight: 18, letterSpacing: -0.1 },
  settingsSection: { paddingHorizontal: 20, paddingTop: 32 },
  settingsCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  logoutCard: { borderWidth: 1.5, borderColor: '#FF3B30' },
  settingsIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F2F2F7', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  lockEmoji: { fontSize: 20 },
  settingsContent: { flex: 1 },
  settingsTitle: { fontSize: 16, fontWeight: '600', color: '#000000', marginBottom: 2, letterSpacing: -0.3 },
  settingsDescription: { fontSize: 13, color: '#8E8E93', letterSpacing: -0.1 },
  logoutText: { color: '#FF3B30' },
  chevron: { fontSize: 28, color: '#C7C7CC', fontWeight: '300' },
});
