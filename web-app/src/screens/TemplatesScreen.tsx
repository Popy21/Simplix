import React, { useState, useEffect, useRef } from 'react';
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
  Switch,
  Dimensions,
  Animated,
  Image,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { toAbsoluteUrl } from '../utils/url';
import { FileTextIcon, EditIcon, TrashIcon, CheckCircleIcon, EyeIcon } from '../components/Icons';
import { templatesService, uploadService, companyProfileService } from '../services/api';
import * as ImagePicker from 'expo-image-picker';

type TemplatesScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

interface InvoiceTemplate {
  id: string;
  name: string;
  is_default: boolean;
  logo_url?: string;
  // Informations légales obligatoires selon la loi française
  company_name?: string;
  company_street?: string;
  company_postal_code?: string;
  company_city?: string;
  company_country?: string;
  company_phone?: string;
  company_email?: string;
  company_siret?: string;
  company_tva?: string;
  company_rcs?: string;
  company_capital?: string;
  company_legal_form?: string;
  // Mentions légales obligatoires
  is_micro_entreprise?: boolean;
  late_payment_penalty?: string;
  recovery_indemnity?: string;
  // Apparence
  primary_color: string;
  secondary_color?: string;
  template_layout: 'classic' | 'modern' | 'minimal' | 'professional';
  font_family?: string;
  header_text?: string;
  footer_text?: string;
  // Couleurs personnalisées avancées
  table_header_color?: string;
  border_color?: string;
  text_color?: string;
  secondary_text_color?: string;
  header_background_color?: string;
  total_color?: string;
  // Textes éditables de la facture
  invoice_title?: string;
  invoice_number_prefix?: string;
  client_label?: string;
  client_name_placeholder?: string;
  client_address_placeholder?: string;
  table_header_description?: string;
  table_header_quantity?: string;
  table_header_unit_price?: string;
  table_header_total?: string;
  sample_item_description?: string;
  subtotal_label?: string;
  vat_label?: string;
  total_label?: string;
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
  // New advanced fields
  cgv_text?: string;
  custom_note?: string;
  footer_custom_text?: string;
  background_image_url?: string;
  decimal_places?: number;
  column_description_label?: string;
  column_quantity_label?: string;
  column_unit_price_label?: string;
  column_vat_label?: string;
  column_total_label?: string;
  show_cgv?: boolean;
  show_custom_note?: boolean;
  date_format?: string;
  currency_symbol?: string;
  currency_position?: 'before' | 'after';
  created_at?: string;
  updated_at?: string;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function TemplatesScreen({ navigation }: TemplatesScreenProps) {
  const [templates, setTemplates] = useState<InvoiceTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [activeEditField, setActiveEditField] = useState<string | null>(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<{ id: string; name: string; is_default: boolean } | null>(null);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [editingInline, setEditingInline] = useState<string | null>(null);
  const [companyProfileModalVisible, setCompanyProfileModalVisible] = useState(false);
  const [companyProfileData, setCompanyProfileData] = useState<any>({
    company_name: '',
    company_street: '',
    company_postal_code: '',
    company_city: '',
    company_country: 'France',
    company_siret: '',
    company_phone: '',
    company_email: '',
    company_tva: '',
    company_rcs: '',
    company_capital: '',
    company_legal_form: 'SARL',
    is_micro_entreprise: false,
    bank_iban: '',
    bank_bic: '',
    bank_name: '',
    logo_url: '',
    late_payment_penalty: 'En cas de retard de paiement, une pénalité de retard de 3 fois le taux d\'intérêt légal (actuellement 10,52% pour l\'année 2024) sera exigible le jour suivant la date de paiement figurant sur la facture. Cette pénalité est calculée sur le montant TTC de la somme restant due et court à compter de la date d\'échéance du prix, sans qu\'aucune mise en demeure préalable ne soit nécessaire.',
    recovery_indemnity: 'En sus des pénalités de retard, toute somme non payée à sa date d\'exigibilité produira de plein droit le paiement d\'une indemnité forfaitaire de 40 euros due au titre des frais de recouvrement (Art. L441-6 du Code de commerce et D. 441-5).',
    payment_terms: 'Paiement à réception de facture par virement bancaire. Date d\'échéance : 30 jours fin de mois à compter de la date d\'émission. Escompte pour paiement anticipé : néant.',
    invoice_number_prefix: '',
    footer_text: 'Merci pour votre confiance. Cette facture est à régler selon les conditions de paiement indiquées ci-dessus.',
  });
  const sidebarAnim = useRef(new Animated.Value(0)).current;
  const [blinkNameHint, setBlinkNameHint] = useState(false);

  // Form fields
  const [formData, setFormData] = useState<Partial<InvoiceTemplate>>({
    name: '',
    is_default: false,
    company_name: '',
    company_street: '',
    company_postal_code: '',
    company_city: '',
    company_country: 'France',
    company_phone: '',
    company_email: '',
    company_siret: '',
    company_tva: '',
    company_rcs: '',
    company_capital: '',
    company_legal_form: 'SARL',
    is_micro_entreprise: false,
    late_payment_penalty: 'En cas de retard de paiement, une pénalité de retard de 3 fois le taux d\'intérêt légal (actuellement 10,52% pour l\'année 2024) sera exigible le jour suivant la date de paiement figurant sur la facture. Cette pénalité est calculée sur le montant TTC de la somme restant due et court à compter de la date d\'échéance du prix, sans qu\'aucune mise en demeure préalable ne soit nécessaire.',
    recovery_indemnity: 'En sus des pénalités de retard, toute somme non payée à sa date d\'exigibilité produira de plein droit le paiement d\'une indemnité forfaitaire de 40 euros due au titre des frais de recouvrement (Art. L441-6 du Code de commerce et D. 441-5).',
    primary_color: '#2563EB',
    secondary_color: '#1E40AF',
    text_color: '#1F2937',
    secondary_text_color: '#6B7280',
    table_header_color: '#2563EB',
    border_color: '#E5E7EB',
    header_background_color: '#F3F4F6',
    total_color: '#059669',
    template_layout: 'professional',
    font_family: 'System',
    header_text: '',
    footer_text: 'Merci pour votre confiance. Cette facture est à régler selon les conditions de paiement indiquées ci-dessus.',
    invoice_title: 'FACTURE',
    invoice_number_prefix: '',
    client_label: 'Client',
    client_name_placeholder: 'Nom ou raison sociale du client',
    client_address_placeholder: 'Adresse complète de facturation',
    table_header_description: 'Désignation des biens ou services',
    table_header_quantity: 'Quantité',
    table_header_unit_price: 'Prix unitaire HT',
    table_header_total: 'Total HT',
    sample_item_description: 'Prestation de service / Livraison de bien',
    subtotal_label: 'Total HT',
    vat_label: 'TVA 20%',
    total_label: 'Total TTC',
    payment_terms: 'Paiement à réception de facture par virement bancaire. Date d\'échéance : 30 jours fin de mois à compter de la date d\'émission. Escompte pour paiement anticipé : néant.',
    bank_iban: '',
    bank_bic: '',
    bank_name: '',
    show_logo: true,
    show_header: true,
    show_footer: true,
    show_payment_terms: true,
    show_bank_details: true,
    show_legal_mentions: true,
    // New fields
    cgv_text: 'Conditions générales de vente disponibles sur demande.',
    custom_note: '',
    footer_custom_text: '',
    background_image_url: '',
    decimal_places: 2,
    column_description_label: 'Description',
    column_quantity_label: 'Quantité',
    column_unit_price_label: 'Prix unitaire HT',
    column_vat_label: 'TVA',
    column_total_label: 'Total HT',
    show_cgv: true,
    show_custom_note: false,
    date_format: 'dd/MM/yyyy',
    currency_symbol: '€',
    currency_position: 'after',
  });

  useEffect(() => {
    fetchTemplates();
    loadCompanyProfile();
  }, []);

  const loadCompanyProfile = async () => {
    try {
      const response = await companyProfileService.get();
      // Le profil existe, on le stocke pour préremplir les templates
      console.log('Company profile loaded:', response.data);
    } catch (error: any) {
      // Si 404, c'est normal - pas encore de profil créé
      if (error.response?.status !== 404) {
        console.error('Error loading company profile:', error);
      }
    }
  };

  useEffect(() => {
    Animated.timing(sidebarAnim, {
      toValue: sidebarVisible ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [sidebarVisible]);

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

  const openCreateModal = async () => {
    setEditMode(false);
    setSidebarVisible(false);
    setActiveEditField(null);

    // Essayer de charger le profil entreprise pour préremplir
    let companyProfile: any = null;
    try {
      const response = await companyProfileService.get();
      companyProfile = response.data;
    } catch (error: any) {
      // Si 404, le profil n'existe pas - demander de le créer
      if (error.response?.status === 404) {
        Alert.alert(
          'Profil entreprise requis',
          'Pour créer un template conforme à la loi française, veuillez d\'abord renseigner les informations de votre entreprise.',
          [
            {
              text: 'Annuler',
              style: 'cancel',
            },
            {
              text: 'Renseigner',
              onPress: () => setCompanyProfileModalVisible(true),
            },
          ]
        );
        return;
      }
    }

    setFormData({
      name: '',
      is_default: false,
      // Préremplir avec le profil entreprise si disponible
      company_name: companyProfile?.company_name || '',
      company_street: companyProfile?.company_street || '',
      company_postal_code: companyProfile?.company_postal_code || '',
      company_city: companyProfile?.company_city || '',
      company_country: companyProfile?.company_country || 'France',
      company_phone: companyProfile?.company_phone || '',
      company_email: companyProfile?.company_email || '',
      company_siret: companyProfile?.company_siret || '',
      company_tva: companyProfile?.company_tva || '',
      company_rcs: companyProfile?.company_rcs || '',
      company_capital: companyProfile?.company_capital || '',
      company_legal_form: companyProfile?.company_legal_form || 'SARL',
      is_micro_entreprise: companyProfile?.is_micro_entreprise || false,
      logo_url: companyProfile?.logo_url || undefined,
      late_payment_penalty: companyProfile?.late_payment_penalty || 'En cas de retard de paiement, une pénalité de retard de 3 fois le taux d\'intérêt légal (actuellement 10,52% pour l\'année 2024) sera exigible le jour suivant la date de paiement figurant sur la facture. Cette pénalité est calculée sur le montant TTC de la somme restant due et court à compter de la date d\'échéance du prix, sans qu\'aucune mise en demeure préalable ne soit nécessaire.',
      recovery_indemnity: companyProfile?.recovery_indemnity || 'En sus des pénalités de retard, toute somme non payée à sa date d\'exigibilité produira de plein droit le paiement d\'une indemnité forfaitaire de 40 euros due au titre des frais de recouvrement (Art. L441-6 du Code de commerce et D. 441-5).',
      bank_iban: companyProfile?.bank_iban || '',
      bank_bic: companyProfile?.bank_bic || '',
      bank_name: companyProfile?.bank_name || '',
      invoice_number_prefix: companyProfile?.invoice_number_prefix || '',
      footer_text: companyProfile?.footer_text || 'Merci pour votre confiance. Cette facture est à régler selon les conditions de paiement indiquées ci-dessus.',
      payment_terms: companyProfile?.payment_terms || 'Paiement à réception de facture par virement bancaire. Date d\'échéance : 30 jours fin de mois à compter de la date d\'émission. Escompte pour paiement anticipé : néant.',
      // Couleurs et style par défaut - palette moderne et élégante
      primary_color: '#1E293B',
      secondary_color: '#475569',
      text_color: '#0F172A',
      secondary_text_color: '#64748B',
      table_header_color: '#1E293B',
      border_color: '#E2E8F0',
      header_background_color: '#F8FAFC',
      total_color: '#0F766E',
      template_layout: 'professional',
      font_family: 'System',
      header_text: '',
      // Labels par défaut
      invoice_title: 'FACTURE',
      client_label: 'Client',
      client_name_placeholder: 'Nom ou raison sociale du client',
      client_address_placeholder: 'Adresse complète de facturation',
      table_header_description: 'Désignation',
      table_header_quantity: 'Qté',
      table_header_unit_price: 'Prix U. HT',
      table_header_total: 'Total HT',
      sample_item_description: 'Prestation de service / Livraison de bien',
      subtotal_label: 'Total HT',
      vat_label: 'TVA 20%',
      total_label: 'Total TTC',
      // Options d'affichage
      show_logo: true,
      show_header: true,
      show_footer: true,
      show_payment_terms: true,
      show_bank_details: true,
      show_legal_mentions: true,
      // New fields
      cgv_text: 'Conditions générales de vente disponibles sur demande.',
      custom_note: '',
      footer_custom_text: '',
      background_image_url: '',
      decimal_places: 2,
      column_description_label: 'Description',
      column_quantity_label: 'Quantité',
      column_unit_price_label: 'Prix unitaire HT',
      column_vat_label: 'TVA',
      column_total_label: 'Total HT',
      show_cgv: true,
      show_custom_note: false,
      date_format: 'dd/MM/yyyy',
      currency_symbol: '€',
      currency_position: 'after',
    });
    setModalVisible(true);
  };

  // Parser l'adresse combinée en champs séparés
  const parseAddress = (address: string | undefined) => {
    if (!address) return { street: '', postal_code: '', city: '' };
    const parts = address.split(',').map(p => p.trim());
    if (parts.length >= 3) {
      return {
        street: parts[0],
        postal_code: parts[1],
        city: parts.slice(2).join(', ')
      };
    } else if (parts.length === 2) {
      // Essayer de détecter le code postal (5 chiffres)
      const postalMatch = parts[1].match(/^(\d{5})\s*(.*)$/);
      if (postalMatch) {
        return {
          street: parts[0],
          postal_code: postalMatch[1],
          city: postalMatch[2] || ''
        };
      }
      return { street: parts[0], postal_code: '', city: parts[1] };
    }
    return { street: address, postal_code: '', city: '' };
  };

  const openEditModal = (template: InvoiceTemplate) => {
    setEditMode(true);
    setPreviewMode(false);
    setSidebarVisible(false);
    setActiveEditField(null);

    // Parser l'adresse si elle existe
    const parsedAddress = parseAddress((template as any).company_address);
    setFormData({
      ...template,
      company_street: template.company_street || parsedAddress.street,
      company_postal_code: template.company_postal_code || parsedAddress.postal_code,
      company_city: template.company_city || parsedAddress.city,
    });
    setModalVisible(true);
  };

  const openPreviewModal = (template: InvoiceTemplate) => {
    setEditMode(false);
    setPreviewMode(true);
    setSidebarVisible(false);
    setActiveEditField(null);

    // Parser l'adresse si elle existe
    const parsedAddress = parseAddress((template as any).company_address);
    setFormData({
      ...template,
      company_street: template.company_street || parsedAddress.street,
      company_postal_code: template.company_postal_code || parsedAddress.postal_code,
      company_city: template.company_city || parsedAddress.city,
    });
    setModalVisible(true);
  };

  const showError = (message: string) => {
    if (Platform.OS === 'web') {
      window.alert(message);
    } else {
      Alert.alert('Erreur', message);
    }
  };

  const validateForm = (): boolean => {
    if (!formData.name?.trim()) {
      showError('Le nom du template est obligatoire');
      // Déclencher le clignotement et ouvrir la sidebar
      setBlinkNameHint(true);
      setSidebarVisible(true);
      setTimeout(() => setBlinkNameHint(false), 3000);
      return false;
    }
    if (!formData.company_name?.trim()) {
      showError('Le nom de l\'entreprise est obligatoire');
      setSidebarVisible(true);
      return false;
    }
    if (!formData.company_siret?.trim()) {
      showError('Le SIRET est obligatoire (14 chiffres)');
      setSidebarVisible(true);
      return false;
    }
    if (formData.company_siret && !/^\d{14}$/.test(formData.company_siret)) {
      showError('Le SIRET doit contenir exactement 14 chiffres');
      setSidebarVisible(true);
      return false;
    }
    if (!formData.company_street?.trim()) {
      showError('La rue de l\'entreprise est obligatoire');
      setSidebarVisible(true);
      return false;
    }
    if (!formData.company_postal_code?.trim()) {
      showError('Le code postal est obligatoire');
      setSidebarVisible(true);
      return false;
    }
    if (!formData.company_city?.trim()) {
      showError('La ville est obligatoire');
      setSidebarVisible(true);
      return false;
    }
    if (!formData.company_legal_form?.trim()) {
      showError('La forme juridique est obligatoire');
      setSidebarVisible(true);
      return false;
    }
    // RCS est optionnel - juste un warning si absent
    if (!formData.company_rcs?.trim()) {
      console.warn('RCS non renseigné - recommandé pour la conformité légale');
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      // Combiner les champs d'adresse en company_address pour l'API
      const dataToSend = {
        ...formData,
        company_address: [
          formData.company_street,
          formData.company_postal_code,
          formData.company_city
        ].filter(Boolean).join(', ')
      };

      if (editMode && formData.id) {
        await templatesService.update(formData.id, dataToSend);
        setSuccessMessage('Template mis à jour avec succès');
      } else {
        await templatesService.create(dataToSend);
        setSuccessMessage('Template créé avec succès');
      }
      setModalVisible(false);
      setSuccessModalVisible(true);
      setTimeout(() => setSuccessModalVisible(false), 2000);
      fetchTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      showError('Impossible de sauvegarder le template');
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = (template: InvoiceTemplate) => {
    setTemplateToDelete({
      id: template.id,
      name: template.name,
      is_default: template.is_default,
    });
    setDeleteModalVisible(true);
  };

  const handleDelete = async () => {
    if (!templateToDelete) return;

    if (templateToDelete.is_default) {
      Alert.alert(
        'Impossible de supprimer',
        'Vous ne pouvez pas supprimer le template par défaut. Définissez d\'abord un autre template comme défaut.'
      );
      setDeleteModalVisible(false);
      setTemplateToDelete(null);
      return;
    }

    try {
      setLoading(true);
      await templatesService.delete(templateToDelete.id);
      Alert.alert('Succès', 'Template supprimé avec succès');
      setDeleteModalVisible(false);
      setTemplateToDelete(null);
      fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      Alert.alert('Erreur', 'Impossible de supprimer le template');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCompanyProfile = async () => {
    // Validation
    if (!companyProfileData.company_name?.trim()) {
      Alert.alert('Erreur', 'Le nom de l\'entreprise est obligatoire');
      return;
    }
    if (!companyProfileData.company_siret?.trim()) {
      Alert.alert('Erreur', 'Le SIRET est obligatoire (14 chiffres)');
      return;
    }
    if (!/^\d{14}$/.test(companyProfileData.company_siret)) {
      Alert.alert('Erreur', 'Le SIRET doit contenir exactement 14 chiffres');
      return;
    }
    if (!companyProfileData.company_street?.trim()) {
      Alert.alert('Erreur', 'La rue est obligatoire');
      return;
    }
    if (!companyProfileData.company_postal_code?.trim()) {
      Alert.alert('Erreur', 'Le code postal est obligatoire');
      return;
    }
    if (!companyProfileData.company_city?.trim()) {
      Alert.alert('Erreur', 'La ville est obligatoire');
      return;
    }

    try {
      setLoading(true);
      await companyProfileService.create(companyProfileData);
      Alert.alert('Succès', 'Profil entreprise créé avec succès');
      setCompanyProfileModalVisible(false);
      // Maintenant on peut ouvrir le modal de création de template
      openCreateModal();
    } catch (error: any) {
      console.error('Error saving company profile:', error);
      if (error.response?.status === 409) {
        Alert.alert('Erreur', 'Un profil entreprise existe déjà');
      } else {
        Alert.alert('Erreur', 'Impossible de sauvegarder le profil entreprise');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async () => {
    try {
      if (Platform.OS === 'web') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e: any) => {
          const file = e.target.files[0];
          if (file) {
            try {
              const uploadResponse = await uploadService.uploadImage(file);
              setFormData({ ...formData, logo_url: uploadResponse.data.url });
              Alert.alert('Succès', 'Logo importé avec succès');
            } catch (error) {
              console.error('Error uploading logo:', error);
              Alert.alert('Erreur', 'Impossible d\'importer le logo');
            }
          }
        };
        input.click();
      } else {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (permissionResult.granted === false) {
          Alert.alert('Permission requise', 'Vous devez autoriser l\'accès à la galerie pour importer un logo');
          return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
        if (!result.canceled && result.assets[0]) {
          const asset = result.assets[0];
          const fileName = asset.uri.split('/').pop() || 'logo.jpg';
          const fileType = asset.uri.match(/\.(jpg|jpeg|png|gif)$/i)?.[0] || '.jpg';
          const formDataUpload = new FormData();
          formDataUpload.append('image', {
            uri: asset.uri,
            type: `image/${fileType.replace('.', '')}`,
            name: fileName,
          } as any);
          const uploadResponse = await uploadService.uploadImage(formDataUpload as any);
          setFormData({ ...formData, logo_url: uploadResponse.data.url });
          Alert.alert('Succès', 'Logo importé avec succès');
        }
      }
    } catch (error) {
      console.error('Error uploading logo:', error);
      Alert.alert('Erreur', 'Impossible d\'importer le logo');
    }
  };

  const handleCompanyLogoUpload = async () => {
    try {
      if (Platform.OS === 'web') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e: any) => {
          const file = e.target.files[0];
          if (file) {
            try {
              const uploadResponse = await uploadService.uploadImage(file);
              setCompanyProfileData({ ...companyProfileData, logo_url: uploadResponse.data.url });
              Alert.alert('Succès', 'Logo importé avec succès');
            } catch (error) {
              console.error('Error uploading logo:', error);
              Alert.alert('Erreur', 'Impossible d\'importer le logo');
            }
          }
        };
        input.click();
      } else {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (permissionResult.granted === false) {
          Alert.alert('Permission requise', 'Vous devez autoriser l\'accès à la galerie pour importer un logo');
          return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
        if (!result.canceled && result.assets[0]) {
          const asset = result.assets[0];
          const fileName = asset.uri.split('/').pop() || 'logo.jpg';
          const fileType = asset.uri.match(/\.(jpg|jpeg|png|gif)$/i)?.[0] || '.jpg';
          const formDataUpload = new FormData();
          formDataUpload.append('image', {
            uri: asset.uri,
            type: `image/${fileType.replace('.', '')}`,
            name: fileName,
          } as any);
          const uploadResponse = await uploadService.uploadImage(formDataUpload as any);
          setCompanyProfileData({ ...companyProfileData, logo_url: uploadResponse.data.url });
          Alert.alert('Succès', 'Logo importé avec succès');
        }
      }
    } catch (error) {
      console.error('Error uploading logo:', error);
      Alert.alert('Erreur', 'Impossible d\'importer le logo');
    }
  };

  const renderEditableText = (
    field: keyof InvoiceTemplate,
    placeholder: string,
    style?: any,
    multiline: boolean = false
  ) => {
    const isEditing = editingInline === field;
    const value = formData[field] as string || '';

    // En mode preview, afficher uniquement le texte sans possibilité d'édition
    if (previewMode) {
      return (
        <Text style={style}>
          {value || placeholder}
        </Text>
      );
    }

    return (
      <TouchableOpacity
        onPress={() => setEditingInline(field as string)}
        style={[styles.inlineEditable, isEditing && styles.inlineEditableActive]}
        activeOpacity={0.7}
      >
        <TextInput
          style={[style, isEditing && styles.inlineEditableInput]}
          value={value}
          onChangeText={(text) => setFormData({ ...formData, [field]: text })}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          onFocus={() => setEditingInline(field as string)}
          onBlur={() => setEditingInline(null)}
          multiline={multiline}
        />
      </TouchableOpacity>
    );
  };

  const renderColorPicker = (field: keyof InvoiceTemplate, label: string) => {
    const colors = ['#2563EB', '#DC2626', '#059669', '#D97706', '#7C3AED', '#EC4899', '#1F2937'];

    return (
      <View style={styles.sidebarColorPicker}>
        <Text style={styles.sidebarLabel}>{label}</Text>
        <View style={styles.colorGrid}>
          {colors.map((color) => (
            <TouchableOpacity
              key={color}
              onPress={() => setFormData({ ...formData, [field]: color })}
              style={[
                styles.colorOption,
                { backgroundColor: color },
                formData[field] === color && styles.colorOptionSelected,
              ]}
            >
              {formData[field] === color && (
                <CheckCircleIcon size={16} color="#fff" />
              )}
            </TouchableOpacity>
          ))}
        </View>
        <TextInput
          style={styles.colorInput}
          value={formData[field] as string || ''}
          onChangeText={(text) => setFormData({ ...formData, [field]: text })}
          placeholder="#000000"
          maxLength={7}
        />
      </View>
    );
  };

  const renderSidebar = () => {
    const sidebarWidth = sidebarAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 380],
    });

    return (
      <Animated.View style={[styles.sidebar, { width: sidebarWidth }]}>
        <ScrollView style={styles.sidebarScroll} showsVerticalScrollIndicator={false}>
          {/* Template Name */}
          <View style={[styles.sidebarSection, blinkNameHint && styles.blinkingSection]}>
            <Text style={styles.sidebarSectionTitle}>Nom du template *</Text>
            <TextInput
              style={[styles.sidebarInput, blinkNameHint && styles.blinkingInput]}
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              placeholder="Nom du template"
              placeholderTextColor="#9CA3AF"
            />
            {blinkNameHint && (
              <Text style={styles.requiredFieldHint}>⚠️ Ce champ est obligatoire</Text>
            )}
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Définir comme défaut</Text>
              <Switch
                value={formData.is_default}
                onValueChange={(value) => setFormData({ ...formData, is_default: value })}
              />
            </View>
          </View>

          {/* Legal Info */}
          <View style={styles.sidebarSection}>
            <Text style={styles.sidebarSectionTitle}>Informations légales ⚠️</Text>
            <TextInput
              style={styles.sidebarInput}
              value={formData.company_name}
              onChangeText={(text) => setFormData({ ...formData, company_name: text })}
              placeholder="Raison sociale"
              placeholderTextColor="#9CA3AF"
            />
            <TextInput
              style={styles.sidebarInput}
              value={formData.company_street}
              onChangeText={(text) => setFormData({ ...formData, company_street: text })}
              placeholder="Rue *"
              placeholderTextColor="#9CA3AF"
            />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                style={[styles.sidebarInput, { flex: 1 }]}
                value={formData.company_postal_code}
                onChangeText={(text) => setFormData({ ...formData, company_postal_code: text })}
                placeholder="Code postal *"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
                maxLength={5}
              />
              <TextInput
                style={[styles.sidebarInput, { flex: 2 }]}
                value={formData.company_city}
                onChangeText={(text) => setFormData({ ...formData, company_city: text })}
                placeholder="Ville *"
                placeholderTextColor="#9CA3AF"
              />
            </View>
            <TextInput
              style={styles.sidebarInput}
              value={formData.company_siret}
              onChangeText={(text) => setFormData({ ...formData, company_siret: text })}
              placeholder="SIRET (14 chiffres)"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
              maxLength={14}
            />
            <TextInput
              style={styles.sidebarInput}
              value={formData.company_rcs}
              onChangeText={(text) => setFormData({ ...formData, company_rcs: text })}
              placeholder="RCS (ex: RCS Paris 123 456 789)"
              placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.sidebarLabel}>Forme juridique</Text>
            <View style={styles.legalFormButtons}>
              {['SARL', 'SAS', 'EURL', 'Auto-entrepreneur', 'SCI', 'Association'].map((form) => (
                <TouchableOpacity
                  key={form}
                  style={[
                    styles.legalFormButton,
                    formData.company_legal_form === form && styles.legalFormButtonActive
                  ]}
                  onPress={() => setFormData({ ...formData, company_legal_form: form })}
                >
                  <Text style={[
                    styles.legalFormButtonText,
                    formData.company_legal_form === form && styles.legalFormButtonTextActive
                  ]}>
                    {form}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.sidebarInput}
              value={formData.company_capital}
              onChangeText={(text) => setFormData({ ...formData, company_capital: text })}
              placeholder="Capital social (ex: 10 000€)"
              placeholderTextColor="#9CA3AF"
            />

            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.switchLabel}>Micro-entreprise</Text>
                <Text style={styles.switchHint}>TVA non applicable, art. 293 B</Text>
              </View>
              <Switch
                value={formData.is_micro_entreprise}
                onValueChange={(value) => setFormData({ ...formData, is_micro_entreprise: value })}
              />
            </View>

            {!formData.is_micro_entreprise && (
              <TextInput
                style={styles.sidebarInput}
                value={formData.company_tva}
                onChangeText={(text) => setFormData({ ...formData, company_tva: text })}
                placeholder="N° TVA intracommunautaire"
                placeholderTextColor="#9CA3AF"
              />
            )}

            <TextInput
              style={styles.sidebarInput}
              value={formData.company_phone}
              onChangeText={(text) => setFormData({ ...formData, company_phone: text })}
              placeholder="Téléphone"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
            />
            <TextInput
              style={styles.sidebarInput}
              value={formData.company_email}
              onChangeText={(text) => setFormData({ ...formData, company_email: text })}
              placeholder="Email"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* Colors */}
          <View style={styles.sidebarSection}>
            <Text style={styles.sidebarSectionTitle}>Couleurs</Text>
            {renderColorPicker('primary_color', 'Couleur principale')}
            {renderColorPicker('text_color', 'Couleur du texte')}
            {renderColorPicker('table_header_color', 'Couleur en-tête tableau')}
            {renderColorPicker('border_color', 'Couleur des bordures')}
            {renderColorPicker('secondary_text_color', 'Couleur texte secondaire')}
            {renderColorPicker('header_background_color', 'Couleur fond en-tête')}
            {renderColorPicker('total_color', 'Couleur du total')}
          </View>

          {/* Payment & Bank */}
          <View style={styles.sidebarSection}>
            <Text style={styles.sidebarSectionTitle}>Paiement et banque</Text>
            <TextInput
              style={[styles.sidebarInput, styles.sidebarInputMultiline]}
              value={formData.payment_terms}
              onChangeText={(text) => setFormData({ ...formData, payment_terms: text })}
              placeholder="Conditions de paiement"
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
            />
            <TextInput
              style={styles.sidebarInput}
              value={formData.bank_iban}
              onChangeText={(text) => setFormData({ ...formData, bank_iban: text })}
              placeholder="IBAN"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="characters"
            />
            <TextInput
              style={styles.sidebarInput}
              value={formData.bank_bic}
              onChangeText={(text) => setFormData({ ...formData, bank_bic: text })}
              placeholder="BIC"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="characters"
            />
            <TextInput
              style={styles.sidebarInput}
              value={formData.bank_name}
              onChangeText={(text) => setFormData({ ...formData, bank_name: text })}
              placeholder="Nom de la banque"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          {/* Legal Mentions */}
          <View style={styles.sidebarSection}>
            <Text style={styles.sidebarSectionTitle}>Mentions légales</Text>
            <TextInput
              style={[styles.sidebarInput, styles.sidebarInputMultiline]}
              value={formData.late_payment_penalty}
              onChangeText={(text) => setFormData({ ...formData, late_payment_penalty: text })}
              placeholder="Pénalités de retard"
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
            />
            <TextInput
              style={[styles.sidebarInput, styles.sidebarInputMultiline]}
              value={formData.recovery_indemnity}
              onChangeText={(text) => setFormData({ ...formData, recovery_indemnity: text })}
              placeholder="Indemnité de recouvrement"
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Display Options */}
          <View style={styles.sidebarSection}>
            <Text style={styles.sidebarSectionTitle}>Options d'affichage</Text>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Afficher le logo</Text>
              <Switch
                value={formData.show_logo}
                onValueChange={(value) => setFormData({ ...formData, show_logo: value })}
              />
            </View>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Afficher l'en-tête</Text>
              <Switch
                value={formData.show_header}
                onValueChange={(value) => setFormData({ ...formData, show_header: value })}
              />
            </View>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Afficher le pied de page</Text>
              <Switch
                value={formData.show_footer}
                onValueChange={(value) => setFormData({ ...formData, show_footer: value })}
              />
            </View>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Afficher conditions de paiement</Text>
              <Switch
                value={formData.show_payment_terms}
                onValueChange={(value) => setFormData({ ...formData, show_payment_terms: value })}
              />
            </View>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Afficher coordonnées bancaires</Text>
              <Switch
                value={formData.show_bank_details}
                onValueChange={(value) => setFormData({ ...formData, show_bank_details: value })}
              />
            </View>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Afficher mentions légales</Text>
              <Switch
                value={formData.show_legal_mentions}
                onValueChange={(value) => setFormData({ ...formData, show_legal_mentions: value })}
              />
            </View>
          </View>

          {/* CGV - Conditions Générales de Vente */}
          <View style={styles.sidebarSection}>
            <Text style={styles.sidebarSectionTitle}>Conditions Générales de Vente</Text>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Afficher les CGV</Text>
              <Switch
                value={formData.show_cgv}
                onValueChange={(value) => setFormData({ ...formData, show_cgv: value })}
              />
            </View>
            {formData.show_cgv && (
              <TextInput
                style={[styles.sidebarInput, styles.sidebarInputMultiline, { minHeight: 100 }]}
                value={formData.cgv_text}
                onChangeText={(text) => setFormData({ ...formData, cgv_text: text })}
                placeholder="Conditions générales de vente..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={5}
              />
            )}
          </View>

          {/* Note personnalisée */}
          <View style={styles.sidebarSection}>
            <Text style={styles.sidebarSectionTitle}>Note au client</Text>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Afficher une note personnalisée</Text>
              <Switch
                value={formData.show_custom_note}
                onValueChange={(value) => setFormData({ ...formData, show_custom_note: value })}
              />
            </View>
            {formData.show_custom_note && (
              <TextInput
                style={[styles.sidebarInput, styles.sidebarInputMultiline, { minHeight: 80 }]}
                value={formData.custom_note}
                onChangeText={(text) => setFormData({ ...formData, custom_note: text })}
                placeholder="Message personnalisé pour le client..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={4}
              />
            )}
          </View>

          {/* Pied de page personnalisé */}
          <View style={styles.sidebarSection}>
            <Text style={styles.sidebarSectionTitle}>Pied de page personnalisé</Text>
            <TextInput
              style={[styles.sidebarInput, styles.sidebarInputMultiline]}
              value={formData.footer_custom_text}
              onChangeText={(text) => setFormData({ ...formData, footer_custom_text: text })}
              placeholder="Texte supplémentaire pour le pied de page..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Police de caractères */}
          <View style={styles.sidebarSection}>
            <Text style={styles.sidebarSectionTitle}>Police de caractères</Text>
            <View style={styles.legalFormButtons}>
              {['Inter', 'Roboto', 'Arial', 'Times New Roman', 'Georgia', 'Courier New'].map((font) => (
                <TouchableOpacity
                  key={font}
                  style={[
                    styles.legalFormButton,
                    formData.font_family === font && styles.legalFormButtonActive
                  ]}
                  onPress={() => setFormData({ ...formData, font_family: font })}
                >
                  <Text style={[
                    styles.legalFormButtonText,
                    formData.font_family === font && styles.legalFormButtonTextActive,
                    { fontFamily: font === 'Inter' ? undefined : font }
                  ]}>
                    {font}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Intitulés des colonnes */}
          <View style={styles.sidebarSection}>
            <Text style={styles.sidebarSectionTitle}>Intitulés des colonnes</Text>
            <TextInput
              style={styles.sidebarInput}
              value={formData.column_description_label}
              onChangeText={(text) => setFormData({ ...formData, column_description_label: text })}
              placeholder="Colonne Description"
              placeholderTextColor="#9CA3AF"
            />
            <TextInput
              style={styles.sidebarInput}
              value={formData.column_quantity_label}
              onChangeText={(text) => setFormData({ ...formData, column_quantity_label: text })}
              placeholder="Colonne Quantité"
              placeholderTextColor="#9CA3AF"
            />
            <TextInput
              style={styles.sidebarInput}
              value={formData.column_unit_price_label}
              onChangeText={(text) => setFormData({ ...formData, column_unit_price_label: text })}
              placeholder="Colonne Prix unitaire"
              placeholderTextColor="#9CA3AF"
            />
            <TextInput
              style={styles.sidebarInput}
              value={formData.column_vat_label}
              onChangeText={(text) => setFormData({ ...formData, column_vat_label: text })}
              placeholder="Colonne TVA"
              placeholderTextColor="#9CA3AF"
            />
            <TextInput
              style={styles.sidebarInput}
              value={formData.column_total_label}
              onChangeText={(text) => setFormData({ ...formData, column_total_label: text })}
              placeholder="Colonne Total"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          {/* Format des nombres et devises */}
          <View style={styles.sidebarSection}>
            <Text style={styles.sidebarSectionTitle}>Format des montants</Text>
            <Text style={styles.sidebarLabel}>Nombre de décimales</Text>
            <View style={styles.legalFormButtons}>
              {[0, 1, 2, 3].map((num) => (
                <TouchableOpacity
                  key={num}
                  style={[
                    styles.legalFormButton,
                    formData.decimal_places === num && styles.legalFormButtonActive
                  ]}
                  onPress={() => setFormData({ ...formData, decimal_places: num })}
                >
                  <Text style={[
                    styles.legalFormButtonText,
                    formData.decimal_places === num && styles.legalFormButtonTextActive
                  ]}>
                    {num}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.sidebarInput}
              value={formData.currency_symbol}
              onChangeText={(text) => setFormData({ ...formData, currency_symbol: text })}
              placeholder="Symbole de devise (€, $, £...)"
              placeholderTextColor="#9CA3AF"
              maxLength={5}
            />
            <Text style={styles.sidebarLabel}>Position du symbole</Text>
            <View style={styles.legalFormButtons}>
              <TouchableOpacity
                style={[
                  styles.legalFormButton,
                  formData.currency_position === 'before' && styles.legalFormButtonActive
                ]}
                onPress={() => setFormData({ ...formData, currency_position: 'before' })}
              >
                <Text style={[
                  styles.legalFormButtonText,
                  formData.currency_position === 'before' && styles.legalFormButtonTextActive
                ]}>
                  €100 (avant)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.legalFormButton,
                  formData.currency_position === 'after' && styles.legalFormButtonActive
                ]}
                onPress={() => setFormData({ ...formData, currency_position: 'after' })}
              >
                <Text style={[
                  styles.legalFormButtonText,
                  formData.currency_position === 'after' && styles.legalFormButtonTextActive
                ]}>
                  100€ (après)
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Format de date */}
          <View style={styles.sidebarSection}>
            <Text style={styles.sidebarSectionTitle}>Format de date</Text>
            <View style={styles.legalFormButtons}>
              {[
                { value: 'dd/MM/yyyy', label: '31/12/2025' },
                { value: 'MM/dd/yyyy', label: '12/31/2025' },
                { value: 'yyyy-MM-dd', label: '2025-12-31' },
                { value: 'dd MMM yyyy', label: '31 déc 2025' },
              ].map((format) => (
                <TouchableOpacity
                  key={format.value}
                  style={[
                    styles.legalFormButton,
                    formData.date_format === format.value && styles.legalFormButtonActive
                  ]}
                  onPress={() => setFormData({ ...formData, date_format: format.value })}
                >
                  <Text style={[
                    styles.legalFormButtonText,
                    formData.date_format === format.value && styles.legalFormButtonTextActive
                  ]}>
                    {format.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Image de fond */}
          <View style={styles.sidebarSection}>
            <Text style={styles.sidebarSectionTitle}>Image de fond</Text>
            <Text style={styles.sidebarHint}>Ajoutez un filigrane ou une image de fond au document</Text>
            <TextInput
              style={styles.sidebarInput}
              value={formData.background_image_url}
              onChangeText={(text) => setFormData({ ...formData, background_image_url: text })}
              placeholder="URL de l'image de fond"
              placeholderTextColor="#9CA3AF"
            />
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={async () => {
                if (Platform.OS === 'web') {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  input.onchange = async (e: any) => {
                    const file = e.target.files[0];
                    if (file) {
                      try {
                        const uploadResponse = await uploadService.uploadImage(file);
                        setFormData({ ...formData, background_image_url: uploadResponse.data.url });
                      } catch (error) {
                        console.error('Error uploading background:', error);
                        Alert.alert('Erreur', 'Impossible d\'importer l\'image');
                      }
                    }
                  };
                  input.click();
                }
              }}
            >
              <Text style={styles.uploadButtonText}>📤 Télécharger une image</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Animated.View>
    );
  };

  const renderFullscreenPreview = () => {
    const sampleTotal = 1500;
    const sampleTVA = sampleTotal * 0.2;
    const sampleTTC = sampleTotal + sampleTVA;

    return (
      <View style={styles.fullscreenPreview}>
        {!previewMode && (
          <View style={styles.previewToolbar}>
            <View style={{ position: 'relative' }}>
              <TouchableOpacity
                style={styles.toolbarButton}
                onPress={() => setSidebarVisible(!sidebarVisible)}
              >
                <Text style={styles.toolbarButtonText}>
                  {sidebarVisible ? '◀ Masquer' : '▶ Options'}
                </Text>
              </TouchableOpacity>
              {!sidebarVisible && !formData.name && !editMode && (
                <View style={styles.nameHintArrow}>
                  <Text style={styles.nameHintText}>← Cliquez ici pour entrer un nom</Text>
                </View>
              )}
            </View>
            <View style={styles.previewHints}>
              <Text style={styles.previewHint}>💡 Cliquez sur n'importe quel texte pour le modifier</Text>
              {!editMode && (
                <Text style={styles.previewHintSmall}>
                  💼 Astuce : Créez votre profil entreprise dans les paramètres pour préremplir automatiquement ces champs !
                </Text>
              )}
            </View>
          </View>
        )}

        <ScrollView style={styles.previewScroll} contentContainerStyle={styles.previewScrollContent}>
          <View style={[styles.invoicePreview, { borderColor: formData.border_color || '#E5E7EB' }]}>
            {/* Barre décorative latérale */}
            <View style={[styles.decorativeSidebar, { backgroundColor: formData.primary_color }]} />

            {/* Header */}
            {formData.show_header && (
              <View style={[styles.invoiceHeader, { backgroundColor: formData.header_background_color || '#F3F4F6' }]}>
                <View style={styles.invoiceHeaderLeft}>
                  {renderEditableText('invoice_title', 'FACTURE', [
                    styles.invoiceTitle,
                    { color: formData.primary_color },
                    editingInline === 'invoice_title' && styles.highlightedElement
                  ])}
                  <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                    <Text style={[styles.invoiceNumberLabel, { color: formData.text_color || '#1F2937' }]}>
                      Facture N°{' '}
                    </Text>
                    {renderEditableText('invoice_number_prefix', '2025-001', [
                      styles.invoiceNumber,
                      { color: formData.text_color || '#1F2937' },
                      editingInline === 'invoice_number_prefix' && styles.highlightedElement
                    ])}
                  </View>
                  <Text style={[styles.invoiceDate, { color: formData.secondary_text_color || '#6B7280' }]}>
                    Date d'émission : {new Date().toLocaleDateString('fr-FR')}
                  </Text>
                  <Text style={[styles.invoiceDate, { color: formData.secondary_text_color || '#6B7280' }]}>
                    Date de prestation : {new Date().toLocaleDateString('fr-FR')}
                  </Text>
                </View>
                {formData.show_logo && (
                  previewMode ? (
                    <View style={styles.logoPlaceholder}>
                      {formData.logo_url ? (
                        <Image
                          source={{ uri: toAbsoluteUrl(formData.logo_url) }}
                          style={styles.logoImage}
                        />
                      ) : (
                        <View style={styles.logoPlaceholderEmpty}>
                          <Text style={styles.logoText}>Logo</Text>
                        </View>
                      )}
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.logoPlaceholder}
                      onPress={handleLogoUpload}
                      activeOpacity={0.7}
                    >
                      {formData.logo_url ? (
                        <Image
                          source={{ uri: toAbsoluteUrl(formData.logo_url) }}
                          style={styles.logoImage}
                        />
                      ) : (
                        <>
                          <Text style={styles.logoText}>📷</Text>
                          <Text style={styles.logoText}>Cliquez pour</Text>
                          <Text style={styles.logoText}>ajouter un logo</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )
                )}
              </View>
            )}

            {/* Company & Client Info */}
            <View style={styles.invoiceSection}>
              {/* Company Info */}
              <View style={styles.companyInfo}>
                {renderEditableText('company_name', 'Nom de votre entreprise', [
                  styles.companyName,
                  { color: formData.text_color || '#1F2937' },
                  editingInline === 'company_name' && styles.highlightedElement
                ])}

                {/* Adresse */}
                <View style={{ marginTop: 8, marginBottom: 12 }}>
                  {renderEditableText('company_street', 'Rue', [
                    styles.companyDetails,
                    { color: formData.secondary_text_color || '#6B7280' },
                    editingInline === 'company_street' && styles.highlightedElement
                  ])}
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 2 }}>
                    {renderEditableText('company_postal_code', 'CP', [
                      styles.companyDetails,
                      { color: formData.secondary_text_color || '#6B7280', flex: 0 },
                      editingInline === 'company_postal_code' && styles.highlightedElement
                    ])}
                    {renderEditableText('company_city', 'Ville', [
                      styles.companyDetails,
                      { color: formData.secondary_text_color || '#6B7280', flex: 1 },
                      editingInline === 'company_city' && styles.highlightedElement
                    ])}
                  </View>
                  {renderEditableText('company_country', 'Pays', [
                    styles.companyDetails,
                    { color: formData.secondary_text_color || '#6B7280', marginTop: 2 },
                    editingInline === 'company_country' && styles.highlightedElement
                  ])}
                </View>

                {/* Informations légales */}
                <View style={{ borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 12 }}>
                  {formData.company_legal_form && (
                    <View style={{ marginBottom: 4 }}>
                      <Text style={[styles.companyDetails, { color: formData.secondary_text_color || '#6B7280', fontWeight: '600' }]}>
                        {formData.company_legal_form}
                      </Text>
                    </View>
                  )}
                  <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                    <Text style={[styles.companyDetailsLabel, { color: formData.secondary_text_color || '#6B7280' }]}>
                      SIRET :
                    </Text>
                    {renderEditableText('company_siret', '00000000000000', [
                      styles.companyDetails,
                      { color: formData.secondary_text_color || '#6B7280' },
                      editingInline === 'company_siret' && styles.highlightedElement
                    ])}
                  </View>
                  {formData.company_rcs && (
                    <View style={{ marginBottom: 4 }}>
                      {renderEditableText('company_rcs', 'RCS PARIS 123456789', [
                        styles.companyDetails,
                        { color: formData.secondary_text_color || '#6B7280' },
                        editingInline === 'company_rcs' && styles.highlightedElement
                      ])}
                    </View>
                  )}
                  {formData.company_capital && (
                    <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                      <Text style={[styles.companyDetailsLabel, { color: formData.secondary_text_color || '#6B7280' }]}>
                        Capital :
                      </Text>
                      {renderEditableText('company_capital', '10 000 €', [
                        styles.companyDetails,
                        { color: formData.secondary_text_color || '#6B7280' },
                        editingInline === 'company_capital' && styles.highlightedElement
                      ])}
                    </View>
                  )}
                  {!formData.is_micro_entreprise && formData.company_tva && (
                    <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                      <Text style={[styles.companyDetailsLabel, { color: formData.secondary_text_color || '#6B7280' }]}>
                        N° TVA :
                      </Text>
                      {renderEditableText('company_tva', 'FR00000000000', [
                        styles.companyDetails,
                        { color: formData.secondary_text_color || '#6B7280' },
                        editingInline === 'company_tva' && styles.highlightedElement
                      ])}
                    </View>
                  )}
                  {formData.is_micro_entreprise && (
                    <Text style={[styles.companyDetails, { color: formData.secondary_text_color || '#6B7280', fontStyle: 'italic', fontSize: 11 }]}>
                      TVA non applicable, art. 293 B du CGI
                    </Text>
                  )}
                </View>
              </View>

              {/* Client Info - Placeholder */}
              <View style={styles.clientInfoPlaceholder}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.clientSectionLabel, { color: formData.primary_color }]}>
                      FACTURÉ À
                    </Text>
                    <Text style={[styles.clientPlaceholderText, { color: formData.text_color || '#1F2937', marginTop: 8 }]}>
                      Votre client
                    </Text>
                    <View style={{ marginTop: 8 }}>
                      <Text style={[styles.clientDetailsPlaceholder, { color: formData.secondary_text_color || '#6B7280' }]}>
                        Nom du contact
                      </Text>
                      <Text style={[styles.clientDetailsPlaceholder, { color: formData.secondary_text_color || '#6B7280' }]}>
                        Adresse
                      </Text>
                      <Text style={[styles.clientDetailsPlaceholder, { color: formData.secondary_text_color || '#6B7280' }]}>
                        Code Postal + Ville
                      </Text>
                      <Text style={[styles.clientDetailsPlaceholder, { color: formData.secondary_text_color || '#6B7280', marginTop: 4 }]}>
                        Numéro de téléphone
                      </Text>
                      <Text style={[styles.clientDetailsPlaceholder, { color: formData.secondary_text_color || '#6B7280' }]}>
                        E-mail
                      </Text>
                    </View>
                  </View>

                  {/* Client Logo Placeholder - Aligned Right */}
                  <View style={styles.clientLogoPlaceholder}>
                    <Text style={styles.clientLogoText}>🏢</Text>
                    <Text style={[styles.clientLogoTextSmall, { color: formData.secondary_text_color || '#6B7280' }]}>
                      Logo client
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Items Table */}
            <View style={styles.invoiceTable}>
              <View style={[styles.tableHeader, { backgroundColor: formData.table_header_color || '#2563EB' }]}>
                {renderEditableText('table_header_description', 'Désignation', [
                  styles.tableHeaderText,
                  styles.tableColDescription,
                  editingInline === 'table_header_description' && styles.highlightedElement
                ])}
                {renderEditableText('table_header_quantity', 'Qté', [
                  styles.tableHeaderText,
                  styles.tableColQty,
                  editingInline === 'table_header_quantity' && styles.highlightedElement
                ])}
                {renderEditableText('table_header_unit_price', 'Prix U.', [
                  styles.tableHeaderText,
                  styles.tableColPrice,
                  editingInline === 'table_header_unit_price' && styles.highlightedElement
                ])}
                {renderEditableText('table_header_total', 'Total', [
                  styles.tableHeaderText,
                  styles.tableColTotal,
                  editingInline === 'table_header_total' && styles.highlightedElement
                ])}
              </View>
              <View style={[styles.tableRow, { borderColor: formData.border_color || '#E5E7EB' }]}>
                {renderEditableText('sample_item_description', 'Prestation de conseil', [
                  styles.tableCell,
                  styles.tableColDescription,
                  { color: formData.text_color || '#1F2937' },
                  editingInline === 'sample_item_description' && styles.highlightedElement
                ])}
                <Text style={[styles.tableCell, styles.tableColQty, { color: formData.text_color || '#1F2937' }]}>1</Text>
                <Text style={[styles.tableCell, styles.tableColPrice, { color: formData.text_color || '#1F2937' }]}>1 500,00 €</Text>
                <Text style={[styles.tableCell, styles.tableColTotal, { color: formData.text_color || '#1F2937' }]}>1 500,00 €</Text>
              </View>
            </View>

            {/* Totals */}
            <View style={styles.totalsSection}>
              <View style={styles.totalRow}>
                {renderEditableText('subtotal_label', 'Sous-total HT', [
                  styles.totalLabel,
                  { color: formData.secondary_text_color || '#6B7280' },
                  editingInline === 'subtotal_label' && styles.highlightedElement
                ])}
                <Text style={[styles.totalValue, { color: formData.text_color || '#1F2937' }]}>
                  {sampleTotal.toFixed(2)} €
                </Text>
              </View>
              {!formData.is_micro_entreprise && (
                <View style={styles.totalRow}>
                  {renderEditableText('vat_label', 'TVA 20%', [
                    styles.totalLabel,
                    { color: formData.secondary_text_color || '#6B7280' },
                    editingInline === 'vat_label' && styles.highlightedElement
                  ])}
                  <Text style={[styles.totalValue, { color: formData.text_color || '#1F2937' }]}>
                    {sampleTVA.toFixed(2)} €
                  </Text>
                </View>
              )}
              <View style={[styles.totalRow, styles.grandTotalRow, { backgroundColor: formData.header_background_color || '#F3F4F6' }]}>
                {renderEditableText('total_label', 'Total TTC', [
                  styles.grandTotalLabel,
                  { color: formData.total_color || '#059669' },
                  editingInline === 'total_label' && styles.highlightedElement
                ])}
                <Text style={[styles.grandTotalValue, { color: formData.total_color || '#059669' }]}>
                  {formData.is_micro_entreprise ? sampleTotal.toFixed(2) : sampleTTC.toFixed(2)} €
                </Text>
              </View>
            </View>

            {/* Payment Terms */}
            {formData.show_payment_terms && (
              <View style={styles.paymentTermsSection}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <Text style={[styles.sectionTitle, { marginBottom: 0, color: formData.primary_color }]}>
                    Conditions de paiement
                  </Text>
                  <View style={styles.legalWarningBadge}>
                    <Text style={styles.legalWarningText}>⚖️ Contraintes légales</Text>
                  </View>
                </View>
                {renderEditableText('payment_terms', 'Paiement à réception de facture par virement bancaire. Date d\'échéance : 30 jours fin de mois à compter de la date d\'émission. Escompte pour paiement anticipé : néant.', [
                  styles.paymentTermsEditableText,
                  { color: formData.text_color || '#1F2937' },
                  editingInline === 'payment_terms' && styles.highlightedElement
                ], true)}
                <Text style={styles.legalWarningFootnote}>
                  ⚠️ Les délais de paiement sont réglementés : 30 jours maximum pour les transactions commerciales (ou 45 jours fin de mois selon accord). Les pénalités de retard et l'indemnité forfaitaire de 40€ sont obligatoires.
                </Text>
              </View>
            )}

            {/* Bank Details */}
            {formData.show_bank_details && (
              <View style={styles.invoiceSection}>
                <Text style={[styles.sectionTitle, { color: formData.primary_color }]}>
                  Coordonnées bancaires
                </Text>
                <View style={{ flexDirection: 'row' }}>
                  <Text style={[styles.sectionText, { color: formData.text_color || '#1F2937' }]}>IBAN : </Text>
                  {renderEditableText('bank_iban', 'FR76 1234 5678 9012 3456 7890 123', [
                    styles.sectionText,
                    { color: formData.text_color || '#1F2937' },
                    editingInline === 'bank_iban' && styles.highlightedElement
                  ])}
                </View>
                <View style={{ flexDirection: 'row' }}>
                  <Text style={[styles.sectionText, { color: formData.text_color || '#1F2937' }]}>BIC : </Text>
                  {renderEditableText('bank_bic', 'BNPAFRPPXXX', [
                    styles.sectionText,
                    { color: formData.text_color || '#1F2937' },
                    editingInline === 'bank_bic' && styles.highlightedElement
                  ])}
                </View>
                {renderEditableText('bank_name', 'Nom de votre banque', [
                  styles.sectionText,
                  { color: formData.text_color || '#1F2937' },
                  editingInline === 'bank_name' && styles.highlightedElement
                ])}
              </View>
            )}

            {/* Legal Mentions */}
            {formData.show_legal_mentions && (
              <View style={[styles.legalSection, { borderColor: formData.border_color || '#E5E7EB' }]}>
                <Text style={[styles.legalTitle, { color: formData.text_color || '#1F2937' }]}>
                  Mentions légales
                </Text>
                {renderEditableText('late_payment_penalty', 'En cas de retard de paiement, une pénalité de retard de 3 fois le taux d\'intérêt légal sera exigible le jour suivant la date de paiement figurant sur la facture. Cette pénalité est calculée sur le montant TTC de la somme restant due et court à compter de la date d\'échéance du prix.', [
                  styles.legalText,
                  { color: formData.secondary_text_color || '#6B7280' },
                  editingInline === 'late_payment_penalty' && styles.highlightedElement
                ], true)}
                {renderEditableText('recovery_indemnity', 'En sus des pénalités de retard, toute somme non payée à sa date d\'exigibilité produira de plein droit le paiement d\'une indemnité forfaitaire de 40 euros due au titre des frais de recouvrement (Art. L441-6 du Code de commerce et D. 441-5).', [
                  styles.legalText,
                  { color: formData.secondary_text_color || '#6B7280' },
                  editingInline === 'recovery_indemnity' && styles.highlightedElement
                ], true)}
              </View>
            )}

            {/* CGV - Conditions Générales de Vente */}
            {formData.show_cgv && formData.cgv_text && (
              <View style={[styles.cgvSection, { borderColor: formData.border_color || '#E5E7EB' }]}>
                <Text style={[styles.cgvTitle, { color: formData.text_color || '#1F2937' }]}>
                  Conditions Générales de Vente
                </Text>
                <Text style={[styles.cgvText, { color: formData.secondary_text_color || '#6B7280' }]}>
                  {formData.cgv_text}
                </Text>
              </View>
            )}

            {/* Note personnalisée */}
            {formData.show_custom_note && formData.custom_note && (
              <View style={[styles.customNoteSection, { borderColor: formData.primary_color || '#2563EB', backgroundColor: `${formData.primary_color || '#2563EB'}08` }]}>
                <Text style={[styles.customNoteTitle, { color: formData.primary_color || '#2563EB' }]}>
                  📝 Note
                </Text>
                <Text style={[styles.customNoteText, { color: formData.text_color || '#1F2937' }]}>
                  {formData.custom_note}
                </Text>
              </View>
            )}

            {/* Footer personnalisé */}
            {formData.footer_custom_text && (
              <View style={styles.footerCustomSection}>
                <Text style={[styles.footerCustomText, { color: formData.secondary_text_color || '#6B7280' }]}>
                  {formData.footer_custom_text}
                </Text>
              </View>
            )}

            {/* Footer */}
            {formData.show_footer && (
              <View style={styles.invoiceFooter}>
                <View style={{ width: '100%' }}>
                  {renderEditableText('footer_text', 'Merci pour votre confiance. Cette facture est à régler selon les conditions de paiement indiquées ci-dessus.', [
                    styles.footerText,
                    { color: formData.secondary_text_color || '#6B7280' },
                    editingInline === 'footer_text' && styles.highlightedElement
                  ], true)}
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Templates de facture</Text>
        <TouchableOpacity style={styles.addButton} onPress={openCreateModal}>
          <Text style={styles.addButtonText}>+ Nouveau template</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.templatesList}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {templates.map((template) => (
          <View key={template.id} style={styles.templateCard}>
            <View style={styles.templateHeader}>
              <FileTextIcon size={24} color={template.primary_color || '#007AFF'} />
              <View style={styles.templateInfo}>
                <Text style={styles.templateName}>{template.name}</Text>
                {template.is_default && (
                  <View style={styles.defaultBadge}>
                    <Text style={styles.defaultBadgeText}>Par défaut</Text>
                  </View>
                )}
              </View>
            </View>
            <View style={styles.templateActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => openPreviewModal(template)}
              >
                <EyeIcon size={20} color="#6B7280" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => openEditModal(template)}
              >
                <EditIcon size={20} color="#007AFF" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => confirmDelete(template)}
              >
                <TrashIcon size={20} color="#DC2626" />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Fullscreen Editor Modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="fullScreen">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.modalCloseButton}>✕ Fermer</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {previewMode ? 'Aperçu du template' : editMode ? 'Modifier le template' : 'Nouveau template'}
            </Text>
            {!previewMode && (
              <TouchableOpacity onPress={handleSave} disabled={loading}>
                <Text style={[styles.modalSaveButton, loading && styles.modalSaveButtonDisabled]}>
                  💾 Enregistrer
                </Text>
              </TouchableOpacity>
            )}
            {previewMode && <View style={{ width: 100 }} />}
          </View>

          <View style={styles.editorContainer}>
            {!previewMode && renderSidebar()}
            {renderFullscreenPreview()}
          </View>
        </View>
      </Modal>

      {/* Company Profile Modal */}
      <Modal visible={companyProfileModalVisible} animationType="slide" transparent>
        <View style={styles.deleteModalOverlay}>
          <ScrollView contentContainerStyle={styles.companyProfileModalContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.deleteModalTitle}>Profil Entreprise</Text>
            <Text style={styles.deleteModalText}>
              Pour créer des factures conformes à la loi française, veuillez renseigner les informations de votre entreprise.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nom de l'entreprise *</Text>
              <TextInput
                style={styles.input}
                value={companyProfileData.company_name}
                onChangeText={(text) => setCompanyProfileData({ ...companyProfileData, company_name: text })}
                placeholder="Ex: SARL Tech Solutions"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>SIRET * (14 chiffres)</Text>
              <TextInput
                style={styles.input}
                value={companyProfileData.company_siret}
                onChangeText={(text) => setCompanyProfileData({ ...companyProfileData, company_siret: text })}
                placeholder="12345678901234"
                keyboardType="numeric"
                maxLength={14}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Rue *</Text>
              <TextInput
                style={styles.input}
                value={companyProfileData.company_street}
                onChangeText={(text) => setCompanyProfileData({ ...companyProfileData, company_street: text })}
                placeholder="Ex: 123 Rue de la République"
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Code Postal *</Text>
                <TextInput
                  style={styles.input}
                  value={companyProfileData.company_postal_code}
                  onChangeText={(text) => setCompanyProfileData({ ...companyProfileData, company_postal_code: text })}
                  placeholder="75001"
                  keyboardType="numeric"
                  maxLength={5}
                />
              </View>

              <View style={[styles.inputGroup, { flex: 2 }]}>
                <Text style={styles.inputLabel}>Ville *</Text>
                <TextInput
                  style={styles.input}
                  value={companyProfileData.company_city}
                  onChangeText={(text) => setCompanyProfileData({ ...companyProfileData, company_city: text })}
                  placeholder="Paris"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Pays</Text>
              <TextInput
                style={styles.input}
                value={companyProfileData.company_country}
                onChangeText={(text) => setCompanyProfileData({ ...companyProfileData, company_country: text })}
                placeholder="France"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Forme juridique</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={companyProfileData.company_legal_form}
                  onValueChange={(value) => setCompanyProfileData({ ...companyProfileData, company_legal_form: value })}
                  style={styles.picker}
                >
                  <Picker.Item label="SARL (Société à Responsabilité Limitée)" value="SARL" />
                  <Picker.Item label="SAS (Société par Actions Simplifiée)" value="SAS" />
                  <Picker.Item label="SASU (SAS Unipersonnelle)" value="SASU" />
                  <Picker.Item label="EURL (Entreprise Unipersonnelle à Responsabilité Limitée)" value="EURL" />
                  <Picker.Item label="SA (Société Anonyme)" value="SA" />
                  <Picker.Item label="SNC (Société en Nom Collectif)" value="SNC" />
                  <Picker.Item label="Auto-entrepreneur / Micro-entreprise" value="Auto-entrepreneur" />
                  <Picker.Item label="EI (Entreprise Individuelle)" value="EI" />
                  <Picker.Item label="EIRL (Entreprise Individuelle à Responsabilité Limitée)" value="EIRL" />
                  <Picker.Item label="Association" value="Association" />
                  <Picker.Item label="Autre" value="Autre" />
                </Picker>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Téléphone</Text>
              <TextInput
                style={styles.input}
                value={companyProfileData.company_phone}
                onChangeText={(text) => setCompanyProfileData({ ...companyProfileData, company_phone: text })}
                placeholder="Ex: +33 1 23 45 67 89"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
                value={companyProfileData.company_email}
                onChangeText={(text) => setCompanyProfileData({ ...companyProfileData, company_email: text })}
                placeholder="contact@entreprise.fr"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>RCS (Registre du Commerce)</Text>
              <TextInput
                style={styles.input}
                value={companyProfileData.company_rcs}
                onChangeText={(text) => setCompanyProfileData({ ...companyProfileData, company_rcs: text })}
                placeholder="Ex: RCS Paris 123 456 789"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Capital social</Text>
              <TextInput
                style={styles.input}
                value={companyProfileData.company_capital}
                onChangeText={(text) => setCompanyProfileData({ ...companyProfileData, company_capital: text })}
                placeholder="Ex: 10 000 €"
              />
            </View>

            <View style={[styles.inputGroup, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
              <Text style={styles.inputLabel}>TVA applicable</Text>
              <Switch
                value={!companyProfileData.is_micro_entreprise}
                onValueChange={(value) => setCompanyProfileData({ ...companyProfileData, is_micro_entreprise: !value })}
              />
            </View>

            {!companyProfileData.is_micro_entreprise && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>N° TVA Intracommunautaire</Text>
                <TextInput
                  style={styles.input}
                  value={companyProfileData.company_tva}
                  onChangeText={(text) => setCompanyProfileData({ ...companyProfileData, company_tva: text })}
                  placeholder="Ex: FR 12 345678901"
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Logo (optionnel)</Text>
              <TouchableOpacity style={styles.uploadButton} onPress={handleCompanyLogoUpload}>
                <Text style={styles.uploadButtonText}>
                  {companyProfileData.logo_url ? '✓ Logo sélectionné' : 'Choisir un logo'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.deleteModalActions}>
              <TouchableOpacity
                style={[styles.deleteModalButton, styles.deleteModalCancelButton]}
                onPress={() => setCompanyProfileModalVisible(false)}
              >
                <Text style={styles.deleteModalCancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteModalButton, styles.deleteModalConfirmButton]}
                onPress={handleSaveCompanyProfile}
                disabled={loading}
              >
                <Text style={styles.deleteModalConfirmButtonText}>
                  {loading ? 'Enregistrement...' : 'Enregistrer'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal visible={deleteModalVisible} animationType="fade" transparent>
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalContent}>
            <Text style={styles.deleteModalTitle}>Confirmer la suppression</Text>
            <Text style={styles.deleteModalText}>
              Êtes-vous sûr de vouloir supprimer le template "{templateToDelete?.name}" ?
            </Text>
            <View style={styles.deleteModalActions}>
              <TouchableOpacity
                style={[styles.deleteModalButton, styles.deleteModalCancelButton]}
                onPress={() => {
                  setDeleteModalVisible(false);
                  setTemplateToDelete(null);
                }}
              >
                <Text style={styles.deleteModalCancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteModalButton, styles.deleteModalConfirmButton]}
                onPress={handleDelete}
              >
                <Text style={styles.deleteModalConfirmButtonText}>Supprimer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal visible={successModalVisible} animationType="fade" transparent>
        <View style={styles.successModalOverlay}>
          <View style={styles.successModalContent}>
            <View style={styles.successIconContainer}>
              <CheckCircleIcon size={48} color="#10B981" />
            </View>
            <Text style={styles.successModalText}>{successMessage}</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  addButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  templatesList: {
    flex: 1,
    padding: 20,
  },
  templateCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  templateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  templateInfo: {
    marginLeft: 12,
    flex: 1,
  },
  templateName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  defaultBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  defaultBadgeText: {
    color: '#2563EB',
    fontSize: 12,
    fontWeight: '500',
  },
  templateActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
    zIndex: 10,
  },
  modalCloseButton: {
    fontSize: 16,
    color: '#DC2626',
    fontWeight: '600',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  modalSaveButton: {
    fontSize: 16,
    color: '#2563EB',
    fontWeight: '600',
  },
  modalSaveButtonDisabled: {
    opacity: 0.5,
  },
  editorContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    backgroundColor: '#fff',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 5,
  },
  sidebarScroll: {
    flex: 1,
  },
  sidebarSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  sidebarSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sidebarLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
    marginTop: 12,
  },
  sidebarInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    padding: 10,
    fontSize: 14,
    color: '#111827',
    marginBottom: 12,
  },
  blinkingSection: {
    backgroundColor: '#FEF3C7',
    borderWidth: 2,
    borderColor: '#F59E0B',
    borderRadius: 8,
  },
  blinkingInput: {
    borderColor: '#F59E0B',
    borderWidth: 2,
    backgroundColor: '#FFFBEB',
  },
  requiredFieldHint: {
    fontSize: 12,
    fontWeight: '600',
    color: '#D97706',
    marginTop: -8,
    marginBottom: 8,
  },
  sidebarInputMultiline: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  switchLabel: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '500',
  },
  switchHint: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  legalFormButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  legalFormButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
  },
  legalFormButtonActive: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  legalFormButtonText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  legalFormButtonTextActive: {
    color: '#2563EB',
    fontWeight: '600',
  },
  sidebarColorPicker: {
    marginBottom: 16,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorOptionSelected: {
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  colorInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    padding: 8,
    fontSize: 13,
    color: '#111827',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  fullscreenPreview: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  previewToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  toolbarButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  toolbarButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  nameHintArrow: {
    position: 'absolute',
    left: '105%',
    top: '50%',
    transform: [{ translateY: -10 }],
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FCD34D',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 1000,
  },
  nameHintText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
    whiteSpace: 'nowrap',
  },
  previewHint: {
    fontSize: 13,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  previewScroll: {
    flex: 1,
  },
  previewScrollContent: {
    padding: 40,
    alignItems: 'center',
  },
  invoicePreview: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 56,
    paddingLeft: 64,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
    width: Math.min(screenWidth - 80, 850),
    minHeight: screenHeight - 200,
    position: 'relative',
  },
  decorativeSidebar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 6,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 28,
    borderRadius: 12,
    marginBottom: 40,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 1,
  },
  invoiceHeaderLeft: {
    flex: 1,
  },
  invoiceTitle: {
    fontSize: 40,
    fontWeight: '900',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  invoiceNumberLabel: {
    fontSize: 15,
    fontWeight: '500',
    marginRight: 6,
    letterSpacing: 0.3,
  },
  invoiceNumber: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  invoiceDate: {
    fontSize: 14,
    marginBottom: 4,
    lineHeight: 20,
  },
  logoPlaceholder: {
    width: 140,
    height: 140,
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  logoPlaceholderEmpty: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 6,
    resizeMode: 'contain',
  },
  logoText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
    textAlign: 'center',
  },
  invoiceSection: {
    marginBottom: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 32,
  },
  invoiceSectionSingle: {
    marginBottom: 40,
  },
  companyInfo: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    padding: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  companyName: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  companyDetails: {
    fontSize: 13,
    marginBottom: 2,
    lineHeight: 20,
  },
  companyDetailsLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginRight: 6,
    minWidth: 80,
  },
  clientInfoPlaceholder: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  clientSectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 14,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  clientPlaceholderText: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  clientDetailsPlaceholder: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 2,
  },
  clientLogoPlaceholder: {
    width: 80,
    height: 80,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    marginLeft: 12,
  },
  clientLogoText: {
    fontSize: 28,
  },
  clientLogoTextSmall: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
  },
  clientInfo: {
    flex: 1,
    alignItems: 'flex-end',
    backgroundColor: '#F9FAFB',
    padding: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  clientLabel: {
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 14,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  clientName: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 10,
  },
  clientAddress: {
    fontSize: 13,
    textAlign: 'right',
    lineHeight: 20,
  },
  invoiceTable: {
    marginBottom: 40,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  tableHeader: {
    flexDirection: 'row',
    padding: 16,
  },
  tableHeaderText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  tableRow: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  tableCell: {
    fontSize: 15,
    lineHeight: 22,
  },
  tableColDescription: {
    flex: 3,
  },
  tableColQty: {
    flex: 1,
    textAlign: 'center',
  },
  tableColPrice: {
    flex: 1.5,
    textAlign: 'right',
  },
  tableColTotal: {
    flex: 1.5,
    textAlign: 'right',
  },
  totalsSection: {
    alignSelf: 'flex-end',
    minWidth: 340,
    marginBottom: 40,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    borderRadius: 12,
    overflow: 'hidden',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: '#FAFAFA',
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  grandTotalRow: {
    marginTop: 0,
    paddingVertical: 18,
    borderRadius: 0,
    borderTopWidth: 2,
    borderTopColor: '#E5E7EB',
  },
  grandTotalLabel: {
    fontSize: 19,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  grandTotalValue: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  sectionText: {
    fontSize: 14,
    lineHeight: 22,
  },
  paymentTermsSection: {
    marginBottom: 32,
    backgroundColor: '#FFFBF0',
    padding: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderLeftWidth: 4,
  },
  paymentTermsEditableText: {
    fontSize: 14,
    lineHeight: 24,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  legalWarningBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  legalWarningText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
    letterSpacing: 0.3,
  },
  legalWarningFootnote: {
    fontSize: 11,
    lineHeight: 16,
    color: '#92400E',
    fontStyle: 'italic',
    backgroundColor: '#FEF3C7',
    padding: 10,
    borderRadius: 6,
    marginTop: 8,
  },
  legalSection: {
    borderTopWidth: 2,
    marginTop: 24,
    backgroundColor: '#FAFAFA',
    padding: 20,
    borderRadius: 10,
  },
  legalTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  legalText: {
    fontSize: 12,
    lineHeight: 20,
    marginBottom: 12,
    paddingBottom: 4,
  },
  invoiceFooter: {
    marginTop: 40,
    paddingTop: 24,
    paddingBottom: 0,
    alignItems: 'center',
    borderTopWidth: 2,
    borderTopColor: '#E5E7EB',
  },
  footerText: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.2,
    fontStyle: 'italic',
    textAlign: 'center',
    width: '100%',
  },
  // CGV Section
  cgvSection: {
    borderTopWidth: 1,
    marginTop: 20,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#FAFAFA',
    borderRadius: 8,
  },
  cgvTitle: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  cgvText: {
    fontSize: 10,
    lineHeight: 16,
  },
  // Custom Note Section
  customNoteSection: {
    borderWidth: 1,
    marginTop: 16,
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
  },
  customNoteTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  customNoteText: {
    fontSize: 13,
    lineHeight: 20,
  },
  // Footer Custom Section
  footerCustomSection: {
    marginTop: 16,
    paddingTop: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  footerCustomText: {
    fontSize: 11,
    lineHeight: 18,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  // Sidebar Hint
  sidebarHint: {
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  inlineEditable: {
    borderRadius: 4,
    padding: 4,
    margin: -4,
  },
  inlineEditableActive: {
    backgroundColor: '#FEF3C7',
  },
  inlineEditableInput: {
    fontWeight: '600',
  },
  highlightedElement: {
    backgroundColor: '#FEF3C7',
  },
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  deleteModalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  deleteModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  deleteModalText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
    lineHeight: 20,
  },
  deleteModalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  deleteModalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteModalCancelButton: {
    backgroundColor: '#F3F4F6',
  },
  deleteModalCancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  deleteModalConfirmButton: {
    backgroundColor: '#DC2626',
  },
  deleteModalConfirmButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  successModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  successModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  successIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successModalText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
  companyProfileModalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    margin: 20,
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  uploadButton: {
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  pickerContainer: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    fontSize: 14,
    color: '#111827',
  },
});
