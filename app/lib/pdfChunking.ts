const MAX_CONTEXT_CHARS = 3500;
const CHUNK_SIZE = 700;

function splitIntoChunks(text: string): string[] {
  const paragraphs = text.split(/\n{2,}/);
  const chunks: string[] = [];

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed || trimmed.length < 20) continue;

    if (trimmed.length <= CHUNK_SIZE) {
      chunks.push(trimmed);
    } else {
      const sentences = trimmed.match(/[^.!?]+[.!?]+\s*/g) ?? [trimmed];
      let current = "";
      for (const s of sentences) {
        if (current.length + s.length > CHUNK_SIZE && current.trim()) {
          chunks.push(current.trim());
          current = s;
        } else {
          current += s;
        }
      }
      if (current.trim().length >= 20) chunks.push(current.trim());
    }
  }

  return chunks;
}

function scoreChunk(chunk: string, queryWords: string[]): number {
  if (queryWords.length === 0) return 0;
  const lower = chunk.toLowerCase();
  return queryWords.reduce((acc, word) => acc + (lower.includes(word) ? 1 : 0), 0);
}

export function getRelevantChunks(text: string, query: string): string {
  const chunks = splitIntoChunks(text);
  if (chunks.length === 0) return text.slice(0, MAX_CONTEXT_CHARS);

  const queryWords = query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3);

  const scored = chunks.map((chunk, i) => ({
    chunk,
    score: scoreChunk(chunk, queryWords),
    i,
  }));

  const hasMatches = scored.some((s) => s.score > 0);

  if (hasMatches) {
    scored.sort((a, b) => b.score - a.score || a.i - b.i);
  }

  let result = "";
  for (const { chunk } of scored) {
    if (result.length + chunk.length + 4 > MAX_CONTEXT_CHARS) break;
    result += (result ? "\n\n" : "") + chunk;
  }

  return result || text.slice(0, MAX_CONTEXT_CHARS);
}

export function buildPdfSystemContext(
  pdfName: string,
  pdfText: string,
  query: string,
  lang: "es" | "en",
): string {
  const relevant = getRelevantChunks(pdfText, query);

  return lang === "en"
    ? `[DOCUMENT CONTEXT — "${pdfName}"]\nUse the following relevant excerpts from the uploaded PDF to answer the user:\n\n${relevant}\n\n[END OF DOCUMENT CONTEXT]\n\n`
    : `[CONTEXTO DEL DOCUMENTO — "${pdfName}"]\nUsá los siguientes fragmentos relevantes del PDF subido para responder al usuario:\n\n${relevant}\n\n[FIN DEL CONTEXTO]\n\n`;
}
