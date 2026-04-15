"use client";

import { useEffect, useRef, useState } from "react";

type Message = { role: "user" | "assistant"; content: string };

const TOOLS = [
  { id: "summary", label: "Resumir paper / texto", icon: "Doc" },
  { id: "review", label: "Revision de literatura", icon: "Rev" },
  { id: "explain", label: "Explicar concepto", icon: "Idea" },
  { id: "writing", label: "Estructurar escritura", icon: "Txt" },
];

const SYSTEM: Record<string, string> = {
  summary:
    "Sos un asistente de investigacion academica. Resume textos cientificos con objetivo, metodos, hallazgos, limitaciones y conclusion simple. Responde en espanol.",
  review:
    "Sos un asistente de investigacion academica especializado en revisiones de literatura. Organiza corrientes teoricas, consensos, debates, brechas y direcciones futuras. Responde en espanol.",
  explain:
    "Sos un asistente academico que explica conceptos complejos de forma clara, con analogias y ejemplos. Responde en espanol.",
  writing:
    "Sos un asistente de escritura academica. Ayuda con estructura, claridad, argumentos y secciones. Responde en espanol.",
};

const PLACEHOLDERS: Record<string, string> = {
  summary: "Pega el texto del paper o articulo que quieres resumir...",
  review: "Escribe la pregunta de investigacion o tema...",
  explain: "Que concepto quieres que te explique?",
  writing: "Pega tu texto o describe en que parte necesitas ayuda...",
};

export default function ResearchMode() {
  const [activeTool, setActiveTool] = useState("summary");
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const currentMsgs = messages[activeTool] || [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, activeTool]);

  async function send() {
    if (!input.trim() || loading) return;

    const userMsg: Message = { role: "user", content: input.trim() };
    const updated = [...currentMsgs, userMsg];
    setMessages((prev) => ({ ...prev, [activeTool]: updated }));
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          max_tokens: 1000,
          system: SYSTEM[activeTool],
          messages: updated,
        }),
      });

      const data = await res.json();
      const text = res.ok ? data.text || "" : data.error || "Ocurrio un error. Intenta de nuevo.";

      setMessages((prev) => ({
        ...prev,
        [activeTool]: [...updated, { role: "assistant", content: text }],
      }));
    } catch {
      setMessages((prev) => ({
        ...prev,
        [activeTool]: [...updated, { role: "assistant", content: "Ocurrio un error. Intenta de nuevo." }],
      }));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="ws-panel ws-panel-chat">
      <div className="ws-panel-header">
        <div>
          <h2 className="ws-panel-title">Investigacion</h2>
          <p className="ws-panel-sub">Herramientas de IA para tu flujo academico.</p>
        </div>
      </div>

      <div className="research-tabs">
        {TOOLS.map((tool) => (
          <button
            key={tool.id}
            type="button"
            className={`research-tab${activeTool === tool.id ? " active" : ""}`}
            onClick={() => setActiveTool(tool.id)}
          >
            <span>{tool.icon}</span> {tool.label}
          </button>
        ))}
      </div>

      <div className="chat-messages">
        {currentMsgs.length === 0 && (
          <div className="research-empty">
            <p className="research-empty-hint">{PLACEHOLDERS[activeTool]}</p>
          </div>
        )}

        {currentMsgs.map((m, i) => (
          <div key={i} className={`chat-msg ${m.role}`}>
            {m.role === "assistant" && <div className="chat-avatar">N</div>}
            <div className="chat-bubble">
              {m.content.split("\n").map((line, j) => (
                <p key={j}>{line || "\u00a0"}</p>
              ))}
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
        <textarea
          className="chat-input chat-textarea"
          placeholder={PLACEHOLDERS[activeTool]}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          disabled={loading}
          rows={3}
        />
        <button className="chat-send-btn" type="button" onClick={send} disabled={loading || !input.trim()}>
          Enviar
        </button>
      </div>
      <p className="chat-hint">Enter para enviar · Shift+Enter para nueva linea</p>
    </div>
  );
}
