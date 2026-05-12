// ============================================================
// POST /api/webhooks/paddle
//
// Paddle sends ALL subscription events here.
// This is the ONLY entry point for subscription state changes.
// Frontend NEVER writes subscription state — webhooks do.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { processWebhook } from "@/lib/billing";

// Disable body parsing — we need raw body for HMAC verification
export const config = { api: { bodyParser: false } };

export async function POST(req: NextRequest) {
  // 1. Read raw body (required for signature verification)
  const rawBody = await req.text();

  // 2. Get signature header
  const signature = req.headers.get("paddle-signature");
  if (!signature) {
    console.warn("[webhook/paddle] Missing paddle-signature header");
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  try {
    // 3. Process: verify → normalize → write DB (idempotent)
    const { alreadyProcessed, eventType } = await processWebhook(
      rawBody,
      signature
    );

    if (alreadyProcessed) {
      // Paddle retries webhooks — idempotency guard hit, safe to 200
      console.log(`[webhook/paddle] Already processed: ${eventType}`);
      return NextResponse.json({ received: true, status: "duplicate" });
    }

    console.log(`[webhook/paddle] Processed: ${eventType}`);
    return NextResponse.json({ received: true, status: "processed" });

  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";

    // Invalid signature → 400 (don't leak details)
    if (message.includes("Invalid Paddle webhook signature")) {
      console.error("[webhook/paddle] Invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // Unhandled event type (e.g. product.updated we don't care about) → 200
    // Paddle will stop retrying on 200. We just log and move on.
    if (message.includes("Unhandled Paddle event type")) {
      console.log(`[webhook/paddle] Ignored: ${message}`);
      return NextResponse.json({ received: true, status: "ignored" });
    }

    // Everything else → 500 so Paddle retries
    console.error("[webhook/paddle] Processing error:", err);
    return NextResponse.json(
      { error: "Processing failed" },
      { status: 500 }
    );
  }
}
