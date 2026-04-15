"use client";

import { useEffect, useRef, useState } from "react";

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

  async function startSession() {
    if (!topic.trim()) return;

    setStarted(true);

    const systemPrompt = `Sos un tutor academico experto llamado Noesis. El estudiante quiere aprender sobre: "${topic}".

Tu trabajo:
1. Empieza con una explicacion clara y simple del tema.
2. Despues de explicar, haz una pregunta de comprension.
3. Si el estudiante responde bien, profundiza.
4. Si responde mal, vuelve a explicar de otra manera.
5. Usa siempre un tono amigable, paciente y motivador.
6. Responde siempre en espanol.
7. Se conciso: maximo 3 o 4 parrafos por respuesta.`;

    const firstMsg: Message = { role: "user", content: `Quiero aprender sobre: ${topic}` };
    setMessages([firstMsg]);
    setLoading(true);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          max_tokens: 1000,
          system: systemPrompt,
          messages: [firstMsg],
        }),
      });

      const data = await res.json();
      const text = res.ok ? data.text || "" : data.error || "Ocurrio un error. Intenta de nuevo.";
      setMessages([firstMsg, { role: "assistant", content: text }]);
    } catch {
      setMessages([firstMsg, { role: "assistant", content: "Ocurrio un error. Intenta de nuevo." }]);
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
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          max_tokens: 1000,
          system: `Sos Noesis, un tutor academico experto. Estas ensenando sobre "${topic}". Se claro, conciso y en espanol. Despues de cada explicacion, haz una pregunta de comprension.`,
          messages: updated,
        }),
      });

      const data = await res.json();
      const text = res.ok ? data.text || "" : data.error || "Ocurrio un error. Intenta de nuevo.";
      setMessages([...updated, { role: "assistant", content: text }]);
    } catch {
      setMessages([...updated, { role: "assistant", content: "Ocurrio un error. Intenta de nuevo." }]);
    } finally {
      setLoading(false);
    }
  }

  if (!started) {
    return (
      <div className="ws-panel ws-panel-centered">
        <div className="tutor-start">
          <div className="tutor-start-icon">T</div>
          <h2 className="tutor-start-title">Modo tutor</h2>
          <p className="tutor-start-sub">
            Escribe el tema que quieres aprender y Noesis te guiara paso a paso.
          </p>
          <div className="tutor-start-form">
            <input
              className="tutor-topic-input"
              placeholder="Ej: fotosintesis, Bayes, sistema inmune..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && startSession()}
            />
            <button className="tutor-start-btn" type="button" onClick={startSession} disabled={!topic.trim()}>
              Empezar sesion -&gt;
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ws-panel ws-panel-chat">
      <div className="ws-panel-header">
        <div>
          <h2 className="ws-panel-title">Modo tutor - {topic}</h2>
          <p className="ws-panel-sub">Responde las preguntas del tutor para avanzar.</p>
        </div>
        <button
          className="tutor-reset-btn"
          type="button"
          onClick={() => {
            setStarted(false);
            setMessages([]);
            setTopic("");
          }}
        >
          Nuevo tema
        </button>
      </div>

      <div className="chat-messages">
        {messages.map((m, i) => (
          <div key={i} className={`chat-msg ${m.role}`}>
            {m.role === "assistant" && <div className="chat-avatar">N</div>}
            <div className="chat-bubble">
              {m.content.split("\n").map((line, j) => (
                <p key={j}>{line}</p>
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
        <input
          className="chat-input"
          placeholder="Escribe tu respuesta..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          disabled={loading}
        />
        <button className="chat-send-btn" type="button" onClick={send} disabled={loading || !input.trim()}>
          Enviar
        </button>
      </div>
    </div>
  );
}
