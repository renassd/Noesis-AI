// ============================================================
// POST /api/webhooks/lemonsqueezy
// LemonSqueezy sends all subscription events here.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { processWebhook } from "@/lib/billing";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  const signature = req.headers.get("x-signature");
  if (!signature) {
    console.warn("[webhook/lemonsqueezy] Missing x-signature header");
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  try {
    const { alreadyProcessed, eventType } = await processWebhook(rawBody, signature);

    if (alreadyProcessed) {
      console.log(`[webhook/lemonsqueezy] Already processed: ${eventType}`);
      return NextResponse.json({ received: true, status: "duplicate" });
    }

    console.log(`[webhook/lemonsqueezy] Processed: ${eventType}`);
    return NextResponse.json({ received: true, status: "processed" });

  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";

    if (message.includes("Invalid LemonSqueezy webhook signature")) {
      console.error("[webhook/lemonsqueezy] Invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    if (message.includes("Unhandled LemonSqueezy event type")) {
      console.log(`[webhook/lemonsqueezy] Ignored: ${message}`);
      return NextResponse.json({ received: true, status: "ignored" });
    }

    console.error("[webhook/lemonsqueezy] Processing error:", err);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
