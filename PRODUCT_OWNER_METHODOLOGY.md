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

Créez un **tableau Excel** avec TOUTES les fonctionnalités :

| # | Fonctionnalité | Description | Écran | Priorité | Complexité |
|---|----------------|-------------|-------|----------|------------|
| F1 | Upload Excel | Charger un fichier .xlsx avec colonnes titre, chapo, corps | Accueil | Must | S |
| F2 | Validation format | Vérifier colonnes obligatoires présentes | Accueil | Must | XS |
| F3 | Affichage tableau | Liste articles chargés avec colonnes configurables | Principal | Must | M |
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
| R1 | Le total des 3 scores (principal + secondaire + tertiaire) DOIT être égal à 100 | Prompt demande au LLM, mais pas de validation code | ⚠️ OUI |
| R2 | Les userneeds DOIVENT être normalisés (ex: "CONCERNING NEWS" → "GUIDE ME") | Fonction `normalizeUserneed()` | ✅ OUI |
| R3 | La matrice de confusion est 8x8 (8 userneeds) | Hard-codé dans `displayConfusionMatrix()` | ✅ OUI |
| R4 | Un article peut avoir max 3 userneeds (principal, secondaire, tertiaire) | Structure de données `predictions[]` | ✅ OUI |

**Comment identifier les règles métier** :
1. Cherchez les `if/else` dans le code POC
2. Cherchez les validations
3. Cherchez les calculs mathématiques
4. Posez-vous : "Qu'est-ce qui ne doit JAMAIS changer ?"

### Étape 1.3 : Identifier ce qui marche vs. ce qui est fragile

Créez deux colonnes :

**✅ À CONSERVER (Fondations solides)** :
- Architecture de décision (3 niveaux d'analyse)
- Matrice de confusion 8x8
- Export Excel multi-feuilles
- Thèmes clair/sombre
- Normalisation userneeds

**❌ À REFAIRE (Trop fragile)** :
- Code monolithe (2,356 lignes dans 1 fichier)
- Pas de tests
- Pas de validation du total scores = 100
- Gestion d'état en variables globales
- Backend trop simple (SimpleHTTPHandler)

### Étape 1.4 : Analyser les flux utilisateur

Dessinez (papier/crayon suffit !) les **parcours utilisateur** :

**Exemple - Flux nominal "Analyse d'articles"** :
```
1. Utilisateur arrive sur page d'accueil
2. Clique sur "📁 Fichier"
3. Sélectionne fichier Excel (.xlsx)
   ├─ Succès: Affichage tableau avec preview
   └─ Échec: Message d'erreur "Format invalide"
4. Clique sur "Analyse IA"
5. Sélectionne modèle LLM (dropdown)
6. Clique sur "Lancer l'analyse"
7. Barre de progression s'affiche (0% → 100%)
8. Pour chaque article:
   ├─ Affichage "Analyse article X/110"
   ├─ Appel API OpenRouter
   ├─ Parsing réponse
   └─ Mise à jour tableau
9. Matrice de confusion s'affiche
10. Statistiques mises à jour
11. Bouton "Exporter Excel" activé
```

**Flux alternatifs** (erreurs, cas limites) :
- Que se passe-t-il si l'API timeout ?
- Que se passe-t-il si la réponse LLM est malformée ?
- Que se passe-t-il si l'utilisateur clique "Stop" ?

**💡 Astuce** : Utilisez les captures d'écran de votre POC et annotez-les avec des flèches.

---

## Phase 2 : Structuration des exigences

**Durée** : 3-4 jours
**Objectif** : Transformer le POC en spécifications exploitables

### Étape 2.1 : Méthode MoSCoW

Classez TOUTES les fonctionnalités selon cette priorité :

**Must-Have** (Obligatoire - MVP)
- Sans ça, l'application ne sert à rien
- Ex: Upload Excel, Analyse IA, Matrice

**Should-Have** (Important - v1.0)
- Améliore significativement l'usage
- Ex: Export Excel, Thèmes, Logs détaillés

**Could-Have** (Bonus - v1.1)
- Nice to have si temps le permet
- Ex: Historique analyses, Comparaison multi-tests

**Won't-Have** (Hors scope)
- Reporté à v2.0 ou jamais
- Ex: Authentification multi-user, API publique

**Exemple de répartition** pour votre projet :

| Priorité | Fonctionnalités | % du total |
|----------|-----------------|------------|
| Must | Upload, Analyse, Matrice, Tableau | 60% |
| Should | Export, Prompts custom, Thèmes | 25% |
| Could | Logs avancés, Retry auto | 10% |
| Won't | Auth SSO, Multi-tenant | 5% |

### Étape 2.2 : User Stories

Traduisez les fonctionnalités en **User Stories** (format Agile).

**Format** :
```
En tant que [RÔLE],
Je veux [ACTION],
Afin de [BÉNÉFICE].
```

**Exemples pour votre projet** :

**US-001 : Upload fichier Excel**
```
En tant qu'éditeur Franceinfo,
Je veux uploader un fichier Excel contenant mes articles (colonnes titre, chapo, corps),
Afin de pouvoir les analyser en batch avec l'IA.
```

**US-002 : Analyse IA d'un article**
```
En tant qu'éditeur Franceinfo,
Je veux que l'IA analyse automatiquement chaque article et prédise ses 3 userneeds (principal, secondaire, tertiaire) avec des scores,
Afin de comparer avec mes attentes et valider la pertinence du modèle.
```

**US-003 : Visualiser matrice de confusion**
```
En tant qu'éditeur Franceinfo,
Je veux voir une matrice 8x8 croisant userneeds attendus et prédits,
Afin d'identifier rapidement les erreurs de classification.
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

**Exemple US-001 (Upload Excel)** :

```gherkin
Critère 1: Upload fichier valide
  Étant donné que je suis sur la page d'accueil,
  Quand je clique sur "📁 Fichier" et sélectionne un fichier .xlsx valide avec colonnes (titre, chapo, corps),
  Alors le fichier est chargé ET le tableau affiche les 3 premières lignes en preview.

Critère 2: Upload fichier invalide (mauvais format)
  Étant donné que je suis sur la page d'accueil,
  Quand je sélectionne un fichier .pdf (non Excel),
  Alors un message d'erreur s'affiche "Format non supporté. Veuillez uploader un fichier Excel (.xlsx)".

Critère 3: Upload fichier invalide (colonnes manquantes)
  Étant donné que je suis sur la page d'accueil,
  Quand je sélectionne un fichier Excel SANS la colonne 'titre',
  Alors un message d'erreur s'affiche "Colonnes manquantes : titre. Colonnes requises : titre, chapo, corps".
```

**💡 Règle d'or** : Si vous ne pouvez pas écrire les critères d'acceptation, c'est que la User Story est floue !

### Étape 2.4 : Modèle de données

Définissez la **structure des données** principales.

**Exemple pour votre projet** :

**Article** (input)
```json
{
  "id": "string (UUID)",
  "titre": "string (max 200 chars)",
  "chapo": "string (max 500 chars)",
  "corps": "string (max 10,000 chars)",
  "userneed_source": "string (un des 8 userneeds)", // Optionnel
  "url": "string (URL franceinfo)" // Optionnel
}
```

**Prediction** (output IA)
```json
{
  "article_id": "string (UUID)",
  "timestamp": "datetime",
  "model": "string (ex: anthropic/claude-3.5-haiku)",
  "userneeds": [
    {
      "rank": "principal",
      "userneed": "string (un des 8)",
      "score": "integer (0-100)",
      "justification": "string (max 100 chars)"
    },
    {
      "rank": "secondaire",
      "userneed": "string",
      "score": "integer (0-100)",
      "justification": "string"
    },
    {
      "rank": "tertiaire",
      "userneed": "string",
      "score": "integer (0-100)",
      "justification": "string"
    }
  ],
  "total_score": "integer (MUST = 100)"
}
```

**ConfusionMatrix**
```json
{
  "generated_at": "datetime",
  "total_articles": "integer",
  "concordant": "integer",
  "concordant_percent": "float",
  "matrix": {
    "UPDATE ME": {
      "UPDATE ME": 10,
      "EXPLAIN ME": 2,
      ...
    },
    ...
  }
}
```

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
- Uptime: 99% (acceptable si SLA gratuit)
- Backup: Aucun (pas de persistance pour v1.0)

**Scalabilité**
- Concurrent users: 5-10 max (équipe interne)
- Pas de queue/background jobs requis pour v1.0

### Étape 3.2 : Contraintes techniques imposées

Listez les **contraintes OBLIGATOIRES** (décisions déjà prises) :

**Pour votre projet** :

| Contrainte | Justification | Négociable ? |
|------------|---------------|--------------|
| **API OpenRouter** obligatoire | Coût (models gratuits), flexibilité (13+ models) | Non |
| **Déploiement Render.com** | Gratuit, Python-friendly | Oui (alternative: Railway, Fly.io) |
| **Repository GitHub** public | Open source, portfolio | Oui (peut être privé) |
| **Thème sombre par défaut** | Préférence utilisateurs Franceinfo | Oui |
| **Export Excel** (pas CSV) | Format attendu par équipe édito | Non |

### Étape 3.3 : Architecture proposée (high-level)

Proposez une **architecture cible** (sans imposer les outils) :

```
┌─────────────────────────────────────────────┐
│            FRONTEND (SPA)                   │
│  - Upload Excel                             │
│  - Affichage tableau                        │
│  - Visualisations (matrice)                 │
│  - State management                         │
└────────────┬────────────────────────────────┘
             │
             │ REST API
             ▼
┌─────────────────────────────────────────────┐
│            BACKEND (API)                    │
│  - Endpoints REST                           │
│  - Validation inputs                        │
│  - Orchestration analyses                   │
│  - Rate limiting                            │
└────────────┬────────────────────────────────┘
             │
             │ API Call
             ▼
┌─────────────────────────────────────────────┐
│         OPENROUTER API                      │
│  - 13+ modèles LLM                          │
│  - Pay-per-use                              │
└─────────────────────────────────────────────┘
```

**Composants optionnels** (v2.0) :
```
┌─────────────┐
│  PostgreSQL │ ← Persistence historique analyses
└─────────────┘

┌─────────────┐
│    Redis    │ ← Cache réponses LLM
└─────────────┘
```

**💡 Laissez le développeur** :
- Choisir React vs Vue vs Svelte
- Choisir FastAPI vs Flask vs Django
- Décider si BDD nécessaire maintenant ou v2.0

### Étape 3.4 : API et intégrations

Documentez les **APIs externes** utilisées :

**OpenRouter API**
- **URL** : https://openrouter.ai/api/v1/chat/completions
- **Auth** : Bearer token (header `Authorization: Bearer sk-or-v1-...`)
- **Rate limit** : Selon modèle (varie)
- **Timeout** : 120s recommandé
- **Coût** : Variable ($0.00-$0.03 par 1K tokens selon modèle)
- **Documentation** : https://openrouter.ai/docs

**Modèles supportés** (priorités) :
1. **anthropic/claude-3.5-haiku** (recommandé prod)
2. **google/gemini-2.5-flash-lite** (rapidité)
3. **meta-llama/llama-3.1-8b-instruct** (gratuit, tests)

### Étape 3.5 : Gestion des erreurs

Définissez le **comportement attendu** en cas d'erreur :

| Erreur | Comportement attendu |
|--------|----------------------|
| **401 Unauthorized** (API key invalide) | Message : "Clé API invalide. Veuillez vérifier votre configuration." |
| **429 Too Many Requests** (rate limit) | Retry automatique après 60s (max 3 fois) |
| **504 Timeout** (>120s) | Message : "L'analyse a pris trop de temps. Réessayez avec un article plus court." |
| **Réponse LLM malformée** | Message : "Le modèle a retourné une réponse invalide. Réessayez ou changez de modèle." |
| **Total scores ≠ 100** | Message : "Erreur de validation : total scores = {total} (attendu 100)." + Retry |

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
   - Écran Upload (nouveau design)
   - Écran Analyse (amélioré)
   - Écran Résultats avec matrice (restructuré)
   - Écran Configuration (simplifié)

### Étape 4.1 : Liste des écrans

Listez TOUS les écrans/modales :

| # | Écran | Éléments principaux | Interactions |
|---|-------|---------------------|--------------|
| 1 | Accueil | Logo, Bouton "Upload", Instructions | Clic Upload → Sélecteur fichier |
| 2 | Tableau articles | Colonnes (Titre, Chapo, Userneed), Filtres | Tri colonnes, Recherche |
| 3 | Configuration analyse | Dropdown modèle LLM, Preview prompt | Sélection modèle |
| 4 | Analyse en cours | Barre progression, Bouton Stop | Mise à jour temps réel |
| 5 | Résultats | Matrice 8x8, Statistiques, Tableau détaillé | Clic cellule matrice → filtre tableau |
| 6 | Modale Prompts | Éditeur texte, Boutons Sauvegarder/Réinitialiser | Édition prompt |
| 7 | Modale Erreur | Message erreur, Bouton Réessayer/Fermer | Affichage conditionnel |

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
   - `test_petit.xlsx` (10 articles)
   - `test_moyen.xlsx` (50 articles)
   - `test_large.xlsx` (100 articles)

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
14. **DOCUMENTATION_COMPLETE.md** (existant)

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
│   ├── test_petit.xlsx
│   ├── test_moyen.xlsx
│   └── test_large.xlsx
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
- Render.com : [invitation envoyée par email]
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
  - Parcourir les 5 écrans principaux
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
- ✅ Upload Excel fonctionne
- ✅ Analyse IA d'un article fonctionne
- ✅ Tableau affiche résultats
- ✅ Matrice de confusion basique

**Jalon 3 : Features complètes (Fin semaine 9)**
- ✅ Toutes fonctionnalités must-have terminées
- ✅ Export Excel fonctionne
- ✅ Gestion prompts custom
- ✅ Thèmes clair/sombre

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
> "Je comprends, mais j'ai besoin que l'export contienne au minimum 3 feuilles : Résultats détaillés, Matrice de confusion, Statistiques. Pouvez-vous confirmer que c'est faisable dans le scope ?"

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
- Upload Excel (must)
- Analyse IA (must)
- Authentification SSO (must) ← ⚠️ TROP TÔT
- Historique analyses (must) ← ⚠️ TROP TÔT
- Export Excel (should)

**Backlog clair** :
- **v1.0 MVP** : Upload, Analyse, Tableau, Matrice, Export basique
- **v1.1** : Export avancé, Prompts custom, Logs détaillés
- **v2.0** : Auth SSO, Historique, Comparaison multi-tests

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
- [ ] Données de test préparées (3 fichiers Excel)
- [ ] Template config.json.example créé
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
- [ ] Accès (GitHub, Render, OpenRouter) donnés

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
**Version** : 1.0
**Auteur** : Claude Sonnet 4.5 (pour Livio Ricci, France Télévisions)
