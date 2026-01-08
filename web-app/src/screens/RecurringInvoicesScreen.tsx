import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  FlatList,
  Platform,
} from 'react-native';
import { recurringInvoicesService, contactService, productService } from '../services/api';
import GlassLayout from '../components/GlassLayout';
import { GlassEmptyState, GlassLoadingState } from '../components/ui';

interface RecurringInvoice {
  id: string;
  name: string;
  contact_id: string;
  contact_name?: string;
  amount: number;
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  next_date: string;
  last_generated?: string;
  status: 'active' | 'paused' | 'cancelled';
  items?: any[];
  created_at: string;
}

const frequencyLabels: Record<string, string> = {
  weekly: 'Hebdomadaire',
  monthly: 'Mensuel',
  quarterly: 'Trimestriel',
  yearly: 'Annuel',
};

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: 'Actif', color: '#10B981', bg: '#D1FAE5' },
  paused: { label: 'En pause', color: '#F59E0B', bg: '#FEF3C7' },
  cancelled: { label: 'Annulé', color: '#EF4444', bg: '#FEE2E2' },
};

const RecurringInvoicesScreen = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [invoices, setInvoices] = useState<RecurringInvoice[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<RecurringInvoice | null>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [summary, setSummary] = useState({ total: 0, active: 0, paused: 0, monthlyRevenue: 0 });

  const [form, setForm] = useState({
    name: '',
    contact_id: '',
    amount: '',
    frequency: 'monthly',
  });

  const loadInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      const { data } = await recurringInvoicesService.getAll(params);
      const items = data.data || data || [];
      setInvoices(items);

      // Calculate summary
      const activeItems = items.filter((i: RecurringInvoice) => i.status === 'active');
      const monthlyRevenue = activeItems.reduce((sum: number, i: RecurringInvoice) => {
        const amount = i.amount || 0;
        switch (i.frequency) {
          case 'weekly': return sum + amount * 4;
          case 'monthly': return sum + amount;
          case 'quarterly': return sum + amount / 3;
          case 'yearly': return sum + amount / 12;
          default: return sum + amount;
        }
      }, 0);

      setSummary({
        total: items.length,
        active: activeItems.length,
        paused: items.filter((i: RecurringInvoice) => i.status === 'paused').length,
        monthlyRevenue,
      });
    } catch (error) {
      console.error('Failed to load recurring invoices', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter]);

  const loadContacts = useCallback(async () => {
    try {
      const { data } = await contactService.getAll({ limit: 100 });
      setContacts(data.data || data || []);
    } catch (error) {
      console.error('Failed to load contacts', error);
    }
  }, []);

  useEffect(() => {
    loadInvoices();
    loadContacts();
  }, [loadInvoices, loadContacts]);

  const onRefresh = () => {
    setRefreshing(true);
    loadInvoices();
  };

  const handleCreate = async () => {
    if (!form.contact_id || !form.amount || !form.name) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires.');
      return;
    }

    try {
      await recurringInvoicesService.create({
        name: form.name,
        contact_id: form.contact_id,
        amount: parseFloat(form.amount),
        frequency: form.frequency,
      });
      setModalVisible(false);
      setForm({ name: '', contact_id: '', amount: '', frequency: 'monthly' });
      loadInvoices();
      Alert.alert('Succès', 'Facture récurrente créée.');
    } catch (error) {
      console.error('Failed to create recurring invoice', error);
      Alert.alert('Erreur', 'Impossible de créer la facture récurrente.');
    }
  };

  const handlePauseResume = async (invoice: RecurringInvoice) => {
    try {
      if (invoice.status === 'active') {
        await recurringInvoicesService.pause(invoice.id);
        Alert.alert('Succès', 'Facture mise en pause.');
      } else {
        await recurringInvoicesService.resume(invoice.id);
        Alert.alert('Succès', 'Facture réactivée.');
      }
      loadInvoices();
      setDetailModalVisible(false);
    } catch (error) {
      console.error('Failed to update status', error);
      Alert.alert('Erreur', 'Impossible de modifier le statut.');
    }
  };

  const handleGenerateNow = async (invoice: RecurringInvoice) => {
    try {
      await recurringInvoicesService.generateNow(invoice.id);
      Alert.alert('Succès', 'Facture générée avec succès.');
      loadInvoices();
    } catch (error) {
      console.error('Failed to generate invoice', error);
      Alert.alert('Erreur', 'Impossible de générer la facture.');
    }
  };

  const filteredInvoices = invoices.filter((inv) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      inv.name?.toLowerCase().includes(searchLower) ||
      inv.contact_name?.toLowerCase().includes(searchLower)
    );
  });

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);

  const formatDate = (date: string) =>
    new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(date));

  const getDaysUntil = (date: string) => {
    const diff = Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return "Aujourd'hui";
    if (diff === 1) return 'Demain';
    if (diff < 0) return `Il y a ${Math.abs(diff)} jours`;
    return `Dans ${diff} jours`;
  };

  const renderInvoice = ({ item }: { item: RecurringInvoice }) => {
    const config = statusConfig[item.status] || statusConfig.active;
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => { setSelectedInvoice(item); setDetailModalVisible(true); }}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardIcon}>
            <Text style={styles.cardIconText}>↻</Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardSubtitle}>{item.contact_name || 'Client'}</Text>
          </View>
          <View style={styles.cardRight}>
            <Text style={styles.cardAmount}>{formatCurrency(item.amount)}</Text>
            <Text style={styles.cardFrequency}>{frequencyLabels[item.frequency]}</Text>
          </View>
        </View>
        <View style={styles.cardFooter}>
          <View style={[styles.badge, { backgroundColor: config.bg }]}>
            <Text style={[styles.badgeText, { color: config.color }]}>{config.label}</Text>
          </View>
          <Text style={styles.cardMeta}>
            Prochaine: {item.next_date ? getDaysUntil(item.next_date) : 'N/A'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <GlassLayout>
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.title}>Factures récurrentes</Text>
        <Text style={styles.subtitle}>
          Automatisez vos facturations régulières (abonnements, loyers, etc.)
        </Text>

        {/* KPIs */}
        <View style={styles.kpiRow}>
          <View style={[styles.kpiCard, styles.kpiPrimary]}>
            <Text style={styles.kpiLabel}>Revenu mensuel récurrent</Text>
            <Text style={styles.kpiValue}>{formatCurrency(summary.monthlyRevenue)}</Text>
            <Text style={styles.kpiHint}>{summary.active} actives</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={[styles.kpiLabel, { color: '#64748B' }]}>En pause</Text>
            <Text style={[styles.kpiValue, { color: '#F59E0B' }]}>{summary.paused}</Text>
            <Text style={[styles.kpiHint, { color: '#94A3B8' }]}>factures</Text>
          </View>
        </View>

        {/* Search & Actions */}
        <View style={styles.actionRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
          />
          <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
            <Text style={styles.addButtonText}>+ Nouvelle</Text>
          </TouchableOpacity>
        </View>

        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          {[
            { key: 'all', label: 'Toutes' },
            { key: 'active', label: 'Actives' },
            { key: 'paused', label: 'En pause' },
          ].map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, statusFilter === f.key && styles.filterChipActive]}
              onPress={() => setStatusFilter(f.key)}
            >
              <Text style={[styles.filterChipText, statusFilter === f.key && styles.filterChipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* List */}
        {loading ? (
          <GlassLoadingState message="Chargement..." />
        ) : filteredInvoices.length === 0 ? (
          <GlassEmptyState
            icon="repeat"
            title="Aucune facture récurrente"
            description="Créez des factures automatiques pour vos clients réguliers."
            actionLabel="Créer une récurrence"
            onAction={() => setModalVisible(true)}
          />
        ) : (
          <FlatList
            data={filteredInvoices}
            renderItem={renderInvoice}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
          />
        )}
      </ScrollView>

      {/* Create Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nouvelle facture récurrente</Text>

            <Text style={styles.modalLabel}>Nom *</Text>
            <TextInput
              style={styles.modalInput}
              value={form.name}
              onChangeText={(text) => setForm({ ...form, name: text })}
              placeholder="Ex: Abonnement mensuel"
            />

            <Text style={styles.modalLabel}>Client *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {contacts.slice(0, 10).map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.chip, form.contact_id === c.id && styles.chipActive]}
                  onPress={() => setForm({ ...form, contact_id: c.id })}
                >
                  <Text style={[styles.chipText, form.contact_id === c.id && styles.chipTextActive]}>
                    {c.first_name} {c.last_name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.modalLabel}>Montant HT *</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="numeric"
              value={form.amount}
              onChangeText={(text) => setForm({ ...form, amount: text })}
              placeholder="0.00"
            />

            <Text style={styles.modalLabel}>Fréquence</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {Object.entries(frequencyLabels).map(([key, label]) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.chip, form.frequency === key && styles.chipActive]}
                  onPress={() => setForm({ ...form, frequency: key })}
                >
                  <Text style={[styles.chipText, form.frequency === key && styles.chipTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitButton} onPress={handleCreate}>
                <Text style={styles.submitButtonText}>Créer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Detail Modal */}
      <Modal visible={detailModalVisible} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            {selectedInvoice && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{selectedInvoice.name}</Text>
                  <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                    <Text style={styles.modalClose}>✕</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Montant</Text>
                  <Text style={styles.detailValue}>{formatCurrency(selectedInvoice.amount)}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Fréquence</Text>
                  <Text style={styles.detailValue}>{frequencyLabels[selectedInvoice.frequency]}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Client</Text>
                  <Text style={styles.detailValue}>{selectedInvoice.contact_name || 'N/A'}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Prochaine échéance</Text>
                  <Text style={styles.detailValue}>
                    {selectedInvoice.next_date ? formatDate(selectedInvoice.next_date) : 'N/A'}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Statut</Text>
                  <View style={[styles.badge, { backgroundColor: statusConfig[selectedInvoice.status]?.bg }]}>
                    <Text style={[styles.badgeText, { color: statusConfig[selectedInvoice.status]?.color }]}>
                      {statusConfig[selectedInvoice.status]?.label}
                    </Text>
                  </View>
                </View>

                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: '#10B981' }]}
                    onPress={() => handleGenerateNow(selectedInvoice)}
                  >
                    <Text style={styles.actionButtonText}>Générer maintenant</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: selectedInvoice.status === 'active' ? '#F59E0B' : '#0EA5E9' }]}
                    onPress={() => handlePauseResume(selectedInvoice)}
                  >
                    <Text style={styles.actionButtonText}>
                      {selectedInvoice.status === 'active' ? 'Mettre en pause' : 'Réactiver'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </GlassLayout>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: '700', color: '#0F172A', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#64748B', marginBottom: 20 },

  kpiRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  kpiCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  kpiPrimary: { backgroundColor: '#0F172A' },
  kpiLabel: { fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5 },
  kpiValue: { fontSize: 22, fontWeight: '700', color: '#FFFFFF', marginTop: 8 },
  kpiHint: { fontSize: 12, color: '#CBD5E1', marginTop: 4 },

  actionRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  searchInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 15,
    color: '#0F172A',
  },
  addButton: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  addButtonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },

  filterRow: { marginBottom: 16 },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#E2E8F0',
    marginRight: 8,
  },
  filterChipActive: { backgroundColor: '#0F172A' },
  filterChipText: { color: '#64748B', fontWeight: '500' },
  filterChipTextActive: { color: '#FFFFFF' },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 6,
    elevation: 1,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardIconText: { fontSize: 20, color: '#6366F1' },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#0F172A' },
  cardSubtitle: { fontSize: 13, color: '#64748B', marginTop: 2 },
  cardRight: { alignItems: 'flex-end' },
  cardAmount: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  cardFrequency: { fontSize: 11, color: '#64748B', marginTop: 2 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardMeta: { fontSize: 12, color: '#94A3B8' },

  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 11, fontWeight: '600' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#0F172A' },
  modalClose: { fontSize: 24, color: '#64748B' },
  modalLabel: { fontSize: 13, fontWeight: '600', color: '#64748B', marginBottom: 8, marginTop: 16 },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0F172A',
  },

  chipRow: { marginBottom: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#E2E8F0',
    marginRight: 8,
  },
  chipActive: { backgroundColor: '#0F172A' },
  chipText: { fontSize: 13, color: '#64748B' },
  chipTextActive: { color: '#FFFFFF', fontWeight: '600' },

  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 24 },
  cancelButton: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, backgroundColor: '#E2E8F0' },
  cancelButtonText: { color: '#64748B', fontWeight: '600' },
  submitButton: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, backgroundColor: '#0F172A' },
  submitButtonText: { color: '#FFFFFF', fontWeight: '600' },

  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  detailLabel: { fontSize: 13, color: '#64748B' },
  detailValue: { fontSize: 15, fontWeight: '600', color: '#0F172A' },

  actionButtons: { marginTop: 24, gap: 12 },
  actionButton: { borderRadius: 12, padding: 14, alignItems: 'center' },
  actionButtonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 15 },
});

export default RecurringInvoicesScreen;
