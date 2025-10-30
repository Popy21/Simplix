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
  Image,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { contactService, companyService, activitiesService } from '../services/api';
import {
  UsersIcon,
  BuildingIcon,
  PhoneIcon,
  MailIcon,
  MapPinIcon,
  EditIcon,
  TrashIcon,
  PlusIcon,
} from '../components/Icons';
import Navigation from '../components/Navigation';
import { useAuth } from '../context/AuthContext';
import ImageUpload from '../components/ImageUpload';

// Mapping département (2 premiers chiffres du code postal) vers région
const departmentToRegion: { [key: string]: string } = {
  '01': 'Auvergne-Rhône-Alpes', '03': 'Auvergne-Rhône-Alpes', '07': 'Auvergne-Rhône-Alpes', '15': 'Auvergne-Rhône-Alpes',
  '26': 'Auvergne-Rhône-Alpes', '38': 'Auvergne-Rhône-Alpes', '42': 'Auvergne-Rhône-Alpes', '43': 'Auvergne-Rhône-Alpes',
  '63': 'Auvergne-Rhône-Alpes', '69': 'Auvergne-Rhône-Alpes', '73': 'Auvergne-Rhône-Alpes', '74': 'Auvergne-Rhône-Alpes',
  '21': 'Bourgogne-Franche-Comté', '25': 'Bourgogne-Franche-Comté', '39': 'Bourgogne-Franche-Comté', '58': 'Bourgogne-Franche-Comté',
  '70': 'Bourgogne-Franche-Comté', '71': 'Bourgogne-Franche-Comté', '89': 'Bourgogne-Franche-Comté', '90': 'Bourgogne-Franche-Comté',
  '22': 'Bretagne', '29': 'Bretagne', '35': 'Bretagne', '56': 'Bretagne',
  '18': 'Centre-Val de Loire', '28': 'Centre-Val de Loire', '36': 'Centre-Val de Loire', '37': 'Centre-Val de Loire',
  '41': 'Centre-Val de Loire', '45': 'Centre-Val de Loire',
  '08': 'Grand Est', '10': 'Grand Est', '51': 'Grand Est', '52': 'Grand Est', '54': 'Grand Est', '55': 'Grand Est',
  '57': 'Grand Est', '67': 'Grand Est', '68': 'Grand Est', '88': 'Grand Est',
  '02': 'Hauts-de-France', '59': 'Hauts-de-France', '60': 'Hauts-de-France', '62': 'Hauts-de-France', '80': 'Hauts-de-France',
  '75': 'Île-de-France', '77': 'Île-de-France', '78': 'Île-de-France', '91': 'Île-de-France', '92': 'Île-de-France',
  '93': 'Île-de-France', '94': 'Île-de-France', '95': 'Île-de-France',
  '14': 'Normandie', '27': 'Normandie', '50': 'Normandie', '61': 'Normandie', '76': 'Normandie',
  '16': 'Nouvelle-Aquitaine', '17': 'Nouvelle-Aquitaine', '19': 'Nouvelle-Aquitaine', '23': 'Nouvelle-Aquitaine',
  '24': 'Nouvelle-Aquitaine', '33': 'Nouvelle-Aquitaine', '40': 'Nouvelle-Aquitaine', '47': 'Nouvelle-Aquitaine',
  '64': 'Nouvelle-Aquitaine', '79': 'Nouvelle-Aquitaine', '86': 'Nouvelle-Aquitaine', '87': 'Nouvelle-Aquitaine',
  '09': 'Occitanie', '11': 'Occitanie', '12': 'Occitanie', '30': 'Occitanie', '31': 'Occitanie', '32': 'Occitanie',
  '34': 'Occitanie', '46': 'Occitanie', '48': 'Occitanie', '65': 'Occitanie', '66': 'Occitanie', '81': 'Occitanie', '82': 'Occitanie',
  '44': 'Pays de la Loire', '49': 'Pays de la Loire', '53': 'Pays de la Loire', '72': 'Pays de la Loire', '85': 'Pays de la Loire',
  '04': 'Provence-Alpes-Côte d\'Azur', '05': 'Provence-Alpes-Côte d\'Azur', '06': 'Provence-Alpes-Côte d\'Azur',
  '13': 'Provence-Alpes-Côte d\'Azur', '83': 'Provence-Alpes-Côte d\'Azur', '84': 'Provence-Alpes-Côte d\'Azur',
  '20': 'Corse', '2A': 'Corse', '2B': 'Corse',
  '971': 'Guadeloupe', '972': 'Martinique', '973': 'Guyane', '974': 'La Réunion', '976': 'Mayotte',
};

const frenchRegions = [
  'Auvergne-Rhône-Alpes',
  'Bourgogne-Franche-Comté',
  'Bretagne',
  'Centre-Val de Loire',
  'Corse',
  'Grand Est',
  'Guadeloupe',
  'Guyane',
  'Hauts-de-France',
  'Île-de-France',
  'La Réunion',
  'Martinique',
  'Mayotte',
  'Normandie',
  'Nouvelle-Aquitaine',
  'Occitanie',
  'Pays de la Loire',
  'Provence-Alpes-Côte d\'Azur',
];

type ContactsScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Contacts'>;
};

interface Contact {
  id: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  avatar_url?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  title?: string;
  company_id?: string;
  company_name?: string;
  company_logo?: string;
  type?: string;
  linkedin_url?: string;
  twitter_url?: string;
  created_at: string;
  updated_at: string;
}

interface Company {
  id: string;
  name: string;
  logo_url?: string;
  industry?: string;
  website?: string;
  phone?: string;
  email?: string;
  address?: any;
  created_at: string;
  updated_at: string;
}

interface Activity {
  id: string;
  type: 'call' | 'email' | 'meeting' | 'note';
  description: string;
  created_at: string;
  created_by_name?: string;
  metadata?: any;
}

type ViewMode = 'contacts' | 'companies';

export default function ContactsScreen({ navigation }: ContactsScreenProps) {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('contacts');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [contactModalVisible, setContactModalVisible] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [contactActivities, setContactActivities] = useState<Activity[]>([]);
  const [newContactModalVisible, setNewContactModalVisible] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [contactForm, setContactForm] = useState({
    first_name: '',
    last_name: '',
    avatar_url: '',
    email: '',
    phone: '',
    mobile: '',
    title: '',
    company_id: '',
  });
  const [companyModalVisible, setCompanyModalVisible] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [newCompanyModalVisible, setNewCompanyModalVisible] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [companyForm, setCompanyForm] = useState({
    name: '',
    logo_url: '',
    industry: '',
    website: '',
    phone: '',
    email: '',
    address: {
      street_number: '',
      street: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'France',
    },
  });
  const [activityModalVisible, setActivityModalVisible] = useState(false);
  const [activityForm, setActivityForm] = useState({
    type: 'note' as 'call' | 'email' | 'meeting' | 'note',
    description: '',
    duration_minutes: '',
    subject: '',
  });

  const activityConfig = {
    call: { label: 'Appel', icon: '📞', color: '#007AFF' },
    email: { label: 'Email', icon: '📧', color: '#FF9500' },
    meeting: { label: 'Réunion', icon: '🤝', color: '#34C759' },
    note: { label: 'Note', icon: '📝', color: '#8E8E93' },
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterData();
  }, [searchQuery, contacts, companies, viewMode]);

  const fetchData = async () => {
    try {
      const [contactsRes, companiesRes] = await Promise.all([
        contactService.getAll(),
        companyService.getAll(),
      ]);
      setContacts(contactsRes.data.data || contactsRes.data);
      setCompanies(companiesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterData = () => {
    if (viewMode === 'contacts') {
      let filtered = contacts;
      if (searchQuery) {
        filtered = filtered.filter(
          (c) =>
            c.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.company_name?.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
      setFilteredContacts(filtered);
    } else {
      let filtered = companies;
      if (searchQuery) {
        filtered = filtered.filter(
          (c) =>
            c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.industry?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.email?.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
      setFilteredCompanies(filtered);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const openContactDetails = async (contact: Contact) => {
    setSelectedContact(contact);
    setContactModalVisible(true);
    try {
      const res = await activitiesService.getByContact(contact.id);
      setContactActivities(res.data);
    } catch (error) {
      console.error('Error fetching activities:', error);
    }
  };

  const handleCreateContact = async () => {
    if (!contactForm.first_name.trim() && !contactForm.last_name.trim()) {
      Platform.OS === 'web' ? alert('Le prénom ou le nom est obligatoire') : Alert.alert('Erreur', 'Le prénom ou le nom est obligatoire');
      return;
    }
    try {
      if (editingContact) {
        await contactService.update(editingContact.id, contactForm);
      } else {
        await contactService.create(contactForm);
      }
      setNewContactModalVisible(false);
      resetContactForm();
      fetchData();
    } catch (error) {
      console.error('Error saving contact:', error);
    }
  };

  const handleEditContact = (contact: Contact) => {
    setEditingContact(contact);
    setContactForm({
      first_name: contact.first_name || '',
      last_name: contact.last_name || '',
      avatar_url: contact.avatar_url || '',
      email: contact.email || '',
      phone: contact.phone || '',
      mobile: contact.mobile || '',
      title: contact.title || '',
      company_id: contact.company_id || '',
    });
    setContactModalVisible(false);
    setNewContactModalVisible(true);
  };

  const handleDeleteContact = async (contact: Contact) => {
    const confirmDelete = () => {
      contactService.delete(contact.id).then(() => {
        setContactModalVisible(false);
        fetchData();
      });
    };
    if (Platform.OS === 'web') {
      if (window.confirm('Êtes-vous sûr de vouloir supprimer ce contact ?')) confirmDelete();
    } else {
      Alert.alert('Confirmer', 'Êtes-vous sûr de vouloir supprimer ce contact ?', [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', onPress: confirmDelete, style: 'destructive' },
      ]);
    }
  };

  const resetContactForm = () => {
    setContactForm({ first_name: '', last_name: '', avatar_url: '', email: '', phone: '', mobile: '', title: '', company_id: '' });
    setEditingContact(null);
  };

  const openCompanyDetails = (company: Company) => {
    setSelectedCompany(company);
    setCompanyModalVisible(true);
  };

  const handleCreateCompany = async () => {
    if (!companyForm.name.trim()) {
      Platform.OS === 'web' ? alert('Le nom est obligatoire') : Alert.alert('Erreur', 'Le nom est obligatoire');
      return;
    }
    try {
      if (editingCompany) {
        await companyService.update(editingCompany.id, companyForm);
      } else {
        await companyService.create(companyForm);
      }
      setNewCompanyModalVisible(false);
      resetCompanyForm();
      fetchData();
    } catch (error) {
      console.error('Error saving company:', error);
    }
  };

  const handleEditCompany = (company: Company) => {
    setEditingCompany(company);
    setCompanyForm({
      name: company.name,
      logo_url: company.logo_url || '',
      industry: company.industry || '',
      website: company.website || '',
      phone: company.phone || '',
      email: company.email || '',
      address: typeof company.address === 'object' && company.address !== null
        ? company.address
        : {
            street_number: '',
            street: '',
            city: '',
            state: '',
            postal_code: '',
            country: 'France',
          },
    });
    setCompanyModalVisible(false);
    setNewCompanyModalVisible(true);
  };

  const handleDeleteCompany = async (company: Company) => {
    const confirmDelete = () => {
      companyService.delete(company.id).then(() => {
        setCompanyModalVisible(false);
        fetchData();
      });
    };
    if (Platform.OS === 'web') {
      if (window.confirm('Êtes-vous sûr de vouloir supprimer cette entreprise ?')) confirmDelete();
    } else {
      Alert.alert('Confirmer', 'Êtes-vous sûr ?', [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', onPress: confirmDelete, style: 'destructive' },
      ]);
    }
  };

  const resetCompanyForm = () => {
    setCompanyForm({
      name: '',
      logo_url: '',
      industry: '',
      website: '',
      phone: '',
      email: '',
      address: {
        street_number: '',
        street: '',
        city: '',
        state: '',
        postal_code: '',
        country: 'France',
      },
    });
    setEditingCompany(null);
  };

  // Auto-detect region based on postal code
  const handlePostalCodeChange = (text: string) => {
    setCompanyForm({
      ...companyForm,
      address: { ...companyForm.address, postal_code: text }
    });

    // Try to detect region from postal code
    if (text.length >= 2) {
      const departmentCode = text.substring(0, 2);
      const region = departmentToRegion[departmentCode];
      if (region && region !== companyForm.address.state) {
        setCompanyForm({
          ...companyForm,
          address: {
            ...companyForm.address,
            postal_code: text,
            state: region
          }
        });
      }
    }
  };

  const handleCreateActivity = async () => {
    if (!selectedContact) return;
    try {
      const { type, description, duration_minutes, subject } = activityForm;
      if (type === 'call') {
        await activitiesService.createCall({ contact_id: selectedContact.id, duration_minutes: parseInt(duration_minutes) || 0, notes: description });
      } else if (type === 'email') {
        await activitiesService.createEmail({ contact_id: selectedContact.id, subject: subject, email_body: description });
      } else if (type === 'meeting') {
        await activitiesService.createMeeting({ contact_id: selectedContact.id, title: subject, start_time: new Date().toISOString(), notes: description });
      } else {
        await activitiesService.createNote({ contact_id: selectedContact.id, content: description });
      }
      setActivityModalVisible(false);
      resetActivityForm();
      const res = await activitiesService.getByContact(selectedContact.id);
      setContactActivities(res.data);
    } catch (error) {
      console.error('Error creating activity:', error);
    }
  };

  const resetActivityForm = () => {
    setActivityForm({ type: 'note', description: '', duration_minutes: '', subject: '' });
  };

  const stats = {
    totalContacts: contacts.length,
    totalCompanies: companies.length,
    contactsWithEmail: contacts.filter((c) => c.email).length,
    contactsWithPhone: contacts.filter((c) => c.phone).length,
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Navigation />
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Contacts</Text>
          <Text style={styles.headerSubtitle}>
            {viewMode === 'contacts' ? `${stats.totalContacts} contacts` : `${stats.totalCompanies} entreprises`}
          </Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={() => viewMode === 'contacts' ? setNewContactModalVisible(true) : setNewCompanyModalVisible(true)}>
          <Text style={styles.addButtonText}>+ Nouveau</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.toggleContainer}>
        <TouchableOpacity style={[styles.toggleButton, viewMode === 'contacts' && styles.toggleButtonActive]} onPress={() => setViewMode('contacts')}>
          <UsersIcon size={18} color={viewMode === 'contacts' ? '#FFFFFF' : '#8E8E93'} />
          <Text style={[styles.toggleText, viewMode === 'contacts' && styles.toggleTextActive]}>Contacts ({stats.totalContacts})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.toggleButton, viewMode === 'companies' && styles.toggleButtonActive]} onPress={() => setViewMode('companies')}>
          <BuildingIcon size={18} color={viewMode === 'companies' ? '#FFFFFF' : '#8E8E93'} />
          <Text style={[styles.toggleText, viewMode === 'companies' && styles.toggleTextActive]}>Entreprises ({stats.totalCompanies})</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.statsContainer}>
        {viewMode === 'contacts' ? (
          <>
            <View style={styles.statCard}>
              <MailIcon size={20} color="#007AFF" />
              <Text style={styles.statValue}>{stats.contactsWithEmail}</Text>
              <Text style={styles.statLabel}>Avec email</Text>
            </View>
            <View style={styles.statCard}>
              <PhoneIcon size={20} color="#34C759" />
              <Text style={styles.statValue}>{stats.contactsWithPhone}</Text>
              <Text style={styles.statLabel}>Avec téléphone</Text>
            </View>
          </>
        ) : (
          <>
            <View style={styles.statCard}>
              <BuildingIcon size={20} color="#34C759" />
              <Text style={styles.statValue}>{stats.totalCompanies}</Text>
              <Text style={styles.statLabel}>Entreprises</Text>
            </View>
            <View style={styles.statCard}>
              <UsersIcon size={20} color="#007AFF" />
              <Text style={styles.statValue}>{stats.totalContacts}</Text>
              <Text style={styles.statLabel}>Contacts</Text>
            </View>
          </>
        )}
      </View>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder={viewMode === 'contacts' ? 'Rechercher un contact...' : 'Rechercher une entreprise...'}
          placeholderTextColor="#8E8E93"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      <ScrollView style={styles.list} contentContainerStyle={styles.listContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {viewMode === 'contacts' ? (
          filteredContacts.length > 0 ? (
            filteredContacts.map((contact) => (
              <TouchableOpacity key={contact.id} style={styles.card} onPress={() => openContactDetails(contact)}>
                <View style={styles.cardHeader}>
                  {contact.avatar_url ? (
                    <Image source={{ uri: contact.avatar_url }} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{(contact.full_name || contact.first_name || contact.last_name || 'U').charAt(0).toUpperCase()}</Text>
                    </View>
                  )}
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardName}>{contact.full_name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim()}</Text>
                    {contact.title && <Text style={styles.cardCompany}>{contact.title}</Text>}
                    {contact.company_name && <Text style={styles.cardCompany}>{contact.company_name}</Text>}
                    {contact.email && <Text style={styles.cardMetaText} numberOfLines={1}>{contact.email}</Text>}
                  </View>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <UsersIcon size={64} color="#D1D1D6" />
              <Text style={styles.emptyText}>Aucun contact trouvé</Text>
            </View>
          )
        ) : (
          filteredCompanies.length > 0 ? (
            filteredCompanies.map((company) => (
              <TouchableOpacity key={company.id} style={styles.card} onPress={() => openCompanyDetails(company)}>
                <View style={styles.cardHeader}>
                  {company.logo_url ? (
                    <Image source={{ uri: company.logo_url }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatar, { backgroundColor: '#34C759' }]}>
                      <BuildingIcon size={24} color="#FFFFFF" />
                    </View>
                  )}
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardName}>{company.name}</Text>
                    {company.industry && <Text style={styles.cardCompany}>{company.industry}</Text>}
                    {company.email && <Text style={styles.cardMetaText} numberOfLines={1}>{company.email}</Text>}
                  </View>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <BuildingIcon size={64} color="#D1D1D6" />
              <Text style={styles.emptyText}>Aucune entreprise trouvée</Text>
            </View>
          )
        )}
      </ScrollView>

      {/* Contact Detail Modal */}
      <Modal visible={contactModalVisible} animationType="slide" transparent onRequestClose={() => setContactModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedContact && (
              <>
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalTitle}>{selectedContact.full_name || `${selectedContact.first_name || ''} ${selectedContact.last_name || ''}`.trim()}</Text>
                    {selectedContact.title && <Text style={styles.modalSubtitle}>{selectedContact.title}</Text>}
                    {selectedContact.company_name && <Text style={styles.modalSubtitle}>{selectedContact.company_name}</Text>}
                  </View>
                  <TouchableOpacity onPress={() => setContactModalVisible(false)}>
                    <Text style={styles.closeButton}>✕</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.modalBody}>
                  {selectedContact.avatar_url && (
                    <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                      <Image source={{ uri: selectedContact.avatar_url }} style={{ width: 100, height: 100, borderRadius: 50 }} />
                    </View>
                  )}
                  <View style={styles.modalSection}>
                    <Text style={styles.sectionTitle}>INFORMATIONS</Text>
                    {selectedContact.email && (
                      <View style={styles.infoRow}>
                        <MailIcon size={16} color="#8E8E93" />
                        <Text style={styles.infoValue}>{selectedContact.email}</Text>
                      </View>
                    )}
                    {selectedContact.phone && (
                      <View style={styles.infoRow}>
                        <PhoneIcon size={16} color="#8E8E93" />
                        <Text style={styles.infoValue}>{selectedContact.phone}</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.modalSection}>
                    <Text style={styles.sectionTitle}>ACTIVITÉS RÉCENTES</Text>
                    {contactActivities.length > 0 ? (
                      contactActivities.map((activity) => (
                        <View key={activity.id} style={styles.activityCard}>
                          <Text style={styles.activityIcon}>{activityConfig[activity.type].icon}</Text>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.activityDescription}>{activity.description}</Text>
                            <Text style={styles.activityDate}>
                              {new Date(activity.created_at).toLocaleDateString('fr-FR')}
                            </Text>
                          </View>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.emptyText}>Aucune activité</Text>
                    )}
                  </View>
                </ScrollView>
                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.actionButtonSecondary} onPress={() => handleEditContact(selectedContact)}>
                    <EditIcon size={16} color="#007AFF" />
                    <Text style={styles.actionButtonSecondaryText}>Modifier</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionButtonPrimary} onPress={() => setActivityModalVisible(true)}>
                    <PlusIcon size={16} color="#FFFFFF" />
                    <Text style={styles.actionButtonPrimaryText}>Activité</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionButtonDanger} onPress={() => handleDeleteContact(selectedContact)}>
                    <TrashIcon size={16} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Company Detail Modal */}
      <Modal visible={companyModalVisible} animationType="slide" transparent onRequestClose={() => setCompanyModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedCompany && (
              <>
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalTitle}>{selectedCompany.name}</Text>
                    {selectedCompany.industry && <Text style={styles.modalSubtitle}>{selectedCompany.industry}</Text>}
                  </View>
                  <TouchableOpacity onPress={() => setCompanyModalVisible(false)}>
                    <Text style={styles.closeButton}>✕</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.modalBody}>
                  <View style={styles.modalSection}>
                    <Text style={styles.sectionTitle}>INFORMATIONS</Text>
                    {selectedCompany.email && (
                      <View style={styles.infoRow}>
                        <MailIcon size={16} color="#8E8E93" />
                        <Text style={styles.infoValue}>{selectedCompany.email}</Text>
                      </View>
                    )}
                    {selectedCompany.phone && (
                      <View style={styles.infoRow}>
                        <PhoneIcon size={16} color="#8E8E93" />
                        <Text style={styles.infoValue}>{selectedCompany.phone}</Text>
                      </View>
                    )}
                    {selectedCompany.website && (
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>🌐</Text>
                        <Text style={styles.infoValue}>{selectedCompany.website}</Text>
                      </View>
                    )}
                    {selectedCompany.address && (
                      <View style={styles.infoRow}>
                        <MapPinIcon size={16} color="#8E8E93" />
                        <Text style={styles.infoValue}>
                          {typeof selectedCompany.address === 'string' ? selectedCompany.address : JSON.stringify(selectedCompany.address)}
                        </Text>
                      </View>
                    )}
                  </View>
                </ScrollView>
                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.actionButtonSecondary} onPress={() => handleEditCompany(selectedCompany)}>
                    <EditIcon size={16} color="#007AFF" />
                    <Text style={styles.actionButtonSecondaryText}>Modifier</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionButtonDanger} onPress={() => handleDeleteCompany(selectedCompany)}>
                    <TrashIcon size={16} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* New/Edit Contact Modal */}
      <Modal visible={newContactModalVisible} transparent animationType="slide" onRequestClose={() => { setNewContactModalVisible(false); resetContactForm(); }}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingContact ? 'Modifier le contact' : 'Nouveau contact'}</Text>
              <TouchableOpacity onPress={() => { setNewContactModalVisible(false); resetContactForm(); }}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Prénom *</Text>
                <TextInput style={styles.input} placeholder="Prénom" value={contactForm.first_name} onChangeText={(text) => setContactForm({ ...contactForm, first_name: text })} placeholderTextColor="#8E8E93" />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Nom</Text>
                <TextInput style={styles.input} placeholder="Nom de famille" value={contactForm.last_name} onChangeText={(text) => setContactForm({ ...contactForm, last_name: text })} placeholderTextColor="#8E8E93" />
              </View>
              <ImageUpload
                label="Avatar"
                value={contactForm.avatar_url}
                onChange={(url) => setContactForm({ ...contactForm, avatar_url: url as string })}
                multiple={false}
              />
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Titre/Poste</Text>
                <TextInput style={styles.input} placeholder="Directeur Commercial" value={contactForm.title} onChangeText={(text) => setContactForm({ ...contactForm, title: text })} placeholderTextColor="#8E8E93" />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Email</Text>
                <TextInput style={styles.input} placeholder="email@example.com" value={contactForm.email} onChangeText={(text) => setContactForm({ ...contactForm, email: text })} keyboardType="email-address" placeholderTextColor="#8E8E93" />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Téléphone</Text>
                <TextInput style={styles.input} placeholder="+33 1 XX XX XX XX" value={contactForm.phone} onChangeText={(text) => setContactForm({ ...contactForm, phone: text })} keyboardType="phone-pad" placeholderTextColor="#8E8E93" />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Mobile</Text>
                <TextInput style={styles.input} placeholder="+33 6 XX XX XX XX" value={contactForm.mobile} onChangeText={(text) => setContactForm({ ...contactForm, mobile: text })} keyboardType="phone-pad" placeholderTextColor="#8E8E93" />
              </View>
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.buttonSecondary} onPress={() => { setNewContactModalVisible(false); resetContactForm(); }}>
                <Text style={styles.buttonSecondaryText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.buttonPrimary} onPress={handleCreateContact}>
                <Text style={styles.buttonPrimaryText}>{editingContact ? 'Modifier' : 'Créer'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* New/Edit Company Modal */}
      <Modal visible={newCompanyModalVisible} transparent animationType="slide" onRequestClose={() => { setNewCompanyModalVisible(false); resetCompanyForm(); }}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingCompany ? 'Modifier l\'entreprise' : 'Nouvelle entreprise'}</Text>
              <TouchableOpacity onPress={() => { setNewCompanyModalVisible(false); resetCompanyForm(); }}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Nom *</Text>
                <TextInput style={styles.input} placeholder="Nom de l'entreprise" value={companyForm.name} onChangeText={(text) => setCompanyForm({ ...companyForm, name: text })} placeholderTextColor="#8E8E93" />
              </View>
              <ImageUpload
                label="Logo"
                value={companyForm.logo_url}
                onChange={(url) => setCompanyForm({ ...companyForm, logo_url: url as string })}
                multiple={false}
              />
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Secteur</Text>
                <TextInput style={styles.input} placeholder="ex: Technologie" value={companyForm.industry} onChangeText={(text) => setCompanyForm({ ...companyForm, industry: text })} placeholderTextColor="#8E8E93" />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Site web</Text>
                <TextInput style={styles.input} placeholder="https://example.com" value={companyForm.website} onChangeText={(text) => setCompanyForm({ ...companyForm, website: text })} keyboardType="url" placeholderTextColor="#8E8E93" />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Email</Text>
                <TextInput style={styles.input} placeholder="contact@entreprise.com" value={companyForm.email} onChangeText={(text) => setCompanyForm({ ...companyForm, email: text })} keyboardType="email-address" placeholderTextColor="#8E8E93" />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Téléphone</Text>
                <TextInput style={styles.input} placeholder="+33 1 XX XX XX XX" value={companyForm.phone} onChangeText={(text) => setCompanyForm({ ...companyForm, phone: text })} keyboardType="phone-pad" placeholderTextColor="#8E8E93" />
              </View>
              {/* Adresse détaillée */}
              <View style={styles.addressSection}>
                <Text style={styles.sectionTitle}>📍 Adresse</Text>

                <View style={styles.formRow}>
                  <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                    <Text style={styles.formLabel}>N°</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="123"
                      value={companyForm.address.street_number}
                      onChangeText={(text) => setCompanyForm({
                        ...companyForm,
                        address: { ...companyForm.address, street_number: text }
                      })}
                      placeholderTextColor="#8E8E93"
                    />
                  </View>
                  <View style={[styles.formGroup, { flex: 3 }]}>
                    <Text style={styles.formLabel}>Nom de la voie</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Rue de la République"
                      value={companyForm.address.street}
                      onChangeText={(text) => setCompanyForm({
                        ...companyForm,
                        address: { ...companyForm.address, street: text }
                      })}
                      placeholderTextColor="#8E8E93"
                    />
                  </View>
                </View>

                <View style={styles.formRow}>
                  <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                    <Text style={styles.formLabel}>Code Postal</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="75001"
                      value={companyForm.address.postal_code}
                      onChangeText={handlePostalCodeChange}
                      keyboardType="number-pad"
                      placeholderTextColor="#8E8E93"
                    />
                  </View>
                  <View style={[styles.formGroup, { flex: 2 }]}>
                    <Text style={styles.formLabel}>Ville</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Paris"
                      value={companyForm.address.city}
                      onChangeText={(text) => setCompanyForm({
                        ...companyForm,
                        address: { ...companyForm.address, city: text }
                      })}
                      placeholderTextColor="#8E8E93"
                    />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Région</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={companyForm.address.state}
                      onValueChange={(itemValue) => setCompanyForm({
                        ...companyForm,
                        address: { ...companyForm.address, state: itemValue }
                      })}
                      style={styles.picker}
                    >
                      <Picker.Item label="Sélectionnez une région..." value="" />
                      {frenchRegions.map((region) => (
                        <Picker.Item key={region} label={region} value={region} />
                      ))}
                    </Picker>
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Pays</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="France"
                    value={companyForm.address.country}
                    onChangeText={(text) => setCompanyForm({
                      ...companyForm,
                      address: { ...companyForm.address, country: text }
                    })}
                    placeholderTextColor="#8E8E93"
                  />
                </View>
              </View>
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.buttonSecondary} onPress={() => { setNewCompanyModalVisible(false); resetCompanyForm(); }}>
                <Text style={styles.buttonSecondaryText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.buttonPrimary} onPress={handleCreateCompany}>
                <Text style={styles.buttonPrimaryText}>{editingCompany ? 'Modifier' : 'Créer'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Activity Modal */}
      <Modal visible={activityModalVisible} transparent animationType="slide" onRequestClose={() => { setActivityModalVisible(false); resetActivityForm(); }}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nouvelle activité</Text>
              <TouchableOpacity onPress={() => { setActivityModalVisible(false); resetActivityForm(); }}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Type</Text>
                <View style={styles.activityTypeSelect}>
                  {(['call', 'email', 'meeting', 'note'] as const).map((type) => (
                    <TouchableOpacity key={type} style={[styles.activityTypeButton, activityForm.type === type && styles.activityTypeButtonActive]} onPress={() => setActivityForm({ ...activityForm, type })}>
                      <Text style={styles.activityTypeIcon}>{activityConfig[type].icon}</Text>
                      <Text style={styles.activityTypeLabel}>{activityConfig[type].label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              {activityForm.type === 'call' && (
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Durée (minutes)</Text>
                  <TextInput style={styles.input} placeholder="30" value={activityForm.duration_minutes} onChangeText={(text) => setActivityForm({ ...activityForm, duration_minutes: text })} keyboardType="numeric" placeholderTextColor="#8E8E93" />
                </View>
              )}
              {(activityForm.type === 'email' || activityForm.type === 'meeting') && (
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>{activityForm.type === 'email' ? 'Sujet' : 'Titre'}</Text>
                  <TextInput style={styles.input} placeholder={activityForm.type === 'email' ? 'Sujet de l\'email' : 'Titre de la réunion'} value={activityForm.subject} onChangeText={(text) => setActivityForm({ ...activityForm, subject: text })} placeholderTextColor="#8E8E93" />
                </View>
              )}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>{activityForm.type === 'note' ? 'Note' : 'Description'}</Text>
                <TextInput style={[styles.input, styles.textArea]} placeholder="Détails..." value={activityForm.description} onChangeText={(text) => setActivityForm({ ...activityForm, description: text })} placeholderTextColor="#8E8E93" multiline numberOfLines={4} />
              </View>
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.buttonSecondary} onPress={() => { setActivityModalVisible(false); resetActivityForm(); }}>
                <Text style={styles.buttonSecondaryText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.buttonPrimary} onPress={handleCreateActivity}>
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
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F2F2F7' },
  loadingText: { fontSize: 17, color: '#8E8E93', fontWeight: '500' },
  header: { backgroundColor: '#FFFFFF', paddingTop: 16, paddingHorizontal: 20, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 32, fontWeight: '700', color: '#000000', letterSpacing: -0.6, marginBottom: 4 },
  headerSubtitle: { fontSize: 15, color: '#8E8E93', letterSpacing: -0.2 },
  addButton: { backgroundColor: '#007AFF', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  addButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  toggleContainer: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 12, gap: 8 },
  toggleButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, backgroundColor: '#FFFFFF', gap: 6 },
  toggleButtonActive: { backgroundColor: '#007AFF' },
  toggleText: { fontSize: 14, fontWeight: '600', color: '#8E8E93' },
  toggleTextActive: { color: '#FFFFFF' },
  statsContainer: { flexDirection: 'row', paddingHorizontal: 20, paddingBottom: 12, gap: 12 },
  statCard: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, gap: 4 },
  statValue: { fontSize: 20, fontWeight: '700', color: '#000000' },
  statLabel: { fontSize: 12, color: '#8E8E93' },
  searchContainer: { paddingHorizontal: 20, paddingBottom: 12 },
  searchInput: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, fontSize: 16, color: '#000000', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  list: { flex: 1 },
  listContent: { padding: 20, gap: 12 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: '600', color: '#000000', marginBottom: 2 },
  cardCompany: { fontSize: 14, color: '#8E8E93', marginBottom: 4 },
  cardMetaText: { fontSize: 13, color: '#8E8E93' },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { marginTop: 16, fontSize: 17, color: '#8E8E93' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F2F2F7' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#000000' },
  modalSubtitle: { fontSize: 15, color: '#8E8E93', marginTop: 2 },
  closeButton: { fontSize: 28, color: '#8E8E93', fontWeight: '300' },
  modalBody: { flex: 1 },
  modalSection: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#F2F2F7' },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#8E8E93', marginBottom: 12, letterSpacing: -0.1 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 8 },
  infoLabel: { fontSize: 15, color: '#8E8E93' },
  infoValue: { fontSize: 15, fontWeight: '500', color: '#000000', flex: 1 },
  activityCard: { flexDirection: 'row', backgroundColor: '#F2F2F7', borderRadius: 12, padding: 12, marginBottom: 8 },
  activityIcon: { fontSize: 24, marginRight: 12 },
  activityDescription: { fontSize: 15, fontWeight: '500', color: '#000000', marginBottom: 2 },
  activityDate: { fontSize: 13, color: '#8E8E93' },
  modalActions: { flexDirection: 'row', padding: 20, borderTopWidth: 1, borderTopColor: '#F2F2F7', gap: 8 },
  actionButtonPrimary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10, gap: 6, backgroundColor: '#007AFF' },
  actionButtonPrimaryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  actionButtonSecondary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10, gap: 6, backgroundColor: '#F2F2F7' },
  actionButtonSecondaryText: { color: '#007AFF', fontSize: 15, fontWeight: '600' },
  actionButtonDanger: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#FF3B30', flex: 0, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10 },
  modalFooter: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#F2F2F7' },
  buttonPrimary: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#007AFF' },
  buttonPrimaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  buttonSecondary: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F2F2F7' },
  buttonSecondaryText: { color: '#007AFF', fontSize: 16, fontWeight: '600' },
  formGroup: { marginBottom: 16 },
  formLabel: { fontSize: 15, fontWeight: '600', color: '#000000', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#E5E5EA', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, color: '#000000' },
  textArea: { textAlignVertical: 'top', paddingTop: 10, height: 100 },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    fontSize: 16,
    color: '#000000',
    height: Platform.OS === 'web' ? 44 : undefined,
  },
  addressSection: {
    backgroundColor: '#F9F9F9',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 16,
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  activityTypeSelect: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  activityTypeButton: { flex: 1, minWidth: '48%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#E5E5EA', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: '#FFFFFF', gap: 6 },
  activityTypeButtonActive: { borderColor: '#007AFF', backgroundColor: '#007AFF10' },
  activityTypeIcon: { fontSize: 18 },
  activityTypeLabel: { fontSize: 14, fontWeight: '600', color: '#000000' },
});
