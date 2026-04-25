-- Memory Bank schema for Neuvra
-- Run this in your Supabase SQL editor.
-- Requires: pgvector extension (available on all Supabase projects)

-- ─────────────────────────────────────────────
-- 1. Enable pgvector
-- ─────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS vector;

-- ─────────────────────────────────────────────
-- 2. Core memory entries table
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS memory_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Content
  content         TEXT NOT NULL,           -- Full memory body
  summary         TEXT NOT NULL,           -- 1-2 sentence title used in UI and context injection
  type            TEXT NOT NULL DEFAULT 'concept',
  --  concept | summary | insight | qa | note

  -- Organisation
  topic           TEXT,                    -- e.g. "Cell Biology", "Macroeconomics"
  tags            TEXT[]  DEFAULT '{}',

  -- Provenance
  source_type     TEXT,                    -- pdf | tutor | flashcard | research | manual
  source_id       TEXT,                    -- ID of originating resource (e.g. research_pdf id)
  source_label    TEXT,                    -- Human-readable label shown in UI

  -- Semantic search (Voyage AI voyage-3-lite → 512 dims)
  embedding       vector(512),

  -- Relevance signals
  importance      FLOAT   DEFAULT 0.5,     -- 0.0–1.0, set during extraction
  access_count    INTEGER DEFAULT 0,       -- incremented on each retrieval
  last_accessed_at TIMESTAMPTZ,

  -- Control
  is_active       BOOLEAN DEFAULT TRUE,    -- soft delete
  memory_enabled  BOOLEAN DEFAULT TRUE,    -- user can mute individual memories

  metadata        JSONB   DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 3. Per-user memory settings
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS memory_settings (
  user_id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  memory_enabled       BOOLEAN DEFAULT TRUE,   -- global on/off toggle
  auto_extract         BOOLEAN DEFAULT TRUE,   -- auto-extract after study events
  max_context_entries  INTEGER DEFAULT 5,      -- max memories injected per AI call
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 4. Indexes
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS memory_entries_user_active_idx
  ON memory_entries (user_id, is_active)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS memory_entries_topic_idx
  ON memory_entries (user_id, topic);

CREATE INDEX IF NOT EXISTS memory_entries_tags_idx
  ON memory_entries USING gin (tags);

-- IVFFlat index for approximate nearest-neighbour search.
-- lists = 100 is a good default for up to ~1 M rows; tune upward as data grows.
CREATE INDEX IF NOT EXISTS memory_entries_embedding_idx
  ON memory_entries USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- ─────────────────────────────────────────────
-- 5. Row-Level Security
-- ─────────────────────────────────────────────
ALTER TABLE memory_entries  ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own memory entries"
  ON memory_entries FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage their own memory settings"
  ON memory_settings FOR ALL USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- 6. updated_at trigger
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER memory_entries_updated_at
  BEFORE UPDATE ON memory_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER memory_settings_updated_at
  BEFORE UPDATE ON memory_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─────────────────────────────────────────────
-- 7. Semantic search function (vector path)
-- ─────────────────────────────────────────────
-- Blends cosine similarity (70%) with stored importance (30%) for ranking.
CREATE OR REPLACE FUNCTION search_memories(
  p_user_id         UUID,
  p_query_embedding vector(512),
  p_limit           INTEGER DEFAULT 5,
  p_threshold       FLOAT   DEFAULT 0.45
)
RETURNS TABLE (
  id            UUID,
  summary       TEXT,
  content       TEXT,
  type          TEXT,
  topic         TEXT,
  tags          TEXT[],
  importance    FLOAT,
  similarity    FLOAT,
  source_label  TEXT,
  created_at    TIMESTAMPTZ
)
LANGUAGE sql STABLE AS $$
  SELECT
    me.id,
    me.summary,
    me.content,
    me.type,
    me.topic,
    me.tags,
    me.importance,
    1 - (me.embedding <=> p_query_embedding)  AS similarity,
    me.source_label,
    me.created_at
  FROM memory_entries me
  WHERE me.user_id       = p_user_id
    AND me.is_active     = TRUE
    AND me.memory_enabled = TRUE
    AND me.embedding     IS NOT NULL
    AND 1 - (me.embedding <=> p_query_embedding) >= p_threshold
  ORDER BY
    (1 - (me.embedding <=> p_query_embedding)) * 0.7
    + me.importance * 0.3 DESC
  LIMIT p_limit;
$$;

-- ─────────────────────────────────────────────
-- 8. Keyword fallback search (no embedding needed)
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION search_memories_keyword(
  p_user_id UUID,
  p_query   TEXT,
  p_limit   INTEGER DEFAULT 5
)
RETURNS TABLE (
  id            UUID,
  summary       TEXT,
  content       TEXT,
  type          TEXT,
  topic         TEXT,
  tags          TEXT[],
  importance    FLOAT,
  similarity    FLOAT,
  source_label  TEXT,
  created_at    TIMESTAMPTZ
)
LANGUAGE sql STABLE AS $$
  SELECT
    me.id,
    me.summary,
    me.content,
    me.type,
    me.topic,
    me.tags,
    me.importance,
    0.0 AS similarity,
    me.source_label,
    me.created_at
  FROM memory_entries me
  WHERE me.user_id       = p_user_id
    AND me.is_active     = TRUE
    AND me.memory_enabled = TRUE
    AND (
      me.content  ILIKE '%' || p_query || '%'
      OR me.summary ILIKE '%' || p_query || '%'
      OR me.topic   ILIKE '%' || p_query || '%'
      OR p_query    = ANY(me.tags)
    )
  ORDER BY me.importance DESC, me.created_at DESC
  LIMIT p_limit;
$$;

-- ─────────────────────────────────────────────
-- 9. Increment access count helper
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION increment_memory_access(p_ids UUID[])
RETURNS void LANGUAGE sql AS $$
  UPDATE memory_entries
  SET access_count     = access_count + 1,
      last_accessed_at = NOW()
  WHERE id = ANY(p_ids);
$$;
