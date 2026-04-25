"use client";

import { useEffect, useState } from "react";
import CardEditor from "./CardEditor";
import FlashCard from "./FlashCard";
import { useLang } from "./i18n";
import type { Deck, Flashcard } from "./types";
import type { CardVisual } from "./theme/types";

interface Props {
  deck: Deck | null;
  decks: Deck[];
  onSelectDeck: (deck: Deck) => void;
  onSaveCardVisuals?: (
    deckId: string,
    cardVisuals: Record<string, Partial<CardVisual>>,
  ) => Promise<void>;
}

export default function FlashcardStudy({
  deck,
  decks,
  onSelectDeck,
  onSaveCardVisuals,
}: Props) {
  const { t } = useLang();
  const s = t.study;
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [results, setResults] = useState<Record<string, "easy" | "hard" | "wrong">>({});
  const [done, setDone] = useState(false);
  const [queue, setQueue] = useState<Flashcard[]>([]);
  const [editingCard, setEditingCard] = useState<Flashcard | null>(null);
  const [cardVisuals, setCardVisuals] = useState<Record<string, Partial<CardVisual>>>({});

  useEffect(() => {
    if (!deck) return;

    setQueue([...deck.cards].sort(() => Math.random() - 0.5));
    setIndex(0);
    setFlipped(false);
    setResults({});
    setDone(false);
    setCardVisuals(
      Object.fromEntries(
        deck.cards
          .filter((card) => !!card.visual)
          .map((card) => [card.id, card.visual as Partial<CardVisual>]),
      ),
    );
  }, [deck]);

  if (!deck || decks.length === 0) {
    return (
      <div className="ws-panel ws-panel-centered">
        <div className="study-empty">
          <h2 className="study-empty-title">{s.noDecksTitle}</h2>
          <p className="study-empty-sub">{s.noDecksDesc}</p>
        </div>
      </div>
    );
  }

  if (decks.length > 0 && !deck) {
    return (
      <div className="ws-panel">
        <div className="ws-panel-header">
          <h2 className="ws-panel-title">{s.pickDeckTitle}</h2>
          <p className="ws-panel-sub">{s.pickDeckDesc}</p>
        </div>
        <div className="study-deck-picker">
          {decks.map((currentDeck) => (
            <button
              key={currentDeck.id}
              className="study-deck-option"
              onClick={() => onSelectDeck(currentDeck)}
            >
              <div>
                <strong>{currentDeck.name}</strong>
                <span>
                  {currentDeck.cards.length}{" "}
                  {currentDeck.cards.length === 1 ? s.deckCard : s.deckCards}
                </span>
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
      return;
    }

    setIndex((currentIndex) => currentIndex + 1);
  }

  async function updateCardVisual(cardId: string, visual: Partial<CardVisual>) {
    if (!deck) return;

    const nextVisuals = { ...cardVisuals, [cardId]: visual };
    setCardVisuals(nextVisuals);
    setQueue((prev) => prev.map((item) => (item.id === cardId ? { ...item, visual } : item)));
    setEditingCard((prev) => (prev?.id === cardId ? { ...prev, visual } : prev));

    if (onSaveCardVisuals) {
      await onSaveCardVisuals(deck.id, { [cardId]: visual });
    }
  }

  function restart() {
    if (!deck) return;

    setQueue([...deck.cards].sort(() => Math.random() - 0.5));
    setIndex(0);
    setFlipped(false);
    setResults({});
    setDone(false);
  }

  const easy = Object.values(results).filter((value) => value === "easy").length;
  const hard = Object.values(results).filter((value) => value === "hard").length;
  const wrong = Object.values(results).filter((value) => value === "wrong").length;

  if (done) {
    return (
      <div className="ws-panel ws-panel-centered">
        <div className="study-done">
          <div className="study-done-emoji">🎉</div>
          <h2 className="study-done-title">{s.sessionDone}</h2>
          <p className="study-done-sub">
            {s.sessionDoneDesc.replace("{total}", String(total)).replace("{deck}", deck.name)}
          </p>
          <div className="study-results">
            <div className="study-result easy">
              <strong>{easy}</strong>
              <span>{s.easy}</span>
            </div>
            <div className="study-result hard">
              <strong>{hard}</strong>
              <span>{s.hard}</span>
            </div>
            <div className="study-result wrong">
              <strong>{wrong}</strong>
              <span>{s.wrong}</span>
            </div>
          </div>
          <button className="study-restart-btn" onClick={restart}>
            {s.reviewAgain}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ws-panel">
      <div className="ws-panel-header">
        <div>
          <h2 className="ws-panel-title">{deck.name}</h2>
          <p className="ws-panel-sub">
            {s.cardOf.replace("{current}", String(index + 1)).replace("{total}", String(total))} ·{" "}
            {s.answered.replace("{n}", String(answered))}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="study-deck-picker-inline">
            <select
              className="study-deck-select"
              value={deck.id}
              onChange={(event) => {
                const nextDeck = decks.find((item) => item.id === event.target.value);
                if (nextDeck) onSelectDeck(nextDeck);
              }}
            >
              {decks.map((currentDeck) => (
                <option key={currentDeck.id} value={currentDeck.id}>
                  {currentDeck.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="study-progress-bar">
        <div className="study-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="study-stage">
        {card && (
          <FlashCard
            card={{ ...card, visual: { ...card.visual, ...(cardVisuals[card.id] ?? {}) } }}
            flipped={flipped}
            onClick={() => setFlipped((value) => !value)}
            onEdit={(currentCard) =>
              setEditingCard({
                ...currentCard,
                visual: { ...currentCard.visual, ...(cardVisuals[currentCard.id] ?? {}) },
              })
            }
            variant="study"
            showLabel={true}
          />
        )}

        {flipped && (
          <div className="study-actions">
            <button className="study-action wrong" onClick={() => mark("wrong")}>
              {s.wrong}
            </button>
            <button className="study-action hard" onClick={() => mark("hard")}>
              {s.hard}
            </button>
            <button className="study-action easy" onClick={() => mark("easy")}>
              {s.easy}
            </button>
          </div>
        )}
      </div>

      {editingCard && (
        <CardEditor
          card={editingCard}
          onSave={(cardId, visual) => {
            void updateCardVisual(cardId, visual);
          }}
          onClose={() => setEditingCard(null)}
        />
      )}
    </div>
  );
}
