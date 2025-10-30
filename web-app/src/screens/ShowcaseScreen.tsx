import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
  ActivityIndicator,
  Platform
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { API_URL } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ShowcaseScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Showcase'>;
};

interface ShowcaseProfile {
  id: string;
  display_name: string;
  bio: string;
  custom_slug: string;
  theme: 'light' | 'dark' | 'custom';
  primary_color: string;
  secondary_color: string;
  seo_title: string;
  seo_description: string;
  seo_keywords: string[];
  address: string;
  city: string;
  country: string;
  email: string;
  phone: string;
  website_url: string;
  is_published: boolean;
  show_reviews: boolean;
  show_contact_button: boolean;
  allow_direct_purchase: boolean;
  total_views: number;
  average_rating: number;
}

interface ShowcasePost {
  id: string;
  post_type: 'post' | 'product';
  product_id?: string;
  title: string;
  caption: string;
  media_urls: string[];
  is_featured: boolean;
  is_visible: boolean;
  views_count: number;
  likes_count: number;
  product_name?: string;
  product_price?: number;
}

export default function ShowcaseScreen({ navigation }: ShowcaseScreenProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<ShowcaseProfile | null>(null);
  const [posts, setPosts] = useState<ShowcasePost[]>([]);
  const [activeTab, setActiveTab] = useState<'profile' | 'posts' | 'stats'>('profile');

  // Form state
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [customSlug, setCustomSlug] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#007AFF');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [showReviews, setShowReviews] = useState(true);
  const [showContactButton, setShowContactButton] = useState(true);
  const [allowDirectPurchase, setAllowDirectPurchase] = useState(true);

  useEffect(() => {
    loadShowcaseData();
  }, []);

  const loadShowcaseData = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');

      // Load profile
      const profileResponse = await fetch(`${API_URL}/showcase/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        setProfile(profileData);
        populateForm(profileData);
      }

      // Load posts
      const postsResponse = await fetch(`${API_URL}/showcase/posts`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (postsResponse.ok) {
        const postsData = await postsResponse.json();
        setPosts(postsData);
      }
    } catch (error) {
      console.error('Error loading showcase data:', error);
    } finally {
      setLoading(false);
    }
  };

  const populateForm = (data: ShowcaseProfile) => {
    setDisplayName(data.display_name || '');
    setBio(data.bio || '');
    setCustomSlug(data.custom_slug || '');
    setPrimaryColor(data.primary_color || '#007AFF');
    setSeoTitle(data.seo_title || '');
    setSeoDescription(data.seo_description || '');
    setAddress(data.address || '');
    setCity(data.city || '');
    setCountry(data.country || '');
    setEmail(data.email || '');
    setPhone(data.phone || '');
    setWebsiteUrl(data.website_url || '');
    setIsPublished(data.is_published || false);
    setShowReviews(data.show_reviews !== undefined ? data.show_reviews : true);
    setShowContactButton(data.show_contact_button !== undefined ? data.show_contact_button : true);
    setAllowDirectPurchase(data.allow_direct_purchase !== undefined ? data.allow_direct_purchase : true);
  };

  const saveProfile = async () => {
    if (!displayName || !customSlug) {
      Alert.alert('Erreur', 'Le nom et le slug sont requis');
      return;
    }

    try {
      setSaving(true);
      const token = await AsyncStorage.getItem('userToken');

      const response = await fetch(`${API_URL}/showcase/profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          display_name: displayName,
          bio,
          custom_slug: customSlug,
          primary_color: primaryColor,
          seo_title: seoTitle,
          seo_description: seoDescription,
          address,
          city,
          country,
          email,
          phone,
          website_url: websiteUrl,
          is_published: isPublished,
          show_reviews: showReviews,
          show_contact_button: showContactButton,
          allow_direct_purchase: allowDirectPurchase,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        Alert.alert('Succès', 'Profil sauvegardé avec succès');
        loadShowcaseData();
      } else {
        const error = await response.json();
        Alert.alert('Erreur', error.error || 'Erreur lors de la sauvegarde');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Erreur', 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const navigateToManagePosts = () => {
    navigation.navigate('ShowcasePosts' as any);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Vitrine Numérique</Text>
        <TouchableOpacity onPress={saveProfile} style={styles.saveButton} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>Sauvegarder</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'profile' && styles.tabActive]}
          onPress={() => setActiveTab('profile')}
        >
          <Text style={[styles.tabText, activeTab === 'profile' && styles.tabTextActive]}>
            Profil
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'posts' && styles.tabActive]}
          onPress={() => setActiveTab('posts')}
        >
          <Text style={[styles.tabText, activeTab === 'posts' && styles.tabTextActive]}>
            Posts ({posts.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'stats' && styles.tabActive]}
          onPress={() => setActiveTab('stats')}
        >
          <Text style={[styles.tabText, activeTab === 'stats' && styles.tabTextActive]}>
            Statistiques
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {activeTab === 'profile' && (
          <View style={styles.section}>
            {/* Informations de base */}
            <Text style={styles.sectionTitle}>INFORMATIONS DE BASE</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nom de la vitrine *</Text>
              <TextInput
                style={styles.input}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Ex: Ma Boutique"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>URL personnalisée * (slug)</Text>
              <View style={styles.slugContainer}>
                <Text style={styles.slugPrefix}>simplix.com/s/</Text>
                <TextInput
                  style={styles.slugInput}
                  value={customSlug}
                  onChangeText={(text) => setCustomSlug(text.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="mon-entreprise"
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Bio</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={bio}
                onChangeText={setBio}
                placeholder="Décrivez votre activité..."
                multiline
                numberOfLines={4}
              />
            </View>

            {/* SEO */}
            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>SEO</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Titre SEO</Text>
              <TextInput
                style={styles.input}
                value={seoTitle}
                onChangeText={setSeoTitle}
                placeholder="Titre pour Google"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description SEO</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={seoDescription}
                onChangeText={setSeoDescription}
                placeholder="Description pour Google"
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Localisation */}
            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>LOCALISATION (GEO)</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Adresse</Text>
              <TextInput
                style={styles.input}
                value={address}
                onChangeText={setAddress}
                placeholder="123 Rue Example"
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>Ville</Text>
                <TextInput
                  style={styles.input}
                  value={city}
                  onChangeText={setCity}
                  placeholder="Paris"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Pays</Text>
                <TextInput
                  style={styles.input}
                  value={country}
                  onChangeText={setCountry}
                  placeholder="France"
                />
              </View>
            </View>

            {/* Contact */}
            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>CONTACT</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="contact@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Téléphone</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="+33 1 23 45 67 89"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Site web</Text>
              <TextInput
                style={styles.input}
                value={websiteUrl}
                onChangeText={setWebsiteUrl}
                placeholder="https://example.com"
                autoCapitalize="none"
              />
            </View>

            {/* Design */}
            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>DESIGN</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Couleur principale</Text>
              <View style={styles.colorPickerContainer}>
                <View style={[styles.colorPreview, { backgroundColor: primaryColor }]} />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={primaryColor}
                  onChangeText={setPrimaryColor}
                  placeholder="#007AFF"
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Paramètres */}
            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>PARAMÈTRES</Text>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Publier la vitrine</Text>
              <Switch value={isPublished} onValueChange={setIsPublished} />
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Afficher les avis</Text>
              <Switch value={showReviews} onValueChange={setShowReviews} />
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Bouton de contact</Text>
              <Switch value={showContactButton} onValueChange={setShowContactButton} />
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Achat direct</Text>
              <Switch value={allowDirectPurchase} onValueChange={setAllowDirectPurchase} />
            </View>

            <View style={{ height: 40 }} />
          </View>
        )}

        {activeTab === 'posts' && (
          <View style={styles.section}>
            <TouchableOpacity style={styles.addButton} onPress={navigateToManagePosts}>
              <Text style={styles.addButtonText}>+ Gérer les Posts</Text>
            </TouchableOpacity>

            {posts.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>Aucun post pour le moment</Text>
                <Text style={styles.emptyStateSubtext}>
                  Ajoutez des posts ou des produits à votre vitrine
                </Text>
              </View>
            ) : (
              posts.map((post) => (
                <View key={post.id} style={styles.postCard}>
                  <View style={styles.postHeader}>
                    <Text style={styles.postType}>
                      {post.post_type === 'product' ? '🛍️ Produit' : '📝 Post'}
                    </Text>
                    {post.is_featured && (
                      <Text style={styles.featuredBadge}>⭐ En vedette</Text>
                    )}
                  </View>
                  <Text style={styles.postTitle}>
                    {post.post_type === 'product' ? post.product_name : post.title}
                  </Text>
                  {post.caption && (
                    <Text style={styles.postCaption}>{post.caption}</Text>
                  )}
                  <View style={styles.postStats}>
                    <Text style={styles.postStat}>👁️ {post.views_count}</Text>
                    <Text style={styles.postStat}>❤️ {post.likes_count}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === 'stats' && (
          <View style={styles.section}>
            {profile ? (
              <>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{profile.total_views}</Text>
                  <Text style={styles.statLabel}>Vues totales</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{profile.average_rating.toFixed(1)} / 5</Text>
                  <Text style={styles.statLabel}>Note moyenne</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{posts.length}</Text>
                  <Text style={styles.statLabel}>Posts publiés</Text>
                </View>

                {profile.is_published && (
                  <View style={styles.publicLinkCard}>
                    <Text style={styles.publicLinkLabel}>Lien public:</Text>
                    <Text style={styles.publicLink}>
                      simplix.com/s/{profile.custom_slug}
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>Aucune statistique disponible</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
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
    fontSize: 14,
    color: '#666',
  },
  tabTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8E8E8E',
    letterSpacing: 1,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1A1A1A',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1A1A1A',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  slugContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    overflow: 'hidden',
  },
  slugPrefix: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#666',
    backgroundColor: '#F5F5F5',
  },
  slugInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1A1A1A',
    borderWidth: 0,
  },
  row: {
    flexDirection: 'row',
  },
  colorPickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorPreview: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  switchLabel: {
    fontSize: 14,
    color: '#1A1A1A',
  },
  addButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
  },
  postCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  postType: {
    fontSize: 12,
    color: '#666',
  },
  featuredBadge: {
    fontSize: 11,
    color: '#FF9500',
    fontWeight: '600',
  },
  postTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  postCaption: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  postStats: {
    flexDirection: 'row',
    gap: 16,
  },
  postStat: {
    fontSize: 12,
    color: '#666',
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#007AFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#666',
  },
  publicLinkCard: {
    backgroundColor: '#E3F2FD',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  publicLinkLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  publicLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
});
