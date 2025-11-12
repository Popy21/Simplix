import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView } from 'react-native';
import { toAbsoluteUrl } from '../utils/url';

interface DocumentPreviewProps {
  template: any;
  document: {
    type: 'quote' | 'invoice';
    number: string;
    date: string;
    customer_name: string;
    customer_email?: string;
    customer_address?: string;
    items: Array<{
      description: string;
      quantity: number;
      unit_price: number;
    }>;
    notes?: string;
    total_ht?: number;
    total_ttc?: number;
  };
  compact?: boolean;
}

export default function DocumentPreview({ template, document, compact = false }: DocumentPreviewProps) {
  if (!template) {
    return (
      <View style={styles.container}>
        <Text style={styles.noTemplate}>Aucun template sélectionné</Text>
      </View>
    );
  }

  const total_ht = document.total_ht || document.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  const total_tva = total_ht * 0.20;
  const total_ttc = document.total_ttc || (total_ht * 1.20);

  const layoutStyles = getLayoutStyles(template.template_layout || 'professional');

  // Convertir le logo_url en URL absolue si c'est un chemin relatif
  const logoUrl = toAbsoluteUrl(template.logo_url || template.template_logo_url);

  return (
    <View style={[
      styles.documentPreview,
      {
        borderTopColor: template.primary_color || template.template_primary_color || '#007AFF',
        borderRadius: layoutStyles.borderRadius,
        borderWidth: layoutStyles.borderWidth,
        borderColor: template.border_color || '#E5E5EA'
      },
      layoutStyles.shadow && styles.shadow,
      compact && styles.compact
    ]}>
      {/* Header */}
      <View style={[
        styles.previewHeader,
        {
          backgroundColor: template.header_background_color || '#FAFAFA',
          padding: layoutStyles.headerPadding
        }
      ]}>
        {template.show_logo && (
          <View style={styles.logoContainer}>
            {logoUrl ? (
              <Image
                source={{ uri: logoUrl }}
                style={styles.logo}
              />
            ) : (
              <View style={styles.logoPlaceholder}>
                <Text style={styles.logoText}>LOGO</Text>
              </View>
            )}
          </View>
        )}
        <View style={styles.companyInfo}>
          <Text style={[styles.companyName, template.font_family && { fontFamily: template.font_family }]}>
            {template.company_name || template.template_company_name || 'Nom de l\'entreprise'}
          </Text>
          {(template.company_address || template.template_company_address) && (
            <Text style={styles.companyDetail}>{template.company_address || template.template_company_address}</Text>
          )}
          {(template.company_phone || template.template_company_phone) && (
            <Text style={styles.companyDetail}>{template.company_phone || template.template_company_phone}</Text>
          )}
          {(template.company_email || template.template_company_email) && (
            <Text style={styles.companyDetail}>{template.company_email || template.template_company_email}</Text>
          )}
        </View>
      </View>

      {/* Document Info */}
      <View style={[styles.documentInfo, { marginVertical: layoutStyles.spacing }]}>
        <View style={styles.documentInfoRow}>
          <View style={{ flex: 1 }}>
            <Text style={[
              styles.documentType,
              { color: template.primary_color || template.template_primary_color || '#007AFF' },
              template.font_family && { fontFamily: template.font_family }
            ]}>
              {document.type === 'quote' ? (template.invoice_title || 'DEVIS') : (template.invoice_title || 'FACTURE')}
            </Text>
            <Text style={styles.documentNumber}>
              {template.invoice_number_prefix || 'N° '}{document.number}
            </Text>
            <Text style={styles.documentDate}>
              Date: {document.date}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.clientLabel}>{template.client_label || 'Client:'}</Text>
            <Text style={styles.clientName}>
              {document.customer_name || template.client_name_placeholder || 'Nom du client'}
            </Text>
            {document.customer_email && (
              <Text style={styles.clientDetail}>{document.customer_email}</Text>
            )}
            {document.customer_address && (
              <Text style={styles.clientDetail}>{document.customer_address}</Text>
            )}
          </View>
        </View>
      </View>

      {/* Items Table */}
      {!compact && (
        <View style={styles.previewTable}>
          <View style={[
            styles.tableHeader,
            { backgroundColor: template.table_header_color || template.primary_color || template.template_primary_color || '#007AFF' }
          ]}>
            <Text style={[styles.tableHeaderText, { flex: 2 }]}>
              {template.table_header_description || 'Description'}
            </Text>
            <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'center' }]}>
              {template.table_header_quantity || 'Qté'}
            </Text>
            <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'right' }]}>
              {template.table_header_unit_price || 'Prix U.'}
            </Text>
            <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'right' }]}>
              {template.table_header_total || 'Total'}
            </Text>
          </View>
          {(document.items || []).map((item, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 2 }]}>
                {item.description || `Article ${index + 1}`}
              </Text>
              <Text style={[styles.tableCell, { flex: 1, textAlign: 'center' }]}>
                {item.quantity || 1}
              </Text>
              <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>
                {parseFloat(item.unit_price || 0).toFixed(2)} €
              </Text>
              <Text style={[styles.tableCell, { flex: 1, textAlign: 'right', fontWeight: '600' }]}>
                {(parseFloat(item.quantity || 1) * parseFloat(item.unit_price || 0)).toFixed(2)} €
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Totals */}
      <View style={styles.previewTotals}>
        <View style={styles.totalLinePreview}>
          <Text style={styles.totalLabelPreview}>{template.subtotal_label || 'Sous-total HT:'}</Text>
          <Text style={styles.totalValuePreview}>{parseFloat(total_ht || 0).toFixed(2)} €</Text>
        </View>
        <View style={styles.totalLinePreview}>
          <Text style={styles.totalLabelPreview}>{template.vat_label || 'TVA (20%):'}</Text>
          <Text style={styles.totalValuePreview}>{parseFloat(total_tva || 0).toFixed(2)} €</Text>
        </View>
        <View style={[styles.totalLinePreview, styles.totalLineFinal]}>
          <Text style={[styles.totalLabelPreview, { fontWeight: '700', fontSize: 16 }]}>
            {template.total_label || 'Total TTC:'}
          </Text>
          <Text style={[
            styles.totalValuePreview,
            {
              fontWeight: '700',
              fontSize: 18,
              color: template.total_color || template.primary_color || template.template_primary_color || '#007AFF'
            }
          ]}>
            {parseFloat(total_ttc || 0).toFixed(2)} €
          </Text>
        </View>
      </View>

      {/* Notes */}
      {!compact && document.notes && (
        <View style={styles.previewNotes}>
          <Text style={styles.notesLabel}>Notes:</Text>
          <Text style={styles.notesText}>{document.notes}</Text>
        </View>
      )}

      {/* Footer */}
      {!compact && template.show_footer && template.footer_text && (
        <View style={[
          styles.previewFooter,
          { backgroundColor: template.header_background_color || '#FAFAFA' }
        ]}>
          <Text style={styles.footerText}>{template.footer_text}</Text>
        </View>
      )}

      {/* Legal Info */}
      {!compact && template.show_legal_mentions && (template.company_siret || template.template_company_siret) && (
        <View style={styles.legalInfo}>
          <Text style={styles.legalText}>
            SIRET: {template.company_siret || template.template_company_siret}
            {(template.company_tva || template.template_company_tva) && ` • TVA: ${template.company_tva || template.template_company_tva}`}
          </Text>
        </View>
      )}
    </View>
  );
}

function getLayoutStyles(layout: string) {
  switch (layout) {
    case 'classic':
      return {
        borderRadius: 0,
        borderWidth: 2,
        headerPadding: 25,
        spacing: 20,
      };
    case 'modern':
      return {
        borderRadius: 16,
        borderWidth: 0,
        headerPadding: 35,
        spacing: 25,
        shadow: true,
      };
    case 'minimal':
      return {
        borderRadius: 8,
        borderWidth: 1,
        headerPadding: 20,
        spacing: 15,
      };
    case 'professional':
    default:
      return {
        borderRadius: 12,
        borderWidth: 1,
        headerPadding: 30,
        spacing: 20,
      };
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noTemplate: {
    fontSize: 16,
    color: '#8E8E93',
  },
  documentPreview: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderTopWidth: 4,
  },
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  compact: {
    padding: 16,
  },
  previewHeader: {
    flexDirection: 'row',
    gap: 16,
    paddingBottom: 20,
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  logoContainer: {
    width: 80,
    height: 80,
  },
  logo: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  logoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#E5E5EA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
  },
  companyDetail: {
    fontSize: 13,
    color: '#8E8E93',
    marginBottom: 2,
  },
  documentInfo: {
    marginBottom: 20,
  },
  documentInfoRow: {
    flexDirection: 'row',
    gap: 16,
  },
  documentType: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  documentNumber: {
    fontSize: 14,
    color: '#000000',
    marginBottom: 4,
  },
  documentDate: {
    fontSize: 13,
    color: '#8E8E93',
  },
  clientLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 4,
  },
  clientName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  clientDetail: {
    fontSize: 13,
    color: '#8E8E93',
    marginBottom: 2,
  },
  previewTable: {
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  tableHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  tableCell: {
    fontSize: 13,
    color: '#000000',
  },
  previewTotals: {
    alignItems: 'flex-end',
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: '#E5E5EA',
  },
  totalLinePreview: {
    flexDirection: 'row',
    gap: 24,
    paddingVertical: 6,
    minWidth: 250,
    justifyContent: 'space-between',
  },
  totalLabelPreview: {
    fontSize: 14,
    color: '#8E8E93',
  },
  totalValuePreview: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  totalLineFinal: {
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    marginTop: 8,
    paddingTop: 12,
  },
  previewNotes: {
    marginTop: 20,
    padding: 12,
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 13,
    color: '#000000',
    lineHeight: 18,
  },
  previewFooter: {
    marginTop: 20,
    padding: 12,
    borderRadius: 8,
  },
  footerText: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
  },
  legalInfo: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  legalText: {
    fontSize: 11,
    color: '#8E8E93',
    textAlign: 'center',
  },
});
