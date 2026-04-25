// Core Memory Bank service — server-side only.
// Handles storing, searching, and formatting memories for AI context injection.

import { getSupabaseAdmin } from "./supabase";
import { embedDocument, embedQuery } from "./embeddings";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type MemoryType = "concept" | "summary" | "insight" | "qa" | "note";
export type MemorySourceType = "pdf" | "tutor" | "flashcard" | "research" | "manual";

export interface MemoryEntry {
  user_id: string;
  content: string;
  summary: string;
  type: MemoryType;
  topic?: string;
  tags?: string[];
  source_type?: MemorySourceType;
  source_id?: string;
  source_label?: string;
  importance?: number;
  metadata?: Record<string, unknown>;
}

export interface MemorySearchResult {
  id: string;
  summary: string;
  content: string;
  type: string;
  topic?: string;
  tags: string[];
  importance: number;
  similarity: number;
  source_label?: string;
  created_at: string;
}

export interface MemorySettings {
  memory_enabled: boolean;
  auto_extract: boolean;
  max_context_entries: number;
}

// ─────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────

export async function storeMemory(entry: MemoryEntry): Promise<string | null> {
  const db = getSupabaseAdmin();
  const embeddingText = `${entry.summary}\n\n${entry.content}`;
  const embedding = await embedDocument(embeddingText);

  const { data, error } = await db
    .from("memory_entries")
    .insert({
      ...entry,
      tags: entry.tags ?? [],
      importance: entry.importance ?? 0.5,
      // pgvector expects a plain JSON array string
      embedding: embedding ? JSON.stringify(embedding) : null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[memory] storeMemory failed", error.message);
    return null;
  }

  return data.id as string;
}

// ─────────────────────────────────────────────
// Search
// ─────────────────────────────────────────────

export async function searchMemories(
  userId: string,
  query: string,
  limit = 5,
): Promise<MemorySearchResult[]> {
  const db = getSupabaseAdmin();
  const queryEmbedding = await embedQuery(query);

  if (queryEmbedding) {
    const { data, error } = await db.rpc("search_memories", {
      p_user_id: userId,
      p_query_embedding: JSON.stringify(queryEmbedding),
      p_limit: limit,
      p_threshold: 0.45,
    });

    if (!error && data && (data as unknown[]).length > 0) {
      const results = data as MemorySearchResult[];
      // Async fire-and-forget: bump access counters
      void db.rpc("increment_memory_access", { p_ids: results.map((r) => r.id) });
      return results;
    }
  }

  // Keyword fallback
  const shortQuery = query.split(/\s+/).slice(0, 6).join(" ");
  const { data, error } = await db.rpc("search_memories_keyword", {
    p_user_id: userId,
    p_query: shortQuery,
    p_limit: limit,
  });

  if (error || !data) return [];

  const results = data as MemorySearchResult[];
  if (results.length > 0) {
    void db.rpc("increment_memory_access", { p_ids: results.map((r) => r.id) });
  }
  return results;
}

// ─────────────────────────────────────────────
// Settings
// ─────────────────────────────────────────────

const DEFAULT_SETTINGS: MemorySettings = {
  memory_enabled: true,
  auto_extract: true,
  max_context_entries: 5,
};

export async function getMemorySettings(userId: string): Promise<MemorySettings> {
  const db = getSupabaseAdmin();
  const { data } = await db
    .from("memory_settings")
    .select("memory_enabled, auto_extract, max_context_entries")
    .eq("user_id", userId)
    .single();

  return (data as MemorySettings | null) ?? DEFAULT_SETTINGS;
}

// ─────────────────────────────────────────────
// Context formatting
// ─────────────────────────────────────────────

/**
 * Formats retrieved memories into an XML block that Claude can parse easily.
 * Kept short (≤ 1 400 chars total) so it doesn't eat the token budget.
 */
export function formatMemoriesForContext(memories: MemorySearchResult[]): string {
  if (memories.length === 0) return "";

  const items = memories.map((m, i) => {
    const label = m.topic ? ` (${m.topic})` : "";
    const body = m.content.length > 280 ? m.content.slice(0, 280) + "…" : m.content;
    return `[${i + 1}] ${m.summary}${label}\n${body}`;
  });

  return `<user_memory>
The following are relevant concepts this user has previously studied. Use them to personalise your response where appropriate, but do not quote them verbatim.

${items.join("\n\n")}
</user_memory>`;
}

// ─────────────────────────────────────────────
// Auto-extraction via Claude Haiku
// ─────────────────────────────────────────────

const EXTRACTION_PROMPT = `Extract 2–5 key learning insights from the content below that are worth storing long-term.

Return ONLY a JSON array — no prose before or after:
[
  {
    "summary": "1–2 sentence title of the concept",
    "content": "Concise explanation (2–4 sentences)",
    "type": "concept|summary|insight|qa",
    "topic": "Subject area (e.g. 'Cell Biology')",
    "tags": ["tag1", "tag2"],
    "importance": <float 0.1–1.0>
  }
]

Only include genuinely important, stand-alone concepts. Skip trivial or too-specific details.

Content:
`;

export async function extractAndStoreMemories(
  userId: string,
  content: string,
  sourceType: MemorySourceType,
  sourceLabel: string,
  anthropicApiKey: string,
): Promise<void> {
  if (content.length < 120) return;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        // Always use Haiku for extraction — cheap, fast, perfectly capable
        model: "claude-3-5-haiku-20241022",
        max_tokens: 1000,
        messages: [
          {
            role: "user",
            content: EXTRACTION_PROMPT + content.slice(0, 4000),
          },
        ],
      }),
    });

    if (!res.ok) return;

    const data = (await res.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };
    const raw = data.content?.find((b) => b.type === "text")?.text ?? "";
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return;

    const entries = JSON.parse(jsonMatch[0]) as Array<{
      summary: string;
      content: string;
      type: MemoryType;
      topic?: string;
      tags?: string[];
      importance?: number;
    }>;

    await Promise.all(
      entries.map((e) =>
        storeMemory({
          user_id: userId,
          summary: e.summary,
          content: e.content,
          type: e.type ?? "concept",
          topic: e.topic,
          tags: e.tags ?? [],
          importance: e.importance ?? 0.5,
          source_type: sourceType,
          source_label: sourceLabel,
        }),
      ),
    );
  } catch (err) {
    console.error("[memory] extractAndStoreMemories failed", err);
  }
}
