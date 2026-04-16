import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId requerido" }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    const { data: decks, error } = await supabaseAdmin
      .from("decks")
      .select("id, name, created_at, flashcards(id, question, answer, visual)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching decks:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const normalizedDecks =
      decks?.map(
        (deck: {
          id: string;
          name: string;
          created_at: string;
          flashcards: Array<{ id: string; question: string; answer: string; visual?: unknown }> | null;
        }) => ({
          id: deck.id,
          name: deck.name,
          createdAt: deck.created_at,
          cards: (deck.flashcards ?? []).map((card) => ({
            id: card.id,
            question: card.question,
            answer: card.answer,
            visual:
              typeof card.visual === "string"
                ? (() => {
                    try {
                      return JSON.parse(card.visual);
                    } catch {
                      return undefined;
                    }
                  })()
                : (card.visual ?? undefined),
          })),
        }),
      ) ?? [];

    return NextResponse.json(normalizedDecks);
  } catch (error) {
    console.error("Error en GET /api/decks:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Deck API unavailable" },
      { status: 503 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { userId, name, cards } = (await req.json()) as {
      userId?: string;
      name?: string;
      cards?: Array<{ question?: string; answer?: string; visual?: unknown }>;
    };

    if (!userId || !name || !cards?.length) {
      return NextResponse.json(
        { error: "userId, name y cards son requeridos" },
        { status: 400 },
      );
    }

    const validCards = cards.filter(
      (card) => card.question?.trim() && card.answer?.trim(),
    );

    if (!validCards.length) {
      return NextResponse.json(
        { error: "Las tarjetas deben incluir pregunta y respuesta." },
        { status: 400 },
      );
    }

    const { data: deck, error: deckError } = await supabaseAdmin
      .from("decks")
      .insert({ user_id: userId, name: name.trim() })
      .select("id, name, created_at")
      .single();

    if (deckError || !deck) {
      return NextResponse.json(
        { error: deckError?.message ?? "No se pudo crear el mazo." },
        { status: 500 },
      );
    }

    const flashcards = validCards.map((card) => ({
      deck_id: deck.id,
      question: card.question!.trim(),
      answer: card.answer!.trim(),
      visual: card.visual ?? null,
    }));

    const { data: insertedCards, error: cardsError } = await supabaseAdmin
      .from("flashcards")
      .insert(flashcards)
      .select("id, question, answer, visual");

    if (cardsError) {
      await supabaseAdmin.from("decks").delete().eq("id", deck.id);

      return NextResponse.json({ error: cardsError.message }, { status: 500 });
    }

    return NextResponse.json(
      {
        id: deck.id,
        name: deck.name,
        createdAt: deck.created_at,
        cards:
          insertedCards?.map((card) => ({
            id: card.id,
            question: card.question,
            answer: card.answer,
            visual: card.visual ?? undefined,
          })) ?? [],
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error en POST /api/decks:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
