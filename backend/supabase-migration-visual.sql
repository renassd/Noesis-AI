-- MIGRATION: add visual column to flashcards
-- Run in Supabase SQL Editor

ALTER TABLE flashcards
  ADD COLUMN IF NOT EXISTS visual JSONB DEFAULT NULL;

-- Optional index if you later query inside the JSON structure often.
-- CREATE INDEX IF NOT EXISTS idx_flashcards_visual ON flashcards USING gin(visual);

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'flashcards'
ORDER BY ordinal_position;
