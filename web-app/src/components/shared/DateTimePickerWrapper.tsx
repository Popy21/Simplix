import React, { useEffect, useState } from 'react';
import { Platform, Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';

type Props = {
  visible: boolean;
  date: Date;
  onConfirm: (date: Date) => void;
  onCancel: () => void;
};

let NativePicker: ((props: any) => JSX.Element) | null = null;
if (Platform.OS !== 'web') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    NativePicker = require('react-native-modal-datetime-picker').default;
  } catch (error) {
    console.warn('Impossible de charger react-native-modal-datetime-picker:', error);
    NativePicker = null;
  }
}

const DateTimePickerWrapper: React.FC<Props> = ({ visible, date, onConfirm, onCancel }) => {
  if (Platform.OS !== 'web' && NativePicker) {
    return (
      <NativePicker
        isVisible={visible}
        mode="date"
        locale="fr-FR"
        date={date}
        onConfirm={(selectedDate: Date) => onConfirm(selectedDate)}
        onCancel={onCancel}
        confirmTextIOS="Confirmer"
        cancelTextIOS="Annuler"
      />
    );
  }

  const [value, setValue] = useState(date.toISOString().split('T')[0]);

  useEffect(() => {
    setValue(date.toISOString().split('T')[0]);
  }, [date]);

  if (!visible) {
    return null;
  }

  const handleConfirm = () => {
    const parsed = value ? new Date(value) : new Date();
    onConfirm(parsed);
  };

  const webInputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 14px',
    borderRadius: 10,
    border: '1px solid #E5E5EA',
    fontSize: 16,
    color: '#000',
    fontFamily: 'inherit',
    outline: 'none',
  };

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>Choisir une date</Text>
          {/* eslint-disable-next-line jsx-a11y/no-onchange */}
          <input
            type="date"
            value={value}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => setValue(event.target.value)}
            style={webInputStyle}
          />
          <View style={styles.actions}>
            <TouchableOpacity style={[styles.actionButton, styles.cancelButton]} onPress={onCancel}>
              <Text style={[styles.actionText, styles.cancelText]}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, styles.confirmButton]} onPress={handleConfirm}>
              <Text style={[styles.actionText, styles.confirmText]}>Valider</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 16,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  actionButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginHorizontal: 6,
  },
  cancelButton: {
    backgroundColor: '#F2F2F7',
  },
  confirmButton: {
    backgroundColor: '#007AFF',
  },
  actionText: {
    fontSize: 15,
    fontWeight: '600',
  },
  cancelText: {
    color: '#8E8E93',
  },
  confirmText: {
    color: '#FFFFFF',
  },
});

export default DateTimePickerWrapper;
