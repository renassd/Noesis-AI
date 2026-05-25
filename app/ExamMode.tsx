"use client";

import { useEffect, useState } from "react";
import "./exam-mode.css";
import { useLang } from "./i18n";
import type { Deck } from "./types";

type ExamType = "multiple-choice" | "written";
type Phase = "setup" | "exam" | "grading" | "results";

interface ExamQuestion {
  id: string;
  question: string;
  correctAnswer: string;
  options?: string[];
  correctOptionIndex?: number;
}

interface QuestionResult {
  question: string;
  correctAnswer: string;
  userAnswer: string;
  correct?: boolean;
  score?: number;
  feedback?: string;
}

interface Props {
  deck: Deck | null;
  decks: Deck[];
  onSelectDeck: (deck: Deck) => void;
}

const OPTION_LABELS = ["A", "B", "C", "D"];
const MIN_MCQ_CARDS = 4;

export default function ExamMode({ deck, decks, onSelectDeck }: Props) {
  const { t, lang } = useLang();
  const s = t.exam;

  const [phase, setPhase] = useState<Phase>("setup");
  const [examType, setExamType] = useState<ExamType>("multiple-choice");
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [results, setResults] = useState<QuestionResult[]>([]);
  const [grading, setGrading] = useState(false);
  const [gradingError, setGradingError] = useState<string | null>(null);

  useEffect(() => {
    setPhase("setup");
    setQuestions([]);
    setAnswers({});
    setResults([]);
    setGradingError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deck?.id]);

  if (!deck) {
    if (decks.length === 0) {
      return (
        <div className="ws-panel ws-panel-centered">
          <div className="study-empty">
            <h2 className="study-empty-title">{s.noDecksTitle}</h2>
            <p className="study-empty-sub">{s.noDecksDesc}</p>
          </div>
        </div>
      );
    }
    return (
      <div className="ws-panel">
        <div className="ws-panel-header">
          <h2 className="ws-panel-title">{s.pickDeckTitle}</h2>
          <p className="ws-panel-sub">{s.pickDeckDesc}</p>
        </div>
        <div className="study-deck-picker">
          {decks.map((d) => (
            <button key={d.id} className="study-deck-option" onClick={() => onSelectDeck(d)} type="button">
              <div>
                <strong>{d.name}</strong>
                <span>{d.cards.length} {d.cards.length === 1 ? t.study.deckCard : t.study.deckCards}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  function generateMCQ(count: number): ExamQuestion[] {
    const cards = [...deck!.cards].sort(() => Math.random() - 0.5).slice(0, count);
    return cards.map((card) => {
      const others = deck!.cards.filter((c) => c.id !== card.id);
      const distractors = [...others]
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map((c) => c.answer);
      while (distractors.length < 3) distractors.push("—");

      const shuffled = [{ text: card.answer, correct: true }, ...distractors.map((d) => ({ text: d, correct: false }))]
        .sort(() => Math.random() - 0.5);

      return {
        id: card.id,
        question: card.question,
        correctAnswer: card.answer,
        options: shuffled.map((o) => o.text),
        correctOptionIndex: shuffled.findIndex((o) => o.correct),
      };
    });
  }

  function generateWritten(count: number): ExamQuestion[] {
    return [...deck!.cards]
      .sort(() => Math.random() - 0.5)
      .slice(0, count)
      .map((card) => ({ id: card.id, question: card.question, correctAnswer: card.answer }));
  }

  const effectiveCount = Math.min(questionCount, deck.cards.length);

  function startExam() {
    const qs = examType === "multiple-choice" ? generateMCQ(effectiveCount) : generateWritten(effectiveCount);
    setQuestions(qs);
    setCurrentQ(0);
    setAnswers({});
    setResults([]);
    setGradingError(null);
    setPhase("exam");
  }

  async function submitExam() {
    if (examType === "multiple-choice") {
      setResults(
        questions.map((q) => ({
          question: q.question,
          correctAnswer: q.correctAnswer,
          userAnswer: answers[q.id] ?? "",
          correct: answers[q.id] === q.correctAnswer,
        })),
      );
      setPhase("results");
      return;
    }

    setGrading(true);
    setPhase("grading");
    setGradingError(null);

    try {
      const gradingItems = questions.map((q) => ({
        question: q.question,
        expectedAnswer: q.correctAnswer,
        userAnswer: answers[q.id] ?? "",
      }));

      const systemPrompt =
        lang === "es"
          ? `Eres un corrector de examenes academicos. Se te dan pares de (pregunta, respuesta esperada, respuesta del estudiante). Evalua cada respuesta del 0 al 100 y da un feedback conciso de 1-2 oraciones. Se justo: acepta respuestas correctas aunque esten redactadas distinto. Devuelve UNICAMENTE este JSON sin texto adicional:\n{"results":[{"score":85,"feedback":"Texto del feedback"}]}`
          : `You are an academic exam grader. You receive (question, expected answer, student answer) triples. Grade each answer 0-100 and give concise 1-2 sentence feedback. Be fair: accept correct answers even if worded differently. Return ONLY this JSON with no additional text:\n{"results":[{"score":85,"feedback":"Feedback text"}]}`;

      const resp = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: systemPrompt,
          messages: [{ role: "user", content: JSON.stringify(gradingItems, null, 2) }],
          max_tokens: 2000,
        }),
      });

      if (!resp.ok) {
        const err = (await resp.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? "Grading request failed");
      }

      const data = (await resp.json()) as { text?: string; error?: string };
      if (!data.text) throw new Error("Empty response from AI");

      let gradingResults: Array<{ score: number; feedback: string }> = [];
      try {
        const parsed = JSON.parse(data.text) as { results: Array<{ score: number; feedback: string }> };
        gradingResults = parsed.results;
      } catch {
        const match = data.text.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]) as { results: Array<{ score: number; feedback: string }> };
          gradingResults = parsed.results;
        }
      }

      setResults(
        questions.map((q, i) => ({
          question: q.question,
          correctAnswer: q.correctAnswer,
          userAnswer: answers[q.id] ?? "",
          score: gradingResults[i]?.score ?? 0,
          feedback: gradingResults[i]?.feedback,
        })),
      );
      setPhase("results");
    } catch (err) {
      setGradingError(err instanceof Error ? err.message : "Grading failed");
      setResults(
        questions.map((q) => ({
          question: q.question,
          correctAnswer: q.correctAnswer,
          userAnswer: answers[q.id] ?? "",
        })),
      );
      setPhase("results");
    } finally {
      setGrading(false);
    }
  }

  function reset() {
    setPhase("setup");
    setQuestions([]);
    setAnswers({});
    setResults([]);
    setGradingError(null);
  }

  /* ── Grading screen ─────────────────────────────────── */
  if (phase === "grading") {
    return (
      <div className="ws-panel ws-panel-centered">
        <div className="exam-grading">
          <div className="exam-grading-spinner" aria-hidden="true" />
          <p className="exam-grading-text">{s.grading}</p>
        </div>
      </div>
    );
  }

  /* ── Results screen ─────────────────────────────────── */
  if (phase === "results") {
    const isWritten = examType === "written";
    const correctCount = results.filter((r) => r.correct === true).length;
    const avgScore = isWritten
      ? Math.round(results.reduce((sum, r) => sum + (r.score ?? 0), 0) / Math.max(results.length, 1))
      : Math.round((correctCount / Math.max(results.length, 1)) * 100);
    const scoreColor = avgScore >= 70 ? "good" : avgScore >= 50 ? "ok" : "low";

    return (
      <div className="ws-panel">
        <div className="ws-panel-header">
          <h2 className="ws-panel-title">{s.resultsTitle}</h2>
          <p className="ws-panel-sub">{deck.name}</p>
        </div>

        {gradingError && <div className="exam-grading-error">{s.gradingError}</div>}

        <div className={`exam-score-banner exam-score-${scoreColor}`}>
          <span className="exam-score-value">{avgScore}%</span>
          <span className="exam-score-label">
            {isWritten
              ? s.avgScore
              : s.correctCount
                  .replace("{correct}", String(correctCount))
                  .replace("{total}", String(results.length))}
          </span>
        </div>

        <div className="exam-results-list">
          {results.map((r, i) => {
            const itemClass = isWritten
              ? r.score !== undefined
                ? r.score >= 70
                  ? " correct"
                  : r.score >= 40
                    ? " partial"
                    : " wrong"
                : ""
              : r.correct
                ? " correct"
                : " wrong";

            return (
              <div key={i} className={`exam-result-item${itemClass}`}>
                <div className="exam-result-qnum">{i + 1}</div>
                <div className="exam-result-body">
                  <p className="exam-result-question">{r.question}</p>
                  <div className="exam-result-answers">
                    <div className="exam-result-answer">
                      <span className="exam-result-label">{s.yourAnswer}</span>
                      <span className="exam-result-text">{r.userAnswer || s.noAnswer}</span>
                    </div>
                    {(!r.correct || isWritten) && (
                      <div className="exam-result-answer">
                        <span className="exam-result-label">{s.expectedAnswer}</span>
                        <span className="exam-result-text">{r.correctAnswer}</span>
                      </div>
                    )}
                  </div>
                  {isWritten && r.score !== undefined ? (
                    <div className="exam-result-meta">
                      <span className="exam-result-score">{r.score}/100</span>
                      {r.feedback && <span className="exam-result-feedback">{r.feedback}</span>}
                    </div>
                  ) : !isWritten ? (
                    <div className={`exam-result-badge ${r.correct ? "correct" : "wrong"}`}>
                      {r.correct ? s.correct : s.incorrect}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        <div className="exam-results-actions">
          <button className="study-restart-btn" onClick={reset} type="button">
            {s.tryAgain}
          </button>
        </div>
      </div>
    );
  }

  /* ── Exam screen ────────────────────────────────────── */
  if (phase === "exam") {
    const q = questions[currentQ];
    if (!q) return null;

    const isLast = currentQ === questions.length - 1;
    const allAnswered = questions.every((qq) => !!answers[qq.id]);
    const unansweredCount = questions.filter((qq) => !answers[qq.id]).length;
    const progress = ((questions.length - unansweredCount) / questions.length) * 100;

    return (
      <div className="ws-panel">
        <div className="ws-panel-header">
          <div>
            <h2 className="ws-panel-title">{deck.name}</h2>
            <p className="ws-panel-sub">
              {s.questionOf
                .replace("{current}", String(currentQ + 1))
                .replace("{total}", String(questions.length))}
              {" · "}
              {examType === "multiple-choice" ? s.typeMCQShort : s.typeWrittenShort}
            </p>
          </div>
          <div className="study-header-actions">
            <div className="study-deck-picker-inline">
              <select
                className="study-deck-select"
                value={deck.id}
                onChange={(e) => {
                  const d = decks.find((d) => d.id === e.target.value);
                  if (d) { onSelectDeck(d); reset(); }
                }}
              >
                {decks.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="study-progress-bar">
          <div className="study-progress-fill" style={{ width: `${progress}%` }} />
        </div>

        <div className="exam-stage">
          <div className="exam-question-text">{q.question}</div>

          {examType === "multiple-choice" && q.options && (
            <div className="exam-options">
              {q.options.map((opt, i) => (
                <button
                  key={i}
                  className={`exam-option${answers[q.id] === opt ? " selected" : ""}`}
                  onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                  type="button"
                >
                  <span className="exam-option-label">{OPTION_LABELS[i]}</span>
                  <span className="exam-option-text">{opt}</span>
                </button>
              ))}
            </div>
          )}

          {examType === "written" && (
            <textarea
              className="exam-textarea"
              placeholder={s.writtenPlaceholder}
              value={answers[q.id] ?? ""}
              onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
              rows={5}
            />
          )}
        </div>

        <div className="exam-nav">
          <button
            className="exam-nav-btn"
            onClick={() => setCurrentQ((n) => n - 1)}
            disabled={currentQ === 0}
            type="button"
          >
            {s.prev}
          </button>

          {!isLast ? (
            <button
              className="exam-nav-btn exam-nav-next"
              onClick={() => setCurrentQ((n) => n + 1)}
              type="button"
            >
              {s.next}
            </button>
          ) : (
            <button
              className="exam-nav-btn exam-nav-submit"
              onClick={() => void submitExam()}
              disabled={!allAnswered || grading}
              type="button"
            >
              {s.submit}
            </button>
          )}
        </div>

        {isLast && !allAnswered && (
          <p className="exam-incomplete-hint">
            {s.incompleteHint.replace("{n}", String(unansweredCount))}
          </p>
        )}
      </div>
    );
  }

  /* ── Setup screen ───────────────────────────────────── */
  const mcqDisabled = examType === "multiple-choice" && deck.cards.length < MIN_MCQ_CARDS;
  const countOptions = [5, 10, 15].filter((n) => n < deck.cards.length);

  return (
    <div className="ws-panel">
      <div className="ws-panel-header">
        <div>
          <h2 className="ws-panel-title">{s.title}</h2>
          <p className="ws-panel-sub">{s.desc}</p>
        </div>
        <div className="study-header-actions">
          <div className="study-deck-picker-inline">
            <select
              className="study-deck-select"
              value={deck.id}
              onChange={(e) => {
                const d = decks.find((d) => d.id === e.target.value);
                if (d) onSelectDeck(d);
              }}
            >
              {decks.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="exam-setup">
        <div className="exam-setup-section">
          <label className="exam-setup-label">{s.typeLabel}</label>
          <div className="exam-type-grid">
            <button
              type="button"
              className={`exam-type-card${examType === "multiple-choice" ? " selected" : ""}`}
              onClick={() => setExamType("multiple-choice")}
            >
              <span className="exam-type-icon" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <circle cx="5" cy="6" r="1.5" stroke="currentColor" strokeWidth="1.4" />
                  <path d="M8.5 6h7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  <circle cx="5" cy="10" r="1.5" stroke="currentColor" strokeWidth="1.4" />
                  <path d="M8.5 10h7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  <circle cx="5" cy="14" r="1.5" stroke="currentColor" strokeWidth="1.4" />
                  <path d="M8.5 14h7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
              </span>
              <div className="exam-type-card-body">
                <strong>{s.typeMCQ}</strong>
                <span>{s.typeMCQDesc}</span>
              </div>
            </button>
            <button
              type="button"
              className={`exam-type-card${examType === "written" ? " selected" : ""}`}
              onClick={() => setExamType("written")}
            >
              <span className="exam-type-icon" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <rect x="3" y="3" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.4" />
                  <path d="M6 7h8M6 10h8M6 13h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
              </span>
              <div className="exam-type-card-body">
                <strong>{s.typeWritten}</strong>
                <span>{s.typeWrittenDesc}</span>
              </div>
            </button>
          </div>
          {mcqDisabled && <p className="exam-mcq-warning">{s.mcqMinWarning}</p>}
        </div>

        <div className="exam-setup-section">
          <label className="exam-setup-label">{s.countLabel}</label>
          <div className="exam-count-pills">
            {countOptions.map((n) => (
              <button
                key={n}
                type="button"
                className={`exam-count-pill${questionCount === n ? " selected" : ""}`}
                onClick={() => setQuestionCount(n)}
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              className={`exam-count-pill${questionCount === deck.cards.length ? " selected" : ""}`}
              onClick={() => setQuestionCount(deck.cards.length)}
            >
              {s.allCards.replace("{n}", String(deck.cards.length))}
            </button>
          </div>
        </div>

        <button
          className="exam-start-btn"
          type="button"
          onClick={startExam}
          disabled={mcqDisabled || deck.cards.length === 0}
        >
          {s.start}
        </button>
      </div>
    </div>
  );
}
