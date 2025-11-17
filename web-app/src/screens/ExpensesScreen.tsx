import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Modal,
  Alert,
  RefreshControl,
  Platform,
} from 'react-native';
import { expenseService, supplierService } from '../services/api';
import { Expense, Supplier } from '../types';
import { DollarIcon, FileTextIcon, CalendarIcon } from '../components/Icons';
import GlassLayout from '../components/GlassLayout';
import ReceiptScanner from '../components/ReceiptScanner';

type ExpenseFilters = {
  status?: string;
  paymentStatus?: string;
};

type ExpenseSummary = {
  total_expenses?: number;
  total_amount?: number;
  total_ht?: number;
  pending_approval?: number;
  unpaid?: number;
  paid?: number;
  paid_amount?: number;
};

const statusPills = [
  { key: 'all', label: 'Tout' },
  { key: 'submitted', label: 'Soumis' },
  { key: 'approved', label: 'Approuvé' },
  { key: 'paid', label: 'Payé' },
  { key: 'rejected', label: 'Rejeté' },
];

const paymentPills = [
  { key: 'all', label: 'Paiement' },
  { key: 'unpaid', label: 'Non payé' },
  { key: 'partial', label: 'Partiel' },
  { key: 'paid', label: 'Payé' },
];

const ExpensesScreen = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<ExpenseSummary>({});
  const [filters, setFilters] = useState<ExpenseFilters>({});
  const [search, setSearch] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [form, setForm] = useState<Partial<Expense>>({
    expense_date: new Date().toISOString().slice(0, 10),
    currency: 'EUR',
    status: 'submitted',
    payment_status: 'unpaid',
    amount: 0,
    tax_amount: 0,
    expense_type: 'purchase',
    payment_method: 'card',
  });

  const loadSuppliers = useCallback(async () => {
    try {
      const { data } = await supplierService.getAll({ limit: 100 });
      setSuppliers(data.data);
    } catch (error) {
      console.error('Failed to load suppliers for expenses', error);
    }
  }, []);

  const loadSummary = useCallback(async () => {
    try {
      const { data } = await expenseService.getSummary();
      setSummary(data);
    } catch (error) {
      console.error('Failed to load expense summary', error);
    }
  }, []);

  const loadExpenses = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filters.status && filters.status !== 'all') params.status = filters.status;
      if (filters.paymentStatus && filters.paymentStatus !== 'all') params.paymentStatus = filters.paymentStatus;
      if (search.trim()) params.search = search;
      const { data } = await expenseService.getAll(params);
      setExpenses(data.data);
    } catch (error) {
      console.error('Failed to load expenses', error);
      Alert.alert('Erreur', 'Impossible de charger les dépenses.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters, search]);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  useEffect(() => {
    loadExpenses();
    loadSummary();
  }, [loadExpenses, loadSummary]);

  const onRefresh = () => {
    setRefreshing(true);
    loadExpenses();
    loadSummary();
  };

  const handleScanData = useCallback((extractedData: any) => {
    setForm((prev) => ({
      ...prev,
      ...(extractedData.amount && { amount: extractedData.amount }),
      ...(extractedData.tax_amount && { tax_amount: extractedData.tax_amount }),
      ...(extractedData.date && { expense_date: extractedData.date }),
      ...(extractedData.description && { description: extractedData.description }),
      ...(extractedData.reference && { reference: extractedData.reference }),
    }));
  }, []);

  const handleCreateExpense = async () => {
    if (!form.amount || Number(form.amount) <= 0) {
      Alert.alert('Montant requis', 'Le montant doit être supérieur à zéro.');
      return;
    }

    try {
      await expenseService.create({
        ...form,
        amount: Number(form.amount),
        tax_amount: Number(form.tax_amount || 0),
      });
      setModalVisible(false);
      setForm({
        expense_date: new Date().toISOString().slice(0, 10),
        currency: 'EUR',
        status: 'submitted',
        payment_status: 'unpaid',
        amount: 0,
        tax_amount: 0,
        expense_type: 'purchase',
        payment_method: 'card',
      });
      await Promise.all([loadExpenses(), loadSummary()]);
      Alert.alert('Succès', 'Dépense enregistrée.');
    } catch (error) {
      console.error('Failed to create expense', error);
      Alert.alert('Erreur', 'Impossible de créer la dépense.');
    }
  };

  const handleExpenseClick = (expense: Expense) => {
    setSelectedExpense(expense);
    setDetailModalVisible(true);
  };

  const handleUpdateExpenseStatus = async (expenseId: string, status: string, payment_status?: string) => {
    try {
      await expenseService.updateStatus(expenseId, { status, payment_status });
      await Promise.all([loadExpenses(), loadSummary()]);
      Alert.alert('Succès', 'Statut mis à jour.');
      setDetailModalVisible(false);
    } catch (error) {
      console.error('Failed to update expense status', error);
      Alert.alert('Erreur', 'Impossible de mettre à jour le statut.');
    }
  };

  const renderExpense = ({ item }: { item: Expense }) => (
    <TouchableOpacity style={styles.expenseCard} activeOpacity={0.75} onPress={() => handleExpenseClick(item)}>
      <View style={styles.expenseHeader}>
        <View style={styles.expenseIcon}>
          <FileTextIcon size={20} color="#0EA5E9" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.expenseTitle}>{item.description || item.reference || 'Dépense'}</Text>
          <Text style={styles.expenseSubtitle}>
            {item.supplier_name || 'Sans fournisseur'} · {formatDate(item.expense_date)}
          </Text>
        </View>
        <Text style={styles.expenseAmount}>{formatCurrency(item.amount || 0, item.currency)}</Text>
      </View>
      <View style={styles.expenseMetaRow}>
        <View style={[styles.tag, styles[`status_${item.status}` as keyof typeof styles]]}>
          <Text style={styles.tagText}>{statusLabel(item.status)}</Text>
        </View>
        <View style={[styles.tag, styles[`payment_${item.payment_status}` as keyof typeof styles]]}>
          <Text style={styles.tagText}>{paymentLabel(item.payment_status)}</Text>
        </View>
        <View style={styles.tagNeutral}>
          <Text style={styles.tagText}>{item.expense_type || 'Achat'}</Text>
        </View>
      </View>
      {item.notes ? <Text style={styles.expenseNote}>{item.notes}</Text> : null}
    </TouchableOpacity>
  );

  return (
    <GlassLayout>
      <View style={styles.container}>
      
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.title}>Dépenses & Notes de frais</Text>
        <Text style={styles.subtitle}>
          Suivez les dépenses fournisseurs, abonnements et frais internes comme sur Henr ou Sellsy.
        </Text>

        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, styles.summaryPrimary]}>
            <DollarIcon size={32} color="#FFFFFF" />
            <Text style={styles.summaryLabel}>Total mensuel</Text>
            <Text style={styles.summaryValue}>
              {formatCurrency(summary.total_amount || 0, 'EUR')}
            </Text>
            <Text style={styles.summaryHint}>{summary.total_expenses || 0} dépenses</Text>
          </View>
          <View style={styles.summaryCard}>
            <CalendarIcon size={28} color="#2563EB" />
            <Text style={[styles.summaryLabel, { marginTop: 18 }]}>En attente paiement</Text>
            <Text style={styles.summaryValueSecondary}>{summary.unpaid || 0}</Text>
            <Text style={styles.summaryHint}>Dossiers à traiter</Text>
          </View>
        </View>

        <View style={styles.searchSection}>
          <TextInput
            placeholder="Filtrer par description, référence..."
            placeholderTextColor="#94A3B8"
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            onSubmitEditing={loadExpenses}
          />
          <TouchableOpacity style={styles.newButton} onPress={() => setModalVisible(true)}>
            <Text style={styles.newButtonText}>+ Nouvelle dépense</Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          {statusPills.map((pill) => (
            <TouchableOpacity
              key={pill.key}
              style={[
                styles.filterChip,
                filters.status === pill.key && styles.filterChipActive,
                pill.key === 'all' && !filters.status ? styles.filterChipActive : null,
              ]}
              onPress={() =>
                setFilters((prev) => ({
                  ...prev,
                  status: pill.key === 'all' ? undefined : pill.key,
                }))
              }
            >
              <Text
                style={[
                  styles.filterChipText,
                  (filters.status === pill.key || (!filters.status && pill.key === 'all')) &&
                    styles.filterChipTextActive,
                ]}
              >
                {pill.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          {paymentPills.map((pill) => (
            <TouchableOpacity
              key={pill.key}
              style={[
                styles.filterChipSecondary,
                filters.paymentStatus === pill.key && styles.filterChipSecondaryActive,
                pill.key === 'all' && !filters.paymentStatus ? styles.filterChipSecondaryActive : null,
              ]}
              onPress={() =>
                setFilters((prev) => ({
                  ...prev,
                  paymentStatus: pill.key === 'all' ? undefined : pill.key,
                }))
              }
            >
              <Text
                style={[
                  styles.filterChipTextSecondary,
                  (filters.paymentStatus === pill.key || (!filters.paymentStatus && pill.key === 'all')) &&
                    styles.filterChipTextSecondaryActive,
                ]}
              >
                {pill.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0F172A" />
          </View>
        ) : (
          <FlatList
            data={expenses}
            keyExtractor={(item) => item.id || Math.random().toString()}
            renderItem={renderExpense}
            scrollEnabled={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>Aucune dépense enregistrée</Text>
                <Text style={styles.emptySubtitle}>
                  Enregistrez vos factures fournisseurs, abonnements et notes de frais pour suivre la trésorerie.
                </Text>
              </View>
            }
          />
        )}
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nouvelle dépense</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <ReceiptScanner onDataExtracted={handleScanData} />

              <Text style={styles.modalLabel}>Fournisseur</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.modalChipRow}>
                {suppliers.map((supplier) => (
                  <TouchableOpacity
                    key={supplier.id}
                    style={[
                      styles.modalChip,
                      form.supplier_id === supplier.id && styles.modalChipActive,
                    ]}
                    onPress={() =>
                      setForm((prev) => ({
                        ...prev,
                        supplier_id: form.supplier_id === supplier.id ? undefined : supplier.id,
                      }))
                    }
                  >
                    <Text
                      style={[
                        styles.modalChipText,
                        form.supplier_id === supplier.id && styles.modalChipTextActive,
                      ]}
                    >
                      {supplier.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.modalLabel}>Description</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Ex: Abonnement logiciel"
                value={form.description}
                onChangeText={(text) => setForm((prev) => ({ ...prev, description: text }))}
              />

              <View style={styles.modalRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.modalLabel}>Montant TTC *</Text>
                  <TextInput
                    style={styles.modalInput}
                    keyboardType="numeric"
                    value={String(form.amount ?? '')}
                    onChangeText={(text) => setForm((prev) => ({ ...prev, amount: Number(text) || 0 }))}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalLabel}>Montant TVA</Text>
                  <TextInput
                    style={styles.modalInput}
                    keyboardType="numeric"
                    value={String(form.tax_amount ?? '')}
                    onChangeText={(text) =>
                      setForm((prev) => ({ ...prev, tax_amount: Number(text) || 0 }))
                    }
                  />
                </View>
              </View>

              <View style={styles.modalRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.modalLabel}>Date de dépense</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={form.expense_date}
                    onChangeText={(text) => setForm((prev) => ({ ...prev, expense_date: text }))}
                    placeholder="YYYY-MM-DD"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalLabel}>Statut</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                    {statusPills
                      .filter((pill) => pill.key !== 'all')
                      .map((pill) => (
                        <TouchableOpacity
                          key={pill.key}
                          style={[
                            styles.modalChip,
                            form.status === pill.key && styles.modalChipActive,
                          ]}
                          onPress={() => setForm((prev) => ({ ...prev, status: pill.key }))}
                        >
                          <Text
                            style={[
                              styles.modalChipText,
                              form.status === pill.key && styles.modalChipTextActive,
                            ]}
                          >
                            {pill.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                  </ScrollView>
                </View>
              </View>

              <Text style={styles.modalLabel}>Méthode de paiement</Text>
              <TextInput
                style={styles.modalInput}
                value={form.payment_method}
                onChangeText={(text) => setForm((prev) => ({ ...prev, payment_method: text }))}
                placeholder="Carte, virement..."
              />

              <Text style={styles.modalLabel}>Notes</Text>
              <TextInput
                style={[styles.modalInput, { height: 100, textAlignVertical: 'top' }]}
                value={form.notes}
                onChangeText={(text) => setForm((prev) => ({ ...prev, notes: text }))}
                multiline
              />

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.modalCancel} onPress={() => setModalVisible(false)}>
                  <Text style={styles.modalCancelText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalSubmit} onPress={handleCreateExpense}>
                  <Text style={styles.modalSubmitText}>Enregistrer</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal Détails/Modification Dépense */}
      <Modal visible={detailModalVisible} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            {selectedExpense && (
              <>
                <View style={styles.modalHeaderRow}>
                  <Text style={styles.modalTitle}>Détails de la dépense</Text>
                  <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                    <Text style={styles.modalClose}>✕</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Description</Text>
                    <Text style={styles.detailValue}>{selectedExpense.description || selectedExpense.reference || 'Sans description'}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Montant TTC</Text>
                      <Text style={[styles.detailValue, styles.detailAmount]}>
                        {formatCurrency(selectedExpense.amount || 0, selectedExpense.currency)}
                      </Text>
                    </View>
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>TVA</Text>
                      <Text style={styles.detailValue}>
                        {formatCurrency(selectedExpense.tax_amount || 0, selectedExpense.currency)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Fournisseur</Text>
                      {selectedExpense.supplier_id ? (
                        <TouchableOpacity onPress={async () => {
                          if (selectedExpense.supplier_id) {
                            try {
                              const { data } = await supplierService.getById(selectedExpense.supplier_id as string);
                              Alert.alert(
                                data.name || data.legal_name,
                                `Email: ${data.email || 'N/A'}\nTéléphone: ${data.phone || 'N/A'}\nSite: ${data.website || 'N/A'}`,
                                [{ text: 'OK' }]
                              );
                            } catch (error) {
                              console.error('Failed to load supplier', error);
                            }
                          }
                        }}>
                          <Text style={[styles.detailValue, styles.detailLink]}>{selectedExpense.supplier_name || 'Non spécifié'}</Text>
                        </TouchableOpacity>
                      ) : (
                        <Text style={styles.detailValue}>Non spécifié</Text>
                      )}
                    </View>
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Date</Text>
                      <Text style={styles.detailValue}>{formatDate(selectedExpense.expense_date)}</Text>
                    </View>
                  </View>

                  {selectedExpense.payment_method && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Méthode de paiement</Text>
                      <Text style={styles.detailValue}>{selectedExpense.payment_method}</Text>
                    </View>
                  )}

                  {selectedExpense.notes && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Notes</Text>
                      <Text style={styles.detailValue}>{selectedExpense.notes}</Text>
                    </View>
                  )}

                  <View style={styles.statusChangeSection}>
                    <Text style={styles.statusChangeTitle}>Changer le statut</Text>

                    <Text style={styles.statusChangeSubtitle}>Statut de la dépense</Text>
                    <View style={styles.statusButtonRow}>
                      {['submitted', 'approved', 'rejected'].map((status) => (
                        <TouchableOpacity
                          key={status}
                          style={[
                            styles.statusButton,
                            selectedExpense.status === status && styles.statusButtonActive,
                          ]}
                          onPress={() => handleUpdateExpenseStatus(selectedExpense.id as string, status, selectedExpense.payment_status)}
                        >
                          <Text
                            style={[
                              styles.statusButtonText,
                              selectedExpense.status === status && styles.statusButtonTextActive,
                            ]}
                          >
                            {statusLabel(status)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <Text style={styles.statusChangeSubtitle}>Statut de paiement</Text>
                    <View style={styles.statusButtonRow}>
                      {['unpaid', 'partial', 'paid'].map((paymentStatus) => (
                        <TouchableOpacity
                          key={paymentStatus}
                          style={[
                            styles.statusButton,
                            selectedExpense.payment_status === paymentStatus && styles.statusButtonActive,
                          ]}
                          onPress={() =>
                            handleUpdateExpenseStatus(selectedExpense.id as string, selectedExpense.status || 'submitted', paymentStatus)
                          }
                        >
                          <Text
                            style={[
                              styles.statusButtonText,
                              selectedExpense.payment_status === paymentStatus && styles.statusButtonTextActive,
                            ]}
                          >
                            {paymentLabel(paymentStatus)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
    </GlassLayout>
  );
};

const formatCurrency = (amount: number, currency?: string) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency || 'EUR',
    minimumFractionDigits: 2,
  }).format(amount);

const formatDate = (date?: string) => {
  if (!date) return '—';
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(date));
  } catch {
    return date;
  }
};

const statusLabel = (status?: string) => {
  switch (status) {
    case 'submitted':
      return 'Soumise';
    case 'approved':
      return 'Approuvée';
    case 'rejected':
      return 'Rejetée';
    case 'paid':
      return 'Payée';
    case 'draft':
      return 'Brouillon';
    default:
      return 'Statut';
  }
};

const paymentLabel = (status?: string) => {
  switch (status) {
    case 'unpaid':
      return 'Non payé';
    case 'partial':
      return 'Partiellement payé';
    case 'paid':
      return 'Payé';
    default:
      return 'Paiement';
  }
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  content: { padding: 20, paddingBottom: 60 },
  title: { fontSize: 28, fontWeight: '700', color: '#0F172A', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#475569', marginBottom: 20, lineHeight: 20 },
  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 18 },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 10,
    elevation: 2,
  },
  summaryPrimary: { backgroundColor: '#1E293B' },
  summaryLabel: { fontSize: 13, textTransform: 'uppercase', color: '#94A3B8', letterSpacing: 0.8, marginTop: 18 },
  summaryValue: { fontSize: 26, fontWeight: '700', color: '#FFFFFF', marginTop: 6 },
  summaryValueSecondary: { fontSize: 26, fontWeight: '700', color: '#1E293B', marginTop: 12 },
  summaryHint: { fontSize: 12, color: '#CBD5F5', marginTop: 8 },
  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 15,
    color: '#0F172A',
  },
  newButton: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
  },
  newButtonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
  filterRow: { flexDirection: 'row', marginBottom: 12 },
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
  filterChipSecondary: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#E0E7FF',
    marginRight: 10,
  },
  filterChipSecondaryActive: { backgroundColor: '#1D4ED8' },
  filterChipTextSecondary: { color: '#3730A3', fontWeight: '500' },
  filterChipTextSecondaryActive: { color: '#FFFFFF' },
  loadingContainer: { paddingVertical: 32 },
  emptyState: { backgroundColor: '#E2E8F0', padding: 22, borderRadius: 18, alignItems: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#0F172A', marginBottom: 4 },
  emptySubtitle: { fontSize: 14, color: '#475569', textAlign: 'center' },
  expenseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 8,
    elevation: 1,
  },
  expenseHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  expenseIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  expenseTitle: { fontSize: 16, fontWeight: '600', color: '#0F172A' },
  expenseSubtitle: { fontSize: 13, color: '#64748B', marginTop: 2 },
  expenseAmount: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  expenseMetaRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  tag: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 },
  tagText: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },
  tagNeutral: { backgroundColor: '#EEF2FF', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 },
  expenseNote: { marginTop: 10, fontSize: 13, color: '#475569' },
  status_submitted: { backgroundColor: '#FFF4E6' },
  status_approved: { backgroundColor: '#DCFCE7' },
  status_paid: { backgroundColor: '#DEF7EC' },
  status_rejected: { backgroundColor: '#FEE2E2' },
  status_draft: { backgroundColor: '#E2E8F0' },
  payment_unpaid: { backgroundColor: '#FEE2E2' },
  payment_partial: { backgroundColor: '#FEF3C7' },
  payment_paid: { backgroundColor: '#DCFCE7' },
  modalBackdrop: { flex: 1, backgroundColor: '#0F172A90', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, maxHeight: '85%' },
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
  modalChipRow: { marginBottom: 12 },
  modalChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#E2E8F0',
    marginRight: 8,
  },
  modalChipActive: { backgroundColor: '#0F172A' },
  modalChipText: { fontSize: 13, color: '#475569' },
  modalChipTextActive: { color: '#FFFFFF', fontWeight: '600' },
  modalRow: { flexDirection: 'row', marginBottom: 4 },
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
  detailRow: {
    flexDirection: 'row',
    gap: 16,
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
  detailLink: {
    color: '#2563EB',
    textDecorationLine: 'underline',
  },
  detailAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  statusChangeSection: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  statusChangeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 16,
  },
  statusChangeSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 10,
    marginTop: 12,
  },
  statusButtonRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  statusButton: {
    flex: 1,
    minWidth: 90,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  statusButtonActive: {
    backgroundColor: '#0F172A',
  },
  statusButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  statusButtonTextActive: {
    color: '#FFFFFF',
  },
});

export default ExpensesScreen;
