"use client";

import { useState } from "react";
import { fetchWithSupabaseAuth } from "@/lib/supabase-browser";
import { useAuth } from "@/context/AuthContext";
import { useAiUsage } from "@/context/AiUsageContext";
import CardEditor from "./CardEditor";
import FlashCard from "./FlashCard";
import { useLang } from "./i18n";
import { detectLang, langInstruction } from "./lib/detectLang";
import type { CardVisual } from "./theme/types";
import type { Flashcard } from "./types";

interface Props {
  onSaveDeck: (name: string, cards: Flashcard[]) => Promise<boolean>;
}

type GeneratedCard = Flashcard;

interface RawCard {
  question: string;
  answer: string;
}

function extractJsonArray(raw: string): unknown[] | null {
  const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();

  function parseCandidate(candidate: string): unknown[] | null {
    try {
      const parsed = JSON.parse(candidate);
      if (Array.isArray(parsed)) return parsed;
      if (typeof parsed === "string") {
        const nested = JSON.parse(parsed);
        if (Array.isArray(nested)) return nested;
      }
    } catch {
      return null;
    }
    return null;
  }

  const direct = parseCandidate(cleaned);
  if (direct) return direct;

  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) return null;

  return parseCandidate(cleaned.slice(start, end + 1));
}

function buildPrompt(quantity: number, text: string, langHint: string): string {
  return `You are a study assistant. Generate exactly ${quantity} flashcards from the text below.

${langHint}

STRICT INSTRUCTIONS:
- Respond ONLY with a JSON array. No introduction, no explanation, no text before or after.
- Do not use markdown code blocks.
- The array must have exactly ${quantity} objects.
- Each object must have exactly these fields: "question" and "answer".
- Questions should test comprehension, not literal memory.
- Answers should be concise (1-3 sentences).
- For math or science formulas, use valid LaTeX: $...$ for inline, $$...$$ for block.

EXACT FORMAT:
[{"question":"...","answer":"..."}]

TEXT:
${text.slice(0, 4000)}`;
}

export default function FlashcardGenerator({ onSaveDeck }: Props) {
  const { t } = useLang();
  const s = t.study;
  const { auth } = useAuth();
  const { usage, loading: usageLoading, applyUsage } = useAiUsage();
  const [text, setText] = useState("");
  const [quantity, setQuantity] = useState(8);
  const [loading, setLoading] = useState(false);
  const [cards, setCards] = useState<GeneratedCard[]>([]);
  const [deckName, setDeckName] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});
  const [editingCard, setEditingCard] = useState<Flashcard | null>(null);
  const usageReady = auth.signedIn && !usageLoading && !!usage;
  const hasCredits = usageReady && usage.creditsRemaining > 0;
  const canGenerate = hasCredits && !loading && text.trim().length >= 30;

  async function generate() {
    if (!hasCredits) {
      setError(s.tutorOutOfCredits);
      return;
    }
    if (text.trim().length < 30) {
      setError(s.generatorMinError);
      return;
    }

    setError("");
    setLoading(true);
    setCards([]);
    setSaved(false);

    try {
      const res = await fetchWithSupabaseAuth("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          max_tokens: 2200,
          messages: [{ role: "user", content: buildPrompt(quantity, text, langInstruction(detectLang(text))) }],
        }),
      });

      const data = await res.json();
      applyUsage(data.usage);
      if (!res.ok) throw new Error(data.error || s.generatorRequestError);

      const rawText = data.text || "";
      if (!rawText.trim()) throw new Error(s.generatorEmptyError);

      const parsed = extractJsonArray(rawText);
      if (!parsed || parsed.length === 0) {
        throw new Error(s.generatorParseError);
      }

      const validCards = parsed.filter(
        (item): item is RawCard =>
          typeof item === "object" &&
          item !== null &&
          typeof (item as Record<string, unknown>).question === "string" &&
          typeof (item as Record<string, unknown>).answer === "string",
      );

      if (validCards.length === 0) {
        throw new Error(s.generatorFormatError);
      }

      const generatedCards: GeneratedCard[] = validCards.map((card, index) => ({
        id: `${Date.now()}-${index}`,
        question: card.question,
        answer: card.answer,
      }));

      setCards(generatedCards);

      if (!deckName) {
        setDeckName(`Deck ${new Date().toLocaleDateString()}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : s.generatorRequestError);
    } finally {
      setLoading(false);
    }
  }

  async function saveDeck() {
    const name = deckName.trim() || `Deck ${new Date().toLocaleDateString()}`;
    const cleanCards: Flashcard[] = cards.map(({ id, question, answer, visual }) => ({
      id,
      question,
      answer,
      visual,
    }));

    const success = await onSaveDeck(name, cleanCards);
    setSaved(success);
  }

  function toggleFlip(id: string) {
    setFlipped((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function updateCardVisual(cardId: string, visual: Partial<CardVisual>) {
    setCards((prev) => prev.map((card) => (card.id === cardId ? { ...card, visual } : card)));
    setEditingCard((prev) => (prev?.id === cardId ? { ...prev, visual } : prev));
  }

  return (
    <div className="ws-panel">
      <div className="ws-panel-header">
        <h2 className="ws-panel-title">{s.generatorTitle}</h2>
      </div>

      <div className="gen-layout">
        <div className="gen-input-col">
          <div className="gen-field">
            <label className="gen-label">{s.generatorTextLabel}</label>
            <textarea
              className="gen-textarea"
              placeholder={s.generatorTextPlaceholder}
              value={text}
              onChange={(event) => {
                if (error) setError("");
                setText(event.target.value);
              }}
              disabled={loading || !hasCredits}
              rows={14}
            />
            <span className="gen-char-count">{s.generatorCharCount.replace("{n}", String(text.length))}</span>
          </div>

          <div className="gen-options">
            <div className="gen-field">
              <label className="gen-label">{s.generatorQuantityLabel}</label>
              <div className="gen-qty-row">
                {[5, 8, 12, 16, 20].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`gen-qty-btn${quantity === n ? " active" : ""}`}
                    onClick={() => setQuantity(n)}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {error && <p className="gen-error">{error}</p>}

          <button className="gen-btn" type="button" onClick={generate} disabled={!canGenerate}>
            {loading ? (
              <span className="gen-loading">
                <span className="gen-spinner" />
                {s.generatorSubmitting}
              </span>
            ) : s.generatorSubmit}
          </button>
        </div>

        {(cards.length > 0 || loading) && (
          <div className="gen-output-col">
            <div className="gen-output-header">
              <div>
                <span className="gen-output-badge">{s.generatorOutputCount.replace("{n}", String(cards.length))}</span>
                <p className="gen-output-hint">{s.generatorOutputHint}</p>
              </div>

              <div className="gen-output-actions">
                {cards.length > 0 && (
                  <div className="gen-save-row">
                    <input
                      className="gen-name-input"
                      placeholder={s.generatorDeckPlaceholder}
                      value={deckName}
                      onChange={(event) => setDeckName(event.target.value)}
                    />
                    <button
                      className={`gen-save-btn${saved ? " saved" : ""}`}
                      type="button"
                      onClick={() => void saveDeck()}
                      disabled={saved || loading}
                    >
                      {saved ? s.generatorSaved : s.generatorSaveDeck}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {loading && (
              <div className="gen-skeleton-grid">
                {Array.from({ length: quantity }).map((_, index) => (
                  <div key={index} className="gen-skeleton" style={{ animationDelay: `${index * 0.07}s` }} />
                ))}
              </div>
            )}

            {cards.length > 0 && (
              <div className="gen-cards-grid">
                {cards.map((card) => (
                  <FlashCard
                    key={card.id}
                    card={card}
                    flipped={!!flipped[card.id]}
                    onClick={() => toggleFlip(card.id)}
                    onEdit={(currentCard) => setEditingCard(currentCard)}
                    variant="grid"
                    showLabel={true}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {editingCard && (
        <CardEditor
          card={editingCard}
          onSave={updateCardVisual}
          onClose={() => setEditingCard(null)}
        />
      )}
    </div>
  );
}
