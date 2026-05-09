"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import ColorModeToggle from "./ColorModeToggle";
import LangToggle from "./LangToggle";
import { useLang } from "./i18n";
import { useAuth } from "@/context/AuthContext";
import { useAiUsage } from "@/context/AiUsageContext";
import { HeroMockup } from "./HeroMockup";

/* ── Profile dropdown ───────────────────────────────────────── */
function ProfileDropdown({
  auth, usage, signOut, en, router,
}: {
  auth: { signedIn: true; email: string; name?: string };
  usage: { plan: string } | null;
  signOut: () => void;
  en: boolean;
  router: ReturnType<typeof useRouter>;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const initial = auth.name ? auth.name[0].toUpperCase() : auth.email[0].toUpperCase();
  const displayName = auth.name || auth.email;
  const planLabel = usage?.plan === "pro" ? "Pro" : (en ? "Free" : "Gratis");
  const isPro = usage?.plan === "pro";

  /* Close on outside click or Escape */
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent)   { if (e.key === "Escape") setOpen(false); }
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown",   onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown",   onKey);
    };
  }, [open]);

  const items: Array<{
    icon: string;
    label: string;
    danger?: boolean;
    action: () => void;
    accent?: boolean;
  }> = [
    {
      icon: "upgrade",
      label: en ? "Upgrade plan" : "Mejorar plan",
      accent: !isPro,
      action: () => { setOpen(false); document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" }); },
    },
    {
      icon: "tune",
      label: en ? "Personalization" : "Personalización",
      action: () => { setOpen(false); },
    },
    {
      icon: "person",
      label: en ? "Profile" : "Perfil",
      action: () => { setOpen(false); },
    },
    {
      icon: "settings",
      label: en ? "Settings" : "Configuración",
      action: () => { setOpen(false); },
    },
    {
      icon: "help_outline",
      label: en ? "Help" : "Ayuda",
      action: () => { setOpen(false); },
    },
  ];

  return (
    <div className="pd-root" ref={ref}>
      {/* Trigger — avatar + chevron */}
      <button
        type="button"
        className={`pd-trigger${open ? " pd-trigger--open" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={en ? "Account menu" : "Menú de cuenta"}
      >
        <span className="pd-avatar" aria-hidden="true">{initial}</span>
        <span className="pd-trigger-email">{auth.email}</span>
        <span className="material-symbols-outlined pd-chevron" aria-hidden="true">
          expand_more
        </span>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="pd-panel" role="menu" aria-label={en ? "Account menu" : "Menú de cuenta"}>

          {/* ── User header ── */}
          <div className="pd-header">
            <div className="pd-header-avatar" aria-hidden="true">{initial}</div>
            <div className="pd-header-info">
              <span className="pd-header-name" title={displayName}>{displayName}</span>
              <span className={`pd-header-plan${isPro ? " pd-header-plan--pro" : ""}`}>
                {isPro
                  ? <><span className="material-symbols-outlined" style={{ fontSize: 11 }}>workspace_premium</span>{planLabel}</>
                  : planLabel}
              </span>
            </div>
          </div>

          <div className="pd-divider" aria-hidden="true" />

          {/* ── Menu items ── */}
          <div className="pd-items" role="none">
            {items.map((item) => (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                className={`pd-item${item.accent ? " pd-item--accent" : ""}`}
                onClick={item.action}
              >
                <span className="material-symbols-outlined pd-item-icon" aria-hidden="true">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>

          <div className="pd-divider" aria-hidden="true" />

          {/* ── Sign out ── */}
          <div role="none">
            <button
              type="button"
              role="menuitem"
              className="pd-item pd-item--danger"
              onClick={() => { setOpen(false); signOut(); }}
            >
              <span className="material-symbols-outlined pd-item-icon" aria-hidden="true">logout</span>
              {en ? "Sign out" : "Cerrar sesión"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Scroll hooks ──────────────────────────────────────────── */
function useScrollReveal() {
  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("lp-visible");
          io.unobserve(entry.target);
        }),
      { threshold: 0.08, rootMargin: "0px 0px -32px 0px" },
    );

    if (prefersReduced) {
      document.querySelectorAll(".lp-reveal,.lp-stagger,.lp-img-reveal").forEach(
        (el) => el.classList.add("lp-visible"),
      );
    } else {
      document.querySelectorAll(".lp-reveal,.lp-stagger,.lp-img-reveal").forEach(
        (el) => io.observe(el),
      );
    }
    return () => io.disconnect();
  }, []);
}

function useTopbarScroll() {
  useEffect(() => {
    const bar = document.querySelector(".landing-topbar");
    const onScroll = () => bar?.classList.toggle("scrolled", window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
}

/* ── Word-reveal headline ───────────────────────────────────── */
function WordReveal({ text, className, style }: { text: string; className?: string; style?: React.CSSProperties }) {
  const ref = useRef<HTMLHeadingElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) { setVisible(true); return; }
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); io.disconnect(); } },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const words = text.split(" ");
  return (
    <h1
      ref={ref}
      className={className}
      aria-label={text}
      style={{ display: "flex", flexWrap: "wrap", rowGap: "0.1em", ...style }}
    >
      {words.map((word, i) => (
        <span
          key={i}
          className={`lp-word${visible ? " lp-visible" : ""}`}
          style={{ "--lp-wi": i } as React.CSSProperties}
          aria-hidden="true"
        >
          {word}
        </span>
      ))}
    </h1>
  );
}

/* ── Intersection reveal hook ───────────────────────────────── */
function useReveal() {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); io.disconnect(); } },
      { threshold: 0.08 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return { ref, visible };
}

/* ── FadeReveal wrapper ─────────────────────────────────────── */
function FadeReveal({
  children, as: Tag = "div", className, style, delay = 0,
}: {
  children: React.ReactNode;
  as?: "div" | "p" | "span" | "section";
  className?: string;
  style?: React.CSSProperties;
  delay?: number;
}) {
  const { ref, visible } = useReveal();
  return (
    <Tag
      ref={ref as React.Ref<HTMLDivElement>}
      className={`lp-reveal${visible ? " lp-visible" : ""}${className ? " " + className : ""}`}
      style={{ ...style, transitionDelay: `${delay}ms` } as React.CSSProperties}
    >
      {children}
    </Tag>
  );
}

/* ── Counter stat card ──────────────────────────────────────── */
function StatCard({
  value, suffix, label, color = "white", delay = 0,
}: {
  value: number; suffix: string; label: string; color?: string; delay?: number;
}) {
  const { ref, visible } = useReveal();
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    if (!visible) return;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) { setDisplay(suffix); return; }

    const duration = 1400;
    const start = performance.now();

    function fmt(v: number) {
      if (value >= 1_000_000) return (v / 1_000_000).toFixed(1) + suffix;
      if (value >= 1_000)     return Math.round(v / 1_000) + suffix;
      return Math.round(v) + suffix;
    }

    function tick(now: number) {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(fmt(value * eased));
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [visible, value, suffix]);

  return (
    <div
      ref={ref as React.Ref<HTMLDivElement>}
      className="lp-glass lp-metric-card lp-card-hover"
      style={{ transitionDelay: `${delay}ms` }}
    >
      <span
        className="lp-metric-num"
        style={{ color: color === "primary" ? "var(--lp-primary)" : "#fff" }}
        aria-label={`${value.toLocaleString()} ${label}`}
      >
        {display}
      </span>
      <p className="lp-label" style={{ color: "var(--lp-muted)" }}>{label}</p>
    </div>
  );
}

/* ── Tagline floating cards (product visual) ────────────────── */
function TaglineVisual({ lang }: { lang: "en" | "es" }) {
  const cards = lang === "en"
    ? [
        { eyebrow: "Flashcard", title: "What strengthens long-term memory?", body: "Active recall and spaced repetition reinforce retrieval pathways over time." },
        { eyebrow: "AI Tutor",  title: "Neuvra explains first",             body: "Clarify the concept, simplify it, then turn it into review-ready prompts." },
        { eyebrow: "Deck",      title: "3 cards generated",                 body: "Definitions, exam points and study prompts from the same source." },
      ]
    : [
        { eyebrow: "Flashcard", title: "¿Qué fortalece la memoria a largo plazo?", body: "El recuerdo activo y la repetición espaciada refuerzan la recuperación con el tiempo." },
        { eyebrow: "Tutor IA",  title: "Neuvra explica primero",                   body: "Aclara la idea, la simplifica y luego la convierte en prompts listos para repasar." },
        { eyebrow: "Mazo",      title: "3 tarjetas generadas",                     body: "Definiciones, focos de examen y prompts de estudio desde la misma fuente." },
      ];
  return (
    <FadeReveal className="lp-tagline-visual" delay={120}>
      {cards.map((c, i) => (
        <div key={i} className="lp-glass lp-tagline-float-card">
          <span className="lp-tagline-float-eyebrow">{c.eyebrow}</span>
          <strong style={{ color: "#fff", fontSize: "0.9rem", display: "block", marginBottom: 6 }}>{c.title}</strong>
          <p style={{ fontSize: "0.8rem", color: "var(--lp-muted)", margin: 0, lineHeight: 1.5 }}>{c.body}</p>
        </div>
      ))}
    </FadeReveal>
  );
}

/* ══════════════════════════════════════════════════════════════
   PAGE
══════════════════════════════════════════════════════════════ */
export default function HomePage() {
  const { t, lang } = useLang();
  const { auth, openModal, signOut } = useAuth();
  const { usage } = useAiUsage();
  const l = t.landing;
  const nav = t.nav;
  const aboutHref = lang === "es" ? "/quienes-somos" : "/who-we-are";
  const en = lang === "en";

  useScrollReveal();
  useTopbarScroll();

  const router = useRouter();

  /** CTA handler — redirects authenticated users to Study */
  function handleCta() {
    if (auth.signedIn) {
      router.push("/estudio");
    } else {
      openModal();
    }
  }

  /** Research CTA handler — redirects authenticated users to Research */
  function handleResearchCta() {
    if (auth.signedIn) {
      router.push("/investigacion");
    } else {
      openModal();
    }
  }


  /* Material Symbols font loaded via Google Fonts CDN for icon rendering */
  useEffect(() => {
    if (document.querySelector("#material-symbols-lp")) return;
    const link = document.createElement("link");
    link.id   = "material-symbols-lp";
    link.rel  = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap";
    document.head.appendChild(link);
  }, []);

  return (
    <>
      {/* ══ TOPBAR ═══════════════════════════════════════════════════ */}
      <header className="landing-topbar" role="banner">
        <div className="wrap">
          <a href="#hero" className="lp-brand" aria-label="Neuvra AI — Inicio">
            Neuvra
          </a>

          <nav className="nav" aria-label={en ? "Main navigation" : "Navegación principal"}>
            <a href="#journey"  className="lp-nav-link">{nav.howItWorks}</a>
            <Link href={aboutHref} className="lp-nav-link">{l.whoWeAreTitle}</Link>
            <a href="#pricing"  className="lp-nav-link">{en ? "Pricing" : "Precios"}</a>
          </nav>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {auth.signedIn ? (
              <ProfileDropdown
                auth={auth}
                usage={usage}
                signOut={signOut}
                en={en}
                router={router}
              />
            ) : (
              <button
                type="button"
                className="lp-btn lp-btn--primary lp-btn--nav"
                onClick={openModal}
                aria-label={en ? "Sign in to Neuvra" : "Iniciar sesión en Neuvra"}
              >
                {en ? "Sign in" : "Iniciar sesión"}
              </button>
            )}
            <ColorModeToggle />
            <LangToggle />
          </div>
        </div>
      </header>

      <main id="hero" className="landing-page">

        {/* ══ HERO ═════════════════════════════════════════════════════ */}
        <section className="lp-hero" aria-labelledby="hero-headline">
          <div className="lp-hero-bg-glow" aria-hidden="true" />
          <div className="wrap">
            <div className="lp-hero-grid">

              {/* — copy — */}
              <div>
                <FadeReveal as="div" delay={0}>
                  <span className="lp-eyebrow">{l.eyebrow}</span>
                </FadeReveal>

                <WordReveal
                  text={l.headline}
                  className="lp-h1"
                  style={{ marginTop: 20, marginBottom: 20 } as React.CSSProperties}
                />

                <FadeReveal as="p" className="lp-body" delay={160}
                  style={{ maxWidth: 500, fontSize: "1.1rem" }}>
                  {l.sub}
                </FadeReveal>

                {/* Input → Processing → Mastery flow */}
                <FadeReveal as="div" className="lp-flow-indicator" delay={280}>
                  {[
                    { icon: "upload_file",  label: en ? "Input"      : "Entrada",    active: false, color: "var(--lp-primary)" },
                    { icon: "neurology",    label: en ? "Processing"  : "Procesado",  active: true  },
                    { icon: "psychology",   label: en ? "Mastery"     : "Dominio",    active: false, color: "var(--lp-tertiary)" },
                  ].map((node, i) => (
                    <div key={i} style={{ display: "contents" }}>
                      {i > 0 && (
                        <div
                          className="lp-flow-connector"
                          style={{ background: "var(--lp-grad-cta)" }}
                          aria-hidden="true"
                        />
                      )}
                      <div className="lp-flow-node" aria-hidden="true">
                        <div className={`lp-flow-icon${node.active ? " lp-flow-icon--active lp-pulse-glow" : ""}`}>
                          <span
                            className={`material-symbols-outlined${node.active ? " lp-spin-slow" : ""}`}
                            style={{ fontSize: node.active ? 26 : 22, color: node.active ? "#fff" : node.color }}
                          >
                            {node.icon}
                          </span>
                        </div>
                        <span className="lp-label" style={{ color: node.active ? "var(--lp-primary)" : "var(--lp-muted)" }}>
                          {node.label}
                        </span>
                      </div>
                    </div>
                  ))}
                </FadeReveal>

                <FadeReveal as="div" delay={380} className="lp-hero-cta-wrap">
                  {/* Main CTA buttons */}
                  <div className="lp-hero-cta-row">
                    <button
                      type="button"
                      className="lp-btn lp-btn--primary"
                      onClick={handleCta}
                      aria-label={en ? "Start learning with Neuvra" : "Empezar a aprender con Neuvra"}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }} aria-hidden="true">school</span>
                      {l.ctaPrimary}
                    </button>
                    <button
                      type="button"
                      className="lp-btn lp-btn--research"
                      onClick={handleResearchCta}
                      aria-label={en ? "Start researching with Neuvra" : "Explorar investigación con Neuvra"}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }} aria-hidden="true">search_insights</span>
                      {en ? "Start researching" : "Explorar investigación"}
                    </button>
                  </div>

                  {/* Secondary ghost link */}
                  <a href="#journey" className="lp-btn lp-btn--ghost lp-hero-cta-ghost">
                    {l.ctaSecondary}
                  </a>
                </FadeReveal>
              </div>

              {/* — product mockup (replaces static image) — */}
              <HeroMockup lang={lang} />

            </div>

            {/* Proof cards — Understanding / Synthesis / Memory */}
            <div
              className="lp-stagger"
              style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginTop: 56 }}
              aria-label={en ? "Key pillars" : "Pilares clave"}
            >
              {[
                { icon: "lightbulb",  label: l.proofResearch,  desc: l.proofResearchDesc,  i: 0, color: "var(--lp-primary)"   },
                { icon: "layers",     label: l.proofRetention, desc: l.proofRetentionDesc, i: 1, color: "var(--lp-secondary)" },
                { icon: "memory_alt", label: l.proofTool,      desc: l.proofToolDesc,      i: 2, color: "var(--lp-tertiary)"  },
              ].map((p) => (
                <div
                  key={p.label}
                  className="lp-glass lp-card-hover"
                  style={{ padding: "24px 22px", borderRadius: 16, "--lp-i": p.i } as React.CSSProperties}
                >
                  <span className="material-symbols-outlined" style={{ color: p.color, fontSize: 28, display: "block", marginBottom: 10 }}>{p.icon}</span>
                  <strong className="lp-h3" style={{ fontSize: "1rem", marginBottom: 6, display: "block" }}>{p.label}</strong>
                  <p style={{ fontSize: "0.84rem", color: "var(--lp-muted)", margin: 0, lineHeight: 1.55 }}>{p.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══ METRICS ══════════════════════════════════════════════════ */}
        <section className="lp-section" aria-labelledby="metrics-sr">
          <h2 id="metrics-sr" className="lp-sr-only">{en ? "Neuvra metrics" : "Métricas de Neuvra"}</h2>
          <div className="wrap">
            <div className="lp-metrics-grid">
              <StatCard value={50_000}    suffix="k+" label={en ? "Active Students"        : "Estudiantes Activos"}    color="white"   delay={0}   />
              <StatCard value={1_200_000} suffix="M+" label={en ? "Flashcards Created"      : "Flashcards Creadas"}    color="primary" delay={90}  />
              <StatCard value={800_000}   suffix="k+" label={en ? "Documents Analysed"      : "Documentos Analizados"} color="white"   delay={180} />
            </div>
          </div>
        </section>

        {/* ══ TRUST BELT — affiliation ════════════════════════════════ */}
        <section className="lp-trust-belt" aria-label={en ? "Trusted by" : "Utilizado por"}>
          <div className="wrap">
            <FadeReveal>
              <p className="lp-trust-belt-label">
                {en
                  ? "Chosen by students and researchers from"
                  : "Elegido por estudiantes e investigadores de"}
              </p>

              <div className="lp-trust-logos" role="list">

                {/* ── Harvard University ── */}
                <div className="lp-trust-logo-item" role="listitem" aria-label="Harvard University">
                  <Image
                    src="/logos/harvard.png"
                    alt="Harvard University"
                    width={735} height={234}
                    style={{ height: 72, width: "auto" }}
                    className="lp-trust-img lp-trust-img--harvard"
                  />
                </div>

                <div className="lp-trust-sep" aria-hidden="true" />

                {/* ── University of Pennsylvania ── */}
                <div className="lp-trust-logo-item" role="listitem" aria-label="University of Pennsylvania">
                  <Image
                    src="/logos/upenn.png"
                    alt="University of Pennsylvania shield"
                    width={500} height={432}
                    style={{ height: 72, width: "auto" }}
                    className="lp-trust-img lp-trust-light-only"
                  />
                  <Image
                    src="/logos/upenn-dark.png"
                    alt="University of Pennsylvania shield"
                    width={500} height={432}
                    style={{ height: 72, width: "auto" }}
                    className="lp-trust-img lp-trust-dark-only"
                  />
                  <div className="lp-trust-logo-text">
                    <span className="lp-trust-logo-name">UPENN</span>
                    <span className="lp-trust-logo-sub">UNIVERSITY OF PENNSYLVANIA</span>
                  </div>
                </div>

              </div>
            </FadeReveal>
          </div>
        </section>

        {/* ══ PROBLEM SECTION ══════════════════════════════════════════ */}
        <section className="lp-section lp-section--dim" aria-labelledby="problem-heading">
          <div className="wrap">
            <div className="lp-problem-grid">

              {/* Left — the pain */}
              <FadeReveal>
                <span className="lp-eyebrow" style={{ marginBottom: 20, display: "inline-flex" }}>
                  {en ? "The real problem" : "El problema real"}
                </span>
                <h2 id="problem-heading" className="lp-h2" style={{ marginBottom: 16 }}>
                  {en
                    ? <>The way you study<br /><em style={{ fontStyle: "normal", background: "var(--lp-grad-text)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>is broken.</em></>
                    : <>La forma en que estudiás<br /><em style={{ fontStyle: "normal", background: "var(--lp-grad-text)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>está rota.</em></>}
                </h2>
                <p className="lp-body" style={{ marginBottom: 32, maxWidth: 420 }}>
                  {en
                    ? "Most students read passively, jump between five apps, and still forget everything the night before the exam. That's not a willpower problem — it's a system problem."
                    : "La mayoría lee de forma pasiva, salta entre cinco apps y sigue olvidando todo la noche antes del examen. Eso no es un problema de voluntad — es un problema de sistema."}
                </p>
                <ul className="lp-problem-pain-list" aria-label={en ? "Common study problems" : "Problemas comunes al estudiar"}>
                  {(en
                    ? [
                        { icon: "tab", text: <><strong>Fragmented flow.</strong> One app for notes, another for flashcards, another for research. Nothing talks to each other.</> },
                        { icon: "visibility_off", text: <><strong>Passive reading.</strong> You highlight everything, understand nothing, and remember even less.</> },
                        { icon: "schedule", text: <><strong>Reviewing too late.</strong> Cramming the night before puts knowledge in short-term memory — it evaporates in 48 hours.</> },
                      ]
                    : [
                        { icon: "tab", text: <><strong>Flujo fragmentado.</strong> Una app para apuntes, otra para flashcards, otra para investigar. Nada se conecta.</> },
                        { icon: "visibility_off", text: <><strong>Lectura pasiva.</strong> Subrayás todo, entendés poco y recordás menos todavía.</> },
                        { icon: "schedule", text: <><strong>Repasás demasiado tarde.</strong> Estudiar la noche anterior pone el conocimiento en la memoria a corto plazo — se evapora en 48 horas.</> },
                      ]
                  ).map((item, i) => (
                    <li key={i} className="lp-problem-pain-item">
                      <div className="lp-problem-pain-icon" aria-hidden="true">
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{item.icon}</span>
                      </div>
                      <p className="lp-problem-pain-text">{item.text}</p>
                    </li>
                  ))}
                </ul>
              </FadeReveal>

              {/* Right — the answer */}
              <FadeReveal delay={120}>
                <div className="lp-problem-solution">
                  <span className="lp-eyebrow" style={{ marginBottom: 20, display: "inline-flex" }}>
                    {en ? "The Neuvra way" : "El camino Neuvra"}
                  </span>
                  <h3 className="lp-h3" style={{ marginBottom: 14, fontSize: "1.3rem" }}>
                    {en
                      ? "One system that closes the loop — from first reading to long-term memory."
                      : "Un sistema que cierra el ciclo — desde la primera lectura hasta la memoria a largo plazo."}
                  </h3>
                  <p className="lp-body" style={{ fontSize: "0.92rem", marginBottom: 28 }}>
                    {en
                      ? "Neuvra replaces the patchwork of disconnected tools. Your PDFs, explanations, flashcards and review sessions live in one connected flow — each step building on the last."
                      : "Neuvra reemplaza el parche de herramientas desconectadas. Tus PDFs, explicaciones, flashcards y sesiones de repaso viven en un flujo conectado — cada paso construye sobre el anterior."}
                  </p>
                  {/* Mini flow */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }} aria-hidden="true">
                    {(en
                      ? [
                          { icon: "upload_file",   label: "Upload anything",      sub: "PDF, notes, paper, video transcript" },
                          { icon: "smart_toy",      label: "AI explains it",       sub: "Step-by-step, adapted to you" },
                          { icon: "style",          label: "Flashcards generated", sub: "From the exact same source" },
                          { icon: "update",         label: "Memory tracks you",    sub: "Reviews surface before you forget" },
                        ]
                      : [
                          { icon: "upload_file",   label: "Subís cualquier cosa",     sub: "PDF, apuntes, paper, transcripción" },
                          { icon: "smart_toy",      label: "La IA lo explica",         sub: "Paso a paso, adaptado a vos" },
                          { icon: "style",          label: "Flashcards generadas",     sub: "Desde exactamente la misma fuente" },
                          { icon: "update",         label: "La memoria te rastrea",    sub: "Los repasos aparecen antes de que olvides" },
                        ]
                    ).map((row, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(124,58,237,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 18, color: "var(--lp-primary)" }}>{row.icon}</span>
                        </div>
                        <div>
                          <span style={{ fontSize: "0.84rem", fontWeight: 600, color: "#fff", display: "block" }}>{row.label}</span>
                          <span style={{ fontSize: "0.74rem", color: "var(--lp-muted)" }}>{row.sub}</span>
                        </div>
                        {i < 3 && <span className="material-symbols-outlined" style={{ fontSize: 14, color: "rgba(124,58,237,0.4)", marginLeft: "auto", flexShrink: 0 }}>arrow_downward</span>}
                      </div>
                    ))}
                  </div>
                </div>
              </FadeReveal>
            </div>
          </div>
        </section>

        {/* ══ PHILOSOPHY — Comprensión → Síntesis → Memoria ═══════════ */}
        <section className="lp-section" aria-labelledby="philosophy-heading">
          <div className="wrap">
            <FadeReveal className="lp-section-header">
              <span className="lp-eyebrow" style={{ marginBottom: 16, display: "inline-flex" }}>
                {en ? "Our philosophy" : "Nuestra filosofía"}
              </span>
              <h2 id="philosophy-heading" className="lp-h2">
                {en
                  ? "Real learning has three stages. Most students only use one."
                  : "El aprendizaje real tiene tres etapas. La mayoría de los estudiantes solo usa una."}
              </h2>
              <p className="lp-body" style={{ marginTop: 14 }}>
                {en
                  ? "Neuvra is built around this truth. Every tool, every feature, every interaction is designed to move you through all three."
                  : "Neuvra está construido alrededor de esta verdad. Cada herramienta, cada funcionalidad, cada interacción está diseñada para llevarte por las tres."}
              </p>
            </FadeReveal>

            <div className="lp-philosophy-grid lp-stagger">

              {/* Pillar 1 — Comprensión */}
              <div className="lp-pillar" style={{ "--lp-i": 0 } as React.CSSProperties}>
                <div className="lp-pillar-number lp-pillar-number--1" aria-hidden="true">1</div>
                {/* Arrow connector */}
                <span className="lp-pillar-arrow material-symbols-outlined" aria-hidden="true">arrow_forward</span>
                <h3 className="lp-h3" style={{ marginBottom: 12 }}>
                  {en ? "Understanding" : "Comprensión"}
                </h3>
                <p className="lp-body" style={{ fontSize: "0.88rem", marginBottom: 20 }}>
                  {en
                    ? "Before you memorize anything, you need to truly understand it. The AI Tutor explains every concept until it clicks — using analogies, questions and step-by-step breakdowns."
                    : "Antes de memorizar algo, necesitás entenderlo de verdad. El Tutor IA explica cada concepto hasta que hace clic — con analogías, preguntas y desgloses paso a paso."}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
                  {(en
                    ? ["AI Tutor with Socratic method", "Research paper analysis", "PDF & document explanations", "Concept simplification"]
                    : ["Tutor IA con método socrático", "Análisis de papers de investigación", "Explicaciones de PDFs y docs", "Simplificación de conceptos"]
                  ).map(f => (
                    <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.78rem", color: "var(--lp-muted)" }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--lp-primary)", flexShrink: 0 }} aria-hidden="true" />
                      {f}
                    </div>
                  ))}
                </div>
              </div>

              {/* Pillar 2 — Síntesis */}
              <div className="lp-pillar lp-pillar--center" style={{ "--lp-i": 1 } as React.CSSProperties}>
                <div className="lp-pillar-number lp-pillar-number--2" aria-hidden="true">2</div>
                <span className="lp-pillar-arrow material-symbols-outlined" aria-hidden="true">arrow_forward</span>
                <h3 className="lp-h3" style={{ marginBottom: 12 }}>
                  {en ? "Synthesis" : "Síntesis"}
                </h3>
                <p className="lp-body" style={{ fontSize: "0.88rem", marginBottom: 20 }}>
                  {en
                    ? "Once you understand, Neuvra turns that understanding into review-ready material — flashcards, smart notes and structured summaries — from the same source, automatically."
                    : "Una vez que entendés, Neuvra convierte esa comprensión en material listo para repasar — flashcards, notas inteligentes y resúmenes estructurados — desde la misma fuente, automáticamente."}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
                  {(en
                    ? ["Auto-generated flashcards", "Smart Notes & summaries", "Key concept extraction"]
                    : ["Flashcards autogeneradas", "Smart Notes y resúmenes", "Extracción de conceptos clave"]
                  ).map(f => (
                    <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.78rem", color: "var(--lp-muted)" }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--lp-primary-ctr)", flexShrink: 0 }} aria-hidden="true" />
                      {f}
                    </div>
                  ))}
                </div>
              </div>

              {/* Pillar 3 — Memoria */}
              <div className="lp-pillar" style={{ "--lp-i": 2 } as React.CSSProperties}>
                <div className="lp-pillar-number lp-pillar-number--3" aria-hidden="true">3</div>
                <h3 className="lp-h3" style={{ marginBottom: 12 }}>
                  {en ? "Memory" : "Memoria"}
                </h3>
                <p className="lp-body" style={{ fontSize: "0.88rem", marginBottom: 20 }}>
                  {en
                    ? "The Memory Engine tracks your forgetting curve and surfaces content right before it fades. It knows what you're about to forget — and makes sure you don't."
                    : "El Motor de Memoria rastrea tu curva del olvido y presenta el contenido justo antes de que se borre. Sabe lo que estás por olvidar — y se asegura de que no ocurra."}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
                  {(en
                    ? ["Spaced repetition algorithm", "Forgetting curve tracking", "Optimal review scheduling"]
                    : ["Algoritmo de repetición espaciada", "Seguimiento de curva del olvido", "Programación óptima de repaso"]
                  ).map(f => (
                    <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.78rem", color: "var(--lp-muted)" }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--lp-tertiary)", flexShrink: 0 }} aria-hidden="true" />
                      {f}
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ══ LEARNING JOURNEY ═════════════════════════════════════════ */}
        <section id="journey" className="lp-section lp-section--dim" aria-labelledby="journey-heading">
          <div className="wrap">
            <FadeReveal className="lp-section-header">
              <h2 id="journey-heading" className="lp-h2">{l.workflowTitle}</h2>
              <p className="lp-body" style={{ marginTop: 14 }}>{l.workflowSub}</p>
            </FadeReveal>

            <div style={{ position: "relative" }}>
              {/* Connector line desktop */}
              <div
                className="lp-journey-connector lp-line-reveal"
                aria-hidden="true"
              />

              <div
                className="lp-journey-grid lp-stagger"
                aria-label={en ? "Learning steps" : "Pasos del aprendizaje"}
              >
                {[
                  {
                    icon: "cloud_upload", color: "var(--lp-primary)", stepLabel: en ? "STEP 1" : "PASO 1",
                    title: l.step1title,  body: l.step1,
                    features: en
                      ? ["PDF", "Notes", "Papers", "Lectures"]
                      : ["PDF", "Apuntes", "Papers", "Clases"],
                    i: 0,
                  },
                  {
                    icon: "lightbulb",    color: "var(--lp-secondary)", stepLabel: en ? "STEP 2" : "PASO 2",
                    title: l.step2title,  body: l.step2,
                    features: en
                      ? ["AI Tutor", "PDF Summaries", "Explanations"]
                      : ["Tutor IA", "Resúmenes PDF", "Explicaciones"],
                    i: 1,
                  },
                  {
                    icon: "style",        color: "var(--lp-tertiary)", stepLabel: en ? "STEP 3" : "PASO 3",
                    title: l.step3title,  body: l.step3,
                    features: en
                      ? ["Auto Flashcards", "Smart Notes", "Key Concepts"]
                      : ["Flashcards", "Smart Notes", "Conceptos clave"],
                    i: 2,
                  },
                  {
                    icon: "memory",       color: "#a78bfa", stepLabel: en ? "STEP 4" : "PASO 4",
                    title: l.step4title,  body: l.step4,
                    features: en
                      ? ["Spaced Repetition", "Review Decks", "Forgetting Curve"]
                      : ["Repetición espaciada", "Mazos de repaso", "Curva del olvido"],
                    i: 3,
                  },
                ].map((step) => (
                  <div
                    key={step.i}
                    className="lp-step"
                    style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", "--lp-i": step.i } as React.CSSProperties}
                  >
                    <div className="lp-step-icon" style={{ borderColor: step.color + "33" }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 36, color: step.color }}>{step.icon}</span>
                    </div>
                    <span className="lp-label" style={{ color: step.color, marginBottom: 8 }}>{step.stepLabel}</span>
                    <h3 className="lp-h3" style={{ marginBottom: 10, fontSize: "1.05rem" }}>{step.title}</h3>
                    <p style={{ fontSize: "0.85rem", color: "var(--lp-muted)", lineHeight: 1.6, marginBottom: 0 }}>{step.body}</p>
                    {/* Feature tags — shows what tools are active at this step */}
                    <div className="lp-step-features" aria-hidden="true">
                      {step.features.map(f => (
                        <span key={f} className="lp-step-feat-tag">{f}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ══ SYSTEM SECTION — 5 interconnected tools ══════════════════ */}
        <section className="lp-section" aria-labelledby="system-heading">
          <div className="wrap">
            <FadeReveal className="lp-section-header">
              <h2 id="system-heading" className="lp-h2">{l.featuresTitle}</h2>
              <p className="lp-body" style={{ marginTop: 14 }}>{l.featuresSub}</p>
            </FadeReveal>

            <div className="lp-system-grid-v2 lp-stagger">

              {/* ─── AI TUTOR — hero card, wide ─────────────────────── */}
              <article className="lp-glass lp-sys-card lp-sys-tutor-v2 lp-card-hover" style={{ "--lp-i": 0 } as React.CSSProperties}>
                <div className="lp-sys-glow" aria-hidden="true" />
                <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                  <div className="lp-sys-icon lp-sys-icon--primary" aria-hidden="true">
                    <span className="material-symbols-outlined" style={{ fontSize: 28 }}>smart_toy</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 className="lp-h3" style={{ marginBottom: 6 }}>
                      {en ? "AI Tutor" : "Tutor de IA"}
                    </h3>
                    <p className="lp-body" style={{ fontSize: "0.88rem", margin: 0 }}>
                      {en
                        ? "Explains like a teacher, not a chatbot. Ask anything from your material and get step-by-step breakdowns adapted to your level."
                        : "Explica como un profesor, no como un chatbot. Pregunta cualquier cosa de tu material y recibe explicaciones paso a paso adaptadas a tu nivel."}
                    </p>
                  </div>
                </div>

                {/* Live chat snippet */}
                <div className="lp-chat-snippet" aria-hidden="true">
                  <div className="lp-chat-bubble">
                    <div className="lp-chat-avatar lp-chat-avatar--user">Tú</div>
                    <div className="lp-chat-text">
                      {en ? "I don't understand why neurons fire in sequence" : "No entiendo por qué las neuronas disparan en secuencia"}
                    </div>
                  </div>
                  <div className="lp-chat-bubble">
                    <div className="lp-chat-avatar lp-chat-avatar--ai" aria-label="Neuvra AI">N</div>
                    <div className="lp-chat-text lp-chat-text--ai">
                      {en
                        ? "Think of it like a relay race — each neuron passes the signal to the next. The key is the action potential…"
                        : "Pensalo como una carrera de relevos — cada neurona pasa la señal a la siguiente. La clave está en el potencial de acción…"}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div className="lp-avatar-stack" aria-hidden="true">
                    {[35, 50, 70].map((shade) => (
                      <div key={shade} className="lp-avatar" style={{ background: `hsl(220,30%,${shade}%)` }} />
                    ))}
                  </div>
                  <span style={{ fontSize: "0.75rem", color: "var(--lp-muted)" }}>
                    {en ? "10,000+ sessions today" : "10.000+ sesiones hoy"}
                  </span>
                </div>
              </article>

              {/* ─── RESEARCH ASSISTANT — right tall column ─────────── */}
              <article className="lp-glass lp-sys-card lp-sys-research lp-sys-card--accent lp-card-hover" style={{ "--lp-i": 1 } as React.CSSProperties}>
                <div className="lp-sys-icon lp-sys-icon--secondary" aria-hidden="true">
                  <span className="material-symbols-outlined" style={{ fontSize: 26 }}>description</span>
                </div>
                <h3 className="lp-h3">{en ? "Research Assistant" : "Asistente de Investigación"}</h3>
                <p className="lp-body" style={{ fontSize: "0.86rem" }}>
                  {en
                    ? "Upload a PDF, paper or document and Neuvra extracts what matters — key findings, methodology, citations and structured summaries."
                    : "Sube un PDF, paper o documento y Neuvra extrae lo que importa — hallazgos clave, metodología, citas y resúmenes estructurados."}
                </p>

                {/* Doc → bullets visual */}
                <div className="lp-doc-preview" aria-hidden="true">
                  <div className="lp-doc-filename">
                    <span className="material-symbols-outlined" style={{ fontSize: 13 }}>picture_as_pdf</span>
                    {en ? "neuroscience_study.pdf" : "estudio_neurociencia.pdf"}
                  </div>
                  <div className="lp-doc-bullet">
                    {en
                      ? "Sleep increases synaptic consolidation by 34%"
                      : "El sueño aumenta la consolidación sináptica en un 34%"}
                  </div>
                  <div className="lp-doc-bullet">
                    {en
                      ? "Hippocampus most active during REM phase"
                      : "El hipocampo es más activo durante la fase REM"}
                  </div>
                  <div className="lp-doc-bullet">
                    {en
                      ? "Sample: 1,200 students, 6-month longitudinal"
                      : "Muestra: 1.200 estudiantes, 6 meses longitudinal"}
                  </div>
                </div>

                {/* Paper analysis feature chips */}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }} aria-hidden="true">
                  {(en
                    ? ["Analyze papers", "PDF summaries", "Citations", "Literature review"]
                    : ["Analizar papers", "Resúmenes PDF", "Citas", "Revisión de literatura"]
                  ).map((tag) => (
                    <span key={tag} className="lp-step-feat-tag" style={{ color: "rgba(59,130,246,0.85)", borderColor: "rgba(59,130,246,0.2)" }}>{tag}</span>
                  ))}
                </div>

                <a
                  href="/investigacion"
                  style={{ color: "var(--lp-primary)", fontWeight: 700, fontSize: "0.86rem", textDecoration: "none", display: "flex", alignItems: "center", gap: 4, marginTop: "auto" }}
                >
                  {en ? "Open Research →" : "Abrir Investigación →"}
                </a>
              </article>

              {/* ─── SMART NOTES + PDF SUMMARIES ────────────────────── */}
              <article className="lp-glass lp-sys-card lp-sys-notes lp-card-hover" style={{ "--lp-i": 2 } as React.CSSProperties}>
                <div className="lp-sys-icon lp-sys-icon--violet" aria-hidden="true">
                  <span className="material-symbols-outlined" style={{ fontSize: 22 }}>edit_note</span>
                </div>
                <h3 className="lp-h3" style={{ fontSize: "1.05rem" }}>
                  {en ? "Smart Notes" : "Notas Inteligentes"}
                </h3>
                <p className="lp-body" style={{ fontSize: "0.84rem" }}>
                  {en
                    ? "Your notes organize themselves. Neuvra detects connections between topics and builds a structured knowledge base from your uploads."
                    : "Tus notas se organizan solas. Neuvra detecta conexiones entre temas y construye una base de conocimiento estructurada desde tus archivos."}
                </p>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }} aria-hidden="true">
                  {(en ? ["Auto-summary", "Key concepts", "Mind map"] : ["Auto-resumen", "Conceptos clave", "Mapa mental"]).map(t => (
                    <span key={t} className="lp-step-feat-tag" style={{ color: "rgba(167,139,250,0.8)", borderColor: "rgba(124,58,237,0.2)" }}>{t}</span>
                  ))}
                </div>
              </article>

              {/* ─── AUTO FLASHCARDS ────────────────────────────────── */}
              <article className="lp-glass lp-sys-card lp-sys-flash lp-card-hover" style={{ "--lp-i": 3, background: "linear-gradient(135deg,rgba(124,58,237,0.18),rgba(59,130,246,0.14))", borderColor: "rgba(124,58,237,0.25)" } as React.CSSProperties}>
                <div className="lp-sys-icon" style={{ background: "rgba(124,58,237,0.25)", color: "var(--lp-primary)" }} aria-hidden="true">
                  <span className="material-symbols-outlined" style={{ fontSize: 22 }}>style</span>
                </div>
                <h3 className="lp-h3" style={{ fontSize: "1.05rem" }}>
                  {en ? "Auto Flashcards" : "Flashcards Automáticas"}
                </h3>
                <p className="lp-body" style={{ fontSize: "0.84rem", marginBottom: 0 }}>
                  {en
                    ? "One click turns any material into a review-ready spaced-repetition deck. Same source — no copy-pasting, no tab-switching."
                    : "Un clic convierte cualquier material en un mazo listo para repasar con repetición espaciada. Sin copiar ni cambiar de pestaña."}
                </p>
                {/* Mini flashcard preview */}
                <div className="lp-fc-preview" aria-hidden="true">
                  <div className="lp-fc-card lp-fc-card--q">
                    <span className="lp-fc-label lp-fc-label--q">{en ? "Question" : "Pregunta"}</span>
                    {en ? "What is synaptic plasticity?" : "¿Qué es la plasticidad sináptica?"}
                  </div>
                  <div className="lp-fc-card lp-fc-card--a">
                    <span className="lp-fc-label lp-fc-label--a">{en ? "Answer" : "Respuesta"}</span>
                    {en ? "The ability of synapses to strengthen or weaken over time…" : "La capacidad de las sinapsis de fortalecerse o debilitarse con el tiempo…"}
                  </div>
                </div>
              </article>

              {/* ─── MEMORY ENGINE — shown between the two rows in layout but here at end ─ */}
              {/* This card is inside the research column for tall layout, but actually
                  the CSS spans research col 3 rows 1-2, so we need Memory as a standalone row below */}

            </div>

            {/* ─── MEMORY ENGINE — full width accent strip ────────────── */}
            <FadeReveal
              style={{ marginTop: 20 }}
              className="lp-glass lp-card-hover"
              as="div"
            >
              <div style={{
                padding: "28px 36px",
                borderRadius: "var(--lp-radius-card)",
                display: "flex",
                alignItems: "center",
                gap: 32,
                flexWrap: "wrap",
                background: "linear-gradient(to right, rgba(124,58,237,0.12), rgba(11,19,38,0))",
                borderLeft: "3px solid var(--lp-primary-ctr)",
              }}>
                <div className="lp-sys-icon lp-sys-icon--tertiary" style={{ flexShrink: 0 }} aria-hidden="true">
                  <span className="material-symbols-outlined" style={{ fontSize: 26 }}>update</span>
                </div>
                <div style={{ flex: "0 0 220px" }}>
                  <h3 className="lp-h3" style={{ marginBottom: 4, fontSize: "1.1rem" }}>
                    {en ? "Memory Engine" : "Motor de Memoria"}
                  </h3>
                  <p className="lp-body" style={{ fontSize: "0.86rem", margin: 0 }}>
                    {en
                      ? "Knows what you're about to forget before you do. Surfaces the right content at exactly the right time."
                      : "Sabe lo que estás por olvidar antes de que lo olvides. Te presenta el contenido correcto en el momento exacto."}
                  </p>
                </div>
                {/* Spaced rep bar visual */}
                <div className="lp-mem-bar-group" style={{ flex: 1, minWidth: 200 }} aria-hidden="true">
                  {[
                    { label: en ? "Mitosis" : "Mitosis",         pct: 85, state: "strong" },
                    { label: en ? "DNA replication" : "Repl. ADN", pct: 42, state: "due"    },
                    { label: en ? "Enzymes" : "Enzimas",         pct: 67, state: "strong" },
                    { label: en ? "Osmosis" : "Ósmosis",         pct: 20, state: "due"    },
                  ].map(row => (
                    <div key={row.label} className="lp-mem-bar-row">
                      <span className="lp-mem-bar-label">{row.label}</span>
                      <div className="lp-mem-bar-track">
                        <div className="lp-mem-bar-fill" style={{ width: `${row.pct}%` }} />
                      </div>
                      <span className={`lp-mem-bar-badge lp-mem-bar-badge--${row.state}`}>
                        {row.state === "due"
                          ? (en ? "Review now" : "Repasar")
                          : (en ? "Strong" : "Dominado")}
                      </span>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="lp-btn lp-btn--ghost"
                  onClick={handleCta}
                  style={{ flexShrink: 0, padding: "12px 22px", fontSize: "0.88rem" }}
                  aria-label={en ? "Open Memory Engine" : "Abrir Motor de Memoria"}
                >
                  {en ? "Start reviewing →" : "Empezar a repasar →"}
                </button>
              </div>
            </FadeReveal>

          </div>
        </section>

        {/* ══ USE CASES ════════════════════════════════════════════════ */}
        <section className="lp-section lp-section--dim" aria-labelledby="usecases-heading">
          <div className="wrap">
            <FadeReveal className="lp-section-header">
              <h2 id="usecases-heading" className="lp-h2">{l.useCasesTitle}</h2>
              <p className="lp-body" style={{ marginTop: 14 }}>{l.useCasesSub}</p>
            </FadeReveal>

            <div className="lp-usecases-grid lp-stagger">

              {/* ─── EXAM PREP ───────────────────────────────────────── */}
              <article className="lp-glass lp-usecase-card lp-card-hover" style={{ "--lp-i": 0 } as React.CSSProperties}>
                <div className="lp-usecase-icon lp-usecase-icon--violet" aria-hidden="true">
                  <span className="material-symbols-outlined" style={{ fontSize: 26 }}>school</span>
                </div>
                <h3 className="lp-h3">{en ? "Exam preparation" : "Preparación de exámenes"}</h3>
                <p className="lp-body" style={{ fontSize: "0.88rem" }}>
                  {en
                    ? "Upload your syllabus or class notes. The AI Tutor explains what you don't understand, then auto-generates flashcard decks from the same material — so you review what you actually learned."
                    : "Subí tu temario o apuntes de clase. El Tutor IA explica lo que no entendés, luego genera automáticamente mazos de flashcards desde el mismo material — para que repases lo que realmente aprendiste."}
                </p>
                {/* How it works micro-flow */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }} aria-hidden="true">
                  {(en
                    ? ["Upload class notes or PDF syllabus", "AI Tutor clarifies weak concepts", "Auto flashcards built from same source", "Memory Engine schedules optimal review"]
                    : ["Subís apuntes o PDF del temario", "Tutor IA aclara los conceptos débiles", "Flashcards automáticas desde la misma fuente", "Motor de Memoria programa el repaso óptimo"]
                  ).map((step, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.77rem", color: "var(--lp-muted)" }}>
                      <span style={{ width: 18, height: 18, borderRadius: "50%", background: "rgba(124,58,237,0.2)", color: "var(--lp-primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.62rem", fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                      {step}
                    </div>
                  ))}
                </div>
                <ul className="lp-tags" aria-label={en ? "Features used" : "Funciones usadas"} style={{ marginTop: 12 }}>
                  {(en
                    ? ["AI Tutor", "Auto Flashcards", "Memory Engine", "PDF Upload"]
                    : ["Tutor IA", "Flashcards", "Motor de Memoria", "PDF"]
                  ).map(tag => <li key={tag}>{tag}</li>)}
                </ul>
              </article>

              {/* ─── ACADEMIC RESEARCH ───────────────────────────────── */}
              <article className="lp-glass lp-usecase-card lp-card-hover" style={{ "--lp-i": 1 } as React.CSSProperties}>
                <div className="lp-usecase-icon lp-usecase-icon--blue" aria-hidden="true">
                  <span className="material-symbols-outlined" style={{ fontSize: 26 }}>search_insights</span>
                </div>
                <h3 className="lp-h3">{en ? "Academic research" : "Investigación académica"}</h3>
                <p className="lp-body" style={{ fontSize: "0.88rem" }}>
                  {en
                    ? "Upload papers, paste DOIs or drop a folder of PDFs. Neuvra extracts methodologies, findings and citations — then builds a structured summary you can actually use in your writing."
                    : "Subí papers, pegá DOIs o soltá una carpeta de PDFs. Neuvra extrae metodologías, hallazgos y citas — y construye un resumen estructurado que realmente podés usar en tu escritura."}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }} aria-hidden="true">
                  {(en
                    ? ["Upload papers or paste DOIs", "Research Assistant extracts key findings", "Generate structured summaries & citations", "Smart Notes connect across sources"]
                    : ["Subís papers o pegás DOIs", "Asistente de Investigación extrae hallazgos clave", "Genera resúmenes y citas estructuradas", "Smart Notes conectan entre fuentes"]
                  ).map((step, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.77rem", color: "var(--lp-muted)" }}>
                      <span style={{ width: 18, height: 18, borderRadius: "50%", background: "rgba(59,130,246,0.2)", color: "var(--lp-secondary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.62rem", fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                      {step}
                    </div>
                  ))}
                </div>
                <ul className="lp-tags" aria-label={en ? "Features used" : "Funciones usadas"} style={{ marginTop: 12 }}>
                  {(en
                    ? ["Research Assistant", "PDF Summaries", "Smart Notes", "Citations"]
                    : ["Asistente de Investigación", "Resúmenes PDF", "Smart Notes", "Citas"]
                  ).map(tag => <li key={tag}>{tag}</li>)}
                </ul>
              </article>

              {/* ─── DAILY STUDY ─────────────────────────────────────── */}
              <article className="lp-glass lp-usecase-card lp-card-hover" style={{ "--lp-i": 2 } as React.CSSProperties}>
                <div className="lp-usecase-icon lp-usecase-icon--cyan" aria-hidden="true">
                  <span className="material-symbols-outlined" style={{ fontSize: 26 }}>edit_calendar</span>
                </div>
                <h3 className="lp-h3">{en ? "Daily study habit" : "Hábito de estudio diario"}</h3>
                <p className="lp-body" style={{ fontSize: "0.88rem" }}>
                  {en
                    ? "10 minutes with Neuvra every morning is enough. The Memory Engine knows exactly which cards you're about to forget and serves only those — no wasted time reviewing what you already know."
                    : "10 minutos con Neuvra cada mañana es suficiente. El Motor de Memoria sabe exactamente qué tarjetas estás por olvidar y te muestra solo esas — sin perder tiempo repasando lo que ya sabés."}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }} aria-hidden="true">
                  {(en
                    ? ["Memory Engine identifies what needs review", "Flashcards surface at optimal intervals", "AI Tutor re-explains anything that trips you", "Progress tracked across all your material"]
                    : ["Motor de Memoria identifica qué necesita repaso", "Flashcards aparecen en intervalos óptimos", "Tutor IA re-explica lo que te trabó", "Progreso registrado en todo tu material"]
                  ).map((step, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.77rem", color: "var(--lp-muted)" }}>
                      <span style={{ width: 18, height: 18, borderRadius: "50%", background: "rgba(76,215,246,0.12)", color: "var(--lp-tertiary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.62rem", fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                      {step}
                    </div>
                  ))}
                </div>
                <ul className="lp-tags" aria-label={en ? "Features used" : "Funciones usadas"} style={{ marginTop: 12 }}>
                  {(en
                    ? ["Memory Engine", "Spaced Repetition", "AI Tutor", "Progress Tracking"]
                    : ["Motor de Memoria", "Repetición espaciada", "Tutor IA", "Progreso"]
                  ).map(tag => <li key={tag}>{tag}</li>)}
                </ul>
              </article>

            </div>
          </div>
        </section>

        {/* ══ PRICING ══════════════════════════════════════════════════ */}
        <section id="pricing" className="lp-section" aria-labelledby="pricing-heading">
          <div className="wrap">
            <FadeReveal className="lp-section-header">
              <h2 id="pricing-heading" className="lp-h2">{l.pricingTitle}</h2>
              <p className="lp-body" style={{ marginTop: 14 }}>{l.pricingSub}</p>
            </FadeReveal>

            <div className="lp-pricing-grid lp-stagger">
              {t.pricing.map((card, i) => {
                const featured = "featured" in card && card.featured;
                const badge    = "badge"    in card ? card.badge    : undefined;
                const cta      = "cta"      in card ? card.cta      : undefined;
                const period   = "period"   in card ? card.period   : undefined;
                return (
                  <article
                    key={card.label}
                    className={`lp-glass lp-plan-card lp-card-hover${featured ? " lp-plan-card--featured" : ""}`}
                    style={{ "--lp-i": i } as React.CSSProperties}
                  >
                    {badge && <div className="lp-plan-badge" aria-label={`${badge} plan`}>{badge}</div>}
                    <span className="lp-label" style={{ color: "var(--lp-muted)" }}>{card.label}</span>
                    <div className="lp-plan-price">
                      {card.price}
                      {period && <span style={{ fontSize: "1rem", fontWeight: 400, color: "var(--lp-muted)" }}> {period}</span>}
                    </div>
                    <p style={{ fontSize: "0.88rem", color: "var(--lp-muted)", marginBottom: 0 }}>{card.desc}</p>
                    <ul className="lp-plan-features" aria-label={`${card.label} features`}>
                      {card.items.map((item) => (
                        <li key={item}>
                          <span className="material-symbols-outlined" aria-hidden="true">check_circle</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                    {cta && (
                      <button
                        type="button"
                        className={`lp-btn ${featured ? "lp-btn--primary" : "lp-btn--ghost"}`}
                        onClick={handleCta}
                        style={{ width: "100%", justifyContent: "center" }}
                        aria-label={cta}
                      >
                        {cta}
                      </button>
                    )}
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* ══ TESTIMONIALS ═════════════════════════════════════════════ */}
        <section className="lp-section lp-section--dim" aria-labelledby="testimonials-heading">
          <div className="wrap">
            <div style={{ display: "flex", flexDirection: "row", flexWrap: "wrap", gap: 48, alignItems: "center" }}>
              <FadeReveal style={{ flex: "0 0 280px" }}>
                <h2 id="testimonials-heading" className="lp-h2" style={{ marginBottom: 24 }}>
                  {en ? "Loved by students worldwide" : "Amado por estudiantes de todo el mundo"}
                </h2>
                <div style={{ display: "flex", gap: 12 }}>
                  {(["arrow_back", "arrow_forward"] as const).map((icon, i) => (
                    <button
                      key={icon}
                      type="button"
                      className="lp-glass"
                      style={{ width: 44, height: 44, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", border: "1px solid rgba(255,255,255,0.14)" }}
                      aria-label={i === 0 ? (en ? "Previous testimonial" : "Testimonio anterior") : (en ? "Next testimonial" : "Testimonio siguiente")}
                      onClick={() => {
                        const track = document.getElementById("lp-testimonials-track");
                        if (track) track.scrollBy({ left: i === 0 ? -400 : 400, behavior: "smooth" });
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 20, color: i === 1 ? "var(--lp-primary)" : "#fff" }} aria-hidden="true">{icon}</span>
                    </button>
                  ))}
                </div>
              </FadeReveal>

              <div
                id="lp-testimonials-track"
                className="lp-testimonials-track"
                role="list"
                aria-label={en ? "Student testimonials" : "Testimonios de estudiantes"}
                style={{ flex: 1, minWidth: 0 }}
              >
                {[
                  {
                    quote: en
                      ? "Neuvra halved my study time for the MIR exam. The automatic flashcards are magical."
                      : "Neuvra redujo mi tiempo de estudio a la mitad para el examen MIR. Las flashcards automáticas son mágicas.",
                    name:  "Elena Rodriguez",
                    role:  en ? "Medical Student" : "Estudiante de Medicina",
                    i: 0,
                  },
                  {
                    quote: en
                      ? "The research assistant is incredibly accurate. It finds papers Google Scholar never showed me."
                      : "El asistente de investigación es increíblemente preciso. Encuentra papers que Google Scholar ni siquiera me mostraba.",
                    name:  "Marc Serra",
                    role:  en ? "PhD Researcher" : "Investigador PhD",
                    i: 1,
                  },
                ].map((tm) => (
                  <article
                    key={tm.name}
                    className="lp-glass lp-testimonial-card"
                    role="listitem"
                    style={{ "--lp-i": tm.i } as React.CSSProperties}
                  >
                    <blockquote style={{ margin: 0 }}>
                      <p style={{ fontSize: "1rem", color: "#fff", lineHeight: 1.65, fontStyle: "italic", marginBottom: 24 }}>
                        "{tm.quote}"
                      </p>
                    </blockquote>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <div
                        style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--lp-primary-ctr)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#fff", fontWeight: 700, fontSize: "1.1rem" }}
                        aria-hidden="true"
                      >
                        {tm.name[0]}
                      </div>
                      <div>
                        <p style={{ color: "#fff", fontWeight: 700, margin: 0, fontSize: "0.92rem" }}>{tm.name}</p>
                        <p style={{ color: "var(--lp-muted)", fontSize: "0.82rem", margin: 0 }}>{tm.role}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ══ EMOTIONAL CLOSING ════════════════════════════════════════ */}
        <section className="lp-section" aria-labelledby="closing-heading">
          <div className="wrap">
            <FadeReveal className="lp-closing">
              <div className="lp-closing-divider" aria-hidden="true" />
              <p className="lp-closing-quote" id="closing-heading">
                {en ? (
                  <>Knowing something and <em>truly understanding it</em> are two very different things.</>
                ) : (
                  <>Saber algo y <em>entenderlo de verdad</em> son dos cosas muy distintas.</>
                )}
              </p>
              <p className="lp-closing-sub">
                {en
                  ? "Most tools help you store information. Neuvra helps you transform it into something that lasts — deep understanding you can build on, synthesize from, and never lose."
                  : "La mayoría de las herramientas te ayudan a almacenar información. Neuvra te ayuda a transformarla en algo que dura — comprensión profunda sobre la que podés construir, sintetizar, y nunca perder."}
              </p>
              <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="lp-btn lp-btn--primary"
                  onClick={handleCta}
                  aria-label={en ? "Start your learning journey with Neuvra" : "Empezar tu viaje de aprendizaje con Neuvra"}
                >
                  {en ? "Start learning — it's free" : "Empezar a aprender — es gratis"}
                </button>
                <a href="#journey" className="lp-btn lp-btn--ghost">
                  {en ? "See how it works" : "Ver cómo funciona"}
                </a>
              </div>
            </FadeReveal>
          </div>
        </section>

        {/* ══ TAGLINE — CTA ════════════════════════════════════════════ */}
        <section className="lp-section" aria-labelledby="tagline-heading">
          <div className="wrap">
            <div className="lp-glass lp-tagline-card">
              <div className="lp-tagline-glow" aria-hidden="true" />

              <FadeReveal>
                <h2 id="tagline-heading" className="lp-h2" style={{ marginBottom: 14 }}>
                  {en ? (<>Understand first.<br />Remember after.</>) : (<>Entendé primero.<br />Recordá después.</>)}
                </h2>
                <p className="lp-body" style={{ maxWidth: 460, marginBottom: 0 }}>
                  {en
                    ? "Neuvra connects the tools you use to understand with the tools you use to retain — in a single, focused learning system."
                    : "Neuvra conecta las herramientas que usás para entender con las que usás para retener, en un único sistema de aprendizaje enfocado."}
                </p>
                <ul className="lp-tagline-features" aria-label={en ? "Key features" : "Funciones clave"}>
                  {(en
                    ? ["AI tutor that explains, not just answers", "Auto flashcards from any material", "Memory engine that knows when to review"]
                    : ["Tutor de IA que explica, no solo responde", "Flashcards automáticas desde cualquier material", "Motor de memoria que sabe cuándo repasar"]
                  ).map((item) => (
                    <li key={item}>
                      <span className="lp-tagline-dot" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="lp-btn lp-btn--primary"
                    onClick={handleCta}
                    aria-label={en ? "Start learning with Neuvra" : "Empezar a aprender con Neuvra"}
                  >
                    {l.ctaPrimary}
                  </button>
                  <a href="#journey" className="lp-btn lp-btn--ghost">{l.ctaSecondary}</a>
                </div>
              </FadeReveal>

              <TaglineVisual lang={lang} />
            </div>
          </div>
        </section>

      </main>

      {/* ══ FOOTER ═══════════════════════════════════════════════════ */}
      <footer className="lp-footer" role="contentinfo">
        <div className="wrap">
          <div className="footer-inner">
            <div>
              <div className="footer-brand">
                <div className="footer-brand-mark">
                  <Image src="/logo.jpeg" alt="Neuvra AI" width={36} height={36} />
                </div>
                <span style={{ fontFamily: "var(--lp-font-head)", fontWeight: 700 }}>Neuvra AI</span>
              </div>
              <p className="footer-tagline">{l.footerTagline}</p>
            </div>
            <div className="footer-links-grid">
              <div className="footer-col">
                <h4>{l.footerProduct}</h4>
                <Link href="/investigacion">{nav.research}</Link>
                <Link href="/estudio">{nav.study}</Link>
                <a href="#journey">{nav.howItWorks}</a>
              </div>
              <div className="footer-col">
                <h4>{l.footerCompany}</h4>
                <Link href={aboutHref}>{l.footerAbout}</Link>
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
            <span>© {new Date().getFullYear()} Neuvra AI. {l.footerRights}</span>
            <div className="footer-social">
              <a href="#" aria-label="WhatsApp">wa</a>
              <a href="#" aria-label="Instagram">ig</a>
              <a href="mailto:neuvraai@gmail.com" aria-label="Email">mail</a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
