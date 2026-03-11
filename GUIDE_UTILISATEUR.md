# Guide utilisateur — Application "Analyse IA des Userneeds Franceinfo"

**Mise à jour :** 11 mars 2026

---

## À quoi sert cette application ?

Cette application permet de **tester si une intelligence artificielle est capable de classer des articles Franceinfo** selon les 8 "User Needs" — c'est-à-dire le besoin auquel répond un article pour le lecteur.

Vous classifiez vous-même des articles, puis vous lancez une analyse IA et comparez vos résultats avec ceux de l'IA. L'application enregistre chaque session d'analyse pour vous permettre de comparer différents modèles et différentes formulations d'instructions.

---

## Les 8 User Needs

| User Need | Ce que ça signifie |
|---|---|
| **UPDATE ME** | L'article tient informé sur une actu en cours |
| **EXPLAIN ME** | L'article explique un sujet ou un contexte |
| **GIVE ME PERSPECTIVE** | L'article offre une analyse ou une mise en recul |
| **GIVE ME A BREAK** | L'article est léger ou divertissant |
| **GIVE ME CONCERNING NEWS** | L'article alerte sur quelque chose de préoccupant |
| **INSPIRE ME** | L'article raconte une histoire positive |
| **MAKE ME FEEL THE NEWS** | L'article est émotionnel, immersif, un témoignage |
| **REVEAL NEWS** | L'article révèle une enquête ou une info exclusive |

---

## Comment utiliser l'application

L'application se déroule en 5 étapes.

---

### Étape 1 — Classifier des articles

La liste des articles Franceinfo s'affiche directement sur la page d'accueil, filtrée par défaut sur les **articles non classifiés**. Les articles sont importés automatiquement toutes les 30 minutes depuis les flux RSS de Franceinfo.

**Pour classifier un article :**

1. Lisez le titre et le chapô
2. Choisissez le User Need qui correspond le mieux dans le menu déroulant
3. La classification est enregistrée immédiatement — répétez pour autant d'articles que souhaité

**Filtres disponibles :**

- **Statut** — Tous / Classifiés / Non classifiés (actif par défaut)
- **Recherche par titre** — Saisissez un mot-clé pour filtrer les articles par leur titre

> **Astuce :** Cliquez sur le titre d'un article pour l'ouvrir dans un nouvel onglet et lire son contenu complet avant de le classifier.

> **Astuce :** Pour déclassifier un article, cliquez sur le bouton **✕** à droite de sa classification — l'article repassera en statut "non classifié". Vous pouvez aussi modifier une classification en changeant le menu déroulant.

> **Astuce :** Le bouton **↻ Actualiser** recharge les derniers articles importés sans rafraîchir la page.

#### 📊 Répartition du corpus

Dans la page Articles, le bouton **"📊 Répartition"** affiche un graphique de la distribution des articles classifiés par User Need. L'objectif est de constituer un corpus **équilibré** : idéalement entre 10 et 20 articles par User Need pour garantir des résultats représentatifs.

Un indicateur de couleur (vert / orange / rouge) résume l'équilibre global du corpus en un coup d'œil.

---

### Étape 2 — Choisir un modèle IA

Cliquez sur le bouton **"🤖 LLM"** dans le menu. Un tableau comparatif s'affiche avec les 14 principaux modèles du marché, classés du meilleur au moins bon pour cette application.

Pour chaque modèle, vous voyez :

| Information | Description |
|-------------|-------------|
| Vitesse | Très rapide / Rapide / Modéré / Lent |
| Prix d'entrée | Coût par million de tokens en entrée |
| Prix de sortie | Coût par million de tokens en sortie |
| Coût estimé / 50 articles | Estimation concrète du coût d'une analyse |
| Qualité | Note de 1 à 5 étoiles |
| Support français | Niveau de maîtrise du français (1 à 3) |

Cliquez sur une ligne pour sélectionner le modèle.

> **Recommandation :** Pour un bon équilibre vitesse / qualité / coût, privilégiez **Claude 3.5 Haiku**, **GPT-4o Mini** ou **Mistral Small 3.1**.

**Configuration de la clé API :**
Saisissez votre clé OpenRouter dans le champ prévu (`sk-or-...`). Une seule clé suffit pour tous les modèles. Obtenez la vôtre sur [openrouter.ai](https://openrouter.ai/keys).

---

### Étape 3 — Choisir ou créer un prompt

Cliquez sur le bouton **"📝 Prompts"**. Un prompt est l'instruction envoyée à l'IA pour lui expliquer comment analyser les articles.

**Actions disponibles :**

- **Activer** un prompt existant (un seul prompt est actif à la fois)
- **Créer** un nouveau prompt personnalisé
- **Dupliquer** un prompt pour l'adapter
- **Modifier** ou **supprimer** vos prompts personnalisés
- **Exporter / Importer** des prompts au format JSON

Un prompt par défaut est fourni et ne peut pas être supprimé. La section contenant l'article analysé est automatiquement ajoutée par le système — vous n'avez pas à l'inclure.

#### ✏️ Adapter le prompt avec l'IA

Après une analyse, le bouton **"💡 Adapter le prompt"** soumet votre prompt actuel à l'IA en lui demandant de proposer des améliorations basées sur les résultats obtenus. L'IA retourne uniquement les **sections modifiées** (pas le prompt entier), qui sont automatiquement appliquées sur votre prompt d'origine.

> **Astuce :** Cette fonctionnalité est idéale pour itérer rapidement : affinez le prompt en quelques clics, relancez une analyse et comparez les résultats.

---

### Étape 4 — Lancer une analyse IA

Cliquez sur **"Analyse IA"** pour démarrer. L'IA analyse chaque article que vous avez classifié et prédit son User Need. Les résultats s'affichent au fur et à mesure.

**Pendant l'analyse :**
- Une barre de progression indique l'avancement
- La matrice de confusion et les statistiques se construisent en temps réel
- Le bouton **"⏹ Stop"** permet d'interrompre l'analyse à tout moment — les résultats déjà obtenus sont conservés

**À la fin de l'analyse, vous obtenez :**

- **Le taux de concordance global** : % d'articles où l'IA a prédit le même User Need que vous
- **La matrice de confusion** : tableau 8×8 montrant les accords (diagonale verte) et désaccords (rouge)
- **Les statistiques de confiance** : niveau de certitude de l'IA pour chaque article (Haute / Moyenne / Basse)
- **Le top 5 des reclassifications** : les désaccords les plus fréquents entre vous et l'IA

**Interactions avec les résultats :**
- Filtrez par niveau de confiance via les boutons au-dessus de la matrice
- Cliquez sur une cellule de la matrice pour isoler les articles correspondant à cette combinaison
- Cliquez sur l'icône de justification d'un article pour lire l'explication détaillée de l'IA
- Cliquez sur **"📊 Exporter"** pour télécharger un fichier Excel complet (5 feuilles)

> **Note :** Chaque analyse est enregistrée comme un "Test Run". Vous pouvez retrouver et comparer toutes vos analyses via le bouton **"📋 Tests"**.

---

### Étape 5 — Comparer et classer les analyses

Via le bouton **"📋 Tests"**, deux sous-pages sont disponibles :

#### 📋 Historique

- Liste de tous vos Test Runs, groupés par prompt. Chaque run affiche le modèle utilisé (pastille colorée), la date et le statut.
- Cochez 2 runs puis cliquez sur **"⚖️ Comparer"** pour les comparer côte à côte.
- Le tableau de comparaison affiche pour chaque User Need la précision et le rappel. La valeur la plus haute apparaît en **vert**, la plus basse en **rouge**.
- Une **analyse rédigée par l'IA** conclut la comparaison avec une recommandation sur le meilleur combo modèle/prompt.

#### 🏆 Classement

- Le **graphique de dispersion** positionne chaque run sur deux axes : *Concordance* (horizontal) et *F1 macro* (vertical). Les runs les plus performants apparaissent en haut à droite (zone verte). Le meilleur run est marqué 🏆.
- Le **tableau de classement** trie les runs du meilleur au moins bon (F1 macro décroissant) et affiche : modèle, prompt, concordance, précision, rappel et F1 macro. Cliquez sur un en-tête de colonne pour retrier.

---

## Questions fréquentes

**Combien d'articles dois-je classifier pour avoir des résultats fiables ?**
Une cinquantaine d'articles est un bon point de départ. L'idéal est d'avoir au moins 5 à 10 exemples par User Need.

**Puis-je modifier une classification que j'ai déjà faite ?**
Oui, retrouvez l'article dans la liste (filtre "Classifiés") et modifiez le menu déroulant. La mise à jour est immédiate.

**Que signifie le score de confiance ?**
L'IA donne trois prédictions par ordre de certitude (principale, secondaire, tertiaire) avec un score dont la somme fait 100. Un score élevé sur la prédiction principale et un grand écart avec la secondaire indiquent que l'IA est confiante dans son choix.

**Les articles se mettent-ils à jour automatiquement ?**
Oui, de nouveaux articles Franceinfo sont importés toutes les 30 minutes depuis les flux RSS (Titres, Politique, Monde, Société, Économie, Culture).

**Combien coûte une analyse ?**
Avec les modèles recommandés, une analyse de 50 articles coûte entre $0,003 et $0,04 — soit moins d'un centime d'euro par article. Le tableau LLM affiche une estimation précise pour chaque modèle.

**Quelle est la différence entre Précision et Rappel ?**
La **précision** mesure la fiabilité des prédictions de l'IA : quand elle dit "UPDATE ME", est-ce vraiment un article UPDATE ME ? Le **rappel** mesure l'exhaustivité : parmi tous les articles UPDATE ME du jeu de données, combien l'IA en a-t-elle correctement identifiés ? Un bon modèle maximise les deux.

**Que signifie le F1 macro dans le classement ?**
Le F1 macro est la moyenne harmonique de la précision et du rappel, calculée indépendamment pour chaque User Need puis moyennée. C'est la métrique de référence pour évaluer globalement un modèle sur des classes déséquilibrées.
