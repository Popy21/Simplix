import React, { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { searchService } from '../services/api';
import {
  UsersIcon,
  BuildingIcon,
  FileTextIcon,
  PackageIcon,
  DollarIcon,
  ClockIcon,
  XCircleIcon,
} from './Icons';

interface GlobalSearchProps {
  visible: boolean;
  onClose: () => void;
  navigation: any;
}

export default function GlobalSearch({ visible, onClose, navigation }: GlobalSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>({
    contacts: [],
    companies: [],
    quotes: [],
    invoices: [],
    products: [],
    tasks: [],
  });

  useEffect(() => {
    if (searchQuery.length >= 2) {
      performSearch();
    } else {
      setResults({
        contacts: [],
        companies: [],
        quotes: [],
        invoices: [],
        products: [],
        tasks: [],
      });
    }
  }, [searchQuery]);

  const performSearch = async () => {
    setLoading(true);
    try {
      const res = await searchService.global(searchQuery);
      setResults(res.data);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectResult = (type: string, item: any) => {
    onClose();
    setSearchQuery('');

    switch (type) {
      case 'contact':
        navigation.navigate('Contacts', { customerId: item.id });
        break;
      case 'company':
        navigation.navigate('Contacts', { companyId: item.id });
        break;
      case 'quote':
        navigation.navigate('Invoices', { quoteId: item.id });
        break;
      case 'invoice':
        navigation.navigate('Invoices', { invoiceId: item.id });
        break;
      case 'product':
        navigation.navigate('Products', { productId: item.id });
        break;
      case 'task':
        navigation.navigate('Tasks', { taskId: item.id });
        break;
    }
  };

  const getTotalResults = () => {
    return Object.values(results).reduce((sum: number, arr: any) => sum + (arr?.length || 0), 0);
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.searchContainer}>
          <View style={styles.searchHeader}>
            <View style={styles.searchInputContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Rechercher contacts, devis, factures..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
                returnKeyType="search"
              />
              {loading && <ActivityIndicator size="small" color="#007AFF" style={styles.loadingIndicator} />}
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <XCircleIcon size={24} color="#8E8E93" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.resultsContainer}>
            {searchQuery.length >= 2 ? (
              getTotalResults() > 0 ? (
                <>
                  {/* Contacts */}
                  {results.contacts?.length > 0 && (
                    <View style={styles.resultSection}>
                      <Text style={styles.sectionTitle}>
                        <UsersIcon size={16} color="#007AFF" /> Contacts ({results.contacts.length})
                      </Text>
                      {results.contacts.map((contact: any) => (
                        <TouchableOpacity
                          key={contact.id}
                          style={styles.resultItem}
                          onPress={() => handleSelectResult('contact', contact)}
                        >
                          <UsersIcon size={20} color="#007AFF" />
                          <View style={styles.resultInfo}>
                            <Text style={styles.resultTitle}>
                              {contact.first_name} {contact.last_name}
                            </Text>
                            <Text style={styles.resultSubtitle}>{contact.email || contact.phone}</Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  {/* Companies */}
                  {results.companies?.length > 0 && (
                    <View style={styles.resultSection}>
                      <Text style={styles.sectionTitle}>
                        <BuildingIcon size={16} color="#FF9500" /> Entreprises ({results.companies.length})
                      </Text>
                      {results.companies.map((company: any) => (
                        <TouchableOpacity
                          key={company.id}
                          style={styles.resultItem}
                          onPress={() => handleSelectResult('company', company)}
                        >
                          <BuildingIcon size={20} color="#FF9500" />
                          <View style={styles.resultInfo}>
                            <Text style={styles.resultTitle}>{company.name}</Text>
                            <Text style={styles.resultSubtitle}>{company.industry || 'Entreprise'}</Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  {/* Quotes */}
                  {results.quotes?.length > 0 && (
                    <View style={styles.resultSection}>
                      <Text style={styles.sectionTitle}>
                        <FileTextIcon size={16} color="#AF52DE" /> Devis ({results.quotes.length})
                      </Text>
                      {results.quotes.map((quote: any) => (
                        <TouchableOpacity
                          key={quote.id}
                          style={styles.resultItem}
                          onPress={() => handleSelectResult('quote', quote)}
                        >
                          <FileTextIcon size={20} color="#AF52DE" />
                          <View style={styles.resultInfo}>
                            <Text style={styles.resultTitle}>{quote.quote_number}</Text>
                            <Text style={styles.resultSubtitle}>
                              {quote.customer_name} • {parseFloat(quote.total_amount).toFixed(2)} €
                            </Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  {/* Invoices */}
                  {results.invoices?.length > 0 && (
                    <View style={styles.resultSection}>
                      <Text style={styles.sectionTitle}>
                        <DollarIcon size={16} color="#34C759" /> Factures ({results.invoices.length})
                      </Text>
                      {results.invoices.map((invoice: any) => (
                        <TouchableOpacity
                          key={invoice.id}
                          style={styles.resultItem}
                          onPress={() => handleSelectResult('invoice', invoice)}
                        >
                          <DollarIcon size={20} color="#34C759" />
                          <View style={styles.resultInfo}>
                            <Text style={styles.resultTitle}>{invoice.invoice_number}</Text>
                            <Text style={styles.resultSubtitle}>
                              {invoice.customer_name} • {parseFloat(invoice.total_amount).toFixed(2)} €
                            </Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  {/* Products */}
                  {results.products?.length > 0 && (
                    <View style={styles.resultSection}>
                      <Text style={styles.sectionTitle}>
                        <PackageIcon size={16} color="#FF3B30" /> Produits ({results.products.length})
                      </Text>
                      {results.products.map((product: any) => (
                        <TouchableOpacity
                          key={product.id}
                          style={styles.resultItem}
                          onPress={() => handleSelectResult('product', product)}
                        >
                          <PackageIcon size={20} color="#FF3B30" />
                          <View style={styles.resultInfo}>
                            <Text style={styles.resultTitle}>{product.name}</Text>
                            <Text style={styles.resultSubtitle}>{parseFloat(product.price).toFixed(2)} €</Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  {/* Tasks */}
                  {results.tasks?.length > 0 && (
                    <View style={styles.resultSection}>
                      <Text style={styles.sectionTitle}>
                        <ClockIcon size={16} color="#5856D6" /> Tâches ({results.tasks.length})
                      </Text>
                      {results.tasks.map((task: any) => (
                        <TouchableOpacity
                          key={task.id}
                          style={styles.resultItem}
                          onPress={() => handleSelectResult('task', task)}
                        >
                          <ClockIcon size={20} color="#5856D6" />
                          <View style={styles.resultInfo}>
                            <Text style={styles.resultTitle}>{task.title}</Text>
                            <Text style={styles.resultSubtitle}>{task.contact_name || 'Tâche'}</Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </>
              ) : (
                !loading && (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>Aucun résultat pour "{searchQuery}"</Text>
                  </View>
                )
              )
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>Tapez au moins 2 caractères pour rechercher</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-start',
    paddingTop: Platform.OS === 'web' ? 60 : 80,
  },
  searchContainer: {
    marginHorizontal: Platform.OS === 'web' ? '20%' : 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
  },
  loadingIndicator: {
    marginLeft: 12,
  },
  closeButton: {
    marginLeft: 12,
    padding: 4,
  },
  resultsContainer: {
    maxHeight: 500,
  },
  resultSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8E8E93',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  resultInfo: {
    flex: 1,
    marginLeft: 12,
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  resultSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
});
