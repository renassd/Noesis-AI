"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import LangToggle from "./LangToggle";
import { useLang } from "./i18n";
import { ImageAccordionPanels } from "@/components/ui/interactive-image-accordion";

function useScrollReveal() {
  useEffect(() => {
    const elements = document.querySelectorAll(".reveal");
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }),
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" },
    );

    elements.forEach((element) => observer.observe(element));
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

function WaitlistForm() {
  const { lang, t } = useLang();
  const l = t.landing;
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!email.includes("@")) {
      setError(lang === "en" ? "Please enter a valid email." : "Ingresa un email valido.");
      return;
    }

    setError("");
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    setLoading(false);
    setDone(true);
  }

  if (done) {
    return <div className="waitlist-success visible">{l.waitlistDone}</div>;
  }

  return (
    <div>
      <div className="waitlist-form">
        <input
          className="waitlist-input"
          type="email"
          placeholder={l.waitlistPlaceholder}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void submit();
          }}
          disabled={loading}
        />
        <button
          className="waitlist-btn"
          onClick={() => void submit()}
          disabled={loading}
          type="button"
        >
          {loading ? l.waitlistJoining : l.waitlistBtn}
        </button>
      </div>
      {error && (
        <p style={{ fontSize: 13, color: "#d85a30", marginTop: 8, textAlign: "center" }}>
          {error}
        </p>
      )}
      <p className="waitlist-count">{l.waitlistCount.replace("{n}", "412")}</p>
    </div>
  );
}

export default function HomePage() {
  const { t } = useLang();
  const l = t.landing;
  const nav = t.nav;

  useScrollReveal();
  useTopbarScroll();

  return (
    <>
      <header className="topbar">
        <div className="wrap">
          <a href="#home" className="brand">
            <span className="brand-mark" aria-hidden="true">
              <Image src="/logo.jpeg" alt="Noesis AI" width={50} height={50} />
            </span>
            <span className="brand-text">
              <span>Noesis AI</span>
            </span>
          </a>
          <div className="nav-group">
            <nav className="nav">
              <a href="#features">{nav.research}</a>
              <a href="#workflow">{nav.howItWorks}</a>
              <Link href="/estudio" className="cta-link">
                {nav.openApp}
              </Link>
            </nav>
            <LangToggle />
          </div>
        </div>
      </header>

      <main id="home">
        <section className="hero" id="features">
          <div className="wrap">
            <div className="landing-hero-grid reveal">
              <div className="landing-hero-copy">
                <span className="eyebrow">{l.eyebrow}</span>
                <h1 className="landing-headline">{l.headline}</h1>
                <p className="landing-sub">{l.sub}</p>
                <div className="hero-scroll-hint reveal reveal-delay-1" aria-hidden="true">
                  <span className="hero-scroll-line" />
                  <span className="hero-scroll-label">scroll</span>
                </div>
              </div>

              <ImageAccordionPanels />
            </div>
          </div>
        </section>

        <section id="workflow">
          <div className="wrap">
            <div className="section-header reveal">
              <div>
                <h2>{l.workflowTitle}</h2>
                <p>{l.workflowSub}</p>
              </div>
            </div>
            <div className="workflow-board reveal">
              <div className="workflow-grid">
                <article className="timeline-card">
                  <span className="mini-label">Flow</span>
                  <div className="timeline-list top-space">
                    {[
                      { title: l.step1title, body: l.step1 },
                      { title: l.step2title, body: l.step2 },
                      { title: l.step3title, body: l.step3 },
                      { title: l.step4title, body: l.step4 },
                    ].map((step) => (
                      <div key={step.title} className="timeline-step">
                        <strong>{step.title}</strong>
                        {step.body}
                      </div>
                    ))}
                  </div>
                </article>

                <article className="workflow-card">
                  <div>
                    <span className="mini-label">Inside Noesis</span>
                    <h3 className="workflow-title">{l.workflowTitle}</h3>
                  </div>
                  <div className="workflow-canvas">
                    <div className="canvas-row">
                      <div className="canvas-box">
                        <strong>Research mode</strong>
                        <span>
                          Paper summary, literature review, research report, find sources.
                        </span>
                      </div>
                      <div className="canvas-box">
                        <strong>Main canvas</strong>
                        <span>
                          Focused workspace for uploads, prompts and generated reports.
                        </span>
                      </div>
                    </div>
                    <div className="canvas-row">
                      <div className="canvas-box">
                        <strong>Study mode</strong>
                        <span>
                          Flashcards, key concepts, tutor mode, simple summaries, my decks.
                        </span>
                      </div>
                      <div className="canvas-box">
                        <strong>Review output</strong>
                        <span>
                          Turn any explanation into an active recall set or deck in one click.
                        </span>
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
                  <h2>{l.pricingTitle}</h2>
                  <p>{l.pricingSub}</p>
                </div>
              </div>
              <div className="pricing-grid">
                {t.pricing.map((card) => (
                  <article
                    key={card.label}
                    className={`compare-card${
                      "featured" in card && card.featured ? " featured" : ""
                    }`}
                  >
                    <span className="compare-label">{card.label}</span>
                    <div className="price">{card.price}</div>
                    <p>{card.desc}</p>
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

        <section className="waitlist-section">
          <div className="wrap">
            <div className="waitlist-shell reveal">
              <span className="eyebrow" style={{ margin: "0 auto" }}>
                {l.waitlistEyebrow}
              </span>
              <h2 style={{ whiteSpace: "pre-line" }}>{l.waitlistTitle}</h2>
              <p>{l.waitlistSub}</p>
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
              <p className="footer-tagline">{l.footerTagline}</p>
            </div>
            <div className="footer-links-grid">
              <div className="footer-col">
                <h4>{l.footerProduct}</h4>
                <Link href="/investigacion">{t.nav.research}</Link>
                <Link href="/estudio">{t.nav.study}</Link>
                <a href="#workflow">{t.nav.howItWorks}</a>
              </div>
              <div className="footer-col">
                <h4>{l.footerCompany}</h4>
                <a href="#">{l.footerAbout}</a>
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
            <span>(c) {new Date().getFullYear()} Noesis AI. {l.footerRights}</span>
            <div className="footer-social">
              <a href="#" aria-label="X">
                X
              </a>
              <a href="#" aria-label="LinkedIn">
                in
              </a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
