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
import { customerService, companyService, activitiesService } from '../services/api';
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
import { useAuth } from '../contexts/AuthContext';

type ContactsScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Contacts'>;
};

interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  created_at: string;
  updated_at: string;
}

interface Company {
  id: string;
  name: string;
  industry: string;
  website: string;
  phone: string;
  email: string;
  address: any;
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

  // Contact modal states
  const [contactModalVisible, setContactModalVisible] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [contactActivities, setContactActivities] = useState<Activity[]>([]);
  const [newContactModalVisible, setNewContactModalVisible] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
  });

  // Company modal states
  const [companyModalVisible, setCompanyModalVisible] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [newCompanyModalVisible, setNewCompanyModalVisible] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [companyForm, setCompanyForm] = useState({
    name: '',
    industry: '',
    website: '',
    phone: '',
    email: '',
    address: '',
  });

  // Activity modal
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
        customerService.getAll(),
        companyService.getAll(),
      ]);
      setContacts(contactsRes.data);
      setCompanies(companiesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      if (Platform.OS === 'web') {
        alert('Erreur lors du chargement des données');
      } else {
        Alert.alert('Erreur', 'Impossible de charger les données');
      }
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
            c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.company?.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
      setFilteredContacts(filtered);
    } else {
      let filtered = companies;
      if (searchQuery) {
        filtered = filtered.filter(
          (c) =>
            c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
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

  // Contact handlers
  const openContactDetails = async (contact: Contact) => {
    setSelectedContact(contact);
    setContactModalVisible(true);

    // Fetch activities for this contact
    try {
      const res = await activitiesService.getByContact(contact.id);
      setContactActivities(res.data);
    } catch (error) {
      console.error('Error fetching activities:', error);
    }
  };

  const handleCreateContact = async () => {
    if (!contactForm.name.trim() || !contactForm.email.trim()) {
      if (Platform.OS === 'web') {
        alert('Le nom et l\'email sont obligatoires');
      } else {
        Alert.alert('Erreur', 'Le nom et l\'email sont obligatoires');
      }
      return;
    }

    try {
      if (editingContact) {
        await customerService.update(parseInt(editingContact.id), contactForm);
      } else {
        await customerService.create(contactForm as any);
      }

      setNewContactModalVisible(false);
      resetContactForm();
      fetchData();

      if (Platform.OS === 'web') {
        alert(`Contact ${editingContact ? 'modifié' : 'créé'} avec succès`);
      } else {
        Alert.alert('Succès', `Contact ${editingContact ? 'modifié' : 'créé'} avec succès`);
      }
    } catch (error) {
      console.error('Error saving contact:', error);
      if (Platform.OS === 'web') {
        alert('Erreur lors de la sauvegarde du contact');
      } else {
        Alert.alert('Erreur', 'Impossible de sauvegarder le contact');
      }
    }
  };

  const handleEditContact = (contact: Contact) => {
    setEditingContact(contact);
    setContactForm({
      name: contact.name,
      email: contact.email || '',
      phone: contact.phone || '',
      company: contact.company || '',
    });
    setContactModalVisible(false);
    setNewContactModalVisible(true);
  };

  const handleDeleteContact = async (contact: Contact) => {
    const confirmDelete = () => {
      customerService
        .delete(parseInt(contact.id))
        .then(() => {
          setContactModalVisible(false);
          fetchData();
          if (Platform.OS === 'web') {
            alert('Contact supprimé avec succès');
          } else {
            Alert.alert('Succès', 'Contact supprimé avec succès');
          }
        })
        .catch((error) => {
          console.error('Error deleting contact:', error);
          if (Platform.OS === 'web') {
            alert('Erreur lors de la suppression');
          } else {
            Alert.alert('Erreur', 'Impossible de supprimer le contact');
          }
        });
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Êtes-vous sûr de vouloir supprimer ce contact ?')) {
        confirmDelete();
      }
    } else {
      Alert.alert(
        'Confirmer',
        'Êtes-vous sûr de vouloir supprimer ce contact ?',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Supprimer', onPress: confirmDelete, style: 'destructive' },
        ]
      );
    }
  };

  const resetContactForm = () => {
    setContactForm({
      name: '',
      email: '',
      phone: '',
      company: '',
    });
    setEditingContact(null);
  };

  // Company handlers
  const openCompanyDetails = (company: Company) => {
    setSelectedCompany(company);
    setCompanyModalVisible(true);
  };

  const handleCreateCompany = async () => {
    if (!companyForm.name.trim()) {
      if (Platform.OS === 'web') {
        alert('Le nom de l\'entreprise est obligatoire');
      } else {
        Alert.alert('Erreur', 'Le nom de l\'entreprise est obligatoire');
      }
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

      if (Platform.OS === 'web') {
        alert(`Entreprise ${editingCompany ? 'modifiée' : 'créée'} avec succès`);
      } else {
        Alert.alert('Succès', `Entreprise ${editingCompany ? 'modifiée' : 'créée'} avec succès`);
      }
    } catch (error) {
      console.error('Error saving company:', error);
      if (Platform.OS === 'web') {
        alert('Erreur lors de la sauvegarde de l\'entreprise');
      } else {
        Alert.alert('Erreur', 'Impossible de sauvegarder l\'entreprise');
      }
    }
  };

  const handleEditCompany = (company: Company) => {
    setEditingCompany(company);
    setCompanyForm({
      name: company.name,
      industry: company.industry || '',
      website: company.website || '',
      phone: company.phone || '',
      email: company.email || '',
      address: typeof company.address === 'string' ? company.address : JSON.stringify(company.address || ''),
    });
    setCompanyModalVisible(false);
    setNewCompanyModalVisible(true);
  };

  const handleDeleteCompany = async (company: Company) => {
    const confirmDelete = () => {
      companyService
        .delete(company.id)
        .then(() => {
          setCompanyModalVisible(false);
          fetchData();
          if (Platform.OS === 'web') {
            alert('Entreprise supprimée avec succès');
          } else {
            Alert.alert('Succès', 'Entreprise supprimée avec succès');
          }
        })
        .catch((error) => {
          console.error('Error deleting company:', error);
          if (Platform.OS === 'web') {
            alert('Erreur lors de la suppression');
          } else {
            Alert.alert('Erreur', 'Impossible de supprimer l\'entreprise');
          }
        });
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Êtes-vous sûr de vouloir supprimer cette entreprise ?')) {
        confirmDelete();
      }
    } else {
      Alert.alert(
        'Confirmer',
        'Êtes-vous sûr de vouloir supprimer cette entreprise ?',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Supprimer', onPress: confirmDelete, style: 'destructive' },
        ]
      );
    }
  };

  const resetCompanyForm = () => {
    setCompanyForm({
      name: '',
      industry: '',
      website: '',
      phone: '',
      email: '',
      address: '',
    });
    setEditingCompany(null);
  };

  // Activity handlers
  const handleCreateActivity = async () => {
    if (!selectedContact) return;

    try {
      const { type, description, duration_minutes, subject } = activityForm;

      if (type === 'call') {
        await activitiesService.createCall({
          contact_id: selectedContact.id,
          duration_minutes: parseInt(duration_minutes) || 0,
          notes: description,
        });
      } else if (type === 'email') {
        await activitiesService.createEmail({
          contact_id: selectedContact.id,
          subject: subject,
          email_body: description,
        });
      } else if (type === 'meeting') {
        await activitiesService.createMeeting({
          contact_id: selectedContact.id,
          title: subject,
          start_time: new Date().toISOString(),
          notes: description,
        });
      } else {
        await activitiesService.createNote({
          contact_id: selectedContact.id,
          content: description,
        });
      }

      setActivityModalVisible(false);
      resetActivityForm();

      // Reload activities
      const res = await activitiesService.getByContact(selectedContact.id);
      setContactActivities(res.data);

      if (Platform.OS === 'web') {
        alert('Activité enregistrée avec succès');
      } else {
        Alert.alert('Succès', 'Activité enregistrée avec succès');
      }
    } catch (error) {
      console.error('Error creating activity:', error);
      if (Platform.OS === 'web') {
        alert('Erreur lors de l\'enregistrement de l\'activité');
      } else {
        Alert.alert('Erreur', 'Impossible d\'enregistrer l\'activité');
      }
    }
  };

  const resetActivityForm = () => {
    setActivityForm({
      type: 'note',
      description: '',
      duration_minutes: '',
      subject: '',
    });
  };

  const stats = {
    totalContacts: contacts.length,
    totalCompanies: companies.length,
    contactsWithEmail: contacts.filter((c) => c.email).length,
    contactsWithPhone: contacts.filter((c) => c.phone).length,
  };

  const renderContact = (contact: Contact) => {
    return (
      <TouchableOpacity
        key={contact.id}
        style={styles.card}
        onPress={() => openContactDetails(contact)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {contact.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardName}>{contact.name}</Text>
            {contact.company && (
              <Text style={styles.cardCompany}>{contact.company}</Text>
            )}
            <View style={styles.cardMeta}>
              {contact.email && (
                <Text style={styles.cardMetaText} numberOfLines={1}>
                  {contact.email}
                </Text>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderCompany = (company: Company) => {
    return (
      <TouchableOpacity
        key={company.id}
        style={styles.card}
        onPress={() => openCompanyDetails(company)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.avatar, { backgroundColor: '#34C759' }]}>
            <BuildingIcon size={24} color="#FFFFFF" />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardName}>{company.name}</Text>
            {company.industry && (
              <Text style={styles.cardCompany}>{company.industry}</Text>
            )}
            <View style={styles.cardMeta}>
              {company.email && (
                <Text style={styles.cardMetaText} numberOfLines={1}>
                  {company.email}
                </Text>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
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

      {/* Header */}
      <View style={styles.header}>
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
          onPress={() => {
            if (viewMode === 'contacts') {
              setNewContactModalVisible(true);
            } else {
              setNewCompanyModalVisible(true);
            }
          }}
        >
          <Text style={styles.addButtonText}>+ Nouveau</Text>
        </TouchableOpacity>
      </View>

      {/* View Mode Toggle */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[styles.toggleButton, viewMode === 'contacts' && styles.toggleButtonActive]}
          onPress={() => setViewMode('contacts')}
        >
          <UsersIcon size={18} color={viewMode === 'contacts' ? '#FFFFFF' : '#8E8E93'} />
          <Text style={[styles.toggleText, viewMode === 'contacts' && styles.toggleTextActive]}>
            Contacts ({stats.totalContacts})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, viewMode === 'companies' && styles.toggleButtonActive]}
          onPress={() => setViewMode('companies')}
        >
          <BuildingIcon size={18} color={viewMode === 'companies' ? '#FFFFFF' : '#8E8E93'} />
          <Text style={[styles.toggleText, viewMode === 'companies' && styles.toggleTextActive]}>
            Entreprises ({stats.totalCompanies})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
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

      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder={viewMode === 'contacts' ? 'Rechercher un contact...' : 'Rechercher une entreprise...'}
          placeholderTextColor="#8E8E93"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* List */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {viewMode === 'contacts' ? (
          filteredContacts.length > 0 ? (
            filteredContacts.map((contact) => renderContact(contact))
          ) : (
            <View style={styles.emptyState}>
              <UsersIcon size={64} color="#D1D1D6" />
              <Text style={styles.emptyText}>Aucun contact trouvé</Text>
            </View>
          )
        ) : (
          filteredCompanies.length > 0 ? (
            filteredCompanies.map((company) => renderCompany(company))
          ) : (
            <View style={styles.emptyState}>
              <BuildingIcon size={64} color="#D1D1D6" />
              <Text style={styles.emptyText}>Aucune entreprise trouvée</Text>
            </View>
          )
        )}
      </ScrollView>

      {/* Modals... (Contact Detail, Company Detail, Forms, Activity) - continuing in next part */}
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
    fontSize: 17,
    color: '#8E8E93',
    fontWeight: '500',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 16,
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
  toggleContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    gap: 6,
  },
  toggleButtonActive: {
    backgroundColor: '#007AFF',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
  },
  toggleTextActive: {
    color: '#FFFFFF',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 12,
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
    gap: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
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
  list: {
    flex: 1,
  },
  listContent: {
    padding: 20,
    gap: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  cardCompany: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardMetaText: {
    fontSize: 13,
    color: '#8E8E93',
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
});
