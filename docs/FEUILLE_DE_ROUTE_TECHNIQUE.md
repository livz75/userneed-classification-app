# Feuille de route technique — Projet User Needs Franceinfo

**Destinataire :** Direction technique Franceinfo
**Auteur :** Livio Ricci — Product Owner — Direction de l'Information, France Televisions
**Date :** 5 mars 2026
**Objectif :** Justifier le recrutement d'un developpeur pour industrialiser et etendre le systeme de classification User Needs

---

## Table des matieres

1. [Synthese executif](#1-synthese-executif)
2. [Contexte et acquis du POC](#2-contexte-et-acquis-du-poc)
3. [Vision strategique : les 3 phases](#3-vision-strategique--les-3-phases)
4. [Phase 1 — Surveillance continue du combo Prompt + LLM](#4-phase-1--surveillance-continue-du-combo-prompt--llm)
5. [Phase 2 — Integration CMS PIC](#5-phase-2--integration-cms-pic)
6. [Phase 3 — Dashboard de performance User Needs x Chartbeat](#6-phase-3--dashboard-de-performance-user-needs-x-chartbeat)
7. [Industrialisation transverse](#7-industrialisation-transverse)
8. [Pistes d'amelioration et idees complementaires](#8-pistes-damelioration-et-idees-complementaires)
9. [Planning previsionnel](#9-planning-previsionnel)
10. [Profil du developpeur recherche](#10-profil-du-developpeur-recherche)
11. [ROI et benefices attendus](#11-roi-et-benefices-attendus)

---

## 1. Synthese executif

France Televisions a developpe un **POC fonctionnel** (Proof of Concept) qui demontre qu'un modele de langage (LLM) peut classifier automatiquement les articles Franceinfo selon 8 User Needs, avec un taux de concordance mesurable par rapport au jugement humain.

Ce POC, aujourd'hui en production sur Render.com, offre deja :
- L'import automatique d'articles via 6 flux RSS Franceinfo (toutes les 30 minutes)
- La classification humaine des articles directement dans l'interface
- L'analyse IA via 14 modeles LLM accessibles par une passerelle unifiee (OpenRouter)
- La visualisation des resultats : matrice de confusion 8x8, statistiques, niveaux de confiance
- La comparaison de Test Runs (couple LLM/prompt) avec analyse IA des differences
- L'export Excel multi-feuilles

**Le POC a prouve la faisabilite. Les 3 phases suivantes visent a industrialiser, integrer et mesurer l'impact** de cette classification sur l'engagement des lecteurs.

L'embauche d'un developpeur est necessaire pour :
1. **Garantir la fiabilite dans le temps** (Phase 1 — surveillance du drift IA)
2. **Integrer la classification au flux editorial** (Phase 2 — connexion au CMS PIC)
3. **Mesurer l'impact business** (Phase 3 — dashboard Chartbeat x User Needs)

---

## 2. Contexte et acquis du POC

### 2.1 Ce que le POC a demontre

| Demonstration | Resultat |
|---------------|----------|
| Un LLM peut classifier des articles en User Needs | Oui — taux de concordance significatifs sur 14 modeles testes |
| Les resultats sont mesurables et comparables | Oui — matrice de confusion, concordance globale et par categorie, ICP |
| Differents modeles ont des performances differentes | Oui — classement etabli, 4 modeles recommandes |
| Le prompt a un impact majeur sur les resultats | Oui — comparaison de prompts avec metriques precision/rappel |
| Le systeme est operationnel au quotidien | Oui — ingestion RSS automatique, analyses a la demande |

### 2.2 Architecture actuelle en production

```
┌──────────────────────────────────────────────────────────────┐
│  APPLICATION WEB (navigateur)                                │
│  - Interface HTML/CSS/JS vanilla                             │
│  - Supabase JS SDK (acces direct a la base)                  │
│  - 7 modules : Articles, Classification, LLM, Prompts,      │
│    Analyse IA, Resultats, Historique/Comparaison             │
└──────────────────────┬───────────────────────────────────────┘
                       │
          ┌────────────┴────────────────┐
          │                             │
          ▼                             ▼
┌──────────────────┐         ┌──────────────────────┐
│  SERVEUR PROXY   │         │  SUPABASE            │
│  (Python/Render) │         │  (PostgreSQL cloud)   │
│  /api/analyze    │         │  5 tables             │
│  /api/health     │         │  articles, prompts,   │
│  /api/config     │         │  human_classif.,      │
└────────┬─────────┘         │  test_runs,           │
         │                   │  ai_analyses          │
         ▼                   └──────────────────────┘
┌──────────────────┐                  ▲
│  OPENROUTER      │         ┌────────┴──────────┐
│  (passerelle LLM)│         │  CRON LOCAL        │
│  14 modeles      │         │  (macOS launchd)   │
│  1 cle API       │         │  fetch_articles.py │
└──────────────────┘         │  toutes les 30 min │
                             └────────┬──────────┘
                                      │
                             ┌────────▼──────────┐
                             │  RSS FRANCEINFO    │
                             │  (6 feeds publics) │
                             └───────────────────┘
```

### 2.3 Chiffres cles du POC

| Metrique | Valeur |
|----------|--------|
| Modeles LLM testes | 14 (Anthropic, OpenAI, Google, Meta, Mistral, DeepSeek, Alibaba) |
| Modeles recommandes | 4 (Claude 3.5 Haiku, GPT-4o Mini, Mistral Small 3.1, Gemini 2.5 Flash Lite) |
| Articles en base | ~500+ avec corps complet |
| Taux de recuperation du corps | ~97% |
| User Needs geres | 8 categories |
| Lignes de code | ~4 350 (Python + JavaScript) |
| Documentation | 5 documents majeurs + 5 templates |

### 2.4 Limites identifiees du POC

| Limite | Impact | Phase de resolution |
|--------|--------|---------------------|
| Pas de surveillance continue | Degradation silencieuse possible | Phase 1 |
| Classification isolee (pas dans le CMS) | Non exploitable par les redactions | Phase 2 |
| Pas de mesure d'impact editorial | Impossible de prouver le ROI | Phase 3 |
| Pas d'authentification | Mono-utilisateur, classifications anonymes | Transverse |
| Cron local (macOS launchd) | Dependant de la machine du PO | Transverse |
| Frontend vanilla JS | Difficile a maintenir en equipe | Transverse |
| Cle API cote client | Risque de securite | Transverse |

---

## 3. Vision strategique : les 3 phases

Les 3 phases s'enchainent logiquement, chacune s'appuyant sur la precedente :

```
    PHASE 1                      PHASE 2                      PHASE 3
    Surveillance IA              Integration CMS              Dashboard performance
    ─────────────────            ─────────────────            ─────────────────────
    "L'IA est-elle               "Comment exploiter           "Quel est l'impact
     toujours fiable ?"           la classification ?"         sur l'engagement ?"

    Golden Datasets              Connecteur CMS PIC           Metriques Chartbeat
    Tests de regression          Champ User Need dans PIC     Dashboard croise
    Alertes de degradation       Workflow editorial            Objectifs par UN
    Versioning des prompts       Boucle de feedback            Optimisation continue
    Dashboard historique         SSO France Televisions        A/B testing titres

         │                            │                            │
         ▼                            ▼                            ▼
    PREUVE DE FIABILITE          VALEUR EDITORIALE            PREUVE DE ROI
```

**Dependances :**
- La Phase 2 necessite une Phase 1 aboutie (il faut prouver que le systeme est fiable avant de l'integrer au CMS)
- La Phase 3 necessite la Phase 2 (il faut que le User Need soit dans le CMS pour le transmettre a Chartbeat)
- Les phases 2 et 3 peuvent partiellement se chevaucher

---

## 4. Phase 1 — Surveillance continue du combo Prompt + LLM

> **Specifications fonctionnelles detaillees :** voir le document `SPECIFICATIONS_PHASE1_AI_DRIFT_MONITORING.md`

### 4.1 Objectif

Mettre en place un systeme de surveillance continue qui detecte automatiquement toute degradation de la classification IA, que celle-ci soit due a une mise a jour du modele LLM, a une modification du prompt, ou a une evolution du corpus editorial.

### 4.2 Probleme resolu

Les modeles LLM evoluent sans preavis (mises a jour par les fournisseurs, changements de comportement, depreciation). Sans surveillance, une degradation peut passer inaperçue pendant des semaines, rendant la classification IA inutilisable sans que personne ne le remarque.

### 4.3 Fonctionnalites cles

| Fonctionnalite | Description | Valeur |
|----------------|-------------|--------|
| **Golden Datasets** | Jeux de donnees de reference figes (articles + classifications humaines validees), immutables et versionnes | Base stable pour des tests reproductibles |
| **Tests de regression automatises** | Execution planifiee (quotidien/hebdo/mensuel) du triplet {Dataset + Modele + Prompt} | Surveillance sans intervention humaine |
| **Versioning des prompts** | Chaque modification cree une nouvelle version tracee avec diff et rollback | Tracabilite complete des changements |
| **Dashboard historique** | Courbes d'evolution, heatmap par User Need, comparaison multi-modeles | Vision d'ensemble instantanee |
| **Systeme d'alertes** | Seuils configurables, notifications email, journal in-app | Detection proactive des problemes |
| **Rapports automatiques** | Rapport genere apres chaque run, comparaison, tendance | Communication facilitee vers la direction |

### 4.4 Indicateurs de succes

| KPI | Objectif |
|-----|----------|
| Taux de concordance global | Maintien au-dessus de 55% (seuil critique) |
| Tendance | Pas de degradation de plus de 5 points sur 3 runs consecutifs |
| Taux de "Non identifie" | < 5% |
| Detection d'anomalie | Alerte envoyee dans les 24h suivant une degradation |

### 4.5 Livrables Phase 1

1. Module Golden Datasets (creation, validation, gel, versioning)
2. Module versioning des prompts (increments, diff, rollback)
3. Planificateur de tests de regression (cron cloud)
4. Moteur d'execution des tests (reutilisant le pipeline du POC)
5. Dashboard historique (courbes, heatmap, comparaisons)
6. Systeme d'alertes (seuils, email, journal)
7. Generateur de rapports (Excel, PDF)
8. Gestion des roles (Admin, Editeur, Lecteur)

---

## 5. Phase 2 — Integration CMS PIC

### 5.1 Objectif

Connecter le systeme de classification User Needs au CMS de Franceinfo (PIC) pour que la classification IA soit directement exploitable par les equipes editoriales dans leur outil de travail quotidien.

### 5.2 Probleme resolu

Aujourd'hui, le User Need d'un article est calcule mais reste confine dans Supabase. Les journalistes et editeurs n'en beneficient pas. Pour que la classification produise une valeur editoriale, elle doit etre visible et actionnable la ou les contenus sont geres : dans le CMS PIC.

### 5.3 Fonctionnalites cles

| Fonctionnalite | Description | Valeur |
|----------------|-------------|--------|
| **Connecteur PIC → User Needs** | Import automatique des nouveaux articles publies dans PIC vers le systeme User Needs | Plus besoin du scraping RSS, source officielle |
| **Connecteur User Needs → PIC** | Ecriture du User Need predit (et son score de confiance) dans les metadonnees de l'article PIC | Le User Need est visible dans le CMS |
| **Champ User Need dans PIC** | Ajout d'un champ "User Need" dans la fiche article du CMS | Information exploitable par les redactions |
| **Workflow de validation** | Le journaliste voit la suggestion IA, peut la valider ou la corriger | Boucle de feedback humain-IA |
| **Classification automatique a la publication** | A chaque publication d'article, le systeme classifie automatiquement | Classification en temps reel |
| **Authentification SSO** | Integration du SSO France Televisions | Traçabilite des actions par utilisateur |

### 5.4 Flux de donnees cible

```
┌──────────────────────────────────────────────────────────────┐
│                        CMS PIC                                │
│                                                               │
│  Article publie ──────────────────► API PIC / Webhook         │
│       ▲                                     │                 │
│       │                                     ▼                 │
│  User Need ecrit  ◄────────  SYSTEME USER NEEDS              │
│  dans les metadonnees        (classification IA)              │
│       │                           │                           │
│       ▼                           ▼                           │
│  Journaliste voit          Score de confiance                 │
│  la suggestion IA          + justification                    │
│       │                                                       │
│       ▼                                                       │
│  Valide OU Corrige ──────► Boucle de feedback                │
│                             vers le systeme                   │
└──────────────────────────────────────────────────────────────┘
```

### 5.5 Indicateurs de succes

| KPI | Objectif |
|-----|----------|
| Couverture | 100% des articles publies classifies automatiquement |
| Latence | Classification disponible dans les 60 secondes apres publication |
| Taux de validation editoriale | > 70% des suggestions IA acceptees sans modification |
| Adoption | > 80% des journalistes referents utilisent le champ User Need dans PIC |

### 5.6 Livrables Phase 2

1. Etude de l'API CMS PIC (endpoints, authentification, schema de donnees)
2. Connecteur bidirectionnel PIC ↔ systeme User Needs
3. Champ "User Need" dans la fiche article PIC (coordination avec l'equipe PIC)
4. Pipeline de classification automatique a la publication (webhook ou polling)
5. Interface de validation editoriale (suggestion IA + bouton valider/corriger)
6. Integration SSO France Televisions
7. Gestion multi-utilisateur avec traçabilite des validations
8. Monitoring du connecteur (taux de succes, latence, erreurs)

### 5.7 Dependances

| Dependance | Responsable | Criticite |
|------------|-------------|-----------|
| Documentation API PIC | Equipe CMS / DSI | Bloquant |
| Ajout d'un champ metadata dans PIC | Equipe CMS | Bloquant |
| Acces au SSO France Televisions | DSI | Bloquant |
| Endpoint webhook ou API de notification | Equipe CMS | Important |
| Environnement de test PIC (staging) | Equipe CMS | Important |

---

## 6. Phase 3 — Dashboard de performance User Needs x Chartbeat

### 6.1 Objectif

Creer un dashboard qui croise les User Needs attribues aux articles avec les metriques d'engagement mesurees par Chartbeat, afin de prouver (ou infirmer) que l'orientation editoriale par User Need ameliore les performances des contenus.

### 6.2 Probleme resolu

Aujourd'hui, il est impossible de savoir si un article classe "EXPLAIN ME" engage davantage le lecteur qu'un article classe "UPDATE ME". Sans cette correlation, la classification User Needs reste un exercice theorique. Le dashboard apporte la preuve par les donnees.

### 6.3 Indicateurs Chartbeat a suivre

> **Reference detaillee :** voir le document `Chartbeat_x_UserNeeds_Indicateurs_Objectifs.pdf`

**Indicateurs PRIORITAIRES :**

| Indicateur | Baseline (fev. 2026) | Objectif 6 mois | Pourquoi |
|------------|---------------------|-----------------|----------|
| Avg Engaged Time | 0:35 | 0:42 (+20%) | Meilleur proxy de la valeur percue par le lecteur |
| Quality Views (≥15s) | 53% | 60% (+7 pts) | Filtre les clics accidentels, mesure la lecture reelle |
| Recirculation | 9% | 12% (+3 pts) | Mesure si le lecteur poursuit sa navigation |
| Total Engaged Minutes | 1,13M/j | 1,30M/j (+15%) | Volume total d'attention |

**Indicateurs IMPORTANTS :**

| Indicateur | Baseline | Objectif 6 mois | Pourquoi |
|------------|----------|-----------------|----------|
| Part Loyal visitors | 40% | 44% (+4 pts) | Fidelisation par la pertinence |
| Part Internal traffic | 35% | 40% (+5 pts) | Navigation plus fluide entre User Needs |
| Scroll Depth | A mesurer | Benchmark par UN | Consommation reelle du contenu |

### 6.4 Profil d'engagement attendu par User Need

Chaque User Need produit un type d'engagement different. Le dashboard permettra de valider ces hypotheses :

| User Need | Engaged Time | Quality Views | Recirculation | Profil |
|-----------|-------------|---------------|---------------|--------|
| UPDATE ME | Court (0:20-0:35) | Moyen (45-55%) | Elevee (>15%) | Lecture rapide → article suivant |
| EXPLAIN ME | Long (0:50-1:30) | Eleve (>65%) | Moyenne (8-12%) | Lecture en profondeur |
| GIVE ME PERSPECTIVE | Long (0:45-1:20) | Eleve (>60%) | Moyenne (10-15%) | Engagement reflexif |
| GIVE ME A BREAK | Moyen (0:30-0:50) | Moyen (50-60%) | Elevee (>15%) | Navigation ludique |
| CONCERNING NEWS | Moyen (0:25-0:40) | Moyen-Eleve (55-65%) | Moyenne (10-15%) | Reaction a l'urgence |
| INSPIRE ME | Long (0:40-1:10) | Eleve (>60%) | Faible-Moy. (5-10%) | Quete de sens |
| MAKE ME FEEL THE NEWS | Moyen-Long (0:35-1:00) | Eleve (>60%) | Faible (5-8%) | Immersion emotionnelle |
| REVEAL NEWS | Long (0:50-1:30) | Eleve (>65%) | Moyenne (8-12%) | Investigation |

### 6.5 Fonctionnalites du dashboard

| Fonctionnalite | Description | Valeur |
|----------------|-------------|--------|
| **Vue globale** | KPIs principaux avec tendance et comparaison baseline | Vision de sante instantanee |
| **Vue par User Need** | Metriques Chartbeat ventilees par User Need | Comprendre le profil d'engagement de chaque UN |
| **Vue par section** | Performance par rubrique (politique, monde, economie...) croisee avec les UN | Identifier les points forts/faibles par rubrique |
| **Vue temporelle** | Evolution des metriques avant/apres deploiement des UN | Mesurer l'impact causal |
| **Vue comparative** | Comparer 2 periodes ou 2 groupes (avec/sans classification UN) | Prouver le ROI |
| **Alertes de performance** | Notification si un KPI descend sous un seuil | Detection rapide des problemes |
| **Export et reporting** | Rapports hebdo/mensuel automatises | Communication a la direction |

### 6.6 Prerequis techniques Chartbeat

| Prerequis | Description | Responsable |
|-----------|-------------|-------------|
| **Tagging Chartbeat** | Ajouter le User Need comme section ou custom dimension dans le code de tracking | Equipe technique |
| **CMS → Chartbeat** | Le champ User Need de PIC doit etre transmis a Chartbeat via le code de tracking (`_defined_sections` ou Custom Dimensions) | Equipe CMS + technique |
| **Acces API Chartbeat** | Cle API pour requeter les donnees historiques et temps reel | Equipe data / DSI |
| **Data Lab** | Acces au module Data Lab de Chartbeat pour les analyses avancees (si disponible dans le plan) | Direction |

### 6.7 Plan de mesure

| Phase | Periode | Actions |
|-------|---------|---------|
| **Baseline** | Mois 0 | Exporter les KPIs Chartbeat des 3 derniers mois. Documenter la baseline par section. |
| **Deploiement progressif** | Mois 1-3 | Deployer la classification sur un echantillon de sections (ex: content_article). Comparer avec/sans (groupe controle). |
| **Analyse d'impact** | Mois 3-6 | Mesurer l'ecart avant/apres. Identifier les UN les plus performants par section. Generaliser. |
| **Optimisation** | Mois 6+ | Affiner le modele avec les donnees Chartbeat comme feedback. Automatiser le reporting. |

### 6.8 Livrables Phase 3

1. Specification du tagging Chartbeat (coordination avec l'equipe technique)
2. Integration API Chartbeat (ingestion des metriques)
3. Pipeline de croisement User Need x Chartbeat (enrichissement des donnees)
4. Dashboard web (vues globale, par UN, par section, temporelle, comparative)
5. Systeme de rapports automatises (hebdomadaire, mensuel)
6. Alertes de performance
7. Documentation du plan de mesure et des KPIs

---

## 7. Industrialisation transverse

Ces chantiers sont communs aux 3 phases et constituent les prerequis techniques.

### 7.1 Migration de l'architecture

| Composant | POC actuel | Cible production |
|-----------|-----------|------------------|
| Frontend | HTML/CSS/JS vanilla | React ou Next.js |
| Backend | Python http.server minimal | FastAPI (Python) avec endpoints authentifies |
| Base de donnees | Supabase (PostgreSQL cloud) | Supabase avec RLS restrictif par utilisateur |
| Deploiement | Render.com (free tier) | Infrastructure France TV ou cloud dedie |
| Ingestion articles | Cron local (macOS launchd) | Job planifie cloud (GitHub Actions, Airflow, ou cron serveur) |
| Authentification | Aucune | SSO France Televisions (SAML/OIDC) |
| CI/CD | Push manuel | Pipeline automatise (GitHub Actions) |
| Secrets | config.json local | Variables d'environnement serveur |

### 7.2 Securite

| Mesure | Detail |
|--------|--------|
| Cles API | Stockees cote serveur uniquement, jamais dans le frontend |
| RLS Supabase | Politiques restrictives par utilisateur authentifie (remplacement du `USING (true)` actuel) |
| CORS | Restreint aux domaines autorises |
| Rate limiting | Limiter les appels API par utilisateur |
| Journalisation | Logs structures pour toutes les actions sensibles |

### 7.3 Monitoring et observabilite

| Composant | Outil suggeree |
|-----------|---------------|
| Logs applicatifs | Structured logging (JSON) vers service centralise |
| Metriques systeme | Uptime, temps de reponse, taux d'erreur |
| Alertes systeme | Email si serveur down, si job d'ingestion echoue |
| Audit trail | Traçabilite de toute action utilisateur |

---

## 8. Pistes d'amelioration et idees complementaires

### 8.1 Phase 1 — Surveillance IA

| Idee | Description | Impact | Effort |
|------|-------------|--------|--------|
| **Accord inter-annotateurs** | Faire classifier les memes articles par plusieurs humains pour mesurer le taux d'accord humain-humain (kappa de Cohen). Cela donne un plafond theorique de performance pour l'IA : si les humains ne sont d'accord qu'a 75%, exiger 80% de concordance IA est irrealiste. | Eleve — calibre les objectifs | Moyen |
| **Golden Datasets thematiques** | Creer des Golden Datasets specialises par rubrique (Politique, Sport, Economie...) pour detecter les degradations specifiques a un domaine. Un drift sur les articles sportifs pourrait passer inapercu dans un dataset generaliste. | Moyen — surveillance plus fine | Faible |
| **Classification avec zero-shot vs few-shot** | Tester systematiquement le prompt avec et sans exemples d'articles (few-shot learning). Les exemples dans le prompt peuvent stabiliser les predictions et reduire le drift. | Moyen — stabilise les predictions | Faible |
| **Score F1 et metriques avancees** | Au-dela de la concordance brute, calculer le F1-score, precision et rappel par User Need pour chaque run. Ces metriques sont plus informatives pour les categories desequilibrees (ex: REVEAL NEWS, souvent sous-represente). | Moyen — vision plus precise | Faible |
| **Analyse des "zones grises"** | Identifier systematiquement les articles ou le User Need secondaire obtient un score proche du principal (Delta < 10). Ces articles sont intrinsequement ambigus et revelent les frontieres floues entre User Needs — utile pour affiner les definitions du referentiel. | Eleve — ameliore le referentiel | Moyen |
| **Test de sensibilite au format** | Tester si la longueur de l'article (short/medium/long) ou le type de media (article/video) influence la qualite de la classification. Permet d'adapter le prompt ou le modele selon le format. | Moyen — optimise la strategie | Faible |
| **Monitoring du cout API** | Tracer le cout reel de chaque run (tokens consommes x prix du modele). Permet de choisir le meilleur rapport qualite/prix et de budgetiser la surveillance. | Moyen — maitrise budgetaire | Faible |

### 8.2 Phase 2 — Integration CMS PIC

| Idee | Description | Impact | Effort |
|------|-------------|--------|--------|
| **Classification temps reel en cours de redaction** | Proposer le User Need des que le journaliste tape le titre et le chapo, avant meme la publication. Cela permet une redaction intentionnelle : le journaliste sait des le depart quel besoin lecteur il vise. | Eleve — change le workflow | Eleve |
| **Suggestion de User Need secondaire** | Afficher non seulement le UN principal mais aussi le UN secondaire avec son score. Si le score secondaire est tres proche, indiquer que l'article est "a la frontiere" de deux besoins — le journaliste peut alors ajuster l'angle. | Moyen — aide a la decision | Faible |
| **Tableau de bord editorial dans PIC** | Ajouter un widget dans PIC montrant la repartition des User Needs de la journee. L'editeur voit en un coup d'oeil si la production est desequilibree (ex: 80% d'UPDATE ME, 0% d'INSPIRE ME) et peut orienter les commandes. | Eleve — pilotage editorial | Moyen |
| **Historique de classification par article** | Stocker chaque classification (IA initiale, validation editoriale, corrections) avec horodatage. Permet de mesurer le taux de correction, d'identifier les articles les plus ambigus, et d'ameliorer le prompt au fil du temps. | Moyen — boucle d'amelioration | Faible |
| **Notifications editoriales** | Envoyer une notification Slack ou email a l'equipe editoriale quand un article est classifie dans un User Need rare (ex: REVEAL NEWS, INSPIRE ME), pour valoriser ces contenus. | Faible — valorise les contenus | Faible |
| **API de classification "a la demande"** | Exposer un endpoint REST public (avec authentification) pour classifier n'importe quel texte. Utile pour d'autres equipes ou outils France TV qui voudraient tester la classification sans passer par PIC. | Moyen — reutilisabilite | Moyen |
| **Mode "double classification"** | Permettre a 2 journalistes de classifier le meme article, avec reconciliation automatique si accord et arbitrage si desaccord. Alimente la mesure d'accord inter-annotateurs. | Moyen — qualite des donnees | Moyen |

### 8.3 Phase 3 — Dashboard Chartbeat

| Idee | Description | Impact | Effort |
|------|-------------|--------|--------|
| **Longueur optimale par User Need** | Croiser le word_count (deja disponible dans Supabase) avec l'Engaged Time de Chartbeat, par User Need. Determiner la longueur ideale pour chaque categorie (ex: UPDATE ME optimal a 250 mots, EXPLAIN ME optimal a 700 mots). | Eleve — recommandation actionnable | Moyen |
| **Heure de publication optimale** | Analyser si certains User Needs performent mieux a certaines heures (ex: GIVE ME A BREAK le midi, UPDATE ME le matin). Creer un outil de recommandation d'horaire de publication. | Moyen — optimise la diffusion | Moyen |
| **Score editorial composite** | Creer un score unique combinant Engaged Time, Quality Views, Recirculation et Scroll Depth, pondere par User Need. Permet de classer les articles par "performance editoriale" globale et d'identifier les best practices. | Eleve — indicateur synthetique | Moyen |
| **Correlation User Need x Source de trafic** | Croiser les User Needs avec les sources de trafic Chartbeat (Search, Social, Internal, Direct). Hypothese : les articles EXPLAIN ME performent mieux en Search (Google), les GIVE ME A BREAK en Social. Permet d'adapter la strategie de distribution. | Eleve — strategie de distribution | Moyen |
| **Benchmark automatique** | Chaque semaine, generer un email avec les 5 articles les plus performants par User Need, avec leurs metriques Chartbeat. Les redactions decouvrent ce qui fonctionne et peuvent s'en inspirer. | Moyen — apprentissage continu | Faible |
| **Detection de faux-positifs d'engagement** | Un article avec un Engaged Time eleve mais un Scroll Depth faible est probablement un video player ou un quiz, pas une lecture approfondie. Filtrer ces cas pour eviter de biaiser les statistiques par User Need. | Moyen — fiabilite des donnees | Faible |
| **Prediction de performance** | En accumulant suffisamment de donnees (6+ mois), entrainer un modele simple pour predire la performance Chartbeat d'un article a partir de son User Need, sa longueur, sa rubrique et son heure de publication. Objectif : outil de recommandation pre-publication. | Eleve — vision prospective | Eleve |
| **Tableau de bord personnalise par profil lecteur** | Croiser les User Needs avec les segments Chartbeat (New/Returning/Loyal). Hypothese : les Loyal preferent GIVE ME PERSPECTIVE, les New preferent UPDATE ME. Permet la personnalisation de la page d'accueil. | Eleve — personnalisation | Eleve |

---

## 9. Planning previsionnel

### 9.1 Vue macro

```
2026        T2 (Avr-Jun)    T3 (Jul-Sep)    T4 (Oct-Dec)    2027 T1 (Jan-Mar)
            ──────────────  ──────────────  ──────────────  ──────────────────
TRANSVERSE  ████████████████
            Migration archi
            CI/CD, SSO

PHASE 1     ░░░░████████████████████████
            Specs   Dev + Tests
            ↓
            MVP Phase 1 operationnel ──────────────────► Surveillance continue
                                                          en production

PHASE 2                     ░░░░████████████████████████
                            Etude  Dev + Integration PIC
                            API PIC
                                    ↓
                                    MVP Phase 2 ──────► Classif. dans PIC

PHASE 3                                     ░░░░████████████████████████
                                            Specs  Dev + Dashboard
                                            tagging
                                                    ↓
                                                    MVP Phase 3 ──────►

░░░░ = Etude / Specs        ████ = Developpement / Integration
```

### 9.2 Jalons cles

| Jalon | Date cible | Critere de validation |
|-------|-----------|----------------------|
| Architecture production deployee | Fin avril 2026 | Backend FastAPI operationnel, CI/CD en place, SSO fonctionnel |
| Premier Golden Dataset constitue | Mi-mai 2026 | 50+ articles avec classifications validees par l'equipe editoriale |
| MVP Phase 1 | Fin juin 2026 | Tests de regression automatises + dashboard historique + alertes |
| Etude API PIC terminee | Fin juillet 2026 | Documentation du connecteur, schema de donnees valide |
| MVP Phase 2 | Fin octobre 2026 | Classification automatique des articles publies, champ UN visible dans PIC |
| Tagging Chartbeat operationnel | Fin octobre 2026 | User Need transmis a Chartbeat pour chaque article |
| MVP Phase 3 | Fin janvier 2027 | Dashboard croisant UN x metriques Chartbeat, rapports automatises |
| Bilan a 6 mois post-deploiement | Mars 2027 | Rapport complet sur l'impact des User Needs sur l'engagement |

---

## 10. Profil du developpeur recherche

### 10.1 Competences techniques requises

| Domaine | Competences | Niveau |
|---------|------------|--------|
| **Backend Python** | FastAPI, async/await, PostgreSQL, ORM (SQLAlchemy ou equivalent) | Confirme |
| **Frontend** | React ou Next.js, TypeScript | Confirme |
| **Base de donnees** | PostgreSQL, Supabase, modelisation relationnelle | Confirme |
| **API REST** | Conception, authentification, documentation (OpenAPI) | Confirme |
| **Integration LLM** | Appels API (OpenRouter, Anthropic, OpenAI), gestion des prompts, parsing de reponses | Intermediaire+ |
| **CI/CD** | GitHub Actions, deploiement automatise, tests automatises | Intermediaire |
| **Securite** | SSO (SAML/OIDC), gestion des secrets, CORS, RLS | Intermediaire |

### 10.2 Competences souhaitables

| Domaine | Detail |
|---------|--------|
| API Chartbeat | Experience avec les API analytics (Chartbeat, GA, Piano) |
| CMS editorial | Experience d'integration avec un CMS (meme non PIC) |
| Data visualisation | Bibliotheques de graphiques (Chart.js, D3.js, Recharts) |
| NLP / Data Science | Notions de metriques de classification (precision, rappel, F1, kappa) |

### 10.3 Positionnement dans l'equipe

Le developpeur travaillera en collaboration directe avec :
- **Le Product Owner** (Livio Ricci) : definition des priorites, validation fonctionnelle
- **L'equipe editoriale Franceinfo** : feedback sur la classification, constitution des Golden Datasets
- **L'equipe CMS PIC** : integration Phase 2 (API, schema de donnees)
- **La DSI France Televisions** : infrastructure, SSO, securite
- **L'equipe Data/Analytics** : integration Chartbeat, definitions des KPIs

---

## 11. ROI et benefices attendus

### 11.1 Benefices qualitatifs

| Benefice | Phase | Beneficiaire |
|----------|-------|-------------|
| Prouver que la classification IA est fiable et stable | Phase 1 | Direction technique, direction editoriale |
| Doter les redactions d'un outil de pilotage editorial | Phase 2 | Journalistes, editeurs |
| Comprendre quels types de contenus engagent le plus | Phase 3 | Direction de l'information, strategie editoriale |
| Developper une culture data-driven dans la redaction | Toutes | Ensemble de la redaction |
| Positionner Franceinfo comme pionnier de l'IA editoriale | Toutes | Direction generale, marque Franceinfo |

### 11.2 Benefices quantitatifs (objectifs a 6 mois post-deploiement)

| KPI | Baseline | Objectif | Progression |
|-----|----------|----------|------------|
| Avg Engaged Time | 0:35 | 0:42 | +20% |
| Quality Views | 53% | 60% | +7 points |
| Recirculation | 9% | 12% | +3 points |
| Total Engaged Minutes | 1,13M/j | 1,30M/j | +15% |
| Loyal visitors | 40% | 44% | +4 points |
| Internal traffic | 35% | 40% | +5 points |

### 11.3 Reduction des risques

| Risque | Sans le projet | Avec le projet |
|--------|---------------|----------------|
| Degradation silencieuse du LLM | Pas de detection | Alerte automatique en < 24h |
| Classification incoherente entre journalistes | Subjectivite non mesuree | Accord inter-annotateurs mesure, IA comme reference |
| Investissement IA sans preuve de ROI | Impossible a justifier | Dashboard Chartbeat avec metriques avant/apres |
| Modele LLM deprecie par le fournisseur | Decouverte tardive | Surveillance multi-modeles, bascule rapide |
| Prompt degrade apres modification | Pas de detection | Versioning + test avant/apres sur Golden Dataset |

### 11.4 Cout estime

| Poste | Estimation |
|-------|-----------|
| Developpeur (12 mois) | Selon grille France TV |
| API OpenRouter (LLM) | ~50-100 EUR/mois (tests de regression automatises) |
| Supabase (plan Pro) | ~25 EUR/mois |
| Infrastructure cloud (Render ou equivalent) | ~50-100 EUR/mois |
| **Total hors salaire** | **~125-225 EUR/mois** |

> **Note :** Les couts API sont faibles car la surveillance continue reutilise des Golden Datasets de taille fixe (50-100 articles). Le cout principal est le salaire du developpeur.

---

*Document redige dans le cadre du projet de classification editoriale par IA — France Televisions / Franceinfo*
*Ce document sera mis a jour apres validation par la direction technique.*
*Version 1.0 — Mars 2026*
