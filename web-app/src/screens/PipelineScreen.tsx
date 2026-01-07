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
  Dimensions,
  ActivityIndicator,
  GestureResponderEvent,
  Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { XCircleIcon } from '../components/Icons';
import Navigation from '../components/Navigation';
import { pipelineService, companyService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import DateTimePickerWrapper from '../components/shared/DateTimePickerWrapper';
import {
  MaybeDraxProvider,
  MaybeDraxDraggable,
  MaybeDraxDroppable,
} from '../components/shared/MaybeDrax';
import logger from '../utils/logger';
import ConfirmModal from '../components/shared/ConfirmModal';

type PipelineScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Pipeline'>;
};

interface Opportunity {
  id: string;
  name: string;
  customer_id?: string;
  customer_name?: string;
  user_id?: string;
  owner_name?: string;
  stage_id: string;
  stage_name?: string;
  stage_color?: string;
  value: number;
  probability: number;
  expected_close_date: string;
  description?: string;
  deleted_at?: string;
}

interface PipelineStage {
  id: string;
  pipeline_id: string;
  name: string;
  color: string;
  display_order: number;
  win_probability?: number;
}

interface Company {
  id: string;
  name: string;
  industry?: string;
  website?: string;
  phone?: string;
  email?: string;
}

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = Math.min(width - 40, 320);
const DEFAULT_USER_ID = '00000000-0000-0000-0002-000000000001';

const isValidUUID = (value?: string | null) => {
  if (!value) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
};

export default function PipelineScreen({ navigation }: PipelineScreenProps) {
  const { user } = useAuth();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [newOppModalVisible, setNewOppModalVisible] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editForm, setEditForm] = useState<Opportunity | null>(null);
  const [companyDropdownOpen, setCompanyDropdownOpen] = useState(false);
  const [newCompanyModalVisible, setNewCompanyModalVisible] = useState(false);
  const [newCompanyForm, setNewCompanyForm] = useState({
    name: '',
    email: '',
    phone: '',
    industry: '',
    website: '',
  });
  const [newOppForm, setNewOppForm] = useState({
    name: '',
    value: '',
    probability: '20',
    expected_close_date: '',
    description: '',
    stage_id: '',
    customer_id: '',
    contact_id: '',
  });
  const [recentlyDeleted, setRecentlyDeleted] = useState<Opportunity[]>([]);
  const [activeTab, setActiveTab] = useState<'pipeline' | 'deleted'>('pipeline');
  const [draggingOpportunityId, setDraggingOpportunityId] = useState<string | null>(null);
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'new' | 'edit'>('new');
  const [datePickerInitialDate, setDatePickerInitialDate] = useState<Date>(new Date());
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [opportunityToDelete, setOpportunityToDelete] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [opportunitiesRes, stagesRes, companiesRes, deletedRes] = await Promise.all([
        pipelineService.getOpportunities(),
        pipelineService.getStages(),
        companyService.getAll(),
        pipelineService.getRecentlyDeletedOpportunities({ limit: 50 }),
      ]);

      setOpportunities(opportunitiesRes.data);
      setStages(stagesRes.data);
      setCompanies(companiesRes.data);
      setRecentlyDeleted(deletedRes.data);

      // Set default stage_id when stages are loaded
      if (stagesRes.data.length > 0) {
        setNewOppForm(prev => ({ ...prev, stage_id: prev.stage_id || stagesRes.data[0].id }));
      }
    } catch (err: any) {
      console.error('Erreur lors du chargement des données:', err);
      Alert.alert('Erreur', 'Impossible de charger les opportunités');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }).format(amount / 1000000) + 'M';
    } else if (amount >= 1000) {
      return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount / 1000) + 'K';
    }
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDateDisplay = (dateValue?: string) => {
    if (!dateValue) {
      return 'Sélectionner une date';
    }

    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) {
      return 'Sélectionner une date';
    }

    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const showDatePicker = (mode: 'new' | 'edit') => {
    const rawDate = mode === 'new' ? newOppForm.expected_close_date : editForm?.expected_close_date;
    setDatePickerInitialDate(rawDate ? new Date(rawDate) : new Date());
    setDatePickerMode(mode);
    setDatePickerVisible(true);
  };

  const handleDateConfirm = (selectedDate: Date) => {
    const formatted = selectedDate.toISOString().split('T')[0];

    if (datePickerMode === 'new') {
      setNewOppForm(prev => ({ ...prev, expected_close_date: formatted }));
    } else {
      const currentEditId = editForm?.id;
      setEditForm(prev => (prev ? { ...prev, expected_close_date: formatted } : prev));
      setSelectedOpportunity(prev =>
        prev && (!currentEditId || prev.id === currentEditId)
          ? { ...prev, expected_close_date: formatted }
          : prev
      );
    }

    setDatePickerVisible(false);
  };

  const handleDateCancel = () => {
    setDatePickerVisible(false);
  };

  const getTotalValue = (stageId: string) => {
    return opportunities
      .filter((opp) => opp.stage_id === stageId)
      .reduce((sum, opp) => sum + opp.value, 0);
  };

  const getWeightedValue = (stageId: string) => {
    return opportunities
      .filter((opp) => opp.stage_id === stageId)
      .reduce((sum, opp) => sum + (opp.value * opp.probability) / 100, 0);
  };

  const handleCreateOpportunity = async () => {
    if (!newOppForm.name.trim()) {
      Alert.alert('Erreur', 'Veuillez remplir le nom');
      return;
    }

    if (!user?.id) {
      Alert.alert('Erreur', 'Utilisateur non connecté');
      return;
    }

    const userIdCandidate = typeof user.id === 'string' ? user.id : String(user.id);
    const userId = isValidUUID(userIdCandidate) ? userIdCandidate : DEFAULT_USER_ID;

    const customerId = isValidUUID(newOppForm.customer_id)
      ? newOppForm.customer_id
      : undefined;

    const data = {
      name: newOppForm.name,
      customer_id: customerId,
      user_id: userId,
      stage_id: newOppForm.stage_id,
      value: parseFloat(newOppForm.value) || 0,
      probability: parseInt(newOppForm.probability) || 20,
      expected_close_date: newOppForm.expected_close_date || new Date().toISOString().split('T')[0],
      description: newOppForm.description,
    };

    try {
      const response = await pipelineService.createOpportunity(data);
      const createdId: string = response.data?.id || `tmp-${Date.now()}`;
      const stageInfo = stages.find(stage => stage.id === data.stage_id);
      const companyInfo = customerId ? companies.find(company => company.id === customerId) : undefined;

      const createdOpportunity: Opportunity = {
        id: createdId,
        name: data.name,
        customer_id: customerId ?? undefined,
        customer_name: companyInfo?.name,
        user_id: userId,
        owner_name: user?.full_name || undefined,
        stage_id: data.stage_id,
        stage_name: stageInfo?.name,
        stage_color: stageInfo?.color,
        value: data.value,
        probability: data.probability ?? 0,
        expected_close_date: data.expected_close_date,
        description: data.description || '',
      };

      setOpportunities(prev => [...prev, createdOpportunity]);

      setNewOppForm({
        name: '',
        value: '',
        probability: '20',
        expected_close_date: '',
        description: '',
        stage_id: stages.length > 0 ? stages[0].id : '',
        customer_id: '',
        contact_id: '',
      });
      setNewOppModalVisible(false);
      Alert.alert('Succès', 'Opportunité créée!');
    } catch (err: any) {
      console.error('Erreur création opportunité:', err);
      console.error('Réponse serveur:', err.response?.data);
      console.error('Données envoyées:', data);
      Alert.alert('Erreur', err.response?.data?.error || 'Impossible de créer l\'opportunité');
    }
  };

  const handleResetOppForm = () => {
    setNewOppForm({
      name: '',
      value: '',
      probability: '20',
      expected_close_date: '',
      description: '',
      stage_id: stages.length > 0 ? stages[0].id : '',
      customer_id: '',
      contact_id: '',
    });
    setNewOppModalVisible(false);
    setCompanyDropdownOpen(false);
  };

  const handleCreateCompany = async () => {
    if (!newCompanyForm.name.trim()) {
      Alert.alert('Erreur', 'Veuillez remplir le nom de l\'entreprise');
      return;
    }

    try {
      const response = await companyService.create(newCompanyForm);
      const newCompany = response.data;

      // Refresh company list
      const companiesRes = await companyService.getAll();
      setCompanies(companiesRes.data);

      // Auto-select the newly created company
      setNewOppForm(prev => ({ ...prev, customer_id: newCompany.id }));

      // Reset form and close modal
      setNewCompanyForm({ name: '', email: '', phone: '', industry: '', website: '' });
      setNewCompanyModalVisible(false);

      Alert.alert('Succès', 'Entreprise créée avec succès');
    } catch (err: any) {
      console.error('Erreur création entreprise:', err);
      Alert.alert('Erreur', err.response?.data?.error || 'Impossible de créer l\'entreprise');
    }
  };

  const applyStageToOpportunityState = (opportunityId: string, stageId: string) => {
    const stageInfo = stages.find(stage => stage.id === stageId);

    setOpportunities(prev =>
      prev.map(opp =>
        opp.id === opportunityId
          ? {
              ...opp,
              stage_id: stageId,
              stage_name: stageInfo?.name || opp.stage_name,
              stage_color: stageInfo?.color || opp.stage_color,
            }
          : opp
      )
    );

    setSelectedOpportunity(prev =>
      prev && prev.id === opportunityId
        ? {
            ...prev,
            stage_id: stageId,
            stage_name: stageInfo?.name || prev.stage_name,
            stage_color: stageInfo?.color || prev.stage_color,
          }
        : prev
    );

    setEditForm(prev =>
      prev && prev.id === opportunityId
        ? {
            ...prev,
            stage_id: stageId,
            stage_name: stageInfo?.name || prev.stage_name,
            stage_color: stageInfo?.color || prev.stage_color,
          }
        : prev
    );
  };

  const moveOpportunity = async (opportunityId: string, newStageId: string) => {
    const currentOpportunity = opportunities.find(opp => opp.id === opportunityId);

    if (!currentOpportunity || currentOpportunity.stage_id === newStageId) {
      setDraggingOpportunityId(null);
      return;
    }

    const previousStageId = currentOpportunity.stage_id;

    applyStageToOpportunityState(opportunityId, newStageId);

    try {
      await pipelineService.moveOpportunityToStage(opportunityId, newStageId);
    } catch (err: any) {
      console.error('Erreur déplacement opportunité:', err);
      applyStageToOpportunityState(opportunityId, previousStageId);
      Alert.alert('Erreur', 'Impossible de déplacer l\'opportunité');
    } finally {
      setDraggingOpportunityId(null);
    }
  };

  const openOpportunityDetails = (opportunity: Opportunity) => {
    setSelectedOpportunity({ ...opportunity });
    setEditForm({ ...opportunity });
    setIsEditMode(false);
    setModalVisible(true);
  };

  const handleUpdateOpportunity = async () => {
    if (!editForm) return;

    try {
      const customerId = isValidUUID(editForm.customer_id)
        ? editForm.customer_id
        : null;

      const userIdFromEdit =
        typeof editForm.user_id === 'string'
          ? editForm.user_id
          : editForm.user_id
          ? String(editForm.user_id)
          : undefined;
      const userIdFromContext =
        typeof user?.id === 'string'
          ? user.id
          : user?.id
          ? String(user.id)
          : undefined;
      const userId = isValidUUID(userIdFromEdit)
        ? userIdFromEdit!
        : isValidUUID(userIdFromContext)
        ? userIdFromContext!
        : DEFAULT_USER_ID;

      const normalizedValue =
        typeof editForm.value === 'number' && !Number.isNaN(editForm.value)
          ? editForm.value
          : parseFloat(String(editForm.value)) || 0;

      const parsedProbability =
        typeof editForm.probability === 'number'
          ? editForm.probability
          : parseInt(String(editForm.probability), 10);
      const normalizedProbability =
        Number.isFinite(parsedProbability)
          ? Math.min(100, Math.max(0, parsedProbability as number))
          : undefined;

      const normalizedExpectedCloseDate =
        editForm.expected_close_date && editForm.expected_close_date.trim().length > 0
          ? editForm.expected_close_date
          : new Date().toISOString().split('T')[0];

      const data = {
        name: editForm.name,
        customer_id: customerId ?? null,
        user_id: userId,
        stage_id: editForm.stage_id,
        value: normalizedValue,
        probability: normalizedProbability,
        expected_close_date: normalizedExpectedCloseDate,
        description: editForm.description || '',
      };

      await pipelineService.updateOpportunity(editForm.id, data);

      const stageInfo = stages.find(stage => stage.id === data.stage_id);
      const companyInfo = companies.find(company => company.id === (customerId ?? ''));

      const updatedOpportunity: Opportunity = {
        ...editForm,
        ...data,
        customer_id: customerId ?? undefined,
        customer_name: companyInfo?.name,
        stage_name: stageInfo?.name ?? editForm.stage_name,
        stage_color: stageInfo?.color ?? editForm.stage_color,
        probability: data.probability ?? editForm.probability,
      };

      setOpportunities(prev =>
        prev.map(opp => (opp.id === editForm.id ? { ...opp, ...updatedOpportunity } : opp))
      );
      setSelectedOpportunity(prev =>
        prev && prev.id === editForm.id ? { ...prev, ...updatedOpportunity } : prev
      );
      setEditForm(updatedOpportunity);

      setIsEditMode(false);
      Alert.alert('Succès', 'Opportunité mise à jour');
    } catch (err: any) {
      console.error('Erreur mise à jour opportunité:', err);
      Alert.alert('Erreur', 'Impossible de mettre à jour l\'opportunité');
    }
  };

  const handleDeleteOpportunity = (id: string | number) => {
    setOpportunityToDelete(id.toString());
    setConfirmModalVisible(true);
  };

  const confirmDeleteOpportunity = async () => {
    if (!opportunityToDelete) return;

    const id = opportunityToDelete;
    const opportunityData = opportunities.find(opp => opp.id === id);

    setConfirmModalVisible(false);
    setOpportunityToDelete(null);

    try {
      logger.info('DELETE', 'Deleting opportunity', { opportunityId: id });
      await pipelineService.deleteOpportunity(id);
      setOpportunities(prev => prev.filter(opp => opp.id !== id));
      setModalVisible(false);
      setIsEditMode(false);
      setSelectedOpportunity(prev => (prev && prev.id === id ? null : prev));
      setEditForm(prev => (prev && prev.id === id ? null : prev));
      setRecentlyDeleted(prev =>
        opportunityData
          ? [
              { ...opportunityData, deleted_at: new Date().toISOString() },
              ...prev,
            ].slice(0, 50)
          : prev
      );
      logger.success('DELETE', 'Opportunity deleted successfully', { opportunityId: id });
    } catch (err: any) {
      console.error('Erreur suppression opportunité:', err);
      logger.error('DELETE', 'Failed to delete opportunity', { opportunityId: id, error: err.message });

      if (Platform.OS === 'web') {
        alert('Erreur: Impossible de supprimer l\'opportunité');
      } else {
        Alert.alert('Erreur', 'Impossible de supprimer l\'opportunité');
      }
    }
  };

  const renderOpportunityCard = (opportunity: Opportunity, index: number) => {
    const stageColor = opportunity.stage_color || stages.find(s => s.id === opportunity.stage_id)?.color || '#007AFF';
    const isDragging = draggingOpportunityId === opportunity.id;

    const cardContent = (
      <View style={[styles.opportunityCard, isDragging && styles.opportunityCardDragging]}>
        <TouchableOpacity
          style={styles.cardClickableArea}
          onPress={() => openOpportunityDetails(opportunity)}
          activeOpacity={0.85}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {opportunity.name}
            </Text>
            <View style={styles.cardHeaderRight}>
              <View style={[styles.probabilityBadge, { backgroundColor: `${stageColor}20` }]}>
                <Text style={[styles.probabilityText, { color: stageColor }]}>
                  {opportunity.probability}%
                </Text>
              </View>
            </View>
          </View>

          <Text style={styles.cardCompany}>{opportunity.customer_name || 'Client non défini'}</Text>

          <View style={styles.cardFooter}>
            <Text style={styles.cardValue}>{formatCurrency(opportunity.value)}</Text>
            <Text style={styles.cardDate}>
              {new Date(opportunity.expected_close_date).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'short',
              })}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cardDeleteButton}
          onPress={(event: GestureResponderEvent) => {
            event.stopPropagation();
            logger.click('PipelineScreen', 'Delete button clicked', { opportunityId: opportunity.id });
            handleDeleteOpportunity(opportunity.id);
          }}
          // @ts-ignore
          data-no-drag="true"
          // @ts-ignore
          pointerEvents="auto"
        >
          <Text style={styles.cardDeleteText}>Supprimer</Text>
        </TouchableOpacity>
      </View>
    );

    return (
      <MaybeDraxDraggable
        key={`opp-${opportunity.id}-${index}`}
        payload={opportunity.id}
        style={styles.draggableWrapper}
        draggingStyle={styles.draggableWrapperDragging}
        onDragStart={() => setDraggingOpportunityId(opportunity.id)}
        onDragEnd={() => setDraggingOpportunityId(prev => (prev === opportunity.id ? null : prev))}
      >
        {cardContent}
      </MaybeDraxDraggable>
    );
  };

  const handleRestoreOpportunity = async (id: string | number) => {
    try {
      logger.info('PIPELINE', 'Restoring opportunity', { opportunityId: id });
      await pipelineService.restoreOpportunity(id);

      // Remove from deleted list and refresh
      setRecentlyDeleted((prev) => prev.filter((opp) => opp.id !== id));

      // Refresh the main opportunities list
      const oppRes = await pipelineService.getOpportunities();
      setOpportunities(oppRes.data);

      logger.success('PIPELINE', 'Opportunity restored successfully', { opportunityId: id });

      if (Platform.OS === 'web') {
        alert('Opportunité restaurée avec succès');
      } else {
        Alert.alert('Succès', 'Opportunité restaurée avec succès');
      }
    } catch (err: any) {
      logger.error('PIPELINE', 'Failed to restore opportunity', { opportunityId: id, error: err.message });
      console.error('Erreur restauration opportunité:', err);

      if (Platform.OS === 'web') {
        alert('Erreur: Impossible de restaurer l\'opportunité');
      } else {
        Alert.alert('Erreur', 'Impossible de restaurer l\'opportunité');
      }
    }
  };

  const renderDeletedOpportunityCard = (opportunity: Opportunity, index: number) => {
    const deletedDate = opportunity.deleted_at
      ? new Date(opportunity.deleted_at).toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : 'Date inconnue';

    const previousStage =
      opportunity.stage_name ||
      stages.find(stage => stage.id === opportunity.stage_id)?.name ||
      'N/A';

    return (
      <View key={`deleted-${opportunity.id}-${index}`} style={styles.deletedCard}>
        <View style={styles.deletedHeader}>
          <Text style={styles.deletedTitle} numberOfLines={2}>
            {opportunity.name}
          </Text>
          <Text style={styles.deletedDate}>{deletedDate}</Text>
        </View>
        <Text style={styles.deletedValue}>{formatCurrency(opportunity.value)}</Text>
        <Text style={styles.deletedStage}>Stage précédent: {previousStage}</Text>
        {opportunity.description ? (
          <Text style={styles.deletedDescription} numberOfLines={3}>
            {opportunity.description}
          </Text>
        ) : null}
        <TouchableOpacity
          style={styles.restoreButton}
          onPress={() => handleRestoreOpportunity(opportunity.id)}
        >
          <Text style={styles.restoreButtonText}>Restaurer</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const getFilteredOpportunities = () => {
    if (!searchQuery.trim()) return opportunities;

    const query = searchQuery.toLowerCase().trim();
    return opportunities.filter(opp =>
      opp.name.toLowerCase().includes(query) ||
      opp.customer_name?.toLowerCase().includes(query) ||
      opp.description?.toLowerCase().includes(query)
    );
  };

  const renderColumn = (stage: PipelineStage) => {
    const filteredOpps = getFilteredOpportunities();
    const columnOpportunities = filteredOpps.filter((opp) => opp.stage_id === stage.id);
    const totalValue = columnOpportunities.reduce((sum, opp) => sum + opp.value, 0);
    const weightedValue = columnOpportunities.reduce((sum, opp) => sum + (opp.value * opp.probability) / 100, 0);

    return (
      <View key={stage.id} style={styles.column}>
        <View style={[styles.columnHeader, { borderTopColor: stage.color }]}>
          <View style={styles.columnTitleRow}>
            <Text style={styles.columnTitle}>{stage.name}</Text>
            <View style={[styles.countBadge, { backgroundColor: stage.color }]}>
              <Text style={styles.countText}>{columnOpportunities.length}</Text>
            </View>
          </View>
          <Text style={styles.columnValue}>{formatCurrency(totalValue)}</Text>
          <Text style={styles.columnWeighted}>
            Pondéré: {formatCurrency(weightedValue)}
          </Text>
        </View>

        <MaybeDraxDroppable
          style={styles.columnDropZone}
          activeStyle={styles.columnDropZoneActive}
          onReceive={(payload) => {
            moveOpportunity(payload, stage.id);
          }}
        >
          <ScrollView
            style={styles.columnContent}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.columnCards}
          >
            {columnOpportunities.map((opp, idx) => renderOpportunityCard(opp, idx))}
            {columnOpportunities.length === 0 && (
              <View style={styles.emptyColumn}>
                <Text style={styles.emptyText}>Aucune opportunité</Text>
              </View>
            )}
          </ScrollView>
        </MaybeDraxDroppable>
      </View>
    );
  };

  const totalPipelineValue = opportunities.reduce((sum, opp) => sum + opp.value, 0);
  const totalWeightedValue = opportunities.reduce(
    (sum, opp) => sum + (opp.value * opp.probability) / 100,
    0
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <Navigation />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Navigation />
      {/* En-tête */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Pipeline</Text>
          <Text style={styles.headerSubtitle}>
            {opportunities.length} opportunités • {formatCurrency(totalPipelineValue)}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            // Ensure stage_id is set before opening modal
            if (stages.length > 0 && !newOppForm.stage_id) {
              setNewOppForm(prev => ({ ...prev, stage_id: stages[0].id }));
            }
            setNewOppModalVisible(true);
          }}
        >
          <Text style={styles.addButtonText}>+ Nouveau</Text>
        </TouchableOpacity>
      </View>

      {/* Barre de recherche */}
      {activeTab === 'pipeline' && (
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher par nom, client ou description..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#8E8E93"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              style={styles.clearSearchButton}
              onPress={() => setSearchQuery('')}
            >
              <Text style={styles.clearSearchText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Onglets */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'pipeline' && styles.tabButtonActive]}
          onPress={() => setActiveTab('pipeline')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'pipeline' && styles.tabButtonTextActive]}>
            Pipeline
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'deleted' && styles.tabButtonActive]}
          onPress={() => setActiveTab('deleted')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'deleted' && styles.tabButtonTextActive]}>
            Supprimé récemment
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'pipeline' ? (
        <MaybeDraxProvider>
          {/* Statistiques */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Valeur Totale</Text>
              <Text style={styles.statValue}>{formatCurrency(totalPipelineValue)}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Valeur Pondérée</Text>
              <Text style={[styles.statValue, { color: '#007AFF' }]}>
                {formatCurrency(totalWeightedValue)}
              </Text>
            </View>
          </View>

          {/* Colonnes Kanban */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.kanbanContainer}
            contentContainerStyle={styles.kanbanContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          >
            {stages.map(stage => renderColumn(stage))}
          </ScrollView>
        </MaybeDraxProvider>
      ) : (
        <View style={styles.deletedWrapper}>
          <ScrollView
            style={styles.deletedScroll}
            contentContainerStyle={styles.deletedContent}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          >
            {recentlyDeleted.length === 0 ? (
              <Text style={styles.emptyDeletedText}>
                Aucune opportunité supprimée au cours des 30 derniers jours
              </Text>
            ) : (
              recentlyDeleted.map((opp, idx) => renderDeletedOpportunityCard(opp, idx))
            )}
          </ScrollView>
        </View>
      )}

      {/* Modal Détails/Édition */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setModalVisible(false);
          setIsEditMode(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedOpportunity && editForm && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>
                    {isEditMode ? 'Modifier' : selectedOpportunity.name}
                  </Text>
                  <View style={styles.modalHeaderActions}>
                    {!isEditMode && (
                      <TouchableOpacity
                        onPress={() => setIsEditMode(true)}
                        style={styles.editButton}
                      >
                        <Text style={styles.editButtonText}>Modifier</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={() => {
                      setModalVisible(false);
                      setIsEditMode(false);
                    }}>
                      <XCircleIcon size={24} color="#8E8E93" />
                    </TouchableOpacity>
                  </View>
                </View>

                <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                  {isEditMode ? (
                    /* Mode Édition */
                    <>
                      <View style={styles.editGroup}>
                        <Text style={styles.editLabel}>Nom</Text>
                        <TextInput
                          style={styles.editInput}
                          value={editForm.name}
                          onChangeText={(text) => setEditForm({ ...editForm, name: text })}
                        />
                      </View>

                      <View style={styles.editGroup}>
                        <Text style={styles.editLabel}>Valeur (€)</Text>
                        <TextInput
                          style={styles.editInput}
                          value={editForm.value.toString()}
                          onChangeText={(text) => setEditForm({ ...editForm, value: parseFloat(text) || 0 })}
                          keyboardType="numeric"
                        />
                      </View>

                      <View style={styles.editGroup}>
                        <Text style={styles.editLabel}>Probabilité (%)</Text>
                        <TextInput
                          style={styles.editInput}
                          value={editForm.probability.toString()}
                          onChangeText={(text) => setEditForm({ ...editForm, probability: parseInt(text) || 0 })}
                          keyboardType="numeric"
                        />
                      </View>

                      <View style={styles.editGroup}>
                        <Text style={styles.editLabel}>Date de clôture</Text>
                        <TouchableOpacity
                          style={styles.editDateButton}
                          onPress={() => showDatePicker('edit')}
                          activeOpacity={0.85}
                        >
                          <Text
                            style={
                              editForm.expected_close_date
                                ? styles.editDateButtonText
                                : styles.editDatePlaceholderText
                            }
                          >
                            {formatDateDisplay(editForm.expected_close_date)}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      <View style={styles.editGroup}>
                        <Text style={styles.editLabel}>Stage</Text>
                        <View style={styles.statusSelectEdit}>
                          {stages.map((stage) => (
                            <TouchableOpacity
                              key={stage.id}
                              style={[
                                styles.statusButtonEdit,
                                editForm.stage_id === stage.id && styles.statusButtonEditActive,
                                { borderColor: stage.color }
                              ]}
                              onPress={() => setEditForm({ ...editForm, stage_id: stage.id })}
                            >
                              <Text style={[
                                styles.statusButtonEditText,
                                { color: editForm.stage_id === stage.id ? stage.color : '#8E8E93' }
                              ]}>
                                {stage.name}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>

                      <View style={styles.editGroup}>
                        <Text style={styles.editLabel}>Description</Text>
                        <TextInput
                          style={[styles.editInput, styles.editTextArea]}
                          value={editForm.description || ''}
                          onChangeText={(text) => setEditForm({ ...editForm, description: text })}
                          multiline
                          numberOfLines={4}
                        />
                      </View>

                      <View style={styles.editActions}>
                        <TouchableOpacity
                          style={styles.saveButton}
                          onPress={handleUpdateOpportunity}
                        >
                          <Text style={styles.saveButtonText}>Enregistrer</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.cancelButton}
                          onPress={() => {
                            setEditForm(selectedOpportunity);
                            setIsEditMode(false);
                          }}
                        >
                          <Text style={styles.cancelButtonText}>Annuler</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  ) : (
                    /* Mode Lecture */
                    <>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Client</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Customers' as any)}>
                          <Text style={[styles.detailValue, styles.linkText]}>
                            {selectedOpportunity.customer_name || 'Non défini'} →
                          </Text>
                        </TouchableOpacity>
                      </View>

                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Valeur</Text>
                        <Text style={[styles.detailValue, { color: '#34C759', fontWeight: '700' }]}>
                          {formatCurrency(selectedOpportunity.value)}
                        </Text>
                      </View>

                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Probabilité</Text>
                        <Text style={styles.detailValue}>{selectedOpportunity.probability}%</Text>
                      </View>

                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Date de clôture prévue</Text>
                        <Text style={styles.detailValue}>
                          {new Date(selectedOpportunity.expected_close_date).toLocaleDateString('fr-FR')}
                        </Text>
                      </View>

                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Stage</Text>
                        <Text style={styles.detailValue}>
                          {stages.find(s => s.id === selectedOpportunity.stage_id)?.name || 'N/A'}
                        </Text>
                      </View>

                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Devis associé</Text>
                        <TouchableOpacity onPress={() => {
                          setModalVisible(false);
                          navigation.navigate('Home' as any);
                        }}>
                          <Text style={[styles.detailValue, styles.linkText]}>
                            Voir le devis →
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {selectedOpportunity.description && (
                        <View style={styles.notesContainer}>
                          <Text style={styles.detailLabel}>Description</Text>
                          <Text style={styles.notesText}>{selectedOpportunity.description}</Text>
                        </View>
                      )}

                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => handleDeleteOpportunity(selectedOpportunity.id)}
                      >
                        <Text style={styles.deleteButtonText}>Supprimer l'opportunité</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </ScrollView>

                {!isEditMode && (
                  <View style={styles.modalActions}>
                    <Text style={styles.actionsTitle}>Changer le stage</Text>
                    <View style={styles.statusButtons}>
                      {stages.map((stage) => {
                        if (stage.id === selectedOpportunity.stage_id) return null;
                        return (
                          <TouchableOpacity
                            key={stage.id}
                            style={[styles.statusButton, { borderColor: stage.color }]}
                            onPress={() => {
                              moveOpportunity(selectedOpportunity.id, stage.id);
                              setModalVisible(false);
                            }}
                          >
                            <Text style={[styles.statusButtonText, { color: stage.color }]}>
                              {stage.name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Create Opportunity Modal */}
      <Modal
        visible={newOppModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={handleResetOppForm}
      >
        <View style={styles.newModalContainer}>
          <View style={styles.newModalContent}>
            <View style={styles.newModalHeader}>
              <Text style={styles.newModalTitle}>Nouvelle Opportunité</Text>
              <TouchableOpacity onPress={handleResetOppForm}>
                <Text style={styles.closeButtonNew}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.newModalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.formGroupOpp}>
                <Text style={styles.formLabelOpp}>Nom *</Text>
                <TextInput
                  style={styles.inputOpp}
                  placeholder="Ex: Migration Cloud"
                  value={newOppForm.name}
                  onChangeText={(text) => setNewOppForm({ ...newOppForm, name: text })}
                  placeholderTextColor="#C7C7CC"
                />
              </View>

              <View style={styles.formGroupOpp}>
                <Text style={styles.formLabelOpp}>Entreprise</Text>
                <TouchableOpacity
                  style={styles.dropdownButton}
                  onPress={() => setCompanyDropdownOpen(!companyDropdownOpen)}
                >
                  <Text style={styles.dropdownButtonText}>
                    {newOppForm.customer_id
                      ? companies.find(c => c.id === newOppForm.customer_id)?.name || 'Sélectionner une entreprise'
                      : 'Sélectionner une entreprise'}
                  </Text>
                  <Text style={styles.dropdownArrow}>{companyDropdownOpen ? '▲' : '▼'}</Text>
                </TouchableOpacity>

                {companyDropdownOpen && (
                  <View style={styles.dropdownList}>
                    <TouchableOpacity
                      style={styles.newCustomerButton}
                      onPress={() => {
                        setCompanyDropdownOpen(false);
                        setNewCompanyModalVisible(true);
                      }}
                    >
                      <Text style={styles.newCustomerButtonText}>+ Nouvelle Entreprise</Text>
                    </TouchableOpacity>
                    <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                      {companies.map(company => (
                        <TouchableOpacity
                          key={company.id}
                          style={[
                            styles.dropdownItem,
                            newOppForm.customer_id === company.id && styles.dropdownItemSelected
                          ]}
                          onPress={() => {
                            setNewOppForm({ ...newOppForm, customer_id: company.id });
                            setCompanyDropdownOpen(false);
                          }}
                        >
                          <Text style={styles.dropdownItemText}>{company.name}</Text>
                          {company.industry && (
                            <Text style={styles.dropdownItemSubtext}>{company.industry}</Text>
                          )}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              <View style={styles.formGroupOpp}>
                <Text style={styles.formLabelOpp}>Valeur (€) *</Text>
                <TextInput
                  style={styles.inputOpp}
                  placeholder="50000"
                  value={newOppForm.value}
                  onChangeText={(text) => setNewOppForm({ ...newOppForm, value: text })}
                  keyboardType="numeric"
                  placeholderTextColor="#C7C7CC"
                />
              </View>

              <View style={styles.formGroupOpp}>
                <Text style={styles.formLabelOpp}>Probabilité (%)</Text>
                <TextInput
                  style={styles.inputOpp}
                  placeholder="20"
                  value={newOppForm.probability}
                  onChangeText={(text) => setNewOppForm({ ...newOppForm, probability: text })}
                  keyboardType="numeric"
                  placeholderTextColor="#C7C7CC"
                />
              </View>

              <View style={styles.formGroupOpp}>
                <Text style={styles.formLabelOpp}>Stage</Text>
                <View style={styles.statusSelectOpp}>
                  {stages.map(stage => (
                    <TouchableOpacity
                      key={stage.id}
                      style={[
                        styles.statusButtonOpp,
                        newOppForm.stage_id === stage.id && styles.statusButtonActiveOpp,
                        { borderColor: stage.color }
                      ]}
                      onPress={() => setNewOppForm({ ...newOppForm, stage_id: stage.id })}
                    >
                      <Text style={{
                        color: newOppForm.stage_id === stage.id ? stage.color : '#8E8E93',
                        fontWeight: '600',
                        fontSize: 11
                      }}>
                        {stage.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroupOpp}>
                <Text style={styles.formLabelOpp}>Date Clôture</Text>
                <TouchableOpacity
                  style={styles.inputButton}
                  onPress={() => showDatePicker('new')}
                  activeOpacity={0.85}
                >
                  <Text
                    style={
                      newOppForm.expected_close_date
                        ? styles.inputButtonText
                        : styles.inputButtonPlaceholder
                    }
                  >
                    {formatDateDisplay(newOppForm.expected_close_date)}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.formGroupOpp}>
                <Text style={styles.formLabelOpp}>Description</Text>
                <TextInput
                  style={[styles.inputOpp, styles.textAreaOpp]}
                  placeholder="Ajoutez une description..."
                  value={newOppForm.description}
                  onChangeText={(text) => setNewOppForm({ ...newOppForm, description: text })}
                  multiline
                  numberOfLines={3}
                  placeholderTextColor="#C7C7CC"
                />
              </View>
            </ScrollView>

            <View style={styles.newModalFooter}>
              <TouchableOpacity
                style={[styles.buttonOpp, styles.buttonSecondaryOpp]}
                onPress={handleResetOppForm}
              >
                <Text style={styles.buttonSecondaryTextOpp}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.buttonOpp, styles.buttonPrimaryOpp]}
                onPress={handleCreateOpportunity}
              >
                <Text style={styles.buttonPrimaryTextOpp}>Créer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <DateTimePickerWrapper
        visible={isDatePickerVisible}
        date={datePickerInitialDate}
        onConfirm={handleDateConfirm}
        onCancel={handleDateCancel}
      />

      {/* New Company Modal */}
      <Modal
        visible={newCompanyModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setNewCompanyModalVisible(false)}
      >
        <View style={styles.newModalContainer}>
          <View style={styles.newModalContent}>
            <View style={styles.newModalHeader}>
              <Text style={styles.newModalTitle}>Nouvelle Entreprise</Text>
              <TouchableOpacity onPress={() => setNewCompanyModalVisible(false)}>
                <Text style={styles.closeButtonNew}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.newModalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.formGroupOpp}>
                <Text style={styles.formLabelOpp}>Nom *</Text>
                <TextInput
                  style={styles.inputOpp}
                  placeholder="Ex: Acme Corp"
                  value={newCompanyForm.name}
                  onChangeText={(text) => setNewCompanyForm({ ...newCompanyForm, name: text })}
                  placeholderTextColor="#C7C7CC"
                />
              </View>

              <View style={styles.formGroupOpp}>
                <Text style={styles.formLabelOpp}>Secteur</Text>
                <TextInput
                  style={styles.inputOpp}
                  placeholder="Ex: Technologie"
                  value={newCompanyForm.industry}
                  onChangeText={(text) => setNewCompanyForm({ ...newCompanyForm, industry: text })}
                  placeholderTextColor="#C7C7CC"
                />
              </View>

              <View style={styles.formGroupOpp}>
                <Text style={styles.formLabelOpp}>Email</Text>
                <TextInput
                  style={styles.inputOpp}
                  placeholder="contact@acme.com"
                  value={newCompanyForm.email}
                  onChangeText={(text) => setNewCompanyForm({ ...newCompanyForm, email: text })}
                  keyboardType="email-address"
                  placeholderTextColor="#C7C7CC"
                />
              </View>

              <View style={styles.formGroupOpp}>
                <Text style={styles.formLabelOpp}>Téléphone</Text>
                <TextInput
                  style={styles.inputOpp}
                  placeholder="+33 1 23 45 67 89"
                  value={newCompanyForm.phone}
                  onChangeText={(text) => setNewCompanyForm({ ...newCompanyForm, phone: text })}
                  keyboardType="phone-pad"
                  placeholderTextColor="#C7C7CC"
                />
              </View>

              <View style={styles.formGroupOpp}>
                <Text style={styles.formLabelOpp}>Site Web</Text>
                <TextInput
                  style={styles.inputOpp}
                  placeholder="https://www.acme.com"
                  value={newCompanyForm.website}
                  onChangeText={(text) => setNewCompanyForm({ ...newCompanyForm, website: text })}
                  keyboardType="url"
                  placeholderTextColor="#C7C7CC"
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooterOpp}>
              <TouchableOpacity
                style={styles.buttonSecondaryOpp}
                onPress={() => setNewCompanyModalVisible(false)}
              >
                <Text style={styles.buttonSecondaryTextOpp}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.buttonPrimaryOpp}
                onPress={handleCreateCompany}
              >
                <Text style={styles.buttonPrimaryTextOpp}>Créer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ConfirmModal
        visible={confirmModalVisible}
        title="Supprimer l'opportunité"
        message="Êtes-vous sûr de vouloir supprimer cette opportunité ? Cette action est irréversible."
        confirmText="Supprimer"
        cancelText="Annuler"
        onConfirm={confirmDeleteOpportunity}
        onCancel={() => {
          setConfirmModalVisible(false);
          setOpportunityToDelete(null);
        }}
      />
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
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#E5E5EA',
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 16,
    padding: 4,
    borderRadius: 12,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
    letterSpacing: -0.1,
  },
  tabButtonTextActive: {
    color: '#007AFF',
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
    letterSpacing: -0.2,
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
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statLabel: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
    marginBottom: 4,
    letterSpacing: -0.1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.4,
  },
  deletedWrapper: {
    flex: 1,
    paddingHorizontal: 20,
  },
  deletedScroll: {
    flex: 1,
  },
  deletedContent: {
    paddingBottom: 32,
  },
  kanbanContainer: {
    flex: 1,
  },
  kanbanContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  column: {
    width: COLUMN_WIDTH,
    marginRight: 12,
  },
  columnHeader: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderTopWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  columnTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  columnTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    letterSpacing: -0.4,
    flex: 1,
  },
  countBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.1,
  },
  columnValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  columnWeighted: {
    fontSize: 13,
    color: '#8E8E93',
    letterSpacing: -0.1,
  },
  columnContent: {
    flex: 1,
  },
  columnCards: {
    gap: 12,
    paddingBottom: 20,
  },
  columnDropZone: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  columnDropZoneActive: {
    borderColor: '#007AFF33',
    backgroundColor: '#F0F8FF',
  },
  draggableWrapper: {
    borderRadius: 12,
  },
  draggableWrapperDragging: {
    opacity: 0.95,
  },
  opportunityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    position: 'relative',
  },
  opportunityCardDragging: {
    opacity: 0.85,
  },
  draggingCard: {
    opacity: 0.9,
    transform: [{ scale: 1.02 }],
  },
  cardClickableArea: {
    padding: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
    letterSpacing: -0.2,
    flex: 1,
    marginRight: 8,
  },
  probabilityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  cardDeleteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#FFE5E5',
    zIndex: 999,
    elevation: 999,
  },
  cardDeleteText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF3B30',
    letterSpacing: -0.1,
  },
  probabilityText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  cardCompany: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '500',
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  cardContact: {
    fontSize: 13,
    color: '#8E8E93',
    marginBottom: 12,
    letterSpacing: -0.1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  cardValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#34C759',
    letterSpacing: -0.3,
  },
  cardDate: {
    fontSize: 13,
    color: '#8E8E93',
    letterSpacing: -0.1,
  },
  emptyColumn: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#C7C7CC',
    letterSpacing: -0.2,
  },
  emptyDeletedText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 32,
    letterSpacing: -0.1,
  },
  deletedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  deletedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  deletedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    flex: 1,
    marginRight: 12,
    letterSpacing: -0.2,
  },
  deletedDate: {
    fontSize: 12,
    color: '#8E8E93',
    letterSpacing: -0.1,
  },
  deletedValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#34C759',
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  deletedStage: {
    fontSize: 13,
    color: '#8E8E93',
    letterSpacing: -0.1,
  },
  deletedDescription: {
    fontSize: 13,
    color: '#6C6C70',
    marginTop: 8,
    lineHeight: 18,
    letterSpacing: -0.1,
  },
  restoreButton: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 12,
    alignItems: 'center',
  },
  restoreButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
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
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  modalHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  editButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.4,
    flex: 1,
  },
  modalBody: {
    padding: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  detailLabel: {
    fontSize: 15,
    color: '#8E8E93',
    letterSpacing: -0.2,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
    letterSpacing: -0.2,
  },
  linkText: {
    color: '#007AFF',
    textDecorationLine: 'underline',
  },
  notesContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
  },
  notesText: {
    fontSize: 14,
    color: '#000000',
    lineHeight: 20,
    marginTop: 8,
    letterSpacing: -0.2,
  },
  modalActions: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  actionsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  statusButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  statusButtonText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  newModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  newModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    maxHeight: '90%',
  },
  newModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  newModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
  },
  closeButtonNew: {
    fontSize: 24,
    color: '#8E8E93',
  },
  newModalBody: {
    maxHeight: 400,
    marginBottom: 16,
  },
  formGroupOpp: {
    marginBottom: 16,
  },
  formLabelOpp: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 8,
  },
  inputOpp: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#000000',
  },
  inputButton: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  inputButtonText: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '600',
  },
  inputButtonPlaceholder: {
    fontSize: 14,
    color: '#C7C7CC',
    fontWeight: '500',
  },
  textAreaOpp: {
    height: 100,
    textAlignVertical: 'top',
  },
  statusSelectOpp: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusButtonOpp: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
  },
  statusButtonActiveOpp: {
    borderWidth: 2,
  },
  newModalFooter: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 16,
    paddingBottom: 20,
  },
  buttonOpp: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonPrimaryOpp: {
    backgroundColor: '#007AFF',
  },
  buttonPrimaryTextOpp: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  buttonSecondaryOpp: {
    backgroundColor: '#F2F2F7',
  },
  buttonSecondaryTextOpp: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8E8E93',
  },
  // Styles d'édition
  editGroup: {
    marginBottom: 16,
  },
  editLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 8,
  },
  editInput: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#000000',
    backgroundColor: '#FFFFFF',
  },
  editDateButton: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  editDateButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
  },
  editDatePlaceholderText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#C7C7CC',
  },
  editTextArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  statusSelectEdit: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusButtonEdit: {
    flex: 1,
    minWidth: '30%',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  statusButtonEditActive: {
    borderWidth: 2,
  },
  statusButtonEditText: {
    fontSize: 12,
    fontWeight: '600',
  },
  editActions: {
    flexDirection: 'row',
    marginTop: 20,
    marginBottom: 16,
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#34C759',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginRight: 6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginLeft: 6,
  },
  cancelButtonText: {
    color: '#8E8E93',
    fontSize: 16,
    fontWeight: '700',
  },
  deleteButton: {
    backgroundColor: '#FEF6F6',
    borderWidth: 1,
    borderColor: '#FF3B30',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  deleteButtonText: {
    color: '#FF3B30',
    fontSize: 15,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#8E8E93',
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  dropdownButtonText: {
    fontSize: 15,
    color: '#000000',
    flex: 1,
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#8E8E93',
  },
  dropdownList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    maxHeight: 250,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dropdownScroll: {
    maxHeight: 200,
  },
  newCustomerButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  newCustomerButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  dropdownItemSelected: {
    backgroundColor: '#E3F2FD',
  },
  dropdownItemText: {
    fontSize: 15,
    color: '#000000',
    fontWeight: '500',
  },
  dropdownItemSubtext: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  modalFooterOpp: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  searchInput: {
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: '#000000',
    letterSpacing: -0.2,
  },
  clearSearchButton: {
    position: 'absolute',
    right: 28,
    top: 22,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#8E8E93',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearSearchText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
