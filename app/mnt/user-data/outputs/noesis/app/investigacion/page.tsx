"use client";

import Link from "next/link";
import ResearchMode from "../ResearchMode";

export default function InvestigacionPage() {
  return (
    <div className="standalone-shell">
      {/* Top bar */}
      <header className="standalone-topbar">
        <Link href="/" className="standalone-brand">
          <span className="ws-logo-mark">N</span>
          <span className="standalone-brand-name">Noesis AI</span>
        </Link>
        <nav className="standalone-nav">
          <Link href="/" className="standalone-nav-link">Inicio</Link>
          <span className="standalone-nav-link active">Investigación</span>
          <Link href="/estudio" className="standalone-nav-link">Estudio</Link>
        </nav>
      </header>

      <div className="standalone-layout standalone-layout-single">
        <main className="standalone-main">
          <ResearchMode />
        </main>
      </div>
    </div>
  );
}
