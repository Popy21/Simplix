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
  Image,
  Modal,
} from 'react-native';
import { companyProfileService } from '../services/api';

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

export default function ProfileScreen() {
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
    late_payment_penalty: 'En cas de retard de paiement, une pénalité de retard de 3 fois le taux d\'intérêt légal (actuellement 10,52% pour l\'année 2024) sera exigible le jour suivant la date de paiement figurant sur la facture. Cette pénalité est calculée sur le montant TTC de la somme restant due et court à compter de la date d\'échéance du prix, sans qu\'aucune mise en demeure préalable ne soit nécessaire.',
    recovery_indemnity: 'En sus des pénalités de retard, toute somme non payée à sa date d\'exigibilité produira de plein droit le paiement d\'une indemnité forfaitaire de 40 euros due au titre des frais de recouvrement (Art. L441-6 du Code de commerce et D. 441-5).',
    payment_terms: 'Paiement à réception de facture par virement bancaire. Date d\'échéance : 30 jours fin de mois à compter de la date d\'émission. Escompte pour paiement anticipé : néant.',
    footer_text: 'Merci pour votre confiance. Cette facture est à régler selon les conditions de paiement indiquées ci-dessus.',
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
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mon Profil d'Entreprise</Text>
        <Text style={styles.subtitle}>
          Ces informations apparaîtront sur vos devis et factures
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Informations générales</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nom de l'entreprise *</Text>
          <TextInput
            style={styles.input}
            value={profile.company_name}
            onChangeText={(text) => setProfile({ ...profile, company_name: text })}
            placeholder="Nom de votre entreprise"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Forme juridique</Text>
          <TextInput
            style={styles.input}
            value={profile.company_legal_form}
            onChangeText={(text) => setProfile({ ...profile, company_legal_form: text })}
            placeholder="Ex: SARL, SAS, Auto-entrepreneur..."
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, styles.flex1]}>
            <Text style={styles.label}>Téléphone</Text>
            <TextInput
              style={styles.input}
              value={profile.company_phone}
              onChangeText={(text) => setProfile({ ...profile, company_phone: text })}
              placeholder="0123456789"
              keyboardType="phone-pad"
            />
          </View>

          <View style={[styles.inputGroup, styles.flex1, styles.marginLeft]}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={profile.company_email}
              onChangeText={(text) => setProfile({ ...profile, company_email: text })}
              placeholder="contact@entreprise.fr"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>SIRET *</Text>
          <TextInput
            style={styles.input}
            value={profile.company_siret}
            onChangeText={(text) => setProfile({ ...profile, company_siret: text })}
            placeholder="12345678901234"
            maxLength={14}
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, styles.flex1]}>
            <Text style={styles.label}>TVA Intracommunautaire</Text>
            <TextInput
              style={styles.input}
              value={profile.company_tva}
              onChangeText={(text) => setProfile({ ...profile, company_tva: text })}
              placeholder="FR12345678901"
            />
          </View>

          <View style={[styles.inputGroup, styles.flex1, styles.marginLeft]}>
            <Text style={styles.label}>RCS</Text>
            <TextInput
              style={styles.input}
              value={profile.company_rcs}
              onChangeText={(text) => setProfile({ ...profile, company_rcs: text })}
              placeholder="RCS Paris 123456789"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Capital social</Text>
          <TextInput
            style={styles.input}
            value={profile.company_capital}
            onChangeText={(text) => setProfile({ ...profile, company_capital: text })}
            placeholder="10000"
          />
        </View>

        <TouchableOpacity
          style={styles.checkboxContainer}
          onPress={() => setProfile({ ...profile, is_micro_entreprise: !profile.is_micro_entreprise })}
        >
          <View style={[styles.checkbox, profile.is_micro_entreprise && styles.checkboxChecked]}>
            {profile.is_micro_entreprise && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.checkboxLabel}>Micro-entreprise (TVA non applicable)</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Adresse</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Rue *</Text>
          <TextInput
            style={styles.input}
            value={profile.company_street}
            onChangeText={(text) => setProfile({ ...profile, company_street: text })}
            placeholder="123 rue de la République"
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, styles.flex1]}>
            <Text style={styles.label}>Code postal *</Text>
            <TextInput
              style={styles.input}
              value={profile.company_postal_code}
              onChangeText={(text) => setProfile({ ...profile, company_postal_code: text })}
              placeholder="75001"
              maxLength={10}
            />
          </View>

          <View style={[styles.inputGroup, styles.flex2, styles.marginLeft]}>
            <Text style={styles.label}>Ville *</Text>
            <TextInput
              style={styles.input}
              value={profile.company_city}
              onChangeText={(text) => setProfile({ ...profile, company_city: text })}
              placeholder="Paris"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Pays</Text>
          <TextInput
            style={styles.input}
            value={profile.company_country}
            onChangeText={(text) => setProfile({ ...profile, company_country: text })}
            placeholder="France"
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Coordonnées bancaires</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nom de la banque</Text>
          <TextInput
            style={styles.input}
            value={profile.bank_name}
            onChangeText={(text) => setProfile({ ...profile, bank_name: text })}
            placeholder="Banque Populaire"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>IBAN</Text>
          <TextInput
            style={styles.input}
            value={profile.bank_iban}
            onChangeText={(text) => setProfile({ ...profile, bank_iban: text })}
            placeholder="FR76 1234 5678 9012 3456 7890 123"
            autoCapitalize="characters"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>BIC/SWIFT</Text>
          <TextInput
            style={styles.input}
            value={profile.bank_bic}
            onChangeText={(text) => setProfile({ ...profile, bank_bic: text })}
            placeholder="ABCDEFGH"
            autoCapitalize="characters"
            maxLength={11}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mentions légales et conditions</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Pénalités de retard</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={profile.late_payment_penalty}
            onChangeText={(text) => setProfile({ ...profile, late_payment_penalty: text })}
            placeholder="Pénalités de retard"
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Indemnité de recouvrement</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={profile.recovery_indemnity}
            onChangeText={(text) => setProfile({ ...profile, recovery_indemnity: text })}
            placeholder="Indemnité de recouvrement"
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Conditions de paiement</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={profile.payment_terms}
            onChangeText={(text) => setProfile({ ...profile, payment_terms: text })}
            placeholder="Conditions de paiement"
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Pied de page</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={profile.footer_text}
            onChangeText={(text) => setProfile({ ...profile, footer_text: text })}
            placeholder="Texte affiché en bas de vos documents"
            multiline
            numberOfLines={2}
          />
        </View>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Enregistrer</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />

      {/* Success Modal */}
      <Modal
        visible={successModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSuccessModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.successIcon}>
              <Text style={styles.successIconText}>✓</Text>
            </View>
            <Text style={styles.modalTitle}>Profil enregistré !</Text>
            <Text style={styles.modalMessage}>
              Vos informations ont été mises à jour avec succès.
              Elles apparaîtront désormais sur vos devis et factures.
            </Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setSuccessModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 20,
    padding: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
  },
  flex1: {
    flex: 1,
  },
  flex2: {
    flex: 2,
  },
  marginLeft: {
    marginLeft: 10,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 4,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#333',
  },
  buttonContainer: {
    padding: 20,
    marginTop: 20,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 30,
    width: '85%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  successIconText: {
    fontSize: 48,
    color: '#fff',
    fontWeight: 'bold',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
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
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 40,
    minWidth: 120,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
