-- Tutor sessions table: persists AI tutor chat history per user
CREATE TABLE IF NOT EXISTS tutor_sessions (
  id          TEXT        PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic       TEXT        NOT NULL DEFAULT '',
  messages    JSONB       NOT NULL DEFAULT '[]',
  saved_at    BIGINT      NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE tutor_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own tutor sessions"
  ON tutor_sessions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS tutor_sessions_user_id_idx ON tutor_sessions (user_id, updated_at DESC);
