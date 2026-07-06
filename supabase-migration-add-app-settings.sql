-- Migration : table de réglages applicatifs (clé/valeur)
-- Sert notamment de kill-switch pour l'import automatique des articles
-- (cron fetch_articles.py), basculable via le bouton "Import" dans l'app.

CREATE TABLE IF NOT EXISTS app_settings (
    key        text PRIMARY KEY,
    value      text NOT NULL,
    updated_at timestamptz DEFAULT now()
);

-- Même politique que les autres tables : pas d'auth, la clé anon lit/écrit
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on app_settings" ON app_settings
    FOR ALL USING (true) WITH CHECK (true);

-- Import mis EN PAUSE par défaut (problème de quota Supabase).
-- Réactivable via le bouton "Import" dans l'app, ou :
--   UPDATE app_settings SET value = 'true' WHERE key = 'import_enabled';
INSERT INTO app_settings (key, value) VALUES ('import_enabled', 'false')
    ON CONFLICT (key) DO NOTHING;
