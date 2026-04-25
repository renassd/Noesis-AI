import { NextRequest, NextResponse } from "next/server";
import { AuthError, requireAuthenticatedUser } from "@/lib/server-auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { type MemorySettings } from "@/lib/memory";

// GET /api/memory/settings
export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuthenticatedUser(req);
    const db = getSupabaseAdmin();

    const { data } = await db
      .from("memory_settings")
      .select("memory_enabled, auto_extract, max_context_entries")
      .eq("user_id", user.id)
      .single();

    const settings: MemorySettings = data ?? {
      memory_enabled: true,
      auto_extract: true,
      max_context_entries: 5,
    };

    return NextResponse.json({ settings });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}

// PATCH /api/memory/settings
export async function PATCH(req: NextRequest) {
  try {
    const { user } = await requireAuthenticatedUser(req);
    const db = getSupabaseAdmin();

    const body = (await req.json()) as Partial<MemorySettings>;

    const allowed: (keyof MemorySettings)[] = [
      "memory_enabled",
      "auto_extract",
      "max_context_entries",
    ];
    const patch: Partial<MemorySettings & { user_id: string }> = { user_id: user.id };
    for (const key of allowed) {
      if (key in body) (patch as Record<string, unknown>)[key] = body[key];
    }

    const { error } = await db.from("memory_settings").upsert(patch);
    if (error) return NextResponse.json({ error: "Failed to update settings." }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}
