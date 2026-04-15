"use client";

import { useState } from "react";
import Link from "next/link";
import { useDecks, type Deck } from "../../lib/useDecks";
import FlashcardGenerator from "../../components/FlashcardGenerator";
import FlashcardStudy from "../../components/FlashcardStudy";
import TutorMode from "../../components/TutorMode";
import ResearchMode from "../../components/ResearchMode";
import MyDecks from "../../components/MyDecks";

type Tool = "generate" | "study" | "tutor" | "research" | "decks";

const TOOLS: { id: Tool; label: string; icon: string; section: string }[] = [
  { id: "research", label: "Investigación",      icon: "🔬", section: "Investigar" },
  { id: "generate", label: "Generar flashcards", icon: "✨", section: "Estudiar"   },
  { id: "study",    label: "Repasar flashcards", icon: "🃏", section: "Estudiar"   },
  { id: "tutor",    label: "Modo tutor",         icon: "🎓", section: "Estudiar"   },
  { id: "decks",    label: "Mis mazos",          icon: "📚", section: "Estudiar"   },
];

export default function WorkspacePage() {
  const [tool, setTool] = useState<Tool>("generate");
  const [activeDeck, setActiveDeck] = useState<Deck | null>(null);
  const { decks, loading, addDeck, deleteDeck, renameDeck } = useDecks();

  async function handleSaveDeck(name: string, cards: { question: string; answer: string }[]) {
    const deck = await addDeck(name, cards);
    if (deck) {
      setActiveDeck(deck);
      setTool("study");
    }
  }

  const sections = [...new Set(TOOLS.map((t) => t.section))];

  return (
    <div className="ws-root">
      {/* SIDEBAR */}
      <aside className="ws-sidebar">
        <Link href="/" className="ws-logo">
          <span className="ws-logo-mark">N</span>
          <span className="ws-logo-name">Noesis AI</span>
        </Link>

        <nav className="ws-nav">
          {sections.map((section) => (
            <div key={section} className="ws-nav-section">
              <span className="ws-nav-label">{section}</span>
              {TOOLS.filter((t) => t.section === section).map((t) => (
                <button
                  key={t.id}
                  className={`ws-nav-item${tool === t.id ? " active" : ""}`}
                  onClick={() => setTool(t.id)}
                >
                  <span className="ws-nav-icon">{t.icon}</span>
                  {t.label}
                </button>
              ))}
            </div>
          ))}
        </nav>

        {/* Mazos recientes en sidebar */}
        {!loading && decks.length > 0 && (
          <div className="ws-deck-list">
            <span className="ws-nav-label">Mazos recientes</span>
            {decks.slice(0, 6).map((d) => (
              <button
                key={d.id}
                className={`ws-deck-item${activeDeck?.id === d.id ? " active" : ""}`}
                onClick={() => { setActiveDeck(d); setTool("study"); }}
                title={d.name}
              >
                <span className="ws-deck-icon">🃏</span>
                <span className="ws-deck-name">{d.name}</span>
                <span className="ws-deck-count">{d.flashcards.length}</span>
              </button>
            ))}
          </div>
        )}
      </aside>

      {/* MAIN */}
      <main className="ws-main">
        {tool === "generate" && (
          <FlashcardGenerator onSaveDeck={handleSaveDeck} />
        )}
        {tool === "study" && (
          <FlashcardStudy
            deck={activeDeck}
            decks={decks}
            onSelectDeck={(d) => setActiveDeck(d)}
          />
        )}
        {tool === "tutor" && <TutorMode />}
        {tool === "research" && <ResearchMode />}
        {tool === "decks" && (
          <MyDecks
            decks={decks}
            loading={loading}
            onSelect={(d) => { setActiveDeck(d); setTool("study"); }}
            onDelete={deleteDeck}
            onRename={renameDeck}
          />
        )}
      </main>
    </div>
  );
}
