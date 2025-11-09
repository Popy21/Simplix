import { Router, Response } from 'express';
import Stripe from 'stripe';
import { pool } from '../database/db';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requireOrganization } from '../middleware/multiTenancy';
import { getOrgIdFromRequest } from '../utils/multiTenancyHelper';

const router = Router();

// Initialize Stripe (optional - only if key is provided)
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-10-29.clover',
    })
  : null;

// ========================================
// PUBLIC ROUTES (No authentication required)
// ========================================

/**
 * POST /api/payments/create-payment-intent
 * Create a Stripe Payment Intent for a quote (public endpoint, no auth required)
 */
router.post('/create-payment-intent', async (req, res) => {
  try {
    const { quote_id, amount, currency = 'eur' } = req.body;

    if (!quote_id || !amount) {
      return res.status(400).json({ error: 'quote_id and amount are required' });
    }

    // Verify quote exists
    const quoteResult = await pool.query(
      'SELECT * FROM quotes WHERE id = $1',
      [quote_id]
    );

    if (quoteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Devis non trouvé' });
    }

    const quote = quoteResult.rows[0];

    // Create a PaymentIntent with Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(parseFloat(amount) * 100), // Convert to cents
      currency,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        quote_id: quote_id.toString(),
        quote_number: quote.quote_number || '',
        customer_id: quote.customer_id?.toString() || '',
      },
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error: any) {
    console.error('Error creating Stripe payment intent:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /stripe/:quote_id
 * Page de paiement Stripe pour un devis
 */
router.get('/stripe/:quote_id', async (req, res) => {
  try {
    const { quote_id } = req.params;

    // Récupérer les détails du devis
    const quoteResult = await pool.query(`
      SELECT
        q.*,
        c.name as customer_name,
        c.email as customer_email,
        cp.company_name
      FROM quotes q
      LEFT JOIN customers c ON q.customer_id = c.id
      LEFT JOIN company_profiles cp ON cp.id = (SELECT id FROM company_profiles LIMIT 1)
      WHERE q.id = $1
    `, [quote_id]);

    if (quoteResult.rows.length === 0) {
      return res.status(404).send('<h1>Devis non trouvé</h1>');
    }

    const quote = quoteResult.rows[0];

    // Générer une page HTML de paiement Stripe
    const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Paiement - ${quote.company_name}</title>
  <script src="https://js.stripe.com/v3/"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      max-width: 500px;
      width: 100%;
      padding: 40px;
    }
    h1 {
      font-size: 28px;
      color: #1a1a1a;
      margin-bottom: 8px;
    }
    .company { font-size: 14px; color: #666; margin-bottom: 24px; }
    .quote-info {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 12px;
      margin-bottom: 24px;
    }
    .quote-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 12px;
      font-size: 15px;
    }
    .quote-row:last-child { margin-bottom: 0; }
    .label { color: #666; }
    .value { font-weight: 600; color: #1a1a1a; }
    .total-row {
      border-top: 2px solid #ddd;
      padding-top: 12px;
      margin-top: 12px;
      font-size: 18px;
    }
    .total-row .value { color: #667eea; font-size: 24px; }
    #payment-form { margin-top: 24px; }
    #card-element {
      padding: 16px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      margin-bottom: 16px;
      background: white;
    }
    .btn {
      width: 100%;
      padding: 16px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 16px rgba(102, 126, 234, 0.4);
    }
    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }
    .error {
      color: #e74c3c;
      font-size: 14px;
      margin-top: 12px;
      padding: 12px;
      background: #fef5f5;
      border-radius: 8px;
      display: none;
    }
    .success {
      color: #27ae60;
      font-size: 14px;
      margin-top: 12px;
      padding: 12px;
      background: #f0fdf4;
      border-radius: 8px;
      display: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Paiement du devis</h1>
    <div class="company">${quote.company_name}</div>

    <div class="quote-info">
      <div class="quote-row">
        <span class="label">Client:</span>
        <span class="value">${quote.customer_name}</span>
      </div>
      <div class="quote-row">
        <span class="label">Numéro de devis:</span>
        <span class="value">${quote.quote_number || 'N/A'}</span>
      </div>
      <div class="quote-row total-row">
        <span class="label">Montant total:</span>
        <span class="value">${parseFloat(quote.total_amount).toFixed(2)} €</span>
      </div>
    </div>

    <form id="payment-form">
      <div id="card-element"></div>
      <button class="btn" type="submit" id="submit-button">
        <span id="button-text">Payer ${parseFloat(quote.total_amount).toFixed(2)} €</span>
      </button>
      <div class="error" id="error-message"></div>
      <div class="success" id="success-message"></div>
    </form>
  </div>

  <script>
    const form = document.getElementById('payment-form');
    const submitButton = document.getElementById('submit-button');
    const errorDiv = document.getElementById('error-message');
    const successDiv = document.getElementById('success-message');

    // Vérifier si Stripe est chargé
    if (typeof Stripe === 'undefined') {
      errorDiv.textContent = 'Impossible de charger Stripe. Vérifiez votre connexion internet et désactivez les bloqueurs de publicités.';
      errorDiv.style.display = 'block';
      submitButton.disabled = true;
      throw new Error('Stripe not loaded');
    }

    const stripe = Stripe('${process.env.STRIPE_PUBLISHABLE_KEY}');
    const elements = stripe.elements();
    const cardElement = elements.create('card', {
      style: {
        base: {
          fontSize: '16px',
          color: '#1a1a1a',
          '::placeholder': { color: '#999' }
        }
      }
    });
    cardElement.mount('#card-element');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      submitButton.disabled = true;
      submitButton.textContent = 'Traitement...';
      errorDiv.style.display = 'none';
      successDiv.style.display = 'none';

      try {
        // Créer un PaymentIntent
        const response = await fetch('/api/payments/create-payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quote_id: '${quote_id}',
            amount: ${quote.total_amount}
          })
        });

        const { clientSecret, error: serverError } = await response.json();

        if (serverError) throw new Error(serverError);

        // Confirmer le paiement
        const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
          payment_method: { card: cardElement }
        });

        if (error) throw error;

        successDiv.textContent = '✓ Paiement réussi! Redirection...';
        successDiv.style.display = 'block';
        setTimeout(() => window.location.href = '/pay/payment-success?quote_id=${quote_id}', 2000);
      } catch (err) {
        errorDiv.textContent = err.message || 'Une erreur est survenue';
        errorDiv.style.display = 'block';
        submitButton.disabled = false;
        submitButton.textContent = 'Payer ${parseFloat(quote.total_amount).toFixed(2)} €';
      }
    });
  </script>
</body>
</html>
    `;

    res.send(html);
  } catch (error: any) {
    console.error('Error loading Stripe payment page:', error);
    res.status(500).send('<h1>Erreur lors du chargement de la page de paiement</h1>');
  }
});

/**
 * GET /applepay/:quote_id
 * Page de paiement Apple Pay pour un devis
 */
router.get('/applepay/:quote_id', async (req, res) => {
  try {
    const { quote_id } = req.params;

    // Récupérer les détails du devis
    const quoteResult = await pool.query(`
      SELECT
        q.*,
        c.name as customer_name,
        c.email as customer_email,
        cp.company_name
      FROM quotes q
      LEFT JOIN customers c ON q.customer_id = c.id
      LEFT JOIN company_profiles cp ON cp.id = (SELECT id FROM company_profiles LIMIT 1)
      WHERE q.id = $1
    `, [quote_id]);

    if (quoteResult.rows.length === 0) {
      return res.status(404).send('<h1>Devis non trouvé</h1>');
    }

    const quote = quoteResult.rows[0];

    // Générer une page HTML de paiement Apple Pay
    const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Paiement Apple Pay - ${quote.company_name}</title>
  <script src="https://js.stripe.com/v3/"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.5);
      max-width: 500px;
      width: 100%;
      padding: 40px;
    }
    h1 {
      font-size: 28px;
      color: #1a1a1a;
      margin-bottom: 8px;
    }
    .company { font-size: 14px; color: #666; margin-bottom: 24px; }
    .quote-info {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 12px;
      margin-bottom: 24px;
    }
    .quote-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 12px;
      font-size: 15px;
    }
    .quote-row:last-child { margin-bottom: 0; }
    .label { color: #666; }
    .value { font-weight: 600; color: #1a1a1a; }
    .total-row {
      border-top: 2px solid #ddd;
      padding-top: 12px;
      margin-top: 12px;
      font-size: 18px;
    }
    .total-row .value { color: #000; font-size: 24px; }
    #payment-request-button {
      margin-top: 24px;
      height: 50px;
    }
    .error {
      color: #e74c3c;
      font-size: 14px;
      margin-top: 12px;
      padding: 12px;
      background: #fef5f5;
      border-radius: 8px;
      display: none;
    }
    .success {
      color: #27ae60;
      font-size: 14px;
      margin-top: 12px;
      padding: 12px;
      background: #f0fdf4;
      border-radius: 8px;
      display: none;
    }
    .note {
      margin-top: 16px;
      font-size: 13px;
      color: #999;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Paiement Apple Pay</h1>
    <div class="company">${quote.company_name}</div>

    <div class="quote-info">
      <div class="quote-row">
        <span class="label">Client:</span>
        <span class="value">${quote.customer_name}</span>
      </div>
      <div class="quote-row">
        <span class="label">Numéro de devis:</span>
        <span class="value">${quote.quote_number || 'N/A'}</span>
      </div>
      <div class="quote-row total-row">
        <span class="label">Montant total:</span>
        <span class="value">${parseFloat(quote.total_amount).toFixed(2)} €</span>
      </div>
    </div>

    <div id="payment-request-button"></div>
    <div class="error" id="error-message"></div>
    <div class="success" id="success-message"></div>
    <div class="note">Apple Pay est disponible sur Safari avec un appareil compatible</div>
  </div>

  <script>
    const stripe = Stripe('${process.env.STRIPE_PUBLISHABLE_KEY}');
    const errorDiv = document.getElementById('error-message');
    const successDiv = document.getElementById('success-message');

    const paymentRequest = stripe.paymentRequest({
      country: 'FR',
      currency: 'eur',
      total: {
        label: 'Devis ${quote.quote_number || 'N/A'}',
        amount: Math.round(${quote.total_amount} * 100)
      },
      requestPayerName: true,
      requestPayerEmail: true
    });

    const elements = stripe.elements();
    const prButton = elements.create('paymentRequestButton', { paymentRequest });

    paymentRequest.canMakePayment().then((result) => {
      if (result) {
        prButton.mount('#payment-request-button');
      } else {
        errorDiv.textContent = 'Apple Pay n\\'est pas disponible sur cet appareil';
        errorDiv.style.display = 'block';
      }
    });

    paymentRequest.on('paymentmethod', async (ev) => {
      try {
        const response = await fetch('/api/payments/create-payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quote_id: '${quote_id}',
            amount: ${quote.total_amount}
          })
        });

        const { clientSecret, error: serverError } = await response.json();

        if (serverError) {
          ev.complete('fail');
          throw new Error(serverError);
        }

        const { error, paymentIntent } = await stripe.confirmCardPayment(
          clientSecret,
          { payment_method: ev.paymentMethod.id },
          { handleActions: false }
        );

        if (error) {
          ev.complete('fail');
          throw error;
        }

        ev.complete('success');
        successDiv.textContent = '✓ Paiement réussi! Redirection...';
        successDiv.style.display = 'block';
        setTimeout(() => window.location.href = '/pay/payment-success?quote_id=${quote_id}', 2000);
      } catch (err) {
        errorDiv.textContent = err.message || 'Une erreur est survenue';
        errorDiv.style.display = 'block';
      }
    });
  </script>
</body>
</html>
    `;

    res.send(html);
  } catch (error: any) {
    console.error('Error loading Apple Pay payment page:', error);
    res.status(500).send('<h1>Erreur lors du chargement de la page de paiement</h1>');
  }
});

/**
 * GET /payment-success
 * Page de confirmation de paiement
 */
router.get('/payment-success', async (req, res) => {
  const { quote_id } = req.query;
  let quoteDetails = null;

  if (quote_id) {
    try {
      const quoteResult = await pool.query(`SELECT q.*, c.name as customer_name, c.email as customer_email, cp.company_name FROM quotes q LEFT JOIN customers c ON q.customer_id = c.id LEFT JOIN company_profiles cp ON cp.id = (SELECT id FROM company_profiles LIMIT 1) WHERE q.id = $1`, [quote_id]);
      if (quoteResult.rows.length > 0) quoteDetails = quoteResult.rows[0];
    } catch (error) { console.error('Error fetching quote details:', error); }
  }

  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Paiement réussi</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}.container{background:white;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,0.3);max-width:600px;width:100%;padding:40px;text-align:center}.success-icon{width:80px;height:80px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 24px}.success-icon svg{width:48px;height:48px;fill:white}h1{font-size:32px;color:#1a1a1a;margin-bottom:16px}p{font-size:16px;color:#666;line-height:1.6;margin-bottom:12px}.details-section{background:#f8f9fa;padding:24px;border-radius:12px;margin:24px 0;text-align:left}.details-title{font-size:18px;font-weight:600;color:#1a1a1a;margin-bottom:16px;text-align:center}.detail-row{display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid #e5e5e5}.detail-row:last-child{border-bottom:none}.detail-label{font-size:14px;color:#666}.detail-value{font-size:14px;font-weight:600;color:#1a1a1a}.total-row{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);margin:16px -24px -24px;padding:16px 24px;border-radius:0 0 12px 12px}.total-row .detail-label,.total-row .detail-value{color:white;font-size:18px}.email-note{background:#f0fdf4;padding:16px;border-radius:8px;margin-top:24px;font-size:14px;color:#166534;border:1px solid #bbf7d0}</style></head><body><div class="container"><div class="success-icon"><svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg></div><h1>Paiement réussi !</h1><p>Votre paiement a été traité avec succès.</p><p>Merci pour votre confiance.</p>${quoteDetails ? `<div class="details-section"><div class="details-title">Récapitulatif de votre commande</div><div class="detail-row"><span class="detail-label">Numéro de devis</span><span class="detail-value">${quoteDetails.quote_number || 'N/A'}</span></div><div class="detail-row"><span class="detail-label">Client</span><span class="detail-value">${quoteDetails.customer_name || 'N/A'}</span></div><div class="detail-row"><span class="detail-label">Email</span><span class="detail-value">${quoteDetails.customer_email || 'N/A'}</span></div><div class="detail-row"><span class="detail-label">Entreprise</span><span class="detail-value">${quoteDetails.company_name || 'N/A'}</span></div><div class="detail-row"><span class="detail-label">Date</span><span class="detail-value">${new Date().toLocaleDateString('fr-FR')}</span></div><div class="total-row"><div class="detail-row" style="border:none;padding:0"><span class="detail-label">Montant payé</span><span class="detail-value">${parseFloat(quoteDetails.total_amount).toFixed(2)} €</span></div></div></div>` : ''}<div class="email-note">✉️ Vous recevrez un email de confirmation avec votre facture sous peu.</div></div></body></html>`;
  res.send(html);
});

/**
 * POST /api/payments/stripe/webhook
 * Handle Stripe webhook events
 */
router.post('/stripe/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];

  if (!sig || typeof sig !== 'string') {
    return res.status(400).send('Missing stripe-signature header');
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      console.log('PaymentIntent was successful!', paymentIntent.id);

      // Create payment record in database
      try {
        const quoteId = paymentIntent.metadata.quote_id;
        const invoiceId = paymentIntent.metadata.invoice_id;
        const amount = paymentIntent.amount / 100; // Convert from cents
        const userId = paymentIntent.metadata.user_id;

        // Handle quote payment (convert quote to invoice and record payment)
        if (quoteId) {
          const client = await pool.connect();
          try {
            await client.query('BEGIN');

            // Get quote details
            const quoteResult = await client.query('SELECT * FROM quotes WHERE id = $1', [quoteId]);
            if (quoteResult.rows.length === 0) {
              throw new Error('Quote not found');
            }
            const quote = quoteResult.rows[0];

            // Create invoice from quote
            const invoiceResult = await client.query(`
              INSERT INTO invoices (
                customer_id, user_id, invoice_number, title, description,
                subtotal, tax_rate, tax_amount, total_amount,
                status, due_date, organization_id, template_id
              )
              SELECT
                customer_id, user_id,
                'INV-' || LPAD((SELECT COUNT(*) + 1 FROM invoices)::text, 6, '0'),
                title, description, subtotal, tax_rate, tax_amount, total_amount,
                'paid', CURRENT_DATE + INTERVAL '30 days',
                (SELECT id FROM organizations LIMIT 1), template_id
              FROM quotes
              WHERE id = $1
              RETURNING *
            `, [quoteId]);

            const newInvoice = invoiceResult.rows[0];

            // Copy quote items to invoice items
            await client.query(`
              INSERT INTO invoice_items (invoice_id, product_id, description, quantity, unit_price, amount)
              SELECT $1, product_id, description, quantity, unit_price, amount
              FROM quote_items
              WHERE quote_id = $2
            `, [newInvoice.id, quoteId]);

            // Record payment
            await client.query(`
              INSERT INTO payments (
                invoice_id, payment_date, amount, payment_method,
                transaction_id, notes
              ) VALUES ($1, $2, $3, $4, $5, $6)
            `, [
              newInvoice.id,
              new Date().toISOString().split('T')[0],
              amount,
              'stripe',
              paymentIntent.id,
              'Stripe payment for quote ' + quote.quote_number + ' - Payment Intent ID: ' + paymentIntent.id
            ]);

            // Update quote status to accepted
            await client.query(`
              UPDATE quotes
              SET status = 'accepted', updated_at = NOW()
              WHERE id = $1
            `, [quoteId]);

            await client.query('COMMIT');
            console.log('Quote payment processed, invoice created:', newInvoice.id);
          } catch (error) {
            await client.query('ROLLBACK');
            throw error;
          } finally {
            client.release();
          }
        }
        // Handle invoice payment
        else if (invoiceId) {
          await pool.query(`
            INSERT INTO payments (
              invoice_id, payment_date, amount, payment_method,
              transaction_id, notes, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          `, [
            invoiceId,
            new Date().toISOString().split('T')[0],
            amount,
            'stripe',
            paymentIntent.id,
            'Stripe payment - Payment Intent ID: ' + paymentIntent.id,
            userId || null
          ]);

          // Update invoice status if fully paid
          const invoiceResult = await pool.query(`
            SELECT
              i.*,
              (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE invoice_id = $1) as total_paid
            FROM invoices i
            WHERE id = $1
          `, [invoiceId]);

          if (invoiceResult.rows.length > 0) {
            const invoice = invoiceResult.rows[0];
            const totalPaid = parseFloat(invoice.total_paid);
            const balanceDue = parseFloat(invoice.total_amount) - totalPaid;

            if (balanceDue <= 0.01) {
              await pool.query(`
                UPDATE invoices
                SET status = 'paid', updated_at = NOW()
                WHERE id = $1
              `, [invoiceId]);
            }
          }

          console.log('Payment recorded in database for invoice:', invoiceId);
        }
      } catch (error) {
        console.error('Error recording payment in database:', error);
      }
      break;

    case 'payment_intent.payment_failed':
      console.log('Payment failed:', event.data.object);
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

// ========================================
// AUTHENTICATED ROUTES
// ========================================

/**
 * GET /api/payments
 * Récupérer tous les paiements
 */
router.get('/', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  try {
    const orgId = getOrgIdFromRequest(req);
    const { invoice_id, from_date, to_date, payment_method } = req.query;

    let query = `
      SELECT
        p.*,
        i.invoice_number,
        i.total_amount as invoice_total,
        cust.name as customer_name,
        cust.company as customer_company
      FROM payments p
      JOIN invoices i ON p.invoice_id = i.id
      LEFT JOIN customers cust ON i.customer_id = cust.id
      WHERE cust.organization_id = $1
    `;

    const params: any[] = [orgId];
    let paramCount = 2;

    if (invoice_id) {
      query += ` AND p.invoice_id = $${paramCount}`;
      params.push(invoice_id);
      paramCount++;
    }

    if (from_date) {
      query += ` AND p.payment_date >= $${paramCount}`;
      params.push(from_date);
      paramCount++;
    }

    if (to_date) {
      query += ` AND p.payment_date <= $${paramCount}`;
      params.push(to_date);
      paramCount++;
    }

    if (payment_method) {
      query += ` AND p.payment_method = $${paramCount}`;
      params.push(payment_method);
      paramCount++;
    }

    query += ` ORDER BY p.payment_date DESC, p.id DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Erreur lors de la récupération des paiements:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/payments/stats
 * Statistiques des paiements
 */
router.get('/stats', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  try {
    const orgId = getOrgIdFromRequest(req);
    const { period = 'month' } = req.query;

    let dateFormat = 'month';
    if (period === 'day') dateFormat = 'day';
    else if (period === 'week') dateFormat = 'week';
    else if (period === 'year') dateFormat = 'year';

    const stats = await pool.query(`
      SELECT
        DATE_TRUNC($1, p.payment_date) as period,
        p.payment_method,
        COUNT(*) as payment_count,
        SUM(p.amount) as total_amount
      FROM payments p
      JOIN invoices i ON p.invoice_id = i.id
      WHERE i.organization_id = $2 AND p.payment_date >= CURRENT_DATE - INTERVAL '6 months'
      GROUP BY DATE_TRUNC($1, p.payment_date), p.payment_method
      ORDER BY period DESC, p.payment_method
    `, [dateFormat, orgId]);

    // Total global
    const totalStats = await pool.query(`
      SELECT
        COUNT(*) as total_payments,
        SUM(p.amount) as total_amount,
        AVG(p.amount) as average_payment,
        COUNT(DISTINCT p.invoice_id) as invoices_paid
      FROM payments p
      JOIN invoices i ON p.invoice_id = i.id
      WHERE i.organization_id = $1
    `, [orgId]);

    res.json({
      by_period: stats.rows,
      total: totalStats.rows[0]
    });
  } catch (error: any) {
    console.error('Erreur lors de la récupération des statistiques de paiements:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/payments/:id
 * Récupérer un paiement spécifique
 */
router.get('/:id', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const orgId = getOrgIdFromRequest(req);

    const result = await pool.query(`
      SELECT
        p.*,
        i.invoice_number,
        i.total_amount as invoice_total,
        c.first_name || ' ' || COALESCE(c.last_name, '') as customer_name,
        c.email as customer_email,
        co.name as customer_company,
        u.first_name || ' ' || COALESCE(u.last_name, '') as created_by_name
      FROM payments p
      JOIN invoices i ON p.invoice_id = i.id
      LEFT JOIN contacts c ON i.customer_id = c.id
      LEFT JOIN companies co ON c.company_id = co.id
      LEFT JOIN users u ON p.created_by = u.id
      WHERE p.id = $1 AND i.organization_id = $2
    `, [id, orgId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Paiement non trouvé' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Erreur lors de la récupération du paiement:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/payments
 * Créer un nouveau paiement
 */
router.post('/', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const orgId = getOrgIdFromRequest(req);
    const userId = req.user?.id;

    const {
      invoice_id,
      payment_date,
      amount,
      payment_method,
      reference,
      transaction_id,
      notes
    } = req.body;

    // Validation
    if (!invoice_id || !amount || !payment_method) {
      return res.status(400).json({ error: 'Champs requis manquants' });
    }

    // Vérifier que la facture existe et appartient à l'organisation
    const invoiceResult = await client.query(`
      SELECT
        *,
        (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE invoice_id = $1) as total_paid
      FROM invoices
      WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
    `, [invoice_id, orgId]);

    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Facture non trouvée' });
    }

    const invoice = invoiceResult.rows[0];
    const totalPaid = parseFloat(invoice.total_paid);
    const balanceDue = parseFloat(invoice.total_amount) - totalPaid;

    if (balanceDue <= 0) {
      return res.status(400).json({ error: 'Cette facture est déjà entièrement payée' });
    }

    if (parseFloat(amount) > balanceDue) {
      return res.status(400).json({
        error: `Le montant du paiement (${amount}€) dépasse le solde dû (${balanceDue}€)`
      });
    }

    // Créer le paiement
    const paymentResult = await client.query(`
      INSERT INTO payments (
        invoice_id, payment_date, amount, payment_method,
        reference, transaction_id, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      invoice_id,
      payment_date || new Date().toISOString().split('T')[0],
      amount,
      payment_method,
      reference,
      transaction_id,
      notes,
      userId
    ]);

    const payment = paymentResult.rows[0];

    // Calculer le nouveau total payé
    const newTotalPaid = totalPaid + parseFloat(amount);
    const newBalanceDue = parseFloat(invoice.total_amount) - newTotalPaid;

    // Mettre à jour le statut de la facture si entièrement payée
    if (newBalanceDue <= 0.01) {
      await client.query(`
        UPDATE invoices
        SET status = 'paid', updated_at = NOW()
        WHERE id = $1
      `, [invoice_id]);
    } else if (invoice.status === 'draft') {
      await client.query(`
        UPDATE invoices
        SET status = 'sent', updated_at = NOW()
        WHERE id = $1
      `, [invoice_id]);
    }

    await client.query('COMMIT');

    res.status(201).json({
      payment: payment,
      invoice: {
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        total_amount: invoice.total_amount,
        total_paid: newTotalPaid,
        balance_due: newBalanceDue,
        status: newBalanceDue <= 0.01 ? 'paid' : invoice.status
      }
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Erreur lors de la création du paiement:', error);

    if (error.code === '23503') {
      return res.status(400).json({ error: 'Facture invalide' });
    }

    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

/**
 * DELETE /api/payments/:id
 * Supprimer un paiement
 */
router.delete('/:id', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const orgId = getOrgIdFromRequest(req);

    // Récupérer le paiement et vérifier qu'il appartient à l'organisation
    const paymentResult = await client.query(`
      SELECT p.*, i.organization_id
      FROM payments p
      JOIN invoices i ON p.invoice_id = i.id
      WHERE p.id = $1 AND i.organization_id = $2
    `, [id, orgId]);

    if (paymentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Paiement non trouvé' });
    }

    const payment = paymentResult.rows[0];
    const invoiceId = payment.invoice_id;

    // Supprimer le paiement
    await client.query('DELETE FROM payments WHERE id = $1', [id]);

    // Recalculer le statut de la facture
    const invoiceResult = await client.query(`
      SELECT
        *,
        (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE invoice_id = $1) as total_paid
      FROM invoices
      WHERE id = $1
    `, [invoiceId]);

    if (invoiceResult.rows.length > 0) {
      const invoice = invoiceResult.rows[0];
      const totalPaid = parseFloat(invoice.total_paid);
      const balanceDue = parseFloat(invoice.total_amount) - totalPaid;

      let newStatus = invoice.status;
      if (balanceDue > 0 && invoice.status === 'paid') {
        if (new Date(invoice.due_date) < new Date()) {
          newStatus = 'overdue';
        } else {
          newStatus = 'sent';
        }

        await client.query(`
          UPDATE invoices
          SET status = $1, updated_at = NOW()
          WHERE id = $2
        `, [newStatus, invoiceId]);
      }
    }

    await client.query('COMMIT');

    res.json({ message: 'Paiement supprimé avec succès' });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Erreur lors de la suppression du paiement:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

/**
 * POST /api/payments/process-card
 * Process credit card payment
 */
router.post('/process-card', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const orgId = getOrgIdFromRequest(req);
    const userId = req.user?.id;
    const { invoice_id, amount, card_token } = req.body;

    if (!invoice_id || !amount || !card_token) {
      return res.status(400).json({ error: 'invoice_id, amount, and card_token are required' });
    }

    // TODO: Integrate with actual payment processor (Stripe, etc.)
    // For now, simulate successful payment
    const transaction_id = 'CARD-' + Date.now();
    const reference = 'TXN-' + Date.now();

    // Verify invoice belongs to organization
    const invoiceResult = await client.query(
      'SELECT * FROM invoices WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL',
      [invoice_id, orgId]
    );

    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Facture non trouvée' });
    }

    // Create payment record
    await client.query(`
      INSERT INTO payments (
        invoice_id, payment_date, amount, payment_method,
        reference, transaction_id, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      invoice_id,
      new Date().toISOString().split('T')[0],
      amount,
      'card',
      reference,
      transaction_id,
      'Credit card payment',
      userId
    ]);

    await client.query('COMMIT');

    res.json({ message: 'Card payment processed successfully', transaction_id });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error processing card payment:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

/**
 * POST /api/payments/process-apple-pay
 * Process Apple Pay payment
 */
router.post('/process-apple-pay', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const orgId = getOrgIdFromRequest(req);
    const userId = req.user?.id;
    const { invoice_id, amount, apple_pay_token } = req.body;

    if (!invoice_id || !amount || !apple_pay_token) {
      return res.status(400).json({ error: 'invoice_id, amount, and apple_pay_token are required' });
    }

    // TODO: Integrate with actual Apple Pay processor
    const transaction_id = 'APPLE-' + Date.now();
    const reference = 'TXN-' + Date.now();

    // Verify invoice belongs to organization
    const invoiceResult = await client.query(
      'SELECT * FROM invoices WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL',
      [invoice_id, orgId]
    );

    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Facture non trouvée' });
    }

    // Create payment record
    await client.query(`
      INSERT INTO payments (
        invoice_id, payment_date, amount, payment_method,
        reference, transaction_id, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      invoice_id,
      new Date().toISOString().split('T')[0],
      amount,
      'apple_pay',
      reference,
      transaction_id,
      'Apple Pay payment',
      userId
    ]);

    await client.query('COMMIT');

    res.json({ message: 'Apple Pay payment processed successfully', transaction_id });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error processing Apple Pay payment:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

/**
 * POST /api/payments/create-payment-intent
 * Create a Stripe Payment Intent for a quote (public endpoint, no auth required)
 */
router.post('/create-payment-intent', async (req, res) => {
  try {
    const { quote_id, amount, currency = 'eur' } = req.body;

    if (!quote_id || !amount) {
      return res.status(400).json({ error: 'quote_id and amount are required' });
    }

    // Verify quote exists
    const quoteResult = await pool.query(
      'SELECT * FROM quotes WHERE id = $1',
      [quote_id]
    );

    if (quoteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Devis non trouvé' });
    }

    const quote = quoteResult.rows[0];

    // Create a PaymentIntent with Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(parseFloat(amount) * 100), // Convert to cents
      currency,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        quote_id: quote_id.toString(),
        quote_number: quote.quote_number || '',
        customer_id: quote.customer_id?.toString() || '',
      },
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error: any) {
    console.error('Error creating Stripe payment intent:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/payments/stripe/create-payment-intent
 * Create a Stripe Payment Intent for an invoice
 */
router.post('/stripe/create-payment-intent', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  try {
    const orgId = getOrgIdFromRequest(req);
    const { invoice_id, amount, currency = 'eur' } = req.body;

    if (!invoice_id || !amount) {
      return res.status(400).json({ error: 'invoice_id and amount are required' });
    }

    // Verify invoice belongs to organization
    const invoiceResult = await pool.query(
      'SELECT * FROM invoices WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL',
      [invoice_id, orgId]
    );

    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Facture non trouvée' });
    }

    const invoice = invoiceResult.rows[0];

    // Create a PaymentIntent with Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(parseFloat(amount) * 100), // Convert to cents
      currency,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        invoice_id: invoice_id.toString(),
        invoice_number: invoice.invoice_number,
        organization_id: orgId.toString(),
        user_id: req.user?.id?.toString() || '',
      },
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error: any) {
    console.error('Error creating Stripe payment intent:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/payments/stripe/webhook
 * Handle Stripe webhook events
 */
router.post('/stripe/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];

  if (!sig || typeof sig !== 'string') {
    return res.status(400).send('Missing stripe-signature header');
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      console.log('PaymentIntent was successful!', paymentIntent.id);

      // Create payment record in database
      try {
        const quoteId = paymentIntent.metadata.quote_id;
        const invoiceId = paymentIntent.metadata.invoice_id;
        const amount = paymentIntent.amount / 100; // Convert from cents
        const userId = paymentIntent.metadata.user_id;

        // Handle quote payment (convert quote to invoice and record payment)
        if (quoteId) {
          const client = await pool.connect();
          try {
            await client.query('BEGIN');

            // Get quote details
            const quoteResult = await client.query('SELECT * FROM quotes WHERE id = $1', [quoteId]);
            if (quoteResult.rows.length === 0) {
              throw new Error('Quote not found');
            }
            const quote = quoteResult.rows[0];

            // Create invoice from quote
            const invoiceResult = await client.query(`
              INSERT INTO invoices (
                customer_id, user_id, invoice_number, title, description,
                subtotal, tax_rate, tax_amount, total_amount,
                status, due_date, organization_id, template_id
              )
              SELECT
                customer_id, user_id,
                'INV-' || LPAD((SELECT COUNT(*) + 1 FROM invoices)::text, 6, '0'),
                title, description, subtotal, tax_rate, tax_amount, total_amount,
                'paid', CURRENT_DATE + INTERVAL '30 days',
                (SELECT id FROM organizations LIMIT 1), template_id
              FROM quotes
              WHERE id = $1
              RETURNING *
            `, [quoteId]);

            const newInvoice = invoiceResult.rows[0];

            // Copy quote items to invoice items
            await client.query(`
              INSERT INTO invoice_items (invoice_id, product_id, description, quantity, unit_price, amount)
              SELECT $1, product_id, description, quantity, unit_price, amount
              FROM quote_items
              WHERE quote_id = $2
            `, [newInvoice.id, quoteId]);

            // Record payment
            await client.query(`
              INSERT INTO payments (
                invoice_id, payment_date, amount, payment_method,
                transaction_id, notes
              ) VALUES ($1, $2, $3, $4, $5, $6)
            `, [
              newInvoice.id,
              new Date().toISOString().split('T')[0],
              amount,
              'stripe',
              paymentIntent.id,
              'Stripe payment for quote ' + quote.quote_number + ' - Payment Intent ID: ' + paymentIntent.id
            ]);

            // Update quote status to accepted
            await client.query(`
              UPDATE quotes
              SET status = 'accepted', updated_at = NOW()
              WHERE id = $1
            `, [quoteId]);

            await client.query('COMMIT');
            console.log('Quote payment processed, invoice created:', newInvoice.id);
          } catch (error) {
            await client.query('ROLLBACK');
            throw error;
          } finally {
            client.release();
          }
        }
        // Handle invoice payment
        else if (invoiceId) {
          await pool.query(`
            INSERT INTO payments (
              invoice_id, payment_date, amount, payment_method,
              transaction_id, notes, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          `, [
            invoiceId,
            new Date().toISOString().split('T')[0],
            amount,
            'stripe',
            paymentIntent.id,
            'Stripe payment - Payment Intent ID: ' + paymentIntent.id,
            userId || null
          ]);

          // Update invoice status if fully paid
          const invoiceResult = await pool.query(`
            SELECT
              i.*,
              (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE invoice_id = $1) as total_paid
            FROM invoices i
            WHERE id = $1
          `, [invoiceId]);

          if (invoiceResult.rows.length > 0) {
            const invoice = invoiceResult.rows[0];
            const totalPaid = parseFloat(invoice.total_paid);
            const balanceDue = parseFloat(invoice.total_amount) - totalPaid;

            if (balanceDue <= 0.01) {
              await pool.query(`
                UPDATE invoices
                SET status = 'paid', updated_at = NOW()
                WHERE id = $1
              `, [invoiceId]);
            }
          }

          console.log('Payment recorded in database for invoice:', invoiceId);
        }
      } catch (error) {
        console.error('Error recording payment in database:', error);
      }
      break;

    case 'payment_intent.payment_failed':
      console.log('Payment failed:', event.data.object);
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

/**
 * POST /api/payments/process-google-pay
 * Process Google Pay payment
 */
router.post('/process-google-pay', authenticateToken, requireOrganization, async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const orgId = getOrgIdFromRequest(req);
    const userId = req.user?.id;
    const { invoice_id, amount, google_pay_token } = req.body;

    if (!invoice_id || !amount || !google_pay_token) {
      return res.status(400).json({ error: 'invoice_id, amount, and google_pay_token are required' });
    }

    // TODO: Integrate with actual Google Pay processor
    const transaction_id = 'GOOGLE-' + Date.now();
    const reference = 'TXN-' + Date.now();

    // Verify invoice belongs to organization
    const invoiceResult = await client.query(
      'SELECT * FROM invoices WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL',
      [invoice_id, orgId]
    );

    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Facture non trouvée' });
    }

    // Create payment record
    await client.query(`
      INSERT INTO payments (
        invoice_id, payment_date, amount, payment_method,
        reference, transaction_id, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      invoice_id,
      new Date().toISOString().split('T')[0],
      amount,
      'google_pay',
      reference,
      transaction_id,
      'Google Pay payment',
      userId
    ]);

    await client.query('COMMIT');

    res.json({ message: 'Google Pay payment processed successfully', transaction_id });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error processing Google Pay payment:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

/**
 * GET /stripe/:quote_id
 * Page de paiement Stripe pour un devis
 */
router.get('/stripe/:quote_id', async (req, res) => {
  try {
    const { quote_id } = req.params;

    // Récupérer les détails du devis
    const quoteResult = await pool.query(`
      SELECT
        q.*,
        c.name as customer_name,
        c.email as customer_email,
        cp.company_name
      FROM quotes q
      LEFT JOIN customers c ON q.customer_id = c.id
      LEFT JOIN company_profiles cp ON cp.id = (SELECT id FROM company_profiles LIMIT 1)
      WHERE q.id = $1
    `, [quote_id]);

    if (quoteResult.rows.length === 0) {
      return res.status(404).send('<h1>Devis non trouvé</h1>');
    }

    const quote = quoteResult.rows[0];

    // Générer une page HTML de paiement Stripe
    const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Paiement - ${quote.company_name}</title>
  <script src="https://js.stripe.com/v3/"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      max-width: 500px;
      width: 100%;
      padding: 40px;
    }
    h1 {
      font-size: 28px;
      color: #1a1a1a;
      margin-bottom: 8px;
    }
    .company { font-size: 14px; color: #666; margin-bottom: 24px; }
    .quote-info {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 12px;
      margin-bottom: 24px;
    }
    .quote-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 12px;
      font-size: 15px;
    }
    .quote-row:last-child { margin-bottom: 0; }
    .label { color: #666; }
    .value { font-weight: 600; color: #1a1a1a; }
    .total-row {
      border-top: 2px solid #ddd;
      padding-top: 12px;
      margin-top: 12px;
      font-size: 18px;
    }
    .total-row .value { color: #667eea; font-size: 24px; }
    #payment-form { margin-top: 24px; }
    #card-element {
      padding: 16px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      margin-bottom: 16px;
      background: white;
    }
    .btn {
      width: 100%;
      padding: 16px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 16px rgba(102, 126, 234, 0.4);
    }
    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }
    .error {
      color: #e74c3c;
      font-size: 14px;
      margin-top: 12px;
      padding: 12px;
      background: #fef5f5;
      border-radius: 8px;
      display: none;
    }
    .success {
      color: #27ae60;
      font-size: 14px;
      margin-top: 12px;
      padding: 12px;
      background: #f0fdf4;
      border-radius: 8px;
      display: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Paiement du devis</h1>
    <div class="company">${quote.company_name}</div>

    <div class="quote-info">
      <div class="quote-row">
        <span class="label">Client:</span>
        <span class="value">${quote.customer_name}</span>
      </div>
      <div class="quote-row">
        <span class="label">Numéro de devis:</span>
        <span class="value">${quote.quote_number || 'N/A'}</span>
      </div>
      <div class="quote-row total-row">
        <span class="label">Montant total:</span>
        <span class="value">${parseFloat(quote.total_amount).toFixed(2)} €</span>
      </div>
    </div>

    <form id="payment-form">
      <div id="card-element"></div>
      <button class="btn" type="submit" id="submit-button">
        <span id="button-text">Payer ${parseFloat(quote.total_amount).toFixed(2)} €</span>
      </button>
      <div class="error" id="error-message"></div>
      <div class="success" id="success-message"></div>
    </form>
  </div>

  <script>
    const form = document.getElementById('payment-form');
    const submitButton = document.getElementById('submit-button');
    const errorDiv = document.getElementById('error-message');
    const successDiv = document.getElementById('success-message');

    // Vérifier si Stripe est chargé
    if (typeof Stripe === 'undefined') {
      errorDiv.textContent = 'Impossible de charger Stripe. Vérifiez votre connexion internet et désactivez les bloqueurs de publicités.';
      errorDiv.style.display = 'block';
      submitButton.disabled = true;
      throw new Error('Stripe not loaded');
    }

    const stripe = Stripe('${process.env.STRIPE_PUBLISHABLE_KEY}');
    const elements = stripe.elements();
    const cardElement = elements.create('card', {
      style: {
        base: {
          fontSize: '16px',
          color: '#1a1a1a',
          '::placeholder': { color: '#999' }
        }
      }
    });
    cardElement.mount('#card-element');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      submitButton.disabled = true;
      submitButton.textContent = 'Traitement...';
      errorDiv.style.display = 'none';
      successDiv.style.display = 'none';

      try {
        // Créer un PaymentIntent
        const response = await fetch('/api/payments/create-payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quote_id: '${quote_id}',
            amount: ${quote.total_amount}
          })
        });

        const { clientSecret, error: serverError } = await response.json();

        if (serverError) throw new Error(serverError);

        // Confirmer le paiement
        const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
          payment_method: { card: cardElement }
        });

        if (error) throw error;

        successDiv.textContent = '✓ Paiement réussi! Redirection...';
        successDiv.style.display = 'block';
        setTimeout(() => window.location.href = '/pay/payment-success?quote_id=${quote_id}', 2000);
      } catch (err) {
        errorDiv.textContent = err.message || 'Une erreur est survenue';
        errorDiv.style.display = 'block';
        submitButton.disabled = false;
        submitButton.textContent = 'Payer ${parseFloat(quote.total_amount).toFixed(2)} €';
      }
    });
  </script>
</body>
</html>
    `;

    res.send(html);
  } catch (error: any) {
    console.error('Error loading Stripe payment page:', error);
    res.status(500).send('<h1>Erreur lors du chargement de la page de paiement</h1>');
  }
});

/**
 * GET /applepay/:quote_id
 * Page de paiement Apple Pay pour un devis
 */
router.get('/applepay/:quote_id', async (req, res) => {
  try {
    const { quote_id } = req.params;

    // Récupérer les détails du devis
    const quoteResult = await pool.query(`
      SELECT
        q.*,
        c.name as customer_name,
        c.email as customer_email,
        cp.company_name
      FROM quotes q
      LEFT JOIN customers c ON q.customer_id = c.id
      LEFT JOIN company_profiles cp ON cp.id = (SELECT id FROM company_profiles LIMIT 1)
      WHERE q.id = $1
    `, [quote_id]);

    if (quoteResult.rows.length === 0) {
      return res.status(404).send('<h1>Devis non trouvé</h1>');
    }

    const quote = quoteResult.rows[0];

    // Générer une page HTML de paiement Apple Pay
    const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Paiement Apple Pay - ${quote.company_name}</title>
  <script src="https://js.stripe.com/v3/"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.5);
      max-width: 500px;
      width: 100%;
      padding: 40px;
    }
    h1 {
      font-size: 28px;
      color: #1a1a1a;
      margin-bottom: 8px;
    }
    .company { font-size: 14px; color: #666; margin-bottom: 24px; }
    .quote-info {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 12px;
      margin-bottom: 24px;
    }
    .quote-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 12px;
      font-size: 15px;
    }
    .quote-row:last-child { margin-bottom: 0; }
    .label { color: #666; }
    .value { font-weight: 600; color: #1a1a1a; }
    .total-row {
      border-top: 2px solid #ddd;
      padding-top: 12px;
      margin-top: 12px;
      font-size: 18px;
    }
    .total-row .value { color: #000; font-size: 24px; }
    #payment-request-button {
      margin-top: 24px;
      height: 50px;
    }
    .error {
      color: #e74c3c;
      font-size: 14px;
      margin-top: 12px;
      padding: 12px;
      background: #fef5f5;
      border-radius: 8px;
      display: none;
    }
    .success {
      color: #27ae60;
      font-size: 14px;
      margin-top: 12px;
      padding: 12px;
      background: #f0fdf4;
      border-radius: 8px;
      display: none;
    }
    .note {
      margin-top: 16px;
      font-size: 13px;
      color: #999;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Paiement Apple Pay</h1>
    <div class="company">${quote.company_name}</div>

    <div class="quote-info">
      <div class="quote-row">
        <span class="label">Client:</span>
        <span class="value">${quote.customer_name}</span>
      </div>
      <div class="quote-row">
        <span class="label">Numéro de devis:</span>
        <span class="value">${quote.quote_number || 'N/A'}</span>
      </div>
      <div class="quote-row total-row">
        <span class="label">Montant total:</span>
        <span class="value">${parseFloat(quote.total_amount).toFixed(2)} €</span>
      </div>
    </div>

    <div id="payment-request-button"></div>
    <div class="error" id="error-message"></div>
    <div class="success" id="success-message"></div>
    <div class="note">Apple Pay est disponible sur Safari avec un appareil compatible</div>
  </div>

  <script>
    const stripe = Stripe('${process.env.STRIPE_PUBLISHABLE_KEY}');
    const errorDiv = document.getElementById('error-message');
    const successDiv = document.getElementById('success-message');

    const paymentRequest = stripe.paymentRequest({
      country: 'FR',
      currency: 'eur',
      total: {
        label: 'Devis ${quote.quote_number || 'N/A'}',
        amount: Math.round(${quote.total_amount} * 100)
      },
      requestPayerName: true,
      requestPayerEmail: true
    });

    const elements = stripe.elements();
    const prButton = elements.create('paymentRequestButton', { paymentRequest });

    paymentRequest.canMakePayment().then((result) => {
      if (result) {
        prButton.mount('#payment-request-button');
      } else {
        errorDiv.textContent = 'Apple Pay n\\'est pas disponible sur cet appareil';
        errorDiv.style.display = 'block';
      }
    });

    paymentRequest.on('paymentmethod', async (ev) => {
      try {
        const response = await fetch('/api/payments/create-payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quote_id: '${quote_id}',
            amount: ${quote.total_amount}
          })
        });

        const { clientSecret, error: serverError } = await response.json();

        if (serverError) {
          ev.complete('fail');
          throw new Error(serverError);
        }

        const { error, paymentIntent } = await stripe.confirmCardPayment(
          clientSecret,
          { payment_method: ev.paymentMethod.id },
          { handleActions: false }
        );

        if (error) {
          ev.complete('fail');
          throw error;
        }

        ev.complete('success');
        successDiv.textContent = '✓ Paiement réussi! Redirection...';
        successDiv.style.display = 'block';
        setTimeout(() => window.location.href = '/pay/payment-success?quote_id=${quote_id}', 2000);
      } catch (err) {
        errorDiv.textContent = err.message || 'Une erreur est survenue';
        errorDiv.style.display = 'block';
      }
    });
  </script>
</body>
</html>
    `;

    res.send(html);
  } catch (error: any) {
    console.error('Error loading Apple Pay payment page:', error);
    res.status(500).send('<h1>Erreur lors du chargement de la page de paiement</h1>');
  }
});

/**
 * GET /payment-success
 * Page de confirmation de paiement
 */
router.get('/payment-success', async (req, res) => {
  const { quote_id } = req.query;
  let quoteDetails = null;

  if (quote_id) {
    try {
      const quoteResult = await pool.query(`SELECT q.*, c.name as customer_name, c.email as customer_email, cp.company_name FROM quotes q LEFT JOIN customers c ON q.customer_id = c.id LEFT JOIN company_profiles cp ON cp.id = (SELECT id FROM company_profiles LIMIT 1) WHERE q.id = $1`, [quote_id]);
      if (quoteResult.rows.length > 0) quoteDetails = quoteResult.rows[0];
    } catch (error) { console.error('Error fetching quote details:', error); }
  }

  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Paiement réussi</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}.container{background:white;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,0.3);max-width:600px;width:100%;padding:40px;text-align:center}.success-icon{width:80px;height:80px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 24px}.success-icon svg{width:48px;height:48px;fill:white}h1{font-size:32px;color:#1a1a1a;margin-bottom:16px}p{font-size:16px;color:#666;line-height:1.6;margin-bottom:12px}.details-section{background:#f8f9fa;padding:24px;border-radius:12px;margin:24px 0;text-align:left}.details-title{font-size:18px;font-weight:600;color:#1a1a1a;margin-bottom:16px;text-align:center}.detail-row{display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid #e5e5e5}.detail-row:last-child{border-bottom:none}.detail-label{font-size:14px;color:#666}.detail-value{font-size:14px;font-weight:600;color:#1a1a1a}.total-row{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);margin:16px -24px -24px;padding:16px 24px;border-radius:0 0 12px 12px}.total-row .detail-label,.total-row .detail-value{color:white;font-size:18px}.email-note{background:#f0fdf4;padding:16px;border-radius:8px;margin-top:24px;font-size:14px;color:#166534;border:1px solid #bbf7d0}</style></head><body><div class="container"><div class="success-icon"><svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg></div><h1>Paiement réussi !</h1><p>Votre paiement a été traité avec succès.</p><p>Merci pour votre confiance.</p>${quoteDetails ? `<div class="details-section"><div class="details-title">Récapitulatif de votre commande</div><div class="detail-row"><span class="detail-label">Numéro de devis</span><span class="detail-value">${quoteDetails.quote_number || 'N/A'}</span></div><div class="detail-row"><span class="detail-label">Client</span><span class="detail-value">${quoteDetails.customer_name || 'N/A'}</span></div><div class="detail-row"><span class="detail-label">Email</span><span class="detail-value">${quoteDetails.customer_email || 'N/A'}</span></div><div class="detail-row"><span class="detail-label">Entreprise</span><span class="detail-value">${quoteDetails.company_name || 'N/A'}</span></div><div class="detail-row"><span class="detail-label">Date</span><span class="detail-value">${new Date().toLocaleDateString('fr-FR')}</span></div><div class="total-row"><div class="detail-row" style="border:none;padding:0"><span class="detail-label">Montant payé</span><span class="detail-value">${parseFloat(quoteDetails.total_amount).toFixed(2)} €</span></div></div></div>` : ''}<div class="email-note">✉️ Vous recevrez un email de confirmation avec votre facture sous peu.</div></div></body></html>`;
  res.send(html);
});

export default router;
