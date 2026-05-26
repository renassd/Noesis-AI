import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface S2Paper {
  paperId: string;
  title?: string;
  authors?: Array<{ name: string }>;
  year?: number;
  abstract?: string;
  url?: string;
  externalIds?: { DOI?: string };
}

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q");
  if (!query?.trim()) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const apiUrl =
      `https://api.semanticscholar.org/graph/v1/paper/search` +
      `?query=${encodeURIComponent(query)}` +
      `&limit=8&fields=title,authors,year,abstract,url,externalIds`;

    const res = await fetch(apiUrl, {
      headers: {
        "User-Agent": "Neuvra/1.0",
        "Accept": "application/json",
      },
      signal: controller.signal,
      cache: "no-store",
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("[paper-search] S2 error:", res.status, body.slice(0, 300));
      return NextResponse.json(
        { error: `Semantic Scholar returned ${res.status}` },
        { status: 502 },
      );
    }

    const data = (await res.json()) as { data?: S2Paper[]; total?: number };
    console.log("[paper-search] total results:", data.total ?? "?");

    const papers = (data.data ?? []).map((p) => ({
      id: p.paperId,
      title: p.title ?? "Untitled",
      authors: (p.authors ?? []).map((a) => a.name),
      year: p.year ?? null,
      abstract: p.abstract ?? "",
      url:
        p.url ??
        (p.externalIds?.DOI ? `https://doi.org/${p.externalIds.DOI}` : ""),
    }));

    return NextResponse.json({ papers });
  } catch (err) {
    const msg =
      err instanceof Error && err.name === "AbortError"
        ? "Request timed out"
        : err instanceof Error
          ? err.message
          : "Unknown error";
    console.error("[paper-search] fetch failed:", msg);
    return NextResponse.json({ error: `Network error: ${msg}` }, { status: 502 });
  } finally {
    clearTimeout(timeoutId);
  }
}
