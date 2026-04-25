// Voyage AI embedding service (Anthropic's recommended embedding partner).
// Set VOYAGE_API_KEY in your .env to enable semantic search.
// Without it, the Memory Bank falls back to keyword search transparently.

const VOYAGE_API_URL = "https://api.voyageai.com/v1/embeddings";
const EMBEDDING_MODEL = "voyage-3-lite"; // 512 dims — fast, cheap, high quality

function getApiKey(): string | undefined {
  return process.env.VOYAGE_API_KEY;
}

async function callVoyage(input: string, inputType: "document" | "query"): Promise<number[] | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  try {
    const res = await fetch(VOYAGE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: input.slice(0, 4000),
        input_type: inputType,
      }),
    });

    if (!res.ok) {
      console.error("[embeddings] Voyage API error", res.status, await res.text());
      return null;
    }

    const data = (await res.json()) as { data: Array<{ embedding: number[] }> };
    return data.data[0]?.embedding ?? null;
  } catch (err) {
    console.error("[embeddings] Request failed", err);
    return null;
  }
}

/** Generate an embedding for a document to be stored. */
export async function embedDocument(text: string): Promise<number[] | null> {
  return callVoyage(text, "document");
}

/** Generate an embedding for a search query (optimised for similarity matching). */
export async function embedQuery(text: string): Promise<number[] | null> {
  return callVoyage(text, "query");
}

/** True when Voyage AI is configured. */
export function embeddingsAvailable(): boolean {
  return Boolean(getApiKey());
}
