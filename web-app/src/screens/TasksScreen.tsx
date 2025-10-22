import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import {
  CheckCircleIcon,
  ClockIcon,
  AlertTriangleIcon,
  CalendarIcon,
  UsersIcon,
} from '../components/Icons';

type TasksScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Tasks'>;
};

type Priority = 'high' | 'medium' | 'low';
type TaskStatus = 'todo' | 'in_progress' | 'done';

interface Task {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  status: TaskStatus;
  dueDate: string;
  assignedTo: string;
  relatedTo?: string;
}

export default function TasksScreen({ navigation }: TasksScreenProps) {
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: '1',
      title: 'Appeler TechCorp pour rendez-vous',
      description: 'Planifier une démo du produit',
      priority: 'high',
      status: 'todo',
      dueDate: '2025-10-23',
      assignedTo: 'Marie Dubois',
      relatedTo: 'TechCorp',
    },
    {
      id: '2',
      title: 'Envoyer proposition commerciale',
      description: 'Préparer et envoyer la proposition pour BigCorp',
      priority: 'high',
      status: 'in_progress',
      dueDate: '2025-10-24',
      assignedTo: 'Jean Martin',
      relatedTo: 'BigCorp',
    },
    {
      id: '3',
      title: 'Relance client StartupXYZ',
      description: 'Follow-up sur le devis envoyé',
      priority: 'medium',
      status: 'todo',
      dueDate: '2025-10-25',
      assignedTo: 'Sophie Laurent',
      relatedTo: 'StartupXYZ',
    },
    {
      id: '4',
      title: 'Réunion équipe commerciale',
      description: 'Review des performances du mois',
      priority: 'medium',
      status: 'todo',
      dueDate: '2025-10-26',
      assignedTo: 'Pierre Leroy',
    },
    {
      id: '5',
      title: 'Mettre à jour le CRM',
      description: 'Saisir les nouveaux contacts',
      priority: 'low',
      status: 'done',
      dueDate: '2025-10-22',
      assignedTo: 'Marie Dubois',
    },
  ]);

  const [selectedFilter, setSelectedFilter] = useState<TaskStatus | 'all'>('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const priorityConfig = {
    high: { label: 'Urgent', color: '#FF3B30', bgColor: '#FF3B3020' },
    medium: { label: 'Moyen', color: '#FF9500', bgColor: '#FF950020' },
    low: { label: 'Faible', color: '#34C759', bgColor: '#34C75920' },
  };

  const statusConfig = {
    todo: { label: 'À faire', color: '#8E8E93', icon: ClockIcon },
    in_progress: { label: 'En cours', color: '#007AFF', icon: AlertTriangleIcon },
    done: { label: 'Terminé', color: '#34C759', icon: CheckCircleIcon },
  };

  const toggleTaskStatus = (taskId: string) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id === taskId) {
          const newStatus: TaskStatus =
            task.status === 'todo'
              ? 'in_progress'
              : task.status === 'in_progress'
              ? 'done'
              : 'todo';
          return { ...task, status: newStatus };
        }
        return task;
      })
    );
  };

  const deleteTask = (taskId: string) => {
    Alert.alert('Supprimer la tâche', 'Êtes-vous sûr de vouloir supprimer cette tâche ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => setTasks((prev) => prev.filter((task) => task.id !== taskId)),
      },
    ]);
  };

  const filteredTasks =
    selectedFilter === 'all' ? tasks : tasks.filter((task) => task.status === selectedFilter);

  const openTaskDetails = (task: Task) => {
    setSelectedTask(task);
    setModalVisible(true);
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date() && new Date(dueDate).toDateString() !== new Date().toDateString();
  };

  const isToday = (dueDate: string) => {
    return new Date(dueDate).toDateString() === new Date().toDateString();
  };

  const renderTask = (task: Task) => {
    const priorityStyle = priorityConfig[task.priority];
    const StatusIcon = statusConfig[task.status].icon;
    const overdue = isOverdue(task.dueDate) && task.status !== 'done';
    const today = isToday(task.dueDate);

    return (
      <TouchableOpacity
        key={task.id}
        style={[
          styles.taskCard,
          task.status === 'done' && styles.taskCardDone,
          overdue && styles.taskCardOverdue,
        ]}
        onPress={() => openTaskDetails(task)}
        activeOpacity={0.7}
      >
        <View style={styles.taskHeader}>
          <TouchableOpacity
            style={[
              styles.checkbox,
              task.status === 'done' && styles.checkboxChecked,
              task.status === 'in_progress' && styles.checkboxInProgress,
            ]}
            onPress={() => toggleTaskStatus(task.id)}
          >
            {task.status === 'done' && <CheckCircleIcon size={20} color="#34C759" />}
            {task.status === 'in_progress' && <ClockIcon size={20} color="#007AFF" />}
          </TouchableOpacity>

          <View style={styles.taskContent}>
            <View style={styles.taskTitleRow}>
              <Text
                style={[
                  styles.taskTitle,
                  task.status === 'done' && styles.taskTitleDone,
                ]}
                numberOfLines={2}
              >
                {task.title}
              </Text>
              <View style={[styles.priorityBadge, { backgroundColor: priorityStyle.bgColor }]}>
                <Text style={[styles.priorityText, { color: priorityStyle.color }]}>
                  {priorityStyle.label}
                </Text>
              </View>
            </View>

            {task.description && (
              <Text style={styles.taskDescription} numberOfLines={2}>
                {task.description}
              </Text>
            )}

            <View style={styles.taskMeta}>
              <View style={styles.metaItem}>
                <CalendarIcon size={14} color={overdue ? '#FF3B30' : today ? '#FF9500' : '#8E8E93'} />
                <Text
                  style={[
                    styles.metaText,
                    overdue && styles.metaTextOverdue,
                    today && styles.metaTextToday,
                  ]}
                >
                  {overdue
                    ? 'En retard'
                    : today
                    ? "Aujourd'hui"
                    : new Date(task.dueDate).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                      })}
                </Text>
              </View>

              {task.assignedTo && (
                <View style={styles.metaItem}>
                  <UsersIcon size={14} color="#8E8E93" />
                  <Text style={styles.metaText}>{task.assignedTo}</Text>
                </View>
              )}

              {task.relatedTo && (
                <View style={styles.relatedBadge}>
                  <Text style={styles.relatedText}>{task.relatedTo}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const stats = {
    todo: tasks.filter((t) => t.status === 'todo').length,
    in_progress: tasks.filter((t) => t.status === 'in_progress').length,
    done: tasks.filter((t) => t.status === 'done').length,
    overdue: tasks.filter((t) => isOverdue(t.dueDate) && t.status !== 'done').length,
  };

  return (
    <View style={styles.container}>
      {/* En-tête */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Tâches</Text>
          <Text style={styles.headerSubtitle}>
            {stats.todo + stats.in_progress} en cours • {stats.done} terminées
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => Alert.alert('À venir', 'Fonctionnalité en développement')}
        >
          <Text style={styles.addButtonText}>+ Nouvelle</Text>
        </TouchableOpacity>
      </View>

      {/* Statistiques */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.todo}</Text>
          <Text style={styles.statLabel}>À faire</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#007AFF' }]}>{stats.in_progress}</Text>
          <Text style={styles.statLabel}>En cours</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#34C759' }]}>{stats.done}</Text>
          <Text style={styles.statLabel}>Terminées</Text>
        </View>
        {stats.overdue > 0 && (
          <View style={[styles.statCard, styles.statCardOverdue]}>
            <Text style={[styles.statValue, { color: '#FF3B30' }]}>{stats.overdue}</Text>
            <Text style={styles.statLabel}>En retard</Text>
          </View>
        )}
      </View>

      {/* Filtres */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[styles.filterChip, selectedFilter === 'all' && styles.filterChipActive]}
            onPress={() => setSelectedFilter('all')}
          >
            <Text
              style={[
                styles.filterText,
                selectedFilter === 'all' && styles.filterTextActive,
              ]}
            >
              Toutes ({tasks.length})
            </Text>
          </TouchableOpacity>

          {(Object.keys(statusConfig) as TaskStatus[]).map((status) => (
            <TouchableOpacity
              key={status}
              style={[styles.filterChip, selectedFilter === status && styles.filterChipActive]}
              onPress={() => setSelectedFilter(status)}
            >
              <Text
                style={[
                  styles.filterText,
                  selectedFilter === status && styles.filterTextActive,
                ]}
              >
                {statusConfig[status].label} ({tasks.filter((t) => t.status === status).length})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Liste des tâches */}
      <ScrollView style={styles.tasksList} contentContainerStyle={styles.tasksListContent}>
        {filteredTasks.length > 0 ? (
          filteredTasks.map((task) => renderTask(task))
        ) : (
          <View style={styles.emptyState}>
            <CheckCircleIcon size={64} color="#D1D1D6" />
            <Text style={styles.emptyText}>Aucune tâche</Text>
          </View>
        )}
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
            {selectedTask && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{selectedTask.title}</Text>
                  <TouchableOpacity onPress={() => setModalVisible(false)}>
                    <Text style={styles.closeButton}>✕</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.modalBody}>
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Description</Text>
                    <Text style={styles.detailText}>{selectedTask.description}</Text>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Statut</Text>
                    <View style={styles.statusOptions}>
                      {(Object.keys(statusConfig) as TaskStatus[]).map((status) => (
                        <TouchableOpacity
                          key={status}
                          style={[
                            styles.statusOption,
                            selectedTask.status === status && styles.statusOptionActive,
                          ]}
                          onPress={() => {
                            setTasks((prev) =>
                              prev.map((t) =>
                                t.id === selectedTask.id ? { ...t, status } : t
                              )
                            );
                            setSelectedTask({ ...selectedTask, status });
                          }}
                        >
                          <Text
                            style={[
                              styles.statusOptionText,
                              selectedTask.status === status && styles.statusOptionTextActive,
                            ]}
                          >
                            {statusConfig[status].label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Priorité</Text>
                    <View style={styles.priorityOptions}>
                      {(Object.keys(priorityConfig) as Priority[]).map((priority) => (
                        <TouchableOpacity
                          key={priority}
                          style={[
                            styles.priorityOption,
                            {
                              borderColor: priorityConfig[priority].color,
                              backgroundColor:
                                selectedTask.priority === priority
                                  ? priorityConfig[priority].bgColor
                                  : 'transparent',
                            },
                          ]}
                          onPress={() => {
                            setTasks((prev) =>
                              prev.map((t) =>
                                t.id === selectedTask.id ? { ...t, priority } : t
                              )
                            );
                            setSelectedTask({ ...selectedTask, priority });
                          }}
                        >
                          <Text
                            style={[
                              styles.priorityOptionText,
                              { color: priorityConfig[priority].color },
                            ]}
                          >
                            {priorityConfig[priority].label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Date d'échéance</Text>
                    <Text style={styles.detailText}>
                      {new Date(selectedTask.dueDate).toLocaleDateString('fr-FR', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </Text>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Assigné à</Text>
                    <Text style={styles.detailText}>{selectedTask.assignedTo}</Text>
                  </View>

                  {selectedTask.relatedTo && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Lié à</Text>
                      <Text style={styles.detailText}>{selectedTask.relatedTo}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => {
                      setModalVisible(false);
                      deleteTask(selectedTask.id);
                    }}
                  >
                    <Text style={styles.deleteButtonText}>Supprimer</Text>
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
    gap: 10,
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
  statCardOverdue: {
    borderWidth: 1.5,
    borderColor: '#FF3B30',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#8E8E93',
    letterSpacing: -0.1,
  },
  filtersContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
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
    letterSpacing: -0.2,
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  tasksList: {
    flex: 1,
  },
  tasksListContent: {
    padding: 20,
    gap: 12,
  },
  taskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  taskCardDone: {
    opacity: 0.6,
  },
  taskCardOverdue: {
    borderLeftWidth: 3,
    borderLeftColor: '#FF3B30',
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#D1D1D6',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    borderColor: '#34C759',
    backgroundColor: '#34C75920',
  },
  checkboxInProgress: {
    borderColor: '#007AFF',
    backgroundColor: '#007AFF20',
  },
  taskContent: {
    flex: 1,
  },
  taskTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    letterSpacing: -0.3,
    flex: 1,
    marginRight: 8,
  },
  taskTitleDone: {
    textDecorationLine: 'line-through',
    color: '#8E8E93',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  taskDescription: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 12,
    lineHeight: 20,
    letterSpacing: -0.2,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    color: '#8E8E93',
    letterSpacing: -0.1,
  },
  metaTextOverdue: {
    color: '#FF3B30',
    fontWeight: '600',
  },
  metaTextToday: {
    color: '#FF9500',
    fontWeight: '600',
  },
  relatedBadge: {
    backgroundColor: '#007AFF20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  relatedText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 17,
    color: '#8E8E93',
    letterSpacing: -0.4,
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
    maxHeight: '85%',
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
  closeButton: {
    fontSize: 28,
    color: '#8E8E93',
    fontWeight: '300',
  },
  modalBody: {
    padding: 20,
  },
  detailSection: {
    marginBottom: 20,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: -0.1,
  },
  detailText: {
    fontSize: 16,
    color: '#000000',
    lineHeight: 22,
    letterSpacing: -0.3,
  },
  statusOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  statusOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E5E5EA',
  },
  statusOptionActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  statusOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    letterSpacing: -0.2,
  },
  statusOptionTextActive: {
    color: '#FFFFFF',
  },
  priorityOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  priorityOptionText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  modalActions: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.4,
  },
});
