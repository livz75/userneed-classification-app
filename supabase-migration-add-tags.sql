-- ============================================
-- Migration : tags éditoriaux franceinfo sur les articles
-- ============================================
-- Les pages franceinfo exposent leurs tags dans <meta property="article:tag">
-- (ex. « Présidentielle 2027 », « Elections en France »). fetch_articles.py les
-- capte au scraping ; backfill_tags.py remplit les articles déjà en base.
-- Index GIN : filtre `tags && ARRAY[...]` (opérateur « overlaps » de PostgREST).

ALTER TABLE articles ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_articles_tags ON articles USING GIN (tags);
