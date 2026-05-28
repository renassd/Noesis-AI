"use client";

import { useState, useCallback } from "react";
import { fetchWithSupabaseAuth } from "@/lib/supabase-browser";
import { useAiUsage } from "@/context/AiUsageContext";
import { useLang } from "./i18n";
import { ImportBar, type ImportedTextFile } from "./ImportBar";

// ── Types ──────────────────────────────────────────────────────────────────────

type ExamType = "mcq" | "written" | "mixed";
type Phase = "setup" | "generating" | "exam" | "grading" | "results";

interface MCQQuestion {
  id: string;
  type: "mcq";
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanation?: string;
}

interface WrittenQuestion {
  id: string;
  type: "written";
  question: string;
  modelAnswer?: string;
}

type ExamQuestion = MCQQuestion | WrittenQuestion;

interface WrittenGrade {
  score: number;
  feedback: string;
  correction?: string;
}

// ── Prompt builders ────────────────────────────────────────────────────────────

function buildGenerationPrompt(
  content: string,
  examType: ExamType,
  count: number,
  lang: "es" | "en",
): string {
  const mcqCount =
    examType === "mcq" ? count : examType === "mixed" ? Math.ceil(count / 2) : 0;
  const writtenCount =
    examType === "written" ? count : examType === "mixed" ? Math.floor(count / 2) : 0;

  const typeDesc =
    examType === "mcq"
      ? `${count} multiple choice questions (4 options each, exactly one correct)`
      : examType === "written"
      ? `${count} open-ended written questions`
      : `${mcqCount} multiple choice questions and ${writtenCount} open-ended questions`;

  const langNote =
    lang === "es"
      ? "Write every question, option, and model answer in Spanish."
      : "Write every question, option, and model answer in English.";

  return `You are an exam generator. Generate ${typeDesc} based strictly on the CONTENT below.

${langNote}
Test conceptual understanding — not trivial memorization.

CONTENT:
${content.slice(0, 6000)}

Return ONLY valid JSON — no markdown, no explanation, nothing else:
{
  "questions": [
    {
      "id": "q1",
      "type": "mcq",
      "question": "...",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "explanation": "Brief reason why that option is correct."
    },
    {
      "id": "q2",
      "type": "written",
      "question": "...",
      "modelAnswer": "Concise ideal answer for grading."
    }
  ]
}

Rules:
- correctIndex is 0-based (0 = first option)
- MCQ distractors must be plausible, not obviously wrong
- Written questions require 2-4 sentence answers
- All IDs must be unique strings like "q1", "q2", etc.`;
}

function buildGradingPrompt(
  questions: WrittenQuestion[],
  answers: Record<string, string>,
  lang: "es" | "en",
): string {
  const pairs = questions
    .map(
      (q, i) =>
        `Question ${i + 1} [${q.id}]: ${q.question}\n` +
        `Expected: ${q.modelAnswer ?? "(judge based on content)"}\n` +
        `Student: ${answers[q.id]?.trim() || "(no answer)"}`,
    )
    .join("\n\n");

  const langNote =
    lang === "es" ? "Write all feedback in Spanish." : "Write all feedback in English.";

  return `Grade these student answers. ${langNote}

${pairs}

Return ONLY valid JSON:
{
  "grades": [
    {
      "id": "q1",
      "score": 85,
      "feedback": "...",
      "correction": "A complete answer should include..."
    }
  ]
}

Scoring: 100 = perfect · 70-99 = mostly correct · 40-69 = partial · 0-39 = wrong or blank.`;
}

// ── Parsers ────────────────────────────────────────────────────────────────────

function parseQuestions(raw: string): ExamQuestion[] {
  const clean = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const attempt = (s: string): ExamQuestion[] | null => {
    try {
      const p = JSON.parse(s) as { questions?: ExamQuestion[] };
      if (Array.isArray(p.questions) && p.questions.length > 0) return p.questions;
    } catch { /* */ }
    return null;
  };
  return (
    attempt(clean) ??
    (() => {
      const m = clean.match(/\{[\s\S]*\}/);
      return m ? attempt(m[0]) : null;
    })() ??
    []
  );
}

function parseGrades(
  raw: string,
): Array<{ id: string; score: number; feedback: string; correction?: string }> {
  const clean = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const attempt = (s: string) => {
    try {
      const p = JSON.parse(s) as {
        grades?: Array<{ id: string; score: number; feedback: string; correction?: string }>;
      };
      return p.grades ?? null;
    } catch {
      return null;
    }
  };
  return (
    attempt(clean) ??
    (() => {
      const m = clean.match(/\{[\s\S]*\}/);
      return m ? attempt(m[0]) : null;
    })() ??
    []
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ExamMode() {
  const { lang } = useLang();
  const { usage, loading: usageLoading, applyUsage } = useAiUsage();

  const [phase, setPhase] = useState<Phase>("setup");
  const [content, setContent] = useState("");
  const [attachment, setAttachment] = useState<ImportedTextFile | null>(null);
  const [examType, setExamType] = useState<ExamType>("mcq");
  const [questionCount, setQuestionCount] = useState(10);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [grades, setGrades] = useState<Record<string, WrittenGrade>>({});
  const [error, setError] = useState("");

  // Optimistic while loading — only disable if we *know* credits = 0
  const hasCredits = usageLoading || !usage || (usage.creditsRemaining ?? 0) > 0;

  const handleImportedText = useCallback((file: ImportedTextFile) => {
    setAttachment(file);
    setContent("");
  }, []);

  // ── Generate ───────────────────────────────────────────────────────────────
  async function generateExam() {
    const src = attachment?.content?.trim() || content.trim();
    if (!src || !hasCredits) return;
    setPhase("generating");
    setError("");
    try {
      const res = await fetchWithSupabaseAuth("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system:
            "You are a precise exam generator. Return only valid JSON. No markdown, no extra text.",
          messages: [
            {
              role: "user",
              content: buildGenerationPrompt(src, examType, questionCount, lang),
            },
          ],
          max_tokens: 4000,
        }),
      });
      const data = await res.json();
      applyUsage(data.usage);
      if (!res.ok) {
        setError(
          data.error ||
            (lang === "en" ? "Could not generate exam." : "No se pudo generar el examen."),
        );
        setPhase("setup");
        return;
      }
      const parsed = parseQuestions(data.text ?? "");
      if (parsed.length === 0) {
        setError(
          lang === "en"
            ? "Could not parse questions. Try again."
            : "No se pudieron generar preguntas. Intentá de nuevo.",
        );
        setPhase("setup");
        return;
      }
      setQuestions(parsed);
      setAnswers({});
      setGrades({});
      setPhase("exam");
    } catch {
      setError(
        lang === "en" ? "Network error. Try again." : "Error de red. Intentá de nuevo.",
      );
      setPhase("setup");
    }
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function submitExam() {
    const writtenQs = questions.filter((q): q is WrittenQuestion => q.type === "written");
    if (writtenQs.length === 0) {
      setPhase("results");
      return;
    }
    setPhase("grading");
    try {
      const writtenAnswers: Record<string, string> = {};
      for (const q of writtenQs) writtenAnswers[q.id] = (answers[q.id] as string) ?? "";
      const res = await fetchWithSupabaseAuth("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: "You are a strict but fair exam grader. Return only valid JSON.",
          messages: [
            {
              role: "user",
              content: buildGradingPrompt(writtenQs, writtenAnswers, lang),
            },
          ],
          max_tokens: 2000,
        }),
      });
      const data = await res.json();
      applyUsage(data.usage);
      const parsedGrades = parseGrades(data.text ?? "");
      const map: Record<string, WrittenGrade> = {};
      for (const g of parsedGrades)
        map[g.id] = { score: g.score, feedback: g.feedback, correction: g.correction };
      setGrades(map);
    } catch {
      /* show results without grades */
    }
    setPhase("results");
  }

  function resetExam() {
    setPhase("setup");
    setQuestions([]);
    setAnswers({});
    setGrades({});
    setError("");
    setContent("");
    setAttachment(null);
  }

  function computeScore() {
    let correct = 0;
    const total = questions.length;
    for (const q of questions) {
      if (q.type === "mcq" && answers[q.id] === (q as MCQQuestion).correctIndex) correct++;
      else if (q.type === "written" && (grades[q.id]?.score ?? 0) >= 60) correct++;
    }
    return { correct, total, pct: total > 0 ? Math.round((correct / total) * 100) : 0 };
  }

  // ── Setup ──────────────────────────────────────────────────────────────────
  if (phase === "setup") {
    const src = attachment?.content?.trim() || content.trim();
    const canGenerate = src.length >= 20 && hasCredits;

    return (
      <div className="em2-shell">
        <div className="em2-setup">
          <h2 className="em2-title">
            {lang === "en" ? "Create exam" : "Crear examen"}
          </h2>
          <p className="em2-subtitle">
            {lang === "en"
              ? "Paste notes, upload a document, or type a topic — the AI generates the exam."
              : "Pegá apuntes, subí un documento, o escribí un tema — la IA genera el examen."}
          </p>

          {attachment ? (
            <div className="em2-attachment-chip">
              <span className="em2-attachment-icon" aria-hidden="true">📄</span>
              <span className="em2-attachment-name">{attachment.fileName}</span>
              <button
                type="button"
                className="em2-attachment-remove"
                onClick={() => setAttachment(null)}
                aria-label={lang === "en" ? "Remove file" : "Quitar archivo"}
              >
                ×
              </button>
            </div>
          ) : (
            <textarea
              className="em2-textarea"
              placeholder={
                lang === "en"
                  ? 'Paste your notes, a chapter, an article… or type a topic like "French Revolution"'
                  : 'Pegá tus apuntes, un capítulo, un artículo… o escribí un tema como "Revolución Francesa"'
              }
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={7}
            />
          )}

          <div className="em2-import-row">
            <ImportBar lang={lang} onTextFile={handleImportedText} onImageFile={() => {}} />
            <span className="em2-import-hint">
              {lang === "en" ? "Upload PDF or DOCX" : "Subir PDF o DOCX"}
            </span>
          </div>

          <div className="em2-options-row">
            <div className="em2-option-group">
              <span className="em2-option-label">
                {lang === "en" ? "Type" : "Tipo"}
              </span>
              <div className="em2-chips">
                {(["mcq", "written", "mixed"] as ExamType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`em2-chip${examType === t ? " active" : ""}`}
                    onClick={() => setExamType(t)}
                  >
                    {t === "mcq"
                      ? lang === "en"
                        ? "Multiple choice"
                        : "Múltiple opción"
                      : t === "written"
                      ? lang === "en"
                        ? "Written"
                        : "Abiertas"
                      : lang === "en"
                      ? "Mixed"
                      : "Mixto"}
                  </button>
                ))}
              </div>
            </div>

            <div className="em2-option-group">
              <span className="em2-option-label">
                {lang === "en" ? "Questions" : "Preguntas"}
              </span>
              <div className="em2-chips">
                {[5, 10, 15, 20].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`em2-chip${questionCount === n ? " active" : ""}`}
                    onClick={() => setQuestionCount(n)}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {error && (
            <p className="em2-error" role="alert">
              {error}
            </p>
          )}

          <button
            type="button"
            className={`em2-primary-btn${!canGenerate ? " disabled" : ""}`}
            onClick={generateExam}
            disabled={!canGenerate}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M8 2l1.5 4H14l-3.5 2.5 1.5 4L8 10l-4 2.5 1.5-4L2 6h4.5L8 2z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
            {lang === "en" ? "Generate exam" : "Generar examen"}
          </button>
        </div>
      </div>
    );
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (phase === "generating" || phase === "grading") {
    return (
      <div className="em2-shell">
        <div className="em2-loading-state">
          <div className="em2-spinner" aria-hidden="true" />
          <p className="em2-loading-text">
            {phase === "generating"
              ? lang === "en"
                ? "Generating exam questions…"
                : "Generando preguntas…"
              : lang === "en"
              ? "Grading your answers…"
              : "Corrigiendo respuestas…"}
          </p>
        </div>
      </div>
    );
  }

  // ── Exam ───────────────────────────────────────────────────────────────────
  if (phase === "exam") {
    const answeredCount = questions.filter(
      (q) => answers[q.id] !== undefined && answers[q.id] !== "",
    ).length;
    const allAnswered = answeredCount === questions.length;

    return (
      <div className="em2-shell">
        <div className="em2-exam-topbar">
          <span className="em2-exam-progress">
            {answeredCount}/{questions.length}{" "}
            {lang === "en" ? "answered" : "respondidas"}
          </span>
          <button type="button" className="em2-ghost-btn" onClick={resetExam}>
            {lang === "en" ? "← Back" : "← Volver"}
          </button>
        </div>

        <div className="em2-questions">
          {questions.map((q, i) => (
            <div key={q.id} className="em2-question-card">
              <div className="em2-question-meta">
                <span className="em2-question-num">
                  {lang === "en" ? `Question ${i + 1}` : `Pregunta ${i + 1}`}
                </span>
                <span className="em2-question-type-badge">
                  {q.type === "mcq"
                    ? lang === "en"
                      ? "MCQ"
                      : "Opción múltiple"
                    : lang === "en"
                    ? "Written"
                    : "Abierta"}
                </span>
              </div>
              <p className="em2-question-text">{q.question}</p>

              {q.type === "mcq" && (
                <div className="em2-options">
                  {(q as MCQQuestion).options.map((opt, j) => (
                    <button
                      key={j}
                      type="button"
                      className={`em2-option${answers[q.id] === j ? " selected" : ""}`}
                      onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: j }))}
                    >
                      <span className="em2-option-letter">{String.fromCharCode(65 + j)}</span>
                      <span className="em2-option-text">{opt}</span>
                    </button>
                  ))}
                </div>
              )}

              {q.type === "written" && (
                <textarea
                  className="em2-written-textarea"
                  placeholder={
                    lang === "en" ? "Write your answer here…" : "Escribí tu respuesta acá…"
                  }
                  value={(answers[q.id] as string) ?? ""}
                  onChange={(e) =>
                    setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                  }
                  rows={3}
                />
              )}
            </div>
          ))}
        </div>

        <div className="em2-exam-footer">
          <button
            type="button"
            className={`em2-primary-btn${!allAnswered ? " disabled" : ""}`}
            onClick={submitExam}
            disabled={!allAnswered}
          >
            {lang === "en" ? "Submit exam" : "Entregar examen"}
          </button>
          {!allAnswered && (
            <p className="em2-footer-hint">
              {lang === "en"
                ? `${questions.length - answeredCount} question(s) remaining`
                : `Faltan ${questions.length - answeredCount} pregunta(s)`}
            </p>
          )}
        </div>
      </div>
    );
  }

  // ── Results ────────────────────────────────────────────────────────────────
  const score = computeScore();
  const passed = score.pct >= 60;

  return (
    <div className="em2-shell">
      <div className={`em2-score-banner${passed ? " pass" : " fail"}`}>
        <span className="em2-score-pct">{score.pct}%</span>
        <span className="em2-score-detail">
          {lang === "en"
            ? `${score.correct} of ${score.total} correct`
            : `${score.correct} de ${score.total} correctas`}
        </span>
        <span className="em2-score-label">
          {passed
            ? lang === "en"
              ? "Great job!"
              : "¡Muy bien!"
            : lang === "en"
            ? "Keep studying"
            : "Seguí estudiando"}
        </span>
      </div>

      <div className="em2-results">
        {questions.map((q, i) => {
          const isMCQ = q.type === "mcq";
          const mcq = q as MCQQuestion;
          const isCorrectMCQ = isMCQ && answers[q.id] === mcq.correctIndex;
          const grade = grades[q.id];
          const isCorrectWritten = !isMCQ && (grade?.score ?? 0) >= 60;
          const isCorrect = isMCQ ? isCorrectMCQ : isCorrectWritten;

          return (
            <div
              key={q.id}
              className={`em2-result-card${isCorrect ? " correct" : " incorrect"}`}
            >
              <div className="em2-result-header">
                <span className="em2-result-num">
                  {lang === "en" ? `Q${i + 1}` : `P${i + 1}`}
                </span>
                <span className={`em2-result-badge${isCorrect ? " correct" : " incorrect"}`}>
                  {isCorrect ? "✓" : "✗"}
                </span>
              </div>

              <p className="em2-result-question">{q.question}</p>

              {isMCQ && (
                <div className="em2-result-mcq">
                  <p
                    className={`em2-result-your-answer${isCorrectMCQ ? " right" : " wrong"}`}
                  >
                    <strong>
                      {lang === "en" ? "Your answer: " : "Tu respuesta: "}
                    </strong>
                    {mcq.options[answers[q.id] as number] ??
                      (lang === "en" ? "(none)" : "(sin responder)")}
                  </p>
                  {!isCorrectMCQ && (
                    <p className="em2-result-correct-answer">
                      <strong>{lang === "en" ? "Correct: " : "Correcta: "}</strong>
                      {mcq.options[mcq.correctIndex]}
                    </p>
                  )}
                  {mcq.explanation && (
                    <p className="em2-result-explanation">{mcq.explanation}</p>
                  )}
                </div>
              )}

              {!isMCQ && (
                <div className="em2-result-written">
                  <p className="em2-result-your-answer">
                    <strong>
                      {lang === "en" ? "Your answer: " : "Tu respuesta: "}
                    </strong>
                    {(answers[q.id] as string) ||
                      (lang === "en" ? "(none)" : "(sin responder)")}
                  </p>
                  {grade && (
                    <>
                      <div className="em2-score-bar-wrap">
                        <div className="em2-score-bar">
                          <div
                            className={`em2-score-bar-fill${grade.score >= 60 ? " good" : " bad"}`}
                            style={{ width: `${grade.score}%` }}
                          />
                        </div>
                        <span className="em2-score-bar-label">{grade.score}/100</span>
                      </div>
                      <p className="em2-result-feedback">{grade.feedback}</p>
                      {grade.correction && (
                        <p className="em2-result-correction">
                          <strong>
                            {lang === "en" ? "Model answer: " : "Respuesta ideal: "}
                          </strong>
                          {grade.correction}
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="em2-results-footer">
        <button type="button" className="em2-primary-btn" onClick={resetExam}>
          {lang === "en" ? "New exam" : "Nuevo examen"}
        </button>
      </div>
    </div>
  );
}
