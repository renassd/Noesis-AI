// ============================================================
// Neuvra Billing — Database operations
// All subscription DB access goes through here.
// Never import Paddle or Stripe in this file.
// ============================================================

import { getSupabaseAdmin } from "@/lib/supabase";
import type {
  NormalizedEvent,
  NormalizedSubscription,
  PlanId,
  PlanRow,
  SubscriptionRow,
} from "./types";

// ── Read ─────────────────────────────────────────────────────

export async function getSubscriptionByUserId(
  userId: string
): Promise<SubscriptionRow | null> {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error && error.code !== "PGRST116") throw error; // PGRST116 = not found
  return data ?? null;
}

export async function getSubscriptionByProviderId(
  providerSubscriptionId: string
): Promise<SubscriptionRow | null> {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("subscriptions")
    .select("*")
    .eq("provider_subscription_id", providerSubscriptionId)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data ?? null;
}

export async function getUserIdByProviderCustomerId(
  providerCustomerId: string
): Promise<string | null> {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("subscriptions")
    .select("user_id")
    .eq("provider_customer_id", providerCustomerId)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data?.user_id ?? null;
}

export async function getPlan(planId: PlanId): Promise<PlanRow | null> {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("plans")
    .select("*")
    .eq("id", planId)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data ?? null;
}

export async function getAllPlans(): Promise<PlanRow[]> {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("plans")
    .select("*")
    .eq("is_active", true)
    .order("price_monthly", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

// ── Write ────────────────────────────────────────────────────

/**
 * Upsert subscription from a normalized event.
 * This is the ONLY place subscription state is written.
 * Called by webhook handler after event is normalized.
 */
export async function upsertSubscription(
  sub: NormalizedSubscription
): Promise<void> {
  const db = getSupabaseAdmin();
  const { error } = await db.from("subscriptions").upsert(
    {
      user_id: sub.userId,
      plan_id: sub.planId,
      status: sub.status,
      current_period_start: sub.currentPeriodStart?.toISOString() ?? null,
      current_period_end: sub.currentPeriodEnd?.toISOString() ?? null,
      cancel_at_period_end: sub.cancelAtPeriodEnd,
      trial_ends_at: sub.trialEndsAt?.toISOString() ?? null,
      provider: sub.provider,
      provider_subscription_id: sub.providerSubscriptionId,
      provider_customer_id: sub.providerCustomerId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) throw error;
}

/**
 * Append event to the audit log.
 * Returns false if event was already processed (idempotency).
 */
export async function recordEvent(event: NormalizedEvent): Promise<boolean> {
  const db = getSupabaseAdmin();

  // Get subscription ID for the FK
  let subscriptionId: string | null = null;
  if (event.userId) {
    const sub = await getSubscriptionByUserId(event.userId);
    subscriptionId = sub?.id ?? null;
  }

  const { error } = await db.from("subscription_events").insert({
    user_id: event.userId,
    subscription_id: subscriptionId,
    event_type: event.type,
    plan_id: event.planId,
    provider: event.provider,
    provider_event_id: event.providerEventId,
    raw_payload: event.rawPayload,
  });

  if (error) {
    // Unique constraint on (provider, provider_event_id) = already processed
    if (error.code === "23505") return false;
    throw error;
  }

  return true; // true = newly processed
}

/**
 * Atomic: record event + upsert subscription.
 * The two operations always happen together.
 */
export async function applyEvent(event: NormalizedEvent): Promise<{
  alreadyProcessed: boolean;
}> {
  const isNew = await recordEvent(event);
  if (!isNew) return { alreadyProcessed: true };

  if (event.userId) {
    await upsertSubscription(event.subscription);
  }

  return { alreadyProcessed: false };
}
