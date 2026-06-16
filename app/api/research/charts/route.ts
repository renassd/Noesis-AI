// POST /api/research/charts
//
// "Tables & Charts" — generates tables and interactive charts from either a
// topic text, a CSV upload, a paper/text upload, or any combination.
//   1. If file content is provided, the AI is asked to extract data and suggest
//      charts/tables from it (CSV columns, paper figures/tables, etc.)
//   2. If only a topic is provided (and no CSV), OpenAlex is searched and the
//      gathered papers are used to generate comparison/trend charts
//   3. The AI returns a JSON structure with 2-4 charts and 1-2 tables
//
// Costs CHARTS_CREDITS credits (multiple AI calls + optional external search).

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

const CHARTS_CREDITS = 5;

type ChartItem = {
  title: string;
  type: "bar" | "line" | "pie";
  labels: string[];
  values: number[];
  description?: string;
};

type TableItem = {
  title: string;
  headers: string[];
  rows: string[][];
};

type ChartsData = {
  title: string;
  charts: ChartItem[];
  tables: TableItem[];
  sources?: OpenAlexPaper[];
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

async function gatherPapers(query: string): Promise<OpenAlexPaper[]> {
  try {
    return await searchOpenAlex(query, 12);
  } catch (err) {
    console.error("[research/charts] OpenAlex search failed:", err);
    return [];
  }
}

/** Normalize/sanitize a chart from possibly-messy AI output. */
function sanitizeChart(c: unknown): ChartItem | null {
  if (!c || typeof c !== "object") return null;
  const obj = c as Record<string, unknown>;
  const labels = Array.isArray(obj.labels) ? obj.labels.map((l) => String(l)) : [];
  const values = Array.isArray(obj.values)
    ? obj.values.map((v) => (typeof v === "number" ? v : Number(v))).map((v) => (Number.isFinite(v) ? v : 0))
    : [];
  if (labels.length === 0 || values.length === 0) return null;
  const n = Math.min(labels.length, values.length);
  const type = obj.type === "line" || obj.type === "pie" ? obj.type : "bar";
  return {
    title: typeof obj.title === "string" ? obj.title : "Chart",
    type,
    labels: labels.slice(0, n),
    values: values.slice(0, n),
    description: typeof obj.description === "string" ? obj.description : undefined,
  };
}

function sanitizeTable(t: unknown): TableItem | null {
  if (!t || typeof t !== "object") return null;
  const obj = t as Record<string, unknown>;
  const headers = Array.isArray(obj.headers) ? obj.headers.map((h) => String(h)) : [];
  const rows = Array.isArray(obj.rows)
    ? obj.rows
        .filter((r) => Array.isArray(r))
        .map((r) => (r as unknown[]).map((cell) => String(cell ?? "")))
    : [];
  if (headers.length === 0 || rows.length === 0) return null;
  return {
    title: typeof obj.title === "string" ? obj.title : "Table",
    headers,
    rows,
  };
}

/** First numeric columns parsed out of a raw CSV string for the mock builder. */
function parseCsvNumericColumns(csv: string): { labels: string[]; columns: Array<{ header: string; values: number[] }> } {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return { labels: [], columns: [] };
  const split = (line: string) => line.split(",").map((c) => c.trim());
  const headers = split(lines[0]);
  const dataRows = lines.slice(1, 13).map(split);

  // Use the first column as labels.
  const labels = dataRows.map((r) => r[0] ?? "");

  const columns: Array<{ header: string; values: number[] }> = [];
  for (let col = 1; col < headers.length && columns.length < 2; col++) {
    const values = dataRows.map((r) => Number((r[col] ?? "").replace(/[^0-9.\-]/g, "")));
    if (values.some((v) => Number.isFinite(v) && v !== 0)) {
      columns.push({ header: headers[col] ?? `Col ${col}`, values: values.map((v) => (Number.isFinite(v) ? v : 0)) });
    }
  }
  return { labels, columns };
}

function buildMockChartsData(params: {
  topic: string;
  papers: OpenAlexPaper[];
  fileContent: string;
  fileType?: "csv" | "text";
  lang: "es" | "en";
}): ChartsData {
  const { topic, papers, fileContent, fileType, lang } = params;
  const charts: ChartItem[] = [];
  const tables: TableItem[] = [];

  if (fileType === "csv" && fileContent) {
    const { labels, columns } = parseCsvNumericColumns(fileContent);
    if (labels.length && columns.length) {
      for (const c of columns) {
        charts.push({
          title: c.header,
          type: "bar",
          labels,
          values: c.values,
          description:
            lang === "en"
              ? `Demo: values of "${c.header}" by row.`
              : `Demo: valores de "${c.header}" por fila.`,
        });
      }
      tables.push({
        title: lang === "en" ? "CSV preview" : "Vista previa del CSV",
        headers: [lang === "en" ? "Label" : "Etiqueta", ...columns.map((c) => c.header)],
        rows: labels.map((lbl, i) => [lbl, ...columns.map((c) => String(c.values[i] ?? ""))]),
      });
    }
  }

  if (charts.length === 0 && papers.length > 0) {
    const trends = computeTrendsByYear(papers);
    if (trends.length > 0) {
      charts.push({
        title: lang === "en" ? "Publications per year" : "Publicaciones por año",
        type: "bar",
        labels: trends.map((t) => String(t.year)),
        values: trends.map((t) => t.count),
        description:
          lang === "en"
            ? "Demo: number of related papers found per year."
            : "Demo: cantidad de papers relacionados encontrados por año.",
      });
    }
    tables.push({
      title: lang === "en" ? "Top papers" : "Papers principales",
      headers: [lang === "en" ? "Paper" : "Paper", lang === "en" ? "Year" : "Año"],
      rows: papers.slice(0, 6).map((p) => [p.title, p.year ? String(p.year) : "—"]),
    });
  }

  if (charts.length === 0) {
    // No CSV columns and no papers — produce a plausible placeholder.
    charts.push({
      title: lang === "en" ? "Sample distribution" : "Distribución de ejemplo",
      type: "bar",
      labels: ["A", "B", "C", "D"],
      values: [42, 78, 35, 61],
      description:
        lang === "en"
          ? "Demo mode active. Enable ANTHROPIC_API_KEY for real data extraction."
          : "Modo demo activo. Configura ANTHROPIC_API_KEY para extracción de datos real.",
    });
  }

  if (tables.length === 0) {
    tables.push({
      title: lang === "en" ? "Sample table" : "Tabla de ejemplo",
      headers: [lang === "en" ? "Category" : "Categoría", lang === "en" ? "Value" : "Valor"],
      rows: [
        ["A", "42"],
        ["B", "78"],
        ["C", "35"],
      ],
    });
  }

  return {
    title:
      lang === "en"
        ? `Charts on ${topic || (fileType === "csv" ? "your CSV" : "your data")}`
        : `Gráficos sobre ${topic || (fileType === "csv" ? "tu CSV" : "tus datos")}`,
    charts,
    tables,
    sources: papers,
  };
}

export async function POST(req: NextRequest) {
  let reservation: AiRequestReservation | null = null;

  try {
    const { user } = await requireAuthenticatedUser(req);
    const ip = (req.headers.get("x-forwarded-for") ?? "unknown").split(",")[0]?.trim() || "unknown";
    const rateLimit = checkRateLimit(getRateLimitKey(["research-charts", user.id, ip]), 10, 5 * 60 * 1000);

    if (!rateLimit.ok) {
      return NextResponse.json(
        { error: "Too many requests. Try again in a few minutes." },
        { status: 429 },
      );
    }

    const body = (await req.json()) as {
      topic?: string;
      lang?: "es" | "en";
      fileContent?: string;
      fileType?: "csv" | "text";
    };
    const topic = (body.topic ?? "").trim();
    const lang: "es" | "en" = body.lang === "en" ? "en" : "es";
    const fileContent = (body.fileContent ?? "").trim();
    const fileType: "csv" | "text" | undefined =
      body.fileType === "csv" || body.fileType === "text" ? body.fileType : undefined;

    if (!topic && !fileContent) {
      return NextResponse.json({ error: "Falta el tema o el archivo de datos." }, { status: 400 });
    }
    if (topic.length > 2000) {
      return NextResponse.json({ error: "El tema es demasiado largo." }, { status: 413 });
    }

    reservation = await reserveAiRequest({
      userId: user.id,
      inputChars: topic.length + fileContent.length,
      requiredCredits: CHARTS_CREDITS,
    });

    const apiKey = process.env.ANTHROPIC_API_KEY;

    // ── Step 1: gather papers from OpenAlex (only for topic-only, non-CSV) ────
    // CSV has its own data; file-only (no topic) relies on the file content.
    let papers: OpenAlexPaper[] = [];
    if (topic && fileType !== "csv") {
      papers = await gatherPapers(topic);
    }

    // ── Step 2: synthesize charts + tables ───────────────────────────────────
    if (!apiKey) {
      const usage = await finalizeAiRequestSuccess({
        userId: user.id,
        eventId: reservation.eventId,
        creditsUsed: CHARTS_CREDITS,
        model: reservation.model,
      });
      return NextResponse.json({
        charts: buildMockChartsData({ topic, papers, fileContent, fileType, lang }),
        mock: true,
        usage,
      });
    }

    const paperList = papers
      .map((p, i) => `${i + 1}. ${p.title} (${p.year ?? "n/d"})\n${p.abstract.slice(0, 300)}`)
      .join("\n\n");

    const synthesisPrompt =
      lang === "es"
        ? `${topic ? `Tema: "${topic}"\n` : ""}${fileContent ? `Contenido del archivo:\n${fileContent.slice(0, 4000)}\n` : ""}${paperList ? `Papers académicos:\n${paperList}\n` : ""}

Analizá los datos y generá visualizaciones. Devolvé ÚNICAMENTE este JSON:
{
  "title": "título descriptivo del análisis",
  "charts": [
    {"title": "...", "type": "bar|line|pie", "labels": ["..."], "values": [número, ...], "description": "..."}
  ],
  "tables": [
    {"title": "...", "headers": ["..."], "rows": [["..."]]}
  ]
}
Reglas:
- Generá 2-4 charts. Elegí el tipo según los datos: bar para comparaciones, line para tendencias, pie para proporciones
- Generá 1-2 tablas con los datos más relevantes
- Los valores deben ser números reales extraídos o estimados de los datos
- Si hay datos CSV, usá las columnas numéricas para los gráficos`
        : `${topic ? `Topic: "${topic}"\n` : ""}${fileContent ? `File content:\n${fileContent.slice(0, 4000)}\n` : ""}${paperList ? `Academic papers:\n${paperList}\n` : ""}

Analyze the data and generate visualizations. Return ONLY this JSON:
{
  "title": "descriptive title of the analysis",
  "charts": [
    {"title": "...", "type": "bar|line|pie", "labels": ["..."], "values": [number, ...], "description": "..."}
  ],
  "tables": [
    {"title": "...", "headers": ["..."], "rows": [["..."]]}
  ]
}
Rules:
- Generate 2-4 charts. Choose the type based on the data: bar for comparisons, line for trends, pie for proportions
- Generate 1-2 tables with the most relevant data
- Values must be real numbers extracted or estimated from the data
- If there is CSV data, use the numeric columns for the charts`;

    let synthesized: { title?: string; charts?: unknown[]; tables?: unknown[] } | null = null;
    try {
      const raw = await callAnthropic({
        apiKey,
        model: reservation.model,
        maxTokens: reservation.maxTokens,
        system: lang === "es"
          ? "Eres un analista de datos. Devuelve SOLO JSON válido, sin texto adicional."
          : "You are a data analyst. Return ONLY valid JSON, no additional text.",
        prompt: synthesisPrompt,
      });
      synthesized = extractJson(raw);
    } catch (err) {
      console.error("[research/charts] synthesis failed:", err);
    }

    const mock = buildMockChartsData({ topic, papers, fileContent, fileType, lang });
    const charts = (synthesized?.charts ?? [])
      .map(sanitizeChart)
      .filter((c): c is ChartItem => c !== null);
    const tables = (synthesized?.tables ?? [])
      .map(sanitizeTable)
      .filter((t): t is TableItem => t !== null);

    const data: ChartsData = {
      title: synthesized?.title?.trim() || mock.title,
      charts: charts.length > 0 ? charts : mock.charts,
      tables: tables.length > 0 ? tables : mock.tables,
      sources: papers,
    };

    const usage = await finalizeAiRequestSuccess({
      userId: user.id,
      eventId: reservation.eventId,
      creditsUsed: CHARTS_CREDITS,
      model: reservation.model,
    });

    return NextResponse.json({ charts: data, usage });
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

    console.error("[research/charts] failed:", error);
    return NextResponse.json({ error: "Failed to generate charts" }, { status: 500 });
  }
}
