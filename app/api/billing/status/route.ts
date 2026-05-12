// GET /api/billing/status
// Returns current plan + accessible features for the authenticated user.

import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser, AuthError } from "@/lib/server-auth";
import { getSubscriptionStatus, getAccessibleFeatures } from "@/lib/billing";

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuthenticatedUser(req);
    const status = await getSubscriptionStatus(user.id);
    const features = getAccessibleFeatures(status.effectivePlan);

    return NextResponse.json({
      planId:            status.planId,
      effectivePlan:     status.effectivePlan,
      status:            status.status,
      currentPeriodEnd:  status.currentPeriodEnd?.toISOString() ?? null,
      cancelAtPeriodEnd: status.cancelAtPeriodEnd,
      features,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[billing/status]", err);
    return NextResponse.json({ error: "Failed to load status" }, { status: 500 });
  }
}
