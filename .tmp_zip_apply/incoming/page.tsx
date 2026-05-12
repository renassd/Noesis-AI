"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import LangToggle from "./LangToggle";
import { useLang } from "./i18n";
import { useTheme } from "./theme/ThemeContext";
import WorkflowStepCards from "./WorkflowStepCards";
import { ImageAccordionPanels } from "@/components/ui/interactive-image-accordion";
import { useAuth } from "@/context/AuthContext";

function useScrollReveal() {
  useEffect(() => {
    const elements = document.querySelectorAll(".reveal");
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }),
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" },
    );
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);
}

function useTopbarScroll() {
  useEffect(() => {
    const topbar = document.querySelector(".topbar");
    const onScroll = () => topbar?.classList.toggle("scrolled", window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
}

function WordReveal({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLHeadingElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.15, rootMargin: "0px 0px -32px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const words = text.split(" ");
  return (
    <h1 ref={ref} className={className} aria-label={text}>
      {words.map((word, i) => (
        <span key={i} style={{ display: "inline" }}>
          <span
            className={`word-reveal-token${visible ? " visible" : ""}`}
            style={{ "--word-i": i } as React.CSSProperties}
            aria-hidden="true"
          >{word}</span>
          {i < words.length - 1 ? " " : null}
        </span>
      ))}
    </h1>
  );
}

function useReveal(threshold = 0.12, rootMargin = "0px 0px -24px 0px") {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); io.disconnect(); } },
      { threshold, rootMargin }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return { ref, visible };
}

function SectionReveal({
  text, as: Tag = "h2", className, style,
}: {
  text: string; as?: "h2" | "h3" | "h4"; className?: string; style?: React.CSSProperties;
}) {
  const { ref, visible } = useReveal(0.1, "0px 0px -20px 0px");
  const words = text.split(" ");
  return (
    <Tag ref={ref as React.Ref<HTMLHeadingElement>} className={className} style={style} aria-label={text}>
      {words.map((word, i) => (
        <span key={i} style={{ display: "inline" }}>
          <span
            className={`section-reveal-token${visible ? " visible" : ""}`}
            style={{ "--word-i": i } as React.CSSProperties}
            aria-hidden="true"
          >{word}</span>
          {i < words.length - 1 ? " " : null}
        </span>
      ))}
    </Tag>
  );
}

function FadeReveal({
  children, as: Tag = "p", className, style, delay = 0,
}: {
  children: React.ReactNode; as?: "p" | "span" | "div"; className?: string;
  style?: React.CSSProperties; delay?: number;
}) {
  const { ref, visible } = useReveal(0.08, "0px 0px -16px 0px");
  return (
    <Tag
      ref={ref as React.Ref<HTMLParagraphElement>}
      className={`fade-reveal-token${visible ? " visible" : ""}${className ? " " + className : ""}`}
      style={{ ...style, "--fade-delay": `${delay}ms` } as React.CSSProperties}
    >
      {children}
    </Tag>
  );
}

function TopbarColorToggle() {
  const { lang } = useLang();
  const { prefs, update } = useTheme();
  const isDark = prefs.colorScheme === "dark";

  return (
    <div
      className="topbar-color-toggle"
      role="group"
      aria-label={lang === "en" ? "Page color" : "Color de página"}
    >
      <button
        type="button"
        className={`topbar-color-option${!isDark ? " active" : ""}`}
        onClick={() => update({ colorScheme: "default" })}
      >
        {lang === "en" ? "White" : "Blanco"}
      </button>
      <button
        type="button"
        className={`topbar-color-option${isDark ? " active" : ""}`}
        onClick={() => update({ colorScheme: "dark" })}
      >
        {lang === "en" ? "Black" : "Negro"}
      </button>
    </div>
  );
}

// ── Email validation — same regex as the API route ────────────────────────────
const EMAIL_RE =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

function isValidEmail(email: string): boolean {
  const trimmed = email.trim();
  if (!trimmed || trimmed.length > 254) return false;
  return EMAIL_RE.test(trimmed);
}

// ── WaitlistForm — real validation + real API submission ──────────────────────
function WaitlistForm() {
  const { lang, t } = useLang();
  const l = t.landing;
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [touched, setTouched] = useState(false);

  // Inline error message copy
  const errCopy = {
    empty: lang === "en" ? "Please enter your email address." : "Ingresá tu dirección de email.",
    invalid: lang === "en"
      ? "That doesn't look like a valid email. Please check and try again."
      : "Ese email no parece válido. Revisalo e intentá de nuevo.",
    server: lang === "en"
      ? "Something went wrong. Please try again in a moment."
      : "Algo salió mal. Intentá de nuevo en un momento.",
  };

  function validate(value: string): string {
    if (!value.trim()) return errCopy.empty;
    if (!isValidEmail(value.trim())) return errCopy.invalid;
    return "";
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setEmail(e.target.value);
    if (touched) {
      // Live feedback once user has already tried to submit
      setError(validate(e.target.value));
    }
  }

  async function submit() {
    setTouched(true);
    const validationError = validate(email);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        // Show server validation error if present, otherwise generic
        if (res.status === 400 && data?.error) {
          setError(errCopy.invalid);
        } else {
          setError(errCopy.server);
        }
        return;
      }

      setDone(true);
    } catch {
      setError(errCopy.server);
    } finally {
      setLoading(false);
    }
  }

  if (done) return <div className="waitlist-success visible">{l.waitlistDone}</div>;

  return (
    <div className="waitlist-form-wrap">
      <div className="waitlist-form">
        <input
          className={`waitlist-input${error ? " waitlist-input--error" : ""}`}
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder={l.waitlistPlaceholder}
          value={email}
          onChange={handleChange}
          onBlur={() => {
            if (email) { setTouched(true); setError(validate(email)); }
          }}
          onKeyDown={(event) => { if (event.key === "Enter") void submit(); }}
          disabled={loading}
          aria-describedby={error ? "waitlist-error" : undefined}
          aria-invalid={!!error}
        />
        <button
          className="waitlist-btn"
          onClick={() => void submit()}
          disabled={loading}
          type="button"
        >
          {loading ? (
            <span className="waitlist-btn-inner">
              <span className="waitlist-spinner" aria-hidden="true" />
              {l.waitlistJoining}
            </span>
          ) : l.waitlistBtn}
        </button>
      </div>

      {/* Error message — animated in */}
      {error && (
        <p
          id="waitlist-error"
          className="waitlist-error-msg"
          role="alert"
          aria-live="polite"
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }}>
            <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M8 4.5v4M8 11v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          {error}
        </p>
      )}

      <p className="waitlist-count">{l.waitlistCount.replace("{n}", "412")}</p>
    </div>
  );
}

// ── Research mock panel ───────────────────────────────────────────────────────
const RESEARCH_CHIPS = {
  en: ["Find papers", "Summarize text", "Literature review", "Structure writing"],
  es: ["Buscar papers", "Resumir texto", "Revisión de literatura", "Estructurar escritura"],
} as const;

const MOCK_RESULT = {
  en: {
    label: "Research output",
    title: "How does sleep affect memory consolidation in students?",
    lines: [
      "Summarized recent findings across cognitive psychology and neuroscience.",
      "Compared classroom studies, lab experiments and conflicting methodologies.",
      "Generated a structured literature review with evidence clusters.",
    ],
  },
  es: {
    label: "Output de investigación",
    title: "¿Cómo afecta el sueño la consolidación de la memoria?",
    lines: [
      "Resumidos hallazgos recientes en psicología cognitiva y neurociencia.",
      "Comparados estudios de aula, experimentos de laboratorio y metodologías.",
      "Generada una revisión de literatura estructurada con clusters de evidencia.",
    ],
  },
} as const;

function ResearchMockPanel({ lang }: { lang: "en" | "es" }) {
  const chips = RESEARCH_CHIPS[lang];
  const result = MOCK_RESULT[lang];

  return (
    <div className="rmp-shell">
      <div className="rmp-grid-bg" aria-hidden="true" />
      <div className="rmp-topbar">
        <div className="rmp-dots" aria-hidden="true">
          <span /><span /><span />
        </div>
        <span className="rmp-bar-label">noesis.ai / investigacion</span>
        <div className="rmp-status">
          <span className="rmp-status-dot" />
          <span>{lang === "es" ? "Activo" : "Live"}</span>
        </div>
      </div>
      <div className="rmp-input-area">
        <div className="rmp-input-row">
          <svg className="rmp-search-icon" width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <span className="rmp-input-text">
            {lang === "es"
              ? "¿Cómo afecta el sueño la memoria en estudiantes?"
              : "How does sleep affect memory consolidation in students?"}
          </span>
          <span className="rmp-cursor" aria-hidden="true" />
        </div>
        <div className="rmp-chips">
          {chips.map((chip, i) => (
            <span key={chip} className="rmp-chip" style={{ "--chip-i": i } as React.CSSProperties}>
              {chip}
            </span>
          ))}
        </div>
      </div>
      <div className="rmp-divider" aria-hidden="true" />
      <div className="rmp-result">
        <div className="rmp-result-header">
          <span className="rmp-result-label">{result.label}</span>
          <span className="rmp-typing-indicator" aria-hidden="true">
            <span /><span /><span />
          </span>
        </div>
        <p className="rmp-result-title">{result.title}</p>
        <div className="rmp-result-lines">
          {result.lines.map((line, i) => (
            <div key={i} className="rmp-result-line" style={{ "--line-i": i } as React.CSSProperties}>
              <span className="rmp-check" aria-hidden="true">✓</span>
              <span>{line}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── WaitlistSection — redesigned premium section ──────────────────────────────
// Replaces the old <section className="waitlist-section"> block.
// Changes vs original:
//   • Two-column layout: copy left, form right (collapses to 1-col on mobile)
//   • "Early access" eyebrow is a distinct pill, not the same as the hero eyebrow
//   • Title split into a large display line + smaller sub-statement
//   • Three trust signals below the form (privacy, no spam, 400+ signups)
//   • Decorative gradient orb (CSS only, no images)
function WaitlistSection({ lang, l }: { lang: "en" | "es"; l: ReturnType<typeof useLang>["t"]["landing"] }) {
  const { ref: sectionRef, visible: sectionVisible } = useReveal(0.08);

  const trustItems =
    lang === "en"
      ? ["No spam, ever.", "Unsubscribe any time.", "400+ researchers already in."]
      : ["Sin spam, nunca.", "Darte de baja cuando quieras.", "400+ investigadores ya dentro."];

  return (
    <section
      className="waitlist-section"
      ref={sectionRef as React.Ref<HTMLElement>}
    >
      <div className="wrap">
        <div className={`waitlist-shell waitlist-shell--split${sectionVisible ? " is-visible" : ""}`}>
          {/* Decorative orb — CSS only */}
          <div className="waitlist-orb" aria-hidden="true" />

          {/* LEFT: copy */}
          <div className="waitlist-copy">
            <span className="waitlist-eyebrow-pill">
              {l.waitlistEyebrow}
            </span>

            <h2 className="waitlist-display-title">
              {lang === "en" ? (
                <>
                  Understand first.<br />
                  Remember after.
                </>
              ) : (
                <>
                  Entendé primero.<br />
                  Recordá después.
                </>
              )}
            </h2>

            <p className="waitlist-statement">
              {lang === "en"
                ? "Neuvra connects the research tools you use to understand with the memory tools you use to retain — in a single, focused flow."
                : "Neuvra conecta las herramientas de investigación que usás para entender con las herramientas de memoria que usás para retener, en un flujo único y enfocado."}
            </p>

            <ul className="waitlist-features">
              {(lang === "en"
                ? ["Literature reviews & paper summaries", "AI flashcards from any material", "Tutor mode for active recall"]
                : ["Revisiones de literatura y resúmenes", "Flashcards con IA desde cualquier material", "Modo tutor para recuerdo activo"]
              ).map((item) => (
                <li key={item}>
                  <span className="waitlist-feature-dot" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* RIGHT: form */}
          <div className="waitlist-form-col">
            <p className="waitlist-form-heading">
              {lang === "en" ? "Get early access" : "Obtené acceso anticipado"}
            </p>
            <p className="waitlist-form-sub">
              {lang === "en"
                ? "We're opening spots in small batches. Leave your email and we'll reach out when yours is ready."
                : "Abrimos acceso en tandas pequeñas. Dejá tu email y te avisamos cuando llegue tu turno."}
            </p>

            <WaitlistForm />

            <ul className="waitlist-trust">
              {trustItems.map((item) => (
                <li key={item}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                    <circle cx="6" cy="6" r="5.25" stroke="currentColor" strokeWidth="1.2"/>
                    <path d="M3.5 6l1.8 1.8L8.5 4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  const { t, lang } = useLang();
  const { auth, openModal, signOut } = useAuth();
  const l = t.landing;
  const nav = t.nav;

  useScrollReveal();
  useTopbarScroll();

  return (
    <>
      {/* ══ TOPBAR ══ */}
      <header className="topbar">
        <div className="wrap">
          <a href="#home" className="brand">
            <span className="brand-mark" aria-hidden="true">
              <Image src="/logo.jpeg" alt="Noesis AI" width={50} height={50} />
            </span>
            <span className="brand-text">
              <span>Noesis AI</span>
            </span>
          </a>
          <div className="nav-group">
            <nav className="nav">
              <a href="#workflow">{nav.howItWorks}</a>
            </nav>
            <div className="topbar-auth">
              {auth.signedIn ? (
                <div className="topbar-user">
                  <span className="topbar-user-avatar">
                    {auth.name ? auth.name[0].toUpperCase() : auth.email[0].toUpperCase()}
                  </span>
                  <span className="topbar-user-email">{auth.email}</span>
                  <button type="button" className="topbar-signout" onClick={signOut}>
                    {lang === "es" ? "Salir" : "Sign out"}
                  </button>
                </div>
              ) : (
                <div className="topbar-auth-btns">
                  <button type="button" className="topbar-signin" onClick={openModal}>
                    {lang === "es" ? "Iniciar sesión" : "Sign in"}
                  </button>
                </div>
              )}
            </div>
            <TopbarColorToggle />
            <LangToggle />
          </div>
        </div>
      </header>

      <main id="home">

        {/* ══ HERO ══ */}
        <section className="hero">
          <div className="wrap">
            <div className="landing-hero-grid reveal">
              <div className="landing-hero-copy">
                <span className="eyebrow">
                  {lang === "es" ? "Plataforma de investigación y estudio con IA" : "AI-powered research and study platform"}
                </span>
                <WordReveal text={l.headline} className="landing-headline" />
                <FadeReveal as="p" className="landing-sub" delay={120}>{l.sub}</FadeReveal>
                <div className="hero-scroll-hint" aria-hidden="true">
                  <span className="hero-scroll-line" />
                  <span className="hero-scroll-label">scroll</span>
                </div>
              </div>
              <div className="landing-proof-cards">
                <div className="landing-proof-card lpc-blue">
                  <span className="lpc-icon">R</span>
                  <strong>{l.proofResearch}</strong>
                  <p>{l.proofResearchDesc}</p>
                </div>
                <div className="landing-proof-card lpc-green">
                  <span className="lpc-icon">S</span>
                  <strong>{l.proofRetention}</strong>
                  <p>{l.proofRetentionDesc}</p>
                </div>
                <div className="landing-proof-card lpc-slate">
                  <span className="lpc-icon">+</span>
                  <strong>{l.proofTool}</strong>
                  <p>{l.proofToolDesc}</p>
                </div>
              </div>
            </div>
            <div className="hero-accordion-strip reveal" id="features">
              <ImageAccordionPanels />
            </div>
          </div>
        </section>

        {/* ══ WORKFLOW ══ */}
        <section id="workflow">
          <div className="wrap">
            <div className="section-header reveal">
              <div>
                <SectionReveal text={l.workflowTitle} />
                <FadeReveal delay={80}>{l.workflowSub}</FadeReveal>
              </div>
            </div>
            <div className="workflow-board reveal">
              <div className="workflow-grid">
                <article className="timeline-card">
                  <span className="mini-label">{lang === "en" ? "Flow" : "Flujo"}</span>
                  <WorkflowStepCards
                    steps={[
                      { id: "step-1", number: "01", title: l.step1title, summary: l.step1, detail: lang === "en" ? "Noesis takes your material as-is and turns it into the starting point for understanding and review." : "Noesis toma tu material tal como viene y lo convierte en el punto de partida para entender y repasar." },
                      { id: "step-2", number: "02", title: l.step2title, summary: l.step2, detail: lang === "en" ? "Clarify ideas, context and concepts before trying to memorize, so the study flow starts with real understanding." : "Aclara ideas, contexto y conceptos antes de intentar memorizar, para que el estudio empiece con entendimiento real." },
                      { id: "step-3", number: "03", title: l.step3title, summary: l.step3, detail: lang === "en" ? "Surface definitions, likely exam targets and key concepts so you can focus only on what matters most." : "Destaca definiciones, posibles focos de examen y conceptos clave para que te concentres solo en lo importante." },
                      { id: "step-4", number: "04", title: l.step4title, summary: l.step4, detail: lang === "en" ? "Turn the same source into flashcards and decks without breaking the flow or jumping between tools." : "Transforma la misma fuente en flashcards y mazos sin romper el flujo ni saltar entre herramientas." },
                    ]}
                    hintLabel={lang === "en" ? "Noesis flow" : "Flujo Noesis"}
                    frontActionLabel={lang === "en" ? "Click to see more" : "Click para ver más"}
                    backActionLabel={lang === "en" ? "Back to summary" : "Volver al resumen"}
                    backLabel={lang === "en" ? "Why it helps" : "Lo que aporta"}
                  />
                </article>
                <article className="workflow-card">
                  <div>
                    <span className="mini-label">{lang === "en" ? "Inside Noesis" : "En Noesis"}</span>
                    <SectionReveal text={l.workflowTitle} as="h3" className="workflow-title" />
                  </div>
                  <ResearchMockPanel lang={lang} />
                </article>
              </div>
            </div>
          </div>
        </section>

        {/* ══ PRICING ══ */}
        <section id="pricing">
          <div className="wrap">
            <div className="pricing-shell reveal">
              <div className="section-header section-tight">
                <div>
                  <SectionReveal text={l.pricingTitle} />
                  <FadeReveal delay={60}>{l.pricingSub}</FadeReveal>
                </div>
              </div>
              <div className="pricing-grid">
                {t.pricing.map((card) => (
                  <article
                    key={card.label}
                    className={`compare-card${"featured" in card && card.featured ? " featured" : ""}`}
                  >
                    <span className="compare-label">{card.label}</span>
                    <div className="price">{card.price}</div>
                    <p>{card.desc}</p>
                    <ul>{card.items.map((item) => <li key={item}>{item}</li>)}</ul>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ══ WAITLIST — redesigned ══ */}
        <WaitlistSection lang={lang} l={l} />

      </main>

      {/* ══ FOOTER ══ */}
      <footer>
        <div className="wrap">
          <div className="footer-inner">
            <div>
              <div className="footer-brand">
                <div className="footer-brand-mark">
                  <Image src="/logo.jpeg" alt="Noesis AI" width={36} height={36} />
                </div>
                <span>Noesis AI</span>
              </div>
              <p className="footer-tagline">{l.footerTagline}</p>
            </div>
            <div className="footer-links-grid">
              <div className="footer-col">
                <h4>{l.footerProduct}</h4>
                <Link href="/investigacion">{t.nav.research}</Link>
                <Link href="/estudio">{t.nav.study}</Link>
                <a href="#workflow">{t.nav.howItWorks}</a>
              </div>
              <div className="footer-col">
                <h4>{l.footerCompany}</h4>
                <a href="#">{l.footerAbout}</a>
                <a href="#">{l.footerBlog}</a>
                <a href="#">{l.footerContact}</a>
              </div>
              <div className="footer-col">
                <h4>{l.footerLegal}</h4>
                <a href="#">{l.footerPrivacy}</a>
                <a href="#">{l.footerTerms}</a>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <span>(c) {new Date().getFullYear()} Noesis AI. {l.footerRights}</span>
            <div className="footer-social">
              <a href="#" aria-label="X">X</a>
              <a href="#" aria-label="LinkedIn">in</a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
