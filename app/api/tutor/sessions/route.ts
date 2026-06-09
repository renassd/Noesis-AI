import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../lib/supabase";
import { AuthError, requireAuthenticatedUser } from "../../../../lib/server-auth";

export const dynamic = "force-dynamic";

// GET /api/tutor/sessions — list sessions for the current user
export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuthenticatedUser(req);
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("tutor_sessions")
      .select("id, topic, messages, saved_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("[tutor/sessions] GET error:", error);
      return NextResponse.json({ error: "Could not load sessions." }, { status: 500 });
    }

    return NextResponse.json({ sessions: (data ?? []).map((s) => ({ ...s, savedAt: s.saved_at })) });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST /api/tutor/sessions — upsert a session
export async function POST(req: NextRequest) {
  try {
    const { user } = await requireAuthenticatedUser(req);
    const body = (await req.json()) as { id: string; topic: string; messages: unknown[]; savedAt: number };

    const supabase = getSupabaseAdmin();

    const { error } = await supabase
      .from("tutor_sessions")
      .upsert(
        {
          id: body.id,
          user_id: user.id,
          topic: (body.topic ?? "").slice(0, 200),
          messages: body.messages ?? [],
          saved_at: body.savedAt ?? Date.now(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      );

    if (error) {
      console.error("[tutor/sessions] POST error:", error);
      return NextResponse.json({ error: "Could not save session." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
