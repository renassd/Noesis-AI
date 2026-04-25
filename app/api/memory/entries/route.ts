import { NextRequest, NextResponse } from "next/server";
import { AuthError, requireAuthenticatedUser } from "@/lib/server-auth";
import { storeMemory, type MemoryEntry, type MemoryType, type MemorySourceType } from "@/lib/memory";
import { getSupabaseAdmin } from "@/lib/supabase";

// GET /api/memory/entries — list the user's memories with optional filters
export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuthenticatedUser(req);
    const db = getSupabaseAdmin();
    const sp = req.nextUrl.searchParams;

    const topic = sp.get("topic");
    const type = sp.get("type");
    const limit = Math.min(parseInt(sp.get("limit") ?? "60", 10), 200);
    const offset = parseInt(sp.get("offset") ?? "0", 10);

    let query = db
      .from("memory_entries")
      .select(
        "id, summary, content, type, topic, tags, importance, source_type, source_label, memory_enabled, created_at, updated_at",
      )
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (topic) query = query.eq("topic", topic);
    if (type) query = query.eq("type", type);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: "Failed to fetch memories." }, { status: 500 });

    return NextResponse.json({ entries: data });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}

// POST /api/memory/entries — manually create a memory
export async function POST(req: NextRequest) {
  try {
    const { user } = await requireAuthenticatedUser(req);
    const body = (await req.json()) as Partial<MemoryEntry>;

    const { content, summary, type, topic, tags, source_type, source_label, importance } = body;

    if (!content?.trim() || !summary?.trim()) {
      return NextResponse.json({ error: "content and summary are required." }, { status: 400 });
    }

    const entry: MemoryEntry = {
      user_id: user.id,
      content: content.trim(),
      summary: summary.trim(),
      type: (type as MemoryType) ?? "note",
      topic: topic?.trim(),
      tags: tags ?? [],
      source_type: (source_type as MemorySourceType) ?? "manual",
      source_label: source_label?.trim(),
      importance: importance ?? 0.5,
    };

    const id = await storeMemory(entry);
    if (!id) return NextResponse.json({ error: "Failed to save memory." }, { status: 500 });

    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}
