import { NextRequest, NextResponse } from "next/server";
import { AuthError, requireAuthenticatedUser } from "@/lib/server-auth";
import { searchMemories, getMemorySettings } from "@/lib/memory";

// GET /api/memory/search?q=<query>&limit=5
export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuthenticatedUser(req);

    const query = req.nextUrl.searchParams.get("q")?.trim() ?? "";
    if (!query) return NextResponse.json({ memories: [] });

    const settings = await getMemorySettings(user.id);
    if (!settings.memory_enabled) {
      return NextResponse.json({ memories: [], disabled: true });
    }

    const limit = Math.min(
      parseInt(req.nextUrl.searchParams.get("limit") ?? String(settings.max_context_entries), 10),
      10,
    );

    const memories = await searchMemories(user.id, query, limit);
    return NextResponse.json({ memories });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}
