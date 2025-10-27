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
    { title: 'Pilotage', description: 'KPIs et projections', icon: TrendingUpIcon, color: '#FF2D55', screen: 'Pilotage' as keyof RootStackParamList },
    { title: 'Pipeline', description: 'Opportunités de vente', icon: TrendingUpIcon, color: '#FF9500', screen: 'Pipeline' as keyof RootStackParamList },
    { title: 'Tâches', description: 'Planification et suivi', icon: CheckCircleIcon, color: '#FF9500', screen: 'Tasks' as keyof RootStackParamList },
    { title: 'Contacts', description: 'Relations et interactions', icon: UsersIcon, color: '#5856D6', screen: 'Contacts' as keyof RootStackParamList },
    { title: 'Analytics', description: 'Rapports et statistiques', icon: ChartIcon, color: '#AF52DE', screen: 'Analytics' as keyof RootStackParamList },
    { title: 'Facturation', description: 'Devis et factures', icon: FileTextIcon, color: '#34C759', screen: 'Invoices' as keyof RootStackParamList },
    { title: 'Templates', description: 'Templates de factures', icon: FileTextIcon, color: '#5AC8FA', screen: 'Templates' as keyof RootStackParamList },
    { title: 'Clients', description: 'Base de données clients', icon: UsersIcon, color: '#34C759', screen: 'Customers' as keyof RootStackParamList },
    { title: 'Produits', description: 'Catalogue et inventaire', icon: PackageIcon, color: '#5856D6', screen: 'Products' as keyof RootStackParamList },
    { title: 'Ventes', description: 'Historique des ventes', icon: DollarIcon, color: '#34C759', screen: 'Sales' as keyof RootStackParamList },
    { title: 'Fournisseurs', description: 'Prestataires & achats', icon: UsersIcon, color: '#0A84FF', screen: 'Suppliers' as keyof RootStackParamList },
    { title: 'Dépenses', description: 'Notes de frais & achats', icon: DollarIcon, color: '#FF3B30', screen: 'Expenses' as keyof RootStackParamList },
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
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA'
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingHorizontal: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5'
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  appTitle: {
    fontSize: 28,
    fontWeight: '300',
    color: '#1A1A1A',
    letterSpacing: -0.5,
    marginBottom: 2
  },
  appSubtitle: {
    fontSize: 13,
    color: '#6B6B6B',
    fontWeight: '400',
    letterSpacing: 0
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E8E8E8'
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  userInitial: {
    fontSize: 18,
    fontWeight: '500',
    color: '#FFFFFF',
    letterSpacing: 0
  },
  userInfo: {
    flex: 1
  },
  userName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1A1A1A',
    marginBottom: 2,
    letterSpacing: -0.2
  },
  userEmail: {
    fontSize: 12,
    color: '#6B6B6B',
    marginBottom: 3,
    letterSpacing: 0
  },
  userRole: {
    fontSize: 11,
    color: '#007AFF',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.3
  },
  menuSection: {
    paddingHorizontal: 24,
    paddingTop: 20
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8E8E8E',
    letterSpacing: 1,
    marginBottom: 12,
    textTransform: 'uppercase'
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  menuCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1
  },
  menuIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1A1A1A',
    marginBottom: 3,
    letterSpacing: -0.2
  },
  menuDescription: {
    fontSize: 12,
    color: '#6B6B6B',
    lineHeight: 16,
    letterSpacing: 0,
    fontWeight: '400'
  },
  settingsSection: {
    paddingHorizontal: 24,
    paddingTop: 32
  },
  settingsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1
  },
  logoutCard: {
    borderWidth: 1,
    borderColor: '#FF3B30',
    backgroundColor: '#FFF5F5'
  },
  settingsIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8'
  },
  lockEmoji: {
    fontSize: 18
  },
  settingsContent: {
    flex: 1
  },
  settingsTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1A1A1A',
    marginBottom: 2,
    letterSpacing: -0.2
  },
  settingsDescription: {
    fontSize: 12,
    color: '#6B6B6B',
    letterSpacing: 0,
    fontWeight: '400'
  },
  logoutText: {
    color: '#FF3B30'
  },
  chevron: {
    fontSize: 24,
    color: '#D1D1D1',
    fontWeight: '300'
  },
});
