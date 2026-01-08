import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Platform,
  Alert,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import {
  UsersIcon,
  MailIcon,
  PhoneIcon,
  PlusIcon,
  ChevronRightIcon,
  EditIcon,
  TrashIcon,
  StarIcon,
  FilterIcon,
  TrendingUpIcon,
  ClockIcon,
} from '../components/Icons';
import { leadsService, contactService, dealsService } from '../services/api';
import GlassLayout from '../components/GlassLayout';
import { useAuth } from '../context/AuthContext';
import { glassTheme, withShadow } from '../theme/glassTheme';
import {
  GlassSearchBar,
  GlassModal,
  GlassButton,
  GlassInput,
  GlassEmptyState,
  GlassLoadingState,
  GlassAvatar,
  GlassBadge,
  GlassTabBar,
  GlassProgressBar,
} from '../components/ui';

type LeadsScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Leads'>;
};

interface Lead {
  id: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  email?: string;
  phone?: string;
  company?: string;
  title?: string;
  source?: string;
  status: 'new' | 'contacted' | 'qualified' | 'unqualified';
  score?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

const { width } = Dimensions.get('window');

const statusConfig = {
  new: { label: 'Nouveau', color: '#007AFF', bgColor: 'rgba(0, 122, 255, 0.1)' },
  contacted: { label: 'Contacte', color: '#FF9500', bgColor: 'rgba(255, 149, 0, 0.1)' },
  qualified: { label: 'Qualifie', color: '#34C759', bgColor: 'rgba(52, 199, 89, 0.1)' },
  unqualified: { label: 'Non qualifie', color: '#FF3B30', bgColor: 'rgba(255, 59, 48, 0.1)' },
};

const sourceConfig: { [key: string]: { label: string; color: string } } = {
  website: { label: 'Site web', color: '#007AFF' },
  referral: { label: 'Referral', color: '#34C759' },
  social: { label: 'Reseaux sociaux', color: '#5856D6' },
  ads: { label: 'Publicite', color: '#FF9500' },
  email: { label: 'Email', color: '#FF2D55' },
  other: { label: 'Autre', color: '#8E8E93' },
};

export default function LeadsScreen({ navigation }: LeadsScreenProps) {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [leadModalVisible, setLeadModalVisible] = useState(false);
  const [newLeadModalVisible, setNewLeadModalVisible] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [leadForm, setLeadForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    company: '',
    title: '',
    source: 'website',
    notes: '',
  });

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    fetchLeads();
  }, []);

  useEffect(() => {
    if (!loading) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [loading]);

  useEffect(() => {
    filterLeads();
  }, [searchQuery, selectedStatus, leads]);

  const fetchLeads = async () => {
    try {
      // Try the leads service first
      const response = await leadsService.getAll();
      const leadsData = response.data.data || response.data || [];

      // Transform API data
      const transformedLeads: Lead[] = leadsData.map((lead: any) => ({
        id: lead.id,
        first_name: lead.first_name,
        last_name: lead.last_name,
        full_name: lead.full_name || `${lead.first_name || ''} ${lead.last_name || ''}`.trim(),
        email: lead.email,
        phone: lead.phone,
        company: lead.company_name || lead.company,
        title: lead.title || lead.job_title,
        source: lead.source || 'other',
        status: lead.status || 'new',
        score: lead.score || calculateScore(lead),
        notes: lead.notes || lead.description,
        created_at: lead.created_at,
        updated_at: lead.updated_at,
      }));

      setLeads(transformedLeads);
    } catch (error) {
      console.error('Error fetching leads:', error);
      // Fallback: try fetching contacts with type 'lead'
      try {
        const contactsResponse = await contactService.getAll({ type: 'lead' });
        const contacts = contactsResponse.data.data || contactsResponse.data || [];

        const transformedLeads: Lead[] = contacts.map((contact: any) => ({
          id: contact.id,
          first_name: contact.first_name,
          last_name: contact.last_name,
          full_name: contact.full_name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim(),
          email: contact.email,
          phone: contact.phone,
          company: contact.company_name,
          title: contact.title,
          source: contact.source || 'other',
          status: contact.type === 'lead' ? 'new' : 'contacted',
          score: contact.score || calculateScore(contact),
          notes: contact.notes,
          created_at: contact.created_at,
          updated_at: contact.updated_at,
        }));

        setLeads(transformedLeads);
      } catch (contactError) {
        console.error('Error fetching contacts as leads:', contactError);
        // Fallback to mock data
        setLeads([
          { id: '1', first_name: 'Jean', last_name: 'Dupont', email: 'jean@example.com', phone: '+33612345678', company: 'TechCorp', title: 'CEO', source: 'website', status: 'new', score: 85, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          { id: '2', first_name: 'Marie', last_name: 'Martin', email: 'marie@example.com', phone: '+33687654321', company: 'StartupXYZ', title: 'CTO', source: 'referral', status: 'contacted', score: 72, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          { id: '3', first_name: 'Pierre', last_name: 'Leroy', email: 'pierre@example.com', company: 'Enterprise Ltd', source: 'social', status: 'qualified', score: 92, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        ]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const calculateScore = (lead: any): number => {
    let score = 30; // Base score
    if (lead.email) score += 15;
    if (lead.phone) score += 15;
    if (lead.company || lead.company_name) score += 10;
    if (lead.title) score += 10;
    if (lead.linkedin_url) score += 10;
    if (lead.source === 'referral') score += 10;
    return Math.min(100, score);
  };

  const filterLeads = () => {
    let filtered = leads;

    if (searchQuery) {
      filtered = filtered.filter(
        (l) =>
          l.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          l.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          l.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          l.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          l.company?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedStatus !== 'all') {
      filtered = filtered.filter((l) => l.status === selectedStatus);
    }

    setFilteredLeads(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchLeads();
  };

  const getLeadFullName = (lead: Lead) => {
    return lead.full_name || `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || 'Sans nom';
  };

  const getLeadScore = (lead: Lead) => lead.score || 0;

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#34C759';
    if (score >= 50) return '#FF9500';
    return '#FF3B30';
  };

  const openLeadDetails = (lead: Lead) => {
    setSelectedLead(lead);
    setLeadModalVisible(true);
  };

  const handleCreateLead = async () => {
    if (!leadForm.first_name.trim()) {
      Platform.OS === 'web' ? alert('Le prenom est obligatoire') : Alert.alert('Erreur', 'Le prenom est obligatoire');
      return;
    }

    try {
      if (editingLead) {
        await leadsService.update(editingLead.id, leadForm);
      } else {
        await leadsService.create({ ...leadForm, status: 'new' });
      }
      setNewLeadModalVisible(false);
      resetLeadForm();
      fetchLeads();
    } catch (error) {
      console.error('Error saving lead:', error);
      // Local fallback
      if (!editingLead) {
        const newLead: Lead = {
          id: `l${Date.now()}`,
          ...leadForm,
          status: 'new',
          score: calculateScore(leadForm),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setLeads([...leads, newLead]);
      }
      setNewLeadModalVisible(false);
      resetLeadForm();
    }
  };

  const handleEditLead = (lead: Lead) => {
    setEditingLead(lead);
    setLeadForm({
      first_name: lead.first_name || '',
      last_name: lead.last_name || '',
      email: lead.email || '',
      phone: lead.phone || '',
      company: lead.company || '',
      title: lead.title || '',
      source: lead.source || 'website',
      notes: lead.notes || '',
    });
    setLeadModalVisible(false);
    setNewLeadModalVisible(true);
  };

  const handleDeleteLead = async (lead: Lead) => {
    const confirmDelete = async () => {
      try {
        await leadsService.delete(lead.id);
      } catch (error) {
        console.error('Error deleting lead:', error);
      }
      setLeads(leads.filter((l) => l.id !== lead.id));
      setLeadModalVisible(false);
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Etes-vous sur de vouloir supprimer ce lead ?')) confirmDelete();
    } else {
      Alert.alert('Confirmer', 'Etes-vous sur de vouloir supprimer ce lead ?', [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', onPress: confirmDelete, style: 'destructive' },
      ]);
    }
  };

  const handleChangeStatus = async (lead: Lead, newStatus: Lead['status']) => {
    try {
      await leadsService.update(lead.id, { status: newStatus });
    } catch (error) {
      console.error('Error updating lead status:', error);
    }
    setLeads(leads.map((l) => (l.id === lead.id ? { ...l, status: newStatus } : l)));
    setLeadModalVisible(false);
  };

  const handleConvertToContact = async (lead: Lead) => {
    try {
      await leadsService.convert(lead.id);
      const msg = 'Lead converti en contact avec succes';
      Platform.OS === 'web' ? alert(msg) : Alert.alert('Succes', msg);
      fetchLeads();
    } catch (error) {
      console.error('Error converting lead:', error);
      const msg = 'Impossible de convertir le lead';
      Platform.OS === 'web' ? alert(msg) : Alert.alert('Erreur', msg);
    }
    setLeadModalVisible(false);
  };

  const resetLeadForm = () => {
    setLeadForm({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      company: '',
      title: '',
      source: 'website',
      notes: '',
    });
    setEditingLead(null);
  };

  const stats = {
    total: leads.length,
    new: leads.filter((l) => l.status === 'new').length,
    contacted: leads.filter((l) => l.status === 'contacted').length,
    qualified: leads.filter((l) => l.status === 'qualified').length,
    avgScore: leads.length > 0 ? Math.round(leads.reduce((sum, l) => sum + (l.score || 0), 0) / leads.length) : 0,
  };

  if (loading) {
    return (
      <GlassLayout>
        <View style={styles.loadingContainer}>
          <GlassLoadingState
            type="spinner"
            message="Chargement des leads..."
            size="large"
          />
        </View>
      </GlassLayout>
    );
  }

  return (
    <GlassLayout>
      <Animated.View
        style={[
          styles.container,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.headerTitle}>Leads</Text>
              <Text style={styles.headerSubtitle}>{stats.total} leads au total</Text>
            </View>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setNewLeadModalVisible(true)}
            >
              <LinearGradient
                colors={['#007AFF', '#5AC8FA']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.addButtonGradient}
              >
                <PlusIcon size={20} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Stats Overview */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.statsScroll}
            contentContainerStyle={styles.statsContainer}
          >
            <View style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: 'rgba(0, 122, 255, 0.1)' }]}>
                <UsersIcon size={18} color="#007AFF" />
              </View>
              <View style={styles.statContent}>
                <Text style={styles.statValue}>{stats.new}</Text>
                <Text style={styles.statLabel}>Nouveaux</Text>
              </View>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: 'rgba(255, 149, 0, 0.1)' }]}>
                <PhoneIcon size={18} color="#FF9500" />
              </View>
              <View style={styles.statContent}>
                <Text style={styles.statValue}>{stats.contacted}</Text>
                <Text style={styles.statLabel}>Contactes</Text>
              </View>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: 'rgba(52, 199, 89, 0.1)' }]}>
                <StarIcon size={18} color="#34C759" />
              </View>
              <View style={styles.statContent}>
                <Text style={styles.statValue}>{stats.qualified}</Text>
                <Text style={styles.statLabel}>Qualifies</Text>
              </View>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: 'rgba(88, 86, 214, 0.1)' }]}>
                <TrendingUpIcon size={18} color="#5856D6" />
              </View>
              <View style={styles.statContent}>
                <Text style={styles.statValue}>{stats.avgScore}%</Text>
                <Text style={styles.statLabel}>Score moyen</Text>
              </View>
            </View>
          </ScrollView>

          {/* Filter Tabs */}
          <GlassTabBar
            tabs={[
              { key: 'all', label: `Tous (${leads.length})` },
              { key: 'new', label: `Nouveaux (${stats.new})` },
              { key: 'contacted', label: `Contactes (${stats.contacted})` },
              { key: 'qualified', label: `Qualifies (${stats.qualified})` },
            ]}
            activeTab={selectedStatus}
            onTabChange={(key) => setSelectedStatus(key)}
            variant="pills"
            scrollable
          />

          {/* Search Bar */}
          <View style={styles.searchWrapper}>
            <GlassSearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Rechercher un lead..."
            />
          </View>
        </View>

        {/* Leads List */}
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#007AFF" />}
          showsVerticalScrollIndicator={false}
        >
          {filteredLeads.length > 0 ? (
            filteredLeads.map((lead, index) => (
              <Animated.View
                key={lead.id}
                style={[
                  styles.cardWrapper,
                  {
                    opacity: fadeAnim,
                    transform: [{
                      translateY: fadeAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [20 * (index % 5), 0],
                      }),
                    }],
                  },
                ]}
              >
                <TouchableOpacity
                  style={styles.card}
                  onPress={() => openLeadDetails(lead)}
                  activeOpacity={0.7}
                >
                  <View style={styles.cardContent}>
                    <GlassAvatar
                      name={getLeadFullName(lead)}
                      size="md"
                      gradient={[getScoreColor(getLeadScore(lead)), getScoreColor(getLeadScore(lead))]}
                    />
                    <View style={styles.cardInfo}>
                      <View style={styles.cardNameRow}>
                        <Text style={styles.cardName}>{getLeadFullName(lead)}</Text>
                        <GlassBadge
                          label={statusConfig[lead.status].label}
                          variant={lead.status === 'qualified' ? 'success' : lead.status === 'contacted' ? 'warning' : 'info'}
                          size="sm"
                        />
                      </View>
                      {lead.company && (
                        <Text style={styles.cardCompany}>{lead.company}</Text>
                      )}
                      {lead.email && (
                        <Text style={styles.cardEmail} numberOfLines={1}>{lead.email}</Text>
                      )}

                      {/* Score Bar */}
                      <View style={styles.scoreContainer}>
                        <View style={styles.scoreHeader}>
                          <Text style={styles.scoreLabel}>Score</Text>
                          <Text style={[styles.scoreValue, { color: getScoreColor(getLeadScore(lead)) }]}>
                            {getLeadScore(lead)}%
                          </Text>
                        </View>
                        <View style={styles.scoreTrack}>
                          <View
                            style={[
                              styles.scoreFill,
                              {
                                width: `${getLeadScore(lead)}%`,
                                backgroundColor: getScoreColor(getLeadScore(lead)),
                              }
                            ]}
                          />
                        </View>
                      </View>
                    </View>
                    <View style={styles.cardActions}>
                      {lead.phone && (
                        <TouchableOpacity
                          style={styles.quickAction}
                          onPress={(e) => {
                            e.stopPropagation();
                            Platform.OS === 'web' && window.open(`tel:${lead.phone}`);
                          }}
                        >
                          <PhoneIcon size={16} color="#007AFF" />
                        </TouchableOpacity>
                      )}
                      {lead.email && (
                        <TouchableOpacity
                          style={styles.quickAction}
                          onPress={(e) => {
                            e.stopPropagation();
                            Platform.OS === 'web' && window.open(`mailto:${lead.email}`);
                          }}
                        >
                          <MailIcon size={16} color="#007AFF" />
                        </TouchableOpacity>
                      )}
                      <ChevronRightIcon size={20} color="#C7C7CC" />
                    </View>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            ))
          ) : (
            <GlassEmptyState
              icon={<UsersIcon size={48} color="#C7C7CC" />}
              title="Aucun lead trouve"
              description={searchQuery || selectedStatus !== 'all' ? "Essayez de modifier vos filtres" : "Ajoutez votre premier lead pour commencer"}
              actionLabel="Nouveau lead"
              onAction={() => setNewLeadModalVisible(true)}
            />
          )}
        </ScrollView>

        {/* Lead Details Modal */}
        <GlassModal
          visible={leadModalVisible}
          onClose={() => setLeadModalVisible(false)}
          title={selectedLead ? getLeadFullName(selectedLead) : ''}
          size="large"
        >
          {selectedLead && (
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Lead Header */}
              <View style={styles.modalLeadHeader}>
                <GlassAvatar
                  name={getLeadFullName(selectedLead)}
                  size="xl"
                  gradient={[getScoreColor(getLeadScore(selectedLead)), getScoreColor(getLeadScore(selectedLead))]}
                />
                <View style={styles.modalLeadInfo}>
                  <Text style={styles.modalLeadName}>{getLeadFullName(selectedLead)}</Text>
                  {selectedLead.title && <Text style={styles.modalLeadTitle}>{selectedLead.title}</Text>}
                  {selectedLead.company && <Text style={styles.modalLeadCompany}>{selectedLead.company}</Text>}
                  <View style={styles.modalBadges}>
                    <GlassBadge
                      label={statusConfig[selectedLead.status].label}
                      variant={selectedLead.status === 'qualified' ? 'success' : selectedLead.status === 'contacted' ? 'warning' : 'info'}
                    />
                    {selectedLead.source && (
                      <GlassBadge
                        label={sourceConfig[selectedLead.source]?.label || selectedLead.source}
                        variant="default"
                      />
                    )}
                  </View>
                </View>
              </View>

              {/* Score Section */}
              <View style={styles.modalSection}>
                <Text style={styles.sectionTitle}>SCORE DE QUALIFICATION</Text>
                <View style={styles.scoreCard}>
                  <View style={styles.scoreBigValue}>
                    <Text style={[styles.scoreBigNumber, { color: getScoreColor(getLeadScore(selectedLead)) }]}>
                      {getLeadScore(selectedLead)}
                    </Text>
                    <Text style={styles.scoreBigSuffix}>/ 100</Text>
                  </View>
                  <GlassProgressBar
                    value={getLeadScore(selectedLead)}
                    maxValue={100}
                    gradient={[getScoreColor(getLeadScore(selectedLead)), getScoreColor(getLeadScore(selectedLead))]}
                    height={10}
                    showValue={false}
                  />
                  <Text style={styles.scoreDescription}>
                    {getLeadScore(selectedLead) >= 80 ? 'Lead tres qualifie - A contacter en priorite' :
                      getLeadScore(selectedLead) >= 50 ? 'Lead interessant - Necessite plus d\'informations' :
                        'Lead a qualifier - Score faible'}
                  </Text>
                </View>
              </View>

              {/* Contact Info */}
              <View style={styles.modalSection}>
                <Text style={styles.sectionTitle}>INFORMATIONS</Text>
                <View style={styles.infoGrid}>
                  {selectedLead.email && (
                    <TouchableOpacity
                      style={styles.infoCard}
                      onPress={() => Platform.OS === 'web' && window.open(`mailto:${selectedLead.email}`)}
                    >
                      <View style={[styles.infoIconContainer, { backgroundColor: 'rgba(0, 122, 255, 0.1)' }]}>
                        <MailIcon size={18} color="#007AFF" />
                      </View>
                      <View style={styles.infoCardContent}>
                        <Text style={styles.infoLabel}>Email</Text>
                        <Text style={styles.infoValue}>{selectedLead.email}</Text>
                      </View>
                    </TouchableOpacity>
                  )}
                  {selectedLead.phone && (
                    <TouchableOpacity
                      style={styles.infoCard}
                      onPress={() => Platform.OS === 'web' && window.open(`tel:${selectedLead.phone}`)}
                    >
                      <View style={[styles.infoIconContainer, { backgroundColor: 'rgba(52, 199, 89, 0.1)' }]}>
                        <PhoneIcon size={18} color="#34C759" />
                      </View>
                      <View style={styles.infoCardContent}>
                        <Text style={styles.infoLabel}>Telephone</Text>
                        <Text style={styles.infoValue}>{selectedLead.phone}</Text>
                      </View>
                    </TouchableOpacity>
                  )}
                  <View style={styles.infoCard}>
                    <View style={[styles.infoIconContainer, { backgroundColor: 'rgba(255, 149, 0, 0.1)' }]}>
                      <ClockIcon size={18} color="#FF9500" />
                    </View>
                    <View style={styles.infoCardContent}>
                      <Text style={styles.infoLabel}>Cree le</Text>
                      <Text style={styles.infoValue}>
                        {new Date(selectedLead.created_at).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Change Status */}
              <View style={styles.modalSection}>
                <Text style={styles.sectionTitle}>CHANGER LE STATUT</Text>
                <View style={styles.statusButtons}>
                  {(['new', 'contacted', 'qualified', 'unqualified'] as const).map((status) => (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.statusButton,
                        {
                          borderColor: statusConfig[status].color,
                          backgroundColor: selectedLead.status === status ? statusConfig[status].bgColor : 'transparent',
                        }
                      ]}
                      onPress={() => handleChangeStatus(selectedLead, status)}
                    >
                      <View style={[styles.statusDot, { backgroundColor: statusConfig[status].color }]} />
                      <Text style={[
                        styles.statusButtonText,
                        { color: selectedLead.status === status ? statusConfig[status].color : glassTheme.colors.text.secondary }
                      ]}>
                        {statusConfig[status].label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Notes */}
              {selectedLead.notes && (
                <View style={styles.modalSection}>
                  <Text style={styles.sectionTitle}>NOTES</Text>
                  <View style={styles.notesCard}>
                    <Text style={styles.notesText}>{selectedLead.notes}</Text>
                  </View>
                </View>
              )}

              {/* Actions */}
              <View style={styles.modalActions}>
                <GlassButton
                  title="Convertir en Contact"
                  onPress={() => handleConvertToContact(selectedLead)}
                  variant="primary"
                  icon={<UsersIcon size={16} color="#FFFFFF" />}
                  fullWidth
                />
              </View>
              <View style={styles.modalActionsSecondary}>
                <GlassButton
                  title="Modifier"
                  onPress={() => handleEditLead(selectedLead)}
                  variant="outline"
                  icon={<EditIcon size={16} color="#007AFF" />}
                  style={{ flex: 1 }}
                />
                <GlassButton
                  title="Supprimer"
                  onPress={() => handleDeleteLead(selectedLead)}
                  variant="danger"
                  icon={<TrashIcon size={16} color="#FF3B30" />}
                  style={{ flex: 1 }}
                />
              </View>
            </ScrollView>
          )}
        </GlassModal>

        {/* New/Edit Lead Modal */}
        <GlassModal
          visible={newLeadModalVisible}
          onClose={() => { setNewLeadModalVisible(false); resetLeadForm(); }}
          title={editingLead ? 'Modifier le lead' : 'Nouveau lead'}
          size="large"
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            <GlassInput
              label="Prenom *"
              placeholder="Prenom"
              value={leadForm.first_name}
              onChangeText={(text) => setLeadForm({ ...leadForm, first_name: text })}
            />
            <GlassInput
              label="Nom"
              placeholder="Nom de famille"
              value={leadForm.last_name}
              onChangeText={(text) => setLeadForm({ ...leadForm, last_name: text })}
            />
            <GlassInput
              label="Email"
              placeholder="email@example.com"
              value={leadForm.email}
              onChangeText={(text) => setLeadForm({ ...leadForm, email: text })}
              keyboardType="email-address"
            />
            <GlassInput
              label="Telephone"
              placeholder="+33 6 XX XX XX XX"
              value={leadForm.phone}
              onChangeText={(text) => setLeadForm({ ...leadForm, phone: text })}
              keyboardType="phone-pad"
            />
            <GlassInput
              label="Entreprise"
              placeholder="Nom de l'entreprise"
              value={leadForm.company}
              onChangeText={(text) => setLeadForm({ ...leadForm, company: text })}
            />
            <GlassInput
              label="Titre/Poste"
              placeholder="Directeur Commercial"
              value={leadForm.title}
              onChangeText={(text) => setLeadForm({ ...leadForm, title: text })}
            />

            {/* Source Selection */}
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Source</Text>
              <View style={styles.sourceGrid}>
                {Object.entries(sourceConfig).map(([key, config]) => (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.sourceOption,
                      leadForm.source === key && { borderColor: config.color, backgroundColor: `${config.color}10` }
                    ]}
                    onPress={() => setLeadForm({ ...leadForm, source: key })}
                  >
                    <Text style={[
                      styles.sourceOptionText,
                      leadForm.source === key && { color: config.color, fontWeight: '600' }
                    ]}>
                      {config.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <GlassInput
              label="Notes"
              placeholder="Notes sur le lead..."
              value={leadForm.notes}
              onChangeText={(text) => setLeadForm({ ...leadForm, notes: text })}
              multiline
              numberOfLines={4}
            />
          </ScrollView>
          <View style={styles.modalFooter}>
            <GlassButton
              title="Annuler"
              onPress={() => { setNewLeadModalVisible(false); resetLeadForm(); }}
              variant="outline"
              style={{ flex: 1 }}
            />
            <GlassButton
              title={editingLead ? 'Modifier' : 'Creer'}
              onPress={handleCreateLead}
              variant="primary"
              style={{ flex: 1 }}
            />
          </View>
        </GlassModal>
      </Animated.View>
    </GlassLayout>
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
  },
  header: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingTop: glassTheme.spacing.md,
    paddingHorizontal: glassTheme.spacing.md,
    paddingBottom: glassTheme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.04)',
    ...(Platform.OS === 'web' ? {
      // @ts-ignore
      backdropFilter: 'blur(20px)',
    } : {}),
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: glassTheme.spacing.md,
  },
  headerTitle: {
    ...glassTheme.typography.displaySmall,
    color: glassTheme.colors.text.primary,
    marginBottom: 4,
  },
  headerSubtitle: {
    ...glassTheme.typography.body,
    color: glassTheme.colors.text.tertiary,
  },
  addButton: {
    borderRadius: glassTheme.radius.full,
    overflow: 'hidden',
    ...withShadow('md'),
  },
  addButtonGradient: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsScroll: {
    marginBottom: glassTheme.spacing.md,
    marginHorizontal: -glassTheme.spacing.md,
  },
  statsContainer: {
    paddingHorizontal: glassTheme.spacing.md,
    gap: glassTheme.spacing.sm,
    flexDirection: 'row',
  },
  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: glassTheme.radius.md,
    padding: glassTheme.spacing.sm,
    gap: glassTheme.spacing.sm,
    minWidth: 130,
    ...withShadow('sm'),
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: glassTheme.radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    ...glassTheme.typography.h2,
    color: glassTheme.colors.text.primary,
  },
  statLabel: {
    ...glassTheme.typography.caption,
    color: glassTheme.colors.text.tertiary,
  },
  searchWrapper: {
    marginTop: glassTheme.spacing.md,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: glassTheme.spacing.md,
    gap: glassTheme.spacing.sm,
  },
  cardWrapper: {
    marginBottom: glassTheme.spacing.sm,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: glassTheme.radius.lg,
    padding: glassTheme.spacing.md,
    ...withShadow('sm'),
    ...(Platform.OS === 'web' ? {
      // @ts-ignore
      backdropFilter: 'blur(10px)',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    } : {}),
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
    marginLeft: glassTheme.spacing.sm,
    gap: 2,
  },
  cardNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: glassTheme.spacing.sm,
  },
  cardName: {
    ...glassTheme.typography.h3,
    color: glassTheme.colors.text.primary,
    flex: 1,
  },
  cardCompany: {
    ...glassTheme.typography.bodySmall,
    color: glassTheme.colors.text.secondary,
  },
  cardEmail: {
    ...glassTheme.typography.caption,
    color: glassTheme.colors.text.tertiary,
  },
  scoreContainer: {
    marginTop: glassTheme.spacing.sm,
  },
  scoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  scoreLabel: {
    ...glassTheme.typography.caption,
    color: glassTheme.colors.text.tertiary,
  },
  scoreValue: {
    ...glassTheme.typography.caption,
    fontWeight: '700',
  },
  scoreTrack: {
    height: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  scoreFill: {
    height: '100%',
    borderRadius: 2,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: glassTheme.spacing.sm,
  },
  quickAction: {
    width: 36,
    height: 36,
    borderRadius: glassTheme.radius.full,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Modal styles
  modalLeadHeader: {
    alignItems: 'center',
    paddingVertical: glassTheme.spacing.lg,
    gap: glassTheme.spacing.md,
  },
  modalLeadInfo: {
    alignItems: 'center',
    gap: 4,
  },
  modalLeadName: {
    ...glassTheme.typography.h1,
    color: glassTheme.colors.text.primary,
    textAlign: 'center',
  },
  modalLeadTitle: {
    ...glassTheme.typography.body,
    color: glassTheme.colors.text.secondary,
  },
  modalLeadCompany: {
    ...glassTheme.typography.bodySmall,
    color: glassTheme.colors.text.tertiary,
  },
  modalBadges: {
    flexDirection: 'row',
    gap: glassTheme.spacing.sm,
    marginTop: glassTheme.spacing.sm,
  },
  modalSection: {
    marginBottom: glassTheme.spacing.lg,
  },
  sectionTitle: {
    ...glassTheme.typography.label,
    color: glassTheme.colors.text.tertiary,
    marginBottom: glassTheme.spacing.sm,
  },
  scoreCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderRadius: glassTheme.radius.lg,
    padding: glassTheme.spacing.lg,
    alignItems: 'center',
    gap: glassTheme.spacing.md,
  },
  scoreBigValue: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  scoreBigNumber: {
    ...glassTheme.typography.displayLarge,
  },
  scoreBigSuffix: {
    ...glassTheme.typography.h2,
    color: glassTheme.colors.text.tertiary,
    marginLeft: 4,
  },
  scoreDescription: {
    ...glassTheme.typography.bodySmall,
    color: glassTheme.colors.text.secondary,
    textAlign: 'center',
  },
  infoGrid: {
    gap: glassTheme.spacing.sm,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderRadius: glassTheme.radius.md,
    padding: glassTheme.spacing.sm,
    gap: glassTheme.spacing.sm,
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: glassTheme.radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoCardContent: {
    flex: 1,
  },
  infoLabel: {
    ...glassTheme.typography.caption,
    color: glassTheme.colors.text.tertiary,
  },
  infoValue: {
    ...glassTheme.typography.body,
    color: glassTheme.colors.text.primary,
    fontWeight: '500',
  },
  statusButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: glassTheme.spacing.sm,
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: glassTheme.spacing.md,
    paddingVertical: glassTheme.spacing.sm,
    borderRadius: glassTheme.radius.full,
    borderWidth: 1.5,
    backgroundColor: 'transparent',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusButtonText: {
    ...glassTheme.typography.bodySmall,
    fontWeight: '600',
  },
  notesCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderRadius: glassTheme.radius.md,
    padding: glassTheme.spacing.md,
  },
  notesText: {
    ...glassTheme.typography.body,
    color: glassTheme.colors.text.secondary,
  },
  modalActions: {
    marginTop: glassTheme.spacing.lg,
  },
  modalActionsSecondary: {
    flexDirection: 'row',
    gap: glassTheme.spacing.sm,
    marginTop: glassTheme.spacing.sm,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: glassTheme.spacing.sm,
    marginTop: glassTheme.spacing.lg,
    paddingTop: glassTheme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.06)',
  },
  formSection: {
    marginBottom: glassTheme.spacing.md,
  },
  formLabel: {
    ...glassTheme.typography.bodySmall,
    fontWeight: '600',
    color: glassTheme.colors.text.secondary,
    marginBottom: glassTheme.spacing.sm,
  },
  sourceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: glassTheme.spacing.sm,
  },
  sourceOption: {
    paddingHorizontal: glassTheme.spacing.md,
    paddingVertical: glassTheme.spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderRadius: glassTheme.radius.full,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  sourceOptionText: {
    ...glassTheme.typography.bodySmall,
    color: glassTheme.colors.text.secondary,
  },
});
