import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId requerido" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("decks")
    .select("*, flashcards(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  try {
    const { userId, name, cards } = await req.json();
    if (!userId || !name || !cards?.length)
      return NextResponse.json({ error: "userId, name y cards requeridos" }, { status: 400 });

    const { data: deck, error: deckErr } = await supabaseAdmin
      .from("decks").insert({ user_id: userId, name }).select().single();

    if (deckErr || !deck) return NextResponse.json({ error: deckErr?.message }, { status: 500 });

    const { error: cardsErr } = await supabaseAdmin.from("flashcards").insert(
      cards.map((c: { question: string; answer: string }) => ({
        deck_id: deck.id, question: c.question, answer: c.answer,
      }))
    );

    if (cardsErr) {
      await supabaseAdmin.from("decks").delete().eq("id", deck.id);
      return NextResponse.json({ error: cardsErr.message }, { status: 500 });
    }

    const { data: full } = await supabaseAdmin
      .from("decks").select("*, flashcards(*)").eq("id", deck.id).single();

    return NextResponse.json(full, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}