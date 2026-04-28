"use client";

import { useState, useEffect, useRef } from "react";
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

// ── Nav dropdown (used in the topbar) ────────────────────────────────────────

export function NavAboutDropdown({
  activeCard,
  onSwitch,
}: {
  activeCard: AboutCardKey;
  onSwitch: (key: AboutCardKey) => void;
}) {
  const { t } = useLang();
  const l = t.landing;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function select(key: AboutCardKey) {
    setOpen(false);
    onSwitch(key);
    setTimeout(() => {
      document.getElementById("about")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 40);
  }

  return (
    <div className="nav-dropdown" ref={ref}>
      <button
        className="nav-dropdown-btn"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((v) => !v)}
        type="button"
      >
        {l.whoWeAreTitle}
        <span className={`nav-dropdown-chevron${open ? " open" : ""}`}>
          <ChevronDown size={12} />
        </span>
      </button>

      <div className={`nav-dropdown-menu${open ? " open" : ""}`} role="listbox">
        <button
          role="option"
          aria-selected={activeCard === "whoWeAre"}
          className={`nav-dropdown-item${activeCard === "whoWeAre" ? " active" : ""}`}
          onClick={() => select("whoWeAre")}
          type="button"
        >
          <span className="nav-dropdown-item-icon about-icon--blue">
            <WhoIcon />
          </span>
          {l.whoWeAreTitle}
        </button>
        <button
          role="option"
          aria-selected={activeCard === "mission"}
          className={`nav-dropdown-item${activeCard === "mission" ? " active" : ""}`}
          onClick={() => select("mission")}
          type="button"
        >
          <span className="nav-dropdown-item-icon about-icon--purple">
            <MissionIcon />
          </span>
          {l.missionTitle}
        </button>
      </div>
    </div>
  );
}

// ── AboutCards (the flashcard section) ───────────────────────────────────────

export function AboutCards({
  activeCard,
  onSwitch,
}: {
  activeCard: AboutCardKey;
  onSwitch: (key: AboutCardKey) => void;
}) {
  const { t, lang } = useLang();
  const l = t.landing;

  const [displayedCard, setDisplayedCard] = useState<AboutCardKey>(activeCard);
  const [visible, setVisible] = useState(true);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const selectorRef = useRef<HTMLDivElement>(null);
  const isFirst = useRef(true);

  // Animate transition whenever activeCard changes (from navbar or internal tabs)
  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    setVisible(false);
    const timer = setTimeout(() => {
      setDisplayedCard(activeCard);
      setVisible(true);
    }, 160);
    return () => clearTimeout(timer);
  }, [activeCard]);

  // Close selector on outside click / Escape
  useEffect(() => {
    if (!selectorOpen) return;
    function onPointer(e: MouseEvent) {
      if (selectorRef.current && !selectorRef.current.contains(e.target as Node))
        setSelectorOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setSelectorOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [selectorOpen]);

  function switchCard(key: AboutCardKey) {
    setSelectorOpen(false);
    if (key === activeCard) return;
    onSwitch(key);
  }

  const CARDS = {
    whoWeAre: {
      Icon: WhoIcon,
      iconClass: "about-icon--blue",
      title: l.whoWeAreTitle,
      body: l.whoWeAreBody,
    },
    mission: {
      Icon: MissionIcon,
      iconClass: "about-icon--purple",
      title: l.missionTitle,
      body: l.missionBody,
    },
  } as const;

  const card = CARDS[displayedCard];
  const { Icon } = card;
  const ctaLabel = lang === "en" ? "Explore more →" : "Explorar más →";
  const selectorLabel = CARDS[displayedCard].title;

  return (
    <div className="about-section-inner">

      {/* ── Selector pill ── */}
      <div className="about-selector-wrap" ref={selectorRef}>
        <button
          className="about-selector-btn"
          aria-expanded={selectorOpen}
          aria-haspopup="listbox"
          onClick={() => setSelectorOpen((v) => !v)}
          type="button"
        >
          <span>{selectorLabel}</span>
          <span className={`about-selector-chevron${selectorOpen ? " open" : ""}`}>
            <ChevronDown />
          </span>
        </button>

        <div
          className={`about-selector-menu${selectorOpen ? " open" : ""}`}
          role="listbox"
        >
          {(["whoWeAre", "mission"] as AboutCardKey[]).map((key) => {
            const ItemIcon = CARDS[key].Icon;
            return (
              <button
                key={key}
                role="option"
                aria-selected={activeCard === key}
                className={`about-selector-item${activeCard === key ? " active" : ""}`}
                onClick={() => switchCard(key)}
                type="button"
              >
                <span className={`about-selector-item-icon ${key === "whoWeAre" ? "about-icon--blue" : "about-icon--purple"}`}>
                  <ItemIcon />
                </span>
                {CARDS[key].title}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Stacked stage ── */}
      <div className="about-stage">
        <div className="about-ghost about-ghost--2" aria-hidden="true" />
        <div className="about-ghost about-ghost--1" aria-hidden="true" />

        <div
          className="about-card"
          data-visible={String(visible)}
        >
          <div className={`about-card-icon ${card.iconClass}`}>
            <Icon />
          </div>
          <h2 className="about-card-title">{card.title}</h2>
          <p className="about-card-body">{card.body}</p>
          <div className="about-card-footer">
            <button className="about-card-cta" type="button">{ctaLabel}</button>
          </div>
        </div>
      </div>

      {/* ── Pagination dots ── */}
      <div className="about-dots" aria-label="card navigation">
        {(["whoWeAre", "mission"] as AboutCardKey[]).map((key) => (
          <button
            key={key}
            className={`about-dot${activeCard === key ? " active" : ""}`}
            onClick={() => switchCard(key)}
            type="button"
            aria-label={CARDS[key].title}
          />
        ))}
      </div>
    </div>
  );
}
