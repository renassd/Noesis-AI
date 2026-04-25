"use client";

import { useMemo, useState } from "react";
import CardEditor from "./CardEditor";
import FlashCard from "./FlashCard";
import { ImportBar, type ImportedTextFile } from "./ImportBar";
import type { CardVisual } from "./theme/types";
import { useLang } from "./i18n";
import type { Deck, Flashcard } from "./types";

// Sentinel value meaning "the user wants to create a brand-new deck"
const NEW_DECK = "__new__";

interface Props {
  decks: Deck[];
  onSaveDeck: (name: string, cards: Flashcard[]) => Promise<boolean>;
  onAppendCards?: (deckId: string, cards: Array<{ question: string; answer: string }>) => Promise<unknown>;
  defaultDeckId?: string; // preselect when opened from a specific deck
}

type DraftCard = {
  id: string;
  question: string;
  answer: string;
  visual?: Partial<CardVisual>;
};

type SaveResult = {
  deckName: string;
  count: number;
  isNew: boolean;
};

function createDraftCard(): DraftCard {
  return { id: crypto.randomUUID(), question: "", answer: "" };
}

export default function ManualFlashcardBuilder({ decks, onSaveDeck, onAppendCards, defaultDeckId }: Props) {
  const { lang, t } = useLang();
  const s = t.study;

  // Deck selector: default to the passed-in deck, or the first existing deck, or NEW_DECK
  const initialDeckId = defaultDeckId ?? (decks.length > 0 ? decks[0].id : NEW_DECK);
  const [selectedDeckId, setSelectedDeckId] = useState(initialDeckId);
  const [newDeckName, setNewDeckName] = useState("");

  const [cards, setCards] = useState<DraftCard[]>([createDraftCard()]);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<SaveResult | null>(null);
  const [error, setError] = useState("");
  const [referenceText, setReferenceText] = useState("");
  const [referenceSource, setReferenceSource] = useState("");
  const [importedImage, setImportedImage] = useState<{ dataUrl: string; fileName: string } | null>(null);
  const [editingCard, setEditingCard] = useState<Flashcard | null>(null);
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});

  const validCards = useMemo(
    () => cards.filter((card) => card.question.trim() && card.answer.trim()),
    [cards],
  );

  const isNewDeck = selectedDeckId === NEW_DECK;
  const selectedDeck = decks.find((d) => d.id === selectedDeckId);

  // ── Card editing ──────────────────────────────────

  function updateCard(id: string, field: "question" | "answer", value: string) {
    setSaveResult(null);
    setCards((prev) => prev.map((card) => (card.id === id ? { ...card, [field]: value } : card)));
  }

  function updateCardVisual(cardId: string, visual: Partial<CardVisual>) {
    setSaveResult(null);
    setCards((prev) => prev.map((card) => (card.id === cardId ? { ...card, visual } : card)));
    setEditingCard((prev) => (prev?.id === cardId ? { ...prev, visual } : prev));
  }

  function toggleFlip(id: string) {
    setFlipped((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function addCard() {
    setSaveResult(null);
    setCards((prev) => [...prev, createDraftCard()]);
  }

  function removeCard(id: string) {
    setSaveResult(null);
    setCards((prev) => (prev.length === 1 ? [createDraftCard()] : prev.filter((c) => c.id !== id)));
  }

  // ── Import handlers ───────────────────────────────

  function handleImportedText(file: ImportedTextFile) {
    setReferenceText(file.content);
    setReferenceSource(file.fileName);
    if (isNewDeck && !newDeckName.trim()) {
      setNewDeckName(file.fileName.replace(/\.[^.]+$/, ""));
    }
  }

  function handleImportedImage(dataUrl: string, fileName: string) {
    setImportedImage({ dataUrl, fileName });
  }

  function clearReferenceMaterial() {
    setReferenceText("");
    setReferenceSource("");
    setImportedImage(null);
  }

  function applyImportedImage(cardId: string) {
    if (!importedImage) return;
    const card = cards.find((item) => item.id === cardId);
    updateCardVisual(cardId, {
      ...(card?.visual ?? {}),
      imageUrl: importedImage.dataUrl,
      imageAlt: importedImage.fileName,
      imagePrompt: importedImage.fileName,
    });
  }

  // ── Save ──────────────────────────────────────────

  async function save() {
    if (validCards.length === 0) {
      setError(s.manualError);
      return;
    }
    setError("");
    setSaving(true);

    if (isNewDeck) {
      const name =
        newDeckName.trim() ||
        (lang === "es"
          ? `Mazo manual ${new Date().toLocaleDateString()}`
          : `Manual deck ${new Date().toLocaleDateString()}`);

      const success = await onSaveDeck(
        name,
        validCards.map((card) => ({
          id: card.id,
          question: card.question.trim(),
          answer: card.answer.trim(),
          visual: card.visual,
        })),
      );

      setSaving(false);
      if (success) {
        setSaveResult({ deckName: name, count: validCards.length, isNew: true });
        setCards([createDraftCard()]);
        setNewDeckName("");
      }
    } else {
      if (!onAppendCards || !selectedDeck) {
        setSaving(false);
        return;
      }

      await onAppendCards(
        selectedDeckId,
        validCards.map((card) => ({
          question: card.question.trim(),
          answer: card.answer.trim(),
        })),
      );

      setSaving(false);
      setSaveResult({ deckName: selectedDeck.name, count: validCards.length, isNew: false });
      setCards([createDraftCard()]);
    }
  }

  // ── Render ────────────────────────────────────────

  const cardWord = validCards.length === 1 ? s.deckCard : s.deckCards;

  return (
    <div className="manual-builder">
      <div className="manual-builder__header">
        <div>
          <span className="manual-builder__eyebrow">{s.manualEyebrow}</span>
          <h3 className="manual-builder__title">{s.manualTitle}</h3>
          <p className="manual-builder__desc">{s.manualDesc}</p>
        </div>
        <span className="manual-builder__count">
          {validCards.length} {cardWord}
        </span>
      </div>

      {/* ── Deck selector ── */}
      <div className="manual-builder__deck-row">
        <label className="manual-builder__deck-label" htmlFor="manual-deck-select">
          {s.manualDeckSelectorLabel}
        </label>
        <div className="manual-builder__deck-select-wrap">
          <select
            id="manual-deck-select"
            className="manual-builder__deck-select"
            value={selectedDeckId}
            onChange={(e) => {
              setSelectedDeckId(e.target.value);
              setSaveResult(null);
            }}
          >
            {decks.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.cards.length} {d.cards.length === 1 ? s.deckCard : s.deckCards})
              </option>
            ))}
            <option value={NEW_DECK}>{s.manualNewDeckOption}</option>
          </select>
          {defaultDeckId && defaultDeckId !== NEW_DECK && selectedDeckId === defaultDeckId && (
            <span className="manual-builder__deck-hint">
              {lang === "es" ? "Mazo actual" : "Current deck"}
            </span>
          )}
        </div>

        {/* Name input only for new decks */}
        {isNewDeck && (
          <input
            className="gen-name-input manual-builder__deck-input"
            placeholder={s.manualNewDeckNamePlaceholder}
            value={newDeckName}
            onChange={(e) => setNewDeckName(e.target.value)}
          />
        )}
      </div>

      {/* ── Import bar ── */}
      <div className="manual-builder__imports">
        <ImportBar lang={lang} onTextFile={handleImportedText} onImageFile={handleImportedImage} />
      </div>

      {/* ── Reference material ── */}
      {(referenceText || importedImage) && (
        <div className="manual-builder__reference">
          <div className="manual-builder__reference-header">
            <div className="manual-builder__reference-meta">
              <span className="manual-builder__reference-title">{s.manualReferenceTitle}</span>
              {referenceSource && (
                <span className="manual-builder__reference-source">
                  {s.manualReferenceLoaded} {referenceSource}
                </span>
              )}
            </div>
            <button
              type="button"
              className="manual-builder__reference-remove"
              onClick={clearReferenceMaterial}
              aria-label={s.manualRemoveReference}
              title={s.manualRemoveReference}
            >
              ×
            </button>
          </div>
          {referenceText && (
            <textarea
              className="gen-textarea manual-builder__reference-text"
              value={referenceText}
              onChange={(e) => setReferenceText(e.target.value)}
              placeholder={s.manualReferencePlaceholder}
              rows={6}
            />
          )}
          {importedImage && (
            <div className="manual-builder__reference-image">
              <img src={importedImage.dataUrl} alt={importedImage.fileName} className="manual-builder__reference-thumb" />
              <span className="manual-builder__reference-caption">{importedImage.fileName}</span>
            </div>
          )}
        </div>
      )}

      {/* ── Card list ── */}
      <div className="manual-builder__list">
        {cards.map((card, index) => (
          <div key={card.id} className="manual-card">
            <div className="manual-card__top">
              <span className="manual-card__index">
                {lang === "es" ? `Tarjeta ${index + 1}` : `Card ${index + 1}`}
              </span>
              <button type="button" className="manual-card__remove" onClick={() => removeCard(card.id)}>
                {s.deckDelete}
              </button>
            </div>

            <div className="manual-card__fields">
              <div className="gen-field">
                <label className="gen-label">{s.manualQuestionLabel}</label>
                <textarea
                  className="gen-textarea manual-card__textarea"
                  placeholder={s.manualQuestionPlaceholder}
                  rows={3}
                  value={card.question}
                  onChange={(e) => updateCard(card.id, "question", e.target.value)}
                />
              </div>
              <div className="gen-field">
                <label className="gen-label">{s.manualAnswerLabel}</label>
                <textarea
                  className="gen-textarea manual-card__textarea"
                  placeholder={s.manualAnswerPlaceholder}
                  rows={4}
                  value={card.answer}
                  onChange={(e) => updateCard(card.id, "answer", e.target.value)}
                />
              </div>
            </div>

            <div className="manual-card__preview">
              <div className="manual-card__preview-header">
                <span className="manual-card__preview-title">{s.manualPreviewTitle}</span>
                <div className="manual-card__preview-actions">
                  {importedImage && (
                    <button type="button" className="manual-card__attach" onClick={() => applyImportedImage(card.id)}>
                      {s.manualUseImportedImage}
                    </button>
                  )}
                  <button type="button" className="manual-card__customize" onClick={() => setEditingCard(card)}>
                    {s.manualCustomize}
                  </button>
                </div>
              </div>
              <div className="manual-card__preview-frame">
                <FlashCard
                  card={card}
                  flipped={!!flipped[card.id]}
                  onClick={() => toggleFlip(card.id)}
                  variant="grid"
                  showLabel={true}
                  onEdit={(c) => setEditingCard(c)}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Error / success ── */}
      {error && <p className="gen-error">{error}</p>}

      {saveResult && (
        <div className="manual-builder__success">
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="8" cy="8" r="7" stroke="#10b981" strokeWidth="1.5"/>
            <path d="M5 8.5l2 2 4-4" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {saveResult.isNew ? (
            <span>{s.manualAddedNewDeck} — <strong>{saveResult.deckName}</strong></span>
          ) : (
            <span>
              {s.manualAddedToDeck
                .replace("{n}", String(saveResult.count))
                .replace("{cards}", saveResult.count === 1 ? s.deckCard : s.deckCards)}{" "}
              <strong>{saveResult.deckName}</strong>
            </span>
          )}
        </div>
      )}

      {/* ── Actions ── */}
      <div className="manual-builder__actions">
        <button type="button" className="manual-builder__add" onClick={addCard}>
          {s.manualAddCard}
        </button>
        <button
          type="button"
          className={`gen-save-btn manual-builder__save${saveResult ? " saved" : ""}`}
          onClick={() => void save()}
          disabled={saving}
        >
          {saving ? s.manualSaving : saveResult ? s.manualSaved : s.manualSaveDeck}
        </button>
      </div>

      {editingCard && (
        <CardEditor card={editingCard} onSave={updateCardVisual} onClose={() => setEditingCard(null)} />
      )}
    </div>
  );
}
