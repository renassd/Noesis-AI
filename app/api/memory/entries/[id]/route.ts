import { NextRequest, NextResponse } from "next/server";
import { AuthError, requireAuthenticatedUser } from "@/lib/server-auth";
import { getSupabaseAdmin } from "@/lib/supabase";

// PATCH /api/memory/entries/[id] — edit content, tags, toggle mute, etc.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { user } = await requireAuthenticatedUser(req);
    const { id } = await params;
    const db = getSupabaseAdmin();

    const body = (await req.json()) as Record<string, unknown>;

    // Only allow safe, user-facing fields — never user_id, embedding, is_active via PATCH
    const allowed = ["summary", "content", "topic", "tags", "importance", "memory_enabled"] as const;
    const patch: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) patch[key] = body[key];
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
    }

    const { error } = await db
      .from("memory_entries")
      .update(patch)
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) return NextResponse.json({ error: "Update failed." }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}

// DELETE /api/memory/entries/[id] — soft-delete
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { user } = await requireAuthenticatedUser(req);
    const { id } = await params;
    const db = getSupabaseAdmin();

    const { error } = await db
      .from("memory_entries")
      .update({ is_active: false })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) return NextResponse.json({ error: "Delete failed." }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}
