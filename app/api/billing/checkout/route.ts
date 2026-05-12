// POST /api/billing/checkout
// Creates a hosted checkout session and returns the URL.
// Requires authentication.

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createCheckoutSession } from "@/lib/billing";
import type { BillingInterval, PlanId } from "@/lib/billing";

export async function POST(req: NextRequest) {
  // Authenticate user
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

  // Parse and validate body
  const body = await req.json() as { planId?: PlanId; interval?: BillingInterval };
  const { planId, interval = "monthly" } = body;

  if (!planId || !["pro", "enterprise"].includes(planId)) {
    return NextResponse.json({ error: "Invalid planId" }, { status: 400 });
  }

  try {
    const origin = req.headers.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL!;
    const session = await createCheckoutSession({
      userId: user.id,
      email: user.email!,
      planId,
      interval,
      successUrl: `${origin}/billing/success?plan=${planId}`,
      cancelUrl:  `${origin}/billing/canceled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[billing/checkout]", err);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
