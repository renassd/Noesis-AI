// ============================================================
// LemonSqueezy Billing Provider
// Implements PaymentProvider using LemonSqueezy v1 API.
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
import { getUserIdByProviderCustomerId } from "../db";

const LS_API_BASE = "https://api.lemonsqueezy.com/v1";

// ── API client ───────────────────────────────────────────────

async function lsRequest<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const key = process.env.LEMON_API;
  if (!key) throw new Error("LEMON_API not set");

  const res = await fetch(`${LS_API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/vnd.api+json",
      Accept: "application/vnd.api+json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LemonSqueezy ${method} ${path} → ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

// ── Plan resolution ─────────────────────────────────────────

function resolvePlanFromVariantId(variantId: string | number | undefined): PlanId {
  const id = String(variantId ?? "");
  if (id === process.env.LEMON_MONTH) return "pro";
  if (id === process.env.LEMON_YEARLY) return "pro";
  return "free";
}

// ── Status mapping ───────────────────────────────────────────

function mapStatus(lsStatus: string, cancelled: boolean): SubscriptionStatus {
  if (cancelled) return "canceled";
  switch (lsStatus) {
    case "active":    return "active";
    case "on_trial":  return "trialing";
    case "paused":    return "paused";
    case "past_due":  return "past_due";
    case "unpaid":    return "past_due";
    case "cancelled": return "canceled";
    case "expired":   return "canceled";
    default:          return "inactive";
  }
}

// ── Event type mapping ───────────────────────────────────────

function mapEventType(lsEvent: string): NormalizedEventType {
  switch (lsEvent) {
    case "subscription_created":  return "subscription.activated";
    case "subscription_updated":  return "subscription.updated";
    case "subscription_cancelled":return "subscription.canceled";
    case "subscription_resumed":  return "subscription.resumed";
    case "subscription_expired":  return "subscription.canceled";
    case "subscription_paused":   return "subscription.paused";
    case "subscription_unpaused": return "subscription.resumed";
    default:
      throw new Error(`Unhandled LemonSqueezy event type: ${lsEvent}`);
  }
}

// ── Webhook payload types ────────────────────────────────────

interface LSSubscriptionAttributes {
  store_id: number;
  customer_id: number;
  variant_id: number;
  status: string;
  cancelled: boolean;
  trial_ends_at: string | null;
  renews_at: string | null;
  ends_at: string | null;
  pause: unknown | null;
}

interface LSWebhookPayload {
  meta: {
    event_name: string;
    custom_data?: { user_id?: string };
  };
  data: {
    id: string;
    attributes: LSSubscriptionAttributes;
  };
}

// ── Normalize a LS subscription ──────────────────────────────

function normalizeSubscription(
  id: string,
  attrs: LSSubscriptionAttributes,
  userId: string,
): NormalizedSubscription {
  return {
    userId,
    planId: resolvePlanFromVariantId(attrs.variant_id),
    status: mapStatus(attrs.status, attrs.cancelled),
    currentPeriodStart: attrs.renews_at ? new Date(attrs.renews_at) : null,
    currentPeriodEnd: attrs.ends_at ? new Date(attrs.ends_at) : attrs.renews_at ? new Date(attrs.renews_at) : null,
    cancelAtPeriodEnd: attrs.cancelled,
    trialEndsAt: attrs.trial_ends_at ? new Date(attrs.trial_ends_at) : null,
    provider: "lemonsqueezy",
    providerSubscriptionId: id,
    providerCustomerId: String(attrs.customer_id),
  };
}

// ── Provider implementation ──────────────────────────────────

export class LemonSqueezyProvider implements PaymentProvider {
  readonly name = "lemonsqueezy" as const;

  async createCheckoutSession(params: CheckoutParams): Promise<CheckoutSession> {
    const storeId = process.env.STORE_ID;
    if (!storeId) throw new Error("STORE_ID not set");

    const variantId =
      params.interval === "yearly"
        ? process.env.LEMON_YEARLY
        : process.env.LEMON_MONTH;
    if (!variantId) throw new Error(`LEMON_${params.interval.toUpperCase()} not set`);

    const payload = {
      data: {
        type: "checkouts",
        attributes: {
          checkout_data: {
            email: params.email,
            custom: { user_id: params.userId },
          },
          checkout_options: { embed: false },
          product_options: {
            redirect_url: params.successUrl,
          },
        },
        relationships: {
          store: { data: { type: "stores", id: storeId } },
          variant: { data: { type: "variants", id: variantId } },
        },
      },
    };

    const res = await lsRequest<{ data: { id: string; attributes: { url: string } } }>(
      "POST",
      "/checkouts",
      payload,
    );

    return {
      url: res.data.attributes.url,
      sessionId: res.data.id,
    };
  }

  async handleWebhook(rawBody: string, signature: string): Promise<NormalizedEvent> {
    // Verify HMAC-SHA256 signature
    const secret = process.env.SIGNING_SECRET;
    if (!secret) throw new Error("SIGNING_SECRET not set");

    const digest = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");

    if (digest !== signature) {
      throw new Error("Invalid LemonSqueezy webhook signature");
    }

    const payload = JSON.parse(rawBody) as LSWebhookPayload;
    const { meta, data } = payload;

    let userId: string | null = meta.custom_data?.user_id ?? null;
    if (!userId && data.attributes.customer_id) {
      userId = await getUserIdByProviderCustomerId(String(data.attributes.customer_id));
    }
    const eventType = mapEventType(meta.event_name);
    const subscription = normalizeSubscription(data.id, data.attributes, userId ?? "");

    return {
      type: eventType,
      providerEventId: `${meta.event_name}_${data.id}_${Date.now()}`,
      provider: "lemonsqueezy",
      userId,
      planId: subscription.planId,
      subscription,
      rawPayload: payload,
    };
  }

  async getSubscription(providerSubscriptionId: string): Promise<NormalizedSubscription> {
    const res = await lsRequest<{ data: { id: string; attributes: LSSubscriptionAttributes } }>(
      "GET",
      `/subscriptions/${providerSubscriptionId}`,
    );

    return normalizeSubscription(res.data.id, res.data.attributes, "");
  }

  async cancelSubscription(providerSubscriptionId: string): Promise<void> {
    await lsRequest(
      "DELETE",
      `/subscriptions/${providerSubscriptionId}`,
    );
  }

  async pauseSubscription(providerSubscriptionId: string): Promise<void> {
    await lsRequest(
      "PATCH",
      `/subscriptions/${providerSubscriptionId}`,
      {
        data: {
          type: "subscriptions",
          id: providerSubscriptionId,
          attributes: { pause: { mode: "void" } },
        },
      },
    );
  }

  async resumeSubscription(providerSubscriptionId: string): Promise<void> {
    await lsRequest(
      "PATCH",
      `/subscriptions/${providerSubscriptionId}`,
      {
        data: {
          type: "subscriptions",
          id: providerSubscriptionId,
          attributes: { pause: null },
        },
      },
    );
  }
}
