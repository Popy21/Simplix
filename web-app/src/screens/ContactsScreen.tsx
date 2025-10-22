import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  RefreshControl,
  Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { customerService } from '../services/api';
import {
  UsersIcon,
  CalendarIcon,
  ActivityIcon,
  FileTextIcon,
  DollarIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
} from '../components/Icons';

type ContactsScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Contacts'>;
};

interface Contact {
  id: number;
  name: string;
  email: string;
  phone: string;
  company: string;
  position: string;
  status: 'lead' | 'prospect' | 'client' | 'inactive';
  lastContact: string;
  totalRevenue: number;
  notes: string;
}

interface Interaction {
  id: string;
  type: 'call' | 'email' | 'meeting' | 'note';
  date: string;
  subject: string;
  details: string;
}

export default function ContactsScreen({ navigation }: ContactsScreenProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'lead' | 'prospect' | 'client' | 'inactive'>('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [interactions, setInteractions] = useState<Interaction[]>([
    {
      id: '1',
      type: 'call',
      date: '2025-10-20',
      subject: 'Appel de prospection',
      details: 'Discussion sur les besoins de l\'entreprise',
    },
    {
      id: '2',
      type: 'email',
      date: '2025-10-18',
      subject: 'Envoi de proposition',
      details: 'Proposition commerciale envoyée par email',
    },
    {
      id: '3',
      type: 'meeting',
      date: '2025-10-15',
      subject: 'Rendez-vous de qualification',
      details: 'Réunion au siège pour présenter nos solutions',
    },
  ]);

  const statusConfig = {
    lead: { label: 'Lead', color: '#8E8E93', bgColor: '#8E8E9320' },
    prospect: { label: 'Prospect', color: '#007AFF', bgColor: '#007AFF20' },
    client: { label: 'Client', color: '#34C759', bgColor: '#34C75920' },
    inactive: { label: 'Inactif', color: '#FF3B30', bgColor: '#FF3B3020' },
  };

  const interactionConfig = {
    call: { label: 'Appel', icon: '📞', color: '#007AFF' },
    email: { label: 'Email', icon: '📧', color: '#FF9500' },
    meeting: { label: 'Réunion', icon: '🤝', color: '#34C759' },
    note: { label: 'Note', icon: '📝', color: '#8E8E93' },
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  useEffect(() => {
    filterContacts();
  }, [searchQuery, selectedFilter, contacts]);

  const fetchContacts = async () => {
    try {
      const response = await customerService.getAll();
      const contactsData = response.data.map((customer: any) => ({
        id: customer.id,
        name: customer.name,
        email: customer.email || '',
        phone: customer.phone || '',
        company: customer.company || '',
        position: customer.position || 'N/A',
        status: determineStatus(customer),
        lastContact: customer.created_at || new Date().toISOString(),
        totalRevenue: 0,
        notes: customer.notes || '',
      }));
      setContacts(contactsData);
    } catch (error) {
      console.error('Erreur chargement contacts:', error);
      Alert.alert('Erreur', 'Impossible de charger les contacts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const determineStatus = (customer: any): 'lead' | 'prospect' | 'client' | 'inactive' => {
    // Simple logic pour déterminer le statut
    if (customer.email && customer.phone) return 'client';
    if (customer.phone) return 'prospect';
    if (customer.email) return 'lead';
    return 'inactive';
  };

  const filterContacts = () => {
    let filtered = contacts;

    if (selectedFilter !== 'all') {
      filtered = filtered.filter((c) => c.status === selectedFilter);
    }

    if (searchQuery) {
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.company.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredContacts(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchContacts();
  };

  const openContactDetails = (contact: Contact) => {
    setSelectedContact(contact);
    setModalVisible(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const stats = {
    total: contacts.length,
    lead: contacts.filter((c) => c.status === 'lead').length,
    prospect: contacts.filter((c) => c.status === 'prospect').length,
    client: contacts.filter((c) => c.status === 'client').length,
    inactive: contacts.filter((c) => c.status === 'inactive').length,
  };

  const renderContact = (contact: Contact) => {
    const statusStyle = statusConfig[contact.status];
    
    return (
      <TouchableOpacity
        key={contact.id}
        style={styles.contactCard}
        onPress={() => openContactDetails(contact)}
        activeOpacity={0.7}
      >
        <View style={styles.contactHeader}>
          <View style={styles.contactAvatar}>
            <Text style={styles.contactInitial}>
              {contact.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.contactInfo}>
            <Text style={styles.contactName}>{contact.name}</Text>
            {contact.company && (
              <Text style={styles.contactCompany}>{contact.company}</Text>
            )}
            <View style={styles.contactMeta}>
              {contact.email && (
                <Text style={styles.contactMetaText} numberOfLines={1}>
                  {contact.email}
                </Text>
              )}
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bgColor }]}>
            <Text style={[styles.statusText, { color: statusStyle.color }]}>
              {statusStyle.label}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIcon size={48} color="#007AFF" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* En-tête */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Contacts</Text>
          <Text style={styles.headerSubtitle}>
            {stats.total} contacts • {stats.client} clients actifs
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => Alert.alert('À venir', 'Ajout de contact en développement')}
        >
          <Text style={styles.addButtonText}>+ Nouveau</Text>
        </TouchableOpacity>
      </View>

      {/* Statistiques */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.lead}</Text>
          <Text style={styles.statLabel}>Leads</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#007AFF' }]}>{stats.prospect}</Text>
          <Text style={styles.statLabel}>Prospects</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#34C759' }]}>{stats.client}</Text>
          <Text style={styles.statLabel}>Clients</Text>
        </View>
      </View>

      {/* Recherche */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un contact..."
          placeholderTextColor="#8E8E93"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Filtres */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[styles.filterChip, selectedFilter === 'all' && styles.filterChipActive]}
            onPress={() => setSelectedFilter('all')}
          >
            <Text style={[styles.filterText, selectedFilter === 'all' && styles.filterTextActive]}>
              Tous ({stats.total})
            </Text>
          </TouchableOpacity>

          {(Object.keys(statusConfig) as Array<keyof typeof statusConfig>).map((status) => (
            <TouchableOpacity
              key={status}
              style={[styles.filterChip, selectedFilter === status && styles.filterChipActive]}
              onPress={() => setSelectedFilter(status)}
            >
              <Text style={[styles.filterText, selectedFilter === status && styles.filterTextActive]}>
                {statusConfig[status].label} ({stats[status]})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Liste des contacts */}
      <ScrollView
        style={styles.contactsList}
        contentContainerStyle={styles.contactsListContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {filteredContacts.length > 0 ? (
          filteredContacts.map((contact) => renderContact(contact))
        ) : (
          <View style={styles.emptyState}>
            <UsersIcon size={64} color="#D1D1D6" />
            <Text style={styles.emptyText}>Aucun contact trouvé</Text>
          </View>
        )}
      </ScrollView>

      {/* Modal Détails Contact */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedContact && (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.modalContactHeader}>
                    <View style={styles.modalContactAvatar}>
                      <Text style={styles.modalContactInitial}>
                        {selectedContact.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.modalTitle}>{selectedContact.name}</Text>
                      {selectedContact.company && (
                        <Text style={styles.modalSubtitle}>{selectedContact.company}</Text>
                      )}
                      <View
                        style={[
                          styles.modalStatusBadge,
                          { backgroundColor: statusConfig[selectedContact.status].bgColor },
                        ]}
                      >
                        <Text
                          style={[
                            styles.modalStatusText,
                            { color: statusConfig[selectedContact.status].color },
                          ]}
                        >
                          {statusConfig[selectedContact.status].label}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => setModalVisible(false)}>
                    <Text style={styles.closeButton}>✕</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalBody}>
                  {/* Informations */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>INFORMATIONS</Text>
                    {selectedContact.email && (
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Email</Text>
                        <Text style={styles.infoValue}>{selectedContact.email}</Text>
                      </View>
                    )}
                    {selectedContact.phone && (
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Téléphone</Text>
                        <Text style={styles.infoValue}>{selectedContact.phone}</Text>
                      </View>
                    )}
                    {selectedContact.position && (
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Poste</Text>
                        <Text style={styles.infoValue}>{selectedContact.position}</Text>
                      </View>
                    )}
                  </View>

                  {/* Historique des interactions */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>HISTORIQUE</Text>
                    {interactions.map((interaction) => (
                      <View key={interaction.id} style={styles.interactionCard}>
                        <View style={styles.interactionHeader}>
                          <Text style={styles.interactionIcon}>
                            {interactionConfig[interaction.type].icon}
                          </Text>
                          <View style={styles.interactionInfo}>
                            <Text style={styles.interactionSubject}>{interaction.subject}</Text>
                            <Text style={styles.interactionDate}>
                              {new Date(interaction.date).toLocaleDateString('fr-FR', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                              })}
                            </Text>
                          </View>
                          <View
                            style={[
                              styles.interactionTypeBadge,
                              { backgroundColor: `${interactionConfig[interaction.type].color}20` },
                            ]}
                          >
                            <Text
                              style={[
                                styles.interactionTypeText,
                                { color: interactionConfig[interaction.type].color },
                              ]}
                            >
                              {interactionConfig[interaction.type].label}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.interactionDetails}>{interaction.details}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Notes */}
                  {selectedContact.notes && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>NOTES</Text>
                      <View style={styles.notesContainer}>
                        <Text style={styles.notesText}>{selectedContact.notes}</Text>
                      </View>
                    </View>
                  )}
                </ScrollView>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => Alert.alert('À venir', 'Ajout d\'interaction')}
                  >
                    <Text style={styles.actionButtonText}>+ Nouvelle Interaction</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 17,
    color: '#8E8E93',
    fontWeight: '500',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.6,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#8E8E93',
    letterSpacing: -0.2,
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#8E8E93',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#000000',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  filtersContainer: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  filterChipActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterText: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  contactsList: {
    flex: 1,
  },
  contactsListContent: {
    padding: 20,
    gap: 12,
  },
  contactCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contactInitial: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  contactCompany: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
  },
  contactMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactMetaText: {
    fontSize: 13,
    color: '#8E8E93',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 17,
    color: '#8E8E93',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  modalContactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modalContactAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modalContactInitial: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 2,
  },
  modalSubtitle: {
    fontSize: 15,
    color: '#8E8E93',
    marginBottom: 6,
  },
  modalStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  modalStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  closeButton: {
    fontSize: 28,
    color: '#8E8E93',
    fontWeight: '300',
  },
  modalBody: {
    flex: 1,
  },
  modalSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  modalSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 12,
    letterSpacing: -0.1,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 15,
    color: '#8E8E93',
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
  },
  interactionCard: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  interactionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  interactionIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  interactionInfo: {
    flex: 1,
  },
  interactionSubject: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  interactionDate: {
    fontSize: 13,
    color: '#8E8E93',
  },
  interactionTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  interactionTypeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  interactionDetails: {
    fontSize: 14,
    color: '#000000',
    lineHeight: 20,
  },
  notesContainer: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 12,
  },
  notesText: {
    fontSize: 14,
    color: '#000000',
    lineHeight: 20,
  },
  modalActions: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  actionButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
});
