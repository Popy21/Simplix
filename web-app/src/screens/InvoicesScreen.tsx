import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Platform,
  FlatList,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import {
  FileTextIcon,
  DollarIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  AlertTriangleIcon,
  UsersIcon,
} from '../components/Icons';

type InvoicesScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Invoices'>;
};

type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
type PaymentMethod = 'card' | 'transfer' | 'check' | 'cash';

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
}

interface Invoice {
  id: string;
  number: string;
  customer: string;
  customerEmail: string;
  date: string;
  dueDate: string;
  status: InvoiceStatus;
  items: InvoiceItem[];
  notes: string;
  paymentMethod?: PaymentMethod;
  paidAt?: string;
}

interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  date: string;
  method: PaymentMethod;
  reference: string;
}

export default function InvoicesScreen({ navigation }: InvoicesScreenProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([
    {
      id: '1',
      number: 'INV-2025-001',
      customer: 'TechCorp SAS',
      customerEmail: 'contact@techcorp.fr',
      date: '2025-10-15',
      dueDate: '2025-11-15',
      status: 'sent',
      items: [
        { id: '1', description: 'Licence Annuelle CRM', quantity: 1, unitPrice: 5000, vatRate: 20 },
        { id: '2', description: 'Formation équipe (3 jours)', quantity: 3, unitPrice: 800, vatRate: 20 },
      ],
      notes: 'Paiement par virement bancaire sous 30 jours',
    },
    {
      id: '2',
      number: 'INV-2025-002',
      customer: 'StartupXYZ',
      customerEmail: 'billing@startupxyz.com',
      date: '2025-10-10',
      dueDate: '2025-10-25',
      status: 'overdue',
      items: [
        { id: '1', description: 'Consulting - Migration Cloud', quantity: 1, unitPrice: 3500, vatRate: 20 },
      ],
      notes: 'URGENT: Facture en retard',
    },
    {
      id: '3',
      number: 'INV-2025-003',
      customer: 'BigCorp International',
      customerEmail: 'accounts@bigcorp.com',
      date: '2025-10-01',
      dueDate: '2025-10-31',
      status: 'paid',
      items: [
        { id: '1', description: 'Développement Custom Module', quantity: 1, unitPrice: 12000, vatRate: 20 },
        { id: '2', description: 'Support Premium (12 mois)', quantity: 12, unitPrice: 500, vatRate: 20 },
      ],
      notes: 'Payé le 2025-10-20',
      paymentMethod: 'transfer',
      paidAt: '2025-10-20',
    },
  ]);

  const [selectedFilter, setSelectedFilter] = useState<InvoiceStatus | 'all'>('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [newInvoiceModalVisible, setNewInvoiceModalVisible] = useState(false);
  const [newInvoiceForm, setNewInvoiceForm] = useState({
    number: `INV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
    customer: '',
    customerEmail: '',
    date: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'draft' as InvoiceStatus,
    notes: '',
  });

  const statusConfig = {
    draft: { label: 'Brouillon', color: '#8E8E93', bgColor: '#8E8E9320', icon: FileTextIcon },
    sent: { label: 'Envoyée', color: '#007AFF', bgColor: '#007AFF20', icon: ClockIcon },
    paid: { label: 'Payée', color: '#34C759', bgColor: '#34C75920', icon: CheckCircleIcon },
    overdue: { label: 'En retard', color: '#FF3B30', bgColor: '#FF3B3020', icon: AlertTriangleIcon },
    cancelled: { label: 'Annulée', color: '#8E8E93', bgColor: '#8E8E9320', icon: AlertTriangleIcon },
  };

  const paymentMethodConfig = {
    card: { label: 'Carte bancaire', icon: '💳' },
    transfer: { label: 'Virement', icon: '🏦' },
    check: { label: 'Chèque', icon: '📝' },
    cash: { label: 'Espèces', icon: '💵' },
  };

  const calculateInvoiceTotal = (invoice: Invoice) => {
    const subtotal = invoice.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const vat = invoice.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice * (item.vatRate / 100),
      0
    );
    return { subtotal, vat, total: subtotal + vat };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const isOverdue = (dueDate: string, status: InvoiceStatus) => {
    return status !== 'paid' && status !== 'cancelled' && new Date(dueDate) < new Date();
  };

  const openInvoiceDetails = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setModalVisible(true);
  };

  const handleCreateInvoice = () => {
    if (!newInvoiceForm.customer.trim() || !newInvoiceForm.customerEmail.trim()) {
      Alert.alert('Erreur', 'Le client et l\'email sont obligatoires');
      return;
    }

    const newInvoice: Invoice = {
      id: Date.now().toString(),
      number: newInvoiceForm.number,
      customer: newInvoiceForm.customer,
      customerEmail: newInvoiceForm.customerEmail,
      date: newInvoiceForm.date,
      dueDate: newInvoiceForm.dueDate,
      status: newInvoiceForm.status,
      items: [],
      notes: newInvoiceForm.notes,
    };

    setInvoices([...invoices, newInvoice]);
    handleResetInvoiceForm();
    setNewInvoiceModalVisible(false);
    Alert.alert('Succès', `Facture ${newInvoice.number} créée avec succès`);
  };

  const handleResetInvoiceForm = () => {
    setNewInvoiceForm({
      number: `INV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
      customer: '',
      customerEmail: '',
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'draft',
      notes: '',
    });
  };

  const markAsPaid = (invoiceId: string) => {
    Alert.alert(
      'Marquer comme payée',
      'Confirmer le paiement de cette facture ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: () => {
            setInvoices((prev) =>
              prev.map((inv) =>
                inv.id === invoiceId
                  ? { ...inv, status: 'paid' as InvoiceStatus, paidAt: new Date().toISOString() }
                  : inv
              )
            );
            setModalVisible(false);
            Alert.alert('Succès', 'La facture a été marquée comme payée');
          },
        },
      ]
    );
  };

  const sendReminder = (invoice: Invoice) => {
    Alert.alert(
      'Relance client',
      `Envoyer une relance de paiement à ${invoice.customer} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Envoyer',
          onPress: () => {
            Alert.alert('Succès', `Email de relance envoyé à ${invoice.customerEmail}`);
          },
        },
      ]
    );
  };

  const filteredInvoices =
    selectedFilter === 'all'
      ? invoices
      : invoices.filter((inv) => inv.status === selectedFilter);

  const stats = {
    total: invoices.length,
    draft: invoices.filter((i) => i.status === 'draft').length,
    sent: invoices.filter((i) => i.status === 'sent').length,
    paid: invoices.filter((i) => i.status === 'paid').length,
    overdue: invoices.filter((i) => i.status === 'overdue').length,
    totalRevenue: invoices
      .filter((i) => i.status === 'paid')
      .reduce((sum, inv) => sum + calculateInvoiceTotal(inv).total, 0),
    pendingRevenue: invoices
      .filter((i) => i.status === 'sent' || i.status === 'overdue')
      .reduce((sum, inv) => sum + calculateInvoiceTotal(inv).total, 0),
  };

  const renderInvoice = (invoice: Invoice) => {
    const { total } = calculateInvoiceTotal(invoice);
    const statusStyle = statusConfig[invoice.status];
    const StatusIcon = statusStyle.icon;
    const overdue = isOverdue(invoice.dueDate, invoice.status);

    return (
      <TouchableOpacity
        key={invoice.id}
        style={[styles.invoiceCard, overdue && styles.invoiceCardOverdue]}
        onPress={() => openInvoiceDetails(invoice)}
        activeOpacity={0.7}
      >
        <View style={styles.invoiceHeader}>
          <View style={styles.invoiceLeft}>
            <Text style={styles.invoiceNumber}>{invoice.number}</Text>
            <Text style={styles.invoiceCustomer}>{invoice.customer}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bgColor }]}>
            <StatusIcon size={14} color={statusStyle.color} />
            <Text style={[styles.statusText, { color: statusStyle.color }]}>
              {statusStyle.label}
            </Text>
          </View>
        </View>

        <View style={styles.invoiceDetails}>
          <View style={styles.invoiceDetailRow}>
            <View style={styles.detailItem}>
              <CalendarIcon size={14} color="#8E8E93" />
              <Text style={styles.detailText}>
                {new Date(invoice.date).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Échéance:</Text>
              <Text style={[styles.detailText, overdue && styles.overdueText]}>
                {new Date(invoice.dueDate).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'short',
                })}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.invoiceFooter}>
          <Text style={styles.invoiceTotal}>{formatCurrency(total)}</Text>
          {overdue && (
            <TouchableOpacity
              style={styles.reminderButton}
              onPress={() => sendReminder(invoice)}
            >
              <Text style={styles.reminderButtonText}>Relancer</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* En-tête */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Factures</Text>
          <Text style={styles.headerSubtitle}>
            {stats.total} factures • {formatCurrency(stats.totalRevenue)} encaissé
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setNewInvoiceModalVisible(true)}
        >
          <Text style={styles.addButtonText}>+ Nouvelle</Text>
        </TouchableOpacity>
      </View>

      {/* Statistiques */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <DollarIcon size={24} color="#34C759" />
          <Text style={styles.statValue}>{formatCurrency(stats.totalRevenue)}</Text>
          <Text style={styles.statLabel}>Encaissé</Text>
        </View>
        <View style={styles.statCard}>
          <ClockIcon size={24} color="#FF9500" />
          <Text style={styles.statValue}>{formatCurrency(stats.pendingRevenue)}</Text>
          <Text style={styles.statLabel}>En attente</Text>
        </View>
        <View style={styles.statCard}>
          <AlertTriangleIcon size={24} color="#FF3B30" />
          <Text style={styles.statValue}>{stats.overdue}</Text>
          <Text style={styles.statLabel}>En retard</Text>
        </View>
      </View>

      {/* Filtres */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[styles.filterChip, selectedFilter === 'all' && styles.filterChipActive]}
            onPress={() => setSelectedFilter('all')}
          >
            <Text style={[styles.filterText, selectedFilter === 'all' && styles.filterTextActive]}>
              Toutes ({stats.total})
            </Text>
          </TouchableOpacity>

          {(Object.keys(statusConfig) as InvoiceStatus[]).map((status) => (
            <TouchableOpacity
              key={status}
              style={[styles.filterChip, selectedFilter === status && styles.filterChipActive]}
              onPress={() => setSelectedFilter(status)}
            >
              <Text style={[styles.filterText, selectedFilter === status && styles.filterTextActive]}>
                {statusConfig[status].label} ({invoices.filter((i) => i.status === status).length})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Liste des factures */}
      <ScrollView style={styles.invoicesList} contentContainerStyle={styles.invoicesListContent}>
        {filteredInvoices.length > 0 ? (
          filteredInvoices.map((invoice) => renderInvoice(invoice))
        ) : (
          <View style={styles.emptyState}>
            <FileTextIcon size={64} color="#D1D1D6" />
            <Text style={styles.emptyText}>Aucune facture</Text>
          </View>
        )}
      </ScrollView>

      {/* Modal Détails Facture */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedInvoice && (
              <>
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={styles.modalTitle}>{selectedInvoice.number}</Text>
                    <Text style={styles.modalSubtitle}>{selectedInvoice.customer}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setModalVisible(false)}>
                    <Text style={styles.closeButton}>✕</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalBody}>
                  {/* Informations */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>INFORMATIONS</Text>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Date d'émission</Text>
                      <Text style={styles.infoValue}>
                        {new Date(selectedInvoice.date).toLocaleDateString('fr-FR')}
                      </Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Date d'échéance</Text>
                      <Text style={styles.infoValue}>
                        {new Date(selectedInvoice.dueDate).toLocaleDateString('fr-FR')}
                      </Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Statut</Text>
                      <View
                        style={[
                          styles.infoStatusBadge,
                          { backgroundColor: statusConfig[selectedInvoice.status].bgColor },
                        ]}
                      >
                        <Text
                          style={[
                            styles.infoStatusText,
                            { color: statusConfig[selectedInvoice.status].color },
                          ]}
                        >
                          {statusConfig[selectedInvoice.status].label}
                        </Text>
                      </View>
                    </View>
                    {selectedInvoice.paidAt && (
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Payée le</Text>
                        <Text style={styles.infoValue}>
                          {new Date(selectedInvoice.paidAt).toLocaleDateString('fr-FR')}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Lignes de facturation */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>DÉTAIL</Text>
                    {selectedInvoice.items.map((item) => (
                      <View key={item.id} style={styles.itemRow}>
                        <View style={styles.itemLeft}>
                          <Text style={styles.itemDescription}>{item.description}</Text>
                          <Text style={styles.itemDetails}>
                            {item.quantity} × {formatCurrency(item.unitPrice)} (TVA {item.vatRate}%)
                          </Text>
                        </View>
                        <Text style={styles.itemTotal}>
                          {formatCurrency(item.quantity * item.unitPrice)}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {/* Totaux */}
                  <View style={styles.modalSection}>
                    <View style={styles.totalRow}>
                      <Text style={styles.totalLabel}>Sous-total HT</Text>
                      <Text style={styles.totalValue}>
                        {formatCurrency(calculateInvoiceTotal(selectedInvoice).subtotal)}
                      </Text>
                    </View>
                    <View style={styles.totalRow}>
                      <Text style={styles.totalLabel}>TVA</Text>
                      <Text style={styles.totalValue}>
                        {formatCurrency(calculateInvoiceTotal(selectedInvoice).vat)}
                      </Text>
                    </View>
                    <View style={[styles.totalRow, styles.totalRowFinal]}>
                      <Text style={styles.totalLabelFinal}>Total TTC</Text>
                      <Text style={styles.totalValueFinal}>
                        {formatCurrency(calculateInvoiceTotal(selectedInvoice).total)}
                      </Text>
                    </View>
                  </View>

                  {/* Notes */}
                  {selectedInvoice.notes && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>NOTES</Text>
                      <Text style={styles.notesText}>{selectedInvoice.notes}</Text>
                    </View>
                  )}
                </ScrollView>

                {/* Actions */}
                <View style={styles.modalActions}>
                  {selectedInvoice.status !== 'paid' && (
                    <TouchableOpacity
                      style={styles.actionButtonPrimary}
                      onPress={() => markAsPaid(selectedInvoice.id)}
                    >
                      <CheckCircleIcon size={20} color="#FFFFFF" />
                      <Text style={styles.actionButtonPrimaryText}>Marquer comme payée</Text>
                    </TouchableOpacity>
                  )}
                  {(selectedInvoice.status === 'sent' || selectedInvoice.status === 'overdue') && (
                    <TouchableOpacity
                      style={styles.actionButtonSecondary}
                      onPress={() => sendReminder(selectedInvoice)}
                    >
                      <Text style={styles.actionButtonSecondaryText}>Relancer le client</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.actionButtonSecondary}
                    onPress={() => Alert.alert('À venir', 'Export PDF en développement')}
                  >
                    <Text style={styles.actionButtonSecondaryText}>Télécharger PDF</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal Création Facture */}
      <Modal visible={newInvoiceModalVisible} transparent animationType="slide" onRequestClose={() => setNewInvoiceModalVisible(false)}>
        <View style={styles.newModalContainer}>
          <View style={styles.newModalContent}>
            <View style={styles.newModalHeader}>
              <Text style={styles.newModalTitle}>Nouvelle Facture</Text>
              <TouchableOpacity onPress={() => setNewInvoiceModalVisible(false)}>
                <Text style={styles.closeButtonNew}>×</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.newModalBody}>
              {/* Numéro de facture (auto-généré) */}
              <View style={styles.formGroupInvoice}>
                <Text style={styles.formLabelInvoice}>Numéro de facture</Text>
                <View style={[styles.inputInvoice, { justifyContent: 'center' }]}>
                  <Text style={{ fontSize: 16, color: '#000000' }}>{newInvoiceForm.number}</Text>
                </View>
              </View>

              {/* Client */}
              <View style={styles.formGroupInvoice}>
                <Text style={styles.formLabelInvoice}>Client *</Text>
                <TextInput
                  style={styles.inputInvoice}
                  placeholder="Nom du client"
                  value={newInvoiceForm.customer}
                  onChangeText={(text) => setNewInvoiceForm({ ...newInvoiceForm, customer: text })}
                  placeholderTextColor="#8E8E93"
                />
              </View>

              {/* Email Client */}
              <View style={styles.formGroupInvoice}>
                <Text style={styles.formLabelInvoice}>Email du client *</Text>
                <TextInput
                  style={styles.inputInvoice}
                  placeholder="email@example.com"
                  value={newInvoiceForm.customerEmail}
                  onChangeText={(text) => setNewInvoiceForm({ ...newInvoiceForm, customerEmail: text })}
                  keyboardType="email-address"
                  placeholderTextColor="#8E8E93"
                />
              </View>

              {/* Date de facture */}
              <View style={styles.formGroupInvoice}>
                <Text style={styles.formLabelInvoice}>Date de facture</Text>
                <TextInput
                  style={styles.inputInvoice}
                  placeholder="YYYY-MM-DD"
                  value={newInvoiceForm.date}
                  onChangeText={(text) => setNewInvoiceForm({ ...newInvoiceForm, date: text })}
                  placeholderTextColor="#8E8E93"
                />
              </View>

              {/* Date d'échéance */}
              <View style={styles.formGroupInvoice}>
                <Text style={styles.formLabelInvoice}>Date d'échéance</Text>
                <TextInput
                  style={styles.inputInvoice}
                  placeholder="YYYY-MM-DD"
                  value={newInvoiceForm.dueDate}
                  onChangeText={(text) => setNewInvoiceForm({ ...newInvoiceForm, dueDate: text })}
                  placeholderTextColor="#8E8E93"
                />
              </View>

              {/* Statut */}
              <View style={styles.formGroupInvoice}>
                <Text style={styles.formLabelInvoice}>Statut</Text>
                <View style={styles.statusSelectInvoice}>
                  {(['draft', 'sent', 'paid', 'overdue', 'cancelled'] as const).map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={[
                        styles.statusButtonInvoice,
                        newInvoiceForm.status === s && styles.statusButtonActiveInvoice,
                        {
                          borderColor: newInvoiceForm.status === s ? statusConfig[s].color : '#E5E5EA',
                          backgroundColor: newInvoiceForm.status === s ? statusConfig[s].bgColor : '#FFFFFF',
                        },
                      ]}
                      onPress={() => setNewInvoiceForm({ ...newInvoiceForm, status: s })}
                    >
                      <Text
                        style={[
                          styles.statusButtonTextInvoice,
                          { color: newInvoiceForm.status === s ? statusConfig[s].color : '#8E8E93' },
                        ]}
                      >
                        {statusConfig[s].label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Notes */}
              <View style={styles.formGroupInvoice}>
                <Text style={styles.formLabelInvoice}>Notes</Text>
                <TextInput
                  style={[styles.inputInvoice, styles.textAreaInvoice]}
                  placeholder="Conditions de paiement, remarques..."
                  value={newInvoiceForm.notes}
                  onChangeText={(text) => setNewInvoiceForm({ ...newInvoiceForm, notes: text })}
                  placeholderTextColor="#8E8E93"
                  multiline
                  numberOfLines={4}
                />
              </View>
            </ScrollView>

            <View style={styles.newModalFooter}>
              <TouchableOpacity
                style={[styles.buttonInvoice, styles.buttonSecondaryInvoice]}
                onPress={() => {
                  handleResetInvoiceForm();
                  setNewInvoiceModalVisible(false);
                }}
              >
                <Text style={styles.buttonSecondaryTextInvoice}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.buttonInvoice, styles.buttonPrimaryInvoice]}
                onPress={handleCreateInvoice}
              >
                <Text style={styles.buttonPrimaryTextInvoice}>Créer</Text>
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
    backgroundColor: '#F2F2F7',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.6,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#8E8E93',
    letterSpacing: -0.2,
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#8E8E93',
  },
  filtersContainer: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  filterChipActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterText: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  invoicesList: {
    flex: 1,
  },
  invoicesListContent: {
    padding: 20,
    gap: 12,
  },
  invoiceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  invoiceCardOverdue: {
    borderLeftWidth: 3,
    borderLeftColor: '#FF3B30',
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  invoiceLeft: {
    flex: 1,
  },
  invoiceNumber: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
  },
  invoiceCustomer: {
    fontSize: 15,
    color: '#8E8E93',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  invoiceDetails: {
    marginBottom: 12,
  },
  invoiceDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailLabel: {
    fontSize: 13,
    color: '#8E8E93',
  },
  detailText: {
    fontSize: 13,
    color: '#000000',
    fontWeight: '500',
  },
  overdueText: {
    color: '#FF3B30',
    fontWeight: '700',
  },
  invoiceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  invoiceTotal: {
    fontSize: 20,
    fontWeight: '700',
    color: '#34C759',
  },
  reminderButton: {
    backgroundColor: '#FF950020',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  reminderButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF9500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 17,
    color: '#8E8E93',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 17,
    color: '#8E8E93',
  },
  closeButton: {
    fontSize: 28,
    color: '#8E8E93',
    fontWeight: '300',
  },
  modalBody: {
    flex: 1,
  },
  modalSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  modalSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 12,
    letterSpacing: -0.1,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 15,
    color: '#8E8E93',
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
  },
  infoStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  infoStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  itemLeft: {
    flex: 1,
    marginRight: 12,
  },
  itemDescription: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  itemDetails: {
    fontSize: 13,
    color: '#8E8E93',
  },
  itemTotal: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000000',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  totalRowFinal: {
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: 2,
    borderTopColor: '#000000',
  },
  totalLabel: {
    fontSize: 15,
    color: '#8E8E93',
  },
  totalValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
  },
  totalLabelFinal: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000000',
  },
  totalValueFinal: {
    fontSize: 20,
    fontWeight: '700',
    color: '#34C759',
  },
  notesText: {
    fontSize: 14,
    color: '#000000',
    lineHeight: 20,
  },
  modalActions: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
    gap: 8,
  },
  actionButtonPrimary: {
    flexDirection: 'row',
    backgroundColor: '#34C759',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionButtonPrimaryText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  actionButtonSecondary: {
    backgroundColor: '#F2F2F7',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  actionButtonSecondaryText: {
    color: '#007AFF',
    fontSize: 17,
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
  formGroupInvoice: {
    marginBottom: 16,
  },
  formLabelInvoice: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  inputInvoice: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#000000',
  },
  textAreaInvoice: {
    textAlignVertical: 'top',
    paddingTop: 10,
    height: 100,
  },
  statusSelectInvoice: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusButtonInvoice: {
    flex: 1,
    minWidth: '45%',
    borderWidth: 1.5,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  statusButtonActiveInvoice: {
    borderWidth: 2,
  },
  statusButtonTextInvoice: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
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
  buttonInvoice: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimaryInvoice: {
    backgroundColor: '#007AFF',
  },
  buttonPrimaryTextInvoice: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonSecondaryInvoice: {
    backgroundColor: '#F2F2F7',
  },
  buttonSecondaryTextInvoice: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
