"use client";

import { useEffect, useRef, useState } from "react";
import { fetchWithSupabaseAuth } from "@/lib/supabase-browser";
import { useAiUsage } from "@/context/AiUsageContext";
import { detectLang, langInstruction } from "./lib/detectLang";
import type { Deck, Flashcard } from "./types";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type Stage = "choose" | "manual" | "ai" | "pdf" | "review";
type Difficulty = "basic" | "intermediate" | "advanced";

interface DraftCard {
  id: string;
  question: string;
  answer: string;
  isDuplicate: boolean;
  keep: boolean;
}

interface Props {
  deck: Deck;
  onClose: () => void;
  onSave: (cards: Array<{ question: string; answer: string }>) => Promise<void>;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function normalize(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ");
}

function checkDuplicates(drafts: DraftCard[], existing: Flashcard[]): DraftCard[] {
  const existingNorm = new Set(existing.map((c) => normalize(c.question)));
  return drafts.map((d) => ({ ...d, isDuplicate: existingNorm.has(normalize(d.question)) }));
}

function makeDraft(question: string, answer: string): DraftCard {
  return { id: crypto.randomUUID(), question, answer, isDuplicate: false, keep: true };
}

function extractJsonArray(raw: string): Array<{ question: string; answer: string }> | null {
  const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();

  function parseCandidate(src: string): Array<{ question: string; answer: string }> | null {
    try {
      const parsed: unknown = JSON.parse(src);
      const arr = Array.isArray(parsed) ? parsed : null;
      if (!arr) return null;
      const valid = arr.filter(
        (item): item is { question: string; answer: string } =>
          typeof item === "object" &&
          item !== null &&
          typeof (item as Record<string, unknown>).question === "string" &&
          typeof (item as Record<string, unknown>).answer === "string",
      );
      return valid.length > 0 ? valid : null;
    } catch {
      return null;
    }
  }

  // Try the whole cleaned string first (handles responses that are pure JSON)
  const direct = parseCandidate(cleaned);
  if (direct) return direct;

  // Fall back to extracting between first [ and last ]
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) return null;
  return parseCandidate(cleaned.slice(start, end + 1));
}

function buildAiPrompt(
  deckName: string,
  existing: Flashcard[],
  text: string,
  quantity: number,
  difficulty: Difficulty,
  langHint: string,
): string {
  // Keep the existing-cards sample small to preserve output token budget
  const sample = existing
    .slice(0, 3)
    .map((c) => `"${c.question}"`)
    .join(", ");

  const diffNote =
    difficulty === "basic"
      ? "Focus on definitions and key terms."
      : difficulty === "advanced"
        ? "Focus on synthesis, edge cases, and critical analysis."
        : "Focus on mechanisms, applications, and comparisons.";

  // Cap input text at 2500 chars so the total prompt stays within free-plan limits
  const textChunk = text.slice(0, 2500);

  return `Generate exactly ${quantity} flashcards for the deck "${deckName}". ${diffNote}
${sample ? `Do NOT repeat these existing questions: ${sample}.` : ""}
${langHint}
Respond ONLY with a valid JSON array, no other text:
[{"question":"...","answer":"..."}]

TEXT:
${textChunk}`;
}

// ─────────────────────────────────────────────
// Sub-views
// ─────────────────────────────────────────────

function ChooseMode({ onChoose }: { onChoose: (s: "manual" | "ai" | "pdf") => void }) {
  return (
    <div className="amc-choose">
      <p className="amc-choose-label">How do you want to add them?</p>
      <button className="amc-mode-btn" type="button" onClick={() => onChoose("manual")}>
        <span className="amc-mode-icon">✏️</span>
        <span>
          <strong>Write manually</strong>
          <span className="amc-mode-sub">Add your own questions and answers</span>
        </span>
      </button>
      <button className="amc-mode-btn" type="button" onClick={() => onChoose("ai")}>
        <span className="amc-mode-icon">✨</span>
        <span>
          <strong>Generate with AI</strong>
          <span className="amc-mode-sub">Paste notes, a topic, or any text</span>
        </span>
      </button>
      <button className="amc-mode-btn" type="button" onClick={() => onChoose("pdf")}>
        <span className="amc-mode-icon">📄</span>
        <span>
          <strong>Generate from file</strong>
          <span className="amc-mode-sub">Upload a PDF, DOCX, or image</span>
        </span>
      </button>
    </div>
  );
}

function ManualInput({ onNext }: { onNext: (cards: DraftCard[]) => void }) {
  const [rows, setRows] = useState([{ q: "", a: "" }]);

  function update(i: number, field: "q" | "a", value: string) {
    setRows((prev) => prev.map((row, j) => (j === i ? { ...row, [field]: value } : row)));
  }

  function addRow() {
    setRows((prev) => [...prev, { q: "", a: "" }]);
  }

  function removeRow(i: number) {
    if (rows.length === 1) return;
    setRows((prev) => prev.filter((_, j) => j !== i));
  }

  function handleNext() {
    const valid = rows.filter((r) => r.q.trim() && r.a.trim());
    if (valid.length === 0) return;
    onNext(valid.map((r) => makeDraft(r.q.trim(), r.a.trim())));
  }

  const validCount = rows.filter((r) => r.q.trim() && r.a.trim()).length;

  return (
    <div className="amc-manual">
      <div className="amc-manual-header">
        <span className="amc-col-label">Question</span>
        <span className="amc-col-label">Answer</span>
        <span style={{ width: 28 }} />
      </div>
      <div className="amc-rows">
        {rows.map((row, i) => (
          <div key={i} className="amc-row">
            <textarea
              className="amc-cell"
              placeholder="Question…"
              value={row.q}
              onChange={(e) => update(i, "q", e.target.value)}
              rows={2}
            />
            <textarea
              className="amc-cell"
              placeholder="Answer…"
              value={row.a}
              onChange={(e) => update(i, "a", e.target.value)}
              rows={2}
            />
            <button
              className="amc-row-remove"
              type="button"
              onClick={() => removeRow(i)}
              disabled={rows.length === 1}
              aria-label="Remove row"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <button className="amc-add-row-btn" type="button" onClick={addRow}>
        + Add row
      </button>
      <div className="amc-footer">
        <button
          className="amc-btn-primary"
          type="button"
          onClick={handleNext}
          disabled={validCount === 0}
        >
          Review {validCount > 0 ? validCount : ""} {validCount === 1 ? "card" : "cards"} →
        </button>
      </div>
    </div>
  );
}

function AiInput({
  deck,
  onNext,
  fromText,
}: {
  deck: Deck;
  onNext: (cards: DraftCard[]) => void;
  fromText?: string; // pre-filled from PDF extraction
}) {
  const { applyUsage } = useAiUsage();
  const [text, setText] = useState(fromText ?? "");
  const [quantity, setQuantity] = useState(5);
  const [difficulty, setDifficulty] = useState<Difficulty>("intermediate");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function generate() {
    const trimmed = text.trim();
    if (trimmed.length < 30) {
      setError("Add at least 30 characters of text or a topic description.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const langHint = langInstruction(detectLang(trimmed));
      const prompt = buildAiPrompt(deck.name, deck.cards, trimmed, quantity, difficulty, langHint);

      const res = await fetchWithSupabaseAuth("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          max_tokens: 2000,
          messages: [{ role: "user", content: prompt }],
          // Also inject user memories related to the deck topic
          useMemory: true,
          memoryQuery: deck.name,
        }),
      });
      const data = await res.json();
      applyUsage(data.usage);
      if (!res.ok) throw new Error(data.error || "AI generation failed.");

      const parsed = extractJsonArray(data.text || "");
      if (!parsed || parsed.length === 0) {
        throw new Error(
          "The AI response couldn't be read as flashcards. Try requesting fewer cards or using shorter text.",
        );
      }

      onNext(parsed.map((c) => makeDraft(c.question, c.answer)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="amc-ai">
      <textarea
        className="amc-ai-textarea"
        placeholder={`Paste notes, a topic description, or any text related to "${deck.name}"…`}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          if (error) setError("");
        }}
        rows={6}
        disabled={loading}
      />
      <div className="amc-ai-settings">
        <label className="amc-setting">
          <span>Cards</span>
          <select
            className="amc-select"
            value={quantity}
            onChange={(e) => setQuantity(parseInt(e.target.value, 10))}
            disabled={loading}
          >
            {[3, 5, 8, 10, 15].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
        <label className="amc-setting">
          <span>Difficulty</span>
          <select
            className="amc-select"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as Difficulty)}
            disabled={loading}
          >
            <option value="basic">Basic</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </label>
      </div>
      {error && <p className="amc-error">{error}</p>}
      <div className="amc-footer">
        <button
          className="amc-btn-primary"
          type="button"
          onClick={() => void generate()}
          disabled={loading || text.trim().length < 30}
        >
          {loading ? (
            <span className="amc-spinner-row">
              <span className="amc-spinner" /> Generating…
            </span>
          ) : (
            "Generate cards →"
          )}
        </button>
      </div>
    </div>
  );
}

function PdfInput({ deck, onNext }: { deck: Deck; onNext: (cards: DraftCard[]) => void }) {
  const [extractedText, setExtractedText] = useState("");
  const [fileName, setFileName] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setExtracting(true);
    setError("");
    setFileName(file.name);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetchWithSupabaseAuth("/api/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Extraction failed.");
      setExtractedText((data.text as string) || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read file.");
    } finally {
      setExtracting(false);
    }
  }

  if (extractedText) {
    return <AiInput deck={deck} onNext={onNext} fromText={extractedText} />;
  }

  return (
    <div className="amc-pdf">
      <div
        className="amc-drop-zone"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files[0];
          if (file) void handleFile(file);
        }}
      >
        {extracting ? (
          <span className="amc-spinner-row">
            <span className="amc-spinner" /> Reading {fileName}…
          </span>
        ) : (
          <>
            <span className="amc-drop-icon">📄</span>
            <p className="amc-drop-label">Drop a PDF, DOCX or image here</p>
            <p className="amc-drop-sub">or click to browse</p>
          </>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.doc,.txt,.png,.jpg,.jpeg,.webp"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
      {error && <p className="amc-error">{error}</p>}
    </div>
  );
}

function ReviewCards({
  deck,
  drafts: initialDrafts,
  onBack,
  onSave,
}: {
  deck: Deck;
  drafts: DraftCard[];
  onBack: () => void;
  onSave: (cards: Array<{ question: string; answer: string }>) => Promise<void>;
}) {
  const [drafts, setDrafts] = useState(() => checkDuplicates(initialDrafts, deck.cards));
  const [saving, setSaving] = useState(false);

  function toggle(id: string) {
    setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, keep: !d.keep } : d)));
  }

  function edit(id: string, field: "question" | "answer", value: string) {
    setDrafts((prev) =>
      prev.map((d) => {
        if (d.id !== id) return d;
        const updated = { ...d, [field]: value };
        // Re-check duplicate status when question changes
        if (field === "question") {
          updated.isDuplicate = deck.cards.some(
            (c) => normalize(c.question) === normalize(value),
          );
        }
        return updated;
      }),
    );
  }

  async function handleSave() {
    const toSave = drafts
      .filter((d) => d.keep && !d.isDuplicate && d.question.trim() && d.answer.trim())
      .map((d) => ({ question: d.question.trim(), answer: d.answer.trim() }));
    if (toSave.length === 0) return;
    setSaving(true);
    await onSave(toSave);
    setSaving(false);
  }

  const toAdd = drafts.filter((d) => d.keep && !d.isDuplicate).length;
  const dupeCount = drafts.filter((d) => d.isDuplicate).length;

  return (
    <div className="amc-review">
      {dupeCount > 0 && (
        <div className="amc-dupe-banner">
          ⚠ {dupeCount} card{dupeCount > 1 ? "s" : ""} already exist in this deck and will be skipped.
        </div>
      )}
      <div className="amc-review-list">
        {drafts.map((d) => (
          <div
            key={d.id}
            className={`amc-review-card${d.isDuplicate ? " amc-review-card--dupe" : ""}${!d.keep ? " amc-review-card--off" : ""}`}
          >
            <div className="amc-review-card-top">
              <input
                type="checkbox"
                className="amc-checkbox"
                checked={d.keep && !d.isDuplicate}
                disabled={d.isDuplicate}
                onChange={() => toggle(d.id)}
              />
              {d.isDuplicate && (
                <span className="amc-dupe-tag">duplicate</span>
              )}
            </div>
            <textarea
              className="amc-review-field"
              value={d.question}
              onChange={(e) => edit(d.id, "question", e.target.value)}
              placeholder="Question"
              rows={2}
              disabled={d.isDuplicate}
            />
            <textarea
              className="amc-review-field amc-review-field--answer"
              value={d.answer}
              onChange={(e) => edit(d.id, "answer", e.target.value)}
              placeholder="Answer"
              rows={2}
              disabled={d.isDuplicate}
            />
          </div>
        ))}
      </div>
      <div className="amc-footer amc-footer--review">
        <button className="amc-btn-ghost" type="button" onClick={onBack}>
          ← Back
        </button>
        <button
          className="amc-btn-primary"
          type="button"
          onClick={() => void handleSave()}
          disabled={toAdd === 0 || saving}
        >
          {saving ? "Saving…" : `Add ${toAdd} card${toAdd !== 1 ? "s" : ""} to deck`}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main modal
// ─────────────────────────────────────────────

export default function AddMoreCards({ deck, onClose, onSave }: Props) {
  const [stage, setStage] = useState<Stage>("choose");
  const [drafts, setDrafts] = useState<DraftCard[]>([]);
  const [added, setAdded] = useState(0);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSave(cards: Array<{ question: string; answer: string }>) {
    await onSave(cards);
    setAdded(cards.length);
    // Show success briefly, then close
    setTimeout(() => onClose(), 1400);
  }

  function toReview(cards: DraftCard[]) {
    setDrafts(cards);
    setStage("review");
  }

  const titleMap: Record<Stage, string> = {
    choose: "Add flashcards",
    manual: "Write manually",
    ai: "Generate with AI",
    pdf: "Generate from file",
    review: "Review cards",
  };

  return (
    <>
      {/* Backdrop */}
      <div className="amc-backdrop" onClick={onClose} aria-hidden="true" />

      {/* Panel */}
      <div className="amc-panel" role="dialog" aria-modal="true">
        {/* Header */}
        <div className="amc-header">
          <div className="amc-header-left">
            {stage !== "choose" && added === 0 && (
              <button
                className="amc-back"
                type="button"
                onClick={() => setStage(stage === "review" ? "choose" : "choose")}
                aria-label="Back"
              >
                ←
              </button>
            )}
            <div>
              <h2 className="amc-title">{titleMap[stage]}</h2>
              <p className="amc-deck-name">📚 {deck.name} · {deck.cards.length} cards</p>
            </div>
          </div>
          <button className="amc-close" type="button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        {/* Body */}
        <div className="amc-body">
          {added > 0 ? (
            <div className="amc-success">
              <span className="amc-success-icon">🎉</span>
              <p className="amc-success-text">
                {added} card{added !== 1 ? "s" : ""} added to <strong>{deck.name}</strong>!
              </p>
            </div>
          ) : stage === "choose" ? (
            <ChooseMode onChoose={(m) => setStage(m)} />
          ) : stage === "manual" ? (
            <ManualInput onNext={toReview} />
          ) : stage === "ai" ? (
            <AiInput deck={deck} onNext={toReview} />
          ) : stage === "pdf" ? (
            <PdfInput deck={deck} onNext={toReview} />
          ) : (
            <ReviewCards
              deck={deck}
              drafts={drafts}
              onBack={() => setStage("choose")}
              onSave={handleSave}
            />
          )}
        </div>
      </div>
    </>
  );
}
