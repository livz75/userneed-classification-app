-- ============================================================================
-- Migration : renommage des 4 user needs
-- Date      : 2026-05-13
-- ============================================================================
-- Mapping :
--   REVEAL NEWS              -> VERIFY
--   MAKE ME FEEL THE NEWS    -> FEEL
--   GIVE ME A BREAK          -> DIVERT ME
--   GIVE ME CONCERNING NEWS  -> GUIDE ME
--
-- Tables impactées :
--   - human_classifications (colonne userneed, sous CHECK constraint -> doit
--     etre droppe puis recree avec les nouvelles valeurs)
--   - ai_analyses (colonne predicted_userneed, pas de CHECK, mais on migre
--     pour rester coherent dans les stats et graphiques)
--
-- Pour appliquer : ouvrir le SQL Editor Supabase, coller ce fichier,
-- executer. La migration est transactionnelle : si une etape echoue, rien
-- n'est applique. L'execution est idempotente (rejouable sans effet).
-- ============================================================================

BEGIN;

-- 1. Drop l'ancien CHECK constraint sur human_classifications.userneed
ALTER TABLE human_classifications
  DROP CONSTRAINT IF EXISTS human_classifications_userneed_check;

-- 2. Migrer les valeurs dans human_classifications
UPDATE human_classifications SET userneed = 'VERIFY'    WHERE userneed = 'REVEAL NEWS';
UPDATE human_classifications SET userneed = 'FEEL'      WHERE userneed = 'MAKE ME FEEL THE NEWS';
UPDATE human_classifications SET userneed = 'DIVERT ME' WHERE userneed = 'GIVE ME A BREAK';
UPDATE human_classifications SET userneed = 'GUIDE ME'  WHERE userneed = 'GIVE ME CONCERNING NEWS';

-- 3. Migrer les valeurs dans ai_analyses (pas de CHECK constraint dessus)
UPDATE ai_analyses SET predicted_userneed = 'VERIFY'    WHERE predicted_userneed = 'REVEAL NEWS';
UPDATE ai_analyses SET predicted_userneed = 'FEEL'      WHERE predicted_userneed = 'MAKE ME FEEL THE NEWS';
UPDATE ai_analyses SET predicted_userneed = 'DIVERT ME' WHERE predicted_userneed = 'GIVE ME A BREAK';
UPDATE ai_analyses SET predicted_userneed = 'GUIDE ME'  WHERE predicted_userneed = 'GIVE ME CONCERNING NEWS';

-- 4. Recreer le CHECK constraint avec les nouvelles valeurs
ALTER TABLE human_classifications
  ADD CONSTRAINT human_classifications_userneed_check
  CHECK (userneed IN (
    'UPDATE ME', 'EXPLAIN ME', 'GIVE ME PERSPECTIVE', 'DIVERT ME',
    'GUIDE ME', 'INSPIRE ME', 'FEEL', 'VERIFY'
  ));

-- 5. Verification (lecture seule, n'echoue pas mais affiche le decompte)
SELECT userneed, COUNT(*) AS nb FROM human_classifications GROUP BY userneed ORDER BY userneed;

COMMIT;
