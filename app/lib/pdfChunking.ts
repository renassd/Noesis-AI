// MAX_CONTEXT_CHARS raised to 120 000 to cover full books/long documents.
// Claude's context window handles this easily.
const MAX_CONTEXT_CHARS = 120_000;
const CHUNK_SIZE = 1_200;

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

      for (const sentence of sentences) {
        if (current.length + sentence.length > CHUNK_SIZE && current.trim()) {
          chunks.push(current.trim());
          current = sentence;
        } else {
          current += sentence;
        }
      }

      if (current.trim().length >= 20) {
        chunks.push(current.trim());
      }
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
  const trimmed = text.trim();

  // Fast path: document fits entirely — send it all, no chunking
  if (trimmed.length <= MAX_CONTEXT_CHARS) return trimmed;

  // Slow path: document is very large — select most relevant chunks
  const chunks = splitIntoChunks(trimmed);
  if (chunks.length === 0) return trimmed.slice(0, MAX_CONTEXT_CHARS);

  // Keep short words (handles "cap III", "chapter 2", roman numerals)
  const queryWords = query
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 2);

  const scored = chunks.map((chunk, i) => ({
    chunk,
    score: scoreChunk(chunk, queryWords),
    i,
  }));

  const hasMatches = scored.some((item) => item.score > 0);
  if (hasMatches) {
    scored.sort((a, b) => b.score - a.score || a.i - b.i);
  }

  let result = "";
  for (const { chunk } of scored) {
    if (result.length + chunk.length + 4 > MAX_CONTEXT_CHARS) break;
    result += (result ? "\n\n" : "") + chunk;
  }

  return result || trimmed.slice(0, MAX_CONTEXT_CHARS);
}

export function buildDocumentSystemContext(
  documentName: string,
  documentText: string,
  query: string,
  lang: "es" | "en",
): string {
  const content = getRelevantChunks(documentText, query);
  const isTruncated = documentText.trim().length > MAX_CONTEXT_CHARS;

  if (lang === "en") {
    return `[UPLOADED DOCUMENT: "${documentName}"]
${isTruncated
    ? "The document is very large — the most relevant sections are shown below."
    : "The complete document content is provided below."}
Answer the user using ONLY this content. Do NOT say you lack access to the document or any part of it — everything available is included here. If the user asks about a specific chapter or section, locate it in the content below and summarize it directly.

${content}

[END OF DOCUMENT]

`;
  }

  return `[DOCUMENTO SUBIDO: "${documentName}"]
${isTruncated
    ? "El documento es muy extenso — se muestran las secciones más relevantes a continuación."
    : "El contenido completo del documento se incluye a continuación."}
Respondé usando ÚNICAMENTE este contenido. NO digas que no tenés acceso al documento ni a ninguna parte de él — todo lo disponible está incluido acá. Si el usuario pide un capítulo o sección específica, buscalo en el contenido de abajo y resumilo directamente.

${content}

[FIN DEL DOCUMENTO]

`;
}

export const buildPdfSystemContext = buildDocumentSystemContext;
