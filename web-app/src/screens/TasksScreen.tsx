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
  Dimensions,
  GestureResponderEvent,
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
  XCircleIcon,
} from '../components/Icons';
import Navigation from '../components/Navigation';
import {
  MaybeDraxProvider,
  MaybeDraxDraggable,
  MaybeDraxDroppable,
} from '../components/shared/MaybeDrax';
import logger from '../utils/logger';
import { tasksService, customerService, companyService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import ConfirmModal from '../components/shared/ConfirmModal';
import DatePicker from '../components/shared/DatePicker';
import Dropdown from '../components/shared/Dropdown';

type TasksScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Tasks'>;
};

type Priority = 'high' | 'medium' | 'low';
type TaskStatus = string; // Allow custom statuses for Kanban columns

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

interface Column {
  id: TaskStatus;
  title: string;
  color: string;
  icon: React.ComponentType<any>;
}

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = Math.min(width - 40, 340);

export default function TasksScreen({ navigation }: TasksScreenProps) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);

  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [selectedFilter, setSelectedFilter] = useState<TaskStatus | 'all'>('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [newTaskModalVisible, setNewTaskModalVisible] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editForm, setEditForm] = useState<Task | null>(null);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [columnModalVisible, setColumnModalVisible] = useState(false);
  const [editingColumn, setEditingColumn] = useState<Column | null>(null);
  const [columnForm, setColumnForm] = useState({ title: '', color: '#0052CC' });
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [newTaskForm, setNewTaskForm] = useState({
    title: '',
    description: '',
    priority: 'medium' as Priority,
    dueDate: '',
    assignedTo: user?.id || '',
    relatedTo: '',
  });

  // Load columns from localStorage or use defaults
  const loadColumns = (): Column[] => {
    if (Platform.OS === 'web') {
      try {
        const saved = localStorage.getItem('taskColumns');
        if (saved) {
          const parsed = JSON.parse(saved);
          // Map icon names back to icon components
          return parsed.map((col: any) => ({
            ...col,
            icon: col.iconName === 'Clock' ? ClockIcon :
                  col.iconName === 'AlertTriangle' ? AlertTriangleIcon :
                  col.iconName === 'CheckCircle' ? CheckCircleIcon : ClockIcon,
          }));
        }
      } catch (err) {
        console.error('Error loading columns from localStorage:', err);
      }
    }
    return [
      { id: 'todo', title: 'À faire', color: '#6C757D', icon: ClockIcon },
      { id: 'in_progress', title: 'En cours', color: '#0052CC', icon: AlertTriangleIcon },
      { id: 'completed', title: 'Terminé', color: '#00875A', icon: CheckCircleIcon },
    ];
  };

  const [columns, setColumns] = useState<Column[]>(loadColumns());

  // Save columns to localStorage whenever they change
  const saveColumns = (newColumns: Column[]) => {
    if (Platform.OS === 'web') {
      try {
        // Map icon components to names for serialization
        const toSave = newColumns.map(col => ({
          id: col.id,
          title: col.title,
          color: col.color,
          iconName: col.icon === ClockIcon ? 'Clock' :
                    col.icon === AlertTriangleIcon ? 'AlertTriangle' :
                    col.icon === CheckCircleIcon ? 'CheckCircle' : 'Clock',
        }));
        localStorage.setItem('taskColumns', JSON.stringify(toSave));
      } catch (err) {
        console.error('Error saving columns to localStorage:', err);
      }
    }
    setColumns(newColumns);
  };

  const priorityConfig = {
    high: { label: 'Urgent', color: '#FF3B30', bgColor: '#FF3B3020' },
    medium: { label: 'Moyen', color: '#FF9500', bgColor: '#FF950020' },
    low: { label: 'Faible', color: '#34C759', bgColor: '#34C75920' },
  };

  // Load tasks and reference data from API
  React.useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tasksRes, customersRes, companiesRes] = await Promise.all([
        tasksService.getAll(),
        customerService.getAll(),
        companyService.getAll(),
      ]);

      // Use current user as the only assignee option for now
      if (user) {
        setUsers([
          { id: user.id, name: user.full_name || user.email, email: user.email },
        ]);
      }

      // Map API response to our Task interface
      const mappedTasks: Task[] = tasksRes.data.map((task: any) => {
        // Find assigned user name
        const assignedUserName = task.assigned_to === user?.id
          ? (user.full_name || user.email)
          : 'Utilisateur inconnu';

        return {
          id: task.id.toString(),
          title: task.title,
          description: task.description || '',
          priority: task.priority || 'medium',
          status: task.status || 'todo',
          dueDate: task.due_date || new Date().toISOString().split('T')[0],
          assignedTo: assignedUserName,
          relatedTo: task.customer_id?.toString() || undefined,
        };
      });
      setTasks(mappedTasks);
      setCustomers(customersRes.data);
      setCompanies(companiesRes.data);

      logger.success('TASKS', 'Data loaded successfully', {
        tasks: mappedTasks.length,
        customers: customersRes.data.length,
        companies: companiesRes.data.length,
      });
    } catch (err: any) {
      logger.error('TASKS', 'Failed to load data', { error: err.message });
      console.error('Erreur chargement données:', err);
      setTasks([]);
      setCustomers([]);
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async () => {
    if (!newTaskForm.title.trim()) {
      if (Platform.OS === 'web') {
        alert('Veuillez entrer un titre pour la tâche');
      } else {
        Alert.alert('Erreur', 'Veuillez entrer un titre pour la tâche');
      }
      return;
    }

    try {
      logger.info('TASKS', 'Creating new task', { title: newTaskForm.title });

      // Determine if relatedTo is a company or contact
      let company_id: string | undefined;
      let contact_id: string | undefined;

      if (newTaskForm.relatedTo) {
        if (newTaskForm.relatedTo.startsWith('company_')) {
          company_id = newTaskForm.relatedTo.replace('company_', '');
        } else {
          contact_id = newTaskForm.relatedTo;
        }
      }

      // Create task via API
      const response = await tasksService.create({
        title: newTaskForm.title,
        description: newTaskForm.description,
        assigned_to: newTaskForm.assignedTo || user?.id, // Use current user if not specified
        company_id,
        contact_id,
        due_date: newTaskForm.dueDate || new Date().toISOString().split('T')[0],
        priority: newTaskForm.priority,
        status: 'todo',
      });

      const createdTask = response.data;

      // Find assigned user name
      const assignedUserName = createdTask.assigned_to === user?.id
        ? (user.full_name || user.email)
        : 'Utilisateur inconnu';

      // Add to local state
      const newTask: Task = {
        id: createdTask.id.toString(),
        title: createdTask.title,
        description: createdTask.description || '',
        priority: createdTask.priority,
        status: createdTask.status,
        dueDate: createdTask.due_date,
        assignedTo: assignedUserName,
        relatedTo: createdTask.customer_id?.toString() || undefined,
      };

      setTasks([...tasks, newTask]);
      setNewTaskForm({
        title: '',
        description: '',
        priority: 'medium',
        dueDate: '',
        assignedTo: user?.id || '',
        relatedTo: '',
      });
      setNewTaskModalVisible(false);

      logger.success('TASKS', 'Task created successfully', { id: newTask.id });
    } catch (err: any) {
      logger.error('TASKS', 'Failed to create task', { error: err.message });
      console.error('Erreur création tâche:', err);

      if (Platform.OS === 'web') {
        alert('Erreur: Impossible de créer la tâche');
      } else {
        Alert.alert('Erreur', 'Impossible de créer la tâche');
      }
    }
  };

  const handleResetTaskForm = () => {
    setNewTaskForm({
      title: '',
      description: '',
      priority: 'medium',
      dueDate: '',
      assignedTo: user?.id || '',
      relatedTo: '',
    });
    setNewTaskModalVisible(false);
  };

  const openAddColumn = () => {
    setEditingColumn(null);
    setColumnForm({ title: '', color: '#0052CC' });
    setColumnModalVisible(true);
  };

  const openEditColumn = (column: Column) => {
    setEditingColumn(column);
    setColumnForm({ title: column.title, color: column.color });
    setColumnModalVisible(true);
  };

  const handleSaveColumn = () => {
    if (!columnForm.title.trim()) {
      if (Platform.OS === 'web') {
        alert('Veuillez entrer un nom pour la colonne');
      } else {
        Alert.alert('Erreur', 'Veuillez entrer un nom pour la colonne');
      }
      return;
    }

    if (editingColumn) {
      // Renommer
      const updated = columns.map((col) =>
        col.id === editingColumn.id
          ? { ...col, title: columnForm.title, color: columnForm.color }
          : col
      );
      saveColumns(updated);
      if (Platform.OS === 'web') {
        alert('Colonne mise à jour');
      } else {
        Alert.alert('Succès', 'Colonne mise à jour');
      }
    } else {
      // Ajouter
      const newColumn: Column = {
        id: `col_${Date.now()}` as TaskStatus,
        title: columnForm.title,
        color: columnForm.color,
        icon: ClockIcon,
      };
      saveColumns([...columns, newColumn]);
      Alert.alert('Succès', 'Colonne créée');
    }

    setColumnModalVisible(false);
    setColumnForm({ title: '', color: '#0052CC' });
    setEditingColumn(null);
  };

  const handleDeleteColumn = (columnId: TaskStatus) => {
    const tasksInColumn = tasks.filter((t) => t.status === columnId);

    if (tasksInColumn.length > 0) {
      if (Platform.OS === 'web') {
        alert(`Cette colonne contient ${tasksInColumn.length} tâche(s). Déplacez-les d'abord.`);
      } else {
        Alert.alert(
          'Impossible de supprimer',
          `Cette colonne contient ${tasksInColumn.length} tâche(s). Déplacez-les d'abord.`
        );
      }
      return;
    }

    if (Platform.OS === 'web') {
      if (window.confirm('Êtes-vous sûr de vouloir supprimer cette colonne ?')) {
        const updated = columns.filter((col) => col.id !== columnId);
        saveColumns(updated);
        alert('Colonne supprimée');
      }
    } else {
      Alert.alert(
        'Supprimer la colonne',
        'Êtes-vous sûr de vouloir supprimer cette colonne ?',
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Supprimer',
            style: 'destructive',
            onPress: () => {
              const updated = columns.filter((col) => col.id !== columnId);
              saveColumns(updated);
              Alert.alert('Succès', 'Colonne supprimée');
            },
          },
        ]
      );
    }
  };

  const deleteTask = (taskId: string) => {
    setTaskToDelete(taskId);
    setConfirmModalVisible(true);
  };

  const confirmDeleteTask = async () => {
    if (!taskToDelete) return;

    const taskId = taskToDelete;
    setConfirmModalVisible(false);
    setTaskToDelete(null);

    try {
      logger.info('DELETE', 'Deleting task', { taskId });
      await tasksService.delete(taskId);
      setTasks((prev) => prev.filter((task) => task.id !== taskId));
      setModalVisible(false);
      setIsEditMode(false);
      setSelectedTask(null);
      setEditForm(null);
      logger.success('DELETE', 'Task deleted successfully', { taskId });
    } catch (err: any) {
      logger.error('DELETE', 'Failed to delete task', { taskId, error: err.message });
      console.error('Erreur suppression tâche:', err);

      if (Platform.OS === 'web') {
        alert('Erreur: Impossible de supprimer la tâche');
      } else {
        Alert.alert('Erreur', 'Impossible de supprimer la tâche');
      }
    }
  };

  const moveTask = async (taskId: string, newStatus: TaskStatus) => {
    const previousTask = tasks.find(t => t.id === taskId);
    if (!previousTask || previousTask.status === newStatus) {
      setDraggingTaskId(null);
      return;
    }

    // Optimistic update
    setTasks((prev) =>
      prev.map((task) => (task.id === taskId ? { ...task, status: newStatus } : task))
    );

    try {
      logger.info('TASKS', 'Moving task to new status', { taskId, newStatus });
      await tasksService.updateStatus(taskId, newStatus);
      logger.success('TASKS', 'Task moved successfully', { taskId, newStatus });
    } catch (err: any) {
      logger.error('TASKS', 'Failed to move task', { taskId, newStatus, error: err.message });
      // Rollback on error
      setTasks((prev) =>
        prev.map((task) => (task.id === taskId ? previousTask : task))
      );
      if (Platform.OS === 'web') {
        alert('Erreur: Impossible de déplacer la tâche');
      } else {
        Alert.alert('Erreur', 'Impossible de déplacer la tâche');
      }
    } finally {
      setDraggingTaskId(null);
    }

    // Update selected task and edit form if currently viewing this task
    if (selectedTask?.id === taskId) {
      const updatedTask = { ...selectedTask, status: newStatus };
      setSelectedTask(updatedTask);
      if (editForm?.id === taskId) {
        setEditForm(updatedTask);
      }
    }
  };

  const handleUpdateTask = () => {
    if (!editForm) return;

    setTasks((prev) => prev.map((t) => (t.id === editForm.id ? editForm : t)));
    setSelectedTask(editForm);
    setIsEditMode(false);
    Alert.alert('Succès', 'Tâche mise à jour');
  };

  const openTaskDetails = (task: Task) => {
    setSelectedTask({ ...task });
    setEditForm({ ...task });
    setIsEditMode(false);
    setModalVisible(true);
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date() && new Date(dueDate).toDateString() !== new Date().toDateString();
  };

  const isToday = (dueDate: string) => {
    return new Date(dueDate).toDateString() === new Date().toDateString();
  };

  const renderTaskCard = (task: Task, index: number) => {
    const priorityStyle = priorityConfig[task.priority];
    const overdue = isOverdue(task.dueDate) && task.status !== 'completed';
    const today = isToday(task.dueDate);
    const isDragging = draggingTaskId === task.id;

    const cardContent = (
      <View style={[styles.taskCard, isDragging && styles.taskCardDragging]}>
        <TouchableOpacity
          style={styles.cardClickableArea}
          onPress={() => openTaskDetails(task)}
          activeOpacity={0.85}
        >
          <View style={styles.cardHeader}>
            <View style={[styles.priorityBadge, { backgroundColor: priorityStyle.bgColor }]}>
              <Text style={[styles.priorityText, { color: priorityStyle.color }]}>
                {priorityStyle.label}
              </Text>
            </View>
          </View>

          <Text style={styles.cardTitle} numberOfLines={2}>
            {task.title}
          </Text>

          {task.description && (
            <Text style={styles.cardDescription} numberOfLines={2}>
              {task.description}
            </Text>
          )}

          <View style={styles.cardFooter}>
            <View style={styles.cardFooterLeft}>
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
                  <Text style={styles.metaText} numberOfLines={1}>
                    {task.assignedTo.split(' ')[0]}
                  </Text>
                </View>
              )}
            </View>
            {task.relatedTo && (
              <View style={styles.relatedBadge}>
                <Text style={styles.relatedText} numberOfLines={1}>
                  {task.relatedTo}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cardDeleteButton}
          onPress={(event: GestureResponderEvent) => {
            event.stopPropagation();
            logger.click('TasksScreen', 'Delete button clicked', { taskId: task.id });
            deleteTask(task.id);
          }}
          // @ts-ignore
          data-no-drag="true"
          // @ts-ignore
          pointerEvents="auto"
        >
          <XCircleIcon size={18} color="#8E8E93" />
        </TouchableOpacity>
      </View>
    );

    if (viewMode === 'kanban') {
      return (
        <MaybeDraxDraggable
          key={`task-${task.id}-${index}`}
          payload={task.id}
          style={styles.draggableWrapper}
          draggingStyle={styles.draggableWrapperDragging}
          onDragStart={() => setDraggingTaskId(task.id)}
          onDragEnd={() => setDraggingTaskId((prev) => (prev === task.id ? null : prev))}
        >
          {cardContent}
        </MaybeDraxDraggable>
      );
    }

    return <View key={`task-${task.id}-${index}`}>{cardContent}</View>;
  };

  const renderListTask = (task: Task) => {
    const priorityStyle = priorityConfig[task.priority];
    const StatusIcon = columns.find((c) => c.id === task.status)?.icon || ClockIcon;
    const overdue = isOverdue(task.dueDate) && task.status !== 'completed';
    const today = isToday(task.dueDate);

    return (
      <TouchableOpacity
        key={task.id}
        style={[
          styles.listTaskCard,
          task.status === 'completed' && styles.listTaskCardDone,
          overdue && styles.listTaskCardOverdue,
        ]}
        onPress={() => openTaskDetails(task)}
        activeOpacity={0.7}
      >
        <View style={styles.listTaskHeader}>
          <View
            style={[
              styles.listCheckbox,
              task.status === 'completed' && styles.listCheckboxChecked,
              task.status === 'in_progress' && styles.listCheckboxInProgress,
            ]}
          >
            {task.status === 'completed' && <CheckCircleIcon size={20} color="#00875A" />}
            {task.status === 'in_progress' && <ClockIcon size={20} color="#0052CC" />}
          </View>

          <View style={styles.listTaskContent}>
            <View style={styles.listTaskTitleRow}>
              <Text
                style={[
                  styles.listTaskTitle,
                  task.status === 'completed' && styles.listTaskTitleDone,
                ]}
                numberOfLines={2}
              >
                {task.title}
              </Text>
              <TouchableOpacity
                style={styles.listDeleteButton}
                onPress={(event: GestureResponderEvent) => {
                  event.stopPropagation();
                  deleteTask(task.id);
                }}
                // @ts-ignore
                data-no-drag="true"
              >
                <XCircleIcon size={18} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            {task.description && (
              <Text style={styles.listTaskDescription} numberOfLines={2}>
                {task.description}
              </Text>
            )}

            <View style={styles.listTaskMeta}>
              <View style={[styles.priorityBadge, { backgroundColor: priorityStyle.bgColor }]}>
                <Text style={[styles.priorityText, { color: priorityStyle.color }]}>
                  {priorityStyle.label}
                </Text>
              </View>

              <View style={styles.metaItem}>
                <CalendarIcon size={14} color={overdue ? '#FF3B30' : today ? '#FF9500' : '#5E6C84'} />
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
                  <UsersIcon size={14} color="#5E6C84" />
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

  const renderColumn = (column: Column) => {
    const columnTasks = tasks.filter((task) => task.status === column.id);
    const Icon = column.icon;

    return (
      <View key={column.id} style={styles.column}>
        <View style={[styles.columnHeader, { borderTopColor: column.color }]}>
          <View style={styles.columnTitleRow}>
            <Icon size={18} color={column.color} />
            <Text style={styles.columnTitle}>{column.title}</Text>
            <View style={[styles.countBadge, { backgroundColor: column.color }]}>
              <Text style={styles.countText}>{columnTasks.length}</Text>
            </View>
          </View>
          <View style={styles.columnActions}>
            <TouchableOpacity
              style={styles.columnActionButton}
              onPress={() => openEditColumn(column)}
              // @ts-ignore
              data-no-drag="true"
            >
              <Text style={styles.columnActionText}>✎</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.columnActionButton}
              onPress={() => handleDeleteColumn(column.id)}
              // @ts-ignore
              data-no-drag="true"
            >
              <Text style={styles.columnActionTextDelete}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>

        <MaybeDraxDroppable
          style={styles.columnDropZone}
          activeStyle={[styles.columnDropZoneActive, { backgroundColor: `${column.color}10` }]}
          onReceive={(payload) => {
            moveTask(payload, column.id);
          }}
        >
          <ScrollView
            style={styles.columnContent}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.columnCards}
          >
            {columnTasks.map((task, idx) => renderTaskCard(task, idx))}
            {columnTasks.length === 0 && (
              <View style={styles.emptyColumn}>
                <Icon size={32} color="#D1D1D6" />
                <Text style={styles.emptyText}>Aucune tâche</Text>
              </View>
            )}
          </ScrollView>
        </MaybeDraxDroppable>
      </View>
    );
  };

  const stats = {
    todo: tasks.filter((t) => t.status === 'todo').length,
    in_progress: tasks.filter((t) => t.status === 'in_progress').length,
    completed: tasks.filter((t) => t.status === 'completed').length,
    overdue: tasks.filter((t) => isOverdue(t.dueDate) && t.status !== 'completed').length,
  };

  return (
    <View style={styles.container}>
      <Navigation />
      {/* En-tête */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Tâches</Text>
          <Text style={styles.headerSubtitle}>
            {stats.todo + stats.in_progress} en cours • {stats.completed} terminées
          </Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={() => setNewTaskModalVisible(true)}>
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
          <Text style={[styles.statValue, { color: '#0052CC' }]}>{stats.in_progress}</Text>
          <Text style={styles.statLabel}>En cours</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#00875A' }]}>{stats.completed}</Text>
          <Text style={styles.statLabel}>Terminées</Text>
        </View>
        {stats.overdue > 0 && (
          <View style={[styles.statCard, styles.statCardOverdue]}>
            <Text style={[styles.statValue, { color: '#FF3B30' }]}>{stats.overdue}</Text>
            <Text style={styles.statLabel}>En retard</Text>
          </View>
        )}
      </View>

      {/* Toggle Vue */}
      <View style={styles.viewToggleContainer}>
        <TouchableOpacity
          style={[styles.viewToggleButton, viewMode === 'list' && styles.viewToggleButtonActive]}
          onPress={() => setViewMode('list')}
        >
          <Text style={[styles.viewToggleText, viewMode === 'list' && styles.viewToggleTextActive]}>
            Liste
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.viewToggleButton, viewMode === 'kanban' && styles.viewToggleButtonActive]}
          onPress={() => setViewMode('kanban')}
        >
          <Text style={[styles.viewToggleText, viewMode === 'kanban' && styles.viewToggleTextActive]}>
            Kanban
          </Text>
        </TouchableOpacity>
      </View>

      {viewMode === 'kanban' ? (
        <MaybeDraxProvider>
          {/* Colonnes Kanban */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.kanbanContainer}
            contentContainerStyle={styles.kanbanContent}
          >
            {columns.map((column) => renderColumn(column))}

            {/* Bouton Ajouter Colonne */}
            <TouchableOpacity style={styles.addColumnButton} onPress={openAddColumn}>
              <Text style={styles.addColumnIcon}>+</Text>
              <Text style={styles.addColumnText}>Ajouter une colonne</Text>
            </TouchableOpacity>
          </ScrollView>
        </MaybeDraxProvider>
      ) : (
        <>
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

              {columns.map((col) => (
                <TouchableOpacity
                  key={col.id}
                  style={[styles.filterChip, selectedFilter === col.id && styles.filterChipActive]}
                  onPress={() => setSelectedFilter(col.id)}
                >
                  <Text
                    style={[
                      styles.filterText,
                      selectedFilter === col.id && styles.filterTextActive,
                    ]}
                  >
                    {col.title} ({tasks.filter((t) => t.status === col.id).length})
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Liste des tâches */}
          <ScrollView style={styles.listContainer} contentContainerStyle={styles.listContent}>
            {(selectedFilter === 'all'
              ? tasks
              : tasks.filter((t) => t.status === selectedFilter)
            ).map((task) => renderListTask(task))}
          </ScrollView>
        </>
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
            {selectedTask && editForm && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>
                    {isEditMode ? 'Modifier la tâche' : selectedTask.title}
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
                    <TouchableOpacity
                      onPress={() => {
                        setModalVisible(false);
                        setIsEditMode(false);
                      }}
                      // @ts-ignore
                      data-no-drag="true"
                    >
                      <XCircleIcon size={24} color="#8E8E93" />
                    </TouchableOpacity>
                  </View>
                </View>

                <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                  {isEditMode ? (
                    /* Mode Édition */
                    <>
                      <View style={styles.editGroup}>
                        <Text style={styles.editLabel}>Titre</Text>
                        <TextInput
                          style={styles.editInput}
                          value={editForm.title}
                          onChangeText={(text) => setEditForm({ ...editForm, title: text })}
                        />
                      </View>

                      <View style={styles.editGroup}>
                        <Text style={styles.editLabel}>Description</Text>
                        <TextInput
                          style={[styles.editInput, styles.editTextArea]}
                          value={editForm.description}
                          onChangeText={(text) => setEditForm({ ...editForm, description: text })}
                          multiline
                          numberOfLines={3}
                        />
                      </View>

                      <View style={styles.editGroup}>
                        <Text style={styles.editLabel}>Priorité</Text>
                        <View style={styles.prioritySelectEdit}>
                          {(['low', 'medium', 'high'] as Priority[]).map((priority) => (
                            <TouchableOpacity
                              key={priority}
                              style={[
                                styles.priorityButtonEdit,
                                editForm.priority === priority && styles.priorityButtonEditActive,
                                {
                                  borderColor: priorityConfig[priority].color,
                                  backgroundColor:
                                    editForm.priority === priority
                                      ? priorityConfig[priority].bgColor
                                      : '#FFFFFF',
                                },
                              ]}
                              onPress={() => setEditForm({ ...editForm, priority })}
                            >
                              <Text style={{ color: priorityConfig[priority].color, fontWeight: '600' }}>
                                {priorityConfig[priority].label}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>

                      <View style={styles.editGroup}>
                        <Text style={styles.editLabel}>Statut</Text>
                        <View style={styles.statusSelectEdit}>
                          {columns.map((col) => (
                            <TouchableOpacity
                              key={col.id}
                              style={[
                                styles.statusButtonEdit,
                                editForm.status === col.id && styles.statusButtonEditActive,
                                { borderColor: col.color },
                              ]}
                              onPress={() => setEditForm({ ...editForm, status: col.id })}
                            >
                              <Text
                                style={[
                                  styles.statusButtonEditText,
                                  { color: editForm.status === col.id ? col.color : '#8E8E93' },
                                ]}
                              >
                                {col.title}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>

                      <View style={styles.editGroup}>
                        <Text style={styles.editLabel}>Date d'échéance</Text>
                        <TextInput
                          style={styles.editInput}
                          value={editForm.dueDate}
                          onChangeText={(text) => setEditForm({ ...editForm, dueDate: text })}
                          placeholder="2025-12-31"
                        />
                      </View>

                      <View style={styles.editGroup}>
                        <Text style={styles.editLabel}>Assigné à</Text>
                        <TextInput
                          style={styles.editInput}
                          value={editForm.assignedTo}
                          onChangeText={(text) => setEditForm({ ...editForm, assignedTo: text })}
                        />
                      </View>

                      <View style={styles.editActions}>
                        <TouchableOpacity style={styles.saveButton} onPress={handleUpdateTask}>
                          <Text style={styles.saveButtonText}>Enregistrer</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.cancelButton}
                          onPress={() => {
                            setEditForm(selectedTask);
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
                        <Text style={styles.detailLabel}>Description</Text>
                        <Text style={styles.detailValue}>
                          {selectedTask.description || 'Aucune description'}
                        </Text>
                      </View>

                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Priorité</Text>
                        <View
                          style={[
                            styles.priorityBadge,
                            { backgroundColor: priorityConfig[selectedTask.priority].bgColor },
                          ]}
                        >
                          <Text
                            style={[
                              styles.priorityText,
                              { color: priorityConfig[selectedTask.priority].color },
                            ]}
                          >
                            {priorityConfig[selectedTask.priority].label}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Date d'échéance</Text>
                        <Text style={styles.detailValue}>
                          {new Date(selectedTask.dueDate).toLocaleDateString('fr-FR', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </Text>
                      </View>

                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Assigné à</Text>
                        <Text style={styles.detailValue}>{selectedTask.assignedTo}</Text>
                      </View>

                      {selectedTask.relatedTo && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Lié à</Text>
                          <Text style={styles.detailValue}>{selectedTask.relatedTo}</Text>
                        </View>
                      )}

                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => deleteTask(selectedTask.id)}
                      >
                        <Text style={styles.deleteButtonText}>Supprimer la tâche</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </ScrollView>

                {!isEditMode && (
                  <View style={styles.modalActions}>
                    <Text style={styles.actionsTitle}>Changer le statut</Text>
                    <View style={styles.statusButtons}>
                      {columns
                        .filter((col) => col.id !== selectedTask.status)
                        .map((col) => (
                          <TouchableOpacity
                            key={col.id}
                            style={[styles.statusButton, { borderColor: col.color }]}
                            onPress={() => {
                              moveTask(selectedTask.id, col.id);
                              setModalVisible(false);
                            }}
                          >
                            <Text style={[styles.statusButtonText, { color: col.color }]}>
                              {col.title}
                            </Text>
                          </TouchableOpacity>
                        ))}
                    </View>
                  </View>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Create Task Modal */}
      <Modal
        visible={newTaskModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={handleResetTaskForm}
      >
        <View style={styles.newModalContainer}>
          <View style={styles.newModalContent}>
            <View style={styles.newModalHeader}>
              <Text style={styles.newModalTitle}>Nouvelle Tâche</Text>
              <TouchableOpacity onPress={handleResetTaskForm}>
                <Text style={styles.closeButtonNew}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.newModalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.formGroupNew}>
                <Text style={styles.formLabelNew}>Titre *</Text>
                <TextInput
                  style={styles.inputNew}
                  placeholder="Entrez le titre de la tâche"
                  value={newTaskForm.title}
                  onChangeText={(text) => setNewTaskForm({ ...newTaskForm, title: text })}
                  placeholderTextColor="#C7C7CC"
                />
              </View>

              <View style={styles.formGroupNew}>
                <Text style={styles.formLabelNew}>Description</Text>
                <TextInput
                  style={[styles.inputNew, styles.textAreaNew]}
                  placeholder="Entrez une description"
                  value={newTaskForm.description}
                  onChangeText={(text) => setNewTaskForm({ ...newTaskForm, description: text })}
                  multiline
                  numberOfLines={3}
                  placeholderTextColor="#C7C7CC"
                />
              </View>

              <View style={styles.formGroupNew}>
                <Text style={styles.formLabelNew}>Priorité</Text>
                <View style={styles.prioritySelectNew}>
                  {(['low', 'medium', 'high'] as Priority[]).map((priority) => (
                    <TouchableOpacity
                      key={priority}
                      style={[
                        styles.priorityButtonNew,
                        newTaskForm.priority === priority && styles.priorityButtonActiveNew,
                        {
                          borderColor: priorityConfig[priority].color,
                          backgroundColor:
                            newTaskForm.priority === priority
                              ? priorityConfig[priority].bgColor
                              : '#FFFFFF',
                        },
                      ]}
                      onPress={() => setNewTaskForm({ ...newTaskForm, priority })}
                    >
                      <Text style={{ color: priorityConfig[priority].color, fontWeight: '600' }}>
                        {priorityConfig[priority].label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <DatePicker
                label="Date d'échéance"
                value={newTaskForm.dueDate}
                onChange={(date) => setNewTaskForm({ ...newTaskForm, dueDate: date })}
                placeholder="Sélectionner une date"
              />

              <Dropdown
                label="Assigné à"
                value={newTaskForm.assignedTo}
                options={users.map(u => ({
                  id: u.id,
                  label: u.name,
                  subtitle: u.email,
                }))}
                onChange={(value) => setNewTaskForm({ ...newTaskForm, assignedTo: value })}
                placeholder="Sélectionner une personne"
                onCreateNew={() => {
                  // TODO: Open user creation modal
                  if (Platform.OS === 'web') {
                    alert('Fonctionnalité de création d\'utilisateur à venir');
                  } else {
                    Alert.alert('Info', 'Fonctionnalité de création d\'utilisateur à venir');
                  }
                }}
                createButtonLabel="Créer un nouvel utilisateur"
              />

              <Dropdown
                label="Lié à"
                value={newTaskForm.relatedTo}
                options={[
                  ...customers.map(c => ({
                    id: c.id.toString(),
                    label: c.name,
                    subtitle: `Client - ${c.email || ''}`,
                  })),
                  ...companies.map(c => ({
                    id: `company_${c.id}`,
                    label: c.name,
                    subtitle: `Entreprise - ${c.industry || ''}`,
                  })),
                ]}
                onChange={(value) => setNewTaskForm({ ...newTaskForm, relatedTo: value })}
                placeholder="Sélectionner un client ou entreprise"
                onCreateNew={() => {
                  // TODO: Open customer/company creation modal
                  if (Platform.OS === 'web') {
                    alert('Fonctionnalité de création de client à venir');
                  } else {
                    Alert.alert('Info', 'Fonctionnalité de création de client à venir');
                  }
                }}
                createButtonLabel="Créer un nouveau client"
              />
            </ScrollView>

            <View style={styles.newModalFooter}>
              <TouchableOpacity
                style={[styles.buttonNew, styles.buttonSecondaryNew]}
                onPress={handleResetTaskForm}
              >
                <Text style={styles.buttonSecondaryTextNew}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.buttonNew, styles.buttonPrimaryNew]}
                onPress={handleCreateTask}
              >
                <Text style={styles.buttonPrimaryTextNew}>Créer Tâche</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Gestion Colonne */}
      <Modal
        visible={columnModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setColumnModalVisible(false)}
      >
        <View style={styles.newModalContainer}>
          <View style={styles.newModalContent}>
            <View style={styles.newModalHeader}>
              <Text style={styles.newModalTitle}>
                {editingColumn ? 'Modifier la colonne' : 'Nouvelle colonne'}
              </Text>
              <TouchableOpacity onPress={() => setColumnModalVisible(false)}>
                <Text style={styles.closeButtonNew}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.newModalBody}>
              <View style={styles.formGroupNew}>
                <Text style={styles.formLabelNew}>Nom de la colonne *</Text>
                <TextInput
                  style={styles.inputNew}
                  placeholder="Ex: En révision"
                  value={columnForm.title}
                  onChangeText={(text) => setColumnForm({ ...columnForm, title: text })}
                  placeholderTextColor="#C7C7CC"
                />
              </View>

              <View style={styles.formGroupNew}>
                <Text style={styles.formLabelNew}>Couleur</Text>
                <View style={styles.colorPicker}>
                  {['#6C757D', '#0052CC', '#00875A', '#FF3B30', '#FF9500', '#9333EA'].map(
                    (color) => (
                      <TouchableOpacity
                        key={color}
                        style={[
                          styles.colorOption,
                          { backgroundColor: color },
                          columnForm.color === color && styles.colorOptionSelected,
                        ]}
                        onPress={() => setColumnForm({ ...columnForm, color })}
                      >
                        {columnForm.color === color && (
                          <Text style={styles.colorCheck}>✓</Text>
                        )}
                      </TouchableOpacity>
                    )
                  )}
                </View>
              </View>
            </View>

            <View style={styles.newModalFooter}>
              <TouchableOpacity
                style={[styles.buttonNew, styles.buttonSecondaryNew]}
                onPress={() => setColumnModalVisible(false)}
              >
                <Text style={styles.buttonSecondaryTextNew}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.buttonNew, styles.buttonPrimaryNew]}
                onPress={handleSaveColumn}
              >
                <Text style={styles.buttonPrimaryTextNew}>
                  {editingColumn ? 'Enregistrer' : 'Créer'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ConfirmModal
        visible={confirmModalVisible}
        title="Supprimer la tâche"
        message="Êtes-vous sûr de vouloir supprimer cette tâche ? Cette action est irréversible."
        confirmText="Supprimer"
        cancelText="Annuler"
        onConfirm={confirmDeleteTask}
        onCancel={() => {
          setConfirmModalVisible(false);
          setTaskToDelete(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F5F7',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#DFE1E6',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#172B4D',
    letterSpacing: -0.6,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#5E6C84',
    letterSpacing: -0.2,
  },
  addButton: {
    backgroundColor: '#0052CC',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 3,
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
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#DFE1E6',
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F4F5F7',
    borderRadius: 3,
    padding: 12,
    alignItems: 'center',
  },
  statCardOverdue: {
    borderWidth: 1.5,
    borderColor: '#FF3B30',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#172B4D',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#5E6C84',
    letterSpacing: -0.1,
    fontWeight: '600',
  },
  kanbanContainer: {
    flex: 1,
  },
  kanbanContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 12,
  },
  column: {
    width: COLUMN_WIDTH,
    marginRight: 12,
  },
  columnHeader: {
    backgroundColor: '#EBECF0',
    borderRadius: 3,
    padding: 12,
    marginBottom: 8,
    borderTopWidth: 0,
  },
  columnTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  columnTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#172B4D',
    letterSpacing: -0.2,
    flex: 1,
    textTransform: 'uppercase',
  },
  columnActions: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 8,
  },
  columnActionButton: {
    padding: 4,
    borderRadius: 3,
    backgroundColor: '#FAFBFC',
  },
  columnActionText: {
    fontSize: 14,
    color: '#5E6C84',
    fontWeight: '600',
  },
  columnActionTextDelete: {
    fontSize: 14,
    color: '#FF3B30',
    fontWeight: '600',
  },
  countBadge: {
    minWidth: 24,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  countText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.1,
  },
  columnDropZone: {
    flex: 1,
    borderRadius: 3,
    borderWidth: 2,
    borderColor: 'transparent',
    borderStyle: 'dashed',
    minHeight: 200,
  },
  columnDropZoneActive: {
    borderColor: '#0052CC',
  },
  columnContent: {
    flex: 1,
  },
  columnCards: {
    gap: 8,
    paddingBottom: 8,
    paddingHorizontal: 4,
  },
  draggableWrapper: {
    borderRadius: 3,
  },
  draggableWrapperDragging: {
    opacity: 0.5,
  },
  taskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 3,
    shadowColor: '#091E4240',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.5,
    shadowRadius: 1,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#DFE1E6',
    position: 'relative',
  },
  taskCardDragging: {
    opacity: 0.5,
    transform: [{ scale: 1.05 }],
  },
  cardClickableArea: {
    padding: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 3,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  cardDeleteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 6,
    zIndex: 999,
    elevation: 999,
    backgroundColor: '#FFFFFF',
    borderRadius: 3,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#172B4D',
    letterSpacing: -0.2,
    marginBottom: 6,
    lineHeight: 20,
  },
  cardDescription: {
    fontSize: 13,
    color: '#5E6C84',
    marginBottom: 8,
    lineHeight: 18,
    letterSpacing: -0.1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  cardFooterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#5E6C84',
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
    backgroundColor: '#0052CC15',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 3,
    maxWidth: 100,
  },
  relatedText: {
    fontSize: 11,
    color: '#0052CC',
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  emptyColumn: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 8,
    fontSize: 13,
    color: '#5E6C84',
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
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#DFE1E6',
  },
  modalHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  editButton: {
    backgroundColor: '#0052CC',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 3,
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#172B4D',
    letterSpacing: -0.4,
    flex: 1,
  },
  modalBody: {
    padding: 20,
  },
  detailRow: {
    marginBottom: 20,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5E6C84',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  detailValue: {
    fontSize: 15,
    color: '#172B4D',
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  editGroup: {
    marginBottom: 16,
  },
  editLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5E6C84',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  editInput: {
    borderWidth: 2,
    borderColor: '#DFE1E6',
    borderRadius: 3,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#172B4D',
    backgroundColor: '#FAFBFC',
  },
  editTextArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  prioritySelectEdit: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityButtonEdit: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 3,
    borderWidth: 2,
    alignItems: 'center',
  },
  priorityButtonEditActive: {
    borderWidth: 3,
  },
  statusSelectEdit: {
    flexDirection: 'row',
    gap: 8,
  },
  statusButtonEdit: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 3,
    borderWidth: 2,
    alignItems: 'center',
  },
  statusButtonEditActive: {
    borderWidth: 3,
  },
  statusButtonEditText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  editActions: {
    flexDirection: 'row',
    marginTop: 20,
    marginBottom: 16,
    gap: 8,
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#00875A',
    paddingVertical: 14,
    borderRadius: 3,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#EBECF0',
    paddingVertical: 14,
    borderRadius: 3,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#5E6C84',
    fontSize: 16,
    fontWeight: '700',
  },
  deleteButton: {
    backgroundColor: '#FEF6F6',
    borderWidth: 1,
    borderColor: '#FF3B30',
    paddingVertical: 12,
    borderRadius: 3,
    alignItems: 'center',
    marginTop: 20,
  },
  deleteButtonText: {
    color: '#FF3B30',
    fontSize: 15,
    fontWeight: '600',
  },
  modalActions: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#DFE1E6',
  },
  actionsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5E6C84',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  statusButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 3,
    borderWidth: 2,
  },
  statusButtonText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
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
    color: '#172B4D',
  },
  closeButtonNew: {
    fontSize: 24,
    color: '#5E6C84',
  },
  newModalBody: {
    maxHeight: 450,
    marginBottom: 16,
  },
  formGroupNew: {
    marginBottom: 16,
  },
  formLabelNew: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5E6C84',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  inputNew: {
    borderWidth: 2,
    borderColor: '#DFE1E6',
    borderRadius: 3,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#172B4D',
    backgroundColor: '#FAFBFC',
  },
  textAreaNew: {
    height: 100,
    textAlignVertical: 'top',
  },
  prioritySelectNew: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityButtonNew: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 3,
    borderWidth: 2,
    alignItems: 'center',
  },
  priorityButtonActiveNew: {
    borderWidth: 3,
  },
  newModalFooter: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 16,
    paddingBottom: 20,
  },
  buttonNew: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 3,
    alignItems: 'center',
  },
  buttonPrimaryNew: {
    backgroundColor: '#0052CC',
  },
  buttonPrimaryTextNew: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  buttonSecondaryNew: {
    backgroundColor: '#EBECF0',
  },
  buttonSecondaryTextNew: {
    fontSize: 14,
    fontWeight: '700',
    color: '#5E6C84',
  },
  // Mode toggle
  viewToggleContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#DFE1E6',
    gap: 8,
  },
  viewToggleButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 3,
    alignItems: 'center',
    backgroundColor: '#FAFBFC',
    borderWidth: 2,
    borderColor: '#DFE1E6',
  },
  viewToggleButtonActive: {
    backgroundColor: '#0052CC',
    borderColor: '#0052CC',
  },
  viewToggleText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#5E6C84',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  viewToggleTextActive: {
    color: '#FFFFFF',
  },
  // Mode Liste
  filtersContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#DFE1E6',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FAFBFC',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#DFE1E6',
  },
  filterChipActive: {
    backgroundColor: '#0052CC',
    borderColor: '#0052CC',
  },
  filterText: {
    fontSize: 13,
    color: '#5E6C84',
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  listContainer: {
    flex: 1,
    backgroundColor: '#F4F5F7',
  },
  listContent: {
    padding: 20,
    gap: 12,
  },
  listTaskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 3,
    padding: 16,
    shadowColor: '#091E4240',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.5,
    shadowRadius: 1,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#DFE1E6',
  },
  listTaskCardDone: {
    opacity: 0.6,
  },
  listTaskCardOverdue: {
    borderLeftWidth: 3,
    borderLeftColor: '#FF3B30',
  },
  listTaskHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  listCheckbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#DFE1E6',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listCheckboxChecked: {
    borderColor: '#00875A',
    backgroundColor: '#00875A20',
  },
  listCheckboxInProgress: {
    borderColor: '#0052CC',
    backgroundColor: '#0052CC20',
  },
  listTaskContent: {
    flex: 1,
  },
  listTaskTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  listTaskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#172B4D',
    letterSpacing: -0.3,
    flex: 1,
    marginRight: 8,
  },
  listTaskTitleDone: {
    textDecorationLine: 'line-through',
    color: '#5E6C84',
  },
  listDeleteButton: {
    padding: 4,
  },
  listTaskDescription: {
    fontSize: 14,
    color: '#5E6C84',
    marginBottom: 12,
    lineHeight: 20,
    letterSpacing: -0.2,
  },
  listTaskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  // Ajouter colonne
  addColumnButton: {
    width: COLUMN_WIDTH,
    marginRight: 12,
    backgroundColor: '#FAFBFC',
    borderRadius: 3,
    borderWidth: 2,
    borderColor: '#DFE1E6',
    borderStyle: 'dashed',
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  addColumnIcon: {
    fontSize: 32,
    color: '#5E6C84',
    fontWeight: '300',
    marginBottom: 8,
  },
  addColumnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5E6C84',
    letterSpacing: -0.2,
  },
  // Color picker
  colorPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorOption: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorOptionSelected: {
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  colorCheck: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
});
