import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  RefreshControl,
  Platform,
  Animated,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { FileTextIcon, EditIcon, TrashIcon, CheckCircleIcon } from '../components/Icons';
import { templatesService } from '../services/api';

type TemplatesScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

interface InvoiceTemplate {
  id: string;
  name: string;
  is_default: boolean;
  logo_url?: string;
  // Informations légales obligatoires
  company_name?: string;
  company_address?: string;
  company_phone?: string;
  company_email?: string;
  company_siret?: string; // Obligatoire : 14 chiffres
  company_tva?: string; // TVA intracommunautaire
  company_rcs?: string; // RCS + Ville
  company_capital?: string; // Capital social
  company_legal_form?: string; // SARL, SAS, EURL, Auto-entrepreneur, etc.
  // Mentions légales
  is_micro_entreprise?: boolean; // Pour mention "TVA non applicable, art. 293 B du CGI"
  late_payment_penalty?: string; // Pénalités de retard (défaut: 3x taux légal)
  recovery_indemnity?: string; // Indemnité forfaitaire de recouvrement (défaut: 40€)
  // Apparence
  primary_color: string;
  secondary_color?: string;
  template_layout: 'classic' | 'modern' | 'minimal' | 'professional';
  font_family?: string; // Police de caractères
  header_text?: string;
  footer_text?: string;
  // Textes éditables de la facture
  invoice_title?: string; // "FACTURE" par défaut
  invoice_number_prefix?: string; // "N° FAC-" par défaut
  client_label?: string; // "Client:" par défaut
  client_name_placeholder?: string; // "Nom du Client" par défaut
  client_address_placeholder?: string; // "Adresse du client" par défaut
  table_header_description?: string; // "Description" par défaut
  table_header_quantity?: string; // "Quantité" par défaut
  table_header_unit_price?: string; // "Prix U." par défaut
  table_header_total?: string; // "Total" par défaut
  sample_item_description?: string; // "Prestation exemple" par défaut
  subtotal_label?: string; // "Sous-total HT:" par défaut
  vat_label?: string; // "TVA (20%):" par défaut
  total_label?: string; // "Total TTC:" par défaut
  payment_terms?: string;
  bank_iban?: string;
  bank_bic?: string;
  bank_name?: string;
  show_logo: boolean;
  show_header: boolean;
  show_footer: boolean;
  show_payment_terms: boolean;
  show_bank_details: boolean;
  show_legal_mentions?: boolean;
  created_at?: string;
  updated_at?: string;
}

export default function TemplatesScreen({ navigation }: TemplatesScreenProps) {
  const [templates, setTemplates] = useState<InvoiceTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'legal' | 'design' | 'payment'>('general');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [fullscreenPreview, setFullscreenPreview] = useState(false);
  const [editingElement, setEditingElement] = useState<string | null>(null);
  const [editPanelData, setEditPanelData] = useState<{field: string, value: string, label: string, multiline?: boolean} | null>(null);
  const [hoveredElement, setHoveredElement] = useState<string | null>(null);
  const [tempEditValue, setTempEditValue] = useState('');
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [highlightedField, setHighlightedField] = useState<string | null>(null);
  const [logoImage, setLogoImage] = useState<string | null>(null);
  const [extractedColors, setExtractedColors] = useState<string[]>([]);

  // Form fields
  const [formData, setFormData] = useState<Partial<InvoiceTemplate>>({
    name: '',
    is_default: false,
    company_name: '',
    company_address: '',
    company_phone: '',
    company_email: '',
    company_siret: '',
    company_tva: '',
    company_rcs: '',
    company_capital: '',
    company_legal_form: 'SARL',
    is_micro_entreprise: false,
    late_payment_penalty: 'En cas de retard de paiement, une pénalité égale à 3 fois le taux d\'intérêt légal sera appliquée',
    recovery_indemnity: 'Indemnité forfaitaire de recouvrement : 40€',
    primary_color: '#007AFF',
    secondary_color: '#5856D6',
    template_layout: 'professional',
    font_family: 'System',
    header_text: '',
    footer_text: 'Merci de votre confiance',
    // Textes par défaut de la facture
    invoice_title: 'FACTURE',
    invoice_number_prefix: 'N° FAC-',
    client_label: 'Client:',
    client_name_placeholder: 'Nom du Client',
    client_address_placeholder: 'Adresse du client',
    table_header_description: 'Description',
    table_header_quantity: 'Quantité',
    table_header_unit_price: 'Prix U.',
    table_header_total: 'Total',
    sample_item_description: 'Prestation exemple',
    subtotal_label: 'Sous-total HT:',
    vat_label: 'TVA (20%):',
    total_label: 'Total TTC:',
    payment_terms: 'Paiement à réception de facture - 30 jours fin de mois',
    bank_iban: '',
    bank_bic: '',
    bank_name: '',
    show_logo: true,
    show_header: true,
    show_footer: true,
    show_payment_terms: true,
    show_bank_details: true,
    show_legal_mentions: true,
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await templatesService.getAll();
      setTemplates(response.data);
    } catch (error) {
      console.error('Error fetching templates:', error);
      Alert.alert('Erreur', 'Impossible de charger les templates');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchTemplates();
  };

  const openCreateModal = () => {
    setEditMode(false);
    setFormData({
      name: '',
      is_default: false,
      company_name: '',
      company_address: '',
      company_phone: '',
      company_email: '',
      company_siret: '',
      company_tva: '',
      primary_color: '#007AFF',
      secondary_color: '#5856D6',
      template_layout: 'classic',
      header_text: '',
      footer_text: 'Merci de votre confiance',
      payment_terms: 'Paiement à 30 jours',
      bank_iban: '',
      bank_bic: '',
      show_logo: true,
      show_header: true,
      show_footer: true,
      show_payment_terms: true,
      show_bank_details: true,
    });
    setModalVisible(true);
  };

  const openEditModal = (template: InvoiceTemplate) => {
    setEditMode(true);
    setFormData(template);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!formData.name) {
      Alert.alert('Erreur', 'Le nom du template est requis');
      return;
    }

    try {
      if (editMode) {
        await templatesService.update(formData.id!, formData);
      } else {
        await templatesService.create(formData);
      }

      Alert.alert('Succès', `Template ${editMode ? 'modifié' : 'créé'} avec succès`);
      setModalVisible(false);
      fetchTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder le template');
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      'Confirmer la suppression',
      'Êtes-vous sûr de vouloir supprimer ce template ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await templatesService.delete(id);
              Alert.alert('Succès', 'Template supprimé avec succès');
              fetchTemplates();
            } catch (error) {
              console.error('Error deleting template:', error);
              Alert.alert('Erreur', 'Impossible de supprimer le template');
            }
          },
        },
      ]
    );
  };

  const renderTemplate = (template: InvoiceTemplate) => (
    <View key={template.id} style={styles.templateCard}>
      <View style={styles.templateHeader}>
        <View style={styles.templateInfo}>
          <Text style={styles.templateName}>{template.name}</Text>
          {template.is_default && (
            <View style={styles.defaultBadge}>
              <CheckCircleIcon size={14} color="#34C759" />
              <Text style={styles.defaultText}>Par défaut</Text>
            </View>
          )}
          <Text style={styles.templateDetails}>
            Layout: {template.template_layout} • Couleur: {template.primary_color}
          </Text>
        </View>
        <View style={styles.templateActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => openEditModal(template)}
          >
            <EditIcon size={20} color="#007AFF" />
          </TouchableOpacity>
          {!template.is_default && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleDelete(template.id)}
            >
              <TrashIcon size={20} color="#FF3B30" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Preview */}
      <View style={[styles.templatePreview, { borderColor: template.primary_color }]}>
        <View style={[styles.previewHeader, { backgroundColor: template.primary_color }]}>
          <Text style={styles.previewHeaderText}>FACTURE</Text>
        </View>
        <View style={styles.previewContent}>
          <Text style={styles.previewCompany}>{template.company_name}</Text>
          <Text style={styles.previewText}>Lorem ipsum dolor sit amet</Text>
          <Text style={styles.previewText}>consectetur adipiscing elit</Text>
        </View>
        {template.show_footer && (
          <View style={styles.previewFooter}>
            <Text style={styles.previewFooterText}>{template.footer_text || 'Footer'}</Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderColorPicker = (label: string, field: 'primary_color' | 'secondary_color') => {
    const predefinedColors = [
      '#007AFF', '#34C759', '#FF9500', '#FF3B30', '#5856D6', '#AF52DE',
      '#000000', '#2C3E50', '#E74C3C', '#3498DB', '#1ABC9C', '#F39C12',
      '#9B59B6', '#E67E22', '#95A5A6', '#16A085'
    ];

    return (
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>{label}</Text>

        {/* Couleur actuelle avec champ de saisie */}
        <View style={styles.colorCurrentContainer}>
          <View style={[styles.colorCurrentSwatch, { backgroundColor: formData[field] || '#007AFF' }]} />
          <TextInput
            style={styles.colorInput}
            value={formData[field] || '#007AFF'}
            onChangeText={(text) => {
              if (/^#[0-9A-Fa-f]{0,6}$/.test(text)) {
                setFormData({ ...formData, [field]: text });
              }
            }}
            placeholder="#007AFF"
            autoCapitalize="characters"
            maxLength={7}
          />
        </View>

        {/* Palette de couleurs prédéfinies */}
        <Text style={styles.colorPickerSubLabel}>Couleurs prédéfinies</Text>
        <View style={styles.colorPickerContainer}>
          {predefinedColors.map((color) => (
            <TouchableOpacity
              key={color}
              style={[
                styles.colorOption,
                { backgroundColor: color },
                formData[field] === color && styles.colorOptionSelected,
              ]}
              onPress={() => setFormData({ ...formData, [field]: color })}
            />
          ))}
        </View>
      </View>
    );
  };

  // Fonction pour extraire les couleurs dominantes d'une image
  const extractColorsFromImage = (imageUrl: string) => {
    return new Promise<string[]>((resolve) => {
      if (Platform.OS === 'web') {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          canvas.width = img.width;
          canvas.height = img.height;
          ctx?.drawImage(img, 0, 0);

          const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
          const pixels = imageData?.data || [];

          // Échantillonner les couleurs (1 pixel sur 10)
          const colorMap = new Map<string, number>();
          for (let i = 0; i < pixels.length; i += 40) {
            const r = pixels[i];
            const g = pixels[i + 1];
            const b = pixels[i + 2];
            const a = pixels[i + 3];

            // Ignorer les pixels transparents et trop clairs/foncés
            if (a > 200 && r + g + b > 100 && r + g + b < 700) {
              const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
              colorMap.set(hex, (colorMap.get(hex) || 0) + 1);
            }
          }

          // Trier par fréquence et prendre les 6 couleurs les plus utilisées
          const sortedColors = Array.from(colorMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6)
            .map(([color]) => color);

          resolve(sortedColors);
        };
        img.src = imageUrl;
      } else {
        resolve([]);
      }
    });
  };

  // Fonction pour gérer l'upload du logo
  const handleLogoUpload = async (event: any) => {
    const file = event.target?.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const imageUrl = e.target?.result as string;
        setLogoImage(imageUrl);
        setFormData({ ...formData, logo_url: imageUrl });

        // Extraire les couleurs
        const colors = await extractColorsFromImage(imageUrl);
        setExtractedColors(colors);
      };
      reader.readAsDataURL(file);
    }
  };

  // Fonction helper pour obtenir le style de surbrillance
  const getHighlightStyle = (field: string) => {
    if (highlightedField === field) {
      return styles.previewHighlight;
    }
    return null;
  };

  // Composant d'input amélioré avec indicateurs visuels
  const renderEnhancedInput = (
    label: string,
    field: string,
    placeholder: string,
    options?: {
      multiline?: boolean;
      keyboardType?: 'default' | 'email-address' | 'number-pad';
      autoCapitalize?: 'none' | 'characters' | 'words' | 'sentences';
      maxLength?: number;
      icon?: string;
      helper?: string;
      required?: boolean;
    }
  ) => {
    const value = (formData as any)[field] || '';
    const error = errors[field];
    const isFilled = value.length > 0;
    const isFocused = focusedInput === field;

    return (
      <View style={styles.enhancedInputContainer}>
        <View style={styles.inputLabelRow}>
          <Text style={styles.enhancedInputLabel}>
            {options?.icon && `${options.icon} `}{label} {options?.required && <Text style={styles.requiredStar}>*</Text>}
          </Text>
          {isFilled && (
            <View style={styles.checkmarkContainer}>
              <Text style={styles.checkmark}>✓</Text>
            </View>
          )}
        </View>
        <TextInput
          style={[
            styles.enhancedInput,
            options?.multiline && styles.textArea,
            error && styles.inputError,
            isFocused && styles.inputFocused,
            isFilled && styles.inputFilled,
          ]}
          value={value}
          onChangeText={(text) => handleFieldChange(field, text)}
          placeholder={placeholder}
          multiline={options?.multiline}
          numberOfLines={options?.multiline ? 3 : 1}
          keyboardType={options?.keyboardType}
          autoCapitalize={options?.autoCapitalize}
          maxLength={options?.maxLength}
          onFocus={() => {
            setFocusedInput(field);
            setHighlightedField(field);
          }}
          onBlur={() => {
            setFocusedInput(null);
            setHighlightedField(null);
          }}
          placeholderTextColor="#C7C7CC"
        />
        {options?.helper && !error && (
          <Text style={styles.inputHelper}>{options.helper}</Text>
        )}
        {error && <Text style={styles.errorText}>{error}</Text>}
        {isFilled && !error && (
          <View style={styles.progressBar}>
            <View style={[styles.progressBarFill, { width: '100%' }]} />
          </View>
        )}
      </View>
    );
  };

  const renderToggle = (label: string, field: keyof InvoiceTemplate, icon?: string) => {
    const isActive = formData[field];
    return (
      <View style={styles.toggleRow}>
        <View style={styles.toggleLabelContainer}>
          <Text style={styles.toggleLabel}>
            {icon && `${icon} `}{label}
          </Text>
          {isActive && (
            <View style={styles.toggleBadge}>
              <Text style={styles.toggleBadgeText}>Activé</Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          style={[styles.toggle, isActive && styles.toggleActive]}
          onPress={() => setFormData({ ...formData, [field]: !formData[field] })}
          activeOpacity={0.7}
        >
          <View style={[styles.toggleThumb, isActive && styles.toggleThumbActive]} />
        </TouchableOpacity>
      </View>
    );
  };

  // Validation functions
  const validateField = (field: string, value: string) => {
    let error = '';

    switch (field) {
      case 'company_siret':
        if (value && !/^\d{14}$/.test(value.replace(/\s/g, ''))) {
          error = 'Le SIRET doit contenir 14 chiffres';
        }
        break;
      case 'company_email':
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          error = 'Email invalide';
        }
        break;
      case 'company_phone':
        if (value && !/^(\+33|0)[1-9](\d{2}){4}$/.test(value.replace(/\s/g, ''))) {
          error = 'Numéro de téléphone invalide';
        }
        break;
      case 'bank_iban':
        if (value && !/^[A-Z]{2}\d{2}[A-Z0-9]{1,30}$/.test(value.replace(/\s/g, ''))) {
          error = 'IBAN invalide';
        }
        break;
      case 'name':
        if (!value) {
          error = 'Le nom est obligatoire';
        }
        break;
    }

    setErrors(prev => ({ ...prev, [field]: error }));
    return error === '';
  };

  const handleFieldChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
    validateField(field, value);
  };

  // Advanced Edit Panel Functions
  const openEditPanel = (field: string, label: string, multiline: boolean = false) => {
    const value = (formData as any)[field] || '';
    setEditPanelData({ field, value, label, multiline });
    setTempEditValue(value);
    setEditingElement(field);
  };

  const closeEditPanel = () => {
    setEditPanelData(null);
    setEditingElement(null);
    setTempEditValue('');
  };

  const saveEditPanel = () => {
    if (editPanelData) {
      setFormData({ ...formData, [editPanelData.field]: tempEditValue });
    }
    closeEditPanel();
  };

  // Show onboarding if no templates exist
  // Show onboarding if no templates exist
  const showOnboarding = !loading && templates.length === 0;

  return (
    <View style={styles.container}>
      {showOnboarding ? (
        // Onboarding view
        <View style={styles.onboardingContainer}>
          <View style={styles.onboardingIconContainer}>
            <FileTextIcon size={80} color="#007AFF" />
          </View>
          <Text style={styles.onboardingTitle}>Créez votre premier template</Text>
          <Text style={styles.onboardingDescription}>
            Les templates vous permettent de personnaliser l'apparence de vos devis et factures.
            Ajoutez votre logo, vos couleurs et vos informations d'entreprise.
          </Text>
          <TouchableOpacity style={styles.onboardingButton} onPress={openCreateModal}>
            <FileTextIcon size={24} color="#FFFFFF" />
            <Text style={styles.onboardingButtonText}>Créer mon premier template</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.skipButton} onPress={() => navigation.goBack()}>
            <Text style={styles.skipButtonText}>Passer pour le moment</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Templates de Factures</Text>
            <Text style={styles.headerSubtitle}>
              {templates.length} template{templates.length > 1 ? 's' : ''}
            </Text>
          </View>

          {/* Create Button */}
          <View style={styles.createSection}>
            <TouchableOpacity style={styles.createButton} onPress={openCreateModal}>
              <FileTextIcon size={20} color="#FFFFFF" />
              <Text style={styles.createButtonText}>Créer un Template</Text>
            </TouchableOpacity>
          </View>

          {/* Templates List */}
          <ScrollView
            style={styles.scrollView}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          >
            {templates.map(renderTemplate)}
            <View style={{ height: 40 }} />
          </ScrollView>
        </>
      )}

      {/* Create/Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.modalCancel}>Annuler</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editMode ? 'Modifier le Template' : 'Nouveau Template'}
            </Text>
            <TouchableOpacity onPress={handleSave}>
              <Text style={styles.modalSave}>Sauvegarder</Text>
            </TouchableOpacity>
          </View>


          {/* Tabs */}
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'general' && styles.tabActive]}
              onPress={() => setActiveTab('general')}
            >
              <Text style={[styles.tabText, activeTab === 'general' && styles.tabTextActive]}>
                Général
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'legal' && styles.tabActive]}
              onPress={() => setActiveTab('legal')}
            >
              <Text style={[styles.tabText, activeTab === 'legal' && styles.tabTextActive]}>
                Informations Légales
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'design' && styles.tabActive]}
              onPress={() => setActiveTab('design')}
            >
              <Text style={[styles.tabText, activeTab === 'design' && styles.tabTextActive]}>
                Apparence
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'payment' && styles.tabActive]}
              onPress={() => setActiveTab('payment')}
            >
              <Text style={[styles.tabText, activeTab === 'payment' && styles.tabTextActive]}>
                Paiement
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            {/* Left side: Form */}
            <ScrollView style={styles.modalFormSection}>

            {/* Tab: General */}
            {activeTab === 'general' && (
              <>
                <Text style={styles.stepIndicator}>Étape 1/5</Text>
                {renderEnhancedInput(
                  'Nom du template',
                  'name',
                  'Ex: Template Moderne Bleu',
                  { icon: '📝', required: true, helper: 'Donnez un nom unique à votre template' }
                )}

                {formData.name && (
                  <>
                    <Text style={styles.stepIndicator}>Étape 2/5</Text>
                    {renderEnhancedInput(
                      'Nom de l\'entreprise',
                      'company_name',
                      'Ma Société SARL',
                      { icon: '🏢', required: true, helper: 'Le nom qui apparaîtra sur vos factures' }
                    )}

                    {formData.company_name && (
                      <>
                        <Text style={styles.stepIndicator}>Étape 3/5</Text>
                        {renderEnhancedInput(
                          'Adresse complète',
                          'company_address',
                          '123 Rue Example, 75001 Paris',
                          { icon: '📍', multiline: true, helper: 'Adresse de votre siège social' }
                        )}

                        {formData.company_address && (
                          <>
                            <Text style={styles.stepIndicator}>Étape 4/5</Text>
                            {renderEnhancedInput(
                              'Téléphone',
                              'company_phone',
                              '01 23 45 67 89',
                              { icon: '📞', helper: 'Format: 10 chiffres' }
                            )}

                            {formData.company_phone && (
                              <>
                                <Text style={styles.stepIndicator}>Étape 5/5 - Terminé ! 🎉</Text>
                                {renderEnhancedInput(
                                  'Email',
                                  'company_email',
                                  'contact@example.com',
                                  { icon: '✉️', keyboardType: 'email-address', autoCapitalize: 'none', helper: 'Email de contact professionnel' }
                                )}
                              </>
                            )}
                          </>
                        )}
                      </>
                    )}
                  </>
                )}
              </>
            )}

            {/* Tab: Legal */}
            {activeTab === 'legal' && (
              <>
                <View style={styles.enhancedInputContainer}>
                  <Text style={styles.enhancedInputLabel}>⚖️ Forme juridique <Text style={styles.requiredStar}>*</Text></Text>
                  <View style={styles.legalFormOptions}>
                    {['SARL', 'SAS', 'SASU', 'EURL', 'SNC', 'Auto-entrepreneur', 'EI'].map((form) => (
                      <TouchableOpacity
                        key={form}
                        style={[
                          styles.legalFormOption,
                          formData.company_legal_form === form && styles.legalFormOptionSelected,
                        ]}
                        onPress={() => setFormData({ ...formData, company_legal_form: form })}
                        activeOpacity={0.7}
                      >
                        <Text style={[
                          styles.legalFormOptionText,
                          formData.company_legal_form === form && styles.legalFormOptionTextSelected,
                        ]}>
                          {form}
                        </Text>
                        {formData.company_legal_form === form && (
                          <Text style={styles.selectedCheck}>✓</Text>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {formData.company_legal_form && (
                  <>
                    {renderEnhancedInput(
                      'SIRET',
                      'company_siret',
                      '123 456 789 00012',
                      { icon: '🔢', required: true, keyboardType: 'number-pad', maxLength: 17, helper: 'Obligatoire pour toute facture en France (14 chiffres)' }
                    )}

                    {formData.company_siret && (
                      <>
                        {renderEnhancedInput(
                          'RCS',
                          'company_rcs',
                          'RCS Paris 123 456 789',
                          { icon: '📋', helper: 'Registre du Commerce et des Sociétés' }
                        )}

                        {formData.company_rcs && (
                          <>
                            {renderEnhancedInput(
                              'Capital social',
                              'company_capital',
                              '10 000 €',
                              { icon: '💶', helper: 'Le capital social de votre entreprise' }
                            )}

                            {formData.company_capital && (
                              <>
                                {renderToggle('Micro-entreprise (TVA non applicable)', 'is_micro_entreprise', '🏪')}

                                {!formData.is_micro_entreprise && (
                                  <>
                                    {renderEnhancedInput(
                                      'N° TVA Intracommunautaire',
                                      'company_tva',
                                      'FR12345678901',
                                      { icon: '🇪🇺', autoCapitalize: 'characters', helper: 'N° TVA obligatoire si non micro-entreprise' }
                                    )}
                                  </>
                                )}

                                <Text style={styles.sectionTitle}>📜 Mentions Légales Obligatoires</Text>

                                {renderEnhancedInput(
                                  'Pénalités de retard',
                                  'late_payment_penalty',
                                  'En cas de retard de paiement...',
                                  { icon: '⚠️', multiline: true, helper: 'Mention obligatoire sur toutes les factures' }
                                )}

                                {renderEnhancedInput(
                                  'Indemnité forfaitaire de recouvrement',
                                  'recovery_indemnity',
                                  'Indemnité forfaitaire de recouvrement : 40€',
                                  { icon: '💰', helper: 'Généralement fixée à 40€' }
                                )}
                              </>
                            )}
                          </>
                        )}
                      </>
                    )}
                  </>
                )}

                <View style={{ height: 40 }} />
              </>
            )}

            {/* Tab: Design */}
            {activeTab === 'design' && (
              <>
                {/* Étape 0: Upload Logo */}
                <View style={styles.designSection}>
                  <Text style={styles.designSectionTitle}>🖼️ Logo de votre entreprise</Text>
                  <Text style={styles.designSectionSubtitle}>Uploadez votre logo pour extraire automatiquement vos couleurs</Text>

                  {!logoImage ? (
                    <View style={styles.logoUploadContainer}>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        style={{ display: 'none' }}
                        id="logo-upload"
                      />
                      <label htmlFor="logo-upload" style={{ cursor: 'pointer', width: '100%' }}>
                        <View style={styles.logoUploadBox}>
                          <Text style={styles.logoUploadIcon}>📤</Text>
                          <Text style={styles.logoUploadTitle}>Cliquez pour uploader votre logo</Text>
                          <Text style={styles.logoUploadSubtitle}>PNG, JPG ou SVG • Max 5MB</Text>
                          <View style={styles.logoUploadButton}>
                            <Text style={styles.logoUploadButtonText}>Choisir un fichier</Text>
                          </View>
                        </View>
                      </label>
                    </View>
                  ) : (
                    <View style={styles.logoPreviewContainer}>
                      <View style={styles.logoPreviewBox}>
                        <img src={logoImage} alt="Logo" style={{ maxWidth: '100%', maxHeight: 200, objectFit: 'contain' }} />
                      </View>
                      <TouchableOpacity
                        style={styles.logoChangeButton}
                        onPress={() => document.getElementById('logo-upload-change')?.click()}
                      >
                        <Text style={styles.logoChangeButtonText}>🔄 Changer le logo</Text>
                      </TouchableOpacity>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        style={{ display: 'none' }}
                        id="logo-upload-change"
                      />

                      {extractedColors.length > 0 && (
                        <View style={styles.extractedColorsContainer}>
                          <Text style={styles.extractedColorsTitle}>✨ Couleurs extraites de votre logo</Text>
                          <View style={styles.extractedColorsGrid}>
                            {extractedColors.map((color, index) => (
                              <TouchableOpacity
                                key={index}
                                style={[styles.extractedColorBox, { backgroundColor: color }]}
                                onPress={() => setFormData({ ...formData, primary_color: color })}
                              >
                                <Text style={styles.extractedColorCheck}>
                                  {formData.primary_color === color ? '✓' : ''}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                          <Text style={styles.extractedColorsHint}>Cliquez sur une couleur pour l'utiliser comme couleur principale</Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>

                {/* Étape 1: Layout */}
                {logoImage && (
                  <View style={styles.designSection}>
                    <Text style={styles.designSectionTitle}>🎨 Style général</Text>
                    <Text style={styles.designSectionSubtitle}>Choisissez le style de votre facture</Text>
                  <View style={styles.layoutOptions}>
                    {[
                      { value: 'classic', label: 'Classique', icon: '📄', desc: 'Traditionnel' },
                      { value: 'modern', label: 'Moderne', icon: '✨', desc: 'Contemporain' },
                      { value: 'minimal', label: 'Minimal', icon: '⚡', desc: 'Épuré' },
                      { value: 'professional', label: 'Pro', icon: '💼', desc: 'Business' }
                    ].map((layout) => (
                      <TouchableOpacity
                        key={layout.value}
                        style={[
                          styles.layoutOptionCard,
                          formData.template_layout === layout.value && styles.layoutOptionCardSelected,
                        ]}
                        onPress={() => setFormData({ ...formData, template_layout: layout.value as any })}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.layoutOptionIcon}>{layout.icon}</Text>
                        <Text style={[
                          styles.layoutOptionText,
                          formData.template_layout === layout.value && styles.layoutOptionTextSelected,
                        ]}>
                          {layout.label}
                        </Text>
                        <Text style={styles.layoutOptionDesc}>{layout.desc}</Text>
                        {formData.template_layout === layout.value && (
                          <View style={styles.selectedBadge}>
                            <Text style={styles.selectedBadgeText}>✓</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                  </View>
                )}

                {/* Étape 2: Couleurs (après choix du layout) */}
                {logoImage && formData.template_layout && (
                  <>
                    <View style={styles.designSection}>
                      <Text style={styles.designSectionTitle}>🎨 Couleur principale</Text>
                      <Text style={styles.designSectionSubtitle}>Cette couleur apparaîtra dans l'en-tête et les titres</Text>

                      <View style={styles.colorPreviewLarge}>
                        <View style={[styles.colorPreviewBig, { backgroundColor: formData.primary_color || '#007AFF' }]}>
                          <Text style={styles.colorPreviewText}>Aperçu</Text>
                        </View>
                      </View>

                      {/* Couleurs extraites du logo */}
                      {extractedColors.length > 0 && (
                        <>
                          <Text style={styles.colorPickerLabel}>✨ Couleurs de votre logo</Text>
                          <Text style={styles.colorPickerSubtitle}>Cliquez sur une couleur pour l'utiliser</Text>
                          <View style={styles.extractedColorsRow}>
                            {extractedColors.map((color, index) => (
                              <TouchableOpacity
                                key={`extracted-${index}`}
                                style={[
                                  styles.extractedColorCircle,
                                  { backgroundColor: color },
                                  formData.primary_color === color && styles.extractedColorCircleSelected,
                                ]}
                                onPress={() => setFormData({ ...formData, primary_color: color })}
                              >
                                {formData.primary_color === color && (
                                  <Text style={styles.extractedColorCheck}>✓</Text>
                                )}
                              </TouchableOpacity>
                            ))}
                          </View>
                        </>
                      )}

                      <Text style={styles.colorPickerLabel}>🎨 Sélecteur de Couleur Personnalisé</Text>
                      <Text style={styles.colorPickerSubtitle}>Choisissez exactement la couleur que vous voulez</Text>

                      <View style={styles.customColorPickerContainer}>
                        <input
                          type="color"
                          value={formData.primary_color || '#007AFF'}
                          onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                          style={{
                            width: '100%',
                            height: 80,
                            border: '3px solid #007AFF',
                            borderRadius: 16,
                            cursor: 'pointer',
                          }}
                        />
                        <Text style={styles.selectedColorText}>
                          Couleur sélectionnée : {formData.primary_color || '#007AFF'}
                        </Text>
                      </View>
                    </View>

                    {/* Étape 3: Couleur secondaire (après choix couleur principale) */}
                    {formData.primary_color && (
                      <>
                        <View style={styles.designSection}>
                          <Text style={styles.designSectionTitle}>🎨 Couleur secondaire</Text>
                          <Text style={styles.designSectionSubtitle}>Pour le pied de page et les accents</Text>

                          <View style={styles.colorPreviewLarge}>
                            <View style={[styles.colorPreviewBig, { backgroundColor: formData.secondary_color || '#5856D6' }]}>
                              <Text style={styles.colorPreviewText}>Aperçu</Text>
                            </View>
                          </View>

                          {/* Couleurs extraites du logo */}
                          {extractedColors.length > 0 && (
                            <>
                              <Text style={styles.colorPickerLabel}>✨ Couleurs de votre logo</Text>
                              <Text style={styles.colorPickerSubtitle}>Cliquez sur une couleur pour l'utiliser</Text>
                              <View style={styles.extractedColorsRow}>
                                {extractedColors.map((color, index) => (
                                  <TouchableOpacity
                                    key={`extracted-sec-${index}`}
                                    style={[
                                      styles.extractedColorCircle,
                                      { backgroundColor: color },
                                      formData.secondary_color === color && styles.extractedColorCircleSelected,
                                    ]}
                                    onPress={() => setFormData({ ...formData, secondary_color: color })}
                                  >
                                    {formData.secondary_color === color && (
                                      <Text style={styles.extractedColorCheck}>✓</Text>
                                    )}
                                  </TouchableOpacity>
                                ))}
                              </View>
                            </>
                          )}

                          <Text style={styles.colorPickerLabel}>🎨 Sélecteur de Couleur Personnalisé</Text>
                          <Text style={styles.colorPickerSubtitle}>Choisissez exactement la couleur que vous voulez</Text>

                          <View style={styles.customColorPickerContainer}>
                            <input
                              type="color"
                              value={formData.secondary_color || '#5856D6'}
                              onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                              style={{
                                width: '100%',
                                height: 80,
                                border: '3px solid #007AFF',
                                borderRadius: 16,
                                cursor: 'pointer',
                              }}
                            />
                            <Text style={styles.selectedColorText}>
                              Couleur sélectionnée : {formData.secondary_color || '#5856D6'}
                            </Text>
                          </View>
                        </View>

                        {/* Étape 4: Police (après couleurs) */}
                        {formData.secondary_color && (
                          <>
                            <View style={styles.designSection}>
                              <Text style={styles.designSectionTitle}>✍️ Police de caractères</Text>
                              <Text style={styles.designSectionSubtitle}>Choisissez la typographie de vos documents</Text>
                              <View style={styles.fontGrid}>
                                {[
                                  { value: 'System', label: 'Système', icon: '📱', desc: 'Par défaut' },
                                  { value: 'Georgia', label: 'Georgia', icon: '✨', desc: 'Élégant' },
                                  { value: 'Times New Roman', label: 'Times', icon: '📰', desc: 'Classique' },
                                  { value: 'Arial', label: 'Arial', icon: '🔤', desc: 'Moderne' },
                                  { value: 'Helvetica', label: 'Helvetica', icon: '💼', desc: 'Pro' },
                                  { value: 'Courier New', label: 'Courier', icon: '⌨️', desc: 'Monospace' },
                                ].map((font) => (
                                  <TouchableOpacity
                                    key={font.value}
                                    style={[
                                      styles.fontOptionCard,
                                      formData.font_family === font.value && styles.fontOptionCardSelected,
                                    ]}
                                    onPress={() => setFormData({ ...formData, font_family: font.value })}
                                    activeOpacity={0.7}
                                  >
                                    <Text style={styles.fontOptionIcon}>{font.icon}</Text>
                                    <Text style={[
                                      styles.fontOptionLabel,
                                      formData.font_family === font.value && styles.fontOptionLabelSelected,
                                    ]}>
                                      {font.label}
                                    </Text>
                                    <Text style={styles.fontOptionDesc}>{font.desc}</Text>
                                    {formData.font_family === font.value && (
                                      <View style={styles.selectedBadgeSmall}>
                                        <Text style={styles.selectedBadgeText}>✓</Text>
                                      </View>
                                    )}
                                  </TouchableOpacity>
                                ))}
                              </View>
                            </View>

                            {/* Étape 5: Personnalisation des textes */}
                            {formData.font_family && (
                              <>
                                <View style={styles.designSection}>
                                  <Text style={styles.designSectionTitle}>✏️ Textes personnalisables</Text>
                                  <Text style={styles.designSectionSubtitle}>Personnalisez les textes de votre facture</Text>

                                  {renderEnhancedInput(
                                    'Titre de la facture',
                                    'invoice_title',
                                    'FACTURE',
                                    { icon: '📄', helper: 'Le titre principal de vos factures' }
                                  )}

                                  {renderEnhancedInput(
                                    'Préfixe numéro de facture',
                                    'invoice_number_prefix',
                                    'N° FAC-',
                                    { icon: '#️⃣', helper: 'Ex: FAC-, FACT-, INV-' }
                                  )}

                                  {renderEnhancedInput(
                                    'Label client',
                                    'client_label',
                                    'Client:',
                                    { icon: '👤', helper: 'Le label pour identifier le client' }
                                  )}
                                </View>

                                {/* Étape 6: En-têtes de tableau */}
                                {formData.invoice_title && (
                                  <>
                                    <View style={styles.designSection}>
                                      <Text style={styles.designSectionTitle}>📊 En-têtes du tableau</Text>
                                      <Text style={styles.designSectionSubtitle}>Noms des colonnes du tableau des articles</Text>

                                      <View style={styles.inputRow}>
                                        {renderEnhancedInput('Description', 'table_header_description', 'Description', { icon: '📝' })}
                                      </View>
                                      <View style={styles.inputRow}>
                                        {renderEnhancedInput('Quantité', 'table_header_quantity', 'Qté', { icon: '🔢' })}
                                      </View>
                                      <View style={styles.inputRow}>
                                        {renderEnhancedInput('Prix Unitaire', 'table_header_unit_price', 'Prix U.', { icon: '💵' })}
                                      </View>
                                      <View style={styles.inputRow}>
                                        {renderEnhancedInput('Total', 'table_header_total', 'Total', { icon: '🧮' })}
                                      </View>
                                    </View>

                                    {/* Étape 7: Labels des totaux */}
                                    {formData.table_header_description && (
                                      <>
                                        <View style={styles.designSection}>
                                          <Text style={styles.designSectionTitle}>💰 Labels des totaux</Text>
                                          <Text style={styles.designSectionSubtitle}>Textes affichés dans le récapitulatif</Text>

                                          {renderEnhancedInput('Sous-total HT', 'subtotal_label', 'Sous-total HT:', { icon: '📊' })}
                                          {renderEnhancedInput('TVA', 'vat_label', 'TVA (20%):', { icon: '💹' })}
                                          {renderEnhancedInput('Total TTC', 'total_label', 'Total TTC:', { icon: '💵' })}
                                        </View>

                                        {/* Étape 8: En-tête et pied de page */}
                                        {formData.subtotal_label && (
                                          <>
                                            <View style={styles.designSection}>
                                              <Text style={styles.designSectionTitle}>📝 En-tête & Pied de page</Text>
                                              <Text style={styles.designSectionSubtitle}>Ajoutez des textes personnalisés</Text>

                                              {renderToggle('Afficher l\'en-tête', 'show_header', '📄')}
                                              {formData.show_header && renderEnhancedInput(
                                                'Texte en-tête',
                                                'header_text',
                                                'Texte personnalisé en haut de la facture',
                                                { multiline: true, icon: '✍️', helper: 'Optionnel - Apparaîtra au dessus de la facture' }
                                              )}

                                              {renderToggle('Afficher le pied de page', 'show_footer', '🔖')}
                                              {formData.show_footer && renderEnhancedInput(
                                                'Texte pied de page',
                                                'footer_text',
                                                'Merci de votre confiance',
                                                { multiline: true, icon: '💬', helper: 'Apparaîtra en bas de la facture' }
                                              )}
                                            </View>

                                            {/* Étape 9: Options d'affichage avancées */}
                                            <View style={styles.designSection}>
                                              <Text style={styles.designSectionTitle}>⚙️ Options d'affichage</Text>
                                              <Text style={styles.designSectionSubtitle}>Éléments à afficher sur la facture</Text>
                                              {renderToggle('Afficher le logo', 'show_logo', '🖼️')}
                                              {renderToggle('Afficher les mentions légales', 'show_legal_mentions', '⚖️')}
                                            </View>
                                          </>
                                        )}
                                      </>
                                    )}
                                  </>
                                )}
                              </>
                            )}
                          </>
                        )}
                      </>
                    )}
                  </>
                )}

                <View style={{ height: 40 }} />
              </>
            )}

            {/* Tab: Payment */}
            {activeTab === 'payment' && (
              <>
                <View style={styles.designSection}>
                  <Text style={styles.designSectionTitle}>💳 Conditions de paiement</Text>
                  <Text style={styles.designSectionSubtitle}>Informez vos clients des modalités de paiement</Text>

                  {renderToggle('Afficher les conditions de paiement', 'show_payment_terms', '📋')}

                  {formData.show_payment_terms && renderEnhancedInput(
                    'Conditions de paiement',
                    'payment_terms',
                    'Paiement à 30 jours fin de mois',
                    { multiline: true, icon: '📝', helper: 'Ex: Paiement à réception, à 30 jours, etc.' }
                  )}
                </View>

                <View style={styles.designSection}>
                  <Text style={styles.designSectionTitle}>🏦 Coordonnées bancaires</Text>
                  <Text style={styles.designSectionSubtitle}>Pour faciliter les virements bancaires</Text>

                  {renderToggle('Afficher les coordonnées bancaires', 'show_bank_details', '💳')}

                  {formData.show_bank_details && (
                    <>
                      {renderEnhancedInput(
                        'Nom de la banque',
                        'bank_name',
                        'Banque Populaire',
                        { icon: '🏦', helper: 'Le nom de votre établissement bancaire' }
                      )}

                      {formData.bank_name && (
                        <>
                          {renderEnhancedInput(
                            'IBAN',
                            'bank_iban',
                            'FR76 1234 5678 9012 3456 7890 123',
                            { icon: '🔢', autoCapitalize: 'characters', helper: 'Votre numéro IBAN complet' }
                          )}

                          {formData.bank_iban && renderEnhancedInput(
                            'BIC/SWIFT',
                            'bank_bic',
                            'BNPAFRPPXXX',
                            { icon: '🌐', autoCapitalize: 'characters', helper: 'Code international de votre banque' }
                          )}
                        </>
                      )}
                    </>
                  )}
                </View>

                <View style={{ height: 40 }} />
              </>
            )}
          </ScrollView>

          {/* Right side: Preview */}
          <View style={styles.modalPreviewSection}>
            <Text style={styles.previewTitle}>✨ Prévisualisation en temps réel</Text>
            <Text style={styles.previewSubtitle}>Votre facture s'affichera comme ceci</Text>
            <ScrollView style={styles.previewContainer} showsVerticalScrollIndicator={false}>
              <View style={[
                styles.invoicePreview,
                { borderColor: formData.primary_color },
                formData.font_family && formData.font_family !== 'System' && { fontFamily: formData.font_family }
              ]}>
                {/* Header */}
                <View style={[styles.invoiceHeader, { backgroundColor: formData.primary_color }]}>
                  <View style={styles.invoiceHeaderContent}>
                    {formData.show_logo && (
                      <View style={styles.logoPlaceholder}>
                        {logoImage ? (
                          <img src={logoImage} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                        ) : (
                          <Text style={styles.logoText}>LOGO</Text>
                        )}
                      </View>
                    )}
                    <View style={styles.companyInfo}>
                      <Text style={[styles.companyName, getHighlightStyle('company_name')]}>
                        {formData.company_name || 'Nom de la société'} {formData.company_legal_form && `(${formData.company_legal_form})`}
                      </Text>
                      <Text style={[styles.companyDetail, getHighlightStyle('company_address')]}>{formData.company_address || '123 Rue Example, 75001 Paris'}</Text>
                      <Text style={[styles.companyDetail, getHighlightStyle('company_phone')]}>Tél: {formData.company_phone || '01 23 45 67 89'}</Text>
                      <Text style={[styles.companyDetail, getHighlightStyle('company_email')]}>Email: {formData.company_email || 'contact@entreprise.fr'}</Text>
                      <Text style={[styles.companyDetail, getHighlightStyle('company_siret')]}>SIRET: {formData.company_siret || '123 456 789 00012'}</Text>
                      <Text style={[styles.companyDetail, getHighlightStyle('company_rcs')]}>{formData.company_rcs || 'RCS Paris 123 456 789'}</Text>
                      <Text style={[styles.companyDetail, getHighlightStyle('company_capital')]}>Capital social: {formData.company_capital || '10 000 €'}</Text>
                      {!formData.is_micro_entreprise && <Text style={[styles.companyDetail, getHighlightStyle('company_tva')]}>N° TVA: {formData.company_tva || 'FR12345678901'}</Text>}
                      {formData.is_micro_entreprise && <Text style={styles.companyDetail}>TVA non applicable, art. 293 B du CGI</Text>}
                    </View>
                  </View>
                </View>

                {/* Invoice Info */}
                <View style={styles.invoiceInfo}>
                  <Text style={[styles.invoiceTitle, { color: formData.primary_color }, getHighlightStyle('invoice_title')]}>
                    {formData.invoice_title || 'FACTURE'}
                  </Text>
                  <Text style={[styles.invoiceNumber, getHighlightStyle('invoice_number_prefix')]}>{formData.invoice_number_prefix || 'N° FAC-'}2025-001</Text>
                  <Text style={styles.invoiceDate}>Date: {new Date().toLocaleDateString('fr-FR')}</Text>
                </View>

                {/* Client Info */}
                <View style={styles.clientInfo}>
                  <Text style={[styles.clientLabel, getHighlightStyle('client_label')]}>{formData.client_label || 'Client:'}</Text>
                  <Text style={styles.clientName}>{formData.client_name_placeholder || 'Nom du Client'}</Text>
                  <Text style={styles.clientAddress}>{formData.client_address_placeholder || 'Adresse du client'}</Text>
                </View>

                {/* Items Table */}
                <View style={styles.itemsTable}>
                  <View style={[styles.tableHeader, { backgroundColor: formData.primary_color }]}>
                    <Text style={[styles.tableHeaderText, { flex: 2 }, getHighlightStyle('table_header_description')]}>{formData.table_header_description || 'Description'}</Text>
                    <Text style={[styles.tableHeaderText, { flex: 1 }, getHighlightStyle('table_header_quantity')]}>{formData.table_header_quantity || 'Quantité'}</Text>
                    <Text style={[styles.tableHeaderText, { flex: 1 }, getHighlightStyle('table_header_unit_price')]}>{formData.table_header_unit_price || 'Prix U.'}</Text>
                    <Text style={[styles.tableHeaderText, { flex: 1 }, getHighlightStyle('table_header_total')]}>{formData.table_header_total || 'Total'}</Text>
                  </View>
                  <View style={styles.tableRow}>
                    <Text style={[styles.tableCell, { flex: 2 }]}>{formData.sample_item_description || 'Prestation exemple'}</Text>
                    <Text style={[styles.tableCell, { flex: 1 }]}>1</Text>
                    <Text style={[styles.tableCell, { flex: 1 }]}>100,00 €</Text>
                    <Text style={[styles.tableCell, { flex: 1 }]}>100,00 €</Text>
                  </View>
                </View>

                {/* Total */}
                <View style={styles.totalSection}>
                  <View style={styles.totalRow}>
                    <Text style={[styles.totalLabel, getHighlightStyle('subtotal_label')]}>{formData.subtotal_label || 'Sous-total HT:'}</Text>
                    <Text style={styles.totalValue}>100,00 €</Text>
                  </View>
                  <View style={styles.totalRow}>
                    <Text style={[styles.totalLabel, getHighlightStyle('vat_label')]}>{formData.vat_label || 'TVA (20%):'}</Text>
                    <Text style={styles.totalValue}>20,00 €</Text>
                  </View>
                  <View style={[styles.totalRow, styles.totalFinal]}>
                    <Text style={[styles.totalLabel, styles.totalFinalLabel, getHighlightStyle('total_label')]}>{formData.total_label || 'Total TTC:'}</Text>
                    <Text style={[styles.totalValue, styles.totalFinalValue, { color: formData.primary_color }]}>120,00 €</Text>
                  </View>
                </View>

                {/* Payment Terms */}
                {formData.show_payment_terms && (
                  <View style={styles.paymentTerms}>
                    <Text style={styles.paymentTermsLabel}>Conditions de paiement:</Text>
                    <Text style={[styles.paymentTermsText, getHighlightStyle('payment_terms')]}>{formData.payment_terms || 'Paiement à 30 jours'}</Text>
                  </View>
                )}

                {/* Bank Details */}
                {formData.show_bank_details && (
                  <View style={styles.bankDetails}>
                    <Text style={styles.bankDetailsLabel}>Coordonnées bancaires:</Text>
                    <Text style={[styles.bankDetailsText, getHighlightStyle('bank_name')]}>Banque: {formData.bank_name || 'Banque Populaire'}</Text>
                    <Text style={[styles.bankDetailsText, getHighlightStyle('bank_iban')]}>IBAN: {formData.bank_iban || 'FR76 1234 5678 9012 3456 7890 123'}</Text>
                    <Text style={[styles.bankDetailsText, getHighlightStyle('bank_bic')]}>BIC: {formData.bank_bic || 'BNPAFRPPXXX'}</Text>
                  </View>
                )}

                {/* Legal Mentions */}
                {(formData.show_legal_mentions !== false) && (
                  <View style={styles.legalMentions}>
                    <Text style={styles.legalMentionsTitle}>📋 Mentions légales obligatoires</Text>
                    <Text style={[styles.legalMentionsText, getHighlightStyle('late_payment_penalty')]}>• {formData.late_payment_penalty || 'En cas de retard de paiement, une pénalité égale à 3 fois le taux d\'intérêt légal sera appliquée'}</Text>
                    <Text style={[styles.legalMentionsText, getHighlightStyle('recovery_indemnity')]}>• {formData.recovery_indemnity || 'Indemnité forfaitaire de recouvrement : 40€'}</Text>
                    {formData.is_micro_entreprise && (
                      <Text style={styles.legalMentionsText}>• TVA non applicable, article 293 B du Code général des impôts</Text>
                    )}
                  </View>
                )}

                {/* Footer */}
                {formData.show_footer && (
                  <View style={[styles.invoiceFooter, { backgroundColor: formData.secondary_color || formData.primary_color }]}>
                    <Text style={[styles.footerText, getHighlightStyle('footer_text')]}>{formData.footer_text || 'Merci de votre confiance'}</Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
        </View>
      </Modal>

      {/* Fullscreen Preview Modal with Advanced Editing */}
      <Modal
        visible={fullscreenPreview}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setFullscreenPreview(false)}
      >
        <View style={styles.fullscreenContainer}>
          {/* Header */}
          <View style={styles.fullscreenHeader}>
            <TouchableOpacity onPress={() => setFullscreenPreview(false)}>
              <Text style={styles.fullscreenClose}>✕ Fermer</Text>
            </TouchableOpacity>
            <Text style={styles.fullscreenTitle}>🎨 Mode Édition Avancée</Text>
            <TouchableOpacity onPress={handleSave}>
              <Text style={styles.fullscreenSave}>Sauvegarder</Text>
            </TouchableOpacity>
          </View>

          {/* Hint */}
          <View style={styles.fullscreenHint}>
            <Text style={styles.fullscreenHintText}>
              💡 Cliquez sur n'importe quel élément de la facture pour le modifier directement
            </Text>
          </View>

          {/* Preview with editing */}
          <ScrollView style={styles.fullscreenPreview} showsVerticalScrollIndicator={false}>
            <View style={[
              styles.invoicePreviewFullscreen,
              { borderColor: formData.primary_color },
              formData.font_family && formData.font_family !== 'System' && { fontFamily: formData.font_family }
            ]}>
              {/* Header */}
              {formData.show_header && (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => openEditPanel('company_name', 'Nom de l\'entreprise')}
                  style={[
                    editingElement === 'company_name' && styles.editableElementActive,
                    hoveredElement === 'company_name' && styles.editableElementHover
                  ]}
                  onMouseEnter={() => setHoveredElement('company_name')}
                  onMouseLeave={() => setHoveredElement(null)}
                >
                  <View style={[styles.invoiceHeader, { backgroundColor: formData.primary_color }]}>
                    <View style={styles.invoiceHeaderContent}>
                      {formData.show_logo && (
                        <View style={styles.logoPlaceholder}>
                          <Text style={styles.logoText}>LOGO</Text>
                        </View>
                      )}
                      <View style={styles.companyInfo}>
                        <Text style={styles.companyName}>
                          {formData.company_name || 'Nom de la société'} {formData.company_legal_form && `(${formData.company_legal_form})`}
                        </Text>
                        {formData.company_address && <Text style={styles.companyDetail}>{formData.company_address}</Text>}
                        {formData.company_phone && <Text style={styles.companyDetail}>Tél: {formData.company_phone}</Text>}
                        {formData.company_email && <Text style={styles.companyDetail}>Email: {formData.company_email}</Text>}
                        {formData.company_siret && <Text style={styles.companyDetail}>SIRET: {formData.company_siret}</Text>}
                        {formData.company_rcs && <Text style={styles.companyDetail}>{formData.company_rcs}</Text>}
                        {formData.company_capital && <Text style={styles.companyDetail}>Capital social: {formData.company_capital}</Text>}
                        {formData.company_tva && !formData.is_micro_entreprise && <Text style={styles.companyDetail}>N° TVA: {formData.company_tva}</Text>}
                        {formData.is_micro_entreprise && <Text style={styles.companyDetail}>TVA non applicable, art. 293 B du CGI</Text>}
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              )}

              {/* Invoice Info - Editable */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => openEditPanel('invoice_title', 'Titre de la facture')}
                style={[
                  editingElement === 'invoice_title' && styles.editableElementActive,
                  hoveredElement === 'invoice_title' && styles.editableElementHover
                ]}
                onMouseEnter={() => setHoveredElement('invoice_title')}
                onMouseLeave={() => setHoveredElement(null)}
              >
                <View style={styles.invoiceInfo}>
                  <Text style={[styles.invoiceTitle, { color: formData.primary_color }]}>
                    ✏️ {formData.invoice_title || 'FACTURE'}
                  </Text>
                  <Text style={styles.invoiceNumber}>{formData.invoice_number_prefix || 'N° FAC-'}2025-001</Text>
                  <Text style={styles.invoiceDate}>Date: {new Date().toLocaleDateString('fr-FR')}</Text>
                </View>
              </TouchableOpacity>

              {/* Client Info - Editable */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => openEditPanel('client_name_placeholder', 'Nom du client (placeholder)')}
                style={[
                  editingElement === 'client_name_placeholder' && styles.editableElementActive,
                  hoveredElement === 'client_name_placeholder' && styles.editableElementHover
                ]}
                onMouseEnter={() => setHoveredElement('client_name_placeholder')}
                onMouseLeave={() => setHoveredElement(null)}
              >
                <View style={styles.clientInfo}>
                  <Text style={styles.clientLabel}>✏️ {formData.client_label || 'Client:'}</Text>
                  <Text style={styles.clientName}>{formData.client_name_placeholder || 'Nom du Client'}</Text>
                  <Text style={styles.clientAddress}>{formData.client_address_placeholder || 'Adresse du client'}</Text>
                </View>
              </TouchableOpacity>

              {/* Items Table - Headers Editable */}
              <View style={styles.itemsTable}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => openEditPanel('table_header_description', 'En-tête colonne Description')}
                  style={[
                    editingElement === 'table_header_description' && styles.editableElementActive,
                    hoveredElement === 'table_header_description' && styles.editableElementHover
                  ]}
                  onMouseEnter={() => setHoveredElement('table_header_description')}
                  onMouseLeave={() => setHoveredElement(null)}
                >
                  <View style={[styles.tableHeader, { backgroundColor: formData.primary_color }]}>
                    <Text style={[styles.tableHeaderText, { flex: 2 }]}>✏️ {formData.table_header_description || 'Description'}</Text>
                    <Text style={[styles.tableHeaderText, { flex: 1 }]}>{formData.table_header_quantity || 'Quantité'}</Text>
                    <Text style={[styles.tableHeaderText, { flex: 1 }]}>{formData.table_header_unit_price || 'Prix U.'}</Text>
                    <Text style={[styles.tableHeaderText, { flex: 1 }]}>{formData.table_header_total || 'Total'}</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => openEditPanel('sample_item_description', 'Description article exemple')}
                  style={[
                    editingElement === 'sample_item_description' && styles.editableElementActive,
                    hoveredElement === 'sample_item_description' && styles.editableElementHover
                  ]}
                  onMouseEnter={() => setHoveredElement('sample_item_description')}
                  onMouseLeave={() => setHoveredElement(null)}
                >
                  <View style={styles.tableRow}>
                    <Text style={[styles.tableCell, { flex: 2 }]}>✏️ {formData.sample_item_description || 'Prestation exemple'}</Text>
                    <Text style={[styles.tableCell, { flex: 1 }]}>1</Text>
                    <Text style={[styles.tableCell, { flex: 1 }]}>100,00 €</Text>
                    <Text style={[styles.tableCell, { flex: 1 }]}>100,00 €</Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Total - Labels Editable */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => openEditPanel('subtotal_label', 'Label Sous-total')}
                style={[
                  editingElement === 'subtotal_label' && styles.editableElementActive,
                  hoveredElement === 'subtotal_label' && styles.editableElementHover
                ]}
                onMouseEnter={() => setHoveredElement('subtotal_label')}
                onMouseLeave={() => setHoveredElement(null)}
              >
                <View style={styles.totalSection}>
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>✏️ {formData.subtotal_label || 'Sous-total HT:'}</Text>
                    <Text style={styles.totalValue}>100,00 €</Text>
                  </View>
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>{formData.vat_label || 'TVA (20%):'}</Text>
                    <Text style={styles.totalValue}>20,00 €</Text>
                  </View>
                  <View style={[styles.totalRow, styles.totalFinal]}>
                    <Text style={[styles.totalLabel, styles.totalFinalLabel]}>{formData.total_label || 'Total TTC:'}</Text>
                    <Text style={[styles.totalValue, styles.totalFinalValue, { color: formData.primary_color }]}>120,00 €</Text>
                  </View>
                </View>
              </TouchableOpacity>

              {/* Payment Terms - Editable */}
              {formData.show_payment_terms && formData.payment_terms && (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => openEditPanel('payment_terms', 'Conditions de paiement', true)}
                  style={[
                    editingElement === 'payment_terms' && styles.editableElementActive,
                    hoveredElement === 'payment_terms' && styles.editableElementHover
                  ]}
                  onMouseEnter={() => setHoveredElement('payment_terms')}
                  onMouseLeave={() => setHoveredElement(null)}
                >
                  <View style={styles.paymentTerms}>
                    <Text style={styles.paymentTermsLabel}>✏️ Conditions de paiement</Text>
                    <Text style={styles.paymentTermsText}>{formData.payment_terms}</Text>
                  </View>
                </TouchableOpacity>
              )}

              {/* Bank Details - Editable */}
              {formData.show_bank_details && (formData.bank_name || formData.bank_iban || formData.bank_bic) && (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => openEditPanel('bank_iban', 'IBAN')}
                  style={[
                    editingElement === 'bank_iban' && styles.editableElementActive,
                    hoveredElement === 'bank_iban' && styles.editableElementHover
                  ]}
                  onMouseEnter={() => setHoveredElement('bank_iban')}
                  onMouseLeave={() => setHoveredElement(null)}
                >
                  <View style={styles.bankDetails}>
                    <Text style={styles.bankDetailsLabel}>✏️ Coordonnées bancaires</Text>
                    {formData.bank_name && <Text style={styles.bankDetailsText}>Banque: {formData.bank_name}</Text>}
                    {formData.bank_iban && <Text style={styles.bankDetailsText}>IBAN: {formData.bank_iban}</Text>}
                    {formData.bank_bic && <Text style={styles.bankDetailsText}>BIC: {formData.bank_bic}</Text>}
                  </View>
                </TouchableOpacity>
              )}

              {/* Legal Mentions - Editable */}
              {(formData.show_legal_mentions !== false) && (formData.late_payment_penalty || formData.recovery_indemnity || formData.is_micro_entreprise) && (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => openEditPanel('late_payment_penalty', 'Pénalités de retard', true)}
                  style={[
                    editingElement === 'late_payment_penalty' && styles.editableElementActive,
                    hoveredElement === 'late_payment_penalty' && styles.editableElementHover
                  ]}
                  onMouseEnter={() => setHoveredElement('late_payment_penalty')}
                  onMouseLeave={() => setHoveredElement(null)}
                >
                  <View style={styles.legalMentions}>
                    <Text style={styles.legalMentionsTitle}>✏️ Mentions légales obligatoires</Text>
                    {formData.late_payment_penalty && (
                      <Text style={styles.legalMentionsText}>• {formData.late_payment_penalty}</Text>
                    )}
                    {formData.recovery_indemnity && (
                      <Text style={styles.legalMentionsText}>• {formData.recovery_indemnity}</Text>
                    )}
                    {formData.is_micro_entreprise && (
                      <Text style={styles.legalMentionsText}>• TVA non applicable, article 293 B du Code général des impôts</Text>
                    )}
                  </View>
                </TouchableOpacity>
              )}

              {/* Footer - Editable */}
              {formData.show_footer && formData.footer_text && (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => openEditPanel('footer_text', 'Pied de page')}
                  style={[
                    editingElement === 'footer_text' && styles.editableElementActive,
                    hoveredElement === 'footer_text' && styles.editableElementHover
                  ]}
                  onMouseEnter={() => setHoveredElement('footer_text')}
                  onMouseLeave={() => setHoveredElement(null)}
                >
                  <View style={[styles.invoiceFooter, { backgroundColor: formData.secondary_color || formData.primary_color }]}>
                    <Text style={styles.footerText}>✏️ {formData.footer_text}</Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>

          {/* Edit Panel - Side Panel */}
          {editPanelData && (
            <View style={styles.editPanel}>
              <View style={styles.editPanelHeader}>
                <Text style={styles.editPanelTitle}>{editPanelData.label}</Text>
                <TouchableOpacity onPress={closeEditPanel}>
                  <Text style={styles.editPanelCloseIcon}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.editPanelBody}>
                <Text style={styles.editPanelLabel}>Modifiez le contenu:</Text>
                <TextInput
                  style={[
                    styles.editPanelInput,
                    editPanelData.multiline && styles.editPanelInputMultiline
                  ]}
                  value={tempEditValue}
                  onChangeText={setTempEditValue}
                  multiline={editPanelData.multiline}
                  numberOfLines={editPanelData.multiline ? 4 : 1}
                  autoFocus
                />
              </View>

              <View style={styles.editPanelFooter}>
                <TouchableOpacity style={styles.editPanelButtonCancel} onPress={closeEditPanel}>
                  <Text style={styles.editPanelButtonCancelText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.editPanelButtonSave} onPress={saveEditPanel}>
                  <Text style={styles.editPanelButtonSaveText}>✓ Enregistrer</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
  },
  createSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    gap: 8,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  templateCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  templateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  templateInfo: {
    flex: 1,
  },
  templateName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  defaultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginVertical: 4,
  },
  defaultText: {
    fontSize: 13,
    color: '#34C759',
    fontWeight: '500',
  },
  templateDetails: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 4,
  },
  templateActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  templatePreview: {
    borderWidth: 2,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  previewHeader: {
    padding: 12,
    alignItems: 'center',
  },
  previewHeaderText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  previewContent: {
    padding: 12,
  },
  previewCompany: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  previewText: {
    fontSize: 11,
    color: '#8E8E93',
    marginBottom: 2,
  },
  previewFooter: {
    padding: 8,
    backgroundColor: '#F9F9F9',
    alignItems: 'center',
  },
  previewFooterText: {
    fontSize: 10,
    color: '#8E8E93',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  modalCancel: {
    fontSize: 17,
    color: '#007AFF',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
  },
  modalSave: {
    fontSize: 17,
    color: '#007AFF',
    fontWeight: '600',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    paddingHorizontal: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#8E8E93',
  },
  tabTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
    marginTop: 20,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  designSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  designSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
  },
  designSectionSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
    marginBottom: 16,
    lineHeight: 18,
  },
  stepIndicator: {
    fontSize: 14,
    fontWeight: '700',
    color: '#007AFF',
    marginBottom: 12,
    marginTop: 8,
  },
  // Enhanced Input Styles
  enhancedInputContainer: {
    marginBottom: 20,
  },
  inputLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  enhancedInputLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
  },
  requiredStar: {
    color: '#FF3B30',
    fontWeight: '700',
  },
  checkmarkContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#34C759',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  enhancedInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E5EA',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#000000',
    transition: 'all 0.3s ease',
  },
  inputFocused: {
    borderColor: '#007AFF',
    backgroundColor: '#F8FAFF',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  inputFilled: {
    borderColor: '#34C759',
    backgroundColor: '#F8FFF9',
  },
  inputHelper: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 6,
    fontStyle: 'italic',
  },
  progressBar: {
    height: 3,
    backgroundColor: '#E5E5EA',
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#34C759',
  },
  inputRow: {
    marginBottom: 0,
  },
  // Toggle Styles
  toggleLabelContainer: {
    flex: 1,
    marginRight: 12,
  },
  toggleBadge: {
    backgroundColor: '#34C759',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  toggleBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  // Layout Card Styles
  layoutOptionCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E5EA',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    position: 'relative',
    marginBottom: 12,
  },
  layoutOptionCardSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  layoutOptionIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  layoutOptionDesc: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
  },
  selectedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedBadgeSmall: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedBadgeText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  selectedCheck: {
    color: '#007AFF',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
  },
  // Color Picker Styles
  colorPreviewContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  colorPreview: {
    width: 100,
    height: 100,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  colorPreviewText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  colorInputContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  colorLabel: {
    fontSize: 13,
    color: '#8E8E93',
    marginBottom: 8,
    fontWeight: '600',
  },
  colorPickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  colorPickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorOptionNew: {
    width: 60,
    height: 60,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  colorOptionSelectedNew: {
    borderColor: '#FFFFFF',
    transform: [{ scale: 1.1 }],
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  colorCheckmark: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  // Font Card Styles
  fontGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  fontOptionCard: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E5EA',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    position: 'relative',
  },
  fontOptionCardSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  fontOptionIcon: {
    fontSize: 28,
    marginBottom: 6,
  },
  fontOptionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  fontOptionLabelSelected: {
    color: '#007AFF',
  },
  fontOptionDesc: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 2,
  },
  // Preview Highlight Style
  previewHighlight: {
    backgroundColor: '#FFE066',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: '700',
    ...Platform.select({
      web: {
        animation: 'pulse 1.5s ease-in-out infinite',
      },
    }),
  },
  // New Color Picker Styles
  colorPreviewLarge: {
    alignItems: 'center',
    marginBottom: 24,
  },
  colorPreviewBig: {
    width: 200,
    height: 120,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  colorCardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorCard: {
    flex: 1,
    minWidth: '30%',
    maxWidth: '32%',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E5EA',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  colorCardSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
    transform: [{ scale: 1.05 }],
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  colorCardSwatch: {
    width: 60,
    height: 60,
    borderRadius: 12,
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  colorCardIcon: {
    fontSize: 28,
  },
  colorCardName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
    lineHeight: 16,
  },
  colorCardNameSelected: {
    color: '#007AFF',
    fontWeight: '700',
  },
  colorCardCheck: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorCardCheckText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  // Logo Upload Styles
  logoUploadContainer: {
    width: '100%',
  },
  logoUploadBox: {
    backgroundColor: '#F8F9FA',
    borderWidth: 3,
    borderStyle: 'dashed',
    borderColor: '#007AFF',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 250,
  },
  logoUploadIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  logoUploadTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 8,
    textAlign: 'center',
  },
  logoUploadSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 24,
    textAlign: 'center',
  },
  logoUploadButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  logoUploadButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  logoPreviewContainer: {
    alignItems: 'center',
  },
  logoPreviewBox: {
    width: '100%',
    minHeight: 200,
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#E5E5EA',
  },
  logoChangeButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 24,
  },
  logoChangeButtonText: {
    color: '#007AFF',
    fontSize: 15,
    fontWeight: '700',
  },
  extractedColorsContainer: {
    width: '100%',
    backgroundColor: '#F0F8FF',
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  extractedColorsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#007AFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  extractedColorsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
    marginBottom: 12,
  },
  extractedColorBox: {
    width: 70,
    height: 70,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  extractedColorCheck: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  extractedColorsHint: {
    fontSize: 12,
    color: '#007AFF',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  // Custom Color Picker Styles
  colorPickerSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
    marginBottom: 16,
    textAlign: 'center',
  },
  extractedColorsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'center',
    marginBottom: 24,
  },
  extractedColorCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#E5E5EA',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  extractedColorCircleSelected: {
    borderColor: '#007AFF',
    borderWidth: 5,
    transform: [{ scale: 1.1 }],
    shadowColor: '#007AFF',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  customColorPickerContainer: {
    width: '100%',
    backgroundColor: '#F8F9FA',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  selectedColorText: {
    marginTop: 16,
    fontSize: 15,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
  },
  inputError: {
    borderColor: '#FF3B30',
    borderWidth: 1,
  },
  errorText: {
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 4,
  },
  helperText: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
    fontStyle: 'italic',
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 15,
    color: '#000000',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#000000',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  layoutOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  layoutOption: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E5EA',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  layoutOptionSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  layoutOptionText: {
    fontSize: 15,
    color: '#000000',
    fontWeight: '500',
  },
  layoutOptionTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  colorCurrentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  colorCurrentSwatch: {
    width: 50,
    height: 50,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E5E5EA',
  },
  colorInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#000000',
    fontFamily: 'monospace',
  },
  colorPickerSubLabel: {
    fontSize: 13,
    color: '#8E8E93',
    marginBottom: 8,
    fontWeight: '500',
  },
  colorPickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorOptionSelected: {
    borderColor: '#007AFF',
  },
  fontOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  fontOption: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  fontOptionSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  fontOptionText: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '500',
  },
  fontOptionTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  toggleLabel: {
    fontSize: 16,
    color: '#000000',
  },
  toggle: {
    width: 51,
    height: 31,
    borderRadius: 15.5,
    backgroundColor: '#E5E5EA',
    padding: 2,
  },
  toggleActive: {
    backgroundColor: '#34C759',
  },
  toggleThumb: {
    width: 27,
    height: 27,
    borderRadius: 13.5,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  toggleThumbActive: {
    transform: [{ translateX: 20 }],
  },
  onboardingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#FAFAFA',
  },
  onboardingIconContainer: {
    marginBottom: 32,
  },
  onboardingTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 16,
  },
  onboardingDescription: {
    fontSize: 17,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
    maxWidth: 500,
  },
  onboardingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  onboardingButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  skipButtonText: {
    color: '#8E8E93',
    fontSize: 16,
    fontWeight: '500',
  },
  // Modal preview styles
  modalBody: {
    flex: 1,
    flexDirection: 'row',
  },
  modalFormSection: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F9F9F9',
  },
  modalPreviewSection: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F8F9FA',
    borderLeftWidth: 1,
    borderLeftColor: '#E5E5EA',
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
    textAlign: 'center',
  },
  previewSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
    marginBottom: 16,
    textAlign: 'center',
  },
  previewContainer: {
    flex: 1,
  },
  invoicePreview: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
      },
    }),
  },
  invoiceHeader: {
    padding: 20,
  },
  invoiceHeaderContent: {
    flexDirection: 'row',
    gap: 16,
  },
  logoPlaceholder: {
    width: 80,
    height: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    color: '#666',
    fontSize: 12,
    fontWeight: '600',
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  companyDetail: {
    fontSize: 12,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  invoiceInfo: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  invoiceTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  invoiceNumber: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  invoiceDate: {
    fontSize: 14,
    color: '#666',
  },
  clientInfo: {
    padding: 20,
    backgroundColor: '#F9F9F9',
  },
  clientLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    marginBottom: 8,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  clientAddress: {
    fontSize: 14,
    color: '#666',
  },
  itemsTable: {
    padding: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  tableHeaderText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  tableCell: {
    fontSize: 14,
    color: '#000',
  },
  totalSection: {
    padding: 20,
    backgroundColor: '#F9F9F9',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 14,
    color: '#666',
  },
  totalValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  totalFinal: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: '#E5E5EA',
  },
  totalFinalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  totalFinalValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  paymentTerms: {
    padding: 16,
    margin: 16,
    backgroundColor: '#FFFEF0',
    borderLeftWidth: 4,
    borderLeftColor: '#FFD700',
    borderRadius: 4,
  },
  paymentTermsLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  paymentTermsText: {
    fontSize: 13,
    color: '#333',
    lineHeight: 20,
  },
  bankDetails: {
    padding: 16,
    margin: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 4,
  },
  bankDetailsLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  bankDetailsText: {
    fontSize: 12,
    color: '#333',
    marginBottom: 4,
    lineHeight: 18,
  },
  invoiceFooter: {
    padding: 16,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  legalFormOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  legalFormOption: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  legalFormOptionSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  legalFormOptionText: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '500',
  },
  legalFormOptionTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  legalMentions: {
    padding: 16,
    margin: 16,
    backgroundColor: '#FFF9E6',
    borderLeftWidth: 4,
    borderLeftColor: '#FF9500',
    borderRadius: 4,
  },
  legalMentionsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  legalMentionsText: {
    fontSize: 11,
    color: '#333',
    marginBottom: 8,
    lineHeight: 16,
  },
  fullscreenContainer: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  fullscreenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  fullscreenClose: {
    fontSize: 18,
    color: '#FF3B30',
    fontWeight: '600',
  },
  fullscreenTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
  },
  fullscreenSave: {
    fontSize: 18,
    color: '#007AFF',
    fontWeight: '600',
  },
  fullscreenHint: {
    backgroundColor: '#FFF3CD',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#FFE69C',
  },
  fullscreenHintText: {
    fontSize: 14,
    color: '#856404',
    textAlign: 'center',
    fontWeight: '500',
  },
  fullscreenPreview: {
    flex: 1,
    padding: 20,
  },
  invoicePreviewFullscreen: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    overflow: 'hidden',
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
    ...Platform.select({
      web: {
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
      },
    }),
  },
  editableElementHover: {
    ...Platform.select({
      web: {
        borderStyle: 'dashed',
        borderWidth: 2,
        borderColor: '#007AFF',
        cursor: 'pointer',
      },
    }),
  },
  editableElementActive: {
    borderWidth: 3,
    borderColor: '#34C759',
    borderStyle: 'solid',
  },
  editPanel: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 400,
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      web: {
        boxShadow: '-4px 0 20px rgba(0, 0, 0, 0.15)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: -4, height: 0 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 10,
      },
    }),
  },
  editPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    backgroundColor: '#F8F9FA',
  },
  editPanelTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    flex: 1,
  },
  editPanelCloseIcon: {
    fontSize: 24,
    color: '#666',
    fontWeight: '300',
  },
  editPanelBody: {
    flex: 1,
    padding: 20,
  },
  editPanelLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  editPanelInput: {
    backgroundColor: '#F8F9FA',
    borderWidth: 2,
    borderColor: '#E5E5EA',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000',
  },
  editPanelInputMultiline: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  editPanelFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  editPanelButtonCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#E5E5EA',
    alignItems: 'center',
  },
  editPanelButtonCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  editPanelButtonSave: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#34C759',
    alignItems: 'center',
  },
  editPanelButtonSaveText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
