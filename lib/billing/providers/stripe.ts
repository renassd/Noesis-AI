// ============================================================
// Stripe Provider (stub — activate in month 5)
//
// Migration checklist (when ready):
//  1. npm install stripe
//  2. Fill in the implementation below (mirrors paddle.ts shape)
//  3. Add STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET to .env
//  4. Update plan rows: set stripe_monthly_price_id / stripe_yearly_price_id
//  5. In payment-service.ts: change activeProvider to stripeProvider
//  6. Deploy — existing Paddle subscriptions keep working until they
//     renew, new checkouts go through Stripe. No data migration needed.
// ============================================================

import type {
  CheckoutParams,
  CheckoutSession,
  NormalizedEvent,
  NormalizedSubscription,
  PaymentProvider,
} from "../types";

export class StripeProvider implements PaymentProvider {
  readonly name = "stripe" as const;

  async createCheckoutSession(
    _params: CheckoutParams
  ): Promise<CheckoutSession> {
    // TODO month 5:
    // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
    // const session = await stripe.checkout.sessions.create({
    //   mode: 'subscription',
    //   customer_email: params.email,
    //   line_items: [{ price: priceId, quantity: 1 }],
    //   metadata: { user_id: params.userId },
    //   success_url: params.successUrl,
    //   cancel_url: params.cancelUrl,
    // })
    // return { url: session.url!, sessionId: session.id }
    throw new Error("StripeProvider not yet activated");
  }

  async handleWebhook(
    _rawBody: string,
    _signature: string
  ): Promise<NormalizedEvent> {
    // TODO month 5:
    // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
    // const event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET!)
    // Map event.type → NormalizedEventType
    // Map event.data.object (Stripe subscription) → NormalizedSubscription
    throw new Error("StripeProvider not yet activated");
  }

  async getSubscription(
    _providerSubscriptionId: string
  ): Promise<NormalizedSubscription> {
    throw new Error("StripeProvider not yet activated");
  }

  async cancelSubscription(_providerSubscriptionId: string): Promise<void> {
    throw new Error("StripeProvider not yet activated");
  }
}

// ── Stripe event type mapping (reference for month 5) ───────
//
// Stripe event                         → NormalizedEventType
// ─────────────────────────────────────────────────────────────
// customer.subscription.created        → subscription.activated
// customer.subscription.updated        → subscription.updated
// customer.subscription.deleted        → subscription.canceled
// invoice.payment_succeeded            → payment.succeeded
// invoice.payment_failed               → payment.failed
// customer.subscription.trial_will_end → (informational, no state change)
//
// Stripe status → SubscriptionStatus
// active        → active
// trialing      → trialing
// past_due      → past_due
// canceled      → canceled
// unpaid        → past_due
// paused        → paused
