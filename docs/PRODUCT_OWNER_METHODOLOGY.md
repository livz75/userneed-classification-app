# 📋 Méthodologie Product Owner - Handoff Développeur Full-Stack

## 📚 Guide complet pour transmettre un projet à un développeur

**Objectif** : Ce guide vous accompagne dans la transmission de votre POC à un développeur full-stack pour industrialisation.

**Public** : Product Owners, Chefs de projet techniques (première expérience bienvenue !)

**Durée totale estimée** : 2-3 semaines de préparation avant le handoff

---

## 📋 Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Phase 1 : Analyse du POC](#phase-1--analyse-du-poc)
3. [Phase 2 : Structuration des exigences](#phase-2--structuration-des-exigences)
4. [Phase 3 : Spécifications techniques](#phase-3--spécifications-techniques)
5. [Phase 4 : Assets visuels](#phase-4--assets-visuels)
6. [Phase 5 : Package de livrables](#phase-5--package-de-livrables)
7. [Phase 6 : Communication](#phase-6--communication)
8. [Erreurs fréquentes](#erreurs-fréquentes-à-éviter)
9. [Checklist finale](#checklist-finale)
10. [Backlog exhaustif : Epics & User Stories](#-backlog-exhaustif--epics--user-stories)

---

## Vue d'ensemble

### 🎯 Votre rôle de Product Owner

En tant que PO, vous êtes **le pont entre le métier et la technique**. Votre mission :

- ✅ **Définir le "QUOI"** (ce qu'on veut) et non le "COMMENT" (comment le coder)
- ✅ **Prioriser** les fonctionnalités (Must-have vs Nice-to-have)
- ✅ **Clarifier** les ambiguïtés métier
- ✅ **Valider** les livraisons
- ❌ **PAS** choisir la stack technique (sauf contraintes imposées)
- ❌ **PAS** dicter l'architecture (sauf pattern obligatoire)

### 📊 Niveaux de maturité du projet

Votre POC actuel est au niveau **1 - Prototype fonctionnel** :

| Niveau | Nom | Caractéristiques |
|--------|-----|------------------|
| **1** | **POC** | Code monolithe, pas de tests, architecture fragile |
| **2** | **MVP** | Architecture propre, tests basiques, déployable |
| **3** | **Production** | Tests complets, monitoring, scalable, maintenable |
| **4** | **Industriel** | CI/CD, multi-environnements, documentation complète |

**Objectif du handoff** : Passer du niveau 1 au niveau 3-4.

### ⏱️ Timeline recommandée

```
Semaine -3 à -2 : Préparation (Phase 1-2)
Semaine -1      : Finalisation docs + wireframes (Phase 3-4-5)
Semaine 0       : Kick-off avec développeur (Phase 6)
Semaine 1-12    : Développement (sprints)
Semaine 13      : Recette finale et déploiement
```

---

## Phase 1 : Analyse du POC

**Durée** : 2-3 jours
**Objectif** : Comprendre profondément ce qui a été construit

### Étape 1.1 : Cartographie des fonctionnalités

Créez un **tableau** avec TOUTES les fonctionnalités :

| # | Fonctionnalité | Description | Écran | Priorité | Complexité |
|---|----------------|-------------|-------|----------|------------|
| F1 | Ingestion articles | Articles récupérés via RSS Franceinfo (cron auto) ou ajout manuel par URL | Articles | Must | M |
| F2 | Classifications humaines | Stocker les classifications de référence dans Supabase | Articles | Must | S |
| F3 | Affichage tableau | Liste articles avec recherche, filtres (Tous/Classifiés/Non classifiés) | Articles | Must | M |
| F4 | Analyse IA | Analyse via OpenRouter (24+ modèles LLM) avec barre de progression et ETA | Analyse | Must | L |
| F5 | Matrice de confusion | Matrice 8x8 interactive, cellules cliquables | Analyse | Must | M |
| F6 | Gestion prompts | Créer, éditer, dupliquer, exporter/importer des prompts | Prompts | Must | M |
| F7 | Historique tests | Liste des runs, comparaison 2 runs side-by-side | Tests | Should | M |
| F8 | Scatter plot ranking | Concordance vs F1 macro, filtres par modèle/prompt/volume | Tests | Should | M |
| ... | ... | ... | ... | ... | ... |

**Colonnes** :
- **#** : Identifiant unique (F1, F2, F3...)
- **Fonctionnalité** : Nom court (3-5 mots max)
- **Description** : Ce qui se passe (1 phrase)
- **Écran** : Où c'est visible
- **Priorité** : Must / Should / Could / Won't (méthode MoSCoW)
- **Complexité** : XS / S / M / L / XL (estimation développeur)

### Étape 1.2 : Extraction des règles métier

Les **règles métier** sont des contraintes ou logiques qui ne changent jamais.

**Exemple pour votre projet** :

| ID | Règle métier | Implémentation actuelle | Critique ? |
|----|--------------|-------------------------|------------|
| R1 | Les userneeds DOIVENT être normalisés parmi les 8 catégories officielles | Fonction `normalizeUserneed()` | ✅ OUI |
| R2 | La matrice de confusion est 8x8 (8 userneeds) | Matrice interactive avec cellules cliquables | ✅ OUI |
| R3 | Un article peut avoir max 3 userneeds (principal, secondaire, tertiaire) avec scores | Structure de données `predictions[]` dans `ai_analyses` | ✅ OUI |
| R4 | L'ordre de priorité d'analyse est : EXPLAIN ME > UPDATE ME > GIVE ME PERSPECTIVE > autres | Implémenté dans la logique d'analyse | ✅ OUI |
| R5 | La confiance est calculée via delta (score1 - score2) et ICP (delta/100 * score1) | Trois niveaux : HAUTE / MOYENNE / BASSE | ✅ OUI |
| R6 | Les articles sont paginés pour dépasser la limite Supabase de 1000 lignes | Pagination automatique au chargement | ✅ OUI |

**Comment identifier les règles métier** :
1. Cherchez les `if/else` dans le code POC
2. Cherchez les validations
3. Cherchez les calculs mathématiques
4. Posez-vous : "Qu'est-ce qui ne doit JAMAIS changer ?"

### Étape 1.3 : Identifier ce qui marche vs. ce qui est fragile

Créez deux colonnes :

**✅ À CONSERVER (Fondations solides)** :
- Persistance Supabase (PostgreSQL) avec modèle de données complet
- Matrice de confusion 8x8 interactive (cellules cliquables)
- Système de confiance (HAUTE/MOYENNE/BASSE via delta + ICP)
- Gestion multi-prompts (créer, éditer, dupliquer, exporter/importer)
- Historique des test runs avec comparaison et scatter plot
- Normalisation userneeds
- Dark theme avec Poppins
- Double déploiement (Render + Hostinger VPS)

**❌ À REFAIRE (Trop fragile)** :
- Code monolithe (fichier unique index.html)
- Pas de tests automatisés
- Gestion d'état en variables globales
- Pas de séparation frontend/backend (tout côté client)

### Étape 1.4 : Analyser les flux utilisateur

Dessinez (papier/crayon suffit !) les **parcours utilisateur** :

**Exemple - Flux nominal "Analyse d'articles"** :
```
1. Utilisateur arrive sur l'écran Articles
2. Les articles sont chargés depuis Supabase (pagination automatique)
3. Optionnel : ajoute un article par URL (collage URL Franceinfo)
4. Passe à l'écran Analyse
5. Le bandeau de config affiche le modèle LLM et le prompt actif
6. Clique sur "Lancer l'analyse"
7. Barre de progression avec ETA s'affiche (0% → 100%)
8. Pour chaque article (ordre de priorité : EXPLAIN ME > UPDATE ME > GIVE ME PERSPECTIVE > autres) :
   ├─ Appel API OpenRouter
   ├─ Parsing réponse + calcul confiance (delta, ICP)
   ├─ Affichage en temps réel dans le flux d'articles
   └─ Mise à jour stats (Total/Concordants/Non-concordants)
9. Matrice de confusion 8x8 interactive s'affiche
10. Tableau détaillé avec justification + modales de confiance
11. Le test run est sauvegardé dans l'historique (écran Tests)
```

**Flux alternatifs** (erreurs, cas limites) :
- Que se passe-t-il si l'API timeout ?
- Que se passe-t-il si la réponse LLM est malformée ?
- Que se passe-t-il si l'utilisateur clique "Stop" ?
- Que se passe-t-il si un article n'a pas de classification humaine ?

**💡 Astuce** : Utilisez les captures d'écran de votre POC et annotez-les avec des flèches.

---

## Phase 2 : Structuration des exigences

**Durée** : 3-4 jours
**Objectif** : Transformer le POC en spécifications exploitables

### Étape 2.1 : Méthode MoSCoW

Classez TOUTES les fonctionnalités selon cette priorité :

**Must-Have** (Obligatoire - MVP)
- Sans ça, l'application ne sert à rien
- Ex: Ingestion articles (RSS/URL), Analyse IA multi-modèles, Matrice de confusion, Classifications humaines

**Should-Have** (Important - v1.0)
- Améliore significativement l'usage
- Ex: Gestion prompts, Historique tests, Scatter plot ranking, Système de confiance

**Could-Have** (Bonus - v1.1)
- Nice to have si temps le permet
- Ex: Export avancé, Comparaison side-by-side de runs, Filtres avancés scatter plot

**Won't-Have** (Hors scope)
- Reporté à v2.0 ou jamais
- Ex: Multi-tenant, API publique, Analyse automatique temps réel

**Exemple de répartition** pour votre projet :

| Priorité | Fonctionnalités | % du total |
|----------|-----------------|------------|
| Must | Ingestion articles, Analyse IA, Matrice, Tableau articles, Classifications humaines | 55% |
| Should | Prompts multiples, Historique tests, Scatter plot, Confiance, Double déploiement | 30% |
| Could | Comparaison runs, Filtres avancés, Export données | 10% |
| Won't | Multi-tenant, API publique, SSO | 5% |

### Étape 2.2 : User Stories

Traduisez les fonctionnalités en **User Stories** (format Agile).

**Format** :
```
En tant que [RÔLE],
Je veux [ACTION],
Afin de [BÉNÉFICE].
```

**Exemples pour votre projet** :

**US-001 : Consulter les articles du corpus**
```
En tant qu'éditeur Franceinfo,
Je veux voir la liste des articles importés depuis Supabase avec recherche et filtres (Tous/Classifiés/Non classifiés),
Afin de connaître l'état de mon corpus et identifier les articles à classifier.
```

**US-002 : Ajouter un article par URL**
```
En tant qu'éditeur Franceinfo,
Je veux ajouter un article en collant son URL Franceinfo,
Afin d'enrichir mon corpus de test sans attendre l'import RSS automatique.
```

**US-003 : Lancer une analyse IA**
```
En tant qu'éditeur Franceinfo,
Je veux lancer une analyse IA sur le corpus avec un modèle LLM et un prompt choisis, et voir la progression en temps réel (barre de progression + ETA),
Afin de comparer les prédictions IA avec les classifications humaines.
```

**US-004 : Visualiser matrice de confusion**
```
En tant qu'éditeur Franceinfo,
Je veux voir une matrice 8x8 interactive avec cellules cliquables croisant userneeds attendus et prédits,
Afin d'identifier rapidement les erreurs de classification et explorer les détails.
```

**US-005 : Comparer des test runs**
```
En tant qu'éditeur Franceinfo,
Je veux comparer 2 test runs side-by-side et visualiser un scatter plot (Concordance vs F1 macro) filtrable par modèle, prompt et volume,
Afin d'identifier la meilleure combinaison modèle/prompt.
```

**💡 Astuce** : Chaque User Story doit tenir sur une carte (ou post-it). Si c'est trop long, découpez !

### Étape 2.3 : Critères d'acceptation

Pour CHAQUE User Story, définissez les **critères d'acceptation** (format Gherkin).

**Format** :
```
Étant donné [CONTEXTE],
Quand [ACTION],
Alors [RÉSULTAT ATTENDU].
```

**Exemple US-002 (Ajouter un article par URL)** :

```gherkin
Critère 1: Ajout article avec URL valide
  Étant donné que je suis sur l'écran Articles,
  Quand je colle une URL Franceinfo valide dans le champ d'ajout et valide,
  Alors l'article est récupéré, ajouté dans Supabase, et apparaît dans la liste.

Critère 2: Ajout article avec URL invalide
  Étant donné que je suis sur l'écran Articles,
  Quand je colle une URL qui n'est pas une URL Franceinfo valide,
  Alors un message d'erreur s'affiche indiquant que l'URL n'est pas reconnue.

Critère 3: Ajout article déjà existant
  Étant donné que je suis sur l'écran Articles,
  Quand je colle une URL d'un article déjà présent dans la base,
  Alors un message m'informe que l'article existe déjà dans le corpus.
```

**💡 Règle d'or** : Si vous ne pouvez pas écrire les critères d'acceptation, c'est que la User Story est floue !

### Étape 2.4 : Modèle de données

Définissez la **structure des données** principales.

**Exemple pour votre projet** :

**articles** (table Supabase)
```json
{
  "id": "integer (auto)",
  "external_id": "string (identifiant source)",
  "url": "string (URL Franceinfo)",
  "titre": "string",
  "chapo": "string",
  "corps": "string",
  "auteur": "string",
  "path": "string",
  "word_count": "integer",
  "date_publication": "datetime",
  "metadata": "jsonb"
}
```

**human_classifications** (table Supabase)
```json
{
  "id": "integer (auto)",
  "article_id": "integer (FK → articles.id)",
  "userneed": "string (un des 8 userneeds)",
  "classified_by": "string",
  "classified_at": "datetime"
}
```

**ai_analyses** (table Supabase - output IA)
```json
{
  "id": "integer (auto)",
  "test_run_id": "integer (FK → test_runs.id)",
  "article_id": "integer (FK → articles.id)",
  "predicted_userneed": "string (un des 8)",
  "predictions": "jsonb (tableau des 3 userneeds avec scores)",
  "justification": "string",
  "confidence": "string (HAUTE / MOYENNE / BASSE)",
  "delta": "float (score1 - score2)",
  "icp": "float (delta/100 * score1)"
}
```

**test_runs** (table Supabase)
```json
{
  "id": "integer (auto)",
  "name": "string",
  "llm_model": "string (ex: anthropic/claude-3.5-haiku)",
  "prompt_id": "integer (FK → prompts.id)",
  "status": "string (pending / running / completed / failed)",
  "total_articles": "integer",
  "analyzed_articles": "integer",
  "concordant_percent": "float"
}
```

**prompts** (table Supabase)
```json
{
  "id": "integer (auto)",
  "name": "string",
  "description": "string",
  "content": "text (le prompt complet)",
  "is_default": "boolean",
  "is_active": "boolean"
}
```

**Métriques calculées** :
- Concordance (accuracy) = total correct / total articles
- Precision macro = moyenne des précisions par catégorie
- Recall macro = moyenne des rappels par catégorie
- F1 macro = moyenne harmonique de precision et recall par catégorie, moyennée

**💡 Pourquoi c'est important** : Le développeur doit comprendre EXACTEMENT quelle data structure manipuler.

---

## Phase 3 : Spécifications techniques

**Durée** : 2-3 jours
**Objectif** : Définir les exigences techniques de HAUT NIVEAU

### 🚨 IMPORTANT : Quel niveau de détail ?

**✅ À SPÉCIFIER (votre rôle PO)** :
- Exigences de performance (ex: "analyse < 5s par article")
- Contraintes d'intégration (ex: "API OpenRouter obligatoire")
- Exigences de sécurité (ex: "clés API jamais exposées frontend")
- Compatibilité (ex: "support Chrome/Firefox/Safari dernières versions")

**❌ À NE PAS SPÉCIFIER (rôle développeur)** :
- Stack technique précise (React vs Vue, FastAPI vs Flask)
- Architecture détaillée (Redux vs Context, monolithe vs microservices)
- Choix des bibliothèques (axios vs fetch, pandas vs polars)

**Équilibre** : Vous définissez les **contraintes** et **objectifs**, le dev choisit les **moyens**.

### Étape 3.1 : Exigences non-fonctionnelles

**Performance**
- Temps de chargement page < 2s
- Analyse d'un article < 5s (médiane)
- Support jusqu'à 200 articles en un batch
- Export Excel < 10s pour 100 articles

**Sécurité**
- Clés API stockées côté serveur uniquement
- HTTPS obligatoire en production
- Validation inputs côté serveur
- Rate limiting API (max 100 req/min/user)

**Compatibilité**
- Navigateurs: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- Responsive: Desktop (1920x1080) et Laptop (1366x768)
- Mobile: Non requis pour v1.0

**Disponibilité**
- Uptime: 99% (double déploiement Render + Hostinger VPS pour résilience)
- Backup: Données persistées dans Supabase (PostgreSQL managé)

**Scalabilité**
- Concurrent users: 5-10 max (équipe interne)
- Pas de queue/background jobs requis pour v1.0

### Étape 3.2 : Contraintes techniques imposées

Listez les **contraintes OBLIGATOIRES** (décisions déjà prises) :

**Pour votre projet** :

| Contrainte | Justification | Négociable ? |
|------------|---------------|--------------|
| **API OpenRouter** obligatoire | Flexibilité (24+ modèles LLM), coût maîtrisé | Non |
| **Supabase (PostgreSQL)** pour la persistance | Base de données relationnelle, API REST auto-générée, gratuit | Non |
| **Double déploiement Render + Hostinger VPS** | Render = auto-deploy GitHub ; Hostinger = cron pull toutes les 2 min | Non |
| **Basic Auth** sur les deux déploiements | Protection d'accès (équipe interne uniquement) | Non |
| **Dark theme uniquement** + police Poppins | Charte graphique du projet | Oui |
| **Repository GitHub** | Auto-deploy Render + cron Hostinger | Non |

### Étape 3.3 : Architecture proposée (high-level)

Proposez une **architecture cible** (sans imposer les outils) :

```
┌─────────────────────────────────────────────┐
│            FRONTEND (SPA)                   │
│  - 5 écrans principaux + modale Help        │
│  - Visualisations (matrice 8x8, scatter)    │
│  - State management                         │
│  - Dark theme, Poppins                      │
└────────────┬────────────────────────────────┘
             │
             │ REST API (Supabase client)
             ▼
┌─────────────────────────────────────────────┐
│         SUPABASE (PostgreSQL)               │
│  - articles, human_classifications          │
│  - ai_analyses, test_runs, prompts          │
│  - API REST auto-générée                    │
│  - Pagination (au-delà de 1000 lignes)      │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│         OPENROUTER API                      │
│  - 24+ modèles LLM                         │
│  - Pay-per-use                              │
│  - Appelé directement depuis le frontend    │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│         DÉPLOIEMENT                         │
│  - Render.com (auto-deploy GitHub)          │
│  - Hostinger VPS (cron git pull / 2 min)    │
│  - Basic Auth sur les deux                  │
└─────────────────────────────────────────────┘
```

**Composants optionnels** (v2.0+) :
```
┌─────────────┐
│    Redis    │ ← Cache réponses LLM
└─────────────┘

┌─────────────┐
│  RSS Cron   │ ← Import automatique articles Franceinfo (déjà en place)
└─────────────┘
```

**💡 Laissez le développeur** :
- Choisir le framework frontend (React vs Vue vs Svelte) si refactoring
- Décider de l'architecture backend si passage à un vrai serveur
- Optimiser la stratégie de cache et de pagination

### Étape 3.4 : API et intégrations

Documentez les **APIs externes** utilisées :

**OpenRouter API**
- **URL** : https://openrouter.ai/api/v1/chat/completions
- **Auth** : Bearer token (header `Authorization: Bearer sk-or-v1-...`)
- **Rate limit** : Selon modèle (varie)
- **Timeout** : 120s recommandé
- **Coût** : Variable ($0.00-$0.03 par 1K tokens selon modèle)
- **Documentation** : https://openrouter.ai/docs

**Modèles supportés** : 24+ modèles disponibles via le panneau LLM, parmi lesquels :
1. **anthropic/claude-3.5-haiku** (recommandé prod)
2. **google/gemini-2.5-flash-lite** (rapidité)
3. **meta-llama/llama-3.1-8b-instruct** (gratuit, tests)
4. Et 21+ autres modèles sélectionnables dans le model picker

### Étape 3.5 : Gestion des erreurs

Définissez le **comportement attendu** en cas d'erreur :

| Erreur | Comportement attendu |
|--------|----------------------|
| **401 Unauthorized** (API key invalide) | Message : "Clé API invalide. Veuillez vérifier votre configuration." |
| **429 Too Many Requests** (rate limit) | Retry automatique après 60s (max 3 fois) |
| **504 Timeout** (>120s) | Message : "L'analyse a pris trop de temps. Réessayez avec un article plus court." |
| **Réponse LLM malformée** | Message : "Le modèle a retourné une réponse invalide. Réessayez ou changez de modèle." |
| **Article sans classification humaine** | Article ignoré dans le calcul de concordance, signalé dans les résultats |

**Règle générale** : Toujours afficher un message **actionnable** à l'utilisateur.

---

## Phase 4 : Assets visuels

**Durée** : 2-3 jours
**Objectif** : Clarifier les attentes UX

### 🤔 Question : Faut-il des mockups ?

**Réponse : OUI, mais pas nécessairement haute-fidélité.**

**3 options** selon votre budget/temps :

#### Option 1 : Screenshots annotés (1-2h) ⭐ MINIMUM

**Effort** : Très faible
**Outils** : Skitch, Preview (Mac), Paint (Windows)
**Méthode** :
1. Prenez des captures d'écran de votre POC (chaque écran)
2. Annotez avec des flèches et texte :
   - "✅ Conserver tel quel"
   - "⚠️ À améliorer : [suggestions]"
   - "❌ À refaire complètement"
3. Numérotez les écrans (Écran 1, Écran 2, etc.)

**Avantages** :
- Très rapide
- Montre CE QUI EXISTE
- Base de discussion

**Inconvénients** :
- Ne montre pas les NOUVEAUTÉS
- Qualité visuelle POC

#### Option 2 : Wireframes low-fidelity (2-4h) ⭐⭐ RECOMMANDÉ

**Effort** : Faible
**Outils** : Figma (gratuit), Excalidraw, Balsamiq
**Méthode** :
1. Dessinez chaque écran avec des rectangles
2. Ajoutez les labels ("Bouton", "Tableau", "Matrice")
3. Indiquez les interactions (flèches, annotations)
4. Pas besoin de couleurs/typo final

**Avantages** :
- Clarifie la STRUCTURE
- Force à réfléchir à l'UX
- Base solide pour le dev

**Inconvénients** :
- Prend un peu de temps
- Pas de design final

#### Option 3 : Mockups high-fidelity (2-5 jours) ⭐⭐⭐ SI BUDGET

**Effort** : Élevé
**Outils** : Figma + Designer UX/UI
**Méthode** : Embaucher un designer freelance

**Avantages** :
- Design professionnel
- Charte graphique Franceinfo
- Composants réutilisables

**Inconvénients** :
- Coûteux (500-2000€)
- Prend du temps

### 🎯 Recommandation pour VOUS

**Option 2 (Wireframes)** + **Option 1 (Screenshots POC)**

**Plan d'action** :
1. **Jour 1** : Screenshots annotés POC (1h)
2. **Jour 2-3** : Wireframes Figma pour :
   - Écran Articles (recherche, filtres, ajout URL, distribution)
   - Écran Analyse (bandeau config, progression, matrice, résultats)
   - Panneau LLM (model picker, clé API)
   - Panneau Prompts (CRUD complet)
   - Panneau Tests (historique, scatter plot ranking)

### Étape 4.1 : Liste des écrans

Listez TOUS les écrans/modales :

| # | Écran | Éléments principaux | Interactions |
|---|-------|---------------------|--------------|
| 1 | Articles | Recherche, filtres (Tous/Classifiés/Non classifiés), ajout par URL, graphe distribution corpus | Recherche live, filtrage, ajout article par URL |
| 2 | Analyse | Bandeau config (modèle+prompt), barre progression+ETA, stats (Total/Concordants/Non-concordants), matrice 8x8, flux articles temps réel, tableau détaillé | Clic cellule matrice → filtre, modales justification + confiance |
| 3 | Panneau LLM | Table des 24+ modèles (model picker), gestion clé API | Sélection modèle, saisie/modification clé API |
| 4 | Panneau Prompts | Liste prompts, éditeur, boutons créer/éditer/dupliquer/supprimer/activer | CRUD complet, export/import prompts |
| 5 | Panneau Tests | Onglet Historique (liste runs, comparaison 2 runs side-by-side) + Onglet Ranking (scatter plot Concordance vs F1 macro, filtres modèle/prompt/volume, tableau ranking) | Sélection 2 runs pour comparaison, filtres scatter plot |
| 6 | Modale Help | Guide d'utilisation | Affichage conditionnel |

### Étape 4.2 : Design system (guidelines)

Créez un fichier `UX_GUIDELINES.md` avec :

**Couleurs** (palette actuelle POC) :
```css
--accent-purple: #8B5CF6  /* Boutons primaires */
--accent-red: #EF4444     /* Erreurs */
--accent-green: #10B981   /* Succès */
--bg-dark: #1E293B        /* Background mode sombre */
--text-primary: #F1F5F9   /* Texte principal */
```

**Typographie** :
- Police : Poppins (Google Fonts)
- Tailles : H1 (2rem), H2 (1.5rem), Body (1rem)

**Composants** :
- Boutons : Arrondi 8px, Padding 12px 24px
- Cards : Arrondi 12px, Shadow
- Inputs : Bordure 2px, Focus violet

**Comportements** :
- Hover : Transition 0.2s
- Loading : Spinner violet
- Toasts : Durée 5s, Coin sup. droit

**Responsive** :
- Breakpoints : 1366px (laptop), 1920px (desktop)
- Mobile : Non supporté v1.0

### Étape 4.3 : Annotations interactions

Pour chaque écran, documentez :

**Exemple - Matrice de confusion** :

```
INTERACTIONS :
1. Hover sur cellule → Tooltip affiche :
   - Nombre d'articles
   - Pourcentage du total
   - Userneed source → Userneed prédit

2. Click sur cellule → Filtre le tableau :
   - Affiche uniquement articles de cette cellule
   - Change couleur cellule (bordure épaisse)
   - Bouton "Réinitialiser filtre" apparaît

3. Click hors matrice → Réinitialise filtre

4. Cellules diagonale (concordance) → Vert
   Cellules hors diagonale (erreur) → Rouge/Orange selon distance
```

---

## Phase 5 : Package de livrables

**Durée** : 1 jour (compilation)
**Objectif** : Préparer TOUS les documents pour le handoff

### 📦 Liste complète des livrables

#### Groupe 1 : Documents obligatoires (AVANT kick-off)

1. **SPEC_FONCTIONNELLES.md**
   - User Stories
   - Critères d'acceptation
   - Modèle de données
   - Règles métier

2. **SPEC_TECHNIQUES.md**
   - Exigences non-fonctionnelles
   - Architecture cible
   - APIs et intégrations
   - Gestion d'erreurs

3. **UX_GUIDELINES.md**
   - Design system
   - Couleurs, typo, composants
   - Comportements interactions

4. **WIREFRAMES/** (dossier)
   - 5-7 wireframes Figma (PNG exported)
   - Screenshots annotés POC

5. **BACKLOG.xlsx**
   - Matrice fonctionnalités (MoSCoW)
   - User Stories numérotées
   - Estimations initiales (vides, à remplir avec dev)

#### Groupe 2 : Assets techniques (AVANT démarrage dev)

6. **CODE_POC/** (repository Git)
   - Accès lecture seule au repo GitHub
   - README avec instructions démarrage local

7. **DONNEES_TEST/** (dossier)
   - Corpus de test dans Supabase (articles + classifications humaines)
   - URLs Franceinfo de référence pour import manuel

8. **CONFIG_TEMPLATE.md**
   - Guide obtenir clé OpenRouter
   - Liste modèles recommandés
   - Template `config.json.example`

#### Groupe 3 : Processus et communication (PENDANT dev)

9. **TEMPLATES/** (dossier)
   - Template CR Weekly Sync
   - Template User Story
   - Template Critères Acceptation

10. **ROADMAP.md**
    - Timeline projet (12 semaines)
    - Jalons (milestones)
    - Critères de validation par jalon

11. **QUESTIONS_DEVELOPPEUR.md**
    - 12 questions préparées pour kick-off
    - Questions ouvertes architecturales

#### Groupe 4 : Documentation existante (RÉFÉRENCE)

12. **README.md** (existant)
13. **CONFIG.md** (existant)
14. **DOCUMENTATION_POC_TECHNIQUE.md** (existant)

### 📂 Structure du package final

```
HANDOFF_DEVELOPPEUR/
├── 00_README_DEMARRAGE.md          ← Commencer ici !
│
├── 01_SPECIFICATIONS/
│   ├── SPEC_FONCTIONNELLES.md
│   ├── SPEC_TECHNIQUES.md
│   └── BACKLOG.xlsx
│
├── 02_UX_DESIGN/
│   ├── UX_GUIDELINES.md
│   ├── WIREFRAMES/
│   │   ├── 01_ecran_accueil.png
│   │   ├── 02_ecran_analyse.png
│   │   └── ...
│   └── SCREENSHOTS_POC/
│       └── (captures écran annotées)
│
├── 03_DONNEES_TEST/
│   ├── urls_test_reference.txt
│   └── corpus_supabase_snapshot.sql
│
├── 04_CONFIGURATION/
│   ├── CONFIG_TEMPLATE.md
│   └── config.json.example
│
├── 05_PROCESSUS/
│   ├── TEMPLATES/
│   │   ├── CR_WEEKLY_SYNC.md
│   │   ├── USER_STORY.md
│   │   └── CRITERES_ACCEPTATION.md
│   ├── ROADMAP.md
│   └── QUESTIONS_DEVELOPPEUR.md
│
└── 06_CODE_POC_REFERENCE/
    └── (lien vers repo GitHub)
```

### 📄 Contenu du README_DEMARRAGE.md

```markdown
# 🚀 Guide de démarrage - Handoff Développeur

Bienvenue ! Ce package contient TOUT ce dont vous avez besoin pour démarrer le développement.

## 📖 Ordre de lecture recommandé

1. **Jour 1 - Compréhension** (2-3h)
   - Lire `01_SPECIFICATIONS/SPEC_FONCTIONNELLES.md`
   - Parcourir `02_UX_DESIGN/WIREFRAMES/`
   - Explorer le POC : [lien GitHub]

2. **Jour 2 - Technique** (3-4h)
   - Lire `01_SPECIFICATIONS/SPEC_TECHNIQUES.md`
   - Lire `02_UX_DESIGN/UX_GUIDELINES.md`
   - Tester le POC en local

3. **Jour 3 - Questions** (1h)
   - Préparer questions pour kick-off
   - Remplir estimations dans `BACKLOG.xlsx`

## 🎯 Objectif du projet

Transformer le POC fonctionnel en application production-ready pour France Télévisions.

## 📊 Contexte

[Résumé en 2-3 paragraphes]

## 📞 Contacts

- Product Owner : [Votre nom] - [email]
- Sponsor : [Nom] - France Télévisions

## ⏱️ Timeline

- Kick-off : [Date]
- Livraison MVP : [Date + 8 semaines]
- Livraison finale : [Date + 12 semaines]

## 🔑 Accès

- GitHub : [lien]
- Render.com : [invitation envoyée par email] (auto-deploy GitHub)
- Hostinger VPS : [accès SSH] (cron git pull / 2 min)
- Supabase : [accès dashboard projet]
- OpenRouter : [créer compte sur openrouter.ai]
```

---

## Phase 6 : Communication

**Durée** : Continue (tout au long du projet)
**Objectif** : Maintenir l'alignement Product Owner ↔ Développeur

### Étape 6.1 : Kick-off meeting (Jour 1)

**Durée** : 2h
**Participants** : Vous (PO) + Développeur + Sponsor (optionnel)

**Agenda** :

```
0:00-0:15 → Présentations et contexte métier
  - Qui est qui
  - Contexte France Télévisions
  - Problématique userneeds

0:15-0:45 → Démo POC en live
  - Parcourir les 6 écrans principaux
  - Montrer cas nominal
  - Montrer cas d'erreurs

0:45-1:15 → Parcours des spécifications
  - User Stories must-have
  - Architecture proposée
  - Wireframes
  - Questions du développeur

1:15-1:45 → Estimation et planning
  - Développeur estime complexité fonctionnalités
  - Négociation scope si nécessaire
  - Définition sprints (1-2 semaines chacun)

1:45-2:00 → Next steps
  - Setup environnements
  - Premier sprint planning
  - Date prochain sync
```

**💡 Préparez 12 questions à poser AU développeur** :

1. Quelle stack technique proposez-vous et pourquoi ?
2. Estimez-vous que 12 semaines est réaliste ?
3. Quels sont les 3 plus gros risques techniques ?
4. Préférez-vous Agile (sprints 2 sem) ou Kanban ?
5. À quelle fréquence souhaitez-vous synchro (weekly/bi-weekly) ?
6. Avez-vous besoin d'environnements staging/prod séparés ?
7. Gérez-vous les déploiements ou voulez-vous que je m'en occupe ?
8. Quel outil pour le suivi (Jira, Trello, GitHub Issues, Linear) ?
9. Format des livrables : PR GitHub ? Démo ? Documentation ?
10. Gestion des changements de scope : comment procède-t-on ?
11. Tests : quel niveau de couverture visez-vous ?
12. Besoin d'assets complémentaires (icônes, images) ?

### Étape 6.2 : Weekly sync (toutes les semaines)

**Durée** : 1h
**Format** : Visio

**Agenda structuré** :

```
0:00-0:15 → Démo ce qui a été fait
  - Développeur montre fonctionnalités terminées
  - Test en live

0:15-0:30 → Revue backlog
  - Ce qui est en cours
  - Ce qui est bloqué
  - Ajustements priorités

0:30-0:45 → Questions/Clarifications
  - Ambiguïtés dans les specs
  - Décisions à prendre ensemble

0:45-1:00 → Planning semaine suivante
  - Objectifs clairs
  - Date prochain sync
```

**Template CR (Compte-Rendu)** :

```markdown
# CR Weekly Sync - Semaine XX
Date : [JJ/MM/AAAA]
Participants : [Noms]

## ✅ Terminé cette semaine
- [Fonctionnalité 1] - [Statut : OK / Issues]
- [Fonctionnalité 2] - [Statut : OK / Issues]

## 🚧 En cours
- [Fonctionnalité 3] - [% avancement]

## 🚨 Bloquants
- [Bloquant 1] - [Action : qui fait quoi]

## 💬 Décisions prises
- [Décision 1]
- [Décision 2]

## 📋 TODO semaine prochaine
- [ ] [Action 1] - [Responsable]
- [ ] [Action 2] - [Responsable]

## 📅 Prochain sync
Date : [JJ/MM/AAAA HH:MM]
```

### Étape 6.3 : Validation par jalons (Milestones)

Définissez **5 jalons de validation** :

**Jalon 1 : Architecture Setup (Fin semaine 2)**
- ✅ Stack technique choisie et validée
- ✅ Environnements dev/staging/prod créés
- ✅ CI/CD pipeline configuré
- ✅ Premier deploy (page "Hello World")

**Jalon 2 : MVP Core (Fin semaine 6)**
- ✅ Articles chargés depuis Supabase (pagination)
- ✅ Analyse IA via OpenRouter fonctionne
- ✅ Matrice de confusion 8x8 interactive
- ✅ Classifications humaines consultables

**Jalon 3 : Features complètes (Fin semaine 9)**
- ✅ Toutes fonctionnalités must-have terminées
- ✅ Gestion multi-prompts (CRUD + export/import)
- ✅ Historique test runs avec comparaison
- ✅ Scatter plot ranking (Concordance vs F1 macro)
- ✅ Système de confiance (HAUTE/MOYENNE/BASSE)

**Jalon 4 : Polish & Tests (Fin semaine 11)**
- ✅ Tests unitaires critiques (couverture 60%+)
- ✅ Tests end-to-end (parcours nominal)
- ✅ Documentation technique à jour
- ✅ Logs et monitoring configurés

**Jalon 5 : Production (Fin semaine 12)**
- ✅ UAT (User Acceptance Testing) validé
- ✅ Déploiement production
- ✅ Formation utilisateurs finaux
- ✅ Handoff maintenance (documentation ops)

**Validation de jalon** :
- Développeur démo en live
- Vous testez vous-même
- Checklist validation complétée
- ✅ GO pour jalon suivant OU ❌ Corrections requises

### Étape 6.4 : Gestion des changements

**Règle d'or** : Tout changement de scope impacte le planning.

**Processus** :

```
1. Idée/demande de changement
   ↓
2. Vous l'évaluez :
   - Est-ce critique ? (bug bloquant → OUI immédiat)
   - Est-ce un "nice to have" ? (peut attendre v2.0)
   - Est-ce ambigu dans specs initiales ? (clarification, pas changement)
   ↓
3. Si changement validé :
   - Développeur estime impact (temps)
   - Négociation :
     Option A : Ajouter au scope → retarde livraison
     Option B : Remplacer une autre fonctionnalité
     Option C : Reporter à v2.0
   ↓
4. Décision documentée dans CR
```

**Phrase magique pour dire NON poliment** :

> "Excellente idée ! Je l'ajoute au backlog v2.0. Pour v1.0, concentrons-nous sur [fonctionnalité prioritaire] pour respecter le planning."

---

## Erreurs fréquentes à éviter

### ❌ Erreur 1 : Spécifier le "COMMENT"

**Mauvais exemple** :
> "Utilisez React avec Redux Toolkit pour la gestion d'état, et créez un store avec 3 slices : articles, predictions, ui. Utilisez createAsyncThunk pour les appels API."

**Bon exemple** :
> "L'état de l'application doit être prévisible et facilement débogable. Gérez les états de chargement, succès et erreur pour chaque appel API."

**Pourquoi** : Vous imposez des choix techniques sans justification métier. Le dev sait mieux que vous.

### ❌ Erreur 2 : Accepter "Je verrai en cours de route"

**Développeur dit** :
> "Pour l'export Excel, je verrai comment structurer les feuilles une fois que j'aurai implémenté le reste."

**Mauvaise réponse** :
> "OK, pas de problème !"

**Bonne réponse** :
> "Je comprends, mais j'ai besoin que l'export contienne au minimum les résultats détaillés par article, la matrice de confusion et les métriques (concordance, F1 macro). Pouvez-vous confirmer que c'est faisable dans le scope ?"

**Pourquoi** : Les ambiguïtés non résolues deviennent des bugs ou retards plus tard.

### ❌ Erreur 3 : Oublier les cas d'erreur

**Spécification incomplète** :
> "Quand l'utilisateur clique sur 'Analyser', l'application appelle l'API et affiche les résultats."

**Spécification complète** :
> "Quand l'utilisateur clique sur 'Analyser' :
> - Afficher spinner de chargement
> - Appeler API avec timeout 120s
> - Si succès : afficher résultats
> - Si timeout : afficher 'L'analyse a pris trop de temps' + bouton Réessayer
> - Si erreur 401 : afficher 'Clé API invalide' + lien vers configuration
> - Si erreur autre : afficher message générique + logs pour debug"

**Pourquoi** : Les cas d'erreur représentent 50% du code. Les oublier = bugs en production.

### ❌ Erreur 4 : Mélanger MVP et version finale

**Backlog confus** :
- Ingestion articles (must)
- Analyse IA (must)
- Authentification SSO (must) ← ⚠️ TROP TÔT
- Dashboard analytics temps réel (must) ← ⚠️ TROP TÔT
- Gestion prompts (should)

**Backlog clair** :
- **v1.0 MVP** : Articles Supabase, Analyse IA, Matrice, Classifications humaines, Basic Auth
- **v1.1** : Multi-prompts, Historique tests, Scatter plot, Confiance, Double déploiement
- **v2.0** : SSO, Dashboard analytics, API publique, Multi-tenant

**Pourquoi** : Un MVP surchargé ne sera jamais livré. Mieux vaut livrer v1.0 simple rapidement, puis itérer.

### ❌ Erreur 5 : Ne pas tester soi-même

**Mauvaise pratique** :
> Développeur : "C'est terminé !"
> Vous : "Super, on déploie !"
> → Bugs découverts par utilisateurs finaux

**Bonne pratique** :
> Développeur : "C'est terminé !"
> Vous : "Génial ! Je teste aujourd'hui et te fais un retour demain."
> → Vous testez chaque User Story selon critères d'acceptation
> → Vous validez OU vous remontez bugs précis

**Pourquoi** : Vous êtes responsable de la qualité. Tester = votre job.

---

## Checklist finale

### ✅ Avant kick-off (Semaine -1)

- [ ] Toutes les fonctionnalités listées dans Excel
- [ ] User Stories rédigées (format : En tant que... Je veux... Afin de...)
- [ ] Critères d'acceptation définis (format Gherkin)
- [ ] Règles métier documentées
- [ ] Wireframes créés (5-7 écrans minimum)
- [ ] UX Guidelines rédigées
- [ ] Données de test préparées dans Supabase (articles + classifications)
- [ ] Configuration Supabase et OpenRouter documentée
- [ ] Package handoff structuré (dossiers + README)
- [ ] Questions pour développeur préparées (12 questions)

### ✅ Pendant kick-off (Jour 1)

- [ ] Contexte métier expliqué clairement
- [ ] Démo POC en live réalisée
- [ ] Spécifications parcourues ensemble
- [ ] Questions développeur notées et répondues
- [ ] Stack technique proposée par dev et validée
- [ ] Estimations initiales obtenues
- [ ] Planning sprints défini
- [ ] Outil de suivi choisi (Jira/Trello/GitHub)
- [ ] Fréquence syncs définie (weekly recommandé)
- [ ] Accès (GitHub, Render, Hostinger, Supabase, OpenRouter) donnés

### ✅ Pendant développement (Sprints)

- [ ] Weekly sync maintenu chaque semaine
- [ ] CR rédigé après chaque sync
- [ ] Fonctionnalités testées par vous avant validation
- [ ] Changements de scope documentés et estimés
- [ ] Jalons validés formellement (démo + checklist)
- [ ] Bugs reportés avec reproduction steps
- [ ] Communication fluide (Slack/Email/Jira)

### ✅ Avant livraison finale (Semaine 12)

- [ ] Toutes fonctionnalités must-have terminées
- [ ] Tests end-to-end passent
- [ ] Documentation technique à jour
- [ ] UAT réalisée par utilisateurs finaux
- [ ] Déploiement production validé
- [ ] Formation utilisateurs effectuée
- [ ] Handoff maintenance documenté
- [ ] Rétrospective projet planifiée

---

## 📚 Ressources complémentaires

### Templates fournis

- `templates/USER_STORY_TEMPLATE.md`
- `templates/ACCEPTANCE_CRITERIA_TEMPLATE.md`
- `templates/MEETING_NOTES_TEMPLATE.md`
- `templates/SPECIFICATIONS_TECHNIQUES.md`
- `templates/HANDOFF_CHECKLIST.md`

### Lectures recommandées

**Product Ownership** :
- "User Story Mapping" - Jeff Patton
- "The Lean Startup" - Eric Ries (méthode MVP)
- "Scrum Guide" (gratuit en ligne)

**Spécifications** :
- "Writing Effective Use Cases" - Alistair Cockburn
- "Specification by Example" - Gojko Adzic

**Communication** :
- "Crucial Conversations" - Patterson et al.
- "Nonviolent Communication" - Marshall Rosenberg

### Outils recommandés (gratuits)

**Wireframes** :
- Figma (gratuit, collaboratif)
- Excalidraw (gratuit, simple)

**Gestion projet** :
- GitHub Issues (si repo GitHub)
- Trello (gratuit, Kanban simple)
- Linear (gratuit pour petites équipes)

**Documentation** :
- Notion (gratuit, wiki collaboratif)
- Google Docs (simple, gratuit)

**Communication** :
- Slack (gratuit jusqu'à 10K messages)
- Discord (gratuit, vocal intégré)

---

## 📦 Backlog exhaustif : Epics & User Stories

Decoupage complet de l'application en Epics et User Stories, avec criteres d'acceptation.

---

### EPIC 1 : Gestion du corpus d'articles

> *Permettre aux utilisateurs de consulter, rechercher, filtrer et enrichir le corpus d'articles Franceinfo.*

**US-1.1 : Consulter la liste des articles**
```
En tant qu'editeur Franceinfo,
Je veux voir la liste de tous les articles charges depuis Supabase,
Afin de parcourir le corpus disponible pour classification.

Criteres d'acceptation :
- Les articles sont charges par pagination (lots de 1000) pour depasser la limite Supabase
- Chaque carte affiche : ID, categorie (badge couleur), titre (lien), chapo (2 lignes), date, nombre de mots
- Les articles sont tries par date de publication decroissante
- Un message "Chargement..." s'affiche pendant le chargement
- En cas d'echec, 4 tentatives automatiques avec 1.5s d'intervalle
```

**US-1.2 : Rechercher un article par titre**
```
En tant qu'editeur,
Je veux saisir un mot-cle pour filtrer les articles par titre,
Afin de retrouver rapidement un article specifique.

Criteres d'acceptation :
- Le filtrage est en temps reel (a chaque caractere saisi)
- La recherche est insensible a la casse
- Un bouton X permet d'effacer la recherche
- Le filtre se combine avec les autres filtres actifs (statut, categorie)
```

**US-1.3 : Filtrer par statut de classification**
```
En tant qu'editeur,
Je veux filtrer les articles par statut (Tous / Classifies / Non classifies),
Afin de me concentrer sur les articles a traiter.

Criteres d'acceptation :
- 3 boutons toggle, un seul actif a la fois
- "Non classifies" est actif par defaut
- Le compteur "X classifies" s'affiche en temps reel (requete Supabase)
```

**US-1.4 : Ajouter un article par URL**
```
En tant qu'editeur,
Je veux coller une URL Franceinfo pour ajouter un article au corpus,
Afin d'enrichir le corpus avec des articles specifiques.

Criteres d'acceptation :
- L'URL est validee (doit contenir un ID numerique de 5-10 chiffres)
- Si l'article existe deja : message "Article deja en base" avec le titre
- Si l'article est nouveau : scraping du titre, chapo, corps via JSON-LD et meta tags
- La date de publication est extraite depuis les meta tags (fallback: date courante)
- Les caracteres de controle sont nettoyes avant insertion
- Le bouton affiche "Chargement..." pendant le traitement
- Sur Render : config chargee depuis les variables d'environnement (pas de config.json)
```

**US-1.5 : Classifier manuellement un article**
```
En tant qu'editeur,
Je veux attribuer un User Need a un article via un menu deroulant,
Afin de constituer le jeu de reference pour evaluer l'IA.

Criteres d'acceptation :
- Menu deroulant avec les 8 User Needs
- La classification est sauvegardee dans Supabase (table human_classifications)
- Le classified_by est "anonymous" par defaut
- Un toast de confirmation s'affiche
- La carte de l'article affiche un badge vert avec le User Need choisi
```

**US-1.6 : Declassifier un article**
```
En tant qu'editeur,
Je veux retirer la classification d'un article,
Afin de corriger une erreur de classification.

Criteres d'acceptation :
- Bouton X visible a cote du badge de classification
- La classification est supprimee dans Supabase
- L'article repasse en "Non classifie"
```

**US-1.7 : Visualiser la repartition du corpus**
```
En tant qu'editeur,
Je veux voir un graphique de repartition des articles classifies par User Need,
Afin de verifier l'equilibre du corpus.

Criteres d'acceptation :
- Graphique a barres horizontales (8 barres, une par User Need)
- Ligne pointillee "ideal" montrant la repartition equilibree
- Indicateur colore (vert/orange/rouge) selon l'equilibre
- Compteur par categorie
- Masque par defaut, toggle via bouton "Repartition"
```

**US-1.8 : Actualiser la liste des articles**
```
En tant qu'editeur,
Je veux rafraichir la liste des articles,
Afin de voir les articles recemment ajoutes.

Criteres d'acceptation :
- Bouton "Actualiser" recharge tous les articles depuis Supabase
- La pagination recharge les lots de 1000
```

---

### EPIC 2 : Analyse IA (classification automatique)

> *Permettre de lancer une analyse IA batch sur les articles classifies humainement, et suivre la progression en temps reel.*

**US-2.1 : Lancer une analyse IA**
```
En tant qu'editeur,
Je veux lancer une analyse IA sur tous les articles classifies,
Afin de comparer les predictions de l'IA a mes classifications.

Criteres d'acceptation :
- Le bouton "Analyse IA" est visible uniquement si >= 1 article classifie
- L'analyse utilise le modele LLM et le prompt actifs
- Les articles sont analyses dans l'ordre de priorite : EXPLAIN ME > UPDATE ME > GIVE ME PERSPECTIVE > puis les autres
- Un test_run est cree dans Supabase avec le nom "{modele} - {prompt}"
- Les boutons Pause/Stop remplacent le bouton Analyse IA pendant l'execution
```

**US-2.2 : Voir le bandeau de configuration pendant l'analyse**
```
En tant qu'editeur,
Je veux voir clairement quel modele LLM et quel prompt sont utilises,
Afin de savoir quel test est en cours.

Criteres d'acceptation :
- Bandeau violet au-dessus de la barre de progression
- Affiche : icone robot + nom du modele + icone document + nom du prompt
- Visible pendant toute la duree de l'analyse
```

**US-2.3 : Suivre la progression en temps reel**
```
En tant qu'editeur,
Je veux voir la progression de l'analyse en temps reel,
Afin d'estimer le temps restant.

Criteres d'acceptation :
- Barre de progression animee (degrade violet/bleu)
- Texte : "Analyse en cours... X/Y articles - Xmin Xs - X.X art/min"
- ETA affichee : "Fin estimee dans Xmin Xs"
- Le compteur ne depasse jamais le total (plafonnement)
- Mise a jour toutes les secondes
```

**US-2.4 : Mettre en pause et reprendre l'analyse**
```
En tant qu'editeur,
Je veux mettre en pause l'analyse pour naviguer librement,
Afin de consulter d'autres sections sans interrompre le test.

Criteres d'acceptation :
- Bouton "Pause" met l'analyse en attente apres l'article en cours
- Le timer s'arrete (le temps de pause est exclu du calcul)
- Bouton "Reprendre" continue a partir de l'article suivant
- La section Articles redevient accessible pendant la pause
```

**US-2.5 : Arreter l'analyse**
```
En tant qu'editeur,
Je veux arreter definitivement l'analyse en cours,
Afin de conserver les resultats partiels.

Criteres d'acceptation :
- Bouton "Stop" arrete l'analyse apres l'article en cours
- Les resultats partiels sont conserves (matrice, tableau, statistiques)
- Le test_run est marque "stopped" dans Supabase
- Le bouton "Reset" apparait pour reinitialiser
```

**US-2.6 : Voir les statistiques resumees**
```
En tant qu'editeur,
Je veux voir les statistiques globales de l'analyse,
Afin d'evaluer rapidement la performance du modele.

Criteres d'acceptation :
- 3 cartes : Total (X/Y), Concordants (nombre + %), Non-concordants (nombre + %)
- Les stats sont calculees depuis articleResults dedupliques (pas de doublons de retries)
- Carte concordants : accent vert
- Carte non-concordants : accent rouge
```

**US-2.7 : Consulter la matrice de confusion interactive**
```
En tant qu'editeur,
Je veux voir la matrice de confusion 8x8,
Afin d'identifier les erreurs de classification par categorie.

Criteres d'acceptation :
- Grille 8x8 (8 User Needs en ligne = attendu, en colonne = predit)
- Diagonale en vert (concordance), hors diagonale en rouge/orange (erreurs)
- Intensite de couleur proportionnelle au nombre d'articles
- Clic sur une cellule filtre le tableau de resultats pour cette transition
- Animation de bordure pulsante sur la cellule selectionnee
- Indicateur "Filtre actif" avec bouton pour effacer
```

**US-2.8 : Voir le flux d'articles analyses en direct**
```
En tant qu'editeur,
Je veux voir les articles apparaitre en temps reel pendant l'analyse,
Afin de suivre les resultats au fil de l'eau.

Criteres d'acceptation :
- Panel "Articles analyses" a droite de la matrice
- Chaque article affiche : numero, titre (tronque), badge transition (attendu -> predit)
- Badge vert si concordant, rouge si non-concordant
- Scroll automatique vers le dernier article ajoute
```

**US-2.9 : Consulter le tableau de resultats detaille**
```
En tant qu'editeur,
Je veux voir un tableau detaille de tous les articles analyses,
Afin d'examiner chaque prediction individuellement.

Criteres d'acceptation :
- 6 colonnes : Numero, Titre (lien), User Need attribue, Prediction IA, Justification, Confiance
- Triable par clic sur l'en-tete de colonne
- Lignes colorees : vert clair si concordant, rouge clair si non-concordant
- Titre cliquable ouvre l'article sur franceinfo.fr
```

**US-2.10 : Filtrer par niveau de confiance**
```
En tant qu'editeur,
Je veux filtrer les resultats par niveau de confiance (Tous / Haute / Moyenne / Basse),
Afin d'analyser les predictions selon leur certitude.

Criteres d'acceptation :
- 4 boutons toggle
- La matrice et les stats se recalculent selon le filtre
- HAUTE : delta >= 30 et ICP >= 18
- MOYENNE : delta 15-29 et ICP 7-17
- BASSE : delta < 15 et ICP < 7
```

**US-2.11 : Filtrer par concordance**
```
En tant qu'editeur,
Je veux filtrer entre articles concordants et non-concordants,
Afin de me concentrer sur les erreurs de l'IA.

Criteres d'acceptation :
- 3 boutons : Tous / Concordants / Non-concordants
- Le tableau et la matrice se mettent a jour
```

**US-2.12 : Voir la justification IA d'un article**
```
En tant qu'editeur,
Je veux voir l'explication de l'IA pour sa prediction,
Afin de comprendre son raisonnement.

Criteres d'acceptation :
- Clic sur l'icone bulle dans la colonne Justification
- Modale affichant : User Need attendu, User Need predit, badge concordance, texte de justification
- Bouton fermer (X)
```

**US-2.13 : Voir le detail de confiance d'un article**
```
En tant qu'editeur,
Je veux voir le detail des 3 predictions avec leurs scores,
Afin de comprendre la certitude de l'IA.

Criteres d'acceptation :
- Clic sur le badge de confiance dans le tableau
- Modale affichant : 3 predictions classees avec scores, delta, ICP, niveau de confiance
```

**US-2.14 : Adapter le prompt automatiquement**
```
En tant qu'editeur,
Je veux demander a l'IA de suggerer des ameliorations au prompt,
Afin d'optimiser les resultats des prochaines analyses.

Criteres d'acceptation :
- Bouton "Adapter le prompt" visible apres une analyse
- Envoie le prompt actuel + les resultats a l'IA
- L'IA retourne un prompt optimise
- Possibilite d'appliquer automatiquement la suggestion
```

**US-2.15 : Reinitialiser les resultats**
```
En tant qu'editeur,
Je veux reinitialiser completement les resultats d'analyse,
Afin de repartir a zero pour un nouveau test.

Criteres d'acceptation :
- Bouton "Reset" efface : matrice, tableau, statistiques, articles analyses
- La section Articles redevient visible
- Le bouton "Analyse IA" reapparait
```

---

### EPIC 3 : Configuration LLM

> *Permettre la selection et la configuration du modele IA utilise pour l'analyse.*

**US-3.1 : Selectionner un modele LLM**
```
En tant qu'editeur,
Je veux choisir parmi 24+ modeles LLM disponibles,
Afin d'utiliser le modele le plus adapte a mes besoins.

Criteres d'acceptation :
- Tableau interactif avec colonnes : Modele, Fournisseur, Qualite (etoiles), Francais, Vitesse, Cout/50 articles
- Clic sur une ligne selectionne le modele
- Badge "Recommande" (vert) sur certains modeles
- Couleurs par fournisseur : Anthropic=violet, OpenAI=vert, Google=bleu, Mistral=orange, Meta=rouge
- Le modele selectionne est sauvegarde dans localStorage
```

**US-3.2 : Configurer la cle API OpenRouter**
```
En tant qu'editeur,
Je veux saisir et sauvegarder ma cle API OpenRouter,
Afin de pouvoir utiliser les modeles LLM.

Criteres d'acceptation :
- Champ de saisie masque (type password)
- Bouton Sauvegarder stocke dans localStorage
- Verification de la longueur de la cle (12+ caracteres)
- Lien vers openrouter.ai pour obtenir une cle
- La cle peut aussi etre definie dans config.json (local) ou variable d'environnement (Render)
```

**US-3.3 : Charger la configuration depuis config.json**
```
En tant qu'editeur,
Je veux que l'app charge automatiquement la configuration,
Afin de ne pas avoir a ressaisir mes parametres.

Criteres d'acceptation :
- En local : charge config.json (cle API, modele par defaut, Supabase)
- Sur Render : fallback vers /api/config (variables d'environnement)
- Si aucune source trouvee : message d'avertissement dans la console
```

---

### EPIC 4 : Gestion des prompts

> *Permettre la creation, edition et gestion de prompts systeme pour l'analyse IA.*

**US-4.1 : Consulter la liste des prompts**
```
En tant qu'editeur,
Je veux voir tous mes prompts disponibles,
Afin de choisir lequel utiliser pour l'analyse.

Criteres d'acceptation :
- Panneau lateral droit
- Chaque prompt affiche : nom, description, badges (ACTIF en vert, PAR DEFAUT)
- Boutons d'action : Voir, Dupliquer, Modifier, Supprimer, Activer
- Le prompt par defaut ne peut pas etre supprime
```

**US-4.2 : Creer un nouveau prompt**
```
En tant qu'editeur,
Je veux creer un prompt personnalise,
Afin de tester differentes strategies de classification.

Criteres d'acceptation :
- Bouton "Creer un prompt" ouvre une modale
- Champs : Nom, Description, Contenu (textarea monospace, 25 lignes)
- Sauvegarde dans Supabase (table prompts)
- Fallback localStorage si Supabase indisponible
```

**US-4.3 : Modifier un prompt existant**
```
En tant qu'editeur,
Je veux editer le contenu d'un prompt,
Afin de l'affiner apres analyse des resultats.

Criteres d'acceptation :
- Modale d'edition pre-remplie avec les valeurs actuelles
- Boutons Annuler / Sauvegarder
- Mise a jour dans Supabase
```

**US-4.4 : Dupliquer un prompt**
```
En tant qu'editeur,
Je veux dupliquer un prompt existant,
Afin de creer une variante sans repartir de zero.

Criteres d'acceptation :
- Cree une copie avec le suffixe "(Copie)" dans le nom
- Le duplicata n'est pas actif par defaut
```

**US-4.5 : Activer un prompt**
```
En tant qu'editeur,
Je veux definir un prompt comme actif,
Afin qu'il soit utilise lors de la prochaine analyse.

Criteres d'acceptation :
- Un seul prompt actif a la fois
- Badge "ACTIF" en vert sur le prompt selectionne
- Le prompt actif est utilise automatiquement par l'analyse IA
```

**US-4.6 : Exporter et importer des prompts**
```
En tant qu'editeur,
Je veux exporter/importer mes prompts en JSON,
Afin de les partager ou sauvegarder.

Criteres d'acceptation :
- Export : telecharge un fichier JSON avec tous les prompts
- Import : charge un fichier JSON et fusionne ou remplace les prompts existants
```

---

### EPIC 5 : Historique et comparaison des tests

> *Permettre de consulter l'historique des tests IA et comparer les performances entre modeles/prompts.*

**US-5.1 : Consulter l'historique des tests**
```
En tant qu'editeur,
Je veux voir la liste de tous les tests effectues,
Afin de retrouver les resultats passes.

Criteres d'acceptation :
- Onglet "Historique" dans le panneau Tests
- Chaque test affiche : date, statut (badge), modele LLM (badge couleur), nombre d'articles, concordance %
- Groupes par prompt utilise
- Boutons : Voir details, Supprimer
```

**US-5.2 : Recharger les resultats d'un test passe**
```
En tant qu'editeur,
Je veux recharger les resultats complets d'un test,
Afin de reanalyser la matrice et le tableau detaille.

Criteres d'acceptation :
- Clic sur "Voir" recharge : matrice de confusion, tableau de resultats, statistiques
- Les donnees proviennent de Supabase (test_runs + ai_analyses)
```

**US-5.3 : Comparer deux tests cote a cote**
```
En tant qu'editeur,
Je veux comparer 2 tests selectionnes,
Afin d'identifier le meilleur couple modele/prompt.

Criteres d'acceptation :
- Checkbox de selection sur chaque test (max 2)
- Bouton "Comparer" affiche un tableau comparatif
- Colonnes : Metrique, Test A, Test B, Meilleur
- Metriques comparees : concordance, precision, rappel, F1 macro
- Couleurs : vert pour le meilleur, rouge pour le moins bon
- Analyse IA generee automatiquement avec recommandation
```

**US-5.4 : Consulter le classement (scatter plot)**
```
En tant qu'editeur,
Je veux voir un scatter plot Concordance vs F1 macro de tous les tests,
Afin d'identifier visuellement les meilleurs performers.

Criteres d'acceptation :
- Onglet "Classement" dans le panneau Tests
- Axe X : Concordance (%), Axe Y : F1 macro (%)
- Points colores par fournisseur de modele
- Nombre d'articles affiche a l'interieur de chaque bulle
- Trophee sur le meilleur point (F1 le plus eleve)
- Zone "best" en haut a droite (fond violet subtil)
- Tooltip au survol avec details du test
```

**US-5.5 : Filtrer le scatter plot par modele**
```
En tant qu'editeur,
Je veux filtrer les points du scatter par fournisseur de modele,
Afin de comparer les performances au sein d'une famille de modeles.

Criteres d'acceptation :
- Boutons toggle : Tous + un bouton par modele present
- Selection multiple possible
- Le scatter plot et le tableau se mettent a jour
```

**US-5.6 : Filtrer le scatter plot par prompt**
```
En tant qu'editeur,
Je veux filtrer les points par prompt utilise,
Afin de comparer l'impact des differents prompts.

Criteres d'acceptation :
- Boutons toggle : Tous + un bouton par prompt utilise
- Selection multiple possible
- Le scatter plot et le tableau se mettent a jour
```

**US-5.7 : Filtrer le scatter plot par volume d'articles**
```
En tant qu'editeur,
Je veux filtrer les tests par volume minimum d'articles analyses,
Afin de ne considerer que les tests statistiquement significatifs.

Criteres d'acceptation :
- Slider (range input) avec min/max dynamiques
- Label affichant ">= X articles"
- Le scatter plot et le tableau se mettent a jour en temps reel
```

**US-5.8 : Consulter le tableau de classement**
```
En tant qu'editeur,
Je veux voir un tableau de classement des tests,
Afin de comparer les metriques de facon precise.

Criteres d'acceptation :
- Colonnes : Rang, Modele, Prompt, Concordance, Precision, Rappel, F1 macro, Articles, Date
- Triable par clic sur chaque en-tete (ascendant/descendant)
- Medaille pour le meilleur test
- Metriques colorees (vert=meilleur, rouge=pire)
- Respecte les filtres actifs (modele, prompt, volume)
```

---

### EPIC 6 : Ingestion automatique d'articles

> *Alimenter automatiquement le corpus depuis les flux RSS Franceinfo.*

**US-6.1 : Fetch automatique des flux RSS**
```
En tant que systeme,
Je veux recuperer les articles des flux RSS Franceinfo toutes les 30 minutes,
Afin de maintenir le corpus a jour.

Criteres d'acceptation :
- 6 flux RSS : Titres, Politique, Monde, Societe, Economie, Culture
- Extraction : titre, chapo, URL, date de publication, categorie
- Scraping du corps complet via JSON-LD (articleBody)
- Detection du type de media (@type: article, video, autre)
- Deduplication par external_id
- Timeout de 15s par requete
```

**US-6.2 : Scraper le corps d'un article**
```
En tant que systeme,
Je veux extraire le corps complet d'un article depuis son URL,
Afin de fournir le texte integral a l'IA pour classification.

Criteres d'acceptation :
- Extraction depuis les blocs JSON-LD (script type="application/ld+json")
- Recherche recursive de la cle "articleBody"
- Parsing avec strict=False pour tolerer les caracteres de controle
- Nettoyage des caracteres de controle (0x00-0x1F, 0x7F)
- Fallback : corps vide si scraping echoue
```

---

### EPIC 7 : Infrastructure et deploiement

> *Assurer le deploiement, la securite et la disponibilite de l'application.*

**US-7.1 : Deploiement automatique sur Render**
```
En tant que developpeur,
Je veux que chaque push sur main declenche un deploiement sur Render,
Afin de mettre en production sans intervention manuelle.

Criteres d'acceptation :
- Auto-deploy configure sur Render (branche main)
- Variables d'environnement : SUPABASE_URL, SUPABASE_ANON_KEY, OPENROUTER_API_KEY, BASIC_AUTH_USER, BASIC_AUTH_PASSWORD
- Commande de demarrage : python server.py
- Le endpoint /api/config sert la configuration depuis les variables d'environnement
```

**US-7.2 : Deploiement automatique sur Hostinger**
```
En tant que developpeur,
Je veux que les mises a jour soient deployees automatiquement sur Hostinger,
Afin de maintenir les deux environnements synchronises.

Criteres d'acceptation :
- Script deploy.sh execute par cron toutes les 2 minutes
- Compare le commit local vs origin/main
- Si different : git pull + kill server.py + relance
- Logs dans /var/log/userneed-deploy.log
```

**US-7.3 : Authentification Basic Auth**
```
En tant qu'editeur,
Je veux que l'acces a l'application soit protege par mot de passe,
Afin d'empecher l'acces non autorise.

Criteres d'acceptation :
- Protection Basic Auth sur les pages HTML (GET)
- Les endpoints /api/ sont exemptes d'auth (appeles par le JS apres login)
- Les requetes OPTIONS (preflight CORS) sont exemptees
- Identifiants configures via variables d'environnement (BASIC_AUTH_USER, BASIC_AUTH_PASSWORD)
- Si variables non definies : auth desactivee (mode local)
```

**US-7.4 : Verification de sante du serveur**
```
En tant que systeme,
Je veux verifier que le serveur proxy est accessible au demarrage,
Afin d'alerter l'utilisateur si le backend est indisponible.

Criteres d'acceptation :
- Ping /api/health au chargement de l'application
- Reponse attendue : {"status": "ok", "timestamp": ..., "provider": "openrouter", "default_model": ...}
- Si echec : alerte rouge avec instructions pour demarrer le serveur
```

**US-7.5 : Fallback localStorage**
```
En tant que systeme,
Je veux basculer sur localStorage si Supabase est indisponible,
Afin de garantir un fonctionnement minimal sans base de donnees.

Criteres d'acceptation :
- Les prompts sont sauvegardes en localStorage en fallback
- Migration automatique localStorage -> Supabase au retour de la connexion
- Les articles necessitent Supabase (pas de fallback)
```

---

### EPIC 8 : Aide et onboarding

> *Accompagner les utilisateurs dans la prise en main de l'application.*

**US-8.1 : Consulter l'aide complete**
```
En tant qu'editeur,
Je veux acceder a un guide utilisateur complet,
Afin de comprendre toutes les fonctionnalites de l'application.

Criteres d'acceptation :
- Bouton "? Aide" dans la navigation
- Modale centree avec scroll interne
- 10+ sections : presentation, 8 User Needs, classifier, lancer analyse, lire resultats, gerer prompts, configurer LLM, comparer tests, FAQ
- Tableau des 8 User Needs avec definitions et exemples
- Fermeture par X ou touche Echap
```

**US-8.2 : Notifications toast**
```
En tant qu'editeur,
Je veux recevoir des notifications visuelles pour les actions importantes,
Afin d'avoir un feedback clair sur mes actions.

Criteres d'acceptation :
- Position : coin superieur droit
- Animation : slide-in depuis la droite
- Types : succes (bordure verte), erreur (bordure rouge)
- Duree : 4-5 secondes, auto-dismiss
```

---

### Resume du backlog

| Epic | Nb US | Priorite |
|------|-------|----------|
| 1. Gestion du corpus | 8 | Must |
| 2. Analyse IA | 15 | Must |
| 3. Configuration LLM | 3 | Must |
| 4. Gestion des prompts | 6 | Must |
| 5. Historique et comparaison | 8 | Should |
| 6. Ingestion automatique | 2 | Must |
| 7. Infrastructure et deploiement | 5 | Must |
| 8. Aide et onboarding | 2 | Should |
| **TOTAL** | **49 User Stories** | |

---

## 🎓 Conclusion

**Vous avez maintenant TOUTES les clés** pour réussir votre handoff développeur !

**Les 3 règles d'or** :

1. **Clarté > Exhaustivité** : Mieux vaut specs simples et claires que specs complètes mais confuses
2. **Collaboration > Spécification** : Le développeur est votre partenaire, pas un exécutant
3. **Itération > Perfection** : Livrez v1.0 simple rapidement, améliorez ensuite

**Prochaines étapes** :

1. ✅ Suivre ce guide phase par phase
2. ✅ Utiliser les templates fournis
3. ✅ Préparer package handoff
4. ✅ Organiser kick-off
5. ✅ Maintenir communication régulière
6. 🎉 Livrer avec succès !

**Bonne chance !** 🚀

---

**Document créé le** : 16/02/2026
**Dernière mise à jour** : 31/03/2026
**Version** : 2.0
**Auteur** : Claude Sonnet 4.5 (pour Livio Ricci, France Télévisions)
