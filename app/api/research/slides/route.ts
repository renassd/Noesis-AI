// POST /api/research/slides
//
// "Presentaciones" / "Presentations" — generates a structured slide deck from
// either a topic text, an uploaded paper/document, or both.
//   1. If a paper is provided, the AI identifies the topic + a few search queries
//   2. If only a topic is provided, the AI generates search queries for OpenAlex
//   3. OpenAlex is searched (up to 15 papers) to ground the deck in real sources
//   4. The AI synthesizes a complete slide deck as JSON
//
// Costs SLIDES_CREDITS credits (multiple AI calls + external search).

import { NextRequest, NextResponse } from "next/server";
import {
  AiUsageError,
  finalizeAiRequestFailure,
  finalizeAiRequestSuccess,
  reserveAiRequest,
  type AiRequestReservation,
} from "@/lib/ai-usage";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";
import { AuthError, requireAuthenticatedUser } from "@/lib/server-auth";
import { searchOpenAlex, type OpenAlexPaper } from "@/lib/research/openalex";

const SLIDES_CREDITS = 7;

type Slide = {
  type: "title" | "agenda" | "content" | "conclusion" | "references";
  title: string;
  subtitle?: string;
  bullets?: string[];
};

type SlidesReport = {
  presentationTitle: string;
  subtitle?: string;
  slides: Slide[];
  sources: OpenAlexPaper[];
};

type AnthropicTextResponse = {
  content?: Array<{ type: string; text?: string }>;
  error?: { message?: string };
};

async function callAnthropic(params: {
  apiKey: string;
  model: string;
  maxTokens: number;
  system: string;
  prompt: string;
}): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": params.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: params.model,
      max_tokens: params.maxTokens,
      system: params.system,
      messages: [{ role: "user", content: params.prompt }],
    }),
  });

  const data = (await response.json()) as AnthropicTextResponse;
  if (!response.ok) {
    throw new Error(data.error?.message ?? `Anthropic ${response.status}`);
  }

  return data.content?.filter((b) => b.type === "text").map((b) => b.text || "").join("") || "";
}

function extractJson<T>(raw: string): T | null {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as T;
    } catch {
      return null;
    }
  }
}

async function gatherPapers(queries: string[]): Promise<OpenAlexPaper[]> {
  const seen = new Map<string, OpenAlexPaper>();
  for (const query of queries) {
    try {
      const results = await searchOpenAlex(query, 8);
      for (const paper of results) {
        if (!seen.has(paper.id)) seen.set(paper.id, paper);
      }
    } catch (err) {
      console.error("[research/slides] OpenAlex search failed:", err);
    }
  }
  return Array.from(seen.values()).slice(0, 15);
}

const SLIDE_TYPES: ReadonlyArray<Slide["type"]> = ["title", "agenda", "content", "conclusion", "references"];

function sanitizeSlide(s: unknown): Slide | null {
  if (!s || typeof s !== "object") return null;
  const obj = s as Record<string, unknown>;
  const type = SLIDE_TYPES.includes(obj.type as Slide["type"]) ? (obj.type as Slide["type"]) : "content";
  const title = typeof obj.title === "string" ? obj.title.trim() : "";
  if (!title) return null;
  const bullets = Array.isArray(obj.bullets)
    ? obj.bullets.map((b) => String(b ?? "").trim()).filter((b) => b.length > 0)
    : undefined;
  return {
    type,
    title,
    subtitle: typeof obj.subtitle === "string" && obj.subtitle.trim() ? obj.subtitle.trim() : undefined,
    bullets: bullets && bullets.length > 0 ? bullets : undefined,
  };
}

function buildMockSlidesReport(topic: string, papers: OpenAlexPaper[], lang: "es" | "en"): SlidesReport {
  const en = lang === "en";
  const subject = topic || (en ? "your topic" : "tu tema");
  const refs = papers.slice(0, 5).map((p) => {
    const author = p.authors[0] ? `${p.authors[0]}${p.authors.length > 1 ? " et al." : ""}` : "—";
    return `${author} (${p.year ?? "n/d"}) - ${p.title}`;
  });

  const slides: Slide[] = [
    {
      type: "title",
      title: subject,
      subtitle: en ? "An academic presentation" : "Una presentación académica",
    },
    {
      type: "agenda",
      title: en ? "Agenda" : "Agenda",
      bullets: en
        ? ["Introduction", "Background", "Key points", "Discussion", "Conclusions"]
        : ["Introducción", "Contexto", "Puntos clave", "Discusión", "Conclusiones"],
    },
    {
      type: "content",
      title: en ? "Introduction" : "Introducción",
      bullets: en
        ? [`Overview of ${subject}`, "Demo mode active", "Enable ANTHROPIC_API_KEY for real content"]
        : [`Panorama de ${subject}`, "Modo demo activo", "Configura ANTHROPIC_API_KEY para contenido real"],
    },
    {
      type: "content",
      title: en ? "Background" : "Contexto",
      bullets: en
        ? ["Placeholder bullet one", "Placeholder bullet two", "Placeholder bullet three"]
        : ["Punto de ejemplo uno", "Punto de ejemplo dos", "Punto de ejemplo tres"],
    },
    {
      type: "content",
      title: en ? "Key points" : "Puntos clave",
      bullets: en
        ? ["Placeholder bullet one", "Placeholder bullet two", "Placeholder bullet three"]
        : ["Punto de ejemplo uno", "Punto de ejemplo dos", "Punto de ejemplo tres"],
    },
    {
      type: "content",
      title: en ? "Discussion" : "Discusión",
      bullets: en
        ? ["Placeholder bullet one", "Placeholder bullet two", "Placeholder bullet three"]
        : ["Punto de ejemplo uno", "Punto de ejemplo dos", "Punto de ejemplo tres"],
    },
    {
      type: "conclusion",
      title: en ? "Conclusions" : "Conclusiones",
      bullets: en
        ? ["Summary placeholder one", "Summary placeholder two", "Summary placeholder three"]
        : ["Resumen de ejemplo uno", "Resumen de ejemplo dos", "Resumen de ejemplo tres"],
    },
    {
      type: "references",
      title: en ? "References" : "Referencias",
      bullets: refs.length > 0 ? refs : [en ? "No sources found" : "No se encontraron fuentes"],
    },
  ];

  return {
    presentationTitle: subject,
    subtitle: en ? "An academic presentation" : "Una presentación académica",
    slides,
    sources: papers,
  };
}

export async function POST(req: NextRequest) {
  let reservation: AiRequestReservation | null = null;

  try {
    const { user } = await requireAuthenticatedUser(req);
    const ip = (req.headers.get("x-forwarded-for") ?? "unknown").split(",")[0]?.trim() || "unknown";
    const rateLimit = checkRateLimit(getRateLimitKey(["research-slides", user.id, ip]), 10, 5 * 60 * 1000);

    if (!rateLimit.ok) {
      return NextResponse.json(
        { error: "Too many requests. Try again in a few minutes." },
        { status: 429 },
      );
    }

    const body = (await req.json()) as { topic?: string; lang?: "es" | "en"; paperContent?: string };
    let topic = (body.topic ?? "").trim();
    const lang: "es" | "en" = body.lang === "en" ? "en" : "es";
    const paperContent = (body.paperContent ?? "").trim();

    if (!topic && !paperContent) {
      return NextResponse.json({ error: "Falta el tema o el paper." }, { status: 400 });
    }
    if (topic.length > 2000) {
      return NextResponse.json({ error: "El tema es demasiado largo." }, { status: 413 });
    }

    reservation = await reserveAiRequest({
      userId: user.id,
      inputChars: topic.length + paperContent.length,
      requiredCredits: SLIDES_CREDITS,
    });

    const apiKey = process.env.ANTHROPIC_API_KEY;

    // ── Step 1: identify the topic + generate search queries ─────────────────
    let queries = topic ? [topic] : [];
    if (apiKey) {
      try {
        const queryPrompt = paperContent
          ? `Below is the text of an academic paper/document:\n\n${paperContent.slice(0, 3000)}\n\n` +
            `Identify the main topic/title and generate 2 to 3 short, specific English ` +
            `search queries (3-6 words each) that would find related academic papers. ` +
            `Return ONLY this JSON, no extra text:\n` +
            `{"topic": "the main topic/title", "queries": ["query 1", "query 2", "query 3"]}`
          : `Topic: "${topic}"\n\n` +
            `Generate 2 to 3 short, specific English search queries (3-6 words each) ` +
            `that would find the most relevant academic papers about this topic on an ` +
            `academic search engine. Return ONLY this JSON, no extra text:\n` +
            `{"topic": "${topic}", "queries": ["query 1", "query 2", "query 3"]}`;

        const raw = await callAnthropic({
          apiKey,
          model: reservation.model,
          maxTokens: 400,
          system: "You are a research assistant. Return ONLY valid JSON, no additional text.",
          prompt: queryPrompt,
        });

        const parsed = extractJson<{ topic?: string; queries?: string[] }>(raw);
        if (parsed?.topic?.trim() && !topic) {
          topic = parsed.topic.trim().slice(0, 2000);
        }
        if (parsed?.queries?.length) {
          queries = parsed.queries.filter((q) => q.trim().length > 0).slice(0, 3);
        }
      } catch (err) {
        console.error("[research/slides] query generation failed:", err);
      }
    }

    if (!topic) topic = lang === "en" ? "Uploaded paper" : "Paper subido";
    if (queries.length === 0) queries = [topic];

    // ── Step 2: gather papers from OpenAlex ──────────────────────────────────
    const papers = await gatherPapers(queries);

    // ── Step 3: synthesize the slide deck ────────────────────────────────────
    if (!apiKey) {
      const usage = await finalizeAiRequestSuccess({
        userId: user.id,
        eventId: reservation.eventId,
        creditsUsed: SLIDES_CREDITS,
        model: reservation.model,
      });
      return NextResponse.json({ slides: buildMockSlidesReport(topic, papers, lang), mock: true, usage });
    }

    const paperList = papers
      .map((p, i) => `${i + 1}. ${p.title} (${p.year ?? "n/d"})${p.authors[0] ? ` — ${p.authors[0]}${p.authors.length > 1 ? " et al." : ""}` : ""}`)
      .join("\n");

    const synthesisPrompt =
      lang === "es"
        ? `${topic ? `Tema: "${topic}"\n` : ""}${paperContent ? `Contenido del paper/documento:\n${paperContent.slice(0, 4000)}\n\n` : ""}${paperList.length ? `Papers académicos encontrados:\n${paperList}\n\n` : ""}

Creá una presentación académica/profesional completa. Devolvé ÚNICAMENTE este JSON, sin texto adicional:
{
  "presentationTitle": "título de la presentación",
  "subtitle": "subtítulo opcional",
  "slides": [
    {"type": "title", "title": "...", "subtitle": "..."},
    {"type": "agenda", "title": "Agenda", "bullets": ["Introducción", "...", "..."]},
    {"type": "content", "title": "título del slide", "bullets": ["punto 1", "punto 2", "punto 3", "punto 4"]},
    ... (6-10 slides content total)
    {"type": "conclusion", "title": "Conclusiones", "bullets": ["conclusión 1", "conclusión 2", "conclusión 3"]},
    {"type": "references", "title": "Referencias", "bullets": ["Autor et al. (año) - Título"]}
  ]
}

Reglas:
- Generá entre 8 y 12 slides en total (incluyendo title, agenda, conclusion, references)
- Cada content slide debe tener 3-5 bullets concisos
- Los bullets deben ser frases cortas (máx 80 caracteres)
- El slide de references debe listar las fuentes principales encontradas`
        : `${topic ? `Topic: "${topic}"\n` : ""}${paperContent ? `Paper/document content:\n${paperContent.slice(0, 4000)}\n\n` : ""}${paperList.length ? `Academic papers found:\n${paperList}\n\n` : ""}

Create a complete academic/professional presentation. Return ONLY this JSON, no extra text:
{
  "presentationTitle": "presentation title",
  "subtitle": "optional subtitle",
  "slides": [
    {"type": "title", "title": "...", "subtitle": "..."},
    {"type": "agenda", "title": "Agenda", "bullets": ["Introduction", "...", "..."]},
    {"type": "content", "title": "slide title", "bullets": ["point 1", "point 2", "point 3", "point 4"]},
    ... (6-10 content slides total)
    {"type": "conclusion", "title": "Conclusions", "bullets": ["conclusion 1", "conclusion 2", "conclusion 3"]},
    {"type": "references", "title": "References", "bullets": ["Author et al. (year) - Title"]}
  ]
}

Rules:
- Generate between 8 and 12 slides total (including title, agenda, conclusion, references)
- Each content slide must have 3-5 concise bullets
- Bullets must be short phrases (max 80 characters)
- The references slide must list the main sources found`;

    let synthesized: { presentationTitle?: string; subtitle?: string; slides?: unknown[] } | null = null;
    try {
      const raw = await callAnthropic({
        apiKey,
        model: reservation.model,
        maxTokens: reservation.maxTokens,
        system: lang === "es"
          ? "Eres un experto en presentaciones académicas. Devuelve SOLO JSON válido, sin texto adicional."
          : "You are an expert in academic presentations. Return ONLY valid JSON, no additional text.",
        prompt: synthesisPrompt,
      });
      synthesized = extractJson(raw);
    } catch (err) {
      console.error("[research/slides] synthesis failed:", err);
    }

    const mock = buildMockSlidesReport(topic, papers, lang);
    const slides = (synthesized?.slides ?? [])
      .map(sanitizeSlide)
      .filter((s): s is Slide => s !== null);

    const report: SlidesReport = {
      presentationTitle: synthesized?.presentationTitle?.trim() || mock.presentationTitle,
      subtitle: synthesized?.subtitle?.trim() || mock.subtitle,
      slides: slides.length > 0 ? slides : mock.slides,
      sources: papers,
    };

    const usage = await finalizeAiRequestSuccess({
      userId: user.id,
      eventId: reservation.eventId,
      creditsUsed: SLIDES_CREDITS,
      model: reservation.model,
    });

    return NextResponse.json({ slides: report, usage });
  } catch (error) {
    if (reservation) {
      await finalizeAiRequestFailure({
        eventId: reservation.eventId,
        reason: error instanceof Error ? error.message : "Unknown error",
      });
    }

    if (error instanceof AiUsageError) {
      return NextResponse.json({ error: error.message, usage: error.usage }, { status: error.status });
    }
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("[research/slides] failed:", error);
    return NextResponse.json({ error: "Failed to generate presentation" }, { status: 500 });
  }
}
