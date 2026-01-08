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
import { creditNotesService, invoicesService, contactService } from '../services/api';
import GlassLayout from '../components/GlassLayout';
import {
  GlassButton,
  GlassModal,
  GlassEmptyState,
  GlassLoadingState,
  GlassSearchBar,
  GlassKPICard,
  GlassBadge,
} from '../components/ui';

interface CreditNote {
  id: string;
  credit_note_number: string;
  invoice_id?: string;
  invoice_number?: string;
  contact_id: string;
  contact_name?: string;
  amount: number;
  reason: string;
  status: 'draft' | 'issued' | 'applied' | 'cancelled';
  issue_date: string;
  created_at: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  contact_name?: string;
  total_amount: number;
  status: string;
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: 'Brouillon', color: '#64748B', bg: '#F1F5F9' },
  issued: { label: 'Émis', color: '#0EA5E9', bg: '#E0F2FE' },
  applied: { label: 'Appliqué', color: '#10B981', bg: '#D1FAE5' },
  cancelled: { label: 'Annulé', color: '#EF4444', bg: '#FEE2E2' },
};

const CreditNotesScreen = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedNote, setSelectedNote] = useState<CreditNote | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [summary, setSummary] = useState({ total: 0, draft: 0, issued: 0, applied: 0, totalAmount: 0 });

  const [form, setForm] = useState({
    invoice_id: '',
    amount: '',
    reason: '',
  });

  const loadCreditNotes = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      const { data } = await creditNotesService.getAll(params);
      const notes = data.data || data || [];
      setCreditNotes(notes);

      // Calculate summary
      const totalAmount = notes.reduce((sum: number, n: CreditNote) => sum + (n.amount || 0), 0);
      setSummary({
        total: notes.length,
        draft: notes.filter((n: CreditNote) => n.status === 'draft').length,
        issued: notes.filter((n: CreditNote) => n.status === 'issued').length,
        applied: notes.filter((n: CreditNote) => n.status === 'applied').length,
        totalAmount,
      });
    } catch (error) {
      console.error('Failed to load credit notes', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter]);

  const loadInvoices = useCallback(async () => {
    try {
      const { data } = await invoicesService.getAll({ status: 'paid' });
      setInvoices(data.data || data || []);
    } catch (error) {
      console.error('Failed to load invoices', error);
    }
  }, []);

  useEffect(() => {
    loadCreditNotes();
    loadInvoices();
  }, [loadCreditNotes, loadInvoices]);

  const onRefresh = () => {
    setRefreshing(true);
    loadCreditNotes();
  };

  const handleCreate = async () => {
    if (!form.invoice_id || !form.amount) {
      Alert.alert('Erreur', 'Veuillez sélectionner une facture et saisir un montant.');
      return;
    }

    try {
      await creditNotesService.createFromInvoice(form.invoice_id, {
        amount: parseFloat(form.amount),
        reason: form.reason || 'Avoir sur facture',
      });
      setModalVisible(false);
      setForm({ invoice_id: '', amount: '', reason: '' });
      loadCreditNotes();
      Alert.alert('Succès', 'Avoir créé avec succès.');
    } catch (error) {
      console.error('Failed to create credit note', error);
      Alert.alert('Erreur', 'Impossible de créer l\'avoir.');
    }
  };

  const handleNoteClick = (note: CreditNote) => {
    setSelectedNote(note);
    setDetailModalVisible(true);
  };

  const filteredNotes = creditNotes.filter((note) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      note.credit_note_number?.toLowerCase().includes(searchLower) ||
      note.contact_name?.toLowerCase().includes(searchLower) ||
      note.invoice_number?.toLowerCase().includes(searchLower) ||
      note.reason?.toLowerCase().includes(searchLower)
    );
  });

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);

  const formatDate = (date: string) =>
    new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(date));

  const renderCreditNote = ({ item }: { item: CreditNote }) => {
    const config = statusConfig[item.status] || statusConfig.draft;
    return (
      <TouchableOpacity style={styles.card} onPress={() => handleNoteClick(item)} activeOpacity={0.7}>
        <View style={styles.cardHeader}>
          <View style={styles.cardIcon}>
            <Text style={styles.cardIconText}>AV</Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle}>{item.credit_note_number || 'Avoir'}</Text>
            <Text style={styles.cardSubtitle}>
              {item.contact_name || 'Client'} · {formatDate(item.issue_date || item.created_at)}
            </Text>
          </View>
          <Text style={styles.cardAmount}>{formatCurrency(item.amount)}</Text>
        </View>
        <View style={styles.cardFooter}>
          <View style={[styles.badge, { backgroundColor: config.bg }]}>
            <Text style={[styles.badgeText, { color: config.color }]}>{config.label}</Text>
          </View>
          {item.invoice_number && (
            <Text style={styles.cardMeta}>Facture: {item.invoice_number}</Text>
          )}
        </View>
        {item.reason && <Text style={styles.cardReason}>{item.reason}</Text>}
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
        <Text style={styles.title}>Avoirs</Text>
        <Text style={styles.subtitle}>
          Gérez vos avoirs et remboursements clients
        </Text>

        {/* KPIs */}
        <View style={styles.kpiRow}>
          <View style={[styles.kpiCard, styles.kpiPrimary]}>
            <Text style={styles.kpiLabel}>Total avoirs</Text>
            <Text style={styles.kpiValue}>{formatCurrency(summary.totalAmount)}</Text>
            <Text style={styles.kpiHint}>{summary.total} avoirs</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={[styles.kpiLabel, { color: '#64748B' }]}>En attente</Text>
            <Text style={[styles.kpiValue, { color: '#0F172A' }]}>{summary.draft + summary.issued}</Text>
            <Text style={[styles.kpiHint, { color: '#94A3B8' }]}>À appliquer</Text>
          </View>
        </View>

        {/* Search & Actions */}
        <View style={styles.actionRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un avoir..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
          />
          <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
            <Text style={styles.addButtonText}>+ Nouvel avoir</Text>
          </TouchableOpacity>
        </View>

        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          {[
            { key: 'all', label: 'Tous' },
            { key: 'draft', label: 'Brouillons' },
            { key: 'issued', label: 'Émis' },
            { key: 'applied', label: 'Appliqués' },
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
          <GlassLoadingState message="Chargement des avoirs..." />
        ) : filteredNotes.length === 0 ? (
          <GlassEmptyState
            icon="file-minus"
            title="Aucun avoir"
            description="Créez un avoir pour rembourser partiellement ou totalement une facture."
            actionLabel="Créer un avoir"
            onAction={() => setModalVisible(true)}
          />
        ) : (
          <FlatList
            data={filteredNotes}
            renderItem={renderCreditNote}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
          />
        )}
      </ScrollView>

      {/* Create Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nouvel avoir</Text>

            <Text style={styles.modalLabel}>Facture source *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {invoices.map((inv) => (
                <TouchableOpacity
                  key={inv.id}
                  style={[styles.chip, form.invoice_id === inv.id && styles.chipActive]}
                  onPress={() => setForm({ ...form, invoice_id: inv.id, amount: String(inv.total_amount) })}
                >
                  <Text style={[styles.chipText, form.invoice_id === inv.id && styles.chipTextActive]}>
                    {inv.invoice_number}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.modalLabel}>Montant de l'avoir *</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="numeric"
              value={form.amount}
              onChangeText={(text) => setForm({ ...form, amount: text })}
              placeholder="0.00"
            />

            <Text style={styles.modalLabel}>Motif</Text>
            <TextInput
              style={[styles.modalInput, { height: 80 }]}
              value={form.reason}
              onChangeText={(text) => setForm({ ...form, reason: text })}
              placeholder="Raison de l'avoir..."
              multiline
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitButton} onPress={handleCreate}>
                <Text style={styles.submitButtonText}>Créer l'avoir</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Detail Modal */}
      <Modal visible={detailModalVisible} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            {selectedNote && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{selectedNote.credit_note_number}</Text>
                  <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                    <Text style={styles.modalClose}>✕</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Montant</Text>
                  <Text style={styles.detailValue}>{formatCurrency(selectedNote.amount)}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Client</Text>
                  <Text style={styles.detailValue}>{selectedNote.contact_name || 'N/A'}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Facture liée</Text>
                  <Text style={styles.detailValue}>{selectedNote.invoice_number || 'N/A'}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Date d'émission</Text>
                  <Text style={styles.detailValue}>{formatDate(selectedNote.issue_date || selectedNote.created_at)}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Statut</Text>
                  <View style={[styles.badge, { backgroundColor: statusConfig[selectedNote.status]?.bg }]}>
                    <Text style={[styles.badgeText, { color: statusConfig[selectedNote.status]?.color }]}>
                      {statusConfig[selectedNote.status]?.label}
                    </Text>
                  </View>
                </View>

                {selectedNote.reason && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Motif</Text>
                    <Text style={styles.detailReason}>{selectedNote.reason}</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.pdfButton}
                  onPress={() => Alert.alert('PDF', 'Téléchargement du PDF...')}
                >
                  <Text style={styles.pdfButtonText}>Télécharger PDF</Text>
                </TouchableOpacity>
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
  kpiLabel: { fontSize: 12, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5 },
  kpiValue: { fontSize: 24, fontWeight: '700', color: '#FFFFFF', marginTop: 8 },
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
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardIconText: { fontSize: 14, fontWeight: '700', color: '#EF4444' },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#0F172A' },
  cardSubtitle: { fontSize: 13, color: '#64748B', marginTop: 2 },
  cardAmount: { fontSize: 16, fontWeight: '700', color: '#EF4444' },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardMeta: { fontSize: 12, color: '#94A3B8' },
  cardReason: { fontSize: 13, color: '#64748B', marginTop: 8, fontStyle: 'italic' },

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
  detailSection: { marginTop: 16 },
  detailReason: { fontSize: 14, color: '#475569', marginTop: 8, lineHeight: 20 },

  pdfButton: { backgroundColor: '#0F172A', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 24 },
  pdfButtonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 15 },
});

export default CreditNotesScreen;
