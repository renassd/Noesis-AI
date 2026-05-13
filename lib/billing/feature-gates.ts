// ============================================================
// Neuvra Feature Gates
// Zero dependency on Paddle or Stripe. Only cares about PlanId.
// Add features here as the product grows.
// ============================================================

import type { PlanId, SubscriptionStatus } from "./types";

// Every feature key in the product ───────────────────────────
export type FeatureKey =
  | "ai_tutor"               // AI chat tutor
  | "flashcards_basic"       // up to 30 AI cards/day
  | "flashcards_unlimited"   // no daily limit
  | "research"               // Research mode (chat)
  | "papers"                 // Analyze Papers tool chip
  | "smart_notes"            // Smart Notes
  | "memory_engine"          // Spaced repetition engine
  | "pdf_upload"             // Upload PDFs for analysis
  | "api_access"             // External API access
  | "team_features";         // Multi-user workspace

// Plan → feature matrix ───────────────────────────────────────
// This is the single source of truth for access control.
// Never check plan strings anywhere else in the codebase —
// always call hasFeature() or getAccessibleFeatures().
const PLAN_FEATURES: Record<PlanId, FeatureKey[]> = {
  free: [
    "ai_tutor",
    "flashcards_basic",
    "research",
    "pdf_upload",
  ],
  pro: [
    "ai_tutor",
    "flashcards_unlimited",
    "research",
    "papers",
    "smart_notes",
    "memory_engine",
    "pdf_upload",
  ],
};

// Daily AI credit limits per plan ─────────────────────────────
export const PLAN_DAILY_CREDITS: Record<PlanId, number> = {
  free: 50,
  pro:  500,
};

/**
 * Returns the effective plan for a user.
 * Inactive/expired subscriptions always fall back to free.
 * Call this instead of reading plan_id directly.
 */
export function getEffectivePlan(
  planId: PlanId,
  status: SubscriptionStatus
): PlanId {
  const activeStatuses: SubscriptionStatus[] = ["active", "trialing"];
  if (activeStatuses.includes(status)) return planId;
  return "free"; // canceled, past_due, paused → free tier
}

/**
 * Check if a user's subscription grants access to a feature.
 *
 * @example
 * const plan = getEffectivePlan(sub.planId, sub.status)
 * if (!hasFeature(plan, 'papers')) return res.status(403)...
 */
export function hasFeature(planId: PlanId, feature: FeatureKey): boolean {
  return PLAN_FEATURES[planId]?.includes(feature) ?? false;
}

/**
 * All features accessible on a given plan.
 */
export function getAccessibleFeatures(planId: PlanId): FeatureKey[] {
  return PLAN_FEATURES[planId] ?? [];
}

/**
 * Which plan is required to unlock a feature?
 * Returns the cheapest plan that includes it.
 */
export function requiredPlanFor(feature: FeatureKey): PlanId {
  const order: PlanId[] = ["free", "pro"];
  for (const plan of order) {
    if (PLAN_FEATURES[plan].includes(feature)) return plan;
  }
  return "pro";
}
