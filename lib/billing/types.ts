// ============================================================
// Neuvra Billing — Shared Types
// All provider-specific types are mapped TO these before any
// business logic runs. Migration = swap provider, keep types.
// ============================================================

export type PlanId = "free" | "pro";

// Re-export FeatureKey from feature-gates so types.ts is the single import point
export type { FeatureKey } from "./feature-gates";

export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "canceled"
  | "past_due"
  | "paused"
  | "inactive";  // default for free / never subscribed

export type ProviderName = "paddle" | "stripe";

// Normalized subscription — provider-agnostic ─────────────────
export interface NormalizedSubscription {
  userId: string;
  planId: PlanId;
  status: SubscriptionStatus;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  trialEndsAt: Date | null;
  provider: ProviderName;
  providerSubscriptionId: string;
  providerCustomerId: string;
}

// Normalized event — what webhooks produce ────────────────────
export type NormalizedEventType =
  | "subscription.activated"
  | "subscription.updated"
  | "subscription.canceled"
  | "subscription.past_due"
  | "subscription.paused"
  | "subscription.resumed"
  | "payment.succeeded"
  | "payment.failed";

export interface NormalizedEvent {
  type: NormalizedEventType;
  providerEventId: string;
  provider: ProviderName;
  userId: string | null;       // null if not yet resolved from provider customer
  planId: PlanId;
  subscription: NormalizedSubscription;
  rawPayload: unknown;
}

// Checkout ────────────────────────────────────────────────────
export type BillingInterval = "monthly" | "yearly";

export interface CheckoutParams {
  userId: string;
  email: string;
  planId: PlanId;
  interval: BillingInterval;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutSession {
  url: string;
  sessionId: string;
}

// Provider interface — the only contract that matters ─────────
// Both Paddle and Stripe implement this. Business logic never
// touches provider-specific code directly.
export interface PaymentProvider {
  readonly name: ProviderName;

  /** Returns URL to redirect user to hosted checkout */
  createCheckoutSession(params: CheckoutParams): Promise<CheckoutSession>;

  /** Verifies signature, returns normalized event. Throws on invalid sig. */
  handleWebhook(rawBody: string, signature: string): Promise<NormalizedEvent>;

  /** Fetch live subscription state from provider */
  getSubscription(providerSubscriptionId: string): Promise<NormalizedSubscription>;

  /** Cancel at period end */
  cancelSubscription(providerSubscriptionId: string): Promise<void>;

  /** Pause billing (Paddle supports this natively) */
  pauseSubscription?(providerSubscriptionId: string): Promise<void>;

  /** Resume a paused subscription */
  resumeSubscription?(providerSubscriptionId: string): Promise<void>;
}

// DB row shapes ───────────────────────────────────────────────
export interface SubscriptionRow {
  id: string;
  user_id: string;
  plan_id: PlanId;
  status: SubscriptionStatus;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  trial_ends_at: string | null;
  provider: ProviderName | null;
  provider_subscription_id: string | null;
  provider_customer_id: string | null;
  provider_metadata: unknown;
  created_at: string;
  updated_at: string;
}

export interface PlanRow {
  id: PlanId;
  name: string;
  price_monthly: number;
  price_yearly: number;
  monthly_ai_credits: number;
  features: string[];
  paddle_monthly_price_id: string | null;
  paddle_yearly_price_id: string | null;
  stripe_monthly_price_id: string | null;
  stripe_yearly_price_id: string | null;
}
