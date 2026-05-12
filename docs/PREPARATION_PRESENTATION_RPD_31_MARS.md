# Préparation présentation — Release Planning Day, 31 mars 2026

**Format :** Oral + démo live (pas de slides)
**Durée :** 20 minutes
**Présentateur :** Livio Ricci — Product Owner, Direction de l'Information
**Public :** Équipes techniques, éditoriales et direction Franceinfo

---

## Checklist avant la présentation

- [ ] Serveur local démarré (`python3 server.py`) ou app Render accessible
- [ ] Connexion Supabase OK (vérifier au chargement)
- [ ] Clé API OpenRouter valide et créditée
- [ ] Au moins 1 Test Run complet récent avec un bon taux de concordance (pour la démo résultats)
- [ ] Au moins 2 Test Runs comparables (modèles ou prompts différents) pour la démo comparaison
- [ ] Quelques articles non classifiés disponibles (pour la démo classification live)
- [ ] Navigateur en plein écran, zoom adapté à la taille de l'écran/projecteur
- [ ] Onglet ouvert sur la page d'accueil de l'application

---

## Structure de la présentation (20 min)

---

### PARTIE 1 — LE PROBLÈME (2 min)

**Ce que tu dis :**

> Chaque jour, les équipes Franceinfo publient des centaines de contenus. Chacun répond à un besoin précis du lecteur — ce qu'on appelle un "User Need". Est-ce que le lecteur veut être informé d'un fait brut ? Comprendre un sujet en profondeur ? Être diverti ? Être alerté ?

> On a 8 User Needs. Aujourd'hui, cette classification est faite à la main par les équipes éditoriales. Le problème : c'est long, c'est subjectif, et deux personnes ne classent pas forcément un même article de la même manière. Et surtout — on ne mesure jamais l'impact de cette classification sur l'engagement des lecteurs.

> La question qu'on s'est posée : est-ce qu'une intelligence artificielle peut faire ce travail ? Et si oui, aussi bien qu'un humain ?

**Les 8 User Needs à énoncer rapidement (les nommer suffit) :**
1. UPDATE ME — m'informer
2. EXPLAIN ME — m'expliquer
3. GIVE ME PERSPECTIVE — me donner du recul
4. GIVE ME A BREAK — me divertir
5. GIVE ME CONCERNING NEWS — m'alerter
6. INSPIRE ME — m'inspirer
7. MAKE ME FEEL THE NEWS — me faire vivre l'info
8. REVEAL NEWS — me révéler une info exclusive

---

### PARTIE 2 — CE QU'ON A CONSTRUIT (2 min)

**Ce que tu dis :**

> On a construit un POC complet, en production sur Render.com. Je vais vous le montrer.

> En résumé, l'application fait 3 choses :
> 1. Elle récupère automatiquement les articles Franceinfo — toutes les 30 minutes, depuis 6 flux RSS, avec scraping du corps complet. On a plus de 500 articles en base, 97% avec le texte intégral.
> 2. Elle permet de classifier manuellement ces articles — c'est la "vérité terrain", la référence humaine.
> 3. Elle soumet ces articles à une IA et mesure si l'IA est d'accord avec l'humain.

> Le tout avec 20 modèles d'IA disponibles — Claude, GPT, Gemini, Mistral, et d'autres — accessibles via une seule passerelle, OpenRouter. On peut comparer n'importe quel modèle sur le même corpus avec le même prompt.

**Chiffres clés à mentionner :**
- 20 modèles LLM testables (7 recommandés)
- 8 fournisseurs (Anthropic, OpenAI, Google, Mistral, Meta, DeepSeek, Cohere, Microsoft)
- 500+ articles en base avec corps complet
- Coût infra : ~125-225 €/mois hors salaire
- ~4 350 lignes de code (Python + JavaScript vanilla)

---

### PARTIE 3 — DÉMO LIVE (12 min)

#### Séquence 1 — Les articles (2 min)

**Action :** Montrer la liste des articles.

- Scroller brièvement pour montrer le volume
- Montrer les **filtres** : Tous / Classifiés / Non classifiés
- Montrer les filtres par **catégorie** (Politique, Monde, Économie...) et par **type de média** (Article, Vidéo)
- Cliquer sur un titre pour montrer qu'il ouvre l'article sur franceinfo

**Action :** Classifier un article en live.

- Choisir un article non classifié
- Sélectionner un User Need dans le menu déroulant
- Montrer le toast de confirmation

**Action :** Passer sur le filtre "Classifiés" pour montrer le **graphique de distribution du corpus**.

> Ce graphique montre la répartition de notre corpus de référence. La ligne pointillée, c'est la distribution idéale — 12.5% par User Need. L'indicateur en haut nous dit si notre corpus est équilibré. C'est important : un corpus déséquilibré fausse les mesures.

---

#### Séquence 2 — Le panneau LLM (1 min)

**Action :** Cliquer sur "LLM" dans le header.

- Montrer le tableau des 20 modèles
- Pointer les colonnes : vitesse, coût d'entrée/sortie, qualité, support français
- Pointer les 7 modèles recommandés (badge vert)
- Pointer le coût estimé pour 50 articles

> On a sélectionné ces 20 modèles pour couvrir un large spectre : du plus rapide et économique au plus qualitatif. Les 7 recommandés offrent le meilleur rapport qualité/prix/français. Le moins cher revient à quelques centimes pour 50 articles. Le plus cher, Claude 3 Opus, c'est plusieurs euros.

**Action :** Sélectionner un modèle (ex: Claude 3.5 Haiku).

---

#### Séquence 3 — Les prompts (1 min)

**Action :** Cliquer sur "Prompts" dans le header.

- Montrer le prompt par défaut (ne pas tout lire)
- Pointer sa structure : RÔLE → VISION FRANCEINFO → DÉFINITIONS DES USER NEEDS → TÂCHE

> Le prompt, c'est le levier numéro 1 de la qualité. C'est l'instruction qu'on donne à l'IA. Il décrit le rôle qu'on lui assigne, les principes éditoriaux de Franceinfo, les 8 définitions des User Needs, et le format de réponse attendu. On peut créer autant de variantes qu'on veut, les dupliquer, les comparer.

---

#### Séquence 4 — Lancer une analyse (2 min)

**Option A (recommandée) : utiliser un Test Run pré-calculé.**

> Pour gagner du temps, je vais vous montrer un test que j'ai lancé avant la présentation. Mais pour que vous voyiez comment ça marche en live...

**Action :** Lancer un mini-run de 3-5 articles (si le temps le permet).

- Cliquer sur "Analyse IA"
- Montrer la barre de progression
- Montrer un article en cours de traitement
- Montrer le format de réponse de l'IA quand elle arrive : 3 User Needs avec scores qui totalisent 100
- Arrêter le run après 3-5 articles (bouton Stop)

> L'IA renvoie 3 prédictions classées, avec un score total de 100. Plus l'écart entre la 1re et la 2e prédiction est grand, plus l'IA est sûre d'elle. Si la réponse est incorrecte ou vide, le système retente automatiquement jusqu'à 3 fois en renforçant les instructions.

**Puis :** Ouvrir le Test Run complet pré-calculé pour la suite de la démo.

---

#### Séquence 5 — Les résultats — LE MOMENT FORT (3 min)

**Action :** Afficher les résultats du Test Run complet.

**5a — La matrice de confusion**

> C'est le cœur de l'outil. Les lignes, c'est ce que l'humain a choisi. Les colonnes, c'est ce que l'IA a prédit. La diagonale verte, ce sont les articles où l'IA est d'accord avec l'humain. Les cellules rouges, ce sont les désaccords.

- Pointer la diagonale verte (concordances)
- Pointer une cellule rouge notable (confusion fréquente)
- **Cliquer sur une cellule** pour filtrer les articles correspondants dans le tableau

> Si je clique ici, je vois les articles où l'humain a dit "EXPLAIN ME" mais l'IA a prédit "GIVE ME PERSPECTIVE". Ce sont les zones grises les plus intéressantes — elles nous disent où les frontières entre User Needs sont floues.

**5b — Le tableau de résultats**

- Montrer un article concordant (vert)
- Montrer un article reclassifié (rouge)
- **Cliquer sur "Justification"** pour montrer comment l'IA argumente son choix

> L'IA ne fait pas que prédire — elle justifie. Ça permet de comprendre sa logique et d'affiner le prompt quand elle se trompe.

**5c — Les statistiques**

- Montrer le taux de concordance global
- Montrer le top 5 des reclassifications (les confusions les plus fréquentes)

---

#### Séquence 6 — Le classement des tests (1.5 min)

**Action :** Ouvrir le panneau Tests → onglet Classement.

> C'est une vue qu'on a ajoutée récemment. Chaque point représente un test — une combinaison modèle + prompt. L'axe horizontal, c'est la concordance avec l'humain. L'axe vertical, c'est le F1 macro — une métrique qui combine précision et rappel. Les meilleurs tests sont en haut à droite.

- Montrer les **couleurs** (un par fournisseur)
- Montrer le **nombre d'articles** dans chaque point
- Montrer le **meilleur test** (bordure dorée, trophée)
- Utiliser les **filtres par modèle** pour isoler un fournisseur

> Ce graphique permet de répondre à la question : quel combo modèle + prompt donne les meilleurs résultats ? En un coup d'œil.

- Montrer le **tableau de classement** en dessous (trié par F1 décroissant)

---

#### Séquence 7 — La comparaison et l'adaptation du prompt (1.5 min)

**Action :** Dans l'onglet Historique, montrer le groupement par prompt et les badges colorés.

> Les tests sont groupés par prompt. On voit d'un coup d'œil quels modèles ont été testés avec quel prompt. Les badges de couleur identifient le fournisseur.

**Action :** Sélectionner 2 Test Runs et lancer la comparaison.

- Montrer le tableau Précision / Rappel par User Need (vert = meilleur, rouge = moins bon)
- Montrer l'analyse IA rédigée en bas (Claude Sonnet commente les résultats)

> L'IA compare les deux tests et rédige une analyse : quel test est meilleur, sur quels User Needs, et pourquoi.

**Action :** Montrer le bouton "Adapter le prompt".

> Et c'est là que ça devient intéressant : à partir des erreurs observées, l'IA peut proposer des améliorations au prompt. Elle analyse la matrice de confusion, identifie les 6 confusions les plus fréquentes, et génère des propositions ciblées. On peut appliquer les modifications en un clic — elles sont intégrées automatiquement dans le prompt. On sauvegarde, on relance un test, et on mesure si ça s'améliore.

*(Si le temps le permet, ouvrir la modale d'adaptation pour montrer les deux colonnes : prompt original à gauche, propositions à droite.)*

---

### PARTIE 4 — LA SUITE (3 min)

**Ce que tu dis :**

> Le POC a prouvé que ça marche. La question maintenant : jusqu'où on va ?

> On a une feuille de route en 3 phases. Chacune s'appuie sur la précédente.

**Phase 1 — Surveillance continue** (T2-T3 2026)
> L'IA est fiable aujourd'hui. Mais les modèles évoluent sans prévenir — mises à jour, changements de comportement. La Phase 1 met en place des "Golden Datasets" — des jeux d'articles de référence figés — et des tests de régression automatiques. Si la qualité se dégrade, on reçoit une alerte. On ne découvre pas le problème 3 mois plus tard.

**Phase 2 — Intégration au CMS PIC** (T3-T4 2026)
> Aujourd'hui, la classification reste dans notre outil. La Phase 2 la pousse dans le CMS de la rédaction. À la publication d'un article, l'IA le classifie automatiquement. Le journaliste voit la suggestion, il peut la valider ou la corriger. On crée une boucle de feedback humain-IA.

**Phase 3 — Dashboard Chartbeat** (T4 2026 - T1 2027)
> La Phase 3 répond à LA question : est-ce que le User Need a un impact sur l'engagement des lecteurs ? On croise nos User Needs avec les métriques Chartbeat — temps d'engagement, taux de lecture, recirculation. On veut prouver par les données que piloter l'offre éditoriale par User Need améliore les performances.

**Objectifs chiffrés à énoncer :**

| Métrique | Aujourd'hui | Objectif à 6 mois |
|----------|-------------|-------------------|
| Temps d'engagement moyen | 0:35 | 0:42 (+20%) |
| Quality Views (lectures ≥15s) | 53% | 60% (+7 pts) |
| Recirculation | 9% | 12% (+3 pts) |

**La phrase de transition :**

> Chaque phase débloque la suivante. On ne peut pas intégrer au CMS sans avoir prouvé la fiabilité. On ne peut pas mesurer l'impact sans que le User Need soit dans le CMS. C'est un escalier logique.

---

### PARTIE 5 — CE DONT ON A BESOIN (1 min)

**Ce que tu dis :**

> Pour réaliser cette feuille de route, on a besoin de 4 choses :

1. **Un développeur** — profil Python/React, 12 mois — pour industrialiser le POC, intégrer au CMS, construire le dashboard
2. **Accès à l'API du CMS PIC** — c'est le prérequis bloquant de la Phase 2. Il faut la documentation de l'API, un accès staging, et la possibilité d'ajouter un champ "User Need" dans la fiche article
3. **Accès au SSO France Télévisions** — pour passer du mono-utilisateur anonyme à une vraie gestion d'identités
4. **Accès à l'API Chartbeat** — pour la Phase 3, croiser les User Needs avec les métriques d'engagement

---

### CONCLUSION (30 sec)

> On a un POC qui fonctionne, des résultats mesurables, 20 modèles testés, un système qui s'auto-améliore via l'adaptation des prompts, et une feuille de route en 3 phases qui mène du "est-ce que ça marche ?" au "quel est l'impact sur l'audience ?".

> La question n'est plus "est-ce que l'IA peut classifier nos articles" — la réponse est oui. La question c'est : "est-ce qu'on veut aller au bout et mesurer l'impact éditorial ?"

---

## Plan B : si quelque chose ne marche pas pendant la démo

| Problème | Solution |
|----------|----------|
| Serveur inaccessible | Basculer sur l'instance Render (ou vice versa) |
| Clé API expirée / 401 | Avoir une clé de backup dans les notes, la saisir dans le panneau LLM |
| Analyse trop lente (modèle surchargé) | Passer directement au Test Run pré-calculé en disant "je vais vous montrer un test complet que j'ai préparé" |
| Supabase down | Très rare, mais si ça arrive : décrire l'interface à l'oral, montrer la doc technique sur l'écran |
| Scatter plot vide (pas assez de tests) | Préparer au moins 5-6 Test Runs variés avant le jour J |

---

## Timing détaillé

| Bloc | Durée | Cumul |
|------|-------|-------|
| Le problème | 2 min | 2 min |
| Ce qu'on a construit | 2 min | 4 min |
| Démo : Articles + distribution | 2 min | 6 min |
| Démo : LLM | 1 min | 7 min |
| Démo : Prompts | 1 min | 8 min |
| Démo : Lancer une analyse | 2 min | 10 min |
| Démo : Résultats (matrice, stats) | 3 min | 13 min |
| Démo : Classement scatter plot | 1.5 min | 14.5 min |
| Démo : Comparaison + adaptation prompt | 1.5 min | 16 min |
| La suite (3 phases) | 3 min | 19 min |
| Ce dont on a besoin + conclusion | 1 min | 20 min |

---

## Préparation du corpus de démo (à faire avant le 31 mars)

1. **Classifier 80-100 articles** couvrant les 8 User Needs de manière équilibrée (10-15 par UN)
2. **Lancer 5-6 Test Runs** avec des modèles différents (au moins : Claude 3.5 Haiku, GPT-4o Mini, Mistral Small 3.1) pour avoir un scatter plot riche
3. **Lancer 2 Test Runs avec des prompts différents** sur le même modèle (pour montrer l'impact du prompt)
4. **Préparer une adaptation de prompt** : lancer un test, cliquer sur "Adapter le prompt", sauvegarder le résultat, relancer un test avec le prompt adapté. Avoir cette séquence complète prête à montrer.
5. **Vérifier** que le graphique de distribution du corpus montre un équilibre correct (badge vert ou au moins orange)

---

*Document de préparation — usage interne, non destiné à être projeté.*
