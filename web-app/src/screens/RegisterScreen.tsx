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

type RegisterScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Register'>;

interface Props {
  navigation: RegisterScreenNavigationProp;
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

export default function RegisterScreen({ navigation }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState<PasswordValidation | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const { register } = useAuth();

  // Validate password in real-time
  useEffect(() => {
    if (password.length > 0) {
      const timer = setTimeout(async () => {
        setIsValidating(true);
        try {
          const response = await authService.validatePassword(password);
          setPasswordValidation(response.data);
        } catch (error) {
          console.error('Password validation error:', error);
        } finally {
          setIsValidating(false);
        }
      }, 300); // Debounce for 300ms

      return () => clearTimeout(timer);
    } else {
      setPasswordValidation(null);
    }
  }, [password]);

  const handleRegister = async () => {
    if (!name || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (passwordValidation && !passwordValidation.isValid) {
      Alert.alert('Weak Password', 'Please choose a stronger password that meets all criteria');
      return;
    }

    if (passwordValidation?.isCommonPassword) {
      Alert.alert('Common Password', 'This password is too common. Please choose a more unique password.');
      return;
    }

    setIsLoading(true);
    try {
      await register(email, password, name);
      // Navigation will be handled automatically by App.tsx
    } catch (error: any) {
      Alert.alert('Registration Failed', error.message || 'Failed to create account');
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
        return 'Weak';
      case 'medium':
        return 'Medium';
      case 'strong':
        return 'Strong';
      case 'very-strong':
        return 'Very Strong';
      default:
        return '';
    }
  };

  const renderPasswordCriteria = () => {
    if (!password || !passwordValidation) return null;

    const criteria = [
      { key: 'minLength', label: 'At least 8 characters', met: passwordValidation.criteria.minLength },
      { key: 'hasUppercase', label: 'One uppercase letter', met: passwordValidation.criteria.hasUppercase },
      { key: 'hasLowercase', label: 'One lowercase letter', met: passwordValidation.criteria.hasLowercase },
      { key: 'hasNumber', label: 'One number', met: passwordValidation.criteria.hasNumber },
      { key: 'hasSpecialChar', label: 'One special character', met: passwordValidation.criteria.hasSpecialChar },
    ];

    return (
      <BlurView intensity={15} tint="light" style={styles.criteriaCard}>
        <View style={styles.strengthHeader}>
          <Text style={styles.strengthLabel}>Password Strength:</Text>
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
                  <Text style={styles.title}>Create Account</Text>
                  <Text style={styles.description}>Join Simplix CRM today</Text>

                  {/* Name Input */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Full Name</Text>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={styles.input}
                        placeholder="John Doe"
                        placeholderTextColor="rgba(255,255,255,0.5)"
                        value={name}
                        onChangeText={setName}
                        autoCapitalize="words"
                        editable={!isLoading}
                      />
                    </View>
                  </View>

                  {/* Email Input */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Email</Text>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={styles.input}
                        placeholder="your.email@example.com"
                        placeholderTextColor="rgba(255,255,255,0.5)"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        editable={!isLoading}
                      />
                    </View>
                  </View>

                  {/* Password Input */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Password</Text>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={styles.input}
                        placeholder="••••••••"
                        placeholderTextColor="rgba(255,255,255,0.5)"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!showPassword}
                        editable={!isLoading}
                      />
                      <TouchableOpacity
                        onPress={() => setShowPassword(!showPassword)}
                        style={styles.eyeButton}
                      >
                        <Text style={styles.eyeIcon}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Password Validation Criteria */}
                  {renderPasswordCriteria()}

                  {/* Confirm Password Input */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Confirm Password</Text>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={styles.input}
                        placeholder="••••••••"
                        placeholderTextColor="rgba(255,255,255,0.5)"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
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
                    {confirmPassword && password !== confirmPassword && (
                      <Text style={styles.errorText}>Passwords do not match</Text>
                    )}
                  </View>

                  {/* Register Button */}
                  <TouchableOpacity
                    style={[styles.button, isLoading && styles.buttonDisabled]}
                    onPress={handleRegister}
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
                        <Text style={styles.buttonText}>Create Account</Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>

                  {/* Login Link */}
                  <View style={styles.footer}>
                    <Text style={styles.footerText}>Already have an account? </Text>
                    <TouchableOpacity
                      onPress={() => navigation.navigate('Login')}
                      disabled={isLoading}
                    >
                      <Text style={styles.link}>Sign In</Text>
                    </TouchableOpacity>
                  </View>
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
  },
  link: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
});
