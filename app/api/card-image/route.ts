import { NextResponse } from "next/server";

const WIKIPEDIA_API = {
  en: {
    searchUrl: "https://en.wikipedia.org/w/rest.php/v1/search/title",
    summaryUrl: "https://en.wikipedia.org/api/rest_v1/page/summary",
  },
  es: {
    searchUrl: "https://es.wikipedia.org/w/rest.php/v1/search/title",
    summaryUrl: "https://es.wikipedia.org/api/rest_v1/page/summary",
  },
} as const;
const COMMONS_ENDPOINT = "https://commons.wikimedia.org/w/api.php";
const CACHE_SECONDS = 3600;

type WikiSearchPage = {
  title?: string;
  key?: string;
};

type WikiSummary = {
  title?: string;
  content_urls?: { desktop?: { page?: string } };
  thumbnail?: { source?: string };
  originalimage?: { source?: string };
};

type CommonsApiPage = {
  title?: string;
  imageinfo?: Array<{
    thumburl?: string;
    url?: string;
    mime?: string;
  }>;
};

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "of", "to", "in", "on", "for", "with", "by", "from",
  "is", "are", "was", "were", "be", "being", "been", "as", "at", "that", "this", "these",
  "those", "during", "through", "into", "uses", "using", "produce", "produces", "occurs",
  "correct", "order", "what", "which", "how", "many", "does", "do", "did", "called",
  "stage", "light", "dependent", "independent", "released", "split", "water", "oxygen",
  "el", "la", "los", "las", "un", "una", "unos", "unas", "de", "del", "al", "en", "con",
  "por", "para", "desde", "hacia", "durante", "que", "como", "cual", "cuales", "cuantos",
  "cuantas", "donde", "cuando", "es", "son", "fue", "fueron", "ser", "siendo", "sido",
  "usa", "usan", "utiliza", "utilizan", "produce", "producen", "ocurre", "ocurren",
  "correcto", "orden", "llama", "llaman", "etapa", "fase", "fases", "libera", "liberan",
  "agua", "oxigeno", "oxígeno", "luz", "dependiente", "independiente",
]);

function normalizePrompt(prompt: string) {
  return prompt
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
}

function detectPromptLang(prompt: string): "es" | "en" {
  const normalized = prompt.toLowerCase();
  if (/[áéíóúñ¿¡]/.test(normalized)) return "es";
  if (/\b(el|la|los|las|una|unas|que|como|donde|fases|corazon|corazón|cloroplasto)\b/.test(normalized)) {
    return "es";
  }
  return "en";
}

function titleCase(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function buildSearchCandidates(prompt: string, lang: "es" | "en") {
  const normalized = normalizePrompt(prompt)
    .replace(/[?!.,:;()[\]{}]/g, " ")
    .replace(/\b(co2)\b/gi, "carbon dioxide")
    .replace(/\b(h2o)\b/gi, "water");

  const rawWords = normalized
    .split(/\s+/)
    .map((word) => word.toLowerCase())
    .filter(Boolean);

  const keywordWords = rawWords.filter((word) => {
    if (STOPWORDS.has(word)) return false;
    if (word.length < 3) return false;
    return /^[a-z0-9-]+$/i.test(word);
  });

  const phrases = [
    normalized,
    keywordWords.slice(0, 6).join(" "),
    keywordWords.slice(0, 4).join(" "),
    keywordWords.slice(0, 3).join(" "),
    keywordWords.slice(0, 2).join(" "),
    keywordWords[0] ?? "",
  ];

  const domainHints = [
    /\bphotosynthesis|photosynthesis|fotosintesis|fotosíntesis|chloroplast|cloroplasto|calvin cycle|ciclo de calvin|mitosis|prophase|profase|metaphase|metafase|anaphase|anafase|telophase|telofase\b/i.test(normalized)
      ? (lang === "es"
        ? ["fotosintesis", "cloroplasto", "ciclo de calvin", "mitosis"]
        : ["photosynthesis", "chloroplast", "calvin cycle", "mitosis"])
      : [],
    /\bheart|human heart|ventricle|ventricle|atrium|atria|chamber|corazon|corazón|ventriculo|ventrículo|auricula|aurícula|camaras|cámaras\b/i.test(normalized)
      ? (lang === "es"
        ? ["corazon humano", "camaras del corazon", "anatomia cardiaca"]
        : ["human heart", "heart chambers", "cardiac anatomy"])
      : [],
    /\bcell|celula|célula|nucleus|nucleo|núcleo|membrane|membrana|organelle|organelo\b/i.test(normalized)
      ? (lang === "es"
        ? ["biologia celular", "estructura celular"]
        : ["cell biology", "cell structure"])
      : [],
    /\bmap|mapa|geography|geografia|geografía|country|pais|país|continent|continente\b/i.test(normalized)
      ? (lang === "es" ? ["mapa", "geografia"] : ["map", "geography"])
      : [],
  ].flat();

  return [...new Set(
    [...phrases, ...domainHints]
      .map((item) => titleCase(item.trim()))
      .filter(Boolean),
  )];
}

async function searchWikipedia(query: string, lang: "es" | "en") {
  const url = new URL(WIKIPEDIA_API[lang].searchUrl);
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "3");

  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "User-Agent": "NeuvraAI/1.0 (educational flashcards)",
    },
    next: { revalidate: CACHE_SECONDS },
  });

  if (!response.ok) return [];

  const data = (await response.json()) as { pages?: WikiSearchPage[] };
  return data.pages ?? [];
}

async function fetchSummary(pageKey: string, lang: "es" | "en") {
  const response = await fetch(`${WIKIPEDIA_API[lang].summaryUrl}/${encodeURIComponent(pageKey)}`, {
    headers: {
      Accept: "application/json",
      "User-Agent": "NeuvraAI/1.0 (educational flashcards)",
    },
    next: { revalidate: CACHE_SECONDS },
  });

  if (!response.ok) return null;
  return (await response.json()) as WikiSummary;
}

function isGoodCommonsImage(page: CommonsApiPage) {
  const info = page.imageinfo?.[0];
  if (!info?.thumburl && !info?.url) return false;
  if (info.mime && !/^image\/(jpeg|jpg|png|webp|gif)$/i.test(info.mime)) return false;

  const title = (page.title || "").toLowerCase();
  if (/(logo|icon|flag|crest|seal|symbol only)/.test(title)) return false;

  return true;
}

async function searchCommons(query: string) {
  const url = new URL(COMMONS_ENDPOINT);
  url.searchParams.set("action", "query");
  url.searchParams.set("format", "json");
  url.searchParams.set("generator", "search");
  url.searchParams.set("gsrnamespace", "6");
  url.searchParams.set("gsrlimit", "8");
  url.searchParams.set("gsrsearch", `${query} educational diagram`);
  url.searchParams.set("prop", "imageinfo");
  url.searchParams.set("iiprop", "url|mime");
  url.searchParams.set("iiurlwidth", "1200");

  const response = await fetch(url.toString(), {
    headers: {
      "User-Agent": "NeuvraAI/1.0 (educational flashcards)",
      Accept: "application/json",
    },
    next: { revalidate: CACHE_SECONDS },
  });

  if (!response.ok) return null;

  const data = (await response.json()) as {
    query?: { pages?: Record<string, CommonsApiPage> };
  };

  const pages = Object.values(data.query?.pages ?? {});
  const match = pages.find(isGoodCommonsImage);
  const image = match?.imageinfo?.[0];

  if (!match || !image) return null;

  return {
    imageUrl: image.thumburl || image.url || null,
    title: match.title || query,
    sourceUrl: image.url || null,
    provider: "wikimedia-commons",
  };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { prompt?: string };
    const prompt = normalizePrompt(body.prompt || "");

    if (!prompt) {
      return NextResponse.json({ error: "prompt requerido" }, { status: 400 });
    }

    const preferredLang = detectPromptLang(prompt);
    const wikiLangs: Array<"es" | "en"> = preferredLang === "es" ? ["es", "en"] : ["en", "es"];
    const candidates = buildSearchCandidates(prompt, preferredLang);

    for (const wikiLang of wikiLangs) {
      for (const candidate of candidates) {
        const pages = await searchWikipedia(candidate, wikiLang);

        for (const page of pages) {
          if (!page.key) continue;

          const summary = await fetchSummary(page.key, wikiLang);
          const imageUrl = summary?.thumbnail?.source || summary?.originalimage?.source || null;
          if (!imageUrl) continue;

          return NextResponse.json(
            {
              imageUrl,
              title: summary?.title || page.title || candidate,
              sourceUrl: summary?.content_urls?.desktop?.page || null,
              provider: `wikipedia-${wikiLang}`,
              matchedQuery: candidate,
            },
            {
              headers: {
                "Cache-Control": `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=86400`,
              },
            },
          );
        }
      }
    }

    for (const candidate of candidates) {
      const commons = await searchCommons(candidate);
      if (!commons?.imageUrl) continue;

      return NextResponse.json(
        {
          ...commons,
          matchedQuery: candidate,
        },
        {
          headers: {
            "Cache-Control": `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=86400`,
          },
        },
      );
    }

    return NextResponse.json(
      { imageUrl: null, title: null, provider: "none", matchedQuery: candidates[0] ?? prompt },
      {
        headers: {
          "Cache-Control": `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=86400`,
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "card image lookup failed" },
      { status: 500 },
    );
  }
}
