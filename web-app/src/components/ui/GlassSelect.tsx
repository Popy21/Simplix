import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  Animated,
  ViewStyle,
  Platform,
} from 'react-native';
import { glassTheme } from '../../theme/glassTheme';
import { ChevronDownIcon, CheckIcon } from '../Icons';

interface Option {
  value: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

interface GlassSelectProps {
  options: Option[];
  value: string | string[];
  onChange: (value: string | string[]) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  multiple?: boolean;
  searchable?: boolean;
  containerStyle?: ViewStyle;
  required?: boolean;
}

export default function GlassSelect({
  options,
  value,
  onChange,
  placeholder = 'Selectionner...',
  label,
  error,
  disabled = false,
  multiple = false,
  searchable = false,
  containerStyle,
  required = false,
}: GlassSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const selectedValues = Array.isArray(value) ? value : value ? [value] : [];
  const selectedOptions = options.filter((opt) => selectedValues.includes(opt.value));

  const filteredOptions = searchable && searchQuery
    ? options.filter((opt) =>
        opt.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : options;

  const handleOpen = () => {
    if (disabled) return;
    setIsOpen(true);
    Animated.spring(rotateAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 40,
      friction: 8,
    }).start();
  };

  const handleClose = () => {
    setIsOpen(false);
    setSearchQuery('');
    Animated.spring(rotateAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 40,
      friction: 8,
    }).start();
  };

  const handleSelect = (option: Option) => {
    if (option.disabled) return;

    if (multiple) {
      const newValues = selectedValues.includes(option.value)
        ? selectedValues.filter((v) => v !== option.value)
        : [...selectedValues, option.value];
      onChange(newValues);
    } else {
      onChange(option.value);
      handleClose();
    }
  };

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const getDisplayText = () => {
    if (selectedOptions.length === 0) return placeholder;
    if (selectedOptions.length === 1) return selectedOptions[0].label;
    return `${selectedOptions.length} selectionne(s)`;
  };

  const renderOption = ({ item }: { item: Option }) => {
    const isSelected = selectedValues.includes(item.value);

    return (
      <TouchableOpacity
        onPress={() => handleSelect(item)}
        disabled={item.disabled}
        style={[
          styles.option,
          isSelected && styles.optionSelected,
          item.disabled && styles.optionDisabled,
        ]}
        activeOpacity={0.7}
      >
        {item.icon && <View style={styles.optionIcon}>{item.icon}</View>}
        <Text
          style={[
            styles.optionLabel,
            isSelected && styles.optionLabelSelected,
            item.disabled && styles.optionLabelDisabled,
          ]}
          numberOfLines={1}
        >
          {item.label}
        </Text>
        {isSelected && (
          <View style={styles.checkIcon}>
            <CheckIcon size={18} color={glassTheme.colors.primary} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[styles.label, error && styles.labelError]}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}

      <TouchableOpacity
        onPress={handleOpen}
        disabled={disabled}
        activeOpacity={0.8}
        style={[
          styles.trigger,
          isOpen && styles.triggerOpen,
          error && styles.triggerError,
          disabled && styles.triggerDisabled,
        ]}
      >
        <View style={styles.glassBackground} />

        <View style={styles.triggerContent}>
          {selectedOptions[0]?.icon && (
            <View style={styles.triggerIcon}>{selectedOptions[0].icon}</View>
          )}
          <Text
            style={[
              styles.triggerText,
              selectedOptions.length === 0 && styles.triggerPlaceholder,
            ]}
            numberOfLines={1}
          >
            {getDisplayText()}
          </Text>
        </View>

        <Animated.View style={{ transform: [{ rotate: rotation }] }}>
          <ChevronDownIcon size={20} color={glassTheme.colors.text.tertiary} />
        </Animated.View>
      </TouchableOpacity>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={handleClose}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        >
          <View style={styles.dropdown}>
            <View style={styles.dropdownGlass} />

            <FlatList
              data={filteredOptions}
              renderItem={renderOption}
              keyExtractor={(item) => item.value}
              showsVerticalScrollIndicator={false}
              style={styles.optionsList}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>Aucune option</Text>
                </View>
              }
            />

            {multiple && selectedValues.length > 0 && (
              <TouchableOpacity
                onPress={handleClose}
                style={styles.doneButton}
              >
                <Text style={styles.doneButtonText}>Terminer</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: glassTheme.spacing.md,
  },
  label: {
    ...glassTheme.typography.bodySmall,
    color: glassTheme.colors.text.secondary,
    fontWeight: '600',
    marginBottom: glassTheme.spacing.xs,
  },
  labelError: {
    color: glassTheme.colors.error,
  },
  required: {
    color: glassTheme.colors.error,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: glassTheme.radius.md,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    paddingHorizontal: glassTheme.spacing.md,
    paddingVertical: glassTheme.spacing.sm,
    minHeight: 48,
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? {
      // @ts-ignore
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    } : {}),
  },
  triggerOpen: {
    borderColor: glassTheme.colors.primary,
  },
  triggerError: {
    borderColor: glassTheme.colors.error,
  },
  triggerDisabled: {
    opacity: 0.5,
  },
  glassBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    ...(Platform.OS === 'web' ? {
      // @ts-ignore
      backdropFilter: 'blur(10px)',
    } : {}),
  },
  triggerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    zIndex: 1,
  },
  triggerIcon: {
    marginRight: glassTheme.spacing.sm,
  },
  triggerText: {
    ...glassTheme.typography.body,
    color: glassTheme.colors.text.primary,
    flex: 1,
  },
  triggerPlaceholder: {
    color: glassTheme.colors.text.quaternary,
  },
  errorText: {
    ...glassTheme.typography.caption,
    color: glassTheme.colors.error,
    marginTop: glassTheme.spacing.xs,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: glassTheme.spacing.lg,
    ...(Platform.OS === 'web' ? {
      // @ts-ignore
      backdropFilter: 'blur(5px)',
    } : {}),
  },
  dropdown: {
    width: '100%',
    maxWidth: 400,
    maxHeight: 400,
    borderRadius: glassTheme.radius.lg,
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? {
      // @ts-ignore
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 20 },
      shadowOpacity: 0.2,
      shadowRadius: 60,
      elevation: 20,
    }),
  },
  dropdownGlass: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    ...(Platform.OS === 'web' ? {
      // @ts-ignore
      backdropFilter: 'blur(40px)',
    } : {}),
  },
  optionsList: {
    maxHeight: 300,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: glassTheme.spacing.md,
    paddingVertical: glassTheme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.04)',
  },
  optionSelected: {
    backgroundColor: 'rgba(0, 122, 255, 0.08)',
  },
  optionDisabled: {
    opacity: 0.4,
  },
  optionIcon: {
    marginRight: glassTheme.spacing.sm,
  },
  optionLabel: {
    ...glassTheme.typography.body,
    color: glassTheme.colors.text.primary,
    flex: 1,
  },
  optionLabelSelected: {
    color: glassTheme.colors.primary,
    fontWeight: '600',
  },
  optionLabelDisabled: {
    color: glassTheme.colors.text.quaternary,
  },
  checkIcon: {
    marginLeft: glassTheme.spacing.sm,
  },
  emptyContainer: {
    padding: glassTheme.spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    ...glassTheme.typography.body,
    color: glassTheme.colors.text.tertiary,
  },
  doneButton: {
    paddingVertical: glassTheme.spacing.md,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.06)',
    backgroundColor: 'rgba(0, 122, 255, 0.05)',
  },
  doneButtonText: {
    ...glassTheme.typography.body,
    color: glassTheme.colors.primary,
    fontWeight: '600',
  },
});
