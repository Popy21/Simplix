import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  ScrollView,
  RefreshControl,
  Platform,
} from 'react-native';
import { supplierService, expenseService } from '../services/api';
import { Supplier, Expense } from '../types';
import { DollarIcon, UsersIcon, FileTextIcon } from '../components/Icons';
import Navigation from '../components/Navigation';

type SupplierSummary = {
  total_active?: number;
  total_archived?: number;
  vendors?: number;
  services?: number;
  freelancers?: number;
};

const categories: Array<{ label: string; value?: Supplier['category'] | 'all' }> = [
  { label: 'Tous', value: 'all' },
  { label: 'Fournisseurs', value: 'vendor' },
  { label: 'Services', value: 'service' },
  { label: 'Freelance', value: 'freelancer' },
  { label: 'Autres', value: 'other' },
];

const SuppliersScreen = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [summary, setSummary] = useState<SupplierSummary>({});
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Supplier['category'] | 'all'>('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [supplierExpenses, setSupplierExpenses] = useState<Expense[]>([]);
  const [loadingExpenses, setLoadingExpenses] = useState(false);
  const [form, setForm] = useState<Partial<Supplier>>({
    name: '',
    category: 'vendor',
    contact_name: '',
    email: '',
    phone: '',
    payment_terms: 30,
    default_currency: 'EUR',
  });

  const loadSummary = useCallback(async () => {
    try {
      const { data } = await supplierService.getSummary();
      setSummary(data);
    } catch (error) {
      console.error('Failed to load supplier summary', error);
    }
  }, []);

  const loadSuppliers = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (search.trim()) params.search = search;
      if (selectedCategory && selectedCategory !== 'all') params.category = selectedCategory;
      const { data } = await supplierService.getAll(params);
      setSuppliers(data.data);
    } catch (error) {
      console.error('Failed to load suppliers', error);
      Alert.alert('Erreur', 'Impossible de charger les fournisseurs');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, selectedCategory]);

  useEffect(() => {
    loadSuppliers();
    loadSummary();
  }, [loadSuppliers, loadSummary]);

  const onRefresh = () => {
    setRefreshing(true);
    loadSuppliers();
    loadSummary();
  };

  const handleSupplierClick = async (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setDetailModalVisible(true);
    setLoadingExpenses(true);
    try {
      const { data } = await expenseService.getAll({ supplierId: supplier.id as string, limit: 10 });
      setSupplierExpenses(data.data || []);
    } catch (error) {
      console.error('Failed to load supplier expenses', error);
      setSupplierExpenses([]);
    } finally {
      setLoadingExpenses(false);
    }
  };

  const handleCreateSupplier = async () => {
    if (!form.name?.trim()) {
      Alert.alert('Nom requis', 'Veuillez renseigner un nom de fournisseur.');
      return;
    }

    try {
      await supplierService.create(form);
      setModalVisible(false);
      setForm({
        name: '',
        category: 'vendor',
        contact_name: '',
        email: '',
        phone: '',
        payment_terms: 30,
        default_currency: 'EUR',
      });
      await Promise.all([loadSuppliers(), loadSummary()]);
      Alert.alert('Succès', 'Fournisseur créé avec succès.');
    } catch (error) {
      console.error('Failed to create supplier', error);
      Alert.alert('Erreur', 'Création du fournisseur impossible.');
    }
  };

  const renderSupplier = ({ item }: { item: Supplier }) => (
    <TouchableOpacity style={styles.card} activeOpacity={0.75} onPress={() => handleSupplierClick(item)}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <UsersIcon size={22} color="#007AFF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{item.name}</Text>
          {item.category && <Text style={styles.cardSubtitle}>{formatCategory(item.category)}</Text>}
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{item.default_currency || 'EUR'}</Text>
        </View>
      </View>
      <View style={styles.cardBody}>
        {item.contact_name ? (
          <Text style={styles.cardDetail}>👤 {item.contact_name}</Text>
        ) : null}
        {item.email ? <Text style={styles.cardDetail}>✉️ {item.email}</Text> : null}
        {item.phone ? <Text style={styles.cardDetail}>📞 {item.phone}</Text> : null}
        <Text style={styles.cardDetail}>
          ⏱️ Modalités: {item.payment_terms || 30} jours
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Navigation />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.title}>Fournisseurs & Achats</Text>
        <Text style={styles.subtitle}>
          Centralisez vos prestataires pour suivre les dépenses et commandes fournisseurs comme sur Axonaut ou Sellsy.
        </Text>

        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, styles.summaryPrimary]}>
            <DollarIcon size={28} color="#FFFFFF" />
            <Text style={styles.summaryLabel}>Fournisseurs actifs</Text>
            <Text style={styles.summaryValue}>{summary.total_active ?? '—'}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Prestataires services</Text>
            <Text style={styles.summaryValue}>{summary.services ?? '—'}</Text>
            <Text style={styles.summaryHint}>Contracts, SaaS, maintenance</Text>
          </View>
        </View>

        <View style={styles.searchSection}>
          <View style={styles.searchInputWrapper}>
            <TextInput
              placeholder="Rechercher un fournisseur"
              placeholderTextColor="#8E8E93"
              value={search}
              onChangeText={setSearch}
              style={styles.searchInput}
              returnKeyType="search"
              onSubmitEditing={loadSuppliers}
            />
          </View>
          <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
            <Text style={styles.addButtonText}>+ Nouveau</Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.label}
              style={[
                styles.filterChip,
                selectedCategory === cat.value && styles.filterChipActive,
              ]}
              onPress={() => setSelectedCategory(cat.value || 'all')}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedCategory === cat.value && styles.filterChipTextActive,
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
          </View>
        ) : (
          <FlatList
            data={suppliers}
            keyExtractor={(item) => item.id || Math.random().toString()}
            renderItem={renderSupplier}
            scrollEnabled={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>Aucun fournisseur</Text>
                <Text style={styles.emptySubtitle}>
                  Ajoutez vos fournisseurs pour suivre vos dépenses fournisseurs et commandes.
                </Text>
              </View>
            }
          />
        )}
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nouveau fournisseur</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalLabel}>Nom *</Text>
              <TextInput
                style={styles.modalInput}
                value={form.name}
                onChangeText={(text) => setForm((prev) => ({ ...prev, name: text }))}
                placeholder="Société"
              />

              <Text style={styles.modalLabel}>Catégorie</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {categories
                  .filter((cat) => cat.value && cat.value !== 'all')
                  .map((cat) => (
                    <TouchableOpacity
                      key={cat.label}
                      style={[
                        styles.filterChip,
                        form.category === cat.value && styles.filterChipActive,
                        { marginRight: 8 },
                      ]}
                      onPress={() => setForm((prev) => ({ ...prev, category: cat.value as Supplier['category'] }))}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          form.category === cat.value && styles.filterChipTextActive,
                        ]}
                      >
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
              </ScrollView>

              <Text style={styles.modalLabel}>Contact</Text>
              <TextInput
                style={styles.modalInput}
                value={form.contact_name}
                onChangeText={(text) => setForm((prev) => ({ ...prev, contact_name: text }))}
                placeholder="Nom du contact principal"
              />

              <Text style={styles.modalLabel}>Email</Text>
              <TextInput
                style={styles.modalInput}
                value={form.email}
                onChangeText={(text) => setForm((prev) => ({ ...prev, email: text }))}
                placeholder="contact@exemple.com"
                keyboardType="email-address"
              />

              <Text style={styles.modalLabel}>Téléphone</Text>
              <TextInput
                style={styles.modalInput}
                value={form.phone}
                onChangeText={(text) => setForm((prev) => ({ ...prev, phone: text }))}
                placeholder="+33 6 12 34 56 78"
                keyboardType="phone-pad"
              />

              <Text style={styles.modalLabel}>Modalités de paiement (jours)</Text>
              <TextInput
                style={styles.modalInput}
                value={String(form.payment_terms ?? 30)}
                onChangeText={(text) =>
                  setForm((prev) => ({ ...prev, payment_terms: Number(text) || 30 }))
                }
                keyboardType="numeric"
              />

              <Text style={styles.modalLabel}>Devise par défaut</Text>
              <TextInput
                style={styles.modalInput}
                value={form.default_currency}
                onChangeText={(text) => setForm((prev) => ({ ...prev, default_currency: text.toUpperCase() }))}
                placeholder="EUR"
                maxLength={3}
              />

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.modalCancel} onPress={() => setModalVisible(false)}>
                  <Text style={styles.modalCancelText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalSubmit} onPress={handleCreateSupplier}>
                  <Text style={styles.modalSubmitText}>Enregistrer</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal Détails Fournisseur avec Dépenses */}
      <Modal visible={detailModalVisible} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            {selectedSupplier && (
              <>
                <View style={styles.modalHeaderRow}>
                  <Text style={styles.modalTitle}>{selectedSupplier.name}</Text>
                  <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                    <Text style={styles.modalClose}>✕</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Catégorie</Text>
                    <Text style={styles.detailValue}>{formatCategory(selectedSupplier.category)}</Text>
                  </View>

                  {selectedSupplier.contact_name && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Contact</Text>
                      <Text style={styles.detailValue}>{selectedSupplier.contact_name}</Text>
                    </View>
                  )}

                  {selectedSupplier.email && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Email</Text>
                      <Text style={styles.detailValue}>{selectedSupplier.email}</Text>
                    </View>
                  )}

                  {selectedSupplier.phone && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Téléphone</Text>
                      <Text style={styles.detailValue}>{selectedSupplier.phone}</Text>
                    </View>
                  )}

                  {selectedSupplier.website && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Site Web</Text>
                      <Text style={styles.detailValue}>{selectedSupplier.website}</Text>
                    </View>
                  )}

                  <View style={styles.expensesSection}>
                    <Text style={styles.expensesSectionTitle}>Dépenses récentes</Text>
                    {loadingExpenses ? (
                      <ActivityIndicator size="small" color="#007AFF" style={{ marginTop: 16 }} />
                    ) : supplierExpenses.length > 0 ? (
                      supplierExpenses.map((expense) => (
                        <View key={expense.id} style={styles.expenseItem}>
                          <FileTextIcon size={18} color="#64748B" />
                          <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={styles.expenseItemTitle}>
                              {expense.description || expense.reference || 'Dépense'}
                            </Text>
                            <Text style={styles.expenseItemDate}>
                              {expense.expense_date ? new Date(expense.expense_date).toLocaleDateString('fr-FR') : '—'}
                            </Text>
                          </View>
                          <Text style={styles.expenseItemAmount}>
                            {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: expense.currency || 'EUR' }).format(expense.amount || 0)}
                          </Text>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.emptyExpensesText}>Aucune dépense enregistrée</Text>
                    )}
                  </View>
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const formatCategory = (category: Supplier['category']) => {
  switch (category) {
    case 'vendor':
      return 'Fournisseur';
    case 'service':
      return 'Service';
    case 'freelancer':
      return 'Freelance';
    case 'other':
    default:
      return 'Autre';
  }
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  content: { padding: 20, paddingBottom: 60 },
  title: { fontSize: 28, fontWeight: '700', color: '#0F172A', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#475569', marginBottom: 18, lineHeight: 20 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, gap: 12 },
  summaryCard: {
    flex: 1,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  summaryPrimary: { backgroundColor: '#1D4ED8', justifyContent: 'space-between' },
  summaryLabel: { fontSize: 13, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 12 },
  summaryValue: { fontSize: 26, fontWeight: '700', color: '#0F172A' },
  summaryHint: { fontSize: 12, color: '#94A3B8', marginTop: 6 },
  searchSection: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 12 },
  searchInputWrapper: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 12 : 8 },
  searchInput: { fontSize: 16, color: '#0F172A' },
  addButton: { backgroundColor: '#007AFF', paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12 },
  addButtonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 15 },
  filterRow: { marginBottom: 16 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#E2E8F0',
    marginRight: 10,
  },
  filterChipActive: { backgroundColor: '#0F172A' },
  filterChipText: { color: '#475569', fontWeight: '500' },
  filterChipTextActive: { color: '#FFFFFF' },
  loadingContainer: { paddingVertical: 40 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardTitle: { fontSize: 17, fontWeight: '600', color: '#0F172A' },
  cardSubtitle: { fontSize: 13, color: '#64748B', marginTop: 2 },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
  },
  badgeText: { color: '#1D4ED8', fontWeight: '600', fontSize: 12 },
  cardBody: { gap: 4 },
  cardDetail: { fontSize: 13, color: '#475569' },
  emptyState: { backgroundColor: '#E2E8F0', borderRadius: 16, padding: 24, alignItems: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#0F172A', marginBottom: 4 },
  emptySubtitle: { fontSize: 14, color: '#475569', textAlign: 'center' },
  modalBackdrop: { flex: 1, backgroundColor: '#0F172A99', justifyContent: 'center', padding: 20 },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    maxHeight: '85%',
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#0F172A', marginBottom: 16 },
  modalLabel: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6 },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 15,
    color: '#0F172A',
    marginBottom: 12,
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12, gap: 12 },
  modalCancel: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
  },
  modalCancelText: { color: '#475569', fontWeight: '600' },
  modalSubmit: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#0F172A',
  },
  modalSubmitText: { color: '#FFFFFF', fontWeight: '600' },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalClose: {
    fontSize: 28,
    color: '#64748B',
    fontWeight: '300',
  },
  detailSection: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  detailValue: {
    fontSize: 15,
    color: '#0F172A',
    fontWeight: '500',
  },
  expensesSection: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  expensesSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 16,
  },
  expenseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  expenseItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  expenseItemDate: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  expenseItemAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  emptyExpensesText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    paddingVertical: 24,
  },
});

export default SuppliersScreen;
