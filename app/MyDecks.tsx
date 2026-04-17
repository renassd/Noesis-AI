"use client";

import { useState } from "react";
import type { Deck } from "./types";

interface Props {
  decks: Deck[];
  loading?: boolean;
  onSelect: (d: Deck) => void;
  onDelete: (id: string) => void;
  onRename?: (id: string, name: string) => void;
}

export default function MyDecks({
  decks,
  loading = false,
  onSelect,
  onDelete,
  onRename,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  function startEdit(deck: Deck) {
    setEditingId(deck.id);
    setEditName(deck.name);
  }

  function confirmEdit(id: string) {
    const trimmedName = editName.trim();

    if (trimmedName && onRename) {
      onRename(id, trimmedName);
    }

    setEditingId(null);
  }

  if (loading) {
    return (
      <div className="ws-panel ws-panel-centered">
        <div className="study-empty">
          <h2 className="study-empty-title">Cargando mazos</h2>
          <p className="study-empty-sub">Estamos trayendo tus decks guardados.</p>
        </div>
      </div>
    );
  }

  if (decks.length === 0) {
    return (
      <div className="ws-panel ws-panel-centered">
        <div className="study-empty">
          <h2 className="study-empty-title">No tenes mazos guardados</h2>
          <p className="study-empty-sub">
            Genera flashcards con IA y guarda tu primer mazo para que aparezca aca.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="ws-panel">
      <div className="ws-panel-header">
        <h2 className="ws-panel-title">Mis mazos</h2>
        <p className="ws-panel-sub">
          {decks.length} mazo{decks.length !== 1 ? "s" : ""} guardado
          {decks.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="decks-grid">
        {decks.map((deck) => (
          <div key={deck.id} className="deck-card">
            <div className="deck-card-body">
              {editingId === deck.id ? (
                <input
                  className="deck-edit-input"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") confirmEdit(deck.id);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  autoFocus
                />
              ) : (
                <strong className="deck-card-name">{deck.name}</strong>
              )}
              <span className="deck-card-meta">
                {deck.cards.length} tarjeta{deck.cards.length !== 1 ? "s" : ""} ·{" "}
                {new Date(deck.createdAt).toLocaleDateString("es-AR")}
              </span>
            </div>

            <div className="deck-card-actions">
              {editingId === deck.id ? (
                <>
                  <button className="deck-study-btn" onClick={() => confirmEdit(deck.id)}>
                    Guardar
                  </button>
                  <button
                    className="deck-delete-btn"
                    onClick={() => setEditingId(null)}
                    title="Cancelar"
                  >
                    ×
                  </button>
                </>
              ) : (
                <>
                  <button className="deck-study-btn" onClick={() => onSelect(deck)}>
                    Repasar {"->"}
                  </button>
                  {onRename && (
                    <button
                      className="deck-rename-btn"
                      onClick={() => startEdit(deck)}
                      title="Renombrar"
                    >
                      Editar
                    </button>
                  )}
                  <button
                    className="deck-delete-btn"
                    onClick={() => {
                      if (confirm(`Eliminar el mazo "${deck.name}"?`)) onDelete(deck.id);
                    }}
                    title="Eliminar"
                  >
                    ×
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
