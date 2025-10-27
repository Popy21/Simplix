import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
} from 'react-native';
import { ChevronDownIcon, PlusIcon, SearchIcon, XCircleIcon } from '../Icons';

interface DropdownOption {
  id: string;
  label: string;
  subtitle?: string;
}

interface DropdownProps {
  label: string;
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  onCreateNew?: () => void;
  createButtonLabel?: string;
  searchable?: boolean;
  emptyMessage?: string;
}

export default function Dropdown({
  label,
  value,
  options,
  onChange,
  placeholder = 'Sélectionner',
  required = false,
  onCreateNew,
  createButtonLabel = 'Créer nouveau',
  searchable = true,
  emptyMessage = 'Aucun résultat',
}: DropdownProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedOption = options.find((opt) => opt.id === value);

  const filteredOptions = searchable
    ? options.filter((opt) =>
        opt.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : options;

  const handleSelect = (optionId: string) => {
    onChange(optionId);
    setShowDropdown(false);
    setSearchQuery('');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>

      <TouchableOpacity
        style={styles.input}
        onPress={() => setShowDropdown(true)}
      >
        <Text style={[styles.inputText, !selectedOption && styles.placeholder]}>
          {selectedOption?.label || placeholder}
        </Text>
        <ChevronDownIcon size={20} color="#8E8E93" />
      </TouchableOpacity>

      <Modal
        visible={showDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowDropdown(false);
          setSearchQuery('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.dropdownContainer}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>{label}</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowDropdown(false);
                  setSearchQuery('');
                }}
              >
                <XCircleIcon size={24} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            {/* Search */}
            {searchable && (
              <View style={styles.searchContainer}>
                <SearchIcon size={20} color="#8E8E93" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholderTextColor="#8E8E93"
                  autoFocus
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <XCircleIcon size={20} color="#8E8E93" />
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Options list */}
            <ScrollView
              style={styles.optionsList}
              showsVerticalScrollIndicator={false}
            >
              {filteredOptions.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>{emptyMessage}</Text>
                </View>
              ) : (
                filteredOptions.map((option) => (
                  <TouchableOpacity
                    key={option.id}
                    style={[
                      styles.option,
                      option.id === value && styles.selectedOption,
                    ]}
                    onPress={() => handleSelect(option.id)}
                  >
                    <View style={styles.optionContent}>
                      <Text
                        style={[
                          styles.optionLabel,
                          option.id === value && styles.selectedOptionLabel,
                        ]}
                      >
                        {option.label}
                      </Text>
                      {option.subtitle && (
                        <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
                      )}
                    </View>
                    {option.id === value && (
                      <View style={styles.checkmark}>
                        <Text style={styles.checkmarkText}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            {/* Create new button */}
            {onCreateNew && (
              <TouchableOpacity
                style={styles.createButton}
                onPress={() => {
                  setShowDropdown(false);
                  setSearchQuery('');
                  onCreateNew();
                }}
              >
                <PlusIcon size={20} color="#007AFF" />
                <Text style={styles.createButtonText}>{createButtonLabel}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  required: {
    color: '#FF3B30',
  },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 14,
  },
  inputText: {
    fontSize: 16,
    color: '#000000',
    flex: 1,
  },
  placeholder: {
    color: '#8E8E93',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    margin: 16,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000000',
  },
  optionsList: {
    maxHeight: 400,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: '#8E8E93',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  selectedOption: {
    backgroundColor: '#007AFF10',
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    letterSpacing: -0.2,
  },
  selectedOptionLabel: {
    color: '#007AFF',
    fontWeight: '600',
  },
  optionSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  checkmarkText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    backgroundColor: '#007AFF10',
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    letterSpacing: -0.2,
  },
});
