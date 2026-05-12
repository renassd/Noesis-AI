"use client";

import { useState } from "react";
import CardEditor from "./CardEditor";
import FlashCard from "./FlashCard";
import { detectLang, langInstruction } from "./lib/detectLang";
import type { CardVisual } from "./theme/types";
import type { Flashcard } from "./types";

interface Props {
  onSaveDeck: (name: string, cards: Flashcard[]) => Promise<boolean>;
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface RawCard {
  question: string;
  answer: string;
  /** Optional: a short, concrete image prompt (max ~60 chars). Only included
   *  when a diagram, diagram, map or visual would genuinely aid retention. */
  imagePrompt?: string;
  /** Resolved after generation — base64 data URL or remote URL */
  imageUrl?: string;
  /** true while the image for this card is loading */
  imageLoading?: boolean;
}

// ── JSON extraction ───────────────────────────────────────────────────────────
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

// ── Prompt builder ────────────────────────────────────────────────────────────
function buildPrompt(quantity: number, text: string, langHint: string): string {
  return `You are a study assistant. Generate exactly ${quantity} flashcards from the text below.

${langHint}

STRICT INSTRUCTIONS:
- Respond ONLY with a JSON array. No introduction, no explanation, no text before or after.
- Do not use markdown code blocks.
- The array must have exactly ${quantity} objects.
- Each object must have exactly these fields: "question", "answer", and optionally "imagePrompt".
- Questions should test comprehension, not literal memory.
- Answers should be concise (1–3 sentences).
- For math or science formulas, use valid LaTeX: $...$ for inline, $$...$$ for block.

IMAGE PROMPTS (imagePrompt field):
- Only include "imagePrompt" when a simple visual would SIGNIFICANTLY aid learning.
  Good candidates: diagrams (cell structure, circuit diagrams, anatomical parts),
  geographic/historical maps, process flows (photosynthesis steps), molecular structures.
  BAD candidates: abstract concepts, definitions, historical dates, opinions.
- If you do include one, write it as a short, concrete, search-engine-style description
  in English (max 60 characters). Example: "diagram of human heart chambers labeled"
- MOST cards should NOT have imagePrompt. Only 0–3 cards in the whole deck should have one.

EXACT FORMAT (imagePrompt is optional):
[{"question":"...","answer":"..."},{"question":"...","answer":"...","imagePrompt":"..."}]

TEXT:
${text.slice(0, 4000)}`;
}

// ── Fetch illustration from Unsplash (free, no key needed for basic access) ──
// Uses Unsplash's public source URL — no API key required for <50 req/hr.
// Falls back silently if the network call fails.
async function fetchIllustration(prompt: string): Promise<string | null> {
  try {
    // Unsplash Source API: returns a redirect to a relevant photo.
    // We encode the prompt as a search query and request a compact size.
    const query = encodeURIComponent(prompt.slice(0, 60));
    const url = `https://source.unsplash.com/400x240/?${query}`;

    // We just use the URL directly — Unsplash source URLs are stable image endpoints.
    // The browser will load them lazily inside the card.
    return url;
  } catch {
    return null;
  }
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function FlashcardGenerator({ onSaveDeck }: Props) {
  const [text, setText] = useState("");
  const [quantity, setQuantity] = useState(8);
  const [loading, setLoading] = useState(false);
  const [cards, setCards] = useState<(Flashcard & { imageUrl?: string; imageLoading?: boolean })[]>([]);
  const [deckName, setDeckName] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});
  const [editingCard, setEditingCard] = useState<Flashcard | null>(null);

  async function generate() {
    if (text.trim().length < 30) {
      setError("Ingresá al menos 30 caracteres de texto para generar tarjetas.");
      return;
    }

    setError("");
    setLoading(true);
    setCards([]);
    setSaved(false);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          max_tokens: 2200,
          messages: [{ role: "user", content: buildPrompt(quantity, text, langInstruction(detectLang(text))) }],
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al generar las tarjetas.");

      const rawText = data.text || "";
      if (!rawText.trim()) throw new Error("La IA no devolvió contenido. Intentá de nuevo.");

      const parsed = extractJsonArray(rawText);
      if (!parsed || parsed.length === 0) {
        console.warn("Raw AI response:", rawText);
        throw new Error("No se pudo leer el formato de las tarjetas. Intentá con un texto más claro.");
      }

      const validCards = parsed.filter(
        (item): item is RawCard =>
          typeof item === "object" &&
          item !== null &&
          typeof (item as Record<string, unknown>).question === "string" &&
          typeof (item as Record<string, unknown>).answer === "string",
      );

      if (validCards.length === 0) throw new Error("Las tarjetas generadas no tienen el formato esperado.");

      // Build initial card list — imageUrl starts undefined for cards that need fetching
      const withIds = validCards.map((card, index) => ({
        id: `${Date.now()}-${index}`,
        question: card.question,
        answer: card.answer,
        imageUrl: undefined as string | undefined,
        imageLoading: !!card.imagePrompt,
      }));

      setCards(withIds);

      if (!deckName) {
        setDeckName(`Deck ${new Date().toLocaleDateString()}`);
      }

      // Fetch images for cards that have prompts — async, non-blocking
      for (let i = 0; i < validCards.length; i++) {
        const prompt = validCards[i].imagePrompt;
        if (!prompt) continue;

        fetchIllustration(prompt).then((url) => {
          setCards((prev) =>
            prev.map((c, idx) =>
              idx === i ? { ...c, imageUrl: url ?? undefined, imageLoading: false } : c,
            ),
          );
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al generar las tarjetas.");
    } finally {
      setLoading(false);
    }
  }

  async function saveDeck() {
    const name = deckName.trim() || `Deck ${new Date().toLocaleDateString()}`;
    // Strip image state before saving — only persisted fields go to the deck
    const cleanCards: Flashcard[] = cards.map(({ id, question, answer, imageUrl }) => ({
      id,
      question,
      answer,
      // Store imageUrl in a custom visual extension field if present
      ...(imageUrl ? { _imageUrl: imageUrl } : {}),
    })) as Flashcard[];
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
        <h2 className="ws-panel-title">Generar flashcards con IA</h2>
        <p className="ws-panel-sub">
          Pegá cualquier texto y la IA genera tarjetas de estudio. Cuando sea útil, agrega imágenes ilustrativas.
        </p>
      </div>

      <div className="gen-layout">
        {/* ── Input column ── */}
        <div className="gen-input-col">
          <div className="gen-field">
            <label className="gen-label">Tu texto o apuntes</label>
            <textarea
              className="gen-textarea"
              placeholder="Pegá acá tu texto, apuntes o resumen. Mínimo 30 caracteres."
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={14}
            />
            <span className="gen-char-count">{text.length} caracteres</span>
          </div>

          <div className="gen-options">
            <div className="gen-field">
              <label className="gen-label">Cantidad de tarjetas</label>
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

          <div className="gen-image-hint">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <rect x="1.5" y="3" width="13" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
              <circle cx="5.5" cy="7" r="1" fill="currentColor"/>
              <path d="M1.5 11l3.5-3 3 2.5 2.5-2.5 4 3" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
            </svg>
            La IA agrega imágenes solo cuando aporten valor real al aprendizaje.
          </div>

          {error && <p className="gen-error">{error}</p>}

          <button className="gen-btn" type="button" onClick={generate} disabled={loading}>
            {loading ? (
              <span className="gen-loading">
                <span className="gen-spinner" />
                Generando tarjetas...
              </span>
            ) : "Generar flashcards →"}
          </button>
        </div>

        {/* ── Output column ── */}
        {(cards.length > 0 || loading) && (
          <div className="gen-output-col">
            <div className="gen-output-header">
              <div>
                <span className="gen-output-badge">{cards.length} tarjetas generadas</span>
                <p className="gen-output-hint">Hacé clic en una tarjeta para ver la respuesta</p>
              </div>
              {cards.length > 0 && (
                <div className="gen-save-row">
                  <input
                    className="gen-name-input"
                    placeholder="Nombre del mazo"
                    value={deckName}
                    onChange={(e) => setDeckName(e.target.value)}
                  />
                  <button
                    className={`gen-save-btn${saved ? " saved" : ""}`}
                    type="button"
                    onClick={() => void saveDeck()}
                    disabled={saved || loading}
                  >
                    {saved ? "Guardado" : "Guardar mazo"}
                  </button>
                </div>
              )}
            </div>

            {loading && (
              <div className="gen-skeleton-grid">
                {Array.from({ length: quantity }).map((_, i) => (
                  <div key={i} className="gen-skeleton" style={{ animationDelay: `${i * 0.07}s` }} />
                ))}
              </div>
            )}

            {cards.length > 0 && (
              <div className="gen-cards-grid">
                {cards.map((card) => (
                  <div key={card.id} className="gen-card-wrapper">
                    <FlashCard
                      card={card}
                      flipped={!!flipped[card.id]}
                      onClick={() => toggleFlip(card.id)}
                      onEdit={(currentCard) => setEditingCard(currentCard)}
                      variant="grid"
                      showLabel={true}
                    />
                    {/* Image strip — shown below the flip card when an image exists */}
                    {(card.imageUrl || card.imageLoading) && (
                      <div className="gen-card-image-strip">
                        {card.imageLoading ? (
                          <div className="gen-card-image-loading" aria-label="Cargando imagen">
                            <span className="gen-card-image-spinner" aria-hidden="true" />
                          </div>
                        ) : card.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={card.imageUrl}
                            alt={`Ilustración: ${card.question.slice(0, 60)}`}
                            className="gen-card-image"
                            loading="lazy"
                            onError={(e) => {
                              // Hide the strip if image fails to load
                              const strip = (e.currentTarget as HTMLElement).closest(".gen-card-image-strip");
                              if (strip) (strip as HTMLElement).style.display = "none";
                            }}
                          />
                        ) : null}
                      </div>
                    )}
                  </div>
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
