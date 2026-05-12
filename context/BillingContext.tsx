"use client";

// ============================================================
// BillingContext
// Provides subscription state + feature gate helpers to all
// client components. Zero knowledge of Paddle or Stripe.
// ============================================================

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { FeatureKey, PlanId, SubscriptionStatus } from "@/lib/billing";

interface BillingState {
  loading: boolean;
  planId: PlanId;
  effectivePlan: PlanId;
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  features: FeatureKey[];
}

interface BillingContextValue extends BillingState {
  /** Check if the current user can access a feature */
  can(feature: FeatureKey): boolean;
  /** Redirect to checkout for a plan upgrade */
  upgrade(planId: "pro" | "enterprise", interval?: "monthly" | "yearly"): Promise<void>;
  /** Cancel subscription */
  cancel(): Promise<void>;
  /** Refresh state (call after webhook-triggered UI change) */
  refresh(): Promise<void>;
}

const defaultState: BillingState = {
  loading: true,
  planId: "free",
  effectivePlan: "free",
  status: "inactive",
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  features: ["ai_tutor", "flashcards_basic", "research", "pdf_upload"],
};

const BillingContext = createContext<BillingContextValue>({
  ...defaultState,
  can: () => false,
  upgrade: async () => {},
  cancel: async () => {},
  refresh: async () => {},
});

export function BillingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<BillingState>(defaultState);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/billing/status");
      if (!res.ok) return;
      const data = await res.json() as BillingState;
      setState({ ...data, loading: false });
    } catch {
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const can = useCallback(
    (feature: FeatureKey): boolean => state.features.includes(feature),
    [state.features]
  );

  const upgrade = useCallback(
    async (
      planId: "pro" | "enterprise",
      interval: "monthly" | "yearly" = "monthly"
    ) => {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, interval }),
      });
      const data = await res.json() as { url?: string; error?: string };
      if (data.url) window.location.href = data.url;
      else throw new Error(data.error ?? "Checkout failed");
    },
    []
  );

  const cancel = useCallback(async () => {
    const res = await fetch("/api/billing/cancel", { method: "POST" });
    if (!res.ok) {
      const data = await res.json() as { error?: string };
      throw new Error(data.error ?? "Cancel failed");
    }
    // Refresh after a short delay to let webhook process
    await new Promise((r) => setTimeout(r, 1500));
    await refresh();
  }, [refresh]);

  return (
    <BillingContext.Provider value={{ ...state, can, upgrade, cancel, refresh }}>
      {children}
    </BillingContext.Provider>
  );
}

export function useBilling() {
  return useContext(BillingContext);
}

// ── Convenience gate component ────────────────────────────────
// Usage: <FeatureGate feature="papers" fallback={<UpgradePrompt />}>
//          <PapersUI />
//        </FeatureGate>
export function FeatureGate({
  feature,
  children,
  fallback = null,
}: {
  feature: FeatureKey;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { can, loading } = useBilling();
  if (loading) return null;
  return can(feature) ? <>{children}</> : <>{fallback}</>;
}
