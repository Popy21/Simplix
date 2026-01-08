import express, { Request, Response } from 'express';
import { pool } from '../database/db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

// ============================================================================
// SHOWCASE PROFILES
// ============================================================================

// GET /api/showcase/profile - Get current organization's showcase profile
router.get('/profile', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user?.organization_id;

    const result = await pool.query(`
      SELECT
        id,
        organization_id,
        display_name,
        bio,
        profile_image_url,
        cover_image_url,
        custom_slug,
        theme,
        primary_color,
        secondary_color,
        font_family,
        seo_title,
        seo_description,
        seo_keywords,
        meta_tags,
        latitude,
        longitude,
        address,
        city,
        country,
        postal_code,
        email,
        phone,
        website_url,
        social_links,
        is_published,
        show_reviews,
        show_contact_button,
        allow_direct_purchase,
        total_views,
        total_likes,
        average_rating,
        created_at,
        updated_at,
        published_at
      FROM showcase_profiles
      WHERE organization_id = $1 AND deleted_at IS NULL
    `, [organizationId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Showcase profile not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error fetching showcase profile:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/showcase/profile - Create or update showcase profile
router.post('/profile', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user?.organization_id;
    const {
      display_name,
      bio,
      profile_image_url,
      cover_image_url,
      custom_slug,
      theme,
      primary_color,
      secondary_color,
      font_family,
      seo_title,
      seo_description,
      seo_keywords,
      meta_tags,
      latitude,
      longitude,
      address,
      city,
      country,
      postal_code,
      email,
      phone,
      website_url,
      social_links,
      is_published,
      show_reviews,
      show_contact_button,
      allow_direct_purchase
    } = req.body;

    // Check if profile already exists
    const existingProfile = await pool.query(
      'SELECT id FROM showcase_profiles WHERE organization_id = $1 AND deleted_at IS NULL',
      [organizationId]
    );

    let result;
    if (existingProfile.rows.length > 0) {
      // Update existing profile
      result = await pool.query(`
        UPDATE showcase_profiles
        SET
          display_name = COALESCE($1, display_name),
          bio = COALESCE($2, bio),
          profile_image_url = COALESCE($3, profile_image_url),
          cover_image_url = COALESCE($4, cover_image_url),
          custom_slug = COALESCE($5, custom_slug),
          theme = COALESCE($6, theme),
          primary_color = COALESCE($7, primary_color),
          secondary_color = COALESCE($8, secondary_color),
          font_family = COALESCE($9, font_family),
          seo_title = COALESCE($10, seo_title),
          seo_description = COALESCE($11, seo_description),
          seo_keywords = COALESCE($12, seo_keywords),
          meta_tags = COALESCE($13, meta_tags),
          latitude = COALESCE($14, latitude),
          longitude = COALESCE($15, longitude),
          address = COALESCE($16, address),
          city = COALESCE($17, city),
          country = COALESCE($18, country),
          postal_code = COALESCE($19, postal_code),
          email = COALESCE($20, email),
          phone = COALESCE($21, phone),
          website_url = COALESCE($22, website_url),
          social_links = COALESCE($23, social_links),
          is_published = COALESCE($24, is_published),
          show_reviews = COALESCE($25, show_reviews),
          show_contact_button = COALESCE($26, show_contact_button),
          allow_direct_purchase = COALESCE($27, allow_direct_purchase),
          published_at = CASE WHEN $24 = true AND is_published = false THEN CURRENT_TIMESTAMP ELSE published_at END,
          updated_at = CURRENT_TIMESTAMP
        WHERE organization_id = $28 AND deleted_at IS NULL
        RETURNING *
      `, [
        display_name, bio, profile_image_url, cover_image_url, custom_slug,
        theme, primary_color, secondary_color, font_family,
        seo_title, seo_description, seo_keywords, meta_tags,
        latitude, longitude, address, city, country, postal_code,
        email, phone, website_url, social_links,
        is_published, show_reviews, show_contact_button, allow_direct_purchase,
        organizationId
      ]);
    } else {
      // Create new profile
      result = await pool.query(`
        INSERT INTO showcase_profiles (
          organization_id,
          display_name,
          bio,
          profile_image_url,
          cover_image_url,
          custom_slug,
          theme,
          primary_color,
          secondary_color,
          font_family,
          seo_title,
          seo_description,
          seo_keywords,
          meta_tags,
          latitude,
          longitude,
          address,
          city,
          country,
          postal_code,
          email,
          phone,
          website_url,
          social_links,
          is_published,
          show_reviews,
          show_contact_button,
          allow_direct_purchase,
          published_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
          $21, $22, $23, $24, $25, $26, $27, $28,
          CASE WHEN $25 = true THEN CURRENT_TIMESTAMP ELSE NULL END
        )
        RETURNING *
      `, [
        organizationId,
        display_name,
        bio,
        profile_image_url,
        cover_image_url,
        custom_slug,
        theme || 'light',
        primary_color || '#007AFF',
        secondary_color || '#FFFFFF',
        font_family || 'sans-serif',
        seo_title,
        seo_description,
        seo_keywords,
        meta_tags || {},
        latitude,
        longitude,
        address,
        city,
        country,
        postal_code,
        email,
        phone,
        website_url,
        social_links || {},
        is_published || false,
        show_reviews !== undefined ? show_reviews : true,
        show_contact_button !== undefined ? show_contact_button : true,
        allow_direct_purchase !== undefined ? allow_direct_purchase : true
      ]);
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error saving showcase profile:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Custom slug already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// SHOWCASE POSTS
// ============================================================================

// GET /api/showcase/posts - Get all posts for current organization
router.get('/posts', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user?.organization_id;

    // Get profile first
    const profileResult = await pool.query(
      'SELECT id FROM showcase_profiles WHERE organization_id = $1 AND deleted_at IS NULL',
      [organizationId]
    );

    if (profileResult.rows.length === 0) {
      return res.json([]);
    }

    const profileId = profileResult.rows[0].id;

    const result = await pool.query(`
      SELECT
        sp.id,
        sp.showcase_profile_id,
        sp.post_type,
        sp.product_id,
        sp.title,
        sp.caption,
        sp.media_urls,
        sp.display_order,
        sp.is_featured,
        sp.is_visible,
        sp.views_count,
        sp.likes_count,
        sp.created_at,
        sp.updated_at,
        p.name as product_name,
        p.price as product_price,
        p.image_url as product_image_url
      FROM showcase_posts sp
      LEFT JOIN products p ON sp.product_id = p.id AND p.deleted_at IS NULL
      WHERE sp.showcase_profile_id = $1 AND sp.deleted_at IS NULL
      ORDER BY sp.display_order ASC, sp.created_at DESC
    `, [profileId]);

    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching showcase posts:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/showcase/posts - Create a new post
router.post('/posts', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user?.organization_id;
    const {
      post_type,
      product_id,
      title,
      caption,
      media_urls,
      display_order,
      is_featured,
      is_visible
    } = req.body;

    // Get profile
    const profileResult = await pool.query(
      'SELECT id FROM showcase_profiles WHERE organization_id = $1 AND deleted_at IS NULL',
      [organizationId]
    );

    if (profileResult.rows.length === 0) {
      return res.status(404).json({ error: 'Showcase profile not found. Create one first.' });
    }

    const profileId = profileResult.rows[0].id;

    const result = await pool.query(`
      INSERT INTO showcase_posts (
        showcase_profile_id,
        post_type,
        product_id,
        title,
        caption,
        media_urls,
        display_order,
        is_featured,
        is_visible
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      profileId,
      post_type,
      product_id,
      title,
      caption,
      media_urls || [],
      display_order || 0,
      is_featured || false,
      is_visible !== undefined ? is_visible : true
    ]);

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Error creating showcase post:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/showcase/posts/:id - Update a post
router.put('/posts/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      title,
      caption,
      media_urls,
      display_order,
      is_featured,
      is_visible
    } = req.body;

    const result = await pool.query(`
      UPDATE showcase_posts
      SET
        title = COALESCE($1, title),
        caption = COALESCE($2, caption),
        media_urls = COALESCE($3, media_urls),
        display_order = COALESCE($4, display_order),
        is_featured = COALESCE($5, is_featured),
        is_visible = COALESCE($6, is_visible),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7 AND deleted_at IS NULL
      RETURNING *
    `, [title, caption, media_urls, display_order, is_featured, is_visible, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error updating showcase post:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/showcase/posts/:id - Delete a post
router.delete('/posts/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      UPDATE showcase_posts
      SET deleted_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING id
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.json({ message: 'Post deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting showcase post:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// SHOWCASE REVIEWS
// ============================================================================

// GET /api/showcase/reviews - Get all reviews for current organization
router.get('/reviews', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user?.organization_id;

    const profileResult = await pool.query(
      'SELECT id FROM showcase_profiles WHERE organization_id = $1 AND deleted_at IS NULL',
      [organizationId]
    );

    if (profileResult.rows.length === 0) {
      return res.json([]);
    }

    const profileId = profileResult.rows[0].id;

    const result = await pool.query(`
      SELECT
        id,
        showcase_profile_id,
        customer_name,
        customer_email,
        customer_avatar_url,
        rating,
        title,
        comment,
        is_approved,
        is_featured,
        created_at,
        updated_at
      FROM showcase_reviews
      WHERE showcase_profile_id = $1 AND deleted_at IS NULL
      ORDER BY created_at DESC
    `, [profileId]);

    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching showcase reviews:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/showcase/reviews/:id/approve - Approve/reject a review
router.put('/reviews/:id/approve', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { is_approved } = req.body;

    const result = await pool.query(`
      UPDATE showcase_reviews
      SET
        is_approved = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND deleted_at IS NULL
      RETURNING *
    `, [is_approved, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error approving review:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// PUBLIC ROUTES (No authentication required)
// ============================================================================

// GET /api/showcase/public/:slug - Get public showcase by slug
router.get('/public/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;

    const result = await pool.query(`
      SELECT
        id,
        display_name,
        bio,
        profile_image_url,
        cover_image_url,
        custom_slug,
        theme,
        primary_color,
        secondary_color,
        font_family,
        seo_title,
        seo_description,
        seo_keywords,
        latitude,
        longitude,
        address,
        city,
        country,
        email,
        phone,
        website_url,
        social_links,
        show_reviews,
        show_contact_button,
        allow_direct_purchase,
        total_views,
        average_rating
      FROM showcase_profiles
      WHERE custom_slug = $1 AND is_published = true AND deleted_at IS NULL
    `, [slug]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Showcase not found' });
    }

    // Increment view count
    await pool.query(
      'UPDATE showcase_profiles SET total_views = total_views + 1 WHERE id = $1',
      [result.rows[0].id]
    );

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error fetching public showcase:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/showcase/public/:slug/posts - Get public posts
router.get('/public/:slug/posts', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;

    const profileResult = await pool.query(
      'SELECT id FROM showcase_profiles WHERE custom_slug = $1 AND is_published = true AND deleted_at IS NULL',
      [slug]
    );

    if (profileResult.rows.length === 0) {
      return res.status(404).json({ error: 'Showcase not found' });
    }

    const profileId = profileResult.rows[0].id;

    const result = await pool.query(`
      SELECT
        sp.id,
        sp.post_type,
        sp.product_id,
        sp.title,
        sp.caption,
        sp.media_urls,
        sp.is_featured,
        sp.views_count,
        sp.likes_count,
        sp.created_at,
        p.name as product_name,
        p.description as product_description,
        p.price as product_price,
        p.image_url as product_image_url,
        p.stock_quantity as product_stock
      FROM showcase_posts sp
      LEFT JOIN products p ON sp.product_id = p.id AND p.deleted_at IS NULL
      WHERE sp.showcase_profile_id = $1
        AND sp.is_visible = true
        AND sp.deleted_at IS NULL
      ORDER BY sp.is_featured DESC, sp.display_order ASC, sp.created_at DESC
    `, [profileId]);

    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching public posts:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/showcase/public/:slug/reviews - Get approved reviews
router.get('/public/:slug/reviews', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;

    const profileResult = await pool.query(
      'SELECT id FROM showcase_profiles WHERE custom_slug = $1 AND is_published = true AND deleted_at IS NULL',
      [slug]
    );

    if (profileResult.rows.length === 0) {
      return res.status(404).json({ error: 'Showcase not found' });
    }

    const profileId = profileResult.rows[0].id;

    const result = await pool.query(`
      SELECT
        customer_name,
        customer_avatar_url,
        rating,
        title,
        comment,
        created_at
      FROM showcase_reviews
      WHERE showcase_profile_id = $1
        AND is_approved = true
        AND deleted_at IS NULL
      ORDER BY is_featured DESC, created_at DESC
      LIMIT 50
    `, [profileId]);

    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching public reviews:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// SHOWCASE CONFIG & ROOT
// ============================================================================

// GET / - Get showcase overview
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user?.organization_id;

    // Get profile with stats
    const profileResult = await pool.query(`
      SELECT
        sp.*,
        (SELECT COUNT(*) FROM showcase_posts WHERE showcase_profile_id = sp.id AND deleted_at IS NULL) as posts_count,
        (SELECT COUNT(*) FROM showcase_reviews WHERE showcase_profile_id = sp.id AND deleted_at IS NULL) as reviews_count
      FROM showcase_profiles sp
      WHERE sp.organization_id = $1 AND sp.deleted_at IS NULL
    `, [organizationId]);

    if (profileResult.rows.length === 0) {
      return res.json({
        has_profile: false,
        message: 'No showcase profile configured'
      });
    }

    const profile = profileResult.rows[0];

    // Get recent posts
    const postsResult = await pool.query(`
      SELECT id, title, post_type, media_urls, is_featured, views_count, likes_count, created_at
      FROM showcase_posts
      WHERE showcase_profile_id = $1 AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 5
    `, [profile.id]);

    res.json({
      has_profile: true,
      profile: {
        id: profile.id,
        display_name: profile.display_name,
        custom_slug: profile.custom_slug,
        is_published: profile.is_published,
        total_views: profile.total_views,
        average_rating: profile.average_rating,
        posts_count: parseInt(profile.posts_count),
        reviews_count: parseInt(profile.reviews_count)
      },
      recent_posts: postsResult.rows
    });
  } catch (error: any) {
    console.error('Error fetching showcase overview:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /config - Get showcase configuration
router.get('/config', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user?.organization_id;

    const result = await pool.query(`
      SELECT
        id,
        display_name,
        custom_slug,
        theme,
        primary_color,
        secondary_color,
        font_family,
        seo_title,
        seo_description,
        is_published,
        show_reviews,
        show_contact_button,
        allow_direct_purchase
      FROM showcase_profiles
      WHERE organization_id = $1 AND deleted_at IS NULL
    `, [organizationId]);

    if (result.rows.length === 0) {
      return res.json({
        configured: false,
        config: {
          theme: 'default',
          primary_color: '#4f46e5',
          secondary_color: '#10b981',
          font_family: 'Inter',
          show_reviews: true,
          show_contact_button: true,
          allow_direct_purchase: false
        }
      });
    }

    res.json({
      configured: true,
      config: result.rows[0]
    });
  } catch (error: any) {
    console.error('Error fetching showcase config:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
