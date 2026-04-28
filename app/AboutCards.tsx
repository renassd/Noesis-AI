"use client";

import { useEffect, useRef } from "react";
import { useLang } from "./i18n";

export type AboutCardKey = "whoWeAre" | "mission";

export function WhoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
    </svg>
  );
}

export function MissionIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function ChevronDown({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 6l4 4 4-4" />
    </svg>
  );
}

// ── AboutCards — two cards side by side ──────────────────────────────────────

export function AboutCards() {
  const { t } = useLang();
  const l = t.landing;
  const revealRef = useRef<HTMLDivElement>(null);

  // Trigger staggered card entrance on scroll into view
  useEffect(() => {
    const el = revealRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("about-visible");
          io.disconnect();
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -32px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div className="about-section-inner" ref={revealRef}>
      <div className="about-cards-grid">

        {/* Who We Are */}
        <div className="about-card" style={{ "--card-delay": "60ms" } as React.CSSProperties}>
          <div className="about-card-icon about-icon--blue"><WhoIcon /></div>
          <h2 className="about-card-title">{l.whoWeAreTitle}</h2>
          <p className="about-card-body">{l.whoWeAreBody}</p>
        </div>

        {/* Mission */}
        <div className="about-card" style={{ "--card-delay": "150ms" } as React.CSSProperties}>
          <div className="about-card-icon about-icon--purple"><MissionIcon /></div>
          <h2 className="about-card-title">{l.missionTitle}</h2>
          <p className="about-card-body">{l.missionBody}</p>
        </div>

      </div>
    </div>
  );
}
