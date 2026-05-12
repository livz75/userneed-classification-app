# Spécifications Fonctionnelles — Application "Analyse IA des Userneeds Franceinfo"

**Version :** 2.1
**Date :** 13 mars 2026
**Auteur :** Product Owner — Direction de l'Information, France Télévisions
**Destinataires :** Équipe de développement
**Statut :** En production

---

## Table des matières

1. [Contexte et vision produit](#1-contexte-et-vision-produit)
2. [Utilisateurs cibles](#2-utilisateurs-cibles)
3. [Taxonomie des User Needs](#3-taxonomie-des-user-needs)
4. [Architecture générale](#4-architecture-générale)
5. [Module 1 — Alimentation en articles](#5-module-1--alimentation-en-articles)
6. [Module 2 — Classification humaine des articles](#6-module-2--classification-humaine-des-articles)
7. [Module 3 — Configuration du modèle IA (LLM)](#7-module-3--configuration-du-modèle-ia-llm)
8. [Module 4 — Gestion des prompts](#8-module-4--gestion-des-prompts)
9. [Module 5 — Analyse IA](#9-module-5--analyse-ia)
10. [Module 6 — Résultats et visualisations](#10-module-6--résultats-et-visualisations)
11. [Module 7 — Historique des tests et comparaison](#11-module-7--historique-des-tests-et-comparaison)
12. [Module 8 — Classement des Test Runs](#12-module-8--classement-des-test-runs)
13. [Module 9 — Adaptation automatique du prompt](#13-module-9--adaptation-automatique-du-prompt)
14. [Règles de gestion transversales](#14-règles-de-gestion-transversales)
15. [Exigences non fonctionnelles](#15-exigences-non-fonctionnelles)
16. [Annexes](#16-annexes)

---

## 1. Contexte et vision produit

### 1.1 Contexte éditorial

France Télévisions, via sa marque Franceinfo, produit quotidiennement un volume important de contenus éditoriaux (articles, reportages, analyses). Pour piloter l'offre éditoriale, la rédaction s'appuie sur une grille de classification appelée **"User Needs"** — 8 catégories décrivant le besoin auquel répond chaque article pour le lecteur.

La classification manuelle de ces articles est chronophage, subjective et génère des incohérences entre contributeurs.

### 1.2 Vision produit

L'application **"Analyse IA des Userneeds Franceinfo"** vise à :

- **Évaluer** si une intelligence artificielle est capable de classer automatiquement des articles selon les 8 User Needs
- **Mesurer** la fiabilité de la classification IA en la comparant aux classifications humaines
- **Comparer** les performances de différents modèles IA et de différents prompts
- **Capitaliser** sur les résultats pour améliorer le référentiel de classification

### 1.3 Principes éditoriaux Franceinfo (contexte système IA)

Les principes suivants sont transmis au modèle IA comme contexte :

1. L'information est le reflet d'une couverture **exacte, équilibrée, complète et impartiale**
2. L'information est **certifiée et validée** avant publication
3. L'information revendique la **liberté de ton** sur tous les supports
4. L'information est **au service du public** et de la citoyenneté
5. L'information est **honnête et transparente**

---

## 2. Utilisateurs cibles

| Profil | Usage principal |
|--------|----------------|
| **Responsable éditorial** | Piloter la cohérence de la classification éditoriale |
| **Data analyst éditorial** | Analyser les résultats, identifier des tendances |
| **Chef de projet IA/Data** | Comparer les modèles, ajuster les prompts |
| **Journaliste référent** | Classifier des articles, comprendre l'interprétation IA |

L'application est mono-utilisateur dans sa version actuelle (pas d'authentification multi-utilisateur).

---

## 3. Taxonomie des User Needs

L'application repose sur un référentiel fixe de **8 User Needs**.

| # | User Need | Définition |
|---|-----------|------------|
| 1 | **UPDATE ME** | Information factuelle sur l'actualité récente. Brèves, récapitulatifs d'événements en cours. |
| 2 | **EXPLAIN ME** | Vulgarisation et mise en contexte pédagogique. Premier niveau de compréhension, synthétique et didactique. |
| 3 | **GIVE ME PERSPECTIVE** | Analyse approfondie avec différents points de vue. Second niveau de compréhension pour ceux qui connaissent déjà le sujet. |
| 4 | **GIVE ME A BREAK** | Contenus légers et divertissants. Insolite, étonnant, drôle, curiosité. |
| 5 | **GIVE ME CONCERNING NEWS** | Contenus qui touchent à la sphère privée, utiles au quotidien, dans l'air du temps. |
| 6 | **INSPIRE ME** | Récits inspirants et solutions. Histoires positives, résilience, espoir, journalisme de solution. |
| 7 | **MAKE ME FEEL THE NEWS** | Témoignages et expériences vécues. Récits de première main qui provoquent une émotion. |
| 8 | **REVEAL NEWS** | Enquêtes et révélations exclusives. Information obtenue par France Télévisions / Franceinfo. |

### Normalisation des variantes

Certains modèles IA répondent avec des variantes de nommage. Le système normalise automatiquement :

| Variante renvoyée | Forme canonique |
|-------------------|-----------------|
| CONCERNING NEWS | GIVE ME CONCERNING NEWS |
| MAKE ME FEEL | MAKE ME FEEL THE NEWS |
| REVEAL ME | REVEAL NEWS |

---

## 4. Architecture générale

### 4.1 Composants du système

```
┌──────────────────────────────────────────────────────────────┐
│  APPLICATION WEB (navigateur)                                │
│  - interface HTML/CSS/JS                                     │
│  - Supabase JS SDK                                          │
└──────────────────────┬───────────────────────────────────────┘
                       │ REST / WebSocket
┌──────────────────────▼───────────────────────────────────────┐
│  SUPABASE (base de données cloud)                            │
│  - articles         - human_classifications                  │
│  - prompts          - test_runs                              │
│  - ai_analyses                                               │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  SERVEUR PROXY (Python / Render.com)                         │
│  - /api/analyze : appels OpenRouter (LLM)                   │
│  - /api/health  : vérification de santé                     │
│  - /api/config  : fourniture des variables d'environnement  │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  CRON LOCAL (macOS launchd)                                  │
│  - fetch_articles.py : toutes les 30 minutes                │
│  - Scraping RSS Franceinfo → Supabase                        │
└──────────────────────────────────────────────────────────────┘
```

### 4.2 Schéma de données Supabase

| Table | Rôle |
|-------|------|
| `articles` | Articles Franceinfo importés via RSS |
| `human_classifications` | Classifications manuelles par User Need |
| `prompts` | Prompts système créés par les utilisateurs |
| `test_runs` | Sessions d'analyse IA (1 session = 1 couple LLM/prompt) |
| `ai_analyses` | Résultat IA par article et par test run |

### 4.3 Configuration

La configuration (clé Supabase, clé OpenRouter) est chargée :
- En local : depuis `config.json` (non versionné)
- En production : depuis `/api/config` (variables d'environnement Render)

---

## 5. Module 1 — Alimentation en articles

### 5.1 Description

Les articles sont importés automatiquement depuis les flux RSS de Franceinfo via un script Python (`fetch_articles.py`) qui s'exécute toutes les **30 minutes** via une tâche planifiée locale (launchd sur macOS).

### 5.2 Sources RSS

| Feed | URL |
|------|-----|
| Titres | francetvinfo.fr/titres.rss |
| Politique | francetvinfo.fr/politique.rss |
| Monde | francetvinfo.fr/monde.rss |
| Société | francetvinfo.fr/societe.rss |
| Économie | francetvinfo.fr/economie.rss |
| Culture | francetvinfo.fr/culture.rss |

### 5.3 Traitement de chaque article

Pour chaque article RSS, le script :

1. **Parse** les champs RSS : titre, chapô, URL, date de publication
2. **Extrait l'identifiant externe** depuis l'URL (`_1234567.html`)
3. **Extrait la catégorie** depuis le chemin de l'URL
4. **Scrape** la page HTML de l'article pour extraire :
   - Le corps complet (`articleBody` depuis le JSON-LD embarqué)
   - Le type de média (`@type` depuis le JSON-LD : `article`, `video`, ou `autre`)
5. **Filtre** : les articles sans corps ne sont pas insérés en base
6. **Upsert** vers Supabase sur le champ `external_id` (dédoublonnage automatique)

### 5.4 Champs stockés par article

| Champ | Type | Description |
|-------|------|-------------|
| `external_id` | string | Identifiant numérique extrait de l'URL |
| `titre` | string | Titre de l'article |
| `chapo` | string | Description RSS (sous-titre) |
| `corps` | text | Corps complet (scraped) |
| `url` | string | URL canonique (sans tracking) |
| `path` | string | Chemin URL (permet de déduire la catégorie) |
| `word_count` | int | Nombre de mots du corps |
| `date_publication` | datetime | Date de publication (ISO 8601) |
| `metadata` | jsonb | Données complémentaires, dont `media_type` |

### 5.5 Type de média

Le champ `metadata.media_type` prend les valeurs :

| Valeur | Signification |
|--------|--------------|
| `article` | Article texte (valeur par défaut) |
| `video` | Contenu vidéo (`VideoObject` en JSON-LD) |
| `autre` | Autre type de contenu |

### 5.6 Règles de gestion

| ID | Règle |
|----|-------|
| RM-01 | Un article sans corps (scraping échoué) n'est pas inséré en base |
| RM-02 | L'upsert est basé sur `external_id` : un article déjà présent est mis à jour, pas dupliqué |
| RM-03 | Les doublons inter-feeds (même article dans plusieurs flux) sont dédoublonnés |
| RM-04 | Les articles existants sans corps (et sans classification) sont supprimés à chaque passage |
| RM-05 | Le scraping observe un délai de 0,5 seconde entre chaque requête |

### 5.7 Commandes disponibles

```bash
python3 fetch_articles.py                    # Tous les feeds
python3 fetch_articles.py --feed titres      # Un seul feed
python3 fetch_articles.py --no-scrape        # Sans scraping (métadonnées uniquement)
python3 fetch_articles.py --update-metadata  # Backfill media_type articles existants
```

---

## 6. Module 2 — Classification humaine des articles

### 6.1 Description

L'écran d'accueil affiche la liste des articles Franceinfo et permet à l'utilisateur de les classifier manuellement par User Need. Ces classifications constituent la **référence humaine** utilisée pour évaluer les prédictions IA.

### 6.2 Interface de la liste d'articles

**Filtres disponibles :**

| Filtre | Type | Valeurs |
|--------|------|---------|
| Statut de classification | Boutons | Tous / Classifiés / Non classifiés (défaut) |
| Catégorie | Menu déroulant | Toutes catégories / Monde / Culture / Économie / Sport / France / Faits-divers / Politique / Autres |
| Type de média | Menu déroulant | Tous types / Article / Vidéo / Autre |

> **Note :** La catégorie est déduite du chemin de l'URL. Les articles dont le chemin ne correspond à aucune catégorie connue sont regroupés dans "Autres".

**Informations affichées par article :**

- Titre (cliquable → ouvre l'article dans un nouvel onglet)
- Chapô
- Date de publication
- Catégorie (badge)
- Type de média (badge)
- Menu déroulant de sélection du User Need

**Compteur :** affichage du nombre d'articles visibles et du total classifiés/non classifiés.

### 6.3 Action de classification

Lorsque l'utilisateur sélectionne un User Need dans le menu déroulant :

1. La classification est enregistrée immédiatement dans Supabase (`human_classifications`)
2. Un retour visuel confirme l'enregistrement (toast de confirmation)
3. L'article passe en statut "Classifié" (visible dans les filtres)

Si l'utilisateur modifie une classification existante, elle est mise à jour (upsert sur `article_id + classified_by`).

L'utilisateur peut réinitialiser une classification en sélectionnant l'option vide dans le menu.

### 6.4 Graphique de distribution du corpus

Lorsque le filtre "Classifiés" est actif, un graphique de distribution s'affiche automatiquement :

- **Barres horizontales** : nombre et pourcentage d'articles classifiés par User Need
- **Ligne de référence** : distribution idéale à 12.5% (100% / 8 User Needs), affichée en pointillés
- **Indicateur d'équilibre** : un badge coloré évalue l'équilibre du corpus

| Coefficient de variation | Équilibre | Couleur |
|--------------------------|-----------|---------|
| < 0.3 | Bon | Vert |
| 0.3 – 0.6 | Moyen | Orange |
| > 0.6 | À améliorer | Rouge |

L'objectif recommandé est de **10 à 20 articles classifiés par User Need** pour un corpus équilibré permettant des mesures fiables.

Le graphique est masqué lorsque le filtre "Non classifiés" est sélectionné.

### 6.5 Règles de gestion

| ID | Règle |
|----|-------|
| RC-01 | La classification est sauvegardée dès la sélection (pas de bouton "Valider") |
| RC-02 | Un article peut être reclassifié à tout moment |
| RC-03 | Seul le User Need principal (classification humaine) est utilisé pour la comparaison IA |
| RC-04 | La classification est associée à un identifiant utilisateur (`classified_by`), actuellement "anonymous" |
| RC-05 | Le compteur d'articles affiche uniquement le nombre d'articles classifiés (et non le total en base) |

---

## 7. Module 3 — Configuration du modèle IA (LLM)

### 7.1 Description

Le panneau LLM (pleine page) permet de choisir le modèle d'IA et de configurer la clé d'accès API. Tous les modèles sont accessibles via **OpenRouter**, une passerelle unifiée ne nécessitant qu'une seule clé API.

### 7.2 Tableau comparatif des modèles

Le panneau affiche un tableau de 20 modèles classés du meilleur au moins bon pour cette application, avec les informations suivantes par modèle :

| Colonne | Description |
|---------|-------------|
| Rang | Position dans le classement |
| Modèle | Nom du modèle + fournisseur + badge "Recommandé" si applicable |
| Vitesse | Indicateur qualitatif (Très rapide / Rapide / Modéré / Lent) |
| Entrée ($/M tokens) | Coût d'entrée en dollars par million de tokens |
| Sortie ($/M tokens) | Coût de sortie en dollars par million de tokens |
| ≈ Coût / 50 articles | Estimation du coût pour une analyse de 50 articles |
| Qualité | Nombre d'étoiles (1 à 5) |
| Français | Support de la langue française (1 à 3) |

**Estimation de coût :** calculée sur la base de 20 000 tokens en entrée et 6 000 tokens en sortie pour 50 articles.

**Modèles disponibles (mars 2026) — 20 modèles :**

| # | Modèle | Fournisseur | Recommandé |
|---|--------|-------------|------------|
| 1 | Claude 3.5 Haiku | Anthropic | ✅ |
| 2 | GPT-5 Mini | OpenAI | ✅ |
| 3 | GPT-4o Mini | OpenAI | ✅ |
| 4 | Mistral Small 3.1 | Mistral AI | ✅ |
| 5 | Gemini 2.5 Flash Lite | Google | ✅ |
| 6 | Gemini 2.0 Flash | Google | ✅ |
| 7 | Ministral 8B | Mistral AI | ✅ |
| 8 | Command R | Cohere | — |
| 9 | Gemma 3 27B | Google | — |
| 10 | Phi-4 | Microsoft | — |
| 11 | DeepSeek V3.2 | DeepSeek | — |
| 12 | Gemini Flash 1.5 | Google | — |
| 13 | DeepSeek V3 | DeepSeek | — |
| 14 | Llama 3.3 70B | Meta | — |
| 15 | Claude 3.5 Sonnet | Anthropic | — |
| 16 | GPT-4o | OpenAI | — |
| 17 | Gemini Pro 1.5 | Google | — |
| 18 | Qwen 2.5 72B | Alibaba | — |
| 19 | Mistral Medium | Mistral AI | — |
| 20 | Llama 3.1 8B | Meta | — |
| 21 | Claude 3 Opus | Anthropic | — |

### 7.3 Sélection du modèle

Un clic sur une ligne du tableau sélectionne le modèle. Le modèle sélectionné est mis en évidence visuellement et persisté en mémoire de session.

### 7.4 Configuration de la clé API

- Champ de saisie masqué (type password) pour la clé OpenRouter (`sk-or-...`)
- Bouton "Enregistrer la configuration"
- Bouton "Recharger depuis config.json" : recharge la configuration du fichier local ou de l'endpoint `/api/config`

### 7.5 Règles de gestion

| ID | Règle |
|----|-------|
| RL-01 | Sans clé API configurée, le lancement de l'analyse est bloqué |
| RL-02 | La clé API n'est jamais affichée en clair ni journalisée |
| RL-03 | La configuration est sauvegardée dans le navigateur (localStorage) |
| RL-04 | La configuration du fichier de config est prioritaire sur le localStorage |

---

## 8. Module 4 — Gestion des prompts

### 8.1 Description

Le panneau Prompts permet de créer, modifier, supprimer et activer des instructions système envoyées au modèle IA. Un prompt par défaut est fourni et ne peut pas être supprimé.

### 8.2 Structure d'un prompt

Un prompt est composé de :

| Champ | Obligatoire | Description |
|-------|-------------|-------------|
| Nom | Oui | Libellé court (max 100 caractères) |
| Description | Non | Description du prompt (max 500 caractères) |
| Contenu | Oui | Instructions complètes envoyées à l'IA |

**Structure recommandée du contenu :**

```
#ROLE
[Rôle assigné à l'IA]

#VISION DE FRANCEINFO
[Principes éditoriaux]

#DÉFINITIONS DES USERNEEDS
[Définitions des 8 catégories]

#TÂCHE
[Instructions de classification et format de réponse attendu]
```

> La section `#ARTICLE À ANALYSER` (titre, chapô, corps) est **automatiquement ajoutée** par le système lors de l'analyse. Elle ne doit pas être incluse dans le prompt.

### 8.3 Opérations disponibles

| Action | Prompt par défaut | Prompt personnalisé |
|--------|-------------------|---------------------|
| Consulter | Oui | Oui |
| Activer | Oui | Oui |
| Créer | — | Oui |
| Éditer | Non | Oui |
| Dupliquer | Oui | Oui |
| Supprimer | Non | Oui |

### 8.4 Import / Export

- **Export :** génère un fichier JSON contenant tous les prompts personnalisés
- **Import :** accepte un fichier JSON ; l'utilisateur choisit entre :
  - **Remplacer** : supprime tous les prompts existants avant import
  - **Fusionner** : ajoute les prompts importés sans supprimer les existants

### 8.5 Persistance

Les prompts sont stockés dans Supabase (table `prompts`), accessibles depuis n'importe quelle session.

### 8.6 Règles de gestion

| ID | Règle |
|----|-------|
| RP-01 | Le prompt par défaut ne peut être ni modifié ni supprimé |
| RP-02 | Un seul prompt peut être actif à la fois |
| RP-03 | Si le prompt actif est supprimé, le système revient automatiquement au prompt par défaut |
| RP-04 | Le nom et le contenu sont obligatoires pour créer ou modifier un prompt |

---

## 9. Module 5 — Analyse IA

### 9.1 Description

L'analyse IA compare les classifications humaines aux prédictions d'un modèle de langage. Chaque session d'analyse est enregistrée comme un **Test Run** (couple LLM/prompt), permettant de capitaliser et de comparer les résultats dans le temps.

### 9.2 Prérequis au lancement

| Condition | Message si non remplie |
|-----------|------------------------|
| Clé API configurée | "Clé API non configurée" |
| Modèle LLM sélectionné | "Aucun modèle sélectionné" |
| Prompt actif | "Aucun prompt actif" |
| Au moins 1 article classifié | "Aucun article classifié à analyser" |

### 9.3 Déroulement de l'analyse

1. **Création d'un Test Run** dans Supabase : enregistre le modèle, le prompt (snapshot), la date de démarrage et le statut `running`
2. **Récupération des articles classifiés** depuis Supabase
3. **Traitement séquentiel** article par article :
   - Construction du prompt : `[prompt actif] + [section article : titre + chapô + corps]`
   - Envoi au serveur proxy (`/api/analyze`) → OpenRouter → LLM
   - Parsing de la réponse IA
   - Calcul de la concordance (User Need prédit principal = User Need humain ?)
   - Calcul du score de confiance (ICP)
   - Sauvegarde du résultat dans `ai_analyses`
   - Mise à jour de l'interface (matrice, tableau, statistiques)
4. **Finalisation du Test Run** : mise à jour du statut (`completed` ou `stopped`), sauvegarde des stats globales

### 9.4 Format de réponse IA attendu

L'IA doit répondre **exactement** avec ce format :

```
USERNEED PRINCIPAL : [NOM_EXACT] (SCORE : [NOMBRE])
JUSTIFICATION : [explication en 10 mots maximum]

USERNEED SECONDAIRE : [NOM_EXACT] (SCORE : [NOMBRE])
JUSTIFICATION : [explication en 10 mots maximum]

USERNEED TERTIAIRE : [NOM_EXACT] (SCORE : [NOMBRE])
JUSTIFICATION : [explication en 10 mots maximum]
```

**Règle critique :** la somme des 3 scores doit être égale à **100**.

Le parsing est tolérant et supporte plusieurs variantes de format.

### 9.5 Score de confiance (ICP)

L'Indice de Confiance de la Prédiction est calculé à partir de l'écart entre les scores :

| Niveau de confiance | Critère |
|--------------------|---------|
| **Haute** | Score principal élevé ET écart important avec le secondaire |
| **Moyenne** | Score principal modéré OU écart faible avec le secondaire |
| **Basse** | Score principal faible OU répartition homogène entre les 3 niveaux |

### 9.6 Mécanisme de retry intelligent

Le système effectue jusqu'à **3 tentatives** par article en cas d'échec :

| Type d'erreur | Comportement |
|---------------|-------------|
| Réponse vide du modèle | Retry automatique (délai 2s) |
| User Need principal non reconnu ("❓ Non identifié") | Retry avec rappel strict des 8 noms valides injecté dans le prompt |
| Réponse non parsable | Retry automatique |
| Erreur 401 (clé invalide) | Pas de retry — arrêt |
| Erreur 429 (rate limit) | Pas de retry — arrêt |
| Erreur 403 (accès refusé) | Pas de retry — arrêt |
| Timeout (>120s) | Pas de retry — article marqué en erreur |

Sur les tentatives 2 et 3, le prompt est enrichi d'un rappel obligatoire :
> "⚠️ RAPPEL OBLIGATOIRE : ta réponse précédente contenait des userneeds non reconnus. Tu DOIS choisir UNIQUEMENT parmi ces 8 noms exacts : [liste des 8 UN]"

### 9.7 Règles de gestion

| ID | Règle |
|----|-------|
| RA-01 | Le traitement est strictement séquentiel (1 article à la fois) |
| RA-02 | Un délai est appliqué entre chaque article (limitation de débit API) |
| RA-03 | Timeout de 120 secondes par article |
| RA-04 | Si un article échoue après 3 tentatives, il est marqué en erreur et l'analyse continue |
| RA-05 | L'utilisateur peut arrêter l'analyse via le bouton "Stop" |
| RA-06 | En cas d'arrêt, les résultats déjà obtenus sont conservés et exploitables |
| RA-07 | Seul le User Need principal est utilisé pour déterminer la concordance |
| RA-08 | Un résultat non parsable après 3 tentatives est marqué "Non identifié" et exclu de la matrice de confusion |
| RA-09 | La section Articles reste accessible pendant et après l'analyse |

---

## 10. Module 6 — Résultats et visualisations

### 10.1 Description

Les résultats s'affichent en temps réel pendant l'analyse et restent visibles à la fin. Trois visualisations sont disponibles.

### 10.2 Matrice de confusion

Tableau 8×8 croisant :
- **Lignes** : User Need attribué par l'humain (catégorie source)
- **Colonnes** : User Need prédit par l'IA

**Code couleur :**

| Zone | Couleur |
|------|---------|
| Diagonale (concordance) | Vert |
| Hors diagonale (divergence faible) | Rouge léger |
| Hors diagonale (divergence modérée) | Rouge moyen |
| Hors diagonale (divergence élevée) | Rouge intense |

**Filtrage interactif :**
- Clic sur une cellule → filtre le tableau de résultats sur cette combinaison (source → prédiction)
- Second clic sur la même cellule → désactive le filtre
- Filtre par niveau de confiance (Tous / Haute / Moyenne / Basse) via une barre de boutons

### 10.3 Tableau de résultats

Affiche le détail de chaque article analysé.

| Colonne | Contenu |
|---------|---------|
| Titre | Titre cliquable vers l'article (nouvel onglet) |
| User Need humain | Classification de référence |
| Prédiction IA | Les 3 niveaux avec scores, en vert si concordant / rouge si divergent |
| Confiance | Badge de niveau de confiance (Haute / Moyenne / Basse) |
| Justification | Extrait de la justification IA + bouton pour voir le texte complet |

**Modale de justification :** affiche le User Need prédit avec badge coloré + justification complète de l'IA.

**Modale de détail de confiance :** affiche les 3 prédictions avec leurs scores détaillés.

### 10.4 Statistiques détaillées

| Indicateur | Description |
|-----------|-------------|
| Total d'articles | Nombre total d'articles analysés dans le Test Run |
| Articles concordants | Nombre + pourcentage (IA = humain) |
| Articles reclassifiés | Nombre + pourcentage (IA ≠ humain) |
| Top 5 reclassifications | Les 5 paires (source → prédiction) les plus fréquentes en cas de désaccord |

### 10.5 Export Excel

Le bouton "Exporter" génère un fichier `.xlsx` nommé `Analyse_Userneeds_YYYY-MM-DD.xlsx` contenant 5 feuilles :

| Feuille | Contenu |
|---------|---------|
| Statistiques | Vue synthétique globale |
| Matrice de Confusion | Matrice 8×8 complète |
| Top Reclassifications | 20 premières divergences par fréquence |
| Concordance par Catégorie | Taux de concordance par User Need |
| Détails Articles | Détail article par article |

---

## 11. Module 7 — Historique des tests et comparaison

### 11.1 Description

Le panneau "Tests" (pleine page) centralise l'historique de tous les Test Runs et permet de les comparer deux à deux pour évaluer l'impact d'un changement de modèle ou de prompt.

### 11.2 Liste des Test Runs

Les Test Runs sont **groupés par prompt** : chaque groupe affiche le nom du prompt (📝) et le nombre de tests associés.

Pour chaque Test Run, la carte affiche :
- **Badge coloré du modèle LLM** : couleur identifiant le fournisseur (violet = Anthropic, vert = OpenAI, bleu = Google, orange = Mistral, rouge = Meta)
- Date de lancement
- Statut (✓ Terminé / ⏹ Arrêté / ⏳ En cours)
- Nombre d'articles analysés / total
- Taux de concordance global

Actions disponibles par Test Run :
- **Voir le détail** : accès aux résultats complets de la session
- **Supprimer** : suppression du Test Run et de toutes ses analyses

### 11.3 Détail d'un Test Run

Le détail affiche l'ensemble des résultats du Test Run : matrice de confusion, statistiques, tableau des articles — identique au Module 6, mais en lecture seule.

### 11.4 Comparaison de deux Test Runs

L'utilisateur sélectionne deux Test Runs (A et B) et lance la comparaison.

**Tableau de comparaison :**

Pour chaque User Need ayant des données dans au moins un des deux tests :

| Colonne | Description |
|---------|-------------|
| User Need | Nom de la catégorie |
| Précision A | Pour le Test A : quand l'IA prédit ce User Need, a-t-elle raison ? |
| Précision B | Idem pour le Test B |
| Rappel A | Pour le Test A : parmi tous les articles de ce User Need, combien l'IA en a-t-elle détectés ? |
| Rappel B | Idem pour le Test B |

**Mise en forme :** la valeur la plus élevée de chaque colonne est affichée en **vert**, la plus basse en **rouge**.

**Formules :**
- Précision = (vrais positifs) / (vrais positifs + faux positifs)
- Rappel = (vrais positifs) / (vrais positifs + faux négatifs)

**Analyse IA de la comparaison :**

À la fin de la comparaison, le système appelle automatiquement Claude 3.5 Sonnet avec un prompt structuré incluant toutes les métriques et génère un **commentaire rédigé** expliquant :
- Quel Test Run est globalement le plus performant
- Les User Needs où la différence est la plus significative
- Une recommandation sur le combo LLM/prompt à privilégier

### 11.5 Règles de gestion

| ID | Règle |
|----|-------|
| RT-01 | Un Test Run en statut `running` ne peut pas être supprimé |
| RT-02 | La suppression d'un Test Run supprime aussi toutes ses `ai_analyses` |
| RT-03 | Deux Test Runs distincts doivent être sélectionnés pour la comparaison (A ≠ B) |
| RT-04 | L'analyse IA de comparaison utilise toujours `claude-3.5-sonnet` quel que soit le modèle configuré pour les analyses |

---

## 12. Module 8 — Classement des Test Runs

### 12.1 Description

Le panneau Tests contient un onglet **Classement** qui offre une visualisation comparative de tous les Test Runs sous forme de scatter plot interactif. Cet outil permet d'identifier rapidement les combinaisons LLM/prompt les plus performantes.

### 12.2 Scatter plot

Le graphique affiche chaque Test Run comme un point :

| Dimension | Signification |
|-----------|--------------|
| **Axe X** | Concordance (%) — accord entre prédiction IA et classification humaine |
| **Axe Y** | F1 macro (%) — moyenne harmonique de la précision et du rappel sur les 8 User Needs |
| **Taille du point** | Proportionnelle au nombre d'articles analysés (12 à 22 px) |
| **Nombre dans le point** | Nombre d'articles du Test Run |
| **Couleur** | Fournisseur du modèle LLM (violet = Anthropic, vert = OpenAI, bleu = Google, orange = Mistral, rouge = Meta) |
| **Zone bleue** | Zone de haute performance (concordance ≥ 60% et F1 ≥ 60%) |
| **Bordure dorée + 🏆** | Meilleur Test Run (F1 le plus élevé) |

Le graphique est zoomé automatiquement sur la plage de données pour maximiser la distinction entre les points.

### 12.3 Filtres par modèle

Des boutons colorés permettent de filtrer les points affichés par fournisseur LLM :

- **Tous** : affiche tous les Test Runs (par défaut)
- Boutons par modèle : toggle multi-sélection (cliquer un modèle pour l'activer/désactiver)
- Si aucun modèle n'est sélectionné, le filtre "Tous" est automatiquement réactivé

### 12.4 Tableau de classement

Sous le scatter plot, un tableau triable liste tous les Test Runs avec :
- Modèle LLM (badge coloré)
- Prompt utilisé
- Date
- Nombre d'articles
- Concordance (%)
- Précision, Rappel, F1 (%)

Le tableau est trié par défaut par F1 décroissant (meilleurs résultats en premier).

### 12.5 Interaction

Un clic sur un point du scatter plot ou sur une ligne du tableau ouvre le détail du Test Run correspondant dans l'onglet Historique.

**Tooltip au survol** : affiche le nom du modèle, du prompt, la date, le nombre d'articles, et les métriques détaillées (concordance, précision, rappel, F1).

### 12.6 Règles de gestion

| ID | Règle |
|----|-------|
| RK-01 | Seuls les Test Runs ayant au moins 1 article analysé sont affichés |
| RK-02 | Le F1 macro est calculé comme la moyenne non pondérée des F1 par User Need |
| RK-03 | Le meilleur Test Run est celui avec le F1 macro le plus élevé |
| RK-04 | Le tableau est trié par défaut par F1 décroissant |

---

## 13. Module 9 — Adaptation automatique du prompt

### 13.1 Description

La fonctionnalité **"💡 Adapter le prompt"** utilise l'IA pour améliorer automatiquement le prompt de classification en s'appuyant sur les erreurs de classification observées dans un Test Run. Elle est accessible après la fin d'une analyse IA.

### 13.2 Prérequis

| Condition | Description |
|-----------|------------|
| Test Run terminé | Un Test Run doit être complété ou arrêté avec des résultats |
| Matrice de confusion disponible | Le Test Run doit contenir des données de confusion exploitables |
| Clé API configurée | Nécessaire pour les appels au LLM d'adaptation |

### 13.3 Déroulement en deux étapes

**Étape 1 — Génération des propositions**

L'interface s'ouvre en modale pleine page avec deux colonnes :
- **Colonne gauche** : prompt actif actuel (lecture seule)
- **Colonne droite** : zone de chargement, puis propositions d'adaptation

Le système construit un méta-prompt contenant :
- Le taux de concordance du Test Run
- Les **6 principales confusions** extraites de la matrice (ex : "IA a prédit UPDATE ME au lieu de EXPLAIN ME : 5 fois")
- Le prompt actuellement utilisé

Ce méta-prompt est envoyé à **Claude 3.5 Sonnet** (modèle fixe, indépendant du modèle configuré pour la classification) qui génère 5 à 8 propositions d'adaptation ciblées et actionnables.

**Étape 2 — Application des modifications**

L'utilisateur consulte les propositions et clique sur **"Appliquer ces adaptations"**. Un second méta-prompt demande à Claude 3.5 Sonnet de produire des blocs de remplacement au format diff :

```
===DEBUT_MODIF===
ORIGINAL: [passage exact à remplacer]
NOUVEAU: [version améliorée]
===FIN_MODIF===
```

Le système applique automatiquement les modifications par recherche-remplacement dans le prompt original. Le résultat est affiché dans la colonne droite, et l'utilisateur peut :
- **Sauvegarder** le prompt adapté (créé comme nouveau prompt avec un nom incrémenté)
- **Annuler** et revenir au prompt original

### 13.4 Règles de gestion

| ID | Règle |
|----|-------|
| RP-10 | L'adaptation utilise toujours `claude-3.5-sonnet` quel que soit le modèle configuré |
| RP-11 | Les propositions sont générées à partir des 6 confusions les plus fréquentes |
| RP-12 | Le prompt adapté est sauvegardé comme un nouveau prompt (le prompt original n'est pas modifié) |
| RP-13 | Si aucune confusion significative n'est trouvée, le système l'indique et ne propose pas d'adaptation |
| RP-14 | Les modifications sont appliquées par recherche exacte dans le texte original ; les passages non trouvés sont ignorés |

---

## 14. Règles de gestion transversales

| ID | Règle |
|----|-------|
| RG-01 | Le heath check du serveur est effectué au chargement de l'application |
| RG-02 | Si le serveur est inaccessible, un message d'erreur explicite avec les instructions de démarrage est affiché |
| RG-03 | Les erreurs API (401, 429, 500) sont affichées avec un message actionnable |
| RG-04 | La configuration est chargée depuis `config.json` (dev) ou `/api/config` (production) |
| RG-05 | Les clés API ne sont jamais journalisées ni affichées en clair |
| RG-06 | L'interface reste réactive pendant l'analyse (mise à jour progressive) |
| RG-07 | Un bouton "Articles" dans le header permet de scroller directement vers la liste des articles |
| RG-08 | L'ordre des boutons dans le header est : Articles — LLM — Prompts — Tests — Analyse IA — Aide |
| RG-09 | L'accès en production est protégé par authentification HTTP Basic (variables d'environnement `BASIC_AUTH_USER` et `BASIC_AUTH_PASSWORD`) |
| RG-10 | La section Articles reste accessible pendant et après une analyse IA |

---

## 15. Exigences non fonctionnelles

### 15.1 Performance

| Exigence | Cible |
|----------|-------|
| Délai entre articles pendant analyse | 0,5 seconde (configurable) |
| Timeout par article | 120 secondes |
| Capacité testée | 100+ articles par session |
| Import RSS | Toutes les 30 minutes |

### 15.2 Compatibilité

| Exigence | Détail |
|----------|--------|
| Navigateurs | Chrome, Firefox, Safari, Edge (versions récentes) |
| Responsive | Optimisé desktop/tablette |

### 15.3 Sécurité

| Exigence | Détail |
|----------|--------|
| Clés API | Jamais affichées, jamais journalisées |
| Fichier de config | Exclu du dépôt de code (.gitignore) |
| CORS | Serveur proxy configuré pour autoriser l'origine de l'application |

### 15.4 Sécurité d'accès

| Exigence | Détail |
|----------|--------|
| Authentification production | HTTP Basic Auth via variables d'environnement |
| Mode développement | Pas d'authentification si variables non définies |

### 15.5 Accessibilité

| Exigence | Détail |
|----------|--------|
| Thème | Mode sombre par défaut |
| Navigation clavier | Modales fermables avec Échap |
| Retour visuel | Toasts de confirmation pour chaque action importante |

---

## 16. Annexes

### Annexe A — Glossaire

| Terme | Définition |
|-------|------------|
| **User Need** | Catégorie de besoin utilisateur permettant de classifier un article |
| **Test Run** | Session d'analyse IA correspondant à un couple LLM + prompt |
| **Matrice de confusion** | Tableau 8×8 croisant classifications humaines et prédictions IA |
| **Concordance** | Situation où la prédiction IA principale correspond à la classification humaine |
| **Reclassification** | Situation où la prédiction IA diffère de la classification humaine |
| **ICP** | Indice de Confiance de la Prédiction — mesure la certitude de l'IA |
| **Prompt** | Instruction système envoyée au LLM pour guider l'analyse |
| **LLM** | Large Language Model — modèle de langage utilisé pour l'analyse |
| **OpenRouter** | Passerelle unifiée donnant accès à plusieurs modèles IA via une seule clé API |
| **Supabase** | Backend as a Service (BaaS) utilisé comme base de données cloud |
| **Chapô** | Sous-titre ou introduction d'un article |
| **JSON-LD** | Format de données structurées embarqué dans les pages HTML (utilisé pour le scraping) |
| **Upsert** | Insertion ou mise à jour selon l'existence d'un enregistrement |
| **Feed RSS** | Flux de syndication permettant de récupérer les derniers articles publiés |

### Annexe B — Format de réponse IA

```
USERNEED PRINCIPAL : GIVE ME CONCERNING NEWS (SCORE : 60)
JUSTIFICATION : Alerte sur un risque sanitaire quotidien

USERNEED SECONDAIRE : UPDATE ME (SCORE : 30)
JUSTIFICATION : Fait d'actualité récent

USERNEED TERTIAIRE : EXPLAIN ME (SCORE : 10)
JUSTIFICATION : Contexte explicatif minimal
```

### Annexe C — États de l'interface

| État | Visible | Masqué |
|------|---------|--------|
| **Chargement initial** | Header, liste articles (chargement...) | Résultats, matrice, tableau |
| **Articles chargés** | Header, liste articles, filtres, graphique de distribution (si filtre "Classifiés") | Bouton Stop, barre de progression |
| **Analyse en cours** | Barre de progression, bouton Stop, matrice en construction, section Articles (toujours accessible) | Bouton Analyse IA |
| **Analyse terminée** | Matrice complète, statistiques, tableau, bouton Exporter, bouton "💡 Adapter le prompt" | Bouton Stop, barre de progression |
| **Analyse interrompue** | Résultats partiels, bouton Exporter, bouton "💡 Adapter le prompt" | Bouton Stop, barre de progression |
| **Adaptation du prompt** | Modale deux colonnes (prompt original + propositions/résultat) | Interface principale |

### Annexe D — Erreurs et messages utilisateur

| Situation | Message | Action suggérée |
|-----------|---------|-----------------|
| Serveur non démarré | "SERVEUR NON DÉMARRÉ" | Afficher les commandes de démarrage |
| Clé API manquante | "Clé API non configurée" | Ouvrir le panneau LLM |
| Clé API invalide (401) | "Clé API invalide" | Vérifier la clé dans le panneau LLM |
| Quota dépassé (429) | "Limite de requêtes atteinte" | Attendre ou vérifier le plan |
| Timeout article (>120s) | Article marqué en erreur | L'analyse continue avec l'article suivant |
| Aucun article classifié | "Aucun article classifié" | Classifier des articles d'abord |

---

*Ce document est fonctionnel : il décrit le QUOI et le POURQUOI, pas le COMMENT technique.*
*Mis à jour le 13 mars 2026 — France Télévisions / Franceinfo — Direction de l'Information*
