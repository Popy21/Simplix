import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
  Alert,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import {
  TrendingUpIcon,
  DollarIcon,
  CalendarIcon,
  PlusIcon,
  ChevronRightIcon,
  EditIcon,
  TrashIcon,
} from '../components/Icons';
import { dealsService, pipelineService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { withGlassLayout } from '../components/withGlassLayout';
import { glassTheme, withShadow } from '../theme/glassTheme';
import {
  GlassModal,
  GlassButton,
  GlassInput,
  GlassLoadingState,
  GlassEmptyState,
  GlassBadge,
  GlassProgressBar,
} from '../components/ui';

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
const STAGE_WIDTH = Math.min(300, width - 48);

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

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    fetchDealsData();
  }, []);

  useEffect(() => {
    if (!loading) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [loading]);

  const fetchDealsData = async () => {
    try {
      setLoading(true);

      const [stagesResponse, dealsResponse] = await Promise.all([
        pipelineService.getStages(),
        dealsService.getAll({ status: 'open' })
      ]);

      const pipelineStages = stagesResponse.data;
      const allDeals = dealsResponse.data;

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

      if (stagesWithDeals.length > 0) {
        setNewDealForm(prev => ({ ...prev, stageId: stagesWithDeals[0].id }));
      }
    } catch (error) {
      console.error('Error fetching deals:', error);
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
          { id: 'd1', title: 'Audit Systeme IT', company: 'TechCorp', contact: 'Jean Dupont', value: 45000, probability: 30, stageId: '1', stageName: 'Prospection', expectedCloseDate: '2025-12-15', notes: 'Premier contact reussi' },
          { id: 'd2', title: 'Formation CRM', company: 'Global Solutions', contact: 'Marie Martin', value: 32000, probability: 40, stageId: '1', stageName: 'Prospection', expectedCloseDate: '2025-12-20', notes: 'En attente du devis' },
        ],
      },
      {
        id: '2',
        name: 'Qualification',
        color: '#007AFF',
        deals: [
          { id: 'd3', title: 'Solution E-commerce', company: 'StartupXYZ', contact: 'Pierre Leroy', value: 58000, probability: 60, stageId: '2', stageName: 'Qualification', expectedCloseDate: '2025-12-10', notes: 'Budget approuve par manager' },
        ],
      },
      {
        id: '3',
        name: 'Proposition',
        color: '#5856D6',
        deals: [
          { id: 'd4', title: 'Maintenance Annuelle', company: 'Enterprise Ltd', contact: 'Sophie Durand', value: 75000, probability: 75, stageId: '3', stageName: 'Proposition', expectedCloseDate: '2025-11-30', notes: 'Devis envoye' },
        ],
      },
      {
        id: '4',
        name: 'Negociation',
        color: '#34C759',
        deals: [
          { id: 'd5', title: 'Licence CRM', company: 'Acme Corp', contact: 'Laurent Michel', value: 120000, probability: 85, stageId: '4', stageName: 'Negociation', expectedCloseDate: '2025-11-25', notes: 'Negociation en cours sur le prix' },
          { id: 'd6', title: 'Integration Systeme', company: 'Acme Corp', contact: 'Laurent Michel', value: 45000, probability: 80, stageId: '4', stageName: 'Negociation', expectedCloseDate: '2025-12-05' },
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

  const getTotalDeals = () => stages.reduce((sum, stage) => sum + stage.deals.length, 0);
  const getTotalValue = () => stages.reduce((sum, stage) => sum + getTotalValueByStage(stage.deals), 0);
  const getTotalWeightedValue = () => stages.reduce((sum, stage) => sum + getTotalProbabilityValue(stage.deals), 0);

  const handleCreateDeal = async () => {
    if (!newDealForm.title.trim() || !newDealForm.company.trim()) {
      Alert.alert('Erreur', 'Veuillez remplir le titre et l\'entreprise');
      return;
    }

    try {
      await dealsService.create({
        title: newDealForm.title,
        company_name: newDealForm.company,
        contact_name: newDealForm.contact,
        value: parseFloat(newDealForm.value) || 0,
        probability: parseInt(newDealForm.probability) || 25,
        stage_id: newDealForm.stageId,
        expected_close_date: newDealForm.expectedCloseDate,
      });

      resetDealForm();
      setNewDealModalVisible(false);
      fetchDealsData();
      Alert.alert('Succes', 'Deal cree avec succes!');
    } catch (error) {
      console.error('Error creating deal:', error);
      // Fallback to local creation
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

      const updatedStages = stages.map(stage => {
        if (stage.id === newDealForm.stageId) {
          return { ...stage, deals: [...stage.deals, newDeal] };
        }
        return stage;
      });

      setStages(updatedStages);
      resetDealForm();
      setNewDealModalVisible(false);
    }
  };

  const resetDealForm = () => {
    setNewDealForm({
      title: '',
      company: '',
      contact: '',
      value: '',
      probability: '25',
      stageId: stages[0]?.id || '',
      expectedCloseDate: '',
    });
  };

  const handleMoveDeal = async (dealId: string, fromStageId: string, toStageId: string) => {
    try {
      await dealsService.update(dealId, { stage_id: toStageId });
    } catch (error) {
      console.error('Error moving deal:', error);
    }

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
            deals: [...stage.deals, { ...deal, stageId: toStageId, stageName: stage.name }],
          };
        }
      }
      return stage;
    });
    setStages(updatedStages);
    setModalVisible(false);
  };

  const getProbabilityColor = (probability: number) => {
    if (probability >= 70) return '#34C759';
    if (probability >= 50) return '#FF9500';
    return '#FF3B30';
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
    return value.toLocaleString('fr-FR');
  };

  const renderDealCard = (deal: Deal, stageId: string, stageColor: string) => (
    <TouchableOpacity
      key={deal.id}
      style={styles.dealCard}
      onPress={() => {
        setSelectedDeal(deal);
        setModalVisible(true);
      }}
      activeOpacity={0.7}
    >
      <View style={styles.dealCardInner}>
        {/* Header */}
        <View style={styles.dealCardHeader}>
          <Text style={styles.dealTitle} numberOfLines={2}>{deal.title}</Text>
          <View style={[
            styles.probabilityBadge,
            { backgroundColor: `${getProbabilityColor(deal.probability)}15` }
          ]}>
            <Text style={[styles.probabilityText, { color: getProbabilityColor(deal.probability) }]}>
              {deal.probability}%
            </Text>
          </View>
        </View>

        {/* Company & Contact */}
        <Text style={styles.dealCompany}>{deal.company}</Text>
        <Text style={styles.dealContact}>{deal.contact}</Text>

        {/* Progress Bar */}
        <View style={styles.dealProgressContainer}>
          <View style={styles.dealProgressTrack}>
            <View
              style={[
                styles.dealProgressFill,
                {
                  width: `${deal.probability}%`,
                  backgroundColor: stageColor,
                }
              ]}
            />
          </View>
        </View>

        {/* Footer */}
        <View style={styles.dealFooter}>
          <View style={styles.dealValue}>
            <DollarIcon size={14} color="#34C759" />
            <Text style={styles.dealValueText}>{formatCurrency(deal.value)} EUR</Text>
          </View>
          {deal.expectedCloseDate && (
            <View style={styles.dealDate}>
              <CalendarIcon size={14} color="#8E8E93" />
              <Text style={styles.dealDateText}>{deal.expectedCloseDate}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <GlassLoadingState
          type="spinner"
          message="Chargement du pipeline..."
          size="large"
        />
      </View>
    );
  }

  return (
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
            <Text style={styles.headerTitle}>Pipeline</Text>
            <Text style={styles.headerSubtitle}>Gerez vos opportunites</Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setNewDealModalVisible(true)}
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
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: 'rgba(0, 122, 255, 0.1)' }]}>
              <TrendingUpIcon size={18} color="#007AFF" />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statValue}>{getTotalDeals()}</Text>
              <Text style={styles.statLabel}>Deals actifs</Text>
            </View>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: 'rgba(52, 199, 89, 0.1)' }]}>
              <DollarIcon size={18} color="#34C759" />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statValue}>{formatCurrency(getTotalValue())}</Text>
              <Text style={styles.statLabel}>Valeur totale</Text>
            </View>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: 'rgba(255, 149, 0, 0.1)' }]}>
              <TrendingUpIcon size={18} color="#FF9500" />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statValue}>{formatCurrency(getTotalWeightedValue())}</Text>
              <Text style={styles.statLabel}>Ponderee</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Kanban Board */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.kanbanScroll}
        contentContainerStyle={styles.kanbanContent}
      >
        {stages.map((stage, stageIndex) => (
          <Animated.View
            key={stage.id}
            style={[
              styles.stageColumn,
              {
                opacity: fadeAnim,
                transform: [{
                  translateX: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [50 * stageIndex, 0],
                  }),
                }],
              },
            ]}
          >
            {/* Stage Header */}
            <View style={styles.stageHeader}>
              <LinearGradient
                colors={[`${stage.color}20`, `${stage.color}10`]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.stageHeaderGradient}
              >
                <View style={[styles.stageDot, { backgroundColor: stage.color }]} />
                <Text style={styles.stageName}>{stage.name}</Text>
                <View style={styles.stageBadge}>
                  <Text style={styles.stageBadgeText}>{stage.deals.length}</Text>
                </View>
              </LinearGradient>
            </View>

            {/* Stage Stats */}
            <View style={styles.stageStats}>
              <View style={styles.stageStatItem}>
                <Text style={styles.stageStatValue}>{formatCurrency(getTotalValueByStage(stage.deals))}</Text>
                <Text style={styles.stageStatLabel}>Total</Text>
              </View>
              <View style={styles.stageStatDivider} />
              <View style={styles.stageStatItem}>
                <Text style={styles.stageStatValue}>{formatCurrency(getTotalProbabilityValue(stage.deals))}</Text>
                <Text style={styles.stageStatLabel}>Pondere</Text>
              </View>
            </View>

            {/* Deals */}
            <ScrollView
              nestedScrollEnabled
              style={styles.dealsContainer}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.dealsContent}
            >
              {stage.deals.length > 0 ? (
                stage.deals.map(deal => renderDealCard(deal, stage.id, stage.color))
              ) : (
                <View style={styles.emptyStage}>
                  <Text style={styles.emptyStageText}>Pas de deals</Text>
                  <Text style={styles.emptyStageSubtext}>Glissez un deal ici</Text>
                </View>
              )}
            </ScrollView>

            {/* Add Deal to Stage */}
            <TouchableOpacity
              style={styles.addDealButton}
              onPress={() => {
                setNewDealForm(prev => ({ ...prev, stageId: stage.id }));
                setNewDealModalVisible(true);
              }}
            >
              <PlusIcon size={16} color="#007AFF" />
              <Text style={styles.addDealText}>Ajouter un deal</Text>
            </TouchableOpacity>
          </Animated.View>
        ))}
      </ScrollView>

      {/* Deal Details Modal */}
      <GlassModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title={selectedDeal?.title || 'Details du deal'}
        size="large"
      >
        {selectedDeal && (
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Deal Value Card */}
            <View style={styles.modalValueCard}>
              <LinearGradient
                colors={['rgba(52, 199, 89, 0.1)', 'rgba(52, 199, 89, 0.05)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.modalValueGradient}
              >
                <Text style={styles.modalValueLabel}>Valeur du deal</Text>
                <Text style={styles.modalValueAmount}>
                  {selectedDeal.value.toLocaleString('fr-FR')} EUR
                </Text>
              </LinearGradient>
            </View>

            {/* Info Grid */}
            <View style={styles.modalInfoGrid}>
              <View style={styles.modalInfoItem}>
                <Text style={styles.modalInfoLabel}>Entreprise</Text>
                <Text style={styles.modalInfoValue}>{selectedDeal.company}</Text>
              </View>
              <View style={styles.modalInfoItem}>
                <Text style={styles.modalInfoLabel}>Contact</Text>
                <Text style={styles.modalInfoValue}>{selectedDeal.contact}</Text>
              </View>
              <View style={styles.modalInfoItem}>
                <Text style={styles.modalInfoLabel}>Date de cloture</Text>
                <Text style={styles.modalInfoValue}>
                  {selectedDeal.expectedCloseDate || 'Non definie'}
                </Text>
              </View>
              <View style={styles.modalInfoItem}>
                <Text style={styles.modalInfoLabel}>Etape actuelle</Text>
                <Text style={styles.modalInfoValue}>{selectedDeal.stageName}</Text>
              </View>
            </View>

            {/* Probability Section */}
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Probabilite de succes</Text>
              <GlassProgressBar
                value={selectedDeal.probability}
                maxValue={100}
                gradient={[getProbabilityColor(selectedDeal.probability), getProbabilityColor(selectedDeal.probability)]}
                height={10}
                valueFormatter={(value) => `${value}%`}
              />
              <Text style={styles.probabilityHint}>
                Valeur ponderee: {formatCurrency(selectedDeal.value * selectedDeal.probability / 100)} EUR
              </Text>
            </View>

            {/* Notes */}
            {selectedDeal.notes && (
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Notes</Text>
                <View style={styles.notesCard}>
                  <Text style={styles.notesText}>{selectedDeal.notes}</Text>
                </View>
              </View>
            )}

            {/* Move to Stage */}
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Deplacer vers</Text>
              <View style={styles.stageButtons}>
                {stages
                  .filter(stage => stage.id !== selectedDeal.stageId)
                  .map(stage => (
                    <TouchableOpacity
                      key={stage.id}
                      style={[styles.stageButton, { borderColor: stage.color }]}
                      onPress={() => handleMoveDeal(selectedDeal.id, selectedDeal.stageId, stage.id)}
                    >
                      <View style={[styles.stageButtonDot, { backgroundColor: stage.color }]} />
                      <Text style={[styles.stageButtonText, { color: stage.color }]}>
                        {stage.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
              </View>
            </View>

            {/* Actions */}
            <View style={styles.modalActions}>
              <GlassButton
                title="Fermer"
                onPress={() => setModalVisible(false)}
                variant="primary"
                fullWidth
              />
            </View>
          </ScrollView>
        )}
      </GlassModal>

      {/* Create Deal Modal */}
      <GlassModal
        visible={newDealModalVisible}
        onClose={() => { setNewDealModalVisible(false); resetDealForm(); }}
        title="Nouveau Deal"
        size="large"
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <GlassInput
            label="Titre du deal *"
            placeholder="Ex: Licence CRM"
            value={newDealForm.title}
            onChangeText={(text) => setNewDealForm({ ...newDealForm, title: text })}
          />
          <GlassInput
            label="Entreprise *"
            placeholder="Ex: Acme Corp"
            value={newDealForm.company}
            onChangeText={(text) => setNewDealForm({ ...newDealForm, company: text })}
          />
          <GlassInput
            label="Contact"
            placeholder="Ex: Laurent Michel"
            value={newDealForm.contact}
            onChangeText={(text) => setNewDealForm({ ...newDealForm, contact: text })}
          />
          <GlassInput
            label="Valeur (EUR)"
            placeholder="50000"
            value={newDealForm.value}
            onChangeText={(text) => setNewDealForm({ ...newDealForm, value: text })}
            keyboardType="numeric"
          />
          <GlassInput
            label="Probabilite (%)"
            placeholder="25"
            value={newDealForm.probability}
            onChangeText={(text) => setNewDealForm({ ...newDealForm, probability: text })}
            keyboardType="numeric"
          />

          {/* Stage Selection */}
          <View style={styles.formSection}>
            <Text style={styles.formLabel}>Etape</Text>
            <View style={styles.stageSelectGrid}>
              {stages.map(stage => (
                <TouchableOpacity
                  key={stage.id}
                  style={[
                    styles.stageSelectOption,
                    newDealForm.stageId === stage.id && {
                      borderColor: stage.color,
                      backgroundColor: `${stage.color}10`,
                    },
                  ]}
                  onPress={() => setNewDealForm({ ...newDealForm, stageId: stage.id })}
                >
                  <View style={[styles.stageSelectDot, { backgroundColor: stage.color }]} />
                  <Text style={[
                    styles.stageSelectText,
                    newDealForm.stageId === stage.id && { color: stage.color, fontWeight: '600' },
                  ]}>
                    {stage.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <GlassInput
            label="Date prevue de cloture"
            placeholder="AAAA-MM-JJ"
            value={newDealForm.expectedCloseDate}
            onChangeText={(text) => setNewDealForm({ ...newDealForm, expectedCloseDate: text })}
          />

          <Text style={styles.formNote}>* Champs obligatoires</Text>
        </ScrollView>

        <View style={styles.modalFooter}>
          <GlassButton
            title="Annuler"
            onPress={() => { setNewDealModalVisible(false); resetDealForm(); }}
            variant="outline"
            style={{ flex: 1 }}
          />
          <GlassButton
            title="Creer"
            onPress={handleCreateDeal}
            variant="primary"
            style={{ flex: 1 }}
          />
        </View>
      </GlassModal>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: glassTheme.colors.background.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: glassTheme.colors.background.primary,
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
  statsContainer: {
    flexDirection: 'row',
    gap: glassTheme.spacing.sm,
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
    ...glassTheme.typography.h3,
    color: glassTheme.colors.text.primary,
  },
  statLabel: {
    ...glassTheme.typography.caption,
    color: glassTheme.colors.text.tertiary,
  },
  kanbanScroll: {
    flex: 1,
  },
  kanbanContent: {
    paddingHorizontal: glassTheme.spacing.md,
    paddingVertical: glassTheme.spacing.md,
    gap: glassTheme.spacing.md,
  },
  stageColumn: {
    width: STAGE_WIDTH,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: glassTheme.radius.xl,
    overflow: 'hidden',
    marginRight: glassTheme.spacing.md,
    ...withShadow('sm'),
    ...(Platform.OS === 'web' ? {
      // @ts-ignore
      backdropFilter: 'blur(10px)',
    } : {}),
  },
  stageHeader: {
    overflow: 'hidden',
  },
  stageHeaderGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: glassTheme.spacing.md,
    paddingVertical: glassTheme.spacing.sm,
    gap: glassTheme.spacing.sm,
  },
  stageDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  stageName: {
    ...glassTheme.typography.h3,
    flex: 1,
    color: glassTheme.colors.text.primary,
  },
  stageBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: glassTheme.radius.full,
    ...withShadow('sm'),
  },
  stageBadgeText: {
    ...glassTheme.typography.captionBold,
    color: glassTheme.colors.text.primary,
  },
  stageStats: {
    flexDirection: 'row',
    paddingHorizontal: glassTheme.spacing.md,
    paddingVertical: glassTheme.spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
  },
  stageStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  stageStatValue: {
    ...glassTheme.typography.bodySmall,
    fontWeight: '700',
    color: glassTheme.colors.text.primary,
  },
  stageStatLabel: {
    ...glassTheme.typography.caption,
    color: glassTheme.colors.text.tertiary,
  },
  stageStatDivider: {
    width: 1,
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
  },
  dealsContainer: {
    flex: 1,
    maxHeight: height - 380,
  },
  dealsContent: {
    padding: glassTheme.spacing.sm,
    gap: glassTheme.spacing.sm,
  },
  dealCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: glassTheme.radius.lg,
    overflow: 'hidden',
    ...withShadow('sm'),
    ...(Platform.OS === 'web' ? {
      // @ts-ignore
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    } : {}),
  },
  dealCardInner: {
    padding: glassTheme.spacing.sm,
  },
  dealCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: glassTheme.spacing.xs,
  },
  dealTitle: {
    ...glassTheme.typography.bodySmall,
    fontWeight: '600',
    color: glassTheme.colors.text.primary,
    flex: 1,
    marginRight: glassTheme.spacing.sm,
  },
  probabilityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: glassTheme.radius.sm,
  },
  probabilityText: {
    ...glassTheme.typography.caption,
    fontWeight: '700',
  },
  dealCompany: {
    ...glassTheme.typography.caption,
    fontWeight: '500',
    color: glassTheme.colors.text.secondary,
    marginBottom: 2,
  },
  dealContact: {
    ...glassTheme.typography.caption,
    color: glassTheme.colors.text.tertiary,
    marginBottom: glassTheme.spacing.sm,
  },
  dealProgressContainer: {
    marginBottom: glassTheme.spacing.sm,
  },
  dealProgressTrack: {
    height: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  dealProgressFill: {
    height: '100%',
    borderRadius: 2,
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
    ...glassTheme.typography.caption,
    fontWeight: '700',
    color: '#34C759',
  },
  dealDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dealDateText: {
    ...glassTheme.typography.caption,
    color: glassTheme.colors.text.tertiary,
  },
  emptyStage: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: glassTheme.spacing.xl,
  },
  emptyStageText: {
    ...glassTheme.typography.body,
    color: glassTheme.colors.text.tertiary,
  },
  emptyStageSubtext: {
    ...glassTheme.typography.caption,
    color: glassTheme.colors.text.quaternary,
    marginTop: 4,
  },
  addDealButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: glassTheme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.04)',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  addDealText: {
    ...glassTheme.typography.bodySmall,
    fontWeight: '600',
    color: '#007AFF',
  },
  // Modal styles
  modalValueCard: {
    borderRadius: glassTheme.radius.lg,
    overflow: 'hidden',
    marginBottom: glassTheme.spacing.lg,
  },
  modalValueGradient: {
    padding: glassTheme.spacing.lg,
    alignItems: 'center',
  },
  modalValueLabel: {
    ...glassTheme.typography.caption,
    color: glassTheme.colors.text.tertiary,
    marginBottom: 4,
  },
  modalValueAmount: {
    ...glassTheme.typography.displayMedium,
    color: '#34C759',
  },
  modalInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: glassTheme.spacing.sm,
    marginBottom: glassTheme.spacing.lg,
  },
  modalInfoItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderRadius: glassTheme.radius.md,
    padding: glassTheme.spacing.sm,
  },
  modalInfoLabel: {
    ...glassTheme.typography.caption,
    color: glassTheme.colors.text.tertiary,
    marginBottom: 2,
  },
  modalInfoValue: {
    ...glassTheme.typography.body,
    fontWeight: '600',
    color: glassTheme.colors.text.primary,
  },
  modalSection: {
    marginBottom: glassTheme.spacing.lg,
  },
  modalSectionTitle: {
    ...glassTheme.typography.label,
    color: glassTheme.colors.text.tertiary,
    marginBottom: glassTheme.spacing.sm,
  },
  probabilityHint: {
    ...glassTheme.typography.caption,
    color: glassTheme.colors.text.tertiary,
    marginTop: glassTheme.spacing.xs,
    textAlign: 'center',
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
  stageButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: glassTheme.spacing.sm,
  },
  stageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: glassTheme.spacing.md,
    paddingVertical: glassTheme.spacing.sm,
    borderRadius: glassTheme.radius.full,
    borderWidth: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  stageButtonDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stageButtonText: {
    ...glassTheme.typography.bodySmall,
    fontWeight: '600',
  },
  modalActions: {
    marginTop: glassTheme.spacing.lg,
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
  stageSelectGrid: {
    gap: glassTheme.spacing.sm,
  },
  stageSelectOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: glassTheme.spacing.sm,
    paddingHorizontal: glassTheme.spacing.md,
    paddingVertical: glassTheme.spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderRadius: glassTheme.radius.md,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  stageSelectDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  stageSelectText: {
    ...glassTheme.typography.body,
    color: glassTheme.colors.text.secondary,
  },
  formNote: {
    ...glassTheme.typography.caption,
    color: glassTheme.colors.text.tertiary,
    fontStyle: 'italic',
    marginTop: glassTheme.spacing.md,
  },
});

export default withGlassLayout(DealsScreen);
