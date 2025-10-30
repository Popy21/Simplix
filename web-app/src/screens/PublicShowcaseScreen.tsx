import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Linking,
  Dimensions,
  Platform
} from 'react-native';
import { API_URL } from '../config/api';

const { width } = Dimensions.get('window');

interface PublicShowcaseProps {
  route: {
    params: {
      slug: string;
    };
  };
}

interface ShowcaseProfile {
  id: string;
  display_name: string;
  bio: string;
  profile_image_url: string;
  cover_image_url: string;
  custom_slug: string;
  theme: 'light' | 'dark' | 'custom';
  primary_color: string;
  secondary_color: string;
  address: string;
  city: string;
  country: string;
  email: string;
  phone: string;
  website_url: string;
  social_links: any;
  show_reviews: boolean;
  show_contact_button: boolean;
  allow_direct_purchase: boolean;
  total_views: number;
  average_rating: number;
}

interface ShowcasePost {
  id: string;
  post_type: 'post' | 'product';
  title: string;
  caption: string;
  media_urls: string[];
  is_featured: boolean;
  product_name?: string;
  product_description?: string;
  product_price?: number;
  product_image_url?: string;
  product_stock?: number;
}

interface Review {
  customer_name: string;
  customer_avatar_url: string;
  rating: number;
  title: string;
  comment: string;
  created_at: string;
}

export default function PublicShowcaseScreen({ route }: PublicShowcaseProps) {
  const { slug } = route.params;
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ShowcaseProfile | null>(null);
  const [posts, setPosts] = useState<ShowcasePost[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadShowcaseData();
  }, [slug]);

  const loadShowcaseData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load profile
      const profileResponse = await fetch(`${API_URL}/showcase/public/${slug}`);
      if (!profileResponse.ok) {
        throw new Error('Vitrine non trouvée');
      }
      const profileData = await profileResponse.json();
      setProfile(profileData);

      // Load posts
      const postsResponse = await fetch(`${API_URL}/showcase/public/${slug}/posts`);
      if (postsResponse.ok) {
        const postsData = await postsResponse.json();
        setPosts(postsData);
      }

      // Load reviews
      if (profileData.show_reviews) {
        const reviewsResponse = await fetch(`${API_URL}/showcase/public/${slug}/reviews`);
        if (reviewsResponse.ok) {
          const reviewsData = await reviewsResponse.json();
          setReviews(reviewsData);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleContact = () => {
    if (profile?.phone) {
      Linking.openURL(`tel:${profile.phone}`);
    } else if (profile?.email) {
      Linking.openURL(`mailto:${profile.email}`);
    }
  };

  const handleWebsite = () => {
    if (profile?.website_url) {
      Linking.openURL(profile.website_url);
    }
  };

  const renderStars = (rating: number) => {
    return '⭐'.repeat(Math.floor(rating));
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error || 'Vitrine non trouvée'}</Text>
      </View>
    );
  }

  const primaryColor = profile.primary_color || '#007AFF';
  const isDarkTheme = profile.theme === 'dark';

  return (
    <ScrollView
      style={[
        styles.container,
        { backgroundColor: isDarkTheme ? '#1A1A1A' : '#FFFFFF' }
      ]}
    >
      {/* Cover Image */}
      {profile.cover_image_url && (
        <Image
          source={{ uri: profile.cover_image_url }}
          style={styles.coverImage}
          resizeMode="cover"
        />
      )}

      {/* Profile Header */}
      <View style={styles.profileHeader}>
        {profile.profile_image_url ? (
          <Image
            source={{ uri: profile.profile_image_url }}
            style={styles.profileImage}
          />
        ) : (
          <View style={[styles.profileImagePlaceholder, { backgroundColor: primaryColor }]}>
            <Text style={styles.profileImagePlaceholderText}>
              {profile.display_name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

        <Text style={[styles.displayName, { color: isDarkTheme ? '#FFFFFF' : '#1A1A1A' }]}>
          {profile.display_name}
        </Text>

        {profile.bio && (
          <Text style={[styles.bio, { color: isDarkTheme ? '#CCCCCC' : '#666666' }]}>
            {profile.bio}
          </Text>
        )}

        {/* Location */}
        {(profile.city || profile.country) && (
          <Text style={[styles.location, { color: isDarkTheme ? '#999999' : '#888888' }]}>
            📍 {[profile.city, profile.country].filter(Boolean).join(', ')}
          </Text>
        )}

        {/* Stats */}
        <View style={styles.statsRow}>
          {profile.show_reviews && profile.average_rating > 0 && (
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: isDarkTheme ? '#FFFFFF' : '#1A1A1A' }]}>
                {profile.average_rating.toFixed(1)}
              </Text>
              <Text style={[styles.statLabel, { color: isDarkTheme ? '#999999' : '#666666' }]}>
                {renderStars(profile.average_rating)}
              </Text>
            </View>
          )}
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: isDarkTheme ? '#FFFFFF' : '#1A1A1A' }]}>
              {posts.length}
            </Text>
            <Text style={[styles.statLabel, { color: isDarkTheme ? '#999999' : '#666666' }]}>
              Posts
            </Text>
          </View>
        </View>

        {/* Contact Buttons */}
        {profile.show_contact_button && (
          <View style={styles.contactButtons}>
            {(profile.phone || profile.email) && (
              <TouchableOpacity
                style={[styles.contactButton, { backgroundColor: primaryColor }]}
                onPress={handleContact}
              >
                <Text style={styles.contactButtonText}>📞 Contact</Text>
              </TouchableOpacity>
            )}
            {profile.website_url && (
              <TouchableOpacity
                style={[styles.contactButton, styles.websiteButton]}
                onPress={handleWebsite}
              >
                <Text style={[styles.contactButtonText, { color: primaryColor }]}>
                  🌐 Site Web
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Posts Grid (Instagram-like) */}
      {posts.length > 0 && (
        <View style={styles.postsSection}>
          <Text style={[styles.sectionTitle, { color: isDarkTheme ? '#FFFFFF' : '#1A1A1A' }]}>
            PUBLICATIONS
          </Text>
          <View style={styles.postsGrid}>
            {posts.map((post) => (
              <TouchableOpacity
                key={post.id}
                style={styles.postGridItem}
                activeOpacity={0.8}
              >
                {(post.media_urls?.[0] || post.product_image_url) ? (
                  <Image
                    source={{ uri: post.media_urls?.[0] || post.product_image_url }}
                    style={styles.postImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.postImagePlaceholder, { backgroundColor: primaryColor + '20' }]}>
                    <Text style={{ fontSize: 32 }}>
                      {post.post_type === 'product' ? '🛍️' : '📝'}
                    </Text>
                  </View>
                )}

                {/* Post overlay */}
                <View style={styles.postOverlay}>
                  <Text style={styles.postTitle} numberOfLines={2}>
                    {post.post_type === 'product' ? post.product_name : post.title}
                  </Text>
                  {post.post_type === 'product' && post.product_price && (
                    <Text style={styles.postPrice}>
                      {post.product_price.toFixed(2)} €
                    </Text>
                  )}
                </View>

                {post.is_featured && (
                  <View style={styles.featuredBadge}>
                    <Text style={styles.featuredBadgeText}>⭐</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Reviews Section */}
      {profile.show_reviews && reviews.length > 0 && (
        <View style={styles.reviewsSection}>
          <Text style={[styles.sectionTitle, { color: isDarkTheme ? '#FFFFFF' : '#1A1A1A' }]}>
            AVIS CLIENTS
          </Text>
          {reviews.slice(0, 10).map((review, index) => (
            <View
              key={index}
              style={[
                styles.reviewCard,
                {
                  backgroundColor: isDarkTheme ? '#2A2A2A' : '#F5F5F5',
                  borderColor: isDarkTheme ? '#3A3A3A' : '#E5E5E5'
                }
              ]}
            >
              <View style={styles.reviewHeader}>
                <View style={styles.reviewAuthor}>
                  {review.customer_avatar_url ? (
                    <Image
                      source={{ uri: review.customer_avatar_url }}
                      style={styles.reviewAvatar}
                    />
                  ) : (
                    <View style={[styles.reviewAvatarPlaceholder, { backgroundColor: primaryColor }]}>
                      <Text style={styles.reviewAvatarText}>
                        {review.customer_name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View>
                    <Text style={[styles.reviewName, { color: isDarkTheme ? '#FFFFFF' : '#1A1A1A' }]}>
                      {review.customer_name}
                    </Text>
                    <Text style={styles.reviewRating}>{renderStars(review.rating)}</Text>
                  </View>
                </View>
              </View>
              {review.title && (
                <Text style={[styles.reviewTitle, { color: isDarkTheme ? '#FFFFFF' : '#1A1A1A' }]}>
                  {review.title}
                </Text>
              )}
              {review.comment && (
                <Text style={[styles.reviewComment, { color: isDarkTheme ? '#CCCCCC' : '#666666' }]}>
                  {review.comment}
                </Text>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: isDarkTheme ? '#666666' : '#999999' }]}>
          Propulsé par Simplix CRM
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
  },
  coverImage: {
    width: '100%',
    height: 200,
  },
  profileHeader: {
    alignItems: 'center',
    padding: 24,
    paddingTop: 32,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  profileImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  profileImagePlaceholderText: {
    fontSize: 40,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  displayName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  bio: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
  },
  location: {
    fontSize: 13,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 32,
    marginBottom: 24,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  contactButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  contactButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  websiteButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  contactButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  postsSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 16,
  },
  postsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
  },
  postGridItem: {
    width: (width - 36) / 3,
    height: (width - 36) / 3,
    position: 'relative',
  },
  postImage: {
    width: '100%',
    height: '100%',
  },
  postImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  postOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 8,
  },
  postTitle: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  postPrice: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  featuredBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featuredBadgeText: {
    fontSize: 14,
  },
  reviewsSection: {
    padding: 16,
  },
  reviewCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reviewAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  reviewAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewAvatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  reviewName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  reviewRating: {
    fontSize: 12,
  },
  reviewTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  reviewComment: {
    fontSize: 13,
    lineHeight: 18,
  },
  footer: {
    padding: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
  },
});
