import React, { useState, useEffect, useCallback } from 'react';
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
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { withGlassLayout } from '../components/withGlassLayout';
import { emailsService, contactService } from '../services/api';
import { useAuth } from '../context/AuthContext';

type EmailsScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Dashboard'>;
};

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html_content: string;
  text_content?: string;
  category?: string;
  variables: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface EmailCampaign {
  id: string;
  name: string;
  template_name?: string;
  subject: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused';
  scheduled_at?: string;
  sent_at?: string;
  total_recipients: number;
  sent_count: number;
  delivered_count: number;
  opened_count: number;
  clicked_count: number;
  bounced_count: number;
  open_rate?: number;
  click_rate?: number;
  created_at: string;
}

interface EmailLog {
  id: string;
  to_email: string;
  to_name?: string;
  subject: string;
  status: 'pending' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'complained';
  sent_at?: string;
  delivered_at?: string;
  opened_at?: string;
  clicked_at?: string;
  open_count: number;
  click_count: number;
  campaign_name?: string;
  created_at: string;
}

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

function EmailsScreen({ navigation }: EmailsScreenProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'templates' | 'campaigns' | 'logs'>('templates');
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [templateModalVisible, setTemplateModalVisible] = useState(false);
  const [campaignModalVisible, setCampaignModalVisible] = useState(false);

  const [templateForm, setTemplateForm] = useState({
    name: '',
    subject: '',
    html_content: '',
    text_content: '',
    category: 'general',
  });

  const [campaignForm, setCampaignForm] = useState({
    template_id: '',
    name: '',
    subject: '',
    from_email: user?.email || '',
    from_name: user?.first_name + ' ' + user?.last_name || '',
    reply_to: user?.email || '',
    scheduled_at: '',
    immediate: false,
    selected_contacts: [] as string[],
  });

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);

      if (activeTab === 'templates') {
        await loadTemplates();
      } else if (activeTab === 'campaigns') {
        await loadCampaigns();
      } else if (activeTab === 'logs') {
        await loadLogs();
      }
    } catch (error: any) {
      console.error('Error loading data:', error);
      Alert.alert('Erreur', 'Impossible de charger les données');
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const response = await emailsService.getTemplates();
      setTemplates(response.data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const loadCampaigns = async () => {
    try {
      const response = await emailsService.getCampaigns();
      setCampaigns(response.data || []);
    } catch (error) {
      console.error('Error loading campaigns:', error);
    }
  };

  const loadLogs = async () => {
    try {
      const response = await emailsService.getLogs({ limit: 100 });
      setLogs(response.data || []);
    } catch (error) {
      console.error('Error loading logs:', error);
    }
  };

  const loadContacts = async () => {
    try {
      const response = await contactService.getAll({ limit: 1000 });
      setContacts(response.data.contacts || []);
    } catch (error) {
      console.error('Error loading contacts:', error);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [activeTab]);

  const handleCreateTemplate = async () => {
    if (!templateForm.name || !templateForm.subject || !templateForm.html_content) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs requis');
      return;
    }

    try {
      setLoading(true);

      if (selectedTemplate) {
        await emailsService.updateTemplate(selectedTemplate.id, {
          name: templateForm.name,
          subject: templateForm.subject,
          html_content: templateForm.html_content,
          text_content: templateForm.text_content,
          category: templateForm.category,
        });
        Alert.alert('Succès', 'Template mis à jour');
      } else {
        await emailsService.createTemplate({
          name: templateForm.name,
          subject: templateForm.subject,
          html_content: templateForm.html_content,
          text_content: templateForm.text_content,
          category: templateForm.category,
        });
        Alert.alert('Succès', 'Template créé');
      }

      setTemplateModalVisible(false);
      resetTemplateForm();
      await loadTemplates();
    } catch (error: any) {
      Alert.alert('Erreur', error.response?.data?.error || 'Impossible de sauvegarder le template');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    Alert.alert(
      'Confirmation',
      'Voulez-vous vraiment supprimer ce template ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await emailsService.deleteTemplate(id);
              Alert.alert('Succès', 'Template supprimé');
              await loadTemplates();
            } catch (error: any) {
              Alert.alert('Erreur', error.response?.data?.error || 'Impossible de supprimer le template');
            }
          },
        },
      ]
    );
  };

  const handleCreateCampaign = async () => {
    if (!campaignForm.name || !campaignForm.subject || !campaignForm.from_email) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs requis');
      return;
    }

    if (campaignForm.selected_contacts.length === 0) {
      Alert.alert('Erreur', 'Veuillez sélectionner au moins un destinataire');
      return;
    }

    try {
      setLoading(true);

      const response = await emailsService.createCampaign({
        template_id: campaignForm.template_id || undefined,
        name: campaignForm.name,
        subject: campaignForm.subject,
        from_email: campaignForm.from_email,
        from_name: campaignForm.from_name,
        reply_to: campaignForm.reply_to,
        scheduled_at: campaignForm.immediate ? undefined : campaignForm.scheduled_at,
      });

      const campaignId = response.data.id;

      // Envoyer immédiatement si demandé
      if (campaignForm.immediate) {
        await emailsService.sendCampaign(campaignId, {
          contact_ids: campaignForm.selected_contacts,
        });
        Alert.alert('Succès', `Campagne envoyée à ${campaignForm.selected_contacts.length} destinataires`);
      } else {
        Alert.alert('Succès', 'Campagne créée et planifiée');
      }

      setCampaignModalVisible(false);
      resetCampaignForm();
      await loadCampaigns();
    } catch (error: any) {
      Alert.alert('Erreur', error.response?.data?.error || 'Impossible de créer la campagne');
    } finally {
      setLoading(false);
    }
  };

  const handleSendCampaign = async (campaign: EmailCampaign) => {
    await loadContacts();

    Alert.alert(
      'Envoyer la campagne',
      `Voulez-vous envoyer "${campaign.name}" maintenant ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Envoyer',
          onPress: () => {
            setCampaignForm({
              ...campaignForm,
              template_id: '',
              name: campaign.name,
              subject: campaign.subject,
              immediate: true,
            });
            setCampaignModalVisible(true);
          },
        },
      ]
    );
  };

  const handlePauseCampaign = async (id: string) => {
    try {
      await emailsService.pauseCampaign(id);
      Alert.alert('Succès', 'Campagne mise en pause');
      await loadCampaigns();
    } catch (error: any) {
      Alert.alert('Erreur', error.response?.data?.error || 'Impossible de mettre en pause');
    }
  };

  const resetTemplateForm = () => {
    setTemplateForm({
      name: '',
      subject: '',
      html_content: '',
      text_content: '',
      category: 'general',
    });
    setSelectedTemplate(null);
  };

  const resetCampaignForm = () => {
    setCampaignForm({
      template_id: '',
      name: '',
      subject: '',
      from_email: user?.email || '',
      from_name: user?.first_name + ' ' + user?.last_name || '',
      reply_to: user?.email || '',
      scheduled_at: '',
      immediate: false,
      selected_contacts: [],
    });
  };

  const openTemplateModal = (template?: EmailTemplate) => {
    if (template) {
      setSelectedTemplate(template);
      setTemplateForm({
        name: template.name,
        subject: template.subject,
        html_content: template.html_content,
        text_content: template.text_content || '',
        category: template.category || 'general',
      });
    } else {
      resetTemplateForm();
    }
    setTemplateModalVisible(true);
  };

  const openCampaignModal = async () => {
    await loadContacts();
    resetCampaignForm();
    setCampaignModalVisible(true);
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      welcome: '#34C759',
      quote: '#007AFF',
      sales: '#FF9500',
      invoice: '#5856D6',
      general: '#8E8E93',
    };
    return colors[category] || '#8E8E93';
  };

  const getCategoryLabel = (category: string) => {
    const labels: { [key: string]: string } = {
      welcome: 'Bienvenue',
      quote: 'Devis',
      sales: 'Commercial',
      invoice: 'Facturation',
      general: 'Général',
    };
    return labels[category] || category;
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      draft: '#8E8E93',
      scheduled: '#5856D6',
      sending: '#FF9500',
      sent: '#34C759',
      paused: '#FF3B30',
      pending: '#8E8E93',
      delivered: '#007AFF',
      opened: '#34C759',
      clicked: '#FF9500',
      bounced: '#FF3B30',
      complained: '#FF3B30',
    };
    return colors[status] || '#8E8E93';
  };

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      draft: 'Brouillon',
      scheduled: 'Planifié',
      sending: 'En cours',
      sent: 'Envoyé',
      paused: 'En pause',
      pending: 'En attente',
      delivered: 'Livré',
      opened: 'Ouvert',
      clicked: 'Cliqué',
      bounced: 'Échoué',
      complained: 'Signalé',
    };
    return labels[status] || status;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const renderTemplateCard = ({ item: template }: { item: EmailTemplate }) => (
    <TouchableOpacity
      style={styles.templateCard}
      onPress={() => openTemplateModal(template)}
    >
      <View style={styles.templateCardHeader}>
        <View style={styles.templateInfo}>
          <Text style={styles.templateName}>{template.name}</Text>
          <Text style={styles.templateSubject} numberOfLines={1}>
            {template.subject}
          </Text>
        </View>
        <View style={[styles.categoryBadge, { backgroundColor: `${getCategoryColor(template.category || 'general')}20` }]}>
          <Text style={[styles.categoryBadgeText, { color: getCategoryColor(template.category || 'general') }]}>
            {getCategoryLabel(template.category || 'general')}
          </Text>
        </View>
      </View>

      <Text style={styles.templatePreview} numberOfLines={2}>
        {template.html_content.replace(/<[^>]*>/g, '').substring(0, 100)}...
      </Text>

      {template.variables && template.variables.length > 0 && (
        <View style={styles.variablesRow}>
          <Text style={styles.variablesLabel}>Variables:</Text>
          {template.variables.slice(0, 3).map((variable, index) => (
            <Text key={index} style={styles.variableTag}>
              {`{{${variable}}}`}
            </Text>
          ))}
          {template.variables.length > 3 && (
            <Text style={styles.variableTag}>+{template.variables.length - 3}</Text>
          )}
        </View>
      )}

      <View style={styles.templateFooter}>
        <View style={styles.usageStats}>
          <Text style={styles.usageLabel}>Créé le</Text>
          <Text style={styles.usageValue}>{formatDate(template.created_at)}</Text>
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteTemplate(template.id)}
        >
          <Text style={styles.deleteButtonText}>Supprimer</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderCampaignCard = ({ item: campaign }: { item: EmailCampaign }) => (
    <TouchableOpacity style={styles.campaignCard}>
      <View style={styles.campaignHeader}>
        <Text style={styles.campaignName}>{campaign.name}</Text>
        <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(campaign.status)}20` }]}>
          <Text style={[styles.statusBadgeText, { color: getStatusColor(campaign.status) }]}>
            {getStatusLabel(campaign.status)}
          </Text>
        </View>
      </View>

      <Text style={styles.campaignSubject} numberOfLines={1}>
        {campaign.subject}
      </Text>

      {campaign.template_name && (
        <Text style={styles.campaignTemplate}>Template: {campaign.template_name}</Text>
      )}

      <View style={styles.campaignStats}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{campaign.total_recipients || 0}</Text>
          <Text style={styles.statLabel}>Destinataires</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{campaign.sent_count || 0}</Text>
          <Text style={styles.statLabel}>Envoyés</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{campaign.opened_count || 0}</Text>
          <Text style={styles.statLabel}>Ouverts</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{campaign.open_rate || 0}%</Text>
          <Text style={styles.statLabel}>Taux</Text>
        </View>
      </View>

      <View style={styles.campaignActions}>
        {campaign.status === 'draft' && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleSendCampaign(campaign)}
          >
            <Text style={styles.actionButtonText}>Envoyer</Text>
          </TouchableOpacity>
        )}
        {campaign.status === 'sending' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonDanger]}
            onPress={() => handlePauseCampaign(campaign.id)}
          >
            <Text style={[styles.actionButtonText, styles.actionButtonTextDanger]}>Pause</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.campaignDate}>
          {campaign.sent_at ? `Envoyé le ${formatDate(campaign.sent_at)}` : `Créé le ${formatDate(campaign.created_at)}`}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderLogCard = ({ item: log }: { item: EmailLog }) => (
    <TouchableOpacity style={styles.logCard}>
      <View style={styles.logHeader}>
        <View style={styles.logInfo}>
          <Text style={styles.logRecipient}>
            {log.to_name || log.to_email}
          </Text>
          <Text style={styles.logSubject} numberOfLines={1}>{log.subject}</Text>
          {log.campaign_name && (
            <Text style={styles.logCampaign}>Campagne: {log.campaign_name}</Text>
          )}
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
          <Text style={styles.logStatValue}>{log.open_count}</Text>
        </View>
        <View style={styles.logStatItem}>
          <Text style={styles.logStatIcon}>🖱</Text>
          <Text style={styles.logStatValue}>{log.click_count}</Text>
        </View>
        <View style={styles.logStatItem}>
          <Text style={styles.logStatLabel}>{formatDate(log.sent_at || log.created_at)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderContactItem = ({ item }: { item: Contact }) => {
    const isSelected = campaignForm.selected_contacts.includes(item.id);

    return (
      <TouchableOpacity
        style={[styles.contactItem, isSelected && styles.contactItemSelected]}
        onPress={() => {
          if (isSelected) {
            setCampaignForm({
              ...campaignForm,
              selected_contacts: campaignForm.selected_contacts.filter(id => id !== item.id),
            });
          } else {
            setCampaignForm({
              ...campaignForm,
              selected_contacts: [...campaignForm.selected_contacts, item.id],
            });
          }
        }}
      >
        <View style={styles.contactInfo}>
          <Text style={styles.contactName}>
            {item.first_name} {item.last_name}
          </Text>
          <Text style={styles.contactEmail}>{item.email}</Text>
        </View>
        {isSelected && <Text style={styles.checkmark}>✓</Text>}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📧 Email</Text>
        <Text style={styles.headerSubtitle}>Gérez templates, campagnes et suivi</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {['templates', 'campaigns', 'logs'].map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab as typeof activeTab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'templates' ? '📝 Templates' : tab === 'campaigns' ? '📬 Campagnes' : '📊 Logs'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : (
        <>
          {activeTab === 'templates' && (
            <View style={styles.content}>
              <View style={styles.actionBar}>
                <Text style={styles.contentTitle}>
                  {templates.length} Template{templates.length > 1 ? 's' : ''}
                </Text>
                <TouchableOpacity
                  style={styles.createButton}
                  onPress={() => openTemplateModal()}
                >
                  <Text style={styles.createButtonText}>+ Nouveau</Text>
                </TouchableOpacity>
              </View>

              <FlatList
                data={templates}
                renderItem={renderTemplateCard}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContent}
                refreshControl={
                  <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>Aucun template</Text>
                  </View>
                }
              />
            </View>
          )}

          {activeTab === 'campaigns' && (
            <View style={styles.content}>
              <View style={styles.actionBar}>
                <Text style={styles.contentTitle}>
                  {campaigns.length} Campagne{campaigns.length > 1 ? 's' : ''}
                </Text>
                <TouchableOpacity
                  style={styles.createButton}
                  onPress={openCampaignModal}
                >
                  <Text style={styles.createButtonText}>+ Nouvelle</Text>
                </TouchableOpacity>
              </View>

              <FlatList
                data={campaigns}
                renderItem={renderCampaignCard}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContent}
                refreshControl={
                  <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>Aucune campagne</Text>
                  </View>
                }
              />
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
                    {logs.length > 0 ? ((logs.filter(l => l.status === 'opened' || l.status === 'clicked').length / logs.length) * 100).toFixed(0) : 0}%
                  </Text>
                  <Text style={styles.statBoxLabel}>Taux</Text>
                </View>
              </View>

              <FlatList
                data={logs}
                renderItem={renderLogCard}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContent}
                refreshControl={
                  <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>Aucun log</Text>
                  </View>
                }
              />
            </View>
          )}
        </>
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
                {selectedTemplate ? 'Modifier Template' : 'Nouveau Template'}
              </Text>
              <TouchableOpacity onPress={() => setTemplateModalVisible(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Nom du Template *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Bienvenue Client"
                  value={templateForm.name}
                  onChangeText={(text) => setTemplateForm({ ...templateForm, name: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Sujet *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Bienvenue chez {{company}}"
                  value={templateForm.subject}
                  onChangeText={(text) => setTemplateForm({ ...templateForm, subject: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Catégorie</Text>
                <View style={styles.categorySelect}>
                  {['general', 'welcome', 'quote', 'sales', 'invoice'].map(cat => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.categoryOption,
                        templateForm.category === cat && styles.categoryOptionActive,
                      ]}
                      onPress={() => setTemplateForm({ ...templateForm, category: cat })}
                    >
                      <Text
                        style={[
                          styles.categoryOptionText,
                          templateForm.category === cat && styles.categoryOptionTextActive,
                        ]}
                      >
                        {getCategoryLabel(cat)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Contenu HTML *</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="<p>Bonjour {{first_name}},</p><p>Bienvenue...</p>"
                  multiline
                  numberOfLines={8}
                  value={templateForm.html_content}
                  onChangeText={(text) => setTemplateForm({ ...templateForm, html_content: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Contenu Texte</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Version texte brut (optionnel)"
                  multiline
                  numberOfLines={6}
                  value={templateForm.text_content}
                  onChangeText={(text) => setTemplateForm({ ...templateForm, text_content: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Variables disponibles</Text>
                <Text style={styles.helpText}>
                  Utilisez {`{{first_name}}`}, {`{{last_name}}`}, {`{{email}}`}, etc.
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={() => setTemplateModalVisible(false)}
              >
                <Text style={styles.buttonSecondaryText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.buttonPrimary]}
                onPress={handleCreateTemplate}
                disabled={loading}
              >
                <Text style={styles.buttonPrimaryText}>
                  {loading ? 'Enregistrement...' : 'Enregistrer'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Campaign Modal */}
      <Modal
        visible={campaignModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setCampaignModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nouvelle Campagne</Text>
              <TouchableOpacity onPress={() => setCampaignModalVisible(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Nom de la campagne *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Newsletter Janvier 2025"
                  value={campaignForm.name}
                  onChangeText={(text) => setCampaignForm({ ...campaignForm, name: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Template (optionnel)</Text>
                <ScrollView horizontal style={styles.templateSelect}>
                  {templates.map(template => (
                    <TouchableOpacity
                      key={template.id}
                      style={[
                        styles.templateSelectOption,
                        campaignForm.template_id === template.id && styles.templateSelectOptionActive,
                      ]}
                      onPress={() => {
                        setCampaignForm({
                          ...campaignForm,
                          template_id: template.id,
                          subject: template.subject,
                        });
                      }}
                    >
                      <Text style={styles.templateSelectName}>{template.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Sujet *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Sujet de l'email"
                  value={campaignForm.subject}
                  onChangeText={(text) => setCampaignForm({ ...campaignForm, subject: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>De (Email) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="votre@email.com"
                  value={campaignForm.from_email}
                  onChangeText={(text) => setCampaignForm({ ...campaignForm, from_email: text })}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>De (Nom)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Votre Nom"
                  value={campaignForm.from_name}
                  onChangeText={(text) => setCampaignForm({ ...campaignForm, from_name: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <View style={styles.switchRow}>
                  <Text style={styles.formLabel}>Envoyer immédiatement</Text>
                  <Switch
                    value={campaignForm.immediate}
                    onValueChange={(value) => setCampaignForm({ ...campaignForm, immediate: value })}
                  />
                </View>
              </View>

              {!campaignForm.immediate && (
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Date d'envoi</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="YYYY-MM-DD HH:MM"
                    value={campaignForm.scheduled_at}
                    onChangeText={(text) => setCampaignForm({ ...campaignForm, scheduled_at: text })}
                  />
                </View>
              )}

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>
                  Destinataires * ({campaignForm.selected_contacts.length} sélectionné{campaignForm.selected_contacts.length > 1 ? 's' : ''})
                </Text>
                <View style={styles.contactsList}>
                  <FlatList
                    data={contacts}
                    renderItem={renderContactItem}
                    keyExtractor={item => item.id}
                    style={styles.contactsListInner}
                    nestedScrollEnabled
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={() => setCampaignModalVisible(false)}
              >
                <Text style={styles.buttonSecondaryText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.buttonPrimary]}
                onPress={handleCreateCampaign}
                disabled={loading}
              >
                <Text style={styles.buttonPrimaryText}>
                  {loading ? 'Création...' : campaignForm.immediate ? 'Envoyer' : 'Planifier'}
                </Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  variablesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 8,
    gap: 4,
  },
  variablesLabel: {
    fontSize: 10,
    color: '#8E8E93',
    marginRight: 4,
  },
  variableTag: {
    fontSize: 9,
    color: '#007AFF',
    backgroundColor: '#007AFF20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
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
    alignItems: 'flex-start',
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
  deleteButton: {
    backgroundColor: '#FF3B3020',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  deleteButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FF3B30',
  },
  campaignCard: {
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
  campaignHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  campaignName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000000',
    flex: 1,
    marginRight: 8,
  },
  campaignSubject: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 4,
  },
  campaignTemplate: {
    fontSize: 11,
    color: '#007AFF',
    marginBottom: 8,
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
  campaignStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F2F2F7',
    marginBottom: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    color: '#8E8E93',
  },
  campaignActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#34C759',
    borderRadius: 6,
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
  campaignDate: {
    fontSize: 10,
    color: '#8E8E93',
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
    marginBottom: 2,
  },
  logCampaign: {
    fontSize: 10,
    color: '#007AFF',
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
    maxHeight: '90%',
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
    maxHeight: 500,
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
  helpText: {
    fontSize: 11,
    color: '#8E8E93',
    fontStyle: 'italic',
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
    minHeight: 80,
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
  templateSelect: {
    flexDirection: 'row',
    maxHeight: 80,
  },
  templateSelectOption: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    marginRight: 8,
  },
  templateSelectOptionActive: {
    backgroundColor: '#007AFF',
  },
  templateSelectName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000000',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contactsList: {
    maxHeight: 200,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
  },
  contactsListInner: {
    maxHeight: 200,
  },
  contactItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  contactItemSelected: {
    backgroundColor: '#007AFF10',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  contactEmail: {
    fontSize: 11,
    color: '#8E8E93',
  },
  checkmark: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '700',
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

export default withGlassLayout(EmailsScreen);
