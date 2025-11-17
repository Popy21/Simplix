import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Platform,
  RefreshControl,
  Dimensions,
  Image,
} from 'react-native';
import { productService } from '../services/api';
import { Product } from '../types';
import GlassLayout from '../components/GlassLayout';
import ImageUpload from '../components/ImageUpload';

interface ProductWithDetails extends Product {
  category?: string;
  rating?: number;
  sales?: number;
  emoji?: string;
}

const { width } = Dimensions.get('window');
const cardWidth = (width - 52) / 2;

export default function ProductsScreen() {
  const [products, setProducts] = useState<ProductWithDetails[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<ProductWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<ProductWithDetails | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [newProductModalVisible, setNewProductModalVisible] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCategory, setSelectedCategory] = useState('Tous');
  const [priceRange, setPriceRange] = useState<'all' | 'budget' | 'mid' | 'premium'>('all');

  const [editingProduct, setEditingProduct] = useState<ProductWithDetails | null>(null);
  const [newProductForm, setNewProductForm] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    images: [] as string[],
    category: 'Logiciel',
  });

  const categories = ['Tous', 'Logiciel', 'Service', 'Formation', 'Support', 'Licence'];
  const emojis = ['💻', '⚙️', '📱', '🎓', '🛠️', '📜', '🎯', '📊', '🔐', '🚀'];


  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [searchQuery, selectedCategory, priceRange, products, viewMode]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await productService.getAll();
      const productsData = response.data.data || response.data;
      const productsWithDetails = productsData.map((p: Product, index: number) => ({
        ...p,
        category: categories[Math.floor(Math.random() * (categories.length - 1)) + 1],
        emoji: emojis[index % emojis.length],
        rating: 4 + Math.random(),
        sales: Math.floor(Math.random() * 500),
      }));
      setProducts(productsWithDetails);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de charger les produits');
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterProducts = () => {
    let filtered = products;

    // Filtre par catégorie
    if (selectedCategory !== 'Tous') {
      filtered = filtered.filter((p) => p.category === selectedCategory);
    }

    // Filtre par plage de prix
    if (priceRange === 'budget') {
      filtered = filtered.filter((p) => p.price < 100);
    } else if (priceRange === 'mid') {
      filtered = filtered.filter((p) => p.price >= 100 && p.price <= 500);
    } else if (priceRange === 'premium') {
      filtered = filtered.filter((p) => p.price > 500);
    }

    // Filtre recherche
    if (searchQuery) {
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Tri par nom
    filtered.sort((a, b) => a.name.localeCompare(b.name));

    setFilteredProducts(filtered);
  };

  const handleCreateProduct = async () => {
    if (!newProductForm.name.trim() || !newProductForm.price.trim()) {
      Alert.alert('Erreur', 'Le nom et le prix sont obligatoires');
      return;
    }

    try {
      const productData = {
        name: newProductForm.name,
        description: newProductForm.description,
        price: parseFloat(newProductForm.price) || 0,
        stock: parseInt(newProductForm.stock) || 0,
        images: newProductForm.images,
      };

      if (editingProduct) {
        await productService.update(editingProduct.id as number, productData as any);
        Alert.alert('Succès', `Produit ${productData.name} modifié avec succès`);
      } else {
        await productService.create(productData as any);
        Alert.alert('Succès', `Produit ${productData.name} créé avec succès`);
      }

      handleResetProductForm();
      setNewProductModalVisible(false);
      loadProducts();
    } catch (error) {
      console.error('Error saving product:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder le produit');
    }
  };

  const handleResetProductForm = () => {
    setNewProductForm({
      name: '',
      description: '',
      price: '',
      stock: '',
      images: [],
      category: 'Logiciel',
    });
    setEditingProduct(null);
  };

  const handleEditProduct = (product: ProductWithDetails) => {
    const images = (product as any).images || [];
    setEditingProduct(product);
    setNewProductForm({
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      stock: product.stock.toString(),
      images: Array.isArray(images) ? images : [],
      category: product.category || 'Logiciel',
    });
    setModalVisible(false);
    setNewProductModalVisible(true);
  };

  const handleDeleteProduct = async (product: ProductWithDetails) => {
    const confirmDelete = () => {
      productService.delete(product.id as number).then(() => {
        setModalVisible(false);
        loadProducts();
        Alert.alert('Succès', 'Produit supprimé avec succès');
      }).catch((error) => {
        console.error('Error deleting product:', error);
        Alert.alert('Erreur', 'Impossible de supprimer le produit');
      });
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) {
        confirmDelete();
      }
    } else {
      Alert.alert(
        'Confirmer',
        'Êtes-vous sûr de vouloir supprimer ce produit ?',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Supprimer', onPress: confirmDelete, style: 'destructive' },
        ]
      );
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadProducts();
  };

  const openProductDetails = (product: ProductWithDetails) => {
    setSelectedProduct(product);
    setModalVisible(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getStockColor = (stock: number) => {
    if (stock === 0) return '#FF3B30';
    if (stock < 10) return '#FF9500';
    return '#34C759';
  };

  const stats = {
    total: products.length,
    totalValue: products.reduce((sum, p) => sum + p.price * p.stock, 0),
    lowStock: products.filter((p) => p.stock > 0 && p.stock < 10).length,
    outOfStock: products.filter((p) => p.stock === 0).length,
  };

  const renderProductCard = ({ item }: { item: ProductWithDetails }) => {
    const images = (item as any).images || [];
    const firstImage = Array.isArray(images) && images.length > 0 ? images[0] : null;

    return (
      <TouchableOpacity
        style={styles.productCard}
        onPress={() => openProductDetails(item)}
        activeOpacity={0.7}
      >
        {firstImage && (
          <Image source={{ uri: firstImage }} style={styles.productImage} />
        )}
        <View style={styles.productCardHeader}>
          <View style={styles.productInfo}>
            <Text style={styles.productName} numberOfLines={2}>
              {item.name}
            </Text>
            {item.category && (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{item.category}</Text>
              </View>
            )}
          </View>
          <View
            style={[
              styles.stockBadge,
              { backgroundColor: `${getStockColor(item.stock)}20` },
            ]}
          >
            <Text style={[styles.stockBadgeText, { color: getStockColor(item.stock) }]}>
              {item.stock > 0 ? item.stock : '0'}
            </Text>
          </View>
        </View>

        {item.description && (
          <Text style={styles.productDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}

      <View style={styles.productFooter}>
        <View>
          <Text style={styles.priceLabel}>Prix</Text>
          <Text style={styles.price}>{formatCurrency(item.price)}</Text>
        </View>
        <View style={styles.divider} />
        <View>
          <Text style={styles.salesLabel}>Ventes</Text>
          <Text style={styles.sales}>{item.sales || 0}</Text>
        </View>
        <View style={styles.divider} />
        <View>
          <Text style={styles.ratingLabel}>Note</Text>
          <Text style={styles.rating}>⭐ {(item.rating || 4.5).toFixed(1)}</Text>
        </View>
      </View>

        <View style={styles.statusBar}>
        <View
          style={[
            styles.statusIndicator,
            { backgroundColor: getStockColor(item.stock), width: `${(item.stock / 100) * 100}%` },
          ]}
        />
      </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Chargement des produits...</Text>
      </View>
    );
  }

  return (
    <GlassLayout>
      <View style={styles.container}>
      
      {/* En-tête */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Produits</Text>
          <Text style={styles.headerSubtitle}>
            {stats.total} produits • {formatCurrency(stats.totalValue)} total
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setNewProductModalVisible(true)}
        >
          <Text style={styles.addButtonText}>+ Nouveau</Text>
        </TouchableOpacity>
      </View>

      {/* Statistiques */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Produits</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#FF9500' }]}>{stats.lowStock}</Text>
          <Text style={styles.statLabel}>Faible stock</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#FF3B30' }]}>{stats.outOfStock}</Text>
          <Text style={styles.statLabel}>Rupture</Text>
        </View>
      </View>

      {/* Recherche */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un produit..."
          placeholderTextColor="#8E8E93"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Filtres - Catégories */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Catégorie:</Text>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.filterChip, selectedCategory === cat && styles.filterChipActive]}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedCategory === cat && styles.filterChipTextActive,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Prix:</Text>
            {(['all', 'budget', 'mid', 'premium'] as const).map((range) => (
              <TouchableOpacity
                key={range}
                style={[
                  styles.filterChip,
                  priceRange === range && styles.filterChipActive,
                ]}
                onPress={() => setPriceRange(range)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    priceRange === range && styles.filterChipTextActive,
                  ]}
                >
                  {range === 'all'
                    ? 'Tous'
                    : range === 'budget'
                    ? '< 100€'
                    : range === 'mid'
                    ? '100-500€'
                    : '> 500€'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.viewModeContainer}>
            <TouchableOpacity
              style={[styles.viewModeBtn, viewMode === 'grid' && styles.viewModeBtnActive]}
              onPress={() => setViewMode('grid')}
            >
              <Text style={styles.viewModeText}>⊞ Grille</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.viewModeBtn, viewMode === 'list' && styles.viewModeBtnActive]}
              onPress={() => setViewMode('list')}
            >
              <Text style={styles.viewModeText}>☰ Liste</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>

      {/* Liste des produits */}
      <FlatList
        data={filteredProducts}
        renderItem={renderProductCard}
        keyExtractor={(item) => item.id?.toString() || ''}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Aucun produit trouvé</Text>
          </View>
        }
      />

      {/* Modal Détails Produit */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedProduct && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{selectedProduct.name}</Text>
                  <TouchableOpacity onPress={() => setModalVisible(false)}>
                    <Text style={styles.closeButton}>✕</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalBody}>
                  {/* Infos principales */}
                  <View style={styles.modalSection}>
                    <View style={styles.priceSection}>
                      <View>
                        <Text style={styles.modalLabel}>Prix unitaire</Text>
                        <Text style={styles.modalPrice}>
                          {formatCurrency(selectedProduct.price)}
                        </Text>
                      </View>
                      <View>
                        <Text style={styles.modalLabel}>Stock</Text>
                        <Text
                          style={[
                            styles.modalStock,
                            { color: getStockColor(selectedProduct.stock) },
                          ]}
                        >
                          {selectedProduct.stock} unités
                        </Text>
                      </View>
                      <View>
                        <Text style={styles.modalLabel}>Valeur stock</Text>
                        <Text style={styles.modalValue}>
                          {formatCurrency(
                            selectedProduct.price * selectedProduct.stock
                          )}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Description */}
                  {selectedProduct.description && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>Description</Text>
                      <Text style={styles.modalDescription}>
                        {selectedProduct.description}
                      </Text>
                    </View>
                  )}

                  {/* Statistiques */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Statistiques</Text>
                    <View style={styles.statsGrid}>
                      <View style={styles.statItem}>
                        <Text style={styles.statItemLabel}>Ventes</Text>
                        <Text style={styles.statItemValue}>{selectedProduct.sales || 0}</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text style={styles.statItemLabel}>Catégorie</Text>
                        <Text style={styles.statItemValue}>
                          {selectedProduct.category || 'N/A'}
                        </Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text style={styles.statItemLabel}>Note</Text>
                        <Text style={styles.statItemValue}>
                          ⭐ {(selectedProduct.rating || 4.5).toFixed(1)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </ScrollView>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleEditProduct(selectedProduct)}
                  >
                    <Text style={styles.actionButtonText}>Éditer</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.actionButtonDanger]}
                    onPress={() => handleDeleteProduct(selectedProduct)}
                  >
                    <Text style={styles.actionButtonTextDanger}>Supprimer</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal Création Produit */}
      <Modal
        visible={newProductModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setNewProductModalVisible(false)}
      >
        <View style={styles.newModalContainer}>
          <View style={styles.newModalContent}>
            <View style={styles.newModalHeader}>
              <Text style={styles.newModalTitle}>
                {editingProduct ? 'Modifier le Produit' : 'Nouveau Produit'}
              </Text>
              <TouchableOpacity onPress={() => { setNewProductModalVisible(false); handleResetProductForm(); }}>
                <Text style={styles.closeButtonNew}>×</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.newModalBody}>
              {/* Nom */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Nom du produit *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Licence CRM Pro"
                  value={newProductForm.name}
                  onChangeText={(text) =>
                    setNewProductForm({ ...newProductForm, name: text })
                  }
                  placeholderTextColor="#8E8E93"
                />
              </View>

              {/* Description */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Description du produit..."
                  value={newProductForm.description}
                  onChangeText={(text) =>
                    setNewProductForm({ ...newProductForm, description: text })
                  }
                  placeholderTextColor="#8E8E93"
                  multiline
                  numberOfLines={4}
                />
              </View>

              {/* Catégorie */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Catégorie</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {categories.slice(1).map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.filterChip,
                          newProductForm.category === cat && styles.filterChipActive,
                        ]}
                        onPress={() => setNewProductForm({ ...newProductForm, category: cat })}
                      >
                        <Text
                          style={[
                            styles.filterChipText,
                            newProductForm.category === cat && styles.filterChipTextActive,
                          ]}
                        >
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              {/* Prix */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Prix (€) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  value={newProductForm.price}
                  onChangeText={(text) =>
                    setNewProductForm({ ...newProductForm, price: text })
                  }
                  keyboardType="decimal-pad"
                  placeholderTextColor="#8E8E93"
                />
              </View>

              {/* Stock */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Stock</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Quantité disponible"
                  value={newProductForm.stock}
                  onChangeText={(text) =>
                    setNewProductForm({ ...newProductForm, stock: text })
                  }
                  keyboardType="number-pad"
                  placeholderTextColor="#8E8E93"
                />
              </View>

              {/* Images */}
              <ImageUpload
                label="Images du produit"
                value={newProductForm.images}
                onChange={(urls) => setNewProductForm({ ...newProductForm, images: urls as string[] })}
                multiple={true}
              />
            </ScrollView>

            <View style={styles.newModalFooter}>
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={() => {
                  handleResetProductForm();
                  setNewProductModalVisible(false);
                }}
              >
                <Text style={styles.buttonSecondaryText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.buttonPrimary]}
                onPress={handleCreateProduct}
              >
                <Text style={styles.buttonPrimaryText}>
                  {editingProduct ? 'Modifier' : 'Créer'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
    </GlassLayout>
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
  viewModeContainer: {
    flexDirection: 'row',
    marginLeft: 16,
    gap: 8,
  },
  viewModeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F2F2F7',
    marginRight: 8,
  },
  viewModeBtnActive: {
    backgroundColor: '#007AFF',
  },
  viewModeText: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  productCard: {
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
  productImage: {
    width: '100%',
    height: 150,
    resizeMode: 'cover',
  },
  productCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  productInfo: {
    flex: 1,
    marginRight: 10,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 6,
  },
  categoryBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#007AFF',
  },
  stockBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  stockBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  productDescription: {
    fontSize: 13,
    color: '#666666',
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  productFooter: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingBottom: 12,
    alignItems: 'center',
    gap: 8,
  },
  priceLabel: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '500',
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: '#34C759',
    marginTop: 2,
  },
  salesLabel: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '500',
  },
  sales: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
    marginTop: 2,
  },
  ratingLabel: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '500',
  },
  rating: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FF9500',
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E5EA',
  },
  statusBar: {
    height: 3,
    backgroundColor: '#F2F2F7',
    overflow: 'hidden',
  },
  statusIndicator: {
    height: '100%',
    backgroundColor: '#34C759',
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
  modalStock: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 4,
  },
  modalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#007AFF',
    marginTop: 4,
  },
  modalDescription: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
    backgroundColor: '#F9F9F9',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  statItemLabel: {
    fontSize: 11,
    color: '#8E8E93',
    marginBottom: 6,
  },
  statItemValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#007AFF',
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

