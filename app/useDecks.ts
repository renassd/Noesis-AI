"use client";

import { useCallback, useEffect, useState } from "react";
import type { Deck } from "./types";

const DECKS_STORAGE_KEY = "noesis_decks";

function getUserId(): string {
  const storageKey = "noesis_user_id";
  const existingId = localStorage.getItem(storageKey);

  if (existingId) {
    return existingId;
  }

  const newId = crypto.randomUUID();
  localStorage.setItem(storageKey, newId);
  return newId;
}

function loadLocalDecks(): Deck[] {
  try {
    const raw = localStorage.getItem(DECKS_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Deck[]) : [];
  } catch {
    return [];
  }
}

function saveLocalDecks(decks: Deck[]) {
  localStorage.setItem(DECKS_STORAGE_KEY, JSON.stringify(decks));
}

export function useDecks() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [usingLocalFallback, setUsingLocalFallback] = useState(false);

  const fetchDecks = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const userId = getUserId();
      const res = await fetch(`/api/decks?userId=${encodeURIComponent(userId)}`);

      if (!res.ok) {
        throw new Error("Deck API unavailable");
      }

      const data = (await res.json()) as Deck[];
      setDecks(data);
      setUsingLocalFallback(false);
    } catch (err) {
      console.error(err);
      setDecks(loadLocalDecks());
      setUsingLocalFallback(true);
      setError("Modo local activo: los mazos se guardan solo en este navegador.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDecks();
  }, [fetchDecks]);

  async function addDeck(
    name: string,
    cards: Array<{ question: string; answer: string }>,
  ): Promise<Deck | null> {
    try {
      if (usingLocalFallback) {
        const localDeck: Deck = {
          id: crypto.randomUUID(),
          name,
          createdAt: new Date().toISOString(),
          cards: cards.map((card) => ({
            id: crypto.randomUUID(),
            question: card.question,
            answer: card.answer,
          })),
        };

        setDecks((prev) => {
          const updated = [localDeck, ...prev];
          saveLocalDecks(updated);
          return updated;
        });

        return localDeck;
      }

      const userId = getUserId();
      const res = await fetch("/api/decks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, name, cards }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || "Error guardando mazo");
      }

      const deck = (await res.json()) as Deck;
      setDecks((prev) => [deck, ...prev]);
      return deck;
    } catch (err) {
      console.error(err);
      const localDeck: Deck = {
        id: crypto.randomUUID(),
        name,
        createdAt: new Date().toISOString(),
        cards: cards.map((card) => ({
          id: crypto.randomUUID(),
          question: card.question,
          answer: card.answer,
        })),
      };

      setUsingLocalFallback(true);
      setError("Modo local activo: los mazos se guardan solo en este navegador.");
      setDecks((prev) => {
        const updated = [localDeck, ...prev];
        saveLocalDecks(updated);
        return updated;
      });
      return localDeck;
    }
  }

  async function deleteDeck(id: string) {
    try {
      if (usingLocalFallback) {
        setDecks((prev) => {
          const updated = prev.filter((deck) => deck.id !== id);
          saveLocalDecks(updated);
          return updated;
        });
        return;
      }

      const res = await fetch(`/api/decks/${id}`, { method: "DELETE" });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || "Error eliminando mazo");
      }

      setDecks((prev) => prev.filter((deck) => deck.id !== id));
    } catch (err) {
      console.error(err);
      setUsingLocalFallback(true);
      setError("Modo local activo: los mazos se guardan solo en este navegador.");
      setDecks((prev) => {
        const updated = prev.filter((deck) => deck.id !== id);
        saveLocalDecks(updated);
        return updated;
      });
    }
  }

  async function renameDeck(id: string, name: string) {
    try {
      if (usingLocalFallback) {
        setDecks((prev) => {
          const updated = prev.map((deck) =>
            deck.id === id ? { ...deck, name } : deck,
          );
          saveLocalDecks(updated);
          return updated;
        });
        return;
      }

      const res = await fetch(`/api/decks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || "Error renombrando mazo");
      }

      const updatedDeck = (await res.json()) as Pick<Deck, "id" | "name" | "createdAt">;

      setDecks((prev) =>
        prev.map((deck) =>
          deck.id === id ? { ...deck, name: updatedDeck.name } : deck,
        ),
      );
    } catch (err) {
      console.error(err);
      setUsingLocalFallback(true);
      setError("Modo local activo: los mazos se guardan solo en este navegador.");
      setDecks((prev) => {
        const updated = prev.map((deck) =>
          deck.id === id ? { ...deck, name } : deck,
        );
        saveLocalDecks(updated);
        return updated;
      });
    }
  }

  return {
    decks,
    loading,
    error,
    addDeck,
    deleteDeck,
    renameDeck,
    refetch: fetchDecks,
  };
}
