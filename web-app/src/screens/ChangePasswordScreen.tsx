import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/api';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';

type ChangePasswordScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ChangePassword'>;

interface Props {
  navigation: ChangePasswordScreenNavigationProp;
}

interface PasswordValidation {
  isValid: boolean;
  strength: 'weak' | 'medium' | 'strong' | 'very-strong';
  criteria: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSpecialChar: boolean;
  };
  isCommonPassword: boolean;
  warning: string | null;
}

export default function ChangePasswordScreen({ navigation }: Props) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState<PasswordValidation | null>(null);
  const { changePassword } = useAuth();

  // Validate new password in real-time
  useEffect(() => {
    if (newPassword.length > 0) {
      const timer = setTimeout(async () => {
        try {
          const response = await authService.validatePassword(newPassword);
          setPasswordValidation(response.data);
        } catch (error) {
          console.error('Password validation error:', error);
        }
      }, 300);

      return () => clearTimeout(timer);
    } else {
      setPasswordValidation(null);
    }
  }, [newPassword]);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      Alert.alert('Erreur', 'Les nouveaux mots de passe ne correspondent pas');
      return;
    }

    if (currentPassword === newPassword) {
      Alert.alert('Erreur', 'Le nouveau mot de passe doit être différent de l\'actuel');
      return;
    }

    if (passwordValidation && !passwordValidation.isValid) {
      Alert.alert('Mot de passe faible', 'Veuillez choisir un mot de passe plus fort qui répond à tous les critères');
      return;
    }

    if (passwordValidation?.isCommonPassword) {
      Alert.alert('Mot de passe courant', 'Ce mot de passe est trop courant. Veuillez choisir un mot de passe plus unique.');
      return;
    }

    setIsLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      Alert.alert('Succès', 'Mot de passe changé avec succès', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      Alert.alert('Échec', error.message || 'Impossible de changer le mot de passe');
    } finally {
      setIsLoading(false);
    }
  };

  const getStrengthColor = (strength: string) => {
    switch (strength) {
      case 'weak':
        return '#ef4444';
      case 'medium':
        return '#f59e0b';
      case 'strong':
        return '#10b981';
      case 'very-strong':
        return '#06b6d4';
      default:
        return '#6b7280';
    }
  };

  const getStrengthLabel = (strength: string) => {
    switch (strength) {
      case 'weak':
        return 'Faible';
      case 'medium':
        return 'Moyen';
      case 'strong':
        return 'Fort';
      case 'very-strong':
        return 'Très Fort';
      default:
        return '';
    }
  };

  const renderPasswordCriteria = () => {
    if (!newPassword || !passwordValidation) return null;

    const criteria = [
      { key: 'minLength', label: 'Au moins 8 caractères', met: passwordValidation.criteria.minLength },
      { key: 'hasUppercase', label: 'Une lettre majuscule', met: passwordValidation.criteria.hasUppercase },
      { key: 'hasLowercase', label: 'Une lettre minuscule', met: passwordValidation.criteria.hasLowercase },
      { key: 'hasNumber', label: 'Un chiffre', met: passwordValidation.criteria.hasNumber },
      { key: 'hasSpecialChar', label: 'Un caractère spécial', met: passwordValidation.criteria.hasSpecialChar },
    ];

    return (
      <BlurView intensity={15} tint="light" style={styles.criteriaCard}>
        <View style={styles.strengthHeader}>
          <Text style={styles.strengthLabel}>Force du mot de passe :</Text>
          <View style={[styles.strengthBadge, { backgroundColor: getStrengthColor(passwordValidation.strength) }]}>
            <Text style={styles.strengthText}>{getStrengthLabel(passwordValidation.strength)}</Text>
          </View>
        </View>

        <View style={styles.strengthBar}>
          <View
            style={[
              styles.strengthBarFill,
              {
                width: passwordValidation.strength === 'weak' ? '25%'
                  : passwordValidation.strength === 'medium' ? '50%'
                  : passwordValidation.strength === 'strong' ? '75%'
                  : '100%',
                backgroundColor: getStrengthColor(passwordValidation.strength),
              },
            ]}
          />
        </View>

        {passwordValidation.isCommonPassword && (
          <View style={styles.warningBox}>
            <Text style={styles.warningIcon}>⚠️</Text>
            <Text style={styles.warningText}>{passwordValidation.warning}</Text>
          </View>
        )}

        <View style={styles.criteriaList}>
          {criteria.map((criterion) => (
            <View key={criterion.key} style={styles.criteriaItem}>
              <Text style={[styles.criteriaIcon, criterion.met && styles.criteriaIconMet]}>
                {criterion.met ? '✓' : '○'}
              </Text>
              <Text style={[styles.criteriaText, criterion.met && styles.criteriaTextMet]}>
                {criterion.label}
              </Text>
            </View>
          ))}
        </View>
      </BlurView>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2', '#f093fb']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.content}>
              {/* Glass Card */}
              <BlurView intensity={20} tint="light" style={styles.glassCard}>
                <View style={styles.cardContent}>
                  <View style={styles.header}>
                    <TouchableOpacity
                      onPress={() => navigation.goBack()}
                      style={styles.backButton}
                      disabled={isLoading}
                    >
                      <Text style={styles.backButtonText}>← Retour</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.title}>Changer le mot de passe</Text>
                  <Text style={styles.description}>Mettez à jour la sécurité de votre compte</Text>

                  {/* Current Password Input */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Mot de passe actuel</Text>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={styles.input}
                        placeholder="••••••••"
                        placeholderTextColor="rgba(255,255,255,0.5)"
                        value={currentPassword}
                        onChangeText={setCurrentPassword}
                        secureTextEntry={!showCurrentPassword}
                        editable={!isLoading}
                      />
                      <TouchableOpacity
                        onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                        style={styles.eyeButton}
                      >
                        <Text style={styles.eyeIcon}>{showCurrentPassword ? '👁️' : '👁️‍🗨️'}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* New Password Input */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Nouveau mot de passe</Text>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={styles.input}
                        placeholder="••••••••"
                        placeholderTextColor="rgba(255,255,255,0.5)"
                        value={newPassword}
                        onChangeText={setNewPassword}
                        secureTextEntry={!showNewPassword}
                        editable={!isLoading}
                      />
                      <TouchableOpacity
                        onPress={() => setShowNewPassword(!showNewPassword)}
                        style={styles.eyeButton}
                      >
                        <Text style={styles.eyeIcon}>{showNewPassword ? '👁️' : '👁️‍🗨️'}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Password Validation Criteria */}
                  {renderPasswordCriteria()}

                  {/* Confirm New Password Input */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Confirmer le nouveau mot de passe</Text>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={styles.input}
                        placeholder="••••••••"
                        placeholderTextColor="rgba(255,255,255,0.5)"
                        value={confirmNewPassword}
                        onChangeText={setConfirmNewPassword}
                        secureTextEntry={!showConfirmPassword}
                        editable={!isLoading}
                      />
                      <TouchableOpacity
                        onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                        style={styles.eyeButton}
                      >
                        <Text style={styles.eyeIcon}>{showConfirmPassword ? '👁️' : '👁️‍🗨️'}</Text>
                      </TouchableOpacity>
                    </View>
                    {confirmNewPassword && newPassword !== confirmNewPassword && (
                      <Text style={styles.errorText}>Les mots de passe ne correspondent pas</Text>
                    )}
                  </View>

                  {/* Change Password Button */}
                  <TouchableOpacity
                    style={[styles.button, isLoading && styles.buttonDisabled]}
                    onPress={handleChangePassword}
                    disabled={isLoading}
                  >
                    <LinearGradient
                      colors={['#667eea', '#764ba2']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.buttonGradient}
                    >
                      {isLoading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.buttonText}>Update Password</Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>

                  {/* Update Button */}
                  <TouchableOpacity
                    style={[styles.button, isLoading && styles.buttonDisabled]}
                    onPress={handleChangePassword}
                    disabled={isLoading}
                  >
                    <LinearGradient
                      colors={['#667eea', '#764ba2']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.buttonGradient}
                    >
                      {isLoading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.buttonText}>Mettre à jour le mot de passe</Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>

                  {/* Security Tips */}
                  <BlurView intensity={10} tint="light" style={styles.tipsCard}>
                    <Text style={styles.tipsTitle}>🔒 Conseils de sécurité</Text>
                    <Text style={styles.tipsText}>• Utilisez un mot de passe unique pour chaque compte</Text>
                    <Text style={styles.tipsText}>• Envisagez d'utiliser un gestionnaire de mots de passe</Text>
                    <Text style={styles.tipsText}>• Changez vos mots de passe régulièrement</Text>
                  </BlurView>
                </View>
              </BlurView>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    paddingVertical: 40,
  },
  content: {
    alignItems: 'center',
  },
  glassCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  cardContent: {
    padding: 32,
  },
  header: {
    marginBottom: 16,
  },
  backButton: {
    alignSelf: 'flex-start',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 24,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  inputWrapper: {
    position: 'relative',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#fff',
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    top: 12,
    padding: 4,
  },
  eyeIcon: {
    fontSize: 20,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  criteriaCard: {
    marginVertical: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  strengthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  strengthLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  strengthBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  strengthText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  strengthBar: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
    marginBottom: 12,
    overflow: 'hidden',
  },
  strengthBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  warningIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  warningText: {
    flex: 1,
    color: '#fca5a5',
    fontSize: 12,
  },
  criteriaList: {
    gap: 8,
  },
  criteriaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  criteriaIcon: {
    fontSize: 16,
    marginRight: 8,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  criteriaIconMet: {
    color: '#10b981',
  },
  criteriaText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  criteriaTextMet: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  button: {
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  tipsCard: {
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  tipsTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  tipsText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    marginVertical: 2,
  },
});
