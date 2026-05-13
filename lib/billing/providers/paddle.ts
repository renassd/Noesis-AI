// ============================================================
// Paddle Billing Provider
// Implements PaymentProvider using Paddle Billing (v2 API).
// Maps ALL Paddle events → NormalizedEvent before returning.
// Nothing outside this file knows about Paddle's data shapes.
// ============================================================

import crypto from "crypto";
import type {
  CheckoutParams,
  CheckoutSession,
  NormalizedEvent,
  NormalizedEventType,
  NormalizedSubscription,
  PaymentProvider,
  PlanId,
  SubscriptionStatus,
} from "../types";
import { getPlan } from "../db";

// ── Paddle API client (lightweight, no SDK needed) ──────────

const PADDLE_API_BASE =
  process.env.PADDLE_SANDBOX === "true"
    ? "https://sandbox-api.paddle.com"
    : "https://api.paddle.com";

async function paddleRequest<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const key = process.env.PADDLE_API_KEY;
  if (!key) throw new Error("PADDLE_API_KEY not set");

  const res = await fetch(`${PADDLE_API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Paddle API ${method} ${path} → ${res.status}: ${text}`);
  }

  const json = await res.json() as { data: T };
  return json.data;
}

// ── Paddle → internal plan mapping ──────────────────────────
// Maps Paddle price IDs to our internal plan IDs.
// Update when you add new prices in Paddle dashboard.
function resolvePlanFromPaddlePriceId(
  priceId: string | undefined
): PlanId {
  const monthly = process.env.PADDLE_PRO_MONTHLY_PRICE_ID;
  const yearly  = process.env.PADDLE_PRO_YEARLY_PRICE_ID;

  if (priceId === monthly || priceId === yearly) return "pro";
  return "free";
}

// ── Status mapping ───────────────────────────────────────────
function mapPaddleStatus(status: string): SubscriptionStatus {
  const map: Record<string, SubscriptionStatus> = {
    active:    "active",
    trialing:  "trialing",
    canceled:  "canceled",
    past_due:  "past_due",
    paused:    "paused",
    inactive:  "inactive",
  };
  return map[status] ?? "inactive";
}

// ── Event type mapping ───────────────────────────────────────
function mapPaddleEventType(
  paddleEventType: string
): NormalizedEventType | null {
  const map: Record<string, NormalizedEventType> = {
    "subscription.activated":                "subscription.activated",
    "subscription.updated":                  "subscription.updated",
    "subscription.canceled":                 "subscription.canceled",
    "subscription.past_due":                 "subscription.past_due",
    "subscription.paused":                   "subscription.paused",
    "subscription.resumed":                  "subscription.resumed",
    "transaction.completed":                 "payment.succeeded",
    "transaction.payment_failed":            "payment.failed",
  };
  return map[paddleEventType] ?? null;
}

// ── Normalize a Paddle subscription object ───────────────────
function normalizePaddleSubscription(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  paddleSub: any,
  userId: string
): NormalizedSubscription {
  const priceId = paddleSub.items?.[0]?.price?.id as string | undefined;
  const planId  = resolvePlanFromPaddlePriceId(priceId);

  return {
    userId,
    planId,
    status:                 mapPaddleStatus(paddleSub.status),
    currentPeriodStart:     paddleSub.current_billing_period?.starts_at
                              ? new Date(paddleSub.current_billing_period.starts_at)
                              : null,
    currentPeriodEnd:       paddleSub.current_billing_period?.ends_at
                              ? new Date(paddleSub.current_billing_period.ends_at)
                              : null,
    cancelAtPeriodEnd:      paddleSub.scheduled_change?.action === "cancel",
    trialEndsAt:            paddleSub.trial_dates?.ends_at
                              ? new Date(paddleSub.trial_dates.ends_at)
                              : null,
    provider:               "paddle",
    providerSubscriptionId: paddleSub.id,
    providerCustomerId:     paddleSub.customer_id,
  };
}

// ── Webhook signature verification ──────────────────────────
// Paddle uses HMAC-SHA256 signed with your webhook secret.
function verifyPaddleSignature(
  rawBody: string,
  signatureHeader: string
): boolean {
  const secret = process.env.PADDLE_WEBHOOK_SECRET;
  if (!secret) throw new Error("PADDLE_WEBHOOK_SECRET not set");

  // Header format: "ts=1234567890;h1=abc123..."
  const parts = Object.fromEntries(
    signatureHeader.split(";").map((p) => p.split("=") as [string, string])
  );
  const ts = parts["ts"];
  const h1 = parts["h1"];
  if (!ts || !h1) return false;

  const payload  = `${ts}:${rawBody}`;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(expected, "hex"),
    Buffer.from(h1, "hex")
  );
}

// ── PaddleProvider ───────────────────────────────────────────
export class PaddleProvider implements PaymentProvider {
  readonly name = "paddle" as const;

  // ── createCheckoutSession ──────────────────────────────────
  async createCheckoutSession(params: CheckoutParams): Promise<CheckoutSession> {
    const plan = await getPlan(params.planId);
    if (!plan) throw new Error(`Plan ${params.planId} not found`);

    const priceId =
      params.interval === "yearly"
        ? plan.paddle_yearly_price_id
        : plan.paddle_monthly_price_id;

    if (!priceId) {
      throw new Error(
        `No Paddle price ID configured for plan ${params.planId} / ${params.interval}`
      );
    }

    // Create a Paddle transaction (hosted checkout)
    const transaction = await paddleRequest<{
      id: string;
      checkout: { url: string };
    }>("POST", "/transactions", {
      items: [{ price_id: priceId, quantity: 1 }],
      customer: { email: params.email },
      custom_data: { user_id: params.userId },  // passed back in webhooks
      checkout: {
        url: params.successUrl,
      },
    });

    return {
      url: transaction.checkout.url,
      sessionId: transaction.id,
    };
  }

  // ── handleWebhook ──────────────────────────────────────────
  async handleWebhook(
    rawBody: string,
    signatureHeader: string
  ): Promise<NormalizedEvent> {
    if (!verifyPaddleSignature(rawBody, signatureHeader)) {
      throw new Error("Invalid Paddle webhook signature");
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const event = JSON.parse(rawBody) as any;
    const eventType = mapPaddleEventType(event.event_type);

    if (!eventType) {
      throw new Error(`Unhandled Paddle event type: ${event.event_type}`);
    }

    // Data is under event.data — subscription or transaction
    const data = event.data;

    // For subscription events, data IS the subscription
    // For transaction events, data.subscription_id lets us fetch the sub
    const isSubscriptionEvent = event.event_type.startsWith("subscription.");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let paddleSub: any;

    if (isSubscriptionEvent) {
      paddleSub = data;
    } else if (data.subscription_id) {
      paddleSub = await paddleRequest("GET", `/subscriptions/${data.subscription_id}`);
    }

    // Resolve user ID from custom_data (set at checkout) or DB lookup
    const userId: string | null =
      paddleSub?.custom_data?.user_id ??
      data?.custom_data?.user_id ??
      null;

    if (!userId) {
      throw new Error(
        `Cannot resolve user_id from Paddle event ${event.event_id}`
      );
    }

    const subscription = normalizePaddleSubscription(paddleSub, userId);

    return {
      type: eventType,
      providerEventId: event.event_id,
      provider: "paddle",
      userId,
      planId: subscription.planId,
      subscription,
      rawPayload: event,
    };
  }

  // ── getSubscription ────────────────────────────────────────
  async getSubscription(
    providerSubscriptionId: string
  ): Promise<NormalizedSubscription> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const paddleSub = await paddleRequest<any>(
      "GET",
      `/subscriptions/${providerSubscriptionId}`
    );
    // userId is stored in custom_data set at checkout time
    const userId = paddleSub.custom_data?.user_id ?? "";
    return normalizePaddleSubscription(paddleSub, userId);
  }

  // ── cancelSubscription ─────────────────────────────────────
  // Cancels at end of current billing period.
  async cancelSubscription(providerSubscriptionId: string): Promise<void> {
    await paddleRequest(
      "POST",
      `/subscriptions/${providerSubscriptionId}/cancel`,
      { effective_from: "next_billing_period" }
    );
  }

  // ── pauseSubscription ──────────────────────────────────────
  async pauseSubscription(providerSubscriptionId: string): Promise<void> {
    await paddleRequest(
      "POST",
      `/subscriptions/${providerSubscriptionId}/pause`,
      { effective_from: "next_billing_period" }
    );
  }

  // ── resumeSubscription ─────────────────────────────────────
  async resumeSubscription(providerSubscriptionId: string): Promise<void> {
    await paddleRequest(
      "POST",
      `/subscriptions/${providerSubscriptionId}/resume`,
      { effective_from: "immediately" }
    );
  }
}
