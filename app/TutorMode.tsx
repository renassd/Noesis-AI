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

function MarkdownMessage({ content }: { content: string }) {
  return <div className="rm-content" dangerouslySetInnerHTML={{ __html: renderMarkdownWithMath(content) }} />;
}

function buildTutorSystem(topic: string, langHint: string): string {
  return `You are Neuvra, an expert academic tutor. The student wants to learn about: "${topic}".

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
  const { t } = useLang();
  const { auth } = useAuth();
  const { usage, loading: usageLoading, applyUsage } = useAiUsage();
  const s = t.study;
  const [topic, setTopic] = useState("");
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const usageReady = auth.signedIn && !usageLoading && !!usage;
  const hasCredits = usageReady && usage.creditsRemaining > 0;
  const canSend = hasCredits && !loading && !!input.trim();
  const canStart = hasCredits && !!topic.trim();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function callAI(msgs: Message[], system: string): Promise<string> {
    const res = await fetchWithSupabaseAuth("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ max_tokens: 1000, system, messages: msgs }),
    });
    const data = await res.json();
    applyUsage(data.usage);
    if (!res.ok) throw new Error(data.error || "Error de API");
    return (data.text || "").trim();
  }

  async function startSession() {
    if (!topic.trim()) return;
    if (!hasCredits) {
      setError("Ya no te quedan creditos de IA.");
      return;
    }

    const firstMsg: Message = {
      role: "user",
      content: `Quiero aprender sobre: ${topic.trim()}`,
    };
    setLoading(true);
    setError("");

    try {
      const text = await callAI([firstMsg], buildTutorSystem(topic, langInstruction(detectLang(topic.trim()))));
      setStarted(true);
      setMessages([firstMsg, { role: "assistant", content: text }]);
    } catch {
      setError("Ocurrio un error. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  async function send() {
    if (!input.trim() || loading) return;
    if (!hasCredits) {
      setError("Ya no te quedan creditos de IA.");
      return;
    }
    const userMsg: Message = { role: "user", content: input.trim() };
    const updated = [...messages, userMsg];
    setLoading(true);
    setError("");

    try {
      const text = await callAI(updated, buildTutorSystem(topic, langInstruction(detectLang(input.trim()))));
      setInput("");
      setMessages([...updated, { role: "assistant", content: text }]);
    } catch {
      setError("Ocurrio un error. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

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
              onChange={(e) => {
                if (error) setError("");
                setTopic(e.target.value);
              }}
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
        </div>
      </div>
    );
  }

  return (
    <div className="ws-panel ws-panel-chat">
      <div className="ws-panel-header">
        <div>
          <h2 className="ws-panel-title">{s.tutorHeader} - {topic}</h2>
          <p className="ws-panel-sub">{s.tutorSubheader}</p>
        </div>
        <button
          className="tutor-reset-btn"
          type="button"
          onClick={() => {
            setStarted(false);
            setMessages([]);
            setTopic("");
            setInput("");
          }}
        >
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
                m.content.split("\n").map((line, j) => <p key={j}>{line || "\u00a0"}</p>)
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="chat-msg assistant">
            <div className="chat-avatar">N</div>
            <div className="chat-bubble chat-typing">
              <span />
              <span />
              <span />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="chat-input-row">
        <input
          className="chat-input"
          placeholder={s.tutorPlaceholder}
          value={input}
          onChange={(e) => {
            if (error) setError("");
            setInput(e.target.value);
          }}
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
