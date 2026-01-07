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
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { UsersIcon } from '../components/Icons';
import { withGlassLayout } from '../components/withGlassLayout';
import { documentsService } from '../services/api';
import * as DocumentPicker from 'expo-document-picker';
import { uploadService } from '../services/api';

type DocumentsScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Dashboard'>;
};

interface DocumentVersion {
  id: string;
  version_number: number;
  created_at: string;
  file_size?: number;
  created_by_name: string;
  filename: string;
}

interface Document {
  id: string;
  title: string;
  description?: string;
  file_url: string;
  file_name: string;
  file_size?: number;
  mime_type?: string;
  document_type?: string;
  uploaded_by_name?: string;
  version_count?: number;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

function DocumentsScreen({ navigation }: DocumentsScreenProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [uploadVisible, setUploadVisible] = useState(false);
  const [filterCategory, setFilterCategory] = useState('all');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);

  // Upload form state
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadType, setUploadType] = useState('general');
  const [selectedFile, setSelectedFile] = useState<any>(null);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const response = await documentsService.getAll();
      setDocuments(response.data);
    } catch (error: any) {
      console.error('Error loading documents:', error);
      Alert.alert('Erreur', 'Impossible de charger les documents');
    } finally {
      setLoading(false);
    }
  };

  const loadVersions = async (docId: string) => {
    try {
      const response = await documentsService.getVersions(docId);
      setVersions(response.data);
    } catch (error) {
      console.error('Error loading versions:', error);
    }
  };

  const handleDocumentPick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const file = result.assets[0];
      setSelectedFile(file);
      setUploadTitle(file.name);
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner le fichier');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !uploadTitle.trim()) {
      Alert.alert('Erreur', 'Veuillez sélectionner un fichier et entrer un titre');
      return;
    }

    try {
      setUploading(true);

      // Upload file first
      const formData = new FormData();
      formData.append('file', {
        uri: selectedFile.uri,
        type: selectedFile.mimeType || 'application/octet-stream',
        name: selectedFile.name,
      } as any);

      const uploadResponse = await uploadService.uploadFile(formData);
      const fileUrl = uploadResponse.data.url;

      // Create document record
      const docData = {
        title: uploadTitle.trim(),
        description: uploadDescription.trim() || undefined,
        file_url: fileUrl,
        file_name: selectedFile.name,
        file_size: selectedFile.size,
        mime_type: selectedFile.mimeType,
        document_type: uploadType,
      };

      await documentsService.create(docData);

      Alert.alert('Succès', 'Document uploadé avec succès');
      setUploadVisible(false);
      resetUploadForm();
      loadDocuments();
    } catch (error: any) {
      console.error('Error uploading document:', error);
      Alert.alert('Erreur', error.response?.data?.error || 'Impossible d\'uploader le document');
    } finally {
      setUploading(false);
    }
  };

  const resetUploadForm = () => {
    setUploadTitle('');
    setUploadDescription('');
    setUploadType('general');
    setSelectedFile(null);
  };

  const handleDeleteDocument = async (docId: string) => {
    Alert.alert(
      'Supprimer le document',
      'Êtes-vous sûr de vouloir supprimer ce document ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await documentsService.delete(docId);
              Alert.alert('Succès', 'Document supprimé');
              setDetailsVisible(false);
              loadDocuments();
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de supprimer le document');
            }
          },
        },
      ]
    );
  };

  const getFileIcon = (mimeType?: string, fileName?: string) => {
    if (!mimeType && fileName) {
      const ext = fileName.split('.').pop()?.toLowerCase();
      if (ext === 'pdf') return '📄';
      if (['doc', 'docx'].includes(ext || '')) return '📝';
      if (['xls', 'xlsx'].includes(ext || '')) return '📊';
      if (['ppt', 'pptx'].includes(ext || '')) return '🎯';
      if (['jpg', 'jpeg', 'png', 'gif'].includes(ext || '')) return '🖼️';
      if (['zip', 'rar', '7z'].includes(ext || '')) return '📦';
    }

    if (mimeType?.includes('pdf')) return '📄';
    if (mimeType?.includes('word') || mimeType?.includes('document')) return '📝';
    if (mimeType?.includes('spreadsheet') || mimeType?.includes('excel')) return '📊';
    if (mimeType?.includes('presentation') || mimeType?.includes('powerpoint')) return '🎯';
    if (mimeType?.includes('image')) return '🖼️';
    if (mimeType?.includes('zip') || mimeType?.includes('compressed')) return '📦';
    return '📁';
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getCategoryLabel = (category?: string) => {
    const labels: { [key: string]: string } = {
      general: 'Général',
      contract: 'Contrats',
      invoice: 'Factures',
      proposal: 'Propositions',
      quote: 'Devis',
      presentation: 'Présentations',
      report: 'Rapports',
      other: 'Autre',
    };
    return labels[category || 'general'] || category || 'Général';
  };

  const getCategoryColor = (category?: string) => {
    const colors: { [key: string]: string } = {
      contract: '#FF9500',
      invoice: '#34C759',
      proposal: '#007AFF',
      quote: '#5856D6',
      presentation: '#FF3B30',
      report: '#00B894',
      general: '#8E8E93',
      other: '#8E8E93',
    };
    return colors[category || 'general'] || '#8E8E93';
  };

  const filteredDocs =
    filterCategory === 'all'
      ? documents
      : documents.filter((doc) => doc.document_type === filterCategory);

  const renderDocumentCard = ({ item: doc }: { item: Document }) => (
    <TouchableOpacity
      style={styles.documentCard}
      onPress={() => {
        setSelectedDoc(doc);
        loadVersions(doc.id);
        setDetailsVisible(true);
      }}
    >
      <View style={styles.docCardContent}>
        <View style={styles.docIconSection}>
          <Text style={styles.docIcon}>{getFileIcon(doc.mime_type, doc.file_name)}</Text>
          {(doc.version_count || 0) > 1 && (
            <View style={styles.versionBadge}>
              <Text style={styles.versionBadgeText}>v{doc.version_count}</Text>
            </View>
          )}
        </View>

        <View style={styles.docInfo}>
          <Text style={styles.docName} numberOfLines={2}>
            {doc.title}
          </Text>
          <View style={styles.docMeta}>
            <Text style={styles.docMetaText}>{formatFileSize(doc.file_size)}</Text>
            <Text style={styles.docMetaDot}>•</Text>
            <Text style={styles.docMetaText}>{formatDate(doc.created_at)}</Text>
          </View>
          {doc.uploaded_by_name && (
            <Text style={styles.uploadedBy} numberOfLines={1}>
              Par {doc.uploaded_by_name}
            </Text>
          )}
        </View>

        <View
          style={[
            styles.categoryTag,
            { backgroundColor: `${getCategoryColor(doc.document_type)}20` },
          ]}
        >
          <Text
            style={[styles.categoryTagText, { color: getCategoryColor(doc.document_type) }]}
          >
            {getCategoryLabel(doc.document_type)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderCategoryFilter = () => {
    const categories = [
      'all',
      'general',
      'contract',
      'invoice',
      'proposal',
      'quote',
      'presentation',
      'report',
    ];
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContent}
      >
        {categories.map((cat) => (
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
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={() => setUploadVisible(true)}
          >
            <Text style={styles.uploadButtonText}>+ Importer</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.headerSubtitle}>
          Gérez vos documents avec versioning
        </Text>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{documents.length}</Text>
          <Text style={styles.statLabel}>Documents</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {documents.reduce((sum, doc) => sum + (doc.version_count || 1), 0)}
          </Text>
          <Text style={styles.statLabel}>Versions</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {formatFileSize(
              documents.reduce((sum, doc) => sum + (doc.file_size || 0), 0)
            )}
          </Text>
          <Text style={styles.statLabel}>Stockage</Text>
        </View>
      </View>

      {/* Category Filter */}
      {renderCategoryFilter()}

      {/* Documents List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : (
        <FlatList
          data={filteredDocs}
          renderItem={renderDocumentCard}
          keyExtractor={(item) => item.id}
          style={styles.documentsList}
          contentContainerStyle={styles.documentsContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📄</Text>
              <Text style={styles.emptyText}>Aucun document</Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => setUploadVisible(true)}
              >
                <Text style={styles.emptyButtonText}>Importer un document</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Upload Modal */}
      <Modal
        visible={uploadVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setUploadVisible(false);
          resetUploadForm();
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Importer un document</Text>
              <TouchableOpacity
                onPress={() => {
                  setUploadVisible(false);
                  resetUploadForm();
                }}
              >
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              {/* File Picker */}
              <TouchableOpacity
                style={styles.filePickerButton}
                onPress={handleDocumentPick}
              >
                <Text style={styles.filePickerIcon}>
                  {selectedFile ? '✅' : '📎'}
                </Text>
                <View style={styles.filePickerInfo}>
                  <Text style={styles.filePickerLabel}>
                    {selectedFile ? selectedFile.name : 'Sélectionner un fichier'}
                  </Text>
                  {selectedFile && (
                    <Text style={styles.filePickerSize}>
                      {formatFileSize(selectedFile.size)}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>

              {/* Title */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Titre *</Text>
                <TextInput
                  style={styles.input}
                  value={uploadTitle}
                  onChangeText={setUploadTitle}
                  placeholder="Nom du document"
                  placeholderTextColor="#C7C7CC"
                />
              </View>

              {/* Description */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={uploadDescription}
                  onChangeText={setUploadDescription}
                  placeholder="Description du document (optionnel)"
                  placeholderTextColor="#C7C7CC"
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* Document Type */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Catégorie</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.typeScroll}
                >
                  {[
                    'general',
                    'contract',
                    'invoice',
                    'proposal',
                    'quote',
                    'presentation',
                    'report',
                  ].map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.typeButton,
                        uploadType === type && styles.typeButtonActive,
                        { borderColor: getCategoryColor(type) },
                      ]}
                      onPress={() => setUploadType(type)}
                    >
                      <Text
                        style={[
                          styles.typeButtonText,
                          uploadType === type && {
                            color: getCategoryColor(type),
                            fontWeight: '700',
                          },
                        ]}
                      >
                        {getCategoryLabel(type)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </ScrollView>

            {/* Upload Button */}
            <TouchableOpacity
              style={[
                styles.uploadSubmitButton,
                uploading && styles.uploadSubmitButtonDisabled,
              ]}
              onPress={handleUpload}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.uploadSubmitButtonText}>Importer</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
              <Text style={styles.modalTitle} numberOfLines={1}>
                {selectedDoc?.title}
              </Text>
              <TouchableOpacity onPress={() => setDetailsVisible(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              {/* Document Preview */}
              <View style={styles.previewContainer}>
                <Text style={styles.previewIcon}>
                  {getFileIcon(selectedDoc?.mime_type, selectedDoc?.file_name)}
                </Text>
                <Text style={styles.previewType}>{selectedDoc?.file_name}</Text>
                <Text style={styles.previewSize}>
                  {formatFileSize(selectedDoc?.file_size)}
                </Text>
              </View>

              {/* Document Info */}
              <View style={styles.infoSection}>
                <Text style={styles.sectionTitle}>Informations</Text>

                {selectedDoc?.description && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Description</Text>
                    <Text style={styles.infoValue}>{selectedDoc.description}</Text>
                  </View>
                )}

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Catégorie</Text>
                  <View
                    style={[
                      styles.categoryBadge,
                      {
                        backgroundColor: `${getCategoryColor(
                          selectedDoc?.document_type
                        )}20`,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryBadgeText,
                        { color: getCategoryColor(selectedDoc?.document_type) },
                      ]}
                    >
                      {getCategoryLabel(selectedDoc?.document_type)}
                    </Text>
                  </View>
                </View>

                {selectedDoc?.uploaded_by_name && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Uploadé par</Text>
                    <Text style={styles.infoValue}>{selectedDoc.uploaded_by_name}</Text>
                  </View>
                )}

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Date de création</Text>
                  <Text style={styles.infoValue}>
                    {formatDate(selectedDoc?.created_at || '')}
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Dernière modification</Text>
                  <Text style={styles.infoValue}>
                    {formatDate(selectedDoc?.updated_at || '')}
                  </Text>
                </View>
              </View>

              {/* Version History */}
              {versions.length > 0 && (
                <View style={styles.versionSection}>
                  <Text style={styles.sectionTitle}>
                    Historique des Versions ({versions.length})
                  </Text>
                  {versions.map((version, index) => (
                    <View
                      key={version.id}
                      style={[
                        styles.versionCard,
                        index === 0 && styles.versionCardCurrent,
                      ]}
                    >
                      <View style={styles.versionInfo}>
                        <Text style={styles.versionNumber}>
                          v{version.version_number} {index === 0 ? '(Actuelle)' : ''}
                        </Text>
                        <Text style={styles.versionDate}>
                          {formatDate(version.created_at)} • {version.created_by_name}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Actions */}
              <View style={styles.actionsSection}>
                <Text style={styles.sectionTitle}>Actions</Text>
                <TouchableOpacity
                  style={[styles.actionButton, styles.actionButtonDanger]}
                  onPress={() => handleDeleteDocument(selectedDoc?.id || '')}
                >
                  <Text style={[styles.actionIcon, styles.actionIconDanger]}>🗑️</Text>
                  <Text style={[styles.actionText, styles.actionTextDanger]}>
                    Supprimer
                  </Text>
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
    marginBottom: 2,
  },
  docMetaText: {
    fontSize: 11,
    color: '#8E8E93',
  },
  docMetaDot: {
    fontSize: 11,
    color: '#C7C7CC',
  },
  uploadedBy: {
    fontSize: 10,
    color: '#C7C7CC',
  },
  categoryTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryTagText: {
    fontSize: 10,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#C7C7CC',
    fontWeight: '500',
    marginBottom: 16,
  },
  emptyButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  emptyButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
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
  filePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 12,
  },
  filePickerIcon: {
    fontSize: 24,
  },
  filePickerInfo: {
    flex: 1,
  },
  filePickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  filePickerSize: {
    fontSize: 12,
    color: '#8E8E93',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    fontSize: 14,
    color: '#000000',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  typeScroll: {
    marginTop: 4,
  },
  typeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C7C7CC',
    marginRight: 8,
  },
  typeButtonActive: {
    borderWidth: 2,
  },
  typeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
  },
  uploadSubmitButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 20,
  },
  uploadSubmitButtonDisabled: {
    opacity: 0.6,
  },
  uploadSubmitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
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
    maxWidth: '60%',
    textAlign: 'right',
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
