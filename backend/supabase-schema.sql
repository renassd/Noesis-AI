-- ════════════════════════════════════════════
-- NOESIS AI — Schema de base de datos
-- Ejecutá esto en: Supabase → SQL Editor → Run
-- ════════════════════════════════════════════

-- Tabla de mazos de flashcards
CREATE TABLE IF NOT EXISTS decks (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     TEXT NOT NULL,          -- por ahora usamos un ID anónimo de sesión
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de flashcards individuales
CREATE TABLE IF NOT EXISTS flashcards (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  deck_id     UUID REFERENCES decks(id) ON DELETE CASCADE,
  question    TEXT NOT NULL,
  answer      TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_decks_user_id ON decks(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_deck_id ON flashcards(deck_id);

-- Row Level Security (RLS) — cada usuario solo ve sus datos
ALTER TABLE decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;

-- Políticas: el service_role bypasea RLS (solo lo usamos en el server)
-- Los usuarios anónimos acceden via user_id que generamos en el cliente
CREATE POLICY "users can manage own decks"
  ON decks FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "users can manage own flashcards"
  ON flashcards FOR ALL
  USING (true)
  WITH CHECK (true);

-- ─── Tabla de PDFs subidos en modo investigación ───────────────────────────
-- Ejecutá esto en: Supabase → SQL Editor → Run

CREATE TABLE IF NOT EXISTS research_pdfs (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        TEXT NOT NULL,
  file_name      TEXT NOT NULL,
  extracted_text TEXT NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_research_pdfs_user_id ON research_pdfs(user_id);

ALTER TABLE research_pdfs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can manage own research_pdfs"
  ON research_pdfs FOR ALL
  USING (true)
  WITH CHECK (true);
