# Vision Produit V2 - Analyse IA des User Needs

**Document** : Vision produit pour la version industrialisee de l'application
**Date** : 31/03/2026
**Auteur** : Livio Ricci / Claude Opus 4.6 - France Televisions
**Statut** : Draft strategique

---

## 1. Constat sur le POC actuel

### Ce qui fonctionne bien
- Le concept est valide : comparer classification humaine vs IA sur 8 User Needs
- Le corpus est riche (3300+ articles Franceinfo)
- L'analyse IA est operationnelle (24+ modeles, multi-prompts)
- La matrice de confusion et les metriques (F1 macro, concordance) donnent des insights reels
- Le scatter plot permet de comparer les performances entre tests
- Le double deploiement (Render + Hostinger) assure la disponibilite

### Ce qui bloque la scalabilite
| Probleme | Impact | Gravite |
|----------|--------|---------|
| **8 User Needs en dur** dans le code, la BDD et les prompts | Impossible d'ajouter/supprimer un User Need sans modifier 7+ fichiers | Critique |
| **Definitions des User Needs dans les prompts** | Chaque prompt duplique les definitions, risque de derive | Critique |
| **script.js = 5143 lignes monolithiques** | Impossible a maintenir, tester ou faire evoluer | Haute |
| **Matrice de confusion en dur (8x8, magic number 64)** | Casse si on change le nombre de User Needs | Haute |
| **Navigation par panneaux lateraux** | 6+ clics pour comparer 2 tests, pas de vue d'ensemble | Moyenne |
| **Pas de gestion multi-utilisateurs** | Toutes les classifications sont "anonymous" | Moyenne |
| **Pas de versionning des definitions** | On ne sait pas quelle definition a produit quel resultat | Moyenne |

---

## 2. Principes directeurs de la V2

### 2.1 Architecture pilotee par la configuration

> **Rien ne doit etre en dur.** Les User Needs, les modeles LLM, les couleurs, les definitions sont des donnees, pas du code.

Tout changement de taxonomie (ajout d'un 9e User Need, renommage, suppression) doit se faire **sans toucher au code** — uniquement via l'interface d'administration.

### 2.2 Separation des responsabilites

> **Le prompt dit COMMENT analyser. Les definitions disent QUOI chercher.**

Le prompt contient les instructions d'analyse (format de reponse, ton, methode). Les definitions des User Needs sont un module a part, injectable dans le prompt au moment de l'analyse.

### 2.3 Navigation orientee tache

> **Chaque action courante doit etre faisable en 2 clics maximum.**

Classifier un article : 1 clic. Lancer une analyse : 1 clic. Comparer 2 tests : 2 clics (select + compare). Voir pourquoi l'IA s'est trompee : 1 clic.

### 2.4 Design professionnel

> **L'app doit inspirer confiance aux stakeholders et etre agreable a utiliser au quotidien.**

Inspiration : Linear, Vercel Dashboard, Mixpanel. Pas de surcharge visuelle, pas de panneaux qui s'empilent. Des espaces genereux, des transitions fluides, une typographie claire.

---

## 3. Architecture fonctionnelle V2

### 3.1 Navigation principale : sidebar fixe + contenu principal

Abandon des onglets en header + panneaux lateraux. On passe a une **sidebar fixe a gauche** avec les sections principales, et un **contenu principal** a droite.

```
+------------------+--------------------------------------------------+
|                  |                                                  |
|   [Logo FTV]     |           CONTENU PRINCIPAL                      |
|                  |                                                  |
|   Dashboard      |   (change selon la section selectionnee)         |
|   Articles       |                                                  |
|   Analyse IA     |                                                  |
|   Resultats      |                                                  |
|   Tests          |                                                  |
|                  |                                                  |
|   -----------    |                                                  |
|   Configuration  |                                                  |
|     User Needs   |                                                  |
|     Prompts      |                                                  |
|     Modeles LLM  |                                                  |
|                  |                                                  |
|   -----------    |                                                  |
|   ? Aide         |                                                  |
|                  |                                                  |
+------------------+--------------------------------------------------+
```

**Avantages** :
- Navigation toujours visible (pas de panneau a ouvrir/fermer)
- Structure claire entre "operer" (haut) et "configurer" (bas)
- Le contenu principal occupe tout l'espace disponible
- La sidebar peut se replier en icones sur les petits ecrans

### 3.2 Les 5 sections principales

#### Section 1 : Dashboard (page d'accueil)

Vue d'ensemble rapide de l'etat du projet :

```
+--------------------------------------------------+
|  DASHBOARD                                        |
|                                                   |
|  [3347 articles]  [335 classifies]  [8 User Needs]|
|                                                   |
|  Repartition du corpus          Dernier test      |
|  [========= barchart =========] Claude 3.5 Haiku  |
|                                 F1: 71.0%         |
|                                 26/03/2026         |
|                                                   |
|  Activite recente                                 |
|  - 12 articles classifies aujourd'hui             |
|  - Test lance : gemini-flash + Prompt V4          |
|  - 5 nouveaux articles depuis le RSS              |
+--------------------------------------------------+
```

**Pourquoi** : Aujourd'hui l'app n'a pas de vue d'ensemble. L'utilisateur doit naviguer entre 4 panneaux pour comprendre l'etat du projet.

#### Section 2 : Articles

Meme fonction qu'aujourd'hui, avec ameliorations :

- **Recherche plein texte** (titre + chapo + corps) cote serveur via Supabase
- **Filtres combines** : statut + categorie + date + type media (tous dans une barre de filtres horizontale)
- **Classification en masse** : selectionner plusieurs articles, clic droit > "Classifier comme..."
- **Raccourcis clavier** : `1-8` pour classifier l'article en focus
- **Annuler** : Ctrl+Z pour defaire la derniere classification
- **Vue compacte / vue etendue** : toggle pour voir plus d'articles ou plus de details

#### Section 3 : Analyse IA

Page dediee au lancement et suivi d'analyse :

```
+--------------------------------------------------+
|  ANALYSE IA                                       |
|                                                   |
|  Modele : [Claude 3.5 Haiku v]                    |
|  Prompt : [Prompt V3 v]                           |
|  Definitions : [Standard v2 v]                    |
|                                                   |
|  Articles a analyser : 335 classifies             |
|  Cout estime : ~$0.45                             |
|  Duree estimee : ~25 min                          |
|                                                   |
|  [ Lancer l'analyse ]                             |
+--------------------------------------------------+
```

**Ameliorations** :
- Tout est visible AVANT de lancer (modele, prompt, definitions, estimation)
- Selection explicite du jeu de definitions (pas enfoui dans le prompt)
- Estimation du cout et de la duree avant lancement
- Possibilite de selectionner un sous-ensemble d'articles (par filtre ou selection manuelle)

#### Section 4 : Resultats

Affichage des resultats de l'analyse en cours ou du dernier test :

- **Bandeau de contexte** permanent : modele + prompt + definitions + date
- **Vue unifiee** pour un article : clic sur un article ouvre un **panneau de detail** avec :
  - Titre + chapo + lien
  - Classification humaine (avec raison si fournie)
  - Prediction IA + 3 scores + justification
  - Badge concordance/non-concordance
  - Bouton "Reclassifier" (changer la classification humaine)
- **Matrice de confusion dynamique** : taille NxN (N = nombre de User Needs actifs)
- **Filtres combines** : confiance + concordance + User Need specifique

#### Section 5 : Tests

Page dediee a l'historique et la comparaison :

**Vue par defaut : tableau + scatter plot cote a cote**

```
+---------------------------+---------------------------+
|  SCATTER PLOT              |  TABLEAU DE CLASSEMENT    |
|  (Concordance vs F1)      |  # Modele  Prompt  F1    |
|                            |  1 Claude  V3     71.0%  |
|  [filtres: modele,         |  2 Gemini  V3     70.2%  |
|   prompt, volume]          |  3 Mistral V2     68.5%  |
|                            |                          |
|  [points interactifs]      |  [triable par colonne]   |
+---------------------------+---------------------------+
```

**Ameliorations** :
- Scatter plot et tableau toujours visibles ensemble (pas dans un panneau)
- Clic sur un point du scatter = highlight dans le tableau et vice versa
- Selection de 2 tests directement depuis le scatter (clic + shift-clic)
- Comparaison s'ouvre en overlay sans perdre le contexte
- **Timeline** : vue chronologique de l'evolution des performances

---

## 4. Module "User Needs" (coeur de la V2)

### 4.1 Probleme actuel

Les User Needs sont definis a **7 endroits differents** :
1. Constante JS `USERNEEDS[]`
2. Mapping couleurs `USERNEED_COLORS{}`
3. Variants de normalisation `USERNEED_VARIANTS{}`
4. Contrainte SQL `CHECK (userneed IN (...))`
5. Texte du prompt (section #DEFINITIONS)
6. Labels HTML de la matrice de confusion (2 axes)
7. Tableau d'aide (modale)

Ajouter un 9e User Need oblige a modifier ces 7 endroits + retester toute l'app.

### 4.2 Architecture cible

```
+-------------------+
|  SUPABASE TABLE   |
|  user_needs       |
|  - id             |
|  - name           |
|  - description    |
|  - color          |
|  - short_label    |
|  - examples       |
|  - is_active      |
|  - sort_order     |
|  - created_at     |
+-------------------+
        |
        | charge au demarrage
        v
+-------------------+
|  MODULE JS        |
|  userNeedStore    |
|  - list()         |  → retourne les User Needs actifs
|  - getColor(id)   |  → retourne la couleur
|  - getLabel(id)   |  → retourne le label court (pour la matrice)
|  - normalize(str) |  → normalise les variantes
+-------------------+
        |
        | utilise par
        v
+--------------------------------------------------+
| Matrice (NxN)  | Prompts | Dropdowns | Charts    |
| Dynamique      | Injecte | Generes   | Colores   |
|                | les def.| automati- | automati- |
|                | au      | quement   | quement   |
|                | runtime |           |           |
+--------------------------------------------------+
```

### 4.3 Table `user_needs` (nouvelle)

```sql
CREATE TABLE user_needs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,          -- 'UPDATE ME'
    short_label TEXT NOT NULL,          -- 'Update' (pour la matrice)
    description TEXT NOT NULL,          -- Definition complete
    examples TEXT,                      -- Exemples d'articles
    color TEXT NOT NULL DEFAULT '#94a3b8', -- Couleur hex
    icon TEXT DEFAULT '',               -- Emoji optionnel
    is_active BOOLEAN DEFAULT true,     -- Permet de desactiver sans supprimer
    sort_order INTEGER DEFAULT 0,       -- Ordre d'affichage
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 4.4 Impact sur les autres tables

**human_classifications** : remplacer le CHECK contraint par une foreign key
```sql
-- Avant
userneed TEXT NOT NULL CHECK (userneed IN ('UPDATE ME', ...))

-- Apres
userneed_id UUID NOT NULL REFERENCES user_needs(id)
```

**ai_analyses** : idem pour `predicted_userneed`

**Avantage** : la base de donnees accepte automatiquement tout nouveau User Need sans migration.

### 4.5 Interface d'administration des User Needs

Accessible depuis la sidebar : **Configuration > User Needs**

```
+--------------------------------------------------+
|  USER NEEDS                          [+ Ajouter] |
|                                                   |
|  [drag] UPDATE ME          #3b82f6   [actif] [v] |
|          Information factuelle breve...            |
|                                                   |
|  [drag] EXPLAIN ME         #10b981   [actif] [v] |
|          Vulgarisation, pedagogie...              |
|                                                   |
|  [drag] GIVE ME PERSPECTIVE #8b5cf6  [actif] [v] |
|          Analyse, opinion, debat...               |
|                                                   |
|  ...                                              |
|                                                   |
|  [drag] EXPERIMENTAL TEST   #gray   [inactif][v] |
|          User Need de test (desactive)            |
+--------------------------------------------------+
```

**Fonctionnalites** :
- Drag & drop pour reordonner
- Clic sur une ligne pour editer (nom, description, exemples, couleur)
- Toggle actif/inactif (desactiver masque le User Need partout sans supprimer les donnees)
- Ajouter un nouveau User Need
- Previsualisation de la matrice (NxN) en temps reel
- Alerte si un User Need est supprime alors que des classifications l'utilisent

### 4.6 Injection dans les prompts

Le prompt ne contient PLUS les definitions. A la place, un placeholder est remplace au runtime :

```
# PROMPT (stocke en base)
Tu es un classificateur d'articles de presse.

{{USER_NEEDS_DEFINITIONS}}

Analyse l'article suivant et classifie-le...
```

Au lancement de l'analyse, le systeme :
1. Charge les User Needs actifs depuis Supabase
2. Genere le bloc de definitions :
   ```
   #DEFINITIONS DES USERNEEDS
   1. UPDATE ME - Information factuelle breve sur un evenement en cours...
   2. EXPLAIN ME - Vulgarisation d'un sujet complexe...
   ...
   ```
3. Remplace `{{USER_NEEDS_DEFINITIONS}}` dans le prompt
4. Envoie le prompt complet au LLM

**Avantage** : un seul endroit pour les definitions. Tous les prompts utilisent les memes definitions, automatiquement a jour.

### 4.7 Versionning des definitions

Chaque test_run enregistre un **snapshot des definitions utilisees** :

```sql
ALTER TABLE test_runs ADD COLUMN userneed_definitions JSONB;
-- Stocke : [{"name": "UPDATE ME", "description": "..."}, ...]
```

Cela permet de :
- Savoir exactement quelles definitions ont produit quel resultat
- Comparer les performances entre deux versions de definitions
- Reproduire un test a l'identique

---

## 5. Fusion et simplification des modules

### 5.1 Avant (POC) vs Apres (V2)

| POC | V2 | Justification |
|-----|-----|---------------|
| Onglet Articles + panneau LLM + panneau Prompts + panneau Tests | 5 pages dans la sidebar | Chaque page a son espace complet |
| Panneau LLM (lateral) | Page Configuration > Modeles | Plus d'espace pour le tableau des modeles |
| Panneau Prompts (lateral) | Page Configuration > Prompts | Plus d'espace pour l'editeur |
| Panneau Tests : onglet Historique | Page Tests (vue par defaut) | Toujours visible, pas enfoui |
| Panneau Tests : onglet Classement | Page Tests (scatter + tableau cote a cote) | Vue d'ensemble permanente |
| Matrice + tableau dans la page Articles | Page Resultats dediee | Separation entre "classifier" et "analyser les resultats" |
| Pas de dashboard | Page Dashboard | Vue d'ensemble rapide |
| Definitions dans les prompts | Page Configuration > User Needs | Source unique de verite |

### 5.2 Reduction du nombre de clics

| Action | POC (clics) | V2 (clics) |
|--------|-------------|------------|
| Classifier un article | 2 (dropdown + selection) | 1 (raccourci clavier) ou 2 |
| Classifier 10 articles identiques | 20 | 3 (selection multiple + classification en masse) |
| Lancer une analyse | 1 | 1 (tout est pre-configure) |
| Comparer 2 tests | 6+ | 2 (shift-clic sur 2 points du scatter) |
| Voir pourquoi l'IA s'est trompee | 3 (tableau > bulle > modale) | 1 (clic sur l'article, detail unifie) |
| Changer le modele LLM | 3 (ouvrir panneau > chercher > clic) | 2 (page config > clic) |
| Modifier une definition | Impossible (enfoui dans le prompt) | 2 (page User Needs > clic sur la ligne) |

---

## 6. Design et experience utilisateur

### 6.1 Principes visuels

**Palette** :
- Fond : gris tres fonce (#0f172a) avec cartes en gris legerement plus clair (#1e293b)
- Texte : blanc casse (#f1f5f9) et gris moyen (#94a3b8)
- Accent principal : violet (#8b5cf6) pour les actions et la selection
- Couleurs semantiques : vert (#10b981) pour le succes, rouge (#ef4444) pour les erreurs
- Chaque User Need conserve sa couleur propre (configurable)

**Typographie** :
- Titres : Inter ou Geist (plus moderne que Poppins)
- Corps : Inter, 14px de base
- Code/metriques : JetBrains Mono ou SF Mono
- Hierarchie claire : 4 niveaux de titres max

**Composants** :
- Cards avec bordure subtile, coins arrondis 12px, ombre douce
- Boutons : primaire (violet plein), secondaire (outline), ghost (texte seul)
- Badges : coins tres arrondis, petits, colores
- Modales : fond flou (backdrop-filter), animation scale-in
- Toasts : coin inferieur droit (pas superieur), animation slide-up
- Tables : en-tetes sticky, hover sur lignes, tri par clic

**Animations** :
- Transitions de page : fade 200ms
- Ouverture de modales : scale(0.95) -> scale(1) + fade, 250ms
- Hover sur cartes : elevation subtile (translateY -2px)
- Barre de progression : animation fluide de la largeur
- Apparition d'elements : fade-in echelonne (stagger 50ms entre elements)

### 6.2 Responsive

| Breakpoint | Layout |
|-----------|--------|
| >= 1440px | Sidebar etendue (icones + texte) + contenu plein |
| 1024-1439px | Sidebar replice (icones seules) + contenu plein |
| 768-1023px | Sidebar masquee (burger menu) + contenu plein |
| < 768px | Non supporte (afficher message "Version desktop requise") |

### 6.3 Accessibilite

- Contrastes WCAG AA minimum (4.5:1 pour le texte)
- Focus visible sur tous les elements interactifs
- Ordre de tabulation logique
- Labels ARIA sur les elements interactifs non-textuels
- Raccourcis clavier documentes dans la modale d'aide

---

## 7. Metriques et KPIs detailles

### 7.1 Metriques existantes a conserver

| Metrique | Definition | Usage |
|----------|-----------|-------|
| **Concordance** (Accuracy) | Predictions correctes / total | Vue globale de la performance |
| **Precision macro** | Moy. des precisions par User Need | Qualite des predictions positives |
| **Rappel macro** | Moy. des rappels par User Need | Capacite a detecter chaque User Need |
| **F1 macro** | Moy. harmonique precision/rappel par User Need | Metrique principale de classement |
| **Confiance (Delta)** | Score P1 - Score P2 | Certitude de la prediction principale |
| **Confiance (ICP)** | (Delta / 100) * Score P1 | Indice de confiance pondere |

### 7.2 Nouvelles metriques a ajouter

| Metrique | Definition | Interet |
|----------|-----------|---------|
| **F1 par User Need** | F1 individuel pour chaque categorie | Identifier les User Needs problematiques |
| **Matrice de confusion normalisee** | Pourcentages au lieu de comptes absolus | Comparer des tests de tailles differentes |
| **Cohen's Kappa** | Accord inter-annotateur corrige du hasard | Plus fiable que la concordance brute |
| **Top-2 Accuracy** | % ou la bonne reponse est dans les 2 premieres predictions | Mesure de la pertinence globale |
| **Temps moyen par article** | Duree moyenne d'analyse par article | Benchmark de performance/cout |
| **Cout total du test** | Nombre de tokens * prix du modele | Suivi budgetaire |
| **Evolution temporelle** | Graphique F1 macro au fil des tests | Voir si les prompts/modeles s'ameliorent |

### 7.3 Tableau de bord des metriques

Sur la page Resultats, un bloc de metriques avancees :

```
+--------------------------------------------------+
|  METRIQUES DETAILLEES                             |
|                                                   |
|  F1 macro : 71.0%    Kappa : 0.64                |
|  Concordance : 68.5% Top-2 : 89.2%              |
|  Precision : 74.6%   Rappel : 69.5%              |
|                                                   |
|  Cout : $0.38        Duree : 33min               |
|  Vitesse : 10.1 art/min                          |
|                                                   |
|  F1 par User Need :                              |
|  UPDATE ME ......... 82%  ████████░░              |
|  EXPLAIN ME ........ 75%  ███████░░░              |
|  PERSPECTIVE ....... 68%  ██████░░░░              |
|  BREAK ............. 54%  █████░░░░░              |
|  CONCERNING ........ 71%  ███████░░░              |
|  INSPIRE ME ........ 63%  ██████░░░░              |
|  FEEL THE NEWS ..... 59%  █████░░░░░              |
|  REVEAL NEWS ....... 66%  ██████░░░░              |
+--------------------------------------------------+
```

---

## 8. Evolutions fonctionnelles avancees

### 8.1 Mode "Audit" : comprendre les desaccords

Quand l'IA et l'humain ne sont pas d'accord, une vue dediee permet d'analyser :

```
+--------------------------------------------------+
|  AUDIT : Article #7893023                         |
|                                                   |
|  Titre : "L'augmentation de 10$ du baril..."     |
|  [Lire l'article complet]                         |
|                                                   |
|  +---------------------+----------------------+  |
|  | CLASSIFICATION      | PREDICTION IA        |  |
|  | HUMAINE             |                      |  |
|  |                     |                      |  |
|  | EXPLAIN ME          | UPDATE ME            |  |
|  |                     | Confiance: HAUTE     |  |
|  | (pas de raison      | Score: 72/100        |  |
|  |  fournie)           |                      |  |
|  +---------------------+----------------------+  |
|                                                   |
|  JUSTIFICATION IA :                               |
|  "L'article rapporte les propos d'un economiste   |
|  sur l'impact du baril, ce qui releve davantage   |
|  d'une information factuelle que d'une            |
|  vulgarisation..."                                |
|                                                   |
|  3 PREDICTIONS :                                  |
|  1. UPDATE ME ......... 72/100                    |
|  2. EXPLAIN ME ........ 45/100                    |
|  3. GIVE ME PERSPECTIVE 38/100                    |
|                                                   |
|  [ Confirmer ma classification ]                  |
|  [ Accepter la prediction IA ]                    |
|  [ Reclassifier manuellement v ]                  |
+--------------------------------------------------+
```

**Interet** : permet de trancher rapidement les desaccords et d'ameliorer le corpus de reference.

### 8.2 Classification assistee par IA

Avant de classifier un article, l'utilisateur peut demander une **suggestion IA** :

```
Article : "Comment le moustique tigre a envahi la France..."

IA suggere : EXPLAIN ME (confiance: 85%)
Raison : "Article pedagogique expliquant un phenomene..."

[ Accepter ] [ Refuser et classifier manuellement ]
```

Cela accelere la constitution du corpus de reference tout en laissant l'humain trancher.

### 8.3 Gestion multi-utilisateurs

- Chaque utilisateur a un profil (nom, email)
- Les classifications portent l'identifiant de l'utilisateur
- Possibilite de calculer l'**accord inter-annotateur** (Cohen's Kappa entre 2 classifieurs humains)
- Dashboard des contributions (qui a classifie combien d'articles)

### 8.4 Export et partage

- **Export PDF** des resultats d'un test (matrice + stats + top erreurs)
- **Export CSV** detaille (comme aujourd'hui, ameliore)
- **Lien partageable** vers un test run (lecture seule)
- **Rapport automatique** genere par l'IA : resume des forces/faiblesses, recommandations

### 8.5 Historique et tendances

- **Graphique temporel** : evolution du F1 macro au fil des tests
- **Comparaison avant/apres** : quand on change de prompt ou de modele, voir l'impact
- **Alertes** : notification si les performances baissent significativement
- **Benchmark** : comparer avec des resultats de reference (ex: humain vs humain)

### 8.6 Integration continue

- **Webhook** : declencher une analyse automatiquement a chaque nouveau batch d'articles
- **API REST** : permettre d'integrer l'outil dans un pipeline de production
- **Scheduler** : programmer des analyses recurrentes (chaque lundi, analyser les nouveaux articles)

---

## 9. Architecture technique cible

### 9.1 Stack recommandee

| Couche | Technologie | Justification |
|--------|-------------|---------------|
| **Frontend** | Next.js (React) ou Nuxt (Vue) | SSR, routing, composants, ecosysteme riche |
| **UI** | Tailwind CSS + Radix UI (ou shadcn/ui) | Design system coherent, accessible, rapide |
| **Backend** | Supabase (existant) + Edge Functions | Pas de serveur a gerer, auth integree, realtime |
| **IA** | OpenRouter (existant) | Multi-modeles, pay-per-use |
| **Auth** | Supabase Auth | Remplace le Basic Auth, multi-utilisateurs |
| **Deploiement** | Vercel ou Render | Auto-deploy, preview branches, CDN |
| **Monitoring** | Sentry + Supabase Dashboard | Erreurs, performance, usage |

### 9.2 Structure du code

```
src/
  app/                      # Pages (Next.js App Router)
    dashboard/
    articles/
    analysis/
    results/
    tests/
    config/
      user-needs/
      prompts/
      models/
  components/               # Composants UI reutilisables
    ui/                     # Boutons, badges, modales, tables
    charts/                 # Matrice, scatter, barres
    article/                # ArticleCard, ArticleDetail
    analysis/               # ProgressBar, ConfigBanner
  lib/                      # Logique metier
    user-needs.ts           # Store et helpers User Needs
    analysis.ts             # Orchestration de l'analyse
    metrics.ts              # Calcul des metriques (F1, kappa, etc.)
    prompt-builder.ts       # Construction du prompt avec injection des definitions
    openrouter.ts           # Client API OpenRouter
  hooks/                    # React hooks personnalises
    useArticles.ts
    useAnalysis.ts
    useTestRuns.ts
  types/                    # Types TypeScript
    user-need.ts
    article.ts
    test-run.ts
```

### 9.3 Schema de base de donnees (evolution)

```sql
-- NOUVELLE TABLE : source unique de verite pour les User Needs
CREATE TABLE user_needs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    short_label TEXT NOT NULL,
    description TEXT NOT NULL,
    examples TEXT,
    color TEXT NOT NULL DEFAULT '#94a3b8',
    icon TEXT DEFAULT '',
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- EVOLUTION : foreign key au lieu de CHECK constraint
ALTER TABLE human_classifications
    DROP CONSTRAINT human_classifications_userneed_check,
    ADD COLUMN userneed_id UUID REFERENCES user_needs(id);

-- EVOLUTION : snapshot des definitions dans chaque test run
ALTER TABLE test_runs
    ADD COLUMN userneed_snapshot JSONB,
    ADD COLUMN total_cost NUMERIC,
    ADD COLUMN duration_ms INTEGER;

-- NOUVELLE TABLE : utilisateurs
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    role TEXT DEFAULT 'editor' CHECK (role IN ('admin', 'editor', 'viewer')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- EVOLUTION : lien utilisateur sur les classifications
ALTER TABLE human_classifications
    ADD COLUMN user_id UUID REFERENCES users(id);
```

---

## 10. Plan de migration POC -> V2

### Phase 1 : Fondations (2-3 semaines)

| # | Tache | Priorite |
|---|-------|----------|
| 1 | Setup projet (Next.js, Tailwind, Supabase) | Must |
| 2 | Creer la table `user_needs` et migrer les 8 User Needs | Must |
| 3 | Module JS `userNeedStore` qui charge depuis Supabase | Must |
| 4 | Auth Supabase (remplacer Basic Auth) | Must |
| 5 | Sidebar de navigation | Must |
| 6 | Design system de base (boutons, cartes, badges, modales) | Must |

### Phase 2 : Pages principales (3-4 semaines)

| # | Tache | Priorite |
|---|-------|----------|
| 7 | Page Articles (liste, recherche, filtres, classification) | Must |
| 8 | Page Analyse IA (lancement, progression, resultats) | Must |
| 9 | Page Resultats (matrice dynamique NxN, tableau, metriques) | Must |
| 10 | Page Tests (scatter plot, tableau de classement) | Must |
| 11 | Page Dashboard (vue d'ensemble) | Should |

### Phase 3 : Configuration (2 semaines)

| # | Tache | Priorite |
|---|-------|----------|
| 12 | Page Config > User Needs (CRUD, drag & drop, couleurs) | Must |
| 13 | Page Config > Prompts (editeur avec placeholder `{{USER_NEEDS_DEFINITIONS}}`) | Must |
| 14 | Page Config > Modeles LLM (tableau interactif) | Should |
| 15 | Injection dynamique des definitions dans les prompts | Must |
| 16 | Versionning des definitions (snapshot dans test_runs) | Should |

### Phase 4 : Fonctionnalites avancees (2-3 semaines)

| # | Tache | Priorite |
|---|-------|----------|
| 17 | Mode Audit (vue unifiee des desaccords) | Should |
| 18 | Classification assistee par IA | Could |
| 19 | Metriques avancees (F1 par User Need, Kappa, Top-2) | Should |
| 20 | Export PDF des resultats | Could |
| 21 | Graphique d'evolution temporelle | Could |
| 22 | Multi-utilisateurs et accord inter-annotateur | Could |

### Phase 5 : Polish et deploiement (1-2 semaines)

| # | Tache | Priorite |
|---|-------|----------|
| 23 | Tests end-to-end (parcours critiques) | Must |
| 24 | Performance (virtual scrolling, lazy loading) | Should |
| 25 | Responsive (tablet) | Should |
| 26 | Documentation utilisateur integree | Should |
| 27 | Deploiement production + migration des donnees | Must |

**Duree totale estimee : 10-14 semaines**

---

## 11. Criteres de succes

| Critere | Mesure | Cible |
|---------|--------|-------|
| **Scalabilite User Needs** | Ajouter un User Need sans toucher au code | 0 ligne de code modifiee |
| **Performance** | Temps de chargement de la page Articles | < 2 secondes pour 5000 articles |
| **Facilite d'utilisation** | Nombre de clics pour classifier 10 articles | <= 15 clics (vs 20+ aujourd'hui) |
| **Comparaison de tests** | Nombre de clics pour comparer 2 tests | <= 3 clics (vs 6+ aujourd'hui) |
| **Fiabilite des metriques** | Les definitions utilisees sont tracees | 100% des test_runs ont un snapshot |
| **Qualite du code** | Taille max d'un fichier | < 300 lignes (vs 5143 aujourd'hui) |
| **Couverture de tests** | Tests unitaires + integration | > 60% |

---

## 12. Risques et mitigations

| Risque | Probabilite | Impact | Mitigation |
|--------|-------------|--------|-----------|
| Migration des donnees existantes | Moyenne | Haute | Script de migration teste sur copie de la base avant prod |
| Performance avec 5000+ articles | Moyenne | Moyenne | Pagination serveur, virtual scrolling, index Supabase |
| Complexite du module User Needs dynamique | Faible | Haute | Prototype du module en premier (Phase 1) |
| Adoption par les utilisateurs | Faible | Haute | Formation + documentation + UX intuitive |
| Cout des analyses IA | Faible | Faible | Estimation du cout avant lancement, alertes budget |

---

## 13. Resume executif

L'application actuelle est un **POC valide** qui a prouve le concept de qualification IA des User Needs. La V2 vise a la transformer en **outil professionnel** utilisable au quotidien par l'equipe editoriale de France Televisions.

**Les 5 transformations cles** :

1. **User Needs configurables** : ajouter, modifier, desactiver un User Need sans toucher au code
2. **Definitions separees des prompts** : une source unique de verite, versionnee, injectable
3. **Navigation simplifiee** : sidebar fixe, pages dediees, 2 clics max pour toute action courante
4. **Metriques avancees** : F1 par User Need, Cohen's Kappa, evolution temporelle, cout
5. **Design professionnel** : inspire de Linear/Vercel, accessible, reactif, agreable

Le passage du POC a la V2 represente environ **10-14 semaines** de developpement pour un developpeur full-stack senior, avec une montee progressive en complexite.
