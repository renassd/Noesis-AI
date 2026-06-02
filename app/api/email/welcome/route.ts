import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser, AuthError } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await requireAuthenticatedUser(req);

    const { email, name } = (await req.json()) as { email?: string; name?: string };
    if (!email) return NextResponse.json({ error: "Missing email" }, { status: 400 });

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "RESEND_API_KEY not set" }, { status: 500 });

    const displayName = name || email.split("@")[0];

    const html = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px; background: #ffffff;">

  <div style="margin-bottom: 32px;">
    <span style="font-size: 20px; font-weight: 700; color: #10203a;">Neuvra</span>
  </div>

  <h1 style="font-size: 24px; font-weight: 700; color: #10203a; margin: 0 0 12px;">
    ¡Bienvenido/a, ${displayName}! 👋
  </h1>

  <p style="font-size: 15px; color: #66768f; line-height: 1.6; margin: 0 0 20px;">
    Tu cuenta en Neuvra está lista. Esto es lo que podés hacer:
  </p>

  <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 32px;">
    ${[
      ["🃏", "Flashcards con IA", "Generá tarjetas de estudio desde cualquier documento o tema"],
      ["🎓", "Tutor IA", "Preguntale cualquier cosa y te explica paso a paso"],
      ["📝", "Modo Examen", "Pegá tus apuntes y la IA te genera un examen completo"],
      ["🔬", "Investigación", "Buscá papers académicos con citas inline automáticas"],
    ].map(([icon, title, desc]) => `
      <div style="display: flex; gap: 12px; padding: 12px 14px; border: 1px solid #dbe4f1; border-radius: 10px;">
        <span style="font-size: 20px; flex-shrink: 0;">${icon}</span>
        <div>
          <p style="font-size: 14px; font-weight: 600; color: #10203a; margin: 0 0 2px;">${title}</p>
          <p style="font-size: 13px; color: #66768f; margin: 0;">${desc}</p>
        </div>
      </div>
    `).join("")}
  </div>

  <a href="https://neuvraai.com/estudio" style="display: inline-block; background: #3b6de0; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-size: 15px; font-weight: 600;">
    Empezar a estudiar →
  </a>

  <hr style="border: none; border-top: 1px solid #dbe4f1; margin: 32px 0;" />

  <p style="font-size: 12px; color: #99aabb; margin: 0;">
    Neuvra AI · <a href="https://neuvraai.com" style="color: #99aabb;">neuvraai.com</a>
  </p>

</div>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Neuvra AI <noreply@neuvraai.com>",
        to: [email],
        subject: `¡Bienvenido/a a Neuvra, ${displayName}!`,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[welcome-email] Resend error:", err);
      return NextResponse.json({ error: "Could not send email" }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[welcome-email] error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
