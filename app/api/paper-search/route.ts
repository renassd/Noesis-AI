import { NextRequest, NextResponse } from "next/server";

type OpenAlexAuthor = {
  author?: {
    display_name?: string;
  };
};

type OpenAlexWork = {
  id?: string;
  display_name?: string;
  publication_year?: number | null;
  abstract_inverted_index?: Record<string, number[]>;
  primary_location?: {
    landing_page_url?: string | null;
    pdf_url?: string | null;
    source?: {
      homepage_url?: string | null;
    } | null;
  } | null;
  authorships?: OpenAlexAuthor[];
};

type OpenAlexResponse = {
  results?: OpenAlexWork[];
};

function normalizeQuery(query: string) {
  return query.replace(/\s+/g, " ").trim().slice(0, 180);
}

function decodeAbstract(index?: Record<string, number[]>) {
  if (!index) return "";

  const entries = Object.entries(index);
  if (entries.length === 0) return "";

  let maxPosition = -1;
  for (const [, positions] of entries) {
    for (const position of positions) {
      if (position > maxPosition) maxPosition = position;
    }
  }

  if (maxPosition < 0) return "";

  const words = new Array<string>(maxPosition + 1).fill("");
  for (const [word, positions] of entries) {
    for (const position of positions) {
      words[position] = word;
    }
  }

  return words.join(" ").replace(/\s+/g, " ").trim();
}

function pickUrl(work: OpenAlexWork) {
  return (
    work.primary_location?.landing_page_url ||
    work.primary_location?.pdf_url ||
    work.primary_location?.source?.homepage_url ||
    ""
  );
}

export async function GET(req: NextRequest) {
  const query = normalizeQuery(req.nextUrl.searchParams.get("q") || "");

  if (!query) {
    return NextResponse.json({ error: "Query is required." }, { status: 400 });
  }

  try {
    const url = new URL("https://api.openalex.org/works");
    url.searchParams.set("search", query);
    url.searchParams.set("per-page", "8");
    url.searchParams.set("sort", "relevance_score:desc");
    url.searchParams.set("mailto", "neuvraai@gmail.com");

    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": "NeuvraAI/1.0 (paper search)",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const body = await response.text();
      console.error("[/api/paper-search] OpenAlex error", response.status, body);
      return NextResponse.json({ error: "Paper search provider failed." }, { status: 502 });
    }

    const data = (await response.json()) as OpenAlexResponse;
    const papers = (data.results ?? [])
      .map((work) => ({
        id: work.id || work.display_name || crypto.randomUUID(),
        title: work.display_name || "Untitled paper",
        authors: (work.authorships ?? [])
          .map((entry) => entry.author?.display_name?.trim())
          .filter((name): name is string => Boolean(name)),
        year: work.publication_year ?? null,
        abstract: decodeAbstract(work.abstract_inverted_index),
        url: pickUrl(work),
      }))
      .filter((paper) => paper.title.trim().length > 0);

    return NextResponse.json({ papers });
  } catch (error) {
    console.error("[/api/paper-search] Unexpected error", error);
    return NextResponse.json({ error: "Paper search failed." }, { status: 500 });
  }
}
