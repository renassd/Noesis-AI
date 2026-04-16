"use client";

import { useState } from "react";
import type { Flashcard } from "./types";

interface Props {
  onSaveDeck: (name: string, cards: Flashcard[]) => Promise<boolean>;
}

function extractJsonArray(rawText: string) {
  const cleaned = rawText.replace(/```json|```/g, "").trim();

  try {
    return JSON.parse(cleaned) as Array<{ question: string; answer: string }>;
  } catch {
    const start = cleaned.indexOf("[");
    const end = cleaned.lastIndexOf("]");

    if (start === -1 || end === -1 || end <= start) {
      throw new Error("La respuesta de IA no trajo un JSON valido para las flashcards.");
    }

    return JSON.parse(cleaned.slice(start, end + 1)) as Array<{
      question: string;
      answer: string;
    }>;
  }
}

export default function FlashcardGenerator({ onSaveDeck }: Props) {
  const [text, setText] = useState("");
  const [quantity, setQuantity] = useState(8);
  const [loading, setLoading] = useState(false);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [deckName, setDeckName] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});

  async function generate() {
    if (text.trim().length < 30) {
      setError("Ingresa al menos 30 caracteres de texto para generar tarjetas.");
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
          max_tokens: 1000,
          messages: [
            {
              role: "user",
              content: `Sos un asistente de estudio. A partir del siguiente texto, genera exactamente ${quantity} flashcards de estudio en espanol.

Reglas:
- Cada tarjeta debe tener una pregunta clara y una respuesta concisa de 1 a 3 oraciones.
- Las preguntas deben evaluar comprension, no solo memoria literal.
- Responde SOLO con un array JSON valido, sin markdown ni texto extra.
- Formato exacto: [{"question":"...","answer":"..."},...]

Texto:
${text.slice(0, 4000)}`,
            },
          ],
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al generar las tarjetas.");
      }

      const parsed = extractJsonArray(data.text || "");
      const withIds = parsed.map((card, index) => ({
        ...card,
        id: `${Date.now()}-${index}`,
      }));

      if (withIds.length === 0) {
        throw new Error("La IA no devolvio tarjetas para este texto.");
      }

      setCards(withIds);

      if (!deckName) {
        setDeckName(`Mazo ${new Date().toLocaleDateString("es-AR")}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al generar las tarjetas.");
    } finally {
      setLoading(false);
    }
  }

  async function saveDeck() {
    const name = deckName.trim() || `Mazo ${new Date().toLocaleDateString("es-AR")}`;
    const success = await onSaveDeck(name, cards);
    setSaved(success);
  }

  function toggleFlip(id: string) {
    setFlipped((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <div className="ws-panel">
      <div className="ws-panel-header">
        <h2 className="ws-panel-title">Generar flashcards con IA</h2>
        <p className="ws-panel-sub">
          Pega cualquier texto y la IA genera tarjetas de estudio listas para repasar.
        </p>
      </div>

      <div className="gen-layout">
        <div className="gen-input-col">
          <div className="gen-field">
            <label className="gen-label">Tu texto o apuntes</label>
            <textarea
              className="gen-textarea"
              placeholder="Pega aca tu texto, apuntes o resumen. Minimo 30 caracteres."
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

          {error && <p className="gen-error">{error}</p>}

          <button className="gen-btn" type="button" onClick={generate} disabled={loading}>
            {loading ? (
              <span className="gen-loading">
                <span className="gen-spinner" />
                Generando tarjetas...
              </span>
            ) : (
              "Generar flashcards ->"
            )}
          </button>
        </div>

        {(cards.length > 0 || loading) && (
          <div className="gen-output-col">
            <div className="gen-output-header">
              <div>
                <span className="gen-output-badge">{cards.length} tarjetas generadas</span>
                <p className="gen-output-hint">Haz clic en una tarjeta para ver la respuesta</p>
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
                  <div
                    key={card.id}
                    className={`gen-card${flipped[card.id] ? " flipped" : ""}`}
                    onClick={() => toggleFlip(card.id)}
                  >
                    <div className="gen-card-inner">
                      <div className="gen-card-front">
                        <span className="gen-card-side-label">Pregunta</span>
                        <p>{card.question}</p>
                      </div>
                      <div className="gen-card-back">
                        <span className="gen-card-side-label">Respuesta</span>
                        <p>{card.answer}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
