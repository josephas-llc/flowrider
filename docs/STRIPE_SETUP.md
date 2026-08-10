# Stripe Setup Guide for Flowrider

## Overview

Flowrider uses Stripe for subscription payments. When a customer pays, they receive a license key that unlocks Pro or Team features.

## Quick Setup

### 1. Environment Variables

Set these environment variables on your server:

```bash
# Stripe API Keys (from dashboard.stripe.com/apikeys)
STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Price IDs (from dashboard.stripe.com/products)
STRIPE_PRICE_PRO_MONTHLY=price_xxx
STRIPE_PRICE_PRO_YEARLY=price_xxx
STRIPE_PRICE_TEAM_MONTHLY=price_xxx
STRIPE_PRICE_TEAM_YEARLY=price_xxx
```

### 2. Stripe Products

Create these products in [Stripe Dashboard](https://dashboard.stripe.com/products):

| Product | Monthly | Yearly | Sessions |
|---------|---------|--------|----------|
| Flowrider Pro | $19/mo | $190/yr | 20 |
| Flowrider Team | $49/mo | $490/yr | 100 |

Add metadata to each product:
- `tier`: `pro` or `team`
- `sessions`: `20` or `100`

### 3. Webhook Configuration

1. Go to [Stripe Webhooks](https://dashboard.stripe.com/webhooks)
2. Add endpoint: `https://flowrider.dev/api/stripe/webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.deleted`
   - `customer.subscription.updated`
   - `invoice.payment_failed`
4. Copy the signing secret to `STRIPE_WEBHOOK_SECRET`

## How It Works

### Payment Flow

```
Customer → Pricing Page → Stripe Checkout → Payment
                                               ↓
                              Webhook → Generate License Key
                                               ↓
                              Email License Key to Customer
                                               ↓
                              Customer activates in Flowrider app
```

### License Keys

- Format: `FR-XXXX-XXXX-XXXX-XXXX`
- Stored in SQLite: `~/.flowrider/licenses.db`
- Pro: 3 device activations
- Team: 10 device activations

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/stripe/webhook` | POST | Receives Stripe events |
| `/api/stripe/create-checkout` | POST | Creates checkout session |
| `/api/stripe/status` | GET | Get current license status |
| `/api/stripe/activate` | POST | Activate a license key |
| `/api/stripe/deactivate` | POST | Deactivate on this device |

## Testing

Use Stripe test mode:
- Test card: `4242 4242 4242 4242`
- Any future expiry, any CVC

## Security Notes

- Never commit API keys to git
- Use environment variables
- Webhook signature verification is required
- License keys are generated server-side only

## Troubleshooting

### "Stripe not configured"
Check that `STRIPE_SECRET_KEY` environment variable is set.

### Webhook not working
1. Check webhook logs in Stripe Dashboard
2. Verify endpoint URL is correct
3. Check `STRIPE_WEBHOOK_SECRET` matches

### License not activating
1. Verify key format: `FR-XXXX-XXXX-XXXX-XXXX`
2. Check activation limit not exceeded
3. Check license hasn't expired
