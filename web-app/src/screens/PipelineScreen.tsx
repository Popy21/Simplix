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
  Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { CheckCircleIcon, ClockIcon, XCircleIcon, FileTextIcon, DollarIcon } from '../components/Icons';

type PipelineScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Pipeline'>;
};

type OpportunityStatus = 'prospect' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';

interface Opportunity {
  id: string;
  title: string;
  company: string;
  value: number;
  status: OpportunityStatus;
  probability: number;
  expectedCloseDate: string;
  contact: string;
  notes: string;
}

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = Math.min(width - 40, 320);

export default function PipelineScreen({ navigation }: PipelineScreenProps) {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([
    {
      id: '1',
      title: 'Contrat Annuel SaaS',
      company: 'TechCorp',
      value: 50000,
      status: 'prospect',
      probability: 20,
      expectedCloseDate: '2025-12-31',
      contact: 'Marie Dubois',
      notes: 'Premier contact établi',
    },
    {
      id: '2',
      title: 'Migration Cloud',
      company: 'StartupXYZ',
      value: 75000,
      status: 'qualified',
      probability: 40,
      expectedCloseDate: '2025-11-15',
      contact: 'Jean Martin',
      notes: 'Besoins confirmés',
    },
    {
      id: '3',
      title: 'Formation Équipe',
      company: 'BigCorp',
      value: 25000,
      status: 'proposal',
      probability: 60,
      expectedCloseDate: '2025-11-30',
      contact: 'Sophie Laurent',
      notes: 'Proposition envoyée',
    },
    {
      id: '4',
      title: 'Développement Custom',
      company: 'InnovTech',
      value: 120000,
      status: 'negotiation',
      probability: 80,
      expectedCloseDate: '2025-11-10',
      contact: 'Pierre Leroy',
      notes: 'Négociation finale en cours',
    },
  ]);

  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);

  const statusConfig: Record<OpportunityStatus, { label: string; color: string; icon: any }> = {
    prospect: { label: 'Prospect', color: '#8E8E93', icon: FileTextIcon },
    qualified: { label: 'Qualifié', color: '#007AFF', icon: CheckCircleIcon },
    proposal: { label: 'Proposition', color: '#FF9500', icon: FileTextIcon },
    negotiation: { label: 'Négociation', color: '#AF52DE', icon: DollarIcon },
    won: { label: 'Gagné', color: '#34C759', icon: CheckCircleIcon },
    lost: { label: 'Perdu', color: '#FF3B30', icon: XCircleIcon },
  };

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getTotalValue = (status: OpportunityStatus) => {
    return opportunities
      .filter((opp) => opp.status === status)
      .reduce((sum, opp) => sum + opp.value, 0);
  };

  const getWeightedValue = (status: OpportunityStatus) => {
    return opportunities
      .filter((opp) => opp.status === status)
      .reduce((sum, opp) => sum + (opp.value * opp.probability) / 100, 0);
  };

  const moveOpportunity = (opportunityId: string, newStatus: OpportunityStatus) => {
    setOpportunities((prev) =>
      prev.map((opp) => (opp.id === opportunityId ? { ...opp, status: newStatus } : opp))
    );
  };

  const openOpportunityDetails = (opportunity: Opportunity) => {
    setSelectedOpportunity(opportunity);
    setModalVisible(true);
  };

  const renderOpportunityCard = (opportunity: Opportunity) => {
    const config = statusConfig[opportunity.status];
    const Icon = config.icon;

    return (
      <TouchableOpacity
        key={opportunity.id}
        style={styles.opportunityCard}
        onPress={() => openOpportunityDetails(opportunity)}
        activeOpacity={0.8}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {opportunity.title}
          </Text>
          <View style={[styles.probabilityBadge, { backgroundColor: `${config.color}20` }]}>
            <Text style={[styles.probabilityText, { color: config.color }]}>
              {opportunity.probability}%
            </Text>
          </View>
        </View>

        <Text style={styles.cardCompany}>{opportunity.company}</Text>
        <Text style={styles.cardContact}>{opportunity.contact}</Text>

        <View style={styles.cardFooter}>
          <Text style={styles.cardValue}>{formatCurrency(opportunity.value)}</Text>
          <Text style={styles.cardDate}>
            {new Date(opportunity.expectedCloseDate).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'short',
            })}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderColumn = (status: OpportunityStatus) => {
    const config = statusConfig[status];
    const Icon = config.icon;
    const columnOpportunities = opportunities.filter((opp) => opp.status === status);
    const totalValue = getTotalValue(status);
    const weightedValue = getWeightedValue(status);

    return (
      <View key={status} style={styles.column}>
        <View style={[styles.columnHeader, { borderTopColor: config.color }]}>
          <View style={styles.columnTitleRow}>
            <Icon size={16} color={config.color} />
            <Text style={styles.columnTitle}>{config.label}</Text>
            <View style={[styles.countBadge, { backgroundColor: config.color }]}>
              <Text style={styles.countText}>{columnOpportunities.length}</Text>
            </View>
          </View>
          <Text style={styles.columnValue}>{formatCurrency(totalValue)}</Text>
          {status !== 'won' && status !== 'lost' && (
            <Text style={styles.columnWeighted}>
              Pondéré: {formatCurrency(weightedValue)}
            </Text>
          )}
        </View>

        <ScrollView
          style={styles.columnContent}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.columnCards}
        >
          {columnOpportunities.map((opp) => renderOpportunityCard(opp))}
          {columnOpportunities.length === 0 && (
            <View style={styles.emptyColumn}>
              <Text style={styles.emptyText}>Aucune opportunité</Text>
            </View>
          )}
        </ScrollView>
      </View>
    );
  };

  const totalPipelineValue = opportunities.reduce((sum, opp) => sum + opp.value, 0);
  const totalWeightedValue = opportunities.reduce(
    (sum, opp) => sum + (opp.value * opp.probability) / 100,
    0
  );

  return (
    <View style={styles.container}>
      {/* En-tête */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Pipeline</Text>
          <Text style={styles.headerSubtitle}>
            {opportunities.length} opportunités • {formatCurrency(totalPipelineValue)}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => Alert.alert('À venir', 'Fonctionnalité en développement')}
        >
          <Text style={styles.addButtonText}>+ Nouveau</Text>
        </TouchableOpacity>
      </View>

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
        {renderColumn('prospect')}
        {renderColumn('qualified')}
        {renderColumn('proposal')}
        {renderColumn('negotiation')}
        {renderColumn('won')}
        {renderColumn('lost')}
      </ScrollView>

      {/* Modal Détails */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedOpportunity && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{selectedOpportunity.title}</Text>
                  <TouchableOpacity onPress={() => setModalVisible(false)}>
                    <XCircleIcon size={24} color="#8E8E93" />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalBody}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Entreprise</Text>
                    <Text style={styles.detailValue}>{selectedOpportunity.company}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Contact</Text>
                    <Text style={styles.detailValue}>{selectedOpportunity.contact}</Text>
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
                      {new Date(selectedOpportunity.expectedCloseDate).toLocaleDateString('fr-FR')}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Statut</Text>
                    <Text style={styles.detailValue}>
                      {statusConfig[selectedOpportunity.status].label}
                    </Text>
                  </View>

                  {selectedOpportunity.notes && (
                    <View style={styles.notesContainer}>
                      <Text style={styles.detailLabel}>Notes</Text>
                      <Text style={styles.notesText}>{selectedOpportunity.notes}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.modalActions}>
                  <Text style={styles.actionsTitle}>Changer le statut</Text>
                  <View style={styles.statusButtons}>
                    {(Object.keys(statusConfig) as OpportunityStatus[]).map((status) => {
                      if (status === selectedOpportunity.status) return null;
                      const config = statusConfig[status];
                      return (
                        <TouchableOpacity
                          key={status}
                          style={[styles.statusButton, { borderColor: config.color }]}
                          onPress={() => {
                            moveOpportunity(selectedOpportunity.id, status);
                            setModalVisible(false);
                          }}
                        >
                          <Text style={[styles.statusButtonText, { color: config.color }]}>
                            {config.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
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
  opportunityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
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
});
