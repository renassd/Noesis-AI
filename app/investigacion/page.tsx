"use client";

import Link from "next/link";
import LangToggle from "../LangToggle";
import ResearchMode from "../ResearchMode";
import ResearchPrefsBar from "../ResearchPrefsBar";
import { useLang } from "../i18n";

export default function InvestigacionPage() {
  const { t } = useLang();
  const nav = t.nav;

  return (
    <div className="standalone-shell research-shell">
      <header className="standalone-topbar">
        <Link href="/" className="standalone-brand">
          <span className="ws-logo-mark">N</span>
          <span className="standalone-brand-name">Noesis AI</span>
        </Link>
        <nav className="standalone-nav">
          <Link href="/" className="standalone-nav-link">{nav.home}</Link>
          <span className="standalone-nav-link active">{nav.research}</span>
          <Link href="/estudio" className="standalone-nav-link">{nav.study}</Link>
        </nav>
        <div className="standalone-nav-right">
          <ResearchPrefsBar />
          <LangToggle />
        </div>
      </header>

      <div className="standalone-layout standalone-layout-single">
        <main className="standalone-main research-main">
          <ResearchMode />
        </main>
      </div>
    </div>
  );
}
