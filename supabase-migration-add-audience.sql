-- ============================================
-- Migration : audience Piano des articles (tableau de bord Présidentielle 2027)
-- ============================================
-- Visites cumulées (web + iOS + Android) depuis le 1er janvier, relevées par
-- server.py dans Piano Analytics lors d'un clic sur « Actualiser » du tableau
-- de bord. Table distincte de article_metrics (alimentée par App_Dashboard).

CREATE TABLE IF NOT EXISTS article_audience (
    article_id    uuid PRIMARY KEY REFERENCES articles(id) ON DELETE CASCADE,
    visites       bigint NOT NULL DEFAULT 0,
    source        text NOT NULL DEFAULT 'piano',
    periode_debut date NOT NULL,
    periode_fin   date NOT NULL,
    updated_at    timestamptz DEFAULT now()
);

-- Même politique que les autres tables : pas d'auth, la clé anon lit/écrit
ALTER TABLE article_audience ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on article_audience" ON article_audience
    FOR ALL USING (true) WITH CHECK (true);
