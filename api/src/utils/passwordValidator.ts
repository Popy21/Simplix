// Password validation utility

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong' | 'very-strong';
  criteria: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSpecialChar: boolean;
  };
}

export const validatePassword = (password: string): PasswordValidationResult => {
  const errors: string[] = [];

  const criteria = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  };

  // Check each criterion
  if (!criteria.minLength) {
    errors.push('Password must be at least 8 characters long');
  }
  if (!criteria.hasUppercase) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!criteria.hasLowercase) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!criteria.hasNumber) {
    errors.push('Password must contain at least one number');
  }
  if (!criteria.hasSpecialChar) {
    errors.push('Password must contain at least one special character');
  }

  // Calculate strength
  let strength: 'weak' | 'medium' | 'strong' | 'very-strong' = 'weak';
  const metCriteria = Object.values(criteria).filter(Boolean).length;

  if (metCriteria === 5 && password.length >= 12) {
    strength = 'very-strong';
  } else if (metCriteria >= 4 && password.length >= 10) {
    strength = 'strong';
  } else if (metCriteria >= 3 && password.length >= 8) {
    strength = 'medium';
  }

  return {
    isValid: errors.length === 0,
    errors,
    strength,
    criteria,
  };
};

// Check for common weak passwords
const commonPasswords = [
  'password',
  '123456',
  '12345678',
  'qwerty',
  'abc123',
  'password123',
  'admin',
  'letmein',
];

export const isCommonPassword = (password: string): boolean => {
  return commonPasswords.includes(password.toLowerCase());
};
