import { NextRequest, NextResponse } from "next/server";

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

  try {
    const apiUrl =
      `https://api.semanticscholar.org/graph/v1/paper/search` +
      `?query=${encodeURIComponent(query)}` +
      `&limit=8&fields=title,authors,year,abstract,url,externalIds`;

    const res = await fetch(apiUrl, {
      headers: { "User-Agent": "Neuvra/1.0" },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Paper search failed" }, { status: 502 });
    }

    const data = (await res.json()) as { data?: S2Paper[] };
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
  } catch {
    return NextResponse.json({ error: "Network error" }, { status: 502 });
  }
}
