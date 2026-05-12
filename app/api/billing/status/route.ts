// GET /api/billing/status
// Returns current subscription state for the authenticated user.
// Frontend calls this to decide which features to show/gate.

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSubscriptionStatus, getAccessibleFeatures } from "@/lib/billing";

export async function GET(_req: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const status = await getSubscriptionStatus(user.id);
    const features = getAccessibleFeatures(status.effectivePlan);

    return NextResponse.json({
      planId:           status.planId,
      effectivePlan:    status.effectivePlan,
      status:           status.status,
      currentPeriodEnd: status.currentPeriodEnd?.toISOString() ?? null,
      cancelAtPeriodEnd: status.cancelAtPeriodEnd,
      features,          // array of FeatureKey strings
    });
  } catch (err) {
    console.error("[billing/status]", err);
    return NextResponse.json({ error: "Failed to load status" }, { status: 500 });
  }
}
