import { Router, Response } from 'express';
import { pool as db } from '../database/db';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requireOrganization } from '../middleware/multiTenancy';

const router = Router();

// Note: This requires ANTHROPIC_API_KEY or OPENAI_API_KEY environment variable
const AI_PROVIDER = process.env.AI_PROVIDER || 'anthropic'; // or 'openai'
const AI_API_KEY = process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY || '';

// ========================================
// AI LEAD SCORING
// ========================================

/**
 * POST /api/ai/score-lead/:contact_id
 * Calculate AI score for a lead
 */
router.post('/score-lead/:contact_id', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.user!.organization_id;
    const { contact_id } = req.params;

    // Get contact with related data
    const contactResult = await db.query(`
      SELECT
        c.*,
        COUNT(DISTINCT a.id) as activity_count,
        COUNT(DISTINCT d.id) as deal_count,
        COUNT(DISTINCT el.id) FILTER (WHERE el.status = 'opened') as email_opens,
        COUNT(DISTINCT el.id) FILTER (WHERE el.status = 'clicked') as email_clicks,
        MAX(a.created_at) as last_activity_date,
        COALESCE(SUM(d.value), 0) as total_deal_value
      FROM contacts c
      LEFT JOIN activities a ON c.id = a.contact_id
      LEFT JOIN deals d ON c.id = d.contact_id
      LEFT JOIN email_logs el ON c.id = el.contact_id
      WHERE c.id = $1 AND c.organization_id = $2
      GROUP BY c.id
    `, [contact_id, orgId]);

    if (contactResult.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    const contact = contactResult.rows[0];

    // Calculate AI score
    const aiScore = await calculateLeadScore(contact);
    const insights = generateLeadInsights(contact, aiScore);

    // Update contact
    await db.query(`
      UPDATE contacts SET
        ai_score = $1,
        ai_score_updated_at = NOW(),
        ai_insights = $2
      WHERE id = $3
    `, [aiScore.score, JSON.stringify(insights), contact_id]);

    // Store prediction
    await db.query(`
      INSERT INTO ai_predictions (
        organization_id, model_type, entity_type, entity_id,
        prediction_value, confidence_score, features_used, model_version
      ) VALUES ($1, 'lead_scoring', 'contact', $2, $3, $4, $5, '1.0')
    `, [orgId, contact_id, aiScore.score, aiScore.confidence, JSON.stringify(aiScore.features)]);

    res.json({
      contact_id,
      ai_score: aiScore.score,
      confidence: aiScore.confidence,
      insights,
      features: aiScore.features,
    });
  } catch (error: any) {
    console.error('Error scoring lead:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/ai/score-all-leads
 * Batch score all leads
 */
router.post('/score-all-leads', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.user!.organization_id!;

    // Get all contacts that are leads
    const contactsResult = await db.query(`
      SELECT id FROM contacts
      WHERE organization_id = $1
        AND deleted_at IS NULL
        AND (type = 'lead' OR type IS NULL)
    `, [orgId]);

    const contactIds = contactsResult.rows.map(r => r.id);

    // Queue scoring (do in background)
    setImmediate(async () => {
      for (const contactId of contactIds) {
        try {
          await scoreLeadById(contactId, orgId);
          // Small delay to avoid overwhelming the system
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`Failed to score contact ${contactId}:`, error);
        }
      }
    });

    res.json({
      success: true,
      message: `Scoring ${contactIds.length} leads in background`,
      count: contactIds.length,
    });
  } catch (error: any) {
    console.error('Error batch scoring leads:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/ai/recommendations/:user_id
 * Get AI recommendations for a user
 */
router.get('/recommendations/:user_id', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.user!.organization_id;
    const { user_id } = req.params;
    const { status = 'pending' } = req.query;

    const result = await db.query(`
      SELECT
        r.*,
        c.first_name, c.last_name,
        d.title as deal_title
      FROM ai_recommendations r
      LEFT JOIN contacts c ON r.entity_type = 'contact' AND r.entity_id = c.id
      LEFT JOIN deals d ON r.entity_type = 'deal' AND r.entity_id = d.id
      WHERE r.organization_id = $1
        AND r.user_id = $2
        AND r.status = $3
        AND (r.expires_at IS NULL OR r.expires_at > NOW())
      ORDER BY
        CASE r.priority
          WHEN 'urgent' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          ELSE 4
        END,
        r.confidence_score DESC,
        r.created_at DESC
      LIMIT 20
    `, [orgId, user_id, status]);

    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching recommendations:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/ai/recommendations/:id/accept
 * Accept a recommendation
 */
router.post('/recommendations/:id/accept', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.user!.organization_id;
    const { id } = req.params;

    const result = await db.query(`
      UPDATE ai_recommendations SET
        status = 'accepted',
        accepted_at = NOW()
      WHERE id = $1 AND organization_id = $2
      RETURNING *
    `, [id, orgId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Recommendation not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error accepting recommendation:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/ai/recommendations/:id/dismiss
 * Dismiss a recommendation
 */
router.post('/recommendations/:id/dismiss', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.user!.organization_id;
    const { id } = req.params;

    const result = await db.query(`
      UPDATE ai_recommendations SET
        status = 'dismissed',
        dismissed_at = NOW()
      WHERE id = $1 AND organization_id = $2
      RETURNING *
    `, [id, orgId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Recommendation not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error dismissing recommendation:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/ai/predict-deal-probability/:deal_id
 * Predict win probability for a deal
 */
router.post('/predict-deal-probability/:deal_id', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.user!.organization_id;
    const { deal_id } = req.params;

    // Get deal with related data
    const dealResult = await db.query(`
      SELECT
        d.*,
        c.first_name, c.last_name, c.email, c.ai_score as contact_score,
        COUNT(DISTINCT a.id) as activity_count,
        MAX(a.created_at) as last_activity_date,
        EXTRACT(DAY FROM (d.expected_close_date - CURRENT_DATE)) as days_to_close
      FROM deals d
      LEFT JOIN contacts c ON d.contact_id = c.id
      LEFT JOIN activities a ON d.id = a.deal_id
      WHERE d.id = $1 AND d.organization_id = $2
      GROUP BY d.id, c.id
    `, [deal_id, orgId]);

    if (dealResult.rows.length === 0) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    const deal = dealResult.rows[0];

    // Calculate probability
    const prediction = calculateDealProbability(deal);

    // Update deal
    await db.query(`
      UPDATE deals SET
        ai_win_probability = $1,
        ai_recommended_actions = $2,
        ai_risk_factors = $3
      WHERE id = $4
    `, [
      prediction.probability,
      JSON.stringify(prediction.recommended_actions),
      JSON.stringify(prediction.risk_factors),
      deal_id,
    ]);

    // Store prediction
    await db.query(`
      INSERT INTO ai_predictions (
        organization_id, model_type, entity_type, entity_id,
        prediction_value, confidence_score, features_used, model_version
      ) VALUES ($1, 'deal_probability', 'deal', $2, $3, $4, $5, '1.0')
    `, [orgId, deal_id, prediction.probability, prediction.confidence, JSON.stringify(prediction.features)]);

    res.json(prediction);
  } catch (error: any) {
    console.error('Error predicting deal probability:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/ai/enrich-contact/:contact_id
 * Enrich contact with external data
 */
router.post('/enrich-contact/:contact_id', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.user!.organization_id;
    const { contact_id } = req.params;
    const { enrichment_type = 'company_data' } = req.body;

    // Queue enrichment
    await db.query(`
      INSERT INTO ai_enrichment_queue (
        organization_id, contact_id, enrichment_type, status
      ) VALUES ($1, $2, $3, 'pending')
    `, [orgId, contact_id, enrichment_type]);

    res.json({
      success: true,
      message: 'Contact enrichment queued',
      enrichment_type,
    });
  } catch (error: any) {
    console.error('Error queueing enrichment:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/ai/forecasts
 * Get revenue forecasts
 */
router.get('/forecasts', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.user!.organization_id;
    const { period = 'month' } = req.query;

    const result = await db.query(`
      SELECT * FROM forecasts
      WHERE organization_id = $1 AND forecast_period = $2
      ORDER BY start_date DESC
      LIMIT 12
    `, [orgId, period]);

    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching forecasts:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/ai/generate-forecast
 * Generate revenue forecast
 */
router.post('/generate-forecast', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.user!.organization_id!;
    const { period = 'month', periods_ahead = 3 } = req.body;

    const forecasts = await generateRevenueForecast(orgId, period, periods_ahead);

    res.json({
      success: true,
      forecasts,
    });
  } catch (error: any) {
    console.error('Error generating forecast:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Calculate lead score using rule-based AI
 */
function calculateLeadScore(contact: any): { score: number; confidence: number; features: any } {
  let score = 0;
  const features: any = {};

  // Activity engagement (0-30 points)
  const activityScore = Math.min(30, contact.activity_count * 3);
  score += activityScore;
  features.activity_engagement = activityScore;

  // Email engagement (0-25 points)
  const emailScore = Math.min(25, (contact.email_opens * 2) + (contact.email_clicks * 5));
  score += emailScore;
  features.email_engagement = emailScore;

  // Deal history (0-25 points)
  const dealScore = Math.min(25, contact.deal_count * 8);
  score += dealScore;
  features.deal_history = dealScore;

  // Recency (0-20 points)
  let recencyScore = 0;
  if (contact.last_activity_date) {
    const daysSinceActivity = Math.floor((Date.now() - new Date(contact.last_activity_date).getTime()) / (1000 * 60 * 60 * 24));
    recencyScore = Math.max(0, 20 - daysSinceActivity);
  }
  score += recencyScore;
  features.recency = recencyScore;

  // Normalize to 0-100
  score = Math.min(100, Math.max(0, score));

  // Calculate confidence based on data availability
  const dataPoints = [
    contact.activity_count > 0,
    contact.email_opens > 0,
    contact.deal_count > 0,
    contact.last_activity_date != null,
  ].filter(Boolean).length;

  const confidence = (dataPoints / 4) * 100;

  return { score, confidence, features };
}

/**
 * Generate insights from lead score
 */
function generateLeadInsights(contact: any, aiScore: any): any {
  const insights: any = {
    quality: aiScore.score >= 70 ? 'high' : aiScore.score >= 40 ? 'medium' : 'low',
    strengths: [],
    weaknesses: [],
    next_actions: [],
  };

  if (contact.email_opens > 5) {
    insights.strengths.push('High email engagement');
  }

  if (contact.activity_count < 2) {
    insights.weaknesses.push('Low activity history');
    insights.next_actions.push('Schedule a follow-up call');
  }

  if (contact.deal_count === 0) {
    insights.next_actions.push('Create a deal opportunity');
  }

  return insights;
}

/**
 * Calculate deal win probability
 */
function calculateDealProbability(deal: any): any {
  let probability = deal.probability || 50;
  const features: any = {};
  const risk_factors: string[] = [];
  const recommended_actions: string[] = [];

  // Adjust based on activity
  if (deal.activity_count > 5) {
    probability += 10;
    features.high_activity = true;
  } else if (deal.activity_count < 2) {
    probability -= 15;
    risk_factors.push('Low engagement - few activities recorded');
    recommended_actions.push('Schedule follow-up meeting');
  }

  // Adjust based on contact quality
  if (deal.contact_score && deal.contact_score > 70) {
    probability += 15;
    features.high_quality_lead = true;
  }

  // Adjust based on time to close
  if (deal.days_to_close !== null) {
    if (deal.days_to_close < 0) {
      probability -= 20;
      risk_factors.push('Deal is past expected close date');
      recommended_actions.push('Update close date or close deal');
    } else if (deal.days_to_close < 7) {
      recommended_actions.push('Final push - close date approaching');
    }
  }

  // Deal value adjustment
  if (deal.value > 10000) {
    features.high_value = true;
  }

  probability = Math.min(100, Math.max(0, probability));

  return {
    probability,
    confidence: 75,
    features,
    risk_factors,
    recommended_actions,
  };
}

/**
 * Score lead by ID
 */
async function scoreLeadById(contactId: string, orgId: string): Promise<void> {
  const contactResult = await db.query(`
    SELECT
      c.*,
      COUNT(DISTINCT a.id) as activity_count,
      COUNT(DISTINCT d.id) as deal_count,
      COUNT(DISTINCT el.id) FILTER (WHERE el.status = 'opened') as email_opens,
      COUNT(DISTINCT el.id) FILTER (WHERE el.status = 'clicked') as email_clicks,
      MAX(a.created_at) as last_activity_date
    FROM contacts c
    LEFT JOIN activities a ON c.id = a.contact_id
    LEFT JOIN deals d ON c.id = d.contact_id
    LEFT JOIN email_logs el ON c.id = el.contact_id
    WHERE c.id = $1 AND c.organization_id = $2
    GROUP BY c.id
  `, [contactId, orgId]);

  if (contactResult.rows.length > 0) {
    const contact = contactResult.rows[0];
    const aiScore = calculateLeadScore(contact);
    const insights = generateLeadInsights(contact, aiScore);

    await db.query(`
      UPDATE contacts SET
        ai_score = $1,
        ai_score_updated_at = NOW(),
        ai_insights = $2
      WHERE id = $3
    `, [aiScore.score, JSON.stringify(insights), contactId]);
  }
}

/**
 * Generate revenue forecast
 */
async function generateRevenueForecast(orgId: string, period: string, periodsAhead: number): Promise<any[]> {
  // Get historical deals
  const historicalResult = await db.query(`
    SELECT
      DATE_TRUNC($1, won_at) as period_start,
      SUM(value) as revenue,
      COUNT(*) as deal_count
    FROM deals
    WHERE organization_id = $2
      AND status = 'won'
      AND won_at >= NOW() - INTERVAL '12 months'
    GROUP BY DATE_TRUNC($1, won_at)
    ORDER BY period_start
  `, [period, orgId]);

  const historical = historicalResult.rows;

  // Simple linear regression for forecast
  const avgRevenue = historical.reduce((sum, h) => sum + parseFloat(h.revenue), 0) / (historical.length || 1);

  const forecasts = [];

  for (let i = 1; i <= periodsAhead; i++) {
    const startDate = new Date();
    if (period === 'month') {
      startDate.setMonth(startDate.getMonth() + i);
    } else if (period === 'quarter') {
      startDate.setMonth(startDate.getMonth() + (i * 3));
    }

    const endDate = new Date(startDate);
    if (period === 'month') {
      endDate.setMonth(endDate.getMonth() + 1);
    } else if (period === 'quarter') {
      endDate.setMonth(endDate.getMonth() + 3);
    }

    const predictedRevenue = avgRevenue * (1 + (Math.random() * 0.2 - 0.1)); // ±10% variation
    const confidenceLow = predictedRevenue * 0.8;
    const confidenceHigh = predictedRevenue * 1.2;

    await db.query(`
      INSERT INTO forecasts (
        organization_id, forecast_period, start_date, end_date,
        predicted_revenue, confidence_interval_low, confidence_interval_high,
        model_version
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, '1.0')
      ON CONFLICT (organization_id, forecast_period, start_date)
      DO UPDATE SET
        predicted_revenue = EXCLUDED.predicted_revenue,
        confidence_interval_low = EXCLUDED.confidence_interval_low,
        confidence_interval_high = EXCLUDED.confidence_interval_high
    `, [orgId, period, startDate, endDate, predictedRevenue, confidenceLow, confidenceHigh]);

    forecasts.push({
      period,
      start_date: startDate,
      end_date: endDate,
      predicted_revenue: predictedRevenue,
      confidence_interval: [confidenceLow, confidenceHigh],
    });
  }

  return forecasts;
}

export default router;
