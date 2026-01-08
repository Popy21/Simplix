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
  FlatList,
  Platform,
} from 'react-native';
import { bankReconciliationService, invoicesService, expenseService } from '../services/api';
import GlassLayout from '../components/GlassLayout';
import { GlassEmptyState, GlassLoadingState } from '../components/ui';

interface BankTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'credit' | 'debit';
  status: 'pending' | 'matched' | 'ignored';
  matched_invoice_id?: string;
  matched_expense_id?: string;
  matched_payment_id?: string;
  invoice_number?: string;
  expense_description?: string;
}

interface Suggestion {
  type: 'invoice' | 'expense' | 'payment';
  id: string;
  label: string;
  amount: number;
  confidence: number;
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'À rapprocher', color: '#F59E0B', bg: '#FEF3C7' },
  matched: { label: 'Rapproché', color: '#10B981', bg: '#D1FAE5' },
  ignored: { label: 'Ignoré', color: '#64748B', bg: '#F1F5F9' },
};

const BankReconciliationScreen = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [matchModalVisible, setMatchModalVisible] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<BankTransaction | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, matched: 0, unmatched_amount: 0 });

  const loadTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      const { data } = await bankReconciliationService.getTransactions(params);
      const items = data.data || data || [];
      setTransactions(items);

      // Load stats
      const statsRes = await bankReconciliationService.getStats();
      if (statsRes.data) {
        setStats(statsRes.data);
      } else {
        setStats({
          total: items.length,
          pending: items.filter((t: BankTransaction) => t.status === 'pending').length,
          matched: items.filter((t: BankTransaction) => t.status === 'matched').length,
          unmatched_amount: items
            .filter((t: BankTransaction) => t.status === 'pending')
            .reduce((s: number, t: BankTransaction) => s + Math.abs(t.amount), 0),
        });
      }
    } catch (error) {
      console.error('Failed to load transactions', error);
      // Mock data for demo
      setTransactions([
        { id: '1', date: '2024-01-15', description: 'VIR CLIENT DUPONT', amount: 1500, type: 'credit', status: 'pending' },
        { id: '2', date: '2024-01-14', description: 'PRELEVEMENT EDF', amount: -250, type: 'debit', status: 'pending' },
        { id: '3', date: '2024-01-13', description: 'VIR MARTIN SARL', amount: 3200, type: 'credit', status: 'matched', invoice_number: 'FAC-2024-001' },
      ]);
      setStats({ total: 3, pending: 2, matched: 1, unmatched_amount: 1750 });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const onRefresh = () => {
    setRefreshing(true);
    loadTransactions();
  };

  const handleTransactionClick = async (transaction: BankTransaction) => {
    if (transaction.status === 'matched') {
      Alert.alert(
        'Transaction rapprochée',
        `Cette transaction est liée à: ${transaction.invoice_number || transaction.expense_description || 'Paiement'}`
      );
      return;
    }

    setSelectedTransaction(transaction);
    try {
      const { data } = await bankReconciliationService.getSuggestions(transaction.id);
      setSuggestions(data.suggestions || data || []);
    } catch (error) {
      // Mock suggestions
      if (transaction.amount > 0) {
        setSuggestions([
          { type: 'invoice', id: '1', label: 'FAC-2024-015 - Client ABC', amount: transaction.amount, confidence: 95 },
          { type: 'invoice', id: '2', label: 'FAC-2024-012 - Client XYZ', amount: transaction.amount * 0.9, confidence: 70 },
        ]);
      } else {
        setSuggestions([
          { type: 'expense', id: '1', label: 'Fournisseur EDF', amount: Math.abs(transaction.amount), confidence: 90 },
        ]);
      }
    }
    setMatchModalVisible(true);
  };

  const handleMatch = async (suggestion: Suggestion) => {
    if (!selectedTransaction) return;

    try {
      const matchData: any = {};
      if (suggestion.type === 'invoice') matchData.invoice_id = suggestion.id;
      if (suggestion.type === 'expense') matchData.expense_id = suggestion.id;
      if (suggestion.type === 'payment') matchData.payment_id = suggestion.id;

      await bankReconciliationService.matchTransaction(selectedTransaction.id, matchData);
      Alert.alert('Succès', 'Transaction rapprochée.');
      setMatchModalVisible(false);
      loadTransactions();
    } catch (error) {
      console.error('Failed to match', error);
      Alert.alert('Erreur', 'Impossible de rapprocher la transaction.');
    }
  };

  const handleIgnore = async () => {
    if (!selectedTransaction) return;
    Alert.alert(
      'Ignorer cette transaction?',
      'Elle ne sera plus affichée dans les transactions à rapprocher.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Ignorer',
          onPress: async () => {
            // API call to ignore
            setMatchModalVisible(false);
            loadTransactions();
          },
        },
      ]
    );
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(Math.abs(amount));

  const formatDate = (date: string) =>
    new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(new Date(date));

  const filteredTransactions = transactions.filter((t) => {
    if (statusFilter === 'all') return true;
    return t.status === statusFilter;
  });

  const renderTransaction = ({ item }: { item: BankTransaction }) => {
    const config = statusConfig[item.status] || statusConfig.pending;
    const isCredit = item.amount > 0 || item.type === 'credit';

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => handleTransactionClick(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.cardIcon, { backgroundColor: isCredit ? '#D1FAE5' : '#FEE2E2' }]}>
            <Text style={[styles.cardIconText, { color: isCredit ? '#10B981' : '#EF4444' }]}>
              {isCredit ? '↓' : '↑'}
            </Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle} numberOfLines={1}>{item.description}</Text>
            <Text style={styles.cardSubtitle}>{formatDate(item.date)}</Text>
          </View>
          <Text style={[styles.cardAmount, { color: isCredit ? '#10B981' : '#EF4444' }]}>
            {isCredit ? '+' : '-'}{formatCurrency(item.amount)}
          </Text>
        </View>
        <View style={styles.cardFooter}>
          <View style={[styles.badge, { backgroundColor: config.bg }]}>
            <Text style={[styles.badgeText, { color: config.color }]}>{config.label}</Text>
          </View>
          {item.status === 'matched' && (
            <Text style={styles.matchedLabel}>→ {item.invoice_number || item.expense_description || 'Lié'}</Text>
          )}
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
        <Text style={styles.title}>Rapprochement bancaire</Text>
        <Text style={styles.subtitle}>
          Associez vos mouvements bancaires à vos factures et dépenses
        </Text>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, styles.statPrimary]}>
            <Text style={styles.statLabel}>À rapprocher</Text>
            <Text style={styles.statValue}>{stats.pending}</Text>
            <Text style={styles.statHint}>{formatCurrency(stats.unmatched_amount)}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statLabel, { color: '#64748B' }]}>Rapprochées</Text>
            <Text style={[styles.statValue, { color: '#10B981' }]}>{stats.matched}</Text>
            <Text style={[styles.statHint, { color: '#94A3B8' }]}>ce mois</Text>
          </View>
        </View>

        {/* Import Button */}
        <TouchableOpacity
          style={styles.importButton}
          onPress={() => Alert.alert('Import', 'Importez un relevé CSV depuis votre banque.')}
        >
          <Text style={styles.importButtonText}>📄 Importer un relevé bancaire</Text>
        </TouchableOpacity>

        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          {[
            { key: 'pending', label: 'À rapprocher' },
            { key: 'matched', label: 'Rapprochées' },
            { key: 'all', label: 'Toutes' },
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
          <GlassLoadingState message="Chargement des transactions..." />
        ) : filteredTransactions.length === 0 ? (
          <GlassEmptyState
            icon="credit-card"
            title="Aucune transaction"
            description="Importez un relevé bancaire pour commencer le rapprochement."
            actionLabel="Importer"
            onAction={() => Alert.alert('Import', 'Importez un relevé CSV.')}
          />
        ) : (
          <FlatList
            data={filteredTransactions}
            renderItem={renderTransaction}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
          />
        )}
      </ScrollView>

      {/* Match Modal */}
      <Modal visible={matchModalVisible} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            {selectedTransaction && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Rapprocher</Text>
                  <TouchableOpacity onPress={() => setMatchModalVisible(false)}>
                    <Text style={styles.modalClose}>✕</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.transactionPreview}>
                  <Text style={styles.previewDescription}>{selectedTransaction.description}</Text>
                  <Text style={[styles.previewAmount, { color: selectedTransaction.amount > 0 ? '#10B981' : '#EF4444' }]}>
                    {selectedTransaction.amount > 0 ? '+' : ''}{formatCurrency(selectedTransaction.amount)}
                  </Text>
                  <Text style={styles.previewDate}>{formatDate(selectedTransaction.date)}</Text>
                </View>

                <Text style={styles.suggestionsTitle}>Correspondances suggérées</Text>

                {suggestions.length === 0 ? (
                  <Text style={styles.noSuggestions}>Aucune suggestion trouvée</Text>
                ) : (
                  suggestions.map((suggestion, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.suggestionCard}
                      onPress={() => handleMatch(suggestion)}
                    >
                      <View style={styles.suggestionInfo}>
                        <Text style={styles.suggestionLabel}>{suggestion.label}</Text>
                        <Text style={styles.suggestionAmount}>{formatCurrency(suggestion.amount)}</Text>
                      </View>
                      <View style={styles.confidenceBadge}>
                        <Text style={styles.confidenceText}>{suggestion.confidence}%</Text>
                      </View>
                    </TouchableOpacity>
                  ))
                )}

                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.ignoreButton} onPress={handleIgnore}>
                    <Text style={styles.ignoreButtonText}>Ignorer</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.manualButton}
                    onPress={() => Alert.alert('Manuel', 'Sélection manuelle en cours de développement.')}
                  >
                    <Text style={styles.manualButtonText}>Rapprochement manuel</Text>
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

  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statCard: {
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
  statPrimary: { backgroundColor: '#0F172A' },
  statLabel: { fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5 },
  statValue: { fontSize: 28, fontWeight: '700', color: '#FFFFFF', marginTop: 8 },
  statHint: { fontSize: 12, color: '#CBD5E1', marginTop: 4 },

  importButton: {
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#C7D2FE',
    borderStyle: 'dashed',
  },
  importButtonText: { fontSize: 15, fontWeight: '600', color: '#6366F1' },

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
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardIconText: { fontSize: 20, fontWeight: '700' },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#0F172A' },
  cardSubtitle: { fontSize: 12, color: '#64748B', marginTop: 2 },
  cardAmount: { fontSize: 16, fontWeight: '700' },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  matchedLabel: { fontSize: 12, color: '#10B981', fontStyle: 'italic' },

  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 11, fontWeight: '600' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#0F172A' },
  modalClose: { fontSize: 24, color: '#64748B' },

  transactionPreview: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  previewDescription: { fontSize: 15, fontWeight: '600', color: '#0F172A', textAlign: 'center' },
  previewAmount: { fontSize: 24, fontWeight: '700', marginTop: 8 },
  previewDate: { fontSize: 12, color: '#64748B', marginTop: 4 },

  suggestionsTitle: { fontSize: 14, fontWeight: '600', color: '#64748B', marginBottom: 12 },
  noSuggestions: { fontSize: 14, color: '#94A3B8', fontStyle: 'italic', textAlign: 'center', marginVertical: 20 },

  suggestionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  suggestionInfo: { flex: 1 },
  suggestionLabel: { fontSize: 14, fontWeight: '500', color: '#0F172A' },
  suggestionAmount: { fontSize: 12, color: '#64748B', marginTop: 2 },
  confidenceBadge: { backgroundColor: '#D1FAE5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  confidenceText: { fontSize: 12, fontWeight: '600', color: '#10B981' },

  modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  ignoreButton: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#E2E8F0', alignItems: 'center' },
  ignoreButtonText: { color: '#64748B', fontWeight: '600' },
  manualButton: { flex: 2, paddingVertical: 14, borderRadius: 12, backgroundColor: '#0F172A', alignItems: 'center' },
  manualButtonText: { color: '#FFFFFF', fontWeight: '600' },
});

export default BankReconciliationScreen;
