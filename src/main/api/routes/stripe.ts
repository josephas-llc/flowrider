/**
 * Stripe Webhook & Checkout Routes
 *
 * Endpoints:
 * - POST /api/stripe/webhook - Receives Stripe events
 * - POST /api/stripe/create-checkout - Creates checkout session
 * - GET /api/stripe/lookup-license - Lookup license by email
 */

import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { getStripeLicenseService, STRIPE_CONFIG, LicenseTier, TIER_LIMITS } from '../../StripeService';

const router = Router();

// Initialize Stripe (only if secret key is configured)
let stripe: Stripe | null = null;
if (STRIPE_CONFIG.SECRET_KEY && STRIPE_CONFIG.SECRET_KEY !== '') {
  stripe = new Stripe(STRIPE_CONFIG.SECRET_KEY, {
    apiVersion: '2026-07-29.dahlia'
  });
}

/**
 * Stripe Webhook Handler
 * Receives payment events from Stripe
 */
router.post('/webhook', async (req: Request, res: Response) => {
  if (!stripe) {
    return res.status(500).json({ error: 'Stripe not configured' });
  }

  const sig = req.headers['stripe-signature'] as string;
  let event: Stripe.Event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(
      req.body, // raw body
      sig,
      STRIPE_CONFIG.WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('[Stripe Webhook] Signature verification failed:', err);
    return res.status(400).json({ error: 'Webhook signature verification failed' });
  }

  console.log(`[Stripe Webhook] Received event: ${event.type}`);

  const licenseService = getStripeLicenseService();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        // Get customer email
        const email = session.customer_email || session.customer_details?.email;
        if (!email) {
          console.error('[Stripe Webhook] No email in session');
          break;
        }

        // Determine tier from metadata or line items
        let tier = LicenseTier.PRO; // default

        if (session.metadata?.tier) {
          tier = session.metadata.tier as LicenseTier;
        } else if (session.line_items?.data?.[0]?.price?.id) {
          const priceId = session.line_items.data[0].price.id;
          if (priceId.includes('team')) tier = LicenseTier.TEAM;
          else if (priceId.includes('enterprise')) tier = LicenseTier.ENTERPRISE;
        }

        // Create license
        const license = licenseService.createLicense({
          tier,
          customerEmail: email,
          customerName: session.customer_details?.name || undefined,
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: session.subscription as string || undefined
        });

        console.log(`[Stripe Webhook] Created license ${license.key} for ${email} (${tier})`);

        // TODO: Send email with license key via Resend/SendGrid
        // await sendLicenseEmail(email, license.key, tier);

        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        licenseService.handleStripeWebhook({
          type: event.type,
          data: { object: { id: subscription.id, customer: subscription.customer as string } }
        });
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        licenseService.handleStripeWebhook({
          type: event.type,
          data: {
            object: {
              id: subscription.id,
              customer: subscription.customer as string,
              status: subscription.status
            }
          }
        });
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log(`[Stripe Webhook] Payment failed for ${invoice.customer_email}`);
        // Consider implementing grace period
        break;
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error('[Stripe Webhook] Error processing event:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * Create Stripe Checkout Session
 * Frontend calls this to get a checkout URL
 */
router.post('/create-checkout', async (req: Request, res: Response) => {
  if (!stripe) {
    return res.status(500).json({ error: 'Stripe not configured. Set STRIPE_SECRET_KEY.' });
  }

  const { tier, email, successUrl, cancelUrl } = req.body;

  if (!tier || !['pro', 'team', 'enterprise'].includes(tier)) {
    return res.status(400).json({ error: 'Invalid tier. Must be: pro, team, or enterprise' });
  }

  // Map tier to Stripe Price ID
  const priceIdMap: Record<string, string> = {
    pro: STRIPE_CONFIG.PRICE_IDS.PRO_MONTHLY,
    team: STRIPE_CONFIG.PRICE_IDS.TEAM_MONTHLY,
    enterprise: STRIPE_CONFIG.PRICE_IDS.ENTERPRISE
  };

  const priceId = priceIdMap[tier];

  if (!priceId || priceId === 'price_xxx') {
    return res.status(500).json({
      error: 'Stripe prices not configured. Create products in Stripe Dashboard and set STRIPE_PRICE_* env vars.'
    });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],
      customer_email: email || undefined,
      metadata: {
        tier: tier
      },
      success_url: successUrl || STRIPE_CONFIG.SUCCESS_URL,
      cancel_url: cancelUrl || STRIPE_CONFIG.CANCEL_URL
    });

    res.json({
      checkoutUrl: session.url,
      sessionId: session.id
    });
  } catch (error) {
    console.error('[Stripe] Error creating checkout:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to create checkout session'
    });
  }
});

/**
 * Lookup license by email
 * For customer support / lost license key
 */
router.get('/lookup-license', async (req: Request, res: Response) => {
  const { email } = req.query;

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email required' });
  }

  const licenseService = getStripeLicenseService();
  const license = licenseService.getLicenseByEmail(email);

  if (!license) {
    return res.status(404).json({ error: 'No license found for this email' });
  }

  // Don't expose the full key, just the first/last parts
  const maskedKey = `${license.key.slice(0, 7)}****${license.key.slice(-4)}`;

  res.json({
    tier: license.tier,
    maskedKey,
    maxSessions: license.maxSessions,
    activations: license.activations,
    maxActivations: license.maxActivations,
    isActive: license.isActive,
    expiresAt: license.expiresAt,
    createdAt: license.createdAt
  });
});

/**
 * Activate license key
 */
router.post('/activate', async (req: Request, res: Response) => {
  const { licenseKey } = req.body;

  if (!licenseKey) {
    return res.status(400).json({ error: 'License key required' });
  }

  const licenseService = getStripeLicenseService();
  const result = licenseService.activateLicense(licenseKey);

  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  res.json({
    success: true,
    tier: result.license!.tier,
    maxSessions: result.license!.maxSessions,
    activations: result.license!.activations,
    maxActivations: result.license!.maxActivations
  });
});

/**
 * Deactivate license on this machine
 */
router.post('/deactivate', async (req: Request, res: Response) => {
  const licenseService = getStripeLicenseService();
  const result = licenseService.deactivateLicense();

  res.json({ success: result.success });
});

/**
 * Get current license status
 */
router.get('/status', async (req: Request, res: Response) => {
  const licenseService = getStripeLicenseService();
  const { tier, maxSessions, license } = licenseService.getCurrentLicense();

  res.json({
    tier,
    maxSessions,
    isLicensed: license !== null,
    activations: license?.activations || 0,
    maxActivations: license?.maxActivations || 0,
    expiresAt: license?.expiresAt || null
  });
});

export default router;
