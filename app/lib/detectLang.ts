export type DetectedLang = "es" | "en" | "auto";

const ES_SIGNALS = [
  "el", "la", "los", "las", "de", "del", "en", "que", "es", "son",
  "un", "una", "unos", "unas", "y", "o", "con", "por", "para",
  "como", "mas", "pero", "no", "se", "lo", "al", "su", "sus",
  "que", "como", "cual", "cuando", "donde", "por", "quiero",
  "necesito", "puedo", "puede", "hacer", "este", "esta", "estos",
  "estas", "ese", "esa", "esos", "tambien", "ademas", "porque",
  "aunque", "sobre", "entre", "hasta", "desde", "hacia", "segun",
];

const EN_SIGNALS = [
  "the", "a", "an", "is", "are", "was", "were", "be", "been",
  "have", "has", "had", "do", "does", "did", "will", "would",
  "can", "could", "should", "may", "might", "shall", "i", "you",
  "he", "she", "it", "we", "they", "my", "your", "his", "her",
  "its", "our", "their", "this", "that", "these", "those", "what",
  "which", "who", "how", "when", "where", "why", "with", "from",
  "about", "into", "through", "during", "of", "in", "on", "at",
  "by", "for", "and", "but", "or", "not", "so", "if", "than",
  "then", "just", "more", "also",
];

const ES_SET = new Set(ES_SIGNALS);
const EN_SET = new Set(EN_SIGNALS);

export function detectLang(text: string): DetectedLang {
  if (!text || text.trim().length < 20) return "auto";

  const words = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 2);

  if (words.length < 4) return "auto";

  let esScore = 0;
  let enScore = 0;

  for (const word of words) {
    if (ES_SET.has(word)) esScore++;
    if (EN_SET.has(word)) enScore++;
  }

  const total = esScore + enScore;
  if (total < 2) return "auto";

  const esRatio = esScore / total;
  if (esRatio >= 0.6) return "es";
  if (esRatio <= 0.4) return "en";
  if (esScore > enScore) return "es";
  if (enScore > esScore) return "en";
  return "auto";
}

export function langInstruction(lang: DetectedLang): string {
  switch (lang) {
    case "es":
      return "IMPORTANT: The user wrote in Spanish. You MUST respond entirely in Spanish. Do not mix languages.";
    case "en":
      return "IMPORTANT: The user wrote in English. You MUST respond entirely in English. Do not mix languages.";
    default:
      return "IMPORTANT: Respond in the same language the user used. Do not mix languages within a single response.";
  }
}
