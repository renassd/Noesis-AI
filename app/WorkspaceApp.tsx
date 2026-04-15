"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import FlashcardGenerator from "./FlashcardGenerator";
import FlashcardStudy from "./FlashcardStudy";
import TutorMode from "./TutorMode";
import ResearchMode from "./ResearchMode";
import MyDecks from "./MyDecks";
import type { Flashcard, Deck } from "./types";
import { useDecks } from "./useDecks";

type Tool = "generate" | "study" | "tutor" | "research" | "decks";

type WorkspaceAppProps = {
  activeTool?: Tool;
  onToolChange?: (tool: Tool) => void;
};

const TOOLS: { id: Tool; label: string; icon: string; section: string }[] = [
  { id: "research", label: "Reporte de investigacion", icon: "Lab", section: "Investigacion" },
  { id: "generate", label: "Generar flashcards", icon: "AI", section: "Estudio" },
  { id: "study", label: "Repasar flashcards", icon: "Deck", section: "Estudio" },
  { id: "tutor", label: "Modo tutor", icon: "Tutor", section: "Estudio" },
  { id: "decks", label: "Mis mazos", icon: "Mazos", section: "Estudio" },
];

export default function WorkspaceApp({
  activeTool,
  onToolChange,
}: WorkspaceAppProps) {
  const [internalTool, setInternalTool] = useState<Tool>("research");
  const [activeDeck, setActiveDeck] = useState<Deck | null>(null);
  const { decks, loading, error, addDeck, deleteDeck, renameDeck } = useDecks();
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
            <span className="ws-logo-name">Noesis AI</span>
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

          {decks.length > 0 && (
            <div className="ws-deck-list">
              <span className="ws-nav-label">Mazos recientes</span>
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
                  <span className="ws-deck-icon">Deck</span>
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
    </div>
  );
}
