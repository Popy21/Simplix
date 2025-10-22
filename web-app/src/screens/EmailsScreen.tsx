import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
  Platform,
  TextInput,
  Switch,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { UsersIcon, TrendingUpIcon } from '../components/Icons';

type EmailsScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Dashboard'>;
};

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  preview: string;
  category: string;
  variables: string[];
  usageCount: number;
  lastUsed: string;
}

interface ScheduledEmail {
  id: string;
  template: string;
  recipients: number;
  sendDate: string;
  status: 'pending' | 'scheduled' | 'sent';
}

interface EmailLog {
  id: string;
  recipient: string;
  subject: string;
  sendDate: string;
  status: 'sent' | 'delivered' | 'opened' | 'clicked';
  openCount: number;
  clickCount: number;
}

export default function EmailsScreen({ navigation }: EmailsScreenProps) {
  const [activeTab, setActiveTab] = useState<'templates' | 'scheduled' | 'logs'>('templates');
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [scheduled, setScheduled] = useState<ScheduledEmail[]>([]);
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [templateModalVisible, setTemplateModalVisible] = useState(false);
  const [bulkModalVisible, setBulkModalVisible] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    // Templates mock data
    const mockTemplates: EmailTemplate[] = [
      {
        id: 't1',
        name: 'Bienvenue Client',
        subject: 'Bienvenue chez {{company}}',
        preview: 'Bonjour {{firstName}}, merci de votre confiance...',
        category: 'welcome',
        variables: ['firstName', 'lastName', 'company', 'email'],
        usageCount: 45,
        lastUsed: '2025-11-19',
      },
      {
        id: 't2',
        name: 'Suivi Devis',
        subject: 'Votre devis de {{value}}€ - {{company}}',
        preview: 'Bonjour {{firstName}}, suite à notre échange...',
        category: 'quote',
        variables: ['firstName', 'company', 'value', 'deadline'],
        usageCount: 32,
        lastUsed: '2025-11-18',
      },
      {
        id: 't3',
        name: 'Relance Deal',
        subject: 'Relance: {{dealTitle}} pour {{company}}',
        preview: 'Bonjour {{firstName}}, nous souhaitions...',
        category: 'sales',
        variables: ['firstName', 'dealTitle', 'company', 'amount'],
        usageCount: 28,
        lastUsed: '2025-11-17',
      },
      {
        id: 't4',
        name: 'Facture Envoyée',
        subject: 'Facture #{{invoiceId}} - {{amount}}€',
        preview: 'Veuillez trouver ci-joint votre facture...',
        category: 'invoice',
        variables: ['invoiceId', 'amount', 'dueDate'],
        usageCount: 156,
        lastUsed: '2025-11-19',
      },
    ];

    const mockScheduled: ScheduledEmail[] = [
      {
        id: 's1',
        template: 'Bienvenue Client',
        recipients: 12,
        sendDate: '2025-11-25',
        status: 'scheduled',
      },
      {
        id: 's2',
        template: 'Suivi Devis',
        recipients: 5,
        sendDate: '2025-11-23',
        status: 'scheduled',
      },
    ];

    const mockLogs: EmailLog[] = [
      {
        id: 'l1',
        recipient: 'jean.dupont@techcorp.fr',
        subject: 'Bienvenue chez TechCorp',
        sendDate: '2025-11-19',
        status: 'opened',
        openCount: 3,
        clickCount: 1,
      },
      {
        id: 'l2',
        recipient: 'marie.martin@globalsol.fr',
        subject: 'Votre devis de 32000€',
        sendDate: '2025-11-18',
        status: 'clicked',
        openCount: 2,
        clickCount: 2,
      },
      {
        id: 'l3',
        recipient: 'pierre.leroy@startupxyz.fr',
        subject: 'Relance: Solution E-commerce',
        sendDate: '2025-11-17',
        status: 'delivered',
        openCount: 0,
        clickCount: 0,
      },
      {
        id: 'l4',
        recipient: 'sophie.durand@enterprise.fr',
        subject: 'Facture #001 - 75000€',
        sendDate: '2025-11-16',
        status: 'opened',
        openCount: 1,
        clickCount: 0,
      },
    ];

    setTemplates(mockTemplates);
    setScheduled(mockScheduled);
    setLogs(mockLogs);
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      welcome: '#34C759',
      quote: '#007AFF',
      sales: '#FF9500',
      invoice: '#5856D6',
    };
    return colors[category] || '#8E8E93';
  };

  const getCategoryLabel = (category: string) => {
    const labels: { [key: string]: string } = {
      welcome: 'Bienvenue',
      quote: 'Devis',
      sales: 'Commercial',
      invoice: 'Facturation',
    };
    return labels[category] || category;
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      sent: '#8E8E93',
      delivered: '#007AFF',
      opened: '#34C759',
      clicked: '#FF9500',
      scheduled: '#5856D6',
      pending: '#FF3B30',
    };
    return colors[status] || '#8E8E93';
  };

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      sent: 'Envoyé',
      delivered: 'Livré',
      opened: 'Ouvert',
      clicked: 'Cliqué',
      scheduled: 'Planifié',
      pending: 'En attente',
    };
    return labels[status] || status;
  };

  const renderTemplateCard = ({ item: template }: { item: EmailTemplate }) => (
    <TouchableOpacity
      style={styles.templateCard}
      onPress={() => {
        setSelectedTemplate(template);
        setTemplateModalVisible(true);
      }}
    >
      <View style={styles.templateCardHeader}>
        <View style={styles.templateInfo}>
          <Text style={styles.templateName}>{template.name}</Text>
          <Text style={styles.templateSubject} numberOfLines={1}>
            {template.subject}
          </Text>
        </View>
        <View style={[styles.categoryBadge, { backgroundColor: `${getCategoryColor(template.category)}20` }]}>
          <Text style={[styles.categoryBadgeText, { color: getCategoryColor(template.category) }]}>
            {getCategoryLabel(template.category)}
          </Text>
        </View>
      </View>

      <Text style={styles.templatePreview} numberOfLines={2}>
        {template.preview}
      </Text>

      <View style={styles.templateFooter}>
        <View style={styles.usageStats}>
          <Text style={styles.usageLabel}>Utilisation</Text>
          <Text style={styles.usageValue}>{template.usageCount}</Text>
        </View>
        <View style={styles.usageStats}>
          <Text style={styles.usageLabel}>Dernière</Text>
          <Text style={styles.usageValue}>{template.lastUsed}</Text>
        </View>
        <TouchableOpacity style={styles.sendButton}>
          <Text style={styles.sendButtonText}>Envoyer</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderScheduledCard = ({ item: email }: { item: ScheduledEmail }) => (
    <TouchableOpacity style={styles.scheduledCard}>
      <View style={styles.scheduledHeader}>
        <Text style={styles.scheduledTemplate}>{email.template}</Text>
        <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(email.status)}20` }]}>
          <Text style={[styles.statusBadgeText, { color: getStatusColor(email.status) }]}>
            {getStatusLabel(email.status)}
          </Text>
        </View>
      </View>

      <View style={styles.scheduledInfo}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Destinataires</Text>
          <Text style={styles.infoValue}>{email.recipients}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Date d'envoi</Text>
          <Text style={styles.infoValue}>{email.sendDate}</Text>
        </View>
      </View>

      <View style={styles.scheduledActions}>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>Éditer</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.actionButtonDanger]}>
          <Text style={[styles.actionButtonText, styles.actionButtonTextDanger]}>Supprimer</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderLogCard = ({ item: log }: { item: EmailLog }) => (
    <TouchableOpacity style={styles.logCard}>
      <View style={styles.logHeader}>
        <View style={styles.logInfo}>
          <Text style={styles.logRecipient}>{log.recipient}</Text>
          <Text style={styles.logSubject} numberOfLines={1}>{log.subject}</Text>
        </View>
        <View style={[styles.logStatusBadge, { backgroundColor: `${getStatusColor(log.status)}20` }]}>
          <Text style={[styles.logStatusText, { color: getStatusColor(log.status) }]}>
            {getStatusLabel(log.status)}
          </Text>
        </View>
      </View>

      <View style={styles.logStats}>
        <View style={styles.logStatItem}>
          <Text style={styles.logStatIcon}>👁</Text>
          <Text style={styles.logStatValue}>{log.openCount}</Text>
        </View>
        <View style={styles.logStatItem}>
          <Text style={styles.logStatIcon}>🖱</Text>
          <Text style={styles.logStatValue}>{log.clickCount}</Text>
        </View>
        <View style={styles.logStatItem}>
          <Text style={styles.logStatLabel}>{log.sendDate}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📧 Email</Text>
        <Text style={styles.headerSubtitle}>Gérez templates, envois et suivi</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {['templates', 'scheduled', 'logs'].map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab as typeof activeTab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'templates' ? '📝 Templates' : tab === 'scheduled' ? '⏰ Planifiés' : '📊 Logs'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {activeTab === 'templates' && (
        <View style={styles.content}>
          <View style={styles.actionBar}>
            <Text style={styles.contentTitle}>
              {templates.length} Templates
            </Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => {
                setSelectedTemplate(null);
                setTemplateModalVisible(true);
              }}
            >
              <Text style={styles.createButtonText}>+ Nouveau</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={templates}
            renderItem={renderTemplateCard}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            scrollEnabled={false}
          />
        </View>
      )}

      {activeTab === 'scheduled' && (
        <View style={styles.content}>
          <View style={styles.actionBar}>
            <Text style={styles.contentTitle}>
              {scheduled.length} Campagnes Planifiées
            </Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => setBulkModalVisible(true)}
            >
              <Text style={styles.createButtonText}>+ Planifier</Text>
            </TouchableOpacity>
          </View>

          {scheduled.length > 0 ? (
            <FlatList
              data={scheduled}
              renderItem={renderScheduledCard}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.listContent}
              scrollEnabled={false}
            />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>Aucun email planifié</Text>
            </View>
          )}
        </View>
      )}

      {activeTab === 'logs' && (
        <View style={styles.content}>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statBoxValue}>{logs.length}</Text>
              <Text style={styles.statBoxLabel}>Envoyés</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statBoxValue}>
                {logs.filter(l => l.status === 'opened' || l.status === 'clicked').length}
              </Text>
              <Text style={styles.statBoxLabel}>Ouverts</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statBoxValue}>
                {logs.filter(l => l.status === 'clicked').length}
              </Text>
              <Text style={styles.statBoxLabel}>Cliqués</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statBoxValue}>
                {((logs.filter(l => l.status === 'opened' || l.status === 'clicked').length / logs.length) * 100).toFixed(0)}%
              </Text>
              <Text style={styles.statBoxLabel}>Taux</Text>
            </View>
          </View>

          <FlatList
            data={logs}
            renderItem={renderLogCard}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            scrollEnabled={false}
          />
        </View>
      )}

      {/* Template Modal */}
      <Modal
        visible={templateModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setTemplateModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedTemplate ? selectedTemplate.name : 'Nouveau Template'}
              </Text>
              <TouchableOpacity onPress={() => setTemplateModalVisible(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Nom du Template</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Bienvenue Client"
                  defaultValue={selectedTemplate?.name}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Sujet</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Bienvenue chez {{company}}"
                  defaultValue={selectedTemplate?.subject}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Catégorie</Text>
                <View style={styles.categorySelect}>
                  {['welcome', 'quote', 'sales', 'invoice'].map(cat => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.categoryOption,
                        selectedTemplate?.category === cat && styles.categoryOptionActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.categoryOptionText,
                          selectedTemplate?.category === cat && styles.categoryOptionTextActive,
                        ]}
                      >
                        {getCategoryLabel(cat)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Contenu</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Votre contenu d'email..."
                  multiline
                  numberOfLines={6}
                  defaultValue={selectedTemplate?.preview}
                />
              </View>

              {selectedTemplate && (
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Variables disponibles</Text>
                  <View style={styles.variablesContainer}>
                    {selectedTemplate.variables.map(variable => (
                      <TouchableOpacity
                        key={variable}
                        style={styles.variableBadge}
                        onPress={() => {}}
                      >
                        <Text style={styles.variableBadgeText}>{`{{${variable}}}`}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={[styles.button, styles.buttonSecondary]}>
                <Text style={styles.buttonSecondaryText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, styles.buttonPrimary]}>
                <Text style={styles.buttonPrimaryText}>Enregistrer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bulk Send Modal */}
      <Modal
        visible={bulkModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setBulkModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Planifier un Envoi</Text>
              <TouchableOpacity onPress={() => setBulkModalVisible(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Sélectionner Template</Text>
                <View style={styles.templateSelect}>
                  {templates.map(template => (
                    <TouchableOpacity key={template.id} style={styles.templateSelectOption}>
                      <Text style={styles.templateSelectName}>{template.name}</Text>
                      <Text style={styles.templateSelectCategory}>
                        {getCategoryLabel(template.category)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Destinataires</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Sélectionner les destinataires..."
                  multiline
                  numberOfLines={4}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Date d'envoi</Text>
                <TextInput
                  style={styles.input}
                  placeholder="YYYY-MM-DD"
                />
              </View>

              <View style={styles.formGroup}>
                <View style={styles.switchRow}>
                  <Text style={styles.formLabel}>Imédiatement</Text>
                  <Switch value={false} />
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={() => setBulkModalVisible(false)}
              >
                <Text style={styles.buttonSecondaryText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, styles.buttonPrimary]}>
                <Text style={styles.buttonPrimaryText}>Planifier</Text>
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
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
    paddingHorizontal: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
  },
  tabTextActive: {
    color: '#007AFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  contentTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
  },
  createButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  listContent: {
    gap: 8,
    paddingBottom: 20,
  },
  templateCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  templateCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  templateInfo: {
    flex: 1,
    marginRight: 8,
  },
  templateName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 2,
  },
  templateSubject: {
    fontSize: 11,
    color: '#8E8E93',
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  templatePreview: {
    fontSize: 12,
    color: '#000000',
    marginBottom: 8,
    lineHeight: 16,
  },
  templateFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  usageStats: {
    alignItems: 'center',
  },
  usageLabel: {
    fontSize: 10,
    color: '#8E8E93',
    marginBottom: 2,
  },
  usageValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000000',
  },
  sendButton: {
    backgroundColor: '#34C759',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  sendButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  scheduledCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  scheduledHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  scheduledTemplate: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000000',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  scheduledInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F2F2F7',
    marginBottom: 10,
  },
  infoItem: {
    flex: 1,
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 10,
    color: '#8E8E93',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000000',
  },
  scheduledActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: '#007AFF',
    borderRadius: 6,
    alignItems: 'center',
  },
  actionButtonDanger: {
    backgroundColor: '#FF3B3020',
  },
  actionButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  actionButtonTextDanger: {
    color: '#FF3B30',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  statBoxValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
  },
  statBoxLabel: {
    fontSize: 10,
    color: '#8E8E93',
  },
  logCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  logInfo: {
    flex: 1,
  },
  logRecipient: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  logSubject: {
    fontSize: 11,
    color: '#8E8E93',
  },
  logStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  logStatusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  logStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  logStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  logStatIcon: {
    fontSize: 12,
  },
  logStatValue: {
    fontSize: 11,
    fontWeight: '600',
    color: '#000000',
  },
  logStatLabel: {
    fontSize: 10,
    color: '#8E8E93',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#C7C7CC',
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    maxHeight: '95%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
  },
  closeButton: {
    fontSize: 24,
    color: '#8E8E93',
  },
  modalBody: {
    maxHeight: 400,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#000000',
  },
  textArea: {
    textAlignVertical: 'top',
    paddingTop: 10,
  },
  categorySelect: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  categoryOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
  },
  categoryOptionActive: {
    backgroundColor: '#007AFF',
  },
  categoryOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
  },
  categoryOptionTextActive: {
    color: '#FFFFFF',
  },
  variablesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  variableBadge: {
    backgroundColor: '#007AFF20',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },
  variableBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#007AFF',
  },
  templateSelect: {
    gap: 8,
  },
  templateSelectOption: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
  },
  templateSelectName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  templateSelectCategory: {
    fontSize: 11,
    color: '#8E8E93',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 16,
    paddingBottom: 20,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#007AFF',
  },
  buttonPrimaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  buttonSecondary: {
    backgroundColor: '#F2F2F7',
  },
  buttonSecondaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8E8E93',
  },
});
