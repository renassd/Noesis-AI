import { NextRequest, NextResponse } from "next/server";
import { getAiUsageSnapshot } from "@/lib/ai-usage";
import { AuthError, requireAuthenticatedUser } from "@/lib/server-auth";

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuthenticatedUser(req);
    const usage = await getAiUsageSnapshot(user.id);
    return NextResponse.json({ usage });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Error en GET /api/ai/usage:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo cargar el uso de IA." },
      { status: 500 },
    );
  }
}
