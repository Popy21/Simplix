import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  Platform,
  Image,
  Animated,
  Dimensions,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { contactService, companyService, activitiesService, customerService } from '../services/api';
import {
  UsersIcon,
  BuildingIcon,
  PhoneIcon,
  MailIcon,
  MapPinIcon,
  EditIcon,
  TrashIcon,
  PlusIcon,
  FileTextIcon,
  SearchIcon,
  FilterIcon,
  ChevronRightIcon,
} from '../components/Icons';
import GlassLayout from '../components/GlassLayout';
import { useAuth } from '../context/AuthContext';
import ImageUpload from '../components/ImageUpload';
import { glassTheme, withShadow } from '../theme/glassTheme';
import { isMobile, isTablet, responsiveSpacing } from '../theme/responsive';
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
  GlassStats,
} from '../components/ui';

// French regions mapping
const departmentToRegion: { [key: string]: string } = {
  '01': 'Auvergne-Rhone-Alpes', '03': 'Auvergne-Rhone-Alpes', '07': 'Auvergne-Rhone-Alpes', '15': 'Auvergne-Rhone-Alpes',
  '26': 'Auvergne-Rhone-Alpes', '38': 'Auvergne-Rhone-Alpes', '42': 'Auvergne-Rhone-Alpes', '43': 'Auvergne-Rhone-Alpes',
  '63': 'Auvergne-Rhone-Alpes', '69': 'Auvergne-Rhone-Alpes', '73': 'Auvergne-Rhone-Alpes', '74': 'Auvergne-Rhone-Alpes',
  '21': 'Bourgogne-Franche-Comte', '25': 'Bourgogne-Franche-Comte', '39': 'Bourgogne-Franche-Comte', '58': 'Bourgogne-Franche-Comte',
  '70': 'Bourgogne-Franche-Comte', '71': 'Bourgogne-Franche-Comte', '89': 'Bourgogne-Franche-Comte', '90': 'Bourgogne-Franche-Comte',
  '22': 'Bretagne', '29': 'Bretagne', '35': 'Bretagne', '56': 'Bretagne',
  '18': 'Centre-Val de Loire', '28': 'Centre-Val de Loire', '36': 'Centre-Val de Loire', '37': 'Centre-Val de Loire',
  '41': 'Centre-Val de Loire', '45': 'Centre-Val de Loire',
  '75': 'Ile-de-France', '77': 'Ile-de-France', '78': 'Ile-de-France', '91': 'Ile-de-France', '92': 'Ile-de-France',
  '93': 'Ile-de-France', '94': 'Ile-de-France', '95': 'Ile-de-France',
};

const frenchRegions = [
  'Auvergne-Rhone-Alpes', 'Bourgogne-Franche-Comte', 'Bretagne', 'Centre-Val de Loire',
  'Corse', 'Grand Est', 'Hauts-de-France', 'Ile-de-France', 'Normandie',
  'Nouvelle-Aquitaine', 'Occitanie', 'Pays de la Loire', 'Provence-Alpes-Cote d\'Azur',
];

const { width } = Dimensions.get('window');

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
  const [contactHistoryTab, setContactHistoryTab] = useState<'activities' | 'quotes' | 'invoices' | 'payments'>('activities');
  const [contactQuotes, setContactQuotes] = useState<any[]>([]);
  const [contactInvoices, setContactInvoices] = useState<any[]>([]);
  const [contactPayments, setContactPayments] = useState<any[]>([]);
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

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const activityConfig = {
    call: { label: 'Appel', icon: PhoneIcon, color: '#007AFF' },
    email: { label: 'Email', icon: MailIcon, color: '#FF9500' },
    meeting: { label: 'Reunion', icon: UsersIcon, color: '#34C759' },
    note: { label: 'Note', icon: FileTextIcon, color: '#8E8E93' },
  };

  useEffect(() => {
    fetchData();
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
    setContactHistoryTab('activities');

    try {
      const [activitiesRes, historyRes] = await Promise.all([
        activitiesService.getByContact(contact.id),
        customerService.getHistory(contact.id),
      ]);

      setContactActivities(activitiesRes.data);
      setContactQuotes(historyRes.data.quotes || []);
      setContactInvoices(historyRes.data.invoices || []);
      setContactPayments(historyRes.data.payments || []);
    } catch (error) {
      console.error('Error fetching contact details:', error);
    }
  };

  const handleCreateContact = async () => {
    if (!contactForm.first_name.trim() && !contactForm.last_name.trim()) {
      Platform.OS === 'web' ? alert('Le prenom ou le nom est obligatoire') : Alert.alert('Erreur', 'Le prenom ou le nom est obligatoire');
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
      if (window.confirm('Etes-vous sur de vouloir supprimer ce contact ?')) confirmDelete();
    } else {
      Alert.alert('Confirmer', 'Etes-vous sur de vouloir supprimer ce contact ?', [
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
      if (window.confirm('Etes-vous sur de vouloir supprimer cette entreprise ?')) confirmDelete();
    } else {
      Alert.alert('Confirmer', 'Etes-vous sur ?', [
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

  const handlePostalCodeChange = (text: string) => {
    setCompanyForm({
      ...companyForm,
      address: { ...companyForm.address, postal_code: text }
    });

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

  const getContactInitials = (contact: Contact) => {
    const name = contact.full_name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim();
    return name ? name.charAt(0).toUpperCase() : 'U';
  };

  const getContactFullName = (contact: Contact) => {
    return contact.full_name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'Sans nom';
  };

  if (loading) {
    return (
      <GlassLayout>
        <View style={styles.loadingContainer}>
          <GlassLoadingState
            type="spinner"
            message="Chargement des contacts..."
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
              <Text style={styles.headerTitle}>Contacts</Text>
              <Text style={styles.headerSubtitle}>
                {viewMode === 'contacts'
                  ? `${stats.totalContacts} contacts`
                  : `${stats.totalCompanies} entreprises`}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => viewMode === 'contacts' ? setNewContactModalVisible(true) : setNewCompanyModalVisible(true)}
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

          {/* View Mode Toggle */}
          <View style={styles.toggleContainer}>
            <GlassTabBar
              tabs={[
                { key: 'contacts', label: `Contacts (${stats.totalContacts})`, icon: <UsersIcon size={16} color={viewMode === 'contacts' ? '#FFFFFF' : '#8E8E93'} /> },
                { key: 'companies', label: `Entreprises (${stats.totalCompanies})`, icon: <BuildingIcon size={16} color={viewMode === 'companies' ? '#FFFFFF' : '#8E8E93'} /> },
              ]}
              activeTab={viewMode}
              onTabChange={(key) => setViewMode(key as ViewMode)}
              variant="pills"
            />
          </View>

          {/* Stats Cards */}
          <View style={styles.statsContainer}>
            {viewMode === 'contacts' ? (
              <>
                <View style={styles.statCard}>
                  <View style={[styles.statIconContainer, { backgroundColor: 'rgba(0, 122, 255, 0.1)' }]}>
                    <MailIcon size={18} color="#007AFF" />
                  </View>
                  <View style={styles.statContent}>
                    <Text style={styles.statValue}>{stats.contactsWithEmail}</Text>
                    <Text style={styles.statLabel}>Avec email</Text>
                  </View>
                </View>
                <View style={styles.statCard}>
                  <View style={[styles.statIconContainer, { backgroundColor: 'rgba(52, 199, 89, 0.1)' }]}>
                    <PhoneIcon size={18} color="#34C759" />
                  </View>
                  <View style={styles.statContent}>
                    <Text style={styles.statValue}>{stats.contactsWithPhone}</Text>
                    <Text style={styles.statLabel}>Avec telephone</Text>
                  </View>
                </View>
              </>
            ) : (
              <>
                <View style={styles.statCard}>
                  <View style={[styles.statIconContainer, { backgroundColor: 'rgba(52, 199, 89, 0.1)' }]}>
                    <BuildingIcon size={18} color="#34C759" />
                  </View>
                  <View style={styles.statContent}>
                    <Text style={styles.statValue}>{stats.totalCompanies}</Text>
                    <Text style={styles.statLabel}>Entreprises</Text>
                  </View>
                </View>
                <View style={styles.statCard}>
                  <View style={[styles.statIconContainer, { backgroundColor: 'rgba(0, 122, 255, 0.1)' }]}>
                    <UsersIcon size={18} color="#007AFF" />
                  </View>
                  <View style={styles.statContent}>
                    <Text style={styles.statValue}>{stats.totalContacts}</Text>
                    <Text style={styles.statLabel}>Contacts</Text>
                  </View>
                </View>
              </>
            )}
          </View>

          {/* Search Bar */}
          <GlassSearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={viewMode === 'contacts' ? 'Rechercher un contact...' : 'Rechercher une entreprise...'}
          />
        </View>

        {/* Content */}
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#007AFF" />}
          showsVerticalScrollIndicator={false}
        >
          {viewMode === 'contacts' ? (
            filteredContacts.length > 0 ? (
              filteredContacts.map((contact, index) => (
                <Animated.View
                  key={contact.id}
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
                    onPress={() => openContactDetails(contact)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.cardContent}>
                      <GlassAvatar
                        name={getContactFullName(contact)}
                        image={contact.avatar_url}
                        size="md"
                      />
                      <View style={styles.cardInfo}>
                        <Text style={styles.cardName}>{getContactFullName(contact)}</Text>
                        {contact.title && <Text style={styles.cardTitle}>{contact.title}</Text>}
                        {contact.company_name && (
                          <View style={styles.companyBadge}>
                            <BuildingIcon size={12} color="#8E8E93" />
                            <Text style={styles.cardCompany}>{contact.company_name}</Text>
                          </View>
                        )}
                        {contact.email && (
                          <Text style={styles.cardMetaText} numberOfLines={1}>
                            {contact.email}
                          </Text>
                        )}
                      </View>
                      <View style={styles.cardActions}>
                        {contact.phone && (
                          <TouchableOpacity
                            style={styles.quickAction}
                            onPress={(e) => {
                              e.stopPropagation();
                              Platform.OS === 'web' ? window.open(`tel:${contact.phone}`) : null;
                            }}
                          >
                            <PhoneIcon size={16} color="#007AFF" />
                          </TouchableOpacity>
                        )}
                        {contact.email && (
                          <TouchableOpacity
                            style={styles.quickAction}
                            onPress={(e) => {
                              e.stopPropagation();
                              Platform.OS === 'web' ? window.open(`mailto:${contact.email}`) : null;
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
                title="Aucun contact trouve"
                description={searchQuery ? "Essayez de modifier votre recherche" : "Ajoutez votre premier contact pour commencer"}
                actionLabel="Nouveau contact"
                onAction={() => setNewContactModalVisible(true)}
              />
            )
          ) : (
            filteredCompanies.length > 0 ? (
              filteredCompanies.map((company, index) => (
                <Animated.View
                  key={company.id}
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
                    onPress={() => openCompanyDetails(company)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.cardContent}>
                      <GlassAvatar
                        name={company.name}
                        image={company.logo_url}
                        size="md"
                        gradient={['#34C759', '#30D158']}
                      />
                      <View style={styles.cardInfo}>
                        <Text style={styles.cardName}>{company.name}</Text>
                        {company.industry && (
                          <GlassBadge label={company.industry} variant="info" size="sm" />
                        )}
                        {company.email && (
                          <Text style={styles.cardMetaText} numberOfLines={1}>
                            {company.email}
                          </Text>
                        )}
                      </View>
                      <ChevronRightIcon size={20} color="#C7C7CC" />
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              ))
            ) : (
              <GlassEmptyState
                icon={<BuildingIcon size={48} color="#C7C7CC" />}
                title="Aucune entreprise trouvee"
                description={searchQuery ? "Essayez de modifier votre recherche" : "Ajoutez votre premiere entreprise pour commencer"}
                actionLabel="Nouvelle entreprise"
                onAction={() => setNewCompanyModalVisible(true)}
              />
            )
          )}
        </ScrollView>

        {/* Contact Detail Modal */}
        <GlassModal
          visible={contactModalVisible}
          onClose={() => setContactModalVisible(false)}
          title={selectedContact ? getContactFullName(selectedContact) : ''}
          size="large"
        >
          {selectedContact && (
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Contact Header */}
              <View style={styles.modalContactHeader}>
                <GlassAvatar
                  name={getContactFullName(selectedContact)}
                  image={selectedContact.avatar_url}
                  size="xl"
                />
                <View style={styles.modalContactInfo}>
                  <Text style={styles.modalContactName}>{getContactFullName(selectedContact)}</Text>
                  {selectedContact.title && <Text style={styles.modalContactTitle}>{selectedContact.title}</Text>}
                  {selectedContact.company_name && (
                    <View style={styles.modalCompanyBadge}>
                      <BuildingIcon size={14} color="#8E8E93" />
                      <Text style={styles.modalCompanyName}>{selectedContact.company_name}</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Contact Info Section */}
              <View style={styles.modalSection}>
                <Text style={styles.sectionTitle}>INFORMATIONS</Text>
                <View style={styles.infoGrid}>
                  {selectedContact.email && (
                    <TouchableOpacity
                      style={styles.infoCard}
                      onPress={() => Platform.OS === 'web' && window.open(`mailto:${selectedContact.email}`)}
                    >
                      <View style={[styles.infoIconContainer, { backgroundColor: 'rgba(0, 122, 255, 0.1)' }]}>
                        <MailIcon size={18} color="#007AFF" />
                      </View>
                      <View style={styles.infoCardContent}>
                        <Text style={styles.infoLabel}>Email</Text>
                        <Text style={styles.infoValue}>{selectedContact.email}</Text>
                      </View>
                    </TouchableOpacity>
                  )}
                  {selectedContact.phone && (
                    <TouchableOpacity
                      style={styles.infoCard}
                      onPress={() => Platform.OS === 'web' && window.open(`tel:${selectedContact.phone}`)}
                    >
                      <View style={[styles.infoIconContainer, { backgroundColor: 'rgba(52, 199, 89, 0.1)' }]}>
                        <PhoneIcon size={18} color="#34C759" />
                      </View>
                      <View style={styles.infoCardContent}>
                        <Text style={styles.infoLabel}>Telephone</Text>
                        <Text style={styles.infoValue}>{selectedContact.phone}</Text>
                      </View>
                    </TouchableOpacity>
                  )}
                  {selectedContact.mobile && (
                    <TouchableOpacity
                      style={styles.infoCard}
                      onPress={() => Platform.OS === 'web' && window.open(`tel:${selectedContact.mobile}`)}
                    >
                      <View style={[styles.infoIconContainer, { backgroundColor: 'rgba(255, 149, 0, 0.1)' }]}>
                        <PhoneIcon size={18} color="#FF9500" />
                      </View>
                      <View style={styles.infoCardContent}>
                        <Text style={styles.infoLabel}>Mobile</Text>
                        <Text style={styles.infoValue}>{selectedContact.mobile}</Text>
                      </View>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* History Tabs */}
              <View style={styles.historySection}>
                <GlassTabBar
                  tabs={[
                    { key: 'activities', label: 'Activites' },
                    { key: 'quotes', label: `Devis (${contactQuotes.length})` },
                    { key: 'invoices', label: `Factures (${contactInvoices.length})` },
                    { key: 'payments', label: `Paiements (${contactPayments.length})` },
                  ]}
                  activeTab={contactHistoryTab}
                  onTabChange={(key) => setContactHistoryTab(key as any)}
                  variant="segmented"
                  scrollable
                />

                <View style={styles.historyContent}>
                  {contactHistoryTab === 'activities' && (
                    contactActivities.length > 0 ? (
                      contactActivities.map((activity) => {
                        const config = activityConfig[activity.type];
                        const IconComponent = config.icon;
                        return (
                          <View key={activity.id} style={styles.activityCard}>
                            <View style={[styles.activityIconContainer, { backgroundColor: `${config.color}15` }]}>
                              <IconComponent size={18} color={config.color} />
                            </View>
                            <View style={styles.activityContent}>
                              <Text style={styles.activityDescription}>{activity.description}</Text>
                              <Text style={styles.activityDate}>
                                {new Date(activity.created_at).toLocaleDateString('fr-FR', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </Text>
                            </View>
                          </View>
                        );
                      })
                    ) : (
                      <View style={styles.emptyHistoryState}>
                        <Text style={styles.emptyHistoryText}>Aucune activite</Text>
                      </View>
                    )
                  )}

                  {contactHistoryTab === 'quotes' && (
                    contactQuotes.length > 0 ? (
                      contactQuotes.map((quote) => (
                        <TouchableOpacity
                          key={quote.id}
                          style={styles.historyItem}
                          onPress={() => {
                            setContactModalVisible(false);
                            navigation.navigate('Invoices' as any, { quoteId: quote.id });
                          }}
                        >
                          <View style={styles.historyItemLeft}>
                            <Text style={styles.historyItemTitle}>{quote.quote_number}</Text>
                            <Text style={styles.historyItemDate}>
                              {new Date(quote.created_at).toLocaleDateString('fr-FR')}
                            </Text>
                          </View>
                          <View style={styles.historyItemRight}>
                            <Text style={styles.historyItemAmount}>
                              {parseFloat(quote.total_amount).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} EUR
                            </Text>
                            <GlassBadge
                              label={quote.status === 'sent' ? 'Envoye' : quote.status === 'accepted' ? 'Accepte' : 'Brouillon'}
                              variant={quote.status === 'accepted' ? 'success' : quote.status === 'sent' ? 'warning' : 'default'}
                              size="sm"
                            />
                          </View>
                        </TouchableOpacity>
                      ))
                    ) : (
                      <View style={styles.emptyHistoryState}>
                        <Text style={styles.emptyHistoryText}>Aucun devis</Text>
                      </View>
                    )
                  )}

                  {contactHistoryTab === 'invoices' && (
                    contactInvoices.length > 0 ? (
                      contactInvoices.map((invoice) => (
                        <TouchableOpacity
                          key={invoice.id}
                          style={styles.historyItem}
                          onPress={() => {
                            setContactModalVisible(false);
                            navigation.navigate('Invoices' as any, { invoiceId: invoice.id });
                          }}
                        >
                          <View style={styles.historyItemLeft}>
                            <Text style={styles.historyItemTitle}>{invoice.invoice_number}</Text>
                            <Text style={styles.historyItemDate}>
                              Echeance: {new Date(invoice.due_date).toLocaleDateString('fr-FR')}
                            </Text>
                          </View>
                          <View style={styles.historyItemRight}>
                            <Text style={styles.historyItemAmount}>
                              {parseFloat(invoice.total_amount).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} EUR
                            </Text>
                            <GlassBadge
                              label={invoice.status === 'paid' ? 'Payee' : 'En attente'}
                              variant={invoice.status === 'paid' ? 'success' : 'error'}
                              size="sm"
                            />
                          </View>
                        </TouchableOpacity>
                      ))
                    ) : (
                      <View style={styles.emptyHistoryState}>
                        <Text style={styles.emptyHistoryText}>Aucune facture</Text>
                      </View>
                    )
                  )}

                  {contactHistoryTab === 'payments' && (
                    contactPayments.length > 0 ? (
                      contactPayments.map((payment) => (
                        <View key={payment.id} style={styles.historyItem}>
                          <View style={styles.historyItemLeft}>
                            <Text style={styles.historyItemTitle}>
                              Paiement - {payment.invoice_number}
                            </Text>
                            <Text style={styles.historyItemDate}>
                              {new Date(payment.payment_date).toLocaleDateString('fr-FR')}
                            </Text>
                          </View>
                          <View style={styles.historyItemRight}>
                            <Text style={[styles.historyItemAmount, { color: '#34C759' }]}>
                              +{parseFloat(payment.amount).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} EUR
                            </Text>
                            <Text style={styles.paymentMethod}>
                              {payment.payment_method === 'stripe' ? 'Carte' : payment.payment_method}
                            </Text>
                          </View>
                        </View>
                      ))
                    ) : (
                      <View style={styles.emptyHistoryState}>
                        <Text style={styles.emptyHistoryText}>Aucun paiement</Text>
                      </View>
                    )
                  )}
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.modalActions}>
                <GlassButton
                  title="Creer Devis"
                  onPress={() => {
                    setContactModalVisible(false);
                    navigation.navigate('Invoices' as any, {
                      action: 'createQuote',
                      customerId: selectedContact.id,
                      customerType: 'contact'
                    });
                  }}
                  variant="primary"
                  icon={<FileTextIcon size={16} color="#FFFFFF" />}
                  style={{ flex: 1 }}
                />
                <GlassButton
                  title="Activite"
                  onPress={() => setActivityModalVisible(true)}
                  variant="secondary"
                  icon={<PlusIcon size={16} color="#007AFF" />}
                  style={{ flex: 1 }}
                />
              </View>
              <View style={styles.modalActionsSecondary}>
                <GlassButton
                  title="Modifier"
                  onPress={() => handleEditContact(selectedContact)}
                  variant="outline"
                  icon={<EditIcon size={16} color="#007AFF" />}
                  style={{ flex: 1 }}
                />
                <GlassButton
                  title="Supprimer"
                  onPress={() => handleDeleteContact(selectedContact)}
                  variant="danger"
                  icon={<TrashIcon size={16} color="#FF3B30" />}
                  style={{ flex: 1 }}
                />
              </View>
            </ScrollView>
          )}
        </GlassModal>

        {/* Company Detail Modal */}
        <GlassModal
          visible={companyModalVisible}
          onClose={() => setCompanyModalVisible(false)}
          title={selectedCompany?.name || ''}
          size="large"
        >
          {selectedCompany && (
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalContactHeader}>
                <GlassAvatar
                  name={selectedCompany.name}
                  image={selectedCompany.logo_url}
                  size="xl"
                  gradient={['#34C759', '#30D158']}
                />
                <View style={styles.modalContactInfo}>
                  <Text style={styles.modalContactName}>{selectedCompany.name}</Text>
                  {selectedCompany.industry && (
                    <GlassBadge label={selectedCompany.industry} variant="info" size="md" />
                  )}
                </View>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.sectionTitle}>INFORMATIONS</Text>
                <View style={styles.infoGrid}>
                  {selectedCompany.email && (
                    <View style={styles.infoCard}>
                      <View style={[styles.infoIconContainer, { backgroundColor: 'rgba(0, 122, 255, 0.1)' }]}>
                        <MailIcon size={18} color="#007AFF" />
                      </View>
                      <View style={styles.infoCardContent}>
                        <Text style={styles.infoLabel}>Email</Text>
                        <Text style={styles.infoValue}>{selectedCompany.email}</Text>
                      </View>
                    </View>
                  )}
                  {selectedCompany.phone && (
                    <View style={styles.infoCard}>
                      <View style={[styles.infoIconContainer, { backgroundColor: 'rgba(52, 199, 89, 0.1)' }]}>
                        <PhoneIcon size={18} color="#34C759" />
                      </View>
                      <View style={styles.infoCardContent}>
                        <Text style={styles.infoLabel}>Telephone</Text>
                        <Text style={styles.infoValue}>{selectedCompany.phone}</Text>
                      </View>
                    </View>
                  )}
                  {selectedCompany.website && (
                    <View style={styles.infoCard}>
                      <View style={[styles.infoIconContainer, { backgroundColor: 'rgba(88, 86, 214, 0.1)' }]}>
                        <Text style={{ fontSize: 16 }}>🌐</Text>
                      </View>
                      <View style={styles.infoCardContent}>
                        <Text style={styles.infoLabel}>Site web</Text>
                        <Text style={styles.infoValue}>{selectedCompany.website}</Text>
                      </View>
                    </View>
                  )}
                  {selectedCompany.address && (
                    <View style={styles.infoCard}>
                      <View style={[styles.infoIconContainer, { backgroundColor: 'rgba(255, 149, 0, 0.1)' }]}>
                        <MapPinIcon size={18} color="#FF9500" />
                      </View>
                      <View style={styles.infoCardContent}>
                        <Text style={styles.infoLabel}>Adresse</Text>
                        <Text style={styles.infoValue}>
                          {typeof selectedCompany.address === 'string'
                            ? selectedCompany.address
                            : `${selectedCompany.address.street_number || ''} ${selectedCompany.address.street || ''}, ${selectedCompany.address.city || ''}`}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.modalActions}>
                <GlassButton
                  title="Creer Devis"
                  onPress={() => {
                    setCompanyModalVisible(false);
                    navigation.navigate('Invoices' as any, {
                      action: 'createQuote',
                      customerId: selectedCompany.id,
                      customerType: 'company'
                    });
                  }}
                  variant="primary"
                  icon={<FileTextIcon size={16} color="#FFFFFF" />}
                  style={{ flex: 1 }}
                />
                <GlassButton
                  title="Modifier"
                  onPress={() => handleEditCompany(selectedCompany)}
                  variant="secondary"
                  icon={<EditIcon size={16} color="#007AFF" />}
                  style={{ flex: 1 }}
                />
              </View>
              <View style={styles.modalActionsSecondary}>
                <GlassButton
                  title="Supprimer"
                  onPress={() => handleDeleteCompany(selectedCompany)}
                  variant="danger"
                  icon={<TrashIcon size={16} color="#FF3B30" />}
                  fullWidth
                />
              </View>
            </ScrollView>
          )}
        </GlassModal>

        {/* New/Edit Contact Modal */}
        <GlassModal
          visible={newContactModalVisible}
          onClose={() => { setNewContactModalVisible(false); resetContactForm(); }}
          title={editingContact ? 'Modifier le contact' : 'Nouveau contact'}
          size="large"
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            <GlassInput
              label="Prenom *"
              placeholder="Prenom"
              value={contactForm.first_name}
              onChangeText={(text) => setContactForm({ ...contactForm, first_name: text })}
            />
            <GlassInput
              label="Nom"
              placeholder="Nom de famille"
              value={contactForm.last_name}
              onChangeText={(text) => setContactForm({ ...contactForm, last_name: text })}
            />
            <ImageUpload
              label="Avatar"
              value={contactForm.avatar_url}
              onChange={(url) => setContactForm({ ...contactForm, avatar_url: url as string })}
              multiple={false}
            />
            <GlassInput
              label="Titre/Poste"
              placeholder="Directeur Commercial"
              value={contactForm.title}
              onChangeText={(text) => setContactForm({ ...contactForm, title: text })}
            />
            <GlassInput
              label="Email"
              placeholder="email@example.com"
              value={contactForm.email}
              onChangeText={(text) => setContactForm({ ...contactForm, email: text })}
              keyboardType="email-address"
            />
            <GlassInput
              label="Telephone"
              placeholder="+33 1 XX XX XX XX"
              value={contactForm.phone}
              onChangeText={(text) => setContactForm({ ...contactForm, phone: text })}
              keyboardType="phone-pad"
            />
            <GlassInput
              label="Mobile"
              placeholder="+33 6 XX XX XX XX"
              value={contactForm.mobile}
              onChangeText={(text) => setContactForm({ ...contactForm, mobile: text })}
              keyboardType="phone-pad"
            />
          </ScrollView>
          <View style={styles.modalFooter}>
            <GlassButton
              title="Annuler"
              onPress={() => { setNewContactModalVisible(false); resetContactForm(); }}
              variant="outline"
              style={{ flex: 1 }}
            />
            <GlassButton
              title={editingContact ? 'Modifier' : 'Creer'}
              onPress={handleCreateContact}
              variant="primary"
              style={{ flex: 1 }}
            />
          </View>
        </GlassModal>

        {/* New/Edit Company Modal */}
        <GlassModal
          visible={newCompanyModalVisible}
          onClose={() => { setNewCompanyModalVisible(false); resetCompanyForm(); }}
          title={editingCompany ? 'Modifier l\'entreprise' : 'Nouvelle entreprise'}
          size="large"
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            <GlassInput
              label="Nom *"
              placeholder="Nom de l'entreprise"
              value={companyForm.name}
              onChangeText={(text) => setCompanyForm({ ...companyForm, name: text })}
            />
            <ImageUpload
              label="Logo"
              value={companyForm.logo_url}
              onChange={(url) => setCompanyForm({ ...companyForm, logo_url: url as string })}
              multiple={false}
            />
            <GlassInput
              label="Secteur"
              placeholder="ex: Technologie"
              value={companyForm.industry}
              onChangeText={(text) => setCompanyForm({ ...companyForm, industry: text })}
            />
            <GlassInput
              label="Site web"
              placeholder="https://example.com"
              value={companyForm.website}
              onChangeText={(text) => setCompanyForm({ ...companyForm, website: text })}
              keyboardType="url"
            />
            <GlassInput
              label="Email"
              placeholder="contact@entreprise.com"
              value={companyForm.email}
              onChangeText={(text) => setCompanyForm({ ...companyForm, email: text })}
              keyboardType="email-address"
            />
            <GlassInput
              label="Telephone"
              placeholder="+33 1 XX XX XX XX"
              value={companyForm.phone}
              onChangeText={(text) => setCompanyForm({ ...companyForm, phone: text })}
              keyboardType="phone-pad"
            />

            {/* Address Section */}
            <View style={styles.addressSection}>
              <Text style={styles.addressSectionTitle}>Adresse</Text>
              <View style={styles.formRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <GlassInput
                    label="N"
                    placeholder="123"
                    value={companyForm.address.street_number}
                    onChangeText={(text) => setCompanyForm({
                      ...companyForm,
                      address: { ...companyForm.address, street_number: text }
                    })}
                  />
                </View>
                <View style={{ flex: 3 }}>
                  <GlassInput
                    label="Nom de la voie"
                    placeholder="Rue de la Republique"
                    value={companyForm.address.street}
                    onChangeText={(text) => setCompanyForm({
                      ...companyForm,
                      address: { ...companyForm.address, street: text }
                    })}
                  />
                </View>
              </View>
              <View style={styles.formRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <GlassInput
                    label="Code Postal"
                    placeholder="75001"
                    value={companyForm.address.postal_code}
                    onChangeText={handlePostalCodeChange}
                    keyboardType="number-pad"
                  />
                </View>
                <View style={{ flex: 2 }}>
                  <GlassInput
                    label="Ville"
                    placeholder="Paris"
                    value={companyForm.address.city}
                    onChangeText={(text) => setCompanyForm({
                      ...companyForm,
                      address: { ...companyForm.address, city: text }
                    })}
                  />
                </View>
              </View>
              <View style={styles.pickerWrapper}>
                <Text style={styles.pickerLabel}>Region</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={companyForm.address.state}
                    onValueChange={(itemValue) => setCompanyForm({
                      ...companyForm,
                      address: { ...companyForm.address, state: itemValue }
                    })}
                    style={styles.picker}
                  >
                    <Picker.Item label="Selectionnez une region..." value="" />
                    {frenchRegions.map((region) => (
                      <Picker.Item key={region} label={region} value={region} />
                    ))}
                  </Picker>
                </View>
              </View>
              <GlassInput
                label="Pays"
                placeholder="France"
                value={companyForm.address.country}
                onChangeText={(text) => setCompanyForm({
                  ...companyForm,
                  address: { ...companyForm.address, country: text }
                })}
              />
            </View>
          </ScrollView>
          <View style={styles.modalFooter}>
            <GlassButton
              title="Annuler"
              onPress={() => { setNewCompanyModalVisible(false); resetCompanyForm(); }}
              variant="outline"
              style={{ flex: 1 }}
            />
            <GlassButton
              title={editingCompany ? 'Modifier' : 'Creer'}
              onPress={handleCreateCompany}
              variant="primary"
              style={{ flex: 1 }}
            />
          </View>
        </GlassModal>

        {/* Activity Modal */}
        <GlassModal
          visible={activityModalVisible}
          onClose={() => { setActivityModalVisible(false); resetActivityForm(); }}
          title="Nouvelle activite"
          size="medium"
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.formLabel}>Type</Text>
            <View style={styles.activityTypeSelect}>
              {(['call', 'email', 'meeting', 'note'] as const).map((type) => {
                const config = activityConfig[type];
                const IconComponent = config.icon;
                const isActive = activityForm.type === type;
                return (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.activityTypeButton,
                      isActive && { borderColor: config.color, backgroundColor: `${config.color}10` }
                    ]}
                    onPress={() => setActivityForm({ ...activityForm, type })}
                  >
                    <IconComponent size={20} color={isActive ? config.color : '#8E8E93'} />
                    <Text style={[
                      styles.activityTypeLabel,
                      isActive && { color: config.color }
                    ]}>
                      {config.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {activityForm.type === 'call' && (
              <GlassInput
                label="Duree (minutes)"
                placeholder="30"
                value={activityForm.duration_minutes}
                onChangeText={(text) => setActivityForm({ ...activityForm, duration_minutes: text })}
                keyboardType="numeric"
              />
            )}
            {(activityForm.type === 'email' || activityForm.type === 'meeting') && (
              <GlassInput
                label={activityForm.type === 'email' ? 'Sujet' : 'Titre'}
                placeholder={activityForm.type === 'email' ? 'Sujet de l\'email' : 'Titre de la reunion'}
                value={activityForm.subject}
                onChangeText={(text) => setActivityForm({ ...activityForm, subject: text })}
              />
            )}
            <GlassInput
              label={activityForm.type === 'note' ? 'Note' : 'Description'}
              placeholder="Details..."
              value={activityForm.description}
              onChangeText={(text) => setActivityForm({ ...activityForm, description: text })}
              multiline
              numberOfLines={4}
            />
          </ScrollView>
          <View style={styles.modalFooter}>
            <GlassButton
              title="Annuler"
              onPress={() => { setActivityModalVisible(false); resetActivityForm(); }}
              variant="outline"
              style={{ flex: 1 }}
            />
            <GlassButton
              title="Enregistrer"
              onPress={handleCreateActivity}
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
  toggleContainer: {
    marginBottom: glassTheme.spacing.md,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: glassTheme.spacing.sm,
    marginBottom: glassTheme.spacing.md,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: glassTheme.radius.md,
    padding: glassTheme.spacing.sm,
    gap: glassTheme.spacing.sm,
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
  cardName: {
    ...glassTheme.typography.h3,
    color: glassTheme.colors.text.primary,
  },
  cardTitle: {
    ...glassTheme.typography.bodySmall,
    color: glassTheme.colors.text.secondary,
  },
  companyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardCompany: {
    ...glassTheme.typography.caption,
    color: glassTheme.colors.text.tertiary,
  },
  cardMetaText: {
    ...glassTheme.typography.caption,
    color: glassTheme.colors.text.tertiary,
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
  modalContactHeader: {
    alignItems: 'center',
    paddingVertical: glassTheme.spacing.lg,
    gap: glassTheme.spacing.md,
  },
  modalContactInfo: {
    alignItems: 'center',
    gap: 4,
  },
  modalContactName: {
    ...glassTheme.typography.h1,
    color: glassTheme.colors.text.primary,
    textAlign: 'center',
  },
  modalContactTitle: {
    ...glassTheme.typography.body,
    color: glassTheme.colors.text.secondary,
  },
  modalCompanyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  modalCompanyName: {
    ...glassTheme.typography.bodySmall,
    color: glassTheme.colors.text.tertiary,
  },
  modalSection: {
    marginBottom: glassTheme.spacing.lg,
  },
  sectionTitle: {
    ...glassTheme.typography.label,
    color: glassTheme.colors.text.tertiary,
    marginBottom: glassTheme.spacing.sm,
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
  historySection: {
    marginTop: glassTheme.spacing.md,
  },
  historyContent: {
    marginTop: glassTheme.spacing.md,
    gap: glassTheme.spacing.sm,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderRadius: glassTheme.radius.md,
    padding: glassTheme.spacing.sm,
    gap: glassTheme.spacing.sm,
  },
  activityIconContainer: {
    width: 36,
    height: 36,
    borderRadius: glassTheme.radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityContent: {
    flex: 1,
  },
  activityDescription: {
    ...glassTheme.typography.body,
    color: glassTheme.colors.text.primary,
    marginBottom: 2,
  },
  activityDate: {
    ...glassTheme.typography.caption,
    color: glassTheme.colors.text.tertiary,
  },
  emptyHistoryState: {
    alignItems: 'center',
    paddingVertical: glassTheme.spacing.xl,
  },
  emptyHistoryText: {
    ...glassTheme.typography.body,
    color: glassTheme.colors.text.tertiary,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderRadius: glassTheme.radius.md,
    padding: glassTheme.spacing.sm,
  },
  historyItemLeft: {
    flex: 1,
  },
  historyItemRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  historyItemTitle: {
    ...glassTheme.typography.body,
    fontWeight: '600',
    color: glassTheme.colors.text.primary,
  },
  historyItemDate: {
    ...glassTheme.typography.caption,
    color: glassTheme.colors.text.tertiary,
  },
  historyItemAmount: {
    ...glassTheme.typography.h3,
    color: glassTheme.colors.text.primary,
  },
  paymentMethod: {
    ...glassTheme.typography.caption,
    color: glassTheme.colors.text.tertiary,
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    gap: glassTheme.spacing.sm,
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
  formLabel: {
    ...glassTheme.typography.bodySmall,
    fontWeight: '600',
    color: glassTheme.colors.text.secondary,
    marginBottom: glassTheme.spacing.sm,
  },
  activityTypeSelect: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: glassTheme.spacing.sm,
    marginBottom: glassTheme.spacing.md,
  },
  activityTypeButton: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: glassTheme.radius.md,
    paddingVertical: glassTheme.spacing.sm,
    paddingHorizontal: glassTheme.spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    gap: 8,
  },
  activityTypeLabel: {
    ...glassTheme.typography.bodySmall,
    fontWeight: '600',
    color: glassTheme.colors.text.secondary,
  },
  addressSection: {
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    padding: glassTheme.spacing.md,
    borderRadius: glassTheme.radius.lg,
    marginTop: glassTheme.spacing.md,
  },
  addressSectionTitle: {
    ...glassTheme.typography.h3,
    color: glassTheme.colors.text.primary,
    marginBottom: glassTheme.spacing.md,
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  pickerWrapper: {
    marginBottom: glassTheme.spacing.md,
  },
  pickerLabel: {
    ...glassTheme.typography.bodySmall,
    fontWeight: '600',
    color: glassTheme.colors.text.secondary,
    marginBottom: glassTheme.spacing.xs,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: glassTheme.radius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    overflow: 'hidden',
  },
  picker: {
    fontSize: 16,
    color: glassTheme.colors.text.primary,
    height: Platform.OS === 'web' ? 44 : undefined,
  },
});
