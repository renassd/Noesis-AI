import { NextRequest, NextResponse } from "next/server";
import { AuthError, requireAuthenticatedUser } from "@/lib/server-auth";
import { extractAndStoreMemories, getMemorySettings, type MemorySourceType } from "@/lib/memory";

// POST /api/memory/extract
// Fires async memory extraction from study content.
// Callers should fire-and-forget — this responds immediately, extraction runs in the background.
export async function POST(req: NextRequest) {
  try {
    const { user } = await requireAuthenticatedUser(req);

    const settings = await getMemorySettings(user.id);
    if (!settings.memory_enabled || !settings.auto_extract) {
      return NextResponse.json({ skipped: true });
    }

    const body = (await req.json()) as {
      content?: string;
      source_type?: string;
      source_label?: string;
    };

    const { content, source_type, source_label } = body;

    if (!content || content.trim().length < 120) {
      return NextResponse.json({ error: "Content too short to extract memories." }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "AI not configured." }, { status: 500 });

    // Intentionally not awaited — respond immediately so the UI isn't blocked
    void extractAndStoreMemories(
      user.id,
      content.trim(),
      (source_type as MemorySourceType) ?? "manual",
      source_label?.trim() ?? "Unknown source",
      apiKey,
    );

    return NextResponse.json({ status: "extracting" });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}
