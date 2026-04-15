"use client";

import { useState } from "react";
import type { Deck } from "../lib/useDecks";

interface Props {
  decks: Deck[];
  loading: boolean;
  onSelect: (d: Deck) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
}

export default function MyDecks({ decks, loading, onSelect, onDelete, onRename }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  function startEdit(d: Deck) {
    setEditingId(d.id);
    setEditName(d.name);
  }

  function confirmEdit(id: string) {
    if (editName.trim()) onRename(id, editName.trim());
    setEditingId(null);
  }

  if (loading) {
    return (
      <div className="ws-panel ws-panel-centered">
        <div className="study-empty">
          <div className="study-empty-icon">⏳</div>
          <p className="study-empty-sub">Cargando tus mazos…</p>
        </div>
      </div>
    );
  }

  if (decks.length === 0) {
    return (
      <div className="ws-panel ws-panel-centered">
        <div className="study-empty">
          <div className="study-empty-icon">📚</div>
          <h2 className="study-empty-title">No tenés mazos guardados</h2>
          <p className="study-empty-sub">
            Generá flashcards con IA y guardá tu primer mazo para que aparezca acá.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="ws-panel">
      <div className="ws-panel-header">
        <h2 className="ws-panel-title">📚 Mis mazos</h2>
        <p className="ws-panel-sub">
          {decks.length} mazo{decks.length !== 1 ? "s" : ""} guardado{decks.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="decks-grid">
        {decks.map((d) => (
          <div key={d.id} className="deck-card">
            <div className="deck-card-icon">📚</div>
            <div className="deck-card-body">
              {editingId === d.id ? (
                <input
                  className="deck-edit-input"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") confirmEdit(d.id);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  autoFocus
                />
              ) : (
                <strong className="deck-card-name">{d.name}</strong>
              )}
              <span className="deck-card-meta">
                {d.flashcards.length} tarjeta{d.flashcards.length !== 1 ? "s" : ""} ·{" "}
                {new Date(d.created_at).toLocaleDateString("es-AR")}
              </span>
            </div>
            <div className="deck-card-actions">
              {editingId === d.id ? (
                <>
                  <button className="deck-study-btn" onClick={() => confirmEdit(d.id)}>✓</button>
                  <button className="deck-delete-btn" onClick={() => setEditingId(null)}>✕</button>
                </>
              ) : (
                <>
                  <button className="deck-study-btn" onClick={() => onSelect(d)}>Repasar →</button>
                  <button className="deck-rename-btn" onClick={() => startEdit(d)} title="Renombrar">✏️</button>
                  <button
                    className="deck-delete-btn"
                    onClick={() => { if (confirm(`¿Eliminar "${d.name}"?`)) onDelete(d.id); }}
                    title="Eliminar"
                  >✕</button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
