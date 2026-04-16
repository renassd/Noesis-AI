import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../lib/supabase";

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin.from("decks").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error en DELETE /api/decks/[id]:", error);
    return NextResponse.json({ error: "Deck API unavailable" }, { status: 503 });
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = (await req.json()) as {
      name?: string;
      cardVisuals?: Record<string, unknown>;
    };

    const supabaseAdmin = getSupabaseAdmin();

    if (body.name !== undefined) {
      if (!body.name.trim()) {
        return NextResponse.json({ error: "name requerido" }, { status: 400 });
      }

      const { data, error } = await supabaseAdmin
        .from("decks")
        .update({ name: body.name.trim(), updated_at: new Date().toISOString() })
        .eq("id", id)
        .select("id, name, created_at")
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        id: data.id,
        name: data.name,
        createdAt: data.created_at,
      });
    }

    if (body.cardVisuals !== undefined) {
      const updates = Object.entries(body.cardVisuals);

      if (updates.length === 0) {
        return NextResponse.json({ success: true });
      }

      const results = await Promise.all(
        updates.map(async ([flashcardId, visual]) => {
          const { error } = await supabaseAdmin
            .from("flashcards")
            .update({ visual: visual ?? null })
            .eq("id", flashcardId)
            .eq("deck_id", id);

          return { flashcardId, error };
        }),
      );

      const failed = results.filter((result) => result.error);
      if (failed.length > 0) {
        return NextResponse.json(
          { error: `${failed.length} actualizaciones fallaron` },
          { status: 500 },
        );
      }

      return NextResponse.json({ success: true, updated: updates.length });
    }

    return NextResponse.json({ error: "Body invalido" }, { status: 400 });
  } catch (error) {
    console.error("Error en PATCH /api/decks/[id]:", error);
    return NextResponse.json({ error: "Deck API unavailable" }, { status: 503 });
  }
}
