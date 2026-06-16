// POST /api/research/report
//
// "Research Report" — agentic full academic report generator.
// Given a topic (and/or the extracted text of an uploaded paper), this endpoint:
//   1. Asks the AI to identify the topic + a few academic search queries
//      (from the paper content when provided, otherwise from the topic text)
//   2. Searches OpenAlex for each query and merges/dedupes the results
//   3. Asks the AI to synthesize a structured academic report (abstract,
//      introduction, state of the art, key findings, gaps, conclusion)
//   4. Computes a publications-per-year trend locally from the papers
//
// Costs REPORT_CREDITS credits (more than a normal chat message, since it
// performs multiple AI calls + external searches and produces a long report).

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

const REPORT_CREDITS = 6;

type ResearchReport = {
  topic: string;
  abstract: string;
  introduction: string;
  stateOfArt: string;
  keyFindings: string[];
  gaps: string[];
  conclusion: string;
  trendsByYear?: Array<{ year: number; count: number }>;
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

function computeTrendsByYear(papers: OpenAlexPaper[]): Array<{ year: number; count: number }> {
  const counts = new Map<number, number>();
  for (const p of papers) {
    if (!p.year) continue;
    counts.set(p.year, (counts.get(p.year) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([year, count]) => ({ year, count }));
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
      console.error("[research/report] OpenAlex search failed:", err);
    }
  }
  return Array.from(seen.values()).slice(0, 25);
}

function buildMockResearchReport(
  topic: string,
  papers: OpenAlexPaper[],
  lang: "es" | "en",
): ResearchReport {
  const trendsByYear = computeTrendsByYear(papers);
  return lang === "en"
    ? {
        topic,
        abstract:
          `Demo mode active. This is a placeholder academic report for "${topic}" built from ${papers.length} papers found via OpenAlex. ` +
          `Enable ANTHROPIC_API_KEY to get an AI-generated abstract, introduction, state of the art, key findings, gaps and conclusion.`,
        introduction:
          `This is placeholder introduction text for the topic "${topic}". Enable ANTHROPIC_API_KEY to generate a full introduction grounded in the gathered literature.`,
        stateOfArt:
          `This is placeholder state-of-the-art text. Enable ANTHROPIC_API_KEY to generate an analysis of the current research landscape for "${topic}".`,
        keyFindings: [
          "Enable ANTHROPIC_API_KEY for AI-identified key findings.",
          `${papers.length} related papers were gathered from OpenAlex.`,
        ],
        gaps: ["Enable ANTHROPIC_API_KEY for AI-identified research gaps."],
        conclusion: `Placeholder conclusion for "${topic}". Enable ANTHROPIC_API_KEY for an AI-generated conclusion.`,
        trendsByYear,
        sources: papers,
      }
    : {
        topic,
        abstract:
          `Modo demo activo. Este es un reporte académico de ejemplo para "${topic}" generado a partir de ${papers.length} papers encontrados via OpenAlex. ` +
          `Configura ANTHROPIC_API_KEY para obtener un abstract, introducción, estado del arte, hallazgos, brechas y conclusión generados por IA.`,
        introduction:
          `Texto de introducción de ejemplo para el tema "${topic}". Configura ANTHROPIC_API_KEY para generar una introducción completa basada en la literatura recopilada.`,
        stateOfArt:
          `Texto de estado del arte de ejemplo. Configura ANTHROPIC_API_KEY para generar un análisis del panorama actual de investigación sobre "${topic}".`,
        keyFindings: [
          "Configura ANTHROPIC_API_KEY para obtener hallazgos identificados por IA.",
          `Se recopilaron ${papers.length} papers relacionados desde OpenAlex.`,
        ],
        gaps: ["Configura ANTHROPIC_API_KEY para obtener brechas de investigación generadas por IA."],
        conclusion: `Conclusión de ejemplo para "${topic}". Configura ANTHROPIC_API_KEY para una conclusión generada por IA.`,
        trendsByYear,
        sources: papers,
      };
}

export async function POST(req: NextRequest) {
  let reservation: AiRequestReservation | null = null;

  try {
    const { user } = await requireAuthenticatedUser(req);
    const ip = (req.headers.get("x-forwarded-for") ?? "unknown").split(",")[0]?.trim() || "unknown";
    const rateLimit = checkRateLimit(getRateLimitKey(["research-report", user.id, ip]), 10, 5 * 60 * 1000);

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
      return NextResponse.json({ error: "Falta el tema de investigación o el paper." }, { status: 400 });
    }
    if (topic.length > 2000) {
      return NextResponse.json({ error: "El tema es demasiado largo." }, { status: 413 });
    }

    reservation = await reserveAiRequest({
      userId: user.id,
      inputChars: topic.length + paperContent.length,
      requiredCredits: REPORT_CREDITS,
    });

    const apiKey = process.env.ANTHROPIC_API_KEY;

    // ── Step 1: identify the topic + generate search queries ─────────────────
    let queries = topic ? [topic] : [];
    if (apiKey) {
      try {
        const queryPrompt = paperContent
          ? `Below is the text of an academic paper:\n\n${paperContent.slice(0, 3000)}\n\n` +
            `Identify the main topic/title of this paper and generate 2 to 3 short, specific English ` +
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
        console.error("[research/report] query generation failed:", err);
      }
    }

    if (!topic) topic = lang === "en" ? "Uploaded paper" : "Paper subido";
    if (queries.length === 0) queries = [topic];

    // ── Step 2: gather papers from OpenAlex ──────────────────────────────────
    const papers = await gatherPapers(queries);

    // ── Step 3: synthesize the report ────────────────────────────────────────
    if (!apiKey) {
      const usage = await finalizeAiRequestSuccess({
        userId: user.id,
        eventId: reservation.eventId,
        creditsUsed: REPORT_CREDITS,
        model: reservation.model,
      });
      return NextResponse.json({ report: buildMockResearchReport(topic, papers, lang), mock: true, usage });
    }

    const paperList = papers
      .map((p, i) => `${i + 1}. ${p.title} (${p.year ?? "n/d"})\n${p.abstract.slice(0, 500)}`)
      .join("\n\n");

    const synthesisPrompt =
      lang === "es"
        ? `Tema: "${topic}"\n` +
          `${paperContent ? `\nContenido del paper:\n${paperContent.slice(0, 3000)}\n` : ""}` +
          `\nPapers académicos encontrados:\n${paperList}\n\n` +
          `Generá un reporte académico completo. Devolvé ÚNICAMENTE este JSON, sin texto adicional:\n` +
          `{\n` +
          `  "abstract": "resumen de 4-6 oraciones",\n` +
          `  "introduction": "introducción de 2-3 párrafos",\n` +
          `  "stateOfArt": "estado del arte de 2-3 párrafos",\n` +
          `  "keyFindings": ["hallazgo 1", "hallazgo 2", "hallazgo 3"],\n` +
          `  "gaps": ["brecha 1", "brecha 2"],\n` +
          `  "conclusion": "conclusión de 2-3 oraciones"\n` +
          `}`
        : `Topic: "${topic}"\n` +
          `${paperContent ? `\nPaper content:\n${paperContent.slice(0, 3000)}\n` : ""}` +
          `\nAcademic papers found:\n${paperList}\n\n` +
          `Generate a complete academic report. Return ONLY this JSON, no extra text:\n` +
          `{\n` +
          `  "abstract": "4-6 sentence abstract",\n` +
          `  "introduction": "2-3 paragraph introduction",\n` +
          `  "stateOfArt": "2-3 paragraphs on the current state of the art",\n` +
          `  "keyFindings": ["finding 1", "finding 2", "finding 3"],\n` +
          `  "gaps": ["gap 1", "gap 2"],\n` +
          `  "conclusion": "2-3 sentence conclusion"\n` +
          `}`;

    let synthesized: {
      abstract?: string;
      introduction?: string;
      stateOfArt?: string;
      keyFindings?: string[];
      gaps?: string[];
      conclusion?: string;
    } | null = null;
    try {
      const raw = await callAnthropic({
        apiKey,
        model: reservation.model,
        maxTokens: reservation.maxTokens,
        system: lang === "es"
          ? "Eres un asistente de investigación académica. Devuelve SOLO JSON válido, sin texto adicional."
          : "You are an academic research assistant. Return ONLY valid JSON, no additional text.",
        prompt: synthesisPrompt,
      });
      synthesized = extractJson(raw);
    } catch (err) {
      console.error("[research/report] synthesis failed:", err);
    }

    const mock = buildMockResearchReport(topic, papers, lang);
    const report: ResearchReport = {
      topic,
      abstract: synthesized?.abstract?.trim() || mock.abstract,
      introduction: synthesized?.introduction?.trim() || mock.introduction,
      stateOfArt: synthesized?.stateOfArt?.trim() || mock.stateOfArt,
      keyFindings: synthesized?.keyFindings?.length ? synthesized.keyFindings : mock.keyFindings,
      gaps: synthesized?.gaps?.length ? synthesized.gaps : mock.gaps,
      conclusion: synthesized?.conclusion?.trim() || mock.conclusion,
      trendsByYear: computeTrendsByYear(papers),
      sources: papers,
    };

    const usage = await finalizeAiRequestSuccess({
      userId: user.id,
      eventId: reservation.eventId,
      creditsUsed: REPORT_CREDITS,
      model: reservation.model,
    });

    return NextResponse.json({ report, usage });
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

    console.error("[research/report] failed:", error);
    return NextResponse.json({ error: "Failed to generate research report" }, { status: 500 });
  }
}
