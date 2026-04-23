import { NextResponse } from "next/server";

type CommonsApiPage = {
  title?: string;
  imageinfo?: Array<{
    thumburl?: string;
    url?: string;
    mime?: string;
  }>;
};

type CommonsApiResponse = {
  query?: {
    pages?: Record<string, CommonsApiPage>;
  };
};

const COMMONS_ENDPOINT = "https://commons.wikimedia.org/w/api.php";

function normalizeQuery(query: string) {
  return query
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
}

function buildSearchTerms(query: string) {
  const base = normalizeQuery(query);
  const terms = [
    `${base} filetype:bitmap`,
    `${base} educational illustration filetype:bitmap`,
    `${base} astronomy filetype:bitmap`,
  ];

  return [...new Set(terms)];
}

function isGoodImage(page: CommonsApiPage) {
  const info = page.imageinfo?.[0];
  if (!info?.thumburl && !info?.url) return false;
  if (info.mime && !/^image\/(jpeg|jpg|png|webp|gif)$/i.test(info.mime)) return false;

  const title = (page.title || "").toLowerCase();
  if (/(logo|icon|flag|crest|seal|map icon|symbol only)/.test(title)) return false;

  return true;
}

async function searchCommons(query: string) {
  const url = new URL(COMMONS_ENDPOINT);
  url.searchParams.set("action", "query");
  url.searchParams.set("format", "json");
  url.searchParams.set("generator", "search");
  url.searchParams.set("gsrnamespace", "6");
  url.searchParams.set("gsrlimit", "8");
  url.searchParams.set("gsrsearch", query);
  url.searchParams.set("prop", "imageinfo");
  url.searchParams.set("iiprop", "url|mime");
  url.searchParams.set("iiurlwidth", "1200");

  const response = await fetch(url.toString(), {
    headers: {
      "User-Agent": "NeuvraAI/1.0 (educational image search)",
      "Accept": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) return null;
  return (await response.json()) as CommonsApiResponse;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { query?: string };
    const query = normalizeQuery(body.query || "");

    if (!query) {
      return NextResponse.json({ error: "query requerida" }, { status: 400 });
    }

    for (const term of buildSearchTerms(query)) {
      const data = await searchCommons(term);
      const pages = Object.values(data?.query?.pages ?? {});
      const match = pages.find(isGoodImage);
      const image = match?.imageinfo?.[0];

      if (match && image) {
        return NextResponse.json({
          imageUrl: image.thumburl || image.url,
          sourceUrl: image.url,
          title: match.title || query,
          provider: "wikimedia-commons",
        });
      }
    }

    return NextResponse.json({ imageUrl: null, provider: "wikimedia-commons" });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "image search failed" },
      { status: 500 },
    );
  }
}
