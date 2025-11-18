import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { UsersIcon, TrendingUpIcon } from '../components/Icons';
import { withGlassLayout } from '../components/withGlassLayout';

type DocumentsScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Dashboard'>;
};

interface DocumentVersion {
  id: string;
  version: number;
  uploadDate: string;
  size: string;
  uploadedBy: string;
}

interface Document {
  id: string;
  name: string;
  type: string;
  size: string;
  uploadDate: string;
  lastModified: string;
  uploadedBy: string;
  versions: DocumentVersion[];
  sharedWith: number;
  status: 'active' | 'archived';
  category: string;
}

function DocumentsScreen({ navigation }: DocumentsScreenProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [filterCategory, setFilterCategory] = useState('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = () => {
    const mockDocs: Document[] = [
      {
        id: 'd1',
        name: 'Contrat_Acme_Corp_2025.pdf',
        type: 'PDF',
        size: '2.4 MB',
        uploadDate: '2025-11-15',
        lastModified: '2025-11-18',
        uploadedBy: 'Sophie Durand',
        versions: [
          { id: 'v1', version: 3, uploadDate: '2025-11-18', size: '2.4 MB', uploadedBy: 'Sophie Durand' },
          { id: 'v2', version: 2, uploadDate: '2025-11-16', size: '2.3 MB', uploadedBy: 'Laurent Michel' },
          { id: 'v3', version: 1, uploadDate: '2025-11-15', size: '2.1 MB', uploadedBy: 'Sophie Durand' },
        ],
        sharedWith: 5,
        status: 'active',
        category: 'contracts',
      },
      {
        id: 'd2',
        name: 'Facture_001_Nov2025.pdf',
        type: 'PDF',
        size: '1.1 MB',
        uploadDate: '2025-11-10',
        lastModified: '2025-11-10',
        uploadedBy: 'Marie Martin',
        versions: [
          { id: 'v1', version: 1, uploadDate: '2025-11-10', size: '1.1 MB', uploadedBy: 'Marie Martin' },
        ],
        sharedWith: 3,
        status: 'active',
        category: 'invoices',
      },
      {
        id: 'd3',
        name: 'Proposition_Technique_v2.docx',
        type: 'DOCX',
        size: '3.2 MB',
        uploadDate: '2025-11-12',
        lastModified: '2025-11-19',
        uploadedBy: 'Jean Dupont',
        versions: [
          { id: 'v1', version: 2, uploadDate: '2025-11-19', size: '3.2 MB', uploadedBy: 'Jean Dupont' },
          { id: 'v2', version: 1, uploadDate: '2025-11-12', size: '3.0 MB', uploadedBy: 'Jean Dupont' },
        ],
        sharedWith: 7,
        status: 'active',
        category: 'proposals',
      },
      {
        id: 'd4',
        name: 'Devis_StartupXYZ_58k.pdf',
        type: 'PDF',
        size: '1.8 MB',
        uploadDate: '2025-11-08',
        lastModified: '2025-11-08',
        uploadedBy: 'Pierre Leroy',
        versions: [
          { id: 'v1', version: 1, uploadDate: '2025-11-08', size: '1.8 MB', uploadedBy: 'Pierre Leroy' },
        ],
        sharedWith: 2,
        status: 'archived',
        category: 'quotes',
      },
      {
        id: 'd5',
        name: 'Présentation_CRM_2025.pptx',
        type: 'PPTX',
        size: '5.6 MB',
        uploadDate: '2025-11-05',
        lastModified: '2025-11-17',
        uploadedBy: 'Sophie Durand',
        versions: [
          { id: 'v1', version: 3, uploadDate: '2025-11-17', size: '5.6 MB', uploadedBy: 'Sophie Durand' },
          { id: 'v2', version: 2, uploadDate: '2025-11-10', size: '5.3 MB', uploadedBy: 'Marie Martin' },
          { id: 'v3', version: 1, uploadDate: '2025-11-05', size: '5.1 MB', uploadedBy: 'Sophie Durand' },
        ],
        sharedWith: 12,
        status: 'active',
        category: 'presentations',
      },
      {
        id: 'd6',
        name: 'Rapport_Analyse_Q4.xlsx',
        type: 'XLSX',
        size: '2.9 MB',
        uploadDate: '2025-11-01',
        lastModified: '2025-11-19',
        uploadedBy: 'Laurent Michel',
        versions: [
          { id: 'v1', version: 2, uploadDate: '2025-11-19', size: '2.9 MB', uploadedBy: 'Laurent Michel' },
          { id: 'v2', version: 1, uploadDate: '2025-11-01', size: '2.5 MB', uploadedBy: 'Laurent Michel' },
        ],
        sharedWith: 4,
        status: 'active',
        category: 'reports',
      },
    ];

    setDocuments(mockDocs);
  };

  const getFileIcon = (type: string) => {
    const icons: { [key: string]: string } = {
      PDF: '📄',
      DOCX: '📝',
      XLSX: '📊',
      PPTX: '🎯',
      default: '📁',
    };
    return icons[type] || icons.default;
  };

  const getCategoryLabel = (category: string) => {
    const labels: { [key: string]: string } = {
      contracts: 'Contrats',
      invoices: 'Factures',
      proposals: 'Propositions',
      quotes: 'Devis',
      presentations: 'Présentations',
      reports: 'Rapports',
    };
    return labels[category] || category;
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      contracts: '#FF9500',
      invoices: '#34C759',
      proposals: '#007AFF',
      quotes: '#5856D6',
      presentations: '#FF3B30',
      reports: '#00B894',
    };
    return colors[category] || '#8E8E93';
  };

  const filteredDocs = filterCategory === 'all'
    ? documents
    : documents.filter(doc => doc.category === filterCategory);

  const renderDocumentCard = ({ item: doc }: { item: Document }) => (
    <TouchableOpacity
      style={styles.documentCard}
      onPress={() => {
        setSelectedDoc(doc);
        setDetailsVisible(true);
      }}
    >
      <View style={styles.docCardContent}>
        <View style={styles.docIconSection}>
          <Text style={styles.docIcon}>{getFileIcon(doc.type)}</Text>
          {doc.versions.length > 1 && (
            <View style={styles.versionBadge}>
              <Text style={styles.versionBadgeText}>v{doc.versions[0].version}</Text>
            </View>
          )}
        </View>

        <View style={styles.docInfo}>
          <Text style={styles.docName} numberOfLines={2}>{doc.name}</Text>
          <View style={styles.docMeta}>
            <Text style={styles.docMetaText}>{doc.type}</Text>
            <Text style={styles.docMetaDot}>•</Text>
            <Text style={styles.docMetaText}>{doc.size}</Text>
            <Text style={styles.docMetaDot}>•</Text>
            <Text style={styles.docMetaText}>{doc.uploadDate}</Text>
          </View>
        </View>

        <View style={styles.docActions}>
          {doc.sharedWith > 0 && (
            <View style={styles.sharedBadge}>
              <UsersIcon size={12} color="#007AFF" />
              <Text style={styles.sharedCount}>{doc.sharedWith}</Text>
            </View>
          )}
          {doc.status === 'archived' && (
            <View style={styles.archivedBadge}>
              <Text style={styles.archivedBadgeText}>Archivé</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderCategoryFilter = () => {
    const categories = ['all', 'contracts', 'invoices', 'proposals', 'quotes', 'presentations', 'reports'];
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContent}
      >
        {categories.map(cat => (
          <TouchableOpacity
            key={cat}
            style={[
              styles.filterButton,
              filterCategory === cat && styles.filterButtonActive,
            ]}
            onPress={() => setFilterCategory(cat)}
          >
            <Text
              style={[
                styles.filterButtonText,
                filterCategory === cat && styles.filterButtonTextActive,
              ]}
            >
              {cat === 'all' ? 'Tous' : getCategoryLabel(cat)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>📄 Documents</Text>
          <TouchableOpacity style={styles.uploadButton}>
            <Text style={styles.uploadButtonText}>+ Importer</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.headerSubtitle}>Centralisez vos documents avec versioning</Text>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{documents.length}</Text>
          <Text style={styles.statLabel}>Documents</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {documents.reduce((sum, doc) => sum + doc.versions.length, 0)}
          </Text>
          <Text style={styles.statLabel}>Versions</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {documents.filter(doc => doc.status === 'active').length}
          </Text>
          <Text style={styles.statLabel}>Actifs</Text>
        </View>
      </View>

      {/* Category Filter */}
      {renderCategoryFilter()}

      {/* Documents List */}
      <FlatList
        data={filteredDocs}
        renderItem={renderDocumentCard}
        keyExtractor={item => item.id}
        style={styles.documentsList}
        contentContainerStyle={styles.documentsContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Aucun document trouvé</Text>
          </View>
        }
      />

      {/* Details Modal */}
      <Modal
        visible={detailsVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setDetailsVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={1}>{selectedDoc?.name}</Text>
              <TouchableOpacity onPress={() => setDetailsVisible(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              {/* Document Preview */}
              <View style={styles.previewContainer}>
                <Text style={styles.previewIcon}>{getFileIcon(selectedDoc?.type || '')}</Text>
                <Text style={styles.previewType}>{selectedDoc?.type}</Text>
                <Text style={styles.previewSize}>{selectedDoc?.size}</Text>
              </View>

              {/* Document Info */}
              <View style={styles.infoSection}>
                <Text style={styles.sectionTitle}>Informations</Text>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Catégorie</Text>
                  <View style={[styles.categoryBadge, { backgroundColor: `${getCategoryColor(selectedDoc?.category || '')}20` }]}>
                    <Text style={[styles.categoryBadgeText, { color: getCategoryColor(selectedDoc?.category || '') }]}>
                      {getCategoryLabel(selectedDoc?.category || '')}
                    </Text>
                  </View>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Chargé par</Text>
                  <Text style={styles.infoValue}>{selectedDoc?.uploadedBy}</Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Date de création</Text>
                  <Text style={styles.infoValue}>{selectedDoc?.uploadDate}</Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Dernière modification</Text>
                  <Text style={styles.infoValue}>{selectedDoc?.lastModified}</Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Partagé avec</Text>
                  <View style={styles.sharedBadgeRow}>
                    <UsersIcon size={14} color="#007AFF" />
                    <Text style={styles.sharedCountRow}>{selectedDoc?.sharedWith} personnes</Text>
                  </View>
                </View>
              </View>

              {/* Version History */}
              <View style={styles.versionSection}>
                <Text style={styles.sectionTitle}>Historique des Versions</Text>
                {selectedDoc?.versions.map((version, index) => (
                  <TouchableOpacity
                    key={version.id}
                    style={[styles.versionCard, index === 0 && styles.versionCardCurrent]}
                  >
                    <View style={styles.versionInfo}>
                      <Text style={styles.versionNumber}>
                        v{version.version} {index === 0 ? '(Actuelle)' : ''}
                      </Text>
                      <Text style={styles.versionDate}>
                        {version.uploadDate} • {version.size} • Par {version.uploadedBy}
                      </Text>
                    </View>
                    <TouchableOpacity style={styles.versionAction}>
                      <Text style={styles.versionActionText}>⬇</Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Actions */}
              <View style={styles.actionsSection}>
                <Text style={styles.sectionTitle}>Actions</Text>
                <TouchableOpacity style={styles.actionButton}>
                  <Text style={styles.actionIcon}>👁</Text>
                  <Text style={styles.actionText}>Aperçu</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton}>
                  <Text style={styles.actionIcon}>⬇</Text>
                  <Text style={styles.actionText}>Télécharger</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton}>
                  <Text style={styles.actionIcon}>👥</Text>
                  <Text style={styles.actionText}>Partager</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.actionButtonDanger]}
                  onPress={() => {
                    Alert.alert(
                      'Archiver le document?',
                      'Le document sera archivé et caché de la liste principale',
                      [
                        { text: 'Annuler', onPress: () => {} },
                        { text: 'Archiver', onPress: () => setDetailsVisible(false) },
                      ]
                    );
                  }}
                >
                  <Text style={[styles.actionIcon, styles.actionIconDanger]}>📦</Text>
                  <Text style={[styles.actionText, styles.actionTextDanger]}>Archiver</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.closeModal}
              onPress={() => setDetailsVisible(false)}
            >
              <Text style={styles.closeModalText}>Fermer</Text>
            </TouchableOpacity>
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
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
  },
  uploadButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  uploadButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 12,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 12,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
  },
  statLabel: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 2,
  },
  filterScroll: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  filterContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  documentsList: {
    flex: 1,
  },
  documentsContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  documentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
    marginBottom: 8,
  },
  docCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  docIconSection: {
    position: 'relative',
  },
  docIcon: {
    fontSize: 32,
  },
  versionBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#007AFF',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  versionBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  docInfo: {
    flex: 1,
  },
  docName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  docMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  docMetaText: {
    fontSize: 11,
    color: '#8E8E93',
  },
  docMetaDot: {
    fontSize: 11,
    color: '#C7C7CC',
  },
  docActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  sharedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 4,
    backgroundColor: '#007AFF20',
    borderRadius: 6,
  },
  sharedCount: {
    fontSize: 11,
    fontWeight: '600',
    color: '#007AFF',
  },
  archivedBadge: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    backgroundColor: '#F2F2F7',
    borderRadius: 6,
  },
  archivedBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#8E8E93',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 14,
    color: '#C7C7CC',
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    maxHeight: '95%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
  },
  closeButton: {
    fontSize: 24,
    color: '#8E8E93',
    marginLeft: 8,
  },
  modalScroll: {
    maxHeight: 500,
  },
  previewContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
    marginBottom: 16,
  },
  previewIcon: {
    fontSize: 64,
    marginBottom: 12,
  },
  previewType: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
  },
  previewSize: {
    fontSize: 12,
    color: '#8E8E93',
  },
  infoSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
  },
  infoValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000000',
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  sharedBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sharedCountRow: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
  },
  versionSection: {
    marginBottom: 20,
  },
  versionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    marginBottom: 8,
  },
  versionCardCurrent: {
    backgroundColor: '#007AFF20',
  },
  versionInfo: {
    flex: 1,
  },
  versionNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 2,
  },
  versionDate: {
    fontSize: 11,
    color: '#8E8E93',
  },
  versionAction: {
    paddingHorizontal: 8,
  },
  versionActionText: {
    fontSize: 14,
  },
  actionsSection: {
    marginBottom: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    marginBottom: 8,
    gap: 12,
  },
  actionButtonDanger: {
    backgroundColor: '#FF3B3020',
  },
  actionIcon: {
    fontSize: 16,
  },
  actionIconDanger: {
    opacity: 0.6,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
  },
  actionTextDanger: {
    color: '#FF3B30',
  },
  closeModal: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 20,
  },
  closeModalText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default withGlassLayout(DocumentsScreen);
