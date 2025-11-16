import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Platform,
  FlatList,
  Pressable,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useAuth } from '../context/AuthContext';
import {
  TrendingUpIcon,
  TrendingDownIcon,
  UsersIcon,
} from '../components/Icons';
import { leadsService, contactService } from '../services/api';

type LeadsScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Contacts'>;
};

interface Lead {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  score: number;
  trend: 'up' | 'down' | 'flat';
  contacts: number;
  lastActivity: string;
  status: 'hot' | 'warm' | 'cold';
  deals: number;
  activities: number;
}

interface ScoreBreakdown {
  email: number;
  phone: number;
  company: number;
  linkedin: number;
  type: number;
  source: number;
  activities: number;
  deals: number;
  engagement: number;
}

const { width, height } = Dimensions.get('window');

export default function LeadsScreen({ navigation }: LeadsScreenProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'hot' | 'warm' | 'cold'>('all');
  const [sortBy, setSortBy] = useState<'score' | 'trend' | 'activity'>('score');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedLeadBreakdown, setSelectedLeadBreakdown] = useState<ScoreBreakdown | null>(null);
  const [newLeadModalVisible, setNewLeadModalVisible] = useState(false);
  const [newLeadForm, setNewLeadForm] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
  });

  useEffect(() => {
    fetchLeads();
  }, []);

  useEffect(() => {
    filterAndSortLeads();
  }, [leads, filterStatus, sortBy]);

  const fetchLeads = async () => {
    try {
      setLoading(true);

      // Fetch real leads data from API
      const response = await contactService.getAll({ type: 'lead' });
      const contacts = response.data.data || response.data;

      // Transform API data to Lead format
      const apiLeads: Lead[] = contacts.map((contact: any) => ({
        id: contact.id,
        name: `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || contact.full_name || 'N/A',
        company: contact.company_name || 'N/A',
        email: contact.email || '',
        phone: contact.phone || '',
        score: contact.score || 0,
        trend: contact.score >= 70 ? 'up' : contact.score >= 40 ? 'flat' : 'down',
        contacts: 0, // Could be calculated from activities
        lastActivity: 'N/A',
        status: contact.score >= 70 ? 'hot' : contact.score >= 40 ? 'warm' : 'cold',
        deals: 0, // Could be fetched from deals API
        activities: 0, // Could be fetched from activities API
      }));

      setLeads(apiLeads);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching leads:', error);
      // Fallback to mock data if API fails
      const mockLeads: Lead[] = [
        {
          id: '1',
          name: 'Acme Corporation',
          company: 'Acme Corp',
          email: 'contact@acme.com',
          phone: '+33612345678',
          score: 95,
          trend: 'up',
          contacts: 5,
          lastActivity: '2 heures',
          status: 'hot',
          deals: 2,
          activities: 24,
        },
        {
          id: '2',
          name: 'Tech Industries France',
          company: 'TechFR SAS',
          email: 'sales@techfr.fr',
          phone: '+33623456789',
          score: 82,
          trend: 'up',
          contacts: 3,
          lastActivity: '5 heures',
          status: 'hot',
          deals: 1,
          activities: 18,
        },
        {
          id: '3',
          name: 'Global Solutions Ltd',
          company: 'Global Solutions',
          email: 'contact@globalsol.uk',
          phone: '+33634567890',
          score: 68,
          trend: 'flat',
          contacts: 2,
          lastActivity: '1 jour',
          status: 'warm',
          deals: 0,
          activities: 8,
        },
        {
          id: '4',
          name: 'Enterprise Plus',
          company: 'Enterprise',
          email: 'info@enterprise.com',
          phone: '+33645678901',
          score: 55,
          trend: 'down',
          contacts: 1,
          lastActivity: '3 jours',
          status: 'warm',
          deals: 0,
          activities: 3,
        },
        {
          id: '5',
          name: 'StartUp Innovations',
          company: 'StartupXYZ',
          email: 'contact@startupxyz.fr',
          phone: '+33656789012',
          score: 42,
          trend: 'up',
          contacts: 1,
          lastActivity: '5 jours',
          status: 'cold',
          deals: 0,
          activities: 1,
        },
        {
          id: '6',
          name: 'SME Business',
          company: 'SME Corp',
          email: 'contact@smecorp.fr',
          phone: '+33667890123',
          score: 28,
          trend: 'down',
          contacts: 1,
          lastActivity: '10 jours',
          status: 'cold',
          deals: 0,
          activities: 0,
        },
      ];

      setLeads(mockLeads);
      setLoading(false);
    } catch (error) {
      console.error('Erreur lors du chargement des leads:', error);
      setLoading(false);
    }
  };

  const filterAndSortLeads = () => {
    let filtered = leads;

    // Appliquer le filtre de statut
    if (filterStatus !== 'all') {
      filtered = filtered.filter(lead => lead.status === filterStatus);
    }

    // Appliquer le tri
    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'score') return b.score - a.score;
      if (sortBy === 'trend') {
        const trendOrder = { up: 2, flat: 1, down: 0 };
        return trendOrder[b.trend] - trendOrder[a.trend];
      }
      if (sortBy === 'activity') return b.activities - a.activities;
      return 0;
    });

    setFilteredLeads(sorted);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#34C759';
    if (score >= 60) return '#FF9500';
    return '#FF3B30';
  };

  const getScoreBreakdown = (lead: Lead): ScoreBreakdown => {
    // Simuler le breakdown du scoring
    return {
      email: 10,
      phone: 10,
      company: 15,
      linkedin: Math.floor(lead.score * 0.2),
      type: Math.floor(lead.score * 0.25),
      source: Math.floor(lead.score * 0.2),
      activities: Math.min(lead.activities * 2, 25),
      deals: lead.deals * 10,
      engagement: Math.floor((lead.activities / 30) * 20),
    };
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchLeads().then(() => setRefreshing(false));
  };

  const handleCreateLead = () => {
    if (!newLeadForm.name.trim() || !newLeadForm.company.trim()) {
      Alert.alert('Erreur', 'Veuillez remplir le nom et l\'entreprise');
      return;
    }

    const newLead: Lead = {
      id: String(leads.length + 1),
      name: newLeadForm.name,
      company: newLeadForm.company,
      email: newLeadForm.email,
      phone: newLeadForm.phone,
      score: 30,
      trend: 'flat',
      contacts: 1,
      lastActivity: 'À l\'instant',
      status: 'cold',
      deals: 0,
      activities: 0,
    };

    setLeads([...leads, newLead]);
    setNewLeadForm({ name: '', company: '', email: '', phone: '' });
    setNewLeadModalVisible(false);
    Alert.alert('Succès', `Lead "${newLead.name}" créé avec succès!`);
  };

  const handleResetForm = () => {
    setNewLeadForm({ name: '', company: '', email: '', phone: '' });
    setNewLeadModalVisible(false);
  };

  const renderLeadCard = ({ item }: { item: Lead }) => (
    <Pressable
      style={styles.leadCard}
      onPress={() => {
        setSelectedLead(item);
        setSelectedLeadBreakdown(getScoreBreakdown(item));
      }}
    >
      <View style={styles.leadHeader}>
        <View style={styles.scoreCircle}>
          <Text style={[styles.scoreText, { color: getScoreColor(item.score) }]}>
            {item.score}
          </Text>
        </View>
        <View style={styles.leadTitleSection}>
          <Text style={styles.leadName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.leadCompany}>{item.company}</Text>
        </View>
        <View style={[styles.statusBadge, { 
          backgroundColor: item.status === 'hot' ? '#34C75920' : 
                          item.status === 'warm' ? '#FF950020' : '#F2F2F7'
        }]}>
          <Text style={[styles.statusText, { 
            color: item.status === 'hot' ? '#34C759' : 
                   item.status === 'warm' ? '#FF9500' : '#8E8E93'
          }]}>
            {item.status === 'hot' ? '🔥' : item.status === 'warm' ? '⚡' : '❄️'}
          </Text>
        </View>
      </View>

      <View style={styles.leadMeta}>
        <View style={styles.metaItem}>
          <UsersIcon size={14} color="#8E8E93" />
          <Text style={styles.metaText}>{item.contacts} contacts</Text>
        </View>
        <View style={styles.metaItem}>
          <TrendingUpIcon size={14} color={item.trend === 'up' ? '#34C759' : item.trend === 'down' ? '#FF3B30' : '#8E8E93'} />
          <Text style={styles.metaText}>{item.trend}</Text>
        </View>
        <View style={styles.metaItem}>
          <Text style={styles.metaText}>📊 {item.deals} deals</Text>
        </View>
        <View style={styles.metaItem}>
          <Text style={styles.metaText}>⏱ {item.lastActivity}</Text>
        </View>
      </View>

      <View style={styles.scoreBar}>
        <View style={[styles.scoreBarFill, { 
          width: `${item.score}%`,
          backgroundColor: getScoreColor(item.score)
        }]} />
      </View>
    </Pressable>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Chargement des leads...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>🎯 Lead Scoring</Text>
            <Text style={styles.headerSubtitle}>Priorisez vos prospects</Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setNewLeadModalVisible(true)}
          >
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary Cards */}
        <View style={styles.summaryCards}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Hot Leads</Text>
            <Text style={styles.summaryValue}>{leads.filter(l => l.status === 'hot').length}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Score Moyen</Text>
            <Text style={styles.summaryValue}>
              {Math.round(leads.reduce((a, b) => a + b.score, 0) / leads.length)}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Leads</Text>
            <Text style={styles.summaryValue}>{leads.length}</Text>
          </View>
        </View>

        {/* Filters & Sort */}
        <View style={styles.filterSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            <TouchableOpacity
              style={[styles.filterButton, filterStatus === 'all' && styles.filterButtonActive]}
              onPress={() => setFilterStatus('all')}
            >
              <Text style={[styles.filterText, filterStatus === 'all' && styles.filterTextActive]}>
                Tous
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterButton, filterStatus === 'hot' && styles.filterButtonActive]}
              onPress={() => setFilterStatus('hot')}
            >
              <Text style={[styles.filterText, filterStatus === 'hot' && styles.filterTextActive]}>
                🔥 Chauds
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterButton, filterStatus === 'warm' && styles.filterButtonActive]}
              onPress={() => setFilterStatus('warm')}
            >
              <Text style={[styles.filterText, filterStatus === 'warm' && styles.filterTextActive]}>
                ⚡ Tièdes
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterButton, filterStatus === 'cold' && styles.filterButtonActive]}
              onPress={() => setFilterStatus('cold')}
            >
              <Text style={[styles.filterText, filterStatus === 'cold' && styles.filterTextActive]}>
                ❄️ Froids
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Sort Options */}
        <View style={styles.sortSection}>
          <Text style={styles.sortLabel}>Trier par:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={[styles.sortButton, sortBy === 'score' && styles.sortButtonActive]}
              onPress={() => setSortBy('score')}
            >
              <Text style={[styles.sortText, sortBy === 'score' && styles.sortTextActive]}>
                Score
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.sortButton, sortBy === 'trend' && styles.sortButtonActive]}
              onPress={() => setSortBy('trend')}
            >
              <Text style={[styles.sortText, sortBy === 'trend' && styles.sortTextActive]}>
                Tendance
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.sortButton, sortBy === 'activity' && styles.sortButtonActive]}
              onPress={() => setSortBy('activity')}
            >
              <Text style={[styles.sortText, sortBy === 'activity' && styles.sortTextActive]}>
                Activité
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Leads List */}
        <FlatList
          data={filteredLeads}
          renderItem={renderLeadCard}
          keyExtractor={item => item.id}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          contentContainerStyle={styles.listContent}
        />

        {/* Score Breakdown Modal (Bottom Sheet Alternative) */}
        {selectedLead && selectedLeadBreakdown && (
          <View style={styles.detailsCard}>
            <View style={styles.detailsHeader}>
              <Text style={styles.detailsTitle}>{selectedLead.name}</Text>
              <TouchableOpacity onPress={() => setSelectedLead(null)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.detailsInfo}>
              <Text style={styles.detailsLabel}>Email:</Text>
              <Text style={styles.detailsValue}>{selectedLead.email}</Text>

              <Text style={styles.detailsLabel}>Téléphone:</Text>
              <Text style={styles.detailsValue}>{selectedLead.phone}</Text>

              <Text style={styles.detailsLabel}>Dernière activité:</Text>
              <Text style={styles.detailsValue}>{selectedLead.lastActivity}</Text>
            </View>

            <View style={styles.scoreBreakdownSection}>
              <Text style={styles.detailsLabel}>Breakdown du Score</Text>
              <View style={styles.scoreBreakdownGrid}>
                <View style={styles.breakdownItem}>
                  <Text style={styles.breakdownLabel}>Email</Text>
                  <Text style={styles.breakdownValue}>{selectedLeadBreakdown.email}pts</Text>
                </View>
                <View style={styles.breakdownItem}>
                  <Text style={styles.breakdownLabel}>Téléphone</Text>
                  <Text style={styles.breakdownValue}>{selectedLeadBreakdown.phone}pts</Text>
                </View>
                <View style={styles.breakdownItem}>
                  <Text style={styles.breakdownLabel}>Entreprise</Text>
                  <Text style={styles.breakdownValue}>{selectedLeadBreakdown.company}pts</Text>
                </View>
                <View style={styles.breakdownItem}>
                  <Text style={styles.breakdownLabel}>LinkedIn</Text>
                  <Text style={styles.breakdownValue}>{selectedLeadBreakdown.linkedin}pts</Text>
                </View>
                <View style={styles.breakdownItem}>
                  <Text style={styles.breakdownLabel}>Type</Text>
                  <Text style={styles.breakdownValue}>{selectedLeadBreakdown.type}pts</Text>
                </View>
                <View style={styles.breakdownItem}>
                  <Text style={styles.breakdownLabel}>Source</Text>
                  <Text style={styles.breakdownValue}>{selectedLeadBreakdown.source}pts</Text>
                </View>
                <View style={styles.breakdownItem}>
                  <Text style={styles.breakdownLabel}>Activités</Text>
                  <Text style={styles.breakdownValue}>{selectedLeadBreakdown.activities}pts</Text>
                </View>
                <View style={styles.breakdownItem}>
                  <Text style={styles.breakdownLabel}>Deals</Text>
                  <Text style={styles.breakdownValue}>{selectedLeadBreakdown.deals}pts</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Create Lead Modal */}
      <Modal
        visible={newLeadModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={handleResetForm}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nouveau Lead</Text>
              <TouchableOpacity onPress={handleResetForm}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Nom du lead *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Jean Dupont"
                  value={newLeadForm.name}
                  onChangeText={(text) => setNewLeadForm({ ...newLeadForm, name: text })}
                  placeholderTextColor="#C7C7CC"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Entreprise *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Acme Corporation"
                  value={newLeadForm.company}
                  onChangeText={(text) => setNewLeadForm({ ...newLeadForm, company: text })}
                  placeholderTextColor="#C7C7CC"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="contact@example.com"
                  value={newLeadForm.email}
                  onChangeText={(text) => setNewLeadForm({ ...newLeadForm, email: text })}
                  keyboardType="email-address"
                  placeholderTextColor="#C7C7CC"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Téléphone</Text>
                <TextInput
                  style={styles.input}
                  placeholder="+33 6 12 34 56 78"
                  value={newLeadForm.phone}
                  onChangeText={(text) => setNewLeadForm({ ...newLeadForm, phone: text })}
                  keyboardType="phone-pad"
                  placeholderTextColor="#C7C7CC"
                />
              </View>

              <Text style={styles.formNote}>
                Les champs avec * sont obligatoires. Le score sera calculé automatiquement.
              </Text>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={handleResetForm}
              >
                <Text style={styles.buttonSecondaryText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.buttonPrimary]}
                onPress={handleCreateLead}
              >
                <Text style={styles.buttonPrimaryText}>Créer Lead</Text>
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
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#8E8E93',
  },
  summaryCards: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  summaryLabel: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '500',
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
  },
  filterSection: {
    marginTop: 16,
    paddingLeft: 16,
  },
  filterScroll: {
    marginRight: 16,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  sortSection: {
    marginTop: 12,
    paddingHorizontal: 16,
  },
  sortLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 8,
  },
  sortButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  sortButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  sortText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#8E8E93',
  },
  sortTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  leadCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  leadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  scoreCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  scoreText: {
    fontSize: 20,
    fontWeight: '700',
  },
  leadTitleSection: {
    flex: 1,
  },
  leadName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 2,
  },
  leadCompany: {
    fontSize: 12,
    color: '#8E8E93',
  },
  statusBadge: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 20,
  },
  leadMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '500',
  },
  scoreBar: {
    height: 4,
    backgroundColor: '#F2F2F7',
    borderRadius: 2,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    marginTop: 24,
    marginHorizontal: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
  },
  closeButton: {
    fontSize: 24,
    color: '#8E8E93',
  },
  detailsInfo: {
    marginBottom: 20,
  },
  detailsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 8,
    marginBottom: 4,
  },
  detailsValue: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '500',
  },
  scoreBreakdownSection: {
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
    paddingTop: 16,
  },
  scoreBreakdownGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  breakdownItem: {
    width: (width - 64) / 2,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  breakdownLabel: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '500',
    marginBottom: 4,
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#007AFF',
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
  modalBody: {
    maxHeight: 400,
    marginBottom: 16,
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
  formNote: {
    fontSize: 11,
    color: '#8E8E93',
    fontStyle: 'italic',
    marginTop: 16,
    marginBottom: 8,
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
