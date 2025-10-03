import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { saleService } from '../services/api';
import { Sale } from '../types';

export default function SalesScreen() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSales();
  }, []);

  const loadSales = async () => {
    try {
      setLoading(true);
      const response = await saleService.getAll();
      setSales(response.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load sales');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: Sale }) => (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.customer}>👤 {item.customer_name || 'N/A'}</Text>
        <Text style={[styles.status, getStatusStyle(item.status)]}>
          {item.status?.toUpperCase() || 'PENDING'}
        </Text>
      </View>
      <Text style={styles.product}>📦 {item.product_name || 'N/A'}</Text>
      <View style={styles.row}>
        <Text style={styles.detail}>Qty: {item.quantity}</Text>
        <Text style={styles.amount}>${item.total_amount.toFixed(2)}</Text>
      </View>
      {item.sale_date && (
        <Text style={styles.date}>
          {new Date(item.sale_date).toLocaleDateString()}
        </Text>
      )}
    </View>
  );

  const getStatusStyle = (status?: string) => {
    switch (status) {
      case 'completed':
        return styles.statusCompleted;
      case 'pending':
        return styles.statusPending;
      case 'cancelled':
        return styles.statusCancelled;
      default:
        return styles.statusPending;
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={sales}
        renderItem={renderItem}
        keyExtractor={(item) => item.id?.toString() || ''}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No sales found</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  customer: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  status: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusPending: {
    backgroundColor: '#FFF3E0',
    color: '#F57C00',
  },
  statusCompleted: {
    backgroundColor: '#E8F5E9',
    color: '#388E3C',
  },
  statusCancelled: {
    backgroundColor: '#FFEBEE',
    color: '#D32F2F',
  },
  product: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detail: {
    fontSize: 14,
    color: '#666',
  },
  amount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  date: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#999',
    marginTop: 32,
  },
});
