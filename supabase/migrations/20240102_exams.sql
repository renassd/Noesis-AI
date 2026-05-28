-- Exams table: stores generated exams, user answers, and grades
CREATE TABLE IF NOT EXISTS exams (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL,
  exam_type   TEXT        NOT NULL CHECK (exam_type IN ('mcq', 'written', 'mixed')),
  questions   JSONB       NOT NULL DEFAULT '[]',
  answers     JSONB       NOT NULL DEFAULT '{}',
  grades      JSONB       NOT NULL DEFAULT '{}',
  score       INTEGER     CHECK (score >= 0 AND score <= 100),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE exams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own exams"
  ON exams FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS exams_user_id_idx ON exams (user_id, created_at DESC);
