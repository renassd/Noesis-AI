"use client";

import { useMemo, useState } from "react";
import CardEditor from "./CardEditor";
import FlashCard from "./FlashCard";
import { ImportBar, type ImportedTextFile } from "./ImportBar";
import type { CardVisual } from "./theme/types";
import { useLang } from "./i18n";
import type { Flashcard } from "./types";

interface Props {
  onSaveDeck: (name: string, cards: Flashcard[]) => Promise<boolean>;
}

type DraftCard = {
  id: string;
  question: string;
  answer: string;
  visual?: Partial<CardVisual>;
};

function createDraftCard(): DraftCard {
  return {
    id: crypto.randomUUID(),
    question: "",
    answer: "",
  };
}

export default function ManualFlashcardBuilder({ onSaveDeck }: Props) {
  const { lang, t } = useLang();
  const s = t.study;
  const [deckName, setDeckName] = useState("");
  const [cards, setCards] = useState<DraftCard[]>([createDraftCard()]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
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

  function updateCard(id: string, field: "question" | "answer", value: string) {
    setSaved(false);
    setCards((prev) => prev.map((card) => (card.id === id ? { ...card, [field]: value } : card)));
  }

  function updateCardVisual(cardId: string, visual: Partial<CardVisual>) {
    setSaved(false);
    setCards((prev) => prev.map((card) => (card.id === cardId ? { ...card, visual } : card)));
    setEditingCard((prev) => (prev?.id === cardId ? { ...prev, visual } : prev));
  }

  function toggleFlip(id: string) {
    setFlipped((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function addCard() {
    setSaved(false);
    setCards((prev) => [...prev, createDraftCard()]);
  }

  function removeCard(id: string) {
    setSaved(false);
    setCards((prev) => (prev.length === 1 ? [createDraftCard()] : prev.filter((card) => card.id !== id)));
  }

  function handleImportedText(file: ImportedTextFile) {
    setReferenceText(file.content);
    setReferenceSource(file.fileName);
    if (!deckName.trim()) {
      const cleanName = file.fileName.replace(/\.[^.]+$/, "");
      setDeckName(cleanName);
    }
  }

  function handleImportedImage(dataUrl: string, fileName: string) {
    setImportedImage({ dataUrl, fileName });
  }

  function clearImportedImage() {
    setImportedImage(null);
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

  async function saveDeck() {
    if (validCards.length === 0) {
      setError(s.manualError);
      return;
    }

    setError("");
    setSaving(true);

    const name =
      deckName.trim() ||
      (lang === "es" ? `Mazo manual ${new Date().toLocaleDateString()}` : `Manual deck ${new Date().toLocaleDateString()}`);

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
    setSaved(success);
  }

  return (
    <div className="manual-builder">
      <div className="manual-builder__header">
        <div>
          <span className="manual-builder__eyebrow">{s.manualEyebrow}</span>
          <h3 className="manual-builder__title">{s.manualTitle}</h3>
          <p className="manual-builder__desc">{s.manualDesc}</p>
        </div>
        <span className="manual-builder__count">
          {validCards.length} {validCards.length === 1 ? s.deckCard : s.deckCards}
        </span>
      </div>

      <div className="manual-builder__deck-row">
        <input
          className="gen-name-input manual-builder__deck-input"
          placeholder={s.manualDeckPlaceholder}
          value={deckName}
          onChange={(event) => setDeckName(event.target.value)}
        />
      </div>

      <div className="manual-builder__imports">
        <ImportBar
          lang={lang}
          onTextFile={handleImportedText}
          onImageFile={handleImportedImage}
        />
      </div>

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
              x
            </button>
          </div>

          {referenceText && (
            <textarea
              className="gen-textarea manual-builder__reference-text"
              value={referenceText}
              onChange={(event) => setReferenceText(event.target.value)}
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
                  onChange={(event) => updateCard(card.id, "question", event.target.value)}
                />
              </div>

              <div className="gen-field">
                <label className="gen-label">{s.manualAnswerLabel}</label>
                <textarea
                  className="gen-textarea manual-card__textarea"
                  placeholder={s.manualAnswerPlaceholder}
                  rows={4}
                  value={card.answer}
                  onChange={(event) => updateCard(card.id, "answer", event.target.value)}
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
                  onEdit={(currentCard) => setEditingCard(currentCard)}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {error && <p className="gen-error">{error}</p>}

      <div className="manual-builder__actions">
        <button type="button" className="manual-builder__add" onClick={addCard}>
          {s.manualAddCard}
        </button>
        <button
          type="button"
          className={`gen-save-btn manual-builder__save${saved ? " saved" : ""}`}
          onClick={() => void saveDeck()}
          disabled={saving}
        >
          {saving ? s.manualSaving : saved ? s.manualSaved : s.manualSaveDeck}
        </button>
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

