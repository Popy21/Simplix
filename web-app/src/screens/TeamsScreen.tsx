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
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { withGlassLayout } from '../components/withGlassLayout';
import GlassCard from '../components/GlassCard';
import { glassTheme } from '../theme/glassTheme';

// SVG Icons
const UsersIcon = ({ size = 24, color = '#007AFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <Circle cx="9" cy="7" r="4" stroke={color} strokeWidth="2"/>
    <Path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </Svg>
);

const UserIcon = ({ size = 20, color = '#666' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <Circle cx="12" cy="7" r="4" stroke={color} strokeWidth="2"/>
  </Svg>
);

const SearchIcon = ({ size = 20, color = '#8E8E93' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="11" cy="11" r="8" stroke={color} strokeWidth="2"/>
    <Path d="M21 21l-4.35-4.35" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </Svg>
);

const BuildingIcon = ({ size = 20, color = '#666' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M3 21h18M5 21V7l8-4v18M13 21V9l6 3v9M9 9v.01M9 12v.01M9 15v.01M9 18v.01" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </Svg>
);

const MapIcon = ({ size = 20, color = '#666' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4zM8 2v16M16 6v16" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </Svg>
);

const TrendingUpIcon = ({ size = 20, color = '#34C759' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M23 6l-9.5 9.5-5-5L1 18" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <Path d="M17 6h6v6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </Svg>
);

const MailIcon = ({ size = 16, color = '#8E8E93' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <Path d="M22 6l-10 7L2 6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </Svg>
);

const ClockIcon = ({ size = 16, color = '#8E8E93' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2"/>
    <Path d="M12 6v6l4 2" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </Svg>
);

const BriefcaseIcon = ({ size = 16, color = '#007AFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="2" y="7" width="20" height="14" rx="2" ry="2" stroke={color} strokeWidth="2"/>
    <Path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </Svg>
);

const DollarIcon = ({ size = 20, color = '#FF9500' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </Svg>
);

const PlusIcon = ({ size = 20, color = '#fff' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 5v14M5 12h14" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </Svg>
);

const XIcon = ({ size = 24, color = '#8E8E93' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M18 6L6 18M6 6l12 12" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </Svg>
);

const EditIcon = ({ size = 18, color = '#fff' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <Path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </Svg>
);

const CheckIcon = ({ size = 16, color = '#fff' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M20 6L9 17l-5-5" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
  </Svg>
);

const TargetIcon = ({ size = 20, color = '#FF3B30' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2"/>
    <Circle cx="12" cy="12" r="6" stroke={color} strokeWidth="2"/>
    <Circle cx="12" cy="12" r="2" stroke={color} strokeWidth="2"/>
  </Svg>
);

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
  color: string;
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTeamData();
  }, []);

  const loadTeamData = () => {
    setLoading(true);
    setTimeout(() => {
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
          lastActive: '2025-11-21 14:45',
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
          lastActive: '2025-11-21 13:20',
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
          lastActive: '2025-11-21 12:00',
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
          lastActive: '2025-11-20 16:30',
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
          lastActive: '2025-11-21 15:10',
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
          lastActive: '2025-11-21 11:45',
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
          lastActive: '2025-11-21 09:30',
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
          lastActive: '2025-11-19 18:00',
          status: 'offline',
          performance: { deals: 0, contacts: 0, revenue: 0 },
        },
      ];

      const mockDepts: Department[] = [
        { id: 'dept1', name: 'Ventes', manager: 'Laurent Michel', members: 4, revenue: 375000, color: '#007AFF' },
        { id: 'dept2', name: 'Support', manager: 'Sophie Bernard', members: 2, revenue: 0, color: '#34C759' },
        { id: 'dept3', name: 'Produit', manager: 'Isabelle Fournier', members: 1, revenue: 0, color: '#FF9500' },
        { id: 'dept4', name: 'Analytics', manager: 'David Rousseau', members: 1, revenue: 0, color: '#AF52DE' },
      ];

      const mockTerritories: Territory[] = [
        { id: 'terr1', name: 'Île-de-France', region: 'Nord', manager: 'Laurent Michel', potential: 500000, current: 245000 },
        { id: 'terr2', name: 'Rhône-Alpes', region: 'Est', manager: 'Jean Dupont', potential: 400000, current: 72000 },
        { id: 'terr3', name: 'PACA', region: 'Sud', manager: 'Pierre Leroy', potential: 350000, current: 58000 },
      ];

      setMembers(mockMembers);
      setDepartments(mockDepts);
      setTerritories(mockTerritories);
      setLoading(false);
    }, 500);
  };

  const filteredMembers = members.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchText.toLowerCase()) ||
                         m.email.toLowerCase().includes(searchText.toLowerCase());
    const matchesDept = !filterDept || m.department === filterDept;
    return matchesSearch && matchesDept;
  });

  const totalRevenue = members.reduce((sum, m) => sum + (m.performance?.revenue || 0), 0);
  const onlineCount = members.filter(m => m.status === 'active').length;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  const renderTeamTab = () => (
    <View style={styles.content}>
      {/* Search */}
      <GlassCard variant="frosted" elevation="sm" borderRadius={16} padding={0} style={styles.searchCard}>
        <View style={styles.searchInputContainer}>
          <SearchIcon size={20} color="#8E8E93" />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un membre..."
            value={searchText}
            onChangeText={setSearchText}
            placeholderTextColor="#8E8E93"
          />
        </View>
      </GlassCard>

      {/* Filter Tags */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        <TouchableOpacity
          style={[styles.filterTag, !filterDept && styles.filterTagActive]}
          onPress={() => setFilterDept(null)}
        >
          <Text style={[styles.filterTagText, !filterDept && styles.filterTagTextActive]}>Tous</Text>
        </TouchableOpacity>
        {departments.map(dept => (
          <TouchableOpacity
            key={dept.id}
            style={[styles.filterTag, filterDept === dept.name && styles.filterTagActive, filterDept === dept.name && { backgroundColor: dept.color }]}
            onPress={() => setFilterDept(dept.name)}
          >
            <Text style={[styles.filterTagText, filterDept === dept.name && styles.filterTagTextActive]}>{dept.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Stats */}
      <View style={styles.statsGrid}>
        <GlassCard variant="frosted" elevation="sm" borderRadius={16} padding={16} style={styles.statCard}>
          <LinearGradient colors={['#34C75930', '#34C75910']} style={[StyleSheet.absoluteFill, { borderRadius: 16 }]} />
          <View style={styles.statIconContainer}>
            <UsersIcon size={22} color="#34C759" />
          </View>
          <Text style={styles.statValue}>{members.length}</Text>
          <Text style={styles.statLabel}>Membres</Text>
        </GlassCard>
        <GlassCard variant="frosted" elevation="sm" borderRadius={16} padding={16} style={styles.statCard}>
          <LinearGradient colors={['#007AFF30', '#007AFF10']} style={[StyleSheet.absoluteFill, { borderRadius: 16 }]} />
          <View style={[styles.statIconContainer, { backgroundColor: '#007AFF20' }]}>
            <UserIcon size={22} color="#007AFF" />
          </View>
          <Text style={styles.statValue}>{onlineCount}</Text>
          <Text style={styles.statLabel}>En ligne</Text>
        </GlassCard>
        <GlassCard variant="frosted" elevation="sm" borderRadius={16} padding={16} style={styles.statCard}>
          <LinearGradient colors={['#FF950030', '#FF950010']} style={[StyleSheet.absoluteFill, { borderRadius: 16 }]} />
          <View style={[styles.statIconContainer, { backgroundColor: '#FF950020' }]}>
            <DollarIcon size={22} color="#FF9500" />
          </View>
          <Text style={styles.statValue}>€{(totalRevenue / 1000).toFixed(0)}k</Text>
          <Text style={styles.statLabel}>Revenue</Text>
        </GlassCard>
      </View>

      {/* Members List */}
      {filteredMembers.map(member => (
        <TouchableOpacity
          key={member.id}
          activeOpacity={0.8}
          onPress={() => {
            setSelectedMember(member);
            setMemberModalVisible(true);
          }}
        >
          <GlassCard variant="frosted" elevation="sm" borderRadius={20} padding={16} style={styles.memberCard}>
            <View style={styles.memberHeader}>
              <View style={styles.memberAvatarContainer}>
                <LinearGradient
                  colors={member.status === 'active' ? ['#007AFF', '#5AC8FA'] : ['#8E8E93', '#C7C7CC']}
                  style={styles.memberAvatarGradient}
                >
                  <Text style={styles.memberAvatarText}>{member.avatar}</Text>
                </LinearGradient>
                <View style={[styles.statusDot, member.status === 'active' ? styles.statusDotActive : styles.statusDotOffline]} />
              </View>

              <View style={styles.memberInfo}>
                <View style={styles.memberNameRow}>
                  <Text style={styles.memberName}>{member.name}</Text>
                  <View style={[styles.roleBadge, { backgroundColor: departments.find(d => d.name === member.department)?.color + '20' }]}>
                    <Text style={[styles.roleBadgeText, { color: departments.find(d => d.name === member.department)?.color }]}>{member.role}</Text>
                  </View>
                </View>
                <View style={styles.memberEmailRow}>
                  <MailIcon size={12} color="#8E8E93" />
                  <Text style={styles.memberEmail}>{member.email}</Text>
                </View>
                <Text style={styles.memberDept}>{member.department} • {member.territory}</Text>
              </View>

              <View style={styles.memberMeta}>
                <ClockIcon size={12} color="#8E8E93" />
                <Text style={styles.lastActive}>{member.lastActive.split(' ')[1]}</Text>
              </View>
            </View>

            {member.performance && (member.performance.deals > 0 || member.performance.contacts > 0) && (
              <View style={styles.memberStats}>
                <View style={styles.memberStat}>
                  <Text style={styles.memberStatValue}>{member.performance.deals}</Text>
                  <Text style={styles.memberStatLabel}>Deals</Text>
                </View>
                <View style={styles.memberStatDivider} />
                <View style={styles.memberStat}>
                  <Text style={styles.memberStatValue}>{member.performance.contacts}</Text>
                  <Text style={styles.memberStatLabel}>Contacts</Text>
                </View>
                <View style={styles.memberStatDivider} />
                <View style={styles.memberStat}>
                  <Text style={[styles.memberStatValue, { color: '#34C759' }]}>€{(member.performance.revenue / 1000).toFixed(0)}k</Text>
                  <Text style={styles.memberStatLabel}>Revenue</Text>
                </View>
              </View>
            )}
          </GlassCard>
        </TouchableOpacity>
      ))}

      {filteredMembers.length === 0 && (
        <GlassCard variant="light" elevation="sm" borderRadius={16} padding={32} style={styles.emptyState}>
          <UsersIcon size={48} color="#C7C7CC" />
          <Text style={styles.emptyStateText}>Aucun membre trouvé</Text>
        </GlassCard>
      )}
    </View>
  );

  const renderDepartmentsTab = () => (
    <View style={styles.content}>
      <View style={styles.tabHeader}>
        <Text style={styles.tabTitle}>{departments.length} Départements</Text>
        <TouchableOpacity style={styles.addButton} activeOpacity={0.8}>
          <LinearGradient colors={['#007AFF', '#5AC8FA']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[StyleSheet.absoluteFill, { borderRadius: 12 }]} />
          <PlusIcon size={16} color="#fff" />
          <Text style={styles.addButtonText}>Ajouter</Text>
        </TouchableOpacity>
      </View>

      {departments.map(dept => (
        <GlassCard key={dept.id} variant="frosted" elevation="sm" borderRadius={20} padding={18} style={styles.departmentCard}>
          <LinearGradient colors={[dept.color + '20', dept.color + '10']} style={[StyleSheet.absoluteFill, { borderRadius: 20 }]} />
          <View style={styles.departmentHeader}>
            <View style={styles.departmentTitleRow}>
              <View style={[styles.deptIconContainer, { backgroundColor: dept.color + '30' }]}>
                <BuildingIcon size={20} color={dept.color} />
              </View>
              <View>
                <Text style={styles.departmentName}>{dept.name}</Text>
                <Text style={styles.departmentManager}>Manager: {dept.manager}</Text>
              </View>
            </View>
            <View style={[styles.departmentBadge, { backgroundColor: dept.color }]}>
              <Text style={styles.departmentBadgeText}>{dept.members}</Text>
            </View>
          </View>

          <View style={styles.departmentStats}>
            <View style={styles.departmentStat}>
              <UsersIcon size={16} color="#8E8E93" />
              <Text style={styles.departmentStatValue}>{dept.members}</Text>
              <Text style={styles.departmentStatLabel}>Membres</Text>
            </View>
            <View style={styles.departmentStatDivider} />
            <View style={styles.departmentStat}>
              <DollarIcon size={16} color="#8E8E93" />
              <Text style={styles.departmentStatValue}>€{(dept.revenue / 1000).toFixed(0)}k</Text>
              <Text style={styles.departmentStatLabel}>Revenue</Text>
            </View>
          </View>

          <View style={styles.departmentMembers}>
            {members.filter(m => m.department === dept.name).map(member => (
              <View key={member.id} style={styles.miniMember}>
                <View style={[styles.miniMemberAvatar, { backgroundColor: dept.color + '30' }]}>
                  <Text style={[styles.miniMemberAvatarText, { color: dept.color }]}>{member.avatar}</Text>
                </View>
                <Text style={styles.miniMemberName}>{member.name.split(' ')[0]}</Text>
              </View>
            ))}
          </View>
        </GlassCard>
      ))}
    </View>
  );

  const renderTerritoriesTab = () => (
    <View style={styles.content}>
      <View style={styles.tabHeader}>
        <Text style={styles.tabTitle}>{territories.length} Territoires</Text>
        <TouchableOpacity style={styles.addButton} activeOpacity={0.8}>
          <LinearGradient colors={['#007AFF', '#5AC8FA']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[StyleSheet.absoluteFill, { borderRadius: 12 }]} />
          <PlusIcon size={16} color="#fff" />
          <Text style={styles.addButtonText}>Ajouter</Text>
        </TouchableOpacity>
      </View>

      {territories.map(territory => {
        const fill = (territory.current / territory.potential) * 100;
        const fillColor = fill > 80 ? '#34C759' : fill > 50 ? '#FF9500' : '#FF3B30';
        return (
          <GlassCard key={territory.id} variant="frosted" elevation="sm" borderRadius={20} padding={18} style={styles.territoryCard}>
            <View style={styles.territoryHeader}>
              <View style={styles.territoryTitleRow}>
                <View style={[styles.territoryIconContainer, { backgroundColor: fillColor + '20' }]}>
                  <MapIcon size={20} color={fillColor} />
                </View>
                <View>
                  <Text style={styles.territoryName}>{territory.name}</Text>
                  <Text style={styles.territoryRegion}>Région {territory.region}</Text>
                </View>
              </View>
              <View>
                <Text style={styles.territoryManagerLabel}>Manager</Text>
                <Text style={styles.territoryManagerName}>{territory.manager}</Text>
              </View>
            </View>

            <View style={styles.progressContainer}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>Progression</Text>
                <Text style={[styles.progressPercent, { color: fillColor }]}>{fill.toFixed(0)}%</Text>
              </View>
              <View style={styles.progressBar}>
                <LinearGradient
                  colors={[fillColor, fillColor + 'CC']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.progressFill, { width: `${fill}%` }]}
                />
              </View>
              <Text style={styles.progressText}>
                €{territory.current.toLocaleString()} / €{territory.potential.toLocaleString()}
              </Text>
            </View>

            <View style={styles.territoryStats}>
              <View style={styles.territoryStat}>
                <TrendingUpIcon size={16} color="#34C759" />
                <Text style={styles.territoryStatValue}>€{(territory.current / 1000).toFixed(0)}k</Text>
                <Text style={styles.territoryStatLabel}>Réalisé</Text>
              </View>
              <View style={styles.territoryStatDivider} />
              <View style={styles.territoryStat}>
                <TargetIcon size={16} color="#FF3B30" />
                <Text style={styles.territoryStatValue}>€{(territory.potential / 1000).toFixed(0)}k</Text>
                <Text style={styles.territoryStatLabel}>Potentiel</Text>
              </View>
            </View>
          </GlassCard>
        );
      })}
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#F2F2F7', '#E8E8ED', '#F2F2F7']} style={StyleSheet.absoluteFill} />

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.pageTitle}>Équipes</Text>
        </View>

        {/* Title Card */}
        <GlassCard variant="frosted" elevation="md" borderRadius={24} padding={20} style={styles.headerCard}>
          <LinearGradient colors={['#007AFF25', '#5AC8FA15']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: 24 }]} />
          <View style={styles.headerCardContent}>
            <View style={styles.headerIconContainer}>
              <UsersIcon size={28} color="#007AFF" />
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerCardTitle}>Équipes</Text>
              <Text style={styles.headerCardSubtitle}>Gestion des membres et territoires</Text>
            </View>
          </View>
        </GlassCard>

        {/* Tabs */}
        <GlassCard variant="frosted" elevation="sm" borderRadius={16} padding={4} style={styles.tabsCard}>
          {[
            { id: 'team', label: 'Équipe', icon: UsersIcon },
            { id: 'departments', label: 'Départements', icon: BuildingIcon },
            { id: 'territories', label: 'Territoires', icon: MapIcon },
          ].map(tab => {
            const IconComponent = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tab, isActive && styles.tabActive]}
                onPress={() => setActiveTab(tab.id as typeof activeTab)}
                activeOpacity={0.8}
              >
                {isActive && <LinearGradient colors={['#007AFF', '#5AC8FA']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[StyleSheet.absoluteFill, { borderRadius: 12 }]} />}
                <IconComponent size={16} color={isActive ? '#fff' : '#8E8E93'} />
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </GlassCard>

        {/* Content */}
        {activeTab === 'team' && renderTeamTab()}
        {activeTab === 'departments' && renderDepartmentsTab()}
        {activeTab === 'territories' && renderTerritoriesTab()}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Member Detail Modal */}
      <Modal visible={memberModalVisible} transparent animationType="slide" onRequestClose={() => setMemberModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <LinearGradient colors={['#F8F8F8', '#FFFFFF']} style={StyleSheet.absoluteFill} />

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Détails Membre</Text>
              <TouchableOpacity onPress={() => setMemberModalVisible(false)} style={styles.closeButton}>
                <XIcon size={24} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            {selectedMember && (
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                {/* Profile */}
                <View style={styles.profileSection}>
                  <LinearGradient colors={['#007AFF', '#5AC8FA']} style={styles.profileAvatar}>
                    <Text style={styles.profileAvatarText}>{selectedMember.avatar}</Text>
                  </LinearGradient>
                  <Text style={styles.profileName}>{selectedMember.name}</Text>
                  <View style={styles.profileRoleBadge}>
                    <BriefcaseIcon size={14} color="#007AFF" />
                    <Text style={styles.profileRole}>{selectedMember.role}</Text>
                  </View>
                  <View style={styles.profileEmailRow}>
                    <MailIcon size={14} color="#8E8E93" />
                    <Text style={styles.profileEmail}>{selectedMember.email}</Text>
                  </View>
                </View>

                {/* Info Grid */}
                <View style={styles.infoGrid}>
                  <View style={styles.infoCard}>
                    <BuildingIcon size={18} color="#007AFF" />
                    <Text style={styles.infoLabel}>Département</Text>
                    <Text style={styles.infoValue}>{selectedMember.department}</Text>
                  </View>
                  <View style={styles.infoCard}>
                    <MapIcon size={18} color="#FF9500" />
                    <Text style={styles.infoLabel}>Territoire</Text>
                    <Text style={styles.infoValue}>{selectedMember.territory}</Text>
                  </View>
                  <View style={styles.infoCard}>
                    <View style={[styles.statusIndicator, { backgroundColor: selectedMember.status === 'active' ? '#34C759' : '#FF3B30' }]} />
                    <Text style={styles.infoLabel}>Statut</Text>
                    <Text style={[styles.infoValue, { color: selectedMember.status === 'active' ? '#34C759' : '#FF3B30' }]}>
                      {selectedMember.status === 'active' ? 'Actif' : 'Hors ligne'}
                    </Text>
                  </View>
                  <View style={styles.infoCard}>
                    <ClockIcon size={18} color="#AF52DE" />
                    <Text style={styles.infoLabel}>Rejoint</Text>
                    <Text style={styles.infoValue}>{selectedMember.joinDate}</Text>
                  </View>
                </View>

                {/* Performance */}
                {selectedMember.performance && (
                  <View style={styles.performanceSection}>
                    <Text style={styles.sectionTitle}>Performance</Text>
                    <View style={styles.performanceGrid}>
                      <View style={[styles.performanceCard, { backgroundColor: '#007AFF10' }]}>
                        <Text style={[styles.performanceValue, { color: '#007AFF' }]}>{selectedMember.performance.deals}</Text>
                        <Text style={styles.performanceLabel}>Deals</Text>
                      </View>
                      <View style={[styles.performanceCard, { backgroundColor: '#FF950010' }]}>
                        <Text style={[styles.performanceValue, { color: '#FF9500' }]}>{selectedMember.performance.contacts}</Text>
                        <Text style={styles.performanceLabel}>Contacts</Text>
                      </View>
                      <View style={[styles.performanceCard, { backgroundColor: '#34C75910' }]}>
                        <Text style={[styles.performanceValue, { color: '#34C759' }]}>€{(selectedMember.performance.revenue / 1000).toFixed(0)}k</Text>
                        <Text style={styles.performanceLabel}>Revenue</Text>
                      </View>
                    </View>
                  </View>
                )}
              </ScrollView>
            )}

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.buttonSecondary} onPress={() => setMemberModalVisible(false)}>
                <Text style={styles.buttonSecondaryText}>Fermer</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.buttonPrimary} activeOpacity={0.8}>
                <LinearGradient colors={['#007AFF', '#5AC8FA']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[StyleSheet.absoluteFill, { borderRadius: 12 }]} />
                <EditIcon size={16} color="#fff" />
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  scrollContainer: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    marginBottom: 16,
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#000',
    letterSpacing: -0.5,
  },
  headerCard: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  headerCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 122, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerCardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#007AFF',
    marginBottom: 4,
  },
  headerCardSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  tabsCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    flexDirection: 'row',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  tabActive: {
    overflow: 'hidden',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
  },
  tabTextActive: {
    color: '#fff',
  },
  content: {
    paddingHorizontal: 20,
  },
  searchCard: {
    marginBottom: 12,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  filterScroll: {
    marginBottom: 16,
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  filterTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  filterTagActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterTagText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  filterTagTextActive: {
    color: '#fff',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#34C75920',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  statLabel: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 2,
  },
  memberCard: {
    marginBottom: 10,
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  memberAvatarContainer: {
    position: 'relative',
    marginRight: 14,
  },
  memberAvatarGradient: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  statusDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#fff',
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
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  memberName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  memberEmailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  memberEmail: {
    fontSize: 12,
    color: '#8E8E93',
  },
  memberDept: {
    fontSize: 12,
    color: '#8E8E93',
  },
  memberMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  lastActive: {
    fontSize: 11,
    color: '#8E8E93',
  },
  memberStats: {
    flexDirection: 'row',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  memberStat: {
    flex: 1,
    alignItems: 'center',
  },
  memberStatDivider: {
    width: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  memberStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#007AFF',
  },
  memberStatLabel: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 12,
  },
  tabHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  tabTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
    overflow: 'hidden',
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  departmentCard: {
    marginBottom: 12,
  },
  departmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  departmentTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deptIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  departmentName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 2,
  },
  departmentManager: {
    fontSize: 12,
    color: '#8E8E93',
  },
  departmentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  departmentBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  departmentStats: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
    marginBottom: 12,
  },
  departmentStat: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  departmentStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  departmentStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  departmentStatLabel: {
    fontSize: 11,
    color: '#8E8E93',
  },
  departmentMembers: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  miniMember: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 20,
    paddingRight: 12,
    gap: 8,
  },
  miniMemberAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniMemberAvatarText: {
    fontSize: 10,
    fontWeight: '700',
  },
  miniMemberName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#000',
  },
  territoryCard: {
    marginBottom: 12,
  },
  territoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  territoryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  territoryIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  territoryName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 2,
  },
  territoryRegion: {
    fontSize: 12,
    color: '#8E8E93',
  },
  territoryManagerLabel: {
    fontSize: 10,
    color: '#8E8E93',
    textAlign: 'right',
  },
  territoryManagerName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
    textAlign: 'right',
  },
  progressContainer: {
    marginBottom: 14,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 12,
    color: '#8E8E93',
  },
  progressPercent: {
    fontSize: 14,
    fontWeight: '700',
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 11,
    color: '#8E8E93',
  },
  territoryStats: {
    flexDirection: 'row',
  },
  territoryStat: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  territoryStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  territoryStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  territoryStatLabel: {
    fontSize: 11,
    color: '#8E8E93',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 20,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    maxHeight: 420,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
    marginBottom: 20,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  profileAvatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  profileRoleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF15',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    marginBottom: 8,
  },
  profileRole: {
    fontSize: 13,
    fontWeight: '600',
    color: '#007AFF',
  },
  profileEmailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  profileEmail: {
    fontSize: 13,
    color: '#8E8E93',
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  infoCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F8F8F8',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  statusIndicator: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  infoLabel: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 8,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
  },
  performanceSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
  },
  performanceGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  performanceCard: {
    flex: 1,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  performanceValue: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  performanceLabel: {
    fontSize: 11,
    color: '#8E8E93',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 16,
    paddingBottom: 30,
  },
  buttonSecondary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  buttonSecondaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#8E8E93',
  },
  buttonPrimary: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    overflow: 'hidden',
  },
  buttonPrimaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});

export default withGlassLayout(TeamsScreen);
