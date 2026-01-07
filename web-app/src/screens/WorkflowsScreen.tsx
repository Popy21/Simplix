import React, { useState, useEffect, useCallback } from 'react';
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
  Alert,
  ActivityIndicator,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { withGlassLayout } from '../components/withGlassLayout';
import { workflowsService } from '../services/api';
import { useAuth } from '../context/AuthContext';

type WorkflowsScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Dashboard'>;
};

interface WorkflowAction {
  id?: string;
  type: 'send_email' | 'create_task' | 'add_activity' | 'move_deal' | 'assign_contact' | 'add_tag' | 'send_notification';
  config: {
    templateId?: string;
    taskTitle?: string;
    dealStage?: string;
    assignTo?: string;
    tagName?: string;
    message?: string;
    title?: string;
    description?: string;
    dueDate?: string;
    to?: string;
    subject?: string;
    activityType?: string;
    stageId?: string;
    tag?: string;
    metadata?: any;
  };
}

interface Workflow {
  id: string;
  name: string;
  description?: string;
  trigger: {
    type: 'contact_created' | 'contact_updated' | 'deal_created' | 'deal_moved' | 'activity_logged' | 'quote_accepted';
    conditions?: any;
  };
  actions: WorkflowAction[];
  enabled: boolean;
  execution_count: number;
  last_execution_at?: string;
}

interface WorkflowExecution {
  id: string;
  workflow_id: string;
  status: string;
  trigger_data: any;
  actions_executed: any;
  error_message?: string;
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
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

function WorkflowsScreen({ navigation }: WorkflowsScreenProps) {
  const { user } = useAuth();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [builderVisible, setBuilderVisible] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [templatesVisible, setTemplatesVisible] = useState(false);
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [loadingExecutions, setLoadingExecutions] = useState(false);

  // Form state
  const [workflowName, setWorkflowName] = useState('');
  const [workflowDescription, setWorkflowDescription] = useState('');
  const [selectedTrigger, setSelectedTrigger] = useState('');
  const [workflowActions, setWorkflowActions] = useState<WorkflowAction[]>([]);
  const [isEnabled, setIsEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    if (!user?.organization_id) return;

    try {
      setLoading(true);
      const response = await workflowsService.getAll(user.organization_id);
      setWorkflows(response.data.workflows || []);
    } catch (error) {
      console.error('Error loading workflows:', error);
      Alert.alert('Erreur', 'Impossible de charger les workflows');
    } finally {
      setLoading(false);
    }
  };

  const loadExecutions = async (workflowId: string) => {
    try {
      setLoadingExecutions(true);
      const response = await workflowsService.getExecutions(workflowId, { limit: 20, offset: 0 });
      setExecutions(response.data.executions || []);
    } catch (error) {
      console.error('Error loading executions:', error);
      Alert.alert('Erreur', 'Impossible de charger l\'historique');
    } finally {
      setLoadingExecutions(false);
    }
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

  const toggleWorkflow = async (workflow: Workflow) => {
    try {
      await workflowsService.update(workflow.id, { enabled: !workflow.enabled });
      setWorkflows(workflows.map(w =>
        w.id === workflow.id ? { ...w, enabled: !w.enabled } : w
      ));
    } catch (error) {
      console.error('Error toggling workflow:', error);
      Alert.alert('Erreur', 'Impossible de modifier le workflow');
    }
  };

  const openBuilder = (workflow?: Workflow) => {
    if (workflow) {
      setSelectedWorkflow(workflow);
      setWorkflowName(workflow.name);
      setWorkflowDescription(workflow.description || '');
      setSelectedTrigger(workflow.trigger.type);
      setWorkflowActions(workflow.actions || []);
      setIsEnabled(workflow.enabled);
    } else {
      setSelectedWorkflow(null);
      setWorkflowName('');
      setWorkflowDescription('');
      setSelectedTrigger('');
      setWorkflowActions([]);
      setIsEnabled(true);
    }
    setBuilderVisible(true);
  };

  const closeBuilder = () => {
    setBuilderVisible(false);
    setSelectedWorkflow(null);
    setWorkflowName('');
    setWorkflowDescription('');
    setSelectedTrigger('');
    setWorkflowActions([]);
    setIsEnabled(true);
  };

  const saveWorkflow = async () => {
    if (!workflowName.trim()) {
      Alert.alert('Erreur', 'Le nom du workflow est requis');
      return;
    }

    if (!selectedTrigger) {
      Alert.alert('Erreur', 'Veuillez sélectionner un trigger');
      return;
    }

    if (workflowActions.length === 0) {
      Alert.alert('Erreur', 'Ajoutez au moins une action');
      return;
    }

    if (!user?.organization_id) return;

    try {
      setSaving(true);

      const workflowData = {
        organizationId: user.organization_id,
        name: workflowName,
        description: workflowDescription,
        trigger: { type: selectedTrigger },
        actions: workflowActions,
        enabled: isEnabled,
      };

      if (selectedWorkflow) {
        await workflowsService.update(selectedWorkflow.id, workflowData);
      } else {
        await workflowsService.create(workflowData);
      }

      Alert.alert('Succès', selectedWorkflow ? 'Workflow mis à jour' : 'Workflow créé');
      closeBuilder();
      loadWorkflows();
    } catch (error) {
      console.error('Error saving workflow:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder le workflow');
    } finally {
      setSaving(false);
    }
  };

  const deleteWorkflow = async (workflowId: string) => {
    Alert.alert(
      'Confirmer la suppression',
      'Êtes-vous sûr de vouloir supprimer ce workflow ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await workflowsService.delete(workflowId);
              Alert.alert('Succès', 'Workflow supprimé');
              loadWorkflows();
            } catch (error) {
              console.error('Error deleting workflow:', error);
              Alert.alert('Erreur', 'Impossible de supprimer le workflow');
            }
          },
        },
      ]
    );
  };

  const addAction = (actionType: string) => {
    const newAction: WorkflowAction = {
      id: `action_${Date.now()}`,
      type: actionType as any,
      config: {},
    };
    setWorkflowActions([...workflowActions, newAction]);
    setTemplatesVisible(false);
  };

  const removeAction = (index: number) => {
    setWorkflowActions(workflowActions.filter((_, i) => i !== index));
  };

  const updateActionConfig = (index: number, key: string, value: string) => {
    const updatedActions = [...workflowActions];
    updatedActions[index].config = {
      ...updatedActions[index].config,
      [key]: value,
    };
    setWorkflowActions(updatedActions);
  };

  const renderWorkflowCard = ({ item: workflow }: { item: Workflow }) => {
    const triggerLabel = TRIGGERS.find(t => t.id === workflow.trigger.type)?.label || workflow.trigger.type;

    return (
      <TouchableOpacity
        style={[
          styles.workflowCard,
          !workflow.enabled && styles.workflowCardInactive,
        ]}
        onPress={() => openBuilder(workflow)}
        onLongPress={() => deleteWorkflow(workflow.id)}
      >
        <View style={styles.workflowCardHeader}>
          <View style={styles.workflowTitle}>
            <Text style={styles.workflowName} numberOfLines={1}>{workflow.name}</Text>
            <View style={[styles.triggerBadge, { backgroundColor: `${getTriggerColor(workflow.trigger.type)}20` }]}>
              <Text style={[styles.triggerBadgeText, { color: getTriggerColor(workflow.trigger.type) }]}>
                {triggerLabel}
              </Text>
            </View>
          </View>
          <Switch
            value={workflow.enabled}
            onValueChange={() => toggleWorkflow(workflow)}
            trackColor={{ false: '#E5E5EA', true: '#34C75940' }}
            thumbColor={workflow.enabled ? '#34C759' : '#F0F0F0'}
          />
        </View>

        {/* Workflow Chain */}
        <View style={styles.workflowChain}>
          <View style={[styles.chainNode, { backgroundColor: `${getTriggerColor(workflow.trigger.type)}20` }]}>
            <Text style={styles.chainNodeLabel}>Trigger</Text>
          </View>

          {workflow.actions.map((action, index) => (
            <React.Fragment key={index}>
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
            <Text style={styles.statValue}>{workflow.execution_count || 0}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Dernière</Text>
            <Text style={styles.statValue}>
              {workflow.last_execution_at
                ? new Date(workflow.last_execution_at).toLocaleDateString('fr-FR')
                : 'Jamais'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.historyButton}
            onPress={() => {
              setSelectedWorkflow(workflow);
              loadExecutions(workflow.id);
              setHistoryVisible(true);
            }}
          >
            <Text style={styles.historyButtonText}>Historique</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

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
            {workflows.filter(w => w.enabled).length}
          </Text>
          <Text style={styles.statCardLabel}>Actifs</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statCardValue}>
            {workflows.reduce((sum, w) => sum + (w.execution_count || 0), 0)}
          </Text>
          <Text style={styles.statCardLabel}>Exécutions</Text>
        </View>
      </View>

      {/* Create Button */}
      <TouchableOpacity
        style={styles.createButton}
        onPress={() => openBuilder()}
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
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>Aucun workflow configuré</Text>
            <Text style={styles.emptyStateSubtext}>
              Créez votre premier workflow pour automatiser vos processus
            </Text>
          </View>
        }
      />

      {/* Workflow Builder Modal */}
      <Modal
        visible={builderVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={closeBuilder}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedWorkflow ? 'Modifier Workflow' : 'Nouveau Workflow'}
              </Text>
              <TouchableOpacity onPress={closeBuilder}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Workflow Name */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Nom du Workflow *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Bienvenue Auto-Contact"
                  value={workflowName}
                  onChangeText={setWorkflowName}
                />
              </View>

              {/* Description */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Description du workflow..."
                  value={workflowDescription}
                  onChangeText={setWorkflowDescription}
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* Trigger Selection */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Sélectionner le Trigger *</Text>
                <View style={styles.triggersContainer}>
                  {TRIGGERS.map(trigger => (
                    <TouchableOpacity
                      key={trigger.id}
                      style={[
                        styles.triggerOption,
                        selectedTrigger === trigger.id && styles.triggerOptionActive,
                      ]}
                      onPress={() => setSelectedTrigger(trigger.id)}
                    >
                      <Text
                        style={[
                          styles.triggerOptionText,
                          selectedTrigger === trigger.id && styles.triggerOptionTextActive,
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
                  <Text style={styles.formLabel}>Actions *</Text>
                  <TouchableOpacity
                    style={styles.addActionButton}
                    onPress={() => setTemplatesVisible(true)}
                  >
                    <Text style={styles.addActionButtonText}>+ Ajouter</Text>
                  </TouchableOpacity>
                </View>

                {workflowActions.length > 0 ? (
                  <View style={styles.actionsChain}>
                    {workflowActions.map((action, index) => (
                      <View key={index} style={styles.actionRow}>
                        <Text style={styles.actionIndex}>{index + 1}</Text>
                        <View style={styles.actionContent}>
                          <Text style={styles.actionType}>
                            {ACTION_TYPES.find(a => a.id === action.type)?.label}
                          </Text>

                          {/* Dynamic config based on action type */}
                          {action.type === 'create_task' && (
                            <TextInput
                              style={styles.actionInput}
                              placeholder="Titre de la tâche"
                              value={action.config.title || ''}
                              onChangeText={(text) => updateActionConfig(index, 'title', text)}
                            />
                          )}
                          {action.type === 'add_tag' && (
                            <TextInput
                              style={styles.actionInput}
                              placeholder="Nom du tag"
                              value={action.config.tag || ''}
                              onChangeText={(text) => updateActionConfig(index, 'tag', text)}
                            />
                          )}
                          {action.type === 'send_email' && (
                            <>
                              <TextInput
                                style={styles.actionInput}
                                placeholder="Sujet de l'email"
                                value={action.config.subject || ''}
                                onChangeText={(text) => updateActionConfig(index, 'subject', text)}
                              />
                            </>
                          )}
                        </View>
                        <TouchableOpacity
                          style={styles.deleteActionButton}
                          onPress={() => removeAction(index)}
                        >
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

              {/* Active Switch */}
              <View style={styles.formGroup}>
                <View style={styles.conditionHeader}>
                  <Text style={styles.formLabel}>Activer le workflow</Text>
                  <Switch
                    value={isEnabled}
                    onValueChange={setIsEnabled}
                    trackColor={{ false: '#E5E5EA', true: '#34C75940' }}
                    thumbColor={isEnabled ? '#34C759' : '#F0F0F0'}
                  />
                </View>
              </View>

              {/* Action Type Selector */}
              {templatesVisible && (
                <View style={styles.templateSelector}>
                  <Text style={styles.formLabel}>Sélectionner une Action</Text>
                  <View style={styles.actionTypesGrid}>
                    {ACTION_TYPES.map(actionType => (
                      <TouchableOpacity
                        key={actionType.id}
                        style={styles.actionTypeButton}
                        onPress={() => addAction(actionType.id)}
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
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={closeBuilder}
              >
                <Text style={styles.buttonSecondaryText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.buttonPrimary]}
                onPress={saveWorkflow}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonPrimaryText}>
                    {selectedWorkflow ? 'Mettre à jour' : 'Créer'}
                  </Text>
                )}
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
              {loadingExecutions ? (
                <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 20 }} />
              ) : (
                <>
                  <View style={styles.executionStats}>
                    <View style={styles.executionStatBox}>
                      <Text style={styles.executionStatValue}>
                        {executions.length}
                      </Text>
                      <Text style={styles.executionStatLabel}>Total</Text>
                    </View>
                    <View style={styles.executionStatBox}>
                      <Text style={styles.executionStatValue}>
                        {Math.round((executions.filter(e => e.status === 'completed').length / Math.max(executions.length, 1)) * 100)}%
                      </Text>
                      <Text style={styles.executionStatLabel}>Succès</Text>
                    </View>
                    <View style={styles.executionStatBox}>
                      <Text style={styles.executionStatValue}>
                        {Math.round((executions.filter(e => e.status === 'failed').length / Math.max(executions.length, 1)) * 100)}%
                      </Text>
                      <Text style={styles.executionStatLabel}>Erreur</Text>
                    </View>
                  </View>

                  <Text style={styles.sectionTitle}>Dernières Exécutions</Text>
                  {executions.length > 0 ? (
                    executions.map((execution) => (
                      <View key={execution.id} style={styles.executionCard}>
                        <View style={styles.executionCardHeader}>
                          <View>
                            <Text style={styles.executionDate}>
                              {new Date(execution.started_at).toLocaleDateString('fr-FR')}
                            </Text>
                            <Text style={styles.executionTime}>
                              {new Date(execution.started_at).toLocaleTimeString('fr-FR')}
                            </Text>
                          </View>
                          <View style={[
                            styles.executionStatusBadge,
                            { backgroundColor: execution.status === 'completed' ? '#34C75920' : '#FF3B3020' }
                          ]}>
                            <Text style={{
                              color: execution.status === 'completed' ? '#34C759' : '#FF3B30',
                              fontWeight: '600',
                              fontSize: 11,
                            }}>
                              {execution.status === 'completed' ? '✓ Succès' : '✕ Erreur'}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.executionDetails}>
                          {execution.duration_ms && (
                            <Text style={styles.executionDetail}>
                              Durée: {execution.duration_ms}ms
                            </Text>
                          )}
                          {execution.error_message && (
                            <Text style={[styles.executionDetail, { color: '#FF3B30' }]}>
                              Erreur: {execution.error_message}
                            </Text>
                          )}
                        </View>
                      </View>
                    ))
                  ) : (
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyStateText}>Aucune exécution</Text>
                    </View>
                  )}
                </>
              )}
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    flexWrap: 'wrap',
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
  textArea: {
    height: 80,
    textAlignVertical: 'top',
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
    alignItems: 'flex-start',
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
    marginBottom: 6,
  },
  actionInput: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    color: '#000000',
    backgroundColor: '#FFFFFF',
    marginTop: 4,
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
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 12,
    color: '#C7C7CC',
    textAlign: 'center',
  },
});

export default withGlassLayout(WorkflowsScreen);
