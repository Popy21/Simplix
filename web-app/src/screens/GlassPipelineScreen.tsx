import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { glassTheme } from '../theme/glassTheme';
import GlassCard from '../components/GlassCard';
import { dealsService, pipelineService } from '../services/api';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const COLUMN_WIDTH = 320;
const CARD_SPACING = 12;

type PipelineScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Pipeline'>;
};

interface Deal {
  id: string;
  title: string;
  company: string;
  value: number;
  probability: number;
  owner: string;
  lastActivity: string;
  tags?: string[];
}

interface Stage {
  id: string;
  name: string;
  color: string;
  deals: Deal[];
  totalValue: number;
}

export default function GlassPipelineScreen({ navigation }: PipelineScreenProps) {
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const scaleAnim = new Animated.Value(1);

  useEffect(() => {
    loadPipelineData();
  }, []);

  const loadPipelineData = async () => {
    try {
      setLoading(true);
      const [stagesResponse, dealsResponse] = await Promise.all([
        pipelineService.getStages(),
        dealsService.getAll({ status: 'open' }),
      ]);

      const pipelineStages = stagesResponse.data;
      const allDeals = dealsResponse.data;

      // Group deals by stage
      const formattedStages: Stage[] = pipelineStages.map((stage: any) => {
        const stageDeals = allDeals.filter((deal: any) => deal.stage_id === stage.id);
        const totalValue = stageDeals.reduce((sum: number, deal: any) => sum + parseFloat(deal.value || 0), 0);

        return {
          id: stage.id,
          name: stage.name,
          color: stage.color || '#007AFF',
          totalValue,
          deals: stageDeals.map((deal: any) => ({
            id: deal.id,
            title: deal.title,
            company: deal.company_name || 'N/A',
            value: parseFloat(deal.value) || 0,
            probability: deal.probability || 0,
            owner: deal.owner_name || 'Non assigné',
            lastActivity: deal.updated_at ? getTimeAgo(deal.updated_at) : 'N/A',
            tags: deal.tags || [],
          })),
        };
      });

      setStages(formattedStages);
    } catch (error) {
      console.error('Error loading pipeline:', error);
      // Fallback to mock data
      setStages([
        {
          id: '1',
          name: 'Prospection',
          color: '#FF9500',
          totalValue: 125000,
          deals: [
            {
              id: 'd1',
              title: 'Audit Système IT',
              company: 'TechCorp SAS',
              value: 45000,
              probability: 30,
              owner: 'Marie D.',
              lastActivity: 'Il y a 2h',
              tags: ['Urgent', 'IT'],
            },
            {
              id: 'd2',
              title: 'Formation CRM',
              company: 'Global Solutions',
              value: 32000,
              probability: 40,
              owner: 'Jean P.',
              lastActivity: 'Il y a 5h',
              tags: ['Formation'],
            },
          ],
        },
        {
          id: '2',
          name: 'Qualification',
          color: '#007AFF',
          totalValue: 230000,
          deals: [
            {
              id: 'd3',
              title: 'Solution E-commerce',
              company: 'StartupXYZ',
              value: 58000,
              probability: 60,
              owner: 'Sophie M.',
              lastActivity: 'Il y a 1j',
              tags: ['E-commerce'],
            },
          ],
        },
        {
          id: '3',
          name: 'Proposition',
          color: '#5856D6',
          totalValue: 420000,
          deals: [
            {
              id: 'd4',
              title: 'Maintenance Annuelle',
              company: 'Enterprise Ltd',
              value: 75000,
              probability: 75,
              owner: 'Laurent B.',
              lastActivity: 'Il y a 3h',
              tags: ['Maintenance', 'Contrat'],
            },
          ],
        },
        {
          id: '4',
          name: 'Négociation',
          color: '#34C759',
          totalValue: 650000,
          deals: [
            {
              id: 'd5',
              title: 'Licence CRM Enterprise',
              company: 'Acme Corp',
              value: 120000,
              probability: 85,
              owner: 'Claire L.',
              lastActivity: 'Il y a 30min',
              tags: ['Hot', 'Prioritaire'],
            },
          ],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const past = new Date(date);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `Il y a ${diffMins}min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    return `Il y a ${diffDays}j`;
  };

  const handleDealPress = (deal: Deal) => {
    setSelectedDeal(deal);
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 3,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const renderDealCard = (deal: Deal) => {
    return (
      <TouchableOpacity
        key={deal.id}
        onPress={() => handleDealPress(deal)}
        activeOpacity={0.9}
        style={styles.dealCardWrapper}
      >
        <GlassCard variant="light" elevation="md" padding={16} borderRadius={16}>
          {/* Deal header */}
          <View style={styles.dealHeader}>
            <Text style={styles.dealTitle} numberOfLines={2}>
              {deal.title}
            </Text>
            <View style={styles.probabilityBadge}>
              <Text style={styles.probabilityText}>{deal.probability}%</Text>
            </View>
          </View>

          {/* Company */}
          <Text style={styles.dealCompany}>{deal.company}</Text>

          {/* Value */}
          <View style={styles.dealValueContainer}>
            <Text style={styles.dealValue}>{deal.value.toLocaleString('fr-FR')}€</Text>
          </View>

          {/* Tags */}
          {deal.tags && deal.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              {deal.tags.slice(0, 2).map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Footer */}
          <View style={styles.dealFooter}>
            <View style={styles.ownerContainer}>
              <View style={styles.ownerAvatar}>
                <Text style={styles.ownerAvatarText}>{deal.owner.charAt(0)}</Text>
              </View>
              <Text style={styles.ownerName}>{deal.owner}</Text>
            </View>
            <Text style={styles.lastActivity}>{deal.lastActivity}</Text>
          </View>
        </GlassCard>
      </TouchableOpacity>
    );
  };

  const renderStageColumn = (stage: Stage) => {
    return (
      <View key={stage.id} style={styles.column}>
        {/* Column header */}
        <GlassCard variant="frosted" elevation="sm" padding={16} borderRadius={14}>
          <View style={styles.columnHeader}>
            <View style={styles.columnHeaderLeft}>
              <View style={[styles.stageColorDot, { backgroundColor: stage.color }]} />
              <Text style={styles.stageName}>{stage.name}</Text>
              <View style={styles.dealsCount}>
                <Text style={styles.dealsCountText}>{stage.deals.length}</Text>
              </View>
            </View>
          </View>
          <Text style={styles.stageValue}>{stage.totalValue.toLocaleString('fr-FR')}€</Text>
        </GlassCard>

        {/* Deals list */}
        <ScrollView
          style={styles.dealsScroll}
          contentContainerStyle={styles.dealsScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {stage.deals.map(renderDealCard)}

          {/* Add deal button */}
          <TouchableOpacity style={styles.addDealButton} activeOpacity={0.7}>
            <Text style={styles.addDealIcon}>+</Text>
            <Text style={styles.addDealText}>Ajouter une opportunité</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Gradient background */}
      <LinearGradient
        colors={['#F2F2F7', '#E8E8ED', '#F2F2F7']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Pipeline des ventes</Text>
            <Text style={styles.headerSubtitle}>
              {stages.reduce((sum, s) => sum + s.deals.length, 0)} opportunités actives
            </Text>
          </View>

          <TouchableOpacity style={styles.filterButton} activeOpacity={0.7}>
            <GlassCard variant="light" elevation="sm" padding={12} borderRadius={12}>
              <Text style={styles.filterIcon}>⚙️</Text>
            </GlassCard>
          </TouchableOpacity>
        </View>
      </View>

      {/* Pipeline columns */}
      <ScrollView
        horizontal
        style={styles.pipelineScroll}
        contentContainerStyle={styles.pipelineScrollContent}
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={COLUMN_WIDTH + CARD_SPACING}
      >
        {stages.map(renderStageColumn)}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Header
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 24,
    paddingHorizontal: glassTheme.spacing.lg,
    paddingBottom: glassTheme.spacing.md,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTitle: {
    ...glassTheme.typography.displaySmall,
    color: glassTheme.colors.text.primary,
    marginBottom: 4,
  },
  headerSubtitle: {
    ...glassTheme.typography.body,
    color: glassTheme.colors.text.tertiary,
  },
  filterButton: {},
  filterIcon: {
    fontSize: 20,
  },

  // Pipeline scroll
  pipelineScroll: {
    flex: 1,
  },
  pipelineScrollContent: {
    paddingHorizontal: glassTheme.spacing.lg,
    gap: CARD_SPACING,
  },

  // Column
  column: {
    width: COLUMN_WIDTH,
    marginRight: CARD_SPACING,
  },
  columnHeader: {
    marginBottom: 8,
  },
  columnHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  stageColorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  stageName: {
    ...glassTheme.typography.h3,
    color: glassTheme.colors.text.primary,
    flex: 1,
  },
  dealsCount: {
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  dealsCountText: {
    ...glassTheme.typography.captionBold,
    color: glassTheme.colors.text.secondary,
  },
  stageValue: {
    ...glassTheme.typography.h2,
    color: glassTheme.colors.text.primary,
  },

  // Deals scroll
  dealsScroll: {
    flex: 1,
    marginTop: glassTheme.spacing.md,
  },
  dealsScrollContent: {
    gap: CARD_SPACING,
    paddingBottom: 100,
  },

  // Deal card
  dealCardWrapper: {
    marginBottom: 4,
  },
  dealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  dealTitle: {
    ...glassTheme.typography.h3,
    color: glassTheme.colors.text.primary,
    flex: 1,
    marginRight: 8,
  },
  probabilityBadge: {
    backgroundColor: 'rgba(0, 122, 255, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  probabilityText: {
    ...glassTheme.typography.captionBold,
    color: glassTheme.colors.primary,
  },
  dealCompany: {
    ...glassTheme.typography.bodySmall,
    color: glassTheme.colors.text.secondary,
    marginBottom: 12,
  },
  dealValueContainer: {
    marginBottom: 12,
  },
  dealValue: {
    ...glassTheme.typography.h2,
    color: glassTheme.colors.primary,
    fontWeight: '700',
  },
  tagsContainer: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tagText: {
    ...glassTheme.typography.caption,
    color: glassTheme.colors.text.secondary,
    fontWeight: '500',
  },
  dealFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  ownerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ownerAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: glassTheme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ownerAvatarText: {
    ...glassTheme.typography.caption,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  ownerName: {
    ...glassTheme.typography.bodySmall,
    color: glassTheme.colors.text.secondary,
  },
  lastActivity: {
    ...glassTheme.typography.caption,
    color: glassTheme.colors.text.tertiary,
  },

  // Add deal button
  addDealButton: {
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  addDealIcon: {
    fontSize: 24,
    color: glassTheme.colors.text.tertiary,
    marginBottom: 4,
  },
  addDealText: {
    ...glassTheme.typography.bodySmall,
    color: glassTheme.colors.text.tertiary,
  },
});
