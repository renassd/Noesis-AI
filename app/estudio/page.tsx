"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import FlashcardGenerator from "../FlashcardGenerator";
import FlashcardStudy from "../FlashcardStudy";
import MyDecks from "../MyDecks";
import TutorMode from "../TutorMode";
import type { Deck, Flashcard } from "../types";
import { useDecks } from "../useDecks";

type Tool = "generate" | "study" | "tutor" | "decks";

const TOOLS: { id: Tool; label: string; icon: string }[] = [
  { id: "generate", label: "Generar flashcards", icon: "AI" },
  { id: "study", label: "Repasar flashcards", icon: "Deck" },
  { id: "tutor", label: "Modo tutor", icon: "Tutor" },
  { id: "decks", label: "Mis mazos", icon: "Mazos" },
];

export default function EstudioPage() {
  const [tool, setTool] = useState<Tool>("generate");
  const [activeDeck, setActiveDeck] = useState<Deck | null>(null);
  const { decks, loading, error, addDeck, deleteDeck, renameDeck } = useDecks();

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
    if (activeDeck?.id === id) {
      setActiveDeck(null);
    }
  }

  return (
    <div className="standalone-shell">
      <header className="standalone-topbar">
        <Link href="/" className="standalone-brand">
          <span className="ws-logo-mark">N</span>
          <span className="standalone-brand-name">Noesis AI</span>
        </Link>
        <nav className="standalone-nav">
          <Link href="/" className="standalone-nav-link">
            Inicio
          </Link>
          <Link href="/investigacion" className="standalone-nav-link">
            Investigacion
          </Link>
          <span className="standalone-nav-link active">Estudio</span>
        </nav>
      </header>

      <div className="standalone-layout">
        <aside className="standalone-sidebar">
          <div className="standalone-sidebar-section">
            <span className="ws-nav-label">Herramientas de estudio</span>
            {TOOLS.map((item) => (
              <button
                key={item.id}
                className={`ws-nav-item${tool === item.id ? " active" : ""}`}
                onClick={() => setTool(item.id)}
              >
                <span className="ws-nav-icon">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>

          {decks.length > 0 && (
            <div className="ws-deck-list">
              <span className="ws-nav-label">Mazos recientes</span>
              {decks.slice(0, 8).map((deck) => (
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

        <main className="standalone-main">
          {error && (
            <div className="ws-panel" style={{ marginBottom: 16 }}>
              <p className="gen-error">{error}</p>
            </div>
          )}

          {tool === "generate" && <FlashcardGenerator onSaveDeck={handleSaveDeck} />}
          {tool === "study" && (
            <FlashcardStudy
              deck={activeDeck}
              decks={decks}
              onSelectDeck={(deck) => setActiveDeck(deck)}
            />
          )}
          {tool === "tutor" && <TutorMode />}
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
