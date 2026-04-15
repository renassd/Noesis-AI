"use client";

import { useState, useRef, useEffect } from "react";

type Message = { role: "user" | "assistant"; content: string };

const TOOLS = [
  { id: "summary", label: "Resumir paper / texto", icon: "📄" },
  { id: "review",  label: "Revisión de literatura", icon: "📚" },
  { id: "explain", label: "Explicar concepto",       icon: "💡" },
  { id: "writing", label: "Estructurar escritura",   icon: "✍️" },
];

const SYSTEM: Record<string, string> = {
  summary: `Sos un asistente de investigación académica. Resumí textos científicos con esta estructura: 1) Objetivo/pregunta, 2) Métodos, 3) Hallazgos principales, 4) Limitaciones, 5) Conclusión en lenguaje simple. Respondé en español.`,
  review:  `Sos un asistente especializado en revisiones de literatura. Generá panoramas estructurados con: 1) Principales corrientes teóricas, 2) Hallazgos con consenso, 3) Debates y contradicciones, 4) Brechas de investigación, 5) Direcciones futuras. Respondé en español.`,
  explain: `Sos un asistente que explica conceptos complejos con claridad. Usá analogías cotidianas, ejemplos concretos, y estructura de lo simple a lo complejo. Al final ofrecé preguntas de reflexión. Respondé en español.`,
  writing: `Sos un asistente de escritura académica. Ayudás con: organización de argumentos, claridad, estructura de secciones y lenguaje científico apropiado. Siempre explicá tus sugerencias. Respondé en español.`,
};

const PLACEHOLDERS: Record<string, string> = {
  summary: "Pegá el texto del paper o artículo que querés resumir…",
  review:  "Escribí la pregunta de investigación o tema para la revisión de literatura…",
  explain: "¿Qué concepto querés que te explique?",
  writing: "Pegá tu texto o describí en qué parte de tu escritura necesitás ayuda…",
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
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: SYSTEM[activeTool],
          messages: updated,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const text = data.content?.map((b: { type: string; text?: string }) => b.text || "").join("") || "";
      setMessages((prev) => ({ ...prev, [activeTool]: [...updated, { role: "assistant", content: text }] }));
    } catch {
      setMessages((prev) => ({ ...prev, [activeTool]: [...updated, { role: "assistant", content: "Error. Intentá de nuevo." }] }));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="ws-panel ws-panel-chat">
      <div className="ws-panel-header">
        <div>
          <h2 className="ws-panel-title">🔬 Investigación</h2>
          <p className="ws-panel-sub">Herramientas de IA para tu flujo de investigación académica.</p>
        </div>
      </div>

      <div className="research-tabs">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            className={`research-tab${activeTool === t.id ? " active" : ""}`}
            onClick={() => setActiveTool(t.id)}
          >
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      <div className="chat-messages">
        {currentMsgs.length === 0 && (
          <div className="research-empty">
            <p className="research-empty-hint">
              {activeTool === "summary" && "📄 Pegá el texto de un paper y obtené un resumen estructurado con hallazgos, métodos y conclusiones."}
              {activeTool === "review"  && "📚 Describí tu pregunta de investigación y generá una revisión de literatura con clusters de evidencia y brechas."}
              {activeTool === "explain" && "💡 Preguntá por cualquier concepto y recibí una explicación clara con analogías y ejemplos."}
              {activeTool === "writing" && "✍️ Pegá tu texto y recibí sugerencias para mejorar la estructura y claridad académica."}
            </p>
          </div>
        )}
        {currentMsgs.map((m, i) => (
          <div key={i} className={`chat-msg ${m.role}`}>
            {m.role === "assistant" && <div className="chat-avatar">N</div>}
            <div className="chat-bubble">
              {m.content.split("\n").map((line, j) => <p key={j}>{line || "\u00a0"}</p>)}
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
        <textarea
          className="chat-input chat-textarea"
          placeholder={PLACEHOLDERS[activeTool]}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          disabled={loading}
          rows={3}
        />
        <button className="chat-send-btn" onClick={send} disabled={loading || !input.trim()}>
          Enviar
        </button>
      </div>
      <p className="chat-hint">Enter para enviar · Shift+Enter para nueva línea</p>
    </div>
  );
}
