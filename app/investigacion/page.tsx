"use client";

import "../standalone.css";
import "../workspace.css";
import "../research-interface.css";
import Link from "next/link";
import Image from "next/image";
import ColorModeToggle from "../ColorModeToggle";
import LangToggle from "../LangToggle";
import ResearchMode from "../ResearchMode";
import { useLang } from "../i18n";
import { useAuth } from "@/context/AuthContext";

export default function InvestigacionPage() {
  const { t } = useLang();
  const { auth, ready, openModal } = useAuth();
  const nav = t.nav;
  const authText = t.auth;
  const blocked = ready && !auth.signedIn;

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
          {blocked ? (
            <div className="ws-panel ws-panel-centered">
              <div className="study-empty">
                <h2 className="study-empty-title">{authText.signinTitle}</h2>
                <p className="study-empty-sub">{authText.signinDescription}</p>
                <button className="auth-submit" type="button" onClick={openModal}>
                  {authText.signinCta}
                </button>
              </div>
            </div>
          ) : !ready ? null : (
            <ResearchMode />
          )}
        </main>
      </div>
    </div>
  );
}
