// ============================================================
// Neuvra Payment Service
//
// The ONE place the rest of the app talks to for billing.
// Switching from Paddle to Stripe = change activeProvider only.
// ============================================================

import { PaddleProvider } from "./providers/paddle";
import { StripeProvider } from "./providers/stripe";
import {
  applyEvent,
  getSubscriptionByUserId,
  getSubscriptionByProviderId,
} from "./db";
import { getEffectivePlan, hasFeature } from "./feature-gates";
import type {
  CheckoutParams,
  CheckoutSession,
  FeatureKey,
  NormalizedSubscription,
  PlanId,
  SubscriptionStatus,
} from "./types";

// ── Active provider ──────────────────────────────────────────
// THIS is the only line that changes during migration.
// Month 1–5: PaddleProvider
// Month 6+ : StripeProvider
const activeProvider = new PaddleProvider();
// const activeProvider = new StripeProvider(); // ← uncomment month 5

// Export for webhook routes that need to call handleWebhook()
export { activeProvider };

// ── Public API ───────────────────────────────────────────────

/**
 * Create a hosted checkout session for upgrading.
 * Returns a URL to redirect the user to.
 */
export async function createCheckoutSession(
  params: CheckoutParams
): Promise<CheckoutSession> {
  return activeProvider.createCheckoutSession(params);
}

/**
 * Process a verified, raw webhook from the provider.
 * Normalizes the event, writes to DB, and returns whether it was new.
 * Called by /api/webhooks/[provider]/route.ts only.
 */
export async function processWebhook(
  rawBody: string,
  signature: string
): Promise<{ alreadyProcessed: boolean; eventType: string }> {
  const event = await activeProvider.handleWebhook(rawBody, signature);
  const result = await applyEvent(event);
  return { alreadyProcessed: result.alreadyProcessed, eventType: event.type };
}

/**
 * Get the effective subscription state for a user.
 * Uses DB (fast) — call this on every request that needs plan info.
 */
export async function getSubscriptionStatus(userId: string): Promise<{
  planId: PlanId;
  status: SubscriptionStatus;
  effectivePlan: PlanId;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
}> {
  const row = await getSubscriptionByUserId(userId);

  if (!row) {
    // User has no subscription row (shouldn't happen after migration trigger,
    // but handle gracefully)
    return {
      planId: "free",
      status: "inactive",
      effectivePlan: "free",
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    };
  }

  const effectivePlan = getEffectivePlan(row.plan_id, row.status);

  return {
    planId: row.plan_id,
    status: row.status,
    effectivePlan,
    currentPeriodEnd: row.current_period_end
      ? new Date(row.current_period_end)
      : null,
    cancelAtPeriodEnd: row.cancel_at_period_end,
  };
}

/**
 * Check if a user can access a specific feature.
 * Always returns false for unknown users rather than throwing.
 */
export async function canAccess(
  userId: string,
  feature: FeatureKey
): Promise<boolean> {
  try {
    const { effectivePlan } = await getSubscriptionStatus(userId);
    return hasFeature(effectivePlan, feature);
  } catch {
    return false; // fail closed — deny access on error
  }
}

/**
 * Cancel the user's subscription at period end.
 */
export async function cancelSubscription(userId: string): Promise<void> {
  const row = await getSubscriptionByUserId(userId);
  if (!row?.provider_subscription_id) {
    throw new Error("No active subscription to cancel");
  }
  await activeProvider.cancelSubscription(row.provider_subscription_id);
  // State update arrives via webhook — no DB write here
}

/**
 * Sync subscription state from provider (use for recovery only).
 * Normally webhooks are the source of truth — don't poll.
 */
export async function syncSubscriptionFromProvider(
  providerSubscriptionId: string
): Promise<NormalizedSubscription> {
  const live = await activeProvider.getSubscription(providerSubscriptionId);
  // Update DB directly (bypass event log for manual sync)
  const row = await getSubscriptionByProviderId(providerSubscriptionId);
  if (row?.user_id) {
    live.userId = row.user_id;
    await applyEvent({
      type: "subscription.updated",
      providerEventId: `sync_${Date.now()}`,
      provider: activeProvider.name,
      userId: live.userId,
      planId: live.planId,
      subscription: live,
      rawPayload: { _type: "manual_sync" },
    });
  }
  return live;
}

// Re-export feature gate utilities for convenience
export { hasFeature, getEffectivePlan, requiredPlanFor, getAccessibleFeatures } from "./feature-gates";
export type { FeatureKey, PlanId } from "./types";
