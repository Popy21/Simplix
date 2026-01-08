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
  Switch,
  Platform,
} from 'react-native';
import { remindersService, invoicesService } from '../services/api';
import GlassLayout from '../components/GlassLayout';
import { GlassEmptyState, GlassLoadingState } from '../components/ui';

interface OverdueInvoice {
  id: string;
  invoice_number: string;
  contact_name: string;
  total_amount: number;
  due_date: string;
  days_overdue: number;
  reminder_count: number;
  last_reminder?: string;
}

interface ReminderHistory {
  id: string;
  invoice_id: string;
  invoice_number: string;
  contact_name: string;
  sent_at: string;
  type: 'email' | 'sms';
  status: 'sent' | 'failed' | 'opened';
}

interface ReminderSettings {
  enabled: boolean;
  first_reminder_days: number;
  second_reminder_days: number;
  third_reminder_days: number;
  email_subject: string;
  email_template: string;
}

const RemindersScreen = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overdue' | 'history' | 'settings'>('overdue');
  const [overdueInvoices, setOverdueInvoices] = useState<OverdueInvoice[]>([]);
  const [history, setHistory] = useState<ReminderHistory[]>([]);
  const [settings, setSettings] = useState<ReminderSettings>({
    enabled: true,
    first_reminder_days: 3,
    second_reminder_days: 7,
    third_reminder_days: 14,
    email_subject: 'Rappel: Facture {invoice_number} en attente',
    email_template: 'Bonjour,\n\nNous vous rappelons que la facture {invoice_number} d\'un montant de {amount} est en attente de paiement depuis le {due_date}.\n\nMerci de procéder au règlement dans les meilleurs délais.',
  });
  const [sendModalVisible, setSendModalVisible] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<OverdueInvoice | null>(null);
  const [customMessage, setCustomMessage] = useState('');
  const [stats, setStats] = useState({ overdue: 0, totalAmount: 0, sentThisMonth: 0 });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      if (activeTab === 'overdue') {
        const { data } = await remindersService.getOverdueInvoices();
        const invoices = data.data || data || [];
        setOverdueInvoices(invoices);
        setStats({
          overdue: invoices.length,
          totalAmount: invoices.reduce((s: number, i: OverdueInvoice) => s + i.total_amount, 0),
          sentThisMonth: invoices.reduce((s: number, i: OverdueInvoice) => s + (i.reminder_count || 0), 0),
        });
      } else if (activeTab === 'history') {
        const { data } = await remindersService.getHistory({ limit: 50 });
        setHistory(data.data || data || []);
      } else if (activeTab === 'settings') {
        const { data } = await remindersService.getSettings();
        if (data) setSettings(data);
      }
    } catch (error) {
      console.error('Failed to load data', error);
      // Mock data
      if (activeTab === 'overdue') {
        setOverdueInvoices([
          { id: '1', invoice_number: 'FAC-2024-021', contact_name: 'Dupont SARL', total_amount: 2500, due_date: '2024-01-05', days_overdue: 10, reminder_count: 1, last_reminder: '2024-01-08' },
          { id: '2', invoice_number: 'FAC-2024-019', contact_name: 'Martin & Co', total_amount: 1800, due_date: '2024-01-02', days_overdue: 13, reminder_count: 2 },
          { id: '3', invoice_number: 'FAC-2024-015', contact_name: 'Tech Solutions', total_amount: 4200, due_date: '2023-12-28', days_overdue: 18, reminder_count: 0 },
        ]);
        setStats({ overdue: 3, totalAmount: 8500, sentThisMonth: 3 });
      } else if (activeTab === 'history') {
        setHistory([
          { id: '1', invoice_id: '1', invoice_number: 'FAC-2024-021', contact_name: 'Dupont SARL', sent_at: '2024-01-08T10:30:00', type: 'email', status: 'opened' },
          { id: '2', invoice_id: '2', invoice_number: 'FAC-2024-019', contact_name: 'Martin & Co', sent_at: '2024-01-05T14:00:00', type: 'email', status: 'sent' },
        ]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleSendReminder = async () => {
    if (!selectedInvoice) return;

    try {
      await remindersService.sendManual(selectedInvoice.id, { message: customMessage || undefined });
      Alert.alert('Succès', 'Relance envoyée par email.');
      setSendModalVisible(false);
      setCustomMessage('');
      loadData();
    } catch (error) {
      console.error('Failed to send reminder', error);
      Alert.alert('Erreur', 'Impossible d\'envoyer la relance.');
    }
  };

  const handleSaveSettings = async () => {
    try {
      await remindersService.updateSettings(settings);
      Alert.alert('Succès', 'Paramètres de relance mis à jour.');
    } catch (error) {
      console.error('Failed to save settings', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder les paramètres.');
    }
  };

  const openSendModal = (invoice: OverdueInvoice) => {
    setSelectedInvoice(invoice);
    setSendModalVisible(true);
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);

  const formatDate = (date: string) =>
    new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(date));

  const getUrgencyColor = (days: number) => {
    if (days > 30) return '#EF4444';
    if (days > 14) return '#F59E0B';
    return '#0EA5E9';
  };

  const renderOverdueInvoice = ({ item }: { item: OverdueInvoice }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.urgencyIndicator, { backgroundColor: getUrgencyColor(item.days_overdue) }]} />
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle}>{item.invoice_number}</Text>
          <Text style={styles.cardSubtitle}>{item.contact_name}</Text>
        </View>
        <View style={styles.cardRight}>
          <Text style={styles.cardAmount}>{formatCurrency(item.total_amount)}</Text>
          <Text style={[styles.cardDays, { color: getUrgencyColor(item.days_overdue) }]}>
            {item.days_overdue}j de retard
          </Text>
        </View>
      </View>
      <View style={styles.cardFooter}>
        <View style={styles.reminderInfo}>
          <Text style={styles.reminderCount}>{item.reminder_count} relance(s)</Text>
          {item.last_reminder && (
            <Text style={styles.lastReminder}>Dernière: {formatDate(item.last_reminder)}</Text>
          )}
        </View>
        <TouchableOpacity style={styles.sendButton} onPress={() => openSendModal(item)}>
          <Text style={styles.sendButtonText}>Relancer</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderHistoryItem = ({ item }: { item: ReminderHistory }) => (
    <View style={styles.historyCard}>
      <View style={styles.historyIcon}>
        <Text style={styles.historyIconText}>{item.type === 'email' ? '✉️' : '💬'}</Text>
      </View>
      <View style={styles.historyInfo}>
        <Text style={styles.historyTitle}>{item.invoice_number}</Text>
        <Text style={styles.historySubtitle}>{item.contact_name} · {formatDate(item.sent_at)}</Text>
      </View>
      <View style={[styles.statusBadge, { backgroundColor: item.status === 'opened' ? '#D1FAE5' : item.status === 'sent' ? '#E0F2FE' : '#FEE2E2' }]}>
        <Text style={[styles.statusText, { color: item.status === 'opened' ? '#10B981' : item.status === 'sent' ? '#0EA5E9' : '#EF4444' }]}>
          {item.status === 'opened' ? 'Lu' : item.status === 'sent' ? 'Envoyé' : 'Échec'}
        </Text>
      </View>
    </View>
  );

  const renderSettings = () => (
    <View style={styles.settingsContainer}>
      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>Relances automatiques</Text>
          <Text style={styles.settingHint}>Envoyer des relances automatiquement</Text>
        </View>
        <Switch
          value={settings.enabled}
          onValueChange={(value) => setSettings({ ...settings, enabled: value })}
          trackColor={{ false: '#E2E8F0', true: '#10B981' }}
        />
      </View>

      <Text style={styles.sectionTitle}>Calendrier de relance</Text>

      <View style={styles.delayRow}>
        <Text style={styles.delayLabel}>1ère relance après</Text>
        <View style={styles.delayInput}>
          <TextInput
            style={styles.delayValue}
            keyboardType="numeric"
            value={String(settings.first_reminder_days)}
            onChangeText={(text) => setSettings({ ...settings, first_reminder_days: parseInt(text) || 0 })}
          />
          <Text style={styles.delayUnit}>jours</Text>
        </View>
      </View>

      <View style={styles.delayRow}>
        <Text style={styles.delayLabel}>2ème relance après</Text>
        <View style={styles.delayInput}>
          <TextInput
            style={styles.delayValue}
            keyboardType="numeric"
            value={String(settings.second_reminder_days)}
            onChangeText={(text) => setSettings({ ...settings, second_reminder_days: parseInt(text) || 0 })}
          />
          <Text style={styles.delayUnit}>jours</Text>
        </View>
      </View>

      <View style={styles.delayRow}>
        <Text style={styles.delayLabel}>3ème relance après</Text>
        <View style={styles.delayInput}>
          <TextInput
            style={styles.delayValue}
            keyboardType="numeric"
            value={String(settings.third_reminder_days)}
            onChangeText={(text) => setSettings({ ...settings, third_reminder_days: parseInt(text) || 0 })}
          />
          <Text style={styles.delayUnit}>jours</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Modèle d'email</Text>

      <Text style={styles.inputLabel}>Objet</Text>
      <TextInput
        style={styles.textInput}
        value={settings.email_subject}
        onChangeText={(text) => setSettings({ ...settings, email_subject: text })}
      />

      <Text style={styles.inputLabel}>Corps du message</Text>
      <TextInput
        style={[styles.textInput, { height: 120 }]}
        value={settings.email_template}
        onChangeText={(text) => setSettings({ ...settings, email_template: text })}
        multiline
      />

      <Text style={styles.variablesHint}>
        Variables: {'{invoice_number}'}, {'{amount}'}, {'{due_date}'}, {'{contact_name}'}
      </Text>

      <TouchableOpacity style={styles.saveButton} onPress={handleSaveSettings}>
        <Text style={styles.saveButtonText}>Enregistrer les paramètres</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <GlassLayout>
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.title}>Relances</Text>
        <Text style={styles.subtitle}>
          Gérez les relances de paiement de vos factures
        </Text>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, styles.statPrimary]}>
            <Text style={styles.statLabel}>Factures en retard</Text>
            <Text style={styles.statValue}>{stats.overdue}</Text>
            <Text style={styles.statHint}>{formatCurrency(stats.totalAmount)}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statLabel, { color: '#64748B' }]}>Relances ce mois</Text>
            <Text style={[styles.statValue, { color: '#0EA5E9' }]}>{stats.sentThisMonth}</Text>
            <Text style={[styles.statHint, { color: '#94A3B8' }]}>envoyées</Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabRow}>
          {[
            { key: 'overdue', label: 'En retard' },
            { key: 'history', label: 'Historique' },
            { key: 'settings', label: 'Paramètres' },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key as typeof activeTab)}
            >
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content */}
        {loading ? (
          <GlassLoadingState message="Chargement..." />
        ) : activeTab === 'overdue' ? (
          overdueInvoices.length === 0 ? (
            <GlassEmptyState
              icon="check-circle"
              title="Aucune facture en retard"
              description="Toutes vos factures sont à jour. Bravo !"
            />
          ) : (
            <FlatList
              data={overdueInvoices}
              renderItem={renderOverdueInvoice}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          )
        ) : activeTab === 'history' ? (
          history.length === 0 ? (
            <GlassEmptyState
              icon="mail"
              title="Aucune relance envoyée"
              description="L'historique de vos relances apparaîtra ici."
            />
          ) : (
            <FlatList
              data={history}
              renderItem={renderHistoryItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          )
        ) : (
          renderSettings()
        )}
      </ScrollView>

      {/* Send Modal */}
      <Modal visible={sendModalVisible} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            {selectedInvoice && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Envoyer une relance</Text>
                  <TouchableOpacity onPress={() => setSendModalVisible(false)}>
                    <Text style={styles.modalClose}>✕</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.invoicePreview}>
                  <Text style={styles.previewNumber}>{selectedInvoice.invoice_number}</Text>
                  <Text style={styles.previewClient}>{selectedInvoice.contact_name}</Text>
                  <Text style={styles.previewAmount}>{formatCurrency(selectedInvoice.total_amount)}</Text>
                </View>

                <Text style={styles.modalLabel}>Message personnalisé (optionnel)</Text>
                <TextInput
                  style={[styles.modalInput, { height: 100 }]}
                  value={customMessage}
                  onChangeText={setCustomMessage}
                  placeholder="Ajoutez un message personnalisé..."
                  multiline
                />

                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.cancelButton} onPress={() => setSendModalVisible(false)}>
                    <Text style={styles.cancelButtonText}>Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.submitButton} onPress={handleSendReminder}>
                    <Text style={styles.submitButtonText}>Envoyer la relance</Text>
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

  tabRow: { flexDirection: 'row', backgroundColor: '#E2E8F0', borderRadius: 12, padding: 4, marginBottom: 20 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  tabActive: { backgroundColor: '#FFFFFF' },
  tabText: { fontSize: 14, fontWeight: '500', color: '#64748B' },
  tabTextActive: { color: '#0F172A' },

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
  urgencyIndicator: { width: 4, height: 40, borderRadius: 2, marginRight: 12 },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#0F172A' },
  cardSubtitle: { fontSize: 13, color: '#64748B', marginTop: 2 },
  cardRight: { alignItems: 'flex-end' },
  cardAmount: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  cardDays: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reminderInfo: {},
  reminderCount: { fontSize: 12, color: '#64748B' },
  lastReminder: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  sendButton: { backgroundColor: '#0F172A', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  sendButtonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 13 },

  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  historyIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  historyIconText: { fontSize: 18 },
  historyInfo: { flex: 1 },
  historyTitle: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
  historySubtitle: { fontSize: 12, color: '#64748B', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontSize: 11, fontWeight: '600' },

  settingsContainer: {},
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 20 },
  settingInfo: { flex: 1 },
  settingLabel: { fontSize: 15, fontWeight: '600', color: '#0F172A' },
  settingHint: { fontSize: 12, color: '#64748B', marginTop: 2 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#64748B', marginBottom: 12, marginTop: 8 },
  delayRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginBottom: 8 },
  delayLabel: { fontSize: 14, color: '#0F172A' },
  delayInput: { flexDirection: 'row', alignItems: 'center' },
  delayValue: { backgroundColor: '#F1F5F9', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, width: 50, textAlign: 'center', fontSize: 15, fontWeight: '600', color: '#0F172A' },
  delayUnit: { fontSize: 14, color: '#64748B', marginLeft: 8 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#64748B', marginBottom: 8, marginTop: 16 },
  textInput: { backgroundColor: '#FFFFFF', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: '#0F172A' },
  variablesHint: { fontSize: 11, color: '#94A3B8', marginTop: 8, fontStyle: 'italic' },
  saveButton: { backgroundColor: '#0F172A', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 24 },
  saveButtonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 15 },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#0F172A' },
  modalClose: { fontSize: 24, color: '#64748B' },
  invoicePreview: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 20 },
  previewNumber: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  previewClient: { fontSize: 14, color: '#64748B', marginTop: 4 },
  previewAmount: { fontSize: 20, fontWeight: '700', color: '#EF4444', marginTop: 8 },
  modalLabel: { fontSize: 13, fontWeight: '600', color: '#64748B', marginBottom: 8 },
  modalInput: { backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: '#0F172A' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 24 },
  cancelButton: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, backgroundColor: '#E2E8F0' },
  cancelButtonText: { color: '#64748B', fontWeight: '600' },
  submitButton: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, backgroundColor: '#0F172A' },
  submitButtonText: { color: '#FFFFFF', fontWeight: '600' },
});

export default RemindersScreen;
