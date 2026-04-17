"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { detectLang, langInstruction } from "./lib/detectLang";
import { renderMarkdownWithMath } from "./lib/renderRichText";

type Message = { role: "user" | "assistant"; content: string };
type ToolId = "summary" | "review" | "explain" | "writing";

type InputIntent = "single_word" | "short_concept" | "research_request" | "normal";

const RESEARCH_KEYWORDS = [
  "paper",
  "papers",
  "revision",
  "literatura",
  "autores",
  "autor",
  "corriente",
  "corrientes",
  "debate",
  "debates",
  "academico",
  "antecedente",
  "antecedentes",
  "estudio",
  "estudios",
  "investigacion",
  "teoria",
  "teorias",
  "framework",
  "evidencia",
  "hallazgo",
  "hallazgos",
  "publicacion",
];

function detectIntent(input: string): InputIntent {
  const trimmed = input.trim();
  const words = trimmed.split(/\s+/);

  if (words.length === 1) {
    return "single_word";
  }

  if (words.length <= 4) {
    const lower = trimmed.toLowerCase();
    const hasResearchKeyword = RESEARCH_KEYWORDS.some((keyword) => lower.includes(keyword));
    if (!hasResearchKeyword) {
      return "short_concept";
    }
  }

  const lower = trimmed.toLowerCase();
  const hasResearchKeyword = RESEARCH_KEYWORDS.some((keyword) => lower.includes(keyword));
  if (hasResearchKeyword) {
    return "research_request";
  }

  return "normal";
}

function baseInstructions(langHint: string): string {
  return `${langHint}
Formatting rules you must always follow:
- Use markdown: **bold** for key terms, ## for sections, - for lists.
- Do not use tables. Do not use code blocks unless showing real code.
- Be direct: start with the answer.
- When writing mathematical or scientific formulas, use valid LaTeX. Use $...$ for inline formulas and $$...$$ for block formulas.`;
}

function getSystemPrompt(tool: Exclude<ToolId, "review">, langHint: string): string {
  const base = baseInstructions(langHint);
  switch (tool) {
    case "summary":
      return `You are a specialist assistant for summarising academic and technical texts.

Cuando recibas un texto o paper:
1. Identifica el **objetivo o pregunta central**.
2. Describe brevemente los **metodos o enfoque**.
3. Lista los **hallazgos o ideas principales**.
4. Senala las **limitaciones o advertencias** mas relevantes.
5. Cierra con una **conclusion en 1-2 oraciones** en lenguaje simple.

Si el input es muy corto o no parece un texto para resumir, pide mas contexto de forma amable.

${base}`;
    case "explain":
      return `You are an expert tutor who explains complex concepts clearly and progressively.

Cuando te pidan explicar algo:
1. Empieza con una **definicion simple** en 1-2 oraciones.
2. Explica **por que importa** o en que contexto aparece.
3. Describe la logica interna con una **analogia o ejemplo concreto**.
4. Si hay **partes o etapas**, listalas con guiones.
5. Cierra con 1-2 oraciones que conecten el concepto con algo mas amplio.

Adapta la profundidad al nivel que infieras del input.

${base}`;
    case "writing":
      return `You are an academic and technical writing assistant.

Tu trabajo es ayudar a organizar, estructurar y mejorar textos. Segun lo que te pasen:
- Si te dan un **texto para mejorar**: senala los problemas concretos y propone una version revisada.
- Si te dan **ideas sueltas o un borrador**: organizalas en una estructura clara con introduccion, desarrollo y cierre.
- Si te piden **una seccion especifica**: escribila siguiendo convenciones academicas.
- Si el input es ambiguo, pregunta que tipo de ayuda necesita.

${base}`;
  }
}

function buildReviewPrompt(intent: InputIntent, input: string, langHint: string): string {
  switch (intent) {
    case "single_word":
      return `Sos un asistente academico versatil. El usuario escribio solo una palabra: "${input}".
Primero, explica brevemente que es ese concepto en 2-3 oraciones.
Luego, ofrece dos opciones explicitas al usuario:
- "Si quieres una **explicacion mas profunda**, puedo desarrollar el concepto."
- "Si quieres una **revision de literatura academica** sobre este tema (papers, autores, debates), dimelo y la hago."
No hagas una revision de literatura ahora. Solo explica y ofrece opciones.

${baseInstructions(langHint)}`;
    case "short_concept":
      return `Sos un asistente academico. El usuario escribio una frase corta: "${input}".
No asumas que quiere una revision de literatura formal.
Interpreta el input como una solicitud de **explicacion o contexto** sobre ese tema.
Responde con:
1. Una **definicion o explicacion clara** del concepto.
2. El **contexto** en que se usa o estudia.
3. Una mencion de si hay debates o corrientes relevantes.
4. Al final, pregunta: "Quieres que profundice en alguna corriente teorica o aspecto especifico?"

${baseInstructions(langHint)}`;
    case "research_request":
      return `Sos un asistente especializado en revisiones de literatura academica.
El usuario claramente esta buscando una revision formal. Responde con:

## Panorama general
Describe el campo o area de estudio en 2-3 oraciones.

## Corrientes y enfoques principales
Lista las corrientes teoricas o enfoques metodologicos mas relevantes.

## Consensos y debates
Senala que hay acuerdo en el campo y donde existen tensiones o debates activos.

## Brechas y preguntas abiertas
Identifica que no se sabe todavia o que areas estan subinvestigadas.

## Proximos pasos sugeridos
Sugiere 2-3 lineas de investigacion o lecturas recomendadas.

${baseInstructions(langHint)}`;
    default:
      return `Sos un asistente especializado en revisiones de literatura academica.
Analiza el input del usuario y responde con una revision estructurada que incluya:

## Panorama general
Contexto del area o pregunta.

## Enfoques y corrientes
Principales perspectivas teoricas o metodologicas.

## Consensos y debates
Acuerdos y tensiones en el campo.

## Brechas de investigacion
Preguntas abiertas o areas poco exploradas.

## Sugerencias de proximos pasos
Lecturas o lineas de trabajo recomendadas.

Si el input no es suficientemente especifico para una revision, pide mas contexto indicando que informacion necesitas.

${baseInstructions(langHint)}`;
  }
}

const TOOLS: { id: ToolId; label: string; icon: string }[] = [
  { id: "summary", label: "Resumir texto", icon: "Doc" },
  { id: "review", label: "Revision de literatura", icon: "Rev" },
  { id: "explain", label: "Explicar concepto", icon: "Idea" },
  { id: "writing", label: "Estructurar escritura", icon: "Txt" },
];

const PLACEHOLDERS: Record<ToolId, string> = {
  summary: "Pega el texto del paper o articulo que quieres resumir...",
  review: "Escribe tu tema, pregunta de investigacion o lo que quieres explorar...",
  explain: "Que concepto quieres que te explique? (ej: meiosis, Bayes...)",
  writing: "Pega tu texto o describe que parte de tu escritura necesitas organizar...",
};

const EMPTY_HINTS: Record<ToolId, string> = {
  summary: "Pega el texto de un paper y obten un resumen estructurado con hallazgos, metodos y conclusiones.",
  review: "Escribe una pregunta de investigacion o tema. Si escribes algo corto como 'meiosis', te dare contexto y opciones.",
  explain: "Escribe cualquier concepto y te lo explico de forma clara, con analogias y ejemplos.",
  writing: "Pega tu texto o describe en que parte de tu escritura necesitas ayuda.",
};

function MarkdownMessage({ content }: { content: string }) {
  return <div className="rm-content" dangerouslySetInnerHTML={{ __html: renderMarkdownWithMath(content) }} />;
}

export default function ResearchMode() {
  const [activeTool, setActiveTool] = useState<ToolId>("summary");
  const [messages, setMessages] = useState<Record<ToolId, Message[]>>({
    summary: [],
    review: [],
    explain: [],
    writing: [],
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const currentMsgs = messages[activeTool] ?? [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, activeTool]);

  function switchTool(id: ToolId) {
    setActiveTool(id);
    setInput("");
  }

  async function send() {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const langHint = langInstruction(detectLang(trimmed));

    const systemPrompt =
      activeTool === "review"
        ? buildReviewPrompt(detectIntent(trimmed), trimmed, langHint)
        : getSystemPrompt(activeTool as Exclude<ToolId, "review">, langHint);

    const userMsg: Message = { role: "user", content: trimmed };
    const updated = [...currentMsgs, userMsg];

    setMessages((prev) => ({ ...prev, [activeTool]: updated }));
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          max_tokens: 1200,
          system: systemPrompt,
          messages: updated,
        }),
      });

      const data = await res.json();
      const text = res.ok
        ? (data.text || "").trim()
        : data.error || "Ocurrio un error. Intenta de nuevo.";

      setMessages((prev) => ({
        ...prev,
        [activeTool]: [...updated, { role: "assistant", content: text }],
      }));
    } catch {
      setMessages((prev) => ({
        ...prev,
        [activeTool]: [...updated, { role: "assistant", content: "Ocurrio un error de red. Intenta de nuevo." }],
      }));
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  }

  return (
    <div className="ws-panel ws-panel-chat">
      <div className="ws-panel-header">
        <div>
          <h2 className="ws-panel-title">Investigacion</h2>
          <p className="ws-panel-sub">Herramientas de IA para tu flujo academico. Cada modo adapta la respuesta.</p>
        </div>
      </div>

      <div className="research-tabs">
        {TOOLS.map((tool) => (
          <button
            key={tool.id}
            type="button"
            className={`research-tab${activeTool === tool.id ? " active" : ""}`}
            onClick={() => switchTool(tool.id)}
          >
            <span>{tool.icon}</span>
            {tool.label}
          </button>
        ))}
      </div>

      <div className="chat-messages">
        {currentMsgs.length === 0 && (
          <div className="research-empty">
            <p className="research-empty-hint">{EMPTY_HINTS[activeTool]}</p>
          </div>
        )}

        {currentMsgs.map((m, i) => (
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
        <textarea
          className="chat-input chat-textarea"
          placeholder={PLACEHOLDERS[activeTool]}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          rows={3}
        />
        <button className="chat-send-btn" type="button" onClick={() => void send()} disabled={loading || !input.trim()}>
          Enviar
        </button>
      </div>
      <p className="chat-hint">Enter para enviar · Shift+Enter para nueva linea</p>
    </div>
  );
}
