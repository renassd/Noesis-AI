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
    const { name } = (await req.json()) as { name?: string };

    if (!name?.trim()) {
      return NextResponse.json({ error: "name requerido" }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from("decks")
      .update({ name: name.trim(), updated_at: new Date().toISOString() })
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
  } catch (error) {
    console.error("Error en PATCH /api/decks/[id]:", error);
    return NextResponse.json({ error: "Deck API unavailable" }, { status: 503 });
  }
}
