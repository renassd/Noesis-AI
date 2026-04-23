import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

// ── Email validation — RFC 5322 simplified ────────────────────────────────────
// Catches:  "@", "a@", "@b.c", "a@b", spaces, consecutive dots, etc.
// Allows:   standard addresses like user@domain.com, user+tag@sub.domain.co.uk
const EMAIL_RE =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

export function isValidEmail(email: string): boolean {
  const trimmed = email.trim();
  if (!trimmed || trimmed.length > 254) return false;
  return EMAIL_RE.test(trimmed);
}

// ── Send via Resend ───────────────────────────────────────────────────────────
// Resend free tier: 100 emails/day, no credit card needed.
// Sign up at resend.com → create API key → add RESEND_API_KEY to .env.local
// Also add NOTIFICATION_TO_EMAIL (defaults to neuvraai@gmail.com)
async function sendViaResend(email: string): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.NOTIFICATION_TO_EMAIL ?? "neuvraai@gmail.com";
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";

  if (!apiKey) {
    // No API key configured — log locally, don't break the UX
    console.warn("[waitlist] RESEND_API_KEY not set. Email not sent.", { email });
    return { ok: true }; // Still show success to user (graceful degradation)
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [toEmail],
      subject: `[Neuvra Early Access] New signup: ${email}`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
          <h2 style="margin: 0 0 8px; font-size: 20px; color: #0d1b36;">New early access request</h2>
          <p style="margin: 0 0 24px; color: #5a6880; font-size: 14px;">
            Someone just signed up for the Neuvra waitlist.
          </p>
          <div style="background: #f4f7fc; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px;">
            <p style="margin: 0; font-size: 13px; color: #5a6880; text-transform: uppercase; letter-spacing: .08em; font-weight: 600;">Email</p>
            <p style="margin: 4px 0 0; font-size: 16px; font-weight: 700; color: #0d1b36;">${email}</p>
          </div>
          <p style="margin: 0; font-size: 12px; color: #8a9ab0;">
            Sent by Neuvra AI · ${new Date().toUTCString()}
          </p>
        </div>
      `,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("[waitlist] Resend error", res.status, body);
    return { ok: false, error: `Resend ${res.status}` };
  }

  return { ok: true };
}

// ── Also send a confirmation to the user ─────────────────────────────────────
async function sendConfirmation(email: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";

  if (!apiKey) return;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [email],
      subject: "You're on the Neuvra waitlist",
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
          <h2 style="margin: 0 0 8px; font-size: 22px; color: #0d1b36;">You're in.</h2>
          <p style="margin: 0 0 20px; color: #5a6880; font-size: 15px; line-height: 1.7;">
            Thanks for joining the Neuvra early access list. We'll reach out as soon as a spot opens.
          </p>
          <p style="margin: 0 0 4px; font-size: 14px; color: #0d1b36; font-weight: 600;">What is Neuvra?</p>
          <p style="margin: 0; color: #5a6880; font-size: 14px; line-height: 1.7;">
            An AI research and study platform that connects understanding and memory in one place —
            literature reviews, paper summaries, flashcards and tutor mode, all in a single flow.
          </p>
          <hr style="margin: 28px 0; border: none; border-top: 1px solid #d6e0f0;" />
          <p style="margin: 0; font-size: 12px; color: #8a9ab0;">
            Neuvra AI · You're receiving this because you signed up at neuvra.ai
          </p>
        </div>
      `,
    }),
  }).catch(() => {
    // Confirmation is best-effort — don't fail the request if it errors
  });
}

// ── Route handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const ip = (req.headers.get("x-forwarded-for") ?? "unknown").split(",")[0]?.trim() || "unknown";
    const rateLimit = checkRateLimit(getRateLimitKey(["waitlist", ip]), 10, 60 * 60 * 1000);

    if (!rateLimit.ok) {
      return NextResponse.json(
        { error: "Too many signup attempts. Please try again later." },
        { status: 429 },
      );
    }

    const body = (await req.json()) as { email?: string };
    const email = (body.email ?? "").trim().toLowerCase();

    // Server-side validation (mirrors client)
    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "Invalid email address." },
        { status: 400 },
      );
    }

    // Rate-limit hint — basic IP check (no external dep needed)
    console.info("[waitlist] signup", { email: email.replace(/(.{2}).+(@.+)/, "$1***$2"), ip });

    // Send notification + confirmation concurrently
    const [notification] = await Promise.all([
      sendViaResend(email),
      sendConfirmation(email),
    ]);

    if (!notification.ok) {
      // Log the error but still return success to the user
      // (we don't want a transient email failure to block signups)
      console.error("[waitlist] notification failed", notification.error);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[waitlist] unexpected error", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
