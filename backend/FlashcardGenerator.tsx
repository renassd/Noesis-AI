"use client";

import { useState } from "react";

interface Props {
  onSaveDeck: (name: string, cards: { question: string; answer: string }[]) => Promise<void>;
}

type Card = { id: string; question: string; answer: string };

export default function FlashcardGenerator({ onSaveDeck }: Props) {
  const [text, setText] = useState("");
  const [quantity, setQuantity] = useState(8);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cards, setCards] = useState<Card[]>([]);
  const [deckName, setDeckName] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});

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
          model: "claude-sonnet-4-20250514",
          max_tokens: 2000,
          messages: [
            {
              role: "user",
              content: `Sos un asistente de estudio. A partir del siguiente texto, generá exactamente ${quantity} flashcards de estudio en español.

Reglas:
- Cada tarjeta debe tener una pregunta clara y una respuesta concisa (1-3 oraciones).
- Las preguntas deben testear comprensión, no solo memorización literal.
- Respondé SOLO con un array JSON válido, sin texto adicional, sin markdown, sin comillas de código.
- Formato exacto: [{"question":"...","answer":"..."},...]

Texto:
${text.slice(0, 4000)}`,
            },
          ],
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const raw = data.content?.map((b: { type: string; text?: string }) => b.text || "").join("") || "";
      const clean = raw.replace(/```json|```/g, "").trim();
      const parsed: { question: string; answer: string }[] = JSON.parse(clean);
      setCards(parsed.map((c, i) => ({ ...c, id: `${Date.now()}-${i}` })));
      if (!deckName) setDeckName(`Mazo ${new Date().toLocaleDateString("es-AR")}`);
    } catch (e) {
      console.error(e);
      setError("Error al generar las tarjetas. Revisá tu texto e intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  async function saveDeck() {
    const name = deckName.trim() || `Mazo ${new Date().toLocaleDateString("es-AR")}`;
    setSaving(true);
    await onSaveDeck(name, cards.map(({ question, answer }) => ({ question, answer })));
    setSaving(false);
    setSaved(true);
  }

  return (
    <div className="ws-panel">
      <div className="ws-panel-header">
        <h2 className="ws-panel-title">✨ Generar flashcards con IA</h2>
        <p className="ws-panel-sub">
          Pegá cualquier texto — apuntes, un paper, un resumen — y la IA genera tarjetas listas para repasar.
        </p>
      </div>

      <div className="gen-layout">
        {/* INPUT */}
        <div className="gen-input-col">
          <div className="gen-field">
            <label className="gen-label">Tu texto o apuntes</label>
            <textarea
              className="gen-textarea"
              placeholder="Pegá acá tu texto, apuntes de clase, resumen de paper... (mínimo 30 caracteres)"
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

          <button className="gen-btn" onClick={generate} disabled={loading}>
            {loading ? (
              <span className="gen-loading">
                <span className="gen-spinner" /> Generando tarjetas…
              </span>
            ) : "Generar flashcards →"}
          </button>
        </div>

        {/* OUTPUT */}
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
                    onClick={saveDeck}
                    disabled={saved || saving}
                  >
                    {saving ? "Guardando…" : saved ? "✓ Guardado" : "Guardar mazo"}
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
                    onClick={() => setFlipped((p) => ({ ...p, [card.id]: !p[card.id] }))}
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
