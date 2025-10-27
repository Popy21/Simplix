import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert, Platform, RefreshControl } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { FileTextIcon, DollarIcon, CheckCircleIcon, ClockIcon, AlertTriangleIcon, EditIcon, TrashIcon, MailIcon, PlusIcon } from '../components/Icons';
import Navigation from '../components/Navigation';
import { quotesService, invoicesService, paymentsService, templatesService } from '../services/api';

type InvoicesScreenProps = { navigation: NativeStackNavigationProp<RootStackParamList, 'Invoices'>; };
type TabType = 'quotes' | 'invoices';

export default function InvoicesScreen({ navigation }: InvoicesScreenProps) {
  const [activeTab, setActiveTab] = useState<TabType>('quotes');
  const [quotes, setQuotes] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'apple_pay' | 'google_pay' | 'bank_transfer'>('card');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [hasTemplates, setHasTemplates] = useState(true);
  const [checkingTemplates, setCheckingTemplates] = useState(true);

  useEffect(() => {
    checkTemplates();
    fetchData();
  }, [activeTab]);

  const checkTemplates = async () => {
    try {
      const res = await templatesService.getAll();
      setHasTemplates(res.data && res.data.length > 0);
    } catch (error) {
      console.error('Error checking templates:', error);
    } finally {
      setCheckingTemplates(false);
    }
  };

  const fetchData = async () => {
    try {
      if (activeTab === 'quotes') {
        const res = await quotesService.getAll();
        setQuotes(res.data || []);
      } else {
        const res = await invoicesService.getAll();
        setInvoices(res.data || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const handleConvertToInvoice = async (quoteId: string) => {
    try {
      await quotesService.convertToInvoice(quoteId);
      Platform.OS === 'web' ? alert('Devis converti en facture avec succès') : Alert.alert('Succès', 'Devis converti en facture');
      fetchData();
      setDetailModalVisible(false);
    } catch (error) {
      console.error('Error converting quote:', error);
    }
  };

  const handleSendReminder = async (invoiceId: string) => {
    try {
      await invoicesService.sendReminder(invoiceId);
      Platform.OS === 'web' ? alert('Relance envoyée avec succès') : Alert.alert('Succès', 'Relance envoyée');
    } catch (error) {
      console.error('Error sending reminder:', error);
    }
  };

  const handlePayment = async () => {
    if (!selectedItem || !paymentAmount) return;
    try {
      const paymentData = {
        invoice_id: selectedItem.id,
        amount: parseFloat(paymentAmount),
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: paymentMethod,
        reference: 'PAY-' + Date.now(),
      };
      await paymentsService.create(paymentData);
      setPaymentModalVisible(false);
      setDetailModalVisible(false);
      Platform.OS === 'web' ? alert('Paiement enregistré avec succès') : Alert.alert('Succès', 'Paiement enregistré');
      fetchData();
    } catch (error) {
      console.error('Error processing payment:', error);
    }
  };

  const renderQuoteCard = (quote: any) => (
    <TouchableOpacity key={quote.id} style={styles.card} onPress={() => { setSelectedItem(quote); setDetailModalVisible(true); }}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardNumber}>{quote.quote_number || `DEVIS-${String(quote.id).padStart(6, '0')}`}</Text>
          <Text style={styles.cardCustomer}>{quote.customer_name || 'Client inconnu'}</Text>
          <Text style={styles.cardDate}>{new Date(quote.created_at).toLocaleDateString('fr-FR')}</Text>
        </View>
        <View>
          <Text style={styles.cardAmount}>{quote.total_amount ? `${parseFloat(quote.total_amount).toFixed(2)} €` : '-'}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(quote.status) }]}>
            <Text style={styles.statusText}>{getStatusLabel(quote.status)}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderInvoiceCard = (invoice: any) => (
    <TouchableOpacity key={invoice.id} style={styles.card} onPress={() => { setSelectedItem(invoice); setDetailModalVisible(true); }}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardNumber}>{invoice.invoice_number || `FACT-${String(invoice.id).padStart(6, '0')}`}</Text>
          <Text style={styles.cardCustomer}>{invoice.customer_name || 'Client inconnu'}</Text>
          <Text style={styles.cardDate}>{new Date(invoice.invoice_date || invoice.created_at).toLocaleDateString('fr-FR')}</Text>
        </View>
        <View>
          <Text style={styles.cardAmount}>{invoice.total_amount ? `${parseFloat(invoice.total_amount).toFixed(2)} €` : '-'}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(invoice.status) }]}>
            <Text style={styles.statusText}>{getStatusLabel(invoice.status)}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return '#34C759';
      case 'sent': return '#007AFF';
      case 'overdue': return '#FF3B30';
      case 'draft': return '#8E8E93';
      default: return '#8E8E93';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid': return 'Payé';
      case 'sent': return 'Envoyé';
      case 'overdue': return 'En retard';
      case 'draft': return 'Brouillon';
      case 'accepted': return 'Accepté';
      case 'rejected': return 'Refusé';
      default: return status;
    }
  };

  const filteredQuotes = quotes.filter(q => q.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) || q.quote_number?.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredInvoices = invoices.filter(i => i.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) || i.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase()));

  // Show onboarding if no templates exist
  if (!checkingTemplates && !hasTemplates) {
    return (
      <View style={styles.container}>
        <Navigation />
        <View style={styles.onboardingContainer}>
          <View style={styles.onboardingIconContainer}>
            <FileTextIcon size={80} color="#007AFF" />
          </View>
          <Text style={styles.onboardingTitle}>Créez votre premier template</Text>
          <Text style={styles.onboardingDescription}>
            Avant de créer des devis et factures, vous devez configurer un template.
            Les templates définissent l'apparence de vos documents avec votre logo, vos couleurs et vos informations d'entreprise.
          </Text>
          <TouchableOpacity
            style={styles.onboardingButton}
            onPress={() => navigation.navigate('Templates')}
          >
            <FileTextIcon size={24} color="#FFFFFF" />
            <Text style={styles.onboardingButtonText}>Créer mon premier template</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Navigation />
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Facturation</Text>
          <Text style={styles.headerSubtitle}>
            {activeTab === 'quotes' ? `${quotes.length} devis` : `${invoices.length} factures`}
          </Text>
        </View>
        <TouchableOpacity style={styles.addButton}>
          <Text style={styles.addButtonText}>+ Nouveau</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabsContainer}>
        <TouchableOpacity style={[styles.tab, activeTab === 'quotes' && styles.tabActive]} onPress={() => setActiveTab('quotes')}>
          <FileTextIcon size={18} color={activeTab === 'quotes' ? '#007AFF' : '#8E8E93'} />
          <Text style={[styles.tabText, activeTab === 'quotes' && styles.tabTextActive]}>Devis ({quotes.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'invoices' && styles.tabActive]} onPress={() => setActiveTab('invoices')}>
          <DollarIcon size={18} color={activeTab === 'invoices' ? '#007AFF' : '#8E8E93'} />
          <Text style={[styles.tabText, activeTab === 'invoices' && styles.tabTextActive]}>Factures ({invoices.length})</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <TextInput style={styles.searchInput} placeholder={activeTab === 'quotes' ? 'Rechercher un devis...' : 'Rechercher une facture...'} placeholderTextColor="#8E8E93" value={searchQuery} onChangeText={setSearchQuery} />
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {activeTab === 'quotes' ? (
          filteredQuotes.length > 0 ? filteredQuotes.map(renderQuoteCard) : <View style={styles.emptyState}><FileTextIcon size={64} color="#D1D1D6" /><Text style={styles.emptyText}>Aucun devis</Text></View>
        ) : (
          filteredInvoices.length > 0 ? filteredInvoices.map(renderInvoiceCard) : <View style={styles.emptyState}><DollarIcon size={64} color="#D1D1D6" /><Text style={styles.emptyText}>Aucune facture</Text></View>
        )}
      </ScrollView>

      {/* Detail Modal */}
      <Modal visible={detailModalVisible} animationType="slide" transparent onRequestClose={() => setDetailModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedItem && (
              <>
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalTitle}>{activeTab === 'quotes' ? (selectedItem.quote_number || 'Devis') : (selectedItem.invoice_number || 'Facture')}</Text>
                    <Text style={styles.modalSubtitle}>{selectedItem.customer_name}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                    <Text style={styles.closeButton}>✕</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.modalBody}>
                  <View style={styles.modalSection}>
                    <Text style={styles.sectionTitle}>DÉTAILS</Text>
                    <View style={styles.infoRow}><Text style={styles.infoLabel}>Montant HT</Text><Text style={styles.infoValue}>{(selectedItem.total_ht || 0).toFixed(2)} €</Text></View>
                    <View style={styles.infoRow}><Text style={styles.infoLabel}>TVA</Text><Text style={styles.infoValue}>{((selectedItem.total_ttc || 0) - (selectedItem.total_ht || 0)).toFixed(2)} €</Text></View>
                    <View style={styles.infoRow}><Text style={styles.infoLabel}>Total TTC</Text><Text style={styles.infoValue}>{(selectedItem.total_ttc || 0).toFixed(2)} €</Text></View>
                  </View>
                </ScrollView>
                <View style={styles.modalActions}>
                  {activeTab === 'quotes' ? (
                    <>
                      <TouchableOpacity style={styles.actionButtonSecondary} onPress={() => handleConvertToInvoice(selectedItem.id)}>
                        <Text style={styles.actionButtonSecondaryText}>Convertir en facture</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.actionButtonPrimary}>
                        <MailIcon size={16} color="#FFFFFF" />
                        <Text style={styles.actionButtonPrimaryText}>Envoyer</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <TouchableOpacity style={styles.actionButtonSecondary} onPress={() => handleSendReminder(selectedItem.id)}>
                        <MailIcon size={16} color="#007AFF" />
                        <Text style={styles.actionButtonSecondaryText}>Relancer</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.actionButtonPrimary} onPress={() => { setPaymentModalVisible(true); setPaymentAmount((selectedItem.total_ttc || 0).toString()); }}>
                        <DollarIcon size={16} color="#FFFFFF" />
                        <Text style={styles.actionButtonPrimaryText}>Payer</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Payment Modal */}
      <Modal visible={paymentModalVisible} animationType="slide" transparent onRequestClose={() => setPaymentModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Paiement</Text>
              <TouchableOpacity onPress={() => setPaymentModalVisible(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Montant</Text>
                <TextInput style={styles.input} placeholder="0.00" value={paymentAmount} onChangeText={setPaymentAmount} keyboardType="decimal-pad" placeholderTextColor="#8E8E93" />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Méthode de paiement</Text>
                <View style={styles.paymentMethods}>
                  {[
                    { id: 'card', label: '💳 Carte bancaire', value: 'card' },
                    { id: 'apple_pay', label: ' Apple Pay', value: 'apple_pay' },
                    { id: 'google_pay', label: 'G Google Pay', value: 'google_pay' },
                    { id: 'bank_transfer', label: '🏦 Virement bancaire', value: 'bank_transfer' },
                  ].map((method) => (
                    <TouchableOpacity key={method.id} style={[styles.paymentMethod, paymentMethod === method.value && styles.paymentMethodActive]} onPress={() => setPaymentMethod(method.value as any)}>
                      <Text style={[styles.paymentMethodText, paymentMethod === method.value && styles.paymentMethodTextActive]}>{method.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.buttonSecondary} onPress={() => setPaymentModalVisible(false)}>
                <Text style={styles.buttonSecondaryText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.buttonPrimary} onPress={handlePayment}>
                <Text style={styles.buttonPrimaryText}>Confirmer le paiement</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  header: { backgroundColor: '#FFFFFF', paddingTop: 16, paddingHorizontal: 20, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 32, fontWeight: '700', color: '#000000', marginBottom: 4 },
  headerSubtitle: { fontSize: 15, color: '#8E8E93' },
  addButton: { backgroundColor: '#007AFF', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  addButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  tabsContainer: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 12, gap: 8, backgroundColor: '#FFFFFF' },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10, backgroundColor: '#F2F2F7', gap: 6 },
  tabActive: { backgroundColor: '#007AFF10' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#8E8E93' },
  tabTextActive: { color: '#007AFF' },
  searchContainer: { paddingHorizontal: 20, paddingVertical: 12 },
  searchInput: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, fontSize: 16, color: '#000000' },
  list: { flex: 1 },
  listContent: { padding: 20, gap: 12 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  cardNumber: { fontSize: 16, fontWeight: '700', color: '#000000', marginBottom: 4 },
  cardCustomer: { fontSize: 14, color: '#8E8E93', marginBottom: 2 },
  cardDate: { fontSize: 13, color: '#8E8E93' },
  cardAmount: { fontSize: 18, fontWeight: '700', color: '#000000', marginBottom: 8, textAlign: 'right' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: '600', color: '#FFFFFF' },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { marginTop: 16, fontSize: 17, color: '#8E8E93' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F2F2F7' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#000000' },
  modalSubtitle: { fontSize: 15, color: '#8E8E93', marginTop: 2 },
  closeButton: { fontSize: 28, color: '#8E8E93', fontWeight: '300' },
  modalBody: { flex: 1 },
  modalSection: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#F2F2F7' },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#8E8E93', marginBottom: 12 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  infoLabel: { fontSize: 15, color: '#8E8E93' },
  infoValue: { fontSize: 15, fontWeight: '600', color: '#000000' },
  modalActions: { flexDirection: 'row', padding: 20, borderTopWidth: 1, borderTopColor: '#F2F2F7', gap: 8 },
  actionButtonPrimary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10, gap: 6, backgroundColor: '#007AFF' },
  actionButtonPrimaryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  actionButtonSecondary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10, gap: 6, backgroundColor: '#F2F2F7' },
  actionButtonSecondaryText: { color: '#007AFF', fontSize: 15, fontWeight: '600' },
  modalFooter: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#F2F2F7' },
  buttonPrimary: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', backgroundColor: '#007AFF' },
  buttonPrimaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  buttonSecondary: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', backgroundColor: '#F2F2F7' },
  buttonSecondaryText: { color: '#007AFF', fontSize: 16, fontWeight: '600' },
  formGroup: { marginBottom: 16, paddingHorizontal: 20 },
  formLabel: { fontSize: 15, fontWeight: '600', color: '#000000', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#E5E5EA', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, color: '#000000' },
  paymentMethods: { gap: 8 },
  paymentMethod: { padding: 12, borderRadius: 8, borderWidth: 1.5, borderColor: '#E5E5EA', backgroundColor: '#FFFFFF' },
  paymentMethodActive: { borderColor: '#007AFF', backgroundColor: '#007AFF10' },
  paymentMethodText: { fontSize: 15, fontWeight: '600', color: '#8E8E93' },
  paymentMethodTextActive: { color: '#007AFF' },
  onboardingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, backgroundColor: '#FAFAFA' },
  onboardingIconContainer: { marginBottom: 32 },
  onboardingTitle: { fontSize: 28, fontWeight: '700', color: '#000000', textAlign: 'center', marginBottom: 16 },
  onboardingDescription: { fontSize: 17, color: '#8E8E93', textAlign: 'center', lineHeight: 24, marginBottom: 40, maxWidth: 500 },
  onboardingButton: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#007AFF', paddingVertical: 16, paddingHorizontal: 32, borderRadius: 12, shadowColor: '#007AFF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  onboardingButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' },
});
