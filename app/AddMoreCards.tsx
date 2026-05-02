"use client";

import { useEffect, useRef, useState } from "react";
import { fetchWithSupabaseAuth } from "@/lib/supabase-browser";
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_MB } from "@/lib/upload-config";
import { useAiUsage } from "@/context/AiUsageContext";
import { useLang } from "./i18n";
import { detectLang, langInstruction } from "./lib/detectLang";
import type { Deck, Flashcard } from "./types";

// ─────────────────────────────────────────────
// Local i18n dict (keeps the main dict clean)
// ─────────────────────────────────────────────

const AMC = {
  en: {
    // Choose mode
    chooseLabel: "How do you want to add them?",
    manualTitle: "Write manually",
    manualSub: "Add your own questions and answers",
    aiTitle: "Generate with AI",
    aiSub: "Paste notes, a topic, or any text",
    pdfTitle: "Generate from file",
    pdfSub: "Upload a PDF, DOCX, or image",
    // Manual input
    question: "Question",
    answer: "Answer",
    questionPlaceholder: "Question…",
    answerPlaceholder: "Answer…",
    removeRow: "Remove row",
    addRow: "+ Add row",
    reviewN: (n: number) => `Review ${n} ${n === 1 ? "card" : "cards"} →`,
    // AI input
    aiPlaceholder: (name: string) => `Paste notes, a topic, or any text related to "${name}"…`,
    aiMinError: "Add at least 30 characters of text or a topic description.",
    aiParseError: "The AI response couldn't be read as flashcards. Try fewer cards or shorter text.",
    aiError: "AI generation failed.",
    generationFailed: "Generation failed.",
    cardsLabel: "Cards",
    difficultyLabel: "Difficulty",
    basic: "Basic",
    intermediate: "Intermediate",
    advanced: "Advanced",
    generating: "Generating…",
    generateBtn: "Generate cards →",
    // PDF input
    dropLabel: "Drop a PDF, DOCX or image here",
    dropSub: "or click to browse",
    reading: (name: string) => `Reading ${name}…`,
    extractError: "Extraction failed.",
    readError: "Could not read file.",
    fileTooLarge: `File exceeds the ${MAX_UPLOAD_MB} MB limit.`,
    // Review
    dupeWarning: (n: number) => `⚠ ${n} ${n === 1 ? "card" : "cards"} already exist in this deck and will be skipped.`,
    duplicate: "duplicate",
    back: "← Back",
    saving: "Saving…",
    addToDecK: (n: number) => `Add ${n} ${n === 1 ? "card" : "cards"} to deck`,
    // Modal
    titleMap: { choose: "Add flashcards", manual: "Write manually", ai: "Generate with AI", pdf: "Generate from file", review: "Review cards" },
    backLabel: "Back",
    closeLabel: "Close",
    deckMeta: (name: string, n: number) => `📚 ${name} · ${n} ${n === 1 ? "card" : "cards"}`,
    successText: (n: number, name: string) => `${n} ${n === 1 ? "card" : "cards"} added to`,
  },
  es: {
    // Choose mode
    chooseLabel: "¿Cómo querés agregarlas?",
    manualTitle: "Escribir manualmente",
    manualSub: "Agregá tus propias preguntas y respuestas",
    aiTitle: "Generar con IA",
    aiSub: "Pegá apuntes, un tema o cualquier texto",
    pdfTitle: "Generar desde archivo",
    pdfSub: "Subí un PDF, DOCX o imagen",
    // Manual input
    question: "Pregunta",
    answer: "Respuesta",
    questionPlaceholder: "Pregunta…",
    answerPlaceholder: "Respuesta…",
    removeRow: "Eliminar fila",
    addRow: "+ Agregar fila",
    reviewN: (n: number) => `Revisar ${n} ${n === 1 ? "tarjeta" : "tarjetas"} →`,
    // AI input
    aiPlaceholder: (name: string) => `Pegá apuntes, un tema o cualquier texto relacionado con "${name}"…`,
    aiMinError: "Agregá al menos 30 caracteres de texto o descripción del tema.",
    aiParseError: "No se pudo leer la respuesta de la IA como flashcards. Probá con menos tarjetas o texto más corto.",
    aiError: "Error al generar con IA.",
    generationFailed: "Error de generación.",
    cardsLabel: "Tarjetas",
    difficultyLabel: "Dificultad",
    basic: "Básico",
    intermediate: "Intermedio",
    advanced: "Avanzado",
    generating: "Generando…",
    generateBtn: "Generar tarjetas →",
    // PDF input
    dropLabel: "Soltá un PDF, DOCX o imagen acá",
    dropSub: "o hacé clic para buscar",
    reading: (name: string) => `Leyendo ${name}…`,
    extractError: "Error al extraer el texto.",
    readError: "No se pudo leer el archivo.",
    fileTooLarge: `El archivo supera el límite de ${MAX_UPLOAD_MB} MB.`,
    // Review
    dupeWarning: (n: number) => `⚠ ${n} ${n === 1 ? "tarjeta ya existe" : "tarjetas ya existen"} en este mazo y serán omitidas.`,
    duplicate: "duplicada",
    back: "← Volver",
    saving: "Guardando…",
    addToDecK: (n: number) => `Agregar ${n} ${n === 1 ? "tarjeta" : "tarjetas"} al mazo`,
    // Modal
    titleMap: { choose: "Agregar tarjetas", manual: "Escribir manualmente", ai: "Generar con IA", pdf: "Generar desde archivo", review: "Revisar tarjetas" },
    backLabel: "Volver",
    closeLabel: "Cerrar",
    deckMeta: (name: string, n: number) => `📚 ${name} · ${n} ${n === 1 ? "tarjeta" : "tarjetas"}`,
    successText: (n: number, name: string) => `${n} ${n === 1 ? "tarjeta agregada a" : "tarjetas agregadas a"}`,
  },
};

type T = typeof AMC.en;

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

  const direct = parseCandidate(cleaned);
  if (direct) return direct;

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

function ChooseMode({ t, onChoose }: { t: T; onChoose: (s: "manual" | "ai" | "pdf") => void }) {
  return (
    <div className="amc-choose">
      <p className="amc-choose-label">{t.chooseLabel}</p>
      <button className="amc-mode-btn" type="button" onClick={() => onChoose("manual")}>
        <span className="amc-mode-icon">✏️</span>
        <span>
          <strong>{t.manualTitle}</strong>
          <span className="amc-mode-sub">{t.manualSub}</span>
        </span>
      </button>
      <button className="amc-mode-btn" type="button" onClick={() => onChoose("ai")}>
        <span className="amc-mode-icon">✨</span>
        <span>
          <strong>{t.aiTitle}</strong>
          <span className="amc-mode-sub">{t.aiSub}</span>
        </span>
      </button>
      <button className="amc-mode-btn" type="button" onClick={() => onChoose("pdf")}>
        <span className="amc-mode-icon">📄</span>
        <span>
          <strong>{t.pdfTitle}</strong>
          <span className="amc-mode-sub">{t.pdfSub}</span>
        </span>
      </button>
    </div>
  );
}

function ManualInput({ t, onNext }: { t: T; onNext: (cards: DraftCard[]) => void }) {
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
        <span className="amc-col-label">{t.question}</span>
        <span className="amc-col-label">{t.answer}</span>
        <span style={{ width: 28 }} />
      </div>
      <div className="amc-rows">
        {rows.map((row, i) => (
          <div key={i} className="amc-row">
            <textarea
              className="amc-cell"
              placeholder={t.questionPlaceholder}
              value={row.q}
              onChange={(e) => update(i, "q", e.target.value)}
              rows={2}
            />
            <textarea
              className="amc-cell"
              placeholder={t.answerPlaceholder}
              value={row.a}
              onChange={(e) => update(i, "a", e.target.value)}
              rows={2}
            />
            <button
              className="amc-row-remove"
              type="button"
              onClick={() => removeRow(i)}
              disabled={rows.length === 1}
              aria-label={t.removeRow}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <button className="amc-add-row-btn" type="button" onClick={addRow}>
        {t.addRow}
      </button>
      <div className="amc-footer">
        <button
          className="amc-btn-primary"
          type="button"
          onClick={handleNext}
          disabled={validCount === 0}
        >
          {t.reviewN(validCount)}
        </button>
      </div>
    </div>
  );
}

function AiInput({
  t,
  deck,
  onNext,
  fromText,
}: {
  t: T;
  deck: Deck;
  onNext: (cards: DraftCard[]) => void;
  fromText?: string;
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
      setError(t.aiMinError);
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
          useMemory: true,
          memoryQuery: deck.name,
        }),
      });
      const data = await res.json();
      applyUsage(data.usage);
      if (!res.ok) throw new Error(data.error || t.aiError);

      const parsed = extractJsonArray(data.text || "");
      if (!parsed || parsed.length === 0) throw new Error(t.aiParseError);

      onNext(parsed.map((c) => makeDraft(c.question, c.answer)));
    } catch (err) {
      setError(err instanceof Error ? err.message : t.generationFailed);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="amc-ai">
      <textarea
        className="amc-ai-textarea"
        placeholder={t.aiPlaceholder(deck.name)}
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
          <span>{t.cardsLabel}</span>
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
          <span>{t.difficultyLabel}</span>
          <select
            className="amc-select"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as Difficulty)}
            disabled={loading}
          >
            <option value="basic">{t.basic}</option>
            <option value="intermediate">{t.intermediate}</option>
            <option value="advanced">{t.advanced}</option>
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
              <span className="amc-spinner" /> {t.generating}
            </span>
          ) : (
            t.generateBtn
          )}
        </button>
      </div>
    </div>
  );
}

function PdfInput({ t, deck, onNext }: { t: T; deck: Deck; onNext: (cards: DraftCard[]) => void }) {
  const [extractedText, setExtractedText] = useState("");
  const [fileName, setFileName] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    // Client-side guard — same limit as the server, surfaces a clear error immediately
    if (file.size > MAX_UPLOAD_BYTES) {
      setError(t.fileTooLarge);
      return;
    }
    setExtracting(true);
    setError("");
    setFileName(file.name);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetchWithSupabaseAuth("/api/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t.extractError);
      setExtractedText((data.text as string) || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : t.readError);
    } finally {
      setExtracting(false);
    }
  }

  if (extractedText) {
    return <AiInput t={t} deck={deck} onNext={onNext} fromText={extractedText} />;
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
            <span className="amc-spinner" /> {t.reading(fileName)}
          </span>
        ) : (
          <>
            <span className="amc-drop-icon">📄</span>
            <p className="amc-drop-label">{t.dropLabel}</p>
            <p className="amc-drop-sub">{t.dropSub}</p>
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
  t,
  deck,
  drafts: initialDrafts,
  onBack,
  onSave,
}: {
  t: T;
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
        <div className="amc-dupe-banner">{t.dupeWarning(dupeCount)}</div>
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
              {d.isDuplicate && <span className="amc-dupe-tag">{t.duplicate}</span>}
            </div>
            <textarea
              className="amc-review-field"
              value={d.question}
              onChange={(e) => edit(d.id, "question", e.target.value)}
              placeholder={t.question}
              rows={2}
              disabled={d.isDuplicate}
            />
            <textarea
              className="amc-review-field amc-review-field--answer"
              value={d.answer}
              onChange={(e) => edit(d.id, "answer", e.target.value)}
              placeholder={t.answer}
              rows={2}
              disabled={d.isDuplicate}
            />
          </div>
        ))}
      </div>
      <div className="amc-footer amc-footer--review">
        <button className="amc-btn-ghost" type="button" onClick={onBack}>
          {t.back}
        </button>
        <button
          className="amc-btn-primary"
          type="button"
          onClick={() => void handleSave()}
          disabled={toAdd === 0 || saving}
        >
          {saving ? t.saving : t.addToDecK(toAdd)}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main modal
// ─────────────────────────────────────────────

export default function AddMoreCards({ deck, onClose, onSave }: Props) {
  const { lang } = useLang();
  const t = AMC[lang] ?? AMC.en;

  const [stage, setStage] = useState<Stage>("choose");
  const [drafts, setDrafts] = useState<DraftCard[]>([]);
  const [added, setAdded] = useState(0);

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
    setTimeout(() => onClose(), 1400);
  }

  function toReview(cards: DraftCard[]) {
    setDrafts(cards);
    setStage("review");
  }

  return (
    <>
      <div className="amc-backdrop" onClick={onClose} aria-hidden="true" />

      <div className="amc-panel" role="dialog" aria-modal="true">
        <div className="amc-header">
          <div className="amc-header-left">
            {stage !== "choose" && added === 0 && (
              <button
                className="amc-back"
                type="button"
                onClick={() => setStage("choose")}
                aria-label={t.backLabel}
              >
                ←
              </button>
            )}
            <div>
              <h2 className="amc-title">{t.titleMap[stage]}</h2>
              <p className="amc-deck-name">{t.deckMeta(deck.name, deck.cards.length)}</p>
            </div>
          </div>
          <button className="amc-close" type="button" onClick={onClose} aria-label={t.closeLabel}>
            ×
          </button>
        </div>

        <div className="amc-body">
          {added > 0 ? (
            <div className="amc-success">
              <span className="amc-success-icon">🎉</span>
              <p className="amc-success-text">
                {t.successText(added, deck.name)} <strong>{deck.name}</strong>!
              </p>
            </div>
          ) : stage === "choose" ? (
            <ChooseMode t={t} onChoose={(m) => setStage(m)} />
          ) : stage === "manual" ? (
            <ManualInput t={t} onNext={toReview} />
          ) : stage === "ai" ? (
            <AiInput t={t} deck={deck} onNext={toReview} />
          ) : stage === "pdf" ? (
            <PdfInput t={t} deck={deck} onNext={toReview} />
          ) : (
            <ReviewCards
              t={t}
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
