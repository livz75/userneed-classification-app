# Documentation technique — POC Analyse IA des User Needs Franceinfo

**Destinataire :** Équipe de développement chargée de la mise en production
**Auteur :** Product Owner — Direction de l'Information, France Télévisions
**Date :** Mars 2026
**Statut :** POC fonctionnel — non destiné à la production en l'état

---

## Table des matières

1. [Contexte et objectif](#1-contexte-et-objectif)
2. [Ce que fait l'application](#2-ce-que-fait-lapplication)
3. [Architecture du POC](#3-architecture-du-poc)
4. [Base de données](#4-base-de-données)
5. [Flux de données](#5-flux-de-données)
6. [Métriques et indicateurs calculés](#6-métriques-et-indicateurs-calculés)
7. [Limites du POC](#7-limites-du-poc)
8. [Recommandations pour la production](#8-recommandations-pour-la-production)

---

## 1. Contexte et objectif

France Télévisions classe ses contenus éditoriaux (articles, reportages) selon une grille de **8 "User Needs"** — des catégories qui décrivent le besoin auquel répond un article pour le lecteur. Aujourd'hui, cette classification est réalisée manuellement par les équipes éditoriales.

Ce POC répond à une question centrale :

> **Un modèle de langage (LLM) est-il capable de classer automatiquement des articles franceinfo selon ces 8 User Needs, et dans quelle mesure ses prédictions concordent-elles avec le jugement humain ?**

L'application permet de :
- Constituer un corpus d'articles classifiés manuellement
- Soumettre ce corpus à un ou plusieurs LLM avec un prompt configurable
- Mesurer la concordance IA / humain et visualiser les écarts

---

## 2. Ce que fait l'application

### 2.1 Les 8 User Needs

Le référentiel de classification comporte 8 catégories exclusives :

| User Need | Description |
|-----------|-------------|
| **UPDATE ME** | Tenir informé d'une actualité en cours |
| **EXPLAIN ME** | Comprendre un sujet, un contexte |
| **GIVE ME PERSPECTIVE** | Analyse, mise en recul, opinion |
| **GIVE ME A BREAK** | Contenu léger, divertissant |
| **GIVE ME CONCERNING NEWS** | Alerte, information préoccupante |
| **INSPIRE ME** | Histoire positive, exemple à suivre |
| **MAKE ME FEEL THE NEWS** | Contenu émotionnel, témoignage, immersion |
| **REVEAL NEWS** | Enquête, révélation, information exclusive |

### 2.2 Parcours utilisateur

L'application se déroule en quatre étapes :

**Étape 1 — Alimenter le corpus**
Des articles sont importés depuis les flux RSS publics de franceinfo et stockés en base. L'utilisateur peut consulter la liste des articles disponibles.

**Étape 2 — Classifier manuellement**
Pour chaque article, l'utilisateur choisit l'un des 8 User Needs. Cette classification humaine sert de "vérité terrain" (ground truth) pour évaluer l'IA.

**Étape 3 — Lancer une analyse IA (Test Run)**
L'utilisateur sélectionne un modèle LLM, un prompt, puis déclenche l'analyse sur les articles classifiés. Le LLM prédit un User Need principal, secondaire et tertiaire pour chaque article, avec un score de 0 à 100 pour chacun.

**Étape 4 — Analyser les résultats**
L'application affiche :
- Le taux de concordance global (% d'articles où IA = humain)
- Une matrice de confusion (8×8) pour visualiser les désaccords
- Des statistiques de confiance par article et par catégorie
- Un filtre par niveau de confiance (Haute / Moyenne / Basse)

---

## 3. Architecture du POC

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                             │
│              (HTML / CSS / JavaScript vanilla)              │
│                   Hébergé sur Vercel                        │
└────────────────────────┬────────────────────────────────────┘
                         │ fetch() API calls
           ┌─────────────┴──────────────┐
           │                            │
           ▼                            ▼
┌──────────────────┐         ┌──────────────────────┐
│   SERVEUR PROXY  │         │       SUPABASE        │
│   (Python HTTP)  │         │    (PostgreSQL BaaS)  │
│  Lancé en local  │         │   Hébergé dans le     │
│  python server.py│         │   cloud Supabase      │
└────────┬─────────┘         └──────────────────────┘
         │ HTTPS                        ▲
         ▼                             │
┌──────────────────┐         ┌─────────┴──────────┐
│  OPENROUTER API  │         │  CRON LOCAL (crontab│
│  (passerelle LLM)│         │  fetch_articles.py  │
│  Accès à 200+    │         │  toutes les 30 min) │
│  modèles IA      │         └─────────┬───────────┘
└──────────────────┘                   │
                               ┌───────┴──────────┐
                               │   RSS FRANCEINFO  │
                               │  (6 feeds publics)│
                               └──────────────────┘
```

### 3.1 Frontend (HTML/CSS/JS vanilla)

Un fichier `index.html` unique servi statiquement. Toute la logique est en JavaScript sans framework, organisée en modules :

| Fichier | Rôle |
|---------|------|
| `script.js` | Logique principale : UI, analyse IA, calcul des métriques, gestion des prompts |
| `js/supabase-client.js` | Initialisation du client Supabase et gestion de la configuration |
| `js/article-manager.js` | Lecture des articles depuis Supabase |
| `js/classification-manager.js` | Lecture/écriture des classifications humaines |
| `js/test-run-manager.js` | Création et suivi des test runs, stockage des analyses IA |
| `style.css` | Styles (thème sombre/clair) |

La configuration (clés Supabase, clé OpenRouter) est chargée au démarrage depuis `config.json` (local) ou via l'endpoint `/api/config` (variables d'environnement en production).

### 3.2 Serveur proxy (Python)

`server.py` est un serveur HTTP Python minimaliste qui joue deux rôles :

1. **Serveur de fichiers statiques** : sert `index.html`, `script.js`, `style.css`
2. **Proxy LLM** : expose un endpoint `POST /api/analyze` qui relaye les appels vers OpenRouter, permettant d'effectuer les appels API depuis le backend (où la clé API est sécurisée) plutôt que depuis le navigateur

Le serveur **n'est pas utilisé pour récupérer les articles** — cette responsabilité a été déplacée vers un script cron dédié.

### 3.3 Fournisseur LLM — OpenRouter

L'application passe par **OpenRouter** (`openrouter.ai`), une passerelle qui donne accès à 200+ modèles (Claude, GPT-4, Gemini, Mistral, etc.) avec une seule clé API. Cela permet de comparer facilement les performances de différents LLM sur la même tâche de classification.

Le prompt envoyé au LLM demande systématiquement 3 prédictions ordonnées (principal, secondaire, tertiaire) avec un score cumulant 100.

### 3.4 Récupération des articles — RSS + scraping + cron local

Les articles sont récupérés en deux phases par le script `fetch_articles.py`, qui tourne via une **crontab locale** toutes les 30 minutes.

**Phase 1 — RSS** : agrégation de 6 flux publics franceinfo :

```
https://www.francetvinfo.fr/titres.rss
https://www.francetvinfo.fr/politique.rss
https://www.francetvinfo.fr/monde.rss
https://www.francetvinfo.fr/societe.rss
https://www.francetvinfo.fr/economie.rss
https://www.francetvinfo.fr/culture.rss
```

Chaque feed fournit : titre, chapo, URL, date de publication. Les doublons cross-feeds sont supprimés par `external_id`. Un run typique ramène ~100 articles uniques.

**Phase 2 — Scraping du corps** : pour chaque article, la page HTML publique est téléchargée et le corps est extrait depuis le bloc **JSON-LD** (`application/ld+json`, champ `articleBody`) que franceinfo expose nativement pour les moteurs de recherche. Cette méthode est propre (pas de parsing CSS fragile) et fournit le texte intégral. Un délai de 0,5 s est respecté entre chaque requête pour ne pas surcharger les serveurs.

En pratique, ~97 % des articles ont un corps récupéré (les exceptions sont des formats sans texte : vidéos pures, liens externes). Le `word_count` est recalculé à partir du corps scrappé.

> **Historique :** L'API interne de publication franceinfo (`api-front.publish.franceinfo.francetvinfo.fr`) a été explorée en première intention mais s'est avérée inaccessible depuis toute IP publique (restriction au réseau interne France TV). La combinaison RSS + scraping JSON-LD constitue l'alternative retenue.

**Options du script :**
```bash
python3 fetch_articles.py              # tous les feeds + scraping corps
python3 fetch_articles.py --feed monde # un seul feed
python3 fetch_articles.py --no-scrape  # sans scraping (plus rapide, corps vide)
```

### 3.5 Base de données — Supabase

Supabase héberge une base PostgreSQL avec 5 tables. Voir section 4. Le client JavaScript Supabase est utilisé directement depuis le frontend (clé `anon` publique).

---

## 4. Base de données

### Schéma

```
articles
├── id (UUID, PK)
├── external_id (TEXT, UNIQUE) ← ID franceinfo extrait de l'URL
├── titre, chapo, corps, url, auteur, path
├── word_count, date_publication, date_modification
├── metadata (JSONB) ← teams, source, pushed, breakingNews
└── fetched_at, created_at

human_classifications
├── id (UUID, PK)
├── article_id (UUID, FK → articles)
├── userneed (TEXT, enum 8 valeurs)
├── classified_by (TEXT) ← identifiant utilisateur (défaut: 'anonymous')
├── classified_at
└── UNIQUE(article_id, classified_by)

prompts
├── id (TEXT, PK)
├── name, description, content (TEXT)
├── is_default, is_active (BOOLEAN)
├── userneeds (JSONB)
└── created_at, modified_at

test_runs
├── id (UUID, PK)
├── name, llm_model, prompt_id, prompt_snapshot
├── status (running | completed | stopped)
├── total_articles, analyzed_articles
├── concordant_count, concordant_percent
├── confusion_matrix (JSONB) ← matrice 8×8
├── statistics (JSONB)
└── started_at, completed_at

ai_analyses
├── id (UUID, PK)
├── test_run_id (UUID, FK → test_runs)
├── article_id (UUID, FK → articles)
├── predicted_userneed (TEXT)
├── predictions (JSONB) ← [{userneed, score, rank, justification} × 3]
├── justification (TEXT)
├── is_match (BOOLEAN) ← concordance IA / humain
├── delta, icp (NUMERIC) ← métriques de confiance
├── confidence_level (HAUTE | MOYENNE | BASSE)
└── raw_response, analyzed_at
```

### Sécurité (état POC)

Row Level Security (RLS) est activé mais les politiques sont **permissives** (`USING (true)`) : tout utilisateur anonyme peut lire et écrire toutes les tables. C'est acceptable pour un POC interne, incompatible avec une production.

---

## 5. Flux de données

### Ingestion des articles

```
crontab (toutes les 30 min)
    └─► fetch_articles.py
            ├── Phase 1 — RSS (6 feeds)
            │       ├── parse XML → normalise les articles
            │       │       ├── titre, chapo depuis <title> et <description>
            │       │       ├── url propre (suppression du tracking #xtor=...)
            │       │       └── external_id extrait de l'URL (_ID.html)
            │       └── dédoublonnage cross-feeds par external_id
            │
            ├── Phase 2 — Scraping du corps (~0,5s/article)
            │       ├── GET page HTML publique de l'article
            │       ├── extraction du bloc JSON-LD (application/ld+json)
            │       └── champ articleBody → corps + recalcul word_count
            │
            └── upsert Supabase REST API
                    └─► table articles (conflict: external_id → merge)
```

### Classification humaine

```
Utilisateur (navigateur)
    └─► Sélectionne un User Need sur un article
            └─► supabase-client.js
                    └─► upsert table human_classifications
                            (conflict: article_id + classified_by → replace)
```

### Analyse IA (Test Run)

```
Utilisateur déclenche l'analyse
    └─► Charge les articles classifiés depuis Supabase
            └─► Pour chaque article :
                    ├─► Construit le prompt (titre + chapo + corps + instructions)
                    ├─► POST /api/analyze (serveur proxy local)
                    │       └─► OpenRouter API (LLM choisi)
                    │               └─► Réponse texte : 3 userneeds + scores
                    ├─► parseAIResponse() → extrait les prédictions
                    ├─► calculateConfidence() → calcule Delta et ICP
                    └─► testRunManager.addAnalysis() → stocke dans ai_analyses
            └─► testRunManager.completeRun() → met à jour les stats du test run
```

---

## 6. Métriques et indicateurs calculés

### Concordance

Un article est **concordant** si le User Need prédit (rang 1) correspond exactement à la classification humaine.

Le **taux de concordance** est le pourcentage d'articles concordants sur le total analysé.

### Score de confiance

Pour chaque article, le LLM retourne 3 prédictions avec un score (P1, P2, P3, dont la somme = 100). Deux métriques sont dérivées :

**Delta** = P1 − P2
Mesure l'écart entre la première et la deuxième prédiction. Plus le delta est élevé, plus le LLM est "sûr" de son choix principal.

**ICP (Indice de Confiance Pondéré)** = (Delta / 100) × P1
Combine le delta et le score absolu de P1 pour obtenir un indicateur de confiance composite.

| Niveau | Delta | ICP |
|--------|-------|-----|
| HAUTE | ≥ 30 pts | ≥ 18 |
| MOYENNE | ≥ 15 pts | ≥ 7 |
| BASSE | < 15 pts | < 7 |

### Matrice de confusion

Une matrice 8×8 est calculée à la fin de chaque test run. Les lignes représentent la classification humaine, les colonnes la prédiction IA. La diagonale correspond aux articles concordants.

---

## 7. Limites du POC

| Limite | Impact |
|--------|--------|
| **Pas d'authentification** | Toutes les classifications sont anonymes (`classified_by = 'anonymous'`). Impossible de savoir qui a classifié quoi. |
| **Utilisateur unique** | Le modèle de données prévoit `classified_by` mais l'interface ne demande pas l'identité. |
| **Scraping du corps fragile** | Le corps est extrait via le JSON-LD public de franceinfo. Si franceinfo modifie la structure de ses pages ou bloque les scrapers, l'extraction cessera de fonctionner. ~3 % des articles (vidéos, liens externes) n'ont pas de corps disponible. |
| **Cron local** | La récupération des articles tourne sur la machine de l'utilisateur. Si la machine est éteinte, les articles ne sont plus importés. |
| **Pas de CI/CD** | Le déploiement est manuel (`vercel --prod`, `git push`). |
| **Clés API en clair** | La clé OpenRouter est dans `config.json` et utilisée côté client dans le local storage. |
| **Pas de logs structurés** | Les logs sont dans la console du navigateur et dans un fichier `.log` local. |
| **Technologies POC** | JavaScript vanilla, Python stdlib — pas adapté à une montée en charge ou à un travail en équipe. |
| **Pas de gestion d'erreur robuste** | Les erreurs réseau affichent des messages toast simples, sans retry ni file d'attente. |

---

## 8. Recommandations pour la production

Ce POC a validé la faisabilité de l'approche. Les choix suivants sont recommandés pour une mise en production.

### 8.1 Architecture cible

```
┌─────────────────────────────────────┐
│          FRONTEND                   │
│   React / Next.js (ou équivalent)   │
│   Authentification SSO France TV    │
└────────────────┬────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│            API BACKEND              │
│   FastAPI (Python) ou Node/Express  │
│   Endpoints authentifiés            │
│   Gestion des secrets (env vars)    │
└──────┬──────────────────┬───────────┘
       │                  │
       ▼                  ▼
┌────────────┐   ┌────────────────────┐
│ PostgreSQL │   │   LLM Provider     │
│ (managé)  │   │   OpenRouter ou    │
│           │   │   API Anthropic     │
│           │   │   directe          │
└────────────┘   └────────────────────┘
       ▲
       │
┌──────┴──────────────────────────────┐
│    JOB PLANIFIÉ (cloud)             │
│    Ex: GitHub Actions, Airflow,     │
│    ou cron sur serveur dédié        │
│    → Ingestion articles             │
└─────────────────────────────────────┘
```

### 8.2 Source des articles

**État actuel :** Le POC récupère les articles via RSS public + scraping du corps via JSON-LD. Cette approche fonctionne et fournit le texte intégral des articles dans ~97 % des cas, sans nécessiter d'authentification ni d'accès réseau interne.

**Risque identifié :** Le scraping repose sur la structure actuelle des pages franceinfo. Il peut être fragilisé par :
- Une modification de la structure HTML ou JSON-LD de franceinfo
- Une politique anti-scraping côté France TV

**Pour la production**, deux options sont à évaluer par ordre de préférence :
1. **API interne officielle** : demander à la DSI un accès à l'API de contenu France TV depuis le cloud (clé API ou IP whitelistée). C'est la solution la plus robuste et pérenne.
2. **Maintenir le scraping JSON-LD** : si l'option 1 n'est pas disponible à court terme, le scraping actuel est fonctionnel et peut être conservé en production avec une surveillance des taux d'échec.

### 8.3 Authentification et multi-utilisateurs

Le POC fonctionne sans identité. En production :
- Intégrer le SSO France Télévisions (SAML ou OIDC)
- Associer chaque classification à l'utilisateur authentifié
- Permettre plusieurs classifications pour le même article (par différents éditeurs) afin de mesurer le taux d'accord inter-annotateurs

### 8.4 Gestion des prompts et versioning

Le POC stocke les prompts en Supabase mais sans versioning structuré. En production :
- Versionner chaque prompt (semver ou hash)
- Associer chaque test run au prompt exact utilisé (déjà partiellement fait avec `prompt_snapshot`)
- Permettre de rejouer un test run sur un nouveau corpus avec le même prompt

### 8.5 Ingestion des articles

Remplacer le cron local par un job cloud planifié (ex: GitHub Actions avec un schedule, AWS Lambda, ou Airflow si la DSI en dispose). L'ingestion doit être indépendante de la machine de l'utilisateur.

### 8.6 Scalabilité de l'analyse IA

Le POC traite les articles séquentiellement (un par un) pour éviter de surcharger l'API LLM. En production, avec un volume plus important :
- Implémenter un traitement par batch avec file d'attente (ex: Redis Queue, Celery)
- Gérer le rate limiting et les erreurs de l'API LLM avec retry exponentiel
- Stocker les résultats progressivement (déjà en place) pour reprendre en cas d'interruption

### 8.7 Sécurité

| Point | Action requise |
|-------|----------------|
| Clés API | Variables d'environnement côté serveur uniquement, jamais exposées au client |
| Supabase | Politiques RLS restrictives par utilisateur authentifié |
| CORS | Restreindre aux domaines autorisés |
| Rate limiting | Limiter les appels `/api/analyze` par utilisateur |

### 8.8 Résumé des décisions clés à prendre

Avant tout développement en production, les points suivants doivent être tranchés :

1. **Source des articles** : Quelle API interne France TV est utilisable depuis le cloud ? Avec quelle authentification ?
2. **Modèle LLM de référence** : OpenRouter (flexibilité multi-modèles) ou contrat direct avec Anthropic/OpenAI ?
3. **Infrastructure cloud** : AWS, GCP, Azure, ou solutions managées (Vercel + Supabase comme dans le POC mais avec auth) ?
4. **Authentification** : SSO France TV ou système dédié ?
5. **Utilisateurs** : Qui classifie les articles ? Combien de personnes ? Quel workflow de validation ?

---

*Ce document décrit le POC tel qu'il existe en mars 2026. Il doit être mis à jour au fur et à mesure des décisions d'architecture prises pour la production.*
