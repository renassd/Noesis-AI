import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://neuvraai.com";

export async function POST(req: NextRequest) {
  try {
    const { email, name } = (await req.json()) as { email?: string; name?: string };
    if (!email) return NextResponse.json({ error: "Missing email" }, { status: 400 });

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error("[welcome-email] RESEND_API_KEY not set");
      return NextResponse.json({ error: "RESEND_API_KEY not set" }, { status: 500 });
    }

    console.log("[welcome-email] sending to:", email);

    const displayName = name || email.split("@")[0];
    const studyUrl = `${APP_URL}/estudio`;

    const features = [
      { icon: "🃏", title: "Flashcards con IA",   desc: "Generá mazos de estudio desde cualquier documento, apunte o tema en segundos." },
      { icon: "🎓", title: "Tutor IA",             desc: "Explicaciones paso a paso adaptadas a tu nivel, con analogías y ejemplos." },
      { icon: "📝", title: "Modo Examen",          desc: "La IA genera y corrige exámenes completos desde tus propios apuntes." },
      { icon: "🔬", title: "Investigación",        desc: "Revisiones de literatura con citas inline y búsqueda de papers reales." },
    ];

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Bienvenido a Neuvra</title>
</head>
<body style="margin:0;padding:0;background:#f0f4ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4ff;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

          <!-- Header -->
          <tr>
            <td style="padding-bottom:24px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#3b6de0;border-radius:10px;padding:8px 14px;">
                    <span style="color:#ffffff;font-size:15px;font-weight:700;letter-spacing:0.02em;">Neuvra AI</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main card -->
          <tr>
            <td style="background:#ffffff;border-radius:20px;padding:40px 36px;box-shadow:0 4px 24px rgba(32,61,122,0.10);">

              <!-- Greeting -->
              <h1 style="font-size:26px;font-weight:800;color:#10203a;margin:0 0 8px;line-height:1.2;">
                ¡Bienvenido/a, ${displayName}! 🎉
              </h1>
              <p style="font-size:15px;color:#66768f;line-height:1.6;margin:0 0 32px;">
                Tu cuenta está lista. Neuvra convierte cualquier material de estudio en flashcards, exámenes y explicaciones con IA — todo en un solo lugar.
              </p>

              <!-- Features -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                ${features.map(f => `
                <tr>
                  <td style="padding-bottom:12px;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f9fc;border-radius:12px;border:1px solid #e8eef8;">
                      <tr>
                        <td style="padding:14px 16px;">
                          <table cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="font-size:22px;vertical-align:top;padding-right:12px;width:32px;">${f.icon}</td>
                              <td>
                                <p style="font-size:14px;font-weight:700;color:#10203a;margin:0 0 3px;">${f.title}</p>
                                <p style="font-size:13px;color:#66768f;margin:0;line-height:1.5;">${f.desc}</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>`).join("")}
              </table>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#3b6de0;border-radius:12px;">
                    <a href="${studyUrl}" style="display:inline-block;color:#ffffff;text-decoration:none;padding:15px 32px;font-size:15px;font-weight:700;">
                      Empezar a estudiar →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:32px 0 0;">
                <tr>
                  <td style="border-top:1px solid #e8eef8;padding-top:24px;">
                    <p style="font-size:12px;color:#aab4c8;margin:0;line-height:1.6;">
                      Recibiste este email porque creaste una cuenta en Neuvra.<br/>
                      <a href="${APP_URL}" style="color:#3b6de0;text-decoration:none;">neuvraai.com</a>
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Neuvra AI <noreply@neuvraai.com>",
        to: [email],
        subject: `¡Bienvenido/a a Neuvra, ${displayName}! 🎉`,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[welcome-email] Resend error:", err);
      return NextResponse.json({ error: "Could not send email" }, { status: 502 });
    }

    console.log("[welcome-email] sent successfully to:", email);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[welcome-email] error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
