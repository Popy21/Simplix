import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  ScrollView,
} from 'react-native';
import { customerService } from '../services/api';
import { Customer } from '../types';

export default function CustomersScreen() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCustomerModalVisible, setNewCustomerModalVisible] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    address: '',
  });

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const response = await customerService.getAll();
      setCustomers(response.data);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de charger les clients');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCustomer = () => {
    if (!newCustomerForm.name.trim() || !newCustomerForm.email.trim()) {
      Alert.alert('Erreur', 'Le nom et l\'email sont obligatoires');
      return;
    }

    const newCustomer: Customer = {
      id: Date.now(),
      name: newCustomerForm.name,
      email: newCustomerForm.email,
      phone: newCustomerForm.phone,
      company: newCustomerForm.company,
      address: newCustomerForm.address,
    };

    setCustomers([...customers, newCustomer]);
    handleResetCustomerForm();
    setNewCustomerModalVisible(false);
    Alert.alert('Succès', `Client ${newCustomer.name} créé avec succès`);
  };

  const handleResetCustomerForm = () => {
    setNewCustomerForm({
      name: '',
      email: '',
      phone: '',
      company: '',
      address: '',
    });
  };

  const renderItem = ({ item }: { item: Customer }) => (
    <View style={styles.card}>
      <Text style={styles.name}>{item.name}</Text>
      {item.email && <Text style={styles.detail}>📧 {item.email}</Text>}
      {item.phone && <Text style={styles.detail}>📱 {item.phone}</Text>}
      {item.company && <Text style={styles.detail}>🏢 {item.company}</Text>}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* En-tête */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Clients</Text>
          <Text style={styles.headerSubtitle}>{customers.length} clients</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setNewCustomerModalVisible(true)}
        >
          <Text style={styles.addButtonText}>+ Nouveau</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={customers}
        renderItem={renderItem}
        keyExtractor={(item) => item.id?.toString() || ''}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Aucun client trouvé</Text>
        }
      />

      {/* Modal Création Client */}
      <Modal visible={newCustomerModalVisible} transparent animationType="slide" onRequestClose={() => setNewCustomerModalVisible(false)}>
        <View style={styles.newModalContainer}>
          <View style={styles.newModalContent}>
            <View style={styles.newModalHeader}>
              <Text style={styles.newModalTitle}>Nouveau Client</Text>
              <TouchableOpacity onPress={() => setNewCustomerModalVisible(false)}>
                <Text style={styles.closeButtonNew}>×</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.newModalBody}>
              {/* Nom */}
              <View style={styles.formGroupCustomer}>
                <Text style={styles.formLabelCustomer}>Nom du client *</Text>
                <TextInput
                  style={styles.inputCustomer}
                  placeholder="Nom complet"
                  value={newCustomerForm.name}
                  onChangeText={(text) => setNewCustomerForm({ ...newCustomerForm, name: text })}
                  placeholderTextColor="#8E8E93"
                />
              </View>

              {/* Email */}
              <View style={styles.formGroupCustomer}>
                <Text style={styles.formLabelCustomer}>Email *</Text>
                <TextInput
                  style={styles.inputCustomer}
                  placeholder="email@example.com"
                  value={newCustomerForm.email}
                  onChangeText={(text) => setNewCustomerForm({ ...newCustomerForm, email: text })}
                  keyboardType="email-address"
                  placeholderTextColor="#8E8E93"
                />
              </View>

              {/* Téléphone */}
              <View style={styles.formGroupCustomer}>
                <Text style={styles.formLabelCustomer}>Téléphone</Text>
                <TextInput
                  style={styles.inputCustomer}
                  placeholder="+33 6 XX XX XX XX"
                  value={newCustomerForm.phone}
                  onChangeText={(text) => setNewCustomerForm({ ...newCustomerForm, phone: text })}
                  keyboardType="phone-pad"
                  placeholderTextColor="#8E8E93"
                />
              </View>

              {/* Entreprise */}
              <View style={styles.formGroupCustomer}>
                <Text style={styles.formLabelCustomer}>Entreprise</Text>
                <TextInput
                  style={styles.inputCustomer}
                  placeholder="Nom de l'entreprise"
                  value={newCustomerForm.company}
                  onChangeText={(text) => setNewCustomerForm({ ...newCustomerForm, company: text })}
                  placeholderTextColor="#8E8E93"
                />
              </View>

              {/* Adresse */}
              <View style={styles.formGroupCustomer}>
                <Text style={styles.formLabelCustomer}>Adresse</Text>
                <TextInput
                  style={[styles.inputCustomer, styles.textAreaCustomer]}
                  placeholder="Adresse postale"
                  value={newCustomerForm.address}
                  onChangeText={(text) => setNewCustomerForm({ ...newCustomerForm, address: text })}
                  placeholderTextColor="#8E8E93"
                  multiline
                  numberOfLines={3}
                />
              </View>
            </ScrollView>

            <View style={styles.newModalFooter}>
              <TouchableOpacity
                style={[styles.buttonCustomer, styles.buttonSecondaryCustomer]}
                onPress={() => {
                  handleResetCustomerForm();
                  setNewCustomerModalVisible(false);
                }}
              >
                <Text style={styles.buttonSecondaryTextCustomer}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.buttonCustomer, styles.buttonPrimaryCustomer]}
                onPress={handleCreateCustomer}
              >
                <Text style={styles.buttonPrimaryTextCustomer}>Créer</Text>
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
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  detail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#999',
    marginTop: 32,
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
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
    maxHeight: '90%',
    paddingBottom: 20,
  },
  newModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  newModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
  },
  closeButtonNew: {
    fontSize: 32,
    color: '#8E8E93',
    fontWeight: '300',
  },
  newModalBody: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  formGroupCustomer: {
    marginBottom: 16,
  },
  formLabelCustomer: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  inputCustomer: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#000000',
  },
  textAreaCustomer: {
    textAlignVertical: 'top',
    paddingTop: 10,
    height: 80,
  },
  newModalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  buttonCustomer: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimaryCustomer: {
    backgroundColor: '#007AFF',
  },
  buttonPrimaryTextCustomer: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonSecondaryCustomer: {
    backgroundColor: '#F2F2F7',
  },
  buttonSecondaryTextCustomer: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
