"use client";

import { useState, useEffect } from "react";
import type { Flashcard, Deck } from "./types";

interface Props {
  deck: Deck | null;
  decks: Deck[];
  onSelectDeck: (d: Deck) => void;
}

export default function FlashcardStudy({ deck, decks, onSelectDeck }: Props) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [results, setResults] = useState<Record<string, "easy" | "hard" | "wrong">>({});
  const [done, setDone] = useState(false);
  const [queue, setQueue] = useState<Flashcard[]>([]);

  useEffect(() => {
    if (deck) {
      setQueue([...deck.cards].sort(() => Math.random() - 0.5));
      setIndex(0);
      setFlipped(false);
      setResults({});
      setDone(false);
    }
  }, [deck]);

  if (!deck || decks.length === 0) {
    return (
      <div className="ws-panel ws-panel-centered">
        <div className="study-empty">
          <div className="study-empty-icon">🃏</div>
          <h2 className="study-empty-title">No tenés mazos todavía</h2>
          <p className="study-empty-sub">
            Generá flashcards desde el panel de la izquierda y guardá tu primer mazo para
            empezar a repasar.
          </p>
        </div>
      </div>
    );
  }

  if (decks.length > 0 && !deck) {
    return (
      <div className="ws-panel">
        <div className="ws-panel-header">
          <h2 className="ws-panel-title">🃏 Repasar flashcards</h2>
          <p className="ws-panel-sub">Elegí un mazo para empezar a estudiar.</p>
        </div>
        <div className="study-deck-picker">
          {decks.map((d) => (
            <button key={d.id} className="study-deck-option" onClick={() => onSelectDeck(d)}>
              <span className="study-deck-emoji">📚</span>
              <div>
                <strong>{d.name}</strong>
                <span>{d.cards.length} tarjetas</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const card = queue[index];
  const total = queue.length;
  const answered = Object.keys(results).length;
  const progress = total > 0 ? (answered / total) * 100 : 0;

  function mark(result: "easy" | "hard" | "wrong") {
    if (!card) return;
    setResults((prev) => ({ ...prev, [card.id]: result }));
    setFlipped(false);
    if (index + 1 >= total) {
      setDone(true);
    } else {
      setIndex((i) => i + 1);
    }
  }

  function restart() {
    setQueue([...deck!.cards].sort(() => Math.random() - 0.5));
    setIndex(0);
    setFlipped(false);
    setResults({});
    setDone(false);
  }

  const easy = Object.values(results).filter((r) => r === "easy").length;
  const hard = Object.values(results).filter((r) => r === "hard").length;
  const wrong = Object.values(results).filter((r) => r === "wrong").length;

  if (done) {
    return (
      <div className="ws-panel ws-panel-centered">
        <div className="study-done">
          <div className="study-done-emoji">🎉</div>
          <h2 className="study-done-title">¡Sesión completada!</h2>
          <p className="study-done-sub">Repasaste <strong>{total}</strong> tarjetas del mazo <em>{deck.name}</em>.</p>
          <div className="study-results">
            <div className="study-result easy">
              <strong>{easy}</strong>
              <span>Fácil</span>
            </div>
            <div className="study-result hard">
              <strong>{hard}</strong>
              <span>Difícil</span>
            </div>
            <div className="study-result wrong">
              <strong>{wrong}</strong>
              <span>A repasar</span>
            </div>
          </div>
          <button className="study-restart-btn" onClick={restart}>
            Volver a repasar →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ws-panel">
      <div className="ws-panel-header">
        <div>
          <h2 className="ws-panel-title">🃏 {deck.name}</h2>
          <p className="ws-panel-sub">
            Tarjeta {index + 1} de {total} · {answered} respondidas
          </p>
        </div>
        <div className="study-deck-picker-inline">
          <select
            className="study-deck-select"
            value={deck.id}
            onChange={(e) => {
              const d = decks.find((x) => x.id === e.target.value);
              if (d) onSelectDeck(d);
            }}
          >
            {decks.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Progress bar */}
      <div className="study-progress-bar">
        <div className="study-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      {/* Card */}
      <div className="study-stage">
        <div
          className={`study-card${flipped ? " flipped" : ""}`}
          onClick={() => setFlipped((f) => !f)}
        >
          <div className="study-card-inner">
            <div className="study-card-front">
              <span className="study-card-label">Pregunta</span>
              <p className="study-card-text">{card?.question}</p>
              <span className="study-card-hint">Clic para ver la respuesta</span>
            </div>
            <div className="study-card-back">
              <span className="study-card-label">Respuesta</span>
              <p className="study-card-text">{card?.answer}</p>
            </div>
          </div>
        </div>

        {flipped && (
          <div className="study-actions">
            <button className="study-action wrong" onClick={() => mark("wrong")}>
              😵 No la sabía
            </button>
            <button className="study-action hard" onClick={() => mark("hard")}>
              🤔 Difícil
            </button>
            <button className="study-action easy" onClick={() => mark("easy")}>
              ✅ Fácil
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
