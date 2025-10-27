import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native';
import logger from '../utils/logger';

export default function LogMonitor() {
  const [visible, setVisible] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    // Raccourci clavier Ctrl+Shift+L pour ouvrir/fermer
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'L') {
        setVisible(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  useEffect(() => {
    if (!visible || !autoRefresh) return;

    const interval = setInterval(() => {
      const allLogs = logger.getLogs();
      setLogs(allLogs);
    }, 1000);

    return () => clearInterval(interval);
  }, [visible, autoRefresh]);

  useEffect(() => {
    if (visible) {
      const allLogs = logger.getLogs();
      setLogs(allLogs);
    }
  }, [visible]);

  const filteredLogs = filter === 'all'
    ? logs
    : logs.filter(log => log.level === filter || log.category === filter);

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'success': return '#4CAF50';
      case 'info': return '#2196F3';
      case 'warn': return '#FF9800';
      case 'error': return '#F44336';
      case 'debug': return '#9C27B0';
      default: return '#666';
    }
  };

  const categories = [...new Set(logs.map(log => log.category))];
  const summary = {
    total: logs.length,
    success: logs.filter(l => l.level === 'success').length,
    info: logs.filter(l => l.level === 'info').length,
    warn: logs.filter(l => l.level === 'warn').length,
    error: logs.filter(l => l.level === 'error').length,
    debug: logs.filter(l => l.level === 'debug').length,
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setVisible(false)}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>📊 Log Monitor</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => setAutoRefresh(!autoRefresh)}
              >
                <Text style={styles.headerButtonText}>
                  {autoRefresh ? '⏸️ Pause' : '▶️ Play'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => {
                  logger.clear();
                  setLogs([]);
                }}
              >
                <Text style={styles.headerButtonText}>🗑️ Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => {
                  const json = logger.exportLogs();
                  console.log('Logs exported:', json);
                  const blob = new Blob([json], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `logs-${Date.now()}.json`;
                  a.click();
                }}
              >
                <Text style={styles.headerButtonText}>💾 Export</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.headerButton, styles.closeButton]}
                onPress={() => setVisible(false)}
              >
                <Text style={styles.headerButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Summary */}
          <View style={styles.summary}>
            <Text style={styles.summaryText}>Total: {summary.total}</Text>
            <Text style={[styles.summaryText, { color: '#4CAF50' }]}>✅ {summary.success}</Text>
            <Text style={[styles.summaryText, { color: '#2196F3' }]}>ℹ️ {summary.info}</Text>
            <Text style={[styles.summaryText, { color: '#FF9800' }]}>⚠️ {summary.warn}</Text>
            <Text style={[styles.summaryText, { color: '#F44336' }]}>❌ {summary.error}</Text>
            <Text style={[styles.summaryText, { color: '#9C27B0' }]}>🔍 {summary.debug}</Text>
          </View>

          {/* Filters */}
          <View style={styles.filters}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <TouchableOpacity
                style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
                onPress={() => setFilter('all')}
              >
                <Text style={styles.filterButtonText}>All</Text>
              </TouchableOpacity>
              {['success', 'info', 'warn', 'error', 'debug'].map(level => (
                <TouchableOpacity
                  key={level}
                  style={[styles.filterButton, filter === level && styles.filterButtonActive]}
                  onPress={() => setFilter(level)}
                >
                  <Text style={styles.filterButtonText}>{level}</Text>
                </TouchableOpacity>
              ))}
              {categories.map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.filterButton, filter === cat && styles.filterButtonActive]}
                  onPress={() => setFilter(cat)}
                >
                  <Text style={styles.filterButtonText}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Logs */}
          <ScrollView style={styles.logsList}>
            {filteredLogs.slice().reverse().map((log, index) => (
              <View key={index} style={styles.logEntry}>
                <View style={styles.logHeader}>
                  <Text style={[styles.logLevel, { color: getLevelColor(log.level) }]}>
                    {log.level.toUpperCase()}
                  </Text>
                  <Text style={styles.logCategory}>{log.category}</Text>
                  <Text style={styles.logTime}>
                    {new Date(log.timestamp).toLocaleTimeString('fr-FR')}
                  </Text>
                </View>
                <Text style={styles.logMessage}>{log.message}</Text>
                {log.data && (
                  <Text style={styles.logData}>{JSON.stringify(log.data, null, 2)}</Text>
                )}
              </View>
            ))}
            {filteredLogs.length === 0 && (
              <Text style={styles.emptyText}>No logs yet. Start using the app!</Text>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Press Ctrl+Shift+L to toggle • Auto-refresh: {autoRefresh ? 'ON' : 'OFF'}
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 1200,
    height: '90%',
    backgroundColor: '#1e1e1e',
    borderRadius: 8,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#2d2d2d',
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#3d3d3d',
    borderRadius: 4,
  },
  closeButton: {
    backgroundColor: '#F44336',
  },
  headerButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  summary: {
    flexDirection: 'row',
    gap: 16,
    padding: 12,
    backgroundColor: '#252525',
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  summaryText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  filters: {
    padding: 12,
    backgroundColor: '#2d2d2d',
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#3d3d3d',
    borderRadius: 4,
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#2196F3',
  },
  filterButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  logsList: {
    flex: 1,
    padding: 12,
  },
  logEntry: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#252525',
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#2196F3',
  },
  logHeader: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 6,
  },
  logLevel: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  logCategory: {
    fontSize: 11,
    fontWeight: '600',
    color: '#aaa',
    fontFamily: 'monospace',
  },
  logTime: {
    fontSize: 11,
    color: '#666',
    marginLeft: 'auto',
    fontFamily: 'monospace',
  },
  logMessage: {
    fontSize: 13,
    color: '#fff',
    marginBottom: 6,
    fontFamily: 'monospace',
  },
  logData: {
    fontSize: 11,
    color: '#4CAF50',
    fontFamily: 'monospace',
    backgroundColor: '#1a1a1a',
    padding: 8,
    borderRadius: 4,
  },
  emptyText: {
    color: '#666',
    textAlign: 'center',
    marginTop: 40,
    fontSize: 14,
  },
  footer: {
    padding: 12,
    backgroundColor: '#2d2d2d',
    borderTopWidth: 1,
    borderTopColor: '#444',
  },
  footerText: {
    color: '#666',
    fontSize: 11,
    textAlign: 'center',
  },
});

// Exposer globalement pour pouvoir l'ouvrir depuis la console
if (typeof window !== 'undefined') {
  (window as any).openLogMonitor = () => {
    const event = new KeyboardEvent('keydown', {
      ctrlKey: true,
      shiftKey: true,
      key: 'L',
    });
    window.dispatchEvent(event);
  };
}
