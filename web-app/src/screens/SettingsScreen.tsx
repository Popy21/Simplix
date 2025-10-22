import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Modal,
  FlatList,
  TextInput,
  Platform,
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { UsersIcon, TrendingUpIcon } from '../components/Icons';

type SettingsScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Dashboard'>;
};

interface Role {
  id: string;
  name: string;
  description: string;
  userCount: number;
  permissions: string[];
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  lastActive: string;
  status: 'active' | 'inactive';
}

interface Permission {
  id: string;
  module: string;
  name: string;
  description: string;
}

export default function SettingsScreen({ navigation }: SettingsScreenProps) {
  const [activeTab, setActiveTab] = useState<'account' | 'users' | 'roles' | 'permissions'>('account');
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [userModalVisible, setUserModalVisible] = useState(false);
  const [roleModalVisible, setRoleModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = () => {
    // Roles
    const mockRoles: Role[] = [
      {
        id: 'admin',
        name: 'Administrateur',
        description: 'Accès complet à tous les modules',
        userCount: 2,
        permissions: ['users_manage', 'roles_manage', 'settings_manage', 'reports_view', 'analytics_view', 'export_data'],
      },
      {
        id: 'sales_manager',
        name: 'Manager Commercial',
        description: 'Gestion des ventes et des commerciaux',
        userCount: 3,
        permissions: ['deals_manage', 'contacts_manage', 'pipeline_view', 'analytics_view', 'reports_view'],
      },
      {
        id: 'sales_rep',
        name: 'Représentant Commercial',
        description: 'Gestion des deals et clients assignés',
        userCount: 8,
        permissions: ['deals_own', 'contacts_own', 'tasks_manage', 'activities_log'],
      },
      {
        id: 'support',
        name: 'Support Client',
        description: 'Support et suivi clients',
        userCount: 4,
        permissions: ['contacts_view', 'tickets_manage', 'emails_send'],
      },
    ];

    // Users
    const mockUsers: User[] = [
      {
        id: 'u1',
        name: 'Sophie Durand',
        email: 'sophie.durand@company.fr',
        role: 'admin',
        department: 'Direction',
        lastActive: '2025-11-19 14:23',
        status: 'active',
      },
      {
        id: 'u2',
        name: 'Laurent Michel',
        email: 'laurent.michel@company.fr',
        role: 'sales_manager',
        department: 'Ventes',
        lastActive: '2025-11-19 12:15',
        status: 'active',
      },
      {
        id: 'u3',
        name: 'Marie Martin',
        email: 'marie.martin@company.fr',
        role: 'sales_rep',
        department: 'Ventes',
        lastActive: '2025-11-18 16:45',
        status: 'active',
      },
      {
        id: 'u4',
        name: 'Jean Dupont',
        email: 'jean.dupont@company.fr',
        role: 'sales_rep',
        department: 'Ventes',
        lastActive: '2025-11-18 09:30',
        status: 'active',
      },
      {
        id: 'u5',
        name: 'Pierre Leroy',
        email: 'pierre.leroy@company.fr',
        role: 'support',
        department: 'Support',
        lastActive: '2025-11-17 18:00',
        status: 'inactive',
      },
    ];

    // Permissions
    const mockPermissions: Permission[] = [
      {
        id: 'contacts_manage',
        module: 'Contacts',
        name: 'Gérer tous les contacts',
        description: 'Créer, modifier, supprimer tous les contacts',
      },
      {
        id: 'contacts_own',
        module: 'Contacts',
        name: 'Gérer ses propres contacts',
        description: 'Gérer uniquement les contacts assignés',
      },
      {
        id: 'deals_manage',
        module: 'Deals',
        name: 'Gérer tous les deals',
        description: 'Créer, modifier, supprimer tous les deals',
      },
      {
        id: 'deals_own',
        module: 'Deals',
        name: 'Gérer ses propres deals',
        description: 'Gérer uniquement les deals assignés',
      },
      {
        id: 'users_manage',
        module: 'Administration',
        name: 'Gérer les utilisateurs',
        description: 'Créer, modifier, supprimer des utilisateurs',
      },
      {
        id: 'roles_manage',
        module: 'Administration',
        name: 'Gérer les rôles',
        description: 'Créer et modifier les rôles et permissions',
      },
      {
        id: 'settings_manage',
        module: 'Administration',
        name: 'Gérer les paramètres',
        description: 'Modifier les paramètres de l\'organisation',
      },
      {
        id: 'analytics_view',
        module: 'Analytics',
        name: 'Voir analytics',
        description: 'Accéder au tableau de bord analytics',
      },
      {
        id: 'reports_view',
        module: 'Analytics',
        name: 'Voir rapports',
        description: 'Générer et consulter les rapports',
      },
      {
        id: 'export_data',
        module: 'Données',
        name: 'Exporter les données',
        description: 'Exporter les données en CSV/Excel',
      },
    ];

    setRoles(mockRoles);
    setUsers(mockUsers);
    setPermissions(mockPermissions);
  };

  const getRoleLabel = (roleId: string) => {
    return roles.find(r => r.id === roleId)?.name || roleId;
  };

  const renderAccountSettings = () => (
    <View style={styles.content}>
      {/* Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.profileAvatar}>
          <Text style={styles.profileAvatarText}>SD</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>Sophie Durand</Text>
          <Text style={styles.profileEmail}>sophie.durand@company.fr</Text>
          <Text style={styles.profileRole}>Administrateur</Text>
        </View>
      </View>

      {/* Account Settings */}
      <View style={styles.settingsGroup}>
        <Text style={styles.settingsGroupTitle}>Paramètres Compte</Text>

        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingItemContent}>
            <Text style={styles.settingLabel}>Email</Text>
            <Text style={styles.settingValue}>sophie.durand@company.fr</Text>
          </View>
          <Text style={styles.settingArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingItemContent}>
            <Text style={styles.settingLabel}>Téléphone</Text>
            <Text style={styles.settingValue}>+33 6 12 34 56 78</Text>
          </View>
          <Text style={styles.settingArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingItemContent}>
            <Text style={styles.settingLabel}>Entreprise</Text>
            <Text style={styles.settingValue}>Simplix CRM</Text>
          </View>
          <Text style={styles.settingArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingItemContent}>
            <Text style={styles.settingLabel}>Langue</Text>
            <Text style={styles.settingValue}>Français</Text>
          </View>
          <Text style={styles.settingArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Security */}
      <View style={styles.settingsGroup}>
        <Text style={styles.settingsGroupTitle}>Sécurité</Text>

        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingItemContent}>
            <Text style={styles.settingLabel}>Changer le mot de passe</Text>
            <Text style={styles.settingValue}>Dernière modif: il y a 45 jours</Text>
          </View>
          <Text style={styles.settingArrow}>›</Text>
        </TouchableOpacity>

        <View style={styles.settingItem}>
          <View style={styles.settingItemContent}>
            <Text style={styles.settingLabel}>Authentification 2FA</Text>
            <Text style={styles.settingValue}>Activée</Text>
          </View>
          <Switch value={true} />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingItemContent}>
            <Text style={styles.settingLabel}>Notifications d'alerte</Text>
            <Text style={styles.settingValue}>Connexions suspectes</Text>
          </View>
          <Switch value={true} />
        </View>
      </View>

      {/* Logout */}
      <TouchableOpacity
        style={styles.logoutButton}
        onPress={() => Alert.alert('Se déconnecter?', 'Êtes-vous sûr?')}
      >
        <Text style={styles.logoutButtonText}>Se déconnecter</Text>
      </TouchableOpacity>
    </View>
  );

  const renderUsersTab = () => (
    <View style={styles.content}>
      <View style={styles.tabHeader}>
        <Text style={styles.tabTitle}>{users.length} Utilisateurs</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            setSelectedUser(null);
            setUserModalVisible(true);
          }}
        >
          <Text style={styles.addButtonText}>+ Ajouter</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={users}
        renderItem={({ item: user }) => (
          <TouchableOpacity
            style={styles.userCard}
            onPress={() => {
              setSelectedUser(user);
              setUserModalVisible(true);
            }}
          >
            <View style={styles.userAvatar}>
              <Text style={styles.userAvatarText}>
                {user.name
                  .split(' ')
                  .map(n => n[0])
                  .join('')}
              </Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user.name}</Text>
              <Text style={styles.userEmail}>{user.email}</Text>
              <Text style={styles.userDept}>{user.department}</Text>
            </View>
            <View style={styles.userBadge}>
              <Text style={[styles.roleLabel, { color: user.status === 'active' ? '#34C759' : '#FF3B30' }]}>
                {getRoleLabel(user.role)}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        keyExtractor={item => item.id}
        scrollEnabled={false}
      />
    </View>
  );

  const renderRolesTab = () => (
    <View style={styles.content}>
      <View style={styles.tabHeader}>
        <Text style={styles.tabTitle}>{roles.length} Rôles</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            setSelectedRole(null);
            setRoleModalVisible(true);
          }}
        >
          <Text style={styles.addButtonText}>+ Créer</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={roles}
        renderItem={({ item: role }) => (
          <TouchableOpacity
            style={styles.roleCard}
            onPress={() => {
              setSelectedRole(role);
              setRoleModalVisible(true);
            }}
          >
            <View style={styles.roleHeader}>
              <View>
                <Text style={styles.roleName}>{role.name}</Text>
                <Text style={styles.roleDescription}>{role.description}</Text>
              </View>
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>{role.userCount} utilisateurs</Text>
              </View>
            </View>
            <View style={styles.rolePermissions}>
              {role.permissions.slice(0, 3).map(perm => (
                <View key={perm} style={styles.permissionTag}>
                  <Text style={styles.permissionTagText}>{perm}</Text>
                </View>
              ))}
              {role.permissions.length > 3 && (
                <View style={styles.permissionTag}>
                  <Text style={styles.permissionTagText}>+{role.permissions.length - 3}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        )}
        keyExtractor={item => item.id}
        scrollEnabled={false}
      />
    </View>
  );

  const renderPermissionsTab = () => (
    <View style={styles.content}>
      <Text style={styles.tabTitle}>Matrice des Permissions</Text>

      {Array.from(new Set(permissions.map(p => p.module))).map(module => (
        <View key={module} style={styles.permissionSection}>
          <Text style={styles.moduleName}>{module}</Text>
          {permissions
            .filter(p => p.module === module)
            .map(perm => (
              <View key={perm.id} style={styles.permissionRow}>
                <View style={styles.permissionInfo}>
                  <Text style={styles.permissionName}>{perm.name}</Text>
                  <Text style={styles.permissionDesc}>{perm.description}</Text>
                </View>
                <View style={styles.roleCheckboxes}>
                  {roles.map(role => (
                    <TouchableOpacity
                      key={`${perm.id}-${role.id}`}
                      style={[
                        styles.checkbox,
                        role.permissions.includes(perm.id) && styles.checkboxChecked,
                      ]}
                    >
                      {role.permissions.includes(perm.id) && (
                        <Text style={styles.checkmark}>✓</Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}
        </View>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>⚙️ Paramètres</Text>
        <Text style={styles.headerSubtitle}>Gestion des utilisateurs et permissions</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {[
          { id: 'account', label: 'Compte' },
          { id: 'users', label: 'Utilisateurs' },
          { id: 'roles', label: 'Rôles' },
          { id: 'permissions', label: 'Permissions' },
        ].map(tab => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.tabActive]}
            onPress={() => setActiveTab(tab.id as typeof activeTab)}
          >
            <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {activeTab === 'account' && renderAccountSettings()}
        {activeTab === 'users' && renderUsersTab()}
        {activeTab === 'roles' && renderRolesTab()}
        {activeTab === 'permissions' && renderPermissionsTab()}
      </ScrollView>

      {/* User Modal */}
      <Modal
        visible={userModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setUserModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedUser ? 'Éditer Utilisateur' : 'Nouvel Utilisateur'}
              </Text>
              <TouchableOpacity onPress={() => setUserModalVisible(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {selectedUser && (
                <>
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Nom</Text>
                    <TextInput
                      style={styles.input}
                      defaultValue={selectedUser.name}
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Email</Text>
                    <TextInput
                      style={styles.input}
                      defaultValue={selectedUser.email}
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Rôle</Text>
                    <View style={styles.roleSelect}>
                      {roles.map(role => (
                        <TouchableOpacity
                          key={role.id}
                          style={[
                            styles.roleOption,
                            selectedUser.role === role.id && styles.roleOptionActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.roleOptionText,
                              selectedUser.role === role.id && styles.roleOptionTextActive,
                            ]}
                          >
                            {role.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Département</Text>
                    <TextInput
                      style={styles.input}
                      defaultValue={selectedUser.department}
                    />
                  </View>
                </>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={() => setUserModalVisible(false)}
              >
                <Text style={styles.buttonSecondaryText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, styles.buttonPrimary]}>
                <Text style={styles.buttonPrimaryText}>Enregistrer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
    paddingHorizontal: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
  },
  tabTextActive: {
    color: '#007AFF',
  },
  scrollContainer: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 2,
  },
  profileRole: {
    fontSize: 11,
    color: '#007AFF',
    fontWeight: '600',
  },
  settingsGroup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  settingsGroupTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  settingItemContent: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  settingValue: {
    fontSize: 12,
    color: '#8E8E93',
  },
  settingArrow: {
    fontSize: 16,
    color: '#8E8E93',
    marginLeft: 8,
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 20,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tabHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tabTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#007AFF20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#007AFF',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 11,
    color: '#8E8E93',
    marginBottom: 2,
  },
  userDept: {
    fontSize: 10,
    color: '#8E8E93',
  },
  userBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#F2F2F7',
    borderRadius: 6,
  },
  roleLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  roleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  roleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  roleName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 2,
  },
  roleDescription: {
    fontSize: 11,
    color: '#8E8E93',
  },
  roleBadge: {
    backgroundColor: '#007AFF20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#007AFF',
  },
  rolePermissions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  permissionTag: {
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 4,
  },
  permissionTagText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#8E8E93',
  },
  permissionSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  moduleName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000000',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
    marginBottom: 10,
  },
  permissionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  permissionInfo: {
    flex: 1,
    marginRight: 8,
  },
  permissionName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  permissionDesc: {
    fontSize: 10,
    color: '#8E8E93',
  },
  roleCheckboxes: {
    flexDirection: 'row',
    gap: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#E5E5EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  checkmark: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
  },
  closeButton: {
    fontSize: 24,
    color: '#8E8E93',
  },
  modalBody: {
    maxHeight: 400,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#000000',
  },
  roleSelect: {
    gap: 8,
  },
  roleOption: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
  },
  roleOptionActive: {
    backgroundColor: '#007AFF20',
  },
  roleOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
  },
  roleOptionTextActive: {
    color: '#007AFF',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 16,
    paddingBottom: 20,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#007AFF',
  },
  buttonPrimaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  buttonSecondary: {
    backgroundColor: '#F2F2F7',
  },
  buttonSecondaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8E8E93',
  },
});
