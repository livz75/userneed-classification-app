# Brief dev — App "Analyse IA des User Needs"

Document d'onboarding pour un dev qui découvre le projet. Tout ce qu'il faut pour être opérationnel en moins d'une heure.

---

## 1. C'est quoi en une phrase

Une app web qui demande à un LLM (via OpenRouter) de classifier des articles Franceinfo selon 8 "User Needs" éditoriaux, puis compare ses prédictions à la classification humaine pour mesurer la concordance.

**Public** : équipe éditoriale Franceinfo (POC interne).
**Objectif POC** : déterminer si un LLM peut fiabiliser/automatiser la qualification User Needs.

---

## 2. Les 8 User Needs

Référentiel canonique défini dans [`script.js`](../script.js) :

```
UPDATE ME · KEEP ME ON TREND · GIVE ME PERSPECTIVE · EDUCATE ME
INSPIRE ME · DIVERT ME · EXPLAIN ME · CONNECT ME
```

Chaque article = **un seul** User Need principal (rang 1) + 2 secondaires (rang 2 et 3) avec un score de probabilité (somme = 100).

---

## 3. Stack en un coup d'œil

| Couche | Techno |
|---|---|
| Frontend | HTML / CSS / **JS vanilla** (pas de framework) |
| Backend proxy | **Python 3** (`http.server` standard, pas de Flask/FastAPI) |
| Base de données | **Supabase** (Postgres managé) |
| LLM | **OpenRouter** (1 clé → 27+ modèles : Claude, GPT, Gemini, Llama…) |
| Scraping articles | Python (`feedparser` + `requests` + JSON-LD) |
| Hébergement | **Render** (auto-deploy GitHub) + **Hostinger VPS** (Traefik + cron) |
| Cron local | **launchd macOS** (fetch RSS toutes les 30 min) |

Pas de build step. Pas de bundler. Édition directe des fichiers `.js` / `.css`.

---

## 4. Architecture

```
                   ┌──────────────────┐
                   │  NAVIGATEUR      │
                   │  index.html +    │
                   │  script.js +     │
                   │  js/*.js         │
                   └────────┬─────────┘
            ┌───────────────┼──────────────────┐
            │ (Supabase JS) │ (fetch /api/*)   │
            ▼               ▼                  ▼
   ┌────────────────┐  ┌──────────────┐  ┌──────────────┐
   │ SUPABASE       │  │ server.py    │  │ /api/analyze │
   │ (5 tables)     │  │ proxy HTTP   │──┤ → OpenRouter │
   └────────────────┘  └──────────────┘  └──────────────┘
            ▲
            │ INSERT articles
   ┌────────┴────────┐
   │ fetch_articles  │  cron launchd toutes les 30 min
   │ RSS Franceinfo  │  (6 feeds + scraping JSON-LD)
   └─────────────────┘
```

**À retenir** :
- Le frontend parle directement à Supabase (lecture/écriture classifications, runs).
- Le backend `server.py` ne sert que de **proxy LLM** (pour cacher la clé OpenRouter) + sert les fichiers statiques.
- L'import des articles est totalement découplé : un script Python qui tourne en cron et écrit dans Supabase.

---

## 5. Fichiers clés

### Backend
| Fichier | Rôle |
|---|---|
| [`server.py`](../server.py) | Proxy HTTP : sert le statique + endpoints `/api/*`. Basic Auth sur les pages, exempté pour `/api/*`. |
| [`fetch_articles.py`](../fetch_articles.py) | Importe les articles via RSS + scraping. Lancé par launchd toutes les 30 min. |
| [`api/analyze.py`](../api/analyze.py), [`health.py`](../api/health.py), [`index.py`](../api/index.py) | Variantes des handlers utilisées sur Render. |

### Frontend
| Fichier | Rôle |
|---|---|
| [`index.html`](../index.html) | SPA monolithique (530 lignes). |
| [`script.js`](../script.js) | **Cœur de l'app** (5168 lignes) : modèles LLM, parsing IA, calcul confiance, scatter plot, matrice, comparaison de runs, export Excel. |
| [`js/supabase-client.js`](../js/supabase-client.js) | Init Supabase (config locale ou `/api/config`). |
| [`js/article-manager.js`](../js/article-manager.js) | Lecture articles + pagination (au-delà des 1000 lignes Supabase). |
| [`js/classification-manager.js`](../js/classification-manager.js) | CRUD classifications humaines. |
| [`js/test-run-manager.js`](../js/test-run-manager.js) | Cycle de vie d'un test run (création, ajout d'analyses, finalisation). |

### Config
| Fichier | Rôle |
|---|---|
| `config.json` | **Non versionné** (`.gitignore`). Contient `supabase_url`, `supabase_anon_key`, `openrouter_api_key`. |
| `config.json.example` | Template à recopier pour le local. |
| [`render.yaml`](../render.yaml) | Config Render. |
| [`requirements.txt`](../requirements.txt) | Deps Python. |

---

## 6. Schéma Supabase (5 tables)

```sql
articles                       -- Articles importés (RSS + scraping)
  external_id (UNIQUE)         -- ID extrait de l'URL Franceinfo
  titre, chapo, corps, url, path
  date_publication
  metadata (JSONB)             -- { media_type: 'article'|'video'|'autre' }

human_classifications          -- Vérité terrain (saisie humaine)
  article_id FK
  userneed                     -- Un des 8 canoniques
  classified_by                -- Qui a classifié (défaut: 'anonymous')
  UNIQUE(article_id, classified_by)

prompts                        -- Prompts versionnés
  id (TEXT), name, content
  is_default, is_active

test_runs                      -- Une "session" d'analyse IA
  llm_model, prompt_id, prompt_snapshot
  status (running|completed|stopped)
  total_articles, analyzed_articles
  concordant_count, concordant_percent
  confusion_matrix (JSONB)     -- 8×8

ai_analyses                    -- Une prédiction IA par article par run
  test_run_id FK, article_id FK
  predicted_userneed
  predictions (JSONB)          -- [{userneed, score, rank, justif} × 3]
  is_match (BOOLEAN)
  delta, icp                   -- Score de confiance
  confidence_level             -- HAUTE | MOYENNE | BASSE
  UNIQUE(test_run_id, article_id)
```

Schéma complet : [`supabase-schema.sql`](../supabase-schema.sql).

---

## 7. Endpoints API (`server.py`)

| Méthode | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/health` | non | Healthcheck |
| GET | `/api/config` | non | Renvoie config Supabase (depuis env vars sur Render/Hostinger) |
| POST | `/api/analyze` | non | **Cœur LLM** — body : `{ apiKey, model, prompt }` → OpenRouter |
| POST | `/api/add-article` | non | Ajout d'un article par URL Franceinfo |
| GET | `/*` | **Basic Auth** | Statique (HTML, CSS, JS, assets) |

Note : les `/api/*` sont **exemptés** de Basic Auth pour permettre les appels JS depuis le navigateur après login.

---

## 8. Métriques calculées

### Concordance
- Article concordant si `predicted_userneed` (rang 1) = `human_classification`
- Taux = concordants / total × 100

### Score de confiance (par article)
Le LLM renvoie P1, P2, P3 avec `P1 + P2 + P3 = 100`.

```
Delta = P1 − P2
ICP   = (Delta / 100) × P1
```

| Niveau | Condition |
|---|---|
| HAUTE | Delta ≥ 30 ET ICP ≥ 18 |
| MOYENNE | Delta ≥ 15 ET ICP ≥ 7 |
| BASSE | sinon |

### Précision / Rappel (comparaison de runs)
Calculées par User Need pour comparer 2 test runs (modèle A vs B, prompt v1 vs v2…).

---

## 9. Démarrage local (5 min)

```bash
# 1. Cloner et installer
cd "App qualif user needs"
pip3 install -r requirements.txt

# 2. Config
cp config.json.example config.json
# → éditer avec les vraies clés Supabase + OpenRouter

# 3. Lancer
python3 server.py
# → http://localhost:8000
```

Pour tester l'import RSS sans attendre le cron :
```bash
python3 fetch_articles.py             # tous les feeds
python3 fetch_articles.py --feed monde
python3 fetch_articles.py --no-scrape # plus rapide pour debug
```

---

## 10. Déploiement (dual)

### Render (prod principale)
- URL : `https://userneed-classification-app-1.onrender.com`
- **Auto-deploy** sur push `main` → GitHub
- Vars d'env : `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `OPENROUTER_API_KEY`, `BASIC_AUTH_USER`, `BASIC_AUTH_PASSWORD`, `DEFAULT_MODEL`

### Hostinger VPS (prod secondaire)
- URL : `https://srv882642.hstgr.cloud`
- SSH : `root@93.127.202.170` — répertoire `/opt/userneed-classification-app/`
- Traefik (Docker) reverse proxy → port 8080
- **Auto-deploy** : cron `*/2 * * * *` exécute `deploy.sh` (git pull + restart si diff)
- Logs : `/var/log/userneed-deploy.log`
- ⚠️ `config.json` est local au VPS (pas en git) — le mettre à jour manuellement par SSH

Redémarrage manuel :
```bash
kill $(pgrep -f server.py); nohup python3 server.py > /dev/null 2>&1 &
```

---

## 11. Crons actifs

| Cron | Fréquence | Où | Quoi |
|---|---|---|---|
| `com.francetv.fetch_articles` (launchd) | 30 min | Mac local | Import RSS Franceinfo + scraping |
| backup classifications | 1×/jour à 17h | Mac local (crontab) | Dump des classifications humaines vers `backups/` |
| auto-deploy Hostinger | 2 min | VPS | `git pull` + restart si changement |

Logs :
- Local fetch : `fetch_articles.log` (racine projet)
- Local backup : `backups/cron.log`
- VPS deploy : `/var/log/userneed-deploy.log`

---

## 12. Points d'attention / pièges connus

- **Pas de rattrapage RSS** : les feeds Franceinfo n'exposent que les ~20-30 derniers articles. Si le Mac est éteint 2 jours, ces articles sont perdus définitivement (déjà sortis du flux).
- **Limite Supabase 1000 lignes** : contournée par pagination dans [`article-manager.js`](../js/article-manager.js). Ne pas la retirer.
- **Clé OpenRouter** : envoyée par le frontend dans chaque POST `/api/analyze` (pas lue côté serveur depuis `config.json`). Le serveur fait juste proxy.
- **`config.json` Hostinger** : pas synchronisé via git. À éditer en SSH après chaque rotation de clé.
- **CORS** ouvert (`*`) : OK pour POC interne, à restreindre avant tout passage en prod externe.
- **Supabase RLS** : actif mais avec policies permissives (POC). À durcir si données sensibles.
- **Ordre d'analyse** : EXPLAIN ME → UPDATE ME → GIVE ME PERSPECTIVE → autres (priorité métier, voir [`script.js`](../script.js)).
- **Trophée scatter plot** : un seul gagnant par User Need, tie-break par concordance.

---

## 13. Pour aller plus loin

- Doc technique détaillée : [`DOCUMENTATION_POC_TECHNIQUE.md`](DOCUMENTATION_POC_TECHNIQUE.md)
- Roadmap : [`FEUILLE_DE_ROUTE_TECHNIQUE.md`](FEUILLE_DE_ROUTE_TECHNIQUE.md)
- Vision produit : [`VISION-PRODUIT_FINAL.md`](VISION-PRODUIT_FINAL.md)
- Specs PO : [`SPECIFICATIONS_FONCTIONNELLES_PO.md`](SPECIFICATIONS_FONCTIONNELLES_PO.md)
- Prochaine phase (drift monitoring) : [`SPECIFICATIONS_PHASE1_AI_DRIFT_MONITORING.md`](SPECIFICATIONS_PHASE1_AI_DRIFT_MONITORING.md)

---

## 14. Questions probables d'un dev

> **Pourquoi pas de framework JS ?**
> POC, time-to-market. Le `script.js` a grossi (5k lignes) — un refactor React/Vue est sur la table si l'app passe en prod.

> **Pourquoi `http.server` standard et pas Flask/FastAPI ?**
> Idem POC. Aucune dépendance Python lourde, démarrage instantané. Le proxy fait <400 lignes, pas besoin de plus.

> **Pourquoi Render ET Hostinger ?**
> Render = auto-deploy facile mais cold start. Hostinger = always-on pour les démos.

> **Comment ajouter un modèle LLM ?**
> Ajouter une entrée dans `MODELS` dans [`script.js`](../script.js) (~ligne 112) avec `id` OpenRouter, prix, vitesse, qualité.

> **Comment changer les User Needs ?**
> `USERNEEDS` + `USERNEED_VARIANTS` (normalisation) + `USERNEED_COLORS` dans [`script.js`](../script.js) (~ligne 144). Pense aussi à mettre à jour les prompts.
