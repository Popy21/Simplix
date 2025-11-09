import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert, RefreshControl } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { FolderIcon, PlusIcon, EditIcon, TrashIcon } from '../components/Icons';
import Navigation from '../components/Navigation';
import { projectsService, contactService } from '../services/api';

type ProjectsScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Projects'>;
};

export default function ProjectsScreen({ navigation }: ProjectsScreenProps) {
  const [projects, setProjects] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    customer_id: '',
    project_type: 'time_and_materials',
    status: 'active',
    start_date: new Date().toISOString().split('T')[0],
    hourly_rate: '75',
    estimated_hours: '',
  });

  useEffect(() => {
    fetchProjects();
    fetchCustomers();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await projectsService.getAll();
      setProjects(res.data || []);
    } catch (error) {
      console.error(error);
      Alert.alert('Erreur', 'Impossible de charger les projets');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await contactService.getAll();
      setCustomers(res.data || []);
    } catch (error) {
      console.error(error);
    }
  };

  const handleCreate = () => {
    setEditingProject(null);
    setFormData({
      name: '',
      customer_id: '',
      project_type: 'time_and_materials',
      status: 'active',
      start_date: new Date().toISOString().split('T')[0],
      hourly_rate: '75',
      estimated_hours: '',
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!formData.name) {
      Alert.alert('Erreur', 'Le nom du projet est requis');
      return;
    }

    try {
      const data = {
        ...formData,
        hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : undefined,
        estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : undefined,
      };

      if (editingProject) {
        await projectsService.update(editingProject.id, data);
      } else {
        await projectsService.create(data);
      }

      setModalVisible(false);
      fetchProjects();
      Alert.alert('Succès', editingProject ? 'Projet modifié' : 'Projet créé');
    } catch (error) {
      console.error(error);
      Alert.alert('Erreur', 'Impossible de sauvegarder le projet');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#10B981';
      case 'completed': return '#6366F1';
      case 'on_hold': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Actif';
      case 'completed': return 'Terminé';
      case 'on_hold': return 'En pause';
      default: return status;
    }
  };

  return (
    <View style={styles.container}>
      <Navigation navigation={navigation} />
      
      <View style={styles.header}>
        <Text style={styles.title}>Projets</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleCreate}>
          <PlusIcon size={20} color="#fff" />
          <Text style={styles.addButtonText}>Nouveau projet</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchProjects(); }} />}
      >
        {loading ? (
          <Text style={styles.loadingText}>Chargement...</Text>
        ) : projects.length === 0 ? (
          <Text style={styles.emptyText}>Aucun projet</Text>
        ) : (
          projects.map((project) => (
            <View key={project.id} style={styles.projectCard}>
              <View style={styles.projectHeader}>
                <FolderIcon size={24} color="#6366F1" />
                <View style={styles.projectInfo}>
                  <Text style={styles.projectName}>{project.name}</Text>
                  <View style={styles.statusBadge} backgroundColor={getStatusColor(project.status) + '20'}>
                    <Text style={[styles.statusText, { color: getStatusColor(project.status) }]}>
                      {getStatusLabel(project.status)}
                    </Text>
                  </View>
                </View>
              </View>
              
              <View style={styles.projectDetails}>
                <Text style={styles.detailText}>Type: {project.project_type}</Text>
                {project.hourly_rate && <Text style={styles.detailText}>Taux: {project.hourly_rate}€/h</Text>}
                {project.estimated_hours && <Text style={styles.detailText}>Estimé: {project.estimated_hours}h</Text>}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingProject ? 'Modifier' : 'Nouveau'} projet</Text>
            
            <ScrollView>
              <TextInput
                style={styles.input}
                placeholder="Nom du projet *"
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
              />
              <TextInput
                style={styles.input}
                placeholder="Date de début"
                value={formData.start_date}
                onChangeText={(text) => setFormData({ ...formData, start_date: text })}
              />
              <TextInput
                style={styles.input}
                placeholder="Taux horaire (€)"
                value={formData.hourly_rate}
                keyboardType="numeric"
                onChangeText={(text) => setFormData({ ...formData, hourly_rate: text })}
              />
              <TextInput
                style={styles.input}
                placeholder="Heures estimées"
                value={formData.estimated_hours}
                keyboardType="numeric"
                onChangeText={(text) => setFormData({ ...formData, estimated_hours: text })}
              />
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveButtonText}>Enregistrer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  addButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#6366F1', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  addButtonText: { color: '#fff', marginLeft: 8, fontWeight: '600' },
  content: { flex: 1, padding: 16 },
  loadingText: { textAlign: 'center', marginTop: 20, color: '#6B7280' },
  emptyText: { textAlign: 'center', marginTop: 40, color: '#6B7280', fontSize: 16 },
  projectCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  projectHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  projectInfo: { flex: 1, marginLeft: 12 },
  projectName: { fontSize: 18, fontWeight: '600', color: '#111827' },
  statusBadge: { marginTop: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
  statusText: { fontSize: 12, fontWeight: '600' },
  projectDetails: { borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 12 },
  detailText: { fontSize: 14, color: '#6B7280', marginBottom: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '90%', maxWidth: 500, maxHeight: '80%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16, color: '#111827' },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 16 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 },
  cancelButton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, marginRight: 12 },
  cancelButtonText: { color: '#6B7280', fontWeight: '600' },
  saveButton: { backgroundColor: '#6366F1', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  saveButtonText: { color: '#fff', fontWeight: '600' },
});
