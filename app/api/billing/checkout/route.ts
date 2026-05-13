// POST /api/billing/checkout
// Creates a hosted Paddle checkout session and returns the redirect URL.

import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser, AuthError } from "@/lib/server-auth";
import { createCheckoutSession } from "@/lib/billing";
import type { BillingInterval, PlanId } from "@/lib/billing";

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireAuthenticatedUser(req);

    const body = await req.json() as { planId?: PlanId; interval?: BillingInterval };
    const { planId, interval = "monthly" } = body;

    if (!planId || planId !== "pro") {
      return NextResponse.json({ error: "Invalid planId" }, { status: 400 });
    }

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
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[billing/checkout]", err);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
