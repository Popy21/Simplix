import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
  Platform,
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { UsersIcon, TrendingUpIcon } from '../components/Icons';
import { withGlassLayout } from '../components/withGlassLayout';

type TeamsScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Dashboard'>;
};

interface TeamMember {
  id: string;
  name: string;
  avatar: string;
  email: string;
  role: string;
  department: string;
  territory: string;
  reportsTo?: string;
  joinDate: string;
  lastActive: string;
  status: 'active' | 'offline';
  performance?: {
    deals: number;
    contacts: number;
    revenue: number;
  };
}

interface Department {
  id: string;
  name: string;
  manager: string;
  members: number;
  revenue: number;
}

interface Territory {
  id: string;
  name: string;
  region: string;
  manager: string;
  potential: number;
  current: number;
}

function TeamsScreen({ navigation }: TeamsScreenProps) {
  const [activeTab, setActiveTab] = useState<'team' | 'departments' | 'territories'>('team');
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [memberModalVisible, setMemberModalVisible] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [searchText, setSearchText] = useState('');
  const [filterDept, setFilterDept] = useState<string | null>(null);

  useEffect(() => {
    loadTeamData();
  }, []);

  const loadTeamData = () => {
    // Team Members
    const mockMembers: TeamMember[] = [
      {
        id: 'tm1',
        name: 'Laurent Michel',
        avatar: 'LM',
        email: 'laurent.michel@company.fr',
        role: 'Sales Manager',
        department: 'Ventes',
        territory: 'Île-de-France',
        joinDate: '2023-01-15',
        lastActive: '2025-11-19 14:45',
        status: 'active',
        performance: { deals: 12, contacts: 45, revenue: 150000 },
      },
      {
        id: 'tm2',
        name: 'Marie Martin',
        avatar: 'MM',
        email: 'marie.martin@company.fr',
        role: 'Sales Rep',
        department: 'Ventes',
        territory: 'Île-de-France',
        reportsTo: 'Laurent Michel',
        joinDate: '2023-06-01',
        lastActive: '2025-11-19 13:20',
        status: 'active',
        performance: { deals: 8, contacts: 32, revenue: 95000 },
      },
      {
        id: 'tm3',
        name: 'Jean Dupont',
        avatar: 'JD',
        email: 'jean.dupont@company.fr',
        role: 'Sales Rep',
        department: 'Ventes',
        territory: 'Rhône-Alpes',
        reportsTo: 'Laurent Michel',
        joinDate: '2023-03-10',
        lastActive: '2025-11-19 12:00',
        status: 'active',
        performance: { deals: 6, contacts: 28, revenue: 72000 },
      },
      {
        id: 'tm4',
        name: 'Pierre Leroy',
        avatar: 'PL',
        email: 'pierre.leroy@company.fr',
        role: 'Sales Rep',
        department: 'Ventes',
        territory: 'PACA',
        reportsTo: 'Laurent Michel',
        joinDate: '2023-09-20',
        lastActive: '2025-11-18 16:30',
        status: 'offline',
        performance: { deals: 5, contacts: 22, revenue: 58000 },
      },
      {
        id: 'tm5',
        name: 'Sophie Bernard',
        avatar: 'SB',
        email: 'sophie.bernard@company.fr',
        role: 'Support Manager',
        department: 'Support',
        territory: 'National',
        joinDate: '2023-02-01',
        lastActive: '2025-11-19 15:10',
        status: 'active',
        performance: { deals: 0, contacts: 120, revenue: 0 },
      },
      {
        id: 'tm6',
        name: 'Thomas Renault',
        avatar: 'TR',
        email: 'thomas.renault@company.fr',
        role: 'Support Agent',
        department: 'Support',
        territory: 'National',
        reportsTo: 'Sophie Bernard',
        joinDate: '2023-07-15',
        lastActive: '2025-11-19 11:45',
        status: 'active',
        performance: { deals: 0, contacts: 85, revenue: 0 },
      },
      {
        id: 'tm7',
        name: 'Isabelle Fournier',
        avatar: 'IF',
        email: 'isabelle.fournier@company.fr',
        role: 'Product Manager',
        department: 'Produit',
        territory: 'HQ',
        joinDate: '2022-11-01',
        lastActive: '2025-11-19 09:30',
        status: 'active',
        performance: { deals: 0, contacts: 15, revenue: 0 },
      },
      {
        id: 'tm8',
        name: 'David Rousseau',
        avatar: 'DR',
        email: 'david.rousseau@company.fr',
        role: 'Data Analyst',
        department: 'Analytics',
        territory: 'HQ',
        joinDate: '2023-05-10',
        lastActive: '2025-11-17 18:00',
        status: 'offline',
        performance: { deals: 0, contacts: 0, revenue: 0 },
      },
    ];

    // Departments
    const mockDepts: Department[] = [
      {
        id: 'dept1',
        name: 'Ventes',
        manager: 'Laurent Michel',
        members: 4,
        revenue: 375000,
      },
      {
        id: 'dept2',
        name: 'Support',
        manager: 'Sophie Bernard',
        members: 2,
        revenue: 0,
      },
      {
        id: 'dept3',
        name: 'Produit',
        manager: 'Isabelle Fournier',
        members: 1,
        revenue: 0,
      },
      {
        id: 'dept4',
        name: 'Analytics',
        manager: 'David Rousseau',
        members: 1,
        revenue: 0,
      },
    ];

    // Territories
    const mockTerritories: Territory[] = [
      {
        id: 'terr1',
        name: 'Île-de-France',
        region: 'Nord',
        manager: 'Laurent Michel',
        potential: 500000,
        current: 245000,
      },
      {
        id: 'terr2',
        name: 'Rhône-Alpes',
        region: 'Est',
        manager: 'Jean Dupont',
        potential: 400000,
        current: 72000,
      },
      {
        id: 'terr3',
        name: 'PACA',
        region: 'Sud',
        manager: 'Pierre Leroy',
        potential: 350000,
        current: 58000,
      },
    ];

    setMembers(mockMembers);
    setDepartments(mockDepts);
    setTerritories(mockTerritories);
  };

  const filteredMembers = members.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchText.toLowerCase()) ||
                         m.email.toLowerCase().includes(searchText.toLowerCase());
    const matchesDept = !filterDept || m.department === filterDept;
    return matchesSearch && matchesDept;
  });

  const renderTeamTab = () => (
    <View style={styles.content}>
      {/* Search & Filter */}
      <View style={styles.searchSection}>
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un membre..."
          value={searchText}
          onChangeText={setSearchText}
          placeholderTextColor="#C7C7CC"
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
        >
          <TouchableOpacity
            style={[styles.filterTag, !filterDept && styles.filterTagActive]}
            onPress={() => setFilterDept(null)}
          >
            <Text
              style={[
                styles.filterTagText,
                !filterDept && styles.filterTagTextActive,
              ]}
            >
              Tous
            </Text>
          </TouchableOpacity>
          {Array.from(new Set(members.map(m => m.department))).map(dept => (
            <TouchableOpacity
              key={dept}
              style={[styles.filterTag, filterDept === dept && styles.filterTagActive]}
              onPress={() => setFilterDept(dept)}
            >
              <Text
                style={[
                  styles.filterTagText,
                  filterDept === dept && styles.filterTagTextActive,
                ]}
              >
                {dept}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Stats Summary */}
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: '#34C75920' }]}>
          <Text style={styles.statValue}>{members.length}</Text>
          <Text style={styles.statLabel}>Membres</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#007AFF20' }]}>
          <Text style={styles.statValue}>
            {members.filter(m => m.status === 'active').length}
          </Text>
          <Text style={styles.statLabel}>En ligne</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#FF952320' }]}>
          <Text style={styles.statValue}>€{
            members.reduce((sum, m) => sum + (m.performance?.revenue || 0), 0).toLocaleString()
          }</Text>
          <Text style={styles.statLabel}>Revenue</Text>
        </View>
      </View>

      {/* Members List */}
      <FlatList
        data={filteredMembers}
        renderItem={({ item: member }) => (
          <TouchableOpacity
            style={styles.memberCard}
            onPress={() => {
              setSelectedMember(member);
              setMemberModalVisible(true);
            }}
          >
            <View style={styles.memberHeader}>
              <View style={[styles.memberAvatar, { position: 'relative' }]}>
                <Text style={styles.memberAvatarText}>{member.avatar}</Text>
                <View
                  style={[
                    styles.statusDot,
                    member.status === 'active'
                      ? styles.statusDotActive
                      : styles.statusDotOffline,
                  ]}
                />
              </View>

              <View style={styles.memberInfo}>
                <View style={styles.memberNameRow}>
                  <Text style={styles.memberName}>{member.name}</Text>
                  <Text style={styles.memberRole}>{member.role}</Text>
                </View>
                <Text style={styles.memberEmail}>{member.email}</Text>
                <Text style={styles.memberDept}>{member.department} • {member.territory}</Text>
              </View>

              <View style={styles.memberMeta}>
                <Text style={styles.lastActive}>{member.lastActive}</Text>
              </View>
            </View>

            {member.performance && (member.performance.deals > 0 || member.performance.contacts > 0) && (
              <View style={styles.memberStats}>
                <View style={styles.memberStat}>
                  <Text style={styles.memberStatValue}>{member.performance.deals}</Text>
                  <Text style={styles.memberStatLabel}>Deals</Text>
                </View>
                <View style={styles.memberStat}>
                  <Text style={styles.memberStatValue}>{member.performance.contacts}</Text>
                  <Text style={styles.memberStatLabel}>Contacts</Text>
                </View>
                <View style={styles.memberStat}>
                  <Text style={styles.memberStatValue}>
                    €{(member.performance.revenue / 1000).toFixed(0)}k
                  </Text>
                  <Text style={styles.memberStatLabel}>Revenue</Text>
                </View>
              </View>
            )}
          </TouchableOpacity>
        )}
        keyExtractor={item => item.id}
        scrollEnabled={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>Aucun membre trouvé</Text>
          </View>
        }
      />
    </View>
  );

  const renderDepartmentsTab = () => (
    <View style={styles.content}>
      <View style={styles.tabHeader}>
        <Text style={styles.tabTitle}>{departments.length} Départements</Text>
        <TouchableOpacity style={styles.addButton}>
          <Text style={styles.addButtonText}>+ Ajouter</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={departments}
        renderItem={({ item: dept }) => (
          <View style={styles.departmentCard}>
            <View style={styles.departmentHeader}>
              <View>
                <Text style={styles.departmentName}>{dept.name}</Text>
                <Text style={styles.departmentManager}>Manager: {dept.manager}</Text>
              </View>
              <View style={styles.departmentBadge}>
                <Text style={styles.departmentBadgeText}>{dept.members}</Text>
              </View>
            </View>

            <View style={styles.departmentStats}>
              <View style={styles.departmentStat}>
                <Text style={styles.departmentStatLabel}>Membres</Text>
                <Text style={styles.departmentStatValue}>{dept.members}</Text>
              </View>
              <View style={styles.departmentStat}>
                <Text style={styles.departmentStatLabel}>Revenue</Text>
                <Text style={styles.departmentStatValue}>
                  €{(dept.revenue / 1000).toFixed(0)}k
                </Text>
              </View>
            </View>

            {/* Members in Department */}
            <View style={styles.departmentMembers}>
              {members
                .filter(m => m.department === dept.name)
                .map(member => (
                  <View key={member.id} style={styles.miniMember}>
                    <Text style={styles.miniMemberAvatar}>{member.avatar}</Text>
                    <Text style={styles.miniMemberName}>{member.name}</Text>
                  </View>
                ))}
            </View>
          </View>
        )}
        keyExtractor={item => item.id}
        scrollEnabled={false}
      />
    </View>
  );

  const renderTerritoriesTab = () => (
    <View style={styles.content}>
      <View style={styles.tabHeader}>
        <Text style={styles.tabTitle}>{territories.length} Territoires</Text>
        <TouchableOpacity style={styles.addButton}>
          <Text style={styles.addButtonText}>+ Ajouter</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={territories}
        renderItem={({ item: territory }) => {
          const fill = (territory.current / territory.potential) * 100;
          return (
            <View style={styles.territoryCard}>
              <View style={styles.territoryHeader}>
                <View>
                  <Text style={styles.territoryName}>{territory.name}</Text>
                  <Text style={styles.territoryRegion}>{territory.region}</Text>
                </View>
                <View>
                  <Text style={styles.territoryManager}>Manager:</Text>
                  <Text style={styles.territoryManagerName}>{territory.manager}</Text>
                </View>
              </View>

              {/* Progress Bar */}
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${fill}%`, backgroundColor: fill > 80 ? '#34C759' : fill > 50 ? '#FF9500' : '#FF3B30' },
                    ]}
                  />
                </View>
                <Text style={styles.progressText}>
                  €{territory.current.toLocaleString()} / €{territory.potential.toLocaleString()}
                </Text>
              </View>

              <View style={styles.territoryStats}>
                <View style={styles.territoryStat}>
                  <Text style={styles.territoryStatLabel}>Réalisé</Text>
                  <Text style={styles.territoryStatValue}>
                    €{(territory.current / 1000).toFixed(0)}k
                  </Text>
                </View>
                <View style={styles.territoryStat}>
                  <Text style={styles.territoryStatLabel}>Potentiel</Text>
                  <Text style={styles.territoryStatValue}>
                    €{(territory.potential / 1000).toFixed(0)}k
                  </Text>
                </View>
                <View style={styles.territoryStat}>
                  <Text style={styles.territoryStatLabel}>Taux</Text>
                  <Text style={styles.territoryStatValue}>{fill.toFixed(0)}%</Text>
                </View>
              </View>
            </View>
          );
        }}
        keyExtractor={item => item.id}
        scrollEnabled={false}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>👥 Équipes</Text>
        <Text style={styles.headerSubtitle}>Gestion des membres et territoires</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {[
          { id: 'team', label: 'Équipe' },
          { id: 'departments', label: 'Départements' },
          { id: 'territories', label: 'Territoires' },
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
        {activeTab === 'team' && renderTeamTab()}
        {activeTab === 'departments' && renderDepartmentsTab()}
        {activeTab === 'territories' && renderTerritoriesTab()}
      </ScrollView>

      {/* Member Detail Modal */}
      <Modal
        visible={memberModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setMemberModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Détails Membre</Text>
              <TouchableOpacity onPress={() => setMemberModalVisible(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            {selectedMember && (
              <ScrollView style={styles.modalBody}>
                {/* Profile */}
                <View style={styles.profileSection}>
                  <View style={styles.profileAvatar}>
                    <Text style={styles.profileAvatarText}>{selectedMember.avatar}</Text>
                  </View>
                  <Text style={styles.profileName}>{selectedMember.name}</Text>
                  <Text style={styles.profileRole}>{selectedMember.role}</Text>
                  <Text style={styles.profileEmail}>{selectedMember.email}</Text>
                </View>

                {/* Info Grid */}
                <View style={styles.infoGrid}>
                  <View style={styles.infoCard}>
                    <Text style={styles.infoLabel}>Département</Text>
                    <Text style={styles.infoValue}>{selectedMember.department}</Text>
                  </View>
                  <View style={styles.infoCard}>
                    <Text style={styles.infoLabel}>Territoire</Text>
                    <Text style={styles.infoValue}>{selectedMember.territory}</Text>
                  </View>
                  <View style={styles.infoCard}>
                    <Text style={styles.infoLabel}>Statut</Text>
                    <Text
                      style={[
                        styles.infoValue,
                        {
                          color:
                            selectedMember.status === 'active' ? '#34C759' : '#FF3B30',
                        },
                      ]}
                    >
                      {selectedMember.status === 'active' ? 'Actif' : 'Hors ligne'}
                    </Text>
                  </View>
                  <View style={styles.infoCard}>
                    <Text style={styles.infoLabel}>Rejoint</Text>
                    <Text style={styles.infoValue}>{selectedMember.joinDate}</Text>
                  </View>
                </View>

                {/* Performance */}
                {selectedMember.performance && (
                  <View style={styles.performanceSection}>
                    <Text style={styles.sectionTitle}>Performance</Text>
                    <View style={styles.performanceGrid}>
                      <View style={styles.performanceCard}>
                        <Text style={styles.performanceValue}>
                          {selectedMember.performance.deals}
                        </Text>
                        <Text style={styles.performanceLabel}>Deals</Text>
                      </View>
                      <View style={styles.performanceCard}>
                        <Text style={styles.performanceValue}>
                          {selectedMember.performance.contacts}
                        </Text>
                        <Text style={styles.performanceLabel}>Contacts</Text>
                      </View>
                      <View style={styles.performanceCard}>
                        <Text style={styles.performanceValue}>
                          €{(selectedMember.performance.revenue / 1000).toFixed(0)}k
                        </Text>
                        <Text style={styles.performanceLabel}>Revenue</Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* Activity */}
                <View style={styles.activitySection}>
                  <Text style={styles.sectionTitle}>Activité Récente</Text>
                  <View style={styles.activityItem}>
                    <View style={styles.activityDot} />
                    <View style={styles.activityContent}>
                      <Text style={styles.activityAction}>Dernière connexion</Text>
                      <Text style={styles.activityTime}>{selectedMember.lastActive}</Text>
                    </View>
                  </View>
                </View>
              </ScrollView>
            )}

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={() => setMemberModalVisible(false)}
              >
                <Text style={styles.buttonSecondaryText}>Fermer</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, styles.buttonPrimary]}>
                <Text style={styles.buttonPrimaryText}>Éditer</Text>
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
  searchSection: {
    marginBottom: 16,
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#000000',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  filterScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  filterTag: {
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 8,
  },
  filterTagActive: {
    backgroundColor: '#007AFF',
  },
  filterTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
  },
  filterTagTextActive: {
    color: '#FFFFFF',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
  },
  statLabel: {
    fontSize: 10,
    color: '#8E8E93',
    marginTop: 4,
  },
  memberCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#007AFF20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#007AFF',
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  statusDotActive: {
    backgroundColor: '#34C759',
  },
  statusDotOffline: {
    backgroundColor: '#C7C7CC',
  },
  memberInfo: {
    flex: 1,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  memberName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000000',
  },
  memberRole: {
    fontSize: 10,
    fontWeight: '600',
    color: '#007AFF',
  },
  memberEmail: {
    fontSize: 11,
    color: '#8E8E93',
    marginBottom: 2,
  },
  memberDept: {
    fontSize: 10,
    color: '#8E8E93',
  },
  memberMeta: {
    alignItems: 'flex-end',
  },
  lastActive: {
    fontSize: 10,
    color: '#8E8E93',
  },
  memberStats: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  memberStat: {
    flex: 1,
    alignItems: 'center',
  },
  memberStatValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#007AFF',
  },
  memberStatLabel: {
    fontSize: 10,
    color: '#8E8E93',
    marginTop: 2,
  },
  emptyState: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#8E8E93',
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
  departmentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  departmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  departmentName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 2,
  },
  departmentManager: {
    fontSize: 11,
    color: '#8E8E93',
  },
  departmentBadge: {
    backgroundColor: '#007AFF20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  departmentBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#007AFF',
  },
  departmentStats: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
    marginBottom: 10,
  },
  departmentStat: {
    flex: 1,
    alignItems: 'center',
  },
  departmentStatLabel: {
    fontSize: 10,
    color: '#8E8E93',
    marginBottom: 2,
  },
  departmentStatValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000000',
  },
  departmentMembers: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  miniMember: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  miniMemberAvatar: {
    fontSize: 10,
    fontWeight: '600',
    color: '#007AFF',
  },
  miniMemberName: {
    fontSize: 10,
    color: '#000000',
  },
  territoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  territoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  territoryName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 2,
  },
  territoryRegion: {
    fontSize: 11,
    color: '#8E8E93',
  },
  territoryManager: {
    fontSize: 10,
    color: '#8E8E93',
  },
  territoryManagerName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#000000',
  },
  progressContainer: {
    marginBottom: 10,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E5E5EA',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
  },
  progressText: {
    fontSize: 10,
    color: '#8E8E93',
  },
  territoryStats: {
    flexDirection: 'row',
    gap: 12,
  },
  territoryStat: {
    flex: 1,
    alignItems: 'center',
  },
  territoryStatLabel: {
    fontSize: 10,
    color: '#8E8E93',
    marginBottom: 2,
  },
  territoryStatValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000000',
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
    marginBottom: 16,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
    marginBottom: 16,
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  profileAvatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  profileName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 2,
  },
  profileRole: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 11,
    color: '#8E8E93',
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  infoCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    padding: 10,
  },
  infoLabel: {
    fontSize: 10,
    color: '#8E8E93',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000000',
  },
  performanceSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 10,
  },
  performanceGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  performanceCard: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  performanceValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#007AFF',
    marginBottom: 2,
  },
  performanceLabel: {
    fontSize: 10,
    color: '#8E8E93',
  },
  activitySection: {
    marginBottom: 16,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 10,
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
    marginTop: 4,
  },
  activityContent: {
    flex: 1,
  },
  activityAction: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 11,
    color: '#8E8E93',
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

export default withGlassLayout(TeamsScreen);
