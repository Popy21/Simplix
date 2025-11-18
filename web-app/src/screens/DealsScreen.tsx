import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Platform,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { TrendingUpIcon, UsersIcon, DollarIcon, CalendarIcon } from '../components/Icons';
import { dealsService, pipelineService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { withGlassLayout } from '../components/withGlassLayout';

type DealsScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Dashboard'>;
};

interface Deal {
  id: string;
  title: string;
  company: string;
  contact: string;
  value: number;
  probability: number;
  stageId: string;
  stageName: string;
  expectedCloseDate: string;
  notes?: string;
}

interface DealStage {
  id: string;
  name: string;
  color: string;
  deals: Deal[];
}

const { width, height } = Dimensions.get('window');

function DealsScreen({ navigation }: DealsScreenProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stages, setStages] = useState<DealStage[]>([]);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [newDealModalVisible, setNewDealModalVisible] = useState(false);
  const [newDealForm, setNewDealForm] = useState({
    title: '',
    company: '',
    contact: '',
    value: '',
    probability: '25',
    stageId: '',
    expectedCloseDate: '',
  });

  useEffect(() => {
    fetchDealsData();
  }, []);

  const fetchDealsData = async () => {
    try {
      setLoading(true);

      // Fetch pipeline stages and deals in parallel
      const [stagesResponse, dealsResponse] = await Promise.all([
        pipelineService.getStages(),
        dealsService.getAll({ status: 'open' })
      ]);

      const pipelineStages = stagesResponse.data;
      const allDeals = dealsResponse.data;

      // Group deals by stage
      const stagesWithDeals: DealStage[] = pipelineStages.map((stage: any) => ({
        id: stage.id,
        name: stage.name,
        color: stage.color || '#007AFF',
        deals: allDeals
          .filter((deal: any) => deal.stage_id === stage.id)
          .map((deal: any) => ({
            id: deal.id,
            title: deal.title,
            company: deal.company_name || 'N/A',
            contact: deal.contact_name || 'N/A',
            value: parseFloat(deal.value) || 0,
            probability: deal.probability || 0,
            stageId: deal.stage_id,
            stageName: deal.stage_name,
            expectedCloseDate: deal.expected_close_date ? new Date(deal.expected_close_date).toLocaleDateString('fr-FR') : '',
            notes: deal.description || '',
          })),
      }));

      setStages(stagesWithDeals);

      // Set first stage as default for new deals
      if (stagesWithDeals.length > 0) {
        setNewDealForm(prev => ({ ...prev, stageId: stagesWithDeals[0].id }));
      }
    } catch (error) {
      console.error('Error fetching deals:', error);
      Alert.alert('Erreur', 'Impossible de charger les opportunités');
      // Fallback to mock data if API fails
      initializeMockData();
    } finally {
      setLoading(false);
    }
  };

  const initializeMockData = () => {
    const mockStages: DealStage[] = [
      {
        id: '1',
        name: 'Prospection',
        color: '#FF9500',
        deals: [
          {
            id: 'd1',
            title: 'Audit Système IT',
            company: 'TechCorp',
            contact: 'Jean Dupont',
            value: 45000,
            probability: 30,
            stageId: '1',
            stageName: 'Prospection',
            expectedCloseDate: '2025-12-15',
            notes: 'Premier contact réussi',
          },
          {
            id: 'd2',
            title: 'Formation CRM',
            company: 'Global Solutions',
            contact: 'Marie Martin',
            value: 32000,
            probability: 40,
            stageId: '1',
            stageName: 'Prospection',
            expectedCloseDate: '2025-12-20',
            notes: 'En attente du devis',
          },
        ],
      },
      {
        id: '2',
        name: 'Qualification',
        color: '#007AFF',
        deals: [
          {
            id: 'd3',
            title: 'Solution E-commerce',
            company: 'StartupXYZ',
            contact: 'Pierre Leroy',
            value: 58000,
            probability: 60,
            stageId: '2',
            stageName: 'Qualification',
            expectedCloseDate: '2025-12-10',
            notes: 'Budget approuvé par manager',
          },
        ],
      },
      {
        id: '3',
        name: 'Proposition',
        color: '#5856D6',
        deals: [
          {
            id: 'd4',
            title: 'Maintenance Annuelle',
            company: 'Enterprise Ltd',
            contact: 'Sophie Durand',
            value: 75000,
            probability: 75,
            stageId: '3',
            stageName: 'Proposition',
            expectedCloseDate: '2025-11-30',
            notes: 'Devis envoyé',
          },
        ],
      },
      {
        id: '4',
        name: 'Négociation',
        color: '#34C759',
        deals: [
          {
            id: 'd5',
            title: 'Licence CRM',
            company: 'Acme Corp',
            contact: 'Laurent Michel',
            value: 120000,
            probability: 85,
            stageId: '4',
            stageName: 'Négociation',
            expectedCloseDate: '2025-11-25',
            notes: 'Négociation en cours sur le prix',
          },
          {
            id: 'd6',
            title: 'Intégration Système',
            company: 'Acme Corp',
            contact: 'Laurent Michel',
            value: 45000,
            probability: 80,
            stageId: '4',
            stageName: 'Négociation',
            expectedCloseDate: '2025-12-05',
          },
        ],
      },
    ];

    setStages(mockStages);
  };

  const getTotalValueByStage = (stageDeals: Deal[]) => {
    return stageDeals.reduce((sum, deal) => sum + deal.value, 0);
  };

  const getTotalProbabilityValue = (stageDeals: Deal[]) => {
    return stageDeals.reduce((sum, deal) => sum + (deal.value * deal.probability / 100), 0);
  };

  const handleCreateDeal = () => {
    if (!newDealForm.title.trim() || !newDealForm.company.trim()) {
      Alert.alert('Erreur', 'Veuillez remplir le titre et l\'entreprise');
      return;
    }

    const newDeal: Deal = {
      id: `d${Date.now()}`,
      title: newDealForm.title,
      company: newDealForm.company,
      contact: newDealForm.contact,
      value: parseInt(newDealForm.value) || 0,
      probability: parseInt(newDealForm.probability) || 25,
      stageId: newDealForm.stageId,
      stageName: stages.find(s => s.id === newDealForm.stageId)?.name || 'Prospection',
      expectedCloseDate: newDealForm.expectedCloseDate,
    };

    // Add deal to the correct stage
    const updatedStages = stages.map(stage => {
      if (stage.id === newDealForm.stageId) {
        return { ...stage, deals: [...stage.deals, newDeal] };
      }
      return stage;
    });

    setStages(updatedStages);
    setNewDealForm({
      title: '',
      company: '',
      contact: '',
      value: '',
      probability: '25',
      stageId: 'prospection',
      expectedCloseDate: '',
    });
    setNewDealModalVisible(false);
    Alert.alert('Succès', `Deal "${newDeal.title}" créé avec succès!`);
  };

  const handleResetDealForm = () => {
    setNewDealForm({
      title: '',
      company: '',
      contact: '',
      value: '',
      probability: '25',
      stageId: 'prospection',
      expectedCloseDate: '',
    });
    setNewDealModalVisible(false);
  };

  const handleMoveDeal = (dealId: string, fromStageId: string, toStageId: string) => {
    const updatedStages = stages.map(stage => {
      if (stage.id === fromStageId) {
        return {
          ...stage,
          deals: stage.deals.filter(d => d.id !== dealId),
        };
      }
      if (stage.id === toStageId) {
        const deal = stages.find(s => s.id === fromStageId)?.deals.find(d => d.id === dealId);
        if (deal) {
          return {
            ...stage,
            deals: [...stage.deals, { ...deal, stageId: toStageId }],
          };
        }
      }
      return stage;
    });
    setStages(updatedStages);
  };

  const renderDealCard = (deal: Deal, stageId: string) => (
    <TouchableOpacity
      key={deal.id}
      style={styles.dealCard}
      onPress={() => {
        setSelectedDeal(deal);
        setModalVisible(true);
      }}
    >
      <View style={styles.dealCardHeader}>
        <Text style={styles.dealTitle} numberOfLines={2}>{deal.title}</Text>
        <View style={[styles.probabilityBadge, {
          backgroundColor: deal.probability > 70 ? '#34C75920' :
                          deal.probability > 50 ? '#FF950020' : '#FF3B3020'
        }]}>
          <Text style={[styles.probabilityText, {
            color: deal.probability > 70 ? '#34C759' :
                   deal.probability > 50 ? '#FF9500' : '#FF3B30'
          }]}>
            {deal.probability}%
          </Text>
        </View>
      </View>

      <Text style={styles.dealCompany}>{deal.company}</Text>
      <Text style={styles.dealContact}>{deal.contact}</Text>

      <View style={styles.dealFooter}>
        <View style={styles.dealValue}>
          <DollarIcon size={14} color="#34C759" />
          <Text style={styles.dealValueText}>
            {(deal.value / 1000).toFixed(0)}k
          </Text>
        </View>
        <View style={styles.dealDate}>
          <CalendarIcon size={14} color="#8E8E93" />
          <Text style={styles.dealDateText}>
            {new Date(deal.expectedCloseDate).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' })}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>📊 Pipeline Kanban</Text>
            <Text style={styles.headerSubtitle}>Gérez vos deals par étape</Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setNewDealModalVisible(true)}
          >
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Pipeline Overview */}
      <View style={styles.overviewCard}>
        <View style={styles.overviewItem}>
          <Text style={styles.overviewLabel}>Total Deals</Text>
          <Text style={styles.overviewValue}>
            {stages.reduce((sum, stage) => sum + stage.deals.length, 0)}
          </Text>
        </View>
        <View style={styles.overviewItem}>
          <Text style={styles.overviewLabel}>Valeur Total</Text>
          <Text style={styles.overviewValue}>
            {(stages.reduce((sum, stage) => sum + getTotalValueByStage(stage.deals), 0) / 1000).toFixed(0)}k
          </Text>
        </View>
        <View style={styles.overviewItem}>
          <Text style={styles.overviewLabel}>Valeur Pondérée</Text>
          <Text style={styles.overviewValue}>
            {(stages.reduce((sum, stage) => sum + getTotalProbabilityValue(stage.deals), 0) / 1000).toFixed(0)}k
          </Text>
        </View>
      </View>

      {/* Kanban Board */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.kanbanScroll}
        contentContainerStyle={styles.kanbanContent}
      >
        {stages.map(stage => (
          <View key={stage.id} style={styles.stageColumn}>
            {/* Stage Header */}
            <View style={[styles.stageHeader, { backgroundColor: `${stage.color}20` }]}>
              <View style={[styles.stageDot, { backgroundColor: stage.color }]} />
              <Text style={styles.stageName}>{stage.name}</Text>
              <View style={styles.stageBadge}>
                <Text style={styles.stageBadgeText}>{stage.deals.length}</Text>
              </View>
            </View>

            {/* Stage Stats */}
            <View style={styles.stageStats}>
              <Text style={styles.stageStatsLabel}>
                {(getTotalValueByStage(stage.deals) / 1000).toFixed(0)}k
              </Text>
              <Text style={styles.stageStatsLabel}>
                {getTotalProbabilityValue(stage.deals).toFixed(0)} $
              </Text>
            </View>

            {/* Deals Container */}
            <ScrollView
              nestedScrollEnabled
              style={styles.dealsContainer}
              showsVerticalScrollIndicator={false}
            >
              {stage.deals.length > 0 ? (
                stage.deals.map(deal => renderDealCard(deal, stage.id))
              ) : (
                <View style={styles.emptyStage}>
                  <Text style={styles.emptyText}>Pas de deals</Text>
                </View>
              )}
            </ScrollView>

            {/* Add Deal Button */}
            <TouchableOpacity style={styles.addDealButton}>
              <Text style={styles.addDealText}>+ Ajouter</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      {/* Deal Details Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedDeal?.title}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <View style={styles.modalSection}>
                <Text style={styles.modalLabel}>Entreprise</Text>
                <Text style={styles.modalValue}>{selectedDeal?.company}</Text>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalLabel}>Contact</Text>
                <Text style={styles.modalValue}>{selectedDeal?.contact}</Text>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalLabel}>Valeur du Deal</Text>
                <Text style={styles.modalValue}>
                  {(selectedDeal?.value || 0).toLocaleString('fr-FR')} €
                </Text>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalLabel}>Probabilité</Text>
                <View style={styles.probabilityBar}>
                  <View
                    style={[
                      styles.probabilityBarFill,
                      { width: `${selectedDeal?.probability || 0}%` },
                    ]}
                  />
                </View>
                <Text style={styles.probabilityValue}>
                  {selectedDeal?.probability}%
                </Text>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalLabel}>Date de Clôture Estimée</Text>
                <Text style={styles.modalValue}>
                  {selectedDeal?.expectedCloseDate
                    ? new Date(selectedDeal.expectedCloseDate).toLocaleDateString('fr-FR')
                    : '-'}
                </Text>
              </View>

              {selectedDeal?.notes && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>Notes</Text>
                  <Text style={styles.modalValue}>{selectedDeal.notes}</Text>
                </View>
              )}

              <View style={styles.stageTransition}>
                <Text style={styles.modalLabel}>Passer à</Text>
                <View style={styles.transitionButtons}>
                  {stages
                    .filter(stage => stage.id !== selectedDeal?.stageId)
                    .map(stage => (
                      <TouchableOpacity
                        key={stage.id}
                        style={[styles.transitionButton, { backgroundColor: `${stage.color}20` }]}
                        onPress={() => {
                          if (selectedDeal) {
                            handleMoveDeal(selectedDeal.id, selectedDeal.stageId, stage.id);
                            setModalVisible(false);
                          }
                        }}
                      >
                        <Text style={[styles.transitionButtonText, { color: stage.color }]}>
                          {stage.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.closeModal}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeModalText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Create Deal Modal */}
      <Modal
        visible={newDealModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={handleResetDealForm}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nouveau Deal</Text>
              <TouchableOpacity onPress={handleResetDealForm}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Titre du deal *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Licence CRM"
                  value={newDealForm.title}
                  onChangeText={(text) => setNewDealForm({ ...newDealForm, title: text })}
                  placeholderTextColor="#C7C7CC"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Entreprise *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Acme Corp"
                  value={newDealForm.company}
                  onChangeText={(text) => setNewDealForm({ ...newDealForm, company: text })}
                  placeholderTextColor="#C7C7CC"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Contact</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Laurent Michel"
                  value={newDealForm.contact}
                  onChangeText={(text) => setNewDealForm({ ...newDealForm, contact: text })}
                  placeholderTextColor="#C7C7CC"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Valeur (€) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="50000"
                  value={newDealForm.value}
                  onChangeText={(text) => setNewDealForm({ ...newDealForm, value: text })}
                  keyboardType="numeric"
                  placeholderTextColor="#C7C7CC"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Probabilité (%)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="25"
                  value={newDealForm.probability}
                  onChangeText={(text) => setNewDealForm({ ...newDealForm, probability: text })}
                  keyboardType="numeric"
                  placeholderTextColor="#C7C7CC"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Étape</Text>
                <ScrollView style={styles.stageSelectContainer} scrollEnabled={false}>
                  {stages.map(stage => (
                    <TouchableOpacity
                      key={stage.id}
                      style={[
                        styles.stageOption,
                        newDealForm.stageId === stage.id && styles.stageOptionActive,
                      ]}
                      onPress={() => setNewDealForm({ ...newDealForm, stageId: stage.id })}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={[styles.stageDot, { backgroundColor: stage.color }]} />
                        <Text
                          style={[
                            styles.stageOptionText,
                            newDealForm.stageId === stage.id && styles.stageOptionTextActive,
                          ]}
                        >
                          {stage.name}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Date Prévue de Clôture</Text>
                <TextInput
                  style={styles.input}
                  placeholder="2025-12-31"
                  value={newDealForm.expectedCloseDate}
                  onChangeText={(text) => setNewDealForm({ ...newDealForm, expectedCloseDate: text })}
                  placeholderTextColor="#C7C7CC"
                />
              </View>

              <Text style={styles.formNote}>
                Les champs avec * sont obligatoires.
              </Text>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={handleResetDealForm}
              >
                <Text style={styles.buttonSecondaryText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.buttonPrimary]}
                onPress={handleCreateDeal}
              >
                <Text style={styles.buttonPrimaryText}>Créer Deal</Text>
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
  overviewCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  overviewItem: {
    flex: 1,
    alignItems: 'center',
  },
  overviewLabel: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '500',
    marginBottom: 4,
  },
  overviewValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
  },
  kanbanScroll: {
    flex: 1,
  },
  kanbanContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  stageColumn: {
    width: 320,
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 12,
  },
  stageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  stageDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stageName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
  },
  stageBadge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  stageBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000000',
  },
  stageStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  stageStatsLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8E8E93',
  },
  dealsContainer: {
    flex: 1,
    paddingHorizontal: 8,
  },
  dealCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  dealCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  dealTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#000000',
    marginRight: 8,
  },
  probabilityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  probabilityText: {
    fontSize: 11,
    fontWeight: '700',
  },
  dealCompany: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  dealContact: {
    fontSize: 11,
    color: '#8E8E93',
    marginBottom: 8,
  },
  dealFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dealValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dealValueText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#34C759',
  },
  dealDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dealDateText: {
    fontSize: 11,
    color: '#8E8E93',
  },
  emptyStage: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 13,
    color: '#C7C7CC',
    fontWeight: '500',
  },
  addDealButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    margin: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  addDealText: {
    fontSize: 12,
    fontWeight: '600',
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
    marginBottom: 20,
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
  modalScroll: {
    maxHeight: 400,
  },
  modalSection: {
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 6,
  },
  modalValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
  },
  probabilityBar: {
    height: 6,
    backgroundColor: '#F2F2F7',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  probabilityBarFill: {
    height: '100%',
    backgroundColor: '#34C759',
  },
  probabilityValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#34C759',
  },
  stageTransition: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
    paddingTop: 16,
  },
  transitionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  transitionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  transitionButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  closeModal: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 20,
  },
  closeModalText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
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
  modalScrollContent: {
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
  stageSelectContainer: {
    gap: 8,
  },
  stageOption: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
  },
  stageOptionActive: {
    backgroundColor: '#007AFF20',
  },
  stageOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
  },
  stageOptionTextActive: {
    color: '#007AFF',
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

export default withGlassLayout(DealsScreen);
