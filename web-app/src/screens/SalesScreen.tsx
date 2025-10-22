import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { saleService } from '../services/api';
import { Sale } from '../types';

interface SaleWithDetails extends Sale {
  salesPerson?: string;
  daysAgo?: number;
  emoji?: string;
}

const { width } = Dimensions.get('window');

export default function SalesScreen() {
  const [sales, setSales] = useState<SaleWithDetails[]>([]);
  const [filteredSales, setFilteredSales] = useState<SaleWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSale, setSelectedSale] = useState<SaleWithDetails | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [newSaleModalVisible, setNewSaleModalVisible] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed' | 'cancelled'>('all');
  const [amountRange, setAmountRange] = useState<'all' | 'small' | 'medium' | 'large'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'amount' | 'status'>('recent');

  const [newSaleForm, setNewSaleForm] = useState({
    title: '',
    amount: '',
    customer: '',
    date: new Date().toISOString().split('T')[0],
    status: 'pending' as 'pending' | 'completed' | 'cancelled',
  });

  const statusOptions = ['pending', 'completed', 'cancelled'] as const;
  const emojis = ['💼', '💰', '📊', '🎯', '✅', '❌', '⏳', '💎', '🚀', '📈'];

  useEffect(() => {
    loadSales();
  }, []);

  useEffect(() => {
    filterSales();
  }, [searchQuery, statusFilter, amountRange, sales, sortBy]);

  const loadSales = async () => {
    try {
      setLoading(true);
      const response = await saleService.getAll();
      const salesWithDetails = response.data.map((s: Sale, index: number) => {
        const saleDate = new Date(s.sale_date || Date.now());
        const daysAgo = Math.floor((Date.now() - saleDate.getTime()) / (1000 * 60 * 60 * 24));
        return {
          ...s,
          emoji: emojis[index % emojis.length],
          salesPerson: ['Alice', 'Bob', 'Charlie', 'Diana'][Math.floor(Math.random() * 4)],
          daysAgo,
        };
      });
      setSales(salesWithDetails);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de charger les ventes');
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterSales = () => {
    let filtered = sales;

    // Filtre statut
    if (statusFilter !== 'all') {
      filtered = filtered.filter((s) => s.status === statusFilter);
    }

    // Filtre montant
    if (amountRange === 'small') {
      filtered = filtered.filter((s) => s.total_amount < 500);
    } else if (amountRange === 'medium') {
      filtered = filtered.filter((s) => s.total_amount >= 500 && s.total_amount < 2000);
    } else if (amountRange === 'large') {
      filtered = filtered.filter((s) => s.total_amount >= 2000);
    }

    // Filtre recherche
    if (searchQuery) {
      filtered = filtered.filter(
        (s) =>
          (s.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
          (s.product_name?.toLowerCase().includes(searchQuery.toLowerCase()) || false)
      );
    }

    // Tri
    if (sortBy === 'recent') {
      filtered.sort((a, b) => (b.daysAgo || 0) - (a.daysAgo || 0));
    } else if (sortBy === 'amount') {
      filtered.sort((a, b) => b.total_amount - a.total_amount);
    } else if (sortBy === 'status') {
      const statusOrder = { completed: 0, pending: 1, cancelled: 2 };
      filtered.sort((a, b) => (statusOrder[a.status as keyof typeof statusOrder] || 3) - (statusOrder[b.status as keyof typeof statusOrder] || 3));
    }

    setFilteredSales(filtered);
  };

  const handleCreateSale = () => {
    if (!newSaleForm.title.trim() || !newSaleForm.amount.trim()) {
      Alert.alert('Erreur', 'Le titre et le montant sont obligatoires');
      return;
    }

    const newSale: SaleWithDetails = {
      id: Date.now(),
      customer_id: 0,
      product_id: 0,
      customer_name: newSaleForm.customer || 'Client',
      product_name: newSaleForm.title,
      quantity: 1,
      total_amount: parseFloat(newSaleForm.amount) || 0,
      sale_date: newSaleForm.date,
      status: newSaleForm.status,
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
      salesPerson: ['Alice', 'Bob', 'Charlie', 'Diana'][Math.floor(Math.random() * 4)],
      daysAgo: 0,
    };

    setSales([...sales, newSale]);
    handleResetSaleForm();
    setNewSaleModalVisible(false);
    Alert.alert('Succès', `Vente créée avec succès`);
  };

  const handleResetSaleForm = () => {
    setNewSaleForm({
      title: '',
      amount: '',
      customer: '',
      date: new Date().toISOString().split('T')[0],
      status: 'pending',
    });
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadSales();
  };

  const openSaleDetails = (sale: SaleWithDetails) => {
    setSelectedSale(sale);
    setModalVisible(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'completed':
        return '#34C759';
      case 'pending':
        return '#FF9500';
      case 'cancelled':
        return '#FF3B30';
      default:
        return '#8E8E93';
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'completed':
        return 'Terminée';
      case 'pending':
        return 'En attente';
      case 'cancelled':
        return 'Annulée';
      default:
        return 'N/A';
    }
  };

  const stats = {
    total: sales.length,
    totalAmount: sales.reduce((sum, s) => sum + s.total_amount, 0),
    completed: sales.filter((s) => s.status === 'completed').length,
    pending: sales.filter((s) => s.status === 'pending').length,
    cancelled: sales.filter((s) => s.status === 'cancelled').length,
  };

  const renderSaleCard = ({ item }: { item: SaleWithDetails }) => (
    <TouchableOpacity
      style={styles.saleCard}
      onPress={() => openSaleDetails(item)}
      activeOpacity={0.7}
    >
      <View style={styles.saleCardHeader}>
        <View style={styles.saleInfo}>
          <View style={styles.emojiName}>
            <Text style={styles.emoji}>{item.emoji || '💼'}</Text>
            <View style={styles.nameSection}>
              <Text style={styles.saleName} numberOfLines={1}>
                {item.product_name || 'N/A'}
              </Text>
              <Text style={styles.saleCustomer} numberOfLines={1}>
                {item.customer_name || 'N/A'}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.saleAmount}>
          <Text style={styles.amount}>{formatCurrency(item.total_amount)}</Text>
        </View>
      </View>

      <View style={styles.saleFooter}>
        <View style={styles.metaInfo}>
          <Text style={styles.metaText}>👤 {item.salesPerson || 'N/A'}</Text>
          <Text style={styles.metaText}>📅 {item.daysAgo === 0 ? 'Aujourd hui' : `${item.daysAgo}j`}</Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: `${getStatusColor(item.status)}20` },
          ]}
        >
          <Text style={[styles.statusBadgeText, { color: getStatusColor(item.status) }]}>
            {getStatusLabel(item.status)}
          </Text>
        </View>
      </View>

      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            { 
              backgroundColor: getStatusColor(item.status),
              width: item.status === 'completed' ? '100%' : item.status === 'pending' ? '50%' : '0%',
            },
          ]}
        />
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Chargement des ventes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* En-tête */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Ventes</Text>
          <Text style={styles.headerSubtitle}>
            {stats.total} ventes • {formatCurrency(stats.totalAmount)} total
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setNewSaleModalVisible(true)}
        >
          <Text style={styles.addButtonText}>+ Nouvelle</Text>
        </TouchableOpacity>
      </View>

      {/* Statistiques */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Ventes</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#34C759' }]}>{stats.completed}</Text>
          <Text style={styles.statLabel}>Terminées</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#FF9500' }]}>{stats.pending}</Text>
          <Text style={styles.statLabel}>En attente</Text>
        </View>
      </View>

      {/* Recherche */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher une vente..."
          placeholderTextColor="#8E8E93"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Filtres */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Statut:</Text>
            {(['all', 'pending', 'completed', 'cancelled'] as const).map((status) => (
              <TouchableOpacity
                key={status}
                style={[styles.filterChip, statusFilter === status && styles.filterChipActive]}
                onPress={() => setStatusFilter(status)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    statusFilter === status && styles.filterChipTextActive,
                  ]}
                >
                  {status === 'all'
                    ? 'Tous'
                    : status === 'pending'
                    ? 'Attente'
                    : status === 'completed'
                    ? 'Terminée'
                    : 'Annulée'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Montant:</Text>
            {(['all', 'small', 'medium', 'large'] as const).map((range) => (
              <TouchableOpacity
                key={range}
                style={[
                  styles.filterChip,
                  amountRange === range && styles.filterChipActive,
                ]}
                onPress={() => setAmountRange(range)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    amountRange === range && styles.filterChipTextActive,
                  ]}
                >
                  {range === 'all'
                    ? 'Tous'
                    : range === 'small'
                    ? '< 500€'
                    : range === 'medium'
                    ? '500-2k€'
                    : '> 2k€'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Tri:</Text>
            {(['recent', 'amount', 'status'] as const).map((sort) => (
              <TouchableOpacity
                key={sort}
                style={[styles.filterChip, sortBy === sort && styles.filterChipActive]}
                onPress={() => setSortBy(sort)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    sortBy === sort && styles.filterChipTextActive,
                  ]}
                >
                  {sort === 'recent'
                    ? 'Récent'
                    : sort === 'amount'
                    ? 'Montant'
                    : 'Statut'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Liste des ventes */}
      <FlatList
        data={filteredSales}
        renderItem={renderSaleCard}
        keyExtractor={(item) => item.id?.toString() || ''}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Aucune vente trouvée</Text>
          </View>
        }
      />

      {/* Modal Détails Vente */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedSale && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{selectedSale.product_name}</Text>
                  <TouchableOpacity onPress={() => setModalVisible(false)}>
                    <Text style={styles.closeButton}>×</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalBody}>
                  {/* Infos principales */}
                  <View style={styles.modalSection}>
                    <View style={styles.priceSection}>
                      <View>
                        <Text style={styles.modalLabel}>Montant</Text>
                        <Text style={styles.modalPrice}>
                          {formatCurrency(selectedSale.total_amount)}
                        </Text>
                      </View>
                      <View>
                        <Text style={styles.modalLabel}>Statut</Text>
                        <Text
                          style={[
                            styles.modalStatus,
                            { color: getStatusColor(selectedSale.status) },
                          ]}
                        >
                          {getStatusLabel(selectedSale.status)}
                        </Text>
                      </View>
                      <View>
                        <Text style={styles.modalLabel}>Quantité</Text>
                        <Text style={styles.modalQty}>
                          {selectedSale.quantity} unités
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Client et Vendeur */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Informations</Text>
                    <View style={styles.infoGrid}>
                      <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>Client</Text>
                        <Text style={styles.infoValue}>{selectedSale.customer_name || 'N/A'}</Text>
                      </View>
                      <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>Vendeur</Text>
                        <Text style={styles.infoValue}>{(selectedSale as any).salesPerson || 'N/A'}</Text>
                      </View>
                      <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>Date</Text>
                        <Text style={styles.infoValue}>
                          {new Date(selectedSale.sale_date || Date.now()).toLocaleDateString('fr-FR')}
                        </Text>
                      </View>
                    </View>
                  </View>
                </ScrollView>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => {
                      setModalVisible(false);
                      Alert.alert('À venir', 'Édition de vente en développement');
                    }}
                  >
                    <Text style={styles.actionButtonText}>Éditer</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.actionButtonDanger]}
                    onPress={() => {
                      setModalVisible(false);
                      Alert.alert('À venir', 'Suppression en développement');
                    }}
                  >
                    <Text style={styles.actionButtonTextDanger}>Supprimer</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal Création Vente */}
      <Modal visible={newSaleModalVisible} transparent animationType="slide" onRequestClose={() => setNewSaleModalVisible(false)}>
        <View style={styles.newModalContainer}>
          <View style={styles.newModalContent}>
            <View style={styles.newModalHeader}>
              <Text style={styles.newModalTitle}>Nouvelle Vente</Text>
              <TouchableOpacity onPress={() => setNewSaleModalVisible(false)}>
                <Text style={styles.closeButtonNew}>×</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.newModalBody}>
              {/* Titre */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Titre de la vente *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Description"
                  value={newSaleForm.title}
                  onChangeText={(text) => setNewSaleForm({ ...newSaleForm, title: text })}
                  placeholderTextColor="#8E8E93"
                />
              </View>

              {/* Client */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Client</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nom du client"
                  value={newSaleForm.customer}
                  onChangeText={(text) => setNewSaleForm({ ...newSaleForm, customer: text })}
                  placeholderTextColor="#8E8E93"
                />
              </View>

              {/* Montant */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Montant (€) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  value={newSaleForm.amount}
                  onChangeText={(text) => setNewSaleForm({ ...newSaleForm, amount: text })}
                  keyboardType="decimal-pad"
                  placeholderTextColor="#8E8E93"
                />
              </View>

              {/* Date */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Date de vente</Text>
                <TextInput
                  style={styles.input}
                  placeholder="YYYY-MM-DD"
                  value={newSaleForm.date}
                  onChangeText={(text) => setNewSaleForm({ ...newSaleForm, date: text })}
                  placeholderTextColor="#8E8E93"
                />
              </View>

              {/* Statut */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Statut</Text>
                <View style={styles.statusSelect}>
                  {(['pending', 'completed', 'cancelled'] as const).map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={[
                        styles.statusButton,
                        newSaleForm.status === s && styles.statusButtonActive,
                      ]}
                      onPress={() => setNewSaleForm({ ...newSaleForm, status: s })}
                    >
                      <Text
                        style={[
                          styles.statusButtonText,
                          { color: newSaleForm.status === s ? '#007AFF' : '#8E8E93' },
                        ]}
                      >
                        {s === 'pending' ? 'En attente' : s === 'completed' ? 'Terminé' : 'Annulé'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            <View style={styles.newModalFooter}>
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={() => {
                  handleResetSaleForm();
                  setNewSaleModalVisible(false);
                }}
              >
                <Text style={styles.buttonSecondaryText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.buttonPrimary]}
                onPress={handleCreateSale}
              >
                <Text style={styles.buttonPrimaryText}>Créer</Text>
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
    backgroundColor: '#F5F5F5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 12,
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
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F9F9F9',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 4,
    textAlign: 'center',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  searchInput: {
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#000000',
  },
  filtersContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  filterGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 8,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
    marginRight: 4,
  },
  filterChip: {
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#007AFF',
  },
  filterChipText: {
    fontSize: 13,
    color: '#666666',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  saleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  saleCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  saleInfo: {
    flex: 1,
    marginRight: 10,
  },
  emojiName: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  emoji: {
    fontSize: 28,
  },
  nameSection: {
    flex: 1,
  },
  saleName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  saleCustomer: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  saleAmount: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#34C759',
  },
  saleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#F9F9F9',
  },
  metaInfo: {
    flexDirection: 'row',
    gap: 12,
    flex: 1,
  },
  metaText: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressBar: {
    height: 3,
    backgroundColor: '#F2F2F7',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    flex: 1,
  },
  closeButton: {
    fontSize: 28,
    color: '#8E8E93',
    fontWeight: '300',
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  modalSection: {
    marginBottom: 24,
  },
  modalSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 12,
  },
  priceSection: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'space-between',
  },
  modalLabel: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },
  modalPrice: {
    fontSize: 22,
    fontWeight: '700',
    color: '#34C759',
    marginTop: 4,
  },
  modalStatus: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 4,
  },
  modalQty: {
    fontSize: 18,
    fontWeight: '700',
    color: '#007AFF',
    marginTop: 4,
  },
  infoGrid: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  infoItem: {
    flex: 1,
    backgroundColor: '#F9F9F9',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 11,
    color: '#8E8E93',
    marginBottom: 6,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  actionButtonDanger: {
    backgroundColor: '#F2F2F7',
  },
  actionButtonTextDanger: {
    color: '#FF3B30',
    fontSize: 16,
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
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#000000',
  },
  textArea: {
    textAlignVertical: 'top',
    paddingTop: 10,
    height: 80,
  },
  statusSelect: {
    flexDirection: 'row',
    gap: 8,
  },
  statusButton: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  statusButtonActive: {
    borderWidth: 2,
    borderColor: '#007AFF',
    backgroundColor: '#E3F2FD',
  },
  statusButtonText: {
    fontSize: 13,
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
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#007AFF',
  },
  buttonPrimaryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonSecondary: {
    backgroundColor: '#F2F2F7',
  },
  buttonSecondaryText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

