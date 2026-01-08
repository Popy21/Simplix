import { Router, Response } from 'express';
import Stripe from 'stripe';
import { pool as db } from '../database/db';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requireOrganization } from '../middleware/multiTenancy';

const router = Router();

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy', {
  apiVersion: '2025-10-29.clover',
});

// ========================================
// STRIPE PAYMENT METHODS
// ========================================

/**
 * POST /api/stripe/payment-methods
 * Create and attach a payment method to a customer
 */
router.post('/payment-methods', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.user!.organization_id!;
    const { customer_id, payment_method_id } = req.body;

    if (!customer_id || !payment_method_id) {
      return res.status(400).json({ error: 'customer_id and payment_method_id required' });
    }

    // Get customer
    const customerResult = await db.query(
      'SELECT * FROM customers WHERE id = $1 AND organization_id = $2',
      [customer_id, orgId]
    );

    if (customerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const customer = customerResult.rows[0];

    // Create Stripe customer if needed
    let stripeCustomerId = customer.stripe_customer_id;
    if (!stripeCustomerId) {
      if (!customer.email) {
        return res.status(400).json({ error: 'Customer email required for Stripe' });
      }
      const stripeCustomer = await stripe.customers.create({
        email: customer.email,
        name: customer.name,
        metadata: { customer_id: customer_id.toString(), organization_id: orgId },
      });
      stripeCustomerId = stripeCustomer.id;

      await db.query(
        'UPDATE customers SET stripe_customer_id = $1 WHERE id = $2',
        [stripeCustomerId, customer_id]
      );
    }

    // Attach payment method to customer
    await stripe.paymentMethods.attach(payment_method_id, {
      customer: stripeCustomerId,
    });

    // Get payment method details
    const paymentMethod = await stripe.paymentMethods.retrieve(payment_method_id);

    // Save to database
    const result = await db.query(`
      INSERT INTO payment_methods (
        organization_id, customer_id, stripe_payment_method_id,
        type, brand, last4, exp_month, exp_year, is_default
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      orgId,
      customer_id,
      payment_method_id,
      paymentMethod.type,
      paymentMethod.card?.brand || null,
      paymentMethod.card?.last4 || null,
      paymentMethod.card?.exp_month || null,
      paymentMethod.card?.exp_year || null,
      true,
    ]);

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error creating payment method:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/stripe/payment-methods
 * Get all payment methods for the organization
 */
router.get('/payment-methods', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.user!.organization_id!;

    const result = await db.query(`
      SELECT pm.*, c.name as customer_name, c.email as customer_email
      FROM payment_methods pm
      LEFT JOIN customers c ON pm.customer_id = c.id
      WHERE pm.organization_id = $1
      ORDER BY pm.created_at DESC
    `, [orgId]);

    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching payment methods:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/stripe/payment-methods/:customer_id
 * Get all payment methods for a customer
 */
router.get('/payment-methods/:customer_id', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.user!.organization_id!;
    const { customer_id } = req.params;

    const result = await db.query(`
      SELECT * FROM payment_methods
      WHERE customer_id = $1 AND organization_id = $2
      ORDER BY is_default DESC, created_at DESC
    `, [customer_id, orgId]);

    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching payment methods:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========================================
// STRIPE PAYMENT INTENTS
// ========================================

/**
 * POST /api/stripe/create-payment-intent
 * Create a Stripe Payment Intent
 */
router.post('/create-payment-intent', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.user!.organization_id!;
    const { invoice_id, amount, currency = 'eur', payment_method_id, customer_id } = req.body;

    if (!amount) {
      return res.status(400).json({ error: 'amount is required' });
    }

    // Get customer's Stripe ID
    let stripeCustomerId: string | undefined;
    if (customer_id) {
      const customerResult = await db.query(
        'SELECT stripe_customer_id FROM customers WHERE id = $1 AND organization_id = $2',
        [customer_id, orgId]
      );
      if (customerResult.rows.length > 0) {
        stripeCustomerId = customerResult.rows[0].stripe_customer_id;
      }
    }

    // Create PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(parseFloat(amount) * 100), // Convert to cents
      currency: currency.toLowerCase(),
      customer: stripeCustomerId,
      payment_method: payment_method_id,
      automatic_payment_methods: payment_method_id ? undefined : { enabled: true },
      metadata: {
        organization_id: orgId,
        invoice_id: invoice_id?.toString() || '',
      },
    });

    // Save to database
    await db.query(`
      INSERT INTO payment_intents (
        stripe_payment_intent_id, organization_id, invoice_id,
        amount, currency, status, payment_method, client_secret, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      paymentIntent.id,
      orgId,
      invoice_id || null,
      amount,
      currency,
      paymentIntent.status,
      payment_method_id || null,
      paymentIntent.client_secret,
      JSON.stringify(paymentIntent.metadata),
    ]);

    res.json({
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      status: paymentIntent.status,
    });
  } catch (error: any) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/stripe/confirm-payment
 * Confirm a payment and create payment record
 */
router.post('/confirm-payment', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.user!.organization_id!;
    const userId = req.user!.id;
    const { payment_intent_id } = req.body;

    if (!payment_intent_id) {
      return res.status(400).json({ error: 'payment_intent_id is required' });
    }

    // Retrieve PaymentIntent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ error: 'Payment not succeeded', status: paymentIntent.status });
    }

    // Get payment intent from database
    const piResult = await db.query(
      'SELECT * FROM payment_intents WHERE stripe_payment_intent_id = $1 AND organization_id = $2',
      [payment_intent_id, orgId]
    );

    if (piResult.rows.length === 0) {
      return res.status(404).json({ error: 'Payment intent not found' });
    }

    const pi = piResult.rows[0];

    // Create payment record
    const paymentResult = await db.query(`
      INSERT INTO payments (
        invoice_id, organization_id, amount, payment_method,
        status, stripe_payment_intent_id, stripe_charge_id,
        reference, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      pi.invoice_id,
      orgId,
      pi.amount,
      'stripe',
      'completed',
      payment_intent_id,
      paymentIntent.latest_charge,
      payment_intent_id,
      userId,
    ]);

    // Update invoice status if applicable
    if (pi.invoice_id) {
      await db.query(
        'UPDATE invoices SET status = $1, updated_at = NOW() WHERE id = $2',
        ['paid', pi.invoice_id]
      );
    }

    res.json({
      success: true,
      payment: paymentResult.rows[0],
    });
  } catch (error: any) {
    console.error('Error confirming payment:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========================================
// STRIPE SUBSCRIPTIONS
// ========================================

/**
 * POST /api/stripe/create-subscription
 * Create a Stripe subscription for an organization
 */
router.post('/create-subscription', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.user!.organization_id!;
    const { plan, payment_method_id } = req.body;

    if (!plan) {
      return res.status(400).json({ error: 'plan is required' });
    }

    // Get organization
    const orgResult = await db.query('SELECT * FROM organizations WHERE id = $1', [orgId]);
    if (orgResult.rows.length === 0) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const org = orgResult.rows[0];

    // Create or get Stripe customer
    let stripeCustomerId = org.stripe_customer_id;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: org.email || undefined,
        name: org.name,
        metadata: { organization_id: orgId },
      });
      stripeCustomerId = customer.id;

      await db.query('UPDATE organizations SET stripe_customer_id = $1 WHERE id = $2', [stripeCustomerId, orgId]);
    }

    // Attach payment method if provided
    if (payment_method_id) {
      await stripe.paymentMethods.attach(payment_method_id, { customer: stripeCustomerId });
      await stripe.customers.update(stripeCustomerId, {
        invoice_settings: { default_payment_method: payment_method_id },
      });
    }

    // Create subscription (use your Stripe price IDs)
    const priceId = getPriceIdForPlan(plan);
    const subscription = await stripe.subscriptions.create({
      customer: stripeCustomerId,
      items: [{ price: priceId }],
      metadata: { organization_id: orgId },
    });

    const subData = subscription as any; // Type workaround for Stripe SDK

    // Save to database
    await db.query(`
      INSERT INTO subscriptions (
        organization_id, stripe_subscription_id, stripe_customer_id,
        status, plan, current_period_start, current_period_end
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      orgId,
      subData.id,
      stripeCustomerId,
      subData.status,
      plan,
      new Date(subData.current_period_start * 1000),
      new Date(subData.current_period_end * 1000),
    ]);

    // Update organization
    await db.query(`
      UPDATE organizations
      SET stripe_subscription_id = $1, stripe_subscription_status = $2, subscription_plan = $3
      WHERE id = $4
    `, [subData.id, subData.status, plan, orgId]);

    res.json({
      success: true,
      subscription: {
        id: subData.id,
        status: subData.status,
        current_period_end: subData.current_period_end,
      },
    });
  } catch (error: any) {
    console.error('Error creating subscription:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/stripe/cancel-subscription
 * Cancel organization's subscription
 */
router.post('/cancel-subscription', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.user!.organization_id!;

    const orgResult = await db.query('SELECT stripe_subscription_id FROM organizations WHERE id = $1', [orgId]);
    if (orgResult.rows.length === 0 || !orgResult.rows[0].stripe_subscription_id) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    const subscriptionId = orgResult.rows[0].stripe_subscription_id;

    // Cancel subscription at period end
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });

    const subData = subscription as any; // Type workaround for Stripe SDK

    // Update database
    await db.query(`
      UPDATE subscriptions
      SET cancel_at_period_end = true, updated_at = NOW()
      WHERE stripe_subscription_id = $1
    `, [subscriptionId]);

    res.json({
      success: true,
      message: 'Subscription will be canceled at period end',
      current_period_end: new Date(subData.current_period_end * 1000),
    });
  } catch (error: any) {
    console.error('Error canceling subscription:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========================================
// STRIPE WEBHOOKS
// ========================================

/**
 * POST /api/stripe/webhook
 * Handle Stripe webhook events
 */
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentIntentSucceeded(paymentIntent);
        break;

      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object as Stripe.PaymentIntent;
        await handlePaymentIntentFailed(failedPayment);
        break;

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(subscription);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error('Error handling webhook:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========================================
// HELPER FUNCTIONS
// ========================================

function getPriceIdForPlan(plan: string): string {
  const priceIds: Record<string, string> = {
    starter: process.env.STRIPE_PRICE_STARTER || 'price_starter',
    professional: process.env.STRIPE_PRICE_PRO || 'price_pro',
    enterprise: process.env.STRIPE_PRICE_ENTERPRISE || 'price_enterprise',
  };
  return priceIds[plan] || priceIds.starter;
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  try {
    await db.query(`
      UPDATE payment_intents
      SET status = 'succeeded', updated_at = NOW()
      WHERE stripe_payment_intent_id = $1
    `, [paymentIntent.id]);

    console.log('Payment succeeded:', paymentIntent.id);
  } catch (error) {
    console.error('Error handling payment success:', error);
  }
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  try {
    await db.query(`
      UPDATE payment_intents
      SET status = 'failed', updated_at = NOW()
      WHERE stripe_payment_intent_id = $1
    `, [paymentIntent.id]);

    console.log('Payment failed:', paymentIntent.id);
  } catch (error) {
    console.error('Error handling payment failure:', error);
  }
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  try {
    const subData = subscription as any; // Type workaround for Stripe SDK
    const orgId = subscription.metadata.organization_id;

    await db.query(`
      UPDATE subscriptions
      SET
        status = $1,
        current_period_start = $2,
        current_period_end = $3,
        cancel_at_period_end = $4,
        updated_at = NOW()
      WHERE stripe_subscription_id = $5
    `, [
      subData.status,
      new Date(subData.current_period_start * 1000),
      new Date(subData.current_period_end * 1000),
      subData.cancel_at_period_end,
      subData.id,
    ]);

    if (orgId) {
      await db.query(`
        UPDATE organizations
        SET stripe_subscription_status = $1
        WHERE id = $2
      `, [subscription.status, orgId]);
    }

    console.log('Subscription updated:', subscription.id);
  } catch (error) {
    console.error('Error handling subscription update:', error);
  }
}

export default router;
