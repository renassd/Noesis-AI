// GET /api/billing/portal
// Returns hosted portal URLs so the user can switch plan/interval,
// cancel, resume, or update their payment method.

import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser, AuthError } from "@/lib/server-auth";
import { getBillingPortalUrls } from "@/lib/billing";

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuthenticatedUser(req);
    const urls = await getBillingPortalUrls(user.id);
    return NextResponse.json(urls);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.includes("No active subscription") || message.includes("not available")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    console.error("[billing/portal]", err);
    return NextResponse.json({ error: "Failed to load billing portal" }, { status: 500 });
  }
}
