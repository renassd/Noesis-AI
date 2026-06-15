// POST /api/research/landscape
//
// "Research Aider" — agentic landscape report generator.
// Given a topic, this endpoint:
//   1. Asks the AI to generate a handful of academic search queries
//   2. Searches OpenAlex for each query and merges/dedupes the results
//   3. Asks the AI to synthesize a structured landscape report (summary,
//      comparison table, research gaps) from the gathered papers
//   4. Computes a publications-per-year trend locally from the papers
//
// Costs LANDSCAPE_CREDITS credits (more than a normal chat message, since
// it performs multiple AI calls + external searches).

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

const LANDSCAPE_CREDITS = 5;

type LandscapeReport = {
  topic: string;
  summary: string;
  comparisonTable?: { headers: string[]; rows: string[][] };
  trendsByYear?: Array<{ year: number; count: number }>;
  gaps?: string[];
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
      console.error("[research/landscape] OpenAlex search failed:", err);
    }
  }
  return Array.from(seen.values()).slice(0, 20);
}

function buildMockReport(topic: string, papers: OpenAlexPaper[], lang: "es" | "en"): LandscapeReport {
  const trendsByYear = computeTrendsByYear(papers);
  return lang === "en"
    ? {
        topic,
        summary:
          `Demo mode active. This is a placeholder landscape for "${topic}" built from ${papers.length} papers found via OpenAlex. ` +
          `Enable ANTHROPIC_API_KEY to get an AI-generated summary, comparison table and research gaps.`,
        comparisonTable: {
          headers: ["Paper", "Year", "Summary"],
          rows: papers.slice(0, 6).map((p) => [p.title, p.year ? String(p.year) : "—", p.abstract.slice(0, 140)]),
        },
        trendsByYear,
        gaps: ["Enable ANTHROPIC_API_KEY for AI-identified research gaps."],
        sources: papers,
      }
    : {
        topic,
        summary:
          `Modo demo activo. Este es un landscape de ejemplo para "${topic}" generado a partir de ${papers.length} papers encontrados via OpenAlex. ` +
          `Configura ANTHROPIC_API_KEY para obtener un resumen, tabla comparativa y brechas de investigación generados por IA.`,
        comparisonTable: {
          headers: ["Paper", "Año", "Resumen"],
          rows: papers.slice(0, 6).map((p) => [p.title, p.year ? String(p.year) : "—", p.abstract.slice(0, 140)]),
        },
        trendsByYear,
        gaps: ["Configura ANTHROPIC_API_KEY para obtener brechas de investigación generadas por IA."],
        sources: papers,
      };
}

export async function POST(req: NextRequest) {
  let reservation: AiRequestReservation | null = null;

  try {
    const { user } = await requireAuthenticatedUser(req);
    const ip = (req.headers.get("x-forwarded-for") ?? "unknown").split(",")[0]?.trim() || "unknown";
    const rateLimit = checkRateLimit(getRateLimitKey(["research-landscape", user.id, ip]), 10, 5 * 60 * 1000);

    if (!rateLimit.ok) {
      return NextResponse.json(
        { error: "Too many requests. Try again in a few minutes." },
        { status: 429 },
      );
    }

    const body = (await req.json()) as { topic?: string; lang?: "es" | "en" };
    const topic = (body.topic ?? "").trim();
    const lang: "es" | "en" = body.lang === "en" ? "en" : "es";

    if (!topic) {
      return NextResponse.json({ error: "Falta el tema de investigación." }, { status: 400 });
    }
    if (topic.length > 2000) {
      return NextResponse.json({ error: "El tema es demasiado largo." }, { status: 413 });
    }

    reservation = await reserveAiRequest({
      userId: user.id,
      inputChars: topic.length,
      requiredCredits: LANDSCAPE_CREDITS,
    });

    const apiKey = process.env.ANTHROPIC_API_KEY;

    // ── Step 1: generate search queries (or fall back to the topic itself) ──
    let queries = [topic];
    if (apiKey) {
      try {
        const queryPrompt =
          `Topic: "${topic}"\n\n` +
          `Generate 3 to 4 short, specific English search queries (3-6 words each) ` +
          `that would find the most relevant academic papers about this topic on an ` +
          `academic search engine. Return ONLY this JSON, no extra text:\n` +
          `{"queries": ["query 1", "query 2", "query 3"]}`;

        const raw = await callAnthropic({
          apiKey,
          model: reservation.model,
          maxTokens: 400,
          system: "You are a research assistant. Return ONLY valid JSON, no additional text.",
          prompt: queryPrompt,
        });

        const parsed = extractJson<{ queries?: string[] }>(raw);
        if (parsed?.queries?.length) {
          queries = parsed.queries.filter((q) => q.trim().length > 0).slice(0, 4);
        }
      } catch (err) {
        console.error("[research/landscape] query generation failed:", err);
      }
    }

    // ── Step 2: gather papers from OpenAlex ──────────────────────────────────
    const papers = await gatherPapers(queries);

    // ── Step 3: synthesize the report ────────────────────────────────────────
    if (!apiKey) {
      const usage = await finalizeAiRequestSuccess({
        userId: user.id,
        eventId: reservation.eventId,
        creditsUsed: LANDSCAPE_CREDITS,
        model: reservation.model,
      });
      return NextResponse.json({ report: buildMockReport(topic, papers, lang), mock: true, usage });
    }

    const paperList = papers
      .map((p, i) => `${i + 1}. ${p.title} (${p.year ?? "n/d"})\n${p.abstract.slice(0, 500)}`)
      .join("\n\n");

    const synthesisPrompt =
      lang === "es"
        ? `Tema de investigación: "${topic}"\n\n` +
          `A continuación hay ${papers.length} papers académicos encontrados sobre el tema:\n\n${paperList}\n\n` +
          `Generá un "landscape" (panorama) del estado actual de este tema, basado ÚNICAMENTE en estos papers. Devolvé ÚNICAMENTE este JSON, sin texto adicional:\n` +
          `{\n` +
          `  "summary": "resumen ejecutivo de 4-6 oraciones sobre el estado actual del tema",\n` +
          `  "comparisonTable": {"headers": ["Enfoque","Descripción","Ventaja principal","Limitación"], "rows": [["...","...","...","..."], ...]},\n` +
          `  "gaps": ["brecha de investigación 1", "brecha 2", "brecha 3"]\n` +
          `}\n` +
          `La tabla comparativa debe tener entre 3 y 6 filas comparando los principales enfoques/métodos encontrados en los papers.`
        : `Research topic: "${topic}"\n\n` +
          `Below are ${papers.length} academic papers found on this topic:\n\n${paperList}\n\n` +
          `Generate a "landscape" overview of the current state of this topic, based ONLY on these papers. Return ONLY this JSON, no extra text:\n` +
          `{\n` +
          `  "summary": "4-6 sentence executive summary of the current state of the topic",\n` +
          `  "comparisonTable": {"headers": ["Approach","Description","Main advantage","Limitation"], "rows": [["...","...","...","..."], ...]},\n` +
          `  "gaps": ["research gap 1", "gap 2", "gap 3"]\n` +
          `}\n` +
          `The comparison table should have 3 to 6 rows comparing the main approaches/methods found in the papers.`;

    let synthesized: { summary?: string; comparisonTable?: { headers: string[]; rows: string[][] }; gaps?: string[] } | null = null;
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
      console.error("[research/landscape] synthesis failed:", err);
    }

    const report: LandscapeReport = {
      topic,
      summary: synthesized?.summary?.trim() || buildMockReport(topic, papers, lang).summary,
      comparisonTable: synthesized?.comparisonTable,
      trendsByYear: computeTrendsByYear(papers),
      gaps: synthesized?.gaps,
      sources: papers,
    };

    const usage = await finalizeAiRequestSuccess({
      userId: user.id,
      eventId: reservation.eventId,
      creditsUsed: LANDSCAPE_CREDITS,
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

    console.error("[research/landscape] failed:", error);
    return NextResponse.json({ error: "Failed to generate landscape report" }, { status: 500 });
  }
}
