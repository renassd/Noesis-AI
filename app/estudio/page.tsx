"use client";

import "../standalone.css";
import "../workspace.css";
import "../card-visual.css";
import "../flashcard-generator.css";
import "../flashcard-study.css";
import "../memory-bank.css";
import React from "react";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import ColorModeToggle from "../ColorModeToggle";
import AiUsageCard from "@/components/AiUsageCard";
import { useAiUsage } from "@/context/AiUsageContext";
import FlashcardGenerator from "../FlashcardGenerator";
import FlashcardStudy from "../FlashcardStudy";
import LangToggle from "../LangToggle";
import ManualFlashcardBuilder from "../ManualFlashcardBuilder";
import MemoryBank from "../MemoryBank";
import MyDecks from "../MyDecks";
import TutorMode from "../TutorMode";
import { useLang } from "../i18n";
import ThemeToggle from "../theme/ThemeToggle";
import type { Deck, Flashcard } from "../types";
import { useDecks } from "../useDecks";

type Tool = "generate" | "manual" | "study" | "tutor" | "decks" | "memory";

export default function EstudioPage() {
  const { t } = useLang();
  const { usage } = useAiUsage();
  const s = t.study;
  const nav = t.nav;
  const showUpgradeCard = usage?.creditsRemaining === 0;

  const TOOLS: { id: Tool; label: string; icon: React.ReactNode }[] = [
    { id: "generate", label: s.generate, icon: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M8 2l1.5 4H14l-3.5 2.5 1.5 4L8 10l-4 2.5 1.5-4L2 6h4.5L8 2z"
          stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      </svg>
    )},
    { id: "manual", label: s.manualNav, icon: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M3 12.5V14h1.5L12.8 5.7l-1.5-1.5L3 12.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
        <path d="M9.8 4.7l1.5 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        <path d="M2.5 14h11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    )},
    { id: "study", label: s.review, icon: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <rect x="2" y="3" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M5 7.5h6M5 10.5h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    )},
    { id: "tutor", label: s.tutor, icon: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="8" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M3 14c0-2.485 2.239-4.5 5-4.5s5 2.015 5 4.5"
          stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    )},
    { id: "decks", label: s.decks, icon: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <rect x="2" y="5" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M5 5V4a1 1 0 011-1h4a1 1 0 011 1v1"
          stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        <path d="M6 9.5h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    )},
    { id: "memory", label: "Memory Bank", icon: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M8 2C5.24 2 3 4.24 3 7c0 1.7.84 3.2 2.13 4.12V13h5.74v-1.88C12.16 10.2 13 8.7 13 7c0-2.76-2.24-5-5-5z"
          stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
        <path d="M5.5 13h5M6.5 11v-1M9.5 11v-1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    )},
  ];

  const [tool, setTool] = useState<Tool>("generate");
  const [activeDeck, setActiveDeck] = useState<Deck | null>(null);
  const { decks, loading, error, addDeck, deleteDeck, renameDeck, saveCardVisuals } = useDecks();

  useEffect(() => {
    if (activeDeck) {
      const updated = decks.find((deck) => deck.id === activeDeck.id) ?? null;
      setActiveDeck(updated);
    }
  }, [decks, activeDeck]);

  async function handleSaveDeck(name: string, cards: Flashcard[]) {
    const deck = await addDeck(name, cards);
    if (!deck) return false;
    setActiveDeck(deck);
    setTool("study");
    return true;
  }

  async function handleDeleteDeck(id: string) {
    await deleteDeck(id);
    if (activeDeck?.id === id) setActiveDeck(null);
  }

  return (
    <div className="standalone-shell">
      <header className="standalone-topbar">
        <Link href="/" className="standalone-brand">
          <span className="standalone-brand-mark" aria-hidden="true">
            <Image src="/logo.jpeg" alt="Neuvra AI" width={42} height={42} />
          </span>
          <span className="standalone-brand-name">Neuvra AI</span>
        </Link>
        <nav className="standalone-nav">
          <Link href="/" className="standalone-nav-link">{nav.home}</Link>
          <Link href="/investigacion" className="standalone-nav-link">{nav.research}</Link>
          <span className="standalone-nav-link active">{nav.study}</span>
        </nav>
        <LangToggle />
        <ColorModeToggle />
      </header>

      <div className="standalone-layout">
        <aside className="standalone-sidebar">
          <div className="standalone-sidebar-section">
            <span className="ws-nav-label">{s.pageTitle}</span>
            {TOOLS.map((item) => (
              <button
                key={item.id}
                className={`ws-nav-item${tool === item.id ? " active" : ""}`}
                onClick={() => setTool(item.id)}
                type="button"
              >
                <span className="ws-nav-icon">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>

          {tool !== "tutor" && showUpgradeCard && <AiUsageCard variant="compact" />}

          {decks.length > 0 && (
            <div className="ws-deck-list">
              <span className="ws-nav-label">{s.recentDecks}</span>
              {decks.slice(0, 8).map((deck) => (
                <button
                  key={deck.id}
                  className={`ws-deck-item${activeDeck?.id === deck.id ? " active" : ""}`}
                  onClick={() => {
                    setActiveDeck(deck);
                    setTool("study");
                  }}
                  title={deck.name}
                  type="button"
                >
                  <span className="ws-deck-icon" aria-hidden="true">
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                      <rect x="2" y="5" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
                      <path d="M5 5V4a1 1 0 011-1h4a1 1 0 011 1v1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                    </svg>
                  </span>
                  <span className="ws-deck-name">{deck.name}</span>
                  <span className="ws-deck-count">{deck.cards.length}</span>
                </button>
              ))}
            </div>
          )}

          <div className="standalone-sidebar-footer">
            <ThemeToggle inline />
          </div>
        </aside>

        <main className="standalone-main">
          {error && (
            <div style={{ marginBottom: 16 }}>
              <p className="gen-error">{error}</p>
            </div>
          )}

          {tool === "generate" && <FlashcardGenerator onSaveDeck={handleSaveDeck} />}
          {tool === "manual" && <ManualFlashcardBuilder onSaveDeck={handleSaveDeck} />}
          {tool === "study" && (
            <FlashcardStudy
              deck={activeDeck}
              decks={decks}
              onSelectDeck={(deck) => setActiveDeck(deck)}
              onSaveCardVisuals={saveCardVisuals}
            />
          )}
          {tool === "tutor" && <TutorMode />}
          {tool === "memory" && <MemoryBank />}
          {tool === "decks" && (
            <MyDecks
              decks={decks}
              loading={loading}
              onSelect={(deck) => {
                setActiveDeck(deck);
                setTool("study");
              }}
              onDelete={(id) => void handleDeleteDeck(id)}
              onRename={(id, name) => void renameDeck(id, name)}
            />
          )}
        </main>
      </div>
    </div>
  );
}
