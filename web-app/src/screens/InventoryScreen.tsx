import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { PackageIcon, AlertTriangleIcon } from '../components/Icons';
import Navigation from '../components/Navigation';
import { inventoryService } from '../services/api';

type InventoryScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Inventory'>;
};

export default function InventoryScreen({ navigation }: InventoryScreenProps) {
  const [inventory, setInventory] = useState<any[]>([]);
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      const [inventoryRes, lowStockRes] = await Promise.all([
        inventoryService.getAll(),
        inventoryService.getLowStock(),
      ]);
      setInventory(inventoryRes.data || []);
      setLowStock(lowStockRes.data || []);
    } catch (error) {
      console.error(error);
      Alert.alert('Erreur', 'Impossible de charger l\'inventaire');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const displayedItems = showLowStockOnly ? lowStock : inventory;

  return (
    <View style={styles.container}>
      <Navigation navigation={navigation} />

      <View style={styles.header}>
        <Text style={styles.title}>Inventaire</Text>
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterButton, !showLowStockOnly && styles.filterButtonActive]}
            onPress={() => setShowLowStockOnly(false)}
          >
            <Text style={[styles.filterText, !showLowStockOnly && styles.filterTextActive]}>Tous</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, showLowStockOnly && styles.filterButtonActive]}
            onPress={() => setShowLowStockOnly(true)}
          >
            <Text style={[styles.filterText, showLowStockOnly && styles.filterTextActive]}>Stock faible</Text>
          </TouchableOpacity>
        </View>
      </View>

      {lowStock.length > 0 && (
        <View style={styles.alertBanner}>
          <AlertTriangleIcon size={20} color="#F59E0B" />
          <Text style={styles.alertText}>{lowStock.length} produit(s) en stock faible</Text>
        </View>
      )}

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchInventory(); }} />}
      >
        {loading ? (
          <Text style={styles.loadingText}>Chargement...</Text>
        ) : displayedItems.length === 0 ? (
          <Text style={styles.emptyText}>Aucun produit en stock</Text>
        ) : (
          displayedItems.map((item) => {
            const isLowStock = item.quantity_on_hand <= (item.reorder_point || 0);
            return (
              <View key={item.id} style={[styles.itemCard, isLowStock && styles.itemCardLowStock]}>
                <View style={styles.itemHeader}>
                  <PackageIcon size={24} color={isLowStock ? '#F59E0B' : '#6366F1'} />
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.product_name || 'Produit'}</Text>
                    <Text style={styles.warehouseName}>{item.warehouse_name || 'Entrepôt principal'}</Text>
                  </View>
                  {isLowStock && (
                    <View style={styles.lowStockBadge}>
                      <AlertTriangleIcon size={16} color="#F59E0B" />
                    </View>
                  )}
                </View>

                <View style={styles.itemDetails}>
                  <View style={styles.stockRow}>
                    <Text style={styles.detailLabel}>Stock disponible:</Text>
                    <Text style={[styles.stockValue, isLowStock && styles.stockValueLow]}>
                      {item.quantity_on_hand || 0} unités
                    </Text>
                  </View>
                  {item.quantity_reserved > 0 && (
                    <Text style={styles.detailText}>Réservé: {item.quantity_reserved} unités</Text>
                  )}
                  {item.reorder_point && (
                    <Text style={styles.detailText}>Seuil de réappro: {item.reorder_point} unités</Text>
                  )}
                  {item.unit_cost && (
                    <Text style={styles.detailText}>Coût unitaire: {item.unit_cost}€</Text>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 12 },
  filterRow: { flexDirection: 'row', gap: 8 },
  filterButton: { flex: 1, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, borderColor: '#D1D5DB', alignItems: 'center' },
  filterButtonActive: { backgroundColor: '#6366F1', borderColor: '#6366F1' },
  filterText: { color: '#6B7280', fontWeight: '600' },
  filterTextActive: { color: '#fff' },
  alertBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', padding: 12, gap: 8 },
  alertText: { color: '#92400E', fontWeight: '600' },
  content: { flex: 1, padding: 16 },
  loadingText: { textAlign: 'center', marginTop: 20, color: '#6B7280' },
  emptyText: { textAlign: 'center', marginTop: 40, color: '#6B7280', fontSize: 16 },
  itemCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  itemCardLowStock: { borderLeftWidth: 4, borderLeftColor: '#F59E0B' },
  itemHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  itemInfo: { flex: 1, marginLeft: 12 },
  itemName: { fontSize: 18, fontWeight: '600', color: '#111827' },
  warehouseName: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  lowStockBadge: { backgroundColor: '#FEF3C7', padding: 8, borderRadius: 20 },
  itemDetails: { borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 12 },
  stockRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  detailLabel: { fontSize: 14, color: '#6B7280' },
  stockValue: { fontSize: 18, fontWeight: 'bold', color: '#10B981' },
  stockValueLow: { color: '#F59E0B' },
  detailText: { fontSize: 14, color: '#6B7280', marginBottom: 4 },
});
