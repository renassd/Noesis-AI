"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
// useRef + useState kept for WordReveal; useEffect kept for global reveal + topbar
import ColorModeToggle from "./ColorModeToggle";
import LangToggle from "./LangToggle";
import { useLang } from "./i18n";
import { useAuth } from "@/context/AuthContext";

function useTopbarScroll() {
  useEffect(() => {
    const bar = document.querySelector(".landing-topbar");
    const onScroll = () => bar?.classList.toggle("scrolled", window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
}

/* Reveal — just stamps lp-reveal onto a div.
   Visibility is handled by the single global IntersectionObserver above. */
function Reveal({
  children,
  className,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`lp-reveal${className ? ` ${className}` : ""}`}
      style={style}
    >
      {children}
    </div>
  );
}

function WordReveal({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLHeadingElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      setVisible(true);
      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setVisible(true);
        io.disconnect();
      },
      { threshold: 0.15, rootMargin: "0px 0px -32px 0px" },
    );

    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <h1
      ref={ref}
      className={className}
      aria-label={text}
      style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", rowGap: "0.12em", width: "100%", maxWidth: "none", margin: "0 auto" }}
    >
      {text.split(" ").map((word, i) => (
        <span
          key={`${word}-${i}`}
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

/* ─── Manifesto content (hardcoded for both langs) ────────────── */
const MANIFESTO_COPY = {
  es: [
    {
      eyebrow: "Quiénes somos",
      heading: "Quiénes somos",
      body: (
        <>
          Neuvra es un compañero de estudio e investigación con IA diseñado para transformar
          ideas complejas en{" "}
          <span className="lp-grad-text">comprensión real</span>. Combinando explicación,
          resumen y herramientas de memoria a un costo accesible, ayudamos a las personas a ir
          más allá del aprendizaje superficial y{" "}
          <span className="lp-grad-text">construir conocimiento que perdura</span>.
        </>
      ),
    },
    {
      eyebrow: "Nuestra visión",
      heading: "Nuestra visión",
      body: (
        <>
          Nuestra visión es hacer que la investigación avanzada y el{" "}
          <span className="lp-grad-text">aprendizaje profundo sean accesibles para todos</span>{" "}
          — permitiendo que las personas comprendan, retengan y creen conocimiento al más alto
          nivel.
        </>
      ),
    },
    {
      eyebrow: "Nuestra misión",
      heading: "Nuestra misión",
      body: (
        <>
          Neuvra{" "}
          <span className="lp-grad-text">democratiza la comprensión profunda</span> al
          transformar información compleja en conocimiento que las personas realmente pueden
          aprender, retener y usar{" "}
          <span className="lp-grad-text">para mejorar el mundo</span>.
        </>
      ),
    },
  ],
  en: [
    {
      eyebrow: "Who we are",
      heading: "Who we are",
      body: (
        <>
          Neuvra is an AI study and research companion designed to turn complex ideas into{" "}
          <span className="lp-grad-text">true understanding</span>. By combining explanation,
          summarization, and memory tools at accessible costs, we help people move beyond
          surface learning and{" "}
          <span className="lp-grad-text">build knowledge that lasts</span>.
        </>
      ),
    },
    {
      eyebrow: "Our vision",
      heading: "Our vision",
      body: (
        <>
          Our vision is to make advanced research and{" "}
          <span className="lp-grad-text">deep learning accessible to anyone</span> —
          empowering people to understand, retain, and create knowledge at the highest level.
        </>
      ),
    },
    {
      eyebrow: "Our mission",
      heading: "Our mission",
      body: (
        <>
          Neuvra{" "}
          <span className="lp-grad-text">democratizes deep understanding</span> by turning
          complex information into knowledge people can truly learn, retain, and use{" "}
          <span className="lp-grad-text">to better the world</span>.
        </>
      ),
    },
  ],
} as const;

/* ─── ManifestoSection — driven by navbar lang, no internal toggle ── */
function ManifestoSection({ lang }: { lang: "en" | "es" }) {
  const blocks = MANIFESTO_COPY[lang];

  return (
    <section className="wwa-manifesto wwa-section--dim" aria-labelledby="manifesto-heading">
      <div className="wrap" style={{ maxWidth: 860 }}>
        {blocks.map((block, i) => (
          <div key={`${lang}-${block.eyebrow}`}>
            {/* No lp-reveal here — content must always be visible regardless of scroll/lang */}
            <div
              className="wwa-manifesto-block"
              id={i === 0 ? "manifesto-heading" : undefined}
            >
              <div className="wwa-manifesto-eyebrow">{block.eyebrow}</div>
              <p className="wwa-manifesto-es">{block.body}</p>
            </div>
            {i < blocks.length - 1 && (
              <div className="wwa-manifesto-rule" aria-hidden="true" />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════ */
export function WhoWeArePage() {
  const { t, lang } = useLang();
  const { auth, openModal, signOut } = useAuth();
  const l = t.landing;
  const nav = t.nav;
  const en = lang === "en";
  const aboutHref = en ? "/who-we-are" : "/quienes-somos";
  const year = new Date().getFullYear();

  useTopbarScroll();

  /* Global reveal — one observer for ALL .lp-reveal elements.
     Re-runs when lang changes so newly-mounted elements (keyed by lang) get observed. */
  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const targets = document.querySelectorAll<Element>(".lp-reveal");

    if (prefersReduced) {
      targets.forEach((el) => el.classList.add("lp-visible"));
      return;
    }

    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("lp-visible");
          io.unobserve(entry.target);
        }),
      // Low threshold + extend viewport downward so elements near fold trigger early
      { threshold: 0.01, rootMargin: "0px 0px 120px 0px" }
    );

    targets.forEach((el) => io.observe(el));
    return () => io.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  // manifesto content now handled by ManifestoSection component below

  const problems = en
    ? [
        {
          icon: "visibility_off",
          text: (
            <>
              <strong>Reading without understanding.</strong> You highlight everything, close the tab, and still cannot
              explain the core idea in your own words.
            </>
          ),
        },
        {
          icon: "schedule",
          text: (
            <>
              <strong>Manual summarizing for hours.</strong> You spend more energy organizing information than actually
              learning from it.
            </>
          ),
        },
        {
          icon: "tab_close",
          text: (
            <>
              <strong>Knowledge split across tools.</strong> Notes, PDFs, flashcards and review all live in different
              places, so the learning loop never closes.
            </>
          ),
        },
      ]
    : [
        {
          icon: "visibility_off",
          text: (
            <>
              <strong>Leer sin comprender.</strong> Subrayás todo, cerrás la pestaña, y seguís sin poder explicar la
              idea central con tus propias palabras.
            </>
          ),
        },
        {
          icon: "schedule",
          text: (
            <>
              <strong>Resumir todo a mano durante horas.</strong> Gastás más energía ordenando información que
              aprendiendo de verdad.
            </>
          ),
        },
        {
          icon: "tab_close",
          text: (
            <>
              <strong>Conocimiento partido en herramientas.</strong> Notas, PDFs, flashcards y repaso viven separados,
              así que el ciclo de aprendizaje nunca se cierra.
            </>
          ),
        },
      ];

  const philosophyCards = en
    ? [
        {
          cls: "wwa-phil-1",
          icon: "auto_awesome",
          color: "var(--lp-primary)",
          title: "AI as mentor",
          body: "AI should not do the thinking for you. It should guide you to think better, question better, and understand better.",
          tag: "AI Tutor · Socratic method",
        },
        {
          cls: "wwa-phil-2",
          icon: "psychology",
          color: "var(--lp-tertiary)",
          title: "Active learning, not passive review",
          body: "Reading without transforming information is not studying. Neuvra forces you to process, synthesize, connect and produce.",
          tag: "Active understanding · Flashcards · Smart Notes",
        },
        {
          cls: "wwa-phil-3",
          icon: "hub",
          color: "var(--lp-primary)",
          title: "Connection over accumulation",
          body: "The brain does not store knowledge in folders. It weaves it into networks. Connected knowledge becomes intuition.",
          tag: "Knowledge maps · Research assistant",
        },
        {
          cls: "wwa-phil-4",
          icon: "update",
          color: "var(--lp-tertiary)",
          title: "Long-term memory",
          body: "We do not study for the exam. We study for life. Spaced repetition turns what you learn today into intuition tomorrow.",
          tag: "Memory engine · Spaced repetition",
        },
      ]
    : [
        {
          cls: "wwa-phil-1",
          icon: "auto_awesome",
          color: "var(--lp-primary)",
          title: "IA como mentora",
          body: "La IA no debería pensar por vos. Debería guiarte para pensar mejor, preguntar mejor y entender más profundo.",
          tag: "Tutor IA · Método socrático",
        },
        {
          cls: "wwa-phil-2",
          icon: "psychology",
          color: "var(--lp-tertiary)",
          title: "Aprendizaje activo, no pasivo",
          body: "Leer sin transformar la información no es estudiar. Neuvra te obliga a procesar, sintetizar, conectar y producir.",
          tag: "Comprensión activa · Flashcards · Smart Notes",
        },
        {
          cls: "wwa-phil-3",
          icon: "hub",
          color: "var(--lp-primary)",
          title: "Conexión sobre acumulación",
          body: "El cerebro no archiva conocimiento en carpetas. Lo teje en redes. El conocimiento conectado se vuelve intuición.",
          tag: "Mapas de conocimiento · Asistente de investigación",
        },
        {
          cls: "wwa-phil-4",
          icon: "update",
          color: "var(--lp-tertiary)",
          title: "Memoria a largo plazo",
          body: "No estudiamos para el examen. Estudiamos para la vida. La repetición espaciada convierte lo aprendido hoy en intuición mañana.",
          tag: "Motor de memoria · Repetición espaciada",
        },
      ];

  const masterySteps = en
    ? [
        {
          n: "1",
          color: "var(--lp-primary)",
          title: "Deep understanding",
          body: "Before you store anything, you need to understand it. Upload a PDF, notes or a hard topic and Neuvra turns it into a conversation that adapts to your level.",
          tags: ["AI Tutor", "Step-by-step explanations", "Research assistant", "PDF analysis"],
        },
        {
          n: "2",
          color: "var(--lp-tertiary)",
          title: "Intelligent synthesis",
          body: "Once you understand, Neuvra helps you condense. Structured summaries, Smart Notes and review-ready flashcards all come from the same source.",
          tags: ["PDF summaries", "Smart Notes", "Auto flashcards", "Key concepts"],
        },
        {
          n: "3",
          color: "var(--lp-secondary)",
          title: "Evolving memory",
          body: "You are not studying for one exam. The Memory Engine tracks forgetting and surfaces the right material at the exact moment you need it.",
          tags: ["Memory engine", "Spaced repetition", "Forgetting curve", "Review training"],
        },
      ]
    : [
        {
          n: "1",
          color: "var(--lp-primary)",
          title: "Comprensión profunda",
          body: "Antes de guardar algo, primero hay que entenderlo. Subís un PDF, apuntes o un tema difícil, y Neuvra lo convierte en una conversación que se adapta a tu nivel.",
          tags: ["Tutor IA", "Explicaciones paso a paso", "Asistente de investigación", "Análisis de PDFs"],
        },
        {
          n: "2",
          color: "var(--lp-tertiary)",
          title: "Síntesis inteligente",
          body: "Una vez que entendés, Neuvra te ayuda a condensar. Resúmenes estructurados, Smart Notes y flashcards listas para repasar nacen de la misma fuente.",
          tags: ["Resúmenes PDF", "Smart Notes", "Flashcards automáticas", "Conceptos clave"],
        },
        {
          n: "3",
          color: "var(--lp-secondary)",
          title: "Memoria evolutiva",
          body: "No estudiás para un examen aislado. El Motor de Memoria rastrea el olvido y trae el material correcto justo cuando lo necesitás.",
          tags: ["Motor de memoria", "Repetición espaciada", "Curva del olvido", "Entrenamiento de repaso"],
        },
      ];

  const featureCards = en
    ? [
        {
          cls: "wwa-b-tutor wwa-bcard",
          icon: "smart_toy",
          color: "var(--lp-primary-ctr)",
          title: "AI Tutor",
          body: "Explains like a teacher, not like a chatbot. It starts from your material and walks with you until the concept clicks.",
          accent: false,
          extra: (
            <div style={{ marginTop: 6, padding: 14, borderRadius: 16, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize: "0.76rem", color: "var(--lp-muted)", marginBottom: 8 }}>“I do not understand mitosis vs meiosis.”</div>
              <div style={{ fontSize: "0.82rem", color: "#fff", lineHeight: 1.55 }}>
                “Think of mitosis as photocopying, and meiosis as shuffling a deck to create unique combinations.”
              </div>
            </div>
          ),
        },
        {
          cls: "wwa-b-notes wwa-bcard",
          icon: "edit_note",
          color: "var(--lp-primary)",
          title: "Smart Notes",
          body: "Neuvra organizes your notes into a connected knowledge base instead of isolated fragments.",
        },
        {
          cls: "wwa-b-pdf wwa-bcard",
          icon: "picture_as_pdf",
          color: "var(--lp-tertiary)",
          title: "PDF Summaries",
          body: "Upload dense documents and get the methods, concepts and conclusions that actually matter.",
        },
        {
          cls: "wwa-b-flash wwa-bcard wwa-bcard--accent",
          icon: "style",
          color: "var(--lp-primary)",
          title: "AI Flashcards",
          body: "One click turns the same source into flashcards ready for spaced review.",
        },
        {
          cls: "wwa-b-memory wwa-bcard",
          icon: "memory",
          color: "var(--lp-secondary)",
          title: "Memory Engine",
          body: "Tracks your forgetting curve and surfaces the exact review you need before the memory fades.",
        },
        {
          cls: "wwa-b-research wwa-bcard",
          icon: "search_insights",
          color: "var(--lp-secondary)",
          title: "Research Assistant",
          body: "Upload papers, DOIs or folders and Neuvra extracts methodology, findings and citations into structured output.",
        },
      ]
    : [
        {
          cls: "wwa-b-tutor wwa-bcard",
          icon: "smart_toy",
          color: "var(--lp-primary-ctr)",
          title: "Tutor IA",
          body: "Explica como un profesor, no como un chatbot. Parte de tu material y camina con vos hasta que el concepto hace clic.",
          accent: false,
          extra: (
            <div style={{ marginTop: 6, padding: 14, borderRadius: 16, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize: "0.76rem", color: "var(--lp-muted)", marginBottom: 8 }}>“No entiendo mitosis vs meiosis.”</div>
              <div style={{ fontSize: "0.82rem", color: "#fff", lineHeight: 1.55 }}>
                “Pensalo así: mitosis es fotocopiar, meiosis es mezclar un mazo para crear combinaciones únicas.”
              </div>
            </div>
          ),
        },
        {
          cls: "wwa-b-notes wwa-bcard",
          icon: "edit_note",
          color: "var(--lp-primary)",
          title: "Smart Notes",
          body: "Neuvra organiza tus notas como una base de conocimiento conectada, no como fragmentos aislados.",
        },
        {
          cls: "wwa-b-pdf wwa-bcard",
          icon: "picture_as_pdf",
          color: "var(--lp-tertiary)",
          title: "Resúmenes PDF",
          body: "Subís documentos densos y recibís los métodos, conceptos y conclusiones que realmente importan.",
        },
        {
          cls: "wwa-b-flash wwa-bcard wwa-bcard--accent",
          icon: "style",
          color: "var(--lp-primary)",
          title: "Flashcards IA",
          body: "Un click convierte la misma fuente en flashcards listas para repaso espaciado.",
        },
        {
          cls: "wwa-b-memory wwa-bcard",
          icon: "memory",
          color: "var(--lp-secondary)",
          title: "Motor de Memoria",
          body: "Rastrea tu curva del olvido y te trae el repaso exacto antes de que la memoria se apague.",
        },
        {
          cls: "wwa-b-research wwa-bcard",
          icon: "search_insights",
          color: "var(--lp-secondary)",
          title: "Asistente de Investigación",
          body: "Subís papers, DOIs o carpetas y Neuvra extrae metodología, hallazgos y citas en una salida estructurada.",
        },
      ];

  return (
    <div className="wwa-page">
      <header className="landing-topbar" role="banner">
        <div className="wrap">
          <Link href="/" className="lp-brand" aria-label="Neuvra AI">
            <Image
              src="/logo.jpeg"
              alt=""
              width={28}
              height={28}
              className="lp-brand-icon"
              aria-hidden="true"
            />
            Neuvra
          </Link>

          <nav className="nav" aria-label={en ? "Main navigation" : "Navegacion principal"}>
            <Link href="/#journey" className="lp-nav-link">
              {nav.howItWorks}
            </Link>
            <Link href={aboutHref} className="lp-nav-link">
              {l.whoWeAreTitle}
            </Link>
            <Link href="/#pricing" className="lp-nav-link">
              {en ? "Pricing" : "Precios"}
            </Link>
          </nav>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {auth.signedIn ? (
              <div className="topbar-user">
                <span className="topbar-user-avatar">
                  {auth.name ? auth.name[0].toUpperCase() : auth.email[0].toUpperCase()}
                </span>
                <span className="topbar-user-email">{auth.email}</span>
                <button type="button" className="topbar-signout" onClick={signOut}>
                  {en ? "Sign out" : "Salir"}
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="lp-btn lp-btn--primary lp-btn--nav"
                onClick={openModal}
                aria-label={en ? "Sign in to Neuvra" : "Iniciar sesion en Neuvra"}
              >
                {en ? "Sign in" : "Iniciar sesion"}
              </button>
            )}
            <ColorModeToggle />
            <LangToggle />
          </div>
        </div>
      </header>

      <main>
        <section
          className="wwa-section"
          aria-labelledby="who-we-are-heading"
          style={{ overflow: "hidden", textAlign: "center", paddingTop: 140, paddingBottom: 72 }}
        >
          {/* Ambient glow */}
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(ellipse at 50% -10%, rgba(124,58,237,0.20) 0%, rgba(59,130,246,0.10) 40%, transparent 70%)",
              pointerEvents: "none",
            }}
          />

          <div
            className="wrap"
            style={{ position: "relative", zIndex: 1, maxWidth: 720, textAlign: "center" }}
          >
            {/* Hero is always in viewport — skip lp-reveal to prevent flash of invisible content */}
            <span className="lp-eyebrow" style={{ display: "inline-flex" }}>
              {l.aboutPageEyebrow}
            </span>

            <p
              className="lp-label"
              style={{ color: "var(--lp-primary)", margin: "20px 0 16px" }}
            >
              {l.aboutPageStatement}
            </p>

            <WordReveal text={l.whoWeAreTitle} className="lp-h1" />

            <p
              style={{
                margin: "22px auto 0",
                maxWidth: 600,
                color: "var(--lp-muted)",
                lineHeight: 1.75,
                fontSize: "1.02rem",
              }}
            >
              {l.aboutPageIntro}
            </p>

            <div style={{ marginTop: 36, display: "flex", justifyContent: "center" }}>
              <Link href="/" className="lp-btn lp-btn--ghost">
                {l.backToHome}
              </Link>
            </div>
          </div>
        </section>

        <ManifestoSection lang={lang} />

        <section className="lp-section" aria-labelledby="problem-heading">
          <div className="wrap">
            <div className="lp-problem-grid">
              <Reveal>
                <span className="lp-eyebrow" style={{ marginBottom: 20, display: "inline-flex" }}>
                  {en ? "The real problem" : "El problema real"}
                </span>
                <h2 id="problem-heading" className="lp-h2" style={{ marginBottom: 16 }}>
                  {en ? (
                    <>
                      The problem is not that you study too little.
                      <br />
                      It is that you study <span className="lp-grad-text">without structure.</span>
                    </>
                  ) : (
                    <>
                      El problema no es que estudiás poco.
                      <br />
                      Es que estudiás <span className="lp-grad-text">sin estructura.</span>
                    </>
                  )}
                </h2>
                <p className="lp-body" style={{ marginBottom: 32, maxWidth: 470 }}>
                  {en
                    ? "Education taught most people to become containers of information, not builders of knowledge. Information without connection is noise."
                    : "El sistema educativo nos enseñó a ser contenedores de información, no constructores de conocimiento. La información sin conexión es ruido."}
                </p>
                <ul className="lp-problem-pain-list" aria-label={en ? "Common study problems" : "Problemas comunes al estudiar"}>
                  {problems.map((item, i) => (
                    <li key={i} className="lp-problem-pain-item">
                      <div className="lp-problem-pain-icon" aria-hidden="true">
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                          {item.icon}
                        </span>
                      </div>
                      <p className="lp-problem-pain-text">{item.text}</p>
                    </li>
                  ))}
                </ul>
              </Reveal>

              <Reveal>
                <div className="lp-problem-solution">
                  <span className="lp-eyebrow" style={{ marginBottom: 20, display: "inline-flex" }}>
                    {en ? "The Neuvra way" : "El camino Neuvra"}
                  </span>
                  <h3 className="lp-h3" style={{ marginBottom: 14, fontSize: "1.3rem" }}>
                    {en
                      ? "One connected system from first reading to long-term memory."
                      : "Un sistema conectado desde la primera lectura hasta la memoria a largo plazo."}
                  </h3>
                  <p className="lp-body" style={{ fontSize: "0.92rem", marginBottom: 28 }}>
                    {en
                      ? "Neuvra replaces disconnected tools with one flow where explanation, synthesis and memory reinforce each other."
                      : "Neuvra reemplaza herramientas desconectadas por un flujo único donde explicación, síntesis y memoria se refuerzan entre sí."}
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }} aria-hidden="true">
                    {(en
                      ? [
                          { icon: "upload_file", label: "Upload anything", sub: "PDF, notes, paper, transcript" },
                          { icon: "smart_toy", label: "AI explains it", sub: "Step by step, adapted to you" },
                          { icon: "style", label: "Flashcards are created", sub: "From the exact same source" },
                          { icon: "update", label: "Memory follows up", sub: "Reviews appear before you forget" },
                        ]
                      : [
                          { icon: "upload_file", label: "Subís cualquier cosa", sub: "PDF, apuntes, paper, transcripción" },
                          { icon: "smart_toy", label: "La IA lo explica", sub: "Paso a paso, adaptado a vos" },
                          { icon: "style", label: "Se crean flashcards", sub: "Desde la misma fuente" },
                          { icon: "update", label: "La memoria te sigue", sub: "Los repasos aparecen antes del olvido" },
                        ]).map((row, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(124,58,237,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 18, color: "var(--lp-primary)" }}>
                            {row.icon}
                          </span>
                        </div>
                        <div>
                          <span style={{ fontSize: "0.84rem", fontWeight: 600, color: "#fff", display: "block" }}>{row.label}</span>
                          <span style={{ fontSize: "0.74rem", color: "var(--lp-muted)" }}>{row.sub}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        <section className="wwa-section" aria-labelledby="philosophy-heading">
          <div className="wrap" style={{ maxWidth: 1180 }}>
            <Reveal className="lp-section-header">
              <span className="lp-eyebrow" style={{ marginBottom: 16, display: "inline-flex" }}>
                {en ? "How we think" : "Cómo pensamos"}
              </span>
              <h2 id="philosophy-heading" className="lp-h2">
                {en ? "Our Philosophy" : "Nuestra Filosofía"}
              </h2>
              <p className="lp-body" style={{ marginTop: 14 }}>
                {en
                  ? "Principles that guide every product and learning decision inside Neuvra."
                  : "Principios que guían cada decisión de producto y aprendizaje dentro de Neuvra."}
              </p>
            </Reveal>

            <Reveal>
              <div className="wwa-phil-grid">
                {philosophyCards.map((card) => (
                  <article key={card.title} className={`wwa-glass ${card.cls}`}>
                    <span className="material-symbols-outlined" style={{ color: card.color, fontSize: 36, marginBottom: 16 }} aria-hidden="true">
                      {card.icon}
                    </span>
                    <h3 className="lp-h3" style={{ marginBottom: 12 }}>{card.title}</h3>
                    <p className="lp-body" style={{ fontSize: "0.96rem", lineHeight: 1.7, marginBottom: 16 }}>{card.body}</p>
                    <span className="wwa-feat-tag" style={{ alignSelf: "flex-start" }}>{card.tag}</span>
                  </article>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        <section className="wwa-section wwa-section--darkest" aria-labelledby="mastery-heading">
          <div className="wrap" style={{ maxWidth: 820 }}>
            <Reveal className="lp-section-header">
              <span className="lp-eyebrow" style={{ marginBottom: 16, display: "inline-flex" }}>
                {en ? "How it works" : "Cómo funciona"}
              </span>
              <h2 id="mastery-heading" className="lp-h2">
                {en ? "The Mastery Circle" : "El Círculo de la Maestría"}
              </h2>
              <p className="lp-body" style={{ marginTop: 14 }}>
                {en
                  ? "Three stages that feed each other. Not a checklist, but a continuous cycle of deeper learning."
                  : "Tres etapas que se alimentan entre sí. No es una checklist, sino un ciclo continuo de aprendizaje más profundo."}
              </p>
            </Reveal>

            <Reveal>
              <div className="wwa-timeline">
                {masterySteps.map((step) => (
                  <div key={step.n} className="wwa-timeline-item">
                    <div
                      className="wwa-timeline-dot"
                      style={{ border: `2px solid ${step.color}`, color: step.color, background: "var(--lp-bg)" }}
                      aria-hidden="true"
                    >
                      {step.n}
                    </div>
                    <div>
                      <h3 className="lp-h3" style={{ color: step.color, marginBottom: 10 }}>{step.title}</h3>
                      <p className="lp-body" style={{ fontSize: "0.98rem", lineHeight: 1.75, margin: 0 }}>{step.body}</p>
                      <div className="wwa-feat-tags">
                        {step.tags.map((tag) => (
                          <span key={tag} className="wwa-feat-tag">{tag}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        <section className="wwa-section" aria-labelledby="features-heading">
          <div className="wrap">
            <Reveal className="lp-section-header">
              <span className="lp-eyebrow" style={{ marginBottom: 16, display: "inline-flex" }}>
                {en ? "The system in action" : "El sistema en acción"}
              </span>
              <h2 id="features-heading" className="lp-h2">
                {en ? "What Neuvra does for you" : "Lo que Neuvra hace por vos"}
              </h2>
              <p className="lp-body" style={{ marginTop: 14 }}>
                {en ? "Six interconnected capabilities. One single learning flow." : "Seis capacidades interconectadas. Un único flujo de aprendizaje."}
              </p>
            </Reveal>

            <Reveal>
              <div className="wwa-bento">
                {featureCards.map((card) => (
                  <article key={card.title} className={card.cls}>
                    <div style={{ width: 46, height: 46, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", background: `${card.color}22`, color: card.color }}>
                      <span className="material-symbols-outlined" aria-hidden="true">{card.icon}</span>
                    </div>
                    <h3 className="lp-h3" style={{ fontSize: "1.1rem" }}>{card.title}</h3>
                    <p className="lp-body" style={{ fontSize: "0.92rem", lineHeight: 1.7, margin: 0 }}>{card.body}</p>
                    {card.extra ?? null}
                  </article>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        <section className="lp-section lp-section--dim" aria-labelledby="closing-heading">
          <div className="wrap">
            <Reveal className="lp-closing">
              <div className="lp-closing-divider" aria-hidden="true" />
              <h2 id="closing-heading" className="lp-closing-quote">
                {en ? (
                  <>
                    More than a platform,
                    <br />
                    a new <em>relationship</em> with knowledge.
                  </>
                ) : (
                  <>
                    Más que una plataforma,
                    <br />
                    una nueva <em>relación</em> con el conocimiento.
                  </>
                )}
              </h2>
              <p className="lp-closing-sub">
                {en
                  ? "When a student stops feeling anxiety in front of the unknown and starts feeling curiosity, our work is done."
                  : "Cuando un estudiante deja de sentir ansiedad ante lo desconocido y empieza a sentir curiosidad, nuestro trabajo está hecho."}
              </p>
              <Link href="/estudio" className="lp-btn lp-btn--primary">
                {l.ctaPrimary}
              </Link>
            </Reveal>
          </div>
        </section>
      </main>

      <footer className="lp-footer" style={{ borderTop: "1px solid rgba(255,255,255,0.07)", padding: "64px 32px" }}>
        <div className="wrap" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 32 }}>
          <div>
            <span className="lp-brand" style={{ display: "inline-block", marginBottom: 12 }}>Neuvra</span>
            <p style={{ color: "var(--lp-muted)", fontSize: "0.9rem", lineHeight: 1.7, marginBottom: 18 }}>
              {l.footerTagline}
            </p>
            <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.76rem", margin: 0 }}>
              © {year} Neuvra AI. {l.footerRights}
            </p>
          </div>

          <div>
            <h4 className="lp-label" style={{ color: "#fff", marginBottom: 16 }}>{l.footerProduct}</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Link href="/investigacion" className="lp-nav-link">{en ? "Research" : "Investigación"}</Link>
              <Link href="/estudio" className="lp-nav-link">{en ? "Study" : "Estudio"}</Link>
              <Link href="/#pricing" className="lp-nav-link">{en ? "Pricing" : "Precios"}</Link>
            </div>
          </div>

          <div>
            <h4 className="lp-label" style={{ color: "#fff", marginBottom: 16 }}>{l.footerCompany}</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Link href={aboutHref} className="lp-nav-link">{l.footerAbout}</Link>
              <a href="mailto:neuvraai@gmail.com" className="lp-nav-link">{l.footerContact}</a>
            </div>
          </div>

          <div>
            <h4 className="lp-label" style={{ color: "#fff", marginBottom: 16 }}>{l.footerLegal}</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <span className="lp-nav-link">{l.footerPrivacy}</span>
              <span className="lp-nav-link">{l.footerTerms}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
