"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AuthActions } from "../components/auth-actions";
import WorkspaceApp from "./WorkspaceApp";

type Tool = "generate" | "study" | "tutor" | "research" | "decks";

const researchFeatures = [
  "Resumir papers y textos largos con hallazgos, limites y conclusiones.",
  "Armar revisiones de literatura con consensos, debates y brechas.",
  "Explicar conceptos complejos con lenguaje mas claro.",
  "Ayudar a estructurar escritura academica y reportes.",
];

const studyFeatures = [
  "Generar flashcards desde apuntes, papers o clases.",
  "Repasar mazos guardados con flujo de estudio rapido.",
  "Usar modo tutor para aprender un tema paso a paso.",
  "Gestionar y reutilizar mazos propios en un solo lugar.",
];

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
    const onScroll = () => topbar?.classList.toggle("scrolled", window.scrollY > 12);

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
              <Link href="/investigacion" className="nav-page-link">
                Investigacion
              </Link>
              <Link href="/estudio" className="nav-page-link">
                Estudio
              </Link>
              <a href="#workflow">Como funciona</a>
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
              <span className="eyebrow">Investigacion + estudio en un solo flujo</span>
              <h1>Noesis AI conecta entender y recordar.</h1>
              <p>
                Investiga, resume, explica y convierte ese material en flashcards o sesiones guiadas
                sin salir del mismo workspace.
              </p>

              <div className="action-row">
                <Link className="button primary" href="/estudio">
                  Empezar a estudiar -&gt;
                </Link>
                <Link className="button secondary" href="/investigacion">
                  Abrir investigacion
                </Link>
              </div>

              <div className="hero-proof">
                <div className="proof-card">
                  <strong>Investigacion primero</strong>
                  <span>Del paper o la pregunta a un resumen accionable en minutos.</span>
                </div>
                <div className="proof-card">
                  <strong>Retencion incluida</strong>
                  <span>Convierte cualquier output en tarjetas o tutorias guiadas.</span>
                </div>
                <div className="proof-card">
                  <strong>Workspace real</strong>
                  <span>Tambien puedes usar la app embebida abajo o abrir las pantallas dedicadas.</span>
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
                <div>noesis.ai / workspace</div>
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
                      <button type="button" className="tool" onClick={() => openWorkspaceTool("study")}>
                        Repasar
                      </button>
                      <button type="button" className="tool" onClick={() => openWorkspaceTool("tutor")}>
                        Modo tutor
                      </button>
                    </div>
                  </div>
                </aside>

                <div className="workspace">
                  <div className="workspace-top">
                    <h3>Workspace conectado para aprender mejor</h3>
                    <span className="pill">Activo</span>
                  </div>
                  <p className="workspace-copy">
                    Usa la landing para explorar y abre las rutas dedicadas si quieres enfocarte
                    solo en investigacion o solo en estudio.
                  </p>

                  <div className="workspace-panels">
                    <div className="panel">
                      <span className="mini-label">Investigacion</span>
                      <div className="report-list top-space">
                        {researchFeatures.slice(0, 3).map((item) => (
                          <div key={item}>{item}</div>
                        ))}
                      </div>
                    </div>

                    <div className="panel">
                      <span className="mini-label">Estudio</span>
                      <div className="card-list top-space">
                        {studyFeatures.slice(0, 3).map((item, index) => (
                          <div key={item} className="micro-card">
                            <strong>{`Paso 0${index + 1}`}</strong>
                            {item}
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
                <h2>Pruebalo ahora mismo.</h2>
                <p>
                  El workspace sigue embebido en la landing, pero ahora tambien tienes accesos
                  directos a <Link href="/investigacion">Investigacion</Link> y{" "}
                  <Link href="/estudio">Estudio</Link>.
                </p>
              </div>
              <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
                <Link className="button secondary" href="/investigacion" style={{ minHeight: 42, fontSize: 14 }}>
                  Abrir Investigacion -&gt;
                </Link>
                <Link className="button primary" href="/estudio" style={{ minHeight: 42, fontSize: 14 }}>
                  Abrir Estudio -&gt;
                </Link>
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
                <h2>Dos experiencias enfocadas, un mismo producto.</h2>
                <p>
                  La landing presenta el flujo completo y las paginas independientes te dejan entrar
                  directo al modo que necesitas.
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
                    <span className="compare-label">4 herramientas</span>
                  </div>
                  <div className="feature-list">
                    {researchFeatures.map((item) => (
                      <div key={item} className="feature-item">
                        {item}
                      </div>
                    ))}
                  </div>
                  <Link className="button primary" href="/investigacion" style={{ marginTop: 8 }}>
                    Ir a Investigacion -&gt;
                  </Link>
                </article>

                <article className="feature-card">
                  <div className="feature-top">
                    <div>
                      <span className="mini-label">Flujos de retencion</span>
                      <h3 className="space-top-sm">Estudio</h3>
                    </div>
                    <span className="compare-label study">4 herramientas</span>
                  </div>
                  <div className="feature-list">
                    {studyFeatures.map((item) => (
                      <div key={item} className="feature-item">
                        {item}
                      </div>
                    ))}
                  </div>
                  <Link className="button primary" href="/estudio" style={{ marginTop: 8 }}>
                    Ir a Estudio -&gt;
                  </Link>
                </article>
              </div>
            </div>
          </div>
        </section>

        <section id="workflow">
          <div className="wrap">
            <div className="section-header reveal">
              <div>
                <h2>Navegacion resultante.</h2>
                <p>
                  <strong>/</strong> muestra la landing con el workspace embebido,{" "}
                  <strong>/investigacion</strong> abre ResearchMode a pantalla completa y{" "}
                  <strong>/estudio</strong> abre el workspace de estudio con sidebar.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
