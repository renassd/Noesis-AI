// Server-side academic paper search via OpenAlex (https://openalex.org).
// OpenAlex is free, requires no API key, and is used by the Research Aider
// pipeline to gather sources for landscape reports.

export interface OpenAlexPaper {
  id: string;
  title: string;
  authors: string[];
  year: number | null;
  abstract: string;
  url: string;
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
 * Search academic papers via OpenAlex. Returns up to `limit` papers that
 * have a reconstructed abstract.
 */
export async function searchOpenAlex(query: string, limit: number): Promise<OpenAlexPaper[]> {
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
