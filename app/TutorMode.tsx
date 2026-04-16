"use client";

import { useEffect, useRef, useState } from "react";

type Message = { role: "user" | "assistant"; content: string };

function renderMarkdown(text: string): string {
  const lines = text.split("\n");
  const out: string[] = [];
  let inList = false;

  for (const line of lines) {
    const isListItem = /^[-*]\s+/.test(line) || /^\d+\.\s+/.test(line);

    if (inList && !isListItem && line.trim() !== "") {
      out.push("</ul>");
      inList = false;
    }

    if (/^###\s+/.test(line)) {
      out.push(`<h4>${inline(line.replace(/^###\s+/, ""))}</h4>`);
      continue;
    }
    if (/^##\s+/.test(line)) {
      out.push(`<h3>${inline(line.replace(/^##\s+/, ""))}</h3>`);
      continue;
    }
    if (/^#\s+/.test(line)) {
      out.push(`<h3>${inline(line.replace(/^#\s+/, ""))}</h3>`);
      continue;
    }
    if (/^---+$/.test(line.trim())) {
      out.push("<hr />");
      continue;
    }
    if (isListItem) {
      if (!inList) {
        out.push("<ul>");
        inList = true;
      }
      const itemText = line.replace(/^[-*]\s+/, "").replace(/^\d+\.\s+/, "");
      out.push(`<li>${inline(itemText)}</li>`);
      continue;
    }
    if (line.trim() === "") {
      if (inList) {
        out.push("</ul>");
        inList = false;
      }
      out.push('<div class="rm-spacer"></div>');
      continue;
    }
    out.push(`<p>${inline(line)}</p>`);
  }

  if (inList) {
    out.push("</ul>");
  }
  return out.join("\n");
}

function inline(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*\*(.*?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/__(.*?)__/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

function MarkdownMessage({ content }: { content: string }) {
  return <div className="rm-content" dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }} />;
}

function buildTutorSystem(topic: string): string {
  return `Sos Noesis, un tutor academico experto. El estudiante quiere aprender sobre: "${topic}".

Tu metodo de ensenanza:
1. **Primera respuesta**: Explica el concepto con una analogia clara. Usa ejemplos concretos. Termina con una pregunta de comprension directa.
2. **Respuestas siguientes**: Si el estudiante respondio bien, avanza o profundiza. Si respondio mal o parcialmente, reexplica desde otro angulo.
3. Se conciso: maximo 3-4 parrafos por respuesta.
4. Usa **negrita** para terminos clave y listas con guiones para pasos o partes.
5. Manten un tono cercano, alentador y directo.

Responde siempre en espanol.`;
}

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
      body: JSON.stringify({ max_tokens: 1000, system, messages: msgs }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error de API");
    return (data.text || "").trim();
  }

  async function startSession() {
    if (!topic.trim()) return;
    setStarted(true);

    const firstMsg: Message = {
      role: "user",
      content: `Quiero aprender sobre: ${topic.trim()}`,
    };
    setMessages([firstMsg]);
    setLoading(true);

    try {
      const text = await callAI([firstMsg], buildTutorSystem(topic));
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
      const text = await callAI(updated, buildTutorSystem(topic));
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
          <div className="tutor-start-icon">Tutor</div>
          <h2 className="tutor-start-title">Modo tutor</h2>
          <p className="tutor-start-sub">
            Escribe el tema que quieres aprender y Noesis te va a explicar paso a paso, verificando tu comprension en cada etapa.
          </p>
          <div className="tutor-start-form">
            <input
              className="tutor-topic-input"
              placeholder="Ej: fotosintesis, teorema de Bayes, sistema inmune..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void startSession()}
            />
            <button className="tutor-start-btn" type="button" onClick={() => void startSession()} disabled={!topic.trim()}>
              Empezar sesion -&gt;
            </button>
          </div>
          <div className="tutor-examples">
            {["Mecanica cuantica basica", "Economia conductual", "El sistema inmune", "Machine Learning"].map((example) => (
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
          <h2 className="ws-panel-title">Modo tutor - {topic}</h2>
          <p className="ws-panel-sub">Responde las preguntas del tutor para avanzar en el tema.</p>
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
          Nuevo tema
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
          placeholder="Escribe tu respuesta..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void send()}
          disabled={loading}
        />
        <button className="chat-send-btn" type="button" onClick={() => void send()} disabled={loading || !input.trim()}>
          Enviar
        </button>
      </div>
    </div>
  );
}
