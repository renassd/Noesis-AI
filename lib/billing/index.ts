// ============================================================
// lib/billing — Public API
// Import from here, never from internal files directly.
// ============================================================

export {
  createCheckoutSession,
  processWebhook,
  getSubscriptionStatus,
  canAccess,
  cancelSubscription,
  syncSubscriptionFromProvider,
  hasFeature,
  getEffectivePlan,
  requiredPlanFor,
} from "./payment-service";

export { PLAN_DAILY_CREDITS, getAccessibleFeatures } from "./feature-gates";
export { getAllPlans, getPlan } from "./db";
export type { FeatureKey, PlanId, SubscriptionStatus, BillingInterval } from "./types";
