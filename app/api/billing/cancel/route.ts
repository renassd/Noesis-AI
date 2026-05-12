// POST /api/billing/cancel
// Cancels the user's subscription at end of current period.
// State update arrives via webhook — no immediate DB write here.

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cancelSubscription } from "@/lib/billing";

export async function POST(_req: NextRequest) {
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
    await cancelSubscription(user.id);
    return NextResponse.json({
      success: true,
      message: "Subscription will cancel at end of current period.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.includes("No active subscription")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    console.error("[billing/cancel]", err);
    return NextResponse.json({ error: "Failed to cancel" }, { status: 500 });
  }
}
