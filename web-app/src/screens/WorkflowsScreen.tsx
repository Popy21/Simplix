import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
  Platform,
  Switch,
  TextInput,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { UsersIcon, TrendingUpIcon } from '../components/Icons';

type WorkflowsScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Dashboard'>;
};

interface WorkflowAction {
  id: string;
  type: 'send_email' | 'create_task' | 'add_activity' | 'move_deal' | 'assign_contact' | 'add_tag' | 'send_notification';
  config: {
    templateId?: string;
    taskTitle?: string;
    dealStage?: string;
    assignTo?: string;
    tagName?: string;
    message?: string;
  };
}

interface Workflow {
  id: string;
  name: string;
  trigger: string;
  triggerLabel: string;
  actions: WorkflowAction[];
  isActive: boolean;
  executionCount: number;
  lastExecuted: string;
  category: string;
}

const TRIGGERS = [
  { id: 'contact_created', label: 'Contact créé' },
  { id: 'contact_updated', label: 'Contact modifié' },
  { id: 'deal_created', label: 'Deal créé' },
  { id: 'deal_moved', label: 'Deal déplacé' },
  { id: 'activity_logged', label: 'Activité enregistrée' },
  { id: 'quote_accepted', label: 'Devis accepté' },
];

const ACTION_TYPES = [
  { id: 'send_email', label: '📧 Envoyer Email', icon: '📧' },
  { id: 'create_task', label: '✓ Créer Tâche', icon: '✓' },
  { id: 'add_activity', label: '📝 Ajouter Activité', icon: '📝' },
  { id: 'move_deal', label: '➜ Déplacer Deal', icon: '➜' },
  { id: 'assign_contact', label: '👤 Assigner Contact', icon: '👤' },
  { id: 'add_tag', label: '🏷 Ajouter Tag', icon: '🏷' },
  { id: 'send_notification', label: '🔔 Notifier', icon: '🔔' },
];

export default function WorkflowsScreen({ navigation }: WorkflowsScreenProps) {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [builderVisible, setBuilderVisible] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [templatesVisible, setTemplatesVisible] = useState(false);

  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = () => {
    const mockWorkflows: Workflow[] = [
      {
        id: 'w1',
        name: 'Bienvenue Auto-Contact',
        trigger: 'contact_created',
        triggerLabel: 'Contact créé',
        actions: [
          {
            id: 'a1',
            type: 'send_email',
            config: { templateId: 'welcome_template' },
          },
          {
            id: 'a2',
            type: 'create_task',
            config: { taskTitle: 'Appel de suivi' },
          },
          {
            id: 'a3',
            type: 'add_tag',
            config: { tagName: 'Nouveau Contact' },
          },
        ],
        isActive: true,
        executionCount: 47,
        lastExecuted: '2025-11-19',
        category: 'contacts',
      },
      {
        id: 'w2',
        name: 'Qualification Deal',
        trigger: 'deal_created',
        triggerLabel: 'Deal créé',
        actions: [
          {
            id: 'a1',
            type: 'assign_contact',
            config: { assignTo: 'Commercial Team' },
          },
          {
            id: 'a2',
            type: 'send_notification',
            config: { message: 'Nouveau deal créé, qualification requise' },
          },
        ],
        isActive: true,
        executionCount: 23,
        lastExecuted: '2025-11-18',
        category: 'deals',
      },
      {
        id: 'w3',
        name: 'Relance Deal en Attente',
        trigger: 'deal_moved',
        triggerLabel: 'Deal déplacé',
        actions: [
          {
            id: 'a1',
            type: 'create_task',
            config: { taskTitle: 'Relancer le prospect' },
          },
          {
            id: 'a2',
            type: 'send_email',
            config: { templateId: 'follow_up_template' },
          },
        ],
        isActive: true,
        executionCount: 15,
        lastExecuted: '2025-11-17',
        category: 'deals',
      },
      {
        id: 'w4',
        name: 'Devis Accepté',
        trigger: 'quote_accepted',
        triggerLabel: 'Devis accepté',
        actions: [
          {
            id: 'a1',
            type: 'move_deal',
            config: { dealStage: 'Négociation' },
          },
          {
            id: 'a2',
            type: 'create_task',
            config: { taskTitle: 'Créer facture proforma' },
          },
          {
            id: 'a3',
            type: 'send_email',
            config: { templateId: 'quote_accepted_template' },
          },
        ],
        isActive: false,
        executionCount: 8,
        lastExecuted: '2025-11-10',
        category: 'quotes',
      },
    ];

    setWorkflows(mockWorkflows);
  };

  const getTriggerColor = (trigger: string) => {
    const colors: { [key: string]: string } = {
      contact_created: '#34C759',
      contact_updated: '#00B894',
      deal_created: '#007AFF',
      deal_moved: '#5856D6',
      activity_logged: '#FF9500',
      quote_accepted: '#FF3B30',
    };
    return colors[trigger] || '#8E8E93';
  };

  const toggleWorkflow = (workflowId: string) => {
    setWorkflows(workflows.map(w =>
      w.id === workflowId ? { ...w, isActive: !w.isActive } : w
    ));
  };

  const renderWorkflowCard = ({ item: workflow }: { item: Workflow }) => (
    <TouchableOpacity
      style={[
        styles.workflowCard,
        !workflow.isActive && styles.workflowCardInactive,
      ]}
      onPress={() => {
        setSelectedWorkflow(workflow);
        setBuilderVisible(true);
      }}
    >
      <View style={styles.workflowCardHeader}>
        <View style={styles.workflowTitle}>
          <Text style={styles.workflowName} numberOfLines={1}>{workflow.name}</Text>
          <View style={[styles.triggerBadge, { backgroundColor: `${getTriggerColor(workflow.trigger)}20` }]}>
            <Text style={[styles.triggerBadgeText, { color: getTriggerColor(workflow.trigger) }]}>
              {workflow.triggerLabel}
            </Text>
          </View>
        </View>
        <Switch
          value={workflow.isActive}
          onValueChange={() => toggleWorkflow(workflow.id)}
          trackColor={{ false: '#E5E5EA', true: '#34C75940' }}
          thumbColor={workflow.isActive ? '#34C759' : '#F0F0F0'}
        />
      </View>

      {/* Workflow Chain */}
      <View style={styles.workflowChain}>
        <View style={[styles.chainNode, { backgroundColor: `${getTriggerColor(workflow.trigger)}20` }]}>
          <Text style={styles.chainNodeLabel}>Trigger</Text>
        </View>

        {workflow.actions.map((action, index) => (
          <React.Fragment key={action.id}>
            <View style={styles.chainArrow}>
              <Text style={styles.arrowText}>→</Text>
            </View>
            <View style={styles.chainNode}>
              <Text style={styles.chainNodeIcon}>
                {ACTION_TYPES.find(a => a.id === action.type)?.icon}
              </Text>
            </View>
          </React.Fragment>
        ))}
      </View>

      <View style={styles.workflowFooter}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Exécutions</Text>
          <Text style={styles.statValue}>{workflow.executionCount}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Dernière</Text>
          <Text style={styles.statValue}>{workflow.lastExecuted}</Text>
        </View>
        <TouchableOpacity
          style={styles.historyButton}
          onPress={() => {
            setSelectedWorkflow(workflow);
            setHistoryVisible(true);
          }}
        >
          <Text style={styles.historyButtonText}>Historique</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>⚙️ Workflows</Text>
        <Text style={styles.headerSubtitle}>Automation & Triggers</Text>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statCardValue}>{workflows.length}</Text>
          <Text style={styles.statCardLabel}>Workflows</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statCardValue}>
            {workflows.filter(w => w.isActive).length}
          </Text>
          <Text style={styles.statCardLabel}>Actifs</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statCardValue}>
            {workflows.reduce((sum, w) => sum + w.executionCount, 0)}
          </Text>
          <Text style={styles.statCardLabel}>Exécutions</Text>
        </View>
      </View>

      {/* Create Button */}
      <TouchableOpacity
        style={styles.createButton}
        onPress={() => {
          setSelectedWorkflow(null);
          setBuilderVisible(true);
        }}
      >
        <Text style={styles.createButtonIcon}>+</Text>
        <Text style={styles.createButtonText}>Créer un Workflow</Text>
      </TouchableOpacity>

      {/* Workflows List */}
      <FlatList
        data={workflows}
        renderItem={renderWorkflowCard}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        scrollEnabled={true}
      />

      {/* Workflow Builder Modal */}
      <Modal
        visible={builderVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setBuilderVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedWorkflow ? selectedWorkflow.name : 'Nouveau Workflow'}
              </Text>
              <TouchableOpacity onPress={() => setBuilderVisible(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Workflow Name */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Nom du Workflow</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Bienvenue Auto-Contact"
                  defaultValue={selectedWorkflow?.name}
                />
              </View>

              {/* Trigger Selection */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Sélectionner le Trigger</Text>
                <View style={styles.triggersContainer}>
                  {TRIGGERS.map(trigger => (
                    <TouchableOpacity
                      key={trigger.id}
                      style={[
                        styles.triggerOption,
                        selectedWorkflow?.trigger === trigger.id && styles.triggerOptionActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.triggerOptionText,
                          selectedWorkflow?.trigger === trigger.id && styles.triggerOptionTextActive,
                        ]}
                      >
                        {trigger.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Actions */}
              <View style={styles.formGroup}>
                <View style={styles.actionsHeader}>
                  <Text style={styles.formLabel}>Actions</Text>
                  <TouchableOpacity
                    style={styles.addActionButton}
                    onPress={() => setTemplatesVisible(true)}
                  >
                    <Text style={styles.addActionButtonText}>+ Ajouter</Text>
                  </TouchableOpacity>
                </View>

                {selectedWorkflow?.actions && selectedWorkflow.actions.length > 0 ? (
                  <View style={styles.actionsChain}>
                    {selectedWorkflow.actions.map((action, index) => (
                      <View key={action.id} style={styles.actionRow}>
                        <Text style={styles.actionIndex}>{index + 1}</Text>
                        <View style={styles.actionContent}>
                          <Text style={styles.actionType}>
                            {ACTION_TYPES.find(a => a.id === action.type)?.label}
                          </Text>
                          {action.config.templateId && (
                            <Text style={styles.actionConfig}>Template: {action.config.templateId}</Text>
                          )}
                          {action.config.taskTitle && (
                            <Text style={styles.actionConfig}>Tâche: {action.config.taskTitle}</Text>
                          )}
                          {action.config.tagName && (
                            <Text style={styles.actionConfig}>Tag: {action.config.tagName}</Text>
                          )}
                        </View>
                        <TouchableOpacity style={styles.deleteActionButton}>
                          <Text style={styles.deleteActionButtonText}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.emptyActions}>
                    <Text style={styles.emptyActionsText}>Aucune action configurée</Text>
                  </View>
                )}
              </View>

              {/* Conditions (Optional) */}
              <View style={styles.formGroup}>
                <View style={styles.conditionHeader}>
                  <Text style={styles.formLabel}>Conditions (Optionnel)</Text>
                  <Switch value={false} />
                </View>
                <Text style={styles.conditionHint}>
                  Limiter l'exécution en fonction de critères spécifiques
                </Text>
              </View>

              {/* Template Selection Modal Content */}
              {templatesVisible && (
                <View style={styles.templateSelector}>
                  <Text style={styles.formLabel}>Sélectionner une Action</Text>
                  <View style={styles.actionTypesGrid}>
                    {ACTION_TYPES.map(actionType => (
                      <TouchableOpacity
                        key={actionType.id}
                        style={styles.actionTypeButton}
                        onPress={() => setTemplatesVisible(false)}
                      >
                        <Text style={styles.actionTypeIcon}>{actionType.icon}</Text>
                        <Text style={styles.actionTypeLabel}>{actionType.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={[styles.button, styles.buttonSecondary]}>
                <Text style={styles.buttonSecondaryText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, styles.buttonPrimary]}>
                <Text style={styles.buttonPrimaryText}>Enregistrer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Execution History Modal */}
      <Modal
        visible={historyVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setHistoryVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Historique: {selectedWorkflow?.name}
              </Text>
              <TouchableOpacity onPress={() => setHistoryVisible(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.executionStats}>
                <View style={styles.executionStatBox}>
                  <Text style={styles.executionStatValue}>
                    {selectedWorkflow?.executionCount}
                  </Text>
                  <Text style={styles.executionStatLabel}>Total</Text>
                </View>
                <View style={styles.executionStatBox}>
                  <Text style={styles.executionStatValue}>98%</Text>
                  <Text style={styles.executionStatLabel}>Succès</Text>
                </View>
                <View style={styles.executionStatBox}>
                  <Text style={styles.executionStatValue}>2%</Text>
                  <Text style={styles.executionStatLabel}>Erreur</Text>
                </View>
              </View>

              <Text style={styles.sectionTitle}>Dernières Exécutions</Text>
              {[1, 2, 3, 4, 5].map(index => (
                <View key={index} style={styles.executionCard}>
                  <View style={styles.executionCardHeader}>
                    <View>
                      <Text style={styles.executionDate}>
                        2025-11-{20 - index}
                      </Text>
                      <Text style={styles.executionTime}>14:30:45</Text>
                    </View>
                    <View style={[
                      styles.executionStatusBadge,
                      { backgroundColor: index < 4 ? '#34C75920' : '#FF3B3020' }
                    ]}>
                      <Text style={{
                        color: index < 4 ? '#34C759' : '#FF3B30',
                        fontWeight: '600',
                        fontSize: 11,
                      }}>
                        {index < 4 ? '✓ Succès' : '✕ Erreur'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.executionDetails}>
                    <Text style={styles.executionDetail}>Entité ID: #{12345 + index}</Text>
                    <Text style={styles.executionDetail}>Actions: {selectedWorkflow?.actions.length || 0} / {selectedWorkflow?.actions.length || 0}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.closeModal}
              onPress={() => setHistoryVisible(false)}
            >
              <Text style={styles.closeModalText}>Fermer</Text>
            </TouchableOpacity>
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
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 12,
    borderRadius: 12,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statCardValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 2,
  },
  statCardLabel: {
    fontSize: 11,
    color: '#8E8E93',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    justifyContent: 'center',
    gap: 8,
  },
  createButtonIcon: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  createButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    gap: 8,
  },
  workflowCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  workflowCardInactive: {
    opacity: 0.6,
  },
  workflowCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  workflowTitle: {
    flex: 1,
    marginRight: 8,
  },
  workflowName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
  },
  triggerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  triggerBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  workflowChain: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F2F2F7',
  },
  chainNode: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F2F2F7',
  },
  chainNodeLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#000000',
  },
  chainNodeIcon: {
    fontSize: 14,
  },
  chainArrow: {
    marginHorizontal: 4,
  },
  arrowText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
  },
  workflowFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    color: '#8E8E93',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000000',
  },
  historyButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#007AFF',
    borderRadius: 6,
  },
  historyButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
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
    maxHeight: '95%',
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
  closeButton: {
    fontSize: 24,
    color: '#8E8E93',
  },
  modalBody: {
    maxHeight: 450,
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
  triggersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  triggerOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  triggerOptionActive: {
    backgroundColor: '#007AFF20',
    borderColor: '#007AFF',
  },
  triggerOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
  },
  triggerOptionTextActive: {
    color: '#007AFF',
  },
  actionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addActionButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addActionButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  actionsChain: {
    gap: 8,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  actionIndex: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    color: '#FFFFFF',
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 24,
    fontSize: 12,
  },
  actionContent: {
    flex: 1,
  },
  actionType: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000000',
  },
  actionConfig: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 2,
  },
  deleteActionButton: {
    padding: 4,
  },
  deleteActionButtonText: {
    fontSize: 16,
    color: '#FF3B30',
    fontWeight: '700',
  },
  emptyActions: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
  },
  emptyActionsText: {
    fontSize: 12,
    color: '#C7C7CC',
  },
  conditionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  conditionHint: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 6,
  },
  templateSelector: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  actionTypesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionTypeButton: {
    width: '48%',
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    alignItems: 'center',
  },
  actionTypeIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  actionTypeLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
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
  executionStats: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  executionStatBox: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  executionStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
  },
  executionStatLabel: {
    fontSize: 10,
    color: '#8E8E93',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 12,
  },
  executionCard: {
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  executionCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  executionDate: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000000',
  },
  executionTime: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 2,
  },
  executionStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  executionDetails: {
    gap: 2,
  },
  executionDetail: {
    fontSize: 11,
    color: '#8E8E93',
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
});
