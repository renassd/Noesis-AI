"use client";

import Image from "next/image";
import { AuthActions } from "../components/auth-actions";
import { useEffect, useState } from "react";
import WorkspaceApp from "./WorkspaceApp";

type Tool = "generate" | "study" | "tutor" | "research" | "decks";

const researchFeatures = [
  {
    title: "Resumi papers al instante",
    description:
      "Subi un PDF o pega un DOI y obtene metodos, hallazgos, limitaciones y conclusiones en lenguaje claro en segundos.",
  },
  {
    title: "Genera revisiones de literatura",
    description:
      "Converti una pregunta de investigacion en un panorama estructurado de temas, acuerdos clave y brechas de evidencia.",
  },
  {
    title: "Encontra papers desde un prompt",
    description:
      "Pregunta en lenguaje natural y obtene papers relevantes, direcciones de investigacion y puntos de partida solidos.",
  },
  {
    title: "Organiza tu escritura academica",
    description:
      "Obtene ayuda para estructurar manuscritos, secciones de discusion, resumenes y el hilo argumental con lenguaje cientifico mas claro.",
  },
];

const studyFeatures = [
  {
    title: "Genera flashcards con IA",
    description:
      "Transforma papers, clases, PDFs y apuntes en tarjetas de pregunta y respuesta listas para repasar en un solo paso.",
  },
  {
    title: "Explicame este tema",
    description:
      "Activa el modo tutor para obtener explicaciones mas simples, recorridos guiados, analogias y ejercicios de recuerdo activo.",
  },
  {
    title: "Extrae los conceptos clave",
    description:
      "Identifica definiciones, marcos conceptuales y anclas de memoria de cualquier material para estudiar lo que realmente importa.",
  },
  {
    title: "Crea y gestiona tus propios mazos",
    description:
      "Los usuarios avanzados pueden construir, etiquetar y organizar mazos manualmente mientras la IA completa los vacios automaticamente.",
  },
];

const reportPoints = [
  "Resumidos hallazgos recientes en psicologia cognitiva y neurociencia.",
  "Comparados estudios de aula, experimentos de laboratorio y metodologias en conflicto.",
  "Generada una revision de literatura con clusters de evidencia y brechas abiertas.",
];

const studyOutputs = [
  {
    label: "Tarjeta 01",
    text: "Que rol cumple el sueno de ondas lentas en la consolidacion de la memoria?",
  },
  {
    label: "Tarjeta 02",
    text: "Por que los estudios de sueno en estudiantes suelen arrojar resultados contradictorios?",
  },
  {
    label: "Modo tutor",
    text: "Explicame el tema de forma simple y luego evaluame en los puntos debiles.",
  },
];

const steps = [
  {
    title: "1. Pregunta o subi material",
    text: "Empieza con una pregunta de investigacion, un paper, tus apuntes de clase o un PDF completo de una conferencia.",
  },
  {
    title: "2. Entende el material",
    text: "Genera resumenes, revisiones de literatura o explicaciones simples antes de intentar memorizar cualquier cosa.",
  },
  {
    title: "3. Extrae lo que importa",
    text: "Identifica conceptos clave, definiciones, areas debiles y contenidos probables de examen del mismo material que leiste.",
  },
  {
    title: "4. Converti eso en repaso",
    text: "Crea flashcards, mini-quizzes y mazos de revision desde la misma fuente sin copiar y pegar entre herramientas.",
  },
];

const compareCards = [
  {
    label: "Herramientas de investigacion",
    price: "$20/mes",
    description: "Asistente de investigacion con IA independiente.",
    items: [
      "Excelente para descubrir fuentes y generar reportes",
      "No esta pensado para la memorizacion o retencion",
      "Los estudiantes igual necesitan una segunda herramienta",
    ],
  },
  {
    label: "Herramientas de flashcards",
    price: "$30/año",
    description: "Flujo de flashcards independiente.",
    items: [
      "Excelente para la repeticion espaciada a largo plazo",
      "Ayuda de investigacion o explicacion muy limitada",
      "Creacion manual de tarjetas para la mayoria",
    ],
  },
  {
    label: "Noesis AI",
    price: "Todo en uno",
    description:
      "Investigacion, explicacion, conceptos clave, tutoria y flashcards en un flujo conectado.",
    items: [
      "Pregunta, entende y luego recorda",
      "De la investigacion al repaso sin cambiar de app",
      "Hecho para estudiantes e investigadores academicos",
    ],
    featured: true,
  },
];

function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (!email.includes("@")) {
      setError("Por favor ingresa un email valido.");
      return;
    }
    setError("");
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 900));
    setLoading(false);
    setDone(true);
  }

  return (
    <div>
      {!done ? (
        <>
          <div className="waitlist-form">
            <input
              className="waitlist-input"
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void handleSubmit()}
              disabled={loading}
            />
            <button className="waitlist-btn" onClick={() => void handleSubmit()} disabled={loading}>
              {loading ? "Uniendome..." : "Unirme a la lista ->"}
            </button>
          </div>
          {error && (
            <p style={{ fontSize: 13, color: "#d85a30", marginTop: 8, textAlign: "center" }}>
              {error}
            </p>
          )}
          <p className="waitlist-count">
            Ya hay <strong>412 estudiantes e investigadores</strong> esperando el acceso anticipado.
          </p>
        </>
      ) : (
        <div className="waitlist-success visible">
          Listo. Estas en la lista y te avisamos cuando abra el acceso anticipado.
        </div>
      )}
    </div>
  );
}

function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -48px 0px" },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

function useTopbarScroll() {
  useEffect(() => {
    const topbar = document.querySelector(".topbar");
    const onScroll = () => {
      topbar?.classList.toggle("scrolled", window.scrollY > 12);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
}

export default function HomePage() {
  const [activeTool, setActiveTool] = useState<Tool>("research");
  useScrollReveal();
  useTopbarScroll();

  function openWorkspaceTool(tool: Tool) {
    setActiveTool(tool);
    document.getElementById("workspace-shell")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <>
      <header className="topbar">
        <div className="wrap">
          <a href="#home" className="brand">
            <span className="brand-mark" aria-hidden="true">
              <Image src="/logo.jpeg" alt="Logo de Noesis AI" width={50} height={50} />
            </span>
            <span className="brand-text">
              <span>Noesis AI</span>
            </span>
          </a>

          <div className="nav-group">
            <nav className="nav">
              <a href="#research">Investigacion</a>
              <a href="#study">Estudio</a>
              <a href="#workflow">Flujo de trabajo</a>
              <a href="#workspace-live" className="cta-link">
                Usar la app
              </a>
            </nav>
            <AuthActions />
          </div>
        </div>
      </header>

      <main id="home">
        <section className="hero">
          <div className="wrap hero-shell">
            <article className="hero-copy reveal">
              <span className="eyebrow">Flujos de investigacion + herramientas de memoria</span>
              <h1>El compañero de estudio para quienes investigan.</h1>
              <p>
                Entende cualquier tema en minutos y converti ese entendimiento en resumenes,
                flashcards, mapas conceptuales y flujos de repaso. Noesis AI conecta la
                profundidad de un asistente de investigacion con el poder de retencion de una
                herramienta de estudio en un solo lugar.
              </p>
              <div className="action-row">
              <a className="button primary" href="#workspace-live">
                  Probar ahora {"->"}
              </a>
                <a className="button secondary" href="#workflow">
                  Ver el flujo de trabajo
                </a>
              </div>
              <div className="hero-proof">
                <div className="proof-card">
                  <strong>Investigacion primero</strong>
                  <span>
                    Encontra papers, resume evidencia, genera revisiones de literatura y estructura reportes academicos.
                  </span>
                </div>
                <div className="proof-card">
                  <strong>Retencion incluida</strong>
                  <span>
                    Convierte cualquier output en flashcards, explicaciones mas simples y mazos que podes repasar de verdad.
                  </span>
                </div>
                <div className="proof-card">
                  <strong>Se siente como una herramienta</strong>
                  <span>
                    Flujos guiados, paneles limpios y acciones de estudio enfocadas; no un chat generico.
                  </span>
                </div>
              </div>
            </article>

            <article className="hero-product reveal reveal-delay-2">
              <div className="product-bar">
                <div className="dots" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
                <div>studybuddy.ai / espacio de trabajo</div>
              </div>

              <div className="product-body">
                <aside className="left-nav">
                  <div>
                    <span className="mini-label">Investigacion</span>
                    <div className="tool-stack top-space">
                      <button type="button" className="tool active" onClick={() => openWorkspaceTool("research")}>
                        Reporte de investigacion
                      </button>
                      <button type="button" className="tool" onClick={() => openWorkspaceTool("research")}>
                        Resumen de paper
                      </button>
                      <button type="button" className="tool" onClick={() => openWorkspaceTool("research")}>
                        Encontrar papers
                      </button>
                      <button type="button" className="tool" onClick={() => openWorkspaceTool("research")}>
                        Revision de literatura
                      </button>
                    </div>
                  </div>
                  <div>
                    <span className="mini-label">Estudio</span>
                    <div className="tool-stack top-space">
                      <button type="button" className="tool" onClick={() => openWorkspaceTool("generate")}>
                        Flashcards
                      </button>
                      <button type="button" className="tool" onClick={() => openWorkspaceTool("tutor")}>
                        Explicame esto
                      </button>
                      <button type="button" className="tool" onClick={() => openWorkspaceTool("research")}>
                        Conceptos clave
                      </button>
                      <button type="button" className="tool" onClick={() => openWorkspaceTool("decks")}>
                        Mis mazos
                      </button>
                    </div>
                  </div>
                </aside>

                <div className="workspace">
                  <div className="workspace-top">
                    <h3>Sueno y consolidacion de la memoria</h3>
                    <span className="pill">Activo</span>
                  </div>
                  <p className="workspace-copy">
                    Analizando 14 papers en psicologia cognitiva y neurociencia.
                    Generando revision de literatura con clusters de evidencia.
                  </p>

                  <div className="workspace-panels">
                    <div className="panel">
                      <span className="mini-label">Output de investigacion</span>
                      <h4>Como afecta el sueno la consolidacion de la memoria en estudiantes?</h4>
                      <div className="report-list top-space">
                        {reportPoints.map((point) => (
                          <div key={point}>{point}</div>
                        ))}
                      </div>
                    </div>

                    <div className="panel">
                      <span className="mini-label">Output de estudio</span>
                      <div className="card-list top-space">
                        {studyOutputs.map((item) => (
                          <div key={item.label} className="micro-card">
                            <strong>{item.label}</strong>
                            {item.text}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </section>

        <section id="workspace-live">
          <div className="wrap">
            <div className="section-header reveal">
              <div>
                <h2>La app real, con el mismo lenguaje visual.</h2>
                <p>
                  Abajo esta el workspace funcional conectado al backend. Podes investigar, generar flashcards,
                  usar modo tutor y guardar mazos sin salir de la pagina.
                </p>
              </div>
            </div>
            <div className="reveal">
              <WorkspaceApp activeTool={activeTool} onToolChange={setActiveTool} />
            </div>
          </div>
        </section>

        <section id="research">
          <div className="wrap">
            <div className="section-header reveal">
              <div>
                <h2>Investigacion y retencion, por fin en un solo producto.</h2>
                <p>
                  La mayoria de los estudiantes malabarea una herramienta de investigacion para entender y otra app de flashcards para memorizar.
                  Noesis AI conecta los dos lados para que vayas de la pregunta al mazo listo para repasar sin cambiar de pestana.
                </p>
              </div>
            </div>

            <div className="feature-rail reveal">
              <div className="feature-grid">
                <article className="feature-card">
                  <div className="feature-top">
                    <div>
                      <span className="mini-label">Flujos academicos</span>
                      <h3 className="space-top-sm">Investigacion</h3>
                    </div>
                    <span className="compare-label">Motor de investigacion</span>
                  </div>
                  <div className="feature-list">
                    {researchFeatures.map((feature) => (
                      <div key={feature.title} className="feature-item">
                        <strong>{feature.title}</strong>
                        {feature.description}
                      </div>
                    ))}
                  </div>
                </article>

                <article className="feature-card" id="study">
                  <div className="feature-top">
                    <div>
                      <span className="mini-label">Flujos de retencion</span>
                      <h3 className="space-top-sm">Estudio</h3>
                    </div>
                    <span className="compare-label study">Motor de estudio</span>
                  </div>
                  <div className="feature-list">
                    {studyFeatures.map((feature) => (
                      <div key={feature.title} className="feature-item">
                        <strong>{feature.title}</strong>
                        {feature.description}
                      </div>
                    ))}
                  </div>
                </article>
              </div>
            </div>
          </div>
        </section>

        <section id="workflow">
          <div className="wrap">
            <div className="section-header reveal">
              <div>
                <h2>Un solo flujo, de la pregunta al repaso.</h2>
                <p>
                  En lugar de leer un paper en una app y construir flashcards en otra, Noesis AI mantiene tu investigacion y tu repaso en el mismo canvas para que cada output este a un clic de convertirse en algo que podes estudiar.
                </p>
              </div>
            </div>

            <div className="workflow-board reveal">
              <div className="workflow-grid">
                <article className="timeline-card">
                  <span className="mini-label">Camino de estudio</span>
                  <div className="timeline-list top-space">
                    {steps.map((step) => (
                      <div key={step.title} className="timeline-step">
                        <strong>{step.title}</strong>
                        {step.text}
                      </div>
                    ))}
                  </div>
                </article>

                <article className="workflow-card">
                  <div>
                    <span className="mini-label">Dentro de la app</span>
                    <h3 className="workflow-title">
                      El modo investigacion y el modo estudio comparten el mismo canvas.
                    </h3>
                  </div>
                  <div className="workflow-canvas">
                    <div className="canvas-row">
                      <div className="canvas-box">
                        <strong>Modo investigacion</strong>
                        <span>Resumen de paper, revision de literatura, reporte de investigacion, buscar fuentes.</span>
                      </div>
                      <div className="canvas-box">
                        <strong>Canvas principal</strong>
                        <span>Espacio de trabajo enfocado para subir archivos, prompts, reportes generados y comparacion de evidencia lado a lado.</span>
                      </div>
                    </div>
                    <div className="canvas-row">
                      <div className="canvas-box">
                        <strong>Modo estudio</strong>
                        <span>Flashcards, conceptos clave, modo tutor, resumenes simples, mis mazos.</span>
                      </div>
                      <div className="canvas-box">
                        <strong>Output de repaso</strong>
                        <span>Convierte cualquier explicacion o reporte en un set de recuerdo activo o mazo de estudio en un clic.</span>
                      </div>
                    </div>
                  </div>
                </article>
              </div>
            </div>
          </div>
        </section>

        <section id="pricing">
          <div className="wrap">
            <div className="pricing-shell reveal">
              <div className="section-header section-tight">
                <div>
                  <h2>Por que pagar dos herramientas si una hace las dos cosas?</h2>
                  <p>
                    El asistente de investigacion que ya usas cuesta mas que Noesis AI y no te ayuda a recordar nada.
                    Construimos la capa que faltaba entre entender y retener.
                  </p>
                </div>
              </div>

              <div className="pricing-grid">
                {compareCards.map((card) => (
                  <article
                    key={`${card.label}-${card.price}`}
                    className={`compare-card${card.featured ? " featured" : ""}`}
                  >
                    <span className="compare-label">{card.label}</span>
                    <div className="price">{card.price}</div>
                    <p>{card.description}</p>
                    <ul>
                      {card.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="waitlist" className="waitlist-section">
          <div className="wrap">
            <div className="waitlist-shell reveal">
              <span className="eyebrow" style={{ margin: "0 auto" }}>
                Acceso anticipado
              </span>
              <h2>
                Entende primero. Recorda despues.
                <br />
                Las dos cosas en un solo lugar.
              </h2>
              <p>
                Noesis AI no es solo otra app de flashcards ni otro asistente de investigacion con IA.
                Es la capa que conecta la comprension, la sintesis y la memoria construida para estudiantes e investigadores.
              </p>
              <WaitlistForm />
            </div>
          </div>
        </section>
      </main>

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
              <p className="footer-tagline">
                Investigacion y retencion en un flujo conectado. Hecho para estudiantes e investigadores que quieren entender primero y recordar despues.
              </p>
            </div>

            <div className="footer-links-grid">
              <div className="footer-col">
                <h4>Producto</h4>
                <a href="#research">Herramientas de investigacion</a>
                <a href="#study">Herramientas de estudio</a>
                <a href="#workflow">Como funciona</a>
                <a href="#workspace-live">Usar la app</a>
              </div>
              <div className="footer-col">
                <h4>Empresa</h4>
                <a href="#">Nosotros</a>
                <a href="#">Blog</a>
                <a href="#">Contacto</a>
              </div>
              <div className="footer-col">
                <h4>Legal</h4>
                <a href="#">Politica de privacidad</a>
                <a href="#">Terminos de uso</a>
              </div>
            </div>
          </div>

          <div className="footer-bottom">
            <span>{`© ${new Date().getFullYear()} Noesis AI. Todos los derechos reservados.`}</span>
            <div className="footer-social">
              <a href="#" aria-label="Twitter">X</a>
              <a href="#" aria-label="LinkedIn">in</a>
              <a href="#" aria-label="Instagram">ig</a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
