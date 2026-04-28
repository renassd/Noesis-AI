"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import ColorModeToggle from "./ColorModeToggle";
import LangToggle from "./LangToggle";
import { AboutCards } from "./AboutCards";
import { useLang } from "./i18n";
import { useAuth } from "@/context/AuthContext";

function WordReveal({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLHeadingElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -32px 0px" },
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
          >
            {word}
          </span>
          {i < words.length - 1 ? " " : null}
        </span>
      ))}
    </h1>
  );
}

export function WhoWeArePage() {
  const { t, lang } = useLang();
  const { auth, openModal, signOut } = useAuth();
  const l = t.landing;
  const nav = t.nav;
  const aboutHref = lang === "es" ? "/quienes-somos" : "/who-we-are";

  return (
    <>
      <header className="topbar">
        <div className="wrap">
          <Link href="/" className="brand">
            <span className="brand-mark" aria-hidden="true">
              <Image src="/logo.jpeg" alt="Neuvra AI" width={50} height={50} />
            </span>
            <span className="brand-text">
              <span>Neuvra AI</span>
            </span>
          </Link>
          <div className="nav-group">
            <nav className="nav">
              <Link href="/#workflow-flow">{nav.howItWorks}</Link>
              <Link href={aboutHref}>{l.whoWeAreTitle}</Link>
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
            <ColorModeToggle />
            <LangToggle />
          </div>
        </div>
      </header>

      <main className="about-page">
        <section className="about-page-hero">
          <div className="wrap">
            <div className="about-page-shell reveal visible">
              <span className="eyebrow about-page-eyebrow">{l.aboutPageEyebrow}</span>
              <p className="about-page-statement">{l.aboutPageStatement}</p>
              <div className="about-page-header">
                <div>
                  <WordReveal text={l.whoWeAreTitle} className="about-page-title landing-headline" />
                  <p className="about-page-intro">{l.aboutPageIntro}</p>
                </div>
                <Link href="/" className="about-page-back">
                  {l.backToHome}
                </Link>
              </div>
              <AboutCards />
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
