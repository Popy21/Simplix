import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert, RefreshControl } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { UserIcon, PlusIcon, EditIcon, TrashIcon } from '../components/Icons';
import Navigation from '../components/Navigation';
import { employeesService } from '../services/api';

type EmployeesScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Employees'>;
};

export default function EmployeesScreen({ navigation }: EmployeesScreenProps) {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    employee_number: '',
    job_title: '',
    department: '',
    employment_type: 'full_time',
    hire_date: new Date().toISOString().split('T')[0],
    base_salary: '',
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const res = await employeesService.getAll();
      setEmployees(res.data || []);
    } catch (error) {
      console.error(error);
      Alert.alert('Erreur', 'Impossible de charger les employés');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleCreate = () => {
    setEditingEmployee(null);
    const empCount = employees.length + 1;
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      employee_number: `EMP-${String(empCount).padStart(3, '0')}`,
      job_title: '',
      department: '',
      employment_type: 'full_time',
      hire_date: new Date().toISOString().split('T')[0],
      base_salary: '',
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!formData.first_name || !formData.last_name || !formData.email) {
      Alert.alert('Erreur', 'Prénom, nom et email sont requis');
      return;
    }

    try {
      const data = {
        ...formData,
        base_salary: formData.base_salary ? parseFloat(formData.base_salary) : undefined,
        currency: 'EUR',
      };

      if (editingEmployee) {
        await employeesService.update(editingEmployee.id, data);
      } else {
        await employeesService.create(data);
      }

      setModalVisible(false);
      fetchEmployees();
      Alert.alert('Succès', editingEmployee ? 'Employé modifié' : 'Employé créé');
    } catch (error) {
      console.error(error);
      Alert.alert('Erreur', 'Impossible de sauvegarder l\'employé');
    }
  };

  return (
    <View style={styles.container}>
      <Navigation navigation={navigation} />

      <View style={styles.header}>
        <Text style={styles.title}>Employés</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleCreate}>
          <PlusIcon size={20} color="#fff" />
          <Text style={styles.addButtonText}>Nouvel employé</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchEmployees(); }} />}
      >
        {loading ? (
          <Text style={styles.loadingText}>Chargement...</Text>
        ) : employees.length === 0 ? (
          <Text style={styles.emptyText}>Aucun employé</Text>
        ) : (
          employees.map((employee) => (
            <View key={employee.id} style={styles.employeeCard}>
              <View style={styles.employeeHeader}>
                <UserIcon size={24} color="#6366F1" />
                <View style={styles.employeeInfo}>
                  <Text style={styles.employeeName}>{employee.first_name} {employee.last_name}</Text>
                  <Text style={styles.jobTitle}>{employee.job_title}</Text>
                  <Text style={styles.department}>{employee.department}</Text>
                </View>
              </View>

              <View style={styles.employeeDetails}>
                <Text style={styles.detailText}>Email: {employee.email}</Text>
                <Text style={styles.detailText}>N°: {employee.employee_number}</Text>
                {employee.base_salary && <Text style={styles.detailText}>Salaire: {employee.base_salary}€</Text>}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingEmployee ? 'Modifier' : 'Nouvel'} employé</Text>

            <ScrollView>
              <TextInput
                style={styles.input}
                placeholder="Prénom *"
                value={formData.first_name}
                onChangeText={(text) => setFormData({ ...formData, first_name: text })}
              />
              <TextInput
                style={styles.input}
                placeholder="Nom *"
                value={formData.last_name}
                onChangeText={(text) => setFormData({ ...formData, last_name: text })}
              />
              <TextInput
                style={styles.input}
                placeholder="Email *"
                value={formData.email}
                keyboardType="email-address"
                onChangeText={(text) => setFormData({ ...formData, email: text })}
              />
              <TextInput
                style={styles.input}
                placeholder="N° Employé"
                value={formData.employee_number}
                onChangeText={(text) => setFormData({ ...formData, employee_number: text })}
              />
              <TextInput
                style={styles.input}
                placeholder="Poste"
                value={formData.job_title}
                onChangeText={(text) => setFormData({ ...formData, job_title: text })}
              />
              <TextInput
                style={styles.input}
                placeholder="Département"
                value={formData.department}
                onChangeText={(text) => setFormData({ ...formData, department: text })}
              />
              <TextInput
                style={styles.input}
                placeholder="Salaire de base"
                value={formData.base_salary}
                keyboardType="numeric"
                onChangeText={(text) => setFormData({ ...formData, base_salary: text })}
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
  employeeCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  employeeHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  employeeInfo: { flex: 1, marginLeft: 12 },
  employeeName: { fontSize: 18, fontWeight: '600', color: '#111827' },
  jobTitle: { fontSize: 14, color: '#6366F1', marginTop: 2 },
  department: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  employeeDetails: { borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 12 },
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
