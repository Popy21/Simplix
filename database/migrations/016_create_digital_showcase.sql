-- Migration 016: Digital Showcase Schema
-- Description: Tables pour la vitrine numérique publique (profil Instagram-like pour vente)
-- Author: Team Simplix
-- Date: 2025-10-28

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE showcase_post_type AS ENUM ('post', 'product');
CREATE TYPE showcase_theme AS ENUM ('light', 'dark', 'custom');

-- ============================================================================
-- TABLE: showcase_profiles
-- Description: Profils publics de vitrine pour chaque organisation
-- ============================================================================
CREATE TABLE showcase_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Profil Information
    display_name VARCHAR(255) NOT NULL,
    bio TEXT,
    profile_image_url TEXT,
    cover_image_url TEXT,

    -- Custom URL
    custom_slug VARCHAR(100) UNIQUE NOT NULL, -- Ex: monentreprise

    -- Branding & Theme
    theme showcase_theme DEFAULT 'light',
    primary_color VARCHAR(7) DEFAULT '#007AFF', -- Hex color
    secondary_color VARCHAR(7) DEFAULT '#FFFFFF',
    font_family VARCHAR(100) DEFAULT 'sans-serif',

    -- SEO & GEO
    seo_title VARCHAR(255),
    seo_description TEXT,
    seo_keywords TEXT[],
    meta_tags JSONB DEFAULT '{}',

    -- Geo Localisation
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),

    -- Contact Info
    email VARCHAR(255),
    phone VARCHAR(50),
    website_url VARCHAR(255),

    -- Social Links
    social_links JSONB DEFAULT '{}', -- {instagram, facebook, twitter, linkedin, etc.}

    -- Settings
    is_published BOOLEAN DEFAULT false,
    show_reviews BOOLEAN DEFAULT true,
    show_contact_button BOOLEAN DEFAULT true,
    allow_direct_purchase BOOLEAN DEFAULT true,

    -- Stats (denormalized for performance)
    total_views INTEGER DEFAULT 0,
    total_likes INTEGER DEFAULT 0,
    average_rating DECIMAL(3, 2) DEFAULT 0.00,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE,

    -- Indexes
    CONSTRAINT showcase_profiles_org_unique UNIQUE (organization_id)
);

CREATE INDEX idx_showcase_profiles_slug ON showcase_profiles(custom_slug);
CREATE INDEX idx_showcase_profiles_published ON showcase_profiles(is_published, deleted_at);
CREATE INDEX idx_showcase_profiles_geo ON showcase_profiles(latitude, longitude);

-- ============================================================================
-- TABLE: showcase_posts
-- Description: Posts et produits affichés sur la vitrine
-- ============================================================================
CREATE TABLE showcase_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    showcase_profile_id UUID NOT NULL REFERENCES showcase_profiles(id) ON DELETE CASCADE,

    -- Type
    post_type showcase_post_type NOT NULL,

    -- Product Reference (if post_type = 'product')
    product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,

    -- Post Content (if post_type = 'post')
    title VARCHAR(255),
    caption TEXT,
    media_urls TEXT[], -- Array of image/video URLs

    -- Display Order
    display_order INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT false,
    is_visible BOOLEAN DEFAULT true,

    -- Stats
    views_count INTEGER DEFAULT 0,
    likes_count INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_showcase_posts_profile ON showcase_posts(showcase_profile_id, deleted_at);
CREATE INDEX idx_showcase_posts_order ON showcase_posts(showcase_profile_id, display_order);
CREATE INDEX idx_showcase_posts_type ON showcase_posts(post_type);
CREATE INDEX idx_showcase_posts_product ON showcase_posts(product_id);

-- ============================================================================
-- TABLE: showcase_reviews
-- Description: Avis et notes clients sur la vitrine
-- ============================================================================
CREATE TABLE showcase_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    showcase_profile_id UUID NOT NULL REFERENCES showcase_profiles(id) ON DELETE CASCADE,

    -- Customer Info
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255),
    customer_avatar_url TEXT,

    -- Review Content
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(255),
    comment TEXT,

    -- Moderation
    is_approved BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_showcase_reviews_profile ON showcase_reviews(showcase_profile_id, deleted_at);
CREATE INDEX idx_showcase_reviews_approved ON showcase_reviews(is_approved, deleted_at);

-- ============================================================================
-- TABLE: showcase_analytics
-- Description: Analytics et tracking des visites de la vitrine
-- ============================================================================
CREATE TABLE showcase_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    showcase_profile_id UUID NOT NULL REFERENCES showcase_profiles(id) ON DELETE CASCADE,

    -- Event Details
    event_type VARCHAR(50) NOT NULL, -- 'view', 'like', 'click_product', 'click_contact', etc.
    event_data JSONB DEFAULT '{}',

    -- Visitor Info
    visitor_ip VARCHAR(45),
    visitor_country VARCHAR(100),
    visitor_city VARCHAR(100),
    visitor_device VARCHAR(100),
    visitor_browser VARCHAR(100),

    -- Referrer
    referrer_url TEXT,
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(100),

    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_showcase_analytics_profile ON showcase_analytics(showcase_profile_id, created_at);
CREATE INDEX idx_showcase_analytics_event ON showcase_analytics(event_type, created_at);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger to update updated_at on showcase_profiles
CREATE OR REPLACE FUNCTION update_showcase_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER showcase_profiles_updated_at
    BEFORE UPDATE ON showcase_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_showcase_profiles_updated_at();

-- Trigger to update updated_at on showcase_posts
CREATE OR REPLACE FUNCTION update_showcase_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER showcase_posts_updated_at
    BEFORE UPDATE ON showcase_posts
    FOR EACH ROW
    EXECUTE FUNCTION update_showcase_posts_updated_at();

-- Trigger to update average_rating on showcase_profiles when review added/updated
CREATE OR REPLACE FUNCTION update_showcase_profile_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE showcase_profiles
    SET average_rating = (
        SELECT AVG(rating)::DECIMAL(3,2)
        FROM showcase_reviews
        WHERE showcase_profile_id = COALESCE(NEW.showcase_profile_id, OLD.showcase_profile_id)
        AND is_approved = true
        AND deleted_at IS NULL
    )
    WHERE id = COALESCE(NEW.showcase_profile_id, OLD.showcase_profile_id);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER showcase_reviews_rating_update
    AFTER INSERT OR UPDATE OR DELETE ON showcase_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_showcase_profile_rating();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE showcase_profiles IS 'Profils publics de vitrine numérique (Instagram-like pour vente)';
COMMENT ON TABLE showcase_posts IS 'Posts et produits affichés sur la vitrine';
COMMENT ON TABLE showcase_reviews IS 'Avis et notes clients';
COMMENT ON TABLE showcase_analytics IS 'Analytics et tracking des visites';

COMMENT ON COLUMN showcase_profiles.custom_slug IS 'URL personnalisée: simplix.com/s/[custom_slug]';
COMMENT ON COLUMN showcase_profiles.is_published IS 'Si false, la vitrine n''est pas accessible publiquement';
COMMENT ON COLUMN showcase_posts.post_type IS 'Type: post (contenu éditorial) ou product (produit du catalogue)';
