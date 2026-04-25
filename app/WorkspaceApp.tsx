"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import FlashcardGenerator from "./FlashcardGenerator";
import FlashcardStudy from "./FlashcardStudy";
import TutorMode from "./TutorMode";
import ResearchMode from "./ResearchMode";
import MyDecks from "./MyDecks";
import AiUsageCard from "@/components/AiUsageCard";
import { useAiUsage } from "@/context/AiUsageContext";
import ThemeToggle from "./theme/ThemeToggle";
import { useLang } from "./i18n";
import type { Flashcard, Deck } from "./types";
import { useDecks } from "./useDecks";

type Tool = "generate" | "study" | "tutor" | "research" | "decks";

type WorkspaceAppProps = {
  activeTool?: Tool;
  onToolChange?: (tool: Tool) => void;
};

export default function WorkspaceApp({
  activeTool,
  onToolChange,
}: WorkspaceAppProps) {
  const { t } = useLang();
  const { usage } = useAiUsage();
  const s = t.study;
  const researchSection = t.nav.research;
  const studySection = t.nav.study;
  const showUpgradeCard = usage?.creditsRemaining === 0;

  const TOOLS: { id: Tool; label: string; icon: React.ReactNode; section: string }[] = [
    {
      id: "research",
      label: researchSection,
      section: researchSection,
      icon: (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.4" />
          <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      id: "generate",
      label: s.generate,
      section: studySection,
      icon: (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M8 2l1.5 4H14l-3.5 2.5 1.5 4L8 10l-4 2.5 1.5-4L2 6h4.5L8 2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      id: "study",
      label: s.review,
      section: studySection,
      icon: (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <rect x="2" y="3" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
          <path d="M5 7.5h6M5 10.5h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      id: "tutor",
      label: s.tutor,
      section: studySection,
      icon: (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="8" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.4" />
          <path d="M3 14c0-2.485 2.239-4.5 5-4.5s5 2.015 5 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      id: "decks",
      label: s.decks,
      section: studySection,
      icon: (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <rect x="2" y="5" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
          <path d="M5 5V4a1 1 0 011-1h4a1 1 0 011 1v1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          <path d="M6 9.5h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      ),
    },
  ];

  const [internalTool, setInternalTool] = useState<Tool>("research");
  const [activeDeck, setActiveDeck] = useState<Deck | null>(null);
  const { decks, loading, error, addDeck, deleteDeck, renameDeck, saveCardVisuals } = useDecks();
  const tool = activeTool ?? internalTool;

  function setTool(toolName: Tool) {
    if (onToolChange) {
      onToolChange(toolName);
      return;
    }

    setInternalTool(toolName);
  }

  useEffect(() => {
    if (activeDeck) {
      const updatedActiveDeck = decks.find((deck) => deck.id === activeDeck.id) ?? null;
      setActiveDeck(updatedActiveDeck);
    }
  }, [decks, activeDeck]);

  async function handleAddDeck(name: string, cards: Flashcard[]) {
    const deck = await addDeck(name, cards);

    if (!deck) {
      return false;
    }

    setActiveDeck(deck);
    setTool("study");
    return true;
  }

  async function handleDeleteDeck(id: string) {
    await deleteDeck(id);

    if (activeDeck?.id === id) {
      setActiveDeck(null);
    }
  }

  const sections = [...new Set(TOOLS.map((toolItem) => toolItem.section))];

  return (
    <div className="workspace-shell" id="workspace-shell">
      <div className="workspace-shell-bar">
        <div className="dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <span>studybuddy.ai / espacio de trabajo</span>
      </div>

      <div className="ws-root">
        <aside className="ws-sidebar" id="workspace-sidebar">
          <Link href="#home" className="ws-logo">
            <span className="ws-logo-mark">N</span>
            <span className="ws-logo-name">Neuvra AI</span>
          </Link>

          <nav className="ws-nav">
            {sections.map((section) => (
              <div key={section} className="ws-nav-section">
                <span className="ws-nav-label">{section}</span>
                {TOOLS.filter((toolItem) => toolItem.section === section).map((toolItem) => (
                  <button
                    key={toolItem.id}
                    className={`ws-nav-item${tool === toolItem.id ? " active" : ""}`}
                    onClick={() => setTool(toolItem.id)}
                  >
                    <span className="ws-nav-icon">{toolItem.icon}</span>
                    {toolItem.label}
                  </button>
                ))}
              </div>
            ))}
          </nav>

          {tool !== "tutor" && tool !== "research" && showUpgradeCard && <AiUsageCard variant="compact" />}

          {decks.length > 0 && (
            <div className="ws-deck-list">
              <span className="ws-nav-label">{s.recentDecks}</span>
              {decks.slice(0, 6).map((deck) => (
                <button
                  key={deck.id}
                  className={`ws-deck-item${activeDeck?.id === deck.id ? " active" : ""}`}
                  onClick={() => {
                    setActiveDeck(deck);
                    setTool("study");
                  }}
                  title={deck.name}
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
        </aside>

        <main className="ws-main">
          {error && (
            <div className="ws-panel">
              <p className="gen-error">{error}</p>
            </div>
          )}

          {tool === "generate" && <FlashcardGenerator onSaveDeck={handleAddDeck} />}
          {tool === "study" && (
            <FlashcardStudy
              deck={activeDeck}
              decks={decks}
              onSelectDeck={(deck) => setActiveDeck(deck)}
              onSaveCardVisuals={saveCardVisuals}
            />
          )}
          {tool === "tutor" && <TutorMode />}
          {tool === "research" && <ResearchMode />}
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

      <ThemeToggle />
    </div>
  );
}
