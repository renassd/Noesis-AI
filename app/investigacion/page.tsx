"use client";

import "../standalone.css";
import "../workspace.css";
import "../research-interface.css";
import AiUsageCard from "@/components/AiUsageCard";
import Link from "next/link";
import Image from "next/image";
import ColorModeToggle from "../ColorModeToggle";
import LangToggle from "../LangToggle";
import ResearchMode from "../ResearchMode";
import { useLang } from "../i18n";

export default function InvestigacionPage() {
  const { t } = useLang();
  const nav = t.nav;

  return (
    <div className="standalone-shell research-shell">
      {/* Topbar */}
      <header className="standalone-topbar">
        <Link href="/" className="standalone-brand">
          <span className="standalone-brand-mark" aria-hidden="true">
            <Image src="/logo.jpeg" alt="Neuvra AI" width={42} height={42} />
          </span>
          <span className="standalone-brand-name">Neuvra AI</span>
        </Link>
        <nav className="standalone-nav">
          <Link href="/" className="standalone-nav-link">{nav.home}</Link>
          <span className="standalone-nav-link active">{nav.research}</span>
          <Link href="/estudio" className="standalone-nav-link">{nav.study}</Link>
        </nav>
        <LangToggle />
        <ColorModeToggle />
      </header>

      <div className="standalone-layout standalone-layout-single">
        <main className="standalone-main research-main">
          <AiUsageCard variant="full" />
          <ResearchMode />
        </main>
      </div>
    </div>
  );
}
