"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchWithSupabaseAuth } from "@/lib/supabase-browser";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type MemoryType = "concept" | "summary" | "insight" | "qa" | "note";
type MemorySourceType = "pdf" | "tutor" | "flashcard" | "research" | "manual";

interface MemoryEntryRow {
  id: string;
  summary: string;
  content: string;
  type: MemoryType;
  topic?: string;
  tags: string[];
  importance: number;
  source_type?: MemorySourceType;
  source_label?: string;
  memory_enabled: boolean;
  created_at: string;
  updated_at: string;
}

interface MemorySettings {
  memory_enabled: boolean;
  auto_extract: boolean;
  max_context_entries: number;
}

const TYPE_LABELS: Record<MemoryType, string> = {
  concept: "Concept",
  summary: "Summary",
  insight: "Insight",
  qa: "Q&A",
  note: "Note",
};

const TYPE_COLORS: Record<MemoryType, string> = {
  concept: "#6366f1",
  summary: "#0ea5e9",
  insight: "#f59e0b",
  qa: "#10b981",
  note: "#8b5cf6",
};

const SOURCE_ICONS: Record<MemorySourceType | "manual", string> = {
  pdf: "📄",
  tutor: "🎓",
  flashcard: "🗂",
  research: "🔬",
  manual: "✏️",
};

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetchWithSupabaseAuth(path, init);
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "Request failed");
  }
  return res.json() as Promise<T>;
}

// ─────────────────────────────────────────────
// Add memory form
// ─────────────────────────────────────────────

function AddMemoryForm({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState("");
  const [topic, setTopic] = useState("");
  const [type, setType] = useState<MemoryType>("note");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!summary.trim() || !content.trim()) {
      setError("Summary and content are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await apiFetch("/api/memory/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary: summary.trim(), content: content.trim(), topic: topic.trim() || undefined, type }),
      });
      setSummary("");
      setContent("");
      setTopic("");
      setType("note");
      setOpen(false);
      onAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button className="mb-add-btn" onClick={() => setOpen(true)} type="button">
        <span aria-hidden="true">+</span> Add memory
      </button>
    );
  }

  return (
    <form className="mb-add-form" onSubmit={(e) => void handleSubmit(e)}>
      <div className="mb-add-row">
        <input
          className="mb-input"
          placeholder="Summary (1–2 sentences)"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          maxLength={200}
          required
        />
        <select
          className="mb-select"
          value={type}
          onChange={(e) => setType(e.target.value as MemoryType)}
        >
          {(Object.keys(TYPE_LABELS) as MemoryType[]).map((k) => (
            <option key={k} value={k}>{TYPE_LABELS[k]}</option>
          ))}
        </select>
      </div>
      <textarea
        className="mb-textarea"
        placeholder="Full content / explanation…"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
        required
      />
      <input
        className="mb-input"
        placeholder="Topic (e.g. Cell Biology)"
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        maxLength={80}
      />
      {error && <p className="mb-error">{error}</p>}
      <div className="mb-add-actions">
        <button type="submit" className="mb-btn-primary" disabled={saving}>
          {saving ? "Saving…" : "Save memory"}
        </button>
        <button type="button" className="mb-btn-ghost" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}

// ─────────────────────────────────────────────
// Memory card
// ─────────────────────────────────────────────

function MemoryCard({
  entry,
  onToggleMute,
  onDelete,
  onEdited,
}: {
  entry: MemoryEntryRow;
  onToggleMute: (id: string, enabled: boolean) => void;
  onDelete: (id: string) => void;
  onEdited: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [summary, setSummary] = useState(entry.summary);
  const [content, setContent] = useState(entry.content);
  const [topic, setTopic] = useState(entry.topic ?? "");
  const [saving, setSaving] = useState(false);
  const muted = !entry.memory_enabled;

  async function handleSave() {
    setSaving(true);
    try {
      await apiFetch(`/api/memory/entries/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary: summary.trim(), content: content.trim(), topic: topic.trim() || undefined }),
      });
      setEditing(false);
      onEdited();
    } finally {
      setSaving(false);
    }
  }

  const typeColor = TYPE_COLORS[entry.type as MemoryType] ?? "#6366f1";
  const sourceIcon = SOURCE_ICONS[(entry.source_type as MemorySourceType) ?? "manual"];
  const date = new Date(entry.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" });

  return (
    <div className={`mb-card${muted ? " mb-card--muted" : ""}`}>
      <div className="mb-card-header">
        <span className="mb-type-badge" style={{ background: typeColor + "1a", color: typeColor }}>
          {TYPE_LABELS[entry.type as MemoryType] ?? entry.type}
        </span>
        {entry.topic && <span className="mb-topic-chip">{entry.topic}</span>}
        <span className="mb-card-meta">
          {sourceIcon} {entry.source_label ?? "Manual"} · {date}
        </span>
        <div className="mb-card-actions">
          <button
            className={`mb-icon-btn${muted ? " mb-icon-btn--active" : ""}`}
            title={muted ? "Re-enable this memory" : "Mute (exclude from AI context)"}
            onClick={() => onToggleMute(entry.id, !entry.memory_enabled)}
            type="button"
          >
            {muted ? (
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M2 2l12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M8 3C5.24 3 3 5.24 3 8c0 .93.25 1.8.69 2.54L3 11.5l.96.56.62-.96A4.97 4.97 0 008 13c2.76 0 5-2.24 5-5S10.76 3 8 3z" stroke="currentColor" strokeWidth="1.3"/>
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="5" stroke="currentColor" strokeWidth="1.4"/>
                <path d="M8 5v3l2 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
            )}
          </button>
          <button
            className="mb-icon-btn"
            title="Edit"
            onClick={() => setEditing((v) => !v)}
            type="button"
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
              <path d="M3 12.5V14h1.5L12.8 5.7l-1.5-1.5L3 12.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
              <path d="M9.8 4.7l1.5 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
          </button>
          <button
            className="mb-icon-btn mb-icon-btn--danger"
            title="Delete"
            onClick={() => onDelete(entry.id)}
            type="button"
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
              <path d="M3 5h10M6 5V3.5a.5.5 0 01.5-.5h3a.5.5 0 01.5.5V5M7 8v4M9 8v4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              <rect x="4" y="5" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.4"/>
            </svg>
          </button>
        </div>
      </div>

      {editing ? (
        <div className="mb-edit-area">
          <input
            className="mb-input"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Summary"
          />
          <textarea
            className="mb-textarea"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
          />
          <input
            className="mb-input"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Topic"
          />
          <div className="mb-add-actions">
            <button className="mb-btn-primary" onClick={() => void handleSave()} disabled={saving} type="button">
              {saving ? "Saving…" : "Save"}
            </button>
            <button className="mb-btn-ghost" onClick={() => setEditing(false)} type="button">Cancel</button>
          </div>
        </div>
      ) : (
        <>
          <p className="mb-card-summary">{entry.summary}</p>
          <p className="mb-card-content">{entry.content}</p>
          {entry.tags.length > 0 && (
            <div className="mb-tags">
              {entry.tags.map((tag) => (
                <span key={tag} className="mb-tag">{tag}</span>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Settings panel
// ─────────────────────────────────────────────

function SettingsPanel({
  settings,
  onChange,
}: {
  settings: MemorySettings;
  onChange: (patch: Partial<MemorySettings>) => void;
}) {
  return (
    <div className="mb-settings">
      <h3 className="mb-settings-title">Memory settings</h3>
      <label className="mb-toggle-row">
        <span className="mb-toggle-label">
          <strong>Memory Bank</strong>
          <span className="mb-toggle-sub">Inject relevant memories into AI responses</span>
        </span>
        <button
          type="button"
          className={`mb-toggle${settings.memory_enabled ? " mb-toggle--on" : ""}`}
          onClick={() => onChange({ memory_enabled: !settings.memory_enabled })}
          aria-pressed={settings.memory_enabled}
        >
          <span className="mb-toggle-knob" />
        </button>
      </label>
      <label className="mb-toggle-row">
        <span className="mb-toggle-label">
          <strong>Auto-extract</strong>
          <span className="mb-toggle-sub">Automatically save insights after study sessions</span>
        </span>
        <button
          type="button"
          className={`mb-toggle${settings.auto_extract ? " mb-toggle--on" : ""}`}
          onClick={() => onChange({ auto_extract: !settings.auto_extract })}
          aria-pressed={settings.auto_extract}
        >
          <span className="mb-toggle-knob" />
        </button>
      </label>
      <label className="mb-toggle-row">
        <span className="mb-toggle-label">
          <strong>Context entries</strong>
          <span className="mb-toggle-sub">Max memories injected per AI call</span>
        </span>
        <select
          className="mb-select mb-select--sm"
          value={settings.max_context_entries}
          onChange={(e) => onChange({ max_context_entries: parseInt(e.target.value, 10) })}
        >
          {[2, 3, 5, 8, 10].map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </label>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main MemoryBank component
// ─────────────────────────────────────────────

export default function MemoryBank() {
  const [entries, setEntries] = useState<MemoryEntryRow[]>([]);
  const [settings, setSettings] = useState<MemorySettings>({
    memory_enabled: true,
    auto_extract: true,
    max_context_entries: 5,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [topicFilter, setTopicFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<MemoryType | null>(null);
  const [view, setView] = useState<"memories" | "settings">("memories");
  const searchRef = useRef<NodeJS.Timeout | null>(null);

  const loadEntries = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (topicFilter) params.set("topic", topicFilter);
      if (typeFilter) params.set("type", typeFilter);
      const data = await apiFetch<{ entries: MemoryEntryRow[] }>(`/api/memory/entries?${params}`);
      setEntries(data.entries ?? []);
    } catch {
      // silently ignore
    }
  }, [topicFilter, typeFilter]);

  const loadSettings = useCallback(async () => {
    try {
      const data = await apiFetch<{ settings: MemorySettings }>("/api/memory/settings");
      setSettings(data.settings);
    } catch {
      // silently ignore
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    void Promise.all([loadEntries(), loadSettings()]).finally(() => setLoading(false));
  }, [loadEntries, loadSettings]);

  async function handleSettingsChange(patch: Partial<MemorySettings>) {
    const next = { ...settings, ...patch };
    setSettings(next);
    try {
      await apiFetch("/api/memory/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
    } catch {
      setSettings(settings); // revert on failure
    }
  }

  async function handleToggleMute(id: string, enabled: boolean) {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, memory_enabled: enabled } : e)),
    );
    await apiFetch(`/api/memory/entries/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memory_enabled: enabled }),
    }).catch(() => {
      // revert
      setEntries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, memory_enabled: !enabled } : e)),
      );
    });
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this memory? This cannot be undone.")) return;
    setEntries((prev) => prev.filter((e) => e.id !== id));
    await apiFetch(`/api/memory/entries/${id}`, { method: "DELETE" }).catch(() => {
      void loadEntries();
    });
  }

  // Derive unique topics for the filter bar
  const topics = Array.from(new Set(entries.map((e) => e.topic).filter(Boolean) as string[])).sort();

  // Client-side search filter (fast, no extra round trip)
  const filtered = entries.filter((e) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      e.summary.toLowerCase().includes(q) ||
      e.content.toLowerCase().includes(q) ||
      (e.topic ?? "").toLowerCase().includes(q) ||
      e.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  return (
    <div className="mb-root">
      {/* Header */}
      <div className="mb-header">
        <div className="mb-header-left">
          <span className="mb-brain-icon" aria-hidden="true">🧠</span>
          <div>
            <h2 className="mb-title">Memory Bank</h2>
            <p className="mb-subtitle">
              {entries.length} {entries.length === 1 ? "memory" : "memories"} stored
              {!settings.memory_enabled && (
                <span className="mb-disabled-badge"> · Memory OFF</span>
              )}
            </p>
          </div>
        </div>
        <div className="mb-header-actions">
          <button
            type="button"
            className={`mb-tab${view === "memories" ? " mb-tab--active" : ""}`}
            onClick={() => setView("memories")}
          >
            Memories
          </button>
          <button
            type="button"
            className={`mb-tab${view === "settings" ? " mb-tab--active" : ""}`}
            onClick={() => setView("settings")}
          >
            Settings
          </button>
        </div>
      </div>

      {view === "settings" ? (
        <SettingsPanel settings={settings} onChange={(p) => void handleSettingsChange(p)} />
      ) : (
        <>
          {/* Toolbar */}
          <div className="mb-toolbar">
            <input
              className="mb-search"
              placeholder="Search memories…"
              value={search}
              onChange={(e) => {
                if (searchRef.current) clearTimeout(searchRef.current);
                searchRef.current = setTimeout(() => setSearch(e.target.value), 200);
                setSearch(e.target.value);
              }}
            />
            <AddMemoryForm onAdded={() => void loadEntries()} />
          </div>

          {/* Topic pills */}
          {topics.length > 0 && (
            <div className="mb-filter-row">
              <button
                type="button"
                className={`mb-pill${topicFilter === null ? " mb-pill--active" : ""}`}
                onClick={() => setTopicFilter(null)}
              >
                All topics
              </button>
              {topics.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`mb-pill${topicFilter === t ? " mb-pill--active" : ""}`}
                  onClick={() => setTopicFilter(topicFilter === t ? null : t)}
                >
                  {t}
                </button>
              ))}
            </div>
          )}

          {/* Type pills */}
          <div className="mb-filter-row">
            <button
              type="button"
              className={`mb-pill${typeFilter === null ? " mb-pill--active" : ""}`}
              onClick={() => setTypeFilter(null)}
            >
              All types
            </button>
            {(Object.keys(TYPE_LABELS) as MemoryType[]).map((k) => (
              <button
                key={k}
                type="button"
                className={`mb-pill${typeFilter === k ? " mb-pill--active" : ""}`}
                onClick={() => setTypeFilter(typeFilter === k ? null : k)}
                style={typeFilter === k ? { borderColor: TYPE_COLORS[k], color: TYPE_COLORS[k] } : {}}
              >
                {TYPE_LABELS[k]}
              </button>
            ))}
          </div>

          {/* Content */}
          {loading ? (
            <div className="mb-empty">
              <span className="mb-empty-icon">⏳</span>
              <p>Loading memories…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="mb-empty">
              <span className="mb-empty-icon">🧠</span>
              <p className="mb-empty-title">
                {entries.length === 0 ? "No memories yet" : "No matches found"}
              </p>
              <p className="mb-empty-sub">
                {entries.length === 0
                  ? "Study with the Tutor, generate flashcards, or upload PDFs — insights will be saved here automatically."
                  : "Try a different search or filter."}
              </p>
            </div>
          ) : (
            <div className="mb-list">
              {filtered.map((entry) => (
                <MemoryCard
                  key={entry.id}
                  entry={entry}
                  onToggleMute={(id, enabled) => void handleToggleMute(id, enabled)}
                  onDelete={(id) => void handleDelete(id)}
                  onEdited={() => void loadEntries()}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
