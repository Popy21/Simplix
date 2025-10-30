import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform, Modal, TextInput, Switch } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useAuth } from '../context/AuthContext';
import { ChartIcon, UsersIcon, PackageIcon, DollarIcon, FileTextIcon, CheckCircleIcon, TrendingUpIcon } from '../components/Icons';
import { companyProfileService, uploadService } from '../services/api';
import * as ImagePicker from 'expo-image-picker';

type HomeScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const { user, logout } = useAuth();
  const [companyProfileModalVisible, setCompanyProfileModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
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

  useEffect(() => {
    checkCompanyProfile();
  }, []);

  const checkCompanyProfile = async () => {
    try {
      await companyProfileService.get();
      // Profil existe, ne rien faire
    } catch (error: any) {
      // Si 404, le profil n'existe pas - afficher le modal
      if (error.response?.status === 404) {
        setCompanyProfileModalVisible(true);
      }
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

  const handleCompanyLogoUpload = async () => {
    try {
      if (Platform.OS === 'web') {
        // Pour le web, utiliser input file natif
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
        // Pour mobile, utiliser ImagePicker
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

  const handleLogout = () => {
    Alert.alert('Déconnexion', 'Êtes-vous sûr de vouloir vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Déconnexion',
        style: 'destructive',
        onPress: async () => {
          try {
            await logout();
          } catch (error) {
            Alert.alert('Erreur', 'Échec de la déconnexion');
          }
        },
      },
    ]);
  };

  const menuItems = [
    { title: 'Tableau de Bord', description: 'Vue d\'ensemble', icon: ChartIcon, color: '#007AFF', screen: 'Dashboard' as keyof RootStackParamList },
    { title: 'Vitrine Numérique', description: 'Page publique Instagram', icon: PackageIcon, color: '#FF2D55', screen: 'Showcase' as keyof RootStackParamList },
    { title: 'Pilotage', description: 'KPIs et projections', icon: TrendingUpIcon, color: '#FF2D55', screen: 'Pilotage' as keyof RootStackParamList },
    { title: 'Pipeline', description: 'Opportunités de vente', icon: TrendingUpIcon, color: '#FF9500', screen: 'Pipeline' as keyof RootStackParamList },
    { title: 'Tâches', description: 'Planification et suivi', icon: CheckCircleIcon, color: '#FF9500', screen: 'Tasks' as keyof RootStackParamList },
    { title: 'Contacts', description: 'Relations et interactions', icon: UsersIcon, color: '#5856D6', screen: 'Contacts' as keyof RootStackParamList },
    { title: 'Analytics', description: 'Rapports et statistiques', icon: ChartIcon, color: '#AF52DE', screen: 'Analytics' as keyof RootStackParamList },
    { title: 'Facturation', description: 'Devis et factures', icon: FileTextIcon, color: '#34C759', screen: 'Invoices' as keyof RootStackParamList },
    { title: 'Templates', description: 'Templates de factures', icon: FileTextIcon, color: '#5AC8FA', screen: 'Templates' as keyof RootStackParamList },
    { title: 'Clients', description: 'Base de données clients', icon: UsersIcon, color: '#34C759', screen: 'Customers' as keyof RootStackParamList },
    { title: 'Produits', description: 'Catalogue et inventaire', icon: PackageIcon, color: '#5856D6', screen: 'Products' as keyof RootStackParamList },
    { title: 'Ventes', description: 'Historique des ventes', icon: DollarIcon, color: '#34C759', screen: 'Sales' as keyof RootStackParamList },
    { title: 'Fournisseurs', description: 'Prestataires & achats', icon: UsersIcon, color: '#0A84FF', screen: 'Suppliers' as keyof RootStackParamList },
    { title: 'Dépenses', description: 'Notes de frais & achats', icon: DollarIcon, color: '#FF3B30', screen: 'Expenses' as keyof RootStackParamList },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.appTitle}>Simplix CRM</Text>
            <Text style={styles.appSubtitle}>Système de Gestion Commerciale</Text>
          </View>
        </View>
        {user && (
          <View style={styles.userCard}>
            <View style={styles.userAvatar}>
              <Text style={styles.userInitial}>{user.name ? user.name.charAt(0).toUpperCase() : 'U'}</Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user.name}</Text>
              <Text style={styles.userEmail}>{user.email}</Text>
              {user.role && <Text style={styles.userRole}>{user.role}</Text>}
            </View>
          </View>
        )}
      </View>
      <View style={styles.menuSection}>
        <Text style={styles.sectionLabel}>MENU PRINCIPAL</Text>
        <View style={styles.menuGrid}>
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <TouchableOpacity key={index} style={styles.menuCard} onPress={() => navigation.navigate(item.screen)} activeOpacity={0.7}>
                <View style={[styles.menuIconContainer, { backgroundColor: `${item.color}20` }]}>
                  <Icon size={28} color={item.color} />
                </View>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuDescription}>{item.description}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
      <View style={styles.settingsSection}>
        <Text style={styles.sectionLabel}>PARAMÈTRES</Text>
        <TouchableOpacity style={styles.settingsCard} onPress={() => navigation.navigate('Profile')} activeOpacity={0.7}>
          <View style={styles.settingsIcon}><Text style={styles.lockEmoji}>👤</Text></View>
          <View style={styles.settingsContent}>
            <Text style={styles.settingsTitle}>Mon Profil d'Entreprise</Text>
            <Text style={styles.settingsDescription}>Gérer les informations de facturation</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingsCard} onPress={() => navigation.navigate('ChangePassword')} activeOpacity={0.7}>
          <View style={styles.settingsIcon}><Text style={styles.lockEmoji}>🔒</Text></View>
          <View style={styles.settingsContent}>
            <Text style={styles.settingsTitle}>Changer le Mot de Passe</Text>
            <Text style={styles.settingsDescription}>Mettre à jour vos identifiants</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingsCard} onPress={() => navigation.navigate('TestAll')} activeOpacity={0.7}>
          <View style={styles.settingsIcon}><Text style={styles.lockEmoji}>🧪</Text></View>
          <View style={styles.settingsContent}>
            <Text style={styles.settingsTitle}>Tests API</Text>
            <Text style={styles.settingsDescription}>Tests complets des endpoints</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.settingsCard, styles.logoutCard]} onPress={handleLogout} activeOpacity={0.7}>
          <View style={styles.settingsIcon}><Text style={styles.lockEmoji}>🚪</Text></View>
          <View style={styles.settingsContent}>
            <Text style={[styles.settingsTitle, styles.logoutText]}>Déconnexion</Text>
            <Text style={styles.settingsDescription}>Se déconnecter du compte</Text>
          </View>
        </TouchableOpacity>
      </View>
      <View style={{ height: 40 }} />

      {/* Company Profile Modal */}
      <Modal visible={companyProfileModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.companyProfileModalContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.modalTitle}>Bienvenue sur Simplix ! 🎉</Text>
            <Text style={styles.modalText}>
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

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalSkipButton]}
                onPress={() => setCompanyProfileModalVisible(false)}
              >
                <Text style={styles.modalSkipButtonText}>Plus tard</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalSaveButton]}
                onPress={handleSaveCompanyProfile}
                disabled={loading}
              >
                <Text style={styles.modalSaveButtonText}>
                  {loading ? 'Enregistrement...' : 'Enregistrer'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA'
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingHorizontal: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5'
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  appTitle: {
    fontSize: 28,
    fontWeight: '300',
    color: '#1A1A1A',
    letterSpacing: -0.5,
    marginBottom: 2
  },
  appSubtitle: {
    fontSize: 13,
    color: '#6B6B6B',
    fontWeight: '400',
    letterSpacing: 0
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E8E8E8'
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  userInitial: {
    fontSize: 18,
    fontWeight: '500',
    color: '#FFFFFF',
    letterSpacing: 0
  },
  userInfo: {
    flex: 1
  },
  userName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1A1A1A',
    marginBottom: 2,
    letterSpacing: -0.2
  },
  userEmail: {
    fontSize: 12,
    color: '#6B6B6B',
    marginBottom: 3,
    letterSpacing: 0
  },
  userRole: {
    fontSize: 11,
    color: '#007AFF',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.3
  },
  menuSection: {
    paddingHorizontal: 24,
    paddingTop: 20
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8E8E8E',
    letterSpacing: 1,
    marginBottom: 12,
    textTransform: 'uppercase'
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  menuCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1
  },
  menuIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1A1A1A',
    marginBottom: 3,
    letterSpacing: -0.2
  },
  menuDescription: {
    fontSize: 12,
    color: '#6B6B6B',
    lineHeight: 16,
    letterSpacing: 0,
    fontWeight: '400'
  },
  settingsSection: {
    paddingHorizontal: 24,
    paddingTop: 32
  },
  settingsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1
  },
  logoutCard: {
    borderWidth: 1,
    borderColor: '#FF3B30',
    backgroundColor: '#FFF5F5'
  },
  settingsIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8'
  },
  lockEmoji: {
    fontSize: 18
  },
  settingsContent: {
    flex: 1
  },
  settingsTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1A1A1A',
    marginBottom: 2,
    letterSpacing: -0.2
  },
  settingsDescription: {
    fontSize: 12,
    color: '#6B6B6B',
    letterSpacing: 0,
    fontWeight: '400'
  },
  logoutText: {
    color: '#FF3B30'
  },
  chevron: {
    fontSize: 24,
    color: '#D1D1D1',
    fontWeight: '300'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
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
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
    lineHeight: 20,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#111827',
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
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalSkipButton: {
    backgroundColor: '#F3F4F6',
  },
  modalSkipButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  modalSaveButton: {
    backgroundColor: '#007AFF',
  },
  modalSaveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
