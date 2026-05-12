# Application "Analyse IA des Userneeds Franceinfo"

Application web pour évaluer la capacité d'une IA à classifier des articles Franceinfo selon les 8 "User Needs" éditoriaux, et comparer les prédictions IA avec les classifications humaines.

**Version :** 2.1 — Avril 2026
**Stack :** HTML/CSS/JS vanilla · Python · Supabase · OpenRouter
**Déploiement :** Render.com + Hostinger VPS (srv882642.hstgr.cloud) + launchd macOS (cron articles)

---

## Démarrage rapide (développement local)

### 1. Prérequis

- Python 3.9+
- Compte [Supabase](https://supabase.com) (base de données configurée)
- Clé API [OpenRouter](https://openrouter.ai/keys) (`sk-or-...`)

### 2. Configuration

Créez le fichier `config.json` à la racine (non versionné) :

```json
{
  "supabase_url": "https://xxxx.supabase.co",
  "supabase_anon_key": "eyJ... ou sb_publishable_...",
  "openrouter_api_key": "sk-or-..."
}
```

> ⚠️ Ce fichier est dans `.gitignore`. Ne le committez jamais. La clé Supabase peut être au format JWT classique (`eyJ...`) ou au nouveau format `sb_publishable_...`.

### 3. Démarrer le serveur

```bash
cd "/Users/livioricci/Documents/FRANCETV/App qualif user needs"
python3 server.py
```

Ouvrir l'application : [http://localhost:8000](http://localhost:8000)

Arrêter : `Ctrl + C`

### 4. Démarrer l'import automatique des articles

Le script tourne via launchd (macOS) toutes les 30 minutes. Pour le lancer manuellement :

```bash
python3 fetch_articles.py              # tous les feeds + scraping
python3 fetch_articles.py --feed monde # un seul feed
python3 fetch_articles.py --no-scrape  # sans scraping du corps
python3 fetch_articles.py --update-metadata  # backfill media_type articles existants
```

---

## Structure du projet

```
.
├── index.html                  # Interface principale (SPA)
├── style.css                   # Styles (thème sombre)
├── script.js                   # Logique UI et analyse IA
├── server.py                   # Serveur proxy Python (local + Render + Hostinger)
├── fetch_articles.py           # Import RSS + scraping articles
├── deploy.sh                   # Script de déploiement auto (Hostinger cron)
├── config.json                 # Configuration locale (non versionné)
│
├── js/
│   ├── supabase-client.js      # Initialisation client Supabase
│   ├── article-manager.js      # Lecture articles depuis Supabase
│   ├── classification-manager.js  # CRUD classifications humaines
│   └── test-run-manager.js     # Gestion des test runs et analyses IA
│
├── api/
│   ├── analyze.py              # Handler /api/analyze (déploiement Render)
│   ├── health.py               # Handler /api/health
│   └── index.py                # Handler racine
│
├── assets/
│   └── franceinfo.jpg          # Logo header
│
├── docs/                                # Documentation projet
│   ├── BRIEF_DASHBOARD_ENGAGEMENT_STITCH.md   # Brief dashboard engagement Stitch
│   ├── BRIEF_DESIGN_V2_STITCH.md              # Brief design V2 pour Stitch
│   ├── DOCUMENTATION_POC_TECHNIQUE.md         # Documentation technique détaillée du POC
│   ├── FEUILLE_DE_ROUTE_TECHNIQUE.md          # Feuille de route technique (roadmap)
│   ├── GUIDE_UTILISATEUR.md                   # Guide utilisateur (non technique)
│   ├── PREPARATION_PRESENTATION_RPD_31_MARS.md # Préparation présentation RPD 31 mars
│   ├── PRODUCT_OWNER_METHODOLOGY.md           # Méthodologie Product Owner
│   ├── SPECIFICATIONS_FONCTIONNELLES_PO.md    # Spécifications fonctionnelles PO
│   ├── SPECIFICATIONS_PHASE1_AI_DRIFT_MONITORING.md # Spécifications phase 1 AI drift monitoring
│   └── VISION-PRODUIT_FINAL.md                # Vision produit finale
│
└── README.md                   # Ce fichier
```

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  NAVIGATEUR (HTML/CSS/JS vanilla)                            │
│  - index.html + script.js + js/*.js                         │
│  - Supabase JS SDK (CDN)                                    │
└────────────────────┬─────────────────────────────────────────┘
                     │ fetch() / Supabase JS SDK
        ┌────────────┼────────────┐
        ▼            │            ▼
┌──────────────────┐ │ ┌─────────────────────────┐
│  SERVEUR PROXY   │ │ │  SUPABASE               │
│  Python HTTP     │ │ │  PostgreSQL (cloud)     │
│  server.py       │ │ │  5 tables               │
│                  │ │ │  - articles             │
│  Déployé sur :   │ │ │  - human_classifications │
│  ● Render.com    │ │ │  - prompts              │
│  ● Hostinger VPS │ │ │  - test_runs            │
│    (Traefik)     │ │ │  - ai_analyses          │
│                  │ │ └─────────────────────────┘
│  /api/health     │ │
│  /api/config     │ │            ▲
│  /api/analyze    │ │            │
│  /api/add-article│ │ ┌───────────┴────────────┐
└────────┬─────────┘ │ │  CRON LOCAL (launchd)  │
         │ HTTPS     │ │  fetch_articles.py     │
         ▼           │ │  toutes les 30 min     │
┌──────────────────┐ │ └────────────────────────┘
│  OPENROUTER API  │ │                │
│  27+ modèles LLM │ │      ┌─────────▼──────────┐
│  via 1 clé API   │ │      │  RSS FRANCEINFO    │
└──────────────────┘ │      │  6 feeds publics   │
                     │      └────────────────────┘
  ┌──────────────────┘
  ▼
┌──────────────────────────────────────┐
│  HOSTINGER VPS                       │
│  srv882642.hstgr.cloud              │
│  Traefik reverse proxy → port 8080  │
│  Auto-deploy cron (toutes les 2min) │
│  /opt/userneed-classification-app/  │
└──────────────────────────────────────┘
```

---

## Endpoints API (server.py)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/health` | Vérification de santé — retourne `{ status: "ok", provider, model }` |
| `GET` | `/api/config` | Configuration depuis les variables d'environnement (Render/Hostinger) |
| `POST` | `/api/analyze` | Appel LLM via OpenRouter — body : `{ apiKey, prompt, model }` |
| `POST` | `/api/add-article` | Ajout d'un article par URL — body : `{ url }` |
| `GET` | `/*` | Fichiers statiques (index.html, script.js, style.css, assets/) |

> **Note :** Les endpoints `/api/*` sont exemptés de l'authentification Basic Auth. Seules les pages web (HTML, assets) sont protégées.

### Format de la requête `/api/analyze`

```json
{
  "apiKey": "sk-or-...",
  "model": "anthropic/claude-3.5-haiku",
  "prompt": "[contenu de l'article à analyser]"
}
```

### Format de la réponse `/api/analyze`

```json
{
  "provider": "openrouter",
  "content": "USERNEED PRINCIPAL : UPDATE ME (SCORE : 70)\nJUSTIFICATION : ...",
  "model": "anthropic/claude-3.5-haiku",
  "usage": { "prompt_tokens": 450, "completion_tokens": 80 }
}
```

---

## Base de données Supabase

### Schéma des tables

```sql
articles
  id              UUID PK
  external_id     TEXT UNIQUE     -- ID extrait de l'URL franceinfo (_ID.html)
  titre           TEXT
  chapo           TEXT
  corps           TEXT
  url             TEXT
  path            TEXT            -- Chemin URL (détermine la catégorie)
  word_count      INT
  date_publication TIMESTAMPTZ
  metadata        JSONB           -- { media_type: 'article'|'video'|'autre' }
  created_at      TIMESTAMPTZ

human_classifications
  id              UUID PK
  article_id      UUID FK → articles
  userneed        TEXT            -- Un des 8 User Needs canoniques
  classified_by   TEXT            -- Identifiant utilisateur (défaut: 'anonymous')
  classified_at   TIMESTAMPTZ
  UNIQUE(article_id, classified_by)

prompts
  id              TEXT PK
  name            TEXT
  description     TEXT
  content         TEXT
  is_default      BOOLEAN
  is_active       BOOLEAN
  created_at      TIMESTAMPTZ
  modified_at     TIMESTAMPTZ

test_runs
  id              UUID PK
  name            TEXT
  llm_model       TEXT
  prompt_id       TEXT FK → prompts
  prompt_snapshot TEXT            -- Copie du prompt au moment de l'analyse
  status          TEXT            -- running | completed | stopped
  total_articles  INT
  analyzed_articles INT
  concordant_count  INT
  concordant_percent NUMERIC
  confusion_matrix  JSONB         -- Matrice 8×8
  statistics      JSONB
  started_at      TIMESTAMPTZ
  completed_at    TIMESTAMPTZ

ai_analyses
  id              UUID PK
  test_run_id     UUID FK → test_runs
  article_id      UUID FK → articles
  predicted_userneed TEXT
  predictions     JSONB           -- [{userneed, score, rank, justification} × 3]
  justification   TEXT
  is_match        BOOLEAN         -- Concordance IA / humain
  delta           NUMERIC         -- P1 − P2
  icp             NUMERIC         -- Indice de Confiance Pondéré
  confidence_level TEXT           -- HAUTE | MOYENNE | BASSE
  raw_response    TEXT
  analyzed_at     TIMESTAMPTZ
  UNIQUE(test_run_id, article_id)
```

---

## Import des articles (fetch_articles.py)

### Sources RSS

| Feed | URL |
|------|-----|
| Titres | `https://www.francetvinfo.fr/titres.rss` |
| Politique | `https://www.francetvinfo.fr/politique.rss` |
| Monde | `https://www.francetvinfo.fr/monde.rss` |
| Société | `https://www.francetvinfo.fr/societe.rss` |
| Économie | `https://www.francetvinfo.fr/economie.rss` |
| Culture | `https://www.francetvinfo.fr/culture.rss` |

### Traitement par article

1. **Parse RSS** : titre, chapô, URL, date
2. **Extraction `external_id`** : depuis le pattern `_ID.html` dans l'URL
3. **Extraction `path`** : chemin URL → catégorie éditoriale
4. **Scraping** : téléchargement de la page + extraction JSON-LD (`articleBody`, `@type`)
5. **Normalisation `media_type`** : `VideoObject` → `video`, `NewsArticle`/`Article` → `article`, autres → `autre`
6. **Upsert Supabase** : sur `external_id` (pas de doublon)

### Limitation connue : pas de rattrapage historique

Les flux RSS ne contiennent que les **~20-30 articles les plus récents** à l'instant de la requête. Les articles plus anciens sont remplacés par les nouveaux au fil du temps.

**Conséquence :** si le Mac est éteint pendant 1-2 jours, les articles publiés pendant cette période seront perdus — ils auront déjà été poussés hors des feeds RSS au moment de la prochaine exécution du script. Les feeds les plus actifs (titres, politique) perdent leurs articles en ~12-24h, les moins actifs (économie, culture) en ~2-3 jours.

**Recommandation :** maintenir le cron launchd actif et le Mac allumé pour éviter les trous dans la couverture.

### Configuration launchd (macOS)

Le cron tourne via `~/Library/LaunchAgents/com.francetv.fetch_articles.plist`.

Pour gérer la tâche :
```bash
# Charger (activer)
launchctl load ~/Library/LaunchAgents/com.francetv.fetch_articles.plist

# Décharger (désactiver)
launchctl unload ~/Library/LaunchAgents/com.francetv.fetch_articles.plist

# Forcer un run immédiat
launchctl start com.francetv.fetch_articles
```

---

## Modules JavaScript

### script.js

Fichier principal. Contient :

- `MODELS` : tableau des 27+ modèles LLM avec métadonnées (prix, vitesse, qualité)
- `USERNEEDS` / `USERNEED_VARIANTS` : référentiel et normalisation
- `parseAIResponse()` : parsing de la réponse texte du LLM
- `calculateConfidence()` : calcul Delta et ICP
- `startAnalysis()` : orchestration de l'analyse IA (test run)
- `renderConfusionMatrix()` : génération de la matrice 8×8
- `setConfidenceFilter()` / `setArticleFilter()` / `setCategoryFilter()` / `setMediaTypeFilter()` : filtres UI
- `renderModelPicker()` : rendu du tableau comparatif des modèles
- `generateComparisonSummary()` : analyse IA rédigée après comparaison de 2 test runs
- `exportToExcel()` : génération du fichier `.xlsx` (5 feuilles)

### js/supabase-client.js

- `initSupabase()` : charge `config.json` (local) ou `/api/config` (Render), initialise le client
- `isSupabaseAvailable()` : test de disponibilité

### js/article-manager.js

- `loadFromSupabase(options)` : charge les articles avec filtres optionnels
- `loadClassifiedArticles()` : charge uniquement les articles ayant une classification humaine

### js/classification-manager.js

- `classify(articleId, userneed)` : upsert classification
- `unclassify(articleId)` : suppression classification
- `getStats()` : compteurs classifiés/non classifiés

### js/test-run-manager.js

- `createRun(name, model, promptId, promptSnapshot, totalArticles)` : crée un test run
- `addAnalysis(runId, articleId, result)` : enregistre le résultat d'un article
- `completeRun(runId, stats)` : finalise le test run
- `stopRun(runId, stats)` : arrêt utilisateur
- `listRuns(limit)` : liste des test runs
- `getRunAnalyses(runId)` : analyses d'un test run avec articles et classifications
- `deleteRun(runId)` : suppression (cascade sur `ai_analyses`)

---

## Métriques calculées

### Concordance

- Un article est **concordant** si `predicted_userneed` (rang 1) = `human_classification`
- **Taux de concordance** = concordants / total × 100

### Score de confiance

Pour chaque article, le LLM renvoie P1, P2, P3 (scores dont la somme = 100) :

```
Delta = P1 − P2
ICP   = (Delta / 100) × P1
```

| Niveau | Condition |
|--------|-----------|
| HAUTE | Delta ≥ 30 et ICP ≥ 18 |
| MOYENNE | Delta ≥ 15 et ICP ≥ 7 |
| BASSE | Sinon |

### Précision et Rappel (comparaison de test runs)

Pour chaque User Need `c` :

```
Précision(c) = TP(c) / (TP(c) + FP(c))
Rappel(c)    = TP(c) / (TP(c) + FN(c))
```

- **TP** : prédit `c` ET humain = `c`
- **FP** : prédit `c` MAIS humain ≠ `c`
- **FN** : prédit ≠ `c` MAIS humain = `c`

---

## Déploiement (Render.com)

Le serveur est déployé sur Render en tant que **Web Service Python**.

URL : https://userneed-classification-app.onrender.com/

Variables d'environnement à configurer dans Render :

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | URL du projet Supabase |
| `SUPABASE_ANON_KEY` | Clé publique Supabase |
| `OPENROUTER_API_KEY` | Clé API OpenRouter |
| `PORT` | Port d'écoute (Render le gère automatiquement) |
| `BASIC_AUTH_USER` | Identifiant pour l'authentification Basic Auth |
| `BASIC_AUTH_PASSWORD` | Mot de passe pour l'authentification Basic Auth |
| `DEFAULT_MODEL` | Modèle LLM par défaut (ex: `anthropic/claude-sonnet-4.6`) |
| `FRANCEINFO_PROXY_URL` | URL du proxy pour le scraping d'articles Franceinfo |

Le frontend est servi statiquement par `server.py` (fichiers `index.html`, `style.css`, `script.js`, `js/`, `assets/`).

---

## Déploiement (Hostinger VPS)

L'application est également déployée sur un VPS Hostinger, accessible via HTTPS grâce à Traefik.

URL : https://srv882642.hstgr.cloud

### Informations de connexion

| Paramètre | Valeur |
|-----------|--------|
| SSH | `root@93.127.202.170` |
| Répertoire | `/opt/userneed-classification-app/` |
| Config | `/opt/userneed-classification-app/config.json` |
| Reverse proxy | Traefik (HTTPS automatique) |
| Port applicatif | 8080 |

### Auto-deploy

Un cron tourne toutes les 2 minutes et exécute le script de déploiement :

```
*/2 * * * * /opt/userneed-classification-app/deploy.sh >> /var/log/userneed-deploy.log 2>&1
```

Le script `deploy.sh` effectue un `git pull` et redémarre le serveur si des changements sont détectés.

Logs : `/var/log/userneed-deploy.log`

### Redémarrage manuel

```bash
kill $(pgrep -f server.py); nohup python3 server.py > /dev/null 2>&1 &
```

### Basic Auth

Les variables `BASIC_AUTH_USER` et `BASIC_AUTH_PASSWORD` sont définies dans `/opt/userneed-classification-app/config.json`. Les endpoints `/api/*` sont exemptés de l'authentification pour permettre les appels programmatiques.

---

## Dépannage

### Le serveur ne démarre pas

```bash
# Vérifier si le port est déjà occupé
lsof -i :8000

# Tuer le processus
kill -9 <PID>

# Redémarrer
python3 server.py
```

### Supabase non accessible

Vérifier que `config.json` contient les bonnes valeurs `supabase_url` et `supabase_anon_key`. Tester dans la console navigateur (F12) : la présence d'erreurs Supabase indique une mauvaise configuration.

### Clé API invalide (401)

Vérifier la clé OpenRouter dans le panneau LLM de l'interface. Obtenir une nouvelle clé sur [openrouter.ai/keys](https://openrouter.ai/keys).

### Quota dépassé (429)

Attendre quelques minutes ou consulter les limites du plan OpenRouter.

### Aucun article en base

Lancer manuellement le script d'import :
```bash
python3 fetch_articles.py
```

Vérifier dans les logs que le scraping fonctionne. En cas d'échec systématique, franceinfo a peut-être modifié la structure de ses pages.

---

## Fonctionnalités principales

- **27+ modèles LLM** disponibles via OpenRouter (Claude Opus 4.6, Sonnet 4.6, GPT-5.4, Gemini 3.1 Pro, Llama, Mistral, etc.)
- **Ajout d'article par URL** : coller une URL Franceinfo pour ajouter un article au corpus
- **Ordre de priorité d'analyse** : EXPLAIN ME > UPDATE ME > GIVE ME PERSPECTIVE > autres User Needs
- **Bandeau de configuration** affichant le modèle LLM et le prompt utilisés pendant l'analyse
- **Scatter plot interactif** avec 3 filtres (modèle, prompt, volume)
- **Trophée unique** par User Need avec tie-break par concordance
- **Pagination** pour 3000+ articles (contournement de la limite Supabase de 1000 lignes)
- **Comparaison de Test Runs** avec métriques Précision / Rappel et analyse IA rédigée
- **Matrice de confusion** interactive 8x8
- **Export Excel** multi-feuilles (.xlsx)
- **Déploiement dual** Render.com + Hostinger VPS avec auto-deploy

---

## Sécurité

| Point | État |
|-------|------|
| `config.json` | Dans `.gitignore`, jamais versionné |
| Clé OpenRouter | Côté serveur uniquement (pas exposée au navigateur) |
| Basic Auth | Protège les pages web (`BASIC_AUTH_USER` / `BASIC_AUTH_PASSWORD`). Les endpoints `/api/*` sont exemptés. |
| Supabase RLS | Activé — politiques permissives (POC interne) |
| CORS | `Access-Control-Allow-Origin: *` (à restreindre en production) |

---

## Changelog

### v2.1 — Avril 2026
- Déploiement dual : ajout d'Hostinger VPS (srv882642.hstgr.cloud) avec Traefik et auto-deploy cron
- Extension à 27+ modèles LLM (ajout Claude Opus 4.6, Sonnet 4.6, GPT-5.4, Gemini 3.1 Pro, etc.)
- Ajout d'articles par URL (endpoint `/api/add-article` + zone de saisie dans l'UI)
- Authentification Basic Auth sur les pages web (endpoints `/api/*` exemptés)
- Ordre de priorité d'analyse : EXPLAIN ME > UPDATE ME > GIVE ME PERSPECTIVE > autres
- Bandeau de configuration affichant le modèle LLM et le prompt pendant l'analyse
- Scatter plot avec 3 filtres (modèle, prompt, volume)
- Trophée unique par User Need avec tie-break par concordance
- Pagination pour 3000+ articles (au-delà de la limite Supabase de 1000 lignes)
- Ajout du dossier `docs/` regroupant toute la documentation projet (10 fichiers)
- Timer d'analyse et corrections de layout

### v2.0 — Mars 2026
- Migration vers Supabase (base de données cloud) — suppression de l'import Excel
- Import automatique d'articles via RSS + scraping JSON-LD (6 feeds Franceinfo)
- Extraction du type de média (`media_type`) depuis le JSON-LD
- Filtre par catégorie et par type de média dans la liste d'articles
- Système de Test Runs : chaque analyse est enregistrée et consultable
- Comparaison de 2 Test Runs avec métriques Précision / Rappel
- Analyse IA rédigée en conclusion de la comparaison (Claude 3.5 Sonnet)
- Tableau comparatif de modèles LLM avec prix et estimation de coût
- Déploiement sur Render.com

### v1.1 — Février 2026
- Multi-fournisseurs LLM via OpenRouter
- Gestion des prompts (CRUD, import/export JSON)
- Health check automatique au démarrage
- Messages d'erreur détaillés

### v1.0 — Février 2026
- Analyse IA sur fichier Excel (classification humaine en colonne)
- Matrice de confusion interactive
- Export Excel multi-feuilles
- Thème sombre

---

© 2026 France Télévisions — Usage interne uniquement
