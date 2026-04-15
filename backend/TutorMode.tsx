"use client";

import { useState, useRef, useEffect } from "react";

type Message = { role: "user" | "assistant"; content: string };

export default function TutorMode() {
  const [topic, setTopic] = useState("");
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function callAI(msgs: Message[], system: string): Promise<string> {
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system,
        messages: msgs,
      }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data.content?.map((b: { type: string; text?: string }) => b.text || "").join("") || "";
  }

  const systemPrompt = `Sos un tutor académico experto llamado Noesis. El estudiante quiere aprender sobre: "${topic}".
Tu trabajo: 1) Empezá con una explicación clara usando analogías. 2) Hacé una pregunta de comprensión al final de cada respuesta. 3) Si responde bien, avanzá o profundizá. 4) Si responde mal, explicá de otra manera. 5) Sé conciso (máximo 3-4 párrafos). 6) Respondé siempre en español.`;

  async function startSession() {
    if (!topic.trim()) return;
    setStarted(true);
    const firstMsg: Message = { role: "user", content: `Quiero aprender sobre: ${topic}` };
    setMessages([firstMsg]);
    setLoading(true);
    try {
      const text = await callAI([firstMsg], systemPrompt);
      setMessages([firstMsg, { role: "assistant", content: text }]);
    } catch {
      setMessages([firstMsg, { role: "assistant", content: "Ocurrió un error. Intentá de nuevo." }]);
    } finally {
      setLoading(false);
    }
  }

  async function send() {
    if (!input.trim() || loading) return;
    const userMsg: Message = { role: "user", content: input.trim() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setLoading(true);
    try {
      const text = await callAI(updated, systemPrompt);
      setMessages([...updated, { role: "assistant", content: text }]);
    } catch {
      setMessages([...updated, { role: "assistant", content: "Ocurrió un error. Intentá de nuevo." }]);
    } finally {
      setLoading(false);
    }
  }

  if (!started) {
    return (
      <div className="ws-panel ws-panel-centered">
        <div className="tutor-start">
          <div className="tutor-start-icon">🎓</div>
          <h2 className="tutor-start-title">Modo tutor</h2>
          <p className="tutor-start-sub">
            Escribí el tema que querés aprender y Noesis te va a explicar paso a paso,
            verificando tu comprensión en cada etapa.
          </p>
          <div className="tutor-start-form">
            <input
              className="tutor-topic-input"
              placeholder="Ej: fotosíntesis, la Segunda Guerra Mundial, el teorema de Bayes..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && startSession()}
            />
            <button className="tutor-start-btn" onClick={startSession} disabled={!topic.trim()}>
              Empezar sesión →
            </button>
          </div>
          <div className="tutor-examples">
            {["Mecánica cuántica básica", "Economía conductual", "El sistema inmune", "Machine Learning"].map((ex) => (
              <button key={ex} className="tutor-example" onClick={() => setTopic(ex)}>{ex}</button>
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
          <h2 className="ws-panel-title">🎓 Modo tutor — {topic}</h2>
          <p className="ws-panel-sub">Respondé las preguntas del tutor para avanzar en el tema.</p>
        </div>
        <button className="tutor-reset-btn" onClick={() => { setStarted(false); setMessages([]); setTopic(""); }}>
          Nuevo tema
        </button>
      </div>
      <div className="chat-messages">
        {messages.map((m, i) => (
          <div key={i} className={`chat-msg ${m.role}`}>
            {m.role === "assistant" && <div className="chat-avatar">N</div>}
            <div className="chat-bubble">
              {m.content.split("\n").map((line, j) => <p key={j}>{line}</p>)}
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
          placeholder="Escribí tu respuesta…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          disabled={loading}
        />
        <button className="chat-send-btn" onClick={send} disabled={loading || !input.trim()}>
          Enviar
        </button>
      </div>
    </div>
  );
}
