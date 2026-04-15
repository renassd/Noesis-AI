"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

/* ─── DATA ─── */
const researchFeatures = [
  {
    title: "Resumí papers al instante",
    description:
      "Subí un PDF o pegá un DOI y obtené métodos, hallazgos, limitaciones y conclusiones en lenguaje claro — en segundos.",
  },
  {
    title: "Generá revisiones de literatura",
    description:
      "Convertí una pregunta de investigación en un panorama estructurado de temas, acuerdos clave y brechas de evidencia.",
  },
  {
    title: "Encontrá papers desde un prompt",
    description:
      "Preguntá en lenguaje natural y obtené papers relevantes, direcciones de investigación y puntos de partida sólidos — sin saber usar bases de datos académicas.",
  },
  {
    title: "Organizá tu escritura académica",
    description:
      "Obtené ayuda para estructurar manuscritos, secciones de discusión, resúmenes y el hilo argumental con lenguaje científico más claro.",
  },
];

const studyFeatures = [
  {
    title: "Generá flashcards con IA",
    description:
      "Transformá papers, clases, PDFs y apuntes en tarjetas de pregunta y respuesta listas para repasar — en un solo paso.",
  },
  {
    title: "Explicame este tema",
    description:
      "Activá el modo tutor para obtener explicaciones más simples, recorridos guiados, analogías y ejercicios de recuerdo activo.",
  },
  {
    title: "Extraé los conceptos clave",
    description:
      "Identificá definiciones, marcos conceptuales y anclas de memoria de cualquier material — para estudiar lo que realmente importa.",
  },
  {
    title: "Creá y gestioná tus propios mazos",
    description:
      "Los usuarios avanzados pueden construir, etiquetar y organizar mazos manualmente mientras la IA completa los vacíos automáticamente.",
  },
];

const reportPoints = [
  "Resumidos hallazgos recientes en psicología cognitiva y neurociencia.",
  "Comparados estudios de aula, experimentos de laboratorio y metodologías en conflicto.",
  "Generada una revisión de literatura con clusters de evidencia y brechas de investigación abiertas.",
];

const studyOutputs = [
  { label: "Tarjeta 01", text: "¿Qué rol cumple el sueño de ondas lentas en la consolidación de la memoria?" },
  { label: "Tarjeta 02", text: "¿Por qué los estudios de sueño en estudiantes suelen arrojar resultados contradictorios?" },
  { label: "Modo tutor", text: "Explicame el tema de forma simple y luego evaluame en los puntos débiles." },
];

const steps = [
  { title: "1. Pegá o escribí tu texto", text: "Empezá con una pregunta de investigación, un paper, tus apuntes de clase o un fragmento de libro." },
  { title: "2. Entendé el material", text: "Generá resúmenes, revisiones de literatura o explicaciones simples antes de intentar memorizar cualquier cosa." },
  { title: "3. Extraé lo que importa", text: "La IA identifica conceptos clave, definiciones y áreas débiles del mismo material que leíste." },
  { title: "4. Convertilo en repaso", text: "Generá flashcards y mazos desde la misma fuente — sin copiar y pegar entre herramientas." },
];

const compareCards = [
  {
    label: "Herramientas de investigación",
    price: "$49/mes",
    description: "Asistente de investigación con IA independiente.",
    items: ["Excelente para descubrir fuentes y generar reportes", "No está pensado para la memorización", "Necesitás una segunda herramienta para estudiar"],
  },
  {
    label: "Herramientas de flashcards",
    price: "$30/año",
    description: "Flujo de flashcards independiente.",
    items: ["Excelente para la repetición espaciada a largo plazo", "Ayuda de investigación muy limitada", "Creación manual de tarjetas para la mayoría"],
  },
  {
    label: "Noesis AI",
    price: "Todo en uno",
    description: "Investigación, explicación, tutoría y flashcards — todo en un flujo conectado.",
    items: ["Preguntá, entendé y luego recordá", "De la investigación al repaso sin cambiar de app", "Hecho para estudiantes e investigadores académicos"],
    featured: true,
  },
];

/* ─── SCROLL REVEAL ─── */
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
      { threshold: 0.12, rootMargin: "0px 0px -48px 0px" }
    );
    els.forEach((el) => observer.observe(el));
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

/* ─── PAGE ─── */
export default function HomePage() {
  useScrollReveal();
  useTopbarScroll();

  return (
    <>
      <header className="topbar">
        <div className="wrap">
          <a href="#home" className="brand">
            <span className="brand-mark" aria-hidden="true">
              <Image src="/logo.jpeg" alt="Logo de Noesis AI" width={50} height={50} />
            </span>
            <span className="brand-text">
              <small>Investigación + Retención</small>
              <span>Noesis AI</span>
            </span>
          </a>

          <div className="nav-group">
            <nav className="nav">
              <a href="#research">Investigación</a>
              <a href="#study">Estudio</a>
              <a href="#workflow">Cómo funciona</a>
              <Link href="/workspace" className="cta-link">
                Abrir la app →
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main id="home">
        {/* ─── HERO ─── */}
        <section className="hero">
          <div className="wrap hero-shell">
            <article className="hero-copy reveal">
              <span className="eyebrow">IA para investigar, entender y memorizar</span>
              <h1>El compañero de estudio para quienes investigan en serio.</h1>
              <p>
                Entendé cualquier tema en minutos y convertí ese entendimiento en resúmenes,
                flashcards y flujos de repaso. Noesis AI conecta la profundidad de un asistente
                de investigación con el poder de retención de una herramienta de estudio — todo
                en un solo lugar.
              </p>
              <div className="action-row">
                <Link className="button primary" href="/workspace">
                  Empezar gratis →
                </Link>
                <a className="button secondary" href="#workflow">
                  Ver cómo funciona
                </a>
              </div>
              <div className="hero-proof">
                <div className="proof-card">
                  <strong>Investigación primero</strong>
                  <span>Resumí papers, generá revisiones de literatura y encontrá fuentes desde un prompt.</span>
                </div>
                <div className="proof-card">
                  <strong>Retención incluida</strong>
                  <span>Convertí cualquier output en flashcards y mazos listos para repasar.</span>
                </div>
                <div className="proof-card">
                  <strong>Un solo flujo</strong>
                  <span>De la pregunta al mazo sin cambiar de pestaña ni copiar texto entre apps.</span>
                </div>
              </div>
            </article>

            <article className="hero-product reveal reveal-delay-2">
              <div className="product-bar">
                <div className="dots" aria-hidden="true"><span /><span /><span /></div>
                <div>noesis.ai / espacio de trabajo</div>
              </div>
              <div className="product-body">
                <aside className="left-nav">
                  <div>
                    <span className="mini-label">Investigación</span>
                    <div className="tool-stack top-space">
                      <div className="tool active">Reporte de investigación</div>
                      <div className="tool">Resumen de paper</div>
                      <div className="tool">Revisión de literatura</div>
                      <div className="tool">Explicar concepto</div>
                    </div>
                  </div>
                  <div>
                    <span className="mini-label">Estudio</span>
                    <div className="tool-stack top-space">
                      <div className="tool">Generar flashcards</div>
                      <div className="tool">Repasar flashcards</div>
                      <div className="tool">Modo tutor</div>
                      <div className="tool">Mis mazos</div>
                    </div>
                  </div>
                </aside>
                <div className="workspace">
                  <div className="workspace-top">
                    <h3>Sueño y consolidación de la memoria</h3>
                    <span className="pill">Activo</span>
                  </div>
                  <p className="workspace-copy">
                    Analizando 14 papers en psicología cognitiva y neurociencia.
                    Generando revisión de literatura con clusters de evidencia.
                  </p>
                  <div className="workspace-panels">
                    <div className="panel">
                      <span className="mini-label">Output de investigación</span>
                      <h4>¿Cómo afecta el sueño la consolidación de la memoria en estudiantes?</h4>
                      <div className="report-list top-space">
                        {reportPoints.map((point) => <div key={point}>{point}</div>)}
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

        {/* ─── FEATURES ─── */}
        <section id="research">
          <div className="wrap">
            <div className="section-header reveal">
              <div>
                <h2>Investigación y retención, por fin en un solo producto.</h2>
                <p>
                  La mayoría de los estudiantes malabarean una herramienta para investigar y otra
                  para memorizar. Noesis AI conecta los dos lados — para que vayas de la pregunta
                  al mazo listo para repasar sin cambiar de pestaña.
                </p>
              </div>
            </div>
            <div className="feature-rail reveal">
              <div className="feature-grid">
                <article className="feature-card">
                  <div className="feature-top">
                    <div>
                      <span className="mini-label">Flujos académicos</span>
                      <h3 className="space-top-sm">Investigación</h3>
                    </div>
                    <span className="compare-label">Motor de investigación</span>
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
                      <span className="mini-label">Flujos de retención</span>
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

        {/* ─── WORKFLOW ─── */}
        <section id="workflow">
          <div className="wrap">
            <div className="section-header reveal">
              <div>
                <h2>Un solo flujo, de la pregunta al repaso.</h2>
                <p>
                  En lugar de leer un paper en una app y construir flashcards en otra, Noesis AI
                  mantiene tu investigación y tu repaso en el mismo lugar — para que cada output
                  esté a un clic de convertirse en algo que podés estudiar.
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
                      Investigación y estudio comparten el mismo canvas.
                    </h3>
                  </div>
                  <div className="workflow-canvas">
                    <div className="canvas-row">
                      <div className="canvas-box">
                        <strong>Modo investigación</strong>
                        <span>Resumí papers, revisá literatura, explicá conceptos y estructurá escritura.</span>
                      </div>
                      <div className="canvas-box">
                        <strong>Canvas principal</strong>
                        <span>Espacio enfocado para prompts, reportes generados y comparación de evidencia.</span>
                      </div>
                    </div>
                    <div className="canvas-row">
                      <div className="canvas-box">
                        <strong>Modo estudio</strong>
                        <span>Generá flashcards, repassá mazos, usá el modo tutor y gestioná tus decks.</span>
                      </div>
                      <div className="canvas-box">
                        <strong>Output de repaso</strong>
                        <span>Convertí cualquier explicación en flashcards o mazos de estudio en un clic.</span>
                      </div>
                    </div>
                  </div>
                </article>
              </div>
            </div>
          </div>
        </section>

        {/* ─── PRICING / COMPARE ─── */}
        <section id="pricing">
          <div className="wrap">
            <div className="pricing-shell reveal">
              <div className="section-header section-tight">
                <div>
                  <h2>¿Por qué pagar dos herramientas si una hace las dos cosas?</h2>
                  <p>
                    El asistente de investigación que ya usás cuesta más que Noesis AI — y no te
                    ayuda a recordar nada. Construimos la capa que faltaba entre entender y retener.
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
                      {card.items.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ─── CTA FINAL ─── */}
        <section className="waitlist-section">
          <div className="wrap">
            <div className="waitlist-shell reveal">
              <span className="eyebrow" style={{ margin: "0 auto" }}>Disponible ahora</span>
              <h2>Entendé primero. Recordá después.<br />Las dos cosas en un solo lugar.</h2>
              <p>
                Noesis AI no es solo otra app de flashcards ni otro asistente de investigación con IA.
                Es la capa que conecta la comprensión, la síntesis y la memoria — construida para
                estudiantes e investigadores que se toman el aprendizaje en serio.
              </p>
              <Link className="button primary" href="/workspace" style={{ margin: "0 auto" }}>
                Empezar gratis, ahora →
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ─── FOOTER ─── */}
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
                Investigación y retención en un flujo conectado. Hecho para estudiantes e
                investigadores que quieren entender primero y recordar después.
              </p>
            </div>
            <div className="footer-links-grid">
              <div className="footer-col">
                <h4>Producto</h4>
                <a href="#research">Herramientas de investigación</a>
                <a href="#study">Herramientas de estudio</a>
                <a href="#workflow">Cómo funciona</a>
                <Link href="/workspace">Abrir la app</Link>
              </div>
              <div className="footer-col">
                <h4>Empresa</h4>
                <a href="#">Nosotros</a>
                <a href="#">Blog</a>
                <a href="#">Contacto</a>
              </div>
              <div className="footer-col">
                <h4>Legal</h4>
                <a href="#">Política de privacidad</a>
                <a href="#">Términos de uso</a>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© {new Date().getFullYear()} Noesis AI. Todos los derechos reservados.</span>
            <div className="footer-social">
              <a href="#" aria-label="Twitter">𝕏</a>
              <a href="#" aria-label="WhatsApp">wa</a>
              <a href="#" aria-label="Instagram">ig</a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
