-- ============================================
-- SCHEMA SUPABASE - App Qualif User Needs v2
-- À exécuter dans le SQL Editor de Supabase
-- ============================================

-- Table: articles
-- Articles récupérés depuis l'API franceinfo
CREATE TABLE articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT UNIQUE,
  url TEXT,
  titre TEXT NOT NULL,
  chapo TEXT,
  corps TEXT,
  auteur TEXT,
  path TEXT,
  word_count INTEGER,
  date_publication TIMESTAMPTZ,
  date_modification TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  fetched_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_articles_external_id ON articles(external_id);
CREATE INDEX idx_articles_fetched_at ON articles(fetched_at DESC);
CREATE INDEX idx_articles_date_pub ON articles(date_publication DESC);

-- Table: human_classifications
-- Classifications humaines (1 par article par utilisateur)
CREATE TABLE human_classifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  userneed TEXT NOT NULL CHECK (userneed IN (
    'UPDATE ME', 'EXPLAIN ME', 'GIVE ME PERSPECTIVE', 'GIVE ME A BREAK',
    'GIVE ME CONCERNING NEWS', 'INSPIRE ME', 'MAKE ME FEEL THE NEWS', 'REVEAL NEWS'
  )),
  classified_by TEXT DEFAULT 'anonymous',
  classified_at TIMESTAMPTZ DEFAULT now(),
  notes TEXT,
  UNIQUE(article_id, classified_by)
);

CREATE INDEX idx_human_class_article ON human_classifications(article_id);
CREATE INDEX idx_human_class_userneed ON human_classifications(userneed);

-- Table: prompts
-- Stockage des prompts (migration depuis localStorage)
CREATE TABLE prompts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  content TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT false,
  userneeds JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  modified_at TIMESTAMPTZ DEFAULT now()
);

-- Table: test_runs
-- Chaque exécution d'analyse IA (couple LLM + Prompt)
CREATE TABLE test_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  llm_model TEXT NOT NULL,
  prompt_id TEXT REFERENCES prompts(id),
  prompt_snapshot TEXT,
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'stopped')),
  total_articles INTEGER DEFAULT 0,
  analyzed_articles INTEGER DEFAULT 0,
  concordant_count INTEGER DEFAULT 0,
  concordant_percent NUMERIC(5,2) DEFAULT 0,
  confusion_matrix JSONB DEFAULT '{}',
  statistics JSONB DEFAULT '{}',
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_test_runs_model ON test_runs(llm_model);
CREATE INDEX idx_test_runs_prompt ON test_runs(prompt_id);
CREATE INDEX idx_test_runs_created ON test_runs(created_at DESC);

-- Table: ai_analyses
-- Résultat IA par article par test run
CREATE TABLE ai_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_run_id UUID NOT NULL REFERENCES test_runs(id) ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  predicted_userneed TEXT,
  predictions JSONB,
  justification TEXT,
  is_match BOOLEAN,
  delta NUMERIC(5,1),
  icp NUMERIC(5,1),
  confidence_level TEXT CHECK (confidence_level IN ('HAUTE', 'MOYENNE', 'BASSE')),
  raw_response TEXT,
  analyzed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(test_run_id, article_id)
);

CREATE INDEX idx_ai_analyses_test_run ON ai_analyses(test_run_id);
CREATE INDEX idx_ai_analyses_article ON ai_analyses(article_id);
CREATE INDEX idx_ai_analyses_match ON ai_analyses(is_match);
CREATE INDEX idx_ai_analyses_confidence ON ai_analyses(confidence_level);

-- ============================================
-- DISABLE RLS (pas d'auth pour l'instant)
-- ============================================
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE human_classifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_analyses ENABLE ROW LEVEL SECURITY;

-- Policies permissives pour anon (pas d'auth)
CREATE POLICY "Allow all on articles" ON articles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on human_classifications" ON human_classifications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on prompts" ON prompts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on test_runs" ON test_runs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on ai_analyses" ON ai_analyses FOR ALL USING (true) WITH CHECK (true);
