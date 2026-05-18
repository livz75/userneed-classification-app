-- ============================================================================
-- Migration : ajout du 9e user need "SUMMARIZE"
-- Date      : 2026-05-18
-- ============================================================================
-- Cette migration etend le CHECK constraint de la colonne userneed pour
-- accepter une 9e valeur : SUMMARIZE.
--
-- Tables impactees :
--   - human_classifications.userneed (CHECK constraint -> doit etre drop puis
--     recree avec la 9e valeur)
--   - ai_analyses.predicted_userneed : pas de CHECK, rien a changer
--
-- Pour appliquer : ouvrir le SQL Editor Supabase, coller ce fichier, executer.
-- La migration est transactionnelle (BEGIN/COMMIT) et idempotente (rejouable).
-- ============================================================================

BEGIN;

-- 1. Drop l'ancien CHECK constraint (8 valeurs)
ALTER TABLE human_classifications
  DROP CONSTRAINT IF EXISTS human_classifications_userneed_check;

-- 2. Recreer le CHECK constraint avec les 9 valeurs (l'ancienne liste + SUMMARIZE)
ALTER TABLE human_classifications
  ADD CONSTRAINT human_classifications_userneed_check
  CHECK (userneed IN (
    'UPDATE ME', 'EXPLAIN ME', 'GIVE ME PERSPECTIVE', 'DIVERT ME',
    'GUIDE ME', 'INSPIRE ME', 'FEEL', 'VERIFY', 'SUMMARIZE'
  ));

-- 3. Verification (lecture seule, affiche le decompte par userneed)
SELECT userneed, COUNT(*) AS nb
FROM human_classifications
GROUP BY userneed
ORDER BY userneed;

COMMIT;
