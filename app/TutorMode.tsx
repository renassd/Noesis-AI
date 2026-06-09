"use client";

import AiUsageCard from "@/components/AiUsageCard";
import { fetchWithSupabaseAuth } from "@/lib/supabase-browser";
import { useAuth } from "@/context/AuthContext";
import { useAiUsage } from "@/context/AiUsageContext";
import { useEffect, useRef, useState } from "react";
import { detectLang, langInstruction } from "./lib/detectLang";
import { renderMarkdownWithMath } from "./lib/renderRichText";
import { useLang } from "./i18n";

type Message = { role: "user" | "assistant"; content: string };

interface TutorSession {
  id: string;
  topic: string;
  messages: Message[];
  savedAt: number;
}

const STORAGE_KEY = "noesis_tutor_history";

function loadLocalHistory(): TutorSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as TutorSession[]) : [];
  } catch {
    return [];
  }
}

function saveLocalHistory(sessions: TutorSession[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch { /* ignore */ }
}

function generateId() {
  return `tutor_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function MarkdownMessage({ content }: { content: string }) {
  return <div className="rm-content" dangerouslySetInnerHTML={{ __html: renderMarkdownWithMath(content) }} />;
}

function buildTutorSystem(topic: string, langHint: string): string {
  return `You are Neuvra, an expert academic tutor. The student wants to learn about: "${topic}".

If there is a <user_memory> block present, the student has studied these topics in past sessions. Use that context naturally: build on what they already know, connect new concepts to prior learning, and avoid re-explaining things they have already mastered. Reference past knowledge when relevant ("As you studied before…", "You already know X, so…").

Your teaching method:
1. **First response**: Explain the concept with a clear analogy and concrete examples. End with a direct comprehension question.
2. **Follow-up responses**: If the student answered well, advance or deepen. If they answered poorly, re-explain from a different angle.
3. Be concise: maximum 3-4 paragraphs per response.
4. Use **bold** for key terms and dashes for steps or parts.
5. Keep a warm, encouraging and direct tone.
- When writing mathematical or scientific formulas, use valid LaTeX. Use $...$ for inline formulas and $$...$$ for block formulas.

${langHint}`;
}

export default function TutorMode() {
  const { t, lang } = useLang();
  const { auth } = useAuth();
  const { usage, loading: usageLoading, applyUsage } = useAiUsage();
  const s = t.study;

  const [topic, setTopic] = useState("");
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<TutorSession[]>([]);

  const bottomRef = useRef<HTMLDivElement>(null);
  const usageReady = auth.signedIn && !usageLoading && !!usage;
  const hasCredits = usageReady && usage.creditsRemaining > 0;
  const canSend = hasCredits && !loading && !!input.trim();
  const canStart = hasCredits && !!topic.trim();

  // Load history on mount / when auth changes
  useEffect(() => {
    if (auth.signedIn) {
      void fetchWithSupabaseAuth("/api/tutor/sessions")
        .then((res) => res.ok ? res.json() : Promise.reject())
        .then((data: { sessions: TutorSession[] }) => setHistory(data.sessions ?? []))
        .catch(() => setHistory(loadLocalHistory()));
    } else {
      setHistory(loadLocalHistory());
    }
  }, [auth.signedIn]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Auto-save current session whenever messages change
  useEffect(() => {
    if (!started || !currentSessionId || messages.length === 0) return;
    const session: TutorSession = { id: currentSessionId, topic, messages, savedAt: Date.now() };
    setHistory((prev) => {
      const filtered = prev.filter((s) => s.id !== currentSessionId);
      const updated = [session, ...filtered];
      if (!auth.signedIn) saveLocalHistory(updated);
      return updated;
    });
    if (auth.signedIn) {
      void fetchWithSupabaseAuth("/api/tutor/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(session),
      });
    }
  }, [messages]); // eslint-disable-line react-hooks/exhaustive-deps

  function fireExtract(content: string, label: string) {
    void fetchWithSupabaseAuth("/api/memory/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, source_type: "tutor", source_label: label }),
    });
  }

  async function callAI(msgs: Message[], system: string, memoryQuery?: string): Promise<string> {
    const res = await fetchWithSupabaseAuth("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        max_tokens: 16000,
        system,
        messages: msgs,
        ...(memoryQuery ? { useMemory: true, memoryQuery } : {}),
      }),
    });
    const data = await res.json();
    applyUsage(data.usage);
    if (!res.ok) throw new Error(data.error || "Error de API");
    return (data.text || "").trim();
  }

  async function startSession() {
    if (!topic.trim() || !hasCredits) return;
    const firstMsg: Message = { role: "user", content: `Quiero aprender sobre: ${topic.trim()}` };
    setLoading(true);
    setError("");
    try {
      const text = await callAI(
        [firstMsg],
        buildTutorSystem(topic, langInstruction(detectLang(topic.trim()))),
        topic,
      );
      const sessionId = generateId();
      setCurrentSessionId(sessionId);
      setStarted(true);
      setMessages([firstMsg, { role: "assistant", content: text }]);
      fireExtract(`Tema: ${topic}\n\nExplicación del tutor:\n${text}`, `Tutor: ${topic}`);
    } catch {
      setError(s.tutorError);
    } finally {
      setLoading(false);
    }
  }

  function resumeSession(session: TutorSession) {
    setTopic(session.topic);
    setMessages(session.messages);
    setCurrentSessionId(session.id);
    setStarted(true);
    setInput("");
    setError("");
  }

  function deleteSession(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (auth.signedIn) {
      void fetchWithSupabaseAuth(`/api/tutor/sessions/${id}`, { method: "DELETE" });
    }
    setHistory((prev) => {
      const updated = prev.filter((s) => s.id !== id);
      if (!auth.signedIn) saveLocalHistory(updated);
      return updated;
    });
  }

  function resetToStart() {
    setStarted(false);
    setMessages([]);
    setTopic("");
    setInput("");
    setCurrentSessionId(null);
    if (auth.signedIn) {
      void fetchWithSupabaseAuth("/api/tutor/sessions")
        .then((res) => res.ok ? res.json() : Promise.reject())
        .then((data: { sessions: TutorSession[] }) => setHistory(data.sessions ?? []))
        .catch(() => setHistory(loadLocalHistory()));
    } else {
      setHistory(loadLocalHistory());
    }
  }

  async function send() {
    if (!input.trim() || loading || !hasCredits) return;
    const userMsg: Message = { role: "user", content: input.trim() };
    const updated = [...messages, userMsg];
    setLoading(true);
    setError("");
    try {
      const text = await callAI(
        updated,
        buildTutorSystem(topic, langInstruction(detectLang(input.trim()))),
        `${topic} ${input.trim()}`,
      );
      const finalMessages: Message[] = [...updated, { role: "assistant", content: text }];
      setInput("");
      setMessages(finalMessages);
      const assistantCount = finalMessages.filter((m) => m.role === "assistant").length;
      if (assistantCount % 3 === 0) {
        fireExtract(`Tema: ${topic}\n\nEstudiante: ${input.trim()}\n\nTutor: ${text}`, `Tutor: ${topic}`);
      }
    } catch {
      setError(s.tutorError);
    } finally {
      setLoading(false);
    }
  }

  // ── Start screen ─────────────────────────────────────────────
  if (!started) {
    return (
      <div className="ws-panel ws-panel-centered">
        <div className="tutor-start">
          <div className="tutor-start-icon">Tutor</div>
          <h2 className="tutor-start-title">{s.tutorTitle}</h2>
          <p className="tutor-start-sub">{s.tutorDesc}</p>
          <div className="tutor-start-form">
            <input
              className="tutor-topic-input"
              placeholder={s.tutorPlaceholder}
              value={topic}
              onChange={(e) => { if (error) setError(""); setTopic(e.target.value); }}
              onKeyDown={(e) => e.key === "Enter" && void startSession()}
              disabled={!hasCredits}
            />
            <button className="tutor-start-btn" type="button" onClick={() => void startSession()} disabled={!canStart}>
              {s.tutorStart}
            </button>
          </div>
          {error && <p className="gen-error">{error}</p>}
          <div className="tutor-examples">
            {s.tutorExamples.map((example) => (
              <button key={example} className="tutor-example" type="button" onClick={() => setTopic(example)}>
                {example}
              </button>
            ))}
          </div>

          {/* History */}
          {history.length > 0 && (
            <div className="tutor-history">
              <p className="tutor-history-heading">
                {lang === "en" ? "Recent sessions" : "Sesiones recientes"}
              </p>
              <div className="tutor-history-list">
                {history.slice(0, 8).map((session) => (
                  <div key={session.id} className="tutor-history-item">
                    <button
                      type="button"
                      className="tutor-history-btn"
                      onClick={() => resumeSession(session)}
                    >
                      <span className="tutor-history-topic">{session.topic}</span>
                      <span className="tutor-history-meta">
                        {session.messages.filter((m) => m.role === "assistant").length}{" "}
                        {lang === "en" ? "responses" : "respuestas"} ·{" "}
                        {new Date(session.savedAt).toLocaleDateString(
                          lang === "es" ? "es-AR" : "en-US",
                          { day: "numeric", month: "short" },
                        )}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="tutor-history-delete"
                      onClick={(e) => deleteSession(session.id, e)}
                      aria-label={lang === "en" ? "Delete session" : "Eliminar sesión"}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Chat screen ──────────────────────────────────────────────
  return (
    <div className="ws-panel ws-panel-chat">
      <div className="ws-panel-header">
        <div>
          <h2 className="ws-panel-title">{s.tutorHeader} - {topic}</h2>
          <p className="ws-panel-sub">
            {s.tutorSubheader}
            {auth.signedIn && (
              <span className="tutor-memory-badge" title="El tutor recuerda lo que estudiaste en sesiones anteriores">
                🧠 memoria activa
              </span>
            )}
          </p>
        </div>
        <button className="tutor-reset-btn" type="button" onClick={resetToStart}>
          {s.tutorNewTopic}
        </button>
      </div>

      <div className="chat-messages">
        {messages.map((m, i) => (
          <div key={i} className={`chat-msg ${m.role}`}>
            {m.role === "assistant" && <div className="chat-avatar">N</div>}
            <div className="chat-bubble">
              {m.role === "assistant" ? (
                <MarkdownMessage content={m.content} />
              ) : (
                m.content.split("\n").map((line, j) => <p key={j}>{line || " "}</p>)
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="chat-msg assistant">
            <div className="chat-avatar">N</div>
            <div className="chat-bubble chat-typing"><span /><span /><span /></div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="chat-input-row">
        <input
          className="chat-input"
          placeholder={s.tutorPlaceholder}
          value={input}
          onChange={(e) => { if (error) setError(""); setInput(e.target.value); }}
          onKeyDown={(e) => e.key === "Enter" && void send()}
          disabled={loading || !hasCredits}
        />
        <button className="chat-send-btn" type="button" onClick={() => void send()} disabled={!canSend}>
          {s.send}
        </button>
      </div>

      {error && <p className="gen-error" style={{ margin: "0 22px 14px" }}>{error}</p>}
      <AiUsageCard variant="inline" />
    </div>
  );
}
