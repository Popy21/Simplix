import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Platform } from 'react-native';
import { CalendarIcon } from '../Icons';

interface DatePickerProps {
  label: string;
  value: string;
  onChange: (date: string) => void;
  placeholder?: string;
  required?: boolean;
}

export default function DatePicker({
  label,
  value,
  onChange,
  placeholder = 'Sélectionner une date',
  required = false,
}: DatePickerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(value || '');

  const formatDate = (dateString: string) => {
    if (!dateString) return placeholder;
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    onChange(newDate);
    setShowPicker(false);
  };

  const generateCalendar = () => {
    const today = new Date();
    const currentMonth = selectedDate ? new Date(selectedDate) : today;
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (number | null)[] = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return { year, month, days, today };
  };

  const { year, month, days, today } = generateCalendar();
  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];
  const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

  const changeMonth = (direction: number) => {
    const newDate = new Date(year, month + direction, 1);
    setSelectedDate(newDate.toISOString().split('T')[0]);
  };

  const isToday = (day: number) => {
    const compareDate = new Date(year, month, day);
    return (
      compareDate.getDate() === today.getDate() &&
      compareDate.getMonth() === today.getMonth() &&
      compareDate.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (day: number) => {
    if (!selectedDate) return false;
    const compareDate = new Date(year, month, day);
    const selected = new Date(selectedDate);
    return (
      compareDate.getDate() === selected.getDate() &&
      compareDate.getMonth() === selected.getMonth() &&
      compareDate.getFullYear() === selected.getFullYear()
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>

      <TouchableOpacity
        style={styles.input}
        onPress={() => setShowPicker(true)}
      >
        <CalendarIcon size={20} color="#8E8E93" />
        <Text style={[styles.inputText, !value && styles.placeholder]}>
          {formatDate(value)}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={showPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.calendarContainer}>
            {/* Header */}
            <View style={styles.calendarHeader}>
              <TouchableOpacity
                style={styles.navButton}
                onPress={() => changeMonth(-1)}
              >
                <Text style={styles.navButtonText}>‹</Text>
              </TouchableOpacity>

              <Text style={styles.monthYear}>
                {monthNames[month]} {year}
              </Text>

              <TouchableOpacity
                style={styles.navButton}
                onPress={() => changeMonth(1)}
              >
                <Text style={styles.navButtonText}>›</Text>
              </TouchableOpacity>
            </View>

            {/* Day names */}
            <View style={styles.dayNamesRow}>
              {dayNames.map((day) => (
                <View key={day} style={styles.dayNameCell}>
                  <Text style={styles.dayNameText}>{day}</Text>
                </View>
              ))}
            </View>

            {/* Calendar grid */}
            <View style={styles.calendarGrid}>
              {days.map((day, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.dayCell,
                    day === null && styles.emptyCell,
                    isToday(day || 0) && styles.todayCell,
                    isSelected(day || 0) && styles.selectedCell,
                  ]}
                  onPress={() => {
                    if (day) {
                      const newDate = new Date(year, month, day);
                      handleDateChange(newDate.toISOString().split('T')[0]);
                    }
                  }}
                  disabled={day === null}
                >
                  {day && (
                    <Text
                      style={[
                        styles.dayText,
                        isToday(day) && styles.todayText,
                        isSelected(day) && styles.selectedText,
                      ]}
                    >
                      {day}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Footer */}
            <View style={styles.calendarFooter}>
              <TouchableOpacity
                style={styles.footerButton}
                onPress={() => setShowPicker(false)}
              >
                <Text style={styles.footerButtonText}>Annuler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.footerButton, styles.todayButton]}
                onPress={() => {
                  const today = new Date().toISOString().split('T')[0];
                  handleDateChange(today);
                }}
              >
                <Text style={styles.todayButtonText}>Aujourd'hui</Text>
              </TouchableOpacity>
            </View>
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
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 14,
    gap: 10,
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
  calendarContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    width: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#007AFF',
  },
  monthYear: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.4,
  },
  dayNamesRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayNameCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  dayNameText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  emptyCell: {
    backgroundColor: 'transparent',
  },
  todayCell: {
    backgroundColor: '#007AFF20',
  },
  selectedCell: {
    backgroundColor: '#007AFF',
  },
  dayText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
  },
  todayText: {
    color: '#007AFF',
    fontWeight: '700',
  },
  selectedText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  calendarFooter: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  footerButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
  },
  footerButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
  },
  todayButton: {
    backgroundColor: '#007AFF',
  },
  todayButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
