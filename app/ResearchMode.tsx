"use client";

import Image from "next/image";
import AiUsageCard from "@/components/AiUsageCard";
import { fetchWithSupabaseAuth } from "@/lib/supabase-browser";
import { useAuth } from "@/context/AuthContext";
import { useAiUsage } from "@/context/AiUsageContext";
import { buildDocumentSystemContext } from "./lib/pdfChunking";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useLang } from "./i18n";
import { detectLang, langInstruction } from "./lib/detectLang";
import { renderMarkdownWithMath } from "./lib/renderRichText";
import { ImportBar, type ImportedTextFile } from "./ImportBar";

type AttachedDocument = {
  id: string;
  fileName: string;
  content: string;
  mimeType?: string;
  source: "upload" | "drive" | "local";
  usedOcr?: boolean;
  warning?: string | null;
};

type GeneratedCardsData = {
  deckId: string;
  deckName: string;
  cardCount: number;
  preview: Array<{ question: string; answer: string }>;
};

interface PaperResult {
  id: string;
  title: string;
  authors: string[];
  year?: number | null;
  abstract: string;
  url: string;
  summary?: string;
}

interface LandscapeReport {
  topic: string;
  summary: string;
  comparisonTable?: { headers: string[]; rows: string[][] };
  trendsByYear?: Array<{ year: number; count: number }>;
  gaps?: string[];
  sources: PaperResult[];
}

type Message = {
  role: "user" | "assistant";
  content: string;
  imageDataUrl?: string;
  attachment?: Omit<AttachedDocument, "content">;
  generatedCards?: GeneratedCardsData;
  paperResults?: PaperResult[];
  /** "results" = find-papers card list · "sources" = literature review citations */
  paperResultsMode?: "results" | "sources";
  landscapeReport?: LandscapeReport;
};
type ToolId = "summary" | "review" | "explain" | "writing" | "papers" | "findpapers" | "landscape";
type InputIntent = "single_word" | "short_concept" | "research_request" | "normal";

interface ResearchSession {
  id: string;
  title: string;
  activeTool: ToolId;
  messages: Record<ToolId, Message[]>;
  input: string;
  attachment: AttachedDocument | null;
  savedAt: number;
}

interface SessionState {
  sessions: ResearchSession[];
  activeSessionId: string;
}

const RESEARCH_KEYWORDS = [
  "paper", "papers", "revision", "literatura", "autores", "autor", "corriente",
  "corrientes", "debate", "debates", "academico", "antecedente", "antecedentes",
  "estudio", "estudios", "investigacion", "teoria", "teorias", "framework",
  "evidencia", "hallazgo", "hallazgos", "publicacion",
];

const STORAGE_KEY = "noesis_research_history";
const ACTIVE_SESSION_KEY = "noesis_research_active_session";
const DRAFT_SESSION_ID = "research_draft";

function detectIntent(input: string): InputIntent {
  const trimmed = input.trim();
  const words = trimmed.split(/\s+/);
  if (words.length === 1) return "single_word";
  if (words.length <= 4) {
    const lower = trimmed.toLowerCase();
    const hasResearchKeyword = RESEARCH_KEYWORDS.some((keyword) => lower.includes(keyword));
    if (!hasResearchKeyword) return "short_concept";
  }
  const lower = trimmed.toLowerCase();
  const hasResearchKeyword = RESEARCH_KEYWORDS.some((keyword) => lower.includes(keyword));
  if (hasResearchKeyword) return "research_request";
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
    case "papers":
      return `You are a specialist assistant for analysing academic research papers and scientific documents.

When the user pastes a paper, article or academic text, produce a structured analysis:

## Research question
One or two sentences on what the paper tries to answer or demonstrate.

## Methodology
Study design, data sources, participants or corpus, and analysis methods.

## Key findings
Bullet list of the main results with supporting evidence where relevant.

## Contributions
What this paper adds to its field.

## Limitations & caveats
Weaknesses in design, scope, generalisability, or potential biases.

## Key concepts
Any technical terms, models or formulas worth understanding, with brief explanations.

If only a title, abstract or DOI is provided, analyse what is available and ask for the full text.
If no specific question is asked, produce the full structured analysis above.

${base}`;
    case "findpapers":
    case "landscape":
      return base;
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

/**
 * Reconstruct a plain-text abstract from OpenAlex's inverted index format.
 * { "word": [pos1, pos2], ... }  →  sorted by position  →  joined string
 */
function reconstructAbstract(idx: Record<string, number[]> | null | undefined): string {
  if (!idx) return "";
  const entries: Array<[number, string]> = [];
  for (const [word, positions] of Object.entries(idx)) {
    for (const pos of positions) entries.push([pos, word]);
  }
  return entries.sort((a, b) => a[0] - b[0]).map(([, w]) => w).join(" ");
}

/**
 * Search academic papers via OpenAlex (https://openalex.org).
 * OpenAlex is free, requires no API key, and explicitly supports CORS from browsers.
 * Returns up to `limit` papers that have a reconstructed abstract.
 */
async function searchSemanticScholar(query: string, limit: number): Promise<PaperResult[]> {
  const url =
    `https://api.openalex.org/works` +
    `?search=${encodeURIComponent(query)}` +
    `&per-page=${limit + 4}` +
    `&select=id,title,authorships,publication_year,abstract_inverted_index,doi,primary_location` +
    `&mailto=neuvra@neuvra.app`;

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(12000),
  });

  if (!res.ok) throw new Error(`OpenAlex ${res.status}`);

  const data = (await res.json()) as {
    results?: Array<{
      id: string;
      title?: string;
      authorships?: Array<{ author?: { display_name?: string } }>;
      publication_year?: number;
      abstract_inverted_index?: Record<string, number[]> | null;
      doi?: string;
      primary_location?: { landing_page_url?: string };
    }>;
  };

  return (data.results ?? [])
    .map((w) => ({
      id: w.id,
      title: w.title ?? "Untitled",
      authors: (w.authorships ?? []).map((a) => a.author?.display_name ?? "").filter(Boolean),
      year: w.publication_year ?? null,
      abstract: reconstructAbstract(w.abstract_inverted_index),
      url: w.primary_location?.landing_page_url ?? (w.doi ? w.doi : ""),
    }))
    .filter((p) => p.abstract.length > 20)
    .slice(0, limit);
}

/**
 * Strip Spanish filler words from a search query so Semantic Scholar
 * (which works best with English terms) returns better results.
 * e.g. "Revisión de CAR-T Cell Therapy en Tumores" → "CAR-T Cell Therapy Tumores"
 */
function cleanReviewQuery(query: string): string {
  const fillers =
    /\b(revisión|revision|review|análisis|analisis|resumen|sobre|acerca|de|del|la|el|los|las|un|una|y|e|o|u|en|para|con|por|sin|entre|desde|hasta|como|cuando|donde|qué|que|cómo|como|también|tambien|además|ademas|estudio|estudios|investigación|investigacion)\b/gi;
  const cleaned = query.replace(fillers, " ").replace(/\s+/g, " ").trim();
  // Fall back to original query if cleaning removed everything
  return cleaned.length >= 3 ? cleaned : query.trim();
}

function getTools(lang: "es" | "en"): Array<{ id: ToolId; label: string; isNew?: boolean }> {
  return lang === "en"
    ? [
        { id: "papers"     as ToolId, label: "Analyze paper" },
        { id: "summary"    as ToolId, label: "Summarize text" },
        { id: "review"     as ToolId, label: "Literature review" },
        { id: "findpapers" as ToolId, label: "Find papers" },
        { id: "explain"    as ToolId, label: "Explain concept" },
        { id: "writing"    as ToolId, label: "Structure writing" },
        { id: "landscape"  as ToolId, label: "Report / Landscape", isNew: true },
      ]
    : [
        { id: "papers"     as ToolId, label: "Analizar paper" },
        { id: "summary"    as ToolId, label: "Resumir texto" },
        { id: "review"     as ToolId, label: "Revisión de literatura" },
        { id: "findpapers" as ToolId, label: "Buscar papers" },
        { id: "explain"    as ToolId, label: "Explicar concepto" },
        { id: "writing"    as ToolId, label: "Estructurar escritura" },
        { id: "landscape"  as ToolId, label: "Reporte / Landscape", isNew: true },
      ];
}

function getPlaceholders(lang: "es" | "en"): Record<ToolId, string> {
  return lang === "en"
    ? {
        papers:     "Paste a research paper, article or abstract — I'll extract methodology, findings, contributions and limitations...",
        summary:    "Paste the paper or article text you want to summarize...",
        review:     "Write your topic, research question or what you want to explore...",
        findpapers: "Enter a topic or research question to find relevant papers with AI summaries...",
        explain:    "What concept would you like explained? (e.g. meiosis, Bayes...)",
        writing:    "Paste your text or describe what part of your writing needs help...",
        landscape:  "Enter a research topic to generate a landscape report with summary, comparison table, trends and gaps...",
      }
    : {
        papers:     "Pegá un paper, artículo o abstract — extraeré metodología, hallazgos, contribuciones y limitaciones...",
        summary:    "Pegá el texto del paper o artículo que querés resumir...",
        review:     "Escribí tu tema, pregunta de investigación o lo que querés explorar...",
        findpapers: "Escribí un tema o pregunta de investigación para encontrar papers con resúmenes IA...",
        explain:    "¿Qué concepto querés que te explique? (ej: meiosis, Bayes...)",
        writing:    "Pegá tu texto o describí qué parte de tu escritura necesita organizarse...",
        landscape:  "Escribí un tema de investigación para generar un reporte landscape con resumen, tabla comparativa, tendencias y brechas...",
      };
}

function getEmptyHints(lang: "en" | "es"): Record<ToolId, string> {
  return lang === "en"
    ? {
        papers:     "Paste any research paper or academic article. I'll extract the research question, methodology, key findings, contributions and limitations.",
        summary:    "Paste the text of a paper or article to get a structured summary with findings, methods and conclusions.",
        review:     "Write a research question or topic. Short inputs like 'meiosis' will get context and options.",
        findpapers: "Type any topic or research question. I'll find relevant academic papers and summarize each one so you can choose what to read.",
        explain:    "Write any concept and I will explain it clearly, with analogies and examples.",
        writing:    "Paste your text or describe which part of your writing needs help.",
        landscape:  "Write a research topic. I'll search academic papers, analyze the current landscape and build a report with a summary, comparison table, trends chart and research gaps.",
      }
    : {
        papers:     "Pegá cualquier paper o artículo académico. Extraeré la pregunta de investigación, metodología, hallazgos clave, contribuciones y limitaciones.",
        summary:    "Pegá el texto de un paper y obtené un resumen estructurado con hallazgos, métodos y conclusiones.",
        review:     "Escribí una pregunta de investigación o tema. Si escribís algo corto como 'meiosis', te daré contexto y opciones.",
        findpapers: "Escribí cualquier tema o pregunta. Voy a buscar papers académicos relevantes y resumir cada uno para que elijas qué leer.",
        explain:    "Escribí cualquier concepto y te lo explico de forma clara, con analogías y ejemplos.",
        writing:    "Pegá tu texto o describí en qué parte de tu escritura necesitás ayuda.",
        landscape:  "Escribí un tema de investigación. Voy a buscar papers académicos, analizar el estado actual del tema y armar un reporte con resumen, tabla comparativa, gráfico de tendencias y brechas de investigación.",
      };
}

// ── Flashcard generation helpers ──────────────────────────────────────────────

const FLASHCARD_TRIGGERS = [
  "flashcard", "flash card", "flash-card",
  "tarjeta", "tarjetas",
  "make cards", "create cards", "generate cards", "study cards",
  "make flashcards", "create flashcards", "generate flashcards",
  "genera tarjetas", "crear tarjetas", "crea tarjetas",
  "tarjetas de estudio", "quiero tarjetas", "quiero flashcards",
  "dame tarjetas", "dame flashcards",
];

function detectFlashcardIntent(text: string): boolean {
  const lower = text.toLowerCase();
  return FLASHCARD_TRIGGERS.some((trigger) => lower.includes(trigger));
}

/**
 * Collects usable source content for flashcard generation.
 *
 * Priority order (intentional):
 *  1. Current session attachment — the user explicitly uploaded a file for
 *     this action. After a send() the session clears the attachment, so this
 *     is only available when the upload is fresh (i.e. "PDF + ask flashcards"
 *     in one step).
 *  2. Current tool's assistant responses — previous explanation in this tab.
 *  3. Other tool tabs' assistant responses — cross-tab context fallback.
 *
 * Returns the collected text and a source label for logging.
 */
function buildChatContextText(
  allMessages: Record<ToolId, Message[]>,
  currentTool: ToolId,
  attachment: AttachedDocument | null,
): { text: string; source: string } {
  const parts: string[] = [];
  const sources: string[] = [];

  // ── Priority 1: Fresh attachment (PDF/document uploaded, not yet sent) ──────
  if (attachment?.content?.trim()) {
    const content = attachment.content.trim().slice(0, 3000);
    parts.push(content);
    sources.push(`uploaded "${attachment.fileName}"`);
    console.log("[FC-context] source=attachment", { fileName: attachment.fileName, length: content.length });
  }

  // ── Priority 2: Current tool's assistant responses ────────────────────────
  const currentAssistant = (allMessages[currentTool] ?? [])
    .filter((m) => m.role === "assistant" && !m.generatedCards && m.content.length > 100)
    .slice(-4)
    .map((m) => m.content);
  if (currentAssistant.length > 0) {
    parts.push(currentAssistant.join("\n\n"));
    sources.push(`${currentTool} conversation`);
    console.log("[FC-context] source=currentTool", { tool: currentTool, count: currentAssistant.length });
  }

  // ── Priority 3: Other tabs (cross-tab fallback) ───────────────────────────
  if (parts.join("").length < 300) {
    const ALL_TOOLS: ToolId[] = ["papers", "summary", "review", "explain", "writing", "findpapers"];
    for (const tool of ALL_TOOLS) {
      if (tool === currentTool) continue;
      const other = (allMessages[tool] ?? [])
        .filter((m) => m.role === "assistant" && !m.generatedCards && m.content.length > 100)
        .slice(-3)
        .map((m) => m.content);
      if (other.length > 0) {
        parts.push(other.join("\n\n"));
        sources.push(`${tool} tab`);
        console.log("[FC-context] source=otherTool", { tool, count: other.length });
        break;
      }
    }
  }

  const text = parts.join("\n\n").slice(0, 4000);
  const source = sources.join(" + ") || "none";
  console.log("[FC-context] final", { textLength: text.length, source });
  return { text, source };
}

// ── Flashcard generation prompt ───────────────────────────────────────────────
//
// We use the same "all instructions + content in one user message" pattern
// that FlashcardGenerator.tsx has been using reliably.  No system-prompt-only
// approach, no response-prefilling — those techniques introduced fragile
// reconstruction logic that kept failing.
//
// The mock (buildMockResponse in route.ts) detects this request via:
//   system.includes("flashcard generator")   — from the minimal system prompt
// and extracts the source text by splitting on "TEXT:\n".

/**
 * Builds the user message for flashcard generation.
 * All instructions + content are embedded in a single user turn so the model
 * cannot mistake the source text for an instruction.
 */
function buildFlashcardUserMessage(
  quantity: number,
  contextText: string,
  contentLang: "es" | "en" | "auto",
): string {
  const langNote =
    contentLang === "es"
      ? "Write the question and answer text in Spanish."
      : contentLang === "en"
      ? "Write the question and answer text in English."
      : "Write the question and answer text in the same language as the source content.";

  return `Generate exactly ${quantity} study flashcards from the TEXT section below.

${langNote}

STRICT INSTRUCTIONS:
- Return ONLY valid JSON. No explanation. No markdown. No code fences. No text before or after the JSON.
- Required format: {"flashcards":[{"question":"...","answer":"..."}]}
- Field names MUST be the English words "question" and "answer". Never translate the keys.
- Questions should test comprehension, not literal memorisation.
- Answers should be concise: 1–3 sentences.
- For formulas use LaTeX: $...$ inline, $$...$$ display.

TEXT:
${contextText.slice(0, 4000)}`;
}

/**
 * Normalise a single card object.
 * Accepts English, Spanish, and front/back field names.
 */
function normalizeCard(c: unknown): { question: string; answer: string } | null {
  if (typeof c !== "object" || c === null) return null;
  const obj = c as Record<string, unknown>;
  const question =
    typeof obj.question  === "string" ? obj.question  :
    typeof obj.pregunta  === "string" ? obj.pregunta  :
    typeof obj.front     === "string" ? obj.front     :
    typeof obj.q         === "string" ? obj.q         :
    null;
  const answer =
    typeof obj.answer    === "string" ? obj.answer    :
    typeof obj.respuesta === "string" ? obj.respuesta :
    typeof obj.back      === "string" ? obj.back      :
    typeof obj.a         === "string" ? obj.a         :
    null;
  if (!question?.trim() || !answer?.trim()) return null;
  return { question: question.trim(), answer: answer.trim() };
}

/**
 * Extract cards from any parsed JSON value:
 *   { flashcards: [...] }  ← new required format
 *   { cards: [...] }       ← alias
 *   [...]                  ← direct array
 */
function extractCardsFromParsed(parsed: unknown): Array<{ question: string; answer: string }> {
  let arr: unknown[] = [];

  if (Array.isArray(parsed)) {
    arr = parsed;
  } else if (typeof parsed === "object" && parsed !== null) {
    const obj = parsed as Record<string, unknown>;
    if (Array.isArray(obj.flashcards)) arr = obj.flashcards;
    else if (Array.isArray(obj.cards))  arr = obj.cards;
    else if (Array.isArray(obj.items))  arr = obj.items;
  }

  return arr.flatMap((c) => {
    const card = normalizeCard(c);
    return card ? [card] : [];
  });
}

/**
 * Main parser — 4 independent strategies, each can succeed on its own.
 * Returns as soon as any strategy produces ≥1 valid card.
 */
function parseFlashcardResponse(raw: string): Array<{ question: string; answer: string }> {
  if (!raw?.trim()) return [];

  // Strip markdown code fences
  const cleaned = raw
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  // ── Strategy 1: parse the whole string as JSON ────────────────────────────
  try {
    const cards = extractCardsFromParsed(JSON.parse(cleaned));
    if (cards.length > 0) return cards;
  } catch { /* continue */ }

  // ── Strategy 2: bracket scan — every {/[ paired with }/] ─────────────────
  // Handles "Here are your cards: {...}" (prose before JSON)
  const opens = new Set(["{", "["]);
  const closeOf: Record<string, string> = { "{": "}", "[": "]" };
  for (let si = 0; si < cleaned.length; si++) {
    const ch = cleaned[si];
    if (!opens.has(ch!)) continue;
    const close = closeOf[ch!]!;
    for (let ei = cleaned.length - 1; ei > si; ei--) {
      if (cleaned[ei] !== close) continue;
      try {
        const cards = extractCardsFromParsed(JSON.parse(cleaned.slice(si, ei + 1)));
        if (cards.length > 0) return cards;
      } catch { /* try next */ }
    }
  }

  // ── Strategy 3: Q/A line-by-line ─────────────────────────────────────────
  const qaCards = parseQALines(cleaned);
  if (qaCards.length > 0) return qaCards;

  // ── Strategy 4: raw regex — works even on truncated/malformed JSON ────────
  // Directly scans for  "question":"VALUE"  followed by  "answer":"VALUE"
  // anywhere in the text, regardless of surrounding structure.
  return extractCardsByRegex(cleaned);
}

/**
 * Absolute last-resort parser.
 * Uses regex to pull "question"/"answer" (and alias variants) pairs from any
 * text, even when JSON.parse fails entirely.
 */
function extractCardsByRegex(text: string): Array<{ question: string; answer: string }> {
  const cards: Array<{ question: string; answer: string }> = [];

  // Match any key that maps to a question concept
  const Q_KEYS = "question|pregunta|front|q";
  const A_KEYS = "answer|respuesta|back|a";

  // Pattern: "KEY" : "VALUE"
  //   KEY  — one of the recognised question keys
  //   VALUE — any quoted string (handles \" escapes inside)
  const pairRe = new RegExp(
    `"(?:${Q_KEYS})"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"[\\s\\S]*?"(?:${A_KEYS})"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`,
    "gi",
  );

  let m: RegExpExecArray | null;
  while ((m = pairRe.exec(text)) !== null) {
    const question = m[1].replace(/\\"/g, '"').replace(/\\n/g, "\n").trim();
    const answer   = m[2].replace(/\\"/g, '"').replace(/\\n/g, "\n").trim();
    if (question && answer) cards.push({ question, answer });
  }

  // Also handle the reversed order (answer before question — unlikely but possible)
  if (cards.length === 0) {
    const reversedRe = new RegExp(
      `"(?:${A_KEYS})"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"[\\s\\S]*?"(?:${Q_KEYS})"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`,
      "gi",
    );
    while ((m = reversedRe.exec(text)) !== null) {
      const answer   = m[1].replace(/\\"/g, '"').replace(/\\n/g, "\n").trim();
      const question = m[2].replace(/\\"/g, '"').replace(/\\n/g, "\n").trim();
      if (question && answer) cards.push({ question, answer });
    }
  }

  return cards;
}

function parseQALines(text: string): Array<{ question: string; answer: string }> {
  const strip = (s: string) => s.replace(/^\*+|\*+$/g, "").replace(/\s+/g, " ").trim();
  const cards: Array<{ question: string; answer: string }> = [];
  let pendingQ = "";

  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const qm = line.match(/^(?:\d+[.)]\s*)?(?:\*+)?\s*(?:Q(?:uestion)?|Pregunta)\s*:?\s*\*?\s*(.+)/i);
    const am = line.match(/^(?:\*+)?\s*(?:A(?:nswer)?|Respuesta)\s*:?\s*\*?\s*(.+)/i);
    if (qm) {
      pendingQ = strip(qm[1]);
    } else if (am && pendingQ) {
      cards.push({ question: pendingQ, answer: strip(am[1]) });
      pendingQ = "";
    }
  }
  return cards;
}

// Keep filterCards as a thin alias so no other code breaks
function filterCards(arr: unknown[]): Array<{ question: string; answer: string }> {
  return extractCardsFromParsed(arr);
}

// (buildFlashcardSystemPrompt removed — instructions now live in the user message
//  via buildFlashcardUserMessage, matching the proven FlashcardGenerator.tsx approach)

// ── Flashcard bubble component ────────────────────────────────────────────────

function FlashcardBubble({ data, lang }: { data: GeneratedCardsData; lang: "es" | "en" }) {
  return (
    <div className="ri-fc-bubble">
      <div className="ri-fc-bubble-header">
        <span className="ri-fc-bubble-icon" aria-hidden="true">🃏</span>
        <div>
          <strong className="ri-fc-bubble-title">{data.deckName}</strong>
          <span className="ri-fc-bubble-count">
            {data.cardCount} {lang === "en" ? "flashcards generated" : "tarjetas generadas"}
          </span>
        </div>
      </div>
      {data.preview.length > 0 && (
        <div className="ri-fc-preview">
          {data.preview.map((card, i) => (
            <div key={i} className="ri-fc-preview-card">
              <p className="ri-fc-preview-q">{card.question}</p>
              <p className="ri-fc-preview-a">{card.answer}</p>
            </div>
          ))}
        </div>
      )}
      <a href="/estudio" className="ri-fc-study-btn">
        {lang === "en" ? "Study now →" : "Estudiar ahora →"}
      </a>
    </div>
  );
}

function PaperResultsMessage({ papers, lang }: { papers: PaperResult[]; lang: "es" | "en" }) {
  if (papers.length === 0) {
    return (
      <p className="ri-paper-empty">
        {lang === "en" ? "No papers found. Try a different search term." : "No se encontraron papers. Probá con otro término."}
      </p>
    );
  }
  return (
    <div className="ri-paper-list">
      {papers.map((paper, i) => (
        <div key={paper.id || i} className="ri-paper-card">
          <div className="ri-paper-card-top">
            <span className="ri-paper-num">{i + 1}</span>
            <div className="ri-paper-meta">
              {paper.url ? (
                <a className="ri-paper-title" href={paper.url} target="_blank" rel="noopener noreferrer">
                  {paper.title}
                </a>
              ) : (
                <span className="ri-paper-title">{paper.title}</span>
              )}
              <span className="ri-paper-byline">
                {paper.authors.slice(0, 3).join(", ")}
                {paper.authors.length > 3 ? " et al." : ""}
                {paper.year ? ` · ${paper.year}` : ""}
              </span>
            </div>
          </div>
          {paper.summary && (
            <p className="ri-paper-summary">{paper.summary}</p>
          )}
        </div>
      ))}
    </div>
  );
}

function PaperSourcesList({ papers, lang }: { papers: PaperResult[]; lang: "es" | "en" }) {
  return (
    <div className="ri-sources">
      <p className="ri-sources-heading">
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
          <path d="M2 4h12M2 8h8M2 12h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        {lang === "en" ? "Academic sources" : "Fuentes académicas"}
      </p>
      {papers.length === 0 ? (
        <p className="ri-sources-empty">
          {lang === "en"
            ? "No academic papers found for this topic."
            : "No se encontraron papers académicos para este tema."}
        </p>
      ) : (
        <ol className="ri-sources-list">
          {papers.map((p, i) => (
            <li key={p.id || i} className="ri-source-item">
              <span className="ri-source-num">[{i + 1}]</span>
              <div className="ri-source-body">
                {p.url ? (
                  <a className="ri-source-title" href={p.url} target="_blank" rel="noopener noreferrer">
                    {p.title}
                  </a>
                ) : (
                  <span className="ri-source-title">{p.title}</span>
                )}
                <span className="ri-source-byline">
                  {p.authors.slice(0, 3).join(", ")}
                  {p.authors.length > 3 ? " et al." : ""}
                  {p.year ? ` · ${p.year}` : ""}
                </span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Open a print-friendly standalone document for the landscape report and
 * trigger the browser's print dialog (the user can "Save as PDF" from there).
 */
function downloadLandscapeReport(report: LandscapeReport, lang: "es" | "en") {
  const win = window.open("", "_blank");
  if (!win) return;

  const maxCount = Math.max(1, ...(report.trendsByYear ?? []).map((t) => t.count), 1);

  const tableHeaders = (report.comparisonTable?.headers ?? []).map((h) => `<th>${escapeHtml(h)}</th>`).join("");
  const tableRows = (report.comparisonTable?.rows ?? [])
    .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`)
    .join("");

  const chartBars = (report.trendsByYear ?? [])
    .map(
      (t) =>
        `<div class="bar-col"><span class="bar-val">${t.count}</span><div class="bar" style="height:${Math.max(8, (t.count / maxCount) * 100)}px"></div><span class="bar-label">${t.year}</span></div>`,
    )
    .join("");

  const gapsHtml = (report.gaps ?? []).map((g, i) => `<p>${i + 1}. ${escapeHtml(g)}</p>`).join("");

  const sourcesHtml = report.sources
    .map((s, i) => {
      const byline = [
        s.authors.length ? `${escapeHtml(s.authors.slice(0, 3).join(", "))}${s.authors.length > 3 ? " et al." : ""}` : "",
        s.year ? String(s.year) : "",
      ]
        .filter(Boolean)
        .join(" · ");
      return `<li><strong>${escapeHtml(s.title)}</strong>${byline ? `<br><span class="muted">${byline}</span>` : ""}</li>`;
    })
    .join("");

  const title = lang === "en" ? "Landscape" : "Landscape";
  const labels = {
    summary: lang === "en" ? "Executive summary" : "Resumen ejecutivo",
    comparison: lang === "en" ? "Comparison of approaches" : "Comparativa de enfoques",
    trends: lang === "en" ? "Publications per year" : "Publicaciones por año",
    gaps: lang === "en" ? "Gaps & opportunities" : "Brechas y oportunidades",
    sources: lang === "en" ? "Sources" : "Fuentes",
    generated: lang === "en" ? "Generated by Neuvra AI" : "Generado por Neuvra AI",
  };

  const html = `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="UTF-8" />
<title>${title}: ${escapeHtml(report.topic)}</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; font-family: 'DM Sans', 'Segoe UI', sans-serif; color: #0d1b36; padding: 28px; background: #fff; }
  h1 { font-family: 'Lora', Georgia, serif; font-size: 22px; margin: 0 0 4px; }
  h2 { font-size: 15px; margin: 0 0 10px; display: flex; align-items: center; gap: 8px; }
  h2 .dot { width: 8px; height: 8px; border-radius: 50%; background: #2e63de; display: inline-block; }
  p { font-size: 13px; line-height: 1.6; margin: 0 0 8px; }
  .card { border: 1px solid #d6e0f0; border-radius: 16px; padding: 18px; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { border: 1px solid #d6e0f0; padding: 7px 9px; text-align: left; }
  th { background: #f4f7fc; color: #173c9b; }
  .chart { display: flex; align-items: flex-end; gap: 12px; height: 170px; padding: 20px 4px 0; }
  .bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; }
  .bar { width: 100%; border-radius: 6px 6px 0 0; background: linear-gradient(180deg, #6f97f6 0%, #2e63de 100%); }
  .bar-label, .bar-val { font-size: 11px; color: #5a6880; text-align: center; }
  .bar-val { font-weight: 700; color: #173c9b; }
  ul { padding-left: 18px; font-size: 12px; line-height: 1.6; }
  .muted { color: #5a6880; font-size: 11px; }
  .footnote { font-size: 11px; color: #5a6880; text-align: center; padding-top: 10px; }
</style>
</head>
<body>
  <h1>${title}: ${escapeHtml(report.topic)}</h1>
  <div class="card">
    <h2><span class="dot"></span>${labels.summary}</h2>
    <p>${escapeHtml(report.summary)}</p>
  </div>
  ${tableRows ? `<div class="card"><h2><span class="dot"></span>${labels.comparison}</h2><table><thead><tr>${tableHeaders}</tr></thead><tbody>${tableRows}</tbody></table></div>` : ""}
  ${chartBars ? `<div class="card"><h2><span class="dot"></span>${labels.trends}</h2><div class="chart">${chartBars}</div></div>` : ""}
  ${gapsHtml ? `<div class="card"><h2><span class="dot"></span>${labels.gaps}</h2>${gapsHtml}</div>` : ""}
  ${sourcesHtml ? `<div class="card"><h2><span class="dot"></span>${labels.sources}</h2><ul>${sourcesHtml}</ul></div>` : ""}
  <p class="footnote">${labels.generated}</p>
</body>
</html>`;

  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
}

function LandscapeReportView({ report, lang }: { report: LandscapeReport; lang: "es" | "en" }) {
  const trends = report.trendsByYear ?? [];
  const maxCount = Math.max(1, ...trends.map((t) => t.count), 1);
  const comparison = report.comparisonTable;
  const gaps = report.gaps ?? [];

  return (
    <div className="ri-landscape">
      <div className="ri-landscape-toolbar">
        <h3 className="ri-landscape-title">{report.topic}</h3>
        <button type="button" className="ri-landscape-export" onClick={() => downloadLandscapeReport(report, lang)}>
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M8 2v8m0 0l-3-3m3 3l3-3M3 13h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {lang === "en" ? "Download PDF" : "Descargar PDF"}
        </button>
      </div>

      <div className="ri-landscape-card">
        <h4 className="ri-landscape-card-title">
          <span className="ri-landscape-dot" aria-hidden="true" />
          {lang === "en" ? "Executive summary" : "Resumen ejecutivo"}
        </h4>
        <p className="ri-landscape-text">{report.summary}</p>
      </div>

      {comparison && comparison.rows.length > 0 && (
        <div className="ri-landscape-card">
          <h4 className="ri-landscape-card-title">
            <span className="ri-landscape-dot" aria-hidden="true" />
            {lang === "en" ? "Comparison of approaches" : "Comparativa de enfoques"}
          </h4>
          <div className="ri-landscape-table-wrap">
            <table className="ri-landscape-table">
              <thead>
                <tr>
                  {comparison.headers.map((h, i) => (
                    <th key={i}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparison.rows.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => (
                      <td key={ci}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(trends.length > 0 || gaps.length > 0) && (
        <div className="ri-landscape-grid">
          {trends.length > 0 && (
            <div className="ri-landscape-card">
              <h4 className="ri-landscape-card-title">
                <span className="ri-landscape-dot" aria-hidden="true" />
                {lang === "en" ? "Publications per year" : "Publicaciones por año"}
              </h4>
              <div className="ri-landscape-chart">
                {trends.map((t) => (
                  <div key={t.year} className="ri-landscape-bar-col">
                    <span className="ri-landscape-bar-val">{t.count}</span>
                    <div className="ri-landscape-bar" style={{ height: `${Math.max(8, (t.count / maxCount) * 100)}px` }} />
                    <span className="ri-landscape-bar-label">{t.year}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {gaps.length > 0 && (
            <div className="ri-landscape-card">
              <h4 className="ri-landscape-card-title">
                <span className="ri-landscape-dot" aria-hidden="true" />
                {lang === "en" ? "Gaps & opportunities" : "Brechas y oportunidades"}
              </h4>
              {gaps.map((gap, i) => (
                <p key={i} className="ri-landscape-text">
                  {i + 1}. {gap}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      <PaperSourcesList papers={report.sources} lang={lang} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function MarkdownMessage({ content }: { content: string }) {
  return <div className="rm-content" dangerouslySetInnerHTML={{ __html: renderMarkdownWithMath(content) }} />;
}

function createEmptyMessages(): Record<ToolId, Message[]> {
  return { papers: [], summary: [], review: [], explain: [], writing: [], findpapers: [], landscape: [] };
}

function generateSessionId(): string {
  return `research_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function createSession(lang: "es" | "en", id = DRAFT_SESSION_ID): ResearchSession {
  return {
    id,
    title: lang === "en" ? "New chat" : "Nuevo chat",
    activeTool: "summary",
    messages: createEmptyMessages(),
    input: "",
    attachment: null,
    savedAt: Date.now(),
  };
}

function hasSessionContent(session: ResearchSession): boolean {
  return (
    Object.values(session.messages).some((items) => items.length > 0) ||
    session.input.trim().length > 0 ||
    Boolean(session.attachment)
  );
}

function localizedImageAnalysisTitle(lang: "es" | "en"): string {
  return lang === "en" ? "Image analysis" : "Análisis de imagen";
}

function resolveSessionTitle(session: ResearchSession, lang: "es" | "en"): string {
  const normalized = session.title.trim();
  if (
    normalized === "Image analysis" ||
    normalized === "Análisis de imagen" ||
    normalized === "AnÃ¡lisis de imagen"
  ) {
    return localizedImageAnalysisTitle(lang);
  }
  return normalized || (lang === "en" ? "New chat" : "Nuevo chat");
}

function deriveSessionTitle(session: ResearchSession, lang: "es" | "en"): string {
  const firstUserMessage = Object.values(session.messages).flat().find((message) => message.role === "user");
  const raw = firstUserMessage?.content?.trim() ?? "";
  if (raw && raw !== "[Pasted image attached]" && raw !== "[Imagen pegada]") {
    return raw.slice(0, 42);
  }
  if (firstUserMessage?.imageDataUrl) {
    return lang === "en" ? "Image analysis" : "Análisis de imagen";
  }
  return lang === "en" ? "New chat" : "Nuevo chat";
}

function sortSessions(sessions: ResearchSession[]): ResearchSession[] {
  return [...sessions].sort((a, b) => b.savedAt - a.savedAt);
}

function loadHistory(): ResearchSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ResearchSession[];
    const valid: ToolId[] = ["papers", "summary", "review", "explain", "writing", "findpapers", "landscape"];
    return parsed
      .filter((item): item is ResearchSession => Boolean(item?.id))
      .map((item) => ({
        id: item.id,
        title: item.title || "New chat",
        activeTool: valid.includes(item.activeTool) ? item.activeTool : "summary",
        messages: { ...createEmptyMessages(), ...(item.messages ?? {}) },
        input: item.input ?? "",
        attachment: item.attachment ?? null,
        savedAt: typeof item.savedAt === "number" ? item.savedAt : Date.now(),
      }));
  } catch {
    return [];
  }
}

function loadActiveSessionId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(ACTIVE_SESSION_KEY);
  } catch {
    return null;
  }
}

function saveHistory(sessions: ResearchSession[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.filter(hasSessionContent)));
  } catch {
    // ignore storage errors
  }
}

function saveActiveSessionId(id: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ACTIVE_SESSION_KEY, id);
  } catch {
    // ignore storage errors
  }
}

function getInitialState(lang: "es" | "en"): SessionState {
  const loaded = loadHistory();
  if (loaded.length === 0) {
    const draft = createSession(lang);
    return { sessions: [draft], activeSessionId: draft.id };
  }
  const sorted = sortSessions(loaded);
  const activeSessionId = loadActiveSessionId();
  return {
    sessions: sorted,
    activeSessionId: activeSessionId && sorted.some((session) => session.id === activeSessionId)
      ? activeSessionId
      : sorted[0].id,
  };
}

function updateSessions(
  sessions: ResearchSession[],
  activeSessionId: string,
  updater: (session: ResearchSession) => ResearchSession,
): ResearchSession[] {
  return sortSessions(sessions.map((session) => (session.id === activeSessionId ? updater(session) : session)));
}

function getSessionPreview(session: ResearchSession, lang: "es" | "en"): string {
  const flatMessages = Object.values(session.messages).flat();
  const lastAssistant = [...flatMessages].reverse().find((message) => message.role === "assistant");
  if (lastAssistant?.content) {
    return lastAssistant.content.replace(/[#*_`>-]/g, "").slice(0, 72);
  }
  return lang === "en" ? "Continue this conversation" : "Continuar esta conversación";
}

function createAttachmentId(): string {
  return `attachment_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function getAttachmentLabel(
  attachment: Pick<AttachedDocument, "fileName" | "mimeType" | "source"> | null,
  lang: "es" | "en",
): string {
  if (!attachment) return "";
  if (attachment.source === "drive") return lang === "en" ? "Drive file" : "Archivo de Drive";
  if ((attachment.mimeType ?? "").startsWith("application/pdf")) return "PDF";
  if ((attachment.mimeType ?? "").includes("word") || attachment.fileName.toLowerCase().endsWith(".docx")) {
    return lang === "en" ? "Document" : "Documento";
  }
  return lang === "en" ? "File" : "Archivo";
}

export default function ResearchMode() {
  const { lang } = useLang();
  const { auth } = useAuth();
  const { usage, loading: usageLoading, applyUsage } = useAiUsage();
  const [sessionState, setSessionState] = useState<SessionState>(() => getInitialState(lang));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pastedImage, setPastedImage] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const activeSession =
    sessionState.sessions.find((session) => session.id === sessionState.activeSessionId) ??
    sessionState.sessions[0] ??
    createSession(lang);
  const activeTool = activeSession.activeTool;
  const currentMsgs = activeSession.messages[activeTool] ?? [];
  const input = activeSession.input;
  const attachment = activeSession.attachment;
  const usageReady = auth.signedIn && !usageLoading && !!usage;
  const hasCredits = usageReady && usage.creditsRemaining > 0;
  const canSend = hasCredits && !loading && (!!input.trim() || !!pastedImage || !!attachment);
  const hiddenImageMarkers = new Set(["[Pasted image attached]", "[Imagen pegada]"]);
  const isSyntheticAttachmentLabel = (content: string) =>
    content.startsWith("Use the attached file:") || content.startsWith("Usa el archivo adjunto:");
  const savedSessions = sessionState.sessions.filter(hasSessionContent);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeSession.id, activeSession.messages, activeTool, loading]);

  useEffect(() => {
    saveHistory(sessionState.sessions);
    saveActiveSessionId(sessionState.activeSessionId);
  }, [sessionState]);

  const deleteSession = useCallback((id: string) => {
    setSessionState((prev) => {
      const remaining = prev.sessions.filter((s) => s.id !== id);
      // If deleting the active session, switch to next or create fresh
      if (prev.activeSessionId !== id) {
        return { ...prev, sessions: sortSessions(remaining) };
      }
      if (remaining.length > 0) {
        const sorted = sortSessions(remaining);
        return { sessions: sorted, activeSessionId: sorted[0].id };
      }
      const fresh = createSession(lang);
      return { sessions: [fresh], activeSessionId: fresh.id };
    });
  }, [lang]);

  const startNewSession = useCallback(() => {
    setSessionState((prev) => {
      const current = prev.sessions.find((session) => session.id === prev.activeSessionId);
      if (current && !hasSessionContent(current)) return prev;
      const fresh = createSession(lang, generateSessionId());
      return { sessions: [fresh, ...prev.sessions], activeSessionId: fresh.id };
    });
    setPastedImage(null);
  }, [lang]);

  const selectSession = useCallback((id: string) => {
    setSessionState((prev) => ({ ...prev, activeSessionId: id }));
    setPastedImage(null);
  }, []);

  function switchTool(id: ToolId) {
    setSessionState((prev) => ({
      ...prev,
      sessions: updateSessions(prev.sessions, prev.activeSessionId, (session) => ({
        ...session,
        activeTool: id,
        input: "",
        savedAt: Date.now(),
      })),
    }));
    setPastedImage(null);
  }

  function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const items = Array.from(e.clipboardData.items);
    const imgItem = items.find((item) => item.type.startsWith("image/"));
    if (!imgItem) return;
    e.preventDefault();
    const file = imgItem.getAsFile();
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPastedImage(reader.result as string);
    reader.readAsDataURL(file);
  }

  const handleImportedText = useCallback((file: ImportedTextFile) => {
    setSessionState((prev) => ({
      ...prev,
      sessions: updateSessions(prev.sessions, prev.activeSessionId, (session) => ({
        ...session,
        attachment: {
          id: createAttachmentId(),
          fileName: file.fileName,
          content: file.content,
          mimeType: file.mimeType,
          source: file.source,
          usedOcr: file.usedOcr,
          warning: file.warning,
        },
        savedAt: Date.now(),
      })),
    }));
  }, []);

  function clearAttachment() {
    setSessionState((prev) => ({
      ...prev,
      sessions: updateSessions(prev.sessions, prev.activeSessionId, (session) => ({
        ...session,
        attachment: null,
        savedAt: Date.now(),
      })),
    }));
  }

  async function send() {
    const trimmed = input.trim();
    if ((!trimmed && !pastedImage && !attachment) || loading) return;
    if (!hasCredits) {
      setError(lang === "en" ? "You ran out of AI credits." : "Ya no te quedan creditos de IA.");
      return;
    }

    const messageContent = trimmed ||
      (attachment
        ? (lang === "en" ? `Use the attached file: ${attachment.fileName}` : `Usa el archivo adjunto: ${attachment.fileName}`)
        : (lang === "en" ? "[Pasted image attached]" : "[Imagen pegada]"));
    const langHint = langInstruction(detectLang(messageContent));
    const documentContext = attachment
      ? buildDocumentSystemContext(attachment.fileName, attachment.content, trimmed || activeTool, lang)
      : "";
    const systemPrompt = `${documentContext}${
      activeTool === "review"
        ? buildReviewPrompt(detectIntent(messageContent), messageContent, langHint)
        : getSystemPrompt(activeTool as Exclude<ToolId, "review">, langHint)
    }`;

    const userMsg: Message = {
      role: "user",
      content: messageContent,
      imageDataUrl: pastedImage ?? undefined,
      attachment: attachment
        ? {
            id: attachment.id,
            fileName: attachment.fileName,
            mimeType: attachment.mimeType,
            source: attachment.source,
            usedOcr: attachment.usedOcr,
            warning: attachment.warning,
          }
        : undefined,
    };
    const updated = [...currentMsgs, userMsg];

    // Trim history before sending: keep the last 16 messages so the API's
    // 20-message limit is never hit, even as conversations grow long.
    const MAX_SEND_MSGS = 16;
    const messagesForApi = updated.length > MAX_SEND_MSGS
      ? updated.slice(updated.length - MAX_SEND_MSGS)
      : updated;

    // ── Find papers tool ─────────────────────────────────────────────────────
    if (activeTool === "findpapers") {
      const nextSessionId =
        activeSession.id === DRAFT_SESSION_ID ? generateSessionId() : activeSession.id;
      setLoading(true);
      setError("");
      setSessionState((prev) => ({
        activeSessionId: nextSessionId,
        sessions: updateSessions(prev.sessions, prev.activeSessionId, (session) => ({
          ...session,
          id: nextSessionId,
          messages: { ...session.messages, findpapers: updated },
          input: "",
          savedAt: Date.now(),
        })),
      }));
      setPastedImage(null);

      try {
        const rawPapers = await searchSemanticScholar(trimmed, 6);

        let papersWithSummaries: PaperResult[] = rawPapers;

        if (rawPapers.length > 0 && hasCredits) {
          const summaryItems = rawPapers
            .map((p, i) =>
              `${i + 1}. ${lang === "en" ? "Title" : "Título"}: ${p.title}\n${lang === "en" ? "Abstract" : "Abstract"}: ${p.abstract.slice(0, 600)}`,
            )
            .join("\n\n");

          const summaryPrompt =
            lang === "es"
              ? `Tenés ${rawPapers.length} papers académicos. Para cada uno escribí un resumen de 2-3 oraciones que explique qué estudia, cuál es el hallazgo o contribución principal, y por qué puede ser relevante. Devolvé ÚNICAMENTE este JSON sin texto adicional:\n{"summaries":["resumen 1","resumen 2"]}\n\nPapers:\n${summaryItems}`
              : `You have ${rawPapers.length} academic papers. For each one write a 2-3 sentence summary explaining what it studies, the main finding or contribution, and why it might be relevant. Return ONLY this JSON with no additional text:\n{"summaries":["summary 1","summary 2"]}\n\nPapers:\n${summaryItems}`;

          const aiRes = await fetchWithSupabaseAuth("/api/ai", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              system:
                lang === "es"
                  ? "Eres un asistente académico. Devuelve SOLO JSON válido, sin texto adicional."
                  : "You are an academic assistant. Return ONLY valid JSON, no additional text.",
              messages: [{ role: "user", content: summaryPrompt }],
              max_tokens: 1600,
            }),
          });
          const aiData = (await aiRes.json()) as { text?: string; usage?: unknown };
          applyUsage(aiData.usage as Parameters<typeof applyUsage>[0]);

          let summaries: string[] = [];
          const raw = (aiData.text ?? "").trim();
          try {
            const parsed = JSON.parse(raw) as { summaries: string[] };
            summaries = parsed.summaries ?? [];
          } catch {
            const match = raw.match(/\{[\s\S]*\}/);
            if (match) {
              try {
                const parsed = JSON.parse(match[0]) as { summaries: string[] };
                summaries = parsed.summaries ?? [];
              } catch { /* leave summaries empty */ }
            }
          }

          papersWithSummaries = rawPapers.map((p, i) => ({ ...p, summary: summaries[i] ?? "" }));
        }

        const noResults = papersWithSummaries.length === 0;
        const assistantMsg: Message = {
          role: "assistant",
          content: noResults
            ? (lang === "en"
                ? `No papers found for **"${trimmed}"**. Try a more specific or different search term.`
                : `No se encontraron papers para **"${trimmed}"**. Probá con un término más específico.`)
            : (lang === "en"
                ? `Found **${papersWithSummaries.length} papers** on "${trimmed}".`
                : `Encontré **${papersWithSummaries.length} papers** sobre "${trimmed}".`),
          paperResults: papersWithSummaries,
        };

        setSessionState((prev) => ({
          ...prev,
          sessions: updateSessions(prev.sessions, prev.activeSessionId, (session) => {
            const next = {
              ...session,
              messages: {
                ...session.messages,
                findpapers: [...(session.messages.findpapers ?? []), assistantMsg],
              },
              savedAt: Date.now(),
            };
            return { ...next, title: deriveSessionTitle(next, lang) };
          }),
        }));
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        console.error("[ResearchMode] paper search failed:", msg);
        setError(msg);
      } finally {
        setLoading(false);
      }
      return;
    }

    // ── Landscape / report tool ──────────────────────────────────────────────
    if (activeTool === "landscape") {
      const nextSessionId =
        activeSession.id === DRAFT_SESSION_ID ? generateSessionId() : activeSession.id;
      setLoading(true);
      setError("");
      setSessionState((prev) => ({
        activeSessionId: nextSessionId,
        sessions: updateSessions(prev.sessions, prev.activeSessionId, (session) => ({
          ...session,
          id: nextSessionId,
          messages: { ...session.messages, landscape: updated },
          input: "",
          savedAt: Date.now(),
        })),
      }));
      setPastedImage(null);

      try {
        const res = await fetchWithSupabaseAuth("/api/research/landscape", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic: trimmed, lang }),
        });
        const data = (await res.json()) as { report?: LandscapeReport; error?: string; usage?: unknown };
        applyUsage(data.usage as Parameters<typeof applyUsage>[0]);

        if (!res.ok || !data.report) {
          throw new Error(data.error || "Unknown error");
        }

        const assistantMsg: Message = {
          role: "assistant",
          content: lang === "en"
            ? `Landscape report: **${data.report.topic}**`
            : `Reporte landscape: **${data.report.topic}**`,
          landscapeReport: data.report,
        };

        setSessionState((prev) => ({
          ...prev,
          sessions: updateSessions(prev.sessions, prev.activeSessionId, (session) => {
            const next = {
              ...session,
              messages: {
                ...session.messages,
                landscape: [...(session.messages.landscape ?? []), assistantMsg],
              },
              savedAt: Date.now(),
            };
            return { ...next, title: deriveSessionTitle(next, lang) };
          }),
        }));
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        console.error("[ResearchMode] landscape report failed:", msg);
        setError(msg);
      } finally {
        setLoading(false);
      }
      return;
    }

    // ── Flashcard intent detection ────────────────────────────────────────────
    if (detectFlashcardIntent(messageContent)) {
      console.log("FLASHCARD_INTENT_DETECTED", { trigger: messageContent.slice(0, 80) });

      // Gather context from ALL tool tabs (not just the active one)
      const hasPdf = Boolean(attachment?.content?.trim());
      console.log("PDF_UPLOAD_DETECTED", { hasPdf, fileName: attachment?.fileName ?? null });

      const { text: contextText, source: contextSource } = buildChatContextText(
        activeSession.messages,
        activeTool,
        attachment,
      );

      console.log("PDF_TEXT_LENGTH", contextText.length);
      console.log("FLASHCARD_SOURCE_SELECTED", contextSource);

      if (contextText.trim().length >= 60) {
        const nextSessionId =
          activeSession.id === DRAFT_SESSION_ID ? generateSessionId() : activeSession.id;
        const rawTitle = activeSession.title.replace(/^(New chat|Nuevo chat)$/, "Research");
        const deckName =
          lang === "en"
            ? `Research: ${rawTitle.slice(0, 40)}`
            : `Investigación: ${rawTitle.slice(0, 40)}`;

        setLoading(true);
        setError("");

        // Optimistically commit the user message and clear the input
        setSessionState((prev) => ({
          activeSessionId: nextSessionId,
          sessions: updateSessions(prev.sessions, prev.activeSessionId, (session) => ({
            ...session,
            id: nextSessionId,
            messages: { ...session.messages, [activeTool]: updated },
            input: "",
            attachment: null,
            savedAt: Date.now(),
          })),
        }));
        setPastedImage(null);

        try {
          // ── Step 1: Build request and call AI ────────────────────────────
          const fcLang = detectLang(contextText);
          const userPrompt = buildFlashcardUserMessage(8, contextText, fcLang);

          console.log("FLASHCARD_SOURCE_TEXT_LENGTH:", contextText.length);
          console.log("FLASHCARD_SOURCE_TYPE:", contextSource);

          const aiRes = await fetchWithSupabaseAuth("/api/ai", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              max_tokens: 2200,
              // Minimal system prompt — just enough for the mock to detect the
              // flashcard pipeline.  All generation instructions are in the user
              // message (same pattern as the proven FlashcardGenerator.tsx).
              system: "You are a study flashcard generator. Return only valid JSON. Never add explanations or markdown.",
              messages: [{ role: "user", content: userPrompt }],
            }),
          });
          const aiData = await aiRes.json();
          applyUsage(aiData.usage);

          if (!aiRes.ok) {
            console.log("FLASHCARD_GENERATION_ERROR", { status: aiRes.status, error: aiData.error });
            setError(
              aiData.error ||
                (lang === "en"
                  ? "Could not generate flashcards — AI error."
                  : "Error de IA al generar las tarjetas."),
            );
            return;
          }

          // ── Step 2: Parse – log the raw response BEFORE any processing ────
          const rawText = (aiData.text || "").trim();
          console.log("RAW_FLASHCARD_RESPONSE:", rawText.slice(0, 500));

          if (!rawText) {
            console.log("FLASHCARD_GENERATION_ERROR", { reason: "empty_response" });
            setError(
              lang === "en"
                ? "The AI returned an empty response. Try again."
                : "La IA devolvió una respuesta vacía. Intentá de nuevo.",
            );
            return;
          }

          const validCards = parseFlashcardResponse(rawText);
          console.log("FLASHCARDS_GENERATED_COUNT", validCards.length, { first: validCards[0] ?? null });

          if (!validCards.length) {
            // Show the first 120 chars of what the AI actually returned so the
            // failure reason is immediately visible without opening DevTools.
            const snippet = rawText.slice(0, 120).replace(/\n/g, " ");
            console.log("FLASHCARD_GENERATION_ERROR", {
              reason: "parse_failed",
              rawPreview: rawText.slice(0, 500),
            });
            setError(
              lang === "en"
                ? `Could not read the AI response. It said: "${snippet}"`
                : `No se pudo leer la respuesta. La IA dijo: "${snippet}"`,
            );
            return;
          }

          // ── Step 3: Save deck ─────────────────────────────────────────────
          const deckRes = await fetchWithSupabaseAuth("/api/decks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: deckName, cards: validCards }),
          });
          const deckData = (await deckRes.json()) as { id?: string; error?: string };

          if (!deckRes.ok) {
            setError(
              deckData.error ||
                (lang === "en" ? "Could not save the deck." : "No se pudo guardar el mazo."),
            );
            return;
          }

          const deckId = deckData.id ?? "";
          console.log("[ResearchMode] deck saved", { deckId, deckName, cards: validCards.length });

          // ── Step 4: Append the flashcard bubble message ───────────────────
          const assistantMsg: Message = {
            role: "assistant",
            content:
              lang === "en"
                ? `Generated **${validCards.length} flashcards** from the research context (${contextSource}).`
                : `Generé **${validCards.length} tarjetas** a partir del contexto de investigación (${contextSource}).`,
            generatedCards: {
              deckId,
              deckName,
              cardCount: validCards.length,
              preview: validCards.slice(0, 2),
            },
          };

          setSessionState((prev) => ({
            ...prev,
            sessions: updateSessions(prev.sessions, prev.activeSessionId, (session) => {
              const next = {
                ...session,
                messages: {
                  ...session.messages,
                  [activeTool]: [...(session.messages[activeTool] ?? []), assistantMsg],
                },
                savedAt: Date.now(),
              };
              return { ...next, title: deriveSessionTitle(next, lang) };
            }),
          }));
        } catch (err) {
          console.error("[ResearchMode] flashcard generation failed:", err);
          setError(
            lang === "en" ? "Network error. Try again." : "Error de red. Intenta de nuevo.",
          );
        } finally {
          setLoading(false);
        }
        return; // skip the regular send path
      } else {
        console.log("FLASHCARD_GENERATION_ERROR", {
          reason: "insufficient_context",
          contextLength: contextText.length,
          contextSource,
        });
        // Not enough context yet — inject a hint into the user message so the
        // research AI tells the user what to do, rather than silently ignoring.
        setError(
          lang === "en"
            ? "No research content found yet. Ask a question or upload a document first, then request flashcards."
            : "Todavía no hay contenido de investigación. Hacé una pregunta o subí un documento primero, y luego pedí las tarjetas.",
        );
        setLoading(false);
        return;
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    // ── Literature review with paper sources ──────────────────────────────────
    if (activeTool === "review" && trimmed) {
      const nextSessionId =
        activeSession.id === DRAFT_SESSION_ID ? generateSessionId() : activeSession.id;

      setLoading(true);
      setError("");

      // Commit user message & clear input immediately
      setSessionState((prev) => ({
        activeSessionId: nextSessionId,
        sessions: updateSessions(prev.sessions, prev.activeSessionId, (session) => ({
          ...session,
          id: nextSessionId,
          messages: { ...session.messages, review: updated },
          input: "",
          attachment: null,
          savedAt: Date.now(),
        })),
      }));
      setPastedImage(null);

      try {
        // Step 1: Fetch relevant papers for citation context (best-effort)
        let sourcePapers: PaperResult[] = [];
        try {
          const searchQuery = cleanReviewQuery(trimmed);
          sourcePapers = await searchSemanticScholar(searchQuery, 5);
        } catch {
          /* proceed without papers — review still works */
        }

        // Step 2: Build enriched system prompt with numbered paper context
        const paperContext =
          sourcePapers.length > 0
            ? `\n\n---\n` +
              `CITATION RULES — follow these exactly:\n` +
              `1. Place a citation number [N] immediately after EVERY sentence or clause that states a specific fact, finding, statistic, or claim — not just at the end of paragraphs.\n` +
              `2. Multiple sources for the same point: [1][3]. If a sentence draws on several sources, list all of them.\n` +
              `3. Do NOT have any factual sentence without a citation. General framing sentences (e.g. "This field has grown rapidly") that you cannot attribute to a specific source may be left uncited, but specific claims must always have one.\n` +
              `4. Example of correct inline citation style: "CAR-T cells achieve 70–90% remission rates in B-cell lymphoma [1]. The CD28 domain provides stronger early expansion [2], whereas 4-1BB improves long-term persistence [3][4]."\n\n` +
              `AVAILABLE SOURCES:\n\n` +
              sourcePapers
                .map(
                  (p, i) =>
                    `[${i + 1}] ${p.title} (${p.year ?? "n.d."})\n` +
                    `Authors: ${p.authors.slice(0, 3).join(", ")}${p.authors.length > 3 ? " et al." : ""}\n` +
                    `Abstract: ${p.abstract.slice(0, 500)}`,
                )
                .join("\n\n")
            : "";

        const intent = detectIntent(messageContent);
        const enrichedSystem =
          documentContext + buildReviewPrompt(intent, messageContent, langHint) + paperContext;

        // Step 3: Call AI
        const aiRes = await fetchWithSupabaseAuth("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system: enrichedSystem,
            messages: messagesForApi,
            useMemory: true,
            memoryQuery: trimmed,
          }),
        });
        const data = await aiRes.json();
        applyUsage(data.usage);

        if (!aiRes.ok) {
          setError(data.error || (lang === "en" ? "Could not send the message." : "No se pudo enviar el mensaje."));
          return;
        }

        const text = (data.text || "").trim();
        const assistantMsg: Message = {
          role: "assistant",
          content: text,
          // Always attach paperResults (even empty) so the sources section renders
          paperResults: sourcePapers,
          paperResultsMode: "sources",
        };

        setSessionState((prev) => ({
          ...prev,
          sessions: updateSessions(prev.sessions, prev.activeSessionId, (session) => {
            const next = {
              ...session,
              messages: {
                ...session.messages,
                review: [...(session.messages.review ?? []), assistantMsg],
              },
              savedAt: Date.now(),
            };
            return { ...next, title: deriveSessionTitle(next, lang) };
          }),
        }));

        // Memory extraction (fire-and-forget)
        if (auth.signedIn && text.length > 200) {
          void fetchWithSupabaseAuth("/api/memory/extract", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              content: `Pregunta: ${trimmed}\n\nRespuesta:\n${text}`,
              source_type: "research",
              source_label: "Research: review",
            }),
          });
        }
      } catch (err) {
        console.error("[ResearchMode] review with sources failed:", err);
        setError(lang === "en" ? "Network error. Try again." : "Error de red. Intenta de nuevo.");
      } finally {
        setLoading(false);
      }
      return;
    }
    // ─────────────────────────────────────────────────────────────────────────

    setLoading(true);
    setError("");

    try {
      const res = await fetchWithSupabaseAuth("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: systemPrompt,
          messages: messagesForApi,
          // Inject relevant memories from past sessions for this query
          useMemory: true,
          memoryQuery: trimmed || activeTool,
        }),
      });
      const data = await res.json();
      applyUsage(data.usage);
      if (!res.ok) {
        setError(data.error || (lang === "en" ? "Could not send the message." : "No se pudo enviar el mensaje."));
        return;
      }
      const text = (data.text || "").trim();
      setSessionState((prev) => {
        const nextId = prev.activeSessionId === DRAFT_SESSION_ID ? generateSessionId() : prev.activeSessionId;
        return {
          activeSessionId: nextId,
          sessions: updateSessions(prev.sessions, prev.activeSessionId, (session) => {
            const next = {
              ...session,
              id: nextId,
              messages: { ...session.messages, [activeTool]: [...updated, { role: "assistant", content: text }] },
              input: "",
              attachment: null,
              savedAt: Date.now(),
            };
            return { ...next, title: deriveSessionTitle(next, lang) };
          }),
        };
      });
      setPastedImage(null);

      // Extract and store memories from significant AI responses (fire-and-forget)
      if (auth.signedIn && text.length > 200) {
        const extractContent = trimmed
          ? `Pregunta: ${trimmed}\n\nRespuesta:\n${text}`
          : text;
        const extractLabel = attachment?.fileName
          ? attachment.fileName
          : `Research: ${activeTool}`;
        void fetchWithSupabaseAuth("/api/memory/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: extractContent,
            source_type: "research",
            source_label: extractLabel,
          }),
        });
      }
    } catch (err) {
      console.error("[ResearchMode] send failed:", err);
      setError(lang === "en" ? "Network error. Try again." : "Ocurrio un error de red. Intenta de nuevo.");
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

  function updateInput(nextValue: string) {
    if (error) setError("");
    setSessionState((prev) => ({
      ...prev,
      sessions: updateSessions(prev.sessions, prev.activeSessionId, (session) => ({
        ...session,
        input: nextValue,
        savedAt: Date.now(),
      })),
    }));
  }

  return (
    <div className="ri-layout">
      <div className="ri-shell">
        <div className="ri-header">
          <div className="ri-header-copy">
            <h2 className="ri-title">{lang === "en" ? "Research" : "Investigación"}</h2>
            <p className="ri-desc">
              {lang === "en"
                ? "Summarize papers, explore literature and structure your academic writing with AI."
                : "Resumí papers, explorá literatura y estructurá tu escritura académica con IA."}
            </p>
          </div>
        </div>

        <div className="ri-workspace">
          <aside className="ri-sidebar">
        <div className="ri-sidebar-top">
          <div className="ri-sidebar-heading">
            <div className="ri-sidebar-kicker-row">
              <p className="ri-sidebar-kicker">{lang === "en" ? "History" : "Historial"}</p>
              <span className="ri-sidebar-saved">
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path d="M2 6.5l2.5 2.5L10 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {lang === "en" ? "Auto-saved" : "Guardado"}
              </span>
            </div>
            <div className="ri-sidebar-title-row">
              <h3 className="ri-sidebar-title">{lang === "en" ? "Research chats" : "Chats de investigación"}</h3>
            </div>
          </div>
          <div className="ri-sidebar-actions">
            <button type="button" className="ri-sidebar-new" onClick={startNewSession}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              {lang === "en" ? "New session" : "Nueva sesión"}
            </button>
          </div>
        </div>

            <div className="ri-history-list">
              {savedSessions.length === 0 ? (
                <p className="ri-history-empty">
                  {lang === "en" ? "Your saved conversations will appear here." : "Tus conversaciones guardadas aparecerán acá."}
                </p>
              ) : (
                savedSessions.map((session) => (
                  <div key={session.id} className="ri-history-item-wrap">
                    <button
                      type="button"
                      className={`ri-history-item${session.id === sessionState.activeSessionId ? " active" : ""}`}
                      onClick={() => selectSession(session.id)}
                    >
                      <span className="ri-history-item-title">{resolveSessionTitle(session, lang)}</span>
                      <span className="ri-history-item-preview">{getSessionPreview(session, lang)}</span>
                    </button>
                    <button
                      type="button"
                      className="ri-history-item-delete"
                      onClick={() => deleteSession(session.id)}
                      aria-label={lang === "en" ? "Delete chat" : "Eliminar chat"}
                    >
                      ×
                    </button>
                  </div>
                ))
              )}
            </div>
          </aside>

          <div className="ri-chat-shell">
          <div className="ri-chat-topbar">
            <span className="ri-chat-status-dot" aria-hidden="true" />
            <span>{resolveSessionTitle(activeSession, lang)}</span>
          </div>

          {currentMsgs.length === 0 && !loading && (
            <div className="ri-empty">
              <p className="ri-empty-hint">{getEmptyHints(lang)[activeTool]}</p>
            </div>
          )}

          {currentMsgs.length > 0 && (
            <div className="ri-messages">
              {currentMsgs.map((message, index) => (
                <div key={index} className={`ri-msg ri-msg-${message.role}`}>
                  {message.role === "assistant" && (
                    <div className="ri-avatar" aria-hidden="true">
                      <Image src="/logo.jpeg" alt="" width={34} height={34} className="ri-avatar-image" />
                    </div>
                  )}
                  <div className="ri-msg-stack">
                    <div className="ri-msg-meta">
                      {message.role === "assistant" ? "Neuvra" : lang === "en" ? "You" : "Vos"}
                    </div>
                    <div className="ri-bubble">
                      {message.role === "assistant" ? (
                        <>
                          <MarkdownMessage content={message.content} />
                          {message.generatedCards && (
                            <FlashcardBubble data={message.generatedCards} lang={lang} />
                          )}
                          {message.paperResultsMode === "sources" && message.paperResults !== undefined && (
                            <PaperSourcesList papers={message.paperResults} lang={lang} />
                          )}
                          {message.paperResultsMode !== "sources" && message.paperResults !== undefined && (
                            <PaperResultsMessage papers={message.paperResults} lang={lang} />
                          )}
                          {message.landscapeReport && (
                            <LandscapeReportView report={message.landscapeReport} lang={lang} />
                          )}
                        </>
                      ) : (
                        <>
                          {message.attachment && (
                            <div className="ri-doc-chip">
                              <div className="ri-doc-chip-icon" aria-hidden="true">
                                {message.attachment.mimeType?.startsWith("application/pdf") ? "PDF" : "DOC"}
                              </div>
                              <div className="ri-doc-chip-copy">
                                <strong>{message.attachment.fileName}</strong>
                                <span>
                                  {getAttachmentLabel(message.attachment, lang)}
                                  {message.attachment.usedOcr ? " · OCR" : ""}
                                </span>
                              </div>
                            </div>
                          )}
                          {message.imageDataUrl && (
                            <div className="ri-bubble-media">
                              <img
                                src={message.imageDataUrl}
                                alt={lang === "en" ? "Pasted image" : "Imagen pegada"}
                                className="ri-bubble-image"
                              />
                            </div>
                          )}
                          {!hiddenImageMarkers.has(message.content.trim()) &&
                            !isSyntheticAttachmentLabel(message.content.trim()) &&
                            message.content.split("\n").map((line, lineIndex) => <p key={lineIndex}>{line || "\u00a0"}</p>)}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="ri-msg ri-msg-assistant">
                  <div className="ri-avatar" aria-hidden="true">
                    <Image src="/logo.jpeg" alt="" width={34} height={34} className="ri-avatar-image" />
                  </div>
                  <div className="ri-msg-stack">
                    <div className="ri-msg-meta">Neuvra</div>
                    <div className="ri-bubble ri-typing"><span /><span /><span /></div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}

          <div className="ri-panel">
            <div className="ri-chips">
              {getTools(lang).map((tool) => (
                <button
                  key={tool.id}
                  type="button"
                  className={`ri-chip${activeTool === tool.id ? " active" : ""}`}
                  onClick={() => switchTool(tool.id)}
                >
                  {tool.label}
                  {tool.isNew && <span className="ri-chip-badge">{lang === "en" ? "NEW" : "NUEVO"}</span>}
                </button>
              ))}
            </div>

            {pastedImage && (
              <div className="ri-img-preview">
                <img src={pastedImage} alt="Pasted" className="ri-img-thumb" />
                <button
                  type="button"
                  className="ri-img-remove"
                  onClick={() => setPastedImage(null)}
                  aria-label={lang === "en" ? "Remove image" : "Quitar imagen"}
                >
                  ×
                </button>
              </div>
            )}

            {attachment && (
              <div className="ri-file-preview">
                <div className="ri-file-preview-icon" aria-hidden="true">
                  {attachment.mimeType?.startsWith("application/pdf") ? "PDF" : "DOC"}
                </div>
                <div className="ri-file-preview-copy">
                  <strong>{attachment.fileName}</strong>
                  <span>
                    {getAttachmentLabel(attachment, lang)}
                    {attachment.usedOcr ? " · OCR" : ""}
                    {attachment.warning ? ` · ${attachment.warning}` : ""}
                  </span>
                </div>
                <button
                  type="button"
                  className="ri-file-preview-remove"
                  onClick={clearAttachment}
                  aria-label={lang === "en" ? "Remove file" : "Quitar archivo"}
                >
                  ×
                </button>
              </div>
            )}

            <textarea
              className="ri-textarea"
              placeholder={getPlaceholders(lang)[activeTool]}
              value={input}
              onChange={(event) => updateInput(event.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              disabled={loading || !hasCredits}
              rows={4}
              aria-label={lang === "en" ? "Research input" : "Input de investigación"}
            />

            {/* Error banner — was set but never shown before */}
            {error && (
              <div className="ri-error-banner" role="alert">
                <span>⚠ {error}</span>
                <button type="button" onClick={() => setError("")} aria-label="Dismiss">×</button>
              </div>
            )}

            <div className="ri-toolbar">
              <div className="ri-toolbar-left">
                <ImportBar
                  lang={lang}
                  onTextFile={handleImportedText}
                  onImageFile={(dataUrl) => setPastedImage(dataUrl)}
                />
              </div>

              <button
                type="button"
                className={`ri-send${!canSend ? " ri-send--disabled" : ""}`}
                onClick={() => void send()}
                disabled={!canSend}
                aria-label={lang === "en" ? "Send" : "Enviar"}
              >
                {loading ? (
                  <span className="ri-send-spinner" aria-hidden="true" />
                ) : (
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M8 3L13 8L8 13M3 8H13" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
                <span>{loading ? (lang === "en" ? "Sending..." : "Enviando...") : lang === "en" ? "Send" : "Enviar"}</span>
              </button>
            </div>

            <AiUsageCard variant="inline" />
          </div>
        </div>
        </div>

        <p className="ri-hint">
          {lang === "en" ? "Enter to send · Shift+Enter new line" : "Enter para enviar · Shift+Enter nueva línea"}
        </p>
      </div>
    </div>
  );
}
