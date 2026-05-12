# Specifications Fonctionnelles — Phase 1 : Surveillance continue du combo Prompt + LLM (AI Drift Monitoring)

**Document de cadrage Product Owner**
**Version :** 1.0
**Date :** 5 mars 2026
**Auteur :** Product Owner — Direction de l'Information, France Televisions
**Destinataires :** Direction technique Franceinfo, Equipe de developpement

---

## Table des matieres

1. [Contexte et vision](#1-contexte-et-vision)
2. [Problematique adressee](#2-problematique-adresee)
3. [Objectifs du produit](#3-objectifs-du-produit)
4. [Utilisateurs cibles](#4-utilisateurs-cibles)
5. [Bilan du POC existant](#5-bilan-du-poc-existant)
6. [Vue d'ensemble fonctionnelle](#6-vue-densemble-fonctionnelle)
7. [Parcours utilisateur principal](#7-parcours-utilisateur-principal)
8. [Fonctionnalites detaillees](#8-fonctionnalites-detaillees)
9. [Regles de gestion](#9-regles-de-gestion)
10. [Modele de donnees](#10-modele-de-donnees)
11. [Alerting et notifications](#11-alerting-et-notifications)
12. [Export et restitution des donnees](#12-export-et-restitution-des-donnees)
13. [Exigences non fonctionnelles](#13-exigences-non-fonctionnelles)
14. [Dependances et prerequis](#14-dependances-et-prerequis)
15. [Annexes](#15-annexes)

---

## 1. Contexte et vision

### 1.1 Rappel du projet User Needs

France Televisions classe ses contenus editoriaux selon une grille de **8 User Needs** — des categories qui decrivent le besoin auquel repond un article pour le lecteur. Un POC (Proof of Concept), developpe entre janvier et mars 2026, a demontre la faisabilite d'une classification automatique par LLM : un modele de langage analyse chaque article et predit le User Need principal, avec un taux de concordance mesurable par rapport au jugement humain.

### 1.2 De la demonstration a la surveillance

Le POC a repondu a la question : **"Un LLM peut-il classifier les articles ?"** — la reponse est oui, avec des taux de concordance significatifs selon le modele et le prompt utilises.

La Phase 1 repond a la question suivante :

> **Comment garantir que la classification IA reste fiable dans le temps, malgre les evolutions des modeles LLM, les modifications des prompts, et les changements de nature du corpus editorial ?**

### 1.3 Le phenomene d'AI Drift

Les modeles de langage (LLM) evoluent continuellement :

| Facteur de drift | Description | Risque |
|------------------|-------------|--------|
| **Mise a jour du modele** | Les fournisseurs (Anthropic, OpenAI, Google...) mettent a jour leurs modeles sans preavis | Un modele qui fonctionnait bien peut soudainement degrader ses resultats |
| **Modification du prompt** | L'equipe editoriale ajuste le prompt pour ameliorer un aspect | L'amelioration d'un aspect peut degrader un autre sans qu'on le detecte |
| **Evolution du corpus** | Le ton editorial evolue, de nouveaux formats apparaissent | Le modele peut etre moins performant sur des contenus qu'il n'a jamais rencontres |
| **Depreciation du modele** | Un modele peut etre retire par son fournisseur | Necessite de basculer sur un autre modele sans perte de qualite |

Sans surveillance, ces degradations passent inaperques jusqu'a ce que les equipes editoriales constatent des classifications aberrantes — souvent trop tard.

### 1.4 Vision Phase 1

La Phase 1 met en place un **systeme de surveillance continue** qui :

- Constitue et gere des **Golden Datasets** (jeux de donnees de reference valides par des humains)
- Execute des **tests de regression automatises** a intervalles reguliers
- Historise chaque execution et ses metriques dans le temps
- Detecte les **degradations de performance** et declenche des alertes
- Trace chaque modification de prompt et mesure son impact
- Fournit un **tableau de bord historique** pour visualiser les tendances

---

## 2. Problematique adressee

### 2.1 Situation actuelle (POC)

| Capacite | Etat POC | Limite |
|----------|----------|--------|
| Lancer un test manuellement | Oui | Execution manuelle, pas de planification |
| Comparer 2 test runs | Oui | Pas de vue historique multi-runs |
| Stocker les resultats | Oui (Supabase) | Pas de detection automatique de degradation |
| Versionner les prompts | Partiel (snapshot) | Pas de versioning semantique, pas de diff |
| Alerter en cas de probleme | Non | Aucun mecanisme d'alerte |
| Tester sur un dataset fige | Non | Le corpus change a chaque test |

### 2.2 Ce que la Phase 1 ajoute

```
POC EXISTANT                          PHASE 1
─────────────────────────────         ─────────────────────────────────────
Test manuel ponctuel          ──►     Tests automatises recurrents
Corpus variable               ──►     Golden Datasets figes et versionnes
Comparaison 2 runs            ──►     Dashboard historique multi-runs
Pas d'alerte                  ──►     Seuils configurables + notifications
Prompt snapshot               ──►     Versioning complet des prompts
Pas de baseline               ──►     Baseline de reference par combo
```

---

## 3. Objectifs du produit

### 3.1 Objectifs metier

| Objectif | Mesure de succes |
|----------|-----------------|
| Detecter toute degradation du taux de concordance | Alerte declenchee si le taux chute sous le seuil configure |
| Prouver la stabilite du systeme dans le temps | Historique des runs montrant une performance stable ou croissante |
| Mesurer l'impact de chaque changement de prompt | Comparaison avant/apres sur le meme Golden Dataset |
| Faciliter le choix du modele de reference | Classement des modeles par performance sur le meme dataset |
| Justifier le maintien ou le remplacement d'un modele | Donnees factuelles et tendances sur plusieurs semaines/mois |

### 3.2 Indicateurs cles (KPI)

| KPI | Description | Objectif |
|-----|-------------|----------|
| **Taux de concordance global** | % d'articles ou prediction IA = classification humaine | Maintien au-dessus du seuil de reference (configurable) |
| **Taux de concordance par User Need** | Performance ventilee par categorie | Aucune categorie ne doit chuter sous 50% |
| **Tendance du taux de concordance** | Evolution sur les N derniers runs | Pas de tendance baissiere sur 3 runs consecutifs |
| **Indice de confiance moyen (ICP)** | Moyenne de l'Indice de Confiance Pondere | Maintien au-dessus de 15 |
| **Taux de "Non identifie"** | % de reponses non parsables | Doit rester sous 5% |
| **Temps moyen de reponse LLM** | Latence par article | Sous 10 secondes |

---

## 4. Utilisateurs cibles

| Profil | Usage principal | Frequence |
|--------|----------------|-----------|
| **Chef de projet IA/Data** | Configurer les tests, analyser les tendances, ajuster les prompts | Quotidien |
| **Responsable editorial** | Consulter le dashboard, valider la fiabilite du systeme | Hebdomadaire |
| **Directeur technique** | Verifier la stabilite, justifier les choix de modeles | Mensuel |
| **Data analyst** | Analyser les patterns de degradation, optimiser les seuils | Hebdomadaire |

---

## 5. Bilan du POC existant

### 5.1 Acquis reutilisables

Le POC a produit des composants et des donnees directement reutilisables pour la Phase 1 :

| Acquis | Description | Reutilisation Phase 1 |
|--------|-------------|----------------------|
| **Infrastructure Supabase** | Base PostgreSQL avec tables articles, classifications, test_runs, ai_analyses, prompts | Extension du schema existant |
| **Moteur d'analyse** | Pipeline article → prompt → LLM → parsing → metriques | Coeur du systeme de regression |
| **13+ modeles configures** | Acces via OpenRouter a Claude, GPT, Gemini, Mistral, Llama, Qwen | Tous disponibles pour les tests |
| **Metriques existantes** | Concordance, ICP, Delta, matrice de confusion | Directement reutilisees |
| **Corpus d'articles** | ~500+ articles avec corps, importes depuis les flux RSS | Base pour constituer les Golden Datasets |
| **Classifications humaines** | Articles classes par les equipes editoriales | Ground truth pour les Golden Datasets |
| **Prompts sauvegardes** | Prompts testes avec leurs resultats | Historique de reference |

### 5.2 Limites a depasser

| Limite du POC | Impact | Resolution Phase 1 |
|---------------|--------|---------------------|
| Execution manuelle uniquement | Pas de surveillance continue | Planification automatisee des tests |
| Corpus non fige entre les tests | Resultats non comparables d'un run a l'autre | Golden Datasets immuables |
| Pas de detection de degradation | Problemes decouverts tardivement | Seuils d'alerte configurables |
| Prompt snapshot sans versioning | Impossible de tracer les changements | Versioning semantique des prompts |
| Frontend vanilla JS | Difficile a maintenir en equipe | Migration vers framework (hors scope Phase 1, mais prepare) |

---

## 6. Vue d'ensemble fonctionnelle

### 6.1 Carte des fonctionnalites

```
PHASE 1 — AI DRIFT MONITORING
│
├── F1 - Gestion des Golden Datasets
│   ├── Creation d'un Golden Dataset a partir d'articles existants
│   ├── Selection manuelle des articles a inclure
│   ├── Validation et gel du dataset (immutabilite)
│   ├── Versioning des datasets (v1, v2...)
│   ├── Visualisation du contenu d'un dataset
│   └── Archivage d'un dataset obsolete
│
├── F2 - Versioning des prompts
│   ├── Versioning semantique (majeure.mineure.patch)
│   ├── Historique complet des modifications
│   ├── Diff entre deux versions
│   ├── Restauration d'une version anterieure
│   └── Association prompt-version ↔ test runs
│
├── F3 - Configuration des tests de regression
│   ├── Definition d'un test : Golden Dataset + Modele + Prompt
│   ├── Planification recurrente (quotidien, hebdomadaire, mensuel)
│   ├── Execution manuelle a la demande
│   └── Configuration des seuils d'alerte par test
│
├── F4 - Execution automatisee des tests
│   ├── Lancement automatique selon le planning
│   ├── Traitement sequentiel des articles du Golden Dataset
│   ├── Calcul de toutes les metriques (concordance, ICP, matrice)
│   ├── Comparaison automatique avec le run precedent
│   ├── Stockage complet des resultats
│   └── Declenchement des alertes si seuils depasses
│
├── F5 - Dashboard historique
│   ├── Courbe d'evolution du taux de concordance dans le temps
│   ├── Vue comparative multi-modeles
│   ├── Vue comparative multi-prompts
│   ├── Heatmap d'evolution par User Need
│   ├── Filtrage par periode, modele, prompt, dataset
│   └── Indicateurs de tendance (stable, amelioration, degradation)
│
├── F6 - Systeme d'alertes
│   ├── Seuils configurables par metrique
│   ├── Notification par email
│   ├── Journal des alertes dans le dashboard
│   ├── Distinction severite : avertissement / critique
│   └── Acquittement des alertes
│
├── F7 - Rapports de regression
│   ├── Rapport automatique apres chaque run
│   ├── Rapport de comparaison entre 2 runs
│   ├── Rapport de tendance sur N runs
│   └── Export PDF et Excel
│
└── F8 - Administration
    ├── Gestion des utilisateurs (lecture seule vs admin)
    ├── Configuration des notifications
    ├── Gestion des cles API
    └── Logs d'execution des tests
```

### 6.2 Diagramme de flux global

```
                    ┌─────────────────────────┐
                    │   GOLDEN DATASETS        │
                    │   (articles + classif.   │
                    │    humaines figees)       │
                    └────────────┬─────────────┘
                                 │
                    ┌────────────▼─────────────┐
                    │   PLANIFICATEUR           │
                    │   (cron cloud)            │
                    │   Quotidien / Hebdo /     │
                    │   Mensuel / Manuel        │
                    └────────────┬─────────────┘
                                 │
              ┌──────────────────▼──────────────────┐
              │         MOTEUR DE TEST               │
              │                                      │
              │  Pour chaque article du dataset :    │
              │  1. Construction du prompt            │
              │  2. Appel LLM (via OpenRouter)       │
              │  3. Parsing de la reponse            │
              │  4. Calcul concordance + ICP + Delta  │
              │                                      │
              │  A la fin du run :                   │
              │  5. Matrice de confusion              │
              │  6. Statistiques agregees            │
              │  7. Comparaison avec run N-1          │
              └──────────┬───────────┬──────────────┘
                         │           │
              ┌──────────▼───┐  ┌────▼──────────────┐
              │  STOCKAGE     │  │  EVALUATION        │
              │  (Supabase)   │  │  SEUILS            │
              │  - test_runs  │  │                    │
              │  - ai_analyses│  │  Concordance < X ? │
              │  - metriques  │  │  ICP < Y ?         │
              └──────────┬───┘  │  Tendance ↘ ?      │
                         │      └────┬───────────────┘
                         │           │
              ┌──────────▼───────────▼──────────────┐
              │         DASHBOARD HISTORIQUE          │
              │                                      │
              │  - Courbes temporelles               │
              │  - Comparaison modeles               │
              │  - Heatmap User Needs                │
              │  - Journal des alertes               │
              └──────────────────────────────────────┘
                         │
              ┌──────────▼──────────────────────────┐
              │         ALERTES                      │
              │  - Email                             │
              │  - Indicateur visuel dashboard       │
              └─────────────────────────────────────┘
```

---

## 7. Parcours utilisateur principal

### 7.1 Parcours de mise en place (premiere utilisation)

```
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  1. CREER UN GOLDEN DATASET                                         │
│     └─> Naviguer vers la section "Golden Datasets"                  │
│     └─> Cliquer "Nouveau Golden Dataset"                            │
│     └─> Nommer le dataset (ex: "GD-Baseline-Mars2026")              │
│     └─> Selectionner les articles depuis le corpus existant         │
│         (filtrage par categorie, date, media type)                  │
│     └─> Verifier que chaque article a une classification humaine    │
│     └─> Valider et geler le dataset                                │
│     └─> Le dataset est immutable : son contenu ne change plus       │
│                                                                      │
│  2. CONFIGURER UN TEST DE REGRESSION                                 │
│     └─> Naviguer vers "Tests de regression"                         │
│     └─> Cliquer "Nouveau test"                                     │
│     └─> Selectionner le Golden Dataset                              │
│     └─> Selectionner le modele LLM                                  │
│     └─> Selectionner le prompt (et sa version)                      │
│     └─> Definir les seuils d'alerte :                               │
│         - Concordance minimale (ex: 65%)                            │
│         - ICP minimal (ex: 15)                                      │
│         - Degradation maximale vs run precedent (ex: -5 pts)        │
│     └─> Definir la periodicite (hebdomadaire)                       │
│     └─> Activer le test                                              │
│                                                                      │
│  3. LANCER UN PREMIER RUN MANUEL (baseline)                          │
│     └─> Cliquer "Executer maintenant"                               │
│     └─> Suivre la progression en temps reel                         │
│     └─> A la fin : consulter le rapport de baseline                 │
│     └─> Ce premier run devient la reference                          │
│                                                                      │
│  4. LE SYSTEME PREND LE RELAIS                                       │
│     └─> Les runs s'executent automatiquement selon le planning      │
│     └─> Les resultats sont stockes et compares                      │
│     └─> Les alertes sont envoyees si necessaire                     │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### 7.2 Parcours de surveillance quotidien

```
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  1. CONSULTER LE DASHBOARD                                           │
│     └─> Vue d'ensemble : tous les tests actifs                      │
│     └─> Indicateur de sante par test :                              │
│         🟢 Vert = dernier run dans les seuils                       │
│         🟡 Jaune = avertissement (proche du seuil)                  │
│         🔴 Rouge = alerte critique (seuil depasse)                  │
│                                                                      │
│  2. INVESTIGUER UNE ALERTE (si presente)                             │
│     └─> Cliquer sur le test en alerte                               │
│     └─> Voir le rapport du dernier run                              │
│     └─> Comparer avec le run precedent (quelles categories ont      │
│         degrade ?)                                                   │
│     └─> Consulter le detail article par article                     │
│     └─> Identifier la cause : modele ? prompt ? corpus ?            │
│                                                                      │
│  3. REAGIR                                                           │
│     └─> Cas 1 : degradation liee au modele                          │
│         └─> Lancer le meme Golden Dataset sur un autre modele       │
│         └─> Comparer les resultats                                  │
│         └─> Eventuellement changer le modele de reference           │
│     └─> Cas 2 : degradation liee au prompt                          │
│         └─> Consulter l'historique des versions du prompt            │
│         └─> Restaurer une version anterieure                         │
│         └─> Relancer un test pour verifier                          │
│     └─> Cas 3 : resultat stable                                     │
│         └─> Acquitter l'alerte                                      │
│         └─> Ajuster le seuil si necessaire                          │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### 7.3 Parcours de changement de prompt

```
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  1. MODIFIER UN PROMPT                                               │
│     └─> Ouvrir le prompt actif                                      │
│     └─> Modifier le contenu                                         │
│     └─> Sauvegarder → creation automatique d'une nouvelle version    │
│     └─> Le systeme affiche le diff avec la version precedente        │
│                                                                      │
│  2. TESTER L'IMPACT                                                  │
│     └─> Lancer un run immediat avec le nouveau prompt                │
│         sur le meme Golden Dataset et le meme modele                 │
│     └─> Le rapport compare automatiquement :                        │
│         - Prompt v1.2 (precedent) vs Prompt v1.3 (nouveau)          │
│         - Concordance globale : gain ou perte                       │
│         - Concordance par User Need : quelles categories gagnent    │
│           ou perdent                                                 │
│     └─> Decision : conserver ou revenir en arriere                   │
│                                                                      │
│  3. DEPLOYER OU ROLLBACK                                             │
│     └─> Si amelioration : le nouveau prompt devient la reference     │
│     └─> Si degradation : restaurer la version precedente             │
│     └─> Dans les deux cas : le test planifie continue avec           │
│         la version active                                            │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 8. Fonctionnalites detaillees

### F1 - Gestion des Golden Datasets

**Description :** Un Golden Dataset est un ensemble fige d'articles, chacun associe a une classification humaine validee. Il sert de reference immuable pour evaluer la performance d'un combo modele + prompt dans le temps.

**Proprietes d'un Golden Dataset :**

| Propriete | Description | Obligatoire |
|-----------|-------------|-------------|
| Nom | Identifiant lisible (ex: "GD-Baseline-Mars2026") | Oui |
| Description | Objectif du dataset, contexte de creation | Non |
| Articles | Liste d'articles avec titre, chapo, corps et URL | Oui |
| Classifications humaines | User Need attribue par un humain pour chaque article | Oui |
| Date de creation | Horodatage de la creation | Automatique |
| Createur | Identifiant de l'utilisateur ayant cree le dataset | Automatique |
| Statut | Brouillon / Valide / Archive | Oui |
| Version | Numero de version (v1, v2...) | Automatique |

**Cycle de vie d'un Golden Dataset :**

```
                    ┌──────────┐
         Creer ──►  │ BROUILLON │
                    └─────┬────┘
                          │ Valider
                    ┌─────▼────┐
                    │  VALIDE   │ ◄── Utilise par les tests
                    └─────┬────┘
                          │ Archiver
                    ┌─────▼────┐
                    │ ARCHIVE   │ ◄── Lecture seule, non utilisable
                    └──────────┘
```

**Regles de constitution :**

| ID | Regle |
|----|-------|
| GD-01 | Un Golden Dataset doit contenir au minimum **30 articles** pour etre statistiquement significatif |
| GD-02 | Chaque article du dataset **doit** avoir une classification humaine validee |
| GD-03 | Le dataset doit couvrir **au moins 6 des 8 User Needs** pour etre representatif |
| GD-04 | Une fois valide, le contenu d'un Golden Dataset est **immutable** : les articles et leurs classifications ne peuvent plus etre modifies |
| GD-05 | Pour modifier un dataset valide, il faut creer une **nouvelle version** (copie modifiable) |
| GD-06 | Un dataset archive ne peut plus etre utilise pour de nouveaux tests, mais les runs historiques restent accessibles |
| GD-07 | La repartition des User Needs dans le dataset est affichee pour que l'utilisateur puisse verifier l'equilibre |

**Selection des articles :**

L'utilisateur peut selectionner les articles a inclure dans un Golden Dataset via :
- **Filtrage** : par categorie editoriale (Politique, Monde, Economie...), par media type (Article, Video), par date de publication
- **Selection manuelle** : cocher/decocher les articles individuellement
- **Import** : depuis un fichier Excel (meme format que le POC)

**Criteres d'acceptation :**
- [ ] L'utilisateur peut creer un nouveau Golden Dataset avec un nom et une description
- [ ] L'utilisateur peut selectionner des articles depuis le corpus Supabase avec des filtres
- [ ] Le systeme indique la repartition des User Needs dans le dataset en cours de constitution
- [ ] Le systeme refuse la validation si moins de 30 articles ou moins de 6 User Needs representes
- [ ] Un dataset valide ne peut pas etre modifie (boutons d'edition desactives)
- [ ] L'utilisateur peut creer une nouvelle version depuis un dataset valide
- [ ] L'utilisateur peut archiver un dataset (avec confirmation)
- [ ] Les datasets sont listes avec leur statut, nombre d'articles, date de creation, et nombre de runs associes

---

### F2 - Versioning des prompts

**Description :** Chaque modification d'un prompt cree automatiquement une nouvelle version tracee. L'historique complet est conserve pour permettre la comparaison et le rollback.

**Schema de versioning :**

Le versioning suit un schema semantique simplifie `MAJEURE.MINEURE` :

| Type | Quand | Exemple |
|------|-------|---------|
| **MAJEURE** | Changement structurel du prompt (ajout/suppression de section, changement de role, modification des definitions User Needs) | v1.0 → v2.0 |
| **MINEURE** | Ajustement de formulation, correction, precision | v1.0 → v1.1 |

L'utilisateur choisit le type d'increment lors de la sauvegarde.

**Informations tracees par version :**

| Information | Description |
|-------------|-------------|
| Numero de version | MAJEURE.MINEURE |
| Contenu complet | Le texte integral du prompt |
| Date de creation | Horodatage |
| Auteur | Utilisateur ayant fait la modification |
| Note de changement | Description libre de ce qui a change (obligatoire) |
| Hash du contenu | Empreinte SHA-256 pour detecter les modifications accidentelles |

**Diff entre versions :**

L'utilisateur peut comparer deux versions d'un meme prompt. Le systeme affiche :
- Les lignes ajoutees (en vert)
- Les lignes supprimees (en rouge)
- Les lignes modifiees (surlignage jaune)
- Un resume : nombre de lignes ajoutees / supprimees / modifiees

**Restauration :**

L'utilisateur peut restaurer une version anterieure. La restauration cree une **nouvelle version** (pas d'ecrasement de l'historique). Exemple : restaurer v1.2 depuis v2.0 cree v2.1 avec le contenu de v1.2.

**Criteres d'acceptation :**
- [ ] Chaque sauvegarde d'un prompt cree une nouvelle version avec un numero incremente
- [ ] L'utilisateur choisit entre increment majeur ou mineur
- [ ] Une note de changement est obligatoire a chaque sauvegarde
- [ ] L'historique complet des versions est consultable dans un panneau dedie
- [ ] L'utilisateur peut visualiser le diff entre deux versions
- [ ] L'utilisateur peut restaurer une version anterieure (creation d'une nouvelle version)
- [ ] Chaque test run est lie a la version exacte du prompt utilise
- [ ] La version active du prompt est clairement identifiee dans l'interface

---

### F3 - Configuration des tests de regression

**Description :** Un test de regression definit un triplet {Golden Dataset, Modele LLM, Prompt (version)} et les parametres de son execution.

**Definition d'un test :**

| Parametre | Description | Obligatoire |
|-----------|-------------|-------------|
| Nom | Identifiant lisible (ex: "Baseline Claude Haiku") | Oui |
| Description | Objectif du test | Non |
| Golden Dataset | Dataset de reference a utiliser | Oui |
| Modele LLM | Modele a tester | Oui |
| Prompt | Prompt actif et sa version | Oui |
| Periodicite | Frequence d'execution automatique | Oui |
| Seuils d'alerte | Criteres de declenchement des alertes | Oui |
| Statut | Actif / En pause / Archive | Oui |

**Options de periodicite :**

| Frequence | Detail | Usage recommande |
|-----------|--------|------------------|
| Quotidien | Tous les jours a une heure configurable | Modeles en production critique |
| Hebdomadaire | Un jour precis de la semaine (ex: lundi 6h) | Surveillance standard |
| Mensuel | Un jour precis du mois (ex: le 1er a 6h) | Modeles stables, bilan mensuel |
| Manuel uniquement | Pas d'execution automatique | Tests ad hoc, comparaisons |

**Configuration des seuils d'alerte :**

| Seuil | Description | Valeur par defaut | Severite |
|-------|-------------|-------------------|----------|
| Concordance minimale absolue | Le taux de concordance ne doit jamais descendre sous cette valeur | 55% | Critique |
| Degradation relative maximale | La baisse par rapport au run precedent ne doit pas depasser ce delta | -5 points | Avertissement |
| Degradation relative critique | La baisse par rapport au run precedent est alarmante | -10 points | Critique |
| ICP moyen minimal | L'indice de confiance ne doit pas descendre sous cette valeur | 12 | Avertissement |
| Taux de "Non identifie" maximal | Le taux de reponses non parsables ne doit pas depasser ce seuil | 5% | Critique |
| Concordance minimale par User Need | Aucune categorie individuelle ne doit descendre sous ce seuil | 40% | Avertissement |

**Criteres d'acceptation :**
- [ ] L'utilisateur peut creer un nouveau test avec tous les parametres requis
- [ ] Le Golden Dataset doit etre au statut "Valide" pour etre selectionnable
- [ ] Les seuils d'alerte sont pre-remplis avec les valeurs par defaut et modifiables
- [ ] L'utilisateur peut choisir la periodicite parmi les 4 options
- [ ] Un test peut etre mis en pause (les runs planifies sont suspendus) ou reactive
- [ ] Un test peut etre archive (lecture seule, runs historiques conserves)
- [ ] La liste des tests affiche leur statut, derniere execution, resultat du dernier run

---

### F4 - Execution automatisee des tests

**Description :** Le systeme execute les tests selon leur planification, ou a la demande de l'utilisateur. Chaque execution (run) produit un rapport complet.

**Deroulement d'un run :**

```
1. INITIALISATION
   ├── Charger le Golden Dataset
   ├── Charger le prompt (version active)
   ├── Verifier la disponibilite du modele LLM
   └── Creer l'entree test_run en base (statut: "running")

2. TRAITEMENT SEQUENTIEL
   Pour chaque article du Golden Dataset :
   ├── Construire le prompt complet (prompt + article)
   ├── Appeler le LLM via OpenRouter
   ├── Parser la reponse
   ├── Calculer les metriques article :
   │   ├── Concordance (match principal vs humain)
   │   ├── Delta (ecart P1 - P2)
   │   ├── ICP (indice de confiance pondere)
   │   └── Niveau de confiance (HAUTE / MOYENNE / BASSE)
   ├── Stocker le resultat article en base
   └── Attendre le delai inter-articles (5 secondes)

3. AGREGATION
   ├── Calculer la matrice de confusion 8x8
   ├── Calculer le taux de concordance global
   ├── Calculer le taux de concordance par User Need
   ├── Calculer l'ICP moyen
   ├── Calculer le taux de "Non identifie"
   ├── Identifier le Top 10 des reclassifications
   └── Calculer le temps total d'execution

4. COMPARAISON AVEC LE RUN PRECEDENT
   Si un run precedent existe pour le meme test :
   ├── Calculer le delta de concordance globale
   ├── Calculer les deltas par User Need
   ├── Identifier les categories en amelioration
   ├── Identifier les categories en degradation
   └── Identifier les articles qui ont change de prediction

5. EVALUATION DES SEUILS
   ├── Comparer chaque metrique aux seuils configures
   ├── Si depassement : creer une alerte
   └── Mettre a jour le statut du test (vert / jaune / rouge)

6. FINALISATION
   ├── Mettre a jour le test_run (statut: "completed")
   ├── Generer le rapport de run
   └── Envoyer les notifications si alertes
```

**Gestion des erreurs pendant un run :**

| Erreur | Comportement |
|--------|-------------|
| Timeout sur un article (120s) | L'article est marque "ERROR", le run continue |
| Erreur API (401, 429, 500) | 3 retries avec backoff exponentiel (5s, 15s, 45s), puis marque en erreur |
| Modele indisponible | Le run est annule, alerte critique envoyee |
| Reponse non parsable | L'article est marque "Non identifie", comptabilise dans le taux d'erreur |
| Interruption utilisateur | Les resultats partiels sont conserves, le run passe en statut "stopped" |

**Execution concurrente :**
- Un seul run peut s'executer a la fois pour un meme test
- Si un run planifie est declenche alors qu'un run manuel est en cours, le run planifie est reporte au prochain creneau
- Plusieurs tests differents peuvent s'executer en parallele (ils utilisent des modeles potentiellement differents)

**Criteres d'acceptation :**
- [ ] Un run planifie se declenche automatiquement a l'heure configuree
- [ ] L'utilisateur peut lancer un run manuel depuis l'interface
- [ ] La progression du run est visible en temps reel (X/N articles)
- [ ] L'utilisateur peut interrompre un run en cours
- [ ] Les erreurs sur un article ne bloquent pas le run
- [ ] Le rapport est genere automatiquement a la fin du run
- [ ] La comparaison avec le run precedent est automatique
- [ ] Les alertes sont declenchees si les seuils sont depasses
- [ ] Le run est correctement stocke en base avec toutes les metriques

---

### F5 - Dashboard historique

**Description :** Interface centrale de surveillance, affichant l'evolution des performances dans le temps et l'etat de sante de chaque test.

**Vue d'ensemble (page d'accueil) :**

Affiche tous les tests actifs sous forme de cartes :

```
┌───────────────────────────────────────────┐
│  🟢 Baseline Claude Haiku                 │
│  Golden Dataset: GD-Baseline-Mars2026     │
│  Dernier run: 04/03/2026 06:00            │
│  Concordance: 72% (↑ +2 pts)             │
│  Prochain run: 11/03/2026 06:00           │
└───────────────────────────────────────────┘

┌───────────────────────────────────────────┐
│  🟡 Test GPT-4o Prompt v2.1               │
│  Golden Dataset: GD-Baseline-Mars2026     │
│  Dernier run: 04/03/2026 06:15            │
│  Concordance: 58% (↓ -4 pts)             │
│  ⚠ Proche du seuil (55%)                 │
│  Prochain run: 11/03/2026 06:15           │
└───────────────────────────────────────────┘

┌───────────────────────────────────────────┐
│  🔴 Test Gemini Flash Prompt v1.0         │
│  Golden Dataset: GD-Baseline-Mars2026     │
│  Dernier run: 04/03/2026 06:30            │
│  Concordance: 49% (↓ -8 pts)             │
│  🚨 ALERTE : sous le seuil de 55%        │
│  Prochain run: 11/03/2026 06:30           │
└───────────────────────────────────────────┘
```

**Graphique d'evolution temporelle :**

- **Axe X :** Date des runs
- **Axe Y :** Taux de concordance (%)
- **Courbes :** Une courbe par test (ou une courbe par modele si filtre par Golden Dataset)
- **Ligne de reference :** Le seuil minimal configure (en pointilles rouges)
- **Annotations :** Marqueurs aux points ou le prompt a change de version
- **Survol :** Affiche les details du run au survol d'un point

**Heatmap par User Need :**

Matrice coloree montrant l'evolution du taux de concordance par User Need au fil des runs :

| Run | UPDATE ME | EXPLAIN ME | PERSPECTIVE | BREAK | CONCERNING | INSPIRE | FEEL | REVEAL |
|-----|-----------|------------|-------------|-------|------------|---------|------|--------|
| #12 | 🟢 78% | 🟢 71% | 🟡 62% | 🟢 75% | 🟡 58% | 🟢 69% | 🔴 45% | 🟡 60% |
| #11 | 🟢 80% | 🟢 73% | 🟢 65% | 🟢 74% | 🟡 61% | 🟢 70% | 🟡 52% | 🟡 62% |
| #10 | 🟢 79% | 🟢 72% | 🟢 64% | 🟢 76% | 🟡 60% | 🟢 68% | 🟡 50% | 🟡 61% |

Les couleurs sont relatives aux seuils configures.

**Vue comparative multi-modeles :**

Lorsqu'un meme Golden Dataset est teste avec plusieurs modeles, afficher un graphique en barres comparant les performances :

| Metrique | Claude Haiku | GPT-4o | Gemini Flash | Mistral Small |
|----------|-------------|--------|-------------|---------------|
| Concordance | 72% | 68% | 49% | 63% |
| ICP moyen | 22.4 | 19.8 | 14.2 | 17.6 |
| Non identifie | 1% | 2% | 8% | 3% |
| Temps/article | 2.8s | 3.5s | 1.9s | 2.4s |

**Filtres disponibles :**

| Filtre | Options |
|--------|---------|
| Periode | 7 derniers jours / 30 jours / 90 jours / 6 mois / 1 an / Personnalise |
| Modele | Liste des modeles testes |
| Prompt | Liste des prompts (avec version) |
| Golden Dataset | Liste des datasets utilises |
| Statut du run | Tous / Completed / Stopped / Error |

**Criteres d'acceptation :**
- [ ] La page d'accueil affiche tous les tests actifs avec leur indicateur de sante
- [ ] Le graphique d'evolution est interactif (survol, zoom, filtres)
- [ ] Les changements de version de prompt sont annotes sur le graphique
- [ ] La heatmap par User Need est lisible et coloree selon les seuils
- [ ] La vue comparative multi-modeles est disponible
- [ ] Tous les filtres fonctionnent et se combinent entre eux
- [ ] Les indicateurs de tendance (fleches haut/bas) sont corrects

---

### F6 - Systeme d'alertes

**Description :** Le systeme declenche des alertes lorsque les metriques d'un run depassent les seuils configures. Les alertes sont visibles dans le dashboard et envoyees par email.

**Niveaux de severite :**

| Severite | Icone | Signification | Exemple |
|----------|-------|--------------|---------|
| **Avertissement** | 🟡 | Metrique proche du seuil ou degradation moderee | Concordance en baisse de 4 points |
| **Critique** | 🔴 | Seuil depasse ou degradation severe | Concordance sous 55% |

**Contenu d'une alerte :**

| Champ | Description |
|-------|-------------|
| Date et heure | Horodatage de l'alerte |
| Test concerne | Nom du test de regression |
| Severite | Avertissement ou Critique |
| Metrique | L'indicateur ayant declenche l'alerte |
| Valeur observee | La valeur mesuree lors du run |
| Seuil configure | La valeur seuil depassee |
| Run precedent | La valeur du run precedent (pour contextualiser) |
| Lien | Lien direct vers le rapport du run |

**Exemple de notification email :**

```
Objet : 🔴 [CRITIQUE] Degradation detectee — Test "Baseline Claude Haiku"

Le run du 04/03/2026 (06:00) a detecte une degradation critique :

  Test : Baseline Claude Haiku
  Golden Dataset : GD-Baseline-Mars2026
  Modele : Claude 3.5 Haiku
  Prompt : Prompt Franceinfo v2.1

  Concordance : 49% (seuil : 55%)
  Run precedent : 62% (chute de -13 points)

  Categories les plus degradees :
  - MAKE ME FEEL THE NEWS : 30% (etait 55%)
  - GIVE ME CONCERNING NEWS : 42% (etait 58%)

  → Consulter le rapport complet : [lien]
```

**Journal des alertes :**

Toutes les alertes sont listees dans un journal chronologique dans le dashboard, avec :
- Filtrage par severite, par test, par periode
- Statut : Nouvelle / Vue / Acquittee
- L'utilisateur peut acquitter une alerte (la marquer comme traitee)

**Criteres d'acceptation :**
- [ ] Les alertes sont declenchees automatiquement a la fin de chaque run
- [ ] Les emails sont envoyes aux destinataires configures
- [ ] Le journal des alertes est visible dans le dashboard
- [ ] Les alertes peuvent etre filtrees par severite, test, et periode
- [ ] L'utilisateur peut acquitter une alerte
- [ ] Le detail de l'alerte inclut le lien vers le rapport du run

---

### F7 - Rapports de regression

**Description :** A chaque run, un rapport est genere automatiquement. Des rapports de comparaison et de tendance sont egalement disponibles.

**Rapport de run (genere automatiquement) :**

| Section | Contenu |
|---------|---------|
| Resume | Nom du test, date, modele, prompt (version), Golden Dataset, duree, nombre d'articles |
| Metriques globales | Concordance, ICP moyen, Delta moyen, Taux de "Non identifie" |
| Comparaison avec N-1 | Delta de chaque metrique vs run precedent, avec fleche et couleur |
| Concordance par User Need | Tableau avec taux par categorie + delta vs N-1 |
| Matrice de confusion | Matrice 8x8 identique a celle du POC |
| Top 10 reclassifications | Les 10 paires source → prediction les plus frequentes |
| Articles en erreur | Liste des articles non analyses (timeout, erreur API, non parsable) |
| Alertes declenchees | Liste des seuils depasses lors de ce run |

**Rapport de comparaison (sur demande) :**

L'utilisateur selectionne 2 runs (meme test ou tests differents) et obtient :
- Comparaison cote a cote des metriques
- Diff de la matrice de confusion (cellule par cellule)
- Liste des articles ayant change de prediction entre les 2 runs
- Identification des changements : modele different ? prompt different ?

**Rapport de tendance (sur demande) :**

L'utilisateur selectionne un test et une periode, et obtient :
- Graphique d'evolution des metriques sur la periode
- Statistiques : moyenne, mediane, ecart-type, min, max
- Identification des points de rupture (changement brutal)
- Correlation avec les changements de version de prompt (annotations)

**Export :**

Tous les rapports sont exportables en :
- **Excel** (.xlsx) : donnees brutes exploitables
- **PDF** : version formatee pour partage/archivage

**Criteres d'acceptation :**
- [ ] Un rapport de run est genere automatiquement a la fin de chaque run
- [ ] Le rapport inclut toutes les sections listees ci-dessus
- [ ] L'utilisateur peut generer un rapport de comparaison entre 2 runs
- [ ] L'utilisateur peut generer un rapport de tendance sur une periode
- [ ] Les rapports sont exportables en Excel et PDF
- [ ] Les rapports historiques restent accessibles indefiniment

---

### F8 - Administration

**Description :** Fonctionnalites de gestion et de configuration du systeme.

**Gestion des utilisateurs :**

| Role | Droits |
|------|--------|
| **Admin** | Tout : creer/modifier/supprimer des tests, Golden Datasets, prompts. Configurer les alertes et les seuils |
| **Editeur** | Creer et modifier des Golden Datasets. Lancer des runs manuels. Modifier les prompts |
| **Lecteur** | Consulter le dashboard, les rapports et les alertes. Exporter des donnees |

> **Note :** L'authentification s'appuie sur le SSO France Televisions (cf. section 14 - Dependances).

**Configuration des notifications :**

- Liste des destinataires email par test (ou globale)
- Choix du niveau minimum de notification : Critique uniquement / Avertissement et Critique / Tout
- Configuration des horaires de notification (pas de mails la nuit sauf critique)

**Gestion des cles API :**

- Les cles API sont stockees cote serveur (variables d'environnement)
- Jamais exposees dans le frontend
- Un admin peut mettre a jour les cles depuis un panneau securise
- Le systeme verifie la validite de la cle (appel de test) avant sauvegarde

**Logs d'execution :**

- Journal chronologique de tous les evenements systeme
- Filtrage par type (run, alerte, erreur, modification de config)
- Retention : 12 mois

**Criteres d'acceptation :**
- [ ] Les 3 roles sont implementes avec les droits correspondants
- [ ] Les notifications sont configurables par test et par niveau de severite
- [ ] Les cles API ne sont jamais visibles dans le frontend
- [ ] Les logs d'execution sont accessibles aux admins
- [ ] La configuration est modifiable sans redemarrage de l'application

---

## 9. Regles de gestion

### 9.1 Regles generales

| ID | Regle | Detail |
|----|-------|--------|
| RG-01 | Immutabilite des Golden Datasets | Un dataset au statut "Valide" ne peut pas etre modifie. Pour le modifier, creer une nouvelle version |
| RG-02 | Minimum 30 articles par dataset | Un Golden Dataset ne peut pas etre valide avec moins de 30 articles |
| RG-03 | Couverture minimale | Un Golden Dataset doit couvrir au moins 6 des 8 User Needs |
| RG-04 | Versioning obligatoire des prompts | Toute modification cree une nouvelle version, pas d'ecrasement |
| RG-05 | Note de changement obligatoire | Un prompt ne peut pas etre sauvegarde sans description du changement |
| RG-06 | Un seul run actif par test | Pas d'execution concurrente pour un meme test |
| RG-07 | Traitement sequentiel des articles | Les articles d'un run sont traites un par un (identique au POC) |
| RG-08 | Delai inter-articles : 5 secondes | Limitation de debit API (identique au POC) |
| RG-09 | Timeout par article : 120 secondes | Un article depassant 120 secondes est marque en erreur |
| RG-10 | Retry en cas d'erreur API | 3 tentatives avec backoff exponentiel (5s, 15s, 45s) |
| RG-11 | Comparaison = User Need principal | Seul le User Need principal predit est compare a la classification humaine |
| RG-12 | Score total = 100 | La somme des 3 scores de prediction doit etre egale a 100 |
| RG-13 | Normalisation des variantes | Les variantes de nommage sont normalisees (identique au POC) |
| RG-14 | Conservation indefinie des runs | Les resultats de tous les runs sont conserves sans limite de duree |
| RG-15 | Alertes non bloquantes | Les alertes informent mais ne bloquent pas l'execution des runs suivants |

### 9.2 Regles de planification

| ID | Regle | Detail |
|----|-------|--------|
| RP-01 | Creneau d'execution | Les tests planifies sont executes entre 5h et 8h (heure de Paris) par defaut, configurable |
| RP-02 | Report en cas de conflit | Si un run est deja en cours pour le meme test, le run planifie est reporte de 30 minutes |
| RP-03 | Pas de rattrapage | Si un run planifie est manque (serveur eteint), il n'est pas rattrape — le prochain run se fait au creneau suivant |
| RP-04 | Execution manuelle prioritaire | Un run manuel peut etre lance a tout moment, meme si un run planifie est prevu |

### 9.3 Regles d'alertes

| ID | Regle | Detail |
|----|-------|--------|
| RA-01 | Une alerte par seuil depasse | Si plusieurs seuils sont depasses dans un meme run, une alerte est creee pour chacun |
| RA-02 | Pas d'alerte en double | Si le meme seuil est depasse dans 2 runs consecutifs, la deuxieme alerte mentionne "alerte recurrente" |
| RA-03 | Acquittement manuel | Seuls les utilisateurs Admin ou Editeur peuvent acquitter une alerte |
| RA-04 | Retention des alertes | Les alertes sont conservees 12 mois |

---

## 10. Modele de donnees

### 10.1 Nouvelles tables (extension du schema existant)

```
golden_datasets
├── id (UUID, PK)
├── name (TEXT, NOT NULL)
├── description (TEXT)
├── version (INTEGER, DEFAULT 1)
├── parent_id (UUID, FK → golden_datasets) ← version precedente
├── status (ENUM: 'draft', 'validated', 'archived')
├── article_count (INTEGER)
├── userneed_distribution (JSONB) ← {"UPDATE ME": 12, "EXPLAIN ME": 8, ...}
├── created_by (TEXT, NOT NULL)
├── validated_at (TIMESTAMPTZ)
└── created_at (TIMESTAMPTZ, DEFAULT now())

golden_dataset_items
├── id (UUID, PK)
├── golden_dataset_id (UUID, FK → golden_datasets, NOT NULL)
├── article_id (UUID, FK → articles, NOT NULL)
├── human_userneed (TEXT, NOT NULL) ← classification humaine figee au moment de la validation
├── article_snapshot (JSONB) ← titre, chapo, corps figes
└── UNIQUE(golden_dataset_id, article_id)

prompt_versions
├── id (UUID, PK)
├── prompt_id (TEXT, FK → prompts, NOT NULL)
├── version_major (INTEGER, NOT NULL)
├── version_minor (INTEGER, NOT NULL)
├── content (TEXT, NOT NULL)
├── content_hash (TEXT, NOT NULL) ← SHA-256
├── change_note (TEXT, NOT NULL)
├── created_by (TEXT, NOT NULL)
├── created_at (TIMESTAMPTZ, DEFAULT now())
└── UNIQUE(prompt_id, version_major, version_minor)

regression_tests
├── id (UUID, PK)
├── name (TEXT, NOT NULL)
├── description (TEXT)
├── golden_dataset_id (UUID, FK → golden_datasets, NOT NULL)
├── llm_model (TEXT, NOT NULL)
├── prompt_id (TEXT, FK → prompts, NOT NULL)
├── schedule_frequency (ENUM: 'daily', 'weekly', 'monthly', 'manual')
├── schedule_day (INTEGER) ← jour de la semaine (1-7) ou du mois (1-31)
├── schedule_hour (TIME, DEFAULT '06:00')
├── alert_thresholds (JSONB) ← seuils configures
├── status (ENUM: 'active', 'paused', 'archived')
├── health (ENUM: 'green', 'yellow', 'red', 'unknown')
├── last_run_id (UUID, FK → regression_runs)
├── notification_emails (TEXT[])
├── created_by (TEXT, NOT NULL)
└── created_at (TIMESTAMPTZ, DEFAULT now())

regression_runs
├── id (UUID, PK)
├── regression_test_id (UUID, FK → regression_tests, NOT NULL)
├── prompt_version_id (UUID, FK → prompt_versions, NOT NULL)
├── status (ENUM: 'running', 'completed', 'stopped', 'error')
├── trigger_type (ENUM: 'scheduled', 'manual')
├── total_articles (INTEGER)
├── analyzed_articles (INTEGER)
├── error_articles (INTEGER)
├── concordant_count (INTEGER)
├── concordant_percent (NUMERIC(5,2))
├── icp_average (NUMERIC(5,2))
├── delta_average (NUMERIC(5,2))
├── unidentified_percent (NUMERIC(5,2))
├── concordance_by_userneed (JSONB) ← {"UPDATE ME": 78, "EXPLAIN ME": 71, ...}
├── confusion_matrix (JSONB)
├── top_reclassifications (JSONB)
├── comparison_with_previous (JSONB) ← deltas par rapport au run N-1
├── execution_time_seconds (INTEGER)
├── started_at (TIMESTAMPTZ, DEFAULT now())
└── completed_at (TIMESTAMPTZ)

regression_run_details
├── id (UUID, PK)
├── regression_run_id (UUID, FK → regression_runs, NOT NULL)
├── golden_dataset_item_id (UUID, FK → golden_dataset_items, NOT NULL)
├── predicted_userneed (TEXT)
├── predictions (JSONB) ← [{userneed, score, rank, justification} × 3]
├── is_match (BOOLEAN)
├── delta (NUMERIC(5,2))
├── icp (NUMERIC(5,2))
├── confidence_level (ENUM: 'HAUTE', 'MOYENNE', 'BASSE')
├── response_time_ms (INTEGER)
├── error_message (TEXT)
├── raw_response (TEXT)
└── analyzed_at (TIMESTAMPTZ, DEFAULT now())

alerts
├── id (UUID, PK)
├── regression_test_id (UUID, FK → regression_tests, NOT NULL)
├── regression_run_id (UUID, FK → regression_runs, NOT NULL)
├── severity (ENUM: 'warning', 'critical')
├── metric_name (TEXT, NOT NULL)
├── observed_value (NUMERIC(7,2))
├── threshold_value (NUMERIC(7,2))
├── previous_value (NUMERIC(7,2))
├── message (TEXT, NOT NULL)
├── status (ENUM: 'new', 'seen', 'acknowledged')
├── acknowledged_by (TEXT)
├── acknowledged_at (TIMESTAMPTZ)
├── notification_sent (BOOLEAN, DEFAULT false)
└── created_at (TIMESTAMPTZ, DEFAULT now())
```

### 10.2 Relations avec les tables existantes

```
Tables existantes (POC)          Tables Phase 1
─────────────────────────        ──────────────────────────────
articles ─────────────────────── golden_dataset_items.article_id
prompts ──────────────────────── prompt_versions.prompt_id
                                 regression_tests.prompt_id
```

Les tables du POC (`test_runs`, `ai_analyses`) sont conservees pour la retro-compatibilite. Les nouvelles tables (`regression_runs`, `regression_run_details`) suivent un schema plus structure, dedie a la surveillance continue.

---

## 11. Alerting et notifications

### 11.1 Canaux de notification

| Canal | Implementation | Priorite |
|-------|---------------|----------|
| **Dashboard** (in-app) | Badge sur l'icone d'alerte + journal | Obligatoire (MVP) |
| **Email** | Envoi via service SMTP ou SendGrid | Obligatoire (MVP) |
| **Slack** (futur) | Webhook vers un canal dedie | Optionnel (version ulterieure) |

### 11.2 Matrice de declenchement

| Metrique | Avertissement (🟡) | Critique (🔴) |
|----------|-------------------|--------------|
| Concordance globale | Entre seuil et seuil + 5 pts | Sous le seuil |
| Degradation vs N-1 | Baisse de 5 a 10 points | Baisse de plus de 10 points |
| ICP moyen | Entre seuil et seuil + 3 | Sous le seuil |
| Taux "Non identifie" | Entre 3% et 5% | Au-dessus de 5% |
| Concordance par UN | Entre seuil et seuil + 10 pts (pour 1+ UN) | Sous le seuil (pour 2+ UN) |

### 11.3 Frequence et deduplication

- **Groupement :** Si un run declenche plusieurs alertes, un seul email est envoye avec la synthese de toutes les alertes
- **Anti-spam :** Maximum 1 email par test par jour (sauf critique)
- **Rappel :** Si une alerte critique n'est pas acquittee sous 48h, un rappel est envoye

---

## 12. Export et restitution des donnees

### 12.1 Export Excel des rapports

**Structure du fichier :** `Rapport_Regression_[NomTest]_YYYY-MM-DD.xlsx`

| Feuille | Contenu |
|---------|---------|
| Resume | Metriques globales, comparaison N-1, alertes |
| Concordance par UN | Tableau detaille par User Need avec delta |
| Matrice de confusion | Matrice 8x8 |
| Top reclassifications | 20 premieres divergences |
| Details articles | Chaque article avec prediction, concordance, ICP |
| Historique | Evolution des metriques sur les 10 derniers runs |

### 12.2 Export PDF

Version formatee du rapport, incluant les graphiques. Utilisable pour :
- Rapport a la direction technique
- Archivage documentaire
- Diffusion par email

### 12.3 Export de donnees brutes

Les donnees de tous les runs sont accessibles via l'API Supabase pour exploitation externe (Business Intelligence, Data Lab, etc.).

---

## 13. Exigences non fonctionnelles

### 13.1 Performance

| Exigence | Valeur cible |
|----------|-------------|
| Temps d'analyse par article | 3 a 10 secondes (depend du modele) |
| Duree d'un run complet (50 articles) | < 15 minutes |
| Chargement du dashboard | < 3 secondes |
| Chargement d'un graphique historique (100 runs) | < 5 secondes |

### 13.2 Disponibilite

| Exigence | Valeur cible |
|----------|-------------|
| Disponibilite du dashboard | 99% (hors maintenance planifiee) |
| Execution des runs planifies | 95% de reussite (les 5% restants = indisponibilite API LLM) |
| Retention des donnees | 24 mois minimum |

### 13.3 Securite

| Exigence | Detail |
|----------|--------|
| Authentification | SSO France Televisions (SAML/OIDC) |
| Autorisation | 3 roles (Admin, Editeur, Lecteur) |
| Cles API | Stockees cote serveur en variables d'environnement, jamais exposees au frontend |
| CORS | Restreint aux domaines autorises |
| RLS Supabase | Politiques restrictives par utilisateur authentifie |
| Logs | Journalisation de toutes les actions sensibles |

### 13.4 Compatibilite

| Exigence | Detail |
|----------|--------|
| Navigateurs | Chrome, Firefox, Safari, Edge (versions recentes) |
| Responsive | Desktop et tablette |
| API | REST (Supabase) + endpoints backend pour les actions serveur |

---

## 14. Dependances et prerequis

### 14.1 Dependances techniques

| Dependance | Etat | Responsable |
|------------|------|-------------|
| Supabase (PostgreSQL) | En place (POC) | Equipe projet |
| OpenRouter (gateway LLM) | En place (POC) | Equipe projet |
| Backend serveur (FastAPI ou Node.js) | A developper | Developpeur Phase 1 |
| Planificateur cloud (cron) | A mettre en place | Developpeur Phase 1 |
| Service email (SMTP / SendGrid) | A configurer | Equipe IT / Developpeur |
| SSO France Televisions | A integrer | DSI France Televisions |

### 14.2 Dependances metier

| Dependance | Etat | Responsable |
|------------|------|-------------|
| Corpus d'articles avec corps | En place (~500 articles) | Cron fetch_articles.py |
| Classifications humaines validees | Partiellement en place | Equipes editoriales |
| Validation des Golden Datasets | A faire | Responsable editorial |
| Seuils d'alerte valides par la direction | A definir | Chef de projet + Direction |

### 14.3 Prerequis pour le demarrage

1. **Constituer un premier Golden Dataset** de 50+ articles avec classifications humaines validees
2. **Definir les seuils d'alerte** avec la direction editoriale et technique
3. **Choisir le modele de reference** pour le premier test (recommandation : Claude 3.5 Haiku, meilleur rapport performance/cout observe dans le POC)
4. **Mettre en place le backend** pour l'execution planifiee des tests
5. **Configurer le service email** pour les notifications

---

## 15. Annexes

### Annexe A - Glossaire

| Terme | Definition |
|-------|------------|
| **AI Drift** | Degradation progressive des performances d'un modele IA au fil du temps, due a des mises a jour du modele ou a l'evolution des donnees |
| **Golden Dataset** | Ensemble fige d'articles avec leurs classifications humaines, servant de reference immuable pour les tests de regression |
| **Test de regression** | Execution periodique d'un meme test (dataset + modele + prompt) pour detecter les variations de performance |
| **Run** | Une execution complete d'un test de regression |
| **Concordance** | Situation ou la prediction IA correspond a la classification humaine |
| **ICP** | Indice de Confiance Pondere : (Delta / 100) x Score P1. Mesure composite de la certitude du LLM |
| **Delta** | Ecart entre le score de la premiere prediction et celui de la deuxieme |
| **Matrice de confusion** | Tableau 8x8 croisant classifications humaines et predictions IA |
| **Seuil d'alerte** | Valeur limite configuree en dessous (ou au-dessus) de laquelle une alerte est declenchee |
| **Prompt versioning** | Systeme de traçabilite des modifications apportees au prompt |
| **Backoff exponentiel** | Strategie de retry ou le delai entre les tentatives augmente progressivement |

### Annexe B - Metriques heritees du POC

Les metriques suivantes sont calculees de la meme maniere que dans le POC :

**Concordance :** Un article est concordant si le User Need principal predit correspond exactement a la classification humaine. Taux = (concordants / total) x 100.

**Delta :** P1 - P2 (score de la premiere prediction moins score de la deuxieme). Plus le delta est eleve, plus le LLM est "sur" de son choix.

**ICP (Indice de Confiance Pondere) :** (Delta / 100) x P1.

| Niveau de confiance | Delta | ICP |
|--------------------|-------|-----|
| HAUTE | >= 30 pts | >= 18 |
| MOYENNE | >= 15 pts | >= 7 |
| BASSE | < 15 pts | < 7 |

### Annexe C - Exemple de seuils d'alerte recommandes

Configuration initiale recommandee, a ajuster apres les premiers mois d'utilisation :

| Metrique | Avertissement | Critique |
|----------|---------------|----------|
| Concordance globale | < 60% | < 55% |
| Degradation vs N-1 | > -5 pts | > -10 pts |
| ICP moyen | < 15 | < 12 |
| Taux "Non identifie" | > 3% | > 5% |
| Concordance par UN | < 50% (1+ UN) | < 40% (2+ UN) |

### Annexe D - Comparaison POC vs Phase 1

| Fonctionnalite | POC | Phase 1 |
|----------------|-----|---------|
| Execution manuelle | Oui | Oui |
| Execution planifiee | Non | Oui (quotidien, hebdo, mensuel) |
| Golden Datasets | Non | Oui (immutables, versionnes) |
| Versioning des prompts | Snapshot simple | Versioning semantique complet |
| Dashboard historique | Non | Oui (courbes, heatmap, comparaisons) |
| Alertes | Non | Oui (email + in-app) |
| Multi-utilisateurs | Non | Oui (3 roles) |
| Authentification | Non | SSO France Televisions |
| Rapports automatiques | Non | Oui (apres chaque run) |
| Export PDF | Non | Oui |
| Comparaison multi-modeles | Partiel (2 runs) | Oui (vue comparative complete) |
| API pour exploitation externe | Non | Oui (via Supabase) |

### Annexe E - Architecture cible Phase 1

```
┌─────────────────────────────────────┐
│          FRONTEND                   │
│   React / Next.js                   │
│   Dashboard + Administration        │
│   SSO France Televisions            │
└────────────────┬────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│          API BACKEND                │
│   FastAPI (Python)                  │
│   Endpoints authentifies            │
│   Moteur d'execution des tests      │
│   Generateur de rapports           │
└──────┬──────────────────┬───────────┘
       │                  │
       ▼                  ▼
┌────────────┐   ┌────────────────────┐
│ PostgreSQL │   │   LLM Provider     │
│ (Supabase) │   │   OpenRouter       │
│            │   │   (13+ modeles)    │
└────────────┘   └────────────────────┘
       ▲
       │
┌──────┴────────���─────────────────────┐
│    PLANIFICATEUR (cloud)            │
│    GitHub Actions / Cron cloud      │
│    → Declenchement des runs         │
└──────────┬──────────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│    SERVICE EMAIL                     │
│    SendGrid / SMTP                   │
│    → Notifications d'alertes        │
└──────────────────────────────────────┘
```

---

*Document redige dans le cadre du projet de classification editoriale par IA — France Televisions / Franceinfo*
*Ce document est fonctionnel : il decrit le QUOI et le POURQUOI, pas le COMMENT technique.*
*Version 1.0 — Mars 2026 — A revoir et valider avec la direction technique avant demarrage du developpement.*
