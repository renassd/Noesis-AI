"use client";

import { useState, useEffect, useCallback } from "react";

export type Flashcard = { id: string; question: string; answer: string };
export type Deck = { id: string; name: string; user_id: string; created_at: string; flashcards: Flashcard[] };

function getUserId(): string {
  const key = "noesis_uid";
  let id = localStorage.getItem(key);
  if (!id) { id = crypto.randomUUID(); localStorage.setItem(key, id); }
  return id;
}

export function useDecks() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDecks = useCallback(async () => {
    setLoading(true);
    try {
      const uid = getUserId();
      const res = await fetch(`/api/decks?userId=${uid}`);
      if (res.ok) setDecks(await res.json());
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchDecks(); }, [fetchDecks]);

  async function addDeck(name: string, cards: { question: string; answer: string }[]): Promise<Deck | null> {
    try {
      const res = await fetch("/api/decks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: getUserId(), name, cards }),
      });
      if (!res.ok) return null;
      const deck: Deck = await res.json();
      setDecks(p => [deck, ...p]);
      return deck;
    } catch { return null; }
  }

  async function deleteDeck(id: string) {
    await fetch(`/api/decks/${id}`, { method: "DELETE" });
    setDecks(p => p.filter(d => d.id !== id));
  }

  async function renameDeck(id: string, name: string) {
    await fetch(`/api/decks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setDecks(p => p.map(d => d.id === id ? { ...d, name } : d));
  }

  return { decks, loading, addDeck, deleteDeck, renameDeck };
}