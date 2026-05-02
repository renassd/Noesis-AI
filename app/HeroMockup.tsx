"use client";

import { useEffect, useRef, useState } from "react";

/* ─── Flashcard content (bilingual) ─────────────────────────── */
const CARDS = {
  en: [
    {
      q:   "What is the forgetting curve?",
      src: "cognitive_science.pdf · p.12",
    },
    {
      q:   "How does spaced repetition work?",
      src: "learning_theory.pdf · p.8",
    },
    {
      q:   "What triggers long-term memory consolidation?",
      src: "neuroscience_notes.pdf · p.31",
    },
    {
      q:   "Define active recall and its benefits.",
      src: "study_methods.pdf · p.4",
    },
  ],
  es: [
    {
      q:   "¿Qué es la curva del olvido?",
      src: "ciencias_cognitivas.pdf · p.12",
    },
    {
      q:   "¿Cómo funciona la repetición espaciada?",
      src: "teoría_aprendizaje.pdf · p.8",
    },
    {
      q:   "¿Qué desencadena la consolidación de la memoria a largo plazo?",
      src: "apuntes_neurociencia.pdf · p.31",
    },
    {
      q:   "Definí el recuerdo activo y sus beneficios.",
      src: "métodos_estudio.pdf · p.4",
    },
  ],
} as const;

/* ─── Document text lines configuration ─────────────────────── */
const DOC_LINES = [
  { type: "line", width: "full"  },
  { type: "line", width: "mid"   },
  { type: "hl",   width: "wide"  },
  { type: "line", width: "full"  },
  { type: "line", width: "short" },
  { type: "hl",   width: "med"   },
  { type: "line", width: "full"  },
  { type: "line", width: "mid"   },
  { type: "line", width: "full"  },
  { type: "hl",   width: "wide"  },
  { type: "line", width: "short" },
  { type: "line", width: "full"  },
] as const;

/* ─── Particles ─────────────────────────────────────────────── */
const PARTICLES = [
  { size: 4, left: "18%",  delay: "0s",    dur: "2.8s", color: "rgba(124,58,237,0.6)"  },
  { size: 3, left: "35%",  delay: "0.7s",  dur: "2.2s", color: "rgba(76,215,246,0.5)"  },
  { size: 5, left: "55%",  delay: "1.4s",  dur: "3.1s", color: "rgba(210,187,255,0.5)" },
  { size: 3, left: "72%",  delay: "0.3s",  dur: "2.5s", color: "rgba(59,130,246,0.55)" },
  { size: 4, left: "88%",  delay: "1.1s",  dur: "2.9s", color: "rgba(124,58,237,0.4)"  },
];

/* ════════════════════════════════════════════════════════════════
   COMPONENT
════════════════════════════════════════════════════════════════ */
export function HeroMockup({ lang = "en" }: { lang?: "en" | "es" }) {
  const cards = CARDS[lang] ?? CARDS.en;

  /* Active front card index */
  const [front, setFront] = useState(0);
  /* Track which card is entering (for animation) */
  const [entering, setEntering] = useState<number | null>(null);
  /* Card count animates up */
  const [count, setCount] = useState(1);
  /* Is the mockup visible (for entrance animation) */
  const [visible, setVisible] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  /* Entrance observer */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) { setVisible(true); return; }
    const io = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); io.disconnect(); } },
      { threshold: 0.2 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  /* Card cycling: new card every 2.8 s */
  useEffect(() => {
    if (!visible) return;
    const id = setInterval(() => {
      setEntering((prev) => {
        const next = (front + 1) % cards.length;
        return next;
      });
      setFront((prev) => (prev + 1) % cards.length);
      setCount((c) => Math.min(c + 1, 24));
    }, 2800);
    return () => clearInterval(id);
  }, [visible, front, cards.length]);

  const en = lang === "en";

  return (
    <div
      ref={containerRef}
      className="lp-mockup lp-img-reveal"
      style={{ opacity: visible ? undefined : 0 }}
      aria-hidden="true"
      role="presentation"
    >
      {/* Ambient glow */}
      <div className="lp-mockup-glow" />

      {/* ── Top row ─────────────────────────────────────────────── */}
      <div className="lp-mockup-row-top">

        {/* ── DOCUMENT PANEL ─────────────────────────────────────── */}
        <div className="lp-mock-doc">
          {/* Header */}
          <div className="lp-mock-doc-header">
            <div className="lp-mock-doc-icon">
              {/* PDF icon */}
              <svg width="12" height="14" viewBox="0 0 12 14" fill="none">
                <rect x="0.5" y="0.5" width="11" height="13" rx="1.5" stroke="#f87171" strokeWidth="1"/>
                <path d="M3 5h6M3 7.5h6M3 10h4" stroke="#f87171" strokeWidth="1" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="lp-mock-doc-name">
              {en ? "cognitive_science.pdf" : "ciencias_cognitivas.pdf"}
            </span>
            <span className="lp-mock-doc-page">p.12</span>
          </div>

          {/* Text lines */}
          <div className="lp-mock-doc-body">
            {DOC_LINES.map((line, i) =>
              line.type === "hl" ? (
                <div
                  key={i}
                  className={`lp-mock-highlight lp-mock-highlight--${line.width}`}
                  style={{ animationDelay: `${i * 0.1}s` }}
                />
              ) : (
                <div
                  key={i}
                  className={`lp-mock-line lp-mock-line--${line.width}`}
                />
              )
            )}
            {/* Scanning bar */}
            <div className="lp-mock-scan-bar" />
          </div>

          {/* Processing badge */}
          <div className="lp-mock-processing-badge">
            <span className="lp-mock-processing-dot" />
            {en ? "Reading…" : "Leyendo…"}
          </div>
        </div>

        {/* ── AI COLUMN ──────────────────────────────────────────── */}
        <div className="lp-mock-ai-col">
          <div className="lp-mock-ai-orb">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 2a7 7 0 0 1 7 7c0 2.5-1.3 4.7-3.3 6l-.7 4H9l-.7-4A7 7 0 0 1 5 9a7 7 0 0 1 7-7z"
                stroke="white" strokeWidth="1.8" strokeLinejoin="round" />
              <path d="M9 21h6" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* ── FLASHCARD STACK ─────────────────────────────────────── */}
        <div className="lp-mock-cards-panel">
          {/* Stack */}
          <div className="lp-mock-card-stack">
            {/* Back card 3 — deepest, most rotated */}
            <div className="lp-mock-fc lp-mock-fc--back3" />

            {/* Back card 2 */}
            <div className="lp-mock-fc lp-mock-fc--back2" />

            {/* Back card 1 — shows a faint question from the previous card */}
            <div className="lp-mock-fc lp-mock-fc--back1">
              <div className="lp-mock-fc-q" style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.82rem" }}>
                {cards[(front + cards.length - 1) % cards.length].q}
              </div>
            </div>

            {/* Front card — cycles */}
            <div
              key={front}
              className={`lp-mock-fc lp-mock-fc--front${entering !== null ? " lp-mock-fc--entering" : ""}`}
              onAnimationEnd={() => setEntering(null)}
            >
              {/* Eyebrow */}
              <div className="lp-mock-fc-eyebrow">
                <span className="lp-mock-fc-eyebrow-dot" />
                {en ? "Auto Flashcard" : "Flashcard IA"}
              </div>

              {/* Question */}
              <p className="lp-mock-fc-q">{cards[front].q}</p>

              {/* Source */}
              <div className="lp-mock-fc-source">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"
                    stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round"/>
                  <path d="M14 2v6h6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
                </svg>
                {cards[front].src}
              </div>
            </div>
          </div>

          {/* Deck counter */}
          <div className="lp-mock-deck-counter">
            <span className="lp-mock-deck-label">
              {en ? "Generated" : "Generadas"}
            </span>
            <span className="lp-mock-deck-count">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                <path d="M9 12l2 2 4-4" stroke="#d2bbff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="12" cy="12" r="9" stroke="#d2bbff" strokeWidth="1.5"/>
              </svg>
              {count} {en ? "cards" : "tarjetas"}
            </span>
          </div>
        </div>
      </div>

      {/* ── Status bar ──────────────────────────────────────────── */}
      <div className="lp-mock-status-bar">
        <span className="lp-mock-status-dot" />
        <span className="lp-mock-status-text">
          {en
            ? "Analysing document · generating flashcards from highlighted concepts"
            : "Analizando documento · generando flashcards desde conceptos destacados"}
        </span>
        <span className="lp-mock-status-badge">
          {en ? "Live" : "En vivo"}
        </span>
      </div>

      {/* ── Floating particles ──────────────────────────────────── */}
      {visible && PARTICLES.map((p, i) => (
        <span
          key={i}
          className="lp-mock-particle"
          style={{
            width:  p.size,
            height: p.size,
            left:   p.left,
            bottom: "18%",
            background: p.color,
            animationDelay:    p.delay,
            animationDuration: p.dur,
          }}
        />
      ))}
    </div>
  );
}
