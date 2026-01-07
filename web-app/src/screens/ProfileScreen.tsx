import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import { companyProfileService } from '../services/api';
import ImageUpload from '../components/ImageUpload';
import { withGlassLayout } from '../components/withGlassLayout';
import GlassCard from '../components/GlassCard';
import { glassTheme } from '../theme/glassTheme';

// SVG Icons
const BuildingIcon = ({ size = 24, color = '#007AFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M3 21H21M4 21V8L12 3L20 8V21M9 21V14H15V21M9 10H9.01M15 10H15.01" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </Svg>
);

const TagIcon = ({ size = 20, color = '#666' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42l-8.704-8.704z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <Circle cx="7.5" cy="7.5" r="1.5" fill={color}/>
  </Svg>
);

const CameraIcon = ({ size = 20, color = '#666' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <Circle cx="12" cy="13" r="4" stroke={color} strokeWidth="2"/>
  </Svg>
);

const ClipboardIcon = ({ size = 20, color = '#666' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <Rect x="8" y="2" width="8" height="4" rx="1" ry="1" stroke={color} strokeWidth="2"/>
  </Svg>
);

const PhoneIcon = ({ size = 20, color = '#666' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </Svg>
);

const MailIcon = ({ size = 20, color = '#666' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <Path d="M22 6l-10 7L2 6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </Svg>
);

const HashIcon = ({ size = 20, color = '#666' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M4 9h16M4 15h16M10 3L8 21M16 3l-2 18" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </Svg>
);

const GlobeIcon = ({ size = 20, color = '#666' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2"/>
    <Path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </Svg>
);

const FileTextIcon = ({ size = 20, color = '#666' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <Path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </Svg>
);

const DollarIcon = ({ size = 20, color = '#666' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </Svg>
);

const MapPinIcon = ({ size = 24, color = '#007AFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <Circle cx="12" cy="10" r="3" stroke={color} strokeWidth="2"/>
  </Svg>
);

const HomeIcon = ({ size = 20, color = '#666' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <Path d="M9 22V12h6v10" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </Svg>
);

const MailboxIcon = ({ size = 20, color = '#666' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M22 12h-6.5a4 4 0 0 0-4 4v7h-1v-7a4 4 0 0 0-4-4H2" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <Rect x="2" y="4" width="20" height="16" rx="2" stroke={color} strokeWidth="2"/>
  </Svg>
);

const CityIcon = ({ size = 20, color = '#666' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M3 21h18M5 21V7l8-4v18M13 21V9l6 3v9M9 9v.01M9 12v.01M9 15v.01M9 18v.01" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </Svg>
);

const BankIcon = ({ size = 24, color = '#007AFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </Svg>
);

const CreditCardIcon = ({ size = 20, color = '#666' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="1" y="4" width="22" height="16" rx="2" ry="2" stroke={color} strokeWidth="2"/>
    <Path d="M1 10h22" stroke={color} strokeWidth="2"/>
  </Svg>
);

const KeyIcon = ({ size = 20, color = '#666' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </Svg>
);

const ScaleIcon = ({ size = 24, color = '#007AFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 3v18M3 9l9-6 9 6M3 9l4.5 8h9L21 9M7.5 17a3 3 0 1 0 0-6M16.5 17a3 3 0 1 0 0-6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </Svg>
);

const ClockIcon = ({ size = 20, color = '#666' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2"/>
    <Path d="M12 6v6l4 2" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </Svg>
);

const EditIcon = ({ size = 20, color = '#666' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <Path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </Svg>
);

const SaveIcon = ({ size = 20, color = '#fff' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <Path d="M17 21v-8H7v8M7 3v5h8" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </Svg>
);

const CheckIcon = ({ size = 40, color = '#fff' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M20 6L9 17l-5-5" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
  </Svg>
);

interface CompanyProfile {
  id?: number;
  company_name: string;
  company_legal_form: string;
  company_phone: string;
  company_email: string;
  company_siret: string;
  company_tva: string;
  company_rcs: string;
  company_capital: string;
  is_micro_entreprise: boolean;
  bank_iban: string;
  bank_bic: string;
  bank_name: string;
  company_street: string;
  company_postal_code: string;
  company_city: string;
  company_country: string;
  logo_url?: string;
  late_payment_penalty?: string;
  recovery_indemnity?: string;
  payment_terms?: string;
  footer_text?: string;
}

// Glass Input Component with SVG Icon
const GlassInput = ({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  numberOfLines = 1,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  maxLength,
  required = false,
  icon: Icon,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  multiline?: boolean;
  numberOfLines?: number;
  keyboardType?: any;
  autoCapitalize?: any;
  maxLength?: number;
  required?: boolean;
  icon?: React.ComponentType<{ size?: number; color?: string }>;
}) => (
  <View style={styles.inputGroup}>
    <View style={styles.labelRow}>
      {Icon && (
        <View style={styles.labelIconContainer}>
          <Icon size={16} color="#666" />
        </View>
      )}
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>
    </View>
    <View style={styles.inputWrapper}>
      <TextInput
        style={[
          styles.input,
          multiline && styles.textArea,
          multiline && { height: numberOfLines * 24 + 32 },
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="rgba(0, 0, 0, 0.3)"
        multiline={multiline}
        numberOfLines={numberOfLines}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        maxLength={maxLength}
      />
    </View>
  </View>
);

function ProfileScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [profile, setProfile] = useState<CompanyProfile>({
    company_name: '',
    company_legal_form: '',
    company_phone: '',
    company_email: '',
    company_siret: '',
    company_tva: '',
    company_rcs: '',
    company_capital: '',
    is_micro_entreprise: false,
    bank_iban: '',
    bank_bic: '',
    bank_name: '',
    company_street: '',
    company_postal_code: '',
    company_city: '',
    company_country: 'France',
    late_payment_penalty: 'En cas de retard de paiement, une pénalité de retard de 3 fois le taux d\'intérêt légal sera exigible.',
    recovery_indemnity: 'Indemnité forfaitaire de 40 euros due au titre des frais de recouvrement.',
    payment_terms: 'Paiement à réception de facture par virement bancaire.',
    footer_text: 'Merci pour votre confiance.',
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await companyProfileService.get();
      if (response.data) {
        setProfile(response.data);
      }
    } catch (error: any) {
      if (error.response?.status !== 404) {
        console.error('Error fetching profile:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      if (profile.id) {
        await companyProfileService.update(profile);
      } else {
        await companyProfileService.create(profile);
      }
      await fetchProfile();
      setSuccessModalVisible(true);
    } catch (error: any) {
      console.error('Error saving profile:', error);
      Alert.alert('Erreur', 'Impossible d\'enregistrer le profil');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#F2F2F7', '#E8E8ED', '#F2F2F7']}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.pageTitle}>Mon Profil</Text>
        </View>

        {/* Title Card */}
        <GlassCard variant="frosted" elevation="md" borderRadius={24} padding={24} style={styles.headerCard}>
          <LinearGradient
            colors={['#007AFF20', '#5AC8FA20']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, { borderRadius: 24 }]}
          />
          <Text style={styles.cardTitle}>Mon Profil d'Entreprise</Text>
          <Text style={styles.cardSubtitle}>
            Ces informations apparaîtront sur vos devis et factures
          </Text>
        </GlassCard>

        {/* Section: Informations générales */}
        <GlassCard variant="frosted" elevation="md" borderRadius={24} padding={24} style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <BuildingIcon size={24} color="#007AFF" />
            </View>
            <Text style={styles.sectionTitle}>Informations générales</Text>
          </View>

          <GlassInput
            label="Nom de l'entreprise"
            value={profile.company_name}
            onChangeText={(text) => setProfile({ ...profile, company_name: text })}
            placeholder="Nom de votre entreprise"
            required
            icon={TagIcon}
          />

          <View style={styles.logoSection}>
            <View style={styles.labelRow}>
              <View style={styles.labelIconContainer}>
                <CameraIcon size={16} color="#666" />
              </View>
              <Text style={styles.label}>Logo de l'entreprise</Text>
            </View>
            <ImageUpload
              value={profile.logo_url}
              onChange={(url) => setProfile({ ...profile, logo_url: url as string })}
              label=""
            />
          </View>

          <GlassInput
            label="Forme juridique"
            value={profile.company_legal_form}
            onChangeText={(text) => setProfile({ ...profile, company_legal_form: text })}
            placeholder="Ex: SARL, SAS, Auto-entrepreneur..."
            icon={ClipboardIcon}
          />

          <View style={styles.row}>
            <View style={styles.flex1}>
              <GlassInput
                label="Téléphone"
                value={profile.company_phone}
                onChangeText={(text) => setProfile({ ...profile, company_phone: text })}
                placeholder="0123456789"
                keyboardType="phone-pad"
                icon={PhoneIcon}
              />
            </View>
            <View style={styles.spacer} />
            <View style={styles.flex1}>
              <GlassInput
                label="Email"
                value={profile.company_email}
                onChangeText={(text) => setProfile({ ...profile, company_email: text })}
                placeholder="contact@entreprise.fr"
                keyboardType="email-address"
                autoCapitalize="none"
                icon={MailIcon}
              />
            </View>
          </View>

          <GlassInput
            label="SIRET"
            value={profile.company_siret}
            onChangeText={(text) => setProfile({ ...profile, company_siret: text })}
            placeholder="12345678901234"
            maxLength={14}
            required
            icon={HashIcon}
          />

          <View style={styles.row}>
            <View style={styles.flex1}>
              <GlassInput
                label="TVA Intracommunautaire"
                value={profile.company_tva}
                onChangeText={(text) => setProfile({ ...profile, company_tva: text })}
                placeholder="FR12345678901"
                icon={GlobeIcon}
              />
            </View>
            <View style={styles.spacer} />
            <View style={styles.flex1}>
              <GlassInput
                label="RCS"
                value={profile.company_rcs}
                onChangeText={(text) => setProfile({ ...profile, company_rcs: text })}
                placeholder="RCS Paris 123456789"
                icon={FileTextIcon}
              />
            </View>
          </View>

          <GlassInput
            label="Capital social"
            value={profile.company_capital}
            onChangeText={(text) => setProfile({ ...profile, company_capital: text })}
            placeholder="10000 €"
            icon={DollarIcon}
          />

          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => setProfile({ ...profile, is_micro_entreprise: !profile.is_micro_entreprise })}
            activeOpacity={0.8}
          >
            <View style={[styles.checkbox, profile.is_micro_entreprise && styles.checkboxChecked]}>
              {profile.is_micro_entreprise && <CheckIcon size={18} color="#fff" />}
            </View>
            <Text style={styles.checkboxLabel}>Micro-entreprise (TVA non applicable)</Text>
          </TouchableOpacity>
        </GlassCard>

        {/* Section: Adresse */}
        <GlassCard variant="frosted" elevation="md" borderRadius={24} padding={24} style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <MapPinIcon size={24} color="#007AFF" />
            </View>
            <Text style={styles.sectionTitle}>Adresse</Text>
          </View>

          <GlassInput
            label="Rue"
            value={profile.company_street}
            onChangeText={(text) => setProfile({ ...profile, company_street: text })}
            placeholder="123 rue de la République"
            required
            icon={HomeIcon}
          />

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <GlassInput
                label="Code postal"
                value={profile.company_postal_code}
                onChangeText={(text) => setProfile({ ...profile, company_postal_code: text })}
                placeholder="75001"
                maxLength={10}
                required
                icon={MailboxIcon}
              />
            </View>
            <View style={styles.spacer} />
            <View style={{ flex: 2 }}>
              <GlassInput
                label="Ville"
                value={profile.company_city}
                onChangeText={(text) => setProfile({ ...profile, company_city: text })}
                placeholder="Paris"
                required
                icon={CityIcon}
              />
            </View>
          </View>

          <GlassInput
            label="Pays"
            value={profile.company_country}
            onChangeText={(text) => setProfile({ ...profile, company_country: text })}
            placeholder="France"
            icon={GlobeIcon}
          />
        </GlassCard>

        {/* Section: Coordonnées bancaires */}
        <GlassCard variant="frosted" elevation="md" borderRadius={24} padding={24} style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <BankIcon size={24} color="#007AFF" />
            </View>
            <Text style={styles.sectionTitle}>Coordonnées bancaires</Text>
          </View>

          <GlassInput
            label="Nom de la banque"
            value={profile.bank_name}
            onChangeText={(text) => setProfile({ ...profile, bank_name: text })}
            placeholder="Banque Populaire"
            icon={BankIcon}
          />

          <GlassInput
            label="IBAN"
            value={profile.bank_iban}
            onChangeText={(text) => setProfile({ ...profile, bank_iban: text })}
            placeholder="FR76 1234 5678 9012 3456 7890 123"
            autoCapitalize="characters"
            icon={CreditCardIcon}
          />

          <GlassInput
            label="BIC/SWIFT"
            value={profile.bank_bic}
            onChangeText={(text) => setProfile({ ...profile, bank_bic: text })}
            placeholder="ABCDEFGH"
            autoCapitalize="characters"
            maxLength={11}
            icon={KeyIcon}
          />
        </GlassCard>

        {/* Section: Mentions légales */}
        <GlassCard variant="frosted" elevation="md" borderRadius={24} padding={24} style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <ScaleIcon size={24} color="#007AFF" />
            </View>
            <Text style={styles.sectionTitle}>Mentions légales</Text>
          </View>

          <GlassInput
            label="Pénalités de retard"
            value={profile.late_payment_penalty || ''}
            onChangeText={(text) => setProfile({ ...profile, late_payment_penalty: text })}
            placeholder="Pénalités de retard"
            multiline
            numberOfLines={4}
            icon={ClockIcon}
          />

          <GlassInput
            label="Indemnité de recouvrement"
            value={profile.recovery_indemnity || ''}
            onChangeText={(text) => setProfile({ ...profile, recovery_indemnity: text })}
            placeholder="Indemnité de recouvrement"
            multiline
            numberOfLines={3}
            icon={EditIcon}
          />

          <GlassInput
            label="Conditions de paiement"
            value={profile.payment_terms || ''}
            onChangeText={(text) => setProfile({ ...profile, payment_terms: text })}
            placeholder="Conditions de paiement"
            multiline
            numberOfLines={3}
            icon={DollarIcon}
          />

          <GlassInput
            label="Pied de page"
            value={profile.footer_text || ''}
            onChangeText={(text) => setProfile({ ...profile, footer_text: text })}
            placeholder="Texte affiché en bas de vos documents"
            multiline
            numberOfLines={2}
            icon={FileTextIcon}
          />
        </GlassCard>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#007AFF', '#5AC8FA']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[StyleSheet.absoluteFill, { borderRadius: 16 }]}
          />
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <View style={styles.saveButtonContent}>
              <SaveIcon size={20} color="#fff" />
              <Text style={styles.saveButtonText}>Enregistrer</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />

        {/* Success Modal */}
        <Modal
          visible={successModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setSuccessModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <GlassCard variant="frosted" elevation="lg" borderRadius={28} padding={32} style={styles.modalContent}>
              <LinearGradient
                colors={['#34C75920', '#30D15820']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[StyleSheet.absoluteFill, { borderRadius: 28 }]}
              />
              <View style={styles.successIcon}>
                <CheckIcon size={40} color="#fff" />
              </View>
              <Text style={styles.modalTitle}>Profil enregistré !</Text>
              <Text style={styles.modalMessage}>
                Vos informations ont été mises à jour avec succès.
              </Text>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setSuccessModalVisible(false)}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#007AFF', '#5AC8FA']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[StyleSheet.absoluteFill, { borderRadius: 12 }]}
                />
                <Text style={styles.modalButtonText}>OK</Text>
              </TouchableOpacity>
            </GlassCard>
          </View>
        </Modal>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
  },
  header: {
    marginBottom: 16,
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#000',
    letterSpacing: -0.5,
  },
  headerCard: {
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#007AFF',
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  sectionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  inputGroup: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  labelIconContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    letterSpacing: 0.2,
  },
  required: {
    color: '#FF3B30',
    fontWeight: '700',
  },
  inputWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    ...Platform.select({
      web: {
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      },
    }),
  },
  input: {
    padding: 16,
    fontSize: 16,
    color: '#000',
    backgroundColor: 'transparent',
  },
  textArea: {
    textAlignVertical: 'top',
    minHeight: 100,
  },
  row: {
    flexDirection: 'row',
    marginHorizontal: -6,
  },
  flex1: {
    flex: 1,
    paddingHorizontal: 6,
  },
  spacer: {
    width: 12,
  },
  logoSection: {
    marginBottom: 16,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  checkbox: {
    width: 28,
    height: 28,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 8,
    marginRight: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  checkboxLabel: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  saveButton: {
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  modalButton: {
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 48,
    overflow: 'hidden',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default withGlassLayout(ProfileScreen);
