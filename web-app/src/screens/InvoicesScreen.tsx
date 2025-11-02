import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert, Platform, RefreshControl, Image } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { FileTextIcon, DollarIcon, CheckCircleIcon, ClockIcon, AlertTriangleIcon, EditIcon, TrashIcon, MailIcon, PlusIcon, CreditCardIcon, AppleIcon, BankIcon, EyeIcon } from '../components/Icons';
import Navigation from '../components/Navigation';
import DocumentPreview from '../components/DocumentPreview';
import { quoteService, invoicesService, templatesService, contactService, companyService, productService, companyProfileService, paymentsService } from '../services/api';

type InvoicesScreenProps = { navigation: NativeStackNavigationProp<RootStackParamList, 'Invoices'>; };
type TabType = 'quotes' | 'invoices';

export default function InvoicesScreen({ navigation }: InvoicesScreenProps) {
  const [activeTab, setActiveTab] = useState<TabType>('quotes');
  const [quotes, setQuotes] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'apple_pay' | 'google_pay' | 'bank_transfer'>('card');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [hasTemplates, setHasTemplates] = useState(true);
  const [checkingTemplates, setCheckingTemplates] = useState(true);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [newDocument, setNewDocument] = useState({
    customer_name: '',
    customer_email: '',
    customer_address: '',
    items: [{ description: '', quantity: 1, unit_price: 0, product_id: null }],
    notes: '',
  });
  const [showPreview, setShowPreview] = useState(false);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [previewItem, setPreviewItem] = useState<any>(null);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: 'delete-quote' | 'delete-invoice' | 'convert-quote' | 'convert-invoice', id: number } | null>(null);

  useEffect(() => {
    checkTemplates();
    fetchData();
    fetchClientsData();
    fetchProducts();
  }, [activeTab]);

  useEffect(() => {
    // Gérer la navigation depuis d'autres écrans
    const params = (navigation as any).getState()?.routes?.find((r: any) => r.name === 'Invoices')?.params;
    if (params?.action === 'createQuote' && params?.customerId) {
      const customerType = params.customerType || 'contact';
      const customerId = params.customerId;

      // Trouver le client dans la liste
      setTimeout(async () => {
        const clientsList = customerType === 'contact' ? contacts : companies;
        const client = clientsList.find((c: any) => c.id === customerId);

        if (client) {
          handleClientSelect({ ...client, type: customerType });
          setCreateModalVisible(true);
        }
      }, 500);
    }
  }, [navigation, contacts, companies]);

  const checkTemplates = async () => {
    try {
      const res = await templatesService.getAll();
      const templateList = res.data || [];
      setTemplates(templateList);
      setHasTemplates(templateList.length > 0);
      // Set default template as selected
      const defaultTemplate = templateList.find((t: any) => t.is_default);
      setSelectedTemplate(defaultTemplate || templateList[0] || null);
    } catch (error) {
      console.error('Error checking templates:', error);
    } finally {
      setCheckingTemplates(false);
    }
  };

  const fetchQuotes = async () => {
    try {
      const res = await quoteService.getAll();
      setQuotes(res.data || []);
    } catch (error) {
      console.error('Error fetching quotes:', error);
    }
  };

  const fetchInvoices = async () => {
    try {
      const res = await invoicesService.getAll();
      setInvoices(res.data || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    }
  };

  const fetchData = async () => {
    try {
      if (activeTab === 'quotes') {
        await fetchQuotes();
      } else {
        await fetchInvoices();
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchClientsData = async () => {
    try {
      const [contactsRes, companiesRes] = await Promise.all([
        contactService.getAll(),
        companyService.getAll()
      ]);
      setContacts(contactsRes.data || []);
      setCompanies(companiesRes.data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await productService.getAll();
      // Handle nested data structure like in ProductsScreen
      const productData = res.data.data || res.data || [];
      setProducts(Array.isArray(productData) ? productData : []);
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
    }
  };

  const handleClientSelect = (client: any) => {
    console.log('handleClientSelect called with:', client);
    setSelectedClient(client);

    // Fonction pour formater l'adresse (JSONB ou string)
    const formatAddress = (address: any) => {
      if (!address) return '';
      if (typeof address === 'string') return address;
      // Si c'est un objet JSONB, construire l'adresse
      const parts = [];
      if (address.street) parts.push(address.street);
      if (address.city) parts.push(address.city);
      if (address.state) parts.push(address.state);
      if (address.postal_code) parts.push(address.postal_code);
      if (address.country) parts.push(address.country);
      return parts.join(', ');
    };

    if (client.type === 'contact') {
      // Préremplir avec un contact
      const customerData = {
        ...newDocument,
        customer_name: `${client.first_name} ${client.last_name || ''}`.trim(),
        customer_email: client.email || '',
        customer_address: formatAddress(client.address),
      };
      console.log('Setting contact data:', customerData);
      setNewDocument(customerData);
    } else if (client.type === 'company') {
      // Préremplir avec une entreprise
      const customerData = {
        ...newDocument,
        customer_name: client.name || '',
        customer_email: client.email || '',
        customer_address: formatAddress(client.address),
      };
      console.log('Setting company data:', customerData);
      setNewDocument(customerData);
    }
  };

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const handleSendReminder = async (invoiceId: string) => {
    try {
      await invoicesService.sendReminder(invoiceId);
      Platform.OS === 'web' ? alert('Relance envoyée avec succès') : Alert.alert('Succès', 'Relance envoyée');
    } catch (error) {
      console.error('Error sending reminder:', error);
    }
  };

  const handleSendQuote = async (quoteId: string) => {
    try {
      await quoteService.sendEmail(quoteId);
      await fetchQuotes();
      Platform.OS === 'web' ? alert('Devis envoyé avec succès') : Alert.alert('Succès', 'Devis envoyé par email');
    } catch (error) {
      console.error('Error sending quote:', error);
      Platform.OS === 'web' ? alert('Erreur lors de l\'envoi du devis') : Alert.alert('Erreur', 'Impossible d\'envoyer le devis');
    }
  };

  const handlePayment = async () => {
    if (!selectedItem || !paymentAmount) return;
    try {
      // TODO: Implémenter la gestion des paiements
      Platform.OS === 'web' ? alert('Fonctionnalité de paiement à venir') : Alert.alert('Info', 'Fonctionnalité de paiement à venir');
      setPaymentModalVisible(false);
    } catch (error) {
      console.error('Error processing payment:', error);
    }
  };

  const handleCreateDocument = async () => {
    if (!selectedTemplate || !selectedClient) {
      Platform.OS === 'web' ? alert('Veuillez sélectionner un template et un client') : Alert.alert('Erreur', 'Veuillez sélectionner un template et un client');
      return;
    }

    try {
      const total_ht = newDocument.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
      const total_ttc = total_ht * 1.20; // 20% TVA

      // Clean items - remove product_id and add total_price for API
      const cleanedItems = newDocument.items.map(({ product_id, ...item }) => ({
        ...item,
        total_price: item.quantity * item.unit_price
      }));

      const documentData = {
        template_id: selectedTemplate.id,
        title: `${activeTab === 'quotes' ? 'Devis' : 'Facture'} pour ${selectedClient.name || selectedClient.company_name}`,
        customer_name: selectedClient.name || selectedClient.company_name,
        customer_email: newDocument.customer_email || selectedClient.email,
        customer_address: newDocument.customer_address || (selectedClient.address ?
          (typeof selectedClient.address === 'string' ? selectedClient.address :
           `${selectedClient.address.street || ''}, ${selectedClient.address.city || ''}, ${selectedClient.address.state || ''}, ${selectedClient.address.postal_code || ''}, ${selectedClient.address.country || ''}`.replace(/, ,/g, ',').trim())
          : ''),
        items: cleanedItems,
        total_ht,
        total_ttc,
        total_amount: total_ttc,
        notes: newDocument.notes,
        status: 'draft',
      };

      if (activeTab === 'quotes') {
        await quoteService.create(documentData);
        Platform.OS === 'web' ? alert('Devis créé avec succès') : Alert.alert('Succès', 'Devis créé');
      } else {
        await invoicesService.create({
          ...documentData,
          invoice_date: new Date().toISOString().split('T')[0],
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        });
        Platform.OS === 'web' ? alert('Facture créée avec succès') : Alert.alert('Succès', 'Facture créée');
      }

      setCreateModalVisible(false);
      setNewDocument({
        customer_name: '',
        customer_email: '',
        customer_address: '',
        items: [{ description: '', quantity: 1, unit_price: 0, product_id: null }],
        notes: '',
      });
      fetchData();
    } catch (error) {
      console.error('Error creating document:', error);
      Platform.OS === 'web' ? alert('Erreur lors de la création') : Alert.alert('Erreur', 'Erreur lors de la création');
    }
  };

  const addItem = () => {
    if (newDocument.items.length >= 20) {
      Platform.OS === 'web'
        ? alert('Limite atteinte : Maximum 20 articles par document')
        : Alert.alert('Limite atteinte', 'Maximum 20 articles par document');
      return;
    }
    setNewDocument({
      ...newDocument,
      items: [...newDocument.items, { description: '', quantity: 1, unit_price: 0, product_id: null }],
    });
  };

  const removeItem = (index: number) => {
    const items = [...newDocument.items];
    items.splice(index, 1);
    setNewDocument({ ...newDocument, items });
  };

  const updateItem = (index: number, field: string, value: any) => {
    const items = [...newDocument.items];
    items[index] = { ...items[index], [field]: value };
    setNewDocument({ ...newDocument, items });
  };

  const handleProductSelect = (index: number, productId: string) => {
    if (!productId) {
      // Reset si aucun produit sélectionné
      updateItem(index, 'product_id', null);
      return;
    }

    const product = products.find(p => String(p.id) === productId);

    if (product) {
      const items = [...newDocument.items];
      items[index] = {
        ...items[index],
        product_id: product.id,
        description: product.name,
        unit_price: parseFloat(product.price) || 0,
      };
      setNewDocument({ ...newDocument, items });
    }
  };

  const handleDownloadPDF = async () => {
    if (!selectedItem) return;

    try {
      const type = activeTab === 'quotes' ? 'quotes' : 'invoices';
      const id = selectedItem.id;

      // Utiliser le nouvel endpoint qui génère un PDF avec Puppeteer
      // Cet endpoint utilise exactement le même HTML que l'aperçu
      const downloadUrl = `http://localhost:3000/api/${type}/${id}/download`;

      if (Platform.OS === 'web') {
        // Créer un lien invisible pour télécharger le PDF
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `${type === 'quotes' ? 'Devis' : 'Facture'}_${selectedItem.customer_name || 'Document'}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        Alert.alert('Information', 'Téléchargement PDF disponible uniquement sur web');
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      Platform.OS === 'web' ? alert('Erreur lors du téléchargement du PDF') : Alert.alert('Erreur', 'Erreur lors du téléchargement du PDF');
    }
  };

  const handleDeleteQuote = (quoteId: number) => {
    setConfirmAction({ type: 'delete-quote', id: quoteId });
    setConfirmModalVisible(true);
  };

  const handleDeleteInvoice = (invoiceId: number) => {
    setConfirmAction({ type: 'delete-invoice', id: invoiceId });
    setConfirmModalVisible(true);
  };


  const handlePreview = async (item: any, type: 'quote' | 'invoice') => {
    try {
      // Charger les détails complets avec les items
      let fullData;
      if (type === 'quote') {
        const response = await quoteService.getById(item.id.toString());
        fullData = response.data;
      } else {
        const response = await invoicesService.getById(item.id.toString());
        fullData = response.data;
      }

      // Charger les informations bancaires du profil d'entreprise
      let bankInfo = null;
      try {
        const profileResponse = await companyProfileService.get();
        bankInfo = {
          bank_name: profileResponse.data?.bank_name,
          bank_iban: profileResponse.data?.bank_iban,
          bank_bic: profileResponse.data?.bank_bic
        };
      } catch (error) {
        console.log('No bank info available');
      }

      setPreviewItem({ ...fullData, type, bankInfo });
      setPreviewModalVisible(true);
    } catch (error) {
      console.error('Error loading preview:', error);
      Alert.alert('Erreur', 'Impossible de charger l\'aperçu');
    }
  };

  const handleStripePayment = async () => {
    if (!previewItem || previewItem.type !== 'invoice') return;

    try {
      // Create payment intent
      const response = await paymentsService.createStripePaymentIntent({
        invoice_id: previewItem.id,
        amount: parseFloat(previewItem.total_ttc || previewItem.total_amount || 0),
        currency: 'eur',
      });

      // Open Stripe checkout in a new window
      const stripeCheckoutUrl = `https://checkout.stripe.com/pay/${response.data.clientSecret}`;

      Alert.alert(
        'Paiement Stripe',
        'Pour le moment, l\'intégration Stripe complète nécessite une clé publique Stripe configurée. Le Payment Intent a été créé avec succès.',
        [
          {
            text: 'OK',
            onPress: () => {
              console.log('Stripe Payment Intent created:', response.data.paymentIntentId);
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error creating Stripe payment:', error);
      Alert.alert('Erreur', 'Impossible de créer le paiement Stripe');
    }
  };

  const handleApplePayment = async () => {
    if (!previewItem || previewItem.type !== 'invoice') return;

    Alert.alert(
      'Apple Pay',
      'L\'intégration Apple Pay nécessite une configuration spécifique et un certificat Apple Pay. Cette fonctionnalité sera disponible prochainement.',
      [{ text: 'OK' }]
    );
  };

  const executeConfirmAction = async () => {
    if (!confirmAction) return;

    try {
      if (confirmAction.type === 'delete-quote') {
        await quoteService.delete(confirmAction.id);
        await fetchQuotes();
      } else if (confirmAction.type === 'delete-invoice') {
        await invoicesService.delete(confirmAction.id);
        await fetchInvoices();
      }
      setConfirmModalVisible(false);
      setConfirmAction(null);
    } catch (error) {
      console.error('Error executing action:', error);
      setConfirmModalVisible(false);
      setConfirmAction(null);
    }
  };

  const renderQuoteCard = (quote: any) => {
    // Créer un objet template à partir des données du quote
    const template = {
      primary_color: quote.template_primary_color || '#007AFF',
      secondary_color: quote.template_secondary_color,
      template_layout: quote.template_layout || 'professional',
      logo_url: quote.template_logo_url,
      company_name: quote.template_company_name,
      company_address: quote.template_company_address,
      company_phone: quote.template_company_phone,
      company_email: quote.template_company_email,
      company_siret: quote.template_company_siret,
      company_tva: quote.template_company_tva,
      show_logo: quote.template_show_logo !== false,
      show_footer: quote.template_show_footer,
      show_legal_mentions: quote.template_show_legal_mentions,
      invoice_title: 'DEVIS',
      invoice_number_prefix: quote.template_invoice_number_prefix,
      header_background_color: quote.template_header_background_color,
      table_header_color: quote.template_table_header_color,
      border_color: quote.template_border_color,
      footer_text: quote.template_footer_text,
      font_family: quote.template_font_family,
      client_label: quote.template_client_label,
      subtotal_label: quote.template_subtotal_label,
      vat_label: quote.template_vat_label,
      total_label: quote.template_total_label,
      total_color: quote.template_total_color,
      table_header_description: quote.template_table_header_description,
      table_header_quantity: quote.template_table_header_quantity,
      table_header_unit_price: quote.template_table_header_unit_price,
      table_header_total: quote.template_table_header_total,
    };

    return (
      <View key={quote.id} style={styles.documentCard}>
        <TouchableOpacity
          style={styles.documentCardTouchable}
          onPress={() => { setSelectedItem(quote); setDetailModalVisible(true); }}
        >
          <View style={styles.documentCardWrapper}>
            <DocumentPreview
              template={template}
              document={{
                type: 'quote',
                number: quote.quote_number || `DEVIS-${String(quote.id).padStart(6, '0')}`,
                date: new Date(quote.created_at).toLocaleDateString('fr-FR'),
                customer_name: quote.customer_name || 'Client inconnu',
                customer_email: quote.customer_email,
                customer_address: quote.customer_address,
                items: quote.items || [],
                notes: quote.notes,
                total_ht: quote.total_ht,
                total_ttc: quote.total_ttc,
              }}
              compact={true}
            />
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(quote.status) }]}>
              <Text style={styles.statusText}>{getStatusLabel(quote.status)}</Text>
            </View>
          </View>
        </TouchableOpacity>
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.previewButton]}
            onPress={(e) => { e.stopPropagation(); handlePreview(quote, 'quote'); }}
          >
            <EyeIcon size={16} color="#fff" />
            <Text style={styles.actionButtonText}>Voir</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.sendButton]}
            onPress={(e) => { e.stopPropagation(); handleSendQuote(quote.id); }}
          >
            <MailIcon size={16} color="#fff" />
            <Text style={styles.actionButtonText}>Envoyer</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={(e) => { e.stopPropagation(); handleDeleteQuote(quote.id); }}
          >
            <TrashIcon size={16} color="#fff" />
            <Text style={styles.actionButtonText}>Supprimer</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderInvoiceCard = (invoice: any) => {
    // Créer un objet template à partir des données de l'invoice
    const template = {
      primary_color: invoice.template_primary_color || '#007AFF',
      secondary_color: invoice.template_secondary_color,
      template_layout: invoice.template_layout || 'professional',
      logo_url: invoice.template_logo_url,
      company_name: invoice.template_company_name,
      company_address: invoice.template_company_address,
      company_phone: invoice.template_company_phone,
      company_email: invoice.template_company_email,
      company_siret: invoice.template_company_siret,
      company_tva: invoice.template_company_tva,
      show_logo: invoice.template_show_logo !== false,
      show_footer: invoice.template_show_footer,
      show_legal_mentions: invoice.template_show_legal_mentions,
      invoice_title: 'FACTURE',
      invoice_number_prefix: invoice.template_invoice_number_prefix,
      header_background_color: invoice.template_header_background_color,
      table_header_color: invoice.template_table_header_color,
      border_color: invoice.template_border_color,
      footer_text: invoice.template_footer_text,
      font_family: invoice.template_font_family,
      client_label: invoice.template_client_label,
      subtotal_label: invoice.template_subtotal_label,
      vat_label: invoice.template_vat_label,
      total_label: invoice.template_total_label,
      total_color: invoice.template_total_color,
      table_header_description: invoice.template_table_header_description,
      table_header_quantity: invoice.template_table_header_quantity,
      table_header_unit_price: invoice.template_table_header_unit_price,
      table_header_total: invoice.template_table_header_total,
    };

    return (
      <View key={invoice.id} style={styles.documentCard}>
        <TouchableOpacity
          style={styles.documentCardTouchable}
          onPress={() => { setSelectedItem(invoice); setDetailModalVisible(true); }}
        >
          <View style={styles.documentCardWrapper}>
            <DocumentPreview
              template={template}
              document={{
                type: 'invoice',
                number: invoice.invoice_number || `FACT-${String(invoice.id).padStart(6, '0')}`,
                date: new Date(invoice.invoice_date || invoice.created_at).toLocaleDateString('fr-FR'),
                customer_name: invoice.customer_name || 'Client inconnu',
                customer_email: invoice.customer_email,
                customer_address: invoice.customer_address,
                items: invoice.items || [],
                notes: invoice.notes,
                total_ht: invoice.total_ht,
                total_ttc: invoice.total_ttc,
              }}
              compact={true}
            />
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(invoice.status) }]}>
              <Text style={styles.statusText}>{getStatusLabel(invoice.status)}</Text>
            </View>
          </View>
        </TouchableOpacity>
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.previewButton]}
            onPress={(e) => { e.stopPropagation(); handlePreview(invoice, 'invoice'); }}
          >
            <EyeIcon size={16} color="#fff" />
            <Text style={styles.actionButtonText}>Voir</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={(e) => { e.stopPropagation(); handleDeleteInvoice(invoice.id); }}
          >
            <TrashIcon size={16} color="#fff" />
            <Text style={styles.actionButtonText}>Supprimer</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return '#34C759';
      case 'accepted': return '#34C759';
      case 'sent': return '#007AFF';
      case 'overdue': return '#FF3B30';
      case 'rejected': return '#FF3B30';
      case 'draft': return '#8E8E93';
      default: return '#8E8E93';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid': return 'Payé';
      case 'sent': return 'Envoyé';
      case 'overdue': return 'En retard';
      case 'draft': return 'Brouillon';
      case 'accepted': return 'Accepté';
      case 'rejected': return 'Refusé';
      default: return status;
    }
  };

  const filteredQuotes = quotes.filter(q => q.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) || q.quote_number?.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredInvoices = invoices.filter(i => i.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) || i.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase()));

  // Show onboarding if no templates exist
  if (!checkingTemplates && !hasTemplates) {
    return (
      <View style={styles.container}>
        <Navigation />
        <View style={styles.onboardingContainer}>
          <View style={styles.onboardingIconContainer}>
            <FileTextIcon size={80} color="#007AFF" />
          </View>
          <Text style={styles.onboardingTitle}>Créez votre premier template</Text>
          <Text style={styles.onboardingDescription}>
            Avant de créer des devis et factures, vous devez configurer un template.
            Les templates définissent l'apparence de vos documents avec votre logo, vos couleurs et vos informations d'entreprise.
          </Text>
          <TouchableOpacity
            style={styles.onboardingButton}
            onPress={() => navigation.navigate('Templates')}
          >
            <FileTextIcon size={24} color="#FFFFFF" />
            <Text style={styles.onboardingButtonText}>Créer mon premier template</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Navigation />
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Facturation</Text>
          <Text style={styles.headerSubtitle}>
            {activeTab === 'quotes' ? `${quotes.length} devis` : `${invoices.length} factures`}
          </Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={() => setCreateModalVisible(true)}>
          <Text style={styles.addButtonText}>+ Nouveau</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabsContainer}>
        <TouchableOpacity style={[styles.tab, activeTab === 'quotes' && styles.tabActive]} onPress={() => setActiveTab('quotes')}>
          <FileTextIcon size={18} color={activeTab === 'quotes' ? '#007AFF' : '#8E8E93'} />
          <Text style={[styles.tabText, activeTab === 'quotes' && styles.tabTextActive]}>Devis ({quotes.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'invoices' && styles.tabActive]} onPress={() => setActiveTab('invoices')}>
          <DollarIcon size={18} color={activeTab === 'invoices' ? '#007AFF' : '#8E8E93'} />
          <Text style={[styles.tabText, activeTab === 'invoices' && styles.tabTextActive]}>Factures ({invoices.length})</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <TextInput style={styles.searchInput} placeholder={activeTab === 'quotes' ? 'Rechercher un devis...' : 'Rechercher une facture...'} placeholderTextColor="#8E8E93" value={searchQuery} onChangeText={setSearchQuery} />
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {activeTab === 'quotes' ? (
          filteredQuotes.length > 0 ? filteredQuotes.map(renderQuoteCard) : <View style={styles.emptyState}><FileTextIcon size={64} color="#D1D1D6" /><Text style={styles.emptyText}>Aucun devis</Text></View>
        ) : (
          filteredInvoices.length > 0 ? filteredInvoices.map(renderInvoiceCard) : <View style={styles.emptyState}><DollarIcon size={64} color="#D1D1D6" /><Text style={styles.emptyText}>Aucune facture</Text></View>
        )}
      </ScrollView>

      {/* Detail Modal */}
      <Modal visible={detailModalVisible} animationType="slide" transparent onRequestClose={() => setDetailModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedItem && (
              <>
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalTitle}>{activeTab === 'quotes' ? (selectedItem.quote_number || 'Devis') : (selectedItem.invoice_number || 'Facture')}</Text>
                    <TouchableOpacity onPress={() => {
                      if (selectedItem.customer_id) {
                        setDetailModalVisible(false);
                        navigation.navigate('Contacts', { customerId: selectedItem.customer_id });
                      }
                    }}>
                      <Text style={styles.modalSubtitle}>
                        {selectedItem.customer_name || 'Client'}
                        {selectedItem.company ? ` - ${selectedItem.company}` : ''} →
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                    <Text style={styles.closeButton}>✕</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.modalBody}>
                  {/* Logo du client ou de l'entreprise si disponible */}
                  {(selectedItem.customer_logo_url || selectedItem.template_logo_url || selectedItem.logo_url) && (
                    <View style={{ alignItems: 'center', marginBottom: 20 }}>
                      <Image
                        source={{ uri: selectedItem.customer_logo_url || selectedItem.template_logo_url || selectedItem.logo_url }}
                        style={{ width: 120, height: 60, resizeMode: 'contain' }}
                      />
                      <Text style={{ fontSize: 10, color: '#8E8E93', marginTop: 5 }}>
                        {selectedItem.customer_logo_url ? 'Logo du client' : 'Logo de votre entreprise'}
                      </Text>
                    </View>
                  )}

                  <View style={styles.modalSection}>
                    <Text style={styles.sectionTitle}>DÉTAILS</Text>
                    {activeTab === 'quotes' ? (
                      <>
                        <View style={styles.infoRow}><Text style={styles.infoLabel}>Montant HT</Text><Text style={styles.infoValue}>{parseFloat(selectedItem.subtotal || 0).toFixed(2)} €</Text></View>
                        <View style={styles.infoRow}><Text style={styles.infoLabel}>TVA ({(parseFloat(selectedItem.tax_rate || 0) * 100).toFixed(0)}%)</Text><Text style={styles.infoValue}>{parseFloat(selectedItem.tax_amount || 0).toFixed(2)} €</Text></View>
                        <View style={styles.infoRow}><Text style={styles.infoLabel}>Total TTC</Text><Text style={[styles.infoValue, { fontWeight: 'bold', fontSize: 18 }]}>{parseFloat(selectedItem.total_amount || 0).toFixed(2)} €</Text></View>
                      </>
                    ) : (
                      <>
                        <View style={styles.infoRow}><Text style={styles.infoLabel}>Montant HT</Text><Text style={styles.infoValue}>{parseFloat(selectedItem.total_ht || selectedItem.subtotal || 0).toFixed(2)} €</Text></View>
                        <View style={styles.infoRow}><Text style={styles.infoLabel}>TVA</Text><Text style={styles.infoValue}>{(parseFloat(selectedItem.total_ttc || selectedItem.total_amount || 0) - parseFloat(selectedItem.total_ht || selectedItem.subtotal || 0)).toFixed(2)} €</Text></View>
                        <View style={styles.infoRow}><Text style={styles.infoLabel}>Total TTC</Text><Text style={[styles.infoValue, { fontWeight: 'bold', fontSize: 18 }]}>{parseFloat(selectedItem.total_ttc || selectedItem.total_amount || 0).toFixed(2)} €</Text></View>
                      </>
                    )}
                    {selectedItem.title && (
                      <View style={[styles.infoRow, { marginTop: 15, borderTopWidth: 1, borderTopColor: '#E5E5EA', paddingTop: 15 }]}>
                        <Text style={styles.infoLabel}>Description</Text>
                        <Text style={[styles.infoValue, { flex: 1, textAlign: 'right' }]}>{selectedItem.title}</Text>
                      </View>
                    )}
                  </View>
                </ScrollView>
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.actionButtonSecondary}
                    onPress={() => setDetailModalVisible(false)}
                  >
                    <Text style={styles.actionButtonSecondaryText}>
                      {activeTab === 'quotes' ? 'Fermer le devis' : 'Fermer la facture'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.actionButtonPDF} onPress={handleDownloadPDF}>
                    <FileTextIcon size={16} color="#FFFFFF" />
                    <Text style={styles.actionButtonPrimaryText}>PDF</Text>
                  </TouchableOpacity>
                  {activeTab === 'quotes' ? (
                    <>
                      <TouchableOpacity style={styles.actionButtonPrimary} onPress={() => handleSendQuote(selectedItem.id)}>
                        <MailIcon size={16} color="#FFFFFF" />
                        <Text style={styles.actionButtonPrimaryText}>Envoyer</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.actionButtonPrimary} onPress={() => { setPaymentModalVisible(true); setPaymentAmount((selectedItem.total_amount || selectedItem.total_ttc || 0).toString()); }}>
                        <DollarIcon size={16} color="#FFFFFF" />
                        <Text style={styles.actionButtonPrimaryText}>Payer</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <TouchableOpacity style={styles.actionButtonSecondary} onPress={() => handleSendReminder(selectedItem.id)}>
                        <MailIcon size={16} color="#007AFF" />
                        <Text style={styles.actionButtonSecondaryText}>Relancer</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.actionButtonPrimary} onPress={() => { setPaymentModalVisible(true); setPaymentAmount((selectedItem.total_ttc || selectedItem.total_amount || 0).toString()); }}>
                        <DollarIcon size={16} color="#FFFFFF" />
                        <Text style={styles.actionButtonPrimaryText}>Payer</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Payment Modal */}
      <Modal visible={paymentModalVisible} animationType="slide" transparent onRequestClose={() => setPaymentModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Paiement</Text>
              <TouchableOpacity onPress={() => setPaymentModalVisible(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Montant</Text>
                <TextInput style={styles.input} placeholder="0.00" value={paymentAmount} onChangeText={setPaymentAmount} keyboardType="decimal-pad" placeholderTextColor="#8E8E93" />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Méthode de paiement</Text>
                <View style={styles.paymentMethods}>
                  {[
                    { id: 'card', label: '💳 Carte bancaire', value: 'card' },
                    { id: 'apple_pay', label: ' Apple Pay', value: 'apple_pay' },
                    { id: 'google_pay', label: 'G Google Pay', value: 'google_pay' },
                    { id: 'bank_transfer', label: '🏦 Virement bancaire', value: 'bank_transfer' },
                  ].map((method) => (
                    <TouchableOpacity key={method.id} style={[styles.paymentMethod, paymentMethod === method.value && styles.paymentMethodActive]} onPress={() => setPaymentMethod(method.value as any)}>
                      <Text style={[styles.paymentMethodText, paymentMethod === method.value && styles.paymentMethodTextActive]}>{method.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.buttonSecondary} onPress={() => setPaymentModalVisible(false)}>
                <Text style={styles.buttonSecondaryText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.buttonPrimary} onPress={handlePayment}>
                <Text style={styles.buttonPrimaryText}>Confirmer le paiement</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Create Document Modal */}
      <Modal visible={createModalVisible} animationType="slide" transparent onRequestClose={() => setCreateModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, Platform.OS === 'web' && styles.modalContentWide]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nouveau {activeTab === 'quotes' ? 'devis' : 'facture'}</Text>
              <View style={styles.headerActions}>
                <TouchableOpacity
                  style={styles.previewToggle}
                  onPress={() => setShowPreview(!showPreview)}
                >
                  <FileTextIcon size={18} color="#007AFF" />
                  <Text style={styles.previewToggleText}>
                    {showPreview ? 'Masquer' : 'Aperçu'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                  <Text style={styles.closeButton}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={[styles.modalBodyContainer, Platform.OS === 'web' && showPreview && styles.modalBodySplit]}>
              <ScrollView style={[styles.modalBody, Platform.OS === 'web' && showPreview && styles.modalBodyHalf]}>
              {/* Template Selection */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Template</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.templateScroll}>
                  {templates.map((template) => (
                    <TouchableOpacity
                      key={template.id}
                      style={[
                        styles.templateCard,
                        selectedTemplate?.id === template.id && styles.templateCardActive
                      ]}
                      onPress={() => setSelectedTemplate(template)}
                    >
                      <View style={[styles.templatePreview, { borderColor: template.primary_color }]}>
                        <View style={[styles.templateColorBar, { backgroundColor: template.primary_color }]} />
                        <Text style={styles.templateName}>{template.name}</Text>
                        {template.is_default && (
                          <View style={styles.defaultBadge}>
                            <Text style={styles.defaultBadgeText}>Par défaut</Text>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Customer Info */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>🔍 Sélectionner un client existant</Text>
                {Platform.OS === 'web' ? (
                  <View style={styles.clientSelectorWrapper}>
                    <select
                      style={{
                        border: '2px solid #E5E5EA',
                        borderRadius: 10,
                        padding: '12px 16px',
                        fontSize: 15,
                        color: '#000000',
                        backgroundColor: '#FFFFFF',
                        width: '100%',
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        outline: 'none',
                      }}
                      onChange={(e) => {
                        const value = e.target.value;
                        console.log('Selected value:', value);
                        if (value) {
                          const [type, ...idParts] = value.split('-');
                          const id = idParts.join('-'); // Rejoindre au cas où l'ID contient des tirets
                          console.log('Type:', type, 'ID:', id);

                          let client;
                          if (type === 'contact') {
                            client = contacts.find(c => String(c.id) === id);
                            console.log('Found contact:', client);
                          } else {
                            client = companies.find(c => String(c.id) === id);
                            console.log('Found company:', client);
                          }

                          if (client) {
                            console.log('Selecting client:', client);
                            handleClientSelect({ ...client, type });
                          } else {
                            console.log('Client not found');
                          }
                        } else {
                          setSelectedClient(null);
                          setNewDocument({
                            ...newDocument,
                            customer_name: '',
                            customer_email: '',
                            customer_address: '',
                          });
                        }
                      }}
                      value={selectedClient ? `${selectedClient.type}-${selectedClient.id}` : ''}
                      onFocus={(e) => e.target.style.borderColor = '#007AFF'}
                      onBlur={(e) => e.target.style.borderColor = '#E5E5EA'}
                    >
                      <option value="" style={{ padding: '8px' }}>-- Choisir un client --</option>
                      {contacts.length > 0 && (
                        <optgroup label="👤 CONTACTS" style={{ fontWeight: '700', fontSize: '13px', color: '#666', padding: '8px 0' }}>
                          {contacts.map((contact) => (
                            <option
                              key={`contact-${contact.id}`}
                              value={`contact-${contact.id}`}
                              style={{ padding: '8px 12px', fontSize: '15px' }}
                            >
                              {contact.first_name} {contact.last_name || ''} {contact.email ? `• ${contact.email}` : ''}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      {companies.length > 0 && (
                        <optgroup label="🏢 ENTREPRISES" style={{ fontWeight: '700', fontSize: '13px', color: '#666', padding: '8px 0' }}>
                          {companies.map((company) => (
                            <option
                              key={`company-${company.id}`}
                              value={`company-${company.id}`}
                              style={{ padding: '8px 12px', fontSize: '15px' }}
                            >
                              {company.name} {company.email ? `• ${company.email}` : ''}
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                    {selectedClient && (
                      <View style={styles.selectedClientBadge}>
                        <Text style={styles.selectedClientBadgeText}>
                          ✓ {selectedClient.type === 'contact'
                            ? `${selectedClient.first_name} ${selectedClient.last_name || ''}`
                            : selectedClient.name}
                        </Text>
                        <TouchableOpacity
                          onPress={() => {
                            setSelectedClient(null);
                            setNewDocument({
                              ...newDocument,
                              customer_name: '',
                              customer_email: '',
                              customer_address: '',
                            });
                          }}
                          style={styles.clearClientButton}
                        >
                          <Text style={styles.clearClientButtonText}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ) : (
                  <Text style={styles.input}>Sélection non disponible sur mobile</Text>
                )}
              </View>

              <View style={styles.dividerWithText}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OU SAISIR MANUELLEMENT</Text>
                <View style={styles.dividerLine} />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Nom du client *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nom du client"
                  value={newDocument.customer_name}
                  onChangeText={(text) => setNewDocument({ ...newDocument, customer_name: text })}
                  placeholderTextColor="#8E8E93"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="client@example.com"
                  value={newDocument.customer_email}
                  onChangeText={(text) => setNewDocument({ ...newDocument, customer_email: text })}
                  keyboardType="email-address"
                  placeholderTextColor="#8E8E93"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Adresse</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Adresse du client"
                  value={newDocument.customer_address}
                  onChangeText={(text) => setNewDocument({ ...newDocument, customer_address: text })}
                  multiline
                  numberOfLines={3}
                  placeholderTextColor="#8E8E93"
                />
              </View>

              {/* Items */}
              <View style={styles.formGroup}>
                <View style={styles.formLabelRow}>
                  <Text style={styles.formLabel}>Articles / Services ({newDocument.items.length}/20)</Text>
                  <TouchableOpacity
                    onPress={addItem}
                    style={[
                      styles.addItemButton,
                      newDocument.items.length >= 20 && styles.addItemButtonDisabled
                    ]}
                    disabled={newDocument.items.length >= 20}
                  >
                    <PlusIcon size={16} color={newDocument.items.length >= 20 ? "#999" : "#007AFF"} />
                    <Text style={[
                      styles.addItemButtonText,
                      newDocument.items.length >= 20 && styles.addItemButtonTextDisabled
                    ]}>
                      Ajouter
                    </Text>
                  </TouchableOpacity>
                </View>

                {newDocument.items.map((item, index) => (
                  <View key={index} style={styles.itemRow}>
                    <View style={styles.itemHeader}>
                      <Text style={styles.itemNumber}>Article {index + 1}</Text>
                      {newDocument.items.length > 1 && (
                        <TouchableOpacity onPress={() => removeItem(index)}>
                          <TrashIcon size={18} color="#FF3B30" />
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Product Selector */}
                    {Platform.OS === 'web' ? (
                      <View style={styles.formGroup}>
                        <Text style={styles.miniLabel}>Sélectionner un produit ({products.length} disponible{products.length > 1 ? 's' : ''})</Text>
                        <select
                          style={{
                            border: '2px solid #E5E5EA',
                            borderRadius: 8,
                            padding: '12px 16px',
                            fontSize: 15,
                            color: '#000000',
                            backgroundColor: '#FFFFFF',
                            width: '100%',
                            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                            cursor: 'pointer',
                            marginBottom: 12,
                          }}
                          onChange={(e) => handleProductSelect(index, e.target.value)}
                          value={item.product_id || ''}
                          onFocus={(e) => e.target.style.borderColor = '#007AFF'}
                          onBlur={(e) => e.target.style.borderColor = '#E5E5EA'}
                        >
                          <option value="">-- Saisie manuelle --</option>
                          {Array.isArray(products) && products.length > 0 ? (
                            products.map((product) => (
                              <option key={product.id} value={product.id}>
                                {product.name} - {parseFloat(product.price || 0).toFixed(2)} €
                              </option>
                            ))
                          ) : (
                            <option disabled>Aucun produit disponible</option>
                          )}
                        </select>
                      </View>
                    ) : (
                      <Text style={[styles.miniLabel, { marginBottom: 8 }]}>Sélection de produit non disponible sur mobile</Text>
                    )}

                    <TextInput
                      style={styles.input}
                      placeholder="Description"
                      value={item.description}
                      onChangeText={(text) => updateItem(index, 'description', text)}
                      placeholderTextColor="#8E8E93"
                    />

                    <View style={styles.itemRowInputs}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.miniLabel}>Quantité</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="1"
                          value={String(item.quantity)}
                          onChangeText={(text) => updateItem(index, 'quantity', parseFloat(text) || 0)}
                          keyboardType="numeric"
                          placeholderTextColor="#8E8E93"
                        />
                      </View>
                      <View style={{ flex: 1, marginLeft: 8 }}>
                        <Text style={styles.miniLabel}>Prix unitaire (€)</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="0.00"
                          value={String(item.unit_price)}
                          onChangeText={(text) => updateItem(index, 'unit_price', parseFloat(text) || 0)}
                          keyboardType="decimal-pad"
                          placeholderTextColor="#8E8E93"
                        />
                      </View>
                      <View style={styles.itemTotal}>
                        <Text style={styles.miniLabel}>Total</Text>
                        <Text style={styles.itemTotalText}>{(item.quantity * item.unit_price).toFixed(2)} €</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>

              {/* Notes */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Notes</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Notes additionnelles..."
                  value={newDocument.notes}
                  onChangeText={(text) => setNewDocument({ ...newDocument, notes: text })}
                  multiline
                  numberOfLines={3}
                  placeholderTextColor="#8E8E93"
                />
              </View>

              {/* Total Summary */}
              <View style={styles.totalSummary}>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total HT</Text>
                  <Text style={styles.totalValue}>
                    {newDocument.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0).toFixed(2)} €
                  </Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>TVA (20%)</Text>
                  <Text style={styles.totalValue}>
                    {(newDocument.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0) * 0.20).toFixed(2)} €
                  </Text>
                </View>
                <View style={[styles.totalRow, styles.totalRowFinal]}>
                  <Text style={styles.totalLabelFinal}>Total TTC</Text>
                  <Text style={styles.totalValueFinal}>
                    {(newDocument.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0) * 1.20).toFixed(2)} €
                  </Text>
                </View>
              </View>
            </ScrollView>

            {/* Preview Panel - Interactive with real-time updates */}
            {showPreview && selectedTemplate && selectedTemplate.primary_color && (
              <ScrollView style={[styles.previewPanel, Platform.OS === 'web' && styles.previewPanelHalf]}>
                <View style={styles.previewContent}>
                  <Text style={styles.previewTitle}>Aperçu en temps réel</Text>

                  {/* Live Interactive Preview */}
                  <View style={[styles.liveInvoicePreview, { borderColor: selectedTemplate.border_color || '#E5E7EB' }]}>
                    {/* Barre décorative */}
                    <View style={[styles.decorativeSidebar, { backgroundColor: selectedTemplate.primary_color }]} />

                    {/* Header */}
                    <View style={[styles.liveInvoiceHeader, { backgroundColor: selectedTemplate.header_background_color || '#F3F4F6' }]}>
                      <View style={styles.liveInvoiceHeaderLeft}>
                        <Text style={[styles.liveInvoiceTitle, { color: selectedTemplate.primary_color }]}>
                          {activeTab === 'quotes' ? 'DEVIS' : 'FACTURE'}
                        </Text>
                        <Text style={[styles.liveInvoiceNumber, { color: selectedTemplate.text_color || '#1F2937' }]}>
                          N° {activeTab === 'quotes' ? 'DEVIS-2025-001' : 'FACT-2025-001'}
                        </Text>
                        <Text style={[styles.liveInvoiceDate, { color: selectedTemplate.secondary_text_color || '#6B7280' }]}>
                          Date: {new Date().toLocaleDateString('fr-FR')}
                        </Text>
                      </View>
                      {selectedTemplate.show_logo && selectedTemplate.logo_url && (
                        <Image
                          source={{ uri: selectedTemplate.logo_url.startsWith('http') ? selectedTemplate.logo_url : `http://localhost:3000${selectedTemplate.logo_url}` }}
                          style={styles.liveLogoImage}
                        />
                      )}
                    </View>

                    {/* Company & Client Info */}
                    <View style={styles.liveInfoSection}>
                      {/* Company Info */}
                      <View style={styles.liveCompanyInfo}>
                        <Text style={[styles.liveCompanyName, { color: selectedTemplate.text_color || '#1F2937' }]}>
                          {selectedTemplate.company_name || 'Votre entreprise'}
                        </Text>
                        {selectedTemplate.company_address && (
                          <Text style={[styles.liveCompanyDetail, { color: selectedTemplate.secondary_text_color || '#6B7280' }]}>
                            {selectedTemplate.company_address}
                          </Text>
                        )}
                        {selectedTemplate.company_email && (
                          <Text style={[styles.liveCompanyDetail, { color: selectedTemplate.secondary_text_color || '#6B7280' }]}>
                            {selectedTemplate.company_email}
                          </Text>
                        )}
                      </View>

                      {/* Client Info - REAL-TIME UPDATE */}
                      <View style={styles.liveClientInfo}>
                        <View style={styles.liveClientHeader}>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.liveClientLabel, { color: selectedTemplate.primary_color }]}>
                              CLIENT
                            </Text>
                            <Text style={[styles.liveClientName, { color: selectedTemplate.text_color || '#1F2937' }]}>
                              {newDocument.customer_name || '[ Nom du client ]'}
                            </Text>
                            {newDocument.customer_email && (
                              <Text style={[styles.liveClientDetail, { color: selectedTemplate.secondary_text_color || '#6B7280' }]}>
                                {newDocument.customer_email}
                              </Text>
                            )}
                            {newDocument.customer_address && (
                              <Text style={[styles.liveClientDetail, { color: selectedTemplate.secondary_text_color || '#6B7280' }]}>
                                {newDocument.customer_address}
                              </Text>
                            )}
                          </View>
                          {/* Client Logo - Show if available */}
                          {selectedClient && (selectedClient.logo_url || selectedClient.logo) && (
                            <View style={styles.clientLogoContainer}>
                              <Image
                                source={{
                                  uri: (selectedClient.logo_url || selectedClient.logo)?.startsWith('http')
                                    ? (selectedClient.logo_url || selectedClient.logo)
                                    : `http://localhost:3000${selectedClient.logo_url || selectedClient.logo}`
                                }}
                                style={styles.clientLogoImage}
                              />
                            </View>
                          )}
                        </View>
                      </View>
                    </View>

                    {/* Items Table */}
                    <View style={styles.liveTable}>
                      <View style={[styles.liveTableHeader, { backgroundColor: selectedTemplate.table_header_color || selectedTemplate.primary_color }]}>
                        <Text style={[styles.liveTableHeaderText, { flex: 2 }]}>Description</Text>
                        <Text style={[styles.liveTableHeaderText, { flex: 1, textAlign: 'center' }]}>Qté</Text>
                        <Text style={[styles.liveTableHeaderText, { flex: 1, textAlign: 'right' }]}>Prix U.</Text>
                        <Text style={[styles.liveTableHeaderText, { flex: 1, textAlign: 'right' }]}>Total</Text>
                      </View>
                      {newDocument.items.length > 0 ? (
                        newDocument.items.map((item, index) => (
                          <View key={index} style={styles.liveTableRow}>
                            <Text style={[styles.liveTableCell, { flex: 2, color: selectedTemplate.text_color || '#1F2937' }]}>
                              {item.description || `[ Article ${index + 1} ]`}
                            </Text>
                            <Text style={[styles.liveTableCell, { flex: 1, textAlign: 'center', color: selectedTemplate.text_color || '#1F2937' }]}>
                              {item.quantity}
                            </Text>
                            <Text style={[styles.liveTableCell, { flex: 1, textAlign: 'right', color: selectedTemplate.text_color || '#1F2937' }]}>
                              {item.unit_price.toFixed(2)} €
                            </Text>
                            <Text style={[styles.liveTableCell, { flex: 1, textAlign: 'right', fontWeight: '600', color: selectedTemplate.text_color || '#1F2937' }]}>
                              {(item.quantity * item.unit_price).toFixed(2)} €
                            </Text>
                          </View>
                        ))
                      ) : (
                        <View style={styles.liveTableRow}>
                          <Text style={[styles.liveTableCell, { flex: 1, textAlign: 'center', color: selectedTemplate.secondary_text_color || '#6B7280', fontStyle: 'italic' }]}>
                            Aucun article ajouté
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Totals */}
                    <View style={styles.liveTotalsSection}>
                      <View style={styles.liveTotalRow}>
                        <Text style={[styles.liveTotalLabel, { color: selectedTemplate.secondary_text_color || '#6B7280' }]}>
                          Total HT:
                        </Text>
                        <Text style={[styles.liveTotalValue, { color: selectedTemplate.text_color || '#1F2937' }]}>
                          {newDocument.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0).toFixed(2)} €
                        </Text>
                      </View>
                      <View style={styles.liveTotalRow}>
                        <Text style={[styles.liveTotalLabel, { color: selectedTemplate.secondary_text_color || '#6B7280' }]}>
                          TVA (20%):
                        </Text>
                        <Text style={[styles.liveTotalValue, { color: selectedTemplate.text_color || '#1F2937' }]}>
                          {(newDocument.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0) * 0.20).toFixed(2)} €
                        </Text>
                      </View>
                      <View style={[styles.liveTotalRow, styles.liveTotalRowFinal]}>
                        <Text style={[styles.liveTotalLabelFinal, { color: selectedTemplate.text_color || '#1F2937' }]}>
                          Total TTC:
                        </Text>
                        <Text style={[styles.liveTotalValueFinal, { color: selectedTemplate.total_color || selectedTemplate.primary_color }]}>
                          {(newDocument.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0) * 1.20).toFixed(2)} €
                        </Text>
                      </View>
                    </View>

                    {/* Notes */}
                    {newDocument.notes && (
                      <View style={styles.liveNotesSection}>
                        <Text style={[styles.liveNotesLabel, { color: selectedTemplate.secondary_text_color || '#6B7280' }]}>
                          Notes:
                        </Text>
                        <Text style={[styles.liveNotesText, { color: selectedTemplate.text_color || '#1F2937' }]}>
                          {newDocument.notes}
                        </Text>
                      </View>
                    )}

                    {/* Payment Section - Only for QUOTES */}
                    {activeTab === 'quotes' && (
                      <View style={styles.livePaymentSection}>
                        <Text style={[styles.livePaymentTitle, { color: selectedTemplate.primary_color }]}>
                          Payer ici
                        </Text>
                        <View style={styles.paymentMethodsGrid}>
                          <TouchableOpacity style={styles.paymentMethodBadge}>
                            <View style={styles.paymentIconContainer}>
                              <CreditCardIcon size={32} color="#4B5563" />
                            </View>
                            <Text style={styles.paymentMethodText}>Carte bancaire</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={[styles.paymentMethodBadge, styles.applePayBadge]}>
                            <View style={styles.paymentIconContainer}>
                              <AppleIcon size={32} color="#FFFFFF" />
                            </View>
                            <Text style={styles.applePayText}>Apple Pay</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.paymentMethodBadge}>
                            <View style={styles.paymentIconContainer}>
                              <BankIcon size={32} color="#4B5563" />
                            </View>
                            <Text style={styles.paymentMethodText}>Virement</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}

                    {/* Footer */}
                    {selectedTemplate.show_footer && selectedTemplate.footer_text && (
                      <View style={[styles.liveFooter, { backgroundColor: selectedTemplate.header_background_color || '#F3F4F6' }]}>
                        <Text style={[styles.liveFooterText, { color: selectedTemplate.secondary_text_color || '#6B7280' }]}>
                          {selectedTemplate.footer_text}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </ScrollView>
            )}
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.buttonSecondary} onPress={() => setCreateModalVisible(false)}>
                <Text style={styles.buttonSecondaryText}>Annuler</Text>
              </TouchableOpacity>
              {showPreview && selectedTemplate && (
                <TouchableOpacity
                  style={styles.buttonDownload}
                  onPress={async () => {
                    try {
                      // Préparer les données pour le PDF
                      const pdfData = {
                        template: selectedTemplate,
                        document: {
                          type: activeTab === 'quotes' ? 'quote' : 'invoice',
                          invoice_number: activeTab === 'quotes' ? 'DEVIS-2024-001' : 'FACT-2024-001',
                          invoice_date: new Date().toISOString(),
                          customer_name: newDocument.customer_name,
                          customer_email: newDocument.customer_email,
                          customer_address: newDocument.customer_address,
                        },
                        items: newDocument.items,
                      };

                      // Envoyer la requête POST pour générer le PDF
                      const response = await fetch('http://localhost:3000/api/download-pdf', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(pdfData),
                      });

                      if (!response.ok) {
                        throw new Error('Erreur lors de la génération du PDF');
                      }

                      // Télécharger le PDF
                      if (Platform.OS === 'web') {
                        const blob = await response.blob();
                        const url = URL.createObjectURL(blob);

                        // Créer un lien invisible pour forcer le téléchargement
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `${activeTab === 'quotes' ? 'Devis' : 'Facture'}_${newDocument.customer_name || 'Document'}.pdf`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);

                        // Libérer l'URL après un délai
                        setTimeout(() => URL.revokeObjectURL(url), 100);
                      } else {
                        Alert.alert('Information', 'Téléchargement PDF disponible uniquement sur web');
                      }
                    } catch (error) {
                      console.error('Error generating PDF:', error);
                      Platform.OS === 'web' ? alert('Erreur lors de la génération du PDF') : Alert.alert('Erreur', 'Erreur lors de la génération du PDF');
                    }
                  }}
                >
                  <FileTextIcon size={16} color="#FFFFFF" />
                  <Text style={styles.buttonPrimaryText}>Télécharger PDF</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.buttonPrimary} onPress={handleCreateDocument}>
                <Text style={styles.buttonPrimaryText}>Créer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Confirmation Modal */}
      <Modal visible={confirmModalVisible} animationType="fade" transparent onRequestClose={() => setConfirmModalVisible(false)}>
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmModal}>
            <Text style={styles.confirmTitle}>
              {confirmAction?.type === 'delete-quote' && 'Supprimer le devis'}
              {confirmAction?.type === 'delete-invoice' && 'Supprimer la facture'}
            </Text>
            <Text style={styles.confirmMessage}>
              {confirmAction?.type === 'delete-quote' && 'Êtes-vous sûr de vouloir supprimer ce devis ? Cette action est irréversible.'}
              {confirmAction?.type === 'delete-invoice' && 'Êtes-vous sûr de vouloir supprimer cette facture ? Cette action est irréversible.'}
            </Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={[styles.confirmButton, styles.confirmButtonCancel]}
                onPress={() => { setConfirmModalVisible(false); setConfirmAction(null); }}
              >
                <Text style={styles.confirmButtonTextCancel}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, styles.confirmButtonConfirm]}
                onPress={executeConfirmAction}
              >
                <Text style={styles.confirmButtonTextConfirm}>Supprimer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Preview Modal */}
      <Modal visible={previewModalVisible} animationType="slide" transparent onRequestClose={() => setPreviewModalVisible(false)}>
        <View style={styles.previewOverlay}>
          <View style={styles.previewModal}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewTitle}>
                {previewItem?.type === 'quote' ? 'Aperçu du devis' : 'Aperçu de la facture'}
              </Text>
              <TouchableOpacity onPress={() => setPreviewModalVisible(false)} style={styles.closeButtonContainer}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            {previewItem && (
              <View style={styles.iframeContainer}>
                <iframe
                  src={`http://localhost:3000/api/${previewItem.type === 'quote' ? 'quotes' : 'invoices'}/${previewItem.id}/pdf`}
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    backgroundColor: '#525659',
                  }}
                  title={previewItem.type === 'quote' ? 'Aperçu du devis' : 'Aperçu de la facture'}
                />
              </View>
            )}

            {/* Payment Section - Only for invoices */}
            {previewItem?.type === 'invoice' && (
              <View style={styles.paymentSection}>
                <Text style={styles.paymentSectionTitle}>Payer cette facture</Text>

                {/* Bank Info Display */}
                {previewItem.bankInfo && (previewItem.bankInfo.bank_iban || previewItem.bankInfo.bank_name) && (
                  <View style={styles.bankInfoCard}>
                    <View style={styles.bankInfoHeader}>
                      <BankIcon size={20} color="#007AFF" />
                      <Text style={styles.bankInfoTitle}>Coordonnées bancaires</Text>
                    </View>
                    {previewItem.bankInfo.bank_name && (
                      <Text style={styles.bankInfoText}>
                        <Text style={styles.bankInfoLabel}>Banque: </Text>
                        {previewItem.bankInfo.bank_name}
                      </Text>
                    )}
                    {previewItem.bankInfo.bank_iban && (
                      <Text style={styles.bankInfoText}>
                        <Text style={styles.bankInfoLabel}>IBAN: </Text>
                        {previewItem.bankInfo.bank_iban}
                      </Text>
                    )}
                    {previewItem.bankInfo.bank_bic && (
                      <Text style={styles.bankInfoText}>
                        <Text style={styles.bankInfoLabel}>BIC: </Text>
                        {previewItem.bankInfo.bank_bic}
                      </Text>
                    )}
                  </View>
                )}

                {/* Payment Buttons */}
                <View style={styles.paymentButtonsContainer}>
                  <TouchableOpacity
                    style={styles.paymentButton}
                    onPress={handleStripePayment}
                  >
                    <CreditCardIcon size={20} color="#fff" />
                    <Text style={styles.paymentButtonText}>Payer par Carte</Text>
                    <Text style={styles.paymentButtonSubtext}>Stripe</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.paymentButton, styles.applePayButton]}
                    onPress={handleApplePayment}
                  >
                    <AppleIcon size={20} color="#fff" />
                    <Text style={styles.paymentButtonText}>Apple Pay</Text>
                    <Text style={styles.paymentButtonSubtext}>Paiement rapide</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <View style={styles.readOnlyBadge}>
              <Text style={styles.readOnlyText}>📖 Mode lecture seule - Aperçu uniquement</Text>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  header: { backgroundColor: '#FFFFFF', paddingTop: 16, paddingHorizontal: 20, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 32, fontWeight: '700', color: '#000000', marginBottom: 4 },
  headerSubtitle: { fontSize: 15, color: '#8E8E93' },
  addButton: { backgroundColor: '#007AFF', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  addButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  tabsContainer: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 12, gap: 8, backgroundColor: '#FFFFFF' },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10, backgroundColor: '#F2F2F7', gap: 6 },
  tabActive: { backgroundColor: '#007AFF10' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#8E8E93' },
  tabTextActive: { color: '#007AFF' },
  searchContainer: { paddingHorizontal: 20, paddingVertical: 12 },
  searchInput: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, fontSize: 16, color: '#000000' },
  list: { flex: 1 },
  listContent: { padding: 20, gap: 16 },
  // Old card styles (keeping for backwards compatibility)
  card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  cardNumber: { fontSize: 16, fontWeight: '700', color: '#000000', marginBottom: 4 },
  cardCustomer: { fontSize: 14, color: '#8E8E93', marginBottom: 2 },
  cardDate: { fontSize: 13, color: '#8E8E93' },
  cardAmount: { fontSize: 18, fontWeight: '700', color: '#000000', marginBottom: 8, textAlign: 'right' },
  // Document card styles (template-styled cards)
  documentCard: { backgroundColor: '#FFFFFF', borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 4, overflow: 'hidden' },
  documentCardWrapper: { position: 'relative' },
  documentCardPreview: { borderRadius: 12, overflow: 'hidden', backgroundColor: '#FFFFFF' },
  documentCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F2F2F7' },
  documentCardInfo: { flexDirection: 'row', gap: 12, flex: 1 },
  documentCardLogo: { width: 48, height: 48, borderRadius: 6, backgroundColor: '#F2F2F7', resizeMode: 'contain' },
  documentCardCompany: { fontSize: 11, fontWeight: '600', color: '#8E8E93', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  documentCardType: { fontSize: 18, fontWeight: '700', marginBottom: 2 },
  documentCardNumber: { fontSize: 13, fontWeight: '600', color: '#000000' },
  documentCardClient: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FAFAFA' },
  documentCardLabel: { fontSize: 11, fontWeight: '600', color: '#8E8E93', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  documentCardClientName: { fontSize: 15, fontWeight: '600', color: '#000000' },
  documentCardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 12 },
  documentCardDate: { fontSize: 13, color: '#8E8E93' },
  documentCardAmount: { fontSize: 22, fontWeight: '700' },
  statusBadge: { position: 'absolute', top: 12, right: 12, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, zIndex: 10 },
  statusText: { fontSize: 12, fontWeight: '600', color: '#FFFFFF' },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { marginTop: 16, fontSize: 17, color: '#8E8E93' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F2F2F7' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#000000' },
  modalSubtitle: { fontSize: 15, color: '#8E8E93', marginTop: 2 },
  closeButton: { fontSize: 28, color: '#8E8E93', fontWeight: '300' },
  modalBody: { flex: 1 },
  modalSection: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#F2F2F7' },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#8E8E93', marginBottom: 12 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  infoLabel: { fontSize: 15, color: '#8E8E93' },
  infoValue: { fontSize: 15, fontWeight: '600', color: '#000000' },
  modalActions: { flexDirection: 'row', padding: 20, borderTopWidth: 1, borderTopColor: '#F2F2F7', gap: 8, flexWrap: 'wrap' },
  actionButtonPrimary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10, gap: 6, backgroundColor: '#007AFF' },
  actionButtonPrimaryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  actionButtonSecondary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10, gap: 6, backgroundColor: '#F2F2F7' },
  actionButtonSecondaryText: { color: '#007AFF', fontSize: 15, fontWeight: '600' },
  actionButtonPDF: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10, gap: 6, backgroundColor: '#34C759', marginBottom: 8 },
  modalFooter: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#F2F2F7' },
  buttonPrimary: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', backgroundColor: '#007AFF' },
  buttonPrimaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  buttonSecondary: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', backgroundColor: '#F2F2F7' },
  buttonSecondaryText: { color: '#007AFF', fontSize: 16, fontWeight: '600' },
  buttonDownload: { flex: 1, flexDirection: 'row', paddingVertical: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#34C759' },
  formGroup: { marginBottom: 16, paddingHorizontal: 20 },
  formLabel: { fontSize: 15, fontWeight: '600', color: '#000000', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#E5E5EA', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, color: '#000000' },
  clientSelectorWrapper: { position: 'relative' },
  selectedClientBadge: {
    marginTop: 10,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  selectedClientBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
    flex: 1,
  },
  clearClientButton: {
    backgroundColor: '#FFFFFF',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2E7D32',
  },
  clearClientButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2E7D32',
  },
  dividerWithText: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    paddingHorizontal: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E5EA',
  },
  dividerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    marginHorizontal: 12,
    letterSpacing: 0.5,
  },
  paymentMethods: { gap: 8 },
  paymentMethod: { padding: 12, borderRadius: 8, borderWidth: 1.5, borderColor: '#E5E5EA', backgroundColor: '#FFFFFF' },
  paymentMethodActive: { borderColor: '#007AFF', backgroundColor: '#007AFF10' },
  paymentMethodText: { fontSize: 15, fontWeight: '600', color: '#8E8E93' },
  paymentMethodTextActive: { color: '#007AFF' },
  onboardingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, backgroundColor: '#FAFAFA' },
  onboardingIconContainer: { marginBottom: 32 },
  onboardingTitle: { fontSize: 28, fontWeight: '700', color: '#000000', textAlign: 'center', marginBottom: 16 },
  onboardingDescription: { fontSize: 17, color: '#8E8E93', textAlign: 'center', lineHeight: 24, marginBottom: 40, maxWidth: 500 },
  onboardingButton: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#007AFF', paddingVertical: 16, paddingHorizontal: 32, borderRadius: 12, shadowColor: '#007AFF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  onboardingButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' },
  // Template selection styles
  templateScroll: { marginTop: 8 },
  templateCard: { marginRight: 12 },
  templateCardActive: { opacity: 1 },
  templatePreview: { width: 140, height: 100, borderRadius: 8, borderWidth: 2, backgroundColor: '#FFFFFF', overflow: 'hidden' },
  templateColorBar: { height: 20, width: '100%' },
  templateName: { padding: 8, fontSize: 13, fontWeight: '600', color: '#000000', textAlign: 'center' },
  defaultBadge: { position: 'absolute', top: 4, right: 4, backgroundColor: '#34C759', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  defaultBadgeText: { fontSize: 10, fontWeight: '600', color: '#FFFFFF' },
  // Form styles
  formLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  addItemButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addItemButtonDisabled: { opacity: 0.5 },
  addItemButtonText: { fontSize: 14, fontWeight: '600', color: '#007AFF' },
  addItemButtonTextDisabled: { color: '#999' },
  textArea: { height: 80, paddingTop: 10, textAlignVertical: 'top' },
  itemRow: { marginBottom: 16, padding: 12, backgroundColor: '#F9F9F9', borderRadius: 8 },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  itemNumber: { fontSize: 14, fontWeight: '600', color: '#000000' },
  itemRowInputs: { flexDirection: 'row', gap: 8, marginTop: 8 },
  miniLabel: { fontSize: 12, fontWeight: '600', color: '#8E8E93', marginBottom: 4 },
  itemTotal: { justifyContent: 'flex-end', alignItems: 'flex-end', paddingTop: 16 },
  itemTotalText: { fontSize: 16, fontWeight: '700', color: '#000000' },
  // Total summary styles
  totalSummary: { marginTop: 16, padding: 16, backgroundColor: '#F9F9F9', borderRadius: 12, marginHorizontal: 20 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  totalLabel: { fontSize: 15, color: '#8E8E93' },
  totalValue: { fontSize: 15, fontWeight: '600', color: '#000000' },
  totalRowFinal: { borderTopWidth: 2, borderTopColor: '#E5E5EA', marginTop: 8, paddingTop: 12 },
  totalLabelFinal: { fontSize: 17, fontWeight: '700', color: '#000000' },
  totalValueFinal: { fontSize: 20, fontWeight: '700', color: '#007AFF' },
  // Preview styles
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  previewToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#007AFF10' },
  previewToggleText: { fontSize: 14, fontWeight: '600', color: '#007AFF' },
  modalContentWide: { maxWidth: 1200, width: '95%', alignSelf: 'center' },
  modalBodyContainer: { flex: 1 },
  modalBodySplit: { flexDirection: 'row' },
  modalBodyHalf: { flex: 1, borderRightWidth: 1, borderRightColor: '#F2F2F7' },
  previewPanel: { flex: 1, backgroundColor: '#F9F9F9' },
  previewPanelHalf: { flex: 1 },
  previewContent: { padding: 20 },
  previewTitle: { fontSize: 18, fontWeight: '700', color: '#000000', marginBottom: 16 },
  documentPreview: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 24, borderTopWidth: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  // Live preview styles
  liveInvoicePreview: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 32,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
    position: 'relative',
    overflow: 'hidden',
  },
  decorativeSidebar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 6,
  },
  liveInvoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    borderRadius: 8,
    marginBottom: 24,
    borderBottomWidth: 2,
    borderBottomColor: '#E5E7EB',
  },
  liveInvoiceHeaderLeft: {
    flex: 1,
  },
  liveInvoiceTitle: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: 1,
  },
  liveInvoiceNumber: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  liveInvoiceDate: {
    fontSize: 14,
  },
  liveLogoImage: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
    borderRadius: 8,
  },
  liveInfoSection: {
    flexDirection: 'row',
    gap: 32,
    marginBottom: 32,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  liveCompanyInfo: {
    flex: 1,
  },
  liveCompanyName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  liveCompanyDetail: {
    fontSize: 13,
    marginBottom: 4,
  },
  liveClientInfo: {
    flex: 1,
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  liveClientHeader: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'flex-start',
  },
  liveClientLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
  },
  liveClientName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  liveClientDetail: {
    fontSize: 13,
    marginBottom: 3,
  },
  clientLogoContainer: {
    width: 70,
    height: 70,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  clientLogoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  liveTable: {
    marginBottom: 24,
  },
  liveTableHeader: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 8,
    marginBottom: 2,
  },
  liveTableHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  liveTableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  liveTableCell: {
    fontSize: 14,
  },
  liveTotalsSection: {
    alignItems: 'flex-end',
    paddingTop: 16,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 24,
  },
  liveTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 32,
    paddingVertical: 8,
    minWidth: 300,
  },
  liveTotalLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  liveTotalValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  liveTotalRowFinal: {
    borderTopWidth: 2,
    borderTopColor: '#E5E7EB',
    marginTop: 8,
    paddingTop: 16,
  },
  liveTotalLabelFinal: {
    fontSize: 18,
    fontWeight: '700',
  },
  liveTotalValueFinal: {
    fontSize: 22,
    fontWeight: '700',
  },
  liveNotesSection: {
    padding: 16,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  liveNotesLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  liveNotesText: {
    fontSize: 14,
    lineHeight: 20,
  },
  livePaymentSection: {
    padding: 20,
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  livePaymentTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  paymentMethodsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 12,
    flexWrap: 'wrap',
  },
  paymentMethodBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    minWidth: 110,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  paymentIconContainer: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  paymentMethodText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  // Apple Pay specific styles
  applePayBadge: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  applePayText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  liveFooter: {
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  liveFooterText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  previewHeader: { flexDirection: 'row', gap: 16, paddingBottom: 20, marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#E5E5EA' },
  logoPlaceholder: { width: 80, height: 80, borderRadius: 8, backgroundColor: '#E5E5EA', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  logoImage: { width: '100%', height: '100%', resizeMode: 'contain' },
  logoText: { fontSize: 12, fontWeight: '600', color: '#8E8E93' },
  companyInfo: { flex: 1 },
  companyName: { fontSize: 18, fontWeight: '700', color: '#000000', marginBottom: 4 },
  companyDetail: { fontSize: 13, color: '#8E8E93', marginBottom: 2 },
  documentInfo: { marginBottom: 20 },
  documentInfoRow: { flexDirection: 'row', gap: 16 },
  documentType: { fontSize: 24, fontWeight: '700', marginBottom: 8 },
  documentNumber: { fontSize: 14, color: '#000000', marginBottom: 4 },
  documentDate: { fontSize: 13, color: '#8E8E93' },
  clientLabel: { fontSize: 12, fontWeight: '600', color: '#8E8E93', marginBottom: 4 },
  clientName: { fontSize: 15, fontWeight: '600', color: '#000000', marginBottom: 2 },
  clientDetail: { fontSize: 13, color: '#8E8E93', marginBottom: 2 },
  previewTable: { marginBottom: 20 },
  tableHeader: { flexDirection: 'row', padding: 12, borderRadius: 8, marginBottom: 8 },
  tableHeaderText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  tableRow: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#F2F2F7' },
  tableCell: { fontSize: 13, color: '#000000' },
  previewTotals: { alignItems: 'flex-end', paddingTop: 12, borderTopWidth: 2, borderTopColor: '#E5E5EA' },
  totalLinePreview: { flexDirection: 'row', gap: 24, paddingVertical: 6, minWidth: 250, justifyContent: 'space-between' },
  totalLabelPreview: { fontSize: 14, color: '#8E8E93' },
  totalValuePreview: { fontSize: 14, fontWeight: '600', color: '#000000' },
  totalLineFinal: { borderTopWidth: 1, borderTopColor: '#E5E5EA', marginTop: 8, paddingTop: 12 },
  previewNotes: { marginTop: 20, padding: 12, backgroundColor: '#F9F9F9', borderRadius: 8 },
  notesLabel: { fontSize: 12, fontWeight: '600', color: '#8E8E93', marginBottom: 4 },
  notesText: { fontSize: 13, color: '#000000', lineHeight: 18 },
  previewFooter: { marginTop: 20, padding: 12, borderRadius: 8 },
  footerText: { fontSize: 12, color: '#8E8E93', textAlign: 'center' },
  legalInfo: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#E5E5EA' },
  legalText: { fontSize: 11, color: '#8E8E93', textAlign: 'center' },
  documentCardTouchable: { width: '100%' },
  cardActions: { flexDirection: 'row', gap: 8, padding: 12, backgroundColor: '#F9F9F9', borderTopWidth: 1, borderTopColor: '#E5E5EA' },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, gap: 6 },
  previewButton: { backgroundColor: '#007AFF' },
  convertButton: { backgroundColor: '#34C759' },
  deleteButton: { backgroundColor: '#FF3B30' },
  sendButton: { backgroundColor: '#34C759' },
  actionButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  confirmOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  confirmModal: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, width: '100%', maxWidth: 400, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  confirmTitle: { fontSize: 20, fontWeight: '700', color: '#000000', marginBottom: 12, textAlign: 'center' },
  confirmMessage: { fontSize: 15, color: '#666666', marginBottom: 24, textAlign: 'center', lineHeight: 22 },
  confirmButtons: { flexDirection: 'row', gap: 12 },
  confirmButton: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  confirmButtonCancel: { backgroundColor: '#F2F2F7' },
  confirmButtonConfirm: { backgroundColor: '#FF3B30' },
  confirmButtonConvert: { backgroundColor: '#34C759' },
  confirmButtonTextCancel: { color: '#007AFF', fontSize: 16, fontWeight: '600' },
  confirmButtonTextConfirm: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  previewOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center' },
  previewModal: { backgroundColor: '#525659', borderRadius: 16, width: '95%', maxWidth: 900, height: '95%', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8, overflow: 'hidden', display: 'flex', flexDirection: 'column' },
  previewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#3A3D40', backgroundColor: '#3A3D40' },
  previewTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  closeButtonContainer: { padding: 4 },
  closeButton: { fontSize: 32, color: '#FFFFFF', fontWeight: '300', lineHeight: 32 },
  iframeContainer: { flex: 1, backgroundColor: '#525659', padding: 20, alignItems: 'center', overflow: 'auto' },
  readOnlyBadge: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFF3CD', padding: 8, borderTopWidth: 1, borderTopColor: '#FFE69C', zIndex: 10 },
  readOnlyText: { fontSize: 13, color: '#856404', textAlign: 'center', fontWeight: '600' },
  // Payment section styles
  paymentSection: { backgroundColor: '#F9F9F9', padding: 16, borderTopWidth: 1, borderTopColor: '#E0E0E0', marginBottom: 48 },
  paymentSectionTitle: { fontSize: 18, fontWeight: '700', color: '#000000', marginBottom: 16, textAlign: 'center' },
  bankInfoCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  bankInfoHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  bankInfoTitle: { fontSize: 16, fontWeight: '600', color: '#007AFF' },
  bankInfoText: { fontSize: 14, color: '#333333', marginBottom: 8, paddingLeft: 28 },
  bankInfoLabel: { fontWeight: '600', color: '#666666' },
  paymentButtonsContainer: { flexDirection: 'row', gap: 12 },
  paymentButton: { flex: 1, backgroundColor: '#635BFF', borderRadius: 12, padding: 16, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 3 },
  applePayButton: { backgroundColor: '#000000' },
  paymentButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', marginTop: 8 },
  paymentButtonSubtext: { color: '#FFFFFF', fontSize: 12, marginTop: 4, opacity: 0.8 },
});
