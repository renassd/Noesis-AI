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

function buildPrompt(quantity: number, text: string, langHint: string): string {
  return `You are a study assistant. Generate exactly ${quantity} flashcards from the text below.

${langHint}

CRITICAL — output rules:
- Your response must begin with [ and end with ]. Nothing before or after.
- No markdown, no code fences, no numbered lists, no explanation.
- Each item must have "question" and "answer" string fields.
- Questions test comprehension. Answers are 1-3 sentences.
- Formulas: $...$ inline LaTeX, $$...$$ display.

[{"question":"...","answer":"..."},{"question":"...","answer":"..."}]

TEXT:
${text.slice(0, 4000)}`;
}

// ── Robust parser ─────────────────────────────────────────────────────────────
// Accepts: JSON array [...], wrapped object {"flashcards":[...]}, numbered Q/A
// lists, or raw regex extraction — so any reasonable AI output is handled.

function normalizeItem(c: unknown): RawCard | null {
  if (typeof c !== "object" || c === null) return null;
  const o = c as Record<string, unknown>;
  const question =
    typeof o.question  === "string" ? o.question  :
    typeof o.pregunta  === "string" ? o.pregunta  :
    typeof o.front     === "string" ? o.front     :
    typeof o.q         === "string" ? o.q         : null;
  const answer =
    typeof o.answer    === "string" ? o.answer    :
    typeof o.respuesta === "string" ? o.respuesta :
    typeof o.back      === "string" ? o.back      :
    typeof o.a         === "string" ? o.a         : null;
  if (!question?.trim() || !answer?.trim()) return null;
  return { question: question.trim(), answer: answer.trim() };
}

function extractCards(parsed: unknown): RawCard[] {
  const arr: unknown[] = Array.isArray(parsed)
    ? parsed
    : (() => {
        if (typeof parsed !== "object" || parsed === null) return [];
        const o = parsed as Record<string, unknown>;
        if (Array.isArray(o.flashcards)) return o.flashcards;
        if (Array.isArray(o.cards))      return o.cards;
        if (Array.isArray(o.items))      return o.items;
        return [];
      })();
  return arr.flatMap((c) => { const r = normalizeItem(c); return r ? [r] : []; });
}

function extractJsonArray(raw: string): RawCard[] | null {
  if (!raw?.trim()) return null;
  const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();

  // Strategy 1: parse the whole string
  try { const r = extractCards(JSON.parse(cleaned)); if (r.length) return r; } catch {}

  // Strategy 2: find any {...} or [...] span (handles prose preamble)
  for (let si = 0; si < cleaned.length; si++) {
    const ch = cleaned[si];
    if (ch !== "[" && ch !== "{") continue;
    const close = ch === "[" ? "]" : "}";
    for (let ei = cleaned.length - 1; ei > si; ei--) {
      if (cleaned[ei] !== close) continue;
      try { const r = extractCards(JSON.parse(cleaned.slice(si, ei + 1))); if (r.length) return r; } catch {}
    }
  }

  // Strategy 3: Q/A line-by-line (numbered lists)
  const strip = (s: string) => s.replace(/^\*+|\*+$/g, "").replace(/\s+/g, " ").trim();
  const qaCards: RawCard[] = [];
  let pq = "";
  for (const line of cleaned.split("\n")) {
    const l = line.trim();
    const qm = l.match(/^(?:\d+[.)]\s*)?(?:\*+)?\s*(?:Q(?:uestion)?|Pregunta)\s*:?\s*\*?\s*(.+)/i);
    const am = l.match(/^(?:\*+)?\s*(?:A(?:nswer)?|Respuesta)\s*:?\s*\*?\s*(.+)/i);
    if (qm) pq = strip(qm[1]);
    else if (am && pq) { qaCards.push({ question: pq, answer: strip(am[1]) }); pq = ""; }
  }
  if (qaCards.length) return qaCards;

  // Strategy 4: regex scan (works on partially malformed JSON)
  const re = /"(?:question|pregunta|front|q)"\s*:\s*"((?:[^"\\]|\\.)*)"\s*[,}][^]*?"(?:answer|respuesta|back|a)"\s*:\s*"((?:[^"\\]|\\.)*)"/gi;
  const regCards: RawCard[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(cleaned)) !== null) {
    const q = m[1].replace(/\\"/g, '"').replace(/\\n/g, "\n").trim();
    const a = m[2].replace(/\\"/g, '"').replace(/\\n/g, "\n").trim();
    if (q && a) regCards.push({ question: q, answer: a });
  }
  if (regCards.length) return regCards;

  return null;
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

      // extractJsonArray tries 4 strategies and already normalises field names
      const validCards = extractJsonArray(rawText);
      if (!validCards || validCards.length === 0) {
        throw new Error(s.generatorParseError);
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
