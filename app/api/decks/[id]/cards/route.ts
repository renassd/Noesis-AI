import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { AuthError, requireAuthenticatedUser } from "@/lib/server-auth";

// POST /api/decks/[id]/cards — append cards to an existing deck
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { user } = await requireAuthenticatedUser(req);
    const { id } = await context.params;
    const db = getSupabaseAdmin();

    // Verify ownership
    const { data: deck, error: deckErr } = await db
      .from("decks")
      .select("id, user_id")
      .eq("id", id)
      .single();

    if (deckErr || !deck) {
      return NextResponse.json({ error: "Deck not found." }, { status: 404 });
    }
    if (deck.user_id !== user.id) {
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }

    const body = (await req.json()) as {
      cards?: Array<{ question?: string; answer?: string }>;
    };

    const valid = (body.cards ?? []).filter(
      (c) => c.question?.trim() && c.answer?.trim(),
    );

    if (valid.length === 0) {
      return NextResponse.json({ error: "No valid cards provided." }, { status: 400 });
    }

    if (valid.length > 50) {
      return NextResponse.json({ error: "Max 50 cards per request." }, { status: 400 });
    }

    const { data: inserted, error: insertErr } = await db
      .from("flashcards")
      .insert(
        valid.map((c) => ({
          deck_id: id,
          question: c.question!.trim(),
          answer: c.answer!.trim(),
        })),
      )
      .select("id, question, answer");

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    return NextResponse.json(
      {
        cards: (inserted ?? []).map((c) => ({
          id: c.id,
          question: c.question,
          answer: c.answer,
        })),
      },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}
