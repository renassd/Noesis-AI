// POST /api/billing/cancel
// Cancels the user's subscription at end of current period.

import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser, AuthError } from "@/lib/server-auth";
import { cancelSubscription } from "@/lib/billing";

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireAuthenticatedUser(req);
    await cancelSubscription(user.id);
    return NextResponse.json({
      success: true,
      message: "Subscription will cancel at end of current period.",
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.includes("No active subscription")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    console.error("[billing/cancel]", err);
    return NextResponse.json({ error: "Failed to cancel" }, { status: 500 });
  }
}
