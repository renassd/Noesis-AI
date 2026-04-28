"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import ColorModeToggle from "./ColorModeToggle";
import LangToggle from "./LangToggle";
import { useLang } from "./i18n";
import WorkflowStepCards from "./WorkflowStepCards";
import { AboutCards } from "./AboutCards";
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
  return <ColorModeToggle />;
}


// ── Research mock panel ───────────────────────────────────────────────────────
const RESEARCH_CHIPS = {
  en: ["Upload PDF", "Summarize notes", "Explain simply", "Create flashcards"],
  es: ["Buscar papers", "Resumir texto", "Revisión de literatura", "Estructurar escritura"],
} as const;

const MOCK_RESULT = {
  en: {
    label: "Study flow",
    title: "Memory consolidation in students",
    lines: [
      "Turned uploaded notes into a simple explanation before review.",
      "Highlighted key concepts, definitions and likely exam targets.",
      "Prepared flashcards from the same material without changing tools.",
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
  const chips = lang === "es"
    ? ["Subir PDF", "Resumir apuntes", "Explicar simple", "Crear flashcards"]
    : RESEARCH_CHIPS[lang];
  const result = lang === "es"
    ? {
        label: "Flujo de estudio",
        title: "Consolidacion de memoria en estudiantes",
        lines: [
          "Convirtio apuntes subidos en una explicacion simple antes del repaso.",
          "Destaco conceptos clave, definiciones y posibles focos de examen.",
          "Preparo flashcards desde el mismo material sin cambiar de herramienta.",
        ],
      }
    : {
        label: "Study flow",
        title: "Memory consolidation in students",
        lines: [
          "Turned uploaded notes into a simple explanation before review.",
          "Highlighted key concepts, definitions and likely exam targets.",
          "Prepared flashcards from the same material without changing tools.",
        ],
      };

  return (
    <div className="rmp-shell">
      <div className="rmp-grid-bg" aria-hidden="true" />
      <div className="rmp-topbar">
        <div className="rmp-dots" aria-hidden="true">
          <span /><span /><span />
        </div>
        <span className="rmp-bar-label">{lang === "es" ? "Neuvra AI / estudio" : "Neuvra AI / study"}</span>
        <div className="rmp-status">
          <span className="rmp-status-dot" />
          <span>{lang === "es" ? "Activo" : "Live"}</span>
        </div>
      </div>
      <div className="rmp-input-area">
        <div className="rmp-input-row">
          <svg className="rmp-search-icon" width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M3 2.75H10.5L13 5.25V13.25C13 13.6642 12.6642 14 12.25 14H3.75C3.33579 14 3 13.6642 3 13.25V2.75Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M10.5 2.75V5.25H13" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          </svg>
          <span className="rmp-input-text">
            {lang === "es" ? "Apuntes sobre sueno, memoria y aprendizaje" : "Notes on sleep, memory and learning"}
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
              <span className="rmp-check" aria-hidden="true">+</span>
              <span>{line}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CredibilitySection({
  lang,
  title,
}: {
  lang: "en" | "es";
  title: string;
}) {
  const { ref, visible } = useReveal(0.12, "0px 0px -28px 0px");
  const logos = [
    {
      key: "harvard",
      label: "Harvard University",
      className: "credibility-logo-card--harvard",
      artwork: (
        <div className="credibility-harvard-wordmark" aria-label="Harvard University">
          <span className="credibility-harvard-main">Harvard</span>
          <span className="credibility-harvard-sub">University</span>
        </div>
      ),
    },
    {
      key: "upenn",
      label: "University of Pennsylvania",
      className: "credibility-logo-card--penn",
      artwork: (
        <Image
          src="/upenn-university.png"
          alt="University of Pennsylvania"
          width={640}
          height={320}
          className="credibility-logo-image"
        />
      ),
    },
  ];

  return (
    <section className="credibility-section" ref={ref as React.Ref<HTMLElement>}>
      <div className="wrap">
        <div className={`credibility-shell${visible ? " is-visible" : ""}`}>
          <SectionReveal text={title} as="h2" className="credibility-title" />
          <div className="credibility-grid" aria-label={title}>
            {logos.map((logo, index) => (
              <article
                key={logo.key}
                className={`credibility-logo-card${"className" in logo ? ` ${logo.className}` : ""}`}
                style={{ "--logo-delay": `${120 + index * 90}ms` } as React.CSSProperties}
                aria-label={logo.label}
              >
                <div className="credibility-logo-art">{logo.artwork}</div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function TaglineProductVisual({ lang }: { lang: "en" | "es" }) {
  const cards = lang === "en"
    ? [
        {
          eyebrow: "Flashcard",
          title: "What strengthens long-term memory?",
          body: "Active recall and spaced repetition reinforce retrieval pathways over time.",
        },
        {
          eyebrow: "Tutor",
          title: "Neuvra explains first",
          body: "Clarify the concept, simplify it, then turn it into review-ready prompts.",
        },
        {
          eyebrow: "Deck",
          title: "3 cards generated",
          body: "Definitions, likely exam points and study prompts from the same source.",
        },
      ]
    : [
        {
          eyebrow: "Flashcard",
          title: "¿Qué fortalece la memoria a largo plazo?",
          body: "El recuerdo activo y la repetición espaciada refuerzan la recuperación con el tiempo.",
        },
        {
          eyebrow: "Tutor",
          title: "Neuvra explica primero",
          body: "Aclara la idea, la simplifica y luego la convierte en prompts listos para repasar.",
        },
        {
          eyebrow: "Mazo",
          title: "3 tarjetas generadas",
          body: "Definiciones, focos probables de examen y prompts de estudio desde la misma fuente.",
        },
      ];

  return (
    <FadeReveal as="div" className="tagline-visual" delay={140}>
      <div className="tagline-visual-glow tagline-visual-glow--blue" aria-hidden="true" />
      <div className="tagline-visual-glow tagline-visual-glow--green" aria-hidden="true" />
      <div className="tagline-visual-stage">
        {cards.map((card, index) => (
          <article key={card.title} className={`tagline-floating-card tagline-floating-card--${index + 1}`}>
            <span className="tagline-floating-eyebrow">{card.eyebrow}</span>
            <strong>{card.title}</strong>
            <p>{card.body}</p>
          </article>
        ))}
      </div>
    </FadeReveal>
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
              <Image src="/logo.jpeg" alt="Neuvra AI" width={50} height={50} />
            </span>
            <span className="brand-text">
              <span>Neuvra AI</span>
            </span>
          </a>
          <div className="nav-group">
            <nav className="nav">
              <a href="#workflow-flow">{nav.howItWorks}</a>
              <a
                href="#about"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById("about")?.scrollIntoView({ behavior: "smooth", block: "center" });
                }}
              >{l.whoWeAreTitle}</a>
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
            <div className="workflow-board reveal" id="workflow-flow">
              <div className="workflow-grid">
                <article className="timeline-card">
                  <span className="mini-label">{lang === "en" ? "Flow" : "Flujo"}</span>
                  <WorkflowStepCards
                    steps={[
                      { id: "step-1", number: "01", title: l.step1title, summary: l.step1, detail: lang === "en" ? "Neuvra AI takes your material as-is and turns it into the starting point for understanding and review." : "Neuvra AI toma tu material tal como viene y lo convierte en el punto de partida para entender y repasar." },
                      { id: "step-2", number: "02", title: l.step2title, summary: l.step2, detail: lang === "en" ? "Clarify ideas, context and concepts before trying to memorize, so the study flow starts with real understanding." : "Aclara ideas, contexto y conceptos antes de intentar memorizar, para que el estudio empiece con entendimiento real." },
                      { id: "step-3", number: "03", title: l.step3title, summary: l.step3, detail: lang === "en" ? "Surface definitions, likely exam targets and key concepts so you can focus only on what matters most." : "Destaca definiciones, posibles focos de examen y conceptos clave para que te concentres solo en lo importante." },
                      { id: "step-4", number: "04", title: l.step4title, summary: l.step4, detail: lang === "en" ? "Turn the same source into flashcards and decks without breaking the flow or jumping between tools." : "Transforma la misma fuente en flashcards y mazos sin romper el flujo ni saltar entre herramientas." },
                    ]}
                    hintLabel={lang === "en" ? "Neuvra AI flow" : "Flujo Neuvra AI"}
                    frontActionLabel={lang === "en" ? "Click to see more" : "Click para ver más"}
                    backActionLabel={lang === "en" ? "Back to summary" : "Volver al resumen"}
                    backLabel={lang === "en" ? "Why it helps" : "Lo que aporta"}
                  />
                </article>
                <article className="workflow-card">
                  <div>
                    <span className="mini-label">{lang === "en" ? "Inside Neuvra AI" : "En Neuvra AI"}</span>
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
                {t.pricing.map((card) => {
                  const featured = "featured" in card && card.featured;
                  const badge = "badge" in card ? card.badge : undefined;
                  const cta = "cta" in card ? card.cta : undefined;
                  const period = "period" in card ? card.period : undefined;
                  return (
                    <article
                      key={card.label}
                      className={`compare-card${featured ? " featured" : ""}`}
                    >
                      {badge && <div className="plan-badge">{badge}</div>}
                      <span className="compare-label">{card.label}</span>
                      <div className="price-block">
                        <div className="price">{card.price}</div>
                        {period && <span className="price-period">{period}</span>}
                      </div>
                      <p className="plan-desc">{card.desc}</p>
                      <ul className="plan-features">
                        {card.items.map((item) => <li key={item}>{item}</li>)}
                      </ul>
                      {cta && <button type="button" className="plan-cta">{cta}</button>}
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ══ ABOUT — flashcard section ══ */}
        <section id="about">
          <div className="wrap">
            <AboutCards />
          </div>
        </section>

        {/* ══ TAGLINE — light card section ══ */}
        <section className="tagline-section">
          <div className="wrap">
            <div className="tagline-card reveal">
              <FadeReveal as="div" className="tagline-copy" delay={40}>
              <h2 className="tagline-title">
                {lang === "en" ? (
                  <>Understand first.<br />Remember after.</>
                ) : (
                  <>Entendé primero.<br />Recordá después.</>
                )}
              </h2>
              <p className="tagline-sub">
                {lang === "en"
                  ? "Neuvra connects the research tools you use to understand with the memory tools you use to retain — in a single, focused flow."
                  : "Neuvra conecta las herramientas de investigación que usás para entender con las herramientas de memoria que usás para retener, en un flujo único y enfocado."}
              </p>
              <ul className="tagline-features">
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
              <div className="tagline-actions">
                <button type="button" className="tagline-cta tagline-cta--primary" onClick={openModal}>
                  {l.ctaPrimary}
                </button>
                <a href="#workflow-flow" className="tagline-cta tagline-cta--secondary">
                  {l.ctaSecondary}
                </a>
              </div>
              </FadeReveal>
              <TaglineProductVisual lang={lang} />
            </div>
          </div>
        </section>

        <CredibilitySection lang={lang} title={l.credibilityTitle} />

      </main>

      {/* ══ FOOTER ══ */}
      <footer>
        <div className="wrap">
          <div className="footer-inner">
            <div>
              <div className="footer-brand">
                <div className="footer-brand-mark">
                  <Image src="/logo.jpeg" alt="Neuvra AI" width={36} height={36} />
                </div>
                <span>Neuvra AI</span>
              </div>
              <p className="footer-tagline">{l.footerTagline}</p>
            </div>
            <div className="footer-links-grid">
              <div className="footer-col">
                <h4>{l.footerProduct}</h4>
                <Link href="/investigacion">{t.nav.research}</Link>
                <Link href="/estudio">{t.nav.study}</Link>
                <a href="#workflow-flow">{t.nav.howItWorks}</a>
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
            <span>(c) {new Date().getFullYear()} Neuvra AI. {l.footerRights}</span>
            <div className="footer-social">
              <a href="#" aria-label="WhatsApp" title="WhatsApp">wa</a>
              <a href="#" aria-label="Instagram" title="Instagram">ig</a>
              <a href="mailto:neuvraai@gmail.com" aria-label="Email" title="Email">mail</a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}


