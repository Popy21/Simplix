import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert, RefreshControl } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { BankIcon, PlusIcon, EditIcon, TrashIcon, DollarIcon } from '../components/Icons';
import Navigation from '../components/Navigation';
import { bankAccountsService } from '../services/api';

type BankAccountsScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'BankAccounts'>;
};

export default function BankAccountsScreen({ navigation }: BankAccountsScreenProps) {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [formData, setFormData] = useState({
    account_name: '',
    bank_name: '',
    iban: '',
    bic: '',
    account_type: 'checking',
    currency: 'EUR',
    opening_balance: '0',
  });

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const res = await bankAccountsService.getAll();
      setAccounts(res.data || []);
    } catch (error) {
      console.error('Error fetching bank accounts:', error);
      Alert.alert('Erreur', 'Impossible de charger les comptes bancaires');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleCreate = () => {
    setEditingAccount(null);
    setFormData({
      account_name: '',
      bank_name: '',
      iban: '',
      bic: '',
      account_type: 'checking',
      currency: 'EUR',
      opening_balance: '0',
    });
    setModalVisible(true);
  };

  const handleEdit = (account: any) => {
    setEditingAccount(account);
    setFormData({
      account_name: account.account_name,
      bank_name: account.bank_name,
      iban: account.iban || '',
      bic: account.bic || '',
      account_type: account.account_type || 'checking',
      currency: account.currency || 'EUR',
      opening_balance: account.opening_balance?.toString() || '0',
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!formData.account_name || !formData.bank_name) {
      Alert.alert('Erreur', 'Nom du compte et banque sont requis');
      return;
    }

    try {
      const data = {
        ...formData,
        opening_balance: parseFloat(formData.opening_balance) || 0,
      };

      if (editingAccount) {
        await bankAccountsService.update(editingAccount.id, data);
      } else {
        await bankAccountsService.create(data);
      }

      setModalVisible(false);
      fetchAccounts();
      Alert.alert('Succès', editingAccount ? 'Compte modifié' : 'Compte créé');
    } catch (error) {
      console.error('Error saving account:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder le compte');
    }
  };

  const handleDelete = (account: any) => {
    Alert.alert(
      'Confirmation',
      `Supprimer le compte ${account.account_name} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await bankAccountsService.delete(account.id);
              fetchAccounts();
              Alert.alert('Succès', 'Compte supprimé');
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de supprimer le compte');
            }
          },
        },
      ]
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  return (
    <View style={styles.container}>
      <Navigation navigation={navigation} />
      
      <View style={styles.header}>
        <Text style={styles.title}>Comptes Bancaires</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleCreate}>
          <PlusIcon size={20} color="#fff" />
          <Text style={styles.addButtonText}>Nouveau compte</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAccounts(); }} />}
      >
        {loading ? (
          <Text style={styles.loadingText}>Chargement...</Text>
        ) : accounts.length === 0 ? (
          <Text style={styles.emptyText}>Aucun compte bancaire</Text>
        ) : (
          accounts.map((account) => (
            <View key={account.id} style={styles.accountCard}>
              <View style={styles.accountHeader}>
                <BankIcon size={24} color="#6366F1" />
                <View style={styles.accountInfo}>
                  <Text style={styles.accountName}>{account.account_name}</Text>
                  <Text style={styles.bankName}>{account.bank_name}</Text>
                </View>
                <View style={styles.accountActions}>
                  <TouchableOpacity onPress={() => handleEdit(account)} style={styles.iconButton}>
                    <EditIcon size={20} color="#6366F1" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(account)} style={styles.iconButton}>
                    <TrashIcon size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
              
              <View style={styles.accountDetails}>
                {account.iban && <Text style={styles.detailText}>IBAN: {account.iban}</Text>}
                <View style={styles.balanceRow}>
                  <Text style={styles.detailLabel}>Solde actuel:</Text>
                  <Text style={[styles.balance, account.current_balance >= 0 ? styles.balancePositive : styles.balanceNegative]}>
                    {formatCurrency(account.current_balance || 0)}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingAccount ? 'Modifier' : 'Nouveau'} compte</Text>
            
            <ScrollView>
              <TextInput
                style={styles.input}
                placeholder="Nom du compte *"
                value={formData.account_name}
                onChangeText={(text) => setFormData({ ...formData, account_name: text })}
              />
              <TextInput
                style={styles.input}
                placeholder="Nom de la banque *"
                value={formData.bank_name}
                onChangeText={(text) => setFormData({ ...formData, bank_name: text })}
              />
              <TextInput
                style={styles.input}
                placeholder="IBAN"
                value={formData.iban}
                onChangeText={(text) => setFormData({ ...formData, iban: text })}
              />
              <TextInput
                style={styles.input}
                placeholder="BIC"
                value={formData.bic}
                onChangeText={(text) => setFormData({ ...formData, bic: text })}
              />
              <TextInput
                style={styles.input}
                placeholder="Solde d'ouverture"
                value={formData.opening_balance}
                keyboardType="numeric"
                onChangeText={(text) => setFormData({ ...formData, opening_balance: text })}
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
  accountCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  accountHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  accountInfo: { flex: 1, marginLeft: 12 },
  accountName: { fontSize: 18, fontWeight: '600', color: '#111827' },
  bankName: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  accountActions: { flexDirection: 'row' },
  iconButton: { marginLeft: 12, padding: 4 },
  accountDetails: { borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 12 },
  detailText: { fontSize: 14, color: '#6B7280', marginBottom: 8 },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailLabel: { fontSize: 14, color: '#6B7280' },
  balance: { fontSize: 20, fontWeight: 'bold' },
  balancePositive: { color: '#10B981' },
  balanceNegative: { color: '#EF4444' },
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
